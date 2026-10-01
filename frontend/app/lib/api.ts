import type { Citizen, DayReport, SimStatus, DailySnapshot, PolicyType, PolicyResponse, GatewayStatus } from "./types"

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api"

async function post(path: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

// FastAPI errors look like {"detail": "..."}; show the detail, not raw JSON.
async function errorMessage(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const detail = JSON.parse(text).detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join("; ")
  } catch {}
  return text || `Request failed (${res.status})`
}

export async function fetchStatus(): Promise<SimStatus> {
  const res = await fetch(`${BASE}/simulation/status`)
  return res.json()
}

export async function fetchCitizens(): Promise<Citizen[]> {
  const res = await fetch(`${BASE}/citizens`)
  if (!res.ok) throw new Error(await errorMessage(res))
  const rows: Citizen[] = await res.json()
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    zone: c.zone,
    happiness: Math.round(c.happiness * 10) / 10,
    savings: c.savings,
    job_type: c.job_type,
    last_action: c.last_action,
    pending_reaction: c.pending_reaction,
  }))
}

export async function fetchReports(limit = 30): Promise<DayReport[]> {
  const res = await fetch(`${BASE}/reports?limit=${limit}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  const data = await res.json()
  return Array.isArray(data) ? data : []   // an older or odd backend must not break the page
}

export async function fetchSnapshots(): Promise<DailySnapshot[]> {
  const res = await fetch(`${BASE}/simulation/snapshots`)
  return res.json()
}

export const startSim = (tick_interval_seconds?: number) =>
  post("/simulation/start", tick_interval_seconds ? { tick_interval_seconds } : {})
export const setSpeed = (tick_interval_seconds: number) => post("/simulation/speed", { tick_interval_seconds })
export const resetCity = () => post("/simulation/reset")
export const stopSim = () => post("/simulation/stop")
export const stepSim = () => post("/simulation/step")
export const startReplay = (from_day: number) => post("/simulation/replay", { from_day })
export const stopReplay = () => post("/simulation/replay/stop")

export async function fetchPolicies(): Promise<PolicyResponse[]> {
  const res = await fetch(`${BASE}/policies`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function fetchGatewayStatus(): Promise<GatewayStatus> {
  const res = await fetch(`${BASE}/gateway/status`)
  return res.json()
}

export async function enactPolicy(
  policy_type: PolicyType,
  name: string,
  parameters: Record<string, number>,
  narrative?: string,
): Promise<PolicyResponse> {
  return post("/policies", { policy_type, name, parameters, narrative: narrative ?? "" })
}
