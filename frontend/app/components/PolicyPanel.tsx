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
        className="px-3 py-1.5 text-sm bg-indigo-700 hover:bg-indigo-600 rounded transition"
      >
        Enact Policy
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-400 font-semibold">Enact a City Policy</p>

          {/* Policy type selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Policy Type</label>
            <select
              className="bg-gray-700 text-white text-sm rounded p-1.5 border border-gray-600"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as PolicyType)}
            >
              {POLICY_TYPES.map((t) => (
                <option key={t} value={t}>{POLICY_META[t].label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">{meta.description}</p>
          </div>

          {/* Policy name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Policy Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. "${meta.label} Decree"`}
              className="bg-gray-700 text-white text-sm rounded p-1.5 border border-gray-600 placeholder-gray-500"
            />
          </div>

          {/* Dynamic parameter fields */}
          {meta.fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-400">{f.label}</label>
                <span className="text-xs text-white font-semibold">
                  {getParam(f.key, f.defaultValue)}
                </span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={getParam(f.key, f.defaultValue)}
                onChange={(e) => setParams((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                className="accent-indigo-400"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{f.min}</span>
                <span>{f.max}</span>
              </div>
            </div>
          ))}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">{success}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-sm bg-indigo-700 hover:bg-indigo-600 rounded transition disabled:opacity-50"
            >
              {loading ? "Enacting…" : "Enact"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
