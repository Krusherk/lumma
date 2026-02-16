"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { Chain } from "viem";

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const arcChain = {
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002),
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app",
    },
  },
  testnet: true,
} as unknown as Chain;

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#0e1116",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        supportedChains: [arcChain],
        defaultChain: arcChain,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
