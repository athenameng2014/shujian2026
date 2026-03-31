import { useMemo } from 'react'
import type { Log, Book } from '../../types'

interface Props {
  year: number
  month: number
  logs: Log[]
  books: Book[]
  onDateClick: (date: string) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function MonthView({ year, month, logs, books, onDateClick }: Props) {
  const today = new Date()
  const todayStr = fmt(today)

  const bookMap = useMemo(() => {
    const m = new Map<string, Book>()
    books.forEach((b) => m.set(b.id, b))
    return m
  }, [books])

  const logsByDate = useMemo(() => {
    const m = new Map<string, Log[]>()
    logs.forEach((l) => {
      const arr = m.get(l.date) ?? []
      arr.push(l)
      m.set(l.date, arr)
    })
    return m
  }, [logs])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] text-text-secondary font-medium py-1.5">
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayLogs = logsByDate.get(dateStr) ?? []
          const isToday = dateStr === todayStr
          const isFuture = new Date(year, month, day) > today

          // First book color for background tint
          const firstBook = dayLogs.length > 0 ? bookMap.get(dayLogs[0].bookId) : null
          const hasLogs = dayLogs.length > 0

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && onDateClick(dateStr)}
              disabled={isFuture}
              className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5
                transition-all duration-200
                ${isFuture ? 'opacity-25 cursor-default' : 'cursor-pointer active:scale-90'}
                ${isToday && !hasLogs ? 'ring-2 ring-coral/30 bg-coral-light/30' : ''}
              `}
              style={hasLogs ? {
                backgroundColor: hexToRgba(firstBook?.color ?? '#ccc', 0.12),
              } : undefined}
            >
              <span className={`text-sm leading-none ${
                isToday ? 'font-bold text-coral' :
                hasLogs ? 'font-medium text-text' : 'text-text'
              }`}>
                {day}
              </span>
              {/* Color dots — always render spacer to keep alignment */}
              <div className="flex gap-[2px] mt-0.5 h-[7px] items-center">
                {dayLogs.slice(0, 4).map((log) => {
                  const book = bookMap.get(log.bookId)
                  return (
                    <span
                      key={log.id}
                      className="w-[5px] h-[5px] rounded-full"
                      style={{ backgroundColor: dayLogs.length > 0 ? (book?.color ?? '#ccc') : 'transparent' }}
                    />
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
