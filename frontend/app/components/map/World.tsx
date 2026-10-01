"use client"

import { hashString, seededRandom } from "../../lib/avatar"
import { CORE_OFFSET, WORLD } from "../../lib/map/mapLayout"

const ROAD_Y = CORE_OFFSET.y + 238
const ROAD_H = 54
const RIVER = "M40 -10 C62 120 18 220 42 332 C66 444 24 540 46 650"

function trees(seed: string, region: { x0: number; x1: number; y0: number; y1: number }, n: number) {
  const rnd = seededRandom(hashString(seed))
  return Array.from({ length: n }, () => ({
    x: region.x0 + rnd() * (region.x1 - region.x0),
    y: region.y0 + rnd() * (region.y1 - region.y0),
    r: 5 + rnd() * 6,
    tone: rnd() < 0.5,
  }))
}

function mirrored(trees_: ReturnType<typeof trees>) {
  return [...trees_, ...trees_.map((t) => ({ ...t, x: WORLD.w - t.x }))]
}

// One bank of the city: river with boats, the road out to the edge, and the bridge.
// The right bank is this same drawing mirrored, so the world is left/right symmetric.
function Bank({ boats }: { boats: { d: number; b: number; c: string }[] }) {
  const ext = CORE_OFFSET.x + 40
  return (
    <g>
      <path d={RIVER} fill="none" stroke="#06243d" strokeWidth={62} strokeLinecap="round" />
      <path d={RIVER} fill="none" stroke="#0a3a60" strokeWidth={50} strokeLinecap="round" />
      <path className="lane" d={RIVER} fill="none" stroke="#38bdf8" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 22" />
      <path className="lane" style={{ animationDuration: "2.4s" }} d="M28 -10 C50 120 6 220 30 332 C54 444 12 540 34 650" fill="none" stroke="#7dd3fc" strokeOpacity={0.18} strokeWidth={1.5} strokeDasharray="4 30" />

      {boats.map((boat, i) => (
        <g key={i}>
          <path d="M-9 0 L9 0 L6 5 L-6 5 Z" fill={boat.c} />
          <rect x={-2} y={-5} width={6} height={5} fill="#f1f5f9" />
          <animateMotion dur={`${boat.d}s`} begin={`${boat.b}s`} repeatCount="indefinite" path={RIVER} rotate="auto" />
        </g>
      ))}

      {/* main road continues out to the edge */}
      <rect x={0} y={ROAD_Y} width={ext} height={ROAD_H} fill="url(#road)" />
      <path d={`M0 ${ROAD_Y + 2}H${ext}M0 ${ROAD_Y + ROAD_H - 2}H${ext}`} stroke="#33445f" />
      <line className="lane" x1={0} y1={ROAD_Y + ROAD_H / 2} x2={ext} y2={ROAD_Y + ROAD_H / 2} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />

      {/* bridge */}
      <rect x={6} y={ROAD_Y - 6} width={78} height={ROAD_H + 12} rx={4} fill="#1d293c" stroke="#475b7a" />
      {[14, 28, 42, 56, 70].map((x) => (
        <line key={x} x1={x} y1={ROAD_Y - 6} x2={x} y2={ROAD_Y + ROAD_H + 6} stroke="#33445f" strokeWidth={1} />
      ))}
      <line className="lane" x1={6} y1={ROAD_Y + ROAD_H / 2} x2={84} y2={ROAD_Y + ROAD_H / 2} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />
    </g>
  )
}

// Background: land, grid, forest and the two river banks.
export default function World() {
  const forest = [
    ...mirrored(trees("top", { x0: 100, x1: 560, y0: 12, y1: 58 }, 23)),
    ...mirrored(trees("bottom", { x0: 100, x1: 560, y0: 594, y1: 630 }, 17)),
    ...mirrored(trees("mid-a", { x0: 100, x1: 200, y0: 280, y1: 296 }, 3)),
    ...mirrored(trees("mid-b", { x0: 100, x1: 200, y0: 376, y1: 392 }, 3)),
  ]

  return (
    <g>
      <rect width={WORLD.w} height={WORLD.h} fill="#070d19" />
      <rect width={WORLD.w} height={WORLD.h} fill="url(#city-grid)" opacity={0.55} />

      {forest.map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r={t.r} fill={t.tone ? "#0d3a26" : "#114a30"} opacity={0.9} />
          <circle cx={t.x - t.r * 0.25} cy={t.y - t.r * 0.25} r={t.r * 0.45} fill="#22c55e" opacity={0.18} />
        </g>
      ))}

      <Bank boats={[{ d: 34, b: 0, c: "#fde68a" }, { d: 46, b: -19, c: "#fca5a5" }]} />
      <g transform={`translate(${WORLD.w} 0) scale(-1 1)`}>
        <Bank boats={[{ d: 40, b: -11, c: "#a5b4fc" }, { d: 52, b: -30, c: "#86efac" }]} />
      </g>
    </g>
  )
}
