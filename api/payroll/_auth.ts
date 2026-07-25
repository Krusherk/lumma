import type { VercelRequest } from '@vercel/node'
import crypto from 'crypto'

const secret = process.env.INTERNAL_API_SECRET

/** Constant-time string compare that never short-circuits on length or content. */
function safeEqual(a: string, b: string): boolean {
  // Hash both sides to fixed-length buffers so length differences don't leak
  // and timingSafeEqual's equal-length requirement is always satisfied.
  const ha = crypto.createHash('sha256').update(a).digest()
  const hb = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

if (process.env.NODE_ENV === 'production' && !secret) {
  console.error('[lumma] FATAL: INTERNAL_API_SECRET is not set. Owner-only endpoints will reject all requests.')
}

/**
 * Returns true only when the request carries the correct internal API secret.
 * Used to gate owner-only endpoints (transfer, approve, sweep, activity, create)
 * so they cannot be called directly by the public.
 *
 * Agent-facing endpoints (link, set_wallet, report, earnings) use Bearer token
 * auth instead and must NOT call this.
 */
export function requireInternalSecret(req: VercelRequest): boolean {
  if (!secret) return false
  const provided = req.headers['x-internal-secret']
  if (typeof provided !== 'string' || provided.length === 0) return false
  return safeEqual(provided, secret)
}
