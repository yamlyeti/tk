-- Set your user as admin (system super admin)
-- Prefer fix-is-admin-and-project-visibility.sql — it fixes is_admin() to read user_profiles.role
-- and restores project visibility for admins/org members.

-- 1) Ensure user_profiles shows admin and is approved (is_admin() checks this)
UPDATE user_profiles
SET role = 'admin', approval_status = 'approved', is_active = true
WHERE email = 'proofthat@bergman.rocks';

-- 2) Sync auth metadata (optional fallback for is_admin())
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'proofthat@bergman.rocks';

-- Verify the updates
SELECT id, email, role, approval_status FROM user_profiles WHERE email = 'proofthat@bergman.rocks';
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'proofthat@bergman.rocks';
