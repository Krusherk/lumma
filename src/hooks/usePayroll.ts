/**
 * usePayroll — React hook for the Agent Payroll module.
 *
 * All transfers go through the backend API which uses
 * Circle Agent Wallets. The frontend never signs transactions.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import {
  type PayrollCompany,
  type PayrollContractor,
  type PayrollPayment,
  type PayrollInvite,
  getContractors,
  addContractor,
  updateContractor,
  removeContractor,
  getPayments,
  createInvite,
  getCompanyInvites,
  updateCompany,
} from '../config/payroll'

type View = 'roster' | 'pay' | 'history' | 'settings'

interface VaultInfo {
  company_id: string
  vault_address: string
  vault_chain: string
  name: string
  pay_schedule: string
  balance: string
}

export function usePayroll() {
  const { address } = useAccount()

  const [company, setCompany] = useState<PayrollCompany | null>(null)
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [contractors, setContractors] = useState<PayrollContractor[]>([])
  const [payments, setPayments] = useState<PayrollPayment[]>([])
  const [invites, setInvites] = useState<PayrollInvite[]>([])
  const [view, setView] = useState<View>('roster')
  const [loading, setLoading] = useState(true)
  const [disbursing, setDisbursing] = useState(false)
  const [disburseProgress, setDisburseProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  /* ── Initialize company + vault ── */
  useEffect(() => {
    if (!address) {
      setCompany(null)
      setVault(null)
      setContractors([])
      setPayments([])
      setInvites([])
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)

      try {
        // Create or get company vault via backend
        const walletRes = await fetch('/api/payroll/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_address: address }),
        })
        const walletData = await walletRes.json()

        if (cancelled) return

        if (walletData.error) {
          setError(walletData.error)
          setLoading(false)
          return
        }

        const companyObj: PayrollCompany = {
          id: walletData.company_id,
          owner_address: address.toLowerCase(),
          name: walletData.name,
          vault_address: walletData.vault_address || null,
          vault_chain: walletData.vault_chain || null,
          vault_wallet_id: walletData.vault_wallet_id || null,
          pay_schedule: walletData.pay_schedule,
          next_pay_date: null,
          created_at: '',
        }
        setCompany(companyObj)

        // Get vault balance
        const balRes = await fetch(`/api/payroll/balance?company_id=${walletData.company_id}`)
        const balData = await balRes.json()

        if (cancelled) return

        setVault({
          ...walletData,
          balance: balData.balance || '0',
        })

        // Load contractors, payments, invites from Supabase
        const [ctrs, pmts, invs] = await Promise.all([
          getContractors(walletData.company_id),
          getPayments(walletData.company_id),
          getCompanyInvites(walletData.company_id),
        ])

        if (!cancelled) {
          setContractors(ctrs)
          setPayments(pmts)
          setInvites(invs)
        }
      } catch (err: any) {
        if (!cancelled) setError('Failed to initialize payroll')
        console.error(err)
      }

      if (!cancelled) setLoading(false)
    })()

    return () => { cancelled = true }
  }, [address])

  /* ── Refresh helpers ── */

  const refreshContractors = useCallback(async () => {
    if (!company) return
    setContractors(await getContractors(company.id))
  }, [company])

  const refreshPayments = useCallback(async () => {
    if (!company) return
    setPayments(await getPayments(company.id))
  }, [company])

  const refreshInvites = useCallback(async () => {
    if (!company) return
    setInvites(await getCompanyInvites(company.id))
  }, [company])

  const refreshBalance = useCallback(async () => {
    if (!company) return
    try {
      const res = await fetch(`/api/payroll/balance?company_id=${company.id}`)
      const data = await res.json()
      setVault(prev => prev ? { ...prev, balance: data.balance || '0' } : null)
    } catch (err) {
      console.error('Failed to refresh balance:', err)
    }
  }, [company])

  /* ── Contractor management ── */

  const handleAddContractor = useCallback(async (
    name: string,
    walletAddress: string,
    amountUsdc: number,
    chainId: number,
    role: string,
  ) => {
    if (!company) return false
    setError(null)
    const result = await addContractor({
      company_id: company.id,
      name,
      email: null,
      wallet_address: walletAddress.toLowerCase(),
      amount_usdc: amountUsdc,
      chain_id: chainId,
      role,
      status: 'active',
    })
    if (result) {
      await refreshContractors()
      return true
    }
    setError('Failed to add contractor')
    return false
  }, [company, refreshContractors])

  const handleUpdateContractor = useCallback(async (id: string, updates: Partial<PayrollContractor>) => {
    setError(null)
    const ok = await updateContractor(id, updates)
    if (ok) await refreshContractors()
    else setError('Failed to update contractor')
    return ok
  }, [refreshContractors])

  const handleRemoveContractor = useCallback(async (id: string) => {
    setError(null)
    const ok = await removeContractor(id)
    if (ok) await refreshContractors()
    else setError('Failed to remove contractor')
    return ok
  }, [refreshContractors])

  /* ── Invite links ── */

  const handleCreateInvite = useCallback(async (role: string, amountUsdc: number, chainId: number) => {
    if (!company) return null
    setError(null)
    const invite = await createInvite(company.id, role, amountUsdc, chainId)
    if (invite) {
      await refreshInvites()
      return invite
    }
    setError('Failed to create invite')
    return null
  }, [company, refreshInvites])

  /* ── Company settings ── */

  const handleUpdateCompany = useCallback(async (updates: Partial<Pick<PayrollCompany, 'name' | 'pay_schedule' | 'next_pay_date'>>) => {
    if (!company) return false
    setError(null)

    // Update via Supabase directly (non-sensitive data)
    const ok = await updateCompany(company.id, updates)
    if (ok) {
      setCompany(prev => prev ? { ...prev, ...updates } : null)
      return true
    }
    setError('Failed to update settings')
    return false
  }, [company])

  /* ── Disburse via backend ── */

  const disburse = useCallback(async (contractorIds: string[]) => {
    if (!company) return
    setDisbursing(true)
    setError(null)
    setDisburseProgress('Sending payment request to vault...')

    try {
      const res = await fetch('/api/payroll/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          contractor_ids: contractorIds,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else if (data.summary) {
        setDisburseProgress(
          `Done: ${data.summary.succeeded} paid, ${data.summary.failed} failed`
        )

        if (data.summary.failed > 0) {
          setError(`${data.summary.succeeded} paid, ${data.summary.failed} failed`)
        }

        // Refresh data
        await Promise.all([refreshPayments(), refreshBalance()])
      }
    } catch (err: any) {
      setError('Failed to connect to payment server')
      console.error(err)
    }

    setDisbursing(false)
    setTimeout(() => setDisburseProgress(''), 3000)
  }, [company, refreshPayments, refreshBalance])

  /* ── Stats ── */
  const totalMonthly = contractors
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.amount_usdc, 0)

  const totalPaid = payments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0)

  return {
    company,
    vault,
    contractors,
    payments,
    invites,
    view,
    setView,
    loading,
    disbursing,
    disburseProgress,
    error,
    setError,
    totalMonthly,
    totalPaid,
    addContractor: handleAddContractor,
    updateContractor: handleUpdateContractor,
    removeContractor: handleRemoveContractor,
    createInvite: handleCreateInvite,
    updateCompany: handleUpdateCompany,
    disburse,
    refreshContractors,
    refreshPayments,
    refreshInvites,
    refreshBalance,
  }
}
