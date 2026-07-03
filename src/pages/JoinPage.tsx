/**
 * JoinPage — Contractor invite acceptance page.
 *
 * URL: /join/:token
 * Flow: Show company name + role + amount → contractor connects wallet → auto-joins roster.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { getInviteByToken, claimInvite, type PayrollInvite } from '../config/payroll'
import { SUPPORTED_CHAINS } from '../config/chains'
import './JoinPage.css'

function chainName(chainId: number) {
  return SUPPORTED_CHAINS.find(c => c.chainId === chainId)?.shortName || `Chain ${chainId}`
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { authenticated, login } = usePrivy()
  const { address } = useAccount()

  const [invite, setInvite] = useState<PayrollInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [name, setName] = useState('')

  // Load invite
  useEffect(() => {
    if (!token) return
    ;(async () => {
      setLoading(true)
      const inv = await getInviteByToken(token)
      setInvite(inv)
      if (!inv) setError('This invite link is invalid or has already been used.')
      setLoading(false)
    })()
  }, [token])

  const handleClaim = async () => {
    if (!invite || !address || !name) return
    setClaiming(true)
    setError(null)

    const ok = await claimInvite(invite.token, address, name)
    if (ok) {
      setSuccess(true)
    } else {
      setError('Failed to join. The invite may have expired.')
    }
    setClaiming(false)
  }

  if (loading) {
    return (
      <div className="join">
        <div className="join-card">
          <div className="join-spinner" />
          <p>Loading invite...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="join">
        <div className="join-card">
          <div className="join-success-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#34d399" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2>You're In! 🎉</h2>
          <p>You've been added to <strong>{invite?.company_name}</strong>'s payroll. You'll receive <strong>${invite?.amount_usdc}</strong> USDC on {chainName(invite?.chain_id || 0)} each pay cycle.</p>
          <p className="join-wallet">Your wallet: <code>{address}</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="join">
      <div className="join-card">
        {error ? (
          <>
            <div className="join-error-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <h2>Invite Not Found</h2>
            <p>{error}</p>
          </>
        ) : invite ? (
          <>
            <div className="join-logo">
              <img src="/images/lumma.svg" alt="Lumma" />
              <span>Lumma Payroll</span>
            </div>
            <h2>You've Been Invited</h2>
            <p><strong>{invite.company_name}</strong> wants to add you to their payroll.</p>

            <div className="join-details">
              <div className="join-detail">
                <span className="join-detail-l">Role</span>
                <span className="join-detail-v">{invite.role}</span>
              </div>
              <div className="join-detail">
                <span className="join-detail-l">Pay Amount</span>
                <span className="join-detail-v">${invite.amount_usdc} USDC</span>
              </div>
              <div className="join-detail">
                <span className="join-detail-l">Chain</span>
                <span className="join-detail-v">{chainName(invite.chain_id)}</span>
              </div>
            </div>

            {!authenticated ? (
              <button className="join-btn" onClick={login}>
                Connect Wallet to Join
              </button>
            ) : (
              <>
                <input
                  className="join-input"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <p className="join-wallet">Wallet: <code>{address?.slice(0, 8)}...{address?.slice(-6)}</code></p>
                <button className="join-btn" onClick={handleClaim} disabled={!name || claiming}>
                  {claiming ? 'Joining...' : 'Accept & Join'}
                </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
