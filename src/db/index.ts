import localforage from 'localforage'
import type { Book, Log, Topic, TopicBook } from '../types'

const store = localforage.createInstance({ name: 'shujian' })

// ── Books ──
export async function getAllBooks(): Promise<Book[]> {
  const books: Book[] = []
  await store.iterate<Book, void>((value) => {
    if (value && 'title' in value && 'color' in value) books.push(value)
  })
  return books.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getBook(id: string): Promise<Book | null> {
  return store.getItem<Book>(`book:${id}`)
}

export async function saveBook(book: Book): Promise<Book> {
  await store.setItem(`book:${book.id}`, book)
  return book
}

export async function deleteBook(id: string): Promise<void> {
  await store.removeItem(`book:${id}`)
}

// ── Logs ──
export async function getLogsByDate(date: string): Promise<Log[]> {
  const logs: Log[] = []
  await store.iterate<Log, void>((value, key) => {
    if (key.startsWith('log:') && value.date === date) logs.push(value)
  })
  return logs.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getLogsByMonth(yearMonth: string): Promise<Log[]> {
  const logs: Log[] = []
  await store.iterate<Log, void>((value, key) => {
    if (key.startsWith('log:') && value.date.startsWith(yearMonth)) logs.push(value)
  })
  return logs.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getLogsByBook(bookId: string): Promise<Log[]> {
  const logs: Log[] = []
  await store.iterate<Log, void>((value, key) => {
    if (key.startsWith('log:') && value.bookId === bookId) logs.push(value)
  })
  return logs.sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveLog(log: Log): Promise<Log> {
  await store.setItem(`log:${log.id}`, log)
  return log
}

export async function deleteLog(id: string): Promise<void> {
  await store.removeItem(`log:${id}`)
}

export async function hasBookLogs(bookId: string): Promise<boolean> {
  let found = false
  await store.iterate<Log, void>((value, key) => {
    if (key.startsWith('log:') && value.bookId === bookId) found = true
  })
  return found
}

export async function getBookIdsWithLogs(): Promise<Set<string>> {
  const ids = new Set<string>()
  await store.iterate<Log, void>((value, key) => {
    if (key.startsWith('log:')) ids.add(value.bookId)
  })
  return ids
}

// ── Topics ──
export async function getAllTopics(): Promise<Topic[]> {
  const topics: Topic[] = []
  await store.iterate<Topic, void>((value, key) => {
    if (key.startsWith('topic:')) topics.push(value)
  })
  return topics.sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveTopic(topic: Topic): Promise<Topic> {
  await store.setItem(`topic:${topic.id}`, topic)
  return topic
}

export async function deleteTopic(id: string): Promise<void> {
  await store.removeItem(`topic:${id}`)
}

// ── TopicBooks ──
export async function getTopicBooks(topicId: string): Promise<TopicBook[]> {
  const items: TopicBook[] = []
  await store.iterate<TopicBook, void>((value, key) => {
    if (key.startsWith('tb:') && value.topicId === topicId) items.push(value)
  })
  return items
}

export async function saveTopicBook(tb: TopicBook): Promise<TopicBook> {
  await store.setItem(`tb:${tb.topicId}:${tb.bookId}`, tb)
  return tb
}

export async function deleteTopicBook(topicId: string, bookId: string): Promise<void> {
  await store.removeItem(`tb:${topicId}:${bookId}`)
}
