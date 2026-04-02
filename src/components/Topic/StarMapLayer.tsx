import { useMemo } from 'react'
import type { KnowledgeCategory, KnowledgeNode } from '../../types'
import StarMapNode from './StarMapNode'

interface Props {
  category: KnowledgeCategory
  categoryIndex: number
  cx: number
  cy: number
  zoneRadius: number
  litNodeIds: Set<string>
  /** Map of nodeId → number of books contributing (for density ring) */
  nodeBookCountMap: Map<string, number>
  onNodeClick: (node: KnowledgeNode, isLit: boolean) => void
}

export default function StarMapLayer({
  category,
  cx,
  cy,
  zoneRadius,
  litNodeIds,
  nodeBookCountMap,
  onNodeClick,
}: Props) {
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

      {/* Nodes */}
      {nodes.map((node) => (
        <StarMapNode
          key={node.id}
          node={node}
          x={node.x}
          y={node.y}
          isLit={litNodeIds.has(node.id)}
          linkedBookCount={nodeBookCountMap.get(node.id) ?? 0}
          color={category.color}
          onClick={() => onNodeClick(node, litNodeIds.has(node.id))}
        />
      ))}
    </g>
  )
}
