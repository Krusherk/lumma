/**
 * TransferHistory — shows the user's LI.FI transfer history.
 * Fetches from LI.FI Analytics API filtered by integrator=lumma.
 */
import { useAccount } from 'wagmi'
import { useLiFiTransfers, type LiFiTransfer } from '../../hooks/useLiFiTransfers'
import './TransferHistory.css'

const CHAIN_META: Record<number, { name: string; logo: string }> = {
  5042002: { name: 'Arc', logo: '/images/arclogo.jpg' },
  11155111: { name: 'Sepolia', logo: '/images/eth.jpg' },
  84532: { name: 'Base', logo: '/images/base.jpg' },
  421614: { name: 'Arbitrum', logo: '/images/arbitrum.jpg' },
  11155420: { name: 'OP', logo: '/images/eth.jpg' },
}

function chainLabel(chainId: number) {
  return CHAIN_META[chainId]?.name || `Chain ${chainId}`
}

function chainLogo(chainId: number) {
  return CHAIN_META[chainId]?.logo || '/images/eth.jpg'
}

function formatAmount(amount: string | undefined, decimals: number | undefined) {
  if (!amount) return '0.00'
  const dec = decimals ?? 18
  const val = Number(amount) / Math.pow(10, dec)
  if (isNaN(val)) return '0.00'
  return val < 0.01 ? val.toFixed(6) : val.toFixed(2)
}

function formatTime(ts: number | undefined) {
  if (!ts) return 'Unknown time'
  const d = new Date(ts * 1000)
  const now = Date.now()
  const diff = now - d.getTime()

  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusBadge({ status }: { status: string | undefined }) {
  const s = status || 'PENDING'
  const cls = s === 'DONE' ? 'done' : s === 'PENDING' ? 'pending' : 'failed'
  return <span className={`th-status ${cls}`}>{s}</span>
}

function TransferRow({ tx }: { tx: LiFiTransfer }) {
  const sendChainId = tx.sending?.chainId
  const recvChainId = tx.receiving?.chainId
  const isCrossChain = !!(sendChainId && recvChainId && sendChainId !== recvChainId)

  return (
    <a
      href={tx.lifiExplorerLink || '#'}
      target={tx.lifiExplorerLink ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="th-row"
    >
      <div className="th-row-chains">
        {sendChainId && <img src={chainLogo(sendChainId)} alt="" className="th-chain-logo" />}
        {isCrossChain && recvChainId && (
          <>
            <svg className="th-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <img src={chainLogo(recvChainId)} alt="" className="th-chain-logo" />
          </>
        )}
      </div>

      <div className="th-row-detail">
        <div className="th-row-tokens">
          <span className="th-token-amt">
            {formatAmount(tx.sending?.amount, tx.sending?.token?.decimals)} {tx.sending?.token?.symbol || 'USDC'}
          </span>
          {isCrossChain && (
            <>
              <span className="th-token-arrow">→</span>
              <span className="th-token-amt">
                {formatAmount(tx.receiving?.amount, tx.receiving?.token?.decimals)} {tx.receiving?.token?.symbol || 'USDC'}
              </span>
            </>
          )}
        </div>
        <div className="th-row-meta">
          <span>
            {sendChainId ? chainLabel(sendChainId) : 'Unknown'}
            {isCrossChain && recvChainId ? ` → ${chainLabel(recvChainId)}` : ' swap'}
          </span>
          <span className="th-dot">·</span>
          <span>{formatTime(tx.sending?.timestamp)}</span>
        </div>
      </div>

      <div className="th-row-right">
        <span className="th-usd">${tx.sending?.amountUSD || '—'}</span>
        <StatusBadge status={tx.status} />
      </div>
    </a>
  )
}

export default function TransferHistory() {
  const { address } = useAccount()
  const { transfers, loading, error } = useLiFiTransfers({
    wallet: address,
    status: 'ALL',
  })

  if (!address) {
    return (
      <div className="th-empty">
        <p>Connect your wallet to see transfer history.</p>
      </div>
    )
  }

  return (
    <div className="th">
      <div className="th-header">
        <h3>Transfer History</h3>
        <span className="th-count">{transfers.length} transfers</span>
      </div>

      {loading && (
        <div className="th-loading">
          <div className="th-spinner" />
          <span>Loading transfers...</span>
        </div>
      )}

      {error && (
        <div className="th-error">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && transfers.length === 0 && (
        <div className="th-empty">
          <p>No transfers yet. Make a swap or bridge to see your history here.</p>
        </div>
      )}

      {!loading && transfers.length > 0 && (
        <div className="th-list">
          {transfers.map(tx => (
            <TransferRow key={tx.transactionId} tx={tx} />
          ))}
        </div>
      )}
    </div>
  )
}
