import { useState } from 'react'
import SwapWidget from '../components/bridge/SwapWidget'
import TransferHistory from '../components/bridge/TransferHistory'
import BalancePanel from '../components/balance/BalancePanel'
import AgentChat from '../components/agent/AgentChat'
import WalletDropdown from '../components/wallet/WalletDropdown'
import ErrorBoundary from '../components/ErrorBoundary'
import { DEMO_BOOKING_URL } from '../config/demo'
import './TestnetPage.css'

type Module = 'bridge' | 'balance' | 'points' | 'send' | 'agents' | 'yield'

const MODULES: { id: Module; label: string; live: boolean; private?: boolean; title: string; desc: string }[] = [
  { id: 'bridge', label: 'Bridge & Swap', live: true, title: 'Bridge & Swap', desc: 'Move assets across chains or swap between tokens. Best routes selected automatically.' },
  { id: 'balance', label: 'Unified Balance', live: true, title: 'Unified Balance', desc: 'View your USDC balance across every supported chain in a single dashboard.' },
  { id: 'agents', label: 'Agent Payroll', live: true, private: true, title: 'Agent Payroll', desc: 'AI-powered payroll for people, contractors, and agents. Private — book a demo to get access.' },
  { id: 'points', label: 'Points', live: false, title: 'Lumma Points', desc: 'Earn points for every swap, bridge, and transaction on Lumma. Points track your activity across modules and will be redeemable for rewards.' },
  { id: 'send', label: 'FX Send', live: false, title: 'FX Send', desc: 'Send stablecoins cross-border with automatic currency conversion. Pay in USDC, recipient receives EURC. Real FX rates, instant settlement.' },
  { id: 'yield', label: 'Yield Radar', live: false, title: 'Yield Radar', desc: 'Discover and compare stablecoin yield opportunities across DeFi protocols. Risk scoring, auto-compound strategies, portfolio optimization.' },
]

function ModuleIcon({ id }: { id: Module }) {
  switch (id) {
    case 'bridge': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
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
      <nav className="tn-nav">
        <a href="/" className="tn-logo">
          <img src="/images/lumma.svg" alt="Lumma" style={{ height: 22, width: 'auto' }} />
          Lumma
        </a>
        <span className="tn-nav-tag">Mainnet</span>
        <div className="tn-nav-r">
          <WalletDropdown />
        </div>
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
            {m.private && <span className="tn-bar-badge private">Private</span>}
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

          {activeModule === 'agents' && (
            <div className="tn-full">
              <AgentChat demoUrl={DEMO_BOOKING_URL} />
            </div>
          )}

          {activeModule === 'balance' && (
            <div className="tn-full">
              <BalancePanel />
            </div>
          )}

          {!current.live && (
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
