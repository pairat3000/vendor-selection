import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type DocumentType = Database['public']['Tables']['document_types']['Row']
export type RequestVendorDocument = Database['public']['Tables']['request_vendor_documents']['Row']

interface DocumentState {
  docTypes: DocumentType[]
  // doc types (admin-managed suggestion list)
  fetchDocTypes: () => Promise<void>
  addDocType: (name: string) => Promise<{ error: string | null }>
  deleteDocType: (id: string) => Promise<void>
  // per request-vendor documents
  fetchDocuments: (requestVendorIds: string[]) => Promise<RequestVendorDocument[]>
  addDocument: (requestVendorId: string, label: string, url: string) => Promise<{ error: string | null; doc?: RequestVendorDocument }>
  deleteDocument: (id: string) => Promise<{ error: string | null }>
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  docTypes: [],

  fetchDocTypes: async () => {
    const { data } = await supabase.from('document_types').select('*').order('sort_order')
    set({ docTypes: data ?? [] })
  },

  addDocType: async (name) => {
    const maxOrder = get().docTypes.reduce((m, d) => Math.max(m, d.sort_order), 0)
    const res = await supabase.from('document_types').insert({ name: name.trim(), sort_order: maxOrder + 1 }).select().single()
    if (res.error) return { error: res.error.message }
    set((s) => ({ docTypes: [...s.docTypes, res.data] }))
    return { error: null }
  },

  deleteDocType: async (id) => {
    await supabase.from('document_types').delete().eq('id', id)
    set((s) => ({ docTypes: s.docTypes.filter((d) => d.id !== id) }))
  },

  fetchDocuments: async (requestVendorIds) => {
    if (requestVendorIds.length === 0) return []
    const { data } = await supabase
      .from('request_vendor_documents')
      .select('*')
      .in('request_vendor_id', requestVendorIds)
      .order('sort_order')
    return data ?? []
  },

  addDocument: async (requestVendorId, label, url) => {
    const res = await supabase
      .from('request_vendor_documents')
      .insert({ request_vendor_id: requestVendorId, label: label.trim(), url: url.trim() })
      .select()
      .single()
    if (res.error) return { error: res.error.message }
    return { error: null, doc: res.data }
  },

  deleteDocument: async (id) => {
    const { error } = await supabase.from('request_vendor_documents').delete().eq('id', id)
    if (error) return { error: error.message }
    return { error: null }
  },
}))
