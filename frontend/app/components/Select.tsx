"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export interface SelectOption<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  variant?: "field" | "pill"
  className?: string
  placeholder?: string
  id?: string
}

interface Pos {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

const MAX_LIST = 288

// A themed replacement for <select>: same keyboard behaviour (arrows, Home/End, Enter/Space,
// Esc, type-to-open) and ARIA listbox semantics. The list lives in a portal so it is never
// clipped by the scrolling popovers it is used in.
export default function Select<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  variant = "field",
  className = "",
  placeholder = "",
  id,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<Pos | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const listId = `${id ?? "select"}-list`

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const openList = () => {
    const el = buttonRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const wanted = Math.min(MAX_LIST, options.length * 40 + 12)
    const up = below < wanted && above > below
    const width = Math.max(r.width, 180)
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      maxHeight: Math.max(120, Math.min(MAX_LIST, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    })
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const close = () => setOpen(false)

  const choose = (index: number) => {
    const opt = options[index]
    if (opt) onChange(opt.value)
    close()
    buttonRef.current?.focus()
  }

  // close on outside click, resize, or scrolling anything but the list itself
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) close()
    }
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener("pointerdown", onPointer)
    window.addEventListener("resize", close)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      window.removeEventListener("resize", close)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [open])

  // keep the highlighted option visible
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (!open) openList()
        else setActive((a) => Math.min(last, a + 1))
        break
      case "ArrowUp":
        e.preventDefault()
        if (!open) openList()
        else setActive((a) => Math.max(0, a - 1))
        break
      case "Home":
        if (open) { e.preventDefault(); setActive(0) }
        break
      case "End":
        if (open) { e.preventDefault(); setActive(last) }
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (open) choose(active)
        else openList()
        break
      case "Escape":
        if (open) { e.preventDefault(); close() }
        break
      case "Tab":
        close()
        break
    }
  }

  const pill = variant === "pill"

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`field${pill ? " field-pill" : ""} focus-ring flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${selected ? "" : "text-slate-500"}`}>{selected?.label ?? placeholder}</span>
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>

      {open && pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="popover thin-scrollbar fixed z-[400] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
            style={{ ...pos, transformOrigin: pos.bottom !== undefined ? "bottom left" : "top left" }}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value
              const isActive = i === active
              return (
                <li
                  key={String(o.value)}
                  id={`${listId}-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-cyan-300/15 text-white" : "text-slate-200"
                  } ${isSelected ? "font-semibold" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-cyan-300" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2.5 6.5l2.3 2.3L9.5 3.8" />
                    </svg>
                  )}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </>
  )
}
