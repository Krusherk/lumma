/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string
  readonly VITE_CIRCLE_KIT_KEY: string
  readonly VITE_ARC_RPC_URL: string
  readonly VITE_LIFI_API_KEY?: string
  /** Cal.com / Calendly URL for Agent Payroll demos. */
  readonly VITE_DEMO_BOOKING_URL?: string
  /** Unused. Agent Payroll is private (invite code after booking a demo). */
  readonly VITE_PAYROLL_PUBLIC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
