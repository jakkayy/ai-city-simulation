import { describe, expect, it } from "vitest"
import { DICTS, type Lang } from "../i18n"
import { MAX_REPORTS, addNarrative, addReport, reportBullets } from "../report"
import type { DayReport } from "../types"

const tFor = (lang: Lang) => (key: string, vars?: Record<string, string | number>) => {
  let s = DICTS[lang][key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
  return s
}

const report = (day: number, over: Partial<DayReport> = {}): DayReport => ({
  day, happiness: 60, happiness_delta: 0.4, fund: 10000, fund_delta: 120, service: 80, tax_rate: 0.15,
  counts: { moves: 0, waitlist: 0, job_loss: 0, job_recovery: 0, bankruptcy: 0 },
  city_events: [], policies: [], crisis: null, highlight: false, ...over,
})

describe("reportBullets", () => {
  it("says so when nothing happened", () => {
    expect(reportBullets(report(1), tFor("th"))).toEqual(["วันธรรมดา ไม่มีเหตุการณ์สำคัญ"])
    expect(reportBullets(report(1), tFor("en"))).toEqual(["A quiet day, nothing notable."])
  })

  it("lists only the counts that are not zero, in both languages", () => {
    const r = report(2, { counts: { moves: 3, waitlist: 0, job_loss: 2, job_recovery: 0, bankruptcy: 1 } })
    expect(reportBullets(r, tFor("en"))).toEqual(["1 went bankrupt", "2 lost their job", "3 moved house"])
    expect(reportBullets(r, tFor("th"))).toEqual(["1 คนล้มละลาย", "2 คนตกงาน", "3 คนย้ายบ้าน"])
  })

  it("mentions policies, city events and a crisis first", () => {
    const r = report(3, {
      policies: [{ name: "Tax cut", type: "tax_decrease" }],
      city_events: [{ kind: "disaster", cost: 2000 }],
      crisis: "critical",
      counts: { moves: 1, waitlist: 0, job_loss: 0, job_recovery: 0, bankruptcy: 0 },
    })
    expect(reportBullets(r, tFor("en"))).toEqual([
      "Policy enacted: Tax cut",
      "Disaster strikes: services are damaged and repairs cost $2,000.",
      "Crisis level: Critical",
      "1 moved house",
    ])
  })
})

describe("keeping the list of reports", () => {
  it("is newest first with one report per day", () => {
    let list: DayReport[] = []
    for (const d of [3, 1, 2, 2]) list = addReport(list, report(d))
    expect(list.map((r) => r.day)).toEqual([3, 2, 1])
  })

  it("never grows past the limit and drops the oldest", () => {
    let list: DayReport[] = []
    for (let d = 1; d <= MAX_REPORTS + 5; d++) list = addReport(list, report(d))
    expect(list).toHaveLength(MAX_REPORTS)
    expect(list[0].day).toBe(MAX_REPORTS + 5)
    expect(list.at(-1)?.day).toBe(6)
  })

  it("attaches the AI bulletin to its day when it arrives later", () => {
    const list = addNarrative([report(2), report(1)], 2, { th: "ก", en: "a" })
    expect(list[0].narrative).toEqual({ th: "ก", en: "a" })
    expect(list[1].narrative).toBeUndefined()
  })

  it("does not lose a bulletin when the same day is re-sent without one", () => {
    let list = addReport([], report(5))
    list = addNarrative(list, 5, { th: "ก", en: "a" })
    list = addReport(list, report(5, { happiness: 61 }))
    expect(list[0].happiness).toBe(61)
    expect(list[0].narrative).toEqual({ th: "ก", en: "a" })
  })

  it("ignores a bulletin for a day it does not have", () => {
    const list = addNarrative([report(1)], 99, { th: "ก", en: "a" })
    expect(list).toHaveLength(1)
    expect(list[0].narrative).toBeUndefined()
  })
})
