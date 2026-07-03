/**
 * Fetch LI.FI transfer history for all Lumma users.
 *
 * Usage: node scripts/fetch-transfers.mjs
 * Output: scripts/transfers.json + summary to console
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LIFI_BASE = 'https://li.quest/v1/analytics/transfers'
const INTEGRATOR = 'lumma'
const DELAY_MS = 500 // rate limit — stay safe

// ── Read CSV and extract wallet addresses ──
const csvPath = resolve(__dirname, '../users.csv')
const csv = readFileSync(csvPath, 'utf-8')
const lines = csv.trim().split('\n')
const header = lines[0].split('\t')

// Find the "External Ethereum accounts" column
const walletCol = header.findIndex(h => h.includes('External Ethereum'))
if (walletCol === -1) {
  console.error('Could not find wallet column in CSV')
  process.exit(1)
}

const wallets = lines.slice(1)
  .map(line => {
    const cols = line.split('\t')
    return {
      userId: cols[0],
      createdAt: cols[1],
      wallet: (cols[walletCol] || '').trim(),
    }
  })
  .filter(u => u.wallet.startsWith('0x'))

console.log(`Found ${wallets.length} wallets in CSV\n`)

// ── Fetch transfers for each wallet ──
async function fetchTransfers(wallet, retries = 3) {
  const params = new URLSearchParams({
    integrator: INTEGRATOR,
    wallet,
    status: 'ALL',
  })

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${LIFI_BASE}?${params}`)
      if (!res.ok) {
        console.error(`  API error for ${wallet}: ${res.status}`)
        return []
      }
      const data = await res.json()
      return data.transfers || []
    } catch (err) {
      if (attempt < retries) {
        const wait = attempt * 1000
        process.stdout.write(`  retry ${attempt}/${retries} in ${wait}ms... `)
        await sleep(wait)
      } else {
        console.error(`  FAILED after ${retries} attempts: ${err.message}`)
        return []
      }
    }
  }
  return []
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const allResults = []
  let totalTransfers = 0
  let walletsWithTx = 0
  let totalVolumeUSD = 0

  for (let i = 0; i < wallets.length; i++) {
    const { userId, wallet, createdAt } = wallets[i]
    process.stdout.write(`[${i + 1}/${wallets.length}] ${wallet.slice(0, 10)}... `)

    const transfers = await fetchTransfers(wallet)
    totalTransfers += transfers.length

    if (transfers.length > 0) {
      walletsWithTx++
      const volume = transfers.reduce((sum, tx) => {
        return sum + parseFloat(tx.sending?.amountUSD || '0')
      }, 0)
      totalVolumeUSD += volume

      console.log(`${transfers.length} transfers ($${volume.toFixed(2)})`)
    } else {
      console.log('0 transfers')
    }

    allResults.push({
      userId,
      wallet,
      createdAt,
      transferCount: transfers.length,
      transfers: transfers.map(tx => ({
        id: tx.transactionId,
        status: tx.status,
        tool: tx.tool,
        fromChain: tx.sending?.chainId,
        toChain: tx.receiving?.chainId,
        fromToken: tx.sending?.token?.symbol,
        toToken: tx.receiving?.token?.symbol,
        fromAmount: tx.sending?.amount,
        toAmount: tx.receiving?.amount,
        amountUSD: tx.sending?.amountUSD,
        timestamp: tx.sending?.timestamp,
        txHash: tx.sending?.txHash,
        explorerLink: tx.lifiExplorerLink,
      })),
    })

    // Rate limit
    if (i < wallets.length - 1) await sleep(DELAY_MS)
  }

  // ── Write full results ──
  const outPath = resolve(__dirname, 'transfers.json')
  writeFileSync(outPath, JSON.stringify(allResults, null, 2))

  // ── Summary ──
  console.log('\n════════════════════════════════════')
  console.log('  LUMMA TRANSFER SUMMARY')
  console.log('════════════════════════════════════')
  console.log(`  Total users:              ${wallets.length}`)
  console.log(`  Users with transfers:     ${walletsWithTx}`)
  console.log(`  Total transfers:          ${totalTransfers}`)
  console.log(`  Total volume (USD):       $${totalVolumeUSD.toFixed(2)}`)
  console.log(`  Output:                   ${outPath}`)
  console.log('════════════════════════════════════\n')
}

main().catch(console.error)
