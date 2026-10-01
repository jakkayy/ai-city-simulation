import { useI18n } from "../../lib/i18n"
import { CW, type Slot } from "../../lib/map/coreLayout"
import { moodColor, ZONE_META } from "../../lib/mood"
import Avatar from "../citizens/Avatar"

export default function Tooltip({ slot }: { slot: Slot }) {
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
