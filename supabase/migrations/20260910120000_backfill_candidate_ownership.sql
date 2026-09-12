-- ============================================================
-- 🚨 SUPABASE MIGRATION REQUIRED
-- Migration: Dynamic Candidate organization_id Backfill
-- 
-- Problem: `candidates.uploaded_by` stores Supabase auth profile UUIDs
--          (which reference `profiles.id`). Historical candidates
--          had `organization_id = NULL`, causing candidates to be unassigned
--          across organization boundaries.
-- 
-- Resolution: Dynamically backfill `organization_id` on the candidates table by
--             joining candidates -> profiles -> members by email.
-- ============================================================

-- Dynamically update organization_id on candidates matching uploader profile email to member organization_id
UPDATE candidates c
SET organization_id = m.organization_id
FROM profiles p
JOIN members m ON LOWER(m.email) = LOWER(p.email)
WHERE c.uploaded_by = p.id
  AND c.organization_id IS NULL
  AND c.is_deleted = false;

-- Audit query to verify candidate ownership distribution across organizations
SELECT 
  organization_id,
  uploaded_by,
  COUNT(*) as total_candidates
FROM candidates
WHERE is_deleted = false
GROUP BY organization_id, uploaded_by
ORDER BY total_candidates DESC;
