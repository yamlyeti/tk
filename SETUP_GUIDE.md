# Quick Setup Guide

This guide will help you get the Time Keeping System running in under 10 minutes.

## Step 1: Install Dependencies

```bash
npm install
# or if you prefer bun
bun install
```

## Step 2: Set Up Supabase

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Enter a project name and database password
4. Wait for the project to be created (takes ~2 minutes)

### Create the Database Table

1. In your Supabase project, go to the "SQL Editor" tab
2. Click "New Query"
3. Copy and paste the contents of `supabase-setup.sql` from this repository
4. Click "Run" or press Ctrl+Enter
5. You should see "Success. No rows returned" - this is correct!

### Get Your API Credentials

1. Go to Project Settings (gear icon) > API
2. Copy the "Project URL" 
3. Copy the "anon public" key

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your text editor and replace the values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run the App

```bash
npm run dev
# or
bun run dev
```

Open your browser to http://localhost:5173

## Step 5: Test It Out

1. Click "Sign Up" and create an account with your email
2. Check your email for the confirmation link (check spam folder)
3. Click the confirmation link
4. Sign in with your credentials
5. Start tracking your time!

## Troubleshooting

### Email Confirmation Issues

If you don't want to deal with email confirmation during development:

1. Go to your Supabase project
2. Navigate to Authentication > Settings
3. Scroll to "Email Auth"
4. Toggle OFF "Enable email confirmations"
5. Now you can sign up and immediately sign in without email verification

### Database Connection Issues

If you see "Error starting timer" or similar messages:

1. Make sure you ran the SQL setup script from `supabase-setup.sql`
2. Verify your `.env` file has the correct credentials
3. Check that your Supabase project is active (not paused)
4. Restart your development server after changing `.env`

### Build Issues

If you see TypeScript or build errors:

```bash
# Clear the build cache
rm -rf node_modules dist
npm install
npm run build
```

## Next Steps

- **Deploy to Production**: Use Vercel, Netlify, or any static hosting
- **Mobile Access**: Open the deployed URL on your Android device
- **Add to Home Screen**: For app-like experience on mobile

## Support

For issues or questions, please check the main [README.md](./README.md) or open an issue on GitHub.
