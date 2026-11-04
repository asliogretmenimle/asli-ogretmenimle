import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ActionSpec, Tile } from './types'
import { Icon } from './icons'
import { Popup } from './Popup'
import { ALL_ACTIONS, actionOrder, applyAction } from './actions'
import { api, commit, getState, selectionBox, setState, useStore, viewport } from './store'

type Slot = 'bar' | 'more' | 'music' | 'author'

/** Seçime uyan eylemleri Polypad kurallarıyla yerleştirir: çubukta en çok 4 öğe, gerisi ⋯ menüsüne */
function layoutActions(selected: Tile[], authoring: boolean) {
  const types = new Set(selected.map((t) => t.type))
  const visible = ALL_ACTIONS.map((a, i) => ({ a, o: actionOrder(a, i) }))
    .filter(({ a }) => (a.tileTypes === 'all' || [...types].every((tp) => (a.tileTypes as string[]).includes(tp))) && (authoring || !a.author))
    .filter(({ a }) => {
      try {
        return !a.show || a.show(selected)
      } catch {
        return false
      }
    })
    .sort((x, y) => x.o - y.o)
  const slots: Record<Slot, ActionSpec[]> = { bar: [], more: [], music: [], author: [] }
  let inBar = 0
  for (const { a } of visible) {
    let slot: Slot = a.author ? 'author' : (a.location ?? 'bar')
    if (slot === 'bar' && inBar >= 4 && a.location !== 'bar') slot = 'more'
    if (slot === 'bar') inBar++
    slots[slot].push(a)
  }
  return slots
}

/** Seçimdeki parçaların ortak değeri; farklıysa undefined */
function common(a: ActionSpec, tiles: Tile[]) {
  const vals = tiles.map((t) => a.get?.(t))
  return vals.every((v) => v === vals[0]) ? vals[0] : undefined
}

function ActionButton({ a, tiles, inMenu }: { a: ActionSpec; tiles: Tile[]; inMenu?: boolean }) {
  const showText = a.text || !a.icon || inMenu
  return (
    <button
      type="button"
      className={`pp-act${showText ? ' text' : ''}`}
      data-action={a.id}
      onClick={() => {
        // Güncel parçalarla çalış (seçim sonrası değişmiş olabilir)
        const ids = new Set(tiles.map((t) => t.id))
        const cur = getState().tiles.filter((t) => ids.has(t.id))
        a.click?.(cur, api)
        commit()
      }}
    >
      {a.icon && (!a.text || inMenu) && <Icon name={a.icon} size={inMenu ? 20 : 24} />}
      {showText ? <span>{a.label}</span> : <span className="pp-tooltip">{a.label}</span>}
    </button>
  )
}

function ActionCheckbox({ a, tiles }: { a: ActionSpec; tiles: Tile[] }) {
  const v = common(a, tiles)
  return (
    <label className="pp-act field">
      {a.icon && <Icon name={a.icon} size={20} />}
      <span>{a.label}</span>
      <input
        className="pp-toggle"
        type="checkbox"
        checked={!!v}
        ref={(el) => {
          if (el) el.indeterminate = v === undefined
        }}
        onChange={(e) => applyAction(a, tiles.map((t) => t.id), e.target.checked, api)}
      />
      <span className="pp-control" />
    </label>
  )
}

const fmtNum = (v: unknown) => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000).replace('.', ',') : v == null ? '' : String(v))

function ActionInput({ a, tiles }: { a: ActionSpec; tiles: Tile[] }) {
  const v = common(a, tiles)
  const [draft, setDraft] = useState(fmtNum(v))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(fmtNum(v))
  }, [v])
  const isNum = a.value === 'number'
  const clampN = (n: number) => (a.range ? Math.min(a.range[1], Math.max(a.range[0], n)) : n)
  const send = (raw: string) => {
    if (isNum) {
      const n = Number(raw.replace(',', '.'))
      if (!Number.isFinite(n)) return setDraft(fmtNum(v))
      applyAction(a, tiles.map((t) => t.id), clampN(n), api)
    } else applyAction(a, tiles.map((t) => t.id), raw, api)
  }
  const step = (dir: 1 | -1) => {
    const cur = Number(String(v ?? draft).replace(',', '.')) || 0
    const st = a.step ?? 1
    // Adımın katlarına yuvarla (Polypad gibi)
    const next = clampN(Math.round((dir > 0 ? Math.floor(cur / st + 1e-9) + 1 : Math.ceil(cur / st - 1e-9) - 1) * st * 1e6) / 1e6)
    applyAction(a, tiles.map((t) => t.id), next, api)
  }
  return (
    <div className="pp-act field">
      {a.icon && <Icon name={a.icon} size={20} />}
      <span>{a.label}</span>
      {isNum && (
        <button type="button" className="pp-inc" aria-label="Azalt" onClick={() => step(-1)}>
          –
        </button>
      )}
      <input
        className={`pp-input pp-act-input${isNum ? ' num' : ''}`}
        inputMode={isNum ? 'decimal' : 'text'}
        value={draft}
        aria-label={a.label}
        onFocus={() => (focused.current = true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          focused.current = false
          if (e.target.value !== fmtNum(v)) send(e.target.value)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {isNum && (
        <button type="button" className="pp-inc" aria-label="Artır" onClick={() => step(1)}>
          +
        </button>
      )}
    </div>
  )
}

function ActionSelect({ a, tiles }: { a: ActionSpec; tiles: Tile[] }) {
  const v = common(a, tiles)
  return (
    <label className="pp-act field">
      {a.icon && <Icon name={a.icon} size={20} />}
      <span>{a.label}</span>
      <select className="pp-input" value={v === undefined ? '' : String(v)} onChange={(e) => applyAction(a, tiles.map((t) => t.id), e.target.value, api)}>
        {v === undefined && <option value="">—</option>}
        {a.options?.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ActionSlider({ a, tiles }: { a: ActionSpec; tiles: Tile[] }) {
  const v = Number(common(a, tiles) ?? 0)
  return (
    <label className="pp-act field slider">
      <span>{a.label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => applyAction(a, tiles.map((t) => t.id), Number(e.target.value), api, false)}
        onPointerUp={() => commit()}
        onKeyUp={() => commit()}
      />
    </label>
  )
}

function Item({ a, tiles, inMenu }: { a: ActionSpec; tiles: Tile[]; inMenu?: boolean }) {
  switch (a.type) {
    case 'button':
      return <ActionButton a={a} tiles={tiles} inMenu={inMenu} />
    case 'checkbox':
      return <ActionCheckbox a={a} tiles={tiles} />
    case 'input':
      return <ActionInput a={a} tiles={tiles} />
    case 'select':
      return <ActionSelect a={a} tiles={tiles} />
    case 'slider':
      return <ActionSlider a={a} tiles={tiles} />
  }
}

const SECTIONS: { slot: Slot; title: string; icon: string }[] = [
  { slot: 'more', title: 'Parça seçenekleri', icon: 'shapes' },
  { slot: 'music', title: 'Müzik', icon: 'applications' },
  { slot: 'author', title: 'Yazar seçenekleri', icon: 'edit' },
]

/** Seçili parçaların altında duran eylem çubuğu */
export function ActionBar() {
  const sel = useStore((s) => s.sel)
  const tiles = useStore((s) => s.tiles)
  const view = useStore((s) => s.view)
  const tool = useStore((s) => s.tool)
  const editing = useStore((s) => s.editing)
  const dragging = useStore((s) => s.dragging)
  const authoring = useStore((s) => s.authoring)
  const mode = useStore((s) => s.settings.actionbar)
  const [menu, setMenu] = useState(false)
  const [closed, setClosed] = useState<Slot[]>(['music', 'author'])
  const closeMenu = useCallback(() => setMenu(false), [])
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const set = new Set(sel)
  const selected = tiles.filter((t) => set.has(t.id))
  const selKey = sel.join(',')
  useEffect(() => setMenu(false), [selKey])

  useLayoutEffect(() => {
    const el = ref.current
    if (el && (el.offsetWidth !== size.w || el.offsetHeight !== size.h)) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  })

  if (!selected.length || tool !== 'move' || editing || mode === 'never') return null
  const slots = layoutActions(selected, authoring)
  const hasMenu = slots.more.length + slots.music.length + slots.author.length > 0
  if (!slots.bar.length && !hasMenu) return null

  const pinned = mode === 'always'
  // Konum: seçimin (döndürme tutamağı dahil) altı; aşağıda yer yoksa üstü
  const b = selectionBox(sel)!
  const left = b.x * view.z + view.x - 3
  const below = (b.y + b.h) * view.z + view.y + 14
  const above = b.y * view.z + view.y - 52 - size.h
  const roomBelow = below + size.h < viewport.h - 96
  const top = roomBelow ? below : Math.max(8, above)
  const nearBtm = !roomBelow || top > viewport.h - 340
  const style = pinned
    ? undefined
    : {
        transform: `translate(${Math.round(Math.min(Math.max(8, left), Math.max(8, viewport.w - size.w - 8)))}px, ${Math.round(Math.min(Math.max(8, top), Math.max(8, viewport.h - size.h - 90)))}px)`,
      }

  return (
    <div
      ref={ref}
      className={`pp-actionbar${pinned ? ' pinned' : ' floating'}${nearBtm || pinned ? ' near-btm' : ''}${dragging ? ' hidden' : ''}`}
      style={style}
      role="toolbar"
      aria-label="Eylem çubuğu"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="pp-actions">
        {slots.bar.map((a) => (
          <Item key={a.id} a={a} tiles={selected} />
        ))}
      </div>
      {hasMenu && (
        <div className="pp-act-more">
          <button type="button" className="pp-act more" aria-label="Diğer araçlar" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Icon name="more" size={24} />
            <span className="pp-tooltip">Diğer araçlar</span>
          </button>
          <Popup open={menu} onClose={closeMenu} label="Diğer araçlar" place={nearBtm || pinned ? 'top' : 'bottom'} className="pp-act-menu">
            {SECTIONS.filter((s) => slots[s.slot].length).map((s) => {
              const open = !closed.includes(s.slot)
              return (
                <div key={s.slot} className="pp-act-section">
                  <h4 className={open ? 'active' : ''} role="button" tabIndex={0} onClick={() => setClosed((c) => (open ? [...c, s.slot] : c.filter((x) => x !== s.slot)))}>
                    <Icon name="chevron" size={16} className="pp-chev" /> {s.title}
                  </h4>
                  {open && (
                    <div className="pp-act-list">
                      {slots[s.slot].map((a) => (
                        <Item key={a.id} a={a} tiles={selected} inMenu />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <button type="button" className="pp-pin" onClick={() => setState((st) => ({ settings: { ...st.settings, actionbar: pinned ? 'custom' : 'always' } }))}>
              <Icon name="pin" size={14} /> {pinned ? 'Sabitlemeyi kaldır' : 'Eylem çubuğunu sabitle'}
            </button>
          </Popup>
        </div>
      )}
    </div>
  )
}
