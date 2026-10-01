"use client"

import type { Toast } from "../../lib/useSimulation"

export default function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`slide-in panel pointer-events-auto flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ${
            t.kind === "error" ? "text-rose-100" : "text-emerald-100"
          }`}
          style={{ boxShadow: `0 0 28px ${t.kind === "error" ? "rgba(244,63,94,0.25)" : "rgba(52,211,153,0.22)"}` }}
        >
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.kind === "error" ? "bg-rose-400" : "bg-emerald-400"}`} />
          <span className="leading-snug">{t.text}</span>
        </div>
      ))}
    </div>
  )
}
