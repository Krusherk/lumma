import { useState, useCallback, useEffect, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWriteContract, useReadContract } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { parseUnits, formatUnits, erc20Abi } from 'viem'
import { SUPPORTED_CHAINS, type SupportedChain } from '../../config/chains'
import { TOKENS } from '../../config/tokens'
import {
  CCTP_DOMAINS,
  TOKEN_MESSENGER_V2,
  USDC_ADDRESSES,
  ERC20_APPROVE_ABI,
  DEPOSIT_FOR_BURN_WITH_HOOK_ABI,
  FORWARDING_HOOK_DATA,
  ZERO_BYTES32,
  addressToBytes32,
  getForwardingFees,
  calculateBurnAmount,
  waitForForwardedMint,
  type FeeQuote,
} from '../../config/cctp'

import ChainSelector from './ChainSelector'
import TokenInput from './TokenInput'
import BridgeModal from './BridgeModal'
import './BridgePanel.css'

type Mode = 'bridge' | 'swap'
type Step = 'idle' | 'fetching-fees' | 'approving' | 'burning' | 'minting' | 'success' | 'error'

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n

export default function BridgePanel() {
  const { authenticated, login } = usePrivy()
  const { address, chainId: connectedChainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [mode, setMode] = useState<Mode>('bridge')
  const [amount, setAmount] = useState('')
  const [sourceChain, setSourceChain] = useState<SupportedChain>(SUPPORTED_CHAINS[1])
  const [destChain, setDestChain] = useState<SupportedChain>(SUPPORTED_CHAINS[0])
  const [swapTokenIn, setSwapTokenIn] = useState<'USDC' | 'EURC'>('USDC')
  const [swapTokenOut, setSwapTokenOut] = useState<'USDC' | 'EURC'>('EURC')

  const [step, setStep] = useState<Step>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [fee, setFee] = useState('')
  const [burnTxHash, setBurnTxHash] = useState('')
  const [mintTxHash, setMintTxHash] = useState('')
  const [error, setError] = useState('')

  // ── Pre-fetched fee quote (cached) ──
  const [cachedFee, setCachedFee] = useState<FeeQuote | null>(null)
  const feeDebounce = useRef<ReturnType<typeof setTimeout>>()

  // Real balance from the correct chain (swap always uses Arc)
  const balanceChainId = mode === 'swap' ? 5042002 : sourceChain.chainId
  const balanceTokenAddr = mode === 'swap'
    ? (swapTokenIn === 'USDC' ? USDC_ADDRESSES[5042002] : TOKENS.EURC.addresses.arc_testnet as `0x${string}`)
    : USDC_ADDRESSES[sourceChain.chainId]
  const usdcAddr = USDC_ADDRESSES[sourceChain.chainId]

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
    token: balanceTokenAddr,
    chainId: balanceChainId,
    query: { enabled: !!address },
  })
  const displayBalance = balanceData ? formatUnits(balanceData.value, 6) : '0.00'

  // Refetch balance when mode, chain, or swap token changes
  useEffect(() => { if (address) refetchBalance() }, [mode, sourceChain, swapTokenIn, address])

  // ── Check existing allowance (skip approve if already approved) ──
  const { data: allowanceData } = useReadContract({
    address: usdcAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, TOKEN_MESSENGER_V2] : undefined,
    chainId: sourceChain.chainId,
    query: { enabled: !!address },
  })

  // ── Pre-fetch fees when chain pair changes ──
  useEffect(() => {
    const srcDomain = CCTP_DOMAINS[sourceChain.chainId]
    const dstDomain = CCTP_DOMAINS[destChain.chainId]
    if (srcDomain === undefined || dstDomain === undefined) return

    setCachedFee(null)
    setFee('')

    clearTimeout(feeDebounce.current)
    feeDebounce.current = setTimeout(async () => {
      try {
        const quote = await getForwardingFees(srcDomain, dstDomain)
        setCachedFee(quote)
        if (amount && parseFloat(amount) > 0) {
          const amountBig = parseUnits(amount, 6)
          const { maxFee } = calculateBurnAmount(amountBig, quote)
          setFee(formatUnits(maxFee, 6))
        }
      } catch {
        // Silent fail — will retry on bridge click
      }
    }, 300)

    return () => clearTimeout(feeDebounce.current)
  }, [sourceChain.chainId, destChain.chainId])

  // ── Update fee display when amount changes (using cached quote) ──
  useEffect(() => {
    if (!cachedFee || !amount || parseFloat(amount) <= 0) {
      setFee('')
      return
    }
    const amountBig = parseUnits(amount, 6)
    const { maxFee } = calculateBurnAmount(amountBig, cachedFee)
    setFee(formatUnits(maxFee, 6))
  }, [amount, cachedFee])

  const handleFlip = useCallback(() => {
    if (mode === 'bridge') {
      setSourceChain(destChain)
      setDestChain(sourceChain)
    } else {
      setSwapTokenIn(swapTokenOut)
      setSwapTokenOut(swapTokenIn)
    }
  }, [mode, sourceChain, destChain, swapTokenIn, swapTokenOut])

  const resetState = () => {
    setStep('idle')
    setStatusMsg('')
    setBurnTxHash('')
    setMintTxHash('')
    setError('')
    setAmount('')
  }

  const handleBridge = async () => {
    if (!authenticated) { login(); return }
    if (!address) return
    if (!amount || parseFloat(amount) <= 0) return

    const srcChainId = sourceChain.chainId
    const dstChainId = destChain.chainId
    const srcDomain = CCTP_DOMAINS[srcChainId]
    const dstDomain = CCTP_DOMAINS[dstChainId]
    const usdcAddress = USDC_ADDRESSES[srcChainId]

    if (srcDomain === undefined || dstDomain === undefined) {
      setStep('error')
      setError('Chain not supported for CCTP bridging')
      return
    }

    const amountBig = parseUnits(amount, 6)

    // Check sufficient balance
    if (balanceData && amountBig > balanceData.value) {
      setStep('error')
      setError(`Insufficient USDC on ${sourceChain.shortName}. You have ${displayBalance} USDC but need ${amount} USDC. Get testnet USDC from faucet.circle.com`)
      return
    }

    try {
      // Step 1: Use cached fee or fetch
      let feeQuote: FeeQuote
      if (cachedFee) {
        feeQuote = cachedFee
      } else {
        setStep('fetching-fees')
        setStatusMsg('Fetching fees...')
        feeQuote = await getForwardingFees(srcDomain, dstDomain)
      }

      const { maxFee, totalAmount } = calculateBurnAmount(amountBig, feeQuote)
      const feeStr = formatUnits(maxFee, 6)
      setFee(feeStr)

      // Check balance covers amount + fee
      if (balanceData && totalAmount > balanceData.value) {
        setStep('error')
        setError(`Need ${formatUnits(totalAmount, 6)} USDC (${amount} + ${feeStr} fee) but have ${displayBalance} USDC on ${sourceChain.shortName}.`)
        return
      }

      // Switch chain if needed
      if (connectedChainId !== srcChainId) {
        setStep('approving')
        setStatusMsg('Switching network...')
        await switchChainAsync({ chainId: srcChainId })
      }

      // Step 2: Skip approve if allowance is sufficient
      const currentAllowance = allowanceData ?? 0n
      if (currentAllowance < totalAmount) {
        setStep('approving')
        setStatusMsg('Approve USDC (one-time)...')

        await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [TOKEN_MESSENGER_V2, MAX_UINT256],
          chainId: srcChainId,
          gas: 100_000n,
        })

        setStatusMsg('Approved. Bridging...')
        await new Promise(r => setTimeout(r, 2000))
      }

      // Step 3: Burn with Forwarding Service
      setStep('burning')
      setStatusMsg('Confirm in wallet...')

      const recipientBytes32 = addressToBytes32(address)

      let burnTx: `0x${string}` | undefined
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          burnTx = await writeContractAsync({
            address: TOKEN_MESSENGER_V2,
            abi: DEPOSIT_FOR_BURN_WITH_HOOK_ABI,
            functionName: 'depositForBurnWithHook',
            args: [
              totalAmount,
              dstDomain,
              recipientBytes32,
              usdcAddress,
              ZERO_BYTES32,
              maxFee,
              1000,
              FORWARDING_HOOK_DATA,
            ],
            chainId: srcChainId,
            gas: 300_000n,
          })
          break
        } catch (retryErr: any) {
          const msg = retryErr?.shortMessage || retryErr?.message || ''
          if (msg.includes('rate limit') && attempt < 2) {
            setStatusMsg(`Rate limited. Retrying in ${(attempt + 1) * 3}s...`)
            await new Promise(r => setTimeout(r, (attempt + 1) * 3000))
            continue
          }
          throw retryErr
        }
      }

      if (!burnTx) throw new Error('Bridge failed after retries')

      setBurnTxHash(burnTx)

      // Step 4: Wait for Circle to mint
      setStep('minting')
      setStatusMsg('Circle is minting on destination...')

      const mintHash = await waitForForwardedMint(
        srcDomain,
        burnTx,
        (msg) => setStatusMsg(msg),
      )

      setMintTxHash(mintHash)
      setStep('success')
      setStatusMsg('Bridge complete.')
      refetchBalance()

    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed'
      setStep('error')

      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setError('Transaction cancelled.')
      } else if (msg.includes('insufficient funds for gas') || msg.includes('insufficient funds')) {
        const chainName = sourceChain.shortName
        const isArc = sourceChain.chainId === 5042002
        setError(
          isArc
            ? `No USDC for gas on Arc. Get testnet USDC at faucet.circle.com`
            : `No ${chainName} ETH for gas. Get free testnet ETH at cloud.google.com/application/web3/faucet/ethereum/sepolia`
        )
      } else if (msg.includes('rate limit')) {
        setError('RPC rate limited. Wait a few seconds and try again.')
      } else {
        setError(msg)
      }
      setStatusMsg('')
    }
  }

  const handleSwap = async () => {
    if (!authenticated) { login(); return }
    if (!address) return
    if (!amount || parseFloat(amount) <= 0) return

    try {
      setStep('burning')
      setStatusMsg('Loading swap SDK...')

      // Swap happens on Arc — switch wallet if needed
      if (connectedChainId !== 5042002) {
        setStatusMsg('Switching to Arc Testnet...')
        await switchChainAsync({ chainId: 5042002 })
      }

      // Dynamic import AppKit (full SDK, not swap-kit)
      const [appKitMod, adapterMod] = await Promise.all([
        import('@circle-fin/app-kit'),
        import('@circle-fin/adapter-viem-v2'),
      ])

      const AppKit = appKitMod.AppKit
      const createAdapter = adapterMod.createViemAdapterFromProvider

      const provider = (window as any).ethereum
      if (!provider) {
        setStep('error')
        setError('No wallet provider found. Make sure your wallet is connected.')
        return
      }

      setStatusMsg('Preparing swap...')
      const adapter = await createAdapter({ provider })
      const kit = new AppKit()

      setStatusMsg(`Swapping ${amount} ${swapTokenIn} → ${swapTokenOut}...`)

      const result = await kit.swap({
        from: { adapter, chain: 'Arc_Testnet' },
        tokenIn: swapTokenIn,
        tokenOut: swapTokenOut,
        amountIn: amount,
        config: {
          kitKey: import.meta.env.VITE_CIRCLE_KIT_KEY,
        },
      })

      setStep('success')
      setStatusMsg('Swap complete.')
      if (result?.txHash) setBurnTxHash(result.txHash)
      if (result?.explorerUrl) setMintTxHash(result.explorerUrl)
      refetchBalance()

    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Swap failed'
      setStep('error')
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setError('Transaction cancelled.')
      } else if (msg.includes('insufficient funds')) {
        setError('Insufficient USDC on Arc for swap. Get testnet USDC at faucet.circle.com')
      } else {
        setError(msg)
      }
      setStatusMsg('')
    }
  }

  const handleSubmit = async () => {
    if (mode === 'bridge') {
      await handleBridge()
    } else {
      await handleSwap()
    }
  }

  const isValid = amount && parseFloat(amount) > 0
  const isLoading = step !== 'idle' && step !== 'success' && step !== 'error'
  const token = mode === 'swap' ? TOKENS[swapTokenIn] : TOKENS.USDC
  const tokenOut = mode === 'swap' ? TOKENS[swapTokenOut] : TOKENS.USDC
  const hasAllowance = (allowanceData ?? 0n) > 0n

  return (
    <div className="bp">
      {/* Mode Toggle */}
      <div className="bp-tabs">
        <button className={`bp-tab ${mode === 'bridge' ? 'on' : ''}`} onClick={() => { setMode('bridge'); if (step === 'error') resetState() }} type="button">
          Bridge
        </button>
        <button className={`bp-tab ${mode === 'swap' ? 'on' : ''}`} onClick={() => { setMode('swap'); if (step === 'error') resetState() }} type="button">
          Swap
        </button>
      </div>

      {/* Source */}
      <div className="bp-section">
        {mode === 'bridge' && (
          <ChainSelector label="From" selectedChain={sourceChain} onSelect={setSourceChain} exclude={destChain.id} filterBridge />
        )}
        <TokenInput
          label={mode === 'bridge' ? 'You Send' : 'You Pay'}
          value={amount}
          onChange={setAmount}
          token={token.symbol}
          tokenColor={token.color}
          tokenIcon={token.icon}
          balance={authenticated ? displayBalance : '---'}
        />
      </div>

      {/* Flip */}
      <div className="bp-flip-wrap">
        <button className="bp-flip" onClick={handleFlip} type="button" title="Swap direction">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Destination */}
      <div className="bp-section">
        {mode === 'bridge' && (
          <ChainSelector label="To" selectedChain={destChain} onSelect={setDestChain} exclude={sourceChain.id} filterBridge />
        )}
        <TokenInput
          label="You Receive"
          value={amount ? (mode === 'swap' ? (parseFloat(amount) * 0.99).toFixed(2) : amount) : ''}
          onChange={() => {}}
          token={tokenOut.symbol}
          tokenColor={tokenOut.color}
          tokenIcon={tokenOut.icon}
          readOnly
        />
      </div>

      {/* Summary */}
      {amount && parseFloat(amount) > 0 && (
        <div className="bp-summary">
          <div className="bp-sum-row">
            <span className="bp-sum-k">{mode === 'bridge' ? 'Bridge Fee' : 'Swap Fee'}</span>
            <span className="bp-sum-v">{fee ? `~${fee} USDC` : 'Loading...'}</span>
          </div>
          <div className="bp-sum-row">
            <span className="bp-sum-k">Est. Time</span>
            <span className="bp-sum-v accent">{mode === 'swap' ? '< 5s' : '< 30s'}</span>
          </div>
          <div className="bp-sum-row">
            <span className="bp-sum-k">Route</span>
            <span className="bp-sum-v">{mode === 'swap' ? 'StableFX on Arc' : 'CCTP v2 + Forwarding'}</span>
          </div>
          {hasAllowance && (
            <div className="bp-sum-row">
              <span className="bp-sum-k">Approval</span>
              <span className="bp-sum-v accent">Already approved (1 click)</span>
            </div>
          )}
          {mode === 'swap' && (
            <div className="bp-sum-row">
              <span className="bp-sum-k">Rate</span>
              <span className="bp-sum-v">1 {swapTokenIn} ~ 0.99 {swapTokenOut}</span>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <button
        className="bp-cta coming-soon"
        disabled
        type="button"
      >
        Coming Soon
      </button>

      {/* Modal popup for progress / success / error */}
      <BridgeModal
        step={step}
        mode={mode}
        statusMsg={statusMsg}
        error={error}
        burnTxHash={burnTxHash}
        mintTxHash={mintTxHash}
        sourceChainName={sourceChain.shortName}
        destChainName={destChain.shortName}
        sourceChainId={sourceChain.chainId}
        destChainId={destChain.chainId}
        amount={amount}
        tokenIn={mode === 'swap' ? swapTokenIn : 'USDC'}
        tokenOut={mode === 'swap' ? swapTokenOut : 'USDC'}
        hasAllowance={hasAllowance}
        onClose={resetState}
      />
    </div>
  )
}
