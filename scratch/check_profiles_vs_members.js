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

async function checkBoth() {
  console.log("=== CHECKING PUBLIC.MEMBERS ===");
  const { data: mem } = await supabase.from("members").select("*").eq("email", "adithyacherian24@outlook.com");
  console.log("Members row:", mem);

  console.log("\n=== CHECKING PUBLIC.PROFILES ===");
  const { data: prof } = await supabase.from("profiles").select("*");
  console.log("Profiles rows count:", prof?.length);
  prof?.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.full_name} | Email: ${p.email}`);
  });
}

checkBoth();
