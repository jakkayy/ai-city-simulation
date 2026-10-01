"use client"

import { useEffect } from "react"
import { useI18n } from "../../lib/i18n"
import type { DayReport } from "../../lib/types"
import ReportDetail from "./ReportDetail"

const SHOW_MS = 14_000

// Pops up when a day worth a look has just ended (never for ordinary days).
export default function ReportPopup({ report, onClose }: { report: DayReport | null; onClose: () => void }) {
  const { t } = useI18n()
  const day = report?.day

  useEffect(() => {
    if (day === undefined) return
    const id = setTimeout(onClose, SHOW_MS)
    return () => clearTimeout(id)
  }, [day, onClose])

  if (!report) return null

  return (
    <div
      role="status"
      className="panel slide-in fixed bottom-4 left-4 right-4 z-[180] flex flex-col gap-3 rounded-2xl p-4 sm:right-auto sm:w-[24rem]"
      style={{ boxShadow: "0 0 30px rgba(251,191,36,0.18), 0 20px 50px rgba(0,0,0,0.45)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-300" style={{ boxShadow: "0 0 8px #fcd34d" }} />
          <h3 className="text-sm font-bold text-white">{t("dayrep.popup", { n: report.day })}</h3>
        </div>
        <button onClick={onClose} aria-label={t("dismiss")} className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
        </button>
      </div>
      <ReportDetail report={report} />
    </div>
  )
}
