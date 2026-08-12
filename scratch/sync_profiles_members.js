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

async function syncProfilesWithMembers() {
  console.log("=== SYNCING PUBLIC.PROFILES WITH PUBLIC.MEMBERS ===");

  // Update Ahmed's profile row in public.profiles
  const { data: updatedProfile, error: pErr } = await supabase
    .from("profiles")
    .update({ full_name: "Ahmed" })
    .eq("email", "adithyacherian24@outlook.com")
    .select();

  if (pErr) console.error("Error updating profile:", pErr);
  else console.log("Successfully updated Ahmed's profile:", updatedProfile);

  // Sync all other members into profiles if name differs
  const { data: members } = await supabase.from("members").select("*");
  for (const m of (members || [])) {
    if (m.email && m.name) {
      await supabase
        .from("profiles")
        .update({ full_name: m.name })
        .eq("email", m.email);
    }
  }
  console.log("Sync complete!");
}

syncProfilesWithMembers();
