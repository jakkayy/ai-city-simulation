import { describe, expect, it } from "vitest"
import type { Citizen } from "../../types"
import { DOT_GAP, LAYOUT, layoutDots } from "../coreLayout"
import { CORE_OFFSET, DISTRICT_WINDOWS, WORLD } from "../mapLayout"
import { WINDOWS } from "../windows"

const citizen = (id: string, zone: "A" | "B" | "C"): Citizen => ({
  id, name: id, zone, happiness: 50, savings: 0, job_type: "teacher", last_action: "", pending_reaction: false,
})

describe("citizen dot slots", () => {
  const citizens = [
    ...Array.from({ length: 15 }, (_, i) => citizen(`a${i}`, "A")),
    ...Array.from({ length: 20 }, (_, i) => citizen(`b${i}`, "B")),
    ...Array.from({ length: 30 }, (_, i) => citizen(`c${i}`, "C")),
  ]
  const slots = layoutDots(citizens)

  it("gives every citizen exactly one slot", () => {
    expect(slots).toHaveLength(citizens.length)
    expect(new Set(slots.map((s) => s.citizen.id)).size).toBe(citizens.length)
  })

  it("keeps each dot inside its zone panel, even when the zone is full", () => {
    for (const { citizen: c, x, y } of slots) {
      const L = LAYOUT[c.zone]
      expect(x).toBeGreaterThan(L.x)
      expect(x).toBeLessThan(L.x + L.w)
      expect(y).toBeGreaterThan(L.y)
      expect(y).toBeLessThan(L.y + L.h)
    }
  })

  it("never puts two dots on top of each other", () => {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(Math.hypot(slots[i].x - slots[j].x, slots[i].y - slots[j].y)).toBeGreaterThanOrEqual(DOT_GAP - 0.01)
      }
    }
  })

  it("is stable: the order of the input does not move anyone", () => {
    const shuffled = layoutDots([...citizens].reverse())
    const at = (list: typeof slots, id: string) => list.find((s) => s.citizen.id === id)!
    for (const c of citizens) {
      expect(at(shuffled, c.id).x).toBe(at(slots, c.id).x)
      expect(at(shuffled, c.id).y).toBe(at(slots, c.id).y)
    }
  })
})

describe("lit windows", () => {
  it("are inside the world", () => {
    for (const w of WINDOWS) {
      expect(w.x).toBeGreaterThan(0)
      expect(w.x + w.w).toBeLessThan(WORLD.w)
      expect(w.y).toBeGreaterThan(0)
      expect(w.y + w.h).toBeLessThan(WORLD.h)
    }
  })

  it("include the district windows and a stable share of the zone windows", () => {
    expect(WINDOWS.length).toBeGreaterThan(DISTRICT_WINDOWS.length + 50)
    const zoneWindows = WINDOWS.slice(0, WINDOWS.length - DISTRICT_WINDOWS.length)
    expect(zoneWindows.every((w) => w.x > CORE_OFFSET.x && w.y > CORE_OFFSET.y)).toBe(true)
  })
})
