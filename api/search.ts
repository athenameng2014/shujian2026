import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    return res.status(204).end()
  }

  const keyword = req.query.keyword as string
  if (!keyword) return res.status(400).json({ error: 'Missing keyword' })

  try {
    const response = await fetch(
      `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://book.douban.com/',
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return res.status(502).json({ error: 'Douban search failed' })
    }

    const data = await response.json() as Array<Record<string, unknown>>
    const results = data
      .filter((item) => item.type === 'b' || item.type === 'book')
      .slice(0, 10)
      .map((item) => ({
        title: item.title as string,
        author: (item.author_name as string) || undefined,
        coverUrl: item.pic ? `/api/cover?url=${encodeURIComponent(item.pic as string)}` : undefined,
        year: (item.year as string) || undefined,
      }))

    res.setHeader('Cache-Control', 's-maxage=3600')
    res.status(200).json(results)
  } catch (err) {
    console.error('Douban search error:', err)
    res.status(500).json({ error: 'Search failed' })
  }
}
