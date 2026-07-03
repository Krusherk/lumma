-- ═══════════════════════════════════════
-- Lumma Agent Payroll — Supabase Tables
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════

-- Companies / Employers
CREATE TABLE IF NOT EXISTS payroll_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_address TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Company',
  vault_address TEXT,
  vault_chain TEXT DEFAULT 'ARC-TESTNET',
  vault_wallet_id TEXT,
  pay_schedule TEXT NOT NULL DEFAULT 'manual' CHECK (pay_schedule IN ('manual', 'weekly', 'biweekly', 'monthly')),
  next_pay_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_companies_owner
  ON payroll_companies (lower(owner_address));

-- Contractors / Team members
CREATE TABLE IF NOT EXISTS payroll_contractors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  wallet_address TEXT NOT NULL,
  amount_usdc NUMERIC NOT NULL DEFAULT 0,
  chain_id INTEGER NOT NULL DEFAULT 5042002,
  role TEXT NOT NULL DEFAULT 'Contractor',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_contractors_company
  ON payroll_contractors (company_id);

-- Payment history
CREATE TABLE IF NOT EXISTS payroll_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES payroll_contractors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  paid_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_payments_company
  ON payroll_payments (company_id, paid_at DESC);

-- Invite links for contractor signup
CREATE TABLE IF NOT EXISTS payroll_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Contractor',
  amount_usdc NUMERIC NOT NULL DEFAULT 0,
  chain_id INTEGER NOT NULL DEFAULT 5042002,
  used_by TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_invites_token
  ON payroll_invites (token);

-- ═══════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════

ALTER TABLE payroll_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_invites ENABLE ROW LEVEL SECURITY;

-- Allow anon access for testnet (tighten for production)
CREATE POLICY "Allow all for anon" ON payroll_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payroll_contractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payroll_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payroll_invites FOR ALL USING (true) WITH CHECK (true);
