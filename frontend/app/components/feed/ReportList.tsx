"use client"

import { useState } from "react"
import { useI18n } from "../../lib/i18n"
import { moodColor } from "../../lib/mood"
import type { DayReport } from "../../lib/types"
import ReportDetail from "./ReportDetail"

// Past days, newest first. The latest is open until the player picks another one.
export default function ReportList({ reports }: { reports: DayReport[] }) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<number | null>(null)   // -1 = everything closed
  const openDay = picked ?? reports[0]?.day

  if (reports.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">{t("dayrep.empty")}</p>
  }

  return (
    <div className="thin-scrollbar -mr-2 flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
      {reports.map((r) => {
        const open = r.day === openDay
        return (
          <section key={r.day} className="rounded-xl border border-white/[0.06] bg-slate-950/40">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setPicked(open ? -1 : r.day)}
              className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left"
            >
              {r.highlight && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" style={{ boxShadow: "0 0 8px #fcd34d" }} />}
              <span className="num text-xs font-bold text-white">{t("dayrep.day", { n: r.day })}</span>
              <span className="num text-[11px] font-semibold" style={{ color: moodColor(r.happiness) }}>{r.happiness.toFixed(1)}</span>
              <svg viewBox="0 0 12 12" className={`ml-auto h-3 w-3 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 4.5L6 8l3.5-3.5" />
              </svg>
            </button>
            {open && (
              <div className="px-3 pb-3">
                <ReportDetail report={r} />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
