-- ═══════════════════════════════════════
-- Lumma RPCs — atomic settlement helpers
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Add 'settling' as a valid intermediate status so concurrent callers
-- can claim a batch of logs before transferring, preventing double-spend.
DO $$
BEGIN
  -- Alter the CHECK constraint to include 'settling'.
  -- Drop old constraint, re-add with new value list.
  ALTER TABLE payroll_work_logs DROP CONSTRAINT IF EXISTS payroll_work_logs_status_check;
  ALTER TABLE payroll_work_logs
    ADD CONSTRAINT payroll_work_logs_status_check
    CHECK (status IN ('pending', 'approved', 'settling', 'settled', 'rejected'));
END $$;

-- ── claim_work_logs ───────────────────────────────────────────────────
-- Atomically transitions a set of log rows from pending/approved → settling.
-- Returns only the rows that were actually claimed (others were already
-- claimed by a concurrent caller and must not be paid again).
CREATE OR REPLACE FUNCTION claim_work_logs(log_ids uuid[])
RETURNS SETOF payroll_work_logs
LANGUAGE sql
AS $$
  UPDATE payroll_work_logs
  SET status = 'settling'
  WHERE id = ANY(log_ids)
    AND status IN ('pending', 'approved')
  RETURNING *;
$$;

-- ── revert_work_logs ──────────────────────────────────────────────────
-- Called on transfer failure: revert 'settling' rows back to 'approved'
-- so they can be retried.
CREATE OR REPLACE FUNCTION revert_work_logs(log_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE payroll_work_logs
  SET status = 'approved'
  WHERE id = ANY(log_ids)
    AND status = 'settling';
$$;

-- ── increment_agent_totals ────────────────────────────────────────────
-- Atomically increments total_earned and total_tasks for an agent.
-- Avoids read-modify-write races when multiple settlements run concurrently.
CREATE OR REPLACE FUNCTION increment_agent_totals(
  p_agent_id   uuid,
  p_earned     numeric,
  p_tasks      integer
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE payroll_agents
  SET
    total_earned = total_earned + p_earned,
    total_tasks  = total_tasks  + p_tasks
  WHERE id = p_agent_id;
$$;

-- ── reserve_agent_budget ──────────────────────────────────────────────
-- Agent-to-agent (A2A) spend guard. Atomically reserves p_amount against a
-- paying agent's owner-granted hard cap (spend_limit) by incrementing
-- spend_used ONLY IF the reservation stays within the cap. The predicate and
-- the write happen in one UPDATE, so concurrent pay_agent calls can never
-- push spend_used past spend_limit (same double-spend-safe pattern as
-- claim_work_logs).
--
-- Returns the updated row when the reservation succeeds; returns no rows when
-- the agent has no budget (spend_limit IS NULL), is not active, or the
-- reservation would exceed the cap. The caller MUST treat "no row" as a hard
-- rejection and NOT transfer any funds.
--
-- On transfer failure the caller releases the reservation via
-- release_agent_budget (below) so the budget is not permanently consumed.
CREATE OR REPLACE FUNCTION reserve_agent_budget(
  p_agent_id  uuid,
  p_amount    numeric
)
RETURNS SETOF payroll_agents
LANGUAGE sql
AS $$
  UPDATE payroll_agents
  SET spend_used = spend_used + p_amount
  WHERE id = p_agent_id
    AND status = 'active'
    AND spend_limit IS NOT NULL
    AND p_amount > 0
    AND spend_used + p_amount <= spend_limit
  RETURNING *;
$$;

-- ── release_agent_budget ──────────────────────────────────────────────
-- Called when an A2A transfer fails after its budget was reserved: rolls back
-- the reservation by decrementing spend_used (floored at 0 so it can never go
-- negative even under concurrent releases).
CREATE OR REPLACE FUNCTION release_agent_budget(
  p_agent_id  uuid,
  p_amount    numeric
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE payroll_agents
  SET spend_used = GREATEST(spend_used - p_amount, 0)
  WHERE id = p_agent_id;
$$;
