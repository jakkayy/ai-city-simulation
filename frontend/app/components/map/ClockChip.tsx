import { useI18n } from "../../lib/i18n"

interface Props {
  setChip: (el: HTMLElement | null) => void
  setClock: (el: HTMLElement | null) => void
}

// The city clock. Its text and phase icon are updated straight on the DOM by useMapLife.
export default function ClockChip({ setChip, setClock }: Props) {
  const { t } = useI18n()
  return (
    <div
      ref={setChip}
      data-phase="day"
      title={t("map.clock")}
      className="clock-chip pointer-events-none absolute left-3 top-2.5 flex items-center gap-2 rounded-lg border border-white/15 bg-slate-950/70 px-2.5 py-1.5 backdrop-blur"
    >
      <span className="clock-icon h-2.5 w-2.5 rounded-full" />
      <span ref={setClock} className="num text-xs font-bold text-slate-100">12:00</span>
    </div>
  )
}
