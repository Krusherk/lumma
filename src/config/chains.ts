import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 6,
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

export const SUPPORTED_CHAINS = [
  {
    id: 'arc_testnet',
    name: 'Arc Testnet',
    shortName: 'Arc',
    chainId: 5042002,
    sdkName: 'Arc_Testnet' as const,
    color: '#00C48C',
    icon: '/images/arclogo.jpg',
    testnet: true,
    supportsSwap: true,
    supportsBridge: true,
  },
  {
    id: 'ethereum_sepolia',
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    chainId: 11155111,
    sdkName: 'Ethereum_Sepolia' as const,
    color: '#627EEA',
    icon: '/images/eth.jpg',
    testnet: true,
    supportsSwap: false,
    supportsBridge: true,
  },
  {
    id: 'base_sepolia',
    name: 'Base Sepolia',
    shortName: 'Base',
    chainId: 84532,
    sdkName: 'Base_Sepolia' as const,
    color: '#0052FF',
    icon: '/images/base.jpg',
    testnet: true,
    supportsSwap: false,
    supportsBridge: true,
  },
  {
    id: 'arbitrum_sepolia',
    name: 'Arbitrum Sepolia',
    shortName: 'Arbitrum',
    chainId: 421614,
    sdkName: 'Arbitrum_Sepolia' as const,
    color: '#28A0F0',
    icon: '/images/arbitrum.jpg',
    testnet: true,
    supportsSwap: false,
    supportsBridge: true,
  },
  {
    id: 'polygon_amoy',
    name: 'Polygon Amoy',
    shortName: 'Polygon',
    chainId: 80002,
    sdkName: 'Polygon_Amoy' as const,
    color: '#8247E5',
    icon: '/images/polygon.png',
    testnet: true,
    supportsSwap: false,
    supportsBridge: true,
  },
  {
    id: 'op_sepolia',
    name: 'OP Sepolia',
    shortName: 'Optimism',
    chainId: 11155420,
    sdkName: 'OP_Sepolia' as const,
    color: '#FF0420',
    icon: '/images/eth.jpg',
    testnet: true,
    supportsSwap: false,
    supportsBridge: true,
  },
] as const

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]
