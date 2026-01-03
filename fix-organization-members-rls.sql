-- Fix RLS for organization_members to avoid infinite recursion
-- Drop existing policies if present and recreate using EXISTS checks against organizations/organization_members

DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;

CREATE POLICY "Organization admins can add members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = ANY (ARRAY['owner'::text,'admin'::text])
  )
  OR is_admin()
);

CREATE POLICY "Organization admins can remove members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = ANY (ARRAY['owner'::text,'admin'::text])
  )
  OR is_admin()
);

CREATE POLICY "Organization admins can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = ANY (ARRAY['owner'::text,'admin'::text])
  )
  OR is_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = ANY (ARRAY['owner'::text,'admin'::text])
  )
  OR is_admin()
);

CREATE POLICY "Users can view organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()
  )
  OR is_admin()
);
