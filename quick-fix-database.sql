-- Quick Fix Script - Adds Missing Columns to Existing Database
-- This will NOT delete any existing data
-- Run this in Supabase SQL Editor

-- ============================================
-- Add tags column to time_entries (if missing)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN tags text;
        RAISE NOTICE '✅ Added tags column to time_entries';
    ELSE
        RAISE NOTICE 'ℹ️  tags column already exists in time_entries';
    END IF;
END $$;

-- ============================================
-- Add project_id column to time_entries (if missing)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'project_id'
    ) THEN
        -- First check if projects table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'projects'
        ) THEN
            ALTER TABLE public.time_entries ADD COLUMN project_id uuid REFERENCES public.projects ON DELETE SET NULL;
            RAISE NOTICE '✅ Added project_id column to time_entries';
        ELSE
            RAISE NOTICE '⚠️  projects table does not exist. Create it first!';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  project_id column already exists in time_entries';
    END IF;
END $$;

-- ============================================
-- Fix UPDATE policy (ensure it exists and is correct)
-- ============================================
DO $$
BEGIN
    -- Drop and recreate update policy to ensure it's correct
    DROP POLICY IF EXISTS "Users can update own entries" ON public.time_entries;
    
    CREATE POLICY "Users can update own entries"
      ON public.time_entries FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Updated policy for time_entries';
END $$;

-- ============================================
-- Verify the fix
-- ============================================
SELECT '=== Time Entries Table Structure ===' as info;
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries'
ORDER BY ordinal_position;

-- Check if tags and project_id are there
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'time_entries' 
            AND column_name = 'tags'
        ) THEN '✅ tags column exists'
        ELSE '❌ tags column missing'
    END as tags_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'time_entries' 
            AND column_name = 'project_id'
        ) THEN '✅ project_id column exists'
        ELSE '❌ project_id column missing'
    END as project_id_status;

SELECT '✅ Fix script completed!' as status;
