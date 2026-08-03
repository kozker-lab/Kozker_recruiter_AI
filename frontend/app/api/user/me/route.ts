import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Prevent Next.js App Router route handler caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://covhcpsyliesrgkjxhai.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

// Super admin system developer emails with global dev panel access
const SUPER_DEV_ADMIN_EMAILS = [
  "smaranlm10@gmail.com"
];

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedOrgId = url.searchParams.get("org_id");

    const headerEmail = request.headers.get("x-user-email") || "";
    const authHeader = request.headers.get("authorization") || "";
    const cookieHeader = request.headers.get("cookie") || "";
    
    let userEmail = headerEmail.trim().toLowerCase();

    // Parse cookie header for user email
    if (!userEmail && cookieHeader) {
      const emailMatch = cookieHeader.match(/kozker_user_email=([^;]+)/);
      if (emailMatch) userEmail = decodeURIComponent(emailMatch[1]).trim().toLowerCase();
    }

    // Try decoding JWT token if email is still empty
    if (!userEmail) {
      let token = authHeader.replace("Bearer ", "");
      if (!token && cookieHeader) {
        const tokenMatch = cookieHeader.match(/kozker_sso_token=([^;]+)/) || cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
        if (tokenMatch) token = tokenMatch[1];
      }
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
            const decodedToken = JSON.parse(payloadStr);
            if (decodedToken && decodedToken.email) {
              userEmail = decodedToken.email.toLowerCase().trim();
            }
          }
        } catch {
          // Token decode error ignored
        }
      }
    }

    // If no user email is identified from session/cookie/headers, return unauthenticated
    if (!userEmail) {
      return NextResponse.json({ authenticated: false, error: "Authentication required" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const isSuperDevAdmin = SUPER_DEV_ADMIN_EMAILS.includes(userEmail);

    // 1. Fetch direct member records for this email across all organizations
    const { data: members } = await supabase
      .from("members")
      .select("*, organizations(*)")
      .ilike("email", userEmail);

    let membersList = members || [];

    if (membersList.length === 0) {
      if (isSuperDevAdmin) {
        const { data: newMember } = await supabase
          .from("members")
          .insert({
            name: "Smaran Devaki",
            email: userEmail,
            password_hash: "autocreated_sso_hash",
            avatar_initials: "SD",
            is_primary_admin: true,
            status: "active"
          })
          .select("*, organizations(*)")
          .single();
          
        if (newMember) membersList = [newMember];
      } else {
        return NextResponse.json({ authenticated: false, error: "Member profile not found" }, { status: 401, headers: NO_CACHE_HEADERS });
      }
    }

    const primaryMember = membersList[0];
    const memberIds = membersList.map(m => m.id).filter(Boolean);

    // 2. Fetch assigned roles from member_roles table
    let allMemberRoles: any[] = [];
    if (memberIds.length > 0) {
      const { data: mrData } = await supabase
        .from("member_roles")
        .select("*, roles(*, role_permissions(*), organizations(*))")
        .in("member_id", memberIds);
      allMemberRoles = mrData || [];
    }

    // 3. Collect ONLY organizations that this member actually belongs to
    const orgIds = new Set<string>();
    membersList.forEach((m: any) => {
      if (m.organization_id) orgIds.add(m.organization_id);
      if (m.organizations?.id) orgIds.add(m.organizations.id);
    });
    allMemberRoles.forEach((mr: any) => {
      if (mr.roles?.organization_id) orgIds.add(mr.roles.organization_id);
      if (mr.roles?.organizations?.id) orgIds.add(mr.roles.organizations.id);
    });

    let accessibleOrgs: any[] = [];
    const idsArray = Array.from(orgIds);
    if (idsArray.length > 0) {
      const { data: userOrgs } = await supabase
        .from("organizations")
        .select("id, name, operating_mode")
        .in("id", idsArray)
        .order("name");
      accessibleOrgs = userOrgs || [];
    }

    if (primaryMember.organizations && !accessibleOrgs.some((o: any) => o.id === primaryMember.organizations.id)) {
      accessibleOrgs.push(primaryMember.organizations);
    }

    // 4. Determine Active Organization for this session
    let activeOrg: any = accessibleOrgs.find((o: any) => o.id === requestedOrgId);
    if (!activeOrg && primaryMember.organization_id) {
      activeOrg = accessibleOrgs.find((o: any) => o.id === primaryMember.organization_id);
    }
    if (!activeOrg && primaryMember.organizations) {
      activeOrg = primaryMember.organizations;
    }
    if (!activeOrg && accessibleOrgs.length > 0) {
      activeOrg = accessibleOrgs[0];
    }

    // 5. Select active member & role for active organization
    const activeMember = membersList.find((m: any) => m.organization_id === activeOrg?.id) || primaryMember;
    const activeRolesList = allMemberRoles
      .map((mr: any) => mr.roles)
      .filter((r: any) => r && (r.organization_id === activeOrg?.id || r.organizations?.id === activeOrg?.id));

    const activeRole = activeRolesList[0] || (allMemberRoles.length > 0 ? allMemberRoles[0].roles : null);

    const isOrgPrimaryAdmin = isSuperDevAdmin || activeMember.is_primary_admin === true || (activeRole?.role_permissions?.administrator === true);

    // 6. Calculate permissions based strictly on PostgreSQL role_permissions row
    let permissions: any = {};

    if (isOrgPrimaryAdmin) {
      permissions = {
        administrator: true,
        recruiter_dashboard: true,
        recruiter_mandates: true,
        recruiter_jobs: true,
        recruiter_sourcing: true,
        recruiter_stages: true,
        recruiter_pipelines: true,
        approval_workflow_view: true,
        approval_workflow_edit: true,
        recruiter_qna: true,
        team_monitoring: true,
        interviewer_workspace: true,
        manage_jobs: true,
        view_resumes: true,
        edit_status: true,
        schedule_interviews: true
      };
    } else if (activeRole) {
      const rpArray = activeRole.role_permissions 
        ? (Array.isArray(activeRole.role_permissions) ? activeRole.role_permissions : [activeRole.role_permissions])
        : [];
      const rp = rpArray[0] || (typeof activeRole.permissions === 'object' ? activeRole.permissions : {});

      const hasPipelineAccess = 
        rp.approval_workflow_view === true || 
        rp.approval_workflow_edit === true || 
        rp.recruiter_pipelines === true;

      permissions = {
        administrator: rp.administrator === true,
        recruiter_dashboard: rp.recruiter_dashboard !== false,
        recruiter_mandates: rp.recruiter_mandates === true,
        recruiter_jobs: rp.recruiter_jobs === true,
        recruiter_sourcing: rp.recruiter_sourcing === true,
        recruiter_stages: rp.recruiter_stages === true,
        recruiter_pipelines: hasPipelineAccess,
        approval_workflow_view: hasPipelineAccess,
        approval_workflow_edit: rp.approval_workflow_edit === true,
        recruiter_qna: rp.recruiter_qna === true,
        team_monitoring: rp.team_monitoring === true,
        interviewer_workspace: rp.interviewer_workspace === true,
        manage_jobs: rp.manage_jobs === true,
        view_resumes: rp.view_resumes === true,
        edit_status: rp.edit_status === true,
        schedule_interviews: rp.schedule_interviews === true
      };
    } else {
      // Standard member with no custom role assigned - restrict panel access
      permissions = {
        administrator: false,
        recruiter_dashboard: true,
        recruiter_mandates: false,
        recruiter_jobs: false,
        recruiter_sourcing: false,
        recruiter_stages: false,
        recruiter_pipelines: false,
        recruiter_qna: false,
        team_monitoring: false,
        interviewer_workspace: false,
        manage_jobs: false,
        view_resumes: false,
        edit_status: false,
        schedule_interviews: false
      };
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: activeMember.id,
        name: activeMember.name,
        email: activeMember.email,
        avatar_initials: activeMember.avatar_initials || activeMember.name?.slice(0, 2).toUpperCase(),
        is_primary_admin: isOrgPrimaryAdmin
      },
      active_organization: activeOrg || null,
      active_role: activeRole ? { id: activeRole.id, name: activeRole.name, level: activeRole.level } : { name: isOrgPrimaryAdmin ? "Primary Administrator" : "Member" },
      permissions,
      organizations: accessibleOrgs
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
