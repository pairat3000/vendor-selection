import { useEffect, useState } from 'react'
import { useDocumentStore } from '@/stores/documentStore'

export default function DocumentTypesPage() {
  const { docTypes, fetchDocTypes, addDocType, deleteDocType } = useDocumentStore()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void fetchDocTypes() }, [fetchDocTypes])

  const handleAdd = async () => {
    if (!name.trim()) return
    setSaving(true); setError(null)
    const { error: err } = await addDocType(name)
    setSaving(false)
    if (err) { setError(err); return }
    setName('')
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">หัวข้อเอกสาร (Document Types)</h1>
        <p className="mt-1 text-sm text-gray-500">
          รายการหัวข้อสำหรับแนบเอกสารการนำเสนอของ vendor ในแต่ละ request เช่น Quotation ครั้งที่ 1, Proposal, Site Reference
        </p>
      </div>

      <div className="mb-6 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <input value={name} onChange={(e) => { setName(e.target.value) }}
            className="input flex-1 text-sm" placeholder="เพิ่มหัวข้อใหม่ เช่น Quotation ครั้งที่ 4..." />
          <button onClick={() => void handleAdd()} disabled={saving || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            + เพิ่ม
          </button>
        </div>
      </div>

      {docTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-400">
          ยังไม่มีหัวข้อ
        </div>
      ) : (
        <div className="max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100">
            {docTypes.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-800">{d.name}</span>
                <button onClick={() => void deleteDocType(d.id)}
                  className="text-sm text-red-500 hover:underline">ลบ</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
