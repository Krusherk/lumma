import { http, fallback } from 'wagmi'
import { createConfig } from '@privy-io/wagmi'
import { arcMainnet, ARC_RPC_URL } from './chains'
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
} from 'viem/chains'

const ALCHEMY = 'yY2DFVAadrwKpQLwJ-8L2'
const INFURA = 'cca7556247f2413c97c39723f0fe7526'

export const wagmiConfig = createConfig({
  chains: [arcMainnet, mainnet, base, arbitrum, optimism, polygon],
  transports: {
    [arcMainnet.id]: fallback([
      http(ARC_RPC_URL),
      http('https://rpc.mainnet.arc.io'),
      http('https://rpc.drpc.mainnet.arc.io'),
    ]),
    [mainnet.id]: fallback([
      http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
      http(`https://mainnet.infura.io/v3/${INFURA}`),
      http(),
    ]),
    [base.id]: fallback([
      http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
      http(`https://base-mainnet.infura.io/v3/${INFURA}`),
      http(),
    ]),
    [arbitrum.id]: fallback([
      http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
      http(`https://arbitrum-mainnet.infura.io/v3/${INFURA}`),
      http(),
    ]),
    [optimism.id]: fallback([
      http(`https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
      http(`https://optimism-mainnet.infura.io/v3/${INFURA}`),
      http(),
    ]),
    [polygon.id]: fallback([
      http(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
      http(),
    ]),
  },
})
