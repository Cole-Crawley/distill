import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { calculateMastery } from '../../lib/mastery'
import type { MapNode, MapEdge } from '../../types'

// Turns raw Dexie tables into nodes/edges for the Knowledge Map, recalculating mastery live via useLiveQuery whenever documents/cards/relationships change.
export function useMapData(): { nodes: MapNode[]; edges: MapEdge[]; loading: boolean } {
  const result = useLiveQuery(async () => {
    const documents = await db.documents.toArray()
    const cards = await db.cards.toArray()
    const relationships = await db.relationships.toArray()

    const nodes: MapNode[] = documents.map(doc => {
      const docCards = cards.filter(c => c.documentId === doc.id)
      const { masteryScore, reviewCount } = calculateMastery(docCards)

      return {
        id: doc.id!,
        title: doc.title,
        topic: doc.topic,
        masteryScore,
        reviewCount,
        cardCount: doc.cardCount,
      }
    })

    // Edges are just the AI-detected relationships, reshaped for D3's force-link.
    const edges: MapEdge[] = relationships.map(rel => ({
      source: rel.sourceDocumentId,
      target: rel.targetDocumentId,
      strength: rel.strength,
      relationshipType: rel.relationshipType,
      reason: rel.reason,
    }))

    return { nodes, edges }
  })

  return {
    nodes: result?.nodes ?? [],
    edges: result?.edges ?? [],
    loading: result === undefined,
  }
}
