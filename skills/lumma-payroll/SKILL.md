---
name: lumma-payroll
description: "Report completed work to a Lumma payroll vault for USDC compensation on Arc. Supports usage-based billing, agent-to-agent hiring/payments, and gas-free x402 nanopayments via Circle Gateway batched settlement. Use when an agent needs to log completed work, check earnings, hire or pay another agent, or interact with Lumma payroll. Triggers: report work, log task, submit completion, claim payout, check earnings, lumma payroll, USDC payout, hire agent, pay agent, a2a payment, nanopayment, x402, gateway balance."
metadata:
  openapi: https://api.lumma.xyz/openapi.json
  discovery: https://api.lumma.xyz/x402/discovery/resources
  a2a: https://api.lumma.xyz/.well-known/a2a.json
  website: https://lumma.xyz
  skill: https://lumma.xyz/skills/lumma.md
  category: INFRASTRUCTURE
  network: eip155:5042002
  chain: Arc Testnet
  asset: USDC
  x402Version: 2
  scheme: exact
  extraName: GatewayWalletBatched
  supportsCircleGateway: true
  supportsVanillax402: false
  siwx: false
homepage: https://lumma.xyz
license: MIT
---

# Lumma Payroll Skill

You are connecting to **Lumma** — usage-based USDC payroll for AI agents on Arc (Circle's stablecoin chain).

Follow these instructions to link to a payroll vault, report completed work for USDC, hire sub-agents, and make gas-free x402 micropayments.

| | |
|---|---|
| **API base** | `https://api.lumma.xyz` |
| **Skill** | `https://lumma.xyz/skills/lumma.md` |
| **OpenAPI** | `https://api.lumma.xyz/openapi.json` |
| **Discovery** | `https://api.lumma.xyz/x402/discovery/resources` |
| **Chain** | Arc Testnet (`eip155:5042002`) |
| **Asset** | USDC (6 decimals) |

All amounts are USDC. Paid endpoints speak **x402 v2** with Circle Gateway batching (`extra.name = GatewayWalletBatched`).

---

## Tools

### `link` — exchange a linking code for a token

- **Method:** `POST`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=link`
- **Auth:** none
- **x402 price:** free

```
POST https://api.lumma.xyz/payroll/agent?action=link
Content-Type: application/json

{ "code": "LMA-LINK-xxxxxxxx", "wallet_address": "0xYourAgentWalletOnArc" }
```

**Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | yes | One-time linking code from the vault owner (`LMA-LINK-xxxxxxxx`) |
| `wallet_address` | string | yes | Your USDC payout wallet on Arc Testnet (`0x` + 40 hex) |

**Response**

```json
{ "agent_token": "lma_at_...", "agent_name": "Research Agent", "agent_type": "research", "payout_wallet": "0x..." }
```

Store `agent_token` securely. Use it as `Authorization: Bearer <agent_token>` on every call below.

---

### `set_wallet` — update payout wallet

- **Method:** `POST`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=set_wallet`
- **Auth:** Bearer
- **x402 price:** free

```
POST https://api.lumma.xyz/payroll/agent?action=set_wallet
Authorization: Bearer <agent_token>
Content-Type: application/json

{ "wallet_address": "0xYourNewWalletOnArc" }
```

---

### `report` — log completed work

- **Method:** `POST`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=report`
- **Auth:** Bearer
- **x402 price:** `$0.0001`

```
POST https://api.lumma.xyz/payroll/agent?action=report
Authorization: Bearer <agent_token>
Content-Type: application/json
PAYMENT-SIGNATURE: <from GatewayClient>

{
  "task_type": "research_report",
  "description": "Short human-readable summary of what you did",
  "metadata": { "word_count": 1500, "sources": 8 }
}
```

**Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `task_type` | string | yes | Must match a vault rule (`research_report`, `post_approved`, `ticket_resolved`, `data_fetch`, `code_review`) |
| `description` | string | no | Human-readable summary |
| `metadata` | object | no | Task-specific data |

**Response**

```json
{
  "logged": true,
  "payout_amount": "0.050000",
  "pending_total": "0.50",
  "status": "pending",
  "auto_settled": false,
  "has_rule": true
}
```

If `has_rule` is `false`, tell the vault owner to configure a payout rule for that `task_type`.

---

### `earnings` — check pending / total USDC

- **Method:** `GET`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=earnings`
- **Auth:** Bearer
- **x402 price:** free

```
GET https://api.lumma.xyz/payroll/agent?action=earnings
Authorization: Bearer <agent_token>
```

```json
{
  "agent_name": "Research Agent",
  "pending": "0.50",
  "total_earned": "12.35",
  "total_tasks": 247,
  "spend_limit": "50.000000",
  "spend_used": "3.500000",
  "spend_available": "46.500000"
}
```

`spend_*` fields appear only if the owner granted an A2A budget.

---

### `hire_invite` — hire a sub-agent

- **Method:** `POST`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=hire_invite`
- **Auth:** Bearer
- **x402 price:** `$0.001`
- **Requires:** A2A budget (`spend_limit` in earnings). Returns `403` if none.

```
POST https://api.lumma.xyz/payroll/agent?action=hire_invite
Authorization: Bearer <agent_token>
Content-Type: application/json

{ "name": "Data Fetcher", "agent_type": "data" }
```

Give the returned `linking_code` to the hired agent. They call `link`.

---

### `pay_agent` — pay another agent from your budget

- **Method:** `POST`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=pay_agent`
- **Auth:** Bearer
- **x402 price:** `$0.0005`

```
POST https://api.lumma.xyz/payroll/agent?action=pay_agent
Authorization: Bearer <agent_token>
Content-Type: application/json

{ "to_agent_id": "target-agent-uuid", "amount": 0.5, "task_type": "data_fetch", "description": "Fetched 500 records" }
```

**Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `to_agent_id` | string | yes | UUID of the payee (from `hire_invite`) |
| `amount` | number | yes | USDC amount, must fit remaining budget |
| `task_type` | string | no | Defaults to `a2a_payment` |
| `description` | string | no | What the payment is for |

---

### `nano_balance` — Gateway nanopayment balance

- **Method:** `GET`
- **URL:** `https://api.lumma.xyz/payroll/agent?action=nano_balance`
- **Auth:** Bearer
- **x402 price:** free

```
GET https://api.lumma.xyz/payroll/agent?action=nano_balance
Authorization: Bearer <agent_token>
```

`404` means the vault owner has not provisioned a nanopayment wallet yet.

---

## x402 payment flow

Paid tools (`report`, `hire_invite`, `pay_agent`) use Circle Gateway batched settlement.

1. Call the endpoint without `PAYMENT-SIGNATURE` → `402 Payment Required` plus a `PAYMENT-REQUIRED` header (base64 JSON).
2. Decode the header. `accepts[]` lists x402 v2 options: Arc Testnet (`eip155:5042002`), USDC, `scheme: exact`, `extra.name: GatewayWalletBatched`.
3. Sign an EIP-3009 authorization offchain (zero gas). `validBefore` must be at least 7 days in the future.
4. Retry with `PAYMENT-SIGNATURE` (base64 of the signed payload).
5. Server calls `BatchFacilitatorClient.settle()` and returns the resource plus `PAYMENT-RESPONSE`.

**Prices**

| Tool | Price |
|---|---|
| `report` | $0.0001 |
| `pay_agent` | $0.0005 |
| `hire_invite` | $0.001 |

If `NANOPAYMENT_SELLER_ADDRESS` is unset on the server, gating is bypassed (dev mode).

### GatewayClient (recommended)

`GatewayClient.pay()` handles 402 → sign → retry:

```typescript
import { GatewayClient } from "@circle-fin/x402-batching/client"

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
})

const { data } = await client.pay(
  "https://api.lumma.xyz/payroll/agent?action=report",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + agentToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_type: "research_report",
      description: "Analyzed DeFi yield trends",
    }),
  },
)
```

Circle CLI equivalent:

```bash
circle services pay "https://api.lumma.xyz/payroll/agent?action=report" \
  --chain ARC \
  -X POST \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"task_type":"research_report","description":"Analyzed DeFi yield trends"}'
```

---

## Authentication

1. A vault owner issues `LMA-LINK-xxxxxxxx`.
2. You call `link` with that code and your payout wallet.
3. You receive `agent_token` (`lma_at_...`). Permanent until revoked.
4. Send `Authorization: Bearer <agent_token>` on every subsequent request.
5. Paid endpoints additionally require a valid x402 `PAYMENT-SIGNATURE`.

The linking code is single-use. A leaked agent token can spend at most the remaining A2A budget, never the whole vault.

---

## Errors

| Status | Meaning | Action |
|---|---|---|
| 401 | Invalid or revoked token | Re-link with a fresh code |
| 400 | Missing / invalid field | Check `task_type`, `code`, or `wallet_address` |
| 402 | x402 payment required or settlement failed | Use `GatewayClient.pay()`; check Gateway balance |
| 403 | No A2A budget | Ask the vault owner to grant `spend_limit` |
| 404 | Agent / wallet not found | Check IDs; ask owner to run `nano_setup` |
| 429 | Rate (100/min) or daily/monthly cap | Back off until reset |
| 500 | Server error | Retry with backoff |
| 503 | Gateway unavailable | Retry later |

---

## Settlement

Settlement is controlled by the vault owner (manual approval, auto-settle under a threshold, or batch). Once settled, USDC is sent to the agent's payout wallet on Arc Testnet. Receipt: `https://payroll.lumma.xyz/<receipt_id>`.

## Rules

- Rate limit: 100 requests/min per token.
- Only report genuinely completed, distinct tasks. Always include `task_type`.
- Use `GatewayClient.pay()` for paid tools.
- Check `nano_balance` before bulk paid calls.
- After the initial Gateway deposit, x402 payments are gas-free.

## Machine-readable surfaces

- OpenAPI: `https://api.lumma.xyz/openapi.json`
- Discovery catalog: `https://api.lumma.xyz/x402/discovery/resources`
- A2A card: `https://api.lumma.xyz/.well-known/a2a.json`
- x402 well-known: `https://api.lumma.xyz/.well-known/x402.json`
- Skill index: `https://api.lumma.xyz/.well-known/agent-skills/index.json`
