"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchGatewayStatus } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import type { GatewayStatus } from "../../lib/types"

export default function GatewayStatusPanel() {
  const { t } = useI18n()
  const [status, setStatus] = useState<GatewayStatus | null>(null)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    fetchGatewayStatus().then(setStatus).catch(console.error)
  }, [])

  useEffect(() => {
    if (!open) return
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [open, refresh])

  const hasKeys = status && status.keys.length > 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn focus-ring"
        title={t("btn.ai.hint")}
      >
        <span className={`h-2 w-2 rounded-full ${hasKeys ? "bg-emerald-300" : "bg-slate-500"}`} />
        {t("btn.ai")}
      </button>

      {open && (
        <div className="panel popover absolute right-0 top-12 z-20 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">{t("gw.title")}</p>
            <button onClick={refresh} className="focus-ring rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-700/60 hover:text-slate-200">{t("gw.refresh")}</button>
          </div>

          {status ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                  <div className="text-xs text-slate-400">{t("gw.queue")}</div>
                  <div className="text-sm font-bold text-white">{status.queue_depth}</div>
                </div>
                <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                  <div className="text-xs text-slate-400">{t("gw.calls")}</div>
                  <div className="text-sm font-bold text-white">{status.total_calls}</div>
                </div>
                <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                  <div className="text-xs text-slate-400">{t("gw.fallbacks")}</div>
                  <div className="text-sm font-bold text-amber-300">{status.total_fallbacks}</div>
                </div>
              </div>

              {status.keys.length === 0 ? (
                <p className="text-center text-xs text-slate-500">{t("gw.nokeys")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {status.keys.map((k) => (
                    <div key={k.alias} className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-white">{k.alias}</span>
                        <span className={`text-xs font-bold ${k.available ? "text-emerald-300" : "text-rose-300"}`}>
                          {k.available ? `● ${t("gw.ready")}` : `○ ${t("gw.busy")}`}
                        </span>
                      </div>
                      <div className="mb-1 h-1.5 w-full rounded-full bg-slate-700">
                        <div
                          className="h-1.5 rounded-full bg-cyan-300 transition-all"
                          style={{ width: `${(k.requests_today / 3000) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{t("gw.reqToday", { n: k.requests_today })}</span>
                        <span>{t("gw.left", { n: k.budget_remaining })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-xs text-slate-500">{t("gw.loading")}</p>
          )}
        </div>
      )}
    </div>
  )
}
