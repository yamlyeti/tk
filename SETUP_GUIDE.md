# Time Keeping System - Complete Setup & Troubleshooting Guide

## 🎯 Current Issue
The app shows "Error starting timer" because the database is missing columns for `tags` and `project_id`.

## 🚀 Quick Fix (5 Minutes)

### Step 1: Run the Quick Fix Script
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Copy the ENTIRE contents of `quick-fix-database.sql`
6. Paste it into the editor
7. Click **"Run"** (or press Ctrl+Enter)

You should see output like:
```
✅ Added tags column to time_entries
✅ Added project_id column to time_entries
✅ Updated policy for time_entries
✅ Fix script completed!
```

### Step 2: Test the App
1. Refresh your time tracking app
2. Try creating a new time entry
3. It should work now!

### Step 3: Test Tags and Projects
1. Create a time entry
2. Click on "Add tags" to edit tags
3. Enter some tags and click Save
4. Create a project in the Projects tab
5. Go back to Time Tracker and assign a project to an entry

## 📊 Verification

Run this in SQL Editor to verify everything is set up:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
ORDER BY ordinal_position;
```

Expected columns:
- ✅ id (uuid)
- ✅ user_id (uuid)
- ✅ project_id (uuid) ← Should be here
- ✅ description (text)
- ✅ tags (text) ← Should be here
- ✅ start_time (timestamp)
- ✅ end_time (timestamp)
- ✅ duration (integer)
- ✅ created_at (timestamp)

## 🐛 Troubleshooting

### Still Getting Errors?

1. **Open Browser Console** (F12 → Console tab)
2. Try the action that's failing
3. Look for error messages in red
4. Copy the error message

Common errors and solutions:

#### Error: `column "tags" does not exist`
**Solution:** Run `quick-fix-database.sql` again

#### Error: `relation "public.projects" does not exist`
**Solution:** Projects table is missing. Run `complete-database-setup.sql`

#### Error: `new row violates row-level security policy`
**Solution:** Run this in SQL Editor:
```sql
DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;
CREATE POLICY "Users can update own entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Error: `insert or update on table "time_entries" violates foreign key constraint`
**Solution:** Projects table doesn't exist. Run `complete-database-setup.sql`

### Nuclear Option: Complete Fresh Start

If nothing works, start completely fresh (⚠️ DELETES ALL DATA):

1. Open `complete-database-setup.sql`
2. Uncomment lines 10-11 (remove the `--`):
   ```sql
   DROP TABLE IF EXISTS public.time_entries CASCADE;
   DROP TABLE IF EXISTS public.projects CASCADE;
   ```
3. Run the entire file in SQL Editor
4. Create a new account in the app (your old account data will be gone)

## 📁 SQL Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `quick-fix-database.sql` | Adds missing columns safely | **START HERE** - Keeps existing data |
| `complete-database-setup.sql` | Complete fresh setup | If quick fix doesn't work |
| `verify-database-schema.sql` | Check current structure | To see what you have |

## ✅ Success Checklist

After running the fix, you should be able to:
- ✅ Create new time entries
- ✅ Start and stop timers
- ✅ Add and edit tags on entries
- ✅ Create projects
- ✅ Assign projects to entries
- ✅ View dashboard with filters
- ✅ See time tracked per project

## 🆘 Need More Help?

1. Run `verify-database-schema.sql` to see your current setup
2. Check browser console for exact error messages
3. Share the error messages - they tell us exactly what's wrong!

The app is now built with enhanced error logging, so any issues will show detailed messages in the console.
