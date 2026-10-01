"use client"

import { useI18n } from "../../lib/i18n"

interface Props {
  started: boolean
  happiness: number
  fund: number
  crisis: "warning" | "critical" | "collapse" | null
}

// one plain-language sentence describing how the city is doing right now
export default function CitySummary({ started, happiness, fund, crisis }: Props) {
  const { t } = useI18n()

  let key = "sum.ok"
  let tone = "#22d3ee"
  if (!started) { key = "sum.waiting"; tone = "#94a3b8" }
  else if (crisis === "collapse") { key = "sum.collapse"; tone = "#fb7185" }
  else if (crisis === "critical") { key = "sum.critical"; tone = "#fb923c" }
  else if (crisis === "warning") { key = "sum.warning"; tone = "#fbbf24" }
  else if (fund < 0) { key = "sum.broke"; tone = "#fb7185" }
  else if (fund < 2000) { key = "sum.lowfund"; tone = "#fbbf24" }
  else if (happiness >= 60) { key = "sum.good"; tone = "#34d399" }

  return (
    <p
      className="fade-up flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium text-slate-100"
      style={{ borderColor: `${tone}44`, background: `${tone}12` }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone, boxShadow: `0 0 10px ${tone}` }} />
      {t(key)}
    </p>
  )
}
