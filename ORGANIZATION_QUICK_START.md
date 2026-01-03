# Quick Start: Organization Feature

## 🚀 3-Step Setup

### Step 1: Run Migration
1. Open Supabase SQL Editor
2. Copy entire contents of `migration-organizations.sql`
3. Click "Run"
4. Wait for success ✅

### Step 2: Verify
```sql
-- Check tables exist
SELECT * FROM organizations LIMIT 1;
SELECT * FROM organization_members LIMIT 1;

-- Check column added
SELECT id, name, organization_id FROM projects LIMIT 5;
```

### Step 3: Use It!
```bash
npm run dev
```

## 📋 What You Get

### New Hierarchy
```
Organization (e.g., "Ojohsy Org")
  └─ Projects (e.g., "Jaja Project", "Another Project")
      └─ Time Entries
```

### New Features
- 🏢 **Organizations Page**: Create and manage organizations
- 📁 **Org Selector**: Link projects to organizations
- 🏷️ **Org Badges**: Projects show their organization
- 📊 **Org Stats**: Projects, members, and time per org

## 🎯 Quick Usage

### Create Organization
1. Click **🏢 Organizations** tab
2. Click **"New Organization"**
3. Enter name: `Ojohsy Org`
4. Enter description (optional)
5. Click **"Create"**

### Link Project to Org
1. Go to **📁 Projects** tab
2. In "Create New Project":
   - Select **Organization**: `Ojohsy Org`
   - Enter **Project Name**: `Jaja Project`
   - Fill other fields
3. Click **"Add Project"**

Project now shows: 🏢 Ojohsy Org badge

### Track Time
1. Go to **⏱️ Time Tracker**
2. Select project: `Jaja Project`
3. Start tracking
4. Time is linked: Org → Project → Entry

## 📊 View Organization Stats

Each org card shows:
- 📁 **5 Projects** - Total projects in org
- 👥 **12 Members** - Members with access
- ⏱️ **42.5h** - Total time across all projects

## 🔑 Key Files

1. **migration-organizations.sql** → Run this first!
2. **ORGANIZATION_FEATURE.md** → Full documentation
3. **src/components/OrganizationManagement.tsx** → UI component

## ✅ Success Checklist

- [x] Build successful (✅ Verified)
- [ ] Migration executed in Supabase
- [ ] Created test organization
- [ ] Linked project to organization
- [ ] Tracked time on org project
- [ ] Viewed organization stats

## 💡 Pro Tips

- Personal projects: Leave org as "No Organization"
- Client work: One org per client
- Internal: One org for company projects
- Organization badge appears automatically

## 🐛 Quick Fixes

**Can't see Organizations tab?**
→ Refresh page after migration

**Projects not showing org badge?**
→ Check `organization_id` is set in database

**Can't create organization?**
→ User must be approved and active

---

Need more details? See **ORGANIZATION_FEATURE.md**
