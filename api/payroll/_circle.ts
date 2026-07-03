/**
 * Shared Circle Developer-Controlled Wallets client.
 *
 * Uses the official @circle-fin/developer-controlled-wallets SDK.
 * All wallet creation, balance, and transfer operations go through this module.
 *
 * Required env vars:
 *   CIRCLE_API_KEY   – Circle API key (TEST_ prefix = sandbox)
 *   ENTITY_SECRET    – 32-byte hex entity secret registered with Circle
 */
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

// ── Config ──
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || ''
const ENTITY_SECRET = process.env.ENTITY_SECRET || ''

if (!CIRCLE_API_KEY) {
  console.warn('[circle] CIRCLE_API_KEY is not set — wallet operations will fail')
}
if (!ENTITY_SECRET) {
  console.warn('[circle] ENTITY_SECRET is not set — wallet operations will fail')
}

// ── SDK Client (singleton) ──
// The SDK handles entitySecretCiphertext generation automatically per request.
const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: CIRCLE_API_KEY,
  entitySecret: ENTITY_SECRET,
})

// ── USDC token addresses per chain ──
export const USDC_CONTRACTS: Record<string, string> = {
  'BASE-SEPOLIA': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'ETH-SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'ARB-SEPOLIA': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'OP-SEPOLIA': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  'ARC-TESTNET': '0x3600000000000000000000000000000000000000',
}

// ── Chain ID ↔ Circle chain name ──
export const CHAIN_MAP: Record<number, string> = {
  84532: 'BASE-SEPOLIA',
  11155111: 'ETH-SEPOLIA',
  421614: 'ARB-SEPOLIA',
  11155420: 'OP-SEPOLIA',
  5042002: 'ARC-TESTNET',
}

export const CHAIN_ID_MAP: Record<string, number> = {
  'BASE-SEPOLIA': 84532,
  'ETH-SEPOLIA': 11155111,
  'ARB-SEPOLIA': 421614,
  'OP-SEPOLIA': 11155420,
  'ARC-TESTNET': 5042002,
}

// ── RPC endpoints for on-chain fallback ──
const RPC_URLS: Record<number, string> = {
  5042002: 'https://rpc.testnet.arc.network',
  84532: 'https://sepolia.base.org',
  11155111: 'https://rpc.ankr.com/eth_sepolia',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  11155420: 'https://sepolia.optimism.io',
}

// ────────────────────────────────────────────────────────
// Wallet Operations
// ────────────────────────────────────────────────────────

/**
 * Create a new wallet set + wallet for a user.
 * Returns { walletId, walletAddress, blockchain } or throws.
 */
export async function createVaultWallet(ownerAddress: string) {
  // Diagnostic: log which env vars are present (masked for security)
  const hasApiKey = !!process.env.CIRCLE_API_KEY
  const hasSecret = !!process.env.ENTITY_SECRET
  console.log(`[circle] createVaultWallet called. API_KEY set: ${hasApiKey}, ENTITY_SECRET set: ${hasSecret}`)
  if (hasApiKey) console.log(`[circle] API_KEY prefix: ${process.env.CIRCLE_API_KEY!.slice(0, 12)}...`)

  if (!hasApiKey || !hasSecret) {
    throw new Error(
      `CIRCLE_API_KEY (${hasApiKey ? 'SET' : 'MISSING'}) and ENTITY_SECRET (${hasSecret ? 'SET' : 'MISSING'}) must both be configured. ` +
      'Set them in Vercel Dashboard → Settings → Environment Variables.'
    )
  }

  // 1. Create wallet set scoped to this user
  const wsResp = await circleClient.createWalletSet({
    name: `lumma-vault-${ownerAddress.slice(0, 10)}`,
  })
  const walletSetId = wsResp.data?.walletSet?.id
  if (!walletSetId) {
    throw new Error(`WalletSet creation failed: ${JSON.stringify(wsResp)}`)
  }

  // 2. Create a single wallet on ARC-TESTNET inside the set
  // Note: ARC-TESTNET is supported by Circle's API but the SDK types
  // haven't been updated yet — cast to satisfy TypeScript.
  const wResp = await circleClient.createWallets({
    walletSetId,
    blockchains: ['ARC-TESTNET' as any],
    count: 1,
  })
  const wallet = wResp.data?.wallets?.[0]
  if (!wallet) {
    throw new Error(`Wallet creation failed: ${JSON.stringify(wResp)}`)
  }

  return {
    walletId: wallet.id,
    walletAddress: wallet.address,
    blockchain: wallet.blockchain || 'ARC-TESTNET',
  }
}

// ────────────────────────────────────────────────────────
// Balance Operations
// ────────────────────────────────────────────────────────

/**
 * Get USDC balance for a Circle-managed wallet via the SDK.
 */
export async function getCircleWalletBalance(walletId: string): Promise<string> {
  try {
    const resp = await circleClient.getWalletTokenBalance({ id: walletId })
    const balances = resp.data?.tokenBalances || []
    const usdc = balances.find((t: any) => t.token?.symbol === 'USDC')
    return usdc?.amount || '0'
  } catch (err) {
    console.error('[circle] SDK balance fetch failed:', err)
    return '0'
  }
}

/**
 * Get USDC balance directly from on-chain RPC (for any address).
 */
export async function getOnChainUSDCBalance(address: string, chainId: number): Promise<string> {
  const rpcUrl = RPC_URLS[chainId] || RPC_URLS[5042002]
  const usdcContract = USDC_CONTRACTS[CHAIN_MAP[chainId] || 'ARC-TESTNET']

  const cleanAddr = address.toLowerCase().replace('0x', '').padStart(64, '0')
  const calldata = `0x70a08231${cleanAddr}` // balanceOf(address)

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: usdcContract, data: calldata }, 'latest'],
        id: 1,
      }),
    })
    const json = await res.json()
    if (json.result && json.result !== '0x') {
      const raw = BigInt(json.result)
      return (Number(raw) / 1_000_000).toString() // USDC = 6 decimals
    }
  } catch (err) {
    console.error('[circle] RPC balance fetch failed:', err)
  }
  return '0'
}

// ────────────────────────────────────────────────────────
// Transfer Operations
// ────────────────────────────────────────────────────────

/**
 * Transfer USDC from a Circle vault wallet to a destination address.
 * Returns the transaction object from Circle or throws.
 */
export async function transferUSDC(
  walletId: string,
  destinationAddress: string,
  amount: string,
  chain: string
) {
  if (!CIRCLE_API_KEY || !ENTITY_SECRET) {
    throw new Error('CIRCLE_API_KEY and ENTITY_SECRET must be set for transfers.')
  }

  const tokenAddress = USDC_CONTRACTS[chain]
  if (!tokenAddress) throw new Error(`Unsupported chain: ${chain}`)

  console.log(`[circle] transferUSDC: wallet=${walletId}, to=${destinationAddress}, amount=${amount}, chain=${chain}, token=${tokenAddress}`)

  // Use tokenAddress + blockchain (not tokenId which is Circle's internal UUID)
  const resp = await circleClient.createTransaction({
    walletId,
    tokenAddress,
    blockchain: chain as any,
    destinationAddress,
    amount: [amount],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  })

  const tx = resp.data
  if (!tx) {
    throw new Error(`Transfer failed: ${JSON.stringify(resp)}`)
  }

  console.log(`[circle] Transaction initiated: id=${tx.id}, state=${tx.state}`)

  // Poll for completion to get the txHash
  if (tx.id) {
    try {
      const finalTx = await pollTransaction(tx.id, 15, 2000)
      console.log(`[circle] Transaction final: state=${finalTx.state}, txHash=${finalTx.txHash}`)
      return { id: tx.id, state: finalTx.state, txHash: finalTx.txHash || null }
    } catch (err) {
      console.error('[circle] Polling failed, returning initial state:', err)
    }
  }

  return { id: tx.id, state: tx.state, txHash: null }
}

/**
 * Poll a transaction until it reaches a terminal state.
 * Terminal states: COMPLETE, FAILED, DENIED, CANCELLED
 * Returns the final transaction object.
 */
export async function pollTransaction(
  txId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<any> {
  const TERMINAL = new Set(['COMPLETE', 'FAILED', 'DENIED', 'CANCELLED'])

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await circleClient.getTransaction({ id: txId })
      const tx = resp.data?.transaction
      if (tx && TERMINAL.has(tx.state)) {
        return tx
      }
    } catch (err) {
      console.error(`[circle] Poll attempt ${i + 1} failed:`, err)
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Transaction ${txId} did not reach terminal state after ${maxAttempts} attempts`)
}
