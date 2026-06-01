import { useState } from 'react'
import { exportXLSX, exportPDF } from '@/lib/exportReport'
import { supabase } from '@/lib/supabase'
import type { ExportData } from '@/lib/exportReport'
import type { ScoringCriteria, FinalScore } from './types'

interface Props {
  requestId: string
  requestTitle: string
  criteria: ScoringCriteria[]
  vendors: { id: string; name: string }[]
  finalScores: FinalScore[]
  isUnlocked: boolean
}

export default function ExportButton({ requestId, requestTitle, criteria, vendors, finalScores, isUnlocked }: Props) {
  const [loading, setLoading] = useState(false)

  const buildExportData = async (): Promise<ExportData> => {
    // Fetch ONLY active + submitted scorers (เฉพาะคนที่ส่งคะแนนจริงๆ)
    const { data: scorerData } = await supabase
      .from('scorers')
      .select('id, user_id, is_active, submitted_at')
      .eq('request_id', requestId)
      .eq('is_active', true)
      .not('submitted_at', 'is', null)

    const activeScorerIds = (scorerData ?? []).map((s) => s.id)

    // Fetch scores เฉพาะของ active+submitted scorers เท่านั้น
    const { data: scoresData } = activeScorerIds.length > 0
      ? await supabase
          .from('scores')
          .select('*')
          .eq('request_id', requestId)
          .in('scorer_id', activeScorerIds)
      : { data: [] }

    // Profiles
    const userIds = (scorerData ?? []).map((s) => s.user_id)
    const { data: profileData } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] }
    const profileMap = Object.fromEntries((profileData ?? []).map((p) => [p.id, p.full_name]))
    const scorerNames: Record<string, string> = Object.fromEntries(
      (scorerData ?? []).map((s) => [s.id, profileMap[s.user_id] ?? s.user_id]),
    )

    // Build scorerScores map: scorerId → vendorId → criteriaId → score
    const scorerScores: Record<string, Record<string, Record<string, number>>> = {}
    ;(scoresData ?? []).forEach((s) => {
      scorerScores[s.scorer_id] ??= {}
      scorerScores[s.scorer_id][s.vendor_id] ??= {}
      scorerScores[s.scorer_id][s.vendor_id][s.criteria_id] = s.score
    })

    return {
      requestTitle,
      exportDate: new Date().toISOString().split('T')[0] ?? new Date().toDateString(),
      criteria,
      vendors,
      finalScores,
      scorerScores,
      scorerNames,
    }
  }

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setLoading(true)
    try {
      const data = await buildExportData()
      if (format === 'xlsx') exportXLSX(data)
      else exportPDF(data)
    } finally {
      setLoading(false)
    }
  }

  if (!isUnlocked) return null

  return (
    <div className="flex gap-2">
      <button
        onClick={() => void handleExport('xlsx')}
        disabled={loading}
        className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        📊 Export Excel
      </button>
      <button
        onClick={() => void handleExport('pdf')}
        disabled={loading}
        className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        📄 Export PDF
      </button>
    </div>
  )
}
