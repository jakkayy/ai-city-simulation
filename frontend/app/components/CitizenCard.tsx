"use client"

import { useI18n } from "../lib/i18n"
import type { Citizen } from "../lib/types"
import { moodColor, prettyAction, ZONE_META } from "../lib/mood"

interface Props {
  citizen: Citizen
  highlighted: boolean
  onHover: (id: string | null) => void
}

export default function CitizenCard({ citizen, highlighted, onHover }: Props) {
  const { t } = useI18n()
  const zone = ZONE_META[citizen.zone]
  const color = moodColor(citizen.happiness)
  const initials = citizen.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
  const pct = Math.max(0, Math.min(100, citizen.happiness))

  return (
    <article
      onMouseEnter={() => onHover(citizen.id)}
      onMouseLeave={() => onHover(null)}
      className="panel lift relative overflow-hidden rounded-2xl p-3.5"
      style={highlighted ? { boxShadow: `0 0 0 1.5px ${color}, 0 0 28px ${color}40` } : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-slate-950"
          style={{ background: `linear-gradient(135deg, ${zone.color}, ${zone.color}99)` }}
        >
          {initials}
          {citizen.pending_reaction && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-400 ring-2 ring-slate-900" title={t("cit.thinking")} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{citizen.name}</div>
          <div className="truncate text-xs text-slate-400">{t(`job.${citizen.job_type}`)}</div>
        </div>
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
          style={{ color: zone.color, background: `${zone.color}1f`, border: `1px solid ${zone.color}44` }}
        >
          Z{citizen.zone}
        </span>
      </div>

      <div className="mt-3.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-slate-400">{t("cit.happiness")}</span>
          <span className="num font-bold" style={{ color }}>{citizen.happiness.toFixed(1)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-[width,background] duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 10px ${color}99` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between text-xs">
        <span className="text-slate-400">{t("cit.savings")}</span>
        <span className={`num font-semibold ${citizen.savings < 0 ? "text-rose-300" : "text-emerald-300"}`}>
          {citizen.savings < 0 ? "-" : ""}${Math.abs(citizen.savings).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="mt-2.5 truncate border-t border-white/[0.06] pt-2 text-[11px] capitalize text-slate-500">
        {prettyAction(citizen.last_action)}
      </div>
    </article>
  )
}
