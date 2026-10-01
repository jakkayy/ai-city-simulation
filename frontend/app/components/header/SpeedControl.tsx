"use client"

import { useI18n } from "../../lib/i18n"

// seconds of real time per city day
export const SPEEDS = [
  { key: "slow", seconds: 120 },
  { key: "normal", seconds: 60 },
  { key: "fast", seconds: 30 },
  { key: "turbo", seconds: 10 },
] as const

export default function SpeedControl({ speed, onSpeed }: { speed: number; onSpeed: (seconds: number) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex h-[2.4rem] items-center rounded-xl border border-slate-400/20 bg-slate-800/50 p-0.5" role="group" aria-label={t("speed.label")}>
      {SPEEDS.map((sp) => (
        <button
          key={sp.key}
          onClick={() => onSpeed(sp.seconds)}
          aria-pressed={speed === sp.seconds}
          title={t("speed.hint", { s: sp.seconds })}
          className={`focus-ring h-full rounded-[0.6rem] px-2.5 text-xs font-bold transition ${speed === sp.seconds ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          {t(`speed.${sp.key}`)}
        </button>
      ))}
    </div>
  )
}
