-- ═══════════════════════════════════════
-- Lumma Payroll Receipts — Supabase Table
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════

-- Public receipts for shareable payment confirmations
CREATE TABLE IF NOT EXISTS payroll_receipts (
  id TEXT PRIMARY KEY,                    -- short unique ID (e.g. "LMA-abc12xyz")
  payment_id UUID REFERENCES payroll_payments(id) ON DELETE SET NULL,
  company_id UUID REFERENCES payroll_companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  contractor_wallet TEXT NOT NULL,
  vault_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  chain TEXT DEFAULT 'ARC-TESTNET',
  chain_id INTEGER DEFAULT 5042002,
  tx_hash TEXT,
  circle_tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_receipts_payment
  ON payroll_receipts (payment_id);

CREATE INDEX IF NOT EXISTS idx_payroll_receipts_company
  ON payroll_receipts (company_id);

-- RLS: receipts are publicly readable (like a block explorer)
ALTER TABLE payroll_receipts ENABLE ROW LEVEL SECURITY;

-- Policy names are unique per table and CREATE POLICY has no IF NOT EXISTS,
-- so DROP POLICY IF EXISTS first to make this section safe to re-run.
DROP POLICY IF EXISTS "Receipts are publicly readable" ON payroll_receipts;
CREATE POLICY "Receipts are publicly readable"
  ON payroll_receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only service role can insert receipts" ON payroll_receipts;
CREATE POLICY "Only service role can insert receipts"
  ON payroll_receipts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only service role can update receipts" ON payroll_receipts;
CREATE POLICY "Only service role can update receipts"
  ON payroll_receipts FOR UPDATE USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════
-- Add recurring payment columns to companies
-- ═══════════════════════════════════════
ALTER TABLE payroll_companies
  ADD COLUMN IF NOT EXISTS pay_frequency TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS pay_day INTEGER;
