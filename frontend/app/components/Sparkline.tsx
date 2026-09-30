"use client"

import { useId } from "react"

interface Props {
  data: number[]
  color: string
  width?: number
  height?: number
}

export default function Sparkline({ data, color, width = 120, height = 36 }: Props) {
  const id = useId()
  const pad = 3
  const points = data.length > 1 ? data : [data[0] ?? 0, data[0] ?? 0]
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1

  const xy = points.map((v, i) => [
    pad + (i / (points.length - 1)) * (width - pad * 2),
    height - pad - ((v - min) / span) * (height - pad * 2),
  ])

  // smooth curve through the points
  let line = `M${xy[0][0]},${xy[0][1]}`
  for (let i = 1; i < xy.length; i++) {
    const [px, py] = xy[i - 1]
    const [x, y] = xy[i]
    const cx = (px + x) / 2
    line += ` C${cx},${py} ${cx},${y} ${x},${y}`
  }
  const area = `${line} L${xy[xy.length - 1][0]},${height} L${xy[0][0]},${height} Z`
  const [lx, ly] = xy[xy.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={5} fill={color} opacity={0.25} />
      <circle cx={lx} cy={ly} r={2.4} fill={color} />
    </svg>
  )
}
