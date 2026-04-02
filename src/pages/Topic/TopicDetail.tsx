import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTopicStore, useBookStore, useLogStore } from '../../store'
import type { BookStatus, KnowledgeNode } from '../../types'
import StarMap from '../../components/Topic/StarMap'
import ConceptSheet from '../../components/Topic/ConceptSheet'
import BookSearch from '../../components/Book/BookSearch'

// Helper: normalize old status values to new ones
function normalizeStatus(s: BookStatus | string | undefined): 'default' | 'reading' | 'finished' {
  if (s === 'finished' || s === 'done') return 'finished'
  if (s === 'reading') return 'reading'
  return 'default' // 'want', 'default', undefined → default
}

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const books = useBookStore((s) => s.books)
  const loadBooks = useBookStore((s) => s.load)
  const removeBook = useBookStore((s) => s.removeBook)
  const bookIdsWithLogs = useLogStore((s) => s.bookIdsWithLogs)
  const { topics, topicBooks, aiLoading, aiError, loadTopics, loadTopicBooks, addBookToTopic, removeBookFromTopic, removeTopic, updateTopicBook, regenerateStarMap } = useTopicStore()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAddBook, setShowAddBook] = useState(false)
  const [showBookSearch, setShowBookSearch] = useState(false)
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [selectedNodeIsLit, setSelectedNodeIsLit] = useState(false)
  const [statusSheetBookId, setStatusSheetBookId] = useState<string | null>(null)

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
        if (!book) return null
        return {
          ...book,
          status: normalizeStatus(tb?.status),
          insight: tb?.insight,
          litNodeIds: tb?.litNodeIds ?? [],
        }
      })
      .filter(Boolean) as Array<
        NonNullable<ReturnType<typeof books.find>> & { status: 'default' | 'reading' | 'finished'; insight?: string; litNodeIds: string[] }
      >
  }, [topic, books, topicBooks])

  const availableBooks = useMemo(() => {
    if (!topic) return []
    return books.filter((b) => !topic.bookIds.includes(b.id) && (bookIdsWithLogs.has(b.id) || topics.some((t) => t.bookIds.includes(b.id))))
  }, [topic, books, bookIdsWithLogs, topics])

  const mapData = topic?.starMapData ?? null
  const topicColor = mapData?.categories[0]?.color ?? '#3D7C98'

  // Only count litNodeIds from finished books
  const litNodeIds = useMemo(() => {
    const lit = new Set<string>()
    for (const book of booksInTopic) {
      if (book.status === 'finished') {
        for (const nodeId of book.litNodeIds) {
          lit.add(nodeId)
        }
      }
    }
    return lit
  }, [booksInTopic])

  // Density ring: only from finished books
  const nodeBookCountMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const book of booksInTopic) {
      if (book.status === 'finished') {
        for (const nodeId of book.litNodeIds) {
          m.set(nodeId, (m.get(nodeId) ?? 0) + 1)
        }
      }
    }
    return m
  }, [booksInTopic])

  const nodeMap = useMemo(() => {
    const m = new Map<string, KnowledgeNode>()
    if (mapData) {
      for (const cat of mapData.categories) {
        for (const node of cat.nodes) {
          m.set(node.id, node)
        }
      }
    }
    return m
  }, [mapData])

  const bookConceptMap = useMemo(() => {
    const m = new Map<string, Array<{ id: string; name: string; color: string }>>()
    for (const book of booksInTopic) {
      const concepts: Array<{ id: string; name: string; color: string }> = []
      for (const nodeId of book.litNodeIds) {
        const node = nodeMap.get(nodeId)
        if (node) {
          const cat = mapData?.categories[node.categoryIndex]
          concepts.push({ id: node.id, name: node.name, color: cat?.color ?? topicColor })
        }
      }
      if (concepts.length > 0) m.set(book.id, concepts)
    }
    return m
  }, [booksInTopic, nodeMap, mapData, topicColor])

  const selectedNodeLinkedBooks = useMemo(() => {
    if (!selectedNode || !selectedNodeIsLit) return []
    return booksInTopic
      .filter((b) => b.status === 'finished' && b.litNodeIds.includes(selectedNode.id))
      .map((b) => ({ title: b.title, color: b.color, coverUrl: b.coverUrl }))
  }, [selectedNode, selectedNodeIsLit, booksInTopic])

  const handleNodeClick = useCallback((node: KnowledgeNode, isLit: boolean) => {
    setSelectedNode(node)
    setSelectedNodeIsLit(isLit)
  }, [])

  const handleAddBook = async (bookId: string) => {
    if (!id) return
    await addBookToTopic(id, bookId, 'default')
    setShowAddBook(false)
  }

  const handleBookSearchSelect = async (bookId: string) => {
    if (!id) return
    await loadBooks()
    await addBookToTopic(id, bookId, 'default')
    setShowBookSearch(false)
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

  const handleStatusChange = async (bookId: string, newStatus: 'default' | 'reading' | 'finished') => {
    if (!id) return
    const tb = topicBooks.find((t) => t.bookId === bookId && t.topicId === id)
    if (tb) {
      await updateTopicBook({ ...tb, status: newStatus })
    }
    setStatusSheetBookId(null)
  }

  if (!topic) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="text-text-secondary">专题不存在</p>
      </div>
    )
  }

  const finishedCount = booksInTopic.filter((b) => b.status === 'finished').length
  const totalCount = booksInTopic.length
  const totalNodes = mapData ? mapData.categories.reduce((s, c) => s + c.nodes.length, 0) : 0

  const statusSheetBook = statusSheetBookId ? booksInTopic.find((b) => b.id === statusSheetBookId) : null

  return (
    <div className="relative min-h-full">
      <div className="absolute top-0 left-0 right-0 h-48 blob-ocean opacity-40 pointer-events-none" />

      <div className="relative px-5 pt-8 pb-28">
        <button onClick={() => navigate('/topic')} className="flex items-center gap-1 text-sm text-text-secondary mb-4 active:scale-95 transition-transform">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
          返回
        </button>

        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-text tracking-tight">{topic.name}</h1>
            {topic.description && <p className="text-xs text-text-secondary mt-1">{topic.description}</p>}
          </div>
          <button onClick={handleDeleteTopic} className="text-xs text-text-secondary/40 px-2 py-1 -mt-1">删除</button>
        </div>

        {aiLoading && !mapData && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-2xl bg-surface/60">
            <div className="w-3 h-3 rounded-full border-2 border-ocean/40 border-t-ocean animate-spin flex-shrink-0" />
            <span className="text-xs text-ocean">AI 正在思考中...</span>
          </div>
        )}

        {aiError && !aiLoading && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-2xl bg-red-50">
            <span className="text-xs text-red-500">{aiError}</span>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">已读</span>
            <span className="text-xs font-semibold" style={{ color: topicColor }}>{finishedCount}/{totalCount}</span>
          </div>
          {mapData && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-secondary">点亮</span>
              <span className="text-xs font-semibold" style={{ color: topicColor }}>{litNodeIds.size}/{totalNodes}</span>
            </div>
          )}
        </div>

        <div className="h-[3px] rounded-full bg-bg overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: totalNodes > 0 ? `${(litNodeIds.size / totalNodes) * 100}%` : `${totalCount > 0 ? (finishedCount / totalCount) * 100 : 0}%`,
              background: `linear-gradient(90deg, ${topicColor}, ${topicColor}aa)`,
            }}
          />
        </div>

        {mapData ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text">知识星图</h2>
              <span className="text-[10px] text-text-secondary">拖拽探索 · 点击节点</span>
            </div>
            <StarMap data={mapData} litNodeIds={litNodeIds} topicColor={topicColor} nodeBookCountMap={nodeBookCountMap} onNodeClick={handleNodeClick} />
          </div>
        ) : !topic.starMapData ? (
          <div className="mb-6">
            {aiLoading ? (
              <div className="w-full text-center py-10 rounded-2xl bg-surface/50">
                <svg width="160" height="160" viewBox="0 0 200 200" className="mx-auto mb-4 animate-pulse">
                  <circle cx="100" cy="100" r="90" fill="none" stroke={topicColor} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                  <circle cx="100" cy="100" r="60" fill="none" stroke={topicColor} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.25" />
                  <circle cx="100" cy="100" r="30" fill="none" stroke={topicColor} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2" />
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180
                    const r = 60
                    const cx = 100 + r * Math.cos(rad)
                    const cy = 100 + r * Math.sin(rad)
                    return <circle key={i} cx={cx} cy={cy} r="4" fill={topicColor} opacity={0.15 + i * 0.03} />
                  })}
                </svg>
                <p className="text-sm text-text-secondary/70 mb-1">知识星图生成中...</p>
                <p className="text-xs text-text-secondary/40">AI 正在深度思考，预计需要 3-5 分钟</p>
              </div>
            ) : (
              <button onClick={() => regenerateStarMap(topic.id)} className="w-full text-center py-12 rounded-2xl bg-surface/50 active:scale-95 transition-transform">
                <p className="text-text-secondary/60 text-sm">点击生成知识星图</p>
              </button>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <div className="text-center py-12 rounded-2xl bg-surface/50">
              <p className="text-text-secondary/60 text-sm">添加书籍后，星图将在这里呈现</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text">书籍列表</h2>
          <button onClick={() => setShowAddBook(true)} className="text-xs text-coral font-semibold active:scale-95 transition-transform">+ 添加书籍</button>
        </div>

        {booksInTopic.length === 0 ? (
          <div className="text-center py-6 rounded-2xl bg-surface/50">
            <p className="text-text-secondary/60 text-sm">还没有添加书籍</p>
          </div>
        ) : (
          <div className="space-y-2">
            {booksInTopic.map((book) => {
              const concepts = bookConceptMap.get(book.id)
              const mappingAI = aiLoading && mapData && book.litNodeIds.length === 0
              const isFinished = book.status === 'finished'
              const isReading = book.status === 'reading'
              return (
                <div key={book.id} className={`bg-surface rounded-2xl p-4 flex items-start gap-3 transition-all duration-300${mappingAI ? ' ring-1 ring-ocean/20' : ''}`}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-9 h-13 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-13 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: book.color }}>{book.title[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text truncate">{book.title}</p>
                      {isReading && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all duration-300" style={{ backgroundColor: topicColor + '18', color: topicColor }}>在读</span>
                      )}
                      {isFinished && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-sage/15 text-sage flex items-center gap-0.5 transition-all duration-300">
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-6" /></svg>
                          已读
                        </span>
                      )}
                    </div>
                    {book.author && <p className="text-[11px] text-text-secondary truncate">{book.author}</p>}
                    {mappingAI && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-ocean/40 border-t-ocean animate-spin flex-shrink-0" />
                        <span className="text-[10px] text-ocean">AI 正在分析关联知识点...</span>
                      </div>
                    )}
                    {concepts && concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {concepts.map((c) => {
                          const unlocked = isFinished
                          return (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 transition-colors duration-500"
                              style={unlocked
                                ? { backgroundColor: c.color + '14', color: c.color }
                                : { backgroundColor: '#ebe8e3', color: '#b0aca6' }
                              }
                            >
                              {!unlocked && (
                                <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" opacity="0.5">
                                  <path d="M9 5V4a3 3 0 10-6 0v1H2v6h8V5h-1zM4 4a2 2 0 114 0v1H4V4z" />
                                </svg>
                              )}
                              {c.name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setStatusSheetBookId(book.id)}
                    className="text-text-secondary/40 text-lg px-1 self-start mt-0.5 active:scale-90 transition-transform"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                      <circle cx="9" cy="4" r="1.2" />
                      <circle cx="9" cy="9" r="1.2" />
                      <circle cx="9" cy="14" r="1.2" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Status Action Sheet */}
      {statusSheetBook && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setStatusSheetBookId(null)} />
          <div className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 overflow-y-auto" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4">
              {statusSheetBook.coverUrl ? (
                <img src={statusSheetBook.coverUrl} alt="" className="w-8 h-11 object-cover rounded-lg" />
              ) : (
                <div className="w-8 h-11 rounded-lg flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: statusSheetBook.color }}>{statusSheetBook.title[0]}</div>
              )}
              <p className="text-sm font-medium text-text truncate">{statusSheetBook.title}</p>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleStatusChange(statusSheetBook.id, 'default')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm active:scale-[0.98] transition-all ${statusSheetBook.status === 'default' ? 'bg-bg font-medium text-text' : 'text-text-secondary'}`}
              >
                <span className="flex items-center gap-2">
                  {statusSheetBook.status === 'default' && <span className="text-text-secondary text-xs">✓</span>}
                  不标记
                </span>
              </button>
              <button
                onClick={() => handleStatusChange(statusSheetBook.id, 'reading')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm active:scale-[0.98] transition-all ${statusSheetBook.status === 'reading' ? 'font-medium' : 'text-text-secondary'}`}
                style={statusSheetBook.status === 'reading' ? { backgroundColor: topicColor + '10', color: topicColor } : {}}
              >
                <span className="flex items-center gap-2">
                  {statusSheetBook.status === 'reading' && <span className="text-xs">✓</span>}
                  标记为在读
                </span>
              </button>
              <button
                onClick={() => handleStatusChange(statusSheetBook.id, 'finished')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm active:scale-[0.98] transition-all ${statusSheetBook.status === 'finished' ? 'bg-sage/10 font-medium text-sage' : 'text-text-secondary'}`}
              >
                <span className="flex items-center gap-2">
                  {statusSheetBook.status === 'finished' && <span className="text-xs">✓</span>}
                  标记为已完成
                </span>
              </button>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40">
              <button
                onClick={() => { handleRemoveBook(statusSheetBook.id); setStatusSheetBookId(null) }}
                className="w-full text-center px-4 py-3 rounded-2xl text-sm text-coral/70 active:scale-[0.98] transition-all"
              >
                移出专题
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add book modal */}
      {showAddBook && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddBook(false)} />
          <div className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 overflow-y-auto" style={{ maxHeight: '85dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <h3 className="text-lg font-semibold text-text mb-4">添加书籍到专题</h3>
            {availableBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary text-sm">书库中没有更多书籍</p>
                <p className="text-text-secondary/50 text-xs mt-1">点击下方按钮搜索或手动导入</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableBooks.map((book) => {
                  const inLibrary = bookIdsWithLogs.has(book.id)
                  return (
                    <div key={book.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-bg/50">
                        <div className="w-9 h-13 rounded-lg overflow-hidden flex-shrink-0">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-lg flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: book.color }}>{book.title[0]}</div>
                          )}
                        </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{book.title}</p>
                        {book.author && <p className="text-xs text-text-secondary truncate">{book.author}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {!inLibrary && (
                          confirmDeleteId === book.id ? (
                            <>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] text-text-secondary">取消</button>
                              <button onClick={async () => { await removeBook(book.id); setConfirmDeleteId(null) }} className="px-2 py-1 rounded-lg text-[10px] text-white bg-coral">删除</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(book.id)} className="text-xs text-text-secondary/40 active:text-coral transition-colors">删除</button>
                          )
                        )}
                        <button onClick={() => handleAddBook(book.id)} className="text-xs text-ocean font-medium active:scale-95 transition-transform">添加</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={() => setShowBookSearch(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-ocean/25 text-sm text-ocean font-medium active:scale-[0.98] transition-transform"
              >
                搜索导入新书
              </button>
            </div>
          </div>
        </div>
      )}

      <ConceptSheet
        open={!!selectedNode}
        node={selectedNode}
        isLit={selectedNodeIsLit}
        color={(() => {
          if (!mapData || !selectedNode) return topicColor
          const cat = mapData.categories.find((c) => c.nodes.some((n) => n.id === selectedNode.id))
          return cat?.color ?? topicColor
        })()}
        linkedBooks={selectedNodeLinkedBooks}
        onClose={() => setSelectedNode(null)}
      />

      <BookSearch
        open={showBookSearch}
        onClose={() => setShowBookSearch(false)}
        onBookSelect={handleBookSearchSelect}
      />
    </div>
  )
}
