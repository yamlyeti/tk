# Setup Organization Admins - Quick Guide

This guide will help you create 2 org-level admins who can only manage their assigned organizations.

## Step-by-Step Process

### 1. Run Diagnostics (in Supabase SQL Editor)

First, get the IDs you need:

```sql
-- Get your organization IDs
SELECT id, name FROM public.organizations ORDER BY name;

-- Get your user IDs
SELECT id, email, full_name FROM public.user_profiles
WHERE approval_status = 'approved' AND is_active = true
ORDER BY email;
```

**Copy the IDs from the results - you'll need them in the next step.**

---

### 2. Create the Org Admins

Replace the placeholder UUIDs with the actual IDs from Step 1:

```sql
-- User 1 becomes admin of Org 1
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES (
  'YOUR-ORG-1-UUID-HERE',   -- Replace with actual org UUID
  'YOUR-USER-1-UUID-HERE',  -- Replace with actual user UUID
  'admin'
)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin';

-- User 2 becomes admin of Org 2
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES (
  'YOUR-ORG-2-UUID-HERE',   -- Replace with actual org UUID
  'YOUR-USER-2-UUID-HERE',  -- Replace with actual user UUID
  'admin'
)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin';
```

---

### 3. Ensure They're NOT Global Admins

Make sure these users are regular members, not super admins:

```sql
-- Set them as regular members (NOT global admins)
UPDATE public.user_profiles
SET role = 'member', approval_status = 'approved', is_active = true
WHERE id IN (
  'YOUR-USER-1-UUID-HERE',
  'YOUR-USER-2-UUID-HERE'
);

-- Remove any global admin flags
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": false}'::jsonb
WHERE id IN (
  'YOUR-USER-1-UUID-HERE',
  'YOUR-USER-2-UUID-HERE'
);
```

---

### 4. Create Helper Functions (if needed)

Run this once to ensure the helper functions exist:

```sql
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
```

---

### 5. Verify It Worked

```sql
-- See all org admins
SELECT
  o.name as organization,
  up.email as admin_email,
  up.role as global_role,
  om.role as org_role,
  CASE
    WHEN up.role = 'admin' THEN '⚠️ GLOBAL ADMIN (should be member!)'
    WHEN om.role = 'admin' THEN '✅ ORG ADMIN (correct)'
    ELSE 'Other'
  END as status
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
JOIN public.user_profiles up ON up.id = om.user_id
WHERE om.role IN ('admin', 'owner')
ORDER BY o.name;
```

---

## What Each Role Can Do

### 🌟 **Global Super Admin** (proofthat@bergman.rocks)
- `user_profiles.role = 'admin'`
- Can see and manage **ALL** organizations
- Can approve/deny new user signups
- Can manage all users across all orgs

### 👑 **Organization Owner** (if you want to use this)
- `organization_members.role = 'owner'`
- `user_profiles.role = 'member'`
- Can manage **ONLY their org**
- Can add/remove members, change roles
- Can delete the organization
- **CANNOT** see other organizations

### 🔧 **Organization Admin** (what you're creating)
- `organization_members.role = 'admin'`
- `user_profiles.role = 'member'`
- Can manage **ONLY their org**
- Can add/remove members
- Can manage org projects
- **CANNOT** delete the organization
- **CANNOT** see other organizations

### 👤 **Regular Member**
- `organization_members.role = 'member'`
- `user_profiles.role = 'member'`
- Can view their org
- Can work on assigned projects
- **CANNOT** manage members or settings

---

## Quick Commands

```sql
-- Upgrade member to org admin
UPDATE organization_members SET role = 'admin'
WHERE organization_id = 'org-uuid' AND user_id = 'user-uuid';

-- Upgrade org admin to owner
UPDATE organization_members SET role = 'owner'
WHERE organization_id = 'org-uuid' AND user_id = 'user-uuid';

-- Downgrade to regular member
UPDATE organization_members SET role = 'member'
WHERE organization_id = 'org-uuid' AND user_id = 'user-uuid';

-- Remove from org entirely
DELETE FROM organization_members
WHERE organization_id = 'org-uuid' AND user_id = 'user-uuid';
```

---

## Testing

After setup, have each org admin sign in and verify:

1. ✅ They can see their assigned organization
2. ✅ They can manage members in their org
3. ✅ They can manage projects in their org
4. ❌ They **CANNOT** see other organizations
5. ❌ They **CANNOT** see the "Approvals" page (only super admins can)

---

## Need Help?

Full detailed script with all diagnostics: `create-org-admins.sql`
