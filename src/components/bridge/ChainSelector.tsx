import { useState } from 'react'
import { SUPPORTED_CHAINS, type SupportedChain } from '../../config/chains'
import './ChainSelector.css'

interface ChainSelectorProps {
  label: string
  selectedChain: SupportedChain
  onSelect: (chain: SupportedChain) => void
  exclude?: string
  filterBridge?: boolean
}

export default function ChainSelector({ label, selectedChain, onSelect, exclude, filterBridge }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const chains = SUPPORTED_CHAINS.filter((c) => {
    if (exclude && c.id === exclude) return false
    if (filterBridge && !c.supportsBridge) return false
    return true
  })

  return (
    <div className="cs">
      <span className="cs-label">{label}</span>
      <button className="cs-trigger" onClick={() => setIsOpen(!isOpen)} type="button">
        <img className="cs-img" src={selectedChain.icon} alt={selectedChain.shortName} />
        <span className="cs-name">{selectedChain.shortName}</span>
        <svg className={`cs-chev ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="cs-backdrop" onClick={() => setIsOpen(false)} />
          <div className="cs-dropdown">
            {chains.map((chain) => (
              <button
                key={chain.id}
                className={`cs-option ${chain.id === selectedChain.id ? 'active' : ''}`}
                onClick={() => { onSelect(chain); setIsOpen(false); }}
                type="button"
              >
                <img className="cs-img" src={chain.icon} alt={chain.shortName} />
                <div className="cs-option-info">
                  <span className="cs-option-name">{chain.name}</span>
                  <span className="cs-option-id">{chain.chainId}</span>
                </div>
                {chain.id === selectedChain.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
