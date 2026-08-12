
# Workspace Rules & Conventions

## Supabase Database Migrations Protocol
- Whenever any feature or bugfix involves a database schema change, table creation, column modification, or new migration script (`supabase/migrations/`), ALWAYS explicitly output a highlighted **🚨 SUPABASE MIGRATION REQUIRED** section in your final response.
- Provide the copy-pasteable SQL snippet and step-by-step instructions for running it in the Supabase SQL Editor.

## End-to-End Schema Validation & Relational Join Protocol
- Whenever new relational tables, columns, or schemas are added or modified in the Admin Console (e.g., `role_permissions`, `member_roles`, `branches`, `organizations`), immediately audit and update all consuming API endpoints across the Recruiter Panel (`frontend/app/api/...` and `backend/main.py`) with corresponding relational join queries.
- Ensure that permission flags, tenant organization IDs, and user metadata are always resolved via relational joins rather than relying on single-table queries or hardcoded frontend logic.
