import { useMemo } from 'react'
import type { StarMapData, KnowledgeNode } from '../../types'
import StarMapLayer from './StarMapLayer'
import { usePanZoom } from './usePanZoom'

interface Props {
  data: StarMapData
  litNodeIds: Set<string>
  topicColor: string
  nodeBookCountMap: Map<string, number>
  onNodeClick: (node: KnowledgeNode, isLit: boolean) => void
}

export default function StarMap({ data, litNodeIds, topicColor, nodeBookCountMap, onNodeClick }: Props) {
  const { containerRef, style, reset, transform } = usePanZoom()

  // Layout: category zones evenly spaced around center
  const zoneLayout = useMemo(() => {
    const cx = 200, cy = 200, r = 120
    return data.categories.map((cat, i) => {
      const angle = (2 * Math.PI * i) / data.categories.length - Math.PI / 2
      return { category: cat, index: i, cx: cx + r * Math.cos(angle), cy: cy + r * Math.sin(angle), zoneRadius: 55 }
    })
  }, [data.categories])

  const totalNodes = data.categories.reduce((s, c) => s + c.nodes.length, 0)
  const progressPct = totalNodes > 0 ? Math.round((litNodeIds.size / totalNodes) * 100) : 0

  const svgContent = (
    <>
      <defs>
        <radialGradient id="center-glow">
          <stop offset="0%" stopColor={topicColor} stopOpacity={0.08} />
          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={200} cy={200} r={180} fill="url(#center-glow)" />

      {STAR_FIELD.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#8a8680" fillOpacity={s.o} />
      ))}

      {zoneLayout.map((z) => (
        <line key={`cl-${z.index}`} x1={200} y1={200} x2={z.cx} y2={z.cy}
          stroke={z.category.color} strokeWidth={0.4} strokeOpacity={0.12} />
      ))}

      {zoneLayout.map((z) => (
        <StarMapLayer key={z.category.name} category={z.category} categoryIndex={z.index}
          cx={z.cx} cy={z.cy} zoneRadius={z.zoneRadius} litNodeIds={litNodeIds}
          nodeBookCountMap={nodeBookCountMap} onNodeClick={onNodeClick} />
      ))}

      <circle cx={200} cy={200} r={18} fill="white" fillOpacity={0.85} />
      <circle cx={200} cy={200} r={18} fill="none" stroke={topicColor} strokeWidth={0.8} strokeOpacity={0.25} />
      <text x={200} y={200} textAnchor="middle" dominantBaseline="central" fill="#2c2a28" fontSize="7" fontFamily="system-ui" fontWeight={700}>
        {data.topicName.length > 6 ? data.topicName.slice(0, 6) + '…' : data.topicName}
      </text>
    </>
  )

  const isZoomed = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1

  return (
    <div className="relative">
      {/* Progress badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/80 backdrop-blur-sm shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topicColor }} />
        <span className="text-[10px] text-text-secondary">探索度</span>
        <span className="text-[10px] font-semibold" style={{ color: topicColor }}>{progressPct}%</span>
      </div>

      {/* Reset button — only visible when zoomed */}
      {isZoomed && (
        <button
          onClick={reset}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-text-secondary active:scale-90 transition-transform"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" />
            <path d="M2 3v5h5M14 13V8H9" />
          </svg>
        </button>
      )}

      {/* Star map container — touch-action: pan-y lets single-finger scroll the page */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl bg-bg/50 border border-border/30"
        style={{ aspectRatio: '1 / 1', touchAction: 'pan-y' }}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full select-none">
          <g style={style}>
            {svgContent}
          </g>
        </svg>
      </div>
    </div>
  )
}

const STAR_FIELD = [
  { x: 30, y: 50, r: 0.6, o: 0.12 },
  { x: 370, y: 80, r: 0.5, o: 0.10 },
  { x: 60, y: 350, r: 0.7, o: 0.08 },
  { x: 350, y: 330, r: 0.5, o: 0.12 },
  { x: 180, y: 30, r: 0.6, o: 0.10 },
  { x: 220, y: 370, r: 0.5, o: 0.08 },
  { x: 50, y: 180, r: 0.4, o: 0.06 },
  { x: 370, y: 200, r: 0.6, o: 0.10 },
  { x: 100, y: 100, r: 0.5, o: 0.08 },
  { x: 300, y: 300, r: 0.4, o: 0.06 },
  { x: 80, y: 270, r: 0.5, o: 0.10 },
  { x: 320, y: 120, r: 0.6, o: 0.08 },
  { x: 150, y: 50, r: 0.3, o: 0.05 },
  { x: 250, y: 360, r: 0.4, o: 0.07 },
  { x: 40, y: 300, r: 0.3, o: 0.05 },
]
