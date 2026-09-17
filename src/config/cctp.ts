// CCTP v2 contract addresses, domain IDs, and ABIs
// Source: https://developers.circle.com/cctp/concepts/supported-chains-and-domains
//         https://developers.circle.com/cctp/evm-smart-contracts

// ── IRIS API (mainnet) ──
export const IRIS_API = 'https://iris-api.circle.com/v2'

// ── Forwarding Service hook data (magic bytes) ──
export const FORWARDING_HOOK_DATA = '0x636374702d666f72776172640000000000000000000000000000000000000000' as `0x${string}`

// ── CCTP Domain IDs (NOT chain IDs) ──
export const CCTP_DOMAINS: Record<number, number> = {
  5042:  26, // Arc
  1:      0, // Ethereum
  8453:   6, // Base
  42161:  3, // Arbitrum
  137:    7, // Polygon PoS
  10:     2, // OP Mainnet
}

// ── TokenMessengerV2 — shared across EVM mainnets ──
export const TOKEN_MESSENGER_V2 = '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d' as `0x${string}`

// ── MessageTransmitterV2 — shared across EVM mainnets ──
export const MESSAGE_TRANSMITTER_V2: Record<number, `0x${string}`> = {
  5042:  '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  1:     '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  8453:  '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  42161: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  137:   '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  10:    '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
}

// ── USDC addresses per chain ──
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  5042:  '0x3600000000000000000000000000000000000000',
  1:     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  8453:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  137:   '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  10:    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
}

// ── ABIs (minimal, only what we need) ──
export const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const DEPOSIT_FOR_BURN_WITH_HOOK_ABI = [
  {
    type: 'function',
    name: 'depositForBurnWithHook',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

export const DEPOSIT_FOR_BURN_ABI = [
  {
    type: 'function',
    name: 'depositForBurn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [],
  },
] as const

// ── Helper: pad address to bytes32 ──
export function addressToBytes32(addr: string): `0x${string}` {
  return `0x000000000000000000000000${addr.slice(2)}` as `0x${string}`
}

// ── Helper: empty bytes32 (allows any caller on destination) ──
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

// ── IRIS API helpers ──

export interface FeeQuote {
  finalityThreshold: number
  minimumFee: number
  forwardFee: { med: number }
}

export async function getForwardingFees(
  srcDomain: number,
  dstDomain: number,
): Promise<FeeQuote> {
  const url = `${IRIS_API}/burn/USDC/fees/${srcDomain}/${dstDomain}?forward=true`
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to fetch CCTP fees: ${await res.text()}`)
  const fees: FeeQuote[] = await res.json()
  const fast = fees.find(f => f.finalityThreshold === 1000)
  if (!fast) throw new Error('Fast-transfer forwarding fees not available')
  return fast
}

export function calculateBurnAmount(
  amount: bigint,
  feeQuote: FeeQuote,
): { maxFee: bigint; totalAmount: bigint } {
  const forwardFee = BigInt(feeQuote.forwardFee.med)
  const protocolFee = (amount * BigInt(Math.round(feeQuote.minimumFee * 100))) / 1_000_000n
  const maxFee = forwardFee + protocolFee
  const totalAmount = amount + maxFee
  return { maxFee, totalAmount }
}

export async function waitForForwardedMint(
  srcDomain: number,
  burnTxHash: string,
  onStatus?: (msg: string) => void,
): Promise<string> {
  const url = `${IRIS_API}/messages/${srcDomain}?transactionHash=${burnTxHash}`
  while (true) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) {
        const data = await res.json()
        const forwardTxHash = data?.messages?.[0]?.forwardTxHash
        if (forwardTxHash) return forwardTxHash

        const status = data?.messages?.[0]?.status
        if (status) onStatus?.(`Status: ${status}`)
      }
    } catch {
      // Network error, retry
    }
    onStatus?.('Waiting for Circle to mint on destination...')
    await new Promise(r => setTimeout(r, 2000))
  }
}
