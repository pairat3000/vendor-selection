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
  if (uncategorized.length > 0) groups.push({ id: 'none', name: 'อื่นๆ', items: uncategorized })
  return groups.filter((g) => g.items.length > 0)
}

// heatmap background ตามคะแนน
function cellBg(score: number, scored: boolean): string {
  if (!scored) return 'bg-white'
  if (score >= 80) return 'bg-green-100'
  if (score >= 65) return 'bg-lime-100'
  if (score >= 50) return 'bg-amber-100'
  return 'bg-orange-100'
}

export default function ScoringMatrix({ scorerId, requestId, categories, criteria, vendors, submitted, onSubmit }: Props) {
  const { myScores, saveScore } = useScoringStore()
  const groups = groupByCategory(categories, criteria)

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightOk = Math.abs(totalWeight - 100) < 0.01

  const getScore = (vid: string, cid: string): number => (myScores[vid] ?? {})[cid] ?? 0
  const isScored = (vid: string, cid: string): boolean => cid in (myScores[vid] ?? {})

  const getWeighted = (vid: string) =>
    weightedScore(criteria.map((c) => ({ score: getScore(vid, c.id), weight: c.weight })))
  const getCategoryWeighted = (vid: string, items: ScoringCriteria[]) =>
    weightedScore(items.map((c) => ({ score: getScore(vid, c.id), weight: c.weight })))

  const setScore = (vid: string, cid: string, raw: number) => {
    const value = Math.max(0, Math.min(100, Math.round(raw)))
    void saveScore(scorerId, requestId, vid, cid, value)
  }

  // completeness
  const totalCells = vendors.length * criteria.length
  const scoredCells = vendors.reduce(
    (sum, v) => sum + criteria.filter((c) => isScored(v.vendor_id, c.id)).length, 0,
  )
  const allComplete = scoredCells === totalCells

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

  // ผู้นำ (คะแนนรวมสูงสุด) สำหรับไฮไลต์
  const totals = vendors.map((v) => ({ vid: v.vendor_id, total: getWeighted(v.vendor_id) }))
  const leaderVid = totals.reduce((best, cur) => (cur.total > best.total ? cur : best), totals[0]).vid

  return (
    <div className="space-y-4">
      {/* Progress + warnings */}
      {!submitted && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">ความคืบหน้าการให้คะแนน</span>
            <span className={`font-semibold ${allComplete ? 'text-green-600' : 'text-amber-600'}`}>
              {scoredCells}/{totalCells} ช่อง {allComplete ? '· ครบแล้ว ✓' : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full transition-all ${allComplete ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${String(totalCells > 0 ? (scoredCells / totalCells) * 100 : 0)}%` }} />
          </div>
          {!weightOk && (
            <p className="mt-2 text-xs text-yellow-700">
              ⚠️ น้ำหนักรวม {totalWeight.toFixed(1)}% — ต้องรวมเป็น 100% ก่อนจึงจะส่งได้
            </p>
          )}
        </div>
      )}
      {submitted && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ คุณส่งคะแนนแล้ว — ไม่สามารถแก้ไขได้
        </div>
      )}

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[240px] border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600">
                เกณฑ์ \ Vendor
              </th>
              {vendors.map((v) => (
                <th key={v.vendor_id}
                  className="sticky top-0 z-10 min-w-[120px] border-b border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold text-gray-800">
                  <div className="flex items-center justify-center gap-1">
                    {v.vendor_id === leaderVid && allComplete && <span>🏆</span>}
                    <span className="truncate">{v.vendor_name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <CategoryRows
                key={g.id}
                group={g}
                vendors={vendors}
                getScore={getScore}
                isScored={isScored}
                getCategoryWeighted={getCategoryWeighted}
                setScore={setScore}
                submitted={submitted}
              />
            ))}

            {/* แถวคะแนนรวม */}
            <tr className="border-t-2 border-gray-300">
              <td className="sticky left-0 z-10 border-r border-gray-200 bg-blue-50 px-4 py-3 text-sm font-bold text-gray-800">
                คะแนนรวมถ่วงน้ำหนัก
              </td>
              {vendors.map((v) => {
                const t = getWeighted(v.vendor_id)
                const isLeader = v.vendor_id === leaderVid && allComplete
                return (
                  <td key={v.vendor_id}
                    className={`px-3 py-3 text-center text-lg font-bold ${isLeader ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                    {t.toFixed(1)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Submit bar */}
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
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ ส่งคะแนน (Submit)
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400">
        💡 พิมพ์ตัวเลข 0-100 ในแต่ละช่อง · สีบอกระดับคะแนน (เขียว=สูง · แดง=ต่ำ) · แถวล่างคือคะแนนรวมถ่วงน้ำหนัก
      </p>
    </div>
  )
}

// ─── Category header row + criterion rows ──────────────────────────────────

interface CategoryRowsProps {
  group: { id: string; name: string; items: ScoringCriteria[] }
  vendors: (RequestVendor & { vendor_name: string })[]
  getScore: (vid: string, cid: string) => number
  isScored: (vid: string, cid: string) => boolean
  getCategoryWeighted: (vid: string, items: ScoringCriteria[]) => number
  setScore: (vid: string, cid: string, raw: number) => void
  submitted: boolean
}

function CategoryRows({ group, vendors, getScore, isScored, getCategoryWeighted, setScore, submitted }: CategoryRowsProps) {
  const catWeight = group.items.reduce((s, c) => s + c.weight, 0)
  return (
    <>
      {/* Category header */}
      <tr className="bg-yellow-50">
        <td className="sticky left-0 z-10 border-r border-yellow-100 bg-yellow-50 px-4 py-2 text-sm font-bold text-gray-700">
          {group.name} <span className="font-normal text-gray-400">({catWeight}%)</span>
        </td>
        {vendors.map((v) => (
          <td key={v.vendor_id} className="bg-yellow-50 px-3 py-2 text-center text-xs font-semibold text-yellow-700">
            {getCategoryWeighted(v.vendor_id, group.items).toFixed(1)}
          </td>
        ))}
      </tr>

      {/* Criterion rows */}
      {group.items.map((c) => (
        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
          <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 py-2">
            <p className="text-sm text-gray-800">
              {c.name} <span className="text-xs text-gray-400">({c.weight}%)</span>
            </p>
            {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
          </td>
          {vendors.map((v) => {
            const scored = isScored(v.vendor_id, c.id)
            const score = getScore(v.vendor_id, c.id)
            return (
              <td key={v.vendor_id}
                className={`p-0 text-center ${cellBg(score, scored)} ${!scored && !submitted ? 'ring-1 ring-inset ring-amber-300' : ''}`}>
                <input
                  type="number" min="0" max="100"
                  value={scored ? score : ''}
                  disabled={submitted}
                  placeholder="–"
                  onChange={(e) => { setScore(v.vendor_id, c.id, parseInt(e.target.value) || 0) }}
                  className="w-full bg-transparent py-2.5 text-center text-sm font-bold text-gray-800 outline-none placeholder:font-normal placeholder:text-gray-300 focus:bg-white/70 disabled:cursor-not-allowed"
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
