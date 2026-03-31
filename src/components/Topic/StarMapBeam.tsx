import { useState, useEffect } from 'react'

interface Props {
  fromX: number
  fromY: number
  toX: number
  toY: number
  color: string
}

export default function StarMapBeam({ fromX, fromY, toX, toY, color }: Props) {
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setAnimating(false), 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <line
      x1={fromX}
      y1={fromY}
      x2={toX}
      y2={toY}
      stroke={color}
      strokeWidth={animating ? 1.5 : 0.6}
      strokeOpacity={animating ? 0.7 : 0.2}
      strokeLinecap="round"
      className={animating ? 'star-beam-animated' : ''}
      style={!animating ? { transition: 'stroke-width 0.5s, stroke-opacity 0.5s' } : undefined}
    />
  )
}
