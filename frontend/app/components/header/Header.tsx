"use client"

import { useI18n } from "../../lib/i18n"
import AnimatedNumber from "../ui/AnimatedNumber"
import LangToggle from "./LangToggle"
import ResetButton from "./ResetButton"
import SpeedControl from "./SpeedControl"
import StatusPill from "./StatusPill"
import GatewayStatusPanel from "../panels/GatewayStatusPanel"
import PolicyPanel from "../panels/PolicyPanel"
import ReplayPanel from "../panels/ReplayPanel"

interface Props {
  day: number
  connected: boolean
  isRunning: boolean
  replayMode: boolean
  busy: boolean
  citizenCount: number
  onStart: () => void
  onStop: () => void
  onStep: () => void
  onPolicyEnacted: () => void
  onReplayChange: () => void
  onOpenGuide: () => void
  speed: number
  onSpeed: (seconds: number) => void
  onReset: () => void
}

export default function Header(p: Props) {
  const { t } = useI18n()
  return (
    <header className="panel fade-up relative z-50 rounded-2xl px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="float-slow relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/25 to-violet-400/25 ring-1 ring-white/15">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-200" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 21h18M5 21V9l5-3v15M10 21V4l5 3v14M15 21v-8l4 2v6" />
              <path d="M7.5 12h1M7.5 15h1M12.5 9h1M12.5 12h1M12.5 15h1" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                AI City Simulation
              </h1>
              <StatusPill connected={p.connected} isRunning={p.isRunning} replayMode={p.replayMode} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="eyebrow">{t("app.day")}</span>
                <AnimatedNumber value={p.day} className="num text-sm font-bold text-cyan-200" duration={500} />
              </span>
              <span className="text-slate-700">|</span>
              <span>{t("app.citizens", { n: p.citizenCount })}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LangToggle />
          <button onClick={p.onOpenGuide} className="btn focus-ring" title={t("btn.guide.hint")}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">?</span> {t("btn.guide")}
          </button>
          <GatewayStatusPanel />
          {!p.replayMode && <PolicyPanel onEnacted={p.onPolicyEnacted} />}
          <ReplayPanel
            isRunning={p.isRunning}
            replayMode={p.replayMode}
            onReplayStart={p.onReplayChange}
            onReplayStop={p.onReplayChange}
          />
          {!p.replayMode && (
            <>
              <SpeedControl speed={p.speed} onSpeed={p.onSpeed} />
              <ResetButton disabled={p.isRunning || p.busy} onReset={p.onReset} />
              <button onClick={p.onStep} disabled={p.isRunning || p.busy} className="btn focus-ring" title={t("btn.step.hint")}>
                {t("btn.step")}
              </button>
              {p.isRunning ? (
                <button onClick={p.onStop} disabled={p.busy} className="btn btn-danger focus-ring" title={t("btn.pause.hint")}>
                  <span className="h-2.5 w-2.5 rounded-sm bg-white" /> {t("btn.pause")}
                </button>
              ) : (
                <button onClick={p.onStart} disabled={p.busy} className="btn btn-go focus-ring" title={t("btn.start.hint")}>
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="currentColor"><path d="M1 0l9 5-9 5z" /></svg> {t("btn.start")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
