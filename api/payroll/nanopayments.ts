/**
 * Circle x402 Nanopayments — Core Module
 *
 * Provides seller-side (Gateway payment gating) and buyer-side
 * (AgentNanopaymentClient) functionality for gas-free USDC micropayments
 * via Circle Gateway's batched settlement on Arc Testnet.
 *
 * Architecture:
 *   Seller: uses BatchFacilitatorClient directly (not Express middleware)
 *           since Lumma runs on Vercel serverless functions.
 *   Buyer:  wraps GatewayClient for agent deposit/pay/withdraw.
 *   Keys:   HD-style derivation from a master seed + agent_id.
 *
 * SDK docs: https://developers.circle.com/gateway/nanopayments/references/sdk
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

// ── SDK imports ──────────────────────────────────────────────────────
// Buyer
import { GatewayClient } from '@circle-fin/x402-batching/client'
// Seller
import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server'

// ── Configuration ────────────────────────────────────────────────────

const FACILITATOR_URL =
  process.env.NANOPAYMENT_FACILITATOR_URL || 'https://gateway-api-testnet.circle.com'

const SELLER_ADDRESS =
  process.env.NANOPAYMENT_SELLER_ADDRESS || ''

const MASTER_SEED =
  process.env.NANOPAYMENT_MASTER_SEED || ''

/** Arc Testnet CAIP-2 identifier (chain ID 5042002) */
const ARC_TESTNET_NETWORK = 'eip155:5042002'

/**
 * Default endpoint pricing (USD). Override via env vars:
 *   NANOPAY_PRICE_REPORT=0.0001
 *   NANOPAY_PRICE_PAY_AGENT=0.0005
 *   NANOPAY_PRICE_HIRE_INVITE=0.001
 */
export const ENDPOINT_PRICES: Record<string, string> = {
  report: process.env.NANOPAY_PRICE_REPORT || '0.0001',
  pay_agent: process.env.NANOPAY_PRICE_PAY_AGENT || '0.0005',
  hire_invite: process.env.NANOPAY_PRICE_HIRE_INVITE || '0.001',
}

// ═══════════════════════════════════════════════════════════════════
//  HD Key Derivation
// ═══════════════════════════════════════════════════════════════════

/**
 * Derive a deterministic 32-byte private key from a master seed and agent ID.
 *
 * Uses HMAC-SHA512 (BIP-32 style): HMAC(seed, "lumma-nanopay:" + agentId)
 * Takes the left 32 bytes as the private key.
 *
 * WARNING: The master seed must be kept secret. Anyone with the seed
 * and an agent_id can derive the agent's private key.
 */
export function deriveAgentKey(masterSeed: string, agentId: string): `0x${string}` {
  if (!masterSeed || masterSeed.length < 32) {
    throw new Error('NANOPAYMENT_MASTER_SEED must be at least 32 characters')
  }
  const hmac = crypto.createHmac('sha512', masterSeed)
  hmac.update(`lumma-nanopay:${agentId}`)
  const derived = hmac.digest('hex')
  // Use the left 32 bytes (64 hex chars) as the private key
  return `0x${derived.slice(0, 64)}` as `0x${string}`
}

/**
 * Derive the EOA address from a private key without importing viem at module scope.
 * Uses the GatewayClient to get the address property.
 */
export function deriveAgentAddress(privateKey: `0x${string}`): string {
  // Use a temporary GatewayClient just to derive the address
  const tempClient = new GatewayClient({
    chain: 'arcTestnet',
    privateKey,
  })
  return tempClient.address
}

// ═══════════════════════════════════════════════════════════════════
//  Seller-Side: Payment Gating
// ═══════════════════════════════════════════════════════════════════

/** Singleton facilitator client */
let _facilitator: BatchFacilitatorClient | null = null

function getFacilitator(): BatchFacilitatorClient {
  if (!_facilitator) {
    _facilitator = new BatchFacilitatorClient({
      url: FACILITATOR_URL,
    })
  }
  return _facilitator
}

/**
 * Parse a dollar amount string like "$0.01" or "0.01" to USDC base units.
 * 1 USDC = 1_000_000 base units (6 decimals).
 */
function parseDollarToBaseUnits(price: string): string {
  const cleaned = price.replace(/^\$/, '')
  const num = parseFloat(cleaned)
  if (!Number.isFinite(num) || num <= 0) throw new Error(`Invalid price: ${price}`)
  return String(Math.round(num * 1_000_000))
}

/**
 * Build x402 v2 payment requirements for a given price and endpoint.
 *
 * This is what goes into the PAYMENT-REQUIRED header when we return 402.
 * The structure must match the x402 protocol so that GatewayClient.pay()
 * can parse it automatically.
 */
async function createPaymentRequirements(price: string, endpoint: string) {
  const facilitator = getFacilitator()
  const supported = await facilitator.getSupported()

  // Find Arc Testnet from supported kinds
  const arcKind = supported.kinds.find(
    (k: any) => k.network === ARC_TESTNET_NETWORK
  )
  if (!arcKind) {
    throw new Error(`Arc Testnet (${ARC_TESTNET_NETWORK}) not found in Gateway supported networks`)
  }

  const requirements = {
    scheme: 'exact' as const,
    network: ARC_TESTNET_NETWORK,
    asset: (arcKind as any).asset || '0x3600000000000000000000000000000000000000',
    amount: parseDollarToBaseUnits(price),
    maxTimeoutSeconds: 604900, // 7 days + buffer, required by Gateway
    payTo: SELLER_ADDRESS as `0x${string}`,
    extra: {
      name: 'GatewayWalletBatched',
      version: '1',
      verifyingContract: (arcKind as any).extra?.verifyingContract ||
        '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    },
  }

  return {
    x402Version: 2,
    resource: {
      url: endpoint,
      description: `Lumma Payroll — ${endpoint}`,
      mimeType: 'application/json',
    },
    accepts: [requirements],
  }
}

/**
 * Extract the PAYMENT-SIGNATURE header from a request.
 */
function parsePaymentHeader(req: VercelRequest): string | null {
  const sig = req.headers['payment-signature']
  if (!sig) return null
  return Array.isArray(sig) ? sig[0] : sig
}

/**
 * Extract the PAYMENT-REQUIRED response header value from a request.
 * Some clients send it back for retry flow.
 */
export interface PaymentInfo {
  verified: boolean
  payer: string
  amount: string
  network: string
  transaction?: string
}

/**
 * Require x402 payment for a Vercel serverless endpoint.
 *
 * Usage in a handler:
 *   const payment = await requireNanopayment(req, res, '0.001', '/api/payroll/agent?action=report')
 *   if (!payment) return  // 402 already sent
 *   // payment.payer, payment.amount, etc. are available
 *
 * Returns null if a 402 was sent (caller should return immediately).
 * Returns PaymentInfo if payment was verified and settled.
 */
export async function requireNanopayment(
  req: VercelRequest,
  res: VercelResponse,
  price: string,
  endpoint: string,
): Promise<PaymentInfo | null> {
  if (!SELLER_ADDRESS) {
    // Nanopayments not configured — skip gating (dev mode)
    console.warn('[nanopay] NANOPAYMENT_SELLER_ADDRESS not set — skipping payment gate')
    return { verified: false, payer: 'dev-mode', amount: '0', network: 'none' }
  }

  const paymentSignature = parsePaymentHeader(req)

  if (!paymentSignature) {
    // No payment attached → return 402 Payment Required
    try {
      const paymentRequired = await createPaymentRequirements(price, endpoint)
      const encoded = Buffer.from(JSON.stringify(paymentRequired)).toString('base64')
      res.setHeader('PAYMENT-REQUIRED', encoded)
      res.status(402).json({
        error: 'Payment required',
        x402: paymentRequired,
        price_usd: price,
        instructions: 'Attach a valid PAYMENT-SIGNATURE header to access this resource. Use GatewayClient.pay() from @circle-fin/x402-batching/client.',
      })
    } catch (err: any) {
      console.error('[nanopay] Failed to create payment requirements:', err.message)
      res.status(503).json({ error: 'Nanopayment service unavailable', detail: err.message })
    }
    return null
  }

  // Payment signature present → verify and settle
  try {
    const facilitator = getFacilitator()

    const payload = JSON.parse(
      Buffer.from(paymentSignature, 'base64').toString('utf8')
    )

    const paymentRequired = await createPaymentRequirements(price, endpoint)
    const requirements = paymentRequired.accepts[0]

    // Settle (not just verify) — lower latency and guarantees settlement
    const settlement = await facilitator.settle(payload, requirements)

    if (!settlement.success) {
      res.status(402).json({
        error: 'Payment settlement failed',
        reason: settlement.errorReason || 'unknown',
      })
      return null
    }

    return {
      verified: true,
      payer: settlement.payer || 'unknown',
      amount: requirements.amount,
      network: requirements.network,
      transaction: settlement.transaction,
    }
  } catch (err: any) {
    console.error('[nanopay] Payment settlement error:', err.message)
    res.status(402).json({
      error: 'Payment processing failed',
      detail: err.message,
    })
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Buyer-Side: Agent Nanopayment Client
// ═══════════════════════════════════════════════════════════════════

/**
 * Wrapper around GatewayClient for agent nanopayments.
 *
 * Each agent gets a deterministic EOA derived from the master seed.
 * The agent deposits USDC once into the Gateway Wallet contract,
 * then can make unlimited gas-free payments via x402.
 */
export class AgentNanopaymentClient {
  private client: GatewayClient
  public readonly address: string

  constructor(privateKey: `0x${string}`) {
    this.client = new GatewayClient({
      chain: 'arcTestnet',
      privateKey,
    })
    this.address = this.client.address
  }

  /**
   * Create a client for a specific agent using HD derivation.
   */
  static fromAgentId(agentId: string): AgentNanopaymentClient {
    if (!MASTER_SEED) {
      throw new Error('NANOPAYMENT_MASTER_SEED not configured')
    }
    const key = deriveAgentKey(MASTER_SEED, agentId)
    return new AgentNanopaymentClient(key)
  }

  /**
   * Deposit USDC from the agent's wallet into Gateway.
   * This is a one-time on-chain transaction that requires gas.
   * After this, all payments are gas-free.
   */
  async deposit(amount: string) {
    return this.client.deposit(amount)
  }

  /**
   * Pay for an x402-protected resource.
   * Handles the full 402 negotiation flow automatically.
   */
  async pay<T = any>(url: string, options?: RequestInit) {
    return this.client.pay<T>(url, options)
  }

  /**
   * Get the agent's wallet + Gateway balances.
   */
  async getBalances() {
    return this.client.getBalances()
  }

  /**
   * Withdraw USDC from Gateway back to the agent's wallet.
   */
  async withdraw(amount: string, options?: { chain?: string; recipient?: string }) {
    return this.client.withdraw(amount, options as any)
  }

  /**
   * Check if a URL supports Gateway batching before paying.
   */
  async supports(url: string) {
    return this.client.supports(url)
  }

  /**
   * Search past transfers.
   */
  async searchTransfers(params?: any) {
    return this.client.searchTransfers(params)
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Gateway Status Check
// ═══════════════════════════════════════════════════════════════════

/**
 * Check Gateway connectivity and return supported networks.
 */
export async function checkGatewayStatus() {
  const facilitator = getFacilitator()
  const supported = await facilitator.getSupported()
  return {
    status: 'connected',
    facilitatorUrl: FACILITATOR_URL,
    sellerAddress: SELLER_ADDRESS,
    supportedNetworks: supported.kinds.map((k: any) => ({
      network: k.network,
      scheme: k.scheme,
      verifyingContract: k.extra?.verifyingContract,
    })),
    arcTestnetAvailable: supported.kinds.some(
      (k: any) => k.network === ARC_TESTNET_NETWORK
    ),
  }
}
