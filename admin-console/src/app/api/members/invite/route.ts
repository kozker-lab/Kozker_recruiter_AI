import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword } from '@/lib/auth';
import nodemailer from 'nodemailer';

function getUserFromReq(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';
  let token = authHeader.replace('Bearer ', '');
  if (!token && cookieHeader) {
    const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
    if (match) token = match[1];
  }
  return verifyJwtToken(token);
}

export async function POST(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name, role_id } = await request.json();
    if (!email || !name) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check organization member quota
    const { data: org } = await supabase.from('organizations').select('name, max_members_limit').eq('id', user.organization_id).single();
    if (org && org.max_members_limit !== null && org.max_members_limit !== undefined) {
      const { count } = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id);
      if (count !== null && count >= org.max_members_limit) {
        return NextResponse.json({
          error: `Organization member quota reached (Limit: ${org.max_members_limit}). Contact system developer to expand quota.`
        }, { status: 403 });
      }
    }

    // 1. Pre-existing Email Check & Cleanup (Delete pre-existing account after notifying)
    let wasPreExistingReplaced = false;

    // A. Check & delete from public.members if exists
    const { data: existingMember } = await supabase.from('members').select('id').eq('email', cleanEmail).single();
    if (existingMember) {
      await supabase.from('member_roles').delete().eq('member_id', existingMember.id);
      await supabase.from('members').delete().eq('id', existingMember.id);
      wasPreExistingReplaced = true;
    }

    // B. Check & delete from Supabase GoTrue Auth (auth.users) if exists
    try {
      if (supabase.auth?.admin) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === cleanEmail);
        if (existingAuthUser) {
          await supabase.auth.admin.deleteUser(existingAuthUser.id);
          wasPreExistingReplaced = true;
        }
      }
    } catch (authCleanupErr) {
      console.error('Pre-existing Supabase Auth cleanup notice:', authCleanupErr);
    }

    const nameParts = name.trim().split(' ');
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    const initialPlaceholderHash = await hashPassword('PendingPasswordSetup#' + Math.random().toString(36).slice(-8));

    // 2. Insert new clean member in database
    const { data: member, error: memErr } = await supabase
      .from('members')
      .insert({
        organization_id: user.organization_id,
        name,
        email: cleanEmail,
        password_hash: initialPlaceholderHash,
        avatar_initials: initials,
        must_change_password: true,
        terms_accepted: false,
        invitation_sent_at: new Date().toISOString(),
        status: 'active'
      })
      .select('*')
      .single();

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // Attach role if provided
    if (role_id) {
      await supabase.from('member_roles').insert({
        member_id: member.id,
        role_id
      });
    }

    // 3. Generate Password Setup Page URL (Pointing to /auth/set-password)
    const setPasswordBaseUrl = process.env.ADMIN_CONSOLE_URL ? `${process.env.ADMIN_CONSOLE_URL}/auth/set-password` : 'http://localhost:3001/auth/set-password';
    let authActionLink = `${setPasswordBaseUrl}?email=${encodeURIComponent(cleanEmail)}`;

    try {
      if (supabase.auth.admin) {
        // Trigger native Supabase invite redirecting to /auth/set-password
        await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo: setPasswordBaseUrl,
          data: { name, organization_id: user.organization_id }
        }).catch(err => console.log('Supabase native invite notice:', err?.message));

        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'invite',
          email: cleanEmail,
          options: {
            redirectTo: setPasswordBaseUrl
          }
        });

        if (!linkErr && linkData?.properties?.action_link) {
          authActionLink = linkData.properties.action_link;
        }
      }
    } catch (authLinkErr) {
      console.error('Supabase Auth link generation error:', authLinkErr);
    }

    // 4. Dispatch Email with Password Setup Link & Replacement Notice
    let emailSent = false;
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'kozklawtailscale@gmail.com',
          pass: process.env.SMTP_PASSWORD || 'hzntrccgfvfbfpbu'
        }
      });

      const replacementBannerHtml = wasPreExistingReplaced ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 12px; color: #991b1b;">
          ⚠️ <strong>Notice:</strong> A pre-existing account associated with <code>${cleanEmail}</code> was replaced and re-provisioned for your new organization membership.
        </div>
      ` : '';

      const mailOptions = {
        from: `"Kozker Platform Auth" <${process.env.SMTP_FROM || 'kozklawtailscale@gmail.com'}>`,
        to: cleanEmail,
        subject: `Complete Account Password Setup - ${org?.name || 'Kozker Platform'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #ff6e30; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px;">Set Up Your Portal Password</h1>
            </div>
            
            <div style="padding: 24px; background-color: #fafaf9; color: #292524;">
              <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>

              ${replacementBannerHtml}
              
              <div style="background-color: #fff7ed; border-left: 4px solid #ff6e30; padding: 14px; border-radius: 4px; margin: 18px 0; font-size: 13px; color: #9a3412; leading-relaxed;">
                <strong>⏳ Authentication Setup Process:</strong><br />
                Member addition initiated. Please click below to set up your password. Once set, your credentials to access the Admin Console will be confirmed. The exact same email and password will be used to log in to the recruitment panel.
              </div>

              <p style="font-size: 14px; color: #44403c;">
                You have been invited to join <strong>${org?.name || 'Kozker Platform'}</strong>. Please click the button below to set up your account password and complete Supabase authentication.
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${authActionLink}" style="background-color: #1c1917; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  🔐 Set Password & Complete Authentication
                </a>
              </div>

              <div style="background-color: white; border: 1px solid #e7e5e4; padding: 12px; border-radius: 6px; font-size: 12px; color: #78716c;">
                💡 <strong>Unified Access Policy:</strong> The email (<code>${cleanEmail}</code>) and password you set on this page will grant access to both the Admin Console and the Recruitment Panel.
              </div>
            </div>

            <div style="background-color: #f5f5f4; padding: 14px; text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
              Kozker Recruiter AI Platform • Supabase Authentication Gateway
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
    } catch (mailErr) {
      console.error('SMTP Mail error:', mailErr);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: wasPreExistingReplaced
        ? `Re-provisioned member '${name}' (${cleanEmail}), deleted pre-existing account, and sent password setup email`
        : `Sent password setup and Supabase authentication email to added member '${name}' (${cleanEmail})`,
      target_name: name,
      action_type: 'invite'
    });

    return NextResponse.json({
      success: true,
      was_pre_existing_replaced: wasPreExistingReplaced,
      message: wasPreExistingReplaced
        ? `Pre-existing account deleted and re-provisioned. Password setup email sent to ${cleanEmail}.`
        : `Password setup email sent to ${cleanEmail}. The member will set their password via the link.`,
      email_sent: emailSent,
      member
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send member invitation' }, { status: 500 });
  }
}
