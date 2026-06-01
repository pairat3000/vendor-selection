import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useRequestStore } from '@/stores/requestStore'
import { REQUEST_TYPES } from './types'
import type { RequestStatus } from '@/types/database'

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  draft:            { label: 'Draft',        className: 'bg-gray-100 text-gray-600' },
  scoring:          { label: 'Scoring',      className: 'bg-blue-100 text-blue-700' },
  pending_approval: { label: 'รออนุมัติ',   className: 'bg-yellow-100 text-yellow-700' },
  approved:         { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
  returned:         { label: 'ส่งกลับ',     className: 'bg-red-100 text-red-700' },
}

export default function RequestsPage() {
  const { requests, loading, fetchRequests } = useRequestStore()

  useEffect(() => { void fetchRequests() }, [fetchRequests])

  const fmt = (n: number) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Selection Requests</h1>
          <p className="mt-1 text-sm text-gray-500">{requests.length} request ทั้งหมด</p>
        </div>
        <Link to="/requests/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + สร้าง Request
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-gray-400">
          ยังไม่มี request — กด "+ สร้าง Request" เพื่อเริ่ม
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อโปรเจกต์</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">มูลค่า</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">กำหนดตัดสินใจ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => {
                const cfg = STATUS_CONFIG[r.status]
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {REQUEST_TYPES.find((t) => t.value === r.type)?.label ?? r.type}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmt(r.budget)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.deadline ?? '—'}
                    </td>
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
  )
}
