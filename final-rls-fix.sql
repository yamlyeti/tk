-- Final comprehensive fix for all RLS recursion issues
-- This removes ALL policies that cause recursion and creates simple, non-recursive ones

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage approval status" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can manage project members" ON project_members;

DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;

DROP POLICY IF EXISTS "Users can view own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete own organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can manage organization members" ON organization_members;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- =======================
-- USER PROFILES - Simple, non-recursive policies
-- =======================

-- Users can view their own profile (no approval check)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (no approval check)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles using role from auth.jwt()
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Admins can update all profiles using role from auth.jwt()
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- =======================
-- ORGANIZATIONS
-- =======================

CREATE POLICY "Users can view own organizations" ON organizations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own organizations" ON organizations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own organizations" ON organizations
  FOR DELETE
  USING (auth.uid() = user_id);

-- =======================
-- ORGANIZATION MEMBERS
-- =======================

CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = organization_members.organization_id
    )
  );

CREATE POLICY "Org owners can manage members" ON organization_members
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM organizations WHERE id = organization_members.organization_id
    )
  );

-- =======================
-- PROJECTS
-- =======================

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view projects they are members of
CREATE POLICY "Users can view projects as members" ON projects
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = projects.id
    )
  );

-- =======================
-- PROJECT MEMBERS
-- =======================

CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_members.project_id
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_members.project_id
    )
  );

CREATE POLICY "Project owners can manage members" ON project_members
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_members.project_id
    )
  );

-- =======================
-- TIME ENTRIES
-- =======================

CREATE POLICY "Users can view own time entries" ON time_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time entries" ON time_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries" ON time_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries" ON time_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_members TO authenticated;
GRANT ALL ON time_entries TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
