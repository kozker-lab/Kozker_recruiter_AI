import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sgghssstxeypxccexfpt.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

// Super admin system developer emails with global dev panel access
const SUPER_DEV_ADMIN_EMAILS = [
  "smaranlm10@gmail.com",
  "aderhamsk@gmail.com"
];

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
          // Token decode fallback ignored
        }
      }
    }

    // If still no email, return 401 unauthenticated
    if (!userEmail) {
      return NextResponse.json({ authenticated: false, error: "Unauthenticated" }, { status: 401 });
    }

    const isSuperDevAdmin = SUPER_DEV_ADMIN_EMAILS.includes(userEmail);

    // 1. Fetch all member records from Supabase matching userEmail across all organizations
    const { data: allMemberRecords } = await supabase
      .from("members")
      .select("*, member_roles(*, roles(*, role_permissions(*), organizations(*))), organizations(*)")
      .ilike("email", userEmail);

    let membersList = allMemberRecords || [];

    // Auto-create member record if user is not in public.members
    if (membersList.length === 0) {
      const formattedName = userEmail.split("@")[0].split(".")[0];
      const capitalizedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      
      const { data: newMember } = await supabase
        .from("members")
        .insert({
          name: isSuperDevAdmin ? (userEmail.includes("smaran") ? "Smaran Devaki" : capitalizedName) : capitalizedName,
          email: userEmail,
          password_hash: "autocreated_sso_hash",
          avatar_initials: capitalizedName.slice(0, 2).toUpperCase(),
          is_primary_admin: isSuperDevAdmin,
          status: "active"
        })
        .select("*, member_roles(*, roles(*, role_permissions(*), organizations(*))), organizations(*)")
        .single();
        
      if (newMember) {
        membersList = [newMember];
      }
    }

    const primaryMember = membersList[0] || {
      id: "auto-generated-id",
      name: isSuperDevAdmin ? (userEmail.includes("smaran") ? "Smaran Devaki" : userEmail.split("@")[0]) : userEmail.split("@")[0],
      email: userEmail,
      is_primary_admin: isSuperDevAdmin
    };

    // 2. Determine accessible organizations across all member records & member_roles of this user
    let accessibleOrgs: any[] = [];
    const userOrgIds = new Set<string>();
    
    membersList.forEach((m: any) => {
      if (m.organization_id) userOrgIds.add(m.organization_id);
      if (m.organizations?.id) userOrgIds.add(m.organizations.id);
      (m.member_roles || []).forEach((mr: any) => {
        if (mr.roles?.organization_id) userOrgIds.add(mr.roles.organization_id);
        if (mr.roles?.organizations?.id) userOrgIds.add(mr.roles.organizations.id);
      });
    });

    if (isSuperDevAdmin) {
      const { data: allOrgs } = await supabase.from("organizations").select("id, name, operating_mode").order("name");
      accessibleOrgs = allOrgs || [];
    } else {
      const idsArray = Array.from(userOrgIds);
      if (idsArray.length > 0) {
        const { data: userOrgs } = await supabase.from("organizations").select("id, name, operating_mode").in("id", idsArray).order("name");
        accessibleOrgs = userOrgs || [];
      } else {
        accessibleOrgs = membersList.map((m: any) => m.organizations).filter(Boolean);
      }
    }

    // Safety Fallback: If accessibleOrgs is empty for an authenticated user, query tenant organizations from Supabase
    if (accessibleOrgs.length === 0) {
      const { data: fallbackOrgs } = await supabase.from("organizations").select("id, name, operating_mode").order("name");
      accessibleOrgs = fallbackOrgs || [];
    }

    // 3. Select active organization
    let activeOrg = accessibleOrgs.find((o: any) => o.id === requestedOrgId);
    if (!activeOrg && primaryMember.organization_id) {
      activeOrg = accessibleOrgs.find((o: any) => o.id === primaryMember.organization_id);
    }
    if (!activeOrg && accessibleOrgs.length > 0) {
      activeOrg = accessibleOrgs[0];
    }
    if (!activeOrg) {
      activeOrg = { id: "default-org-id", name: "Enterprise Workspace" };
    }

    // 4. Find member record & role assignments specifically for the selected active organization
    const activeMember = membersList.find((m: any) => m.organization_id === activeOrg.id) || primaryMember;

    // Collect roles for this member in the active organization
    let activeRolesList: any[] = [];
    membersList.forEach((m: any) => {
      (m.member_roles || []).forEach((mr: any) => {
        if (mr.roles && (mr.roles.organization_id === activeOrg.id || mr.roles.organizations?.id === activeOrg.id)) {
          activeRolesList.push(mr.roles);
        }
      });
    });

    const activeRole = activeRolesList[0] || null;

    const isOrgPrimaryAdmin = isSuperDevAdmin || activeMember.is_primary_admin === true || (activeRole?.role_permissions?.administrator === true);

    // 5. Calculate permissions for the active organization
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
        recruiter_qna: true,
        team_monitoring: true,
        interviewer_workspace: true,
        manage_jobs: true,
        view_resumes: true,
        edit_status: true,
        schedule_interviews: true
      };
    } else if (activeRole && activeRole.role_permissions) {
      const rpArray = Array.isArray(activeRole.role_permissions) ? activeRole.role_permissions : [activeRole.role_permissions];
      if (rpArray.length > 0) {
        const rp = rpArray[0];
        permissions = {
          administrator: rp.administrator === true,
          recruiter_dashboard: rp.recruiter_dashboard === true,
          recruiter_mandates: rp.recruiter_mandates === true,
          recruiter_jobs: rp.recruiter_jobs === true,
          recruiter_sourcing: rp.recruiter_sourcing === true,
          recruiter_stages: rp.recruiter_stages === true,
          recruiter_pipelines: rp.recruiter_pipelines === true,
          recruiter_qna: rp.recruiter_qna === true,
          team_monitoring: rp.team_monitoring === true,
          interviewer_workspace: rp.interviewer_workspace === true,
          manage_jobs: rp.manage_jobs === true,
          view_resumes: rp.view_resumes === true,
          edit_status: rp.edit_status === true,
          schedule_interviews: rp.schedule_interviews === true
        };
      }
    } else {
      // Role-Less Member in this active organization: 0 permissions
      permissions = {
        administrator: false,
        recruiter_dashboard: false,
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
      active_organization: activeOrg,
      active_role: activeRole ? { id: activeRole.id, name: activeRole.name, level: activeRole.level } : { name: isOrgPrimaryAdmin ? "Primary Administrator" : "Unassigned Member" },
      permissions,
      organizations: accessibleOrgs
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
