"use client"

import AnimatedNumber from "./AnimatedNumber"
import type { Citizen } from "../lib/types"
import { moodColor, ZONE_KEYS, ZONE_META } from "../lib/mood"

interface Props {
  citizens: Citizen[]
  pops: { A: number; B: number; C: number }
}

export default function ZoneStrip({ citizens, pops }: Props) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {ZONE_KEYS.map((z, i) => {
        const meta = ZONE_META[z]
        const members = citizens.filter((c) => c.zone === z)
        const avg = members.length ? members.reduce((s, c) => s + c.happiness, 0) / members.length : 0
        const fill = Math.min(1, pops[z] / meta.capacity)
        const full = pops[z] >= meta.capacity

        return (
          <div
            key={z}
            className="panel lift fade-up relative overflow-hidden rounded-2xl px-4 py-3.5"
            style={{ animationDelay: `${240 + i * 60}ms` }}
          >
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: meta.color, boxShadow: `0 0 18px ${meta.color}` }} />
            <div className="flex items-center justify-between gap-3 pl-2">
              <div>
                <div className="eyebrow" style={{ color: meta.color }}>{meta.name}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <AnimatedNumber value={pops[z]} className="num text-2xl font-bold text-white" />
                  <span className="num text-xs text-slate-500">/ {meta.capacity}</span>
                  {full && <span className="ml-1 rounded bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">full</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="eyebrow">Mood</div>
                <div className="num mt-1 text-lg font-bold" style={{ color: members.length ? moodColor(avg) : "#64748b" }}>
                  {members.length ? avg.toFixed(0) : "–"}
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800 pl-2">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${fill * 100}%`, background: `linear-gradient(90deg, ${meta.color}66, ${meta.color})` }}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}
