import type { Database } from '@/types/database'

export type SelectionRequest = Database['public']['Tables']['selection_requests']['Row']
export type SelectionRequestInsert = Database['public']['Tables']['selection_requests']['Insert']
export type RequestVendor = Database['public']['Tables']['request_vendors']['Row']
export type RequestVendorInsert = Database['public']['Tables']['request_vendors']['Insert']

export const REQUEST_TYPES = [
  { value: 'general',  label: 'ทั่วไป' },
  { value: 'software', label: 'Software / IT' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'service',  label: 'Service / Outsource' },
  { value: 'consult',  label: 'Consultant' },
] as const

export interface RequestVendorWithName extends RequestVendor {
  vendor_name?: string
}
