import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { comparePassword, createJwtToken, getCookieDomainHeader } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: corsHeaders });
    }

    const { data: member, error } = await supabase
      .from('members')
      .select('*, organizations(*)')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !member) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: corsHeaders });
    }

    const validPassword = await comparePassword(password, member.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: corsHeaders });
    }

    // Fetch user roles and permissions
    const { data: memberRoles } = await supabase
      .from('member_roles')
      .select('role_id, roles(*)')
      .eq('member_id', member.id);

    const rolesList = (memberRoles || []).map((mr: any) => mr.roles).filter(Boolean);
    const roleIds = rolesList.map((r: any) => r.id);

    const hasAssignedRoles = roleIds.length > 0;

    let isPrimaryAdmin = member.is_primary_admin === true;

    // If member has is_primary_admin null/undefined or true, or if no roles assigned yet, treat as primary admin
    if (member.is_primary_admin !== false && (!hasAssignedRoles || member.is_primary_admin === true)) {
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

    // Create SSO JWT Token
    const jwtPayload = {
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

    const token = createJwtToken(jwtPayload, '24h');

    const response = NextResponse.json({
      success: true,
      must_change_password: member.must_change_password,
      must_accept_terms: !member.terms_accepted,
      has_assigned_roles: hasAssignedRoles || isPrimaryAdmin,
      user: jwtPayload,
      token,
      urls: {
        admin_console: process.env.ADMIN_CONSOLE_URL || 'http://localhost:3001',
        recruiter_app: process.env.RECRUITER_APP_URL || 'http://localhost:3000',
        client_portal: process.env.CLIENT_PORTAL_URL || 'https://client.kozker.ai',
      }
    }, { headers: corsHeaders });

    const cookieOptions = getCookieDomainHeader();
    response.headers.append('Set-Cookie', `kozker_sso_token=${token}; ${cookieOptions}`);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500, headers: corsHeaders });
  }
}
