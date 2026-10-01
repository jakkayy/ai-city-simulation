"use client"

import { useEffect, useState } from "react"
import { fetchPolicies } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import type { PolicyResponse } from "../../lib/types"

interface Props {
  // changes whenever a policy may have been enacted, to trigger a reload
  version: number
}

function formatParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .map(([k, v]) => {
      const n = Number(v)
      if (k === "tax_rate") return `${Math.round(n * 100)}%`
      if (k === "fund_cost") return `$${n.toLocaleString("en-US")}`
      if (k === "unemployment_reduction") return `${Math.round((n > 1 ? n : n * 100))}%`
      return n > 0 ? `+${n}` : `${n}`
    })
    .join(" · ")
}

export default function PolicyHistory({ version }: Props) {
  const { t } = useI18n()
  const [policies, setPolicies] = useState<PolicyResponse[] | null>(null)

  useEffect(() => {
    let alive = true
    fetchPolicies()
      .then((p) => alive && setPolicies(p.slice(0, 8)))
      .catch(() => alive && setPolicies([]))
    return () => { alive = false }
  }, [version])

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="text-base font-semibold text-white">{t("hist.title")}</h2>
      {policies === null ? (
        <div className="shimmer mt-3 h-10 rounded-lg" />
      ) : policies.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{t("hist.empty")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {policies.map((p) => (
            <li key={p.id} className="rounded-xl border border-white/[0.06] bg-slate-950/40 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-100">{p.name}</span>
                <span className="num shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("hist.day", { n: p.enacted_day })}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>{t(`pol.${p.policy_type}`)}</span>
                <span className="num text-cyan-200/80">{formatParams(p.parameters)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
