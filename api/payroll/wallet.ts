/**
 * POST /api/payroll/wallet
 *
 * Creates or retrieves a company's payroll vault.
 * ALWAYS creates a Circle Developer-Controlled Wallet — no fallbacks.
 *
 * Body: { owner_address, company_name, create_new? }
 *   create_new=true  → always mint a fresh vault (multi-vault support)
 *   create_new=false → get-or-create first vault (default, back-compat)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVaultWallet } from './_circle.js'
import { supabase } from './_supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { owner_address, company_name, create_new } = req.body

    if (!owner_address) {
      return res.status(400).json({ error: 'owner_address required' })
    }

    const ownerLower = owner_address.toLowerCase()

    // get-or-create mode (default): return existing vault if one exists
    if (!create_new) {
      const { data: existing } = await supabase
        .from('payroll_companies')
        .select('*')
        .eq('owner_address', ownerLower)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (existing?.vault_wallet_id && existing?.vault_address) {
        return res.status(200).json({
          company_id: existing.id,
          vault_address: existing.vault_address,
          vault_chain: existing.vault_chain || 'ARC-TESTNET',
          name: existing.name,
          pay_schedule: existing.pay_schedule,
        })
      }

      if (existing) {
        // Row exists but no real vault yet — create one and update
        const vault = await createVaultWallet(owner_address)
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
      }
    }

    // create_new=true OR no existing row — always mint a fresh vault
    const vault = await createVaultWallet(owner_address)

    const { data: newCompany, error } = await supabase
      .from('payroll_companies')
      .insert({
        owner_address: ownerLower,
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
  } catch (err: any) {
    console.error('Wallet API error:', err)
    return res.status(500).json({
      error: err.message || 'Internal server error',
      hint: 'Ensure CIRCLE_API_KEY and ENTITY_SECRET are set in your environment.',
    })
  }
}
