import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sgghssstxeypxccexfpt.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const PRIMARY_ADMIN_EMAILS = [
  "smaranlm10@gmail.com",
  "adithyacherian24@gmail.com",
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

    const isPrimaryAdmin = PRIMARY_ADMIN_EMAILS.includes(userEmail);

    // 1. Fetch member record from Supabase by email
    let { data: member } = await supabase
      .from("members")
      .select("*, organizations(*)")
      .ilike("email", userEmail)
      .maybeSingle();

    // Auto-create/upsert member record if not found in public.members
    if (!member) {
      const formattedName = userEmail.split("@")[0].split(".")[0];
      const capitalizedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      
      const { data: newMember } = await supabase
        .from("members")
        .insert({
          name: isPrimaryAdmin ? (userEmail.includes("smaran") ? "Smaran Devaki" : capitalizedName) : capitalizedName,
          email: userEmail,
          password_hash: "autocreated_sso_hash",
          avatar_initials: capitalizedName.slice(0, 2).toUpperCase(),
          is_primary_admin: isPrimaryAdmin,
          status: "active"
        })
        .select("*, organizations(*)")
        .single();
        
      member = newMember;
    }

    // Fallback object if insertion was prevented
    if (!member) {
      member = {
        id: "auto-generated-id",
        name: isPrimaryAdmin ? (userEmail.includes("smaran") ? "Smaran Devaki" : userEmail.split("@")[0]) : userEmail.split("@")[0],
        email: userEmail,
        is_primary_admin: isPrimaryAdmin
      };
    }

    // 2. Fetch member assigned roles & permissions from Supabase
    const { data: mRoles } = await supabase
      .from("member_roles")
      .select("*, roles(*, role_permissions(*), organizations(*))")
      .eq("member_id", member.id || "");

    const rolesList = (mRoles || []).map((mr: any) => mr.roles).filter(Boolean);

    // 3. Determine accessible organizations for this member
    let accessibleOrgs: any[] = [];
    if (isPrimaryAdmin) {
      const { data: allOrgs } = await supabase.from("organizations").select("id, name, operating_mode").order("name");
      accessibleOrgs = allOrgs || [];
    } else {
      const userOrgIds = new Set<string>();
      if (member.organization_id) userOrgIds.add(member.organization_id);
      rolesList.forEach((r: any) => {
        if (r.organization_id) userOrgIds.add(r.organization_id);
      });
      const idsArray = Array.from(userOrgIds);
      if (idsArray.length > 0) {
        const { data: userOrgs } = await supabase.from("organizations").select("id, name, operating_mode").in("id", idsArray).order("name");
        accessibleOrgs = userOrgs || [];
      } else if (member.organizations) {
        accessibleOrgs = [member.organizations];
      }
    }

    // 4. Select active organization
    let activeOrg = accessibleOrgs.find((o: any) => o.id === requestedOrgId);
    if (!activeOrg && member.organization_id) {
      activeOrg = accessibleOrgs.find((o: any) => o.id === member.organization_id);
    }
    if (!activeOrg && accessibleOrgs.length > 0) {
      activeOrg = accessibleOrgs[0];
    }
    if (!activeOrg) {
      activeOrg = { id: "default-org-id", name: "Big Corpo" };
    }

    // 5. Select active role & calculate permissions for the active organization
    const activeRole = rolesList.find((r: any) => r.organization_id === activeOrg.id) || rolesList[0] || null;

    let permissions: any = {};

    if (isPrimaryAdmin) {
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
      // Default non-admin role permissions if no specific role row found
      permissions = {
        administrator: false,
        recruiter_dashboard: true,
        recruiter_mandates: true,
        recruiter_jobs: true,
        recruiter_sourcing: false,
        recruiter_stages: false,
        recruiter_pipelines: true,
        recruiter_qna: true,
        team_monitoring: false,
        interviewer_workspace: false
      };
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        avatar_initials: member.avatar_initials || member.name?.slice(0, 2).toUpperCase(),
        is_primary_admin: isPrimaryAdmin
      },
      active_organization: activeOrg,
      active_role: activeRole ? { id: activeRole.id, name: activeRole.name, level: activeRole.level } : { name: isPrimaryAdmin ? "Primary Administrator" : "Recruiter" },
      permissions,
      organizations: accessibleOrgs
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
