"use client"

import { useState } from "react"
import { enactPolicy } from "../lib/api"
import { useI18n } from "../lib/i18n"
import type { PolicyType } from "../lib/types"

interface Field { key: string; min: number; max: number; step: number; defaultValue: number }

const FIELDS: Record<PolicyType, Field[]> = {
  tax_increase: [{ key: "tax_rate", min: 0.01, max: 0.6, step: 0.01, defaultValue: 0.25 }],
  tax_decrease: [{ key: "tax_rate", min: 0.01, max: 0.6, step: 0.01, defaultValue: 0.1 }],
  service_boost: [{ key: "service_quality_delta", min: 1, max: 50, step: 1, defaultValue: 10 }],
  service_cut: [{ key: "service_quality_delta", min: -50, max: -1, step: 1, defaultValue: -10 }],
  housing: [{ key: "fund_cost", min: 500, max: 20000, step: 500, defaultValue: 5000 }],
  job_program: [
    { key: "fund_cost", min: 500, max: 20000, step: 500, defaultValue: 3000 },
    { key: "unemployment_reduction", min: 1, max: 100, step: 1, defaultValue: 30 },
  ],
}

const POLICY_TYPES = Object.keys(FIELDS) as PolicyType[]

// ready-made choices; `params` are in slider units (percent for unemployment_reduction)
const PRESETS: { id: string; type: PolicyType; params: Record<string, number>; accent: string }[] = [
  { id: "tax10", type: "tax_decrease", params: { tax_rate: 0.1 }, accent: "#34d399" },
  { id: "tax25", type: "tax_increase", params: { tax_rate: 0.25 }, accent: "#fbbf24" },
  { id: "svc10", type: "service_boost", params: { service_quality_delta: 10 }, accent: "#38bdf8" },
  { id: "svcm10", type: "service_cut", params: { service_quality_delta: -10 }, accent: "#fb7185" },
  { id: "house", type: "housing", params: { fund_cost: 5000 }, accent: "#a78bfa" },
  { id: "jobs", type: "job_program", params: { fund_cost: 3000, unemployment_reduction: 30 }, accent: "#22d3ee" },
]

function formatParamValue(key: string, value: number) {
  if (key === "tax_rate") return `${Math.round(value * 100)}%`
  if (key === "fund_cost") return `$${value.toLocaleString("en-US")}`
  if (key === "unemployment_reduction") return `${value}%`
  return value > 0 ? `+${value}` : `${value}`
}

interface Props {
  onEnacted: () => void
}

export default function PolicyPanel({ onEnacted }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"preset" | "custom">("preset")
  const [presetId, setPresetId] = useState<string | null>(null)
  const [type, setType] = useState<PolicyType>("tax_decrease")
  const [name, setName] = useState("")
  const [params, setParams] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fields = FIELDS[type]
  const preset = PRESETS.find((p) => p.id === presetId) ?? null
  const getParam = (f: Field) => params[f.key] ?? f.defaultValue

  const reset = () => { setError(null); setSuccess(null) }

  const submit = async (pType: PolicyType, pName: string, values: Record<string, number>) => {
    setLoading(true)
    reset()
    try {
      const body = { ...values }
      // the API (and the City Manager) use a 0–1 fraction; sliders are in percent
      if ("unemployment_reduction" in body) body.unemployment_reduction /= 100
      const result = await enactPolicy(pType, pName, body)
      setSuccess(t("pol.enacted", { name: result.name, day: result.enacted_day }))
      setName("")
      setParams({})
      setPresetId(null)
      onEnacted()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("pol.failed"))
    } finally {
      setLoading(false)
    }
  }

  const confirm = () => {
    if (tab === "preset") {
      if (preset) submit(preset.type, t(`preset.${preset.id}`), preset.params)
      return
    }
    if (!name.trim()) { setError(t("pol.nameReq")); return }
    const values: Record<string, number> = {}
    for (const f of fields) values[f.key] = getParam(f)
    submit(type, name.trim(), values)
  }

  const rangeFill = (v: number, f: Field) => {
    const pct = ((v - f.min) / (f.max - f.min)) * 100
    return { background: `linear-gradient(to right, #67e8f9 ${pct}%, #334155 ${pct}%)` }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); reset() }}
        className="btn btn-primary focus-ring"
        title={t("btn.policy.hint")}
      >
        {t("btn.policy")}
      </button>

      {open && (
        <div className="panel popover absolute right-0 top-12 z-[100] flex max-h-[80vh] w-[26rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl">
          <div className="border-b border-cyan-300/15 bg-cyan-400/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow !text-cyan-200">{t("pol.title")}</p>
                <p className="mt-1 text-xs text-slate-400">{t("pol.sub")}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t("btn.close")} className="focus-ring rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">×</button>
            </div>
            <div className="mt-3 flex gap-1.5">
              <button className="chip focus-ring" data-active={tab === "preset"} onClick={() => { setTab("preset"); reset() }}>{t("pol.tab.preset")}</button>
              <button className="chip focus-ring" data-active={tab === "custom"} onClick={() => { setTab("custom"); reset() }}>{t("pol.tab.custom")}</button>
            </div>
          </div>

          <div className="thin-scrollbar flex flex-col gap-4 overflow-y-auto p-4">
            {tab === "preset" ? (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setPresetId(p.id); reset() }}
                      aria-pressed={presetId === p.id}
                      className="focus-ring rounded-xl border p-3 text-left text-sm font-semibold text-white transition hover:-translate-y-0.5"
                      style={{
                        borderColor: presetId === p.id ? p.accent : "rgba(148,163,184,0.2)",
                        background: presetId === p.id ? `${p.accent}1f` : "rgba(15,23,42,0.5)",
                        boxShadow: presetId === p.id ? `0 0 20px ${p.accent}30` : undefined,
                      }}
                    >
                      {t(`preset.${p.id}`)}
                    </button>
                  ))}
                </div>

                {preset ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-slate-950/40 p-3 text-xs leading-relaxed">
                    <p><span className="font-bold text-emerald-300">+ {t("pol.pros")}:</span> <span className="text-slate-200">{t(`preset.${preset.id}.pro`)}</span></p>
                    <p><span className="font-bold text-rose-300">− {t("pol.cons")}:</span> <span className="text-slate-200">{t(`preset.${preset.id}.con`)}</span></p>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500">{t("pol.pickHint")}</p>
                )}
              </>
            ) : (
              <>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/45 p-3">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="pol-type">{t("pol.type")}</label>
                  <select
                    id="pol-type"
                    className="field focus-ring !h-11 w-full font-semibold"
                    value={type}
                    onChange={(e) => { setType(e.target.value as PolicyType); setParams({}); reset() }}
                  >
                    {POLICY_TYPES.map((k) => <option key={k} value={k}>{t(`pol.${k}`)}</option>)}
                  </select>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{t(`pol.${type}.d`)}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400" htmlFor="pol-name">{t("pol.name")}</label>
                  <input id="pol-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t(`pol.${type}`)} className="field focus-ring !h-11" />
                </div>

                {fields.map((f) => {
                  const v = getParam(f)
                  return (
                    <div key={f.key} className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-400">{t(`pol.f.${f.key}`)}</label>
                        <span className="num rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-100">{formatParamValue(f.key, v)}</span>
                      </div>
                      <input
                        type="range" min={f.min} max={f.max} step={f.step} value={v}
                        onChange={(e) => setParams((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-cyan-300"
                        style={rangeFill(v, f)}
                      />
                      <div className="num mt-2 flex justify-between text-[11px] font-medium text-slate-600">
                        <span>{formatParamValue(f.key, f.min)}</span>
                        <span>{formatParamValue(f.key, f.max)}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {(error || success) && (
              <div role="status" className={`rounded-xl border px-3 py-2 text-xs ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-200" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"}`}>
                {error ?? success}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={confirm}
                disabled={loading || (tab === "preset" && !preset)}
                className="btn btn-primary focus-ring flex-1"
              >
                {loading ? t("pol.enacting") : t("pol.confirm")}
              </button>
              <button onClick={() => setOpen(false)} className="btn focus-ring">{t("btn.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
