"use client"

import { LAMPS } from "../lib/mapLayout"
import { WORLD } from "../lib/mapLayout"

interface Props {
  windows: { x: number; y: number; w: number; h: number }[]
  setNight: (el: SVGRectElement | null) => void
  setDusk: (el: SVGRectElement | null) => void
  setLights: (el: SVGGElement | null) => void
}

// Drawn above the city and below the citizens: a dark wash, a warm dusk tint, and the
// lights (street lamps, lit windows) that stay bright through it. Opacities are driven from
// useMapLife on every frame, so nothing here re-renders.
export default function NightLayer({ windows, setNight, setDusk, setLights }: Props) {
  return (
    <g style={{ pointerEvents: "none" }} aria-hidden>
      <rect ref={setNight} width={WORLD.w} height={WORLD.h} fill="#030716" opacity={0} />
      <rect ref={setDusk} width={WORLD.w} height={WORLD.h} fill="#f97316" opacity={0} />
      <g ref={setLights} opacity={0}>
        {LAMPS.map((l, i) => (
          <g key={`l${i}`}>
            <circle cx={l.x} cy={l.y} r={17} fill="url(#lamp-glow)" />
            <circle cx={l.x} cy={l.y} r={1.8} fill="#fef3c7" />
          </g>
        ))}
        {windows.map((w, i) => (
          <rect key={`w${i}`} x={w.x} y={w.y} width={w.w} height={w.h} rx={0.6} fill="#fde68a" opacity={0.92} />
        ))}
      </g>
    </g>
  )
}
