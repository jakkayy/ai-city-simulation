// How long one city day lasts, chosen on a slider from 10 seconds to 10 minutes.
// The slider is logarithmic: most of the useful range is near the short end, so a linear
// scale would squeeze 10-60 s into a sliver of the track.

export const MIN_SECONDS = 10
export const MAX_SECONDS = 600
export const DEFAULT_SECONDS = 60
export const POSITIONS = 1000   // resolution of the slider

const RATIO = MAX_SECONDS / MIN_SECONDS

// finer steps where the numbers are small, so 45 s is reachable but 437 s is not required
function roundNice(seconds: number): number {
  const step = seconds < 30 ? 1 : seconds < 120 ? 5 : seconds < 300 ? 10 : 30
  return Math.round(seconds / step) * step
}

export function clampSeconds(seconds: number): number {
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(seconds)))
}

// slider position (0..POSITIONS) -> seconds
export function secondsFromPosition(position: number): number {
  if (!Number.isFinite(position)) return DEFAULT_SECONDS
  const p = Math.min(1, Math.max(0, position / POSITIONS))
  return clampSeconds(roundNice(MIN_SECONDS * Math.pow(RATIO, p)))
}

// seconds -> slider position (0..POSITIONS)
export function positionFromSeconds(seconds: number): number {
  const s = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds))
  return Math.round((Math.log(s / MIN_SECONDS) / Math.log(RATIO)) * POSITIONS)
}

type T = (key: string, vars?: Record<string, string | number>) => string

// 45 -> "45 s", 60 -> "1 min", 90 -> "1 min 30 s"
export function formatDuration(seconds: number, t: T): string {
  const total = Math.round(seconds)
  if (total < 60) return t("speed.sec", { s: total })
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? t("speed.min", { m }) : t("speed.minsec", { m, s })
}
