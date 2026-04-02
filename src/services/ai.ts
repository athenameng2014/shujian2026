import type { StarMapData } from '../types'

const AI_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const MAX_RETRIES = 2
const RETRY_DELAY = 2000 // 2 seconds

/**
 * Fetch with timeout and retry for AI API calls.
 * Edge Runtime functions return 200 with `{ error }` in body on failure,
 * so we check for that in addition to HTTP errors.
 */
async function aiFetch(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT)

  // Combine external signal with our timeout signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Parse the response from an Edge Runtime AI endpoint.
 * Handles both HTTP errors and body-level `{ error }` responses.
 */
async function parseAIResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }

  const data = await res.json() as T & { error?: string }
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

/**
 * Execute an AI call with automatic retry.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Don't retry on abort (user cancelled)
      if (lastError.name === 'AbortError') throw lastError
      // Don't retry on last attempt
      if (attempt < retries) {
        console.warn(`AI call failed (attempt ${attempt + 1}/${retries + 1}), retrying...`, lastError.message)
        await new Promise((r) => setTimeout(r, RETRY_DELAY))
      }
    }
  }
  throw lastError!
}

/**
 * Phase 1: Generate star map structure for a new topic.
 */
export async function generateStarMap(
  topicName: string,
  description?: string,
  signal?: AbortSignal,
): Promise<StarMapData> {
  return withRetry(async () => {
    const res = await aiFetch('/api/generate-star-map', { topicName, description }, signal)
    const data = await parseAIResponse<{ starMapData: StarMapData }>(res)
    return data.starMapData
  })
}

/**
 * Phase 2: Map a book to star map nodes.
 * Returns the IDs of nodes that this book should light up.
 */
export async function mapBookNodes(
  bookTitle: string,
  bookAuthor?: string,
  bookDescription?: string,
  unlitNodes?: Array<{ id: string; name: string; description: string }>,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!unlitNodes || unlitNodes.length === 0) return []

  return withRetry(async () => {
    const res = await aiFetch('/api/map-book-nodes', { bookTitle, bookAuthor, bookDescription, unlitNodes }, signal)
    const data = await parseAIResponse<{ litNodeIds: string[] }>(res)
    return data.litNodeIds
  })
}
