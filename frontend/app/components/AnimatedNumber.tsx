"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-US")

// Tweens from the previously displayed value to the new one.
export default function AnimatedNumber({ value, format = defaultFormat, duration = 800, className }: Props) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const origin = from.current
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      const next = origin + (value - origin) * eased
      from.current = next
      setShown(next)
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  return <span className={className}>{format(shown)}</span>
}
