import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Vendor, VendorInsert, VendorUpdate } from '@/features/vendors/types'

interface VendorState {
  vendors: Vendor[]
  loading: boolean
  error: string | null
  // actions
  fetchVendors: () => Promise<void>
  createVendor: (data: VendorInsert) => Promise<{ error: string | null; id?: string }>
  updateVendor: (id: string, data: VendorUpdate) => Promise<{ error: string | null }>
  getVendorById: (id: string) => Vendor | undefined
}

export const useVendorStore = create<VendorState>((set, get) => ({
  vendors: [],
  loading: false,
  error: null,

  fetchVendors: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ vendors: data, loading: false })
  },

  createVendor: async (data) => {
    const res = await supabase.from('vendors').insert(data).select().single()
    if (res.error) return { error: res.error.message }
    const created = res.data
    set((s) => ({ vendors: [created, ...s.vendors] }))
    return { error: null, id: created.id }
  },

  updateVendor: async (id, data) => {
    const res = await supabase.from('vendors').update(data).eq('id', id).select().single()
    if (res.error) return { error: res.error.message }
    const updated = res.data
    set((s) => ({
      vendors: s.vendors.map((v) => (v.id === id ? updated : v)),
    }))
    return { error: null }
  },

  getVendorById: (id) => get().vendors.find((v) => v.id === id),
}))
