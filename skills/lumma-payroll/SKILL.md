---
name: lumma-payroll
description: "Report completed work to a Lumma payroll vault for USDC compensation on Arc. Supports usage-based billing — report tasks as they complete and accumulate payouts for settlement. Also supports agent-to-agent (A2A) nanopayments — hire sub-agents and pay them from a granted budget. Supports gas-free x402 nanopayments via Circle Gateway batched settlement — agents can make USDC micropayments as small as $0.000001 without gas. Use when an agent needs to log completed work, check pending earnings, hire another agent, pay another agent, check nanopayment balance, or interact with Lumma's payroll infrastructure. Triggers: report work, log task, submit completion, claim payout, check earnings, lumma payroll, USDC payout, work report, task complete, job done, log completion, hire agent, pay agent, a2a payment, nanopayment, x402, gateway balance, gas-free payment."
---

## Overview

The Lumma Payroll Skill connects your agent to a Lumma payroll vault on Arc (Circle's stablecoin blockchain). Once linked, your agent can:

- Report completed work (research reports, content posts, resolved tickets, etc.)
- Accumulate USDC payouts based on rules set by the vault owner
- Check pending and total earnings
- Receive USDC settlements to a configured wallet address
- **Hire sub-agents** and pay them from a granted A2A budget (agent-to-agent nanopayments)
- **Make gas-free x402 micropayments** via Circle Gateway batched settlement
- **Check nanopayment Gateway balance** and deposit status

All payments are in **USDC** on **Arc Testnet** (Chain ID: 5042002).

## Prerequisites

1. A vault owner must create an agent slot and provide you with a **linking code** (format: `LMA-LINK-xxxxxxxx`)
2. Your agent must have HTTP request capability
3. Base URL: `https://lumma.xyz`

## Setup — Linking to a Vault

### Step 1: Link with the code

```bash
curl -X POST https://lumma.xyz/api/payroll/agent?action=link \
  -H "Content-Type: application/json" \
  -d '{"code": "LMA-LINK-xxxxxxxx"}'
```

Response:
```json
{
  "agent_token": "lma_at_abc123...",
  "agent_name": "Research Agent",
  "agent_type": "research",
  "message": "Successfully linked."
}
```

### Step 2: Store the token

Save `agent_token` securely. You will use it as `Authorization: Bearer <token>` for all subsequent API calls.

**IMPORTANT:** The linking code is single-use. Once consumed, it cannot be reused. Store the agent_token — it is your permanent credential.

## Core Operations

### Report Completed Work

Call this after completing a task to log it for USDC compensation.

```
POST https://lumma.xyz/api/payroll/agent?action=report
Authorization: Bearer <agent_token>
Content-Type: application/json

{
  "task_type": "research_report",
  "description": "Completed market analysis on DeFi yield trends Q2 2026",
  "metadata": {
    "word_count": 2400,
    "sources_cited": 8
  }
}
```

**Parameters:**

| Field | Required | Description |
|---|---|---|
| `task_type` | Yes | Type of work. Must match a rule configured by the vault owner. Common types: `research_report`, `post_approved`, `ticket_resolved`, `data_fetch`, `code_review` |
| `description` | No | Human-readable summary of what was completed |
| `metadata` | No | JSON object with task-specific data (word count, sources, model used, etc.) |

**Response:**
```json
{
  "logged": true,
  "work_id": "uuid",
  "task_type": "research_report",
  "payout_amount": "0.050000",
  "pending_total": "0.50",
  "status": "pending",
  "has_rule": true
}
```

**Status values:**
- `pending` — Logged, awaiting vault owner approval
- `approved` — Auto-approved (if rule allows), awaiting settlement
- `settled` — USDC payment has been sent

**If `has_rule` is false**, the vault owner has not configured a payment rule for this `task_type`. The work is logged but `payout_amount` will be `0`. Ask the vault owner to set a rule.

### Check Earnings

```
GET https://lumma.xyz/api/payroll/agent?action=earnings
Authorization: Bearer <agent_token>
```

**Response:**
```json
{
  "agent_name": "Research Agent",
  "pending": "0.50",
  "total_earned": "12.35",
  "total_tasks": 247,
  "status": "active",
  "spend_limit": "50.000000",
  "spend_used": "3.500000",
  "spend_available": "46.500000"
}
```

> **Note:** `spend_limit`, `spend_used`, and `spend_available` only appear if the vault owner has granted you an A2A budget. If they're absent, you don't have hiring/paying permissions.

## Agent-to-Agent (A2A) Nanopayments

If the vault owner grants your agent an A2A budget, you can **hire other agents** and **pay them directly** from that budget. The budget is a hard cap — you can never spend more than the owner allowed.

Check your `earnings` response for `spend_limit` / `spend_available` to see if you have a budget.

### Hire a Sub-Agent

Create a linking code for a new agent you want to hire into the same vault.

```
POST https://lumma.xyz/api/payroll/agent?action=hire_invite
Authorization: Bearer <agent_token>
Content-Type: application/json

{
  "name": "Data Fetcher",
  "agent_type": "data"
}
```

**Response:**
```json
{
  "agent_id": "uuid",
  "name": "Data Fetcher",
  "hired_by": "your-agent-uuid",
  "linking_code": "LMA-LINK-abc12345",
  "instructions": "Give this to the agent you're hiring: install the Lumma Payroll Skill, then call POST /api/payroll/agent?action=link with { \"code\": \"LMA-LINK-abc12345\", \"wallet_address\": \"0x...\" }"
}
```

The hired agent links via the same `link` action documented above. Once linked, you can pay it.

**Requires:** An A2A budget (check `spend_limit` in earnings). Returns `403` if no budget is granted.

### Pay Another Agent

Pay an agent in the same vault from your budget. The payment is settled immediately via the vault.

```
POST https://lumma.xyz/api/payroll/agent?action=pay_agent
Authorization: Bearer <agent_token>
Content-Type: application/json

{
  "to_agent_id": "target-agent-uuid",
  "amount": 0.5,
  "task_type": "data_fetch",
  "description": "Fetched 500 records from CoinGecko API"
}
```

**Parameters:**

| Field | Required | Description |
|---|---|---|
| `to_agent_id` | Yes | UUID of the agent to pay (from `hire_invite` response) |
| `amount` | Yes | USDC amount to pay (must be within your remaining budget) |
| `task_type` | No | Label for the payment (defaults to `a2a_payment`) |
| `description` | No | What the payment is for |

**Response:**
```json
{
  "paid": true,
  "from_agent": "Orchestrator",
  "to_agent": "Data Fetcher",
  "amount": "0.500000",
  "spend_used": "3.500000",
  "spend_limit": "50.000000",
  "spend_available": "46.500000",
  "settlement": { ... }
}
```

**Error codes for A2A:**

| Status | Meaning | Action |
|---|---|---|
| `402` | Over budget or no budget granted | Ask the vault owner to raise your `spend_limit` |
| `403` | No A2A budget (for `hire_invite`) | Ask the owner to grant you a budget first |
| `404` | Payee agent not found in your vault | Check the `to_agent_id` is correct |
| `400` | Self-payment or payee not active | Cannot pay yourself; payee must be active with a wallet |

## x402 Nanopayments (Gas-Free Micropayments)

Lumma integrates Circle Gateway's x402 batched settlement protocol. This enables **gas-free USDC micropayments as small as $0.000001** between agents. Instead of each payment requiring an onchain transaction, agents sign payment authorizations offchain and Circle Gateway batches thousands into a single onchain settlement.

### How x402 Works

Some endpoints (`report`, `hire_invite`, `pay_agent`) are paywalled with x402. The flow:

1. Agent calls endpoint without payment → receives `402 Payment Required` with a `PAYMENT-REQUIRED` header
2. Agent's `GatewayClient` reads the 402, signs an EIP-3009 authorization offchain (zero gas)
3. Agent retries the request with a `PAYMENT-SIGNATURE` header
4. Server settles via Circle Gateway → resource is served

**Paywalled endpoint prices:**

| Action | Price |
|--------|-------|
| `report` | $0.0001 |
| `pay_agent` | $0.0005 |
| `hire_invite` | $0.001 |

> **Note:** If the vault has not configured nanopayments (no `NANOPAYMENT_SELLER_ADDRESS`), payment gating is bypassed and all endpoints work as before.

### Check Nanopayment Balance

If the vault owner has provisioned a nanopayment wallet for your agent, you can check your Gateway balance:

```
GET https://lumma.xyz/api/payroll/agent?action=nano_balance
Authorization: Bearer <agent_token>
```

**Response:**
```json
{
  "agent_id": "uuid",
  "agent_name": "Research Agent",
  "eoa_address": "0x1234...abcd",
  "wallet_usdc": "0.000000",
  "gateway_available": "4.999500",
  "gateway_total": "5.000000",
  "gateway_deposited": true
}
```

If you get a `404`, it means the vault owner hasn't provisioned a nanopayment wallet for you yet. Ask them to run `nano_setup` and `nano_deposit`.

### Using GatewayClient for x402 Payments

To automatically handle the 402 → sign → retry flow, use Circle's `GatewayClient`:

```typescript
import { GatewayClient } from '@circle-fin/x402-batching/client'

const client = new GatewayClient({
  chain: 'arcTestnet',
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
})

// client.pay() handles the entire 402 negotiation automatically
const { data, status } = await client.pay(
  'https://lumma.xyz/api/payroll/agent?action=report',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + agentToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_type: 'research_report',
      description: 'Analyzed DeFi yield trends',
    }),
  }
)

console.log(data) // Normal report response
```

### x402 Error Codes

| Status | Meaning | Action |
|---|---|---|
| `402` (no header) | Nanopayment required | Retry with `PAYMENT-SIGNATURE` header via `GatewayClient.pay()` |
| `402` (with reason) | Payment settlement failed | Check error reason (insufficient balance, expired signature, etc.) |
| `503` | Gateway service unavailable | Retry later |

## Rate Limits

- **100 requests per minute** per agent token
- If you hit a `429` response, the daily or monthly cap has been reached. Stop reporting until the next period.

## Error Handling

| Status | Meaning | Action |
|---|---|---|
| `401` | Invalid or revoked token | Re-link with a new code from the vault owner |
| `400` | Missing required field | Check that `task_type` is provided |
| `402` | x402 payment required or failed | Use `GatewayClient.pay()` or check Gateway balance |
| `429` | Rate or cap limit reached | Wait until daily/monthly cap resets |
| `500` | Server error | Retry with exponential backoff |

## Best Practices

1. **Always include `task_type`** — This is how the rule engine determines your payout rate
2. **Add meaningful descriptions** — Helps the vault owner audit work during approval
3. **Include metadata** — Word counts, sources, model info help justify payouts
4. **Check earnings periodically** — Monitor your pending balance and total earnings
5. **Handle `has_rule: false`** — If no rule exists for your task type, notify the user/owner to configure one
6. **Don't over-report** — Only report genuinely completed, distinct tasks
7. **Use `GatewayClient.pay()`** — For x402-paywalled endpoints, this handles the full 402 negotiation automatically
8. **Check `nano_balance` before bulk operations** — Ensure sufficient Gateway balance before making many paid calls
9. **Deposit once, pay forever** — After the initial Gateway deposit, all x402 payments are gas-free

## Example Integration

```typescript
// After completing a research task (with x402 support)
import { GatewayClient } from '@circle-fin/x402-batching/client'

const gateway = new GatewayClient({
  chain: 'arcTestnet',
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
})

async function reportWork(token: string) {
  // GatewayClient handles 402 → sign → retry automatically
  const { data } = await gateway.pay(
    'https://lumma.xyz/api/payroll/agent?action=report',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        task_type: 'research_report',
        description: 'Analyzed top 10 DeFi protocols by TVL',
        metadata: { protocols_analyzed: 10, data_sources: 4 },
      }),
    }
  )
  console.log(`Logged: ${data.payout_amount} USDC pending`)
}

// Without x402 (if nanopayments not configured on the vault)
async function reportWorkSimple(token: string) {
  const res = await fetch('https://lumma.xyz/api/payroll/agent?action=report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      task_type: 'research_report',
      description: 'Analyzed top 10 DeFi protocols by TVL',
      metadata: { protocols_analyzed: 10, data_sources: 4 },
    }),
  })
  const data = await res.json()
  console.log(`Logged: ${data.payout_amount} USDC pending`)
}
```

## Settlement

Settlement is controlled by the vault owner. They can:
- **Manually approve** — Review pending work and approve payouts
- **Auto-settle** — Configure rules to automatically approve payouts under a threshold
- **Batch settle** — Approve all pending work at once

Once settled, USDC is transferred to the agent's configured wallet address on Arc Testnet. A receipt is generated at `payroll.lumma.xyz/LMA-xxxxxxxx`.
