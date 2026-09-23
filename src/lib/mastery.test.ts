import { describe, expect, it } from 'vitest'
import { calculateMastery } from './mastery'
import type { Card } from '../types'

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    documentId: 1,
    front: 'front',
    back: 'back',
    type: 'qa',
    status: 'review',
    interval: 6,
    repetition: 2,
    easeFactor: 2.5,
    due: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

describe('calculateMastery', () => {
  it('returns 0 mastery for a note with no cards at all', () => {
    // Previously fell back to a default ease factor and showed a fabricated
    // ~71% for this exact case — see the dissertation, Appendix A, PR-1.
    expect(calculateMastery([])).toEqual({ masteryScore: 0, reviewCount: 0 })
  })

  it('returns 0 mastery when cards exist but none have been reviewed yet', () => {
    const cards = [makeCard({ repetition: 0 }), makeCard({ repetition: 0 })]
    expect(calculateMastery(cards)).toEqual({ masteryScore: 0, reviewCount: 0 })
  })

  it('averages ease factor across only the reviewed cards', () => {
    const cards = [
      makeCard({ repetition: 3, easeFactor: 2.5 }),
      makeCard({ repetition: 1, easeFactor: 2.5 }),
      makeCard({ repetition: 0, easeFactor: 2.5 }), // unreviewed, excluded from the average
    ]
    const result = calculateMastery(cards)
    // (2.5 - 1.3) / (3.0 - 1.3) = 1.2 / 1.7
    expect(result.masteryScore).toBeCloseTo(1.2 / 1.7, 10)
    expect(result.reviewCount).toBe(4)
  })

  it('clamps mastery to 1 for an ease factor at or above the ceiling', () => {
    const result = calculateMastery([makeCard({ repetition: 5, easeFactor: 3.5 })])
    expect(result.masteryScore).toBe(1)
  })

  it('clamps mastery to 0 for an ease factor at or below the floor', () => {
    const result = calculateMastery([makeCard({ repetition: 1, easeFactor: 1.0 })])
    expect(result.masteryScore).toBe(0)
  })
})
