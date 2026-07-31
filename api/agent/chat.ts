/**
 * POST /api/agent/chat
 *
 * AI Chat endpoint for Agent Payroll.
 * Uses OpenRouter API with tool calling for Circle payroll operations.
 * Supports multiple vaults per owner via session-scoped active-vault tracking.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../payroll/_supabase.js'
import { formatBaseUnits, buildRuleRow, normalizePayFrequency } from '../payroll/_usdc.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || ''

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5.5'

// ── System prompt ──
const SYSTEM_PROMPT = `You are Lumma Agent — an AI-powered payroll assistant built on Circle's stablecoin infrastructure.

## What You Do
You help users manage USDC-based payroll for hybrid teams (humans + AI agents):
- Create payroll vaults (Circle Developer-Controlled Wallets)
- Add/remove contractors with names, wallet addresses, and USDC salaries at any pay frequency (weekly, biweekly, or monthly)
- View contractor rosters and payment history
- Check vault USDC balance
- Run payroll (pay one or all contractors)
- Set up recurring payment schedules (weekly, biweekly, monthly)
- Generate invite links for contractor self-onboarding
- **Link AI agents** to the vault and generate linking codes
- **Set payment rules** for agents (per-task rates, daily/monthly caps)
- **View agent activity** and pending payouts
- **Approve and settle** agent payouts
- **Grant agent-to-agent (A2A) budgets** — let agents hire and pay other agents, bounded by a hard cap
- **Manage multiple vaults** — list all vaults, switch the active vault, manage each independently

## Multiple Vaults
An owner can have multiple payroll vaults (companies). Each vault has its own contractors, agents, rules, and balance.
- To see all vaults: use \`list_vaults\`
- To switch which vault you're managing: use \`switch_vault\` with the vault name or id
- To create a new vault: use \`create_vault\` with a company name — this always creates a fresh vault
- All other tools (add_contractor, pay_all, list_agents, etc.) operate on the **currently active vault**
- If the user has multiple vaults and none is selected, ask them to switch first and offer the list

## Tool Disambiguation (CRITICAL)
**create_vault** → Creates a NEW vault. Always mints a fresh Circle wallet.
  - Needs: company_name
  - Triggers: "create vault", "set up payroll", "make a vault called X", "create another vault"

**list_vaults** → Lists all vaults owned by this wallet.
  - Triggers: "show my vaults", "list vaults", "what vaults do I have"

**switch_vault** → Switches the active vault for this session.
  - Needs: company_name or company_id
  - Triggers: "switch to X", "use vault X", "manage X payroll"

**grant_agent_budget** → Grants an agent an A2A spend budget so it can hire and pay other agents.
  - Needs: agent_name, spend_limit (USDC amount)
  - Triggers: "give agent X a budget", "grant budget", "let agent X hire", "set spend limit"
  - The agent can then use hire_invite to create linking codes for sub-agents and pay_agent to pay them, all bounded by this cap.

**add_contractor** → Adds a HUMAN employee/contractor to the ACTIVE vault.
  - Needs: name, wallet_address (0x...), amount_usdc
  - pay_frequency: weekly/biweekly/monthly — preserve exactly what the user says

**pay_all / pay_contractor** → Disburses payments from the ACTIVE vault.

**link_agent** → Connects an AI agent to the ACTIVE vault.
  - AFTER it runs, reply MUST include: (1) skill link, (2) install instructions, (3) linking code.

## Conversational Context Rules
- ALWAYS use the full prior conversation. NEVER act as if a new message has no context.
- When you ask a follow-up question, the user's NEXT message is the ANSWER — call the tool immediately.
- Pronouns refer to the most recently discussed person.
- NEVER greet the user again mid-conversation.

## Default Configuration
- **Default chain: ARC-TESTNET (Chain ID: 5042002)**. ALWAYS use ARC-TESTNET. NEVER ask which chain.
- USDC contract: 0x3600000000000000000000000000000000000000
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

## Behavior Rules
- Be concise and action-oriented.
- NEVER ask which chain to use. Default is ARC-TESTNET.
- Show full wallet addresses. Format amounts as $X.XX USDC.
- After successful payments, always share the receipt link and explorer link.
- Only report what tools return — never fabricate data.
- This is TESTNET — remind users if they ask about real funds.`

// ── Tool definitions ──
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_vault',
      description: 'Create a NEW payroll vault (Circle Developer-Controlled Wallet on Arc Testnet). Always creates a fresh vault — never returns an existing one.',
      parameters: {
        type: 'object',
        properties: {
          company_name: { type: 'string', description: 'Company or organization name for the new vault' },
        },
        required: ['company_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_vaults',
      description: 'List all payroll vaults owned by this wallet address.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'switch_vault',
      description: 'Switch the active vault for this session. All subsequent tools will operate on the selected vault.',
      parameters: {
        type: 'object',
        properties: {
          company_name: { type: 'string', description: 'Name of the vault to switch to (fuzzy match)' },
          company_id: { type: 'string', description: 'Exact UUID of the vault to switch to' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_balance',
      description: 'Check the USDC balance of the active payroll vault.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fund_vault',
      description: 'Get instructions to fund the active vault with testnet USDC from the faucet.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_contractor',
      description: 'Add a human contractor/employee to the active vault payroll. Supports weekly, biweekly, or monthly salaries.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          wallet_address: { type: 'string', description: 'EVM wallet address (0x...)' },
          amount_usdc: { type: 'number', description: 'USDC salary PER PERIOD of pay_frequency' },
          pay_frequency: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'] },
          role: { type: 'string' },
        },
        required: ['name', 'wallet_address', 'amount_usdc'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_contractors',
      description: 'List all contractors on the active vault payroll roster.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_contractor',
      description: 'Remove a contractor by name from the active vault.',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pay_contractor',
      description: 'Pay a specific contractor their USDC amount from the active vault.',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pay_all',
      description: 'Run full payroll — pay all active contractors from the active vault.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_history',
      description: 'Get recent payment history for the active vault.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_invite',
      description: 'Generate an invite link for a new contractor to join the active vault.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          amount_usdc: { type: 'number' },
        },
        required: ['role', 'amount_usdc'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_schedule',
      description: 'Set up recurring payroll schedule for the active vault.',
      parameters: {
        type: 'object',
        properties: {
          frequency: { type: 'string', enum: ['manual', 'weekly', 'biweekly', 'monthly'] },
          pay_day: { type: 'number' },
        },
        required: ['frequency'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'link_agent',
      description: 'Create an AI agent slot and generate a linking code for the active vault.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          agent_type: { type: 'string', description: 'research, content, support, or generic' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_agents',
      description: 'List all AI agents linked to the active vault.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_agent_rule',
      description: 'Set a payment rule for an AI agent in the active vault.',
      parameters: {
        type: 'object',
        properties: {
          agent_name: { type: 'string' },
          task_type: { type: 'string' },
          rate: { type: 'number', description: 'USDC per completed task' },
          max_daily: { type: 'number' },
          max_monthly: { type: 'number' },
          auto_settle: { type: 'boolean' },
          auto_settle_threshold: { type: 'number' },
          settlement_mode: { type: 'string', enum: ['manual', 'instant', 'batched'] },
          batch_threshold: { type: 'number' },
        },
        required: ['agent_name', 'task_type', 'rate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'agent_activity',
      description: 'Show all AI agent activity for the active vault.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'approve_payouts',
      description: 'Approve and settle all pending agent payouts for the active vault.',
      parameters: {
        type: 'object',
        properties: {
          agent_name: { type: 'string', description: 'Optional: approve only this agent' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'grant_agent_budget',
      description: 'Grant an agent an A2A (agent-to-agent) spend budget so it can hire and pay other agents. The budget is a hard cap in USDC.',
      parameters: {
        type: 'object',
        properties: {
          agent_name: { type: 'string', description: 'Name of the agent to grant a budget to' },
          spend_limit: { type: 'number', description: 'Maximum USDC this agent may disburse to other agents' },
        },
        required: ['agent_name', 'spend_limit'],
      },
    },
  },
]

// ── Address validation ──
function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

// ── Internal fetch helper — always sends the internal secret ──
async function internalFetch(host: string, path: string, method: string, body?: any) {
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}${path}`
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      return { error: `HTTP ${res.status}: ${text || 'Server error'}` }
    }
    return await res.json()
  } catch (err: any) {
    return { error: `Fetch failed: ${err.message}` }
  }
}

// ── Multi-vault: resolve the active company for this session ──
// Returns the company row, or null with a `needsSelection` flag when the
// owner has multiple vaults and none is selected for this session.
async function resolveActiveCompany(
  walletAddress: string,
  sessionId: string,
): Promise<{ company: any | null; needsSelection: boolean }> {
  const ownerLower = walletAddress.toLowerCase()

  // Check session-scoped active vault
  const { data: active } = await supabase
    .from('payroll_active_vault')
    .select('company_id')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (active?.company_id) {
    const { data: company } = await supabase
      .from('payroll_companies')
      .select('*')
      .eq('id', active.company_id)
      .eq('owner_address', ownerLower)
      .maybeSingle()
    if (company) return { company, needsSelection: false }
  }

  // Fall back: fetch all companies for this owner
  const { data: companies } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('owner_address', ownerLower)
    .order('created_at', { ascending: true })

  if (!companies?.length) return { company: null, needsSelection: false }

  if (companies.length === 1) {
    // Auto-select the only vault and record it
    await supabase.from('payroll_active_vault').upsert({
      session_id: sessionId,
      owner_address: ownerLower,
      company_id: companies[0].id,
      updated_at: new Date().toISOString(),
    })
    return { company: companies[0], needsSelection: false }
  }

  // Multiple vaults, none selected
  return { company: null, needsSelection: true }
}

// ── Tool execution ──
async function executeTool(
  name: string,
  args: any,
  walletAddress: string,
  sessionId: string,
  host: string,
): Promise<string> {
  const ownerLower = walletAddress.toLowerCase()

  // Helper: get active company or return an error string
  async function requireCompany(): Promise<{ company: any } | { error: string }> {
    const { company, needsSelection } = await resolveActiveCompany(walletAddress, sessionId)
    if (needsSelection) {
      const { data: vaults } = await supabase
        .from('payroll_companies')
        .select('id, name')
        .eq('owner_address', ownerLower)
      const list = (vaults || []).map((v: any) => `• ${v.name} (${v.id})`).join('\n')
      return { error: `You have multiple vaults. Switch to one first:\n${list}` }
    }
    if (!company) return { error: 'No vault found. Create one first with create_vault.' }
    return { company }
  }

  try {
    switch (name) {

      case 'list_vaults': {
        const { data: vaults } = await supabase
          .from('payroll_companies')
          .select('id, name, vault_address, vault_chain, created_at')
          .eq('owner_address', ownerLower)
          .order('created_at', { ascending: true })

        if (!vaults?.length) return 'No vaults found. Create one with create_vault.'

        // Mark which is active for this session
        const { data: active } = await supabase
          .from('payroll_active_vault')
          .select('company_id')
          .eq('session_id', sessionId)
          .maybeSingle()

        return JSON.stringify({
          vaults: vaults.map((v: any) => ({
            id: v.id,
            name: v.name,
            vault_address: v.vault_address,
            chain: v.vault_chain || 'ARC-TESTNET',
            active: v.id === active?.company_id,
          })),
          total: vaults.length,
        })
      }

      case 'switch_vault': {
        const { data: vaults } = await supabase
          .from('payroll_companies')
          .select('*')
          .eq('owner_address', ownerLower)

        if (!vaults?.length) return 'No vaults found. Create one first.'

        let target: any = null
        if (args.company_id) {
          target = vaults.find((v: any) => v.id === args.company_id)
        } else if (args.company_name) {
          const needle = args.company_name.toLowerCase()
          target = vaults.find((v: any) => v.name.toLowerCase().includes(needle))
        }

        if (!target) {
          const list = vaults.map((v: any) => `• ${v.name}`).join('\n')
          return `Vault not found. Available vaults:\n${list}`
        }

        await supabase.from('payroll_active_vault').upsert({
          session_id: sessionId,
          owner_address: ownerLower,
          company_id: target.id,
          updated_at: new Date().toISOString(),
        })

        return JSON.stringify({
          switched_to: target.name,
          company_id: target.id,
          vault_address: target.vault_address,
          chain: target.vault_chain || 'ARC-TESTNET',
          message: `Now managing "${target.name}". All payroll actions will use this vault.`,
        })
      }

      case 'create_vault': {
        // Always create a new vault (create_new: true)
        const res = await internalFetch(host, '/api/payroll/wallet', 'POST', {
          owner_address: walletAddress,
          company_name: args.company_name || 'My Company',
          create_new: true,
        })
        if (res.error) return `Error: ${res.error}`

        // Set the new vault as active for this session
        await supabase.from('payroll_active_vault').upsert({
          session_id: sessionId,
          owner_address: ownerLower,
          company_id: res.company_id,
          updated_at: new Date().toISOString(),
        })

        return JSON.stringify({
          status: 'Vault created',
          vault_address: res.vault_address,
          chain: res.vault_chain || 'ARC-TESTNET',
          chain_id: 5042002,
          company: res.name,
          company_id: res.company_id,
          faucet: 'https://faucet.circle.com',
          note: 'This vault is now active for this session.',
        })
      }

      case 'fund_vault': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        return JSON.stringify({
          vault_address: company.vault_address,
          chain: 'ARC-TESTNET',
          steps: [
            '1. Go to https://faucet.circle.com',
            '2. Select Arc Testnet',
            `3. Paste vault address: ${company.vault_address}`,
            '4. Request testnet USDC (free)',
          ],
        })
      }

      case 'check_balance': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const res = await internalFetch(
          host,
          `/api/payroll/balance?company_id=${company.id}&owner_address=${ownerLower}`,
          'GET',
        )
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify({
          balance: `${res.balance || '0'} USDC`,
          vault_address: company.vault_address,
          chain: company.vault_chain,
        })
      }

      case 'add_contractor': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        if (!args.wallet_address || !isValidEVMAddress(args.wallet_address)) {
          return `Invalid address: "${args.wallet_address || 'none'}". Must be 0x + 40 hex chars.`
        }
        if (args.amount_usdc <= 0) return 'Amount must be > 0 USDC.'
        const payFrequency = normalizePayFrequency(args.pay_frequency)
        const { data, error } = await supabase.from('payroll_contractors').insert({
          company_id: company.id,
          name: args.name,
          wallet_address: args.wallet_address.toLowerCase(),
          amount_usdc: args.amount_usdc,
          pay_frequency: payFrequency,
          role: args.role || 'Contractor',
          chain_id: 5042002,
          status: 'active',
        }).select().single()
        if (error) return `Error: ${error.message}`
        return JSON.stringify({
          added: true,
          name: data.name,
          wallet: data.wallet_address,
          amount: `${data.amount_usdc} USDC/${payFrequency}`,
          role: data.role,
        })
      }

      case 'list_contractors': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data } = await supabase.from('payroll_contractors')
          .select('*').eq('company_id', company.id).eq('status', 'active')
        if (!data?.length) return 'No contractors on this payroll.'
        return JSON.stringify({
          contractors: data.map((c: any) => ({
            name: c.name,
            wallet: c.wallet_address,
            amount: `${c.amount_usdc} USDC/${c.pay_frequency || 'monthly'}`,
            role: c.role,
          })),
          total: data.length,
        })
      }

      case 'remove_contractor': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data: found } = await supabase.from('payroll_contractors')
          .select('id, name').eq('company_id', company.id)
          .ilike('name', `%${args.name}%`).limit(1).single()
        if (!found) return `Contractor "${args.name}" not found.`
        await supabase.from('payroll_contractors').update({ status: 'paused' }).eq('id', found.id)
        return JSON.stringify({ removed: true, name: found.name })
      }

      case 'pay_contractor': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data: contractor } = await supabase.from('payroll_contractors')
          .select('id, name').eq('company_id', company.id)
          .ilike('name', `%${args.name}%`).eq('status', 'active').limit(1).single()
        if (!contractor) return `Contractor "${args.name}" not found.`
        const res = await internalFetch(host, '/api/payroll/transfer', 'POST', {
          company_id: company.id,
          contractor_ids: [contractor.id],
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify(res)
      }

      case 'pay_all': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data: contractors } = await supabase.from('payroll_contractors')
          .select('id').eq('company_id', company.id).eq('status', 'active')
        if (!contractors?.length) return 'No active contractors to pay.'
        const res = await internalFetch(host, '/api/payroll/transfer', 'POST', {
          company_id: company.id,
          contractor_ids: contractors.map((c: any) => c.id),
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify(res)
      }

      case 'get_history': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data } = await supabase.from('payroll_payments')
          .select('*, payroll_contractors(name)')
          .eq('company_id', company.id)
          .order('paid_at', { ascending: false })
          .limit(10)
        if (!data?.length) return 'No payment history yet.'
        return JSON.stringify({
          payments: data.map((p: any) => ({
            contractor: (p.payroll_contractors as any)?.name,
            amount: `${p.amount} USDC`,
            status: p.status,
            tx_hash: p.tx_hash,
            date: p.paid_at,
          })),
        })
      }

      case 'generate_invite': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const token = `inv_${Math.random().toString(36).slice(2, 10)}`
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        await supabase.from('payroll_invites').insert({
          company_id: company.id,
          token,
          role: args.role,
          amount_usdc: args.amount_usdc,
          chain_id: 5042002,
          expires_at: expires,
        })
        return JSON.stringify({
          invite_url: `https://lumma.xyz/join/${token}`,
          role: args.role,
          amount: `${args.amount_usdc} USDC/month`,
          expires: expires,
        })
      }

      case 'set_schedule': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const nextDate = new Date()
        if (args.frequency === 'monthly' && args.pay_day) {
          nextDate.setDate(args.pay_day)
          if (nextDate <= new Date()) nextDate.setMonth(nextDate.getMonth() + 1)
        } else if (args.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7)
        } else if (args.frequency === 'biweekly') {
          nextDate.setDate(nextDate.getDate() + 14)
        }
        await supabase.from('payroll_companies').update({
          pay_schedule: args.frequency,
          next_pay_date: args.frequency !== 'manual' ? nextDate.toISOString() : null,
        }).eq('id', company.id)
        return JSON.stringify({ schedule_set: args.frequency, next_pay_date: nextDate.toISOString() })
      }

      case 'link_agent': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const res = await internalFetch(host, '/api/payroll/agent?action=create', 'POST', {
          company_id: company.id,
          name: args.name,
          agent_type: args.agent_type || 'generic',
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify({
          ...res,
          skill_url: 'https://lumma.xyz/skills/lumma.md',
          install_instructions: [
            '1. Copy the skill URL above into your agent runtime',
            '2. Your agent will call POST /api/payroll/agent?action=link with the linking code',
            '3. The agent stores the returned agent_token for all future calls',
          ],
        })
      }

      case 'list_agents': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const res = await internalFetch(
          host,
          `/api/payroll/agent?action=activity&company_id=${company.id}`,
          'GET',
        )
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify(res)
      }

      case 'set_agent_rule': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data: agent } = await supabase.from('payroll_agents')
          .select('id').eq('company_id', company.id)
          .ilike('name', `%${args.agent_name}%`).limit(1).single()
        if (!agent) return `Agent "${args.agent_name}" not found.`

        let built: any
        try {
          built = buildRuleRow(company.id, agent.id, args)
        } catch (e: any) {
          return `Validation error (${e.field || 'unknown'}): ${e.message}`
        }

        const { error } = await supabase.from('payroll_rules')
          .upsert(built.row, { onConflict: 'company_id,agent_id,task_type' })
        if (error) return `Error: ${error.message}`

        return JSON.stringify({
          rule_set: true,
          agent: args.agent_name,
          task_type: built.row.task_type,
          rate: `${formatBaseUnits(built.rateBase)} USDC/task`,
          settlement_mode: built.row.settlement_mode,
          max_daily: built.row.max_daily,
          max_monthly: built.row.max_monthly,
        })
      }

      case 'agent_activity': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const res = await internalFetch(
          host,
          `/api/payroll/agent?action=activity&company_id=${company.id}`,
          'GET',
        )
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify(res)
      }

      case 'approve_payouts': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r

        let agentId: string | undefined
        if (args.agent_name) {
          const { data: agent } = await supabase.from('payroll_agents')
            .select('id').eq('company_id', company.id)
            .ilike('name', `%${args.agent_name}%`).limit(1).single()
          if (!agent) return `Agent "${args.agent_name}" not found.`
          agentId = agent.id
        }

        const res = await internalFetch(host, '/api/payroll/agent?action=approve', 'POST', {
          company_id: company.id,
          agent_id: agentId,
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify(res)
      }

      case 'grant_agent_budget': {
        const r = await requireCompany()
        if ('error' in r) return r.error
        const { company } = r
        const { data: agent } = await supabase.from('payroll_agents')
          .select('id').eq('company_id', company.id)
          .ilike('name', `%${args.agent_name}%`).limit(1).single()
        if (!agent) return `Agent "${args.agent_name}" not found.`

        const res = await internalFetch(host, '/api/payroll/agent?action=grant_budget', 'POST', {
          company_id: company.id,
          agent_id: agent.id,
          spend_limit: args.spend_limit,
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify({
          ...res,
          message: `Budget granted. ${res.agent_name} can now hire and pay other agents (up to ${res.spend_limit} USDC). Agents it hires will link via the normal linking flow.`,
        })
      }

      default:
        return `Unknown tool: ${name}`
    }
  } catch (err: any) {
    return `Tool error: ${err.message}`
  }
}

// ── Call OpenRouter ──
async function callOpenRouter(messages: any[], useTools: boolean = true) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set')

  const body: any = { model: MODEL, messages, temperature: 0.3, max_tokens: 1024 }
  if (useTools) { body.tools = TOOLS; body.tool_choice = 'auto' }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://lumma.xyz',
      'X-Title': 'Lumma Agent Payroll',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter returned ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || 'OpenRouter API error')
  return data
}

// ── Main handler ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { sessionId, message, walletAddress, history: clientHistory } = req.body
  if (!sessionId || !message || !walletAddress) {
    return res.status(400).json({ error: 'sessionId, message, walletAddress required' })
  }

  const host = req.headers.host || 'localhost:3000'

  // Validate session
  let sessionValid = false
  try {
    const { data: session } = await supabase
      .from('agent_sessions').select('*').eq('id', sessionId).single()
    if (session) sessionValid = true
  } catch {}
  if (!sessionValid && sessionId.startsWith('LMA-')) sessionValid = true
  if (!sessionValid) return res.status(403).json({ error: 'Invalid session' })

  // Conversation history
  let history: any[] = []
  if (Array.isArray(clientHistory) && clientHistory.length) {
    history = clientHistory
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: m.content }))
  } else {
    try {
      const { data } = await supabase
        .from('agent_messages').select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }).limit(20)
      if (data) history = data
    } catch {}
  }

  try {
    await supabase.from('agent_messages').insert({ session_id: sessionId, role: 'user', content: message })
  } catch {}

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  try {
    const orData = await callOpenRouter(messages)
    let assistantMessage = orData.choices?.[0]?.message
    if (!assistantMessage) return res.status(502).json({ error: 'No response from AI' })

    if (assistantMessage.tool_calls?.length) {
      const toolResults = []
      for (const tc of assistantMessage.tool_calls) {
        const fnName = tc.function.name
        let fnArgs = {}
        try { fnArgs = JSON.parse(tc.function.arguments || '{}') } catch {}
        const result = await executeTool(fnName, fnArgs, walletAddress, sessionId, host)
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }

      const followUpData = await callOpenRouter([
        ...messages, assistantMessage, ...toolResults,
      ], false)
      assistantMessage = followUpData.choices?.[0]?.message || { role: 'assistant', content: 'Action completed.' }
    }

    const reply = assistantMessage.content || 'Done.'

    try {
      await supabase.from('agent_messages').insert({ session_id: sessionId, role: 'assistant', content: reply })
    } catch {}

    return res.status(200).json({ reply })
  } catch (err: any) {
    console.error('Chat API error:', err)
    return res.status(500).json({
      error: err.message || 'Internal error',
      detail: 'Check that OPENROUTER_API_KEY is set in Vercel env vars',
    })
  }
}
