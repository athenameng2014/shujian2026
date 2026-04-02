import { useState, useRef, useEffect, useCallback } from 'react'
import { searchBooks, type BookSearchResult } from '../../services/googleBooks'
import { useBookStore } from '../../store'

interface Props {
  open: boolean
  onClose: () => void
  onBookSelect: (bookId: string) => void
}

function BookPlaceholder({ letter, className = '' }: { letter: string; className?: string }) {
  return (
    <div className={`rounded-lg bg-coral-light flex items-center justify-center text-coral ${className}`}>
      <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="14" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" fontWeight="600">{letter}</text>
      </svg>
    </div>
  )
}

export default function BookSearch({ open, onClose, onBookSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [localCover, setLocalCover] = useState<Blob | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const addBook = useBookStore((s) => s.addBook)

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to let the sheet animation settle
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  const doSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const res = await searchBooks(query)
      setResults(res)
    } finally {
      setSearching(false)
    }
  }, [query])

  const handleCreateAndSelect = async (title: string, author?: string, coverUrl?: string, coverBlob?: Blob) => {
    // If coverUrl is from our proxy, fetch it as blob for persistent storage (data URL)
    let blob = coverBlob
    if (!blob && coverUrl) {
      try {
        const imgRes = await fetch(coverUrl)
        if (imgRes.ok) blob = await imgRes.blob()
      } catch { /* ignore */ }
    }
    const book = await addBook({ title, author, coverBlob: blob })
    onBookSelect(book.id)
    resetAndClose()
  }

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalCover(file)
    setLocalPreview(URL.createObjectURL(file))
  }

  const resetAndClose = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    setManualMode(false)
    setManualTitle('')
    setManualAuthor('')
    setLocalCover(null)
    setLocalPreview(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={resetAndClose} />
      <div
        className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-3 overflow-y-auto"
        style={{ maxHeight: '90dvh', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text mb-4">添加新书籍</h3>

        {/* Search input */}
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
            placeholder="输入书名后点击搜索"
            enterKeyHint="search"
            className="flex-1 px-4 py-2.5 rounded-2xl bg-bg border border-border/60 text-sm text-text placeholder:text-text-secondary/50 outline-none focus:border-coral/50 focus:ring-2 focus:ring-coral/10 transition-all"
          />
          <button
            onClick={doSearch}
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 rounded-2xl text-white text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8654A, #E5A93D)' }}
          >
            {searching ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : '搜索'}
          </button>
        </div>

        {/* Search results */}
        {searched && !searching && results.length === 0 && (
          <div className="text-center py-4 mb-3">
            <p className="text-sm text-text-secondary">未找到相关书籍</p>
            <p className="text-xs text-text-secondary/50 mt-1">试试手动输入</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {results.map((r, i) => (
              <button
                key={`google-${i}`}
                onClick={() => handleCreateAndSelect(r.title, r.author, r.coverUrl)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl active:bg-bg active:scale-[0.98] transition-all text-left"
              >
                {r.coverUrl ? (
                  <img src={r.coverUrl} alt="" className="w-10 h-14 object-cover rounded-lg" />
                ) : (
                  <BookPlaceholder letter={r.title[0]} className="w-10 h-14 text-sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate font-medium">{r.title}</p>
                  {r.author && <p className="text-xs text-text-secondary truncate">{r.author}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-text-secondary">或</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Manual entry */}
        {!manualMode ? (
          <button
            onClick={() => setManualMode(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-coral/25 text-sm text-coral font-medium active:scale-[0.98] transition-transform"
          >
            手动输入书名 + 本地上传封面
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="输入书名"
              className="w-full px-4 py-2.5 rounded-2xl bg-bg border border-border/60 text-sm text-text placeholder:text-text-secondary/50 outline-none focus:border-coral/50 focus:ring-2 focus:ring-coral/10 transition-all"
            />
            <input
              type="text"
              value={manualAuthor}
              onChange={(e) => setManualAuthor(e.target.value)}
              placeholder="输入作者（选填）"
              className="w-full px-4 py-2.5 rounded-2xl bg-bg border border-border/60 text-sm text-text placeholder:text-text-secondary/50 outline-none focus:border-coral/50 focus:ring-2 focus:ring-coral/10 transition-all"
            />
            <div className="flex gap-3 items-center">
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-2xl border border-border/60 text-sm text-text-secondary active:scale-95 transition-transform"
              >
                上传封面
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLocalFile} />
              {localPreview ? (
                <img src={localPreview} alt="" className="w-10 h-14 object-cover rounded-lg" />
              ) : (
                <BookPlaceholder letter="?" className="w-10 h-14 text-sm" />
              )}
            </div>
            <button
              onClick={() => handleCreateAndSelect(manualTitle, manualAuthor.trim() || undefined, undefined, localCover ?? undefined)}
              disabled={!manualTitle.trim()}
              className="w-full py-3 rounded-2xl text-white text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #E8654A, #E5A93D)' }}
            >
              确认添加
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
