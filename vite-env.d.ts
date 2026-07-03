/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string
  readonly VITE_CIRCLE_KIT_KEY: string
  readonly VITE_ARC_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
