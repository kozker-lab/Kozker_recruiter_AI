-- 1. Organizations & Operating Mode Setup
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    operating_mode VARCHAR(50) NOT NULL DEFAULT 'internal', -- 'agency' OR 'internal'
    default_landing_portal VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin', 'recruiter', OR 'client'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Roles (Flexible Arbitrary Hierarchy Tree)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id VARCHAR(36) REFERENCES roles(id) ON DELETE SET NULL, -- Nullable for Standalone Root Roles
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'position', -- 'org', 'branch', OR 'position'
    color_hex VARCHAR(7) NOT NULL DEFAULT '#ff6e30', -- Restricted to #ff6e30, #2563eb, #16a34a
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Granular Role Permissions Matrix
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(36) PRIMARY KEY REFERENCES roles(id) ON DELETE CASCADE,
    -- Administration & System Rights
    administrator BOOLEAN DEFAULT FALSE,
    audit_logs BOOLEAN DEFAULT FALSE,
    manage_server BOOLEAN DEFAULT FALSE,
    -- Recruiter Panel Access & Sub-Section Visibilities
    access_recruitment BOOLEAN DEFAULT TRUE,
    recruiter_dashboard BOOLEAN DEFAULT TRUE,
    recruiter_mandates BOOLEAN DEFAULT TRUE,
    recruiter_jobs BOOLEAN DEFAULT TRUE,
    recruiter_sourcing BOOLEAN DEFAULT TRUE,
    recruiter_reports BOOLEAN DEFAULT TRUE,
    recruiter_qna BOOLEAN DEFAULT TRUE,
    recruiter_resumes BOOLEAN DEFAULT TRUE,
    recruiter_stage_move BOOLEAN DEFAULT TRUE,
    -- Client Portal Access (Tentative)
    access_client BOOLEAN DEFAULT FALSE,
    client_contracts BOOLEAN DEFAULT FALSE,
    client_mandates BOOLEAN DEFAULT FALSE,
    client_shortlists BOOLEAN DEFAULT FALSE,
    -- Employee Portal Access
    access_employee BOOLEAN DEFAULT FALSE,
    employee_directory BOOLEAN DEFAULT FALSE,
    employee_org_chart BOOLEAN DEFAULT FALSE,
    -- Granular Action Controls
    manage_jobs BOOLEAN DEFAULT TRUE,
    view_resumes BOOLEAN DEFAULT TRUE,
    edit_status BOOLEAN DEFAULT TRUE,
    schedule_interviews BOOLEAN DEFAULT TRUE
);

-- 4. Organization Members Directory
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_initials VARCHAR(4) NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'away', 'offline'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Member Role Assignments (Tag Mapping)
CREATE TABLE IF NOT EXISTS member_roles (
    member_id VARCHAR(36) REFERENCES members(id) ON DELETE CASCADE,
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, role_id)
);

-- 6. Approval Pipelines Definition
CREATE TABLE IF NOT EXISTS approval_pipelines (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'Hiring & Offers', 'Mandates & Job Postings', 'Admin Governance'
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Approval Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id VARCHAR(36) REFERENCES approval_pipelines(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    stage_title VARCHAR(255) NOT NULL,
    required_role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    sla_hours INT DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Pending Approvals Queue Items
CREATE TABLE IF NOT EXISTS pending_approvals (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id VARCHAR(36) REFERENCES approval_pipelines(id) ON DELETE CASCADE,
    item_title VARCHAR(255) NOT NULL,
    requestor_id VARCHAR(36) REFERENCES members(id) ON DELETE CASCADE,
    current_stage_step INT NOT NULL,
    current_stage_title VARCHAR(255) NOT NULL,
    required_role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending Review', -- 'Pending Review', 'Approved', 'Rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. System Audit Ledger
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(36) REFERENCES members(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    action_description VARCHAR(255) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'danger', 'invite'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
