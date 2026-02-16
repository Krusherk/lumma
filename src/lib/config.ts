const env = process.env;

export const config = {
  appName: "Lumma",
  appUrl: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  chain: {
    id: Number(env.NEXT_PUBLIC_ARC_CHAIN_ID ?? "9124"),
    rpcUrl: env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.xyz",
    explorerUrl:
      env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://explorer.testnet.arc.xyz",
  },
  contracts: {
    vaultManager: env.NEXT_PUBLIC_VAULT_MANAGER_ADDRESS ?? "",
    milestoneNft: env.NEXT_PUBLIC_MILESTONE_NFT_ADDRESS ?? "",
    stableFxRouter: env.NEXT_PUBLIC_STABLEFX_ROUTER_ADDRESS ?? "",
    usdc: env.NEXT_PUBLIC_USDC_ADDRESS ?? "",
    eurc: env.NEXT_PUBLIC_EURC_ADDRESS ?? "",
  },
  privy: {
    appId: env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
    appSecret: env.PRIVY_APP_SECRET ?? "",
    verificationKey: env.PRIVY_VERIFICATION_KEY ?? "",
  },
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  security: {
    adminApiToken: env.ADMIN_API_TOKEN ?? "",
  },
};

export const isSupabaseConfigured = Boolean(
  config.supabase.url && config.supabase.serviceRoleKey,
);

export const isPrivyConfigured = Boolean(config.privy.appId);

