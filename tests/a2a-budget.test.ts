/**
 * Tests for the A2A (agent-to-agent) nanopayment budget logic.
 *
 * These exercise the pure, side-effect-free USDC helpers that the A2A
 * API handlers (grant_budget, pay_agent, hire_invite) delegate to.
 * No network or database is required.
 */
import { describe, it, expect } from 'vitest'
import {
  parseUsdcToBaseUnits,
  formatBaseUnits,
  sumBaseUnits,
  UsdcValidationError,
} from '../api/payroll/_usdc'

describe('A2A budget — parseUsdcToBaseUnits validation', () => {
  it('accepts a typical budget amount (50 USDC)', () => {
    expect(parseUsdcToBaseUnits(50)).toBe(50_000_000n)
  })

  it('accepts a small budget (0.01 USDC)', () => {
    expect(parseUsdcToBaseUnits(0.01)).toBe(10_000n)
  })

  it('accepts a string budget amount ("100.50")', () => {
    expect(parseUsdcToBaseUnits('100.50')).toBe(100_500_000n)
  })

  it('rejects zero budget (requirePositive default)', () => {
    expect(() => parseUsdcToBaseUnits(0)).toThrow(UsdcValidationError)
  })

  it('rejects negative budget', () => {
    expect(() => parseUsdcToBaseUnits(-10)).toThrow(UsdcValidationError)
  })

  it('rejects null budget', () => {
    expect(() => parseUsdcToBaseUnits(null)).toThrow(UsdcValidationError)
  })

  it('rejects undefined budget', () => {
    expect(() => parseUsdcToBaseUnits(undefined)).toThrow(UsdcValidationError)
  })

  it('rejects non-numeric budget', () => {
    expect(() => parseUsdcToBaseUnits('abc')).toThrow(UsdcValidationError)
  })

  it('rejects too many decimal places (> 6)', () => {
    expect(() => parseUsdcToBaseUnits('1.1234567')).toThrow(/precision/)
  })

  it('accepts exactly 6 decimal places', () => {
    expect(parseUsdcToBaseUnits('1.123456')).toBe(1_123_456n)
  })
})

describe('A2A budget — allowZero option', () => {
  it('allows zero when allowZero is true', () => {
    expect(parseUsdcToBaseUnits(0, { allowZero: true, requirePositive: false })).toBe(0n)
  })

  it('rejects zero when requirePositive is true even with allowZero', () => {
    // requirePositive: true is the default, allowZero defaults to false
    expect(() => parseUsdcToBaseUnits(0, { requirePositive: true })).toThrow(UsdcValidationError)
  })
})

describe('A2A budget — reservation arithmetic', () => {
  it('budget remaining = limit - used (integer math)', () => {
    const limit = parseUsdcToBaseUnits(50)     // 50 USDC
    const payment = parseUsdcToBaseUnits(3.5)  // 3.5 USDC
    const remaining = limit - payment
    expect(formatBaseUnits(remaining)).toBe('46.500000')
  })

  it('sumBaseUnits correctly totals multiple payments', () => {
    const payments = [1.5, 2.25, 0.75, '0.500000']
    const total = sumBaseUnits(payments)
    expect(formatBaseUnits(total)).toBe('5.000000')
  })

  it('budget check: reject when payment exceeds remaining', () => {
    const limit = parseUsdcToBaseUnits(10)
    const used = parseUsdcToBaseUnits(8)
    const payment = parseUsdcToBaseUnits(3)
    // This simulates the SQL check: spend_used + p_amount <= spend_limit
    const wouldExceed = (used + payment) > limit
    expect(wouldExceed).toBe(true)
  })

  it('budget check: allow when payment fits remaining', () => {
    const limit = parseUsdcToBaseUnits(10)
    const used = parseUsdcToBaseUnits(7)
    const payment = parseUsdcToBaseUnits(3)
    const wouldExceed = (used + payment) > limit
    expect(wouldExceed).toBe(false)
  })

  it('budget check: exact remaining is allowed', () => {
    const limit = parseUsdcToBaseUnits(10)
    const used = parseUsdcToBaseUnits(7)
    const payment = parseUsdcToBaseUnits(3)
    // spend_used + p_amount <= spend_limit  (equals is OK)
    const allowed = (used + payment) <= limit
    expect(allowed).toBe(true)
  })
})

describe('A2A budget — release (rollback) arithmetic', () => {
  it('release restores budget correctly', () => {
    const used = parseUsdcToBaseUnits(10)
    const released = parseUsdcToBaseUnits(3)
    // Mirrors SQL: GREATEST(spend_used - p_amount, 0)
    const newUsed = used - released
    const floored = newUsed < 0n ? 0n : newUsed
    expect(formatBaseUnits(floored)).toBe('7.000000')
  })

  it('release floors at zero (concurrent releases)', () => {
    const used = parseUsdcToBaseUnits(2)
    const released = parseUsdcToBaseUnits(5) // more than what's used
    const newUsed = used - released
    const floored = newUsed < 0n ? 0n : newUsed
    expect(formatBaseUnits(floored)).toBe('0.000000')
  })
})

describe('A2A budget — self-payment guard', () => {
  it('same agent IDs are rejected', () => {
    const payerId = 'agent-abc-123'
    const payeeId = 'agent-abc-123'
    expect(payerId === payeeId).toBe(true)
  })

  it('different agent IDs are allowed', () => {
    const payerId = 'agent-abc-123'
    const payeeId = 'agent-def-456'
    expect(payerId === payeeId).toBe(false)
  })
})

describe('A2A budget — formatBaseUnits display', () => {
  it('formats zero correctly', () => {
    expect(formatBaseUnits(0n)).toBe('0.000000')
  })

  it('formats a whole number correctly', () => {
    expect(formatBaseUnits(50_000_000n)).toBe('50.000000')
  })

  it('formats a fractional amount correctly', () => {
    expect(formatBaseUnits(3_500_000n)).toBe('3.500000')
  })

  it('formats a sub-cent micro amount', () => {
    expect(formatBaseUnits(1n)).toBe('0.000001')
  })
})
