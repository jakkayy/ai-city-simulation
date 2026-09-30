"use client"

import { useI18n } from "../lib/i18n"
import { hashString, seededRandom } from "../lib/avatar"

// World coordinates (the city core is drawn inside, offset by CORE_OFFSET).
export const WORLD = { w: 1120, h: 640 }
export const CORE_OFFSET = { x: 180, y: 70 }

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

// Background: land, grid, forest, river with boats, road extensions and the bridge.
export function World() {
  const forest = [
    ...trees("top", { x0: 100, x1: 1100, y0: 12, y1: 58 }, 46),
    ...trees("bottom", { x0: 100, x1: 1100, y0: 594, y1: 630 }, 34),
    ...trees("right-mid", { x0: 925, x1: 1105, y0: 282, y1: 296 }, 6),
    ...trees("right-mid2", { x0: 925, x1: 1105, y0: 376, y1: 392 }, 6),
  ]

  return (
    <g>
      <rect width={WORLD.w} height={WORLD.h} fill="#070d19" />
      <rect width={WORLD.w} height={WORLD.h} fill="url(#city-grid)" opacity={0.55} />

      {/* forest */}
      {forest.map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r={t.r} fill={t.tone ? "#0d3a26" : "#114a30"} opacity={0.9} />
          <circle cx={t.x - t.r * 0.25} cy={t.y - t.r * 0.25} r={t.r * 0.45} fill="#22c55e" opacity={0.18} />
        </g>
      ))}

      {/* river */}
      <path d={RIVER} fill="none" stroke="#06243d" strokeWidth={62} strokeLinecap="round" />
      <path d={RIVER} fill="none" stroke="#0a3a60" strokeWidth={50} strokeLinecap="round" />
      <path className="lane" d={RIVER} fill="none" stroke="#38bdf8" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 22" />
      <path className="lane" style={{ animationDuration: "2.4s" }} d="M28 -10 C50 120 6 220 30 332 C54 444 12 540 34 650" fill="none" stroke="#7dd3fc" strokeOpacity={0.18} strokeWidth={1.5} strokeDasharray="4 30" />

      {[{ d: 34, b: 0, c: "#fde68a" }, { d: 46, b: -19, c: "#fca5a5" }].map((boat, i) => (
        <g key={i}>
          <g>
            <path d="M-9 0 L9 0 L6 5 L-6 5 Z" fill={boat.c} />
            <rect x={-2} y={-5} width={6} height={5} fill="#f1f5f9" />
            <animateMotion dur={`${boat.d}s`} begin={`${boat.b}s`} repeatCount="indefinite" path={RIVER} rotate="auto" />
          </g>
        </g>
      ))}

      {/* main road continues across the bridge and out to both edges */}
      <rect x={0} y={ROAD_Y} width={CORE_OFFSET.x + 40} height={ROAD_H} fill="url(#road)" />
      <rect x={CORE_OFFSET.x + 34 + 692 - 40} y={ROAD_Y} width={WORLD.w - (CORE_OFFSET.x + 34 + 692 - 40)} height={ROAD_H} fill="url(#road)" />
      <path d={`M0 ${ROAD_Y + 2}H${CORE_OFFSET.x + 40}M0 ${ROAD_Y + ROAD_H - 2}H${CORE_OFFSET.x + 40}`} stroke="#33445f" />
      <path d={`M${CORE_OFFSET.x + 686} ${ROAD_Y + 2}H${WORLD.w}M${CORE_OFFSET.x + 686} ${ROAD_Y + ROAD_H - 2}H${WORLD.w}`} stroke="#33445f" />
      <line className="lane" x1={0} y1={ROAD_Y + ROAD_H / 2} x2={CORE_OFFSET.x + 40} y2={ROAD_Y + ROAD_H / 2} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />
      <line className="lane" x1={CORE_OFFSET.x + 686} y1={ROAD_Y + ROAD_H / 2} x2={WORLD.w} y2={ROAD_Y + ROAD_H / 2} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />

      {/* bridge */}
      <rect x={6} y={ROAD_Y - 6} width={78} height={ROAD_H + 12} rx={4} fill="#1d293c" stroke="#475b7a" />
      {[14, 28, 42, 56, 70].map((x) => (
        <line key={x} x1={x} y1={ROAD_Y - 6} x2={x} y2={ROAD_Y + ROAD_H + 6} stroke="#33445f" strokeWidth={1} />
      ))}
      <line className="lane" x1={6} y1={ROAD_Y + ROAD_H / 2} x2={84} y2={ROAD_Y + ROAD_H / 2} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />
    </g>
  )
}

function Badge({ x, y, label, value, color }: { x: number; y: number; label: string; value: string | number; color: string }) {
  const w = 96
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }}>
      <rect width={w} height={18} rx={9} fill="#060b16" stroke={color} strokeOpacity={0.7} opacity={0.94} />
      <text x={9} y={12.5} fontSize={9} fill="#cbd5e1" fontWeight={700}>{label}</text>
      <text x={w - 9} y={12.5} fontSize={10} textAnchor="end" fill={color} fontWeight={800} fontFamily="var(--font-geist-mono), monospace">{value}</text>
    </g>
  )
}

function Plot({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={12} fill="#0a1222" />
      <rect x={x} y={y} width={w} height={h} rx={12} fill={color} opacity={0.08} stroke={color} strokeOpacity={0.45} />
    </>
  )
}

export interface WorkCounts {
  teacher: number
  laborer: number
  farmer: number
  service: number
  business: number
  unemployed: number
}

// Workplaces around the core. The badges show how many citizens work there.
export function Districts({ counts, serviceQuality }: { counts: WorkCounts; serviceQuality: number }) {
  const { t } = useI18n()

  return (
    <g>
      {/* ── school (teachers) ── */}
      <g>
        <Plot x={88} y={84} w={92} h={96} color="#60a5fa" />
        <rect x={98} y={112} width={54} height={32} rx={3} fill="#1e3a6a" stroke="#60a5fa" strokeOpacity={0.6} />
        <path d="M94 112 L125 98 L156 112 Z" fill="#2c4f8f" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} className="win" x={104 + i * 12} y={122} width={6} height={8} rx={1} fill="#93c5fd" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
        <line x1={160} y1={150} x2={160} y2={112} stroke="#94a3b8" strokeWidth={1.4} />
        <path d="M160 112 L172 116 L160 120 Z" fill="#fb7185" />
        <ellipse cx={126} cy={162} rx={28} ry={9} fill="none" stroke="#60a5fa" strokeOpacity={0.4} />
        <Badge x={90} y={90} label={t("map.school")} value={counts.teacher} color="#60a5fa" />
      </g>

      {/* ── hospital (shows service quality) ── */}
      <g>
        <Plot x={88} y={196} w={92} h={98} color="#fb7185" />
        <rect x={104} y={230} width={60} height={48} rx={4} fill="#1f2a44" stroke="#fb7185" strokeOpacity={0.5} />
        <g className="pulse-soft" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <rect x={128} y={238} width={12} height={32} rx={2} fill="#fb7185" />
          <rect x={118} y={248} width={32} height={12} rx={2} fill="#fb7185" />
        </g>
        <circle cx={166} cy={236} r={7} fill="none" stroke="#fda4af" strokeOpacity={0.5} strokeDasharray="2 3" />
        <text x={166} y={239} textAnchor="middle" fontSize={8} fill="#fda4af" fontWeight={800}>H</text>
        <Badge x={90} y={202} label={t("map.hospital")} value={serviceQuality.toFixed(0)} color="#fb7185" />
      </g>

      {/* ── harbour ── */}
      <g>
        <Plot x={88} y={398} w={92} h={150} color="#38bdf8" />
        <rect x={56} y={452} width={42} height={8} fill="#334155" />
        <rect x={56} y={486} width={42} height={8} fill="#334155" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={108 + c * 20} y={430 + r * 28} width={16} height={22} rx={2}
              fill={["#ef4444", "#f59e0b", "#22d3ee", "#a78bfa", "#34d399"][(r * 3 + c) % 5]} opacity={0.65} />
          )),
        )}
        <path d="M112 420 V404 H150 M150 404 V418" fill="none" stroke="#94a3b8" strokeWidth={2} />
        <Badge x={90} y={404 - 6} label={t("map.harbor")} value="" color="#38bdf8" />
      </g>

      {/* ── industrial district (labourers) ── */}
      <g>
        <Plot x={930} y={90} w={176} h={180} color="#f97316" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={944 + i * 54} y={178 + (i % 2) * 10} width={44} height={56 - (i % 2) * 10} rx={2} fill="#2a1f14" stroke="#f97316" strokeOpacity={0.5} />
            <rect x={952 + i * 54} y={150 + (i % 2) * 10} width={8} height={30} fill="#3a2a1a" stroke="#f97316" strokeOpacity={0.4} />
            {[0, 1, 2].map((k) => (
              <circle key={k} className="smoke" cx={956 + i * 54} cy={148 + (i % 2) * 10} r={5} fill="#94a3b8"
                style={{ animationDelay: `${k * 1.3 + i * 0.5}s` }} />
            ))}
            {[0, 1].map((w) => (
              <rect key={w} className="win" x={958 + i * 54 + w * 14} y={200 + (i % 2) * 10} width={8} height={6} fill="#fdba74" style={{ animationDelay: `${w * 0.8 + i * 0.3}s` }} />
            ))}
          </g>
        ))}
        <line className="lane" x1={940} y1={250} x2={1096} y2={250} stroke="#f97316" strokeOpacity={0.4} strokeWidth={2} strokeDasharray="6 8" />
        <Badge x={932} y={96} label={t("map.factory")} value={counts.laborer} color="#f97316" />
      </g>

      {/* ── farmland (farmers) ── */}
      <g>
        <Plot x={930} y={398} w={176} h={168} color="#a3e635" />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={944} y={464 + i * 13} width={86} height={8} rx={3} fill={i % 2 ? "#3f6212" : "#4d7c0f"} opacity={0.75} />
        ))}
        <rect x={1044} y={470} width={44} height={38} rx={2} fill="#7f1d1d" stroke="#ef4444" strokeOpacity={0.5} />
        <path d="M1040 470 L1066 450 L1092 470 Z" fill="#b91c1c" />
        <g transform="translate(1068 436)">
          <line x1={0} y1={0} x2={0} y2={0} />
          <g className="spin-slow" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <path d="M0 0 L3 -22 L-3 -22 Z M0 0 L22 3 L22 -3 Z M0 0 L-3 22 L3 22 Z M0 0 L-22 -3 L-22 3 Z" fill="#e2e8f0" opacity={0.75} />
          </g>
          <circle r={3} fill="#94a3b8" />
        </g>
        <Badge x={932} y={404} label={t("map.farm")} value={counts.farmer} color="#a3e635" />
      </g>
    </g>
  )
}
