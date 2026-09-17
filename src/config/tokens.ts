/**
 * Token metadata for UI display and contract interactions.
 * USDC addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses
 * EURC addresses: https://developers.circle.com/stablecoins/eurc-contract-addresses
 */
export const TOKENS: Record<string, {
  symbol: string
  name: string
  decimals: number
  color: string
  icon: string
  addresses: Record<string, string>
}> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    color: '#2775ca',
    icon: '💲',
    addresses: {
      arc: '0x3600000000000000000000000000000000000000',
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    },
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    color: '#1b6ef5',
    icon: '€',
    addresses: {
      arc: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1',
    },
  },
}

/**
 * USDC token addresses on each supported mainnet.
 * Arc USDC is native gas (ERC-20 interface at this precompile, 6 decimals).
 */
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  5042: '0x3600000000000000000000000000000000000000',
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
}

/** Standard ERC-20 ABI for balanceOf */
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
