import type { Topic } from '../../types'

const CARD_COLORS = [
  { dot: '#3D7C98', light: '#E1EFF5', gradient: 'linear-gradient(135deg, #E1EFF5 0%, transparent 60%)' },
  { dot: '#E8654A', light: '#FDE8E3', gradient: 'linear-gradient(135deg, #FDE8E3 0%, transparent 60%)' },
  { dot: '#5B9E6F', light: '#E3F2E8', gradient: 'linear-gradient(135deg, #E3F2E8 0%, transparent 60%)' },
  { dot: '#E5A93D', light: '#FDF3E0', gradient: 'linear-gradient(135deg, #FDF3E0 0%, transparent 60%)' },
  { dot: '#9B5DE5', light: '#F0E6FD', gradient: 'linear-gradient(135deg, #F0E6FD 0%, transparent 60%)' },
]

interface Props {
  topic: Topic
  bookCount: number
  doneCount: number
  litNodeCount: number
  totalNodeCount: number
  recentAchievement?: string
  colorIndex: number
  onClick: () => void
}

// Tiny star field decoration for card background
function StarDots({ color }: { color: string }) {
  const dots = [
    { x: '85%', y: '20%', r: 1.2, o: 0.15 },
    { x: '92%', y: '45%', r: 0.8, o: 0.10 },
    { x: '78%', y: '65%', r: 1, o: 0.12 },
    { x: '95%', y: '75%', r: 0.6, o: 0.08 },
    { x: '88%', y: '85%', r: 0.9, o: 0.10 },
  ]
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} fillOpacity={d.o} />
      ))}
    </svg>
  )
}

export default function TopicCard({
  topic,
  bookCount,
  doneCount,
  litNodeCount,
  totalNodeCount,
  recentAchievement,
  colorIndex,
  onClick,
}: Props) {
  const palette = CARD_COLORS[colorIndex % CARD_COLORS.length]
  const progressPct = totalNodeCount > 0 ? Math.round((litNodeCount / totalNodeCount) * 100) : 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl border active:scale-[0.98] transition-transform relative overflow-hidden"
      style={{
        background: palette.gradient,
        borderColor: palette.dot + '20',
      }}
    >
      <StarDots color={palette.dot} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.dot }} />
              <h3 className="text-base font-semibold text-text">{topic.name}</h3>
            </div>
            {topic.description && (
              <p className="text-xs text-text-secondary mt-1 ml-4 line-clamp-1">{topic.description}</p>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary mt-1 flex-shrink-0">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </div>

        {/* Progress bar */}
        <div className="mt-3 ml-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-secondary">探索度</span>
            <span className="text-[10px] font-semibold" style={{ color: palette.dot }}>{progressPct}%</span>
          </div>
          <div className="h-[3px] rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${palette.dot}, ${palette.dot}aa)`,
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2.5 ml-4 flex-wrap">
          <span className="text-[11px] text-text-secondary">{bookCount} 本书</span>
          {doneCount > 0 && (
            <span className="text-[11px] text-sage font-medium">{doneCount} 本已读</span>
          )}
          {totalNodeCount > 0 && (
            <span className="text-[11px]" style={{ color: palette.dot }}>
              点亮 {litNodeCount}/{totalNodeCount} 知识点
            </span>
          )}
        </div>

        {/* Recent achievement */}
        {recentAchievement && (
          <div className="flex items-center gap-1.5 mt-2 ml-4">
            <svg width="10" height="10" viewBox="0 0 12 12" fill={palette.dot} fillOpacity={0.7}>
              <path d="M6 0l1.76 3.58L12 4.16 8.88 7.1l.74 4.34L6 9.36 2.38 11.44l.74-4.34L0 4.16l4.24-.58z" />
            </svg>
            <span className="text-[10px] text-text-secondary">
              最近解锁：<span className="font-medium" style={{ color: palette.dot }}>{recentAchievement}</span>
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
