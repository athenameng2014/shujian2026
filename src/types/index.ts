export interface Book {
  id: string
  title: string
  author?: string
  coverUrl?: string
  color: string
  isFiction?: boolean
  createdAt: number
}

export interface Log {
  id: string
  bookId: string
  date: string // "YYYY-MM-DD"
  note?: string
  createdAt: number
}

export interface Topic {
  id: string
  name: string
  description?: string
  bookIds: string[]
  createdAt: number
}

export type BookStatus = 'want' | 'reading' | 'done'

export interface TopicBook {
  topicId: string
  bookId: string
  status: BookStatus
  insight?: string
}

// ── Knowledge Star Map ──

export interface KnowledgeNode {
  id: string
  name: string
  description: string
  categoryIndex: number
  /** Mock book IDs that unlock this node */
  bookIds: string[]
  recommendedBook?: {
    title: string
    author?: string
  }
}

export interface KnowledgeCategory {
  name: string
  color: string
  nodes: KnowledgeNode[]
}

export interface StarMapData {
  topicName: string
  topicId: string
  categories: KnowledgeCategory[]
}
