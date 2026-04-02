import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Book, Log, Topic, TopicBook } from '../types'
import * as db from '../db'
import {
  publishStarMapJob, pollStarMapJob,
  publishBookNodesJob, pollBookNodesJob,
} from '../services/ai'

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
  aiLoading: boolean
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
  regenerateStarMap: (topicId: string) => Promise<void>
  /** Resume polling for a topic whose star-map job was interrupted */
  resumeStarMapGeneration: (topicId: string) => Promise<void>
  /** Resume polling for a book whose node-mapping job was interrupted */
  resumeBookMapping: (topicId: string, bookId: string) => Promise<void>
}

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

  // ── Phase 1: Add Topic + Generate Star Map (async) ──

  addTopic: async (name, description): Promise<Topic> => {
    const topic: Topic = { id: uuid(), name, description, bookIds: [], createdAt: Date.now() }
    await db.saveTopic(topic)
    set((s) => ({ topics: [topic, ...s.topics] }))

    cancelPendingAI()
    const controller = new AbortController()
    currentAIController = controller
    set({ aiLoading: true, aiError: null })

    try {
      // Step 1: Publish job (returns in <1s)
      const jobId = await publishStarMapJob(name, description)
      topic.starMapJobId = jobId
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topic.id ? { ...t, starMapJobId: jobId } : t)),
      }))

      // Step 2: Poll until done (1-3 min)
      const starMapData = await pollStarMapJob(jobId, controller.signal)

      // Step 3: Save result
      topic.starMapData = starMapData
      topic.starMapJobId = undefined
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topic.id ? { ...t, starMapData, starMapJobId: undefined } : t)),
        aiLoading: false,
        aiError: null,
      }))
    } catch (err) {
      if (controller.signal.aborted) return topic
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

  // ── Phase 2: Add Book to Topic + Map Nodes (async) ──

  addBookToTopic: async (topicId, bookId, status = 'default') => {
    const tb: TopicBook = { topicId, bookId, status, litNodeIds: [] }
    await db.saveTopicBook(tb)

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

    // Publish book-node mapping job
    if (topic?.starMapData) {
      cancelPendingAI()
      const controller = new AbortController()
      currentAIController = controller
      set({ aiLoading: true, aiError: null })
      try {
        const allNodes: Array<{ id: string; name: string; description: string }> = []
        for (const cat of topic.starMapData.categories) {
          for (const node of cat.nodes) {
            allNodes.push({ id: node.id, name: node.name, description: node.description })
          }
        }
        const books = await db.getAllBooks()
        const book = books.find((b) => b.id === bookId)

        // Step 1: Publish job
        const jobId = await publishBookNodesJob(
          book?.title ?? '', book?.author, undefined, allNodes,
        )

        // Save jobId
        tb.mappingJobId = jobId
        await db.saveTopicBook(tb)
        set((s) => ({
          topicBooks: s.topicBooks.map((x) =>
            (x.topicId === topicId && x.bookId === bookId) ? { ...x, mappingJobId: jobId } : x
          ),
        }))

        // Step 2: Poll until done
        const litNodeIds = await pollBookNodesJob(jobId, controller.signal)

        // Step 3: Save result
        tb.litNodeIds = litNodeIds
        tb.mappingJobId = undefined
        await db.saveTopicBook(tb)
        set((s) => ({
          topicBooks: s.topicBooks.map((x) =>
            (x.topicId === topicId && x.bookId === bookId) ? { ...x, litNodeIds, mappingJobId: undefined } : x
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

    const topics = await db.getAllTopics()
    const topic = topics.find((t) => t.id === topicId)
    if (topic) {
      topic.bookIds = topic.bookIds.filter((id) => id !== bookId)
      await db.saveTopic(topic)
    }

    const bookIdsWithLogs = await db.getBookIdsWithLogs()
    const usedInOtherTopic = topics.some((t) => t.id !== topicId && t.bookIds.includes(bookId))

    if (!bookIdsWithLogs.has(bookId) && !usedInOtherTopic) {
      await db.deleteBook(bookId)
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

  // ── Regenerate Star Map (async) ──

  regenerateStarMap: async (topicId) => {
    const topic = get().topics.find((t) => t.id === topicId)
    if (!topic) return

    cancelPendingAI()
    const controller = new AbortController()
    currentAIController = controller
    set({ aiLoading: true, aiError: null })

    try {
      const jobId = await publishStarMapJob(topic.name, topic.description)
      topic.starMapJobId = jobId
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topicId ? { ...t, starMapJobId: jobId } : t)),
      }))

      const starMapData = await pollStarMapJob(jobId, controller.signal)
      topic.starMapData = starMapData
      topic.starMapJobId = undefined
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topicId ? { ...t, starMapData, starMapJobId: undefined } : t)),
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

  // ── Resume: pick up orphaned jobs after page reload ──

  resumeStarMapGeneration: async (topicId) => {
    const topic = get().topics.find((t) => t.id === topicId)
    if (!topic?.starMapJobId || topic.starMapData) return

    cancelPendingAI()
    const controller = new AbortController()
    currentAIController = controller
    set({ aiLoading: true, aiError: null })

    try {
      const starMapData = await pollStarMapJob(topic.starMapJobId, controller.signal)
      topic.starMapData = starMapData
      topic.starMapJobId = undefined
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topicId ? { ...t, starMapData, starMapJobId: undefined } : t)),
        aiLoading: false,
        aiError: null,
      }))
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('Resume star-map failed:', err)
      // Job expired — clear stale jobId
      topic.starMapJobId = undefined
      await db.saveTopic(topic)
      set((s) => ({
        topics: s.topics.map((t) => (t.id === topicId ? { ...t, starMapJobId: undefined } : t)),
        aiLoading: false,
        aiError: '星图生成已过期，请重新生成',
      }))
    } finally {
      if (currentAIController === controller) currentAIController = null
    }
  },

  resumeBookMapping: async (topicId, bookId) => {
    const tb = get().topicBooks.find((x) => x.topicId === topicId && x.bookId === bookId)
    if (!tb?.mappingJobId || tb.litNodeIds.length > 0) return

    cancelPendingAI()
    const controller = new AbortController()
    currentAIController = controller
    set({ aiLoading: true, aiError: null })

    try {
      const litNodeIds = await pollBookNodesJob(tb.mappingJobId, controller.signal)
      tb.litNodeIds = litNodeIds
      tb.mappingJobId = undefined
      await db.saveTopicBook(tb)
      set((s) => ({
        topicBooks: s.topicBooks.map((x) =>
          (x.topicId === topicId && x.bookId === bookId) ? { ...x, litNodeIds, mappingJobId: undefined } : x
        ),
        aiLoading: false,
        aiError: null,
      }))
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('Resume book-mapping failed:', err)
      tb.mappingJobId = undefined
      await db.saveTopicBook(tb)
      set((s) => ({
        topicBooks: s.topicBooks.map((x) =>
          (x.topicId === topicId && x.bookId === bookId) ? { ...x, mappingJobId: undefined } : x
        ),
        aiLoading: false,
        aiError: '知识点映射已过期，请重试',
      }))
    } finally {
      if (currentAIController === controller) currentAIController = null
    }
  },
}))
