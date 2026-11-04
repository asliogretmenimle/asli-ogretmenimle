import { useSyncExternalStore } from 'react'
import type { Box, PadApi, Props, Pt, SoundKind, Tile } from './types'
import { boundsOf, boxCorners, pointInPolygon, toLocal, toWorld, uid } from './geom'
import { getDef } from './tiles'
import { playNote, playSound } from './sound'
import { celebrate } from '../lib/feedback'

export type Tool =
  | 'move'
  | 'pan'
  | 'pen:pen'
  | 'pen:marker'
  | 'pen:highlighter'
  | 'pen:eraser'
  | 'line:straight'
  | 'line:curved'
  | 'line:custom'
  | 'geo:point'
  | 'geo:line'
  | 'geo:circle'
  | 'geo:rect'
  | 'geo:angle'
  | 'text:text'
  | 'text:equation'

export type GridId = 'none' | 'square2-grid' | 'square-checked' | 'square-dots' | 'tri-dots' | 'tri2-dots' | 'square-grid' | 'tri-grid' | 'tri2-grid'

export interface Settings {
  showSidebar: boolean
  sidebarStartsOpen: boolean
  fullscreen: boolean
  undo: boolean
  reset: boolean
  grid: boolean
  download: boolean
  pinch: boolean
  initialViewport: boolean
  largeUi: boolean
  advancedColors: boolean
  drawing: 'default' | 'limited' | 'colored'
  actionbar: 'custom' | 'always' | 'never'
  copy: boolean
  del: boolean
  rotate: boolean
  snap: boolean
  music: boolean
  merge: boolean
  sound: boolean
  confetti: boolean
  altColors: boolean
  contrast: boolean
  handdrawn: boolean
}

export const defaultSettings: Settings = {
  showSidebar: true,
  sidebarStartsOpen: true,
  fullscreen: true,
  undo: true,
  reset: true,
  grid: true,
  download: true,
  pinch: true,
  initialViewport: false,
  largeUi: false,
  advancedColors: true,
  drawing: 'default',
  actionbar: 'custom',
  copy: true,
  del: true,
  rotate: true,
  snap: true,
  music: true,
  merge: true,
  sound: true,
  confetti: true,
  altColors: false,
  contrast: false,
  handdrawn: false,
}

export interface View {
  x: number
  y: number
  z: number
}

export type SidebarTab = 'tiles' | 'settings' | 'library' | 'help'

export interface State {
  tiles: Tile[]
  sel: string[]
  tool: Tool
  /** Renk seçicinin rengi; kalem, çizgi ve yeni şekiller bunu kullanır */
  color: string
  /** 0 varsayılan, 1 ince, 2 orta, 3 kalın */
  strokeWidth: 0 | 1 | 2 | 3
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  view: View
  grid: GridId
  bg: string
  canvasSize: 'infinite' | 'fixed' | 'notebook'
  canvasW: number
  canvasH: number
  authoring: boolean
  hidden: string[]
  settings: Settings
  sidebarOpen: boolean
  tab: SidebarTab
  helpTopic: string
  past: Tile[][]
  future: Tile[][]
  committed: Tile[]
  /** Metni düzenlenen parça */
  editing: string | null
  /** Ekrandaki uygulama içi istem penceresi */
  ask: { label: string; value: string; resolve: (v: string | null) => void } | null
  /** Kaydırma aracı: tuvalde boş alana dokunmak kaydırır */
  recording: boolean
}

const STORAGE_KEY = 'ao-tuval-v1'
const HISTORY_MAX = 100

type Saved = Pick<State, 'tiles' | 'grid' | 'bg' | 'view' | 'settings' | 'canvasSize' | 'canvasW' | 'canvasH' | 'authoring' | 'hidden' | 'color'>

function load(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const s = JSON.parse(raw) as Partial<Saved>
    return { ...s, tiles: (s.tiles ?? []).filter((t) => getDef(t.type)), settings: { ...defaultSettings, ...s.settings } }
  } catch {
    return {}
  }
}

const saved = typeof window === 'undefined' ? {} : load()

let state: State = {
  tiles: saved.tiles ?? [],
  sel: [],
  tool: 'move',
  color: saved.color ?? '#242436',
  strokeWidth: 2,
  strokeStyle: 'solid',
  view: saved.view ?? { x: 0, y: 0, z: 1 },
  grid: saved.grid ?? 'none',
  bg: saved.bg ?? '#ffffff',
  canvasSize: saved.canvasSize ?? 'infinite',
  canvasW: saved.canvasW ?? 30,
  canvasH: saved.canvasH ?? 20,
  authoring: saved.authoring ?? false,
  hidden: saved.hidden ?? [],
  settings: saved.settings ?? defaultSettings,
  sidebarOpen: (saved.settings ?? defaultSettings).sidebarStartsOpen && (typeof window === 'undefined' || window.innerWidth >= 700),
  tab: 'tiles',
  helpTopic: 'intro',
  past: [],
  future: [],
  committed: saved.tiles ?? [],
  editing: null,
  ask: null,
  recording: false,
}

const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const getState = () => state

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  listeners.forEach((l) => l())
  if ('tiles' in next || 'grid' in next || 'bg' in next || 'view' in next || 'settings' in next || 'canvasSize' in next || 'hidden' in next || 'authoring' in next) scheduleSave()
}

/** Seçici sabit bir değer (ilkel ya da mevcut nesne referansı) döndürmelidir */
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state))
}

let saveTimer = 0
function scheduleSave() {
  if (typeof window === 'undefined') return
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    const s = state
    const data: Saved = {
      tiles: s.tiles,
      grid: s.grid,
      bg: s.bg,
      view: s.view,
      settings: s.settings,
      canvasSize: s.canvasSize,
      canvasW: s.canvasW,
      canvasH: s.canvasH,
      authoring: s.authoring,
      hidden: s.hidden,
      color: s.color,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* depolama dolu ya da kapalı */
    }
  }, 500)
}

// ---------------------------------------------------------------------------
// Geçmiş (geri al / yinele)
// ---------------------------------------------------------------------------

export function commit() {
  const s = state
  if (s.tiles === s.committed) return
  setState({ past: [...s.past.slice(-HISTORY_MAX + 1), s.committed], future: [], committed: s.tiles })
}

export function undo() {
  commit()
  const s = state
  if (!s.past.length) return
  const prev = s.past[s.past.length - 1]
  setState({ tiles: prev, committed: prev, past: s.past.slice(0, -1), future: [...s.future, s.tiles], sel: s.sel.filter((id) => prev.some((t) => t.id === id)), editing: null })
}

export function redo() {
  const s = state
  if (!s.future.length) return
  const next = s.future[s.future.length - 1]
  setState({ tiles: next, committed: next, future: s.future.slice(0, -1), past: [...s.past, s.tiles], sel: s.sel.filter((id) => next.some((t) => t.id === id)), editing: null })
}

// ---------------------------------------------------------------------------
// Parça işlemleri
// ---------------------------------------------------------------------------

/** Değişen parçalara bağlı parçaları (bağlı çizgiler) günceller */
function applyFollow(tiles: Tile[], changed: Set<string>): Tile[] {
  if (!changed.size) return tiles
  let out: Tile[] | null = null
  const byId = new Map(tiles.map((t) => [t.id, t]))
  const get = (id: string) => byId.get(id)
  tiles.forEach((t, i) => {
    const def = getDef(t.type)
    if (!def?.follow || !def.deps) return
    if (!def.deps(t).some((d) => changed.has(d))) return
    const patch = def.follow(t, get)
    if (!patch) return
    out ??= tiles.slice()
    const nt = { ...t, ...patch }
    out[i] = nt
    byId.set(t.id, nt)
  })
  return out ?? tiles
}

export function updateTiles(ids: string[] | Set<string>, fn: (t: Tile) => Partial<Tile> | null) {
  const set = ids instanceof Set ? ids : new Set(ids)
  const changed = new Set<string>()
  const tiles = state.tiles.map((t) => {
    if (!set.has(t.id)) return t
    const patch = fn(t)
    if (!patch) return t
    changed.add(t.id)
    return { ...t, ...patch }
  })
  if (!changed.size) return
  setState({ tiles: applyFollow(tiles, changed) })
}

export function updateTile(id: string, patch: Partial<Tile> | ((t: Tile) => Partial<Tile>)) {
  updateTiles([id], (t) => (typeof patch === 'function' ? patch(t) : patch))
}

export function makeTile(type: string, props: Props = {}, x = 0, y = 0): Tile {
  const def = getDef(type)
  const { rot, ...rest } = props
  const base: Tile = { id: uid(), type, x, y, rot: typeof rot === 'number' ? rot : 0, p: { ...rest } }
  const extra = def?.create?.(rest) ?? {}
  return { ...base, ...extra, p: { ...base.p, ...(extra.p ?? {}) }, rot: extra.rot ?? base.rot }
}

export function addTiles(tiles: Omit<Tile, 'id'>[], select = true): string[] {
  const withIds = tiles.map((t) => ({ ...t, id: uid() }) as Tile)
  setState((s) => ({ tiles: [...s.tiles, ...withIds], sel: select ? withIds.map((t) => t.id) : s.sel }))
  return withIds.map((t) => t.id)
}

export function removeTiles(ids: string[]) {
  const set = new Set(ids)
  setState((s) => ({ tiles: applyFollow(s.tiles.filter((t) => !set.has(t.id)), set), sel: s.sel.filter((id) => !set.has(id)), editing: set.has(s.editing ?? '') ? null : s.editing }))
}

export function select(ids: string[]) {
  setState({ sel: ids })
}

export function bringToFront(ids: string[]) {
  const set = new Set(ids)
  setState((s) => ({ tiles: [...s.tiles.filter((t) => !set.has(t.id)), ...s.tiles.filter((t) => set.has(t.id))] }))
}

export function sendToBack(ids: string[]) {
  const set = new Set(ids)
  setState((s) => ({ tiles: [...s.tiles.filter((t) => set.has(t.id)), ...s.tiles.filter((t) => !set.has(t.id))] }))
}

/** Parçanın dünya koordinatındaki sınır kutusu */
export function worldBox(t: Tile): Box {
  const def = getDef(t.type)
  if (!def) return { x: t.x, y: t.y, w: 0, h: 0 }
  return boundsOf(boxCorners(def.bounds(t)).map((p) => toWorld(t, p)))
}

export function selectionBox(ids: string[]): Box | null {
  const set = new Set(ids)
  const pts = state.tiles.filter((t) => set.has(t.id)).flatMap((t) => boxCorners(worldBox(t)))
  return pts.length ? boundsOf(pts) : null
}

let clipboard: Tile[] = []

export function copySelection() {
  const set = new Set(state.sel)
  clipboard = state.tiles.filter((t) => set.has(t.id))
}

export function paste(offset = 24) {
  if (!clipboard.length) return
  const map = new Map<string, string>()
  const copies = clipboard.map((t) => {
    const id = uid()
    map.set(t.id, id)
    return { ...t, id, x: t.x + offset, y: t.y + offset, locked: false }
  })
  // Kopyalanan çizgiler kopyalanan parçalara bağlansın
  const fixed = copies.map((t) => (t.p.links ? { ...t, p: { ...t.p, links: relink(t.p.links, map) } } : t))
  setState((s) => ({ tiles: [...s.tiles, ...fixed], sel: fixed.map((t) => t.id) }))
  clipboard = clipboard.map((t) => ({ ...t, x: t.x + offset, y: t.y + offset }))
  commit()
}

function relink(links: Record<string, string | null>, map: Map<string, string>) {
  return Object.fromEntries(Object.entries(links).map(([k, v]) => [k, v ? (map.get(v) ?? null) : null]))
}

export function duplicate(ids: string[]) {
  const prev = clipboard
  const set = new Set(ids)
  clipboard = state.tiles.filter((t) => set.has(t.id))
  paste()
  clipboard = prev
}

export function clearCanvas() {
  setState({ tiles: [], sel: [], editing: null })
  commit()
}

// ---------------------------------------------------------------------------
// Görünüm
// ---------------------------------------------------------------------------

export const MIN_Z = 0.2
export const MAX_Z = 5

export function zoomAt(factor: number, sx: number, sy: number) {
  const v = state.view
  const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z * factor))
  const k = z / v.z
  setState({ view: { z, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k } })
}

export const screenToWorld = (sx: number, sy: number, v = state.view) => ({ x: (sx - v.x) / v.z, y: (sy - v.y) / v.z })
export const worldToScreen = (wx: number, wy: number, v = state.view) => ({ x: wx * v.z + v.x, y: wy * v.z + v.y })

/** Tuval elemanının boyutu (Canvas bileşeni günceller) */
export const viewport = { w: 1024, h: 768, left: 0, top: 0 }

export function resetView() {
  const tiles = state.tiles
  if (!tiles.length) {
    setState({ view: { x: viewport.w / 2, y: viewport.h / 2, z: 1 } })
    return
  }
  const b = boundsOf(tiles.flatMap((t) => boxCorners(worldBox(t))))
  const m = 80
  const z = Math.min(1.5, Math.max(MIN_Z, Math.min((viewport.w - m * 2) / Math.max(b.w, 1), (viewport.h - m * 2) / Math.max(b.h, 1))))
  setState({ view: { z, x: viewport.w / 2 - (b.x + b.w / 2) * z, y: viewport.h / 2 - (b.y + b.h / 2) * z } })
}

/** Görünen alanın ortası (dünya koordinatı) */
export const viewCenter = () => screenToWorld(viewport.w / 2, viewport.h / 2)

// ---------------------------------------------------------------------------
// Parçalara verilen arayüz
// ---------------------------------------------------------------------------

export function askText(label: string, value: string): Promise<string | null> {
  return new Promise((resolve) => setState({ ask: { label, value, resolve } }))
}

export const sound = (k: SoundKind) => {
  if (state.settings.sound) playSound(k)
}

export const api: PadApi = {
  get: (id) => state.tiles.find((t) => t.id === id),
  all: () => state.tiles,
  update: (id, patch, c) => {
    updateTile(id, patch)
    if (c) commit()
  },
  updateP: (id, patch, c) => {
    updateTile(id, (t) => ({ p: { ...t.p, ...(typeof patch === 'function' ? patch(t.p) : patch) } }))
    if (c) commit()
  },
  add: (tiles, sel) => {
    const ids = addTiles(tiles, sel)
    commit()
    return ids
  },
  remove: (ids) => {
    removeTiles(ids)
    commit()
  },
  select,
  commit,
  sound,
  note: (f, d, w) => {
    if (state.settings.sound || state.settings.music) playNote(f, d, w)
  },
  confetti: () => {
    if (state.settings.confetti) celebrate(true)
  },
  prompt: askText,
  color: () => state.color,
  tileAt: (w, exclude = []) => tileAt(w, exclude),
  box: worldBox,
}

/** Dünya noktasındaki en üstteki parça (önce gerçek çokgen sınırı, yoksa kutu) */
export function tileAt(w: Pt, exclude: string[] = []): Tile | undefined {
  const ex = new Set(exclude)
  for (let i = state.tiles.length - 1; i >= 0; i--) {
    const t = state.tiles[i]
    if (ex.has(t.id)) continue
    const def = getDef(t.type)
    if (!def) continue
    const l = toLocal(t, w)
    const ol = def.outline?.(t)
    if (ol ? pointInPolygon(l, ol) : inBox(l, def.bounds(t))) return t
  }
  return undefined
}

const inBox = (p: Pt, b: Box) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
