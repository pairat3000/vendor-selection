import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVendorStore } from '@/stores/vendorStore'
import { useAuthStore } from '@/stores/authStore'
import StatusBadge from '@/components/StatusBadge'
import { VENDOR_TYPES } from './types'

export default function VendorsPage() {
  const { vendors, loading, fetchVendors } = useVendorStore()
  const { profile } = useAuthStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => { void fetchVendors() }, [fetchVendors])

  const filtered = vendors.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.tax_id ?? '').includes(search)
    const matchType = !typeFilter || v.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Registry</h1>
          <p className="mt-1 text-sm text-gray-500">{vendors.length} vendor ทั้งหมด</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'it_user') && (
          <Link to="/vendors/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            + เพิ่ม Vendor
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value) }}
          placeholder="ค้นหาชื่อ หรือเลขนิติบุคคล..."
          className="input w-72"
        />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value) }} className="input">
          <option value="">ทุกประเภท</option>
          {VENDOR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-gray-400">
          {search || typeFilter ? 'ไม่พบ vendor ที่ตรงกับเงื่อนไข' : 'ยังไม่มี vendor — กด "+ เพิ่ม Vendor" เพื่อเริ่ม'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อบริษัท</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">เลขนิติบุคคล</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ผู้ติดต่อ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.tax_id ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {VENDOR_TYPES.find((t) => t.value === v.type)?.label ?? v.type}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.contact_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/vendors/${v.id}`}
                      className="text-blue-600 hover:underline">
                      ดูรายละเอียด
                    </Link>
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
