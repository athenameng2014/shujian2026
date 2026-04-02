import type { VercelRequest, VercelResponse } from '@vercel/node'

interface UnlitNode {
  id: string
  name: string
  description: string
}

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { bookTitle, bookAuthor, bookDescription, unlitNodes } = req.body as {
    bookTitle?: string
    bookAuthor?: string
    bookDescription?: string
    unlitNodes?: UnlitNode[]
  }

  if (!bookTitle || !unlitNodes?.length) {
    return res.status(400).json({ error: 'bookTitle and unlitNodes are required' })
  }

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ZHIPU_API_KEY not configured' })
  }

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
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('ZhiPu API error:', response.status, errText)
      return res.status(502).json({ error: 'LLM API call failed', detail: errText })
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return res.status(502).json({ error: 'Empty LLM response' })
    }

    // Parse the lit node IDs from LLM response
    let litNodeIds: string[]
    try {
      litNodeIds = JSON.parse(content)
    } catch {
      const match = content.match(/\[[\s\S]*\]/)
      if (!match) {
        return res.status(502).json({ error: 'Invalid JSON from LLM', raw: content })
      }
      litNodeIds = JSON.parse(match[0])
    }

    // Validate: ensure all IDs exist in unlitNodes
    const validIds = new Set(unlitNodes.map((n) => n.id))
    const filtered = (litNodeIds as string[]).filter((id: string) => validIds.has(id))

    return res.status(200).json({ litNodeIds: filtered })
  } catch (err) {
    console.error('map-book-nodes error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
