import type { MapEdge } from '../../types'

type EdgeStrengthLike = Pick<MapEdge, 'strength'>
type EdgeReasonLike = Pick<MapEdge, 'relationshipType' | 'reason'>

const BASE_STROKE_COLOUR = 'rgb(var(--color-border-warm))'
const STROKE_WIDTH_MULTIPLIER = 2
const EDGE_OPACITY = 0.6

export function edgeStrokeColour(): string {
  return BASE_STROKE_COLOUR
}

export function edgeStrokeWidth(edge: EdgeStrengthLike): number {
  return edge.strength * STROKE_WIDTH_MULTIPLIER
}

export function edgeOpacity(): number {
  return EDGE_OPACITY
}

export function edgeTooltipText(edge: EdgeReasonLike): string {
  return `${edge.relationshipType}: ${edge.reason}`
}
