# TK - Comprehensive Time Tracking & Billing System

A modern, full-featured time tracking and project management application with multi-organization support, team collaboration, billable hours tracking, and comprehensive reporting. Built with React, TypeScript, and Supabase.

## Overview

TK is an enterprise-ready time tracking solution that goes beyond simple timers. It provides organizations with tools for project management, team collaboration, billing/invoicing, and detailed analytics. Whether you're a freelancer tracking billable hours or an organization managing multiple teams and projects, TK has the features you need.

## Key Features

### Time Tracking & Productivity
- **Real-time Timer**: Start/stop/pause/resume with live elapsed time display
- **Manual Time Entry**: Add retroactive entries with custom dates and times
- **Idle Detection**: Automatic detection of user inactivity with options to keep or discard idle time
- **Recent Tasks**: Quick restart of recent tasks with one click
- **Pomodoro Timer**: Configurable work/break cycles with notifications
- **Keyboard Shortcuts**: Fast navigation and timer control (Alt+S, Alt+P, Alt+N)

### Planning & Goals
- **Daily & Weekly Goals**: Set and track work hour targets with progress visualization
- **Task Templates**: Save recurring tasks for quick reuse
- **Favorites**: Mark frequently used templates for instant access

### Project & Organization Management
- **Projects**: Create and manage projects with descriptions, tags, and GitHub links
- **Organizations**: Multi-organization support with hierarchical project structure
- **Team Management**: Add members to projects and organizations with role-based access
- **Project Statistics**: View total time tracked, entry counts, and team activity

### Billing & Invoicing
- **Hourly Rates**: Set project-specific or organization-level default rates per user
- **Rate History**: Track rate changes over time with effective dates
- **Billable Hours**: Mark entries as billable or non-billable
- **Multi-Currency**: Support for multiple currencies (USD, EUR, etc.)
- **Invoice Generation**: Create professional invoices from tracked time
- **Billing Reports**: Comprehensive reports showing revenue by project, user, and time period
- **Lost Revenue Tracking**: Identify unbilled hours and potential revenue

### Reporting & Analytics
- **Dashboard**: Multiple report views with interactive charts
  - Overview: Summary cards with totals, averages, and key metrics
  - By Project: Time breakdown per project with percentages
  - By Tag: Time breakdown by tags
  - By Day: Daily time tracking visualization
  - Billing Report: Revenue analysis and billing status
- **Date Range Filtering**: Quick presets (today, week, month, quarter, year) or custom ranges
- **CSV Export**: Export data for external analysis
- **Project Billing Report**: Detailed billing breakdown by user with revenue calculations

### User Management & Administration
- **User Profiles**: Manage personal information and preferences
- **User Approvals**: Admin workflow for approving new user registrations
- **Role-Based Access**: Admin and member roles with appropriate permissions
- **User Status**: Activate/deactivate users
- **Search & Filtering**: Find users by name, email, role, or status

### UI/UX Features
- **Dark Mode**: Toggle between light and dark themes with persistence
- **Drag & Drop**: Reorder time entries and cards
- **Tag Management**: Autocomplete tag input with visual tag display
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Keyboard Navigation**: Full keyboard shortcut support
- **Loading States**: Clear feedback during async operations
- **Error Handling**: User-friendly error messages and validation

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Styling**: CSS with dark mode support
- **Icons**: Lucide React
- **Drag & Drop**: @hello-pangea/dnd
- **Runtime**: Node.js 18+ or Bun

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Pages/Views                                         │   │
│  │  • TimeTracker (Main timer interface)               │   │
│  │  • ProjectsView (Project management)                │   │
│  │  • OrganizationManagement (Org management)          │   │
│  │  • Dashboard (Analytics & reports)                  │   │
│  │  • UserManagement (Admin - user CRUD)               │   │
│  │  • UserApprovals (Admin - approve new users)        │   │
│  │  • UserProfile (User settings)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Components                                          │   │
│  │  • Auth, ManualTimeEntry, PomodoroTimer             │   │
│  │  • Goals, Templates, RecentTasks                    │   │
│  │  • ProjectBillingReport, ProjectTeamManagement      │   │
│  │  • DarkModeToggle, KeyboardShortcuts, TimeEditor    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Contexts                                            │   │
│  │  • AuthContext (User authentication & session)      │   │
│  │  • ThemeContext (Dark mode state)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Hooks                                               │   │
│  │  • useIdleDetection, useTimerNotifications          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ Supabase Client SDK
┌─────────────────────────────────────────────────────────────┐
│                   Supabase (Backend)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                 │   │
│  │  • user_profiles (user data & roles)                │   │
│  │  • organizations (multi-tenant support)             │   │
│  │  • organization_members (org membership)            │   │
│  │  • projects (project data)                          │   │
│  │  • project_members (project teams)                  │   │
│  │  • time_entries (tracked time)                      │   │
│  │  • project_rates (billable rates)                   │   │
│  │  • organization_default_rates (default rates)       │   │
│  │  • user_invitations (pending invites)               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Row Level Security (RLS)                           │   │
│  │  • User isolation & data privacy                    │   │
│  │  • Role-based access control                        │   │
│  │  • Helper functions (is_admin, is_org_member, etc.) │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Authentication                                      │   │
│  │  • Email/Password authentication                    │   │
│  │  • Session management                               │   │
│  │  • User metadata (roles, admin status)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js** (v18 or higher) or **Bun**
- **Supabase Account** (free tier available at [supabase.com](https://supabase.com))
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yamlyeti/tk.git
cd tk
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using Bun:
```bash
bun install
```

### 3. Set Up Supabase

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose an organization (or create one)
4. Enter project details:
   - **Name**: tk-timekeeper (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Select the region closest to you
5. Click "Create new project" and wait ~2 minutes for setup

#### Set Up the Database Schema

1. Navigate to **SQL Editor** in the Supabase dashboard
2. Click "New Query"
3. Copy the contents of `complete-recreate-db.sql` from this repository
4. Paste into the SQL editor
5. Click "Run" (or Ctrl/Cmd + Enter)
6. You should see "Success" message

#### Apply Additional Migrations

For billable rates and billing features:

1. Run the `migration-billable-rates.sql` file in the SQL Editor
2. This adds project rates, organization default rates, and billing views

#### Create Your Admin User

After running the schema, create your admin profile:

```sql
-- Replace with your actual user ID from auth.users and email
INSERT INTO public.user_profiles (id, email, full_name, role, is_active, approval_status)
VALUES (
  'YOUR-UUID-FROM-AUTH-USERS',
  'your-email@example.com',
  'Your Full Name',
  'admin',
  true,
  'approved'
);
```

To find your user ID:
1. Sign up in the app first (to create an auth.users entry)
2. In Supabase, go to **Authentication** > **Users**
3. Copy your user's UUID
4. Run the INSERT statement above with your UUID and email

Alternatively, you can set the admin flag directly in auth.users metadata:

```sql
-- Set is_admin in user metadata (avoids RLS recursion issues)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'your-email@example.com';
```

#### Get API Credentials

1. In Supabase dashboard, click the **Settings** (gear icon)
2. Navigate to **API** section
3. Copy these two values:
   - **Project URL** (e.g., `https://abcdefghijklm.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 5. Run the Application

Start the development server:

```bash
npm run dev
```

Or with Bun:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Usage Guide

### Getting Started

1. **Sign Up**: Create an account with your email and password
2. **Sign In**: Log in with your credentials
3. **Complete Profile**: Add your full name in the Profile section

### Time Tracking

#### Using the Timer

1. Navigate to **Time Tracker** tab
2. Enter what you're working on in the description field
3. (Optional) Select a project from the dropdown
4. (Optional) Add tags (comma-separated)
5. Click **Start** to begin tracking
6. The timer displays elapsed time in real-time
7. Click **Stop** when done
8. Your entry appears in the list below

#### Keyboard Shortcuts

- **Alt+S**: Start/Stop timer
- **Alt+P**: Pause/Resume timer
- **Alt+N**: Focus on new entry description field

#### Manual Time Entry

1. Click **Add Manual Entry**
2. Choose between:
   - **Duration Mode**: Enter total hours and minutes
   - **Time Range Mode**: Specify start and end times
3. Fill in description, project, tags, and notes
4. Click **Save Entry**

#### Managing Entries

- **Edit**: Click on tags or project to modify them inline
- **Delete**: Click the delete button to remove an entry
- **Reorder**: Drag and drop entries to reorder them
- **Add Notes**: Click on an entry to add detailed notes

### Projects

#### Creating a Project

1. Navigate to **Projects** tab
2. Click **Create New Project**
3. Fill in:
   - Project name (required)
   - Description
   - Tags (comma-separated)
   - GitHub repository URL (optional)
   - Organization (if applicable)
4. Click **Create Project**

#### Managing Project Teams

1. Open a project card
2. Click **Manage Team**
3. Add members with specific roles (Owner, Admin, Member)
4. Set hourly billing rates per member
5. Track rate history with effective dates

### Organizations

1. Navigate to **Organizations** tab
2. Click **Create Organization**
3. Enter organization details
4. Add members and assign roles
5. Associate projects with organizations

### Goals & Templates

#### Setting Goals

1. In the Time Tracker view, locate the Goals section
2. Set your daily goal (default: 8 hours)
3. Set your weekly goal (default: 40 hours)
4. Progress bars show your progress toward goals

#### Creating Templates

1. Click **Templates** in the Time Tracker
2. Click **Create Template**
3. Enter task description, tags, and project
4. Mark as favorite for quick access
5. Use templates to quickly start common tasks

### Dashboard & Reports

#### Viewing Reports

1. Navigate to **Dashboard** tab
2. Select report type:
   - **Overview**: Key metrics and totals
   - **By Project**: Time breakdown by project
   - **By Tag**: Time breakdown by tags
   - **By Day**: Daily time tracking
   - **Billing Report**: Revenue and billing analysis
3. Use date range filters (Today, Week, Month, Quarter, Year, All Time, Custom)
4. Filter by project or tag
5. Export to CSV for external analysis

#### Billing Reports

1. Navigate to **Dashboard** > **Billing Report**
2. View:
   - Total billable hours
   - Total revenue
   - Revenue by project
   - Revenue by user
   - Unbilled hours (potential lost revenue)
3. Filter by organization, project, user, or date range
4. Generate invoices
5. Export detailed reports to CSV

### User Management (Admin Only)

#### Managing Users

1. Navigate to **Users** tab (admin only)
2. View all users with status and roles
3. Search by name or email
4. Filter by role or status
5. Actions available:
   - Assign projects/organizations
   - Change user roles
   - Activate/deactivate users
   - Delete users

#### Approving New Users

1. Navigate to **Approvals** tab (admin only)
2. View pending user registrations
3. Click **Approve** to activate a user
4. Click **Deny** to reject a registration

### User Profile

1. Navigate to **Profile** tab
2. View your information:
   - Email
   - Full name
   - Role
   - Status
3. Edit your full name
4. View your user ID

## User Roles & Permissions

### Admin
- Full access to all features
- User management (create, edit, delete, approve)
- Organization and project management
- View all time entries and reports
- Set billing rates
- Generate invoices

### Member (Regular User)
- Track personal time
- Create and manage own projects
- View own time entries and reports
- Set personal goals and templates
- Use pomodoro timer

### Organization Admin
- Manage organization details
- Add/remove organization members
- Create projects under organization
- Set default billing rates for organization

### Project Owner/Admin
- Manage project details
- Add/remove project members
- Set project-specific billing rates
- View project reports

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

### Project Structure

```
tk/
├── src/
│   ├── components/          # React components
│   │   ├── Auth.tsx        # Authentication UI
│   │   ├── TimeTracker.tsx # Main timer interface
│   │   ├── ProjectsView.tsx # Project management
│   │   ├── Dashboard.tsx   # Reports and analytics
│   │   ├── UserManagement.tsx # Admin user management
│   │   ├── UserApprovals.tsx  # Admin approvals
│   │   ├── OrganizationManagement.tsx # Org management
│   │   ├── ProjectBillingReport.tsx # Billing reports
│   │   ├── Goals.tsx       # Goal tracking
│   │   ├── Templates.tsx   # Task templates
│   │   ├── PomodoroTimer.tsx # Pomodoro feature
│   │   ├── RecentTasks.tsx # Recent task list
│   │   └── ... (other components)
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx # Authentication state
│   │   └── ThemeContext.tsx # Dark mode state
│   ├── hooks/              # Custom React hooks
│   │   ├── useIdleDetection.tsx # Idle detection logic
│   │   └── useTimerNotifications.tsx # Timer notifications
│   ├── lib/                # Third-party configurations
│   │   └── supabase.ts    # Supabase client setup
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts       # Shared types
│   ├── App.tsx             # Main app component
│   ├── App.css             # App-level styles
│   ├── dark-mode.css       # Dark mode styles
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── *.sql                   # Database migration scripts
├── .env.example            # Environment variable template
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md              # This file
```

### Database Schema

The application uses the following main tables:

- **user_profiles**: User information, roles, and status
- **organizations**: Organization/company data
- **organization_members**: Organization membership with roles
- **projects**: Project information and settings
- **project_members**: Project team membership with roles
- **time_entries**: All tracked time with metadata
- **project_rates**: Project-specific hourly billing rates with history
- **organization_default_rates**: Organization-level default rates
- **user_invitations**: Pending user invitations (if applicable)

Key helper functions for RLS:
- `is_admin()`: Check if current user is admin
- `is_org_member(org_id)`: Check org membership
- `is_org_admin(org_id)`: Check org admin status
- `is_project_member(project_id)`: Check project membership
- `is_project_admin(project_id)`: Check project admin status

## Building for Production

Build the production-ready application:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

Preview the production build:

```bash
npm run preview
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
4. Deploy

### Deploy to Netlify

1. Push your code to GitHub
2. Import project in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables
6. Deploy

### Self-Hosting

1. Build the project: `npm run build`
2. Serve the `dist/` folder with any static file server (nginx, Apache, etc.)
3. Configure environment variables on your server

## Mobile Usage

The app is fully responsive and works on mobile browsers:

1. Open the app URL in a mobile browser
2. (Optional) Add to home screen for app-like experience:
   - **iOS**: Safari > Share > Add to Home Screen
   - **Android**: Chrome > Menu > Add to Home Screen

## Documentation

Additional documentation files:

- **[FEATURES.md](./FEATURES.md)** - Detailed feature documentation
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test the application
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute

## Troubleshooting

### "Failed to fetch" errors
- Verify your `.env` file has correct Supabase credentials
- Ensure Supabase project is active (not paused)
- Restart the dev server after changing `.env`

### Database errors
- Confirm you ran all SQL migration scripts in order
- Check that tables exist in Supabase Table Editor
- Verify RLS policies are enabled

### Permission errors
- Ensure your user has the correct role in `user_profiles`
- Check that your user ID matches between `auth.users` and `user_profiles`
- Verify admin metadata is set correctly for admin users

### Email confirmation
- Check spam folder for confirmation emails
- Or disable email confirmation in Supabase: Authentication > Settings > Disable "Enable email confirmations"

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Android Chrome)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code of conduct
- Development workflow
- Pull request process
- Coding standards

## Support

- Bug reports: [Open an issue](https://github.com/yamlyeti/tk/issues)
- Feature requests: [Open a discussion](https://github.com/yamlyeti/tk/discussions)
- Questions: Check existing issues or start a discussion

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com)
- Icons by [Lucide](https://lucide.dev/)
- Drag & Drop by [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)

---

**Built with ❤️ for teams and individuals who value their time.**
