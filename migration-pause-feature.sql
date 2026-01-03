-- Add pause/resume functionality to time entries
-- Run this in Supabase SQL Editor

-- Add paused_duration column (stores total paused time in seconds)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'paused_duration'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN paused_duration integer DEFAULT 0;
        RAISE NOTICE '✅ Added paused_duration column to time_entries';
    ELSE
        RAISE NOTICE 'ℹ️  paused_duration column already exists in time_entries';
    END IF;
END $$;

-- Add is_paused column (boolean flag for current pause state)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'is_paused'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN is_paused boolean DEFAULT false;
        RAISE NOTICE '✅ Added is_paused column to time_entries';
    ELSE
        RAISE NOTICE 'ℹ️  is_paused column already exists in time_entries';
    END IF;
END $$;

-- Add pause_start_time column (tracks when the current pause started)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'pause_start_time'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN pause_start_time timestamp with time zone;
        RAISE NOTICE '✅ Added pause_start_time column to time_entries';
    ELSE
        RAISE NOTICE 'ℹ️  pause_start_time column already exists in time_entries';
    END IF;
END $$;

-- Verify the additions
SELECT '=== Pause Feature Columns ===' as info;
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries'
AND column_name IN ('paused_duration', 'is_paused', 'pause_start_time')
ORDER BY column_name;

SELECT '✅ Pause/resume feature columns added successfully!' as status;
