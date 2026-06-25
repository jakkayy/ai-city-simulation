import type { SimStatus, DailySnapshot, PolicyType, PolicyResponse, GatewayStatus } from "./types"

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api"

async function post(path: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchStatus(): Promise<SimStatus> {
  const res = await fetch(`${BASE}/simulation/status`)
  return res.json()
}

export async function fetchSnapshots(): Promise<DailySnapshot[]> {
  const res = await fetch(`${BASE}/simulation/snapshots`)
  return res.json()
}

export const startSim = () => post("/simulation/start", {})
export const stopSim = () => post("/simulation/stop")
export const stepSim = () => post("/simulation/step")
export const startReplay = (from_day: number) => post("/simulation/replay", { from_day })
export const stopReplay = () => post("/simulation/replay/stop")

export async function fetchPolicies(): Promise<PolicyResponse[]> {
  const res = await fetch(`${BASE}/policies`)
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
