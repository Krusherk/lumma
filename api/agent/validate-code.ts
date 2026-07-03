/**
 * POST /api/agent/validate-code
 * 
 * Validates an invite code — one code per wallet.
 * When a code is first used, it binds to that wallet.
 * Same wallet + same code = allowed again (re-login).
 * Same code + different wallet = rejected.
 * 
 * Uses Supabase `agent_invite_codes` table.
 * Falls back to hardcoded codes if Supabase is unreachable.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

// Fallback codes if Supabase is down
const FALLBACK_CODES = new Set([
  'LMA-VK82-QXNW', 'LMA-TP63-JYHB', 'LMA-NR47-FWDZ', 'LMA-GC95-MXVK',
  'LMA-DW38-HTPN', 'LMA-BX71-KCRF', 'LMA-MJ54-ZQWG', 'LMA-FK29-XNYD',
  'LMA-QH86-BVTM', 'LMA-WN43-RPJC', 'LMA-YD67-KVFX', 'LMA-XB92-GNHW',
  'LMA-HT15-DQMZ', 'LMA-RC78-WKBJ', 'LMA-ZP34-NFYV', 'LMA-JV69-TXHM',
  'LMA-CK27-QGDW', 'LMA-FN83-YBXR', 'LMA-PG46-HCNK', 'LMA-VW51-ZTJF',
  'LMA-KX98-DMQB', 'LMA-TH25-FVRN', 'LMA-QB74-WCJX', 'LMA-DR16-NKHG',
  'LMA-NF59-XPMV', 'LMA-WC32-JBTY', 'LMA-GR87-KZNQ', 'LMA-XJ41-HVWD',
  'LMA-BN76-QFCM', 'LMA-HK28-YTRX',
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { code, walletAddress } = req.body || {}
    if (!code || !walletAddress) {
      return res.status(400).json({ error: 'code and walletAddress required' })
    }

    const trimmedCode = String(code).trim().toUpperCase()
    const wallet = String(walletAddress).toLowerCase()

    // Try Supabase first
    try {
      // Look up the code
      const { data: invite, error: lookupErr } = await supabase
        .from('agent_invite_codes')
        .select('*')
        .eq('code', trimmedCode)
        .single()

      if (lookupErr || !invite) {
        return res.status(404).json({ error: 'Invalid invite code' })
      }

      // Code exists — check if it's been used
      if (invite.wallet_address) {
        // Already claimed — only allow the same wallet
        if (invite.wallet_address === wallet) {
          const sessionId = `${trimmedCode}-${wallet.slice(2, 10)}`
          return res.status(200).json({ sessionId, status: 'existing' })
        } else {
          return res.status(403).json({ error: 'This code has already been used by another wallet' })
        }
      }

      // Code is unclaimed — bind it to this wallet
      const { error: updateErr } = await supabase
        .from('agent_invite_codes')
        .update({ wallet_address: wallet, used_at: new Date().toISOString() })
        .eq('id', invite.id)

      if (updateErr) {
        console.error('Failed to bind code:', updateErr)
        return res.status(500).json({ error: 'Failed to activate code' })
      }

      const sessionId = `${trimmedCode}-${wallet.slice(2, 10)}`
      return res.status(200).json({ sessionId, status: 'created' })

    } catch (dbErr) {
      // Supabase unreachable — fall back to hardcoded codes
      console.error('Supabase error, using fallback:', dbErr)

      if (!FALLBACK_CODES.has(trimmedCode)) {
        return res.status(404).json({ error: 'Invalid invite code' })
      }

      const sessionId = `${trimmedCode}-${wallet.slice(2, 10)}`
      return res.status(200).json({ sessionId, status: 'fallback' })
    }

  } catch (err: any) {
    console.error('validate-code error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
