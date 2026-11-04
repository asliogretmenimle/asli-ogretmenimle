/**
 * Tüm parçalar için ortak eylemler (Polypad'deki sıra ve kurallarla).
 * Parçaya özel eylemler tiles/*.tsx dosyalarında `…Actions` olarak tanımlanır; sıralama:
 * önce parçaya özel eylemler, sonra müzik, yazar ve en sonda çubuğa sabit eylemler (Kopyala, Sil, Yardım).
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping'
import type { ActionSpec, PadApi, Pt, Tile } from './types'
import { getDef, tileActions } from './tiles'
import { round, toWorld } from './geom'
import { playNote, midiFreq } from './sound'
import { bringToFront, commit, duplicate, getState, removeTiles, sendToBack, setState, updateTiles } from './store'

/** Polypad'deki "Fi" grubu: kesilebilen, birleştirilebilen çokgen türleri */
export const POLY_TYPES = ['polygon', 'tangram', 'polyomino', 'custom-polygon', 'rectangle', 'reg-polygon', 'fractal', 'penrose', 'aperiodic-hat']

/** Sesle çalınabilen parçalar (Polypad gn) */
const MUSIC_TYPES = [...POLY_TYPES, 'fraction-bar', 'fraction-circle', 'number-bar', 'dice', 'polyhedral-dice', 'spinner', 'custom-spinner']

/** Dikey eksene göre simetrik olan hazır çokgenler: yansıtmak görünümü değiştirmez */
const SYMMETRIC = new Set(['equ-triangle', 'square', 'reg-pentagon', 'reg-hexagon', 'reg-heptagon', 'reg-octagon', 'trapezium', 'rectangle', 'kite', 'dart'])

const isSymmetric = (t: Tile) =>
  (t.type === 'polygon' && SYMMETRIC.has(t.p.shape)) || t.type === 'rectangle' || t.type === 'reg-polygon' || (t.type === 'polyomino' && [1, 5, 6, 9, 10, 12, 13, 15].includes(t.p.index))

// ---------------------------------------------------------------------------
// Çokgen işlemleri
// ---------------------------------------------------------------------------

/** Parçanın dünya koordinatındaki çokgeni (dış sınır) */
export function worldPolygon(t: Tile): Pt[] | null {
  const ol = getDef(t.type)?.outline?.(t)
  if (!ol || ol.length < 3) return null
  return ol.map((p) => toWorld(t, p))
}

const ring = (pts: Pt[]): [number, number][] => {
  const r = pts.map((p) => [p.x, p.y] as [number, number])
  r.push(r[0])
  return r
}

/** Çakışık ve aynı doğru üzerindeki köşeleri atar */
function simplify(r: [number, number][]): [number, number][] {
  const pts = r.slice(0, -1)
  let changed = true
  while (changed && pts.length > 3) {
    changed = false
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length]
      const b = pts[i]
      const c = pts[(i + 1) % pts.length]
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1
      if (Math.abs(cross) / len < 0.5 || Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5) {
        pts.splice(i, 1)
        changed = true
        break
      }
    }
  }
  return [...pts, pts[0]]
}

/** Çoklu çokgen sonucunu serbest çokgen parçalarına çevirir */
function polysToTiles(mp: MultiPolygon, color: string | undefined): Omit<Tile, 'id'>[] {
  const out: Omit<Tile, 'id'>[] = []
  for (const raw of mp) {
    const poly = raw.map(simplify)
    const outer = poly[0].slice(0, -1).map(([x, y]) => ({ x, y }))
    if (outer.length < 3) continue
    let cx = 0
    let cy = 0
    let minx = Infinity
    let maxx = -Infinity
    let miny = Infinity
    let maxy = -Infinity
    for (const p of outer) {
      minx = Math.min(minx, p.x)
      maxx = Math.max(maxx, p.x)
      miny = Math.min(miny, p.y)
      maxy = Math.max(maxy, p.y)
    }
    cx = (minx + maxx) / 2
    cy = (miny + maxy) / 2
    const rel = (r: [number, number][]) => r.slice(0, -1).map(([x, y]) => ({ x: round(x - cx), y: round(y - cy) }))
    out.push({ type: 'custom-polygon', x: cx, y: cy, rot: 0, color, p: { pts: rel(poly[0]), holes: poly.slice(1).map(rel) } })
  }
  return out
}

type Op = 'union' | 'intersection' | 'difference' | 'xor'

function boolean(tiles: Tile[], api: PadApi, op: Op) {
  const polys = tiles.map(worldPolygon).filter(Boolean) as Pt[][]
  if (polys.length < 2) return
  const geoms: Polygon[] = polys.map((p) => [ring(p)])
  let res: MultiPolygon
  if (op === 'union') res = polygonClipping.union(geoms[0], ...geoms.slice(1))
  else if (op === 'intersection') res = polygonClipping.intersection(geoms[0], ...geoms.slice(1))
  else if (op === 'difference') res = polygonClipping.difference(geoms[0], ...geoms.slice(1))
  else res = polygonClipping.xor(geoms[0], ...geoms.slice(1))
  const pieces = polysToTiles(res, tiles[0].color)
  api.remove(tiles.map((t) => t.id))
  if (pieces.length) api.add(pieces)
  api.sound('pop')
}

/** Bir çizgiyle (dünya koordinatı) kesilen çokgen parçaları ikiye (ya da daha fazlasına) böler */
export function cutAlong(a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 4) return 0
  // Çizgiyi iki yana uzanan çok büyük iki yarım düzleme çevir
  const ux = dx / len
  const uy = dy / len
  const big = 1e5
  const p1 = { x: a.x - ux * big, y: a.y - uy * big }
  const p2 = { x: a.x + ux * big, y: a.y + uy * big }
  const nx = -uy * big
  const ny = ux * big
  const left: Polygon = [ring([p1, p2, { x: p2.x + nx, y: p2.y + ny }, { x: p1.x + nx, y: p1.y + ny }])]
  const right: Polygon = [ring([p1, p2, { x: p2.x - nx, y: p2.y - ny }, { x: p1.x - nx, y: p1.y - ny }])]
  const st = getState()
  const cutTiles: Tile[] = []
  const added: Omit<Tile, 'id'>[] = []
  for (const t of st.tiles) {
    if (!POLY_TYPES.includes(t.type) || t.locked) continue
    const poly = worldPolygon(t)
    if (!poly) continue
    // Kesim çizgisi gerçekten çokgenin içinden geçiyor mu? (doğru parçası ile kenar kesişimi)
    if (!segmentCrosses(a, b, poly)) continue
    const g: Polygon = [ring(poly)]
    const l = polygonClipping.intersection(g, left)
    const r = polygonClipping.intersection(g, right)
    if (!l.length || !r.length) continue
    cutTiles.push(t)
    added.push(...polysToTiles(l, t.color), ...polysToTiles(r, t.color))
  }
  if (!cutTiles.length) return 0
  removeTiles(cutTiles.map((t) => t.id))
  // Parçaları kesim çizgisinden biraz ayır
  const sep = (t: Omit<Tile, 'id'>) => {
    const s = Math.sign((t.x - a.x) * -uy + (t.y - a.y) * ux) || 1
    return { ...t, x: t.x - uy * 4 * s, y: t.y + ux * 4 * s }
  }
  const ids = added.map(sep).map((t) => ({ ...t, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` }))
  setState((s) => ({ tiles: [...s.tiles, ...ids], sel: ids.map((t) => t.id) }))
  commit()
  return cutTiles.length
}

function segmentCrosses(a: Pt, b: Pt, poly: Pt[]) {
  let hits = 0
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i]
    const d = poly[(i + 1) % poly.length]
    const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)
    if (Math.abs(den) < 1e-9) continue
    const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den
    const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) hits++
  }
  return hits >= 2
}

// ---------------------------------------------------------------------------
// Seslendirme (Polypad "Çal"): parçanın bir özelliğini notalara çevirir
// ---------------------------------------------------------------------------

const SCALE = [0, 2, 4, 5, 7, 9, 11]
const noteOf = (i: number) => midiFreq(60 + SCALE[i % 7] + 12 * Math.floor(i / 7))

function play(tiles: Tile[]) {
  let delay = 0
  for (const t of tiles) {
    let n = 1
    if (t.type === 'fraction-bar' || t.type === 'fraction-circle') n = t.p.count ?? t.p.denominator ?? 1
    else if (t.type === 'number-bar') n = t.p.value ?? 1
    else if (t.type === 'dice' || t.type === 'polyhedral-dice') n = Number(t.p.value ?? t.p.face ?? 1) || 1
    else {
      const ol = getDef(t.type)?.outline?.(t)
      n = ol?.length ?? 4
    }
    n = Math.max(1, Math.min(24, Math.round(n)))
    const beat = t.type === 'fraction-bar' || t.type === 'fraction-circle' ? 1.6 / n : 0.22
    for (let i = 0; i < n; i++) playNote(noteOf(t.type.startsWith('fraction') ? 0 : i), Math.max(0.12, beat * 0.9), 'triangle', 0.18, delay + i * beat)
    delay += n * beat + 0.1
  }
}

// ---------------------------------------------------------------------------
// Yardım konusu eşlemesi
// ---------------------------------------------------------------------------

const HELP: Record<string, string> = {
  polygon: 'polygon',
  rectangle: 'polygon',
  'reg-polygon': 'polygon',
  'custom-polygon': 'polygon',
  circle: 'polygon',
  polyomino: 'polyomino',
  tangram: 'polyomino',
  polyhedron: 'polyhedron',
  ruler: 'utensils',
  protractor: 'utensils',
  'set-triangle': 'utensils',
  compass: 'utensils',
  angle: 'utensils',
  'number-tile': 'number-tile',
  'number-cube': 'number-tile',
  'number-bar': 'number-tile',
  'ten-frame': 'number-frame',
  'number-frame': 'number-frame',
  'ten-frame-counter': 'number-frame',
  'number-line': 'number-line',
  'multi-jump': 'number-line',
  'prime-disk': 'prime-disk',
  abacus: 'abacus',
  'dot-machine': 'abacus',
  'fraction-bar': 'fraction-bar',
  'fraction-circle': 'fraction-bar',
  algebra: 'algebra',
  bucket: 'algebra',
  balance: 'balance',
  token: 'balance',
  'function-machine': 'function-machine',
  axes: 'axes',
  slider: 'axes',
  dice: 'dice',
  coin: 'dice',
  spinner: 'dice',
  'custom-spinner': 'dice',
  chart: 'chart',
  'pie-chart': 'chart',
  'box-whisker': 'chart',
  card: 'card',
  'logic-gate': 'logic',
  clock: 'clock',
  piano: 'song',
  song: 'song',
  text: 'text',
  equation: 'equation',
  line: 'line',
  stroke: 'pen',
}

// ---------------------------------------------------------------------------

const p = (patch: Record<string, unknown>) => ({ p: patch })

export const genericActions: ActionSpec[] = [
  {
    id: 'cut',
    type: 'button',
    tileTypes: POLY_TYPES,
    label: 'Kes',
    icon: 'cut',
    text: true,
    click: () => setState({ tool: 'cut' }),
  },
  {
    id: 'flip',
    type: 'button',
    tileTypes: [...POLY_TYPES, 'arrow', 'egg', 'garden', 'number-frame'],
    label: 'Yansıt',
    icon: 'flip-h',
    show: (ts) => ts.length > 1 || !!ts[0].rot || !isSymmetric(ts[0]),
    click: (ts, api) => {
      // Seçimin ortasından geçen dikey eksene göre yansıt
      const xs = ts.map((t) => t.x)
      const c = (Math.min(...xs) + Math.max(...xs)) / 2
      for (const t of ts) api.update(t.id, { flip: !t.flip, rot: (360 - t.rot) % 360, x: 2 * c - t.x })
      api.commit()
    },
  },
  { id: 'join', type: 'button', tileTypes: POLY_TYPES, label: 'Birleşim', icon: 'union', location: 'more', order: 100, show: (ts) => ts.length > 1, click: (ts, api) => boolean(ts, api, 'union') },
  { id: 'intersect', type: 'button', tileTypes: POLY_TYPES, label: 'Kesişim', icon: 'intersection', location: 'more', order: 100, show: (ts) => ts.length > 1, click: (ts, api) => boolean(ts, api, 'intersection') },
  { id: 'difference', type: 'button', tileTypes: POLY_TYPES, label: 'Fark', icon: 'difference', location: 'more', order: 100, show: (ts) => ts.length > 1, click: (ts, api) => boolean(ts, api, 'difference') },
  { id: 'xor', type: 'button', tileTypes: POLY_TYPES, label: 'Simetrik fark', icon: 'xor', location: 'more', order: 100, show: (ts) => ts.length > 1, click: (ts, api) => boolean(ts, api, 'xor') },

  // Müzik
  { id: 'play', type: 'button', tileTypes: MUSIC_TYPES, label: 'Çal', icon: 'play', location: 'bar', order: 0, show: () => getState().settings.music, click: (ts) => play(ts) },
  {
    id: 'tempo',
    type: 'input',
    tileTypes: MUSIC_TYPES,
    label: 'Tempo:',
    location: 'music',
    value: 'number',
    range: [0.25, 4],
    step: 0.25,
    show: () => getState().settings.music,
    get: (t) => t.p.tempo ?? 1,
    set: (v: number) => p({ tempo: v }),
  },

  // Yazar modu
  {
    id: 'layer',
    type: 'select',
    tileTypes: 'all',
    label: 'Katman:',
    icon: 'layer-front',
    author: true,
    options: [
      { key: 'front', label: 'En üst' },
      { key: 'normal', label: 'Varsayılan' },
      { key: 'back', label: 'En alt' },
    ],
    get: (t) => t.p.layer ?? 'normal',
    set: (v: string, t) => {
      if (v === 'front') bringToFront([t.id])
      if (v === 'back') sendToBack([t.id])
      return p({ layer: v })
    },
  },
  {
    id: 'interactivity',
    type: 'select',
    tileTypes: 'all',
    label: 'Etkileşim:',
    icon: 'lock',
    author: true,
    options: [
      { key: '', label: 'Normal' },
      { key: 'locked', label: 'Kilitli' },
      { key: 'fixed', label: 'Taşınamaz ve silinemez' },
      { key: 'permanent', label: 'Kopyalanamaz ve silinemez' },
    ],
    get: (t) => t.p.status ?? (t.locked ? 'locked' : ''),
    set: (v: string) => ({ locked: v === 'locked' || v === 'fixed', p: { status: v || undefined } }),
  },
  { id: 'visibility', type: 'checkbox', tileTypes: 'all', label: 'Görünür:', icon: 'eye', author: true, get: (t) => !t.p.hidden, set: (v: boolean) => p({ hidden: !v }) },
  { id: 'rotating', type: 'checkbox', tileTypes: 'all', label: 'Döndürülebilir:', icon: 'geo-angle', author: true, get: (t) => !t.p.cannotRotate, set: (v: boolean) => p({ cannotRotate: !v }) },
  {
    id: 'handles',
    type: 'checkbox',
    tileTypes: ['axes', 'balance', 'fraction-bar', 'fraction-circle', 'decimal-grid', 'multi-jump', 'number-line', 'ten-frame', 'number-tile', 'spinner', 'custom-spinner', 'box-whisker', 'chart', 'pie-chart', 'table', 'rectangle', 'reg-polygon', 'custom-polygon', 'circle', 'arrow', 'text', 'hand-tile', 'function-machine'],
    label: 'Tutamakları göster:',
    icon: 'handles',
    author: true,
    get: (t) => !t.p.hideHandles,
    set: (v: boolean) => p({ hideHandles: !v }),
  },
  { id: 'altText', type: 'input', tileTypes: 'all', label: 'Alternatif metin:', icon: 'accessibility', author: true, value: 'text', get: (t) => t.p.altText ?? '', set: (v: string) => p({ altText: v || undefined }) },

  // Her zaman çubuğun sonunda
  {
    id: 'copy',
    type: 'button',
    tileTypes: 'all',
    label: 'Kopyala',
    icon: 'copy',
    location: 'bar',
    show: (ts) => getState().settings.copy && ts.every((t) => t.p.status !== 'permanent'),
    click: (ts) => duplicate(ts.map((t) => t.id)),
  },
  {
    id: 'delete',
    type: 'button',
    tileTypes: 'all',
    label: 'Sil',
    icon: 'delete',
    location: 'bar',
    show: (ts) => getState().settings.del && ts.every((t) => t.p.status !== 'fixed' && t.p.status !== 'permanent'),
    click: (ts) => {
      removeTiles(ts.map((t) => t.id))
      commit()
    },
  },
  {
    id: 'help',
    type: 'button',
    tileTypes: 'all',
    label: 'Yardım',
    icon: 'help',
    location: 'bar',
    click: (ts) => setState({ tab: 'help', helpTopic: HELP[ts[0].type] ?? 'intro', sidebarOpen: true }),
  },
]

/** Parçaya özel eylemler önce, ortak eylemler sonra */
export const ALL_ACTIONS: ActionSpec[] = [...tileActions, ...genericActions]

/** Eylem sırası (Polypad): müzik +1000, yazar +2000, çubuğa sabit +3000 */
export const actionOrder = (a: ActionSpec, i: number) => (a.author ? 2000 : a.location === 'music' ? 1000 : a.location === 'bar' ? 3000 : 0) + (a.order ?? i)

/** Bir eylem değerini seçili parçalara uygular ve geri alınabilir adım oluşturur */
export function applyAction(a: ActionSpec, ids: string[], value: unknown, api: PadApi, doCommit = true) {
  updateTiles(ids, (t) => {
    const patch = a.set?.(value as never, t, api)
    if (!patch) return null
    return { ...patch, p: patch.p ? { ...t.p, ...patch.p } : t.p }
  })
  if (doCommit) commit()
}

