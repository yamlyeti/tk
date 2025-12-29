# tk - Time Keeping System

A modern time tracking application built with React, TypeScript, and Supabase. Track your work hours with an intuitive interface that works on web and mobile devices.

## Features

- ✅ User authentication (Sign up, Sign in, Sign out)
- ⏱️ Start/Stop timer for tracking work sessions
- 📝 Add descriptions to time entries
- 📊 View all time entries with start/end times and durations
- 🗑️ Delete completed time entries
- 📱 Responsive design for web and Android (via browser)
- 🔐 Secure authentication via Supabase

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Backend/Auth**: Supabase
- **Runtime**: Node.js or Bun
- **Styling**: CSS

## Prerequisites

- Node.js (v18+) or Bun
- A Supabase account and project

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yamlyeti/tk.git
cd tk
```

### 2. Install dependencies

Using npm:
```bash
npm install
```

Or using bun:
```bash
bun install
```

### 3. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings > API to get your credentials
4. Create the database table by running this SQL in the SQL Editor:

```sql
-- Create time_entries table
create table public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.time_entries enable row level security;

-- Create policy for users to see only their own entries
create policy "Users can view own entries"
  on public.time_entries for select
  using (auth.uid() = user_id);

-- Create policy for users to insert their own entries
create policy "Users can insert own entries"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

-- Create policy for users to update their own entries
create policy "Users can update own entries"
  on public.time_entries for update
  using (auth.uid() = user_id);

-- Create policy for users to delete their own entries
create policy "Users can delete own entries"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- Create index for better performance
create index time_entries_user_id_idx on public.time_entries(user_id);
create index time_entries_start_time_idx on public.time_entries(start_time desc);
```

### 4. Configure environment variables

1. Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run the development server

Using npm:
```bash
npm run dev
```

Or using bun:
```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
# or
bun run build
```

The production-ready files will be in the `dist` directory.

## Usage

1. **Sign Up**: Create a new account with your email and password
2. **Sign In**: Log in with your credentials
3. **Start Tracking**: Enter what you're working on and click "Start"
4. **Stop Tracking**: Click "Stop" when you're done
5. **View Entries**: See all your time entries with durations
6. **Delete Entries**: Remove completed entries you no longer need

## Mobile Usage (Android)

The app is fully responsive and works great in mobile browsers:

1. Open the app URL in Chrome or any modern browser on your Android device
2. Optionally, add it to your home screen for a native app-like experience:
   - Open the menu (three dots)
   - Select "Add to Home screen"
   - The app will now launch like a native app

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint the code

## License

MIT
