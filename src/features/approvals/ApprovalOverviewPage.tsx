import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApprovalStore } from '@/stores/approvalStore'

const fmt = (n: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

const REQ_STATUS: Record<string, { label: string; className: string }> = {
  draft:            { label: 'Draft',        className: 'bg-gray-100 text-gray-600' },
  scoring:          { label: 'Scoring',      className: 'bg-blue-100 text-blue-700' },
  pending_approval: { label: 'รออนุมัติ',    className: 'bg-yellow-100 text-yellow-700' },
  approved:         { label: 'อนุมัติแล้ว',  className: 'bg-green-100 text-green-700' },
  returned:         { label: 'ส่งกลับ',      className: 'bg-red-100 text-red-700' },
  unknown:          { label: '—',            className: 'bg-gray-100 text-gray-500' },
}

const APPROVAL_STATUS: Record<string, { label: string; dot: string; text: string }> = {
  pending:  { label: 'รออนุมัติ',  dot: 'bg-yellow-400', text: 'text-yellow-700' },
  approved: { label: 'อนุมัติ',    dot: 'bg-green-500',  text: 'text-green-700' },
  returned: { label: 'ส่งกลับ',    dot: 'bg-red-500',    text: 'text-red-700' },
}

export default function ApprovalOverviewPage() {
  const { allApprovalGroups, loading, fetchAllApprovals } = useApprovalStore()
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { void fetchAllApprovals() }, [fetchAllApprovals])

  const filtered = statusFilter
    ? allApprovalGroups.filter((g) => g.status === statusFilter)
    : allApprovalGroups

  // Summary counts
  const counts = {
    total: allApprovalGroups.length,
    pending: allApprovalGroups.filter((g) => g.status === 'pending_approval').length,
    approved: allApprovalGroups.filter((g) => g.status === 'approved').length,
    returned: allApprovalGroups.filter((g) => g.status === 'returned').length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approval Overview</h1>
        <p className="mt-1 text-sm text-gray-500">ภาพรวมการอนุมัติทุก request (มุมมอง Admin)</p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'ทั้งหมด', value: counts.total, color: 'text-gray-900', icon: '📋' },
          { label: 'รออนุมัติ', value: counts.pending, color: 'text-yellow-600', icon: '⏳' },
          { label: 'อนุมัติแล้ว', value: counts.approved, color: 'text-green-600', icon: '✅' },
          { label: 'ส่งกลับ', value: counts.returned, color: 'text-red-600', icon: '↩️' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xl">{s.icon}</div>
            <div className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4 flex justify-end">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value) }}
          className="input text-sm">
          <option value="">ทุกสถานะ</option>
          <option value="pending_approval">รออนุมัติ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="returned">ส่งกลับ</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-gray-400">
          ยังไม่มี request ที่เข้าสู่กระบวนการอนุมัติ
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((g) => {
            const reqCfg = REQ_STATUS[g.status] ?? REQ_STATUS.unknown
            const sorted = g.approvals.slice().sort((a, b) => a.level - b.level)
            return (
              <div key={g.requestId} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <Link to={`/requests/${g.requestId}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 hover:underline">
                      {g.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span>{fmt(g.budget)}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${reqCfg.className}`}>
                        {reqCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approval chain */}
                <div className="flex flex-wrap items-center gap-2">
                  {sorted.map((a, i) => {
                    const cfg = APPROVAL_STATUS[a.status] ?? APPROVAL_STATUS.pending
                    return (
                      <div key={a.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">L{a.level}</span>
                            <span className="mx-1 text-gray-400">·</span>
                            <span className="text-gray-700">{a.approver_name}</span>
                            <span className={`ml-2 text-xs ${cfg.text}`}>{cfg.label}</span>
                          </div>
                        </div>
                        {i < sorted.length - 1 && <span className="text-gray-300">→</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Comments if any */}
                {sorted.some((a) => a.comment) && (
                  <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                    {sorted.filter((a) => a.comment).map((a) => (
                      <p key={a.id} className="text-xs text-gray-500">
                        <span className="font-medium">L{a.level} ({a.approver_name}):</span> &quot;{a.comment}&quot;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
