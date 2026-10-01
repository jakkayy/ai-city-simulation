import { describe, expect, it } from "vitest"
import { MAX_ZOOM, clampView, clientToWorld, fullView, panBy, viewAround, viewHeight, zoomAt, zoomOf } from "../mapView"

const world = { w: 1000, h: 600 }

describe("map view", () => {
  it("starts showing the whole world", () => {
    const v = fullView(world)
    expect(v).toEqual({ x: 0, y: 0, w: 1000 })
    expect(viewHeight(v, world)).toBe(600)
    expect(zoomOf(v, world)).toBe(1)
  })

  it("never zooms out past the world or in past the maximum", () => {
    expect(zoomAt(fullView(world), 0.5, 500, 300, world).w).toBe(1000)
    let v = fullView(world)
    for (let i = 0; i < 40; i++) v = zoomAt(v, 1.5, 500, 300, world)
    expect(zoomOf(v, world)).toBeCloseTo(MAX_ZOOM, 6)
  })

  it("keeps the point under the cursor fixed while zooming", () => {
    const v = zoomAt(fullView(world), 2, 250, 150, world)
    // screen fraction of the anchor point is unchanged
    expect((250 - v.x) / v.w).toBeCloseTo(0.25, 6)
    expect((150 - v.y) / viewHeight(v, world)).toBeCloseTo(0.25, 6)
  })

  it("keeps the view inside the world", () => {
    const v = clampView({ x: -500, y: 9999, w: 400 }, world)
    expect(v.x).toBe(0)
    expect(v.y).toBe(600 - 240)
    const p = panBy({ x: 100, y: 100, w: 500 }, 5000, 5000, world)
    expect(p.x).toBe(500)
    expect(p.y).toBe(300)
  })

  it("can centre on a point", () => {
    const v = viewAround(500, 300, 2, world)
    expect(v.w).toBe(500)
    expect(v.x + v.w / 2).toBeCloseTo(500)
    expect(v.y + viewHeight(v, world) / 2).toBeCloseTo(300)
  })

  it("maps screen to world with letterboxing", () => {
    const rect = { left: 0, top: 0, width: 1000, height: 1000 } // taller than the world: bars top/bottom
    const p = clientToWorld(500, 500, rect, fullView(world), world)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(300)
    expect(p.scale).toBeCloseTo(1)
  })
})
