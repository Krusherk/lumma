-- ═══════════════════════════════════════
-- Lumma V2 — Agent Payroll Tables
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════

-- AI Agents linked to a payroll vault
CREATE TABLE IF NOT EXISTS payroll_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL DEFAULT 'generic',
  linking_code TEXT UNIQUE,
  agent_token TEXT UNIQUE,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'revoked')),
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_agents_company
  ON payroll_agents (company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_agents_token
  ON payroll_agents (agent_token);
CREATE INDEX IF NOT EXISTS idx_payroll_agents_linking
  ON payroll_agents (linking_code);

-- ── Migration: agent-to-agent (A2A) nanopayment network ──
-- Lets an agent hire and pay OTHER agents from the same vault, bounded by an
-- owner-granted hard cap. All columns nullable/additive — existing rows and the
-- human-payroll + owner-settlement paths are unaffected.
--   spend_limit → owner-set ceiling (USDC) this agent may disburse to hires.
--                 NULL = no A2A budget granted (agent cannot pay others).
--   spend_used  → running total this agent has disbursed; guarded < spend_limit.
--   hired_by    → the agent that created this agent's linking slot (nullable;
--                 top-level agents added by the owner have no hirer).
ALTER TABLE payroll_agents
  ADD COLUMN IF NOT EXISTS spend_limit NUMERIC(20,6);
ALTER TABLE payroll_agents
  ADD COLUMN IF NOT EXISTS spend_used NUMERIC(20,6) NOT NULL DEFAULT 0;
ALTER TABLE payroll_agents
  ADD COLUMN IF NOT EXISTS hired_by UUID REFERENCES payroll_agents(id) ON DELETE SET NULL;

-- Guard: budget values must be sane. spend_limit (if granted) strictly positive;
-- spend_used never negative. Applied idempotently.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_agents_spend_limit_positive') THEN
    ALTER TABLE payroll_agents
      ADD CONSTRAINT payroll_agents_spend_limit_positive CHECK (spend_limit IS NULL OR spend_limit > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_agents_spend_used_nonneg') THEN
    ALTER TABLE payroll_agents
      ADD CONSTRAINT payroll_agents_spend_used_nonneg CHECK (spend_used >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_agents_hired_by
  ON payroll_agents (hired_by) WHERE hired_by IS NOT NULL;

-- Work reported by linked agents
CREATE TABLE IF NOT EXISTS payroll_work_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES payroll_agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  payout_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'settled', 'rejected')),
  settled_at TIMESTAMPTZ,
  receipt_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backfill column for existing deployments
ALTER TABLE payroll_work_logs ADD COLUMN IF NOT EXISTS tx_hash TEXT;


CREATE INDEX IF NOT EXISTS idx_payroll_work_logs_agent
  ON payroll_work_logs (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_work_logs_company
  ON payroll_work_logs (company_id, status);

-- Payment rules per agent / task type
CREATE TABLE IF NOT EXISTS payroll_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES payroll_agents(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  -- Task compensation rate — owner-selected, per (agent, task_type).
  -- NUMERIC(20,6) → precise USDC (6dp) storage; must be strictly positive.
  rate NUMERIC(20,6) NOT NULL CHECK (rate > 0),
  max_daily NUMERIC(20,6) CHECK (max_daily IS NULL OR max_daily > 0),
  max_monthly NUMERIC(20,6) CHECK (max_monthly IS NULL OR max_monthly > 0),
  auto_settle BOOLEAN NOT NULL DEFAULT false,
  auto_settle_threshold NUMERIC DEFAULT 0,
  -- Nanopayment settlement strategy:
  --   'manual'  → owner approves payouts
  --   'instant' → settle on every report (uses auto_settle/auto_settle_threshold)
  --   'batched' → accumulate, sweep + settle when pending >= batch_threshold (or on cron)
  settlement_mode TEXT NOT NULL DEFAULT 'manual' CHECK (settlement_mode IN ('manual', 'instant', 'batched')),
  batch_threshold NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backfill columns for existing deployments
ALTER TABLE payroll_rules ADD COLUMN IF NOT EXISTS settlement_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE payroll_rules ADD COLUMN IF NOT EXISTS batch_threshold NUMERIC DEFAULT 0;

-- ── Migration: enforce positive, USDC-precise money values ──
-- The task compensation rate MUST be a positive amount. Caps, if set, must be
-- positive; thresholds must be non-negative. These guard against zero/negative
-- values slipping past the application layer. Applied idempotently.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_rules_rate_positive') THEN
    ALTER TABLE payroll_rules
      ADD CONSTRAINT payroll_rules_rate_positive CHECK (rate > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_rules_max_daily_positive') THEN
    ALTER TABLE payroll_rules
      ADD CONSTRAINT payroll_rules_max_daily_positive CHECK (max_daily IS NULL OR max_daily > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_rules_max_monthly_positive') THEN
    ALTER TABLE payroll_rules
      ADD CONSTRAINT payroll_rules_max_monthly_positive CHECK (max_monthly IS NULL OR max_monthly > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_rules_batch_threshold_nonneg') THEN
    ALTER TABLE payroll_rules
      ADD CONSTRAINT payroll_rules_batch_threshold_nonneg CHECK (batch_threshold IS NULL OR batch_threshold >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_rules_company
  ON payroll_rules (company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_rules_batched
  ON payroll_rules (settlement_mode) WHERE settlement_mode = 'batched';


-- Unique rule per (company, agent, task_type) so set_agent_rule upserts
-- update an existing rule instead of creating duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_rules_company_agent_task
  ON payroll_rules (company_id, agent_id, task_type);


-- RLS
ALTER TABLE payroll_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_rules ENABLE ROW LEVEL SECURITY;

-- Policy names are unique per table and CREATE POLICY has no IF NOT EXISTS,
-- so DROP POLICY IF EXISTS first to make this section safe to re-run.
DROP POLICY IF EXISTS "Allow all for anon" ON payroll_agents;
CREATE POLICY "Allow all for anon" ON payroll_agents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON payroll_work_logs;
CREATE POLICY "Allow all for anon" ON payroll_work_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON payroll_rules;
CREATE POLICY "Allow all for anon" ON payroll_rules FOR ALL USING (true) WITH CHECK (true);
