import type { Activity, ThemeNotes, Visual } from '../types'

/*
 * 8. SINIF — Van de Walle yaklaşımıyla etkinlikler.
 * Her öğrenme çıktısında etkinlikler somut → model → sembol → problem sırasıyla dizilir.
 * Her etkinlik: Başlarken (launch) → Keşfet (oyun) → Düşün ve Paylaş (reflect).
 */

// ---------------------------------------------------------------------------
// Bu dosyaya özel küçük SVG yardımcıları (geometrik olarak doğru çizimler)
// ---------------------------------------------------------------------------

type Pt = [number, number]
const INK = '#1f2340'
const SIDE = '#4f46e5'
const ANG = '#ea580c'
const IV = '#6366f1'
const GRID = '#d9dbea'

const r1 = (n: number) => Math.round(n * 10) / 10
const unit = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}
const sub = (p: Pt, q: Pt): Pt => [p[0] - q[0], p[1] - q[1]]
const txt = (p: Pt, s: string, color: string, size = 14, anchor = 'middle') =>
  `<text x="${r1(p[0])}" y="${r1(p[1])}" text-anchor="${anchor}" dominant-baseline="central" font-size="${size}" font-weight="800" fill="${color}">${s}</text>`
const svg = (w: number, h: number, body: string): Visual => ({ kind: 'svg', svg: `<svg viewBox="0 0 ${r1(w)} ${r1(h)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>` })
const neg = (v: number) => (v < 0 ? '−' + -v : String(v)).replace('.', ',')

interface TriSpec {
  /** a = |BC|, b = |AC|, c = |AB| (gerçek oranlarla çizilir) */
  a: number
  b: number
  c: number
  names?: [string, string, string]
  sides?: { a?: string; b?: string; c?: string }
  angles?: { A?: string; B?: string; C?: string }
  right?: 'A' | 'B' | 'C'
  fill?: string
}

/** A, B, C köşeleri: B(0,0), C(a,0) */
function triPoints(t: TriSpec): [Pt, Pt, Pt] {
  const x = (t.c * t.c + t.a * t.a - t.b * t.b) / (2 * t.a)
  const y = Math.sqrt(Math.max(0, t.c * t.c - x * x))
  return [[x, y], [0, 0], [t.a, 0]]
}

function triBox(t: TriSpec) {
  const p = triPoints(t)
  const xs = p.map((q) => q[0])
  return { minx: Math.min(...xs), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...p.map((q) => q[1])) }
}

function triParts(t: TriSpec, s: number, ox: number, oy: number): string {
  const { minx } = triBox(t)
  const pts = triPoints(t).map(([x, y]) => [ox + (x - minx) * s, oy - y * s] as Pt)
  const [A, B, C] = pts
  const G: Pt = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3]
  const names = t.names ?? ['A', 'B', 'C']
  const away = (p: Pt, d: number): Pt => {
    const u = unit(sub(p, G))
    return [p[0] + u[0] * d, p[1] + u[1] * d]
  }
  let out = `<polygon points="${pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ')}" fill="${t.fill ?? '#e0e7ff'}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  const keys = ['A', 'B', 'C'] as const
  keys.forEach((k, i) => {
    const V = pts[i], u1 = unit(sub(pts[(i + 1) % 3], V)), u2 = unit(sub(pts[(i + 2) % 3], V))
    if (t.right === k) {
      const q = 12
      out += `<path d="M${r1(V[0] + u1[0] * q)} ${r1(V[1] + u1[1] * q)} L${r1(V[0] + u1[0] * q + u2[0] * q)} ${r1(V[1] + u1[1] * q + u2[1] * q)} L${r1(V[0] + u2[0] * q)} ${r1(V[1] + u2[1] * q)}" fill="none" stroke="${INK}" stroke-width="1.8"/>`
    }
    const lab = t.angles?.[k]
    if (lab) {
      const bis = unit([u1[0] + u2[0], u1[1] + u2[1]])
      const theta = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])))
      const d = Math.max(26, Math.min(58, 15 / Math.sin(theta / 2)))
      out += txt([V[0] + bis[0] * d, V[1] + bis[1] * d], lab, ANG, 12)
    }
    out += txt(away(V, 15), names[i], INK, 15)
  })
  // Kenar etiketi: kenarın orta noktasından, kenara dik ve üçgenin dışına doğru
  const sideLabel = (p: Pt, q: Pt, label: string) => {
    const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    const d = unit(sub(q, p))
    let n: Pt = [-d[1], d[0]]
    if (n[0] * (m[0] - G[0]) + n[1] * (m[1] - G[1]) < 0) n = [-n[0], -n[1]]
    const half = label.length * 3.8
    const k = 7 + half * Math.abs(n[0]) + 7 * Math.abs(n[1])
    return txt([m[0] + n[0] * k, m[1] + n[1] * k], label, SIDE, 13)
  }
  if (t.sides?.a) out += sideLabel(B, C, t.sides.a)
  if (t.sides?.b) out += sideLabel(A, C, t.sides.b)
  if (t.sides?.c) out += sideLabel(A, B, t.sides.c)
  return out
}

/** Tek üçgen */
function tri(t: TriSpec): Visual {
  const W = 260, H = 200, pad = 36
  const { w, h } = triBox(t)
  const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h)
  const ox = (W - w * s) / 2, oy = (H + h * s) / 2
  return svg(W, H, triParts(t, s, ox, oy))
}

/** Aynı ölçekte yan yana iki üçgen (eşlik/benzerlik) */
function twoTri(t1: TriSpec, t2: TriSpec): Visual {
  const W = 380, H = 210, pad = 44, gap = 64
  const b1 = triBox(t1), b2 = triBox(t2)
  const s = Math.min((W - 2 * pad - gap) / (b1.w + b2.w), (H - 2 * pad) / Math.max(b1.h, b2.h))
  const oy = (H + Math.max(b1.h, b2.h) * s) / 2
  const ox1 = (W - (b1.w + b2.w) * s - gap) / 2
  const ox2 = ox1 + b1.w * s + gap
  return svg(W, H, triParts(t1, s, ox1, oy) + triParts({ ...t2, fill: t2.fill ?? '#fde68a' }, s, ox2, oy))
}

const DEG = Math.PI / 180
/** B ve C açılarından üçgen (A = 180 − B − C) */
const byAngles = (B: number, C: number, extra: Partial<TriSpec> = {}): TriSpec => ({
  a: Math.sin((180 - B - C) * DEG) * 10,
  b: Math.sin(B * DEG) * 10,
  c: Math.sin(C * DEG) * 10,
  ...extra,
})
const scaled = (t: TriSpec, k: number, extra: Partial<TriSpec> = {}): TriSpec => ({ ...t, a: t.a * k, b: t.b * k, c: t.c * k, ...extra })

/** Sayı doğrusunda aralık. a/b = null ise o yönde sonsuz */
function interval(min: number, max: number, a: number | null, b: number | null, closedA = true, closedB = true): Visual {
  const W = 340, pad = 28, y = 34
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad)
  let s = `<line x1="${pad - 18}" y1="${y}" x2="${W - pad + 18}" y2="${y}" stroke="${INK}" stroke-width="2"/>`
  s += `<path d="M${W - pad + 22} ${y} l-9 -5 v10 z M${pad - 22} ${y} l9 -5 v10 z" fill="${INK}"/>`
  for (let v = min; v <= max; v++) {
    s += `<line x1="${r1(x(v))}" y1="${y - 6}" x2="${r1(x(v))}" y2="${y + 6}" stroke="${INK}" stroke-width="1.5"/>`
    s += `<text x="${r1(x(v))}" y="${y + 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}">${neg(v)}</text>`
  }
  const xa = a === null ? pad - 14 : x(a), xb = b === null ? W - pad + 14 : x(b)
  s += `<line x1="${r1(xa)}" y1="${y}" x2="${r1(xb)}" y2="${y}" stroke="${IV}" stroke-width="6"/>`
  if (a === null) s += `<path d="M${pad - 24} ${y} l12 -8 v16 z" fill="${IV}"/>`
  if (b === null) s += `<path d="M${W - pad + 24} ${y} l-12 -8 v16 z" fill="${IV}"/>`
  const dot = (v: number, closed: boolean) => `<circle cx="${r1(x(v))}" cy="${y}" r="6.5" fill="${closed ? IV : '#fff'}" stroke="${IV}" stroke-width="3"/>`
  if (a !== null) s += dot(a, closedA)
  if (b !== null) s += dot(b, closedB)
  return svg(W, 66, s)
}

/** Tam sayı işaretli sayı doğrusu + üstte etiketli noktalar (karekök tahmini için) */
function markLine(min: number, max: number, marks: { v: number; label: string; color?: string }[]): Visual {
  const W = 340, pad = 26, y = 46
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad)
  let s = `<line x1="${pad - 14}" y1="${y}" x2="${W - pad + 14}" y2="${y}" stroke="${INK}" stroke-width="2"/>`
  for (let v = min; v <= max; v++) {
    s += `<line x1="${r1(x(v))}" y1="${y - 6}" x2="${r1(x(v))}" y2="${y + 6}" stroke="${INK}" stroke-width="1.5"/>`
    s += `<text x="${r1(x(v))}" y="${y + 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}">${neg(v)}</text>`
  }
  marks.forEach((m) => {
    const c = m.color ?? IV
    s += `<circle cx="${r1(x(m.v))}" cy="${y}" r="5.5" fill="${c}"/>`
    s += txt([x(m.v), y - 20], m.label, c, 13)
  })
  return svg(W, 78, s)
}

/** Kareli zeminde çokgenler (y yukarı doğru artar) */
function gridShapes(cols: number, rows: number, shapes: { pts: Pt[]; color: string; labels?: string[] }[]): Visual {
  const c = 24, pad = 14
  const X = (x: number) => pad + x * c, Y = (y: number) => pad + (rows - y) * c
  let s = ''
  for (let i = 0; i <= cols; i++) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(rows)}" stroke="${GRID}"/>`
  for (let j = 0; j <= rows; j++) s += `<line x1="${X(0)}" y1="${Y(j)}" x2="${X(cols)}" y2="${Y(j)}" stroke="${GRID}"/>`
  shapes.forEach((sh) => {
    s += `<polygon points="${sh.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="${sh.color}" fill-opacity="0.35" stroke="${sh.color}" stroke-width="2.5" stroke-linejoin="round"/>`
    if (sh.labels) {
      const gx = sh.pts.reduce((a, p) => a + p[0], 0) / sh.pts.length, gy = sh.pts.reduce((a, p) => a + p[1], 0) / sh.pts.length
      sh.pts.forEach((p, i) => {
        const u = unit([p[0] - gx, -(p[1] - gy)])
        s += txt([X(p[0]) + u[0] * 11, Y(p[1]) + u[1] * 11], sh.labels![i], INK, 12)
      })
    }
  })
  return svg(cols * c + 2 * pad, rows * c + 2 * pad, s)
}

/** Basit akış şeması */
function flow(steps: string[]): Visual {
  const W = 320, bh = 26, gap = 12
  let s = `<defs><marker id="ok8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${INK}"/></marker></defs>`
  steps.forEach((st, i) => {
    const y = 6 + i * (bh + gap)
    const term = i === 0 || i === steps.length - 1
    s += `<rect x="60" y="${y}" width="200" height="${bh}" rx="${term ? 13 : 5}" fill="${term ? '#dcfce7' : '#e0e7ff'}" stroke="${INK}" stroke-width="1.8"/>`
    s += txt([160, y + bh / 2], st, INK, 13)
    if (i < steps.length - 1) s += `<line x1="160" y1="${y + bh}" x2="160" y2="${y + bh + gap - 1}" stroke="${INK}" stroke-width="1.8" marker-end="url(#ok8)"/>`
  })
  return svg(W, 12 + steps.length * (bh + gap) - gap, s)
}

/** Silindir açınımı */
function cylNet(rLabel: string, hLabel: string): Visual {
  const s =
    `<circle cx="110" cy="32" r="26" fill="#fde68a" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="110" y1="32" x2="136" y2="32" stroke="${INK}" stroke-width="1.5"/>` + txt([178, 32], rLabel, INK, 12) +
    `<rect x="20" y="58" width="180" height="90" fill="#e0e7ff" stroke="${INK}" stroke-width="2"/>` +
    txt([110, 100], 'yanal yüzey', SIDE, 12) + txt([110, 136], '2πr', ANG, 13) + txt([246, 103], hLabel, INK, 12) +
    `<circle cx="110" cy="174" r="26" fill="#fde68a" stroke="${INK}" stroke-width="2"/>`
  return svg(290, 204, s)
}

/** Koni açınımı: daire dilimi + taban dairesi */
function coneNet(): Visual {
  const cx = 140, top = 14, R = 92, r = 30
  const p = (deg: number): Pt => [cx + R * Math.cos(deg * DEG), top + R * Math.sin(deg * DEG)]
  const [x1, y1] = p(28), [x2, y2] = p(152)
  let s = `<path d="M${cx} ${top} L${r1(x1)} ${r1(y1)} A${R} ${R} 0 0 1 ${r1(x2)} ${r1(y2)} Z" fill="#e0e7ff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  s += `<circle cx="${cx}" cy="${top + R + r}" r="${r}" fill="#fde68a" stroke="${INK}" stroke-width="2"/>`
  s += txt([cx + 76, 34], 'ana doğru', SIDE, 11, 'start')
  s += txt([cx, top + R - 14], 'yay', ANG, 12)
  s += txt([cx, top + R + r], 'taban', INK, 12)
  return svg(300, top + R + 2 * r + 10, s)
}

/** Dikey ekseni istenen değerden başlayan sütun grafiği */
function barChart(data: { label: string; value: number }[], yMin: number, yMax: number, step: number, title: string): Visual {
  const W = 300, top = 34, bottom = 170, left = 52
  const Y = (v: number) => bottom - ((v - yMin) / (yMax - yMin)) * (bottom - top)
  let s = txt([W / 2, 14], title, INK, 13)
  for (let v = yMin; v <= yMax; v += step) {
    s += `<line x1="${left}" y1="${r1(Y(v))}" x2="${W - 16}" y2="${r1(Y(v))}" stroke="${GRID}"/>`
    s += `<text x="${left - 6}" y="${r1(Y(v)) + 4}" text-anchor="end" font-size="11" fill="${INK}">${v}</text>`
  }
  s += `<line x1="${left}" y1="${top - 6}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="2"/><line x1="${left}" y1="${bottom}" x2="${W - 16}" y2="${bottom}" stroke="${INK}" stroke-width="2"/>`
  const bw = 46, gapW = (W - 16 - left - data.length * bw) / (data.length + 1)
  data.forEach((d, i) => {
    const x = left + gapW + i * (bw + gapW)
    s += `<rect x="${r1(x)}" y="${r1(Y(d.value))}" width="${bw}" height="${r1(bottom - Y(d.value))}" fill="${['#f97316', '#3b82f6', '#22c55e'][i % 3]}"/>`
    s += txt([x + bw / 2, bottom + 14], d.label, INK, 12)
  })
  return svg(W, 196, s)
}

/** Çizgi grafiği. ref: kesikli referans çizgisi (ör. teorik olasılık) */
function lineChart(labels: string[], values: number[], yMin: number, yMax: number, yStep: number, title: string, ref?: { v: number; label: string }): Visual {
  const W = 320, top = 32, bottom = 170, left = 46, right = W - 14
  const Y = (v: number) => bottom - ((v - yMin) / (yMax - yMin)) * (bottom - top)
  const X = (i: number) => left + ((i + 0.5) * (right - left)) / labels.length
  let s = txt([W / 2, 14], title, INK, 13)
  for (let k = 0; yMin + k * yStep <= yMax + 1e-9; k++) {
    const v = yMin + k * yStep
    s += `<line x1="${left}" y1="${r1(Y(v))}" x2="${right}" y2="${r1(Y(v))}" stroke="${GRID}"/>`
    s += `<text x="${left - 6}" y="${r1(Y(v)) + 4}" text-anchor="end" font-size="11" fill="${INK}">${neg(Math.round(v * 100) / 100)}</text>`
  }
  s += `<line x1="${left}" y1="${top - 6}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="2"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${INK}" stroke-width="2"/>`
  if (ref) {
    s += `<line x1="${left}" y1="${r1(Y(ref.v))}" x2="${right}" y2="${r1(Y(ref.v))}" stroke="${ANG}" stroke-width="2" stroke-dasharray="6 4"/>`
    s += txt([right - 4, Y(ref.v) - 10], ref.label, ANG, 11, 'end')
  }
  s += `<polyline points="${values.map((v, i) => `${r1(X(i))},${r1(Y(v))}`).join(' ')}" fill="none" stroke="${SIDE}" stroke-width="2.5" stroke-linejoin="round"/>`
  values.forEach((v, i) => {
    s += `<circle cx="${r1(X(i))}" cy="${r1(Y(v))}" r="4" fill="${SIDE}"/>`
    s += txt([X(i), bottom + 14], labels[i], INK, 11)
  })
  return svg(W, 196, s)
}

/** Nokta grafiği (bir ya da daha çok satır) */
function dotPlot(rows: { label?: string; values: number[] }[], min: number, max: number, labelStep = 1): Visual {
  const W = 330, pad = 30, d = 12
  const X = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad)
  let s = '', y0 = 8
  rows.forEach((row) => {
    const freq = new Map<number, number>()
    row.values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1))
    const h = Math.max(...freq.values()) * d + 6
    const axis = y0 + h + (row.label ? 16 : 0)
    if (row.label) s += txt([8, y0 + 8], row.label, INK, 13, 'start')
    freq.forEach((n, v) => {
      for (let k = 0; k < n; k++) s += `<circle cx="${r1(X(v))}" cy="${r1(axis - 7 - k * d)}" r="5" fill="${SIDE}"/>`
    })
    s += `<line x1="${pad - 10}" y1="${axis}" x2="${W - pad + 10}" y2="${axis}" stroke="${INK}" stroke-width="2"/>`
    for (let v = min; v <= max; v += labelStep) {
      s += `<line x1="${r1(X(v))}" y1="${axis}" x2="${r1(X(v))}" y2="${axis + 5}" stroke="${INK}"/>`
      s += `<text x="${r1(X(v))}" y="${axis + 17}" text-anchor="middle" font-size="11" fill="${INK}">${v}</text>`
    }
    y0 = axis + 28
  })
  return svg(W, y0, s)
}

/** Bağlamlı doğrusal grafik (ilk bölge) */
function lineGraph(o: { xMax: number; yMax: number; xStep: number; yStep: number; xLabel: string; yLabel: string; lines: { m: number; b: number; color: string; label: string }[] }): Visual {
  const W = 330, H = 250, left = 46, right = W - 20, top = 24, bottom = H - 40
  const X = (x: number) => left + (x / o.xMax) * (right - left), Y = (y: number) => bottom - (y / o.yMax) * (bottom - top)
  let s = ''
  for (let x = 0; x <= o.xMax; x += o.xStep) {
    s += `<line x1="${r1(X(x))}" y1="${top}" x2="${r1(X(x))}" y2="${bottom}" stroke="${GRID}"/>`
    s += `<text x="${r1(X(x))}" y="${bottom + 15}" text-anchor="middle" font-size="11" fill="${INK}">${x}</text>`
  }
  for (let y = 0; y <= o.yMax; y += o.yStep) {
    s += `<line x1="${left}" y1="${r1(Y(y))}" x2="${right}" y2="${r1(Y(y))}" stroke="${GRID}"/>`
    s += `<text x="${left - 6}" y="${r1(Y(y)) + 4}" text-anchor="end" font-size="11" fill="${INK}">${y}</text>`
  }
  s += `<line x1="${left}" y1="${top - 8}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="2"/><line x1="${left}" y1="${bottom}" x2="${right + 8}" y2="${bottom}" stroke="${INK}" stroke-width="2"/>`
  s += txt([right, bottom + 30], o.xLabel, INK, 12, 'end') + txt([left + 6, top - 12], o.yLabel, INK, 12, 'start')
  o.lines.forEach((l) => {
    let x1 = o.xMax, y1 = l.m * o.xMax + l.b
    if (y1 > o.yMax) { x1 = (o.yMax - l.b) / l.m; y1 = o.yMax }
    if (y1 < 0) { x1 = -l.b / l.m; y1 = 0 }
    s += `<line x1="${r1(X(0))}" y1="${r1(Y(l.b))}" x2="${r1(X(x1))}" y2="${r1(Y(y1))}" stroke="${l.color}" stroke-width="3"/>`
    s += txt([X(x1) - 6, Y(y1) - 10], l.label, l.color, 12, 'end')
  })
  return svg(W, H, s)
}

/** Üç çubuk: üstte en uzun, altta kısa iki çubuk uç uca */
function sticks(p: number, q: number, r: number): Visual {
  const [a, b, c] = [p, q, r].sort((m, n) => m - n)
  const u = 280 / Math.max(c, a + b), x0 = 20
  const bar = (x: number, y: number, len: number, color: string) =>
    `<rect x="${r1(x)}" y="${y}" width="${r1(len * u)}" height="22" rx="6" fill="${color}"/>` + txt([x + (len * u) / 2, y + 11], `${len} cm`.replace('.', ','), '#fff', 12)
  let s = bar(x0, 10, c, '#ef4444') + bar(x0, 48, a, '#3b82f6') + bar(x0 + a * u + 1, 48, b, '#22c55e')
  s += `<line x1="${r1(x0 + c * u)}" y1="4" x2="${r1(x0 + c * u)}" y2="76" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 3"/>`
  return svg(320, 82, s)
}

/** Dik üçgenin kenarları üzerine kurulmuş kareler (Pisagor). a: yatay dik kenar, b: dikey dik kenar */
function pythSquares(a: number, b: number, lab: { a: string; b: string; c: string }): Visual {
  const W = 260, p = 20
  const s = (W - 2 * p) / (a + 2 * b), H = (2 * a + b) * s + 2 * p
  const X = (x: number) => p + (x + b) * s, Y = (y: number) => p + (a + b - y) * s
  const poly = (pts: Pt[], fill: string) => `<polygon points="${pts.map(([x, y]) => `${r1(X(x))},${r1(Y(y))}`).join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  let o = poly([[0, 0], [a, 0], [a, -a], [0, -a]], '#fde68a')
  o += poly([[0, 0], [0, b], [-b, b], [-b, 0]], '#bbf7d0')
  o += poly([[0, b], [a, 0], [a + b, a], [b, a + b]], '#c7d2fe')
  o += poly([[0, 0], [a, 0], [0, b]], '#ffffff')
  const q = Math.min(a, b) * 0.18
  o += `<path d="M${r1(X(q))} ${r1(Y(0))} V${r1(Y(q))} H${r1(X(0))}" fill="none" stroke="${INK}" stroke-width="1.5"/>`
  o += txt([X(a / 2), Y(-a / 2)], lab.a, INK, 15) + txt([X(-b / 2), Y(b / 2)], lab.b, INK, 15) + txt([X((a + b) / 2), Y((a + b) / 2)], lab.c, INK, 15)
  return svg(W, H, o)
}

/** Hesap makinesi ekranı */
function calc(display: string): Visual {
  const s =
    `<rect x="4" y="4" width="312" height="62" rx="12" fill="#334155"/>` +
    `<rect x="14" y="14" width="292" height="42" rx="6" fill="#d9f99d"/>` +
    `<text x="298" y="42" text-anchor="end" font-family="monospace" font-size="17" font-weight="700" fill="#1f2937">${display}</text>`
  return svg(320, 70, s)
}

/** Üst üste dizilmiş madenî paralar: silindir = katlar */
function coinStack(n: number): Visual {
  let s = ''
  const base = (n - 1) * 10 + 30
  for (let i = 0; i < n; i++) {
    const cy = base - i * 10
    const fill = i % 2 ? '#fcd34d' : '#fbbf24'
    s += `<path d="M60 ${cy} v8 a70 16 0 0 0 140 0 v-8" fill="${fill}" stroke="#92400e" stroke-width="1.2"/>`
    s += `<ellipse cx="130" cy="${cy}" rx="70" ry="16" fill="${fill}" stroke="#92400e" stroke-width="1.2"/>`
  }
  const topY = base - (n - 1) * 10
  s += txt([130, topY], 'taban alanı', '#78350f', 12)
  s += `<line x1="218" y1="${topY}" x2="218" y2="${base + 8}" stroke="${INK}" stroke-width="2"/><line x1="212" y1="${topY}" x2="224" y2="${topY}" stroke="${INK}" stroke-width="2"/><line x1="212" y1="${base + 8}" x2="224" y2="${base + 8}" stroke="${INK}" stroke-width="2"/>`
  s += txt([236, (topY + base) / 2], 'h', INK, 15)
  return svg(260, base + 30, s)
}

/** Daireyi / silindiri eş dilimlere ayırıp ters düz dizme */
function rearrange(cylinder: boolean): Visual {
  const R = 56, n = 4, half = 22.5 * DEG
  const sw = 2 * R * Math.sin(half), H = R * Math.cos(half)
  const x0 = 178, Yt = 50
  const wedges = (dx: number, dy: number, f1: string, f2: string, stroke: string) => {
    let o = ''
    for (let i = 0; i < n; i++) {
      const xc = x0 + dx + sw / 2 + i * sw
      o += `<path d="M${r1(xc)} ${r1(Yt + dy)} L${r1(xc + sw / 2)} ${r1(Yt + dy + H)} A${R} ${R} 0 0 1 ${r1(xc - sw / 2)} ${r1(Yt + dy + H)} Z" fill="${f1}" stroke="${stroke}" stroke-width="1.5"/>`
      const xd = x0 + dx + sw + i * sw
      o += `<path d="M${r1(xd)} ${r1(Yt + dy + H)} L${r1(xd + sw / 2)} ${r1(Yt + dy)} A${R} ${R} 0 0 0 ${r1(xd - sw / 2)} ${r1(Yt + dy)} Z" fill="${f2}" stroke="${stroke}" stroke-width="1.5"/>`
    }
    return o
  }
  let s = ''
  if (cylinder) {
    s += `<path d="M25 40 V112 A45 12 0 0 0 115 112 V40" fill="#c7d2fe" stroke="${INK}" stroke-width="2"/><ellipse cx="70" cy="40" rx="45" ry="12" fill="#e0e7ff" stroke="${INK}" stroke-width="2"/>`
    for (let k = 0; k < 8; k++) {
      const t = k * 45 * DEG
      s += `<line x1="70" y1="40" x2="${r1(70 + 45 * Math.cos(t))}" y2="${r1(40 + 12 * Math.sin(t))}" stroke="${INK}" stroke-width="1"/>`
    }
    s += txt([124, 78], 'h', INK, 14)
    const dx = 14, dy = -12
    s += wedges(dx, dy, '#e0e7ff', '#fef3c7', '#94a3b8')
    const corners: Pt[] = [[x0, Yt + H], [x0 + sw / 2, Yt], [x0 + n * sw, Yt + H], [x0 + (n + 0.5) * sw, Yt]]
    corners.forEach(([cx, cy]) => (s += `<line x1="${r1(cx)}" y1="${r1(cy)}" x2="${r1(cx + dx)}" y2="${r1(cy + dy)}" stroke="#94a3b8" stroke-width="1.5"/>`))
  } else {
    for (let k = 0; k < 8; k++) {
      const t1 = k * 45 * DEG, t2 = (k + 1) * 45 * DEG
      s += `<path d="M70 78 L${r1(70 + R * Math.cos(t1))} ${r1(78 + R * Math.sin(t1))} A${R} ${R} 0 0 1 ${r1(70 + R * Math.cos(t2))} ${r1(78 + R * Math.sin(t2))} Z" fill="${k % 2 ? '#fde68a' : '#c7d2fe'}" stroke="${INK}" stroke-width="1.5"/>`
    }
  }
  s += `<path d="M134 78 h24 m-8 -6 l8 6 l-8 6" fill="none" stroke="${INK}" stroke-width="2"/>`
  s += wedges(0, 0, '#c7d2fe', '#fde68a', INK)
  s += txt([x0 + ((n + 0.5) * sw) / 2, Yt + H + 16], 'πr (çevrenin yarısı)', ANG, 12)
  s += txt([x0 + sw / 4 - 12, Yt + H / 2], 'r', ANG, 14)
  return svg(390, Yt + H + 30, s)
}

// ---------------------------------------------------------------------------
// Ortak görseller
// ---------------------------------------------------------------------------

const TABLO_KESME: Visual = { kind: 'table', headers: ['Kesme sayısı', '1', '2', '3', '4'], rows: [['Parça sayısı', 2, 4, 8, 16]] }
const TABLO_HUCRE: Visual = { kind: 'table', headers: ['Saat', '0', '1', '2', '3'], rows: [['Hücre sayısı', 1, 9, 81, '?']] }
const TABLO_YARIM: Visual = { kind: 'table', headers: ['2⁴', '2³', '2²', '2¹', '2⁰', '2⁻¹'], rows: [[16, 8, 4, 2, '?', '?']] }
const TABLO_ON: Visual = { kind: 'table', headers: ['10²', '10¹', '10⁰', '10⁻¹', '10⁻²'], rows: [[100, 10, '?', '?', '?']] }
const sq = (n: number): Visual => ({ kind: 'area', w: n, h: n, showGrid: true, labels: false })

const ALGORITMA_2X3 = flow(['Başla', 'x sayısını gir', 'x’i 2 ile çarp', 'Sonuca 3 ekle', 'Sonucu yazdır', 'Bitir'])
const ALGORITMA_CF = flow(['Başla', 'C değerini gir', 'C’yi 9 ile çarp', 'Sonucu 5’e böl', 'Sonuca 32 ekle', 'F değerini yazdır', 'Bitir'])
const BENZER_ABC_DEF = twoTri(
  { a: 8, b: 10, c: 6, right: 'B', sides: { a: '8 cm', b: '10 cm', c: '6 cm' } },
  { a: 12, b: 15, c: 9, right: 'B', names: ['D', 'E', 'F'], sides: { a: 'x', b: 'y', c: '9 cm' } },
)
// Paralel kenar benzerliği: A(130,20) B(30,180) C(230,180), D ve E kenarların 2/3'ünde
const PARALEL_UCGEN: Visual = svg(
  260,
  210,
  `<polygon points="130,20 30,180 230,180" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<line x1="63.3" y1="126.7" x2="196.7" y2="126.7" stroke="${ANG}" stroke-width="2.5"/>` +
    txt([130, 8], 'A', INK, 15) + txt([20, 192], 'B', INK, 15) + txt([240, 192], 'C', INK, 15) + txt([50, 126], 'D', INK, 15) + txt([210, 126], 'E', INK, 15) +
    txt([84, 66], '4', SIDE, 13) + txt([34, 152], '2', SIDE, 13) + txt([130, 116], '6', ANG, 13) + txt([130, 196], 'x', SIDE, 14),
)
const BUYUTME = gridShapes(12, 6, [
  { pts: [[1, 1], [4, 1], [1, 3]], color: '#f97316' },
  { pts: [[5, 1], [11, 1], [5, 5]], color: '#3b82f6' },
])
const BENZEMEYEN = gridShapes(10, 5, [
  { pts: [[1, 1], [4, 1], [1, 3]], color: '#f97316' },
  { pts: [[5, 1], [9, 1], [5, 4]], color: '#22c55e' },
])
const SILINDIR_ACINIM = cylNet('r = 3 cm', 'h = 10 cm')
const SILINDIR_ACINIM_2 = cylNet('r = 2 cm', 'h = 5 cm')
const TABLO_DEPO: Visual = { kind: 'table', headers: ['x (dakika)', '0', '1', '2', '3'], rows: [['y (litre)', 5, 8, 11, 14]] }
const TABLO_MARATON: Visual = { kind: 'table', headers: ['Süre (dk)', '0', '1', '2', '3'], rows: [['Yol (m)', 0, 200, 400, 600]] }
const TABLO_FIDAN: Visual = { kind: 'table', headers: ['Hafta', '0', '1', '2', '3'], rows: [['Boy (cm)', 6, 8, 10, 12]] }
const TABLO_BOSALAN: Visual = { kind: 'table', headers: ['Dakika', '0', '1', '2', '3'], rows: [['Su (L)', 50, 48, 46, 44]] }
const BIRIKIM = lineGraph({
  xMax: 8, yMax: 160, xStep: 1, yStep: 20, xLabel: 'Hafta', yLabel: 'Birikim (TL)',
  lines: [{ m: 10, b: 40, color: '#f97316', label: 'Elif' }, { m: 20, b: 0, color: '#3b82f6', label: 'Deniz' }],
})
const PARA_GRAFIK = lineChart(['20', '50', '100', '200', '500'], [0.65, 0.42, 0.54, 0.47, 0.51], 0, 1, 0.1, 'Tura gelme oranı (atış sayısına göre)', { v: 0.5, label: 'teorik: 0,5' })
const DIKDORTGEN_DONUSUM: Visual = {
  kind: 'coords', range: 5, points: [
    { x: -4, y: 1, label: 'A', color: '#f97316' }, { x: -1, y: 1, label: 'B', color: '#f97316' }, { x: -1, y: 3, label: 'C', color: '#f97316' }, { x: -4, y: 3, label: 'D', color: '#f97316' },
    { x: 1, y: -1, label: 'A’', color: '#3b82f6' }, { x: 4, y: -1, label: 'B’', color: '#3b82f6' }, { x: 4, y: -3, label: 'C’', color: '#3b82f6' }, { x: 1, y: -3, label: 'D’', color: '#3b82f6' },
  ],
}

/** 8. SINIF ETKİNLİKLERİ */
export const grade8: Activity[] = [
  // ── Sayılar ve Nicelikler ──────────────────────────────────────────────

  // MAT.8.1.1
  {
    id: 'g8-uslu-katlama-oruntusu',
    outcomes: ['MAT.8.1.1'],
    type: 'fill',
    stage: 'model',
    title: 'Kes, katla, say: tekrarlı çarpma',
    instructions: 'Tablodaki örüntüyü incele. Tekrarlı çarpmayı üslü ifadeyle yaz.',
    level: 1,
    launch: { text: 'Bir kâğıdı ortadan ikiye kesiyorsun, sonra her parçayı yeniden ikiye… 10 kesmeden sonra kaç parça olur? Tek tek saymadan bulmanın bir yolu var mı?', visual: TABLO_KESME },
    reflect: 'Kesme sayısı 1 artınca parça sayısı neden 1 artmıyor da 2 katına çıkıyor? Bir arkadaşına anlat.',
    items: [
      { text: 'Her kesmede parça sayısı kaç katına çıkıyor? __', answers: ['2'], visual: TABLO_KESME, hints: ['4’ten 8’e, 8’den 16’ya nasıl geçiliyor?'] },
      { text: '5 kesmeden sonra: 2 · 2 · 2 · 2 · 2 = 2^{5} = __', answers: ['32'], visual: TABLO_KESME, hints: ['16 parçanın her biri bir kez daha ikiye kesilirse kaç parça olur?'] },
      { text: '10 kesmeden sonra parça sayısı 2^{n} ise n = __', answers: ['10'], hints: ['Her kesme çarpıma kaç tane “· 2” ekliyor?'], explain: '10 kesme → 10 tane 2’nin çarpımı: 2^{10} = 1024.' },
      { text: 'Her saat her hücre 9 hücreye bölünüyor. 3. saatte 9 · 9 · 9 = 9^{3} = __ hücre olur.', answers: ['729'], visual: TABLO_HUCRE, hints: ['81 hücrenin her biri 9 hücreye bölünürse kaç hücre olur?'] },
      { text: '4 · 3 = 3 + 3 + 3 + 3 (tekrarlı toplama). 3^{4} = 3 · 3 · 3 · 3 (tekrarlı çarpma) = __', answers: ['81'], hints: ['3 · 3 = 9; 9 · 3 = ?; sonra bir kez daha 3 ile çarp.'], explain: '3^{4}, 4 tane 3’ün çarpımıdır; 4 · 3 = 12 ile karıştırma.' },
      { text: '([[1/2]])^{3} = [[1/2]] · [[1/2]] · [[1/2]] = __', answers: ['1/8|0,125'], hints: ['Bir pastanın yarısının yarısının yarısı ne kadardır?'] },
    ],
  },
  {
    id: 'g8-sifir-ve-negatif-us',
    outcomes: ['MAT.8.1.1'],
    type: 'fill',
    stage: 'model',
    title: 'Örüntü devam ederse: 2⁰ ve 2⁻¹',
    instructions: 'Üs 1 azaldıkça değer nasıl değişiyor? Örüntüyü bozmadan devam ettir.',
    level: 2,
    launch: { text: 'Hesap makinesi 2^{0} için 1 gösteriyor. “Hiç çarpmadıysak sonuç 0 olmalı!” diyen arkadaşın haklı mı? Örüntü bize ne söylüyor?', visual: TABLO_YARIM },
    reflect: 'Sıfırdan farklı her sayının 0. kuvveti neden 1’dir? Örüntüyü kullanarak bir arkadaşına açıkla.',
    items: [
      { text: 'Üs 1 azaldıkça değer hangi sayıya bölünüyor? __', answers: ['2'], visual: TABLO_YARIM, hints: ['16’dan 8’e, 8’den 4’e nasıl geçiliyor?'] },
      { text: '2^{1} = 2 ise örüntüye göre 2^{0} = 2 : 2 = __', answers: ['1'], visual: TABLO_YARIM, hints: ['Bir önceki değeri 2’ye böl.'], explain: '2^{0} = 0 değil; örüntüde her adımda 2’ye bölüyoruz: 2 : 2 = 1.' },
      { text: '2^{−1} = 1 : 2 = __', answers: ['1/2|0,5'], visual: TABLO_YARIM, hints: ['2^{0} = 1 değerini bir kez daha 2’ye böl.'] },
      { text: '2^{−3} = __', answers: ['1/8|0,125'], hints: ['2^{−1} = [[1/2]], 2^{−2} = [[1/4]]. Bir adım daha 2’ye bölersen ne olur?'] },
      { text: '10^{0} = __ ve 10^{−2} = __', answers: ['1', '0,01|1/100'], visual: TABLO_ON, hints: ['Bu tabloda her adımda kaça bölünüyor?'] },
      { text: '3^{3} = 27, 3^{2} = 9, 3^{1} = 3 ise 3^{0} = __ ve 3^{−1} = __', answers: ['1', '1/3'], hints: ['Her adımda kaça bölünüyor?'] },
      { text: '5^{−2} = 1 : 5^{2} = __', answers: ['1/25|0,04'], hints: ['5^{2} kaçtır? 1’i bu sayıya böl.'], explain: 'Negatif üs sayıyı negatif yapmaz; 5^{−2} = [[1/25]], pozitif bir sayıdır.' },
    ],
  },
  {
    id: 'g8-uslu-ifadenin-anlami',
    outcomes: ['MAT.8.1.1'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Üslü ifadelerde tuzaklar',
    instructions: 'Her ifadenin değerini tekrarlı çarpma olarak düşün. Yanlış seçeneklerin hangi yanılgıdan geldiğini fark et.',
    level: 2,
    launch: { text: 'Ece “2^{3} = 6” diyor, Mert “−3^{2} ile (−3)^{2} aynı şey” diyor. İkisi de çok emin. Sen ne dersin?' },
    reflect: '−3^{2} ile (−3)^{2} arasındaki farkı bir arkadaşına tekrarlı çarpma yazarak nasıl gösterirsin?',
    questions: [
      { prompt: '2^{3} işleminin sonucu kaçtır?', choices: ['8', '6', '5', '9'], answer: 0, feedback: [null, '2 · 3 = 6 olur; 2^{3} ise 2 · 2 · 2’dir.', '2 + 3 = 5; üs toplama değil, tekrarlı çarpma demektir.', '3^{2} = 9; taban ile üssün yeri değişirse sonuç da değişir.'] },
      { prompt: '(−3)^{2} ifadesinin değeri hangisidir?', choices: ['9', '−9', '−6', '6'], answer: 0, feedback: [null, 'Parantez içindeki −3 kendisiyle çarpılır: (−3) · (−3) = 9. −9, −3^{2} ifadesinin değeridir.', 'Üs çarpan değildir: 2 · (−3) değil, (−3) · (−3).', '3 · 2 = 6; üs, tekrar sayısıdır.'] },
      { prompt: '−3^{2} ifadesinin değeri hangisidir?', choices: ['−9', '9', '−6', '6'], answer: 0, feedback: [null, 'Parantez yok: önce 3^{2} = 9 bulunur, sonra eksi alınır: 0 − 9 = −9.', '−3 · 2 = −6 değil; önce 3^{2} hesaplanır.', 'Üs çarpma değildir ve baştaki eksi işareti kaybolmaz.'] },
      { prompt: '7^{0} işleminin sonucu kaçtır?', choices: ['1', '0', '7', '70'], answer: 0, feedback: [null, 'Örüntü: 7^{2} = 49, 7^{1} = 7, 7^{0} = 7 : 7 = 1. Sonuç 0 değil.', '7^{1} = 7’dir; 7^{0} bir adım daha 7’ye bölmektir.', '7^{0}, 7 ile 0’ı yan yana yazmak değildir.'] },
      { prompt: '4^{−2} ifadesinin değeri hangisidir?', choices: ['[[1/16]]', '−16', '−8', '[[1/8]]'], answer: 0, feedback: [null, 'Negatif üs sonucu negatif yapmaz; 4^{−2} = 1 : 4^{2}.', '4 · (−2) = −8; üs çarpan değildir.', '4^{2} = 16’dır, 8 değil; 4^{−2} = [[1/16]].'] },
      {
        prompt: '“Üs büyüdükçe sayının değeri her zaman büyür.” varsayımını hangisi çürütür?',
        choices: ['([[1/2]])^{2} > ([[1/2]])^{3}', '2^{3} < 2^{4}', '10^{2} < 10^{3}', '5^{1} < 5^{2}'],
        answer: 0,
        feedback: [null, 'Bu örnek varsayımı destekliyor; çürütmek için tersini gösteren bir örnek gerekir.', 'Bu örnek de varsayıma uyuyor.', 'Bu örnek de varsayıma uyuyor; tabanı 0 ile 1 arasında olan bir sayı dene.'],
        explain: '[[1/4]] > [[1/8]]: tabanı 0 ile 1 arasında olan sayılarda üs büyüdükçe değer küçülür.',
      },
      { prompt: 'Hangisi negatif bir sayıdır?', choices: ['(−2)^{3}', '(−2)^{4}', '2^{−3}', '(−2)^{0}'], answer: 0, feedback: [null, 'Çift kuvvette eksiler ikişer ikişer eşleşip pozitif olur: 16.', '2^{−3} = [[1/8]]; negatif üs sayıyı negatif yapmaz.', 'Sıfırdan farklı her sayının 0. kuvveti 1’dir.'] },
    ],
  },
  {
    id: 'g8-uslu-ozellik-eslestir',
    outcomes: ['MAT.8.1.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Tekrarlı çarpmadan kurala',
    instructions: 'Uzun yazılmış tekrarlı çarpımı kısa üslü gösterimiyle eşleştir. Kuralı sen keşfet!',
    level: 2,
    perRound: 4,
    launch: { text: '3^{3} · 3^{2} için uzun yoldan (3 · 3 · 3) · (3 · 3) yazınca kaç tane 3 çarpılıyor? Kuralı ezberlemeden, sayarak bulalım.' },
    reflect: '3^{3} · 3^{2} = 3^{5} örneğinden “aynı tabanlı ifadeler çarpılırken üsler toplanır” genellemesine nasıl ulaştın? Bu kural 2^{3} · 3^{2} için de çalışır mı? Neden?',
    pairs: [
      { left: '(3 · 3 · 3) · (3 · 3)', right: '3^{5}' },
      { left: '(2 · 2 · 2 · 2 · 2) : (2 · 2)', right: '2^{3}' },
      { left: '(5 · 5) · (5 · 5) · (5 · 5)', right: '(5^{2})^{3} = 5^{6}' },
      { left: '(2 · 7) · (2 · 7) · (2 · 7)', right: '2^{3} · 7^{3}' },
      { left: '(4 · 4 · 4) : (4 · 4 · 4)', right: '4^{0} = 1' },
      { left: '1 : (6 · 6)', right: '6^{−2}' },
      { left: '(2 · 5) · (2 · 5) · (2 · 5) · (2 · 5)', right: '10^{4}' },
      { left: '[[2/3]] · [[2/3]]', right: '[[4/9]]' },
    ],
  },
  {
    id: 'g8-uslu-islemler',
    outcomes: ['MAT.8.1.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Kuralları sına',
    instructions: 'Kuralı kullanmadan önce tekrarlı çarpmayı aklında canlandır, sonra boşluğu doldur.',
    level: 2,
    launch: { text: 'Bir hafıza kartı 2^{5} GB, diğeri 2^{3} GB. Büyük kart küçüğün kaç katı? Bölmeyi uzun yoldan yapmadan bulabilir misin?' },
    reflect: 'Üslerin toplandığı, çıkarıldığı ve çarpıldığı durumları nasıl ayırt ediyorsun? Her biri için kendi örneğini yaz.',
    items: [
      { text: '2^{3} · 2^{4} = 2^{n} ise n = __', answers: ['7'], hints: ['2^{3} kaç tane 2, 2^{4} kaç tane 2 demek?', 'Toplam kaç tane 2 çarpılıyor?'] },
      { text: '5^{8} : 5^{3} = 5^{n} ise n = __', answers: ['5'], hints: ['Pay ve paydadaki 5’lerden kaçı sadeleşir?'] },
      { text: '(7^{2})^{3} = 7^{n} ise n = __', answers: ['6'], hints: ['7^{2} · 7^{2} · 7^{2} yazarsan kaç tane 7 olur?'] },
      { text: '2^{6} · 5^{6} = 10^{n} ise n = __', answers: ['6'], hints: ['(2 · 5) çarpımını kaç kez yazabilirsin?'] },
      { text: '3^{−4} · 3^{6} = __', answers: ['9'], hints: ['Üsleri topla: −4 + 6 = ?', '3’ün o kuvveti kaçtır?'] },
      { text: '([[2/3]])^{−2} = __', answers: ['9/4|2,25'], hints: ['Önce ([[2/3]])^{2} değerini bul.', 'Negatif üs: 1’i bu sayıya böl.'], explain: '([[2/3]])^{−2} = 1 : [[4/9]] = [[9/4]].' },
      { text: '4 · 10^{2} + 3 · 10^{1} + 7 · 10^{0} + 2 · 10^{−1} = __', answers: ['437,2'], hints: ['10^{0} = 1 ve 10^{−1} = 0,1 olduğunu hatırla.'] },
      { text: '50,608 = 5 · 10^{1} + 6 · 10^{n} + 8 · 10^{−3} ise n = __', answers: ['-1'], hints: ['6 rakamı hangi basamakta: onda birler mi, yüzde birler mi?'] },
    ],
  },
  {
    id: 'g8-uslu-problemler',
    outcomes: ['MAT.8.1.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bakteriler, söylentiler, megabaytlar',
    instructions: 'Durumu tekrarlı çarpma olarak düşün: “Her adımda kaç katına çıkıyor?” ve “Kaç adım var?”',
    level: 3,
    launch: { text: 'Doğruluğu araştırılmadan paylaşılan bir söylentiyi, gören herkes 2 dakika içinde 2 kişiye daha gönderiyor. 1 saat sonra kaç kişiye ulaşır? Önce tahmin et: yüzlerce mi, milyonlarca mı?' },
    reflect: 'Bu problemlerde tabanı ve üssü neye göre belirledin? “Ne katına çıkıyor?” ve “Kaç kez?” sorularıyla açıkla.',
    questions: [
      { prompt: 'Bir bakteri her 20 dakikada bir ikiye bölünüyor. 1 bakteriden 2 saat sonra kaç bakteri olur?', choices: ['2^{6} = 64', '2^{2} = 4', '2 · 6 = 12', '6^{2} = 36'], answer: 0, feedback: [null, '2 saat 2 bölünme değil; 20 dakikalık dilimleri say: 120 : 20 = 6.', 'Her bölünmede sayı 2 katına çıkar, 2 artmaz.', 'Taban (her adımdaki katlanma) 2, üs (adım sayısı) 6’dır; yerleri değişince anlam değişir.'] },
      { prompt: 'Bir yanlış bilgiyi her 2 dakikada, onu yeni gören her kişi 2 kişiye daha gönderiyor. 1 kişiyle başlarsa 10. dakikada bilgiyi yeni gören kişi sayısı kaçtır?', choices: ['2^{5} = 32', '2 · 10 = 20', '10^{2} = 100', '2^{10} = 1024'], answer: 0, feedback: [null, 'Kişi sayısı her adımda 2 artmıyor, 2 katına çıkıyor.', 'Taban ve üs karıştı: taban 2, adım sayısı 5.', '10 dakika 10 adım değil; her adım 2 dakika sürüyor, 5 adım var.'] },
      { prompt: '1 MB = 2^{10} KB ve 1 KB = 2^{10} bayttır. 1 MB kaç bayttır?', choices: ['2^{20}', '2^{100}', '2^{11}', '20^{10}'], answer: 0, feedback: [null, '2^{10} · 2^{10} çarpımında üsler çarpılmaz, toplanır.', '2^{11} = 2^{10} · 2; burada 2 ile değil 2^{10} ile çarpıyoruz.', 'Aynı tabanlı çarpımda taban 2 kalır, yalnızca üsler toplanır.'] },
      { prompt: 'Bir mikroskobun bir merceği görüntüyü 10^{2} kat, diğer merceği 10^{1} kat büyütüyor. Toplam büyütme kaç kattır?', choices: ['10^{3} = 1000', '20^{3}', '10^{2} + 10^{1} = 110', '10^{2} = 100'], answer: 0, feedback: [null, 'Taban toplanmaz; aynı taban 10 kalır, üsler toplanır.', 'Büyütmeler art arda uygulandığı için toplanmaz, çarpılır.', 'İkinci merceğin büyütmesini unuttun.'] },
      { prompt: 'Bir hücre her saat 3 hücreye bölünüyor. Başlangıçta 1 hücre varsa 4 saat sonra kaç hücre olur?', choices: ['3^{4} = 81', '4^{3} = 64', '3 · 4 = 12', '3^{3} = 27'], answer: 0, feedback: [null, 'Taban her saatteki çarpan (3), üs saat sayısı (4) olmalı.', 'Hücre sayısı her saat 3 katına çıkar, 3 artmaz.', 'Başlangıç 0. saattir: 1. saatte 3, 4. saatte 3^{4} hücre olur.'] },
      { prompt: 'Radyoaktif bir maddenin miktarı her 10 yılda yarıya iniyor. Başlangıçta 64 g ise 30 yıl sonra kaç g kalır?', choices: ['8 g', '32 g', '16 g', '58 g'], answer: 0, feedback: [null, '32 g yalnızca ilk 10 yıl sonundaki miktar; 30 yılda 3 kez yarıya iner.', '16 g, 20 yıl sonraki miktar; bir kez daha yarıya inmeli.', 'Yarıya inmek 2 çıkarmak değil, 2’ye bölmektir.'], explain: '64 · ([[1/2]])^{3} = 64 : 8 = 8 g' },
      { prompt: 'Önce tahmin et: 2^{10} sayısı hangisine en yakındır?', choices: ['1000', '100', '20', '10 000'], answer: 0, feedback: [null, '2^{7} = 128; 2^{10} bundan 8 kat büyük.', '2 · 10 = 20; üs tekrarlı çarpmadır.', '2^{10} = 1024; 10 000’in onda biri kadar.'] },
    ],
  },

  // MAT.8.1.2
  {
    id: 'g8-karekok-geometri-tahtasi',
    outcomes: ['MAT.8.1.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Alanı verilen kareyi kur',
    instructions: 'Çivilere dokunarak kareyi oluştur ve şekli kapat. Kenar uzunluğunu düşün.',
    level: 1,
    launch: { text: 'Alanı 16 m² olan kare bir odanın bir duvarı kaç metredir? Peki alan 2 m² olsaydı duvar kaç metre olurdu?', visual: sq(4) },
    reflect: 'Alanı 2 birimkare olan karenin kenarı neden tam sayı olamaz? Bu uzunluk neden 1 ile 2 arasında olmalı?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Alanı 9 birimkare olan bir kare oluştur. Bir kenarı kaç birim oldu?', target: { sides: 4, area: 9, square: true }, hints: ['Hangi sayıyı kendisiyle çarpınca 9 olur?'], explain: 'Kenar 3 birim: 3 · 3 = 9. Bu yüzden √{9} = 3.' },
      { prompt: 'Alanı 16 birimkare olan bir kare oluştur.', target: { sides: 4, area: 16, square: true }, hints: ['Kaç birimlik kenar 16 birimkarelik alan verir?'], explain: '√{16} = 4: alanı 16 olan karenin kenarı 4 birimdir.' },
      { prompt: 'Alanı 2 birimkare olan eğik bir kare oluştur.', target: { sides: 4, area: 2 }, hints: ['Kenarları yatay ya da dikey olmayan bir kare deneyebilir misin?', 'Bir birimkarenin köşegenini kenar olarak kullanırsan ne olur?'], explain: 'Bu karenin kenarı √{2} birimdir: 1 ile 2 arasında bir uzunluk. Hiçbir tam sayının karesi 2 etmez.' },
      { prompt: 'Alanı 5 birimkare olan eğik bir kare oluştur.', target: { sides: 4, area: 5 }, hints: ['Bir kenarın 1 birim sağa, 2 birim yukarı gitmesini dene.'], explain: 'Kenar uzunluğu √{5}: 4 < 5 < 9 olduğu için 2 ile 3 arasındadır.' },
    ],
  },
  {
    id: 'g8-karekok-yaklasik-deger',
    outcomes: ['MAT.8.1.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Karekökü sayı doğrusunda bul',
    instructions: 'Karekökün yaklaşık yerini sayı doğrusunda işaretle. Önce tahmin et, sonra kareleri karşılaştır.',
    level: 2,
    launch: { text: 'Bir terzi alanı 5 m² olan kare bir masa örtüsü kesecek. Şerit metrede kenarı hangi çizgiye en yakın ölçmeli?' },
    reflect: 'Bir sayının karesine bakarak karekökünü nasıl “sıkıştırdın”? Kesme ile yuvarlama arasındaki farkı anlat.',
    tool: 'numberline',
    config: { min: 2, max: 3, step: 0.1 },
    tasks: [
      { prompt: '√{6,25} sayısını işaretle.', target: { value: 2.5 }, hints: ['2,5 · 2,5 kaçtır?'] },
      { prompt: '√{5} sayısına en yakın onda birlik değeri işaretle.', target: { value: 2.2 }, hints: ['2,2^{2} = 4,84 ve 2,3^{2} = 5,29. 5 hangisine daha yakın?'] },
      { prompt: '√{7} sayısına en yakın onda birlik değeri işaretle.', target: { value: 2.6 }, hints: ['2,6^{2} = 6,76 ve 2,7^{2} = 7,29. 7 hangisine daha yakın?'] },
      { prompt: '√{8} sayısına en yakın onda birlik değeri işaretle.', target: { value: 2.8 }, hints: ['2,8^{2} = 7,84 ve 2,9^{2} = 8,41. 8 hangisine daha yakın?'], explain: '√{8} ≈ 2,83: 2,8 ile 2,9 arasında ve 2,8’e daha yakın.' },
    ],
  },
  {
    id: 'g8-kare-ve-karekok',
    outcomes: ['MAT.8.1.2'],
    type: 'match',
    stage: 'model',
    title: 'Kare ve karekök',
    instructions: 'Karenin alanı ile kenar uzunluğu arasındaki ilişkiyi kullanarak eşleştir.',
    level: 1,
    perRound: 4,
    launch: { text: 'Kareli kâğıtta 25 birimkareden oluşan bir kare çizdin. Kenarını saymadan, alanından bulabilir misin?', visual: sq(5) },
    reflect: 'Karenin alanı ile kenarı arasındaki ilişkiyi kullanarak “karekök” kelimesini kendi cümlelerinle açıkla.',
    pairs: [
      { left: { text: 'Bu karenin kenarı', visual: sq(3) }, right: '√{9} = 3' },
      { left: { text: 'Bu karenin kenarı', visual: sq(4) }, right: '√{16} = 4' },
      { left: { text: 'Bu karenin kenarı', visual: sq(6) }, right: '√{36} = 6' },
      { left: 'Alanı 49 cm² olan kare karonun bir kenarı', right: '7 cm' },
      { left: 'Alanı 144 m² olan kare bahçenin bir kenarı', right: '12 m' },
      { left: 'Kenarı 0,3 m olan karenin alanı', right: '0,09 m²' },
      { left: '√{0,25}', right: '0,5' },
      { left: '√{[[9/16]]}', right: '[[3/4]]' },
    ],
  },
  {
    id: 'g8-karekok-sayi-dogrusunda',
    outcomes: ['MAT.8.1.2'],
    type: 'fill',
    stage: 'model',
    title: 'Hangi iki tam sayı arasında?',
    instructions: 'Tam kare sayıları referans al: önce iki komşu tam sayıyı, sonra hangisine daha yakın olduğunu bul.',
    level: 2,
    launch: {
      text: 'Alanı 20 m² olan kare bir bahçenin kenarı 4 m’den uzun mu, 5 m’den kısa mı? Tam kare sayılar bize yol gösterir.',
      visual: markLine(0, 6, [{ v: 1, label: '√1' }, { v: 2, label: '√4' }, { v: 3, label: '√9' }, { v: 4, label: '√16' }, { v: 5, label: '√25' }]),
    },
    reflect: '√{50} sayısının 7’ye 8’den daha yakın olduğunu bir arkadaşına sayı doğrusu çizerek nasıl gösterirsin?',
    items: [
      { text: '√{20} sayısı __ ile __ arasındadır.', answers: ['4', '5'], visual: markLine(3, 6, [{ v: 4, label: '√16' }, { v: 5, label: '√25' }, { v: 4.47, label: '?', color: ANG }]), hints: ['20’den küçük en büyük tam kare hangisi?', '20’den büyük en küçük tam kare hangisi?'] },
      { text: '√{50} sayısı __ ile __ arasındadır ve __ sayısına daha yakındır.', answers: ['7', '8', '7'], hints: ['49 ve 64 tam karelerine bak. 50 hangisine daha yakın?'] },
      { text: '√{30} için 5,5 tahmin edildi. 5,5^{2} = __', answers: ['30,25'], hints: ['5,5 · 5,5 = 5 · 5,5 + 0,5 · 5,5'], explain: '30,25 > 30 olduğu için √{30} 5,5’ten biraz küçüktür.' },
      { text: '1,4^{2} = 1,96 ve 1,5^{2} = 2,25. √{2} sayısının onda birlere göre yaklaşık değeri __', answers: ['1,4'], hints: ['2 sayısı 1,96’ya mı, 2,25’e mi daha yakın?'] },
      { text: '√{90} sayısına en yakın tam sayı __', answers: ['9'], hints: ['81 ve 100: 90 hangisine daha yakın?'] },
      { text: '0,7^{2} = __ olduğu için √{0,5} ≈ 0,7 diyebiliriz.', answers: ['0,49'], hints: ['0,7 · 0,7 = ?'] },
      { text: 'Hem √{10}’dan büyük hem √{17}’den küçük olan tam sayı __', answers: ['4'], hints: ['√{10} ve √{17} hangi tam sayılar arasında?', '√{16} kaçtır?'] },
    ],
  },
  {
    id: 'g8-karekok-muhakeme',
    outcomes: ['MAT.8.1.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kareköklerle akıl yürüt',
    instructions: 'Kareköklü ifadelerle ilgili problemleri çöz. Kareleri zihninde canlandır.',
    level: 2,
    launch: { text: 'Bir çiftçi alanı 225 m² olan kare tarlasının etrafını tel ile çevirmek istiyor. Kaç metre tel almalı? Alan ile çevreyi karıştırmamak için ne yapmalı?' },
    reflect: '√{16 + 9} ile √{16} + √{9} neden eşit değil? İki kare çizerek açıkla.',
    questions: [
      { prompt: 'Alanı 225 m² olan kare bir tarlanın çevresine bir sıra tel çekilecek. Kaç metre tel gerekir?', choices: ['60 m', '15 m', '56,25 m', '900 m'], answer: 0, feedback: [null, '15 m bir kenarın uzunluğu; tel 4 kenarın hepsine çekilecek.', 'Alanı 4’e bölmek kenarı vermez; önce √{225} ile kenarı bulmalısın.', '225 · 4 alan ile çevreyi karıştırmak olur.'] },
      { prompt: '√{16 + 9} işleminin sonucu kaçtır?', choices: ['5', '7', '25', '√{7}'], answer: 0, feedback: [null, '√{16} + √{9} = 7 olur ama kök, toplamın tamamına uygulanır: √{25} = 5.', '25 kök içindeki sayı; karekökü 5.', '16 + 9 = 25, 7 değil.'] },
      { prompt: '√{16} işleminin sonucu hangisidir?', choices: ['4', '−4', '8', '16'], answer: 0, feedback: [null, '(−4)^{2} = 16 olsa da √ sembolü negatif olmayan kökü gösterir; bir kenar uzunluğu negatif olamaz.', '16 : 2 = 8; karekök almak ikiye bölmek değildir.', '√{16}, karesi 16 olan sayıdır.'] },
      { prompt: '√{0,49} işleminin sonucu hangisidir?', choices: ['0,7', '0,07', '7', '0,49'], answer: 0, feedback: [null, '0,07 · 0,07 = 0,0049 olur.', '7 · 7 = 49; 0,49 değil.', 'Karekök sayıyı değiştirir: 0,7 · 0,7 = 0,49.'] },
      { prompt: 'Hesap makinesinde √{20} = 4,4721… görünüyor. Onda birlere yuvarlanırsa yaklaşık değer nedir?', choices: ['4,5', '4,4', '4,47', '5'], answer: 0, feedback: [null, '4,4 “kesme” ile bulunur; yuvarlamada yüzde birler basamağına (7) bakılır.', '4,47 yüzde birlere yuvarlanmış değerdir.', 'Bu, birler basamağına yuvarlanmış değerdir.'] },
      { prompt: 'Kenar uzunluğu tam sayı olan bir karenin alanı hangisi olabilir?', choices: ['81 cm²', '50 cm²', '72 cm²', '90 cm²'], answer: 0, feedback: [null, '7^{2} = 49, 8^{2} = 64: 50 bir tam kare değildir.', '8^{2} = 64, 9^{2} = 81: 72 bir tam kare değildir.', '9^{2} = 81, 10^{2} = 100: 90 bir tam kare değildir.'] },
      { prompt: 'Alanları 16 cm² ve 9 cm² olan iki kare, tabanları aynı doğru üzerinde olacak biçimde yan yana konuyor. Oluşan şeklin tabanı kaç cm’dir?', choices: ['7', '5', '12,5', '25'], answer: 0, feedback: [null, '√{16 + 9} = 5 olurdu; ama kareler yan yana konunca kenarlar toplanır: 4 + 3.', 'Alanları toplayıp 2’ye bölmek kenarı vermez.', '25 alanların toplamıdır, uzunluk değil.'] },
    ],
  },

  // MAT.8.1.3
  {
    id: 'g8-ondalik-davranisi',
    outcomes: ['MAT.8.1.3'],
    type: 'fill',
    stage: 'model',
    title: 'Hesap makinesi ne gösteriyor?',
    instructions: 'Ekrandaki ondalık gösterimin davranışını incele: sonlu mu, devirli mi, düzensiz sonsuz mu? Sonra karar ver.',
    level: 2,
    launch: { text: 'Hesap makinesinde 1 : 7 yaptığında 0,142857142857… çıkıyor; √2 yaptığında 1,41421356237… çıkıyor. İkisi de bitmiyor. Peki aralarında bir fark var mı?', visual: calc('1 ÷ 7 = 0,142857142857…') },
    reflect: 'Hem 0,181818… hem 1,7320508… sonsuza kadar sürüyor. Birinin rasyonel, diğerinin irrasyonel olmasına neye bakarak karar veriyorsun?',
    items: [
      { text: 'Bu gösterim __, sayı __.', answers: ['sonlu', 'rasyonel'], visual: calc('3 ÷ 8 = 0,375'), choices: ['sonlu', 'devirli', 'düzensiz sonsuz', 'rasyonel', 'irrasyonel'] },
      { text: 'Bu gösterim __, sayı __.', answers: ['devirli', 'rasyonel'], visual: calc('2 ÷ 11 = 0,1818181818…'), choices: ['sonlu', 'devirli', 'düzensiz sonsuz', 'rasyonel', 'irrasyonel'], hints: ['Tekrar eden bir basamak bloğu görüyor musun?'] },
      { text: 'Bu gösterim __, sayı __.', answers: ['düzensiz sonsuz', 'irrasyonel'], visual: calc('√3 = 1,7320508075…'), choices: ['sonlu', 'devirli', 'düzensiz sonsuz', 'rasyonel', 'irrasyonel'], hints: ['Basamaklarda sürekli tekrar eden bir blok var mı?'] },
      { text: 'Bu gösterim __, sayı __.', answers: ['devirli', 'rasyonel'], visual: calc('7 ÷ 45 = 0,1555555555…'), choices: ['sonlu', 'devirli', 'düzensiz sonsuz', 'rasyonel', 'irrasyonel'], hints: ['Hangi basamak tekrar ediyor?'] },
      { text: 'Bu sayı __.', answers: ['rasyonel'], visual: calc('√36 = 6'), choices: ['rasyonel', 'irrasyonel'], explain: 'Kök içinde olması sayıyı irrasyonel yapmaz; √{36} = 6 = [[6/1]].' },
      { text: 'Bu gösterim __, sayı __.', answers: ['düzensiz sonsuz', 'irrasyonel'], visual: calc('π = 3,1415926535…'), choices: ['sonlu', 'devirli', 'düzensiz sonsuz', 'rasyonel', 'irrasyonel'], explain: '[[22/7]] ya da 3,14 yalnızca π’nin yaklaşık değerleridir.' },
      { text: '0,101001000100001… (her seferinde bir 0 fazla). Bu gösterim __, sayı __.', answers: ['düzensiz sonsuz', 'irrasyonel'], choices: ['sonlu', 'devirli', 'düzensiz sonsuz', 'rasyonel', 'irrasyonel'], explain: 'Bir kuralı var ama hep aynı kalan, tekrar eden bir blok yok; bu yüzden devirli değildir.' },
    ],
  },
  {
    id: 'g8-ondalik-gosterim-eslestir',
    outcomes: ['MAT.8.1.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Sayı ve ondalık gösterimi',
    instructions: 'Her sayıyı ondalık gösterimiyle eşleştir. Gerekirse bölme işlemi yap.',
    level: 2,
    launch: { text: 'Bir sayıyı kesirle, ondalık gösterimle ya da kökle yazabiliriz. Yazılış değişince sayının değeri değişir mi?' },
    reflect: 'Aynı sayının farklı yazılışlarını (ör. [[1/2]], 0,5, √{0,25}) bir arkadaşına nasıl tanıtırsın?',
    pairs: [
      { left: '[[1/4]]', right: '0,25' },
      { left: '[[1/3]]', right: '0,333…' },
      { left: '[[7/6]]', right: '1,1666…' },
      { left: '[[3/8]]', right: '0,375' },
      { left: '√{0,36}', right: '0,6' },
      { left: '√{2}', right: '1,41421356…' },
      { left: 'π', right: '3,14159265…' },
    ],
  },
  {
    id: 'g8-rasyonel-mi-irrasyonel-mi',
    outcomes: ['MAT.8.1.3'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Rasyonel mi, irrasyonel mi?',
    instructions: 'Ondalık gösterimi sonlu ya da devirli olanlar rasyonel, düzensiz sonsuz olanlar irrasyoneldir. Her sayıyı doğru gruba sürükle.',
    level: 2,
    launch: { text: 'Bir sınıf “kök içindeki her sayı irrasyoneldir” diye karar vermiş. Bu karar her zaman doğru mu? Sayıları tek tek inceleyelim.' },
    reflect: 'Kök içindeki bir sayının rasyonel olup olmadığına nasıl karar veriyorsun?',
    categories: [
      { id: 'rasyonel', label: 'Rasyonel', color: '#22c55e' },
      { id: 'irrasyonel', label: 'İrrasyonel', color: '#a855f7' },
    ],
    items: [
      { content: '0,25', category: 'rasyonel', explain: 'Sonlu ondalık gösterim: [[1/4]].' },
      { content: '0,333…', category: 'rasyonel', explain: 'Devirli: [[1/3]].' },
      { content: '√{16}', category: 'rasyonel', explain: '√{16} = 4. Kök görünce hemen irrasyonel deme!' },
      { content: '[[7/9]]', category: 'rasyonel', explain: 'Zaten iki tam sayının bölümü.' },
      { content: '√{0,49}', category: 'rasyonel', explain: '√{0,49} = 0,7.' },
      { content: '2,1555…', category: 'rasyonel', explain: 'Devirli: 5 rakamı tekrar ediyor.' },
      { content: '√{2}', category: 'irrasyonel', explain: '2 tam kare değil; 1,41421… düzensiz sonsuzdur.' },
      { content: 'π', category: 'irrasyonel', explain: '3,14159… düzensiz sonsuzdur; [[22/7]] yalnızca yaklaşık değeridir.' },
      { content: '1,010010001…', category: 'irrasyonel', explain: 'Tekrar eden sabit bir blok yok.' },
      { content: '√{7}', category: 'irrasyonel', explain: '7 tam kare değil: 2,6457… düzensiz sonsuzdur.' },
    ],
  },
  {
    id: 'g8-ondalik-gosterim-ve-yargi',
    outcomes: ['MAT.8.1.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ondalık gösterimden karara',
    instructions: 'Ondalık gösterimi ölçüt alarak sayının rasyonel olup olmadığına karar ver ve gerekçelendir.',
    level: 2,
    launch: { text: 'Hesap makinesi ekranında 0,6666666667 görünüyor. Bu sayı irrasyonel mi, yoksa ekran bizi yanıltıyor mu?', visual: calc('2 ÷ 3 = 0,6666666667') },
    reflect: 'Hesap makinesi ekranının sınırlı olması, bir sayının rasyonel olup olmadığına karar verirken seni nasıl yanıltabilir?',
    questions: [
      { prompt: '[[5/8]] sayısının ondalık gösterimi nasıldır?', choices: ['Sonlu: 0,625', 'Devirli: 0,6252525…', 'Düzensiz sonsuz', 'Sonlu: 0,58'], answer: 0, feedback: [null, '5 : 8 bölmesi 0,625’te biter; tekrar eden blok yoktur.', 'Bir kesrin ondalık gösterimi asla düzensiz sonsuz olmaz.', '5 ile 8’i yan yana yazmak bölme değildir; 5 : 8 işlemini yap.'] },
      { prompt: '[[2/11]] = 0,181818… için ne söylenebilir?', choices: ['Rasyoneldir, çünkü ondalık kısmı devirlidir.', 'İrrasyoneldir, çünkü ondalık kısmı sonsuzdur.', 'Ne rasyonel ne irrasyoneldir.', 'Hem rasyonel hem irrasyoneldir.'], answer: 0, feedback: [null, 'Sonsuz olması yetmez; düzensiz değil, “18” bloğu tekrar ediyor.', 'Her gerçek sayı ya rasyoneldir ya irrasyoneldir.', 'Bir sayı aynı anda ikisi birden olamaz.'] },
      { prompt: 'Aşağıdakilerden hangisi irrasyoneldir?', choices: ['√{11}', '√{25}', '√{0,09}', '[[22/7]]'], answer: 0, feedback: [null, '√{25} = 5, rasyoneldir.', '√{0,09} = 0,3, rasyoneldir.', '[[22/7]] iki tam sayının bölümüdür; π’ye yakın ama rasyoneldir.'] },
      { prompt: 'Mehmet: “Kök içindeki her sayı irrasyoneldir.” Hangisi Mehmet’in yanıldığını gösterir?', choices: ['√{36}', '√{3}', '√{5}', '√{8}'], answer: 0, feedback: [null, '√{3} gerçekten irrasyonel; Mehmet’i doğrular, çürütmez.', '√{5} irrasyonel; karşı örnek olamaz.', '√{8} irrasyonel; karşı örnek olamaz.'] },
      { prompt: 'Hangisi [[1/2]] sayısının farklı bir yazılışı DEĞİLDİR?', choices: ['√{0,5}', '0,5', '√{0,25}', '[[2/4]]'], answer: 0, feedback: [null, '0,5 = [[5/10]] = [[1/2]].', '√{0,25} = 0,5.', '[[2/4]] sadeleşince [[1/2]] olur.'], explain: '√{0,5} ≈ 0,707…' },
      { prompt: 'Ekranda 2 : 3 için 0,6666666667 görünüyor. Hangisi en doğru yorumdur?', choices: ['Ekran son basamağı yuvarlıyor; sayı [[2/3]] = 0,666… ve rasyoneldir.', 'Son basamak 7 olduğu için sayı irrasyoneldir.', 'Ondalık gösterim sonlu olduğu için sayı bir tam sayıdır.', 'Ekranda görünen her sayı irrasyoneldir.'], answer: 0, feedback: [null, 'Ekran sınırlı olduğu için son basamak yuvarlanır; bu bir düzensizlik göstermez.', 'Sonlu ondalık gösterimli sayılar rasyoneldir ama tam sayı olmak zorunda değildir.', 'Ekrana sığmayan basamaklar kesilir ya da yuvarlanır; buna bakarak karar verilmez.'] },
      { prompt: 'Bir sayı hem rasyonel hem irrasyonel olabilir mi?', choices: ['Hayır, bir sayı ya rasyoneldir ya irrasyoneldir.', 'Evet, √{4} gibi', 'Evet, π gibi', 'Yalnızca negatif sayılarda'], answer: 0, feedback: [null, '√{4} = 2; yalnızca rasyoneldir.', 'π yalnızca irrasyoneldir.', 'Negatif sayılar da ya rasyoneldir (−2) ya irrasyoneldir (−√{2}).'] },
    ],
  },
  {
    id: 'g8-sayilar-hangisi-farkli',
    outcomes: ['MAT.8.1.3', 'MAT.8.1.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 2,
    launch: { text: 'Matematikçiler sayıları farklı gözlüklerle inceler: işaretine, ondalık gösterimine, yazılışına bakarak. Sen hangi gözlüğü takacaksın?' },
    reflect: 'Seçtiğin sayı için başka bir gerekçe daha bulabilir misin? Arkadaşın farklı bir seçenek seçtiyse gerekçesi neydi?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['√{2}', '[[1/3]]', '√{9}', '−4'],
        answer: 0,
        reasons: ['İrrasyonel olan tek sayı: ondalık gösterimi düzensiz sonsuz (1,4142…).', 'Ondalık gösterimi devirli (0,333…) olan tek sayı.', 'Doğal sayı olan tek sayı: √{9} = 3.', 'Negatif olan tek sayı; sayı doğrusunda 0’ın solunda.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['3^{2}', '2^{3}', '9^{1}', '(−3)^{2}'],
        answer: 0,
        reasons: ['Tabanı pozitif bir tek sayı, üssü çift olan tek ifade.', 'Değeri 9 olmayan tek ifade: 2^{3} = 8.', 'Üssü 1 olan, yani hiç tekrarlı çarpma içermeyen tek ifade.', 'Tabanı negatif olan tek ifade.'],
      },
    ],
  },

  // MAT.8.1.4
  {
    id: 'g8-gercek-sayilari-yerlestir',
    outcomes: ['MAT.8.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusuna yerleştir',
    instructions: 'Verilen gerçek sayıyı sayı doğrusunda işaretle.',
    level: 1,
    launch: { text: 'Sayı doğrusunda 1 ile 2 arasında kaç sayı var? Yalnızca 1,5 mi? Peki √{2} nerede?' },
    reflect: 'Sayı doğrusundaki her noktaya bir rasyonel sayı karşılık gelir mi? √{2} örneğiyle tartış.',
    tool: 'numberline',
    config: { min: -3, max: 3, step: 0.5 },
    tasks: [
      { prompt: '−[[3/2]] sayısını işaretle.', target: { value: -1.5 }, hints: ['−1 ile −2’nin tam ortası neresi?'] },
      { prompt: '√{4} sayısını işaretle.', target: { value: 2 }, hints: ['Karesi 4 olan pozitif sayı hangisi?'] },
      { prompt: '−√{9} sayısını işaretle.', target: { value: -3 }, hints: ['Önce √{9} değerini bul, sonra işaretine dikkat et.'] },
      { prompt: '√{2} sayısına en yakın işaret çizgisini seç.', target: { value: 1.5 }, hints: ['√{2} ≈ 1,41. 1’e mi, 1,5’e mi daha yakın?'], explain: '√{2} irrasyoneldir; tam yerini bir kesirle işaretleyemeyiz ama sayı doğrusunda kesin bir yeri vardır.' },
    ],
  },
  {
    id: 'g8-araliklari-oku',
    outcomes: ['MAT.8.1.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Gerçek sayı aralıkları',
    instructions: 'Dolu daire uç noktanın aralığa dâhil olduğunu, boş daire dâhil olmadığını gösterir.',
    level: 2,
    launch: { text: 'Bir lunaparkta “boyu 1,2 m ve üzeri olanlar binebilir” yazıyor. 1,2 m boyundaki çocuk binebilir mi? Bunu sayı doğrusunda nasıl gösterirsin?', visual: interval(0, 3, 1.2, null, true) },
    reflect: 'Bir aralığı sayı doğrusunda çizerken dolu ve boş daireyi neye göre seçiyorsun?',
    questions: [
      { prompt: { text: 'Sayı doğrusunda gösterilen aralık hangisidir?', visual: interval(-3, 5, -1, 3, true, false) }, choices: ['[−1, 3)', '(−1, 3]', '[−1, 3]', '(−1, 3)'], answer: 0, feedback: [null, 'Dolu daire dâhil demektir: −1 dolu, 3 boş.', '3 boş daire ile gösterilmiş; dâhil değil.', '−1 dolu daireyle gösterilmiş; dâhildir.'] },
      { prompt: { text: 'Sayı doğrusunda gösterilen aralık hangisidir?', visual: interval(-2, 6, 2, null, false) }, choices: ['(2, ∞)', '[2, ∞)', '(−∞, 2)', '(−∞, 2]'], answer: 0, feedback: [null, '2 boş daireyle gösterilmiş; köşeli parantez dâhil demektir.', 'Ok sağa doğru; 2’den büyük sayılar.', 'Ok sağa doğru, 2’den büyük sayılar; ayrıca 2 dâhil değil.'] },
      { prompt: { text: 'Sayı doğrusunda gösterilen aralık hangisidir?', visual: interval(-5, 3, null, -1, true, true) }, choices: ['(−∞, −1]', '(−∞, −1)', '[−1, ∞)', '(−1, ∞)'], answer: 0, feedback: [null, '−1 dolu daireyle gösterilmiş; dâhil.', 'Ok sola doğru; −1’den küçük sayılar.', 'Ok sola doğru; ayrıca −1 dâhil.'] },
      { prompt: 'x bir gerçek sayı olmak üzere 2 ≤ x < 5 hangi aralıktır?', choices: ['[2, 5)', '(2, 5]', '[2, 5]', '(2, 5)'], answer: 0, feedback: [null, '≤ işareti 2’nin dâhil olduğunu, < işareti 5’in dâhil olmadığını söyler.', '5 dâhil değil (<).', '2 dâhil (≤).'] },
      { prompt: '[−2, 3] aralığında kaç tam sayı vardır?', choices: ['6', '5', '4', 'Sonsuz çoklukta'], answer: 0, feedback: [null, 'Uç noktalar da dâhil: −2, −1, 0, 1, 2, 3.', 'Uçlardan birini unuttun; köşeli parantez dâhil demektir.', 'Tam sayılar sonlu sayıdadır; gerçek sayılar ise sonsuz çoklukta.'] },
      { prompt: '(1, 4) aralığı için hangisi doğrudur?', choices: ['Bu aralıkta sonsuz çoklukta gerçek sayı vardır.', 'Bu aralıkta yalnızca 2 ve 3 vardır.', '1 ve 4 bu aralığa dâhildir.', 'Bu aralıkta irrasyonel sayı yoktur.'], answer: 0, feedback: [null, '2 ve 3 yalnızca tam sayılardır; 1,5 ya da √{2} da aralıktadır.', 'Normal parantez uçların dâhil olmadığını gösterir.', '√{2}, √{5}, π gibi irrasyonel sayılar da bu aralıktadır.'] },
      { prompt: '(3, 6) ile [−1, 4] aralıklarının ortak sayıları hangi aralığı oluşturur?', choices: ['(3, 4]', '[3, 4]', '(−1, 6)', '[−1, 6)'], answer: 0, feedback: [null, '3 birinci aralığa dâhil değil; bu yüzden ortak kısma da giremez.', 'Bu iki aralığı birleştirmek olur; ortak sayılar ikisinde birden bulunmalı.', 'Bu da birleştirmeye benziyor; ortak kısım her iki aralıkta da olan sayılardır.'] },
      { prompt: 'Hangi sayı [1, √{5}) aralığındadır?', choices: ['2', '√{5}', '√{6}', '0,9'], answer: 0, feedback: [null, 'Boş uç: √{5} aralığa dâhil değil.', '√{6} ≈ 2,45 > √{5} ≈ 2,24.', '0,9 < 1; aralık 1’den başlıyor.'] },
    ],
  },
  {
    id: 'g8-aralik-gosterimleri',
    outcomes: ['MAT.8.1.4'],
    type: 'match',
    stage: 'model',
    title: 'Aralığın üç yüzü',
    instructions: 'x bir gerçek sayıdır. Sayı doğrusundaki aralığı eşitsizlik ve aralık gösterimiyle eşleştir.',
    level: 2,
    perRound: 3,
    launch: { text: 'Bir ilacın 2 °C ile 5 °C arasında saklanması gerekiyor. Bu bilgiyi bir sayı doğrusu, bir eşitsizlik ve bir aralık sembolüyle nasıl yazarsın?' },
    reflect: 'Bir aralığın üç gösterimi (sayı doğrusu, eşitsizlik, aralık sembolü) arasında hangisini daha kullanışlı buluyorsun? Neden?',
    pairs: [
      { left: { visual: interval(0, 7, 2, 5, true, true) }, right: '2 ≤ x ≤ 5, yani [2, 5]' },
      { left: { visual: interval(0, 7, 2, 5, false, false) }, right: '2 < x < 5, yani (2, 5)' },
      { left: { visual: interval(0, 7, 2, 5, true, false) }, right: '2 ≤ x < 5, yani [2, 5)' },
      { left: { visual: interval(0, 7, 2, 5, false, true) }, right: '2 < x ≤ 5, yani (2, 5]' },
      { left: { visual: interval(0, 7, 2, null, true) }, right: 'x ≥ 2, yani [2, ∞)' },
      { left: { visual: interval(0, 7, null, 2, true, false) }, right: 'x < 2, yani (−∞, 2)' },
    ],
  },
  {
    id: 'g8-gercek-sayilari-sirala',
    outcomes: ['MAT.8.1.4'],
    type: 'sort',
    stage: 'sembol',
    title: 'Gerçek sayıları sırala',
    instructions: 'Kareköklü ve kesirli sayıların yaklaşık değerlerini düşünerek sırala.',
    level: 2,
    launch: { text: 'Bir koşuda üç yarışmacının süreleri √{5} dk, 2,2 dk ve [[9/4]] dk olarak yazılmış. Birinci kim?' },
    reflect: 'Kareköklü bir sayıyı kesirli bir sayıyla karşılaştırırken hangi stratejiyi kullandın?',
    rounds: [
      { prompt: 'Küçükten büyüğe sırala.', items: ['√{2}', '[[3/2]]', '√{3}', '2', '√{5}'], ends: ['En küçük', 'En büyük'], hints: ['Her kökün hangi iki tam sayı arasında olduğunu bul.', '[[3/2]]’nin karesi kaçtır? 2 ile 3 arasında mı?'] },
      { prompt: 'Negatif sayılara dikkat! Küçükten büyüğe sırala.', items: ['−√{10}', '−3', '−[[5/2]]', '√{6}', 'π'], ends: ['En küçük', 'En büyük'], hints: ['Negatif sayılarda 0’dan uzak olan daha küçüktür.'] },
      { prompt: 'Küçükten büyüğe sırala.', items: ['√{0,16}', '0,5', '√{0,36}', '[[2/3]]', '√{0,81}'], ends: ['En küçük', 'En büyük'], hints: ['Kökleri hesapla: √{0,16} = 0,4 gibi.'], explain: '0,4 < 0,5 < 0,6 < 0,666… < 0,9' },
    ],
  },
  {
    id: 'g8-aralikta-mi',
    outcomes: ['MAT.8.1.4'],
    type: 'categorize',
    stage: 'sembol',
    title: '[1, 4) aralığında mı?',
    instructions: '[1, 4) aralığı 1’i içerir, 4’ü içermez. Her sayıyı doğru gruba sürükle.',
    level: 2,
    launch: { text: 'Bir buzdolabının ışığı, sıcaklık 1 °C ile 4 °C arasındayken (1 dâhil, 4 hariç) yeşil yanıyor. 3,9 °C’de ışık yeşil mi? Ya 4 °C’de?', visual: interval(-1, 5, 1, 4, true, false) },
    reflect: '√{17} sayısının aralıkta olmadığını hesap makinesi kullanmadan nasıl gösterirsin?',
    categories: [
      { id: 'icinde', label: '[1, 4) aralığında', color: '#6366f1' },
      { id: 'disinda', label: 'Aralıkta değil', color: '#f97316' },
    ],
    items: [
      { content: '1', category: 'icinde', explain: 'Köşeli parantez: 1 dâhil.' },
      { content: '√{2}', category: 'icinde', explain: '√{2} ≈ 1,41' },
      { content: 'π', category: 'icinde', explain: 'π ≈ 3,14' },
      { content: '√{10}', category: 'icinde', explain: '9 < 10 < 16 olduğundan 3 < √{10} < 4.' },
      { content: '[[7/2]]', category: 'icinde', explain: '[[7/2]] = 3,5' },
      { content: '4', category: 'disinda', explain: 'Normal parantez: 4 dâhil değil.' },
      { content: '√{16}', category: 'disinda', explain: '√{16} = 4 ve 4 dâhil değil.' },
      { content: '0,99', category: 'disinda', explain: '0,99 < 1' },
      { content: '√{17}', category: 'disinda', explain: '17 > 16 olduğundan √{17} > 4.' },
      { content: '−2', category: 'disinda', explain: 'Negatif; aralık 1’den başlıyor.' },
    ],
  },

  // ── Geometrik Şekiller ─────────────────────────────────────────────────

  // MAT.8.3.1
  {
    id: 'g8-aci-kenar-iliskisi',
    outcomes: ['MAT.8.3.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Büyük açı, uzun kenar',
    instructions: 'Üçgenleri incele: açılar ile karşılarındaki kenarlar arasında nasıl bir ilişki var?',
    level: 1,
    launch: { text: 'Bir pergelin iki kolu arasındaki açıyı büyüttükçe uçları arasındaki uzaklık ne olur? Üçgende de açı ile karşısındaki kenar arasında böyle bir ilişki olabilir mi?', visual: tri(byAngles(50, 60, { angles: { A: '70°', B: '50°', C: '60°' } })) },
    reflect: 'Bir üçgende bir açı büyüdükçe karşısındaki kenarın uzadığını bir arkadaşına günlük yaşamdan bir örnekle anlat.',
    questions: [
      { prompt: { text: 'Bu üçgenin en uzun kenarı hangisidir?', visual: tri(byAngles(50, 60, { angles: { A: '70°', B: '50°', C: '60°' } })) }, choices: ['[BC]', '[AB]', '[AC]'], answer: 0, feedback: [null, '[AB], 60°’lik C açısının karşısında; en büyük açı ise 70°.', '[AC], en küçük açının (50°) karşısında; en kısa kenar budur.'] },
      { prompt: { text: 'Bu üçgenin en uzun kenarı hangisidir?', visual: tri(byAngles(35, 105, { angles: { A: '40°', B: '35°', C: '105°' } })) }, choices: ['[AB]', '[BC]', '[AC]'], answer: 0, feedback: [null, '[BC], 40°’lik A açısının karşısında.', '[AC], en küçük açının (35°) karşısında; en kısa kenardır.'], explain: 'Geniş açının (C) karşısındaki kenar [AB] en uzundur.' },
      { prompt: { text: 'Kenar uzunlukları verilen bu üçgende en büyük açı hangisidir?', visual: tri({ a: 7, b: 5, c: 4, sides: { a: '7 cm', b: '5 cm', c: '4 cm' } }) }, choices: ['A açısı', 'B açısı', 'C açısı'], answer: 0, feedback: [null, 'B açısının karşısında 5 cm’lik [AC] var; en uzun kenar ise 7 cm.', 'C açısının karşısında en kısa kenar (4 cm) var; en küçük açı C’dir.'] },
      { prompt: 'Bir dik üçgende en uzun kenar hangisidir?', choices: ['Dik açının karşısındaki kenar (hipotenüs)', 'Dik kenarlardan biri', 'En küçük açının karşısındaki kenar', 'Kenarların hepsi eşittir'], answer: 0, feedback: [null, 'Dik açı (90°) dik üçgenin en büyük açısıdır; karşısındaki kenar en uzundur.', 'En küçük açının karşısında en kısa kenar bulunur.', '90°’lik açı diğer iki açıdan büyük olduğundan kenarlar eşit olamaz.'] },
      { prompt: 'ABC üçgeninde m(Â) = m(B̂) = 65° ise en kısa kenar hangisidir?', choices: ['[AB]', '[BC]', '[AC]', 'Bütün kenarlar eşittir'], answer: 0, feedback: [null, '[BC], 65°’lik A açısının karşısında. Önce C açısını bul: 180° − 130° = 50°.', '[AC], 65°’lik B açısının karşısında.', 'İki açı eşit ama üçüncüsü farklı; kenarların hepsi eşit olamaz.'] },
      { prompt: { text: 'Bu üçgende kenarları kısadan uzuna doğru sıralayan seçenek hangisidir?', visual: tri(byAngles(30, 50, { angles: { A: '100°', B: '30°', C: '50°' } })) }, choices: ['[AC], [AB], [BC]', '[BC], [AB], [AC]', '[AB], [AC], [BC]', '[AC], [BC], [AB]'], answer: 0, feedback: [null, 'Sıra ters: en kısa kenar en küçük açının (30°) karşısındadır.', '[AB], 50°’lik C açısının karşısında; [AC] ise 30°’lik B açısının karşısında daha kısadır.', '[BC], 100°’lik açının karşısında en uzun kenardır; sona gelmeli.'] },
    ],
  },
  {
    id: 'g8-aci-kenar-sirala',
    outcomes: ['MAT.8.3.1'],
    type: 'sort',
    stage: 'sembol',
    title: 'Kenarları ve açıları sırala',
    instructions: 'Açı-kenar ilişkisini kullanarak sırala. Önce her kenarın karşısındaki açıyı bul.',
    level: 2,
    launch: { text: 'Üçgen biçimli bir parkın köşelerindeki açılar ölçülmüş. Hangi yolun en uzun olduğunu yürümeden bilebilir miyiz?' },
    reflect: 'Kenarları sıralarken her kenarın karşısındaki açıyı nasıl buldun? Kısa bir yöntem öner.',
    rounds: [
      { prompt: 'ABC üçgeninde m(Â) = 70°, m(B̂) = 50°, m(Ĉ) = 60°. Kenarları kısadan uzuna sırala.', items: ['[AC]', '[AB]', '[BC]'], ends: ['En kısa', 'En uzun'], hints: ['[AC] kenarının karşısında hangi köşe var?', 'En küçük açı hangisi? Karşısındaki kenar nedir?'] },
      { prompt: 'DEF üçgeninde |DE| = 9 cm, |EF| = 6 cm, |DF| = 8 cm. Açıları küçükten büyüğe sırala.', items: ['D açısı', 'E açısı', 'F açısı'], ends: ['En küçük', 'En büyük'], hints: ['En kısa kenar [EF]; karşısında hangi açı var?'] },
      { prompt: 'KLM üçgeninde m(K̂) = 100°, m(L̂) = 35°. Kenarları kısadan uzuna sırala.', items: ['[KM]', '[KL]', '[LM]'], ends: ['En kısa', 'En uzun'], hints: ['Önce M açısını bul.', '35°’lik L açısının karşısında hangi kenar var?'], explain: 'm(M̂) = 45°. 35° < 45° < 100° olduğundan |KM| < |KL| < |LM|.' },
    ],
  },
  {
    id: 'g8-aci-kenar-akil-yurut',
    outcomes: ['MAT.8.3.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ölçümde hata var mı?',
    instructions: 'Açı-kenar ilişkisini kullanarak iddiaları ve ölçümleri değerlendir.',
    level: 3,
    launch: { text: 'Kerem bir üçgenin açılarını ve kenarlarını ölçüp tabloya yazdı ama bir yerde yanlışlık yaptığından şüpheleniyor. Ölçmeden hatayı yakalayabilir miyiz?' },
    reflect: 'Kerem’in ölçüm hatasını bulmak için hangi ilişkiyi kullandın? Bu ilişki başka hangi durumlarda işine yarar?',
    questions: [
      { prompt: 'Bir üçgenin en büyük açısı 50° olabilir mi?', choices: ['Hayır; üç açının hepsi 50° ya da daha küçükse toplam 180°’ye ulaşmaz.', 'Evet, her üçgende olabilir.', 'Evet, yalnızca eşkenar üçgende.', 'Hayır; en büyük açı her zaman 90°’dir.'], answer: 0, feedback: [null, 'Açıların her biri en çok 50° ise toplam en çok 150° olur.', 'Eşkenar üçgenin açıları 60°’dir.', 'Dar açılı üçgenlerde en büyük açı 90°’den küçüktür.'], explain: 'En büyük açı en az 60° olmalıdır.' },
      { prompt: 'ABC üçgeninde |AB| = |AC| ise hangisi kesinlikle doğrudur?', choices: ['m(B̂) = m(Ĉ)', 'm(Â) = m(B̂)', 'A açısı en büyük açıdır', 'Üçgen dik üçgendir'], answer: 0, feedback: [null, 'Eşit kenarların karşısındaki açılar eşittir: [AB]’nin karşısında C, [AC]’nin karşısında B var.', 'A açısının büyüklüğü tepe açısına bağlıdır; her zaman en büyük olmaz.', 'İki kenarı eşit olan üçgen dik olmak zorunda değildir.'] },
      { prompt: 'Kerem, ABC üçgeninde m(Â) = 80°, m(B̂) = 60°, |BC| = 5 cm ve |AC| = 7 cm ölçtü. Ölçümünde hata var mı?', choices: ['Evet; büyük açının (A) karşısındaki [BC], [AC]’den uzun olmalıydı.', 'Hayır, ölçümler uyumludur.', 'Evet; açıların toplamı 180° değildir.', 'Hayır; kenarlar ile açılar birbirinden bağımsızdır.'], answer: 0, feedback: [null, 'm(Â) > m(B̂) iken karşılarındaki kenarlar için |BC| > |AC| olmalı; ama 5 < 7.', '80° + 60° = 140°, C açısı 40° olur; toplam 180° tutuyor. Hata başka yerde.', 'Kenarlar ile karşılarındaki açılar arasında bir sıralama ilişkisi vardır.'] },
      { prompt: 'Bir ikizkenar üçgenin tepe açısı 40°’dir. En uzun kenarlar hangileridir?', choices: ['İki eş kenar (bacaklar)', 'Taban', 'Üç kenar eşittir', 'Belirlenemez'], answer: 0, feedback: [null, 'Taban, 40°’lik tepe açısının karşısında; en kısa kenardır.', 'Açılar 40°, 70°, 70°; eşkenar olsaydı hepsi 60° olurdu.', 'Taban açıları (180° − 40°) : 2 = 70° olarak bulunabilir.'] },
      { prompt: 'Geniş açılı bir üçgenin en uzun kenarı hangisidir?', choices: ['Geniş açının karşısındaki kenar', 'Geniş açıya komşu kenarlardan biri', 'En küçük açının karşısındaki kenar', 'Belirlenemez'], answer: 0, feedback: [null, 'Geniş açının kolları onun karşısındaki kenardan kısadır.', 'En küçük açının karşısında en kısa kenar bulunur.', 'Geniş açı üçgenin en büyük açısıdır; karşısındaki kenar en uzundur.'] },
    ],
  },

  // MAT.8.3.2
  {
    id: 'g8-cubuklarla-ucgen',
    outcomes: ['MAT.8.3.2'],
    type: 'quiz',
    stage: 'model',
    fixedOrder: true,
    title: 'Bu çubuklar üçgen olur mu?',
    instructions: 'Kırmızı çubuk en uzun çubuk. Kısa iki çubuğu uç uca koyunca kırmızı çubuğu geçebiliyor mu?',
    level: 1,
    launch: { text: 'Elinde 3 cm, 4 cm ve 8 cm’lik üç çubuk var. Uçlarını birleştirip bir üçgen yapabilir misin? Önce tahmin et.', visual: sticks(3, 4, 8) },
    reflect: 'Kısa iki çubuğun toplamını en uzun çubukla karşılaştırmak neden yeterli? Diğer toplamları da kontrol etmek gerekir mi?',
    questions: [
      { prompt: { text: 'Bu çubuklarla üçgen oluşur mu?', visual: sticks(3, 4, 8) }, choices: ['Üçgen oluşur', 'Üçgen oluşmaz'], answer: 1, feedback: ['3 + 4 = 7 < 8: kısa çubuklar uç uca bile 8 cm’ye yetişmez.', null] },
      { prompt: { text: 'Bu çubuklarla üçgen oluşur mu?', visual: sticks(4, 5, 6) }, choices: ['Üçgen oluşur', 'Üçgen oluşmaz'], answer: 0, feedback: [null, '4 + 5 = 9 > 6: kısa çubuklar uzun çubuğun iki ucundan kalkıp bir tepe noktasında buluşabilir.'] },
      { prompt: { text: 'Bu çubuklarla üçgen oluşur mu?', visual: sticks(3, 4, 7) }, choices: ['Üçgen oluşur', 'Üçgen oluşmaz'], answer: 1, feedback: ['3 + 4 = 7: kısa çubuklar uzun çubuğun üzerine yatar, tepe noktası oluşmaz; üçgen “düzleşir”.', null] },
      { prompt: { text: 'Bu çubuklarla üçgen oluşur mu?', visual: sticks(5, 5, 9) }, choices: ['Üçgen oluşur', 'Üçgen oluşmaz'], answer: 0, feedback: [null, '5 + 5 = 10 > 9: basık ama gerçek bir üçgen oluşur.'] },
      { prompt: { text: 'Bu çubuklarla üçgen oluşur mu?', visual: sticks(2, 6, 9) }, choices: ['Üçgen oluşur', 'Üçgen oluşmaz'], answer: 1, feedback: ['2 + 6 = 8 < 9: kısa çubuklar birbirine ulaşamaz.', null] },
      { prompt: { text: 'Bu çubuklarla üçgen oluşur mu?', visual: sticks(6, 7, 12) }, choices: ['Üçgen oluşur', 'Üçgen oluşmaz'], answer: 0, feedback: [null, '6 + 7 = 13 > 12: üçgen oluşur.'] },
    ],
  },
  {
    id: 'g8-ucgen-olusur-mu',
    outcomes: ['MAT.8.3.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Üçgen oluşur mu?',
    instructions: 'Üç uzunlukla üçgen oluşması için her kenar diğer ikisinin toplamından küçük olmalı. Grupla.',
    level: 1,
    launch: { text: 'Bir marangoz elindeki çıtalarla üçgen raflar yapacak. Hangi üçlüler işe yarar, hangileri boşa kesilmiş olur?' },
    reflect: 'Bir üçlüyü kontrol ederken hangi toplamı hesaplamak işini en hızlı görüyor? Neden?',
    categories: [
      { id: 'olusur', label: 'Üçgen oluşur', color: '#22c55e' },
      { id: 'olusmaz', label: 'Üçgen oluşmaz', color: '#ef4444' },
    ],
    items: [
      { content: '3 cm, 4 cm, 5 cm', category: 'olusur', explain: '3 + 4 = 7 > 5' },
      { content: '4 cm, 5 cm, 6 cm', category: 'olusur', explain: '4 + 5 = 9 > 6' },
      { content: '5 cm, 5 cm, 9 cm', category: 'olusur', explain: '5 + 5 = 10 > 9' },
      { content: '7 cm, 7 cm, 7 cm', category: 'olusur', explain: 'Eşkenar üçgen: 7 + 7 > 7' },
      { content: '6 cm, 8 cm, 13 cm', category: 'olusur', explain: '6 + 8 = 14 > 13' },
      { content: '3 cm, 3 cm, 7 cm', category: 'olusmaz', explain: '3 + 3 = 6 < 7' },
      { content: '2 cm, 5 cm, 8 cm', category: 'olusmaz', explain: '2 + 5 = 7 < 8' },
      { content: '1 cm, 2 cm, 3 cm', category: 'olusmaz', explain: '1 + 2 = 3: çubuklar düz bir çizgi üzerine yatar.' },
      { content: '2 cm, 3 cm, 6 cm', category: 'olusmaz', explain: '2 + 3 = 5 < 6' },
      { content: '4 cm, 4 cm, 8 cm', category: 'olusmaz', explain: '4 + 4 = 8: üçgen düzleşir.' },
    ],
  },
  {
    id: 'g8-ucuncu-kenar',
    outcomes: ['MAT.8.3.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Üçüncü kenar ne olabilir?',
    instructions: 'İki kenar verildiğinde üçüncü kenar, bu iki kenarın farkından büyük, toplamından küçük olmalıdır.',
    level: 2,
    launch: { text: 'Kenarlarından ikisi 5 cm ve 9 cm olan bir üçgen çizeceksin. Üçüncü kenar 1 cm olabilir mi? 20 cm olabilir mi?' },
    reflect: 'Üçüncü kenarın neden iki kenarın farkından büyük olması gerektiğini çubuklarla nasıl gösterirsin?',
    items: [
      { text: 'Kenarları 5 cm ve 9 cm olan bir üçgenin üçüncü kenarı x cm ise __ < x < __', answers: ['4', '14'], hints: ['Üçüncü kenar en fazla ne kadar olabilir? 5 + 9’u düşün.', 'En az ne kadar olmalı? 9 − 5’i düşün.'] },
      { text: 'Kenarları 7 cm ve 3 cm olan bir üçgenin üçüncü kenarı tam sayı olarak en az __ cm, en çok __ cm olabilir.', answers: ['5', '9'], hints: ['Önce 7 − 3 < x < 7 + 3 eşitsizliğini yaz.', 'Uç değerler dâhil mi?'] },
      { text: 'Kenarları 6 cm ve 10 cm olan bir üçgenin üçüncü kenarı __ farklı tam sayı değeri alabilir.', answers: ['11'], hints: ['4 < x < 16 aralığındaki tam sayıları say.'] },
      { text: 'İkizkenar bir üçgenin iki kenarı 4 cm ve 9 cm ise üçüncü kenar __ cm’dir.', answers: ['9'], hints: ['4, 4, 9 ile üçgen oluşur mu?', 'Peki 4, 9, 9 ile?'] },
      { text: 'Kenarları 8 cm, 5 cm ve x cm olan üçgende en uzun kenar x ise x’in alabileceği en büyük tam sayı değeri __', answers: ['12'], hints: ['x, 8 + 5’ten küçük olmalı.'] },
      { text: 'Elif’in 4 cm ve 11 cm’lik iki çubuğu var. Üçgen oluşturmak için üçüncü çubuk tam sayı olarak en az __ cm olmalı.', answers: ['8'], hints: ['Kısa iki çubuğun toplamı 11’i geçmeli mi?'] },
    ],
  },
  {
    id: 'g8-ucgen-esitsizligi',
    outcomes: ['MAT.8.3.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Üçgen eşitsizliği iş başında',
    instructions: 'Kenar uzunlukları arasındaki ilişkiyi kullanarak durumları değerlendir.',
    level: 2,
    launch: { text: 'Haritada evin, okulun ve marketin yerleri bir üçgen oluşturuyor. Evden markete doğrudan gitmek mi, okula uğrayarak gitmek mi daha kısadır? Neden?' },
    reflect: 'Üçgen eşitsizliği, haritada iki yer arasındaki “kestirme yol” fikriyle nasıl ilişkilidir?',
    questions: [
      { prompt: 'Can 3 cm, 4 cm ve 8 cm’lik çubuklarla üçgen oluşturamadı. Bunun nedeni nedir?', choices: ['3 + 4 < 8 olduğu için kısa çubukların uçları birleşemez.', 'Kenarlar farklı uzunlukta olduğu için', '8 çift sayı olduğu için', 'Üçgende kenarlar eşit olmalıdır.'], answer: 0, feedback: [null, 'Kenarları farklı olan pek çok üçgen vardır: 4, 5, 6 gibi.', 'Sayının tek ya da çift olması üçgen oluşmasını etkilemez.', 'Çeşitkenar üçgenler de vardır.'] },
      { prompt: 'Bir üçgende herhangi bir kenar için hangisi her zaman doğrudur?', choices: ['Diğer iki kenarın toplamından küçük, farkından büyüktür.', 'Diğer iki kenarın toplamından büyüktür.', 'Diğer iki kenarın farkına eşittir.', 'Diğer iki kenarın toplamına eşittir.'], answer: 0, feedback: [null, 'Toplamdan büyük olsaydı kısa kenarlar birbirine ulaşamazdı.', 'Farka eşit olsaydı üçgen düzleşirdi.', 'Toplama eşit olsaydı köşeler aynı doğru üzerinde kalırdı.'] },
      { prompt: 'Hangi üç uzunluk bir üçgenin kenarları OLAMAZ?', choices: ['4, 7, 12', '5, 6, 10', '2, 2, 3', '9, 9, 1'], answer: 0, feedback: [null, '5 + 6 = 11 > 10: üçgen oluşur.', '2 + 2 = 4 > 3: üçgen oluşur.', '9 + 1 = 10 > 9: ince uzun bir üçgen oluşur.'] },
      { prompt: 'İki kenarı 5 cm ve 8 cm olan bir üçgenin çevresi aşağıdakilerden hangisi olabilir?', choices: ['20 cm', '16 cm', '26 cm', '27 cm'], answer: 0, feedback: [null, 'Çevre 16 ise üçüncü kenar 3 olur; 5 + 3 = 8, üçgen düzleşir.', 'Çevre 26 ise üçüncü kenar 13 olur; 5 + 8 = 13, üçgen düzleşir.', 'Üçüncü kenar 14 olur; 5 + 8 = 13 < 14.'] },
      { prompt: 'İki kenarı 6 cm olan bir üçgende bu kenarlar arasındaki açı büyüdükçe üçüncü kenar nasıl değişir?', choices: ['Uzar ama 12 cm’ye ulaşamaz.', 'Kısalır.', 'Değişmez.', 'Uzar ve 12 cm’yi geçebilir.'], answer: 0, feedback: [null, 'Açı büyüdükçe kolların uçları birbirinden uzaklaşır.', 'Açı değişince karşısındaki kenar da değişir.', 'Üçüncü kenar her zaman 6 + 6 = 12 cm’den kısa kalır.'] },
      { prompt: 'Ev–okul arası 3 km, okul–market arası 5 km ve bu üç yer bir üçgen oluşturuyor. Ev ile market arası hangisi olabilir?', choices: ['4 km', '1 km', '2 km', '8 km'], answer: 0, feedback: [null, '1 + 3 = 4 < 5: bu konumlar bir üçgen oluşturamaz.', '2 + 3 = 5: üç yer aynı doğru üzerinde olurdu.', '3 + 5 = 8: üç yer aynı doğru üzerinde olurdu, üçgen oluşmazdı.'] },
    ],
  },

  // MAT.8.3.3
  {
    id: 'g8-es-ucgen-geometri-tahtasi',
    outcomes: ['MAT.8.3.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Eş üçgen kur',
    instructions: 'Geometri tahtasında istenen üçgeni oluştur ve şekli kapat.',
    level: 1,
    launch: { text: 'Bir yapbozun kayıp üçgen parçasını yeniden kesmek istiyorsun. Parçanın hangi ölçülerini bilmen yeter?', visual: gridShapes(6, 4, [{ pts: [[1, 1], [4, 1], [1, 3]], color: '#f97316' }]) },
    reflect: 'Alanları eşit iki üçgen her zaman eş midir? Geometri tahtasındaki örneğinle açıkla.',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Turuncu üçgenin eşini oluştur: dik kenarları 3 birim ve 2 birim olan bir dik üçgen.', target: { sides: 3, area: 3 }, hints: ['Önce 3 birimlik yatay bir kenar çiz.', 'Uçlarından birinden 2 birim yukarı çık.'], explain: 'İki kenar ve aralarındaki dik açı (KAK) aynıysa üçgen aynıdır; tahtada yerini değiştirmek eşliği bozmaz.' },
      { prompt: 'Aynı üçgenin eşini bu kez 3 birimlik dik kenarı dikey olacak biçimde oluştur.', target: { sides: 3, area: 3 }, hints: ['Üçgeni zihninde çeyrek tur döndür.'], explain: 'Döndürülmüş ya da ters çevrilmiş bir üçgen de ilk üçgene eştir.' },
      { prompt: 'Tabanı 4 birim, yüksekliği 2 birim olan bir ikizkenar üçgen oluştur.', target: { sides: 3, area: 4 }, hints: ['Tepe noktası tabanın tam ortasının üzerinde olmalı.'], explain: 'Tepeden tabanın orta noktasına inen kenarortay üçgeni eş iki dik üçgene ayırır; bu yüzden aynı zamanda yüksekliktir.' },
      { prompt: 'Alanı 4 birimkare olan ama bir önceki ikizkenar üçgene eş OLMAYAN bir üçgen oluştur.', target: { sides: 3, area: 4 }, hints: ['Tabanı 4, tepe noktası tabanın ortasında olmayan bir üçgen dene.'], explain: 'Alanlar eşit olsa da kenarlar farklıysa üçgenler eş değildir. Eşlik için alan bilgisi yetmez.' },
    ],
  },
  {
    id: 'g8-es-ucgenler',
    outcomes: ['MAT.8.3.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Eş üçgenler',
    instructions: 'Eş üçgenlerde karşılıklı kenarlar ve karşılıklı açılar eşittir. Çizimleri dikkatle incele.',
    level: 2,
    launch: { text: 'Bir paralelkenarı köşegeni boyunca kestin. Oluşan iki üçgen parçası birbirinin üzerine tam oturur mu?' },
    reflect: 'İki üçgenin eş olduğunu yazarken köşeleri neden sırayla (ABC ≅ DEF) yazıyoruz?',
    questions: [
      {
        prompt: { text: 'Kenar uzunlukları verilen iki üçgen için ne söylenebilir?', visual: twoTri({ a: 8, b: 7, c: 5, sides: { a: '8', b: '7', c: '5' } }, { a: 5, b: 8, c: 7, names: ['D', 'E', 'F'], sides: { a: '5', b: '8', c: '7' } }) },
        choices: ['Üç kenarı eşit olduğu için (KKK) eştir.', 'Eş değildir.', 'Yalnızca benzerdir, eş değildir.', 'Bilgi yetersizdir.'],
        answer: 0,
        feedback: [null, 'Duruşları farklı ama ikisinin de kenarları 5, 7 ve 8.', 'Benzerlik oranı 1 olan benzer üçgenler eştir.', 'Üç kenar uzunluğu tek bir üçgen belirler.'],
      },
      { prompt: 'ABC ≅ DEF ise [AB] kenarının eşi hangi kenardır?', choices: ['[DE]', '[EF]', '[DF]'], answer: 0, feedback: [null, 'Köşeler sırayla eşlenir: A ↔ D, B ↔ E. [EF] ise [BC]’nin eşidir.', 'A ↔ D, B ↔ E olduğundan [AB] ↔ [DE] olur. [DF], [AC]’nin eşidir.'] },
      { prompt: 'ABC ≅ KLM, m(Â) = 40° ve m(L̂) = 75° ise m(Ĉ) kaç derecedir?', choices: ['65°', '75°', '40°', '105°'], answer: 0, feedback: [null, '75°, B açısının ölçüsüdür (B ↔ L).', '40°, A açısının ölçüsüdür.', '180° − 75° yalnızca bir açıyı çıkarmak olur; A’yı da çıkar.'] },
      {
        prompt: { text: 'Açıları 50°, 60° ve 70° olan bu iki üçgen için hangisi kesinlikle doğrudur?', visual: twoTri(byAngles(60, 70, { angles: { A: '50°', B: '60°', C: '70°' } }), scaled(byAngles(60, 70), 1.5, { names: ['D', 'E', 'F'], angles: { A: '50°', B: '60°', C: '70°' } })) },
        choices: ['Benzerdir ama eş olmayabilir.', 'Eştir.', 'Çevreleri eşittir.', 'Ne eş ne benzerdir.'],
        answer: 0,
        feedback: [null, 'Açıları aynı ama boyutları farklı olabilir; çizimdeki gibi.', 'Biri diğerinin büyütülmüşü olabilir; çevreler farklı olur.', 'Karşılıklı açıları eş olan üçgenler benzerdir.'],
      },
      { prompt: 'Bir paralelkenar bir köşegeniyle iki üçgene ayrılıyor. Bu üçgenler için hangisi doğrudur?', choices: ['Eştir; karşılıklı kenarlar eşit ve köşegen ortaktır (KKK).', 'Eş değildir.', 'Biri mutlaka dik üçgendir.', 'Yalnızca alanları farklıdır.'], answer: 0, feedback: [null, 'Paralelkenarın karşılıklı kenarları eşittir; köşegen iki üçgende de vardır.', 'Paralelkenarın açıları dik olmak zorunda değildir.', 'Eş üçgenlerin alanları da eşittir.'] },
      { prompt: 'İkizkenar bir üçgende tabana ait kenarortay, üçgeni KKK’ya göre eş iki üçgene ayırır. Buna göre kenarortay tabanla kaç derecelik açı yapar?', choices: ['90°', '45°', '60°', '120°'], answer: 0, feedback: [null, 'Tabandaki iki komşu açı eş ve toplamları 180°; her biri 90° olmalı.', 'Bu açı üçgenin tepe açısına bağlı değildir; komşu iki açı eşittir.', 'Komşu açılar eş olduğundan 120° ve 60° olamaz.'] },
      { prompt: 'Gizli bir üçgende |AB| = 6 cm, |AC| = 4 cm ve m(Â) = 50° olduğu söyleniyor. Bu bilgilerle birbirine eş olmayan kaç farklı üçgen çizilebilir?', choices: ['1', '2', 'Sonsuz çoklukta', 'Hiç'], answer: 0, feedback: [null, 'Açı iki kenarın arasında olduğu için üçüncü kenar tek türlü belirlenir.', 'İki kenar ve aralarındaki açı (KAK) tek bir üçgen belirler.', 'Bu bilgilerle bir üçgen kesinlikle çizilebilir.'] },
    ],
  },
  {
    id: 'g8-es-ucgen-karsilik',
    outcomes: ['MAT.8.3.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Karşılıklı elemanlar',
    instructions: 'ABC ≅ DEF olduğuna göre eş elemanları eşleştir.',
    level: 1,
    perRound: 6,
    launch: { text: 'İki eş üçgen farklı duruşlarda çizilmiş. Hangi kenarın hangisine karşılık geldiğini, yazılıştaki harf sırası söyleyebilir mi?', visual: twoTri({ a: 8, b: 7, c: 5 }, { a: 8, b: 7, c: 5, names: ['D', 'E', 'F'] }) },
    reflect: 'ABC ≅ DEF yazılışından karşılıklı elemanları bulmak için kullandığın yöntemi bir arkadaşına anlat.',
    pairs: [
      { left: '[AB]', right: '[DE]' },
      { left: '[BC]', right: '[EF]' },
      { left: '[AC]', right: '[DF]' },
      { left: 'A açısı', right: 'D açısı' },
      { left: 'B açısı', right: 'E açısı' },
      { left: 'C açısı', right: 'F açısı' },
    ],
  },
  {
    id: 'g8-es-ucgen-yeterli-mi',
    outcomes: ['MAT.8.3.3'],
    type: 'categorize',
    stage: 'problem',
    title: 'Gizli üçgen oyunu',
    instructions: 'Öğretmen bir üçgeni saklıyor. Ondan yalnızca verilen bilgiyi istesen, gizli üçgene eş bir üçgeni kesinlikle çizebilir misin?',
    level: 2,
    launch: { text: 'Öğretmenin bir zarfın içine bir üçgen sakladı. Sen soru sorarak onun eşini çizeceksin. En az hangi bilgileri istemelisin?' },
    reflect: 'Gizli üçgen için en az kaç bilgi istedin? Gereğinden fazla bilgi istemek bir sorun yaratır mı?',
    categories: [
      { id: 'yeterli', label: 'Yeterli', color: '#22c55e' },
      { id: 'yetersiz', label: 'Yeterli değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Üç kenarının uzunluğu (KKK)', category: 'yeterli', explain: 'Pergel ve cetvelle tek bir üçgen çizilir.' },
      { content: 'İki kenarının uzunluğu ve bu kenarlar arasındaki açının ölçüsü (KAK)', category: 'yeterli', explain: 'Açı iki kenarı “kilitler”; üçüncü kenar kendiliğinden belirlenir.' },
      { content: 'Bir kenarının uzunluğu ve bu kenara komşu iki açının ölçüsü (AKA)', category: 'yeterli', explain: 'Kenarın iki ucundaki ışınlar tek bir noktada kesişir.' },
      { content: 'Bir dik üçgenin iki dik kenarının uzunluğu', category: 'yeterli', explain: 'Aradaki açı 90° olduğundan bu bir KAK durumudur.' },
      { content: 'Bir eşkenar üçgenin bir kenarının uzunluğu', category: 'yeterli', explain: 'Üç kenar da bilinmiş olur (KKK).' },
      { content: 'Üç açısının ölçüsü', category: 'yetersiz', explain: 'Aynı açılarla küçük ya da büyük üçgenler çizilebilir; bunlar benzerdir ama eş olmayabilir.' },
      { content: 'Yalnızca iki kenarının uzunluğu', category: 'yetersiz', explain: 'Aradaki açı değiştikçe üçüncü kenar da değişir.' },
      { content: 'Yalnızca bir kenarının uzunluğu ve bir açısının ölçüsü', category: 'yetersiz', explain: 'Bu bilgilerle sonsuz çoklukta farklı üçgen çizilebilir.' },
      { content: 'Yalnızca iki açısının ölçüsü', category: 'yetersiz', explain: 'Üçüncü açı bulunur ama üçgenin boyutu belli değildir.' },
      { content: 'Yalnızca çevresinin uzunluğu', category: 'yetersiz', explain: 'Çevresi 12 cm olan 3-4-5 ve 4-4-4 üçgenleri eş değildir.' },
    ],
  },

  // MAT.8.3.4
  {
    id: 'g8-buyut-kucult',
    outcomes: ['MAT.8.3.4'],
    type: 'fill',
    stage: 'model',
    title: 'Fotokopide büyütme',
    instructions: 'Kareli zemindeki üçgenleri karşılaştır. Kenarlar nasıl değişti, açılar ne oldu?',
    level: 1,
    launch: { text: 'Fotokopi makinesinde bir çizimi %200 büyüttün. Kopyadaki üçgen aslından “daha şişman” mı olur, yoksa aynı biçimde mi kalır?', visual: BUYUTME },
    reflect: 'Bir şekli büyütürken her kenara aynı sayıyı EKLESEYDİK (ör. +2) benzer bir şekil elde eder miydik? Neden?',
    items: [
      { text: 'Turuncu üçgenin yatay kenarı 3 birim, mavininki __ birim.', answers: ['6'], visual: BUYUTME, hints: ['Mavi üçgenin yatay kenarındaki kareleri say.'] },
      { text: 'Turuncu üçgenin dikey kenarı 2 birim, mavininki __ birim.', answers: ['4'], visual: BUYUTME },
      { text: 'Benzerlik oranı (mavi : turuncu) = __', answers: ['2'], visual: BUYUTME, hints: ['6 : 3 ile 4 : 2 aynı sayıyı veriyor mu?'] },
      { text: 'Büyütmeden sonra dik açı __ derece olarak kalır.', answers: ['90'], visual: BUYUTME, explain: 'Benzer şekillerde açılar korunur; yalnızca kenarlar aynı oranda büyür.' },
      { text: 'Yeşil üçgende kenarlar turuncunun 3 → 4 ve 2 → 3 olmuş. Yeşil üçgen turuncuya __.', answers: ['benzer değil'], visual: BENZEMEYEN, choices: ['benzer', 'benzer değil'], hints: ['4 : 3 ≈ 1,33 ile 3 : 2 = 1,5 oranlarını karşılaştır.'], explain: 'Her kenara 1 eklenmiş; oranlar eşit olmadığı için şekil “bozulmuş”tur.' },
      { text: 'Kenarları 3 cm, 4 cm ve 5 cm olan bir üçgen 3 katına büyütülürse en uzun kenarı __ cm olur.', answers: ['15'] },
      { text: '1 : 1000 ölçekli bir haritada 4 cm olan yol gerçekte __ m’dir.', answers: ['40'], hints: ['4 cm’nin 1000 katı kaç cm eder?', '100 cm = 1 m'] },
    ],
  },
  {
    id: 'g8-benzerlik-icin-yeterli',
    outcomes: ['MAT.8.3.4'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Benzer üçgen için ne bilmeli?',
    instructions: 'Benzer üçgenlerde karşılıklı açılar eş, karşılıklı kenarlar orantılıdır.',
    level: 2,
    launch: { text: 'Gizli bir üçgenin “büyütülmüş kopyasını” çizeceksin. Bu kez eşini değil, benzerini istiyoruz. Hangi bilgiler yeter?' },
    reflect: 'Benzerlik için iki açı yeterken eşlik için neden yetmiyor? Bir arkadaşına çizerek göster.',
    questions: [
      { prompt: 'İki üçgenin benzer olduğunu göstermek için hangisi yeterlidir?', choices: ['İkişer açılarının ölçülerinin eşit olması', 'Birer kenarlarının eşit olması', 'Çevrelerinin eşit olması', 'Birer açılarının eşit olması'], answer: 0, feedback: [null, 'Bir kenarın eşit olması biçimi belirlemez.', 'Çevreleri eşit üçgenlerin biçimleri çok farklı olabilir.', 'Tek açı yetmez; ikinci açı değişirse biçim değişir.'] },
      { prompt: 'Açıları 40° ve 60° olan bir üçgen ile açıları 60° ve 80° olan bir üçgen benzer midir?', choices: ['Evet; ikisinin de açıları 40°, 60° ve 80°’dir.', 'Hayır; verilen açılar farklıdır.', 'Karar verilemez.', 'Yalnızca eştir.'], answer: 0, feedback: [null, 'Üçüncü açıları da bul: 180° − 100° = 80° ve 180° − 140° = 40°.', 'Üçüncü açılar bulunabildiği için karar verilebilir.', 'Kenarlar verilmediği için eş olup olmadıklarını bilemeyiz.'] },
      { prompt: 'Kenarları 3, 4 ve 5 birim olan üçgene benzer üçgen hangisidir?', choices: ['6, 8, 10', '4, 5, 6', '3, 4, 6', '5, 12, 13'], answer: 0, feedback: [null, 'Her kenara 1 eklenmiş; benzerlikte kenarlar aynı sayıyla ÇARPILIR.', 'Yalnızca bir kenar değişmiş; oranlar eşit değil.', 'Bu da bir dik üçgen ama oranlar farklı: 5 : 3 ≠ 12 : 4.'] },
      { prompt: 'Benzerlik oranı 1 olan iki üçgen için hangisi doğrudur?', choices: ['Eş üçgenlerdir.', 'Benzer değildir.', 'Biri diğerinin iki katıdır.', 'Açıları farklıdır.'], answer: 0, feedback: [null, 'Oran 1 ise karşılıklı kenarlar eşit; üçgenler hem benzer hem eştir.', 'Oran 1 olunca kenarlar aynı kalır, iki katına çıkmaz.', 'Benzer üçgenlerin açıları her zaman eştir.'] },
      { prompt: 'ABC ∼ DEF ise hangisi kesinlikle doğrudur?', choices: ['m(Â) = m(D̂)', '|AB| = |DE|', 'm(Â) = m(Ê)', '|BC| = |DF|'], answer: 0, feedback: [null, 'Benzer üçgenlerde kenarlar eşit değil, orantılıdır.', 'A köşesine karşılık gelen köşe D’dir, E değil.', '[BC]’ye karşılık gelen kenar [EF]’dir; ayrıca uzunluklar eşit olmak zorunda değil.'] },
      { prompt: 'Hangi ifade YANLIŞTIR?', choices: ['Bütün ikizkenar üçgenler benzerdir.', 'Eş üçgenler aynı zamanda benzerdir.', 'Bütün eşkenar üçgenler benzerdir.', 'Benzer üçgenlerde karşılıklı kenarların oranı eşittir.'], answer: 0, feedback: [null, 'Bu doğrudur: benzerlik oranı 1’dir.', 'Bu doğrudur: hepsinin açıları 60°’dir.', 'Bu doğrudur; benzerliğin tanımıdır.'], explain: 'Tepe açısı 20° olan ikizkenar üçgen ile tepe açısı 100° olan ikizkenar üçgen benzer değildir.' },
      { prompt: 'Bir üçgenin iki kenarı 4 cm ve 6 cm, bu kenarlar arasındaki açı 50°’dir. Hangisi bu üçgene kesinlikle benzerdir?', choices: ['Kenarları 8 cm ve 12 cm, aralarındaki açı 50°', 'Kenarları 8 cm ve 10 cm, aralarındaki açı 50°', 'Kenarları 4 cm ve 6 cm, aralarındaki açı 60°', 'Kenarları 6 cm ve 8 cm, aralarındaki açı 50°'], answer: 0, feedback: [null, '8 : 4 = 2 ama 10 : 6 ≠ 2; kenarlar orantılı değil.', 'Aradaki açı farklı olunca biçim değişir.', 'Her kenara 2 eklenmiş; oranlar eşit değil (6 : 4 ≠ 8 : 6).'], explain: '8 : 4 = 12 : 6 = 2 ve aradaki açılar eşit.' },
    ],
  },
  {
    id: 'g8-benzer-mi',
    outcomes: ['MAT.8.3.4'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Benzer mi?',
    instructions: 'Verilen şekil çiftleri her zaman benzer mi? Grupla.',
    level: 3,
    launch: { text: 'Bir telefonda fotoğrafı iki parmakla büyütünce görüntü bozulmuyor ama yalnızca enini çekince yüzler uzuyor. Fark nedir?' },
    reflect: '“Herhangi iki kare her zaman benzerdir ama herhangi iki dikdörtgen değildir.” Bu cümleyi bir örnekle açıkla.',
    categories: [
      { id: 'benzer', label: 'Her zaman benzer', color: '#22c55e' },
      { id: 'degil', label: 'Benzer değil ya da her zaman değil', color: '#f97316' },
    ],
    items: [
      { content: 'Kenarları 3-4-5 ve 9-12-15 olan iki üçgen', category: 'benzer', explain: 'Her kenar 3 katı: 9 : 3 = 12 : 4 = 15 : 5.' },
      { content: 'Açıları 50°-60° ve 60°-70° olan iki üçgen', category: 'benzer', explain: 'Üçüncü açılar 70° ve 50°: ikisi de 50°, 60°, 70°.' },
      { content: 'Kenarları 5-5-8 ve 10-10-16 olan iki üçgen', category: 'benzer', explain: 'Bütün kenarlar 2 katı.' },
      { content: 'Herhangi iki eşkenar üçgen', category: 'benzer', explain: 'Açıların hepsi 60°.' },
      { content: 'Herhangi iki kare', category: 'benzer', explain: 'Açılar 90°, kenarlar aynı oranda.' },
      { content: 'Birbirine eş iki üçgen', category: 'benzer', explain: 'Benzerlik oranı 1.' },
      { content: 'Kenarları 2-3-4 ve 4-6-9 olan iki üçgen', category: 'degil', explain: '4 : 2 = 6 : 3 = 2 ama 9 : 4 ≠ 2.' },
      { content: 'Açıları 30°-80° ve 30°-60° olan iki üçgen', category: 'degil', explain: 'Açılar 30°, 80°, 70° ile 30°, 60°, 90°; farklı.' },
      { content: 'Herhangi iki ikizkenar üçgen', category: 'degil', explain: 'Tepe açıları farklı olabilir.' },
      { content: 'Herhangi iki dikdörtgen', category: 'degil', explain: '1 × 2 ile 1 × 5’lik dikdörtgenler benzer değildir.' },
    ],
  },
  {
    id: 'g8-benzer-ucgenler-hesapla',
    outcomes: ['MAT.8.3.4'],
    type: 'fill',
    stage: 'problem',
    title: 'Gölgeler, fotoğraflar, haritalar',
    instructions: 'Benzer üçgenlerde karşılıklı kenar uzunluklarının oranı eşittir. Durumdaki benzer üçgenleri bul.',
    level: 2,
    launch: { text: 'Thales’in, piramidin yüksekliğini onun gölgesini ve bir çubuğun gölgesini karşılaştırarak bulduğu anlatılır. Bu nasıl mümkün olabilir?' },
    reflect: 'Okulunun bayrak direğinin yüksekliğini tırmanmadan, benzerlikle nasıl ölçerdin? Adımlarını yaz.',
    items: [
      { text: 'ABC ∼ DEF ise x = __ cm ve y = __ cm', answers: ['12', '15'], visual: BENZER_ABC_DEF, hints: ['Hangi iki kenarın uzunluğunu iki üçgende de biliyorsun?', '9 : 6 oranı kaçtır?'] },
      { text: 'Benzerlik oranı [[|AB|/|DE|]] = __', answers: ['2/3|6/9|4/6'], visual: BENZER_ABC_DEF },
      { text: '[DE] ∥ [BC] ise x = __ cm', answers: ['9'], visual: PARALEL_UCGEN, hints: ['ADE ile ABC üçgenleri benzer mi?', '|AB| = 4 + 2 = 6 cm. 6 : 4 oranını kullan.'] },
      { text: 'Boyu 1,5 m olan Elif’in gölgesi 2 m iken aynı anda bir ağacın gölgesi 12 m’dir. Ağacın boyu __ m’dir.', answers: ['9'], hints: ['Güneş ışınları aynı açıyla geldiği için oluşan üçgenler benzerdir.', 'Ağacın gölgesi Elif’in gölgesinin kaç katı?'] },
      { text: '10 cm × 15 cm’lik bir fotoğraf benzer biçimde büyütülüyor. Kısa kenarı 20 cm olursa uzun kenarı __ cm olur.', answers: ['30'], hints: ['Kısa kenar kaç katına çıktı?'] },
      { text: 'ABC ∼ KLM ve benzerlik oranı [[|AB|/|KL|]] = [[1/3]]’tür. |AB| = 4 cm ise |KL| = __ cm', answers: ['12'] },
      { text: 'Haritada kenarları 3 cm, 4 cm ve 5 cm olan üçgen biçimli arazinin en uzun kenarı gerçekte 250 m ise en kısa kenarı __ m’dir.', answers: ['150'], hints: ['Haritadaki 1 cm gerçekte kaç metreye karşılık geliyor?'] },
    ],
  },

  // MAT.8.3.5
  {
    id: 'g8-pisagor-geometri-tahtasi',
    outcomes: ['MAT.8.3.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Geometri tahtasında Pisagor',
    instructions: 'Çivilere dokunarak istenen şekli oluştur ve şekli kapat. Alanlar arasındaki ilişkiyi gözle.',
    level: 3,
    launch: { text: 'Eski Mısır’da ipe eşit aralıklarla 12 düğüm atılıp 3-4-5 üçgeni kurularak dik köşeler elde edildiği anlatılır. Bu neden işe yarıyor olabilir?' },
    reflect: 'Eğik karenin alanını nasıl hesapladın? Dik kenarlardaki karelerin alanlarıyla ne ilişki fark ettin?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Dik kenarları 3 birim ve 4 birim olan bir dik üçgen oluştur.', target: { sides: 3, area: 6 }, hints: ['Bir yatay ve bir dikey kenarla başla.'], explain: 'Dik kenarlar üzerine kare kursaydık alanları 9 ve 16 olurdu.' },
      { prompt: 'Bu üçgenin hipotenüsü üzerine bir kare kur: bir kenarı 4 birim sağa, 3 birim aşağı giden eğik bir kare.', target: { sides: 4, area: 25 }, hints: ['Her köşede aynı hareketi döndürerek tekrarla: 4 sağ 3 aşağı, sonra 3 sağ 4 yukarı…'], explain: 'Alan 25, kenar 5. Bak: 9 + 16 = 25!' },
      { prompt: 'Dik kenarları 1 birim ve 1 birim olan bir dik üçgenin hipotenüsü üzerine eğik bir kare kur.', target: { sides: 4, area: 2 }, hints: ['Kenar, bir birimkarenin köşegeni olsun.'], explain: '1^{2} + 1^{2} = 2: hipotenüs √{2} birimdir.' },
      { prompt: 'Bir kenarı 1 birim sağa, 2 birim yukarı giden eğik bir kare oluştur.', target: { sides: 4, area: 5 }, hints: ['Her köşede çeyrek tur dönüp aynı hareketi tekrarla.'], explain: '1^{2} + 2^{2} = 5: kenar √{5} birimdir.' },
    ],
  },
  {
    id: 'g8-pisagor-kareler',
    outcomes: ['MAT.8.3.5'],
    type: 'fill',
    stage: 'model',
    title: 'Kenarlardaki kareler',
    instructions: 'Dik üçgenin kenarları üzerine kurulan karelerin alanlarını karşılaştır.',
    level: 2,
    launch: { text: 'Bir dik üçgenin her kenarına bir kare yapıştırıyoruz. Küçük iki karenin içindeki kumu dökersek, büyük kare tam dolar mı?', visual: pythSquares(3, 4, { a: '9', b: '16', c: '?' }) },
    reflect: 'Pisagor bağıntısını bir arkadaşına yalnızca formülle değil, karelerin alanlarıyla nasıl anlatırsın?',
    items: [
      { text: 'Dik kenarlardaki karelerin alanları 9 ve 16. Hipotenüs üzerindeki karenin alanı __ birimkare.', answers: ['25'], visual: pythSquares(3, 4, { a: '9', b: '16', c: '?' }), hints: ['Küçük iki karenin alanları ile büyük kare arasında nasıl bir ilişki olabilir?'] },
      { text: 'Bu üçgenin hipotenüsü __ birimdir.', answers: ['5'], visual: pythSquares(3, 4, { a: '9', b: '16', c: '25' }), hints: ['Alanı 25 olan karenin kenarı kaç birim?'] },
      { text: 'Hipotenüs üzerindeki karenin alanı __, hipotenüs __ birimdir.', answers: ['169', '13'], visual: pythSquares(5, 12, { a: '25', b: '144', c: '?' }) },
      { text: 'Soru işaretli karenin alanı __ birimkare.', answers: ['36'], visual: pythSquares(6, 8, { a: '?', b: '64', c: '100' }), hints: ['Büyük karenin alanından ne çıkarmalısın?'] },
      { text: 'Hipotenüs üzerindeki karenin alanı __ birimkare; bu yüzden hipotenüs √{5} birimdir.', answers: ['5'], visual: pythSquares(1, 2, { a: '1', b: '4', c: '?' }) },
      { text: 'Kenarları 6, 8 ve 10 olan üçgende 6^{2} + 8^{2} = __ ve 10^{2} = 100. Bu üçgen dik üçgen midir? __', answers: ['100', 'evet'], choices: ['64', '100', '196', 'evet', 'hayır'] },
      { text: 'Dik kenarları 0,3 ve 0,4 olan bir dik üçgenin hipotenüsü __', answers: ['0,5'], hints: ['0,3^{2} + 0,4^{2} = 0,09 + 0,16 = ?', 'Karesi bu sayı olan sayı kaçtır?'] },
    ],
  },
  {
    id: 'g8-dik-dar-genis',
    outcomes: ['MAT.8.3.5'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Dik mi, dar mı, geniş mi?',
    instructions: 'c en uzun kenar olsun. a² + b² = c² ise dik, a² + b² > c² ise dar açılı, a² + b² < c² ise geniş açılı üçgendir.',
    level: 3,
    launch: { text: 'Bir fayans ustası, odanın köşesinin tam dik olup olmadığını yalnızca metreyle nasıl kontrol eder?' },
    reflect: 'a² + b² değeri c²’den büyükse açı neden dar oluyor? Çubukların arasındaki açıyı kapatıp açtığını düşünerek açıkla.',
    categories: [
      { id: 'dik', label: 'Dik üçgen', color: '#6366f1' },
      { id: 'dar', label: 'Dar açılı', color: '#22c55e' },
      { id: 'genis', label: 'Geniş açılı', color: '#f97316' },
    ],
    items: [
      { content: '3, 4, 5', category: 'dik', explain: '9 + 16 = 25 = 5²' },
      { content: '5, 12, 13', category: 'dik', explain: '25 + 144 = 169 = 13²' },
      { content: '8, 15, 17', category: 'dik', explain: '64 + 225 = 289 = 17²' },
      { content: '6, 8, 10', category: 'dik', explain: '36 + 64 = 100 = 10²' },
      { content: '4, 5, 6', category: 'dar', explain: '16 + 25 = 41 > 36' },
      { content: '7, 8, 9', category: 'dar', explain: '49 + 64 = 113 > 81' },
      { content: '5, 5, 5', category: 'dar', explain: '25 + 25 = 50 > 25 (eşkenar üçgenin açıları 60°)' },
      { content: '2, 3, 4', category: 'genis', explain: '4 + 9 = 13 < 16' },
      { content: '4, 6, 9', category: 'genis', explain: '16 + 36 = 52 < 81' },
      { content: '3, 5, 7', category: 'genis', explain: '9 + 25 = 34 < 49' },
    ],
  },
  {
    id: 'g8-pisagor-kavram',
    outcomes: ['MAT.8.3.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Dik üçgenin sırrı',
    instructions: 'Dik kenarların kareleri toplamı hipotenüsün karesine eşittir. Kenarları değil, kareleri düşün!',
    level: 2,
    launch: { text: 'Can, dik kenarları 3 ve 4 olan üçgenin hipotenüsüne “3 + 4 = 7” dedi. Kareli kâğıtta çizince 7 birimlik bir kenar çıkmadı. Can nerede yanıldı?' },
    reflect: 'Bir üçgenin dik olup olmadığını kenarlardan nasıl anlarsın? Hangi kenarı c olarak seçmek gerekir? Neden?',
    questions: [
      { prompt: 'Bir dik üçgenin dik kenarları üzerine çizilen karelerin alanları 9 cm² ve 16 cm²’dir. Hipotenüs üzerine çizilen karenin alanı kaç cm²’dir?', choices: ['25', '7', '12', '144'], answer: 0, feedback: [null, '16 − 9 = 7; hipotenüsteki kare en büyük karedir, alanlar toplanır.', '3 · 4 = 12; kenarlar çarpılmaz, karelerin alanları toplanır.', '12^{2} = 144; 3 · 4 sonucunun karesini almak bağıntıya uymaz.'] },
      { prompt: { text: 'Şekildeki dik üçgende x kaç cm’dir?', visual: tri({ a: 5, b: 12, c: 13, right: 'C', sides: { a: '5 cm', b: '12 cm', c: 'x' } }) }, choices: ['13', '17', '15', '√{119}'], answer: 0, feedback: [null, '5 + 12 = 17: kenarlar değil kareleri toplanır.', 'Tahminle değil, 5^{2} + 12^{2} hesaplayarak bul.', 'x hipotenüs (en uzun kenar); kareler çıkarılmaz, toplanır.'], explain: 'x^{2} = 25 + 144 = 169 → x = 13' },
      { prompt: 'Dik kenarları 1 cm ve 2 cm olan dik üçgenin hipotenüsü kaç cm’dir?', choices: ['√{5}', '3', '5', '√{3}'], answer: 0, feedback: [null, '1 + 2 = 3: kenarlar toplanmaz, kareleri toplanır.', '5, hipotenüsün karesidir; kenarın kendisi √{5}.', '1^{2} + 2^{2} = 1 + 4 = 5, 3 değil.'] },
      { prompt: 'Kenarları 7 cm, 24 cm ve 25 cm olan üçgen için hangisi doğrudur?', choices: ['Dik üçgendir, hipotenüsü 25 cm’dir.', 'Geniş açılı üçgendir.', 'Dar açılı üçgendir.', 'Böyle bir üçgen yoktur.'], answer: 0, feedback: [null, '49 + 576 = 625 = 25^{2}: geniş değil, tam dik.', '49 + 576 = 625 = 25^{2}: dar değil, tam dik.', '7 + 24 > 25 olduğu için üçgen oluşur.'] },
      { prompt: 'Bir üçgende c en uzun kenar ve a^{2} + b^{2} < c^{2} ise üçgen nasıldır?', choices: ['Geniş açılı', 'Dar açılı', 'Dik', 'Eşkenar'], answer: 0, feedback: [null, 'Dar açılı üçgende a^{2} + b^{2} > c^{2} olur.', 'Dik üçgende eşitlik vardır.', 'Eşkenar üçgende a^{2} + b^{2} = 2c^{2} > c^{2} olur.'] },
      { prompt: 'Hangisi bir dik üçgenin kenar uzunlukları olabilir?', choices: ['0,3; 0,4; 0,5', '2; 3; 4', '1; 1; 2', '4; 5; 6'], answer: 0, feedback: [null, '4 + 9 = 13 < 16: geniş açılı üçgen.', '1 + 1 = 2: bu uzunluklarla üçgen bile oluşmaz.', '16 + 25 = 41 > 36: dar açılı üçgen.'], explain: '0,09 + 0,16 = 0,25 = 0,5^{2}' },
      { prompt: 'Dik kenarları [[3/2]] cm ve 2 cm olan dik üçgenin hipotenüsü kaç cm’dir?', choices: ['2,5', '3,5', '3', '√{6}'], answer: 0, feedback: [null, '1,5 + 2 = 3,5: kenarlar toplanmamalı.', '1,5 · 2 = 3; çarpma değil kareler toplamı gerekir.', '1,5^{2} = 2,25 ve 2^{2} = 4; toplam 6,25 eder, 6 değil.'], explain: '2,25 + 4 = 6,25 → √{6,25} = 2,5' },
    ],
  },

  // MAT.8.3.6
  {
    id: 'g8-ucgen-problemleri-hesapla',
    outcomes: ['MAT.8.3.6'],
    type: 'fill',
    stage: 'model',
    title: 'Gerçek yaşamda dik üçgenler',
    instructions: 'Problemi şekildeki dik üçgenle modelle; hangi kenarın hipotenüs olduğuna karar ver ve sonucu bul.',
    level: 3,
    launch: { text: 'İtfaiye merdiveni duvara dayanınca ucu ne kadar yükseğe ulaşır? Duvar, zemin ve merdiven bir dik üçgen oluşturur.' },
    reflect: 'Problemdeki dik üçgeni nasıl fark ettin? Hangi kenarın hipotenüs olduğuna nasıl karar verdin?',
    items: [
      { text: 'Bir uçurtmanın gergin ipi 25 m’dir. Uçurtma, ipi tutan elden yatayda 15 m uzaktaysa elden __ m yüksektedir.', answers: ['20'], visual: tri({ a: 15, b: 20, c: 25, right: 'C', sides: { a: '15 m', b: '?', c: '25 m' } }), hints: ['Hangisi hipotenüs: ip mi, yükseklik mi?', '25^{2} − 15^{2} = ?'] },
      { text: 'Bir gemi limandan önce 9 km doğuya, sonra 12 km kuzeye gidiyor. Gemi limana kuş uçuşu __ km uzaklıktadır.', answers: ['15'], visual: tri({ a: 9, b: 12, c: 15, right: 'C', sides: { a: '9 km', b: '12 km', c: '?' } }), hints: ['Kuş uçuşu uzaklık, dik üçgenin hangi kenarı?'] },
      { text: 'Kenarları 13 cm, 13 cm ve 10 cm olan ikizkenar üçgenin tabana ait yüksekliği __ cm’dir.', answers: ['12'], visual: tri({ a: 10, b: 13, c: 13, sides: { a: '10 cm', b: '13 cm', c: '13 cm' } }), hints: ['Yükseklik tabanı iki eş parçaya ayırır: 5 cm ve 5 cm.', 'Oluşan dik üçgende hipotenüs hangisi?'] },
      { text: 'Kenarları 9 cm ve 12 cm olan bir dikdörtgenin köşegeni __ cm’dir.', answers: ['15'], hints: ['Köşegen dikdörtgeni iki dik üçgene ayırır.'] },
      { text: 'Dik kenarları 6 cm ve 8 cm olan bir dik üçgenin çevresi __ cm’dir.', answers: ['24'], hints: ['Önce hipotenüsü bul.'] },
      { text: 'Bir tekerlekli sandalye rampasının yatay uzunluğu 24 m, yüksekliği 7 m’dir. Rampanın eğik yüzeyi __ m’dir.', answers: ['25'], visual: tri({ a: 24, b: 7, c: 25, right: 'C', sides: { a: '24 m', b: '7 m', c: '?' } }) },
    ],
  },
  {
    id: 'g8-ucgen-strateji-eslestir',
    outcomes: ['MAT.8.3.6'],
    type: 'match',
    stage: 'sembol',
    title: 'Hangi ilişkiyi kullanmalı?',
    instructions: 'Her problemi, onu çözmek için kurulan matematiksel ifadeyle ya da sonuçla eşleştir.',
    level: 2,
    perRound: 3,
    launch: { text: 'Üçgen problemlerinde üç güçlü aracımız var: açı-kenar ilişkisi, üçgen eşitsizliği ve Pisagor bağıntısı. Hangi problemde hangisi işe yarar?' },
    reflect: 'Bir problemde hangi aracı kullanacağına nasıl karar veriyorsun? İpucu veren kelimeler neler?',
    pairs: [
      { left: 'Eni 80 cm, boyu 60 cm olan ekranın köşegeni', right: '√(80² + 60²)' },
      { left: '10 m’lik merdivenin alt ucu duvardan 6 m uzakta; üst ucunun yüksekliği', right: '√(10² − 6²)' },
      { left: 'Kenarları 5 ve 8 olan üçgende üçüncü kenar x', right: '3 < x < 13' },
      { left: 'm(Â) = 70°, m(B̂) = 50° olan üçgende en uzun kenar', right: '[BC]' },
      { left: 'Kenarları 6, 8 ve 11 olan üçgenin türü', right: 'Geniş açılı, çünkü 36 + 64 < 121' },
      { left: 'Kenarları 4 ve 9 olan ikizkenar üçgenin üçüncü kenarı', right: '9, çünkü 4 + 4 < 9' },
    ],
  },
  {
    id: 'g8-ucgen-problemleri',
    outcomes: ['MAT.8.3.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Üçgen problemleri',
    instructions: 'Açı-kenar ilişkisi, üçgen eşitsizliği ve Pisagor bağıntısını kullanarak problemleri çöz. Sonucun mantıklı olup olmadığını kontrol et.',
    level: 3,
    launch: { text: 'Dikdörtgen bir parkın bir köşesinden karşı köşesine gitmek için kenarlardan mı, çimenin ortasından mı yürümeliyiz? Ne kadar kısalır?' },
    reflect: 'Çözümünü nasıl kontrol ettin? Örneğin köşegenin iki kenarın toplamından kısa olması gerektiğini kullandın mı?',
    questions: [
      { prompt: { text: '10 m uzunluğundaki bir merdiven duvara dayanmıştır. Merdivenin alt ucu duvardan 6 m uzaktadır. Üst ucu yerden kaç m yüksektedir?', visual: tri({ a: 6, b: 8, c: 10, right: 'C', sides: { a: '6 m', b: '?', c: '10 m' } }) }, choices: ['8', '4', '16', '√{136}'], answer: 0, feedback: [null, '10 − 6 = 4: kenarlar değil, kareler çıkarılır.', '10 + 6 = 16: kenarlar toplanmaz.', '√{100 + 36}: merdiven hipotenüs; kareler toplanmaz, çıkarılır.'], explain: '10^{2} − 6^{2} = 64 → 8 m' },
      { prompt: 'Ekranının eni 80 cm, boyu 60 cm olan bir televizyonun köşegeni kaç cm’dir?', choices: ['100', '140', '120', '90'], answer: 0, feedback: [null, '80 + 60 = 140: köşegen iki kenarın toplamından kısadır (üçgen eşitsizliği).', '80^{2} + 60^{2} = 10 000; karekökünü al.', 'Köşegen en uzun kenar olan 80 cm’den biraz uzun olmalı; 80^{2} + 60^{2} hesapla.'] },
      { prompt: 'Dikdörtgen biçimli bir parkın kenarları 120 m ve 50 m’dir. Mehmet bir köşeden karşı köşeye kenarlar yerine köşegen boyunca yürürse kaç m daha az yol yürür?', choices: ['40', '130', '170', '70'], answer: 0, feedback: [null, '130 m köşegenin uzunluğu; soru farkı soruyor.', '170 m kenarlardan yürünen yol.', '120 − 50 = 70 iki kenarın farkı; önce köşegeni hesaplamalısın.'], explain: 'Kenarlardan 170 m; köşegen √{16900} = 130 m. Fark 40 m.' },
      { prompt: 'ABC üçgeninde m(Â) = 90°, |AB| = 5 cm ve |AC| = 8 cm’dir. |BC| hangi iki ardışık tam sayı arasındadır?', choices: ['9 ile 10', '8 ile 9', '10 ile 11', '12 ile 13'], answer: 0, feedback: [null, '|BC| hipotenüs; en uzun kenar olan 8 cm’den uzun olmalı ama √{89} > 9.', '|BC| = √{89}; 100 > 89 olduğu için 10’dan küçüktür.', '5 + 8 = 13 kenarların toplamı; hipotenüs değil.'], explain: '|BC| = √{89}; 81 < 89 < 100' },
      { prompt: 'Bir üçgenin iki kenarı 6 cm ve 8 cm’dir. Üçgen geniş açılıdır ve geniş açının karşısındaki kenar tam sayıdır. Bu kenar kaç farklı değer alabilir?', choices: ['3', '2', '4', '5'], answer: 0, feedback: [null, 'Üçgen eşitsizliğinden c < 14; 11, 12 ve 13 olabilir.', 'c = 10 dik üçgen verir; geniş açı için c > 10 olmalı.', 'c = 14 olursa 6 + 8 = 14, üçgen düzleşir.'], explain: 'Geniş açılı olması için c^{2} > 100 → c > 10; üçgen eşitsizliğinden c < 14. c = 11, 12, 13.' },
      { prompt: 'ABC üçgeninde m(Â) = 40°, m(B̂) = 75°, |BC| = 7 cm ve |AC| = 9 cm’dir. |AB| tam sayı ise kaç cm’dir?', choices: ['8', '7', '9', '10'], answer: 0, feedback: [null, '|AB| = 7 olsaydı C açısı A açısına eşit olurdu.', '|AB| = 9 olsaydı C açısı B açısına eşit olurdu.', '[AB], 65°’lik C açısının karşısında; 75°’lik açının karşısındaki [AC]’den kısa olmalı.'], explain: 'm(Ĉ) = 65°. 40° < 65° < 75° olduğundan |BC| < |AB| < |AC| → 7 < |AB| < 9.' },
    ],
  },
  {
    id: 'g8-ucgen-hangisi-farkli',
    outcomes: ['MAT.8.3.6'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 2,
    launch: { text: 'Dört kenar üçlüsü var. Bir geometri dedektifi gibi her birini incele: üçgen oluşturuyor mu, dik mi, kenarları eşit mi?' },
    reflect: 'Seçtiğin üçlünün farklı olduğunu hangi ilişkiyi kullanarak gösterdin? Başka bir üçlü için de gerekçe bulabilir misin?',
    questions: [
      {
        prompt: 'Kenar uzunlukları (cm) verilen dört üçlüden hangisi farklı?',
        choices: ['3, 4, 5', '5, 5, 5', '2, 3, 6', '4, 6, 7'],
        answer: 0,
        reasons: ['Dik üçgen oluşturan tek üçlü: 9 + 16 = 25.', 'Eşkenar üçgen oluşturan tek üçlü: üç kenar eşit.', 'Üçgen oluşturamayan tek üçlü: 2 + 3 < 6.', 'Hem çeşitkenar hem dar açılı üçgen oluşturan tek üçlü: 16 + 36 > 49.'],
      },
    ],
  },

  // ── Veriden Olasılığa ──────────────────────────────────────────────────

  // MAT.8.7.1
  {
    id: 'g8-torba-deneyi',
    outcomes: ['MAT.8.7.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Tahmin et, dene, hesapla',
    instructions: 'Torbada 5 pembe ve 3 mavi özdeş top var. Önce tahmin et, sonra deney yap, en sonunda teorik olasılığı hesapla.',
    level: 2,
    launch: { text: 'Gözün kapalı torbadan bir top çekeceksin. İçinde 5 pembe, 3 mavi top var. Hangi rengin geleceğine iddiaya girsen, hangisini seçerdin? Neden?' },
    reflect: 'Öznel tahminin, deney sonucun ve teorik olasılık birbirine ne kadar yakındı? Fark neden oluşmuş olabilir?',
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Pembe', color: '#ec4899', weight: 5 }, { label: 'Mavi', color: '#3b82f6', weight: 3 }] },
    tasks: [
      { prompt: 'Deneye başlamadan önce tahmin et (öznel olasılık).', target: { question: 'Sence hangi renk topun çekilmesi daha olasıdır?', choices: ['Pembe', 'Mavi', 'Eşit olasılıklı'], answer: 'Pembe' }, explain: 'Bu senin öznel tahminin. Şimdi deneyle sınayalım.' },
      { prompt: 'Torbadan en az 20 kez top çek (her seferinde topu geri koyarak). Pembe kaç kez geldi, not et.', target: { question: 'Pembe gelmenin deneysel olasılığı nasıl hesaplanır?', choices: ['Pembe gelme sayısı ÷ toplam çekiliş sayısı', 'Pembe top sayısı ÷ mavi top sayısı', 'Toplam çekiliş sayısı ÷ pembe gelme sayısı'], answer: 'Pembe gelme sayısı ÷ toplam çekiliş sayısı' }, hints: ['Deneysel olasılık bir göreli sıklıktır: kaç denemenin kaçında?'] },
      { prompt: 'Şimdi torbanın içeriğine bakarak teorik olasılığı bul.', target: { question: 'Mavi top çekmenin teorik olasılığı nedir?', choices: ['3/8', '5/8', '3/5', '1/2'], answer: '3/8' }, hints: ['Torbada toplam kaç top var? Kaçı mavi?'] },
      { prompt: 'Çekiliş sayısını 50’ye, 100’e çıkar ve oranları izle.', target: { question: 'Çekiliş sayısı arttıkça pembe gelmenin deneysel olasılığı hangi değere yaklaşır?', choices: ['5/8', '3/8', '1', '1/2'], answer: '5/8' }, explain: 'Deneme sayısı arttıkça deneysel olasılık teorik olasılığa yaklaşır.' },
    ],
  },
  {
    id: 'g8-deney-sayisi-artinca',
    outcomes: ['MAT.8.7.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Deney sayısı artınca',
    instructions: 'Grafik ve tablolardaki deney sonuçlarını incele. Deneysel olasılık nasıl değişiyor?',
    level: 2,
    launch: { text: 'Bir parayı 10 kez attın ve 7 kez tura geldi. Bu para hileli mi? Daha çok atış yapsak ne olur?', visual: PARA_GRAFIK },
    reflect: 'Deney sayısı arttıkça deneysel olasılığın teorik olasılığa yaklaşması, hileli bir zarı fark etmekte nasıl işine yarar?',
    questions: [
      { prompt: { text: 'Grafiğe göre 20 atışta tura gelmenin deneysel olasılığı kaçtır?', visual: PARA_GRAFIK }, choices: ['0,65', '0,5', '0,51', '0,35'], answer: 0, feedback: [null, '0,5 teorik olasılıktır; grafikteki ilk nokta 0,65’i gösteriyor.', '0,51, 500 atıştaki değerdir.', '0,35 yazı gelme oranı olur (1 − 0,65).'] },
      { prompt: { text: 'Atış sayısı arttıkça deneysel olasılık ne oluyor?', visual: PARA_GRAFIK }, choices: ['0,5 civarında daha az dalgalanıyor.', 'Sürekli artıyor.', 'Sürekli azalıyor.', 'Hep aynı kalıyor.'], answer: 0, feedback: [null, '0,65’ten 0,42’ye düşüp sonra yeniden artıyor; sürekli artmıyor.', 'Bir düşüp bir çıkıyor; sürekli azalmıyor.', 'Değerler değişiyor ama giderek 0,5’e yaklaşıyor.'] },
      { prompt: { text: 'Bir zar 60 kez atıldı. 3 gelmenin deneysel olasılığı nedir?', visual: { kind: 'table', headers: ['Yüz', '1', '2', '3', '4', '5', '6'], rows: [['Sıklık', 8, 11, 9, 12, 10, 10]] } }, choices: ['[[9/60]]', '[[1/6]]', '[[9/6]]', '[[1/9]]'], answer: 0, feedback: [null, '[[1/6]] teorik olasılıktır; deneyde 60 atışın 9’unda 3 geldi.', 'Payda yüz sayısı (6) değil, toplam atış sayısı (60) olmalı.', 'Payda toplam atış sayısı olmalı.'] },
      { prompt: 'Ayşe 10 atışta 7 tura, Ece 1000 atışta 492 tura buldu. Paranın tura gelme olasılığını hangisinin sonucu daha iyi tahmin eder?', choices: ['Ece’ninki; deneme sayısı çok daha fazla.', 'Ayşe’ninki; daha çok tura gelmiş.', 'İkisi de aynı derecede iyi.', 'Hiçbiri; deneyler işe yaramaz.'], answer: 0, feedback: [null, 'Az sayıda denemede sonuçlar çok dalgalanır; 10 atış güvenilir değildir.', 'Deneme sayısı arttıkça tahmin güvenilir hâle gelir.', 'Çok sayıda deneme teorik olasılığa yaklaşan iyi bir tahmin verir.'] },
      { prompt: { text: 'Dilimlerin renkleri görünmeyen bir çark 500 kez çevrildi. Çarkın yaklaşık yarısı hangi renktir?', visual: { kind: 'table', headers: ['Renk', 'Kırmızı', 'Mavi', 'Sarı'], rows: [['Sıklık', 252, 124, 124]] } }, choices: ['Kırmızı', 'Mavi', 'Sarı', 'Belirlenemez'], answer: 0, feedback: [null, 'Mavi yaklaşık [[124/500]] ≈ 0,25 oranında geldi; çeyrek kadar.', 'Sarı da yaklaşık çeyrek oranında geldi.', '500 deneme bir tahmin yapmaya yetecek kadar çoktur.'] },
    ],
  },
  {
    id: 'g8-olasilik-yaklasimlari',
    outcomes: ['MAT.8.7.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Öznel, deneysel, teorik',
    instructions: 'Her durumda hangi olasılık yaklaşımı kullanılmış? Doğru gruba sürükle.',
    level: 1,
    launch: { text: 'Hava durumu sunucusu “yarın %70 yağmur” diyor, arkadaşın “bence yağmaz” diyor, zarın 6 gelme olasılığı [[1/6]]. Bu üç olasılık aynı yolla mı bulundu?' },
    reflect: 'Teorik olasılığın kullanılamadığı bir gerçek yaşam durumu düşün. Orada hangi yaklaşımı seçerdin? Neden?',
    categories: [
      { id: 'oznel', label: 'Öznel', color: '#ec4899' },
      { id: 'deneysel', label: 'Deneysel' },
      { id: 'teorik', label: 'Teorik', color: '#22c55e' },
    ],
    items: [
      { content: 'Hava çok bulutlu; bence yarın yağmur yağma olasılığı yüksek.', category: 'oznel', explain: 'Bir veriye ya da hesaba değil, kişisel yargıya dayanıyor.' },
      { content: 'Takımımızın bu maçı kazanacağını hissediyorum.', category: 'oznel', explain: '“Hissediyorum” kişisel bir inançtır.' },
      { content: 'Selin çok çalıştığı için sınavı geçme şansının yüksek olduğuna inanıyor.', category: 'oznel', explain: 'Kişinin kendi deneyimine ve inancına dayanıyor.' },
      { content: 'Bir parayı 100 kez attım, 46 kez yazı geldi; yazı gelme olasılığı [[46/100]].', category: 'deneysel', explain: 'Yapılan deneyin sonucundan (göreli sıklık) hesaplanmış.' },
      { content: 'Bir basketbolcu son 50 atışının 35’ini sokmuş; sokma olasılığı [[35/50]].', category: 'deneysel', explain: 'Geçmiş atış verilerine dayanıyor.' },
      { content: 'Kantine gelen son 200 öğrenciden 120’si tost aldı; tost alma olasılığı [[120/200]].', category: 'deneysel', explain: 'Toplanan veriye dayanıyor.' },
      { content: 'Bir zarın üst yüzüne 3 gelme olasılığı [[1/6]].', category: 'teorik', explain: '6 eş olasılıklı çıktıdan 1’i istenen çıktı.' },
      { content: 'Torbada 3 kırmızı, 5 mavi top var; kırmızı çekme olasılığı [[3/8]].', category: 'teorik', explain: 'Deney yapmadan, eş olasılıklı çıktıları sayarak bulundu.' },
      { content: '8 eş dilimli çarkın 2 dilimi sarı; sarı gelme olasılığı [[2/8]].', category: 'teorik', explain: 'Dilimler eş olduğu için çıktılar eş olasılıklıdır.' },
    ],
  },
  {
    id: 'g8-deneysel-olasilik-hesapla',
    outcomes: ['MAT.8.7.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Deneysel ve teorik olasılık',
    instructions: 'Olasılığı kesir (ör. 3/8) ya da ondalık gösterimle yaz.',
    level: 2,
    launch: { text: 'Aynı olay için iki farklı sayı bulabilir miyiz: biri deneyden, biri hesaptan? Hangisi “doğru” olasılıktır?' },
    reflect: 'Bir olayın deneysel ve teorik olasılığı neden farklı çıkabilir? Bu fark bir hata mıdır?',
    items: [
      { text: 'Bir para 50 kez atıldı ve 28 kez tura geldi. Tura gelmenin deneysel olasılığı __', answers: ['28/50|14/25|0,56'], hints: ['Kaç denemenin kaçında tura geldi?'] },
      { text: 'Bir zar 60 kez atıldı ve 12 kez 5 geldi. 5 gelmenin deneysel olasılığı __, teorik olasılığı __', answers: ['12/60|1/5|0,2|6/30', '1/6'], hints: ['Deneysel olasılık için deney sonucunu, teorik olasılık için zarın yüzlerini düşün.'] },
      { text: 'Torbada 4 kırmızı, 6 beyaz top var. Kırmızı top çekmenin teorik olasılığı __', answers: ['4/10|2/5|0,4'], hints: ['Torbada toplam kaç top var?'] },
      { text: 'Bir zarın üst yüzüne asal sayı gelmesinin teorik olasılığı __', answers: ['3/6|1/2|0,5'], hints: ['1’den 6’ya kadar hangi sayılar asaldır?'] },
      { text: 'Kantine gelen son 200 öğrenciden 120’si ayran aldı. Ayran almanın deneysel olasılığı __', answers: ['120/200|3/5|0,6|12/20|6/10'] },
      { text: '10 eş dilimli bir çarkın 7 dilimi mavi. Mavi GELMEME olasılığı __', answers: ['3/10|0,3'], hints: ['Mavi olmayan kaç dilim var?'] },
    ],
  },
  {
    id: 'g8-olasilik-karar',
    outcomes: ['MAT.8.7.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Olasılıkla karar ver',
    instructions: 'Duruma uygun olasılık yaklaşımını seç ve karar ver.',
    level: 2,
    launch: { text: 'Kantin görevlisi, yarın kaç simit hazırlayacağına karar verecek. Sezgisine mi güvenmeli, geçmiş günlerin kayıtlarına mı bakmalı?' },
    reflect: 'Bu sorulardan birinde hangi yaklaşımı neden seçtiğini bir arkadaşına açıkla. Başka bir yaklaşım da kullanılabilir miydi?',
    questions: [
      { prompt: 'Son 30 günün 24’ünde kantindeki simitler öğleden önce bitmiş. Zeynep bugün de bitip bitmeyeceğini tahmin etmek istiyor. Hangi yaklaşım daha uygundur?', choices: ['Deneysel olasılık (geçmiş veriler)', 'Öznel olasılık', 'Teorik olasılık', 'Hiçbiri'], answer: 0, feedback: [null, 'Elimizde veri varken yalnızca sezgiye güvenmek zayıf bir tahmin olur.', 'Simitlerin bitmesi eş olasılıklı çıktılardan oluşan bir olay değildir.', 'Geçmiş veriler iyi bir tahmin sağlar: [[24/30]].'] },
      { prompt: 'Bir zarın hileli olup olmadığına karar vermek isteyen Can ne yapmalıdır?', choices: ['Zarı çok sayıda atıp deneysel olasılıkları teorik olasılık [[1/6]] ile karşılaştırmalı.', 'Zarı bir kez atmalı.', 'Zarın rengine bakmalı.', 'Arkadaşlarının fikrini sormalı.'], answer: 0, feedback: [null, 'Tek atış hiçbir şey söylemez; her yüz gelebilir.', 'Renk, yüzlerin gelme olasılığını etkilemez.', 'Fikirler öznel olasılıktır; kanıt için deney gerekir.'] },
      { prompt: 'Bir para 10 kez atıldığında 7 kez tura geldi. Hangisi doğrudur?', choices: ['Tura gelmenin deneysel olasılığı [[7/10]]’dur; atış sayısı artarsa [[1/2]]’ye yaklaşması beklenir.', 'Tura gelmenin teorik olasılığı [[7/10]]’dur.', 'Bir sonraki atış kesinlikle yazı gelir.', 'Para kesinlikle hilelidir.'], answer: 0, feedback: [null, 'Teorik olasılık paranın iki yüzüne bakılarak bulunur: [[1/2]].', 'Para önceki atışları hatırlamaz; her atışta olasılık yine [[1/2]].', '10 atış karar vermek için çok azdır.'] },
      { prompt: 'Bir çark 8 eş dilimden oluşuyor ve 3 dilimi kırmızı. Kırmızı gelmenin teorik olasılığı nedir?', choices: ['[[3/8]]', '[[5/8]]', '[[3/5]]', '[[1/3]]'], answer: 0, feedback: [null, '[[5/8]] kırmızı GELMEME olasılığıdır.', 'Payda kırmızı olmayan dilim sayısı değil, toplam dilim sayısı olmalı.', 'Renk sayısını değil dilim sayısını düşün.'] },
      { prompt: 'Ali bu sezon 40 serbest atışın 30’unu sokmuş. Sonraki atışı sokma olasılığı için en uygun tahmin hangisidir?', choices: ['[[3/4]], geçmiş atışlara göre (deneysel)', '[[1/2]], çünkü top ya girer ya girmez', '1, çünkü Ali iyi bir oyuncu', '[[1/4]]'], answer: 0, feedback: [null, 'Girme ve girmeme eş olasılıklı değildir; bu yüzden [[1/2]] diyemeyiz.', 'İyi oyuncular da kaçırır; olasılık 1 değildir.', '[[1/4]] kaçırma oranıdır (10 / 40).'] },
      { prompt: 'Bir veteriner yeni bir ilacın işe yarayıp yaramadığını tahmin etmek istiyor. Hangi yaklaşım uygundur?', choices: ['İlacı denemiş çok sayıda hayvanın sonuçlarına bakmak (deneysel)', 'Zar atar gibi eş olasılıklı çıktıları saymak (teorik)', 'Yalnızca kendi hissine güvenmek (öznel)', 'Olasılık bu durumda kullanılamaz.'], answer: 0, feedback: [null, '“İşe yarar / yaramaz” eş olasılıklı çıktılar değildir.', 'Deneyimli birinin sezgisi değerlidir ama veriyle desteklenmelidir.', 'Olasılık, veri toplanarak bu durumda da kullanılabilir.'] },
    ],
  },
  {
    id: 'g8-olasilik-hangisi-farkli',
    outcomes: ['MAT.8.7.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 1,
    launch: { text: 'Olasılık 0’dan 1’e uzanan bir çizgi gibidir. Bu dört olayı o çizgide nereye koyardın?' },
    reflect: 'Seçtiğin olayın farklılığını olasılık değeriyle mi, yoksa olasılığın nasıl bulunacağıyla mı açıkladın? Diğer bakış açısı ne söylerdi?',
    questions: [
      {
        prompt: 'Hangi olay farklı? Gerekçeni düşün.',
        choices: ['Bir zarın 7 gelmesi', 'Bir paranın tura gelmesi', 'Bir zarın 1 ile 6 arasında (1 ve 6 dâhil) bir sayı gelmesi', 'Yarın yağmur yağması'],
        answer: 0,
        reasons: ['İmkânsız olan tek olay: olasılığı 0.', 'Olasılığı tam [[1/2]] olan tek olay.', 'Kesin olan tek olay: olasılığı 1.', 'Eş olasılıklı çıktılarla hesaplanamayan; öznel ya da deneysel yaklaşım gerektiren tek olay.'],
      },
    ],
  },

  // ── Cebirsel Düşünme ve Değişimler ─────────────────────────────────────

  // MAT.8.2.1
  {
    id: 'g8-noktayi-yerlestir',
    outcomes: ['MAT.8.2.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Noktayı yerleştir',
    instructions: 'Koordinat düzleminde istenen noktayı işaretle. Önce apsis (x), sonra ordinat (y)!',
    level: 1,
    launch: { text: 'Sinema biletinde “Sıra 3, Koltuk 5” yazıyor. Düzlemde bir yeri belirtmek için neden iki sayı gerekir? Hangisini önce söylediğimiz önemli mi?' },
    reflect: '(3, −2) ile (−2, 3) aynı nokta mı? Sıralı ikilide sıranın neden önemli olduğunu bir örnekle açıkla.',
    tool: 'coordinate',
    config: { size: 6 },
    tasks: [
      { prompt: 'Sinema salonunun planında Ayşe’nin koltuğu (3, −2) noktasında. Bu noktayı işaretle.', target: { x: 3, y: -2 }, hints: ['Orijinden önce sağa mı sola mı gideceksin?', 'Sonra yukarı mı aşağı mı?'] },
      { prompt: 'Apsisi −4, ordinatı 1 olan noktayı işaretle.', target: { x: -4, y: 1 } },
      { prompt: 'x ekseni üzerinde bulunan ve apsisi −3 olan noktayı işaretle.', target: { x: -3, y: 0 }, hints: ['x ekseni üzerindeki bir noktanın ordinatı kaçtır?'] },
      { prompt: 'III. bölgede olan, x eksenine 2 birim ve y eksenine 5 birim uzaklıktaki noktayı işaretle.', target: { x: -5, y: -2 }, hints: ['III. bölgede apsis ve ordinatın işaretleri ne olur?', 'y eksenine uzaklık apsisi mi, ordinatı mı belirler?'] },
    ],
  },
  {
    id: 'g8-koordinat-oku',
    outcomes: ['MAT.8.2.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Noktanın koordinatları',
    instructions: 'Önce apsisi (x), sonra ordinatı (y) oku.',
    level: 1,
    launch: { text: 'Bir haritada hazinenin yeri işaretlenmiş. Arkadaşına telefonda tarif etmek için hangi iki sayıyı, hangi sırayla söylemelisin?' },
    reflect: 'Bir noktanın koordinatlarını okurken hangi hatayı yapmamaya dikkat ettin?',
    generator: { id: 'coordRead', params: { range: 6 }, count: 8 },
  },
  {
    id: 'g8-bolgeler',
    outcomes: ['MAT.8.2.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Nokta hangi bölgede?',
    instructions: 'Apsis ve ordinatın işaretine bakarak her noktayı bulunduğu bölgeye sürükle.',
    level: 1,
    launch: { text: 'Eksenler düzlemi dört bölgeye ayırır. Bir noktayı çizmeden yalnızca koordinatlarının işaretine bakarak bölgesini bilebilir misin?' },
    reflect: 'Dört bölgenin işaret kuralını bir tablo ya da şekille nasıl özetlersin?',
    categories: [
      { id: 'b1', label: 'I. bölge (+, +)', color: '#22c55e' },
      { id: 'b2', label: 'II. bölge (−, +)' },
      { id: 'b3', label: 'III. bölge (−, −)', color: '#a855f7' },
      { id: 'b4', label: 'IV. bölge (+, −)', color: '#f97316' },
    ],
    items: [
      { content: '(2, 3)', category: 'b1', explain: 'Apsis ve ordinat pozitif.' },
      { content: '(4, 1)', category: 'b1', explain: 'Apsis ve ordinat pozitif.' },
      { content: '(−1, 4)', category: 'b2', explain: 'Apsis negatif, ordinat pozitif.' },
      { content: '(−4, 2)', category: 'b2', explain: 'Apsis negatif, ordinat pozitif.' },
      { content: '(−5, −2)', category: 'b3', explain: 'İkisi de negatif.' },
      { content: '(−3, −3)', category: 'b3', explain: 'İkisi de negatif.' },
      { content: '(3, −6)', category: 'b4', explain: 'Apsis pozitif, ordinat negatif.' },
      { content: '(6, −1)', category: 'b4', explain: 'Apsis pozitif, ordinat negatif.' },
    ],
  },
  {
    id: 'g8-koordinat-kavramlari',
    outcomes: ['MAT.8.2.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Koordinat sistemi kavramları',
    instructions: 'Kavramları açıklamaları ya da örnekleriyle eşleştir.',
    level: 1,
    launch: { text: 'Descartes’ın tavandaki bir sineğin yerini iki duvara olan uzaklıklarıyla tarif etmeye çalışırken koordinat sistemini düşündüğü anlatılır. Bu sistemin parçalarına ne ad veriyoruz?' },
    reflect: '“Düzlemdeki her noktaya bir sıralı ikili, her sıralı ikiliye bir nokta karşılık gelir.” Bu cümleyi kendi sözlerinle açıkla.',
    pairs: [
      { left: 'Orijin', right: '(0, 0)' },
      { left: 'Apsis', right: 'Sıralı ikilinin birinci bileşeni (x)' },
      { left: 'Ordinat', right: 'Sıralı ikilinin ikinci bileşeni (y)' },
      { left: 'x ekseni üzerindeki bir nokta', right: '(5, 0)' },
      { left: 'y ekseni üzerindeki bir nokta', right: '(0, −3)' },
      { left: 'II. bölgedeki bir nokta', right: '(−2, 4)' },
      { left: 'IV. bölgedeki bir nokta', right: '(3, −1)' },
    ],
  },

  // MAT.8.2.2
  {
    id: 'g8-buyume-oruntusu',
    outcomes: ['MAT.8.2.2'],
    type: 'fill',
    stage: 'model',
    title: 'Değişim oranını yakala',
    instructions: 'Tablodaki değişimi incele: x 1 arttığında y ne kadar değişiyor? Başlangıç değeri ne?',
    level: 1,
    launch: { text: 'Bir maratoncu her dakika yaklaşık 200 m koşuyor. 10. dakikada nerede olur? Peki 1 saat sonra? Tablo mu, kural mı daha kullanışlı?', visual: TABLO_MARATON },
    reflect: 'Bir tabloda doğrusal bir ilişki olduğunu nasıl anlarsın? Değişim oranının kuraldaki yerini bir arkadaşına göster.',
    items: [
      { text: 'Her dakika yol __ m artıyor.', answers: ['200'], visual: TABLO_MARATON },
      { text: 'Yolu veren kural: f(x) = __x', answers: ['200'], visual: TABLO_MARATON, hints: ['1 dakikada 200 m ise x dakikada kaç m?'] },
      { text: 'Değişim oranı (eğim) __ cm/hafta, başlangıç boyu __ cm.', answers: ['2', '6'], visual: TABLO_FIDAN, hints: ['Her hafta boy kaç cm artıyor?', '0. haftada boy kaç cm?'] },
      { text: 'Fidanın boyunu veren kural: f(x) = __x + __', answers: ['2', '6'], visual: TABLO_FIDAN },
      { text: 'Bu fidanın boyu 10. haftada f(10) = __ cm olur.', answers: ['26'], visual: TABLO_FIDAN, hints: ['Tabloyu 10. haftaya kadar uzatmak yerine kuralı kullanabilir misin?'] },
      { text: 'Değişim oranı (eğim) = __', answers: ['-2'], visual: TABLO_BOSALAN, hints: ['Su artıyor mu, azalıyor mu? Değişimin işareti ne olmalı?'], explain: 'Her dakika 2 L azalıyor; eğim −2. Kural: f(x) = 50 − 2x.' },
      { text: 'Ardışık farklar 3, 5, 7… Bu ilişki __.', answers: ['doğrusal değil'], visual: { kind: 'table', headers: ['x', '1', '2', '3', '4'], rows: [['y', 1, 4, 9, 16]] }, choices: ['doğrusal', 'doğrusal değil'], explain: 'Doğrusal ilişkide değişim oranı sabittir; burada farklar sürekli değişiyor.' },
    ],
  },
  {
    id: 'g8-tablodan-fonksiyona',
    outcomes: ['MAT.8.2.2'],
    type: 'fill',
    stage: 'model',
    title: 'Tablo, grafik ve kural',
    instructions: 'Tablo, grafik ve denklem arasında geçiş yaparak boşlukları doldur.',
    level: 2,
    launch: { text: 'İçinde biraz su olan bir depoya musluktan su doluyor. Tabloya bakarak 10. dakikada depoda kaç litre su olacağını tahmin edebilir misin?', visual: TABLO_DEPO },
    reflect: 'Taksi probleminde 230 TL’den kilometreye geri giderken nasıl düşündün? Hangi temsil işini kolaylaştırdı?',
    items: [
      { text: 'Bir depoya dolan su tabloda verilmiştir. Eğim (değişim oranı) __', answers: ['3'], visual: TABLO_DEPO, hints: ['x 1 artınca y kaç artıyor?'] },
      { text: 'Bu ilişkiyi gösteren fonksiyon: f(x) = 3x + __', answers: ['5'], visual: TABLO_DEPO, hints: ['x = 0 iken depoda kaç litre su var?'] },
      { text: '10. dakikada depoda f(10) = __ litre su olur.', answers: ['35'], visual: TABLO_DEPO },
      { text: 'Taksi ücreti f(x) = 15x + 20 (x: km). 8 km yol giden Elif __ TL öder.', answers: ['140'] },
      { text: 'Aynı taksiyle 230 TL ödeyen Mehmet __ km yol gitmiştir.', answers: ['14'], hints: ['Önce açılış ücretini çıkar.', 'Kalan tutarda kaç tane 15 TL var?'] },
      { text: 'Grafikteki doğrunun eğimi __', answers: ['2'], visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: -1 }], points: [{ x: 0, y: -1, label: 'A' }, { x: 2, y: 3, label: 'B' }] }, hints: ['A’dan B’ye giderken yatayda kaç birim, dikeyde kaç birim gidiyorsun?', 'Eğim = dikey değişim ÷ yatay değişim'] },
      { text: 'Bu doğrunun denklemi y = 2x + b ise b = __', answers: ['-1'], visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: -1 }], points: [{ x: 0, y: -1, label: 'A' }, { x: 2, y: 3, label: 'B' }] }, hints: ['Doğru y eksenini nerede kesiyor?'] },
    ],
  },
  {
    id: 'g8-temsil-ceviri',
    outcomes: ['MAT.8.2.2'],
    type: 'match',
    stage: 'sembol',
    title: 'Grafik, tablo, öykü, denklem',
    instructions: 'Her grafiği, tabloyu ya da gerçek yaşam durumunu onu temsil eden doğrusal fonksiyonla eşleştir.',
    level: 2,
    perRound: 4,
    launch: { text: 'Aynı doğrusal ilişkiyi bir öyküyle, bir tabloyla, bir grafikle ya da bir denklemle anlatabiliriz. Bunlar arasında çeviri yapabilir misin?' },
    reflect: 'Bir grafikten denkleme geçerken önce neye baktın: y eksenini kestiği yere mi, dikliğine mi? Neden?',
    pairs: [
      { left: { visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: 1 }], points: [{ x: 0, y: 1 }, { x: 1, y: 3 }] } }, right: 'f(x) = 2x + 1' },
      { left: { visual: { kind: 'coords', range: 5, lines: [{ m: -1, b: 3 }], points: [{ x: 0, y: 3 }, { x: 3, y: 0 }] } }, right: 'f(x) = −x + 3' },
      { left: { visual: { kind: 'coords', range: 5, lines: [{ m: 0, b: -2 }] } }, right: 'f(x) = −2' },
      { left: { visual: { kind: 'table', headers: ['x', '0', '1', '2', '3'], rows: [['f(x)', 4, 7, 10, 13]] } }, right: 'f(x) = 3x + 4' },
      { left: 'Taksi: açılış 20 TL, kilometresi 15 TL', right: 'f(x) = 15x + 20' },
      { left: '50 L su bulunan depodan dakikada 2 L su boşalıyor', right: 'f(x) = 50 − 2x' },
      { left: 'Tanesi 12 TL olan kalemlerden x tane', right: 'f(x) = 12x' },
      { left: 'Kullanımdan bağımsız, aylık 200 TL sabit tarife', right: 'f(x) = 200' },
    ],
  },
  {
    id: 'g8-dogrusal-temsiller',
    outcomes: ['MAT.8.2.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Eğim ve gerçek yaşam',
    instructions: 'Doğrusal fonksiyonların temsilleri arasında geçiş yap ve gerçek yaşam durumlarını yorumla.',
    level: 2,
    launch: { text: 'Tekerlekli sandalye kullanan biri, yardım almadan bir rampayı çıkabilmeli. Rampa ne kadar dik olabilir? Eğimi nasıl ölçeriz?' },
    reflect: 'Tablo, grafik ve denklemden hangisi bir soruyu en hızlı çözmeni sağladı? Her biri hangi durumda daha kullanışlı?',
    questions: [
      { prompt: { text: 'Grafiği verilen doğrusal fonksiyon hangisidir?', visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: 1 }], points: [{ x: 0, y: 1 }, { x: 1, y: 3 }] } }, choices: ['f(x) = 2x + 1', 'f(x) = x + 2', 'f(x) = 2x − 1', 'f(x) = −2x + 1'], answer: 0, feedback: [null, 'Doğru y eksenini 1’de kesiyor ve x 1 artınca y 2 artıyor: eğim 2, başlangıç 1.', 'y eksenini −1’de değil 1’de kesiyor.', 'Doğru sağa doğru yükseliyor; eğim pozitif olmalı.'] },
      { prompt: { text: 'Grafiği verilen doğrusal fonksiyon hangisidir?', visual: { kind: 'coords', range: 5, lines: [{ m: -1, b: 3 }], points: [{ x: 0, y: 3 }, { x: 3, y: 0 }] } }, choices: ['f(x) = −x + 3', 'f(x) = x + 3', 'f(x) = −x − 3', 'f(x) = 3x'], answer: 0, feedback: [null, 'Doğru sağa doğru alçalıyor; eğim negatif olmalı.', 'y eksenini −3’te değil 3’te kesiyor.', 'Bu doğru orijinden geçerdi.'] },
      { prompt: { text: 'Tablodaki doğrusal ilişkinin eğimi (değişim oranı) kaçtır?', visual: { kind: 'table', headers: ['x', '0', '1', '2', '3'], rows: [['f(x)', 4, 7, 10, 13]] } }, choices: ['3', '4', '13', '[[1/3]]'], answer: 0, feedback: [null, '4 başlangıç değeridir (x = 0); eğim ise değişim miktarıdır.', '13 son değerdir; değişim oranı ardışık farktır.', 'Dikey değişim ÷ yatay değişim = 3 ÷ 1; oranı ters çevirme.'] },
      { prompt: 'Bir telefon tarifesinde aylık ücret f(x) = 2x + 150 (x: konuşma süresi, dakika) ise bağımsız değişken hangisidir?', choices: ['Konuşma süresi', 'Aylık ücret', '150 TL', '2 TL'], answer: 0, feedback: [null, 'Aylık ücret konuşma süresine BAĞLI; bağımlı değişkendir.', '150 TL sabit ücrettir, değişken değil.', '2 TL dakika başına ücrettir, yani eğimdir.'] },
      { prompt: 'f(x) = 3x ve g(x) = 5x doğrularından hangisinin grafiği daha diktir?', choices: ['g(x) = 5x, çünkü eğimi daha büyüktür.', 'f(x) = 3x', 'İkisi aynı diklikte', 'Karar verilemez'], answer: 0, feedback: [null, 'x 1 artınca f 3, g 5 artıyor; g daha hızlı yükselir.', 'İkisi de orijinden geçer ama eğimleri farklıdır.', 'Eğimler karşılaştırılarak karar verilebilir.'] },
      { prompt: 'Bir fidan her hafta 2 cm uzuyor. Başlangıçta boyu 6 cm ise 5. haftanın sonunda boyu kaç cm olur?', choices: ['16', '10', '12', '30'], answer: 0, feedback: [null, 'Başlangıç boyunu (6 cm) unuttun mu? 2 · 5 + 6.', '5 hafta var: 6 + 2 · 5.', 'Başlangıç değeri ile hafta sayısı çarpılmaz.'], explain: 'f(x) = 2x + 6 → f(5) = 16' },
      { prompt: 'Bir rehbere göre engelli rampası, her 12 m yatay mesafede en fazla 1 m yükselmelidir (eğim en fazla [[1/12]]). Hangi rampa uygundur?', choices: ['Yatayda 24 m, yükseklik 1,5 m', 'Yatayda 6 m, yükseklik 1 m', 'Yatayda 10 m, yükseklik 1 m', 'Yatayda 12 m, yükseklik 2 m'], answer: 0, feedback: [null, 'Eğim [[1/6]]: 12 m’de 2 m yükselmek demek; çok dik.', 'Eğim [[1/10]] > [[1/12]]; sınırı aşıyor.', 'Eğim [[2/12]]; izin verilenin iki katı.'], explain: '1,5 ÷ 24 = [[1/16]] < [[1/12]]' },
      { prompt: 'Hangi tablo doğrusal bir ilişki GÖSTERMEZ?', choices: ['x: 1, 2, 3 → y: 1, 4, 9', 'x: 1, 2, 3 → y: 5, 7, 9', 'x: 1, 2, 3 → y: 2, 4, 6', 'x: 1, 2, 3 → y: 10, 8, 6'], answer: 0, feedback: [null, 'Her adımda 2 artıyor; değişim sabit, doğrusal.', 'Her adımda 2 artıyor; doğrusal (y = 2x).', 'Her adımda 2 azalıyor; değişim sabit olduğu için doğrusal.'] },
    ],
  },

  // MAT.8.2.3
  {
    id: 'g8-kesisim-noktasi',
    outcomes: ['MAT.8.2.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kesişim noktasını bul',
    instructions: 'Doğruların kesiştiği ya da eksenleri kestiği noktayı koordinat düzleminde işaretle.',
    level: 3,
    launch: { text: 'Can, Ali’den 3 m önde yürümeye başlıyor; Ali ise iki kat hızlı. Ali Can’a nerede yetişir? Grafikte bu an nasıl görünür?' },
    reflect: 'Kesişim noktasının koordinatları iki doğrunun denklemini de sağlıyor mu? Kontrol et ve bunun anlamını açıkla.',
    tool: 'coordinate',
    config: { size: 6 },
    tasks: [
      { prompt: 'y = x + 1 ve y = −x + 3 doğrularının kesişim noktasını işaretle.', target: { x: 1, y: 2 }, hints: ['Hangi x değeri için iki kural aynı y’yi verir?', 'x = 1’i iki kuralda da dene.'] },
      { prompt: 'y = 2x − 4 doğrusunun x eksenini kestiği noktayı işaretle.', target: { x: 2, y: 0 }, hints: ['x ekseni üzerinde y kaçtır?'] },
      { prompt: 'y = −2x + 3 doğrusunun y eksenini kestiği noktayı işaretle.', target: { x: 0, y: 3 }, hints: ['y ekseni üzerinde x kaçtır?'] },
      { prompt: 'Ali’nin konumu y = 2x, Can’ınki y = x + 3 (x: saniye, y: metre). Ali’nin Can’a yetiştiği noktayı işaretle.', target: { x: 3, y: 6 }, hints: ['Bir tablo yap: x = 1, 2, 3 için ikisinin konumu ne?'], explain: '3. saniyede ikisi de 6. metrede: 2 · 3 = 3 + 3.' },
    ],
  },
  {
    id: 'g8-yetisme-problemi',
    outcomes: ['MAT.8.2.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Kim kime yetişir?',
    instructions: 'Grafikteki iki doğruyu karşılaştır: başlangıç noktaları ve diklikleri ne anlatıyor?',
    level: 2,
    launch: { text: 'Elif’in kumbarasında 40 TL var ve haftada 10 TL biriktiriyor. Deniz’in kumbarası boş ama haftada 20 TL biriktiriyor. Deniz Elif’e yetişir mi?', visual: BIRIKIM },
    reflect: 'Grafikte “yetişme” anını nasıl buldun? Aynı soruyu denklem kurarak çözseydin ne yapardın?',
    questions: [
      { prompt: { text: 'Başlangıçta kimin daha çok parası var?', visual: BIRIKIM }, choices: ['Elif’in', 'Deniz’in', 'Eşit', 'Grafikten anlaşılmaz'], answer: 0, feedback: [null, 'x = 0’da Deniz’in doğrusu 0’dan başlıyor.', 'Doğrular x = 0’da farklı yerlerden başlıyor.', 'Doğruların y eksenini kestiği yerler başlangıç miktarını gösterir.'] },
      { prompt: { text: 'Kim daha hızlı biriktiriyor?', visual: BIRIKIM }, choices: ['Deniz; doğrusu daha dik.', 'Elif; doğrusu daha yukarıdan başlıyor.', 'İkisi eşit hızda.', 'Hiçbiri.'], answer: 0, feedback: [null, 'Yukarıdan başlamak hızlı biriktirmek demek değildir; dikliğe bak.', 'Doğrular paralel olsaydı eşit hızda olurlardı.', 'İki doğru da yükseliyor; ikisi de biriktiriyor.'] },
      { prompt: { text: 'Kaçıncı haftada paraları eşit olur?', visual: BIRIKIM }, choices: ['4', '2', '8', 'Hiçbir zaman'], answer: 0, feedback: [null, '2. haftada Elif 60, Deniz 40 TL.', '8. haftada Deniz 160, Elif 120 TL.', 'Eğimleri farklı olan doğrular bir noktada kesişir.'] },
      { prompt: { text: '6. haftada kimin parası daha fazladır?', visual: BIRIKIM }, choices: ['Deniz’in', 'Elif’in', 'Eşit', 'Belirlenemez'], answer: 0, feedback: [null, 'Kesişim noktasından sonra daha dik olan doğru üstte kalır.', '4. haftada eşitlerdi; sonra Deniz öne geçti.', 'Grafikte x = 6 için iki doğrunun yüksekliğine bak.'] },
      { prompt: 'Kesişim noktası (4, 80) için hangisi doğrudur?', choices: ['Hem 10 · 4 + 40 = 80 hem 20 · 4 = 80’dir.', 'Yalnızca Elif’in doğrusu üzerindedir.', 'İki doğrunun eğimidir.', 'Orijindir.'], answer: 0, feedback: [null, '20 · 4 = 80; Deniz’in doğrusu üzerinde de.', 'Eğim bir nokta değil, bir değişim oranıdır.', 'Orijin (0, 0) noktasıdır.'] },
      { prompt: 'Deniz de haftada 10 TL biriktirseydi doğrular nasıl olurdu?', choices: ['Paralel olurdu, hiç kesişmezdi.', 'Dik kesişirdi.', 'Çakışırdı.', 'Orijinde kesişirdi.'], answer: 0, feedback: [null, 'Diklik için eğimlerin çarpımı −1 olmalı.', 'Çakışmak için başlangıç değerleri de aynı olmalı; Elif 40, Deniz 0 TL ile başlıyor.', 'Elif’in doğrusu orijinden geçmiyor.'] },
    ],
  },
  {
    id: 'g8-dogrularin-durumu',
    outcomes: ['MAT.8.2.3'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Paralel mi, dik mi?',
    instructions: 'Eğimleri eşit doğrular paraleldir; eğimlerinin çarpımı −1 olan doğrular diktir.',
    level: 2,
    launch: { text: 'Bir matematik yazılımında y = 2x + n doğrusunu çizip n’yi değiştirdiğini düşün. Doğru nasıl hareket eder? Peki eğimi değiştirirsen?' },
    reflect: 'y = mx + n’de m’yi sabit tutup n’yi değiştirince doğru nasıl hareket ediyor? n’yi sabit tutup m’yi değiştirince?',
    questions: [
      { prompt: { text: 'Grafikteki iki doğrunun birbirine göre durumu nedir?', visual: { kind: 'coords', range: 5, lines: [{ m: 1, b: 2 }, { m: 1, b: -1 }] } }, choices: ['Paraleldir.', 'Diktir.', 'Dik olmadan kesişir.', 'Çakışıktır.'], answer: 0, feedback: [null, 'Dik doğrular 90°’lik açıyla kesişir; bunlar hiç kesişmiyor.', 'Doğrular aynı eğimde; hiçbir noktada buluşmuyorlar.', 'Çakışık doğrular üst üste olur; bunların arasında boşluk var.'] },
      { prompt: 'y = 2x + 1 doğrusuna paralel olan doğru hangisidir?', choices: ['y = 2x − 3', 'y = −2x + 1', 'y = x + 1', 'y = −[[1/2]]x + 1'], answer: 0, feedback: [null, 'Eğim −2; işaret farklı olunca doğru ters yöne eğilir.', 'Eğim 1; y eksenini aynı noktada kesmek paralellik değildir.', 'Eğim −[[1/2]]: bu doğru dik kesişir, paralel değildir.'] },
      { prompt: 'y = 2x + 1 doğrusuna dik olan doğru hangisidir?', choices: ['y = −[[1/2]]x + 4', 'y = 2x + 5', 'y = −2x', 'y = [[1/2]]x'], answer: 0, feedback: [null, 'Eğim aynı (2): bu doğru paraleldir.', '2 · (−2) = −4 ≠ −1.', '2 · [[1/2]] = 1; çarpım −1 olmalı, işaret de değişmeli.'], explain: '2 · (−[[1/2]]) = −1' },
      { prompt: { text: 'y = x + 1 ve y = −x + 3 doğrularının kesişim noktası hangisidir?', visual: { kind: 'coords', range: 5, lines: [{ m: 1, b: 1 }, { m: -1, b: 3 }] } }, choices: ['(1, 2)', '(2, 1)', '(0, 3)', '(−1, 0)'], answer: 0, feedback: [null, 'Apsis ile ordinat yer değiştirmiş: (2, 1) birinci doğrunun üzerinde değil.', '(0, 3) yalnızca ikinci doğrunun y eksenini kestiği nokta.', '(−1, 0) yalnızca birinci doğrunun x eksenini kestiği nokta.'], explain: 'x + 1 = −x + 3 → x = 1, y = 2.' },
      { prompt: 'Eğimlerinin çarpımı −1 olan iki doğru için hangisi doğrudur?', choices: ['Birbirine diktir.', 'Paraleldir.', 'Çakışıktır.', 'Hiç kesişmez.'], answer: 0, feedback: [null, 'Paralel doğruların eğimleri eşittir.', 'Çakışık doğruların hem eğimleri hem y eksenini kestikleri noktalar aynıdır.', 'Eğimleri farklı doğrular mutlaka kesişir.'] },
      { prompt: 'y = 4 ve y = −1 doğruları için hangisi doğrudur?', choices: ['İkisi de x eksenine paraleldir; birbirine de paraleldir.', 'Birbirine diktir.', 'Orijinde kesişir.', 'İkisi de y eksenine paraleldir.'], answer: 0, feedback: [null, 'İkisinin de eğimi 0; dik olamazlar.', 'Hiçbiri orijinden geçmiyor.', 'y = sabit doğrular yataydır, x eksenine paraleldir.'] },
      { prompt: 'y = mx + 5 doğrusu y = 3x − 2 doğrusuna paralel ise m kaçtır?', choices: ['3', '−3', '5', '−[[1/3]]'], answer: 0, feedback: [null, '−3 eğimli doğru ters yöne eğilir.', '5, y eksenini kestiği noktadır, eğim değil.', '−[[1/3]] eğimli doğru dik olurdu.'] },
    ],
  },
  {
    id: 'g8-dogru-hangisi-farkli',
    outcomes: ['MAT.8.2.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 2,
    launch: { text: 'Dört doğru aynı düzlemde. Eğimlerine, y eksenini kestikleri yerlere, üzerlerindeki noktalara bakarak her birinde başka bir “farklılık” bulabilir misin?' },
    reflect: 'Bir doğrunun farklı olduğunu gösterirken eğimini mi, y eksenini kestiği noktayı mı, yoksa bir noktayı mı kullandın?',
    questions: [
      {
        prompt: { text: 'Hangi doğru farklı? Gerekçeni düşün.', visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: 1 }, { m: 2, b: -3 }, { m: -0.5, b: 1 }, { m: 3, b: 1 }] } },
        choices: ['y = 2x + 1', 'y = 2x − 3', 'y = −[[1/2]]x + 1', 'y = 3x + 1'],
        answer: 0,
        reasons: ['(1, 3) noktasından geçen tek doğru.', 'y eksenini negatif bir değerde (−3) kesen tek doğru.', 'Eğimi negatif olan, yani sağa doğru alçalan tek doğru.', 'Eğimi en büyük, yani en dik olan tek doğru.'],
      },
    ],
  },

  // MAT.8.2.4
  {
    id: 'g8-algoritmayi-calistir',
    outcomes: ['MAT.8.2.4'],
    type: 'fill',
    stage: 'model',
    title: 'Algoritmayı çalıştır',
    instructions: 'Akış şemasındaki adımları sırayla uygula.',
    level: 2,
    launch: { text: 'Bir makineye bir sayı atıyorsun, makine adımları sırayla uyguluyor ve bir sayı veriyor. Çıktıyı biliyorsan girdiyi bulabilir misin?', visual: ALGORITMA_2X3 },
    reflect: 'Çıktıdan girdiye geri giderken adımları neden ters sırayla ve ters işlemlerle uyguladın?',
    items: [
      { text: 'Girdi x = 5 ise çıktı __', answers: ['13'], visual: ALGORITMA_2X3 },
      { text: 'Çıktı 21 ise girdi x = __', answers: ['9'], visual: ALGORITMA_2X3, hints: ['Son adımdan geriye doğru git: 3 eklemeden önce sayı kaçtı?', 'Sonra 2 ile çarpmanın tersi ne?'] },
      { text: 'Bu algoritma f(x) = __x + __ fonksiyonunu hesaplar.', answers: ['2', '3'], visual: ALGORITMA_2X3 },
      { text: 'C = 25 ise F = __', answers: ['77'], visual: ALGORITMA_CF, hints: ['25 · 9 = 225; şimdi 5’e böl.'] },
      { text: 'C = −10 ise F = __', answers: ['14'], visual: ALGORITMA_CF, hints: ['−10 · 9 = −90; işaretlere dikkat.'] },
      { text: 'Su faturası: sabit 40 TL + m³ başına 25 TL. 12 m³ su kullanan ailenin faturası __ TL', answers: ['340'], hints: ['Önce hangi işlemi, sonra hangisini yaparsın? Adımları sırala.'] },
    ],
  },
  {
    id: 'g8-algoritma-adimlari',
    outcomes: ['MAT.8.2.4'],
    type: 'sort',
    stage: 'sembol',
    title: 'Algoritmayı kur',
    instructions: 'Doğrusal fonksiyon problemlerinin çözüm adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Bir robota taksi ücretini hesaplatmak istiyorsun. Robot yalnızca sırayla verilen adımları yapabiliyor. Hangi adımı önce vermelisin?' },
    reflect: 'Adımların sırası değişirse sonuç değişir mi? Taksi örneğinde “20 ekle” ile “15 ile çarp” adımlarının yerini değiştirerek dene.',
    rounds: [
      { prompt: 'Celsius’u Fahrenheit’a çeviren algoritma (F = 9 · C ÷ 5 + 32)', items: ['Başla', 'Celsius değerini (C) gir', 'C’yi 9 ile çarp', 'Sonucu 5’e böl', 'Sonuca 32 ekle', 'Fahrenheit değerini yazdır', 'Bitir'], hints: ['Girdi alınmadan işlem yapılabilir mi?'] },
      { prompt: 'Taksi ücretini hesaplayan algoritma (açılış 20 TL, kilometresi 15 TL)', items: ['Başla', 'Gidilen yolu (x km) gir', 'x’i 15 ile çarp', 'Sonuca açılış ücreti 20 TL’yi ekle', 'Toplam ücreti yazdır', 'Bitir'] },
      { prompt: 'Geri dönüşüm algoritması (toplanan atığın %60’ı geri dönüştürülüyor, hedef 30 kg)', items: ['Başla', 'Toplanan atık miktarını (x kg) gir', 'Geri dönüştürülen miktarı hesapla: y = 0,6 · x', 'Eğer y > 30 ise “Hedefe ulaşıldı” yazdır', 'Bitir'], hints: ['Karşılaştırma yapmadan önce neyi hesaplamış olmalısın?'] },
    ],
  },
  {
    id: 'g8-akis-fonksiyon-eslestir',
    outcomes: ['MAT.8.2.4'],
    type: 'match',
    stage: 'sembol',
    title: 'Adımlardan fonksiyona',
    instructions: 'Her sözde kodu, hesapladığı fonksiyonla eşleştir. İşlem sırasına dikkat!',
    level: 2,
    perRound: 3,
    launch: { text: '“3 ekle, sonra 2 ile çarp” ile “2 ile çarp, sonra 3 ekle” aynı sonucu verir mi? x = 1 için dene.' },
    reflect: 'f(x) = 2x + 3 ile f(x) = 2(x + 3) farkını sözde kodla bir arkadaşına nasıl açıklarsın?',
    pairs: [
      { left: 'x’i oku → 2 ile çarp → 3 ekle → yaz', right: 'f(x) = 2x + 3' },
      { left: 'x’i oku → 3 ekle → 2 ile çarp → yaz', right: 'f(x) = 2(x + 3)' },
      { left: 'x’i oku → 5 ile çarp → yaz', right: 'f(x) = 5x' },
      { left: 'x’i oku → 0,1 ile çarp → sonucu 50’den çıkar → yaz', right: 'f(x) = 50 − 0,1x' },
      { left: 'C’yi oku → 9 ile çarp → 5’e böl → 32 ekle → yaz', right: 'F = 1,8 · C + 32' },
      { left: 'x’i oku → 4 çıkar → 3 ile çarp → yaz', right: 'f(x) = 3(x − 4)' },
    ],
  },
  {
    id: 'g8-sozde-kod',
    outcomes: ['MAT.8.2.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Gerçek yaşamda algoritmalar',
    instructions: 'Gerçek yaşam problemlerini algoritma ve doğrusal fonksiyonlarla ilişkilendir.',
    level: 3,
    launch: { text: 'Bir aracın deposunda 50 L yakıt var ve araç her kilometrede 0,1 L yakıt harcıyor. Kalan yakıtı hesaplayan bir uygulama yazmak istesen, uygulamaya ne girilir, ne çıkar?' },
    reflect: 'Kendi seçtiğin bir gerçek yaşam durumu için (ör. kalori, fatura, karbon salımı) girdi, çıktı ve adımları içeren bir algoritma yaz.',
    questions: [
      { prompt: { text: 'Bu algoritma hangi fonksiyonu hesaplar?', visual: flow(['Başla', 'x’i oku', 'y ← 3 · x', 'y ← y − 2', 'y’yi yaz', 'Bitir']) }, choices: ['f(x) = 3x − 2', 'f(x) = 3(x − 2)', 'f(x) = 3x + 2', 'f(x) = x − 6'], answer: 0, feedback: [null, 'Önce 3 ile çarpılıyor, sonra 2 çıkarılıyor; 3(x − 2) ise önce çıkarmak demek.', 'Son adımda 2 eklenmiyor, çıkarılıyor.', 'x 3 ile çarpılıyor; 6 çıkarılmıyor.'] },
      { prompt: 'f(x) = 4x + 10 fonksiyonunu hesaplayan algoritmanın adımları hangisidir?', choices: ['x’i oku → 4 ile çarp → 10 ekle → yaz', 'x’i oku → 10 ekle → 4 ile çarp → yaz', 'x’i oku → 4 ekle → 10 ile çarp → yaz', '10’u oku → x ile çarp → 4 ekle → yaz'], answer: 0, feedback: [null, 'Bu adımlar 4(x + 10) = 4x + 40 hesaplar.', 'Bu adımlar 10(x + 4) hesaplar.', 'Girdi 10 değil, x olmalı.'] },
      { prompt: 'Deposunda 50 L yakıt olan ve her km’de 0,1 L yakıt harcayan bir aracın kalan yakıtını hesaplayan algoritmada girdi ve çıktı nedir?', choices: ['Girdi: gidilen yol, çıktı: kalan yakıt', 'Girdi: kalan yakıt, çıktı: gidilen yol', 'Girdi: 50 L, çıktı: 0,1 L', 'Girdi ve çıktı aynıdır'], answer: 0, feedback: [null, 'Kalan yakıt, gidilen yola bağlı olarak hesaplanan sonuçtur.', '50 ve 0,1 sabittir; algoritma her seferinde değişen değeri girdi olarak alır.', 'Girdi bağımsız, çıktı bağımlı değişkendir; farklıdırlar.'] },
      { prompt: 'Aynı araç için kalan yakıtı veren fonksiyon hangisidir? (x: gidilen yol, km)', choices: ['f(x) = 50 − 0,1x', 'f(x) = 0,1x − 50', 'f(x) = 50x − 0,1', 'f(x) = 50 + 0,1x'], answer: 0, feedback: [null, 'x = 0 için yakıt −50 L çıkar; anlamsız.', '50 ile x çarpılmaz; her km’de 0,1 L azalır.', 'Yakıt yol arttıkça azalmalı, artmamalı.'] },
      { prompt: 'Bir algoritma: “x km yolu oku. e ← 0,2 · x. Eğer e > 2 ise ‘Toplu taşıma öner’ yaz, değilse ‘Bisiklet de olur’ yaz.” x = 15 için çıktı nedir?', choices: ['Toplu taşıma öner', 'Bisiklet de olur', '3', '15'], answer: 0, feedback: [null, 'e = 0,2 · 15 = 3 ve 3 > 2; koşul sağlanıyor.', '3 ara sonuçtur; algoritma bir mesaj yazdırıyor.', '15 girdidir, çıktı değil.'] },
      { prompt: 'Doğrusal bir fonksiyonu hesaplayan algoritma x = 4 için 11, x = 6 için 15 çıktısını veriyor. x = 10 için çıktı nedir?', choices: ['23', '19', '25', '20'], answer: 0, feedback: [null, '19, x = 8 için çıktıdır; bir adım daha devam et.', 'Hesabını kontrol et: 6’dan 10’a 2 adım var ve her adımda çıktı 4 artıyor.', '2 · 10 = 20: eğimi buldun ama başlangıç değerini (3) eklemeyi unuttun.'], explain: 'x 2 artınca çıktı 4 artıyor; eğim 2. f(x) = 2x + 3 → f(10) = 23.' },
    ],
  },

  // ── Geometrik Nicelikler ───────────────────────────────────────────────

  // MAT.8.4.1
  {
    id: 'g8-acinimlar',
    outcomes: ['MAT.8.4.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Açınımdan cisme',
    instructions: 'Açınımı incele ve zihninde katla: hangi cisim oluşur?',
    level: 1,
    launch: { text: 'Bir kraker kutusunu, bir havlu kâğıt rulosunu ve bir külahı kenarlarından kesip düz bir masaya açsan hangi şekiller ortaya çıkar? Önce tahmin et.' },
    reflect: 'Bir açınıma bakınca hangi cisim olduğuna nasıl karar veriyorsun? İpucu olarak hangi şekillere bakıyorsun?',
    tool: 'nets',
    tasks: [
      { prompt: 'Açınımda 2 üçgen ve 3 dikdörtgen var. Hangi cisim oluşur?', target: { solid: 'triangular-prism' }, hints: ['Tabanlar hangi şekil? Yan yüzler kaç tane?'], explain: 'Üçgen dik prizma: 2 üçgen taban ve 3 dikdörtgen yan yüz.' },
      { prompt: 'Açınımda 1 kare ve 4 eş ikizkenar üçgen var. Hangi cisim oluşur?', target: { solid: 'pyramid' }, hints: ['Üçgenler katlanınca bir noktada buluşur mu?'], explain: 'Kare dik piramit: üçgenler tepe noktasında buluşur.' },
      { prompt: 'Açınımda 2 daire ve 1 dikdörtgen var. Hangi cisim oluşur?', target: { solid: 'cylinder' }, hints: ['Dikdörtgeni rulo yaparsan ne olur?'], explain: 'Silindir: dikdörtgen yanal yüzeyi, daireler tabanları oluşturur.' },
      { prompt: 'Açınımda 1 daire ve 1 daire dilimi var. Hangi cisim oluşur?', target: { solid: 'cone' }, hints: ['Daire dilimini külah gibi kıvırırsan ne olur?'], explain: 'Koni: daire dilimi yanal yüzeyi oluşturur; yay uzunluğu taban çevresine eşittir.' },
    ],
  },
  {
    id: 'g8-acinimdaki-sekiller',
    outcomes: ['MAT.8.4.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Açınımdaki şekiller',
    instructions: 'Her cismi yüzey açınımında bulunan şekillerle eşleştir.',
    level: 2,
    launch: { text: 'Bir ambalaj tasarımcısı karton kesmeden önce açınımı çizer. Hangi cisim için hangi şekilleri kesmesi gerekir?' },
    reflect: 'Dik prizmaların açınımlarında hep dikdörtgenlerin bulunmasının nedeni ne olabilir?',
    pairs: [
      { left: 'Üçgen dik prizma', right: '2 üçgen + 3 dikdörtgen' },
      { left: 'Beşgen dik prizma', right: '2 beşgen + 5 dikdörtgen' },
      { left: 'Dikdörtgen dik piramit', right: '1 dikdörtgen + ikişer ikişer eş 4 ikizkenar üçgen' },
      { left: 'Kare dik piramit', right: '1 kare + 4 eş ikizkenar üçgen' },
      { left: 'Dik dairesel silindir', right: '2 eş daire + 1 dikdörtgen' },
      { left: 'Dik dairesel koni', right: '1 daire + 1 daire dilimi' },
      { left: 'Küp', right: '6 eş kare' },
    ],
  },
  {
    id: 'g8-cisimlerin-elemanlari',
    outcomes: ['MAT.8.4.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Açınımlardaki ilişkiler',
    instructions: 'Cisimlerin elemanlarını ve açınımlarındaki şekiller arasındaki ilişkileri düşün.',
    level: 2,
    launch: { text: 'Kâğıttan bir külah yaparken daire diliminin yayı neden tabandaki çembere tam oturuyor? Açınımdaki şekiller birbirine nasıl “uymak” zorunda?', visual: coneNet() },
    reflect: 'Koni açınımında yay uzunluğunun taban çevresine eşit olması gerektiğini bir arkadaşına kâğıt külah örneğiyle anlat.',
    questions: [
      { prompt: { text: 'Dik dairesel konide tepe noktasını taban çemberi üzerindeki bir noktaya birleştiren doğru parçasına ne denir?', visual: { kind: 'shape', shape: 'cone' } }, choices: ['Ana doğru', 'Yükseklik', 'Yarıçap', 'Taban'], answer: 0, feedback: [null, 'Yükseklik tepe noktasından tabanın merkezine dik inen doğru parçasıdır.', 'Yarıçap tabanın merkezinden çembere uzanır.', 'Taban bir doğru parçası değil, dairesel bir bölgedir.'] },
      { prompt: { text: 'Koni açınımındaki daire diliminin yay uzunluğu neye eşittir?', visual: coneNet() }, choices: ['Taban çemberinin çevresine', 'Ana doğrunun uzunluğuna', 'Koninin yüksekliğine', 'Taban yarıçapına'], answer: 0, feedback: [null, 'Ana doğru, daire diliminin yarıçapıdır.', 'Yükseklik açınımda doğrudan görünmez.', 'Yay katlanınca tabanın çevresine sarılır; yarıçapa değil çevreye eşittir.'] },
      { prompt: { text: 'Taban yarıçapı r, yüksekliği h olan silindirin yanal yüzeyi açıldığında oluşan dikdörtgenin kenarları nedir?', visual: { kind: 'shape', shape: 'cylinder' } }, choices: ['2πr ve h', 'πr ve h', 'r ve h', '2r ve h'], answer: 0, feedback: [null, 'πr çevrenin yalnızca yarısıdır; dikdörtgen tabanın çevresinin tamamına sarılır.', 'Dikdörtgenin bir kenarı yarıçap değil, taban çevresidir.', '2r çaptır; dikdörtgen çapa değil çevreye sarılır.'] },
      { prompt: 'Dikdörtgen dik piramidin yüzey açınımındaki üçgenler için hangisi doğrudur?', choices: ['4 üçgen vardır; bunlar ikişer ikişer eş ikizkenar üçgenlerdir.', '3 eş üçgen vardır.', '4 eşkenar üçgen vardır.', '2 üçgen ve 3 dikdörtgen vardır.'], answer: 0, feedback: [null, 'Tabanın 4 kenarı olduğu için 4 yan yüz vardır.', 'Tabanın kenarları farklı uzunlukta olduğundan üçgenler eşkenar olamaz.', 'Bu, üçgen dik prizmanın açınımıdır.'] },
      { prompt: 'Beşgen dik prizmanın yüzey açınımında toplam kaç yüz bulunur?', choices: ['7', '5', '6', '10'], answer: 0, feedback: [null, 'Yan yüzleri saydın; 2 tabanı da ekle.', '5 yan yüz + 2 taban = 7.', '10, beşgenlerin köşe sayılarının toplamıdır.'], explain: '2 beşgen taban + 5 dikdörtgen yan yüz = 7' },
      { prompt: 'Hangi cismin yüzey açınımında daire BULUNMAZ?', choices: ['Kare dik piramit', 'Silindir', 'Koni', 'Hepsinde bulunur'], answer: 0, feedback: [null, 'Silindirin iki dairesel tabanı vardır.', 'Koninin dairesel bir tabanı vardır.', 'Kare dik piramidin tabanı karedir, yan yüzleri üçgendir.'] },
      { prompt: 'Bir silindirin yanal yüzeyi eğik bir çizgi boyunca kesilip açılırsa ne olur?', choices: ['Paralelkenar oluşur; alanı yine taban çevresi · yükseklik kadardır.', 'Açınım oluşmaz.', 'Daire oluşur.', 'Paralelkenar oluşur ve alanı dikdörtgeninkinden büyüktür.'], answer: 0, feedback: [null, 'Yanal yüzey farklı biçimlerde açılabilir; kesim çizgisi değişince şekil değişir.', 'Yanal yüzeyde düz bir kenar olmadığı için daire oluşmaz.', 'Aynı yüzey açıldığı için alan değişmez; yalnızca biçim değişir.'] },
    ],
  },
  {
    id: 'g8-cisim-hangisi-farkli',
    outcomes: ['MAT.8.4.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 1,
    launch: { text: 'Masada bir zar, bir piramit biçimli çikolata kutusu, bir konserve kutusu ve bir çadır biçimli kutu var. Her biri başka bir açıdan “farklı” olabilir mi?' },
    reflect: 'Seçtiğin cisim için açınımına bakarak bir gerekçe daha bulabilir misin?',
    questions: [
      {
        prompt: 'Hangi cisim farklı? Gerekçeni düşün.',
        choices: ['Küp', 'Kare dik piramit', 'Dik dairesel silindir', 'Üçgen dik prizma'],
        answer: 0,
        reasons: ['Bütün yüzleri eş kare olan tek cisim.', 'Tepe noktası olan tek cisim.', 'Eğri yüzeyi olan, açınımında daire bulunan tek cisim.', 'Tabanları üçgen olan tek cisim.'],
      },
    ],
  },

  // MAT.8.4.2
  {
    id: 'g8-silindir-yuzey-problemleri',
    outcomes: ['MAT.8.4.2'],
    type: 'fill',
    stage: 'model',
    title: 'Açınımdan yüzey alanına',
    instructions: 'Silindirin açınımını kullanarak hesapla (π = 3).',
    level: 2,
    launch: { text: 'Bir konserve kutusunun etiketini dikkatlice kesip açtığında hangi şekil çıkar? Kapağı ve tabanı da eklersen kutunun tüm yüzeyi kaç parçadan oluşur?', visual: SILINDIR_ACINIM },
    reflect: 'Dikdörtgenin bir kenarının neden taban çevresine eşit olduğunu bir kâğıt ruloyla nasıl gösterirsin?',
    items: [
      { text: 'Dikdörtgenin uzun kenarı (taban çevresi) 2 · 3 · 3 = __ cm', answers: ['18'], visual: SILINDIR_ACINIM, hints: ['Dikdörtgen katlanınca hangi çembere sarılıyor?'] },
      { text: 'Yanal alan = 18 · 10 = __ cm²', answers: ['180'], visual: SILINDIR_ACINIM },
      { text: 'İki tabanın alanları toplamı 2 · 3 · 3^{2} = __ cm²', answers: ['54'], visual: SILINDIR_ACINIM, hints: ['Bir dairenin alanı πr²; kaç taban var?'] },
      { text: 'Silindirin yüzey alanı __ cm²', answers: ['234'], visual: SILINDIR_ACINIM, hints: ['Açınımdaki üç parçanın alanlarını topla.'] },
      { text: 'Bu açınımda dikdörtgenin taban çevresine eşit olan kenarı __ cm', answers: ['12'], visual: SILINDIR_ACINIM_2 },
      { text: 'Bu silindirin yüzey alanı __ cm²', answers: ['84'], visual: SILINDIR_ACINIM_2, hints: ['Yanal alan: 12 · 5. Tabanlar: 2 · 3 · 2^{2}.'] },
    ],
  },
  {
    id: 'g8-silindir-yuzey-alani',
    outcomes: ['MAT.8.4.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Silindirin yüzey alanı',
    instructions: 'Yüzey alanı = 2 · taban alanı + yanal alan = 2πr² + 2πrh (π = 3)',
    level: 2,
    launch: { text: 'Açınımı çizmeden de yüzey alanını hesaplayabilir miyiz? Açınımdaki her parça formülde nereye karşılık geliyor?' },
    reflect: '2πr² + 2πrh ifadesindeki her terim açınımın hangi parçasını anlatıyor?',
    generator: { id: 'cylinder', params: { ask: 'surface' }, count: 6 },
  },
  {
    id: 'g8-silindir-yuzey-kavram',
    outcomes: ['MAT.8.4.2'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Yüzey alanı üzerine düşün',
    instructions: 'Silindirin açınımından yüzey alanına dair çıkarım yap.',
    level: 2,
    launch: { text: 'İki arkadaş bir silindirin yüzey alanını bulmak için farklı formüller yazmış: biri πr²h, diğeri 2πr² + 2πrh. Hangisi yüzeyi, hangisi içini ölçüyor?' },
    reflect: 'Yüzey alanı ile hacmi karıştırmamak için kendine hangi soruyu sorarsın?',
    questions: [
      { prompt: 'Taban yarıçapı r, yüksekliği h olan dik dairesel silindirin yüzey alanı bağıntısı hangisidir?', choices: ['2πr² + 2πrh', 'πr²h', '2πr + h', 'πr² + πrh'], answer: 0, feedback: [null, 'πr²h hacimdir; yüzey alanı açınımdaki şekillerin alanları toplamıdır.', 'Bunlar uzunluk; alan için uzunluklar çarpılmalı.', 'İki taban vardır ve yanal yüzeyin bir kenarı πr değil 2πr’dir.'] },
      { prompt: 'Bir silindirin yüksekliği değişmeden yarıçapı 2 katına çıkarılırsa yanal alanı nasıl değişir?', choices: ['2 katına çıkar.', '4 katına çıkar.', 'Değişmez.', 'Yarıya iner.'], answer: 0, feedback: [null, 'Yanal alan 2πrh’de r bir kez geçiyor; 4 kat, r² olsaydı geçerli olurdu.', 'Taban çevresi değiştiği için dikdörtgenin bir kenarı değişir.', 'Yarıçap büyüyünce yanal yüzey de büyür.'] },
      { prompt: 'Bir silindirin yanal alanı 120 cm², yüksekliği 10 cm ise taban çevresi kaç cm’dir?', choices: ['12', '1200', '110', '24'], answer: 0, feedback: [null, 'Yanal alan = çevre · yükseklik; 120’yi 10 ile çarpmak değil bölmek gerekir.', '120 − 10: çıkarma değil bölme gerekir.', 'Çevre = 120 ÷ 10; ayrıca 2 ile çarpmaya gerek yok.'] },
      { prompt: 'Erzurum’daki Çifte Minareli Medrese’nin minareleri silindire benzer. Bir minarenin dış yan yüzeyini kaplamak için hangisi hesaplanmalıdır?', choices: ['Yanal alan', 'Hacim', 'Taban alanı', 'Taban çevresi'], answer: 0, feedback: [null, 'Hacim içini doldurmak için gerekir, kaplamak için değil.', 'Taban yan yüzeyde değildir.', 'Çevre bir uzunluktur; kaplamak için alan gerekir.'] },
      { prompt: 'Üstü açık, silindir biçimli bir bardak yapmak için gereken karton miktarını hangi ifade verir?', choices: ['πr² + 2πrh', '2πr² + 2πrh', 'πr²h', '2πrh'], answer: 0, feedback: [null, 'Bardağın üstü açık; yalnızca bir taban vardır.', 'πr²h bardağın alacağı su miktarıdır, karton değil.', 'Bardağın bir tabanı olmalı; aksi hâlde su akar.'] },
      { prompt: 'Bir silindir, tabanlarının merkezlerinden geçecek biçimde dikey olarak ikiye kesiliyor. Parçalardan birinin yüzeyinde hangi şekiller vardır?', choices: ['2 yarım daire, yanal yüzeyin yarısı ve 1 dikdörtgen', '2 daire ve 1 dikdörtgen', 'Yalnızca 2 yarım daire', '1 daire ve 1 dikdörtgen'], answer: 0, feedback: [null, 'Kesilince tabanlar yarım daireye dönüşür ve yeni bir kesit yüzü oluşur.', 'Eğri yüzeyin yarısı ve kesit yüzü de parçanın yüzeyindedir.', 'Tabanlar da ikiye bölünür; tam daire kalmaz.'] },
    ],
  },
  {
    id: 'g8-silindir-kaplama',
    outcomes: ['MAT.8.4.2'],
    type: 'fill',
    stage: 'problem',
    title: 'Sütunlar, kutular, depolar',
    instructions: 'Hangi yüzeylerin kaplanacağına karar ver, sonra hesapla (π = 3).',
    level: 3,
    launch: { text: 'Bir müzedeki silindir biçimli sütunlar taşla kaplanacak. Sütunların üst ve alt yüzeyleri de kaplanmalı mı? Ne kadar taş gerektiğini nasıl tahmin edersin?' },
    reflect: 'Bu problemlerin hangisinde yüzey alanının tamamını, hangisinde bir kısmını kullandın? Neye bakarak karar verdin?',
    items: [
      { text: 'Yarıçapı 0,5 m, yüksekliği 4 m olan silindir biçimli bir sütunun yalnızca yan yüzü taşla kaplanacak. __ m² taş gerekir.', answers: ['12'], hints: ['Sütunun alt ve üst yüzü kaplanacak mı?'] },
      { text: 'Çapı 8 cm, yüksekliği 12 cm olan bir konserve kutusunun etiketi yan yüzün tamamını kaplıyor. Etiketin alanı __ cm²', answers: ['288'], hints: ['Çap verildi; yarıçap kaç?'] },
      { text: 'Üstü açık, taban yarıçapı 5 cm, yüksekliği 6 cm olan silindir biçimli kalemlik için __ cm² karton gerekir.', answers: ['255'], hints: ['Kalemliğin kaç tabanı var?'] },
      { text: 'Gövdesi taban çapı 4 m, yüksekliği 20 m olan silindire benzeyen bir minarenin dış yan yüzeyi yaklaşık __ m²’dir.', answers: ['240'] },
      { text: 'Taban yarıçapı 1 m, yüksekliği 2 m olan kapalı silindir biçimli bir su deposunun tüm dış yüzeyi boyanacak. Boyanacak yüzey __ m²’dir.', answers: ['18'], hints: ['Kapalı depo: iki taban ve yanal yüzey.'] },
    ],
  },

  // MAT.8.4.3
  {
    id: 'g8-silindir-hacim-analoji',
    outcomes: ['MAT.8.4.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Daireden silindire',
    instructions: 'Dairenin alan bağıntısının nasıl oluştuğunu hatırla ve aynı düşünceyi silindirin hacmine uyarla.',
    level: 3,
    launch: { text: 'Daireyi ince dilimlere ayırıp dilimleri ters düz dizince bir dikdörtgene benzediğini hatırlıyor musun? Aynı şeyi bir silindir biçimli peynirle yapsak ne olur?', visual: rearrange(false) },
    reflect: 'Daire alanı ile silindir hacmi arasındaki benzerliği bir arkadaşına kendi cümlelerinle açıkla.',
    questions: [
      { prompt: { text: 'Bir daire çok sayıda eş dilime ayrılıp dilimler ters düz dizildiğinde yaklaşık hangi şekil oluşur?', visual: rearrange(false) }, choices: ['Kenarları πr ve r olan bir dikdörtgen', 'Kare', 'Üçgen', 'Çember'], answer: 0, feedback: [null, 'Kenarlar eşit değildir: biri yarım çevre (πr), diğeri yarıçap (r).', 'Dilimler ters düz dizilince kenarları paralel bir şekle yaklaşır.', 'Çember bir sınır çizgisidir; dilimler bir bölge oluşturur.'] },
      { prompt: 'Bu dikdörtgenin alanı, yani dairenin alanı hangisidir?', choices: ['πr · r = πr²', '2πr · r', 'πr + r', '2πr²'], answer: 0, feedback: [null, 'Uzun kenar çevrenin tamamı değil, yarısıdır (πr).', 'Alan için kenarlar toplanmaz, çarpılır.', 'Çevrenin tamamını değil yarısını kullan: πr · r.'] },
      { prompt: { text: 'Bir silindir çok sayıda eş dilime ayrılıp dilimler ters düz birleştirildiğinde hangi cisme yaklaşır?', visual: rearrange(true) }, choices: ['Dikdörtgenler prizması', 'Koni', 'Küre', 'Piramit'], answer: 0, feedback: [null, 'Dilimler sivri bir tepe oluşturmaz.', 'Dilimler düz yüzeyli bir kutuya yaklaşır.', 'Tepe noktası oluşmaz; alt ve üst yüzler paraleldir.'] },
      { prompt: 'Oluşan dikdörtgenler prizmasının ayrıtları silindirin hangi elemanlarına eşittir?', choices: ['h, r ve πr', 'h, 2r ve 2πr', 'r, r ve h', 'πr², h ve r'], answer: 0, feedback: [null, 'Taban kenarları dairedeki gibi yarıçap (r) ve yarım çevredir (πr).', 'Prizmanın tabanı, daireden oluşan dikdörtgenin aynısıdır: r ve πr.', 'πr² bir uzunluk değil, alandır.'] },
      { prompt: 'Buna göre silindirin hacmi nedir?', choices: ['πr²h (taban alanı · yükseklik)', '2πrh', 'πr²', '2πr² + 2πrh'], answer: 0, feedback: [null, '2πrh yanal alandır, hacim değil.', 'πr² yalnızca taban alanıdır; yükseklikle çarpılmalı.', 'Bu yüzey alanıdır; hacim yüzeyi değil içini ölçer.'] },
    ],
  },
  {
    id: 'g8-ust-uste-daireler',
    outcomes: ['MAT.8.4.3'],
    type: 'fill',
    stage: 'model',
    title: 'Üst üste daireler',
    instructions: 'Silindiri üst üste dizilmiş ince dairesel katlar gibi düşün (π = 3).',
    level: 2,
    launch: { text: 'Madenî paraları üst üste dizince bir silindir oluşur. Kulenin hacmi ile tek bir paranın hacmi arasında nasıl bir ilişki var?', visual: coinStack(8) },
    reflect: 'Silindiri üst üste dizilmiş ince dairelerden oluşuyormuş gibi düşünmek, hacim bağıntısını neden açıklar?',
    items: [
      { text: 'Taban alanı 5 cm², kalınlığı 0,2 cm olan bir madenî paranın hacmi __ cm³', answers: ['1'], visual: coinStack(1), hints: ['Çok ince bir prizma gibi: taban alanı · kalınlık.'] },
      { text: 'Bu paralardan 10 tanesi üst üste konuyor: kule __ cm yüksekliğinde ve hacmi __ cm³', answers: ['2', '10'], visual: coinStack(10), hints: ['10 paranın kalınlıkları toplamı kaç cm?'] },
      { text: 'Taban yarıçapı 2 cm olan bir silindirin taban alanı (π = 3) __ cm²', answers: ['12'], hints: ['πr² = 3 · 2 · 2'] },
      { text: 'Bu silindirin 1 cm kalınlığındaki her katının hacmi __ cm³', answers: ['12'] },
      { text: 'Silindirin yüksekliği 5 cm ise üst üste 5 kat vardır: hacim __ cm³', answers: ['60'], hints: ['Kaç kat var, her katın hacmi ne?'] },
      { text: 'Taban alanı 50 cm², yüksekliği 8 cm olan bir silindirin hacmi __ cm³', answers: ['400'] },
    ],
  },
  {
    id: 'g8-silindir-hacmi',
    outcomes: ['MAT.8.4.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Silindirin hacmi',
    instructions: 'Hacim = taban alanı · yükseklik = πr²h (π = 3)',
    level: 2,
    launch: { text: 'Taban alanını bul, kat sayısıyla (yükseklikle) çarp: bu fikri bir formüle dönüştürdük. Şimdi hızlı ve doğru hesaplama zamanı.' },
    reflect: 'Hacim hesabında en sık yaptığın hata ne? (r yerine çapı kullanmak, r’nin karesini almayı unutmak…) Kendine bir hatırlatma yaz.',
    generator: { id: 'cylinder', params: { ask: 'volume' }, count: 6 },
  },
  {
    id: 'g8-silindir-hacim-problemleri',
    outcomes: ['MAT.8.4.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hacimle karar ver',
    instructions: 'Önce tahmin et, sonra hesapla (π = 3).',
    level: 3,
    launch: { text: 'Aynı A4 kâğıdından iki silindir yapabilirsin: kısa kenarı ya da uzun kenarı yükseklik yaparak. Hangisine daha çok mısır sığar? Önce tahmin et!' },
    reflect: 'Yarıçapı 2 katına çıkarmak ile yüksekliği 2 katına çıkarmak hacmi neden farklı etkiliyor?',
    questions: [
      { prompt: 'Yüksekliği aynı kalan bir silindirin yarıçapı 2 katına çıkarılırsa hacmi kaç katına çıkar?', choices: ['4', '2', '8', 'Değişmez'], answer: 0, feedback: [null, 'Yarıçap hacimde iki kez çarpan olarak yer alır (r · r): 2 · 2 = 4.', 'Yükseklik değişmediği için yalnızca r² etkiler; 2^{3} değil 2^{2}.', 'r değişince taban alanı değişir.'], explain: 'Hacim r² ile orantılıdır: 2² = 4.' },
      { prompt: 'Yarıçapı aynı kalan bir silindirin yüksekliği 2 katına çıkarılırsa hacmi kaç katına çıkar?', choices: ['2', '4', '8', 'Değişmez'], answer: 0, feedback: [null, 'Yükseklik formülde bir kez geçer; kat sayısı 2 katına çıkar.', 'Yükseklik formülde yalnızca bir kez çarpan olarak geçer.', 'Kat sayısı artınca hacim de artar.'] },
      { prompt: 'A4 kâğıdı (21 cm × 29,7 cm) iki şekilde rulo yapılıyor. Hangisinin hacmi daha büyüktür?', choices: ['Kısa kenarın yükseklik olduğu (alçak ve geniş) silindir', 'Uzun kenarın yükseklik olduğu (uzun ve dar) silindir', 'İkisi eşittir', 'Kâğıt aynı olduğu için karşılaştırılamaz'], answer: 0, feedback: [null, 'Uzun silindirin yarıçapı küçük; yarıçap hacmi kare olarak etkiler.', 'Yanal alanları eşit ama hacimleri farklı; yarıçapın etkisi daha büyük.', 'Yarıçap ve yükseklik bilindiği için hacimler karşılaştırılabilir.'] },
      { prompt: 'Taban yarıçapı 10 cm, yüksekliği 20 cm olan silindir biçimli bir sürahi kaç litre su alır? (1 L = 1000 cm³)', choices: ['6', '60', '0,6', '600'], answer: 0, feedback: [null, '6000 cm³’ü litreye çevirirken 100’e değil 1000’e böl.', '6000 cm³ = 6 L; 10 000’e bölme.', '6000’i 10’a bölmek yeterli değil; 1000’e böl.'], explain: '3 · 10² · 20 = 6000 cm³ = 6 L' },
      { prompt: 'Taban yarıçapı 3 cm, yüksekliği 10 cm olan bir bardak kaç cm³ su alır?', choices: ['270', '90', '180', '30'], answer: 0, feedback: [null, '3 · 3 · 10 = 90: π’yi (3) unuttun.', '2 · 3 · 3 · 10 = 180 yanal alandır, hacim değil.', '3 · 10 = 30: taban alanını hesaplamadın.'] },
      { prompt: 'Taban alanı 2 m², yüksekliği 3 m olan silindir biçimli bir su deposu kaç litre su alır? (1 m³ = 1000 L)', choices: ['6000', '6', '600', '60 000'], answer: 0, feedback: [null, '6 m³ bulup litreye çevirmeyi unuttun.', '1 m³ = 1000 L; 100 değil.', '1 m³ = 1000 L; 10 000 değil.'] },
    ],
  },

  // ── İstatistiksel Araştırma Süreci ─────────────────────────────────────

  // MAT.8.6.1
  {
    id: 'g8-sutun-grafigi-olustur',
    outcomes: ['MAT.8.6.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sütun grafiği oluştur',
    instructions: 'Tablodaki veriye göre sütunların yüksekliğini ayarla.',
    level: 1,
    launch: { text: 'Okul yönetimi hangi seçmeli derse daha çok sınıf açacağına karar verecek. Tablo mu, grafik mi kararı daha kolay gösterir?' },
    reflect: 'Grafiği oluşturduktan sonra hangi sonuca hemen ulaştın? Bu sonucu tabloda görmek daha mı zordu?',
    tool: 'bargraph',
    tasks: [
      { prompt: '8-A sınıfının seçmeli ders tercihleri: Robotik 9, Satranç 5, Drama 7, Spor 11. Sütun grafiğini oluştur.', target: { data: [{ label: 'Robotik', value: 9 }, { label: 'Satranç', value: 5 }, { label: 'Drama', value: 7 }, { label: 'Spor', value: 11 }] } },
      { prompt: 'Okul kütüphanesinden bir haftada ödünç alınan kitaplar: Pzt 6, Salı 4, Çrş 8, Prş 3, Cuma 10. Sütun grafiğini oluştur.', target: { data: [{ label: 'Pzt', value: 6 }, { label: 'Salı', value: 4 }, { label: 'Çrş', value: 8 }, { label: 'Prş', value: 3 }, { label: 'Cuma', value: 10 }] } },
    ],
  },
  {
    id: 'g8-ortalama-mutlak-sapma',
    outcomes: ['MAT.8.6.1'],
    type: 'fill',
    stage: 'model',
    title: 'Merkez ve yayılım',
    instructions: 'Nokta grafiklerine bak: verinin merkezi nerede, veriler ne kadar yayılmış? Ortalama mutlak sapma, verilerin ortalamaya uzaklıklarının ortalamasıdır.',
    level: 3,
    launch: { text: 'İki sınıfın matematik ortalaması aynı çıktı. Bu, iki sınıfın puanlarının birbirine benzediği anlamına gelir mi?', visual: dotPlot([{ label: 'A sınıfı', values: [5, 5, 6, 6, 6, 7, 7] }, { label: 'B sınıfı', values: [2, 3, 4, 6, 8, 9, 10] }], 0, 10) },
    reflect: 'Ortalaması aynı iki veri grubunu birbirinden ayırmak için hangi ölçüye bakarsın? Neden?',
    items: [
      { text: '2, 4, 6, 8 verisinin aritmetik ortalaması __', answers: ['5'], visual: dotPlot([{ values: [2, 4, 6, 8] }], 0, 10) },
      { text: 'Verilerin 5’e uzaklıkları 3, 1, 1, 3. Ortalama mutlak sapma __', answers: ['2'], visual: dotPlot([{ values: [2, 4, 6, 8] }], 0, 10), hints: ['Uzaklıkların ortalamasını al: toplam kaç, kaç veri var?'] },
      { text: '4, 6, 8, 10, 12 verisinin ortalaması 8. Ortalama mutlak sapma __', answers: ['2,4'], visual: dotPlot([{ values: [4, 6, 8, 10, 12] }], 2, 14), hints: ['Uzaklıklar: 4, 2, 0, 2, 4. Toplamı kaç?'] },
      { text: 'İki sınıfın ortalaması da 6. Verileri daha çok yayılmış olan __.', answers: ['B sınıfı'], visual: dotPlot([{ label: 'A sınıfı', values: [5, 5, 6, 6, 6, 7, 7] }, { label: 'B sınıfı', values: [2, 3, 4, 6, 8, 9, 10] }], 0, 10), choices: ['A sınıfı', 'B sınıfı'], hints: ['Noktalar hangi grafikte ortalamadan daha uzağa dağılmış?'] },
      { text: '5 öğrencinin okuduğu kitap sayıları. Aritmetik ortalama __, ortanca __', answers: ['6', '2'], visual: dotPlot([{ values: [1, 2, 2, 3, 22] }], 0, 24, 2), hints: ['Toplam 30 kitap, 5 öğrenci.', 'Sıraladığında ortadaki değer hangisi?'] },
      { text: 'Bu veride öğrencilerin çoğunu daha iyi temsil eden ölçü __.', answers: ['ortanca'], visual: dotPlot([{ values: [1, 2, 2, 3, 22] }], 0, 24, 2), choices: ['aritmetik ortalama', 'ortanca'], explain: '22 aykırı bir değer; ortalamayı 6’ya çekiyor ama öğrencilerin çoğu 1–3 kitap okumuş.' },
      { text: 'Elif’in haftalık okuma süreleri (dk): 30, 45, 30, 60, 35. Açıklık __', answers: ['30'], hints: ['En büyük değerden en küçüğü çıkar.'] },
    ],
  },
  {
    id: 'g8-veri-turleri',
    outcomes: ['MAT.8.6.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Kategorik mi, nicel mi?',
    instructions: 'Sayılarak elde edilen nicel veri kesikli, ölçülerek elde edilen nicel veri süreklidir. Grupla.',
    level: 1,
    launch: { text: 'Sınıfta bir anket yapacaksın. “En sevdiğin spor?” ile “Boyun kaç cm?” sorularının cevapları aynı tür veri mi?' },
    reflect: 'Veri türü, hangi grafiği ve hangi özet ölçüsünü seçeceğini nasıl etkiler? Bir örnek ver.',
    categories: [
      { id: 'kategorik', label: 'Kategorik', color: '#ec4899' },
      { id: 'kesikli', label: 'Nicel (kesikli)' },
      { id: 'surekli', label: 'Nicel (sürekli)', color: '#22c55e' },
    ],
    items: [
      { content: 'En sevilen spor dalı', category: 'kategorik', explain: 'Cevaplar sayı değil, kategoridir.' },
      { content: 'Göz rengi', category: 'kategorik', explain: 'Renkler kategoridir; ortalaması alınamaz.' },
      { content: 'Okula ulaşım aracının türü', category: 'kategorik', explain: 'Otobüs, yürüyerek, bisiklet… kategorilerdir.' },
      { content: 'Kan grubu', category: 'kategorik', explain: 'A, B, AB, 0 kategorilerdir.' },
      { content: 'Kardeş sayısı', category: 'kesikli', explain: 'Sayılarak elde edilir; 2,5 kardeş olmaz.' },
      { content: 'Bir günde okunan sayfa sayısı', category: 'kesikli', explain: 'Sayılarak elde edilir.' },
      { content: 'Bir ailedeki araba sayısı', category: 'kesikli', explain: 'Sayılarak elde edilir.' },
      { content: 'Öğrencilerin boy uzunlukları', category: 'surekli', explain: 'Ölçülerek elde edilir; 152,7 cm gibi ara değerler alabilir.' },
      { content: 'Okula varış süresi', category: 'surekli', explain: 'Süre ölçülür ve ara değerler alabilir.' },
      { content: 'Günlük hava sıcaklığı', category: 'surekli', explain: 'Ölçülerek elde edilir: 18,4 °C gibi.' },
    ],
  },
  {
    id: 'g8-arastirma-sureci',
    outcomes: ['MAT.8.6.1'],
    type: 'sort',
    stage: 'sembol',
    title: 'İstatistiksel araştırma süreci',
    instructions: 'Araştırma sürecinin adımlarını ve kavramları doğru sıraya koy.',
    level: 2,
    launch: { text: '“Okulumuzdaki öğrenciler günde kaç saat ekran başında?” sorusunu merak ettin. Cevaba ulaşmak için hangi adımları, hangi sırayla atmalısın?' },
    reflect: 'Sonuçlar araştırma sorusuna yeterince cevap vermezse sürecin hangi adımına geri dönersin? Neden?',
    rounds: [
      { prompt: 'İstatistiksel araştırmanın adımlarını sırala.', items: ['Araştırma sorusunu oluştur', 'Evreni ve örneklemi belirle', 'Veri toplama planı yap (anket hazırla)', 'Veriyi topla', 'Veriyi görselleştir ve özetle', 'Sonuçları yorumla ve karar ver'], hints: ['Neyi merak ettiğini bilmeden veri toplayabilir misin?'] },
      { prompt: 'Grupları kapsamı en dar olandan en geniş olana sırala.', items: ['Bir sınıftaki öğrenciler', 'Bir okuldaki öğrenciler', 'Bir ilçedeki öğrenciler', 'Bir ildeki öğrenciler', 'Türkiye’deki öğrenciler'], ends: ['En dar', 'En geniş'] },
    ],
  },
  {
    id: 'g8-grafik-ve-ozet-secimi',
    outcomes: ['MAT.8.6.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Doğru aracı seç',
    instructions: 'Araştırma sorusuna ve veri türüne uygun görselleştirme ve özetleme araçlarını seç.',
    level: 2,
    launch: { text: 'Bir şehrin bir yıllık sıcaklık değişimini göstermek için sütun, çizgi ya da nokta grafiğinden hangisini seçerdin? Seçimin neye bağlı?', visual: lineChart(['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'], [-2, 0, 5, 11, 16, 20, 24, 24, 19, 12, 5, 0], -5, 25, 5, 'Aylık ortalama sıcaklık (°C)') },
    reflect: 'Bir grafik türünü seçerken kendine hangi soruları soruyorsun? Bir “seçim rehberi” yaz.',
    questions: [
      { prompt: 'Bir şehrin bir yıl boyunca aylık ortalama sıcaklığındaki değişimi göstermek için en uygun grafik hangisidir?', choices: ['Çizgi grafiği', 'Daire grafiği', 'Resim grafiği', 'Çetele tablosu'], answer: 0, feedback: [null, 'Daire grafiği bütünün parçalarını gösterir; zamana bağlı değişimi değil.', 'Resim grafiği negatif sıcaklıkları göstermekte zorlanır.', 'Çetele tablosu sayım içindir; değişimi göstermez.'] },
      { prompt: 'Sınıftaki 25 öğrencinin kardeş sayılarının dağılımını göstermek için hangisi uygundur?', choices: ['Nokta grafiği', 'Çizgi grafiği', 'Hiçbir grafik kullanılamaz.', 'Yalnızca ortalamayı yazmak yeterlidir.'], answer: 0, feedback: [null, 'Çizgi grafiği zamana bağlı değişimi gösterir; burada zaman yok.', 'Nicel kesikli veri nokta grafiğiyle iyi gösterilir.', 'Tek bir sayı verinin nasıl dağıldığını göstermez.'] },
      { prompt: '“İlimizdeki ortaokul öğrencileri günde kaç saat telefon kullanıyor?” araştırması için hangi örneklem daha uygundur?', choices: ['İldeki farklı okullardan ve sınıf düzeylerinden rastgele seçilen öğrenciler', 'Yalnızca kendi sınıfımdaki öğrenciler', 'Yalnızca okulumuzdaki 8. sınıflar', 'Yalnızca arkadaş grubum'], answer: 0, feedback: [null, 'Bir sınıf tüm ili temsil etmez.', 'Tek okul ve tek sınıf düzeyi tüm ortaokulları temsil etmez.', 'Arkadaş grubun benzer alışkanlıklara sahip olabilir; yanlı olur.'] },
      { prompt: 'Hangisi istatistiksel bir araştırma sorusudur?', choices: ['Sınıfımızdaki öğrencilerin okula geliş süreleri nasıl dağılmaktadır?', 'Okulumuzun adı nedir?', 'Benim boyum kaç cm?', 'Bugün günlerden ne?'], answer: 0, feedback: [null, 'Tek bir cevabı var; veri toplamak gerekmez.', 'Tek bir ölçümle cevaplanır; değişkenlik yok.', 'Tek bir cevabı var.'] },
      { prompt: 'Bir veri grubunda çok uç bir değer (aykırı değer) varsa hangi merkezî eğilim ölçüsü veriyi daha iyi temsil eder?', choices: ['Ortanca', 'Aritmetik ortalama', 'Açıklık', 'Hiçbiri'], answer: 0, feedback: [null, 'Aritmetik ortalama aykırı değerden çok etkilenir.', 'Açıklık bir yayılım ölçüsüdür, merkezî eğilim ölçüsü değil.', 'Ortanca aykırı değerden az etkilenir.'] },
      { prompt: '“En sevilen meyve” verisi için hangi özetleme aracı kullanılabilir?', choices: ['Tepe değer', 'Aritmetik ortalama', 'Ortanca', 'Açıklık'], answer: 0, feedback: [null, 'Meyvelerin ortalaması alınamaz.', 'Kategoriler sıralanamaz; ortanca bulunamaz.', 'Kategorik veride açıklık hesaplanamaz.'], explain: 'Kategorik veride en çok tekrar eden kategori (tepe değer) bulunur.' },
      { prompt: 'İki sınıfın matematik puan ortalamaları eşittir. A sınıfında açıklık 20, B sınıfında 60’tır. Hangisi doğrudur?', choices: ['A sınıfının puanları birbirine daha yakındır, daha az yayılmıştır.', 'B sınıfı daha başarılıdır.', 'A sınıfı daha başarılıdır.', 'İki sınıfın puanları aynıdır.'], answer: 0, feedback: [null, 'Ortalamalar eşit; başarı farkı söylenemez.', 'Ortalamalar eşit; açıklık başarıyı değil yayılımı gösterir.', 'Ortalama aynı olsa da puanlar farklı dağılabilir.'] },
    ],
  },

  // MAT.8.6.2
  {
    id: 'g8-yaniltici-grafik',
    outcomes: ['MAT.8.6.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Grafik dedektifi',
    instructions: 'Grafiklere eleştirel gözle bak: eksen nereden başlıyor, hangi veri gösterilmiş, yorum veriyle uyumlu mu?',
    level: 3,
    launch: { text: 'Bir reklamda iki markanın satış grafiği var; birinin sütunu diğerinin üç katı uzun. Ama gerçek sayılar da öyle mi?', visual: barChart([{ label: 'A', value: 102 }, { label: 'B', value: 106 }], 100, 107, 1, 'Satış (bin adet)') },
    reflect: 'Bir grafiğin yanıltıcı olup olmadığını anlamak için kontrol ettiğin üç şeyi yaz.',
    questions: [
      { prompt: { text: 'Bir haber sitesi bu grafikle “B markasının satışı A’nın 3 katı!” diyor. Bu yorum için hangisi doğrudur?', visual: barChart([{ label: 'A', value: 102 }, { label: 'B', value: 106 }], 100, 107, 1, 'Satış (bin adet)') }, choices: ['Yanlıştır; dikey eksen 100’den başladığı için fark abartılmıştır.', 'Doğrudur; B’nin sütunu 3 kat uzundur.', 'Doğrudur; B daha çok satılmıştır.', 'Grafikten hiçbir şey söylenemez.'], answer: 0, feedback: [null, 'Sütun uzunlukları eksen 0’dan başlamadığı için yanıltıcı; gerçek değerler 102 bin ve 106 bin.', 'B daha çok satılmış ama 3 katı değil; yalnızca yaklaşık %4 fazla.', 'Eksendeki sayılar okunarak gerçek değerler bulunabilir.'] },
      { prompt: { text: 'Bir şirket bu grafikle “Üye sayımız patladı!” diyor. Hangisi en doğru yorumdur?', visual: lineChart(['Ocak', 'Şubat', 'Mart', 'Nisan'], [50, 51, 52, 53], 49, 54, 1, 'Üye sayısı (bin)') }, choices: ['Dikey eksen 49’dan başlıyor; 4 ayda yalnızca yaklaşık %6 artış var.', 'Grafik çok hızlı bir artış gösteriyor; yorum doğru.', 'Üye sayısı azalmış.', 'Grafikte veri yok.'], answer: 0, feedback: [null, 'Çizgi dik görünüyor çünkü eksen 49’dan başlıyor; 50 binden 53 bine çıkmak küçük bir artış.', 'Grafik yükseliyor; azalma yok.', 'Dört ayın verisi grafikte açıkça görülüyor.'] },
      { prompt: { text: 'Ayşe: “Kantinde en çok satış perşembe günü yapılmıştır.” Bu yorum için hangisi doğrudur?', visual: { kind: 'bars', title: 'Kantin satışları', data: [{ label: 'Pzt', value: 40 }, { label: 'Salı', value: 35 }, { label: 'Çrş', value: 50 }, { label: 'Prş', value: 45 }, { label: 'Cuma', value: 30 }] } }, choices: ['Yanlıştır; en çok satış çarşamba günü yapılmıştır.', 'Doğrudur.', 'Grafikte perşembe yoktur.', 'Satışlar her gün eşittir.'], answer: 0, feedback: [null, 'Perşembe 45, çarşamba 50; en uzun sütun çarşambanın.', '“Prş” perşembe gününü gösteriyor.', 'Sütun boyları farklı; satışlar eşit değil.'] },
      { prompt: { text: 'Bir şirket yalnızca kasım–aralık aylarını göstererek “Satışlarımız sürekli artıyor.” diyor. Tüm yılın grafiğine göre hangisi doğrudur?', visual: lineChart(['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'], [40, 55, 35, 50, 30, 45, 38, 52, 33, 41, 36, 48], 20, 60, 10, 'Aylık satış (bin TL)') }, choices: ['Satışlar yıl boyunca inip çıkıyor; verinin bir kısmını seçmek yanlı bir sonuç veriyor.', 'Satışlar gerçekten sürekli artıyor.', 'Satışlar sürekli azalıyor.', 'Grafikten satışlar hakkında bir şey söylenemez.'], answer: 0, feedback: [null, 'Örneğin şubattan marta ve ağustostan eylüle düşüş var.', 'Bazı aylarda artış, bazı aylarda azalış var; sürekli azalış da yok.', 'Grafik her ayın satışını açıkça gösteriyor.'] },
      { prompt: { text: '“B ürünü, A ürününün 2 katı satıldı.” yorumu bu grafiğe göre doğru mu?', visual: barChart([{ label: 'A', value: 40 }, { label: 'B', value: 80 }], 0, 100, 20, 'Satış (adet)') }, choices: ['Evet; eksen 0’dan başlıyor ve 80, 40’ın 2 katı.', 'Hayır; eksen yanıltıcı.', 'Hayır; B daha az satılmış.', 'Karar verilemez.'], answer: 0, feedback: [null, 'Her grafik yanıltıcı değildir; bu grafikte eksen 0’dan başlıyor.', 'B’nin sütunu daha uzun ve değeri 80.', 'Değerler eksenden okunabiliyor: 40 ve 80.'] },
    ],
  },
  {
    id: 'g8-ozet-hesap-dogrula',
    outcomes: ['MAT.8.6.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'İddiayı hesapla sına',
    instructions: 'Haberdeki ya da reklamdaki iddiayı veriden hesaplayarak kontrol et.',
    level: 2,
    launch: { text: 'Bir haber “Sokağımızda ortalama elektrik faturası 700 TL!” diyor. Hesap doğru olabilir ama bu sayı sokaktaki evlerin çoğunu anlatıyor mu?' },
    reflect: 'Hesap doğru olduğu hâlde bir yorumun yanıltıcı olabileceğini fatura örneğiyle açıkla.',
    items: [
      { text: 'Bir sokaktaki 5 evin faturaları: 300, 320, 310, 330 ve 2240 TL. Aritmetik ortalama __ TL', answers: ['700'], hints: ['Toplam 3500 TL; kaç ev var?'] },
      { text: 'Aynı faturaların ortancası __ TL', answers: ['320'], hints: ['Önce faturaları küçükten büyüğe sırala.'], explain: 'Ortanca evlerin çoğunu temsil ediyor; ortalama ise tek bir aykırı fatura yüzünden 700 TL’ye çıkmış.' },
      { text: 'Reklam: “Araştırmaya katılan 10 kişiden 8’i öneriyor.” Bu oran %__', answers: ['80'], hints: ['10 kişiden 8’i, 100 kişiden kaçı eder?'] },
      { text: 'Rastgele seçilen 200 öğrenciden 70’i en çok matematiği sevdiğini söyledi. Matematiği seçenlerin oranı %__', answers: ['35'] },
      { text: 'A sınıfının puanları 60, 70, 80; B sınıfınınki 40, 70, 100. İkisinin de ortalaması __; açıklıkları sırasıyla __ ve __', answers: ['70', '20', '60'] },
      { text: 'Haber: “Okulun ortalama puanı 3 yılda 65’ten 66’ya yükseldi; büyük başarı!” Artış __ puandır.', answers: ['1'] },
    ],
  },
  {
    id: 'g8-yaniltici-yorumlar',
    outcomes: ['MAT.8.6.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Yanıltıcı yorumları yakala',
    instructions: 'Başkalarının oluşturduğu istatistiksel sonuç ve yorumları eleştirel gözle incele.',
    level: 3,
    launch: { text: 'Sosyal medyada “Gençlerin %90’ı bu uygulamayı seviyor!” diye bir paylaşım gördün. Bu sonuca inanmadan önce hangi soruları sorarsın?' },
    reflect: 'Bir istatistiksel iddiayı kabul etmeden önce sorman gereken soruları bir kontrol listesine dönüştür.',
    questions: [
      { prompt: 'Basketbol kulübü üyelerine “En sevdiğiniz spor hangisi?” diye soran Kerem, “Okulumuzun en sevdiği spor basketboldur.” sonucuna varıyor. Bu çıkarımdaki sorun nedir?', choices: ['Örneklem yanlıdır; okulu temsil etmez.', 'Soru açık değildir.', 'Veri sayısal değildir.', 'Sonuç doğrudur.'], answer: 0, feedback: [null, 'Soru açık; sorun kime sorulduğunda.', 'Kategorik veriyle de sonuç çıkarılabilir; sorun örneklemde.', 'Basketbol kulübü üyeleri basketbolu sevmeye zaten daha yatkındır.'] },
      { prompt: 'Bir sokaktaki 5 evin faturaları 300, 320, 310, 330 ve 2240 TL. Haberde “Sokakta ortalama fatura 700 TL” deniyor. En doğru değerlendirme hangisidir?', choices: ['Hesap doğru ama aykırı değer yüzünden ortalama yanıltıcıdır; ortanca (320 TL) daha iyi temsil eder.', 'Hesap yanlıştır.', 'Evlerin çoğu 700 TL civarında öder.', 'Ortanca da 700 TL’dir.'], answer: 0, feedback: [null, 'Toplam 3500, 5 ev: ortalama gerçekten 700 TL.', 'Evlerin dördü 300–330 TL arasında ödüyor.', 'Sıralanınca ortadaki değer 320 TL’dir.'] },
      { prompt: '“Araştırmaya katılan 10 kişiden 8’i bu diş macununu öneriyor.” Bu reklamdaki sonuç neden sorgulanmalıdır?', choices: ['Örneklem çok küçüktür ve nasıl seçildiği belli değildir.', '8 çift sayıdır.', 'Yüzde kullanılmamıştır.', 'Bütün diş macunları aynıdır.'], answer: 0, feedback: [null, 'Sayının tek ya da çift olması sonucu etkilemez.', 'Yüzdeyle yazılsa da (%80) sorun değişmez.', 'Sorun ürünlerde değil, verinin nasıl toplandığında.'] },
      { prompt: 'Bir şirket, yıl boyunca dalgalanan satışlarından yalnızca son iki ayı gösterip “Satışlarımız sürekli artıyor.” diyor. Bu ne tür bir hatadır?', choices: ['Verinin bir kısmını seçerek yanlı sonuç çıkarmak', 'Doğru bir genelleme', 'Yalnızca hesaplama hatası', 'Hata yoktur'], answer: 0, feedback: [null, 'İki ay tüm yılı temsil etmez.', 'Hesap doğru olabilir; sorun hangi verinin gösterildiğinde.', 'Seçilen veri gerçeği eksik gösteriyor.'] },
      { prompt: 'Bir uygulama, kendisine yorum yazan 500 kullanıcının %90’ının memnun olduğunu duyuruyor. Bu sonuç neden yanıltıcı olabilir?', choices: ['Yorumu yalnızca isteyenler yazdığı için örneklem rastgele değildir.', '500 kişi çok fazladır.', '%90 hesaplanamaz.', 'Yorumlar kategorik veri olduğu için yorum yapılamaz.'], answer: 0, feedback: [null, 'Sorun sayıda değil, katılımcıların kendilerinin seçmesinde.', '500 kişinin %90’ı 450 kişidir; hesaplanabilir.', 'Kategorik veriyle de oran hesaplanabilir.'] },
      { prompt: 'Bir anket hazırlarken katılımcıların mahremiyetini korumak için hangisi yapılmalıdır?', choices: ['Katılımcıların isimleri istenmemeli ve gerekli izinler alınmalı.', 'Telefon numaraları toplanmalı.', 'Cevaplar isimlerle birlikte sosyal medyada paylaşılmalı.', 'Katılımcıların adresleri yazılmalı.'], answer: 0, feedback: [null, 'Araştırma sorusu için gerekmeyen kişisel bilgi toplanmamalıdır.', 'Kişisel cevaplar izinsiz paylaşılamaz.', 'Adres gibi kişisel bilgiler araştırma için gereksizdir ve korunmalıdır.'] },
    ],
  },
  {
    id: 'g8-cikarim-gecerli-mi',
    outcomes: ['MAT.8.6.2'],
    type: 'categorize',
    stage: 'problem',
    title: 'Çıkarım veriyle destekleniyor mu?',
    instructions: 'Bir okulda rastgele seçilen 200 öğrenciye en sevdikleri ders soruldu: Matematik 70, Türkçe 50, Fen Bilimleri 45, İngilizce 35. Her çıkarımı doğru gruba koy.',
    level: 3,
    launch: { text: 'Aynı veriye bakan iki kişi çok farklı sonuçlar çıkarabilir. Hangi sonuç veriden gerçekten çıkıyor, hangisi verinin söylemediği bir şey?', visual: { kind: 'bars', title: 'En sevilen ders (200 öğrenci)', data: [{ label: 'Mat.', value: 70 }, { label: 'Türkçe', value: 50 }, { label: 'Fen', value: 45 }, { label: 'İng.', value: 35 }] } },
    reflect: 'Desteklenmeyen bir çıkarımı veriyle desteklenir hâle getirmek için ne tür ek veri toplamak gerekirdi?',
    categories: [
      { id: 'destek', label: 'Veriyle desteklenir', color: '#22c55e' },
      { id: 'hatali', label: 'Desteklenmez / hatalı', color: '#ef4444' },
    ],
    items: [
      { content: 'En çok tercih edilen ders matematiktir.', category: 'destek', explain: '70 en büyük değer.' },
      { content: 'Öğrencilerin %35’i matematiği tercih etmiştir.', category: 'destek', explain: '70 ÷ 200 = 0,35' },
      { content: 'Türkçeyi tercih edenler İngilizceyi tercih edenlerden 15 kişi fazladır.', category: 'destek', explain: '50 − 35 = 15' },
      { content: 'Matematiği tercih edenler, İngilizceyi tercih edenlerin 2 katıdır.', category: 'destek', explain: '70 = 2 · 35' },
      { content: 'Okuldaki tüm öğrenciler matematiği sever.', category: 'hatali', explain: '200 öğrenciden yalnızca 70’i matematiği seçmiş.' },
      { content: 'Türkiye’deki tüm öğrencilerin en sevdiği ders matematiktir.', category: 'hatali', explain: 'Bir okulun örneklemi tüm Türkiye’yi temsil etmez.' },
      { content: 'İngilizce zor bir derstir.', category: 'hatali', explain: 'Veri derslerin zorluğunu değil, tercihleri ölçüyor.' },
      { content: 'Matematiği tercih edenler en başarılı öğrencilerdir.', category: 'hatali', explain: 'Veride başarıya dair bir bilgi yok.' },
      { content: 'Öğrencilerin yarısından fazlası matematiği tercih etmiştir.', category: 'hatali', explain: '70, 200’ün yarısı olan 100’den azdır.' },
    ],
  },
  {
    id: 'g8-veri-hangisi-farkli',
    outcomes: ['MAT.8.6.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 2,
    launch: { text: 'Beş öğrencinin okula geliş süreleri (dakika): 2, 3, 3, 4, 13. Bu veriyi dört farklı ölçüyle özetledik. Her ölçü veriyi başka bir açıdan anlatıyor.', visual: dotPlot([{ values: [2, 3, 3, 4, 13] }], 0, 14) },
    reflect: 'Bir haberde bu ölçülerden yalnızca biri verilse, hangisi seni en çok yanıltabilirdi? Neden?',
    questions: [
      {
        prompt: 'Veri: 2, 3, 3, 4, 13. Hangi ölçü farklı?',
        choices: ['Aritmetik ortalama (5)', 'Ortanca (3)', 'Tepe değer (3)', 'Açıklık (11)'],
        answer: 0,
        reasons: ['Uç değerden (13) en çok etkilenen ve bütün verilerin toplanmasıyla hesaplanan tek ölçü.', 'Veriler sıralandığında tam ortada kalan değer olan tek ölçü.', 'Kategorik veride de kullanılabilen tek ölçü: en çok tekrar eden değer.', 'Verinin merkezini değil, ne kadar yayıldığını gösteren tek ölçü.'],
      },
    ],
  },

  // ── Dönüşüm ────────────────────────────────────────────────────────────

  // MAT.8.5.1
  {
    id: 'g8-oteleme-kurali',
    outcomes: ['MAT.8.5.1'],
    type: 'fill',
    stage: 'model',
    title: 'Ötelemenin yönü ve uzaklığı',
    instructions: 'Şekil ve görüntüsüne bakarak ötelemeyi belirle. Bir köşeyi seç ve onun hareketini izle.',
    level: 1,
    launch: { text: 'Bir kilim motifi yan yana tekrar ediyor. Bir motifi “kaydırarak” diğerinin üzerine getirmek için onu ne kadar, hangi yöne kaydırmalısın?' },
    reflect: 'Ötelemeyi belirlemek için neden tek bir köşenin hareketine bakmak yetiyor?',
    items: [
      {
        text: 'Turuncu şekil __ birim sağa ve __ birim yukarı ötelenerek mavi şekil elde edilmiştir.',
        answers: ['4', '2'],
        visual: gridShapes(9, 6, [
          { pts: [[1, 0], [3, 0], [3, 2], [2, 3], [1, 2]], color: '#f97316' },
          { pts: [[5, 2], [7, 2], [7, 4], [6, 5], [5, 4]], color: '#3b82f6' },
        ]),
        hints: ['Turuncu şeklin sivri tepe noktasını bul; mavide nerede?'],
      },
      { text: 'A(−2, 1) noktası ötelenerek A’(3, 4) noktasına taşınmıştır. Öteleme: __ birim sağa, __ birim yukarı', answers: ['5', '3'], hints: ['−2’den 3’e kaç adım var?'] },
      { text: 'B(4, 5) noktası 6 birim sola ötelenirse görüntüsünün apsisi __ olur.', answers: ['-2'] },
      { text: 'Bir üçgenin öteleme altındaki görüntüsünün kenarları 3 cm, 4 cm ve 5 cm’dir. Asıl üçgenin çevresi __ cm’dir.', answers: ['12'], hints: ['Öteleme kenar uzunluklarını değiştirir mi?'] },
      { text: 'Bir karenin K(1, 1) köşesi öteleme ile K’(1, −4) noktasına taşınmıştır. Kare __ birim aşağı ötelenmiştir.', answers: ['5'] },
    ],
  },
  {
    id: 'g8-oteleme-ozellikleri',
    outcomes: ['MAT.8.5.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Öteleme neyi korur?',
    instructions: 'Ötelemede şeklin her noktası aynı yönde ve eşit uzaklıkta yer değiştirir.',
    level: 1,
    launch: { text: 'Satranç tahtasında kale ileri gidiyor, asansör yukarı çıkıyor, çekmece dışarı çekiliyor. Bu hareketlerde nesnenin biçimi, büyüklüğü ya da duruşu değişiyor mu?' },
    reflect: 'Bir hareketin öteleme olup olmadığını anlamak için hangi soruları sorarsın?',
    questions: [
      {
        prompt: {
          text: 'Mavi üçgen, turuncu üçgenin öteleme altındaki görüntüsüdür. Öteleme nasıl yapılmıştır?',
          visual: gridShapes(9, 6, [
            { pts: [[1, 1], [3, 1], [1, 3]], color: '#f97316' },
            { pts: [[5, 3], [7, 3], [5, 5]], color: '#3b82f6' },
          ]),
        },
        choices: ['4 birim sağa, 2 birim yukarı', '2 birim sağa, 4 birim yukarı', '4 birim sola, 2 birim aşağı', '4 birim sağa, 2 birim aşağı'],
        answer: 0,
        feedback: [null, 'Yatay ve dikey hareketler karışmış; dik açılı köşenin önce kaç birim sağa gittiğini say.', 'Yön ters: mavi şekil sağda ve yukarıda.', 'Mavi şekil turuncudan yukarıda; aşağı değil.'],
      },
      { prompt: 'Öteleme dönüşümünde bir şekil ile görüntüsü için hangisi doğrudur?', choices: ['Eştir; kenar uzunlukları ve açı ölçüleri korunur.', 'Benzerdir ama eş değildir.', 'Görüntü her zaman daha büyüktür.', 'Şeklin duruşu ters döner.'], answer: 0, feedback: [null, 'Ötelemede büyüklük değişmez; benzerlik oranı 1’dir.', 'Öteleme yalnızca konumu değiştirir.', 'Duruşu ters çeviren yansımadır; öteleme duruşu korur.'] },
      { prompt: 'Hangisi bir öteleme örneğidir?', choices: ['Asansörün katlar arasındaki hareketi', 'Saat yelkovanının hareketi', 'Aynadaki görüntümüz', 'Kapının menteşesi etrafında açılması'], answer: 0, feedback: [null, 'Yelkovan bir nokta etrafında döner; bu dönmedir.', 'Aynadaki görüntü yansımadır; sağ ve sol yer değiştirir.', 'Kapı menteşe etrafında döner.'] },
      { prompt: 'Çevresi 12 cm olan ABCD karesi 3 birim sola ötelenirse görüntünün çevresi kaç cm olur?', choices: ['12', '15', '9', '36'], answer: 0, feedback: [null, 'Ötelemede uzunluklar değişmez; 3 eklenmez.', 'Ötelemede uzunluklar değişmez; 3 çıkarılmaz.', 'Kenarlar çarpılmaz; şekil aynı kalır.'] },
      { prompt: 'Bir ötelemede A noktası 5 birim yer değiştirmiştir. Aynı ötelemede B noktası kaç birim yer değiştirir?', choices: ['5', 'Bilinemez', '10', '0'], answer: 0, feedback: [null, 'Ötelemede bütün noktalar eşit uzaklıkta yer değiştirir.', 'Bütün noktalar aynı miktarda kayar.', 'Şeklin her noktası hareket eder.'] },
    ],
  },
  {
    id: 'g8-oteleme-mi',
    outcomes: ['MAT.8.5.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Öteleme mi?',
    instructions: 'Hareket bir öteleme dönüşümü mü? Doğru gruba sürükle.',
    level: 1,
    launch: { text: 'Teleferik kabini düz bir halat boyunca ilerliyor, dönme dolap ise dönüyor. Hangisi öteleme? Nasıl ayırt ederiz?' },
    reflect: 'Bir hareketin öteleme olmadığını göstermek için hangi noktalara bakarsın?',
    categories: [
      { id: 'oteleme', label: 'Öteleme' },
      { id: 'degil', label: 'Öteleme değil', color: '#f97316' },
    ],
    items: [
      { content: 'Asansörün yukarı çıkması', category: 'oteleme', explain: 'Bütün noktalar aynı yönde, eşit miktarda yükselir.' },
      { content: 'Teleferik kabininin düz halat boyunca ilerlemesi', category: 'oteleme', explain: 'Kabin dönmeden aynı yönde kayar.' },
      { content: 'Satrançta kalenin ileri gitmesi', category: 'oteleme', explain: 'Taş dönmeden düz bir doğrultuda kayar.' },
      { content: 'Çekmecenin dışarı çekilmesi', category: 'oteleme', explain: 'Çekmecenin her noktası aynı yönde aynı uzaklıkta hareket eder.' },
      { content: 'Kilim motifinde aynı desenin yan yana tekrarlanması', category: 'oteleme', explain: 'Desen kaydırılarak tekrarlanır.' },
      { content: 'Saat yelkovanının hareketi', category: 'degil', explain: 'Bir nokta etrafında döner.' },
      { content: 'Aynadaki görüntü', category: 'degil', explain: 'Yansımadır; sağ ve sol yer değiştirir.' },
      { content: 'Pervanenin dönmesi', category: 'degil', explain: 'Dönme hareketidir.' },
      { content: 'Kapının menteşe etrafında açılması', category: 'degil', explain: 'Kapının noktaları farklı uzaklıklarda hareket eder.' },
    ],
  },
  {
    id: 'g8-donusum-hangisi-farkli',
    outcomes: ['MAT.8.5.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün; sonra diğer gerekçeleri de oku.',
    level: 1,
    launch: { text: 'Günlük yaşamda pek çok hareket ve desen görürüz. Bu dördünü matematikçi gözüyle inceleyelim: hangisi kaydırma, hangisi dönme, hangisi yansıma?' },
    reflect: 'Seçtiğin örneği farklı yapan özelliği bir çizimle gösterebilir misin?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Asansörün yukarı çıkması', 'Aynadaki görüntümüz', 'Saat yelkovanının hareketi', 'Kilimde bir motifin yan yana tekrarı'],
        answer: 0,
        reasons: ['Düşey (yukarı-aşağı) doğrultuda öteleme olan tek örnek.', 'Yansıma olan, şeklin duruşunu ters çeviren tek örnek.', 'Bir nokta etrafında dönme olan tek örnek.', 'Tek bir nesnenin hareketi değil, motifin tekrarlanmasıyla oluşan bir desen (süsleme) olan tek örnek.'],
      },
    ],
  },

  // MAT.8.5.2
  {
    id: 'g8-donusum-koordinat-duzlemi',
    outcomes: ['MAT.8.5.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Ötele ve yansıt',
    instructions: 'Dönüşüm sonucunda oluşan görüntü noktasını işaretle.',
    level: 2,
    launch: { text: 'Kareli bir kâğıdı x ekseni boyunca katlarsan, A noktasının mürekkebi kâğıdın öbür yarısında nereye çıkar?' },
    reflect: 'Görüntü noktalarını işaretlerken koordinatlarda nasıl bir düzen fark ettin?',
    tool: 'coordinate',
    config: { size: 6 },
    tasks: [
      { prompt: 'A(2, 3) noktasının x eksenine göre yansımasını işaretle.', target: { x: 2, y: -3 }, hints: ['A, x ekseninden kaç birim uzakta? Görüntü de o kadar uzakta olmalı.'] },
      { prompt: 'B(−4, 1) noktasının y eksenine göre yansımasını işaretle.', target: { x: 4, y: 1 }, hints: ['B, y ekseninin solunda 4 birim uzakta; görüntü nerede olmalı?'] },
      { prompt: 'C(−1, −2) noktasını 4 birim sağa ve 5 birim yukarı ötele.', target: { x: 3, y: 3 } },
      { prompt: 'D(3, −1) noktasını önce y eksenine göre yansıt, sonra 2 birim aşağı ötele.', target: { x: -3, y: -3 }, hints: ['Önce yansımayı yap ve ara noktayı aklında tut.'] },
    ],
  },
  {
    id: 'g8-koordinat-kurali-kesfet',
    outcomes: ['MAT.8.5.2'],
    type: 'fill',
    stage: 'model',
    title: 'Kuralı sen keşfet',
    instructions: 'Nokta ile görüntüsünün koordinatlarını karşılaştır. Apsis ve ordinat nasıl değişiyor?',
    level: 2,
    launch: { text: 'Bir oyunda karakterin koordinatları ekranda yazıyor. Karakter aynaya bakınca ya da sağa kayınca hangi sayı değişir? Örneklerden bir kural çıkaralım.' },
    reflect: 'Yansımada hangi koordinatın değiştiğini, eksen üzerindeki noktalara ne olduğunu düşünerek nasıl hatırlayabilirsin?',
    items: [
      { text: 'A(2, 3) noktasının x eksenine göre yansıması A’(2, −3). Apsis __, ordinat __.', answers: ['aynı kalır', 'ters işaretlisine döner'], visual: { kind: 'coords', range: 5, points: [{ x: 2, y: 3, label: 'A', color: '#f97316' }, { x: 2, y: -3, label: 'A’', color: '#3b82f6' }] }, choices: ['aynı kalır', 'ters işaretlisine döner', 'artar', 'azalır'] },
      { text: 'B(−4, 1) noktasının y eksenine göre yansıması B’(4, 1). Apsis __, ordinat __.', answers: ['ters işaretlisine döner', 'aynı kalır'], visual: { kind: 'coords', range: 5, points: [{ x: -4, y: 1, label: 'B', color: '#f97316' }, { x: 4, y: 1, label: 'B’', color: '#3b82f6' }] }, choices: ['aynı kalır', 'ters işaretlisine döner', 'artar', 'azalır'] },
      { text: 'C(−1, −2) noktası 4 birim sağa ötelenip C’(3, −2) olmuş. Apsis __, ordinat __.', answers: ['artar', 'aynı kalır'], visual: { kind: 'coords', range: 5, points: [{ x: -1, y: -2, label: 'C', color: '#f97316' }, { x: 3, y: -2, label: 'C’', color: '#3b82f6' }] }, choices: ['aynı kalır', 'ters işaretlisine döner', 'artar', 'azalır'] },
      { text: 'Tabloya göre aşağı yönlü ötelemede apsis __, ordinat __.', answers: ['aynı kalır', 'azalır'], visual: { kind: 'table', headers: ['Nokta', 'A', 'B', 'C'], rows: [['Önce', '(1, 4)', '(−2, 3)', '(0, 5)'], ['3 birim aşağı', '(1, 1)', '(−2, 0)', '(0, 2)']] }, choices: ['aynı kalır', 'ters işaretlisine döner', 'artar', 'azalır'] },
      { text: 'Kural: (x, y) noktası a birim sağa ötelenirse (x + __, y) olur.', answers: ['a'], choices: ['a', '−a', 'x', 'y'] },
      { text: 'x eksenine göre yansımada (x, y) → (x, __)', answers: ['−y'], choices: ['y', '−y', 'x', '−x'], hints: ['A(2, 3) → A’(2, −3) örneğini hatırla.'] },
      { text: 'y eksenine göre yansımada (x, y) → (__, y)', answers: ['−x'], choices: ['y', '−y', 'x', '−x'] },
    ],
  },
  {
    id: 'g8-donusumu-belirle',
    outcomes: ['MAT.8.5.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Hangi dönüşüm?',
    instructions: 'Noktaların apsis ve ordinatlarındaki değişime bakarak dönüşümü belirle.',
    level: 2,
    launch: { text: 'İki şekil koordinat düzleminde çizilmiş. Biri diğerinin ötelenmişi mi, yoksa yansıması mı? Koordinatlar bize ipucu verir.' },
    reflect: 'Öteleme ile yansımayı koordinatlara bakarak ayırt etmenin en hızlı yolu ne?',
    questions: [
      {
        prompt: { text: 'AB doğru parçası ile A’B’ doğru parçası arasında hangi dönüşüm vardır?', visual: { kind: 'coords', range: 5, points: [{ x: 1, y: 3, label: 'A', color: '#f97316' }, { x: 4, y: 1, label: 'B', color: '#f97316' }, { x: 1, y: -3, label: 'A’', color: '#3b82f6' }, { x: 4, y: -1, label: 'B’', color: '#3b82f6' }] } },
        choices: ['x eksenine göre yansıma', 'y eksenine göre yansıma', '6 birim aşağı öteleme', '2 birim aşağı öteleme'],
        answer: 0,
        feedback: [null, 'Apsisler aynı kalmış; y eksenine göre yansımada apsislerin işareti değişirdi.', 'A 6 birim aşağı inmiş ama B yalnızca 2 birim; ötelemede bütün noktalar eşit kayar.', 'B 2 birim inmiş ama A 6 birim; ötelemede bütün noktalar eşit kayar.'],
      },
      {
        prompt: { text: 'ABC üçgeni ile A’B’C’ üçgeni arasında hangi dönüşüm vardır?', visual: { kind: 'coords', range: 5, points: [{ x: -4, y: 2, label: 'A', color: '#f97316' }, { x: -1, y: 2, label: 'B', color: '#f97316' }, { x: -1, y: 5, label: 'C', color: '#f97316' }, { x: 1, y: -1, label: 'A’', color: '#3b82f6' }, { x: 4, y: -1, label: 'B’', color: '#3b82f6' }, { x: 4, y: 2, label: 'C’', color: '#3b82f6' }] } },
        choices: ['5 birim sağa, 3 birim aşağı öteleme', '3 birim sağa, 5 birim aşağı öteleme', 'y eksenine göre yansıma', 'x eksenine göre yansıma'],
        answer: 0,
        feedback: [null, 'Yatay ve dikey miktarlar yer değiştirmiş: A’nın apsisi −4’ten 1’e çıkmış.', 'Duruş aynı kalmış; yansımada şekil ters dönerdi.', 'Duruş aynı kalmış ve ordinatların işareti değişmemiş.'],
      },
      {
        prompt: { text: 'ABC üçgeni ile A’B’C’ üçgeni arasında hangi dönüşüm vardır?', visual: { kind: 'coords', range: 5, points: [{ x: -3, y: 1, label: 'A', color: '#f97316' }, { x: -5, y: 4, label: 'B', color: '#f97316' }, { x: -2, y: 4, label: 'C', color: '#f97316' }, { x: 3, y: 1, label: 'A’', color: '#3b82f6' }, { x: 5, y: 4, label: 'B’', color: '#3b82f6' }, { x: 2, y: 4, label: 'C’', color: '#3b82f6' }] } },
        choices: ['y eksenine göre yansıma', 'x eksenine göre yansıma', '6 birim sağa öteleme', '3 birim sağa öteleme'],
        answer: 0,
        feedback: [null, 'Ordinatlar aynı kalmış; x eksenine göre yansımada ordinatların işareti değişirdi.', 'A 6 birim kaymış ama B 10, C 4 birim; noktalar eşit kaymamış.', 'Noktalar eşit miktarda kaymamış; apsislerin işareti değişmiş.'],
      },
      { prompt: 'Bir noktanın y eksenine göre yansımasında apsis ve ordinat nasıl değişir?', choices: ['Apsis ters işaretlisine dönüşür, ordinat aynı kalır.', 'Ordinat ters işaretlisine dönüşür, apsis aynı kalır.', 'İkisi de ters işaretlisine dönüşür.', 'İkisi de aynı kalır.'], answer: 0, feedback: [null, 'Bu, x eksenine göre yansımadır.', 'İkisinin de işareti değişirse nokta iki eksene göre art arda yansıtılmış olur.', 'Nokta y ekseni üzerinde değilse yeri değişir.'] },
      { prompt: 'Yukarı yönlü bir ötelemede noktanın hangi koordinatı değişmez?', choices: ['Apsisi', 'Ordinatı', 'Hem apsisi hem ordinatı', 'Hiçbiri'], answer: 0, feedback: [null, 'Yukarı gidince ordinat artar.', 'Nokta hareket ediyor; bir koordinatı değişmeli.', 'Yalnızca yukarı gidildiği için apsis değişmez.'] },
      { prompt: 'K(−2, 5) noktasının x eksenine göre yansıması hangisidir?', choices: ['(−2, −5)', '(2, 5)', '(2, −5)', '(5, −2)'], answer: 0, feedback: [null, 'Bu, y eksenine göre yansımadır.', 'İki koordinatın da işareti değişmiş; x eksenine göre yansımada yalnızca ordinat değişir.', 'Koordinatların yerleri değişmez.'] },
    ],
  },
  {
    id: 'g8-donusum-eslestir',
    outcomes: ['MAT.8.5.2'],
    type: 'match',
    stage: 'sembol',
    title: 'A(3, −2) noktasının görüntüleri',
    instructions: 'A(3, −2) noktasına uygulanan her dönüşümü, çizim yapmadan, görüntü noktasıyla eşleştir.',
    level: 2,
    perRound: 6,
    launch: { text: 'Keşfettiğin kuralları artık çizim yapmadan kullanabilir misin? Tek bir noktaya altı farklı dönüşüm uygulayalım.' },
    reflect: 'Hangi eşleştirmede çizim yapma ihtiyacı duydun? Kural mı, çizim mi senin için daha güvenilir?',
    pairs: [
      { left: 'x eksenine göre yansıması', right: '(3, 2)' },
      { left: 'y eksenine göre yansıması', right: '(−3, −2)' },
      { left: '2 birim sola ötelenmesi', right: '(1, −2)' },
      { left: '5 birim yukarı ötelenmesi', right: '(3, 3)' },
      { left: '3 birim aşağı ötelenmesi', right: '(3, −5)' },
      { left: '1 birim sağa, 2 birim yukarı ötelenmesi', right: '(4, 0)' },
    ],
  },

  // MAT.8.5.3
  {
    id: 'g8-dikdortgen-donusum',
    outcomes: ['MAT.8.5.3'],
    type: 'fill',
    stage: 'model',
    title: 'Motifin yolculuğu',
    instructions: 'Turuncu dikdörtgen önce bir eksene göre yansıtılmış, sonra ötelenmiştir. Koordinatları inceleyerek dönüşümleri bul.',
    level: 2,
    launch: { text: 'Bir kilim tasarımcısı bir motifi önce aynalayıp sonra kaydırarak yeni bir desen oluşturuyor. Hangi adımları uyguladığını koordinatlardan bulabilir misin?', visual: DIKDORTGEN_DONUSUM },
    reflect: 'İki dönüşümü hangi sırayla uyguladığın sonucu değiştirir mi? Bu örnekte dene.',
    items: [
      { text: 'Turuncu ABCD dikdörtgeninin kenar uzunlukları __ ve __ birim.', answers: ['3', '2'], visual: DIKDORTGEN_DONUSUM },
      { text: 'Mavi A’B’C’D’ dikdörtgeninin alanı __ birimkare.', answers: ['6'], visual: DIKDORTGEN_DONUSUM, hints: ['Yansıma ve öteleme şeklin büyüklüğünü değiştirir mi?'] },
      { text: 'C(−1, 3) → C’(4, −3): ordinatın işareti değiştiğine göre __ eksenine göre yansıma yapılmıştır.', answers: ['x'], visual: DIKDORTGEN_DONUSUM, choices: ['x', 'y'] },
      { text: 'Apsis −1’den 4’e çıktığına göre şekil __ birim sağa ötelenmiştir.', answers: ['5'], visual: DIKDORTGEN_DONUSUM },
      { text: 'Aynı dönüşümlerle E(−3, 2) noktasının görüntüsü E’( __ , __ )', answers: ['2', '-2'], hints: ['Önce x eksenine göre yansıt, sonra 5 birim sağa ötele.'] },
    ],
  },
  {
    id: 'g8-donusum-problemleri-hesapla',
    outcomes: ['MAT.8.5.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Art arda dönüşümler',
    instructions: 'Dönüşümleri verilen sırayla uygula. Geriye doğru gitmen gerekirse ters işlemi kullan.',
    level: 3,
    launch: { text: 'Bir nokta iki dönüşümden sonra (2, 1) noktasına gelmiş. Başlangıçta nerede olduğunu bulmak için ne yapmalısın?' },
    reflect: 'Son noktadan ilk noktaya geri giderken dönüşümleri hangi sırayla ve nasıl uyguladın?',
    items: [
      { text: 'A(−2, 5) noktası x eksenine göre yansıtılıp 3 birim sağa ötelenirse A’( __ , __ )', answers: ['1', '-5'], hints: ['Önce yansıma: (−2, ?)'] },
      { text: 'B(4, −1) noktası y eksenine göre yansıtılıp 2 birim yukarı ötelenirse B’( __ , __ )', answers: ['-4', '1'] },
      { text: 'C(3, 2) noktası ile y eksenine göre yansıması arasındaki uzaklık __ birim', answers: ['6'], hints: ['Yansıma (−3, 2); iki nokta aynı yatay doğru üzerinde.'] },
      { text: 'Köşeleri (0, 0), (4, 0), (4, 3), (0, 3) olan dikdörtgen 5 birim sola ötelenirse görüntüsünün çevresi __ birim', answers: ['14'], hints: ['Öteleme kenar uzunluklarını değiştirir mi?'] },
      { text: 'D noktasının x eksenine göre yansıması (−3, 4) ise D noktasının ordinatı __', answers: ['-4'], hints: ['Yansımanın yansıması nereye gider?'] },
      { text: 'Bir nokta 4 birim aşağı ötelenip x eksenine göre yansıtıldığında (2, 1) oluyor. Noktanın ilk ordinatı __', answers: ['3'], hints: ['Tersten git: önce x eksenine göre yansıt.', 'Sonra 4 birim yukarı ötele.'] },
    ],
  },
  {
    id: 'g8-donusum-problemleri',
    outcomes: ['MAT.8.5.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Dönüşüm problemleri',
    instructions: 'Öteleme ve yansıma dönüşümlerini kullanarak problemleri çöz. Önce sonucu tahmin et.',
    level: 3,
    launch: { text: 'Türkiye haritası bir koordinat düzlemine yerleştirilmiş. Harita kaydırılınca Ankara’nın koordinatları ne olur? Şehirler arasındaki uzaklıklar değişir mi?' },
    reflect: 'Bu problemlerden birini çözerken kullandığın stratejiyi (tablo, çizim, tersten gitme…) bir arkadaşına anlat. Başka bir problemde de işe yarar mı?',
    questions: [
      { prompt: 'A(3, 4) noktası ile x eksenine göre yansıması arasındaki uzaklık kaç birimdir?', choices: ['8', '4', '6', '3'], answer: 0, feedback: [null, '4, A’nın x eksenine uzaklığıdır; görüntü de eksenin öbür yanında 4 birim uzakta.', '6, apsisin iki katıdır; x eksenine göre yansımada ordinata bakılır.', '3 apsistir; dikey uzaklık ordinattan bulunur.'], explain: 'Yansıma (3, −4); ordinatlar arası fark 4 − (−4) = 8.' },
      { prompt: 'Bir nokta önce 3 birim sağa ötelenip sonra y eksenine göre yansıtılınca (−1, 2) noktası elde ediliyor. Noktanın ilk konumu nedir?', choices: ['(−2, 2)', '(4, 2)', '(2, 2)', '(−4, 2)'], answer: 0, feedback: [null, 'Tersten giderken önce 3 birim sola ötelemişsin; en son yapılan işlem (yansıma) ilk önce geri alınmalı.', 'Kontrol et: (2, 2) → 3 birim sağa (5, 2) → yansıma (−5, 2) olur; (−1, 2) değil.', '(−1, 2)’yi yalnızca 3 birim sola ötelemişsin; yansımayı geri almayı unuttun.'], explain: 'Tersten: (−1, 2) → y eksenine göre yansıt → (1, 2) → 3 birim sola → (−2, 2).' },
      { prompt: 'Köşeleri A(1, 1), B(4, 1), C(4, 3) olan üçgen 2 birim sola ve 5 birim yukarı ötelenirse görüntüsünün alanı kaç birimkare olur?', choices: ['3', '6', '15', 'Bilinemez'], answer: 0, feedback: [null, '3 · 2 = 6 dikdörtgenin alanı; üçgen bunun yarısı.', 'Öteleme miktarları alanı etkilemez.', 'Öteleme şekli değiştirmez; alan ilk üçgenin alanıdır.'], explain: '(3 · 2) ÷ 2 = 3' },
      { prompt: 'Satranç tahtasında bir kale d1 karesinden d5 karesine gidiyor. Bu hareket hangi dönüşüme örnektir?', choices: ['4 kare yukarı öteleme', 'Yansıma', 'Dönme', 'Hiçbir dönüşüm değildir'], answer: 0, feedback: [null, 'Kale ters dönmüyor; yalnızca kayıyor.', 'Kale dönmeden düz bir doğrultuda ilerliyor.', 'Her noktası aynı yönde eşit uzaklıkta yer değiştirdiği için bir ötelemedir.'] },
      { prompt: 'Koordinat düzlemine yerleştirilen Türkiye haritasında Ankara (33, 40) noktasında gösteriliyor. Harita 2 birim sağa, 1 birim aşağı ötelenirse Ankara’nın yeni koordinatları ne olur?', choices: ['(35, 39)', '(31, 41)', '(35, 41)', '(34, 42)'], answer: 0, feedback: [null, 'Sağa gidince apsis artar, aşağı gidince ordinat azalır.', 'Aşağı gidince ordinat azalmalı.', 'Miktarlar karışmış: apsis 2, ordinat 1 değişmeli.'] },
      { prompt: 'P(−2, −3) noktası x eksenine göre, elde edilen nokta da y eksenine göre yansıtılıyor. Son nokta hangisidir?', choices: ['(2, 3)', '(−2, 3)', '(2, −3)', '(−3, −2)'], answer: 0, feedback: [null, 'Bu yalnızca ilk yansımanın sonucu; y eksenine göre yansıtmayı unuttun.', 'Bu yalnızca y eksenine göre yansımadır.', 'Koordinatların yerleri değişmez.'] },
      { prompt: 'A(−1, 2) noktası a birim sağa ötelenip x eksenine göre yansıtıldığında (4, −2) noktası elde ediliyor. a kaçtır?', choices: ['5', '3', '4', '6'], answer: 0, feedback: [null, '−1 + 3 = 2 olur, 4 değil.', '4 görüntünün apsisi; ötelemeyle −1’den 4’e çıkmak için kaç birim gerekir?', '−1 + 6 = 5 olur, 4 değil.'], explain: '−1 + a = 4 → a = 5' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Büyük fikirler (öğretmen ve veliler için)
// ---------------------------------------------------------------------------

export const grade8Notes: ThemeNotes = {
  'sayilar-ve-nicelikler': {
    bigIdeas: [
      'Üslü ifade tekrarlı çarpmanın kısa yazılışıdır; üslü ifadelerin bütün özellikleri bu anlamdan çıkar, ezberlenmesi gerekmez.',
      'Sıfırıncı ve negatif kuvvetler, “üs 1 azalınca tabana böl” örüntüsünün doğal devamıdır: a⁰ = 1, a⁻ⁿ = 1 ÷ aⁿ.',
      'Bir sayının karekökü, alanı o sayı olan karenin kenar uzunluğudur; tam kare olmayan bir sayının karekökü iki ardışık doğal sayı arasındadır.',
      'Ondalık gösterimi sonlu ya da devirli olan sayılar rasyonel, düzensiz sonsuz olanlar irrasyoneldir; ikisi birlikte sayı doğrusunu boşluksuz dolduran gerçek sayıları oluşturur.',
    ],
  },
  'geometrik-sekiller': {
    bigIdeas: [
      'Bir üçgende büyük açının karşısında uzun kenar, küçük açının karşısında kısa kenar bulunur.',
      'Üç uzunluktan üçgen oluşması için her kenar diğer ikisinin toplamından küçük, farkından büyük olmalıdır.',
      'Eşlik “aynı biçim, aynı boyut”, benzerlik “aynı biçim, orantılı boyut” demektir; uygun birkaç bilgi (KKK, KAK, AKA ya da iki açı) üçgeni belirler.',
      'Dik üçgende dik kenarlar üzerine kurulan karelerin alanları toplamı, hipotenüs üzerindeki karenin alanına eşittir.',
    ],
  },
  'veriden-olasiliga': {
    bigIdeas: [
      'Olasılık 0 (imkânsız) ile 1 (kesin) arasında bir sayıdır ve üç yolla tahmin edilebilir: öznel (sezgi ve deneyim), deneysel (göreli sıklık), teorik (eş olasılıklı çıktılar).',
      'Deney sayısı arttıkça deneysel olasılık daha az dalgalanır ve teorik olasılığa yaklaşır.',
      'Hangi yaklaşımın uygun olduğu duruma bağlıdır: çıktılar eş olasılıklı değilse ya da sayılamıyorsa veri toplamak gerekir.',
    ],
  },
  'cebirsel-dusunme-ve-degisimler': {
    bigIdeas: [
      'Dik koordinat sisteminde her nokta bir sıralı ikiliye, her sıralı ikili bir noktaya karşılık gelir.',
      'Doğrusal ilişkilerde değişim oranı (eğim) sabittir; sözel anlatım, tablo, grafik ve denklem aynı ilişkinin farklı temsilleridir.',
      'İki doğrunun kesişim noktası iki ilişkiyi aynı anda sağlar (yetişme anı, eşit maliyet); eğimleri eşit doğrular paraleldir.',
      'Algoritma bir problemin çözüm adımlarını sıralı ve açık biçimde ifade eder; doğrusal fonksiyon bir girdi–çıktı makinesi gibi düşünülebilir.',
    ],
  },
  'geometrik-nicelikler': {
    bigIdeas: [
      'Bir cismin yüzey alanı, açınımındaki bütün şekillerin alanları toplamıdır.',
      'Silindirin yanal yüzeyi açılınca kenarları taban çevresi (2πr) ve yükseklik (h) olan bir dikdörtgen olur.',
      'Daire dilimlerinin dikdörtgene dönüşmesi gibi silindir dilimleri de prizmaya dönüşür: silindirin hacmi taban alanı ile yüksekliğin çarpımıdır.',
    ],
  },
  'istatistiksel-arastirma-sureci': {
    bigIdeas: [
      'İstatistiksel araştırma bir soruyla başlar; veri türü (kategorik, kesikli, sürekli) uygun grafiği ve özet ölçüsünü belirler.',
      'Merkezî eğilim ölçüleri verinin “ortasını”, açıklık ve ortalama mutlak sapma ise ne kadar yayıldığını anlatır; ikisi birlikte yorumlanır.',
      'Grafikler ve istatistiksel iddialar yanıltıcı olabilir: eksen ölçeği, örneklemin büyüklüğü ve seçimi, aykırı değerler mutlaka sorgulanmalıdır.',
    ],
  },
  donusum: {
    bigIdeas: [
      'Öteleme, şeklin her noktasını aynı yönde ve eşit uzaklıkta taşır; şekil ile görüntüsü eştir.',
      'Koordinat düzleminde öteleme yalnızca ilgili koordinata ekleme ya da çıkarma yapar; x eksenine göre yansımada ordinatın, y eksenine göre yansımada apsisin işareti değişir.',
      'Art arda dönüşümler verilen sırayla uygulanır; tersten giderek başlangıç noktası bulunabilir.',
    ],
  },
}
