import type { KnowledgeNode } from '../../types'

interface LinkedBook {
  title: string
  color: string
  coverUrl?: string
}

interface Props {
  open: boolean
  node: KnowledgeNode | null
  isLit: boolean
  color: string
  linkedBooks: LinkedBook[]
  onClose: () => void
}

export default function ConceptSheet({ open, node, isLit, color, linkedBooks, onClose }: Props) {
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

        {/* Lit state: show all linked books */}
        {isLit && linkedBooks.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-medium text-text-secondary mb-2.5">构筑此基石的阅读</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {linkedBooks.map((book, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-bg"
                >
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-7 h-10 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <span
                      className="w-7 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-medium"
                      style={{ backgroundColor: book.color }}
                    >
                      {book.title[0]}
                    </span>
                  )}
                  <span className="text-xs font-medium text-text max-w-[72px] truncate">{book.title}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              是这 {linkedBooks.length} 本书帮你点亮了这个概念
            </p>
          </div>
        )}

        {/* Dim state: show AI recommendations */}
        {!isLit && node.recommendedBooks && node.recommendedBooks.length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-text-secondary mb-2.5">AI 推荐入门书单</p>
            <div className="space-y-2">
              {node.recommendedBooks.map((book, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg border border-border/40">
                  <div
                    className="w-10 h-[54px] rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: color + '14' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill={color + '20'} stroke={color} strokeWidth="1.5" />
                      <line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="8" y1="10.5" x2="14" y2="10.5" stroke={color + '60'} strokeWidth="1" strokeLinecap="round" />
                      <line x1="8" y1="14" x2="12" y2="14" stroke={color + '40'} strokeWidth="1" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text leading-snug">{book.title}</p>
                    {book.author && <p className="text-[11px] text-text-secondary mt-0.5">{book.author}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
