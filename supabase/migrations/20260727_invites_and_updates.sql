-- Update members table with terms acceptance & invitation timestamps
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;

-- Create rolling_updates table for developer platform update broadcasts
CREATE TABLE IF NOT EXISTS rolling_updates (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag VARCHAR(50) NOT NULL, -- e.g. 'v3.2.0'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Feature Release', -- 'Feature Release', 'Security Patch', 'System Upgrade'
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal', -- 'Normal', 'High', 'Critical'
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
