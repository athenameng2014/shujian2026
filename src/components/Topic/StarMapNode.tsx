import type { KnowledgeNode } from '../../types'

interface Props {
  node: KnowledgeNode
  x: number
  y: number
  isLit: boolean
  color: string
  onClick: () => void
}

export default function StarMapNode({ node, x, y, isLit, color, onClick }: Props) {
  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${node.name}${isLit ? ' 已点亮' : ' 未探索'}`}
    >
      {/* Glow halo for lit nodes */}
      {isLit && (
        <circle
          cx={x}
          cy={y}
          r={14}
          fill={color}
          fillOpacity={0.1}
          className="star-node-glow"
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={isLit ? 8 : 6}
        fill={isLit ? color : '#ebe8e3'}
        stroke={isLit ? color : '#d4d0cb'}
        strokeWidth={isLit ? 0.8 : 0.6}
        fillOpacity={isLit ? 1 : 0.45}
        className={isLit ? 'star-node-reveal' : ''}
        style={!isLit ? { animation: 'glow-breathe 4s ease-in-out infinite' } : undefined}
      />

      {/* Inner highlight dot for lit nodes */}
      {isLit && (
        <circle cx={x} cy={y} r={3} fill="white" fillOpacity={0.4} />
      )}

      {/* Label */}
      <text
        x={x}
        y={y + 16}
        textAnchor="middle"
        fill={isLit ? color : '#8a8680'}
        fontSize="4"
        fontFamily="system-ui"
        fontWeight={isLit ? 600 : 400}
        style={{ opacity: isLit ? 1 : 0.55 }}
      >
        {node.name.length > 5 ? node.name.slice(0, 5) + '…' : node.name}
      </text>
    </g>
  )
}
