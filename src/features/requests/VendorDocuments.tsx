import { useEffect, useState } from 'react'
import { useDocumentStore } from '@/stores/documentStore'
import type { RequestVendorDocument } from '@/stores/documentStore'

interface Props {
  requestVendorId: string
  canEdit: boolean
}

// normalize URL ให้เปิดได้ (เติม https:// ถ้าไม่มี protocol)
function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export default function VendorDocuments({ requestVendorId, canEdit }: Props) {
  const { docTypes, fetchDocTypes, fetchDocuments, addDocument, deleteDocument } = useDocumentStore()
  const [docs, setDocs] = useState<RequestVendorDocument[]>([])
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const datalistId = `doctypes-${requestVendorId}`

  useEffect(() => {
    void fetchDocTypes()
    void fetchDocuments([requestVendorId]).then(setDocs)
  }, [requestVendorId, fetchDocTypes, fetchDocuments])

  const handleAdd = async () => {
    if (!label.trim() || !url.trim()) { setError('กรอกหัวข้อและลิงก์'); return }
    setAdding(true); setError(null)
    const { error: err, doc } = await addDocument(requestVendorId, label, url)
    setAdding(false)
    if (err) { setError(err); return }
    if (doc) setDocs((p) => [...p, doc])
    setLabel(''); setUrl('')
  }

  const handleDelete = async (id: string) => {
    await deleteDocument(id)
    setDocs((p) => p.filter((d) => d.id !== id))
  }

  // read-only และไม่มีเอกสาร → ไม่ต้องแสดงอะไร
  if (!canEdit && docs.length === 0) return null

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <p className="mb-1 text-xs font-medium text-gray-500">เอกสารการนำเสนอ ({docs.length})</p>

      {docs.length > 0 && (
        <ul className="mb-2 space-y-1">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
              <a href={normalizeUrl(d.url)} target="_blank" rel="noopener noreferrer"
                className="truncate text-blue-600 hover:underline">
                🔗 {d.label}
              </a>
              {canEdit && (
                <button onClick={() => void handleDelete(d.id)}
                  className="shrink-0 text-red-400 hover:text-red-600">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <input
              list={datalistId}
              value={label}
              onChange={(e) => { setLabel(e.target.value) }}
              className="input flex-1 text-xs"
              placeholder="หัวข้อ เช่น Quotation ครั้งที่ 1"
            />
            <datalist id={datalistId}>
              {docTypes.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value) }}
              className="input flex-1 text-xs"
              placeholder="วางลิงก์เอกสาร (Google Drive ฯลฯ)"
            />
            <button onClick={() => void handleAdd()} disabled={adding}
              className="shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-900 disabled:opacity-50">
              + แนบ
            </button>
          </div>
        </>
      )}
    </div>
  )
}
