"use client"

import { useState } from "react"
import type { AdvisorMessage, CityManagerProposal } from "../lib/types"

interface Props {
  crisis: "warning" | "critical" | "collapse" | null
  avgHappiness: number
  advisor: AdvisorMessage | null
  proposal: CityManagerProposal | null
  replayMode: boolean
  onDismissAdvisor: () => void
  onDismissProposal: () => void
  onAcceptProposal: (p: CityManagerProposal) => Promise<void>
}

const CRISIS = {
  warning: { color: "#fbbf24", label: "Warning", text: "Happiness is slipping" },
  critical: { color: "#fb923c", label: "Critical", text: "Citizens are deeply unhappy" },
  collapse: { color: "#fb7185", label: "Collapse", text: "The city is on the brink" },
} as const

function Close({ onClick, color }: { onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Dismiss"
      className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10"
      style={{ color }}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
    </button>
  )
}

export default function Alerts(p: Props) {
  const [accepting, setAccepting] = useState(false)
  const c = p.crisis ? CRISIS[p.crisis] : null
  const reasoning = p.proposal?.reasoning ?? p.proposal?.reason

  return (
    <>
      {c && (
        <div
          className="crisis-stripes fade-up flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
          style={{ color: c.color, borderColor: `${c.color}66`, background: `${c.color}18`, boxShadow: `0 0 34px ${c.color}22` }}
          role="alert"
        >
          <span className="live-dot shrink-0" />
          <span className="font-bold uppercase tracking-[0.14em]">{c.label}</span>
          <span className="text-slate-200">
            {c.text} · avg happiness <span className="num font-bold">{p.avgHappiness.toFixed(1)}</span>
          </span>
        </div>
      )}

      {p.advisor && (
        <div className="fade-up rounded-2xl border border-amber-300/30 bg-amber-400/[0.07] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow !text-amber-200">Policy Advisor · {p.advisor.crisis_level} crisis</p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-50/90">{p.advisor.advice}</p>
            </div>
            <Close onClick={p.onDismissAdvisor} color="#fcd34d" />
          </div>
        </div>
      )}

      {p.proposal && (
        <div className="fade-up rounded-2xl border border-cyan-300/30 bg-cyan-400/[0.07] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow !text-cyan-200">City Manager Proposal</p>
              <p className="mt-1.5 text-sm text-cyan-50">
                <span className="font-semibold">{p.proposal.policy_type.replace(/_/g, " ")}</span>
                {reasoning && <span className="text-cyan-100/80"> · {reasoning}</span>}
              </p>
              <p className="num mt-1 break-all text-xs text-cyan-200/60">{JSON.stringify(p.proposal.parameters)}</p>
              {!p.replayMode && (
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn btn-primary focus-ring !h-8 !text-xs"
                    disabled={accepting}
                    onClick={async () => {
                      setAccepting(true)
                      try {
                        await p.onAcceptProposal(p.proposal!)
                      } finally {
                        setAccepting(false)
                      }
                    }}
                  >
                    {accepting ? "Enacting…" : "Enact this policy"}
                  </button>
                  <button className="btn focus-ring !h-8 !text-xs" onClick={p.onDismissProposal}>Ignore</button>
                </div>
              )}
            </div>
            <Close onClick={p.onDismissProposal} color="#67e8f9" />
          </div>
        </div>
      )}
    </>
  )
}
