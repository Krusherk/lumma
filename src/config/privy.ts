import { arcTestnet } from './chains'
import { baseSepolia, sepolia, arbitrumSepolia, polygonAmoy } from 'viem/chains'

export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID

export const privyConfig = {
  appearance: {
    theme: 'dark' as const,
    accentColor: '#9333ea' as const,
    logo: '/images/lumma.svg',
    showWalletLoginFirst: true,
  },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
  },
  supportedChains: [arcTestnet, sepolia, baseSepolia, arbitrumSepolia, polygonAmoy],
  defaultChain: arcTestnet,
}
