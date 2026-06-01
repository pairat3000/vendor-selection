import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useVendorStore } from '@/stores/vendorStore'
import { useVendorFieldStore } from '@/stores/vendorFieldStore'
import { useAuthStore } from '@/stores/authStore'
import StatusBadge from '@/components/StatusBadge'
import { VENDOR_TYPES } from './types'
import type { Vendor } from './types'

interface AuditEntry {
  action: string
  by: string
  at: string
  reason?: string
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="w-44 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value ?? '—'}</span>
    </div>
  )
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vendors, fetchVendors, updateVendor } = useVendorStore()
  const { fields, fetchFields, fetchValues } = useVendorFieldStore()
  const { profile, user } = useAuthStore()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [dynValues, setDynValues] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [audit, setAudit] = useState<AuditEntry[]>([])

  useEffect(() => {
    if (vendors.length === 0) void fetchVendors()
    void fetchFields()
  }, [vendors.length, fetchVendors, fetchFields])

  useEffect(() => {
    if (!id) return
    const found = vendors.find((v) => v.id === id)
    if (found) {
      setVendor(found)
      void fetchValues(id).then((vals) => {
        const map: Record<string, string> = {}
        vals.forEach((v) => { map[v.field_key] = v.value ?? '' })
        setDynValues(map)
      })
    }
  }, [id, vendors, fetchValues])

  const handleApprove = async () => {
    if (!vendor || !user) return
    setApproving(true)
    await updateVendor(vendor.id, { status: 'approved' })
    setVendor((p) => p ? { ...p, status: 'approved' } : p)
    setAudit((p) => [{ action: 'approved', by: profile?.full_name ?? 'Admin', at: new Date().toLocaleString('th-TH') }, ...p])
    setApproving(false)
  }

  const handleReject = async () => {
    if (!vendor || !rejectReason.trim()) return
    setApproving(true)
    await updateVendor(vendor.id, { status: 'rejected' })
    setVendor((p) => p ? { ...p, status: 'rejected' } : p)
    setAudit((p) => [{
      action: 'rejected',
      by: profile?.full_name ?? 'Admin',
      at: new Date().toLocaleString('th-TH'),
      reason: rejectReason,
    }, ...p])
    setApproving(false)
    setShowRejectModal(false)
    setRejectReason('')
  }

  if (!vendor) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const typeLabel = VENDOR_TYPES.find((t) => t.value === vendor.type)?.label ?? vendor.type
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
          <p className="mt-1 text-sm text-gray-500">{typeLabel}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && vendor.status === 'pending' && (
            <>
              <button onClick={() => void handleApprove()} disabled={approving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                ✓ อนุมัติ
              </button>
              <button onClick={() => { setShowRejectModal(true) }} disabled={approving}
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
          <InfoRow label="ประเภท" value={typeLabel} />
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

        {/* Dynamic Fields */}
        {fields.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลเพิ่มเติม</h2>
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {fields.map((f) => (
                <InfoRow
                  key={f.id}
                  label={f.field_label}
                  value={
                    f.field_type === 'boolean'
                      ? dynValues[f.field_key] === 'true' ? '✓ ใช่' : '✗ ไม่ใช่'
                      : dynValues[f.field_key] ?? null
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        {audit.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Audit Trail</h2>
            <ul className="space-y-2">
              {audit.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.action === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {a.action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900">{a.by}</span>
                    <span className="text-gray-500"> · {a.at}</span>
                    {a.reason && <p className="text-gray-500">เหตุผล: {a.reason}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">ปฏิเสธ Vendor</h3>
            <p className="mb-3 text-sm text-gray-500">กรุณาระบุเหตุผลการปฏิเสธ</p>
            <textarea
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value) }}
              rows={3}
              className="input w-full resize-none"
              placeholder="เช่น เอกสารไม่ครบ, ข้อมูลไม่ถูกต้อง..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowRejectModal(false) }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={!rejectReason.trim() || approving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
