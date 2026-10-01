// Who walks where, and when. Every citizen with a workplace leaves home in the morning,
// follows the roads to work, and comes back in the evening. Everything is derived from the
// citizen's id, zone, job and home position, so it is stable between frames and reloads.

import { hashString, seededRandom } from "../avatar"
import {
  CENTRE_X,
  CORE,
  CORE_OFFSET,
  LEFT_X,
  MAIN_Y,
  PARK_BOX,
  PLOT_W,
  RIGHT_X,
  SLOTS,
} from "./mapLayout"

export interface Pt {
  x: number
  y: number
}

export type Dest = "school" | "factory" | "farm" | "market" | "cbd" | "park"

export function destFor(job: string): Dest {
  switch (job) {
    case "teacher": return "school"
    case "laborer": return "factory"
    case "farmer": return "farm"
    case "service_worker": return "market"
    case "unemployed": return "park"
    default: return "cbd"   // business owners and professionals work in the centre
  }
}

const leftGate = LEFT_X + PLOT_W / 2
const rightGate = RIGHT_X + PLOT_W / 2
const parkGate = CORE_OFFSET.x + PARK_BOX.x + PARK_BOX.w / 2

// where a destination meets the main road (gateX) and where the walker disappears (end)
export const DESTINATIONS: Record<Dest, { gateX: number; end: Pt }> = {
  school: { gateX: leftGate, end: { x: leftGate, y: SLOTS.top.y + SLOTS.top.h + 2 } },
  factory: { gateX: rightGate, end: { x: rightGate, y: SLOTS.top.y + SLOTS.top.h + 2 } },
  market: { gateX: rightGate, end: { x: rightGate, y: SLOTS.mid.y + SLOTS.mid.h + 2 } },
  farm: { gateX: rightGate, end: { x: rightGate, y: SLOTS.bottom.y - 2 } },
  cbd: { gateX: CENTRE_X, end: { x: CENTRE_X, y: MAIN_Y } },
  park: { gateX: parkGate, end: { x: parkGate, y: CORE_OFFSET.y + PARK_BOX.y + 2 } },
}

export function buildRoute(home: Pt, zone: string, dest: Dest): Pt[] {
  const d = DESTINATIONS[dest]
  const pts: Pt[] = [home]
  if (zone === "C") {
    // Zone C lives inside its own loop road, which joins the main road at the centre
    const loopY = CORE_OFFSET.y + CORE.loopTop
    pts.push({ x: home.x, y: loopY }, { x: CENTRE_X, y: loopY }, { x: CENTRE_X, y: MAIN_Y })
  } else {
    pts.push({ x: home.x, y: MAIN_Y })
  }
  pts.push({ x: d.gateX, y: MAIN_Y }, d.end)
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.5)
}

export interface Path {
  pts: Pt[]
  cum: number[]   // distance from the start to each point
  length: number
}

export function makePath(pts: Pt[]): Path {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  }
  return { pts, cum, length: cum[cum.length - 1] }
}

export function pointAt(path: Path, s: number): Pt {
  const d = Math.min(Math.max(s, 0), path.length)
  let i = 1
  while (i < path.cum.length - 1 && path.cum[i] < d) i++
  const seg = path.cum[i] - path.cum[i - 1] || 1
  const t = (d - path.cum[i - 1]) / seg
  const a = path.pts[i - 1]
  const b = path.pts[i]
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export interface Schedule {
  depart: number     // hour the citizen leaves home
  leave: number      // hour they leave the workplace
  speed: number      // world units per hour
}

export const BASE_SPEED = 240

export function scheduleFor(id: string, job: string): Schedule {
  const rnd = seededRandom(hashString(`${id}:schedule`))
  const speed = BASE_SPEED * (0.85 + rnd() * 0.3)
  if (job === "unemployed") {
    const depart = 10 + rnd() * 2.5          // a late-morning walk to the park
    return { depart, leave: depart + 1.5 + rnd() * 1.5, speed }
  }
  return { depart: 6 + rnd() * 2, leave: 16.5 + rnd() * 1.5, speed }
}

export interface CommuteState {
  away: boolean      // not at home right now
  walking: boolean   // visible on the road
  s: number          // distance travelled from home (when walking)
}

export function commuteAt(hour: number, length: number, sched: Schedule): CommuteState {
  const h = ((hour % 24) + 24) % 24
  const travel = Math.max(length, 1) / sched.speed
  const arrive = sched.depart + travel
  const home = sched.leave + travel

  if (h < sched.depart || h >= home) return { away: false, walking: false, s: 0 }
  if (h < arrive) return { away: true, walking: true, s: ((h - sched.depart) / travel) * length }
  if (h < sched.leave) return { away: true, walking: false, s: length }
  return { away: true, walking: true, s: length * (1 - (h - sched.leave) / travel) }
}
