-- Complete Database Setup Script for Time Keeping System
-- This script will set up EVERYTHING from scratch
-- Run this ENTIRE file in your Supabase SQL Editor

-- ============================================
-- STEP 1: Clean up existing tables (OPTIONAL - only if you want to start fresh)
-- ============================================
-- UNCOMMENT the lines below ONLY if you want to delete all existing data and start over
-- DROP TABLE IF EXISTS public.time_entries CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;

-- ============================================
-- STEP 2: Create Projects Table
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

-- Drop existing policies (in case they exist)
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Create policies for projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: Create Time Entries Table
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
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for time_entries
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (in case they exist)
DROP POLICY IF EXISTS "Users can view own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON public.time_entries;

-- Create policies for time_entries
CREATE POLICY "Users can view own entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

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
-- STEP 4: Create Indexes for Better Performance
-- ============================================
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_start_time_idx ON public.time_entries(start_time DESC);
CREATE INDEX IF NOT EXISTS time_entries_project_id_idx ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);

-- ============================================
-- STEP 5: Verify Setup
-- ============================================
-- Check projects table structure
SELECT 'Projects Table Structure:' as info;
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- Check time_entries table structure
SELECT 'Time Entries Table Structure:' as info;
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries'
ORDER BY ordinal_position;

-- Check policies
SELECT 'Projects Policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'projects';

SELECT 'Time Entries Policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'time_entries';

-- Success message
SELECT '✅ Database setup complete! All tables, policies, and indexes created successfully.' as status;
