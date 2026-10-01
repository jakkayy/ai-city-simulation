import { useI18n } from "../../lib/i18n"

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-slate-950/70 text-slate-200 backdrop-blur transition hover:border-cyan-300/60 hover:text-white disabled:opacity-35"
    >
      {children}
    </button>
  )
}

interface Props {
  fullscreen: boolean
  zoom: number
  onToggleFullscreen: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFocusCore: () => void
  onFit: () => void
}

// The button cluster in the corner of the map, and the zoom level readout.
export default function MapControls({ fullscreen, zoom, onToggleFullscreen, onZoomIn, onZoomOut, onFocusCore, onFit }: Props) {
  const { t } = useI18n()
  const zoomed = zoom > 1.02

  return (
    <>
      <div className="absolute right-3 top-2.5 flex flex-row gap-1.5">
        <IconButton label={fullscreen ? t("map.exitFullscreen") : t("map.fullscreen")} onClick={onToggleFullscreen}>
          {fullscreen ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M2 6V2h4M14 10v4h-4M10 2h4v4M6 14H2v-4" /></svg>
          )}
        </IconButton>
        <IconButton label={t("map.zoomIn")} onClick={onZoomIn} disabled={zoom >= 4.98}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
        </IconButton>
        <IconButton label={t("map.zoomOut")} onClick={onZoomOut} disabled={!zoomed}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M3 8h10" /></svg>
        </IconButton>
        <IconButton label={t("map.focusCore")} onClick={onFocusCore}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="8" cy="8" r="2.4" /><path d="M8 1v3M8 12v3M1 8h3M12 8h3" /></svg>
        </IconButton>
        <IconButton label={t("map.fit")} onClick={onFit} disabled={!zoomed}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /></svg>
        </IconButton>
      </div>

      {zoomed && (
        <div className="num pointer-events-none absolute bottom-3 left-3 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-slate-300">
          ×{zoom.toFixed(1)}
        </div>
      )}
    </>
  )
}
