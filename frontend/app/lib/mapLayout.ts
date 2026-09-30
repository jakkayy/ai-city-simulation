// Geometry of the city map (world units). Kept separate from the drawing code so the
// left/right symmetry can be checked by a unit test.

export const WORLD = { w: 1120, h: 640 }
export const CORE_OFFSET = { x: 180, y: 70 }

// the city core (zones + roads) is drawn in its own 760-wide space; its outer border sits
// at x = 34 .. 726 in that space
export const CORE_BORDER = { left: CORE_OFFSET.x + 34, right: CORE_OFFSET.x + 726 }

// Six plots in two mirrored columns: same width, heights and distance from the core.
//   left  : school    / hospital / harbour
//   right : industry  / market   / farm
export const PLOT_W = 118
export const LEFT_X = 88
export const RIGHT_X = WORLD.w - LEFT_X - PLOT_W

export const SLOTS = {
  top: { y: 84, h: 96 },
  mid: { y: 196, h: 98 },
  bottom: { y: 398, h: 150 },
} as const

export type SlotName = keyof typeof SLOTS

// widest a badge may be inside a plot
export const BADGE_MAX_W = PLOT_W - 4

// ── core (local 760 x 500 space) ──────────────────────────────────────────
// The park and the services box sit in the free strips either side of Zone C, centred
// horizontally between the core border and the Zone C access road, and vertically between
// the main road and the bottom border.
export const CORE = {
  roadTop: 238,       // main road (local y) and its height
  roadH: 54,
  roadVX: 352,        // central boulevard (local x) and its width
  roadVW: 56,
  loopTop: 301,       // centre lines of the Zone C loop road
  loopBottom: 457,
  loopLeft: 207,
  loopRight: 553,
  borderLeft: 34,
  borderRight: 726,
  borderTop: 30,
  borderBottom: 474,
  roadBottom: 292,
  accessLeft: 198,   // left edge of the left Zone C access road
  accessRight: 562,  // right edge of the right Zone C access road
}

export const SIDE_BOX = { w: 112, h: 72 }

function centred(from: number, to: number, size: number) {
  return from + (to - from - size) / 2
}

const boxY = centred(CORE.roadBottom, CORE.borderBottom, SIDE_BOX.h)

export const PARK_BOX = { x: centred(CORE.borderLeft, CORE.accessLeft, SIDE_BOX.w), y: boxY, ...SIDE_BOX }
export const SERVICES_BOX = { x: centred(CORE.accessRight, CORE.borderRight, SIDE_BOX.w), y: boxY, ...SIDE_BOX }

// ── lights that switch on at night (world units) ───────────────────────────
export const MAIN_Y = CORE_OFFSET.y + CORE.roadTop + CORE.roadH / 2
export const CENTRE_X = WORLD.w / 2

export interface Lamp { x: number; y: number }

function range(from: number, to: number, step: number) {
  const out: number[] = []
  for (let v = from; v <= to; v += step) out.push(v)
  return out
}

export const LAMPS: Lamp[] = [
  // main road, both kerbs, bridge to bridge
  ...range(40, 1080, 70).flatMap((x) => [{ x, y: MAIN_Y - 31 }, { x, y: MAIN_Y + 31 }]),
  // central boulevard
  ...range(CORE_OFFSET.y + 50, CORE_OFFSET.y + 210, 55).flatMap((y) => [
    { x: CENTRE_X - CORE.roadVW / 2 - 4, y },
    { x: CENTRE_X + CORE.roadVW / 2 + 4, y },
  ]),
  // Zone C loop
  ...range(CORE_OFFSET.x + 240, CORE_OFFSET.x + 520, 70).flatMap((x) => [
    { x, y: CORE_OFFSET.y + CORE.loopTop - 12 },
    { x, y: CORE_OFFSET.y + CORE.loopBottom + 12 },
  ]),
]

// windows of the district buildings (x, y, w, h), lit at night
export const DISTRICT_WINDOWS: { x: number; y: number; w: number; h: number }[] = [
  ...[0, 1, 2, 3].map((i) => ({ x: LEFT_X + 18 + i * 12, y: SLOTS.top.y + 38, w: 6, h: 8 })),
  ...[0, 1].flatMap((i) =>
    [0, 1].map((w) => ({ x: RIGHT_X + 20 + i * 54 + w * 14, y: SLOTS.top.y + 66 + i * 4, w: 8, h: 6 })),
  ),
  ...[0, 1, 2].map((i) => ({ x: RIGHT_X + 24 + i * 26, y: SLOTS.mid.y + 56, w: 14, h: 14 })),
]
