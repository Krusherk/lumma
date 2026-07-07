/**
 * AgentChat — AI-powered payroll chat interface.
 * Gated behind invite codes, powered by OpenRouter + Circle.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import './AgentChat.css'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  'Create my payroll vault',
  'Add a contractor',
  'Check vault balance',
  'List my contractors',
  'Run payroll for all',
  'Show payment history',
]

const LUMMA_LOGO = '/images/lumma.svg'

// ── TEMPORARY public access flag ──
// When VITE_PAYROLL_PUBLIC === 'true', Agent Payroll is open to ANY connected
// wallet with NO invite code. This is intentionally temporary — flip the env
// var back to 'false' (or remove it) to re-enable the invite-code gate.
const PAYROLL_PUBLIC = import.meta.env.VITE_PAYROLL_PUBLIC === 'true'

// Derive a stable, wallet-scoped session id for public (no-code) access.
// The chat API already accepts any sessionId beginning with "LMA-".
function publicSessionId(address: string): string {
  return `LMA-PUBLIC-${address.slice(2, 10).toUpperCase()}`
}

export default function AgentChat() {
  const { address } = useAccount()
  const { authenticated, login } = usePrivy()

  // Invite code gate
  const [codeInput, setCodeInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lma_sess_v2')
    }
    return null
  })
  const [codeError, setCodeError] = useState('')
  const [validating, setValidating] = useState(false)

  // ── Public access: auto-create a session for any connected wallet ──
  // Temporary bypass of the invite-code gate, controlled by VITE_PAYROLL_PUBLIC.
  useEffect(() => {
    if (PAYROLL_PUBLIC && authenticated && address && !sessionId) {
      const sid = publicSessionId(address)
      setSessionId(sid)
      localStorage.setItem('lma_sess_v2', sid)
    }
  }, [authenticated, address, sessionId])


  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Welcome message on first load
  useEffect(() => {
    if (sessionId && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to Lumma Payroll.\n\nI can help you manage USDC payroll on Arc Testnet — create vaults, add contractors, and run payments.\n\nWhat would you like to do?',
        timestamp: new Date(),
      }])
    }
  }, [sessionId])

  // Validate invite code
  const handleValidate = useCallback(async () => {
    if (!codeInput.trim() || !address) return
    setValidating(true)
    setCodeError('')

    try {
      const res = await fetch('/api/agent/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeInput.trim(),
          walletAddress: address,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        setCodeError(errData?.error || `Server error (${res.status})`)
        setValidating(false)
        return
      }

      const data = await res.json()

      if (data.sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem('lma_sess_v2', data.sessionId)
      } else {
        setCodeError(data.error || 'Invalid code')
      }
    } catch (err: any) {
      setCodeError(`Connection failed: ${err.message || 'Check your network'}`)
    }
    setValidating(false)
  }, [codeInput, address])

  // Send message
  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || !sessionId || !address || sending) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    }

    // Build conversation history to send to the server so the agent keeps
    // context across turns (don't rely solely on server-side persistence).
    // Exclude the synthetic welcome/cleared placeholder and cap to recent turns.
    const history = messages
      .filter(m => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'))
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: msg,
          walletAddress: address,
          history,
        }),
      })

      const data = await res.json()

      if (data.error) {
        if (res.status === 403) {
          setSessionId(null)
          localStorage.removeItem('lma_sess_v2')
          setCodeError('Session expired. Re-enter your invite code.')
        }
        setMessages(prev => [...prev, {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${data.error}${data.detail ? ` — ${data.detail}` : ''}`,
          timestamp: new Date(),
        }])
      } else {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Failed to reach the server. Please try again.',
        timestamp: new Date(),
      }])
    }
    setSending(false)
  }, [input, sessionId, address, sending])

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Not connected ──
  if (!authenticated || !address) {
    return (
      <div className="ac-gate">
        <div className="ac-gate-logo">
          <img src={LUMMA_LOGO} alt="Lumma" />
        </div>
        <h3>Connect Wallet</h3>
        <p>Connect your wallet to access Agent Payroll.</p>
        <button className="ac-btn primary" onClick={login}>Connect Wallet</button>
      </div>
    )
  }

  // ── Invite code gate ──
  if (!sessionId) {
    return (
      <div className="ac-gate">
        <div className="ac-gate-logo">
          <img src={LUMMA_LOGO} alt="Lumma" />
        </div>
        <h3>Enter Invite Code</h3>
        <p>Agent Payroll is in early access. Enter your invite code to continue.</p>
        <div className="ac-code-form">
          <input
            type="text"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleValidate()}
            placeholder="LMA-XXXX-XXXX"
            className="ac-code-input"
            maxLength={20}
            autoFocus
          />
          <button
            className="ac-btn primary"
            onClick={handleValidate}
            disabled={validating || !codeInput.trim()}
          >
            {validating ? 'Validating...' : 'Unlock'}
          </button>
        </div>
        {codeError && <p className="ac-code-error">{codeError}</p>}
      </div>
    )
  }

  // ── Chat interface ──
  return (
    <div className="ac">
      {/* Header */}
      <div className="ac-header">
        <div className="ac-header-left">
          <div className="ac-avatar">
            <img src={LUMMA_LOGO} alt="Lumma" />
          </div>
          <div>
            <span className="ac-header-title">Lumma Payroll</span>
          </div>
        </div>
        <div className="ac-header-actions">
          <button
            className="ac-header-reset"
            onClick={() => {
              setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: 'Chat cleared. How can I help you?',
                timestamp: new Date(),
              }])
            }}
            title="Clear chat"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ac-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ac-msg ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ac-msg-avatar">
                <img src={LUMMA_LOGO} alt="L" />
              </div>
            )}
            <div className="ac-msg-bubble">
              <div className="ac-msg-text" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              <span className="ac-msg-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {sending && (
          <div className="ac-msg assistant">
            <div className="ac-msg-avatar">
              <img src={LUMMA_LOGO} alt="L" />
            </div>
            <div className="ac-msg-bubble">
              <div className="ac-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions (show if < 3 messages) */}
      {messages.length < 3 && (
        <div className="ac-suggestions">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="ac-suggestion"
              onClick={() => handleSend(s)}
              disabled={sending}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="ac-input-bar">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Lumma Payroll..."
          className="ac-input"
          rows={1}
          disabled={sending}
        />
        <button
          className="ac-send"
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Markdown-lite formatter ──
function formatMessage(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Markdown links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Auto-link bare URLs (not already inside an href)
    .replace(/(?<!href=")(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br />')
}

