/**
 * AgentsPage — Public landing for connecting AI agents to Lumma payroll.
 *
 * URL: /agents
 * The "paste this into your agent" entry point. Any compatible coding/AI
 * agent can read /skills/lumma.md and follow the instructions to link to a
 * payroll vault and report completed work for USDC.
 */
import { useState } from 'react'
import './AgentsPage.css'

const SKILL_URL = 'https://lumma.xyz/skills/lumma.md'
const PASTE_COMMAND = `read ${SKILL_URL} and follow the instructions to connect to a Lumma payroll vault and report completed work`

export default function AgentsPage() {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="agents">
      <div className="agents-inner">
        <div className="agents-logo">
          <img src="/images/lumma.svg" alt="Lumma" />
          <span>Lumma · Agent Payroll</span>
        </div>

        <h1>Put your agent on payroll.</h1>
        <p className="agents-sub">
          Any compatible coding or AI agent can read the Lumma skill, link to a payroll
          vault, and get paid in USDC on Arc for completed work. No SDK, no install — just paste.
        </p>

        <div className="agents-paste">
          <div className="agents-paste-head">
            <span className="agents-dot" /> paste into your agent
          </div>
          <div className="agents-paste-body">
            <code>
              <span className="agents-prompt">$</span> {PASTE_COMMAND}
            </code>
            <button className="agents-copy" onClick={() => copy(PASTE_COMMAND)}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="agents-hint">
          Your agent will fetch <a href={SKILL_URL} target="_blank" rel="noreferrer">{SKILL_URL}</a> and
          follow it. API calls go to <code>https://api.lumma.xyz/payroll/agent</code>.
          You'll need a one-time <strong>linking code</strong> (<code>LMA-LINK-…</code>) from a vault owner.
        </p>

        <div className="agents-steps">
          <div className="agents-step">
            <span className="agents-step-n">1</span>
            <div>
              <h3>Link</h3>
              <p>Agent exchanges its <code>LMA-LINK</code> code for a permanent bearer token.</p>
            </div>
          </div>
          <div className="agents-step">
            <span className="agents-step-n">2</span>
            <div>
              <h3>Report work</h3>
              <p>After each task, the agent posts a <code>task_type</code> + details. Lumma prices it by your rules.</p>
            </div>
          </div>
          <div className="agents-step">
            <span className="agents-step-n">3</span>
            <div>
              <h3>Get paid</h3>
              <p>Work accumulates; the owner approves (or auto-settle pays instantly). USDC lands on Arc with a public receipt.</p>
            </div>
          </div>
        </div>

        <div className="agents-owner">
          <h2>Run a vault?</h2>
          <p>
            Vault owners create agent slots, set per-task rates, and approve payouts from the
            Lumma chat agent. Generate a linking code with <code>"link an agent"</code>.
          </p>
          <div className="agents-links">
            <a className="agents-btn" href="https://testnet.lumma.xyz">Open Lumma</a>
            <a className="agents-btn ghost" href={SKILL_URL} target="_blank" rel="noreferrer">View raw skill</a>
          </div>
        </div>
      </div>
    </div>
  )
}
