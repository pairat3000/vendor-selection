import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

export interface ManagedUser {
  id: string
  full_name: string
  email: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

interface CreateUserInput {
  email: string
  password: string
  full_name: string
  role: UserRole
}

interface UserState {
  users: ManagedUser[]
  loading: boolean
  fetchUsers: () => Promise<void>
  createUser: (input: CreateUserInput) => Promise<{ error: string | null }>
  updateRole: (id: string, role: UserRole) => Promise<{ error: string | null }>
  toggleActive: (id: string, isActive: boolean) => Promise<{ error: string | null }>
  resetPassword: (id: string, password: string) => Promise<{ error: string | null }>
  deleteUser: (id: string) => Promise<{ error: string | null }>
}

interface AdminFnResult {
  ok?: boolean
  error?: string
}

async function callAdminFn(body: Record<string, unknown>): Promise<{ error: string | null }> {
  const result = await supabase.functions.invoke<AdminFnResult>('admin-users', { body })
  const data = result.data
  const err = result.error as { message: string; context?: { body?: string } } | null
  if (err) {
    // Edge function returns error detail in the response body
    const ctxBody = err.context?.body
    if (ctxBody) {
      try {
        const parsed = JSON.parse(ctxBody) as { error?: string }
        return { error: parsed.error ?? err.message }
      } catch { /* fall through */ }
    }
    return { error: err.message }
  }
  if (data?.error) return { error: data.error }
  return { error: null }
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  loading: false,

  fetchUsers: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false })
    set({ users: data ?? [], loading: false })
  },

  createUser: async (input) => {
    const result = await callAdminFn({ action: 'create', ...input })
    return result
  },

  updateRole: async (id, role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) return { error: error.message }
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) }))
    return { error: null }
  },

  toggleActive: async (id, isActive) => {
    // เรียก edge function: ban/unban auth user + sync is_active (ปิดใช้งานจริง login ไม่ได้)
    const result = await callAdminFn({ action: 'set_active', user_id: id, is_active: isActive })
    if (result.error) return result
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, is_active: isActive } : u)) }))
    return { error: null }
  },

  resetPassword: async (id, password) => {
    return callAdminFn({ action: 'reset_password', user_id: id, password })
  },

  deleteUser: async (id) => {
    const result = await callAdminFn({ action: 'delete', user_id: id })
    if (!result.error) {
      set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    }
    return result
  },
}))
