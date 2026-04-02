// Inline types (cannot import from ../src in Vercel API bundler)
interface KnowledgeNode {
  id: string
  name: string
  description: string
  categoryIndex: number
  linkedBookIds: string[]
  recommendedBooks?: Array<{ title: string; author?: string }>
}
interface KnowledgeCategory {
  name: string
  color: string
  nodes: KnowledgeNode[]
}
interface StarMapData {
  topicName: string
  topicId: string
  categories: KnowledgeCategory[]
}

export const config = { runtime: 'edge' }

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const CATEGORY_COLORS = ['#3D7C98', '#E8654A', '#9B5DE5', '#5B9E6F', '#E5A93D']

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let body: { topicName?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { topicName, description } = body
  if (!topicName) {
    return new Response(JSON.stringify({ error: 'topicName is required' }), { status: 400 })
  }

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY not configured' }), { status: 500 })
  }

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

  // Use a streaming response to keep the connection alive (bypasses serverless function timeout)
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
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
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'LLM API call failed', detail: errText })))
          controller.close()
          return
        }

        const data = await response.json() as {
          choices?: Array<{
            message?: {
              content?: string
              reasoning_content?: string
            }
          }>
        }
        const content = data.choices?.[0]?.message?.content
        if (!content) {
          console.error('Empty content. Reasoning:', data.choices?.[0]?.message?.reasoning_content?.slice(0, 200))
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Empty LLM response' })))
          controller.close()
          return
        }

        // Parse the LLM JSON output
        let parsed: {
          topic: string
          sub_disciplines: Array<{
            id: string
            name: string
            nodes: Array<{
              id: string
              name: string
              description: string
              recommended_books?: Array<{ title: string; author?: string }>
            }>
          }>
        }
        try {
          parsed = JSON.parse(content)
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            controller.enqueue(encoder.encode(JSON.stringify({ error: 'Invalid JSON from LLM', raw: content })))
            controller.close()
            return
          }
          parsed = JSON.parse(jsonMatch[0])
        }

        // Transform to StarMapData
        const categories: KnowledgeCategory[] = (parsed.sub_disciplines ?? []).map((sub, i) => ({
          name: sub.name,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          nodes: (sub.nodes ?? []).map((node) => ({
            id: node.id,
            name: node.name,
            description: node.description,
            categoryIndex: i,
            linkedBookIds: [],
            recommendedBooks: node.recommended_books?.slice(0, 3) ?? [],
          })),
        }))

        const starMapData: StarMapData = {
          topicName: parsed.topic || topicName,
          topicId: `ai-${Date.now()}`,
          categories,
        }

        const totalNodes = categories.reduce((s, c) => s + c.nodes.length, 0)
        console.log(`Star map generated: ${categories.length} categories, ${totalNodes} total nodes`)

        controller.enqueue(encoder.encode(JSON.stringify({ starMapData })))
      } catch (err) {
        console.error('generate-star-map error:', err)
        controller.enqueue(encoder.encode(JSON.stringify({ error: 'Internal server error' })))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' },
  })
}
