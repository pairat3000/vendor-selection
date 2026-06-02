import { useState } from 'react'
import { useScoringStore } from '@/stores/scoringStore'
import type { ScoringCategory, ScoringCriteria } from './types'

interface Props {
  requestId: string
  categories: ScoringCategory[]
  criteria: ScoringCriteria[]
}

export default function CriteriaEditor({ requestId, categories, criteria }: Props) {
  const { addCategory, updateCategory, deleteCategory, addCriteria, updateCriteria, deleteCriteria } = useScoringStore()
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightOk = Math.abs(totalWeight - 100) < 0.01

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    await addCategory({ request_id: requestId, name: newCatName.trim() })
    setNewCatName('')
    setAddingCat(false)
  }

  const sortedCats = categories.slice().sort((a, b) => a.sort_order - b.sort_order)
  const uncategorized = criteria.filter((c) => !c.category_id)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">เกณฑ์การให้คะแนน</h2>
        <span className={`text-sm font-semibold ${weightOk ? 'text-green-600' : 'text-red-600'}`}>
          น้ำหนักรวม: {totalWeight.toFixed(1)}%
          {!weightOk && ' ⚠️ ต้องรวมเป็น 100%'}
        </span>
      </div>

      {/* แต่ละหมวดหมู่ */}
      <div className="space-y-4">
        {sortedCats.map((cat) => (
          <CategoryBlock
            key={cat.id}
            requestId={requestId}
            category={cat}
            criteria={criteria.filter((c) => c.category_id === cat.id)}
            onRenameCategory={(name) => void updateCategory(cat.id, { name })}
            onDeleteCategory={() => void deleteCategory(cat.id)}
            onAddCriteria={(name, desc, weight) =>
              addCriteria({ request_id: requestId, category_id: cat.id, name, description: desc, weight })}
            onUpdateCriteria={(id, data) => void updateCriteria(id, data)}
            onDeleteCriteria={(id) => void deleteCriteria(id)}
          />
        ))}

        {/* หัวข้อที่ยังไม่จัดหมวด (ของเก่า) */}
        {uncategorized.length > 0 && (
          <CategoryBlock
            requestId={requestId}
            category={null}
            criteria={uncategorized}
            onRenameCategory={() => { /* no-op */ }}
            onDeleteCategory={() => { /* no-op */ }}
            onAddCriteria={(name, desc, weight) =>
              addCriteria({ request_id: requestId, category_id: null, name, description: desc, weight })}
            onUpdateCriteria={(id, data) => void updateCriteria(id, data)}
            onDeleteCriteria={(id) => void deleteCriteria(id)}
          />
        )}
      </div>

      {/* เพิ่มหมวดหมู่ใหม่ */}
      <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
        <input value={newCatName} onChange={(e) => { setNewCatName(e.target.value) }}
          className="input flex-1 text-sm" placeholder="ชื่อหมวดหมู่หลัก เช่น ความสามารถของระบบ..." />
        <button onClick={() => void handleAddCategory()} disabled={addingCat || !newCatName.trim()}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50">
          + เพิ่มหมวดหมู่
        </button>
      </div>
    </div>
  )
}

// ─── Category block: header + nested criteria ──────────────────────────────

interface BlockProps {
  requestId: string
  category: ScoringCategory | null
  criteria: ScoringCriteria[]
  onRenameCategory: (name: string) => void
  onDeleteCategory: () => void
  onAddCriteria: (name: string, desc: string | null, weight: number) => Promise<{ error: string | null }>
  onUpdateCriteria: (id: string, data: { name?: string; description?: string | null; weight?: number }) => void
  onDeleteCriteria: (id: string) => void
}

function CategoryBlock({
  category, criteria, onRenameCategory, onDeleteCategory,
  onAddCriteria, onUpdateCriteria, onDeleteCriteria,
}: BlockProps) {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newWeight, setNewWeight] = useState('10')
  const [adding, setAdding] = useState(false)

  const catWeight = criteria.reduce((s, c) => s + c.weight, 0)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await onAddCriteria(newName.trim(), newDesc.trim() || null, parseFloat(newWeight) || 0)
    setNewName(''); setNewDesc(''); setNewWeight('10')
    setAdding(false)
  }

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Category header */}
      <div className="flex items-center justify-between gap-3 rounded-t-lg bg-yellow-50 px-4 py-2.5">
        {category ? (
          <input
            defaultValue={category.name}
            onBlur={(e) => { if (e.target.value.trim() && e.target.value !== category.name) onRenameCategory(e.target.value.trim()) }}
            className="flex-1 rounded border-0 bg-transparent text-sm font-bold text-gray-800 outline-none focus:bg-white focus:px-2 focus:py-1 focus:ring-1 focus:ring-yellow-300"
          />
        ) : (
          <span className="flex-1 text-sm font-bold text-gray-500">ยังไม่จัดหมวดหมู่</span>
        )}
        <span className="shrink-0 rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-bold text-yellow-800">
          {catWeight.toFixed(1)}%
        </span>
        {category && (
          <button onClick={onDeleteCategory} className="shrink-0 text-sm text-red-400 hover:text-red-600">✕</button>
        )}
      </div>

      {/* Criteria rows */}
      <div className="divide-y divide-gray-100">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-start gap-3 px-4 py-2.5">
            <div className="flex-1 space-y-1">
              <input
                defaultValue={c.name}
                onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.name) onUpdateCriteria(c.id, { name: e.target.value.trim() }) }}
                className="w-full rounded border-0 bg-transparent text-sm text-gray-800 outline-none focus:bg-gray-50 focus:px-2 focus:py-1 focus:ring-1 focus:ring-blue-200"
                placeholder="ชื่อหัวข้อ"
              />
              <input
                defaultValue={c.description ?? ''}
                onBlur={(e) => { if (e.target.value !== (c.description ?? '')) onUpdateCriteria(c.id, { description: e.target.value.trim() || null }) }}
                className="w-full rounded border-0 bg-transparent text-xs text-gray-500 outline-none focus:bg-gray-50 focus:px-2 focus:py-1 focus:ring-1 focus:ring-blue-200"
                placeholder="รายละเอียด (ถ้ามี)"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number" min="0" max="100" defaultValue={c.weight}
                onBlur={(e) => { const w = parseFloat(e.target.value); if (!isNaN(w) && w !== c.weight) onUpdateCriteria(c.id, { weight: w }) }}
                className="input w-16 text-center text-sm"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
            <button onClick={() => { onDeleteCriteria(c.id) }}
              className="mt-1 shrink-0 text-sm text-red-300 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>

      {/* Add criteria row */}
      <div className="flex items-end gap-2 rounded-b-lg bg-gray-50 px-4 py-2.5">
        <div className="flex-1 space-y-1">
          <input value={newName} onChange={(e) => { setNewName(e.target.value) }}
            className="input w-full text-sm" placeholder="+ หัวข้อย่อย" />
          <input value={newDesc} onChange={(e) => { setNewDesc(e.target.value) }}
            className="input w-full text-xs" placeholder="รายละเอียด (ถ้ามี)" />
        </div>
        <div className="flex items-center gap-1">
          <input type="number" min="0" max="100" value={newWeight} onChange={(e) => { setNewWeight(e.target.value) }}
            className="input w-16 text-center text-sm" />
          <span className="text-xs text-gray-400">%</span>
        </div>
        <button onClick={() => void handleAdd()} disabled={adding || !newName.trim()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          เพิ่ม
        </button>
      </div>
    </div>
  )
}
