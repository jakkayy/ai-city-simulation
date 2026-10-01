"use client"

import { useEffect, useState } from "react"
import { enactPolicy } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { useSimulation } from "../lib/useSimulation"
import type { CityManagerProposal, PolicyType } from "../lib/types"
import Alerts from "./Alerts"
import CitizenGrid from "./citizens/CitizenGrid"
import CityMap from "./map/CityMap"
import FeedPanel from "./feed/FeedPanel"
import ReportPopup from "./feed/ReportPopup"
import CitySummary from "./stats/CitySummary"
import Guide, { hasSeenGuide } from "./panels/Guide"
import Header from "./header/Header"
import PolicyHistory from "./feed/PolicyHistory"
import StatCards from "./stats/StatCards"
import Toasts from "./ui/Toasts"
import ZoneStrip from "./stats/ZoneStrip"

export default function Dashboard() {
  const sim = useSimulation()
  const { t } = useI18n()
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [policyVersion, setPolicyVersion] = useState(0)

  // first visit: show the guide automatically
  useEffect(() => {
    const id = setTimeout(() => { if (!hasSeenGuide()) setGuideOpen(true) }, 500)
    return () => clearTimeout(id)
  }, [])

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
      sim.toast("ok", t("pol.enacted", { name: res.name, day: res.enacted_day }))
      sim.dismissProposal()
      sim.refreshStatus()
      setPolicyVersion((v) => v + 1)
    } catch (e) {
      sim.toast("error", e instanceof Error ? e.message : t("pol.failed"))
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
          onPolicyEnacted={() => { sim.refreshStatus(); setPolicyVersion((v) => v + 1) }}
          onReplayChange={() => { sim.refreshStatus(); sim.reload() }}
          speed={status?.tick_interval_seconds ?? 60}
          onSpeed={sim.changeSpeed}
          onReset={sim.reset}
          onOpenGuide={() => setGuideOpen(true)}
        />

        <CitySummary
          started={isRunning || day > 0}
          happiness={avgHappiness}
          fund={cityFund}
          crisis={tick?.crisis_level ?? null}
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
              <CityMap citizens={citizens} zonePops={pops} highlightId={highlightId} onHover={setHighlightId} serviceQuality={serviceQuality} day={day} running={isRunning} intervalSec={status?.tick_interval_seconds ?? 60} />
            ) : (
              <div className="shimmer h-[28rem] rounded-2xl" />
            )}
            <CitizenGrid citizens={citizens} highlightId={highlightId} onHover={setHighlightId} />
          </div>

          <div className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
            <FeedPanel events={sim.events} reports={sim.reports} />
            <PolicyHistory version={policyVersion} />
          </div>
        </div>
      </div>

      <ReportPopup report={sim.popupReport} onClose={sim.closeReportPopup} />
      <Toasts toasts={sim.toasts} />
      <Guide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  )
}
