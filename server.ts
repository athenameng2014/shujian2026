/**
 * Local development API server
 * Mirrors the Vercel Serverless Functions for local use with `npm run dev`
 */
import express from 'express'
import dotenv from 'dotenv'
import { Agent, setGlobalDispatcher } from 'undici'

// Set a custom undici dispatcher with very long timeouts for slow AI responses (glm-4.7 thinking model)
setGlobalDispatcher(new Agent({
  headersTimeout: 600_000, // 10 minutes to receive headers
  bodyTimeout: 600_000,    // 10 minutes to receive full body
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
}))

// Load .env.local
dotenv.config({ path: '.env.local' })

const app = express()
app.use(express.json())

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const CATEGORY_COLORS = ['#3D7C98', '#E8654A', '#9B5DE5', '#5B9E6F', '#E5A93D']

// ── Phase 1: Generate Star Map ──

app.post('/api/generate-star-map', async (req, res) => {
  const { topicName, description } = req.body as { topicName: string; description?: string }
  if (!topicName) return res.status(400).json({ error: 'topicName is required' })

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ZHIPU_API_KEY not configured' })

  const prompt = `角色设定：
你是一位渊博且严谨的知识架构师，正在为一个阅读类应用构建「知识星图」——一个将学习路径可视化的专题导航系统。

用户输入目标专题：【${topicName}】${description ? `\n专题描述：${description}` : ''}

任务要求：
1. 将该专题拆解为 3 到 4 个「子领域」(sub_disciplines)，每个子领域代表该专题的核心方向。
2. 为每个子领域提炼约 8 到 10 个「基石知识点」(nodes)。这些节点必须是该子领域中最重要的核心概念、关键理论或基础能力，不能是边缘或冷门知识点。节点命名应精炼（2-6 个字）。
3. 为每个「基石知识点」撰写一段概要（description），80 到 150 字。要求：
   - 必须言之有物：说明这个概念「是什么」「为什么重要」「它解决什么问题或带来什么洞见」
   - 避免空泛的修辞和正确的废话，要有具体的信息量和知识含量
   - 语言风格：简洁清晰、有思想深度，像一位好老师给认真学生的精要讲解
4. 为每个「基石知识点」推荐 2 到 3 本该领域最经典、最值得阅读的书籍（recommended_books）。每本书需要标题（title）和作者（author）。

强制输出格式：
你必须且只能输出合法的 JSON 格式数据，不需要任何开头或结尾的寒暄（不需要代码块标记）。JSON 结构必须严格如下：

{
  "topic": "${topicName}",
  "sub_disciplines": [
    {
      "id": "sub_1",
      "name": "子领域名称",
      "nodes": [
        {
          "id": "node_1_1",
          "name": "知识点名称",
          "description": "一段 80-150 字的实质概要。",
          "recommended_books": [
            {"title": "书名", "author": "作者"},
            {"title": "书名", "author": "作者"}
          ]
        }
      ]
    }
  ]
}`

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 32768,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('ZhiPu API error:', response.status, errText)
      return res.status(502).json({ error: 'LLM API call failed', detail: errText })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      console.error('Empty content. Reasoning:', data.choices?.[0]?.message?.reasoning_content?.slice(0, 200))
      return res.status(502).json({ error: 'Empty LLM response' })
    }

    let parsed: { topic: string; sub_disciplines: Array<{ id: string; name: string; nodes: Array<{ id: string; name: string; description: string; recommended_books?: Array<{ title: string; author?: string }> }> }> }
    try {
      parsed = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return res.status(502).json({ error: 'Invalid JSON from LLM', raw: content })
      parsed = JSON.parse(jsonMatch[0])
    }

    const categories = (parsed.sub_disciplines ?? []).map((sub, i) => ({
      name: sub.name,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      nodes: (sub.nodes ?? []).map((node, j) => ({
        id: node.id,
        name: node.name,
        description: node.description,
        categoryIndex: i,
        linkedBookIds: [],
        recommendedBooks: node.recommended_books?.slice(0, 3) ?? [],
      })),
    }))

    const totalNodes = categories.reduce((s, c) => s + c.nodes.length, 0)
    console.log(`Star map generated: ${categories.length} categories, ${totalNodes} total nodes`)

    const starMapData = {
      topicName: parsed.topic || topicName,
      topicId: `ai-${Date.now()}`,
      categories,
    }

    res.json({ starMapData })
  } catch (err) {
    console.error('generate-star-map error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── Book Search (Douban) ──

app.get('/api/search', async (req, res) => {
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

    if (!response.ok) return res.status(502).json({ error: 'Douban search failed' })

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

    res.json(results)
  } catch (err) {
    console.error('Douban search error:', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

app.get('/api/cover', async (req, res) => {
  const url = req.query.url as string
  if (!url) return res.status(400).json({ error: 'Missing url' })

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://book.douban.com/',
      },
    })

    if (!response.ok) return res.status(502).json({ error: 'Cover fetch failed' })

    if (!response.ok) return res.status(502).json({ error: 'Cover fetch failed' })

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('Cover proxy error:', err)
    res.status(500).json({ error: 'Cover fetch failed' })
  }
})

// ── Phase 2: Map Book to Nodes ──

app.post('/api/map-book-nodes', async (req, res) => {
  const { bookTitle, bookAuthor, bookDescription, unlitNodes } = req.body as {
    bookTitle: string
    bookAuthor?: string
    bookDescription?: string
    unlitNodes: Array<{ id: string; name: string; description: string }>
  }

  if (!bookTitle || !unlitNodes?.length) {
    return res.status(400).json({ error: 'bookTitle and unlitNodes are required' })
  }

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ZHIPU_API_KEY not configured' })

  const nodesJson = JSON.stringify(unlitNodes, null, 2)

  const prompt = `角色设定：
你是一个知识提炼工程师。你需要判断一本特定书籍的内核理念，是否覆盖了某个"知识星图"中的既定节点。

输入数据：
1. 待录入书籍标题：【${bookTitle}】${bookAuthor ? `\n   作者：${bookAuthor}` : ''}
${bookDescription ? `2. 书籍摘要/梗概：${bookDescription}` : '2. 书籍摘要：无（请根据你的背景知识判断该书籍的核心内容）'}
3. 当前星图待点亮节点列表 JSON：
${nodesJson}

任务要求：
1. 分析书籍的核心主旨，提取它能显著解答、印证或探讨的理念。
2. 从"星图待点亮节点列表"中，找出哪些节点与该书籍主旨有着高度的相关性。
3. 门槛宁缺毋滥，如果相关性弱于 60%，请不要将节点算在内。一本书最多能点亮 4 个核心节点。
4. 如果没有符合条件的节点，返回空数组。

强制输出格式：
严格以合法的 JSON 数组输出被点亮节点的 id，不需要任何其他文字（不需要代码块标记）：

["node_x_y", "node_z_w"]`

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 16384,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('ZhiPu API error:', response.status, errText)
      return res.status(502).json({ error: 'LLM API call failed', detail: errText })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) return res.status(502).json({ error: 'Empty LLM response' })

    let litNodeIds: string[]
    try {
      litNodeIds = JSON.parse(content)
    } catch {
      const match = content.match(/\[[\s\S]*\]/)
      if (!match) return res.status(502).json({ error: 'Invalid JSON from LLM', raw: content })
      litNodeIds = JSON.parse(match[0])
    }

    const validIds = new Set(unlitNodes.map((n) => n.id))
    const filtered = litNodeIds.filter((id: string) => validIds.has(id))

    res.json({ litNodeIds: filtered })
  } catch (err) {
    console.error('map-book-nodes error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`📡 Local API server running at http://localhost:${PORT}`)
})
