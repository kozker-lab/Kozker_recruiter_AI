import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const { organization_id, name, email, password, role_ids } = await request.json();

    if (!organization_id || !name || !email) {
      return NextResponse.json({ error: 'Missing required member fields (organization_id, name, email)' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Fetch Organization Details
    const { data: org } = await supabase.from('organizations').select('name').eq('id', organization_id).single();
    const orgName = org?.name || 'Organization Workspace';

    // Hash initial password or fallback
    const rawPassword = password || ('AdminPassword#' + Math.random().toString(36).slice(-8));
    const password_hash = await hashPassword(rawPassword);

    // Compute avatar initials
    const nameParts = name.trim().split(' ');
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    // Check if member with this email already exists in Supabase
    const { data: existingMember } = await supabase
      .from('members')
      .select('id, organization_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    // Enforce single primary admin rule per organization
    await supabase
      .from('members')
      .update({ is_primary_admin: false })
      .eq('organization_id', organization_id);

    let member: any = existingMember;

    if (existingMember) {
      // Upsert existing member record to update name, password, organization_id, and primary admin status
      const { data: updated, error: updateErr } = await supabase
        .from('members')
        .update({
          organization_id,
          name,
          password_hash,
          avatar_initials: initials,
          is_primary_admin: true,
          status: 'active'
        })
        .eq('id', existingMember.id)
        .select('*')
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      member = updated || existingMember;
    } else {
      // Insert new primary admin member record
      const { data: newMem, error: insertErr } = await supabase
        .from('members')
        .insert({
          organization_id,
          name,
          email: cleanEmail,
          password_hash,
          avatar_initials: initials,
          must_change_password: true,
          is_primary_admin: true,
          status: 'active'
        })
        .select('*')
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      member = newMem;
    }

    // Determine roles to assign: if provided, use role_ids; otherwise find/assign default org role
    let assignedRoleIds: string[] = Array.isArray(role_ids) && role_ids.length > 0 ? role_ids : [];

    if (assignedRoleIds.length === 0) {
      // Find default org role or create 'Organization Director'
      const { data: existingRoles } = await supabase
        .from('roles')
        .select('id')
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true });

      if (existingRoles && existingRoles.length > 0) {
        assignedRoleIds = [existingRoles[0].id];
      } else {
        const { data: newRole } = await supabase
          .from('roles')
          .insert({
            organization_id,
            name: 'Organization Director',
            level: 'org',
            color_hex: '#ff6e30'
          })
          .select('id')
          .single();

        if (newRole) {
          assignedRoleIds = [newRole.id];
          await supabase.from('role_permissions').insert({
            role_id: newRole.id,
            administrator: true,
            audit_logs: true,
            manage_server: true,
            access_recruitment: true,
            recruiter_dashboard: true,
            recruiter_mandates: true,
            recruiter_jobs: true,
            recruiter_sourcing: true,
            recruiter_reports: true,
            recruiter_qna: true,
            recruiter_resumes: true,
            recruiter_stage_move: true,
            access_client: true,
            client_contracts: true,
            client_mandates: true,
            client_shortlists: true,
            access_employee: true,
            employee_directory: true,
            employee_org_chart: true,
            manage_jobs: true,
            view_resumes: true,
            edit_status: true,
            schedule_interviews: true
          });
        }
      }
    }

    // Clear old member roles and assign new primary admin role
    if (member && assignedRoleIds.length > 0) {
      await supabase.from('member_roles').delete().eq('member_id', member.id);
      const roleInserts = assignedRoleIds.map(rid => ({
        member_id: member.id,
        role_id: rid
      }));
      await supabase.from('member_roles').insert(roleInserts);
    }

    // Dispatch Executive Credentials Email to New Admin
    const adminLoginUrl = process.env.ADMIN_CONSOLE_URL ? `${process.env.ADMIN_CONSOLE_URL}/login` : 'http://localhost:3001/login';

    let emailSent = false;
    let emailErrorMsg = '';

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
        from: `"Kozker Developer Provisioning" <${process.env.SMTP_USER || 'kozklawtailscale@gmail.com'}>`,
        to: cleanEmail,
        subject: `🔑 Executive Admin Credentials: ${orgName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <!-- Header Banner -->
            <div style="background-color: #ff6e30; padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Kozker Platform Governance</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Executive Primary Administrator Account Created</p>
            </div>

            <!-- Body Content -->
            <div style="padding: 30px; background-color: #fafaf9; color: #292524;">
              <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>

              <p style="font-size: 14px; color: #44403c; line-height: 1.6;">
                You have been officially provisioned as the <strong>Primary Administrator</strong> for <strong>${orgName}</strong> on the Kozker Governance Engine.
              </p>

              <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-left: 4px solid #ff6e30; padding: 18px; border-radius: 6px; margin: 20px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9a3412; margin-bottom: 10px;">
                  🛡️ Admin Console Account Credentials
                </div>
                <div style="font-size: 13px; color: #1c1917; line-height: 1.8;">
                  <strong>Organization Workspace:</strong> ${orgName}<br/>
                  <strong>Login Email:</strong> <code>${cleanEmail}</code><br/>
                  <strong>Account Password:</strong> <code>${rawPassword}</code><br/>
                  <strong>Access Level:</strong> Primary Administrator (Executive Scope)
                </div>
              </div>

              <p style="font-size: 14px; color: #44403c; line-height: 1.6;">
                Use the credentials above to log into the Admin Console to manage Master Roles, RBAC permissions, and invite team members.
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${adminLoginUrl}" style="background-color: #ff6e30; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(255, 110, 48, 0.3);">
                  🚀 Log In to Admin Console
                </a>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e7e5e4; padding: 12px; border-radius: 6px; font-size: 12px; color: #78716c; line-height: 1.4;">
                📌 <strong>Security Notice:</strong> Keep these credentials confidential. You can update your password at any time inside the Admin Console.
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f5f5f4; padding: 16px; text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
              ${orgName} • Kozker Governance Engine System
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
    } catch (mailErr: any) {
      emailErrorMsg = mailErr.message || 'SMTP dispatch failed';
      console.error('Admin provision email error:', mailErr);
    }

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      email_error: emailErrorMsg || undefined,
      member,
      message: `Primary admin account provisioned for ${name} (${cleanEmail}). ${emailSent ? 'Executive invitation email dispatched.' : 'Email notice: ' + emailErrorMsg}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to provision admin account' }, { status: 500 });
  }
}
