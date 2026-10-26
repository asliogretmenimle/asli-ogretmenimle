/** Denklem Kapıları — küçük rasyonel sayı ve doğrusal ifade cebiri */

export interface R {
  n: number
  d: number
}

const g = (a: number, b: number): number => (b ? g(b, a % b) : Math.abs(a))
export const r = (n: number, d = 1): R => {
  if (d < 0) {
    n = -n
    d = -d
  }
  const k = g(n, d) || 1
  return { n: n / k, d: d / k }
}
export const add = (a: R, b: R) => r(a.n * b.d + b.n * a.d, a.d * b.d)
export const sub = (a: R, b: R) => r(a.n * b.d - b.n * a.d, a.d * b.d)
export const mul = (a: R, b: R) => r(a.n * b.n, a.d * b.d)
export const div = (a: R, b: R) => r(a.n * b.d, a.d * b.n)
export const zero = (a: R) => a.n === 0
export const isOne = (a: R) => a.n === 1 && a.d === 1
export const same = (a: R, b: R) => a.n === b.n && a.d === b.d
export const num = (a: R) => a.n / a.d
export const isInt = (a: R) => a.d === 1

/** Tipografik eksiyle sayı: 5, −3, [[3/4]], −[[1/2]] */
export function fmt(a: R): string {
  const s = a.n < 0 ? '−' : ''
  return a.d === 1 ? `${s}${Math.abs(a.n)}` : `${s}[[${Math.abs(a.n)}/${a.d}]]`
}

/** a·x + b */
export interface Side {
  a: R
  b: R
}
export const side = (a: number | R, b: number | R): Side => ({ a: typeof a === 'number' ? r(a) : a, b: typeof b === 'number' ? r(b) : b })

/** Katsayılı terim: x, −x, 3x, [[x/2]], [[3/4]]x */
export function term(a: R, v = 'x'): string {
  const s = a.n < 0 ? '−' : ''
  const n = Math.abs(a.n)
  if (a.d === 1) return `${s}${n === 1 ? '' : n}${v}`
  if (n === 1) return `${s}[[${v}/${a.d}]]`
  return `${s}[[${n}/${a.d}]]${v}`
}

export function fmtSide(sd: Side, v = 'x'): string {
  if (zero(sd.a)) return fmt(sd.b)
  const t = term(sd.a, v)
  if (zero(sd.b)) return t
  return `${t} ${sd.b.n < 0 ? '−' : '+'} ${fmt(r(Math.abs(sd.b.n), sd.b.d))}`
}

export const evalSide = (sd: Side, x: R) => add(mul(sd.a, x), sd.b)

export type Rel = '=' | '<' | '>' | '≤' | '≥'
export interface Eq {
  L: Side
  R: Side
  rel: Rel
}
export const flip = (rel: Rel): Rel => (rel === '<' ? '>' : rel === '>' ? '<' : rel === '≤' ? '≥' : rel === '≥' ? '≤' : '=')
export const fmtEq = (e: Eq, v = 'x') => `${fmtSide(e.L, v)} ${e.rel} ${fmtSide(e.R, v)}`

/** İki tarafa (ya da bir tarafa) uygulanan işlem */
export interface Op {
  k: '+' | '−' | '×' | '÷'
  v: R
  /** + / − için: sabit yerine v·x terimi */
  x?: boolean
}

export function opLabel(o: Op): string {
  const neg = o.v.n < 0
  const body = o.x ? term(o.v) : fmt(o.v)
  return `${o.k}${neg && (o.k === '×' || o.k === '÷') ? `(${body})` : body}`
}
export const opKey = (o: Op) => `${o.k}${o.x ? 'x' : ''}${o.v.n}/${o.v.d}`

export function applySide(sd: Side, o: Op): Side {
  switch (o.k) {
    case '+':
      return o.x ? { a: add(sd.a, o.v), b: sd.b } : { a: sd.a, b: add(sd.b, o.v) }
    case '−':
      return o.x ? { a: sub(sd.a, o.v), b: sd.b } : { a: sd.a, b: sub(sd.b, o.v) }
    case '×':
      return { a: mul(sd.a, o.v), b: mul(sd.b, o.v) }
    case '÷':
      return { a: div(sd.a, o.v), b: div(sd.b, o.v) }
  }
}

export function applyBoth(e: Eq, o: Op): Eq {
  const negScale = (o.k === '×' || o.k === '÷') && o.v.n < 0
  return { L: applySide(e.L, o), R: applySide(e.R, o), rel: negScale ? flip(e.rel) : e.rel }
}

/** x yalnız kaldı mı? Değeri döndürür (x hangi taraftaysa ilişki ona göre normalize edilir) */
export function isolated(e: Eq): { value: R; rel: Rel } | null {
  if (isOne(e.L.a) && zero(e.L.b) && zero(e.R.a)) return { value: e.R.b, rel: e.rel }
  if (isOne(e.R.a) && zero(e.R.b) && zero(e.L.a)) return { value: e.L.b, rel: flip(e.rel) }
  return null
}

const lcm = (a: number, b: number) => (a * b) / (g(a, b) || 1)
const inv = (v: R): Op => (v.n > 0 ? { k: '−', v } : { k: '+', v: r(-v.n, v.d) })

/** Mevcut duruma göre önerilen işlem kartları (yararlı olanlar + birkaç çeldirici), karışık sırada */
export function suggest(e: Eq, extra: Op[] = []): Op[] {
  const m = new Map<string, Op>()
  const put = (o: Op) => {
    if (zero(o.v)) return
    if ((o.k === '×' || o.k === '÷') && isOne(o.v)) return
    m.set(opKey(o), o)
  }
  const bothX = !zero(e.L.a) && !zero(e.R.a)
  let distract = 0
  for (const sd of [e.L, e.R]) {
    if (zero(sd.a)) continue
    if (!zero(sd.b)) {
      put(inv(sd.b))
      if (distract++ < 1) put(sd.b.n > 0 ? { k: '+', v: sd.b } : { k: '−', v: r(-sd.b.n, sd.b.d) })
    }
    if (bothX) put({ ...inv(sd.a), x: true })
  }
  const xs = [e.L, e.R].filter((sd) => !zero(sd.a))
  if (xs.length === 1) {
    const a = xs[0].a
    if (isInt(a)) {
      put({ k: '÷', v: a })
      if (Math.abs(a.n) > 1) put({ k: '×', v: a })
    } else {
      put({ k: '×', v: r(a.d) })
      if (Math.abs(a.n) !== 1) put({ k: '÷', v: r(a.n) })
      put({ k: '÷', v: a })
    }
  }
  if (bothX) {
    const L = [e.L.a.d, e.R.a.d, e.L.b.d, e.R.b.d].reduce(lcm, 1)
    if (L > 1 && L <= 12) put({ k: '×', v: r(L) })
  }
  extra.forEach(put)
  const order = { '+': 0, '−': 1, '×': 2, '÷': 3 }
  return [...m.values()].sort((a, b) => order[a.k] - order[b.k] || Number(!!a.x) - Number(!!b.x) || num(a.v) - num(b.v))
}

/** Bir tarafın değeri (x bilinirken) — terazinin eğimi için */
export const valueAt = (sd: Side, x: number) => num(sd.a) * x + num(sd.b)

/** x yerine değer koyarak bir tarafı yazar: 3·11 + 12 */
export function subst(sd: Side, v: R): string {
  const vs = v.n < 0 ? `(${fmt(v)})` : fmt(v)
  if (zero(sd.a)) return fmt(sd.b)
  const coef = sd.a.n === sd.a.d ? vs : sd.a.n === -sd.a.d ? `−${vs}` : `${fmt(sd.a)}·${vs}`
  if (zero(sd.b)) return coef
  return `${coef} ${sd.b.n < 0 ? '−' : '+'} ${fmt(r(Math.abs(sd.b.n), sd.b.d))}`
}

