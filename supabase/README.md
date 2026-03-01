# Supabase SQL Structure

This folder is organized by purpose so scripts can be run safely and predictably.

## Execution Order (new environment)

1. [001_core_schema.sql](001_core_schema.sql)
   - Core tables, views, analytics functions, and base triggers.
2. [002_security_rls_setup.sql](002_security_rls_setup.sql)
   - RLS policies, grants, auth helpers, role helpers, realtime publication, admin helper functions, signup sync triggers.
3. [003_instructor_requests.sql](003_instructor_requests.sql)
   - Instructor request workflow tables (`duty_change_requests`, `duty_issue_reports`) + RLS.

## Patch Scripts (existing environments)

- [090_rls_hotfixes.sql](090_rls_hotfixes.sql)
   - Combined hotfix bundle for role-claim compatibility and instructor duty ownership/RLS mismatches.

## Seed Policy

- [999_data_policy.sql](999_data_policy.sql) is intentionally data-free.
- Demo data is not shipped.
- Create real records through app workflows or controlled internal scripts.

## Operational Notes

- Most scripts are idempotent (`IF EXISTS` / `IF NOT EXISTS`) and can be re-run.
- Run patch scripts only when the matching issue is observed.
- Always test SQL changes in a staging project first.
