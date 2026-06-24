"use client"

import { useEffect, useState, useCallback } from "react"
import { getSocket } from "../lib/socket"
import { fetchStatus, startSim, stopSim, stepSim } from "../lib/api"
import CitizenCard from "./CitizenCard"
import type { TickData, SimStatus, SimEvent } from "../lib/types"

const CRISIS_STYLE: Record<string, string> = {
  warning: "bg-yellow-900 border-yellow-500 text-yellow-200",
  critical: "bg-orange-900 border-orange-500 text-orange-200",
  collapse: "bg-red-900 border-red-500 text-red-200",
}

export default function Dashboard() {
  const [tick, setTick] = useState<TickData | null>(null)
  const [status, setStatus] = useState<SimStatus | null>(null)
  const [recentEvents, setRecentEvents] = useState<SimEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetchStatus().then(setStatus).catch(console.error)

    const socket = getSocket()
    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))
    socket.on("tick", (data: TickData) => {
      setTick(data)
      setStatus((s) => s ? { ...s, is_running: true, simulation_day: data.day } : s)
      if (data.events.length > 0) {
        setRecentEvents((prev) => [...data.events, ...prev].slice(0, 20))
      }
    })
    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("tick")
    }
  }, [])

  const handleStart = useCallback(async () => {
    await startSim()
    setStatus((s) => s ? { ...s, is_running: true } : s)
  }, [])

  const handleStop = useCallback(async () => {
    await stopSim()
    setStatus((s) => s ? { ...s, is_running: false } : s)
  }, [])

  const handleStep = useCallback(async () => {
    await stepSim()
    const s = await fetchStatus()
    setStatus(s)
  }, [])

  const day = tick?.day ?? status?.simulation_day ?? 0
  const avgHappiness = tick?.avg_happiness ?? 0
  const cityFund = tick?.city_fund ?? status?.city_fund ?? 0
  const serviceQuality = tick?.service_quality ?? status?.service_quality ?? 0
  const taxRate = tick?.tax_rate ?? status?.tax_rate ?? 0
  const crisis = tick?.crisis_level ?? null
  const citizens = tick?.citizens ?? []
  const pops = tick?.zone_populations ?? { A: 0, B: 0, C: 0 }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">AI City Simulation</h1>
          <p className="text-xs text-gray-400">
            Day {day} &nbsp;•&nbsp;
            <span className={connected ? "text-green-400" : "text-red-400"}>
              {connected ? "● live" : "○ disconnected"}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleStep}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            Step
          </button>
          {status?.is_running ? (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 rounded transition"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-3 py-1.5 text-sm bg-green-700 hover:bg-green-600 rounded transition"
            >
              Start
            </button>
          )}
        </div>
      </div>

      {/* Crisis banner */}
      {crisis && (
        <div className={`border rounded-lg px-4 py-2 text-sm font-semibold ${CRISIS_STYLE[crisis]}`}>
          ⚠ City Crisis: {crisis.toUpperCase()} — avg happiness {avgHappiness.toFixed(1)}
        </div>
      )}

      {/* City stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg Happiness" value={avgHappiness.toFixed(1)} unit="/100" color={avgHappiness >= 50 ? "text-green-400" : "text-red-400"} />
        <StatCard label="City Fund" value={`$${cityFund.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} color={cityFund >= 0 ? "text-emerald-400" : "text-red-400"} />
        <StatCard label="Service Quality" value={serviceQuality.toFixed(1)} unit="/100" color="text-blue-400" />
        <StatCard label="Tax Rate" value={`${(taxRate * 100).toFixed(0)}%`} color="text-yellow-400" />
      </div>

      {/* Zone populations */}
      <div className="flex gap-3">
        {(["A", "B", "C"] as const).map((z) => (
          <div key={z} className="flex-1 bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400">Zone {z}</div>
            <div className="text-lg font-bold">{pops[z]}</div>
          </div>
        ))}
      </div>

      {/* Citizens grid + event log */}
      <div className="flex gap-4 flex-1">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Citizens ({citizens.length})</h2>
          {citizens.length === 0 ? (
            <p className="text-gray-600 text-sm">Waiting for first tick…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {citizens.map((c) => (
                <CitizenCard key={c.id} citizen={c} />
              ))}
            </div>
          )}
        </div>

        {/* Event log */}
        {recentEvents.length > 0 && (
          <div className="w-64 shrink-0">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Recent Events</h2>
            <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
              {recentEvents.map((ev, i) => (
                <div key={i} className="bg-gray-800 rounded p-2 text-xs text-gray-300">
                  {ev.narrative}
                  {ev.happiness_delta !== 0 && (
                    <span className={`ml-1 font-semibold ${ev.happiness_delta > 0 ? "text-green-400" : "text-red-400"}`}>
                      ({ev.happiness_delta > 0 ? "+" : ""}{ev.happiness_delta})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit = "",
  color = "text-white",
}: {
  label: string
  value: string
  unit?: string
  color?: string
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${color}`}>
        {value}<span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  )
}
