"use client"

import { useState } from "react"
import { useI18n } from "../../lib/i18n"
import type { DayReport, EventItem } from "../../lib/types"
import EventList from "./EventList"
import ReportList from "./ReportList"

type Tab = "events" | "reports"

// The right-hand panel: the live event feed, and the report of every finished day.
export default function FeedPanel({ events, reports }: { events: EventItem[]; reports: DayReport[] }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>("events")

  const subtitle =
    tab === "events"
      ? events.length ? t("feed.count", { n: events.length }) : t("feed.waiting")
      : reports.length ? t("dayrep.count", { n: reports.length }) : t("dayrep.empty")

  return (
    <aside className="panel flex max-h-[calc(100vh-22rem)] min-h-[20rem] flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex gap-1.5" role="tablist">
            {(["events", "reports"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                data-active={tab === k}
                onClick={() => setTab(k)}
                className="chip focus-ring"
              >
                {t(`feed.tab.${k}`)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
        </div>
        {tab === "events" && <span className="live-dot mb-1 shrink-0 text-cyan-300" />}
      </div>

      {tab === "events" ? <EventList events={events} /> : <ReportList reports={reports} />}
    </aside>
  )
}
