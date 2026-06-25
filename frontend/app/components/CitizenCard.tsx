"use client"

import type { Citizen } from "../lib/types"

const ZONE_COLOR: Record<string, string> = {
  A: "border-blue-300/30 bg-blue-400/15 text-blue-100",
  B: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
  C: "border-amber-300/30 bg-amber-400/15 text-amber-100",
}

const JOB_LABEL: Record<string, string> = {
  business_owner: "Business",
  professional: "Professional",
  teacher: "Teacher",
  service_worker: "Service",
  laborer: "Laborer",
  farmer: "Farmer",
  unemployed: "Unemployed",
}

function HappinessBar({ value }: { value: number }) {
  const color =
    value >= 60 ? "bg-emerald-400" : value >= 35 ? "bg-amber-400" : "bg-rose-400"
  return (
    <div className="mt-1.5 h-2 w-full rounded-full bg-slate-950/70">
      <div
        className={`${color} h-2 rounded-full shadow-sm transition-all duration-500`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export default function CitizenCard({ citizen }: { citizen: Citizen }) {
  return (
    <article className="soft-panel rounded-xl p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-500/50 hover:bg-slate-800/80">
      <div className="flex items-center justify-between">
        <span className="truncate text-sm font-semibold text-white">
          {citizen.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {citizen.pending_reaction && (
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" title="Awaiting AI response" />
          )}
          <span
            className={`rounded-md border px-1.5 py-0.5 text-xs font-bold ${ZONE_COLOR[citizen.zone]}`}
          >
            Z{citizen.zone}
          </span>
        </div>
      </div>

      <span className="mt-1 block text-xs text-slate-400">
        {JOB_LABEL[citizen.job_type] ?? citizen.job_type}
      </span>

      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Happiness</span>
          <span className="font-semibold text-white">{citizen.happiness.toFixed(1)}</span>
        </div>
        <HappinessBar value={citizen.happiness} />
      </div>

      <div className="mt-3 flex justify-between text-xs">
        <span className="text-slate-400">Savings</span>
        <span className={citizen.savings < 0 ? "text-rose-300" : "text-emerald-300"}>
          ${citizen.savings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="mt-2 truncate border-t border-slate-700/60 pt-2 text-xs italic text-slate-500">
        {citizen.last_action}
      </div>
    </article>
  )
}
