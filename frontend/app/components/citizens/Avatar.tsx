"use client"

import { useId } from "react"
import { avatarTraits, expressionFor } from "../../lib/avatar"

interface Props {
  seed: string
  happiness: number
  job: string
  color: string // zone colour, used for the backdrop
  size?: number
  x?: number
  y?: number
  className?: string
}

const HAIR: Record<number, string[]> = {
  0: ["M19 28 C19 15 28 12 32 12 C38 12 45 16 45 28 C42 22 38 20 32 20 C26 20 22 22 19 28 Z"],
  1: ["M18 30 C16 14 28 10 32 10 C38 10 48 14 46 30 L46 46 L41 46 L41 28 C38 22 26 22 23 28 L23 46 L18 46 Z"],
  2: ["M19 28 C19 15 28 12 32 12 C38 12 45 16 45 28 C42 22 38 20 32 20 C26 20 22 22 19 28 Z"],
  3: [],
  4: ["M20 26 C21 17 27 15 32 15 C37 15 43 17 44 26 C41 21 37 19 32 19 C27 19 23 21 20 26 Z"],
  5: ["M19 29 C18 15 30 10 38 13 C44 15 46 22 45 29 C43 21 36 18 30 20 C25 21 21 24 19 29 Z"],
}

const MOUTH = {
  happy: "M27 36.5 Q32 42 37 36.5",
  ok: "M28.5 38.5 L35.5 38.5",
  sad: "M27.5 40 Q32 35.5 36.5 40",
}

const BROWS = {
  happy: ["M24 25 Q27 23.5 30 25", "M34 25 Q37 23.5 40 25"],
  ok: ["M24 25 L30 25", "M34 25 L40 25"],
  sad: ["M24 26.5 L30 24.5", "M34 24.5 L40 26.5"],
}

export default function Avatar({ seed, happiness, job, color, size = 44, x, y, className }: Props) {
  const id = useId()
  const t = avatarTraits(seed)
  const mood = expressionFor(happiness)
  const hasHat = job === "laborer" || job === "farmer" || job === "service_worker"
  const shirt = job === "unemployed" ? "#64748b" : t.shirt
  const glasses = t.glasses || job === "teacher"

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      x={x}
      y={y}
      className={className}
      role="img"
      aria-label={`${mood} citizen avatar`}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.55} />
          <stop offset="100%" stopColor="#0b1020" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="64" height="64" rx="15" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="64" height="64" fill={`url(#${id}-bg)`} />

        {/* body */}
        <path d="M6 66 C6 50 20 46 32 46 C44 46 58 50 58 66 Z" fill={shirt} />
        {job === "business_owner" && (
          <>
            <path d="M26 46 L32 54 L38 46 Z" fill="#f8fafc" />
            <path d="M32 48 L29.6 52 L32 63 L34.4 52 Z" fill="#b91c1c" />
          </>
        )}
        {job === "professional" && (
          <>
            <path d="M26 46 L32 57 L38 46" fill="none" stroke="#38bdf8" strokeWidth={1.4} />
            <rect x="29.5" y="56" width="5" height="6.5" rx="1" fill="#f8fafc" />
          </>
        )}

        {/* neck + head */}
        <rect x="27.5" y="38" width="9" height="10" fill={t.skin} />
        <rect x="27.5" y="38" width="9" height="10" fill="#000" opacity={0.14} />
        <circle cx="20" cy="31" r="2.6" fill={t.skin} />
        <circle cx="44" cy="31" r="2.6" fill={t.skin} />
        {!hasHat && <g fill={t.hair}>{HAIR[t.hairStyle].map((d, i) => <path key={i} d={d} />)}</g>}
        <ellipse cx="32" cy="30" rx="12" ry="14" fill={t.skin} />

        {/* hair drawn over the forehead (after the head) */}
        {!hasHat && (
          <g fill={t.hair}>
            {t.hairStyle === 2 && <circle cx="32" cy="10" r="5.5" />}
            {t.hairStyle === 3 &&
              [[22, 19], [28, 14.5], [36, 14.5], [42, 19], [20.5, 26], [43.5, 26]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={6} />
              ))}
            {HAIR[t.hairStyle].map((d, i) => <path key={`f${i}`} d={d} />)}
          </g>
        )}

        {/* hats */}
        {job === "laborer" && (
          <>
            <path d="M19 22 C19 11 27 8 32 8 C37 8 45 11 45 22 Z" fill="#facc15" />
            <rect x="16" y="21" width="32" height="4" rx="2" fill="#eab308" />
          </>
        )}
        {job === "farmer" && (
          <>
            <ellipse cx="32" cy="21" rx="21" ry="4.6" fill="#d9b25c" />
            <path d="M22 21 C22 9 42 9 42 21 Z" fill="#ecc97a" />
            <rect x="22" y="17.5" width="20" height="2.2" fill="#b4472d" />
          </>
        )}
        {job === "service_worker" && (
          <>
            <path d="M20 22 C20 11 27 9 32 9 C37 9 44 11 44 22 Z" fill="#38bdf8" />
            <path d="M30 22 L50 22 C50 25 46 26 42 26 L30 26 Z" fill="#0ea5e9" />
          </>
        )}

        {/* face */}
        <g fill="#1f2937">
          <circle cx={27 + t.eyeShift} cy="30.5" r="1.9" />
          <circle cx={37 + t.eyeShift} cy="30.5" r="1.9" />
        </g>
        <g fill="#fff" opacity={0.85}>
          <circle cx={27.6 + t.eyeShift} cy="29.8" r="0.6" />
          <circle cx={37.6 + t.eyeShift} cy="29.8" r="0.6" />
        </g>
        <g fill="none" stroke={t.hair === "#d7b56d" || t.hair === "#a8a8a8" ? "#6b4226" : t.hair} strokeWidth={1.3} strokeLinecap="round">
          {BROWS[mood].map((d, i) => <path key={i} d={d} />)}
        </g>
        {mood === "happy" && (
          <g fill="#f472b6" opacity={0.3}>
            <circle cx="23.5" cy="35" r="2.6" />
            <circle cx="40.5" cy="35" r="2.6" />
          </g>
        )}
        <path d={MOUTH[mood]} fill="none" stroke="#7a3b2e" strokeWidth={1.7} strokeLinecap="round" />
        {glasses && (
          <g fill="none" stroke="#0f172a" strokeWidth={1.2}>
            <circle cx={27 + t.eyeShift} cy="30.5" r="4.6" />
            <circle cx={37 + t.eyeShift} cy="30.5" r="4.6" />
            <path d={`M${31.6 + t.eyeShift} 30.5 L${32.4 + t.eyeShift} 30.5`} />
          </g>
        )}
      </g>
    </svg>
  )
}
