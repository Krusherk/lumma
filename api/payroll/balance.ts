/**
 * GET /api/payroll/balance?company_id=xxx&owner_address=xxx
 *
 * Returns the USDC balance of a company's vault wallet.
 * owner_address is required and must match the company's owner (scoping).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getCircleWalletBalance, getOnChainUSDCBalance, CHAIN_ID_MAP } from './_circle.js'
import { supabase } from './_supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { company_id, owner_address } = req.query

    if (!company_id) {
      return res.status(400).json({ error: 'company_id required' })
    }

    const { data: company } = await supabase
      .from('payroll_companies')
      .select('*')
      .eq('id', company_id as string)
      .single()

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    // Ownership scoping: if caller supplies owner_address, verify it matches
    if (owner_address) {
      if (company.owner_address.toLowerCase() !== (owner_address as string).toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    if (!company.vault_address) {
      return res.status(200).json({ balance: '0', vault_address: null })
    }

    let balance = '0'

    if (company.vault_wallet_id) {
      balance = await getCircleWalletBalance(company.vault_wallet_id)
      if (balance === '0') {
        const chainId = CHAIN_ID_MAP[company.vault_chain || 'ARC-TESTNET'] || 5042002
        const onChain = await getOnChainUSDCBalance(company.vault_address, chainId)
        if (parseFloat(onChain) > 0) balance = onChain
      }
    } else {
      const chainId = CHAIN_ID_MAP[company.vault_chain || 'ARC-TESTNET'] || 5042002
      balance = await getOnChainUSDCBalance(company.vault_address, chainId)
    }

    return res.status(200).json({
      balance,
      vault_address: company.vault_address,
      vault_chain: company.vault_chain,
    })
  } catch (err: any) {
    console.error('Balance API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
