-- Time Keeping System - Supabase Database Setup
-- Run this in your Supabase SQL Editor

-- Create time_entries table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  tags text,
  description text,
  github_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security for projects
alter table public.projects enable row level security;

-- Create policy for users to see only their own projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

-- Create policy for users to insert their own projects
create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

-- Create policy for users to update their own projects
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

-- Create policy for users to delete their own projects
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

create table public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  project_id uuid references public.projects,
  description text not null,
  tags text,
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
