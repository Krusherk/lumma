-- ═══════════════════════════════════════
-- Multi-vault support + active vault session tracking
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Drop the unique constraint that enforced one vault per owner.
-- Replace with a plain index for lookup performance.
DROP INDEX IF EXISTS idx_payroll_companies_owner;
CREATE INDEX IF NOT EXISTS idx_payroll_companies_owner
  ON payroll_companies (lower(owner_address));

-- Track which vault is "active" for a given chat session.
-- Scoped per session so different browser tabs can manage different vaults.
CREATE TABLE IF NOT EXISTS payroll_active_vault (
  session_id   TEXT        PRIMARY KEY,
  owner_address TEXT       NOT NULL,
  company_id   UUID        NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_active_vault_owner
  ON payroll_active_vault (lower(owner_address));

ALTER TABLE payroll_active_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_vault_service" ON payroll_active_vault;
CREATE POLICY "active_vault_service" ON payroll_active_vault
  FOR ALL USING (true) WITH CHECK (true);
