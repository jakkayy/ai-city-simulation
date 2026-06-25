"use client"

import type { Citizen } from "../lib/types"

const W = 760
const H = 500

const ZONES = {
  A: {
    x: 56,
    y: 52,
    w: 260,
    h: 164,
    bg: "#0b1b3d",
    border: "#60a5fa",
    accent: "#2563eb",
    label: "Zone A",
    sub: "Civic / High Rise",
    capacity: 24,
  },
  B: {
    x: 444,
    y: 52,
    w: 260,
    h: 164,
    bg: "#062817",
    border: "#34d399",
    accent: "#059669",
    label: "Zone B",
    sub: "Mixed Use Quarter",
    capacity: 24,
  },
  C: {
    x: 250,
    y: 304,
    w: 260,
    h: 144,
    bg: "#331305",
    border: "#f59e0b",
    accent: "#d97706",
    label: "Zone C",
    sub: "Residential Blocks",
    capacity: 30,
  },
} as const

type ZoneKey = keyof typeof ZONES

const ROAD_H = { x: 34, y: 238, w: 692, h: 54 }
const ROAD_V = { x: 352, y: 30, w: 56, h: 208 }
const ZONE_C_ACCESS = [
  { x: 198, y: 292, w: 364, h: 18 },
  { x: 198, y: 448, w: 364, h: 18 },
  { x: 198, y: 310, w: 18, h: 138 },
  { x: 544, y: 310, w: 18, h: 138 },
]

const HAPPINESS_FILL = (h: number) => h >= 60 ? "#4ade80" : h >= 35 ? "#fbbf24" : "#fb7185"
const HAPPINESS_STROKE = (h: number) => h >= 60 ? "#166534" : h >= 35 ? "#92400e" : "#9f1239"

const GRID: Record<ZoneKey, { ox: number; oy: number; cols: number }> = {
  A: { ox: 76, oy: 148, cols: 8 },
  B: { ox: 464, oy: 148, cols: 8 },
  C: { ox: 276, oy: 368, cols: 9 },
}

const DOT_R = 6
const DOT_GAP = 19

function BasePlan() {
  const localRoads = [
    { x1: 56, y1: 30, x2: 56, y2: 470 },
    { x1: 124, y1: 30, x2: 124, y2: 470 },
    { x1: 192, y1: 30, x2: 192, y2: 470 },
    { x1: 316, y1: 30, x2: 316, y2: 292 },
    { x1: 444, y1: 30, x2: 444, y2: 292 },
    { x1: 512, y1: 30, x2: 512, y2: 470 },
    { x1: 580, y1: 30, x2: 580, y2: 470 },
    { x1: 704, y1: 30, x2: 704, y2: 470 },
    { x1: 34, y1: 52, x2: 726, y2: 52 },
    { x1: 34, y1: 116, x2: 726, y2: 116 },
    { x1: 34, y1: 216, x2: 726, y2: 216 },
    { x1: 34, y1: 304, x2: 198, y2: 304 },
    { x1: 562, y1: 304, x2: 726, y2: 304 },
    { x1: 34, y1: 374, x2: 198, y2: 374 },
    { x1: 562, y1: 374, x2: 726, y2: 374 },
    { x1: 34, y1: 448, x2: 726, y2: 448 },
  ]

  return (
    <g>
      <rect width={W} height={H} fill="#081321" />
      <rect x={34} y={30} width={692} height={444} rx={16} fill="#0d1726" stroke="#1e293b" strokeWidth={1} />
      {localRoads.map((road, index) => (
        <line
          key={index}
          x1={road.x1}
          y1={road.y1}
          x2={road.x2}
          y2={road.y2}
          stroke="#1f2d3f"
          strokeWidth={2}
          strokeDasharray="1 0"
        />
      ))}
      <rect x={92} y={330} width={96} height={58} rx={10} fill="#123524" stroke="#255f45" opacity={0.75} />
      <path d="M102 374 C126 338 158 338 180 374" fill="none" stroke="#3f7f5a" strokeWidth={4} opacity={0.5} />
      <text x={140} y={362} textAnchor="middle" fontSize={9} fill="#6ee7b7" fontWeight={700}>PARK</text>
      <rect x={572} y={330} width={92} height={58} rx={10} fill="#1e293b" stroke="#475569" opacity={0.72} />
      <text x={618} y={362} textAnchor="middle" fontSize={9} fill="#cbd5e1" fontWeight={700}>SERVICES</text>
    </g>
  )
}

function Roads() {
  return (
    <g>
      <rect x={ROAD_H.x} y={ROAD_H.y} width={ROAD_H.w} height={ROAD_H.h} rx={2} fill="#202b3b" />
      <rect x={ROAD_V.x} y={ROAD_V.y} width={ROAD_V.w} height={ROAD_V.h} rx={2} fill="#202b3b" />
      <rect x={ROAD_V.x} y={ROAD_H.y} width={ROAD_V.w} height={ROAD_H.h} fill="#162132" />
      <rect x={ROAD_V.x + 6} y={ROAD_H.y + 6} width={ROAD_V.w - 12} height={ROAD_H.h - 12} rx={8} fill="#263346" stroke="#334155" />
      {ZONE_C_ACCESS.map((road, index) => (
        <rect key={`c-access-${index}`} x={road.x} y={road.y} width={road.w} height={road.h} rx={4} fill="#1b2636" />
      ))}

      {Array.from({ length: 18 }).map((_, index) => (
        <rect key={`h${index}`} x={52 + index * 38} y={ROAD_H.y + 25} width={22} height={4} rx={2} fill="#64748b" opacity={0.45} />
      ))}
      {Array.from({ length: 7 }).map((_, index) => (
        <rect key={`v${index}`} x={ROAD_V.x + 26} y={ROAD_V.y + 18 + index * 27} width={4} height={16} rx={2} fill="#64748b" opacity={0.45} />
      ))}
      {Array.from({ length: 9 }).map((_, index) => (
        <rect key={`c-top-${index}`} x={218 + index * 34} y={299} width={18} height={3} rx={2} fill="#64748b" opacity={0.35} />
      ))}
      {Array.from({ length: 9 }).map((_, index) => (
        <rect key={`c-bottom-${index}`} x={218 + index * 34} y={456} width={18} height={3} rx={2} fill="#64748b" opacity={0.35} />
      ))}

      <circle cx={ROAD_V.x + ROAD_V.w / 2} cy={ROAD_H.y + ROAD_H.h / 2} r={18} fill="#0f172a" stroke="#475569" strokeWidth={2} />
      <text x={ROAD_V.x + ROAD_V.w / 2} y={ROAD_H.y + ROAD_H.h / 2 + 4} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={800}>
        CBD
      </text>
      <text x={94} y={ROAD_H.y - 8} fontSize={9} fill="#64748b" fontWeight={700}>WEST AVE</text>
      <text x={622} y={ROAD_H.y - 8} fontSize={9} fill="#64748b" fontWeight={700}>EAST AVE</text>
      <text x={ROAD_V.x + ROAD_V.w + 10} y={178} fontSize={9} fill="#64748b" fontWeight={700} transform={`rotate(-90 ${ROAD_V.x + ROAD_V.w + 10} 178)`}>
        CENTRAL BLVD
      </text>
      <text x={380} y={486} textAnchor="middle" fontSize={9} fill="#64748b" fontWeight={700}>RESIDENTIAL LOOP</text>
    </g>
  )
}

function ParcelGrid({ zone }: { zone: ZoneKey }) {
  const z = ZONES[zone]
  const verticals = Array.from({ length: Math.floor(z.w / 38) - 1 })
  const horizontals = Array.from({ length: Math.floor((z.h - 34) / 32) - 1 })

  return (
    <g opacity={0.42}>
      {verticals.map((_, index) => (
        <line
          key={`v-${index}`}
          x1={z.x + 26 + index * 38}
          y1={z.y + 38}
          x2={z.x + 26 + index * 38}
          y2={z.y + z.h - 16}
          stroke={z.border}
          strokeWidth={0.6}
          opacity={0.45}
        />
      ))}
      {horizontals.map((_, index) => (
        <line
          key={`h-${index}`}
          x1={z.x + 14}
          y1={z.y + 62 + index * 32}
          x2={z.x + z.w - 14}
          y2={z.y + 62 + index * 32}
          stroke={z.border}
          strokeWidth={0.6}
          opacity={0.45}
        />
      ))}
    </g>
  )
}

function DistrictBlocks({ zone }: { zone: ZoneKey }) {
  const blocks =
    zone === "A"
      ? [
          { x: 82, y: 84, w: 22, h: 50 }, { x: 112, y: 92, w: 18, h: 42 }, { x: 144, y: 74, w: 30, h: 60 },
          { x: 196, y: 90, w: 24, h: 44 }, { x: 234, y: 82, w: 18, h: 52 }, { x: 272, y: 78, w: 26, h: 58 },
        ]
      : zone === "B"
        ? [
            { x: 466, y: 86, w: 28, h: 44 }, { x: 506, y: 80, w: 34, h: 52 }, { x: 552, y: 92, w: 28, h: 38 },
            { x: 594, y: 78, w: 36, h: 54 }, { x: 642, y: 88, w: 26, h: 42 },
          ]
        : [
            { x: 270, y: 330, w: 34, h: 18 }, { x: 312, y: 330, w: 34, h: 18 }, { x: 354, y: 330, w: 34, h: 18 },
            { x: 396, y: 330, w: 34, h: 18 }, { x: 438, y: 330, w: 34, h: 18 },
            { x: 292, y: 410, w: 34, h: 18 }, { x: 334, y: 410, w: 34, h: 18 }, { x: 376, y: 410, w: 34, h: 18 },
            { x: 418, y: 410, w: 34, h: 18 },
          ]

  return (
    <g opacity={0.78}>
      {blocks.map((block, index) => (
        <g key={index}>
          <rect x={block.x} y={block.y} width={block.w} height={block.h} rx={3} fill={zone === "A" ? "#1d4ed8" : zone === "B" ? "#047857" : "#92400e"} opacity={0.72} />
          {Array.from({ length: Math.max(2, Math.floor(block.w / 8)) }).map((_, col) => (
            <rect
              key={col}
              x={block.x + 5 + col * 8}
              y={block.y + 7}
              width={3}
              height={block.h - 14}
              rx={1}
              fill={zone === "A" ? "#93c5fd" : zone === "B" ? "#86efac" : "#fde68a"}
              opacity={(col + index) % 3 === 0 ? 0.28 : 0.56}
            />
          ))}
        </g>
      ))}
    </g>
  )
}

function ZonePanel({ zone, pop }: { zone: ZoneKey; pop: number }) {
  const z = ZONES[zone]
  const occupancy = Math.min(1, pop / z.capacity)

  return (
    <g>
      <rect x={z.x - 4} y={z.y - 4} width={z.w + 8} height={z.h + 8} rx={16} fill={z.accent} opacity={0.08} />
      <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={14} fill={z.bg} stroke={z.border} strokeWidth={2} />
      <rect x={z.x + 1} y={z.y + 1} width={z.w - 2} height={32} rx={13} fill={z.accent} opacity={0.32} />
      <rect x={z.x + 1} y={z.y + 22} width={z.w - 2} height={12} fill={z.accent} opacity={0.32} />
      <text x={z.x + 16} y={z.y + 20} fontSize={13} fill={z.border} fontWeight={800}>{z.label}</text>
      <text x={z.x + z.w - 16} y={z.y + 20} fontSize={10} fill="#cbd5e1" textAnchor="end">{pop} / {z.capacity}</text>
      <text x={z.x + 16} y={z.y + 48} fontSize={9} fill="#94a3b8" fontWeight={700}>{z.sub}</text>
      <rect x={z.x + z.w - 76} y={z.y + 42} width={58} height={5} rx={3} fill="#0f172a" opacity={0.8} />
      <rect x={z.x + z.w - 76} y={z.y + 42} width={58 * occupancy} height={5} rx={3} fill={z.border} opacity={0.9} />
      <ParcelGrid zone={zone} />
      <DistrictBlocks zone={zone} />
    </g>
  )
}

function CitizenDots({ citizens, zone }: { citizens: Citizen[]; zone: ZoneKey }) {
  const cfg = GRID[zone]
  const zoneCitizens = citizens.filter((citizen) => citizen.zone === zone)

  return (
    <g>
      {zoneCitizens.map((citizen, index) => {
        const col = index % cfg.cols
        const row = Math.floor(index / cfg.cols)
        const cx = cfg.ox + col * DOT_GAP
        const cy = cfg.oy + row * DOT_GAP
        const fill = HAPPINESS_FILL(citizen.happiness)
        const stroke = HAPPINESS_STROKE(citizen.happiness)

        return (
          <g key={citizen.id}>
            <circle cx={cx} cy={cy} r={DOT_R + 4} fill={fill} opacity={0.15} />
            <circle cx={cx} cy={cy} r={DOT_R} fill={fill} stroke={stroke} strokeWidth={1.5} opacity={0.96}>
              {citizen.pending_reaction && (
                <animate attributeName="r" values={`${DOT_R};${DOT_R + 3};${DOT_R}`} dur="1s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={cx - 1.8} cy={cy - 1.8} r={1.8} fill="white" opacity={0.42} />
            <title>{citizen.name} · {citizen.job_type.replace("_", " ")} · happiness {citizen.happiness.toFixed(0)}{citizen.pending_reaction ? " · thinking..." : ""}</title>
          </g>
        )
      })}
    </g>
  )
}

function Legend() {
  const items = [
    { color: "#4ade80", label: "Happy" },
    { color: "#fbbf24", label: "Stable" },
    { color: "#fb7185", label: "At risk" },
  ]

  return (
    <g transform={`translate(58, ${H - 32})`}>
      <rect x={-14} y={-14} width={430} height={30} rx={10} fill="#0f172a" opacity={0.86} stroke="#1e293b" />
      {items.map(({ color, label }, index) => (
        <g key={label} transform={`translate(${index * 96}, 0)`}>
          <circle cx={6} cy={0} r={6} fill={color} />
          <text x={18} y={4} fontSize={10} fill="#cbd5e1" fontWeight={700}>{label}</text>
        </g>
      ))}
      <circle cx={318} cy={0} r={3} fill="#94a3b8" opacity={0.65} />
      <text x={328} y={4} fontSize={10} fill="#94a3b8">pulse = thinking</text>
    </g>
  )
}

function Compass() {
  return (
    <g transform="translate(704, 72)">
      <circle cx={0} cy={0} r={22} fill="#0f172a" stroke="#334155" />
      <path d="M0 -14 L6 8 L0 4 L-6 8 Z" fill="#cbd5e1" />
      <text x={0} y={35} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={800}>N</text>
    </g>
  )
}

interface Props {
  citizens: Citizen[]
  zonePops: { A: number; B: number; C: number }
}

export default function CityMap({ citizens, zonePops }: Props) {
  return (
    <section className="glass-panel overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-semibold text-white">City Map</h2>
          <p className="text-xs text-slate-400">Live zoning, roads, parcels, and citizen sentiment</p>
        </div>
        <span className="hidden rounded-full border border-slate-600/70 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-300 sm:inline-flex">
          Urban plan view
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-slate-700/60 shadow-inner"
        style={{ background: "#081321", maxHeight: "520px" }}
        role="img"
        aria-label="City zoning map with roads, parcels, and citizen happiness markers"
      >
        <BasePlan />
        {(["A", "B", "C"] as ZoneKey[]).map((zone) => (
          <ZonePanel key={zone} zone={zone} pop={zonePops[zone]} />
        ))}
        <Roads />
        {(["A", "B", "C"] as ZoneKey[]).map((zone) => (
          <CitizenDots key={zone} citizens={citizens} zone={zone} />
        ))}
        <Compass />
        <Legend />
      </svg>
    </section>
  )
}
