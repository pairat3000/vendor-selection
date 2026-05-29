import { describe, it, expect } from 'vitest'
import { weightedScore, finalScore } from './scoring'

describe('weightedScore', () => {
  it('calculates weighted sum correctly', () => {
    const entries = [
      { score: 80, weight: 60 },
      { score: 70, weight: 40 },
    ]
    expect(weightedScore(entries)).toBeCloseTo(76)
  })

  it('returns 0 for empty entries', () => {
    expect(weightedScore([])).toBe(0)
  })
})

describe('finalScore', () => {
  it('averages weighted scores across scorers', () => {
    expect(finalScore([80, 60, 70])).toBeCloseTo(70)
  })

  it('returns 0 for no scorers', () => {
    expect(finalScore([])).toBe(0)
  })
})
