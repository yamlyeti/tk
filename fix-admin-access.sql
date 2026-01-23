-- ============================================================================
-- FIX ADMIN ACCESS TO USER MANAGEMENT
-- ============================================================================
-- This script diagnoses and fixes admin access issues for viewing all users
-- ============================================================================

-- ============================================
-- STEP 1: DIAGNOSTIC - Check current state
-- ============================================

-- Check if is_admin() function exists
SELECT
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'is_admin';

-- Check your admin user's metadata
SELECT
  id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'is_admin' as is_admin_flag,
  created_at
FROM auth.users
WHERE email = 'proofthat@bergman.rocks';

-- Check your admin user's profile
SELECT
  id,
  email,
  role,
  approval_status,
  is_active
FROM public.user_profiles
WHERE email = 'proofthat@bergman.rocks';

-- Check current RLS policies on user_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Test is_admin() function (run this while logged in as admin)
-- SELECT public.is_admin();

-- ============================================
-- STEP 2: CREATE/UPDATE is_admin() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================
-- STEP 3: SET ADMIN USER METADATA
-- ============================================
-- Replace 'proofthat@bergman.rocks' with your admin email

-- Set is_admin flag in auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'proofthat@bergman.rocks';

-- Update user_profiles to match
UPDATE public.user_profiles
SET
  role = 'admin',
  approval_status = 'approved',
  is_active = true
WHERE email = 'proofthat@bergman.rocks';

-- ============================================
-- STEP 4: FIX RLS POLICIES
-- ============================================

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_admin" ON public.user_profiles;

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- CREATE NEW, CLEAN POLICIES

-- SELECT policies
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_profiles_select_admin"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT policies
CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE policies
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_update_admin"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE policies
CREATE POLICY "user_profiles_delete_admin"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Verify is_admin() function exists
SELECT
  'is_admin() function exists: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as check_result
FROM pg_proc
WHERE proname = 'is_admin';

-- Verify admin user metadata
SELECT
  email,
  raw_user_meta_data->>'is_admin' as is_admin_metadata,
  'Admin metadata: ' || CASE
    WHEN (raw_user_meta_data->>'is_admin')::boolean THEN 'CORRECT'
    ELSE 'MISSING/WRONG'
  END as check_result
FROM auth.users
WHERE email = 'proofthat@bergman.rocks';

-- Verify admin user profile
SELECT
  email,
  role,
  approval_status,
  is_active,
  'Profile status: ' || CASE
    WHEN role = 'admin' AND approval_status = 'approved' AND is_active = true
    THEN 'CORRECT'
    ELSE 'NEEDS FIX'
  END as check_result
FROM public.user_profiles
WHERE email = 'proofthat@bergman.rocks';

-- Verify RLS policies
SELECT
  'RLS Policies count: ' || COUNT(*)::text as check_result
FROM pg_policies
WHERE tablename = 'user_profiles';

-- List all policies
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN policyname LIKE '%admin%' THEN 'ADMIN'
    WHEN policyname LIKE '%own%' THEN 'SELF'
    ELSE 'OTHER'
  END as policy_type
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If you still can't see users after running this:
--
-- 1. Sign out and sign back in (to refresh the JWT token)
--
-- 2. Check if is_admin() returns true:
--    SELECT public.is_admin();
--    (Should return true when logged in as admin)
--
-- 3. Try to query user_profiles directly:
--    SELECT * FROM public.user_profiles;
--    (Should return all users if admin)
--
-- 4. Check browser console for errors
--
-- 5. If using a different admin email, update the WHERE clause
--    in STEP 3 to match your actual admin email
-- ============================================
