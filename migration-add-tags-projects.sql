-- Migration script to add tags and project_id columns if they don't exist
-- Run this in your Supabase SQL Editor

-- Add tags column to time_entries if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN tags text;
        RAISE NOTICE 'Added tags column to time_entries';
    ELSE
        RAISE NOTICE 'tags column already exists in time_entries';
    END IF;
END $$;

-- Add project_id column to time_entries if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN project_id uuid REFERENCES public.projects;
        RAISE NOTICE 'Added project_id column to time_entries';
    ELSE
        RAISE NOTICE 'project_id column already exists in time_entries';
    END IF;
END $$;

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries' 
AND column_name IN ('tags', 'project_id')
ORDER BY column_name;
