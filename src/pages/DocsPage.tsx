import { useState, useEffect } from 'react'
import ShaderBackground from '../components/ShaderBackground'
import './DocsPage.css'

type Section = 'home' | 'intro' | 'why' | 'bridge' | 'balance' | 'points' | 'send' | 'agents' | 'yield' | 'arch' | 'security' | 'roadmap' | 'sdk'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'intro' as Section, label: 'Introduction' },
      { id: 'why' as Section, label: 'Why Lumma' },
    ],
  },
  {
    label: 'Products',
    items: [
      { id: 'bridge' as Section, label: 'Bridge & Swap' },
      { id: 'balance' as Section, label: 'Unified Balance' },
      { id: 'points' as Section, label: 'Points' },
      { id: 'send' as Section, label: 'FX Send' },
      { id: 'agents' as Section, label: 'Agent Payroll' },
      { id: 'yield' as Section, label: 'Yield Radar' },
    ],
  },
  {
    label: 'Technical',
    items: [
      { id: 'arch' as Section, label: 'Architecture' },
      { id: 'security' as Section, label: 'Security' },
      { id: 'roadmap' as Section, label: 'Roadmap' },
    ],
  },
  {
    label: 'Developers',
    items: [
      { id: 'sdk' as Section, label: 'Payroll SDK' },
    ],
  },
]

const CATEGORY_CARDS = [
  { title: 'Getting Started', desc: 'Learn the core concepts behind Lumma and set up your wallet.', section: 'intro' as Section },
  { title: 'Bridge & Swap', desc: 'Move and exchange stablecoins across supported networks.', section: 'bridge' as Section },
  { title: 'Unified Balance', desc: 'View your stablecoin balances across multiple chains.', section: 'balance' as Section },
  { title: 'FX Send', desc: 'Send USDC and let recipients receive local stablecoins.', section: 'send' as Section },
  { title: 'Agent Payroll', desc: 'USDC payroll for hybrid teams — people, contractors, and AI agents.', section: 'agents' as Section },

  { title: 'Yield Radar', desc: 'Discover stablecoin yield opportunities across protocols.', section: 'yield' as Section },
  { title: 'Payroll SDK', desc: 'Embed programmable USDC payroll into your platform with a few lines of code.', section: 'sdk' as Section },
]

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7M17 7H7M17 7v10" />
  </svg>
)

// Flat, searchable index of every doc section.
const SEARCH_INDEX: { id: Section; label: string; group: string; keywords: string }[] =
  NAV_GROUPS.flatMap(g => g.items.map(it => ({
    id: it.id,
    label: it.label,
    group: g.label,
    keywords: `${it.label} ${g.label}`.toLowerCase(),
  })))

export default function DocsPage() {
  const [section, setSection] = useState<Section>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ⌘K / Ctrl+K to open search, Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const navigate = (id: Section) => {
    setSection(id)
    setMenuOpen(false)
    setSearchOpen(false)
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const results = query.trim()
    ? SEARCH_INDEX.filter(s => s.keywords.includes(query.trim().toLowerCase()))
    : SEARCH_INDEX


  return (
    <div className={`docs${section === 'home' ? ' docs--home' : ''}`}>
      {/* Header — only shown on section pages (home has its own floating nav) */}
      {section !== 'home' && (
        <header className={`docs-header${scrolled ? ' scrolled' : ''}`}>
          <div className="docs-header-l">
            <button className="docs-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            <a href="#" className="docs-logo" onClick={e => { e.preventDefault(); navigate('home'); }}>
              <img src="/images/lumma.svg" alt="Lumma" />
              Lumma <span className="docs-logo-tag">Docs</span>
            </a>
          </div>
          <div className="docs-header-r">
            <button className="docs-header-search" onClick={() => setSearchOpen(true)} aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            </button>
            <a href="https://testnet.lumma.xyz" className="docs-header-cta">Use Lumma</a>
          </div>
        </header>
      )}

      {menuOpen && <div className="docs-overlay" onClick={() => setMenuOpen(false)} />}

      {/* ── HOME — Cinematic Hero ── */}
      {section === 'home' && (
        <>
          <section className="docs-hero" id="docs-hero">
            {/* Floating glassmorphism navbar */}
            <nav className="docs-hero-nav">
              <div className="docs-hero-nav-left">
                <button className="docs-hero-nav-logo" onClick={() => navigate('home')}>
                  <img src="/images/lumma.svg" alt="Lumma" />
                  <span>Lumma</span>
                  <span className="docs-hero-nav-tag">Docs</span>
                </button>
              </div>
              <div className="docs-hero-nav-links">
                <button className="docs-hero-nav-link" onClick={() => navigate('intro')}>Overview</button>
                <button className="docs-hero-nav-link" onClick={() => navigate('bridge')}>Products</button>
                <button className="docs-hero-nav-link" onClick={() => navigate('agents')}>Agent Payroll</button>
                <button className="docs-hero-nav-link" onClick={() => navigate('arch')}>Architecture</button>
              </div>
              <div className="docs-hero-nav-right">
                <button className="docs-hero-nav-search" onClick={() => setSearchOpen(true)} aria-label="Search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                </button>
                <a href="https://testnet.lumma.xyz" className="docs-hero-nav-cta">Use Lumma</a>
              </div>
            </nav>

            {/* WebGL shader background */}
            <div className="docs-hero-bg">
              <ShaderBackground />
            </div>

            {/* Gradient overlay layers */}
            <div className="docs-hero-overlay" />

            {/* Hero content — bottom-left */}
            <div className="docs-hero-content">
              <h1 className="docs-hero-headline">
                Stablecoin finance,<br />
                <span className="accent">documented.</span>
              </h1>
              <p className="docs-hero-desc">
                Everything you need to bridge, swap, pay teams, and build on Lumma — 
                the stablecoin infrastructure layer for Arc Network.
              </p>
              <div className="docs-hero-actions">
                <button className="docs-hero-btn-primary" onClick={() => navigate('intro')}>
                  Get Started
                </button>
                <button className="docs-hero-btn-secondary" onClick={() => setSearchOpen(true)}>
                  Search Docs ⌘K
                </button>
              </div>
            </div>

          </section>

          {/* Below-hero content — dark theme */}
          <div className="docs-home-body">
            <div className="docs-home-inner">
              {/* Search Feature */}
              <div className="docs-search-card">
                <h2>Find the answers<br />you need.</h2>
                <button type="button" className="docs-search-field" onClick={() => setSearchOpen(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  <span>Search documentation</span>
                  <kbd>⌘K</kbd>
                </button>
              </div>

              {/* Category Cards */}
              <div className="docs-cards-section">
                <div className="docs-cards-heading">Explore Documentation</div>
                <div className="docs-cards-grid">
                  {CATEGORY_CARDS.map(card => (
                    <div key={card.title} className="docs-card" onClick={() => navigate(card.section)}>
                      <div className="docs-card-arrow"><ArrowIcon /></div>
                      <h3>{card.title}</h3>
                      <p>{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <footer className="docs-footer">
                <div className="docs-footer-grid">
                  <div>
                    <div className="docs-footer-heading">Product</div>
                    <a href="#" className="docs-footer-link" onClick={e => { e.preventDefault(); navigate('bridge'); }}>Bridge &amp; Swap</a>
                    <a href="#" className="docs-footer-link" onClick={e => { e.preventDefault(); navigate('balance'); }}>Unified Balance</a>
                    <a href="#" className="docs-footer-link" onClick={e => { e.preventDefault(); navigate('send'); }}>FX Send</a>
                    <a href="#" className="docs-footer-link" onClick={e => { e.preventDefault(); navigate('agents'); }}>Agent Payroll</a>
                  </div>
                  <div>
                    <div className="docs-footer-heading">Developers</div>
                    <a href="#" className="docs-footer-link" onClick={e => { e.preventDefault(); navigate('arch'); }}>Architecture</a>
                    <a href="https://github.com/Krusherk/lumma" target="_blank" rel="noopener noreferrer" className="docs-footer-link">GitHub</a>
                  </div>
                  <div>
                    <div className="docs-footer-heading">Community</div>
                    <a href="https://x.com/lummaxyz" target="_blank" rel="noopener noreferrer" className="docs-footer-link">X (Twitter)</a>
                    <a href="mailto:support@lumma.xyz" className="docs-footer-link">support@lumma.xyz</a>
                  </div>
                  <div>
                    <div className="docs-footer-heading">Legal</div>
                    <a href="#" className="docs-footer-link">Privacy Policy</a>
                    <a href="#" className="docs-footer-link">Terms of Service</a>
                  </div>
                </div>
                <div className="docs-footer-bottom">
                  <a href="/" className="docs-footer-logo"><img src="/images/lumma.svg" alt="Lumma" /> Lumma</a>
                </div>
                <p className="docs-footer-legal">Lumma is a stablecoin finance platform built on Arc Network. All transactions are on-chain. Lumma does not custody funds or hold private keys. For support, reach us at <a href="mailto:support@lumma.xyz" style={{color: 'rgba(168,85,247,.55)'}}>support@lumma.xyz</a>.</p>
              </footer>
            </div>
          </div>
        </>
      )}

      {/* ── SECTION PAGES ── */}
      {section !== 'home' && (
        <div className="docs-page">
          <div className="docs-layout">
            <aside className={`docs-sidebar${menuOpen ? ' open' : ''}`}>
              <button className="docs-nav-item" onClick={() => navigate('home')} style={{ color: '#7657ff', marginBottom: 16 }}>← Docs Home</button>
              {NAV_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="docs-sidebar-label">{group.label}</div>
                  {group.items.map(item => (
                    <button key={item.id} className={`docs-nav-item${section === item.id ? ' active' : ''}`} onClick={() => navigate(item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </aside>

            <main className="docs-content">
              {section === 'intro' && <SectionIntro />}
              {section === 'why' && <SectionWhy />}
              {section === 'bridge' && <SectionBridge />}
              {section === 'balance' && <SectionBalance />}
              {section === 'points' && <SectionPoints />}
              {section === 'send' && <SectionSend />}
              {section === 'agents' && <SectionAgents />}
              {section === 'yield' && <SectionYield />}
              {section === 'arch' && <SectionArch />}
              {section === 'security' && <SectionSecurity />}
              {section === 'roadmap' && <SectionRoadmap />}
              {section === 'sdk' && <SectionSdk />}
            </main>
          </div>
        </div>
      )}

      {/* ── Search modal ── */}
      {searchOpen && (
        <div className="docs-search-modal" onClick={() => setSearchOpen(false)}>
          <div className="docs-search-box" onClick={e => e.stopPropagation()}>
            <div className="docs-search-input-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && results[0]) navigate(results[0].id) }}
                placeholder="Search documentation..."
                className="docs-search-input"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="docs-search-results">
              {results.length === 0 && <div className="docs-search-empty">No results for “{query}”.</div>}
              {results.map(r => (
                <button key={r.id} className="docs-search-result" onClick={() => navigate(r.id)}>
                  <span className="docs-search-result-label">{r.label}</span>
                  <span className="docs-search-result-group">{r.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════ Section Components ═══════════════════════ */


function SectionIntro() {
  return (
    <section>
      <h1>What is Lumma?</h1>
      <p className="docs-lead">Lumma is a stablecoin finance application built natively on <strong>Arc Network</strong> — Circle's Layer 1 blockchain designed for programmable money movement.</p>
      <p>We built Lumma because the stablecoin experience is fragmented. You need one app to bridge, another to swap, a third to check your balance across chains. Lumma brings six core modules into one interface.</p>
      <p>Arc Network provides the primitives: USDC is the native gas token (no ETH needed), finality is sub-second, and Circle's CCTP v2 enables native cross-chain transfers without wrapped tokens.</p>
      <div className="docs-callout">
        <div className="docs-callout-title">Who is this for?</div>
        <p>Treasury operators, cross-border payment teams, DeFi users, and AI agent operators — anyone who works with stablecoins regularly.</p>
      </div>
      <h2>Platform at a glance</h2>
      <div className="docs-grid">
        <div className="docs-grid-item"><div className="docs-grid-num">20+</div><div className="docs-grid-label">Chains Supported</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">{'<'}1s</div><div className="docs-grid-label">Finality</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">USDC</div><div className="docs-grid-label">Gas Token</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">6</div><div className="docs-grid-label">Modules</div></div>
      </div>
    </section>
  )
}

function SectionWhy() {
  return (
    <section>
      <h1>Why we built Lumma</h1>
      <p>Stablecoins are the most practical blockchain application. Over $150B moves across chains monthly, but the tooling hasn't kept up.</p>
      <h3>Fragmentation</h3>
      <p>Bridge app, DEX, portfolio tracker — each a separate product with its own connection. Lumma unifies everything.</p>
      <h3>Wrapped token risk</h3>
      <p>Most bridges lock tokens and mint synthetics. CCTP v2 burns real USDC on source and mints real USDC on destination. No derivatives.</p>
      <h3>Gas friction</h3>
      <p>On Arc Network, USDC is the gas token. Start transacting immediately — no ETH bootstrapping needed.</p>
    </section>
  )
}

function SectionBridge() {
  return (
    <section>
      <h1>Bridge & Swap</h1>
      <span className="docs-status live">Live on Testnet</span>
      <p>Move USDC between chains (bridging) and convert between stablecoins on the same chain (swapping).</p>
      <h3>How bridging works</h3>
      <ol>
        <li><strong>Approve</strong> — Your wallet authorizes the CCTP contract.</li>
        <li><strong>Burn</strong> — USDC is genuinely destroyed on the source chain.</li>
        <li><strong>Attestation</strong> — Circle creates cryptographic proof.</li>
        <li><strong>Mint</strong> — Fresh native USDC is minted on the destination.</li>
      </ol>
      <p>Under a second on most routes. No liquidity pools, no slippage, no wrapped token risk.</p>
      <h3>Supported chains</h3>
      <p>Ethereum, Base, Arbitrum, Polygon, Optimism, Avalanche, Solana, and Arc Network — 20+ networks via CCTP v2.</p>
      <div className="docs-callout">
        <div className="docs-callout-title">Why this matters</div>
        <p>Traditional bridges: 0.1-0.5% fees, 10-30 min, wrapped token risk. CCTP v2: near-zero cost, seconds, native USDC.</p>
      </div>
    </section>
  )
}

function SectionBalance() {
  return (
    <section>
      <h1>Unified Balance</h1>
      <span className="docs-status live">Live on Testnet</span>
      <p>Multi-chain portfolio dashboard aggregating your stablecoin holdings in real time across every supported chain.</p>
      <h3>Capabilities</h3>
      <ul>
        <li><strong>Real-time aggregation</strong> — Batch multicall across 6 chains, auto-refreshes every 15 seconds.</li>
        <li><strong>Multi-stablecoin</strong> — Tracks USDC and EURC in a single view.</li>
        <li><strong>Portfolio breakdown</strong> — Per-chain balance with percentage allocation.</li>
      </ul>
    </section>
  )
}

function SectionPoints() {
  return (
    <section>
      <h1>Points</h1>
      <span className="docs-status soon">Coming Soon</span>
      <p>Reward system tracking platform activity. Every swap, bridge, and transaction earns points. Testnet activity carries to mainnet.</p>
      <h3>How points work</h3>
      <ul>
        <li><strong>Swap</strong> — Earn for every token swap.</li>
        <li><strong>Bridge</strong> — Earn for cross-chain transfers.</li>
        <li><strong>Daily activity</strong> — Bonus for consistent usage.</li>
        <li><strong>Module exploration</strong> — Bonus for using multiple modules.</li>
      </ul>
    </section>
  )
}

function SectionSend() {
  return (
    <section>
      <h1>FX Send</h1>
      <span className="docs-status soon">Coming Soon</span>
      <p>Cross-border payment flow: you hold USDC, your recipient needs EURC. FX Send collapses bridge, swap, and send into one action.</p>
      <h3>Use cases</h3>
      <ul>
        <li><strong>Remittance</strong> — Send USDC, recipient receives EURC. No SWIFT fees.</li>
        <li><strong>Contractor payments</strong> — Pay in their preferred stablecoin.</li>
        <li><strong>Treasury operations</strong> — Move funds between regional treasuries.</li>
      </ul>
    </section>
  )
}

function SectionAgents() {
  return (
    <section>
      <h1>Agent Payroll</h1>
      <span className="docs-status live">Live on Testnet</span>
      <p>Agent Payroll is payroll infrastructure for <strong>hybrid teams</strong> — human employees, contractors, and AI agents — all paid in USDC from a single vault on Arc.</p>

      <h3>One vault, two ways to pay</h3>
      <ul>
        <li><strong>People &amp; contractors</strong> — traditional payroll on a schedule (weekly, bi-weekly, or monthly) for a set USDC amount.</li>
        <li><strong>AI agents</strong> — usage-based pay. Agents earn per task completed, and earnings can accumulate until you approve them or settle automatically.</li>
      </ul>

      <h3>How it works</h3>
      <ol>
        <li><strong>Create a vault</strong> — your dedicated USDC payroll account on Arc.</li>
        <li><strong>Fund it</strong> — top up the vault with USDC.</li>
        <li><strong>Add your team</strong> — contractors with a wallet and amount; AI agents with a one-time linking code.</li>
        <li><strong>Set the rules</strong> — pay schedules for people, and per-task rates (with optional daily and monthly caps) for agents.</li>
        <li><strong>Pay</strong> — run payroll for people, and approve or auto-settle agent earnings. Every payment produces a shareable receipt.</li>
      </ol>

      <h3>Connecting an AI agent</h3>
      <p>Generate a linking code, then install the Lumma Payroll Skill into your agent. Once linked, the agent reports completed work to Lumma, Lumma prices each task using the rules you set, and the agent's pending balance grows until settlement — for example, "Research Agent completed 10 reports — pending payout 0.50 USDC."</p>

      <h3>Settlement options</h3>
      <ul>
        <li><strong>Manual</strong> — review pending work and approve payouts yourself.</li>
        <li><strong>Automatic</strong> — payouts under a threshold you set settle on their own.</li>
        <li><strong>Batched</strong> — many small earnings accumulate and settle together once they reach a chosen amount, keeping micro-payments efficient.</li>
      </ul>

      <div className="docs-callout">
        <div className="docs-callout-title">Why hybrid teams</div>
        <p>Modern teams aren't only people. Lumma lets you pay employees, contractors, and autonomous AI agents from one USDC vault — scheduled wages for humans, usage-based settlement for machines.</p>
      </div>
    </section>
  )
}


function SectionYield() {
  return (
    <section>
      <h1>Yield Radar</h1>
      <span className="docs-status soon">Coming Soon</span>
      <p>Scans DeFi protocols across chains to surface stablecoin yield opportunities in one comparable view.</p>
      <ul>
        <li><strong>Cross-chain aggregation</strong> — Compare APYs from lending, LPs, and vaults.</li>
        <li><strong>Risk scoring</strong> — Based on audit status, TVL, and track record.</li>
        <li><strong>One-click deposit</strong> — Bridge and deposit in one flow.</li>
      </ul>
      <div className="docs-callout">
        <div className="docs-callout-title">Our approach to risk</div>
        <p>No auto-deposits without consent. No high-APY recommendations without transparent risk disclosure.</p>
      </div>
    </section>
  )
}

function SectionArch() {
  return (
    <section>
      <h1>Architecture</h1>
      <p>Lumma is built natively on <strong>Arc Network</strong>. It's an interface to on-chain stablecoin movement — not a service that sits between you and your money.</p>
      <h3>Built on Arc</h3>
      <ul>
        <li><strong>USDC is the gas token</strong> — transact without holding ETH.</li>
        <li><strong>Sub-second finality</strong> — payments confirm in under a second.</li>
        <li><strong>Native USDC</strong> — cross-chain transfers move real USDC, never wrapped tokens.</li>
      </ul>
      <h3>Non-custodial by default</h3>
      <p>Lumma never holds, controls, or accesses your personal funds. Transactions are authorized by you and settle on-chain. Payroll vaults are dedicated USDC accounts kept separate from your personal wallet.</p>

    </section>
  )
}

function SectionSecurity() {
  return (
    <section>
      <h1>Security</h1>
      <p>Security is a core design constraint, not a marketing bullet point.</p>
      <h3>Our principles</h3>
      <ul>
        <li><strong>You hold your keys</strong> — Lumma never sees or stores your private keys.</li>
        <li><strong>On-chain by default</strong> — payments settle on Arc and are publicly verifiable.</li>
      </ul>

      <h3>What we will never do</h3>
      <ul>
        <li>Ask for your seed phrase or private key.</li>
        <li>Require unlimited token spending approvals.</li>
        <li>Run a centralized backend that handles your personal funds.</li>
        <li>Auto-invest without explicit consent.</li>
      </ul>

      <div className="docs-callout">
        <div className="docs-callout-title">Report a vulnerability</div>
        <p>If you discover a security issue, please report it responsibly to <a href="mailto:support@lumma.xyz">support@lumma.xyz</a>. We take every report seriously and will respond promptly.</p>
      </div>
    </section>
  )
}

function SectionRoadmap() {
  return (
    <section>
      <h1>Roadmap</h1>
      <p>Building module by module. Each ships when it's ready.</p>
      <div className="docs-timeline">
        <div className="docs-tl-item done"><div className="docs-tl-dot" /><div className="docs-tl-content"><h3>May 2026 — Platform Launch</h3><p>Landing page, docs, testnet. Bridge & Swap + Unified Balance live.</p></div></div>
        <div className="docs-tl-item done"><div className="docs-tl-dot" /><div className="docs-tl-content"><h3>June 2026 — Agent Payroll</h3><p>USDC payroll for hybrid teams — people, contractors, and AI agents from one vault.</p></div></div>
        <div className="docs-tl-item done"><div className="docs-tl-dot" /><div className="docs-tl-content"><h3>July 2026 — A2A Nanopayments</h3><p>Agent-to-agent nanopayment network. Autonomous hiring, budget caps, atomic settlement.</p></div></div>
        <div className="docs-tl-item done"><div className="docs-tl-dot" /><div className="docs-tl-content"><h3>August 2026 — Embedded Payroll SDK</h3><p>"Stripe for Agents" — external platforms can embed Lumma payroll with a few API calls.</p></div></div>
        <div className="docs-tl-item"><div className="docs-tl-dot" /><div className="docs-tl-content"><h3>Q3 2026 — Points + FX Send</h3><p>Points reward system. FX Send with real-time stablecoin conversion.</p></div></div>
        <div className="docs-tl-item"><div className="docs-tl-dot" /><div className="docs-tl-content"><h3>Q4 2026 — Yield Radar + Mainnet</h3><p>Cross-chain yield aggregator. Production mainnet launch.</p></div></div>
      </div>
      <div className="docs-callout">
        <div className="docs-callout-title">A note on timelines</div>
        <p>These dates reflect our plan, not a promise. We'd rather ship solid than ship fast.</p>
      </div>
    </section>
  )
}

function SectionSdk() {
  return (
    <section>
      <h1>Embedded Payroll SDK</h1>
      <span className="docs-status live">Live on Testnet</span>
      <p className="docs-lead">
        The Lumma SDK lets AI agent platforms, developer frameworks, marketplaces, and autonomous organizations integrate 
        <strong> programmable USDC payroll infrastructure</strong> directly into their applications — with just a few API calls.
      </p>

      <div className="docs-callout">
        <div className="docs-callout-title">Stripe for Agents</div>
        <p>
          Platforms where users hire, build, or deploy AI agents can integrate the Lumma SDK without handling money or regulatory risk.
          Lumma handles compliant execution, spending limits, and streaming micropayments natively via Arc.
        </p>
      </div>

      <h2>Overview</h2>
      <p>Lumma abstracts away the complexity of:</p>
      <ul>
        <li><strong>Account abstraction</strong> — no wallet management required by the integrating platform.</li>
        <li><strong>Multi-chain routing</strong> — USDC settlements across supported networks.</li>
        <li><strong>Manual transaction signing</strong> — vault operations are authorized via API key.</li>
        <li><strong>Gas management</strong> — all fees are absorbed; agents never need native tokens.</li>
      </ul>
      <p>Your applications can securely control payroll funds, enforce spending rules, and execute instant USDC settlements on <strong>Arc Testnet</strong>, with gas abstracted from the underlying infrastructure.</p>

      <h2>Quickstart</h2>

      <h3>1. Install the SDK</h3>
      <div className="docs-code">
        <div className="docs-code-header">Terminal</div>
        <pre>{`npm install @lumma-xyz/payroll-sdk`}</pre>
      </div>

      <h3>2. Initialize the Client</h3>
      <div className="docs-code">
        <div className="docs-code-header">JavaScript</div>
        <pre>{`import { LummaClient } from "@lumma-xyz/payroll-sdk";

const lumma = new LummaClient({
  apiKey: process.env.LUMMA_API_KEY,
  network: "arc-testnet",
  defaultGasToken: "USDC"
});`}</pre>
      </div>

      <h2>Core API</h2>

      <h3>Create a Payroll Vault</h3>
      <p>Deploy a dedicated USDC payroll vault for your organization or AI agent ecosystem.</p>
      <div className="docs-code">
        <div className="docs-code-header">JavaScript</div>
        <pre>{`const newVault = await lumma.vaults.create({
  companyName: "Autonomous Code Corp",
  ownerWallet: "0xOrchestratorAdmin...abc",
  fundingSource: "USDC_ARC_TESTNET",
  currency: "USDC"
});

console.log(newVault.vaultAddress);`}</pre>
      </div>

      <h3>Response</h3>
      <div className="docs-code">
        <div className="docs-code-header">JSON</div>
        <pre>{`{
  "status": "success",
  "vaultAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "network": "arc-testnet",
  "balances": { "USDC": "0.00" },
  "features": [
    "multi_vault_switching",
    "agent_nanopayments",
    "gas_abstraction",
    "spending_guardrails",
    "duplicate_prevention"
  ]
}`}</pre>
      </div>

      <h3>Register a Worker</h3>
      <p>Register an AI agent or contractor and configure spending controls.</p>
      <div className="docs-code">
        <div className="docs-code-header">JavaScript</div>
        <pre>{`const worker = await lumma.agents.registerWorker({
  vaultAddress: "0x5FbDB...aa3",
  agentId: "agent_subcontractor_code_auditor_99",
  payoutWallet: "0xWorkerAgentB...xyz",
  spendingLimits: {
    maxPerTransaction: "50.00",
    dailyCap: "500.00",
    rollingIntervalDays: 1
  },
  allowAutonomousHiring: true
});`}</pre>
      </div>

      <h3>Settle a Task</h3>
      <p>Execute an instant USDC payment after successful task completion.</p>
      <div className="docs-code">
        <div className="docs-code-header">JavaScript</div>
        <pre>{`const settlement = await lumma.payments.settleTask({
  vaultAddress: "0x5FbDB...aa3",
  payerAgentId: "agent_orchestrator_main",
  recipientAgentId: "agent_subcontractor_code_auditor_99",
  amount: "12.500250",
  proofOfTaskHash: "0xsha256_compiled_artifact_hash_proof...",
  metadata: {
    taskType: "smart_contract_audit",
    linesAudited: 450
  }
});

console.log(settlement.receipt.txHash);`}</pre>
      </div>

      <h3>Settlement Response</h3>
      <div className="docs-code">
        <div className="docs-code-header">JSON</div>
        <pre>{`{
  "settlementStatus": "CONFIRMED",
  "timestamp": 1785680100,
  "receipt": {
    "txHash": "0x9c83b8a1c...f32",
    "amountPaid": "12.500250",
    "asset": "USDC",
    "arcGasFeesPaid": "0.00",
    "verificationLink": "https://explorer.testnet.arc.xyz/tx/..."
  },
  "accounting": {
    "remainingVaultBalance": "14250.749750",
    "agentRemainingDailyCap": "487.499750"
  }
}`}</pre>
      </div>

      <h2>Architecture</h2>

      <h3>Smart Settlement Protection</h3>
      <p>Every settlement request is validated against a cryptographic nonce database to prevent duplicate payments. If an agent retries the same transaction because of network latency or temporary failures, Lumma recognizes the duplicate <strong>proofOfTaskHash</strong> and safely ignores subsequent requests.</p>

      <h3>Native Gas Abstraction</h3>
      <p>Applications built with Lumma do not need to fund worker wallets with separate gas tokens. All transaction fees are automatically abstracted and paid from the vault's USDC balance, allowing agents to operate without managing native network tokens.</p>

      <h3>Spending Guardrails</h3>
      <p>Configure programmable spending policies for every worker:</p>
      <ul>
        <li><strong>Maximum payment per transaction</strong></li>
        <li><strong>Daily spending limits</strong></li>
        <li><strong>Rolling spending windows</strong></li>
        <li><strong>Autonomous hiring permissions</strong></li>
        <li><strong>Vault-level access control</strong></li>
      </ul>

      <h3>Multi-Vault Management</h3>
      <p>Organizations can create multiple isolated payroll vaults for different teams, projects, departments, or autonomous agent swarms. Each vault maintains independent balances, permissions, and accounting.</p>

      <h3>Pay-per-Token Streaming</h3>
      <p>Configure real-time streaming payments where agents pay for exact resource consumption:</p>
      <div className="docs-code">
        <div className="docs-code-header">JavaScript</div>
        <pre>{`// Configure streaming: pay 0.001 USDC per API call
await lumma.streams.configure({
  vaultAddress: "0x5FbDB...aa3",
  agentId: "agent_data_scraper_01",
  ratePerUnit: "0.001000",
  unitType: "api_call",
  maxBudget: "100.00",
  clampOnBudgetHit: true
});`}</pre>
      </div>

      <div className="docs-grid">
        <div className="docs-grid-item"><div className="docs-grid-num">6</div><div className="docs-grid-label">API Actions</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">$0.00</div><div className="docs-grid-label">Gas Fees</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">&lt;1s</div><div className="docs-grid-label">Settlement Time</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">∞</div><div className="docs-grid-label">Agents per Vault</div></div>
      </div>

      <h2>Supported Network</h2>
      <div className="docs-grid">
        <div className="docs-grid-item"><div className="docs-grid-num">Arc Testnet</div><div className="docs-grid-label">✅ Supported</div></div>
        <div className="docs-grid-item"><div className="docs-grid-num">Mainnet</div><div className="docs-grid-label">Coming Soon</div></div>
      </div>

      <h2>Example Workflow</h2>
      <ol>
        <li><strong>Create a payroll vault</strong> — provision via SDK.</li>
        <li><strong>Fund the vault</strong> — send USDC to the vault address.</li>
        <li><strong>Register AI agents or contractors</strong> — assign identifiers and wallets.</li>
        <li><strong>Configure spending policies</strong> — set per-transaction and daily caps.</li>
        <li><strong>Trigger settlements</strong> — settle as tasks complete, with proof hashes.</li>
        <li><strong>Monitor</strong> — check balances and transaction history via API.</li>
      </ol>

      <h2>Security</h2>
      <p>Lumma provides infrastructure-level safeguards:</p>
      <ul>
        <li><strong>Duplicate payment prevention</strong> — cryptographic proof hashes ensure idempotency.</li>
        <li><strong>Programmable spending limits</strong> — per-transaction, daily, and monthly caps.</li>
        <li><strong>Vault isolation</strong> — each vault is an independent financial boundary.</li>
        <li><strong>API key scoping</strong> — granular permissions per key.</li>
        <li><strong>USDC-native settlement</strong> — no wrapped tokens, no bridge risk.</li>
        <li><strong>Gas abstraction</strong> — zero native token exposure for agents.</li>
      </ul>

      <div className="docs-callout">
        <div className="docs-callout-title">Arc Alignment</div>
        <p>
          The SDK mirrors Arc's thesis of infrastructure abstraction. Lumma becomes the frictionless financial layer under the hood of developer tools — 
          maximizing the utility of USDC as a native gas/payment token and showcasing high-throughput, hyper-efficient stablecoin architecture.
        </p>
      </div>
    </section>
  )
}
