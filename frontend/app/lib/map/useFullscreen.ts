"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

// Fullscreen for one element. Uses the Fullscreen API where it exists and otherwise
// (e.g. iPhone Safari) lets the caller fill the window itself via the returned flag.
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false) }
    document.addEventListener("fullscreenchange", onChange)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      window.removeEventListener("keydown", onKey)
    }
  }, [ref])

  const toggle = useCallback(async () => {
    const el = ref.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
      return
    }
    if (fullscreen) { setFullscreen(false); return }   // fallback overlay is on
    if (el.requestFullscreen) {
      try { await el.requestFullscreen(); return } catch {}
    }
    setFullscreen(true)   // browsers without the Fullscreen API: fill the window instead
  }, [ref, fullscreen])

  return { fullscreen, toggle }
}
