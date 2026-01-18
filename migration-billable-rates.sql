-- Migration: Billable Rate Tracking System
-- Description: Add project-specific and organization-level billable rate tracking
-- with rate history, SECURITY DEFINER helpers to avoid RLS recursion,
-- and billing views for reporting.
-- Date: 2026-01-18

BEGIN;

-- ============================================================================
-- TABLE: project_rates
-- Project-specific hourly rates for users with full rate history
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE CHECK (end_date IS NULL OR end_date >= effective_date),
  notes TEXT,
  set_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id, effective_date)
);

COMMENT ON TABLE project_rates IS 'Project-specific billable rates for team members with full history tracking';
COMMENT ON COLUMN project_rates.hourly_rate IS 'Hourly billable rate in specified currency';
COMMENT ON COLUMN project_rates.effective_date IS 'Date when this rate becomes effective';
COMMENT ON COLUMN project_rates.end_date IS 'Date when this rate was superseded (NULL for active rates)';
COMMENT ON COLUMN project_rates.set_by IS 'User who set this rate (admin/org admin/project admin)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_rates_project_id ON project_rates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rates_user_id ON project_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_project_rates_effective_date ON project_rates(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_rates_active ON project_rates(project_id, user_id) WHERE end_date IS NULL;

-- ============================================================================
-- TABLE: organization_default_rates
-- Organization-level default rates used as fallback when no project rate exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_default_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE CHECK (end_date IS NULL OR end_date >= effective_date),
  notes TEXT,
  set_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id, effective_date)
);

COMMENT ON TABLE organization_default_rates IS 'Organization-level default billable rates used as fallback';
COMMENT ON COLUMN organization_default_rates.hourly_rate IS 'Default hourly billable rate in specified currency';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_rates_organization_id ON organization_default_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_rates_user_id ON organization_default_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_org_rates_effective_date ON organization_default_rates(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_org_rates_active ON organization_default_rates(organization_id, user_id) WHERE end_date IS NULL;

-- ============================================================================
-- TRIGGER FUNCTION: end_previous_rate
-- Automatically sets end_date on previous rate when new rate is inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION end_previous_project_rate()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- End any previous active rate for this project/user combination
  UPDATE project_rates
  SET end_date = NEW.effective_date - INTERVAL '1 day',
      updated_at = NOW()
  WHERE project_id = NEW.project_id
    AND user_id = NEW.user_id
    AND end_date IS NULL
    AND effective_date < NEW.effective_date
    AND id != NEW.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION end_previous_org_rate()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- End any previous active rate for this organization/user combination
  UPDATE organization_default_rates
  SET end_date = NEW.effective_date - INTERVAL '1 day',
      updated_at = NOW()
  WHERE organization_id = NEW.organization_id
    AND user_id = NEW.user_id
    AND end_date IS NULL
    AND effective_date < NEW.effective_date
    AND id != NEW.id;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_end_previous_project_rate ON project_rates;
CREATE TRIGGER trigger_end_previous_project_rate
  AFTER INSERT ON project_rates
  FOR EACH ROW
  EXECUTE FUNCTION end_previous_project_rate();

DROP TRIGGER IF EXISTS trigger_end_previous_org_rate ON organization_default_rates;
CREATE TRIGGER trigger_end_previous_org_rate
  AFTER INSERT ON organization_default_rates
  FOR EACH ROW
  EXECUTE FUNCTION end_previous_org_rate();

-- ============================================================================
-- HELPER FUNCTION: get_active_project_rate (SECURITY DEFINER)
-- Returns the active rate for a user on a project at a specific date
-- Checks project rates first, falls back to organization rates
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_project_rate(
  p_project_id UUID,
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hourly_rate NUMERIC(10, 2),
  currency CHAR(3),
  rate_source TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- First check for project-specific rate
  RETURN QUERY
  SELECT
    pr.hourly_rate,
    pr.currency,
    'project'::TEXT as rate_source
  FROM project_rates pr
  WHERE pr.project_id = p_project_id
    AND pr.user_id = p_user_id
    AND pr.effective_date <= p_date
    AND (pr.end_date IS NULL OR pr.end_date >= p_date)
  ORDER BY pr.effective_date DESC
  LIMIT 1;

  -- If found, return
  IF FOUND THEN
    RETURN;
  END IF;

  -- Otherwise, check organization default rate
  RETURN QUERY
  SELECT
    odr.hourly_rate,
    odr.currency,
    'organization'::TEXT as rate_source
  FROM organization_default_rates odr
  JOIN projects p ON p.organization_id = odr.organization_id
  WHERE p.id = p_project_id
    AND odr.user_id = p_user_id
    AND odr.effective_date <= p_date
    AND (odr.end_date IS NULL OR odr.end_date >= p_date)
  ORDER BY odr.effective_date DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_active_project_rate IS 'Get active billable rate for user on project at specific date (SECURITY DEFINER to avoid RLS recursion)';

-- ============================================================================
-- HELPER FUNCTION: is_project_admin (SECURITY DEFINER)
-- Check if user is admin of a project
-- ============================================================================

CREATE OR REPLACE FUNCTION is_project_admin(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is project admin via project_members
  SELECT EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = p_user_id
      AND pm.role = 'admin'
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: is_org_admin (SECURITY DEFINER)
-- Check if user is admin of an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION is_org_admin(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is org admin via organization_members or created_by
  SELECT EXISTS (
    SELECT 1
    FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = p_user_id
    WHERE o.id = p_organization_id
      AND (o.created_by = p_user_id OR om.role = 'admin')
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: is_super_admin (SECURITY DEFINER)
-- Check if user has super_admin role
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin(
  p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = p_user_id
      AND role = 'super_admin'
  ) INTO v_is_super_admin;

  RETURN v_is_super_admin;
END;
$$;

-- ============================================================================
-- VIEW: current_project_rates
-- All active rates (end_date IS NULL) with source indication
-- ============================================================================

CREATE OR REPLACE VIEW current_project_rates AS
SELECT
  pr.id,
  pr.project_id,
  p.name as project_name,
  p.organization_id,
  pr.user_id,
  pr.hourly_rate,
  pr.currency,
  pr.effective_date,
  pr.notes,
  pr.set_by,
  pr.created_at,
  'project'::TEXT as rate_source
FROM project_rates pr
JOIN projects p ON p.id = pr.project_id
WHERE pr.end_date IS NULL

UNION ALL

SELECT
  odr.id,
  NULL as project_id,
  NULL as project_name,
  odr.organization_id,
  odr.user_id,
  odr.hourly_rate,
  odr.currency,
  odr.effective_date,
  odr.notes,
  odr.set_by,
  odr.created_at,
  'organization'::TEXT as rate_source
FROM organization_default_rates odr
WHERE odr.end_date IS NULL;

COMMENT ON VIEW current_project_rates IS 'All currently active rates (project-specific and organization defaults)';

-- ============================================================================
-- VIEW: billable_time_entries
-- Time entries with calculated billable amounts using historical rates
-- ============================================================================

CREATE OR REPLACE VIEW billable_time_entries AS
SELECT
  te.id,
  te.user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
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
LEFT JOIN auth.users u ON u.id = te.user_id
LEFT JOIN projects p ON p.id = te.project_id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE te.duration IS NOT NULL
  AND te.end_time IS NOT NULL;

COMMENT ON VIEW billable_time_entries IS 'Time entries with calculated billable amounts using historical rates based on start_time';

-- ============================================================================
-- RLS POLICIES: project_rates
-- ============================================================================

ALTER TABLE project_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own project rates" ON project_rates;
DROP POLICY IF EXISTS "Project admins can view project rates" ON project_rates;
DROP POLICY IF EXISTS "Organization admins can view org project rates" ON project_rates;
DROP POLICY IF EXISTS "Super admins can view all project rates" ON project_rates;
DROP POLICY IF EXISTS "Project admins can manage project rates" ON project_rates;
DROP POLICY IF EXISTS "Organization admins can manage org project rates" ON project_rates;
DROP POLICY IF EXISTS "Super admins can manage all project rates" ON project_rates;

-- View policies
CREATE POLICY "Users can view their own project rates"
  ON project_rates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Project admins can view project rates"
  ON project_rates FOR SELECT
  USING (is_project_admin(auth.uid(), project_id));

CREATE POLICY "Organization admins can view org project rates"
  ON project_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND is_org_admin(auth.uid(), p.organization_id)
    )
  );

CREATE POLICY "Super admins can view all project rates"
  ON project_rates FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Manage policies (INSERT, UPDATE, DELETE)
CREATE POLICY "Project admins can manage project rates"
  ON project_rates FOR ALL
  USING (is_project_admin(auth.uid(), project_id))
  WITH CHECK (is_project_admin(auth.uid(), project_id));

CREATE POLICY "Organization admins can manage org project rates"
  ON project_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND is_org_admin(auth.uid(), p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND is_org_admin(auth.uid(), p.organization_id)
    )
  );

CREATE POLICY "Super admins can manage all project rates"
  ON project_rates FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: organization_default_rates
-- ============================================================================

ALTER TABLE organization_default_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own org rates" ON organization_default_rates;
DROP POLICY IF EXISTS "Org members can view org rates" ON organization_default_rates;
DROP POLICY IF EXISTS "Organization admins can view org rates" ON organization_default_rates;
DROP POLICY IF EXISTS "Super admins can view all org rates" ON organization_default_rates;
DROP POLICY IF EXISTS "Organization admins can manage org rates" ON organization_default_rates;
DROP POLICY IF EXISTS "Super admins can manage all org rates" ON organization_default_rates;

-- View policies
CREATE POLICY "Users can view their own org rates"
  ON organization_default_rates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view org rates"
  ON organization_default_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_default_rates.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can view org rates"
  ON organization_default_rates FOR SELECT
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Super admins can view all org rates"
  ON organization_default_rates FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Manage policies (INSERT, UPDATE, DELETE)
CREATE POLICY "Organization admins can manage org rates"
  ON organization_default_rates FOR ALL
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage all org rates"
  ON organization_default_rates FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================================
-- UPDATE TRIGGERS: Maintain updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_project_rates_updated_at ON project_rates;
CREATE TRIGGER update_project_rates_updated_at
  BEFORE UPDATE ON project_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_rates_updated_at ON organization_default_rates;
CREATE TRIGGER update_org_rates_updated_at
  BEFORE UPDATE ON organization_default_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================

-- Check tables exist
DO $$
BEGIN
  RAISE NOTICE 'Verifying tables...';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_rates') THEN
    RAISE NOTICE '✓ project_rates table created';
  ELSE
    RAISE WARNING '✗ project_rates table NOT found';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_default_rates') THEN
    RAISE NOTICE '✓ organization_default_rates table created';
  ELSE
    RAISE WARNING '✗ organization_default_rates table NOT found';
  END IF;

  -- Check functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_project_rate') THEN
    RAISE NOTICE '✓ get_active_project_rate function created';
  ELSE
    RAISE WARNING '✗ get_active_project_rate function NOT found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_project_admin') THEN
    RAISE NOTICE '✓ is_project_admin helper created';
  ELSE
    RAISE WARNING '✗ is_project_admin helper NOT found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_admin') THEN
    RAISE NOTICE '✓ is_org_admin helper created';
  ELSE
    RAISE WARNING '✗ is_org_admin helper NOT found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
    RAISE NOTICE '✓ is_super_admin helper created';
  ELSE
    RAISE WARNING '✗ is_super_admin helper NOT found';
  END IF;

  -- Check views exist
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'current_project_rates') THEN
    RAISE NOTICE '✓ current_project_rates view created';
  ELSE
    RAISE WARNING '✗ current_project_rates view NOT found';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'billable_time_entries') THEN
    RAISE NOTICE '✓ billable_time_entries view created';
  ELSE
    RAISE WARNING '✗ billable_time_entries view NOT found';
  END IF;

  RAISE NOTICE 'Migration verification complete!';
END $$;

COMMIT;

-- ============================================================================
-- SAMPLE TEST QUERIES (Uncomment to test after migration)
-- ============================================================================

-- Test inserting a project rate
-- INSERT INTO project_rates (project_id, user_id, hourly_rate, currency, effective_date, set_by)
-- VALUES ('your-project-id', 'your-user-id', 150.00, 'USD', CURRENT_DATE, auth.uid());

-- Test getting active rate
-- SELECT * FROM get_active_project_rate('your-project-id', 'your-user-id', CURRENT_DATE);

-- Test viewing current rates
-- SELECT * FROM current_project_rates LIMIT 10;

-- Test billable time entries view
-- SELECT * FROM billable_time_entries WHERE start_time >= CURRENT_DATE - INTERVAL '7 days';

-- Test rate history (inserting new rate should end previous one)
-- INSERT INTO project_rates (project_id, user_id, hourly_rate, currency, effective_date, set_by)
-- VALUES ('your-project-id', 'your-user-id', 175.00, 'USD', CURRENT_DATE, auth.uid());
-- SELECT * FROM project_rates WHERE project_id = 'your-project-id' AND user_id = 'your-user-id' ORDER BY effective_date DESC;
