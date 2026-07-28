
# Workspace Rules & Conventions

## Supabase Database Migrations Protocol
- Whenever any feature or bugfix involves a database schema change, table creation, column modification, or new migration script (`supabase/migrations/`), ALWAYS explicitly output a highlighted **🚨 SUPABASE MIGRATION REQUIRED** section in your final response.
- Provide the copy-pasteable SQL snippet and step-by-step instructions for running it in the Supabase SQL Editor.
