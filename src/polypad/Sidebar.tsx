import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Box, Category, Source, SourceGroup, Tile } from './types'
import { CATALOG } from './catalog'
import { getDef } from './tiles'
import { Icon } from './icons'
import { boundsOf, boxCorners, pad, toWorld } from './geom'
import { addTiles, commit, getState, makeTile, setState, sound, useStore, viewCenter, type SidebarTab } from './store'
import { SettingsPanel } from './SettingsPanel'
import { ExamplesPanel } from './ExamplesPanel'
import { HelpPanel } from './HelpPanel'

// ---------------------------------------------------------------------------
// Kaynak küçük resimleri
// ---------------------------------------------------------------------------

/** Döndürülmüş parçanın kendi merkezine göre sınırları */
function tileBox(t: Tile): Box {
  const def = getDef(t.type)
  if (!def) return { x: -10, y: -10, w: 20, h: 20 }
  return boundsOf(boxCorners(def.bounds(t)).map((p) => toWorld({ ...t, x: 0, y: 0 }, p)))
}

function TileSvg({ t, scale, className }: { t: Tile; scale: number; className?: string }) {
  const def = getDef(t.type)
  if (!def) return null
  const b = pad(tileBox(t), 2)
  return (
    <svg className={className} width={Math.max(8, b.w * scale)} height={Math.max(8, b.h * scale)} viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} aria-hidden>
      <g transform={`rotate(${t.rot})${t.flip ? ' scale(-1 1)' : ''}`}>{def.thumb ? def.thumb(t) : def.render(t, { selected: false, thumb: true })}</g>
    </svg>
  )
}

// Sürükleme hayaleti: tek bir DOM öğesi, konumu doğrudan güncellenir
const ghost: { el: HTMLDivElement | null; set: ((t: Tile | null) => void) | null } = { el: null, set: null }

function Ghost() {
  const [t, setT] = useState<Tile | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const z = useStore((s) => s.view.z)
  useEffect(() => {
    ghost.el = ref.current
    ghost.set = setT
    return () => {
      ghost.el = null
      ghost.set = null
    }
  }, [])
  return <div ref={ref} className="pp-ghost">{t && <TileSvg t={t} scale={z} />}</div>
}

function canvasAt(x: number, y: number) {
  const el = document.elementFromPoint(x, y)?.closest('.pp-canvas')
  if (!el) return null
  const r = el.getBoundingClientRect()
  const v = getState().view
  return { x: (x - r.left - v.x) / v.z, y: (y - r.top - v.y) / v.z }
}

function place(src: Source, x: number, y: number) {
  const t = makeTile(src.t, src.p ?? {}, x, y)
  addTiles([t])
  setState({ tool: 'move' })
  commit()
  sound('pop')
}

const SourceItem = memo(function SourceItem({ src, scale }: { src: Source; scale: number }) {
  const tile = useMemo(() => makeTile(src.t, src.p ?? {}), [src])
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const id = e.pointerId
    const sx = e.clientX
    const sy = e.clientY
    const touch = e.pointerType !== 'mouse'
    let dragging = false
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!dragging) {
        if (Math.hypot(dx, dy) < 7) return
        // Dokunmatikte dikey hareket kaydırmadır
        if (touch && Math.abs(dy) > Math.abs(dx) * 1.2) return cleanup()
        dragging = true
        ghost.set?.(makeTile(src.t, src.p ?? {}))
        document.body.classList.add('pp-dragging')
      }
      if (ghost.el) ghost.el.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`
      // Telefonda kenar çubuğu tuvalin üstünü kapatır: dışına çıkınca kapansın
      if (window.innerWidth < 700 && !(document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.pp-sidebar'))) setState({ sidebarOpen: false })
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      cleanup()
      if (dragging) {
        const w = canvasAt(ev.clientX, ev.clientY)
        if (w) place(src, w.x, w.y)
      } else {
        // Dokununca görünen alanın ortasına ekle (üst üste binmesin diye biraz kaydır)
        const c = viewCenter()
        const n = getState().tiles.length % 6
        place(src, c.x + n * 16 - 40, c.y + n * 16 - 40)
        if (window.innerWidth < 700) setState({ sidebarOpen: false })
      }
    }
    const cancel = (ev: PointerEvent) => ev.pointerId === id && cleanup()
    function cleanup() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      if (dragging) {
        ghost.set?.(null)
        document.body.classList.remove('pp-dragging')
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const c = viewCenter()
    place(src, c.x, c.y)
  }
  return (
    <div className="pp-source" tabIndex={0} role="button" aria-label={src.label} title={src.label} onPointerDown={onPointerDown} onKeyDown={onKey} data-caption={src.cap}>
      <TileSvg t={tile} scale={scale} />
      {src.cap && <span className="pp-source-cap">{src.cap}</span>}
    </div>
  )
})

function Group({ g }: { g: SourceGroup }) {
  const scale = useMemo(() => {
    const max = g.max ?? 72
    let big = 1
    for (const s of g.sources) {
      const b = tileBox(makeTile(s.t, s.p ?? {}))
      big = Math.max(big, b.w, b.h)
    }
    return Math.min(1, max / big)
  }, [g])
  return (
    <>
      {g.subtitle && <div className="pp-subtitle">{g.subtitle}</div>}
      <div className="pp-source-wrap">
        {g.sources.map((s, i) => (
          <SourceItem key={i} src={s} scale={scale} />
        ))}
      </div>
      {g.caption && <p className="pp-caption">{g.caption}</p>}
    </>
  )
}

// ---------------------------------------------------------------------------
// Akordeon (açık bölümler hatırlanır)
// ---------------------------------------------------------------------------

const ACC_KEY = 'ao-tuval-acc'
function loadAcc(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(ACC_KEY) ?? 'null')
    if (Array.isArray(v)) return v
  } catch {
    /* yok */
  }
  return ['geometry', 'geometry/polygons']
}

function TilesPanel() {
  const [open, setOpen] = useState<string[]>(loadAcc)
  const authoring = useStore((s) => s.authoring)
  const hidden = useStore((s) => s.hidden)
  const toggle = (k: string) =>
    setOpen((o) => {
      const n = o.includes(k) ? o.filter((x) => x !== k) : [...o, k]
      try {
        localStorage.setItem(ACC_KEY, JSON.stringify(n))
      } catch {
        /* depolama yok */
      }
      return n
    })
  const setHidden = (k: string, hide: boolean) => setState((s) => ({ hidden: hide ? [...s.hidden, k] : s.hidden.filter((x) => x !== k) }))
  const visible = (k: string) => authoring || !hidden.includes(k)

  return (
    <div className="pp-tiles">
      {CATALOG.filter((c) => visible(c.key)).map((c: Category) => {
        const isOpen = open.includes(c.key)
        return (
          <div key={c.key} className="pp-acc" style={{ ['--m' as string]: c.color }}>
            <div className="pp-acc-row">
              <h2 className={isOpen ? 'active' : ''} role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggle(c.key)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(c.key))}>
                <Icon name={c.icon} size={24} />
                <span>{c.title}</span>
                <Icon name="chevron" size={18} className="pp-chev" />
              </h2>
              {authoring && <input type="checkbox" className="pp-check" checked={!hidden.includes(c.key)} onChange={(e) => setHidden(c.key, !e.target.checked)} aria-label={`${c.title} görünsün`} />}
            </div>
            {isOpen && (
              <div className="pp-subsection">
                {c.sections
                  .filter((s) => visible(`${c.key}/${s.key}`))
                  .map((s) => {
                    const k = `${c.key}/${s.key}`
                    const so = open.includes(k)
                    return (
                      <div key={s.key}>
                        <div className="pp-acc-row">
                          <h3 className={so ? 'active' : ''} role="button" tabIndex={0} aria-expanded={so} onClick={() => toggle(k)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(k))}>
                            {s.title}
                            <Icon name="chevron" size={16} className="pp-chev" />
                          </h3>
                          {authoring && <input type="checkbox" className="pp-check" checked={!hidden.includes(k)} onChange={(e) => setHidden(k, !e.target.checked)} aria-label={`${s.title} görünsün`} />}
                        </div>
                        {so && (
                          <section>
                            {s.groups.map((g, i) => (
                              <Group key={i} g={g} />
                            ))}
                          </section>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )
      })}
      <footer className="pp-sidebar-footer">
        <Link to="/manipulatifler">← Manipülatifler</Link> · <Link to="/">Aslı Öğretmenimle</Link>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------------------

const TABS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: 'tiles', icon: 'shapes', label: 'Parçalar' },
  { id: 'settings', icon: 'settings', label: 'Ayarlar' },
  { id: 'library', icon: 'lightbulb', label: 'Örnekler' },
  { id: 'help', icon: 'help', label: 'Yardım' },
]

export function Sidebar() {
  const open = useStore((s) => s.sidebarOpen)
  const tab = useStore((s) => s.tab)
  const show = useStore((s) => s.settings.showSidebar)
  if (!show) return <Ghost />
  let body: ReactNode
  if (tab === 'tiles') body = <TilesPanel />
  else if (tab === 'settings') body = <SettingsPanel />
  else if (tab === 'library') body = <ExamplesPanel />
  else body = <HelpPanel />
  return (
    <>
      <aside className={`pp-sidebar${open ? ' open' : ''}`} aria-label="Kenar çubuğu" aria-hidden={!open}>
        <div className="pp-tabs-header" role="tablist" aria-label="Kenar çubuğu sekmeleri">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setState({ tab: t.id })}>
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </button>
          ))}
          <button type="button" className="pp-collapse" aria-label="Kenar çubuğunu kapat" onClick={() => setState({ sidebarOpen: false })}>
            <Icon name="chevron-left" size={20} />
          </button>
        </div>
        <div className="pp-tabs-body">{body}</div>
      </aside>
      {open && <div className="pp-scrim" onClick={() => setState({ sidebarOpen: false })} />}
      {!open && (
        <button type="button" className="pp-sidebar-open" aria-label="Parçaları aç" onClick={() => setState({ sidebarOpen: true })}>
          <Icon name="shapes" size={22} />
          <span>Parçalar</span>
        </button>
      )}
      <Ghost />
    </>
  )
}
