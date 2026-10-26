/**
 * Örüntü kuralı ifadeleri için küçük ayrıştırıcı.
 * Belirteçler: rakamlar, değişken (n ya da □), + − × ( )
 * Çarpma işareti yazılmadan da çarpım olur: 3n, 2(n + 1), (n + 1)2 değil.
 * Sonuç: polinom katsayıları [sabit, n, n²]. Çözülemezse null.
 */

export type Tok = string // '0'..'9', 'n', '+', '−', '×', '(', ')'

type Poly = number[]
const add = (a: Poly, b: Poly, s = 1): Poly => [0, 1, 2].map((i) => (a[i] ?? 0) + s * (b[i] ?? 0))
const mul = (a: Poly, b: Poly): Poly | null => {
  const r = [0, 0, 0, 0, 0]
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)))
  if (r[3] || r[4]) return null
  return r.slice(0, 3)
}

type Node = { t: 'num'; v: number } | { t: 'var' } | { t: 'neg'; a: Node } | { t: 'bin'; op: '+' | '−' | '×'; a: Node; b: Node } | { t: 'par'; a: Node }

function lex(toks: Tok[]): string[] {
  const out: string[] = []
  for (const t of toks) {
    if (/\d/.test(t) && out.length && /^\d+$/.test(out[out.length - 1])) out[out.length - 1] += t
    else out.push(t)
  }
  return out
}

export function parse(toks: Tok[]): Node | null {
  const s = lex(toks)
  let i = 0
  const peek = () => s[i]
  const factor = (): Node | null => {
    const t = s[i]
    if (t === undefined) return null
    if (t === '−') {
      i++
      const a = factor()
      return a ? { t: 'neg', a } : null
    }
    if (t === '(') {
      i++
      const a = expr()
      if (!a || s[i] !== ')') return null
      i++
      return { t: 'par', a }
    }
    if (t === 'n') {
      i++
      return { t: 'var' }
    }
    if (/^\d+$/.test(t)) {
      i++
      return { t: 'num', v: Number(t) }
    }
    return null
  }
  const term = (): Node | null => {
    let a = factor()
    if (!a) return null
    for (;;) {
      const t = peek()
      if (t === '×') {
        i++
        const b = factor()
        if (!b) return null
        a = { t: 'bin', op: '×', a, b }
      } else if (t === 'n' || t === '(' || (t && /^\d+$/.test(t) && a.t !== 'num')) {
        // örtük çarpma: 3n, 2(n+1), n(…)
        if (t && /^\d+$/.test(t)) return null // n3 gibi yazımlara izin verme
        const b = factor()
        if (!b) return null
        a = { t: 'bin', op: '×', a, b }
      } else return a
    }
  }
  const expr = (): Node | null => {
    let a = term()
    if (!a) return null
    for (;;) {
      const t = peek()
      if (t === '+' || t === '−') {
        i++
        const b = term()
        if (!b) return null
        a = { t: 'bin', op: t, a, b }
      } else return a
    }
  }
  const root = expr()
  if (!root || i !== s.length) return null
  return root
}

export function poly(n: Node): Poly | null {
  switch (n.t) {
    case 'num':
      return [n.v, 0, 0]
    case 'var':
      return [0, 1, 0]
    case 'par':
      return poly(n.a)
    case 'neg': {
      const a = poly(n.a)
      return a ? a.map((x) => -x) : null
    }
    case 'bin': {
      const a = poly(n.a), b = poly(n.b)
      if (!a || !b) return null
      if (n.op === '+') return add(a, b)
      if (n.op === '−') return add(a, b, -1)
      return mul(a, b)
    }
  }
}

/** Belirteçleri değerlendir: { a: n katsayısı, b: sabit, quad: n² var mı } */
export function linear(toks: Tok[]): { a: number; b: number; quad: boolean } | null {
  const t = parse(toks)
  if (!t) return null
  const p = poly(t)
  if (!p) return null
  return { a: p[1], b: p[0], quad: Math.abs(p[2]) > 1e-9 }
}

/** Değişkenin görünen simgesi (5. sınıfta □) */
export const varSym = (box: boolean) => (box ? '□' : 'n')

/** Belirteçleri okunaklı metne çevir: 2n + (n + 1) */
export function show(toks: Tok[], box = false): string {
  let out = ''
  toks.forEach((t, k) => {
    const prev = toks[k - 1]
    if (t === '+' || t === '−' || t === '×') {
      // başta ya da "(" sonrasında eksi: tekli
      if (t === '−' && (prev === undefined || prev === '(' || prev === '×')) out += '−'
      else out += ` ${t} `
    } else {
      // □ yazımında örtük çarpmayı göster: 2□ → 2 × □, 3(□ − 1) → 3 × (□ − 1)
      if (box && (t === 'n' || t === '(') && prev !== undefined && (/\d/.test(prev) || prev === ')' || prev === 'n')) out += ' × '
      out += t === 'n' ? varSym(box) : t
    }
  })
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Yapı anahtarı: üst düzey toplananların sıralı listesi.
 * "3n + 1" ile "1 + 3n" aynı; "2n + (n + 1)" farklı bir görme biçimi.
 */
export function structureKey(toks: Tok[]): string {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  let sign = '+'
  const push = () => {
    if (cur) parts.push(sign + cur)
    cur = ''
  }
  toks.forEach((t, k) => {
    if (t === '(') depth++
    if (t === ')') depth--
    if (depth === 0 && (t === '+' || t === '−') && k > 0 && toks[k - 1] !== '×' && toks[k - 1] !== '(') {
      push()
      sign = t === '+' ? '+' : '-'
      return
    }
    if (t === '×') return // 3 × n ile 3n aynı
    cur += t
  })
  push()
  return parts.sort().join('|')
}

/** a·n + b biçimi (sadeleşmiş) */
export function linText(a: number, b: number, box = false): string {
  const v = varSym(box)
  const fmt = (x: number) => String(Math.abs(x))
  let s = ''
  if (a) s = a === 1 ? v : a === -1 ? `−${v}` : box ? `${a < 0 ? '−' : ''}${fmt(a)} × ${v}` : `${a < 0 ? '−' : ''}${fmt(a)}${v}`
  if (b) s += s ? (b > 0 ? ` + ${b}` : ` − ${-b}`) : b < 0 ? `−${-b}` : String(b)
  return s || '0'
}
