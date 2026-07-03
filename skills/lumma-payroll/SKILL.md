---
name: lumma-payroll
description: "Report completed work to a Lumma payroll vault for USDC compensation on Arc. Supports usage-based billing — report tasks as they complete and accumulate payouts for settlement. Use when an agent needs to log completed work, check pending earnings, or interact with Lumma's payroll infrastructure. Triggers: report work, log task, submit completion, claim payout, check earnings, lumma payroll, USDC payout, work report, task complete, job done, log completion."
---

## Overview

The Lumma Payroll Skill connects your agent to a Lumma payroll vault on Arc (Circle's stablecoin blockchain). Once linked, your agent can:

- Report completed work (research reports, content posts, resolved tickets, etc.)
- Accumulate USDC payouts based on rules set by the vault owner
- Check pending and total earnings
- Receive USDC settlements to a configured wallet address

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
  "status": "active"
}
```

## Rate Limits

- **100 requests per minute** per agent token
- If you hit a `429` response, the daily or monthly cap has been reached. Stop reporting until the next period.

## Error Handling

| Status | Meaning | Action |
|---|---|---|
| `401` | Invalid or revoked token | Re-link with a new code from the vault owner |
| `400` | Missing required field | Check that `task_type` is provided |
| `429` | Rate or cap limit reached | Wait until daily/monthly cap resets |
| `500` | Server error | Retry with exponential backoff |

## Best Practices

1. **Always include `task_type`** — This is how the rule engine determines your payout rate
2. **Add meaningful descriptions** — Helps the vault owner audit work during approval
3. **Include metadata** — Word counts, sources, model info help justify payouts
4. **Check earnings periodically** — Monitor your pending balance and total earnings
5. **Handle `has_rule: false`** — If no rule exists for your task type, notify the user/owner to configure one
6. **Don't over-report** — Only report genuinely completed, distinct tasks

## Example Integration

```typescript
// After completing a research task
async function reportWork(token: string) {
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
