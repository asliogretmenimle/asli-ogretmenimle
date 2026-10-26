import type { Grade } from '../../data/types'

/**
 * Cebir Karoları — model.
 * Karo: x (uzun dikdörtgen) ya da 1 (kare); pozitif (renkli) ya da negatif (kırmızı).
 * Sayım: [x, −x, 1, −1] adetleri.
 */

export type Kind = 'x' | '1'
export type Tile = { id: number; k: Kind; neg: boolean; g?: number }
export type Counts = [number, number, number, number]
export type SideId = 'L' | 'R' | 'E'

let uid = 1
export const newId = () => uid++

export function makeTiles(c: Counts, g?: number): Tile[] {
  const out: Tile[] = []
  const push = (k: Kind, neg: boolean, n: number) => {
    for (let i = 0; i < n; i++) out.push({ id: newId(), k, neg, g })
  }
  push('x', false, c[0])
  push('x', true, c[1])
  push('1', false, c[2])
  push('1', true, c[3])
  return out
}

export const countsOf = (ts: Tile[]): Counts => [
  ts.filter((t) => t.k === 'x' && !t.neg).length,
  ts.filter((t) => t.k === 'x' && t.neg).length,
  ts.filter((t) => t.k === '1' && !t.neg).length,
  ts.filter((t) => t.k === '1' && t.neg).length,
]

/** Net katsayılar: ax + b */
export const netOf = (ts: Tile[]) => {
  const c = countsOf(ts)
  return { a: c[0] - c[1], b: c[2] - c[3] }
}

export const valueOf = (ts: Tile[], xv: number) => {
  const n = netOf(ts)
  return n.a * xv + n.b
}

export const hasZeroPair = (ts: Tile[]) => {
  const c = countsOf(ts)
  return (c[0] > 0 && c[1] > 0) || (c[2] > 0 && c[3] > 0)
}

/** "2x + 3", "−x − 2", "0" */
export function fmtNet(a: number, b: number) {
  const parts: string[] = []
  if (a !== 0) {
    const body = Math.abs(a) === 1 ? 'x' : `${Math.abs(a)}x`
    parts.push(a < 0 ? `−${body}` : body)
  }
  if (b !== 0) {
    if (!parts.length) parts.push(b < 0 ? `−${-b}` : String(b))
    else parts.push(b < 0 ? `− ${-b}` : `+ ${b}`)
  }
  return parts.join(' ') || '0'
}

/** Karoların ham yazımı (sıfır çiftleri görünür): "x − x + 3 − 3" */
export function fmtRaw(ts: Tile[]) {
  const [px, nx, p1, n1] = countsOf(ts)
  const parts: string[] = []
  const add = (s: string, neg: boolean) => parts.push(parts.length === 0 ? (neg ? `−${s}` : s) : neg ? `− ${s}` : `+ ${s}`)
  if (px) add(px === 1 ? 'x' : `${px}x`, false)
  if (nx) add(nx === 1 ? 'x' : `${nx}x`, true)
  if (p1) add(String(p1), false)
  if (n1) add(String(n1), true)
  return parts.join(' ') || '0'
}

/** Yerine koyma metni: "2 · 4 + 3" */
export function fmtSubst(a: number, b: number, v: number) {
  const vs = v < 0 ? `(−${-v})` : String(v)
  const parts: string[] = []
  if (a !== 0) {
    const body = Math.abs(a) === 1 ? vs : `${Math.abs(a)} · ${vs}`
    parts.push(a < 0 ? `−${body}` : body)
  }
  if (b !== 0) {
    if (!parts.length) parts.push(b < 0 ? `−${-b}` : String(b))
    else parts.push(b < 0 ? `− ${-b}` : `+ ${b}`)
  }
  return parts.join(' ') || '0'
}

export const signed = (v: number) => String(v).replace('-', '−')

/* ───────────── görevler ───────────── */

export type BuildT = { kind: 'build'; title: string; a: number; b: number; multi?: boolean }
export type SimplifyT = { kind: 'simplify'; title: string; prompt: string; groups: { label: string; c: Counts }[] }
export type EvalT = { kind: 'evaluate'; title: string; a: number; b: number; v: number }
export type MulT = { kind: 'multiply'; title: string; k: number; a: number; b: number }
export type EqT = { kind: 'equation'; title: string; L: Counts; R: Counts; xv: number; multi?: boolean; story?: string }
export type JudgeT = { kind: 'judge'; title: string; L: Counts; R: Counts; claims: { who: string; v: number }[] }
export type Task = BuildT | SimplifyT | EvalT | MulT | EqT | JudgeT

export function makeTasks(grade: Grade): Task[] {
  if (grade === 6)
    return [
      { kind: 'build', title: 'İfadeyi karolarla kur', a: 2, b: 3 },
      { kind: 'simplify', title: 'Benzer karoları topla', prompt: 'Mattaki karolar x + 2 + 2x + 1 ifadesini gösteriyor. Benzer karoları bir araya getir ve ifadeyi daha kısa yaz.', groups: [{ label: 'x + 2', c: [1, 0, 2, 0] }, { label: '2x + 1', c: [2, 0, 1, 0] }] },
      { kind: 'evaluate', title: 'x’e değer ver', a: 3, b: 2, v: 4 },
      { kind: 'equation', title: 'Karolarla denklem', L: [2, 0, 3, 0], R: [0, 0, 11, 0], xv: 4 },
      { kind: 'equation', title: 'İki tarafta x', L: [3, 0, 1, 0], R: [1, 0, 9, 0], xv: 4, multi: true },
    ]
  if (grade === 7)
    return [
      { kind: 'simplify', title: 'Sıfır çiftleri', prompt: 'Mattaki karolar 3x + 2 − x − 5 ifadesini gösteriyor. Sıfır çiftlerini kaldır ve ifadeyi sadeleştir.', groups: [{ label: '3x + 2 − x − 5', c: [3, 1, 2, 5] }] },
      { kind: 'simplify', title: 'İfadeleri topla', prompt: '(2x − 3) + (−x + 5) toplamını bul. İki ifadenin karoları aynı matta.', groups: [{ label: '2x − 3', c: [2, 0, 0, 3] }, { label: '−x + 5', c: [0, 1, 5, 0] }] },
      { kind: 'multiply', title: 'Bir sayıyla çarp', k: 3, a: 1, b: -2 },
      { kind: 'equation', title: 'Negatif karolar', L: [1, 0, 0, 3], R: [0, 0, 5, 0], xv: 8, story: 'Sol tarafta x’in yanında 3 tane −1 var. x’i yalnız bırakmak için sıfır çiftlerinden yararlanabilirsin.' },
      { kind: 'equation', title: 'İki tarafta x', L: [3, 0, 0, 2], R: [1, 0, 6, 0], xv: 4, multi: true },
    ]
  return [
    { kind: 'build', title: 'Aynı ifade, farklı karolar', a: 2, b: -3, multi: true },
    { kind: 'equation', title: 'Negatif x', L: [2, 0, 5, 0], R: [0, 1, 11, 0], xv: 2, story: 'Sağ tarafta bir −x var. Onu sıfır çiftiyle yok etmek için iki tarafa ne eklemelisin?' },
    { kind: 'equation', title: 'Farklı yollar', L: [4, 0, 0, 3], R: [2, 0, 7, 0], xv: 5, multi: true },
    { kind: 'judge', title: 'Kim haklı?', L: [5, 0, 0, 4], R: [2, 0, 5, 0], claims: [{ who: 'Ece', v: 3 }, { who: 'Can', v: 2 }] },
    { kind: 'equation', title: 'x sağda kalsın', L: [0, 2, 7, 0], R: [1, 0, 0, 2], xv: 3, story: 'Bu kez x’i hangi tarafta yalnız bırakmak daha kolay? Karar ver.' },
  ]
}
