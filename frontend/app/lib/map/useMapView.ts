"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  clientToWorld,
  fullView,
  panBy,
  viewHeight,
  zoomAt,
  zoomOf,
  type View,
  type World,
} from "./mapView"

const ZOOM_STEP = 1.6
const DRAG_THRESHOLD = 4

// Pan / zoom for an <svg> whose viewBox is driven by React state.
export function useMapView(world: World) {
  const [view, setView] = useState<View>(() => fullView(world))
  const viewRef = useRef(view)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const anim = useRef(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: boolean; pinch: number | null }>({ moved: false, pinch: null })
  const [dragging, setDragging] = useState(false)

  const apply = useCallback((v: View) => {
    viewRef.current = v
    setView(v)
  }, [])

  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(anim.current)
      const from = viewRef.current
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 260)
        const e = 1 - Math.pow(1 - t, 3)
        apply({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          w: from.w + (target.w - from.w) * e,
        })
        if (t < 1) anim.current = requestAnimationFrame(step)
      }
      anim.current = requestAnimationFrame(step)
    },
    [apply],
  )

  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  const worldPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect()
      return clientToWorld(clientX, clientY, rect, viewRef.current, world)
    },
    [world],
  )

  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      const v = viewRef.current
      const px = at?.x ?? v.x + v.w / 2
      const py = at?.y ?? v.y + viewHeight(v, world) / 2
      animateTo(zoomAt(v, factor, px, py, world))
    },
    [animateTo, world],
  )

  const reset = useCallback(() => animateTo(fullView(world)), [animateTo, world])
  const focus = useCallback((v: View) => animateTo(v), [animateTo])

  // wheel: Ctrl/⌘ + wheel always zooms; a plain wheel zooms only once zoomed in,
  // so the page can still be scrolled past the map at the default zoom.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const zoomed = zoomOf(viewRef.current, world) > 1.02
      if (!e.ctrlKey && !e.metaKey && !zoomed) return
      e.preventDefault()
      cancelAnimationFrame(anim.current)
      const p = worldPoint(e.clientX, e.clientY)
      apply(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0015), p.x, p.y, world))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [apply, world, worldPoint])

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    gesture.current = { moved: false, pinch: null }
    cancelAnimationFrame(anim.current)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)

    if (others.length >= 1) {
      // pinch
      const other = others[0]
      const dist = Math.hypot(next.x - other.x, next.y - other.y)
      const prevDist = Math.hypot(prev.x - other.x, prev.y - other.y)
      pointers.current.set(e.pointerId, next)
      if (prevDist > 0) {
        const mid = worldPoint((next.x + other.x) / 2, (next.y + other.y) / 2)
        apply(zoomAt(viewRef.current, dist / prevDist, mid.x, mid.y, world))
        gesture.current.moved = true
        setDragging(true)
      }
      return
    }

    const dx = next.x - prev.x
    const dy = next.y - prev.y
    if (!gesture.current.moved) {
      if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DRAG_THRESHOLD && zoomOf(viewRef.current, world) <= 1.02) return
      // only start capturing once the pointer really drags (keeps clicks and hovers intact)
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch {}
    }
    if (zoomOf(viewRef.current, world) > 1.02) {
      const scale = worldPoint(0, 0).scale
      apply(panBy(viewRef.current, -dx * scale, -dy * scale, world))
      gesture.current.moved = true
      setDragging(true)
    }
    pointers.current.set(e.pointerId, next)
  }

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) setDragging(false)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const p = worldPoint(e.clientX, e.clientY)
    zoomBy(2, p)
  }

  const zoom = zoomOf(view, world)

  return {
    svgRef,
    view,
    zoom,
    dragging,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
    reset,
    focus,
    pan: (dx: number, dy: number) => animateTo(panBy(viewRef.current, dx * viewRef.current.w, dy * viewHeight(viewRef.current, world), world)),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onDoubleClick,
    },
  }
}
