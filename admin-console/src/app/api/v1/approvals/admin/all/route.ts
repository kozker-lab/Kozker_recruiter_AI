import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const headerEmail = request.headers.get("x-user-email") || "";
    const cookieHeader = request.headers.get("cookie") || "";
    let userEmail = headerEmail.trim().toLowerCase();

    if (!userEmail && cookieHeader) {
      const match = cookieHeader.match(/kozker_user_email=([^;]+)/);
      if (match) userEmail = decodeURIComponent(match[1]).trim().toLowerCase();
    }

    if (!userEmail) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    // Resolve member & organization
    const { data: member } = await supabase
      .from("members")
      .select("id, organization_id, is_primary_admin")
      .ilike("email", userEmail)
      .maybeSingle();

    if (!member || !member.organization_id) {
      return NextResponse.json({ pipelines: [] }, { headers: NO_CACHE_HEADERS });
    }

    // Query approval_pipelines for this organization
    const { data: pipelines, error } = await supabase
      .from("approval_pipelines")
      .select("*, approval_stages(*, approval_stage_approvers(*, members(name, email), roles(name))), approval_rejection_checklists(*), members!approval_pipelines_created_by_fkey(name, email, roles(name))")
      .eq("organization_id", member.organization_id)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback query if relation name differs
      const { data: rawPipelines } = await supabase
        .from("approval_pipelines")
        .select("*")
        .eq("organization_id", member.organization_id)
        .order("created_at", { ascending: false });

      const formatted = (rawPipelines || []).map((p: any) => ({
        ...p,
        created_by_name: "Organization Member",
        created_by_role: "Role Member",
        stages: []
      }));
      return NextResponse.json({ pipelines: formatted }, { headers: NO_CACHE_HEADERS });
    }

    const formatted = (pipelines || []).map((p: any) => {
      const creator = p.members || {};
      const creatorRole = creator.roles?.name || "Member";
      return {
        ...p,
        created_by_name: creator.name || creator.email || "Organization Member",
        created_by_role: creatorRole,
        stages: (p.approval_stages || []).sort((a: any, b: any) => a.stage_index - b.stage_index).map((stg: any) => ({
          ...stg,
          approvers: (stg.approval_stage_approvers || []).map((appr: any) => ({
            ...appr,
            member_name: appr.members?.name || appr.members?.email,
            role_name: appr.roles?.name
          }))
        })),
        rejection_checklist: p.approval_rejection_checklists?.[0] || null
      };
    });

    return NextResponse.json({ pipelines: formatted }, { headers: NO_CACHE_HEADERS });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch approvals" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
