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
      createOnLogin: 'off' as const,
    },
  },
  // No defaultChain: connecting does not force a switch (which broke SIWE).
  // Arc stays in the list so LiFi can add/switch to it when bridging.
  supportedChains: [mainnet, base, arbitrum, optimism, polygon, arcMainnet],
}
