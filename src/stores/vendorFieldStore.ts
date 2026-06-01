import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type VendorField = Database['public']['Tables']['vendor_fields']['Row']
type VendorFieldInsert = Database['public']['Tables']['vendor_fields']['Insert']
type VendorFieldValue = Database['public']['Tables']['vendor_field_values']['Row']

interface VendorFieldState {
  fields: VendorField[]
  loading: boolean
  // field definitions
  fetchFields: () => Promise<void>
  createField: (data: VendorFieldInsert) => Promise<{ error: string | null }>
  deleteField: (id: string) => Promise<{ error: string | null }>
  updateFieldOrder: (ids: string[]) => Promise<void>
  // field values per vendor
  fetchValues: (vendorId: string) => Promise<VendorFieldValue[]>
  saveValues: (vendorId: string, values: Record<string, string>) => Promise<{ error: string | null }>
}

export const useVendorFieldStore = create<VendorFieldState>((set, get) => ({
  fields: [],
  loading: false,

  fetchFields: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('vendor_fields')
      .select('*')
      .order('sort_order', { ascending: true })
    set({ fields: data ?? [], loading: false })
  },

  createField: async (data) => {
    const maxOrder = get().fields.reduce((m, f) => Math.max(m, f.sort_order), 0)
    const res = await supabase
      .from('vendor_fields')
      .insert({ ...data, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (res.error) return { error: res.error.message }
    set((s) => ({ fields: [...s.fields, res.data] }))
    return { error: null }
  },

  deleteField: async (id) => {
    const { error } = await supabase.from('vendor_fields').delete().eq('id', id)
    if (error) return { error: error.message }
    set((s) => ({ fields: s.fields.filter((f) => f.id !== id) }))
    return { error: null }
  },

  updateFieldOrder: async (ids) => {
    set((s) => ({
      fields: ids
        .map((id, i) => {
          const f = s.fields.find((x) => x.id === id)
          return f ? { ...f, sort_order: i + 1 } : null
        })
        .filter((f): f is VendorField => f !== null),
    }))
    await Promise.all(
      ids.map((id, i) =>
        supabase.from('vendor_fields').update({ sort_order: i + 1 }).eq('id', id),
      ),
    )
  },

  fetchValues: async (vendorId) => {
    const { data } = await supabase
      .from('vendor_field_values')
      .select('*')
      .eq('vendor_id', vendorId)
    return data ?? []
  },

  saveValues: async (vendorId, values) => {
    const upserts = Object.entries(values).map(([field_key, value]) => ({
      vendor_id: vendorId,
      field_key,
      value,
    }))
    if (upserts.length === 0) return { error: null }
    const { error } = await supabase
      .from('vendor_field_values')
      .upsert(upserts, { onConflict: 'vendor_id,field_key' })
    if (error) return { error: error.message }
    return { error: null }
  },
}))
