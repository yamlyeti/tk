-- Migration: add created_at column to project_members for compatibility
BEGIN;

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Backfill existing rows using added_at if present
UPDATE public.project_members
SET created_at = added_at
WHERE created_at IS NULL AND added_at IS NOT NULL;

COMMIT;

-- End migration
