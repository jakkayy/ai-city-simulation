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
    <main className="app-shell min-h-screen text-slate-100">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="glass-panel relative z-50 overflow-visible rounded-2xl px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">AI City Simulation</h1>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-100">
                  Day {day}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className={connected ? "text-emerald-300" : "text-rose-300"}>
                  {connected ? "● live city feed" : "○ disconnected"}
                </span>
                <span className="text-slate-600">/</span>
                <span>{citizens.length} citizens tracked</span>
                {replayMode && (
                  <>
                    <span className="text-slate-600">/</span>
                    <span className="font-semibold text-violet-300">replay mode</span>
                  </>
                )}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
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
                    className="focus-ring rounded-lg border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  >
                    Step
                  </button>
                  {isRunning ? (
                    <button
                      onClick={handleStop}
                      className="focus-ring rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={handleStart}
                      className="focus-ring rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400"
                    >
                      Start
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Crisis banner */}
        {crisis && (
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${CRISIS_STYLE[crisis]}`}>
            City Crisis: {crisis.toUpperCase()} · avg happiness {avgHappiness.toFixed(1)}
          </div>
        )}

        {/* Policy Advisor alert */}
        {advisorMsg && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-950/70 px-4 py-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                  Policy Advisor · {advisorMsg.crisis_level.toUpperCase()} crisis
                </p>
                <p className="mt-1 text-sm text-amber-50">{advisorMsg.advice}</p>
              </div>
              <button
                onClick={() => setAdvisorMsg(null)}
                className="focus-ring rounded-md px-2 text-sm text-amber-300 transition hover:bg-amber-300/10 hover:text-amber-100"
              >
                x
              </button>
            </div>
          </div>
        )}

        {/* City Manager proposal */}
        {proposal && (
          <div className="rounded-xl border border-cyan-300/35 bg-cyan-950/60 px-4 py-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">City Manager Proposal</p>
                <p className="mt-1 text-sm text-cyan-50">
                  <span className="font-semibold">{proposal.policy_type}</span>
                  {proposal.reason && <span className="text-cyan-200"> · {proposal.reason}</span>}
                </p>
                <p className="mt-1 text-xs text-cyan-300/80">
                  {JSON.stringify(proposal.parameters)}
                </p>
              </div>
              <button
                onClick={() => setProposal(null)}
                className="focus-ring rounded-md px-2 text-sm text-cyan-300 transition hover:bg-cyan-300/10 hover:text-cyan-100"
              >
                x
              </button>
            </div>
          </div>
        )}

        {/* City stats */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Avg Happiness" value={avgHappiness.toFixed(1)} unit="/100" color={avgHappiness >= 50 ? "text-emerald-300" : "text-rose-300"} />
          <StatCard label="City Fund" value={`$${cityFund.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} color={cityFund >= 0 ? "text-cyan-300" : "text-rose-300"} />
          <StatCard label="Service Quality" value={serviceQuality.toFixed(1)} unit="/100" color="text-sky-300" />
          <StatCard label="Tax Rate" value={`${(taxRate * 100).toFixed(0)}%`} color="text-amber-300" />
        </section>

        {/* Zone populations */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(["A", "B", "C"] as const).map((z) => (
            <div key={z} className="soft-panel rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Zone {z}</div>
                  <div className="mt-1 text-2xl font-bold text-white">{pops[z]}</div>
                </div>
                <div className={`h-10 w-10 rounded-xl ${z === "A" ? "bg-blue-400/20 text-blue-200" : z === "B" ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/20 text-amber-200"} flex items-center justify-center text-sm font-bold`}>
                  Z{z}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* City Map */}
        {citizens.length > 0 && (
          <CityMap citizens={citizens} zonePops={pops} />
        )}

        {/* Citizens grid + event log */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Citizens</h2>
                <p className="text-xs text-slate-400">{citizens.length} active agents</p>
              </div>
            </div>
            {citizens.length === 0 ? (
              <div className="soft-panel rounded-xl p-6 text-sm text-slate-400">Waiting for first tick...</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {citizens.map((c) => (
                  <CitizenCard key={c.id} citizen={c} />
                ))}
              </div>
            )}
          </div>

          {/* Event log */}
          <aside className="min-w-0">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-white">Recent Events</h2>
              <p className="text-xs text-slate-400">{recentEvents.length} latest changes</p>
            </div>
            <div className="soft-panel thin-scrollbar flex max-h-[32rem] flex-col gap-2 overflow-y-auto rounded-xl p-3">
              {recentEvents.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No events yet.</p>
              ) : recentEvents.map((ev, i) => (
                <div key={i} className="rounded-lg border border-slate-700/70 bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-300">
                  {ev.narrative}
                  {ev.happiness_delta !== 0 && (
                    <span className={`ml-1 font-semibold ${ev.happiness_delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      ({ev.happiness_delta > 0 ? "+" : ""}{ev.happiness_delta})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
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
    <div className="soft-panel group overflow-hidden rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>
            {value}<span className="ml-1 text-xs font-semibold text-slate-500">{unit}</span>
          </div>
        </div>
        <div className="h-2 w-16 rounded-full bg-slate-700/80">
          <div className="h-2 w-10 rounded-full bg-current opacity-60" />
        </div>
      </div>
    </div>
  )
}
