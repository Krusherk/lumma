/**
 * GET /api/payroll/cron
 *
 * Vercel Cron job — runs on schedule to auto-disburse payroll
 * for companies with non-manual pay schedules.
 *
 * Configured in vercel.json:
 *   { "crons": [{ "path": "/api/payroll/cron", "schedule": "0 9 * * *" }] }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

const APP_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron call (Vercel sets this header)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in dev mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const today = new Date()

    // Find companies with scheduled payroll due today
    const { data: companiesData } = await supabase
      .from('payroll_companies')
      .select('*')
      .neq('pay_schedule', 'manual')
      .lte('next_pay_date', today.toISOString())

    const companies = companiesData || []

    let processed = 0

    for (const company of companies) {

      // Get all active contractors
      const { data: contractors } = await supabase
        .from('payroll_contractors')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'active')

      if (!contractors?.length) continue

      // Call the transfer endpoint
      try {
        await fetch(`${APP_URL}/api/payroll/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: company.id,
            contractor_ids: contractors.map(c => c.id),
          }),
        })
        processed++
      } catch (err) {
        console.error(`Cron: failed to process company ${company.id}:`, err)
      }

      // Calculate next pay date
      const nextDate = new Date(company.next_pay_date)
      switch (company.pay_schedule) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + 14)
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
      }

      await supabase
        .from('payroll_companies')
        .update({ next_pay_date: nextDate.toISOString() })
        .eq('id', company.id)
    }

    // ── Nanopayment sweep: settle batched agent payouts that crossed their threshold ──
    let sweep: any = null
    try {
      const sweepRes = await fetch(`${APP_URL}/api/payroll/agent?action=sweep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      sweep = await sweepRes.json()
    } catch (err) {
      console.error('Cron: nanopayment sweep failed:', err)
      sweep = { error: 'sweep failed' }
    }

    return res.status(200).json({
      message: `Processed ${processed} payrolls`,
      processed,
      total_due: companies.length,
      nanopayment_sweep: sweep,
    })
  } catch (err: any) {

    console.error('Cron error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
