"use client"

import { useState } from "react"
import { enactPolicy } from "../lib/api"
import type { PolicyType } from "../lib/types"

const POLICY_META: Record<PolicyType, {
  label: string
  description: string
  fields: { key: string; label: string; min: number; max: number; step: number; defaultValue: number }[]
}> = {
  tax_increase: {
    label: "Tax Increase",
    description: "Raise tax rate — boosts city fund, hurts citizens",
    fields: [{ key: "tax_rate", label: "New Tax Rate (0–0.60)", min: 0.01, max: 0.60, step: 0.01, defaultValue: 0.25 }],
  },
  tax_decrease: {
    label: "Tax Decrease",
    description: "Lower tax rate — pleases citizens, reduces city income",
    fields: [{ key: "tax_rate", label: "New Tax Rate (0–0.60)", min: 0.01, max: 0.60, step: 0.01, defaultValue: 0.10 }],
  },
  service_boost: {
    label: "Service Boost",
    description: "Improve public services — costs city fund, raises happiness",
    fields: [{ key: "service_quality_delta", label: "Quality Delta (+1 to +50)", min: 1, max: 50, step: 1, defaultValue: 10 }],
  },
  service_cut: {
    label: "Service Cut",
    description: "Cut public services — saves fund, lowers happiness",
    fields: [{ key: "service_quality_delta", label: "Quality Delta (−1 to −50)", min: -50, max: -1, step: 1, defaultValue: -10 }],
  },
  housing: {
    label: "Housing Programme",
    description: "Fund affordable housing — high cost, improves Zone C",
    fields: [{ key: "fund_cost", label: "Fund Cost ($)", min: 500, max: 20000, step: 500, defaultValue: 5000 }],
  },
  job_program: {
    label: "Job Programme",
    description: "Create jobs for unemployed citizens",
    fields: [
      { key: "fund_cost", label: "Fund Cost ($)", min: 500, max: 20000, step: 500, defaultValue: 3000 },
      { key: "unemployment_reduction", label: "Unemployment Reduction (%)", min: 1, max: 100, step: 1, defaultValue: 30 },
    ],
  },
}

const POLICY_TYPES = Object.keys(POLICY_META) as PolicyType[]

interface Props {
  onEnacted: () => void
}

function formatParamValue(key: string, value: number) {
  if (key === "tax_rate") return `${Math.round(value * 100)}%`
  if (key === "fund_cost") return `$${value.toLocaleString("en-US")}`
  if (key === "unemployment_reduction") return `${value}%`
  return value > 0 ? `+${value}` : `${value}`
}

export default function PolicyPanel({ onEnacted }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PolicyType>("tax_increase")
  const [name, setName] = useState("")
  const [params, setParams] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const meta = POLICY_META[type]

  const handleTypeChange = (t: PolicyType) => {
    setType(t)
    setParams({})
    setError(null)
    setSuccess(null)
  }

  const getParam = (key: string, defaultValue: number) =>
    params[key] !== undefined ? params[key] : defaultValue

  const getRangeFill = (value: number, min: number, max: number) => {
    const percent = ((value - min) / (max - min)) * 100
    return {
      background: `linear-gradient(to right, #67e8f9 0%, #67e8f9 ${percent}%, #334155 ${percent}%, #334155 100%)`,
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Policy name is required"); return }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const filled: Record<string, number> = {}
      for (const f of meta.fields) filled[f.key] = getParam(f.key, f.defaultValue)
      const result = await enactPolicy(type, name.trim(), filled)
      setSuccess(`Enacted "${result.name}" on Day ${result.enacted_day}`)
      setName("")
      setParams({})
      onEnacted()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enact policy")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setError(null); setSuccess(null) }}
        className="focus-ring rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300"
      >
        Enact Policy
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-12 z-[100] flex w-[24rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl p-0 shadow-2xl shadow-cyan-950/30">
          <div className="border-b border-cyan-300/15 bg-cyan-400/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Enact a City Policy</p>
                <p className="mt-1 text-xs text-slate-400">Day-level intervention package</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="focus-ring rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close policy panel"
              >
                x
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/45 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Policy Type</label>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">
                  Active Draft
                </span>
              </div>
              <select
                className="focus-ring h-11 w-full rounded-xl border border-slate-600/80 bg-slate-900 px-3 text-sm font-semibold text-white shadow-inner shadow-black/20 transition hover:border-cyan-300/40"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as PolicyType)}
              >
                {POLICY_TYPES.map((t) => (
                  <option key={t} value={t}>{POLICY_META[t].label}</option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{meta.description}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Policy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. "${meta.label} Decree"`}
                className="focus-ring h-11 rounded-xl border border-slate-600/80 bg-slate-950/70 px-3 text-sm text-white placeholder-slate-600 transition hover:border-cyan-300/40"
              />
            </div>

            <div className="flex flex-col gap-3">
              {meta.fields.map((f) => {
                const value = getParam(f.key, f.defaultValue)
                return (
                  <div key={f.key} className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-400">{f.label}</label>
                      <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-100">
                        {formatParamValue(f.key, value)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={value}
                      onChange={(e) => setParams((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full accent-cyan-300 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cyan-200 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-200 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-950/40"
                      style={getRangeFill(value, f.min, f.max)}
                    />
                    <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-600">
                      <span>{formatParamValue(f.key, f.min)}</span>
                      <span>{formatParamValue(f.key, f.max)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {(error || success) && (
              <div className={`rounded-xl border px-3 py-2 text-xs ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-200" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"}`}>
                {error ?? success}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="focus-ring flex-1 rounded-xl bg-cyan-400 px-3 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {loading ? "Enacting..." : "Enact Policy"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="focus-ring rounded-xl border border-slate-600/80 bg-slate-800/90 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
