// ── 书籍搜索服务：豆瓣搜索（通过代理） ──

export interface BookSearchResult {
  title: string
  author?: string
  coverUrl?: string
  year?: string
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(
      `/api/search?keyword=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return []

    return await res.json() as BookSearchResult[]
  } catch {
    return []
  }
}
