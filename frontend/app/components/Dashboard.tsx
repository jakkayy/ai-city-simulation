"use client"

import { useEffect, useState, useCallback } from "react"
import { getSocket } from "../lib/socket"
import { fetchStatus, startSim, stopSim, stepSim } from "../lib/api"
import CitizenCard from "./CitizenCard"
import ReplayPanel from "./ReplayPanel"
import PolicyPanel from "./PolicyPanel"
import GatewayStatusPanel from "./GatewayStatusPanel"
import CityMap from "./CityMap"
import type { TickData, SimStatus, SimEvent } from "../lib/types"

const CRISIS_STYLE: Record<string, string> = {
  warning: "bg-yellow-900 border-yellow-500 text-yellow-200",
  critical: "bg-orange-900 border-orange-500 text-orange-200",
  collapse: "bg-red-900 border-red-500 text-red-200",
}

interface CityManagerProposal {
  policy_type: string
  parameters: Record<string, unknown>
  reason?: string
}

interface AdvisorMessage {
  crisis_level: string
  advice: string
}

export default function Dashboard() {
  const [tick, setTick] = useState<TickData | null>(null)
  const [status, setStatus] = useState<SimStatus | null>(null)
  const [recentEvents, setRecentEvents] = useState<SimEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [proposal, setProposal] = useState<CityManagerProposal | null>(null)
  const [advisorMsg, setAdvisorMsg] = useState<AdvisorMessage | null>(null)

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
    socket.on("city_manager_proposal", (data: CityManagerProposal) => {
      setProposal(data)
    })
    socket.on("advisor_message", (data: AdvisorMessage) => {
      setAdvisorMsg(data)
    })
    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("tick")
      socket.off("city_manager_proposal")
      socket.off("advisor_message")
    }
  }, [])

  const handleStart = useCallback(async () => {
    await startSim()
    setStatus((s) => s ? { ...s, is_running: true, replay_mode: false } : s)
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
  const isRunning = status?.is_running ?? false
  const replayMode = status?.replay_mode ?? false

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
            {replayMode && (
              <span className="ml-2 text-purple-400 font-semibold">• replay</span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 items-center">
          <GatewayStatusPanel />
          {!replayMode && <PolicyPanel onEnacted={() => fetchStatus().then(setStatus).catch(console.error)} />}
          <ReplayPanel
            isRunning={isRunning}
            replayMode={replayMode}
            onReplayStart={() => setStatus((s) => s ? { ...s, is_running: true, replay_mode: true } : s)}
            onReplayStop={() => setStatus((s) => s ? { ...s, is_running: false, replay_mode: false } : s)}
          />
          {!replayMode && (
            <>
              <button
                onClick={handleStep}
                disabled={isRunning}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-40"
              >
                Step
              </button>
              {isRunning ? (
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
            </>
          )}
        </div>
      </div>

      {/* Crisis banner */}
      {crisis && (
        <div className={`border rounded-lg px-4 py-2 text-sm font-semibold ${CRISIS_STYLE[crisis]}`}>
          ⚠ City Crisis: {crisis.toUpperCase()} — avg happiness {avgHappiness.toFixed(1)}
        </div>
      )}

      {/* Policy Advisor alert */}
      {advisorMsg && (
        <div className="border border-orange-500 bg-orange-950 rounded-lg px-4 py-3 flex justify-between items-start gap-3">
          <div>
            <p className="text-xs font-bold text-orange-300 mb-1">
              Policy Advisor — {advisorMsg.crisis_level.toUpperCase()} crisis
            </p>
            <p className="text-sm text-orange-100">{advisorMsg.advice}</p>
          </div>
          <button
            onClick={() => setAdvisorMsg(null)}
            className="text-orange-400 hover:text-orange-200 text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* City Manager proposal */}
      {proposal && (
        <div className="border border-blue-500 bg-blue-950 rounded-lg px-4 py-3 flex justify-between items-start gap-3">
          <div>
            <p className="text-xs font-bold text-blue-300 mb-1">City Manager Proposal</p>
            <p className="text-sm text-blue-100">
              <span className="font-semibold">{proposal.policy_type}</span>
              {proposal.reason && <span className="text-blue-300"> — {proposal.reason}</span>}
            </p>
            <p className="text-xs text-blue-400 mt-0.5">
              {JSON.stringify(proposal.parameters)}
            </p>
          </div>
          <button
            onClick={() => setProposal(null)}
            className="text-blue-400 hover:text-blue-200 text-xs shrink-0"
          >
            ✕
          </button>
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

      {/* City Map */}
      {citizens.length > 0 && (
        <CityMap citizens={citizens} zonePops={pops} />
      )}

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
