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
