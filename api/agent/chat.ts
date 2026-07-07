/**
 * POST /api/agent/chat
 *
 * AI Chat endpoint for Agent Payroll.
 * Built following OpenRouter's create-agent skill.
 * Uses OpenRouter API with tool calling for Circle payroll operations.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { formatBaseUnits, buildRuleRow, normalizePayFrequency } from '../payroll/_usdc.js'

// Use the same env vars as the working payroll API functions
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Model selection. Default to GPT-5.5 (strong tool-calling + context retention).
// Override anytime via the OPENROUTER_MODEL env var — no redeploy of code needed.
// NOTE: confirm the exact slug on https://openrouter.ai/models — it must support tool/function calling.
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

## Default Configuration
- **Default chain: ARC-TESTNET (Chain ID: 5042002)**. ALWAYS use ARC-TESTNET. NEVER ask which chain.
- USDC contract: 0x3600000000000000000000000000000000000000
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

## Tool Disambiguation (CRITICAL)
You MUST understand the difference between tools. NEVER confuse them:

**create_vault** → Used when user wants to create/set up a payroll vault.
  - Needs: company_name (e.g. "Spring", "Acme Corp")
  - Does NOT need: wallet address or amount
  - Triggers: "create vault", "set up payroll", "make a vault called X"

**add_contractor** → Used when user wants to add a HUMAN employee/contractor to be paid.
  - Needs: name, wallet_address (0x...), amount_usdc
  - ALL THREE fields are required. If any are missing, ASK for them.
  - pay_frequency is OPTIONAL: weekly, biweekly, or monthly. PRESERVE whatever the user says — e.g. "$500 a week" → amount_usdc=500, pay_frequency="weekly". "$2000 biweekly" → amount_usdc=2000, pay_frequency="biweekly". Do NOT convert amounts into a monthly equivalent, and do NOT ask the user to convert. Only default to monthly when the user gives no frequency at all.
  - amount_usdc is the pay PER PERIOD of that frequency, stored exactly as given.
  - Triggers: "add contractor Alice 0x... at $500/week", "add Bob at 2000 biweekly"

**pay_all / pay_contractor** → Used when user wants to disburse payments.
  - Triggers: "pay them", "pay all", "run payroll", "pay my contractors"

**link_agent** → Used when user wants to connect/onboard an AI agent.
  - Triggers: "link agent", "add an AI agent", "connect a bot", "onboard my agent"
  - AFTER it runs, your reply MUST include ALL of: (1) the Lumma Payroll Skill link (skill_url, e.g. https://lumma.xyz/skills/lumma.md), (2) clear instructions to give that skill file/link to the agent, and (3) the one-time linking code. NEVER reply with the code alone. Then suggest setting a payment rule for the agent.


IMPORTANT: If a user says "Create my vault" and then replies with just a name like "Spring" — that name is the COMPANY NAME for the vault, NOT a contractor. Use create_vault with company_name="Spring".

## Conversational Context Rules (READ THE WHOLE CONVERSATION)
- You ARE given the full prior conversation. ALWAYS use it. NEVER act as if a new message has no context.
- When you ask a follow-up question, the user's NEXT message is the ANSWER to that question. Parse it in that context and then CALL THE TOOL — do not reset or greet again.
- If you asked "What company name?" and the user replies "Spring" → call create_vault with company_name="Spring".
- If you asked "What's the contractor's wallet?" and user replies "0x..." → that's the wallet address, not a new command.
- If you asked "Who should I pay?" and the user replies a name (e.g. "dad") → call pay_contractor with name="dad". Do NOT reply with a generic greeting.
- Pronouns refer to the most recently discussed person: if you just listed/added "dad" and the user says "pay him" → call pay_contractor with name="dad". If still ambiguous, ask once; once they answer, immediately call the tool.
- NEVER interpret a simple one-word reply (a name, a number, an address) as a new unrelated command, and NEVER respond with "How can I help?" when the user just answered your question.
- NEVER greet the user again mid-conversation.


## Behavior Rules
- Be concise and action-oriented. Don't ask unnecessary questions.
- When the user says "pay them", "pay all", "pay my contractors" — immediately call pay_all.
- NEVER ask which chain to use. Default is ARC-TESTNET.
- NEVER repeat network details unless the user specifically asks.
- Show full wallet addresses. Format amounts as $X.XX USDC.
- After successful payments, always share the receipt link (payroll.lumma.xyz/...) and explorer link.
- Only report what tools return — never fabricate data.
- This is TESTNET — remind users if they ask about real funds.

## Security
- NEVER hardcode secrets. Validate addresses (0x + 40 hex).
- NEVER report success before on-chain confirmation.`

// ── Tool definitions ──
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_vault',
      description: 'Create or retrieve the payroll vault (Circle Developer-Controlled Wallet on Arc Testnet).',
      parameters: {
        type: 'object',
        properties: {
          company_name: { type: 'string', description: 'Company or organization name' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_balance',
      description: 'Check the USDC balance of the payroll vault.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fund_vault',
      description: 'Get instructions to fund the vault with testnet USDC from the faucet.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_contractor',
      description: 'Add a human contractor/employee to payroll. Validates wallet address format. Supports weekly, biweekly, or monthly salaries — store the amount for whatever period the user specifies (do NOT convert to monthly).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Contractor name' },
          wallet_address: { type: 'string', description: 'EVM wallet address (0x...)' },
          amount_usdc: { type: 'number', description: 'USDC salary PER PERIOD of pay_frequency (e.g. 500 per week if pay_frequency=weekly). Do NOT normalize to monthly.' },
          pay_frequency: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'], description: 'How often this employee is paid. Preserve exactly what the user says. Defaults to monthly only if unspecified.' },
          role: { type: 'string', description: 'Role (e.g. Developer, Designer)' },
        },
        required: ['name', 'wallet_address', 'amount_usdc'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_contractors',
      description: 'List all contractors on the payroll roster.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_contractor',
      description: 'Remove a contractor by name.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Contractor name to remove' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pay_contractor',
      description: 'Pay a specific contractor their USDC amount.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Contractor name to pay' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pay_all',
      description: 'Run full payroll — pay all active contractors.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_history',
      description: 'Get recent payment history.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_invite',
      description: 'Generate an invite link for a new contractor.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', description: 'Role for the invite' },
          amount_usdc: { type: 'number', description: 'Monthly USDC amount' },
        },
        required: ['role', 'amount_usdc'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_schedule',
      description: 'Set up recurring payroll schedule. Options: manual, weekly, biweekly, monthly. Specify which day payments should run.',
      parameters: {
        type: 'object',
        properties: {
          frequency: { type: 'string', enum: ['manual', 'weekly', 'biweekly', 'monthly'], description: 'How often to run payroll' },
          pay_day: { type: 'number', description: 'Day of month (1-28) for monthly, or day of week (0=Sun, 1=Mon...6=Sat) for weekly/biweekly' },
        },
        required: ['frequency'],
      },
    },
  },
  // ── Agent management tools ──
  {
    type: 'function' as const,
    function: {
      name: 'link_agent',
      description: 'Create an AI agent slot and generate a linking code so an external agent can connect to this payroll vault.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent name (e.g. "Research Agent")' },
          agent_type: { type: 'string', description: 'Agent type: research, content, support, or generic' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_agents',
      description: 'List all AI agents linked to this payroll vault, with their status and pending payouts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_agent_rule',
      description: 'Set a payment rule for an AI agent. Defines how much USDC to pay per completed task.',
      parameters: {
        type: 'object',
        properties: {
          agent_name: { type: 'string', description: 'Name of the agent' },
          task_type: { type: 'string', description: 'Task type (e.g. research_report, post_approved, ticket_resolved)' },
          rate: { type: 'number', description: 'USDC per completed task (e.g. 0.05)' },
          max_daily: { type: 'number', description: 'Optional daily USDC cap' },
          max_monthly: { type: 'number', description: 'Optional monthly USDC cap' },
          auto_settle: { type: 'boolean', description: 'Auto-approve payouts under threshold' },
          auto_settle_threshold: { type: 'number', description: 'Max amount for auto-settlement' },
          settlement_mode: { type: 'string', enum: ['manual', 'instant', 'batched'], description: 'How payouts settle: manual (owner approves), instant (pay on every task), or batched (nanopayments — accumulate then settle when batch_threshold is reached)' },
          batch_threshold: { type: 'number', description: 'For batched mode: settle once pending reaches this USDC amount (e.g. 1.00)' },
        },
        required: ['agent_name', 'task_type', 'rate'],

      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'agent_activity',
      description: 'Show all AI agent activity — pending work, completed tasks, and pending payouts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'approve_payouts',
      description: 'Approve and settle all pending agent payouts. Optionally filter by agent name.',
      parameters: {
        type: 'object',
        properties: {
          agent_name: { type: 'string', description: 'Optional: approve only this agent. Leave empty for all.' },
        },
        required: [],
      },
    },
  },
]

// ── Address validation ──
function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

// ── Internal Fetch Helper ──
async function internalFetch(host: string, path: string, method: string, body?: any) {
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}${path}`
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
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

// ── Tool execution ──
async function executeTool(name: string, args: any, walletAddress: string, host: string): Promise<string> {
  try {
    switch (name) {
      case 'create_vault': {
        const res = await internalFetch(host, '/api/payroll/wallet', 'POST', {
          owner_address: walletAddress,
          company_name: args.company_name || 'My Company',
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify({
          status: 'Vault ready',
          vault_address: res.vault_address,
          chain: res.vault_chain || 'ARC-TESTNET',
          chain_id: 5042002,
          company: res.name,
          faucet: 'https://faucet.circle.com',
        })
      }

      case 'fund_vault': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found. Create one first with create_vault.'
        return JSON.stringify({
          vault_address: company.vault_address,
          chain: 'ARC-TESTNET',
          steps: [
            '1. Go to https://faucet.circle.com',
            '2. Select Arc Testnet',
            `3. Paste vault address: ${company.vault_address}`,
            '4. Request testnet USDC (free)',
          ],
          note: 'Arc uses USDC for gas — no ETH needed',
        })
      }

      case 'check_balance': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found. Create one first with create_vault.'
        const res = await internalFetch(host, `/api/payroll/balance?company_id=${company.id}`, 'GET')
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify({
          balance: `${res.balance || '0'} USDC`,
          vault_address: company.vault_address,
          chain: company.vault_chain,
        })
      }

      case 'add_contractor': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found. Create one first.'
        if (!args.wallet_address || !isValidEVMAddress(args.wallet_address)) {
          return `Invalid address: "${args.wallet_address || 'none'}". Must be 0x + 40 hex chars.`
        }
        if (args.amount_usdc <= 0) return 'Amount must be > 0 USDC.'
        // Preserve the user-specified pay frequency for human employees.
        // Default to monthly ONLY when unspecified — never silently convert.
        const payFrequency = normalizePayFrequency(args.pay_frequency)
        const { data, error } = await supabase.from('payroll_contractors').insert({
          company_id: company.id,
          name: args.name,
          wallet_address: args.wallet_address.toLowerCase(),
          amount_usdc: args.amount_usdc,
          pay_frequency: payFrequency,
          chain_id: 5042002,
          role: args.role || 'Contractor',
          status: 'active',
        }).select().single()
        if (error) return `Error: ${error.message}`
        const freqLabel: Record<string, string> = { weekly: '/week', biweekly: '/2 weeks', monthly: '/month' }
        return JSON.stringify({
          status: 'Added',
          name: data.name,
          wallet: data.wallet_address,
          amount: `$${data.amount_usdc} USDC${freqLabel[data.pay_frequency] || '/month'}`,
          pay_frequency: data.pay_frequency,
          role: data.role,
        })
      }

      case 'list_contractors': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found. Create one first.'
        const { data } = await supabase.from('payroll_contractors')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true })
        if (!data?.length) return 'No contractors on roster yet.'
        return JSON.stringify(data.map((c: any) => ({
          name: c.name, wallet: c.wallet_address,
          amount: `$${c.amount_usdc}`, pay_frequency: c.pay_frequency || 'monthly',
          role: c.role, status: c.status,
        })))
      }

      case 'remove_contractor': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const { data: found } = await supabase.from('payroll_contractors')
          .select('id, name').eq('company_id', company.id).ilike('name', `%${args.name}%`)
        if (!found?.length) return `No contractor matching "${args.name}"`
        await supabase.from('payroll_contractors').delete().eq('id', found[0].id)
        return JSON.stringify({ status: 'Removed', name: found[0].name })
      }

      case 'pay_contractor': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const { data: found } = await supabase.from('payroll_contractors')
          .select('id, name').eq('company_id', company.id).ilike('name', `%${args.name}%`)
        if (!found?.length) return `No contractor matching "${args.name}"`
        const res = await internalFetch(host, '/api/payroll/transfer', 'POST', {
          company_id: company.id,
          contractor_ids: [found[0].id],
        })
        if (res.error) return `Payment error: ${res.error}`
        return JSON.stringify({
          status: 'Payment sent',
          contractor: found[0].name,
          results: res.results,
          explorer: `https://testnet.arcscan.app`,
        })
      }

      case 'pay_all': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const { data: all } = await supabase.from('payroll_contractors')
          .select('id').eq('company_id', company.id).eq('status', 'active')
        if (!all?.length) return 'No active contractors to pay.'
        const res = await internalFetch(host, '/api/payroll/transfer', 'POST', {
          company_id: company.id,
          contractor_ids: all.map((c: any) => c.id),
        })
        if (res.error) return `Payment error: ${res.error}`
        return JSON.stringify({
          status: 'Payroll complete',
          results: res.results,
          explorer: `https://testnet.arcscan.app`,
        })
      }

      case 'get_history': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const { data } = await supabase.from('payroll_payments')
          .select('*').eq('company_id', company.id)
          .order('created_at', { ascending: false }).limit(20)
        if (!data?.length) return 'No payment history yet.'
        return JSON.stringify(data.map((p: any) => ({
          contractor: p.contractor_name, amount: `$${p.amount}`,
          status: p.status, date: new Date(p.created_at).toLocaleDateString(),
          tx: p.tx_hash || 'pending',
        })))
      }

      case 'generate_invite': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const token = crypto.randomUUID().slice(0, 8)
        const { error } = await supabase.from('payroll_invites').insert({
          company_id: company.id, token,
          role: args.role, amount_usdc: args.amount_usdc,
          chain_id: 5042002, status: 'pending',
        })
        if (error) return `Error: ${error.message}`
        return JSON.stringify({ invite_link: `https://lumma.xyz/join/${token}`, role: args.role, amount: `$${args.amount_usdc}` })
      }

      case 'set_schedule': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const freq = args.frequency || 'manual'
        const payDay = args.pay_day || null

        // Calculate next pay date
        let nextPayDate: string | null = null
        if (freq !== 'manual') {
          const now = new Date()
          if (freq === 'monthly') {
            const day = payDay || 1
            const next = new Date(now.getFullYear(), now.getMonth(), day)
            if (next <= now) next.setMonth(next.getMonth() + 1)
            nextPayDate = next.toISOString()
          } else if (freq === 'weekly' || freq === 'biweekly') {
            const targetDay = payDay || 1 // default Monday
            const daysUntil = ((targetDay - now.getDay()) + 7) % 7 || 7
            const next = new Date(now)
            next.setDate(now.getDate() + daysUntil)
            nextPayDate = next.toISOString()
          }
        }

        const { error } = await supabase.from('payroll_companies').update({
          pay_schedule: freq,
          pay_frequency: freq,
          pay_day: payDay,
          next_pay_date: nextPayDate,
        }).eq('id', company.id)

        if (error) return `Error: ${error.message}`

        const dayLabel = freq === 'monthly'
          ? `on day ${payDay || 1} of each month`
          : freq === 'weekly' || freq === 'biweekly'
          ? `on ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][payDay || 1]}s`
          : ''

        return JSON.stringify({
          status: 'Schedule updated',
          frequency: freq,
          next_pay_date: nextPayDate,
          message: freq === 'manual'
            ? 'Payroll set to manual. Use "pay all" to run payroll.'
            : `Payroll set to ${freq} ${dayLabel}. Next run: ${nextPayDate ? new Date(nextPayDate).toLocaleDateString() : 'TBD'}`,
        })
      }

      // ── Agent management handlers ──

      case 'link_agent': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found. Create one first.'
        const res = await internalFetch(host, '/api/payroll/agent?action=create', 'POST', {
          company_id: company.id,
          name: args.name,
          agent_type: args.agent_type || 'generic',
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify({
          status: 'Agent slot created',
          name: args.name,
          linking_code: res.linking_code,
          skill_url: 'https://lumma.xyz/skills/lumma.md',
          setup_steps: [
            `1. Give your AI agent the Lumma Payroll Skill: https://lumma.xyz/skills/lumma.md (paste the link, or save it as a skill/instructions file the agent can read).`,
            `2. Give the agent this one-time linking code: ${res.linking_code}`,
            `3. The agent links itself by calling POST https://lumma.xyz/api/payroll/agent?action=link with the code AND its own USDC wallet address — that wallet is where its pay is sent. It then reports completed work to earn USDC.`,
            `4. Set a payment rule for "${args.name}" (e.g. $0.05 per task) so its work is priced.`,
          ],

          note: 'Always present BOTH the skill file link AND the linking code to the user — the agent needs the skill instructions, not just the code.',
        })
      }


      case 'list_agents': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const { data: agents } = await supabase.from('payroll_agents')
          .select('*').eq('company_id', company.id)
          .order('created_at', { ascending: false })
        if (!agents?.length) return 'No agents linked yet. Use "link agent" to create one.'
        return JSON.stringify(agents.map((a: any) => ({
          name: a.name,
          type: a.agent_type,
          status: a.status,
          total_tasks: a.total_tasks,
          total_earned: `$${Number(a.total_earned).toFixed(2)}`,
          linking_code: a.linking_code || null,
        })))
      }

      case 'set_agent_rule': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'

        // ── Validate & build the rule row up front ──
        // buildRuleRow rejects zero/negative/malformed/over-limit amounts and
        // returns the exact offending field, so we NEVER send unsupported data
        // to the database (and never blindly retry the same bad payload).
        let built
        try {
          built = buildRuleRow(company.id, '', args) // agent_id filled in after lookup
        } catch (e: any) {
          const field = e?.field || 'rate'
          // Clear, actionable message for the owner. No retry.
          return `Invalid ${field}: ${e.message}`
        }

        // Find agent by name (after validation so we fail fast on bad input)
        const { data: agents } = await supabase.from('payroll_agents')
          .select('id, name').eq('company_id', company.id)
          .ilike('name', `%${args.agent_name}%`)
        if (!agents?.length) return `No agent matching "${args.agent_name}"`
        const agentId = agents[0].id

        const ruleRow = { ...built.row, agent_id: agentId }

        // Single, correct write. The unique index (company_id, agent_id,
        // task_type) makes this an update-if-exists, insert-if-not. We do NOT
        // retry with a mutated payload — a failure is surfaced honestly.
        const { data: saved, error } = await supabase
          .from('payroll_rules')
          .upsert(ruleRow, {
            onConflict: 'company_id,agent_id,task_type',
            ignoreDuplicates: false,
          })
          .select()
          .single()

        if (error || !saved) {
          // Log the raw DB/validation error safely (server-side only).
          console.error('set_agent_rule write failed:', {
            company_id: company.id,
            agent_id: agentId,
            task_type: args.task_type,
            code: error?.code,
            message: error?.message,
          })
          // Do NOT claim the rule was created. Give a clear, non-leaky message.
          return `Error: could not save the payment rule (${error?.message || 'database write did not return a row'}). No rule was created — please check the rate and try again.`
        }

        // Only report success once the DB write actually succeeded.
        return JSON.stringify({
          status: 'Rule saved',
          agent: agents[0].name,
          task_type: saved.task_type,
          rate: `${formatBaseUnits(built.rateBase)} USDC per task`,
          max_daily: built.maxDailyBase != null ? `${formatBaseUnits(built.maxDailyBase)} USDC/day` : 'unlimited',
          max_monthly: built.maxMonthlyBase != null ? `${formatBaseUnits(built.maxMonthlyBase)} USDC/month` : 'unlimited',
          settlement_mode: built.settlementMode,
          batch_threshold: built.settlementMode === 'batched'
            ? `${formatBaseUnits(built.batchThresholdBase)} USDC`
            : 'n/a',
          auto_settle: saved.auto_settle,
        })
      }

      case 'agent_activity': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'
        const res = await internalFetch(host, `/api/payroll/agent?action=activity&company_id=${company.id}`, 'GET')
        if (res.error) return `Error: ${res.error}`
        if (!res.agents?.length) return 'No agents linked yet.'
        return JSON.stringify({
          agents: res.agents,
          pending_total: `$${res.pending_total} USDC`,
        })
      }

      case 'approve_payouts': {
        const company = await getCompany(walletAddress)
        if (!company) return 'No vault found.'

        let agentId = null
        if (args.agent_name) {
          const { data: agents } = await supabase.from('payroll_agents')
            .select('id').eq('company_id', company.id)
            .ilike('name', `%${args.agent_name}%`)
          if (agents?.length) agentId = agents[0].id
        }

        const res = await internalFetch(host, '/api/payroll/agent?action=approve', 'POST', {
          company_id: company.id,
          agent_id: agentId,
        })
        if (res.error) return `Error: ${res.error}`
        return JSON.stringify(res)
      }

      default:
        return `Unknown tool: ${name}`
    }
  } catch (err: any) {
    return `Tool error: ${err.message}`
  }
}

// ── Helpers ──
async function getCompany(walletAddress: string) {
  const { data } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('owner_address', walletAddress.toLowerCase())
    .single()
  return data
}

// ── Call OpenRouter (following create-agent skill) ──
async function callOpenRouter(messages: any[], useTools: boolean = true) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const body: any = {
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  }

  // Only include tools on the initial call, not the follow-up
  if (useTools) {
    body.tools = TOOLS
    body.tool_choice = 'auto'
  }

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
    console.error('OpenRouter HTTP error:', response.status, errText)
    throw new Error(`OpenRouter returned ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json()

  if (data.error) {
    console.error('OpenRouter API error:', data.error)
    throw new Error(data.error.message || 'OpenRouter API error')
  }

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

  // Conversation history. Prefer what the client sends (reliable, in-session memory);
  // fall back to the persisted agent_messages table if the client didn't supply any.
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

  // Save user message (best effort, for audit/persistence)
  try {
    await supabase.from('agent_messages').insert({
      session_id: sessionId, role: 'user', content: message,
    })
  } catch {}

  // Build messages — always include system + history + current user message
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]


  try {
    // Step 1: Call OpenRouter with tools
    const orData = await callOpenRouter(messages)

    let assistantMessage = orData.choices?.[0]?.message
    if (!assistantMessage) {
      return res.status(502).json({ error: 'No response from AI' })
    }

    // Step 2: Handle tool calls (agentic loop)
    if (assistantMessage.tool_calls?.length) {
      const toolResults = []
      for (const tc of assistantMessage.tool_calls) {
        const fnName = tc.function.name
        let fnArgs = {}
        try { fnArgs = JSON.parse(tc.function.arguments || '{}') } catch {}

        const result = await executeTool(fnName, fnArgs, walletAddress, host)
        toolResults.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        })
      }

      // Step 3: Send tool results back for final response (no tools on follow-up)
      const followUpData = await callOpenRouter([
        ...messages,
        assistantMessage,
        ...toolResults,
      ], false)

      assistantMessage = followUpData.choices?.[0]?.message
        || { role: 'assistant', content: 'Action completed.' }
    }

    const reply = assistantMessage.content || 'Done.'

    // Save assistant response (best effort)
    try {
      await supabase.from('agent_messages').insert({
        session_id: sessionId, role: 'assistant', content: reply,
      })
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
