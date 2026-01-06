-- fix-all-database-issues.sql
-- Consolidated script to fix all RLS recursion and database issues
-- Safe to run multiple times (idempotent)
-- Run with: psql -h <host> -p <port> -d <db> -U <user> -f fix-all-database-issues.sql

BEGIN;

-- ============================================================================
-- SECTION 0: Drop ALL policies first (they depend on functions)
-- ============================================================================

-- user_profiles policies
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

-- organizations policies
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON public.organizations;

-- organization_members policies
DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own org memberships" ON public.organization_members;

-- projects policies
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they belong to" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Only project owners can delete" ON public.projects;

-- project_members policies
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;

-- time_entries policies
DROP POLICY IF EXISTS "Users can insert own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON public.time_entries;

-- ============================================================================
-- SECTION 1: Drop and recreate SECURITY DEFINER helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_org_member(uuid);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_admin(uuid);

-- is_admin: Check if current user is admin via auth.users metadata (not user_profiles to avoid RLS)
CREATE FUNCTION public.is_admin()
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

-- is_org_member: Check if user is member of an organization
CREATE FUNCTION public.is_org_member(org_id uuid)
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

-- is_org_admin: Check if user is admin/owner of an organization
CREATE FUNCTION public.is_org_admin(org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = ANY (ARRAY['owner'::text, 'admin'::text])
  );
$$;

-- is_project_member: Check if user is member of a project (p_project_id to avoid column name shadowing)
CREATE FUNCTION public.is_project_member(p_project_id uuid)
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

-- is_project_admin: Check if user is admin/owner of a project
CREATE FUNCTION public.is_project_admin(p_project_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role = ANY (ARRAY['owner'::text, 'admin'::text])
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(uuid) TO authenticated;

-- ============================================================================
-- SECTION 2: Recreate user_profiles RLS policies
-- ============================================================================

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- SECTION 3: Recreate organizations RLS policies
-- ============================================================================

CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_org_member(id)
    OR is_admin()
  );

CREATE POLICY "Organization owners can update"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_org_admin(id)
    OR is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_org_admin(id)
    OR is_admin()
  );

CREATE POLICY "Organization owners can delete"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_org_admin(id)
    OR is_admin()
  );

-- ============================================================================
-- SECTION 4: Recreate organization_members RLS policies
-- ============================================================================

CREATE POLICY "Organization admins can add members"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(organization_id) OR is_admin());

CREATE POLICY "Organization admins can remove members"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (is_org_admin(organization_id) OR is_admin());

CREATE POLICY "Organization admins can update members"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(organization_id) OR is_admin())
  WITH CHECK (is_org_admin(organization_id) OR is_admin());

CREATE POLICY "Users can view organization members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_org_member(organization_id)
    OR is_admin()
  );

-- ============================================================================
-- SECTION 5: Recreate projects RLS policies
-- ============================================================================

CREATE POLICY "Users can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view projects they belong to"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_project_member(id)
    OR (organization_id IS NOT NULL AND is_org_member(organization_id))
    OR is_admin()
  );

CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND is_org_admin(organization_id))
    OR is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND is_org_admin(organization_id))
    OR is_admin()
  );

CREATE POLICY "Only project owners can delete"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================================
-- SECTION 6: Recreate project_members RLS policies (using helpers to avoid recursion)
-- ============================================================================

CREATE POLICY "Project owners can manage members"
  ON public.project_members
  FOR ALL
  TO authenticated
  USING (is_project_admin(project_id) OR is_admin());

CREATE POLICY "Users can view project members"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (is_project_member(project_id) OR is_admin());

CREATE POLICY "Users can view own memberships"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 7: Recreate time_entries RLS policies
-- ============================================================================

CREATE POLICY "Users can insert own time entries"
  ON public.time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own time entries"
  ON public.time_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own time entries"
  ON public.time_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own time entries"
  ON public.time_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

COMMIT;

SELECT '===== fix-all-database-issues.sql completed successfully =====' as status;
