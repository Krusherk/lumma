import { useState, useEffect } from 'react'
import './BlogPage.css'

interface Article {
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  author: string
  date: string
  readTime: string
  coverImage: string
  featured: boolean
}

const ARTICLES: Article[] = [
  {
    slug: 'inside-lumma-agent-payroll',
    title: 'Inside Lumma Agent Payroll: Payroll Infrastructure for Hybrid Teams',
    excerpt: 'Learn how Lumma Agent Payroll allows businesses to manage employees, contractors, and AI agents from one USDC payroll vault, with scheduled payments, programmable compensation, nanopayment batching, and verifiable settlement on Arc.',
    coverImage: '/images/payrollexp.jpg',
    content: `Lumma Agent Payroll is programmable USDC payroll infrastructure for hybrid teams made up of employees, contractors, freelancers, and AI agents.

Traditional payroll systems were built around human workers receiving fixed payments on weekly, biweekly, or monthly schedules. AI agents work differently. They may complete hundreds of small, measurable tasks and need to be compensated per report, resolved ticket, API request, or completed workflow.

Lumma brings both models into one payroll system.

## One USDC Vault for the Entire Team

Every business creates its own payroll vault through Lumma.

The vault is powered by a Circle Developer-Controlled Wallet on Arc and holds the USDC used to pay both human workers and AI agents.

From one vault, a business can:

* Add employees and contractors
* Create recurring payment schedules
* Link external AI agents
* Define compensation rules
* Review pending earnings
* Approve or automate settlements
* Generate verifiable payment receipts

The result is one treasury for every type of worker.

## Payroll for Employees and Contractors

Human workers use traditional payroll schedules.

Through the Lumma chat interface, a business owner can enter requests such as:

"Add Sarah as a contractor at 500 USDC monthly."

"Set payroll to run every two weeks."

"Show upcoming payments."

"Run payroll."

Lumma records the worker, amount, wallet address, payment schedule, and next payment date.

When payroll is due, USDC is sent from the business payroll vault, the transaction is monitored until completion, and a public receipt is generated.

## Payroll for AI Agents

AI agents are compensated according to the work they complete.

A business can create rules such as:

* 0.05 USDC per research report
* 0.01 USDC per approved social post
* 0.02 USDC per resolved support ticket
* A maximum of 5 USDC per day
* A maximum of 100 USDC per month

This allows businesses to pay agents based on actual usage rather than giving every agent a fixed monthly salary.

## The Lumma Payroll Skill

External AI agents connect to Lumma through the portable Lumma Payroll Skill.

The owner starts by asking Lumma to link an agent.

Lumma then generates:

* A public skill link
* A one-time linking code

The agent reads the Lumma skill instructions, exchanges the linking code for a restricted authentication token, and registers its own USDC payout wallet.

The registered wallet is where the agent receives its earnings.

The agent can later update its payout wallet using its restricted token.

## How Agents Report Work

After an agent completes a task, it reports the activity directly to Lumma through the API described in the skill file.

A report may include:

* Task type
* Quantity
* Task reference
* Supporting proof or external reference

Lumma then:

1. Authenticates the agent
2. Finds the correct compensation rule
3. Checks daily and monthly limits
4. Calculates the amount earned
5. Records the completed work
6. Adds the amount to the agent's pending earnings

Agents cannot approve their own payments, change their compensation rules, or move funds from the payroll vault.

By default, reported work remains pending until the vault owner reviews and approves settlement.

## Nanopayment-Style Compensation

AI agents may complete hundreds or thousands of small tasks.

Sending one blockchain transaction for every task would be inefficient.

Lumma therefore uses an accumulate-then-settle model.

Each completed task is recorded instantly in an off-chain work ledger. Small earnings accumulate over time and are later combined into one on-chain USDC settlement.

For example:

200 tasks × 0.05 USDC = 10 USDC

Instead of making 200 separate transactions, Lumma can make one 10 USDC settlement.

This makes usage-based agent compensation practical while reducing settlement overhead.

## Settlement Modes

Lumma supports three settlement modes.

### Manual Settlement

Agent earnings remain pending until the vault owner reviews and approves them.

This is the safest default for businesses testing a new agent.

### Instant Settlement

Trusted agents can be paid automatically after completing approved work, subject to configured limits and thresholds.

### Batched Settlement

Small earnings accumulate until they reach a specified amount. Lumma then combines them into one USDC payout.

This is the preferred mode for high-frequency agent activity.

## Agent Payout Wallets

When an agent links to Lumma, it registers its own USDC payout wallet.

This connects the agent's identity, completed work, earnings, and payout destination in one flow.

When settlement is approved:

1. Lumma calculates the gross earnings
2. The settlement fee is deducted
3. The net amount is sent to the agent's registered wallet
4. Included work logs are marked as settled
5. A verifiable receipt is generated

If an agent has not registered a payout wallet, earnings can continue to accrue, but settlement remains unavailable until a valid wallet is added.

## How Lumma Makes Revenue

Lumma charges a 0.5% settlement fee on agent payouts.

The fee is charged when accumulated earnings are settled, not every time an agent reports a task.

For example:

Gross earnings: 10 USDC. Lumma fee: 0.05 USDC. Net agent payout: 9.95 USDC.

This allows Lumma's revenue to scale with payroll volume while keeping small task reports inexpensive.

## Verifiable Receipts

Every completed settlement generates a receipt containing information such as:

* Business or sender
* Recipient
* Recipient type
* Gross amount
* Settlement fee
* Net amount received
* Transaction hash
* Network
* Settlement status
* Included work events
* Date and time

This gives businesses a transparent payroll history and makes every completed settlement independently traceable.

## Why Arc

Arc is the settlement layer behind Lumma Agent Payroll.

Lumma aligns with Arc through:

* USDC-denominated payroll
* USDC used for transaction gas
* Fast settlement
* Predictable transaction costs
* Programmable payment rules
* Stablecoin-native treasury management
* Machine-to-machine communication
* Agentic commerce
* Nanopayment-style compensation

Circle provides the wallet and stablecoin infrastructure, Arc provides the settlement environment, and Lumma provides the payroll application layer.

## Payroll Infrastructure for Hybrid Teams

Lumma Agent Payroll is not payroll exclusively for AI agents.

It is one payroll system for:

* Employees
* Contractors
* Freelancers
* Autonomous AI agents

Humans receive scheduled payments.

Agents receive programmable compensation based on completed work.

Both are paid from the same USDC treasury.

That is the future Lumma is building: one payroll infrastructure for internet-native, hybrid teams.

— Lumma`,
    category: 'Product Updates',
    author: 'Lumma',
    date: 'June 9, 2025',
    readTime: '7 min read',
    featured: true,
  },
  {
    slug: 'stablecoin-payroll-for-global-teams',
    title: 'Stablecoin Payroll for Global Teams and Agent Economies',
    excerpt: 'Stablecoin payroll is not just about paying remote teams faster. It is the foundation for how internet-native workers, global contributors, and AI agents can settle work in real time.',
    coverImage: '/images/payroll.jpg',
    content: `Stablecoin payroll is not just about paying remote teams faster. It is also the foundation for how internet-native workers, global contributors, and AI agents can settle work in real time.


## Beyond Human Payroll: Agent Payroll

Stablecoin payroll does not stop with human workers.

As AI agents begin handling more real work online — research, development tasks, data processing, support, automation, and coordination — they will also need financial infrastructure around how work is paid for and settled.

Agents already transact onchain today, but the bigger opportunity is the financial layer around those transactions:

1. **Recurring payments** — scheduled disbursements to agents running ongoing tasks
2. **Automated settlement** — instant, trustless payment on task completion
3. **Treasury flows** — agent-managed budgets with stablecoin balance tracking
4. **Payment history** — full on-chain audit trail for every agent transaction
5. **Task-based payouts** — pay-per-task instead of fixed salaries
6. **Human-to-agent and agent-to-agent payments** — seamless value transfer across the entire workforce

This is where Lumma's Agent Payroll direction comes in.

We're building toward payroll infrastructure that can serve both global internet workers and AI-native systems. A company should be able to pay a freelancer in Nigeria, a designer in Argentina, or an AI agent completing a task — all through stablecoin-native payment flows.

Long term, we see stablecoins becoming a core settlement layer for both human work and agent economies.

## The Problem with Cross-Border Payroll Today

If you run a company with contractors in more than one country, you already know the pain.

A developer in Lagos. A designer in Buenos Aires. A marketer in Manila. Every month, you need to pay all of them — and every month, something goes wrong.

Wire transfers cost $25–50 per person. They take 3–7 business days to arrive. Banks in some countries reject transfers from crypto-related companies entirely. Your Argentine designer converts her pay to pesos and watches 40–60% of its value evaporate to inflation within weeks. And your accountant? They're left with no clean, auditable record of who was paid, when, or how much.

Platforms like Deel and Remote charge $20–49 per contractor per month just to manage this process. That's before any actual money moves.

Everyone loses time, money, and sanity. Every single month.

## What Stablecoin Payroll Actually Solves

The core idea is simple: instead of routing payments through the traditional banking system, you pay your team in USDC — a dollar-backed stablecoin that settles on blockchain networks like Base, Ethereum, and Arbitrum.

Here's what changes:

**Speed.** USDC transfers settle in seconds, not days. Your contractor in Nigeria doesn't wait a week for funds to clear through correspondent banks. They receive USDC in their wallet the moment you hit "Pay."

**Cost.** On Layer 2 networks like Base, a USDC transfer costs fractions of a cent in gas fees. Compare that to $25–50 per wire transfer, and the math speaks for itself. If you're paying 10 contractors monthly, that's $250–500 saved every single pay cycle.

**No bank rejections.** Stablecoin payments move wallet-to-wallet. There's no intermediary bank that can reject, freeze, or delay the transfer because they don't like the word "crypto" in your company description.

**Inflation protection.** When a contractor holds USDC, they're holding a dollar-pegged asset. They're not forced to immediately convert to a local currency that's losing value. They can hold, spend, or convert on their own terms, when they choose.

**Permanent records.** Every payment is recorded on-chain. Transaction hash, amount, sender, receiver, timestamp — all permanently verifiable. No more spreadsheets, no more reconciliation headaches, no more "did that payment go through?" emails.

## How Agent Payroll Will Work on Lumma

Agent Payroll is being built as a module inside Lumma's interface. It's designed for companies and DAOs that need to pay people globally without the friction of traditional payroll infrastructure.

Here's the flow:

**Step 1: Create your vault.** When you connect your wallet and open Agent Payroll, Lumma creates a dedicated Circle Agent Wallet for your company. This is your payroll vault — a dedicated USDC wallet with gas-sponsored transfers. You don't pay gas fees, and neither do your contractors.

**Step 2: Add your team.** You can add contractors manually by entering their name, wallet address, role, and pay amount. Or you can generate a shareable invite link. When a contractor opens that link and connects their wallet, they're automatically added to your roster. No forms, no onboarding portals, no friction.

**Step 3: Fund your vault.** Send USDC to your vault's deposit address. The balance shows up in your dashboard in real-time.

**Step 4: Pay.** Go to the Pay tab, select which contractors to pay, and hit the button. Lumma's backend handles the rest — executing transfers from your vault to each contractor's wallet via Circle's infrastructure. Gas is sponsored. Settlements are instant.

**Step 5: Track everything.** Every payment is logged in the History tab with contractor name, amount, chain, status, and transaction hash. Click any hash to verify on-chain.

## Manual and Scheduled Payments

We're building both options because different teams work differently.

**Manual mode** gives you full control. You go to the Pay tab, select contractors, review amounts, and execute when you're ready. This is ideal for project-based work, milestone payments, or teams where pay amounts vary month to month.

**Scheduled mode** automates the process. Set your pay frequency — weekly, bi-weekly, or monthly — and pick a start date. Lumma's backend will automatically disburse payments from your vault on schedule. No manual intervention required. Just make sure your vault is funded.

## The Invite Link System

One of the biggest friction points in contractor payroll is onboarding. Traditional platforms require contractors to create accounts, submit tax forms, and go through identity verification before they can receive a single dollar.

With Agent Payroll, onboarding is a single link.

As an employer, you create an invite from the Team tab. You set the role, pay amount, and chain. Lumma generates a unique URL. You send that URL to your contractor — via email, Telegram, Discord, whatever.

When the contractor opens the link, they see the company name, their role, and their pay amount. They connect their wallet, enter their name, and they're done. Their wallet address is automatically added to your roster. Next time you run payroll, they're included.

No accounts. No passwords. No forms. Just a wallet connection and a name.

## What's Next

Agent Payroll is coming soon to testnet.lumma.xyz. We're finalizing the infrastructure and will open it up for testing shortly.

Lumma is starting with global stablecoin payroll because the pain is already clear today. But the same rails can extend into AI-native work, where agents need structured ways to receive payments, settle tasks, and manage value onchain.

That is the direction we are building toward: payroll infrastructure for humans, teams, and agents.

— Lumma`,
    category: 'Product',
    author: 'Lumma',
    date: 'May 26, 2025',
    readTime: '8 min read',
    featured: false,
  },

  {
    slug: 'lumma-integrates-lifi-crosschain-routing',
    title: 'Lumma now supports cross-chain routing through LI.FI',
    excerpt: 'We replaced our custom bridge infrastructure with LI.FI\'s routing engine. Users can now swap and bridge assets into Arc Testnet from 60+ chains, directly inside the Lumma interface.',
    coverImage: '/images/lummaxlifi.PNG',
    content: `We shipped a major infrastructure change today. Lumma's swap and bridge module now runs on LI.FI.

Previously, we were building custom bridge logic on top of Circle's CCTP. It worked for simple USDC transfers between a handful of chains, but it came with problems — CORS issues in the browser, limited token support, and a brittle integration that broke when we needed to support more routes.

So we made the call to rip it out and integrate LI.FI instead.

## What changed

The swap panel on testnet.lumma.xyz now uses LI.FI's embedded widget. Under the hood, LI.FI aggregates routes across dozens of bridges and DEXs. When a user wants to move assets into Arc, LI.FI finds the best path — whether that's a direct bridge, a swap-then-bridge, or a multi-hop route.

From the user's perspective, nothing looks different. They pick a source chain, pick a token, enter an amount, and execute. But the routing is now significantly more reliable, and we support 60+ source chains instead of 5.

## Why LI.FI

A few reasons:

1. **No backend required.** The widget runs entirely in the browser. No proxy servers, no CORS workarounds, no API keys exposed.
2. **Arc Testnet support.** LI.FI added Arc to their supported chain list. We're not hacking around unsupported infrastructure.
3. **Route aggregation.** Instead of hardcoding one bridge provider, LI.FI compares routes across Stargate, Across, Hop, Connext, and others to find the cheapest and fastest path.
4. **Wallet compatibility.** The widget hooks into our existing Privy wallet connection. Users don't need to reconnect or switch wallets.

## What's next

The bridge module is live on testnet. We're monitoring route availability and will expand token support as LI.FI adds more liquidity to Arc pairs.

If you're building on Arc and need cross-chain routing, check out the LI.FI docs at docs.li.fi — same integration we're using.

— Lumma`,
    category: 'Engineering',
    author: 'Lumma',
    date: 'May 11, 2025',
    readTime: '3 min read',
    featured: false,
  },
]

const CATEGORIES = ['All', 'Product Updates', 'Engineering', 'Product', 'Ecosystem', 'Guides']


function findArticleBySlug(slug: string): Article | null {
  return ARTICLES.find(a => a.slug === slug) || null
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [openArticle, setOpenArticle] = useState<Article | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  // On mount, check URL for article slug (shareable links)
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/+/, '')
    if (path) {
      const article = findArticleBySlug(path)
      if (article) setOpenArticle(article)
    }
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    function handlePop() {
      const path = window.location.pathname.replace(/^\/+/, '')
      if (path) {
        setOpenArticle(findArticleBySlug(path))
      } else {
        setOpenArticle(null)
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  function navigateToArticle(article: Article) {
    setOpenArticle(article)
    window.history.pushState(null, '', `/${article.slug}`)
  }

  function navigateToIndex() {
    setOpenArticle(null)
    window.history.pushState(null, '', '/')
  }

  const filtered = ARTICLES.filter(a => {
    if (activeCategory !== 'All' && a.category !== activeCategory) return false
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const featured = filtered.find(a => a.featured) || filtered[0]
  const recent = filtered.filter(a => a !== featured)

  // Extract headings for "On this Page" sidebar
  function getHeadings(content: string): string[] {
    return content.split('\n\n')
      .filter(b => b.startsWith('## '))
      .map(b => b.replace('## ', ''))
  }

  function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function handleShare() {
    const url = `${window.location.origin}/${openArticle!.slug}`
    navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  // ── Article View ──
  if (openArticle) {
    const headings = getHeadings(openArticle.content)
    const related = ARTICLES.filter(a => a.slug !== openArticle.slug).slice(0, 3)

    return (
      <div className="bg">
        <nav className="bg-nav">
          <a href="https://lumma.xyz" className="bg-logo">
            <img src="/images/lumma.svg" alt="Lumma" />
            <span>Blog</span>
          </a>
          <button className="bg-back" onClick={navigateToIndex} type="button">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
            All Stories
          </button>
        </nav>

        <div className="bg-article-layout">
          <article className="bg-article">
            <div className="bg-article-breadcrumb">
              <button onClick={navigateToIndex} type="button">All Stories</button>
              <span>›</span>
              <span>#{openArticle.category}</span>
            </div>

            {openArticle.coverImage && (
              <div className="bg-article-cover">
                <img src={openArticle.coverImage} alt={openArticle.title} />
              </div>
            )}

            <div className="bg-article-meta">
              <span className="bg-article-cat">{openArticle.category}</span>
              <span className="bg-article-dot">·</span>
              <span>{openArticle.date}</span>
              <span className="bg-article-dot">·</span>
              <span>{openArticle.readTime}</span>
            </div>

            <h1>{openArticle.title}</h1>

            <div className="bg-article-author">
              <div className="bg-author-avatar">
                <img src="/images/lumma.svg" alt="Lumma" className="bg-author-logo" />
              </div>
              <div>
                <div className="bg-author-name">Written by {openArticle.author}</div>
              </div>
              <button className="bg-share-btn" onClick={handleShare} type="button">
                {shareCopied ? '✓ Link copied' : (
                  <><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Share</>
                )}
              </button>
            </div>

            <div className="bg-article-body">
              {openArticle.content.split('\n\n').map((block, i) => {
                if (block.startsWith('### ')) {
                  const text = block.replace('### ', '')
                  return <h3 key={i} className="bg-article-h3" id={slugify(text)}>{text}</h3>
                }
                if (block.startsWith('## ')) {
                  const text = block.replace('## ', '')
                  return <h2 key={i} id={slugify(text)}>{text}</h2>
                }
                // Bullet list (lines starting with "* " or "- ")
                if (block.split('\n').every(line => /^[*-]\s+/.test(line.trim()))) {
                  return (
                    <ul key={i} className="bg-article-ul">
                      {block.split('\n').map((line, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: line.trim().replace(/^[*-]\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                      ))}
                    </ul>
                  )
                }
                if (block.match(/^\d+\.\s/)) {
                  return (
                    <div key={i} className="bg-article-list">
                      {block.split('\n').map((line, j) => (
                        <p key={j} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                      ))}
                    </div>
                  )
                }
                return <p key={i} dangerouslySetInnerHTML={{ __html: block.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
              })}
            </div>


            {/* Related posts */}
            {related.length > 0 && (
              <div className="bg-related">
                <h3>Related Posts</h3>
                <div className="bg-related-grid">
                  {related.map(a => (
                    <div key={a.slug} className="bg-related-card" onClick={() => navigateToArticle(a)}>
                      {a.coverImage && <img src={a.coverImage} alt={a.title} />}
                      <h4>{a.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="bg-sidebar">
            {headings.length > 0 && (
              <div className="bg-toc">
                <div className="bg-toc-title">On this Page</div>
                {headings.map(h => (
                  <a key={h} href={`#${slugify(h)}`} className="bg-toc-link">{h}</a>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Footer */}
        <footer className="bg-footer">
          <div className="bg-footer-inner">
            <div className="bg-footer-brand">
              <img src="/images/lumma.svg" alt="Lumma" />
              <span>Lumma</span>
            </div>
            <div className="bg-footer-links">
              <div className="bg-footer-col">
                <h5>Product</h5>
                <a href="https://testnet.lumma.xyz">Testnet</a>
                <a href="https://docs.lumma.xyz">Documentation</a>
              </div>
              <div className="bg-footer-col">
                <h5>Community</h5>
                <a href="https://discord.gg/4QsndzgRvN" target="_blank" rel="noopener noreferrer" className="bg-footer-social">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  Discord
                </a>
                <a href="https://x.com/lummaxyz" target="_blank" rel="noopener noreferrer" className="bg-footer-social">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X (Twitter)
                </a>
              </div>
            </div>
            <div className="bg-footer-copy">© {new Date().getFullYear()} Lumma</div>
          </div>
        </footer>
      </div>
    )
  }

  // ── Blog Index ──
  return (
    <div className="bg">
      <nav className="bg-nav">
        <a href="https://lumma.xyz" className="bg-logo">
          <img src="/images/lumma.svg" alt="Lumma" />
          <span>Lumma</span>
        </a>
        <div className="bg-search">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or topic"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </nav>

      <div className="bg-body">
        {/* Featured */}
        {featured && (
          <div className="bg-hero" onClick={() => navigateToArticle(featured)}>
            <div className="bg-hero-text">
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <button className="bg-hero-btn" type="button">Go to article</button>
              <div className="bg-hero-dots">
                <span className="active" /><span /><span /><span />
              </div>
            </div>
            <div className="bg-hero-art">
              <img src={featured.coverImage} alt={featured.title} className="bg-hero-img" />
            </div>
          </div>
        )}

        {/* Category pills */}
        <div className="bg-section-head">
          <h3>Recent posts</h3>
          <div className="bg-pills">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`bg-pill${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles grid */}
        {recent.length > 0 ? (
          <div className="bg-grid">
            {recent.map(a => (
              <div key={a.slug} className="bg-card" onClick={() => navigateToArticle(a)}>
                {a.coverImage && <img src={a.coverImage} alt={a.title} className="bg-card-img" />}
                <div className="bg-card-inner">
                  <div className="bg-card-top">
                    <span className="bg-card-cat">{a.category}</span>
                    <span className="bg-card-date">{a.date}</span>
                  </div>
                  <h4>{a.title}</h4>
                  <p>{a.excerpt}</p>
                  <div className="bg-card-author">
                    <div className="bg-author-avatar sm"><img src="/images/lumma.svg" alt="" className="bg-author-logo" /></div>
                    <span>{a.author}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-empty">
            <p>More articles coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
