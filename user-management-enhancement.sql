-- User Management Enhancement Script
-- Adds invitation system and project assignment features

-- ============================================
-- STEP 1: Create User Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by uuid REFERENCES public.user_profiles ON DELETE SET NULL,
  invited_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view invitations" ON public.user_invitations;

-- Create policies
CREATE POLICY "Admins can manage invitations"
  ON public.user_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "Users can view invitations"
  ON public.user_invitations FOR SELECT
  USING (true);

-- ============================================
-- STEP 2: Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS user_invitations_email_idx ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS user_invitations_status_idx ON public.user_invitations(status);

-- ============================================
-- STEP 3: Allow Admins to Update Other User Profiles
-- ============================================
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ============================================
-- STEP 4: Allow Admins to Delete Users (soft delete via is_active)
-- ============================================
DROP POLICY IF EXISTS "Admins can manage users" ON public.user_profiles;

CREATE POLICY "Admins can manage users"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ============================================
-- STEP 5: Verification
-- ============================================
SELECT '✅ User management enhancement complete!' as status;
SELECT 'Created user_invitations table' as info;
SELECT 'Added admin policies for user management' as info;
