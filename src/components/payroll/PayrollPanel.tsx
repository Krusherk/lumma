/**
 * PayrollPanel — Agent Payroll dashboard.
 *
 * Views: Roster → Pay → History → Settings
 * All payments go through the backend Circle Agent Wallet.
 * The company's vault address is shown for USDC deposits.
 */
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { usePayroll } from '../../hooks/usePayroll'
import { SUPPORTED_CHAINS } from '../../config/chains'
import './PayrollPanel.css'

const PAYROLL_CHAINS = SUPPORTED_CHAINS.filter(c =>
  [5042002, 11155111, 84532, 421614, 11155420].includes(c.chainId)
)

function truncAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function chainName(chainId: number) {
  return PAYROLL_CHAINS.find(c => c.chainId === chainId)?.shortName || `Chain ${chainId}`
}

function chainIcon(chainId: number) {
  return PAYROLL_CHAINS.find(c => c.chainId === chainId)?.icon || ''
}

export default function PayrollPanel() {
  const { authenticated, login } = usePrivy()
  const { isConnected } = useAccount()
  const payroll = usePayroll()

  // Add contractor form state
  const [newName, setNewName] = useState('')
  const [newWallet, setNewWallet] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newChain, setNewChain] = useState(84532)
  const [showAddForm, setShowAddForm] = useState(false)

  // Pay view selected
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [invRole, setInvRole] = useState('')
  const [invAmount, setInvAmount] = useState('')
  const [invChain, setInvChain] = useState(84532)
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)
  const [copiedVault, setCopiedVault] = useState(false)

  // Settings form
  const [settingsName, setSettingsName] = useState('')
  const [settingsSchedule, setSettingsSchedule] = useState<'manual' | 'weekly' | 'biweekly' | 'monthly'>('manual')
  const [settingsDate, setSettingsDate] = useState('')

  if (!authenticated || !isConnected) {
    return (
      <div className="pr-locked">
        <div className="pr-locked-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h3>Connect to Access Payroll</h3>
        <p>Connect your wallet to set up your payroll vault and manage contractor payments.</p>
        <button className="pr-btn primary" onClick={login}>Connect Wallet</button>
      </div>
    )
  }

  if (payroll.loading) {
    return (
      <div className="pr-loading">
        <div className="pr-spinner" />
        <span>Setting up your payroll vault...</span>
      </div>
    )
  }

  /* ── Handlers ── */
  const handleAdd = async () => {
    if (!newName || !newWallet || !newAmount) return
    const ok = await payroll.addContractor(newName, newWallet, Number(newAmount), newChain, newRole || 'Contractor')
    if (ok) {
      setNewName(''); setNewWallet(''); setNewAmount(''); setNewRole('')
      setShowAddForm(false)
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    const active = payroll.contractors.filter(c => c.status === 'active')
    if (selected.size === active.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(active.map(c => c.id)))
    }
  }

  const handlePay = async () => {
    await payroll.disburse(Array.from(selected))
    setSelected(new Set())
  }

  const handleCreateInvite = async () => {
    if (!invAmount) return
    const invite = await payroll.createInvite(invRole || 'Contractor', Number(invAmount), invChain)
    if (invite) {
      setShowInviteForm(false)
      setInvRole(''); setInvAmount('')
    }
  }

  const handleCopyInvite = (token: string) => {
    const url = `${window.location.origin}/join/${token}`
    navigator.clipboard.writeText(url)
    setCopiedInvite(token)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

  const handleCopyVault = () => {
    if (!payroll.vault?.vault_address) return
    navigator.clipboard.writeText(payroll.vault.vault_address)
    setCopiedVault(true)
    setTimeout(() => setCopiedVault(false), 2000)
  }

  const handleSaveSettings = async () => {
    await payroll.updateCompany({
      name: settingsName || payroll.company?.name,
      pay_schedule: settingsSchedule,
      next_pay_date: settingsDate || null,
    })
  }

  // Init settings form values
  if (payroll.view === 'settings' && !settingsName && payroll.company) {
    setSettingsName(payroll.company.name)
    setSettingsSchedule(payroll.company.pay_schedule)
    setSettingsDate(payroll.company.next_pay_date || '')
  }

  const activeContractors = payroll.contractors.filter(c => c.status === 'active')
  const selectedTotal = activeContractors
    .filter(c => selected.has(c.id))
    .reduce((sum, c) => sum + c.amount_usdc, 0)

  return (
    <div className="pr">
      {/* ── Vault banner ── */}
      {payroll.vault && (
        <div className="pr-vault">
          <div className="pr-vault-left">
            <div className="pr-vault-label">Payroll Vault</div>
            <div className="pr-vault-balance">${Number(payroll.vault.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="pr-vault-sub">USDC · {payroll.vault.vault_chain}</div>
          </div>
          <div className="pr-vault-right">
            <div className="pr-vault-addr-label">Deposit Address</div>
            <div className="pr-vault-addr" title={payroll.vault.vault_address}>
              <code>{truncAddr(payroll.vault.vault_address)}</code>
              <button className="pr-btn xs" onClick={handleCopyVault}>
                {copiedVault ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="pr-vault-hint">Send USDC to this address to fund your vault</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="pr-header">
        <div className="pr-header-left">
          <h2>{payroll.company?.name || 'Agent Payroll'}</h2>
          <div className="pr-header-stats">
            <span className="pr-stat">
              <span className="pr-stat-v">{payroll.contractors.length}</span>
              <span className="pr-stat-l">Team</span>
            </span>
            <span className="pr-stat">
              <span className="pr-stat-v">${payroll.totalMonthly.toLocaleString()}</span>
              <span className="pr-stat-l">Per Cycle</span>
            </span>
            <span className="pr-stat">
              <span className="pr-stat-v">${payroll.totalPaid.toLocaleString()}</span>
              <span className="pr-stat-l">Total Paid</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── View tabs ── */}
      <div className="pr-tabs">
        {(['roster', 'pay', 'history', 'settings'] as const).map(v => (
          <button
            key={v}
            className={`pr-tab${payroll.view === v ? ' active' : ''}`}
            onClick={() => payroll.setView(v)}
          >
            {v === 'roster' ? 'Team' : v === 'pay' ? 'Pay' : v === 'history' ? 'History' : 'Settings'}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {payroll.error && (
        <div className="pr-error">
          <span>{payroll.error}</span>
          <button onClick={() => payroll.setError(null)}>✕</button>
        </div>
      )}

      {/* ═══════════ ROSTER VIEW ═══════════ */}
      {payroll.view === 'roster' && (
        <div className="pr-roster">
          <div className="pr-roster-actions">
            <button className="pr-btn secondary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '+ Add Contractor'}
            </button>
            <button className="pr-btn outline" onClick={() => setShowInviteForm(!showInviteForm)}>
              {showInviteForm ? 'Cancel' : '🔗 Invite Link'}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="pr-form">
              <div className="pr-form-row">
                <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="pr-input" />
                <input placeholder="Role (optional)" value={newRole} onChange={e => setNewRole(e.target.value)} className="pr-input sm" />
              </div>
              <div className="pr-form-row">
                <input placeholder="Wallet address (0x...)" value={newWallet} onChange={e => setNewWallet(e.target.value)} className="pr-input" />
              </div>
              <div className="pr-form-row">
                <input placeholder="USDC amount" type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="pr-input sm" />
                <select value={newChain} onChange={e => setNewChain(Number(e.target.value))} className="pr-select">
                  {PAYROLL_CHAINS.map(c => (
                    <option key={c.chainId} value={c.chainId}>{c.shortName}</option>
                  ))}
                </select>
                <button className="pr-btn primary" onClick={handleAdd} disabled={!newName || !newWallet || !newAmount}>
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Invite form */}
          {showInviteForm && (
            <div className="pr-form">
              <p className="pr-form-hint">Create a shareable link. When a contractor opens it and connects their wallet, they'll be auto-added to your roster.</p>
              <div className="pr-form-row">
                <input placeholder="Role" value={invRole} onChange={e => setInvRole(e.target.value)} className="pr-input sm" />
                <input placeholder="USDC amount" type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} className="pr-input sm" />
                <select value={invChain} onChange={e => setInvChain(Number(e.target.value))} className="pr-select">
                  {PAYROLL_CHAINS.map(c => (
                    <option key={c.chainId} value={c.chainId}>{c.shortName}</option>
                  ))}
                </select>
                <button className="pr-btn primary" onClick={handleCreateInvite} disabled={!invAmount}>
                  Create
                </button>
              </div>

              {payroll.invites.length > 0 && (
                <div className="pr-invite-list">
                  {payroll.invites.slice(0, 5).map(inv => (
                    <div key={inv.id} className={`pr-invite-row${inv.used_by ? ' used' : ''}`}>
                      <span className="pr-invite-token">{inv.token}</span>
                      <span className="pr-invite-detail">{inv.role} · ${inv.amount_usdc}</span>
                      {inv.used_by ? (
                        <span className="pr-invite-status">Claimed</span>
                      ) : (
                        <button className="pr-btn xs" onClick={() => handleCopyInvite(inv.token)}>
                          {copiedInvite === inv.token ? '✓ Copied' : 'Copy Link'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contractor list */}
          {payroll.contractors.length === 0 ? (
            <div className="pr-empty">
              <p>No contractors yet. Add one manually or share an invite link.</p>
            </div>
          ) : (
            <div className="pr-table">
              <div className="pr-table-header">
                <span className="pr-col-name">Name</span>
                <span className="pr-col-role">Role</span>
                <span className="pr-col-wallet">Wallet</span>
                <span className="pr-col-chain">Chain</span>
                <span className="pr-col-amount">Amount</span>
                <span className="pr-col-status">Status</span>
                <span className="pr-col-actions"></span>
              </div>
              {payroll.contractors.map(c => (
                <div key={c.id} className={`pr-table-row${c.status === 'paused' ? ' paused' : ''}`}>
                  <span className="pr-col-name">{c.name}</span>
                  <span className="pr-col-role">{c.role}</span>
                  <span className="pr-col-wallet" title={c.wallet_address}>{truncAddr(c.wallet_address)}</span>
                  <span className="pr-col-chain">
                    <img src={chainIcon(c.chain_id)} alt="" className="pr-chain-icon" />
                    {chainName(c.chain_id)}
                  </span>
                  <span className="pr-col-amount">${c.amount_usdc.toLocaleString()}</span>
                  <span className={`pr-col-status ${c.status}`}>
                    {c.status === 'active' ? '● Active' : '◯ Paused'}
                  </span>
                  <span className="pr-col-actions">
                    <button
                      className="pr-btn xs"
                      onClick={() => payroll.updateContractor(c.id, { status: c.status === 'active' ? 'paused' : 'active' })}
                    >
                      {c.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button className="pr-btn xs danger" onClick={() => payroll.removeContractor(c.id)}>
                      Remove
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ PAY VIEW ═══════════ */}
      {payroll.view === 'pay' && (
        <div className="pr-pay">
          {activeContractors.length === 0 ? (
            <div className="pr-empty">
              <p>No active contractors to pay. Add team members in the Team tab.</p>
            </div>
          ) : (
            <>
              <div className="pr-pay-header">
                <button className="pr-btn xs" onClick={handleSelectAll}>
                  {selected.size === activeContractors.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="pr-pay-total">
                  Selected: <strong>${selectedTotal.toLocaleString()}</strong> USDC
                  {payroll.vault && (
                    <span className="pr-pay-vault-bal"> · Vault: ${Number(payroll.vault.balance).toLocaleString()}</span>
                  )}
                </span>
              </div>

              <div className="pr-pay-list">
                {activeContractors.map(c => (
                  <div
                    key={c.id}
                    className={`pr-pay-item${selected.has(c.id) ? ' selected' : ''}`}
                    onClick={() => handleToggleSelect(c.id)}
                  >
                    <div className={`pr-check${selected.has(c.id) ? ' checked' : ''}`}>
                      {selected.has(c.id) && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                    </div>
                    <div className="pr-pay-info">
                      <span className="pr-pay-name">{c.name}</span>
                      <span className="pr-pay-detail">{c.role} · {truncAddr(c.wallet_address)}</span>
                    </div>
                    <div className="pr-pay-chain">
                      <img src={chainIcon(c.chain_id)} alt="" className="pr-chain-icon" />
                      {chainName(c.chain_id)}
                    </div>
                    <span className="pr-pay-amount">${c.amount_usdc.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {payroll.disbursing && (
                <div className="pr-progress">
                  <div className="pr-spinner" />
                  <span>{payroll.disburseProgress}</span>
                </div>
              )}

              {payroll.disburseProgress && !payroll.disbursing && (
                <div className="pr-progress success">
                  <span>{payroll.disburseProgress}</span>
                </div>
              )}

              <button
                className={`pr-btn primary full${payroll.disbursing ? ' loading' : ''}`}
                onClick={handlePay}
                disabled={selected.size === 0 || payroll.disbursing}
              >
                {payroll.disbursing
                  ? 'Processing via Circle Vault...'
                  : `Pay ${selected.size} Contractor${selected.size !== 1 ? 's' : ''} · $${selectedTotal.toLocaleString()}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════════ HISTORY VIEW ═══════════ */}
      {payroll.view === 'history' && (
        <div className="pr-history">
          {payroll.payments.length === 0 ? (
            <div className="pr-empty">
              <p>No payments yet. Disburse your first payroll in the Pay tab.</p>
            </div>
          ) : (
            <div className="pr-table">
              <div className="pr-table-header hist">
                <span className="pr-col-date">Date</span>
                <span className="pr-col-name">Contractor</span>
                <span className="pr-col-amount">Amount</span>
                <span className="pr-col-chain">Chain</span>
                <span className="pr-col-status">Status</span>
                <span className="pr-col-tx">Tx</span>
              </div>
              {payroll.payments.map(p => (
                <div key={p.id} className="pr-table-row hist">
                  <span className="pr-col-date">{new Date(p.paid_at).toLocaleDateString()}</span>
                  <span className="pr-col-name">{p.contractor_name}</span>
                  <span className="pr-col-amount">${p.amount.toLocaleString()}</span>
                  <span className="pr-col-chain">
                    <img src={chainIcon(p.chain_id)} alt="" className="pr-chain-icon" />
                    {chainName(p.chain_id)}
                  </span>
                  <span className={`pr-col-status ${p.status}`}>
                    {p.status === 'confirmed' ? '✓' : p.status === 'failed' ? '✕' : '⏳'} {p.status}
                  </span>
                  <span className="pr-col-tx">
                    {p.tx_hash ? (
                      <a href={`https://sepolia.basescan.org/tx/${p.tx_hash}`} target="_blank" rel="noopener noreferrer" className="pr-tx-link">
                        {truncAddr(p.tx_hash)}
                      </a>
                    ) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SETTINGS VIEW ═══════════ */}
      {payroll.view === 'settings' && (
        <div className="pr-settings">
          <div className="pr-form">
            <label className="pr-label">Company Name</label>
            <input className="pr-input" value={settingsName} onChange={e => setSettingsName(e.target.value)} />

            <label className="pr-label">Pay Schedule</label>
            <div className="pr-schedule-grid">
              {(['manual', 'weekly', 'biweekly', 'monthly'] as const).map(s => (
                <button
                  key={s}
                  className={`pr-schedule-btn${settingsSchedule === s ? ' active' : ''}`}
                  onClick={() => setSettingsSchedule(s)}
                >
                  {s === 'manual' ? 'Manual' : s === 'weekly' ? 'Weekly' : s === 'biweekly' ? 'Bi-weekly' : 'Monthly'}
                </button>
              ))}
            </div>

            {settingsSchedule !== 'manual' && (
              <>
                <label className="pr-label">Next Pay Date</label>
                <input type="date" className="pr-input" value={settingsDate} onChange={e => setSettingsDate(e.target.value)} />
                <p className="pr-form-hint">Payments will be auto-disbursed from your vault on this date, then repeat per schedule.</p>
              </>
            )}

            <button className="pr-btn primary" onClick={handleSaveSettings} style={{ marginTop: 16 }}>
              Save Settings
            </button>
          </div>

          <div className="pr-settings-info">
            <h4>Vault Details</h4>
            {payroll.vault && (
              <>
                <p className="pr-mono">{payroll.vault.vault_address}</p>
                <p style={{ fontSize: '0.68rem', color: 'rgba(240,236,255,0.3)', marginTop: 4 }}>
                  Chain: {payroll.vault.vault_chain} · Balance: ${Number(payroll.vault.balance).toLocaleString()} USDC
                </p>
              </>
            )}

            <h4>Schedule Info</h4>
            <p>
              {payroll.company?.pay_schedule === 'manual'
                ? 'Payments are triggered manually from the Pay tab.'
                : `Payments auto-run ${payroll.company?.pay_schedule}. Next: ${payroll.company?.next_pay_date ? new Date(payroll.company.next_pay_date).toLocaleDateString() : 'Not set'}`}
            </p>

            <h4>How It Works</h4>
            <p>Your vault is a Circle Agent Wallet — a dedicated USDC wallet with gas-sponsored transfers. Fund it by sending USDC to the deposit address. Disbursements are executed server-side with no gas fees for you or your contractors.</p>
          </div>
        </div>
      )}
    </div>
  )
}
