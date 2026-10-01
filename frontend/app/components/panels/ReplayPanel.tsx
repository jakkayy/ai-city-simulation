"use client"

import { useEffect, useState, useCallback } from "react"
import { useI18n } from "../../lib/i18n"
import Select from "../ui/Select"
import { fetchSnapshots, startReplay, stopReplay } from "../../lib/api"
import type { DailySnapshot } from "../../lib/types"

interface Props {
  isRunning: boolean
  replayMode: boolean
  onReplayStart: () => void
  onReplayStop: () => void
}

export default function ReplayPanel({ isRunning, replayMode, onReplayStart, onReplayStop }: Props) {
  const { t } = useI18n()
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSnapshots = useCallback(async () => {
    try {
      const snaps = await fetchSnapshots()
      setSnapshots(snaps)
      if (snaps.length > 0 && selectedDay === null) {
        setSelectedDay(snaps[0].simulation_day)
      }
    } catch {
      setError(t("rep.loadFailed"))
    }
  }, [selectedDay, t])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      void loadSnapshots()
    })
  }, [open, loadSnapshots])

  const handleStart = async () => {
    if (selectedDay === null) return
    setLoading(true)
    setError(null)
    try {
      await startReplay(selectedDay)
      onReplayStart()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("rep.failed"))
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await stopReplay()
      onReplayStop()
    } finally {
      setLoading(false)
    }
  }

  if (replayMode) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-2 py-1 text-xs font-semibold text-violet-100">
          {t("rep.badge")}
        </span>
        <button
          onClick={handleStop}
          disabled={loading}
          className="btn btn-violet focus-ring"
        >
          {t("rep.stop")}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isRunning}
        className="btn focus-ring"
        title={isRunning ? t("btn.replay.blocked") : t("btn.replay.hint")}
      >
        {t("btn.replay")}
      </button>

      {open && (
        <div className="panel popover absolute right-0 top-12 z-20 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">{t("rep.title")}</p>

          {snapshots.length === 0 ? (
            <p className="text-xs text-slate-500">{t("rep.empty")}</p>
          ) : (
            <Select
              ariaLabel={t("rep.title")}
              value={selectedDay}
              onChange={setSelectedDay}
              options={snapshots.map((s) => ({
                value: s.simulation_day,
                label: t("rep.day", {
                  d: s.simulation_day,
                  h: s.avg_happiness.toFixed(1),
                  f: s.city_fund.toLocaleString("en-US", { maximumFractionDigits: 0 }),
                }),
              }))}
            />
          )}

          <p className="text-xs text-slate-500">{t("rep.note")}</p>
          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={loading || snapshots.length === 0}
              className="btn btn-violet focus-ring flex-1"
            >
              {loading ? t("rep.starting") : t("rep.start")}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="btn focus-ring"
            >
              {t("btn.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
