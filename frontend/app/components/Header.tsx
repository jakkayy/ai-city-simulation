"use client"

import AnimatedNumber from "./AnimatedNumber"
import GatewayStatusPanel from "./GatewayStatusPanel"
import PolicyPanel from "./PolicyPanel"
import ReplayPanel from "./ReplayPanel"

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
}

function StatusPill({ connected, isRunning, replayMode }: Pick<Props, "connected" | "isRunning" | "replayMode">) {
  const cfg = !connected
    ? { label: "Offline", color: "#fb7185" }
    : replayMode
      ? { label: "Replay", color: "#a78bfa" }
      : isRunning
        ? { label: "Live", color: "#34d399" }
        : { label: "Paused", color: "#fbbf24" }

  return (
    <span
      className="inline-flex h-6 items-center gap-2 rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-[0.14em]"
      style={{ color: cfg.color, borderColor: `${cfg.color}55`, background: `${cfg.color}14` }}
    >
      <span className={isRunning || replayMode ? "live-dot" : "h-2 w-2 rounded-full bg-current"} />
      {cfg.label}
    </span>
  )
}

export default function Header(p: Props) {
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
                <span className="eyebrow">Day</span>
                <AnimatedNumber value={p.day} className="num text-sm font-bold text-cyan-200" duration={500} />
              </span>
              <span className="text-slate-700">|</span>
              <span>{p.citizenCount} citizens</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              <button onClick={p.onStep} disabled={p.isRunning || p.busy} className="btn focus-ring">
                Step
              </button>
              {p.isRunning ? (
                <button onClick={p.onStop} disabled={p.busy} className="btn btn-danger focus-ring">
                  <span className="h-2.5 w-2.5 rounded-sm bg-white" /> Pause
                </button>
              ) : (
                <button onClick={p.onStart} disabled={p.busy} className="btn btn-go focus-ring">
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="currentColor"><path d="M1 0l9 5-9 5z" /></svg> Start
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
