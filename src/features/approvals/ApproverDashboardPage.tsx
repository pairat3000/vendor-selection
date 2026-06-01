import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApprovalStore } from '@/stores/approvalStore'

const fmt = (n: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

export default function ApproverDashboardPage() {
  const { myPendingApprovals, loading, fetchMyPendingApprovals } = useApprovalStore()

  useEffect(() => { void fetchMyPendingApprovals() }, [fetchMyPendingApprovals])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">รออนุมัติ</h1>
        <p className="mt-1 text-sm text-gray-500">requests ที่ถึงคิวคุณ — {myPendingApprovals.length} รายการ</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : myPendingApprovals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-gray-400">
          ไม่มี request รออนุมัติ
        </div>
      ) : (
        <div className="space-y-3">
          {myPendingApprovals.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5">
              <div>
                <h3 className="font-semibold text-gray-900">{a.request_title ?? a.request_id}</h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                  <span>{a.request_budget != null ? fmt(a.request_budget) : '—'}</span>
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Level {a.level}
                  </span>
                </div>
              </div>
              <Link to={`/approvals/${a.id}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                ดูและอนุมัติ →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
