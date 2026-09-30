export const MOOD = {
  happy: "#4ade80",
  stable: "#fbbf24",
  risk: "#fb7185",
} as const

export function moodColor(h: number): string {
  return h >= 60 ? MOOD.happy : h >= 35 ? MOOD.stable : MOOD.risk
}

export function moodLabel(h: number): string {
  return h >= 60 ? "Happy" : h >= 35 ? "Stable" : "At risk"
}

export const ZONE_META = {
  A: { color: "#60a5fa", name: "Zone A", sub: "Civic / High Rise", capacity: 15 },
  B: { color: "#34d399", name: "Zone B", sub: "Mixed Use Quarter", capacity: 20 },
  C: { color: "#fbbf24", name: "Zone C", sub: "Residential Blocks", capacity: 30 },
} as const

export type ZoneKey = keyof typeof ZONE_META
export const ZONE_KEYS = ["A", "B", "C"] as const

export function prettyAction(a: string): string {
  return a ? a.replace(/_/g, " ") : "idle"
}
