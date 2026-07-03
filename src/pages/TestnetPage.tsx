import { useState } from 'react'
import SwapWidget from '../components/bridge/SwapWidget'
import TransferHistory from '../components/bridge/TransferHistory'
import BalancePanel from '../components/balance/BalancePanel'
import AgentChat from '../components/agent/AgentChat'
import ParticleCanvas from '../components/ParticleCanvas'
import ErrorBoundary from '../components/ErrorBoundary'
import './TestnetPage.css'

const GUIDE_STEPS = [
  {
    title: 'Set up your vault',
    desc: 'Creates a USDC wallet to hold your payroll funds. Think of it like opening a business account.',
    cmd: 'Create my payroll vault',
  },
  {
    title: 'Fund it with test USDC',
    desc: 'Get free test tokens from the faucet. The agent will walk you through it.',
    cmd: 'How do I fund my vault?',
  },
  {
    title: 'Add your team',
    desc: 'Give the agent a name, wallet address, and monthly amount for each person you pay.',
    cmd: 'Add a contractor',
  },
  {
    title: 'Run payroll',
    desc: 'Pay everyone at once or one person at a time. USDC goes straight from your vault to theirs.',
    cmd: 'Run payroll for all',
  },
  {
    title: 'Track everything',
    desc: 'Check balances, view payment history, and manage your roster anytime.',
    cmd: 'Show payment history',
  },
]

function PayrollGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className={`pg ${open ? 'pg-open' : ''}`}>
      <button className="pg-toggle" onClick={() => setOpen(!open)}>
        <span className="pg-toggle-left">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
          How to use Agent Payroll
        </span>
        <svg className="pg-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="pg-body">
          <div className="pg-steps">
            {GUIDE_STEPS.map((s, i) => (
              <div key={i} className="pg-step">
                <span className="pg-num">{i + 1}</span>
                <div className="pg-step-text">
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
                <span className="pg-cmd">"{s.cmd}"</span>
              </div>
            ))}
          </div>
          <p className="pg-note">Just type what you need — the agent understands plain English. You're on <strong>Arc Testnet</strong>, no real money.</p>
        </div>
      )}
    </div>
  )
}

type Module = 'bridge' | 'faucet' | 'balance' | 'points' | 'send' | 'agents' | 'yield'

const FAUCETS = [
  {
    name: 'Arc Testnet (USDC)',
    desc: 'Get testnet USDC for gas and swaps on Arc',
    url: 'https://faucet.circle.com/',
    logo: '/images/arclogo.jpg',
  },
  {
    name: 'Base Sepolia',
    desc: 'Get Base Sepolia ETH for testing',
    url: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
    logo: '/images/base.jpg',
  },
  {
    name: 'Arbitrum Sepolia',
    desc: 'Get Arbitrum Sepolia ETH',
    url: 'https://faucet.quicknode.com/arbitrum/sepolia',
    logo: '/images/arbitrum.jpg',
  },
  {
    name: 'OP Sepolia',
    desc: 'Get Optimism Sepolia ETH for testing',
    url: 'https://www.alchemy.com/faucets/optimism-sepolia',
    logo: '/images/eth.jpg',
  },
]

const MODULES: { id: Module; label: string; live: boolean; title: string; desc: string }[] = [
  { id: 'bridge', label: 'Bridge & Swap', live: true, title: 'Bridge & Swap', desc: 'Move assets across chains or swap between tokens. Best routes selected automatically.' },
  { id: 'faucet', label: 'Faucets', live: true, title: 'Testnet Faucets', desc: 'Get free testnet tokens for Arc and supported chains. You need gas tokens to start swapping and bridging.' },
  { id: 'balance', label: 'Unified Balance', live: true, title: 'Unified Balance', desc: 'View your USDC balance across every supported testnet chain in a single dashboard. No more switching networks to check funds.' },
  { id: 'agents', label: 'Agent Payroll', live: true, title: 'Agent Payroll', desc: 'AI-powered payroll management. Chat with Lumma Agent to create vaults, add contractors, and run payroll.' },
  { id: 'points', label: 'Points', live: false, title: 'Lumma Points', desc: 'Earn points for every swap, bridge, and transaction on Lumma. Points track your activity across modules and will be redeemable for rewards at mainnet launch.' },
  { id: 'send', label: 'FX Send', live: false, title: 'FX Send', desc: 'Send stablecoins cross-border with automatic currency conversion. Pay in USDC, recipient receives EURC. Real FX rates, instant settlement.' },
  { id: 'yield', label: 'Yield Radar', live: false, title: 'Yield Radar', desc: 'Discover and compare stablecoin yield opportunities across DeFi protocols. Risk scoring, auto-compound strategies, portfolio optimization.' },
]

function ModuleIcon({ id }: { id: Module }) {
  switch (id) {
    case 'bridge': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    case 'faucet': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v6m0 0a4 4 0 0 1 4 4v2a6 6 0 0 1-12 0v-2a4 4 0 0 1 4-4" /><path d="M6 22h12" /></svg>
    case 'balance': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
    case 'points': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
    case 'send': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
    case 'agents': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
    case 'yield': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>
  }
}

export default function TestnetPage() {
  const [activeModule, setActiveModule] = useState<Module>('bridge')
  const current = MODULES.find(m => m.id === activeModule)!

  return (
    <div className="tn">
      <div className="tn-particles"><ParticleCanvas /></div>
      <nav className="tn-nav">
        <a href="/" className="tn-logo">
          <img src="/images/lumma.svg" alt="Lumma" style={{ height: 22, width: 'auto' }} />
          Lumma
        </a>
        <span className="tn-nav-tag">Testnet</span>
      </nav>

      <div className="tn-bar">
        {MODULES.map(m => (
          <button
            key={m.id}
            className={`tn-bar-item${activeModule === m.id ? ' active' : ''}${!m.live ? ' soon' : ''}`}
            onClick={() => setActiveModule(m.id)}
          >
            <span className="tn-bar-icon"><ModuleIcon id={m.id} /></span>
            {m.label}
            {!m.live && <span className="tn-bar-badge">Soon</span>}
          </button>
        ))}
      </div>

      <div className="tn-content">
        <ErrorBoundary>
          {activeModule === 'bridge' && (
            <div className="tn-live">
              <SwapWidget />
              <TransferHistory />
            </div>
          )}

          {activeModule === 'faucet' && (
            <div className="tn-faucet">
              <div className="tn-faucet-header">
                <h2>{current.title}</h2>
                <p>{current.desc}</p>
              </div>
              <div className="tn-faucet-grid">
                {FAUCETS.map(f => (
                  <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer" className="tn-faucet-card">
                    <img src={f.logo} alt={f.name} className="tn-faucet-logo" />
                    <div className="tn-faucet-info">
                      <span className="tn-faucet-name">{f.name}</span>
                      <span className="tn-faucet-desc">{f.desc}</span>
                    </div>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="tn-faucet-arrow"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activeModule === 'agents' && (
            <div className="tn-full">
              <PayrollGuide />
              <AgentChat />
            </div>
          )}

          {activeModule === 'balance' && (
            <div className="tn-full">
              <BalancePanel />
            </div>
          )}

          {!current.live && activeModule !== 'faucet' && (
            <div className="tn-soon">
              <div className="tn-soon-icon"><ModuleIcon id={activeModule} /></div>
              <h2>{current.title}</h2>
              <p>{current.desc}</p>
              <div className="tn-soon-badge">Coming Soon</div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
