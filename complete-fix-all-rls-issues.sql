-- Complete fix for all RLS policy recursion issues
-- Run this script to fix infinite recursion errors

-- Drop all problematic policies that cause recursion
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;

-- Drop project policies that check user_profiles
DROP POLICY IF EXISTS "Only project owners can delete" ON projects;
DROP POLICY IF EXISTS "Project owners can update" ON projects;

-- Drop time entry policies that check user_profiles
DROP POLICY IF EXISTS "Users can insert own entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON time_entries;

-- Recreate organizations policies WITHOUT recursion
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Organization owners can update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR is_admin()
  );

CREATE POLICY "Organization owners can delete"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR is_admin()
  );

-- Recreate organization_members policies WITHOUT recursion
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Organization admins can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Organization admins can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Organization admins can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

-- Recreate project policies WITHOUT checking user_profiles.approval_status
CREATE POLICY "Project owners can update"
  ON projects FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only project owners can delete"
  ON projects FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Recreate time entry policies WITHOUT checking user_profiles.approval_status
CREATE POLICY "Users can insert own entries"
  ON time_entries FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON time_entries FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON time_entries FOR DELETE
  TO public
  USING (auth.uid() = user_id);
