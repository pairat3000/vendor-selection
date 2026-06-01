import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useVendorStore } from '@/stores/vendorStore'
import { useAuthStore } from '@/stores/authStore'
import StatusBadge from '@/components/StatusBadge'
import { VENDOR_TYPES } from './types'
import type { Vendor } from './types'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="w-44 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value ?? '—'}</span>
    </div>
  )
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vendors, fetchVendors, updateVendor } = useVendorStore()
  const { profile } = useAuthStore()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    if (vendors.length === 0) void fetchVendors()
  }, [vendors.length, fetchVendors])

  useEffect(() => {
    if (id) {
      const found = vendors.find((v) => v.id === id)
      if (found) setVendor(found)
    }
  }, [id, vendors])

  const handleStatus = async (status: 'approved' | 'rejected') => {
    if (!vendor) return
    setApproving(true)
    await updateVendor(vendor.id, { status })
    setApproving(false)
    setVendor((prev) => prev ? { ...prev, status } : prev)
  }

  if (!vendor) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const typLabel = VENDOR_TYPES.find((t) => t.value === vendor.type)?.label ?? vendor.type
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-gray-500">
        <Link to="/vendors" className="hover:underline">Vendor Registry</Link>
        <span className="mx-2">/</span>
        <span>{vendor.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
            <StatusBadge status={vendor.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">{typLabel}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && vendor.status === 'pending' && (
            <>
              <button onClick={() => void handleStatus('approved')} disabled={approving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                ✓ อนุมัติ
              </button>
              <button onClick={() => void handleStatus('rejected')} disabled={approving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                ✕ ปฏิเสธ
              </button>
            </>
          )}
          <button onClick={() => { navigate(`/vendors/${vendor.id}/edit`) }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ✎ แก้ไข
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ข้อมูลบริษัท */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลบริษัท</h2>
          <InfoRow label="ชื่อบริษัท" value={vendor.name} />
          <InfoRow label="เลขนิติบุคคล" value={vendor.tax_id} />
          <InfoRow label="ประเภท" value={typLabel} />
          <InfoRow label="เงื่อนไขชำระเงิน" value={vendor.payment_terms} />
          <InfoRow label="ที่อยู่" value={vendor.address} />
        </div>

        {/* ผู้ติดต่อ */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">ผู้ติดต่อ</h2>
          <InfoRow label="ชื่อผู้ติดต่อ" value={vendor.contact_name} />
          <InfoRow label="อีเมล" value={vendor.contact_email} />
          <InfoRow label="เบอร์โทรศัพท์" value={vendor.contact_phone} />
        </div>
      </div>
    </div>
  )
}
