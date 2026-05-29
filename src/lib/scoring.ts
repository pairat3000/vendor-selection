export interface ScoreEntry {
  score: number
  weight: number
}

export function weightedScore(entries: ScoreEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.score * e.weight) / 100, 0)
}

export function finalScore(weightedScores: number[]): number {
  if (weightedScores.length === 0) return 0
  return weightedScores.reduce((sum, s) => sum + s, 0) / weightedScores.length
}
