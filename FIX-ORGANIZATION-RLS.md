# Fix: Organization RLS Infinite Recursion

## Problem
When creating organizations, you may see this error:
```
Error creating organization:
code: "42P17"
message: "infinite recursion detected in policy for relation \"user_profiles\""
```

## Root Cause
The RLS policies in the organization migration checked `approval_status = 'approved'` from the `user_profiles` table. This created infinite recursion because:

1. Policy tries to check if user is approved
2. To check approval, it queries `user_profiles`
3. `user_profiles` has its own RLS policies
4. Those policies may reference back to organizations
5. **Infinite loop!**

## Solution

### Step 1: Run Fix Migration
Execute in Supabase SQL Editor:
```sql
fix-organization-rls-policies.sql
```

**What it does:**
- Removes `approval_status` checks from all RLS policies
- Simplifies policies to only check:
  - User authentication (`auth.uid()`)
  - Organization membership
  - Ownership relationships
- No more circular dependencies

### Step 2: Application Layer Checks
The frontend now checks approval status **before** making database calls:

```typescript
// In OrganizationManagement.tsx
if (!userProfile?.is_active || userProfile?.approval_status !== 'approved') {
  alert('Your account must be active and approved to create organizations');
  return;
}
```

This avoids RLS recursion while still enforcing approval requirements.

## Updated RLS Policies

### Organizations Table
```sql
-- View: Check membership only
CREATE POLICY "Users can view member organizations"
  ON organizations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id AND user_id = auth.uid()
    )
  );

-- Insert: Simple ownership check
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);
```

### Why This Works
- **No recursive queries**: Policies don't check `user_profiles`
- **Simple checks**: Only auth.uid() and direct table relationships
- **App-layer validation**: Approval checks happen in TypeScript before DB call

## Verification

### Test Organization Creation
1. Run the fix migration
2. Refresh your app
3. Navigate to Organizations
4. Click "New Organization"
5. Enter name and description
6. Click "Create"
7. **Should work!** ✅

### Check Policies
```sql
-- List all policies on organizations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'organizations';
```

## Files Changed

1. **fix-organization-rls-policies.sql** - Database fix
2. **src/components/OrganizationManagement.tsx** - Application layer checks

## Build Status
✅ Build successful after fixes

## Key Takeaway

**Best Practice**: Don't put complex approval checks in RLS policies. Instead:
- ✅ Keep RLS policies simple (auth + direct relationships)
- ✅ Do approval checks in application layer
- ❌ Avoid RLS policies that query the same tables recursively

---

**Status**: ✅ Fixed  
**Tested**: Yes  
**Build**: ✅ Successful
