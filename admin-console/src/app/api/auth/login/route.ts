import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { comparePassword, createJwtToken, getCookieDomainHeader } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data: member, error } = await supabase
      .from('members')
      .select('*, organizations(*)')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !member) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const validPassword = await comparePassword(password, member.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Fetch user roles and permissions
    const { data: memberRoles } = await supabase
      .from('member_roles')
      .select('role_id, roles(*)')
      .eq('member_id', member.id);

    const rolesList = (memberRoles || []).map((mr: any) => mr.roles).filter(Boolean);
    const roleIds = rolesList.map((r: any) => r.id);

    // Merge permissions across user's assigned roles
    let permissions = {
      administrator: false,
      audit_logs: false,
      manage_server: false,
      access_recruitment: true,
      recruiter_dashboard: true,
      recruiter_mandates: true,
      recruiter_jobs: true,
      recruiter_sourcing: true,
      recruiter_reports: true,
      recruiter_qna: true,
      recruiter_resumes: true,
      recruiter_stage_move: true,
      access_client: false,
      client_contracts: false,
      client_mandates: false,
      client_shortlists: false,
      access_employee: false,
      employee_directory: false,
      employee_org_chart: false,
      manage_jobs: true,
      view_resumes: true,
      edit_status: true,
      schedule_interviews: true
    };

    if (roleIds.length > 0) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role_id', roleIds);

      if (rolePerms && rolePerms.length > 0) {
        // Any true flag grants that permission
        for (const rp of rolePerms) {
          for (const key of Object.keys(permissions)) {
            if ((rp as any)[key] === true) {
              (permissions as any)[key] = true;
            }
          }
        }
      }
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
      roles: rolesList,
      permissions
    };

    const token = createJwtToken(jwtPayload, '24h');

    // Create response with HTTP-Only Cookie header
    const response = NextResponse.json({
      success: true,
      must_change_password: member.must_change_password,
      user: jwtPayload,
      token,
      urls: {
        admin_console: process.env.ADMIN_CONSOLE_URL || 'https://admin.kozker.ai',
        recruiter_app: process.env.RECRUITER_APP_URL || 'https://app.kozker.ai',
        client_portal: process.env.CLIENT_PORTAL_URL || 'https://client.kozker.ai',
      }
    });

    const cookieOptions = getCookieDomainHeader();
    response.headers.append('Set-Cookie', `kozker_sso_token=${token}; ${cookieOptions}`);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
