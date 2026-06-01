import { useState } from 'react'
import { useScoringStore } from '@/stores/scoringStore'
import type { ScoringCriteria } from './types'

interface Props {
  requestId: string
  criteria: ScoringCriteria[]
}

export default function CriteriaEditor({ requestId, criteria }: Props) {
  const { addCriteria, updateCriteria, deleteCriteria } = useScoringStore()
  const [newName, setNewName] = useState('')
  const [newWeight, setNewWeight] = useState('20')
  const [adding, setAdding] = useState(false)

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightOk = Math.abs(totalWeight - 100) < 0.01

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await addCriteria({ request_id: requestId, name: newName.trim(), weight: parseFloat(newWeight) || 0 })
    setNewName('')
    setNewWeight('20')
    setAdding(false)
  }

  const handleWeightBlur = async (id: string, val: string) => {
    const w = parseFloat(val)
    if (!isNaN(w)) await updateCriteria(id, { weight: w })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">เกณฑ์การให้คะแนน</h2>
        <span className={`text-sm font-semibold ${weightOk ? 'text-green-600' : 'text-red-600'}`}>
          น้ำหนักรวม: {totalWeight.toFixed(1)}%
          {!weightOk && ' ⚠️ ต้องรวมเป็น 100%'}
        </span>
      </div>

      {criteria.length > 0 && (
        <div className="mb-4 space-y-2">
          {criteria.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-gray-800">{c.name}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="100" defaultValue={c.weight}
                  onBlur={(e) => void handleWeightBlur(c.id, e.target.value)}
                  className="input w-20 text-center text-sm"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <button onClick={() => void deleteCriteria(c.id)}
                className="text-sm text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add new criteria */}
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => { setNewName(e.target.value) }}
          className="input flex-1 text-sm" placeholder="เช่น ราคา, คุณภาพ, ประสบการณ์..." />
        <input type="number" min="0" max="100" value={newWeight}
          onChange={(e) => { setNewWeight(e.target.value) }}
          className="input w-20 text-center text-sm" />
        <span className="flex items-center text-sm text-gray-500">%</span>
        <button onClick={() => void handleAdd()} disabled={adding || !newName.trim()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          + เพิ่ม
        </button>
      </div>
    </div>
  )
}
