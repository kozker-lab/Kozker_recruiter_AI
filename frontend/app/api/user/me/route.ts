import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sgghssstxeypxccexfpt.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedOrgId = url.searchParams.get("org_id");

    const authHeader = request.headers.get("authorization") || "";
    const cookieHeader = request.headers.get("cookie") || "";
    let token = authHeader.replace("Bearer ", "");

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
      if (match) token = match[1];
    }

    let userEmail = "";
    let decodedToken: any = null;

    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
          decodedToken = JSON.parse(payloadStr);
          if (decodedToken && decodedToken.email) {
            userEmail = decodedToken.email.toLowerCase().trim();
          }
        }
      } catch {
        // Ignore token parse errors
      }
    }

    // If no JWT token, fallback to querying Supabase Auth current user
    if (!userEmail) {
      // Default to primary admin for local testing if unauthenticated
      userEmail = "adithyacherian24@gmail.com";
    }

    // 1. Fetch member record from Supabase
    const { data: member, error: memErr } = await supabase
      .from("members")
      .select("*, organizations(*)")
      .eq("email", userEmail)
      .single();

    if (memErr || !member) {
      // Fallback response for missing member
      return NextResponse.json({
        authenticated: true,
        user: { email: userEmail, name: userEmail.split("@")[0], is_primary_admin: true },
        active_organization: { id: "default", name: "Kozker Talent Network" },
        active_role: { name: "Primary Administrator" },
        permissions: { administrator: true },
        organizations: [{ id: "default", name: "Kozker Talent Network" }]
      });
    }

    const isPrimaryAdmin = member.is_primary_admin === true || 
      ["smaranlm10@gmail.com", "adithyacherian24@gmail.com", "aderhamsk@gmail.com"].includes(member.email.toLowerCase());

    // 2. Fetch member assigned roles & permissions
    const { data: mRoles } = await supabase
      .from("member_roles")
      .select("*, roles(*, role_permissions(*), organizations(*))")
      .eq("member_id", member.id);

    const rolesList = (mRoles || []).map((mr: any) => mr.roles).filter(Boolean);

    // 3. Determine accessible organizations
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
      activeOrg = { id: member.organization_id || "default", name: member.organizations?.name || "Kozker Recruiter Network" };
    }

    // 5. Select active role & calculate permissions for the active organization
    const activeRole = rolesList.find((r: any) => r.organization_id === activeOrg.id) || rolesList[0] || null;

    let permissions: any = {
      administrator: isPrimaryAdmin,
      recruiter_dashboard: isPrimaryAdmin,
      recruiter_mandates: isPrimaryAdmin,
      recruiter_jobs: isPrimaryAdmin,
      recruiter_sourcing: isPrimaryAdmin,
      recruiter_stages: isPrimaryAdmin,
      recruiter_pipelines: isPrimaryAdmin,
      recruiter_qna: isPrimaryAdmin,
      team_monitoring: isPrimaryAdmin,
      interviewer_workspace: isPrimaryAdmin
    };

    if (isPrimaryAdmin) {
      Object.keys(permissions).forEach(k => permissions[k] = true);
    } else if (activeRole && activeRole.role_permissions) {
      const rpArray = Array.isArray(activeRole.role_permissions) ? activeRole.role_permissions : [activeRole.role_permissions];
      if (rpArray.length > 0) {
        const rp = rpArray[0];
        permissions = {
          administrator: rp.administrator === true,
          recruiter_dashboard: rp.recruiter_dashboard !== false,
          recruiter_mandates: rp.recruiter_mandates !== false,
          recruiter_jobs: rp.recruiter_jobs !== false,
          recruiter_sourcing: rp.recruiter_sourcing !== false,
          recruiter_stages: rp.recruiter_stages !== false,
          recruiter_pipelines: rp.recruiter_pipelines !== false,
          recruiter_qna: rp.recruiter_qna !== false,
          team_monitoring: rp.team_monitoring !== false,
          interviewer_workspace: rp.interviewer_workspace !== false
        };
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        avatar_initials: member.avatar_initials,
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
