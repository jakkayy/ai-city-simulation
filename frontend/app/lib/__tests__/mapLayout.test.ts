import { describe, expect, it } from "vitest"
import { BADGE_MAX_W, CORE_BORDER, LEFT_X, PLOT_W, RIGHT_X, SLOTS, WORLD } from "../mapLayout"

describe("map layout", () => {
  it("is mirrored left to right", () => {
    // distance from each edge of the world to its plot column is the same
    expect(LEFT_X).toBe(WORLD.w - (RIGHT_X + PLOT_W))
    // and so is the gap between each column and the city core
    expect(CORE_BORDER.left - (LEFT_X + PLOT_W)).toBe(RIGHT_X - CORE_BORDER.right)
  })

  it("centres the core in the world", () => {
    expect(CORE_BORDER.left).toBe(WORLD.w - CORE_BORDER.right)
  })

  it("keeps every plot inside the world and clear of the core", () => {
    expect(LEFT_X).toBeGreaterThan(0)
    expect(RIGHT_X + PLOT_W).toBeLessThan(WORLD.w)
    expect(LEFT_X + PLOT_W).toBeLessThan(CORE_BORDER.left)
    expect(RIGHT_X).toBeGreaterThan(CORE_BORDER.right)
    for (const slot of Object.values(SLOTS)) {
      expect(slot.y).toBeGreaterThan(0)
      expect(slot.y + slot.h).toBeLessThan(WORLD.h)
    }
  })

  it("stacks the slots without overlap", () => {
    expect(SLOTS.top.y + SLOTS.top.h).toBeLessThan(SLOTS.mid.y)
    expect(SLOTS.mid.y + SLOTS.mid.h).toBeLessThan(SLOTS.bottom.y)
  })

  it("lets badges fit inside a plot", () => {
    expect(BADGE_MAX_W).toBeLessThan(PLOT_W)
  })
})
