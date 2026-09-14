-- Fix: is_admin() broken + projects invisible to admins/org members
-- Root cause: is_admin() only checked raw_user_meta_data (often null) instead of user_profiles.role.
-- Also restore org-member project visibility for invoicing.

BEGIN;

-- ============================================================================
-- 1. Fix is_admin() to check user_profiles.role = 'admin'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND approval_status = 'approved'
      AND is_active = true
  )
  OR COALESCE(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Sync auth metadata for existing admins (belt-and-suspenders)
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
FROM public.user_profiles up
WHERE u.id = up.id
  AND up.role = 'admin'
  AND up.approval_status = 'approved';

-- ============================================================================
-- 2. Fix projects SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they belong to" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

CREATE POLICY "Users can view projects they belong to"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_project_member(id)
    OR (
      organization_id IS NOT NULL
      AND public.is_org_member(organization_id)
    )
    OR public.is_admin()
  );

-- ============================================================================
-- 3. Verify
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'is_admin() fixed; projects policy restored with org-member + admin access';
END $$;

COMMIT;
