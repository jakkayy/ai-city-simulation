"use client"

import { useI18n } from "../lib/i18n"
import { hashString, seededRandom } from "../lib/avatar"

import { BADGE_MAX_W, CORE_OFFSET, LEFT_X, PLOT_W, RIGHT_X, SLOTS, WORLD } from "../lib/mapLayout"

export { CORE_OFFSET, WORLD }

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
export function World() {
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

// A label + value pill. `tip` is shown on hover (native SVG tooltip) and read by screen readers.
function Badge({ x, y, label, value, color, tip }: { x: number; y: number; label: string; value: string; color: string; tip?: string }) {
  // width follows the text but never exceeds the plot (PLOT_W - 4), so it cannot stick out
  const w = Math.min(BADGE_MAX_W, Math.max(92, 26 + label.length * 6.4 + value.length * 6.6))
  return (
    <g transform={`translate(${x} ${y})`} role={tip ? "img" : undefined} aria-label={tip}>
      {tip && <title>{tip}</title>}
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
  const q = serviceQuality.toFixed(0)

  return (
    <g>
      {/* ── school (teachers) ── */}
      <g transform={`translate(${LEFT_X} ${SLOTS.top.y})`}>
        <Plot x={0} y={0} w={PLOT_W} h={SLOTS.top.h} color="#60a5fa" />
        <rect x={12} y={28} width={54} height={32} rx={3} fill="#1e3a6a" stroke="#60a5fa" strokeOpacity={0.6} />
        <path d="M8 28 L39 14 L70 28 Z" fill="#2c4f8f" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} className="win" x={18 + i * 12} y={38} width={6} height={8} rx={1} fill="#93c5fd" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
        <line x1={84} y1={66} x2={84} y2={28} stroke="#94a3b8" strokeWidth={1.4} />
        <path d="M84 28 L96 32 L84 36 Z" fill="#fb7185" />
        <ellipse cx={40} cy={78} rx={28} ry={9} fill="none" stroke="#60a5fa" strokeOpacity={0.4} />
        <Badge x={2} y={6} label={t("map.school")} value={t("map.people", { n: counts.teacher })} color="#60a5fa" tip={t("map.tip.school", { n: counts.teacher })} />
      </g>

      {/* ── industrial district (labourers) ── */}
      <g transform={`translate(${RIGHT_X} ${SLOTS.top.y})`}>
        <Plot x={0} y={0} w={PLOT_W} h={SLOTS.top.h} color="#f97316" />
        {[0, 1].map((i) => (
          <g key={i}>
            <rect x={12 + i * 54} y={52 + i * 4} width={44} height={34 - i * 4} rx={2} fill="#2a1f14" stroke="#f97316" strokeOpacity={0.5} />
            <rect x={20 + i * 54} y={32 + i * 4} width={8} height={22} fill="#3a2a1a" stroke="#f97316" strokeOpacity={0.4} />
            {[0, 1, 2].map((k) => (
              <circle key={k} className="smoke" cx={24 + i * 54} cy={30 + i * 4} r={4.5} fill="#94a3b8" style={{ animationDelay: `${k * 1.3 + i * 0.7}s` }} />
            ))}
            {[0, 1].map((w) => (
              <rect key={w} className="win" x={20 + i * 54 + w * 14} y={66 + i * 4} width={8} height={6} fill="#fdba74" style={{ animationDelay: `${w * 0.8 + i * 0.3}s` }} />
            ))}
          </g>
        ))}
        <Badge x={2} y={6} label={t("map.factory")} value={t("map.people", { n: counts.laborer })} color="#f97316" tip={t("map.tip.factory", { n: counts.laborer })} />
      </g>

      {/* ── hospital (shows service quality) ── */}
      <g transform={`translate(${LEFT_X} ${SLOTS.mid.y})`}>
        <Plot x={0} y={0} w={PLOT_W} h={SLOTS.mid.h} color="#fb7185" />
        <rect x={14} y={30} width={62} height={48} rx={4} fill="#1f2a44" stroke="#fb7185" strokeOpacity={0.5} />
        <g className="pulse-soft" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <rect x={39} y={38} width={12} height={32} rx={2} fill="#fb7185" />
          <rect x={29} y={48} width={32} height={12} rx={2} fill="#fb7185" />
        </g>
        <circle cx={96} cy={40} r={8} fill="none" stroke="#fda4af" strokeOpacity={0.5} strokeDasharray="2 3" />
        <text x={96} y={43} textAnchor="middle" fontSize={9} fill="#fda4af" fontWeight={800}>H</text>
        <text x={PLOT_W / 2} y={SLOTS.mid.h - 6} textAnchor="middle" fontSize={8.5} fill="#fda4af" opacity={0.9} fontWeight={600}>{t("map.qualityLabel")}</text>
        <Badge x={2} y={6} label={t("map.hospital")} value={q} color="#fb7185" tip={t("map.tip.hospital", { n: q })} />
      </g>

      {/* ── market / services (service workers) ── */}
      <g transform={`translate(${RIGHT_X} ${SLOTS.mid.y})`}>
        <Plot x={0} y={0} w={PLOT_W} h={SLOTS.mid.h} color="#c084fc" />
        <rect x={14} y={40} width={90} height={42} rx={3} fill="#241a3a" stroke="#c084fc" strokeOpacity={0.5} />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={14 + i * 10} y={34} width={10} height={12} fill={i % 2 ? "#e9d5ff" : "#a855f7"} opacity={0.75} />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} className="win" x={24 + i * 26} y={56} width={14} height={14} rx={1.5} fill="#d8b4fe" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
        <Badge x={2} y={6} label={t("map.market")} value={t("map.people", { n: counts.service })} color="#c084fc" tip={t("map.tip.market", { n: counts.service })} />
      </g>

      {/* ── harbour ── */}
      <g transform={`translate(${LEFT_X} ${SLOTS.bottom.y})`}>
        <Plot x={0} y={0} w={PLOT_W} h={SLOTS.bottom.h} color="#38bdf8" />
        <rect x={-32} y={54} width={42} height={8} fill="#334155" />
        <rect x={-32} y={88} width={42} height={8} fill="#334155" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={20 + c * 26} y={34 + r * 34} width={20} height={26} rx={2}
              fill={["#ef4444", "#f59e0b", "#22d3ee", "#a78bfa", "#34d399"][(r * 3 + c) % 5]} opacity={0.65} />
          )),
        )}
        <path d="M24 26 V12 H70 M70 12 V26" fill="none" stroke="#94a3b8" strokeWidth={2} />
        <Badge x={2} y={6} label={t("map.harbor")} value="" color="#38bdf8" />
      </g>

      {/* ── farmland (farmers) ── */}
      <g transform={`translate(${RIGHT_X} ${SLOTS.bottom.y})`}>
        <Plot x={0} y={0} w={PLOT_W} h={SLOTS.bottom.h} color="#a3e635" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={12} y={42 + i * 13} width={56} height={8} rx={3} fill={i % 2 ? "#3f6212" : "#4d7c0f"} opacity={0.75} />
        ))}
        <rect x={78} y={82} width={30} height={28} rx={2} fill="#7f1d1d" stroke="#ef4444" strokeOpacity={0.5} />
        <path d="M74 82 L93 66 L112 82 Z" fill="#b91c1c" />
        <g transform="translate(93 42)">
          <g className="spin-slow" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <path d="M0 0 L2.5 -16 L-2.5 -16 Z M0 0 L16 2.5 L16 -2.5 Z M0 0 L-2.5 16 L2.5 16 Z M0 0 L-16 -2.5 L-16 2.5 Z" fill="#e2e8f0" opacity={0.75} />
          </g>
          <circle r={2.5} fill="#94a3b8" />
        </g>
        <Badge x={2} y={6} label={t("map.farm")} value={t("map.people", { n: counts.farmer })} color="#a3e635" tip={t("map.tip.farm", { n: counts.farmer })} />
      </g>
    </g>
  )
}
