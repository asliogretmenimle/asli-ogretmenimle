import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import { Popup } from './Popup'
import { PALETTE } from './colors'
import { getDef } from './tiles'
import { applyColor } from './Toolbar'
import { openTextEditor } from './Canvas'
import { api, bringToFront, commit, duplicate, getState, removeTiles, sendToBack, updateTiles, useStore, viewport, worldBox } from './store'
import { boundsOf, boxCorners } from './geom'

function A({ icon, label, onClick, active, children }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean; children?: ReactNode }) {
  return (
    <div className="pp-action-wrap">
      <button type="button" className={`pp-action${active ? ' active' : ''}`} onClick={onClick} aria-label={label} aria-pressed={active}>
        {icon}
        <span className="pp-tooltip">{label}</span>
      </button>
      {children}
    </div>
  )
}

/** Seçili parçaların üstünde duran eylem çubuğu */
export function ActionBar() {
  const sel = useStore((s) => s.sel)
  const tiles = useStore((s) => s.tiles)
  const view = useStore((s) => s.view)
  const tool = useStore((s) => s.tool)
  const editing = useStore((s) => s.editing)
  const settings = useStore((s) => s.settings)
  const [colorOpen, setColorOpen] = useState(false)
  const closeColor = useCallback(() => setColorOpen(false), [])
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const set = new Set(sel)
  const selected = tiles.filter((t) => set.has(t.id))

  useLayoutEffect(() => {
    const el = ref.current
    if (el && (el.offsetWidth !== size.w || el.offsetHeight !== size.h)) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  })

  if (!selected.length || tool !== 'move' || editing || settings.actionbar === 'never') return null

  const one = selected.length === 1 ? selected[0] : null
  const def = one ? getDef(one.type) : undefined
  const locked = selected.every((t) => t.locked)
  const colorable = selected.some((t) => getDef(t.type)?.colorable)
  const flippable = selected.some((t) => getDef(t.type)?.flippable)
  const extra = one && def?.actions && !one.locked ? def.actions(one, api) : []

  // Konum: seçimin üstü; yer yoksa altı
  const b = boundsOf(selected.flatMap((t) => boxCorners(worldBox(t))))
  const top = b.y * view.z + view.y
  const bottom = (b.y + b.h) * view.z + view.y
  const cx = (b.x + b.w / 2) * view.z + view.x
  const pinned = settings.actionbar === 'always'
  const above = top - size.h - 48 > 8
  const style = pinned
    ? undefined
    : {
        left: Math.min(Math.max(8, cx - size.w / 2), Math.max(8, viewport.w - size.w - 8)),
        top: Math.min(Math.max(8, above ? top - size.h - 48 : bottom + 16), Math.max(8, viewport.h - size.h - 90)),
      }

  const ids = selected.map((t) => t.id)
  const run = (fn: () => void) => () => {
    fn()
    commit()
  }

  return (
    <div ref={ref} className={`pp-actionbar${pinned ? ' pinned' : ''}`} style={style} role="toolbar" aria-label="Eylem çubuğu" onPointerDown={(e) => e.stopPropagation()}>
      {extra.map((a) => (
        <A key={a.id} icon={a.icon} label={a.label} active={a.active} onClick={() => one && a.run(getState().tiles.find((t) => t.id === one.id) ?? one, api)} />
      ))}
      {extra.length > 0 && <span className="pp-action-sep" />}
      {one && def?.text && !locked && <A icon={<Icon name="edit" size={20} />} label="Düzenle" onClick={() => openTextEditor(one)} />}
      {colorable && !locked && (
        <A icon={<span className="pp-swatch" style={{ background: selected.find((t) => t.color)?.color ?? '#999' }} />} label="Renk" onClick={() => setColorOpen((o) => !o)} active={colorOpen}>
          <Popup open={colorOpen} onClose={closeColor} label="Renk" place={above ? 'top' : 'bottom'} className="pp-color-popup small">
            <div className="pp-palette">
              {PALETTE.map((p) => (
                <button key={p.c} type="button" style={{ background: p.c }} aria-label={p.name} title={p.name} onClick={() => applyColor(p.c)} />
              ))}
            </div>
          </Popup>
        </A>
      )}
      {flippable && !locked && <A icon={<Icon name="flip" size={20} />} label="Yansıt" onClick={run(() => updateTiles(ids, (t) => (getDef(t.type)?.flippable ? { flip: !t.flip } : null)))} />}
      {settings.rotate && one && !locked && def?.rotatable !== false && (
        <A icon={<Icon name="rotate" size={20} />} label="Döndür" onClick={run(() => updateTiles(ids, (t) => ({ rot: (t.rot + ((def?.rotStep ?? 15) >= 30 ? def!.rotStep! : 45)) % 360 })))} />
      )}
      {settings.copy && !locked && <A icon={<Icon name="copy" size={20} />} label="Çoğalt" onClick={() => duplicate(ids)} />}
      <A icon={<Icon name="front" size={20} />} label="Öne getir" onClick={run(() => bringToFront(ids))} />
      <A icon={<Icon name="back" size={20} />} label="Arkaya gönder" onClick={run(() => sendToBack(ids))} />
      <A icon={<Icon name={locked ? 'unlock' : 'lock'} size={20} />} label={locked ? 'Kilidi aç' : 'Kilitle'} active={locked} onClick={run(() => updateTiles(ids, () => ({ locked: !locked })))} />
      {settings.del && !locked && (
        <A
          icon={<Icon name="trash" size={20} />}
          label="Sil"
          onClick={() => {
            removeTiles(ids)
            commit()
          }}
        />
      )}
    </div>
  )
}
