import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRequestStore } from '@/stores/requestStore'
import { useVendorStore } from '@/stores/vendorStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { useAuthStore } from '@/stores/authStore'
import { REQUEST_TYPES } from '@/features/requests/types'
import type { RequestStatus } from '@/types/database'

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  draft:            { label: 'Draft',        className: 'bg-gray-100 text-gray-600' },
  scoring:          { label: 'Scoring',      className: 'bg-blue-100 text-blue-700' },
  pending_approval: { label: 'รออนุมัติ',   className: 'bg-yellow-100 text-yellow-700' },
  approved:         { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
  returned:         { label: 'ส่งกลับ',     className: 'bg-red-100 text-red-700' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
  const { requests, loading: reqLoading, fetchRequests } = useRequestStore()
  const { vendors, fetchVendors } = useVendorStore()
  const { myPendingApprovals, fetchMyPendingApprovals } = useApprovalStore()
  const { profile, user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('')

  useEffect(() => {
    void fetchRequests()
    void fetchVendors()
    void fetchMyPendingApprovals()
  }, [fetchRequests, fetchVendors, fetchMyPendingApprovals])

  // Stats
  const approvedVendors = vendors.filter((v) => v.status === 'approved').length
  const openRequests = requests.filter((r) => r.status !== 'approved').length
  const approvedRequests = requests.filter((r) => r.status === 'approved').length
  const approvalRate = requests.length > 0 ? Math.round((approvedRequests / requests.length) * 100) : 0
  const myPendingScoring = requests.filter((r) =>
    r.status === 'scoring' && r.owner_id === user?.id,
  ).length

  // My action items
  const myActionItems = requests.filter((r) => {
    if (r.owner_id === user?.id && (r.status === 'draft' || r.status === 'scoring')) return true
    return false
  })

  // Filter
  const filtered = requests.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const statCards = [
    { label: 'Vendors (approved)', value: String(approvedVendors), icon: '🏢', color: 'text-blue-600' },
    { label: 'Open Requests', value: String(openRequests), icon: '📋', color: 'text-yellow-600' },
    { label: 'Approval Rate', value: `${String(approvalRate)}%`, icon: '✅', color: 'text-green-600' },
    { label: 'รอ Action ของฉัน', value: String(myPendingScoring + myPendingApprovals.length), icon: '⏳', color: 'text-red-600' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            ยินดีต้อนรับ, {profile?.full_name ?? 'User'} ({profile?.role})
          </p>
        </div>
        <Link to="/requests/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + สร้าง Request
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-2xl">{s.icon}</div>
            <div className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* My action items */}
      {(myActionItems.length > 0 || myPendingApprovals.length > 0) && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-orange-800">⚡ รอ Action ของคุณ</h2>
          <div className="space-y-2">
            {myActionItems.map((r) => (
              <Link key={r.id} to={`/requests/${r.id}`}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-sm shadow-sm hover:shadow">
                <span className="font-medium text-gray-900">{r.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[r.status].className}`}>
                  {STATUS_CONFIG[r.status].label}
                </span>
              </Link>
            ))}
            {myPendingApprovals.map((a) => (
              <Link key={a.id} to={`/approvals/${a.id}`}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-sm shadow-sm hover:shadow">
                <span className="font-medium text-gray-900">{a.request_title ?? 'Request'}</span>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  รออนุมัติ L{a.level}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Request list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Requests ทั้งหมด</h2>
          <div className="flex gap-2">
            <input value={search} onChange={(e) => { setSearch(e.target.value) }}
              className="input text-sm" placeholder="ค้นหาชื่อ..." />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as RequestStatus | '') }}
              className="input text-sm">
              <option value="">ทุกสถานะ</option>
              {(Object.keys(STATUS_CONFIG) as RequestStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        {reqLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-400">
            ไม่มี request
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อโปรเจกต์</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">มูลค่า</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">กำหนด</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const isMyAction = myActionItems.some((a) => a.id === r.id) ||
                    myPendingApprovals.some((a) => a.request_id === r.id)
                  const cfg = STATUS_CONFIG[r.status]
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 ${isMyAction ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {isMyAction && <span className="mr-1">⚡</span>}
                        {r.title}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {REQUEST_TYPES.find((t) => t.value === r.type)?.label ?? r.type}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmt(r.budget)}</td>
                      <td className="px-4 py-3 text-gray-500">{r.deadline ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/requests/${r.id}`} className="text-blue-600 hover:underline">
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
