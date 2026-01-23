-- ============================================================================
-- CREATE ORGANIZATION-LEVEL ADMINS
-- ============================================================================
-- This script helps you create organization admins who can ONLY manage
-- their specific organization (not global super admins)
-- ============================================================================

-- ============================================
-- STEP 1: DIAGNOSTIC - See what you have
-- ============================================

-- List all organizations
SELECT
  id,
  name,
  description,
  created_at,
  'Copy this ID for the org you want to assign admin to' as note
FROM public.organizations
ORDER BY name;

-- List all users (to find the ones you want to make org admins)
SELECT
  id,
  email,
  full_name,
  role,
  approval_status,
  is_active,
  'Copy this ID for the user you want to make org admin' as note
FROM public.user_profiles
WHERE approval_status = 'approved' AND is_active = true
ORDER BY email;

-- Show current organization memberships
SELECT
  o.name as organization,
  up.email as user_email,
  up.full_name as user_name,
  om.role as org_role,
  om.added_at
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
JOIN public.user_profiles up ON up.id = om.user_id
ORDER BY o.name, om.role DESC, up.email;

-- ============================================
-- STEP 2: CREATE ORG ADMINS
-- ============================================
-- IMPORTANT: Replace the UUIDs below with actual IDs from STEP 1

-- Template for creating an org admin
-- Run this for EACH user you want to make an org admin

-- Example 1: Make user1 an admin of org1
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES (
  'REPLACE-WITH-ORG-UUID-1',  -- Organization ID from STEP 1
  'REPLACE-WITH-USER-UUID-1', -- User ID from STEP 1
  'admin'                      -- Role: 'admin' or 'owner' (owner has more control)
)
ON CONFLICT (organization_id, user_id)
DO UPDATE SET role = EXCLUDED.role;

-- Example 2: Make user2 an admin of org2
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES (
  'REPLACE-WITH-ORG-UUID-2',  -- Organization ID from STEP 1
  'REPLACE-WITH-USER-UUID-2', -- User ID from STEP 1
  'admin'                      -- Role: 'admin' or 'owner'
)
ON CONFLICT (organization_id, user_id)
DO UPDATE SET role = EXCLUDED.role;

-- ============================================
-- STEP 3: ENSURE THEY'RE NOT GLOBAL ADMINS
-- ============================================
-- Make sure these users are regular members, NOT global super admins

-- Update user_profiles to set role as 'member' (NOT 'admin')
UPDATE public.user_profiles
SET
  role = 'member',           -- Regular member, not global admin
  approval_status = 'approved',
  is_active = true
WHERE id IN (
  'REPLACE-WITH-USER-UUID-1',
  'REPLACE-WITH-USER-UUID-2'
);

-- Remove global admin flag from auth.users metadata
-- (Only run this if they were accidentally set as global admins)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": false}'::jsonb
WHERE id IN (
  'REPLACE-WITH-USER-UUID-1',
  'REPLACE-WITH-USER-UUID-2'
);

-- ============================================
-- STEP 4: VERIFY ORG-LEVEL PERMISSIONS
-- ============================================
-- Ensure the RLS policies allow org admins to manage their org

-- Check if is_org_admin function exists
SELECT
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname LIKE '%org%admin%'
   OR proname LIKE '%organization%admin%';

-- If the function doesn't exist or needs updating, create it:
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Show all org memberships with their roles
SELECT
  o.name as organization_name,
  up.email as user_email,
  up.full_name as user_name,
  up.role as global_role,
  om.role as org_role,
  CASE
    WHEN up.role = 'admin' THEN '⚠️ GLOBAL SUPER ADMIN'
    WHEN om.role = 'owner' THEN '✅ ORG OWNER'
    WHEN om.role = 'admin' THEN '✅ ORG ADMIN'
    WHEN om.role = 'member' THEN '👤 ORG MEMBER'
    ELSE 'UNKNOWN'
  END as access_level
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
JOIN public.user_profiles up ON up.id = om.user_id
ORDER BY o.name, om.role DESC, up.email;

-- Verify users are NOT global admins
SELECT
  up.email,
  up.role as profile_role,
  au.raw_user_meta_data->>'is_admin' as metadata_is_admin,
  CASE
    WHEN up.role = 'admin' OR (au.raw_user_meta_data->>'is_admin')::boolean = true
    THEN '⚠️ WARNING: GLOBAL ADMIN'
    ELSE '✅ Regular user'
  END as status
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.id IN (
  'REPLACE-WITH-USER-UUID-1',
  'REPLACE-WITH-USER-UUID-2'
);

-- Show what each org admin can see
SELECT
  up.email,
  o.name as can_manage_org,
  om.role as with_role
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
JOIN public.user_profiles up ON up.id = om.user_id
WHERE om.role IN ('owner', 'admin')
ORDER BY up.email, o.name;

-- ============================================
-- ROLE DESCRIPTIONS
-- ============================================
--
-- GLOBAL SUPER ADMIN:
--   - user_profiles.role = 'admin'
--   - auth.users.raw_user_meta_data->>'is_admin' = true
--   - Can see ALL organizations
--   - Can manage ALL users
--   - Can approve/deny signups
--
-- ORGANIZATION OWNER:
--   - organization_members.role = 'owner'
--   - user_profiles.role = 'member'
--   - Can manage their org's members (add/remove/change roles)
--   - Can manage their org's projects
--   - Can delete their org
--   - CANNOT see other orgs
--
-- ORGANIZATION ADMIN:
--   - organization_members.role = 'admin'
--   - user_profiles.role = 'member'
--   - Can manage their org's members (add/remove)
--   - Can manage their org's projects
--   - CANNOT delete their org
--   - CANNOT see other orgs
--
-- ORGANIZATION MEMBER:
--   - organization_members.role = 'member'
--   - user_profiles.role = 'member'
--   - Can view their org
--   - Can work on assigned projects
--   - CANNOT manage members or projects
--   - CANNOT see other orgs
-- ============================================

-- ============================================
-- QUICK REFERENCE COMMANDS
-- ============================================

-- To make someone an org owner:
-- INSERT INTO organization_members (organization_id, user_id, role)
-- VALUES ('org-uuid', 'user-uuid', 'owner')
-- ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';

-- To make someone an org admin:
-- INSERT INTO organization_members (organization_id, user_id, role)
-- VALUES ('org-uuid', 'user-uuid', 'admin')
-- ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin';

-- To remove someone from an org:
-- DELETE FROM organization_members
-- WHERE organization_id = 'org-uuid' AND user_id = 'user-uuid';

-- To change someone's org role:
-- UPDATE organization_members
-- SET role = 'member'  -- or 'admin' or 'owner'
-- WHERE organization_id = 'org-uuid' AND user_id = 'user-uuid';
