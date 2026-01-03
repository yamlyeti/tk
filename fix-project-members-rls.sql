-- Fix RLS for project_members to avoid infinite recursion
-- Drop existing policies if present and recreate using EXISTS checks against projects/project_members

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;

CREATE POLICY "Project owners can manage members"
ON public.project_members
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = ANY (ARRAY['owner'::text,'admin'::text])
  )
  OR is_admin()
);

CREATE POLICY "Users can view own memberships"
ON public.project_members
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can view project members"
ON public.project_members
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
  )
  OR is_admin()
);
