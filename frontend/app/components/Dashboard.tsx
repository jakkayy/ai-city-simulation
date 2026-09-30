"use client"

import { useState } from "react"
import { enactPolicy } from "../lib/api"
import { useSimulation } from "../lib/useSimulation"
import type { CityManagerProposal, PolicyType } from "../lib/types"
import Alerts from "./Alerts"
import CitizenGrid from "./CitizenGrid"
import CityMap from "./CityMap"
import EventFeed from "./EventFeed"
import Header from "./Header"
import StatCards from "./StatCards"
import Toasts from "./Toasts"
import ZoneStrip from "./ZoneStrip"

export default function Dashboard() {
  const sim = useSimulation()
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const { tick, status, citizens } = sim
  const day = tick?.day ?? status?.simulation_day ?? 0
  const avgHappiness =
    tick?.avg_happiness ??
    (citizens.length ? citizens.reduce((s, c) => s + c.happiness, 0) / citizens.length : 0)
  const cityFund = tick?.city_fund ?? status?.city_fund ?? 0
  const serviceQuality = tick?.service_quality ?? status?.service_quality ?? 0
  const taxRate = tick?.tax_rate ?? status?.tax_rate ?? 0
  const pops =
    tick?.zone_populations ??
    {
      A: citizens.filter((c) => c.zone === "A").length,
      B: citizens.filter((c) => c.zone === "B").length,
      C: citizens.filter((c) => c.zone === "C").length,
    }
  const isRunning = status?.is_running ?? false
  const replayMode = status?.replay_mode ?? false

  const acceptProposal = async (p: CityManagerProposal) => {
    const params: Record<string, number> = {}
    for (const [k, v] of Object.entries(p.parameters)) if (typeof v === "number") params[k] = v
    const label = p.policy_type.replace(/_/g, " ")
    try {
      const res = await enactPolicy(p.policy_type as PolicyType, `City Manager: ${label}`, params, p.reasoning ?? p.reason)
      sim.toast("ok", `Enacted "${res.name}" on day ${res.enacted_day}`)
      sim.dismissProposal()
      sim.refreshStatus()
    } catch (e) {
      sim.toast("error", e instanceof Error ? e.message : "Failed to enact policy")
    }
  }

  return (
    <main className="app-shell min-h-screen text-slate-100">
      <div className="aurora a" />
      <div className="aurora b" />
      <div className="aurora c" />

      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Header
          day={day}
          connected={sim.connected}
          isRunning={isRunning}
          replayMode={replayMode}
          busy={sim.busy}
          citizenCount={citizens.length}
          onStart={sim.start}
          onStop={sim.stop}
          onStep={sim.step}
          onPolicyEnacted={sim.refreshStatus}
          onReplayChange={sim.refreshStatus}
        />

        <Alerts
          crisis={tick?.crisis_level ?? null}
          avgHappiness={avgHappiness}
          advisor={sim.advisorMsg}
          proposal={sim.proposal}
          replayMode={replayMode}
          onDismissAdvisor={sim.dismissAdvisor}
          onDismissProposal={sim.dismissProposal}
          onAcceptProposal={acceptProposal}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <StatCards
              happiness={avgHappiness}
              fund={cityFund}
              service={serviceQuality}
              taxRate={taxRate}
              history={sim.history}
            />
            <ZoneStrip citizens={citizens} pops={pops} />
            {citizens.length > 0 ? (
              <CityMap citizens={citizens} zonePops={pops} highlightId={highlightId} onHover={setHighlightId} />
            ) : (
              <div className="shimmer h-[28rem] rounded-2xl" />
            )}
            <CitizenGrid citizens={citizens} highlightId={highlightId} onHover={setHighlightId} />
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <EventFeed events={sim.events} />
          </div>
        </div>
      </div>

      <Toasts toasts={sim.toasts} />
    </main>
  )
}
