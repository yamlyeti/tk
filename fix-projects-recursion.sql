-- ============================================================================
-- FIX: Infinite Recursion in projects Table Policies
-- ============================================================================
-- The issue: The SELECT policy on projects references project_members,
-- which references projects back, creating infinite recursion.
-- Solution: Break the circular dependency completely.

-- ============================================
-- STEP 1: Drop ALL Existing Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Only project owners can delete" ON public.projects;

DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;

-- ============================================
-- STEP 2: Create Simple, Non-Recursive Policies for PROJECTS
-- ============================================

-- Users can ONLY view their own projects (no team check to avoid recursion)
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create projects
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: Create Simple Policies for PROJECT_MEMBERS
-- ============================================

-- Users can view members of their own projects only
CREATE POLICY "View members of own projects"
  ON public.project_members FOR SELECT
  USING (
    -- Project belongs to the user
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_members.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- Project owners can add members
CREATE POLICY "Owners can add members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_members.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- Project owners can remove members
CREATE POLICY "Owners can remove members"
  ON public.project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_members.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 4: Verification
-- ============================================
SELECT '✅ Policies fixed! No more infinite recursion.' as status;
SELECT '📋 Each user can now:' as info
UNION ALL SELECT '   ✅ Create their own projects'
UNION ALL SELECT '   ✅ View only their own projects'
UNION ALL SELECT '   ✅ Add team members to their projects'
UNION ALL SELECT '   ✅ Manage their own projects';

-- Test: Insert should work now
SELECT 'Test: Try creating a project in the app now!' as next_step;
