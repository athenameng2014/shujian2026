import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Book, Log, Topic, TopicBook } from '../types'
import * as db from '../db'
import { generateStarMap, mapBookNodes } from '../services/ai'

// 预设的代表色（莫兰迪底色 + 高饱和跳色混搭）
const BOOK_COLORS = [
  '#E8654A', '#3D7C98', '#5B9E6F', '#E5A93D',
  '#9B5DE5', '#E07A5F', '#81B29A', '#c4956a',
  '#4ECDC4', '#FF6B9D', '#F2CC8F', '#6C8EBF',
]

function pickColor(existingBooks: Book[]): string {
  const used = new Set(existingBooks.map((b) => b.color))
  const available = BOOK_COLORS.filter((c) => !used.has(c))
  return available[Math.floor(Math.random() * available.length)] ?? BOOK_COLORS[0]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

interface BookState {
  books: Book[]
  load: () => Promise<void>
  addBook: (input: { title: string; author?: string; coverUrl?: string; coverBlob?: Blob; isFiction?: boolean }) => Promise<Book>
  updateBook: (book: Book) => Promise<void>
  removeBook: (id: string) => Promise<void>
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  load: async () => {
    const books = await db.getAllBooks()
    set({ books })
  },
  addBook: async (input) => {
    let coverUrl = input.coverUrl
    if (!coverUrl && input.coverBlob) {
      coverUrl = await blobToDataUrl(input.coverBlob)
    }
    const book: Book = {
      id: uuid(),
      title: input.title,
      author: input.author,
      coverUrl,
      color: pickColor(get().books),
      isFiction: input.isFiction,
      createdAt: Date.now(),
    }
    await db.saveBook(book)
    set((s) => ({ books: [book, ...s.books] }))
    return book
  },
  updateBook: async (book) => {
    await db.saveBook(book)
    set((s) => ({ books: s.books.map((b) => (b.id === book.id ? book : b)) }))
  },
  removeBook: async (id) => {
    await db.deleteBook(id)
    set((s) => ({ books: s.books.filter((b) => b.id !== id) }))
  },
}))

interface LogState {
  logs: Log[]
  allLogs: Log[]
  bookIdsWithLogs: Set<string>
  loadMonth: (yearMonth: string) => Promise<void>
  loadAllLogs: () => Promise<void>
  refreshBookIdsWithLogs: () => Promise<void>
  addLog: (input: { bookId: string; date: string; note?: string }) => Promise<Log>
  updateLog: (log: Log) => Promise<void>
  removeLog: (id: string) => Promise<void>
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  allLogs: [],
  bookIdsWithLogs: new Set(),
  loadMonth: async (yearMonth) => {
    const logs = await db.getLogsByMonth(yearMonth)
    set({ logs })
  },
  loadAllLogs: async () => {
    const allLogs = await db.getAllLogs()
    set({ allLogs })
  },
  refreshBookIdsWithLogs: async () => {
    const bookIdsWithLogs = await db.getBookIdsWithLogs()
    set({ bookIdsWithLogs })
  },
  addLog: async (input) => {
    const log: Log = { id: uuid(), ...input, createdAt: Date.now() }
    await db.saveLog(log)
    const bookIdsWithLogs = await db.getBookIdsWithLogs()
    set((s) => ({ logs: [log, ...s.logs], bookIdsWithLogs }))
    return log
  },
  updateLog: async (log) => {
    await db.saveLog(log)
    set((s) => ({ logs: s.logs.map((l) => (l.id === log.id ? log : l)) }))
  },
  removeLog: async (id) => {
    await db.deleteLog(id)
    const bookIdsWithLogs = await db.getBookIdsWithLogs()
    set((s) => ({ logs: s.logs.filter((l) => l.id !== id), bookIdsWithLogs }))
  },
}))

// ── Topic Store ──

interface TopicState {
  topics: Topic[]
  topicBooks: TopicBook[]
  /** Tracks ongoing AI operations */
  aiLoading: boolean
  /** Last AI error message (cleared on next operation) */
  aiError: string | null
  loadTopics: () => Promise<void>
  loadTopicBooks: (topicId: string) => Promise<void>
  loadAllTopicBooks: () => Promise<void>
  addTopic: (name: string, description?: string) => Promise<Topic>
  updateTopic: (topic: Topic) => Promise<void>
  removeTopic: (id: string) => Promise<void>
  addBookToTopic: (topicId: string, bookId: string, status?: TopicBook['status']) => Promise<void>
  updateTopicBook: (tb: TopicBook) => Promise<void>
  removeBookFromTopic: (topicId: string, bookId: string) => Promise<void>
  /** Re-generate star map for a topic that has no starMapData */
  regenerateStarMap: (topicId: string) => Promise<void>
}

// Track the current AI request so we can cancel it when a new one starts
let currentAIController: AbortController | null = null

function cancelPendingAI() {
  if (currentAIController) {
    currentAIController.abort()
    currentAIController = null
  }
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: [],
  topicBooks: [],
  aiLoading: false,
  aiError: null,
  loadTopics: async () => {
    const topics = await db.getAllTopics()
    set({ topics })
  },
  loadTopicBooks: async (topicId) => {
    const topicBooks = await db.getTopicBooks(topicId)
    set({ topicBooks })
  },
  loadAllTopicBooks: async () => {
    const topicBooks = await db.getAllTopicBooks()
    set({ topicBooks })
  },
  addTopic: async (name, description): Promise<Topic> => {
    const topic: Topic = { id: uuid(), name, description, bookIds: [], createdAt: Date.now() }
    await db.saveTopic(topic)
    set((s) => ({ topics: [topic, ...s.topics] }))

    // Phase 1: Call AI to generate star map
    cancelPendingAI()
    const controller = new AbortController()
    currentAIController = controller
    set({ aiLoading: true, aiError: null })
    try {
      const starMapData = await generateStarMap(name, description, controller.signal)
      topic.starMapData = starMapData
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topic.id ? { ...t, starMapData } : t)),
        aiLoading: false,
        aiError: null,
      }))
    } catch (err) {
      if (controller.signal.aborted) return topic // cancelled by newer request, don't update state
      console.error('Failed to generate star map:', err)
      set({ aiLoading: false, aiError: '星图生成失败，请重试' })
    } finally {
      if (currentAIController === controller) currentAIController = null
    }

    return topic
  },
  updateTopic: async (topic) => {
    await db.saveTopic(topic)
    set((s) => ({ topics: s.topics.map((t) => (t.id === topic.id ? topic : t)) }))
  },
  removeTopic: async (id) => {
    await db.deleteTopic(id)
    set((s) => ({ topics: s.topics.filter((t) => t.id !== id) }))
  },
  addBookToTopic: async (topicId, bookId, status = 'default') => {
    const tb: TopicBook = { topicId, bookId, status, litNodeIds: [] }
    await db.saveTopicBook(tb)

    // Update topic.bookIds
    const topics = await db.getAllTopics()
    const topic = topics.find((t) => t.id === topicId)
    if (topic && !topic.bookIds.includes(bookId)) {
      topic.bookIds = [...topic.bookIds, bookId]
      await db.saveTopic(topic)
    }

    set((s) => ({
      topicBooks: [...s.topicBooks.filter((x) => !(x.topicId === topicId && x.bookId === bookId)), tb],
      topics: s.topics.map((t) => t.id === topicId ? { ...t, bookIds: [...new Set([...t.bookIds, bookId])] } : t),
    }))

    // Phase 2: Call AI to map book to nodes
    if (topic?.starMapData) {
      cancelPendingAI()
      const controller = new AbortController()
      currentAIController = controller
      set({ aiLoading: true, aiError: null })
      try {
        // Find unlit or all nodes
        const allNodes: Array<{ id: string; name: string; description: string }> = []
        for (const cat of topic.starMapData.categories) {
          for (const node of cat.nodes) {
            allNodes.push({ id: node.id, name: node.name, description: node.description })
          }
        }

        // Find the book info
        const books = await db.getAllBooks()
        const book = books.find((b) => b.id === bookId)

        const litNodeIds = await mapBookNodes(
          book?.title ?? '',
          book?.author,
          undefined, // book description not stored currently
          allNodes,
          controller.signal,
        )

        // Update the TopicBook with litNodeIds
        tb.litNodeIds = litNodeIds
        await db.saveTopicBook(tb)

        set((s) => ({
          topicBooks: s.topicBooks.map((x) =>
            (x.topicId === topicId && x.bookId === bookId) ? { ...x, litNodeIds } : x
          ),
          aiLoading: false,
          aiError: null,
        }))
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to map book nodes:', err)
        set({ aiLoading: false, aiError: '知识点映射失败，请重试' })
      } finally {
        if (currentAIController === controller) currentAIController = null
      }
    }
  },
  updateTopicBook: async (tb) => {
    await db.saveTopicBook(tb)
    set((s) => ({
      topicBooks: s.topicBooks.map((x) => (x.topicId === tb.topicId && x.bookId === tb.bookId ? tb : x)),
    }))
  },
  removeBookFromTopic: async (topicId, bookId) => {
    await db.deleteTopicBook(topicId, bookId)

    // Update topic.bookIds in DB
    const topics = await db.getAllTopics()
    const topic = topics.find((t) => t.id === topicId)
    if (topic) {
      topic.bookIds = topic.bookIds.filter((id) => id !== bookId)
      await db.saveTopic(topic)
    }

    // Check if book should be fully deleted: no logs and not in any other topics
    const bookIdsWithLogs = await db.getBookIdsWithLogs()
    const usedInOtherTopic = topics.some((t) => t.id !== topicId && t.bookIds.includes(bookId))

    if (!bookIdsWithLogs.has(bookId) && !usedInOtherTopic) {
      await db.deleteBook(bookId)
      // Update book store separately (books is not in TopicState)
      useBookStore.setState((s) => ({ books: s.books.filter((b) => b.id !== bookId) }))
      set((s) => ({
        topicBooks: s.topicBooks.filter((x) => !(x.topicId === topicId && x.bookId === bookId)),
        topics: s.topics.map((t) => t.id === topicId ? { ...t, bookIds: t.bookIds.filter((id) => id !== bookId) } : t),
      }))
    } else {
      set((s) => ({
        topicBooks: s.topicBooks.filter((x) => !(x.topicId === topicId && x.bookId === bookId)),
        topics: s.topics.map((t) => t.id === topicId ? { ...t, bookIds: t.bookIds.filter((id) => id !== bookId) } : t),
      }))
    }
  },
  regenerateStarMap: async (topicId) => {
    const topic = get().topics.find((t) => t.id === topicId)
    if (!topic) return

    cancelPendingAI()
    const controller = new AbortController()
    currentAIController = controller
    set({ aiLoading: true, aiError: null })
    try {
      const starMapData = await generateStarMap(topic.name, topic.description, controller.signal)
      topic.starMapData = starMapData
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topicId ? { ...t, starMapData } : t)),
        aiLoading: false,
        aiError: null,
      }))
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('Failed to regenerate star map:', err)
      set({ aiLoading: false, aiError: '星图生成失败，请重试' })
    } finally {
      if (currentAIController === controller) currentAIController = null
    }
  },
}))
