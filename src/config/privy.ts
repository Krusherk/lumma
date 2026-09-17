import { arcMainnet } from './chains'
import { mainnet, base, arbitrum, optimism, polygon } from 'viem/chains'

export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID

export const privyConfig = {
  appearance: {
    theme: 'dark' as const,
    accentColor: '#9333ea' as const,
    logo: '/images/lumma.svg',
    showWalletLoginFirst: true,
    walletChainType: 'ethereum-only' as const,
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'users-without-wallets' as const,
    },
  },
  // SIWE + wallet-add must run on a chain every wallet already has.
  // Arc is still in supportedChains so LiFi can switch to it after login.
  defaultChain: mainnet,
  supportedChains: [mainnet, base, arbitrum, optimism, polygon, arcMainnet],
}
