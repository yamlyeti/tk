-- ============================================================================
-- ORGANIZATION HIERARCHY MIGRATION
-- ============================================================================
-- This migration adds an organization level above projects
-- 
-- Hierarchy:
-- Organization (e.g., "Ojohsy Org")
--   └─ Projects (e.g., "Jaja Project", "Another Project")
--       └─ Time Entries
--
-- Features:
-- ✅ Create organizations table
-- ✅ Link projects to organizations
-- ✅ Track time by organization and project
-- ✅ Organization member management
-- ✅ RLS policies for organization access
-- ============================================================================

-- ============================================
-- STEP 1: Create Organizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  logo_url text,
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS organizations_created_by_idx ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS organizations_name_idx ON public.organizations(name);

-- ============================================
-- STEP 2: Create Organization Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profiles ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS organization_members_org_id_idx ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);

-- ============================================
-- ENSURE project_members TABLE EXISTS (created here if missing)
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profiles ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);


-- ============================================
-- STEP 3: Add organization_id to Projects
-- ============================================
-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN organization_id uuid REFERENCES public.organizations ON DELETE CASCADE;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS projects_organization_id_idx ON public.projects(organization_id);

-- ============================================
-- STEP 4: RLS Policies for Organizations
-- ============================================

-- Users can view organizations they belong to
DROP POLICY IF EXISTS "Users can view member organizations" ON public.organizations;

CREATE POLICY "Users can view member organizations"
  ON public.organizations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.approval_status = 'approved'
    )
  );

-- Users can create organizations
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  );

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
-- STEP 5: RLS Policies for Organization Members
-- ============================================

-- Users can view members of organizations they belong to
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;

CREATE POLICY "Users can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    (user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.approval_status = 'approved'
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
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.approval_status = 'approved'
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
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.approval_status = 'approved'
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
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.approval_status = 'approved'
    )
  );

-- ============================================
-- STEP 6: Update Projects RLS Policies
-- ============================================

-- Update project view policy to check organization membership
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;

CREATE POLICY "Users can view team projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    ) AND (
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
    )
  );

-- Users can insert projects (linked to their organizations)
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    ) AND (
      organization_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = projects.organization_id 
        AND om.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- STEP 7: Create Auto-Add Organization Creator as Owner Function
-- ============================================
CREATE OR REPLACE FUNCTION public.add_organization_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

-- Create trigger
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_organization_creator_as_owner();

-- ============================================
-- STEP 8: Create View for Organization Time Stats
-- ============================================
CREATE OR REPLACE VIEW public.organization_time_stats AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  p.id as project_id,
  p.name as project_name,
  COUNT(te.id) as entry_count,
  SUM(
    CASE 
      WHEN te.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (te.end_time - te.start_time))
      ELSE 
        EXTRACT(EPOCH FROM (NOW() - te.start_time))
    END
  ) / 3600.0 as total_hours
FROM public.organizations o
LEFT JOIN public.projects p ON p.organization_id = o.id
LEFT JOIN public.time_entries te ON te.project_id = p.id
GROUP BY o.id, o.name, p.id, p.name;

-- ============================================
-- STEP 9: Comments for Documentation
-- ============================================
COMMENT ON TABLE public.organizations IS 
  'Organizations that group multiple projects together';

COMMENT ON TABLE public.organization_members IS 
  'Members and their roles within organizations';

COMMENT ON COLUMN public.projects.organization_id IS 
  'Optional reference to parent organization';

COMMENT ON VIEW public.organization_time_stats IS 
  'Aggregated time tracking statistics by organization and project';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Hierarchy is now:
-- Organization → Projects → Time Entries
-- 
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update frontend to create/manage organizations
-- 3. Update project creation to optionally link to organization
-- 4. Update time tracking reports to show organization hierarchy
-- ============================================================================
