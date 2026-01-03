# User Approval Feature

## Overview
This feature adds an admin approval workflow for new user registrations. When users sign up, their accounts are created in a "pending" state and must be approved by an administrator before they can access the system.

## Features

### 1. **Registration Approval Workflow**
- New users register normally through the signup form
- Upon registration, users receive email confirmation
- Accounts are created with `approval_status = 'pending'`
- Users cannot access the system until approved by an admin
- Pending users see a message: "Your account is pending approval"

### 2. **Admin Approval Interface**
- **Location**: New "Approvals" tab in navigation (✅ Approvals)
- **Statistics Dashboard**:
  - Pending approvals count
  - Total approved users
  - Total denied users
- **Filter Options**:
  - View pending users only
  - View all users (pending, approved, denied)
- **User Cards Display**:
  - User avatar with email initial
  - Full name or "No name provided"
  - Email address
  - Registration date
  - Current approval status (color-coded badge)
  - Action buttons (Approve/Deny)

### 3. **Approval Actions**
- **Approve User**: 
  - Sets `approval_status = 'approved'`
  - Sets `is_active = true`
  - User can immediately log in and access the system
- **Deny User**: 
  - Sets `approval_status = 'denied'`
  - Sets `is_active = false`
  - User cannot log in (receives denial message)
  - Confirmation dialog before denying

### 4. **Security & Access Control**
- Only admins with `role = 'admin'` can access the approval interface
- Non-admins see "Access Denied" message
- Pending/denied users are blocked from:
  - Viewing projects
  - Creating time entries
  - Accessing any system features
- RLS policies enforce approval status at database level

## Database Schema Changes

### New Column: `approval_status`
```sql
ALTER TABLE public.user_profiles 
ADD COLUMN approval_status text DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'denied'));
```

**Values:**
- `pending`: Awaiting admin approval (default for new users)
- `approved`: Approved by admin, can access system
- `denied`: Denied by admin, cannot access system

### Updated Trigger
The `handle_new_user()` function now sets new users to 'pending':
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, approval_status)
  VALUES (NEW.id, NEW.email, COALESCE(...), 'pending');
  ...
END;
$$
```

### Updated RLS Policies
All major tables (projects, time_entries) now check for:
- `approval_status = 'approved'`
- `is_active = true`

Example:
```sql
CREATE POLICY "Users can insert own entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.approval_status = 'approved'
    )
  );
```

## Installation Steps

### 1. Run Database Migration
Execute the migration file in Supabase SQL Editor:
```bash
# File: migration-user-approval.sql
```

**What it does:**
- Adds `approval_status` column to `user_profiles`
- Sets existing users to 'approved' (backward compatibility)
- Updates trigger to set new users as 'pending'
- Updates all RLS policies to check approval status
- Creates index on `approval_status` for performance

### 2. Frontend Already Updated
The following files have been created/updated:
- ✅ `src/components/UserApprovals.tsx` - Admin approval interface
- ✅ `src/components/UserApprovals.css` - Styling for approval interface
- ✅ `src/components/Auth.tsx` - Shows approval status messages
- ✅ `src/components/UserManagement.tsx` - Updated type definitions
- ✅ `src/App.tsx` - Added "Approvals" navigation tab

### 3. Test the Feature
1. Create a test admin account and approve it
2. Register a new user account
3. Log in as admin and navigate to "Approvals"
4. See the pending user and approve/deny them
5. Try logging in as the new user (should work if approved)

## User Experience

### For New Users (Sign Up Flow)
1. User visits the application
2. Clicks "Sign Up"
3. Enters email and password
4. Submits registration form
5. Sees success message: "Registration successful! Please check your email for the confirmation link. Your account will be pending admin approval."
6. Confirms email (standard Supabase flow)
7. Tries to log in
8. Sees message: "Your account is pending approval. An administrator will review your registration shortly."
9. Cannot access system until approved

### For Admins (Approval Flow)
1. Admin logs in to the system
2. Clicks "✅ Approvals" in navigation
3. Sees dashboard with statistics:
   - X Pending Approval
   - X Approved
   - X Denied
4. Views list of users with status badges
5. For pending users, sees "Approve" and "Deny" buttons
6. Clicks "Approve" → User immediately gains access
7. Clicks "Deny" → Confirms action → User is blocked

### For Users Attempting Login

**Pending User:**
```
❌ Your account is pending approval. 
   An administrator will review your registration shortly.
```

**Denied User:**
```
❌ Your account has been denied. 
   Please contact support for more information.
```

**Approved User:**
```
✅ Successfully logged in!
```

## UI Design

### Color Coding
- **Pending**: Orange/Yellow (`#f59e0b`)
  - Badge: Yellow background
  - Icon: Clock
- **Approved**: Green (`#10b981`)
  - Badge: Green background
  - Icon: CheckCircle
- **Denied**: Red (`#ef4444`)
  - Badge: Red background
  - Icon: XCircle
  - Card: Reduced opacity

### Visual Elements
- Gradient backgrounds matching app theme
- Card-based layout with hover effects
- Status badges with icons
- User avatars with email initial
- Smooth transitions and animations
- Responsive design for mobile

## Security Considerations

### Row Level Security (RLS)
All database access is protected by RLS policies that check:
1. User is authenticated (`auth.uid()`)
2. User is active (`is_active = true`)
3. User is approved (`approval_status = 'approved'`)

### Admin-Only Actions
- Approval interface checks admin role client-side
- Database policies enforce admin role for updates
- Non-admins cannot modify `approval_status` via API

### Backward Compatibility
- Existing users automatically set to 'approved'
- No disruption to current user workflows
- Migration is safe to run on production

## Testing Checklist

- [ ] New user registration creates pending account
- [ ] Pending user cannot log in (receives message)
- [ ] Denied user cannot log in (receives message)
- [ ] Admin can view approvals page
- [ ] Non-admin cannot view approvals page
- [ ] Admin can approve pending user
- [ ] Admin can deny pending user
- [ ] Approved user can log in successfully
- [ ] Approved user can access all features
- [ ] Statistics display correctly
- [ ] Filters work (Pending/All)
- [ ] Mobile responsive design works
- [ ] Email confirmation still works
- [ ] Existing users still have access

## Future Enhancements

### Potential Improvements
- **Email Notifications**: 
  - Notify admins when new user registers
  - Notify users when approved/denied
- **Approval Reasons**: 
  - Add optional reason field for denials
  - Show reason to user
- **Auto-Approval**: 
  - Option to auto-approve users from certain email domains
  - Example: @company.com automatically approved
- **Approval Comments**: 
  - Allow admins to add notes to approvals
  - Visible to other admins
- **Bulk Actions**: 
  - Approve/deny multiple users at once
  - Export pending users to CSV
- **Approval History**: 
  - Log who approved/denied each user and when
  - Audit trail for compliance
- **Waitlist Feature**: 
  - Put users in waitlist instead of immediate pending
  - Send invitation codes to join
- **User Limit**: 
  - Set maximum number of approved users
  - Queue additional registrations

## API Reference

### Get User Approval Status
```typescript
const { data } = await supabase
  .from('user_profiles')
  .select('approval_status')
  .eq('id', userId)
  .single();
```

### Approve User (Admin Only)
```typescript
const { error } = await supabase
  .from('user_profiles')
  .update({ 
    approval_status: 'approved', 
    is_active: true 
  })
  .eq('id', userId);
```

### Deny User (Admin Only)
```typescript
const { error } = await supabase
  .from('user_profiles')
  .update({ 
    approval_status: 'denied', 
    is_active: false 
  })
  .eq('id', userId);
```

### List Pending Users (Admin Only)
```typescript
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('approval_status', 'pending')
  .order('created_at', { ascending: false });
```

## Troubleshooting

### Issue: Existing users can't log in after migration
**Solution**: The migration automatically sets existing users to 'approved'. If issues persist, manually update:
```sql
UPDATE public.user_profiles 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;
```

### Issue: Admin can't access approval page
**Verify**:
1. User has `role = 'admin'` in user_profiles
2. User has `approval_status = 'approved'`
3. User has `is_active = true`

### Issue: User approved but still can't log in
**Check**:
1. Verify `approval_status = 'approved'` in database
2. Verify `is_active = true`
3. Have user log out and back in
4. Check RLS policies are enabled

### Issue: New users don't show in approvals
**Check**:
1. Email was confirmed via Supabase auth email
2. Profile was created via trigger
3. Run: `SELECT * FROM user_profiles WHERE approval_status = 'pending'`

## Support

For issues or questions:
1. Check the TROUBLESHOOTING.md file
2. Review the main README.md
3. Check Supabase logs for RLS policy errors
4. Verify database migration ran successfully

---

**Version**: 1.0  
**Last Updated**: 2026-01-02  
**Feature Status**: ✅ Production Ready
