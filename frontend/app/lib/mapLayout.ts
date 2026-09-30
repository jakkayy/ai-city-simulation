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
