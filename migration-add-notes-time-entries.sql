-- ============================================================================
-- ADD NOTES TO TIME ENTRIES
-- ============================================================================
-- This migration adds a notes field to time_entries for detailed comments
-- ============================================================================

-- Add notes column to time_entries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN notes text;
  END IF;
END $$;

-- Add index for notes search (if you want to search notes later)
CREATE INDEX IF NOT EXISTS time_entries_notes_idx ON public.time_entries USING gin(to_tsvector('english', notes));

-- Add comment for documentation
COMMENT ON COLUMN public.time_entries.notes IS 
  'Detailed notes or comments about this time entry. Can include meeting notes, task details, etc.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Usage:
-- - notes is optional (nullable)
-- - Can store any length of text
-- - Full-text search enabled via GIN index
-- ============================================================================
