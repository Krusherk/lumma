"use client";

import { useEffect, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import type { Chain } from "viem";

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
type PrivyTheme = "light" | "dark";

function getDocumentTheme(): PrivyTheme {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

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
  const [privyTheme, setPrivyTheme] = useState<PrivyTheme>(() => getDocumentTheme());

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const syncTheme = () => setPrivyTheme(getDocumentTheme());
    syncTheme();

    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === "data-theme")) {
        syncTheme();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: privyTheme,
          accentColor: "#0e1116",
        },
        loginMethods: ["wallet", "email"],
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
