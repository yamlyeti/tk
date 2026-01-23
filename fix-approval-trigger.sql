-- ============================================================================
-- FIX APPROVAL TRIGGER - Ensure new users are set to 'pending'
-- ============================================================================
-- This fixes the handle_new_user function and trigger to properly set
-- new signups to pending approval status
-- ============================================================================

-- ============================================
-- STEP 1: Ensure approval_status column exists
-- ============================================
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

-- ============================================
-- STEP 2: Update handle_new_user function
-- ============================================
-- This function is called by the trigger when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, approval_status, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending',  -- New users start as pending
    false       -- Inactive until approved
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Recreate trigger (ensure it exists)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Set existing users to approved
-- ============================================
-- This is for backward compatibility - existing users should be approved
UPDATE public.user_profiles
SET
  approval_status = 'approved',
  is_active = true
WHERE approval_status IS NULL
   OR approval_status = 'pending';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the trigger exists:
-- SELECT * FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- Run this to test the function:
-- SELECT proname, prosrc FROM pg_proc
-- WHERE proname = 'handle_new_user';
