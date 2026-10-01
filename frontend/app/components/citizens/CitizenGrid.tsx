"use client"

import { useMemo, useState } from "react"
import { useI18n } from "../../lib/i18n"
import CitizenCard from "./CitizenCard"
import Select from "../ui/Select"
import type { Citizen } from "../../lib/types"
import { ZONE_KEYS, ZONE_META } from "../../lib/mood"

type SortKey = "happiness_asc" | "happiness_desc" | "savings_desc" | "name"

const SORTS: Record<SortKey, (a: Citizen, b: Citizen) => number> = {
  happiness_asc: (a, b) => a.happiness - b.happiness,
  happiness_desc: (a, b) => b.happiness - a.happiness,
  savings_desc: (a, b) => b.savings - a.savings,
  name: (a, b) => a.name.localeCompare(b.name),
}

interface Props {
  citizens: Citizen[]
  highlightId: string | null
  onHover: (id: string | null) => void
}

export default function CitizenGrid({ citizens, highlightId, onHover }: Props) {
  const { t } = useI18n()
  const [zone, setZone] = useState<"all" | "A" | "B" | "C">("all")
  const [sort, setSort] = useState<SortKey>("happiness_asc")
  const [query, setQuery] = useState("")

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return citizens
      .filter((c) => (zone === "all" || c.zone === zone) && (!q || c.name.toLowerCase().includes(q) || c.job_type.includes(q)))
      .sort(SORTS[sort])
  }, [citizens, zone, sort, query])

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">{t("cit.title")}</h2>
          <p className="text-xs text-slate-400">
            {t("cit.showing", { a: visible.length, b: citizens.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            <button className="chip focus-ring" data-active={zone === "all"} onClick={() => setZone("all")}>{t("cit.all")}</button>
            {ZONE_KEYS.map((z) => (
              <button
                key={z}
                className="chip focus-ring"
                data-active={zone === z}
                onClick={() => setZone(z)}
                style={zone === z ? undefined : { color: ZONE_META[z].color }}
              >
                {t("zone.name", { z })}
              </button>
            ))}
          </div>
          <input
            className="field field-pill focus-ring w-44"
            placeholder={t("cit.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("cit.search")}
          />
          <Select
            variant="pill"
            className="min-w-[10.5rem]"
            ariaLabel={t("cit.sort")}
            value={sort}
            onChange={setSort}
            options={(Object.keys(SORTS) as SortKey[]).map((k) => ({ value: k, label: t(`sort.${k}`) }))}
          />
        </div>
      </div>

      {citizens.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer h-36 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="panel rounded-2xl p-8 text-center text-sm text-slate-400">{t("cit.none")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((c) => (
            <CitizenCard key={c.id} citizen={c} highlighted={c.id === highlightId} onHover={onHover} />
          ))}
        </div>
      )}
    </section>
  )
}
