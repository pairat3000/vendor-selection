import { useEffect, useState } from 'react'
import { useScoringStore } from '@/stores/scoringStore'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import type { ScorerWithProfile, FinalScore } from './types'

interface Props {
  requestId: string
  scorers: ScorerWithProfile[]
  requestVendorIds: string[]
  vendorNames: Record<string, string>
}

export default function ScorerManager({ requestId, scorers, requestVendorIds, vendorNames }: Props) {
  const { addScorer, removeScorer, restoreScorer, previewRemoval } = useScoringStore()
  const { user } = useAuthStore()
  const { users, fetchUsers } = useUserStore()
  const [newUserId, setNewUserId] = useState('')
  const [addReason, setAddReason] = useState('')

  useEffect(() => { void fetchUsers() }, [fetchUsers])

  // user ที่ active และยังไม่ได้เป็น scorer (active) อยู่แล้ว
  const activeScorerUserIds = new Set(scorers.filter((s) => s.is_active).map((s) => s.user_id))
  const availableUsers = users.filter((u) => u.is_active && !activeScorerUserIds.has(u.id))
  const [removeModal, setRemoveModal] = useState<ScorerWithProfile | null>(null)
  const [removeReason, setRemoveReason] = useState('')
  const [preview, setPreview] = useState<FinalScore[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newUserId || !addReason.trim()) { setError('กรุณาเลือกผู้ใช้และกรอกเหตุผล'); return }
    setSaving(true); setError(null)
    const { error: err } = await addScorer(requestId, newUserId, addReason.trim(), user?.id ?? '')
    setSaving(false)
    if (err) { setError(err); return }
    setNewUserId(''); setAddReason('')
  }

  const openRemoveModal = async (scorer: ScorerWithProfile) => {
    setRemoveModal(scorer)
    setPreview(null)
    setRemoveReason('')
    // If submitted → compute preview
    if (scorer.submitted_at) {
      const prev = await previewRemoval(scorer.id, requestId, requestVendorIds, vendorNames)
      setPreview(prev)
    }
  }

  const handleRemove = async () => {
    if (!removeModal || !removeReason.trim()) return
    setSaving(true)
    await removeScorer(removeModal.id, requestId, removeModal.user_id, removeReason.trim(), user?.id ?? '')
    setSaving(false)
    setRemoveModal(null)
  }

  const handleRestore = async (scorer: ScorerWithProfile) => {
    const reason = prompt('เหตุผลในการกู้คืน scorer?')
    if (!reason) return
    await restoreScorer(scorer.id, requestId, scorer.user_id, reason, user?.id ?? '')
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        จัดการ Scorers ({scorers.filter((s) => s.is_active).length} active)
      </h2>

      {/* Scorer list */}
      <ul className="mb-5 space-y-2">
        {scorers.map((s) => (
          <li key={s.id} className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
            s.is_active ? 'border-gray-200 bg-gray-50' : 'border-dashed border-gray-200 bg-white opacity-60'
          }`}>
            <div>
              <span className="font-medium text-gray-900">{s.full_name}</span>
              {s.is_active ? (
                <span className={`ml-2 text-xs ${s.submitted_at ? 'text-green-600' : 'text-yellow-600'}`}>
                  {s.submitted_at ? '✓ ส่งแล้ว' : '⏳ รอกรอก'}
                </span>
              ) : (
                <span className="ml-2 text-xs text-gray-400">ถูกลบ</span>
              )}
            </div>
            <div className="flex gap-2">
              {s.is_active ? (
                <button onClick={() => void openRemoveModal(s)}
                  className="text-xs text-red-500 hover:underline">ลบ</button>
              ) : (
                <button onClick={() => void handleRestore(s)}
                  className="text-xs text-blue-600 hover:underline">กู้คืน</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Add scorer */}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        <select value={newUserId} onChange={(e) => { setNewUserId(e.target.value) }}
          className="input w-full text-sm">
          <option value="">— เลือกผู้ใช้ —</option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email} ({u.role})
            </option>
          ))}
        </select>
        <input value={addReason} onChange={(e) => { setAddReason(e.target.value) }}
          className="input w-full text-sm" placeholder="เหตุผลในการเพิ่ม scorer *" />
        <button onClick={() => void handleAdd()} disabled={saving || !newUserId}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          + เพิ่ม Scorer
        </button>
        {availableUsers.length === 0 && (
          <p className="text-xs text-gray-400">ผู้ใช้ทุกคนถูกเพิ่มเป็น scorer แล้ว หรือยังไม่มีผู้ใช้อื่นในระบบ</p>
        )}
      </div>

      {/* Remove Modal */}
      {removeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">ลบ Scorer: {removeModal.full_name}</h3>

            {removeModal.submitted_at && preview && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="mb-2 text-sm font-medium text-yellow-800">⚠️ Scorer นี้ submit แล้ว — ผลคะแนนจะเปลี่ยน:</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="pb-1 text-left">Vendor</th>
                      <th className="pb-1 text-right">คะแนนใหม่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p) => (
                      <tr key={p.vendor_id}>
                        <td className="text-gray-700">{p.vendor_name}</td>
                        <td className="text-right font-semibold text-gray-900">{p.final_score.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <textarea value={removeReason} onChange={(e) => { setRemoveReason(e.target.value) }}
              rows={2} className="input w-full resize-none text-sm"
              placeholder="เหตุผลในการลบ (required) *" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setRemoveModal(null) }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={() => void handleRemove()}
                disabled={!removeReason.trim() || saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
