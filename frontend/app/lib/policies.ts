// What the player can enact: the policy types, their sliders, the one-click presets, and how
// parameter values are shown and sent. Pure data and functions (no React), so it is easy to test.
// The allowed parameter names mirror backend/app/simulation/policy_engine.py (_POLICY_SCHEMA).

import type { PolicyType } from "./types"

export interface Field {
  key: string
  min: number
  max: number
  step: number
  defaultValue: number
}

export const FIELDS: Record<PolicyType, Field[]> = {
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

export const POLICY_TYPES = Object.keys(FIELDS) as PolicyType[]

export interface Preset {
  id: string
  type: PolicyType
  params: Record<string, number>   // in slider units (percent for unemployment_reduction)
  accent: string
}

export const PRESETS: Preset[] = [
  { id: "tax10", type: "tax_decrease", params: { tax_rate: 0.1 }, accent: "#34d399" },
  { id: "tax25", type: "tax_increase", params: { tax_rate: 0.25 }, accent: "#fbbf24" },
  { id: "svc10", type: "service_boost", params: { service_quality_delta: 10 }, accent: "#38bdf8" },
  { id: "svcm10", type: "service_cut", params: { service_quality_delta: -10 }, accent: "#fb7185" },
  { id: "house", type: "housing", params: { fund_cost: 5000 }, accent: "#a78bfa" },
  { id: "jobs", type: "job_program", params: { fund_cost: 3000, unemployment_reduction: 30 }, accent: "#22d3ee" },
]

// a value as shown next to a slider
export function formatParamValue(key: string, value: number): string {
  if (key === "tax_rate") return `${Math.round(value * 100)}%`
  if (key === "fund_cost") return `$${value.toLocaleString("en-US")}`
  if (key === "unemployment_reduction") return `${value}%`
  return value > 0 ? `+${value}` : `${value}`
}

// What the API stores for unemployment_reduction is a 0-1 fraction (percent values are tolerated).
const toPercent = (v: number) => Math.round(v > 1 ? v : v * 100)

// the parameters of an enacted policy, as stored by the backend, for display
export function formatStoredParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .map(([k, v]) => formatParamValue(k, k === "unemployment_reduction" ? toPercent(Number(v)) : Number(v)))
    .join(" · ")
}

// slider values -> request body (the API and the City Manager use a 0-1 fraction)
export function toApiParams(values: Record<string, number>): Record<string, number> {
  const body = { ...values }
  if ("unemployment_reduction" in body) body.unemployment_reduction /= 100
  return body
}
