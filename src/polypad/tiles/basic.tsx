import type { ReactNode } from 'react'
import type { ActionSpec, Props, Pt, Tile, TileDef } from '../types'
import { UNIT, boundsOf, deg, dist, fmt, pad, rad, round, toLocal, toWorld } from '../geom'
import { C, FONT, Label } from './kit'
import { compile } from './expr'

// ---------------------------------------------------------------------------
// Çizgi kalınlığı / stili
// ---------------------------------------------------------------------------

export const WIDTHS = [3, 2, 4, 8] as const
export const dashFor = (style: string | undefined, w: number) => (style === 'dashed' ? `${w * 2.5} ${w * 2}` : style === 'dotted' ? `0.1 ${w * 2.2}` : undefined)

/** Kalın, görünmez dokunma alanı (ince çizgileri parmakla seçebilmek için) */
const Hit = ({ d }: { d: string }) => <path d={d} fill="none" stroke="transparent" strokeWidth={18} strokeLinecap="round" />

// ---------------------------------------------------------------------------
// Kalem çizgisi
// ---------------------------------------------------------------------------

/** Düz nokta dizisinden yumuşatılmış yol */
export function strokePath(pts: number[]): string {
  const n = pts.length / 2
  if (n === 0) return ''
  if (n === 1) return `M${pts[0]} ${pts[1]}l0.01 0`
  if (n === 2) return `M${pts[0]} ${pts[1]}L${pts[2]} ${pts[3]}`
  let d = `M${round(pts[0], 1)} ${round(pts[1], 1)}`
  for (let i = 1; i < n - 1; i++) {
    const x = pts[i * 2]
    const y = pts[i * 2 + 1]
    const mx = (x + pts[i * 2 + 2]) / 2
    const my = (y + pts[i * 2 + 3]) / 2
    d += `Q${round(x, 1)} ${round(y, 1)} ${round(mx, 1)} ${round(my, 1)}`
  }
  return d + `L${round(pts[pts.length - 2], 1)} ${round(pts[pts.length - 1], 1)}`
}

export const strokeStyle = (kind: string, w: number) =>
  kind === 'highlighter' ? { width: w, opacity: 0.4, cap: 'butt' as const } : kind === 'marker' ? { width: w, opacity: 1, cap: 'round' as const } : { width: w, opacity: 1, cap: 'round' as const }

/** Silginin değdiği noktaları atıp kalan parçaları döndürür; değişiklik yoksa null */
export function eraseStroke(t: Tile, world: Pt, r: number): number[][] | null {
  const l = toLocal(t, world)
  const pts: number[] = t.p.pts
  const rr = r + (t.p.w ?? 3) / 2
  let hit = false
  const parts: number[][] = []
  let cur: number[] = []
  for (let i = 0; i < pts.length; i += 2) {
    const inside = Math.hypot(pts[i] - l.x, pts[i + 1] - l.y) < rr
    // İki nokta arası uzunsa (hızlı çizim) aradaki kesimi de denetle
    const prevInside = i > 0 && !inside && distSeg(l, pts[i - 2], pts[i - 1], pts[i], pts[i + 1]) < rr
    if (inside || prevInside) {
      hit = true
      if (cur.length >= 4) parts.push(cur)
      cur = inside ? [] : [pts[i], pts[i + 1]]
    } else cur.push(pts[i], pts[i + 1])
  }
  if (!hit) return null
  if (cur.length >= 4) parts.push(cur)
  return parts
}

function distSeg(p: Pt, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / l)) : 0
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy))
}

function ptsBounds(pts: number[]) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i])
    x1 = Math.max(x1, pts[i])
    y0 = Math.min(y0, pts[i + 1])
    y1 = Math.max(y1, pts[i + 1])
  }
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
}

const stroke: TileDef = {
  type: 'stroke',
  name: () => 'Çizim',
  bounds: (t) => pad(ptsBounds(t.p.pts), (t.p.w ?? 3) / 2 + 2),
  render: (t) => {
    const s = strokeStyle(t.p.kind, t.p.w ?? 3)
    const d = strokePath(t.p.pts)
    return (
      <>
        <Hit d={d} />
        <path d={d} fill="none" stroke={t.color ?? C.dark} strokeOpacity={s.opacity} strokeWidth={s.width} strokeLinecap={s.cap} strokeLinejoin="round" strokeDasharray={dashFor(t.p.dash, s.width)} />
      </>
    )
  },
  colorable: true,
  erasable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Metin kutusu
// ---------------------------------------------------------------------------

let measureCtx: CanvasRenderingContext2D | null | undefined
function textWidth(s: string, size: number, weight = 600) {
  if (measureCtx === undefined) measureCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (!measureCtx) return s.length * size * 0.55
  measureCtx.font = `${weight} ${size}px 'Nunito Variable', ui-rounded, system-ui, sans-serif`
  return measureCtx.measureText(s).width
}

const wrapCache = new Map<string, string[]>()
export function wrapText(text: string, width: number, size: number): string[] {
  const key = `${width}|${size}|${text}`
  const hit = wrapCache.get(key)
  if (hit) return hit
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/(\s+)/)
    let line = ''
    for (const w of words) {
      const next = line + w
      if (line && textWidth(next.trimEnd(), size) > width) {
        out.push(line.trimEnd())
        line = w.trimStart()
        // Çok uzun tek kelimeyi harf harf böl
        while (textWidth(line, size) > width && line.length > 1) {
          let k = line.length - 1
          while (k > 1 && textWidth(line.slice(0, k), size) > width) k--
          out.push(line.slice(0, k))
          line = line.slice(k)
        }
      } else line = next
    }
    out.push(line)
  }
  if (wrapCache.size > 500) wrapCache.clear()
  wrapCache.set(key, out)
  return out
}

const TEXT_PAD = 10
const lineH = (size: number) => size * 1.3

export function textLayout(t: Tile) {
  const size: number = t.p.size ?? 20
  const w: number = t.p.width ?? 200
  const lines = wrapText(t.p.text || '', w - TEXT_PAD * 2, size)
  const h = Math.max(t.p.height ?? 0, lines.length * lineH(size) + TEXT_PAD * 2)
  return { size, w, h, lines }
}

const text: TileDef = {
  type: 'text',
  name: () => 'Metin kutusu',
  create: (p) => ({ color: C.dark, p: { text: p.fill ? 'Metin' : '', width: p.width ?? 200, height: p.height, size: 20, fill: p.fill ?? null, stroke: p.stroke ?? null, shadow: !!p.shadow, align: 'left' } }),
  bounds: (t) => {
    const { w, h } = textLayout(t)
    return { x: -w / 2, y: -h / 2, w, h }
  },
  render: (t, ctx) => {
    const { size, w, h, lines } = textLayout(t)
    const align = t.p.align ?? 'left'
    const x = align === 'center' ? 0 : align === 'right' ? w / 2 - TEXT_PAD : -w / 2 + TEXT_PAD
    const empty = !t.p.text
    return (
      <>
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={5}
          fill={t.p.fill ?? 'transparent'}
          stroke={t.p.stroke ?? (empty && !ctx.thumb ? '#b8b8c8' : 'none')}
          strokeWidth={t.p.stroke ? 2 : 1}
          strokeDasharray={t.p.stroke ? undefined : '4 4'}
          filter={t.p.shadow ? 'url(#pp-shadow)' : undefined}
        />
        <text x={x} y={-h / 2 + TEXT_PAD} fontSize={size} fontWeight={600} fontFamily={FONT} fill={t.color ?? C.dark} textAnchor={align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'} style={{ userSelect: 'none' }}>
          {(empty ? ['Metin yazın…'] : lines).map((l, i) => (
            <tspan key={i} x={x} y={-h / 2 + TEXT_PAD + lineH(size) * i + size} fillOpacity={empty ? 0.4 : 1}>
              {l || ' '}
            </tspan>
          ))}
        </text>
      </>
    )
  },
  handles: (t) => [{ id: 'w', x: (t.p.width ?? 200) / 2, y: 0 }],
  onHandle: (t, _id, l) => {
    const w = Math.max(60, Math.round((l.x + (t.p.width ?? 200) / 2) / 5) * 5)
    // Sol kenar sabit kalsın
    const shift = (w - (t.p.width ?? 200)) / 2
    const c = toWorld(t, { x: shift, y: 0 })
    return { x: c.x, y: c.y, p: { ...t.p, width: w } }
  },
  text: { key: 'text', multiline: true, label: 'Metin' },
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Denklem (küçük matematik dizgicisi)
// ---------------------------------------------------------------------------

type MNode =
  | { k: 't'; s: string; it?: boolean; op?: boolean }
  | { k: 'row'; c: MNode[]; paren?: boolean }
  | { k: 'sup'; b: MNode; e: MNode }
  | { k: 'sub'; b: MNode; e: MNode }
  | { k: 'frac'; n: MNode; d: MNode }
  | { k: 'sqrt'; b: MNode }

const WORDS: Record<string, string> = { pi: 'π', alpha: 'α', beta: 'β', theta: 'θ', infinity: '∞', inf: '∞', deg: '°' }
const FUNCS = ['sin', 'cos', 'tan', 'log', 'ln', 'max', 'min']
const OPS: [string, string][] = [
  ['<=', '≤'],
  ['>=', '≥'],
  ['!=', '≠'],
  ['+-', '±'],
  ['*', '×'],
  ['-', '−'],
  ['+', '+'],
  ['=', '='],
  ['<', '<'],
  ['>', '>'],
  [':', ':'],
  ['·', '·'],
  ['×', '×'],
  ['÷', '÷'],
]

function parseMath(src: string): MNode {
  let i = 0
  const strip = (n: MNode): MNode => (n.k === 'row' && n.paren ? { k: 'row', c: n.c } : n)
  function atom(): MNode | null {
    while (src[i] === ' ') i++
    const ch = src[i]
    if (ch === undefined) return null
    if (ch === '(' || ch === '{' || ch === '[') {
      const close = ch === '(' ? ')' : ch === '{' ? '}' : ']'
      i++
      const r = row(close)
      if (src[i] === close) i++
      return { k: 'row', c: r, paren: ch === '(' }
    }
    if (src.startsWith('sqrt', i) || ch === '√') {
      i += ch === '√' ? 1 : 4
      const b = atom()
      return { k: 'sqrt', b: b ? strip(b) : { k: 't', s: '' } }
    }
    if (/[0-9.,]/.test(ch)) {
      const m = /^[0-9]+(?:[.,][0-9]+)?|^[.,]/.exec(src.slice(i))!
      i += m[0].length
      return { k: 't', s: m[0] }
    }
    if (/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(ch)) {
      const m = /^[a-zA-ZçğıöşüÇĞİÖŞÜ]+/.exec(src.slice(i))![0]
      const w = Object.keys(WORDS).find((k) => m.startsWith(k))
      if (w) {
        i += w.length
        return { k: 't', s: WORDS[w] }
      }
      const f = FUNCS.find((k) => m.startsWith(k))
      if (f) {
        i += f.length
        return { k: 't', s: f }
      }
      i++
      return { k: 't', s: ch, it: true }
    }
    for (const [a, b] of OPS)
      if (src.startsWith(a, i)) {
        i += a.length
        return { k: 't', s: b, op: true }
      }
    i++
    return { k: 't', s: ch }
  }
  function postfix(): MNode | null {
    let a = atom()
    if (!a) return null
    for (;;) {
      if (src[i] === '^') {
        i++
        const e = atom()
        a = { k: 'sup', b: a, e: e ? strip(e) : { k: 't', s: '' } }
      } else if (src[i] === '_') {
        i++
        const e = atom()
        a = { k: 'sub', b: a, e: e ? strip(e) : { k: 't', s: '' } }
      } else return a
    }
  }
  function row(close?: string): MNode[] {
    const out: MNode[] = []
    while (i < src.length && src[i] !== close) {
      const a = postfix()
      if (!a) break
      while (src[i] === ' ') i++
      if (src[i] === '/' && !(a.k === 't' && a.op)) {
        i++
        const d = postfix()
        out.push({ k: 'frac', n: strip(a), d: d ? strip(d) : { k: 't', s: '' } })
      } else out.push(a)
    }
    return out
  }
  return { k: 'row', c: row() }
}

interface MBox {
  w: number
  asc: number
  desc: number
  draw: (x: number, y: number) => ReactNode[]
}

function layout(n: MNode, size: number): MBox {
  switch (n.k) {
    case 't': {
      const gap = n.op ? size * 0.25 : 0
      const w = textWidth(n.s, size, n.it ? 500 : 600) + gap * 2
      return {
        w,
        asc: size * 0.75,
        desc: size * 0.25,
        draw: (x, y) => [
          <text key={`${x},${y}`} x={x + gap} y={y} fontSize={size} fontStyle={n.it ? 'italic' : undefined} fontWeight={n.it ? 500 : 600} fontFamily={n.it ? "Georgia, 'Times New Roman', serif" : FONT}>
            {n.s}
          </text>,
        ],
      }
    }
    case 'row': {
      const kids = n.c.map((c) => layout(c, size))
      const pw = n.paren ? textWidth('(', size) : 0
      const asc = Math.max(size * 0.75, ...kids.map((k) => k.asc))
      const desc = Math.max(size * 0.25, ...kids.map((k) => k.desc))
      const w = kids.reduce((s, k) => s + k.w, 0) + pw * 2
      const tall = asc + desc > size * 1.4
      return {
        w,
        asc,
        desc,
        draw: (x, y) => {
          const out: ReactNode[] = []
          let cx = x
          if (n.paren) {
            out.push(<Paren key={`(${x},${y}`} x={cx} y={y} asc={asc} desc={desc} size={size} tall={tall} />)
            cx += pw
          }
          for (const k of kids) {
            out.push(...k.draw(cx, y))
            cx += k.w
          }
          if (n.paren) out.push(<Paren key={`)${x},${y}`} x={cx} y={y} asc={asc} desc={desc} size={size} tall={tall} close />)
          return out
        },
      }
    }
    case 'sup':
    case 'sub': {
      const b = layout(n.b, size)
      const e = layout(n.e, size * 0.65)
      const up = n.k === 'sup'
      const shift = up ? b.asc * 0.55 + e.desc : -(b.desc + e.asc * 0.5)
      return {
        w: b.w + e.w + 1,
        asc: up ? Math.max(b.asc, shift + e.asc) : b.asc,
        desc: up ? b.desc : Math.max(b.desc, -shift + e.desc),
        draw: (x, y) => [...b.draw(x, y), ...e.draw(x + b.w + 1, y - shift)],
      }
    }
    case 'frac': {
      const s2 = size * 0.85
      const a = layout(n.n, s2)
      const d = layout(n.d, s2)
      const w = Math.max(a.w, d.w) + size * 0.3
      const axis = size * 0.3
      return {
        w: w + size * 0.2,
        asc: axis + a.asc + a.desc + 3,
        desc: d.asc + d.desc + 3 - axis,
        draw: (x, y) => [
          ...a.draw(x + size * 0.1 + (w - a.w) / 2, y - axis - a.desc - 3),
          <line key={`f${x},${y}`} x1={x + size * 0.1} x2={x + size * 0.1 + w} y1={y - axis} y2={y - axis} stroke="currentColor" strokeWidth={Math.max(1.2, size / 16)} />,
          ...d.draw(x + size * 0.1 + (w - d.w) / 2, y - axis + 3 + d.asc),
        ],
      }
    }
    case 'sqrt': {
      const b = layout(n.b, size)
      const hw = size * 0.55
      return {
        w: b.w + hw + 4,
        asc: b.asc + 4,
        desc: b.desc,
        draw: (x, y) => [
          <path
            key={`r${x},${y}`}
            d={`M${x} ${y - size * 0.3}l${hw * 0.25} -${size * 0.08}l${hw * 0.3} ${b.desc + size * 0.38}L${x + hw} ${y - b.asc - 2}H${x + hw + b.w + 4}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={Math.max(1.2, size / 16)}
            strokeLinejoin="round"
          />,
          ...b.draw(x + hw + 2, y),
        ],
      }
    }
  }
}

function Paren({ x, y, asc, desc, size, tall, close }: { x: number; y: number; asc: number; desc: number; size: number; tall: boolean; close?: boolean }) {
  if (!tall)
    return (
      <text x={x} y={y} fontSize={size} fontFamily={FONT} fontWeight={500}>
        {close ? ')' : '('}
      </text>
    )
  const w = textWidth('(', size)
  const x0 = close ? x + w * 0.25 : x + w * 0.8
  const x1 = close ? x + w * 0.8 : x + w * 0.25
  return <path d={`M${x0} ${y - asc}Q${x1} ${y + (desc - asc) / 2} ${x0} ${y + desc}`} fill="none" stroke="currentColor" strokeWidth={Math.max(1.2, size / 16)} />
}

const mathCache = new Map<string, { box: MBox; nodes: ReactNode[] }>()
function typeset(src: string, size: number) {
  const key = `${size}|${src}`
  let hit = mathCache.get(key)
  if (!hit) {
    const box = layout(parseMath(src || '?'), size)
    hit = { box, nodes: box.draw(0, 0) }
    if (mathCache.size > 300) mathCache.clear()
    mathCache.set(key, hit)
  }
  return hit
}

/** Değişkensiz, eşittirsiz ifadeler hesaplanabilir */
const evalFn = (src: string) => (src && !src.includes('=') && !/[a-zçğıöşü]/i.test(src.replace(/sqrt|pi|sin|cos|tan|log|ln|abs/g, '')) ? compile(src) : null)

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a)
}

/** Sonucu ondalık, kesir ya da tam sayılı kesir olarak yazar */
export function formatResult(v: number, mode: string) {
  if (!Number.isFinite(v)) return '?'
  if (mode !== 'decimal' && !Number.isInteger(v)) {
    for (let d = 2; d <= 1000; d++) {
      const n = Math.round(v * d)
      if (Math.abs(n / d - v) < 1e-9) {
        const g = gcd(n, d)
        const nn = n / g
        const dd = d / g
        if (mode === 'mixed' && Math.abs(nn) > dd) {
          const whole = Math.trunc(nn / dd)
          return `${whole} ${Math.abs(nn % dd)}/${dd}`
        }
        return `${nn}/${dd}`
      }
    }
  }
  return String(Math.round(v * 1e6) / 1e6).replace('.', ',')
}

const eqSource = (t: Tile) => {
  const src: string = t.p.src ?? ''
  if (!t.p.evaluate) return src
  const f = evalFn(src)
  return f ? `${src} = ${formatResult(f(), t.p.labels ?? 'fraction')}` : src
}

const equation: TileDef = {
  type: 'equation',
  name: () => 'Denklem',
  create: () => ({ color: C.dark, p: { src: '', size: 28 } }),
  bounds: (t) => {
    const { box } = typeset(eqSource(t), t.p.size ?? 28)
    return pad({ x: -box.w / 2, y: -(box.asc + box.desc) / 2, w: box.w, h: box.asc + box.desc }, 8)
  },
  render: (t, ctx) => {
    const { box, nodes } = typeset(eqSource(t), t.p.size ?? 28)
    const h = box.asc + box.desc
    return (
      <>
        <rect x={-box.w / 2 - 8} y={-h / 2 - 8} width={box.w + 16} height={h + 16} rx={6} fill="transparent" stroke={!t.p.src && !ctx.thumb ? '#b8b8c8' : 'none'} strokeDasharray="4 4" />
        <g transform={`translate(${-box.w / 2} ${-h / 2 + box.asc})`} fill={t.color ?? C.dark} color={t.color ?? C.dark} opacity={t.p.src ? 1 : 0.4} style={{ userSelect: 'none' }}>
          {nodes}
        </g>
      </>
    )
  },
  text: { key: 'src', label: 'Denklem (ör. x^2 + 3/4 = sqrt(9))' },
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Bağlantı çizgisi (parçalara bağlanır, onlar taşınınca uçları da gider)
// ---------------------------------------------------------------------------

type LinePts = { a: Pt; b: Pt }

function curveCtrl(t: Tile, a: Pt, b: Pt): Pt {
  if (t.p.c) return t.p.c
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const l = dist(a, b)
  return { x: m.x + ((a.y - b.y) / (l || 1)) * l * 0.25, y: m.y + ((b.x - a.x) / (l || 1)) * l * 0.25 }
}

function linePath(t: Tile, { a, b }: LinePts) {
  if (t.p.style === 'curved') {
    const c = curveCtrl(t, a, b)
    return `M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`
  }
  if (t.p.style === 'custom') {
    const mx = (a.x + b.x) / 2 + (t.p.m ?? 0)
    return `M${a.x} ${a.y}H${mx}V${b.y}H${b.x}`
  }
  return `M${a.x} ${a.y}L${b.x} ${b.y}`
}

/** Uçtaki ok başı: yön, uca giren teğetten */
function arrowHead(tip: Pt, from: Pt, w: number) {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x)
  const s = 6 + w * 2
  const p1 = { x: tip.x - s * Math.cos(ang - 0.45), y: tip.y - s * Math.sin(ang - 0.45) }
  const p2 = { x: tip.x - s * Math.cos(ang + 0.45), y: tip.y - s * Math.sin(ang + 0.45) }
  return `M${tip.x} ${tip.y}L${p1.x} ${p1.y}L${p2.x} ${p2.y}Z`
}

function tangentFrom(t: Tile, end: 'a' | 'b', pts: LinePts): Pt {
  const { a, b } = pts
  if (t.p.style === 'curved') return curveCtrl(t, a, b)
  if (t.p.style === 'custom') {
    const mx = (a.x + b.x) / 2 + (t.p.m ?? 0)
    return end === 'a' ? { x: mx, y: a.y } : { x: mx, y: b.y }
  }
  return end === 'a' ? b : a
}

/** Uç noktaları dünya koordinatına yeniden kurar ve çizgiyi orta noktasına göre merkezler */
export function lineFrom(t: Tile, wa: Pt, wb: Pt): Partial<Tile> {
  const x = (wa.x + wb.x) / 2
  const y = (wa.y + wb.y) / 2
  // Eğri kontrol noktası dünya konumunu korusun
  const p: Props = { ...t.p, a: { x: round(wa.x - x), y: round(wa.y - y) }, b: { x: round(wb.x - x), y: round(wb.y - y) } }
  if (t.p.c) {
    const wc = toWorld(t, t.p.c)
    p.c = { x: wc.x - x, y: wc.y - y }
  }
  return { x, y, rot: 0, flip: false, p }
}

const endWorld = (t: Tile, end: 'a' | 'b', get: (id: string) => Tile | undefined): Pt => {
  const lid: string | null = t.p.links?.[end] ?? null
  const lt = lid ? get(lid) : undefined
  if (lt && t.p[`l${end}`]) return toWorld(lt, t.p[`l${end}`])
  return toWorld(t, t.p[end])
}

const line: TileDef = {
  type: 'line',
  name: () => 'Çizgi',
  create: (p) => ({
    color: p.color ?? C.dark,
    p: {
      a: p.a ?? { x: -60, y: 20 },
      b: p.b ?? { x: 60, y: -20 },
      style: p.lineStyle ?? p.style ?? 'straight',
      w: p.w ?? 3,
      dash: p.dash ?? 'solid',
      arrowB: p.arrowB ?? true,
      arrowA: false,
      links: { a: null, b: null },
    },
  }),
  bounds: (t) => {
    const pts = [t.p.a, t.p.b]
    if (t.p.style === 'curved') pts.push(curveCtrl(t, t.p.a, t.p.b))
    return pad(boundsOf(pts), 10)
  },
  render: (t) => {
    const pts = { a: t.p.a as Pt, b: t.p.b as Pt }
    const d = linePath(t, pts)
    const w = t.p.w ?? 3
    const color = t.color ?? C.dark
    return (
      <>
        <Hit d={d} />
        <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashFor(t.p.dash, w)} />
        {t.p.arrowB && <path d={arrowHead(pts.b, tangentFrom(t, 'b', pts), w)} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />}
        {t.p.arrowA && <path d={arrowHead(pts.a, tangentFrom(t, 'a', pts), w)} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />}
        {t.p.dotA && <circle cx={pts.a.x} cy={pts.a.y} r={w + 2.5} fill={color} />}
        {t.p.dotB && <circle cx={pts.b.x} cy={pts.b.y} r={w + 2.5} fill={color} />}
      </>
    )
  },
  handles: (t) => {
    const hs = [
      { id: 'a', x: t.p.a.x, y: t.p.a.y },
      { id: 'b', x: t.p.b.x, y: t.p.b.y },
    ]
    if (t.p.style === 'curved') {
      // Tutamak eğrinin üstünde dursun (kontrol noktası ile uçların ortası arası)
      const c = curveCtrl(t, t.p.a, t.p.b)
      const m = { x: (t.p.a.x + t.p.b.x) / 2, y: (t.p.a.y + t.p.b.y) / 2 }
      hs.push({ id: 'c', x: (c.x + m.x) / 2, y: (c.y + m.y) / 2 })
    }
    if (t.p.style === 'custom' && !t.p.pointsLocked) hs.push({ id: 'm', x: (t.p.a.x + t.p.b.x) / 2 + (t.p.m ?? 0), y: (t.p.a.y + t.p.b.y) / 2 })
    return hs
  },
  onHandle: (t, id, l, api, phase) => {
    if (id === 'c') {
      const m = { x: (t.p.a.x + t.p.b.x) / 2, y: (t.p.a.y + t.p.b.y) / 2 }
      return { p: { ...t.p, c: { x: 2 * l.x - m.x, y: 2 * l.y - m.y } } }
    }
    if (id === 'm') return { p: { ...t.p, m: round(l.x - (t.p.a.x + t.p.b.x) / 2) } }
    const end = id as 'a' | 'b'
    const links = { ...(t.p.links ?? {}) }
    let pt = l
    if (phase === 'end') {
      // Bırakılan yerde bir parça varsa ona bağlan
      const w = toWorld(t, l)
      const target = api.tileAt(w, [t.id, ...api.all().filter((x) => x.type === 'line' || x.type === 'stroke').map((x) => x.id)])
      links[end] = target?.id ?? null
      const extra: Record<string, Pt | null> = { [`l${end}`]: target ? toLocal(target, w) : null }
      return { p: { ...t.p, [end]: pt, links, ...extra } }
    }
    pt = { x: round(l.x), y: round(l.y) }
    return { p: { ...t.p, [end]: pt } }
  },
  deps: (t) => [t.p.links?.a, t.p.links?.b].filter(Boolean),
  follow: (t, get) => {
    const has = (e: 'a' | 'b') => !!(t.p.links?.[e] && get(t.p.links[e]))
    if (!has('a') && !has('b')) {
      if (t.p.links?.a || t.p.links?.b) return { p: { ...t.p, links: { a: null, b: null } } }
      return null
    }
    return lineFrom(t, endWorld(t, 'a', get), endWorld(t, 'b', get))
  },
  rotatable: false,
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Geometrik çizimler
// ---------------------------------------------------------------------------

const geoStroke = (t: Tile) => ({ stroke: t.color ?? C.dark, strokeWidth: t.p.w ?? 3, strokeDasharray: dashFor(t.p.dash, t.p.w ?? 3), fill: 'none', strokeLinecap: 'round' as const })

/** Yakındaki geometrik noktalara ve şekil köşelerine yapıştırır (dünya koordinatı) */
export function snapGeo(w: Pt, all: Tile[], exclude: string, r = 12): Pt {
  let best: Pt | null = null
  let bd = r
  for (const o of all) {
    if (o.id === exclude) continue
    const cand: Pt[] = []
    if (o.type === 'geo-point') cand.push({ x: o.x, y: o.y })
    else if (o.type === 'geo-segment') cand.push(toWorld(o, o.p.a), toWorld(o, o.p.b))
    else if (o.type === 'geo-circle') cand.push({ x: o.x, y: o.y })
    for (const c of cand) {
      const d = dist(c, w)
      if (d < bd) {
        bd = d
        best = c
      }
    }
  }
  return best ?? w
}

const geoPoint: TileDef = {
  type: 'geo-point',
  name: (t) => `Nokta ${t.p.label ?? ''}`,
  create: (p) => ({ color: p.color ?? C.dark, p: { label: p.label ?? '' } }),
  bounds: () => ({ x: -10, y: -10, w: 20, h: 20 }),
  render: (t) => (
    <>
      <circle r={14} fill="transparent" />
      <circle r={5} fill={t.color ?? C.dark} stroke="#fff" strokeWidth={1.5} />
      {t.p.label && (
        <Label x={10} y={-12} size={15} anchor="start" color={t.color ?? C.dark}>
          {t.p.label}
        </Label>
      )}
    </>
  ),
  rotatable: false,
  colorable: true,
  edgeSnap: false,
  text: { key: 'label', label: 'Nokta adı' },
}

const geoSegment: TileDef = {
  type: 'geo-segment',
  name: () => 'Doğru parçası',
  create: (p) => ({ color: p.color ?? C.dark, p: { a: p.a ?? { x: -60, y: 0 }, b: p.b ?? { x: 60, y: 0 }, w: p.w ?? 3, dash: p.dash ?? 'solid' } }),
  bounds: (t) => pad(boundsOf([t.p.a, t.p.b]), 8),
  render: (t) => {
    const { a, b } = t.p
    const kind: string = t.p.lineType ?? 'segment'
    const l = dist(a, b) || 1
    const ux = (b.x - a.x) / l
    const uy = (b.y - a.y) / l
    const far = 4000
    // Doğru: iki yana, ışın: b yönünde sonsuza uzanır
    const s0 = kind === 'line' ? { x: a.x - ux * far, y: a.y - uy * far } : a
    const s1 = kind === 'segment' ? b : { x: b.x + ux * far, y: b.y + uy * far }
    const d = `M${s0.x} ${s0.y}L${s1.x} ${s1.y}`
    const color = t.color ?? C.dark
    const w = t.p.w ?? 3
    const arrows: string = t.p.arrows ?? ''
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const marks: string = t.p.marks ?? ''
    const n = marks.endsWith('2') ? 2 : 1
    return (
      <>
        <Hit d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />
        <path d={d} {...geoStroke(t)} />
        <circle cx={a.x} cy={a.y} r={4} fill={color} />
        <circle cx={b.x} cy={b.y} r={4} fill={color} />
        {(arrows === 'end' || arrows === 'both') && <path d={arrowHead(b, a, w)} fill={color} />}
        {(arrows === 'start' || arrows === 'both') && <path d={arrowHead(a, b, w)} fill={color} />}
        {marks.startsWith('bar') &&
          Array.from({ length: n }, (_, i) => {
            const o = (i - (n - 1) / 2) * 6
            const c = { x: m.x + ux * o, y: m.y + uy * o }
            return <path key={i} d={`M${c.x - uy * 8} ${c.y + ux * 8}L${c.x + uy * 8} ${c.y - ux * 8}`} stroke={color} strokeWidth={2} />
          })}
        {marks.startsWith('arrow') &&
          Array.from({ length: n }, (_, i) => {
            const o = (i - (n - 1) / 2) * 7 + 4
            const tip = { x: m.x + ux * o, y: m.y + uy * o }
            return <path key={i} d={`M${tip.x - ux * 7 - uy * 6} ${tip.y - uy * 7 + ux * 6}L${tip.x} ${tip.y}L${tip.x - ux * 7 + uy * 6} ${tip.y - uy * 7 - ux * 6}`} fill="none" stroke={color} strokeWidth={2} />
          })}
        {(t.p.length || t.p.label) && (
          <Label x={m.x} y={m.y - 16} size={14} color={color}>
            {t.p.label || fmt(dist(a, b) / UNIT)}
          </Label>
        )}
      </>
    )
  },
  handles: (t) => [
    { id: 'a', x: t.p.a.x, y: t.p.a.y },
    { id: 'b', x: t.p.b.x, y: t.p.b.y },
  ],
  onHandle: (t, id, l, api) => {
    const w = snapGeo(toWorld(t, l), api.all(), t.id)
    return { p: { ...t.p, [id]: toLocal(t, w) } }
  },
  colorable: true,
  rotatable: false,
  edgeSnap: false,
}

const geoCircle: TileDef = {
  type: 'geo-circle',
  name: () => 'Çember',
  create: (p) => ({ color: p.color ?? C.dark, p: { r: p.r ?? 60, w: p.w ?? 3, dash: p.dash ?? 'solid' } }),
  bounds: (t) => pad({ x: -t.p.r, y: -t.p.r, w: t.p.r * 2, h: t.p.r * 2 }, 4),
  render: (t) => {
    const d = `M${-t.p.r} 0a${t.p.r} ${t.p.r} 0 1 0 ${t.p.r * 2} 0a${t.p.r} ${t.p.r} 0 1 0 ${-t.p.r * 2} 0`
    return (
      <>
        <Hit d={d} />
        <path d={d} {...geoStroke(t)} />
        <circle r={4} fill={t.color ?? C.dark} />
        {t.p.label && <Label y={-t.p.r - 12} size={14} color={t.color ?? C.dark}>{t.p.label}</Label>}
        {t.p.radius && (
          <>
            <path d={`M0 0H${t.p.r}`} {...geoStroke(t)} strokeWidth={1.5} strokeDasharray="4 4" />
            <Label x={t.p.r / 2} y={-12} size={13} color={t.color ?? C.dark}>
              r = {fmt(t.p.r / UNIT)}
            </Label>
          </>
        )}
      </>
    )
  },
  handles: (t) => [{ id: 'r', x: t.p.r, y: 0 }],
  onHandle: (t, _id, l) => ({ p: { ...t.p, r: Math.max(6, round(Math.hypot(l.x, l.y))) } }),
  colorable: true,
  edgeSnap: false,
}

const geoRect: TileDef = {
  type: 'geo-rect',
  name: () => 'Dikdörtgen',
  create: (p) => ({ color: p.color ?? C.dark, p: { w2: p.w2 ?? 120, h2: p.h2 ?? 80, w: p.w ?? 3, dash: p.dash ?? 'solid' } }),
  bounds: (t) => pad({ x: -t.p.w2 / 2, y: -t.p.h2 / 2, w: t.p.w2, h: t.p.h2 }, 4),
  outline: (t) => [
    { x: -t.p.w2 / 2, y: -t.p.h2 / 2 },
    { x: t.p.w2 / 2, y: -t.p.h2 / 2 },
    { x: t.p.w2 / 2, y: t.p.h2 / 2 },
    { x: -t.p.w2 / 2, y: t.p.h2 / 2 },
  ],
  render: (t) => {
    const d = `M${-t.p.w2 / 2} ${-t.p.h2 / 2}h${t.p.w2}v${t.p.h2}h${-t.p.w2}Z`
    return (
      <>
        <Hit d={d} />
        <path d={d} {...geoStroke(t)} strokeLinejoin="round" />
        {t.p.sides && (
          <>
            <Label y={-t.p.h2 / 2 - 12} size={13} color={t.color ?? C.dark}>{fmt(t.p.w2 / UNIT)}</Label>
            <Label x={t.p.w2 / 2 + 8} size={13} anchor="start" color={t.color ?? C.dark}>{fmt(t.p.h2 / UNIT)}</Label>
          </>
        )}
      </>
    )
  },
  handles: (t) => [{ id: 's', x: t.p.w2 / 2, y: t.p.h2 / 2 }],
  onHandle: (t, _id, l) => ({ p: { ...t.p, w2: Math.max(8, round(Math.abs(l.x) * 2)), h2: Math.max(8, round(Math.abs(l.y) * 2)) } }),
  colorable: true,
  edgeSnap: false,
}

const geoAngle: TileDef = {
  type: 'geo-angle',
  name: () => 'Açı',
  create: (p) => ({ color: p.color ?? C.dark, p: { len: p.len ?? 110, a1: p.a1 ?? 0, a2: p.a2 ?? -60, w: p.w ?? 3, dash: p.dash ?? 'solid' } }),
  bounds: (t) => {
    const e1 = { x: t.p.len * Math.cos(rad(t.p.a1)), y: t.p.len * Math.sin(rad(t.p.a1)) }
    const e2 = { x: t.p.len * Math.cos(rad(t.p.a2)), y: t.p.len * Math.sin(rad(t.p.a2)) }
    return pad(boundsOf([{ x: 0, y: 0 }, e1, e2]), 30)
  },
  render: (t) => {
    const { len, a1, a2 } = t.p
    const e1 = { x: len * Math.cos(rad(a1)), y: len * Math.sin(rad(a1)) }
    const e2 = { x: len * Math.cos(rad(a2)), y: len * Math.sin(rad(a2)) }
    // a1'den a2'ye saat yönünün tersine ölçülen açı (ekranda y aşağı)
    const sweep = (((a1 - a2) % 360) + 360) % 360
    const r = 30
    const mid = rad(a1 - sweep / 2)
    const s1 = { x: r * Math.cos(rad(a1)), y: r * Math.sin(rad(a1)) }
    const s2 = { x: r * Math.cos(rad(a2)), y: r * Math.sin(rad(a2)) }
    const d = `M${e1.x} ${e1.y}L0 0L${e2.x} ${e2.y}`
    const color = t.color ?? C.dark
    return (
      <>
        <Hit d={d} />
        {Math.round(sweep) === 90 ? (
          <path d={`M${s1.x * 0.6} ${s1.y * 0.6}L${(s1.x + s2.x) * 0.6} ${(s1.y + s2.y) * 0.6}L${s2.x * 0.6} ${s2.y * 0.6}`} fill="none" stroke={color} strokeWidth={1.5} />
        ) : (
          <path d={`M0 0L${s1.x} ${s1.y}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${s2.x} ${s2.y}Z`} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
        )}
        <path d={d} {...geoStroke(t)} strokeLinejoin="round" />
        <Label x={(r + 20) * Math.cos(mid)} y={(r + 20) * Math.sin(mid)} size={14} color={color}>
          {fmt(sweep, 1)}°
        </Label>
      </>
    )
  },
  handles: (t) => [
    { id: 'a1', x: t.p.len * Math.cos(rad(t.p.a1)), y: t.p.len * Math.sin(rad(t.p.a1)) },
    { id: 'a2', x: t.p.len * Math.cos(rad(t.p.a2)), y: t.p.len * Math.sin(rad(t.p.a2)) },
  ],
  onHandle: (t, id, l) => {
    // 1 derecelik adımlarla yapış
    const a = Math.round(deg(Math.atan2(l.y, l.x)))
    return { p: { ...t.p, [id]: a, len: Math.max(40, round(Math.hypot(l.x, l.y))) } }
  },
  colorable: true,
  edgeSnap: false,
}

export const basicTiles: TileDef[] = [stroke, text, equation, line, geoPoint, geoSegment, geoCircle, geoRect, geoAngle]

/** Eylem çubuğu (Polypad eylemleri) */
const pp = (patch: Record<string, unknown>) => ({ p: patch })
const GEO = ['geo-segment', 'geo-circle', 'geo-rect', 'geo-angle', 'geo-point']

export const basicActions: ActionSpec[] = [
  // Bağlantı çizgisi
  {
    id: 'line-style',
    type: 'select',
    tileTypes: ['line'],
    label: 'Tür:',
    location: 'more',
    options: [
      { key: 'straight', label: 'Düz' },
      { key: 'curved', label: 'Eğri' },
      { key: 'custom', label: 'Kırık' },
    ],
    get: (t) => t.p.style,
    set: (v: string) => pp({ style: v, c: undefined, m: 0 }),
  },
  {
    id: 'length',
    type: 'input',
    tileTypes: ['line'],
    label: 'Uzunluk:',
    location: 'more',
    value: 'number',
    show: (ts) => ts.every((t) => t.p.style === 'straight'),
    get: (t) => round(dist(t.p.a, t.p.b) / UNIT, 2),
    set: (v: number, t) => {
      // Başlangıç ucu sabit, bitiş ucu aynı yönde uzar
      const { a, b } = t.p
      const l = dist(a, b) || 1
      const nb = { x: a.x + ((b.x - a.x) / l) * v * UNIT, y: a.y + ((b.y - a.y) / l) * v * UNIT }
      return lineFrom({ ...t, p: { ...t.p, links: { ...(t.p.links ?? {}), b: null } } }, toWorld(t, a), toWorld(t, nb))
    },
  },
  ...(['a', 'b'] as const).map(
    (end): ActionSpec => ({
      id: `${end === 'a' ? 'start' : 'end'}-style`,
      type: 'select',
      tileTypes: ['line'],
      label: end === 'a' ? 'Başlangıç ucu:' : 'Bitiş ucu:',
      location: 'more',
      options: [
        { key: 'none', label: 'Yok' },
        { key: 'arrow', label: 'Ok' },
        { key: 'endpoint', label: 'Nokta' },
      ],
      get: (t) => (t.p[`arrow${end.toUpperCase()}`] ? 'arrow' : t.p[`dot${end.toUpperCase()}`] ? 'endpoint' : 'none'),
      set: (v: string) => pp({ [`arrow${end.toUpperCase()}`]: v === 'arrow', [`dot${end.toUpperCase()}`]: v === 'endpoint' }),
    }),
  ),
  {
    id: 'lock-points',
    type: 'button',
    tileTypes: ['line'],
    label: 'Noktaları kilitle',
    text: true,
    show: (ts) => ts.every((t) => t.p.style === 'custom' && !t.p.pointsLocked),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { pointsLocked: true })),
  },

  // Denklem
  {
    id: 'set-eval',
    type: 'button',
    tileTypes: ['equation'],
    label: 'Hesapla',
    icon: 'calculate',
    text: true,
    order: 1,
    show: (ts) => ts.every((t) => !t.p.evaluate && !!evalFn(t.p.src ?? '')),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { evaluate: true })),
  },
  {
    id: 'unset-eval',
    type: 'button',
    tileTypes: ['equation'],
    label: 'Sonucu gizle',
    text: true,
    order: 1,
    show: (ts) => ts.every((t) => t.p.evaluate),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { evaluate: false })),
  },
  {
    id: 'value-display',
    type: 'select',
    tileTypes: ['equation'],
    label: 'Sonuç biçimi:',
    location: 'more',
    options: [
      { key: 'decimal', label: 'Ondalık' },
      { key: 'fraction', label: 'Kesir' },
      { key: 'mixed', label: 'Tam sayılı kesir' },
    ],
    get: (t) => t.p.labels ?? 'fraction',
    set: (v: string) => pp({ labels: v }),
  },
  { id: 'eq-size', type: 'input', tileTypes: ['equation'], label: 'Yazı boyutu:', location: 'more', value: 'number', range: [12, 120], step: 4, get: (t) => t.p.size ?? 28, set: (v: number) => pp({ size: v }) },

  // Metin kutusu (Polypad'de biçimlendirme metin içinde; boyut, hizalama ve arka plan ⋯ menüsünde)
  { id: 'text-size', type: 'input', tileTypes: ['text'], label: 'Yazı boyutu:', location: 'more', value: 'number', range: [10, 96], step: 2, get: (t) => t.p.size ?? 20, set: (v: number) => pp({ size: v }) },
  {
    id: 'text-align',
    type: 'select',
    tileTypes: ['text'],
    label: 'Hizalama:',
    location: 'more',
    options: [
      { key: 'left', label: 'Sola' },
      { key: 'center', label: 'Ortaya' },
      { key: 'right', label: 'Sağa' },
    ],
    get: (t) => t.p.align ?? 'left',
    set: (v: string) => pp({ align: v }),
  },
  { id: 'text-fill', type: 'checkbox', tileTypes: ['text'], label: 'Arka plan:', location: 'more', get: (t) => !!t.p.fill, set: (v: boolean) => pp(v ? { fill: '#dfe189', stroke: '#111111' } : { fill: null, stroke: null }) },
  { id: 'drop-shadow', type: 'checkbox', tileTypes: ['text'], label: 'Gölge:', author: true, location: 'more', get: (t) => !!t.p.shadow, set: (v: boolean) => pp({ shadow: v }) },

  // Geometrik çizimler
  {
    id: 'geo-line-style',
    type: 'select',
    tileTypes: ['geo-segment'],
    label: 'Çizgi türü:',
    location: 'more',
    options: [
      { key: 'line', label: 'Doğru' },
      { key: 'ray', label: 'Işın' },
      { key: 'segment', label: 'Doğru parçası' },
    ],
    get: (t) => t.p.lineType ?? 'segment',
    set: (v: string) => pp({ lineType: v }),
  },
  {
    id: 'arrows',
    type: 'select',
    tileTypes: ['geo-segment'],
    label: 'Oklar:',
    location: 'more',
    options: [
      { key: '', label: 'Yok' },
      { key: 'start', label: 'Başta' },
      { key: 'end', label: 'Sonda' },
      { key: 'both', label: 'İki uçta' },
    ],
    get: (t) => t.p.arrows ?? '',
    set: (v: string) => pp({ arrows: v }),
  },
  {
    id: 'marks',
    type: 'select',
    tileTypes: ['geo-segment'],
    label: 'İşaret:',
    location: 'more',
    options: [
      { key: '', label: 'Yok' },
      { key: 'bar', label: 'Tek çizgi' },
      { key: 'bar2', label: 'Çift çizgi' },
      { key: 'arrow', label: 'Tek ok' },
      { key: 'arrow2', label: 'Çift ok' },
    ],
    get: (t) => t.p.marks ?? '',
    set: (v: string) => pp({ marks: v }),
  },
  { id: 'geo-label', type: 'input', tileTypes: GEO, label: 'Etiket:', location: 'more', value: 'text', get: (t) => t.p.label ?? '', set: (v: string) => pp({ label: v }) },
  { id: 'show-length', type: 'checkbox', tileTypes: ['geo-segment'], label: 'Uzunluğu göster:', location: 'more', get: (t) => !!t.p.length, set: (v: boolean) => pp({ length: v }) },
  { id: 'show-radius', type: 'checkbox', tileTypes: ['geo-circle'], label: 'Yarıçapı göster:', location: 'more', get: (t) => !!t.p.radius, set: (v: boolean) => pp({ radius: v }) },
  { id: 'show-sides', type: 'checkbox', tileTypes: ['geo-rect'], label: 'Kenar uzunlukları:', location: 'more', get: (t) => !!t.p.sides, set: (v: boolean) => pp({ sides: v }) },
]
