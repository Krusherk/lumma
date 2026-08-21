/**
 * x402 pricing + payment-option helpers with no SDK imports.
 * Safe to use from OpenAPI / discovery handlers.
 */
import {
  ARC_GATEWAY_WALLET,
  ARC_TESTNET_NETWORK,
  ARC_USDC,
} from './_urls.js'

export const SELLER_ADDRESS =
  process.env.NANOPAYMENT_SELLER_ADDRESS || ''

export const ENDPOINT_PRICES: Record<string, string> = {
  report: process.env.NANOPAY_PRICE_REPORT || '0.0001',
  pay_agent: process.env.NANOPAY_PRICE_PAY_AGENT || '0.0005',
  hire_invite: process.env.NANOPAY_PRICE_HIRE_INVITE || '0.001',
}

export function parseDollarToBaseUnits(price: string): string {
  const cleaned = price.replace(/^\$/, '')
  const num = parseFloat(cleaned)
  if (!Number.isFinite(num) || num <= 0) throw new Error(`Invalid price: ${price}`)
  return String(Math.round(num * 1_000_000))
}

export function gatewayPaymentOption(priceUsd: string, payTo?: string) {
  return {
    scheme: 'exact' as const,
    network: ARC_TESTNET_NETWORK,
    asset: ARC_USDC,
    amount: parseDollarToBaseUnits(priceUsd),
    maxTimeoutSeconds: 604900,
    payTo: (payTo || SELLER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    extra: {
      name: 'GatewayWalletBatched',
      version: '1',
      verifyingContract: ARC_GATEWAY_WALLET,
    },
  }
}
