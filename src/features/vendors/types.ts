import type { Database } from '@/types/database'

export type Vendor = Database['public']['Tables']['vendors']['Row']
export type VendorInsert = Database['public']['Tables']['vendors']['Insert']
export type VendorUpdate = Database['public']['Tables']['vendors']['Update']

export const VENDOR_TYPES = [
  { value: 'company', label: 'บริษัทจำกัด' },
  { value: 'partnership', label: 'ห้างหุ้นส่วน' },
  { value: 'sole', label: 'เจ้าของคนเดียว' },
  { value: 'foreign', label: 'บริษัทต่างชาติ' },
] as const

export const PAYMENT_TERMS = [
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'COD',
  'ล่วงหน้า 100%',
] as const
