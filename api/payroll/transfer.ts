/**
 * POST /api/payroll/transfer
 *
 * Disburse USDC from a company's Circle Developer-Controlled Wallet
 * to their contractors. No mock/simulation mode — Circle API is required.
 *
 * Body: { company_id: string, contractor_ids: string[] }
 * Returns: { results: [{ contractor_id, status, tx_hash }] }
 *
 * INTERNAL ENDPOINT — requires x-internal-secret header.
 * Called by the chat API and cron only; not for direct public use.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { transferUSDC, CHAIN_MAP } from './_circle.js'
import { requireInternalSecret } from './_auth.js'
import { supabase } from './_supabase.js'

const RECEIPT_BASE_URL = 'https://payroll.lumma.xyz'

function generateReceiptId(): string {
  return `LMA-${crypto.randomBytes(4).toString('hex')}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { company_id, contractor_ids } = req.body

    if (!company_id || !contractor_ids?.length) {
      return res.status(400).json({ error: 'company_id and contractor_ids required' })
    }

    const { data: company } = await supabase
      .from('payroll_companies')
      .select('*')
      .eq('id', company_id)
      .single()

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    if (!company.vault_wallet_id) {
      return res.status(400).json({
        error: 'Company has no Circle vault wallet. Create a vault first.',
      })
    }

    const { data: contractors } = await supabase
      .from('payroll_contractors')
      .select('*')
      .in('id', contractor_ids)
      .eq('company_id', company_id)
      .eq('status', 'active')

    if (!contractors?.length) {
      return res.status(400).json({ error: 'No active contractors found' })
    }

    const results: any[] = []

    // Idempotency window: if a contractor already has a non-failed payment in
    // this recent window, we assume it's the same cycle (cron re-fire, retry,
    // or double-click) and skip re-paying. Prevents double-spend on the human
    // payroll path. 6h comfortably covers cron cadence without blocking a
    // legitimate next scheduled run (weekly+).
    const IDEMPOTENCY_WINDOW_MS = 6 * 60 * 60 * 1000
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString()

    for (const c of contractors) {
      const chain = CHAIN_MAP[c.chain_id] || company.vault_chain || 'ARC-TESTNET'

      // ── Idempotency guard: already paid (or in-flight) this cycle? ──
      const { data: recent } = await supabase
        .from('payroll_payments')
        .select('id, status, tx_hash')
        .eq('company_id', company_id)
        .eq('contractor_id', c.id)
        .in('status', ['pending', 'confirmed'])
        .gte('paid_at', windowStart)
        .limit(1)

      if (recent?.length) {
        results.push({
          contractor_id: c.id,
          contractor_name: c.name,
          amount: c.amount_usdc,
          status: 'skipped',
          reason: 'Already paid or in-flight in the current cycle (idempotency guard)',
          tx_hash: recent[0].tx_hash || null,
        })
        continue
      }

      const { data: payment } = await supabase
        .from('payroll_payments')
        .insert({
          company_id,
          contractor_id: c.id,
          amount: c.amount_usdc,
          chain_id: c.chain_id,
          status: 'pending',
        })
        .select()
        .single()

      try {
        const tx = await transferUSDC(
          company.vault_wallet_id,
          c.wallet_address,
          c.amount_usdc.toString(),
          chain
        )
        const txId = tx.id || null
        const txHash = tx.txHash || null
        const txState = tx.state || 'INITIATED'
        const status = txState === 'COMPLETE' ? 'confirmed' : 'pending'
        const explorerLink = txHash ? `https://testnet.arcscan.app/tx/${txHash}` : null

        if (payment) {
          await supabase
            .from('payroll_payments')
            .update({ status, tx_hash: txHash, circle_tx_id: txId })
            .eq('id', payment.id)
        }

        let receiptUrl: string | null = null
        if (status === 'confirmed' && txHash) {
          const receiptId = generateReceiptId()
          try {
            await supabase.from('payroll_receipts').insert({
              id: receiptId,
              payment_id: payment?.id || null,
              company_id,
              company_name: company.name,
              contractor_name: c.name,
              contractor_wallet: c.wallet_address,
              vault_address: company.vault_address,
              amount: c.amount_usdc,
              chain,
              chain_id: c.chain_id,
              tx_hash: txHash,
              circle_tx_id: txId,
              status: 'confirmed',
            })
            receiptUrl = `${RECEIPT_BASE_URL}/${receiptId}`
          } catch (err) {
            console.error('Receipt creation failed:', err)
          }
        }

        results.push({
          contractor_id: c.id,
          contractor_name: c.name,
          amount: c.amount_usdc,
          status,
          tx_hash: txHash,
          circle_tx_id: txId,
          explorer_link: explorerLink,
          receipt_url: receiptUrl,
        })
      } catch (err: any) {
        console.error(`Transfer to ${c.name} failed:`, err)
        if (payment) {
          await supabase
            .from('payroll_payments')
            .update({ status: 'failed' })
            .eq('id', payment.id)
        }
        results.push({
          contractor_id: c.id,
          contractor_name: c.name,
          amount: c.amount_usdc,
          status: 'failed',
          error: err.message,
        })
      }
    }

    const succeeded = results.filter(r => r.status === 'confirmed').length
    const pending = results.filter(r => r.status === 'pending').length
    const failed = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length

    // all_settled is true only when every non-skipped transfer reached COMPLETE.
    // The cron caller advances next_pay_date ONLY when this is true, so a still
    // pending/failed transfer causes the cycle to be re-driven next run (the
    // idempotency guard prevents the confirmed ones from being paid again).
    const allSettled = pending === 0 && failed === 0

    return res.status(200).json({
      all_settled: allSettled,
      results,
      summary: { total: results.length, succeeded, pending, failed, skipped },
    })
  } catch (err: any) {
    console.error('Transfer API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
