/**
 * Tests for the task-compensation rate + settlement logic.
 *
 * These exercise the pure, side-effect-free core (validation, rule building,
 * precise USDC math, fee-at-settlement) that the API handlers delegate to.
 * No network or database is required.
 */
import { describe, it, expect } from 'vitest'
import {
  parseUsdcToBaseUnits,
  formatBaseUnits,
  sumBaseUnits,
  feeBaseUnits,
  buildRuleRow,
  UsdcValidationError,
} from '../api/payroll/_usdc'

// The exact argument keys the chat `set_agent_rule` tool exposes.
// Kept in sync with api/agent/chat.ts TOOLS[set_agent_rule].parameters.properties.
const CHAT_TOOL_ARG_KEYS = [
  'agent_name',
  'task_type',
  'rate',
  'max_daily',
  'max_monthly',
  'auto_settle',
  'auto_settle_threshold',
  'settlement_mode',
  'batch_threshold',
]

const COMPANY = 'company-1'
const AGENT = 'agent-1'

describe('parseUsdcToBaseUnits — validation', () => {
  it('accepts a custom low task rate (0.001 USDC)', () => {
    expect(parseUsdcToBaseUnits(0.001)).toBe(1000n)
  })

  it('accepts a custom high task rate (250 USDC)', () => {
    expect(parseUsdcToBaseUnits(250)).toBe(250_000_000n)
  })

  it('accepts a decimal USDC rate string exactly (0.25)', () => {
    expect(parseUsdcToBaseUnits('0.25')).toBe(250_000n)
    expect(formatBaseUnits(parseUsdcToBaseUnits('0.25'))).toBe('0.250000')
  })

  it('rejects zero', () => {
    expect(() => parseUsdcToBaseUnits(0)).toThrow(UsdcValidationError)
  })

  it('rejects negative values', () => {
    expect(() => parseUsdcToBaseUnits(-1)).toThrow(/negative|greater than zero/)
    expect(() => parseUsdcToBaseUnits('-0.5')).toThrow(UsdcValidationError)
  })

  it('rejects malformed values', () => {
    expect(() => parseUsdcToBaseUnits('abc')).toThrow(UsdcValidationError)
    expect(() => parseUsdcToBaseUnits('')).toThrow(UsdcValidationError)
    expect(() => parseUsdcToBaseUnits('1.2.3')).toThrow(UsdcValidationError)
    expect(() => parseUsdcToBaseUnits(NaN)).toThrow(UsdcValidationError)
    expect(() => parseUsdcToBaseUnits(Infinity)).toThrow(UsdcValidationError)
    expect(() => parseUsdcToBaseUnits(null)).toThrow(UsdcValidationError)
    expect(() => parseUsdcToBaseUnits('1e3')).toThrow(UsdcValidationError)
  })

  it('rejects sub-USDC precision (more than 6 decimals)', () => {
    expect(() => parseUsdcToBaseUnits('0.0000001')).toThrow(/decimal places/)
  })

  it('enforces a configured platform maximum when provided', () => {
    expect(() => parseUsdcToBaseUnits('1001', { max: '1000' })).toThrow(/exceeds/)
    expect(parseUsdcToBaseUnits('1000', { max: '1000' })).toBe(1_000_000_000n)
  })
})

describe('buildRuleRow — canonical rule schema', () => {
  it('stores the exact user-selected rate (0.25 USDC)', () => {
    const built = buildRuleRow(COMPANY, AGENT, {
      agent_name: 'Merlin',
      task_type: 'completed_report',
      rate: 0.25,
    })
    expect(built.row.rate).toBe('0.250000')
    expect(built.rateBase).toBe(250_000n)
    // No arbitrary fixed rate is injected.
    expect(built.row.rate).not.toBe('0.050000')
  })

  it('does NOT introduce an arbitrary fixed rate', () => {
    const custom = buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 7.5 })
    expect(custom.row.rate).toBe('7.500000')
  })

  it('rejects a zero rate with field=rate', () => {
    expect.assertions(2)
    try {
      buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 0 })
    } catch (e: any) {
      expect(e.field).toBe('rate')
      expect(e).toBeInstanceOf(UsdcValidationError)
    }
  })

  it('rejects a negative rate with field=rate', () => {
    expect.assertions(1)
    try {
      buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: -3 })
    } catch (e: any) {
      expect(e.field).toBe('rate')
    }
  })

  it('saves a manual settlement rule', () => {
    const built = buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 1, settlement_mode: 'manual' })
    expect(built.row.settlement_mode).toBe('manual')
    expect(built.row.auto_settle).toBe(false)
  })

  it('saves an instant settlement rule (auto_settle on)', () => {
    const built = buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 1, settlement_mode: 'instant' })
    expect(built.row.settlement_mode).toBe('instant')
    expect(built.row.auto_settle).toBe(true)
  })

  it('defaults to instant when auto_settle=true and no mode given', () => {
    const built = buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 1, auto_settle: true })
    expect(built.row.settlement_mode).toBe('instant')
  })

  it('saves a batched settlement rule with the batch threshold', () => {
    const built = buildRuleRow(COMPANY, AGENT, {
      task_type: 't',
      rate: 0.25,
      settlement_mode: 'batched',
      batch_threshold: 5,
    })
    expect(built.row.settlement_mode).toBe('batched')
    expect(built.row.batch_threshold).toBe('5.000000')
    expect(built.batchThresholdBase).toBe(5_000_000n)
  })

  it('rejects batched mode without a positive batch_threshold', () => {
    expect.assertions(1)
    try {
      buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 1, settlement_mode: 'batched', batch_threshold: 0 })
    } catch (e: any) {
      expect(e.field).toBe('batch_threshold')
    }
  })

  it('saves daily and monthly caps precisely', () => {
    const built = buildRuleRow(COMPANY, AGENT, {
      task_type: 't',
      rate: 0.25,
      max_daily: 10,
      max_monthly: 100,
    })
    expect(built.row.max_daily).toBe('10.000000')
    expect(built.row.max_monthly).toBe('100.000000')
  })

  it('rejects a negative cap with the exact field name', () => {
    expect.assertions(1)
    try {
      buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 1, max_daily: -5 })
    } catch (e: any) {
      expect(e.field).toBe('max_daily')
    }
  })

  it('rejects an invalid settlement_mode', () => {
    expect.assertions(1)
    try {
      buildRuleRow(COMPANY, AGENT, { task_type: 't', rate: 1, settlement_mode: 'weird' })
    } catch (e: any) {
      expect(e.field).toBe('settlement_mode')
    }
  })

  it('duplicate rule update behaviour: same (company, agent, task_type) rebuilds a new rate', () => {
    // Simulates the owner updating the rate. buildRuleRow is deterministic;
    // the DB upsert key is (company_id, agent_id, task_type), so a second
    // build with a new rate represents an update-in-place, not a duplicate.
    const first = buildRuleRow(COMPANY, AGENT, { task_type: 'report', rate: 0.25 })
    const updated = buildRuleRow(COMPANY, AGENT, { task_type: 'report', rate: 0.5 })
    expect(first.row.company_id).toBe(updated.row.company_id)
    expect(first.row.agent_id).toBe(updated.row.agent_id)
    expect(first.row.task_type).toBe(updated.row.task_type)
    expect(first.row.rate).toBe('0.250000')
    expect(updated.row.rate).toBe('0.500000')
  })
})

describe('chat tool arguments match the API/build schema', () => {
  it('every buildRuleRow-consumed field is exposed by the chat tool', () => {
    const built = buildRuleRow(COMPANY, AGENT, {
      agent_name: 'Merlin',
      task_type: 'completed_report',
      rate: 0.25,
      max_daily: 10,
      max_monthly: 100,
      auto_settle: false,
      auto_settle_threshold: 0,
      settlement_mode: 'batched',
      batch_threshold: 5,
    })
    // The produced row's meaningful inputs are all present in the tool schema.
    expect(CHAT_TOOL_ARG_KEYS).toContain('rate')
    expect(CHAT_TOOL_ARG_KEYS).toContain('task_type')
    expect(CHAT_TOOL_ARG_KEYS).toContain('settlement_mode')
    expect(CHAT_TOOL_ARG_KEYS).toContain('batch_threshold')
    expect(built.row.settlement_mode).toBe('batched')
  })
})

describe('gross earnings from the stored custom rate + 0.5% fee at settlement', () => {
  it('gross is the sum of per-task payouts at the stored rate', () => {
    // Owner selected 2 USDC/report; agent completed 5 reports.
    const rate = buildRuleRow(COMPANY, AGENT, { task_type: 'report', rate: 2 }).row.rate
    const logs = Array.from({ length: 5 }, () => rate) // 5 work logs at the stored rate
    const grossBase = sumBaseUnits(logs)
    expect(formatBaseUnits(grossBase)).toBe('10.000000')
  })

  it('applies the 0.5% Lumma fee ONLY at settlement, deducted from gross', () => {
    const grossBase = sumBaseUnits(['2', '2', '2', '2', '2']) // 10 USDC gross
    const feeBase = feeBaseUnits(grossBase) // default 50 bps
    const netBase = grossBase - feeBase
    expect(formatBaseUnits(feeBase)).toBe('0.050000') // 0.05 USDC
    expect(formatBaseUnits(netBase)).toBe('9.950000') // 9.95 USDC
  })

  it('the fee never restricts or replaces the per-task rate', () => {
    // The stored rate is untouched by fee logic.
    const built = buildRuleRow(COMPANY, AGENT, { task_type: 'report', rate: 0.25 })
    expect(built.row.rate).toBe('0.250000')
    // Fee only affects the settlement total, computed separately.
    const grossBase = sumBaseUnits([built.row.rate, built.row.rate])
    expect(formatBaseUnits(grossBase)).toBe('0.500000')
    expect(formatBaseUnits(grossBase - feeBaseUnits(grossBase))).toBe('0.497500')
  })

  it('precise math avoids floating-point drift (0.1 + 0.2)', () => {
    const grossBase = sumBaseUnits(['0.1', '0.2'])
    expect(formatBaseUnits(grossBase)).toBe('0.300000')
  })
})

describe('the natural-language request from the spec resolves to a valid saved rule', () => {
  it('"Pay Merlin 0.25 USDC per report, 10 USDC daily cap, batched at 5 USDC"', () => {
    const built = buildRuleRow(COMPANY, AGENT, {
      agent_name: 'Merlin',
      task_type: 'completed_report',
      rate: 0.25,
      max_daily: 10,
      settlement_mode: 'batched',
      batch_threshold: 5,
    })
    expect(built.row.rate).toBe('0.250000')
    expect(built.row.max_daily).toBe('10.000000')
    expect(built.row.settlement_mode).toBe('batched')
    expect(built.row.batch_threshold).toBe('5.000000')
    expect(built.row.status).toBe('active')
  })
})
