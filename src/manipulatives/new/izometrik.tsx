import { useRef, type ReactNode } from 'react'
import { Eraser, Minus, Plus, RotateCcw, RotateCw } from 'lucide-react'
import { ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * İzometrik Küp Tahtası
 *  - Küpe ya da boş zemine dokun: o sütuna küp eklenir (Çıkar modunda en üstteki küp alınır).
 *    Aynı işlem alttaki kat planından da yapılır (sayılar = sütun yükseklikleri).
 *  - Görünümü döndür: ↺ ↻ düğmeleri ya da yapı üzerinde iki parmakla çevir (90°’lik adımlar).
 *  - Önden / sağdan / üstten görünümler canlı çizilir; hacim (küp sayısı) ve yüzey alanı (dıştaki kare yüzler) sayılır.
 *    Her eklemede yüzey alanının neden 6 değil de daha az arttığı gösterilir (birleşen yüzler).
 *
 * Görev hedefleri (target):
 *  - { views: { front?: number[], side?: number[], top?: string[] } }
 *      front: soldan sağa sütun yükseklikleri (önden bakınca), side: soldan sağa (sağdan bakınca),
 *      top: arkadan öne satırlar, '#' dolu '.' boş (üstten bakınca, ön aşağıda).
 *      Görünümler yapının yeri önemsiz olacak şekilde (boş kenarlar kırpılarak) karşılaştırılır.
 *  - { volume: 10 } (isteğe bağlı { surface: 34 }) → küp sayısı (ve yüzey alanı) tutmalı.
 */

type V = { h: number[][]; n: number; rot: number; mode: 'add' | 'remove'; last: { dv: number; ds: number; shared: number } | null }
const MAXH = 5
const LAYER = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa']

function shade(hex: string, f: number) {
  const c = parseInt(hex.slice(1), 16)
  const mix = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))
  return `rgb(${mix(c >> 16)}, ${mix((c >> 8) & 255)}, ${mix(c & 255)})`
}
const at = (h: number[][], j: number, i: number) => h[j]?.[i] ?? 0
const volume = (h: number[][]) => h.flat().reduce((s, v) => s + v, 0)
function surface(h: number[][]) {
  let s = 0
  h.forEach((row, j) =>
    row.forEach((v, i) => {
      if (!v) return
      s += 2
      for (const [dj, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s += Math.max(0, v - at(h, j + dj, i + di))
    }),
  )
  return s
}
const frontView = (h: number[][]) => h[0].map((_, i) => Math.max(...h.map((r) => r[i])))
const sideView = (h: number[][]) => h.map((r) => Math.max(...r)).reverse()
const topView = (h: number[][]) => h.map((r) => r.map((v) => (v > 0 ? '#' : '.')).join(''))
const trim1 = (a: number[]) => {
  let s = 0, e = a.length
  while (s < e && !a[s]) s++
  while (e > s && !a[e - 1]) e--
  return a.slice(s, e).join(',')
}
const trimTop = (rows: string[]) => {
  const r = rows.filter((x) => x.includes('#'))
  if (!r.length) return ''
  const cols = rows[0].length
  let s = cols, e = 0
  rows.forEach((x) => [...x].forEach((c, i) => { if (c === '#') { s = Math.min(s, i); e = Math.max(e, i + 1) } }))
  return r.map((x) => x.slice(s, e)).join('/')
}
const empty = (N: number) => Array.from({ length: N }, () => Array(N).fill(0) as number[])

/** Görünümü döndürülmüş yükseklik haritası ve orijinal hücreye dönüş */
function rotated(h: number[][], rot: number) {
  const N = h.length
  const out = empty(N)
  const back: [number, number][][] = Array.from({ length: N }, () => Array(N).fill([0, 0]))
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      let x = i, y = j
      for (let k = 0; k < rot; k++) [x, y] = [N - 1 - y, x]
      out[y][x] = h[j][i]
      back[y][x] = [j, i]
    }
  return { h: out, back }
}

function IsoView({ value, tap, onRotate, locked }: { value: V; tap: (j: number, i: number) => void; onRotate: (d: number) => void; locked?: boolean }) {
  const N = value.n
  const s = 34
  const cw = s * 0.866, ch = s * 0.5
  const { h, back } = rotated(value.h, value.rot)
  const P = (x: number, y: number, z: number) => `${((x - y) * cw).toFixed(1)},${((x + y) * ch - z * s).toFixed(1)}`
  const minX = -N * cw - 8, maxX = N * cw + 8, minY = -MAXH * s - 8, maxY = 2 * N * ch + 30
  const faces: ReactNode[] = []
  // zemin
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const [j, i] = back[y][x]
      faces.push(
        <polygon key={`f${x}${y}`} points={`${P(x, y, 0)} ${P(x + 1, y, 0)} ${P(x + 1, y + 1, 0)} ${P(x, y + 1, 0)}`} fill={(x + y) % 2 ? '#eef0f7' : '#f6f7fb'} stroke="#d5d8e6" strokeWidth={1} onClick={() => !h[y][x] && tap(j, i)} style={{ cursor: locked ? 'default' : 'pointer' }} />,
      )
    }
  // ön kenar işareti (orijinal ön = j = N-1 kenarı)
  const frontEdge = (() => {
    // orijinal ön kenarın iki köşesini döndür
    const corner = (cx: number, cy: number) => {
      let x = cx, y = cy
      for (let k = 0; k < value.rot; k++) [x, y] = [N - y, x]
      return [x, y] as const
    }
    const a = corner(0, N), b = corner(N, N)
    return { a, b }
  })()
  const cells: { x: number; y: number }[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ x, y })
  cells.sort((p, q) => p.x + p.y - (q.x + q.y))
  for (const { x, y } of cells) {
    const [j, i] = back[y][x]
    for (let z = 0; z < h[y][x]; z++) {
      const c = LAYER[z % LAYER.length]
      const top = z === h[y][x] - 1
      faces.push(
        <g key={`c${x}${y}${z}`} onClick={() => tap(j, i)} style={{ cursor: locked ? 'default' : 'pointer' }} stroke="#1f2340" strokeWidth={1.3} strokeLinejoin="round">
          {top && <polygon points={`${P(x, y, z + 1)} ${P(x + 1, y, z + 1)} ${P(x + 1, y + 1, z + 1)} ${P(x, y + 1, z + 1)}`} fill={shade(c, 0.45)} />}
          <polygon points={`${P(x, y + 1, z)} ${P(x + 1, y + 1, z)} ${P(x + 1, y + 1, z + 1)} ${P(x, y + 1, z + 1)}`} fill={shade(c, 0)} />
          <polygon points={`${P(x + 1, y, z)} ${P(x + 1, y + 1, z)} ${P(x + 1, y + 1, z + 1)} ${P(x + 1, y, z + 1)}`} fill={shade(c, -0.22)} />
        </g>,
      )
    }
  }
  const fe = frontEdge
  const mx = (fe.a[0] + fe.b[0]) / 2, my = (fe.a[1] + fe.b[1]) / 2
  const [lx, ly] = P(mx + (mx - N / 2) * 0.3, my + (my - N / 2) * 0.3, 0).split(',').map(Number)

  const ptrs = useRef(new Map<number, [number, number]>())
  const rot = useRef<{ a0: number } | null>(null)
  const ang = () => { const [a, b] = [...ptrs.current.values()]; return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI }
  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="block w-full select-none"
      style={{ touchAction: 'none', maxHeight: 440 }}
      role="img"
      aria-label="İzometrik küp yapısı"
      onPointerDown={(e) => {
        ptrs.current.set(e.pointerId, [e.clientX, e.clientY])
        if (ptrs.current.size === 2) rot.current = { a0: ang() }
      }}
      onPointerMove={(e) => {
        if (!ptrs.current.has(e.pointerId)) return
        ptrs.current.set(e.pointerId, [e.clientX, e.clientY])
        if (rot.current && ptrs.current.size === 2) {
          let d = ang() - rot.current.a0
          if (d > 180) d -= 360
          if (d < -180) d += 360
          if (Math.abs(d) > 50) {
            onRotate(d > 0 ? 1 : -1)
            rot.current.a0 = ang()
          }
        }
      }}
      onPointerUp={(e) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) rot.current = null }}
      onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); rot.current = null }}
    >
      {faces}
      <g pointerEvents="none">
        <rect x={lx - 22} y={ly - 2} width={44} height={22} rx={11} fill="#d6457a" />
        <text x={lx} y={ly + 13} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">ÖN</text>
      </g>
    </svg>
  )
}

function ViewGrid({ title, cols, rows, filled, hint }: { title: string; cols: number; rows: number; filled: (c: number, r: number) => boolean; hint?: string }) {
  const u = 22
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2.5 ring-1 ring-line">
      <span className="text-xs font-black tracking-wide text-ink-soft uppercase">{title}</span>
      <svg viewBox={`-2 -2 ${cols * u + 4} ${rows * u + 4}`} style={{ width: Math.min(150, cols * u + 4) }} aria-label={title}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect key={`${r}-${c}`} x={c * u} y={r * u} width={u} height={u} fill={filled(c, r) ? '#d6457a' : '#fff'} stroke={filled(c, r) ? '#a92f5c' : '#e3e5ef'} strokeWidth={1.2} />
          )),
        )}
      </svg>
      {hint && <span className="text-[11px] font-bold text-ink-soft">{hint}</span>}
    </div>
  )
}

function Views({ front, side, top, N }: { front?: number[]; side?: number[]; top?: string[]; N: number }) {
  const H = Math.max(2, ...(front ?? [0]), ...(side ?? [0]))
  return (
    <div className="flex flex-wrap items-start justify-center gap-2">
      {front && <ViewGrid title="Önden" cols={front.length} rows={H} filled={(c, r) => H - r <= front[c]} hint="sol → sağ" />}
      {side && <ViewGrid title="Sağdan" cols={side.length} rows={H} filled={(c, r) => H - r <= side[c]} hint="ön → arka" />}
      {top && <ViewGrid title="Üstten" cols={top[0]?.length ?? N} rows={top.length} filled={(c, r) => top[r]?.[c] === '#'} hint="ön aşağıda" />}
    </div>
  )
}

export const izometrik: ToolDef<V> = {
  id: 'izometrik',
  defaultConfig: { size: 4 },
  initial: (c, t) => {
    const N = Math.max(3, Math.min(6, n(t, 'size', c.size ?? 4)))
    const h = empty(N)
    if (!t) {
      h[N - 1][0] = 2; h[N - 1][1] = 1; h[N - 2][0] = 1
    }
    return { h, n: N, rot: 0, mode: 'add', last: null }
  },
  check: (v, t) => {
    if (typeof t.volume === 'number') {
      if (volume(v.h) !== t.volume) return false
      if (typeof t.surface === 'number' && surface(v.h) !== t.surface) return false
      return true
    }
    const views = t.views as { front?: number[]; side?: number[]; top?: string[] } | undefined
    if (!views || !volume(v.h)) return false
    if (views.front && trim1(frontView(v.h)) !== trim1(views.front)) return false
    if (views.side && trim1(sideView(v.h)) !== trim1(views.side)) return false
    if (views.top && trimTop(topView(v.h)) !== trimTop(views.top)) return false
    return !!(views.front || views.side || views.top)
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const reveal = !task || !!locked
    const N = value.n
    const tv = target?.views as { front?: number[]; side?: number[]; top?: string[] } | undefined
    const tap = (j: number, i: number) => {
      if (locked) return
      const cur = value.h[j][i]
      const h = value.h.map((r) => [...r])
      if (value.mode === 'add') {
        if (cur >= MAXH) return
        h[j][i] = cur + 1
        let shared = cur > 0 ? 1 : 0
        for (const [dj, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(value.h, j + dj, i + di) > cur) shared++
        onChange({ ...value, h, last: { dv: 1, ds: 6 - 2 * shared, shared } })
      } else {
        if (!cur) return
        h[j][i] = cur - 1
        let shared = cur - 1 > 0 ? 1 : 0
        for (const [dj, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(value.h, j + dj, i + di) >= cur) shared++
        onChange({ ...value, h, last: { dv: -1, ds: -(6 - 2 * shared), shared } })
      }
    }
    const V = volume(value.h), S = surface(value.h)
    const base = value.h.flat().filter((x) => x > 0).length
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ToolButton active={value.mode === 'add'} onClick={() => onChange({ ...value, mode: 'add' })}><Plus size={16} /> Ekle</ToolButton>
          <ToolButton active={value.mode === 'remove'} onClick={() => onChange({ ...value, mode: 'remove' })}><Minus size={16} /> Çıkar</ToolButton>
          <span className="mx-1 h-8 w-px bg-line" />
          <ToolButton onClick={() => onChange({ ...value, rot: (value.rot + 3) % 4 })}><RotateCcw size={16} /> Döndür</ToolButton>
          <ToolButton onClick={() => onChange({ ...value, rot: (value.rot + 1) % 4 })}><RotateCw size={16} /> Döndür</ToolButton>
          {!locked && <ToolButton disabled={!V} onClick={() => onChange({ ...value, h: empty(N), last: null })}><Eraser size={16} /> Temizle</ToolButton>}
        </div>
        <div className="grid w-full max-w-4xl items-start gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl bg-gradient-to-b from-sky-50 to-white p-2 ring-1 ring-line">
            <IsoView value={value} tap={tap} locked={locked} onRotate={(d) => onChange({ ...value, rot: (value.rot + d + 4) % 4 })} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-black tracking-wide text-ink-soft uppercase">Kat planı (üstten)</span>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
              {value.h.map((row, j) =>
                row.map((v, i) => (
                  <button
                    key={`${j}-${i}`}
                    type="button"
                    onClick={() => tap(j, i)}
                    disabled={locked}
                    aria-label={`${j + 1}. satır ${i + 1}. sütun: ${v} küp`}
                    className="grid size-12 place-items-center rounded-xl text-lg font-black tabular-nums ring-1 ring-line transition active:scale-95"
                    style={{ background: v ? shade(LAYER[(v - 1) % LAYER.length], 0.55) : '#fff', color: '#1f2340' }}
                  >
                    {v || ''}
                  </button>
                )),
              )}
            </div>
            <span className="rounded-full bg-brand px-3 py-0.5 text-xs font-black text-white">ÖN</span>
          </div>
        </div>
        <p className="text-center text-sm font-bold text-ink-soft">Küpe ya da zemine dokun; kat planındaki sayılar sütunların yüksekliği. Yapıyı iki parmakla çevirerek döndür.</p>
        {tv && !locked && (
          <div className="w-full max-w-4xl rounded-2xl bg-brand-soft p-3">
            <p className="mb-2 text-center text-sm font-black text-brand-ink">Bu görünümlere uyan yapıyı kur</p>
            <Views front={tv.front} side={tv.side} top={tv.top} N={N} />
          </div>
        )}
        {reveal && V > 0 && (
          <div className="w-full max-w-4xl space-y-2">
            <Views front={frontView(value.h)} side={sideView(value.h)} top={topView(value.h)} N={N} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-ink px-4 py-3 text-center text-white">
                <p className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Hacim</p>
                <p className="text-2xl font-black">{V} birim küp</p>
                <p className="text-sm font-bold text-white/75">Kat planındaki sayıların toplamı: {value.h.flat().filter(Boolean).join(' + ') || 0}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-line">
                <p className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Yüzey alanı (tabanla birlikte)</p>
                <p className="text-2xl font-black text-brand">{S} kare yüz</p>
                <p className="text-sm font-bold text-ink-soft">{V} ayrı küp olsaydı {6 * V} yüz olurdu; {(6 * V - S) / 2} yerde iki yüz birleşti. Taban: {base} kare.</p>
                {value.last && (
                  <p className={`mt-1 rounded-xl px-2 py-1 text-sm font-black ${value.last.dv > 0 ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
                    {value.last.dv > 0 ? '+1 küp' : '−1 küp'} → yüzey {value.last.ds >= 0 ? '+' : '−'}{Math.abs(value.last.ds)}
                    {' '}(6 − 2 × {value.last.shared} birleşen yüz)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
}
