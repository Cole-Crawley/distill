import type { Card } from '../types'

// "Mastery" = how well you know a document, calculated fresh each time from the average SM-2 easeFactor of its reviewed cards, rescaled to 0.0-1.0. Used by both the Knowledge Map and Progress dashboard so it means the same thing everywhere.
export interface MasteryStats {
  masteryScore: number // 0.0 (struggling) – 1.0 (well known)
  reviewCount: number // total number of times cards in this set have been reviewed
}

const EASE_FACTOR_FLOOR = 1.3
const EASE_FACTOR_CEILING = 3.0

export function calculateMastery(cards: Card[]): MasteryStats {
  const reviewedCards = cards.filter(card => card.repetition > 0)

  // Mastery only means something once at least one review has happened —
  // a note with zero cards, or a deck of brand-new unreviewed cards, hasn't
  // been "learned" at all yet. Previously this fell back to a default ease
  // factor and displayed a fabricated ~71% for every such note (found live
  // during the O5 heuristic evaluation, see the dissertation, Appendix A,
  // finding PR-1) instead of an honest 0%.
  if (reviewedCards.length === 0) {
    return { masteryScore: 0, reviewCount: 0 }
  }

  const avgEaseFactor = reviewedCards.reduce((sum, card) => sum + card.easeFactor, 0) / reviewedCards.length
  const range = EASE_FACTOR_CEILING - EASE_FACTOR_FLOOR
  const masteryScore = Math.min(1, Math.max(0, (avgEaseFactor - EASE_FACTOR_FLOOR) / range))
  const reviewCount = reviewedCards.reduce((sum, card) => sum + card.repetition, 0)

  return { masteryScore, reviewCount }
}
