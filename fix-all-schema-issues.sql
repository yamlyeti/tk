-- Fix all schema and RLS issues
-- Run this in Supabase SQL Editor

-- 1. Drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON public.time_entries;

DROP POLICY IF EXISTS "Users can view own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can manage own organizations" ON public.organizations;

DROP POLICY IF EXISTS "Users can view own organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- 2. Add missing columns if they don't exist
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied'));

ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

ALTER TABLE public.time_entries 
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Add organization_id to projects if it doesn't exist
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Create simple, non-recursive RLS policies for user_profiles
CREATE POLICY "Anyone can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Anyone can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can do anything"
  ON public.user_profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 5. Create simple RLS policies for projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create simple RLS policies for time_entries
CREATE POLICY "Users can view own entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create simple RLS policies for organizations
CREATE POLICY "Users can view organizations they created"
  ON public.organizations FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can manage organizations they created"
  ON public.organizations FOR ALL
  USING (auth.uid() = created_by);

-- 8. Create simple RLS policies for organization_members
CREATE POLICY "Users can view their own memberships"
  ON public.organization_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org creators can manage members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

-- 9. Create a helper function to check if user is admin (without recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check directly in auth.users metadata or use a simple flag
  -- This avoids the recursion issue
  RETURN (
    SELECT COALESCE(
      (raw_user_meta_data->>'is_admin')::boolean,
      false
    )
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add admin policies that use the helper function
CREATE POLICY "Admins can view all user profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage all user profiles"
  ON public.user_profiles FOR ALL
  USING (public.is_admin());

-- 11. Ensure first user is admin
-- Update your user to be admin by running this with your user ID:
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
-- WHERE email = 'your-email@example.com';

-- Also update user_profiles
-- UPDATE public.user_profiles
-- SET role = 'admin', approval_status = 'approved'
-- WHERE email = 'your-email@example.com';

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is admin without causing RLS recursion';
