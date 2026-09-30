import { describe, expect, it } from "vitest"
import { DICTS } from "../i18n"
import { moodColor, moodLabel, prettyAction } from "../mood"

describe("translations", () => {
  const th = Object.keys(DICTS.th).sort()
  const en = Object.keys(DICTS.en).sort()

  it("Thai and English define exactly the same keys", () => {
    expect(th.filter((k) => !en.includes(k))).toEqual([])
    expect(en.filter((k) => !th.includes(k))).toEqual([])
  })

  it("no translation is empty", () => {
    for (const lang of ["th", "en"] as const) {
      for (const [key, value] of Object.entries(DICTS[lang])) {
        expect(value.trim(), `${lang}:${key}`).not.toBe("")
      }
    }
  })

  it("placeholders match between languages", () => {
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",")
    for (const key of th) {
      expect(holes(DICTS.th[key]), key).toBe(holes(DICTS.en[key]))
    }
  })

  it("every policy type has a name and a description", () => {
    for (const type of ["tax_increase", "tax_decrease", "service_boost", "service_cut", "housing", "job_program"]) {
      expect(DICTS.th[`pol.${type}`]).toBeTruthy()
      expect(DICTS.th[`pol.${type}.d`]).toBeTruthy()
    }
  })

  it("every job type is translated", () => {
    for (const job of ["business_owner", "professional", "teacher", "service_worker", "laborer", "farmer", "unemployed"]) {
      expect(DICTS.th[`job.${job}`]).toBeTruthy()
    }
  })
})

describe("mood helpers", () => {
  it("maps happiness to the three bands", () => {
    expect(moodLabel(80)).toBe("Happy")
    expect(moodLabel(50)).toBe("Stable")
    expect(moodLabel(10)).toBe("At risk")
    expect(moodColor(60)).not.toBe(moodColor(59.9))
  })

  it("prettifies actions", () => {
    expect(prettyAction("got_job")).toBe("got job")
    expect(prettyAction("")).toBe("idle")
  })
})

describe("keys used in the UI", () => {
  it("every t(\"...\") / label key in the source exists in both languages", async () => {
    const { readdirSync, readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const root = join(__dirname, "..", "..")
    const files: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== "__tests__") walk(p) }
        else if (/\.(tsx?|ts)$/.test(e.name)) files.push(p)
      }
    }
    walk(root)

    const missing: string[] = []
    for (const f of files) {
      const src = readFileSync(f, "utf8")
      // literal keys: t("a.b")  /  t('a.b')
      for (const m of src.matchAll(/\bt\(\s*["']([\w.]+)["']/g)) {
        if (!(m[1] in DICTS.th)) missing.push(`${f}: ${m[1]}`)
      }
      // keys stored in data tables: label: "feed.move"
      for (const m of src.matchAll(/label:\s*["']((?:feed|speed|pol|job|zone)\.[\w.]+)["']/g)) {
        if (!(m[1] in DICTS.th)) missing.push(`${f}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })
})
