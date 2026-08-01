/**
 * POST /api/payroll/sdk
 *
 * External-facing SDK API — "Stripe for Agents".
 *
 * Allows external platforms (agent marketplaces, developer frameworks,
 * LLM hosting platforms) to programmatically:
 *
 *   ?action=create_vault     — Provision a dedicated USDC payroll vault
 *   ?action=register_worker  — Register an AI agent or contractor with spending controls
 *   ?action=settle_task      — Execute instant USDC settlement after task completion
 *   ?action=get_balance      — Check vault balances and spending caps
 *   ?action=list_workers     — List all workers in a vault
 *   ?action=stream_config    — Configure pay-per-token streaming parameters
 *
 * Authentication: Bearer token via SDK API key (Authorization: Bearer lma_sdk_...)
 * Rate limit: 60 req/min per API key.
 *
 * All settlements are executed on Arc Testnet via Circle Developer-Controlled Wallets.
 * Gas fees are abstracted — platforms never need to manage native tokens.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { authenticateSdkKey, hasPermission } from './_sdk_auth.js'
import { supabase } from './_supabase.js'
import { createVaultWallet, transferUSDC, getCircleWalletBalance, CHAIN_ID_MAP } from './_circle.js'
import { sumBaseUnits, feeBaseUnits, formatBaseUnits, parseUsdcToBaseUnits } from './_usdc.js'

const RECEIPT_BASE_URL = 'https://payroll.lumma.xyz'

function generateReceiptId(): string {
  return `LMA-SDK-${crypto.randomBytes(4).toString('hex')}`
}

function generateLinkCode(): string {
  return `LMA-LINK-${crypto.randomBytes(4).toString('hex')}`
}

function generateAgentToken(): string {
  return `lma_at_${crypto.randomBytes(16).toString('hex')}`
}

function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Authenticate SDK key ──
  const sdkKey = await authenticateSdkKey(req)
  if (!sdkKey) {
    return res.status(401).json({
      error: 'Invalid or missing API key',
      hint: 'Provide a valid SDK API key via Authorization: Bearer lma_sdk_...',
    })
  }

  const action = (req.query.action as string || '').toLowerCase()

  try {
    switch (action) {
      case 'create_vault':
        return await handleCreateVault(req, res, sdkKey)
      case 'register_worker':
        return await handleRegisterWorker(req, res, sdkKey)
      case 'settle_task':
        return await handleSettleTask(req, res, sdkKey)
      case 'get_balance':
        return await handleGetBalance(req, res, sdkKey)
      case 'list_workers':
        return await handleListWorkers(req, res, sdkKey)
      case 'stream_config':
        return await handleStreamConfig(req, res, sdkKey)
      default:
        return res.status(400).json({
          error: `Unknown action: "${action}"`,
          validActions: [
            'create_vault',
            'register_worker',
            'settle_task',
            'get_balance',
            'list_workers',
            'stream_config',
          ],
        })
    }
  } catch (err: any) {
    console.error(`[sdk] ${action} error:`, err)
    return res.status(500).json({
      error: err.message || 'Internal server error',
    })
  }
}

// ════════════════════════════════════════════════════════════════════
// Action handlers
// ════════════════════════════════════════════════════════════════════

/**
 * CREATE_VAULT — Provision a dedicated USDC payroll vault.
 *
 * Body: { companyName, ownerWallet, fundingSource?, currency? }
 */
async function handleCreateVault(
  req: VercelRequest,
  res: VercelResponse,
  sdkKey: any,
) {
  if (!hasPermission(sdkKey, 'vaults.create')) {
    return res.status(403).json({ error: 'API key lacks vaults.create permission' })
  }

  const { companyName, ownerWallet, fundingSource, currency } = req.body || {}

  if (!ownerWallet || !isValidEVMAddress(ownerWallet)) {
    return res.status(400).json({ error: 'Valid ownerWallet (EVM address) is required' })
  }

  const name = companyName || `${sdkKey.platform_name} Vault`
  const ownerLower = ownerWallet.toLowerCase()

  // Create Circle Developer-Controlled Wallet
  const vault = await createVaultWallet(ownerWallet)

  // Insert company record
  const { data: company, error } = await supabase
    .from('payroll_companies')
    .insert({
      owner_address: ownerLower,
      name,
      vault_address: vault.walletAddress,
      vault_chain: vault.blockchain,
      vault_wallet_id: vault.walletId,
      pay_schedule: 'manual',
      sdk_key_id: sdkKey.id,
    })
    .select()
    .single()

  if (error) throw error

  return res.status(201).json({
    status: 'success',
    vaultAddress: vault.walletAddress,
    network: vault.blockchain.toLowerCase().replace('-', '-'),
    companyId: company.id,
    balances: { USDC: '0.00' },
    features: [
      'multi_vault_switching',
      'agent_nanopayments',
      'gas_abstraction',
      'spending_guardrails',
      'duplicate_prevention',
    ],
  })
}

/**
 * REGISTER_WORKER — Register an AI agent or contractor with spending controls.
 *
 * Body: {
 *   vaultAddress, agentId, payoutWallet,
 *   spendingLimits?: { maxPerTransaction, dailyCap, rollingIntervalDays },
 *   allowAutonomousHiring?: boolean
 * }
 */
async function handleRegisterWorker(
  req: VercelRequest,
  res: VercelResponse,
  sdkKey: any,
) {
  if (!hasPermission(sdkKey, 'agents.register')) {
    return res.status(403).json({ error: 'API key lacks agents.register permission' })
  }

  const {
    vaultAddress,
    agentId,
    payoutWallet,
    spendingLimits,
    allowAutonomousHiring,
  } = req.body || {}

  if (!vaultAddress || !agentId) {
    return res.status(400).json({ error: 'vaultAddress and agentId are required' })
  }

  // Find the company vault (must belong to this SDK key's owner)
  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('sdk_key_id', sdkKey.id)
    .single()

  if (!company) {
    return res.status(404).json({ error: 'Vault not found or not owned by this API key' })
  }

  // Check for duplicate agent_id in this company
  const { data: existing } = await supabase
    .from('payroll_agents')
    .select('id')
    .eq('company_id', company.id)
    .eq('agent_id', agentId)
    .single()

  if (existing) {
    return res.status(409).json({ error: 'Agent with this agentId already registered in this vault' })
  }

  // Generate linking code + agent token
  const linkCode = generateLinkCode()
  const agentToken = generateAgentToken()

  const { data: agent, error } = await supabase
    .from('payroll_agents')
    .insert({
      company_id: company.id,
      agent_id: agentId,
      link_code: linkCode,
      agent_token: agentToken,
      payout_wallet: payoutWallet ? payoutWallet.toLowerCase() : null,
      status: payoutWallet ? 'active' : 'pending',
      rate_per_task: spendingLimits?.maxPerTransaction || null,
      daily_cap: spendingLimits?.dailyCap || null,
      monthly_cap: spendingLimits?.dailyCap
        ? String(Number(spendingLimits.dailyCap) * (spendingLimits.rollingIntervalDays || 30))
        : null,
      spend_limit: allowAutonomousHiring ? spendingLimits?.dailyCap : null,
    })
    .select()
    .single()

  if (error) throw error

  return res.status(201).json({
    status: 'success',
    workerId: agent.id,
    agentId,
    vaultAddress,
    agentToken: agentToken,
    linkCode: linkCode,
    spendingLimits: {
      maxPerTransaction: spendingLimits?.maxPerTransaction || null,
      dailyCap: spendingLimits?.dailyCap || null,
      rollingIntervalDays: spendingLimits?.rollingIntervalDays || 1,
    },
    allowAutonomousHiring: !!allowAutonomousHiring,
    status: payoutWallet ? 'active' : 'pending_wallet',
  })
}

/**
 * SETTLE_TASK — Execute instant USDC payment after task completion.
 *
 * Body: {
 *   vaultAddress, payerAgentId, recipientAgentId,
 *   amount, proofOfTaskHash, metadata?
 * }
 *
 * Includes duplicate prevention via proofOfTaskHash.
 */
async function handleSettleTask(
  req: VercelRequest,
  res: VercelResponse,
  sdkKey: any,
) {
  if (!hasPermission(sdkKey, 'payments.settle')) {
    return res.status(403).json({ error: 'API key lacks payments.settle permission' })
  }

  const {
    vaultAddress,
    payerAgentId,
    recipientAgentId,
    amount,
    proofOfTaskHash,
    metadata,
  } = req.body || {}

  if (!vaultAddress || !recipientAgentId || !amount || !proofOfTaskHash) {
    return res.status(400).json({
      error: 'vaultAddress, recipientAgentId, amount, and proofOfTaskHash are required',
    })
  }

  const amountNum = Number(amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }

  // Find the vault
  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('sdk_key_id', sdkKey.id)
    .single()

  if (!company) {
    return res.status(404).json({ error: 'Vault not found or not owned by this API key' })
  }

  // ── Duplicate prevention via proofOfTaskHash ──
  const { data: existingSettlement } = await supabase
    .from('sdk_settlements')
    .select('id')
    .eq('proof_hash', proofOfTaskHash)
    .eq('company_id', company.id)
    .single()

  if (existingSettlement) {
    return res.status(409).json({
      error: 'Duplicate settlement detected',
      hint: 'A settlement with this proofOfTaskHash has already been processed.',
    })
  }

  // Find recipient agent
  const { data: recipient } = await supabase
    .from('payroll_agents')
    .select('*')
    .eq('company_id', company.id)
    .eq('agent_id', recipientAgentId)
    .eq('status', 'active')
    .single()

  if (!recipient) {
    return res.status(404).json({ error: 'Recipient agent not found or inactive' })
  }

  if (!recipient.payout_wallet) {
    return res.status(400).json({ error: 'Recipient agent has no payout wallet configured' })
  }

  // Check spending limits
  if (recipient.daily_cap) {
    const today = new Date().toISOString().slice(0, 10)
    const { data: todaySettlements } = await supabase
      .from('sdk_settlements')
      .select('amount')
      .eq('company_id', company.id)
      .eq('recipient_agent_id', recipientAgentId)
      .gte('created_at', `${today}T00:00:00Z`)

    const todayTotal = (todaySettlements || []).reduce(
      (sum: number, s: any) => sum + Number(s.amount),
      0,
    )
    if (todayTotal + amountNum > Number(recipient.daily_cap)) {
      return res.status(400).json({
        error: 'Settlement would exceed daily spending cap',
        dailyCap: recipient.daily_cap,
        usedToday: todayTotal.toFixed(6),
        remainingToday: (Number(recipient.daily_cap) - todayTotal).toFixed(6),
      })
    }
  }

  // Execute the transfer via Circle
  const receiptId = generateReceiptId()
  const chain = company.vault_chain || 'ARC-TESTNET'
  const chainId = CHAIN_ID_MAP[chain] || 5042002

  let txHash = ''
  try {
    const result = await transferUSDC(
      company.vault_wallet_id,
      recipient.payout_wallet,
      amount,
      chainId,
    )
    txHash = result.transactionHash || result.id || ''
  } catch (transferErr: any) {
    console.error('[sdk] Transfer failed:', transferErr)
    return res.status(500).json({
      error: 'USDC transfer failed',
      detail: transferErr.message,
    })
  }

  // Record settlement
  const { error: insertErr } = await supabase
    .from('sdk_settlements')
    .insert({
      company_id: company.id,
      sdk_key_id: sdkKey.id,
      payer_agent_id: payerAgentId || null,
      recipient_agent_id: recipientAgentId,
      amount: amountNum.toFixed(6),
      proof_hash: proofOfTaskHash,
      tx_hash: txHash,
      receipt_id: receiptId,
      metadata: metadata || {},
      status: 'confirmed',
    })

  if (insertErr) {
    console.error('[sdk] Settlement record insert failed:', insertErr)
  }

  // Get updated balance
  let remainingBalance = '0.00'
  try {
    const bal = await getCircleWalletBalance(company.vault_wallet_id)
    remainingBalance = bal || '0.00'
  } catch {
    // Non-critical
  }

  // Calculate remaining daily cap
  let agentRemainingDailyCap = null
  if (recipient.daily_cap) {
    const today = new Date().toISOString().slice(0, 10)
    const { data: todaySettlements } = await supabase
      .from('sdk_settlements')
      .select('amount')
      .eq('company_id', company.id)
      .eq('recipient_agent_id', recipientAgentId)
      .gte('created_at', `${today}T00:00:00Z`)

    const todayTotal = (todaySettlements || []).reduce(
      (sum: number, s: any) => sum + Number(s.amount),
      0,
    )
    agentRemainingDailyCap = (Number(recipient.daily_cap) - todayTotal).toFixed(6)
  }

  return res.status(200).json({
    settlementStatus: 'CONFIRMED',
    timestamp: Math.floor(Date.now() / 1000),
    receipt: {
      receiptId,
      txHash,
      amountPaid: amountNum.toFixed(6),
      asset: 'USDC',
      arcGasFeesPaid: '0.00',
      verificationLink: txHash
        ? `https://explorer.testnet.arc.xyz/tx/${txHash}`
        : null,
    },
    accounting: {
      remainingVaultBalance: remainingBalance,
      ...(agentRemainingDailyCap != null && { agentRemainingDailyCap }),
    },
  })
}

/**
 * GET_BALANCE — Check vault balances.
 *
 * Body/Query: { vaultAddress }
 */
async function handleGetBalance(
  req: VercelRequest,
  res: VercelResponse,
  sdkKey: any,
) {
  const vaultAddress = req.body?.vaultAddress || req.query.vaultAddress

  if (!vaultAddress) {
    return res.status(400).json({ error: 'vaultAddress is required' })
  }

  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('sdk_key_id', sdkKey.id)
    .single()

  if (!company) {
    return res.status(404).json({ error: 'Vault not found or not owned by this API key' })
  }

  let balance = '0.00'
  try {
    const bal = await getCircleWalletBalance(company.vault_wallet_id)
    balance = bal || '0.00'
  } catch {
    // fallback
  }

  // Count workers
  const { count } = await supabase
    .from('payroll_agents')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)

  // Sum total settled
  const { data: settlements } = await supabase
    .from('sdk_settlements')
    .select('amount')
    .eq('company_id', company.id)
    .eq('status', 'confirmed')

  const totalSettled = (settlements || []).reduce(
    (sum: number, s: any) => sum + Number(s.amount),
    0,
  )

  return res.status(200).json({
    vaultAddress: company.vault_address,
    network: company.vault_chain || 'ARC-TESTNET',
    balances: { USDC: balance },
    stats: {
      totalWorkers: count || 0,
      totalSettled: totalSettled.toFixed(6),
      totalSettlements: settlements?.length || 0,
    },
    companyId: company.id,
    companyName: company.name,
  })
}

/**
 * LIST_WORKERS — List all workers in a vault.
 *
 * Body/Query: { vaultAddress }
 */
async function handleListWorkers(
  req: VercelRequest,
  res: VercelResponse,
  sdkKey: any,
) {
  const vaultAddress = req.body?.vaultAddress || req.query.vaultAddress

  if (!vaultAddress) {
    return res.status(400).json({ error: 'vaultAddress is required' })
  }

  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('sdk_key_id', sdkKey.id)
    .single()

  if (!company) {
    return res.status(404).json({ error: 'Vault not found or not owned by this API key' })
  }

  const { data: agents } = await supabase
    .from('payroll_agents')
    .select('id, agent_id, payout_wallet, status, rate_per_task, daily_cap, monthly_cap, spend_limit, spend_used, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  return res.status(200).json({
    vaultAddress,
    workers: (agents || []).map(a => ({
      workerId: a.id,
      agentId: a.agent_id,
      payoutWallet: a.payout_wallet,
      status: a.status,
      spendingLimits: {
        maxPerTransaction: a.rate_per_task,
        dailyCap: a.daily_cap,
        monthlyCap: a.monthly_cap,
      },
      autonomousBudget: a.spend_limit
        ? { limit: a.spend_limit, used: a.spend_used }
        : null,
      registeredAt: a.created_at,
    })),
  })
}

/**
 * STREAM_CONFIG — Configure pay-per-token streaming parameters.
 *
 * Body: {
 *   vaultAddress, agentId,
 *   ratePerUnit, unitType, maxBudget, clampOnBudgetHit?
 * }
 *
 * This sets up the configuration for streaming nanopayments.
 * Actual streaming execution happens via the settle_task action
 * called repeatedly by the platform for each unit of work.
 */
async function handleStreamConfig(
  req: VercelRequest,
  res: VercelResponse,
  sdkKey: any,
) {
  if (!hasPermission(sdkKey, 'payments.settle')) {
    return res.status(403).json({ error: 'API key lacks payments.settle permission' })
  }

  const {
    vaultAddress,
    agentId,
    ratePerUnit,
    unitType,
    maxBudget,
    clampOnBudgetHit,
  } = req.body || {}

  if (!vaultAddress || !agentId || !ratePerUnit || !unitType || !maxBudget) {
    return res.status(400).json({
      error: 'vaultAddress, agentId, ratePerUnit, unitType, and maxBudget are required',
    })
  }

  const validUnitTypes = ['token', 'api_call', 'compute_second', 'request', 'custom']
  if (!validUnitTypes.includes(unitType)) {
    return res.status(400).json({
      error: `Invalid unitType. Must be one of: ${validUnitTypes.join(', ')}`,
    })
  }

  // Find vault + agent
  const { data: company } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('sdk_key_id', sdkKey.id)
    .single()

  if (!company) {
    return res.status(404).json({ error: 'Vault not found' })
  }

  const { data: agent } = await supabase
    .from('payroll_agents')
    .select('*')
    .eq('company_id', company.id)
    .eq('agent_id', agentId)
    .single()

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found in this vault' })
  }

  // Upsert streaming config in sdk_stream_configs
  const { data: config, error } = await supabase
    .from('sdk_stream_configs')
    .upsert(
      {
        company_id: company.id,
        agent_id: agentId,
        sdk_key_id: sdkKey.id,
        rate_per_unit: ratePerUnit,
        unit_type: unitType,
        max_budget: maxBudget,
        clamp_on_budget_hit: clampOnBudgetHit !== false,
        total_units_consumed: 0,
        total_amount_streamed: '0.000000',
        status: 'active',
      },
      { onConflict: 'company_id,agent_id' },
    )
    .select()
    .single()

  if (error) throw error

  return res.status(200).json({
    status: 'success',
    streamConfig: {
      agentId,
      vaultAddress,
      ratePerUnit,
      unitType,
      maxBudget,
      clampOnBudgetHit: clampOnBudgetHit !== false,
      status: 'active',
    },
    hint: 'Use settle_task with matching proofOfTaskHash per unit to execute streaming payments.',
  })
}
