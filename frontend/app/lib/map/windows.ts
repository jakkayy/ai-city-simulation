import { hashString } from "../avatar"
import { ZONE_KEYS } from "../mood"
import { BUILDINGS, LAYOUT } from "./coreLayout"
import { CORE_OFFSET, DISTRICT_WINDOWS } from "./mapLayout"

// Windows that are lit at night: the same grid the zone buildings draw, a stable ~60 % of them.
export function litWindows() {
  const out: { x: number; y: number; w: number; h: number }[] = []
  for (const zone of ZONE_KEYS) {
    const L = LAYOUT[zone]
    const base = L.y + L.bldBase
    BUILDINGS[zone].forEach((b, bi) => {
      const bx = L.x + b.dx
      const by = base - b.h
      const cols = Math.max(2, Math.floor((b.w - 6) / 6))
      const rows = Math.max(2, Math.floor((b.h - 6) / 8))
      for (let n = 0; n < rows * cols; n++) {
        if (hashString(`${zone}:${bi}:${n}`) % 100 >= 62) continue
        out.push({ x: CORE_OFFSET.x + bx + 4 + (n % cols) * 6, y: CORE_OFFSET.y + by + 5 + Math.floor(n / cols) * 8, w: 3, h: 4 })
      }
    })
  }
  return [...out, ...DISTRICT_WINDOWS]
}

export const WINDOWS = litWindows()
