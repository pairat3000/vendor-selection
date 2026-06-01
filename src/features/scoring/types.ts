import type { Database } from '@/types/database'

export type ScoringCriteria = Database['public']['Tables']['scoring_criteria']['Row']
export type Scorer = Database['public']['Tables']['scorers']['Row']
export type Score = Database['public']['Tables']['scores']['Row']
export type ScorerChangeLog = Database['public']['Tables']['scorer_change_log']['Row']

export interface ScorerWithProfile extends Scorer {
  full_name: string
  email?: string
}

export interface VendorScore {
  vendor_id: string
  vendor_name: string
  weighted_score: number
  scores: Record<string, number> // criteria_id → score
}

export interface FinalScore {
  vendor_id: string
  vendor_name: string
  final_score: number
  scorer_count: number
}
