import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ApprovalRule = Database['public']['Tables']['approval_rules']['Row']
type ApprovalRuleInsert = Database['public']['Tables']['approval_rules']['Insert']
export type Approval = Database['public']['Tables']['approvals']['Row']

export interface ApproverOption {
  id: string
  full_name: string
  role: string
}

export interface ApprovalWithRequest extends Approval {
  request_title?: string
  request_budget?: number
}

interface ApprovalState {
  rules: ApprovalRule[]
  approvers: ApproverOption[]
  approvals: Approval[]
  myPendingApprovals: ApprovalWithRequest[]
  loading: boolean
  // rules
  fetchRules: () => Promise<void>
  fetchApprovers: () => Promise<void>
  saveRule: (data: ApprovalRuleInsert) => Promise<{ error: string | null }>
  deleteRule: (id: string) => Promise<void>
  // workflow
  submitForApproval: (requestId: string) => Promise<{ error: string | null }>
  fetchApprovals: (requestId: string) => Promise<Approval[]>
  fetchMyPendingApprovals: () => Promise<void>
  processApproval: (approvalId: string, approverId: string, status: 'approved' | 'returned', comment?: string) => Promise<{ error: string | null }>
}

export const useApprovalStore = create<ApprovalState>((set) => ({
  rules: [],
  approvers: [],
  approvals: [],
  myPendingApprovals: [],
  loading: false,

  fetchRules: async () => {
    const { data } = await supabase
      .from('approval_rules')
      .select('*')
      .order('level')
      .order('min_budget')
    set({ rules: data ?? [] })
  },

  fetchApprovers: async () => {
    // Users who can be assigned as approvers (approver or admin role)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['approver', 'admin'])
      .order('full_name')
    set({ approvers: data ?? [] })
  },

  saveRule: async (data) => {
    const res = await supabase.from('approval_rules').insert(data).select().single()
    if (res.error) return { error: res.error.message }
    set((s) => ({ rules: [...s.rules, res.data].sort((a, b) => a.level - b.level || a.min_budget - b.min_budget) }))
    return { error: null }
  },

  deleteRule: async (id) => {
    await supabase.from('approval_rules').delete().eq('id', id)
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }))
  },

  submitForApproval: async (requestId) => {
    const { error } = await supabase.rpc('create_approval_records', { p_request_id: requestId })
    if (error) return { error: error.message }
    return { error: null }
  },

  fetchApprovals: async (requestId) => {
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('request_id', requestId)
      .order('level')
    const result = data ?? []
    set({ approvals: result })
    return result
  },

  fetchMyPendingApprovals: async () => {
    set({ loading: true })
    const { data: approvalsData } = await supabase
      .from('approvals')
      .select('*')
      .eq('status', 'pending')
    if (!approvalsData) { set({ loading: false }); return }

    const requestIds = [...new Set(approvalsData.map((a) => a.request_id))]
    const { data: requestsData } = await supabase
      .from('selection_requests')
      .select('id, title, budget')
      .in('id', requestIds)
    const reqMap = Object.fromEntries((requestsData ?? []).map((r) => [r.id, r]))

    const mapped: ApprovalWithRequest[] = approvalsData.map((a) => ({
      ...a,
      request_title: (reqMap[a.request_id] as { title: string; budget: number } | undefined)?.title,
      request_budget: (reqMap[a.request_id] as { title: string; budget: number } | undefined)?.budget,
    }))
    set({ myPendingApprovals: mapped, loading: false })
  },

  processApproval: async (approvalId, approverId, status, comment) => {
    const { error } = await supabase.rpc('process_approval', {
      p_approval_id: approvalId,
      p_approver_id: approverId,
      p_status: status,
      p_comment: comment ?? null,
    })
    if (error) return { error: error.message }
    set((s) => ({
      myPendingApprovals: s.myPendingApprovals.filter((a) => a.id !== approvalId),
      approvals: s.approvals.map((a) =>
        a.id === approvalId ? { ...a, status, approver_id: approverId, comment: comment ?? null, decided_at: new Date().toISOString() } : a,
      ),
    }))
    return { error: null }
  },
}))
