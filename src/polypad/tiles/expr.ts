/**
 * Güvenli ifade ayrıştırıcı ve hesaplayıcı (eval / new Function kullanmaz).
 * Desteklenenler: ondalık virgül ya da nokta, + − × ÷ ^, parantez, |mutlak değer|,
 * örtük çarpma (2x, 3(x+1), xy), sqrt sin cos tan abs ln log exp round floor ceil, pi ve e.
 */

export type Vars = Record<string, number>
type Node = (v: Vars) => number

const FUNCS: Record<string, (a: number) => number> = {
  sqrt: Math.sqrt,
  karekok: Math.sqrt,
  sin: (a) => Math.sin(a),
  cos: (a) => Math.cos(a),
  tan: (a) => Math.tan(a),
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
}
const CONSTS: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E }

type Tok = { k: 'num'; v: number } | { k: 'id'; v: string } | { k: 'op'; v: string }

function normalize(src: string) {
  return src
    .replace(/[−–]/g, '-')
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
}

function tokenize(src: string): Tok[] | null {
  const s = normalize(src)
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (/[0-9]/.test(c) || ((c === '.' || c === ',') && /[0-9]/.test(s[i + 1] ?? ''))) {
      let j = i
      let seenSep = false
      while (j < s.length && (/[0-9]/.test(s[j]) || (!seenSep && (s[j] === '.' || s[j] === ',') && /[0-9]/.test(s[j + 1] ?? '')))) {
        if (s[j] === '.' || s[j] === ',') seenSep = true
        j++
      }
      out.push({ k: 'num', v: Number(s.slice(i, j).replace(',', '.')) })
      i = j
      continue
    }
    if (/[a-zA-Zπ]/.test(c)) {
      let j = i
      while (j < s.length && /[a-zA-Zπ]/.test(s[j])) j++
      const word = s.slice(i, j)
      const lw = word.toLowerCase()
      if (FUNCS[lw] || CONSTS[lw] !== undefined) out.push({ k: 'id', v: lw })
      else {
        // Bilinmeyen çok harfli sözcük: harflerin çarpımı (xy → x·y). Sonunda bir fonksiyon adı varsa onu ayır (2xsin(x)).
        let rest = word
        while (rest) {
          const fn = Object.keys(FUNCS).find((f) => rest.toLowerCase().startsWith(f))
          if (fn) {
            out.push({ k: 'id', v: fn })
            rest = rest.slice(fn.length)
          } else {
            out.push({ k: 'id', v: rest[0] })
            rest = rest.slice(1)
          }
        }
      }
      i = j
      continue
    }
    if ('+-*/^()|'.includes(c)) {
      out.push({ k: 'op', v: c })
      i++
      continue
    }
    return null
  }
  return out
}

class Parser {
  i = 0
  constructor(private t: Tok[]) {}
  peek() {
    return this.t[this.i]
  }
  isOp(v: string) {
    const p = this.peek()
    return p?.k === 'op' && p.v === v
  }
  eat(v: string) {
    if (!this.isOp(v)) throw new Error(`'${v}' bekleniyordu`)
    this.i++
  }
  expr(): Node {
    let a = this.term()
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.t[this.i++] as { v: string }).v
      const l = a
      const r = this.term()
      a = op === '+' ? (v) => l(v) + r(v) : (v) => l(v) - r(v)
    }
    return a
  }
  startsPrimary() {
    const p = this.peek()
    return !!p && (p.k === 'num' || p.k === 'id' || (p.k === 'op' && p.v === '('))
  }
  term(): Node {
    let a = this.unary()
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = (this.t[this.i++] as { v: string }).v
        const l = a
        const r = this.unary()
        a = op === '*' ? (v) => l(v) * r(v) : (v) => l(v) / r(v)
      } else if (this.startsPrimary()) {
        const l = a
        const r = this.power()
        a = (v) => l(v) * r(v)
      } else return a
    }
  }
  unary(): Node {
    if (this.isOp('-')) {
      this.i++
      const a = this.unary()
      return (v) => -a(v)
    }
    if (this.isOp('+')) {
      this.i++
      return this.unary()
    }
    return this.power()
  }
  power(): Node {
    const base = this.primary()
    if (this.isOp('^')) {
      this.i++
      const ex = this.unary()
      return (v) => base(v) ** ex(v)
    }
    return base
  }
  primary(): Node {
    const p = this.peek()
    if (!p) throw new Error('ifade eksik')
    if (p.k === 'num') {
      this.i++
      const n = p.v
      return () => n
    }
    if (p.k === 'id') {
      this.i++
      const fn = FUNCS[p.v]
      if (fn) {
        let arg: Node
        if (this.isOp('(')) {
          this.i++
          arg = this.expr()
          this.eat(')')
        } else arg = this.power()
        return (v) => fn(arg(v))
      }
      const c = CONSTS[p.v]
      if (c !== undefined) return () => c
      const name = p.v
      return (v) => (name in v ? v[name] : NaN)
    }
    if (p.v === '(') {
      this.i++
      const a = this.expr()
      this.eat(')')
      return a
    }
    if (p.v === '|') {
      this.i++
      const a = this.expr()
      this.eat('|')
      return (v) => Math.abs(a(v))
    }
    throw new Error(`beklenmeyen '${p.v}'`)
  }
}

const cache = new Map<string, Node | null>()

/** İfadeyi derler; sözdizimi hatasında null döner. Tanımsız değişken NaN verir. */
export function compile(src: string): ((vars?: Vars) => number) | null {
  const key = src.trim()
  if (!cache.has(key)) {
    let node: Node | null = null
    const toks = tokenize(key)
    if (toks && toks.length) {
      try {
        const p = new Parser(toks)
        const n = p.expr()
        node = p.i === toks.length ? n : null
      } catch {
        node = null
      }
    }
    if (cache.size > 500) cache.clear()
    cache.set(key, node)
  }
  const n = cache.get(key)
  return n ? (vars: Vars = {}) => n(vars) : null
}

/** "y = 2x + 1", "f(x) = x²" ya da yalnızca "2x + 1" → sağ taraf */
export const rhs = (src: string) => {
  const i = src.indexOf('=')
  return i >= 0 ? src.slice(i + 1) : src
}

/** Tek seferlik hesaplama */
export function evaluate(src: string, vars: Vars = {}): number {
  const f = compile(src)
  return f ? f(vars) : NaN
}
