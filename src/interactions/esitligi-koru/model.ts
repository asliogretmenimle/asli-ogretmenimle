import type { Grade } from '../../data/types'
import { ek } from '../../lib/generators'

/**
 * Eşitliği Koru — model.
 *  - Cebirsel kefe: ax + c (a kutu, c birim ağırlık; c < 0 ise balon yukarı çeker).
 *  - Sayısal kefe (4–5. sınıf): terimler listesi × çarpan (ör. 2 × (6 + 6)).
 */

export type Rel = '=' | '>' | '<'
export type Zone = 'L' | 'R' | 'both'
export type Side = { x: number; c: number }
export type Op = { t: '+' | '-' | '*' | '/'; k: number; x?: boolean }

export const opKey = (o: Op) => `${o.t}${o.k}${o.x ? 'x' : ''}`
const sym = (t: Op['t']) => (t === '+' ? '+' : t === '-' ? '−' : t === '*' ? '×' : '÷')
export const opLabel = (o: Op, v = 'x') => (o.x ? `${sym(o.t)}${o.k === 1 ? '' : o.k}${v}` : `${sym(o.t)}${o.k}`)

/** "4 çıkar", "2’ye böl" */
export function opVerb(o: Op, v = 'x') {
  const what = o.x ? `${o.k === 1 ? '' : `${o.k} `}${v}` : String(o.k)
  if (o.t === '+') return `${what} ekle`
  if (o.t === '-') return `${what} çıkar`
  if (o.t === '*') return `${o.k} ile çarp`
  return `${ek(o.k, 'dat')} böl`
}

export const zoneText: Record<Zone, string> = { L: 'sol kefe', R: 'sağ kefe', both: 'iki kefe' }

/* ───────────── cebirsel kefe ───────────── */

export const weight = (s: Side, xv: number) => s.x * xv + s.c

export type ApplyErr = 'neg' | 'negx' | 'div' | 'zero'
export function applySide(s: Side, o: Op, allowNeg: boolean): Side | ApplyErr {
  let r: Side
  if (o.t === '+') r = o.x ? { x: s.x + o.k, c: s.c } : { x: s.x, c: s.c + o.k }
  else if (o.t === '-') r = o.x ? { x: s.x - o.k, c: s.c } : { x: s.x, c: s.c - o.k }
  else if (o.t === '*') r = { x: s.x * o.k, c: s.c * o.k }
  else {
    if (s.x % o.k !== 0 || s.c % o.k !== 0) return 'div'
    r = { x: s.x / o.k, c: s.c / o.k }
  }
  if (!allowNeg && r.c < 0) return 'neg'
  if (!allowNeg && r.x < 0) return 'negx'
  return r
}

/** "2x + 3", "3 × □", "−x − 2" */
export function fmtSide(s: Side, v = 'x') {
  const box = v === '□'
  const parts: string[] = []
  if (s.x !== 0) {
    const a = Math.abs(s.x)
    const body = a === 1 ? v : box ? `${a} × ${v}` : `${a}${v}`
    parts.push(s.x < 0 ? `−${body}` : body)
  }
  if (s.c !== 0 || parts.length === 0) {
    if (parts.length === 0) parts.push(s.c < 0 ? `−${-s.c}` : String(s.c))
    else parts.push(s.c < 0 ? `− ${-s.c}` : `+ ${s.c}`)
  }
  return parts.join(' ')
}

/** Yerine koyma: "3 · 4 + 4" */
export function fmtSubst(s: Side, xv: number) {
  const parts: string[] = []
  if (s.x !== 0) {
    const a = Math.abs(s.x)
    const body = a === 1 ? String(xv) : `${a} · ${xv}`
    parts.push(s.x < 0 ? `−${body}` : body)
  }
  if (s.c !== 0 || parts.length === 0) {
    if (parts.length === 0) parts.push(String(s.c).replace('-', '−'))
    else parts.push(s.c < 0 ? `− ${-s.c}` : `+ ${s.c}`)
  }
  return parts.join(' ')
}

/** Denklem/eşitsizlik denkliği: çözüm kümesi başlangıçtakiyle aynı mı? */
export function solutionOf(L: Side, R: Side): { a: number; s: number } | null {
  const a = L.x - R.x
  const b = L.c - R.c
  if (a === 0) return null
  return { a, s: -b / a }
}

export function isIsolated(L: Side, R: Side) {
  return (L.x === 1 && L.c === 0 && R.x === 0) || (R.x === 1 && R.c === 0 && L.x === 0)
}

/* ───────────── sayısal kefe ───────────── */

export type NumSide = { terms: number[]; f: number }
export const nval = (s: NumSide) => s.f * s.terms.reduce((a, b) => a + b, 0)
export function fmtNum(s: NumSide) {
  const t = s.terms.map((v, i) => (i === 0 ? String(v).replace('-', '−') : v < 0 ? `− ${-v}` : `+ ${v}`)).join(' ') || '0'
  return s.f === 1 ? t : s.terms.length > 1 ? `${s.f} × (${t})` : `${s.f} × ${t}`
}
export function applyNum(s: NumSide, o: Op): NumSide | ApplyErr {
  const collapse = (q: NumSide): NumSide => (q.f === 1 ? q : { terms: [nval(q)], f: 1 })
  if (o.t === '+') {
    const q = collapse(s)
    const i = q.terms.indexOf(-o.k)
    return i >= 0 ? { terms: q.terms.filter((_, j) => j !== i), f: 1 } : { terms: [...q.terms, o.k], f: 1 }
  }
  if (o.t === '-') {
    if (nval(s) - o.k < 0) return 'neg'
    const q = collapse(s)
    const i = q.terms.indexOf(o.k)
    return i >= 0 ? { terms: q.terms.filter((_, j) => j !== i), f: 1 } : { terms: [...q.terms, -o.k], f: 1 }
  }
  if (o.t === '*') return { terms: s.terms, f: s.f * o.k }
  if (s.f % o.k === 0) return { terms: s.terms, f: s.f / o.k }
  if (nval(s) % o.k === 0) return { terms: [nval(s) / o.k], f: 1 }
  return 'div'
}

/* ───────────── görevler ───────────── */

export type SolveT = { kind: 'solve'; title: string; story?: string; L: Side; R: Side; rel: Rel; xv: number; multi?: boolean; verify?: boolean; cards: Op[] }
export type RestoreT = { kind: 'restore'; title: string; story: string; L: NumSide; R: NumSide; dis: { z: 'L' | 'R'; o: Op }; cards: Op[] }
export type BuildT = { kind: 'build'; title: string; L: number[]; R: number[]; ans: number; chips: number[] }
export type CItem = { label: string; v: number }
export type ComparePair = { L: CItem[]; R: CItem[]; why: string }
export type CompareT = { kind: 'compare'; title: string; pairs: ComparePair[] }
export type Task = SolveT | RestoreT | BuildT | CompareT

const n = (k: number): Op => ({ t: k >= 0 ? '+' : '-', k: Math.abs(k) })
const xo = (k: number): Op => ({ t: k >= 0 ? '+' : '-', k: Math.abs(k), x: true })
const dv = (k: number): Op => ({ t: '/', k })
const ml = (k: number): Op => ({ t: '*', k })

const S = (x: number, c: number): Side => ({ x, c })
const solve = (title: string, L: Side, R: Side, cards: Op[], extra: Partial<SolveT> = {}): SolveT => {
  const sol = solutionOf(L, R)!
  return { kind: 'solve', title, L, R, rel: '=', xv: sol.s, cards, ...extra }
}

export function makeTasks(grade: Grade): Task[] {
  if (grade === 4)
    return [
      {
        kind: 'compare',
        title: 'Hangi kefe ağır basar?',
        pairs: [
          { L: [{ label: '25', v: 25 }, { label: '18', v: 18 }], R: [{ label: '26', v: 26 }, { label: '17', v: 17 }], why: '26, 25’ten 1 fazla; 17 ise 18’den 1 eksik. Bir taraf 1 kazanıp öteki 1 kaybedince toplam değişir mi?' },
          { L: [{ label: '34', v: 34 }, { label: '9', v: 9 }], R: [{ label: '34', v: 34 }, { label: '12', v: 12 }], why: 'İki kefede de 34 var. Geriye kalan ağırlıkları karşılaştır: 9 mu ağır, 12 mi?' },
          { L: [{ label: '50', v: 50 }, { label: '−8', v: -8 }], R: [{ label: '50', v: 50 }, { label: '−6', v: -6 }], why: 'Balonlar kefeyi yukarı çeker. 50’den 8 mi çıkarınca çok kalır, 6 mı çıkarınca?' },
        ],
      },
      { kind: 'build', title: 'Kutuya ne koymalı?', L: [8, 5], R: [6], ans: 7, chips: [1, 2, 5, 10] },
      { kind: 'restore', title: 'Dengeyi geri kur', story: 'Terazi dengedeydi. Biri sol kefeye 5 ekledi!', L: { terms: [12, 7], f: 1 }, R: { terms: [19], f: 1 }, dis: { z: 'L', o: n(5) }, cards: [n(5), n(-5), n(2), n(-2), n(10)] },
      { kind: 'build', title: 'Kutuya ne koymalı?', L: [15, -6], R: [-4], ans: 13, chips: [1, 2, 5, 10] },
      { kind: 'restore', title: 'Dengeyi geri kur', story: 'Terazi dengedeydi. Biri sağ kefeye 3’lük bir balon bağladı!', L: { terms: [9, 6], f: 1 }, R: { terms: [15], f: 1 }, dis: { z: 'R', o: n(-3) }, cards: [n(3), n(-3), n(6), n(-6), n(9)] },
    ]
  if (grade === 5)
    return [
      {
        kind: 'compare',
        title: 'Hesaplamadan karar ver',
        pairs: [
          { L: [{ label: '37', v: 37 }, { label: '28', v: 28 }], R: [{ label: '40', v: 40 }, { label: '25', v: 25 }], why: '37’ye 3 eklenip 40 olmuş, 28’den 3 çıkıp 25 olmuş. Toplam ne kadar değişti?' },
          { L: [{ label: '63', v: 63 }, { label: '−19', v: -19 }], R: [{ label: '64', v: 64 }, { label: '−20', v: -20 }], why: 'İki sayıya da 1 eklenince aradaki fark değişir mi? 63 − 19 ile 64 − 20’yi bir sayı doğrusunda düşün.' },
          { L: [{ label: '6 × 15', v: 90 }], R: [{ label: '3 × 30', v: 90 }], why: '6’yı yarıya, 15’i iki katına çıkarınca çarpım ne olur? Dikdörtgen olarak düşünebilirsin.' },
        ],
      },
      { kind: 'restore', title: 'Dengeyi geri kur', story: 'Terazi dengedeydi. Biri sol kefedeki her şeyi iki katına çıkardı!', L: { terms: [6, 6], f: 1 }, R: { terms: [12], f: 1 }, dis: { z: 'L', o: ml(2) }, cards: [ml(2), dv(2), n(12), n(-12), n(6)] },
      solve('Gizemli kutu', S(1, 7), S(0, 15), [n(-7), n(7), n(-5), n(-2), n(15)], { story: 'Kutunun ağırlığını bulmak için kutuyu kefede yalnız bırak; ama terazi hep dengede kalsın.' }),
      solve('Üç eş kutu', S(3, 0), S(0, 12), [dv(3), dv(2), ml(2), n(-3), n(12)], { story: 'Üç kutu da aynı ağırlıkta. Bir kutunun ağırlığını nasıl bulursun?' }),
      solve('Farklı yollar', S(1, 5), S(0, 11), [n(-5), n(-2), n(-3), n(2), ml(2)], { multi: true, story: 'Kutuyu yalnız bırakmanın birden çok yolu var. Bir yol bul, sonra başka bir yol dene!' }),
    ]
  if (grade === 6)
    return [
      solve('Bilinmeyeni yalnız bırak', S(1, 6), S(0, 14), [n(-6), n(6), n(-4), n(-14), dv(2)], { verify: true }),
      solve('Eş kutular', S(3, 0), S(0, 15), [dv(3), dv(5), n(-3), n(-15), ml(2)], { verify: true }),
      solve('İki yol', S(2, 4), S(0, 10), [dv(2), n(-4), n(-2), n(4), ml(2)], { multi: true, verify: true, story: 'Önce bölebilir misin, yoksa önce mi çıkarmalısın? İki yolu da dene!' }),
      solve('Kutular ve ağırlıklar', S(4, 1), S(0, 13), [n(-1), dv(4), n(-3), dv(2), n(1)], { verify: true }),
      solve('İki kefede de kutu', S(3, 2), S(1, 10), [xo(-1), n(-2), dv(2), n(-10), xo(1)], { multi: true, verify: true, story: 'Kutular iki kefede de var. Önce kutuları mı yoksa ağırlıkları mı azaltırsın?' }),
    ]
  if (grade === 7)
    return [
      solve('İki kefede kutu', S(2, 5), S(1, 9), [xo(-1), n(-5), n(-9), xo(1), dv(2)], { multi: true, verify: true }),
      solve('Balonlar', S(3, -2), S(0, 13), [n(2), n(-2), dv(3), n(13), xo(-1)], { verify: true, story: 'Balon kefeyi 2 birim yukarı çekiyor (−2). Balondan nasıl kurtulursun?' }),
      solve('Farklı sıralar', S(4, 2), S(2, 12), [xo(-2), n(-2), dv(2), xo(-1), n(-12)], { multi: true, verify: true, story: 'Bu dengeyi en az iki farklı sırayla çöz.' }),
      { kind: 'solve', title: 'Eğik terazi', story: 'Bu terazi dengede değil: sol kefe ağır basıyor (>). İki kefeye aynı işlemi yaparsan hangi kefe ağır kalır?', L: S(1, 3), R: S(0, 7), rel: '>', xv: 4, cards: [n(-3), n(3), n(-7), xo(-1), n(-1)] },
      solve('Balon ve kutu', S(5, -4), S(2, 5), [xo(-2), n(4), n(-4), dv(3), n(-5)], { multi: true, verify: true }),
    ]
  return [
    solve('Kalem kutuları', S(3, 4), S(1, 12), [xo(-1), n(-4), dv(2), n(-12), xo(1)], { multi: true, verify: true, story: 'Ada’nın 3 kutu kalemi ve 4 tek kalemi, Efe’nin 1 kutu kalemi ve 12 tek kalemi var. İkisinin kalemi eşit; kutulardaki kalem sayısı aynı. Bir kutuda kaç kalem var?' }),
    solve('Kargo', S(2, 3), S(1, 8), [xo(-1), n(-3), n(-8), dv(2), xo(1)], { verify: true, story: 'Bir kargoda 2 eş paket ve 3 kg’lık bir koli, ötekinde 1 eş paket ve 8 kg’lık bir koli var. İki kargo eşit ağırlıkta.' }),
    { kind: 'solve', title: 'Asansör sınırı', story: '2 eş kutu ve 1 kg’lık çanta, 1 kutu ve 6 kg’lık çantadan hafif olmalı (<). Kutu en fazla ne kadar ağır olabilir?', L: S(2, 1), R: S(1, 6), rel: '<', xv: 3, cards: [xo(-1), n(-1), n(-6), dv(2), xo(1)] },
    solve('Balonlu denge', S(4, -6), S(1, 9), [xo(-1), n(6), n(-9), dv(3), n(-6)], { multi: true, verify: true, story: 'Sol kefede 4 kutu var ama 6 birimlik balon onu yukarı çekiyor.' }),
    solve('Son meydan okuma', S(5, -4), S(2, 8), [xo(-2), n(4), n(-8), dv(3), xo(-1)], { multi: true, verify: true }),
  ]
}
