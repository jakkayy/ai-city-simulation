import { ROAD_H, ROAD_V, ZONE_C_ACCESS } from "../../lib/map/coreLayout"

export function Roads() {
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

export function Traffic() {
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
