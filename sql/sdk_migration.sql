-- ═══════════════════════════════════════════════════════════════════
-- Lumma Embedded Payroll SDK — Supabase Migration
-- Copy-paste this entire block into the Supabase SQL Editor and run.
-- Safe to re-run (fully idempotent).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. SDK API Keys ──────────────────────────────────────────────
-- Each row represents an external platform's API credential.
-- The raw key is never stored — only a SHA-256 hash.
CREATE TABLE IF NOT EXISTS sdk_api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_hash TEXT NOT NULL UNIQUE,
  platform_name TEXT NOT NULL,
  owner_wallet TEXT NOT NULL,
  permissions  TEXT[] NOT NULL DEFAULT ARRAY['vaults.create', 'agents.register', 'payments.settle'],
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at   TIMESTAMPTZ
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_sdk_api_keys_hash
  ON sdk_api_keys (api_key_hash) WHERE status = 'active';

-- ── 2. Add sdk_key_id to payroll_companies ────────────────────────
-- Track which SDK key created each vault (nullable for existing vaults).
ALTER TABLE payroll_companies
  ADD COLUMN IF NOT EXISTS sdk_key_id UUID REFERENCES sdk_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_companies_sdk_key
  ON payroll_companies (sdk_key_id) WHERE sdk_key_id IS NOT NULL;

-- ── 3. SDK Settlements ────────────────────────────────────────────
-- Immutable ledger of all SDK-initiated task settlements.
-- proof_hash is unique per company to prevent duplicate payments.
CREATE TABLE IF NOT EXISTS sdk_settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  sdk_key_id          UUID REFERENCES sdk_api_keys(id) ON DELETE SET NULL,
  payer_agent_id      TEXT,
  recipient_agent_id  TEXT NOT NULL,
  amount              NUMERIC(20,6) NOT NULL CHECK (amount > 0),
  proof_hash          TEXT NOT NULL,
  tx_hash             TEXT,
  receipt_id          TEXT NOT NULL,
  metadata            JSONB DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'failed', 'pending')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one proof_hash per company (duplicate prevention)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sdk_settlements_proof
  ON sdk_settlements (company_id, proof_hash);

CREATE INDEX IF NOT EXISTS idx_sdk_settlements_recipient
  ON sdk_settlements (company_id, recipient_agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sdk_settlements_key
  ON sdk_settlements (sdk_key_id, created_at DESC);

-- ── 4. SDK Stream Configs ─────────────────────────────────────────
-- Pay-per-token streaming payment configuration per agent.
CREATE TABLE IF NOT EXISTS sdk_stream_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  agent_id              TEXT NOT NULL,
  sdk_key_id            UUID REFERENCES sdk_api_keys(id) ON DELETE SET NULL,
  rate_per_unit         NUMERIC(20,6) NOT NULL CHECK (rate_per_unit > 0),
  unit_type             TEXT NOT NULL CHECK (unit_type IN ('token', 'api_call', 'compute_second', 'request', 'custom')),
  max_budget            NUMERIC(20,6) NOT NULL CHECK (max_budget > 0),
  clamp_on_budget_hit   BOOLEAN NOT NULL DEFAULT true,
  total_units_consumed  BIGINT NOT NULL DEFAULT 0,
  total_amount_streamed NUMERIC(20,6) NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'exhausted')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_sdk_stream_configs_lookup
  ON sdk_stream_configs (company_id, agent_id) WHERE status = 'active';

-- ── 5. Helper: Auto-update updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION update_sdk_stream_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sdk_stream_updated_at'
  ) THEN
    CREATE TRIGGER trg_sdk_stream_updated_at
      BEFORE UPDATE ON sdk_stream_configs
      FOR EACH ROW EXECUTE FUNCTION update_sdk_stream_updated_at();
  END IF;
END $$;

-- ── 6. Row Level Security ─────────────────────────────────────────
-- These tables are server-side only (accessed via service_role key).
-- Enable RLS and create no policies = deny all access from anon/authenticated.
ALTER TABLE sdk_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdk_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdk_stream_configs ENABLE ROW LEVEL SECURITY;

-- Service-role bypasses RLS automatically, so no policies needed.
-- If you ever need client-side access, add explicit policies here.

-- ═══════════════════════════════════════════════════════════════════
-- Done. Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('sdk_api_keys', 'sdk_settlements', 'sdk_stream_configs');
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE tablename IN ('sdk_api_keys', 'sdk_settlements', 'sdk_stream_configs');
-- ═══════════════════════════════════════════════════════════════════
