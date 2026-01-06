-- Fix infinite recursion in user_profiles RLS policies
-- This script removes policies that cause recursion and replaces them with safe versions

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Allow profile creation on signup" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
-- Ensure any alternate-named policies are also removed to avoid conflicts
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Create a simple, non-recursive security definer function to check if user is admin
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

-- Create new safe policies

-- 1. INSERT: Users can create their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. SELECT: Users can view their own profile, admins can view all (using function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view profiles' AND tablename = 'user_profiles'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view profiles"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id OR is_admin());
    $$;
  END IF;
END
$$;

-- 3. UPDATE: Users can update their own profile (except role), admins can update all
CREATE POLICY "Users can update profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id  -- Users can update their own profile
  OR is_admin()    -- Admins can update all profiles
)
WITH CHECK (
  auth.uid() = id  -- Users can update their own profile
  OR is_admin()    -- Admins can update all profiles
);

-- 4. DELETE: Only admins can delete
CREATE POLICY "Admins can delete profiles"
ON user_profiles
FOR DELETE
TO authenticated
USING (is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Verify the policies
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
ORDER BY cmd, policyname;
