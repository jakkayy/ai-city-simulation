// Pure view maths for the pan/zoom map. A view is the visible window of the world in
// world units; its height follows from the world's aspect ratio.

export interface World {
  w: number
  h: number
}

export interface View {
  x: number
  y: number
  w: number
}

export const MAX_ZOOM = 5

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const fullView = (world: World): View => ({ x: 0, y: 0, w: world.w })

export const viewHeight = (v: View, world: World) => (v.w * world.h) / world.w

export const zoomOf = (v: View, world: World) => world.w / v.w

export function clampView(v: View, world: World): View {
  const w = clamp(v.w, world.w / MAX_ZOOM, world.w)
  const h = (w * world.h) / world.w
  return { w, x: clamp(v.x, 0, world.w - w), y: clamp(v.y, 0, world.h - h) }
}

// Zoom by `factor` (>1 zooms in) keeping the world point (px, py) under the cursor.
export function zoomAt(v: View, factor: number, px: number, py: number, world: World): View {
  const w = clamp(v.w / factor, world.w / MAX_ZOOM, world.w)
  const ratio = w / v.w
  return clampView({ w, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio }, world)
}

export function panBy(v: View, dx: number, dy: number, world: World): View {
  return clampView({ ...v, x: v.x + dx, y: v.y + dy }, world)
}

// A view centred on (cx, cy) at the given zoom level.
export function viewAround(cx: number, cy: number, zoom: number, world: World): View {
  const w = world.w / clamp(zoom, 1, MAX_ZOOM)
  const h = (w * world.h) / world.w
  return clampView({ x: cx - w / 2, y: cy - h / 2, w }, world)
}

// Screen point -> world point, for an svg whose viewBox is `view` and which is letterboxed
// (preserveAspectRatio "meet") inside `rect`.
export function clientToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  view: View,
  world: World,
): { x: number; y: number; scale: number } {
  const aspect = world.w / world.h
  const renderedW = Math.min(rect.width, rect.height * aspect)
  const renderedH = renderedW / aspect
  const offX = (rect.width - renderedW) / 2
  const offY = (rect.height - renderedH) / 2
  const scale = view.w / renderedW // world units per screen pixel
  return {
    x: view.x + (clientX - rect.left - offX) * scale,
    y: view.y + (clientY - rect.top - offY) * scale,
    scale,
  }
}
