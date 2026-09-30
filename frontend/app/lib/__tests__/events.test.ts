import { describe, expect, it } from "vitest"
import { eventText } from "../events"
import { DICTS, type Lang } from "../i18n"
import type { SimEvent } from "../types"

const tFor = (lang: Lang) => (key: string, vars?: Record<string, string | number>) => {
  let s = DICTS[lang][key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
  return s
}

const ev = (event_type: string, data?: SimEvent["data"], narrative = "Original English text."): SimEvent => ({
  citizen_id: "x",
  event_type,
  narrative,
  happiness_delta: 0,
  data,
})

describe("eventText", () => {
  it("falls back to the narrative when there is no structured data", () => {
    expect(eventText(ev("migration"), tFor("th"))).toBe("Original English text.")
  })

  it("falls back for event types it does not know", () => {
    expect(eventText(ev("something_new", { name: "Ann" }), tFor("th"))).toBe("Original English text.")
  })

  it("renders the same event in both languages", () => {
    const e = ev("migration", { name: "Ann", from: "C", to: "B" })
    expect(eventText(e, tFor("th"))).toBe("Ann ย้ายจากโซน C ไปโซน B")
    expect(eventText(e, tFor("en"))).toBe("Ann moved from Zone C to Zone B.")
  })

  it("translates the job name", () => {
    const e = ev("job_recovery", { name: "Bob", job: "teacher" })
    expect(eventText(e, tFor("th"))).toBe("Bob ได้งานเป็นครู")
    expect(eventText(e, tFor("en"))).toBe("Bob found work as a teacher.")
  })

  it("formats money and picks the city-event kind", () => {
    const e = ev("city_event", { kind: "disaster", cost: 2000 })
    expect(eventText(e, tFor("en"))).toBe("Disaster strikes: services are damaged and repairs cost $2,000.")
    expect(eventText(ev("city_event", { kind: "grant", amount: 3000 }), tFor("th"))).toBe("รัฐส่งเงินสนับสนุน $3,000 เข้างบเมือง")
    expect(eventText(ev("city_event", { kind: "recession", days: 8 }), tFor("th"))).toContain("8 วัน")
  })

  it("has a translation for every event type the backend sends", () => {
    const keys = [
      "ev.job_recovery", "ev.job_loss", "ev.bankruptcy", "ev.migration", "ev.migration_waitlisted",
      "ev.city_event.recession", "ev.city_event.boom", "ev.city_event.disaster", "ev.city_event.grant",
    ]
    for (const k of keys) {
      expect(DICTS.th[k], k).toBeTruthy()
      expect(DICTS.en[k], k).toBeTruthy()
    }
  })
})
