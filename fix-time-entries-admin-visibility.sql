-- Ensure admins can read all time entries (for project hour totals + invoicing)
BEGIN;

DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view team entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view own entries" ON public.time_entries;

CREATE POLICY "Users can view time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_project_member(project_id)
    OR public.is_admin()
  );

COMMIT;
