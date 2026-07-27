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

    // Generate temporary password
    const tempPassword = 'Kozker#' + Math.random().toString(36).slice(-6) + '!' + Math.floor(Math.random() * 100);
    const password_hash = await hashPassword(tempPassword);

    const nameParts = name.trim().split(' ');
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    // Insert or update member
    const { data: member, error: memErr } = await supabase
      .from('members')
      .insert({
        organization_id: user.organization_id,
        name,
        email: email.toLowerCase().trim(),
        password_hash,
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

    // Dispatch SMTP Email
    const loginUrl = process.env.ADMIN_CONSOLE_URL ? `${process.env.ADMIN_CONSOLE_URL}/login` : 'http://localhost:3001/login';
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

      const mailOptions = {
        from: `"Kozker AI Recruiter" <${process.env.SMTP_FROM || 'kozklawtailscale@gmail.com'}>`,
        to: email,
        subject: `Invitation to join ${org?.name || 'Kozker Platform'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ff6e30; padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Kozker Platform Invitation</h1>
            </div>
            <div style="padding: 24px; background-color: #fafaf9; color: #292524;">
              <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
              <p>You have been invited to join <strong>${org?.name || 'Kozker Platform'}</strong> as an organization member.</p>
              
              <div style="background-color: white; border: 1px solid #e7e5e4; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1c1917;">Your Temporary Login Credentials:</p>
                <p style="margin: 4px 0; font-family: monospace; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 4px 0; font-family: monospace; font-size: 14px;"><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>

              <p style="font-size: 13px; color: #78716c;">Upon logging in, you will be prompted to set your personal password and accept the platform Terms & Conditions.</p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginUrl}" style="background-color: #1c1917; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                  Access Kozker Gateway & Login
                </a>
              </div>
            </div>
            <div style="background-color: #f5f5f4; padding: 12px; text-align: center; font-size: 12px; color: #a8a29e;">
              Kozker Recruiter AI Platform • Enterprise Gateway
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
      action_description: `Sent invitation email to member '${name}' (${email})`,
      target_name: name,
      action_type: 'invite'
    });

    return NextResponse.json({
      success: true,
      message: emailSent ? `Invitation email sent to ${email}` : `Member provisioned (Email dispatch skipped). Temp Password: ${tempPassword}`,
      email_sent: emailSent,
      temp_password: tempPassword,
      member
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send member invitation' }, { status: 500 });
  }
}
