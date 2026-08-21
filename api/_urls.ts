/**
 * Canonical public URLs.
 *
 *  - Website + skill stay on lumma.xyz
 *  - Agent/API traffic goes to api.lumma.xyz (no /api prefix)
 *  - Public receipts stay on payroll.lumma.xyz
 */
export const SITE_URL = 'https://lumma.xyz'
export const API_BASE_URL = process.env.LUMMA_API_BASE_URL || 'https://api.lumma.xyz'
export const RECEIPT_BASE_URL = 'https://payroll.lumma.xyz'
export const SKILL_URL = `${SITE_URL}/skills/lumma.md`
export const OPENAPI_URL = `${API_BASE_URL}/openapi.json`
export const DISCOVERY_URL = `${API_BASE_URL}/x402/discovery/resources`
export const A2A_CARD_URL = `${API_BASE_URL}/.well-known/a2a.json`

export const ARC_TESTNET_NETWORK = 'eip155:5042002'
export const ARC_TESTNET_CHAIN_ID = 5042002
export const ARC_USDC = '0x3600000000000000000000000000000000000000'
export const ARC_GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'

export function agentActionUrl(action: string): string {
  return `${API_BASE_URL}/payroll/agent?action=${action}`
}
