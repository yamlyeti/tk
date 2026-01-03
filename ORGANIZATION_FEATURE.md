# Organization Hierarchy Feature

## Overview
This feature adds an organizational hierarchy above projects, allowing you to group related projects under organizations. You can now track time by organization and project, with a clear hierarchy: **Organization → Projects → Time Entries**.

## 🎯 Use Case Example
```
Organization: "Ojohsy Org"
  ├─ Project: "Jaja Project"
  │   └─ Time Entries
  ├─ Project: "Another Project"
  │   └─ Time Entries
  └─ Project: "Third Project"
      └─ Time Entries
```

## Features

### 1. **Organization Management**
- **Create Organizations**: Name, description, logo (optional)
- **Edit Organizations**: Update name and description
- **Delete Organizations**: Cascades to all projects and time entries
- **Organization Stats**:
  - Number of projects
  - Number of members
  - Total time tracked across all projects

### 2. **Organization Members**
- **Member Roles**:
  - **Owner**: Created the organization, full control
  - **Admin**: Can manage organization and members
  - **Member**: Can view and create projects in the organization
- **Automatic Membership**: Creator automatically becomes owner
- **Access Control**: Members can view/create projects in their organizations

### 3. **Project-Organization Linking**
- **Optional Association**: Projects can be personal or belong to an organization
- **Organization Dropdown**: Select organization when creating project
- **Organization Badge**: Projects display their organization affiliation
- **Filtering**: (Future) Filter projects by organization

### 4. **Time Tracking Hierarchy**
- Track time on projects within organizations
- Reports can aggregate by:
  - Individual project
  - Entire organization
  - Across all organizations

### 5. **Beautiful UI**
- **Modern Cards**: Gradient backgrounds, shadows, hover effects
- **Statistics Dashboard**: Visual stats for each organization
- **Color-Coded**: Organization badges on project cards
- **Responsive Design**: Works on mobile and desktop

## Database Schema

### New Tables

#### `organizations`
```sql
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### `organization_members`
```sql
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'admin', 'member')),
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

### Updated Table

#### `projects` (added column)
```sql
ALTER TABLE public.projects 
ADD COLUMN organization_id uuid REFERENCES organizations ON DELETE CASCADE;
```

### New View

#### `organization_time_stats`
Aggregates time tracking data by organization and project:
```sql
CREATE VIEW organization_time_stats AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  p.id as project_id,
  p.name as project_name,
  COUNT(te.id) as entry_count,
  SUM(duration) / 3600.0 as total_hours
FROM organizations o
LEFT JOIN projects p ON p.organization_id = o.id
LEFT JOIN time_entries te ON te.project_id = p.id
GROUP BY o.id, o.name, p.id, p.name;
```

## Installation

### Step 1: Run Database Migration
Execute in Supabase SQL Editor:
```bash
migration-organizations.sql
```

**What it does:**
- Creates `organizations` and `organization_members` tables
- Adds `organization_id` column to `projects`
- Sets up RLS policies for organization access
- Creates auto-trigger to make creator an owner
- Creates view for time statistics

### Step 2: Frontend Ready
All components are already created and integrated:
- ✅ `src/components/OrganizationManagement.tsx`
- ✅ `src/components/OrganizationManagement.css`
- ✅ `src/types/index.ts` updated with Organization interface
- ✅ `src/components/ProjectsView.tsx` updated
- ✅ `src/App.tsx` updated with Organizations tab

### Step 3: Build and Deploy
```bash
npm run build
```
✅ Build successful!

## Usage Guide

### Creating an Organization

1. Navigate to **🏢 Organizations** tab
2. Click **"New Organization"** button
3. Enter:
   - **Organization Name** (required) - e.g., "Ojohsy Org"
   - **Description** (optional) - e.g., "Main company projects"
4. Click **"Create"**

### Managing Organizations

**View Stats:**
- Each organization card shows:
  - 📁 Number of projects
  - 👥 Number of members
  - ⏱️ Total time tracked

**Edit Organization:**
- Click the edit icon (✏️)
- Update name or description
- Click "Update"

**Delete Organization:**
- Click the delete icon (🗑️)
- Confirm deletion
- **Warning**: This deletes all projects and time entries!

### Creating Projects in Organizations

1. Go to **📁 Projects** tab
2. In "Create New Project" form:
   - **Organization**: Select from dropdown (or "No Organization")
   - **Project Name**: e.g., "Jaja Project"
   - Fill in other fields (tags, description, GitHub link)
3. Click **"Add Project"**

The project will now:
- Be linked to the organization
- Show organization badge (🏢 Org Name)
- Be visible to all organization members

### Tracking Time

Time tracking works the same, but now:
1. Select a project (which may belong to an organization)
2. Time entry is automatically linked through:
   - Project → Organization → Time Entry
3. Can be aggregated by organization in reports

## User Interface

### Organizations Page Features

**Organization Cards:**
```
┌─────────────────────────────────┐
│  O  Ojohsy Org         [✏️] [🗑️] │
│     Main company projects       │
│                                 │
│  📁  5        👥  12      ⏱️  42.5h │
│     Projects  Members    Total   │
└─────────────────────────────────┘
```

**Empty State:**
```
🏢
No Organizations Yet
Create your first organization to group related projects together.
[+ Create Organization]
```

### Project Cards with Organization

```
┌──────────────────────────────────┐
│                   🏢 Ojohsy Org   │ ← Organization Badge
│  Jaja Project                     │
│  Tags: web, frontend              │
│  ⏱️ 12.5 hours │ 8 entries        │
│  [Edit] [Delete] [Team]           │
└──────────────────────────────────┘
```

## Security & Permissions

### Row Level Security (RLS)

**Organizations:**
- Users can view organizations they're members of
- Users can create organizations (become owner)
- Owners and admins can update organizations
- Only creators can delete organizations

**Organization Members:**
- Members can view other members in their organizations
- Owners and admins can add/remove members
- Owners and admins can update member roles

**Projects:**
- Organization members can view organization projects
- Organization members can create projects in their organizations
- Standard project permissions still apply

### Permission Matrix

| Action | Owner | Admin | Member | Non-Member |
|--------|-------|-------|---------|------------|
| View Org | ✅ | ✅ | ✅ | ❌ |
| Edit Org | ✅ | ✅ | ❌ | ❌ |
| Delete Org | ✅ | ❌ | ❌ | ❌ |
| Add Members | ✅ | ✅ | ❌ | ❌ |
| Create Projects | ✅ | ✅ | ✅ | ❌ |
| View Projects | ✅ | ✅ | ✅ | ❌ |

## API Reference

### Get All Organizations
```typescript
const { data } = await supabase
  .from('organizations')
  .select('*')
  .order('name');
```

### Create Organization
```typescript
const { data, error } = await supabase
  .from('organizations')
  .insert({
    name: 'Ojohsy Org',
    description: 'Main company projects',
    created_by: user.id
  })
  .select();
```

### Get Organization Stats
```typescript
// Get project count
const { count } = await supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId);

// Get member count
const { count } = await supabase
  .from('organization_members')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId);

// Get total hours
const { data } = await supabase
  .from('organization_time_stats')
  .select('total_hours')
  .eq('organization_id', orgId);
```

### Create Project in Organization
```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    user_id: user.id,
    organization_id: 'org-uuid', // or null for personal
    name: 'Jaja Project',
    tags: 'web, frontend',
    description: 'New project description'
  })
  .select();
```

### Get Organization Projects
```typescript
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('organization_id', orgId)
  .order('name');
```

## Reporting & Analytics

### Time by Organization
```typescript
const { data } = await supabase
  .from('organization_time_stats')
  .select('*')
  .order('total_hours', { ascending: false });

// Results:
// [
//   {
//     organization_id: 'uuid',
//     organization_name: 'Ojohsy Org',
//     project_id: 'uuid',
//     project_name: 'Jaja Project',
//     entry_count: 42,
//     total_hours: 87.5
//   },
//   ...
// ]
```

### Aggregate by Organization
```sql
SELECT 
  organization_name,
  SUM(total_hours) as org_total_hours,
  COUNT(DISTINCT project_id) as project_count
FROM organization_time_stats
GROUP BY organization_name
ORDER BY org_total_hours DESC;
```

## Future Enhancements

### Planned Features
- **Organization Settings**: Configure defaults, permissions
- **Organization Invites**: Invite users via email to join org
- **Organization Dashboard**: Dedicated page for each org
- **Billing Integration**: Track time for client billing per org
- **Organization Reports**: Detailed analytics per organization
- **Member Permissions**: Fine-grained per-project permissions
- **Organization Templates**: Create project templates per org
- **Multi-Organization Views**: Compare metrics across orgs
- **Organization Archiving**: Archive inactive organizations
- **Organization Export**: Export all org data

### Potential Improvements
- Nested organizations (departments within companies)
- Organization branding (colors, logos)
- Organization-level tags and categories
- Organization calendar and milestones
- Cross-organization collaboration
- Organization-wide announcements

## Troubleshooting

### Projects not showing in organization
**Check:**
1. Project has `organization_id` set
2. User is member of the organization
3. RLS policies are active

### Cannot create organization
**Verify:**
1. User is logged in and approved
2. User has `is_active = true`
3. Run: `SELECT * FROM user_profiles WHERE id = auth.uid()`

### Organization stats not loading
**Debug:**
1. Check view exists: `SELECT * FROM organization_time_stats`
2. Verify time entries exist for projects
3. Check projects have `organization_id` set

### Migration errors
**Solutions:**
- Run migration in order (top to bottom)
- Check for existing table conflicts
- Verify Supabase project has sufficient resources

## Best Practices

### Organizing Projects
- **By Client**: Create org per client
- **By Department**: Org for each department
- **By Product**: Group related product projects
- **Personal Projects**: Leave organization_id as null

### Naming Conventions
- Organizations: Use full names ("Ojohsy Organization")
- Projects: Be specific ("Jaja Web App", not just "Web")
- Descriptions: Include purpose and scope

### Member Management
- Grant "Admin" role to trusted team leads
- Keep "Owner" limited to organization creators
- Regularly review and update member lists
- Remove inactive members promptly

## Migration Checklist

- [ ] Run `migration-organizations.sql` in Supabase
- [ ] Verify tables created: `organizations`, `organization_members`
- [ ] Check column added: `projects.organization_id`
- [ ] Test RLS policies with different user roles
- [ ] Create test organization
- [ ] Create test project in organization
- [ ] Track time on organization project
- [ ] Verify statistics display correctly
- [ ] Test organization edit/delete
- [ ] Build frontend successfully
- [ ] Deploy to production

## Support

For issues or questions:
1. Check this documentation
2. Review `migration-organizations.sql` comments
3. Check Supabase logs for RLS errors
4. Verify user permissions in database

---

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Build**: ✅ Successful  
**Last Updated**: 2026-01-02
