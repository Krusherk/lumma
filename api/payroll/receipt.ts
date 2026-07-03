/**
 * GET /api/payroll/receipt?id=LMA-xxx
 *
 * Public endpoint to fetch a payroll receipt by its short ID.
 * Used by the payroll.lumma.xyz receipt page.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for subdomain access
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'Receipt ID required' })

  try {
    const { data, error } = await supabase
      .from('payroll_receipts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Receipt not found' })
    }

    return res.status(200).json({ receipt: data })
  } catch (err: any) {
    console.error('Receipt API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
