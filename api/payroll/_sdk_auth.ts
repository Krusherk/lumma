/**
 * SDK API Key authentication middleware.
 *
 * External developers authenticate via Bearer token (API key) in the
 * Authorization header. Each key is scoped to a single platform and
 * maps to an owner wallet that becomes the vault owner.
 *
 * API keys are stored in `sdk_api_keys` (Supabase) and validated on
 * every SDK request.  Rate-limiting is per-key (60 req/min).
 */
import type { VercelRequest } from '@vercel/node'
import crypto from 'crypto'
import { supabase } from './_supabase.js'

// ── Rate limiter: 60 req/min per API key ──
const SDK_RATE_LIMIT = 60
const SDK_RATE_WINDOW_MS = 60_000
const sdkBuckets = new Map<string, number[]>()

function checkSdkRateLimit(key: string): boolean {
  const now = Date.now()
  const hits = (sdkBuckets.get(key) || []).filter(t => now - t < SDK_RATE_WINDOW_MS)
  if (hits.length >= SDK_RATE_LIMIT) {
    sdkBuckets.set(key, hits)
    return false
  }
  hits.push(now)
  sdkBuckets.set(key, hits)
  if (sdkBuckets.size > 5_000) {
    for (const [k, ts] of sdkBuckets) {
      if (ts.every(t => now - t >= SDK_RATE_WINDOW_MS)) sdkBuckets.delete(k)
    }
  }
  return true
}

export interface SdkKeyRecord {
  id: string
  api_key_hash: string
  platform_name: string
  owner_wallet: string
  permissions: string[]  // e.g. ['vaults.create','agents.register','payments.settle']
  status: 'active' | 'revoked'
  created_at: string
}

/**
 * Generate a new SDK API key.
 * Returns the raw key (shown once) and the SHA-256 hash (stored in DB).
 */
export function generateSdkApiKey(): { raw: string; hash: string } {
  const raw = `lma_sdk_${crypto.randomBytes(24).toString('hex')}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

/**
 * Authenticate an SDK request. Returns the key record on success, null on failure.
 * Sets rate-limit headers on the response-like object if provided.
 */
export async function authenticateSdkKey(
  req: VercelRequest,
): Promise<SdkKeyRecord | null> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey.startsWith('lma_sdk_')) return null

  // Hash the provided key and look it up
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  // Rate-limit check (use hash as key to avoid storing raw keys)
  if (!checkSdkRateLimit(keyHash)) return null

  const { data, error } = await supabase
    .from('sdk_api_keys')
    .select('*')
    .eq('api_key_hash', keyHash)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  return data as SdkKeyRecord
}

/**
 * Check if a key has a specific permission.
 */
export function hasPermission(key: SdkKeyRecord, perm: string): boolean {
  return key.permissions.includes('*') || key.permissions.includes(perm)
}
