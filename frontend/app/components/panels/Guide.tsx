"use client"

import { useEffect, useState } from "react"
import { useI18n } from "../../lib/i18n"

const SEEN_KEY = "aicity.guideSeen"
type Tab = "start" | "numbers" | "policy" | "map" | "faq"
const TABS: Tab[] = ["start", "numbers", "policy", "map", "faq"]

interface Props {
  open: boolean
  onClose: () => void
}

export function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1"
  } catch {
    return true
  }
}

export default function Guide({ open, onClose }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>("start")

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1")
    } catch {}
    onClose()
  }

  const idx = TABS.indexOf(tab)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("guide.title")}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="panel popover relative flex max-h-[min(42rem,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl" style={{ transformOrigin: "center" }}>
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-6 pb-4 pt-5">
          <div>
            <p className="eyebrow !text-cyan-200">{t("guide.title")}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{t("guide.welcome")}</h2>
          </div>
          <button onClick={close} aria-label={t("btn.close")} className="btn focus-ring !h-8 !w-8 !p-0">
            <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </button>
        </div>

        <div className="thin-scrollbar flex gap-1.5 overflow-x-auto px-6 pt-4">
          {TABS.map((k) => (
            <button key={k} className="chip focus-ring shrink-0" data-active={tab === k} onClick={() => setTab(k)}>
              {t(`guide.tab.${k}`)}
            </button>
          ))}
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-300">
          {tab === "start" && (
            <ol className="flex flex-col gap-4">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex gap-4">
                  <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-sm font-bold text-cyan-200 ring-1 ring-cyan-300/30">{n}</span>
                  <div>
                    <h3 className="font-semibold text-white">{t(`guide.s${n}.t`)}</h3>
                    <p className="mt-1">{t(`guide.s${n}.b`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {tab === "numbers" && (
            <ul className="flex flex-col gap-3">
              {(["happiness", "fund", "service", "tax"] as const).map((k, i) => (
                <li key={k} className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-3" style={{ borderLeft: `3px solid ${["#4ade80", "#22d3ee", "#38bdf8", "#fbbf24"][i]}` }}>
                  {t(`guide.n.${k}`)}
                </li>
              ))}
            </ul>
          )}

          {tab === "policy" && (
            <div className="flex flex-col gap-3">
              <p>{t("guide.p.intro")}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {(["tax_decrease", "tax_increase", "service_boost", "service_cut", "housing", "job_program"] as const).map((k) => (
                  <li key={k} className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-3">
                    <div className="font-semibold text-white">{t(`pol.${k}`)}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{t(`pol.${k}.d`)}</div>
                  </li>
                ))}
              </ul>
              <p className="rounded-xl border border-amber-300/25 bg-amber-400/[0.07] p-3 text-amber-100">{t("guide.p.tip")}</p>
              <p>{t("guide.p.manager")}</p>
            </div>
          )}

          {tab === "map" && (
            <ul className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  <span>{t(`guide.m.${n}`)}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === "faq" && (
            <dl className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <div key={n}>
                  <dt className="font-semibold text-white">{t(`guide.q${n}`)}</dt>
                  <dd className="mt-1">{t(`guide.a${n}`)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-6 py-4">
          <button className="btn focus-ring" onClick={() => setTab(TABS[Math.max(0, idx - 1)])} disabled={idx === 0}>
            {t("guide.prev")}
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {TABS.map((k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === tab ? "w-5 bg-cyan-300" : "w-1.5 bg-slate-600"}`} />
            ))}
          </div>
          {idx < TABS.length - 1 ? (
            <button className="btn btn-primary focus-ring" onClick={() => setTab(TABS[idx + 1])}>{t("guide.next")}</button>
          ) : (
            <button className="btn btn-go focus-ring" onClick={close}>{t("guide.done")}</button>
          )}
        </div>
      </div>
    </div>
  )
}
