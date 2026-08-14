import { useState, useEffect, useRef, useCallback } from 'react'
import ParticleCanvas from '../components/ParticleCanvas'
import './LandingPage.css'

function SvgIcon({ name }: { name: string }) {
  switch (name) {
    case 'layers': return <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
    case 'lock': return <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    case 'globe': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
    case 'zap': return <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    case 'code': return <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
    case 'target': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></svg>
    case 'arrow': return <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
    case 'wallet': return <svg viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" /></svg>
    case 'users': return <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    default: return <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
  }
}

const PRODUCT_CARDS = [
  { icon: 'globe', label: 'Move', title: 'Bridge & Swap', desc: 'Bridge and swap USDC across supported networks using native stablecoin infrastructure.' },
  { icon: 'layers', label: 'Manage', title: 'Unified Balance', desc: 'See stablecoin balances across networks from one place.' },
  { icon: 'arrow', label: 'Send', title: 'FX Send', desc: 'Move value across currencies and networks without manually coordinating the underlying bridge and swap steps.' },
  { icon: 'zap', label: 'Earn', title: 'Yield Radar', desc: 'Discover stablecoin yield opportunities across supported protocols.' },
]

export default function LandingPage() {
  const [phase, setPhase] = useState(0)
  const [dotOpen, setDotOpen] = useState(false)
  const revealRefs = useRef<(HTMLDivElement | null)[]>([])

  const handlePhaseChange = useCallback((p: number) => setPhase(p), [])

  // Reveal-on-scroll observer
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') })
    }, { threshold: 0.1 })
    revealRefs.current.forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  return (
    <div className="lp">
      <ParticleCanvas onPhaseChange={handlePhaseChange} />

      {/* NAV */}
      <nav className={`lp-nav${phase >= 1 ? ' show' : ''}`}>
        <div className="nav-logo">
          <img src="/images/lumma.svg" alt="Lumma" className="nav-logo-img" />
          <span className="nav-logo-text">LUMMA</span>
        </div>
        <div className="nav-tabs">
          <a href="#about" className="nav-tab">Products</a>
          <a href="#payroll" className="nav-tab">Agent Payroll</a>
          <a href="#arc" className="nav-tab">Arc</a>
        </div>
        <div className="nav-btns">
            <a href="https://testnet.lumma.xyz" className="bn p nav-launch">Launch App</a>
          <div className="dot-menu">
            <button className="dot-trigger" onClick={() => setDotOpen(v => !v)} type="button">
              <span /><span /><span />
            </button>
            {dotOpen && (
              <>
                <div className="dot-backdrop" onClick={() => setDotOpen(false)} />
                <div className="dot-dropdown">
                  <a href="https://blog.lumma.xyz" className="dot-item" onClick={() => setDotOpen(false)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    Blog
                  </a>
                  <a href="https://docs.lumma.xyz" className="dot-item" onClick={() => setDotOpen(false)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Docs
                  </a>
                  <a href="https://x.com/lummaxyz" target="_blank" rel="noopener noreferrer" className="dot-item" onClick={() => setDotOpen(false)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter
                  </a>
                  <a href="https://discord.gg/4QsndzgRvN" target="_blank" rel="noopener noreferrer" className="dot-item" onClick={() => setDotOpen(false)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    Discord
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* SCROLL CUE */}
      <div className={`sc${phase === 1 ? ' show' : ''}${phase >= 2 ? ' hide' : ''}`}>
        <span>Scroll</span>
        <div className="sct"><div className="scf" /></div>
      </div>

      {/* HERO OVERLAY */}
      <div className={`hero-overlay${phase >= 1 ? ' show' : ''}${phase >= 2 ? ' dim' : ''}`}>
        <div className="hero-top">
          <h1>Stablecoin infrastructure<br />on <em>Arc.</em></h1>
          <p>Move, manage, and pay with USDC. Cross-chain transfers, unified balances, cross-border payments, yield discovery, and programmable payroll — in one application.</p>
        </div>
        <div className="hero-bottom">
          <div className="hero-stats">
            <div className="hs"><div className="hs-v">USDC</div><div className="hs-l">Native Asset</div></div>
            <div className="hs"><div className="hs-v">Arc</div><div className="hs-l">Network</div></div>
            <div className="hs"><div className="hs-v">Testnet</div><div className="hs-l">Status</div></div>
          </div>
        </div>
      </div>

      {/* SCROLL SPACER - drives the ball animation */}
      <div className="lp-spacer" />

      {/* CONTENT - normal document flow, black background covers canvas */}
      <div className="lp-content">

        {/* ── Section 1: Products ── */}
        <div className="sec" id="about">
          <div className="rev" ref={el => { revealRefs.current[0] = el }}>
            <span className="stag">Products</span>
            <h2 className="stit">Stablecoin tools for<br />real workflows.</h2>
            <p className="ssub">Lumma brings cross-chain transfers, swaps, unified balances, cross-border payments, yield discovery, and programmable payroll into one application built on Arc.</p>
          </div>
          <div className="bento rev" ref={el => { revealRefs.current[1] = el }}>
            {PRODUCT_CARDS.map((f, i) => (
              <div className="bc" key={i}>
                <div className="ci"><SvgIcon name={f.icon} /></div>
                <div style={{ fontSize: '.55rem', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#a855f7', marginBottom: 8 }}>{f.label}</div>
                <div className="ct">{f.title}</div>
                <p className="cb">{f.desc}</p>
              </div>
            ))}
            {/* Pay card — wider, visually emphasized */}
            <div className="bc w" style={{ borderLeft: '2px solid rgba(168,85,247,.2)' }}>
              <div className="ci"><SvgIcon name="users" /></div>
              <div style={{ fontSize: '.55rem', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#a855f7', marginBottom: 8 }}>Pay</div>
              <div className="ct">Agent Payroll</div>
              <p className="cb">Run recurring payroll and usage-based compensation for employees, contractors, and AI agents through programmable USDC vaults.</p>
              <div className="mc2">
                {[30, 48, 38, 78, 95, 84, 68, 58, 100, 74, 62, 90].map((h, j) => (
                  <div className={`br${[3, 4, 5, 8, 11].includes(j) ? ' h' : ''}`} key={j} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Agent Payroll ── */}
        <div className="sec" id="payroll">
          <div className="rev" ref={el => { revealRefs.current[2] = el }}>
            <span className="stag">Agent Payroll</span>
            <h2 className="stit">Payroll for humans and<br />autonomous agents.</h2>
            <p className="ssub">A programmable USDC payroll vault on Arc for recurring human payroll and usage-based compensation for AI agents.</p>
          </div>

          <div className="hg rev" ref={el => { revealRefs.current[3] = el }}>
            <div className="steps">
              {[
                { n: '01', title: 'Create a vault', desc: 'Deploy a dedicated USDC payroll account on Arc.' },
                { n: '02', title: 'Add workers', desc: 'Register employees, contractors, and AI agents with payout wallets.' },
                { n: '03', title: 'Define compensation', desc: 'Set recurring schedules for people. Set per-task rates and spending caps for agents.' },
                { n: '04', title: 'Work is recorded', desc: 'Agents report completed tasks. Earnings accumulate until settlement.' },
                { n: '05', title: 'USDC is settled', desc: 'Payouts execute on-chain with verifiable receipts.' },
              ].map((s, i) => (
                <div className="sr" key={i}>
                  <div className="sn">{s.n}</div>
                  <div className="sb"><h3>{s.title}</h3><p>{s.desc}</p></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(255,255,255,.05)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.05)' }}>
              {[
                { label: 'Recurring payroll', desc: 'Weekly, bi-weekly, or monthly USDC payments for employees and contractors.' },
                { label: 'Per-task agent pay', desc: 'AI agents earn per task completed, priced by rules you configure.' },
                { label: 'Spending limits', desc: 'Per-transaction caps, daily limits, and rolling spending windows.' },
                { label: 'Micropayment batching', desc: 'Small agent earnings accumulate and settle together efficiently.' },
                { label: 'On-chain settlement', desc: 'Every payout settles on Arc with a transaction hash.' },
                { label: 'Payment receipts', desc: 'Shareable, verifiable receipts for each settlement.' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#06060a', padding: '20px 24px' }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '.75rem', color: 'rgba(240,236,255,.35)', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 3: Why Arc ── */}
        <div className="sec" id="arc">
          <div className="rev" ref={el => { revealRefs.current[4] = el }}>
            <span className="stag">Infrastructure</span>
            <h2 className="stit">Why Arc.</h2>
          </div>
          <div className="bento rev" ref={el => { revealRefs.current[5] = el }}>
            <div className="bc">
              <div className="ci"><SvgIcon name="target" /></div>
              <div className="ct">USDC as gas</div>
              <p className="cb">Users and payroll systems operate without managing a separate gas token. All transaction fees are paid in USDC.</p>
              <div className="cgl" />
            </div>
            <div className="bc">
              <div className="ci"><SvgIcon name="code" /></div>
              <div className="ct">Native USDC</div>
              <p className="cb">CCTP-based movement keeps USDC native across supported networks rather than relying on wrapped representations.</p>
            </div>
            <div className="bc">
              <div className="ci"><SvgIcon name="zap" /></div>
              <div className="ct">Fast settlement</div>
              <p className="cb">Sub-second finality makes Arc suitable for payment and payroll workflows where speed matters.</p>
            </div>
          </div>
        </div>

        {/* ── Section 4: Developer ── */}
        <div className="ctaw">
          <div className="ctab rev" ref={el => { revealRefs.current[6] = el }}>
            <h2>Build on Lumma.</h2>
            <p>Integrate programmable USDC payroll into applications, agent workflows, and financial products through Lumma's developer infrastructure.</p>
            <div className="ctaf">
              <a href="https://docs.lumma.xyz" className="bl s">Read the docs</a>
              <a href="https://testnet.lumma.xyz" className="bl o">Try Testnet</a>
              <a href="https://x.com/lummaxyz" target="_blank" rel="noopener noreferrer" className="bl o">Follow on X</a>
            </div>
          </div>
        </div>

        <footer className="lp-footer">
          <div className="fl">
            <img src="/images/lumma.svg" alt="Lumma" className="fl-logo" />
            Lumma
          </div>
          <ul className="fli">
            <li><a href="#about">Products</a></li>
            <li><a href="https://docs.lumma.xyz">Docs</a></li>
            <li><a href="https://x.com/lummaxyz" target="_blank" rel="noopener noreferrer">X</a></li>
            <li><a href="mailto:support@lumma.xyz">Support</a></li>
          </ul>
          <div className="fc">2026 Lumma</div>
        </footer>
      </div>
    </div>
  )
}
