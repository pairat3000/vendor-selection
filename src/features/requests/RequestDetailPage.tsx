import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRequestStore } from '@/stores/requestStore'
import { useVendorStore } from '@/stores/vendorStore'
import { REQUEST_TYPES } from './types'
import type { RequestStatus } from '@/types/database'
import type { RequestVendor } from './types'
import { useApprovalStore } from '@/stores/approvalStore'
import { useAuthStore } from '@/stores/authStore'

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  draft:            { label: 'Draft',        className: 'bg-gray-100 text-gray-600' },
  scoring:          { label: 'กำลัง Scoring', className: 'bg-blue-100 text-blue-700' },
  pending_approval: { label: 'รออนุมัติ',    className: 'bg-yellow-100 text-yellow-700' },
  approved:         { label: 'อนุมัติแล้ว',  className: 'bg-green-100 text-green-700' },
  returned:         { label: 'ส่งกลับ',      className: 'bg-red-100 text-red-700' },
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="w-40 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value ?? '—'}</span>
    </div>
  )
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { requests, fetchRequests, fetchRequestVendors, getQuotationUrl } = useRequestStore()
  const { vendors, fetchVendors } = useVendorStore()
  const { submitForApproval } = useApprovalStore()
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [requestVendors, setRequestVendors] = useState<RequestVendor[]>([])

  const handleSubmitApproval = async () => {
    if (!id) return
    setSubmitting(true)
    await submitForApproval(id)
    await fetchRequests()
    setSubmitting(false)
  }

  useEffect(() => {
    if (requests.length === 0) void fetchRequests()
    void fetchVendors()
  }, [requests.length, fetchRequests, fetchVendors])

  useEffect(() => {
    if (id) void fetchRequestVendors(id).then(setRequestVendors)
  }, [id, fetchRequestVendors])

  const request = requests.find((r) => r.id === id)
  if (!request) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const cfg = STATUS_CONFIG[request.status]
  const typeLabel = REQUEST_TYPES.find((t) => t.value === request.type)?.label ?? request.type
  const fmt = (n: number) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

  const handleDownload = async (url: string) => {
    const signedUrl = await getQuotationUrl(url)
    if (!signedUrl) return
    window.open(signedUrl, '_blank')
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-gray-500">
        <Link to="/requests" className="hover:underline">Selection Requests</Link>
        <span className="mx-2">/</span>
        <span>{request.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{typeLabel}</p>
        </div>
        <div className="flex gap-2">
          {request.status === 'draft' && (
            <Link to={`/requests/${request.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ✎ แก้ไข
            </Link>
          )}
          <Link to={`/requests/${request.id}/scoring`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            📝 Scoring
          </Link>
          {request.status === 'scoring' && request.owner_id === user?.id && (
            <button onClick={() => void handleSubmitApproval()} disabled={submitting}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">
              {submitting ? '...' : '🚀 ส่งอนุมัติ'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ข้อมูล Request */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูล Request</h2>
          <InfoRow label="ชื่อโปรเจกต์" value={request.title} />
          <InfoRow label="มูลค่างบประมาณ" value={fmt(request.budget)} />
          <InfoRow label="ประเภทงาน" value={typeLabel} />
          <InfoRow label="กำหนดตัดสินใจ" value={request.deadline} />
          <InfoRow label="รายละเอียด" value={request.description} />
        </div>

        {/* Vendor list */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Vendors ที่เข้าร่วม ({requestVendors.length})
          </h2>
          {requestVendors.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มี vendor</p>
          ) : (
            <ul className="space-y-3">
              {requestVendors.map((rv) => {
                const vendor = vendors.find((v) => v.id === rv.vendor_id)
                return (
                  <li key={rv.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 text-sm">
                        {vendor?.name ?? rv.vendor_id}
                      </span>
                      {rv.quotation_price != null && (
                        <span className="text-sm text-gray-500">
                          {fmt(rv.quotation_price)}
                        </span>
                      )}
                    </div>
                    {rv.quotation_url && (
                      <button
                        onClick={() => { if (rv.quotation_url) void handleDownload(rv.quotation_url) }}
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        📎 ดาวน์โหลด Quotation
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
