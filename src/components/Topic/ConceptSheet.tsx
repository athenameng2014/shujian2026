import type { KnowledgeNode } from '../../types'

interface Props {
  open: boolean
  node: KnowledgeNode | null
  isLit: boolean
  color: string
  litByBook?: { title: string; color: string; coverUrl?: string } | null
  onClose: () => void
  onAddToWant?: (bookTitle: string) => void
}

export default function ConceptSheet({ open, node, isLit, color, litByBook, onClose, onAddToWant }: Props) {
  if (!open || !node) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 overflow-y-auto"
        style={{ maxHeight: '75dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: isLit ? color : '#d4d0cb' }}
          />
          <h3 className="text-lg font-semibold text-text">{node.name}</h3>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          {isLit ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: color + '14', color }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 0l1.76 3.58L12 4.16 8.88 7.1l.74 4.34L6 9.36 2.38 11.44l.74-4.34L0 4.16l4.24-.58z" />
              </svg>
              已点亮
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg text-[11px] font-medium text-text-secondary">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6" cy="6" r="4" />
                <path d="M6 4v4M4 6h4" />
              </svg>
              未探索
            </span>
          )}
        </div>

        {/* Description */}
        <div className="rounded-2xl bg-bg p-4 mb-5">
          <p className="text-sm text-text leading-relaxed">{node.description}</p>
        </div>

        {/* Lit state: show unlock info */}
        {isLit && litByBook && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border-l-[3px] mb-5"
            style={{ borderLeftColor: litByBook.color, backgroundColor: litByBook.color + '08' }}
          >
            {litByBook.coverUrl ? (
              <img src={litByBook.coverUrl} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <span
                className="w-8 h-11 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-medium"
                style={{ backgroundColor: litByBook.color }}
              >
                {litByBook.title[0]}
              </span>
            )}
            <div>
              <p className="text-xs text-text-secondary">你在阅读时解锁了此成就</p>
              <p className="text-sm font-medium text-text mt-0.5">{litByBook.title}</p>
            </div>
          </div>
        )}

        {/* Dim state: show recommendation */}
        {!isLit && node.recommendedBook && (
          <div className="mb-5">
            <p className="text-xs text-text-secondary mb-2.5">你尚未涉足此领域</p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg border border-border/60">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary mb-0.5">AI 推荐阅读</p>
                <p className="text-sm font-medium text-text truncate">{node.recommendedBook.title}</p>
                {node.recommendedBook.author && (
                  <p className="text-[11px] text-text-secondary truncate">{node.recommendedBook.author}</p>
                )}
              </div>
              <button
                onClick={() => onAddToWant?.(node.recommendedBook!.title)}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium text-white active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                加入想读
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
