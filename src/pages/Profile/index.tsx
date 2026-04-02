import { useState, useEffect, useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import { useBookStore, useLogStore } from '../../store'

export default function ProfilePage() {
  const today = new Date()
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.load)
  const { allLogs, loadAllLogs, bookIdsWithLogs, refreshBookIdsWithLogs } = useLogStore()
  const [showPersonality, setShowPersonality] = useState(false)
  const [sharing, setSharing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadBooks()
    loadAllLogs()
    refreshBookIdsWithLogs()
  }, [loadBooks, loadAllLogs, refreshBookIdsWithLogs])

  // 过滤：只展示有打卡记录的书
  const activeBooks = useMemo(
    () => books.filter((b) => bookIdsWithLogs.has(b.id)),
    [books, bookIdsWithLogs]
  )

  // Stats — use allLogs for cumulative totals
  const totalBooks = activeBooks.length
  const totalLogs = allLogs.length
  const uniqueDays = new Set(allLogs.map((l) => l.date)).size

  // Top books by log count
  const topBooks = useMemo(() => {
    const countMap = new Map<string, number>()
    allLogs.forEach((l) => countMap.set(l.bookId, (countMap.get(l.bookId) ?? 0) + 1))
    return activeBooks
      .map((b) => ({ ...b, logCount: countMap.get(b.id) ?? 0 }))
      .filter((b) => b.logCount > 0)
      .sort((a, b) => b.logCount - a.logCount)
      .slice(0, 3)
  }, [activeBooks, allLogs])

  // Color distribution
  const colorStats = useMemo(() => {
    return activeBooks.slice(0, 8).map((b) => b.color)
  }, [activeBooks])

  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `书间-阅读人格-${today.getFullYear()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="relative min-h-full">
      <div className="absolute top-0 left-0 right-0 h-48 blob-sage opacity-40 pointer-events-none" />

      <div className="relative px-5 pt-12 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-sage" />
          <h1 className="text-2xl font-semibold text-text tracking-tight">我的</h1>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-coral">{totalBooks}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">本书籍</p>
          </div>
          <div className="bg-surface rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-ocean">{totalLogs}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">次打卡</p>
          </div>
          <div className="bg-surface rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-sage">{uniqueDays}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">天阅读</p>
          </div>
        </div>

        {/* Personality card entry */}
        <button
          onClick={() => setShowPersonality(true)}
          className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-coral-light via-ocean-light to-berry-light border border-border/40 active:scale-[0.98] transition-transform mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text">阅读人格图谱</h3>
              <p className="text-xs text-text-secondary mt-0.5">看看你的阅读形塑了怎样的你</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </div>
          {/* Mini color dots */}
          {colorStats.length > 0 && (
            <div className="flex gap-1.5 mt-3">
              {colorStats.map((c, i) => (
                <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </button>

        {/* Book library */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text">书籍库</h2>
          <span className="text-xs text-text-secondary">{totalBooks} 本</span>
        </div>
        {activeBooks.length === 0 ? (
          <div className="text-center py-8 rounded-2xl bg-surface/50">
            <p className="text-text-secondary/60 text-sm">还没有添加书籍</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {activeBooks.map((book) => (
              <div key={book.id} className="bg-surface rounded-2xl p-3 shadow-sm">
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 flex items-center justify-center" style={{ backgroundColor: book.color + '18' }}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: book.color }}>{book.title[0]}</span>
                  )}
                </div>
                <p className="text-xs font-medium text-text truncate">{book.title}</p>
                {book.author && <p className="text-[10px] text-text-secondary truncate">{book.author}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personality card modal */}
      {showPersonality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPersonality(false)} />

          {/* The card itself */}
          <div ref={cardRef} className="relative w-full max-w-sm bg-surface rounded-3xl p-6 shadow-xl">
            {/* Decorative header gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 rounded-t-3xl opacity-60" style={{ background: 'linear-gradient(135deg, #FDE8E3, #E1EFF5, #F0E6FD)' }} />

            <div className="relative">
              <h2 className="text-lg font-bold text-text mb-1">我的阅读人格</h2>
              <p className="text-xs text-text-secondary mb-5">书间 · {today.getFullYear()}</p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-coral-light rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-coral">{totalBooks}</p>
                  <p className="text-[10px] text-coral/70">本书籍</p>
                </div>
                <div className="bg-ocean-light rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-ocean">{totalLogs}</p>
                  <p className="text-[10px] text-ocean/70">次打卡</p>
                </div>
                <div className="bg-sage-light rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-sage">{uniqueDays}</p>
                  <p className="text-[10px] text-sage/70">天阅读</p>
                </div>
              </div>

              {/* Color spectrum */}
              {colorStats.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] text-text-secondary mb-2 font-medium">我的阅读色彩</p>
                  <div className="flex gap-1.5 h-4 rounded-xl overflow-hidden">
                    {colorStats.map((c, i) => (
                      <div key={i} className="flex-1 rounded-lg" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top books */}
              {topBooks.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] text-text-secondary mb-2 font-medium">最常阅读</p>
                  <div className="space-y-1.5">
                    {topBooks.map((book, i) => (
                      <div key={book.id} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-secondary w-4">{i + 1}</span>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: book.color }} />
                        <span className="text-sm text-text truncate flex-1">{book.title}{book.author ? <span className="text-text-secondary"> · {book.author}</span> : ''}</span>
                        <span className="text-[11px] text-text-secondary">{book.logCount}次</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tagline */}
              <p className="text-center text-xs text-text-secondary italic">
                你的阅读形塑了你
              </p>
            </div>

            {/* Action buttons (outside card ref so they don't appear in screenshot) */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPersonality(false)}
                className="flex-1 py-2.5 rounded-2xl border border-border/60 text-sm text-text-secondary active:scale-95 transition-transform"
              >
                关闭
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 py-2.5 rounded-2xl text-white text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #E8654A, #E5A93D)' }}
              >
                {sharing ? '生成中...' : '保存图片'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
