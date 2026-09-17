import { useMemo } from 'react'
import { LiFiWidget, type WidgetConfig } from '@lifi/widget'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { USDC_ADDRESSES } from '../../config/tokens'
import { ARC_MAINNET_CHAIN_ID, ARC_RPC_URL } from '../../config/chains'

const LIFI_API_KEY = import.meta.env.VITE_LIFI_API_KEY

const ARC = ARC_MAINNET_CHAIN_ID
const ETHEREUM = 1
const BASE = 8453
const ARBITRUM = 42161
const OPTIMISM = 10
const POLYGON = 137

const ALLOWED_CHAINS = [ARC, ETHEREUM, OPTIMISM, ARBITRUM, BASE, POLYGON]

export default function SwapWidget() {
  const { login } = usePrivy()
  const { address } = useAccount()

  const config = useMemo<WidgetConfig>(() => ({
    integrator: 'lumma',
    appearance: 'dark',
    variant: 'compact',

    fromChain: ARC,
    toChain: BASE,
    fromToken: USDC_ADDRESSES[ARC],
    toToken: USDC_ADDRESSES[BASE],

    chains: {
      allow: ALLOWED_CHAINS,
      from: { allow: ALLOWED_CHAINS },
      to: { allow: ALLOWED_CHAINS },
    },

    tokens: {
      featured: [
        { address: USDC_ADDRESSES[ARC], chainId: ARC as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[BASE], chainId: BASE as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[ARBITRUM], chainId: ARBITRUM as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[OPTIMISM], chainId: OPTIMISM as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[ETHEREUM], chainId: ETHEREUM as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[POLYGON], chainId: POLYGON as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
      ],
    },

    hiddenUI: [
      'appearance',
      'language',
      'poweredBy',
      'walletMenu',
    ],

    walletConfig: {
      usePartialWalletManagement: true,
      onConnect: () => login(),
    },

    sdkConfig: {
      apiKey: LIFI_API_KEY,
      rpcUrls: {
        [ARC]: [ARC_RPC_URL, 'https://rpc.mainnet.arc.io'],
      } as Record<number, string[]>,
    },

    explorerUrls: {
      [ARC]: ['https://explorer.arc.io'],
    },

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

  return <LiFiWidget integrator="lumma" config={config} key={address || 'disconnected'} />
}
