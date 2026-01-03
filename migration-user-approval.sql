-- ============================================================================
-- USER APPROVAL FEATURE MIGRATION
-- ============================================================================
-- This migration adds admin approval requirement for new user registrations
-- 
-- Features:
-- ✅ Add approval_status field to user_profiles
-- ✅ Update trigger to set new users as 'pending'
-- ✅ Add policies for admins to manage approvals
-- ✅ Update RLS policies to block pending/denied users
-- ============================================================================

-- ============================================
-- STEP 1: Add approval_status column
-- ============================================
-- Add new column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN approval_status text DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'denied'));
  END IF;
END $$;

-- Set existing users to approved (backward compatibility)
UPDATE public.user_profiles 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- ============================================
-- STEP 2: Update handle_new_user function
-- ============================================
-- Update the trigger function to set new users as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending'  -- New users start as pending
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Update RLS Policies for Projects
-- ============================================
-- Only approved and active users can access projects
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
      )
    )
  );

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
    )
  );

DROP POLICY IF EXISTS "Project owners can update" ON public.projects;

CREATE POLICY "Project owners can update"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  )
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only project owners can delete" ON public.projects;

CREATE POLICY "Only project owners can delete"
  ON public.projects FOR DELETE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  );

-- ============================================
-- STEP 4: Update RLS Policies for Time Entries
-- ============================================
DROP POLICY IF EXISTS "Users can view own entries" ON public.time_entries;

CREATE POLICY "Users can view own entries"
  ON public.time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    ) AND (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = time_entries.project_id AND p.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = time_entries.project_id 
        AND pm.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own entries" ON public.time_entries;

CREATE POLICY "Users can insert own entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;

CREATE POLICY "Users can update own entries"
  ON public.time_entries FOR UPDATE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  )
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON public.time_entries;

CREATE POLICY "Users can delete own entries"
  ON public.time_entries FOR DELETE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  );

-- ============================================
-- STEP 5: Update User Profiles Policies
-- ============================================
-- Allow users to view their own profile even if pending (to show status)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin' 
      AND up.approval_status = 'approved'
    )
  );

-- Add policy for admins to update approval status
DROP POLICY IF EXISTS "Admins can update user profiles" ON public.user_profiles;

CREATE POLICY "Admins can update user profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin' 
      AND up.approval_status = 'approved'
    )
  );

-- ============================================
-- STEP 6: Add index for approval_status
-- ============================================
CREATE INDEX IF NOT EXISTS user_profiles_approval_status_idx 
ON public.user_profiles(approval_status);

-- ============================================
-- STEP 7: Comments for Documentation
-- ============================================
COMMENT ON COLUMN public.user_profiles.approval_status IS 
  'User approval status: pending (awaiting admin approval), approved (can access system), denied (rejected by admin)';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update your frontend to handle pending/denied status
-- 3. Create admin interface to approve/deny users
-- ============================================================================
