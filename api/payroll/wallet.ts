/**
 * POST /api/payroll/wallet
 *
 * Creates or retrieves a company's payroll vault.
 * ALWAYS creates a Circle Developer-Controlled Wallet — no fallbacks.
 * Each user gets a fresh, unique vault wallet.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createVaultWallet } from './_circle.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { owner_address, company_name } = req.body

    if (!owner_address) {
      return res.status(400).json({ error: 'owner_address required' })
    }

    // Check if this user already has a vault
    const { data: existing } = await supabase
      .from('payroll_companies')
      .select('*')
      .eq('owner_address', owner_address.toLowerCase())
      .single()

    if (existing?.vault_wallet_id && existing?.vault_address) {
      // User already has a Circle vault — return it
      return res.status(200).json({
        company_id: existing.id,
        vault_address: existing.vault_address,
        vault_chain: existing.vault_chain || 'ARC-TESTNET',
        name: existing.name,
        pay_schedule: existing.pay_schedule,
      })
    }

    // ── Create a fresh Circle Developer-Controlled Wallet ──
    const vault = await createVaultWallet(owner_address)

    if (existing) {
      // User has a company row but no real vault — update it
      await supabase
        .from('payroll_companies')
        .update({
          vault_address: vault.walletAddress,
          vault_chain: vault.blockchain,
          vault_wallet_id: vault.walletId,
          name: company_name || existing.name,
        })
        .eq('id', existing.id)

      return res.status(200).json({
        company_id: existing.id,
        vault_address: vault.walletAddress,
        vault_chain: vault.blockchain,
        name: company_name || existing.name,
        pay_schedule: existing.pay_schedule,
      })
    } else {
      // Brand new user — insert company + vault
      const { data: newCompany, error } = await supabase
        .from('payroll_companies')
        .insert({
          owner_address: owner_address.toLowerCase(),
          name: company_name || 'My Company',
          vault_address: vault.walletAddress,
          vault_chain: vault.blockchain,
          vault_wallet_id: vault.walletId,
          pay_schedule: 'manual',
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        company_id: newCompany.id,
        vault_address: vault.walletAddress,
        vault_chain: vault.blockchain,
        name: newCompany.name,
        pay_schedule: newCompany.pay_schedule,
      })
    }
  } catch (err: any) {
    console.error('Wallet API error:', err)
    return res.status(500).json({
      error: err.message || 'Internal server error',
      hint: 'Ensure CIRCLE_API_KEY and ENTITY_SECRET are set in your environment.',
    })
  }
}
