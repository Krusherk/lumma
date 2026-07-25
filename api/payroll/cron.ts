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
import { supabase } from '../payroll/_supabase.js'

const APP_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || ''

function internalHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-internal-secret': INTERNAL_SECRET,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: require the Vercel Cron bearer secret whenever it is configured.
  // Fail closed in every environment except pure local dev (no CRON_SECRET set).
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    // Deployed without a CRON_SECRET — refuse rather than run unauthenticated.
    console.error('[lumma] FATAL: CRON_SECRET not set on a deployed environment; refusing to run cron.')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const today = new Date()

    const { data: companiesData } = await supabase
      .from('payroll_companies')
      .select('*')
      .neq('pay_schedule', 'manual')
      .lte('next_pay_date', today.toISOString())

    const companies = companiesData || []
    let processed = 0

    for (const company of companies) {
      const { data: contractors } = await supabase
        .from('payroll_contractors')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'active')

      if (!contractors?.length) continue

      try {
        const transferRes = await fetch(`${APP_URL}/api/payroll/transfer`, {
          method: 'POST',
          headers: internalHeaders(),
          body: JSON.stringify({
            company_id: company.id,
            contractor_ids: contractors.map(c => c.id),
          }),
        })

        if (!transferRes.ok) {
          console.error(`Cron: transfer failed for company ${company.id} — HTTP ${transferRes.status}`)
          continue // don't advance next_pay_date on failure
        }

        // Only advance the schedule when the transfer endpoint reports that
        // EVERY contractor reached a terminal COMPLETE state. A pending/failed
        // transfer leaves all_settled=false, so we re-drive next run (the
        // transfer endpoint's idempotency guard prevents double-paying the
        // ones that already confirmed).
        let transferBody: any = null
        try {
          transferBody = await transferRes.json()
        } catch {
          console.error(`Cron: could not parse transfer response for company ${company.id}`)
          continue
        }

        if (!transferBody?.all_settled) {
          console.error(`Cron: company ${company.id} not fully settled; leaving next_pay_date unchanged`)
          continue
        }

        processed++

        // Only advance next_pay_date after a successful transfer
        const nextDate = new Date(company.next_pay_date)
        switch (company.pay_schedule) {
          case 'weekly':   nextDate.setDate(nextDate.getDate() + 7);   break
          case 'biweekly': nextDate.setDate(nextDate.getDate() + 14);  break
          case 'monthly':  nextDate.setMonth(nextDate.getMonth() + 1); break
        }

        await supabase
          .from('payroll_companies')
          .update({ next_pay_date: nextDate.toISOString() })
          .eq('id', company.id)
      } catch (err) {
        console.error(`Cron: failed to process company ${company.id}:`, err)
      }
    }

    // Nanopayment sweep
    let sweep: any = null
    try {
      const sweepRes = await fetch(`${APP_URL}/api/payroll/agent?action=sweep`, {
        method: 'POST',
        headers: internalHeaders(),
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
