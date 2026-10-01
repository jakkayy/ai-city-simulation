"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../../lib/i18n"
import { CW, layoutDots } from "../../lib/map/coreLayout"
import { CORE_OFFSET, WORLD } from "../../lib/map/mapLayout"
import { viewAround } from "../../lib/map/mapView"
import { useFullscreen } from "../../lib/map/useFullscreen"
import { useMapLife } from "../../lib/map/useMapLife"
import { useMapView } from "../../lib/map/useMapView"
import { WINDOWS } from "../../lib/map/windows"
import { ZONE_KEYS, type ZoneKey } from "../../lib/mood"
import type { Citizen } from "../../lib/types"
import { CitizenDots, Walkers } from "./CitizenDots"
import ClockChip from "./ClockChip"
import { Districts, type WorkCounts } from "./Districts"
import { Compass, Ground } from "./Ground"
import MapControls from "./MapControls"
import MapDefs from "./MapDefs"
import MapLegend from "./MapLegend"
import NightLayer from "./NightLayer"
import { Roads, Traffic } from "./Roads"
import Tooltip from "./Tooltip"
import World from "./World"
import ZonePanel from "./ZonePanel"

interface Props {
  citizens: Citizen[]
  zonePops: { A: number; B: number; C: number }
  highlightId: string | null
  onHover: (id: string | null) => void
  serviceQuality?: number
  tick?: number
  running?: boolean
  intervalSec?: number
}

// The city map: composes the world, the districts, the city core, the night layer and the
// citizens, and owns the zoom / fullscreen / hover state. The drawing lives in the sibling files.
export default function CityMap({ citizens, zonePops, highlightId, onHover, serviceQuality = 0, tick = 0, running = false, intervalSec = 10 }: Props) {
  const { t } = useI18n()
  const [glow, setGlow] = useState(true)
  const [localHover, setLocalHover] = useState<string | null>(null)
  const slots = useMemo(() => layoutDots(citizens), [citizens])
  const { svgRef, view, zoom, dragging, handlers, zoomIn, zoomOut, reset, focus, pan } = useMapView(WORLD)

  const homes = useMemo(
    () => slots.map(({ citizen, x, y }) => ({ id: citizen.id, zone: citizen.zone, job: citizen.job_type, x: x + CORE_OFFSET.x, y: y + CORE_OFFSET.y })),
    [slots],
  )
  const { setNight, setDusk, setLights, setClock, setChip, walkerRef, dotRef } = useMapLife({ homes, running, tick, intervalSec })

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen(wrapRef)

  const focusCore = () => focus(viewAround(CORE_OFFSET.x + CW / 2, CORE_OFFSET.y + 250, 1.45, WORLD))

  // phones: start on the city centre instead of the tiny whole-world view
  useEffect(() => {
    if (window.innerWidth < 640) focusCore()
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

  const vh = (view.w * WORLD.h) / WORLD.w
  const zoomed = zoom > 1.02
  const coreTransform = `translate(${CORE_OFFSET.x} ${CORE_OFFSET.y})`

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
          viewBox={`${view.x} ${view.y} ${view.w} ${vh}`}
          className={`block ${fullscreen ? "h-full w-full" : "w-full"}`}
          style={{ cursor: dragging ? "grabbing" : zoomed ? "grab" : "default", touchAction: zoomed ? "none" : "pan-y" }}
          role="img"
          aria-label="City map with zones, roads, and citizen happiness markers"
          {...handlers}
        >
          <MapDefs />
          <World />
          <Districts counts={counts} serviceQuality={serviceQuality} />

          <g transform={coreTransform}>
            <Ground />
            {ZONE_KEYS.map((z) => (
              <ZonePanel key={z} zone={z} pop={zonePops[z]} avg={avg[z]} />
            ))}
            <Roads />
            <Traffic />
          </g>

          <NightLayer windows={WINDOWS} setNight={setNight} setDusk={setDusk} setLights={setLights} />

          <g transform={coreTransform}>
            <CitizenDots slots={slots} glow={glow} activeId={activeId} dotRef={dotRef} onHover={hover} />
            {active && <Tooltip slot={active} />}
            <Compass />
          </g>

          {/* citizens on their way to work (positions set every frame by useMapLife) */}
          <Walkers slots={slots} walkerRef={walkerRef} />
          <rect width={WORLD.w} height={WORLD.h} fill="url(#vignette)" pointerEvents="none" />
        </svg>

        <ClockChip setChip={setChip} setClock={setClock} />
        <MapControls
          fullscreen={fullscreen}
          zoom={zoom}
          onToggleFullscreen={toggleFullscreen}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFocusCore={focusCore}
          onFit={reset}
        />
      </div>

      <MapLegend counts={counts} />
    </section>
  )
}
