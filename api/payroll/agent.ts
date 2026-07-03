/**
 * POST /api/payroll/agent/create  — Owner creates an agent slot + linking code
 * POST /api/payroll/agent/link    — Agent consumes linking code → gets token
 * POST /api/payroll/agent/report  — Agent reports completed work
 * GET  /api/payroll/agent/earnings — Agent checks pending/total earnings
 * GET  /api/payroll/agent/activity — Owner views all agent activity
 * POST /api/payroll/agent/approve — Owner approves + settles pending payouts
 *
 * Routing is handled via query param: ?action=create|link|report|earnings|activity|approve
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { transferUSDC } from './_circle.js'
import { sumBaseUnits, feeBaseUnits, formatBaseUnits } from './_usdc.js'

const RECEIPT_BASE_URL = 'https://payroll.lumma.xyz'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

function generateLinkCode(): string {
  return `LMA-LINK-${crypto.randomBytes(4).toString('hex')}`
}

function generateAgentToken(): string {
  return `lma_at_${crypto.randomBytes(16).toString('hex')}`
}

function generateReceiptId(): string {
  return `LMA-${crypto.randomBytes(4).toString('hex')}`
}

// Validate an EVM payout address (0x + 40 hex chars).
function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}


// ── Settlement fee (Lumma's nanopayment revenue) ──
// Default 0.5% (50 bps). Applied ONLY at settlement, deducted from gross.
// It never touches the per-task rate the owner selected.
// SETTLEMENT_FEE_BPS is sourced from _usdc.ts (env-overridable).
//
// All fee/gross/net math is done in integer USDC base units (BigInt) to
// avoid floating-point rounding — see _usdc.ts.

// ── Simple in-memory rate limiter: 100 req/min per token ──
// Note: per serverless instance. For strict global limits, back this with Redis/DB.
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
  return true
}

/**
 * Settle a group of pending/approved work logs for a single agent.
 * Sends USDC on-chain (if the agent has a wallet + the vault is funded),
 * marks logs as settled, increments total_earned, and writes a receipt.
 */
async function settleAgentWork(
  companyId: string,
  agent: any,
  logs: any[],
  req: VercelRequest
): Promise<any> {
  const logIds = logs.map(l => l.id)

  // ── Precise money math in integer USDC base units (no floats) ──
  // Gross = sum of the per-task payouts (each stored at the owner's
  // selected rate). The Lumma settlement fee is applied HERE ONLY, at
  // settlement — it is deducted from gross to yield the agent's net.
  const grossBase = sumBaseUnits(logs.map(l => l.payout_amount))
  const feeBase = feeBaseUnits(grossBase)
  const netBase = grossBase - feeBase

  const total = Number(formatBaseUnits(grossBase))
  const fee = Number(formatBaseUnits(feeBase))
  const net = Number(formatBaseUnits(netBase))

  // Need a funded vault + an agent wallet to actually transfer.
  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('id', companyId)
    .single()

  let txHash: string | null = null
  let txId: string | null = null
  let transferError: string | null = null
  let receiptUrl: string | null = null
  let receiptId: string | null = null

  if (agent?.wallet_address && net > 0 && company?.vault_wallet_id) {
    try {
      const chain = company.vault_chain || 'ARC-TESTNET'
      const tx = await transferUSDC(
        company.vault_wallet_id,
        agent.wallet_address,
        net.toString(),
        chain
      )

      txId = tx.id || null
      txHash = tx.txHash || null

      // Only finalize as settled when the transfer actually completed.
      if (tx.state !== 'COMPLETE') {
        transferError = `Transfer not complete (state: ${tx.state}). Work remains pending.`
        return {
          agent_id: agent.id,
          agent_name: agent.name,
          tasks_settled: 0,
          total_settled: '0.00',
          error: transferError,
        }
      }

      // Write a public receipt
      receiptId = generateReceiptId()
      try {
        await supabase.from('payroll_receipts').insert({
          id: receiptId,
          company_id: companyId,
          company_name: company.name,
          contractor_name: agent.name,
          contractor_wallet: agent.wallet_address,
          vault_address: company.vault_address,
          amount: total,
          chain,
          chain_id: 5042002,
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

  // Increment total_earned (read-modify-write to avoid overwriting)
  const newTotal = Number(agent.total_earned || 0) + total
  await supabase.from('payroll_agents')
    .update({ total_earned: newTotal })
    .eq('id', agent.id)

  return {
    agent_id: agent.id,
    agent_name: agent.name,
    tasks_settled: logs.length,
    gross: total.toFixed(6),
    fee: fee.toFixed(6),
    net_paid: net.toFixed(6),
    total_settled: net.toFixed(2),
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
      // CREATE — Owner creates agent slot
      // ─────────────────────────────────────────────
      case 'create': {
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
        // The agent submits the code it was given AND the wallet that should
        // receive its USDC pay. wallet_address is how Lumma knows where to settle.
        const { code, wallet_address } = req.body

        if (!code) return res.status(400).json({ error: 'Linking code required' })

        // If the agent sends a payout wallet, it must be a valid EVM address.
        if (wallet_address && !isValidEVMAddress(wallet_address)) {
          return res.status(400).json({ error: 'Invalid wallet_address. Must be 0x + 40 hex chars.' })
        }

        // Find agent by linking code
        const { data: agent, error: findErr } = await supabase
          .from('payroll_agents')
          .select('*')
          .eq('linking_code', code)
          .eq('status', 'pending')
          .single()

        if (findErr || !agent) {
          return res.status(404).json({ error: 'Invalid or expired linking code' })
        }

        // Generate token and activate. Record the agent's own payout wallet if it
        // supplied one (falls back to any wallet the owner pre-set at create time).
        const token = generateAgentToken()
        const payoutWallet = wallet_address ? wallet_address.toLowerCase() : (agent.wallet_address || null)
        const { error: updateErr } = await supabase.from('payroll_agents').update({
          agent_token: token,
          status: 'active',
          wallet_address: payoutWallet,
          linking_code: null, // consumed
        }).eq('id', agent.id)

        if (updateErr) return res.status(500).json({ error: updateErr.message })

        return res.status(200).json({
          agent_token: token,
          agent_name: agent.name,
          agent_type: agent.agent_type,
          payout_wallet: payoutWallet,
          message: payoutWallet
            ? 'Successfully linked. Your pay will be sent to this wallet. Use the token as Bearer auth for /agent/report and /agent/earnings.'
            : 'Linked, but no payout wallet is set yet — your earnings cannot be paid out on-chain until you set one. Call action=set_wallet with your wallet_address. Use the token as Bearer auth for /agent/report and /agent/earnings.',
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

        // Rate limit: 100 req/min per agent token
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
          .order('agent_id', { ascending: false, nullsFirst: false }) // prefer agent-specific rule
          .limit(1)
          .single()

        const payoutAmount = rule ? Number(rule.rate) : 0

        // Check daily cap
        if (rule?.max_daily) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { data: todayLogs } = await supabase.from('payroll_work_logs')
            .select('payout_amount')
            .eq('agent_id', agent.id)
            .gte('created_at', today.toISOString())
          const dailyTotal = (todayLogs || []).reduce((sum: number, l: any) => sum + Number(l.payout_amount), 0)
          if (dailyTotal + payoutAmount > Number(rule.max_daily)) {
            return res.status(429).json({ error: 'Daily payout cap reached', daily_total: dailyTotal, cap: rule.max_daily })
          }
        }

        // Check monthly cap
        if (rule?.max_monthly) {
          const monthStart = new Date()
          monthStart.setDate(1)
          monthStart.setHours(0, 0, 0, 0)
          const { data: monthLogs } = await supabase.from('payroll_work_logs')
            .select('payout_amount')
            .eq('agent_id', agent.id)
            .gte('created_at', monthStart.toISOString())
          const monthlyTotal = (monthLogs || []).reduce((sum: number, l: any) => sum + Number(l.payout_amount), 0)
          if (monthlyTotal + payoutAmount > Number(rule.max_monthly)) {
            return res.status(429).json({ error: 'Monthly payout cap reached', monthly_total: monthlyTotal, cap: rule.max_monthly })
          }
        }

        // Determine status
        let workStatus = 'pending'
        if (rule?.auto_settle && payoutAmount <= Number(rule.auto_settle_threshold || 0)) {
          workStatus = 'approved' // will be settled later or immediately
        }
        if (payoutAmount === 0) {
          workStatus = 'pending' // no rule found — needs manual config
        }

        // Insert work log
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

        // Get pending total
        const { data: pendingLogs } = await supabase.from('payroll_work_logs')
          .select('payout_amount')
          .eq('agent_id', agent.id)
          .in('status', ['pending', 'approved'])
        const pendingTotal = (pendingLogs || []).reduce((sum: number, l: any) => sum + Number(l.payout_amount), 0)

        // Update agent stats
        await supabase.from('payroll_agents').update({
          total_tasks: agent.total_tasks + 1,
        }).eq('id', agent.id)

        // Auto-settle: if the rule allows and the agent has a wallet, settle immediately.
        let autoSettle: any = null
        if (workStatus === 'approved' && rule?.auto_settle && agent.wallet_address && payoutAmount > 0) {
          autoSettle = await settleAgentWork(agent.company_id, agent, [workLog], req)
        }

        return res.status(200).json({
          logged: true,
          work_id: workLog.id,
          task_type,
          payout_amount: payoutAmount.toFixed(6),
          pending_total: pendingTotal.toFixed(2),
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
        const pending = (pendingLogs || []).reduce((sum: number, l: any) => sum + Number(l.payout_amount), 0)

        const { data: settledLogs } = await supabase.from('payroll_work_logs')
          .select('payout_amount')
          .eq('agent_id', agent.id)
          .eq('status', 'settled')
        const totalEarned = (settledLogs || []).reduce((sum: number, l: any) => sum + Number(l.payout_amount), 0)

        return res.status(200).json({
          agent_name: agent.name,
          pending: pending.toFixed(2),
          total_earned: totalEarned.toFixed(2),
          total_tasks: agent.total_tasks,
          status: agent.status,
        })
      }

      // ─────────────────────────────────────────────
      // ACTIVITY — Owner views all agent activity
      // ─────────────────────────────────────────────
      case 'activity': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' })
        const company_id = req.query.company_id as string
        if (!company_id) return res.status(400).json({ error: 'company_id required' })

        // Get all agents
        const { data: agents } = await supabase.from('payroll_agents')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })

        if (!agents?.length) return res.status(200).json({ agents: [], pending_total: '0.00' })

        // Get pending work per agent
        const agentSummaries = []
        let totalPending = 0

        for (const a of agents) {
          const { data: logs } = await supabase.from('payroll_work_logs')
            .select('*')
            .eq('agent_id', a.id)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false })
            .limit(10)

          const pending = (logs || []).reduce((sum: number, l: any) => sum + Number(l.payout_amount), 0)
          totalPending += pending

          agentSummaries.push({
            id: a.id,
            name: a.name,
            agent_type: a.agent_type,
            status: a.status,
            total_tasks: a.total_tasks,
            total_earned: Number(a.total_earned).toFixed(2),
            pending_payout: pending.toFixed(2),
            pending_tasks: (logs || []).length,
            recent_work: (logs || []).slice(0, 3).map((l: any) => ({
              task_type: l.task_type,
              description: l.description,
              amount: Number(l.payout_amount).toFixed(4),
              date: l.created_at,
            })),
          })
        }

        return res.status(200).json({
          agents: agentSummaries,
          pending_total: totalPending.toFixed(2),
        })
      }

      // ─────────────────────────────────────────────
      // APPROVE — Owner approves + settles pending
      // ─────────────────────────────────────────────
      case 'approve': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { company_id, agent_id } = req.body

        if (!company_id) return res.status(400).json({ error: 'company_id required' })

        // Build query — all pending/approved for this company, optionally filtered by agent
        let query = supabase.from('payroll_work_logs')
          .select('*, payroll_agents!inner(name, wallet_address)')
          .eq('company_id', company_id)
          .in('status', ['pending', 'approved'])

        if (agent_id) query = query.eq('agent_id', agent_id)

        const { data: logs, error: fetchErr } = await query
        if (fetchErr) return res.status(500).json({ error: fetchErr.message })
        if (!logs?.length) return res.status(200).json({ message: 'No pending work to settle', settled: 0 })

        // Group by agent for batch settlement
        const byAgent: Record<string, { agent: any; logs: any[]; total: number }> = {}
        for (const log of logs) {
          const aid = log.agent_id
          if (!byAgent[aid]) {
            byAgent[aid] = { agent: (log as any).payroll_agents, logs: [], total: 0 }
          }
          byAgent[aid].logs.push(log)
          byAgent[aid].total += Number(log.payout_amount)
        }

        const results: any[] = []

        for (const [aid, group] of Object.entries(byAgent)) {
          // settleAgentWork sends USDC on-chain, marks logs settled,
          // increments total_earned, and writes a receipt.
          const result = await settleAgentWork(
            company_id,
            { ...group.agent, id: aid },
            group.logs,
            req
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
      // SWEEP — Nanopayment batch settlement (called by cron or owner)
      // Settles each agent whose pending balance >= its batch_threshold.
      // ─────────────────────────────────────────────
      case 'sweep': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { company_id } = req.body || {}

        // Find active "batched" rules
        let rulesQuery = supabase.from('payroll_rules')
          .select('company_id, agent_id, batch_threshold')
          .eq('settlement_mode', 'batched')
          .eq('status', 'active')
        if (company_id) rulesQuery = rulesQuery.eq('company_id', company_id)

        const { data: rules } = await rulesQuery
        if (!rules?.length) return res.status(200).json({ message: 'No batched rules to sweep', swept: 0, results: [] })

        // Resolve which agents are eligible, with the threshold to apply (min across their batched rules)
        const thresholds: Record<string, { companyId: string; threshold: number }> = {}

        for (const r of rules as any[]) {
          const thr = Number(r.batch_threshold || 0)
          if (r.agent_id) {
            const cur = thresholds[r.agent_id]
            thresholds[r.agent_id] = { companyId: r.company_id, threshold: cur ? Math.min(cur.threshold, thr) : thr }
          } else {
            // company-wide batched rule → applies to all active agents in the company
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
          const pending = (logs || []).reduce((s: number, l: any) => s + Number(l.payout_amount), 0)

          if (!logs?.length || pending < threshold || pending <= 0) continue

          const result = await settleAgentWork(companyId, agent, logs, req)
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
