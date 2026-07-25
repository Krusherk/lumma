/**
 * POST /api/payroll/agent/create  — Owner creates an agent slot + linking code
 * POST /api/payroll/agent/link    — Agent consumes linking code → gets token
 * POST /api/payroll/agent/report  — Agent reports completed work
 * GET  /api/payroll/agent/earnings — Agent checks pending/total earnings
 * GET  /api/payroll/agent/activity — Owner views all agent activity
 * POST /api/payroll/agent/approve — Owner approves + settles pending payouts
 *
 * Routing via query param: ?action=create|link|set_wallet|report|earnings|activity|approve|sweep
 *
 * Owner-only actions (create, activity, approve, sweep) require x-internal-secret.
 * Agent-facing actions (link, set_wallet, report, earnings) use Bearer token auth.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { transferUSDC, CHAIN_ID_MAP } from './_circle.js'
import { requireInternalSecret } from './_auth.js'
import { supabase } from './_supabase.js'
import { sumBaseUnits, feeBaseUnits, formatBaseUnits } from './_usdc.js'

const RECEIPT_BASE_URL = 'https://payroll.lumma.xyz'

function generateLinkCode(): string {
  return `LMA-LINK-${crypto.randomBytes(4).toString('hex')}`
}
function generateAgentToken(): string {
  return `lma_at_${crypto.randomBytes(16).toString('hex')}`
}
function generateReceiptId(): string {
  return `LMA-${crypto.randomBytes(4).toString('hex')}`
}
function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

// ── In-memory rate limiter: 100 req/min per token (per serverless instance) ──
const RATE_LIMIT = 100
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map<string, number[]>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const hits = (rateBuckets.get(key) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_LIMIT) {
    rateBuckets.set(key, hits)
    return false
  }
  hits.push(now)
  rateBuckets.set(key, hits)
  // Periodically clean up idle keys to prevent unbounded Map growth
  if (rateBuckets.size > 10_000) {
    for (const [k, ts] of rateBuckets) {
      if (ts.every(t => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k)
    }
  }
  return true
}

/**
 * Settle a group of pending/approved work logs for a single agent.
 *
 * Uses an atomic DB claim (claim_work_logs RPC) to transition rows to
 * 'settling' BEFORE transferring — preventing double-spend when concurrent
 * approve/sweep/auto-settle calls race on the same logs.
 *
 * On transfer failure the rows are reverted to 'approved' for retry.
 * All money math is done in integer USDC base units (BigInt) via _usdc.ts.
 */
async function settleAgentWork(
  companyId: string,
  agent: any,
  candidateLogs: any[],
): Promise<any> {
  const candidateIds = candidateLogs.map((l: any) => l.id)

  // ── Atomic claim: only rows we actually claimed will be settled ──
  const { data: claimedLogs, error: claimErr } = await supabase
    .rpc('claim_work_logs', { log_ids: candidateIds })
  if (claimErr) {
    console.error('claim_work_logs RPC error:', claimErr)
    return { agent_id: agent.id, agent_name: agent.name, tasks_settled: 0, total_settled: '0.00', error: claimErr.message }
  }
  if (!claimedLogs?.length) {
    return { agent_id: agent.id, agent_name: agent.name, tasks_settled: 0, total_settled: '0.00', note: 'No logs claimed (already settling or settled by concurrent call)' }
  }

  const logIds = claimedLogs.map((l: any) => l.id)

  // ── Precise integer money math ──
  const grossBase = sumBaseUnits(claimedLogs.map((l: any) => l.payout_amount))
  const feeBase = feeBaseUnits(grossBase)
  const netBase = grossBase - feeBase

  const grossStr = formatBaseUnits(grossBase)
  const feeStr = formatBaseUnits(feeBase)
  const netStr = formatBaseUnits(netBase)

  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('id', companyId)
    .single()

  let txHash: string | null = null
  let txId: string | null = null
  let receiptUrl: string | null = null
  let receiptId: string | null = null

  if (agent?.wallet_address && netBase > 0n && company?.vault_wallet_id) {
    try {
      const chain = company.vault_chain || 'ARC-TESTNET'
      const tx = await transferUSDC(
        company.vault_wallet_id,
        agent.wallet_address,
        netStr,   // precise decimal string, no float conversion
        chain
      )

      txId = tx.id || null
      txHash = tx.txHash || null

      if (tx.state !== 'COMPLETE') {
        // Revert claimed rows so they can be retried
        await supabase.rpc('revert_work_logs', { log_ids: logIds })
        return {
          agent_id: agent.id,
          agent_name: agent.name,
          tasks_settled: 0,
          total_settled: '0.00',
          error: `Transfer not complete (state: ${tx.state}). Work reverted to approved.`,
        }
      }

      // Write receipt
      receiptId = generateReceiptId()
      const chainId = CHAIN_ID_MAP[chain] || 5042002
      try {
        await supabase.from('payroll_receipts').insert({
          id: receiptId,
          company_id: companyId,
          company_name: company.name,
          contractor_name: agent.name,
          contractor_wallet: agent.wallet_address,
          vault_address: company.vault_address,
          amount: grossStr,
          chain,
          chain_id: chainId,
          tx_hash: txHash,
          circle_tx_id: txId,
          status: 'confirmed',
        })
        receiptUrl = `${RECEIPT_BASE_URL}/${receiptId}`
      } catch (err) {
        console.error('Agent receipt creation failed:', err)
      }
    } catch (err: any) {
      console.error(`Agent settlement transfer failed for ${agent.id}:`, err)
      await supabase.rpc('revert_work_logs', { log_ids: logIds })
      return {
        agent_id: agent.id,
        agent_name: agent.name,
        tasks_settled: 0,
        total_settled: '0.00',
        error: err.message || 'Transfer failed',
      }
    }
  }

  // Mark logs settled
  const now = new Date().toISOString()
  await supabase.from('payroll_work_logs')
    .update({ status: 'settled', settled_at: now, receipt_id: receiptId, tx_hash: txHash })
    .in('id', logIds)

  // Atomically increment agent totals (no read-modify-write race)
  await supabase.rpc('increment_agent_totals', {
    p_agent_id: agent.id,
    p_earned: grossStr,
    p_tasks: 0,  // tasks already incremented at report time
  })

  return {
    agent_id: agent.id,
    agent_name: agent.name,
    tasks_settled: claimedLogs.length,
    gross: grossStr,
    fee: feeStr,
    net_paid: netStr,
    total_settled: netStr,
    tx_hash: txHash,
    circle_tx_id: txId,
    receipt_url: receiptUrl,
    note: agent?.wallet_address ? undefined : 'Agent has no wallet address — marked settled without on-chain transfer.',
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query.action as string

  try {
    switch (action) {

      // ─────────────────────────────────────────────
      // CREATE — Owner creates agent slot (internal only)
      // ─────────────────────────────────────────────
      case 'create': {
        if (!requireInternalSecret(req)) return res.status(401).json({ error: 'Unauthorized' })
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { company_id, name, agent_type, wallet_address } = req.body

        if (!company_id || !name) {
          return res.status(400).json({ error: 'company_id and name required' })
        }

        const linkCode = generateLinkCode()

        const { data, error } = await supabase.from('payroll_agents').insert({
          company_id,
          name,
          agent_type: agent_type || 'generic',
          wallet_address: wallet_address || null,
          linking_code: linkCode,
          status: 'pending',
        }).select().single()

        if (error) return res.status(400).json({ error: error.message })

        return res.status(200).json({
          agent_id: data.id,
          name: data.name,
          linking_code: linkCode,
          instructions: `Install the Lumma Payroll Skill in your agent, then call POST /api/payroll/agent?action=link with { "code": "${linkCode}" }`,
        })
      }

      // ─────────────────────────────────────────────
      // LINK — Agent consumes linking code → gets token
      // ─────────────────────────────────────────────
      case 'link': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { code, wallet_address } = req.body

        if (!code) return res.status(400).json({ error: 'Linking code required' })

        if (wallet_address && !isValidEVMAddress(wallet_address)) {
          return res.status(400).json({ error: 'Invalid wallet_address. Must be 0x + 40 hex chars.' })
        }

        const { data: agent, error: findErr } = await supabase
          .from('payroll_agents')
          .select('*')
          .eq('linking_code', code)
          .eq('status', 'pending')
          .single()

        if (findErr || !agent) {
          return res.status(404).json({ error: 'Invalid or expired linking code' })
        }

        const token = generateAgentToken()
        const payoutWallet = wallet_address ? wallet_address.toLowerCase() : (agent.wallet_address || null)
        const { error: updateErr } = await supabase.from('payroll_agents').update({
          agent_token: token,
          status: 'active',
          wallet_address: payoutWallet,
          linking_code: null,
        }).eq('id', agent.id)

        if (updateErr) return res.status(500).json({ error: updateErr.message })

        return res.status(200).json({
          agent_token: token,
          agent_name: agent.name,
          agent_type: agent.agent_type,
          payout_wallet: payoutWallet,
          message: payoutWallet
            ? 'Successfully linked. Your pay will be sent to this wallet.'
            : 'Linked, but no payout wallet is set yet. Call action=set_wallet with your wallet_address.',
        })
      }

      // ─────────────────────────────────────────────
      // SET_WALLET — Agent sets/updates its own payout wallet
      // ─────────────────────────────────────────────
      case 'set_wallet': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })

        const agent = await authenticateAgent(req)
        if (!agent) return res.status(401).json({ error: 'Invalid or missing agent token' })

        const { wallet_address } = req.body
        if (!wallet_address || !isValidEVMAddress(wallet_address)) {
          return res.status(400).json({ error: 'Valid wallet_address (0x + 40 hex) required' })
        }

        const { error: updateErr } = await supabase.from('payroll_agents')
          .update({ wallet_address: wallet_address.toLowerCase() })
          .eq('id', agent.id)

        if (updateErr) return res.status(500).json({ error: updateErr.message })

        return res.status(200).json({
          agent_name: agent.name,
          payout_wallet: wallet_address.toLowerCase(),
          message: 'Payout wallet updated. Future settlements will be sent here.',
        })
      }

      // ─────────────────────────────────────────────
      // REPORT — Agent reports completed work
      // ─────────────────────────────────────────────
      case 'report': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })

        const agent = await authenticateAgent(req)
        if (!agent) return res.status(401).json({ error: 'Invalid or missing agent token' })

        if (!checkRateLimit(agent.agent_token)) {
          return res.status(429).json({ error: 'Rate limit exceeded (100 req/min). Slow down.' })
        }

        const { task_type, description, metadata } = req.body
        if (!task_type) return res.status(400).json({ error: 'task_type required' })

        // Find matching rule
        const { data: rule } = await supabase.from('payroll_rules')
          .select('*')
          .eq('company_id', agent.company_id)
          .eq('task_type', task_type)
          .eq('status', 'active')
          .or(`agent_id.eq.${agent.id},agent_id.is.null`)
          .order('agent_id', { ascending: false, nullsFirst: false })
          .limit(1)
          .single()

        const payoutAmount = rule ? Number(rule.rate) : 0

        // Check daily cap using integer math
        if (rule?.max_daily) {
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const { data: todayLogs } = await supabase.from('payroll_work_logs')
            .select('payout_amount')
            .eq('agent_id', agent.id)
            .gte('created_at', today.toISOString())
          const dailyBase = sumBaseUnits((todayLogs || []).map((l: any) => l.payout_amount))
          const payoutBase = sumBaseUnits([payoutAmount])
          const maxDailyBase = sumBaseUnits([rule.max_daily])
          if (dailyBase + payoutBase > maxDailyBase) {
            return res.status(429).json({ error: 'Daily payout cap reached', daily_total: formatBaseUnits(dailyBase), cap: rule.max_daily })
          }
        }

        // Check monthly cap using integer math
        if (rule?.max_monthly) {
          const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
          const { data: monthLogs } = await supabase.from('payroll_work_logs')
            .select('payout_amount')
            .eq('agent_id', agent.id)
            .gte('created_at', monthStart.toISOString())
          const monthBase = sumBaseUnits((monthLogs || []).map((l: any) => l.payout_amount))
          const payoutBase = sumBaseUnits([payoutAmount])
          const maxMonthlyBase = sumBaseUnits([rule.max_monthly])
          if (monthBase + payoutBase > maxMonthlyBase) {
            return res.status(429).json({ error: 'Monthly payout cap reached', monthly_total: formatBaseUnits(monthBase), cap: rule.max_monthly })
          }
        }

        let workStatus = 'pending'
        if (rule?.auto_settle && payoutAmount <= Number(rule.auto_settle_threshold || 0)) {
          workStatus = 'approved'
        }
        if (payoutAmount === 0) workStatus = 'pending'

        const { data: workLog, error: insertErr } = await supabase.from('payroll_work_logs').insert({
          agent_id: agent.id,
          company_id: agent.company_id,
          task_type,
          description: description || null,
          metadata: metadata || {},
          payout_amount: payoutAmount,
          status: workStatus,
        }).select().single()

        if (insertErr) return res.status(500).json({ error: insertErr.message })

        // Pending total using integer math
        const { data: pendingLogs } = await supabase.from('payroll_work_logs')
          .select('payout_amount')
          .eq('agent_id', agent.id)
          .in('status', ['pending', 'approved'])
        const pendingBase = sumBaseUnits((pendingLogs || []).map((l: any) => l.payout_amount))

        // Atomically increment task count
        await supabase.rpc('increment_agent_totals', {
          p_agent_id: agent.id,
          p_earned: '0',
          p_tasks: 1,
        })

        // Auto-settle immediately if eligible
        let autoSettle: any = null
        if (workStatus === 'approved' && rule?.auto_settle && agent.wallet_address && payoutAmount > 0) {
          autoSettle = await settleAgentWork(agent.company_id, agent, [workLog])
        }

        return res.status(200).json({
          logged: true,
          work_id: workLog.id,
          task_type,
          payout_amount: formatBaseUnits(sumBaseUnits([payoutAmount])),
          pending_total: formatBaseUnits(pendingBase),
          status: autoSettle?.tasks_settled ? 'settled' : workStatus,
          has_rule: !!rule,
          auto_settled: !!autoSettle?.tasks_settled,
          settlement: autoSettle || undefined,
        })
      }

      // ─────────────────────────────────────────────
      // EARNINGS — Agent checks pending/total
      // ─────────────────────────────────────────────
      case 'earnings': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' })

        const agent = await authenticateAgent(req)
        if (!agent) return res.status(401).json({ error: 'Invalid or missing agent token' })

        const { data: pendingLogs } = await supabase.from('payroll_work_logs')
          .select('payout_amount')
          .eq('agent_id', agent.id)
          .in('status', ['pending', 'approved'])
        const pendingBase = sumBaseUnits((pendingLogs || []).map((l: any) => l.payout_amount))

        // Single source of truth: sum settled logs
        const { data: settledLogs } = await supabase.from('payroll_work_logs')
          .select('payout_amount')
          .eq('agent_id', agent.id)
          .eq('status', 'settled')
        const earnedBase = sumBaseUnits((settledLogs || []).map((l: any) => l.payout_amount))

        return res.status(200).json({
          agent_name: agent.name,
          pending: formatBaseUnits(pendingBase),
          total_earned: formatBaseUnits(earnedBase),
          total_tasks: agent.total_tasks,
          status: agent.status,
        })
      }

      // ─────────────────────────────────────────────
      // ACTIVITY — Owner views all agent activity (internal only)
      // ─────────────────────────────────────────────
      case 'activity': {
        if (!requireInternalSecret(req)) return res.status(401).json({ error: 'Unauthorized' })
        if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' })
        const company_id = req.query.company_id as string
        if (!company_id) return res.status(400).json({ error: 'company_id required' })

        const { data: agents } = await supabase.from('payroll_agents')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })

        if (!agents?.length) return res.status(200).json({ agents: [], pending_total: '0.000000' })

        const agentSummaries = []
        let totalPendingBase = 0n

        for (const a of agents) {
          const { data: logs } = await supabase.from('payroll_work_logs')
            .select('*')
            .eq('agent_id', a.id)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false })
            .limit(10)

          const pendingBase = sumBaseUnits((logs || []).map((l: any) => l.payout_amount))
          totalPendingBase += pendingBase

          agentSummaries.push({
            id: a.id,
            name: a.name,
            agent_type: a.agent_type,
            status: a.status,
            total_tasks: a.total_tasks,
            total_earned: formatBaseUnits(sumBaseUnits([a.total_earned])),
            pending_payout: formatBaseUnits(pendingBase),
            pending_tasks: (logs || []).length,
            recent_work: (logs || []).slice(0, 3).map((l: any) => ({
              task_type: l.task_type,
              description: l.description,
              amount: formatBaseUnits(sumBaseUnits([l.payout_amount])),
              date: l.created_at,
            })),
          })
        }

        return res.status(200).json({
          agents: agentSummaries,
          pending_total: formatBaseUnits(totalPendingBase),
        })
      }

      // ─────────────────────────────────────────────
      // APPROVE — Owner approves + settles pending (internal only)
      // ─────────────────────────────────────────────
      case 'approve': {
        if (!requireInternalSecret(req)) return res.status(401).json({ error: 'Unauthorized' })
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { company_id, agent_id } = req.body

        if (!company_id) return res.status(400).json({ error: 'company_id required' })

        let query = supabase.from('payroll_work_logs')
          .select('*, payroll_agents!inner(name, wallet_address)')
          .eq('company_id', company_id)
          .in('status', ['pending', 'approved'])

        if (agent_id) query = query.eq('agent_id', agent_id)

        const { data: logs, error: fetchErr } = await query
        if (fetchErr) return res.status(500).json({ error: fetchErr.message })
        if (!logs?.length) return res.status(200).json({ message: 'No pending work to settle', settled: 0 })

        const byAgent: Record<string, { agent: any; logs: any[] }> = {}
        for (const log of logs) {
          const aid = log.agent_id
          if (!byAgent[aid]) {
            byAgent[aid] = { agent: (log as any).payroll_agents, logs: [] }
          }
          byAgent[aid].logs.push(log)
        }

        const results: any[] = []
        for (const [aid, group] of Object.entries(byAgent)) {
          const result = await settleAgentWork(
            company_id,
            { ...group.agent, id: aid },
            group.logs,
          )
          results.push(result)
        }

        const settledCount = results.reduce((n, r) => n + (r.tasks_settled || 0), 0)
        return res.status(200).json({
          message: `Settled ${settledCount} tasks across ${results.filter(r => r.tasks_settled > 0).length} agents`,
          results,
        })
      }

      // ─────────────────────────────────────────────
      // SWEEP — Nanopayment batch settlement (internal only)
      // ─────────────────────────────────────────────
      case 'sweep': {
        if (!requireInternalSecret(req)) return res.status(401).json({ error: 'Unauthorized' })
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { company_id } = req.body || {}

        let rulesQuery = supabase.from('payroll_rules')
          .select('company_id, agent_id, batch_threshold')
          .eq('settlement_mode', 'batched')
          .eq('status', 'active')
        if (company_id) rulesQuery = rulesQuery.eq('company_id', company_id)

        const { data: rules } = await rulesQuery
        if (!rules?.length) return res.status(200).json({ message: 'No batched rules to sweep', swept: 0, results: [] })

        const thresholds: Record<string, { companyId: string; threshold: number }> = {}

        for (const r of rules as any[]) {
          const thr = Number(r.batch_threshold || 0)
          if (r.agent_id) {
            const cur = thresholds[r.agent_id]
            thresholds[r.agent_id] = { companyId: r.company_id, threshold: cur ? Math.min(cur.threshold, thr) : thr }
          } else {
            const { data: companyAgents } = await supabase.from('payroll_agents')
              .select('id').eq('company_id', r.company_id).eq('status', 'active')
            for (const a of companyAgents || []) {
              const cur = thresholds[a.id]
              thresholds[a.id] = { companyId: r.company_id, threshold: cur ? Math.min(cur.threshold, thr) : thr }
            }
          }
        }

        const results: any[] = []
        for (const [agentId, { companyId, threshold }] of Object.entries(thresholds)) {
          const { data: agent } = await supabase.from('payroll_agents')
            .select('*').eq('id', agentId).eq('status', 'active').single()
          if (!agent || !agent.wallet_address) continue

          const { data: logs } = await supabase.from('payroll_work_logs')
            .select('*')
            .eq('agent_id', agentId)
            .in('status', ['pending', 'approved'])

          const pendingBase = sumBaseUnits((logs || []).map((l: any) => l.payout_amount))
          const thresholdBase = sumBaseUnits([threshold])

          if (!logs?.length || pendingBase < thresholdBase || pendingBase <= 0n) continue

          const result = await settleAgentWork(companyId, agent, logs)
          results.push({ ...result, threshold })
        }

        return res.status(200).json({
          message: `Swept ${results.filter(r => r.tasks_settled > 0).length} agents`,
          swept: results.length,
          results,
        })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}. Use create, link, set_wallet, report, earnings, activity, approve, or sweep.` })
    }
  } catch (err: any) {
    console.error('Agent API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

// ── Auth helper: extract agent from Bearer token ──
async function authenticateAgent(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)

  const { data } = await supabase.from('payroll_agents')
    .select('*')
    .eq('agent_token', token)
    .eq('status', 'active')
    .single()

  return data
}
