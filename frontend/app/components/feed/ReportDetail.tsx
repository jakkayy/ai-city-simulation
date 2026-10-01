"use client"

import { useI18n } from "../../lib/i18n"
import { reportBullets } from "../../lib/report"
import { moodColor } from "../../lib/mood"
import type { DayReport } from "../../lib/types"

function Delta({ value, digits = 0 }: { value: number | null; digits?: number }) {
  if (value === null || Math.abs(value) < 0.05) return null
  return (
    <span className={`num text-[10px] font-bold ${value > 0 ? "text-emerald-300" : "text-rose-300"}`}>
      {value > 0 ? "▲" : "▼"}{Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: digits })}
    </span>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.06] bg-slate-950/40 px-2.5 py-2">
      <div className="eyebrow !text-[0.6rem]">{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">{children}</div>
    </div>
  )
}

// One day: the headline numbers, what happened, and the AI bulletin when there is one.
export default function ReportDetail({ report }: { report: DayReport }) {
  const { t, lang } = useI18n()
  const bulletin = report.narrative?.[lang]

  return (
    <div className="flex flex-col gap-2.5">
      {bulletin && (
        <p className="rounded-lg border border-cyan-300/20 bg-cyan-400/[0.06] px-3 py-2 text-xs leading-relaxed text-cyan-50">{bulletin}</p>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <Stat label={t("dayrep.happiness")}>
          <span className="num text-sm font-bold" style={{ color: moodColor(report.happiness) }}>{report.happiness.toFixed(1)}</span>
          <Delta value={report.happiness_delta} digits={1} />
        </Stat>
        <Stat label={t("dayrep.fund")}>
          <span className="num text-sm font-bold text-cyan-200">{report.fund < 0 ? "-" : ""}${Math.abs(report.fund).toLocaleString("en-US")}</span>
          <Delta value={report.fund_delta} />
        </Stat>
        <Stat label={t("dayrep.service")}>
          <span className="num text-sm font-bold text-sky-300">{report.service.toFixed(0)}</span>
        </Stat>
      </div>

      <ul className="flex flex-col gap-1 text-xs leading-relaxed text-slate-300">
        {reportBullets(report, t).map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-slate-500" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
