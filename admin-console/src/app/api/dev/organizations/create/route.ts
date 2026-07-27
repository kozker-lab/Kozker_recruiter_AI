import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const { name, operating_mode, default_landing_portal } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({
        name,
        operating_mode: operating_mode || 'internal',
        default_landing_portal: default_landing_portal || 'admin'
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create default root organization roles
    const { data: defaultRole } = await supabase
      .from('roles')
      .insert({
        organization_id: org.id,
        name: 'Organization Director',
        level: 'org',
        color_hex: '#ff6e30'
      })
      .select('*')
      .single();

    if (defaultRole) {
      await supabase.from('role_permissions').insert({
        role_id: defaultRole.id,
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

    return NextResponse.json({ success: true, organization: org, defaultRole });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create organization' }, { status: 500 });
  }
}
