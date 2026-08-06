import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, createJwtToken, getCookieDomainHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const cookieHeader = request.headers.get('cookie') || '';
    let token = authHeader.replace('Bearer ', '');

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
      if (match) token = match[1];
    }

    const payload = verifyJwtToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Retrieve fresh member record from Supabase database
    const { data: member, error } = await supabase
      .from('members')
      .select('*, organizations(*)')
      .eq('id', payload.id)
      .single();

    if (error || !member) {
      // Fallback to JWT payload if DB fetch fails
      return NextResponse.json({
        authenticated: true,
        user: payload,
        urls: {
          admin_console: process.env.ADMIN_CONSOLE_URL || 'http://localhost:3001',
          recruiter_app: process.env.RECRUITER_APP_URL || 'http://localhost:3000',
          client_portal: process.env.CLIENT_PORTAL_URL || 'https://client.kozker.ai',
        }
      });
    }

    // Fetch member's current assigned roles
    const { data: memberRoles } = await supabase
      .from('member_roles')
      .select('role_id, roles(*)')
      .eq('member_id', member.id);

    const rolesList = (memberRoles || []).map((mr: any) => mr.roles).filter(Boolean);
    const roleIds = rolesList.map((r: any) => r.id);
    const hasAssignedRoles = roleIds.length > 0;

    let isPrimaryAdmin = member.is_primary_admin === true || payload.is_primary_admin === true;

    if (member.is_primary_admin !== false) {
      isPrimaryAdmin = true;
    }

    let permissions = {
      administrator: isPrimaryAdmin ? true : false,
      audit_logs: isPrimaryAdmin ? true : false,
      manage_server: false,
      access_recruitment: hasAssignedRoles || isPrimaryAdmin,
      recruiter_dashboard: hasAssignedRoles || isPrimaryAdmin,
      recruiter_mandates: hasAssignedRoles || isPrimaryAdmin,
      recruiter_jobs: hasAssignedRoles || isPrimaryAdmin,
      recruiter_sourcing: hasAssignedRoles || isPrimaryAdmin,
      recruiter_reports: hasAssignedRoles || isPrimaryAdmin,
      recruiter_qna: hasAssignedRoles || isPrimaryAdmin,
      recruiter_resumes: hasAssignedRoles || isPrimaryAdmin,
      recruiter_stage_move: hasAssignedRoles || isPrimaryAdmin,
      recruiter_stages: hasAssignedRoles || isPrimaryAdmin,
      recruiter_pipelines: hasAssignedRoles || isPrimaryAdmin,
      team_monitoring: false,
      interviewer_workspace: false,
      access_client: false,
      client_contracts: false,
      client_mandates: false,
      client_shortlists: false,
      access_employee: false,
      employee_directory: false,
      employee_org_chart: false,
      manage_jobs: hasAssignedRoles || isPrimaryAdmin,
      view_resumes: hasAssignedRoles || isPrimaryAdmin,
      edit_status: hasAssignedRoles || isPrimaryAdmin,
      schedule_interviews: hasAssignedRoles || isPrimaryAdmin
    };

    if (hasAssignedRoles) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role_id', roleIds);

      if (rolePerms && rolePerms.length > 0) {
        for (const rp of rolePerms) {
          for (const key of Object.keys(permissions)) {
            if ((rp as any)[key] === true) {
              (permissions as any)[key] = true;
            }
          }
        }
      }
    }

    if (permissions.administrator === true) {
      isPrimaryAdmin = true;
    }

    if (isPrimaryAdmin) {
      permissions.administrator = true;
      permissions.audit_logs = true;
      permissions.access_recruitment = true;
      permissions.recruiter_dashboard = true;
      permissions.recruiter_mandates = true;
      permissions.recruiter_jobs = true;
      permissions.recruiter_sourcing = true;
      permissions.recruiter_stages = true;
      permissions.recruiter_pipelines = true;
      permissions.recruiter_qna = true;
    }

    const updatedUser = {
      id: member.id,
      name: member.name,
      email: member.email,
      organization_id: member.organization_id,
      organization_name: member.organizations?.name,
      operating_mode: member.organizations?.operating_mode,
      must_change_password: member.must_change_password,
      is_primary_admin: isPrimaryAdmin,
      terms_accepted: member.terms_accepted || false,
      has_assigned_roles: hasAssignedRoles || isPrimaryAdmin,
      roles: rolesList,
      permissions
    };

    const freshToken = createJwtToken(updatedUser, '24h');

    const response = NextResponse.json({
      authenticated: true,
      user: updatedUser,
      token: freshToken,
      urls: {
        admin_console: process.env.ADMIN_CONSOLE_URL || 'http://localhost:3001',
        recruiter_app: process.env.RECRUITER_APP_URL || 'http://localhost:3000',
        client_portal: process.env.CLIENT_PORTAL_URL || 'https://client.kozker.ai',
      }
    });

    const cookieOptions = getCookieDomainHeader();
    response.headers.append('Set-Cookie', `kozker_sso_token=${freshToken}; ${cookieOptions}`);

    return response;
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
