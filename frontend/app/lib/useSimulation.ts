"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { getSocket } from "./socket"
import { useI18n } from "./i18n"
import {
  fetchCitizens,
  fetchReports,
  fetchSnapshots,
  fetchStatus,
  resetCity,
  setSpeed,
  startSim,
  stepSim,
  stopSim,
} from "./api"
import { addNarrative, addReport } from "./report"
import type {
  AdvisorMessage,
  Citizen,
  CityManagerProposal,
  DayReport,
  EventItem,
  HistoryPoint,
  SimStatus,
  TickData,
} from "./types"

export interface Toast {
  id: number
  kind: "ok" | "error"
  text: string
}

const MAX_EVENTS = 40
const MAX_HISTORY = 60
const STATUS_POLL_MS = 5000

function subscribeConnection(notify: () => void) {
  const socket = getSocket()
  socket.on("connect", notify)
  socket.on("disconnect", notify)
  return () => {
    socket.off("connect", notify)
    socket.off("disconnect", notify)
  }
}

export function useSimulation() {
  const { t } = useI18n()
  const [tick, setTick] = useState<TickData | null>(null)
  const [tickSeq, setTickSeq] = useState(0)   // how many ticks arrived over the socket
  const [status, setStatus] = useState<SimStatus | null>(null)
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [reports, setReports] = useState<DayReport[]>([])
  const [popupDay, setPopupDay] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const connected = useSyncExternalStore(subscribeConnection, () => getSocket().connected, () => false)
  const [proposal, setProposal] = useState<CityManagerProposal | null>(null)
  const [advisorMsg, setAdvisorMsg] = useState<AdvisorMessage | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [busy, setBusy] = useState(false)
  const uid = useRef(0)
  const speedRef = useRef<number | undefined>(undefined)

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++uid.current
    setToasts((t) => [...t.slice(-3), { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const refreshStatus = useCallback(
    () => fetchStatus().then(setStatus).catch(() => {}),
    [],
  )

  // citizens + chart history over REST (page start, after a replay, after a reset)
  const reload = useCallback(() => {
    fetchCitizens().then(setCitizens).catch(() => {})
    fetchReports().then(setReports).catch(() => {})
    fetchSnapshots()
      .then((snaps) =>
        setHistory(
          snaps.slice(-MAX_HISTORY).map((s) => ({
            day: s.simulation_day,
            happiness: s.avg_happiness,
            fund: s.city_fund,
            service: s.service_quality,
          })),
        ),
      )
      .catch(() => {})
  }, [])

  // initial state over REST so the page is populated before the first tick
  useEffect(() => {
    refreshStatus()
    reload()
    const poll = setInterval(refreshStatus, STATUS_POLL_MS)
    return () => clearInterval(poll)
  }, [refreshStatus, reload])

  useEffect(() => {
    const socket = getSocket()
    const onTick = (data: TickData) => {
      setTick(data)
      setTickSeq((n) => n + 1)
      setCitizens(data.citizens)
      setStatus((s) => (s ? { ...s, simulation_day: data.day } : s))
      setHistory((h) => {
        const point = {
          day: data.day,
          happiness: data.avg_happiness,
          fund: data.city_fund,
          service: data.service_quality,
        }
        const rest = h.filter((p) => p.day !== data.day)
        return [...rest, point].slice(-MAX_HISTORY)
      })
      if (data.report) {
        const report = data.report
        setReports((prev) => addReport(prev, report))
        if (report.highlight) setPopupDay(report.day)
      }
      if (data.events.length > 0) {
        const fresh = data.events.map((e) => ({ ...e, day: data.day, uid: ++uid.current }))
        setEvents((prev) => [...fresh, ...prev].slice(0, MAX_EVENTS))
      }
    }
    const onProposal = (data: CityManagerProposal) => setProposal(data)
    const onAdvisor = (data: AdvisorMessage) => setAdvisorMsg(data)
    const onNarrative = (m: { day: number; narrative: DayReport["narrative"] }) =>
      setReports((prev) => addNarrative(prev, m.day, m.narrative))
    const onReset = () => {
      setTick(null)
      setEvents([])
      setReports([])
      setPopupDay(null)
      setHistory([])
      setProposal(null)
      setAdvisorMsg(null)
      reload()
      refreshStatus()
    }

    socket.on("tick", onTick)
    socket.on("city_manager_proposal", onProposal)
    socket.on("advisor_message", onAdvisor)
    socket.on("report_narrative", onNarrative)
    socket.on("city_reset", onReset)
    return () => {
      socket.off("tick", onTick)
      socket.off("city_manager_proposal", onProposal)
      socket.off("advisor_message", onAdvisor)
      socket.off("report_narrative", onNarrative)
      socket.off("city_reset", onReset)
    }
  }, [reload, refreshStatus])

  const act = useCallback(
    async (fn: () => Promise<unknown>, okText?: string) => {
      setBusy(true)
      try {
        await fn()
        if (okText) toast("ok", okText)
      } catch (e) {
        toast("error", e instanceof Error ? e.message : t("toast.failed"))
      } finally {
        await refreshStatus()
        setBusy(false)
      }
    },
    [refreshStatus, toast, t],
  )

  const closeReportPopup = useCallback(() => setPopupDay(null), [])   // stable: the popup timer depends on it
  const start = useCallback(() => act(() => startSim(speedRef.current), t("toast.started")), [act, t])
  const stop = useCallback(() => act(stopSim, t("toast.paused")), [act, t])
  const step = useCallback(() => act(stepSim), [act])
  const reset = useCallback(() => act(resetCity, t("toast.reset")), [act, t])
  const changeSpeed = useCallback(
    (seconds: number) => {
      speedRef.current = seconds
      setStatus((s) => (s ? { ...s, tick_interval_seconds: seconds } : s))
      return act(() => setSpeed(seconds))
    },
    [act],
  )

  return {
    tick,
    tickSeq,
    status,
    citizens,
    events,
    reports,
    popupReport: reports.find((r) => r.day === popupDay) ?? null,
    closeReportPopup,
    history,
    connected,
    proposal,
    advisorMsg,
    toasts,
    busy,
    toast,
    refreshStatus,
    reload,
    start,
    stop,
    step,
    reset,
    changeSpeed,
    dismissProposal: () => setProposal(null),
    dismissAdvisor: () => setAdvisorMsg(null),
  }
}
