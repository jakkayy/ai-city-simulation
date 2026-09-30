"use client"

import type { EventItem } from "../lib/types"

const KIND: Record<string, { icon: string; label: string }> = {
  migration: { icon: "M4 12h13m0 0l-5-5m5 5l-5 5", label: "Move" },
  migration_waitlisted: { icon: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z", label: "Waitlist" },
  job_recovery: { icon: "M5 13l4 4L19 7", label: "Job" },
}
const FALLBACK = { icon: "M12 8v5m0 3h.01M12 21a9 9 0 100-18 9 9 0 000 18z", label: "Event" }

export default function EventFeed({ events }: { events: EventItem[] }) {
  return (
    <aside className="panel flex max-h-[calc(100vh-2rem)] min-h-[20rem] flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Live Feed</h2>
          <p className="text-xs text-slate-400">{events.length ? `${events.length} latest changes` : "Waiting for activity"}</p>
        </div>
        <span className="live-dot text-cyan-300" />
      </div>

      <div className="thin-scrollbar -mr-2 flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
        {events.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-500">
            <div className="shimmer h-2 w-24 rounded-full" />
            <div className="shimmer h-2 w-36 rounded-full" />
            <p className="mt-2">Start the simulation to watch the city come alive.</p>
          </div>
        ) : (
          events.map((ev) => {
            const k = KIND[ev.event_type] ?? FALLBACK
            const d = ev.happiness_delta
            const tone = d > 0 ? "#34d399" : d < 0 ? "#fb7185" : "#94a3b8"
            return (
              <div key={ev.uid} className="slide-in flex gap-3 rounded-xl border border-white/[0.06] bg-slate-950/40 p-2.5">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${tone}1f`, color: tone }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={k.icon} /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-slate-200">{ev.narrative}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span>Day {ev.day}</span>
                    <span>·</span>
                    <span>{k.label}</span>
                    {d !== 0 && (
                      <span className="num ml-auto" style={{ color: tone }}>
                        {d > 0 ? "+" : ""}{d}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
