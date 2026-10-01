"use client"

import { useEffect, useState } from "react"
import { useI18n } from "../../lib/i18n"

// Two-step button: the first click arms it for a few seconds, the second one resets the city.
export default function ResetButton({ disabled, onReset }: { disabled: boolean; onReset: () => void }) {
  const { t } = useI18n()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(id)
  }, [armed])
  return (
    <button
      className={`btn focus-ring ${armed ? "btn-danger" : ""}`}
      disabled={disabled}
      title={t("reset.hint")}
      onClick={() => {
        if (armed) { setArmed(false); onReset() } else setArmed(true)
      }}
    >
      {armed ? t("reset.confirm") : t("reset.btn")}
    </button>
  )
}
