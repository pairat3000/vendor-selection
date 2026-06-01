import { useEffect, useState, useRef } from 'react'
import { useRequestStore } from '@/stores/requestStore'
import { useVendorStore } from '@/stores/vendorStore'
import type { RequestVendor } from './types'

interface Props {
  requestId: string
  onDone: () => void
}

interface VendorRow extends RequestVendor {
  vendor_name: string
  uploading?: boolean
  fileError?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function RequestStep2({ requestId, onDone }: Props) {
  const { addRequestVendor, removeRequestVendor, updateRequestVendor,
          fetchRequestVendors, uploadQuotation, deleteQuotation, getQuotationUrl } = useRequestStore()
  const { vendors, fetchVendors } = useVendorStore()

  const [rows, setRows] = useState<VendorRow[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    void fetchVendors()
    void fetchRequestVendors(requestId).then((existing) => {
      const mapped: VendorRow[] = existing.map((rv) => ({
        ...rv,
        vendor_name: vendors.find((v) => v.id === rv.vendor_id)?.name ?? 'Unknown',
      }))
      setRows(mapped)
    })
  }, [requestId, fetchVendors, fetchRequestVendors, vendors.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const approvedVendors = vendors.filter((v) => v.status === 'approved')
  const addedVendorIds = new Set(rows.map((r) => r.vendor_id))
  const availableVendors = approvedVendors.filter((v) => !addedVendorIds.has(v.id))

  const handleAddVendor = async () => {
    if (!selectedVendorId) { setAddError('กรุณาเลือก vendor'); return }
    setAddError(null)
    const vendor = vendors.find((v) => v.id === selectedVendorId)
    const { error, id } = await addRequestVendor({ request_id: requestId, vendor_id: selectedVendorId })
    if (error) { setAddError(error); return }
    if (id && vendor) {
      setRows((p) => [...p, {
        id, request_id: requestId, vendor_id: selectedVendorId,
        vendor_name: vendor.name, quotation_url: null, quotation_price: null, payment_terms: null, created_at: '',
      }])
    }
    setSelectedVendorId('')
  }

  const handleRemove = async (row: VendorRow) => {
    if (row.quotation_url) await deleteQuotation(row.quotation_url)
    await removeRequestVendor(row.id)
    setRows((p) => p.filter((r) => r.id !== row.id))
  }

  const handlePriceChange = async (rowId: string, price: string) => {
    setRows((p) => p.map((r) => r.id === rowId ? { ...r, quotation_price: parseFloat(price) || null } : r))
    await updateRequestVendor(rowId, { quotation_price: parseFloat(price) || null })
  }

  const handleFileUpload = async (row: VendorRow, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setRows((p) => p.map((r) => r.id === row.id ? { ...r, fileError: 'ไฟล์ใหญ่เกิน 10 MB' } : r))
      return
    }
    setRows((p) => p.map((r) => r.id === row.id ? { ...r, uploading: true, fileError: undefined } : r))
    const { error, url } = await uploadQuotation(requestId, row.id, file)
    if (error) {
      setRows((p) => p.map((r) => r.id === row.id ? { ...r, uploading: false, fileError: error } : r))
      return
    }
    await updateRequestVendor(row.id, { quotation_url: url })
    setRows((p) => p.map((r) => r.id === row.id ? { ...r, uploading: false, quotation_url: url ?? null } : r))
  }

  const handleDownload = async (url: string, vendorName: string) => {
    const signedUrl = await getQuotationUrl(url)
    if (!signedUrl) return
    const a = document.createElement('a')
    a.href = signedUrl
    a.download = `quotation_${vendorName}`
    a.click()
  }

  const handleDeleteFile = async (row: VendorRow) => {
    if (!row.quotation_url) return
    await deleteQuotation(row.quotation_url)
    await updateRequestVendor(row.id, { quotation_url: null })
    setRows((p) => p.map((r) => r.id === row.id ? { ...r, quotation_url: null } : r))
  }

  const handleComplete = () => {
    if (rows.length < 2) { setAddError('ต้องมี vendor อย่างน้อย 2 ราย'); return }
    setCompleting(true)
    onDone()
  }

  const fmt = (n: number | null) => n == null ? '' :
    new Intl.NumberFormat('th-TH').format(n)

  return (
    <div className="space-y-6">
      {/* Add vendor */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          เพิ่ม Vendor ({rows.length} ราย)
        </h2>
        <div className="flex gap-2">
          <select value={selectedVendorId}
            onChange={(e) => { setSelectedVendorId(e.target.value) }}
            className="input flex-1">
            <option value="">— เลือก Vendor —</option>
            {availableVendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button onClick={() => void handleAddVendor()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + เพิ่ม
          </button>
        </div>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* Vendor rows */}
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-gray-900">🏢 {row.vendor_name}</span>
                <button onClick={() => void handleRemove(row)}
                  className="text-sm text-red-500 hover:underline">ลบออก</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Price */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">ราคา Quotation (บาท)</label>
                  <input
                    type="number" min="0"
                    defaultValue={row.quotation_price ?? ''}
                    onBlur={(e) => void handlePriceChange(row.id, e.target.value)}
                    className="input w-full text-sm"
                    placeholder="0"
                  />
                  {row.quotation_price != null && (
                    <p className="mt-0.5 text-xs text-gray-400">{fmt(row.quotation_price)} บาท</p>
                  )}
                </div>

                {/* File upload */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Quotation File (PDF/XLSX, max 10 MB)
                  </label>
                  {row.quotation_url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-700">📎 ไฟล์แนบแล้ว</span>
                      <button onClick={() => { if (row.quotation_url) void handleDownload(row.quotation_url, row.vendor_name) }}
                        className="text-xs text-blue-600 hover:underline">ดาวน์โหลด</button>
                      <button onClick={() => void handleDeleteFile(row)}
                        className="text-xs text-red-500 hover:underline">ลบ</button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[row.id] = el }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleFileUpload(row, file)
                        }}
                      />
                      <button
                        onClick={() => { fileInputRefs.current[row.id]?.click() }}
                        disabled={row.uploading}
                        className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                      >
                        {row.uploading ? 'กำลังอัปโหลด...' : '+ แนบไฟล์'}
                      </button>
                    </>
                  )}
                  {row.fileError && <p className="mt-1 text-xs text-red-600">{row.fileError}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length < 2 ? `⚠️ ต้องมีอย่างน้อย 2 vendor (มีแล้ว ${String(rows.length)})` : `✓ ${String(rows.length)} vendor พร้อมแล้ว`}
        </p>
        <button
          onClick={handleComplete}
          disabled={rows.length < 2 || completing}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {completing ? 'กำลังบันทึก...' : '✓ บันทึก Request'}
        </button>
      </div>
    </div>
  )
}
