-- ============================================================================
-- CLEANUP INCOMPLETE SIGNUPS
-- ============================================================================
-- This script handles users in auth.users who don't have proper user_profiles
-- entries due to incomplete signup processes or trigger failures
-- ============================================================================

-- ============================================
-- STEP 1: DIAGNOSTIC - See what needs cleanup
-- ============================================
-- Run this first to see which users have issues

-- Check for users in auth.users WITHOUT user_profiles
SELECT
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  au.raw_user_meta_data,
  'Missing user_profile' as issue
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;

-- Check for user_profiles WITHOUT proper approval_status
SELECT
  up.id,
  up.email,
  up.approval_status,
  up.is_active,
  up.created_at,
  'Missing or NULL approval_status' as issue
FROM public.user_profiles up
WHERE up.approval_status IS NULL
ORDER BY up.created_at DESC;

-- ============================================
-- STEP 2: OPTION A - CREATE MISSING PROFILES
-- ============================================
-- Use this if you want to keep the auth.users and create their profiles
-- This will create user_profiles for any auth.users that are missing them

INSERT INTO public.user_profiles (id, email, full_name, approval_status, is_active)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  'pending' as approval_status,  -- Set to pending for admin review
  false as is_active             -- Inactive until approved
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update any existing profiles that have NULL approval_status
UPDATE public.user_profiles
SET
  approval_status = 'pending',
  is_active = false
WHERE approval_status IS NULL;

-- ============================================
-- STEP 3: OPTION B - DELETE INCOMPLETE USERS
-- ============================================
-- Use this if you want to completely remove incomplete signups
-- WARNING: This permanently deletes the users from auth.users
-- They will need to sign up again

-- First, see which users will be deleted:
SELECT
  au.id,
  au.email,
  au.created_at,
  'Will be DELETED' as action
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Uncomment the lines below to actually delete them:
-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT au.id
--   FROM auth.users au
--   LEFT JOIN public.user_profiles up ON au.id = up.id
--   WHERE up.id IS NULL
-- );

-- ============================================
-- STEP 4: VERIFICATION
-- ============================================
-- Run these queries after cleanup to verify everything is fixed

-- Check all users and their profiles
SELECT
  au.id,
  au.email as auth_email,
  au.email_confirmed_at,
  up.email as profile_email,
  up.approval_status,
  up.is_active,
  up.role,
  CASE
    WHEN up.id IS NULL THEN 'MISSING PROFILE'
    WHEN up.approval_status IS NULL THEN 'MISSING APPROVAL STATUS'
    WHEN up.approval_status = 'pending' THEN 'PENDING APPROVAL'
    WHEN up.approval_status = 'approved' THEN 'APPROVED'
    WHEN up.approval_status = 'denied' THEN 'DENIED'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- Count by approval status
SELECT
  COALESCE(up.approval_status, 'NO_PROFILE') as status,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
GROUP BY up.approval_status;

-- ============================================
-- RECOMMENDED APPROACH
-- ============================================
-- For your specific case with 2 incomplete users, I recommend:
--
-- 1. Run STEP 1 (Diagnostic) to see the users
-- 2. If they are test/invalid users:
--    - Use OPTION B (delete them completely)
-- 3. If they are real users who should have access:
--    - Use OPTION A (create profiles and set to pending)
--    - Then approve them via the Approvals UI or with:
--      UPDATE public.user_profiles
--      SET approval_status = 'approved', is_active = true
--      WHERE email = 'user@example.com';
-- ============================================
