/**
 * Token metadata for UI display and contract interactions.
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
      arc_testnet: '0x3600000000000000000000000000000000000000',
      ethereum_sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      base_sepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      arbitrum_sepolia: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      op_sepolia: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
      polygon_amoy: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    },
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    color: '#1b6ef5',
    icon: '€',
    addresses: {
      arc_testnet: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
    },
  },
}

/**
 * USDC token addresses on each supported testnet.
 * Source: Circle official docs + block explorer verification.
 */
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  // Arc Testnet — native gas token is USDC at this special address
  5042002: '0x3600000000000000000000000000000000000000',
  // Ethereum Sepolia
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  // Base Sepolia
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  // Arbitrum Sepolia
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  // OP Sepolia
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  // Polygon Amoy
  80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
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
