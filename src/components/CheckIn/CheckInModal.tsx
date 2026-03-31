import { useState } from 'react'
import { useLogStore } from '../../store'
import type { Log, Book } from '../../types'

interface Props {
  open: boolean
  date: string
  logs: Log[]
  books: Book[]
  onClose: () => void
  onAdd: (bookId: string, note?: string) => void
  onRemove: (logId: string) => void
  onOpenBookSearch: () => void
}

export default function CheckInModal({ open, date, logs, books, onClose, onAdd, onRemove, onOpenBookSearch }: Props) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [pendingBookId, setPendingBookId] = useState<string | null>(null)
  const bookIdsWithLogs = useLogStore((s) => s.bookIdsWithLogs)

  if (!open) return null

  const bookMap = new Map(books.map((b) => [b.id, b]))
  const dateLabel = formatLabel(date)

  const handleConfirm = () => {
    if (pendingBookId) onAdd(pendingBookId, note.trim() || undefined)
    setNote('')
    setShowNote(false)
    setPendingBookId(null)
  }

  const handlePickBook = (bookId: string) => {
    setPendingBookId(bookId)
    setShowNote(true)
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
          <span className="w-2 h-2 rounded-full bg-coral" />
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

        {/* Quick pick from existing books */}
        {books.length > 0 && !showNote && (
          <div className="mb-5">
            <p className="text-xs text-text-secondary mb-2 font-medium">快速选择</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {books.filter((b) => !logs.some((l) => l.bookId === b.id) && bookIdsWithLogs.has(b.id)).map((book) => (
                <button
                  key={book.id}
                  onClick={() => handlePickBook(book.id)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl bg-bg border border-border/60 active:scale-95 transition-transform"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: book.color }} />
                  <span className="text-sm text-text max-w-[80px] truncate">{book.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add note before confirming */}
        {showNote && pendingBookId ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">记录一点随想（选填）</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今天读到了..."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl bg-bg border border-border/60 text-sm text-text placeholder:text-text-secondary/50 outline-none focus:border-berry/50 focus:ring-2 focus:ring-berry/10 resize-none transition-all"
            />
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-2xl text-white text-sm font-medium active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #9B5DE5, #C77DFF)' }}
            >
              完成
            </button>
          </div>
        ) : (
          /* Search for new books */
          <button
            onClick={onOpenBookSearch}
            className="w-full py-3 rounded-2xl text-white text-sm font-medium active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #E8654A, #E5A93D)' }}
          >
            搜索添加书籍
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
