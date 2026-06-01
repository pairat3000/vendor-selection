import { useEffect, useState } from 'react'
import { useVendorFieldStore } from '@/stores/vendorFieldStore'
import type { VendorFieldType } from '@/types/database'

const FIELD_TYPES: { value: VendorFieldType; label: string }[] = [
  { value: 'text',    label: 'ข้อความ (Text)' },
  { value: 'number',  label: 'ตัวเลข (Number)' },
  { value: 'date',    label: 'วันที่ (Date)' },
  { value: 'boolean', label: 'ใช่/ไม่ใช่ (Boolean)' },
]

export default function FieldManagerPage() {
  const { fields, loading, fetchFields, createField, deleteField } = useVendorFieldStore()
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<VendorFieldType>('text')
  const [newRequired, setNewRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void fetchFields() }, [fetchFields])

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      setError('กรุณากรอก Field Key และ Label')
      return
    }
    if (!/^[a-z_][a-z0-9_]*$/.test(newKey)) {
      setError('Field Key ต้องเป็น lowercase และ underscore เท่านั้น (เช่น bank_name)')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await createField({
      field_key: newKey.trim(),
      field_label: newLabel.trim(),
      field_type: newType,
      is_required: newRequired,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setNewKey(''); setNewLabel(''); setNewType('text'); setNewRequired(false)
    setShowForm(false)
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`ลบ field "${label}" ออก? vendor เดิมจะไม่กระทบ แต่จะไม่แสดง field นี้อีก`)) return
    await deleteField(id)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="mt-1 text-sm text-gray-500">จัดการ dynamic fields สำหรับ Vendor form</p>
        </div>
        <button onClick={() => { setShowForm(true) }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + เพิ่ม Field
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-4 font-semibold text-gray-900">เพิ่ม Custom Field ใหม่</h3>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Field Key (ภาษาอังกฤษ)</label>
              <input value={newKey} onChange={(e) => { setNewKey(e.target.value) }}
                className="input w-full text-sm" placeholder="bank_name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Label (ที่แสดงใน form)</label>
              <input value={newLabel} onChange={(e) => { setNewLabel(e.target.value) }}
                className="input w-full text-sm" placeholder="ธนาคาร" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">ประเภท</label>
              <select value={newType} onChange={(e) => { setNewType(e.target.value as VendorFieldType) }}
                className="input w-full text-sm">
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={newRequired} onChange={(e) => { setNewRequired(e.target.checked) }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                Required (บังคับกรอก)
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </button>
            <button onClick={() => void handleAdd()} disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'กำลังบันทึก...' : 'เพิ่ม Field'}
            </button>
          </div>
        </div>
      )}

      {/* Field list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          ยังไม่มี custom field — กด "+ เพิ่ม Field" เพื่อเริ่ม
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ลำดับ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Field Key</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Label</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Required</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{f.sort_order}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{f.field_key}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.field_label}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {FIELD_TYPES.find((t) => t.value === f.field_type)?.label ?? f.field_type}
                  </td>
                  <td className="px-4 py-3">
                    {f.is_required
                      ? <span className="text-xs font-medium text-red-600">บังคับ</span>
                      : <span className="text-xs text-gray-400">ไม่บังคับ</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void handleDelete(f.id, f.field_label)}
                      className="text-sm text-red-500 hover:underline">
                      ลบ
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
