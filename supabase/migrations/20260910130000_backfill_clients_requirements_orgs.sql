-- Migration: Backfill organization_id across clients, requirements, and job_openings
-- Problem: Legacy records had organization_id = NULL, preventing org-scoped query endpoints from returning them.

ALTER TABLE job_openings DISABLE TRIGGER ALL;

-- 1. Backfill clients
UPDATE clients 
SET organization_id = '178689b9-363e-4e30-b767-14764a2adeb5' 
WHERE organization_id IS NULL;

-- 2. Backfill requirements
UPDATE requirements 
SET organization_id = '178689b9-363e-4e30-b767-14764a2adeb5' 
WHERE organization_id IS NULL;

-- 3. Backfill job_openings
UPDATE job_openings 
SET organization_id = '178689b9-363e-4e30-b767-14764a2adeb5' 
WHERE organization_id IS NULL;

ALTER TABLE job_openings ENABLE TRIGGER ALL;
