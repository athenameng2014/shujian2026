import { useRef, useState, useCallback } from 'react'

interface Transform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5

export function usePanZoom() {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const pinchRef = useRef<{ startDist: number; origScale: number } | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || e.isPrimary) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y }
    }
  }, [transform.x, transform.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setTransform((t) => ({ ...t, x: dragRef.current!.origX + dx, y: dragRef.current!.origY + dy }))
    }
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setTransform((t) => ({ ...t, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale + delta)) }))
  }, [])

  const onPointerCancel = useCallback(() => {
    dragRef.current = null
    pinchRef.current = null
  }, [])

  const style: React.CSSProperties = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
    transition: dragRef.current ? 'none' : 'transform 0.15s ease-out',
    touchAction: 'none',
  }

  return {
    style,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onWheel },
    reset: () => setTransform({ x: 0, y: 0, scale: 1 }),
  }
}
