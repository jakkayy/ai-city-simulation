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
    if (open) loadSnapshots()
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
        <span className="text-xs bg-purple-800 text-purple-200 px-2 py-1 rounded font-semibold">
          REPLAY
        </span>
        <button
          onClick={handleStop}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-purple-700 hover:bg-purple-600 rounded transition disabled:opacity-50"
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
        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-40"
        title={isRunning ? "Stop simulation before replaying" : "Replay from a past day"}
      >
        Replay
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 flex flex-col gap-2">
          <p className="text-xs text-gray-400 font-semibold">Replay from saved day</p>

          {snapshots.length === 0 ? (
            <p className="text-xs text-gray-500">No snapshots yet — run the simulation first.</p>
          ) : (
            <select
              className="bg-gray-700 text-white text-sm rounded p-1.5 border border-gray-600"
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

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={loading || snapshots.length === 0}
              className="flex-1 px-3 py-1.5 text-sm bg-purple-700 hover:bg-purple-600 rounded transition disabled:opacity-50"
            >
              {loading ? "Starting…" : "Start Replay"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
