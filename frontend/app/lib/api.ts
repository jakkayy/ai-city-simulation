import type { SimStatus } from "./types"

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

export const startSim = () => post("/simulation/start")
export const stopSim = () => post("/simulation/stop")
export const stepSim = () => post("/simulation/step")
