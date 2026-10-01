import { describe, expect, it } from "vitest"
import { DICTS } from "../i18n"
import { FIELDS, POLICY_TYPES, PRESETS, formatParamValue, formatStoredParams, toApiParams } from "../policies"

describe("policies", () => {
  it("only use parameter names the backend accepts", () => {
    const allowed: Record<string, string[]> = {
      tax_increase: ["tax_rate"],
      tax_decrease: ["tax_rate"],
      service_boost: ["service_quality_delta"],
      service_cut: ["service_quality_delta"],
      housing: ["fund_cost"],
      job_program: ["fund_cost", "unemployment_reduction"],
    }
    for (const type of POLICY_TYPES) {
      expect(FIELDS[type].map((f) => f.key).sort(), type).toEqual([...allowed[type]].sort())
    }
  })

  it("start every slider inside its own range", () => {
    for (const type of POLICY_TYPES) {
      for (const f of FIELDS[type]) {
        expect(f.min).toBeLessThan(f.max)
        expect(f.defaultValue).toBeGreaterThanOrEqual(f.min)
        expect(f.defaultValue).toBeLessThanOrEqual(f.max)
      }
    }
  })

  it("keep the tax rate within the backend cap of 60 %", () => {
    expect(FIELDS.tax_increase[0].max).toBeLessThanOrEqual(0.6)
    expect(FIELDS.tax_decrease[0].max).toBeLessThanOrEqual(0.6)
  })

  it("have presets that fit their policy type and ranges", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    for (const preset of PRESETS) {
      const fields = FIELDS[preset.type]
      expect(Object.keys(preset.params).sort(), preset.id).toEqual(fields.map((f) => f.key).sort())
      for (const f of fields) {
        const v = preset.params[f.key]
        expect(v, `${preset.id}.${f.key}`).toBeGreaterThanOrEqual(f.min)
        expect(v, `${preset.id}.${f.key}`).toBeLessThanOrEqual(f.max)
      }
    }
  })

  it("are fully translated: names, descriptions, fields and presets", () => {
    for (const lang of ["th", "en"] as const) {
      const d = DICTS[lang]
      for (const type of POLICY_TYPES) {
        expect(d[`pol.${type}`], `${lang} pol.${type}`).toBeTruthy()
        expect(d[`pol.${type}.d`], `${lang} pol.${type}.d`).toBeTruthy()
        for (const f of FIELDS[type]) expect(d[`pol.f.${f.key}`], `${lang} pol.f.${f.key}`).toBeTruthy()
      }
      for (const p of PRESETS) {
        for (const suffix of ["", ".pro", ".con"]) {
          expect(d[`preset.${p.id}${suffix}`], `${lang} preset.${p.id}${suffix}`).toBeTruthy()
        }
      }
    }
  })
})

describe("showing and sending values", () => {
  it("formats slider values", () => {
    expect(formatParamValue("tax_rate", 0.15)).toBe("15%")
    expect(formatParamValue("fund_cost", 5000)).toBe("$5,000")
    expect(formatParamValue("unemployment_reduction", 30)).toBe("30%")
    expect(formatParamValue("service_quality_delta", 10)).toBe("+10")
    expect(formatParamValue("service_quality_delta", -10)).toBe("-10")
  })

  it("sends unemployment_reduction as a 0-1 fraction and leaves everything else alone", () => {
    expect(toApiParams({ fund_cost: 3000, unemployment_reduction: 30 })).toEqual({ fund_cost: 3000, unemployment_reduction: 0.3 })
    expect(toApiParams({ tax_rate: 0.25 })).toEqual({ tax_rate: 0.25 })
  })

  it("does not modify the object it is given", () => {
    const values = { unemployment_reduction: 50 }
    toApiParams(values)
    expect(values.unemployment_reduction).toBe(50)
  })

  it("shows stored parameters, accepting both fractions and percents", () => {
    expect(formatStoredParams({ fund_cost: 3000, unemployment_reduction: 0.3 })).toBe("$3,000 · 30%")
    expect(formatStoredParams({ unemployment_reduction: 30 })).toBe("30%")
    expect(formatStoredParams({ tax_rate: 0.1 })).toBe("10%")
  })
})
