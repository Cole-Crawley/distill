import type { MapNode } from '../../types'

// Turns a note into a circle on the Knowledge Map: size reflects effort (mastery + review count), colour intensity reflects how well it's known.

const BASE_RADIUS = 18 // every node starts here, even a brand-new note with zero reviews
const MAX_MASTERY_BONUS = 20 // full mastery (score 1.0) adds up to this many pixels
const MAX_REVIEW_BONUS = 14 // heavy review history adds up to this many more pixels
const REVIEW_BONUS_CAP = 50 // review count needed to hit the full review bonus — more than this doesn't grow the node further
const HALO_OPACITY = 0.15
const INNER_BASE_OPACITY = 0.85
const INNER_MASTERY_OPACITY_RANGE = 0.15
const LABEL_MAX_CHARS = 20

/** Radius grows with mastery and review volume; caps at 52 for a fully mastered, heavily reviewed document. */
export function nodeRadius(node: MapNode): number {
  const masteryBonus = node.masteryScore * MAX_MASTERY_BONUS
  // Review bonus flattens out past 50 reviews instead of growing forever.
  const reviewBonus = Math.min(node.reviewCount / REVIEW_BONUS_CAP, 1) * MAX_REVIEW_BONUS
  return BASE_RADIUS + masteryBonus + reviewBonus
}

/** The soft, low-opacity outer ring — mostly there to make the topic colour readable without overwhelming the map. */
export function nodeHaloOpacity(): number {
  return HALO_OPACITY
}

/** The solid inner circle gets very slightly more opaque (more "solid-looking") the better a note is known — a subtle secondary cue on top of size. */
export function nodeInnerOpacity(node: MapNode): number {
  return INNER_BASE_OPACITY + node.masteryScore * INNER_MASTERY_OPACITY_RANGE
}

/** Long titles are truncated so they don't overlap neighbouring nodes' labels. */
export function nodeLabel(node: MapNode): string {
  return node.title.length > LABEL_MAX_CHARS
    ? `${node.title.slice(0, LABEL_MAX_CHARS)}…`
    : node.title
}
