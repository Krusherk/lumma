import { useAccount, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { USDC_ADDRESSES, ERC20_ABI, TOKENS } from '../../config/tokens'
import { SUPPORTED_CHAINS } from '../../config/chains'

export interface ChainBalance {
  chainId: number
  name: string
  shortName: string
  color: string
  icon: string
  token: string          // "USDC" or "EURC"
  balance: string        // formatted (e.g. "12.45")
  balanceRaw: bigint
  isLoading: boolean
  isError: boolean
}

/** EURC address on Arc Testnet */
const EURC_ARC = TOKENS.EURC.addresses.arc_testnet as `0x${string}`

/**
 * Queries USDC balances across all chains + EURC on Arc.
 * Uses wagmi's useReadContracts for batch multicall.
 */
export function useMultiChainBalance() {
  const { address, isConnected } = useAccount()

  // USDC on every chain
  const usdcContracts = SUPPORTED_CHAINS.map((chain) => ({
    address: USDC_ADDRESSES[chain.chainId] as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf' as const,
    args: [address!] as readonly [`0x${string}`],
    chainId: chain.chainId,
  }))

  // EURC on Arc only
  const eurcContract = {
    address: EURC_ARC,
    abi: ERC20_ABI,
    functionName: 'balanceOf' as const,
    args: [address!] as readonly [`0x${string}`],
    chainId: 5042002,
  }

  const allContracts = [...usdcContracts, eurcContract]

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: isConnected && address ? allContracts : [],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 15_000,
    },
  })

  // USDC balances
  const usdcBalances: ChainBalance[] = SUPPORTED_CHAINS.map((chain, i) => {
    const result = data?.[i]
    const raw = result?.status === 'success' ? (result.result as bigint) : 0n
    const formatted = result?.status === 'success' ? formatUnits(raw, 6) : '0.00'

    return {
      chainId: chain.chainId,
      name: chain.name,
      shortName: chain.shortName,
      color: chain.color,
      icon: chain.icon,
      token: 'USDC',
      balance: parseFloat(formatted).toFixed(2),
      balanceRaw: raw,
      isLoading,
      isError: result?.status === 'failure',
    }
  })

  // EURC balance (last item in data)
  const eurcResult = data?.[SUPPORTED_CHAINS.length]
  const eurcRaw = eurcResult?.status === 'success' ? (eurcResult.result as bigint) : 0n
  const eurcFormatted = eurcResult?.status === 'success' ? formatUnits(eurcRaw, 6) : '0.00'

  const eurcBalance: ChainBalance = {
    chainId: 5042002,
    name: 'Arc Testnet',
    shortName: 'Arc',
    color: '#1b6ef5',
    icon: '/images/arclogo.jpg',
    token: 'EURC',
    balance: parseFloat(eurcFormatted).toFixed(2),
    balanceRaw: eurcRaw,
    isLoading,
    isError: eurcResult?.status === 'failure',
  }

  const balances = [...usdcBalances, eurcBalance]

  // Total (USDC only for dollar value, EURC ~= 1:1 for now)
  const totalRaw = balances.reduce((sum, b) => sum + b.balanceRaw, 0n)
  const total = parseFloat(formatUnits(totalRaw, 6)).toFixed(2)

  return {
    balances,
    total,
    totalRaw,
    isLoading,
    isError,
    isConnected,
    refetch,
  }
}
