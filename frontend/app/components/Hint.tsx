"use client"

// small "?" bubble that explains a label on hover / keyboard focus
export default function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="focus-ring flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/50 text-[10px] font-bold leading-none text-slate-400 transition hover:border-cyan-300/70 hover:text-cyan-200"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-[120] mt-2 w-60 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
