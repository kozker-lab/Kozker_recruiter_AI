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

async function fixSmaranMember() {
  console.log("--- PROVISIONING SMARAN IN PUBLIC.MEMBERS ---");

  // Get Big Corpo organization ID
  const { data: org } = await supabase.from("organizations").select("id").eq("name", "Big Corpo").single();

  const smaranEmail = "smaranlm10@gmail.com";
  
  const { data: existing } = await supabase.from("members").select("*").eq("email", smaranEmail).maybeSingle();

  if (!existing) {
    const { data: inserted, error: insErr } = await supabase
      .from("members")
      .insert({
        name: "Smaran Devaki",
        email: smaranEmail,
        password_hash: "hashed_smaran_pass",
        avatar_initials: "SD",
        is_primary_admin: true,
        organization_id: org ? org.id : null,
        status: "active"
      })
      .select()
      .single();

    if (insErr) console.error("Error inserting Smaran:", insErr);
    else console.log("Successfully created Smaran member record:", inserted);
  } else {
    const { data: updated, error: upErr } = await supabase
      .from("members")
      .update({ is_primary_admin: true, name: "Smaran Devaki" })
      .eq("email", smaranEmail)
      .select()
      .single();

    if (upErr) console.error("Error updating Smaran:", upErr);
    else console.log("Successfully updated Smaran member record:", updated);
  }
}

fixSmaranMember();
