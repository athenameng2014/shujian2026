import { useMemo } from 'react'
import type { KnowledgeCategory, KnowledgeNode } from '../../types'
import StarMapNode from './StarMapNode'
import StarMapBeam from './StarMapBeam'

interface Props {
  category: KnowledgeCategory
  categoryIndex: number
  /** Center of this zone in SVG coords */
  cx: number
  cy: number
  /** Radius of the dashed zone circle */
  zoneRadius: number
  litNodeIds: Set<string>
  /** Real book IDs present in this topic */
  topicBookIds: Set<string>
  /** Mock-to-real book ID resolution */
  mockBookMap: Map<string, string>
  /** Book covers for beam rendering */
  bookMeta: Map<string, { color: string; title: string }>
  onNodeClick: (node: KnowledgeNode, isLit: boolean) => void
}

export default function StarMapLayer({
  category,
  cx,
  cy,
  zoneRadius,
  litNodeIds,
  topicBookIds,
  mockBookMap,
  bookMeta,
  onNodeClick,
}: Props) {
  // Compute node positions evenly around the zone center
  const nodes = useMemo(() => {
    const nodeRadius = zoneRadius * 0.65
    return category.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / category.nodes.length - Math.PI / 2
      return {
        ...node,
        x: cx + nodeRadius * Math.cos(angle),
        y: cy + nodeRadius * Math.sin(angle),
      }
    })
  }, [category, cx, cy, zoneRadius])

  // Compute beams: for each lit node, draw beam from the book cover position
  const beams = useMemo(() => {
    const result: Array<{ key: string; fromX: number; fromY: number; toX: number; toY: number; color: string }> = []
    for (const node of nodes) {
      if (!litNodeIds.has(node.id)) continue
      // Find which real books light this node
      for (const mockId of node.bookIds) {
        const realBookId = mockBookMap.get(mockId)
        if (realBookId && topicBookIds.has(realBookId)) {
          const meta = bookMeta.get(realBookId)
          if (meta) {
            // Place book cover avatar at the zone boundary towards the node
            const dx = node.x - cx
            const dy = node.y - cy
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const bx = cx + (dx / dist) * (zoneRadius + 12)
            const by = cy + (dy / dist) * (zoneRadius + 12)
            result.push({
              key: `beam-${node.id}-${realBookId}`,
              fromX: bx,
              fromY: by,
              toX: node.x,
              toY: node.y,
              color: category.color,
            })
          }
        }
      }
    }
    return result
  }, [nodes, litNodeIds, mockBookMap, topicBookIds, bookMeta, cx, cy, zoneRadius, category.color])

  return (
    <g>
      {/* Zone dashed circle */}
      <circle
        cx={cx}
        cy={cy}
        r={zoneRadius}
        fill="none"
        stroke={category.color}
        strokeWidth={0.6}
        strokeOpacity={0.2}
        strokeDasharray="4 3"
      />

      {/* Zone label */}
      <text
        x={cx}
        y={cy - zoneRadius - 4}
        textAnchor="middle"
        fill={category.color}
        fontSize="5.5"
        fontFamily="system-ui"
        fontWeight={600}
        fillOpacity={0.7}
      >
        {category.name}
      </text>

      {/* Beams */}
      {beams.map((b) => (
        <StarMapBeam
          key={b.key}
          fromX={b.fromX}
          fromY={b.fromY}
          toX={b.toX}
          toY={b.toY}
          color={b.color}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <StarMapNode
          key={node.id}
          node={node}
          x={node.x}
          y={node.y}
          isLit={litNodeIds.has(node.id)}
          color={category.color}
          onClick={() => onNodeClick(node, litNodeIds.has(node.id))}
        />
      ))}
    </g>
  )
}
