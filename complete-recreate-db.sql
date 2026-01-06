-- complete-recreate-db.sql
-- Idempotent script to drop and recreate core schema, helper functions, and RLS policies.
-- Run with: psql -h <host> -p <port> -d <db> -U <user> -f complete-recreate-db.sql

BEGIN;

-- Drop all core tables (cascade to remove dependent policies/functions)
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Ensure uuid generator available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- organization_members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  added_at timestamptz DEFAULT now()
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  added_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- time_entries
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  start_time timestamptz,
  end_time timestamptz,
  duration interval,
  tags text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- indexes
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);

-- Helper/security functions (STABLE, SECURITY DEFINER) -- use auth.uid() and JWT claims from PostgREST/Supabase
-- Note: is_admin() uses auth.users metadata to avoid RLS recursion on user_profiles
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = $1 AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = $1
      AND om.user_id = auth.uid()
      AND om.role = ANY (ARRAY['owner'::text, 'admin'::text])
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = $1 AND pm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = $1 AND pm.user_id = auth.uid() AND pm.role = ANY (ARRAY['owner'::text, 'admin'::text])
  );
$$;

-- Grant execute to authenticated role so policies can call helpers
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(uuid) TO authenticated;

-- RLS policies: user_profiles
CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can view profiles" ON public.user_profiles FOR SELECT TO authenticated USING ((auth.uid() = id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Users can update profiles" ON public.user_profiles FOR UPDATE TO authenticated USING ((auth.uid() = id) OR public.is_admin()) WITH CHECK ((auth.uid() = id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Admins can delete profiles" ON public.user_profiles FOR DELETE TO authenticated USING (public.is_admin());

-- RLS policies: organizations
CREATE POLICY IF NOT EXISTS "Users can create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view organizations they belong to" ON public.organizations FOR SELECT TO authenticated USING ((created_by = auth.uid()) OR public.is_org_member(id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Organization owners can update" ON public.organizations FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR public.is_org_admin(id) OR public.is_admin()) WITH CHECK ((created_by = auth.uid()) OR public.is_org_admin(id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Organization owners can delete" ON public.organizations FOR DELETE TO authenticated USING ((created_by = auth.uid()) OR public.is_org_admin(id) OR public.is_admin());

-- RLS policies: organization_members
CREATE POLICY IF NOT EXISTS "Organization admins can add members" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Organization admins can remove members" ON public.organization_members FOR DELETE TO authenticated USING (public.is_org_admin(organization_id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Organization admins can update members" ON public.organization_members FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id) OR public.is_admin()) WITH CHECK (public.is_org_admin(organization_id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Users can view organization members" ON public.organization_members FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR public.is_org_member(organization_id) OR public.is_admin());

-- RLS policies: projects
CREATE POLICY IF NOT EXISTS "Users can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can view projects they belong to" ON public.projects FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR public.is_project_member(id) OR public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Users can update own projects" ON public.projects FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_org_admin(organization_id) OR public.is_admin()) WITH CHECK ((auth.uid() = user_id) OR public.is_org_admin(organization_id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Only project owners can delete" ON public.projects FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- RLS policies: project_members (using helper functions to avoid recursion)
CREATE POLICY IF NOT EXISTS "Project owners can manage members" ON public.project_members FOR ALL TO authenticated USING (public.is_project_admin(project_id) OR public.is_admin()) WITH CHECK (public.is_project_admin(project_id) OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Users can view own memberships" ON public.project_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can view project members" ON public.project_members FOR SELECT TO authenticated USING (public.is_project_member(project_id) OR public.is_admin());

-- RLS policies: time_entries
CREATE POLICY IF NOT EXISTS "Users can insert own time entries" ON public.time_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can view own time entries" ON public.time_entries FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Users can update own time entries" ON public.time_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY IF NOT EXISTS "Users can delete own time entries" ON public.time_entries FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

COMMIT;

-- === SEED / USAGE NOTES ===
-- After running the script, add your admin (replace <UUID> and email):
-- INSERT INTO public.user_profiles (id, email, full_name, role, is_active, approval_status) VALUES ('a6cc9e05-96a2-4534-9c97-419de3f3e834', 'proofthat@bergman.rocks', 'Your Name', 'admin', true, 'approved');
-- You can then create organizations, projects and add members via the REST API or psql.
