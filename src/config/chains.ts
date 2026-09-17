import { defineChain } from 'viem'

/** Arc Mainnet — USDC-native L1. Chain ID 5042. */
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.mainnet.arc.io',
        'https://rpc.drpc.mainnet.arc.io',
        'https://rpc.quicknode.mainnet.arc.io',
      ],
      webSocket: ['wss://rpc.quicknode.mainnet.arc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.io',
    },
  },
})

/** Kept for payroll demos, which still settle on Arc Testnet. */
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
      webSocket: ['wss://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})

export const ARC_MAINNET_CHAIN_ID = 5042
export const ARC_TESTNET_CHAIN_ID = 5042002

export const ARC_RPC_URL =
  import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.mainnet.arc.io'

export const SUPPORTED_CHAINS = [
  {
    id: 'arc',
    name: 'Arc',
    shortName: 'Arc',
    chainId: 5042,
    sdkName: 'ARC' as const,
    color: '#00C48C',
    icon: '/images/arclogo.jpg',
    testnet: false,
    supportsSwap: true,
    supportsBridge: true,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'Ethereum',
    chainId: 1,
    sdkName: 'ETH' as const,
    color: '#627EEA',
    icon: '/images/eth.jpg',
    testnet: false,
    supportsSwap: true,
    supportsBridge: true,
  },
  {
    id: 'base',
    name: 'Base',
    shortName: 'Base',
    chainId: 8453,
    sdkName: 'BASE' as const,
    color: '#0052FF',
    icon: '/images/base.jpg',
    testnet: false,
    supportsSwap: true,
    supportsBridge: true,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    shortName: 'Arbitrum',
    chainId: 42161,
    sdkName: 'ARB' as const,
    color: '#28A0F0',
    icon: '/images/arbitrum.jpg',
    testnet: false,
    supportsSwap: true,
    supportsBridge: true,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'Polygon',
    chainId: 137,
    sdkName: 'MATIC' as const,
    color: '#8247E5',
    icon: '/images/polygon.png',
    testnet: false,
    supportsSwap: true,
    supportsBridge: true,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    shortName: 'Optimism',
    chainId: 10,
    sdkName: 'OP' as const,
    color: '#FF0420',
    icon: '/images/eth.jpg',
    testnet: false,
    supportsSwap: true,
    supportsBridge: true,
  },
] as const

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]

/** Agent Payroll still runs on testnet during private demos. */
export const PAYROLL_CHAINS = [
  {
    id: 'arc_testnet',
    name: 'Arc Testnet',
    shortName: 'Arc',
    chainId: 5042002,
    sdkName: 'Arc_Testnet' as const,
    color: '#00C48C',
    icon: '/images/arclogo.jpg',
  },
  {
    id: 'ethereum_sepolia',
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    chainId: 11155111,
    sdkName: 'Ethereum_Sepolia' as const,
    color: '#627EEA',
    icon: '/images/eth.jpg',
  },
  {
    id: 'base_sepolia',
    name: 'Base Sepolia',
    shortName: 'Base',
    chainId: 84532,
    sdkName: 'Base_Sepolia' as const,
    color: '#0052FF',
    icon: '/images/base.jpg',
  },
  {
    id: 'arbitrum_sepolia',
    name: 'Arbitrum Sepolia',
    shortName: 'Arbitrum',
    chainId: 421614,
    sdkName: 'Arbitrum_Sepolia' as const,
    color: '#28A0F0',
    icon: '/images/arbitrum.jpg',
  },
  {
    id: 'op_sepolia',
    name: 'OP Sepolia',
    shortName: 'Optimism',
    chainId: 11155420,
    sdkName: 'OP_Sepolia' as const,
    color: '#FF0420',
    icon: '/images/eth.jpg',
  },
] as const

export function getChainMeta(chainId: number) {
  const live = SUPPORTED_CHAINS.find(c => c.chainId === chainId)
  if (live) return live
  const payroll = PAYROLL_CHAINS.find(c => c.chainId === chainId)
  if (payroll) return payroll
  return { name: `Chain ${chainId}`, shortName: `Chain ${chainId}`, icon: '/images/eth.jpg', chainId }
}
