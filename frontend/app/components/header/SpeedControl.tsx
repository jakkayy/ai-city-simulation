"use client"

import { useEffect, useRef, useState } from "react"
import { useI18n } from "../../lib/i18n"
import { POSITIONS, formatDuration, positionFromSeconds, secondsFromPosition } from "../../lib/speed"

const COMMIT_DELAY_MS = 350

// A slider for the length of one city day (10 s - 10 min). The number follows the thumb while it
// moves; the new speed is sent to the server once the player lets go (or pauses on the keyboard).
export default function SpeedControl({ speed, onSpeed }: { speed: number; onSpeed: (seconds: number) => void }) {
  const { t } = useI18n()
  // The thumb's raw position while it is being moved. The number shown and the value sent are
  // rounded from it, but the thumb itself must not be, or a keyboard step smaller than the
  // rounding step would snap straight back and never move.
  const [draft, setDraft] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const position = draft ?? positionFromSeconds(speed)
  const shown = draft !== null ? secondsFromPosition(draft) : speed

  const commit = (finalPosition: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setDraft(null)
    const seconds = secondsFromPosition(finalPosition)
    if (seconds !== speed) onSpeed(seconds)
  }

  return (
    <div
      className="flex h-[2.4rem] items-center gap-2.5 rounded-xl border border-slate-400/20 bg-slate-800/50 px-3"
      role="group"
      aria-label={t("speed.label")}
      title={t("speed.hint", { label: formatDuration(shown, t) })}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
        <circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.2 1.4" />
      </svg>
      <input
        type="range"
        className="range w-24"
        min={0}
        max={POSITIONS}
        step={5}
        value={position}
        aria-label={t("speed.label")}
        aria-valuetext={formatDuration(shown, t)}
        style={{ "--fill": `${(position / POSITIONS) * 100}%` } as React.CSSProperties}
        onChange={(e) => {
          const next = Number(e.target.value)
          setDraft(next)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => commit(next), COMMIT_DELAY_MS)   // keyboard: no pointer-up to wait for
        }}
        onPointerUp={() => { if (draft !== null) commit(draft) }}
        onBlur={() => { if (draft !== null) commit(draft) }}
      />
      <span className="num w-[4.9rem] shrink-0 text-right text-xs font-bold text-cyan-100">{formatDuration(shown, t)}</span>
    </div>
  )
}
