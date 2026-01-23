-- ============================================================================
-- PASSWORD RESET PERMISSIONS
-- ============================================================================
-- This creates helper functions to check if a user can manage another user
-- (needed for password reset feature)
-- ============================================================================

-- ============================================
-- FUNCTION: Check if current user can manage target user
-- ============================================
-- Returns true if:
-- 1. Current user is a global super admin, OR
-- 2. Current user is an org admin/owner of ANY org that target user belongs to

CREATE OR REPLACE FUNCTION public.can_manage_user(target_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_super_admin BOOLEAN;
  shares_org BOOLEAN;
BEGIN
  -- Check if current user is a global super admin
  SELECT COALESCE(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid()),
    false
  ) INTO is_super_admin;

  IF is_super_admin THEN
    RETURN true;
  END IF;

  -- Check if current user is an admin/owner of any org that target user belongs to
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om_current
    INNER JOIN public.organization_members om_target
      ON om_current.organization_id = om_target.organization_id
    WHERE om_current.user_id = auth.uid()
      AND om_current.role IN ('owner', 'admin')
      AND om_target.user_id = target_user_id
  ) INTO shares_org;

  RETURN shares_org;
END;
$$;

-- ============================================
-- FUNCTION: Get manageable users for current user
-- ============================================
-- Returns list of user IDs that current user can manage

CREATE OR REPLACE FUNCTION public.get_manageable_users()
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_super_admin BOOLEAN;
BEGIN
  -- Check if current user is a global super admin
  SELECT COALESCE(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid()),
    false
  ) INTO is_super_admin;

  IF is_super_admin THEN
    -- Super admin can manage everyone
    RETURN QUERY
    SELECT up.id
    FROM public.user_profiles up;
  ELSE
    -- Org admin can only manage users in their orgs
    RETURN QUERY
    SELECT DISTINCT om_target.user_id
    FROM public.organization_members om_current
    INNER JOIN public.organization_members om_target
      ON om_current.organization_id = om_target.organization_id
    WHERE om_current.user_id = auth.uid()
      AND om_current.role IN ('owner', 'admin');
  END IF;
END;
$$;

-- ============================================
-- TEST QUERIES
-- ============================================
-- Run these to verify the functions work

-- Test if you can manage a specific user (replace with actual UUID)
-- SELECT public.can_manage_user('user-uuid-here');

-- Get all users you can manage
-- SELECT * FROM public.get_manageable_users();

-- Get user profiles you can manage
-- SELECT up.*
-- FROM public.user_profiles up
-- WHERE up.id IN (SELECT user_id FROM public.get_manageable_users());
