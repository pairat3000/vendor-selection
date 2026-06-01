import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { weightedScore, finalScore } from '@/lib/scoring'
import type { Database } from '@/types/database'
import type {
  ScoringCriteria, Score, ScorerWithProfile, FinalScore,
} from '@/features/scoring/types'

type CriteriaInsert = Database['public']['Tables']['scoring_criteria']['Insert']
type CriteriaUpdate = Database['public']['Tables']['scoring_criteria']['Update']
type ScorerChangeLogInsert = Database['public']['Tables']['scorer_change_log']['Insert']

interface ScoringState {
  criteria: ScoringCriteria[]
  scorers: ScorerWithProfile[]
  myScores: Record<string, Record<string, number>> // vendor_id → criteria_id → score
  isUnlocked: boolean
  finalScores: FinalScore[]
  loading: boolean

  // criteria
  fetchCriteria: (requestId: string) => Promise<void>
  addCriteria: (data: CriteriaInsert) => Promise<{ error: string | null }>
  updateCriteria: (id: string, data: CriteriaUpdate) => Promise<void>
  deleteCriteria: (id: string) => Promise<void>

  // scorers
  fetchScorers: (requestId: string) => Promise<void>
  addScorer: (requestId: string, userId: string, reason: string, changedBy: string) => Promise<{ error: string | null }>
  removeScorer: (scorerId: string, requestId: string, userId: string, reason: string, changedBy: string) => Promise<{ error: string | null }>
  restoreScorer: (scorerId: string, requestId: string, userId: string, reason: string, changedBy: string) => Promise<{ error: string | null }>

  // scores
  fetchMyScores: (scorerId: string) => Promise<void>
  saveScore: (scorerId: string, requestId: string, vendorId: string, criteriaId: string, score: number) => Promise<void>
  submitScores: (scorerId: string) => Promise<{ error: string | null }>

  // results
  checkUnlocked: (requestId: string) => Promise<void>
  fetchFinalScores: (requestId: string) => Promise<void>

  // recalc preview
  previewRemoval: (scorerId: string, requestId: string, requestVendorIds: string[], vendorNames: Record<string, string>) => Promise<FinalScore[]>
}

export const useScoringStore = create<ScoringState>((set, get) => ({
  criteria: [],
  scorers: [],
  myScores: {},
  isUnlocked: false,
  finalScores: [],
  loading: false,

  // ─── CRITERIA ───────────────────────────────────────────
  fetchCriteria: async (requestId) => {
    const { data } = await supabase
      .from('scoring_criteria')
      .select('*')
      .eq('request_id', requestId)
      .order('sort_order')
    set({ criteria: data ?? [] })
  },

  addCriteria: async (data) => {
    const maxOrder = get().criteria.reduce((m, c) => Math.max(m, c.sort_order), 0)
    const res = await supabase
      .from('scoring_criteria')
      .insert({ ...data, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (res.error) return { error: res.error.message }
    set((s) => ({ criteria: [...s.criteria, res.data] }))
    return { error: null }
  },

  updateCriteria: async (id, data) => {
    const res = await supabase.from('scoring_criteria').update(data).eq('id', id).select().single()
    if (!res.error) {
      set((s) => ({ criteria: s.criteria.map((c) => c.id === id ? res.data : c) }))
    }
  },

  deleteCriteria: async (id) => {
    await supabase.from('scoring_criteria').delete().eq('id', id)
    set((s) => ({ criteria: s.criteria.filter((c) => c.id !== id) }))
  },

  // ─── SCORERS ────────────────────────────────────────────
  fetchScorers: async (requestId) => {
    const { data: scorerData } = await supabase
      .from('scorers')
      .select('*')
      .eq('request_id', requestId)
    if (!scorerData) return
    // Fetch profiles separately
    const userIds = scorerData.map((s) => s.user_id)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    const profileMap = Object.fromEntries((profileData ?? []).map((p) => [p.id, p.full_name]))
    const mapped: ScorerWithProfile[] = scorerData.map((s) => ({
      ...s,
      full_name: profileMap[s.user_id] ?? s.user_id,
    }))
    set({ scorers: mapped })
  },

  addScorer: async (requestId, userId, reason, changedBy) => {
    const { error } = await supabase.from('scorers').insert({
      request_id: requestId, user_id: userId, is_active: true,
    })
    if (error) return { error: error.message }
    await logScorerChange({ request_id: requestId, action: 'added', target_user_id: userId, reason, changed_by: changedBy })
    await get().fetchScorers(requestId)
    return { error: null }
  },

  removeScorer: async (scorerId, requestId, userId, reason, changedBy) => {
    const { error } = await supabase.from('scorers').update({ is_active: false }).eq('id', scorerId)
    if (error) return { error: error.message }
    await logScorerChange({ request_id: requestId, action: 'removed', target_user_id: userId, reason, changed_by: changedBy })
    set((s) => ({ scorers: s.scorers.map((sc) => sc.id === scorerId ? { ...sc, is_active: false } : sc) }))
    return { error: null }
  },

  restoreScorer: async (scorerId, requestId, userId, reason, changedBy) => {
    const { error } = await supabase.from('scorers').update({ is_active: true }).eq('id', scorerId)
    if (error) return { error: error.message }
    await logScorerChange({ request_id: requestId, action: 'added', target_user_id: userId, reason, changed_by: changedBy })
    set((s) => ({ scorers: s.scorers.map((sc) => sc.id === scorerId ? { ...sc, is_active: true } : sc) }))
    return { error: null }
  },

  // ─── SCORES ─────────────────────────────────────────────
  fetchMyScores: async (scorerId) => {
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('scorer_id', scorerId)
    if (!data) return
    const map: Record<string, Record<string, number>> = {}
    data.forEach((s: Score) => {
      map[s.vendor_id] ??= {}
      map[s.vendor_id][s.criteria_id] = s.score
    })
    set({ myScores: map })
  },

  saveScore: async (scorerId, requestId, vendorId, criteriaId, score) => {
    await supabase.from('scores').upsert(
      { scorer_id: scorerId, request_id: requestId, vendor_id: vendorId, criteria_id: criteriaId, score },
      { onConflict: 'scorer_id,vendor_id,criteria_id' },
    )
    set((s) => ({
      myScores: {
        ...s.myScores,
        [vendorId]: { ...(s.myScores[vendorId] ?? {}), [criteriaId]: score },
      },
    }))
  },

  submitScores: async (scorerId) => {
    const { error } = await supabase
      .from('scorers')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', scorerId)
    if (error) return { error: error.message }
    set((s) => ({
      scorers: s.scorers.map((sc) =>
        sc.id === scorerId ? { ...sc, submitted_at: new Date().toISOString() } : sc,
      ),
    }))
    return { error: null }
  },

  // ─── RESULTS ────────────────────────────────────────────
  checkUnlocked: async (requestId) => {
    const { data } = await supabase.rpc('is_scoring_unlocked', { p_request_id: requestId })
    set({ isUnlocked: data === true })
  },

  fetchFinalScores: async (requestId) => {
    set({ loading: true })
    try {
      const { data } = await supabase.rpc('get_final_scores', { p_request_id: requestId })
      set({ finalScores: (data ?? []) as FinalScore[], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  // ─── RECALC PREVIEW ──────────────────────────────────────
  previewRemoval: async (scorerId, _requestId, requestVendorIds, vendorNames) => {
    const criteria = get().criteria
    const activeScorerIds = get().scorers
      .filter((s) => s.is_active && s.submitted_at && s.id !== scorerId)
      .map((s) => s.id)

    if (activeScorerIds.length === 0) return requestVendorIds.map((vid) => ({
      vendor_id: vid, vendor_name: vendorNames[vid] ?? vid, final_score: 0, scorer_count: 0,
    }))

    const { data: scoresData } = await supabase
      .from('scores')
      .select('*')
      .in('scorer_id', activeScorerIds)
      .in('vendor_id', requestVendorIds)

    const scores: Score[] = scoresData ?? []

    return requestVendorIds.map((vid) => {
      const vendorScores = scores.filter((s) => s.vendor_id === vid)
      const scorerIds = new Set(vendorScores.map((s) => s.scorer_id))
      const scorerWeightedScores: number[] = []

      scorerIds.forEach((sid) => {
        const entries = criteria.map((c) => ({
          score: vendorScores.find((s) => s.scorer_id === sid && s.criteria_id === c.id)?.score ?? 0,
          weight: c.weight,
        }))
        scorerWeightedScores.push(weightedScore(entries))
      })

      return {
        vendor_id: vid,
        vendor_name: vendorNames[vid] ?? vid,
        final_score: finalScore(scorerWeightedScores),
        scorer_count: scorerIds.size,
      }
    })
  },
}))

async function logScorerChange(data: ScorerChangeLogInsert) {
  await supabase.from('scorer_change_log').insert(data)
}
