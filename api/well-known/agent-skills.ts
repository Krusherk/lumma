/**
 * GET /.well-known/agent-skills/index.json
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { agentSkillsIndex } from '../x402/_catalog.js'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).json(agentSkillsIndex())
}
