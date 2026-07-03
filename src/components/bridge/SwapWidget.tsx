import { useMemo } from 'react'
import { LiFiWidget, type WidgetConfig } from '@lifi/widget'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { USDC_ADDRESSES } from '../../config/tokens'

const LIFI_API_KEY = import.meta.env.VITE_LIFI_API_KEY

// Arc Testnet chain ID
const ARC_TESTNET = 5042002

// All testnet chains LI.FI supports — Ethereum Sepolia is critical as a bridge hub
const ALLOWED_CHAINS = [
  ARC_TESTNET,    // Arc Testnet
  11155111,       // Ethereum Sepolia (bridge hub)
  11155420,       // OP Sepolia
  421614,         // Arbitrum Sepolia
  84532,          // Base Sepolia
]

export default function SwapWidget() {
  const { login } = usePrivy()
  const { address } = useAccount()

  const config = useMemo<WidgetConfig>(() => ({
    integrator: 'lumma',
    appearance: 'dark',
    variant: 'compact',

    // Default from/to so users start with Arc first
    fromChain: ARC_TESTNET,   // Arc Testnet (shows first)
    toChain: 84532,           // Base Sepolia
    fromToken: USDC_ADDRESSES[ARC_TESTNET],
    toToken: USDC_ADDRESSES[84532],

    // Arc first in chain selectors
    chains: {
      from: { allow: ALLOWED_CHAINS },
      to: { allow: ALLOWED_CHAINS },
    },

    // Feature USDC tokens on each chain so they're easy to find
    tokens: {
      featured: [
        { address: USDC_ADDRESSES[ARC_TESTNET], chainId: ARC_TESTNET as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[84532], chainId: 84532 as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[421614], chainId: 421614 as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[11155420], chainId: 11155420 as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[11155111], chainId: 11155111 as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
      ],
    },

    // Clean UI — hide engine branding and widget's own wallet button
    hiddenUI: [
      'appearance',
      'language',
      'poweredBy',
      'walletMenu',
    ],

    // Use existing Privy/Wagmi wallet — enables balance display
    walletConfig: {
      usePartialWalletManagement: true,
      onConnect: () => login(),
    },

    // LI.FI SDK settings
    sdkConfig: {
      apiKey: LIFI_API_KEY,
      rpcUrls: {
        [ARC_TESTNET]: ['https://rpc.testnet.arc.network'],
      } as Record<number, string[]>,
    },

    // Explorer URL for Arc Testnet
    explorerUrls: {
      [ARC_TESTNET]: ['https://testnet.arcscan.app'],
    },

    // Lumma dark theme
    theme: {
      palette: {
        primary: { main: '#9333ea' },
        secondary: { main: '#a855f7' },
        background: {
          default: '#000000',
          paper: '#08080f',
        },
        text: {
          primary: '#f0ecff',
          secondary: 'rgba(240, 236, 255, 0.45)',
        },
        grey: {
          200: 'rgba(255, 255, 255, 0.05)',
          300: 'rgba(255, 255, 255, 0.07)',
          700: 'rgba(255, 255, 255, 0.25)',
          800: 'rgba(255, 255, 255, 0.45)',
        },
      },
      shape: {
        borderRadius: 10,
        borderRadiusSecondary: 8,
      },
      typography: {
        fontFamily: "'Inter', sans-serif",
      },
      container: {
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        boxShadow: 'none',
        maxWidth: '420px',
      },
    },
  }), [login])

  // Key forces full remount on wallet change, preventing stale chain state
  return <LiFiWidget integrator="lumma" config={config} key={address || 'disconnected'} />
}
