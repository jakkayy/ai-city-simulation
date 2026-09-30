import { describe, expect, it } from "vitest"
import { actionLabel } from "../actions"
import { avatarTraits, expressionFor, hashString, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "../avatar"
import { DICTS } from "../i18n"

describe("avatars", () => {
  it("are deterministic per citizen id", () => {
    expect(avatarTraits("abc-123")).toEqual(avatarTraits("abc-123"))
    expect(hashString("abc")).toBe(hashString("abc"))
  })

  it("vary between citizens", () => {
    const faces = new Set(
      Array.from({ length: 50 }, (_, i) => JSON.stringify(avatarTraits(`citizen-${i}-uuid`))),
    )
    expect(faces.size).toBeGreaterThan(40)
  })

  it("only use known palette values", () => {
    for (let i = 0; i < 200; i++) {
      const t = avatarTraits(`id-${i}`)
      expect(SKIN_TONES).toContain(t.skin)
      expect(HAIR_COLORS).toContain(t.hair)
      expect(t.hairStyle).toBeGreaterThanOrEqual(0)
      expect(t.hairStyle).toBeLessThan(HAIR_STYLES)
    }
  })

  it("expression follows the happiness bands used elsewhere", () => {
    expect(expressionFor(60)).toBe("happy")
    expect(expressionFor(59.9)).toBe("ok")
    expect(expressionFor(35)).toBe("ok")
    expect(expressionFor(34.9)).toBe("sad")
  })
})

describe("action labels", () => {
  it("translates known codes and sentences", () => {
    expect(actionLabel("got_job")).toEqual({ key: "act.got_job" })
    expect(actionLabel("Went about their day")).toEqual({ key: "act.went_about_their_day" })
    expect(actionLabel("reacted positively to the tax_decrease policy")).toEqual({
      key: "act.reacted_positive",
      vars: { policy: "tax_decrease" },
    })
    expect(actionLabel("")).toEqual({ key: "act.idle" })
  })

  it("returns null for free text it does not know", () => {
    expect(actionLabel("decided to open a bakery")).toBeNull()
  })

  it("every key it can produce exists in both languages", () => {
    const codes = ["stayed", "arrived", "migrated", "got_job", "lost_job", "savings_critical", "bankrupt", "went_about_their_day", "idle"]
    for (const c of codes) {
      const key = actionLabel(c)!.key
      expect(DICTS.th[key], key).toBeTruthy()
      expect(DICTS.en[key], key).toBeTruthy()
    }
    for (const k of ["positive", "negative", "neutral"]) {
      expect(DICTS.th[`act.reacted_${k}`]).toBeTruthy()
      expect(DICTS.en[`act.reacted_${k}`]).toBeTruthy()
    }
  })
})
