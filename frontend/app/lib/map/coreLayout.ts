// Geometry of the city core: the three zones, their buildings, the roads between them and
// where the citizen dots sit. Pure data and maths, so the drawing components stay small.

import type { Citizen } from "../types"
import { ZONE_KEYS, type ZoneKey } from "../mood"

// the city core is drawn in its own 760 x 500 space and placed inside the larger world
export const CW = 760

export const LAYOUT: Record<ZoneKey, { x: number; y: number; w: number; h: number; cols: number; dotsY: number; bldBase: number }> = {
  A: { x: 56, y: 52, w: 260, h: 164, cols: 8, dotsY: 112, bldBase: 92 },
  B: { x: 444, y: 52, w: 260, h: 164, cols: 8, dotsY: 112, bldBase: 92 },
  C: { x: 250, y: 318, w: 260, h: 128, cols: 10, dotsY: 84, bldBase: 64 },
}

// building silhouettes: offset from zone left, width, height
export const BUILDINGS: Record<ZoneKey, { dx: number; w: number; h: number }[]> = {
  A: [{ dx: 18, w: 22, h: 44 }, { dx: 48, w: 18, h: 34 }, { dx: 76, w: 30, h: 52 }, { dx: 118, w: 24, h: 38 }, { dx: 152, w: 18, h: 46 }, { dx: 180, w: 26, h: 50 }, { dx: 214, w: 20, h: 32 }],
  B: [{ dx: 18, w: 28, h: 34 }, { dx: 56, w: 34, h: 44 }, { dx: 100, w: 26, h: 28 }, { dx: 136, w: 36, h: 48 }, { dx: 182, w: 26, h: 32 }, { dx: 216, w: 22, h: 38 }],
  C: [{ dx: 16, w: 30, h: 20 }, { dx: 54, w: 30, h: 16 }, { dx: 92, w: 30, h: 22 }, { dx: 130, w: 30, h: 16 }, { dx: 168, w: 30, h: 20 }, { dx: 206, w: 32, h: 18 }],
}

export const ROAD_H = { x: 34, y: 238, w: 692, h: 54 }
export const ROAD_V = { x: 352, y: 30, w: 56, h: 208 }
export const ZONE_C_ACCESS = [
  { x: 198, y: 292, w: 364, h: 18 },
  { x: 198, y: 448, w: 364, h: 18 },
  { x: 198, y: 310, w: 18, h: 138 },
  { x: 544, y: 310, w: 18, h: 138 },
]

export const DOT_GAP = 19
export const DOT_R = 6

export interface Slot {
  citizen: Citizen
  x: number
  y: number
}

export function layoutDots(citizens: Citizen[]): Slot[] {
  const slots: Slot[] = []
  for (const zone of ZONE_KEYS) {
    const L = LAYOUT[zone]
    const members = citizens.filter((c) => c.zone === zone).sort((a, b) => a.id.localeCompare(b.id))
    const ox = L.x + (L.w - (L.cols - 1) * DOT_GAP) / 2
    members.forEach((citizen, i) => {
      slots.push({
        citizen,
        x: ox + (i % L.cols) * DOT_GAP,
        y: L.y + L.dotsY + Math.floor(i / L.cols) * DOT_GAP,
      })
    })
  }
  return slots
}
