-- Migration: Issue Tracking + Persisted Invoices
-- Description: Adds a customer issue/ticket tracker (baseline problem, resolution,
-- quoted flat-fee cost) and turns invoicing from an ephemeral on-screen report into
-- real persisted records so invoices can be reprinted and tracked as paid/unpaid.
-- Invoices can mix hourly time-entry line items (existing billing) with flat-fee
-- issue line items (new) and ad hoc custom line items (existing "discount" feature).
-- Date: 2026-08-27

BEGIN;

-- ============================================================================
-- TABLE: issues
-- A customer-reported problem, tracked from intake through resolution to billing.
-- "Customer" is represented by the existing organizations table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT, -- the baseline: what the customer reported / what's broken
  reported_by TEXT, -- customer contact name, free text (no login system)

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'billed', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  resolution_notes TEXT, -- what was actually fixed
  remaining_work TEXT,   -- what still needs to be done, if anything

  quoted_amount NUMERIC(10, 2) CHECK (quoted_amount IS NULL OR quoted_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  billing_type TEXT NOT NULL DEFAULT 'flat'
    CHECK (billing_type IN ('flat', 'hourly', 'unbilled')),

  invoice_id UUID, -- set once billed; FK added after invoices table exists below

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

COMMENT ON TABLE issues IS 'Customer-reported issues/tickets: baseline problem, resolution, and a quoted flat-fee cost to bill.';
COMMENT ON COLUMN issues.description IS 'Baseline: the problem as the customer reported it';
COMMENT ON COLUMN issues.resolution_notes IS 'What was actually fixed';
COMMENT ON COLUMN issues.remaining_work IS 'What still needs to be fixed, if anything';
COMMENT ON COLUMN issues.quoted_amount IS 'Flat-fee quote/estimate to fix, independent of hours';

CREATE INDEX IF NOT EXISTS idx_issues_organization_id ON issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_invoice_id ON issues(invoice_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);

-- ============================================================================
-- TABLE: invoices
-- Persisted invoice header. Replaces the old generate-in-memory-and-email flow.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE
    DEFAULT ('INV-' || lpad(nextval('invoice_number_seq')::text, 5, '0')),

  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'void')),

  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  period_start DATE,
  period_end DATE,

  recipient_name TEXT,
  recipient_email TEXT,

  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  note TEXT,

  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Persisted invoice header. Line items live in invoice_line_items.';

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);

ALTER TABLE issues
  ADD CONSTRAINT issues_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================================================
-- TABLE: invoice_line_items
-- Snapshot of what was billed. 'time' items summarize hourly work (per user),
-- 'issue' items are flat-fee and link back to the issue, 'custom' items are
-- free-form (e.g. discounts) same as the old in-memory line items.
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('time', 'issue', 'custom')),
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2), -- hours, for 'time' items
  rate NUMERIC(10, 2),     -- hourly rate, for 'time' items
  amount NUMERIC(10, 2) NOT NULL,

  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_issue_id ON invoice_line_items(issue_id);

-- ============================================================================
-- RLS
-- Mirrors the organizations table's policy shape (creator, org admin, or
-- super admin). is_org_admin / is_super_admin are defined in
-- migration-billable-rates.sql and are SECURITY DEFINER to avoid recursion.
-- ============================================================================

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- issues
DROP POLICY IF EXISTS "Users can view issues for their organizations" ON issues;
CREATE POLICY "Users can view issues for their organizations"
  ON issues FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
    OR is_org_admin(auth.uid(), organization_id)
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can create issues for their organizations" ON issues;
CREATE POLICY "Users can create issues for their organizations"
  ON issues FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
      OR is_org_admin(auth.uid(), organization_id)
      OR is_super_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update issues for their organizations" ON issues;
CREATE POLICY "Users can update issues for their organizations"
  ON issues FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
    OR is_org_admin(auth.uid(), organization_id)
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete issues for their organizations" ON issues;
CREATE POLICY "Users can delete issues for their organizations"
  ON issues FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
    OR is_org_admin(auth.uid(), organization_id)
    OR is_super_admin(auth.uid())
  );

-- invoices
DROP POLICY IF EXISTS "Users can view their invoices" ON invoices;
CREATE POLICY "Users can view their invoices"
  ON invoices FOR SELECT
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()))
    OR (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
CREATE POLICY "Users can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their invoices" ON invoices;
CREATE POLICY "Users can update their invoices"
  ON invoices FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()))
    OR (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their invoices" ON invoices;
CREATE POLICY "Users can delete their invoices"
  ON invoices FOR DELETE
  USING (created_by = auth.uid() OR is_super_admin(auth.uid()));

-- invoice_line_items (access follows the parent invoice)
DROP POLICY IF EXISTS "Users can view line items for accessible invoices" ON invoice_line_items;
CREATE POLICY "Users can view line items for accessible invoices"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
        AND (
          i.created_by = auth.uid()
          OR (i.organization_id IS NOT NULL AND is_org_admin(auth.uid(), i.organization_id))
          OR is_super_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Users can manage line items for their invoices" ON invoice_line_items;
CREATE POLICY "Users can manage line items for their invoices"
  ON invoice_line_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.created_by = auth.uid())
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.created_by = auth.uid())
    OR is_super_admin(auth.uid())
  );

-- ============================================================================
-- UPDATE TRIGGERS (reuses update_updated_at_column() from migration-billable-rates.sql)
-- ============================================================================

DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Verifying issues/invoices migration...';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'issues') THEN
    RAISE EXCEPTION 'issues table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    RAISE EXCEPTION 'invoices table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_line_items') THEN
    RAISE EXCEPTION 'invoice_line_items table missing';
  END IF;
  RAISE NOTICE 'OK: issues, invoices, invoice_line_items created.';
END $$;
