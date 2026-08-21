/**
 * GET /x402/discovery/resources
 *
 * Local catalog in Circle Agent Marketplace Discovery API shape.
 * Circle's public catalog at api.circle.com is populated via their
 * manual listing form; this endpoint is what agents and reviewers
 * crawl on Lumma itself.
 *
 * Listing intake (manual): https://forms.gle/7YFzvdmMcn1JH5tF6
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { discoveryItems } from './_catalog.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=60')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' })

  const items = discoveryItems()
  const query = String(req.query.query || '').toLowerCase()
  const filtered = query
    ? items.filter(item =>
        `${item.resource} ${item.metadata.description} ${item.metadata.provider.tags.join(' ')}`
          .toLowerCase()
          .includes(query),
      )
    : items

  return res.status(200).json({
    x402Version: 2,
    items: filtered,
    pagination: { limit: filtered.length, offset: 0, total: filtered.length },
  })
}
