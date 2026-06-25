"use client"

import type { Citizen } from "../lib/types"

// ── layout constants ──────────────────────────────────────────────────────
const W = 600
const H = 420

const ZONES = {
  A: { x: 12,  y: 12,  w: 252, h: 170, bg: "#0f172a", border: "#3b82f6", glow: "#1d4ed8", label: "Zone A", sub: "Affluent District" },
  B: { x: 336, y: 12,  w: 252, h: 170, bg: "#0a1f0a", border: "#22c55e", glow: "#15803d", label: "Zone B", sub: "Middle District"   },
  C: { x: 174, y: 242, w: 252, h: 165, bg: "#1c0a00", border: "#f59e0b", glow: "#b45309", label: "Zone C", sub: "Working District"  },
} as const
type ZoneKey = keyof typeof ZONES

// road box
const ROAD_H = { x: 0, y: 186, w: W, h: 50 }
const ROAD_V = { x: 270, y: 186, w: 60, h: H - 186 }

const HAPPINESS_FILL   = (h: number) => h >= 60 ? "#4ade80" : h >= 35 ? "#fbbf24" : "#f87171"
const HAPPINESS_STROKE = (h: number) => h >= 60 ? "#166534" : h >= 35 ? "#92400e" : "#991b1b"

// citizen grid origin per zone
const GRID: Record<ZoneKey, { ox: number; oy: number; cols: number }> = {
  A: { ox: 22,  oy: 85,  cols: 6 },
  B: { ox: 346, oy: 85,  cols: 6 },
  C: { ox: 184, oy: 310, cols: 6 },
}
const DOT_R  = 8
const DOT_GAP = 22

// ── building shapes ───────────────────────────────────────────────────────
function SkyscraperBuildings() {
  const buildings = [
    { x: 30,  y: 28, w: 22, h: 70 },
    { x: 62,  y: 38, w: 18, h: 60 },
    { x: 90,  y: 22, w: 28, h: 76 },
    { x: 130, y: 32, w: 20, h: 66 },
    { x: 160, y: 42, w: 16, h: 56 },
    { x: 195, y: 28, w: 24, h: 70 },
    { x: 228, y: 36, w: 18, h: 62 },
  ]
  return (
    <g opacity={0.55}>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={2} fill="#1e3a8a" />
          {/* windows */}
          {Array.from({ length: Math.floor(b.h / 10) }).map((_, row) =>
            Array.from({ length: Math.floor(b.w / 7) }).map((_, col) => (
              <rect
                key={`${row}-${col}`}
                x={b.x + 3 + col * 7}
                y={b.y + 5 + row * 10}
                width={3} height={4}
                fill={Math.random() > 0.3 ? "#93c5fd" : "#1e3a8a"}
                opacity={0.9}
              />
            ))
          )}
        </g>
      ))}
    </g>
  )
}

function ApartmentBuildings() {
  const buildings = [
    { x: 346, y: 35, w: 30, h: 55 },
    { x: 386, y: 42, w: 24, h: 48 },
    { x: 420, y: 30, w: 36, h: 60 },
    { x: 468, y: 40, w: 26, h: 50 },
    { x: 504, y: 34, w: 30, h: 56 },
    { x: 544, y: 45, w: 22, h: 45 },
  ]
  return (
    <g opacity={0.55}>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={2} fill="#14532d" />
          {Array.from({ length: Math.floor(b.h / 12) }).map((_, row) =>
            Array.from({ length: Math.floor(b.w / 9) }).map((_, col) => (
              <rect
                key={`${row}-${col}`}
                x={b.x + 3 + col * 9}
                y={b.y + 4 + row * 12}
                width={4} height={5}
                fill="#86efac"
                opacity={0.7}
              />
            ))
          )}
        </g>
      ))}
    </g>
  )
}

function HouseBuildings() {
  const houses = [
    { x: 184, y: 255 }, { x: 216, y: 258 }, { x: 248, y: 253 },
    { x: 280, y: 257 }, { x: 312, y: 254 }, { x: 344, y: 258 },
    { x: 376, y: 255 }, { x: 408, y: 259 },
  ]
  return (
    <g opacity={0.5}>
      {houses.map((h, i) => (
        <g key={i}>
          {/* roof */}
          <polygon
            points={`${h.x},${h.y + 12} ${h.x + 16},${h.y} ${h.x + 32},${h.y + 12}`}
            fill="#92400e"
          />
          {/* walls */}
          <rect x={h.x + 2} y={h.y + 12} width={28} height={20} fill="#78350f" />
          {/* door */}
          <rect x={h.x + 12} y={h.y + 22} width={8} height={10} fill="#451a03" />
          {/* window */}
          <rect x={h.x + 4} y={h.y + 16} width={6} height={6} fill="#fde68a" opacity={0.8} />
          <rect x={h.x + 22} y={h.y + 16} width={6} height={6} fill="#fde68a" opacity={0.8} />
        </g>
      ))}
    </g>
  )
}

// ── road markings ─────────────────────────────────────────────────────────
function Roads() {
  return (
    <g>
      {/* horizontal road */}
      <rect x={ROAD_H.x} y={ROAD_H.y} width={ROAD_H.w} height={ROAD_H.h} fill="#1f2937" />
      {/* vertical road */}
      <rect x={ROAD_V.x} y={ROAD_V.y} width={ROAD_V.w} height={ROAD_V.h} fill="#1f2937" />
      {/* road center dashes — horizontal */}
      {Array.from({ length: 20 }).map((_, i) => (
        <rect key={`h${i}`} x={i * 35} y={ROAD_H.y + 22} width={22} height={4} fill="#374151" rx={2} />
      ))}
      {/* road center dashes — vertical */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={`v${i}`} x={ROAD_V.x + 27} y={ROAD_V.y + 10 + i * 25} width={4} height={16} fill="#374151" rx={2} />
      ))}
      {/* intersection box */}
      <rect x={ROAD_V.x} y={ROAD_H.y} width={ROAD_V.w} height={ROAD_H.h} fill="#111827" />
      {/* city centre label */}
      <text x={ROAD_V.x + ROAD_V.w / 2} y={ROAD_H.y + ROAD_H.h / 2 + 5} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight="bold">
        CITY
      </text>
    </g>
  )
}

// ── zone panel ─────────────────────────────────────────────────────────────
function ZonePanel({ zk, pop }: { zk: ZoneKey; pop: number }) {
  const z = ZONES[zk]
  return (
    <g>
      {/* glow border */}
      <rect x={z.x - 1} y={z.y - 1} width={z.w + 2} height={z.h + 2} rx={10} fill="none" stroke={z.glow} strokeWidth={3} opacity={0.3} />
      {/* background */}
      <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={9} fill={z.bg} stroke={z.border} strokeWidth={1.5} />
      {/* header bar */}
      <rect x={z.x} y={z.y} width={z.w} height={28} rx={9} fill={z.glow} opacity={0.25} />
      <rect x={z.x} y={z.y + 18} width={z.w} height={10} fill={z.glow} opacity={0.25} />
      {/* label */}
      <text x={z.x + 12} y={z.y + 17} fontSize={12} fill={z.border} fontWeight="bold">{z.label}</text>
      <text x={z.x + z.w - 12} y={z.y + 17} fontSize={10} fill="#6b7280" textAnchor="end">{pop} residents</text>
      {/* sublabel */}
      <text x={z.x + 12} y={z.y + 36} fontSize={9} fill="#4b5563">{z.sub}</text>
    </g>
  )
}

// ── citizen dots ──────────────────────────────────────────────────────────
function CitizenDots({ citizens, zone }: { citizens: Citizen[]; zone: ZoneKey }) {
  const cfg = GRID[zone]
  const zc  = citizens.filter((c) => c.zone === zone)

  return (
    <g>
      {zc.map((c, i) => {
        const col = i % cfg.cols
        const row = Math.floor(i / cfg.cols)
        const cx  = cfg.ox + col * DOT_GAP
        const cy  = cfg.oy + row * DOT_GAP
        const fill   = HAPPINESS_FILL(c.happiness)
        const stroke = HAPPINESS_STROKE(c.happiness)

        return (
          <g key={c.id}>
            {/* outer glow ring */}
            <circle cx={cx} cy={cy} r={DOT_R + 3} fill={fill} opacity={0.15} />
            {/* main dot */}
            <circle cx={cx} cy={cy} r={DOT_R} fill={fill} stroke={stroke} strokeWidth={1.5} opacity={0.92}>
              {c.pending_reaction && (
                <animate attributeName="r" values={`${DOT_R};${DOT_R + 3};${DOT_R}`} dur="1s" repeatCount="indefinite" />
              )}
            </circle>
            {/* shine */}
            <circle cx={cx - 2} cy={cy - 2} r={2} fill="white" opacity={0.3} />
            <title>{c.name} · {c.job_type.replace("_", " ")} · ♥ {c.happiness.toFixed(0)}{c.pending_reaction ? " · thinking…" : ""}</title>
          </g>
        )
      })}
    </g>
  )
}

// ── legend ────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: "#4ade80", label: "Happy (≥60)" },
    { color: "#fbbf24", label: "OK (35–59)"  },
    { color: "#f87171", label: "Unhappy (<35)"},
  ]
  return (
    <g transform={`translate(12, ${H - 22})`}>
      {items.map(({ color, label }, i) => (
        <g key={i} transform={`translate(${i * 140}, 0)`}>
          <circle cx={6} cy={6} r={6} fill={color} opacity={0.85} />
          <text x={16} y={10} fontSize={9} fill="#6b7280">{label}</text>
        </g>
      ))}
      <text x={440} y={10} fontSize={9} fill="#4b5563">● pulsing = thinking…</text>
    </g>
  )
}

// ── main component ────────────────────────────────────────────────────────
interface Props {
  citizens: Citizen[]
  zonePops: { A: number; B: number; C: number }
}

export default function CityMap({ citizens, zonePops }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
      <h2 className="text-sm font-semibold text-gray-400 mb-2 px-1">City Map</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg" style={{ background: "#111827" }}>
        {/* background grid */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1f2937" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* zone backgrounds */}
        {(["A", "B", "C"] as ZoneKey[]).map((z) => (
          <ZonePanel key={z} zk={z} pop={zonePops[z]} />
        ))}

        {/* building decorations */}
        <SkyscraperBuildings />
        <ApartmentBuildings />
        <HouseBuildings />

        {/* roads on top of buildings */}
        <Roads />

        {/* citizen dots on top */}
        {(["A", "B", "C"] as ZoneKey[]).map((z) => (
          <CitizenDots key={z} citizens={citizens} zone={z} />
        ))}

        {/* legend */}
        <Legend />
      </svg>
    </div>
  )
}
