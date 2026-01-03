-- Set your user as admin
-- First, let's check current user profiles
SELECT id, email, role FROM user_profiles;

-- Update your user to admin (replace with your actual email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'proofthat@bergman.rocks';

-- Verify the update
SELECT id, email, role FROM user_profiles WHERE email = 'proofthat@bergman.rocks';
