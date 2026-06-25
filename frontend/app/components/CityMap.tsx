"use client"

import type { Citizen } from "../lib/types"

const ZONE_CONFIG = {
  A: { x: 20, y: 20, w: 180, h: 130, color: "#1d4ed8", label: "Zone A", sublabel: "Affluent" },
  B: { x: 220, y: 20, w: 180, h: 130, color: "#15803d", label: "Zone B", sublabel: "Middle" },
  C: { x: 120, y: 170, w: 180, h: 130, color: "#a16207", label: "Zone C", sublabel: "Working" },
} as const

type ZoneKey = keyof typeof ZONE_CONFIG

const HAPPINESS_COLOR = (h: number) =>
  h >= 60 ? "#4ade80" : h >= 35 ? "#facc15" : "#f87171"

function citizenDots(citizens: Citizen[], zone: ZoneKey) {
  const cfg = ZONE_CONFIG[zone]
  const zc = citizens.filter((c) => c.zone === zone)
  const cols = 5
  const dotR = 6
  const padX = 14
  const padY = 28

  return zc.map((c, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = cfg.x + padX + col * (dotR * 2 + 4)
    const cy = cfg.y + padY + row * (dotR * 2 + 4)
    return (
      <g key={c.id}>
        <circle
          cx={cx}
          cy={cy}
          r={dotR}
          fill={HAPPINESS_COLOR(c.happiness)}
          opacity={0.85}
        >
          {c.pending_reaction && (
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
          )}
        </circle>
        <title>{c.name} — {c.job_type} — ♥ {c.happiness.toFixed(0)}</title>
      </g>
    )
  })
}

interface Props {
  citizens: Citizen[]
  zonePops: { A: number; B: number; C: number }
}

export default function CityMap({ citizens, zonePops }: Props) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-sm font-semibold text-gray-400 mb-2">City Map</h2>
      <svg
        viewBox="0 0 420 320"
        className="w-full"
        style={{ maxHeight: 280 }}
      >
        {/* Road grid lines */}
        <line x1="210" y1="0" x2="210" y2="320" stroke="#374151" strokeWidth="8" />
        <line x1="0" y1="160" x2="420" y2="160" stroke="#374151" strokeWidth="8" />

        {/* Zone rectangles */}
        {(Object.keys(ZONE_CONFIG) as ZoneKey[]).map((z) => {
          const cfg = ZONE_CONFIG[z]
          return (
            <g key={z}>
              <rect
                x={cfg.x} y={cfg.y} width={cfg.w} height={cfg.h}
                rx={8}
                fill={cfg.color}
                opacity={0.2}
                stroke={cfg.color}
                strokeWidth={1.5}
              />
              <text x={cfg.x + 8} y={cfg.y + 14} fontSize={11} fill={cfg.color} fontWeight="bold">
                {cfg.label}
              </text>
              <text x={cfg.x + 8} y={cfg.y + 24} fontSize={9} fill="#9ca3af">
                {cfg.sublabel} · {zonePops[z]} residents
              </text>
              {citizenDots(citizens, z)}
            </g>
          )
        })}

        {/* City centre marker */}
        <circle cx={210} cy={160} r={10} fill="#6b7280" opacity={0.6} />
        <text x={210} y={164} fontSize={9} fill="#e5e7eb" textAnchor="middle">City</text>

        {/* Legend */}
        <g transform="translate(10, 295)">
          {[["#4ade80", "Happy (≥60)"], ["#facc15", "OK (35–59)"], ["#f87171", "Unhappy (<35)"]].map(
            ([color, label], i) => (
              <g key={i} transform={`translate(${i * 130}, 0)`}>
                <circle cx={5} cy={5} r={5} fill={color} opacity={0.85} />
                <text x={13} y={9} fontSize={8} fill="#9ca3af">{label}</text>
              </g>
            )
          )}
        </g>
      </svg>
    </div>
  )
}
