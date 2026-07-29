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

async function testMe() {
  const email = "adithyacherian24@outlook.com";
  let { data: member } = await supabase
    .from("members")
    .select("*, organizations(*)")
    .ilike("email", email)
    .maybeSingle();

  console.log("Member result:", {
    id: member?.id,
    name: member?.name,
    email: member?.email,
    organization: member?.organizations?.name
  });
}

testMe();
