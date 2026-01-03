# User Management Setup Guide

## Overview
This guide will help you set up the enhanced user management system with invitations, role management, and project assignment features.

## Database Setup Required

### Step 1: Run the User Management Enhancement Script

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `user-management-enhancement.sql`
4. Click "Run" to execute

This script will create:
- `user_invitations` table for tracking invited users
- Admin policies for managing users
- Proper RLS (Row Level Security) policies

## Features Added

### 1. **User Invitation System**
- Admins can invite new users by email
- Track pending, accepted, and expired invitations
- View all pending invitations in a dedicated section
- Cancel pending invitations

### 2. **Enhanced User Management**
- **Search & Filter**: Find users by name/email, role, or status
- **Edit Users**: Admins can edit user names, roles, and status
- **Delete Users**: Remove users from the system (admins only)
- **Export Data**: Export user list to CSV

### 3. **Project Assignment**
- Assign users to specific projects
- Each user can be a member of multiple projects
- Visual checkbox interface for easy assignment
- Track which projects each user belongs to

### 4. **Role-Based Access Control**
- **Admin**: Full access to all features, can manage users and projects
- **Member**: Can view and track time on assigned projects

### 5. **Visual Enhancements**
- Gradient-styled headers and cards
- Dark mode support
- Responsive design
- Animated transitions
- Professional statistics dashboard

## How to Use

### Inviting Users (Admin Only)

1. Navigate to the **Users** page
2. Click the **"Invite User"** button
3. Enter the user's email, name (optional), and role
4. Click **"Send Invite"**
5. Share your app's signup link with the invited user
6. When they sign up with that email, they'll automatically get the assigned role

### Managing Users (Admin Only)

#### Edit a User
1. Click the **Edit** icon (pencil) next to a user
2. Modify their name, role, or active status
3. Click the **Save** icon (checkmark)

#### Assign Projects to a User
1. Click the **Shield** icon next to a user
2. Check/uncheck projects to assign/unassign
3. Click **"Done"**

#### Delete a User
1. Click the **Delete** icon (trash) next to a user
2. Confirm the deletion
3. The user and all their data will be removed

### Viewing Your Profile (All Users)

1. Navigate to the **Profile** page
2. View your information, role, and assigned projects
3. Update your name and avatar (coming soon)

## Database Tables

### user_profiles
```sql
- id (uuid, references auth.users)
- email (text)
- full_name (text)
- avatar_url (text)
- role ('admin' | 'member')
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

### user_invitations
```sql
- id (uuid)
- email (text, unique)
- full_name (text)
- role ('admin' | 'member')
- invited_by (uuid, references user_profiles)
- invited_at (timestamp)
- accepted_at (timestamp)
- status ('pending' | 'accepted' | 'expired')
```

### project_members
```sql
- id (uuid)
- project_id (uuid, references projects)
- user_id (uuid, references user_profiles)
- role ('owner' | 'admin' | 'member')
- added_at (timestamp)
```

## Security Features

- **Row Level Security (RLS)**: All tables have RLS enabled
- **Admin-Only Operations**: Only admins can manage users and invitations
- **Self-Edit Protection**: Users cannot edit or delete themselves
- **Project Access Control**: Users can only see projects they're assigned to
- **Team Collaboration**: Team members can view each other's time entries on shared projects

## Troubleshooting

### "Failed to create invitation"
- Make sure you're logged in as an admin
- Check if the email is already registered or invited
- Verify the database script ran successfully

### "Failed to assign project"
- Ensure the user and project both exist
- Verify your admin permissions
- Check the browser console for detailed error messages

### Users Not Appearing
- Make sure the `multi-user-setup.sql` script was run first
- Verify the `handle_new_user()` trigger is active
- Check that RLS policies are correctly set up

## Next Steps

1. Run the `user-management-enhancement.sql` script in Supabase
2. Invite your first team members
3. Assign them to projects
4. Start collaborating!

## Support

If you encounter any issues, check:
1. Supabase logs for SQL errors
2. Browser console for JavaScript errors
3. Network tab for failed API calls
