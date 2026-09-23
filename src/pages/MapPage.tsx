import { useState } from 'react'
import KnowledgeMap from '../features/knowledge-map/KnowledgeMap'
import { useMapData } from '../features/knowledge-map/useMapData'
import { TOPIC_LABELS, topicColour } from '../features/knowledge-map/mapColours'
import type { MapNode } from '../types'

export default function MapPage() {
  const { nodes, edges, loading } = useMapData()
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null)

  if (loading) {
    return (
      <div className="bg-cream h-full flex items-center justify-center">
        <p className="font-body text-stone-muted">Loading your knowledge map...</p>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="bg-cream h-full flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-2xl text-stone-ink">Your Knowledge Map</h1>
        <p className="font-body text-stone-muted">
          Upload your first document to start building your knowledge graph.
        </p>
      </div>
    )
  }

  const availableTopics = Array.from(new Set(nodes.map(n => n.topic)))

  return (
    <div className="bg-cream h-full flex flex-col">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-border-warm flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-xl text-stone-ink">Knowledge Map</h1>
          <p className="font-body text-sm text-stone-muted mt-0.5">
            {nodes.length} {nodes.length === 1 ? 'document' : 'documents'} ·{' '}
            {edges.length} {edges.length === 1 ? 'connection' : 'connections'}
          </p>
        </div>

        {/* Topic filter buttons — one per unique topic present in the map (wired up in Step 5) */}
        <div className="flex items-center gap-2">
          {availableTopics.map(topic => (
            <span
              key={topic}
              className="flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-xs bg-forest-light text-forest"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: topicColour(topic) }}
              />
              {TOPIC_LABELS[topic]}
            </span>
          ))}
        </div>
      </div>

      {/* Map canvas — takes remaining height */}
      <div className="flex-1 relative overflow-hidden">
        <KnowledgeMap onNodeClick={setSelectedNode} />

        {/* Node detail panel — slides in from right when a node is selected */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-surface border border-border-warm rounded shadow-warm p-5">
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-display text-base text-stone-ink leading-snug pr-2">
                {selectedNode.title}
              </h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-stone-muted hover:text-stone-ink text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-stone-muted">MASTERY</span>
                <div className="flex-1 h-1.5 bg-border-warm rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forest rounded-full transition-all"
                    style={{ width: `${Math.round(selectedNode.masteryScore * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-stone-muted">
                  {Math.round(selectedNode.masteryScore * 100)}%
                </span>
              </div>
              <p className="font-body text-xs text-stone-muted">
                {selectedNode.cardCount} cards · {selectedNode.reviewCount} total reviews
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
