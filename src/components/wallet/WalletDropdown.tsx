import { useState } from 'react'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { formatUnits } from 'viem'
import { USDC_ADDRESSES } from '../../config/cctp'
import './WalletDropdown.css'

const BALANCE_CHAINS = [
  { name: 'Arc Testnet', chainId: 5042002, logo: '/images/arclogo.jpg' },
  { name: 'Ethereum Sepolia', chainId: 11155111, logo: '/images/eth.jpg' },
  { name: 'Base Sepolia', chainId: 84532, logo: '/images/base.jpg' },
  { name: 'Arbitrum Sepolia', chainId: 421614, logo: '/images/arbitrum.jpg' },
  { name: 'Polygon Amoy', chainId: 80002, logo: '/images/polygon.png' },
]

function ChainBalance({ chainId, name, logo, walletAddr }: { chainId: number; name: string; logo: string; walletAddr: `0x${string}` }) {
  const usdcAddr = USDC_ADDRESSES[chainId]
  const { data } = useBalance({
    address: walletAddr,
    token: usdcAddr,
    chainId,
    query: { enabled: !!walletAddr },
  })
  const bal = data ? formatUnits(data.value, 6) : '0.00'

  return (
    <div className="wd-chain">
      <img className="wd-chain-logo" src={logo} alt={name} />
      <span className="wd-chain-name">{name}</span>
      <span className="wd-chain-bal">{parseFloat(bal).toFixed(2)} USDC</span>
    </div>
  )
}

export default function WalletDropdown() {
  const { authenticated, login, logout, user } = usePrivy()
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const walletAddr = address || (user?.wallet?.address as `0x${string}` | undefined)
  const shortAddr = walletAddr
    ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
    : ''

  const handleCopy = async () => {
    if (!walletAddr) return
    await navigator.clipboard.writeText(walletAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!authenticated) {
    return (
      <button className="tn-wallet" onClick={login}>
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="wd">
      <button className="tn-wallet connected" onClick={() => setIsOpen(!isOpen)}>
        <span className="tn-wallet-dot" />
        {shortAddr}
        <svg className={`wd-chev ${isOpen ? 'open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="wd-backdrop" onClick={() => setIsOpen(false)} />
          <div className="wd-panel">
            {/* Address + Copy */}
            <div className="wd-addr-row">
              <span className="wd-addr">{shortAddr}</span>
              <button className="wd-copy" onClick={handleCopy} type="button">
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" /></svg>
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Balances */}
            <div className="wd-section-label">USDC Balances</div>
            <div className="wd-balances">
              {walletAddr && BALANCE_CHAINS.map(c => (
                <ChainBalance key={c.chainId} chainId={c.chainId} name={c.name} logo={c.logo} walletAddr={walletAddr as `0x${string}`} />
              ))}
            </div>

            {/* Actions */}
            <div className="wd-actions">
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="wd-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Get Testnet USDC
              </a>
              <a href={`https://testnet.arcscan.app/address/${walletAddr}`} target="_blank" rel="noopener noreferrer" className="wd-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                View on ArcScan
              </a>
              <button className="wd-action disconnect" onClick={() => { disconnect(); logout(); setIsOpen(false) }} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
