import { lazy, Suspense, useMemo } from 'react'
import type { WidgetConfig } from '@lifi/widget'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { USDC_ADDRESSES } from '../../config/tokens'
import { ARC_MAINNET_CHAIN_ID } from '../../config/chains'
import { RPC_URLS } from '../../config/rpc'

const LiFiWidget = lazy(() =>
  import('@lifi/widget').then(m => ({ default: m.LiFiWidget })),
)

const LIFI_API_KEY = import.meta.env.VITE_LIFI_API_KEY

const ARC = ARC_MAINNET_CHAIN_ID
const ETHEREUM = 1
const BASE = 8453
const ARBITRUM = 42161
const OPTIMISM = 10
const POLYGON = 137

const ALLOWED_CHAINS = [ETHEREUM, BASE, ARBITRUM, OPTIMISM, POLYGON, ARC]

export default function SwapWidget() {
  const { connectWallet } = useConnectWallet()
  const { wallets } = useWallets()
  const { address } = useAccount()
  const connected = !!address || wallets.length > 0

  const config = useMemo<WidgetConfig>(() => ({
    integrator: 'lumma',
    appearance: 'dark',
    variant: 'compact',

    fromChain: ETHEREUM,
    toChain: ARC,
    fromToken: USDC_ADDRESSES[ETHEREUM],
    toToken: USDC_ADDRESSES[ARC],

    routePriority: 'FASTEST',
    slippage: 0.005,
    useRecommendedRoute: true,
    useRelayerRoutes: true,

    chains: {
      allow: ALLOWED_CHAINS,
      from: { allow: ALLOWED_CHAINS },
      to: { allow: ALLOWED_CHAINS },
    },

    tokens: {
      featured: [
        { address: USDC_ADDRESSES[ETHEREUM], chainId: ETHEREUM as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[ARC], chainId: ARC as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[BASE], chainId: BASE as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[ARBITRUM], chainId: ARBITRUM as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
        { address: USDC_ADDRESSES[OPTIMISM], chainId: OPTIMISM as any, symbol: 'USDC', decimals: 6, name: 'USDC' },
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
      onConnect: () => connectWallet(),
    },

    sdkConfig: {
      apiKey: LIFI_API_KEY,
      preloadChains: false,
      rpcUrls: RPC_URLS as Record<number, string[]>,
      routeOptions: {
        maxPriceImpact: 0.4,
        allowSwitchChain: true,
      },
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
  }), [connectWallet])

  return (
    <Suspense fallback={
      <div style={{
        width: '100%',
        maxWidth: 420,
        height: 420,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,.07)',
        background: '#08080f',
      }} />
    }>
      <LiFiWidget integrator="lumma" config={config} key={connected ? address : 'disconnected'} />
    </Suspense>
  )
}
