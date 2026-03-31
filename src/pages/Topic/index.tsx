import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTopicStore, useBookStore } from '../../store'
import { getMockStarMapData } from '../../data/mockStarMap'
import TopicCard from '../../components/Topic/TopicCard'

export default function TopicPage() {
  const navigate = useNavigate()
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.load)
  const { topics, loadTopics, addTopic } = useTopicStore()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => { loadBooks(); loadTopics() }, [loadBooks, loadTopics])

  const handleCreate = async () => {
    if (!name.trim()) return
    await addTopic(name.trim(), desc.trim() || undefined)
    setName('')
    setDesc('')
    setShowCreate(false)
  }

  // Compute per-topic stats with mock star map data
  const topicStats = useMemo(() => {
    return topics.map((topic) => {
      const bookCount = topic.bookIds.length
      const doneCount = books.filter((b) => topic.bookIds.includes(b.id)).length

      const mapData = getMockStarMapData(topic.name)
      let litNodeCount = 0
      let totalNodeCount = 0
      let recentAchievement: string | undefined

      if (mapData) {
        const topicBookIds = new Set(topic.bookIds)
        totalNodeCount = mapData.categories.reduce((s, c) => s + c.nodes.length, 0)

        for (const cat of mapData.categories) {
          for (const node of cat.nodes) {
            // Check if any mock bookId resolves to a real book in this topic
            const isLit = node.bookIds.length > 0 && node.bookIds.some((mockId) => {
              // Simple mock resolution: check if any book in topic matches known mock titles
              return books.some((b) => topicBookIds.has(b.id) && mockBookMatches(mockId, b.title))
            })
            if (isLit) {
              litNodeCount++
              recentAchievement = node.name
            }
          }
        }
      }

      return { topic, bookCount, doneCount, litNodeCount, totalNodeCount, recentAchievement }
    })
  }, [topics, books])

  return (
    <div className="relative min-h-full">
      <div className="absolute top-0 left-0 right-0 h-48 blob-ocean opacity-40 pointer-events-none" />

      <div className="relative px-5 pt-12 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-ocean" />
              <h1 className="text-2xl font-semibold text-text tracking-tight">专题</h1>
            </div>
            <p className="text-xs text-text-secondary ml-4">把阅读串联成知识网络</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-white font-semibold px-4 py-2 rounded-full active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #3D7C98, #5BA3C4)' }}
          >
            + 新建
          </button>
        </div>

        {/* Topic list */}
        {topics.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-surface/50 mt-4">
            <p className="text-text-secondary text-sm">还没有专题</p>
            <p className="text-text-secondary/60 text-xs mt-1">点击右上角创建第一个专题</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topicStats.map(({ topic, bookCount, doneCount, litNodeCount, totalNodeCount, recentAchievement }, idx) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                bookCount={bookCount}
                doneCount={doneCount}
                litNodeCount={litNodeCount}
                totalNodeCount={totalNodeCount}
                recentAchievement={recentAchievement}
                colorIndex={idx}
                onClick={() => navigate(`/topic/${topic.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create topic modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 overflow-y-auto"
            style={{ maxHeight: '85dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <h3 className="text-lg font-semibold text-text mb-5">新建专题</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="专题名称，如「经济学入门」"
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border/60 text-sm text-text placeholder:text-text-secondary/50 outline-none focus:border-ocean/50 focus:ring-2 focus:ring-ocean/10 transition-all"
              />
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="简短描述（选填）"
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border/60 text-sm text-text placeholder:text-text-secondary/50 outline-none focus:border-ocean/50 focus:ring-2 focus:ring-ocean/10 transition-all"
              />
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="w-full py-3 rounded-2xl text-white text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #3D7C98, #5BA3C4)' }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Check if a mock book ID matches a real book title */
const MOCK_BOOK_TITLES: Record<string, string> = {
  'book-milk': '牛奶可乐经济学',
}

function mockBookMatches(mockId: string, bookTitle: string): boolean {
  const keyword = MOCK_BOOK_TITLES[mockId]
  return keyword ? bookTitle.includes(keyword) : false
}
