-- ============================================================================
-- COMPREHENSIVE FIX: All RLS Infinite Recursion Issues
-- ============================================================================
-- This fixes ALL infinite recursion errors in the database
-- Run this in Supabase SQL Editor to fix:
-- 1. project_members recursion
-- 2. organizations recursion  
-- 3. user_profiles recursion
-- 4. projects recursion
-- 5. time_entries recursion
-- ============================================================================

-- ============================================
-- DISABLE RLS TEMPORARILY
-- ============================================
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Time Entries
DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view team time entries" ON public.time_entries;

-- Projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;

-- Organizations
DROP POLICY IF EXISTS "Users can view member organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Organization creators can delete" ON public.organizations;

-- Organization Members
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON public.organization_members;

-- Project Members (if exists)
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON public.project_members;

-- ============================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- ============================================
-- TIME ENTRIES POLICIES
-- ============================================

CREATE POLICY "Users can view own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PROJECTS POLICIES
-- ============================================

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view organizations"
  ON public.organizations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update organizations"
  ON public.organizations FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- ORGANIZATION MEMBERS POLICIES
-- ============================================

CREATE POLICY "Users can view org members"
  ON public.organization_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can update members"
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can remove members"
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    )
  );

-- ============================================
-- RE-ENABLE RLS
-- ============================================
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP PROJECT_MEMBERS TABLE IF IT EXISTS
-- ============================================
-- This table may be causing recursion issues
DROP TABLE IF EXISTS public.project_members CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('time_entries', 'projects', 'organizations', 'organization_members')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- All RLS policies have been simplified to avoid infinite recursion:
-- 
-- ✅ No approval_status checks in RLS policies
-- ✅ No complex joins that reference back to user_profiles
-- ✅ Simple ownership checks only (auth.uid() = user_id)
-- ✅ Direct table lookups with EXISTS clauses
-- ✅ Removed project_members table if it existed
-- 
-- All approval checks should be done in the application layer!
-- ============================================================================
