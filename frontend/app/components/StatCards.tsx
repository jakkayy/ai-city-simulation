"use client"

import AnimatedNumber from "./AnimatedNumber"
import Sparkline from "./Sparkline"
import type { HistoryPoint } from "../lib/types"
import { moodColor } from "../lib/mood"

interface Props {
  happiness: number
  fund: number
  service: number
  taxRate: number
  history: HistoryPoint[]
}

function Delta({ series, suffix = "", invert = false }: { series: number[]; suffix?: string; invert?: boolean }) {
  if (series.length < 2) return <span className="text-xs text-slate-500">— no change</span>
  const d = series[series.length - 1] - series[series.length - 2]
  if (Math.abs(d) < 0.05) return <span className="text-xs text-slate-500">— steady</span>
  const good = invert ? d < 0 : d > 0
  return (
    <span className={`text-xs font-semibold ${good ? "text-emerald-300" : "text-rose-300"}`}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d).toLocaleString("en-US", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  )
}

function Card({
  label,
  color,
  children,
  spark,
  footer,
  delay,
}: {
  label: string
  color: string
  children: React.ReactNode
  spark?: React.ReactNode
  footer?: React.ReactNode
  delay: number
}) {
  return (
    <div className="panel lift fade-up relative overflow-hidden rounded-2xl p-4" style={{ animationDelay: `${delay}ms` }}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: color }}
      />
      <div className="eyebrow">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="num text-[2rem] font-bold leading-none tracking-tight" style={{ color }}>
          {children}
        </div>
        <div className="shrink-0">{spark}</div>
      </div>
      <div className="mt-3 min-h-4">{footer}</div>
    </div>
  )
}

export default function StatCards({ happiness, fund, service, taxRate, history }: Props) {
  const hs = history.map((p) => p.happiness)
  const fs = history.map((p) => p.fund)
  const ss = history.map((p) => p.service)
  const taxPct = taxRate * 100

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Avg Happiness"
        color={moodColor(happiness)}
        delay={0}
        spark={<Sparkline data={hs.length ? hs : [happiness]} color={moodColor(happiness)} />}
        footer={<Delta series={hs} />}
      >
        <AnimatedNumber value={happiness} format={(n) => n.toFixed(1)} />
        <span className="ml-1 text-xs font-medium text-slate-500">/100</span>
      </Card>

      <Card
        label="City Fund"
        color={fund >= 0 ? "#22d3ee" : "#fb7185"}
        delay={60}
        spark={<Sparkline data={fs.length ? fs : [fund]} color={fund >= 0 ? "#22d3ee" : "#fb7185"} />}
        footer={<Delta series={fs} />}
      >
        <AnimatedNumber value={fund} format={(n) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`} />
      </Card>

      <Card
        label="Service Quality"
        color="#38bdf8"
        delay={120}
        spark={<Sparkline data={ss.length ? ss : [service]} color="#38bdf8" />}
        footer={<Delta series={ss} />}
      >
        <AnimatedNumber value={service} format={(n) => n.toFixed(1)} />
        <span className="ml-1 text-xs font-medium text-slate-500">/100</span>
      </Card>

      <Card
        label="Tax Rate"
        color="#fbbf24"
        delay={180}
        footer={
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-[width] duration-700"
              style={{ width: `${Math.min(100, (taxPct / 60) * 100)}%` }}
            />
          </div>
        }
        spark={<span className="text-xs text-slate-500">cap 60%</span>}
      >
        <AnimatedNumber value={taxPct} format={(n) => `${Math.round(n)}%`} />
      </Card>
    </section>
  )
}
