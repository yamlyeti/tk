-- ============================================================================
-- ADD ADMIN POLICIES FOR PROJECT ASSIGNMENT
-- ============================================================================
-- This allows admins to assign any project to any user
-- while keeping regular users restricted to their own projects

-- ============================================
-- STEP 1: Add Admin Policies for Projects
-- ============================================

-- Admins can view ALL projects
CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STEP 2: Add Admin Policies for Project Members
-- ============================================

-- Admins can view all project members
CREATE POLICY "Admins can view all members"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can add members to any project
CREATE POLICY "Admins can assign members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can remove members from any project
CREATE POLICY "Admins can remove members"
  ON public.project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update member roles
CREATE POLICY "Admins can update members"
  ON public.project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STEP 3: Verification
-- ============================================
SELECT '✅ Admin policies added!' as status;
SELECT '📋 Admins can now:' as info
UNION ALL SELECT '   ✅ View all projects'
UNION ALL SELECT '   ✅ Assign projects to users'
UNION ALL SELECT '   ✅ Remove project assignments'
UNION ALL SELECT '   ✅ Manage team members';

-- Check policies
SELECT 'Current policies on project_members:' as check;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'project_members';
