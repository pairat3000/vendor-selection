import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SelectionRequest, SelectionRequestInsert, RequestVendor, RequestVendorInsert } from '@/features/requests/types'

type SelectionRequestUpdate = Database['public']['Tables']['selection_requests']['Update']
type RequestVendorUpdate = Database['public']['Tables']['request_vendors']['Update']

interface RequestState {
  requests: SelectionRequest[]
  loading: boolean
  // requests
  fetchRequests: () => Promise<void>
  createRequest: (data: SelectionRequestInsert) => Promise<{ error: string | null; id?: string }>
  updateRequest: (id: string, data: SelectionRequestUpdate) => Promise<{ error: string | null }>
  // request vendors
  fetchRequestVendors: (requestId: string) => Promise<RequestVendor[]>
  addRequestVendor: (data: RequestVendorInsert) => Promise<{ error: string | null; id?: string }>
  updateRequestVendor: (id: string, data: RequestVendorUpdate) => Promise<{ error: string | null }>
  removeRequestVendor: (id: string) => Promise<{ error: string | null }>
  // file upload
  uploadQuotation: (requestId: string, vendorId: string, file: File) => Promise<{ error: string | null; url?: string }>
  deleteQuotation: (path: string) => Promise<{ error: string | null }>
  getQuotationUrl: (path: string) => Promise<string | null>
}

export const useRequestStore = create<RequestState>((set) => ({
  requests: [],
  loading: false,

  fetchRequests: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('selection_requests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    set({ requests: data ?? [], loading: false })
  },

  createRequest: async (data) => {
    const res = await supabase.from('selection_requests').insert(data).select().single()
    if (res.error) return { error: res.error.message }
    set((s) => ({ requests: [res.data, ...s.requests] }))
    return { error: null, id: res.data.id }
  },

  updateRequest: async (id, data) => {
    const res = await supabase.from('selection_requests').update(data).eq('id', id).select().single()
    if (res.error) return { error: res.error.message }
    set((s) => ({ requests: s.requests.map((r) => (r.id === id ? res.data : r)) }))
    return { error: null }
  },

  fetchRequestVendors: async (requestId) => {
    const { data } = await supabase
      .from('request_vendors')
      .select('*')
      .eq('request_id', requestId)
    return data ?? []
  },

  addRequestVendor: async (data) => {
    const res = await supabase.from('request_vendors').insert(data).select().single()
    if (res.error) return { error: res.error.message }
    return { error: null, id: res.data.id }
  },

  updateRequestVendor: async (id, data) => {
    const res = await supabase.from('request_vendors').update(data).eq('id', id).select().single()
    if (res.error) return { error: res.error.message }
    return { error: null }
  },

  removeRequestVendor: async (id) => {
    const { error } = await supabase.from('request_vendors').delete().eq('id', id)
    if (error) return { error: error.message }
    return { error: null }
  },

  uploadQuotation: async (requestId, vendorId, file) => {
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${requestId}/${vendorId}_${String(Date.now())}.${ext}`
    const { error } = await supabase.storage.from('quotations').upload(path, file)
    if (error) return { error: error.message }
    return { error: null, url: path }
  },

  deleteQuotation: async (path) => {
    const { error } = await supabase.storage.from('quotations').remove([path])
    if (error) return { error: error.message }
    return { error: null }
  },

  getQuotationUrl: async (path) => {
    const { data } = await supabase.storage.from('quotations').createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  },
}))
