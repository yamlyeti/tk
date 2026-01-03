-- Fix organization_members RLS policies to avoid infinite recursion
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON organization_members;

-- Create non-recursive policies
-- Users can view members of organizations they belong to
CREATE POLICY "Users can view organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR is_admin()
);

-- Organization creators can add members
CREATE POLICY "Organization admins can add members"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
    OR is_admin()
);

-- Organization creators can update members
CREATE POLICY "Organization admins can update members"
ON organization_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
    OR is_admin()
);

-- Organization creators can remove members
CREATE POLICY "Organization admins can remove members"
ON organization_members
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
    OR is_admin()
);
