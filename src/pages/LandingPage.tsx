import { useState, useEffect, useRef, useCallback } from 'react'
import ParticleCanvas from '../components/ParticleCanvas'
import './LandingPage.css'

const MARQUEE_ITEMS = [
  { icon: 'zap', label: 'Sub-second finality' },
  { icon: 'lock', label: 'Non-custodial' },
  { icon: 'globe', label: 'Cross-chain liquidity' },
  { icon: 'layers', label: 'CCTP v2 native' },
  { icon: 'target', label: 'USDC as gas' },
]

const FEATURES = [
  { wide: true, icon: 'layers', title: 'Five modules, one interface', desc: 'Bridge, swap, check balances, send cross-border, and discover yield. All from a single dashboard built for stablecoins.', bars: true },
  { icon: 'target', title: 'USDC as gas', desc: 'No ETH needed. Pay for everything in USDC on Arc Network.', glow: true },
  { icon: 'globe', title: '20+ chains connected', desc: 'Native bridges to Ethereum, Base, Arbitrum, Polygon, Solana and more via CCTP v2.' },
  { icon: 'zap', title: 'Sub-second finality', desc: 'Transactions settle in under a second on Arc Network. No waiting.' },
  { icon: 'lock', title: 'Non-custodial', desc: 'Your keys, your stablecoins. We never hold or control your funds.' },
  { icon: 'code', title: 'No wrapped tokens', desc: 'CCTP v2 burns and mints native USDC. No synthetics, no bridge risk.' },
]

const STEPS = [
  { n: '01', title: 'Connect your wallet', desc: 'MetaMask, WalletConnect, Coinbase and 40+ others.' },
  { n: '02', title: 'Pick source and destination', desc: 'Choose your chains and the amount you want to move.' },
  { n: '03', title: 'One click, done', desc: 'Bridge, swap, or send. One transaction, zero complexity.' },
]

const TERM_LINES: { pr?: boolean; dim?: boolean; ok?: boolean; blank?: boolean; cursor?: boolean; text?: string; dim2?: string }[] = [
  { pr: true, text: 'lumma init --chain ethereum' },
  { dim: true, text: '  Connecting to RPC...' },
  { ok: true, text: 'Chain connected ', dim2: '(< 1s)' },
  { blank: true },
  { pr: true, text: 'lumma bridge --from eth --to arc --amount 100' },
  { dim: true, text: '  Routing via CCTP v2...' },
  { dim: true, text: '  Submitting transaction...' },
  { ok: true, text: 'Bridged 100 USDC to Arc ', dim2: '[0x4f2a...c91b]' },
  { blank: true },
  { pr: true, cursor: true },
]

function SvgIcon({ name }: { name: string }) {
  switch (name) {
    case 'layers': return <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
    case 'lock': return <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    case 'globe': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
    case 'zap': return <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    case 'code': return <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
    case 'target': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></svg>
    default: return <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
  }
}

export default function LandingPage() {
  const [phase, setPhase] = useState(0)
  const [dotOpen, setDotOpen] = useState(false)
  const [termVisible, setTermVisible] = useState(false)
  const [termLines, setTermLines] = useState<boolean[]>(new Array(TERM_LINES.length).fill(false))
  const termRef = useRef<HTMLDivElement>(null)
  const revealRefs = useRef<(HTMLDivElement | null)[]>([])
  const mcRefs = useRef<(HTMLDivElement | null)[]>([])



  const handlePhaseChange = useCallback((p: number) => setPhase(p), [])

  // Reveal-on-scroll observer
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') })
    }, { threshold: 0.1 })
    revealRefs.current.forEach(el => { if (el) obs.observe(el) })
    mcRefs.current.forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  // Terminal type effect
  useEffect(() => {
    if (!termVisible) return
    TERM_LINES.forEach((_, i) => {
      setTimeout(() => setTermLines(prev => { const n = [...prev]; n[i] = true; return n }), i * 210)
    })
  }, [termVisible])

  useEffect(() => {
    const el = termRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) { setTermVisible(true); obs.disconnect() }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const marqueeItems = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

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
          <a href="#features" className="nav-tab">Features</a>
          <a href="#how" className="nav-tab">How It Works</a>
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
          <h1>The Home of<br /><em>Stablecoins.</em></h1>
          <p>Lumma is the stablecoin hub on Arc — bridge and swap USDC across chains, run USDC payroll for your team and AI agents, and settle in seconds. USDC is the gas.</p>

        </div>
        <div className="hero-bottom">
          <div className="hero-stats">
            <div className="hs"><div className="hs-v">20+</div><div className="hs-l">Chains</div></div>
            <div className="hs"><div className="hs-v">{'<'}1s</div><div className="hs-l">Finality</div></div>
            <div className="hs"><div className="hs-v">USDC</div><div className="hs-l">Gas Token</div></div>
          </div>
        </div>
      </div>

      {/* SCROLL SPACER - drives the ball animation */}
      <div className="lp-spacer" />

      {/* CONTENT - normal document flow, black background covers canvas */}
      <div className="lp-content">
        <div className="mbar">
          {[
            { v: '20+', l: 'Chains Supported' },
            { v: '<1s', l: 'Average Finality' },
            { v: '$0', l: 'ETH for Gas' },
            { v: 'CCTP v2', l: 'Bridge Protocol' },
          ].map((s, i) => (
            <div className="mc" key={i} ref={el => { mcRefs.current[i] = el }} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="mv">{s.v}</div>
              <div className="ml">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mq-w">
          <div className="mq">
            {marqueeItems.map((item, i) => (
              <div className="mqi" key={i}><SvgIcon name={item.icon} />{item.label}</div>
            ))}
          </div>
        </div>

        <div className="sec" id="about">
          <div className="rev" ref={el => { revealRefs.current[0] = el }}>
            <span className="stag">What Lumma does</span>
            <h2 className="stit">Everything you need for<br />stablecoin operations.</h2>
            <p className="ssub">Five purpose-built modules for bridging, swapping, balances, cross-border payments, and yield. All on Arc Network.</p>
          </div>
          <div className="bento rev" ref={el => { revealRefs.current[1] = el }}>
            {FEATURES.map((f, i) => (
              <div className={`bc${f.wide ? ' w' : ''}`} key={i}>
                <div className="ci"><SvgIcon name={f.icon} /></div>
                <div className="ct">{f.title}</div>
                <p className="cb">{f.desc}</p>
                {f.bars && (
                  <div className="mc2">
                    {[30, 48, 38, 78, 95, 84, 68, 58, 100, 74, 62, 90].map((h, j) => (
                      <div className={`br${[3, 4, 5, 8, 11].includes(j) ? ' h' : ''}`} key={j} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                )}
                {f.glow && <div className="cgl" />}
              </div>
            ))}
          </div>
        </div>

        <div className="sec" id="how">
          <div className="rev" ref={el => { revealRefs.current[2] = el }}>
            <span className="stag">How it works</span>
            <h2 className="stit">Three steps. That is it.</h2>
          </div>
          <div className="hg rev" ref={el => { revealRefs.current[3] = el }}>
            <div className="steps">
              {STEPS.map((s, i) => (
                <div className="sr" key={i}>
                  <div className="sn">{s.n}</div>
                  <div className="sb"><h3>{s.title}</h3><p>{s.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="term" ref={termRef}>
              <div className="tbar"><div className="td r" /><div className="td y" /><div className="td g" /></div>
              <div className="tbody">
                {TERM_LINES.map((line, i) => (
                  <div className={`tl${termLines[i] ? ' show' : ''}`} key={i}>
                    {line.blank ? '\u00A0' : <>
                      {line.pr && <span className="pr">$ </span>}
                      {line.ok && <span className="ok">{line.text?.split(' ')[0]} </span>}
                      {line.dim ? (
                        <span style={{ color: 'rgba(240,236,255,.18)' }}>{line.text}</span>
                      ) : (
                        line.ok ? line.text?.slice((line.text?.indexOf(' ') ?? 0) + 1) : line.text
                      )}
                      {line.dim2 && <span style={{ color: 'rgba(240,236,255,.18)' }}> {line.dim2}</span>}
                      {line.cursor && <span className="tcur" />}
                    </>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="ctaw">
          <div className="ctab rev" ref={el => { revealRefs.current[4] = el }}>
            <h2>Built for stablecoins.</h2>
            <p>Cross-chain swaps, unified balances, and programmable payments — all on Arc.</p>
            <div className="ctaf">
              <a href="https://testnet.lumma.xyz" className="bl s">Try Testnet</a>
              <a href="https://docs.lumma.xyz" className="bl o">Read the docs</a>
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
            <li><a href="#about">About</a></li>
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
