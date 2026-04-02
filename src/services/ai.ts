import type { StarMapData } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const POLL_INTERVAL = 5_000 // 5 seconds
const POLL_TIMEOUT = 5 * 60 * 1000 // 5 minutes

/**
 * Publish a job to the server. Returns jobId immediately.
 */
async function publishJob(endpoint: string, body: unknown): Promise<string> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  const data = await res.json() as { jobId?: string; error?: string }
  if (data.error) throw new Error(data.error)
  if (!data.jobId) throw new Error('Server did not return jobId')
  return data.jobId
}

/**
 * Poll a job until it completes or fails.
 */
async function pollUntilDone<T>(jobId: string, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE}/api/job-status/${jobId}`
  const startTime = Date.now()

  while (Date.now() - startTime < POLL_TIMEOUT) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const res = await fetch(url, { signal })
    if (!res.ok) {
      if (res.status === 404) throw new Error('Job expired')
      throw new Error(`Poll error: ${res.status}`)
    }

    const data = await res.json() as {
      status: 'pending' | 'done' | 'failed'
      result?: T
      error?: string
    }

    if (data.status === 'done') return data.result as T
    if (data.status === 'failed') throw new Error(data.error || 'AI processing failed')

    // pending — wait then poll again
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, POLL_INTERVAL)
      if (signal) {
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
      }
    })
  }

  throw new Error('AI processing timed out')
}

// ── Phase 1: Star Map Generation ──

export async function publishStarMapJob(
  topicName: string,
  description?: string,
): Promise<string> {
  return publishJob('/api/generate-star-map', { topicName, description })
}

export async function pollStarMapJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<StarMapData> {
  const result = await pollUntilDone<{ starMapData: StarMapData }>(jobId, signal)
  return result.starMapData
}

// ── Phase 2: Book-Node Mapping ──

export async function publishBookNodesJob(
  bookTitle: string,
  bookAuthor?: string,
  bookDescription?: string,
  unlitNodes?: Array<{ id: string; name: string; description: string }>,
): Promise<string> {
  if (!unlitNodes || unlitNodes.length === 0) throw new Error('No unlit nodes')
  return publishJob('/api/map-book-nodes', { bookTitle, bookAuthor, bookDescription, unlitNodes })
}

export async function pollBookNodesJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const result = await pollUntilDone<{ litNodeIds: string[] }>(jobId, signal)
  return result.litNodeIds
}
