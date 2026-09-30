// Deterministic, procedurally generated avatars: the same citizen id always gives the same face.

export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// mulberry32
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SKIN_TONES = ["#f6d3b8", "#eab68f", "#d99a6c", "#b87748", "#8d5a36", "#5f3b22"]
export const HAIR_COLORS = ["#1c1410", "#3b2416", "#6b4226", "#9a4f2b", "#d7b56d", "#a8a8a8"]
export const SHIRT_COLORS = ["#64748b", "#0ea5e9", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#f87171", "#22d3ee"]
export const HAIR_STYLES = 6

export type Expression = "happy" | "ok" | "sad"

export interface AvatarTraits {
  skin: string
  hair: string
  hairStyle: number
  shirt: string
  glasses: boolean
  eyeShift: number
}

export function avatarTraits(seed: string): AvatarTraits {
  const rnd = seededRandom(hashString(seed))
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)]
  return {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    hairStyle: Math.floor(rnd() * HAIR_STYLES),
    shirt: pick(SHIRT_COLORS),
    glasses: rnd() < 0.15,
    eyeShift: rnd() < 0.5 ? 0 : 0.4,
  }
}

export function expressionFor(happiness: number): Expression {
  return happiness >= 60 ? "happy" : happiness >= 35 ? "ok" : "sad"
}
