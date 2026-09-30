// Feed events arrive with an English `narrative` plus (from newer backends) structured `data`.
// When we know the event we rebuild the sentence in the current language; otherwise -- free text
// written by the AI, or events from an older backend -- we show the original narrative.

import { DICTS } from "./i18n"
import type { SimEvent } from "./types"

type T = (key: string, vars?: Record<string, string | number>) => string

const MONEY_FIELDS = new Set(["cost", "amount"])

export function eventText(ev: SimEvent, t: T): string {
  const d = ev.data
  if (!d) return ev.narrative

  const key = typeof d.kind === "string" ? `ev.${ev.event_type}.${d.kind}` : `ev.${ev.event_type}`
  if (!(key in DICTS.th)) return ev.narrative

  const vars: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(d)) {
    // lower-case for English mid-sentence ("found work as a teacher"); a no-op for Thai
    if (k === "job" && typeof v === "string") vars[k] = t(`job.${v}`).toLowerCase()
    else if (MONEY_FIELDS.has(k) && typeof v === "number") vars[k] = v.toLocaleString("en-US")
    else vars[k] = v
  }
  return t(key, vars)
}
