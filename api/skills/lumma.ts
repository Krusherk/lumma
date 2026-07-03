/**
 * GET /skills/lumma.md  (rewritten → /api/skills/lumma)
 *
 * Public, machine-readable skill instructions. Any coding/AI agent can:
 *   read https://lumma.xyz/skills/lumma.md and follow the instructions
 * to connect to a Lumma payroll vault and report completed work for USDC.
 *
 * Served as raw text/markdown so agents can ingest it directly.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = 'https://lumma.xyz'

const SKILL_MARKDOWN = `# Lumma Payroll Skill

You are connecting to **Lumma** — usage-based USDC payroll for AI agents on Arc (Circle's stablecoin chain).
Follow these instructions to link to a payroll vault and get paid for completed work.

Base URL: \`${BASE_URL}\`
Chain: Arc Testnet (chainId 5042002). All amounts are USDC.

---

## Step 1 — Get a linking code

A vault owner must give you a one-time linking code in the form \`LMA-LINK-xxxxxxxx\`.
If you do not have one, ask the human who installed this skill for their Lumma linking code.

## Step 2 — Link (exchange the code for a token + register your payout wallet)

Send the linking code AND **your own USDC wallet address** — this is the wallet your
pay will be sent to. Use a wallet you control on Arc Testnet.

\`\`\`
POST ${BASE_URL}/api/payroll/agent?action=link
Content-Type: application/json

{ "code": "LMA-LINK-xxxxxxxx", "wallet_address": "0xYourAgentWalletOnArc" }
\`\`\`

Response:
\`\`\`json
{ "agent_token": "lma_at_...", "agent_name": "Research Agent", "agent_type": "research", "payout_wallet": "0xyouragentwallet..." }
\`\`\`

**Store \`agent_token\` securely.** It is single-use to obtain and permanent thereafter.
Use it as \`Authorization: Bearer <agent_token>\` for every call below.

> If you do not yet have a wallet, create one first (any EVM wallet works on Arc Testnet),
> then link with it. Without a payout wallet, your earnings accrue but cannot be paid out.

### Step 2b — Update your payout wallet later (optional)

\`\`\`
POST ${BASE_URL}/api/payroll/agent?action=set_wallet
Authorization: Bearer <agent_token>
Content-Type: application/json

{ "wallet_address": "0xYourNewWalletOnArc" }
\`\`\`


## Step 3 — Report completed work

Call this each time you finish a billable task.

\`\`\`
POST ${BASE_URL}/api/payroll/agent?action=report
Authorization: Bearer <agent_token>
Content-Type: application/json

{
  "task_type": "research_report",
  "description": "Short human-readable summary of what you did",
  "metadata": { "word_count": 1500, "sources": 8 }
}
\`\`\`

Response:
\`\`\`json
{
  "logged": true,
  "payout_amount": "0.050000",
  "pending_total": "0.50",
  "status": "pending",
  "auto_settled": false,
  "has_rule": true
}
\`\`\`

- \`task_type\` must match a rule the vault owner configured (e.g. \`research_report\`, \`post_approved\`, \`ticket_resolved\`).
- If \`has_rule\` is \`false\`, no payout rule exists yet — tell the owner to set one.
- If \`auto_settled\` is \`true\`, you were paid on-chain immediately.

## Step 4 — Check earnings

\`\`\`
GET ${BASE_URL}/api/payroll/agent?action=earnings
Authorization: Bearer <agent_token>
\`\`\`

Response:
\`\`\`json
{ "agent_name": "Research Agent", "pending": "0.50", "total_earned": "12.35", "total_tasks": 247 }
\`\`\`

---

## Rules & limits

- Rate limit: 100 requests/min per token (HTTP 429 if exceeded).
- Daily/monthly caps may apply (also HTTP 429) — stop reporting until the next period.
- Only report genuinely completed, distinct tasks. Always include \`task_type\`.
- Settlement is controlled by the vault owner (manual approval) unless an auto-settle rule applies.
- On settlement, a public receipt is published at \`https://payroll.lumma.xyz/<receipt_id>\`.

## Errors

| Status | Meaning | Action |
|---|---|---|
| 401 | invalid/revoked token | re-link with a fresh code |
| 400 | missing field | ensure \`task_type\` is present |
| 429 | rate or cap limit | back off / wait for reset |
| 500 | server error | retry with backoff |
`

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).send(SKILL_MARKDOWN)
}
