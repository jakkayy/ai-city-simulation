"use client"

import { useI18n } from "../../lib/i18n"

interface Props {
  connected: boolean
  isRunning: boolean
  replayMode: boolean
}

// Offline / replay / live / paused, in the colour of that state.
export default function StatusPill({ connected, isRunning, replayMode }: Props) {
  const { t } = useI18n()
  const cfg = !connected
    ? { label: t("status.offline"), color: "#fb7185" }
    : replayMode
      ? { label: t("status.replay"), color: "#a78bfa" }
      : isRunning
        ? { label: t("status.live"), color: "#34d399" }
        : { label: t("status.paused"), color: "#fbbf24" }

  return (
    <span
      className="th-plain inline-flex h-6 items-center gap-2 rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-[0.14em]"
      style={{ color: cfg.color, borderColor: `${cfg.color}55`, background: `${cfg.color}14` }}
    >
      <span className={isRunning || replayMode ? "live-dot" : "h-2 w-2 rounded-full bg-current"} />
      {cfg.label}
    </span>
  )
}
