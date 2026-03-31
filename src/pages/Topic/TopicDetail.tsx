import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTopicStore, useBookStore } from '../../store'
import type { BookStatus, KnowledgeNode } from '../../types'
import { getMockStarMapData, resolveMockBookIds } from '../../data/mockStarMap'
import StarMap from '../../components/Topic/StarMap'
import ConceptSheet from '../../components/Topic/ConceptSheet'

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.load)
  const { topics, topicBooks, loadTopics, loadTopicBooks, addBookToTopic, removeBookFromTopic, removeTopic } = useTopicStore()
  const [showAddBook, setShowAddBook] = useState(false)
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [selectedNodeIsLit, setSelectedNodeIsLit] = useState(false)

  useEffect(() => {
    loadBooks()
    loadTopics()
    if (id) loadTopicBooks(id)
  }, [id, loadBooks, loadTopics, loadTopicBooks])

  const topic = topics.find((t) => t.id === id)

  const booksInTopic = useMemo(() => {
    if (!topic) return []
    return topic.bookIds
      .map((bid) => {
        const book = books.find((b) => b.id === bid)
        const tb = topicBooks.find((t) => t.bookId === bid)
        return book ? { ...book, status: tb?.status ?? 'want' as BookStatus, insight: tb?.insight } : null
      })
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof books.find> & { status: BookStatus; insight?: string }>>
  }, [topic, books, topicBooks])

  const availableBooks = useMemo(() => {
    if (!topic) return []
    return books.filter((b) => !topic.bookIds.includes(b.id))
  }, [topic, books])

  // Mock star map data
  const mapData = topic ? getMockStarMapData(topic.name) : null

  // Resolve mock book IDs to real book IDs
  const mockBookMap = useMemo(() => resolveMockBookIds(booksInTopic), [booksInTopic])

  // Compute lit node IDs — hardcoded for demo: light up "沉没成本" and "损失厌恶"
  const litNodeIds = useMemo(() => {
    if (!mapData) return new Set<string>()
    return new Set(['micro-2', 'behav-1'])
  }, [mapData])

  // Book metadata for beam rendering
  const bookMeta = useMemo(() => {
    const meta = new Map<string, { color: string; title: string }>()
    for (const book of booksInTopic) {
      meta.set(book.id, { color: book.color, title: book.title })
    }
    return meta
  }, [booksInTopic])

  // Find which book lit a specific node
  const getLitByBook = useCallback((node: KnowledgeNode) => {
    for (const mockId of node.bookIds) {
      const realBookId = mockBookMap.get(mockId)
      if (realBookId) {
        const book = booksInTopic.find((b) => b.id === realBookId)
        if (book) return { title: book.title, color: book.color, coverUrl: book.coverUrl }
      }
    }
    return null
  }, [mockBookMap, booksInTopic])

  const handleNodeClick = useCallback((node: KnowledgeNode, isLit: boolean) => {
    setSelectedNode(node)
    setSelectedNodeIsLit(isLit)
  }, [])

  const handleAddBook = async (bookId: string) => {
    if (!id) return
    await addBookToTopic(id, bookId, 'want')
    setShowAddBook(false)
  }

  const handleRemoveBook = async (bookId: string) => {
    if (!id) return
    await removeBookFromTopic(id, bookId)
  }

  const handleDeleteTopic = async () => {
    if (!id) return
    await removeTopic(id)
    navigate('/topic')
  }

  if (!topic) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="text-text-secondary">专题不存在</p>
      </div>
    )
  }

  const doneCount = booksInTopic.filter((b) => b.status === 'done').length
  const totalCount = booksInTopic.length
  const totalNodes = mapData ? mapData.categories.reduce((s, c) => s + c.nodes.length, 0) : 0

  // Category color for the topic (use first category color or default ocean)
  const topicColor = mapData?.categories[0]?.color ?? '#3D7C98'

  return (
    <div className="relative min-h-full">
      <div className="absolute top-0 left-0 right-0 h-48 blob-ocean opacity-40 pointer-events-none" />

      <div className="relative px-5 pt-8 pb-28">
        {/* Back button */}
        <button
          onClick={() => navigate('/topic')}
          className="flex items-center gap-1 text-sm text-text-secondary mb-4 active:scale-95 transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
          返回
        </button>

        {/* Topic header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-text tracking-tight">{topic.name}</h1>
            {topic.description && <p className="text-xs text-text-secondary mt-1">{topic.description}</p>}
          </div>
          <button onClick={handleDeleteTopic} className="text-xs text-text-secondary/40 px-2 py-1 -mt-1">
            删除
          </button>
        </div>

        {/* Progress stats */}
        <div className="flex items-center gap-4 mt-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">阅读</span>
            <span className="text-xs font-semibold text-ocean">{doneCount}/{totalCount}</span>
          </div>
          {mapData && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-secondary">点亮</span>
              <span className="text-xs font-semibold" style={{ color: topicColor }}>{litNodeIds.size}/{totalNodes}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-[3px] rounded-full bg-bg overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: totalNodes > 0 ? `${(litNodeIds.size / totalNodes) * 100}%` : `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
              background: `linear-gradient(90deg, ${topicColor}, ${topicColor}aa)`,
            }}
          />
        </div>

        {/* Star Map */}
        {mapData ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text">知识星图</h2>
              <span className="text-[10px] text-text-secondary">拖拽探索 · 点击节点</span>
            </div>
            <StarMap
              data={mapData}
              litNodeIds={litNodeIds}
              topicBookIds={new Set(topic.bookIds)}
              mockBookMap={mockBookMap}
              bookMeta={bookMeta}
              onNodeClick={handleNodeClick}
            />
          </div>
        ) : (
          <div className="mb-6">
            <div className="text-center py-12 rounded-2xl bg-surface/50">
              <p className="text-text-secondary/60 text-sm">添加书籍后，星图将在这里呈现</p>
            </div>
          </div>
        )}

        {/* Book list */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text">书籍列表</h2>
          <button
            onClick={() => setShowAddBook(true)}
            className="text-xs text-coral font-semibold active:scale-95 transition-transform"
          >
            + 添加书籍
          </button>
        </div>

        {booksInTopic.length === 0 ? (
          <div className="text-center py-6 rounded-2xl bg-surface/50">
            <p className="text-text-secondary/60 text-sm">还没有添加书籍</p>
          </div>
        ) : (
          <div className="space-y-2">
            {booksInTopic.map((book) => {
              return (
                <div
                  key={book.id}
                  className="bg-surface rounded-2xl p-4 border-l-[3px] flex items-center gap-3"
                  style={{ borderLeftColor: book.color }}
                >
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-9 h-13 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-13 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: book.color }}>
                      {book.title[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{book.title}</p>
                    {book.author && <p className="text-[11px] text-text-secondary truncate">{book.author}</p>}
                  </div>
                  <button onClick={() => handleRemoveBook(book.id)} className="text-text-secondary/30 text-sm ml-2">&times;</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add book modal */}
      {showAddBook && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddBook(false)} />
          <div
            className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 overflow-y-auto"
            style={{ maxHeight: '85dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <h3 className="text-lg font-semibold text-text mb-4">添加书籍到专题</h3>
            {availableBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary text-sm">没有更多书籍可添加</p>
                <p className="text-text-secondary/50 text-xs mt-1">先去日历页打卡添加书籍吧</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleAddBook(book.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-bg active:scale-[0.98] transition-all text-left"
                  >
                    <div
                      className="w-9 h-13 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: book.color }}
                    >
                      {book.title[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{book.title}</p>
                      {book.author && <p className="text-xs text-text-secondary truncate">{book.author}</p>}
                    </div>
                    <span className="text-xs text-ocean font-medium">添加</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Concept detail sheet */}
      <ConceptSheet
        open={!!selectedNode}
        node={selectedNode}
        isLit={selectedNodeIsLit}
        color={(() => {
          if (!mapData || !selectedNode) return '#3D7C98'
          const cat = mapData.categories.find((c) => c.nodes.some((n) => n.id === selectedNode.id))
          return cat?.color ?? '#3D7C98'
        })()}
        litByBook={selectedNode ? getLitByBook(selectedNode) : null}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  )
}
