import { DOT_R, type Slot } from "../../lib/map/coreLayout"
import { moodColor } from "../../lib/mood"

interface DotsProps {
  slots: Slot[]
  glow: boolean
  activeId: string | null
  dotRef: (id: string) => (el: SVGGElement | null) => void
  onHover: (id: string | null) => void
}

// One dot per citizen (positions glide with a CSS transition), plus the optional sentiment glow.
// The glow sits behind the dots; both live in core coordinates.
export function CitizenDots({ slots, glow, activeId, dotRef, onHover }: DotsProps) {
  return (
    <>
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
            ref={dotRef(citizen.id)}
            className="map-dot"
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onMouseEnter={() => onHover(citizen.id)}
            onMouseLeave={() => onHover(null)}
          >
            <circle r={DOT_R + 5} fill="transparent" />
            {on && <circle r={DOT_R + 4} fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={1.5} />}
            {citizen.pending_reaction && <circle className="think-ring" r={DOT_R} stroke={color} />}
            <circle className="core" r={on ? DOT_R + 1 : DOT_R} fill={color} stroke="#04070d" strokeWidth={1.5} />
            <circle cx={-1.8} cy={-1.8} r={1.7} fill="#fff" opacity={0.5} />
          </g>
        )
      })}
    </>
  )
}

interface WalkersProps {
  slots: Slot[]
  walkerRef: (id: string) => (el: SVGGElement | null) => void
}

// Citizens on their way to or from work. They start hidden; useMapLife positions them every frame.
export function Walkers({ slots, walkerRef }: WalkersProps) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {slots.map(({ citizen }) => (
        <g key={citizen.id} ref={walkerRef(citizen.id)} opacity={0}>
          <circle r={6} fill={moodColor(citizen.happiness)} opacity={0.28} />
          <circle r={3.3} fill={moodColor(citizen.happiness)} stroke="#04070d" strokeWidth={1.1} />
        </g>
      ))}
    </g>
  )
}
