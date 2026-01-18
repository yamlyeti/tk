-- Fix billable_time_entries view to use user_profiles instead of auth metadata
-- This ensures the full_name is pulled from the user_profiles table

-- Drop the existing view first
DROP VIEW IF EXISTS billable_time_entries;

-- Recreate the view with user_profiles join
CREATE VIEW billable_time_entries AS
SELECT
  te.id,
  te.user_id,
  COALESCE(u.email, au.email)::VARCHAR(255) as email,
  u.full_name,
  te.project_id,
  p.name as project_name,
  p.organization_id,
  o.name as organization_name,
  te.description,
  te.notes,
  te.tags,
  te.start_time,
  te.end_time,
  te.duration,
  te.created_at,
  -- Calculate hours from duration (duration is in seconds)
  ROUND(CAST(te.duration AS NUMERIC) / 3600, 2) as hours,
  -- Get rate using helper function (SECURITY DEFINER)
  (SELECT r.hourly_rate FROM get_active_project_rate(te.project_id, te.user_id, CAST(te.start_time AS DATE)) r) as hourly_rate,
  (SELECT r.currency FROM get_active_project_rate(te.project_id, te.user_id, CAST(te.start_time AS DATE)) r) as currency,
  (SELECT r.rate_source FROM get_active_project_rate(te.project_id, te.user_id, CAST(te.start_time AS DATE)) r) as rate_source,
  -- Calculate billable amount
  ROUND(
    (CAST(te.duration AS NUMERIC) / 3600) *
    COALESCE((SELECT r.hourly_rate FROM get_active_project_rate(te.project_id, te.user_id, CAST(te.start_time AS DATE)) r), 0),
    2
  ) as billable_amount
FROM time_entries te
LEFT JOIN user_profiles u ON u.id = te.user_id
LEFT JOIN auth.users au ON au.id = te.user_id
LEFT JOIN projects p ON p.id = te.project_id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE te.duration IS NOT NULL
  AND te.end_time IS NOT NULL;

COMMENT ON VIEW billable_time_entries IS 'Time entries with calculated billable amounts using historical rates based on start_time. Uses user_profiles for full_name.';

