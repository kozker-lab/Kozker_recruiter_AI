const fs = require('fs');
const envContent = fs.readFileSync('/home/aderham/Kozkerprojs/Kozker_recruiter_AI/Kozker_recruiter_AI/.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || "https://sgghssstxeypxccexfpt.supabase.co";
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserOutlook() {
  const userEmail = "adithyacherian24@outlook.com";
  console.log("Fetching member for:", userEmail);

  const { data: member, error: memErr } = await supabase
    .from("members")
    .select("*, organizations(*)")
    .eq("email", userEmail)
    .single();

  if (memErr || !member) {
    console.error("Member not found:", memErr);
    return;
  }

  console.log("Member found:", member.name, "Email:", member.email, "Org:", member.organizations?.name);

  const { data: mRoles } = await supabase
    .from("member_roles")
    .select("*, roles(*, role_permissions(*), organizations(*))")
    .eq("member_id", member.id);

  console.log("Assigned roles count:", mRoles?.length);
  mRoles?.forEach(mr => {
    console.log("Role Name:", mr.roles?.name);
    console.log("Role Org:", mr.roles?.organizations?.name);
    console.log("Role Permissions:", JSON.stringify(mr.roles?.role_permissions, null, 2));
  });
}

testUserOutlook();
