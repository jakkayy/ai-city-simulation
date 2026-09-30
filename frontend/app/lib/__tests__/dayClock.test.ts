import { describe, expect, it } from "vitest"
import { CYCLE_MIN_MS, circularDelta, cycleMs, formatClock, nightAmount, phaseOf, twilightAmount } from "../dayClock"

describe("day clock", () => {
  it("is dark at night and bright at noon", () => {
    expect(nightAmount(0)).toBe(1)
    expect(nightAmount(3)).toBe(1)
    expect(nightAmount(12)).toBe(0)
    expect(nightAmount(23)).toBe(1)
  })

  it("ramps smoothly through dawn and dusk without jumps", () => {
    let prev = nightAmount(0)
    for (let h = 0.05; h <= 24; h += 0.05) {
      const n = nightAmount(h)
      expect(Math.abs(n - prev)).toBeLessThan(0.08)
      prev = n
    }
    expect(nightAmount(6)).toBeGreaterThan(0.1)
    expect(nightAmount(6)).toBeLessThan(0.9)
    expect(nightAmount(19)).toBeGreaterThan(0.1)
    expect(nightAmount(19)).toBeLessThan(0.9)
  })

  it("wraps around midnight", () => {
    expect(nightAmount(24)).toBe(nightAmount(0))
    expect(nightAmount(-1)).toBe(nightAmount(23))
  })

  it("has a warm twilight only near sunrise and sunset", () => {
    expect(twilightAmount(12)).toBe(0)
    expect(twilightAmount(2)).toBe(0)
    expect(twilightAmount(6.3)).toBeGreaterThan(0.9)
    expect(twilightAmount(18.8)).toBeGreaterThan(0.9)
  })

  it("names the phase of the day", () => {
    expect(phaseOf(2)).toBe("night")
    expect(phaseOf(6)).toBe("dawn")
    expect(phaseOf(13)).toBe("day")
    expect(phaseOf(18.5)).toBe("dusk")
    expect(phaseOf(21)).toBe("night")
  })

  it("formats the clock", () => {
    expect(formatClock(0)).toBe("00:00")
    expect(formatClock(9.5)).toBe("09:30")
    expect(formatClock(23.99)).toBe("23:59")
    expect(formatClock(24.5)).toBe("00:30")
  })

  it("takes the short way round the clock", () => {
    expect(circularDelta(23, 1)).toBe(2)
    expect(circularDelta(1, 23)).toBe(-2)
    expect(circularDelta(10, 12)).toBe(2)
  })

  it("plays one map day per simulation day", () => {
    expect(cycleMs(60)).toBe(60_000)
    expect(cycleMs(120)).toBe(120_000)
    expect(cycleMs(30)).toBe(30_000)
  })

  it("never spins faster than the floor, so Turbo does not strobe", () => {
    expect(cycleMs(1)).toBe(CYCLE_MIN_MS)
    expect(cycleMs(2)).toBe(CYCLE_MIN_MS)
  })
})
