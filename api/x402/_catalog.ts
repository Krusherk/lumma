/**
 * Shared Agent Marketplace catalog for Lumma payroll tools.
 *
 * Shape matches Circle Discovery API items so the same metadata can feed
 * OpenAPI, /.well-known/x402.json, and /x402/discovery/resources.
 */
import {
  A2A_CARD_URL,
  API_BASE_URL,
  OPENAPI_URL,
  SITE_URL,
  SKILL_URL,
  agentActionUrl,
} from '../_urls.js'
import {
  ENDPOINT_PRICES,
  SELLER_ADDRESS,
  gatewayPaymentOption,
} from '../_x402.js'

export const PROVIDER = {
  name: 'Lumma',
  description: 'Usage-based USDC payroll for AI agents on Arc',
  category: 'INFRASTRUCTURE',
  tags: [
    'x402',
    'payroll',
    'usdc',
    'agents',
    'a2a',
    'arc',
    'nanopayments',
    'gateway',
  ],
  website: SITE_URL,
  docsUrl: `${SITE_URL}/docs`,
  openApiUrl: OPENAPI_URL,
  skillUrl: SKILL_URL,
}

export interface CatalogTool {
  name: string
  action: string
  method: 'GET' | 'POST'
  description: string
  priceUsd: string | null
  auth: 'none' | 'bearer'
  input: Record<string, unknown>
  output: Record<string, unknown>
}

export const CATALOG_TOOLS: CatalogTool[] = [
  {
    name: 'link',
    action: 'link',
    method: 'POST',
    description: 'Exchange a one-time LMA-LINK code for a permanent agent token and register a payout wallet.',
    priceUsd: null,
    auth: 'none',
    input: {
      type: 'object',
      required: ['code', 'wallet_address'],
      properties: {
        code: { type: 'string', description: 'One-time linking code, format LMA-LINK-xxxxxxxx' },
        wallet_address: { type: 'string', description: 'Agent USDC payout wallet on Arc Testnet (0x + 40 hex)' },
      },
    },
    output: {
      type: 'object',
      properties: {
        agent_token: { type: 'string' },
        agent_name: { type: 'string' },
        agent_type: { type: 'string' },
        payout_wallet: { type: 'string' },
      },
    },
  },
  {
    name: 'report',
    action: 'report',
    method: 'POST',
    description: 'Report a completed billable task. Payout is determined by the vault owner rule for task_type.',
    priceUsd: ENDPOINT_PRICES.report,
    auth: 'bearer',
    input: {
      type: 'object',
      required: ['task_type'],
      properties: {
        task_type: {
          type: 'string',
          description: 'Must match a vault rule (e.g. research_report, post_approved, ticket_resolved)',
        },
        description: { type: 'string', description: 'Human-readable summary of the completed work' },
        metadata: { type: 'object', description: 'Task-specific data (word count, sources, model, etc.)' },
      },
    },
    output: {
      type: 'object',
      properties: {
        logged: { type: 'boolean' },
        payout_amount: { type: 'string' },
        pending_total: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'approved', 'settled'] },
        auto_settled: { type: 'boolean' },
        has_rule: { type: 'boolean' },
      },
    },
  },
  {
    name: 'earnings',
    action: 'earnings',
    method: 'GET',
    description: 'Check pending and total USDC earnings, plus A2A budget remaining if granted.',
    priceUsd: null,
    auth: 'bearer',
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        agent_name: { type: 'string' },
        pending: { type: 'string' },
        total_earned: { type: 'string' },
        total_tasks: { type: 'integer' },
        spend_limit: { type: 'string' },
        spend_used: { type: 'string' },
        spend_available: { type: 'string' },
      },
    },
  },
  {
    name: 'hire_invite',
    action: 'hire_invite',
    method: 'POST',
    description: 'Mint a linking code to hire a sub-agent into the same vault. Requires an A2A budget.',
    priceUsd: ENDPOINT_PRICES.hire_invite,
    auth: 'bearer',
    input: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Display name of the agent to hire' },
        agent_type: { type: 'string', description: 'Role label, e.g. data, research, writer' },
      },
    },
    output: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        name: { type: 'string' },
        hired_by: { type: 'string' },
        linking_code: { type: 'string' },
      },
    },
  },
  {
    name: 'pay_agent',
    action: 'pay_agent',
    method: 'POST',
    description: 'Pay another agent in the same vault from your A2A budget. Settled immediately.',
    priceUsd: ENDPOINT_PRICES.pay_agent,
    auth: 'bearer',
    input: {
      type: 'object',
      required: ['to_agent_id', 'amount'],
      properties: {
        to_agent_id: { type: 'string', description: 'UUID of the payee agent' },
        amount: { type: 'number', description: 'USDC amount to pay' },
        task_type: { type: 'string', description: 'Label for the payment (defaults to a2a_payment)' },
        description: { type: 'string', description: 'What the payment is for' },
      },
    },
    output: {
      type: 'object',
      properties: {
        paid: { type: 'boolean' },
        from_agent: { type: 'string' },
        to_agent: { type: 'string' },
        amount: { type: 'string' },
        spend_available: { type: 'string' },
      },
    },
  },
  {
    name: 'set_wallet',
    action: 'set_wallet',
    method: 'POST',
    description: 'Update the USDC payout wallet for future settlements.',
    priceUsd: null,
    auth: 'bearer',
    input: {
      type: 'object',
      required: ['wallet_address'],
      properties: {
        wallet_address: { type: 'string', description: 'New Arc Testnet wallet (0x + 40 hex)' },
      },
    },
    output: {
      type: 'object',
      properties: {
        agent_name: { type: 'string' },
        payout_wallet: { type: 'string' },
      },
    },
  },
  {
    name: 'nano_balance',
    action: 'nano_balance',
    method: 'GET',
    description: 'Check this agent\'s Circle Gateway nanopayment balance.',
    priceUsd: null,
    auth: 'bearer',
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        eoa_address: { type: 'string' },
        gateway_available: { type: 'string' },
        gateway_total: { type: 'string' },
        gateway_deposited: { type: 'boolean' },
      },
    },
  },
]

export function paidTools() {
  return CATALOG_TOOLS.filter(t => t.priceUsd)
}

export function discoveryItems() {
  const now = new Date().toISOString()
  return paidTools().map(tool => ({
    resource: agentActionUrl(tool.action),
    type: 'http',
    x402Version: 2,
    lastUpdated: now,
    accepts: [gatewayPaymentOption(tool.priceUsd as string)],
    metadata: {
      provider: PROVIDER,
      path: `/payroll/agent?action=${tool.action}`,
      method: tool.method,
      description: tool.description,
      mimeType: 'application/json',
      input: tool.input,
      output: tool.output,
      siwx: false,
      supportsVanillax402: false,
      supportsCircleGateway: true,
      requiredHeaders: tool.auth === 'bearer'
        ? ['Authorization']
        : [],
    },
  }))
}

export function a2aCard() {
  return {
    name: 'Lumma Payroll',
    description: PROVIDER.description,
    version: '1.0.0',
    provider: 'Lumma',
    capabilities: [
      'Usage-based USDC payroll',
      'Agent-to-agent hiring and payments',
      'x402 Circle Gateway nanopayments',
      'Work reporting and earnings',
    ],
    endpoints: paidTools().map(tool => ({
      path: `/payroll/agent?action=${tool.action}`,
      method: tool.method,
      description: tool.description,
      baseUrl: API_BASE_URL,
      priceUsd: tool.priceUsd,
    })),
    authentication: {
      type: 'bearer',
      description: 'Agent token from POST /payroll/agent?action=link. Header: Authorization: Bearer <agent_token>. x402 PAYMENT-SIGNATURE is required on paid endpoints.',
    },
    pricing: {
      type: 'x402',
      network: 'eip155:5042002',
      asset: 'USDC',
      scheme: 'exact',
      extra: { name: 'GatewayWalletBatched', version: '1' },
      tools: paidTools().map(t => ({ name: t.action, priceUsd: t.priceUsd })),
    },
    documentation: {
      skill: SKILL_URL,
      openapi: OPENAPI_URL,
      discovery: `${API_BASE_URL}/x402/discovery/resources`,
      a2a: A2A_CARD_URL,
      website: SITE_URL,
      protocol: 'https://developers.circle.com/gateway/nanopayments/concepts/x402',
      listing: 'https://developers.circle.com/agent-stack/agent-marketplace/get-listed',
    },
    contact: {
      name: 'Lumma',
      url: SITE_URL,
      email: 'support@lumma.xyz',
    },
    payTo: SELLER_ADDRESS || null,
    links: [
      { rel: 'self', href: A2A_CARD_URL },
      { rel: 'skill', href: SKILL_URL },
      { rel: 'openapi', href: OPENAPI_URL },
      { rel: 'service', href: `${API_BASE_URL}/x402/discovery/resources` },
    ],
  }
}

export function agentSkillsIndex() {
  return {
    version: '1.0',
    name: 'Lumma Payroll Skills',
    description: 'Skill index for AI agents that hire, report work, and settle USDC payroll on Lumma.',
    skills: [
      {
        name: 'lumma-payroll',
        title: 'Lumma Payroll',
        description: PROVIDER.description,
        url: SKILL_URL,
      },
    ],
    openApi: OPENAPI_URL,
    a2aCard: A2A_CARD_URL,
    discovery: `${API_BASE_URL}/x402/discovery/resources`,
    website: SITE_URL,
  }
}
