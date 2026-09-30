"use client"

import { useI18n } from "../lib/i18n"

export default function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="flex h-[2.4rem] items-center rounded-xl border border-slate-400/20 bg-slate-800/50 p-0.5" role="group" aria-label="Language">
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`focus-ring h-full rounded-[0.6rem] px-2.5 text-xs font-bold uppercase transition ${
            lang === l ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
