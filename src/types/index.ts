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
  /** AI 生成的星图数据（Phase 1） */
  starMapData?: StarMapData
}

export type BookStatus = 'default' | 'reading' | 'finished'

export interface TopicBook {
  topicId: string
  bookId: string
  status: BookStatus
  insight?: string
  /** AI 判定该书点亮的节点 ID（Phase 2） */
  litNodeIds: string[]
}

// ── Knowledge Star Map ──

export interface KnowledgeNode {
  id: string
  name: string
  description: string
  categoryIndex: number
  /** Mock book IDs that contribute to this concept (many-to-many) */
  linkedBookIds: string[]
  recommendedBooks?: Array<{
    title: string
    author?: string
  }>
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
