-- Complete Database Diagnostic and Fix Script
-- Run this in Supabase SQL Editor

-- Step 1: Check if user_profiles table exists and show its structure
DO $$
BEGIN
    RAISE NOTICE '=== Checking user_profiles table ===';
END $$;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Check if projects table exists and show its structure
DO $$
BEGIN
    RAISE NOTICE '=== Checking projects table ===';
END $$;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Step 3: Check if time_entries table exists
DO $$
BEGIN
    RAISE NOTICE '=== Checking time_entries table ===';
END $$;

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'time_entries'
ORDER BY ordinal_position;

-- Step 4: Check if organizations table exists
DO $$
BEGIN
    RAISE NOTICE '=== Checking organizations table ===';
END $$;

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- Step 5: Check if organization_members table exists
DO $$
BEGIN
    RAISE NOTICE '=== Checking organization_members table ===';
END $$;

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

-- Step 6: Check current RLS policies on user_profiles
DO $$
BEGIN
    RAISE NOTICE '=== Checking RLS policies on user_profiles ===';
END $$;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';
