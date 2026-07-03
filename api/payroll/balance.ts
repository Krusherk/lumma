/**
 * GET /api/payroll/balance?company_id=xxx
 *
 * Returns the USDC balance of a company's vault wallet.
 * Uses Circle SDK for Circle-managed wallets, with on-chain RPC fallback.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  getCircleWalletBalance,
  getOnChainUSDCBalance,
  CHAIN_ID_MAP,
} from './_circle.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { company_id } = req.query

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

    if (!company.vault_address) {
      return res.status(200).json({ balance: '0', vault_address: null })
    }

    let balance = '0'

    if (company.vault_wallet_id) {
      // Primary: Circle SDK balance check
      balance = await getCircleWalletBalance(company.vault_wallet_id)

      // If SDK returns 0, double-check on-chain (funds may not have indexed yet)
      if (balance === '0') {
        const chainId = CHAIN_ID_MAP[company.vault_chain || 'ARC-TESTNET'] || 5042002
        const onChain = await getOnChainUSDCBalance(company.vault_address, chainId)
        if (parseFloat(onChain) > 0) {
          balance = onChain
        }
      }
    } else {
      // No Circle wallet ID — query on-chain directly
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
