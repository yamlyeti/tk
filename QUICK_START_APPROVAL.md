# Quick Start: Admin Approval Feature

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `migration-user-approval.sql`
4. Click "Run"
5. Wait for success message

### Step 2: Verify Setup
```bash
# Check the new column exists
SELECT id, email, approval_status, is_active 
FROM user_profiles 
LIMIT 5;

# All existing users should show 'approved'
```

### Step 3: Test the Feature
```bash
npm run dev
```

Then:
1. **As New User**: Sign up → Receive pending message
2. **As Admin**: Navigate to "✅ Approvals" tab → Approve user
3. **As New User**: Login → Access granted! ✅

## 📋 What Changed?

### Database:
- ✅ New column: `user_profiles.approval_status`
- ✅ Updated RLS policies
- ✅ Modified trigger for new users

### Frontend:
- ✅ New "Approvals" tab (admin only)
- ✅ Login checks approval status
- ✅ Signup shows pending message

## 🎯 How It Works

```
New User Signup
    ↓
Email Confirmation
    ↓
Status: PENDING ⏳
    ↓
Cannot Login (blocked)
    ↓
Admin Approves ✅
    ↓
Status: APPROVED
    ↓
User Can Login! 🎉
```

## 🔑 Key Files

1. **migration-user-approval.sql** → Run this first
2. **src/components/UserApprovals.tsx** → Admin interface
3. **USER_APPROVAL_FEATURE.md** → Full documentation

## 💡 Quick Tips

- Existing users: Auto-approved ✅
- Admin access: Required for approval page
- Mobile friendly: Responsive design
- Security: Database-level protection

## ⚠️ Important

**Run the SQL migration before using the feature!** The app will build but won't work properly without the database changes.

## 🐛 Troubleshooting

**Issue**: Can't access approvals page
- **Fix**: Ensure you're logged in as admin

**Issue**: New users still can login
- **Fix**: Run the database migration

**Issue**: Existing users can't login
- **Fix**: Migration auto-approves them, but verify: `SELECT approval_status FROM user_profiles`

---

Need help? Check **USER_APPROVAL_FEATURE.md** for detailed docs!
