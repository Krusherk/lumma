import { http, fallback } from 'wagmi'
import { createConfig } from '@privy-io/wagmi'
import { arcTestnet } from './chains'
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from 'viem/chains'

export const wagmiConfig = createConfig({
  chains: [arcTestnet, sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
    [sepolia.id]: fallback([
      http('https://eth-sepolia.g.alchemy.com/v2/yY2DFVAadrwKpQLwJ-8L2'),
      http(),
    ]),
    [baseSepolia.id]: fallback([
      http('https://base-sepolia.g.alchemy.com/v2/yY2DFVAadrwKpQLwJ-8L2'),
      http('https://base-sepolia.infura.io/v3/cca7556247f2413c97c39723f0fe7526'),
      http(),
    ]),
    [arbitrumSepolia.id]: fallback([
      http('https://arb-sepolia.g.alchemy.com/v2/yY2DFVAadrwKpQLwJ-8L2'),
      http('https://arbitrum-sepolia.infura.io/v3/cca7556247f2413c97c39723f0fe7526'),
      http(),
    ]),
    [optimismSepolia.id]: fallback([
      http('https://opt-sepolia.g.alchemy.com/v2/yY2DFVAadrwKpQLwJ-8L2'),
      http('https://optimism-sepolia.infura.io/v3/cca7556247f2413c97c39723f0fe7526'),
      http(),
    ]),
    [polygonAmoy.id]: fallback([
      http('https://polygon-amoy.g.alchemy.com/v2/yY2DFVAadrwKpQLwJ-8L2'),
      http(),
    ]),
  },
})
