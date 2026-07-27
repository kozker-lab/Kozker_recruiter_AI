import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

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

const TEMPLATES: Record<string, any> = {
  'org-director': {
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
  },
  'branch-manager': {
    administrator: false,
    audit_logs: true,
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
    access_client: true,
    client_contracts: false,
    client_mandates: true,
    client_shortlists: true,
    access_employee: true,
    employee_directory: true,
    employee_org_chart: true,
    manage_jobs: true,
    view_resumes: true,
    edit_status: true,
    schedule_interviews: true
  },
  'senior-recruiter': {
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
  },
  'sourcing-specialist': {
    administrator: false,
    audit_logs: false,
    manage_server: false,
    access_recruitment: true,
    recruiter_dashboard: true,
    recruiter_mandates: false,
    recruiter_jobs: false,
    recruiter_sourcing: true,
    recruiter_reports: false,
    recruiter_qna: false,
    recruiter_resumes: true,
    recruiter_stage_move: false,
    access_client: false,
    client_contracts: false,
    client_mandates: false,
    client_shortlists: false,
    access_employee: false,
    employee_directory: false,
    employee_org_chart: false,
    manage_jobs: false,
    view_resumes: true,
    edit_status: false,
    schedule_interviews: false
  },
  'hiring-panel': {
    administrator: false,
    audit_logs: false,
    manage_server: false,
    access_recruitment: true,
    recruiter_dashboard: false,
    recruiter_mandates: false,
    recruiter_jobs: true,
    recruiter_sourcing: false,
    recruiter_reports: false,
    recruiter_qna: true,
    recruiter_resumes: true,
    recruiter_stage_move: false,
    access_client: false,
    client_contracts: false,
    client_mandates: false,
    client_shortlists: false,
    access_employee: false,
    employee_directory: false,
    employee_org_chart: false,
    manage_jobs: false,
    view_resumes: true,
    edit_status: false,
    schedule_interviews: true
  }
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleId = params.id;
    const body = await request.json();
    const templateKey = body.template_key || body.template;

    const templatePerms = TEMPLATES[templateKey];
    if (!templatePerms) {
      return NextResponse.json({ error: `Invalid template key '${templateKey}'` }, { status: 400 });
    }

    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role_id: roleId,
        ...templatePerms
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Applied permission template '${templateKey}' to role`,
      target_name: roleId,
      action_type: 'update'
    });

    return NextResponse.json({ success: true, permissions: templatePerms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to apply template' }, { status: 500 });
  }
}
