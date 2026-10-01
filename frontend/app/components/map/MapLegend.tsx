import { useI18n } from "../../lib/i18n"
import { MOOD } from "../../lib/mood"
import type { WorkCounts } from "./Districts"

// Mood colours + the map hint, and how many citizens work at each kind of place.
export default function MapLegend({ counts }: { counts: WorkCounts }) {
  const { t } = useI18n()

  const workplaces = [
    { label: t("map.school"), n: counts.teacher, c: "#60a5fa" },
    { label: t("map.factory"), n: counts.laborer, c: "#f97316" },
    { label: t("map.farm"), n: counts.farmer, c: "#a3e635" },
    { label: t("map.cbd"), n: counts.business, c: "#22d3ee" },
    { label: t("map.marketLegend"), n: counts.service, c: "#c084fc" },
    { label: t("job.unemployed"), n: counts.unemployed, c: "#94a3b8" },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 px-1 pt-1 text-xs text-slate-300">
        {[
          { c: MOOD.happy, l: t("map.happy") },
          { c: MOOD.stable, l: t("map.stable") },
          { c: MOOD.risk, l: t("map.risk") },
        ].map(({ c, l }) => (
          <span key={l} className="flex items-center gap-2 font-medium">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
            {l}
          </span>
        ))}
        <span className="flex items-center gap-2 text-slate-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-300 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-400" />
          </span>
          {t("map.thinking")}
        </span>
        <span className="ml-auto hidden text-slate-500 md:inline">{t("map.zoomHint")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 px-1 pb-1" aria-label={t("map.workplaces")}>
        <span className="eyebrow mr-1">{t("map.workplaces")}</span>
        {workplaces.map((w) => (
          <span key={w.label} className="chip" style={{ borderColor: `${w.c}55` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: w.c }} />
            {w.label}
            <span className="num font-bold" style={{ color: w.c }}>{w.n}</span>
          </span>
        ))}
      </div>
    </>
  )
}
