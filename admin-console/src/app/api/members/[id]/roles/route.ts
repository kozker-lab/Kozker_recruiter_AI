import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.is_primary_admin === true || user.permissions?.administrator === true;
    if (!isAdmin && user.has_assigned_roles === false) {
      return NextResponse.json({
        error: 'Forbidden: Default unassigned members have view-only access and cannot assign roles.'
      }, { status: 403 });
    }

    const memberId = params.id;
    const { role_ids, manager_assignments } = await request.json();

    const roleIdsList: string[] = Array.isArray(role_ids) ? role_ids.filter(Boolean) : (role_ids ? [role_ids] : []);

    // 1. Fetch Target Member Details
    const { data: targetMember, error: memErr } = await supabase
      .from('members')
      .select('*, organizations(*)')
      .eq('id', memberId)
      .single();

    if (memErr || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // 2. Remove existing role assignments for this member
    await supabase.from('member_roles').delete().eq('member_id', memberId);

    // 3. Insert new role assignments
    if (roleIdsList.length > 0) {
      const inserts = roleIdsList.map(rid => ({
        member_id: memberId,
        role_id: rid
      }));
      await supabase.from('member_roles').insert(inserts);
    }

    // 3b. Sync member_manager_assignments table
    await supabase.from('member_manager_assignments').delete().eq('member_id', memberId);

    let primaryManagerId: string | null = null;
    if (Array.isArray(manager_assignments) && manager_assignments.length > 0) {
      const mmaInserts = manager_assignments
        .filter((ma: any) => ma.role_id && roleIdsList.includes(ma.role_id))
        .map((ma: any) => {
          if (!primaryManagerId && ma.manager_member_id) {
            primaryManagerId = ma.manager_member_id;
          }
          return {
            member_id: memberId,
            role_id: ma.role_id,
            manager_member_id: ma.manager_member_id || null
          };
        });

      if (mmaInserts.length > 0) {
        await supabase.from('member_manager_assignments').insert(mmaInserts);
      }
    }

    // Update target member's manager_member_id column for direct fallback
    await supabase
      .from('members')
      .update({ manager_member_id: primaryManagerId })
      .eq('id', memberId);

    // 4. Fetch details of assigned roles for email notification
    let assignedRoles: any[] = [];
    if (roleIdsList.length > 0) {
      const { data: rData } = await supabase
        .from('roles')
        .select('*')
        .in('id', roleIdsList);
      assignedRoles = rData || [];
    }

    const orgName = targetMember.organizations?.name || user.organization_name || 'Kozker Platform';

    // 5. Build Executive HTML Email Notification
    let emailSent = false;
    if (assignedRoles.length > 0) {
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

        const rolesHtmlList = assignedRoles.map(r => {
          const scopeLabel = (r.scope_type || 'organization').toUpperCase();
          const branchLabel = r.branch_name || 'Main Branch';
          const badgeColor = r.scope_type === 'branch' ? '#3b82f6' : (r.scope_type === 'multi_branch' ? '#8b5cf6' : '#ff6e30');

          return `
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 6px; padding: 14px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <strong style="font-size: 15px; color: #1c1917;">${r.name}</strong>
                <div style="font-size: 12px; color: #78716c; margin-top: 2px;">
                  Branch Context: <strong>${branchLabel}</strong>
                </div>
              </div>
              <span style="background-color: ${badgeColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                ${scopeLabel}: ${branchLabel}
              </span>
            </div>
          `;
        }).join('');

        const loginUrl = process.env.RECRUITER_APP_URL || 'http://localhost:3000/auth/login';

        const mailOptions = {
          from: `"Kozker Executive Gateway" <${process.env.SMTP_FROM || 'kozklawtailscale@gmail.com'}>`,
          to: targetMember.email,
          subject: `Official Role & Authorization Assignment - ${orgName}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              
              <!-- Executive Header -->
              <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%); padding: 30px 24px; text-align: center; color: white;">
                <div style="font-size: 11px; font-weight: 700; tracking: 2px; text-transform: uppercase; color: #ff6e30; margin-bottom: 6px;">
                  KOZKER ENTERPRISE ACCESS MANAGEMENT
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Role & Scope Assignment Notice</h1>
              </div>

              <!-- Main Body -->
              <div style="padding: 30px; background-color: #fafaf9; color: #292524;">
                <p style="font-size: 16px; margin-top: 0;">Dear <strong>${targetMember.name}</strong>,</p>

                <p style="font-size: 14px; color: #44403c; line-height: 1.6;">
                  We are pleased to inform you that your profile has been officially assigned updated functional roles and branch scope authorizations within <strong>${orgName}</strong>.
                </p>

                <!-- Assigned Roles Summary Card -->
                <div style="background-color: #fff7ed; border-left: 4px solid #ff6e30; padding: 18px; border-radius: 6px; margin: 22px 0;">
                  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9a3412; margin-bottom: 10px; letter-spacing: 0.5px;">
                    📋 Your Newly Assigned Role Configuration & Tags
                  </div>
                  ${rolesHtmlList}
                </div>

                <p style="font-size: 13px; color: #57534e; line-height: 1.5;">
                  These assigned roles grant you active permissions across your designated Organization and Branch workflows, including Pipeline Execution, Candidate Sourcing, and System Reports.
                </p>

                <!-- Direct Gateway Access Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${loginUrl}" style="background-color: #ff6e30; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(255, 110, 48, 0.3);">
                    🚀 Launch Recruitment & Governance Portal
                  </a>
                </div>

                <div style="background-color: #ffffff; border: 1px solid #e7e5e4; padding: 14px; border-radius: 6px; font-size: 12px; color: #78716c; line-height: 1.5;">
                  🔒 <strong>Single Sign-On Security Notice:</strong> The credentials associated with <code>${targetMember.email}</code> provide unified authorization across both the Admin Console and Recruitment Applications.
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f5f5f4; padding: 16px; text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
                ${orgName} • Kozker Recruiter AI Governance System
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (mailErr) {
        console.error('Role assignment email dispatch notice:', mailErr);
      }
    }

    // 6. Audit Log
    const roleNamesString = assignedRoles.map(r => `${r.name} [${(r.scope_type || 'org').toUpperCase()}: ${r.branch_name || 'Main Branch'}]`).join(', ') || 'Default Member Role';
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Assigned role configuration '${roleNamesString}' to member '${targetMember.name}' (${targetMember.email})`,
      target_name: targetMember.name,
      action_type: 'update'
    });

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      assigned_roles: assignedRoles,
      message: `Roles updated successfully for ${targetMember.name}. Executive notification email sent.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update member roles' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.permissions?.administrator !== true && user.is_primary_admin !== true) {
      return NextResponse.json({ error: 'Forbidden: Only Organization Administrators can delete assigned roles.' }, { status: 403 });
    }

    const memberId = params.id;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('role_id');

    if (roleId) {
      // 1. Delete specific assigned role for this member
      await supabase
        .from('member_roles')
        .delete()
        .eq('member_id', memberId)
        .eq('role_id', roleId);

      // 2. Delete corresponding manager assignment for this role
      await supabase
        .from('member_manager_assignments')
        .delete()
        .eq('member_id', memberId)
        .eq('role_id', roleId);
    } else {
      // Delete all assigned roles & manager assignments for this member
      await supabase
        .from('member_roles')
        .delete()
        .eq('member_id', memberId);

      await supabase
        .from('member_manager_assignments')
        .delete()
        .eq('member_id', memberId);
    }

    // 3. Sync member's direct manager_member_id column if no manager assignments remain
    const { data: remainingAssignments } = await supabase
      .from('member_manager_assignments')
      .select('manager_member_id')
      .eq('member_id', memberId);

    const nextManagerId = (remainingAssignments && remainingAssignments.length > 0)
      ? remainingAssignments[0].manager_member_id
      : null;

    await supabase
      .from('members')
      .update({ manager_member_id: nextManagerId })
      .eq('id', memberId);

    // Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Deleted assigned role assignment ${roleId ? `(Role ID: ${roleId})` : '(All Roles)'} for member ID '${memberId}'`,
      target_name: `Member ID: ${memberId}`,
      action_type: 'danger'
    });

    return NextResponse.json({ success: true, message: 'Assigned role deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete assigned role' }, { status: 500 });
  }
}
