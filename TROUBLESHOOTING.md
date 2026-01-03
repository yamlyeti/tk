# Troubleshooting Tags and Projects Not Saving

## Problem
Tags and projects are not saving/persisting when edited on time entries.

## Step-by-Step Fix

### Step 1: Verify Database Schema
Run `verify-database-schema.sql` in your Supabase SQL Editor to check if the columns exist.

**Expected output for time_entries:**
- Should include columns: `id`, `user_id`, `description`, `tags`, `project_id`, `start_time`, `end_time`, `duration`, `created_at`

### Step 2: Add Missing Columns (if needed)
If `tags` or `project_id` columns are missing, run `migration-add-tags-projects.sql` in Supabase SQL Editor.

### Step 3: Check Browser Console
1. Open your app in the browser
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Try to edit tags or project on an entry
5. Look for console logs:
   - "Saving tags:" or "Saving project:"
   - "Tags updated successfully" or error messages

### Step 4: Common Issues and Solutions

#### Issue: Column doesn't exist error
**Solution:** Run the migration script from Step 2

#### Issue: "new row violates row-level security policy"
**Solution:** The UPDATE policy might be missing. Run this SQL:

```sql
-- Ensure update policy exists
DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;
CREATE POLICY "Users can update own entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Issue: No error but changes don't persist
**Possible causes:**
1. The `onUpdate()` callback isn't refreshing the data
2. The update succeeded but the UI isn't re-rendering
3. Caching issue

**Solution:** Check the console logs. If you see "updated successfully" but the UI doesn't change, the issue is with the refresh. Try hard refresh (Ctrl+Shift+R).

### Step 5: Manual Test
Try updating directly in Supabase:
1. Go to Supabase Dashboard → Table Editor
2. Open `time_entries` table
3. Find a row and try to edit the `tags` column manually
4. If you can't see the `tags` column, it doesn't exist - run the migration
5. If you can edit it manually but not from the app, it's a permission issue

### Step 6: Check Supabase Client Configuration
Verify your `.env` file or environment variables have correct Supabase credentials:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Testing After Fix
1. Create a new time entry
2. After it's created, click on "Add tags" to edit tags
3. Enter some tags and click Save
4. You should see "Saving..." then the tags should appear
5. Refresh the page - tags should still be there

## If Still Not Working
Check the browser console error message and look for:
- `column "tags" does not exist` → Run migration script
- `policy` errors → Run policy fix SQL above
- `permission denied` → Check RLS policies
- No errors but not saving → Check network tab for 200 response
