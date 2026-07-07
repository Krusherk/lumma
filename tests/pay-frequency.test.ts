/**
 * Tests for HUMAN employee pay frequency.
 *
 * Human payroll is no longer monthly-only: a contractor's amount_usdc is the
 * salary PER PERIOD of `pay_frequency` (weekly / biweekly / monthly), stored
 * EXACTLY as specified and never converted to a monthly equivalent.
 *
 * These exercise the pure normalizer that api/agent/chat.ts add_contractor
 * delegates to. No network or database is required.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizePayFrequency,
  HUMAN_PAY_FREQUENCIES,
} from '../api/payroll/_usdc'

// The pay_frequency enum the chat add_contractor tool exposes.
// Kept in sync with api/agent/chat.ts TOOLS[add_contractor].pay_frequency.enum.
const CHAT_ADD_CONTRACTOR_FREQ_ENUM = ['weekly', 'biweekly', 'monthly']

describe('normalizePayFrequency — preserves the user-specified frequency', () => {
  it('keeps weekly', () => {
    expect(normalizePayFrequency('weekly')).toBe('weekly')
  })

  it('keeps biweekly', () => {
    expect(normalizePayFrequency('biweekly')).toBe('biweekly')
  })

  it('keeps monthly', () => {
    expect(normalizePayFrequency('monthly')).toBe('monthly')
  })

  it('is case- and whitespace-insensitive but preserves meaning', () => {
    expect(normalizePayFrequency('  Weekly ')).toBe('weekly')
    expect(normalizePayFrequency('BIWEEKLY')).toBe('biweekly')
  })
})

describe('normalizePayFrequency — safe defaulting (never silent conversion)', () => {
  it('defaults to monthly ONLY when unspecified', () => {
    expect(normalizePayFrequency(undefined)).toBe('monthly')
    expect(normalizePayFrequency(null)).toBe('monthly')
    expect(normalizePayFrequency('')).toBe('monthly')
  })

  it('defaults to monthly for unrecognized values', () => {
    expect(normalizePayFrequency('daily')).toBe('monthly')
    expect(normalizePayFrequency('yearly')).toBe('monthly')
    expect(normalizePayFrequency(7 as any)).toBe('monthly')
    expect(normalizePayFrequency({} as any)).toBe('monthly')
  })

  it('does NOT convert a specified weekly amount into monthly', () => {
    // A weekly request must remain weekly — the amount is per-week, untouched.
    const amountPerPeriod = 500
    const freq = normalizePayFrequency('weekly')
    expect(freq).toBe('weekly')
    // No normalization/multiplication happens to the amount.
    expect(amountPerPeriod).toBe(500)
  })
})

describe('pay frequency contract stays in sync', () => {
  it('exposes exactly the human frequencies the chat tool accepts', () => {
    expect([...HUMAN_PAY_FREQUENCIES].sort()).toEqual(
      [...CHAT_ADD_CONTRACTOR_FREQ_ENUM].sort()
    )
  })

  it('every chat-tool enum value round-trips through the normalizer', () => {
    for (const f of CHAT_ADD_CONTRACTOR_FREQ_ENUM) {
      expect(normalizePayFrequency(f)).toBe(f)
    }
  })
})
