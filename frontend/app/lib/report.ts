// Helpers for the end-of-day reports: the bullet list shown for a day, and keeping the list in
// order when a new report or an LLM bulletin arrives.

import { eventText } from "./events"
import type { DayReport } from "./types"

type T = (key: string, vars?: Record<string, string | number>) => string

export const MAX_REPORTS = 30

// The notable things that happened that day, as sentences in the current language.
export function reportBullets(report: DayReport, t: T): string[] {
  const out: string[] = []

  for (const p of report.policies) out.push(t("dayrep.policy", { name: p.name }))

  for (const data of report.city_events) {
    out.push(eventText({ citizen_id: "", event_type: "city_event", narrative: "", happiness_delta: 0, data }, t))
  }

  if (report.crisis) out.push(t("dayrep.crisis", { level: t(`crisis.${report.crisis}`) }))

  const c = report.counts
  const counted: [number, string][] = [
    [c.bankruptcy, "dayrep.bankruptcy"],
    [c.job_loss, "dayrep.job_loss"],
    [c.job_recovery, "dayrep.job_recovery"],
    [c.moves, "dayrep.moves"],
    [c.waitlist, "dayrep.waitlist"],
  ]
  for (const [n, key] of counted) if (n > 0) out.push(t(key, { n }))

  return out.length ? out : [t("dayrep.quiet")]
}

// newest first, one report per day, at most MAX_REPORTS
export function addReport(list: DayReport[], report: DayReport): DayReport[] {
  const existing = list.find((r) => r.day === report.day)
  const merged = existing?.narrative && !report.narrative ? { ...report, narrative: existing.narrative } : report
  return [merged, ...list.filter((r) => r.day !== report.day)]
    .sort((a, b) => b.day - a.day)
    .slice(0, MAX_REPORTS)
}

// the LLM bulletin arrives after the report itself
export function addNarrative(list: DayReport[], day: number, narrative: DayReport["narrative"]): DayReport[] {
  return list.map((r) => (r.day === day ? { ...r, narrative } : r))
}
