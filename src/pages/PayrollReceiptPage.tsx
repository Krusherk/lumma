import { useState, useEffect } from 'react'
import './PayrollReceiptPage.css'

interface Receipt {
  id: string
  company_name: string
  contractor_name: string
  contractor_wallet: string
  vault_address: string
  amount: number
  chain: string
  chain_id: number
  tx_hash: string | null
  circle_tx_id: string | null
  status: string
  created_at: string
}

const EXPLORER = 'https://testnet.arcscan.app'

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}···${addr.slice(-4)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function PayrollReceiptPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  // Extract receipt ID from URL path
  const receiptId = window.location.pathname.replace(/^\//, '')

  useEffect(() => {
    if (!receiptId) {
      setError('No receipt ID provided')
      setLoading(false)
      return
    }

    const apiBase = window.location.hostname.includes('localhost')
      ? ''
      : 'https://api.lumma.xyz'
    const receiptPath = apiBase
      ? `${apiBase}/payroll/receipt?id=${receiptId}`
      : `/api/payroll/receipt?id=${receiptId}`

    fetch(receiptPath)
      .then(r => r.json())
      .then(data => {
        if (data.receipt) setReceipt(data.receipt)
        else setError(data.error || 'Receipt not found')
      })
      .catch(() => setError('Failed to load receipt'))
      .finally(() => setLoading(false))
  }, [receiptId])

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="receipt-page">
        <ReceiptHeader />
        <div className="receipt-loading">
          <div className="receipt-spinner" />
          Loading receipt…
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error || !receipt) {
    return (
      <div className="receipt-page">
        <ReceiptHeader />
        <div className="receipt-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d92d20" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2>Receipt not found</h2>
          <p>{error || 'This receipt may have expired or doesn\'t exist.'}</p>
        </div>
      </div>
    )
  }

  const date = new Date(receipt.created_at)

  return (
    <div className="receipt-page">
      <ReceiptHeader />

      {/* ── Main Receipt Card ── */}
      <div className="receipt-card">
        {/* Amount hero */}
        <div className="receipt-amount-section">
          <div className="receipt-amount-label">Payment Amount</div>
          <div className="receipt-amount">
            ${Number(receipt.amount).toFixed(2)}
            <span className="receipt-amount-currency">USDC</span>
          </div>
          <div className="receipt-status-row">
            <span className={`receipt-status ${receipt.status}`}>
              {receipt.status === 'confirmed' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {receipt.status === 'pending' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              )}
              {receipt.status === 'failed' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
              {receipt.status === 'confirmed' ? 'Completed' : receipt.status === 'pending' ? 'Pending' : 'Failed'}
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <div className="receipt-details">
          {/* Receipt ID */}
          <div className="receipt-row">
            <span className="receipt-label">Receipt</span>
            <span className="receipt-value receipt-mono">
              {receipt.id}
              <button className="receipt-copy-btn" onClick={() => handleCopy(receipt.id, 'id')}>
                {copied === 'id' ? '✓ Copied' : 'Copy'}
              </button>
            </span>
          </div>

          {/* From */}
          <div className="receipt-row">
            <span className="receipt-label">From</span>
            <div className="receipt-address-block">
              <span className="receipt-address-name">{receipt.company_name}</span>
              <span className="receipt-address-hash">
                <span className="receipt-mono">{truncate(receipt.vault_address)}</span>
                <button className="receipt-copy-btn" onClick={() => handleCopy(receipt.vault_address, 'from')}>
                  {copied === 'from' ? '✓' : 'Copy'}
                </button>
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="receipt-arrow-row">
            <div className="receipt-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
          </div>

          {/* To */}
          <div className="receipt-row">
            <span className="receipt-label">To</span>
            <div className="receipt-address-block">
              <span className="receipt-address-name">{receipt.contractor_name}</span>
              <span className="receipt-address-hash">
                <span className="receipt-mono">{truncate(receipt.contractor_wallet)}</span>
                <button className="receipt-copy-btn" onClick={() => handleCopy(receipt.contractor_wallet, 'to')}>
                  {copied === 'to' ? '✓' : 'Copy'}
                </button>
              </span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Network */}
          <div className="receipt-row">
            <span className="receipt-label">Network</span>
            <span className="receipt-value">
              {receipt.chain}
              <span style={{ color: '#85858a', fontWeight: 500, marginLeft: 6, fontSize: '.76rem' }}>
                ({receipt.chain_id})
              </span>
            </span>
          </div>

          {/* Tx Hash */}
          {receipt.tx_hash && (
            <div className="receipt-row">
              <span className="receipt-label">Tx Hash</span>
              <span className="receipt-value">
                <span className="receipt-address-hash">
                  <a href={`${EXPLORER}/tx/${receipt.tx_hash}`} target="_blank" rel="noopener noreferrer" className="receipt-mono">
                    {truncate(receipt.tx_hash)}
                  </a>
                  <button className="receipt-copy-btn" onClick={() => handleCopy(receipt.tx_hash!, 'tx')}>
                    {copied === 'tx' ? '✓' : 'Copy'}
                  </button>
                </span>
              </span>
            </div>
          )}

          {/* Circle ID */}
          {receipt.circle_tx_id && (
            <div className="receipt-row">
              <span className="receipt-label">Circle ID</span>
              <span className="receipt-value receipt-mono">{truncate(receipt.circle_tx_id)}</span>
            </div>
          )}

          {/* Date */}
          <div className="receipt-row">
            <span className="receipt-label">Date</span>
            <span className="receipt-value">
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span style={{ color: '#85858a', fontWeight: 500, marginLeft: 6, fontSize: '.76rem' }}>
                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="receipt-actions">
        {receipt.tx_hash && (
          <div className="receipt-action-col">
            <a
              href={`${EXPLORER}/tx/${receipt.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="receipt-btn-primary"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <span className="receipt-btn-label">Explorer</span>
          </div>
        )}

        <div className="receipt-action-col">
          <button
            className="receipt-btn-secondary"
            onClick={() => handleCopy(window.location.href, 'link')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <span className="receipt-btn-label">{copied === 'link' ? 'Copied!' : 'Copy Link'}</span>
        </div>

        <div className="receipt-action-col">
          <button
            className="receipt-btn-secondary"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Lumma Receipt ${receipt.id}`, url: window.location.href })
              } else {
                handleCopy(window.location.href, 'share')
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          <span className="receipt-btn-label">{copied === 'share' ? 'Copied!' : 'Share'}</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="receipt-footer">
        <div className="receipt-footer-brand">
          Powered by <span>Lumma</span> × <span>Circle</span>
        </div>
        <p className="receipt-footer-note">
          This is a verifiable payment receipt on {receipt.chain}. Transaction data is publicly available on the blockchain explorer.
        </p>
      </div>
    </div>
  )
}

/* ── Shared Header Component ── */
function ReceiptHeader() {
  return (
    <div className="receipt-header">
      <a href="https://lumma.xyz" className="receipt-logo">
        <img src="/images/lumma.svg" alt="Lumma" />
        Lumma
        <span className="receipt-logo-tag">Payroll</span>
      </a>
    </div>
  )
}
