import { ZONE_KEYS, ZONE_META } from "../../lib/mood"

// gradients and filters shared by everything drawn on the map
export default function MapDefs() {
  return (
    <defs>
      <pattern id="city-grid" width="22" height="22" patternUnits="userSpaceOnUse">
        <path d="M22 0H0V22" fill="none" stroke="#1b2a42" strokeWidth={0.6} />
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="55%" stopColor="#000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000" stopOpacity={0.6} />
      </radialGradient>
      <radialGradient id="lamp-glow">
        <stop offset="0%" stopColor="#fde68a" stopOpacity={0.55} />
        <stop offset="100%" stopColor="#fde68a" stopOpacity={0} />
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
