import { describe, expect, it } from "vitest"
import { DICTS, type Lang } from "../i18n"
import {
  DEFAULT_SECONDS, MAX_SECONDS, MIN_SECONDS, POSITIONS,
  clampSeconds, formatDuration, positionFromSeconds, secondsFromPosition,
} from "../speed"

const tFor = (lang: Lang) => (key: string, vars?: Record<string, string | number>) => {
  let s = DICTS[lang][key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
  return s
}

describe("day length slider", () => {
  it("spans exactly 10 seconds to 10 minutes", () => {
    expect(secondsFromPosition(0)).toBe(MIN_SECONDS)
    expect(secondsFromPosition(POSITIONS)).toBe(MAX_SECONDS)
    expect(MIN_SECONDS).toBe(10)
    expect(MAX_SECONDS).toBe(600)
  })

  it("never goes outside the range, whatever it is fed", () => {
    for (const p of [-500, -1, POSITIONS + 1, 99999, NaN, Infinity]) {
      const s = secondsFromPosition(p)
      expect(s, `${p}`).toBeGreaterThanOrEqual(MIN_SECONDS)
      expect(s, `${p}`).toBeLessThanOrEqual(MAX_SECONDS)
    }
    expect(clampSeconds(1)).toBe(MIN_SECONDS)
    expect(clampSeconds(99999)).toBe(MAX_SECONDS)
  })

  it("only ever increases as the slider moves right", () => {
    let prev = 0
    for (let p = 0; p <= POSITIONS; p++) {
      const s = secondsFromPosition(p)
      expect(s).toBeGreaterThanOrEqual(prev)
      prev = s
    }
  })

  it("gives the short end more room than a linear scale would", () => {
    // on a linear 10..600 scale the halfway point is 305 s; here it is about 77 s
    const mid = secondsFromPosition(POSITIONS / 2)
    expect(mid).toBeGreaterThan(60)
    expect(mid).toBeLessThan(100)
  })

  it("puts the default (and the useful round numbers) on the track", () => {
    for (const s of [10, 30, DEFAULT_SECONDS, 120, 300, 600]) {
      expect(secondsFromPosition(positionFromSeconds(s)), `${s} s`).toBe(s)
    }
  })

  it("round-trips any value it can produce", () => {
    for (let p = 0; p <= POSITIONS; p += 7) {
      const s = secondsFromPosition(p)
      expect(secondsFromPosition(positionFromSeconds(s))).toBe(s)
    }
  })

  it("steps in tidy amounts: whole seconds at the short end, wider steps for longer days", () => {
    const seen = new Set<number>()
    for (let p = 0; p <= POSITIONS; p++) seen.add(secondsFromPosition(p))
    for (const s of seen) {
      if (s >= 300) expect(s % 30, `${s}`).toBe(0)
      else if (s >= 120) expect(s % 10, `${s}`).toBe(0)
      else if (s >= 30) expect(s % 5, `${s}`).toBe(0)
    }
  })

  it("places values from the server on the track", () => {
    expect(positionFromSeconds(MIN_SECONDS)).toBe(0)
    expect(positionFromSeconds(MAX_SECONDS)).toBe(POSITIONS)
    expect(positionFromSeconds(1)).toBe(0)            // below the range: pinned to the left end
    expect(positionFromSeconds(99999)).toBe(POSITIONS)
  })
})

describe("showing a duration", () => {
  it("is readable in Thai and English", () => {
    expect(formatDuration(10, tFor("en"))).toBe("10 s")
    expect(formatDuration(45, tFor("en"))).toBe("45 s")
    expect(formatDuration(60, tFor("en"))).toBe("1 min")
    expect(formatDuration(90, tFor("en"))).toBe("1 min 30 s")
    expect(formatDuration(600, tFor("en"))).toBe("10 min")
    expect(formatDuration(45, tFor("th"))).toBe("45 วิ")
    expect(formatDuration(60, tFor("th"))).toBe("1 นาที")
    expect(formatDuration(90, tFor("th"))).toBe("1 นาที 30 วิ")
    expect(formatDuration(600, tFor("th"))).toBe("10 นาที")
  })
})
