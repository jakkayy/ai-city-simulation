"use client"

import type { Citizen } from "../lib/types"

const ZONE_COLOR: Record<string, string> = {
  A: "bg-blue-500",
  B: "bg-green-500",
  C: "bg-yellow-500",
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
    value >= 60 ? "bg-green-400" : value >= 35 ? "bg-yellow-400" : "bg-red-400"
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export default function CitizenCard({ citizen }: { citizen: Citizen }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-white truncate">
          {citizen.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {citizen.pending_reaction && (
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" title="Awaiting AI response" />
          )}
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${ZONE_COLOR[citizen.zone]}`}
          >
            Z{citizen.zone}
          </span>
        </div>
      </div>

      <span className="text-xs text-gray-400">
        {JOB_LABEL[citizen.job_type] ?? citizen.job_type}
      </span>

      <div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Happiness</span>
          <span className="text-white">{citizen.happiness.toFixed(1)}</span>
        </div>
        <HappinessBar value={citizen.happiness} />
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Savings</span>
        <span className={citizen.savings < 0 ? "text-red-400" : "text-emerald-400"}>
          ${citizen.savings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="text-xs text-gray-500 italic truncate">
        {citizen.last_action}
      </div>
    </div>
  )
}
