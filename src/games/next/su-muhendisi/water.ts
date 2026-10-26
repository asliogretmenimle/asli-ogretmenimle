/**
 * Su Mühendisi — ortak model.
 * Tüm miktarlar tamsayı "birim" (u) cinsindendir: 1 L = 6000 u.
 * Böylece ½, ⅓, ¼, ⅕, ⅙, ⅛, ⅒, 1 mL (6 u) ve %1 (60 u/L) hepsi tamsayı kalır.
 */

export const U = 6000
export const L = (n: number) => Math.round(n * U)
export const ML = (n: number) => Math.round((n * U) / 1000)

export type VesselKind = 'tank' | 'jug' | 'bucket' | 'bottle' | 'cup'

/** Bir kabın çizgileri: div eş parça; label(k) çizginin yanında yazacak metin (k = 1..div) */
export interface Marks {
  div: number
  /** Hangi çizgilerde etiket yazılsın: 'all' | 'ends' | k listesi */
  labels?: 'all' | 'none' | 'last' | number[]
  /** Etiket biçimi */
  fmt?: 'L' | 'mL' | 'frac' | 'pct' | 'dec'
}

export interface VesselDef {
  id: string
  name: string
  cap: number
  amt: number
  kind: VesselKind
  /** Plaka rengi */
  color?: string
  marks?: Marks
  /** Musluk var mı (musluktan doldurulabilir) */
  tap?: boolean
  /** Plakada kapasite yerine yazılacak metin */
  plate?: string
  /** Plakanın altında ikinci satır */
  note?: string
  /** Görsel boyut çarpanı (küçük ölçü kapları için) */
  scale?: number
}

export type UnitMode = 'L' | 'mL' | 'frac' | 'dec'

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const simplify = (n: number, d: number): [number, number] => {
  const g = gcd(n, d) || 1
  return [n / g, d / g]
}

/** 1.500 gibi binlik ayraçlı yazım */
export const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Ondalık litre: 1,25 */
export const decStr = (n: number, max = 2) => {
  const s = (Math.round(n * 10 ** max) / 10 ** max).toFixed(max).replace(/\.?0+$/, '')
  return s.replace('.', ',')
}

/** Miktarı litre kesri olarak (MathText biçimi): [[1 1/4]] */
export function fracL(u: number): string {
  if (u === 0) return '0'
  for (const d of [1, 2, 3, 4, 5, 6, 8, 10, 12, 100, 1000]) {
    const n = (u * d) / U
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      const num = Math.round(n)
      if (d === 1) return String(num)
      const w = Math.floor(num / d), r = num % d
      if (!r) return String(w)
      return w ? `[[${w} ${r}/${d}]]` : `[[${r}/${d}]]`
    }
  }
  return decStr(u / U)
}

/** Miktarı seçilen birimle yaz (birim ekiyle) */
export function fmt(u: number, mode: UnitMode): string {
  switch (mode) {
    case 'mL':
      return `${thousands(Math.round((u * 1000) / U))} mL`
    case 'dec':
      return `${decStr(u / U)} L`
    case 'frac':
      return `${fracL(u)} L`
    default: {
      // L: tam ya da yarım ise kesirli, değilse ondalık
      return `${fracL(u)} L`
    }
  }
}

/** Çizgi etiketi */
export function markLabel(k: number, div: number, cap: number, f: Marks['fmt']): string {
  const u = (cap * k) / div
  switch (f) {
    case 'mL':
      return thousands(Math.round((u * 1000) / U))
    case 'pct':
      return `%${Math.round((100 * k) / div)}`
    case 'dec':
      return decStr(u / U)
    case 'frac': {
      if (k === div) return '1'
      const [n, d] = simplify(k, div)
      return `${n}/${d}`
    }
    default:
      return fracL(u).replace(/\[\[(\d+) (\d+)\/(\d+)\]\]/, '$1 $2/$3').replace(/\[\[(\d+)\/(\d+)\]\]/, '$1/$2')
  }
}

/* ───────────── Kap aktarma bulmacası ───────────── */

export type Move = { t: 'fill'; i: number } | { t: 'empty'; i: number } | { t: 'pour'; i: number; j: number }

export function applyMove(caps: number[], s: number[], m: Move): number[] {
  const n = [...s]
  if (m.t === 'fill') n[m.i] = caps[m.i]
  else if (m.t === 'empty') n[m.i] = 0
  else {
    const q = Math.min(s[m.i], caps[m.j] - s[m.j])
    n[m.i] -= q
    n[m.j] += q
  }
  return n
}

/** En az adım sayısı (genişlik öncelikli arama) */
export function shortest(caps: number[], start: number[], tap: boolean[], drain: boolean, goal: (s: number[]) => boolean): number {
  const seen = new Set([start.join()])
  let frontier = [start]
  for (let d = 0; d < 40; d++) {
    if (frontier.some(goal)) return d
    const next: number[][] = []
    for (const s of frontier) {
      const ms: Move[] = []
      for (let i = 0; i < caps.length; i++) {
        if (tap[i] && s[i] < caps[i]) ms.push({ t: 'fill', i })
        if (drain && s[i] > 0) ms.push({ t: 'empty', i })
        for (let j = 0; j < caps.length; j++) if (i !== j && s[i] > 0 && s[j] < caps[j]) ms.push({ t: 'pour', i, j })
      }
      for (const m of ms) {
        const t = applyMove(caps, s, m)
        const k = t.join()
        if (!seen.has(k)) {
          seen.add(k)
          next.push(t)
        }
      }
    }
    frontier = next
  }
  return Infinity
}

/**
 * Çözüm anahtarı: durum yolundaki döngüler atılır, geriye kalan kaplar arası aktarmaların sırası alınır.
 * Böylece boşuna doldur-boşalt hamleleri yeni bir "yol" sayılmaz; farklı aktarma planları sayılır.
 */
export function solutionKey(states: number[][], moves: Move[]): string {
  // states[0] başlangıç, states[k+1] = moves[k] sonrası
  const keep: number[] = [] // korunacak hamle indisleri
  const pos = new Map<string, number>() // durum → keep içindeki uzunluk
  pos.set(states[0].join(), 0)
  for (let k = 0; k < moves.length; k++) {
    const s = states[k + 1].join()
    keep.push(k)
    if (pos.has(s)) {
      const len = pos.get(s)!
      keep.length = len
      // len'den sonraki durumların kayıtlarını sil
      for (const [key, v] of [...pos]) if (v > len) pos.delete(key)
    } else pos.set(s, keep.length)
  }
  const pours = keep.map((k) => moves[k]).filter((m): m is Extract<Move, { t: 'pour' }> => m.t === 'pour')
  return pours.map((m) => `${m.i}>${m.j}`).join(',') || 'direct'
}

/** Kesir eşitliği */
export const sameFrac = (a: [number, number], b: [number, number]) => a[0] * b[1] === a[1] * b[0]
