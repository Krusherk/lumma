/**
 * GET/POST /api/payroll/nano_admin
 *
 * Admin endpoints for x402 nanopayment monitoring and management.
 * All actions require x-internal-secret header.
 *
 * ?action=status     — Gateway connectivity and supported networks
 * ?action=balances   — Agent Gateway balances
 * ?action=settlements — Settlement history
 * ?action=withdraw   — Withdraw accumulated USDC from Gateway
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireInternalSecret } from './_auth.js'
import { supabase } from './_supabase.js'
import {
  checkGatewayStatus,
  AgentNanopaymentClient,
  deriveAgentKey,
} from './nanopayments.js'

const MASTER_SEED = process.env.NANOPAYMENT_MASTER_SEED || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!requireInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const action = req.query.action as string

  try {
    switch (action) {

      // ─────────────────────────────────────────────
      // STATUS — Gateway health check
      // ─────────────────────────────────────────────
      case 'status': {
        const status = await checkGatewayStatus()
        return res.status(200).json(status)
      }

      // ─────────────────────────────────────────────
      // BALANCES — All agent Gateway balances
      // ─────────────────────────────────────────────
      case 'balances': {
        const companyId = req.query.company_id as string
        let query = supabase.from('nanopayment_wallets').select('*')
        if (companyId) query = query.eq('company_id', companyId)
        const { data: wallets, error } = await query
        if (error) return res.status(500).json({ error: error.message })
        if (!wallets?.length) return res.status(200).json({ wallets: [], note: 'No nanopayment wallets found' })

        const results = []
        for (const wallet of wallets) {
          try {
            if (!MASTER_SEED) {
              results.push({
                agent_id: wallet.agent_id,
                eoa_address: wallet.eoa_address,
                error: 'NANOPAYMENT_MASTER_SEED not configured',
              })
              continue
            }
            const key = deriveAgentKey(MASTER_SEED, wallet.agent_id)
            const client = new AgentNanopaymentClient(key)
            const balances = await client.getBalances()
            results.push({
              agent_id: wallet.agent_id,
              eoa_address: wallet.eoa_address,
              gateway_deposited: wallet.gateway_deposited,
              wallet_usdc: balances.wallet.formatted,
              gateway_available: balances.gateway.formattedAvailable,
              gateway_total: balances.gateway.formattedTotal,
            })
          } catch (err: any) {
            results.push({
              agent_id: wallet.agent_id,
              eoa_address: wallet.eoa_address,
              error: err.message,
            })
          }
        }

        return res.status(200).json({ wallets: results })
      }

      // ─────────────────────────────────────────────
      // SETTLEMENTS — Settlement history
      // ─────────────────────────────────────────────
      case 'settlements': {
        const companyId = req.query.company_id as string
        const agentId = req.query.agent_id as string
        const limit = Math.min(Number(req.query.limit) || 50, 200)
        const offset = Number(req.query.offset) || 0

        let query = supabase
          .from('nanopayment_settlements')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (companyId) query = query.eq('company_id', companyId)
        if (agentId) query = query.eq('payer_agent_id', agentId)

        const { data, error, count } = await query

        if (error) return res.status(500).json({ error: error.message })

        return res.status(200).json({
          settlements: data || [],
          total: count || 0,
          limit,
          offset,
        })
      }

      // ─────────────────────────────────────────────
      // WITHDRAW — Withdraw accumulated USDC from Gateway
      // ─────────────────────────────────────────────
      case 'withdraw': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })

        const { agent_id, amount, destination_chain } = req.body
        if (!agent_id || !amount) {
          return res.status(400).json({ error: 'agent_id and amount required' })
        }

        if (!MASTER_SEED) {
          return res.status(500).json({ error: 'NANOPAYMENT_MASTER_SEED not configured' })
        }

        const key = deriveAgentKey(MASTER_SEED, agent_id)
        const client = new AgentNanopaymentClient(key)

        const options = destination_chain ? { chain: destination_chain } : undefined
        const result = await client.withdraw(amount, options)

        return res.status(200).json({
          withdrawn: true,
          agent_id,
          amount: result.formattedAmount,
          tx_hash: result.mintTxHash,
          source_chain: result.sourceChain,
          destination_chain: result.destinationChain,
        })
      }

      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Use status, balances, settlements, or withdraw.`,
        })
    }
  } catch (err: any) {
    console.error('Nano admin error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
