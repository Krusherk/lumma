/**
 * useLiFiTransfers — fetches a user's transfer history from LI.FI Analytics API.
 *
 * Filters by integrator='lumma' so we only see transfers made through our app.
 * Docs: https://docs.li.fi/api-reference/get-a-list-of-filtered-transfers
 */
import { useState, useEffect, useCallback } from 'react'

const LIFI_BASE = 'https://li.quest/v1/analytics/transfers'

export interface LiFiToken {
  address: string
  chainId: number
  symbol: string
  decimals: number
  name: string
  logoURI?: string
  priceUSD?: string
}

export interface LiFiTransferSide {
  txHash: string
  txLink: string
  amount: string
  token: LiFiToken
  chainId: number
  gasAmountUSD?: string
  amountUSD?: string
  timestamp: number
}

export interface LiFiTransfer {
  transactionId: string
  sending: LiFiTransferSide
  receiving: LiFiTransferSide
  lifiExplorerLink: string
  fromAddress: string
  toAddress: string
  tool: string
  status: 'DONE' | 'PENDING' | 'FAILED'
  substatus?: string
  substatusMessage?: string
}

interface UseLiFiTransfersOptions {
  wallet?: string
  status?: 'ALL' | 'DONE' | 'PENDING' | 'FAILED'
  fromChain?: number
  toChain?: number
}

export function useLiFiTransfers(opts: UseLiFiTransfersOptions) {
  const [transfers, setTransfers] = useState<LiFiTransfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransfers = useCallback(async () => {
    if (!opts.wallet) {
      setTransfers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        integrator: 'lumma',
        wallet: opts.wallet,
        status: opts.status || 'ALL',
      })

      if (opts.fromChain) params.set('fromChain', String(opts.fromChain))
      if (opts.toChain) params.set('toChain', String(opts.toChain))

      const res = await fetch(`${LIFI_BASE}?${params}`)
      if (!res.ok) throw new Error(`LI.FI API error: ${res.status}`)

      const data = await res.json()
      setTransfers(data.transfers || [])
    } catch (err: any) {
      console.error('Failed to fetch LI.FI transfers:', err)
      setError(err.message || 'Failed to load transfers')
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }, [opts.wallet, opts.status, opts.fromChain, opts.toChain])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  return { transfers, loading, error, refetch: fetchTransfers }
}
