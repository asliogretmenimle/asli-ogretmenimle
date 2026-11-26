/**
 * Eş küplerle kurulan yapılar: yükseklik haritası ve görünümler.
 *  - h[d][x]: x = soldan sağa (0…W−1), d = önden arkaya (0 = en ön sıra). Değer o kuledeki küp sayısı.
 *  - Küpler yer çekimiyle durur (havada küp yok): bir sütundaki küpler alttan üste dizilir.
 *  - Görünümler kareli kâğıda çizilen resimlerdir: satırlar yukarıdan aşağıya, sütunlar soldan sağa.
 *      önden  → sütun x (sol→sağ), yükseklik = o sütundaki en yüksek kule
 *      sağdan → sütun d (ön→arka, sağdan bakan için ön solda kalır), yükseklik = o sıradaki en yüksek kule
 *      üstten → satır d (arka üstte, ön altta), sütun x; kule varsa kare dolu
 */

export type HMap = number[][]
export type Grid = boolean[][]
export type ViewKind = 'on' | 'sag' | 'ust' | 'sol' | 'arka'

export const VIEW_LABEL: Record<ViewKind, string> = { on: 'Önden', sag: 'Sağdan', ust: 'Üstten', sol: 'Soldan', arka: 'Arkadan' }
export const VIEW_COLOR: Record<ViewKind, string> = { on: '#2563eb', sag: '#ea580c', ust: '#16a34a', sol: '#9333ea', arka: '#0891b2' }

/** Yukarıdan bakar gibi yazılmış harita (ilk satır = arka sıra) → h[d][x] */
export const fromTop = (rows: number[][]): HMap => rows.map((r) => [...r]).reverse()
export const emptyMap = (W: number, D: number): HMap => Array.from({ length: D }, () => Array(W).fill(0) as number[])
export const cloneMap = (h: HMap): HMap => h.map((r) => [...r])
export const dims = (h: HMap) => ({ W: h[0]?.length ?? 0, D: h.length, H: Math.max(0, ...h.flat()) })
export const count = (h: HMap) => h.flat().reduce((s, v) => s + v, 0)

/** Haritayı W × D alanın ortasına (önde, solda hizalı değil, ortalı) yerleştirir */
export function place(h: HMap, W: number, D: number): HMap {
  const out = emptyMap(W, D)
  const ox = Math.floor((W - h[0].length) / 2)
  const od = Math.floor((D - h.length) / 2)
  h.forEach((row, d) => row.forEach((v, x) => (out[d + od][x + ox] = v)))
  return out
}

export function frontHeights(h: HMap) {
  const { W } = dims(h)
  return Array.from({ length: W }, (_, x) => Math.max(0, ...h.map((r) => r[x])))
}
export function sideHeights(h: HMap) {
  return h.map((r) => Math.max(0, ...r))
}

function columns(heights: number[], H: number): Grid {
  return Array.from({ length: H }, (_, r) => heights.map((v) => v > H - 1 - r))
}

export function view(h: HMap, k: ViewKind): Grid {
  const { H } = dims(h)
  if (k === 'on') return columns(frontHeights(h), H)
  if (k === 'arka') return columns([...frontHeights(h)].reverse(), H)
  if (k === 'sag') return columns(sideHeights(h), H)
  if (k === 'sol') return columns([...sideHeights(h)].reverse(), H)
  return [...h].reverse().map((r) => r.map((v) => v > 0))
}

/** Boş kenarları kırpar (kareli kâğıtta resmin yeri önemli değil, biçimi önemli) */
export function crop(g: Grid): Grid {
  const rows = g.map((r, i) => (r.some(Boolean) ? i : -1)).filter((i) => i >= 0)
  const cols = (g[0] ?? []).map((_, j) => (g.some((r) => r[j]) ? j : -1)).filter((j) => j >= 0)
  if (!rows.length) return []
  const [r0, r1, c0, c1] = [rows[0], rows[rows.length - 1], cols[0], cols[cols.length - 1]]
  return g.slice(r0, r1 + 1).map((r) => r.slice(c0, c1 + 1))
}
export const key = (g: Grid) => crop(g).map((r) => r.map((v) => (v ? '#' : '.')).join('')).join('/')
export const sameView = (a: Grid, b: Grid) => key(a) === key(b)
export const cellsOf = (g: Grid) => g.flat().filter(Boolean).length

/** Kareli kâğıt boyutunda boş ızgara */
export const blank = (rows: number, cols: number): Grid => Array.from({ length: rows }, () => Array(cols).fill(false) as boolean[])

/**
 * Bu yapının ön, sağ ve üst görünümlerine sahip bütün yapılar arasında en az ve en çok küp sayısı.
 * Üst görünüm hangi kulelerin dolu olduğunu sabitler; her kule 1 ile min(ön, sağ) arasında olabilir;
 * her sütunda ve her sırada en yüksek kule görünümdeki boya ulaşmalı. Küçük yapılar için tam tarama.
 */
export function minMax(h: HMap) {
  const F = frontHeights(h)
  const R = sideHeights(h)
  const cells: { x: number; d: number; cap: number }[] = []
  h.forEach((row, d) => row.forEach((v, x) => v > 0 && cells.push({ x, d, cap: Math.min(F[x], R[d]) })))
  let min = Infinity
  let max = 0
  const cur = cells.map(() => 1)
  const ok = () => {
    const f = F.map(() => 0)
    const r = R.map(() => 0)
    cells.forEach((c, i) => {
      f[c.x] = Math.max(f[c.x], cur[i])
      r[c.d] = Math.max(r[c.d], cur[i])
    })
    return f.every((v, i) => v === F[i]) && r.every((v, i) => v === R[i])
  }
  const go = (i: number, sum: number) => {
    if (i === cells.length) {
      if (ok()) {
        min = Math.min(min, sum)
        max = Math.max(max, sum)
      }
      return
    }
    for (let v = 1; v <= cells[i].cap; v++) {
      cur[i] = v
      go(i + 1, sum + v)
    }
  }
  go(0, 0)
  return { min, max }
}

/** Bir küp eklendiğinde/çıkarıldığında hangi görünümler değişti? */
export function changedViews(a: HMap, b: HMap, kinds: ViewKind[] = ['on', 'sag', 'ust']) {
  return kinds.filter((k) => !sameView(view(a, k), view(b, k)))
}

/* ───────────── hazır yapılar (yukarıdan bakar gibi yazıldı: ilk satır arka) ───────────── */

export const INSPECT: HMap[] = [
  fromTop([[2, 1, 0], [1, 0, 0], [3, 1, 1]]),
  fromTop([[0, 1, 2], [1, 1, 3], [0, 0, 1]]),
  fromTop([[1, 2, 1], [0, 3, 0], [0, 1, 0]]),
]

export const DRAW: HMap[] = [
  fromTop([[2, 0, 1], [2, 1, 1], [1, 0, 0]]),
  fromTop([[3, 1], [2, 1], [1, 0]]),
  fromTop([[1, 0, 0], [3, 2, 1], [1, 0, 1]]),
  fromTop([[0, 2, 0], [1, 3, 1], [0, 1, 1]]),
]

export const BUILD: HMap[] = [
  fromTop([[2, 1], [1, 0]]),
  fromTop([[1, 1, 2], [0, 1, 0]]),
  fromTop([[0, 1, 0], [1, 3, 1], [0, 1, 0]]),
  fromTop([[2, 1, 1], [1, 0, 0], [1, 0, 0]]),
]

/** “Görünüm dedektifi” başlangıç yapısı: içinde hiçbir görünüme yansımayan bir boşluk var */
export const DETECTIVE: HMap = fromTop([[2, 1, 3], [1, 1, 1], [3, 1, 2]])

/** En az / en çok küp: görünümleri verilen yapılar */
export const MINMAX: HMap[] = [
  fromTop([[1, 2], [2, 1]]),
  fromTop([[1, 1, 3], [1, 1, 1], [2, 1, 1]]),
]
