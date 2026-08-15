-- ═══════════════════════════════════════════════════════════════════
-- Lumma x402 Nanopayments — Supabase Migration
-- Copy-paste this entire block into the Supabase SQL Editor and run.
-- Safe to re-run (fully idempotent).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Nanopayment Wallets ───────────────────────────────────────
-- EOA wallets derived via HD derivation for each agent.
-- These wallets are used for x402 Gateway deposits and payments.
CREATE TABLE IF NOT EXISTS nanopayment_wallets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_db_id           UUID NOT NULL REFERENCES payroll_agents(id) ON DELETE CASCADE,
  agent_id              TEXT NOT NULL,
  company_id            UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  eoa_address           TEXT NOT NULL,
  derivation_index      INTEGER NOT NULL,
  gateway_deposited     BOOLEAN NOT NULL DEFAULT false,
  gateway_deposit_amount NUMERIC(20,6) DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_nanopayment_wallets_agent
  ON nanopayment_wallets (company_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_nanopayment_wallets_address
  ON nanopayment_wallets (eoa_address);

-- ── 2. Nanopayment Settlements ───────────────────────────────────
-- Immutable ledger of all x402 nanopayment settlements.
-- idempotency_key prevents duplicate settlements.
CREATE TABLE IF NOT EXISTS nanopayment_settlements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES payroll_companies(id) ON DELETE CASCADE,
  payer_agent_id        TEXT NOT NULL,
  payer_address         TEXT,
  recipient_agent_id    TEXT,
  recipient_address     TEXT,
  endpoint              TEXT NOT NULL,
  amount                NUMERIC(20,6) NOT NULL CHECK (amount > 0),
  amount_base_units     TEXT,
  transaction_id        TEXT,
  network               TEXT DEFAULT 'eip155:5042002',
  status                TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('settled', 'failed', 'pending')),
  idempotency_key       TEXT UNIQUE,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nanopayment_settlements_company
  ON nanopayment_settlements (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nanopayment_settlements_payer
  ON nanopayment_settlements (payer_agent_id, created_at DESC);

-- ── 3. Row Level Security ────────────────────────────────────────
-- Server-side only (accessed via service_role key).
ALTER TABLE nanopayment_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE nanopayment_settlements ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- Done. Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('nanopayment_wallets', 'nanopayment_settlements');
-- ═══════════════════════════════════════════════════════════════════
