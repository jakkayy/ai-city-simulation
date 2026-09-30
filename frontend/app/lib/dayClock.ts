// Time-of-day helpers. A game day is one simulation tick; the map plays it as 00:00 -> 24:00.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

export const DAWN = { from: 5, to: 7.5 }
export const DUSK = { from: 17.5, to: 20 }

// 1 at night, 0 in full daylight, with a smooth ramp at dawn and dusk.
export function nightAmount(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  if (h < DAWN.from) return 1
  if (h < DAWN.to) return 1 - smooth(clamp01((h - DAWN.from) / (DAWN.to - DAWN.from)))
  if (h < DUSK.from) return 0
  if (h < DUSK.to) return smooth(clamp01((h - DUSK.from) / (DUSK.to - DUSK.from)))
  return 1
}

// warm glow strength around sunrise and sunset (0..1)
export function twilightAmount(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  const bump = (centre: number, width: number) => clamp01(1 - Math.abs(h - centre) / width)
  return Math.max(bump(6.3, 1.6), bump(18.8, 1.6))
}

export type Phase = "night" | "dawn" | "day" | "dusk"

export function phaseOf(hour: number): Phase {
  const h = ((hour % 24) + 24) % 24
  if (h < DAWN.from || h >= DUSK.to) return "night"
  if (h < DAWN.to) return "dawn"
  if (h < DUSK.from) return "day"
  return "dusk"
}

export function formatClock(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

// shortest signed distance from `from` to `to` on a 24 h circle
export function circularDelta(from: number, to: number): number {
  let d = (((to - from) % 24) + 24) % 24
  if (d > 12) d -= 24
  return d
}

// One simulation day is one full 00:00 -> 24:00 cycle on the map. With the default of one
// minute per day a morning commute takes a few seconds, slow enough to watch. The floor only
// stops the "Turbo" speed from becoming a strobe.
export const CYCLE_MIN_MS = 5_000

export function cycleMs(intervalSec: number): number {
  return Math.max(CYCLE_MIN_MS, intervalSec * 1000)
}
