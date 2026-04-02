import { useRef, useState, useCallback, useEffect } from 'react'

interface Transform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0

/**
 * Pan/zoom hook with smart touch dispatch:
 * - Single finger: page scrolls normally (no interception)
 * - Two fingers: pinch-to-zoom + pan the map
 * - Mouse wheel: zoom the map (desktop)
 * - Clicks: pass through to children
 *
 * Uses native DOM events (not React synthetic) because we need { passive: false }
 * to call preventDefault() on touchmove and wheel.
 */
export function usePanZoom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })

  // Use refs to avoid stale closures in event handlers
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const pinchRef = useRef<{
    startDist: number
    origScale: number
    startCx: number
    startCy: number
    origX: number
    origY: number
  } | null>(null)
  const updateTransform = useCallback((t: Transform) => {
    t.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale))
    transformRef.current = t
    setTransform(t)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const element = el // non-null alias for closures

    // ── Touch handlers ──
    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length >= 2) {
        // Enter pinch mode: record initial distance and center
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        const cx = (t0.clientX + t1.clientX) / 2
        const cy = (t0.clientY + t1.clientY) / 2
        const t = transformRef.current
        pinchRef.current = {
          startDist: dist,
          origScale: t.scale,
          startCx: cx,
          startCy: cy,
          origX: t.x,
          origY: t.y,
        }
      }
    }

    function handleTouchMove(e: TouchEvent) {
      // Single finger → do nothing, let browser handle page scroll
      if (e.touches.length < 2) return

      // Two+ fingers → intercept and drive map pan/zoom
      e.preventDefault()
      e.stopPropagation()

      const pinch = pinchRef.current
      if (!pinch) return

      const t0 = e.touches[0]
      const t1 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
      const cx = (t0.clientX + t1.clientX) / 2
      const cy = (t0.clientY + t1.clientY) / 2

      const scaleRatio = dist / pinch.startDist
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.origScale * scaleRatio))

      // Pan: offset from initial center position
      const dx = cx - pinch.startCx
      const dy = cy - pinch.startCy

      updateTransform({
        x: pinch.origX + dx,
        y: pinch.origY + dy,
        scale: newScale,
      })
    }

    function handleTouchEnd(e: TouchEvent) {
      // If still have 2+ fingers, recalculate the pinch baseline
      if (e.touches.length >= 2) {
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const t = transformRef.current
        pinchRef.current = {
          startDist: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
          origScale: t.scale,
          startCx: (t0.clientX + t1.clientX) / 2,
          startCy: (t0.clientY + t1.clientY) / 2,
          origX: t.x,
          origY: t.y,
        }
      } else {
        // Fewer than 2 fingers → exit pinch mode
        pinchRef.current = null
      }
    }

    // ── Wheel handler (desktop zoom) ──
    function handleWheel(e: WheelEvent) {
      e.preventDefault()

      const delta = e.deltaY > 0 ? -0.08 : 0.08
      const t = transformRef.current
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale + delta))

      // Zoom toward cursor position
      const rect = element.getBoundingClientRect()
      const cursorX = e.clientX - rect.left - rect.width / 2
      const cursorY = e.clientY - rect.top - rect.height / 2

      const scaleChange = newScale / t.scale
      const newX = cursorX - scaleChange * (cursorX - t.x)
      const newY = cursorY - scaleChange * (cursorY - t.y)

      updateTransform({ x: newX, y: newY, scale: newScale })
    }

    // Attach with passive: false so we can call preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
      element.removeEventListener('wheel', handleWheel)
    }
  }, [updateTransform])

  const reset = useCallback(() => {
    updateTransform({ x: 0, y: 0, scale: 1 })
  }, [updateTransform])

  // Build the style for the SVG <g> transform wrapper
  const style: React.CSSProperties = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
    transition: pinchRef.current ? 'none' : 'transform 0.15s ease-out',
  }

  return { containerRef, transform, style, reset }
}
