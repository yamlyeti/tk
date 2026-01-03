-- Fix organization_members and project_members RLS to use security-definer helpers
-- Idempotent: safe to run multiple times

BEGIN;

-- Organization members policies
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

-- Project members policies
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

COMMIT;

SELECT '✅ fix-organization-and-project-members-rls-apply.sql applied';
