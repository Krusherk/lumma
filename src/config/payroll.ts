/**
 * Payroll Supabase types and database helpers.
 *
 * Tables:
 *  - payroll_companies    → company / employer record (1 per wallet)
 *  - payroll_contractors  → team members with wallet + pay amount
 *  - payroll_payments     → on-chain payment receipts
 *  - payroll_invites      → shareable invite tokens for contractor signup
 */
import { supabase } from './supabase'

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface PayrollCompany {
  id: string
  owner_address: string
  name: string
  vault_address: string | null
  vault_chain: string | null
  vault_wallet_id: string | null
  pay_schedule: 'manual' | 'weekly' | 'biweekly' | 'monthly'
  next_pay_date: string | null
  created_at: string
}

export interface PayrollContractor {
  id: string
  company_id: string
  name: string
  email: string | null
  wallet_address: string
  amount_usdc: number
  chain_id: number
  role: string
  status: 'active' | 'paused'
  created_at: string
}

export interface PayrollPayment {
  id: string
  company_id: string
  contractor_id: string
  contractor_name?: string      // joined
  amount: number
  chain_id: number
  tx_hash: string | null
  status: 'pending' | 'confirmed' | 'failed'
  paid_at: string
}

export interface PayrollInvite {
  id: string
  company_id: string
  company_name?: string        // joined
  token: string                // unique shareable code
  role: string
  amount_usdc: number
  chain_id: number
  used_by: string | null       // wallet address of contractor who claimed
  expires_at: string
  created_at: string
}

/* ═══════════════════════════════════════
   Company CRUD
   ═══════════════════════════════════════ */

export async function getOrCreateCompany(ownerAddress: string, name?: string): Promise<PayrollCompany | null> {
  // Try to find existing
  const { data: existing } = await supabase
    .from('payroll_companies')
    .select('*')
    .eq('owner_address', ownerAddress.toLowerCase())
    .single()

  if (existing) return existing as PayrollCompany

  // Create new
  const { data, error } = await supabase
    .from('payroll_companies')
    .insert({
      owner_address: ownerAddress.toLowerCase(),
      name: name || 'My Company',
      pay_schedule: 'manual',
    })
    .select()
    .single()

  if (error) { console.error('Create company:', error); return null }
  return data as PayrollCompany
}

export async function updateCompany(id: string, updates: Partial<Pick<PayrollCompany, 'name' | 'pay_schedule' | 'next_pay_date'>>) {
  const { error } = await supabase
    .from('payroll_companies')
    .update(updates)
    .eq('id', id)
  if (error) console.error('Update company:', error)
  return !error
}

/* ═══════════════════════════════════════
   Contractor CRUD
   ═══════════════════════════════════════ */

export async function getContractors(companyId: string): Promise<PayrollContractor[]> {
  const { data, error } = await supabase
    .from('payroll_contractors')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) { console.error('Get contractors:', error); return [] }
  return (data || []) as PayrollContractor[]
}

export async function addContractor(contractor: Omit<PayrollContractor, 'id' | 'created_at'>): Promise<PayrollContractor | null> {
  const { data, error } = await supabase
    .from('payroll_contractors')
    .insert(contractor)
    .select()
    .single()

  if (error) { console.error('Add contractor:', error); return null }
  return data as PayrollContractor
}

export async function updateContractor(id: string, updates: Partial<PayrollContractor>) {
  const { error } = await supabase
    .from('payroll_contractors')
    .update(updates)
    .eq('id', id)
  if (error) console.error('Update contractor:', error)
  return !error
}

export async function removeContractor(id: string) {
  const { error } = await supabase
    .from('payroll_contractors')
    .delete()
    .eq('id', id)
  if (error) console.error('Remove contractor:', error)
  return !error
}

/* ═══════════════════════════════════════
   Payment History
   ═══════════════════════════════════════ */

export async function getPayments(companyId: string): Promise<PayrollPayment[]> {
  const { data, error } = await supabase
    .from('payroll_payments')
    .select('*, payroll_contractors(name)')
    .eq('company_id', companyId)
    .order('paid_at', { ascending: false })
    .limit(100)

  if (error) { console.error('Get payments:', error); return [] }
  return (data || []).map((p: any) => ({
    ...p,
    contractor_name: p.payroll_contractors?.name || 'Unknown',
  })) as PayrollPayment[]
}

export async function createPayment(payment: Omit<PayrollPayment, 'id' | 'paid_at' | 'contractor_name'>): Promise<PayrollPayment | null> {
  const { data, error } = await supabase
    .from('payroll_payments')
    .insert(payment)
    .select()
    .single()

  if (error) { console.error('Create payment:', error); return null }
  return data as PayrollPayment
}

export async function updatePaymentStatus(id: string, status: 'confirmed' | 'failed', txHash?: string) {
  const updates: any = { status }
  if (txHash) updates.tx_hash = txHash
  const { error } = await supabase
    .from('payroll_payments')
    .update(updates)
    .eq('id', id)
  if (error) console.error('Update payment:', error)
  return !error
}

/* ═══════════════════════════════════════
   Invite Links
   ═══════════════════════════════════════ */

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(36))
    .join('')
    .slice(0, 12)
    .toUpperCase()
}

export async function createInvite(companyId: string, role: string, amountUsdc: number, chainId: number): Promise<PayrollInvite | null> {
  const token = generateToken()
  const expires = new Date()
  expires.setDate(expires.getDate() + 7) // 7-day expiry

  const { data, error } = await supabase
    .from('payroll_invites')
    .insert({
      company_id: companyId,
      token,
      role,
      amount_usdc: amountUsdc,
      chain_id: chainId,
      expires_at: expires.toISOString(),
    })
    .select()
    .single()

  if (error) { console.error('Create invite:', error); return null }
  return data as PayrollInvite
}

export async function getInviteByToken(token: string): Promise<PayrollInvite | null> {
  const { data, error } = await supabase
    .from('payroll_invites')
    .select('*, payroll_companies(name)')
    .eq('token', token)
    .is('used_by', null)
    .single()

  if (error) return null

  return {
    ...data,
    company_name: (data as any).payroll_companies?.name || 'Unknown',
  } as PayrollInvite
}

export async function claimInvite(token: string, walletAddress: string, name: string): Promise<boolean> {
  // Get invite
  const invite = await getInviteByToken(token)
  if (!invite) return false
  if (new Date(invite.expires_at) < new Date()) return false

  // Add contractor
  const contractor = await addContractor({
    company_id: invite.company_id,
    name,
    email: null,
    wallet_address: walletAddress.toLowerCase(),
    amount_usdc: invite.amount_usdc,
    chain_id: invite.chain_id,
    role: invite.role,
    status: 'active',
  })
  if (!contractor) return false

  // Mark invite as used
  await supabase
    .from('payroll_invites')
    .update({ used_by: walletAddress.toLowerCase() })
    .eq('token', token)

  return true
}

export async function getCompanyInvites(companyId: string): Promise<PayrollInvite[]> {
  const { data, error } = await supabase
    .from('payroll_invites')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) { console.error('Get invites:', error); return [] }
  return (data || []) as PayrollInvite[]
}
