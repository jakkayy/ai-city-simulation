"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchGatewayStatus } from "../lib/api"
import type { GatewayStatus } from "../lib/types"

export default function GatewayStatusPanel() {
  const [status, setStatus] = useState<GatewayStatus | null>(null)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    fetchGatewayStatus().then(setStatus).catch(console.error)
  }, [])

  useEffect(() => {
    if (!open) return
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [open, refresh])

  const hasKeys = status && status.keys.length > 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition flex items-center gap-1.5"
        title="LLM Gateway Status"
      >
        <span className={`w-2 h-2 rounded-full ${hasKeys ? "bg-green-400" : "bg-gray-500"}`} />
        LLM
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-gray-400">LLM Gateway Status</p>
            <button onClick={refresh} className="text-xs text-gray-500 hover:text-gray-300">↻ refresh</button>
          </div>

          {status ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xs text-gray-400">Queue</div>
                  <div className="text-sm font-bold text-white">{status.queue_depth}</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xs text-gray-400">Total Calls</div>
                  <div className="text-sm font-bold text-white">{status.total_calls}</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xs text-gray-400">Fallbacks</div>
                  <div className="text-sm font-bold text-yellow-400">{status.total_fallbacks}</div>
                </div>
              </div>

              {status.keys.length === 0 ? (
                <p className="text-xs text-gray-500 text-center">No API keys configured</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {status.keys.map((k) => (
                    <div key={k.alias} className="bg-gray-700 rounded p-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-white">{k.alias}</span>
                        <span className={`text-xs font-bold ${k.available ? "text-green-400" : "text-red-400"}`}>
                          {k.available ? "● ready" : "○ busy"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5 mb-1">
                        <div
                          className="bg-indigo-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${(k.requests_today / 3000) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{k.requests_today} req today</span>
                        <span>{k.budget_remaining} left</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 text-center">Loading…</p>
          )}
        </div>
      )}
    </div>
  )
}
