import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMultiChainBalance } from './useMultiChainBalance'
import './BalancePanel.css'

type Tab = 'holdings' | 'activity'

export default function BalancePanel() {
  const { balances, total, isLoading, isConnected, refetch } = useMultiChainBalance()
  const { address } = useAccount()
  const [tab, setTab] = useState<Tab>('holdings')
  const [holdingsOpen, setHoldingsOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 40) }, [])

  const truncAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  const totalNum = parseFloat(total)

  if (!isConnected) {
    return (
      <div className={`ub${mounted ? ' mounted' : ''}`}>
        <div className="ub-panel">
          <h2 className="ub-title">Profile</h2>
          <div className="ub-disconnected">
            <span className="ub-disc-text">Connect wallet to view portfolio</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`ub${mounted ? ' mounted' : ''}`}>
      <div className="ub-panel">
        {/* Header */}
        <h2 className="ub-title">Profile</h2>

        {/* Wallet info row */}
        <div className="ub-wallet-row">
          <div className="ub-avatar">
            <img src="/images/arclogo.jpg" alt="avatar" />
          </div>
          <div className="ub-wallet-info">
            <div className="ub-wallet-top">
              <span className="ub-connected-dot" />
              <span className="ub-connected-label">Connected</span>
              <span className="ub-wallet-addr">{truncAddr}</span>
            </div>
            <div className="ub-balance-big">
              {isLoading ? (
                <div className="ub-skel ub-skel-xl" />
              ) : (
                <span>${totalNum.toFixed(2)}</span>
              )}
            </div>
            <div className="ub-balance-change">
              <span className="ub-change-pct">+0.00%</span>
              <span className="ub-change-val">($0.00)</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ub-tabs">
          <button
            className={`ub-tab${tab === 'holdings' ? ' active' : ''}`}
            onClick={() => setTab('holdings')}
          >
            Holdings
          </button>
          <button
            className={`ub-tab${tab === 'activity' ? ' active' : ''}`}
            onClick={() => setTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Holdings section */}
        {tab === 'holdings' && (
          <div className="ub-holdings">
            <button
              className="ub-holdings-header"
              onClick={() => setHoldingsOpen(!holdingsOpen)}
            >
              <span className="ub-holdings-title">Holdings</span>
              <svg
                className={`ub-holdings-arrow${holdingsOpen ? ' open' : ''}`}
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {holdingsOpen && (
              <div className="ub-holdings-list">
                {balances.map((c, i) => {
                  const bal = parseFloat(c.balance)
                  const hasBalance = bal > 0
                  return (
                    <div
                      key={c.chainId}
                      className={`ub-holding-row${hasBalance ? '' : ' empty'}`}
                      style={{
                        animationDelay: `${i * 40}ms`,
                      }}
                    >
                      <div className="ub-holding-left">
                        <div className="ub-holding-icon">
                          <img src={c.icon} alt={c.shortName} />
                        </div>
                        <div className="ub-holding-meta">
                          <span className="ub-holding-name">{c.token}</span>
                          <span className="ub-holding-chain">{c.shortName}</span>
                        </div>
                      </div>
                      <div className="ub-holding-right">
                        {c.isLoading ? (
                          <div className="ub-skel" />
                        ) : (
                          <>
                            <span className={`ub-holding-val${hasBalance ? '' : ' zero'}`}>
                              ${bal.toFixed(2)}
                            </span>
                            <span className={`ub-holding-qty${hasBalance ? '' : ' zero'}`}>
                              {bal.toFixed(2)} {c.token}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div className="ub-activity-empty">
            <span>No recent activity</span>
          </div>
        )}

        {/* Refresh footer */}
        <button className="ub-refresh" onClick={() => refetch()} type="button">
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <path d="M11.5 6.5A5 5 0 1 1 6.5 1.5c1.55 0 2.95.72 3.88 1.85" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M10.5 1.5L11.2 4.6l-3.1-.35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>
  )
}
