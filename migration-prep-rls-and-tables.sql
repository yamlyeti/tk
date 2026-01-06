-- PREP: Create essential tables and safe RLS functions/policies to avoid recursion
-- Run this BEFORE other migrations to ensure required tables/functions exist

-- 1) Ensure user_profiles table exists with necessary columns
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active boolean DEFAULT true,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','denied')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2) Create non-recursive is_admin() helper (security definer)
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
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2b) Helpers to check organization/project membership without causing RLS recursion
-- These SECURITY DEFINER functions run with definer rights and therefore do not trigger
-- RLS checks on the tables they query.
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role = ANY (ARRAY['owner'::text,'admin'::text])
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = ANY (ARRAY['owner'::text,'admin'::text])
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_project_admin(uuid) TO authenticated;

-- 3) Replace user_profiles policies with safe, non-recursive versions
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage users" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;
CREATE POLICY "Users can view profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR is_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR is_admin()
  );

CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- 4) Ensure project_members table exists (prevents relation not found)
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profiles ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 5) Non-recursive policies for project_members (using SECURITY DEFINER helpers)
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;

CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (is_project_member(project_id) OR is_admin());

CREATE POLICY "Project owners can manage members"
  ON public.project_members FOR ALL
  TO authenticated
  USING (is_project_admin(project_id) OR is_admin());

CREATE POLICY "Users can view own memberships"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 6) Indexes to speed up checks
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);

-- End of migration-prep
SELECT '✅ migration-prep-rls-and-tables.sql ready - run this before other migrations' as status;
