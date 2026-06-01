import { useScoringStore } from '@/stores/scoringStore'
import { weightedScore } from '@/lib/scoring'
import type { ScoringCriteria } from './types'
import type { RequestVendor } from '@/features/requests/types'

interface Props {
  scorerId: string
  requestId: string
  criteria: ScoringCriteria[]
  vendors: (RequestVendor & { vendor_name: string })[]
  submitted: boolean
  onSubmit: () => void
}

export default function ScoringMatrix({ scorerId, requestId, criteria, vendors, submitted, onSubmit }: Props) {
  const { myScores, saveScore } = useScoringStore()

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightOk = Math.abs(totalWeight - 100) < 0.01

  const getScore = (vendorId: string, criteriaId: string): number =>
    (myScores[vendorId] ?? {})[criteriaId] ?? 0

  const getWeightedScore = (vendorId: string) =>
    weightedScore(criteria.map((c) => ({ score: getScore(vendorId, c.id), weight: c.weight })))

  const handleSlider = async (vendorId: string, criteriaId: string, value: number) => {
    await saveScore(scorerId, requestId, vendorId, criteriaId, value)
  }

  if (criteria.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        ยังไม่มีเกณฑ์การให้คะแนน — กรุณาเพิ่มเกณฑ์ก่อน
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

      {vendors.map((vendor) => {
        const ws = getWeightedScore(vendor.vendor_id)
        return (
          <div key={vendor.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">🏢 {vendor.vendor_name}</h3>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">{ws.toFixed(1)}</span>
                <span className="ml-1 text-sm text-gray-400">/ 100</span>
              </div>
            </div>

            <div className="space-y-3">
              {criteria.map((c) => {
                const score = getScore(vendor.vendor_id, c.id)
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-700">{c.name} <span className="text-gray-400">({c.weight}%)</span></span>
                      <span className="font-semibold text-gray-900 w-8 text-right">{score}</span>
                    </div>
                    <input
                      type="range" min="0" max="100" value={score}
                      disabled={submitted}
                      onChange={(e) => void handleSlider(vendor.vendor_id, c.id, parseInt(e.target.value))}
                      className="w-full accent-blue-600 disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>0</span><span>50</span><span>100</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!submitted && (
        <div className="flex justify-end">
          <button
            onClick={onSubmit}
            disabled={!weightOk}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            ✓ ส่งคะแนน (Submit)
          </button>
        </div>
      )}
    </div>
  )
}
