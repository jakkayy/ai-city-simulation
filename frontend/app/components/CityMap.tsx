"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../lib/i18n"
import Avatar from "./Avatar"
import { CORE_OFFSET, Districts, World, WORLD, type WorkCounts } from "./Districts"
import { useMapView } from "../lib/useMapView"
import { viewAround } from "../lib/mapView"
import type { Citizen } from "../lib/types"
import { moodColor, MOOD, ZONE_KEYS, ZONE_META, type ZoneKey } from "../lib/mood"

// the city core is drawn in its own 760 x 500 space and placed inside the larger world
const CW = 760

const LAYOUT: Record<ZoneKey, { x: number; y: number; w: number; h: number; cols: number; dotsY: number; bldBase: number }> = {
  A: { x: 56, y: 52, w: 260, h: 164, cols: 8, dotsY: 112, bldBase: 92 },
  B: { x: 444, y: 52, w: 260, h: 164, cols: 8, dotsY: 112, bldBase: 92 },
  C: { x: 250, y: 318, w: 260, h: 128, cols: 10, dotsY: 84, bldBase: 64 },
}

// building silhouettes: offset from zone left, width, height
const BUILDINGS: Record<ZoneKey, { dx: number; w: number; h: number }[]> = {
  A: [{ dx: 18, w: 22, h: 44 }, { dx: 48, w: 18, h: 34 }, { dx: 76, w: 30, h: 52 }, { dx: 118, w: 24, h: 38 }, { dx: 152, w: 18, h: 46 }, { dx: 180, w: 26, h: 50 }, { dx: 214, w: 20, h: 32 }],
  B: [{ dx: 18, w: 28, h: 34 }, { dx: 56, w: 34, h: 44 }, { dx: 100, w: 26, h: 28 }, { dx: 136, w: 36, h: 48 }, { dx: 182, w: 26, h: 32 }, { dx: 216, w: 22, h: 38 }],
  C: [{ dx: 16, w: 30, h: 20 }, { dx: 54, w: 30, h: 16 }, { dx: 92, w: 30, h: 22 }, { dx: 130, w: 30, h: 16 }, { dx: 168, w: 30, h: 20 }, { dx: 206, w: 32, h: 18 }],
}

const ROAD_H = { x: 34, y: 238, w: 692, h: 54 }
const ROAD_V = { x: 352, y: 30, w: 56, h: 208 }
const ZONE_C_ACCESS = [
  { x: 198, y: 292, w: 364, h: 18 },
  { x: 198, y: 448, w: 364, h: 18 },
  { x: 198, y: 310, w: 18, h: 138 },
  { x: 544, y: 310, w: 18, h: 138 },
]

const DOT_GAP = 19
const DOT_R = 6

interface Slot {
  citizen: Citizen
  x: number
  y: number
}

function layoutDots(citizens: Citizen[]): Slot[] {
  const slots: Slot[] = []
  for (const zone of ZONE_KEYS) {
    const L = LAYOUT[zone]
    const members = citizens.filter((c) => c.zone === zone).sort((a, b) => a.id.localeCompare(b.id))
    const ox = L.x + (L.w - (L.cols - 1) * DOT_GAP) / 2
    members.forEach((citizen, i) => {
      slots.push({
        citizen,
        x: ox + (i % L.cols) * DOT_GAP,
        y: L.y + L.dotsY + Math.floor(i / L.cols) * DOT_GAP,
      })
    })
  }
  return slots
}

function Defs() {
  return (
    <defs>
      <pattern id="city-grid" width="22" height="22" patternUnits="userSpaceOnUse">
        <path d="M22 0H0V22" fill="none" stroke="#1b2a42" strokeWidth={0.6} />
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="55%" stopColor="#000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000" stopOpacity={0.6} />
      </radialGradient>
      <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#222e42" />
        <stop offset="100%" stopColor="#192233" />
      </linearGradient>
      {ZONE_KEYS.map((z) => (
        <linearGradient key={z} id={`zone-${z}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ZONE_META[z].color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={ZONE_META[z].color} stopOpacity={0.05} />
        </linearGradient>
      ))}
      <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2.5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

function Ground() {
  const { t } = useI18n()
  return (
    <g>
      <rect x={34} y={30} width={692} height={444} rx={18} fill="none" stroke="#22324d" strokeWidth={1} />

      {/* park */}
      <g>
        <rect x={84} y={326} width={112} height={72} rx={14} fill="#0c2a1f" stroke="#1f6b4c" strokeOpacity={0.6} />
        {[[104, 350], [124, 368], [150, 346], [172, 372], [140, 384]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill="#14532d" opacity={0.85} />
            <circle cx={x - 2} cy={y - 2} r={4} fill="#22c55e" opacity={0.35} />
          </g>
        ))}
        <text x={140} y={340} textAnchor="middle" fontSize={8} fill="#6ee7b7" fontWeight={700} letterSpacing={1.2}>{t("map.park")}</text>
      </g>

      {/* services */}
      <g>
        <rect x={568} y={326} width={104} height={72} rx={14} fill="#10203a" stroke="#3b6ea8" strokeOpacity={0.55} />
        <path d="M620 346v24M608 358h24" stroke="#7dd3fc" strokeWidth={4} strokeLinecap="round" opacity={0.75} />
        <text x={620} y={390} textAnchor="middle" fontSize={8} fill="#93c5fd" fontWeight={700} letterSpacing={1.2}>{t("map.services")}</text>
      </g>
    </g>
  )
}

function Roads() {
  const mid = ROAD_H.y + ROAD_H.h / 2
  const cx = ROAD_V.x + ROAD_V.w / 2
  return (
    <g>
      <rect x={ROAD_H.x} y={ROAD_H.y} width={ROAD_H.w} height={ROAD_H.h} fill="url(#road)" />
      <rect x={ROAD_V.x} y={ROAD_V.y} width={ROAD_V.w} height={ROAD_V.h} fill="url(#road)" />
      {ZONE_C_ACCESS.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={3} fill="#172031" />
      ))}

      {/* edge lines */}
      <path d={`M${ROAD_H.x} ${ROAD_H.y + 2}H${ROAD_H.x + ROAD_H.w}M${ROAD_H.x} ${ROAD_H.y + ROAD_H.h - 2}H${ROAD_H.x + ROAD_H.w}`} stroke="#33445f" strokeWidth={1} />

      {/* flowing lane markers */}
      <line className="lane" x1={ROAD_H.x + 6} y1={mid} x2={ROAD_H.x + ROAD_H.w - 6} y2={mid} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />
      <line className="lane" x1={cx} y1={ROAD_V.y + 6} x2={cx} y2={ROAD_H.y - 4} stroke="#8aa0c0" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="12 10" />
      <line x1={218} y1={301} x2={542} y2={301} stroke="#8aa0c0" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="8 8" />
      <line x1={218} y1={457} x2={542} y2={457} stroke="#8aa0c0" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="8 8" />

      {/* CBD roundabout */}
      <circle cx={cx} cy={mid} r={22} fill="#0b1324" stroke="#3a5078" strokeWidth={2} />
      <circle cx={cx} cy={mid} r={16} fill="none" stroke="#22d3ee" strokeOpacity={0.35} strokeDasharray="3 4" />
      <text x={cx} y={mid + 3} textAnchor="middle" fontSize={8} fill="#a5f3fc" fontWeight={800} letterSpacing={1}>CBD</text>

      <g fontSize={8} fill="#62738f" fontWeight={700} letterSpacing={1.4}>
        <text x={92} y={ROAD_H.y - 7}>WEST AVE</text>
        <text x={620} y={ROAD_H.y - 7}>EAST AVE</text>
        <text transform={`translate(${ROAD_V.x + ROAD_V.w + 12} 170) rotate(-90)`}>CENTRAL BLVD</text>
        <text x={380} y={486} textAnchor="middle">RESIDENTIAL LOOP</text>
      </g>
    </g>
  )
}

function Traffic() {
  const cars: { path: string; dur: number; begin: number; color: string; vertical?: boolean }[] = [
    { path: `M40 ${ROAD_H.y + 14} H720`, dur: 14, begin: 0, color: "#67e8f9" },
    { path: `M40 ${ROAD_H.y + 14} H720`, dur: 14, begin: -7, color: "#f9a8d4" },
    { path: `M720 ${ROAD_H.y + 40} H40`, dur: 17, begin: -3, color: "#fde68a" },
    { path: `M720 ${ROAD_H.y + 40} H40`, dur: 17, begin: -11, color: "#a5b4fc" },
    { path: `M${ROAD_V.x + 14} 32 V${ROAD_H.y + 10}`, dur: 8, begin: -2, color: "#86efac", vertical: true },
    { path: `M${ROAD_V.x + 42} ${ROAD_H.y + 10} V32`, dur: 9, begin: -6, color: "#fdba74", vertical: true },
    { path: `M207 301 H553 V457 H207 Z`, dur: 22, begin: 0, color: "#67e8f9" },
  ]
  return (
    <g>
      {cars.map((c, i) => (
        <g key={i} filter="url(#soft-glow)">
          <rect x={-5} y={-2} width={10} height={4} rx={2} fill={c.color} opacity={0.95} />
          <animateMotion dur={`${c.dur}s`} begin={`${c.begin}s`} repeatCount="indefinite" path={c.path} rotate="auto" />
        </g>
      ))}
    </g>
  )
}

function ZonePanel({ zone, pop, avg }: { zone: ZoneKey; pop: number; avg: number | null }) {
  const { t } = useI18n()
  const L = LAYOUT[zone]
  const meta = ZONE_META[zone]
  const fill = Math.min(1, pop / meta.capacity)
  const base = L.y + L.bldBase

  return (
    <g>
      <rect x={L.x - 6} y={L.y - 6} width={L.w + 12} height={L.h + 12} rx={20} fill={meta.color} opacity={0.1} filter="url(#blur-glow)" />
      <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={14} fill="#0a1222" />
      <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={14} fill={`url(#zone-${zone})`} stroke={meta.color} strokeOpacity={0.75} strokeWidth={1.5} />

      {/* header */}
      <text x={L.x + 16} y={L.y + 22} fontSize={13} fill={meta.color} fontWeight={800}>{t("zone.name", { z: zone })}</text>
      <text x={L.x + 16} y={L.y + 36} fontSize={8} fill="#8fa0bb" fontWeight={600} letterSpacing={0.4}>{t(`zone.${zone}.sub`)}</text>
      <text x={L.x + L.w - 16} y={L.y + 22} fontSize={11} fill="#e2e8f0" textAnchor="end" fontWeight={700} fontFamily="var(--font-geist-mono), monospace">
        {pop}/{meta.capacity}
      </text>
      <rect x={L.x + L.w - 76} y={L.y + 30} width={60} height={4} rx={2} fill="#0f172a" />
      <rect x={L.x + L.w - 76} y={L.y + 30} width={60 * fill} height={4} rx={2} fill={meta.color} style={{ transition: "width .8s" }} />
      {avg !== null && (
        <circle cx={L.x + L.w - 86} cy={L.y + 32} r={3} fill={moodColor(avg)} filter="url(#soft-glow)" />
      )}

      {/* buildings */}
      {BUILDINGS[zone].map((b, i) => {
        const bx = L.x + b.dx
        const by = base - b.h
        const cols = Math.max(2, Math.floor((b.w - 6) / 6))
        const rows = Math.max(2, Math.floor((b.h - 6) / 8))
        return (
          <g key={i}>
            <rect x={bx} y={by} width={b.w} height={b.h} rx={2.5} fill={meta.color} opacity={0.16} />
            <rect x={bx} y={by} width={b.w} height={b.h} rx={2.5} fill="none" stroke={meta.color} strokeOpacity={0.45} strokeWidth={0.8} />
            {Array.from({ length: rows * cols }).map((_, n) => {
              const r = Math.floor(n / cols)
              const c = n % cols
              return (
                <rect
                  key={n}
                  className="win"
                  x={bx + 4 + c * 6}
                  y={by + 5 + r * 8}
                  width={3}
                  height={4}
                  rx={0.6}
                  fill={meta.color}
                  style={{ animationDelay: `${((n * 7 + i * 13 + (zone === "A" ? 0 : zone === "B" ? 3 : 6)) % 40) / 10}s`, animationDuration: `${3 + ((n + i) % 4)}s` }}
                />
              )
            })}
          </g>
        )
      })}
      <line x1={L.x + 10} x2={L.x + L.w - 10} y1={base + 4} y2={base + 4} stroke={meta.color} strokeOpacity={0.25} />
    </g>
  )
}

interface Props {
  citizens: Citizen[]
  zonePops: { A: number; B: number; C: number }
  highlightId: string | null
  onHover: (id: string | null) => void
  serviceQuality?: number
}

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-slate-950/70 text-slate-200 backdrop-blur transition hover:border-cyan-300/60 hover:text-white disabled:opacity-35"
    >
      {children}
    </button>
  )
}

export default function CityMap({ citizens, zonePops, highlightId, onHover, serviceQuality = 0 }: Props) {
  const { t } = useI18n()
  const [glow, setGlow] = useState(true)
  const [localHover, setLocalHover] = useState<string | null>(null)
  const slots = useMemo(() => layoutDots(citizens), [citizens])
  const { svgRef, view, zoom, dragging, handlers, zoomIn, zoomOut, reset, focus, pan } = useMapView(WORLD)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === wrapRef.current || fullscreen)
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener("fullscreenchange", onChange)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false) }
    window.addEventListener("keydown", onKey)
    void sync
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      window.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleFullscreen = async () => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
      return
    }
    if (fullscreen) { setFullscreen(false); return }   // fallback overlay is on
    if (el.requestFullscreen) {
      try { await el.requestFullscreen(); return } catch {}
    }
    setFullscreen(true)   // browsers without the Fullscreen API: fill the window instead
  }

  // phones: start on the city centre instead of the tiny whole-world view
  useEffect(() => {
    if (window.innerWidth < 640) {
      focus(viewAround(CORE_OFFSET.x + CW / 2, CORE_OFFSET.y + 250, 1.45, WORLD))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const avg = useMemo(() => {
    const out: Record<ZoneKey, number | null> = { A: null, B: null, C: null }
    for (const z of ZONE_KEYS) {
      const m = citizens.filter((c) => c.zone === z)
      out[z] = m.length ? m.reduce((s, c) => s + c.happiness, 0) / m.length : null
    }
    return out
  }, [citizens])

  const counts: WorkCounts = useMemo(() => {
    const n = (job: string) => citizens.filter((c) => c.job_type === job).length
    return {
      teacher: n("teacher"),
      laborer: n("laborer"),
      farmer: n("farmer"),
      service: n("service_worker"),
      business: n("business_owner") + n("professional"),
      unemployed: n("unemployed"),
    }
  }, [citizens])

  const activeId = localHover ?? highlightId
  const active = slots.find((s) => s.citizen.id === activeId)

  const hover = (id: string | null) => {
    setLocalHover(id)
    onHover(id)
  }

  const focusCore = () =>
    focus(viewAround(CORE_OFFSET.x + CW / 2, CORE_OFFSET.y + 250, 1.45, WORLD))

  const v = view
  const vh = (v.w * WORLD.h) / WORLD.w
  const zoomed = zoom > 1.02

  const workplaces = [
    { label: t("map.school"), n: counts.teacher, c: "#60a5fa" },
    { label: t("map.factory"), n: counts.laborer, c: "#f97316" },
    { label: t("map.farm"), n: counts.farmer, c: "#a3e635" },
    { label: t("map.cbd"), n: counts.business, c: "#22d3ee" },
    { label: t("map.services"), n: counts.service, c: "#7dd3fc" },
    { label: t("job.unemployed"), n: counts.unemployed, c: "#94a3b8" },
  ]

  return (
    <section
      ref={wrapRef}
      className={
        fullscreen
          ? "fixed inset-0 z-[250] flex flex-col gap-3 bg-[#05070d] p-4"
          : "panel fade-up flex flex-col gap-3.5 overflow-hidden rounded-2xl p-4"
      }
      style={fullscreen ? undefined : { animationDelay: "300ms" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-semibold text-white">{t("map.title")}</h2>
          <p className="text-xs text-slate-400">{t("map.sub")}</p>
        </div>
        <button className="chip focus-ring" data-active={glow} onClick={() => setGlow((g) => !g)} aria-pressed={glow}>
          {t("map.glow")}
        </button>
      </div>

      <div
        className={`relative overflow-hidden rounded-xl border border-white/[0.08] ${fullscreen ? "min-h-0 flex-1" : ""}`}
        tabIndex={0}
        aria-label={t("map.zoomHint")}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") zoomIn()
          else if (e.key === "-") zoomOut()
          else if (e.key === "0") reset()
          else if (e.key === "ArrowLeft") pan(-0.15, 0)
          else if (e.key === "ArrowRight") pan(0.15, 0)
          else if (e.key === "ArrowUp") pan(0, -0.15)
          else if (e.key === "ArrowDown") pan(0, 0.15)
          else return
          e.preventDefault()
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`${v.x} ${v.y} ${v.w} ${vh}`}
          className={`block ${fullscreen ? "h-full w-full" : "w-full"}`}
          style={{ cursor: dragging ? "grabbing" : zoomed ? "grab" : "default", touchAction: zoomed ? "none" : "pan-y" }}
          role="img"
          aria-label="City map with zones, roads, and citizen happiness markers"
          {...handlers}
        >
          <Defs />
          <World />
          <Districts counts={counts} serviceQuality={serviceQuality} />

          <g transform={`translate(${CORE_OFFSET.x} ${CORE_OFFSET.y})`}>
            <Ground />
            {ZONE_KEYS.map((z) => (
              <ZonePanel key={z} zone={z} pop={zonePops[z]} avg={avg[z]} />
            ))}
            <Roads />
            <Traffic />

            {glow && (
              <g filter="url(#blur-glow)" opacity={0.55} style={{ pointerEvents: "none" }}>
                {slots.map(({ citizen, x, y }) => (
                  <circle key={citizen.id} cx={x} cy={y} r={11} fill={moodColor(citizen.happiness)} opacity={0.5} />
                ))}
              </g>
            )}

            {slots.map(({ citizen, x, y }) => {
              const color = moodColor(citizen.happiness)
              const on = citizen.id === activeId
              return (
                <g
                  key={citizen.id}
                  className="map-dot"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  onMouseEnter={() => hover(citizen.id)}
                  onMouseLeave={() => hover(null)}
                >
                  <circle r={DOT_R + 5} fill="transparent" />
                  {on && <circle r={DOT_R + 4} fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={1.5} />}
                  {citizen.pending_reaction && <circle className="think-ring" r={DOT_R} stroke={color} />}
                  <circle className="core" r={on ? DOT_R + 1 : DOT_R} fill={color} stroke="#04070d" strokeWidth={1.5} />
                  <circle cx={-1.8} cy={-1.8} r={1.7} fill="#fff" opacity={0.5} />
                </g>
              )
            })}

            {active && <Tooltip slot={active} />}

            {/* compass */}
            <g transform="translate(700, 452)" opacity={0.85}>
              <circle r={16} fill="#0b1324" stroke="#334766" />
              <path d="M0 -10 L4.5 6 L0 3 L-4.5 6 Z" fill="#cbd5e1" />
              <text y={-19} textAnchor="middle" fontSize={7} fill="#7e8fab" fontWeight={800}>N</text>
            </g>
          </g>
          <rect width={WORLD.w} height={WORLD.h} fill="url(#vignette)" pointerEvents="none" />
        </svg>

        {/* view controls */}
        <div className="absolute right-3 top-2.5 flex flex-row gap-1.5">
          <IconButton label={fullscreen ? t("map.exitFullscreen") : t("map.fullscreen")} onClick={toggleFullscreen}>
            {fullscreen ? (
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M2 6V2h4M14 10v4h-4M10 2h4v4M6 14H2v-4" /></svg>
            )}
          </IconButton>
          <IconButton label={t("map.zoomIn")} onClick={zoomIn} disabled={zoom >= 4.98}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          </IconButton>
          <IconButton label={t("map.zoomOut")} onClick={zoomOut} disabled={!zoomed}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M3 8h10" /></svg>
          </IconButton>
          <IconButton label={t("map.focusCore")} onClick={focusCore}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="8" cy="8" r="2.4" /><path d="M8 1v3M8 12v3M1 8h3M12 8h3" /></svg>
          </IconButton>
          <IconButton label={t("map.fit")} onClick={reset} disabled={!zoomed}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /></svg>
          </IconButton>
        </div>

        {zoomed && (
          <div className="num pointer-events-none absolute bottom-3 left-3 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-slate-300">
            ×{zoom.toFixed(1)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 px-1 pt-1 text-xs text-slate-300">
        {[
          { c: MOOD.happy, l: t("map.happy") },
          { c: MOOD.stable, l: t("map.stable") },
          { c: MOOD.risk, l: t("map.risk") },
        ].map(({ c, l }) => (
          <span key={l} className="flex items-center gap-2 font-medium">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
            {l}
          </span>
        ))}
        <span className="flex items-center gap-2 text-slate-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-300 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-400" />
          </span>
          {t("map.thinking")}
        </span>
        <span className="ml-auto hidden text-slate-500 md:inline">{t("map.zoomHint")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 px-1 pb-1" aria-label={t("map.workplaces")}>
        <span className="eyebrow mr-1">{t("map.workplaces")}</span>
        {workplaces.map((w) => (
          <span key={w.label} className="chip" style={{ borderColor: `${w.c}55` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: w.c }} />
            {w.label}
            <span className="num font-bold" style={{ color: w.c }}>{w.n}</span>
          </span>
        ))}
      </div>
    </section>
  )
}

function Tooltip({ slot }: { slot: Slot }) {
  const { citizen: c, x, y } = slot
  const { t } = useI18n()
  const tw = 190
  const th = 50
  const tx = Math.min(CW - tw - 6, Math.max(6, x - tw / 2))
  const ty = y - th - 14 < 8 ? y + 16 : y - th - 14
  return (
    <g style={{ pointerEvents: "none" }} transform={`translate(${tx} ${ty})`}>
      <rect width={tw} height={th} rx={8} fill="#060b16" stroke={moodColor(c.happiness)} strokeOpacity={0.7} opacity={0.96} />
      <Avatar seed={c.id} happiness={c.happiness} job={c.job_type} color={ZONE_META[c.zone].color} size={38} x={7} y={6} />
      <text x={54} y={21} fontSize={11} fill="#fff" fontWeight={700}>{c.name}</text>
      <text x={54} y={36} fontSize={9} fill="#94a3b8">{t(`job.${c.job_type}`)}</text>
      <text x={tw - 10} y={36} fontSize={11} textAnchor="end" fill={moodColor(c.happiness)} fontWeight={800} fontFamily="var(--font-geist-mono), monospace">
        {c.happiness.toFixed(0)}
      </text>
    </g>
  )
}
