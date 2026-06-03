import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRequestStore } from '@/stores/requestStore'
import { REQUEST_TYPES } from './types'
import type { SelectionRequest } from './types'
import type { RequestStatus } from '@/types/database'

const STATUS_LABEL: Record<RequestStatus, string> = {
  draft: 'Draft', scoring: 'Scoring', pending_approval: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว', returned: 'ส่งกลับ',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

export default function ArchivedRequestsPage() {
  const { fetchArchivedRequests, restoreRequest, fetchRequests } = useRequestStore()
  const [items, setItems] = useState<SelectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setItems(await fetchArchivedRequests())
      setLoading(false)
    })()
  }, [fetchArchivedRequests])

  const handleRestore = async (r: SelectionRequest) => {
    if (!confirm(`กู้คืนโปรเจกต์ "${r.title}"?`)) return
    setBusy(r.id)
    const { error } = await restoreRequest(r.id)
    setBusy(null)
    if (error) { alert('กู้คืนไม่สำเร็จ: ' + error); return }
    setItems((p) => p.filter((x) => x.id !== r.id))
    await fetchRequests() // refresh main list
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คลังที่ลบแล้ว</h1>
          <p className="mt-1 text-sm text-gray-500">โปรเจกต์ที่ถูกลบ — กู้คืนกลับมาแสดงผลได้</p>
        </div>
        <Link to="/requests"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← กลับไป Requests
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-gray-400">
          ไม่มีโปรเจกต์ที่ถูกลบ
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อโปรเจกต์</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">มูลค่า</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะล่าสุด</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {REQUEST_TYPES.find((t) => t.value === r.type)?.label ?? r.type}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(r.budget)}</td>
                  <td className="px-4 py-3 text-gray-500">{STATUS_LABEL[r.status]}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void handleRestore(r)} disabled={busy === r.id}
                      className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50">
                      {busy === r.id ? '...' : '↩ กู้คืน'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
