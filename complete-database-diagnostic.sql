-- Complete Database Diagnostic and Fix Script
-- This will show what exists and create what's missing

-- =====================================================
-- STEP 1: Show current table structure
-- =====================================================

\echo '=== CHECKING user_profiles TABLE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

\echo '=== CHECKING projects TABLE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

\echo '=== CHECKING organizations TABLE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

\echo '=== CHECKING time_entries TABLE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries'
ORDER BY ordinal_position;

\echo '=== CHECKING project_members TABLE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

\echo '=== CHECKING organization_members TABLE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 2: Check existing RLS policies
-- =====================================================

\echo '=== CURRENT RLS POLICIES ==='
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 3: Check user data
-- =====================================================

\echo '=== CURRENT USERS ==='
SELECT id, email, role, approval_status, created_at
FROM user_profiles
ORDER BY created_at;

\echo '=== CURRENT PROJECTS ==='
SELECT id, name, created_at
FROM projects
ORDER BY created_at;

\echo '=== CURRENT ORGANIZATIONS ==='
SELECT id, name, created_at
FROM organizations
ORDER BY created_at;
