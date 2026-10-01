import { useI18n } from "../../lib/i18n"
import { BUILDINGS, LAYOUT } from "../../lib/map/coreLayout"
import { moodColor, ZONE_META, type ZoneKey } from "../../lib/mood"

export default function ZonePanel({ zone, pop, avg }: { zone: ZoneKey; pop: number; avg: number | null }) {
  const { t } = useI18n()
  const L = LAYOUT[zone]
  const meta = ZONE_META[zone]
  const fill = Math.min(1, pop / meta.capacity)
  const base = L.y + L.bldBase

  return (
    <g>
      <rect x={L.x - 6} y={L.y - 6} width={L.w + 12} height={L.h + 12} rx={20} fill={meta.color} opacity={0.1} filter="url(#blur-glow)" />
      <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={14} fill="#0a1222" />
      <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={14} fill={`url(#zone-${zone})`} stroke={meta.color} strokeOpacity={0.75} strokeWidth={1.5} />

      {/* header */}
      <text x={L.x + 16} y={L.y + 22} fontSize={13} fill={meta.color} fontWeight={800}>{t("zone.name", { z: zone })}</text>
      <text x={L.x + 16} y={L.y + 36} fontSize={8} fill="#8fa0bb" fontWeight={600} letterSpacing={0.4}>{t(`zone.${zone}.sub`)}</text>
      <text x={L.x + L.w - 16} y={L.y + 22} fontSize={11} fill="#e2e8f0" textAnchor="end" fontWeight={700} fontFamily="var(--font-geist-mono), monospace">
        {pop}/{meta.capacity}
      </text>
      <rect x={L.x + L.w - 76} y={L.y + 30} width={60} height={4} rx={2} fill="#0f172a" />
      <rect x={L.x + L.w - 76} y={L.y + 30} width={60 * fill} height={4} rx={2} fill={meta.color} style={{ transition: "width .8s" }} />
      {avg !== null && (
        <circle cx={L.x + L.w - 86} cy={L.y + 32} r={3} fill={moodColor(avg)} filter="url(#soft-glow)" />
      )}

      {/* buildings */}
      {BUILDINGS[zone].map((b, i) => {
        const bx = L.x + b.dx
        const by = base - b.h
        const cols = Math.max(2, Math.floor((b.w - 6) / 6))
        const rows = Math.max(2, Math.floor((b.h - 6) / 8))
        return (
          <g key={i}>
            <rect x={bx} y={by} width={b.w} height={b.h} rx={2.5} fill={meta.color} opacity={0.16} />
            <rect x={bx} y={by} width={b.w} height={b.h} rx={2.5} fill="none" stroke={meta.color} strokeOpacity={0.45} strokeWidth={0.8} />
            {Array.from({ length: rows * cols }).map((_, n) => {
              const r = Math.floor(n / cols)
              const c = n % cols
              return (
                <rect
                  key={n}
                  className="win"
                  x={bx + 4 + c * 6}
                  y={by + 5 + r * 8}
                  width={3}
                  height={4}
                  rx={0.6}
                  fill={meta.color}
                  style={{ animationDelay: `${((n * 7 + i * 13 + (zone === "A" ? 0 : zone === "B" ? 3 : 6)) % 40) / 10}s`, animationDuration: `${3 + ((n + i) % 4)}s` }}
                />
              )
            })}
          </g>
        )
      })}
      <line x1={L.x + 10} x2={L.x + L.w - 10} y1={base + 4} y2={base + 4} stroke={meta.color} strokeOpacity={0.25} />
    </g>
  )
}
