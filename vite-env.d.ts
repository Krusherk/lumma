/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string
  readonly VITE_CIRCLE_KIT_KEY: string
  readonly VITE_ARC_RPC_URL: string
  // TEMPORARY: when 'true', Agent Payroll is open to any connected wallet
  // with no invite code. Set back to 'false'/unset to re-enable the gate.
  readonly VITE_PAYROLL_PUBLIC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
