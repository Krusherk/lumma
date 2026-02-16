import { defineChain } from "viem";

import { config } from "@/lib/config";

export const arcTestnet = defineChain({
  id: config.chain.id,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: { http: [config.chain.rpcUrl] },
    public: { http: [config.chain.rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: config.chain.explorerUrl,
    },
  },
  testnet: true,
});

