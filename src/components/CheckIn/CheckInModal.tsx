import { useLogStore } from '../../store'
import type { Log, Book } from '../../types'

interface Props {
  open: boolean
  date: string
  logs: Log[]
  books: Book[]
  onClose: () => void
  onAdd: (bookId: string) => void
  onRemove: (logId: string) => void
  onOpenBookSearch: () => void
}

export default function CheckInModal({ open, date, logs, books, onClose, onAdd, onRemove, onOpenBookSearch }: Props) {
  const bookIdsWithLogs = useLogStore((s) => s.bookIdsWithLogs)

  if (!open) return null

  const bookMap = new Map(books.map((b) => [b.id, b]))
  const dateLabel = formatLabel(date)

  // 已打卡的书不再出现在快速选择中
  const loggedBookIds = new Set(logs.map((l) => l.bookId))
  const quickPickBooks = books.filter((b) => !loggedBookIds.has(b.id) && bookIdsWithLogs.has(b.id))

  const handlePickBook = (bookId: string) => {
    onAdd(bookId)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 overflow-y-auto"
        style={{ maxHeight: '85dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        {/* Date header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-coral shadow-[0_0_6px_rgba(232,101,74,0.5)]" />
          <h3 className="text-lg font-semibold text-text">{dateLabel}</h3>
        </div>
        {logs.length > 0 && (
          <p className="text-xs text-text-secondary mb-4 ml-4">已记录 {logs.length} 本书</p>
        )}

        {/* Existing logs for this date */}
        {logs.length > 0 && (
          <div className="space-y-2 mb-5">
            {logs.map((log) => {
              const book = bookMap.get(log.bookId)
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg border-l-[3px]"
                  style={{ borderLeftColor: book?.color ?? '#ccc' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{book?.title ?? '未知书籍'}</p>
                    {log.note && <p className="text-xs text-text-secondary truncate mt-0.5">{log.note}</p>}
                  </div>
                  <button
                    onClick={() => onRemove(log.id)}
                    className="text-text-secondary/30 hover:text-red-400 text-lg leading-none transition-colors p-1"
                  >
                    &times;
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick pick from existing books — click to directly check in */}
        {quickPickBooks.length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-text-secondary mb-2 font-medium">快速选择</p>
            <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {quickPickBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => handlePickBook(book.id)}
                  className="flex-shrink-0 flex flex-col items-center active:scale-95 transition-transform"
                >
                  <div className="w-[72px] h-[100px] rounded-lg overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: book.color + '18' }}>
                        <span className="text-xl font-bold" style={{ color: book.color }}>{book.title[0]}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 w-[72px] text-xs font-medium text-text text-left leading-tight line-clamp-2">
                    {book.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state illustration + search button */}
        {logs.length === 0 && quickPickBooks.length === 0 && (
          <div className="flex flex-col items-center pt-4">
            {/* SVG Illustration: book + twinkling stars */}
            <div className="relative w-32 h-36 mb-6" style={{ animation: 'empty-float 3s ease-in-out infinite' }}>
              <svg viewBox="0 0 128 144" fill="none" className="w-full h-full">
                {/* Book body */}
                <rect x="28" y="24" width="72" height="96" rx="4" fill="#FDE8E3" />
                <rect x="32" y="24" width="8" height="96" fill="#E8654A" opacity="0.3" />
                <rect x="28" y="24" width="72" height="96" rx="4" stroke="#E8654A" strokeWidth="2" opacity="0.4" />
                {/* Page lines */}
                <line x1="48" y1="48" x2="84" y2="48" stroke="#E8654A" strokeWidth="1.5" opacity="0.2" />
                <line x1="48" y1="60" x2="80" y2="60" stroke="#E8654A" strokeWidth="1.5" opacity="0.2" />
                <line x1="48" y1="72" x2="76" y2="72" stroke="#E8654A" strokeWidth="1.5" opacity="0.2" />
                {/* Plus icon */}
                <circle cx="96" cy="104" r="12" fill="#E5A93D" opacity="0.15" />
                <line x1="96" y1="98" x2="96" y2="110" stroke="#E5A93D" strokeWidth="2" strokeLinecap="round" />
                <line x1="90" y1="104" x2="102" y2="104" stroke="#E5A93D" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {/* Twinkling stars */}
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sun"
                style={{ animation: 'empty-twinkle 2s ease-in-out infinite', animationDelay: '0s' }} />
              <div className="absolute top-8 left-0 w-1.5 h-1.5 rounded-full bg-coral"
                style={{ animation: 'empty-twinkle 2.4s ease-in-out infinite', animationDelay: '0.8s' }} />
              <div className="absolute bottom-12 right-0 w-1.5 h-1.5 rounded-full bg-berry"
                style={{ animation: 'empty-twinkle 2.8s ease-in-out infinite', animationDelay: '1.6s' }} />
            </div>

            {/* Emotional copy */}
            <p className="text-base text-text font-medium mb-1.5">今日暂无在读记录</p>
            <p className="text-xs text-text-secondary mb-6">每一本书的相遇，都值得被记住</p>

            {/* Search button */}
            <button
              onClick={onOpenBookSearch}
              className="w-full py-3 rounded-2xl text-white text-sm font-medium active:scale-95 transition-transform relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #E8654A, #E5A93D)',
                boxShadow: '0 4px 16px rgba(232,101,74,0.35)',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                搜索添加书籍
              </span>
            </button>
          </div>
        )}

        {/* Search button when quick picks exist but no logs */}
        {(logs.length === 0 && quickPickBooks.length > 0) && (
          <button
            onClick={onOpenBookSearch}
            className="w-full py-3 rounded-2xl text-white text-sm font-medium active:scale-95 transition-transform relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #E8654A, #E5A93D)',
              boxShadow: '0 4px 16px rgba(232,101,74,0.35)',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              搜索添加书籍
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function formatLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`
}
