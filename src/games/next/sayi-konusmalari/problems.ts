import type { Grade } from '../../../data/types'

/**
 * Sayı Konuşmaları — problem bankası, sınıf arkadaşlarının strateji şablonları ve biçimlendirme.
 * Tüm sayılar JS sayısıdır; ondalıklar her işlemden sonra r6 ile yuvarlanır.
 */

export type Kind = 'add' | 'sub' | 'mul' | 'pow'
export type BuilderKind = 'chips' | 'jumps' | 'round' | 'area'
export type StratKey =
  | 'tamamla' | 'sifir' | 'basamak' | 'telafi' | 'fark' | 'sabit' | 'ikiz' | 'zipla' | 'degisme'
  | 'birlesme' | 'yarila' | 'dagilma' | 'us' | 'ortakus' | 'deger' | 'grupla' | 'dogrudan' | 'parcala'

export interface Pow {
  base: number
  exp: number
}

export interface Problem {
  kind: Kind
  /** Toplama/çıkarma: işaretli terimler (a − b → [a, −b]); çarpma: çarpanlar; üslü: kuvvetlerin değerleri */
  terms: number[]
  pows?: Pow[]
  text: string
  answer: number
  /** En küçük birim (1, 0,1, 0,01) */
  step: number
  builders: BuilderKind[]
  /** Tahmin için referans sayı */
  bench: number
  /** Çarpma işareti */
  times: string
}

export const r6 = (x: number) => Math.round(x * 1e6) / 1e6
export const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-9
export const same = (a: number, b: number) => Math.abs(a - b) < 1e-7

/** Türkçe sayı yazımı, tipografik eksiyle */
export const fmtN = (x: number) => {
  const v = r6(x)
  const s = Math.abs(v).toLocaleString('tr-TR', { maximumFractionDigits: 4, useGrouping: Math.abs(v) >= 10000 })
  return v < 0 ? `−${s}` : s
}
/** Parantezli negatif: (−9) */
export const fmtP = (x: number) => (r6(x) < 0 ? `(${fmtN(x)})` : fmtN(x))

/** İşaretli terimleri toplam olarak yazar: [62, −27] → "62 − 27" */
export function fmtSum(ts: number[]) {
  return ts.map((t, i) => (i === 0 ? fmtN(t) : r6(t) < 0 ? `− ${fmtN(-t)}` : `+ ${fmtN(t)}`)).join(' ')
}
export const fmtProd = (fs: number[], times: string) => fs.map((f, i) => (i === 0 ? fmtN(f) : fmtP(f))).join(` ${times} `)
export const powText = (p: Pow) => `${fmtN(p.base)}^{${p.exp}}`

export const STRAT_NAME: Record<StratKey, string> = {
  tamamla: 'Yuvarlak sayıya tamamlama',
  sifir: 'Sıfıra tamamlama (ters sayılar)',
  basamak: 'Basamak değerine göre ayırma',
  telafi: 'Telafi: yuvarla ve düzelt',
  fark: 'Toplamayı düşünerek çıkarma',
  sabit: 'Sabit fark',
  ikiz: 'İkizler (ikizlere yakın)',
  zipla: 'Sayı doğrusunda zıplama',
  degisme: 'Yer değiştirme (değişme özelliği)',
  birlesme: 'Birleşme: önce 10/100 yap',
  yarila: 'Yarılama-ikileme',
  dagilma: 'Dağılma: parçalara ayırarak çarp',
  us: 'Aynı tabanda üsleri topla',
  ortakus: 'Üsler aynı: tabanları çarp',
  deger: 'Değerleri hesapla',
  grupla: 'Çarpanlara ayırıp yeniden grupla',
  dogrudan: 'Doğrudan hesap',
  parcala: 'Parçalayarak işlem',
}

export const stratName = (k: StratKey, grade: Grade) => (k === 'tamamla' && grade <= 2 ? '10’a tamamlama' : STRAT_NAME[k])

/* ───────────────────────────── üretim ───────────────────────────── */

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

function bench(answer: number, terms: number[]): number {
  if (terms.some((t) => t < 0) && answer !== 0) return 0
  const a = Math.abs(answer)
  const u = !isInt(answer) && a < 20 ? 1 : 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, a))))
  const lo = Math.floor(answer / u) * u
  const hi = Math.ceil(answer / u) * u
  const cands = [lo, hi].filter((x) => !same(x, answer))
  if (!cands.length) return answer + u
  return pick(cands)
}

function add(x: number, y: number, step = 1, builders: BuilderKind[] = ['chips', 'jumps', 'round'], times = '×'): Problem {
  const answer = r6(x + y)
  return { kind: 'add', terms: [x, y], text: `${fmtN(x)} + ${fmtP(y)}`, answer, step, builders, bench: bench(answer, [x, y]), times }
}
function sub(a: number, b: number, step = 1, builders: BuilderKind[] = ['chips', 'jumps', 'round'], times = '×'): Problem {
  const answer = r6(a - b)
  return { kind: 'sub', terms: [a, -b], text: `${fmtN(a)} − ${fmtP(b)}`, answer, step, builders, bench: bench(answer, [a, -b]), times }
}
function mul(fs: number[], times: string, builders: BuilderKind[] = ['chips', 'area', 'round']): Problem {
  const answer = r6(fs.reduce((p, f) => p * f, 1))
  const bl = builders.filter((b) => (b === 'area' ? fs.length === 2 && fs.every((f) => isInt(f) && f > 0) : b === 'round' ? fs.length === 2 && fs.some(nearRound) : true))
  return { kind: 'mul', terms: fs, text: fmtProd(fs, times), answer, step: 1, builders: bl, bench: bench(answer, fs), times }
}
function pow(ps: Pow[]): Problem {
  const terms = ps.map((p) => p.base ** p.exp)
  const answer = terms.reduce((a, b) => a * b, 1)
  return { kind: 'pow', terms, pows: ps, text: ps.map(powText).join(' · '), answer, step: 1, builders: ['chips', 'area'], bench: bench(answer, terms), times: '·' }
}

export function nearRound(x: number) {
  if (!isInt(x) || x < 8) return false
  const m10 = x % 10
  return m10 >= 8 || (x >= 100 && (x % 100 >= 97 || x % 100 <= 3) && m10 !== 0)
}

export function buildProblems(grade: Grade): Problem[] {
  switch (grade) {
    case 1: {
      const a = pick([8, 9]), n = ri(5, 8), s1 = ri(12, 16), s2 = ri(13, 18)
      return [
        add(a, ri(Math.max(3, 11 - a), Math.min(7, 17 - a))),
        add(n, n + 1, 1, ['chips', 'jumps']),
        sub(s1, ri(s1 - 9, Math.min(9, s1 - 3)), 1, ['chips', 'jumps']),
        add(pick([6, 7]), ri(5, 8), 1, ['chips', 'jumps']),
        sub(s2, s2 - ri(2, 4), 1, ['jumps', 'chips']),
      ]
    }
    case 2: {
      const h = pick([15, 25, 35, 45])
      return [
        add(10 * ri(2, 5) + pick([8, 9]), 10 * ri(1, 3) + ri(3, 7)),
        add(10 * ri(1, 4) + ri(4, 7), 10 * ri(2, 4) + ri(5, 8)),
        sub(10 * ri(5, 8) + ri(1, 4), 10 * ri(1, 3) + ri(6, 9)),
        sub(pick([50, 60, 80, 100]), 10 * ri(1, 3) + ri(2, 8)),
        add(h, h + 1, 1, ['chips', 'jumps']),
      ]
    }
    case 3:
      return [
        add(10 * ri(3, 6) + 9, 10 * ri(1, 3) + ri(4, 7)),
        add(100 * ri(1, 4) + pick([97, 98, 99]), 10 * ri(3, 6) + ri(2, 8)),
        sub(100 * ri(3, 7) + ri(1, 3), 100 * ri(0, 2) + pick([97, 98, 99])),
        mul([ri(6, 8), ri(6, 8)], '×', ['area', 'chips']),
        mul([pick([4, 5]), pick([14, 16, 18])], '×', ['chips', 'area']),
      ]
    case 4:
      return [
        add(100 * ri(2, 6) + pick([97, 98, 99]), 100 * ri(1, 3) + 10 * ri(1, 8) + ri(1, 9)),
        sub(1000, 100 * ri(2, 6) + 10 * ri(1, 8) + ri(1, 9)),
        mul([25, pick([12, 16, 24])], '×', ['chips', 'area']),
        mul([pick([15, 16]), pick([14, 18])], '×', ['chips', 'area']),
        mul([pick([99, 49, 98]), ri(4, 8)], '×', ['round', 'area', 'chips']),
      ]
    case 5:
      return [
        mul([25, pick([16, 24, 32])], '×', ['chips', 'area']),
        mul([4, pick([13, 17, 19, 23, 27, 29, 31, 37]), 25], '×', ['chips']),
        mul([pick([99, 98]), pick([12, 15, 21])], '×', ['round', 'area', 'chips']),
        mul([pick([18, 14]), pick([15, 25])], '×', ['chips', 'area']),
        sub(1000 + ri(1, 9), 100 * ri(3, 6) + pick([97, 98])),
      ]
    case 6:
      return [
        add(pick([2.5, 3.5, 1.5]), pick([1.75, 2.75, 1.25]), 0.01),
        sub(pick([6, 8, 10]), pick([2.75, 3.6, 1.85]), 0.01),
        mul([pick([2.5, 0.5]), pick([12, 16, 24, 48])], '×', ['chips']),
        add(r6(ri(2, 5) + 0.9), r6(ri(1, 4) + pick([0.3, 0.4, 0.6])), 0.1),
        mul([pick([99, 98]), pick([8, 12])], '×', ['round', 'area', 'chips']),
      ]
    case 7:
      return [
        add(-pick([6, 7, 8, 9]), pick([13, 15, 17]), 1, ['jumps', 'chips']),
        add(10 * ri(2, 4) + ri(3, 7), -pick([8, 9]), 1, ['chips', 'jumps', 'round']),
        sub(-pick([4, 6, 7]), pick([8, 9]), 1, ['jumps', 'chips']),
        add(r6(ri(2, 4) + 0.9), r6(ri(1, 3) + pick([0.15, 0.25, 0.35])), 0.01),
        mul([-25, pick([12, 16, 8])], '·', ['chips']),
      ]
    default:
      return [
        pow([{ base: 2, exp: 5 }, { base: 2, exp: 3 }]),
        pow([{ base: 5, exp: 2 }, { base: 2, exp: 2 }]),
        pow([{ base: 3, exp: pick([2, 3]) }, { base: 3, exp: pick([2, 3]) }]),
        pow([{ base: 2, exp: 3 }, { base: 3, exp: 3 }]),
        pow([{ base: 2, exp: 6 }, { base: 5, exp: 4 }]),
      ]
  }
}

/* ───────────────────────────── sınıf arkadaşlarının yolları ───────────────────────────── */

export interface Friend {
  key: StratKey
  steps: string[]
}

const unitFor = (xs: number[]) => {
  if (xs.some((x) => !isInt(x))) return 1
  const m = Math.max(...xs.map(Math.abs))
  if (m >= 100 && xs.some((x) => { const r = Math.abs(x) % 100; return r >= 90 || (r > 0 && r <= 5) })) return 100
  return 10
}

function sumFriends(p: Problem, grade: Grade): Friend[] {
  const [x, y] = p.terms
  const ans = p.answer
  const out: Friend[] = []
  const dec = !isInt(x) || !isInt(y)
  const U = unitFor([x, y])
  // 1) tamamla / sıfıra tamamla (büyük terimden diğerine doğru)
  for (const [s, t] of Math.abs(x) >= Math.abs(y) ? [[x, y], [y, x]] : [[y, x], [x, y]]) {
    const R = t > 0 ? Math.ceil(r6(s / U)) * U : Math.floor(r6(s / U)) * U
    const R0 = Math.sign(s) !== Math.sign(t) && Math.abs(t) > Math.abs(s) ? 0 : R
    const need = r6(R0 - s)
    if (!same(need, 0) && Math.abs(need) < Math.abs(t) && Math.sign(need) === Math.sign(t)) {
      out.push({
        key: R0 === 0 ? 'sifir' : 'tamamla',
        steps: [`${fmtP(t)} = ${fmtP(need)} + ${fmtP(r6(t - need))}`, `${fmtSum([s, need])} = ${fmtN(R0)}`, `${fmtSum([R0, r6(t - need)])} = ${fmtN(ans)}`],
      })
      break
    }
  }
  // 2) basamak değeri
  if (Math.sign(x) === Math.sign(y) || p.kind === 'sub') {
    if (!dec && Math.abs(x) >= 10 && Math.abs(y) >= 10 && (grade >= 3 || p.kind === 'add')) {
      const xo = x % 10, yo = y % 10, xt = x - xo, yt = y - yo
      if (!(p.kind === 'sub' && Math.abs(yo) > Math.abs(xo) && grade < 4)) out.push({ key: 'basamak', steps: [`${fmtSum([xt, yt])} = ${fmtN(xt + yt)}`, `${fmtSum([xo, yo])} = ${fmtN(xo + yo)}`, `${fmtSum([xt + yt, xo + yo])} = ${fmtN(ans)}`] })
    } else if (dec && x > 0 && y > 0) {
      const xi = Math.trunc(x), yi = Math.trunc(y), xf = r6(x - xi), yf = r6(y - yi)
      out.push({ key: 'basamak', steps: [`${fmtN(xi)} + ${fmtN(yi)} = ${fmtN(xi + yi)}`, `${fmtN(xf)} + ${fmtN(yf)} = ${fmtN(r6(xf + yf))}`, `${fmtN(xi + yi)} + ${fmtN(r6(xf + yf))} = ${fmtN(ans)}`] })
    }
  }
  // 3) telafi
  const lim = dec ? 0.31 : U === 100 ? 5 : 3
  for (const [z, w, first] of [[x, y, true], [y, x, false]] as [number, number, boolean][]) {
    const R = Math.round(r6(z / U)) * U
    const d = r6(R - z)
    if (!same(d, 0) && Math.abs(d) <= lim && R !== 0) {
      const pair = first ? [R, w] : [w, R]
      out.push({ key: 'telafi', steps: [`${p.text} = ${fmtSum(pair)} ${d > 0 ? '−' : '+'} ${fmtN(Math.abs(d))}`, `${fmtSum(pair)} = ${fmtN(r6(R + w))}`, `${fmtN(r6(R + w))} ${d > 0 ? '−' : '+'} ${fmtN(Math.abs(d))} = ${fmtN(ans)}`] })
      break
    }
  }
  // 4) çıkarma: toplamayı düşün, sabit fark
  if (p.kind === 'sub' && x >= 0 && y < 0 && x + y >= 0) {
    const a = x, b = -y
    const pts = [b]
    const R1 = Math.ceil(r6(b / U)) * U
    if (R1 > b && R1 < a) pts.push(R1)
    const R2 = Math.floor(r6(a / U)) * U
    if (R2 > pts[pts.length - 1] && R2 < a) pts.push(R2)
    pts.push(a)
    if (pts.length >= 3) {
      const jumps = pts.slice(1).map((q, i) => r6(q - pts[i]))
      out.push({ key: 'fark', steps: [pts.map(fmtN).join(' → '), `${jumps.map(fmtN).join(' + ')} = ${fmtN(ans)}`] })
    }
    const R = Math.round(r6(b / U)) * U
    const d = r6(R - b)
    if (!same(d, 0) && Math.abs(d) <= lim) out.push({ key: 'sabit', steps: [d > 0 ? `İkisine de ${fmtN(d)} ekle: ${p.text} = ${fmtN(r6(a + d))} − ${fmtN(R)}` : `İkisinden de ${fmtN(-d)} çıkar: ${p.text} = ${fmtN(r6(a + d))} − ${fmtN(R)}`, `${fmtN(r6(a + d))} − ${fmtN(R)} = ${fmtN(ans)}`] })
  }
  // 5) zıplama
  if (!dec && Math.abs(y) >= 10) {
    const yo = y % 10, yt = y - yo
    const steps = [`${fmtN(x)} → ${fmtN(x + yt)} (${yt > 0 ? '+' : '−'}${fmtN(Math.abs(yt))})`]
    if (yo) steps.push(`${fmtN(x + yt)} → ${fmtN(ans)} (${yo > 0 ? '+' : '−'}${fmtN(Math.abs(yo))})`)
    out.push({ key: 'zipla', steps })
  }
  // 6) ikizler
  if (p.kind === 'add' && x > 0 && y > 0 && !dec && x !== y && Math.abs(x - y) <= 2) {
    const m = Math.min(x, y)
    out.push({ key: 'ikiz', steps: [`${fmtN(m)} + ${fmtN(m)} = ${fmtN(2 * m)}`, `${fmtN(2 * m)} + ${fmtN(Math.abs(x - y))} = ${fmtN(ans)}`] })
  }
  // 7) yer değiştir
  if (p.kind === 'add' && x < 0 && y > 0) out.push({ key: 'degisme', steps: [`${p.text} = ${fmtN(y)} − ${fmtN(-x)}`, `${fmtN(y)} − ${fmtN(-x)} = ${fmtN(ans)}`] })
  return out
}

const isPow10 = (v: number) => [10, 100, 1000, 10000].includes(Math.abs(r6(v)))

function mulFriends(p: Problem): Friend[] {
  const f = p.terms
  const t = p.times
  const ans = p.answer
  const out: Friend[] = []
  // birleşme
  if (f.length === 3) {
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        if (isPow10(f[i] * f[j]) && !out.length) {
          const k = 3 - i - j
          out.push({ key: 'birlesme', steps: [`${fmtP(f[i])} ${t} ${fmtP(f[j])} = ${fmtN(r6(f[i] * f[j]))}`, `${fmtN(r6(f[i] * f[j]))} ${t} ${fmtP(f[k])} = ${fmtN(ans)}`] })
        }
    out.push({ key: 'dogrudan', steps: [`${fmtP(f[0])} ${t} ${fmtP(f[1])} = ${fmtN(r6(f[0] * f[1]))}`, `${fmtN(r6(f[0] * f[1]))} ${t} ${fmtP(f[2])} = ${fmtN(ans)}`] })
    return out
  }
  const [x, y] = f
  for (const [a, b] of [[x, y], [y, x]]) {
    for (const P of [10, 100, 1000]) {
      const need = r6(P / Math.abs(a))
      if (isInt(need) && need > 1 && isInt(b) && Math.abs(b) % need === 0 && Math.abs(b) !== need) {
        const rest = r6(b / need)
        out.push({ key: 'birlesme', steps: [`${fmtN(b)} = ${fmtN(need)} ${t} ${fmtP(rest)}`, `${fmtP(a)} ${t} ${fmtN(need)} = ${fmtN(r6(a * need))}`, `${fmtN(r6(a * need))} ${t} ${fmtP(rest)} = ${fmtN(ans)}`] })
        break
      }
    }
    if (out.length) break
  }
  // yarılama-ikileme
  for (const [a0, b0] of [[x, y], [y, x]]) {
    let a = a0, b = b0
    const steps: string[] = []
    for (let k = 0; k < 3 && isInt(b) && b % 2 === 0 && !isPow10(a) && !(isInt(a) && a % 10 === 0); k++) {
      a = r6(a * 2); b = r6(b / 2)
      steps.push(`= ${fmtP(a)} ${t} ${fmtP(b)}`)
    }
    if (steps.length && (isInt(a) && a % 10 === 0)) {
      out.push({ key: 'yarila', steps: [`${fmtP(a0)} ${t} ${fmtP(b0)} ${steps.join(' ')}`, `${fmtP(a)} ${t} ${fmtP(b)} = ${fmtN(ans)}`] })
      break
    }
  }
  // dağılma
  if (isInt(x) && isInt(y)) {
    const [a, b] = Math.abs(y) >= 10 && Math.abs(y) % 10 !== 0 ? [x, y] : [y, x]
    let p1: number, p2: number
    if (Math.abs(b) >= 10 && b % 10 !== 0) { p2 = b % 10; p1 = b - p2 } else if (Math.abs(b) > 5 && Math.abs(b) < 10) { p1 = Math.sign(b) * 5; p2 = b - p1 } else { p1 = 0; p2 = 0 }
    if (p1 && p2) out.push({ key: 'dagilma', steps: [`${fmtP(a)} ${t} ${fmtN(p1)} = ${fmtN(a * p1)}`, `${fmtP(a)} ${t} ${fmtN(p2)} = ${fmtN(a * p2)}`, `${fmtN(a * p1)} + ${fmtP(a * p2)} = ${fmtN(ans)}`] })
  }
  // telafi
  for (const [a, b] of [[x, y], [y, x]]) {
    if (nearRound(a)) {
      const U = a >= 90 && a % 100 >= 90 ? 100 : 10
      const R = Math.round(a / U) * U
      const d = R - a
      out.push({ key: 'telafi', steps: [`${fmtN(a)} ${t} ${fmtN(b)} = ${fmtN(R)} ${t} ${fmtN(b)} − ${fmtN(d)} ${t} ${fmtN(b)}`, `${fmtN(R * b)} − ${fmtN(d * b)} = ${fmtN(ans)}`] })
      break
    }
  }
  if (out.length < 3) out.push({ key: 'dogrudan', steps: [`${p.text} = ${fmtN(ans)}`] })
  return out
}

function powFriends(p: Problem): Friend[] {
  const [A, B] = p.pows!
  const ans = p.answer
  const out: Friend[] = []
  if (A.base === B.base) {
    const e = A.exp + B.exp
    out.push({ key: 'us', steps: [`${powText(A)}·${powText(B)} = ${powText({ base: A.base, exp: e })}`, `${powText({ base: A.base, exp: e })} = ${fmtN(ans)}`] })
    if (e % 2 === 0 && A.exp !== B.exp) {
      const h = { base: A.base, exp: e / 2 }
      out.push({ key: 'grupla', steps: [`${p.text} = ${powText(h)}·${powText(h)}`, `${fmtN(A.base ** h.exp)}·${fmtN(A.base ** h.exp)} = ${fmtN(ans)}`] })
    }
  } else if (A.exp === B.exp) {
    out.push({ key: 'ortakus', steps: [`${p.text} = (${A.base}·${B.base})^{${A.exp}}`, `${fmtN(A.base * B.base)}^{${A.exp}} = ${fmtN(ans)}`] })
  } else {
    const k = Math.min(A.exp, B.exp)
    const big = A.exp > B.exp ? A : B
    const small = A.exp > B.exp ? B : A
    out.push({ key: 'grupla', steps: [`${powText(big)} = ${powText({ base: big.base, exp: big.exp - k })}·${powText({ base: big.base, exp: k })}`, `${powText({ base: big.base, exp: k })}·${powText(small)} = ${fmtN(big.base * small.base)}^{${k}}`, `${fmtN(big.base ** (big.exp - k))}·${fmtN((big.base * small.base) ** k)} = ${fmtN(ans)}`] })
  }
  out.push({ key: 'deger', steps: [`${powText(A)} = ${fmtN(A.base ** A.exp)}`, `${powText(B)} = ${fmtN(B.base ** B.exp)}`, `${fmtN(A.base ** A.exp)}·${fmtN(B.base ** B.exp)} = ${fmtN(ans)}`] })
  return out
}

export function friendsFor(p: Problem, grade: Grade): Friend[] {
  const list = p.kind === 'pow' ? powFriends(p) : p.kind === 'mul' ? mulFriends(p) : sumFriends(p, grade)
  const seen = new Set<StratKey>()
  return list.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)))
}

export const NAMES = [
  { name: 'Elif', av: '🦊', color: '#f97316' },
  { name: 'Can', av: '🐼', color: '#0ea5e9' },
  { name: 'Zeynep', av: '🐨', color: '#8b5cf6' },
  { name: 'Mert', av: '🐯', color: '#eab308' },
  { name: 'Defne', av: '🐰', color: '#ec4899' },
  { name: 'Emir', av: '🦁', color: '#14b8a6' },
  { name: 'Ece', av: '🐸', color: '#22c55e' },
  { name: 'Kerem', av: '🐧', color: '#6366f1' },
]
