import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword, syncSupabaseAuthUser } from '@/lib/auth';
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

    // Insert or update member in database
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

    // Synchronize with Supabase GoTrue Auth (auth.users)
    await syncSupabaseAuthUser(email, tempPassword);

    // Dispatch SMTP Credentials Email
    const adminLoginUrl = process.env.ADMIN_CONSOLE_URL ? `${process.env.ADMIN_CONSOLE_URL}/login` : 'http://localhost:3001/login';
    const recruiterAppUrl = process.env.RECRUITER_APP_URL ? `${process.env.RECRUITER_APP_URL}/auth/login` : 'http://localhost:3000/auth/login';
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
        from: `"Kozker AI Admin" <${process.env.SMTP_FROM || 'kozklawtailscale@gmail.com'}>`,
        to: email,
        subject: `Welcome to ${org?.name || 'Kozker Platform'} - Admin Console Credentials`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #ff6e30; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px;">Organization Portal Invitation</h1>
            </div>
            
            <div style="padding: 24px; background-color: #fafaf9; color: #292524;">
              <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
              <p>You have been provisioned as a member of <strong>${org?.name || 'Kozker Platform'}</strong>.</p>
              
              <div style="background-color: white; border: 1px solid #e7e5e4; padding: 18px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #ff6e30;">🔐 Your Unified Access Credentials:</p>
                <p style="margin: 4px 0; font-family: monospace; font-size: 14px;"><strong>Work Email:</strong> ${email}</p>
                <p style="margin: 4px 0; font-family: monospace; font-size: 14px;"><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>

              <div style="background-color: #fff7ed; border-left: 4px solid #ff6e30; padding: 12px; font-size: 12px; color: #9a3412; margin-bottom: 20px;">
                💡 <strong>Unified Credentials Notice:</strong> These exact credentials grant access to both the Admin Console and assigned applications (including the Recruitment Panel).
              </div>

              <p style="font-size: 13px; color: #78716c;">Upon your first login, you will be prompted to set your personal password and accept the platform Terms and Conditions.</p>

              <div style="text-align: center; margin: 28px 0; display: flex; gap: 12px; justify-content: center;">
                <a href="${adminLoginUrl}" style="background-color: #1c1917; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
                  🔑 Log In to Admin Console
                </a>
                <a href="${recruiterAppUrl}" style="background-color: #ff6e30; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
                  🚀 Log In to Recruitment Panel
                </a>
              </div>
            </div>

            <div style="background-color: #f5f5f4; padding: 14px; text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
              Kozker Recruiter AI Platform • Unified Governance Gateway
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
      action_description: `Provisioned organization member '${name}' (${email}) and dispatched authentication email`,
      target_name: name,
      action_type: 'invite'
    });

    return NextResponse.json({
      success: true,
      message: `Member addition initiated. Authentication setup will take about a minute. Once completed, a confirmation email with credentials to access the Admin Console will be sent to the user.`,
      email_sent: emailSent,
      temp_password: tempPassword,
      member
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send member invitation' }, { status: 500 });
  }
}
