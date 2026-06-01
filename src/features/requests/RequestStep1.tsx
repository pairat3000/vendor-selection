import { useState, type FormEvent } from 'react'
import { REQUEST_TYPES } from './types'
import type { Step1Data } from './RequestNewPage'

interface Props {
  initialData: Step1Data
  onNext: (data: Step1Data) => Promise<void>
}

export default function RequestStep1({ initialData, onNext }: Props) {
  const [form, setForm] = useState<Step1Data>(initialData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof Step1Data) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((p) => ({ ...p, [field]: val }))
    }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onNext(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลโปรเจกต์</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ชื่อโปรเจกต์ <span className="text-red-500">*</span>
            </label>
            <input required value={form.title} onChange={set('title')}
              className="input w-full" placeholder="เช่น ระบบ ERP สำหรับสาขา 2025" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              มูลค่างบประมาณ (บาท) <span className="text-red-500">*</span>
            </label>
            <input required type="number" min="0" value={form.budget} onChange={set('budget')}
              className="input w-full" placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ประเภทงาน</label>
            <select value={form.type} onChange={set('type')} className="input w-full">
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">กำหนดตัดสินใจ</label>
            <input type="date" value={form.deadline} onChange={set('deadline')} className="input w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">รายละเอียด</label>
            <textarea value={form.description} onChange={set('description')} rows={3}
              className="input w-full resize-none" placeholder="อธิบายขอบเขตงาน ความต้องการหลัก..." />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : 'ถัดไป: เพิ่ม Vendor →'}
        </button>
      </div>
    </form>
  )
}
