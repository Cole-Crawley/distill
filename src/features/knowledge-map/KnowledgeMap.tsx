import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { MapEdge, MapNode } from '../../types'
import { useMapData } from './useMapData'
import { topicColour, TOPIC_LABELS } from './mapColours'
import { nodeRadius, nodeHaloOpacity, nodeInnerOpacity, nodeLabel } from './MapNode'
import { edgeStrokeColour, edgeStrokeWidth, edgeOpacity, edgeTooltipText } from './MapEdge'

// The Knowledge Map: a D3 force-directed graph where nodes push/pull each other into place; React just hands D3 an empty <svg> and lets it manage everything inside via useEffect.
interface KnowledgeMapProps {
  onNodeClick: (node: MapNode) => void
}

interface TooltipState {
  x: number
  y: number
  content: string
}

type SimNode = MapNode & d3.SimulationNodeDatum
type SimEdge = d3.SimulationLinkDatum<SimNode> & Omit<MapEdge, 'source' | 'target'>

export default function KnowledgeMap({ onNodeClick }: KnowledgeMapProps) {
  const { nodes, edges } = useMapData()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || dimensions.width === 0 || dimensions.height === 0) return

    const { width, height } = dimensions
    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer')

    const simNodes: SimNode[] = nodes.map(n => ({ ...n }))
    const simEdges: SimEdge[] = edges.map(e => ({
      ...e,
      source: typeof e.source === 'number' ? e.source : e.source.id,
      target: typeof e.target === 'number' ? e.target : e.target.id,
    }))

    // Four forces make up the map's whole "physics", running every tick until they settle.
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        // link: pulls connected notes together, stronger AI relationships pull harder and sit closer.
        'link',
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id(d => d.id)
          .distance(d => 120 - d.strength * 60)
          .strength(d => d.strength * 0.4)
      )
      // charge: every node repels every other node, keeping the graph spread out.
      .force('charge', d3.forceManyBody().strength(-300))
      // center: gentle pull toward the middle so the cluster stays roughly centred.
      .force('center', d3.forceCenter(width / 2, height / 2))
      // collision: nodes can't overlap, so bigger nodes shove smaller ones out of the way.
      .force('collision', d3.forceCollide<SimNode>(d => nodeRadius(d) + 12))

    const edgeGroup = zoomLayer.append('g').attr('class', 'edges')

    // The visible line: thin (down to ~0.2px at low strength), purely decorative, no hover
    // handlers of its own — a target that thin was found to be nearly impossible to hover in
    // practice (O5, PR-3), the tooltip appearing for an instant before the mouse slipped off it.
    const edgeSelection = edgeGroup
      .selectAll('line.edge-visible')
      .data(simEdges)
      .join('line')
      .attr('class', 'edge-visible')
      .attr('stroke', edgeStrokeColour())
      .attr('stroke-width', d => edgeStrokeWidth(d))
      .attr('opacity', edgeOpacity())
      .style('pointer-events', 'none')

    // An invisible, generously wide line drawn on top of the same coordinates, purely to catch
    // hover/mousemove reliably — the standard fix for a thin-stroke SVG line's hit target being
    // far smaller than what a mouse can realistically land on.
    const edgeHitSelection = edgeGroup
      .selectAll('line.edge-hit')
      .data(simEdges)
      .join('line')
      .attr('class', 'edge-hit')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 14)
      .style('cursor', 'default')
      .on('mouseenter mousemove', (event: MouseEvent, d) => {
        setTooltip({ x: event.offsetX, y: event.offsetY, content: edgeTooltipText(d) })
      })
      .on('mouseleave', () => setTooltip(null))

    const nodeGroup = zoomLayer
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClick(d))
      .on('mouseenter mousemove', (event: MouseEvent, d) => {
        setTooltip({
          x: event.offsetX,
          y: event.offsetY,
          content: `${d.title} · ${TOPIC_LABELS[d.topic]} · ${Math.round(d.masteryScore * 100)}% mastery · ${d.cardCount} cards`,
        })
      })
      .on('mouseleave', () => setTooltip(null))
      .on('dblclick', (_event, d) => {
        d.fx = null
        d.fy = null
        simulation.alpha(0.3).restart()
      })

    nodeGroup
      .append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => topicColour(d.topic))
      .attr('opacity', nodeHaloOpacity())

    nodeGroup
      .append('circle')
      .attr('r', d => nodeRadius(d) * 0.7)
      .attr('fill', d => topicColour(d.topic))
      .attr('opacity', d => nodeInnerOpacity(d))

    nodeGroup
      .append('text')
      .text(d => nodeLabel(d))
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d) + 14)
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 11)
      .attr('fill', 'rgb(var(--color-stone-muted))')

    // Dragging pins a node in place (fx/fy) and keeps the simulation "warm" so the rest of the graph reacts live; double-click un-pins it.
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', event => {
        if (!event.active) simulation.alphaTarget(0)
      })

    nodeGroup.call(drag)

    // Scroll-to-zoom and drag-to-pan, applied as one transform on the whole zoomLayer group.
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', event => {
        zoomLayer.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Runs on every simulation tick — copies each node's new x/y position onto the actual SVG shapes.
    simulation.on('tick', () => {
      edgeSelection
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)

      edgeHitSelection
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)

      nodeGroup.attr('transform', d => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, dimensions, onNodeClick])

  const visibleTopics = Array.from(new Set(nodes.map(n => n.topic)))

  return (
    <div ref={containerRef} className="w-full h-full relative bg-cream">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />

      {tooltip && (
        <div
          className="absolute pointer-events-none bg-stone-ink text-cream text-xs font-body rounded px-2 py-1 shadow-warm z-10"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.content}
        </div>
      )}

      {visibleTopics.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-surface border border-border-warm rounded shadow-warm p-3 space-y-1.5">
          {visibleTopics.map(topic => (
            <div key={topic} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: topicColour(topic) }}
              />
              <span className="font-body text-xs text-stone-muted">{TOPIC_LABELS[topic]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
