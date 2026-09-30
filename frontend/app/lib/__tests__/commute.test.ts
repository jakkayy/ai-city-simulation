import { describe, expect, it } from "vitest"
import {
  DESTINATIONS,
  buildRoute,
  commuteAt,
  destFor,
  makePath,
  pointAt,
  scheduleFor,
} from "../commute"
import { CORE_OFFSET, MAIN_Y, WORLD } from "../mapLayout"

const homeA = { x: CORE_OFFSET.x + 120, y: CORE_OFFSET.y + 164 }   // zone A
const homeC = { x: CORE_OFFSET.x + 330, y: CORE_OFFSET.y + 402 }   // zone C

describe("workplaces", () => {
  it("sends each job to its workplace", () => {
    expect(destFor("teacher")).toBe("school")
    expect(destFor("laborer")).toBe("factory")
    expect(destFor("farmer")).toBe("farm")
    expect(destFor("service_worker")).toBe("market")
    expect(destFor("business_owner")).toBe("cbd")
    expect(destFor("professional")).toBe("cbd")
    expect(destFor("unemployed")).toBe("park")
  })

  it("keeps every destination inside the world", () => {
    for (const d of Object.values(DESTINATIONS)) {
      expect(d.end.x).toBeGreaterThan(0)
      expect(d.end.x).toBeLessThan(WORLD.w)
      expect(d.end.y).toBeGreaterThan(0)
      expect(d.end.y).toBeLessThan(WORLD.h)
    }
  })
})

describe("routes", () => {
  it("start at home and end at the destination", () => {
    for (const dest of Object.keys(DESTINATIONS) as (keyof typeof DESTINATIONS)[]) {
      for (const [home, zone] of [[homeA, "A"], [homeC, "C"]] as const) {
        const r = buildRoute(home, zone, dest)
        expect(r[0]).toEqual(home)
        expect(r[r.length - 1]).toEqual(DESTINATIONS[dest].end)
      }
    }
  })

  it("only move along axis-aligned road segments", () => {
    const r = buildRoute(homeC, "C", "farm")
    for (let i = 1; i < r.length; i++) {
      const horizontal = Math.abs(r[i].y - r[i - 1].y) < 0.5
      const vertical = Math.abs(r[i].x - r[i - 1].x) < 0.5
      expect(horizontal || vertical).toBe(true)
    }
  })

  it("join the main road on the way", () => {
    expect(buildRoute(homeA, "A", "factory").some((p) => p.y === MAIN_Y)).toBe(true)
    expect(buildRoute(homeC, "C", "school").some((p) => p.y === MAIN_Y)).toBe(true)
  })

  it("interpolates along the path and clamps at both ends", () => {
    const path = makePath(buildRoute(homeA, "A", "school"))
    expect(pointAt(path, -10)).toEqual(homeA)
    expect(pointAt(path, 0)).toEqual(homeA)
    expect(pointAt(path, path.length + 50)).toEqual(DESTINATIONS.school.end)
    const mid = pointAt(path, path.length / 2)
    expect(Number.isFinite(mid.x) && Number.isFinite(mid.y)).toBe(true)
  })
})

describe("schedules", () => {
  it("are stable for the same citizen", () => {
    expect(scheduleFor("abc", "teacher")).toEqual(scheduleFor("abc", "teacher"))
  })

  it("spread citizens out rather than moving everyone together", () => {
    const departs = new Set(Array.from({ length: 30 }, (_, i) => scheduleFor(`c${i}`, "laborer").depart.toFixed(2)))
    expect(departs.size).toBeGreaterThan(25)
  })

  it("send workers out in the morning and back in the evening", () => {
    for (let i = 0; i < 100; i++) {
      const s = scheduleFor(`w${i}`, "laborer")
      expect(s.depart).toBeGreaterThanOrEqual(6)
      expect(s.depart).toBeLessThanOrEqual(8)
      expect(s.leave).toBeGreaterThanOrEqual(16.5)
      expect(s.leave).toBeLessThanOrEqual(18)
    }
  })

  it("give the unemployed a shorter trip to the park at midday", () => {
    const s = scheduleFor("u1", "unemployed")
    expect(s.depart).toBeGreaterThanOrEqual(10)
    expect(s.leave - s.depart).toBeLessThan(3.5)
  })
})

describe("commute timeline", () => {
  const len = 480
  const sched = { depart: 7, leave: 17, speed: 240 }   // 2 h each way

  it("is home at night and early morning", () => {
    for (const h of [0, 3, 6.9, 23]) {
      expect(commuteAt(h, len, sched)).toEqual({ away: false, walking: false, s: 0 })
    }
  })

  it("walks out in the morning", () => {
    const a = commuteAt(8, len, sched)
    expect(a.away && a.walking).toBe(true)
    expect(a.s).toBeCloseTo(240)
  })

  it("is at work (away, not visible) during the day", () => {
    const s = commuteAt(12, len, sched)
    expect(s.away).toBe(true)
    expect(s.walking).toBe(false)
  })

  it("walks back in the evening and is home afterwards", () => {
    const back = commuteAt(18, len, sched)
    expect(back.walking).toBe(true)
    expect(back.s).toBeCloseTo(240)
    expect(commuteAt(19.01, len, sched).away).toBe(false)
  })

  it("never jumps: distance changes smoothly through the whole day", () => {
    let prev = commuteAt(0, len, sched).s
    for (let h = 0.01; h < 24; h += 0.01) {
      const s = commuteAt(h, len, sched)
      if (s.walking) expect(Math.abs(s.s - prev)).toBeLessThan(10)
      if (s.walking || s.away) prev = s.s
      else prev = 0
    }
  })
})
