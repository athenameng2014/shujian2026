// ── 书籍搜索服务：Open Library 主源 + Google Books 备用 ──

export interface BookSearchResult {
  title: string
  author?: string
  coverUrl?: string
  source: 'openlibrary' | 'google'
}

// ── Open Library API（免费、无限额）──

function parseOpenLibrary(doc: Record<string, unknown>): BookSearchResult | null {
  const title = typeof doc['title'] === 'string' ? (doc['title'] as string).trim() : ''
  if (!title) return null

  const authorStr = doc['author_name']
  let author: string | undefined
  if (Array.isArray(authorStr) && typeof authorStr[0] === 'string') {
    author = authorStr[0].trim()
  } else if (typeof authorStr === 'string') {
    author = authorStr.trim()
  }

  const coverId = doc['cover_i']
  const coverUrl = typeof coverId === 'number'
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
    : undefined

  return { title, author, coverUrl, source: 'openlibrary' }
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?` + new URLSearchParams({
      q: query,
      limit: '6',
      fields: 'title,author_name,cover_i',
    })

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []

    const data = await res.json()
    if (!data || !Array.isArray(data.docs)) return []

    return data.docs
      .map((d: unknown) => parseOpenLibrary(d as Record<string, unknown>))
      .filter((r: BookSearchResult | null): r is BookSearchResult => r !== null)
  } catch {
    return []
  }
}

// ── Google Books API（备用）──

function parseGoogleVolume(item: unknown): BookSearchResult | null {
  if (!item || typeof item !== 'object') return null
  const vol = (item as Record<string, unknown>)['volumeInfo']
  if (!vol || typeof vol !== 'object') return null
  const info = vol as Record<string, unknown>

  const title = typeof info['title'] === 'string' ? info['title'].trim() : ''
  if (!title) return null

  const authors = info['authors']
  const author = Array.isArray(authors) && typeof authors[0] === 'string' ? authors[0].trim() : undefined

  const imgLinks = info['imageLinks']
  let coverUrl: string | undefined
  if (imgLinks && typeof imgLinks === 'object') {
    const links = imgLinks as Record<string, unknown>
    const raw = typeof links['thumbnail'] === 'string'
      ? links['thumbnail']
      : typeof links['smallThumbnail'] === 'string'
        ? links['smallThumbnail']
        : undefined
    coverUrl = raw ? raw.replace(/^http:\/\//i, 'https://') : undefined
  }

  return { title, author, coverUrl, source: 'google' }
}

async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?` + new URLSearchParams({
      q: query,
      maxResults: '6',
    })

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []

    const data = await res.json()
    if (!data || !Array.isArray(data.items)) return []

    return data.items
      .map((item: unknown) => parseGoogleVolume(item))
      .filter((r: BookSearchResult | null): r is BookSearchResult => r !== null)
  } catch {
    return []
  }
}

// ── 统一搜索：Open Library 优先，结果不够再补 Google Books ──

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return []

  // 先搜 Open Library
  const olResults = await searchOpenLibrary(query)
  if (olResults.length >= 3) return olResults

  // 结果不够，补充 Google Books（去重）
  const gbResults = await searchGoogleBooks(query)
  const seen = new Set(olResults.map((r) => r.title.toLowerCase()))
  const extra = gbResults.filter((r) => !seen.has(r.title.toLowerCase()))

  return [...olResults, ...extra].slice(0, 8)
}
