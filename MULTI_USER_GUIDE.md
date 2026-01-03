# Multi-User System Documentation

## Overview
The time keeping app now supports multiple users with team collaboration features. Users can create projects, invite team members, and track time collaboratively.

## Setup Instructions

### 1. Run the Database Migration
Open your Supabase SQL Editor and run the `multi-user-setup.sql` script. This will:
- Create user profiles table
- Create project members table
- Update policies for team access
- Add triggers for automatic profile creation
- Set up team collaboration features

### 2. Features Added

#### User Management (👥 Users Tab)
- **View all users** in the system
- **Edit user profiles** (admin only)
- **Change user roles** (admin/member)
- **Activate/deactivate users** (admin only)
- **View user details**: email, role, status, join date

#### User Profile (👤 Profile Tab)
- **View personal profile** information
- **Edit your name** and details
- **See your role** and status

#### Project Team Management
- **Assign users to projects** via the team icon (👥) on each project card
- **Set member roles**: Owner, Admin, or Member
- **Remove team members** from projects
- **View all team members** on a project

### 3. User Roles & Permissions

#### Admin
- Can view all users
- Can edit other users' profiles
- Can change user roles
- Can activate/deactivate users
- Can view all time entries across the system
- Full project management

#### Member
- Can view their own profile
- Can edit their own profile
- Can create projects (becomes project owner)
- Can track time on assigned projects
- Can view time entries on their projects

#### Project Roles

**Owner**
- Full control over the project
- Can add/remove team members
- Can assign admin roles
- Can edit project details
- Cannot be removed from project

**Admin**
- Can add/remove members (except owner)
- Can edit project details
- Can view all project time entries

**Member**
- Can track time on the project
- Can view project details
- Cannot edit project or manage team

### 4. Team Collaboration Workflow

1. **Admin creates users** or users sign up
2. **User creates a project** (automatically becomes project owner)
3. **Owner invites team members** via the team management button (👥)
4. **Team members can now**:
   - See the project in their projects list
   - Track time against the project
   - View project analytics
5. **Reports show team activity** with time tracked by all team members

### 5. Database Tables

#### user_profiles
- Stores user information and roles
- Auto-created when user signs up
- Links to auth.users

#### project_members
- Stores team assignments
- Links users to projects with roles
- Enforces unique user-project combinations

#### Updated policies
- Projects viewable by owner and team members
- Time entries viewable by owner, team members, and admins
- Team members can only edit their own entries

### 6. Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Users can only see**:
  - Their own projects
  - Projects they're assigned to
  - Their own time entries
  - Time entries on their projects (if admin)
- **Admins can see** everything
- **Project owners control** team membership

### 7. Usage Tips

- First user should be set to admin manually in Supabase if needed
- Invite team members before they track time
- Use project tags to organize team projects
- Check Dashboard for team-wide analytics
- Remove inactive team members to keep projects clean

### 8. Troubleshooting

**Can't see a project?**
- Make sure you're added as a team member
- Check with the project owner

**Can't add team members?**
- Make sure you're the project owner or admin
- Verify the user has an active profile

**Time entries not showing?**
- Make sure you're assigned to the project
- Check that the project_id is set correctly

## Next Steps

Consider adding:
- Team activity feed
- Email notifications for team invites
- Time entry approvals
- Budget tracking per project
- Team performance reports
- Export team data
