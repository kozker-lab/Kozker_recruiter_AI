import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sgghssstxeypxccexfpt.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email address and password are required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 1. Fetch member record from public.members
    const { data: member, error: fetchErr } = await supabase
      .from("members")
      .select("*, organizations(*)")
      .ilike("email", cleanEmail)
      .single();

    if (fetchErr || !member) {
      return NextResponse.json({ error: "Member profile not found for this email address" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const password_hash = hashPassword(password);

    // 2. Update member password & activate account
    const { error: updateErr } = await supabase
      .from("members")
      .update({
        password_hash,
        must_change_password: false,
        status: "active"
      })
      .eq("id", member.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    // 3. Upsert Supabase Auth user if supported
    try {
      if (supabase.auth?.admin) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === cleanEmail);
        if (existingAuthUser) {
          await supabase.auth.admin.updateUserById(existingAuthUser.id, { password });
        } else {
          await supabase.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true
          });
        }
      }
    } catch (authErr) {
      console.log("Supabase Auth user upsert notice:", authErr);
    }

    // 4. Generate SSO Session Token
    const ssoToken = Buffer.from(JSON.stringify({
      id: member.id,
      email: cleanEmail,
      name: member.name,
      organization_id: member.organization_id,
      is_primary_admin: member.is_primary_admin === true,
      iat: Math.floor(Date.now() / 1000)
    })).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "Password set and authentication confirmed successfully!",
      token: ssoToken,
      email: cleanEmail,
      user: {
        id: member.id,
        name: member.name,
        email: cleanEmail,
        organization_id: member.organization_id,
        is_primary_admin: member.is_primary_admin === true
      }
    }, { headers: NO_CACHE_HEADERS });

    // Set Cookies for Recruiter Application
    response.cookies.set("kozker_user_email", cleanEmail, { path: "/", maxAge: 86400, sameSite: "lax" });
    response.cookies.set("kozker_sso_token", ssoToken, { path: "/", maxAge: 86400, sameSite: "lax" });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to set password" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
