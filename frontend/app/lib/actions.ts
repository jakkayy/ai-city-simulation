// last_action comes from the backend as a code ("got_job") or a free sentence
// ("reacted positively to the tax_decrease policy"); map the known ones to translation keys.

const CODES = new Set([
  "stayed", "arrived", "migrated", "got_job", "lost_job",
  "savings_critical", "bankrupt", "went_about_their_day", "idle",
])

export interface ActionLabel {
  key: string
  vars?: Record<string, string>
}

export function actionLabel(raw: string): ActionLabel | null {
  const code = (raw || "idle").trim().toLowerCase().replace(/\s+/g, "_")
  if (CODES.has(code)) return { key: `act.${code}` }
  const m = /^reacted (positively|negatively|neutrally) to the (\w+) policy/i.exec(raw ?? "")
  if (m) {
    const tone = m[1].toLowerCase()
    const kind = tone === "positively" ? "positive" : tone === "negatively" ? "negative" : "neutral"
    return { key: `act.reacted_${kind}`, vars: { policy: m[2] } }
  }
  return null
}
