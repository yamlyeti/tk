-- ============================================================================
-- ROBUST COMPLETE DATABASE SETUP FOR TIME KEEPING SYSTEM
-- ============================================================================
-- This script sets up EVERYTHING from scratch with all features
-- Run this ENTIRE file in your Supabase SQL Editor
-- 
-- Features included:
-- ✅ Time Entries with Pause/Resume
-- ✅ Projects with Tags, Description, GitHub Links
-- ✅ Multi-User System with Profiles
-- ✅ Team Collaboration on Projects
-- ✅ Row Level Security (RLS) Policies
-- ✅ Auto-Triggers for User Profiles and Project Ownership
-- ✅ Performance Indexes
-- ============================================================================

-- ============================================
-- STEP 1: Clean up existing tables (OPTIONAL)
-- ============================================
-- UNCOMMENT the lines below ONLY if you want to delete all existing data
-- DROP TABLE IF EXISTS public.time_entries CASCADE;
-- DROP TABLE IF EXISTS public.project_members CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- DROP FUNCTION IF EXISTS public.add_project_creator_as_owner() CASCADE;

-- ============================================
-- STEP 2: Create User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create policies
CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 3: Create Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  tags text,
  description text,
  github_link text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Only project owners can delete" ON public.projects;

-- Create policies for projects (support team collaboration)
CREATE POLICY "Users can view team projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can update"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only project owners can delete"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Create Project Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profiles ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.project_members;

-- Create policies
CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view own memberships"
  ON public.project_members FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 5: Create Time Entries Table (with Pause Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES public.projects ON DELETE SET NULL,
  description text NOT NULL,
  tags text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  duration integer,
  paused_duration integer DEFAULT 0,
  is_paused boolean DEFAULT false,
  pause_start_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for time_entries
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view team entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON public.time_entries;

-- Create policies for time_entries (support team access)
CREATE POLICY "Users can view team entries"
  ON public.time_entries FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = time_entries.project_id 
      AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: Create Indexes for Better Performance
-- ============================================
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_start_time_idx ON public.time_entries(start_time DESC);
CREATE INDEX IF NOT EXISTS time_entries_project_id_idx ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);

-- ============================================
-- STEP 7: Create Auto-Profile Creation Function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 8: Create Auto-Add Project Creator as Owner Function
-- ============================================
CREATE OR REPLACE FUNCTION public.add_project_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Continue even if project_members insert fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_project_created ON public.projects;

-- Create trigger
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_project_creator_as_owner();

-- ============================================
-- STEP 9: Backfill User Profiles for Existing Users
-- ============================================
INSERT INTO public.user_profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 10: Backfill Project Owners for Existing Projects
-- ============================================
INSERT INTO public.project_members (project_id, user_id, role)
SELECT 
  p.id,
  p.user_id,
  'owner'
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_members pm 
  WHERE pm.project_id = p.id AND pm.user_id = p.user_id
)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================
-- STEP 11: Verification Queries
-- ============================================
-- Check tables exist
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as row_count
FROM public.user_profiles
UNION ALL
SELECT 
  'projects',
  COUNT(*)
FROM public.projects
UNION ALL
SELECT 
  'project_members',
  COUNT(*)
FROM public.project_members
UNION ALL
SELECT 
  'time_entries',
  COUNT(*)
FROM public.time_entries;

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'projects', 'project_members', 'time_entries')
ORDER BY tablename;

-- Check policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
OR event_object_table IN ('users')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅✅✅ ROBUST DATABASE SETUP COMPLETE! ✅✅✅' as status
UNION ALL
SELECT '📊 Tables Created: user_profiles, projects, project_members, time_entries' as info
UNION ALL
SELECT '🔒 Row Level Security (RLS) enabled on all tables' as info
UNION ALL
SELECT '👥 Multi-user and team collaboration features enabled' as info
UNION ALL
SELECT '⏸️  Pause/Resume feature included in time_entries' as info
UNION ALL
SELECT '🏷️  Tags, descriptions, and GitHub links enabled for projects' as info
UNION ALL
SELECT '⚡ Performance indexes created' as info
UNION ALL
SELECT '🔄 Auto-triggers configured for user profiles and project ownership' as info
UNION ALL
SELECT '✨ You are ready to use the Time Keeping System!' as info;
