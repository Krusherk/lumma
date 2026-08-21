/**
 * GET /.well-known/x402.json
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { discoveryItems } from '../x402/_catalog.js'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=60')
  const items = discoveryItems()
  return res.status(200).json({
    x402Version: 2,
    items,
    pagination: { limit: items.length, offset: 0, total: items.length },
  })
}
