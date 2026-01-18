-- Diagnostic and Fix Script for Missing Project Members
-- This script identifies and fixes project members that don't show up due to missing user_profiles

-- ============================================================================
-- STEP 1: Diagnose the issue
-- ============================================================================

-- Check for project_members without corresponding user_profiles
SELECT
  pm.id as membership_id,
  pm.user_id,
  pm.project_id,
  pm.role,
  pm.added_at,
  CASE
    WHEN up.id IS NULL THEN 'MISSING user_profiles entry'
    WHEN au.id IS NULL THEN 'MISSING auth.users entry'
    ELSE 'OK'
  END as status,
  au.email as auth_email,
  up.email as profile_email
FROM project_members pm
LEFT JOIN user_profiles up ON up.id = pm.user_id
LEFT JOIN auth.users au ON au.id = pm.user_id
WHERE up.id IS NULL OR au.id IS NULL
ORDER BY pm.added_at DESC;

-- ============================================================================
-- STEP 2: Check if user_profiles table exists and has required columns
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 3: Fix - Create missing user_profiles entries
-- ============================================================================

-- This will create user_profiles entries for any project members that are missing them
-- It uses data from auth.users to populate the profile

INSERT INTO user_profiles (id, email, full_name, is_active, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM project_members pm
JOIN auth.users au ON au.id = pm.user_id
LEFT JOIN user_profiles up ON up.id = pm.user_id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 4: Verify the fix
-- ============================================================================

-- This should now return 0 rows if everything is fixed
SELECT
  pm.id as membership_id,
  pm.user_id,
  pm.role,
  up.email,
  up.full_name
FROM project_members pm
LEFT JOIN user_profiles up ON up.id = pm.user_id
WHERE up.id IS NULL;

-- ============================================================================
-- STEP 5: Show all project members with their profiles
-- ============================================================================

-- This query matches what the app uses - if it returns results, the app should show them
SELECT
  pm.id,
  pm.user_id,
  pm.project_id,
  pm.role,
  pm.added_at,
  up.email,
  up.full_name,
  up.is_active
FROM project_members pm
JOIN user_profiles up ON up.id = pm.user_id
ORDER BY pm.added_at DESC;

-- ============================================================================
-- Alternative Fix: If user_profiles doesn't exist, update the component
-- ============================================================================

-- If user_profiles table doesn't exist in your schema, you can query auth.users directly
-- Run this to check what's in auth.users:

SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
