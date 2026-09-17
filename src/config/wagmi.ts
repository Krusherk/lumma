import { http, fallback } from 'wagmi'
import { createConfig } from '@privy-io/wagmi'
import { arcMainnet } from './chains'
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
} from 'viem/chains'
import { RPC_URLS } from './rpc'

const transportOpts = { timeout: 5_000, retryCount: 0 as const }
const fallbackOpts = { rank: false as const }

function transport(chainId: number) {
  const urls = RPC_URLS[chainId] || []
  return fallback(urls.map(url => http(url, transportOpts)), fallbackOpts)
}

export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, optimism, polygon, arcMainnet],
  transports: {
    [mainnet.id]: transport(1),
    [base.id]: transport(8453),
    [arbitrum.id]: transport(42161),
    [optimism.id]: transport(10),
    [polygon.id]: transport(137),
    [arcMainnet.id]: transport(5042),
  },
  batch: { multicall: true },
})
