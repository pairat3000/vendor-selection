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
  approver_name?: string
}

export interface RequestApprovalGroup {
  requestId: string
  title: string
  budget: number
  status: string
  approvals: ApprovalWithRequest[]
}

interface ApprovalState {
  rules: ApprovalRule[]
  approvers: ApproverOption[]
  approvals: Approval[]
  myPendingApprovals: ApprovalWithRequest[]
  allApprovalGroups: RequestApprovalGroup[]
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
  fetchAllApprovals: () => Promise<void>
  processApproval: (approvalId: string, approverId: string, status: 'approved' | 'returned', comment?: string) => Promise<{ error: string | null }>
}

export const useApprovalStore = create<ApprovalState>((set) => ({
  rules: [],
  approvers: [],
  approvals: [],
  myPendingApprovals: [],
  allApprovalGroups: [],
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

  fetchAllApprovals: async () => {
    set({ loading: true })
    // Admin RLS allows reading all approvals
    const { data: approvalsData } = await supabase
      .from('approvals')
      .select('*')
      .order('level')
    if (!approvalsData) { set({ loading: false }); return }

    const requestIds = [...new Set(approvalsData.map((a) => a.request_id))]
    const approverIds = [...new Set(approvalsData.map((a) => a.approver_id).filter((x): x is string => x !== null))]

    const [{ data: requestsData }, { data: profileData }] = await Promise.all([
      requestIds.length > 0
        ? supabase.from('selection_requests').select('id, title, budget, status').in('id', requestIds)
        : Promise.resolve({ data: [] as { id: string; title: string; budget: number; status: string }[] }),
      approverIds.length > 0
        ? supabase.from('profiles').select('id, full_name').in('id', approverIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ])

    const reqMap = Object.fromEntries((requestsData ?? []).map((r) => [r.id, r]))
    const nameMap = Object.fromEntries((profileData ?? []).map((p) => [p.id, p.full_name]))

    // Group by request
    const groupMap = new Map<string, RequestApprovalGroup>()
    for (const a of approvalsData) {
      const req = reqMap[a.request_id] as { title: string; budget: number; status: string } | undefined
      if (!groupMap.has(a.request_id)) {
        groupMap.set(a.request_id, {
          requestId: a.request_id,
          title: req?.title ?? a.request_id,
          budget: req?.budget ?? 0,
          status: req?.status ?? 'unknown',
          approvals: [],
        })
      }
      groupMap.get(a.request_id)?.approvals.push({
        ...a,
        approver_name: a.approver_id ? (nameMap[a.approver_id] ?? '(ไม่ทราบ)') : '— ยังไม่กำหนด —',
      })
    }

    set({ allApprovalGroups: Array.from(groupMap.values()), loading: false })
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
