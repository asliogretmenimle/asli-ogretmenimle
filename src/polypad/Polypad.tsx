import { useEffect, useRef, useState } from 'react'
import './polypad.css'
import { Canvas } from './Canvas'
import { Toolbar } from './Toolbar'
import { SettingsBar } from './SettingsBar'
import { Sidebar } from './Sidebar'
import { ActionBar } from './ActionBar'
import { getDef } from './tiles'
import { textLayout } from './tiles/basic'
import {
  commit,
  copySelection,
  duplicate,
  getState,
  paste,
  redo,
  removeTiles,
  select,
  setState,
  undo,
  updateTile,
  updateTiles,
  useStore,
  viewport,
  zoomAt,
  type Tool,
} from './store'
import { usePageTitle } from '../components/Layout'

const KEYS: Record<string, Tool> = { v: 'move', p: 'pen:pen', l: 'line:straight', g: 'geo:point', t: 'text:text', q: 'text:equation' }

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return
      const st = getState()
      if (st.ask || st.editing) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && k === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && k === 'c' && st.settings.copy) return copySelection()
      if (mod && k === 'x' && st.settings.copy) {
        copySelection()
        removeTiles(st.sel)
        commit()
        return
      }
      if (mod && k === 'v' && st.settings.copy) {
        e.preventDefault()
        return paste()
      }
      if (mod && k === 'd' && st.settings.copy) {
        e.preventDefault()
        return duplicate(st.sel)
      }
      if (mod && k === 'a') {
        e.preventDefault()
        return select(st.tiles.map((t) => t.id))
      }
      if (mod) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel.length && st.settings.del) {
        e.preventDefault()
        removeTiles(st.sel.filter((id) => !st.tiles.find((t) => t.id === id)?.locked))
        commit()
        return
      }
      if (e.key === 'Escape') return setState({ sel: [], tool: 'move' })
      if (e.key.startsWith('Arrow') && st.sel.length) {
        e.preventDefault()
        const d = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        updateTiles(st.sel, (t) => (t.locked ? null : { x: t.x + dx, y: t.y + dy }))
        commit()
        return
      }
      if (k === 'r' && st.sel.length && st.settings.rotate) {
        updateTiles(st.sel, (t) => (t.locked || getDef(t.type)?.rotatable === false ? null : { rot: (t.rot + (e.shiftKey ? -15 : 15) + 360) % 360 }))
        commit()
        return
      }
      if (e.key === '+' || e.key === '=') return zoomAt(1.25, viewport.w / 2, viewport.h / 2)
      if (e.key === '-' || e.key === '_') return zoomAt(0.8, viewport.w / 2, viewport.h / 2)
      if (KEYS[k]) setState({ tool: KEYS[k], sel: KEYS[k] === 'move' ? st.sel : [] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Metin kutusunun üstüne yerleşen düzenleme alanı */
function TextEditor() {
  const id = useStore((s) => s.editing)
  const tile = useStore((s) => (s.editing ? s.tiles.find((t) => t.id === s.editing) : undefined))
  const view = useStore((s) => s.view)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!id) return
    const el = ref.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [id])
  if (!id || !tile) return null
  const { w, h, size } = textLayout(tile)
  const finish = () => {
    const t = getState().tiles.find((x) => x.id === id)
    setState({ editing: null })
    if (t && !t.p.text && !t.p.fill) removeTiles([t.id])
    commit()
  }
  return (
    <textarea
      ref={ref}
      className="pp-text-editor"
      value={tile.p.text ?? ''}
      placeholder="Metin yazın…"
      style={{
        left: (tile.x - w / 2) * view.z + view.x,
        top: (tile.y - h / 2) * view.z + view.y,
        width: w * view.z,
        minHeight: h * view.z,
        fontSize: size * view.z,
        padding: 10 * view.z,
        lineHeight: 1.3,
        color: tile.color,
        textAlign: tile.p.align ?? 'left',
        background: tile.p.fill ?? 'rgba(255,255,255,.92)',
        transform: tile.rot ? `rotate(${tile.rot}deg)` : undefined,
      }}
      onChange={(e) => updateTile(id, (t) => ({ p: { ...t.p, text: e.target.value } }))}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
    />
  )
}

/** Boş tuvalde karşılama kartı */
function EmptyState() {
  const empty = useStore((s) => s.tiles.length === 0)
  const sidebar = useStore((s) => s.sidebarOpen && s.settings.showSidebar)
  if (!empty) return null
  return (
    <div className="pp-empty" aria-live="polite">
      <div className="pp-empty-art" aria-hidden>
        <svg viewBox="0 0 120 80" width="120" height="80">
          <path d="M14 66L34 31L54 66Z" fill="#fd8c00" />
          <rect x="58" y="34" width="30" height="30" rx="2" fill="#0f82f2" transform="rotate(-8 73 49)" />
          <path d="M92 66l9-16h18l-9 16z" fill="#bfc212" />
          <circle cx="96" cy="22" r="11" fill="#cd0e66" />
          <path d="M40 12l5 9h-10z" fill="#22ab24" />
        </svg>
      </div>
      <h2>Tuvale hoş geldin!</h2>
      <p>{sidebar ? 'Soldaki parçalardan birini buraya sürükle ya da üstüne dokun.' : 'Sol üstteki Parçalar düğmesine dokunup bir parça seç.'}</p>
      <div className="pp-empty-actions">
        {!sidebar && (
          <button type="button" className="pp-btn pp-btn-blue pp-btn-small" onClick={() => setState({ sidebarOpen: true, tab: 'tiles' })}>
            Parçaları aç
          </button>
        )}
        <button type="button" className="pp-btn pp-btn-small" onClick={() => setState({ sidebarOpen: true, tab: 'library' })}>
          Hazır örneklere göz at
        </button>
      </div>
    </div>
  )
}

/** Uygulama içi metin isteme penceresi (api.prompt) */
function AskDialog() {
  const ask = useStore((s) => s.ask)
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!ask) return
    setValue(ask.value)
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
  }, [ask])
  if (!ask) return null
  const done = (v: string | null) => {
    setState({ ask: null })
    ask.resolve(v)
  }
  return (
    <div className="pp-modal" onPointerDown={(e) => e.target === e.currentTarget && done(null)}>
      <form
        className="pp-dialog"
        onSubmit={(e) => {
          e.preventDefault()
          done(value)
        }}
      >
        <label htmlFor="pp-ask">{ask.label}</label>
        <input id="pp-ask" ref={ref} className="pp-input" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" onKeyDown={(e) => e.key === 'Escape' && done(null)} />
        <div className="pp-btn-group">
          <button type="button" className="pp-btn pp-btn-small" onClick={() => done(null)}>
            Vazgeç
          </button>
          <button type="submit" className="pp-btn pp-btn-small pp-btn-blue">
            Tamam
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Polypad() {
  usePageTitle('Matematik Tuvali')
  useShortcuts()
  const large = useStore((s) => s.settings.largeUi)
  const contrast = useStore((s) => s.settings.contrast)
  const sidebarOpen = useStore((s) => s.sidebarOpen && s.settings.showSidebar)
  const pinned = useStore((s) => s.settings.actionbar === 'always')

  // Sayfa kaymasını ve iOS lastik bant etkisini kapat
  useEffect(() => {
    document.documentElement.classList.add('pp-lock')
    return () => document.documentElement.classList.remove('pp-lock')
  }, [])

  return (
    <div className={`pp-root${large ? ' large' : ''}${contrast ? ' hc' : ''}${sidebarOpen ? ' sidebar-open' : ''}${pinned ? ' pinned-actions' : ''}`}>
      <Sidebar />
      <main className="pp-main">
        <Canvas />
        <EmptyState />
        <SettingsBar />
        <ActionBar />
        <Toolbar />
        <TextEditor />
      </main>
      <AskDialog />
    </div>
  )
}
