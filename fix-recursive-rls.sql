-- Fix recursive RLS by using SECURITY DEFINER helper functions and recreating policies
-- Run: psql -h <host> -U <user> -d <db> -f fix-recursive-rls.sql

-- Create helper functions (idempotent)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND approval_status = 'approved'
  );
$$;

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

CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin(project_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_id AND user_id = auth.uid() AND role = ANY (ARRAY['owner'::text,'admin'::text])
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(uuid) TO authenticated;

-- Recreate organizations policies to use helpers (drop & create)
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;

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

CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_org_member(id)
    OR is_admin()
  );

-- Recreate projects policies that reference membership (drop & create)
DROP POLICY IF EXISTS "Users can view projects they belong to" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;

CREATE POLICY "Users can view projects they belong to"
  ON public.projects
  FOR SELECT
  TO public
  USING (
    auth.uid() = user_id
    OR is_project_member(id)
    OR is_admin()
  );

-- Also ensure project_members/select policies are safe (use is_project_admin/is_project_member where appropriate)
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;

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

-- Recreate organization_members policies similarly
DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;

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
  USING (auth.uid() = user_id OR is_org_member(organization_id) OR is_admin());

SELECT '✅ fix-recursive-rls.sql finished';
