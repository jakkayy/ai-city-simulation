"use client"

import { useCallback, useEffect, useRef } from "react"
import { buildRoute, commuteAt, destFor, makePath, pointAt, scheduleFor, type Path, type Schedule } from "./commute"
import { circularDelta, cycleMs, formatClock, nightAmount, phaseOf, twilightAmount } from "./dayClock"

export interface Home {
  id: string
  zone: string
  job: string
  x: number   // world coordinates of the citizen's home dot
  y: number
}

interface Args {
  homes: Home[]
  running: boolean
  tick: number   // counts the ticks received over the socket; it is NOT the day number
  intervalSec: number
}

const STEP_MS = 20_000         // a single "Step 1 day" plays one map day in this long
const MORNING = 8             // running starts the clock at 08:00 so people are already moving
const NIGHT_DARKNESS = 0.42
const AWAY_OPACITY = 0.5      // a citizen who is out of the house: their home dot fades, not vanishes
const DUSK_TINT = 0.1
const NOON = 12

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

interface Cached {
  key: string
  path: Path
  sched: Schedule
}

// Drives the map's day/night cycle and the commuters straight on the DOM elements, one
// requestAnimationFrame loop and no React re-renders. The caller registers elements through
// the returned callback refs.
export function useMapLife(args: Args) {
  const argsRef = useRef(args)
  const night = useRef<SVGRectElement | null>(null)
  const dusk = useRef<SVGRectElement | null>(null)
  const lights = useRef<SVGGElement | null>(null)
  const clock = useRef<HTMLElement | null>(null)
  const chip = useRef<HTMLElement | null>(null)
  const walkers = useRef(new Map<string, SVGGElement>())
  const dots = useRef(new Map<string, SVGGElement>())
  const routes = useRef(new Map<string, Cached>())
  const time = useRef({ tick: null as number | null, dayAt: 0, dur: 10000, stepAt: -1e9, display: null as number | null, lastClock: 0 })

  useEffect(() => {
    argsRef.current = args
  })

  // The clock free-runs with a period of one tick and is nudged towards each tick's arrival
  // (a phase-locked loop), so a late or early tick never makes the day stall or jump.
  // Only a real tick counts. Loading the page (the city's day number arriving from the REST
  // call) must not look like "a day just ended", or an idle city would play a day by itself.
  useEffect(() => {
    const t = time.current
    const now = performance.now()
    const dur = cycleMs(args.intervalSec)
    if (t.tick === null) {
      t.tick = args.tick
      t.dur = dur
      t.dayAt = now - (MORNING / 24) * dur
    } else if (args.tick !== t.tick) {
      t.tick = args.tick
      if (args.running) {
        const n = Math.round((now - t.dayAt) / t.dur)
        t.dayAt += (now - (t.dayAt + n * t.dur)) * 0.5
      } else {
        t.stepAt = now
      }
    }
  }, [args.tick, args.running, args.intervalSec])

  // changing the speed keeps the time of day, only the pace changes
  useEffect(() => {
    const t = time.current
    const dur = cycleMs(args.intervalSec)
    if (t.dur !== dur) {
      const now = performance.now()
      const phase = (((now - t.dayAt) / t.dur) % 1 + 1) % 1
      t.dayAt = now - phase * dur
      t.dur = dur
    }
  }, [args.intervalSec])

  // pressing Start resumes in the morning rather than wherever the old day stopped
  useEffect(() => {
    if (args.running) {
      time.current.dur = cycleMs(args.intervalSec)
      time.current.dayAt = performance.now() - (MORNING / 24) * time.current.dur
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.running])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const still = reducedMotion()

    const targetHour = (now: number) => {
      const a = argsRef.current
      const t = time.current
      if (still) return NOON
      if (a.running) return ((((now - t.dayAt) / t.dur) % 1) + 1) % 1 * 24
      if (now - t.stepAt < STEP_MS) return ((now - t.stepAt) / STEP_MS) * 24
      return NOON
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const t = time.current

      const target = targetHour(now)
      if (t.display === null || still) t.display = target
      else t.display = (t.display + circularDelta(t.display, target) * (1 - Math.exp(-dt * 6)) + 24) % 24
      const h = t.display

      // sky
      const n = nightAmount(h)
      night.current?.setAttribute("opacity", (n * NIGHT_DARKNESS).toFixed(3))
      dusk.current?.setAttribute("opacity", (twilightAmount(h) * DUSK_TINT).toFixed(3))
      lights.current?.setAttribute("opacity", Math.min(1, Math.max(0, (n - 0.2) / 0.6)).toFixed(3))

      if (now - t.lastClock > 150) {
        t.lastClock = now
        if (clock.current) clock.current.textContent = formatClock(h)
        if (chip.current) chip.current.dataset.phase = phaseOf(h)
      }

      // commuters
      for (const home of argsRef.current.homes) {
        const key = `${home.zone}|${home.job}|${Math.round(home.x)}|${Math.round(home.y)}`
        let r = routes.current.get(home.id)
        if (!r || r.key !== key) {
          r = {
            key,
            path: makePath(buildRoute({ x: home.x, y: home.y }, home.zone, destFor(home.job))),
            sched: scheduleFor(home.id, home.job),
          }
          routes.current.set(home.id, r)
        }
        // paused and idle: everyone is shown at home so the mood colours are fully visible
        const live = !still && (argsRef.current.running || now - t.stepAt < STEP_MS)
        const state = live ? commuteAt(h, r.path.length, r.sched) : { away: false, walking: false, s: 0 }

        const w = walkers.current.get(home.id)
        if (w) {
          if (state.walking) {
            const p = pointAt(r.path, state.s)
            w.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
            w.setAttribute("opacity", "1")
          } else {
            w.setAttribute("opacity", "0")
          }
        }
        const d = dots.current.get(home.id)
        if (d) d.style.opacity = state.away ? String(AWAY_OPACITY) : "1"
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const setNight = useCallback((el: SVGRectElement | null) => { night.current = el }, [])
  const setDusk = useCallback((el: SVGRectElement | null) => { dusk.current = el }, [])
  const setLights = useCallback((el: SVGGElement | null) => { lights.current = el }, [])
  const setClock = useCallback((el: HTMLElement | null) => { clock.current = el }, [])
  const setChip = useCallback((el: HTMLElement | null) => { chip.current = el }, [])

  const walkerRef = useCallback(
    (id: string) => (el: SVGGElement | null) => {
      if (el) walkers.current.set(id, el)
      else walkers.current.delete(id)
    },
    [],
  )
  const dotRef = useCallback(
    (id: string) => (el: SVGGElement | null) => {
      if (el) dots.current.set(id, el)
      else dots.current.delete(id)
    },
    [],
  )

  return { setNight, setDusk, setLights, setClock, setChip, walkerRef, dotRef }
}
