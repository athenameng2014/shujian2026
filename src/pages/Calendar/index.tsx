import { useState, useEffect, useCallback, useMemo } from 'react'
import { useBookStore, useLogStore, useTopicStore } from '../../store'
import MonthView from '../../components/Calendar/MonthView'
import BookSearch from '../../components/Book/BookSearch'
import CheckInModal from '../../components/CheckIn/CheckInModal'
import type { Log, Book } from '../../types'

export default function CalendarPage() {
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.load)
  const removeBook = useBookStore((s) => s.removeBook)
  const { logs, loadMonth, addLog, removeLog, bookIdsWithLogs, refreshBookIdsWithLogs } = useLogStore()
  const { topics, removeBookFromTopic } = useTopicStore()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`

  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [showBookSearch, setShowBookSearch] = useState(false)

  useEffect(() => {
    loadBooks()
    loadMonth(yearMonth)
    refreshBookIdsWithLogs()
  }, [loadBooks, loadMonth, refreshBookIdsWithLogs, yearMonth])

  const dateLogs: Log[] = activeDate ? logs.filter((l) => l.date === activeDate) : []

  const handleDateClick = useCallback((date: string) => {
    setActiveDate(date)
  }, [])

  const handleAddBook = useCallback((bookId: string) => {
    if (!activeDate) return
    addLog({ bookId, date: activeDate }).then(() => loadMonth(yearMonth))
    setShowBookSearch(false)
  }, [activeDate, addLog, loadMonth, yearMonth])

  const handleRemoveLog = useCallback(async (logId: string) => {
    const log = logs.find((l) => l.id === logId)
    await removeLog(logId)
    await loadMonth(yearMonth)
    // 清理孤儿书：无打卡记录的书自动删除
    if (log && !bookIdsWithLogs.has(log.bookId)) {
      removeBook(log.bookId)
      topics.filter((t) => t.bookIds.includes(log.bookId)).forEach((t) => {
        removeBookFromTopic(t.id, log.bookId)
      })
    }
  }, [logs, removeLog, loadMonth, yearMonth, removeBook, topics, removeBookFromTopic, bookIdsWithLogs])

  const handleAddNote = useCallback((bookId: string, note?: string) => {
    if (!activeDate) return
    addLog({ bookId, date: activeDate, note }).then(() => loadMonth(yearMonth))
  }, [activeDate, addLog, loadMonth, yearMonth])

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1)
  }
  const goToday = () => {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  const handleOpenBookSearch = useCallback(() => {
    setShowBookSearch(true)
  }, [])

  // 本月书单列表（按打卡频次排序）
  const readingBooks = useMemo(() => {
    const countMap = new Map<string, number>()
    logs.forEach((l) => countMap.set(l.bookId, (countMap.get(l.bookId) ?? 0) + 1))
    const result: Array<{ book: Book; logCount: number }> = []
    countMap.forEach((logCount, bookId) => {
      const book = books.find((b) => b.id === bookId)
      if (book) result.push({ book, logCount })
    })
    return result.sort((a, b) => b.logCount - a.logCount)
  }, [logs, books])

  return (
    <div className="relative min-h-full">
      <div className="absolute top-0 left-0 right-0 h-48 blob-coral opacity-40 pointer-events-none" />

      <div className="relative px-5 pt-12 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text tracking-tight">日历</h1>
            <p className="text-xs text-text-secondary mt-0.5">记录每一天阅读</p>
          </div>
          <button
            onClick={goToday}
            className="text-xs text-coral font-semibold px-4 py-2 rounded-full bg-coral-light active:scale-95 transition-transform"
          >
            今天
          </button>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-sm active:scale-90 transition-transform">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <div className="text-center">
            <span className="text-lg font-semibold text-text">{monthNames[month]}</span>
            <span className="text-sm text-text-secondary ml-1.5">{year}</span>
          </div>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-sm active:scale-90 transition-transform">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-surface/70 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
          <MonthView
            year={year}
            month={month}
            logs={logs}
            books={books}
            onDateClick={handleDateClick}
          />
        </div>

        {/* 本月书单 */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-ocean" />
            <h2 className="text-sm font-semibold text-text">本月书单</h2>
            <span className="text-xs text-text-secondary ml-auto">{readingBooks.length} 本</span>
          </div>
          {readingBooks.length === 0 ? (
            <div className="text-center py-8 rounded-2xl bg-surface/50">
              <p className="text-sm text-text-secondary/60">本月还没有阅读记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readingBooks.map((item) => (
                <div
                  key={item.book.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface shadow-sm border-l-[3px]"
                  style={{ borderLeftColor: item.book.color }}
                >
                  {item.book.coverUrl ? (
                    <img src={item.book.coverUrl} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <span
                      className="w-8 h-11 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-medium"
                      style={{ backgroundColor: item.book.color }}
                    >
                      {item.book.title[0]}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{item.book.title}</p>
                    <p className="text-[11px] text-text-secondary">{item.logCount} 次打卡</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CheckIn Modal */}
      <CheckInModal
        open={!!activeDate}
        date={activeDate ?? ''}
        logs={dateLogs}
        books={books}
        onClose={() => { setActiveDate(null); setShowBookSearch(false) }}
        onAdd={handleAddNote}
        onRemove={handleRemoveLog}
        onOpenBookSearch={handleOpenBookSearch}
      />

      {/* Book Search (z-index higher than CheckInModal) */}
      <BookSearch
        open={showBookSearch}
        onClose={() => setShowBookSearch(false)}
        onBookSelect={handleAddBook}
      />

      {/* Floating check-in button */}
      <button
        onClick={() => { setActiveDate(todayStr); setShowBookSearch(true) }}
        className="fixed right-5 bottom-36 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform z-40 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #E8654A 0%, #E5A93D 100%)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
