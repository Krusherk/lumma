/**
 * AgentsPage — Private landing for Agent Payroll.
 * Public visitors book a demo. Access-code holders are pointed at the app.
 */
import { DEMO_BOOKING_URL, APP_URL } from '../config/demo'
import './AgentsPage.css'

export default function AgentsPage() {
  return (
    <div className="agents">
      <div className="agents-inner">
        <div className="agents-logo">
          <img src="/images/lumma.svg" alt="Lumma" />
          <span>Lumma · Agent Payroll</span>
        </div>

        <h1>Put your agent on payroll.</h1>
        <p className="agents-sub">
          Programmable USDC payroll for employees, contractors, and AI agents on Arc.
          Agent Payroll is private — book a demo to get access.
        </p>

        <div className="agents-links" style={{ marginBottom: 48 }}>
          <a className="agents-btn" href={DEMO_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book a demo</a>
          <a className="agents-btn ghost" href={APP_URL}>Open Bridge & Swap</a>
        </div>

        <div className="agents-steps">
          <div className="agents-step">
            <span className="agents-step-n">1</span>
            <div>
              <h3>Create a vault</h3>
              <p>Deploy a dedicated USDC payroll account on Arc.</p>
            </div>
          </div>
          <div className="agents-step">
            <span className="agents-step-n">2</span>
            <div>
              <h3>Add your team</h3>
              <p>Register people, contractors, and AI agents with payout wallets and rates.</p>
            </div>
          </div>
          <div className="agents-step">
            <span className="agents-step-n">3</span>
            <div>
              <h3>Settle in USDC</h3>
              <p>Recurring payroll for humans, per-task pay for agents, with on-chain receipts.</p>
            </div>
          </div>
        </div>

        <div className="agents-owner">
          <h2>Already invited?</h2>
          <p>
            After your demo you'll get an access code. Open Lumma, go to Agent Payroll,
            and enter it under “Have an access code?”
          </p>
          <div className="agents-links">
            <a className="agents-btn ghost" href={APP_URL}>Open Lumma</a>
          </div>
        </div>
      </div>
    </div>
  )
}
