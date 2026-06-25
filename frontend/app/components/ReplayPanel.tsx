"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchSnapshots, startReplay, stopReplay } from "../lib/api"
import type { DailySnapshot } from "../lib/types"

interface Props {
  isRunning: boolean
  replayMode: boolean
  onReplayStart: () => void
  onReplayStop: () => void
}

export default function ReplayPanel({ isRunning, replayMode, onReplayStart, onReplayStop }: Props) {
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
      setError("Failed to load snapshots")
    }
  }, [selectedDay])

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
      setError(e instanceof Error ? e.message : "Failed to start replay")
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
          REPLAY
        </span>
        <button
          onClick={handleStop}
          disabled={loading}
          className="focus-ring rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
        >
          Stop Replay
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isRunning}
        className="focus-ring rounded-lg border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
        title={isRunning ? "Stop simulation before replaying" : "Replay from a past day"}
      >
        Replay
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-11 z-20 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">Replay from saved day</p>

          {snapshots.length === 0 ? (
            <p className="text-xs text-slate-500">No snapshots yet, run the simulation first.</p>
          ) : (
            <select
              className="focus-ring rounded-lg border border-slate-600 bg-slate-950/70 p-2 text-sm text-white"
              value={selectedDay ?? ""}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
            >
              {snapshots.map((s) => (
                <option key={s.simulation_day} value={s.simulation_day}>
                  Day {s.simulation_day} — happiness {s.avg_happiness.toFixed(1)} / fund ${s.city_fund.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </option>
              ))}
            </select>
          )}

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={loading || snapshots.length === 0}
              className="focus-ring flex-1 rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {loading ? "Starting…" : "Start Replay"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="focus-ring rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
