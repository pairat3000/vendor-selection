import type { FinalScore, ScorerWithProfile } from './types'

interface Props {
  isUnlocked: boolean
  finalScores: FinalScore[]
  scorers: ScorerWithProfile[]
  loading: boolean
  vendorNames?: Record<string, string> // vendor_id → vendor_name
}

export default function ResultsPanel({ isUnlocked, finalScores, scorers, loading, vendorNames = {} }: Props) {
  const active = scorers.filter((s) => s.is_active)
  const submitted = active.filter((s) => s.submitted_at)

  if (!isUnlocked) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ผลการให้คะแนน</h2>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          🔒 ผลถูกล็อก — รอให้ทุกคนกรอกครบ ({submitted.length}/{active.length} คน)
        </div>
        <ul className="mt-4 space-y-2">
          {active.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className={s.submitted_at ? 'text-green-600' : 'text-yellow-600'}>
                {s.submitted_at ? '✓' : '⏳'}
              </span>
              <span className="text-gray-700">{s.full_name}</span>
              <span className="text-xs text-gray-400">
                {s.submitted_at ? `ส่งแล้ว ${new Date(s.submitted_at).toLocaleDateString('th-TH')}` : 'ยังไม่กรอก'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        ผลการให้คะแนน (Unlocked — {submitted.length} scorers)
      </h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : finalScores.length === 0 ? (
        <p className="text-sm text-gray-400">ไม่มีข้อมูลคะแนน</p>
      ) : (
        <div className="space-y-3">
          {finalScores
            .slice()
            .sort((a, b) => b.final_score - a.final_score)
            .map((fs, i) => (
              <div key={fs.vendor_id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${i === 0 ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {vendorNames[fs.vendor_id] ?? fs.vendor_id}
                  </p>
                  <p className="text-xs text-gray-400">{fs.scorer_count} scorers</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">{fs.final_score.toFixed(1)}</span>
                  <span className="ml-1 text-sm text-gray-400">/ 100</span>
                </div>
                {i === 0 && <span className="text-lg">🏆</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
