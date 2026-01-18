-- Set your user as admin (system super admin)
-- 1) Update auth.users metadata so is_admin() returns true (preferred for global admin checks)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'proofthat@bergman.rocks';

-- 2) Optionally ensure user_profiles shows admin and is approved
UPDATE user_profiles
SET role = 'admin', approval_status = 'approved'
WHERE email = 'proofthat@bergman.rocks';

-- Verify the updates
SELECT id, email, role, approval_status FROM user_profiles WHERE email = 'proofthat@bergman.rocks';
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'proofthat@bergman.rocks';
