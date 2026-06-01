import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useVendorStore } from '@/stores/vendorStore'
import VendorForm from './VendorForm'
import type { Vendor } from './types'

export default function VendorEditPage() {
  const { id } = useParams<{ id: string }>()
  const { vendors, fetchVendors } = useVendorStore()
  const [vendor, setVendor] = useState<Vendor | null>(null)

  useEffect(() => {
    if (vendors.length === 0) void fetchVendors()
  }, [vendors.length, fetchVendors])

  useEffect(() => {
    if (id) {
      const found = vendors.find((v) => v.id === id)
      if (found) setVendor(found)
    }
  }, [id, vendors])

  if (!vendor) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">แก้ไข Vendor</h1>
        <p className="mt-1 text-sm text-gray-500">{vendor.name}</p>
      </div>
      <div className="max-w-2xl">
        <VendorForm vendor={vendor} />
      </div>
    </div>
  )
}
