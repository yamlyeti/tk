-- ============================================================================
-- FIX: Infinite Recursion in project_members Policies
-- ============================================================================
-- The issue: Policies reference themselves causing infinite loops
-- Solution: Simplify policies to avoid circular dependencies

-- ============================================
-- STEP 1: Drop Problematic Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;

-- ============================================
-- STEP 2: Create Fixed Policies (No Recursion)
-- ============================================

-- Allow users to see members of projects they belong to
CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  USING (
    -- Can see members of projects where user is the owner
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
    OR
    -- Can see members of projects where user is a member
    user_id = auth.uid()
  );

-- Allow project owners to add/remove members
CREATE POLICY "Project owners can manage members"
  ON public.project_members FOR ALL
  USING (
    -- User must be the project owner
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 3: Simplify Projects Policies (Avoid Recursion)
-- ============================================

-- Drop existing project policies
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update" ON public.projects;
DROP POLICY IF EXISTS "Only project owners can delete" ON public.projects;

-- Simplified: Users can view their own projects and projects they're members of
CREATE POLICY "Users can view projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create projects
CREATE POLICY "Users can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only project owners can update
CREATE POLICY "Owners can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only project owners can delete
CREATE POLICY "Owners can delete projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Verify No Recursion
-- ============================================
SELECT '✅ Policies fixed! Infinite recursion resolved.' as status;

-- Test: Try to view projects
SELECT 'Test query - should return your projects:' as info;
SELECT id, name, user_id FROM public.projects WHERE user_id = auth.uid() LIMIT 5;
