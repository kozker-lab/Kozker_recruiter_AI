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

async function debugAll() {
  console.log("--- ALL MEMBERS IN SUPABASE ---");
  const { data: members, error: mErr } = await supabase
    .from("members")
    .select("*, organizations(*)");
  if (mErr) console.error("Members error:", mErr);
  else {
    members.forEach(m => {
      console.log(`ID: ${m.id} | Name: ${m.name} | Email: ${m.email} | OrgId: ${m.organization_id} | OrgName: ${m.organizations?.name}`);
    });
  }

  console.log("\n--- ALL MEMBER ROLES IN SUPABASE ---");
  const { data: mRoles } = await supabase
    .from("member_roles")
    .select("*, members(email, name), roles(name, organization_id, organizations(name))");
  mRoles?.forEach(mr => {
    console.log(`Member: ${mr.members?.email} (${mr.members?.name}) -> Role: ${mr.roles?.name} -> Org: ${mr.roles?.organizations?.name}`);
  });

  console.log("\n--- ALL ORGANIZATIONS IN SUPABASE ---");
  const { data: orgs } = await supabase.from("organizations").select("*");
  orgs?.forEach(o => {
    console.log(`ID: ${o.id} | Name: ${o.name}`);
  });
}

debugAll();
