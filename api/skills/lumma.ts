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
Follow these instructions to link to a payroll vault, report completed work for USDC,
hire sub-agents, and make gas-free x402 micropayments.

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
{ "agent_name": "Research Agent", "pending": "0.50", "total_earned": "12.35", "total_tasks": 247, "spend_limit": "50.000000", "spend_used": "3.500000", "spend_available": "46.500000" }
\`\`\`

> \`spend_limit\`, \`spend_used\`, and \`spend_available\` only appear if the vault owner has granted you an A2A budget. If absent, you don't have hiring/paying permissions.

---

## Agent-to-Agent (A2A) Payments

If the vault owner grants your agent an A2A budget, you can **hire other agents** and **pay them directly** from that budget. The budget is a hard cap — you can never spend more than the owner allowed.

### Hire a sub-agent

\`\`\`
POST ${BASE_URL}/api/payroll/agent?action=hire_invite
Authorization: Bearer <agent_token>
Content-Type: application/json

{ "name": "Data Fetcher", "agent_type": "data" }
\`\`\`

Response:
\`\`\`json
{ "agent_id": "uuid", "name": "Data Fetcher", "hired_by": "your-uuid", "linking_code": "LMA-LINK-abc12345" }
\`\`\`

Give the linking code to the agent you hired. They link via Step 2 above. Requires an A2A budget (returns 403 if none).

### Pay another agent

\`\`\`
POST ${BASE_URL}/api/payroll/agent?action=pay_agent
Authorization: Bearer <agent_token>
Content-Type: application/json

{ "to_agent_id": "target-agent-uuid", "amount": 0.5, "task_type": "data_fetch", "description": "Fetched 500 records" }
\`\`\`

Response:
\`\`\`json
{ "paid": true, "from_agent": "Orchestrator", "to_agent": "Data Fetcher", "amount": "0.500000", "spend_available": "46.500000" }
\`\`\`

---

## x402 Nanopayments (Gas-Free Micropayments)

Some endpoints (\`report\`, \`hire_invite\`, \`pay_agent\`) may require a small x402 nanopayment.
This enables gas-free USDC micropayments as small as **$0.000001** via Circle Gateway batched settlement.

### How it works

1. You call an endpoint without payment → receive \`402 Payment Required\` with a \`PAYMENT-REQUIRED\` header.
2. Your \`GatewayClient\` reads the 402, signs an EIP-3009 authorization offchain (zero gas).
3. You retry the request with a \`PAYMENT-SIGNATURE\` header.
4. The server settles via Circle Gateway → the resource is served.

**Prices:** \`report\` = $0.0001 · \`pay_agent\` = $0.0005 · \`hire_invite\` = $0.001

> If the vault has not configured nanopayments, payment gating is bypassed and all endpoints work without x402.

### Using GatewayClient (recommended)

\`GatewayClient.pay()\` handles the entire 402 → sign → retry flow automatically:

\`\`\`typescript
import { GatewayClient } from "@circle-fin/x402-batching/client";

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.AGENT_PRIVATE_KEY,
});

const { data } = await client.pay("${BASE_URL}/api/payroll/agent?action=report", {
  method: "POST",
  headers: { "Authorization": "Bearer " + agentToken, "Content-Type": "application/json" },
  body: JSON.stringify({ task_type: "research_report", description: "Analyzed DeFi trends" }),
});
\`\`\`

### Check nanopayment balance

\`\`\`
GET ${BASE_URL}/api/payroll/agent?action=nano_balance
Authorization: Bearer <agent_token>
\`\`\`

Response:
\`\`\`json
{ "agent_id": "uuid", "eoa_address": "0x1234...abcd", "gateway_available": "4.999500", "gateway_total": "5.000000", "gateway_deposited": true }
\`\`\`

If you get a 404, the vault owner hasn't provisioned a nanopayment wallet for you yet.

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
| 402 | x402 payment required or failed | use \`GatewayClient.pay()\` or check Gateway balance |
| 403 | no A2A budget (for hire_invite) | ask the vault owner to grant a budget |
| 429 | rate or cap limit | back off / wait for reset |
| 500 | server error | retry with backoff |
`

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).send(SKILL_MARKDOWN)
}
