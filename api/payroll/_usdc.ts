/**
 * USDC money helpers — precise, integer-based arithmetic.
 *
 * All financial values in Lumma are USDC with 6 decimals. To avoid
 * floating-point rounding errors we represent amounts internally as
 * **integer base units** (1 USDC = 1_000_000 base units) using BigInt,
 * and only format back to a decimal string at the API boundary.
 *
 * NEVER perform financial arithmetic with JS floating-point numbers.
 */

export const USDC_DECIMALS = 6
export const USDC_SCALE = 1_000_000n // 10 ** 6

// ── Platform safety limit ─────────────────────────────────────────────
// This is NOT an arbitrary task rate. It is an OPTIONAL, explicitly
// configurable maximum a single task rate (or cap) may take, to guard
// against fat-finger / malicious huge values. Disabled unless configured.
//   MAX_TASK_RATE_USDC = "1000"  → reject rates above 1000 USDC/task
// When unset, no maximum is enforced (only zero/negative/malformed reject).
export const MAX_TASK_RATE_USDC: string | null =
  process.env.MAX_TASK_RATE_USDC && process.env.MAX_TASK_RATE_USDC.trim() !== ''
    ? process.env.MAX_TASK_RATE_USDC.trim()
    : null

// ── Settlement fee (Lumma's revenue) ──────────────────────────────────
// Applied ONLY at settlement, deducted from gross. Default 0.5% (50 bps).
// This must never replace or restrict the user-selected task rate.
export const SETTLEMENT_FEE_BPS = BigInt(
  Number.isFinite(Number(process.env.SETTLEMENT_FEE_BPS))
    ? Math.trunc(Number(process.env.SETTLEMENT_FEE_BPS))
    : 50
)

export class UsdcValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsdcValidationError'
  }
}

/**
 * Parse a user-supplied USDC amount into integer base units (BigInt).
 *
 * Accepts numbers or numeric strings. Rejects:
 *   - non-finite / NaN / non-numeric ("abc", "", null, Infinity)
 *   - more than 6 decimal places (finer than USDC precision)
 *   - (when requirePositive) zero and negative values
 *   - values above the configured platform maximum (if any)
 *
 * @throws UsdcValidationError on any invalid input.
 */
export function parseUsdcToBaseUnits(
  input: unknown,
  opts: { requirePositive?: boolean; allowZero?: boolean; max?: string | null } = {}
): bigint {
  const { requirePositive = true, allowZero = false } = opts
  const max = opts.max === undefined ? MAX_TASK_RATE_USDC : opts.max

  if (input === null || input === undefined) {
    throw new UsdcValidationError('amount is required')
  }

  // Normalise to a trimmed string representation.
  let raw: string
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new UsdcValidationError('amount must be a finite number')
    // Avoid scientific notation for small/large numbers.
    raw = decimalStringFromNumber(input)
  } else if (typeof input === 'string') {
    raw = input.trim()
  } else {
    throw new UsdcValidationError('amount must be a number or numeric string')
  }

  if (raw === '') throw new UsdcValidationError('amount must not be empty')

  // Strict decimal: optional leading '-', digits, optional '.digits'. No exponents.
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!m) throw new UsdcValidationError(`malformed amount: "${raw}"`)

  const negative = m[1] === '-'
  const intPart = m[2]
  const fracPart = m[3] || ''

  if (fracPart.length > USDC_DECIMALS) {
    throw new UsdcValidationError(
      `amount has more than ${USDC_DECIMALS} decimal places (USDC precision): "${raw}"`
    )
  }

  const fracPadded = (fracPart + '000000').slice(0, USDC_DECIMALS)
  let base = BigInt(intPart) * USDC_SCALE + BigInt(fracPadded)
  if (negative) base = -base

  if (base < 0n) throw new UsdcValidationError(`amount must not be negative: "${raw}"`)
  if (base === 0n && requirePositive && !allowZero) {
    throw new UsdcValidationError('amount must be greater than zero')
  }

  if (max != null) {
    const maxBase = parseUsdcToBaseUnits(max, { requirePositive: false, allowZero: true, max: null })
    if (base > maxBase) {
      throw new UsdcValidationError(
        `amount ${raw} exceeds the configured platform maximum of ${max} USDC`
      )
    }
  }

  return base
}

/** Format integer base units back to a fixed 6-dp USDC decimal string. */
export function formatBaseUnits(base: bigint, decimals = USDC_DECIMALS): string {
  const negative = base < 0n
  const abs = negative ? -base : base
  const whole = abs / USDC_SCALE
  const frac = (abs % USDC_SCALE).toString().padStart(USDC_DECIMALS, '0')
  const trimmed = decimals >= USDC_DECIMALS ? frac : frac.slice(0, decimals)
  const body = decimals > 0 ? `${whole}.${trimmed.padEnd(decimals, '0')}` : `${whole}`
  return (negative ? '-' : '') + body
}

/** Sum a list of USDC values (numbers/strings/base-unit bigints) precisely. */
export function sumBaseUnits(values: Array<unknown>): bigint {
  let total = 0n
  for (const v of values) {
    if (typeof v === 'bigint') {
      total += v
    } else {
      total += parseUsdcToBaseUnits(v, { requirePositive: false, allowZero: true })
    }
  }
  return total
}

/**
 * Compute the settlement fee (in base units) for a gross amount (base units).
 * fee = floor(gross * bps / 10_000). Never exceeds gross. Applied ONLY at
 * settlement — it does not touch the per-task rate.
 */
export function feeBaseUnits(grossBase: bigint, bps: bigint = SETTLEMENT_FEE_BPS): bigint {
  if (grossBase <= 0n) return 0n
  let fee = (grossBase * bps) / 10_000n
  if (fee > grossBase) fee = grossBase
  return fee
}

// ── Rule row builder ──────────────────────────────────────────────────
// Validates a set_agent_rule payload and produces the exact row to persist.
// Throws a UsdcValidationError with a `.field` set to the offending field
// so callers can surface exactly what failed — without ever sending
// unsupported/malformed data to the database or blindly retrying.

const SETTLEMENT_MODES = ['manual', 'instant', 'batched'] as const
export type SettlementMode = (typeof SETTLEMENT_MODES)[number]

export interface BuiltRule {
  row: {
    company_id: string
    agent_id: string | null
    task_type: string
    rate: string
    max_daily: string | null
    max_monthly: string | null
    auto_settle: boolean
    auto_settle_threshold: string
    settlement_mode: SettlementMode
    batch_threshold: string
    status: 'active'
  }
  rateBase: bigint
  maxDailyBase: bigint | null
  maxMonthlyBase: bigint | null
  batchThresholdBase: bigint
  settlementMode: SettlementMode
}

function fieldError(field: string, message: string): UsdcValidationError {
  const err = new UsdcValidationError(message) as UsdcValidationError & { field: string }
  err.field = field
  return err
}

export function buildRuleRow(
  companyId: string,
  agentId: string | null,
  args: any
): BuiltRule {
  const taskType = typeof args?.task_type === 'string' ? args.task_type.trim() : ''
  if (!taskType) throw fieldError('task_type', 'task_type is required')

  // Required: rate — positive decimal, USDC precision, within platform max.
  let rateBase: bigint
  try {
    rateBase = parseUsdcToBaseUnits(args?.rate, { requirePositive: true })
  } catch (e: any) {
    throw fieldError('rate', e.message)
  }

  // Optional caps — if present must be positive & valid.
  const maxDailyBase = optionalPositive('max_daily', args?.max_daily)
  const maxMonthlyBase = optionalPositive('max_monthly', args?.max_monthly)

  // Settlement mode (defaults to instant when auto_settle requested).
  let settlementMode: SettlementMode
  if (args?.settlement_mode != null) {
    if (!SETTLEMENT_MODES.includes(args.settlement_mode)) {
      throw fieldError('settlement_mode', `settlement_mode must be one of ${SETTLEMENT_MODES.join(', ')}`)
    }
    settlementMode = args.settlement_mode
  } else {
    settlementMode = args?.auto_settle ? 'instant' : 'manual'
  }

  // auto_settle_threshold & batch_threshold — allow zero, reject negatives/malformed.
  const autoThresholdBase = args?.auto_settle_threshold == null
    ? 0n
    : safeAmount('auto_settle_threshold', args.auto_settle_threshold, { allowZero: true })
  const batchThresholdBase = args?.batch_threshold == null
    ? 0n
    : safeAmount('batch_threshold', args.batch_threshold, { allowZero: true })

  // Batched mode requires a positive threshold to be meaningful.
  if (settlementMode === 'batched' && batchThresholdBase <= 0n) {
    throw fieldError('batch_threshold', 'batched settlement requires a positive batch_threshold')
  }

  const autoSettle = Boolean(args?.auto_settle) || settlementMode === 'instant'

  return {
    row: {
      company_id: companyId,
      agent_id: agentId,
      task_type: taskType,
      // Store as fixed 6-dp decimal strings → precise NUMERIC in Postgres.
      rate: formatBaseUnits(rateBase),
      max_daily: maxDailyBase != null ? formatBaseUnits(maxDailyBase) : null,
      max_monthly: maxMonthlyBase != null ? formatBaseUnits(maxMonthlyBase) : null,
      auto_settle: autoSettle,
      auto_settle_threshold: formatBaseUnits(autoThresholdBase),
      settlement_mode: settlementMode,
      batch_threshold: formatBaseUnits(batchThresholdBase),
      status: 'active',
    },
    rateBase,
    maxDailyBase,
    maxMonthlyBase,
    batchThresholdBase,
    settlementMode,
  }
}

function optionalPositive(field: string, value: unknown): bigint | null {
  if (value == null || value === '') return null
  return safeAmount(field, value, { allowZero: false })
}

function safeAmount(field: string, value: unknown, opts: { allowZero: boolean }): bigint {
  try {
    return parseUsdcToBaseUnits(value, {
      requirePositive: !opts.allowZero,
      allowZero: opts.allowZero,
    })
  } catch (e: any) {
    throw fieldError(field, e.message)
  }
}

// ── internal ──
function decimalStringFromNumber(n: number): string {

  // Render without scientific notation, preserving up to a generous precision.
  if (Number.isInteger(n)) return n.toString()
  // toFixed with enough digits then strip trailing zeros; guards e-notation.
  let s = n.toFixed(12)
  s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return s
}
