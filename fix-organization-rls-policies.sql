-- ============================================================================
-- FIX: Organization RLS Policies - Remove Infinite Recursion
-- ============================================================================
-- This fixes the infinite recursion error when creating organizations
-- The issue: Policies that check user_profiles.approval_status create
-- circular dependencies when checking user_profiles itself
-- ============================================================================

-- ============================================
-- Fix Organizations Policies
-- ============================================

-- Users can view organizations they belong to (simplified, no approval check)
DROP POLICY IF EXISTS "Users can view member organizations" ON public.organizations;

CREATE POLICY "Users can view member organizations"
  ON public.organizations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id AND om.user_id = auth.uid()
    )
  );

-- Users can create organizations (simplified, no approval check in policy)
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Organization owners and admins can update
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;

CREATE POLICY "Organization owners can update"
  ON public.organizations FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Only organization creators can delete
DROP POLICY IF EXISTS "Organization creators can delete" ON public.organizations;

CREATE POLICY "Organization creators can delete"
  ON public.organizations FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- Fix Organization Members Policies
-- ============================================

-- Users can view members of organizations they belong to (simplified)
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;

CREATE POLICY "Users can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
    )
  );

-- Organization owners and admins can add members
DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;

CREATE POLICY "Organization admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Organization owners and admins can update members
DROP POLICY IF EXISTS "Organization admins can update members" ON public.organization_members;

CREATE POLICY "Organization admins can update members"
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Organization owners and admins can remove members
DROP POLICY IF EXISTS "Organization admins can remove members" ON public.organization_members;

CREATE POLICY "Organization admins can remove members"
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- Fix Projects Policies (if needed)
-- ============================================

-- Update project view policy (simplified)
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;

CREATE POLICY "Users can view team projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id 
      AND om.user_id = auth.uid()
    )
  );

-- Users can insert projects (simplified)
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      organization_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = projects.organization_id 
        AND om.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Removed all approval_status checks that caused infinite recursion
-- 
-- The approval checks should be done in the application layer, not RLS
-- RLS policies now only check:
-- - User authentication (auth.uid())
-- - Membership in organizations
-- - Ownership relationships
-- 
-- Application layer should verify user approval_status before showing
-- organization management features
-- ============================================================================
