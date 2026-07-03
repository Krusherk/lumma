import './BridgeModal.css'

type Step = 'idle' | 'fetching-fees' | 'approving' | 'burning' | 'minting' | 'success' | 'error'

interface BridgeModalProps {
  step: Step
  mode: 'bridge' | 'swap'
  statusMsg: string
  error: string
  burnTxHash: string
  mintTxHash: string
  sourceChainName: string
  destChainName: string
  sourceChainId: number
  destChainId: number
  amount: string
  tokenIn: string
  tokenOut: string
  hasAllowance: boolean
  onClose: () => void
}

const CHAIN_EXPLORERS: Record<number, string> = {
  5042002: 'https://testnet.arcscan.app',
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
  421614: 'https://sepolia.arbiscan.io',
  80002: 'https://amoy.polygonscan.com',
}

function getTimeEstimate(mode: string, sourceChainId: number): string {
  if (mode === 'swap') return '< 5 seconds'
  switch (sourceChainId) {
    case 5042002: return '~10 seconds (Arc has instant finality)'
    case 11155111: return '~2-3 minutes (Ethereum needs block confirmations)'
    case 84532: return '~1-2 minutes (Base L2 finality)'
    case 421614: return '~1-2 minutes (Arbitrum L2 finality)'
    case 80002: return '~1-2 minutes (Polygon finality)'
    default: return '~2 minutes'
  }
}

function getGasErrorInfo(error: string, sourceChainId: number): { message: string; fix: string; link: string } | null {
  if (error.includes('insufficient funds for gas') || error.includes('insufficient funds')) {
    if (sourceChainId === 5042002) {
      return {
        message: 'You need USDC on Arc to pay for gas fees.',
        fix: 'Get free testnet USDC from the faucet:',
        link: 'https://faucet.circle.com',
      }
    }
    return {
      message: `You need testnet ETH on the source chain to pay for gas fees.`,
      fix: 'Get free Sepolia ETH from Google Cloud faucet:',
      link: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    }
  }
  if (error.includes('Insufficient USDC')) {
    return {
      message: error,
      fix: 'Get free testnet USDC from Circle faucet:',
      link: 'https://faucet.circle.com',
    }
  }
  return null
}

export default function BridgeModal({
  step, mode, statusMsg, error,
  burnTxHash, mintTxHash,
  sourceChainName, destChainName,
  sourceChainId, destChainId,
  amount, tokenIn, tokenOut,
  hasAllowance, onClose,
}: BridgeModalProps) {
  if (step === 'idle') return null

  const isLoading = step !== 'success' && step !== 'error'
  const srcExplorer = CHAIN_EXPLORERS[sourceChainId] || 'https://testnet.arcscan.app'
  const dstExplorer = CHAIN_EXPLORERS[destChainId] || 'https://testnet.arcscan.app'
  const timeEstimate = getTimeEstimate(mode, sourceChainId)
  const gasInfo = step === 'error' ? getGasErrorInfo(error, sourceChainId) : null

  return (
    <div className="bm-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose() }}>
      <div className="bm-modal">

        {/* ── Loading State ── */}
        {isLoading && (
          <>
            <div className="bm-icon loading">
              <div className="bm-spinner" />
            </div>
            <div className="bm-title">
              {mode === 'swap' ? 'Swapping' : 'Bridging'} {amount} {tokenIn}
            </div>
            <div className="bm-subtitle">
              {mode === 'swap'
                ? `${tokenIn} to ${tokenOut} on Arc Testnet`
                : `${sourceChainName} to ${destChainName}`
              }
            </div>

            {/* Progress steps */}
            {mode === 'bridge' && (
              <div className="bm-steps">
                <div className={`bm-step ${step === 'fetching-fees' ? 'active' : 'done'}`}>
                  <span className="bm-step-dot" />Fees
                </div>
                <div className="bm-step-line" />
                <div className={`bm-step ${step === 'approving' ? 'active' : (['burning','minting'].includes(step) ? 'done' : '')}`}>
                  <span className="bm-step-dot" />{hasAllowance ? 'Skip' : 'Approve'}
                </div>
                <div className="bm-step-line" />
                <div className={`bm-step ${step === 'burning' ? 'active' : (step === 'minting' ? 'done' : '')}`}>
                  <span className="bm-step-dot" />Burn
                </div>
                <div className="bm-step-line" />
                <div className={`bm-step ${step === 'minting' ? 'active' : ''}`}>
                  <span className="bm-step-dot" />Mint
                </div>
              </div>
            )}

            {/* Time estimate */}
            <div className="bm-estimate">
              <div className="bm-est-label">Estimated time</div>
              <div className="bm-est-value">{timeEstimate}</div>
            </div>

            {statusMsg && <div className="bm-status">{statusMsg}</div>}
          </>
        )}

        {/* ── Success State ── */}
        {step === 'success' && (
          <>
            <div className="bm-icon success">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bm-title">
              {mode === 'swap' ? 'Swap Complete' : 'Bridge Complete'}
            </div>
            <div className="bm-subtitle">
              {mode === 'swap'
                ? `Successfully swapped ${amount} ${tokenIn} to ${tokenOut}`
                : `${amount} USDC sent from ${sourceChainName} to ${destChainName}`
              }
            </div>

            <div className="bm-tx-info">
              {burnTxHash && (
                <a
                  href={mode === 'swap' && mintTxHash ? mintTxHash : `${srcExplorer}/tx/${burnTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bm-tx-link"
                >
                  <span className="bm-tx-label">{mode === 'swap' ? 'Swap tx' : `Burn on ${sourceChainName}`}</span>
                  <span className="bm-tx-hash">{burnTxHash.slice(0, 8)}...{burnTxHash.slice(-6)}</span>
                </a>
              )}
              {mintTxHash && mode === 'bridge' && (
                <a
                  href={`${dstExplorer}/tx/${mintTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bm-tx-link"
                >
                  <span className="bm-tx-label">Mint on {destChainName}</span>
                  <span className="bm-tx-hash">{mintTxHash.slice(0, 8)}...{mintTxHash.slice(-6)}</span>
                </a>
              )}
            </div>

            <div className="bm-actions">
              <button className="bm-btn bm-btn-primary" onClick={onClose} type="button">
                Done
              </button>
            </div>
          </>
        )}

        {/* ── Error State ── */}
        {step === 'error' && (
          <>
            <div className="bm-icon error">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="bm-title">
              {mode === 'swap' ? 'Swap Failed' : 'Bridge Failed'}
            </div>

            <div className="bm-error-box">
              <div className="bm-error-msg">
                {gasInfo ? gasInfo.message : error}
              </div>
              {gasInfo && (
                <div className="bm-error-fix">
                  {gasInfo.fix}{' '}
                  <a href={gasInfo.link} target="_blank" rel="noopener noreferrer">
                    {gasInfo.link.replace('https://', '')}
                  </a>
                </div>
              )}
            </div>

            <div className="bm-actions">
              <button className="bm-btn bm-btn-primary" onClick={onClose} type="button">
                Try Again
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
