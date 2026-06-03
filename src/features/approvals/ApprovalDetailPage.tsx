import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApprovalStore } from '@/stores/approvalStore'
import { useRequestStore } from '@/stores/requestStore'
import { useVendorStore } from '@/stores/vendorStore'
import { useScoringStore } from '@/stores/scoringStore'
import { useAuthStore } from '@/stores/authStore'
import type { Approval } from '@/stores/approvalStore'
import type { RequestVendor } from '@/features/requests/types'
import CompareDashboard from './CompareDashboard'
import VendorDocuments from '@/features/requests/VendorDocuments'

const fmt = (n: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ รออนุมัติ',
  approved: '✓ อนุมัติแล้ว',
  returned: '✕ ส่งกลับ',
}

export default function ApprovalDetailPage() {
  const { id: approvalId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { myPendingApprovals, fetchMyPendingApprovals, fetchApprovals, processApproval } = useApprovalStore()
  const { requests, fetchRequests, fetchRequestVendors } = useRequestStore()
  const { vendors, fetchVendors } = useVendorStore()
  const { finalScores, isUnlocked, checkUnlocked, fetchFinalScores } = useScoringStore()
  const { user } = useAuthStore()

  const [allApprovals, setAllApprovals] = useState<Approval[]>([])
  const [requestVendors, setRequestVendors] = useState<RequestVendor[]>([])
  const [comment, setComment] = useState('')
  const [returnComment, setReturnComment] = useState('')
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approval = myPendingApprovals.find((a) => a.id === approvalId)

  useEffect(() => {
    void fetchMyPendingApprovals()
    void fetchRequests()
    void fetchVendors()
  }, [fetchMyPendingApprovals, fetchRequests, fetchVendors])

  useEffect(() => {
    if (!approval) return
    void fetchApprovals(approval.request_id).then(setAllApprovals)
    void fetchRequestVendors(approval.request_id).then(setRequestVendors)
    void checkUnlocked(approval.request_id)
  }, [approval?.request_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isUnlocked && approval) void fetchFinalScores(approval.request_id)
  }, [isUnlocked, approval?.request_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const request = requests.find((r) => r.id === approval?.request_id)

  const handleApprove = async () => {
    if (!approvalId || !user) return
    setProcessing(true); setError(null)
    const { error: err } = await processApproval(approvalId, user.id, 'approved', comment || undefined)
    setProcessing(false)
    if (err) { setError(err); return }
    navigate('/approvals')
  }

  const handleReturn = async () => {
    if (!approvalId || !user || !returnComment.trim()) return
    setProcessing(true); setError(null)
    const { error: err } = await processApproval(approvalId, user.id, 'returned', returnComment)
    setProcessing(false)
    if (err) { setError(err); return }
    navigate('/approvals')
  }

  if (!approval) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-2 text-sm text-gray-500">
        <Link to="/approvals" className="hover:underline">รออนุมัติ</Link>
        <span className="mx-2">/</span>
        <span>{approval.request_title ?? approvalId}</span>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{approval.request_title ?? 'Request'}</h1>
          <div className="mt-1 flex gap-3 text-sm text-gray-500">
            {approval.request_budget != null && <span>{fmt(approval.request_budget)}</span>}
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              Level {approval.level} — รออนุมัติ
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowReturnModal(true) }} disabled={processing}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            ✕ ส่งกลับ
          </button>
          <button onClick={() => void handleApprove()} disabled={processing}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {processing ? 'กำลังบันทึก...' : '✓ อนุมัติ'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูล Request</h2>
          {request && (
            <div className="space-y-2 text-sm">
              <div className="flex gap-3"><span className="w-32 text-gray-500">ชื่อโปรเจกต์</span><span className="text-gray-900">{request.title}</span></div>
              <div className="flex gap-3"><span className="w-32 text-gray-500">งบประมาณ</span><span className="text-gray-900">{fmt(request.budget)}</span></div>
              <div className="flex gap-3"><span className="w-32 text-gray-500">กำหนด</span><span className="text-gray-900">{request.deadline ?? '—'}</span></div>
              <div className="flex gap-3"><span className="w-32 text-gray-500">รายละเอียด</span><span className="text-gray-900">{request.description ?? '—'}</span></div>
            </div>
          )}
        </div>

        {/* Scoring summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">ผลการ Scoring</h2>
          {!isUnlocked ? (
            <p className="text-sm text-yellow-600">🔒 Scoring ยังไม่เสร็จสมบูรณ์</p>
          ) : finalScores.length === 0 ? (
            <p className="text-sm text-gray-400">ไม่มีข้อมูลคะแนน</p>
          ) : (
            <ul className="space-y-2">
              {finalScores.slice().sort((a, b) => b.final_score - a.final_score).map((fs, i) => (
                <li key={fs.vendor_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{i === 0 ? '🏆 ' : `${String(i + 1)}. `}
                    {vendors.find((v) => v.id === fs.vendor_id)?.name ?? fs.vendor_id}
                  </span>
                  <span className="font-semibold text-gray-900">{fs.final_score.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Vendors + quotations */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Vendors ({requestVendors.length})
          </h2>
          <ul className="space-y-2">
            {requestVendors.map((rv) => (
              <li key={rv.id} className="border-b border-gray-50 pb-2 last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{vendors.find((v) => v.id === rv.vendor_id)?.name ?? rv.vendor_id}</span>
                  {rv.quotation_price != null && <span className="text-gray-500">{fmt(rv.quotation_price)}</span>}
                </div>
                <VendorDocuments requestVendorId={rv.id} canEdit={false} />
              </li>
            ))}
          </ul>
        </div>

        {/* Approval timeline */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Approval Timeline</h2>
          <ul className="space-y-3">
            {allApprovals.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  a.status === 'approved' ? 'bg-green-500 text-white'
                  : a.status === 'returned' ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}>
                  {a.level}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Level {a.level}</span>
                  <span className="ml-2 text-gray-500">{STATUS_LABEL[a.status]}</span>
                  {a.comment && <p className="text-gray-400">"{a.comment}"</p>}
                  {a.decided_at && (
                    <p className="text-xs text-gray-400">
                      {new Date(a.decided_at).toLocaleDateString('th-TH')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Compare Dashboard — เทียบ vendor ประกอบการพิจารณา */}
        {isUnlocked && finalScores.length > 0 && (
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              📊 เปรียบเทียบ Vendor
            </h2>
            <CompareDashboard
              requestId={approval.request_id}
              finalScores={finalScores}
              requestVendors={requestVendors}
              vendorName={(vid) => vendors.find((v) => v.id === vid)?.name ?? vid}
            />
          </div>
        )}

        {/* Approve comment */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Comment (optional สำหรับ Approve)
          </h2>
          <textarea value={comment} onChange={(e) => { setComment(e.target.value) }}
            rows={2} className="input w-full resize-none"
            placeholder="ข้อความแนบการอนุมัติ (ไม่บังคับ)" />
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">ส่งกลับ Request</h3>
            <p className="mb-3 text-sm text-gray-500">กรุณาระบุเหตุผลในการส่งกลับ (required)</p>
            <textarea value={returnComment} onChange={(e) => { setReturnComment(e.target.value) }}
              rows={3} className="input w-full resize-none"
              placeholder="เหตุผล เช่น ข้อมูลไม่ครบ, ราคาสูงเกินไป..." />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowReturnModal(false) }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={() => void handleReturn()}
                disabled={!returnComment.trim() || processing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                ยืนยันส่งกลับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
