/**
 * Single Hobby-plan-safe handler for public agent surfaces:
 * skill, OpenAPI, A2A card, x402 catalog, discovery.
 *
 * Routed via vercel.json rewrites + ?resource=
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendSkillMarkdown } from './skills/_lumma.js'
import {
  a2aCard,
  agentSkillsIndex,
  buildOpenApiSpec,
  discoveryPayload,
} from './x402/_catalog.js'

function resourceOf(req: VercelRequest): string {
  const q = String(req.query.resource || '').toLowerCase()
  if (q) return q
  const url = String(req.url || '').toLowerCase()
  if (url.includes('lumma.md') || url.includes('skills/lumma') || url.includes('resource=skill')) return 'skill'
  if (url.includes('agent-skills')) return 'skills'
  if (url.includes('openapi')) return 'openapi'
  if (url.includes('a2a')) return 'a2a'
  if (url.includes('discovery')) return 'discovery'
  if (url.includes('x402')) return 'x402'
  return ''
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const resource = resourceOf(req)

  if (resource === 'skill') {
    return sendSkillMarkdown(req, res)
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=60')

  if (resource === 'openapi') {
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(200).json(buildOpenApiSpec())
  }
  if (resource === 'a2a') {
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(200).json(a2aCard())
  }
  if (resource === 'skills') {
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(200).json(agentSkillsIndex())
  }
  if (resource === 'discovery' || resource === 'x402') {
    return res.status(200).json(discoveryPayload(String(req.query.query || '')))
  }

  return res.status(200).json({
    skill: 'https://lumma.xyz/skills/lumma.md',
    openapi: 'https://api.lumma.xyz/openapi.json',
    a2a: 'https://api.lumma.xyz/.well-known/a2a.json',
    discovery: 'https://api.lumma.xyz/x402/discovery/resources',
    resources: ['skill', 'openapi', 'a2a', 'skills', 'discovery', 'x402'],
  })
}
