-- Fix User Profile Issues
-- Run this in Supabase SQL Editor

-- 1. Check if your profile exists
SELECT id, email, full_name, role, approval_status 
FROM auth.users 
LIMIT 5;

-- 2. Check user_profiles table
SELECT * FROM user_profiles LIMIT 5;

-- 3. Create missing profiles for all auth users
INSERT INTO user_profiles (id, email, full_name, role, approval_status)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  'user' as role,
  'approved' as approval_status
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = au.id
);

-- 4. Make sure all existing users are approved if they weren't before
UPDATE user_profiles
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = 'pending';

-- 5. Verify the fix
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.approval_status,
  up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC;
