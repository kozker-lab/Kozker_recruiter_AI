-- ============================================================
-- Migration: Backfill candidate ownership (uploaded_by + organization_id)
-- 
-- Problem: candidates.uploaded_by stored old Supabase auth UUIDs
--          which no longer match members.id (different ID space).
--          All candidates also have organization_id = NULL.
-- 
-- Mapping (auth UUID → members.id → organization_id):
--   f3dcea71 (smaranlm10@gmail.com)     → 8cebc388 → 178689b9
--   7875b911 (akshayjayeshjp@gmail.com) → f82c5a26 → 178689b9 (same person as akshayj@kozker.com)
--   d114a732 (akshayjayesh2002@gmail.com)→ c0213646 → 0d040658
--   e11577d5 (govind@kozker.com)        → NULL      → NULL (no member record, keep orphaned)
-- ============================================================

-- 1. Update candidates uploaded by smaranlm10@gmail.com
UPDATE candidates
SET
  uploaded_by   = '8cebc388-e69b-497d-955a-2653b534f1c1',
  organization_id = '178689b9-363e-4e30-b767-14764a2adeb5'
WHERE
  uploaded_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd'
  AND is_deleted = false;

-- 2. Update candidates uploaded by akshayjayeshjp@gmail.com
--    (same person as akshayj@kozker.com, member f82c5a26 in org 178689b9)
UPDATE candidates
SET
  uploaded_by   = 'f82c5a26-c3e2-4210-abc3-bc6d02ea98b6',
  organization_id = '178689b9-363e-4e30-b767-14764a2adeb5'
WHERE
  uploaded_by = '7875b911-86aa-400a-98cd-f5ecc63286f3'
  AND is_deleted = false;

-- 3. Update candidates uploaded by akshayjayesh2002@gmail.com
UPDATE candidates
SET
  uploaded_by   = 'c0213646-cf27-49eb-9e67-97f6510b0dee',
  organization_id = '0d040658-c26a-4f0c-badd-f7ef3efc2a60'
WHERE
  uploaded_by = 'd114a732-d5be-4f62-8ffb-210a810a4671'
  AND is_deleted = false;

-- 4. For govind@kozker.com (no member record) - keep uploaded_by as-is but null out
--    so they appear as unscoped/shared candidates (visible to all orgs)
UPDATE candidates
SET
  uploaded_by = NULL
WHERE
  uploaded_by = 'e11577d5-df27-4c68-bf5e-214e830af40a'
  AND is_deleted = false;

-- 5. Also fix the mock/hardcoded candidates (ca111111-... etc) - keep them shared
UPDATE candidates
SET
  uploaded_by = NULL,
  organization_id = NULL
WHERE
  uploaded_by IS NOT NULL
  AND uploaded_by NOT IN (
    SELECT id FROM members
  )
  AND is_deleted = false;

-- Verify the results
SELECT
  uploaded_by,
  organization_id,
  COUNT(*) as count
FROM candidates
WHERE is_deleted = false
GROUP BY uploaded_by, organization_id
ORDER BY count DESC;
