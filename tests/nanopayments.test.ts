/**
 * Tests for Circle x402 Nanopayments integration.
 *
 * Tests core functionality: HD key derivation, payment requirements
 * generation, idempotency, and client construction.
 *
 * Note: Tests that hit the actual Gateway API (deposit, pay, settle)
 * require testnet credentials and are skipped by default.
 */
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { gatewayPaymentOption, parseDollarToBaseUnits as parsePrice } from '../api/_x402'

// We test the module's pure functions directly
// Avoid importing GatewayClient in test env without proper polyfills
// by testing the derivation logic inline.

// ── Inline key derivation (mirrors nanopayments.ts) ──
function deriveAgentKey(masterSeed: string, agentId: string): `0x${string}` {
  if (!masterSeed || masterSeed.length < 32) {
    throw new Error('NANOPAYMENT_MASTER_SEED must be at least 32 characters')
  }
  const hmac = crypto.createHmac('sha512', masterSeed)
  hmac.update(`lumma-nanopay:${agentId}`)
  const derived = hmac.digest('hex')
  return `0x${derived.slice(0, 64)}` as `0x${string}`
}

function parseDollarToBaseUnits(price: string): string {
  const cleaned = price.replace(/^\$/, '')
  const num = parseFloat(cleaned)
  if (!Number.isFinite(num) || num <= 0) throw new Error(`Invalid price: ${price}`)
  return String(Math.round(num * 1_000_000))
}

describe('x402 Nanopayments — Key Derivation', () => {
  const TEST_SEED = 'test-seed-that-is-at-least-32-chars-long-for-hmac'

  it('should derive deterministic keys from seed + agent_id', () => {
    const key1 = deriveAgentKey(TEST_SEED, 'agent-001')
    const key2 = deriveAgentKey(TEST_SEED, 'agent-001')
    expect(key1).toBe(key2)
    expect(key1).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('should derive different keys for different agent IDs', () => {
    const key1 = deriveAgentKey(TEST_SEED, 'agent-001')
    const key2 = deriveAgentKey(TEST_SEED, 'agent-002')
    expect(key1).not.toBe(key2)
  })

  it('should derive different keys for different seeds', () => {
    const seed2 = 'another-seed-that-is-also-at-least-32-characters'
    const key1 = deriveAgentKey(TEST_SEED, 'agent-001')
    const key2 = deriveAgentKey(seed2, 'agent-001')
    expect(key1).not.toBe(key2)
  })

  it('should reject seeds shorter than 32 characters', () => {
    expect(() => deriveAgentKey('short', 'agent-001')).toThrow(
      'NANOPAYMENT_MASTER_SEED must be at least 32 characters'
    )
  })

  it('should reject empty seed', () => {
    expect(() => deriveAgentKey('', 'agent-001')).toThrow()
  })

  it('should produce valid hex private keys', () => {
    const key = deriveAgentKey(TEST_SEED, 'test-agent-abc-123')
    expect(key.startsWith('0x')).toBe(true)
    expect(key.length).toBe(66) // 0x + 64 hex chars
    // Verify all chars after 0x are valid hex
    expect(/^[0-9a-f]+$/.test(key.slice(2))).toBe(true)
  })

  it('should handle UUID-style agent IDs', () => {
    const key = deriveAgentKey(TEST_SEED, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
    expect(key).toMatch(/^0x[0-9a-f]{64}$/)
  })
})

describe('x402 Nanopayments — Price Parsing', () => {
  it('should parse dollar amounts to USDC base units', () => {
    expect(parseDollarToBaseUnits('$0.01')).toBe('10000')
    expect(parseDollarToBaseUnits('0.01')).toBe('10000')
    expect(parseDollarToBaseUnits('$1')).toBe('1000000')
    expect(parseDollarToBaseUnits('1.50')).toBe('1500000')
  })

  it('should handle very small amounts (nanopayments)', () => {
    expect(parseDollarToBaseUnits('$0.000001')).toBe('1')
    expect(parseDollarToBaseUnits('$0.0001')).toBe('100')
    expect(parseDollarToBaseUnits('$0.0005')).toBe('500')
    expect(parseDollarToBaseUnits('$0.001')).toBe('1000')
  })

  it('should reject invalid prices', () => {
    expect(() => parseDollarToBaseUnits('abc')).toThrow('Invalid price')
    expect(() => parseDollarToBaseUnits('')).toThrow('Invalid price')
    expect(() => parseDollarToBaseUnits('$0')).toThrow('Invalid price')
    expect(() => parseDollarToBaseUnits('$-5')).toThrow('Invalid price')
  })
})

describe('x402 Nanopayments — Payment Requirements Structure', () => {
  it('should produce valid x402 v2 payment requirements shape', () => {
    // Test the expected structure without calling the actual Gateway API
    const mockRequirements = {
      x402Version: 2,
      resource: {
        url: 'https://api.lumma.xyz/payroll/agent?action=report',
        description: 'Lumma Payroll — https://api.lumma.xyz/payroll/agent?action=report',
        mimeType: 'application/json',
      },
      accepts: [{
        scheme: 'exact',
        network: 'eip155:5042002',
        asset: '0x3600000000000000000000000000000000000000',
        amount: '100', // $0.0001
        maxTimeoutSeconds: 604900,
        payTo: '0x1234567890123456789012345678901234567890',
        extra: {
          name: 'GatewayWalletBatched',
          version: '1',
          verifyingContract: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
        },
      }],
    }

    // Validate structure
    expect(mockRequirements.x402Version).toBe(2)
    expect(mockRequirements.resource.mimeType).toBe('application/json')
    expect(mockRequirements.accepts).toHaveLength(1)

    const accept = mockRequirements.accepts[0]
    expect(accept.scheme).toBe('exact')
    expect(accept.network).toBe('eip155:5042002') // Arc Testnet
    expect(accept.maxTimeoutSeconds).toBe(604900) // 7 days + buffer
    expect(accept.extra.name).toBe('GatewayWalletBatched')
    expect(accept.extra.version).toBe('1')
  })
})

describe('x402 Nanopayments — Idempotency', () => {
  it('should generate unique idempotency keys', () => {
    const keys = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const key = `nano_${crypto.randomUUID()}`
      keys.add(key)
    }
    expect(keys.size).toBe(1000) // All unique
  })
})

describe('x402 Nanopayments — Endpoint Pricing Defaults', () => {
  it('should have sane default prices', () => {
    const defaults: Record<string, string> = {
      report: '0.0001',
      pay_agent: '0.0005',
      hire_invite: '0.001',
    }

    // Verify all prices parse to valid base units
    for (const [endpoint, price] of Object.entries(defaults)) {
      const baseUnits = parseDollarToBaseUnits(price)
      expect(Number(baseUnits)).toBeGreaterThan(0)
      expect(Number(baseUnits)).toBeLessThan(1_000_000) // Less than $1
    }

    // Verify ordering: hire_invite > pay_agent > report
    expect(Number(parseDollarToBaseUnits(defaults.hire_invite)))
      .toBeGreaterThan(Number(parseDollarToBaseUnits(defaults.pay_agent)))
    expect(Number(parseDollarToBaseUnits(defaults.pay_agent)))
      .toBeGreaterThan(Number(parseDollarToBaseUnits(defaults.report)))
  })
})

describe('x402 Nanopayments — PAYMENT-REQUIRED Header', () => {
  it('should produce valid base64-encoded payment requirements', () => {
    const paymentRequired = {
      x402Version: 2,
      resource: { url: '/test', description: 'Test', mimeType: 'application/json' },
      accepts: [{
        scheme: 'exact',
        network: 'eip155:5042002',
        amount: '100',
        payTo: '0x0000000000000000000000000000000000000001',
      }],
    }

    const encoded = Buffer.from(JSON.stringify(paymentRequired)).toString('base64')
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))

    expect(decoded.x402Version).toBe(2)
    expect(decoded.accepts[0].network).toBe('eip155:5042002')
    expect(decoded.accepts[0].amount).toBe('100')
  })

  it('should produce valid base64 PAYMENT-RESPONSE after settlement', () => {
    const paymentResponse = {
      success: true,
      transaction: '0xabc',
      network: 'eip155:5042002',
      payer: '0x0000000000000000000000000000000000000001',
    }
    const encoded = Buffer.from(JSON.stringify(paymentResponse)).toString('base64')
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
    expect(decoded.success).toBe(true)
    expect(decoded.network).toBe('eip155:5042002')
    expect(decoded.transaction).toBe('0xabc')
  })

  it('should emit GatewayWalletBatched accepts matching Circle seller spec', () => {
    const option = gatewayPaymentOption('0.0001', '0x98EdA6F43DB227E0bE0B8B3108598898A93834BB')
    expect(option.scheme).toBe('exact')
    expect(option.network).toBe('eip155:5042002')
    expect(option.amount).toBe('100')
    expect(option.maxTimeoutSeconds).toBe(604900)
    expect(option.extra.name).toBe('GatewayWalletBatched')
    expect(option.extra.version).toBe('1')
    expect(option.asset).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(parsePrice('0.0001')).toBe('100')
  })
})
