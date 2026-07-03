// CCTP v2 contract addresses, domain IDs, and ABIs
// Source: https://developers.circle.com/cctp/concepts/supported-chains-and-domains
//         https://docs.arc.network/arc/references/contract-addresses

// ── IRIS API ──
export const IRIS_API = 'https://iris-api-sandbox.circle.com/v2'

// ── Forwarding Service hook data (magic bytes) ──
export const FORWARDING_HOOK_DATA = '0x636374702d666f72776172640000000000000000000000000000000000000000' as `0x${string}`

// ── CCTP Domain IDs (NOT chain IDs) ──
export const CCTP_DOMAINS: Record<number, number> = {
  5042002:  26, // Arc Testnet
  11155111:  0, // Ethereum Sepolia
  84532:     6, // Base Sepolia
  421614:    3, // Arbitrum Sepolia
  80002:     7, // Polygon Amoy
}

// ── TokenMessengerV2 — shared across all EVM testnets ──
export const TOKEN_MESSENGER_V2 = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' as `0x${string}`

// ── MessageTransmitterV2 per chain ──
export const MESSAGE_TRANSMITTER_V2: Record<number, `0x${string}`> = {
  5042002:  '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // Arc Testnet
  11155111: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // Sepolia (verify)
  84532:    '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // Base Sepolia (verify)
  421614:   '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // Arb Sepolia (verify)
  80002:    '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // Polygon Amoy (verify)
}

// ── USDC addresses per chain ──
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  5042002:  '0x3600000000000000000000000000000000000000',   // Arc Testnet
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
  84532:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  421614:   '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
  80002:    '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
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

// Fetch forwarding fees from IRIS
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

// Calculate total burn amount including fees
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

// Poll IRIS for forwarded mint tx hash
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
