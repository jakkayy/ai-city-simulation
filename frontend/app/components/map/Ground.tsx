import { useI18n } from "../../lib/i18n"
import { PARK_BOX, SERVICES_BOX } from "../../lib/map/mapLayout"

// the rounded border of the core plus the park and the services box
export function Ground() {
  const { t } = useI18n()
  return (
    <g>
      <rect x={34} y={30} width={692} height={444} rx={18} fill="none" stroke="#22324d" strokeWidth={1} />

      {/* park */}
      <g transform={`translate(${PARK_BOX.x} ${PARK_BOX.y})`}>
        <rect width={PARK_BOX.w} height={PARK_BOX.h} rx={14} fill="#0c2a1f" stroke="#1f6b4c" strokeOpacity={0.6} />
        {[[22, 30], [42, 48], [68, 26], [90, 52], [58, 58]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill="#14532d" opacity={0.85} />
            <circle cx={x - 2} cy={y - 2} r={4} fill="#22c55e" opacity={0.35} />
          </g>
        ))}
        <text x={PARK_BOX.w / 2} y={15} textAnchor="middle" fontSize={8} fill="#6ee7b7" fontWeight={700} letterSpacing={1.2}>{t("map.park")}</text>
      </g>

      {/* services */}
      <g transform={`translate(${SERVICES_BOX.x} ${SERVICES_BOX.y})`}>
        <rect width={SERVICES_BOX.w} height={SERVICES_BOX.h} rx={14} fill="#10203a" stroke="#3b6ea8" strokeOpacity={0.55} />
        <path d={`M${SERVICES_BOX.w / 2} 16v24M${SERVICES_BOX.w / 2 - 12} 28h24`} stroke="#7dd3fc" strokeWidth={4} strokeLinecap="round" opacity={0.75} />
        <text x={SERVICES_BOX.w / 2} y={60} textAnchor="middle" fontSize={8} fill="#93c5fd" fontWeight={700} letterSpacing={1.2}>{t("map.services")}</text>
      </g>
    </g>
  )
}

export function Compass() {
  return (
    <g transform="translate(700, 452)" opacity={0.85}>
      <circle r={16} fill="#0b1324" stroke="#334766" />
      <path d="M0 -10 L4.5 6 L0 3 L-4.5 6 Z" fill="#cbd5e1" />
      <text y={-19} textAnchor="middle" fontSize={7} fill="#7e8fab" fontWeight={800}>N</text>
    </g>
  )
}
