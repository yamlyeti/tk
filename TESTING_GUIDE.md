# Testing and Viewing Guide

This guide explains how to test and view the Time Keeping System application.

## Option 1: Quick Demo (No Setup Required)

If you just want to see what the app looks like without setting up Supabase:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Navigate to http://localhost:5173
   - You'll see the authentication screen
   - The UI will be visible but won't be functional without Supabase

**What you'll see:** The login/signup interface with a beautiful gradient background.

## Option 2: Full Functional Test (With Supabase)

To test the full functionality, you need to set up Supabase first.

### Step 1: Set Up Supabase (One-Time Setup)

1. **Create a free Supabase account:**
   - Go to https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub, Google, or email

2. **Create a new project:**
   - Click "New Project"
   - Choose an organization (or create one)
   - Enter a project name (e.g., "tk-time-keeper")
   - Create a strong database password (save this!)
   - Select a region close to you
   - Click "Create new project"
   - Wait ~2 minutes for setup to complete

3. **Set up the database:**
   - Once your project is ready, click "SQL Editor" in the sidebar
   - Click "New Query"
   - Open `supabase-setup.sql` from this repository
   - Copy ALL the SQL content and paste it into the query editor
   - Click "Run" or press Ctrl/Cmd + Enter
   - You should see "Success. No rows returned" ✓

4. **Get your API credentials:**
   - Click the gear icon (Project Settings) in the sidebar
   - Click "API" in the settings menu
   - Find these two values:
     - **Project URL** (looks like: `https://abcdefghijklm.supabase.co`)
     - **anon public key** (long string starting with `eyJ...`)
   - Keep this page open!

### Step 2: Configure the Application

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your credentials:**
   ```bash
   # Use your favorite editor (nano, vim, VS Code, etc.)
   nano .env
   ```
   
   Replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-starting-with-eyJ
   ```
   
   Save and exit.

### Step 3: Run the Application

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   VITE v7.3.0  ready in XXX ms
   ➜  Local:   http://localhost:5173/
   ```

2. **Open in your browser:**
   - Go to http://localhost:5173
   - You should see the login/signup screen

### Step 4: Test the Application

#### A. Test Authentication

1. **Sign Up:**
   - Click "Don't have an account? Sign Up"
   - Enter an email address (can be any valid email format)
   - Enter a password (minimum 6 characters)
   - Click "Sign Up"
   - Check your email for a confirmation link
   - Click the confirmation link

   **Note:** If you don't want to use email confirmation during testing:
   - Go to your Supabase project
   - Navigate to Authentication > Settings
   - Find "Email Auth" section
   - Toggle OFF "Enable email confirmations"
   - Now you can sign up and immediately sign in without email verification

2. **Sign In:**
   - Enter your email and password
   - Click "Sign In"
   - You should be redirected to the time tracking interface

#### B. Test Time Tracking

1. **Start a timer:**
   - In the "What are you working on?" field, type a task (e.g., "Writing documentation")
   - Click the "Start" button
   - You should see:
     - The timer display showing 00:00:00 and counting up
     - A "Stop" button
     - Your task description displayed below
     - The input field is now disabled

2. **Watch the timer:**
   - The timer updates every second
   - Let it run for at least 10-15 seconds to see meaningful duration

3. **Stop the timer:**
   - Click the "Stop" button
   - The timer stops and the entry appears in the "Time Entries" section below
   - You can now start a new timer

4. **Create multiple entries:**
   - Start and stop several timers with different descriptions
   - All entries appear in chronological order (newest first)

#### C. Test Entry Management

1. **View entries:**
   - Each entry shows:
     - Description/task name
     - Start time
     - End time
     - Total duration (HH:MM:SS format)

2. **Delete an entry:**
   - Click the "Delete" button on any completed entry
   - The entry is removed immediately
   - **Note:** You cannot delete an active (running) entry

#### D. Test Error Handling

1. **Try starting without description:**
   - Leave the input field empty
   - The "Start" button should be disabled

2. **Test sign out:**
   - Click the "Sign Out" button in the top right
   - You should be redirected back to the login screen

### Step 5: Test Responsive Design

#### Desktop
- Resize your browser window
- The layout should adapt smoothly

#### Mobile/Tablet
1. **Using browser dev tools:**
   - Press F12 to open developer tools
   - Click the device toggle button (looks like a phone/tablet icon)
   - Select different device sizes (iPhone, iPad, etc.)
   - The interface should remain usable and attractive

2. **On actual mobile device:**
   - If you've deployed the app, open it on your phone
   - Or use your local IP address: http://YOUR_LOCAL_IP:5173
   - To find your local IP:
     ```bash
     # On Mac/Linux:
     ifconfig | grep "inet "
     # On Windows:
     ipconfig
     ```
   - Make sure your phone is on the same WiFi network

## What You Should See

### Login/Signup Screen
- Clean gradient background (purple/blue)
- White card with form fields
- Toggle between Sign In and Sign Up

### Time Tracker Interface
- Header with app name and user email
- Large input field for task description
- Start button (or timer display with Stop button when active)
- List of all time entries with timestamps and durations
- Delete buttons for completed entries

## Troubleshooting

### "Failed to fetch" or Connection Errors
- Check that your .env file has the correct credentials
- Verify the Supabase project is active (not paused)
- Restart the dev server after changing .env

### Email Confirmation Not Arriving
- Check spam folder
- Or disable email confirmation in Supabase settings (see above)

### "Error starting timer" Message
- Verify you ran the SQL setup script in Supabase
- Check that the time_entries table exists in your database
- Look at browser console (F12) for detailed error messages

### Port 5173 Already in Use
```bash
# Kill the process using the port
# On Mac/Linux:
lsof -ti:5173 | xargs kill -9
# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

## Building for Production

To create a production build:

```bash
npm run build
```

This creates a `dist/` folder with optimized files ready for deployment.

To preview the production build locally:

```bash
npm run preview
```

## Running Tests

Currently, this project uses manual testing. To verify code quality:

```bash
# Check for linting errors
npm run lint

# Verify TypeScript compilation
npm run build
```

## Next Steps After Testing

Once you've verified everything works:

1. **Deploy to production** (see README.md for deployment options)
2. **Use on mobile** by accessing the deployed URL
3. **Add to home screen** on Android for app-like experience
4. **Start tracking your time!**

## Questions?

- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions
- See [FEATURES.md](./FEATURES.md) for complete feature documentation
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) if you want to contribute
