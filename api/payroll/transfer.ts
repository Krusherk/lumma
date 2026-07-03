/**
 * POST /api/payroll/transfer
 *
 * Disburse USDC from a company's Circle Developer-Controlled Wallet
 * to their contractors. No mock/simulation mode — Circle API is required.
 *
 * Body: { company_id: string, contractor_ids: string[] }
 * Returns: { results: [{ contractor_id, status, tx_hash }] }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { transferUSDC, CHAIN_MAP } from './_circle.js'

const RECEIPT_BASE_URL = 'https://payroll.lumma.xyz'

function generateReceiptId(): string {
  return `LMA-${crypto.randomBytes(4).toString('hex')}`
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { company_id, contractor_ids } = req.body

    if (!company_id || !contractor_ids?.length) {
      return res.status(400).json({ error: 'company_id and contractor_ids required' })
    }

    // Get company + vault info
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

    // Get contractors to pay
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

    for (const c of contractors) {
      const chain = CHAIN_MAP[c.chain_id] || company.vault_chain || 'ARC-TESTNET'

      // Create pending payment record
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
        // Real Circle transfer via SDK (polls for completion + txHash)
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
            .update({
              status,
              tx_hash: txHash,
              circle_tx_id: txId,
            })
            .eq('id', payment.id)
        }

        // Generate public receipt
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

    return res.status(200).json({
      results,
      summary: { total: results.length, succeeded, pending, failed },
    })
  } catch (err: any) {
    console.error('Transfer API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
