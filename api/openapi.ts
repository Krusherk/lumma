/**
 * GET /openapi.json  (rewritten from /openapi.json and /.well-known/openapi.json)
 *
 * OpenAPI 3.1 spec for Lumma agent payroll. Required by Circle Agent Marketplace
 * listing review so agents can read inputs, outputs, and x402 prices.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { API_BASE_URL, SITE_URL, SKILL_URL } from './_urls.js'
import { CATALOG_TOOLS, PROVIDER } from './x402/_catalog.js'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')

  const paths: Record<string, unknown> = {}
  for (const tool of CATALOG_TOOLS) {
    const method = tool.method.toLowerCase()
    const op = {
      operationId: `lumma_${tool.action}`,
      summary: tool.name,
      description: tool.description,
      tags: ['Payroll'],
      parameters: [
        {
          name: 'action',
          in: 'query',
          required: true,
          schema: { type: 'string', enum: [tool.action] },
        },
      ],
      ...(tool.auth === 'bearer'
        ? {
            security: [{ bearerAuth: [] }],
          }
        : {}),
      ...(tool.method === 'POST'
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': { schema: tool.input },
              },
            },
          }
        : {}),
      responses: {
        '200': {
          description: 'Success',
          content: { 'application/json': { schema: tool.output } },
        },
        ...(tool.priceUsd
          ? {
              '402': {
                description: 'x402 Payment Required. Retry with PAYMENT-SIGNATURE.',
                headers: {
                  'PAYMENT-REQUIRED': {
                    schema: { type: 'string' },
                    description: 'Base64-encoded x402 v2 payment requirements',
                  },
                },
              },
            }
          : {}),
        '401': { description: 'Invalid or missing agent token' },
      },
      ...(tool.priceUsd
        ? {
            'x-x402': {
              version: 2,
              priceUsd: tool.priceUsd,
              network: 'eip155:5042002',
              scheme: 'exact',
              extra: { name: 'GatewayWalletBatched', version: '1' },
              supportsCircleGateway: true,
              supportsVanillax402: false,
            },
          }
        : {}),
    }

    // One resource per tool so marketplace crawlers can price each action.
    paths[`/payroll/agent?action=${tool.action}`] = { [method]: op }
  }

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Lumma Payroll API',
      version: '1.0.0',
      description: `${PROVIDER.description}. Skill: ${SKILL_URL}`,
      contact: { name: 'Lumma', url: SITE_URL, email: 'support@lumma.xyz' },
    },
    servers: [{ url: API_BASE_URL, description: 'Lumma agent API' }],
    tags: [{ name: 'Payroll', description: 'Agent payroll, A2A payments, and x402 nanopayments' }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'agent_token',
          description: 'Token returned by POST /payroll/agent?action=link',
        },
      },
    },
    'x-provider': PROVIDER,
  }

  return res.status(200).json(spec)
}
