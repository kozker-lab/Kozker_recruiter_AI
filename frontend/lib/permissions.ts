export interface UserPermissions {
  administrator?: boolean;
  audit_logs?: boolean;
  manage_server?: boolean;
  access_recruitment?: boolean;
  recruiter_dashboard?: boolean;
  recruiter_mandates?: boolean;
  recruiter_jobs?: boolean;
  recruiter_sourcing?: boolean;
  recruiter_reports?: boolean;
  recruiter_qna?: boolean;
  recruiter_resumes?: boolean;
  recruiter_stage_move?: boolean;
  access_client?: boolean;
  client_contracts?: boolean;
  client_mandates?: boolean;
  client_shortlists?: boolean;
  access_employee?: boolean;
  employee_directory?: boolean;
  employee_org_chart?: boolean;
  recruiter_stages?: boolean;
  recruiter_pipelines?: boolean;
  team_monitoring?: boolean;
  interviewer_workspace?: boolean;
  manage_jobs?: boolean;
  view_resumes?: boolean;
  edit_status?: boolean;
  schedule_interviews?: boolean;
  approval_workflow_view?: boolean;
  approval_workflow_edit?: boolean;
}

export function isRecruiterSectionVisible(
  userPermissions: UserPermissions | null | undefined,
  sectionKey: keyof UserPermissions
): boolean {
  if (!userPermissions) return true; // Default fallback to visible if no RBAC restrictions loaded
  if (userPermissions.administrator) return true;
  if (!userPermissions.access_recruitment) return false;
  return userPermissions[sectionKey] !== false;
}
