import { useEffect, useRef, useState } from 'react'

interface MiniChartPoint {
  label: string
  value: number
}

interface MiniChartProps {
  type: 'bar' | 'line'
  data: MiniChartPoint[]
  valueSuffix: string
  // Fixes the y-axis top (e.g. retention is always 0-100); omit to derive from the data.
  yMax?: number
  // Show only every Nth x-axis label, so a 30-point bar chart doesn't collide into unreadable text.
  labelEvery?: number
}

const PADDING = { top: 8, right: 8, bottom: 22, left: 30 }
const GRID_LINES = 4

// Picks a round step (1, 2, 2.5 or 5 times a power of ten, whole numbers only) so the
// y-axis never repeats a label. Rounding max * i / 4 used to give ticks like
// 0, 0, 1, 1, 1 for small counts, which drew several labels on top of each other.
function niceScale(max: number) {
  const rough = max / GRID_LINES
  const power = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 && power >= 10 ? 2.5 : fraction <= 5 ? 5 : 10
  const step = Math.max(1, nice * power)
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  return { top, ticks }
}

// A hand-rolled SVG bar/line chart, built specifically to replace recharts on the Progress
// page: recharts' shared rendering core (used by every chart type, not just the two this app
// needs) made that one page's JS chunk ~110KB gzipped and pushed it below the O4 Lighthouse
// performance target (see benchmark/results/lighthouse-summary.md). The two charts here are
// simple enough — up to 30 bars, up to 20 line points, one series each, a hover tooltip — that
// plain SVG plus this component's own scaling math covers it without a charting library at all.
export default function MiniChart({ type, data, valueSuffix, yMax, labelEvery = 1 }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { top: max, ticks: gridValues } = niceScale(yMax ?? Math.max(1, ...data.map(d => d.value)))
  const innerWidth = Math.max(0, size.width - PADDING.left - PADDING.right)
  const innerHeight = Math.max(0, size.height - PADDING.top - PADDING.bottom)

  function xFor(index: number) {
    if (data.length <= 1) return PADDING.left + innerWidth / 2
    return PADDING.left + (index / (data.length - 1)) * innerWidth
  }
  function yFor(value: number) {
    const ratio = max === 0 ? 0 : value / max
    return PADDING.top + innerHeight - ratio * innerHeight
  }

  const slotWidth = data.length > 0 ? innerWidth / data.length : 0
  const barWidth = Math.min(18, slotWidth * 0.6)
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.value)}`).join(' ')
  const gridColour = 'rgb(var(--color-border-warm))'
  const seriesColour = 'rgb(var(--color-forest))'
  const mutedColour = 'rgb(var(--color-stone-muted))'

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {size.width > 0 && size.height > 0 && (
        <svg width={size.width} height={size.height} onMouseLeave={() => setHoverIndex(null)}>
          {gridValues.map(value => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={size.width - PADDING.right}
                y1={yFor(value)}
                y2={yFor(value)}
                stroke={gridColour}
              />
              <text x={PADDING.left - 6} y={yFor(value)} textAnchor="end" dominantBaseline="middle" fill={mutedColour} className="font-mono text-[11px]">
                {value}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={i} x={xFor(i)} y={size.height - 6} textAnchor="middle" fill={mutedColour} className="font-mono text-[11px]">
                {d.label}
              </text>
            ) : null
          )}

          {type === 'bar' &&
            data.map((d, i) => (
              <rect
                key={i}
                x={xFor(i) - barWidth / 2}
                y={yFor(d.value)}
                width={barWidth}
                height={Math.max(0, yFor(0) - yFor(d.value))}
                rx={3}
                fill={seriesColour}
                opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.5}
              />
            ))}

          {type === 'line' && data.length > 0 && (
            <>
              <path d={linePath} fill="none" stroke={seriesColour} strokeWidth={2} />
              {data.map((d, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(d.value)} r={hoverIndex === i ? 4 : 3} fill={seriesColour} />
              ))}
            </>
          )}

          {data.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={xFor(i) - slotWidth / 2}
              y={PADDING.top}
              width={slotWidth}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>
      )}

      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="pointer-events-none absolute rounded border border-border-warm bg-surface px-3 py-2 shadow-warm"
          style={{
            left: Math.min(Math.max(xFor(hoverIndex) - 40, 0), Math.max(size.width - 90, 0)),
            top: Math.max(yFor(data[hoverIndex].value) - 48, 0),
          }}
        >
          <p className="font-mono text-xs text-stone-muted">{data[hoverIndex].label}</p>
          <p className="font-body text-sm text-stone-ink">
            {data[hoverIndex].value}
            {valueSuffix}
          </p>
        </div>
      )}
    </div>
  )
}
