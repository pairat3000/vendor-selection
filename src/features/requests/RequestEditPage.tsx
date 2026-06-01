import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRequestStore } from '@/stores/requestStore'
import { REQUEST_TYPES } from './types'

export default function RequestEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requests, fetchRequests, updateRequest } = useRequestStore()

  const request = requests.find((r) => r.id === id)

  const [form, setForm] = useState({
    title: '', budget: '', type: 'software', deadline: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requests.length === 0) void fetchRequests()
  }, [requests.length, fetchRequests])

  useEffect(() => {
    if (request) {
      setForm({
        title: request.title,
        budget: String(request.budget),
        type: request.type,
        deadline: request.deadline ?? '',
        description: request.description ?? '',
      })
    }
  }, [request])

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((p) => ({ ...p, [field]: val }))
    }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError(null)
    setSaving(true)
    const { error: err } = await updateRequest(id, {
      title: form.title,
      budget: parseFloat(form.budget) || 0,
      type: form.type,
      deadline: form.deadline || null,
      description: form.description || null,
    })
    setSaving(false)
    if (err) { setError(err); return }
    navigate(`/requests/${id}`)
  }

  if (!request) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-2 text-sm text-gray-500">
        <Link to="/requests" className="hover:underline">Requests</Link>
        <span className="mx-2">/</span>
        <Link to={`/requests/${id ?? ''}`} className="hover:underline">{request.title}</Link>
        <span className="mx-2">/</span>
        <span>แก้ไข</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">แก้ไข Request</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ชื่อโปรเจกต์ <span className="text-red-500">*</span>
              </label>
              <input required value={form.title} onChange={set('title')}
                className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">มูลค่างบประมาณ (บาท)</label>
              <input type="number" min="0" value={form.budget} onChange={set('budget')}
                className="input w-full" />
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
                className="input w-full resize-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => { navigate(`/requests/${id ?? ''}`) }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button type="submit" disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
