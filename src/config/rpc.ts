import { ARC_RPC_URL } from './chains'

const ALCHEMY = 'yY2DFVAadrwKpQLwJ-8L2'
const INFURA = 'cca7556247f2413c97c39723f0fe7526'

/** First URL is the primary. Used by wagmi and the LI.FI widget. */
export const RPC_URLS: Record<number, string[]> = {
  5042: [ARC_RPC_URL, 'https://rpc.mainnet.arc.io', 'https://rpc.drpc.mainnet.arc.io'],
  1: [
    `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    `https://mainnet.infura.io/v3/${INFURA}`,
  ],
  8453: [
    `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    `https://base-mainnet.infura.io/v3/${INFURA}`,
    'https://mainnet.base.org',
  ],
  42161: [
    `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    `https://arbitrum-mainnet.infura.io/v3/${INFURA}`,
    'https://arb1.arbitrum.io/rpc',
  ],
  10: [
    `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    `https://optimism-mainnet.infura.io/v3/${INFURA}`,
    'https://mainnet.optimism.io',
  ],
  137: [
    `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    'https://polygon-rpc.com',
  ],
}
