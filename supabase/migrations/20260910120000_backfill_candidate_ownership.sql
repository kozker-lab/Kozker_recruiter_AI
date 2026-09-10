-- ============================================================
-- 🚨 SUPABASE MIGRATION REQUIRED
-- Migration: Backfill candidate organization_id mapping
-- 
-- Problem: `candidates.uploaded_by` stores Supabase auth profile UUIDs
--          (which reference `profiles.id`). All historical candidates
--          had `organization_id = NULL`, causing candidates to be hidden
--          or unassigned across organization boundaries.
-- 
-- Resolution: Backfill `organization_id` on candidates table based on
--             the uploader's Supabase auth profile email and organization.
-- ============================================================

-- 1. Backfill candidates uploaded by smaranlm10@gmail.com (auth profile: f3dcea71)
--    Organization: 178689b9-363e-4e30-b767-14764a2adeb5
UPDATE candidates
SET organization_id = '178689b9-363e-4e30-b767-14764a2adeb5'
WHERE uploaded_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd'
  AND is_deleted = false;

-- 2. Backfill candidates uploaded by akshayjayeshjp@gmail.com (auth profile: 7875b911)
--    Organization: 178689b9-363e-4e30-b767-14764a2adeb5
UPDATE candidates
SET organization_id = '178689b9-363e-4e30-b767-14764a2adeb5'
WHERE uploaded_by = '7875b911-86aa-400a-98cd-f5ecc63286f3'
  AND is_deleted = false;

-- 3. Backfill candidates uploaded by akshayjayesh2002@gmail.com (auth profile: d114a732)
--    Organization: 0d040658-c26a-4f0c-badd-f7ef3efc2a60
UPDATE candidates
SET organization_id = '0d040658-c26a-4f0c-badd-f7ef3efc2a60'
WHERE uploaded_by = 'd114a732-d5be-4f62-8ffb-210a810a4671'
  AND is_deleted = false;

-- 4. Audit query to verify ownership distribution across organizations
SELECT 
  organization_id,
  uploaded_by,
  COUNT(*) as total_candidates
FROM candidates
WHERE is_deleted = false
GROUP BY organization_id, uploaded_by
ORDER BY total_candidates DESC;
