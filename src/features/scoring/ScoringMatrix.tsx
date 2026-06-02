import { useState } from 'react'
import { useScoringStore } from '@/stores/scoringStore'
import { weightedScore } from '@/lib/scoring'
import type { ScoringCategory, ScoringCriteria } from './types'
import type { RequestVendor } from '@/features/requests/types'

interface Props {
  scorerId: string
  requestId: string
  categories: ScoringCategory[]
  criteria: ScoringCriteria[]
  vendors: (RequestVendor & { vendor_name: string })[]
  submitted: boolean
  onSubmit: () => void
}

// จัดกลุ่ม criteria ตามหมวด เรียงตาม sort_order, หัวข้อไม่มีหมวดไว้ท้ายสุด
function groupByCategory(categories: ScoringCategory[], criteria: ScoringCriteria[]) {
  const sortedCats = categories.slice().sort((a, b) => a.sort_order - b.sort_order)
  const groups = sortedCats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: criteria.filter((c) => c.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order),
  }))
  const uncategorized = criteria.filter((c) => !c.category_id)
  if (uncategorized.length > 0) groups.push({ id: 'none', name: '', items: uncategorized })
  return groups.filter((g) => g.items.length > 0)
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
}

export default function ScoringMatrix({ scorerId, requestId, categories, criteria, vendors, submitted, onSubmit }: Props) {
  const { myScores, saveScore } = useScoringStore()
  const groups = groupByCategory(categories, criteria)

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightOk = Math.abs(totalWeight - 100) < 0.01

  const [activeVendorId, setActiveVendorId] = useState(vendors[0]?.vendor_id ?? '')
  const activeVendor = vendors.find((v) => v.vendor_id === activeVendorId) ?? vendors[0]

  const getScore = (vendorId: string, criteriaId: string): number =>
    (myScores[vendorId] ?? {})[criteriaId] ?? 0

  // ช่องนี้ถูกกรอก (บันทึกแล้ว) หรือยัง — แยก "ยังไม่กรอก" ออกจาก "ให้ 0 คะแนน"
  const isScored = (vendorId: string, criteriaId: string): boolean =>
    criteriaId in (myScores[vendorId] ?? {})

  const getWeightedScore = (vendorId: string) =>
    weightedScore(criteria.map((c) => ({ score: getScore(vendorId, c.id), weight: c.weight })))

  // ความครบถ้วนการกรอก
  const vendorScoredCount = (vendorId: string) => criteria.filter((c) => isScored(vendorId, c.id)).length
  const vendorComplete = (vendorId: string) => vendorScoredCount(vendorId) === criteria.length
  const totalCells = vendors.length * criteria.length
  const scoredCells = vendors.reduce((sum, v) => sum + vendorScoredCount(v.vendor_id), 0)
  const allComplete = scoredCells === totalCells

  // คะแนนถ่วงน้ำหนักของเฉพาะหมวด (เต็มของหมวด = ผลรวม weight ของหัวข้อในหมวด)
  const getCategoryScore = (vendorId: string, items: ScoringCriteria[]) =>
    weightedScore(items.map((c) => ({ score: getScore(vendorId, c.id), weight: c.weight })))

  const setScore = (vendorId: string, criteriaId: string, raw: number) => {
    const value = Math.max(0, Math.min(100, Math.round(raw)))
    void saveScore(scorerId, requestId, vendorId, criteriaId, value)
  }

  if (criteria.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        ยังไม่มีเกณฑ์การให้คะแนน — กรุณาเพิ่มเกณฑ์ก่อน
      </div>
    )
  }
  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        ยังไม่มี vendor ใน request นี้
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!weightOk && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          ⚠️ น้ำหนักรวม {totalWeight.toFixed(1)}% — ต้องรวมเป็น 100% ก่อนจึงจะส่งได้
        </div>
      )}
      {submitted && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ คุณส่งคะแนนแล้ว — ไม่สามารถแก้ไขได้
        </div>
      )}

      {/* Progress summary */}
      {!submitted && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">ความคืบหน้าการให้คะแนน</span>
            <span className={`font-semibold ${allComplete ? 'text-green-600' : 'text-amber-600'}`}>
              {scoredCells}/{totalCells} ช่อง {allComplete ? '· ครบแล้ว ✓' : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${allComplete ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${String(totalCells > 0 ? (scoredCells / totalCells) * 100 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Vendor selector — เลือกทีละราย */}
      <div className="flex flex-wrap gap-2">
        {vendors.map((v) => {
          const ws = getWeightedScore(v.vendor_id)
          const active = v.vendor_id === activeVendorId
          const done = vendorComplete(v.vendor_id)
          const cnt = vendorScoredCount(v.vendor_id)
          return (
            <button
              key={v.vendor_id}
              onClick={() => { setActiveVendorId(v.vendor_id) }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {/* สถานะความครบ */}
              <span className={done ? 'text-green-500' : 'text-amber-400'}>{done ? '✓' : '○'}</span>
              <span className="font-medium">{v.vendor_name}</span>
              {submitted || done
                ? <span className={`text-xs font-bold ${active ? 'text-blue-600' : 'text-gray-400'}`}>{ws.toFixed(1)}</span>
                : <span className="text-xs text-amber-500">{cnt}/{criteria.length}</span>}
            </button>
          )
        })}
      </div>

      {/* Active vendor scoring card */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {/* Header with big score */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">🏢 {activeVendor.vendor_name}</h3>
          <div className="text-right">
            <span className="text-3xl font-bold text-blue-600">{getWeightedScore(activeVendor.vendor_id).toFixed(1)}</span>
            <span className="ml-1 text-sm text-gray-400">/ 100</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {groups.map((g) => (
            <div key={g.id} className="px-5 py-4">
              {/* Category header + subtotal */}
              {g.name && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{g.name}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                    {getCategoryScore(activeVendor.vendor_id, g.items).toFixed(1)} /{' '}
                    {g.items.reduce((s, c) => s + c.weight, 0)}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {g.items.map((c) => {
                  const score = getScore(activeVendor.vendor_id, c.id)
                  const scored = isScored(activeVendor.vendor_id, c.id)
                  return (
                    <div key={c.id} className={`grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 rounded-lg ${
                      !scored && !submitted ? 'bg-amber-50/60 px-3 py-2 ring-1 ring-amber-200' : ''
                    }`}>
                      {/* Label */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {c.name} <span className="font-normal text-gray-400">({c.weight}%)</span>
                          {!scored && !submitted && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                              ยังไม่กรอก
                            </span>
                          )}
                        </p>
                        {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                      </div>

                      {/* Number stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button" disabled={submitted}
                          onClick={() => { setScore(activeVendor.vendor_id, c.id, score - 1) }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >−</button>
                        <input
                          type="number" min="0" max="100" value={score} disabled={submitted}
                          onChange={(e) => { setScore(activeVendor.vendor_id, c.id, parseInt(e.target.value) || 0) }}
                          className={`w-16 rounded-lg border border-gray-300 py-1.5 text-center text-base font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 ${scoreColor(score)}`}
                        />
                        <button
                          type="button" disabled={submitted}
                          onClick={() => { setScore(activeVendor.vendor_id, c.id, score + 1) }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >+</button>
                      </div>

                      {/* Slider — full width under label+stepper */}
                      <div className="col-span-2">
                        <input
                          type="range" min="0" max="100" value={score} disabled={submitted}
                          onChange={(e) => { setScore(activeVendor.vendor_id, c.id, parseInt(e.target.value)) }}
                          className="w-full accent-blue-600 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit bar — บล็อกจนกว่าจะกรอกครบ + น้ำหนัก 100% */}
      {!submitted && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3">
          <p className="text-sm text-gray-500">
            {!weightOk
              ? `⚠️ น้ำหนักรวม ${totalWeight.toFixed(1)}% (ต้อง 100%)`
              : !allComplete
                ? `⚠️ ยังกรอกไม่ครบ — เหลืออีก ${String(totalCells - scoredCells)} ช่อง`
                : '✓ กรอกครบแล้ว พร้อมส่ง'}
          </p>
          <button
            onClick={onSubmit}
            disabled={!weightOk || !allComplete}
            title={!allComplete ? 'ต้องกรอกคะแนนครบทุก vendor ทุกหัวข้อก่อน' : ''}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ ส่งคะแนน (Submit)
          </button>
        </div>
      )}
    </div>
  )
}
