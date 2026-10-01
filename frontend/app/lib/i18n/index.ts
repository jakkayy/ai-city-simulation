"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { en } from "./en"
import { th } from "./th"
import type { Dict, Lang } from "./types"

export type { Lang }

const KEY = "aicity.lang"
const listeners = new Set<() => void>()

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "en" ? "en" : "th"
  } catch {
    return "th"
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {}
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export const DICTS: Record<Lang, Dict> = { th, en }

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, read, () => "th" as Lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = DICTS[lang][key] ?? DICTS.en[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
      return s
    },
    [lang],
  )
  return { t, lang, setLang }
}
