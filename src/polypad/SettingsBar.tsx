import { useCallback, useEffect, useState } from 'react'
import { Icon } from './icons'
import { Popup } from './Popup'
import { exportImage } from './exporter'
import { redo, resetView, setState, undo, useStore, viewport, zoomAt, type GridId } from './store'

const GRIDS: { id: GridId; title: string; svg?: string; fill?: boolean }[] = [
  { id: 'none', title: 'Izgara yok' },
  { id: 'square2-grid', title: 'Büyük kareli ızgara', svg: '<g fill="none" stroke="currentColor"><path d="m0 24h48M24 48v-48M42 48v-48M6 48v-48M0 42h48M0 6h48"/></g>' },
  { id: 'square-checked', title: 'Damalı kare ızgara', fill: true, svg: '<path d="m4 4h10v10h-10zm20 0h10v10h-10zm20 0h4v10h-4zm-40 20h10v10h-10zm20 0h10v10h-10zm20 0h4v10h-4zm-40 20h10v4h-10zm20 0h10v4h-10zm20 0h4v4h-4zm-44-44h4v4h-4zm14 0h10v4h-10zm20 0h10v4h-10zm-34 14h4v10h-4zm14 0h10v10h-10zm20 0h10v10h-10zm-34 20h4v10h-4zm14 0h10v10h-10zm20 0h10v10h-10z"/>' },
  { id: 'square-dots', title: 'Kare noktalar', svg: [4, 14, 24, 34, 44].flatMap((y) => [4, 14, 24, 34, 44].map((x) => `<circle cx="${x}" cy="${y}" r="1.5"/>`)).join('') },
  { id: 'tri-dots', title: 'İzometrik noktalar', svg: [4, 24, 44].flatMap((y) => [3.5, 15, 26.5, 38].map((x) => `<circle cx="${x}" cy="${y}" r="1.5"/>`)).concat([14, 34].flatMap((y) => [9.5, 21, 32.5, 44].map((x) => `<circle cx="${x}" cy="${y}" r="1.5"/>`))).join('') },
  { id: 'tri2-dots', title: 'Döndürülmüş izometrik noktalar', svg: [4, 24, 44].flatMap((x) => [3.5, 15, 26.5, 38].map((y) => `<circle cx="${x}" cy="${y}" r="1.5"/>`)).concat([14, 34].flatMap((x) => [9.5, 21, 32.5, 44].map((y) => `<circle cx="${x}" cy="${y}" r="1.5"/>`))).join('') },
  { id: 'square-grid', title: 'Kareli ızgara', svg: '<g fill="none" stroke="currentColor"><path d="m0 24h48M24 48v-48" stroke-width="2"/><path d="m34 48v-48M44 48v-48M4 48v-48M14 48v-48M0 34h48M0 44h48M0 4h48M0 14h48"/></g>' },
  { id: 'tri-grid', title: 'İzometrik ızgara', svg: '<g fill="none" stroke="currentColor"><path d="m0 24h48M0 34h48M0 44h48M0 4h48M0 14h48M-.5 48 27.5 0M-.5 27.8 15.7 0M-.5 8.4 4.4 0M3.9 48-.5 40.5M11.3 48 39.3 0M27.5 48-.5 0M22.8 48 48.5 4M39 48 11 0M34.5 48 48.5 24M49.2 45.5 22.7 0M48.5 24 34.5 0M48.5 4 46.3 0M46.3 48 48.5 44M15.7 48-.5 20.2"/></g>' },
  { id: 'tri2-grid', title: 'Döndürülmüş izometrik ızgara', svg: '<g fill="none" stroke="currentColor"><path d="m24 48.3v-48M34 48.3v-48M44 48.3v-48M4 48.3v-48M14 48.3v-48M48 48.8 0 20.8M27.8 48.8 0 32.6M8.4 48.8 0 43.9M48 44.5 40.5 48.8M48 37.1 0 9.1M48 20.8 0 48.8M48 25.5 4-.2M48 9.3 0 37.3M48 13.9 24-.2M45.5-.8 0 25.7M24-.2 0 13.9M4-.2 0 2M48 2 44-.2M48 32.6 20.2 48.8"/></g>' },
]

function useFullscreen() {
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const on = () => setFs(!!(document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement))
    document.addEventListener('fullscreenchange', on)
    document.addEventListener('webkitfullscreenchange', on)
    return () => {
      document.removeEventListener('fullscreenchange', on)
      document.removeEventListener('webkitfullscreenchange', on)
    }
  }, [])
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
  const supported = typeof document !== 'undefined' && !!(el.requestFullscreen || el.webkitRequestFullscreen)
  const toggle = () => {
    const d = document as Document & { webkitExitFullscreen?: () => void }
    if (fs) (d.exitFullscreen?.bind(d) ?? d.webkitExitFullscreen?.bind(d))?.()
    else {
      const root = document.querySelector('.pp-root') as (HTMLElement & { webkitRequestFullscreen?: () => void }) | null
      const target = root ?? el
      if (target.requestFullscreen) void target.requestFullscreen().catch(() => {})
      else target.webkitRequestFullscreen?.()
    }
  }
  return { fs, supported, toggle }
}

function Btn({ icon, tip, onClick, disabled, active }: { icon: string; tip: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button type="button" className={`pp-settings-btn${active ? ' active' : ''}`} onClick={onClick} disabled={disabled} aria-label={tip} aria-pressed={active}>
      <Icon name={icon} />
      <span className="pp-tooltip">{tip}</span>
    </button>
  )
}

export function SettingsBar() {
  const s = useStore((st) => st.settings)
  const canUndo = useStore((st) => st.past.length > 0 || st.tiles !== st.committed)
  const canRedo = useStore((st) => st.future.length > 0)
  const grid = useStore((st) => st.grid)
  const tool = useStore((st) => st.tool)
  const hasTiles = useStore((st) => st.tiles.length > 0)
  const [pop, setPop] = useState<'grid' | 'download' | null>(null)
  const [busy, setBusy] = useState(false)
  const close = useCallback(() => setPop(null), [])
  const fs = useFullscreen()

  const zoom = (f: number) => zoomAt(f, viewport.w / 2, viewport.h / 2)
  const doExport = async (k: 'png' | 'jpg' | 'svg') => {
    setBusy(true)
    try {
      await exportImage(k)
    } finally {
      setBusy(false)
      setPop(null)
    }
  }

  return (
    <div className="pp-settings" role="region" aria-label="Ayarlar">
      <div className="pp-settings-group">
        {s.fullscreen && fs.supported && <Btn icon={fs.fs ? 'fullscreen-exit' : 'fullscreen'} tip="Tam ekran" onClick={fs.toggle} />}
        {s.undo && (
          <>
            <Btn icon="undo" tip="Geri al" onClick={undo} disabled={!canUndo} />
            <Btn icon="redo" tip="Yinele" onClick={redo} disabled={!canRedo} />
          </>
        )}
        {s.grid && (
          <div className="pp-popup-anchor">
            <Btn icon="grid" tip="Izgara ve görünüm" onClick={() => setPop(pop === 'grid' ? null : 'grid')} active={pop === 'grid'} />
            <Popup open={pop === 'grid'} onClose={close} label="Izgara ve görünüm" place="bottom" className="pp-grid-popup">
              <div className="pp-grid-select">
                {GRIDS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`pp-grid-btn${grid === g.id ? ' active' : ''}${g.fill ? ' fill' : ''}`}
                    title={g.title}
                    aria-label={g.title}
                    onClick={() => setState({ grid: g.id })}
                  >
                    {g.svg && <svg viewBox="0 0 48 48" dangerouslySetInnerHTML={{ __html: g.svg }} />}
                  </button>
                ))}
              </div>
              <button type="button" className="pp-btn pp-btn-small pp-btn-blue" onClick={() => { resetView(); setPop(null) }}>
                Görünümü sıfırla
              </button>
            </Popup>
          </div>
        )}
        {s.download && (
          <div className="pp-popup-anchor">
            <Btn icon="screenshot" tip="Dışa aktar" onClick={() => setPop(pop === 'download' ? null : 'download')} active={pop === 'download'} />
            <Popup open={pop === 'download'} onClose={close} label="Dışa aktar" place="bottom" className="pp-export-popup">
              <h2>Görüntü olarak kaydet</h2>
              {!hasTiles && <p className="pp-caption">Önce tuvale bir şeyler ekleyin.</p>}
              <div className="pp-btn-group">
                {(['png', 'jpg', 'svg'] as const).map((k) => (
                  <button key={k} type="button" className="pp-btn pp-btn-blue pp-btn-small" disabled={!hasTiles || busy} onClick={() => doExport(k)}>
                    {k === 'jpg' ? 'JPEG' : k.toUpperCase()}
                  </button>
                ))}
              </div>
            </Popup>
          </div>
        )}
      </div>
      <div className="pp-settings-group">
        <Btn icon="zoom-in" tip="Yakınlaştır" onClick={() => zoom(1.25)} />
        <Btn icon="zoom-out" tip="Uzaklaştır" onClick={() => zoom(0.8)} />
        <Btn icon="move" tip="Kaydır" onClick={() => setState({ tool: tool === 'pan' ? 'move' : 'pan' })} active={tool === 'pan'} />
      </div>
    </div>
  )
}
