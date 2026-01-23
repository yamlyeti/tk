# Password Reset Feature

This document explains the new password reset functionality for admins.

## Overview

Both **Global Super Admins** and **Organization Admins** can now send password reset emails to users they manage.

## How It Works

### Permissions

- **Global Super Admins**: Can reset passwords for ANY user in the system
- **Organization Admins**: Can reset passwords ONLY for users in their organization(s)

### Database Functions

The system uses a PostgreSQL function `can_manage_user()` to check permissions before allowing password resets.

### User Interface

#### 1. User Management Page
- Navigate to **👥 Users**
- Find the user you want to send a password reset to
- Click the blue **🔑 Key** icon button
- A password reset email will be sent to the user

#### 2. User Approvals Page (Super Admins Only)
- Navigate to **✅ Approvals**
- Find an approved user
- Click the **Reset Password** button
- A password reset email will be sent to the user

## Setup Instructions

### 1. Run the Database Migration

Execute `migration-password-reset-permissions.sql` in your Supabase SQL Editor:

```bash
# In Supabase SQL Editor, run:
migration-password-reset-permissions.sql
```

This creates two helper functions:
- `can_manage_user(target_user_id)` - Checks if current user can manage target user
- `get_manageable_users()` - Returns list of user IDs the current user can manage

### 2. Verify Functions Exist

Run this query to confirm the functions were created:

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('can_manage_user', 'get_manageable_users');
```

### 3. Test the Feature

1. Sign in as a super admin or org admin
2. Go to User Management
3. Click the password reset button for a user you manage
4. Check that the user receives an email

## Security

- **Authorization Check**: Before sending any password reset email, the system verifies that the requester has permission to manage that user
- **RLS Policies**: Row Level Security ensures org admins can only see and manage users in their organizations
- **Supabase Auth**: Uses Supabase's built-in `resetPasswordForEmail()` function, which is secure and rate-limited

## Email Flow

1. Admin clicks "Reset Password" button
2. System checks if admin can manage that user
3. If authorized, Supabase sends a password reset email to the user
4. User receives email with a secure reset link
5. User clicks link and sets a new password
6. User can now sign in with the new password

## What Users See

When a password reset is sent, the user receives an email with:
- Subject: "Reset Your Password"
- A secure link to reset their password
- The link expires after a certain time period
- Link redirects back to your application after password is reset

## Troubleshooting

### "You do not have permission to reset this user's password"

**Cause**: You're trying to reset a password for a user you don't manage.

**Solution**:
- If you're a global super admin, verify your admin status:
  ```sql
  SELECT id, email, role FROM user_profiles WHERE email = 'your-email@example.com';
  SELECT id, email, raw_user_meta_data->>'is_admin' FROM auth.users WHERE email = 'your-email@example.com';
  ```
- If you're an org admin, verify the user is in your organization:
  ```sql
  SELECT * FROM organization_members WHERE user_id = auth.uid();
  SELECT * FROM organization_members WHERE user_id = 'target-user-id';
  ```

### "Failed to send password reset email"

**Causes**:
- Email service not configured in Supabase
- User's email doesn't exist
- Rate limiting (too many requests)

**Solutions**:
1. Check Supabase email settings in Dashboard → Authentication → Email Templates
2. Verify the user's email is correct in the database
3. Wait a few minutes and try again

### Function "can_manage_user" does not exist

**Cause**: The migration wasn't run.

**Solution**: Run `migration-password-reset-permissions.sql` in Supabase SQL Editor.

## Files Modified

### Frontend
- `src/components/UserManagement.tsx` - Added password reset button and function
- `src/components/UserApprovals.tsx` - Added password reset button for approved users

### Backend
- `migration-password-reset-permissions.sql` - Created permission check functions

### Documentation
- `PASSWORD-RESET-FEATURE.md` - This file

## Testing Checklist

- [ ] Run `migration-password-reset-permissions.sql`
- [ ] Verify functions exist in database
- [ ] Sign in as super admin
- [ ] Send password reset from User Management page
- [ ] Verify email is received
- [ ] Test password reset flow
- [ ] Sign in as org admin
- [ ] Verify can only reset passwords for org members
- [ ] Verify cannot reset passwords for non-org members

## Future Enhancements

Potential improvements:
- Bulk password reset for multiple users
- Password reset history/audit log
- Custom email templates
- Configurable redirect URL after password reset
- Notification to admins when password is successfully reset
