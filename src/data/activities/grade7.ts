import type { Activity, ThemeNotes, Visual } from '../types'

/**
 * 7. SINIF — Van de Walle yaklaşımıyla etkinlikler
 * Her öğrenme çıktısında: somut → model → sembol → problem.
 * Her etkinlik: Başlarken (launch) → Keşfet → Düşün ve Paylaş (reflect).
 */

// ───────────────────────────────────────────────────────────────────────────
// Yardımcılar (görselleri hatasız üretmek için)
// ───────────────────────────────────────────────────────────────────────────

/** Küp yapısı: heights[y][x], y = 0 en arka sıra, x = 0 en sol sütun */
type Heights = number[][]
const widthOf = (h: Heights) => Math.max(...h.map((r) => r.length))
const tallest = (h: Heights) => Math.max(...h.flat())
const cubes = (heights: Heights): Visual => ({ kind: 'cubes', heights })
/** Sütun yüksekliklerinden kareli görünüm çizer */
function columns(vals: number[], rows: number): Visual {
  const cells: string[] = []
  vals.forEach((m, x) => {
    for (let k = 0; k < m; k++) cells.push(`${x},${rows - 1 - k}`)
  })
  return { kind: 'grid', cols: vals.length, rows, cells }
}
const frontCols = (h: Heights) => Array.from({ length: widthOf(h) }, (_, x) => Math.max(...h.map((r) => r[x] ?? 0)))
/** Önden görünüm: soldan sağa sütunlar */
const frontView = (h: Heights) => columns(frontCols(h), tallest(h))
/** Soldan görünüm: arka sıra solda, ön sıra sağda */
const leftView = (h: Heights) => columns(h.map((r) => Math.max(...r)), tallest(h))
/** Sağdan görünüm: ön sıra solda, arka sıra sağda */
const rightView = (h: Heights) => columns(h.map((r) => Math.max(...r)).reverse(), tallest(h))
/** Üstten görünüm: arka sıra yukarıda */
const topView = (h: Heights): Visual => ({
  kind: 'grid',
  cols: widthOf(h),
  rows: h.length,
  cells: h.flatMap((r, y) => r.flatMap((v, x) => (v > 0 ? [`${x},${y}`] : []))),
})
/** Sayı kodu: üstten görünümde her karedeki küp sayısı (üst satır = arka sıra) */
const heightCode = (h: Heights): Visual => ({
  kind: 'table',
  headers: widthOf(h) === 2 ? ['Sol', 'Sağ'] : widthOf(h) === 3 ? ['Sol', 'Orta', 'Sağ'] : Array.from({ length: widthOf(h) }, (_, i) => `${i + 1}`),
  rows: h.map((r) => Array.from({ length: widthOf(h) }, (_, x) => ((r[x] ?? 0) > 0 ? r[x] : '·'))),
})
const cubeCount = (h: Heights) => h.flat().reduce((a, b) => a + b, 0)

const VIEW_NOTE = 'Yapının önü, sol alttaki orta mor yüzlerin baktığı taraftır; sağı, sağ alttaki koyu mor yüzlerin baktığı taraftır.'

const S1: Heights = [[3, 2, 1], [1, 1, 0]]
const S2: Heights = [[2, 2], [2, 1], [1, 0]]
const S3: Heights = [[1, 3, 1], [0, 1, 0]]
const S4: Heights = [[2, 1, 1], [2, 0, 0], [1, 0, 0]]
const S5: Heights = [[2, 2, 1], [1, 0, 0]]
const S6: Heights = [[3, 1], [2, 1]]

/** Kareli zeminde yansıma için yardımcılar ("x,y" hücreleri) */
const cell = (c: string) => c.split(',').map(Number) as [number, number]
const mirrorV = (cs: string[], cols: number) => cs.map((c) => { const [x, y] = cell(c); return `${cols - 1 - x},${y}` })
const mirrorH = (cs: string[], rows: number) => cs.map((c) => { const [x, y] = cell(c); return `${x},${rows - 1 - y}` })
const shift = (cs: string[], dx: number, dy: number) => cs.map((c) => { const [x, y] = cell(c); return `${x + dx},${y + dy}` })
const grid = (cols: number, rows: number, cells: string[], axis: 'v' | 'h'): Visual => ({ kind: 'grid', cols, rows, cells, axis })

/** Elle çizilmiş SVG */
const svg = (w: number, h: number, body: string): Visual => ({ kind: 'svg', svg: `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>` })
const INK = '#1f2340'
const ROSE = '#e11d48'
const minus = (v: number) => (v < 0 ? `−${String(-v).replace('.', ',')}` : String(v).replace('.', ','))
const txt = (x: number, y: number, t: string, anchor = 'middle', size = 13, color = INK) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${color}" text-anchor="${anchor}">${t}</text>`
const tri = (pts: string) => `<polygon points="${pts}" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
const lbl = (x: number, y: number, t: string, anchor = 'middle') => txt(x, y, t, anchor)
const red = (x1: number, y1: number, x2: number, y2: number, w = 3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ROSE}" stroke-width="${w}" stroke-linecap="round"/>`
const ABC = (ax: number) => lbl(ax, 15, 'A') + lbl(12, 150, 'B') + lbl(208, 150, 'C')

/** Dikey sayı doğrusu (termometre, deniz seviyesi, asansör). marks: işaretlenecek değerler ve etiketleri */
function vLine(min: number, max: number, marks: { v: number; t: string }[] = [], unit = ''): Visual {
  const gap = 14, top = 14, H = top * 2 + (max - min) * gap
  const y = (v: number) => top + (max - v) * gap
  let body = `<line x1="70" y1="${top - 6}" x2="70" y2="${H - top + 6}" stroke="${INK}" stroke-width="3"/>`
  for (let v = min; v <= max; v++) {
    const major = v % 2 === 0
    body += `<line x1="${major ? 62 : 65}" y1="${y(v)}" x2="${major ? 78 : 75}" y2="${y(v)}" stroke="${INK}" stroke-width="${v === 0 ? 3 : 1.5}"/>`
    if (major) body += txt(56, y(v) + 4, `${minus(v)}${unit}`, 'end', 11)
  }
  marks.forEach((m) => {
    body += `<circle cx="70" cy="${y(m.v)}" r="6" fill="${ROSE}" stroke="#fff" stroke-width="2"/>` + txt(84, y(m.v) + 4, m.t, 'start', 12, ROSE)
  })
  return svg(220, H, body)
}

/** İki renkli sayma pulları: sarı (+1) ve kırmızı (−1). Kesikli çerçevedekiler sıfır çiftidir. */
function counters(pos: number, neg: number): Visual {
  const cols = Math.max(pos, neg, 1), W = cols * 30 + 20
  let body = ''
  for (let i = 0; i < pos; i++) body += `<circle cx="${25 + i * 30}" cy="22" r="12" fill="#facc15" stroke="${INK}" stroke-width="2"/>` + txt(25 + i * 30, 27, '+', 'middle', 15)
  for (let i = 0; i < neg; i++) body += `<circle cx="${25 + i * 30}" cy="56" r="12" fill="#f87171" stroke="${INK}" stroke-width="2"/>` + txt(25 + i * 30, 61, '−', 'middle', 15)
  const pairs = Math.min(pos, neg)
  if (pairs > 0) body += `<rect x="9" y="6" width="${pairs * 30 + 2}" height="66" rx="10" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="5 3"/>`
  return svg(W, 80, body)
}

/** Çift sayı doğrusu: üstte bir nicelik, altta diğeri; aynı hizadaki değerler denk oranlardır */
function dnl(topName: string, bottomName: string, ticks: { at: number; top: string; bottom: string }[], max: number): Visual {
  const L = 20, R = 300, x = (v: number) => L + (v / max) * (R - L)
  let body = `<line x1="${L}" y1="34" x2="${R + 10}" y2="34" stroke="${INK}" stroke-width="2.5"/><line x1="${L}" y1="84" x2="${R + 10}" y2="84" stroke="${INK}" stroke-width="2.5"/>`
  ticks.forEach((t) => {
    const c1 = t.top === '?' ? ROSE : INK, c2 = t.bottom === '?' ? ROSE : INK
    body += `<line x1="${x(t.at)}" y1="27" x2="${x(t.at)}" y2="41" stroke="${INK}" stroke-width="2"/><line x1="${x(t.at)}" y1="77" x2="${x(t.at)}" y2="91" stroke="${INK}" stroke-width="2"/>`
    body += txt(x(t.at), 22, t.top, 'middle', 13, c1) + txt(x(t.at), 106, t.bottom, 'middle', 13, c2)
  })
  body += txt(R + 12, 52, topName, 'end', 11, '#6366f1') + txt(R + 12, 72, bottomName, 'end', 11, '#6366f1')
  return svg(320, 114, body)
}

/** Orijinden çıkan ışınlar (koordinat sistemi olmadan, yalnız iki eksen) */
function rays(lines: { dx: number; dy: number; color: string; label?: string }[], xName = '', yName = ''): Visual {
  let body = `<line x1="24" y1="120" x2="210" y2="120" stroke="${INK}" stroke-width="2"/><line x1="24" y1="120" x2="24" y2="10" stroke="${INK}" stroke-width="2"/>`
  lines.forEach((l) => {
    const k = Math.min(170 / l.dx, 105 / l.dy)
    const ex = 24 + l.dx * k, ey = 120 - l.dy * k
    body += `<line x1="24" y1="120" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${l.color}" stroke-width="3"/>`
    if (l.label) body += txt(Math.min(ex + 4, 200), Math.max(ey + 4, 14), l.label, 'start', 12, l.color)
  })
  body += txt(210, 136, xName, 'end', 11) + txt(30, 12, yName, 'start', 11)
  return svg(240, 142, body)
}
const AXES = `<line x1="15" y1="75" x2="105" y2="75" stroke="${INK}" stroke-width="2"/><line x1="15" y1="75" x2="15" y2="5" stroke="${INK}" stroke-width="2"/>`
const GRAPH_PROP = svg(110, 85, AXES + `<line x1="15" y1="75" x2="95" y2="15" stroke="#6366f1" stroke-width="3"/>`)
const GRAPH_OFFSET = svg(110, 85, AXES + `<line x1="15" y1="55" x2="95" y2="15" stroke="#6366f1" stroke-width="3"/>`)
const GRAPH_CURVE = svg(110, 85, AXES + `<path d="M15 75 Q60 74 95 10" fill="none" stroke="#6366f1" stroke-width="3"/>`)
const GRAPH_DOWN = svg(110, 85, AXES + `<line x1="15" y1="15" x2="95" y2="70" stroke="#6366f1" stroke-width="3"/>`)

/** Nokta grafiği: her değer için bir nokta, aynı değerler üst üste */
function dotPlot(values: number[], min: number, max: number, title = ''): Visual {
  const W = 320, L = 20, R = 300, x = (v: number) => L + ((v - min) / (max - min)) * (R - L)
  const counts = new Map<number, number>()
  let body = `<line x1="${L - 6}" y1="120" x2="${R + 6}" y2="120" stroke="${INK}" stroke-width="2"/>`
  for (let v = min; v <= max; v++) body += `<line x1="${x(v)}" y1="116" x2="${x(v)}" y2="124" stroke="${INK}" stroke-width="1.5"/>` + txt(x(v), 138, String(v), 'middle', 11)
  values.forEach((v) => {
    const k = counts.get(v) ?? 0
    counts.set(v, k + 1)
    body += `<circle cx="${x(v)}" cy="${108 - k * 14}" r="6" fill="#6366f1"/>`
  })
  if (title) body += txt(W / 2, 14, title, 'middle', 12)
  return svg(W, 146, body)
}

/** Çizgi grafiği (zamana bağlı sürekli veri) */
function lineGraph(vals: number[], labels: string[], lo: number, hi: number, title = ''): Visual {
  const L = 40, R = 300, T = 24, B = 120
  const x = (i: number) => L + (i / (vals.length - 1)) * (R - L)
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T)
  let body = `<line x1="${L}" y1="${B}" x2="${R + 8}" y2="${B}" stroke="${INK}" stroke-width="2"/><line x1="${L}" y1="${B}" x2="${L}" y2="${T - 8}" stroke="${INK}" stroke-width="2"/>`
  ;[lo, (lo + hi) / 2, hi].forEach((v) => { body += txt(L - 5, y(v) + 4, String(v).replace('.', ','), 'end', 10) + `<line x1="${L}" y1="${y(v)}" x2="${R}" y2="${y(v)}" stroke="#e5e7eb"/>` })
  body += `<polyline points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="#6366f1" stroke-width="3"/>`
  vals.forEach((v, i) => { body += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#6366f1"/>` + txt(x(i), B + 16, labels[i], 'middle', 10) })
  if (title) body += txt(170, 12, title, 'middle', 12)
  return svg(320, 142, body)
}

/** Eşitsizliğin sayı doğrusunda gösterimi: a noktasında boş/dolu daire ve ışın */
function ineq(a: number, op: '<' | '>' | '≤' | '≥', min: number, max: number): Visual {
  const L = 20, R = 300, x = (v: number) => L + ((v - min) / (max - min)) * (R - L)
  let body = `<line x1="${L - 10}" y1="40" x2="${R + 10}" y2="40" stroke="${INK}" stroke-width="2"/>`
  for (let v = min; v <= max; v++) body += `<line x1="${x(v)}" y1="34" x2="${x(v)}" y2="46" stroke="${INK}" stroke-width="1.5"/>` + txt(x(v), 64, minus(v), 'middle', 11)
  const right = op === '>' || op === '≥'
  const end = right ? R + 10 : L - 10
  body += `<line x1="${x(a)}" y1="40" x2="${end}" y2="40" stroke="#6366f1" stroke-width="6" stroke-linecap="round"/>`
  body += `<path d="M${end + (right ? 6 : -6)} 40 l${right ? -12 : 12} -8 v16 z" fill="#6366f1"/>`
  body += `<circle cx="${x(a)}" cy="40" r="7" fill="${op === '<' || op === '>' ? '#fff' : '#6366f1'}" stroke="#6366f1" stroke-width="3"/>`
  return svg(320, 72, body)
}

/** Merkez açısı verilen daire dilimi (tepeden saat yönünde) */
function sector(deg: number, label = `${deg}°`): Visual {
  const cx = 60, cy = 60, r = 48, a = (deg * Math.PI) / 180
  const ex = cx + r * Math.sin(a), ey = cy - r * Math.cos(a)
  const path = `<path d="M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)} Z" fill="#fb923c" stroke="${INK}" stroke-width="2"/>`
  return svg(170, 120, `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5"/>` + path + `<circle cx="${cx}" cy="${cy}" r="3" fill="${INK}"/>` + txt(140, 66, label, 'middle', 15, '#c2410c'))
}

/** Akış şeması (doğrusal adımlar) */
function flow(steps: string[]): Visual {
  const W = 260, h = 30, gap = 16
  let body = ''
  steps.forEach((s, i) => {
    const y = 6 + i * (h + gap)
    const end = i === 0 || i === steps.length - 1
    body += end ? `<rect x="70" y="${y}" width="120" height="${h}" rx="15" fill="#c7d2fe" stroke="${INK}" stroke-width="2"/>` : `<rect x="20" y="${y}" width="220" height="${h}" rx="4" fill="#fff7ed" stroke="${INK}" stroke-width="2"/>`
    body += txt(W / 2, y + 20, s, 'middle', 12)
    if (i < steps.length - 1) body += `<line x1="${W / 2}" y1="${y + h}" x2="${W / 2}" y2="${y + h + gap - 2}" stroke="${INK}" stroke-width="2"/><path d="M${W / 2 - 5} ${y + h + gap - 7} l5 6 l5 -6" fill="none" stroke="${INK}" stroke-width="2"/>`
  })
  return svg(W, 12 + steps.length * (h + gap) - gap, body)
}

/** Sayıları ikili sıralar hâlinde noktalarla gösterir (tek sayılarda bir nokta açıkta kalır) */
function pairDots(nums: number[]): Visual {
  const colors = ['#6366f1', '#f97316', '#22c55e']
  let x0 = 14, body = ''
  nums.forEach((n, k) => {
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / 2), row = i % 2
      body += `<circle cx="${x0 + col * 18}" cy="${22 + row * 20}" r="7" fill="${colors[k % 3]}"/>`
    }
    x0 += Math.ceil(n / 2) * 18 + 22
  })
  return svg(Math.max(120, x0), 60, body)
}

/** Üçgende kenarortay [AD] */
const SVG_MEDIAN = svg(220, 160, tri('150,22 20,135 200,135') + red(150, 22, 110, 135) + red(65, 129, 65, 141, 2) + red(155, 129, 155, 141, 2) + ABC(150) + lbl(110, 153, 'D'))
/** Üçgende yükseklik [AH] */
const SVG_ALTITUDE = svg(220, 160, tri('60,22 20,135 200,135') + red(60, 22, 60, 135) + `<polyline points="60,125 70,125 70,135" fill="none" stroke="${ROSE}" stroke-width="2"/>` + ABC(60) + lbl(62, 153, 'H'))
/** Üçgende açıortay [AE] */
const SVG_BISECTOR = svg(220, 160, tri('100,22 20,135 200,135') + red(100, 22, 106, 135) + lbl(88, 66, 'α') + lbl(116, 65, 'α') + ABC(100) + lbl(106, 153, 'E'))
/** [BC] kenarının orta dikmesi */
const SVG_PERP = svg(220, 165, tri('70,22 20,135 200,135') + red(110, 45, 110, 158) + `<polyline points="110,125 120,125 120,135" fill="none" stroke="${ROSE}" stroke-width="2"/>` + red(65, 129, 65, 141, 2) + red(155, 129, 155, 141, 2) + ABC(70) + lbl(116, 55, 'd', 'start'))
/** Ağırlık merkezi G */
const SVG_CENTROID = svg(220, 160, tri('100,22 20,135 200,135') + red(100, 22, 110, 135, 2) + red(20, 135, 150, 78.5, 2) + red(200, 135, 60, 78.5, 2) + `<circle cx="106.7" cy="97.3" r="4.5" fill="${INK}"/>` + ABC(100) + lbl(128, 121, 'G'))
/** Geniş açılı üçgende dışarıda kalan yükseklik [AH] */
const SVG_ALT_OUT = svg(240, 160, tri('40,30 90,135 220,135') + `<line x1="40" y1="135" x2="90" y2="135" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>` + red(40, 30, 40, 135) + `<polyline points="40,125 50,125 50,135" fill="none" stroke="${ROSE}" stroke-width="2"/>` + lbl(36, 24, 'A') + lbl(92, 152, 'B') + lbl(222, 152, 'C') + lbl(36, 152, 'H'))
/** İkizkenar üçgende tabana ait kenarortay = açıortay = yükseklik */
const SVG_ISO = svg(220, 160, tri('110,18 30,135 190,135') + red(110, 18, 110, 135) + red(66, 74, 74, 80, 2) + red(146, 80, 154, 74, 2) + red(70, 129, 70, 141, 2) + red(150, 129, 150, 141, 2) + `<polyline points="110,125 120,125 120,135" fill="none" stroke="${ROSE}" stroke-width="2"/>` + lbl(110, 12, 'A') + lbl(22, 150, 'B') + lbl(198, 150, 'C') + lbl(112, 153, 'D'))
/** Kâğıt katlama: B köşesi C’nin üzerine katlanınca oluşan kat izi */
const SVG_FOLD = svg(220, 170, tri('80,22 20,135 200,135') + `<line x1="110" y1="40" x2="110" y2="150" stroke="#6366f1" stroke-width="2.5" stroke-dasharray="6 4"/>` + `<path d="M30 148 Q110 172 190 148" fill="none" stroke="#f97316" stroke-width="2"/><path d="M181 144 l9 4 l-6 7" fill="none" stroke="#f97316" stroke-width="2"/>` + lbl(80, 15, 'A') + lbl(12, 148, 'B') + lbl(208, 148, 'C') + lbl(116, 52, 'kat izi', 'start'))
/** [AB]'nin orta dikmesi d ve üzerindeki P noktası */
const SVG_PERP_P = svg(240, 160, `<line x1="30" y1="110" x2="210" y2="110" stroke="${INK}" stroke-width="3"/>` + red(120, 10, 120, 150) + `<polyline points="120,100 130,100 130,110" fill="none" stroke="${ROSE}" stroke-width="2"/>` + red(75, 104, 75, 116, 2) + red(165, 104, 165, 116, 2) + `<line x1="120" y1="35" x2="30" y2="110" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/><line x1="120" y1="35" x2="210" y2="110" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/><circle cx="120" cy="35" r="4.5" fill="${INK}"/><circle cx="30" cy="110" r="4" fill="${INK}"/><circle cx="210" cy="110" r="4" fill="${INK}"/>` + lbl(24, 128, 'A') + lbl(216, 128, 'B') + lbl(130, 32, 'P', 'start') + lbl(128, 148, 'd', 'start'))
/** AOB açısı ve açıortayı [OC */
const SVG_ANGLE_BIS = svg(240, 165, `<line x1="20" y1="140" x2="220" y2="140" stroke="${INK}" stroke-width="3"/><line x1="20" y1="140" x2="42.6" y2="12" stroke="${INK}" stroke-width="3"/>` + red(20, 140, 134.9, 43.6) + lbl(62, 128, 'α') + lbl(43, 104, 'α') + lbl(12, 156, 'O') + lbl(216, 158, 'A') + lbl(54, 16, 'B', 'start') + lbl(140, 42, 'C', 'start'))
/** Pergelle orta dikme inşası: A ve B merkezli eş yaylar K ve L’de kesişir */
const SVG_PERP_BUILD = svg(240, 170, `<line x1="50" y1="85" x2="190" y2="85" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="85" r="4" fill="${INK}"/><circle cx="190" cy="85" r="4" fill="${INK}"/>` +
  `<path d="M120 20 A95 95 0 0 1 120 150" fill="none" stroke="#6366f1" stroke-width="2"/><path d="M120 20 A95 95 0 0 0 120 150" fill="none" stroke="#f97316" stroke-width="2"/>` +
  red(120, 8, 120, 162, 2.5) + lbl(42, 104, 'A') + lbl(198, 104, 'B') + lbl(128, 22, 'K', 'start') + lbl(128, 160, 'L', 'start'))
/** Dikey ekseni 90'dan başlayan yanıltıcı sütun grafiği */
const SVG_MISLEADING = svg(220, 165, `<line x1="40" y1="12" x2="40" y2="140" stroke="${INK}" stroke-width="2"/><line x1="40" y1="140" x2="210" y2="140" stroke="${INK}" stroke-width="2"/>` +
  [90, 92, 94, 96, 98, 100].map((v) => { const y = 140 - (v - 90) * 12; return `<line x1="36" y1="${y}" x2="40" y2="${y}" stroke="${INK}" stroke-width="2"/><text x="32" y="${y + 4}" font-size="11" font-weight="700" fill="${INK}" text-anchor="end">${v}</text>` }).join('') +
  `<rect x="70" y="116" width="40" height="24" fill="#818cf8" stroke="${INK}" stroke-width="2"/><rect x="140" y="68" width="40" height="72" fill="#f97316" stroke="${INK}" stroke-width="2"/>` + lbl(90, 157, 'A Marketi') + lbl(160, 157, 'B Marketi'))
/** Aynı veriler, eksen 0'dan başlıyor */
const SVG_HONEST = svg(220, 165, `<line x1="40" y1="12" x2="40" y2="140" stroke="${INK}" stroke-width="2"/><line x1="40" y1="140" x2="210" y2="140" stroke="${INK}" stroke-width="2"/>` +
  [0, 20, 40, 60, 80, 100].map((v) => { const y = 140 - v * 1.2; return `<line x1="36" y1="${y}" x2="40" y2="${y}" stroke="${INK}" stroke-width="2"/><text x="32" y="${y + 4}" font-size="11" font-weight="700" fill="${INK}" text-anchor="end">${v}</text>` }).join('') +
  `<rect x="70" y="${140 - 92 * 1.2}" width="40" height="${92 * 1.2}" fill="#818cf8" stroke="${INK}" stroke-width="2"/><rect x="140" y="${140 - 96 * 1.2}" width="40" height="${96 * 1.2}" fill="#f97316" stroke="${INK}" stroke-width="2"/>` + lbl(90, 157, 'A Marketi') + lbl(160, 157, 'B Marketi'))
/** Resim grafiğinde simgenin hem eni hem boyu büyütülmüş (yanıltıcı) */
const SVG_BIG_ICON = svg(220, 130, `<rect x="30" y="80" width="30" height="30" fill="#22c55e" stroke="${INK}" stroke-width="2"/><rect x="120" y="50" width="60" height="60" fill="#22c55e" stroke="${INK}" stroke-width="2"/>` + lbl(45, 126, '2023: 100 fidan') + lbl(150, 126, '2024: 200 fidan'))
/** Daire dilimlerinin yeniden dizilmesi */
const SVG_CIRCLE_RECT = svg(220, 105, `<polygon points="20,80 40,20 200,20 180,80" fill="#e0e7ff" stroke="none"/><polyline points="20,80 40,20 60,80 80,20 100,80 120,20 140,80 160,20 180,80 200,20" fill="none" stroke="${INK}" stroke-width="2"/><line x1="40" y1="20" x2="200" y2="20" stroke="${INK}" stroke-width="2.5"/><line x1="20" y1="80" x2="180" y2="80" stroke="${INK}" stroke-width="2.5"/>` + lbl(120, 14, 'π · r') + lbl(100, 98, 'π · r') + lbl(24, 54, 'r', 'end'))
/** Daire 8 eş dilime bölünmüş */
const SVG_CIRCLE_8 = svg(130, 130, `<circle cx="65" cy="65" r="55" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5"/>` + [0, 45, 90, 135].map((d) => { const a = (d * Math.PI) / 180; return `<line x1="${(65 + 55 * Math.cos(a)).toFixed(1)}" y1="${(65 + 55 * Math.sin(a)).toFixed(1)}" x2="${(65 - 55 * Math.cos(a)).toFixed(1)}" y2="${(65 - 55 * Math.sin(a)).toFixed(1)}" stroke="${INK}" stroke-width="2"/>` }).join('') + `<line x1="65" y1="65" x2="120" y2="65" stroke="${ROSE}" stroke-width="3"/>` + txt(92, 60, 'r', 'middle', 13, ROSE))
/** Daire ve çevresindeki kare (4 tane r × r kare) */
const SVG_CIRCLE_SQUARES = svg(140, 140, `<rect x="10" y="10" width="120" height="120" fill="#fde68a" stroke="${INK}" stroke-width="2"/><line x1="70" y1="10" x2="70" y2="130" stroke="${INK}" stroke-width="1.5"/><line x1="10" y1="70" x2="130" y2="70" stroke="${INK}" stroke-width="1.5"/><circle cx="70" cy="70" r="60" fill="#c7d2fe" fill-opacity="0.85" stroke="${INK}" stroke-width="2.5"/><line x1="70" y1="70" x2="130" y2="70" stroke="${ROSE}" stroke-width="3"/>` + txt(100, 64, 'r', 'middle', 13, ROSE))
/** Köşegenleri 12 cm ve 8 cm olan eşkenar dörtgen */
const SVG_RHOMBUS = svg(240, 160, `<polygon points="30,80 120,20 210,80 120,140" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><line x1="30" y1="80" x2="210" y2="80" stroke="${ROSE}" stroke-width="2" stroke-dasharray="6 4"/><line x1="120" y1="20" x2="120" y2="140" stroke="${ROSE}" stroke-width="2" stroke-dasharray="6 4"/><polyline points="120,70 130,70 130,80" fill="none" stroke="${INK}" stroke-width="1.5"/>` + lbl(85, 74, '12 cm') + lbl(114, 112, '8 cm', 'end'))
/** Eşkenar dörtgen, kenarları köşegenler kadar olan dikdörtgenin içinde */
const SVG_RHOMBUS_RECT = svg(240, 160, `<rect x="30" y="20" width="180" height="120" fill="#fef3c7" stroke="${INK}" stroke-width="2" stroke-dasharray="6 4"/><polygon points="30,80 120,20 210,80 120,140" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><line x1="30" y1="80" x2="210" y2="80" stroke="${ROSE}" stroke-width="2"/><line x1="120" y1="20" x2="120" y2="140" stroke="${ROSE}" stroke-width="2"/>` + lbl(165, 74, 'e') + lbl(128, 115, 'f', 'start'))
/** İki eş yamuk birleşince paralelkenar */
const SVG_TRAP_DOUBLE = svg(300, 120, `<polygon points="10,100 150,100 120,30 50,30" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="150,100 220,100 260,30 120,30" fill="#fed7aa" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` + lbl(85, 24, 'c') + lbl(80, 116, 'a') + lbl(190, 24, 'a') + lbl(185, 116, 'c') + `<line x1="50" y1="30" x2="50" y2="100" stroke="${ROSE}" stroke-width="2" stroke-dasharray="5 4"/>` + lbl(56, 70, 'h', 'start'))
/** Dikdörtgenler prizmasının açınımı (6 cm × 4 cm × 2 cm) */
const SVG_NET = svg(250, 140, [
  [38, 10, 84, 28, '6×2'], [10, 38, 28, 56, '2×4'], [38, 38, 84, 56, '6×4'], [122, 38, 28, 56, '2×4'], [150, 38, 84, 56, '6×4'], [38, 94, 84, 28, '6×2'],
].map(([x, y, w, h, t]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e0e7ff" stroke="${INK}" stroke-width="2"/><text x="${Number(x) + Number(w) / 2}" y="${Number(y) + Number(h) / 2 + 5}" font-size="13" font-weight="700" fill="${INK}" text-anchor="middle">${t}</text>`).join(''))
/** Küp açınımı (ayrıt 3 cm) */
const SVG_NET_CUBE = svg(210, 160, [[60, 10], [15, 55], [60, 55], [105, 55], [150, 55], [60, 100]].map(([x, y]) => `<rect x="${x}" y="${y}" width="45" height="45" fill="#fde68a" stroke="${INK}" stroke-width="2"/>`).join('') + txt(82, 82, '3×3'))

/** Yansıma soruları için şekiller */
const L_SHAPE = ['1,1', '1,2', '1,3', '2,3', '3,3']
const T_SHAPE = ['1,1', '2,1', '3,1', '1,2', '1,3']
const P1 = ['1,1', '2,1', '3,1', '3,2', '3,3']
const P2 = ['0,2', '1,2', '2,2', '3,2', '1,1', '1,3']
const Q1 = ['1,1', '1,2', '2,2', '3,2', '4,3']
const Q2 = ['2,0', '3,0', '2,1', '2,2', '2,3', '3,3']

const CMP = ['<', '=', '>']

/** 7. SINIF ETKİNLİKLERİ */
export const grade7: Activity[] = [
  // ── Sayılar ve Nicelikler (1) ───────────────────────────────────────────

  // MAT.7.1.1
  {
    id: 'g7-sayi-dogrusunda-rasyonel',
    outcomes: ['MAT.7.1.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusunda yer bul',
    instructions: 'Her durumu bir sayıyla düşün ve sayı doğrusunda işaretle. 0 senin başlangıç noktan.',
    level: 1,
    launch: {
      text: 'Termometrede 0, deniz seviyesinde 0, asansörde zemin kat… Hepsinde 0’ın bir altı ve bir üstü var. Peki “2 ile çarpınca 1 eden sayı” sayı doğrusunun neresinde?',
      visual: vLine(-4, 4, [{ v: -2, t: 'Kars, sabah' }], ' °C'),
    },
    reflect: '−2 ile [[1/2]] sayılarının ikisi de doğal sayı değil. Bu iki sayıyı birbirinden ayıran nedir? Bir arkadaşına anlat.',
    tool: 'numberline',
    config: { min: -3, max: 3, step: 0.25 },
    tasks: [
      { prompt: 'Kars’ta sabah sıcaklık sıfırın 2 derece altındaydı. Bu sıcaklığı işaretle.', target: { value: -2 }, hints: ['“Sıfırın altı”, sayı doğrusunda 0’ın hangi tarafında?'], explain: 'Sıfırın altındaki değerler 0’ın solunda, negatif sayılarla gösterilir: −2.' },
      { prompt: 'Zemin kat 0 kabul ediliyor. Asansör zemin kattan 3 kat aşağı indi. Asansörün bulunduğu katı işaretle.', target: { value: -3 }, hints: ['Aşağı inmek 0’dan hangi yöne gitmek demek?'] },
      { prompt: '2 · ? = 1 eşitliğinde ? yerine gelen sayıyı işaretle.', target: { value: 0.5 }, hints: ['? yerine 0 yazınca sonuç kaç, 1 yazınca kaç?', '0 ile 1 arasını iki eş parçaya bölersen ilk parça nerede biter?'], explain: 'Hiçbir tam sayı bu eşitliği sağlamaz; [[1/2]] sağlar. Tam sayılar yetmeyince rasyonel sayılara ihtiyaç duyarız.' },
      { prompt: 'Bir dalgıç deniz seviyesinin [[3/4]] m altında. Dalgıcın konumunu işaretle.', target: { value: -0.75 }, hints: ['0 ile −1 arasını kaç eş parçaya bölmen gerekir?', 'Bu parçalardan kaç tanesi kadar sola gitmelisin?'], explain: '−[[3/4]], 0 ile −1 arasındadır; tıpkı [[3/4]]’ün 0 ile 1 arasında olması gibi, ama 0’ın öbür yanında.' },
    ],
  },
  {
    id: 'g7-mutlak-deger',
    outcomes: ['MAT.7.1.1'],
    type: 'fill',
    stage: 'model',
    title: 'Mutlak değer: 0’a uzaklık',
    instructions: 'Bir sayının mutlak değeri, sayı doğrusunda 0’a olan uzaklığıdır. Uzaklık hiçbir zaman negatif olmaz.',
    level: 1,
    launch: {
      text: 'Bir kahve fabrikasında 100 g’lık paketleri iki makine dolduruyor. A makinesi 103 g, B makinesi 96 g koyuyor. Hangi makine daha çok hata yapıyor?',
    },
    reflect: 'B makinesinin hatası “−4 g” mi yoksa “4 g” mi? Hatayı söylerken neden mutlak değeri kullanırız?',
    items: [
      { text: '−4 sayısı 0’a __ birim uzaklıktadır. Yani |−4| = __', answers: ['4', '4'], visual: { kind: 'numberline', min: -5, max: 5, step: 1, points: [-4] }, hints: ['0’dan −4’e kadar kaç adım atarsın?'] },
      { text: '|[[3/5]]| = __', answers: ['3/5|0,6|6/10'], visual: { kind: 'numberline', min: -1, max: 1, step: 0.2, points: [0.6] }, hints: ['[[3/5]], 0’ın sağında mı solunda mı? 0’a uzaklığı kaç?'] },
      { text: '0’a uzaklığı 6 birim olan negatif sayı __', answers: ['-6'], hints: ['Negatif sayılar 0’ın hangi tarafında?'] },
      { text: 'Helikopter hastanenin 3 km batısında (−3), ambulans 5 km doğusunda (+5). Uzaklıkları: |−3| = __ km, |+5| = __ km', answers: ['3', '5'], hints: ['Uzaklıkta yön önemli mi?'], explain: 'Ambulans hastaneye daha uzaktır. Negatif işaret yalnız yönü söyler, uzaklığı değil.' },
      { text: 'A makinesinin hatası |103 − 100| = __ g, B makinesinin hatası |96 − 100| = __ g', answers: ['3', '4'], hints: ['96 − 100 kaç eder? Bu sayının 0’a uzaklığı kaç?'], explain: 'B daha çok hata yapıyor: 4 g eksik koymak, 3 g fazla koymaktan daha büyük bir hatadır.' },
      { text: '|−2,5| + |1,5| = __', answers: ['4'], hints: ['Önce her sayının 0’a uzaklığını bul.'] },
      { text: 'Mutlak değeri 7 olan iki sayı vardır: 7 ve __', answers: ['-7'], visual: { kind: 'numberline', min: -8, max: 8, step: 1, points: [7] }, hints: ['0’dan 7 birim sola gidersen hangi sayıya varırsın?'] },
    ],
  },
  {
    id: 'g7-sayi-kumeleri',
    outcomes: ['MAT.7.1.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Hangi sayı ailesi?',
    instructions: 'Her sayıyı ait olduğu en dar gruba sürükle. Önce sadeleştirmeyi dene!',
    level: 2,
    launch: {
      text: 'Doğal sayılar tam sayıların içinde, tam sayılar da rasyonel sayıların içinde yer alır; iç içe kutular gibi. [[18/3]] kesir gibi görünüyor ama hangi kutuya girer?',
    },
    reflect: '“Her tam sayı bir rasyonel sayıdır.” cümlesini bir örnekle nasıl gösterirsin?',
    categories: [
      { id: 'dogal', label: 'Doğal sayı', color: '#22c55e' },
      { id: 'tam', label: 'Tam sayı (doğal sayı değil)', color: '#3b82f6' },
      { id: 'rasyonel', label: 'Rasyonel sayı (tam sayı değil)', color: '#a855f7' },
    ],
    items: [
      { content: '12', category: 'dogal' },
      { content: '0', category: 'dogal', explain: '0 bir doğal sayıdır; aynı zamanda tam sayı ve rasyonel sayıdır.' },
      { content: '[[18/3]]', category: 'dogal', explain: '[[18/3]] = 6; kesir gibi yazılmış bir doğal sayı.' },
      { content: '−7', category: 'tam' },
      { content: '−[[12/4]]', category: 'tam', explain: '−[[12/4]] = −3; negatif bir tam sayı.' },
      { content: '−1', category: 'tam' },
      { content: '[[3/4]]', category: 'rasyonel' },
      { content: '−2,5', category: 'rasyonel', explain: '−2,5 = −[[5/2]]; iki tam sayının bölümü ama tam sayı değil.' },
      { content: '0,125', category: 'rasyonel', explain: '0,125 = [[1/8]]' },
      { content: '−[[5/3]]', category: 'rasyonel' },
    ],
  },
  {
    id: 'g7-tam-sayilar-hayatta',
    outcomes: ['MAT.7.1.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hayatın içindeki sayılar',
    instructions: 'Durumu oku, hangi sayının ya da ifadenin onu anlattığına karar ver.',
    level: 1,
    launch: {
      text: 'Haber bülteninde “Erzurum’da hava eksi 12 derece” denildi. Aynı gün bir dalgıç “eksi 20 metreye indim” dedi. Bu iki “eksi” aynı şeyi mi anlatıyor?',
    },
    reflect: 'Sıcaklıkta 0 “hiç sıcaklık yok” demek değil. Hayatta başka hangi durumlarda 0 seçilmiş bir başlangıç noktasıdır?',
    questions: [
      { prompt: 'Kars’ta sabah hava sıcaklığı sıfırın altında 4 °C ölçüldü. Bu sıcaklık hangi sayıyla gösterilir?', choices: ['−4 °C', '+4 °C', '0 °C', '−[[1/4]] °C'], answer: 0, feedback: [null, 'Henüz değil: “sıfırın altı” 0’ın aşağısıdır; pozitif sayılar 0’ın üstünü gösterir.', '0 °C başlangıç noktasıdır; biz onun 4 derece aşağısını arıyoruz.', 'Sıcaklık 4 tam derece aşağıda; kesir değil, tam sayı.'] },
      { prompt: 'Zemin kat 0 kabul ediliyor. Asansör zemin kattan 3 kat aşağı iniyor. Asansör kaçıncı kattadır?', choices: ['3. kat', '−3. kat', '0. kat', '−2. kat'], answer: 1, feedback: ['3. kat zeminin üstündedir; asansör aşağı indi.', null, 'Asansör zemin katta kalmadı, 3 kat indi.', 'Zeminden 3 kat aşağı sayalım: −1, −2, −3.'] },
      { prompt: 'Mehmet’in arkadaşına 50 TL borcu var. Mehmet’in bu durumunu en iyi gösteren sayı hangisidir?', choices: ['+50', '0', '−50', '50,5'], answer: 2, feedback: ['+50, 50 TL’si olduğunu anlatır; borç ise eksi yöndedir.', '0 borcu da parası da olmadığını gösterir.', null, 'Borç 50 TL; virgüllü bir kısım yok, işaret de eksik.'] },
      { prompt: 'Aşağıdakilerden hangisi bir rasyonel sayı DEĞİLDİR?', choices: ['−[[3/7]]', '0', '2,4', '[[5/0]]'], answer: 3, feedback: ['−[[3/7]] = (−3) ÷ 7; iki tam sayının bölümü, rasyoneldir.', '0 = [[0/1]]; rasyoneldir.', '2,4 = [[24/10]]; rasyoneldir.', null], explain: 'a/b biçiminde yazılan sayılarda b sıfırdan farklı olmalıdır. 5’i 0 eş parçaya bölemeyiz.' },
      { prompt: '−[[3/4]] rasyonel sayısına eşit olan hangisidir?', choices: ['(−3) ÷ 4', '[[3/4]]', '(−3) ÷ (−4)', '−[[4/3]]'], answer: 0, feedback: [null, '[[3/4]] pozitif; −[[3/4]] ise 0’ın öbür tarafında.', 'İki negatif sayının bölümü pozitiftir: (−3) ÷ (−4) = [[3/4]].', 'Pay ile payda yer değiştirince sayı değişir: [[4/3]] 1’den büyüktür.'] },
      { prompt: 'Hangi ifade her zaman doğrudur?', choices: ['Her rasyonel sayı bir tam sayıdır.', 'Her tam sayı bir rasyonel sayıdır.', '0 bir rasyonel sayı değildir.', 'Negatif sayılar rasyonel sayı değildir.'], answer: 1, feedback: ['[[1/2]] rasyonel ama tam sayı değil.', null, '0 = [[0/5]] gibi yazılabilir; rasyoneldir.', '−[[1/2]] = (−1) ÷ 2; negatif rasyonel sayılar da vardır.'], explain: 'Her tam sayı paydası 1 olan bir rasyonel sayıdır: −5 = (−5) ÷ 1 gibi.' },
      { prompt: 'Termometrede 0 °C için hangisi doğrudur?', choices: ['Suyun donma noktası olarak seçilmiş bir başlangıçtır; daha soğuk sıcaklıklar da vardır.', 'Hiç sıcaklık olmadığını gösterir.', 'Negatif sıcaklık olamayacağını gösterir.', 'Ölçülebilecek en yüksek sıcaklıktır.'], answer: 0, feedback: [null, '0 °C’de su donar ama hava yine ölçülür; 0 burada bir başlangıç noktasıdır.', 'Kışın −15 °C gibi sıcaklıklar ölçülür.', '0 °C yazın ölçülen sıcaklıklardan çok düşüktür.'] },
    ],
  },

  // MAT.7.1.2
  {
    id: 'g7-bolerek-ondalik',
    outcomes: ['MAT.7.1.2'],
    type: 'fill',
    stage: 'model',
    title: 'Böl ve ondalığa çevir',
    instructions: 'Kesir çizgisi bir bölmedir. Payı paydaya böl ya da paydayı 10, 100, 1000 yapacak bir denk kesir bul.',
    level: 1,
    launch: {
      text: 'Bir kurdeleyi 8 eş parçaya böldük ve 1 parçasını aldık. Kurdele 1 m ise parçayı metre cinsinden virgüllü nasıl yazarız?',
      visual: { kind: 'fraction', num: 1, den: 8, shape: 'bar' },
    },
    reflect: '[[1/8]] bölmesi bir yerde bitti ama [[1/3]] bölmesi hiç bitmedi. Sence bunun nedeni ne olabilir?',
    items: [
      { text: '[[1/4]] = 1 ÷ 4 = __', answers: ['0,25'], visual: { kind: 'fraction', num: 1, den: 4, shape: 'bar' }, hints: ['1 TL’yi 4 kişi paylaşırsa her biri kaç kuruş alır?'] },
      { text: '[[3/5]] = [[6/10]] = __', answers: ['0,6'], visual: { kind: 'fraction', num: 3, den: 5, shape: 'bar' }, hints: ['Paydayı 10 yapmak için 5’i kaç ile çarparsın? Payı da aynı sayıyla çarp.'] },
      { text: '[[1/8]] = [[125/1000]] = __', answers: ['0,125'], hints: ['8 · 125 = 1000. Payda 1000 olunca kaç binde bir eder?'] },
      { text: '[[7/4]] = 7 ÷ 4 = __', answers: ['1,75'], hints: ['7’nin içinde kaç tane 4 var? Kalan [[3/4]]’ü ondalığa çevir.'] },
      { text: '−[[3/4]] = __', answers: ['-0,75'], hints: ['Önce [[3/4]]’ü ondalığa çevir, sonra işareti koru.'] },
      { text: '[[1/3]] = 1 ÷ 3 = 0,333… Bu bölmede her adımda kalan hep __ oluyor.', answers: ['1'], hints: ['Bölmeyi elle yap: 10 ÷ 3 kaç, kalan kaç? Sonra yine 10 ÷ 3…'] },
      { text: '[[2/9]] = 0,222… Bu gösterimde devreden rakam __', answers: ['2'], hints: ['Virgülden sonra hangi rakam tekrar ediyor?'] },
      { text: '[[5/11]] = 0,4545… Burada devreden iki basamaklı blok __', answers: ['45'], hints: ['Hangi iki rakam sırayla tekrar ediyor?'] },
    ],
  },
  {
    id: 'g7-ondalik-gosterim-eslestir',
    outcomes: ['MAT.7.1.2'],
    type: 'match',
    stage: 'sembol',
    title: 'Kesir ↔ ondalık gösterim',
    instructions: 'Her rasyonel sayıyı ondalık gösterimiyle eşleştir. Önce tahmin et: 1’den büyük mü, [[1/2]]’den büyük mü? “…” devreden basamakları gösterir.',
    level: 2,
    launch: {
      text: 'Market fişinde “0,75 kg” yazıyor, tarifte “[[3/4]] kg”. Aynı miktar mı? Bir sayının birçok yazılışı olabilir.',
    },
    reflect: 'Hesap yapmadan [[5/6]]’nın 0,5’ten büyük olduğunu nasıl anlarsın?',
    perRound: 4,
    pairs: [
      { left: '[[1/8]]', right: '0,125' },
      { left: '[[2/5]]', right: '0,4' },
      { left: '[[7/4]]', right: '1,75' },
      { left: '−[[3/5]]', right: '−0,6' },
      { left: '[[1/3]]', right: '0,333…' },
      { left: '[[5/6]]', right: '0,8333…' },
      { left: '[[4/9]]', right: '0,444…' },
      { left: '[[3/4]]', right: '0,75' },
    ],
  },
  {
    id: 'g7-sonlu-mu-devirli-mi',
    outcomes: ['MAT.7.1.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Sonlu mu, devirli mi?',
    instructions: 'Payı paydaya böl: Bölme bir yerde bitiyorsa sonlu, aynı kalanlar dönüp duruyorsa devirli. Sadeleştirmeyi unutma!',
    level: 2,
    launch: {
      text: 'Bazı bölmeler bir yerde biter, bazıları sonsuza kadar aynı rakamları tekrarlar. Bir kesre bakıp bölmeden tahmin edebilir misin?',
    },
    reflect: 'Sonlu gruptaki kesirlerin paydalarında ortak bir şey fark ettin mi? Paydayı 10, 100, 1000 yapabilmekle ilgisi ne?',
    categories: [
      { id: 'sonlu', label: 'Sonlu ondalık gösterim', color: '#22c55e' },
      { id: 'devirli', label: 'Devirli ondalık gösterim', color: '#f97316' },
    ],
    items: [
      { content: '[[1/4]]', category: 'sonlu', explain: '[[1/4]] = [[25/100]] = 0,25' },
      { content: '[[3/5]]', category: 'sonlu', explain: '[[3/5]] = [[6/10]] = 0,6' },
      { content: '[[7/8]]', category: 'sonlu', explain: '[[7/8]] = [[875/1000]] = 0,875' },
      { content: '[[9/20]]', category: 'sonlu', explain: '[[9/20]] = [[45/100]] = 0,45' },
      { content: '[[3/12]]', category: 'sonlu', explain: 'Sadeleştir: [[3/12]] = [[1/4]] = 0,25. Paydadaki 3 sadeleşince kayboldu.' },
      { content: '[[1/3]]', category: 'devirli', explain: '1 ÷ 3 = 0,333…; kalan hep 1.' },
      { content: '[[5/6]]', category: 'devirli', explain: '5 ÷ 6 = 0,8333…' },
      { content: '[[2/9]]', category: 'devirli', explain: '2 ÷ 9 = 0,222…' },
      { content: '[[4/11]]', category: 'devirli', explain: '4 ÷ 11 = 0,3636…' },
      { content: '[[7/12]]', category: 'devirli', explain: '7 ÷ 12 = 0,58333…; 12’nin içindeki 3, paydayı 10’un kuvveti yapmamıza izin vermez.' },
    ],
  },
  {
    id: 'g7-ondalik-hayatta',
    outcomes: ['MAT.7.1.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Fişte, tabelada, hesap makinesinde',
    instructions: 'Gerçek yaşam durumlarında ondalık gösterimleri yorumla.',
    level: 2,
    launch: {
      text: 'Üç arkadaş 10 TL’lik hesabı eşit paylaşmak istiyor. Hesap makinesi 3,3333333 gösteriyor ve ekran bitiyor. Bölme gerçekten orada mı bitti?',
    },
    reflect: '0,999… sayısının 1’e eşit olup olmadığını bir arkadaşınla tartış. Hangi gerekçe seni daha çok ikna etti?',
    questions: [
      { prompt: '10 TL’yi 3 kişi eşit paylaşıyor. Hesap makinesindeki 3,3333… ne anlatır?', choices: ['Bölme hiç bitmiyor; her kişi yaklaşık 3,33 TL öder, 1 kuruş artar.', 'Hesap makinesi bozuktur.', 'Her kişi tam 3,3 TL öder.', 'Bu sayı rasyonel değildir.'], answer: 0, feedback: [null, 'Makine doğru; 10 ÷ 3 bölmesinde hep 1 kalanı geldiği için 3 rakamı sonsuza kadar tekrar eder.', '3 · 3,3 = 9,9 TL eder; 10 kuruş eksik kalır.', '[[10/3]] iki tam sayının bölümüdür, yani rasyoneldir; devirli olması bunu değiştirmez.'] },
      { prompt: 'Ali [[3/8]] kg peynir aldı. Terazi bu miktarı nasıl gösterir?', choices: ['0,375 kg', '0,38 kg', '3,8 kg', '2,666… kg'], answer: 0, feedback: [null, 'Bu yuvarlanmış hâli; [[3/8]] tam olarak 0,375’tir.', '3 ÷ 8 bir bütünden küçüktür; 3,8 kg bir bütünden çok büyük.', 'Pay ile paydayı karıştırma: 3 ÷ 8 istiyoruz, 8 ÷ 3 değil.'] },
      { prompt: 'Hangi kesrin ondalık gösterimi devirlidir?', choices: ['[[3/40]]', '[[7/25]]', '[[5/12]]', '[[9/16]]'], answer: 2, feedback: ['[[3/40]] = [[75/1000]] = 0,075; bölme biter.', '[[7/25]] = [[28/100]] = 0,28; bölme biter.', null, '[[9/16]] = 0,5625; paydası yalnız 2’lerden oluşuyor, bölme biter.'] },
      { prompt: '0,999… sayısı ile 1 için hangisi doğrudur?', choices: ['Eşittir: [[1/3]] = 0,333… ise 3 · [[1/3]] = 0,999… = 1 olur.', '0,999… 1’den biraz küçüktür.', '0,999… bir sayı değildir.', '0,999… 1’den büyüktür.'], answer: 0, feedback: [null, 'Aralarına bir sayı yerleştirmeyi dene: bulamazsın. Aralarında hiç sayı yoksa eşittirler.', 'Devirli gösterimler de sayıdır; her biri bir rasyonel sayıya karşılık gelir.', 'Hiçbir basamağı 1’i geçmiyor; 1’den büyük olamaz.'] },
      { prompt: 'Bir sporcunun 100 m süresi [[12 1/4]] saniye. Elektronik tabelada nasıl yazar?', choices: ['12,25 sn', '12,4 sn', '12,14 sn', '12,025 sn'], answer: 0, feedback: [null, '[[1/4]] = 0,4 değil; 1 ÷ 4 = 0,25.', '[[1/4]] = 0,14 değil; 1’i 4’e böl.', '[[1/4]] yüzde 25’tir: 0,25. 0,025 binde 25 olurdu.'] },
      { prompt: 'Hangisi 0,6’ya eşit DEĞİLDİR?', choices: ['[[3/5]]', '[[6/10]]', '[[60/100]]', '[[2/3]]'], answer: 3, feedback: ['[[3/5]] = [[6/10]] = 0,6', '[[6/10]] altı onda birdir: 0,6', '[[60/100]] = 0,60 = 0,6', null], explain: '[[2/3]] = 0,666…; 0,6’dan biraz büyüktür.' },
    ],
  },

  // MAT.7.1.3
  {
    id: 'g7-arada-sayi-var-mi',
    outcomes: ['MAT.7.1.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Arada sayı var mı?',
    instructions: 'Sayı doğrusunda istenen noktayı işaretle. Soldaki sayı her zaman daha küçüktür.',
    level: 2,
    launch: {
      text: '−4 ile −5 arasında hiç tam sayı yok. Peki hiç sayı yok mu? Ya [[3/5]] ile [[4/5]] arasında?',
    },
    reflect: 'İki rasyonel sayı ne kadar yakın olursa olsun, aralarına her zaman bir sayı sığar mı? Nasıl bulursun?',
    tool: 'numberline',
    config: { min: -2, max: 2, step: 0.1 },
    tasks: [
      { prompt: '−1 ile −2’nin tam ortasındaki sayıyı işaretle.', target: { value: -1.5 }, hints: ['−1 ile −2 arası kaç birim? Yarısı kaç?'] },
      { prompt: '[[3/5]] ile [[4/5]] arasında kalan bir sayı var. Tam ortadakini işaretle.', target: { value: 0.7 }, hints: ['[[3/5]] = [[6/10]] ve [[4/5]] = [[8/10]]. Arada hangi onda birlik var?'], explain: 'Parçaları küçültünce (beşte birlerden onda birlere) arada yeni sayılar belirir. İki rasyonel sayı arasında her zaman bir rasyonel sayı vardır.' },
      { prompt: '−0,3 ile −0,5 arasındaki sayıyı işaretle.', target: { value: -0.4 }, hints: ['Önce −0,3 ve −0,5’i bul. Hangisi daha solda?'] },
      { prompt: '−[[6/5]] sayısını işaretle.', target: { value: -1.2 }, hints: ['[[6/5]], 1’den ne kadar büyük?', '−1’den [[1/5]] = 0,2 kadar daha sola git.'] },
    ],
  },
  {
    id: 'g7-referansla-karsilastir',
    outcomes: ['MAT.7.1.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Referans sayılarla karşılaştır',
    instructions: 'Sayı doğrusunu ve −1, −[[1/2]], 0 gibi referans sayıları kullan. Kural ezberleme, yerini düşün!',
    level: 2,
    launch: {
      text: 'Ankara’da sabah −5 °C, Eskişehir’de −2 °C. Selin “5, 2’den büyük; o hâlde −5 daha sıcak” diyor. Sen ne dersin?',
      visual: vLine(-6, 2, [{ v: -2, t: 'Eskişehir' }, { v: -5, t: 'Ankara' }], ' °C'),
    },
    reflect: 'Selin’e −5 ile −2’yi karşılaştırmayı nasıl anlatırsın? Termometre mi, sayı doğrusu mu, borç örneği mi seçerdin?',
    questions: [
      { prompt: { text: 'Hangisi daha büyük?', visual: { kind: 'numberline', min: -6, max: 1, step: 1, points: [-5, -2] } }, choices: ['−2', '−5'], answer: 0, feedback: [null, '5 > 2 olduğu için −5 > −2 sanabilirsin; ama −5, 0’ın daha solunda. Sayı doğrusunda sağdaki sayı daha büyüktür.'] },
      { prompt: 'Hava −3 °C’den −8 °C’ye döndü. Hangisi daha soğuk?', choices: ['−8 °C', '−3 °C'], answer: 0, feedback: [null, '−3 °C, 0’a daha yakın; −8 °C ise 0’ın çok daha altında, yani daha soğuk.'] },
      { prompt: { text: '−[[3/4]] ile −[[1/2]] arasında hangi ilişki var?', visual: { kind: 'numberline', min: -1, max: 0, step: 0.25, points: [-0.75, -0.5] } }, choices: ['−[[3/4]] < −[[1/2]]', '−[[3/4]] > −[[1/2]]', '−[[3/4]] = −[[1/2]]'], answer: 0, feedback: [null, '[[3/4]] > [[1/2]] doğru; ama negatiflerde 0’dan daha uzak olan daha küçüktür.', 'İki sayı sayı doğrusunda farklı noktalarda duruyor.'] },
      { prompt: '−[[7/8]] hangi referans sayıya en yakındır?', choices: ['−1', '−[[1/2]]', '0'], answer: 0, feedback: [null, '−[[7/8]] ile −1 arasında yalnız [[1/8]] var; −[[1/2]]’ye uzaklığı [[3/8]].', '0’a uzaklığı [[7/8]]; −1’e çok daha yakın.'] },
      { prompt: '−[[2/3]] mü daha büyük, −[[3/4]] mü? İkisinin de −1’e uzaklığını düşün.', choices: ['−[[2/3]]', '−[[3/4]]'], answer: 0, feedback: [null, '−[[3/4]], −1’e yalnız [[1/4]] uzak; −[[2/3]] ise [[1/3]] uzak. −1’e daha yakın olan daha solda, yani daha küçüktür.'], explain: '−1’den daha uzak olan (0’a daha yakın olan) −[[2/3]] daha büyüktür.' },
      { prompt: '−0,5 mi daha büyük, −[[5/8]] mi?', choices: ['−0,5', '−[[5/8]]'], answer: 0, feedback: [null, '[[5/8]] = 0,625 > 0,5. Negatiflerde 0’a daha uzak olan daha küçüktür.'] },
      { prompt: 'Hangisi her zaman doğrudur?', choices: ['Her negatif sayı 0’dan küçüktür.', '−0,1 < −1', 'Bir sayının mutlak değeri büyüdükçe sayı da büyür.', '−[[1/2]] < −[[3/4]]'], answer: 0, feedback: [null, '−0,1, 0’a çok yakın; −1 ise daha solda. −0,1 > −1.', 'Negatiflerde tersi olur: |−9| > |−2| ama −9 < −2.', '−[[1/2]], −[[3/4]]’ün sağındadır; −[[1/2]] daha büyük.'] },
    ],
  },
  {
    id: 'g7-rasyonel-karsilastir',
    outcomes: ['MAT.7.1.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Büyük mü, küçük mü?',
    instructions: '<, > ya da = seç. Gerekirse ondalığa çevir ya da bir referans sayıyla karşılaştır.',
    level: 2,
    launch: {
      text: 'Sayı doğrusunu artık zihninde canlandırabilirsin. Her karşılaştırmada önce “Hangisi daha sağda?” diye sor.',
    },
    reflect: 'En zorlandığın karşılaştırma hangisiydi? Hangi strateji işine yaradı: ondalığa çevirmek mi, referans sayı mı, ortak payda mı?',
    items: [
      { text: '−[[3/4]]  __  −[[2/3]]', answers: ['<'], choices: CMP, hints: ['Hangisi −1’e daha yakın?'] },
      { text: '−2,5  __  −2,05', answers: ['<'], choices: CMP, hints: ['Onda birler basamağını karşılaştır. Hangisi 0’dan daha uzak?'] },
      { text: '[[5/8]]  __  0,625', answers: ['='], choices: CMP, hints: ['5’i 8’e bölünce kaç bulursun?'] },
      { text: '−[[1/2]]  __  −[[3/7]]', answers: ['<'], choices: CMP, hints: ['[[3/7]], [[1/2]]’den büyük mü küçük mü? (7’nin yarısı 3,5’tir.)'] },
      { text: '|−3|  __  2', answers: ['>'], choices: CMP, hints: ['Önce |−3|’ün değerini bul.'] },
      { text: '0  __  −[[1/100]]', answers: ['>'], choices: CMP, hints: ['Çok küçük de olsa negatif bir sayı 0’ın hangi tarafında?'] },
      { text: '−[[6/8]]  __  −0,75', answers: ['='], choices: CMP, hints: ['[[6/8]]’i sadeleştir.'] },
      { text: '−1,5  __  −[[7/4]]', answers: ['>'], choices: CMP, hints: ['[[7/4]] = 1,75. Hangisi 0’a daha yakın?'] },
    ],
  },
  {
    id: 'g7-rasyonel-sirala',
    outcomes: ['MAT.7.1.3'],
    type: 'sort',
    stage: 'problem',
    title: 'Sıcaklıklar, derinlikler, kumbaralar',
    instructions: 'Gerçek yaşamdaki değerleri istenen sıraya diz. Gerekirse ondalığa çevir.',
    level: 2,
    launch: {
      text: 'Bir kış sabahı Doğu Anadolu’da sıcaklıklar açıklandı. Haber spikeri en soğuk ilden en sıcağa doğru okuyabilecek mi?',
    },
    reflect: 'Negatif sayıları sıralarken mutlak değerlere bakmak işe yarar mı? Ne zaman yarar, ne zaman yanıltır?',
    rounds: [
      { prompt: 'Sıcaklıkları en soğuktan en sıcağa sırala.', items: ['Kars: −14 °C', 'Erzurum: −12,5 °C', 'Ağrı: −11 °C', 'Ardahan: −9,8 °C', 'Van: −3,5 °C'], ends: ['En soğuk', 'En sıcak'], hints: ['Hangi il 0’dan en uzakta (en aşağıda)?'] },
      { prompt: 'Deniz seviyesine göre konumları en derinden en yükseğe sırala.', items: ['Dalgıç Elif: −12,5 m', 'Dalgıç Can: −[[25/4]] m', 'Şnorkelci: −0,75 m', 'Tekne güvertesi: +1,5 m', 'Martı: +[[15/2]] m'], ends: ['En derin', 'En yüksek'], hints: ['[[25/4]] ve [[15/2]]’yi ondalığa çevir.'] },
      { prompt: 'Bir haftalık kumbara hareketlerini (TL) en büyük kayıptan en büyük kazanca sırala.', items: ['−45,5', '−22,5', '−[[45/4]]', '0', '+12,75'], ends: ['En büyük kayıp', 'En büyük kazanç'], hints: ['−[[45/4]] kaç eder? 45’i 4’e böl.'] },
      { prompt: 'Büyükten küçüğe sırala.', items: ['2,1', '[[7/4]]', '1,07', '−0,9', '−[[19/20]]', '−1'], ends: ['En büyük', 'En küçük'], hints: ['−[[19/20]] = −0,95. −0,9 ile hangisi 0’a daha yakın?'] },
    ],
  },
  {
    id: 'g7-t1-hangisi-farkli',
    outcomes: ['MAT.7.1.3', 'MAT.7.1.1'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Tek bir doğru cevap yok! Birini seç ve neden farklı olduğunu düşün. Sonra diğer gerekçeleri de oku.',
    level: 2,
    launch: {
      text: 'Matematikçiler sayılara farklı “gözlüklerle” bakar: işaretine, tam sayı olup olmadığına, yazılışına… Sen hangi gözlüğü takacaksın?',
    },
    reflect: 'Seçtiğin sayı dışında başka bir sayı için de geçerli bir gerekçe bulabildin mi? Arkadaşının gerekçesi seninkinden farklı mıydı?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['−2', '−[[1/2]]', '0,5', '|−2|'],
        answer: 0,
        reasons: ['Hem negatif hem de tam sayı olan tek sayı.', 'Hem negatif hem de tam sayı olmayan tek sayı.', 'Ondalık gösterimle yazılmış tek sayı.', 'Pozitif bir tam sayı olan tek sayı: |−2| = 2.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['−3', '−[[6/2]]', '−3,5', '−[[7/2]]'],
        answer: 0,
        reasons: ['En sade biçimde, tam sayı olarak yazılmış tek sayı.', 'Kesir olarak yazılmış ama aslında bir tam sayıya (−3) eşit olan tek sayı.', 'Ondalık gösterimle yazılmış tek sayı.', 'Kesir olarak yazılmış ve bir tam sayıya eşit olmayan tek sayı.'],
      },
    ],
  },

  // MAT.7.1.4
  {
    id: 'g7-sayma-pullari',
    outcomes: ['MAT.7.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayma pullarıyla topla ve çıkar',
    instructions: 'Sarı karo +1, kırmızı karo −1’dir. Bir sarı ile bir kırmızı birbirini götürür (sıfır çifti). Sonucu en az karoyla göster.',
    level: 1,
    launch: {
      text: 'Cebinde 5 TL var ama 3 TL borcun da var. Borcunu ödersen elinde kaç TL kalır? Paraları ve borçları pullarla gösterelim.',
      visual: counters(5, 3),
    },
    reflect: '(+2) − (+6) işleminde neden sıfır çiftleri eklemek zorunda kaldın? Sıfır çifti eklemek sayının değerini değiştirir mi?',
    tool: 'algebra',
    tasks: [
      { prompt: '(+5) + (−3): 5 sarı ve 3 kırmızı pul düşün, sıfır çiftlerini at. Kalan pulları göster.', target: { x2: 0, x: 0, c: 2 }, hints: ['Kaç tane sıfır çifti oluşturabilirsin?', 'Sıfır çiftleri gidince hangi renkten kaç pul kalır?'] },
      { prompt: '(−4) + (−2): Hiç sıfır çifti var mı? Sonucu göster.', target: { x2: 0, x: 0, c: -6 }, hints: ['Hepsi aynı renkse birbirini götüren pul olur mu?'] },
      { prompt: '(+3) + (−7) toplamını göster.', target: { x2: 0, x: 0, c: -4 }, hints: ['3 sıfır çifti oluşur. Geriye ne kalır?'] },
      { prompt: '(+2) − (+6): 2 sarı pulun var ama 6 sarı çıkarman gerek. 4 sıfır çifti ekle, sonra 6 sarıyı çıkar. Kalanı göster.', target: { x2: 0, x: 0, c: -4 }, hints: ['4 sıfır çifti ekleyince kaç sarı, kaç kırmızı olur?', '6 sarıyı çıkarınca geriye hangi pullar kalır?'], explain: '(+2) − (+6) ile (+2) + (−6) aynı sonucu verir: Çıkarmak, ters işaretlisini eklemek gibidir.' },
    ],
  },
  {
    id: 'g7-baglam-islem-eslestir',
    outcomes: ['MAT.7.1.4'],
    type: 'match',
    stage: 'model',
    title: 'Durum ↔ işlem',
    instructions: 'Her durumu ya da sayı doğrusu modelini onu anlatan işlemle eşleştir.',
    level: 2,
    launch: {
      text: 'Aynı işlem farklı hikâyeler anlatabilir: (−8) + 11 bir sıcaklık değişimi de olabilir, bir hesap hareketi de. Hikâyeyi işleme çevirelim.',
    },
    reflect: '“Borcun silinmesi” neden bir çıkarma işlemiyle gösterilir? Sonuç neden artıyor?',
    perRound: 4,
    pairs: [
      { left: 'Sabah −8 °C’ydi, öğlene kadar 11 derece ısındı.', right: '(−8) + 11 = 3' },
      { left: 'Dalgıç −12 m’deydi, 7 m daha daldı.', right: '(−12) + (−7) = −19' },
      { left: 'Hesabımda 50 TL vardı, 80 TL’lik alışveriş yaptım.', right: '50 − 80 = −30' },
      { left: 'Hesabım −20 TL’ydi; 20 TL’lik borcum silindi.', right: '(−20) − (−20) = 0' },
      { left: { text: 'Sayı doğrusundaki sıçrama', visual: { kind: 'numberline', min: -4, max: 4, step: 1, jumps: [-3, 2], points: [-3, 2] } }, right: '(−3) + 5 = 2' },
      { left: { text: 'Sayı doğrusundaki sıçrama', visual: { kind: 'numberline', min: -4, max: 4, step: 1, jumps: [1, -3], points: [1, -3] } }, right: '1 − 4 = −3' },
      { left: 'Her gün 4 °C soğuyan hava 3 günde ne kadar değişir?', right: '3 · (−4) = −12' },
    ],
  },
  {
    id: 'g7-tam-sayi-oruntu',
    outcomes: ['MAT.7.1.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Örüntüden kurala',
    instructions: 'Örüntüyü sürdür ve işlemlerin nasıl davrandığını keşfet. Kural ezberleme, örüntüye güven!',
    level: 2,
    launch: {
      text: '3 · (−2) = −6, 2 · (−2) = −4, 1 · (−2) = −2… Her adımda sonuç 2 artıyor. Örüntü 0’ı geçince ne olur?',
    },
    reflect: 'İki negatif sayının çarpımının neden pozitif olduğunu örüntüyle bir arkadaşına nasıl açıklarsın?',
    items: [
      { text: '3 · (−2) = −6, 2 · (−2) = −4, 1 · (−2) = −2, 0 · (−2) = __', answers: ['0'], hints: ['Her adımda sonuç kaç artıyor?'] },
      { text: '(−1) · (−2) = __', answers: ['2'], hints: ['Örüntüde 0’dan sonra 2 artınca kaç olur?'] },
      { text: '(−2) · (−2) = __ ve (−3) · (−2) = __', answers: ['4', '6'], hints: ['Örüntüyü iki adım daha sürdür.'] },
      { text: '12 ÷ (−3) = __ çünkü (−3) · __ = 12', answers: ['-4', '-4'], hints: ['Hangi sayıyı −3 ile çarparsan 12 olur?'] },
      { text: '(−20) ÷ (−5) = __', answers: ['4'], hints: ['Hangi sayıyı −5 ile çarparsan −20 olur?'] },
      { text: '(+2) + (−6) = __ ve (+2) − (+6) = __', answers: ['-4', '-4'], hints: ['Pulları hatırla: 2 sarı ile 6 kırmızı birleşirse ne kalır?'], explain: 'İki işlem aynı sonucu verir: (+6)’yı çıkarmak, (−6)’yı eklemekle aynıdır.' },
      { text: '5 − (−3) = __', answers: ['8'], hints: ['−3’ü çıkarmak, 3 TL’lik bir borcu silmek gibidir. Paran artar mı, azalır mı?'], explain: '5 − (−3) = 5 + 3 = 8' },
      { text: '(−7) − (−2) = __', answers: ['-5'], hints: ['7 kırmızı puldan 2 kırmızıyı çıkarınca kaç kırmızı kalır?'] },
    ],
  },
  {
    id: 'g7-rasyonel-sayilarla-islem',
    outcomes: ['MAT.7.1.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Rasyonel sayılarla işlemler',
    instructions: 'İşlemleri yap, sonucu sadeleştirerek yaz. Kesirleri “3/4” biçiminde yazabilirsin. Önce sonucun işaretini tahmin et!',
    level: 2,
    launch: {
      text: 'Kesirlerle ve ondalıklarla işlem yapmayı biliyorsun. Şimdi aynı işlemleri negatif sayılarla yapacağız. Önce “Sonuç 0’dan büyük mü, küçük mü?” diye tahmin et.',
    },
    reflect: 'Hangi işlemde önce sonucun işaretini tahmin etmek işine yaradı? Tahminin doğru çıktı mı?',
    items: [
      { text: '−[[1/2]] + [[3/4]] = __', answers: ['1/4|0,25|2/8'], hints: ['−[[1/2]]’den [[3/4]] sağa gidersen 0’ı geçer misin?'] },
      { text: '[[2/3]] − [[5/6]] = __', answers: ['-1/6|-2/12'], hints: ['[[2/3]] = [[4/6]]. [[4/6]]’dan [[5/6]] çıkınca 0’ın altına iner misin?'] },
      { text: '[[1/2]] − (−[[1/3]]) = __', answers: ['5/6'], hints: ['Negatif bir sayıyı çıkarmak, onun tersini eklemek demektir.'] },
      { text: '(−[[3/5]]) · [[10/9]] = __', answers: ['-2/3|-6/9|-30/45'], hints: ['Önce işaret: negatif · pozitif = ?', 'Çarpmadan önce sadeleştirebilir misin?'] },
      { text: '(−[[4/5]]) ÷ (−[[2/15]]) = __', answers: ['6'], hints: ['[[4/5]]’in içinde kaç tane [[2/15]] var?', '[[4/5]] = [[12/15]]'] },
      { text: '(−2,5) + 1,75 = __', answers: ['-0,75|-3/4'], hints: ['Hangisinin mutlak değeri daha büyük? Sonuç onun işaretini alır.'] },
      { text: '(−1,2) · (−0,5) = __', answers: ['0,6|3/5'], hints: ['0,5 ile çarpmak yarısını almak demektir.'] },
      { text: '(−[[2/3]])^{2} = __', answers: ['4/9'], hints: ['(−[[2/3]]) · (−[[2/3]]) işleminin işareti ne olur?'] },
    ],
  },
  {
    id: 'g7-rasyonel-problemler',
    outcomes: ['MAT.7.1.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Rasyonel sayı problemleri',
    instructions: 'Problemi oku, verilenleri ve isteneni belirle. Gerekirse bir sayı doğrusu ya da şekil çiz, sonra cevabı seç.',
    level: 3,
    launch: {
      text: 'Hava durumu, banka hesabı, tarif… Günlük hayattaki birçok problem rasyonel sayılarla çözülür. Önce durumu bir modelle düşün, sonra işlemi seç.',
    },
    reflect: 'Bir problemi çözerken hangi temsili kullandın: sayı doğrusu, şekil, tablo? Cevabını başka bir yolla nasıl kontrol edersin?',
    questions: [
      { prompt: 'Kars’ta sabah sıcaklık −8 °C idi. Öğlene kadar sıcaklık 11 °C arttı. Öğlen sıcaklık kaç °C oldu?', choices: ['3 °C', '−19 °C', '19 °C', '−3 °C'], answer: 0, feedback: [null, 'Isınma sıcaklığı artırır; 11’i eklemelisin, çıkarmamalısın.', 'İşareti unuttun: 8’den değil, −8’den başlıyoruz.', '−8’den 8 adım sağa gidince 0’a, 3 adım daha gidince 3’e varırsın.'] },
      { prompt: 'Denizin 12 m altındaki bir dalgıç 7,5 m daha aşağı iniyor. Dalgıcın yeni konumu nedir?', choices: ['−4,5 m', '−19,5 m', '19,5 m', '4,5 m'], answer: 1, feedback: ['Daha aşağı inmek konumu daha da küçültür: (−12) + (−7,5).', null, 'Dalgıç deniz seviyesinin altında; konum negatif olmalı.', 'Bu iki sayının farkı; dalgıç yükselmedi, alçaldı.'] },
      { prompt: 'Elif her hafta harçlığından 37,5 TL biriktiriyor. 8 hafta sonunda kaç TL biriktirmiş olur?', choices: ['296 TL', '304 TL', '300 TL', '245 TL'], answer: 2, feedback: ['37 · 8 = 296; 0,5 · 8 = 4 TL’yi unutma.', '37,5’i 38’e yuvarlarsan fazla bulursun.', null, '37,5 · 8’i 30 · 8 + 7,5 · 8 diye parçala: 240 + 60.'] },
      { prompt: 'Can’ın 240 TL’si vardı. Önce parasının [[1/4]]’ünü kitaba harcadı, sonra kalan paranın [[1/3]]’ünü kardeşine verdi. Can’ın kaç TL’si kaldı?', choices: ['100 TL', '140 TL', '60 TL', '120 TL'], answer: 3, feedback: ['[[1/4]] ile [[1/3]]’ü toplayıp 240’a uygulamak olmaz: İkinci kesir kalan paranın kesri.', 'Bu, iki kesri toplayıp 240’a uygulayınca bulunan harcama; soru kalan parayı soruyor.', 'Bu yalnız kitaba ödenen para.', null], explain: '240’ın [[1/4]]’ü 60 → 180 kalır. 180’in [[1/3]]’ü 60 → 120 TL kalır.' },
      { prompt: 'Bir kek tarifinde [[3/4]] su bardağı şeker var. Ayşe tarifin 2,5 katını yapacak. Kaç su bardağı şeker gerekir?', choices: ['[[1 7/8]]', '[[3 1/4]]', '[[1 1/2]]', '[[2 1/2]]'], answer: 0, feedback: [null, 'Bu [[3/4]] + 2,5 toplamı; tarifi 2,5 katına çıkarmak çarpmadır.', '[[3/4]] · 2 = [[1 1/2]]; bir de yarım tarif ([[3/8]]) eklenmeli.', 'Bu tarifin kaç katı olduğu; şeker miktarını [[3/4]] ile çarparak bul.'], explain: '[[3/4]] · [[5/2]] = [[15/8]] = [[1 7/8]]' },
      { prompt: 'Bir kafenin bir haftalık geliri 12.450 TL, gideri 13.120 TL’dir. Hafta sonundaki durumu gösteren sayı hangisidir?', choices: ['+670 TL', '−670 TL', '−25.570 TL', '+25.570 TL'], answer: 1, feedback: ['Gider gelirden büyük; kafe kazanmadı, zarar etti.', null, 'Gelir ile gideri topladın; durumu bulmak için farkına bakmalısın.', 'Gelir ile gideri toplamak durumu göstermez; gelirden gideri çıkar.'] },
      { prompt: 'Sıcaklık 1 °C iken 3 saat boyunca her saat 2,5 °C düştü. Son sıcaklık kaç °C oldu?', choices: ['−6,5 °C', '8,5 °C', '−7,5 °C', '−8,5 °C'], answer: 0, feedback: [null, 'Düşüş sıcaklığı azaltır; 7,5’i eklemek yerine çıkarmalısın.', 'Bu yalnız toplam düşüş: 3 · (−2,5). 1 °C’den başladığını unutma.', '1’den 7,5 aşağı inince −6,5’e varırsın.'], explain: '1 + 3 · (−2,5) = 1 − 7,5 = −6,5' },
      { prompt: '(−3) · 4 − 18 ÷ (−6) işleminin sonucu kaçtır?', choices: ['−15', '−9', '9', '5'], answer: 1, feedback: ['18 ÷ (−6) = −3; −12 − (−3), −12 + 3 demektir.', null, 'İşareti kontrol et: −12’den 3 büyük sayı −9’dur.', 'İşlemleri soldan sağa yaptın; çarpma ve bölme önce yapılır.'], explain: 'Önce çarpma ve bölme: −12 − (−3) = −12 + 3 = −9' },
    ],
  },

  // ── Geometrik Nicelikler (1) ────────────────────────────────────────────

  // MAT.7.4.1
  {
    id: 'g7-kup-yapilari-gorunum',
    outcomes: ['MAT.7.4.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Farklı yönlerden görünüm',
    instructions: `Eş küplerle oluşturulan yapıya bak ve istenen görünümü seç. ${VIEW_NOTE}`,
    level: 2,
    launch: {
      text: 'Futbol sahasında kale direklerine tam karşıdan bakınca iki direk üst üste tek direk gibi görünür. Bir cisme baktığın yön, gördüğün şekli değiştirir.',
      visual: cubes(S1),
    },
    reflect: 'Önden görünümü çizerken her sütunun hangi küpünü çizdin? Arkadaki küpler neden bazen hiç görünmez?',
    questions: [
      { prompt: { text: 'Yapının ÖNDEN görünümü hangisidir?', visual: cubes(S1) }, choices: [{ visual: frontView(S1) }, { visual: leftView(S1) }, { visual: rightView(S1) }, { visual: topView(S1) }], answer: 0, feedback: [null, 'Bu soldan görünüm. Önden bakınca sütunları soldan sağa, her sütunun en yüksek kulesiyle görürsün.', 'Bu sağdan görünüm. Önden bakınca yapının genişliği kadar sütun görünür.', 'Bu üstten görünüm; üstten bakınca katlar görünmez.'] },
      { prompt: { text: 'Yapının ÜSTTEN görünümü hangisidir?', visual: cubes(S2) }, choices: [{ visual: frontView(S2) }, { visual: topView(S2) }, { visual: leftView(S2) }, { visual: { kind: 'grid', cols: 2, rows: 3, cells: ['0,0', '1,0', '0,1', '1,1', '1,2'] } }], answer: 1, feedback: ['Bu önden görünüm; üstten bakınca her karede en az bir küp olan yerleri görürsün.', null, 'Bu soldan görünüm; burada katlar görünüyor, üstten bakınca katlar görünmez.', 'Ön sıradaki küp solda mı sağda mı? Yeniden bak.'] },
      { prompt: { text: 'Yapının SOLDAN görünümü hangisidir?', visual: cubes(S4) }, choices: [{ visual: frontView(S4) }, { visual: rightView(S4) }, { visual: leftView(S4) }, { visual: topView(S4) }], answer: 2, feedback: ['Bu önden görünüm.', 'Bu sağdan görünüm; soldan görünümün yansımasıdır. Soldan bakınca arka sıra solda kalır.', null, 'Bu üstten görünüm.'], explain: 'Soldan bakınca arka sıra solda, ön sıra sağda görünür. Her sıradaki en yüksek kule görünür.' },
      { prompt: { text: 'Yapının SAĞDAN görünümü hangisidir?', visual: cubes(S6) }, choices: [{ visual: leftView(S6) }, { visual: frontView(S6) }, { visual: topView(S6) }, { visual: rightView(S6) }], answer: 3, feedback: ['Bu soldan görünüm; sağdan bakınca ön sıra solda, arka sıra sağda kalır.', 'Bu önden görünüm.', 'Bu üstten görünüm.', null] },
      { prompt: { text: 'Önden görünümü şekildeki gibi olan yapı hangisidir?', visual: frontView(S3) }, choices: [{ visual: cubes(S5) }, { visual: cubes(S3) }, { visual: cubes(S1) }, { visual: cubes([[3, 1, 1], [1, 0, 0]]) }], answer: 1, feedback: ['Bu yapının önden görünümünde sütunlar 2, 2, 1 kare yüksekliğinde.', null, 'Bu yapının önden görünümünde sütunlar 3, 2, 1 kare yüksekliğinde.', 'Bu yapıda en yüksek kule solda; görünümde ise ortada.'] },
    ],
  },
  {
    id: 'g7-sayi-kodu-eslestir',
    outcomes: ['MAT.7.4.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Yapı ↔ sayı kodu',
    instructions: 'Mimarlar yapıyı üstten görünüm üzerine sayılar yazarak kodlar: her sayı o karedeki küp sayısıdır. Tabloda üst satır arka sıradır. Her yapıyı koduyla eşleştir.',
    level: 3,
    launch: {
      text: 'Bir yapıyı telefonda arkadaşına anlatmak zorundasın ama fotoğraf gönderemiyorsun. Yalnız sayılarla anlatabilir misin?',
      visual: heightCode(S1),
    },
    reflect: 'Sayı kodundan yapının önden görünümünü nasıl bulursun? Hangi sayılara bakman yeter?',
    perRound: 5,
    pairs: [
      { left: { visual: cubes(S1) }, right: { visual: heightCode(S1) } },
      { left: { visual: cubes(S2) }, right: { visual: heightCode(S2) } },
      { left: { visual: cubes(S3) }, right: { visual: heightCode(S3) } },
      { left: { visual: cubes(S4) }, right: { visual: heightCode(S4) } },
      { left: { visual: cubes(S6) }, right: { visual: heightCode(S6) } },
    ],
  },
  {
    id: 'g7-gorunum-problem',
    outcomes: ['MAT.7.4.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Görünümden yapıya akıl yürüt',
    instructions: 'Görünümler yapı hakkında neyi kesin söyler, neyi söylemez? Gerekçeyle düşün.',
    level: 3,
    launch: {
      text: 'Bir dedektif olduğunu düşün: Elinde yalnız bir yapının fotoğrafları var. Yapıda kaç küp olduğunu kesin olarak söyleyebilir misin?',
    },
    reflect: 'Bir yapının yalnız önden görünümü ile küp sayısını bulmak neden mümkün değil? Hangi bilgi daha gerekir?',
    questions: [
      { prompt: { text: 'Can bu yapının önden görünümünde 6 kare sayıp “Yapıda 6 küp var.” diyor. Can haklı mı?', visual: cubes(S1) }, choices: [`Hayır; önden görünmeyen küpler var. Yapıda ${cubeCount(S1)} küp var.`, 'Evet; önden kaç kare görünüyorsa o kadar küp vardır.', 'Evet; yapılarda görünmeyen küp olmaz.', 'Hayır; yapıda 6’dan az küp vardır.'], answer: 0, feedback: [null, 'Ön sıradaki küpler arkadakileri saklayabilir; önden görünüm yalnız en yüksek kuleleri gösterir.', 'Arka sıradaki küçük kuleler, öndeki kulelerin arkasında kalabilir.', 'Önden 6 kare görünüyorsa en az 6 küp vardır.'] },
      { prompt: 'Önden görünümü 5 kare olan bir yapı en az kaç küpten oluşur?', choices: ['5', '6', '3', '1'], answer: 0, feedback: [null, '6 küple de yapılabilir; ama soru en az sayıyı soruyor. Arkada küp olmak zorunda değil.', 'Önden görünen her kare en az bir küp demektir.', 'Tek küp önden yalnız 1 kare gösterir.'] },
      { prompt: 'Üstten görünümü 5 kare olan bir yapıda en az kaç küp vardır?', choices: ['5', '4', '1', '25'], answer: 0, feedback: [null, 'Üstten görülen her karenin altında en az bir küp vardır.', 'Tek küp üstten yalnız 1 kare gösterir.', '5 kare, 5 × 5 demek değildir.'] },
      { prompt: 'Bir yapının önden ve arkadan görünümleri arasında nasıl bir ilişki vardır?', choices: ['Birbirinin aynısıdır.', 'Birbirinin yansımasıdır (simetriğidir).', 'Aralarında hiçbir ilişki yoktur.', 'Arkadan görünüm her zaman daha büyüktür.'], answer: 1, feedback: ['Arkaya geçince sağ ile sol yer değiştirir; şekil ters döner.', null, 'Aynı sütunları görürsün, yalnız sıraları terstir.', 'Aynı yapının iki görünümü aynı sayıda kareden oluşur.'], explain: 'Ön–arka ve sağ–sol görünümler birbirinin simetriğidir.' },
      { prompt: 'Bir yapıdan bir küp çıkarıldı ama önden görünüm değişmedi. Bu nasıl olabilir?', choices: ['Çıkarılan küpün önünde ya da arkasında, aynı yükseklikte başka küp vardı.', 'Bu imkânsızdır; her küp önden görünür.', 'Küp en üst kattan çıkarıldığı için.', 'Yapı simetrik olduğu için.'], answer: 0, feedback: [null, 'Arkada kalan küpler önden görünmez; onları çıkarmak görünümü değiştirmeyebilir.', 'En üstteki küp çıkarılırsa o sütun kısalabilir; görünüm değişebilir.', 'Simetri bunun nedeni değil; önemli olan küpün başka bir küpün arkasında saklı olması.'] },
    ],
  },

  // MAT.7.4.2
  {
    id: 'g7-acinimlar',
    outcomes: ['MAT.7.4.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kutuyu aç, katla',
    instructions: 'Açınımı incele, katlayarak dene ve hangi cismin oluştuğunu seç.',
    level: 1,
    launch: {
      text: 'Bir diş macunu kutusunu ayrıtlarından keserek düz bir kâğıda açtın. Ortaya çıkan şekle bakarak kutuyu yeniden kurabilir misin?',
      visual: SVG_NET,
    },
    reflect: 'Bir dikdörtgenler prizmasının açınımında kaç yüz vardır? Bu yüzlerden hangileri birbirine eştir?',
    tool: 'nets',
    tasks: [
      { prompt: 'Bu açınım hangi cismin yüzey açınımıdır?', target: { solid: 'cuboid' }, explain: 'Altı dikdörtgen yüz, üç çift eş yüz: dikdörtgenler prizması.' },
      { prompt: 'Bu açınım hangi cismin yüzey açınımıdır?', target: { solid: 'cube' }, explain: 'Altı eş kare: küp de bir dikdörtgenler prizmasıdır, hem de bütün ayrıtları eşit olan.' },
      { prompt: 'Bu açınım hangi cismin yüzey açınımıdır? Dikdörtgenler prizmasından farkı ne?', target: { solid: 'triangular-prism' }, explain: 'Tabanları üçgen olduğu için bu bir üçgen prizmadır; dikdörtgenler prizması değildir.' },
    ],
  },
  {
    id: 'g7-yuzey-alani',
    outcomes: ['MAT.7.4.2'],
    type: 'fill',
    stage: 'model',
    title: 'Açınımla yüzey alanı',
    instructions: 'Yüzey alanı, kutuyu kaplamak için gereken kâğıt miktarıdır: bütün yüzlerin alanları toplamı. Açınım ölçüleri cm cinsindendir.',
    level: 2,
    launch: {
      text: 'Bir hediye kutusunu paket kâğıdıyla kaplayacaksın. Kâğıdı israf etmeden, tam olarak ne kadar kâğıt gerektiğini nasıl bulursun?',
      visual: SVG_NET,
    },
    reflect: 'Altı yüzün hepsini tek tek hesaplamak yerine daha kısa bir yol buldun mu? Neden işe yarıyor?',
    items: [
      { text: 'Açınımda __ dikdörtgen vardır.', answers: ['6'], visual: SVG_NET, hints: ['Kutunun kaç yüzü var: alt, üst, ön, arka, sağ, sol…'] },
      { text: 'Eş yüz çiftleri 6 × 4, 6 × 2 ve 2 × 4’tür. Bu yüzlerin alanları 24 cm², 12 cm² ve __ cm²’dir.', answers: ['8'], visual: SVG_NET },
      { text: 'Prizmanın yüzey alanı 2 · 24 + 2 · 12 + 2 · 8 = __ cm²', answers: ['88'], visual: SVG_NET, hints: ['Her yüzden kaç tane var?'] },
      { text: 'Küp açınımında her yüz 3 cm × 3 cm’dir. Küpün yüzey alanı __ cm²', answers: ['54'], visual: SVG_NET_CUBE, hints: ['Bir yüzün alanı kaç? Kaç yüz var?'] },
      { text: 'Ayrıtları 5 cm, 3 cm ve 2 cm olan prizmanın üç farklı yüzünün alanları 15 cm², 10 cm² ve __ cm²’dir.', answers: ['6'], hints: ['Hangi iki ayrıt henüz çarpılmadı?'] },
      { text: 'Bu prizmanın yüzey alanı __ cm²’dir.', answers: ['62'], hints: ['Üç farklı yüzün alanlarını topla. Her yüzden kaç tane var?'], explain: '2 · (15 + 10 + 6) = 62 cm²' },
      { text: 'Tabanı 3 cm × 3 cm, yüksekliği 7 cm olan kare prizmanın yüzey alanı __ cm²', answers: ['102'], hints: ['İki kare taban, dört eş dikdörtgen yan yüz var.'], explain: '2 · 9 + 4 · 21 = 18 + 84 = 102 cm²' },
    ],
  },
  {
    id: 'g7-yuzey-alani-problem',
    outcomes: ['MAT.7.4.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kâğıt mı, içerik mi?',
    instructions: 'Yüzey alanı ile hacmi karıştırmamaya dikkat et. Her problemde “kaplıyor muyum, dolduruyor muyum?” diye sor.',
    level: 3,
    launch: {
      text: 'Bir çikolata firması aynı miktarda çikolatayı farklı kutulara koymak istiyor. Hangi kutu daha az karton harcar?',
    },
    reflect: 'Aynı hacimdeki iki kutunun yüzey alanları neden farklı olabilir? Hangi şekildeki kutu daha az ambalaj harcıyor gibi?',
    questions: [
      { prompt: 'Ölçüleri 20 cm × 10 cm × 5 cm olan bir hediye kutusunun bütün yüzeyini kaplamak için en az kaç cm² kâğıt gerekir?', choices: ['700 cm²', '1.000 cm²', '350 cm²', '35 cm²'], answer: 0, feedback: [null, '1.000 cm³ kutunun hacmi; kâğıt yüzeyi kaplar, yüzey alanı gerekir.', 'Üç farklı yüzü buldun; her yüzden iki tane var.', 'Ayrıtları topladın; alan için yüzlerin alanlarını toplamalısın.'], explain: '2 · (200 + 50 + 100) = 700 cm²' },
      { prompt: 'Ölçüleri 30 cm × 20 cm × 10 cm olan üstü açık bir kutunun dışı boyanacak. Kaç cm² boyanır?', choices: ['1.600 cm²', '2.200 cm²', '6.000 cm²', '1.000 cm²'], answer: 0, feedback: [null, 'Kutunun üstü açık; kapak yüzünü (600 cm²) çıkarmalısın.', 'Bu kutunun hacmi (cm³); boya yüzeye sürülür.', 'Yalnız yan yüzleri buldun; tabanı da ekle.'], explain: 'Taban 600 + yan yüzler 2 · 300 + 2 · 200 = 1.600 cm²' },
      { prompt: 'Ayrıtı 2 cm olan 8 küp birleştirilip ayrıtı 4 cm olan büyük bir küp yapılıyor. Yüzey alanı için hangisi doğrudur?', choices: ['Küçük küplerin yüzey alanları toplamı (192 cm²) daha büyüktür.', 'Büyük küpün yüzey alanı daha büyüktür.', 'Eşittir, çünkü aynı küpler kullanıldı.', 'Karşılaştırılamaz.'], answer: 0, feedback: [null, 'Büyük küpün yüzey alanı 6 · 16 = 96 cm²; küçüklerin toplamı 8 · 24 = 192 cm².', 'Hacim aynı kalır ama birleşen yüzler içeride kalıp görünmez olur; yüzey alanı azalır.', 'İkisini de hesaplayabiliriz: 192 cm² ve 96 cm².'] },
      { prompt: 'A kutusu 4 cm × 4 cm × 4 cm, B kutusu 8 cm × 4 cm × 2 cm. İkisinin hacmi de 64 cm³. Hangisi daha az karton gerektirir?', choices: ['A (96 cm²)', 'B (112 cm²)', 'Eşit; hacimleri aynı.', 'Bilinemez.'], answer: 0, feedback: [null, 'B’nin yüzey alanı 2 · (32 + 16 + 8) = 112 cm²; A’nınki 96 cm².', 'Aynı hacim, aynı yüzey alanı demek değildir.', 'Ayrıtlar verildiği için iki yüzey alanını da hesaplayabilirsin.'] },
    ],
  },

  // MAT.7.4.3
  {
    id: 'g7-birim-kuplerle-hacim',
    outcomes: ['MAT.7.4.3'],
    type: 'fill',
    stage: 'model',
    title: 'Birim küplerle hacim',
    instructions: 'Prizmayı dolduran eş küpleri say. Prizmanın hacmi, onu dolduran birim küplerin sayısıdır. Tek tek saymak yerine kat kat saymayı dene.',
    level: 1,
    launch: {
      text: 'İki kutudan hangisinin daha çok şey alacağına karar veremedin. Kutuları aynı büyüklükte küplerle doldurup saymak işe yarar mı?',
      visual: cubes([[2, 2, 2], [2, 2, 2]]),
    },
    reflect: 'Küpleri tek tek saymak yerine hangi kısa yolu kullandın? Bu yol her prizmada işe yarar mı?',
    items: [
      { text: 'Prizmanın hacmi __ birim küptür.', answers: ['12'], visual: cubes([[2, 2, 2], [2, 2, 2]]), hints: ['Bir katta kaç küp var? Kaç kat var?'] },
      { text: 'Prizmanın hacmi __ birim küptür.', answers: ['18'], visual: cubes([[3, 3], [3, 3], [3, 3]]), hints: ['Zemindeki katta kaç küp var?'] },
      { text: 'Prizmanın hacmi __ birim küptür.', answers: ['8'], visual: cubes([[1, 1, 1, 1], [1, 1, 1, 1]]) },
      { text: 'Prizmanın hacmi __ birim küptür.', answers: ['16'], visual: cubes([[4, 4], [4, 4]]), hints: ['Dört küplük kuleler var. Kaç kule?'] },
      { text: 'Tabanda __ küp var; 3 kat olduğuna göre toplam __ küp vardır.', answers: ['9', '27'], visual: cubes([[3, 3, 3], [3, 3, 3], [3, 3, 3]]), hints: ['Taban 3 sıra, her sırada 3 küp.'] },
      { text: 'Bu yapıyı 3 × 2 × 2’lik bir prizmaya tamamlamak için __ birim küp daha gerekir.', answers: [String(12 - cubeCount([[2, 2, 2], [2, 1, 0]]))], visual: cubes([[2, 2, 2], [2, 1, 0]]), hints: ['Tamamlanmış prizma kaç küp eder?', 'Şu an kaç küp var?'] },
    ],
  },
  {
    id: 'g7-hacim-sirala-kutular',
    outcomes: ['MAT.7.4.3'],
    type: 'sort',
    stage: 'sembol',
    title: 'Hangi kutu daha çok alır?',
    instructions: 'Kutuları içlerine sığan eş küp ya da nesne sayısına göre sırala.',
    level: 2,
    launch: {
      text: 'Kutuların hepsini doldurup saymaya vaktin yok. Yalnız tabanı ve kat sayısını bilerek sıralayabilir misin?',
    },
    reflect: 'Aynı kutuyu büyük nesnelerle doldurunca neden daha az nesne gerekir? Hacim değişti mi?',
    rounds: [
      { prompt: 'Kutuları içine sığan birim küp sayısına göre en azdan en çoğa sırala.', items: ['Tabanda 6 × 1 küp, 3 kat', 'Tabanda 2 × 2 küp, 5 kat', 'Tabanda 4 × 3 küp, 2 kat', 'Tabanda 3 × 3 küp, 3 kat', 'Tabanda 5 × 2 küp, 3 kat'], ends: ['En az', 'En çok'], hints: ['Bir kattaki küp sayısını kat sayısıyla çarp.'] },
      { prompt: 'Aynı dolabı farklı nesnelerle dolduruyoruz. Gereken nesne sayısına göre en azdan en çoğa sırala.', items: ['Ayakkabı kutusu', 'Süt kutusu (1 L)', 'Kibrit kutusu', 'Şeker küpü'], ends: ['En az nesne', 'En çok nesne'], hints: ['Nesne büyüdükçe dolaba kaç tane sığar?'], explain: 'Birim büyüdükçe gereken birim sayısı azalır; dolabın hacmi değişmez.' },
    ],
  },
  {
    id: 'g7-hacim-karsilastir',
    outcomes: ['MAT.7.4.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Eş nesnelerle karşılaştır',
    instructions: 'Kutuların hacimlerini eş nesneler yardımıyla karşılaştır. Ölçüm sonucunun birime bağlı olduğunu unutma.',
    level: 2,
    launch: {
      text: 'Ayşe bir kutuyu 40 kibrit kutusuyla, Mehmet aynı kutuyu 64 sayı küpüyle doldurdu. İkisi de “Ben doğru ölçtüm!” diyor.',
    },
    reflect: 'Ayşe ile Mehmet ikisi de doğru ölçmüş olabilir mi? Sınıfça aynı sonucu bulmak için ne yapmalısınız?',
    questions: [
      { prompt: 'A kutusuna 24, B kutusuna 30 tane aynı büyüklükte küp tam olarak yerleşiyor. Hangisi doğrudur?', choices: ['A’nın hacmi daha büyüktür.', 'B’nin hacmi daha büyüktür.', 'Hacimleri eşittir.', 'Karşılaştırılamaz.'], answer: 1, feedback: ['A’ya daha az küp sığıyor; yani A daha az yer kaplıyor.', null, '24 ile 30 eşit değil; küpler aynı büyüklükte.', 'Küpler eş olduğu için sayıları karşılaştırmak yeterlidir.'] },
      { prompt: 'Ayşe bir kutuyu 40 kibrit kutusuyla, Mehmet aynı kutuyu 64 sayı küpüyle dolduruyor. Neden farklı sayılar buldular?', choices: ['Biri yanlış saymıştır.', 'Kutunun hacmi değişmiştir.', 'Kullandıkları nesnelerin hacimleri farklıdır.', 'Kibrit kutuları daha hafiftir.'], answer: 2, feedback: ['İkisi de doğru saymış olabilir; birimler farklı.', 'Aynı kutu; hacmi değişmedi.', null, 'Hacim, nesnelerin ağırlığıyla değil, kapladıkları yerle ilgilidir.'], explain: 'Aynı hacmi büyük birimle ölçünce daha az sayıda birim gerekir.' },
      { prompt: 'Bir kutunun tabanına 5 sıra hâlinde, her sırada 4 küp yerleşiyor. Kutu 3 kat küple doluyor. Kutunun hacmi kaç birim küptür?', choices: ['12', '20', '60', '45'], answer: 2, feedback: ['5 + 4 + 3 toplamı; küpler sıra sıra, kat kat çarpılarak sayılır.', 'Bu yalnız bir kattaki küp sayısı; 3 kat var.', null, 'Bir katta 5 · 4 = 20 küp var.'], explain: 'Bir katta 5 · 4 = 20 küp, 3 katta 20 · 3 = 60 küp vardır.' },
      { prompt: 'Hacimleri karşılaştırırken neden eş (aynı büyüklükte) nesneler kullanmalıyız?', choices: ['Farklı büyüklükteki nesnelerle yapılan sayımlar karşılaştırılamaz.', 'Eş nesneler daha ucuzdur.', 'Eş nesneler kutuya daha hızlı girer.', 'Hacim yalnızca küplerle ölçülür.'], answer: 0, feedback: [null, 'Fiyatın hacimle ilgisi yok.', 'Hız değil, sayımın anlamı önemli.', 'Eş kibrit kutuları gibi başka eş nesnelerle de ölçebiliriz.'] },
      { prompt: 'Bir ayrıtı 3 birim olan küpü doldurmak için kaç birim küp gerekir?', choices: ['9', '27', '18', '12'], answer: 1, feedback: ['Bu yalnız bir kat (3 · 3); 3 kat var.', null, '9 + 9 = 18, iki kat eder; küp 3 kat.', '12, küpün ayrıt sayısıdır; içindeki küpleri saymalıyız.'], explain: '3 · 3 · 3 = 27' },
    ],
  },

  // MAT.7.4.4
  {
    id: 'g7-katman-katman',
    outcomes: ['MAT.7.4.4'],
    type: 'fill',
    stage: 'model',
    title: 'Kat kat hacim',
    instructions: 'Küpleri tek tek sayma! Önce bir kattaki küpleri (taban alanını), sonra kat sayısını (yüksekliği) bul.',
    level: 1,
    launch: {
      text: 'Bir kamyon kasasındaki bütün kolileri tek tek saymak saatler sürer. Şoför bir bakışta “taban × kat” diyerek sayıyor. Bu neden işe yarıyor?',
      visual: cubes([[3, 3, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3]]),
    },
    reflect: '“Hacim = taban alanı × yükseklik” bağıntısını küpleri hiç görmemiş bir arkadaşına nasıl açıklarsın?',
    items: [
      { text: 'Bir katta __ küp var, __ kat var. Hacim __ birim küp.', answers: ['6', '2', '12'], visual: cubes([[2, 2, 2], [2, 2, 2]]), hints: ['Taban kaç sıra, her sırada kaç küp?'] },
      { text: 'Taban alanı __ birim kare, yükseklik 4 birim. Hacim __ birim küp.', answers: ['4', '16'], visual: cubes([[4, 4], [4, 4]]), hints: ['Üstten bakınca kaç kare görürsün?'] },
      { text: 'Taban alanı __ birim kare, __ kat var. Hacim __ birim küp.', answers: ['12', '3', '36'], visual: cubes([[3, 3, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3]]) },
      { text: 'Tabanı 5 × 4 birim kare olan bir kutu 6 kat küple doluyor. Hacim __ birim küp.', answers: ['120'], hints: ['Bir katta kaç küp var?'] },
      { text: 'Ayrıtları 2 cm, 3 cm ve 5 cm olan prizmanın taban alanı (2 · 3) __ cm², hacmi __ cm³’tür.', answers: ['6', '30'] },
      { text: 'Taban alanı 24 cm², hacmi 120 cm³ olan prizmanın yüksekliği __ cm’dir.', answers: ['5'], hints: ['Bir katta 24 küp varsa 120 küp kaç kat eder?'] },
    ],
  },
  {
    id: 'g7-ayni-hacim-farkli-prizma',
    outcomes: ['MAT.7.4.4'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Aynı hacim, farklı prizmalar',
    instructions: 'Ayrıt uzunlukları (cm) verilen prizmaları hacimlerine göre grupla. Aynı hacme sahip birçok farklı prizma olabilir!',
    level: 2,
    launch: {
      text: 'Elinde 24 tane birim küp var. Hepsini kullanarak kaç farklı dikdörtgenler prizması yapabilirsin?',
    },
    reflect: '24 küple yaptığın prizmaların hepsinin hacmi aynı. Peki yüzey alanları da aynı mı? Bir örnekle dene.',
    categories: [
      { id: 'h24', label: 'Hacmi 24 cm³', color: '#3b82f6' },
      { id: 'h36', label: 'Hacmi 36 cm³', color: '#f97316' },
    ],
    items: [
      { content: '2 × 3 × 4', category: 'h24' },
      { content: '1 × 4 × 6', category: 'h24' },
      { content: '2 × 2 × 6', category: 'h24' },
      { content: '1 × 2 × 12', category: 'h24' },
      { content: 'Taban alanı 8 cm², yüksekliği 3 cm', category: 'h24', explain: '8 · 3 = 24' },
      { content: '3 × 3 × 4', category: 'h36' },
      { content: '2 × 3 × 6', category: 'h36' },
      { content: '1 × 6 × 6', category: 'h36' },
      { content: '2 × 2 × 9', category: 'h36' },
      { content: 'Taban alanı 12 cm², yüksekliği 3 cm', category: 'h36', explain: '12 · 3 = 36' },
    ],
  },
  {
    id: 'g7-t2-hangisi-farkli',
    outcomes: ['MAT.7.4.4', 'MAT.7.4.2'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Ayrıt uzunlukları cm cinsinden verilen dört prizmadan birini seç ve neden farklı olduğunu açıkla. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: {
      text: 'Bir kutu fabrikasında dört kalıp var. Mühendisler kalıplardan birini üretimden kaldırmak istiyor. Sen olsan hangisini, hangi gerekçeyle seçerdin?',
    },
    reflect: 'Hacmi, yüzey alanını, ayrıtları düşündün. Bu dört prizmayı başka hangi özelliğe göre karşılaştırabilirdin?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['2 × 3 × 4', '1 × 4 × 6', '2 × 2 × 6', '3 × 3 × 3'],
        answer: 0,
        reasons: ['Ayrıt uzunlukları ardışık sayılar olan tek prizma.', 'Bir ayrıtı 1 cm olan tek prizma: tek katlı, ince bir levha gibi.', 'Tam olarak iki ayrıtı eşit olan tek prizma (kare prizma).', 'Bir küp olan ve hacmi 24 cm³ olmayan (27 cm³) tek prizma.'],
      },
    ],
  },

  // MAT.7.4.5
  {
    id: 'g7-metrekupun-icinde',
    outcomes: ['MAT.7.4.5'],
    type: 'fill',
    stage: 'model',
    title: 'Bir metreküpün içinde ne var?',
    instructions: 'Büyük küpü küçük küplerle dolduruyormuş gibi düşün: önce bir sıra, sonra bir kat, sonra bütün katlar.',
    level: 1,
    launch: {
      text: 'Ayrıtı 1 m olan küp şeklinde bir koliyi, ayrıtı 1 dm olan küçük kutularla dolduracaksın. Sence 100 kutu yeter mi?',
    },
    reflect: 'Uzunluk birimleri 10’ar kat büyürken hacim birimleri neden 1000’er kat büyüyor?',
    items: [
      { text: '1 m = 10 dm olduğu için koliye bir sırada __ küçük kutu dizilir.', answers: ['10'], hints: ['1 m’lik kenara 1 dm’lik kutulardan kaç tane sığar?'] },
      { text: 'Bir katta 10 sıra vardır. Bir katta __ kutu olur.', answers: ['100'] },
      { text: 'Koli 10 kat olduğuna göre 1 m³ = __ dm³', answers: ['1000|1.000'], hints: ['Bir kattaki kutu sayısını kat sayısıyla çarp.'] },
      { text: 'Aynı düşünceyle 1 dm³ = __ cm³', answers: ['1000|1.000'], hints: ['1 dm = 10 cm. Bir sıra, bir kat, bütün katlar…'] },
      { text: 'Ölçüleri 2 dm, 3 dm ve 1 dm olan bir kabın hacmi __ dm³’tür. Bu kap 1 L’lik şişeyle __ kez doldurulur.', answers: ['6', '6'], explain: '1 L = 1 dm³: Litre hem sıvı ölçme hem hacim ölçme birimidir.' },
      { text: '1 L’lik şişeyi 1 dL’lik bardakla doldurmak için __ bardak gerekir.', answers: ['10'] },
      { text: 'Dereceli kaba bir taş atınca su 250 mL’den 310 mL’ye yükseldi. Taşın hacmi __ cm³’tür.', answers: ['60'], hints: ['Su ne kadar yükseldi?', '1 mL kaç cm³ eder?'] },
    ],
  },
  {
    id: 'g7-sivi-olcme',
    outcomes: ['MAT.7.4.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Hacim ve sıvı ölçme birimleri',
    instructions: 'Hacim birimleri 1000’er kat, sıvı ölçme birimleri 10’ar kat büyür: 1 L = 10 dL = 100 cL = 1000 mL. Ayrıca 1 dm³ = 1 L ve 1 cm³ = 1 mL.',
    level: 2,
    launch: {
      text: 'Bir şişe suyun etiketinde 0,5 L, ilaç şişesinde 150 mL, akvaryum kutusunda 72 dm³ yazıyor. Hepsini aynı dilde konuşturalım.',
    },
    reflect: 'Birim dönüştürürken sonucun daha büyük mü daha küçük mü olacağını önceden nasıl tahmin edersin?',
    items: [
      { text: '1 L = __ dL', answers: ['10'] },
      { text: '2,5 L = __ mL', answers: ['2500|2.500'], hints: ['1 L kaç mL? 2,5 L onun kaç katı?'] },
      { text: '750 mL = __ cL', answers: ['75'], hints: ['1 cL kaç mL eder?'] },
      { text: '3 dm³ = __ L', answers: ['3'] },
      { text: '1 m³ = __ L', answers: ['1000|1.000'], hints: ['1 m³ kaç dm³? 1 dm³ kaç L?'] },
      { text: '0,5 m³ = __ dm³', answers: ['500'] },
      { text: '4.500 cm³ = __ L', answers: ['4,5'], hints: ['1 L = 1 dm³ = 1000 cm³'] },
      { text: '2.000 mm³ = __ cm³', answers: ['2'], hints: ['1 cm³ kaç mm³ eder? 1 cm = 10 mm.'] },
    ],
  },
  {
    id: 'g7-hacim-sirala',
    outcomes: ['MAT.7.4.5'],
    type: 'sort',
    stage: 'problem',
    title: 'Hangi kap daha çok alır?',
    instructions: 'Önce aynı birime çevir, sonra sırala.',
    level: 3,
    launch: {
      text: 'Mutfakta bir çay bardağı, bir kupa, bir süt kutusu, bir sürahi ve bir kova var. Her birinin üzerinde farklı bir birim yazıyor.',
    },
    reflect: 'Sıralarken hangi birime çevirmeyi seçtin? Neden o birim işini kolaylaştırdı?',
    rounds: [
      { prompt: 'Kapları en az alandan en çok alana sırala.', items: ['Çay bardağı: 100 mL', 'Kupa: 3 dL', 'Süt kutusu: 1 L', 'Sürahi: 1,5 dm³', 'Kova: 0,01 m³'], ends: ['En az', 'En çok'], hints: ['Hepsini mL’ye çevir. 1 dL = 100 mL, 1 dm³ = 1 L.'] },
      { prompt: 'Küçükten büyüğe sırala.', items: ['800 cm³', '1 L', '1,5 dm³', '2.000 mL', '0,003 m³'], ends: ['En küçük', 'En büyük'], hints: ['0,003 m³ kaç dm³ eder?'] },
      { prompt: 'Büyükten küçüğe sırala.', items: ['1 m³', '750 dm³', '500 L', '0,2 m³', '100.000 cm³'], ends: ['En büyük', 'En küçük'], hints: ['Hepsini litreye çevir: 1 m³ = 1000 L.'] },
    ],
  },

  // MAT.7.4.6
  {
    id: 'g7-alan-mi-hacim-mi',
    outcomes: ['MAT.7.4.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Kaplamak mı, doldurmak mı?',
    instructions: 'Her durumda yüzey alanı mı yoksa hacim mi hesaplanmalı? Doğru gruba sürükle.',
    level: 1,
    launch: {
      text: 'Bir havuz yapılıyor: İşçiler fayans sayısını, belediye ise gereken su miktarını hesaplıyor. İkisi aynı hesabı mı yapıyor?',
    },
    reflect: 'Bir durumda yüzey alanının mı hacmin mi gerektiğine karar verirken kendine hangi soruyu soruyorsun?',
    categories: [
      { id: 'yuzey', label: 'Yüzey alanı (kaplamak)', color: '#a855f7' },
      { id: 'hacim', label: 'Hacim (doldurmak)', color: '#22c55e' },
    ],
    items: [
      { content: 'Hediye kutusunu paket kâğıdıyla kaplamak', category: 'yuzey' },
      { content: 'Akvaryuma kaç litre su sığdığını bulmak', category: 'hacim' },
      { content: 'Odanın duvarlarını boyamak', category: 'yuzey' },
      { content: 'Kamyon kasasına kaç koli sığacağını bulmak', category: 'hacim' },
      { content: 'Süt kutusunun kaç mL aldığını bulmak', category: 'hacim' },
      { content: 'Bir dolabın her yüzünü cilalamak', category: 'yuzey' },
      { content: 'Havuzu doldurmak için gereken su', category: 'hacim' },
      { content: 'Havuzun içini fayansla kaplamak', category: 'yuzey', explain: 'Fayans yüzeyi kaplar; içine konan su ise hacimdir.' },
      { content: 'Bir silodaki buğday miktarı', category: 'hacim' },
    ],
  },
  {
    id: 'g7-prizma-problemleri-2',
    outcomes: ['MAT.7.4.6'],
    type: 'fill',
    stage: 'model',
    title: 'Çiz, düşün, hesapla',
    instructions: 'Problemi önce zihninde ya da kâğıtta bir prizma olarak çiz. Sonuç hakkında bir tahmin yap, sonra hesapla.',
    level: 3,
    launch: {
      text: 'Bir taşıma şirketi kolileri kamyonlara yerleştiriyor. Her kamyona kaç koli sığacağını önceden bilmek zaman ve yakıt kazandırır.',
      visual: cubes([[2, 2, 2, 2], [2, 2, 2, 2], [2, 2, 2, 2]]),
    },
    reflect: 'Hangi problemde tahminin gerçek sonuca çok yakın çıktı? Tahmin ederken neyi kullandın?',
    items: [
      { text: 'Ölçüleri 40 cm × 30 cm × 20 cm olan koliye ayrıtı 10 cm olan küp kutular diziliyor. Bir sırada __ kutu, bir katta __ kutu, toplam __ kutu sığar.', answers: ['4', '12', '24'], visual: cubes([[2, 2, 2, 2], [2, 2, 2, 2], [2, 2, 2, 2]]), hints: ['40 cm’lik kenara 10 cm’lik kutudan kaç tane sığar?'] },
      { text: 'Ölçüleri 6 cm × 6 cm × 25 cm olan bir süt kutusu __ mL süt alır.', answers: ['900'], hints: ['Hacmi cm³ olarak bul. 1 cm³ kaç mL?'] },
      { text: 'Hacmi 360 cm³ olan bir prizmanın taban alanı 45 cm²’dir. Yüksekliği __ cm’dir.', answers: ['8'], hints: ['Bir katta 45 küp varsa 360 küp kaç kat eder?'] },
      { text: 'Taban ayrıtları 8 m ve 2,5 m olan kamyon kasasına 30 m³ kum yüklendi. Kumun yüksekliği __ m’dir.', answers: ['1,5'], hints: ['Kasanın taban alanı kaç m²?'] },
      { text: 'Ayrıtı 5 cm olan 8 küp yan yana dizilerek 40 cm × 5 cm × 5 cm’lik bir prizma yapılıyor. Prizmanın hacmi __ cm³, yüzey alanı __ cm²’dir.', answers: ['1000|1.000', '850'], hints: ['Hacim: 8 küpün hacimleri toplamı. Yüzey: dört uzun yüz ve iki kare uç.'] },
      { text: 'Ölçüleri 2 dm × 2 dm × 4,5 dm olan bir yağ tenekesi __ L yağ alır.', answers: ['18'], hints: ['1 dm³ = 1 L'] },
    ],
  },
  {
    id: 'g7-prizma-problemleri',
    outcomes: ['MAT.7.4.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Akvaryumlar, konteynerler, havuzlar',
    instructions: 'Problemde yüzey alanı mı hacim mi istendiğine karar ver, birimlere dikkat et, sonra çöz.',
    level: 3,
    launch: {
      text: 'Bir gemideki standart konteynerlere koliler yerleştiriliyor. Bir koliyi bile boşa yerleştirmemek için hesap şart!',
    },
    reflect: 'Bir problemde yanlış birimle (cm³ yerine L gibi) cevap verseydin ne olurdu? Birimleri nasıl kontrol ediyorsun?',
    questions: [
      { prompt: 'Ölçüleri 60 cm × 30 cm × 40 cm olan akvaryum tamamen dolunca kaç litre su alır?', choices: ['7,2 L', '72 L', '720 L', '7.200 L'], answer: 1, feedback: ['72.000 cm³’ü yanlış çevirdin: 1 L = 1000 cm³.', null, '1 L = 1000 cm³; 72.000 ÷ 1000 = 72.', '72.000 cm³’ü 10’a böldün; 1000’e bölmelisin.'], explain: '60 · 30 · 40 = 72.000 cm³ = 72 dm³ = 72 L' },
      { prompt: 'Bir konteynerin iç ölçüleri 12 m × 2 m × 2,5 m. İçine ayrıtı 0,5 m olan küp koliler diziliyor. En fazla kaç koli sığar?', choices: ['480', '60', '120', '240'], answer: 0, feedback: [null, '60 m³ konteynerin hacmi; koli sayısı değil.', 'Ayrıtlardan yalnız birini 0,5’e böldün.', 'Üç ayrıttan yalnız ikisini 0,5’e böldün.'], explain: 'Bir sırada 12 ÷ 0,5 = 24, bir katta 24 · 4 = 96, 5 katta 480 koli.' },
      { prompt: 'Ölçüleri 2 m × 1,5 m × 1 m olan dolu bir su deposunun yarısı kullanıldı. Depoda kaç litre su kaldı?', choices: ['3.000 L', '150 L', '1.500 L', '15.000 L'], answer: 2, feedback: ['Bu deponun tamamı; yarısı kullanıldı.', '1 m³ = 1000 L; 1,5 m³ = 1.500 L.', null, '1 m³ = 1000 L, 10.000 L değil.'], explain: 'Hacim 3 m³ = 3.000 L. Yarısı 1.500 L.' },
      { prompt: 'Taban ölçüleri 10 m × 5 m, derinliği 2 m olan üstü açık bir havuzun tabanı ve yan yüzleri fayansla kaplanacak. Kaç m² fayans gerekir?', choices: ['100 m²', '110 m²', '160 m²', '150 m²'], answer: 1, feedback: ['Bu havuzun hacmi (m³); fayans yüzeyi kaplar.', null, 'Havuzun üstü açık; su yüzeyine fayans döşenmez. (160 = kapalı kutunun yüzey alanı)', 'Yan yüzlerden bir çifti eksik ya da fazla; dört yan yüzü tek tek düşün.'], explain: 'Taban 50 m² + 2 · (10 · 2) + 2 · (5 · 2) = 50 + 40 + 20 = 110 m²' },
      { prompt: 'Tabanı 5 m × 4 m, yüksekliği 3 m olan bir odanın duvarları ve tavanı boyanacak (kapı ve pencereyi yok say). Kaç m² boyanır?', choices: ['54 m²', '94 m²', '74 m²', '60 m²'], answer: 2, feedback: ['Bu yalnız duvarlar; tavanı da ekle.', 'Taban boyanmaz; yer döşemesi var.', null, 'Bu odanın hacmi (m³).'], explain: 'Duvarlar 2 · (5 · 3) + 2 · (4 · 3) = 54 m², tavan 20 m² → 74 m²' },
      { prompt: 'Taban ölçüleri 50 cm × 40 cm olan bir akvaryuma bir taş atılınca su seviyesi 2 cm yükseldi. Taşın hacmi kaç litredir?', choices: ['4 L', '2 L', '40 L', '0,4 L'], answer: 0, feedback: [null, 'Yükselen suyun hacmi 50 · 40 · 2 cm³’tür.', '4.000 cm³’ü yanlış çevirdin; 1 L = 1000 cm³.', '4.000 cm³ = 4 L; 0,4 L = 400 cm³.'], explain: 'Yükselen su = 50 · 40 · 2 = 4.000 cm³ = 4 L. Taş, kendi hacmi kadar suyu yükseltir.' },
    ],
  },

  // ── İstatistiksel Araştırma Süreci ──────────────────────────────────────

  // MAT.7.6.1
  {
    id: 'g7-grafik-olustur',
    outcomes: ['MAT.7.6.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Veriyi grafiğe dök',
    instructions: 'Tablodaki kategorik veriyi kullanarak sütun grafiğini oluştur.',
    level: 1,
    launch: {
      text: 'Okul yönetimi servis sayısını artırmalı mı? Önce öğrencilerin okula nasıl geldiğini görmek gerekiyor. Bir tablo mu, bir grafik mi daha hızlı anlatır?',
    },
    reflect: 'Grafiğe bakınca tabloda göremediğin neyi fark ettin? Yönetime ne önerirdin?',
    tool: 'bargraph',
    tasks: [
      { prompt: '7-A sınıfındaki öğrencilerin okula geliş şekilleri. Grafiği oluştur.', target: { data: [{ label: 'Yürüyerek', value: 9 }, { label: 'Servis', value: 6 }, { label: 'Otobüs', value: 4 }, { label: 'Özel araç', value: 3 }] } },
      { prompt: 'Okul kütüphanesinden bir haftada ödünç alınan kitapların türleri. Grafiği oluştur.', target: { data: [{ label: 'Roman', value: 8 }, { label: 'Bilim', value: 5 }, { label: 'Tarih', value: 3 }, { label: 'Şiir', value: 2 }, { label: 'Çizgi roman', value: 7 }] } },
      { prompt: 'Sınıfın en sevdiği spor dalları. Grafiği oluştur.', target: { data: [{ label: 'Futbol', value: 7 }, { label: 'Voleybol', value: 6 }, { label: 'Basketbol', value: 5 }, { label: 'Yüzme', value: 4 }] } },
    ],
  },
  {
    id: 'g7-nokta-grafigi',
    outcomes: ['MAT.7.6.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Grafiği oku, merkezi bul',
    instructions: '13 öğrencinin bir gecelik uyku süreleri (saat) nokta grafiğinde gösteriliyor. Her nokta bir öğrenci.',
    level: 2,
    launch: {
      text: '“7. sınıf öğrencileri yeterince uyuyor mu?” Bu soruyu cevaplamak için bir sınıfın uyku sürelerini topladık. Şimdi veriye bakalım.',
      visual: dotPlot([6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 11], 5, 12, 'Uyku süresi (saat)'),
    },
    reflect: 'Bu sınıfın “tipik” uyku süresini tek bir sayıyla söylemen gerekse hangisini seçerdin? Neden?',
    questions: [
      { prompt: { text: 'Tepe değer (en sık görülen değer) kaç saattir?', visual: dotPlot([6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 11], 5, 12) }, choices: ['9', '8', '11', '4'], answer: 0, feedback: [null, '8’in üstünde 3 nokta, 9’un üstünde 4 nokta var.', '11 en büyük değer; en sık görülen değil.', '4, en sık değerin kaç kez tekrarlandığı; değerin kendisi değil.'] },
      { prompt: { text: 'Verinin açıklığı kaç saattir?', visual: dotPlot([6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 11], 5, 12) }, choices: ['5', '11', '6', '4'], answer: 0, feedback: [null, '11 en büyük değer; açıklık en büyük ile en küçük değerin farkıdır.', '6 en küçük değer.', '4 en sık değerin tekrar sayısı.'] },
      { prompt: { text: 'Ortanca kaç saattir?', visual: dotPlot([6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 11], 5, 12) }, choices: ['9', '8', '10', '8,5'], answer: 0, feedback: [null, 'Noktaları soldan say: 13 değerin tam ortası 7. değer. 7. nokta 9’un üstünde.', 'Ortadaki değer 10 değil; 10’dan sonra yalnız 1 değer var.', 'Değer sayısı tek (13); ortada tek bir değer vardır.'] },
      { prompt: 'Bu veriyi göstermek için nokta grafiği neden uygundur?', choices: ['Her öğrencinin değerini ayrı gösterir; merkez ve yayılım bir bakışta görülür.', 'Kategorik veriler için tek seçenektir.', 'Zamana bağlı değişimi gösterir.', 'Ortalamayı doğrudan yazar.'], answer: 0, feedback: [null, 'Uyku süresi kategorik değil, ölçülen (sürekli) bir veridir.', 'Zamana bağlı değişim için çizgi grafiği kullanılır.', 'Grafik ortalamayı yazmaz; ortalamayı biz hesaplarız.'] },
      { prompt: { text: 'Bir bebeğin ilk 6 aydaki boy uzunluğu gösteriliyor. Bu veri için neden çizgi grafiği seçilmiş?', visual: lineGraph([50, 54, 58, 61, 63, 65, 67], ['0. ay', '1', '2', '3', '4', '5', '6'], 50, 70, 'Boy uzunluğu (cm)') }, choices: ['Boy zamanla sürekli değişir; çizgi aradaki değişimi de gösterir.', 'Boy kategorik bir veridir.', 'Çizgi grafiği her zaman en iyi grafiktir.', 'Veride hiç tekrar yoktur.'], answer: 0, feedback: [null, 'Boy ölçülerek elde edilir; nicel (sürekli) veridir.', 'Her veri için en iyi grafik farklıdır; seçim verinin türüne bağlıdır.', 'Tekrar olmaması grafik seçimini belirlemez.'] },
      { prompt: 'Sınıfın en sevdiği meyveleri göstermek için hangi grafik uygundur?', choices: ['Sütun grafiği', 'Çizgi grafiği', 'Sayı doğrusu üzerinde nokta grafiği'], answer: 0, feedback: [null, 'Meyveler arasında zaman sırası yok; noktaları çizgiyle birleştirmek anlamsız olur.', 'Meyve adları bir sayı doğrusuna dizilemez; bu kategorik bir veridir.'] },
    ],
  },
  {
    id: 'g7-veri-turu',
    outcomes: ['MAT.7.6.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Veri türünü belirle',
    instructions: 'Her veriyi türüne göre grupla. Sayılarak elde edilen nicel veri kesikli, ölçülerek elde edilen nicel veri süreklidir.',
    level: 2,
    launch: {
      text: 'Bir araştırmada hem “kan grubu” hem “boy uzunluğu” hem de “kardeş sayısı” sorulmuş. Bu verilerin hepsi aynı şekilde mi özetlenir?',
    },
    reflect: '“Kan grubu” verisi için ortalama hesaplanabilir mi? Hangi özetleme aracı bu veri için anlamlıdır?',
    categories: [
      { id: 'kategorik', label: 'Kategorik veri', color: '#a855f7' },
      { id: 'kesikli', label: 'Nicel (kesikli) veri', color: '#3b82f6' },
      { id: 'surekli', label: 'Nicel (sürekli) veri', color: '#22c55e' },
    ],
    items: [
      { content: 'Öğrencilerin göz rengi', category: 'kategorik' },
      { content: 'En sevilen spor dalı', category: 'kategorik' },
      { content: 'Kan grubu', category: 'kategorik', explain: 'A, B, AB, 0 birer kategoridir; sayı değildir.' },
      { content: 'Okula ulaşım şekli', category: 'kategorik' },
      { content: 'Ailedeki kardeş sayısı', category: 'kesikli', explain: 'Kardeşler sayılır; 2,5 kardeş olmaz.' },
      { content: 'Kütüphanedeki kitap sayısı', category: 'kesikli' },
      { content: 'Boy uzunluğu (cm)', category: 'surekli', explain: 'Boy ölçülür; 152,3 cm gibi ara değerler alabilir.' },
      { content: 'Günlük uyku süresi', category: 'surekli' },
      { content: 'Hava sıcaklığı (°C)', category: 'surekli' },
      { content: '100 m koşu süresi', category: 'surekli' },
    ],
  },
  {
    id: 'g7-merkez-secimi',
    outcomes: ['MAT.7.6.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Veriye dayalı karar ver',
    instructions: 'Araştırma sürecinin her adımında doğru aracı seç: soru, örneklem, grafik ve özetleme değeri.',
    level: 3,
    launch: {
      text: 'Bir ayakkabı mağazası yeni sezon için sipariş verecek. Müşterilerin ayak numaralarının ortalamasını mı almalı, yoksa başka bir değere mi bakmalı?',
    },
    reflect: 'Ortalama, ortanca ve tepe değerden hangisinin “en iyi” olduğu neye bağlı? Bir örnekle açıkla.',
    questions: [
      { prompt: 'Ayakkabı mağazası en çok hangi numarayı sipariş etmeli? Hangi değer işine yarar?', choices: ['Tepe değer', 'Aritmetik ortalama', 'Açıklık', 'Ortalama mutlak sapma'], answer: 0, feedback: [null, 'Ortalama 38,6 gibi hiç satılmayan bir numara çıkabilir; en çok satılan numara tepe değerdir.', 'Açıklık verinin ne kadar yayıldığını söyler, hangi numaranın çok satıldığını değil.', 'Bu değer yayılımı anlatır, en çok istenen numarayı değil.'] },
      { prompt: '5, 6, 6, 7, 50 veri grubunun merkezini en iyi hangi değer temsil eder?', choices: ['Aritmetik ortalama (14,8)', 'Açıklık (45)', 'Ortanca (6)', 'En büyük değer (50)'], answer: 2, feedback: ['50 uç değeri ortalamayı büyütüyor; verilerin çoğu 14,8’in çok altında.', 'Açıklık merkez değil, yayılım ölçüsüdür.', null, 'Tek bir uç değer veriyi temsil etmez.'], explain: '50 uç değeri ortalamayı büyütür; ortanca uç değerden etkilenmez.' },
      { prompt: 'Hangisi istatistiksel bir araştırma sorusu olmaya EN UYGUNDUR?', choices: ['Benim boyum kaç cm?', 'Ankara Türkiye’nin başkenti midir?', '7. sınıf öğrencileri günde ortalama kaç saat uyuyor?', 'Bugün hangi gün?'], answer: 2, feedback: ['Tek bir ölçümle cevaplanır; veride değişkenlik yok.', 'Cevabı bilinen bir bilgi; veri toplamaya gerek yok.', null, 'Takvime bakınca cevaplanır; veri toplanmaz.'], explain: 'Araştırma sorusu veri toplanarak cevaplanabilmeli ve verinin değişkenlik göstermesi beklenmelidir.' },
      { prompt: 'Okuldaki bütün 7. sınıf öğrencileri araştırmanın evreni ise rastgele seçilen 40 öğrenci nedir?', choices: ['Evren', 'Örneklem', 'Ortanca', 'Açıklık'], answer: 1, feedback: ['Evren bütün 7. sınıflardır; 40 öğrenci onun bir parçası.', null, 'Ortanca bir özetleme değeridir.', 'Açıklık bir yayılım ölçüsüdür.'] },
      { prompt: 'İki sınıfın matematik puan ortalamaları 70’tir. A sınıfının ortalama mutlak sapması 4, B sınıfınınki 12’dir. Hangisi doğrudur?', choices: ['B sınıfının puanları ortalamaya daha yakındır.', 'İki sınıfın puanları aynı şekilde dağılmıştır.', 'A sınıfının puanları ortalamaya daha yakındır.', 'A sınıfının ortalaması daha yüksektir.'], answer: 2, feedback: ['Ortalama mutlak sapma büyükse puanlar ortalamadan daha uzağa yayılmıştır.', 'Ortalamalar aynı ama yayılımlar farklı.', null, 'Ortalamalar eşit: ikisi de 70.'], explain: 'Ortalama mutlak sapma küçükse veriler ortalama etrafında toplanmıştır.' },
      { prompt: 'Elif mahallesindeki marketlerde satılan makarna çeşitlerini araştırıyor ama yalnızca evinin yanındaki marketi inceliyor. Bu araştırmadaki sorun nedir?', choices: ['Örneklem evreni temsil etmiyor.', 'Veri türü yanlış seçilmiş.', 'Ortalama hesaplanamaz.', 'Hiçbir sorun yoktur.'], answer: 0, feedback: [null, 'Makarna çeşidi kategorik bir veri olarak doğru toplanabilir; sorun örneklemde.', 'Sorun hesaplamada değil, verinin nereden toplandığında.', 'Tek market, mahallenin bütün marketlerini temsil etmez.'] },
    ],
  },
  {
    id: 'g7-t3-hangisi-farkli',
    outcomes: ['MAT.7.6.1'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Dört veri grubunun da aritmetik ortalaması 5. Yine de birbirlerinden farklılar! Birini seç ve gerekçeni düşün.',
    level: 3,
    launch: {
      text: 'Dört arkadaşın dört sınavdaki puanları (10 üzerinden) yazıldı. Hepsinin ortalaması 5 çıktı. “O hâlde hepsi aynı” diyebilir miyiz?',
    },
    reflect: 'Ortalaması aynı olan iki veri grubunu birbirinden ayırmak için hangi ölçülere bakardın?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['2, 4, 6, 8', '5, 5, 5, 5', '1, 5, 5, 9', '3, 4, 5, 8'],
        answer: 0,
        reasons: ['Değerleri eşit aralıklarla (2’şer) artan tek veri grubu.', 'Açıklığı 0 olan tek veri grubu; ortalama mutlak sapması da 0.', 'Açıklığı en büyük (8) olan tek veri grubu.', 'Ortancası (4,5) ortalamasından (5) farklı olan tek veri grubu.'],
      },
    ],
  },

  // MAT.7.6.2
  {
    id: 'g7-yaniltici-grafik',
    outcomes: ['MAT.7.6.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Grafik doğru mu söylüyor?',
    instructions: 'Grafikleri dikkatle incele: eksen nereden başlıyor, şekiller nasıl büyütülmüş?',
    level: 2,
    launch: {
      text: 'Bir reklamda B Marketi’nin sütunu A Marketi’ninkinin üç katı uzun. Reklam “Müşterilerimiz rakibimizin üç katı!” diyor. Gerçekten öyle mi?',
      visual: SVG_MISLEADING,
    },
    reflect: 'Sosyal medyada gördüğün bir grafiğe güvenmeden önce hangi üç şeyi kontrol edersin?',
    questions: [
      { prompt: { text: 'Can, grafiğe bakarak “B Marketinin müşteri sayısı A Marketinin 3 katı.” diyor. Can haklı mı?', visual: SVG_MISLEADING }, choices: ['Evet, B’nin sütunu 3 kat uzun.', 'Hayır; dikey eksen 90’dan başlıyor, 96 müşteri 92’nin 3 katı değildir.', 'Evet, çünkü B turuncu renkte.', 'Hayır, A Marketi daha fazla müşteriye sahip.'], answer: 1, feedback: ['Sütunların boyuna değil, eksendeki sayılara bak: Eksen 0’dan başlamıyor.', null, 'Rengin sayıyla ilgisi yok.', 'A’nın değeri 92, B’nin 96; B biraz daha fazla.'], explain: 'Eksenin 0’dan başlamaması farkı olduğundan büyük gösterir.' },
      { prompt: { text: 'Aynı veriler eksen 0’dan başlayınca böyle görünüyor. Hangi yorum doğrudur?', visual: SVG_HONEST }, choices: ['İki marketin müşteri sayıları birbirine çok yakındır (92 ve 96).', 'B Marketi A’nın 3 katı müşteriye sahiptir.', 'A Marketinin hiç müşterisi yoktur.', 'B Marketi A’nın 2 katı müşteriye sahiptir.'], answer: 0, feedback: [null, '0’dan başlayan grafikte sütunlar neredeyse eşit.', 'A’nın sütunu 92’ye kadar uzanıyor.', '96, 92’nin 2 katı değildir.'] },
      { prompt: { text: 'Dikilen fidan sayısı 100’den 200’e çıktı. Grafikte kare simgenin hem eni hem boyu 2 katına çıkarılmış. Bu neden yanıltıcı?', visual: SVG_BIG_ICON }, choices: ['Büyük kare küçüğün 4 katı yer kaplıyor; artış 2 kat olduğu hâlde 4 kat gibi görünüyor.', 'Yanıltıcı değil; kare 2 kat büyük.', 'İki kare aynı büyüklükte.', 'Yanıltıcıdır, çünkü fidanlar kare değildir.'], answer: 0, feedback: [null, 'Eni de boyu da 2 katına çıkınca alan 2 · 2 = 4 katına çıkar.', 'Büyük karenin kenarı küçüğünkinin 2 katı.', 'Sorun simgenin şekli değil, büyütülme biçimi.'] },
      { prompt: 'Bir haberde “Okulumuzdaki öğrencilerin %80’i kahvaltı yapıyor.” deniyor. Soru yalnız sabah kantinde kahvaltı eden 20 öğrenciye sorulmuş. Sorun nedir?', choices: ['Örneklem yanlı seçilmiş; zaten kahvaltı yapanlara sorulmuş.', 'Yüzde yanlış hesaplanmış.', '20 kişi tek sayı değildir.', 'Hiçbir sorun yoktur.'], answer: 0, feedback: [null, 'Hesap doğru olsa bile soru yanlış kişilere sorulmuş.', 'Örneklemin tek ya da çift olması önemli değil; temsil etmesi önemli.', 'Kantinde kahvaltı edenler bütün okulu temsil etmez.'] },
    ],
  },
  {
    id: 'g7-gecerli-mi-hatali-mi',
    outcomes: ['MAT.7.6.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Veriyle desteklenir mi?',
    instructions: 'Rastgele seçilen 60 yedinci sınıf öğrencisinin günlük ekran süresi: ortalama 3 saat, ortanca 2,5 saat, açıklık 6 saat. Her yorumu doğru gruba koy.',
    level: 3,
    launch: {
      text: 'Bir araştırmanın sonuçları açıklandı ve herkes farklı bir yorum yaptı. Hangi yorumlar gerçekten veriden çıkıyor, hangileri abartı?',
    },
    reflect: '“Ortalama 3 saat” bilgisi neden “herkes 3 saat ekrana bakıyor” anlamına gelmez? Bir örnek veri grubu uydurarak göster.',
    categories: [
      { id: 'gecerli', label: 'Veriyle desteklenir', color: '#22c55e' },
      { id: 'hatali', label: 'Hatalı ya da yanlı yorum', color: '#ef4444' },
    ],
    items: [
      { content: 'Öğrencilerin yaklaşık yarısının ekran süresi 2,5 saatten azdır.', category: 'gecerli', explain: 'Ortanca 2,5 saat: verilerin yarısı bunun altında, yarısı üstünde.' },
      { content: 'En uzun ve en kısa ekran süresi arasındaki fark 6 saattir.', category: 'gecerli' },
      { content: 'Ortalamanın ortancadan büyük olması, bazı öğrencilerin çok uzun süre ekrana baktığını düşündürür.', category: 'gecerli', explain: 'Büyük uç değerler ortalamayı ortancadan daha çok yukarı çeker.' },
      { content: 'Sonuçlar bu okuldaki 7. sınıflar hakkında fikir verebilir.', category: 'gecerli' },
      { content: 'Bütün öğrenciler günde tam 3 saat ekrana bakıyor.', category: 'hatali', explain: 'Ortalama, herkesin değerinin aynı olduğunu söylemez; açıklık 6 saat.' },
      { content: 'Ekran süresi 3 saatten fazla olan hiç öğrenci yoktur.', category: 'hatali' },
      { content: 'Bu sonuçlar Türkiye’deki bütün yetişkinler için geçerlidir.', category: 'hatali', explain: 'Örneklem 7. sınıf öğrencileri; yetişkinleri temsil etmez.' },
      { content: 'Ortalama 3 saat olduğuna göre en az bir öğrencinin ekran süresi tam 3 saattir.', category: 'hatali', explain: 'Ortalama veri grubunda bulunmak zorunda değildir.' },
    ],
  },
  {
    id: 'g7-yorumlari-tartis',
    outcomes: ['MAT.7.6.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bu yorum doğru mu?',
    instructions: 'Başkalarının yaptığı istatistiksel yorumları eleştirel gözle incele: Örneklem, soru ve özetleme değeri uygun mu?',
    level: 3,
    launch: {
      text: 'Bir haber sitesi “Bu ilçede ortalama gelir çok yüksek!” diye manşet atmış. Ama ilçede yaşayanların çoğu buna şaşırmış. Neden olabilir?',
    },
    reflect: 'Yanlı ya da hatalı bir istatistiksel yorum kimlere zarar verebilir? Bir örnek düşün.',
    questions: [
      { prompt: 'Bir spor salonunun önünde 50 kişiye “Spor yapmayı sever misiniz?” diye soruldu, %90’ı “evet” dedi. “Türkiye’deki insanların %90’ı sporu sever.” sonucu için ne söylenebilir?', choices: ['Doğrudur, 50 kişi yeterlidir.', 'Yanlıdır; örneklem evreni temsil etmiyor.', 'Doğrudur, çünkü yüzde hesabı doğru.', 'Yanlıdır, çünkü 50 tek sayı değildir.'], answer: 1, feedback: ['Sayı kadar, kimlere sorulduğu da önemlidir: Spor salonundakiler sporu zaten seviyor.', null, 'Hesap doğru olsa da örneklem yanlı.', 'Örneklemin tek ya da çift olmasının önemi yok.'] },
      { prompt: 'Bir ilçede 9 kişi ayda 20.000 TL, 1 kişi 2.000.000 TL kazanıyor. Haber: “Bu ilçede ortalama gelir 218.000 TL!” Hangisi doğrudur?', choices: ['Herkes yaklaşık 218.000 TL kazanıyor.', 'Ortalama yanlış hesaplanmıştır.', 'Ortalama uç değerden etkilenmiş; ortanca (20.000 TL) durumu daha iyi yansıtır.', 'Ortanca 2.000.000 TL’dir.'], answer: 2, feedback: ['10 kişiden 9’u 20.000 TL kazanıyor; 218.000 TL kimsenin gelirine yakın değil.', 'Hesap doğru: (9 · 20.000 + 2.000.000) ÷ 10 = 218.000.', null, 'Sıralı 10 değerin ortasındakiler 20.000 TL’dir.'] },
      { prompt: 'Can sınıfında 5 kişiye sordu; 4’ü kediyi seçti. “Okulumuzda en sevilen hayvan kedidir.” dedi. Bu yorumdaki temel sorun nedir?', choices: ['Örneklem çok küçük ve okulu temsil etmiyor.', 'Kedi sayısı yanlış sayılmış.', 'Veri kategorik değildir.', 'Hiçbir sorun yoktur.'], answer: 0, feedback: [null, 'Sayım doğru; sorun kimlere sorulduğunda.', 'En sevilen hayvan kategorik bir veridir.', '5 kişi bütün okulu temsil edemez.'] },
      { prompt: 'Anket sorusu: “Okulumuzun harika kantinini sen de beğeniyor musun?” Bu soruyla ilgili sorun nedir?', choices: ['Soru çok kısadır.', 'Soru yönlendiricidir; yanlı cevaplara yol açar.', 'Kantin hakkında soru sorulamaz.', 'Cevaplar sayısal olmalıdır.'], answer: 1, feedback: ['Kısalık sorun değil; “harika” sözcüğü cevabı etkiliyor.', null, 'Her konuda soru sorulabilir; önemli olan tarafsız olması.', 'Kategorik cevaplar da istatistikte kullanılır.'] },
      { prompt: 'A sınıfındaki puanların açıklığı 10, B sınıfındakilerin açıklığı 40’tır. Mert: “B sınıfının puanları daha tutarlıdır.” diyor. Mert haklı mı?', choices: ['Evet, açıklığı büyük olan daha tutarlıdır.', 'Hayır; açıklığı küçük olan A sınıfının puanları birbirine daha yakındır.', 'Evet, çünkü B sınıfı daha kalabalıktır.', 'Açıklıkla tutarlılık hakkında bir şey söylenemez.'], answer: 1, feedback: ['Açıklık büyükse puanlar birbirinden uzak, yani daha az tutarlıdır.', null, 'Sınıf mevcutları hakkında bilgi verilmedi.', 'Açıklık, verilerin ne kadar yayıldığı hakkında fikir verir.'] },
    ],
  },

  // ── Dönüşüm ─────────────────────────────────────────────────────────────

  // MAT.7.3.1
  {
    id: 'g7-yansimayi-tamamla',
    outcomes: ['MAT.7.3.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Yansımayı oluştur',
    instructions: 'Her kare, simetri doğrusuna aynı uzaklıkta, doğrunun öbür tarafına yansır. Şeklin yansımasını boya.',
    level: 2,
    launch: {
      text: 'Aynanın 30 cm önünde duruyorsun. Aynadaki görüntün aynanın ne kadar “arkasında” görünür? Kareli kâğıtta deneyelim.',
    },
    reflect: 'Şekil simetri doğrusundan uzaktayken yansımayı nasıl buldun? Her kareyi tek tek mi taşıdın, yoksa başka bir yol mu buldun?',
    tool: 'symmetry',
    config: { size: 10 },
    tasks: [
      { prompt: 'Şeklin dikey simetri doğrusuna göre yansımasını oluştur.', target: { cells: ['1,2', '2,2', '3,2', '4,2', '4,3', '4,4', '3,4', '2,5', '2,6'], axis: 'v' }, hints: ['Her karenin doğruya kaç kare uzaklıkta olduğunu say.', 'Öbür tarafta aynı uzaklıkta boya.'] },
      { prompt: 'Şeklin yatay simetri doğrusuna göre yansımasını oluştur.', target: { cells: ['2,1', '3,1', '4,1', '5,1', '6,1', '4,2', '4,3', '4,4', '7,3'], axis: 'h' }, hints: ['Yatay doğruda yukarıdaki kareler aşağıya yansır. Sağ–sol değişir mi?'] },
      { prompt: 'Şekil simetri doğrusundan uzakta. Yansımasını oluştur; uzaklıkları koru!', target: { cells: ['0,3', '1,3', '1,4', '2,4', '1,5', '1,6'], axis: 'v' }, hints: ['Doğruya en uzak kare, yansımada da doğruya en uzak olmalı.'], explain: 'Bir nokta ile görüntüsü simetri doğrusuna eşit uzaklıktadır.' },
    ],
  },
  {
    id: 'g7-yansima-ozellikleri',
    outcomes: ['MAT.7.3.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Yansımanın özellikleri',
    instructions: 'Kırmızı çizgi simetri doğrusudur. Şekilleri inceleyip soruları cevapla.',
    level: 2,
    launch: {
      text: 'Bir kelebeğin kanatlarını düşün. Bir kanadı katlayıp öbürünün üzerine kapatsan tam örtüşür. Bu örtüşme bize hangi özellikleri anlatır?',
    },
    reflect: 'Bir şekil ile yansıması arasında neler değişmez, ne değişir? En az üç özellik say.',
    questions: [
      { prompt: 'Hangi şekilde mavi şekiller dikey doğruya göre birbirinin yansımasıdır?', choices: [{ visual: grid(8, 5, [...L_SHAPE, ...shift(L_SHAPE, 4, 0)], 'v') }, { visual: grid(8, 5, [...L_SHAPE, ...mirrorV(L_SHAPE, 8)], 'v') }, { visual: grid(8, 5, [...L_SHAPE, ...mirrorH(mirrorV(L_SHAPE, 8), 5)], 'v') }, { visual: grid(8, 5, [...L_SHAPE, ...shift(mirrorV(L_SHAPE, 8), 0, 1)], 'v') }], answer: 1, feedback: ['Bu şekil yalnız kaydırılmış (ötelenmiş); yansımada şekil ters döner.', null, 'Bu şekil ayrıca baş aşağı da çevrilmiş; dikey doğruda yalnız sağ–sol değişir.', 'Yansıma doğruya dik olarak olur; şekil bir kare yukarı kaymamalı.'], explain: 'Yansımada her nokta doğruya dik olarak, aynı uzaklıkta öbür tarafa geçer.' },
      { prompt: 'Hangi şekilde mavi şekiller yatay doğruya göre birbirinin yansımasıdır?', choices: [{ visual: grid(6, 8, [...T_SHAPE, ...mirrorV(mirrorH(T_SHAPE, 8), 6)], 'h') }, { visual: grid(6, 8, [...T_SHAPE, ...shift(T_SHAPE, 0, 4)], 'h') }, { visual: grid(6, 8, [...T_SHAPE, ...shift(mirrorH(T_SHAPE, 8), 1, 0)], 'h') }, { visual: grid(6, 8, [...T_SHAPE, ...mirrorH(T_SHAPE, 8)], 'h') }], answer: 3, feedback: ['Bu şekil ayrıca sağ–sol da çevrilmiş.', 'Bu şekil yalnız aşağı kaydırılmış; ters dönmemiş.', 'Görüntü bir kare sağa kaymış; yansıma doğruya dik olmalı.', null] },
      { prompt: 'Bir nokta simetri doğrusuna 3 birim uzaklıktadır. Yansıması simetri doğrusuna kaç birim uzaklıktadır?', choices: ['6 birim', '3 birim', '1,5 birim', '0 birim'], answer: 1, feedback: ['6 birim, nokta ile yansıması arasındaki uzaklıktır.', null, 'Uzaklık yarıya inmez; korunur.', 'Yansıma ancak nokta doğrunun üzerindeyse doğrunun üzerinde olur.'] },
      { prompt: 'Bir şekil ile yansıma dönüşümü altındaki görüntüsü için hangisi her zaman doğrudur?', choices: ['Görüntü daha büyüktür.', 'Görüntü daha küçüktür.', 'Şekil ile görüntüsü eştir.', 'Görüntünün yönü değişmez.'], answer: 2, feedback: ['Ayna şekli büyütmez.', 'Ayna şekli küçültmez.', null, 'Yansımada sağ ile sol yer değiştirir; yön değişir.'], explain: 'Yansıma şeklin boyutlarını ve açılarını korur.' },
      { prompt: 'Bir noktayı yansımasıyla birleştiren doğru parçası simetri doğrusuna göre nasıldır?', choices: ['Simetri doğrusuna paraleldir.', 'Simetri doğrusuna diktir ve doğru onu ortalar.', 'Simetri doğrusuyla 45° açı yapar.', 'Simetri doğrusunun üzerindedir.'], answer: 1, feedback: ['Paralel olsaydı nokta doğrunun öbür tarafına geçemezdi.', null, 'Açı her zaman 90°’dir.', 'Yalnız doğrunun üzerindeki noktalar kendi yansımasıdır.'] },
      { prompt: 'Dik kenar uzunlukları farklı olan bir dik üçgen, dik kenarlarından birine göre yansıtılıyor. Üçgen ve görüntüsü birlikte hangi şekli oluşturur?', choices: ['Kare', 'Dikdörtgen', 'Yamuk', 'İkizkenar üçgen'], answer: 3, feedback: ['Ortak kenarın iki yanında iki eş üçgen oluşur; kare oluşmaz.', 'Dikdörtgen için ikinci üçgenin döndürülerek eklenmesi gerekir; yansımada eş dik kenarlar yan yana gelir.', 'Paralel kenar çifti oluşmaz.', null], explain: 'Yansıtılan dik kenar ortak kenar olur; hipotenüsler eşit iki kenarı oluşturur.' },
    ],
  },
  {
    id: 'g7-simetrik-mi',
    outcomes: ['MAT.7.3.1'],
    type: 'categorize',
    stage: 'model',
    title: 'Yansıma mı, değil mi?',
    instructions: 'İki mavi şekil kırmızı doğruya göre birbirinin yansıması mı? Doğru gruba sürükle.',
    level: 2,
    launch: {
      text: 'Halı ve kilim desenlerinde aynı motif tekrar eder; bazen yansıyarak, bazen yalnız kayarak. Farkı nasıl anlarız?',
    },
    reflect: 'İki eş şeklin bir doğruya göre simetrik olup olmadığını anlamak için hangi noktaları kontrol ettin?',
    categories: [
      { id: 'evet', label: 'Doğruya göre simetrik', color: '#22c55e' },
      { id: 'hayir', label: 'Simetrik değil', color: '#ef4444' },
    ],
    items: [
      { content: { visual: grid(8, 6, [...P1, ...mirrorV(P1, 8)], 'v') }, category: 'evet' },
      { content: { visual: grid(8, 6, [...P1, ...shift(P1, 4, 0)], 'v') }, category: 'hayir', explain: 'Şekil yalnız kaydırılmış; ters dönmemiş.' },
      { content: { visual: grid(8, 6, [...P2, ...mirrorV(P2, 8)], 'v') }, category: 'evet' },
      { content: { visual: grid(8, 6, [...P2, ...mirrorH(mirrorV(P2, 8), 6)], 'v') }, category: 'hayir', explain: 'Görüntü ayrıca baş aşağı çevrilmiş.' },
      { content: { visual: grid(6, 8, [...Q1, ...mirrorH(Q1, 8)], 'h') }, category: 'evet' },
      { content: { visual: grid(6, 8, [...Q1, ...shift(Q1, 0, 4)], 'h') }, category: 'hayir', explain: 'Şekil yalnız aşağı kaydırılmış.' },
      { content: { visual: grid(6, 8, [...Q2, ...mirrorH(Q2, 8)], 'h') }, category: 'evet' },
      { content: { visual: grid(6, 8, [...Q2, ...shift(mirrorH(Q2, 8), 1, 0)], 'h') }, category: 'hayir', explain: 'Görüntü bir kare yana kaymış; uzaklıklar korunmamış.' },
    ],
  },
  {
    id: 'g7-t4-hangisi-farkli',
    outcomes: ['MAT.7.3.1'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Simetri doğrularını düşün. Birini seç ve neden farklı olduğunu açıkla. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: {
      text: 'Bir logo tasarımcısı harfleri ve şekilleri simetri doğrularına göre inceliyor. Bazıları dikey, bazıları yatay doğruya göre simetrik; bazılarının hiç simetri doğrusu yok.',
    },
    reflect: 'Kendi adının harflerinden hangilerinin simetri doğrusu var? Dikey mi, yatay mı?',
    questions: [
      {
        prompt: 'Hangisi farklı? (Harfleri düz, süssüz yazı tipinde düşün.)',
        choices: ['A', 'B', 'H', 'N'],
        answer: 0,
        reasons: ['Yalnız dikey simetri doğrusu olan tek harf.', 'Yalnız yatay simetri doğrusu olan tek harf.', 'Hem dikey hem yatay simetri doğrusu olan tek harf.', 'Hiç simetri doğrusu olmayan tek harf.'],
      },
      {
        prompt: 'Hangisi farklı? Simetri doğrularını say.',
        choices: ['Kare', 'Dikdörtgen', 'İkizkenar üçgen', 'Paralelkenar'],
        answer: 0,
        reasons: ['4 simetri doğrusu olan tek şekil.', 'Tam olarak 2 simetri doğrusu olan tek şekil.', 'Yalnız 1 simetri doğrusu olan ve 3 kenarlı tek şekil.', 'Hiç simetri doğrusu olmayan tek şekil (kare, dikdörtgen ya da eşkenar dörtgen olmayan bir paralelkenar).'],
      },
    ],
  },

  // MAT.7.3.2
  {
    id: 'g7-orta-dikme-aciortay',
    outcomes: ['MAT.7.3.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Simetri doğrusundan inşaya',
    instructions: 'Simetri doğrusunun özelliklerinden yararlanarak soruları cevapla.',
    level: 2,
    launch: {
      text: 'Bir doğru parçasını iki ucu üst üste gelecek şekilde katlarsan kat izi ne olur? Bir açıyı iki kolu üst üste gelecek şekilde katlarsan?',
      visual: SVG_PERP_BUILD,
    },
    reflect: 'Orta dikmenin “doğru parçasının simetri doğrusu” olduğunu kâğıt katlayarak bir arkadaşına nasıl gösterirsin?',
    questions: [
      { prompt: { text: 'A ve B merkezli, aynı açıklıkta iki yay K ve L noktalarında kesişiyor. K noktası için hangisi doğrudur?', visual: SVG_PERP_BUILD }, choices: ['A’ya ve B’ye eşit uzaklıktadır.', 'A’ya B’den daha yakındır.', '[AB]’nin üzerindedir.', 'A’ya uzaklığı [AB]’nin yarısıdır.'], answer: 0, feedback: [null, 'İki yay aynı açıklıkla çizildi; K iki yayın da üzerinde.', 'K, [AB]’nin üstünde, dışarıda bir nokta.', 'Pergel açıklığı [AB]’nin yarısından büyük seçildi.'], explain: 'K ve L, A ile B’ye eşit uzaklıkta olduğu için KL doğrusu [AB]’nin simetri doğrusu, yani orta dikmesidir.' },
      { prompt: { text: 'd doğrusu [AB]’nin orta dikmesidir. |PA| = 7 cm ise |PB| kaç cm’dir?', visual: SVG_PERP_P }, choices: ['3,5 cm', '7 cm', '14 cm', '10 cm'], answer: 1, feedback: ['P, [AB]’nin orta noktası değil; d üzerinde başka bir nokta.', null, '|PA| ile |PB| toplanmaz; P iki uca eşit uzaklıkta.', 'Orta dikme üzerindeki her nokta A ve B’ye eşit uzaklıktadır.'], explain: 'Orta dikme [AB]’nin simetri doğrusudur; üzerindeki her nokta A ve B’ye eşit uzaklıktadır.' },
      { prompt: 'Bir doğru parçasının simetri doğrusu aynı zamanda o doğru parçasının nesidir?', choices: ['Açıortayı', 'Orta dikmesi', 'Kenarortayı', 'Köşegeni'], answer: 1, feedback: ['Açıortay bir açıya aittir.', null, 'Kenarortay bir üçgende köşeden çizilir.', 'Köşegen çokgenlere aittir.'] },
      { prompt: 'Bir açının simetri doğrusu aynı zamanda o açının nesidir?', choices: ['Açıortayı', 'Orta dikmesi', 'Tümleri', 'Bütünleri'], answer: 0, feedback: [null, 'Orta dikme bir doğru parçasına aittir.', 'Tümler bir açı ölçüsüdür, doğru değildir.', 'Bütünler bir açı ölçüsüdür, doğru değildir.'] },
      { prompt: { text: '[OC, AOB açısının açıortayıdır. m(AOB) = 80° ise m(AOC) kaç derecedir?', visual: SVG_ANGLE_BIS }, choices: ['80°', '20°', '40°', '160°'], answer: 2, feedback: ['Bu bütün açı; açıortay onu ikiye böler.', 'Açıyı dörde böldün; açıortay ikiye böler.', null, 'Açıortay açıyı büyütmez.'], explain: 'Açıortay açıyı iki eş açıya ayırır: 80° ÷ 2 = 40°' },
      { prompt: 'Açıortay üzerindeki bir nokta için hangisi doğrudur?', choices: ['Açının köşesine en yakın noktadır.', 'Açının kollarına eşit uzaklıktadır.', 'Açının kollarından birinin üzerindedir.', 'Açının dışında kalır.'], answer: 1, feedback: ['Açıortay üzerinde köşeye yakın ve uzak birçok nokta var.', null, 'Açıortay iki kolun arasındadır.', 'Açıortay açının içinde kalır.'] },
    ],
  },
  {
    id: 'g7-insa-adimlari',
    outcomes: ['MAT.7.3.2'],
    type: 'sort',
    stage: 'sembol',
    title: 'İnşa adımlarını sırala',
    instructions: 'Pergel ve ölçüsüz cetvelle yapılan inşanın adımlarını doğru sıraya koy.',
    level: 2,
    launch: {
      text: 'Pergel ve ölçüsüz cetvelle cetvelin sayılarına hiç bakmadan bir doğru parçasını tam ortasından dik kesebilirsin. Adımları nasıl sıralamalı?',
    },
    reflect: 'Orta dikme inşasında pergel açıklığını neden iki yayda da aynı tutmak zorundasın?',
    rounds: [
      { prompt: '[AB] doğru parçasının orta dikmesini inşa et.', items: ['Pergeli [AB]’nin yarısından daha geniş aç.', 'Pergelin sivri ucunu A’ya koyup bir yay çiz.', 'Açıklığı bozmadan B merkezli bir yay çiz.', 'Yayların kesiştiği iki noktayı işaretle.', 'Bu iki noktayı cetvelle birleştir.'], explain: 'Kesişim noktaları A ve B’ye eşit uzaklıktadır; bu yüzden onları birleştiren doğru [AB]’nin simetri doğrusudur.' },
      { prompt: 'AOB açısının açıortayını inşa et.', items: ['O merkezli, iki kolu da kesen bir yay çiz.', 'Yayın kolları kestiği noktalara D ve E de.', 'D ve E merkezli, aynı açıklıkta iki yay çiz.', 'Bu yayların kesiştiği noktaya F de.', 'O’dan F’ye bir ışın çiz.'], explain: '|OD| = |OE| olduğundan kollardan eşit parçalar kesildi; F, D ve E’ye eşit uzaklıkta olduğu için [OF açıortaydır.' },
      { prompt: 'Simetrik iki şeklin gizlenmiş simetri doğrusunu bul.', items: ['Şekillerde birbirine karşılık gelen iki noktayı belirle.', 'Bu iki noktayı birleştiren doğru parçasını çiz.', 'Doğru parçasının orta noktasını bul.', 'Orta noktadan doğru parçasına dik bir doğru çiz.'] },
    ],
  },
  {
    id: 'g7-orta-dikme-problem',
    outcomes: ['MAT.7.3.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çeşme nereye, bank nereye?',
    instructions: 'Gerçek yaşam durumlarında orta dikme ve açıortayın özelliklerini kullan.',
    level: 3,
    launch: {
      text: 'İki köy arasına bir çeşme yapılacak ve iki köy de eşit yol yürümek istiyor. Çeşme yalnız bir noktaya mı yapılabilir?',
    },
    reflect: 'Çeşmenin yapılabileceği yerler neden bir doğru oluşturuyor? Bu doğruyu pergelle nasıl çizersin?',
    questions: [
      { prompt: 'İki köye eşit uzaklıkta bir çeşme yapılacak. Çeşme nerelere yapılabilir?', choices: ['Köyleri birleştiren doğru parçasının orta dikmesi üzerindeki herhangi bir noktaya', 'Yalnız iki köyün tam ortasına', 'Köylerden birinin yanına', 'Köyleri birleştiren yol üzerindeki herhangi bir noktaya'], answer: 0, feedback: [null, 'Orta nokta bir seçenek ama tek seçenek değil: Orta dikme üzerindeki her nokta iki köye eşit uzaklıktadır.', 'O zaman köylerden biri diğerinden daha az yürür.', 'Yol üzerinde yalnız orta nokta iki köye eşit uzaklıktadır.'] },
      { prompt: 'Bir park, kesişen iki caddenin arasındaki açıda. Bank, iki caddeye eşit uzaklıkta olacak. Bank nereye konmalı?', choices: ['İki caddenin oluşturduğu açının açıortayı üzerine', 'Caddelerden birinin kenarına', 'Caddelerin kesişim noktasına', 'Açının dışına'], answer: 0, feedback: [null, 'O zaman bir caddeye çok yakın, öbürüne uzak olur.', 'Kesişim noktası iki caddeye de 0 uzaklıkta; ama bank caddenin ortasına konmaz.', 'Park açının içinde.'] },
      { prompt: 'd doğrusu [AB]’nin orta dikmesi; P noktası d üzerinde. |PA| = 2x + 1 cm ve |PB| = 9 cm ise x kaçtır?', choices: ['4', '5', '9', '3,5'], answer: 0, feedback: [null, '2 · 5 + 1 = 11 eder, 9 değil.', '9, |PB|’nin uzunluğu; x değil.', '2 · 3,5 + 1 = 8 eder.'], explain: '|PA| = |PB| → 2x + 1 = 9 → x = 4' },
      { prompt: 'm(XOY) = 130°. Açıortayın ayırdığı açıların her biri kaç derecedir?', choices: ['65°', '130°', '260°', '50°'], answer: 0, feedback: [null, 'Bu bütün açı.', 'Açıortay açıyı ikiye böler, iki katına çıkarmaz.', '180° − 130° = 50° tümler/bütünler hesabı; burada açıyı ikiye bölüyoruz.'] },
      { prompt: 'Orta dikme inşasında pergel açıklığı neden [AB]’nin yarısından büyük olmalıdır?', choices: ['Daha küçük olursa yaylar kesişmez.', 'Daha düzgün yay çizilir.', 'Pergel daha az kayar.', 'Kural böyle olduğu için.'], answer: 0, feedback: [null, 'Yayın düzgünlüğü açıklığa bağlı değil.', 'Asıl neden geometrik: Yayların kesişmesi gerekir.', 'Kuralın bir nedeni var: Açıklık yarıdan küçükse iki yay birbirine ulaşmaz.'] },
    ],
  },

  // ── Geometrik Şekiller ──────────────────────────────────────────────────

  // MAT.7.5.1
  {
    id: 'g7-yardimci-eleman-eslestir',
    outcomes: ['MAT.7.5.1'],
    type: 'match',
    stage: 'model',
    title: 'Çizim ↔ eleman adı',
    instructions: 'Kırmızı ile çizilen elemanı adıyla eşleştir. Küçük çizgiler eş uzunlukları, α’lar eş açıları gösterir.',
    level: 2,
    launch: {
      text: 'Üçgen şeklinde bir kâğıdı farklı biçimlerde katlayınca farklı çizgiler elde edersin: bir köşeyi öbürüne, bir kenarı öbürüne… Her kat izinin bir adı var.',
    },
    reflect: 'Kenarortay ile kenar orta dikmesi ikisi de kenarın orta noktasından geçiyor. Aralarındaki fark ne?',
    perRound: 5,
    pairs: [
      { left: { visual: SVG_MEDIAN }, right: 'Kenarortay' },
      { left: { visual: SVG_ALTITUDE }, right: 'Yükseklik' },
      { left: { visual: SVG_BISECTOR }, right: 'Açıortay' },
      { left: { visual: SVG_PERP }, right: 'Kenar orta dikmesi' },
      { left: { visual: SVG_CENTROID }, right: 'Ağırlık merkezi' },
    ],
  },
  {
    id: 'g7-eleman-ozellikleri',
    outcomes: ['MAT.7.5.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Hangi elemanın özelliği?',
    instructions: 'Her özelliği ait olduğu yardımcı elemana sürükle.',
    level: 2,
    launch: {
      text: 'Bir dedektif gibi ipuçlarından elemanı bul: “Karşı kenara dik iner.” Bu hangisi olabilir?',
    },
    reflect: 'Bir özellik birden fazla elemana ait olabilir mi? Hangi üçgenlerde?',
    categories: [
      { id: 'kenarortay', label: 'Kenarortay', color: '#e11d48' },
      { id: 'aciortay', label: 'Açıortay', color: '#3b82f6' },
      { id: 'yukseklik', label: 'Yükseklik', color: '#22c55e' },
    ],
    items: [
      { content: 'Karşı kenarı iki eş parçaya ayırır.', category: 'kenarortay' },
      { content: 'Üçü kesiştiğinde ağırlık merkezi oluşur.', category: 'kenarortay' },
      { content: 'Kenarın orta noktası, orta dikme inşasıyla bulunup karşı köşeyle birleştirilir.', category: 'kenarortay' },
      { content: 'Köşedeki açıyı iki eş açıya ayırır.', category: 'aciortay' },
      { content: 'Açının kollarından eşit uzunlukta parçalar kesilerek inşa edilir.', category: 'aciortay' },
      { content: 'Karşı kenara ya da uzantısına diktir.', category: 'yukseklik' },
      { content: 'Geniş açılı üçgende bazıları üçgenin dışında kalır.', category: 'yukseklik' },
      { content: 'Köşenin karşı kenara olan en kısa uzaklığıdır.', category: 'yukseklik' },
    ],
  },
  {
    id: 'g7-ucgende-yardimci-elemanlar',
    outcomes: ['MAT.7.5.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Elemanlar arasındaki ilişkiler',
    instructions: 'Üçgenin yardımcı elemanları arasındaki ilişkileri gerekçeleriyle düşün.',
    level: 2,
    launch: {
      text: 'Elif “Kenarortay, açıortay ve yükseklik hep aynı çizgidir.” diyor. Mert “Hiçbir zaman aynı değildir.” diyor. Kim haklı?',
      visual: SVG_ISO,
    },
    reflect: 'Elif ile Mert’in tartışmasını nasıl çözersin? Hangi üçgende kim haklı?',
    questions: [
      { prompt: { text: '[AD] kenarortaydır. |BC| = 14 cm ise |BD| kaç cm’dir?', visual: SVG_MEDIAN }, choices: ['14 cm', '7 cm', '28 cm', '3,5 cm'], answer: 1, feedback: ['Kenarortay karşı kenarı ikiye böler; |BD| kenarın yarısıdır.', null, 'Kenarortay kenarı uzatmaz.', 'Kenarı dörde değil, ikiye böler.'] },
      { prompt: { text: '[AE] açıortaydır. m(BAC) = 64° ise m(BAE) kaç derecedir?', visual: SVG_BISECTOR }, choices: ['64°', '128°', '32°', '26°'], answer: 2, feedback: ['Bu bütün açı; açıortay ikiye böler.', 'Açıortay açıyı büyütmez.', null, '90° − 64° = 26° hesabı burada işe yaramaz.'] },
      { prompt: { text: '|AB| = |AC| olan ikizkenar üçgende tabana ait kenarortay için hangisi doğrudur?', visual: SVG_ISO }, choices: ['Aynı zamanda açıortay ve yüksekliktir.', 'Tabana paraleldir.', 'Üçgenin dışında kalır.', 'Hiçbir zaman yükseklik olamaz.'], answer: 0, feedback: [null, 'Kenarortay tabanı keser; ona paralel olamaz.', 'Kenarortay her zaman üçgenin içindedir.', 'İkizkenar üçgende tabana inen kenarortay tabana diktir.'] },
      { prompt: { text: 'Geniş açılı bir üçgende [AH] yüksekliği nerede?', visual: SVG_ALT_OUT }, choices: ['Üçgenin dışında; [BC] kenarının uzantısına iner.', 'Üçgenin içinde.', '[BC] kenarının orta noktasında.', 'B köşesinde.'], answer: 0, feedback: [null, 'Şekle bak: H noktası B’nin solunda, kenarın uzantısında.', 'Yükseklik kenarı ortalamak zorunda değil; dik inmek zorunda.', 'Yükseklik A’dan iner; H, B’den farklı bir nokta.'] },
      { prompt: 'Eşkenar üçgende her kenara ait kenarortay için hangisi doğrudur?', choices: ['Yalnız açıortaydır.', 'Yalnız yüksekliktir.', 'Aynı zamanda açıortay ve yüksekliktir.', 'Kenar uzunluğuna eşittir.'], answer: 2, feedback: ['Eşkenar üçgen aynı zamanda ikizkenar olduğu için kenarortay yükseklik de olur.', 'Kenarortay aynı zamanda açıyı da ikiye böler.', null, 'Kenarortay kenardan kısadır.'] },
      { prompt: 'Bir köşeden karşı kenara (ya da uzantısına) çizilen en kısa doğru parçası hangisidir?', choices: ['Kenarortay', 'Açıortay', 'Yükseklik', 'Kenar'], answer: 2, feedback: ['Kenarortay genellikle eğik iner; dik inen en kısadır.', 'Açıortay genellikle eğik iner.', null, 'Kenarlar köşeleri birleştirir; karşı kenara inmez.'] },
    ],
  },
  {
    id: 'g7-t5-hangisi-farkli',
    outcomes: ['MAT.7.5.1'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Dört elemandan birini seç ve neden farklı olduğunu açıkla. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 3,
    launch: {
      text: 'Üçgenin yardımcı elemanları aynı ailenin üyeleri gibi: benzer ama her birinin kendine özgü bir yanı var.',
    },
    reflect: 'Seçtiğin elemanın özelliğini gösteren bir çizim yap. Arkadaşının seçtiği elemanla karşılaştır.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Kenarortay', 'Açıortay', 'Yükseklik', 'Kenar orta dikmesi'],
        answer: 0,
        reasons: ['Üçü kesişince ağırlık merkezini oluşturan tek eleman.', 'Köşedeki açıyı iki eş açıya bölen tek eleman.', 'Uzunluğu köşenin karşı kenara en kısa uzaklığı olan ve alan hesabında kullanılan tek eleman.', 'Bir köşeden geçmek zorunda olmayan tek eleman; doğru parçası değil, bir doğrudur.'],
      },
    ],
  },

  // MAT.7.5.2
  {
    id: 'g7-kenarortay-katla',
    outcomes: ['MAT.7.5.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Katla, kenarortayı bul',
    instructions: 'Kâğıt katlama deneyini şekil üzerinde düşün ve soruları cevapla.',
    level: 2,
    launch: {
      text: 'Üçgen bir kâğıtta B köşesini C’nin üzerine getirip katladın. Açınca bir kat izi oluştu. Bu kat izi sana kenarortayı bulmak için nasıl yardım eder?',
      visual: SVG_FOLD,
    },
    reflect: 'Kâğıt katlamayla yaptığın şeyi pergel ve cetvelle nasıl yaparsın? Hangi inşayı kullanırsın?',
    questions: [
      { prompt: { text: 'B köşesini C’nin üzerine katladık. Kat izi [BC] için nedir?', visual: SVG_FOLD }, choices: ['[BC]’nin orta dikmesi', 'A köşesinden çizilen açıortay', 'A köşesinden çizilen yükseklik', '[AB]’nin kenarortayı'], answer: 0, feedback: [null, 'Kat izi A’dan geçmiyor; açıortay A’dan geçmek zorunda.', 'Kat izi [BC]’ye dik ama A’dan geçmiyor.', 'Kat izi [BC]’yi ortalıyor, [AB] ile ilgisi yok.'], explain: 'B ile C üst üste geldiği için kat izi [BC]’nin simetri doğrusudur: orta dikme.' },
      { prompt: 'Kat izinin [BC]’yi kestiği noktaya D dersek, A ile D’yi birleştiren doğru parçası nedir?', choices: ['A köşesinden çizilen kenarortay', 'A köşesinden çizilen yükseklik', 'A açısının açıortayı', 'Kenar orta dikmesi'], answer: 0, feedback: [null, '[AD] genellikle [BC]’ye dik değildir.', '[AD] genellikle A açısını iki eş parçaya bölmez.', 'Orta dikme kat izinin kendisi; [AD] ise köşeden çıkıyor.'] },
      { prompt: 'Şekildeki üçgende kat izi A köşesinden geçmiyor. Kat izi A’dan geçseydi üçgen için ne söylenirdi?', choices: ['|AB| = |AC| olurdu; üçgen ikizkenar olurdu.', 'Üçgen dik üçgen olurdu.', 'Hiçbir şey söylenemezdi.', 'Üçgen geniş açılı olurdu.'], answer: 0, feedback: [null, 'Dik açı kat iziyle ilgili değil.', 'Orta dikme üzerindeki her nokta B ve C’ye eşit uzaklıktadır; A da öyle olurdu.', 'Açının büyüklüğü bunu belirlemez.'] },
      { prompt: { text: '|AB| = |AC| olan ikizkenar üçgende B’yi C’ye katlayınca kat izi A’dan geçer. Bu kat izi aynı zamanda nedir?', visual: SVG_ISO }, choices: ['Kenarortay, açıortay ve yükseklik', 'Yalnız kenarortay', 'Yalnız yükseklik', 'Hiçbiri'], answer: 0, feedback: [null, 'Kat izi A açısını da ikiye bölüyor ve [BC]’ye dik.', 'Kat izi aynı zamanda [BC]’ye dik ve A açısını ikiye bölüyor.', 'Kat izi köşeden çıkıyor ve kenarı ortalıyor; en az kenarortaydır.'] },
    ],
  },
  {
    id: 'g7-kenarortay-insasi',
    outcomes: ['MAT.7.5.2'],
    type: 'sort',
    stage: 'sembol',
    title: 'Kenarortayı inşa et',
    instructions: 'Orta dikme inşası deneyimini kullanarak kenarortay inşasının adımlarını sırala.',
    level: 2,
    launch: {
      text: 'Kenarortay için kenarın orta noktası lazım. Cetvelin sayılarını kullanmadan orta noktayı nasıl bulursun?',
    },
    reflect: 'Kenarortay inşası hangi adımda orta dikme inşasından ayrılıyor?',
    rounds: [
      { prompt: 'ABC üçgeninde A köşesinden çizilen kenarortayı inşa et.', items: ['Pergeli [BC]’nin yarısından daha geniş aç.', 'B ve C merkezli, aynı açıklıkta yaylar çiz.', 'Yayların kesişim noktalarını birleştirerek [BC]’nin orta dikmesini çiz.', 'Orta dikmenin [BC]’yi kestiği noktaya D de.', 'A ile D’yi birleştir; [AD] kenarortaydır.'] },
      { prompt: 'Üçgenin ağırlık merkezini bul.', items: ['İki kenarın orta noktalarını orta dikme inşasıyla bul.', 'Her orta noktayı karşısındaki köşeyle birleştir.', 'İki kenarortayın kesiştiği noktayı işaretle.', 'Üçüncü kenarortayın da bu noktadan geçtiğini kontrol et.'] },
    ],
  },
  {
    id: 'g7-kenarortay-insa-muhakeme',
    outcomes: ['MAT.7.5.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'İnşanın gerekçesi',
    instructions: 'Kenarortay inşasının adımlarını gerekçeleriyle düşün.',
    level: 3,
    launch: {
      text: 'Bir arkadaşın kenarortayı “göz kararı” kenarın ortasını işaretleyerek çizdi. Sen pergel kullandın. Hangisi her zaman doğru sonuç verir?',
    },
    reflect: 'İkizkenar bir üçgende kenarortay inşası için açıortay inşasını da kullanabilir misin? Neden?',
    questions: [
      { prompt: 'Kenarortay inşasında orta dikme inşası neden kullanılır?', choices: ['Kenarın orta noktasını bulmak için', 'Açıyı ikiye bölmek için', 'Kenara paralel çizmek için', 'Üçgenin alanını bulmak için'], answer: 0, feedback: [null, 'Açıyı ikiye bölmek açıortayın işi.', 'Orta dikme kenara diktir, paralel değil.', 'Alan için yükseklik gerekir.'] },
      { prompt: 'İkizkenar üçgende (|AB| = |AC|) tabana ait kenarortayı inşa etmek için başka hangi inşa da kullanılabilir?', choices: ['Taban açılarından birinin açıortayı', 'Tepe açısının (A açısının) açıortayı', 'Bir yan kenarın orta dikmesi', 'Hiçbiri'], answer: 1, feedback: ['Taban açısının açıortayı karşı kenarı (yan kenarı) keser, tabanı değil.', null, 'Yan kenarın orta dikmesi tabanın orta noktasından geçmez.', 'İkizkenar üçgende tepe açısının açıortayı tabana ait kenarortayla çakışır.'], explain: 'İkizkenar üçgende tepe açısının açıortayı tabana ait kenarortayla çakışır.' },
      { prompt: 'Kenarortay inşasında hangi araçlar kullanılır?', choices: ['Açıölçer ve gönye', 'Pergel ve ölçüsüz cetvel', 'Yalnız cetvel', 'Hesap makinesi'], answer: 1, feedback: ['Açıölçer ve gönye çizim içindir; inşada pergel ve ölçüsüz cetvel kullanılır.', null, 'Yalnız cetvelle orta noktayı kesin bulamayız.', 'İnşa bir çizim sürecidir; hesap gerekmez.'] },
      { prompt: 'Her üçgende kenarortay için hangisi her zaman doğrudur?', choices: ['Karşı kenara diktir.', 'Köşedeki açıyı iki eş açıya böler.', 'Karşı kenarı iki eş parçaya ayırır.', 'Kenar uzunluğuna eşittir.'], answer: 2, feedback: ['Bu yalnız ikizkenar üçgende tabana ait kenarortay için doğrudur.', 'Bu açıortayın özelliğidir; çoğu üçgende kenarortay açıyı eşit bölmez.', null, 'Kenarortayın uzunluğu kenarlardan farklıdır.'] },
      { prompt: 'Bir üçgenin kenarortaylarını çizen Ece, üçünün tek bir noktada kesiştiğini görüyor. Bu nokta nedir?', choices: ['Ağırlık merkezi', 'Kenarın orta noktası', 'Köşe', 'Üçgenin dışındaki bir nokta'], answer: 0, feedback: [null, 'Orta noktalar kenarlar üzerindedir; kesişim noktası üçgenin içindedir.', 'Kesişim noktası köşelerden farklıdır.', 'Kenarortaylar üçgenin içinde kesişir.'] },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ───────────────────────────────────────────

  // MAT.7.1.5
  {
    id: 'g7-fark-mi-kat-mi',
    outcomes: ['MAT.7.1.5'],
    type: 'fill',
    stage: 'model',
    title: 'Fark mı, kat mı?',
    instructions: 'Şerit modellerine bak. İki niceliği hem farkla (toplamsal) hem katla (çarpımsal) karşılaştır.',
    level: 1,
    launch: {
      text: 'Bahçede iki fidan var: A fidanı 3 m, B fidanı 2 m. “A, B’den 1 m uzun.” da doğru, “A, B’nin 1,5 katı.” da doğru. Bu iki cümle aynı şeyi mi anlatıyor?',
      visual: { kind: 'tape', parts: [{ label: 'A: 3 m', value: 3 }], compare: [{ label: 'B: 2 m', value: 2 }] },
    },
    reflect: 'Yıllar geçince fark değişti ama kat aynı kaldı (ya da tersi). Hangi durumlarda fark, hangi durumlarda kat daha anlamlı bir karşılaştırmadır?',
    items: [
      { text: 'A fidanı B’den __ m uzundur; A’nın boyu B’nin boyunun __ katıdır.', answers: ['1', '1,5|3/2'], visual: { kind: 'tape', parts: [{ label: 'A: 3 m', value: 3 }], compare: [{ label: 'B: 2 m', value: 2 }] }, hints: ['Fark için çıkar, kat için böl.', 'B’nin boyunu kaç kez yan yana koyarsan A’nın boyunu elde edersin?'] },
      { text: 'Birkaç yıl sonra A 6 m, B 4 m oldu. Aradaki fark __ m oldu ama A hâlâ B’nin __ katı.', answers: ['2', '1,5|3/2'], visual: { kind: 'tape', parts: [{ label: 'A: 6 m', value: 6 }], compare: [{ label: 'B: 4 m', value: 4 }] }, explain: 'İki fidan da boylarının 2 katına çıktı: fark değişti, oran (çarpımsal ilişki) korundu.' },
      { text: 'Elif 12, kardeşi 4 yaşında. Elif kardeşinden __ yaş büyük ve yaşı kardeşinin __ katı.', answers: ['8', '3'] },
      { text: '8 yıl sonra Elif 20, kardeşi 12 yaşında olacak. Aralarındaki fark yine __ yaş olur.', answers: ['8'], explain: 'Yaşlarda fark (toplamsal ilişki) sabit kalır, kat ise değişir: 20, 12’nin 3 katı değildir.' },
      { text: 'Yeşil boya için 2 kutu mavi ile 5 kutu sarı karıştırılıyor. Mavi : sarı = __ : __', answers: ['2', '5'], visual: { kind: 'tape', parts: [{ label: 'mavi', value: 1, color: '#93c5fd' }, { label: 'mavi', value: 1, color: '#93c5fd' }], compare: [{ label: 'sarı', value: 1 }, { label: 'sarı', value: 1 }, { label: 'sarı', value: 1 }, { label: 'sarı', value: 1 }, { label: 'sarı', value: 1 }] } },
      { text: 'Sarı boya miktarı mavi boyanın __ katıdır; mavi boya sarının __ kadardır (kesirle yaz).', answers: ['2,5|5/2', '2/5|0,4'], hints: ['5’i 2’ye böl.', 'Mavi, sarının kaçta kaçı? 2’yi 5’e böl.'] },
    ],
  },
  {
    id: 'g7-toplamsal-mi-carpimsal-mi',
    outcomes: ['MAT.7.1.5'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Toplamsal mı, çarpımsal mı?',
    instructions: 'İki niceliği karşılaştıran ifadeleri grupla: fark ile (toplamsal) mı, kat ya da oran ile (çarpımsal) mı karşılaştırıyor?',
    level: 1,
    launch: {
      text: 'Gazete başlıkları: “Bu yıl 120 ağaç daha fazla dikildi.” ve “Dikilen ağaç sayısı iki katına çıktı.” İki başlık da iyi haber; ama farklı türden karşılaştırmalar.',
    },
    reflect: '“A, B’den 5 fazla” ile “A, B’nin 5 katı” cümlelerini aynı iki sayıyla örnekleyebilir misin? Neden zor?',
    categories: [
      { id: 'toplamsal', label: 'Toplamsal (fark)', color: '#3b82f6' },
      { id: 'carpimsal', label: 'Çarpımsal (oran)', color: '#f97316' },
    ],
    items: [
      { content: 'A fidanı B fidanından 1 m uzundur.', category: 'toplamsal' },
      { content: 'Elif, Can’dan 3 yaş büyüktür.', category: 'toplamsal' },
      { content: 'Bu yıl geçen yıldan 120 ağaç fazla dikildi.', category: 'toplamsal' },
      { content: 'Otobüs bileti metro biletinden 5 TL pahalıdır.', category: 'toplamsal' },
      { content: 'A fidanının boyu B fidanının boyunun 1,5 katıdır.', category: 'carpimsal' },
      { content: 'Sınıfta her 2 kız öğrenciye karşılık 3 erkek öğrenci vardır.', category: 'carpimsal' },
      { content: 'Mavi boya miktarı sarı boyanın [[2/5]]’i kadardır.', category: 'carpimsal' },
      { content: 'Ayşe’nin okuduğu kitap sayısı Mehmet’inkinin 2 katıdır.', category: 'carpimsal' },
    ],
  },
  {
    id: 'g7-oran-tablosu',
    outcomes: ['MAT.7.1.5'],
    type: 'fill',
    stage: 'model',
    title: 'Oran tablosu ve çift sayı doğrusu',
    instructions: 'Tabloda ya da çift sayı doğrusunda iki nicelik birlikte değişir. Birini 2 katına çıkarırsan öbürüne ne olur?',
    level: 2,
    launch: {
      text: 'Ressam aynı yeşil tonunu daha çok miktarda yapmak istiyor: 2 kutu mavi, 5 kutu sarı. 6 kutu mavi kullanırsa kaç kutu sarı koymalı?',
      visual: { kind: 'table', headers: ['Mavi boya (kutu)', 'Sarı boya (kutu)'], rows: [[2, 5], [4, 10], [6, '?']] },
    },
    reflect: 'Oran tablosunda yeni satırlar üretmek için hangi stratejileri kullandın: ikiye katlama, toplama, birim orana inme?',
    items: [
      { text: 'Aynı tonda yeşil için 6 kutu maviye __ kutu sarı gerekir.', answers: ['15'], visual: { kind: 'table', headers: ['Mavi boya (kutu)', 'Sarı boya (kutu)'], rows: [[2, 5], [4, 10], [6, '?']] }, hints: ['2’den 6’ya nasıl gidildi? Sarıya da aynısını yap.'] },
      { text: '1 kutu maviye __ kutu sarı düşer.', answers: ['2,5|5/2'], visual: { kind: 'table', headers: ['Mavi boya (kutu)', 'Sarı boya (kutu)'], rows: [[2, 5], [1, '?']] }, hints: ['Maviyi yarıya indirdin. Sarıya ne yapmalısın?'], explain: 'Birim oran: 1 kutu maviye 2,5 kutu sarı.' },
      { text: 'Çift sayı doğrusuna göre 9 bardak süte __ kaşık kakao konur.', answers: ['12'], visual: dnl('süt (bardak)', 'kakao (kaşık)', [{ at: 0, top: '0', bottom: '0' }, { at: 3, top: '3', bottom: '4' }, { at: 6, top: '6', bottom: '8' }, { at: 9, top: '9', bottom: '?' }], 9), hints: ['Süt her adımda 3 artıyor. Kakao her adımda kaç artıyor?'] },
      { text: '30 dakikada 6 sandviç yeniyor. 1 sandviç __ dakikada yenir; 1 dakikada __ sandviç yenir.', answers: ['5', '0,2|1/5'], visual: dnl('dakika', 'sandviç', [{ at: 0, top: '0', bottom: '0' }, { at: 5, top: '?', bottom: '1' }, { at: 30, top: '30', bottom: '6' }], 30), hints: ['30 dakikayı 6 sandviçe eşit paylaştır.', 'Birim oranın iki anlamı var: sandviç başına dakika ve dakika başına sandviç.'] },
      { text: '12 : 16 oranının en sade hâli __ : __', answers: ['3', '4'], hints: ['12 ve 16’yı aynı sayıya bölebilir misin? En büyük ortak bölen hangisi?'] },
      { text: '2 : 3 = 4 : 6 olduğundan (2 + 4) : (3 + 6) = 6 : __ oranı da bunlara denktir.', answers: ['9'], hints: ['Tablonun iki satırını toplamak, yeni bir denk satır verir mi?'] },
      { text: '15 : 6 oranının en sade hâli __ : __', answers: ['5', '2'] },
    ],
  },
  {
    id: 'g7-birimli-birimsiz-oran',
    outcomes: ['MAT.7.1.5'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Birimli mi, birimsiz mi?',
    instructions: 'Farklı türden iki nicelik karşılaştırılıyorsa oran birimlidir; aynı türden nicelikler karşılaştırılıyorsa birimsizdir.',
    level: 2,
    launch: {
      text: '“Saatte 120 km” ile “3 kıza 5 erkek” iki orandır. Birinin sonunda bir birim var (km/saat), öbüründe yok. Neden?',
    },
    reflect: '125 kg/ağaç oranı, onu oluşturan 1000 kg ve 8 ağaç sayılarından farklı neyi anlatıyor?',
    categories: [
      { id: 'birimli', label: 'Birimli oran', color: '#a855f7' },
      { id: 'birimsiz', label: 'Birimsiz oran', color: '#22c55e' },
    ],
    items: [
      { content: '120 km / 2 saat', category: 'birimli' },
      { content: '12 TL / 3 kg', category: 'birimli' },
      { content: '8 L benzin / 100 km', category: 'birimli' },
      { content: '1000 kg atık kâğıt / 8 ağaç', category: 'birimli', explain: 'Farklı türden nicelikler: kg ve ağaç sayısı. Birim oranı 125 kg/ağaç.' },
      { content: '3 kız öğrenci : 5 erkek öğrenci', category: 'birimsiz', explain: 'İkisi de öğrenci sayısı; birim sadeleşir.' },
      { content: '2 bardak süt : 3 bardak su', category: 'birimsiz' },
      { content: '150 cm : 200 cm', category: 'birimsiz' },
      { content: 'Kırmızı kalem sayısı : mavi kalem sayısı', category: 'birimsiz' },
    ],
  },
  {
    id: 'g7-birim-oran',
    outcomes: ['MAT.7.1.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangisi daha kakaolu, hangisi daha ekonomik?',
    instructions: 'Oranları karşılaştırırken farka değil, birim orana ya da denk oranlara bak.',
    level: 2,
    launch: {
      text: 'Can 2 bardak süte 3 kaşık kakao, Elif 3 bardak süte 4 kaşık kakao koydu. Elif “Benimkinde daha çok kakao var, daha kakaolu!” diyor.',
      visual: rays([{ dx: 2, dy: 3, color: '#e11d48', label: 'Can' }, { dx: 3, dy: 4, color: '#6366f1', label: 'Elif' }], 'süt', 'kakao'),
    },
    reflect: 'Elif’e, daha çok kakao kullanmanın daha kakaolu olmak anlamına gelmediğini nasıl açıklarsın? Tablo, şerit ya da grafikten birini kullan.',
    questions: [
      { prompt: 'Can: 2 bardak süte 3 kaşık kakao. Elif: 3 bardak süte 4 kaşık kakao. Hangisi daha kakaolu?', choices: ['Can’ın karışımı', 'Elif’in karışımı', 'İkisi aynı; ikisinde de kakao sütten 1 fazla.'], answer: 0, feedback: [null, 'Elif’te kakao daha çok ama süt de daha çok. Bardak başına kakaoya bak: Can 1,5 kaşık, Elif yaklaşık 1,33 kaşık.', 'Fark aynı (1) ama oranlar farklı. Burada toplamsal değil, çarpımsal düşünmeliyiz.'], explain: 'Ortak kat ile eşitleyebilirsin: 6 bardak süte Can 9 kaşık, Elif 8 kaşık kakao koyar.' },
      { prompt: { text: 'Grafikte iki karışımın ışınları görülüyor (yatay: süt, dikey: kakao). Hangi ışın daha kakaolu karışımı gösterir?', visual: rays([{ dx: 2, dy: 3, color: '#e11d48', label: 'A' }, { dx: 3, dy: 2, color: '#6366f1', label: 'B' }], 'süt', 'kakao') }, choices: ['A ışını (dikey eksene daha yakın)', 'B ışını (yatay eksene daha yakın)', 'İkisi aynı'], answer: 0, feedback: [null, 'Yatay eksene yakın ışında aynı süte daha az kakao düşer; karışım daha sütlüdür.', 'Işınlar farklı eğimde; oranlar farklı.'] },
      { prompt: '4 bardak suya 2 kaşık portakal konsantresi (A) ve başka 4 bardak suya 3 kaşık konsantre (B) konuyor. Hangisi daha yoğun portakal tadındadır?', choices: ['B', 'A', 'İkisi aynı'], answer: 0, feedback: [null, 'Su miktarı aynı; konsantresi daha çok olan daha yoğundur.', 'Su aynı ama konsantre farklı.'] },
      { prompt: '1,5 L’lik meyve suyu 45 TL, 1 L’lik meyve suyu 32 TL. Hangisi daha ekonomiktir?', choices: ['1,5 L’lik (litresi 30 TL)', '1 L’lik (daha ucuz)', 'İkisi aynı'], answer: 0, feedback: [null, 'Paket ucuz ama litresi 32 TL; 1,5 L’liğin litresi 45 ÷ 1,5 = 30 TL.', 'Birim fiyatları farklı: 30 TL ve 32 TL.'] },
      { prompt: '3 kişilik bir tarifte 6 yumurta var. Ayşe 5 kişilik yapmak için “2 kişi fazla, 2 yumurta eklerim.” diyor. Kaç yumurta gerekir?', choices: ['10', '8', '11', '15'], answer: 0, feedback: [null, 'Kişi başına 2 yumurta düşüyor; 2 kişi daha 4 yumurta ister. Fark eklemek değil, oranı korumak gerekir.', 'Kişi başına düşen yumurta sayısını bul: 6 ÷ 3.', '15, 5 kişinin 3 katı; kişi başına 3 değil 2 yumurta düşüyor.'] },
      { prompt: '1000 kg atık kâğıt kullanılınca 8 ağacın kesilmesi önleniyor. “125 kg/ağaç” neyi anlatır?', choices: ['1 ağacı kurtarmak için gereken atık kâğıt miktarını', '8 ağacın ağırlığını', 'Toplam atık kâğıt miktarını', '1 kg kâğıdın kurtardığı ağaç sayısını'], answer: 0, feedback: [null, 'Ağaçların ağırlığı bilinmiyor; 125, 1000 ÷ 8 ile bulundu.', 'Toplam 1000 kg; 125 ağaç başına düşen miktar.', 'O, 8 ÷ 1000 = 0,008 ağaç/kg olurdu; birim oranın öbür anlamı.'] },
    ],
  },

  // MAT.7.1.6
  {
    id: 'g7-orantili-grafik',
    outcomes: ['MAT.7.1.6'],
    type: 'quiz',
    stage: 'model',
    title: 'Tabloda ve grafikte orantı',
    instructions: 'Tablo ve grafikleri incele. İki nicelik orantılıysa oranları hep aynı kalır ve grafik başlangıç noktasından çıkan düz bir ışındır.',
    level: 2,
    launch: {
      text: 'Benzin istasyonunda pompa hem litreyi hem tutarı gösteriyor. Taksi taksimetresi de kilometreyi ve ücreti. İkisi de “orantılı” mı artıyor?',
      visual: { kind: 'table', headers: ['Benzin (L)', 'Tutar (TL)'], rows: [[10, 450], [20, 900], [30, 1350]] },
    },
    reflect: 'Taksi ücreti düzenli artıyor ama orantılı değil. “Düzenli artmak” ile “orantılı olmak” arasındaki farkı nasıl açıklarsın?',
    questions: [
      { prompt: 'Hangi grafik iki nicelik arasındaki orantılı bir ilişkiyi gösterir?', choices: [{ visual: GRAPH_OFFSET }, { visual: GRAPH_PROP }, { visual: GRAPH_CURVE }, { visual: GRAPH_DOWN }], answer: 1, feedback: ['Işın başlangıç noktasından çıkmıyor: Nicelik 0 iken öbürü 0 değil (taksinin açılış ücreti gibi).', null, 'Çizgi düz değil; oran sabit kalmıyor.', 'Bir nicelik artarken öbürü azalıyor; bu bir doğru orantı değil.'], explain: 'Orantılı ilişkinin grafiği başlangıç noktasından çıkan düz bir ışındır.' },
      { prompt: { text: 'Tabloya göre y ÷ x oranı kaçtır?', visual: { kind: 'table', headers: ['x', 'y'], rows: [[2, 6], [5, 15], [8, 24]] } }, choices: ['3', '4', '2', 'Oran sabit değil'], answer: 0, feedback: [null, '24 ÷ 8 = 3; 4 değil.', 'x ÷ y değil, y ÷ x istiyoruz.', 'Her satırda dene: 6 ÷ 2, 15 ÷ 5, 24 ÷ 8.'], explain: '6 ÷ 2 = 15 ÷ 5 = 24 ÷ 8 = 3. Oran sabit olduğu için x ve y orantılıdır.' },
      { prompt: { text: 'Taksi ücretleri tabloda. Yol ile ücret orantılı mıdır?', visual: { kind: 'table', headers: ['Yol (km)', 'Ücret (TL)'], rows: [[1, 60], [2, 90], [3, 120]] } }, choices: ['Hayır; 60 ÷ 1 = 60 ama 90 ÷ 2 = 45, oran sabit değil.', 'Evet; her kilometrede 30 TL artıyor.', 'Evet; ikisi de artıyor.'], answer: 0, feedback: [null, 'Düzenli artış orantı demek değil: Yol 2 katına çıkınca (1 → 2 km) ücret 2 katına çıkmıyor (60 → 90).', 'İkisinin birlikte artması yetmez; oranın sabit kalması gerekir.'] },
      { prompt: 'Benzin miktarı ile ödenen tutar orantılıdır. Bu ilişkinin grafiği nasıl olur?', choices: ['Başlangıç noktasından çıkan düz bir ışın', 'Başlangıç noktasından çıkmayan düz bir çizgi', 'Eğri bir çizgi', 'Aşağı doğru inen bir çizgi'], answer: 0, feedback: [null, '0 litre benzin alınca 0 TL ödenir; ışın başlangıç noktasından çıkar.', 'Litre fiyatı sabit; çizgi bükülmez.', 'Benzin arttıkça tutar azalmaz, artar.'] },
      { prompt: '8 limonla 12 bardak limonata yapılıyor. Aynı tatta limonata için 10 limonla kaç bardak yapılır?', choices: ['15', '14', '16', '20'], answer: 0, feedback: [null, '2 limon daha 2 bardak değil; 1 limona 1,5 bardak düşüyor.', '16 bardak için 16 ÷ 1,5 ≈ 10,7 limon gerekir.', '20, 10’un 2 katı; ama 1 limona 2 değil 1,5 bardak düşüyor.'], explain: 'Birim oran: 1 limona 1,5 bardak. 10 · 1,5 = 15' },
    ],
  },
  {
    id: 'g7-orantili-mi',
    outcomes: ['MAT.7.1.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Orantılı mı?',
    instructions: 'İki nicelik arasındaki oran hep aynı kalıyorsa nicelikler orantılıdır. Her durumu doğru gruba koy.',
    level: 2,
    launch: {
      text: 'Bir nicelik artarken öbürü de artıyorsa orantılı mıdır? Her satırda bölme yapıp oranın aynı kalıp kalmadığına bakalım.',
    },
    reflect: '“Orantılı değil” grubundaki bir durumu orantılı hâle getirmek için ne değiştirmek gerekirdi?',
    categories: [
      { id: 'evet', label: 'Orantılı', color: '#22c55e' },
      { id: 'hayir', label: 'Orantılı değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Kalem sayısı: 2, 4, 6 — Tutar: 30, 60, 90 TL', category: 'evet' },
      { content: 'Benzin: 10, 20, 30 L — Tutar: 450, 900, 1.350 TL', category: 'evet' },
      { content: 'Karenin kenarı: 1, 2, 3 cm — Çevresi: 4, 8, 12 cm', category: 'evet' },
      { content: 'Yumurta: 2, 4, 6 tane — Un: 3, 6, 9 bardak', category: 'evet' },
      { content: 'Karenin kenarı: 1, 2, 3 cm — Alanı: 1, 4, 9 cm²', category: 'hayir', explain: '1 ÷ 1 = 1, 4 ÷ 2 = 2: Oran sabit değil.' },
      { content: 'Taksi: 1, 2, 3 km — Ücret: 60, 90, 120 TL', category: 'hayir', explain: 'Düzenli artıyor ama 60 ÷ 1 ≠ 90 ÷ 2.' },
      { content: 'Yaş: 10, 20, 30 — Boy: 140, 175, 176 cm', category: 'hayir' },
      { content: 'Yıl: 2021, 2022, 2023 — Kasaba nüfusu: 5.000, 5.300, 5.450', category: 'hayir' },
    ],
  },
  {
    id: 'g7-orantiyi-yorumla',
    outcomes: ['MAT.7.1.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Orantılı mı, değil mi?',
    instructions: 'Gerçek yaşam durumlarında iki niceliğin orantılı olup olmadığına karar ver ve gerekçeni düşün.',
    level: 2,
    launch: {
      text: 'Ali “Karenin kenarı 2 katına çıkarsa alanı da 2 katına çıkar.” diyor. Bir kare çizip deneyelim mi?',
    },
    reflect: 'Bir durumun orantılı olup olmadığını anlamak için en hızlı testin ne? Bir arkadaşına anlat.',
    questions: [
      { prompt: 'Orantı nedir?', choices: ['İki niceliğin farkıdır.', 'İki denk oranın eşitliğidir.', 'Bir sayının yüzdesidir.', 'İki sayının toplamıdır.'], answer: 1, feedback: ['Fark toplamsal bir karşılaştırmadır; orantı oranlarla ilgilidir.', null, 'Yüzde, paydası 100 olan bir orandır; orantı ise iki oranın eşitliğidir.', 'Toplam bir oran değildir.'] },
      { prompt: 'Bir arabanın harcadığı benzin ile gittiği yol orantılıdır. Harcanan benzin 2 katına çıkarsa gidilen yol ne olur?', choices: ['Yarıya iner.', 'Değişmez.', '2 katına çıkar.', '4 katına çıkar.'], answer: 2, feedback: ['Daha çok benzinle daha az yol gidilmez.', 'Benzin arttıkça yol da artar.', null, 'Orantılı ilişkide iki nicelik aynı katla değişir.'] },
      { prompt: 'Hangisinde iki nicelik orantılı DEĞİLDİR?', choices: ['Bir kişinin yaşı ile boyu', 'Alınan ekmek sayısı ile ödenen tutar', 'Sabit hızla geçen süre ile gidilen yol', 'Karenin kenar uzunluğu ile çevresi'], answer: 0, feedback: [null, 'Her ekmek aynı fiyatsa tutar ekmek sayısıyla orantılıdır.', 'Sabit hızda süre 2 katına çıkınca yol da 2 katına çıkar.', 'Çevre = 4 · kenar; oran hep 4.'], explain: '20 yaşındaki biri 10 yaşındakinin 2 katı boyda değildir.' },
      { prompt: 'Ali: “Karenin kenarı 2 katına çıkınca alanı da 2 katına çıkar; kenar ile alan orantılıdır.” Ali haklı mı?', choices: ['Hayır; kenar 2 katına çıkınca alan 4 katına çıkar.', 'Evet; ikisi birlikte artıyor.', 'Evet; alan her zaman kenarın 2 katıdır.'], answer: 0, feedback: [null, 'Birlikte artmak yetmez: Kenarı 1’den 2’ye çıkar, alan 1’den 4’e çıkar.', 'Kenarı 3 cm olan karenin alanı 9 cm²’dir; 6 değil.'] },
      { prompt: 'Bir fotokopi makinesi dakikada 20 sayfa basıyor. Süre ile basılan sayfa sayısı için hangisi doğrudur?', choices: ['Orantılıdır; sayfa ÷ dakika oranı hep 20’dir.', 'Orantılı değildir; sayfa sayısı süreden hızlı artar.', 'Orantılı değildir; çünkü 20 bir birim orandır.'], answer: 0, feedback: [null, 'Her dakika aynı sayıda sayfa basılıyor; artış hızı değişmiyor.', 'Birim oranın sabit olması, ilişkinin orantılı olduğunu gösterir.'] },
    ],
  },

  // MAT.7.1.7
  {
    id: 'g7-cift-sayi-dogrusu',
    outcomes: ['MAT.7.1.7'],
    type: 'fill',
    stage: 'model',
    title: 'Çift sayı doğrusu ve yüzde şeridi',
    instructions: 'Problemi çift sayı doğrusu ya da şerit modeliyle düşün. İçler dışlar çarpımı gerekmez: önce birim oranı ya da %10’u bul.',
    level: 2,
    launch: {
      text: 'Bir mont 640 TL ve %25 indirimde. %25 bütünün dörtte biri demek. Şeridi 4 eş parçaya bölersek bir parça ne kadar eder?',
      visual: { kind: 'tape', parts: [{ label: '%25', value: 1 }, { label: '%25', value: 1 }, { label: '%25', value: 1 }, { label: '%25', value: 1 }], total: '640 TL' },
    },
    reflect: 'Yüzde problemlerinde şerit modeli işini nasıl kolaylaştırdı? %15 gibi bir yüzdeyi şeritte nasıl gösterirdin?',
    items: [
      { text: '3 defter 135 TL. 1 defter __ TL, 7 defter __ TL eder.', answers: ['45', '315'], visual: dnl('defter', 'TL', [{ at: 0, top: '0', bottom: '0' }, { at: 1, top: '1', bottom: '?' }, { at: 3, top: '3', bottom: '135' }, { at: 7, top: '7', bottom: '?' }], 7), hints: ['Önce 1 defterin fiyatını bul.'] },
      { text: '640 TL’lik montun %25’i __ TL’dir.', answers: ['160'], visual: { kind: 'tape', parts: [{ label: '%25', value: 1 }, { label: '%25', value: 1 }, { label: '%25', value: 1 }, { label: '%25', value: 1 }], total: '640 TL' }, hints: ['%25, bütünün kaçta kaçıdır?'] },
      { text: 'Bir kitabın %40’ı 96 sayfadır. Kitabın tamamı __ sayfadır.', answers: ['240'], visual: { kind: 'tape', parts: [{ label: '%40 = 96 sayfa', value: 40 }, { label: '%60', value: 60 }], total: '?' }, hints: ['%40 = 96 ise %10 kaç sayfa?', '%100 için %10’u kaç katına çıkarırsın?'] },
      { text: '25 soruluk sınavda 18 soruyu doğru yapan Elif, soruların %__’ini doğru yapmıştır.', answers: ['72'], hints: ['25 soruyu 100’e tamamlamak için kaç ile çarparsın? 18’e de aynısını yap.'] },
      { text: 'Fiyatı 1.200 TL olan ayakkabıya %15 indirim yapıldı. Yeni fiyat __ TL’dir.', answers: ['1020|1.020'], visual: { kind: 'tape', parts: [{ label: '%85: yeni fiyat', value: 85 }, { label: '%15', value: 15 }], total: '1.200 TL' }, hints: ['%10’u 120 TL ise %5’i kaç?', 'İndirimi bulup çıkar ya da doğrudan %85’ini hesapla.'] },
      { text: 'Fiyatı 450 TL olan bir ürüne %20 zam yapıldı. Yeni fiyat __ TL’dir.', answers: ['540'], visual: { kind: 'tape', parts: [{ label: '450 TL (%100)', value: 100 }, { label: '%20', value: 20 }], total: '?' }, hints: ['450’nin %10’u kaç? %20’si?'] },
      { text: 'Haritada 1 cm, 5 km’yi gösteriyor. Haritada 7,5 cm olan yol gerçekte __ km’dir.', answers: ['37,5'], visual: dnl('harita (cm)', 'gerçek (km)', [{ at: 0, top: '0', bottom: '0' }, { at: 1, top: '1', bottom: '5' }, { at: 7.5, top: '7,5', bottom: '?' }], 7.5) },
      { text: 'Günlük 500 MW enerji tüketen bir şehir, tüketiminin en az %60’ını yenilenebilir kaynaklardan karşılamalı. En az __ MW yenilenebilir enerji üretmelidir.', answers: ['300'], hints: ['500’ün %10’u kaç?'] },
    ],
  },
  {
    id: 'g7-dogru-oranti',
    outcomes: ['MAT.7.1.7'],
    type: 'fill',
    stage: 'sembol',
    title: 'Doğru orantı hesapla',
    instructions: 'Önce birim oranı (1 tanesi ne kadar?) bul, sonra istenen miktarı hesapla. İstersen zihninde bir oran tablosu kur.',
    level: 1,
    launch: {
      text: 'Pazarda 3 kg elma 90 TL. Satıcı “5 kg alırsan 150 TL” diyor. Bu hesabı nasıl bu kadar hızlı yaptı?',
    },
    reflect: 'Birim oranı bulmak her zaman en kısa yol mu? Hangi soruda başka bir yol (ikiye katlama gibi) daha hızlıydı?',
    generator: { id: 'proportion', count: 8 },
  },
  {
    id: 'g7-dogru-oranti-problemleri',
    outcomes: ['MAT.7.1.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Mutfakta, yolda, fabrikada orantı',
    instructions: 'Önce durumun gerçekten doğru orantılı olup olmadığına karar ver, sonra problemi çöz.',
    level: 3,
    launch: {
      text: 'Diş fırçalarken musluğu açık bırakmak küçük bir alışkanlık gibi görünüyor. Peki bir ayda kaç litre su boşa akar?',
    },
    reflect: 'Otopark sorusunda neden orantı kullanılamadı? Bir problemde orantı kurmadan önce neyi kontrol etmelisin?',
    questions: [
      { prompt: '4 kişilik mercimek çorbası için 1,5 su bardağı mercimek gerekiyor. 10 kişilik çorba için kaç su bardağı mercimek gerekir?', choices: ['3,75', '3', '7,5', '6'], answer: 0, feedback: [null, '8 kişilik için 3 bardak; 2 kişi daha var.', '6 kişi fazla diye 6 bardak eklemek toplamsal düşünce; kişi sayısı 2,5 katına çıktı, mercimek de 2,5 katına çıkmalı.', '6 bardak 16 kişilik çorbaya yeter; kişi başına 0,375 bardak düşüyor.'], explain: 'Kişi başı 1,5 ÷ 4 = 0,375 bardak. 10 · 0,375 = 3,75' },
      { prompt: 'Musluk açık bırakılarak diş fırçalanırsa dakikada 6 L su boşa akıyor. Günde 2 kez, 2’şer dakika diş fırçalayan biri 30 günde kaç litre suyu boşa harcar?', choices: ['720 L', '360 L', '180 L', '1.440 L'], answer: 0, feedback: [null, 'Günde 2 kez fırçalandığını unutma: günde 4 dakika.', 'Günde 1 dakika saydın; günde 2 · 2 = 4 dakika.', 'Günde 4 dakika · 6 L = 24 L; 30 günde 24 · 30.'], explain: 'Günde 4 dakika · 6 L = 24 L. 30 günde 24 · 30 = 720 L' },
      { prompt: 'Mehmet 5 km’yi 17 dakikada koşuyor. Aynı hızla 34 dakikada kaç km koşar?', choices: ['10 km', '22 km', '7 km', '12 km'], answer: 0, feedback: [null, '17 dakika daha 17 km eklemek değil; süre 2 katına çıktı, yol da 2 katına çıkar.', '34 − 17 = 17 dakikada 2 km daha değil, 5 km daha koşar.', 'Süre tam 2 katı; yol da tam 2 katı olmalı.'] },
      { prompt: 'Bir fabrikada 8 saatte 1.200 parça üretiliyor. Aynı hızla 1.950 parça kaç saatte üretilir?', choices: ['13', '12', '14', '15'], answer: 0, feedback: [null, '12 saatte 1.800 parça üretilir; 150 parça daha var.', '14 saatte 2.100 parça üretilir.', '15 saatte 2.250 parça üretilir.'], explain: 'Saatte 1.200 ÷ 8 = 150 parça. 1.950 ÷ 150 = 13 saat' },
      { prompt: 'Bir çamaşır makinesi 3 yıkamada 150 L su kullanıyor. 8 yıkamada kaç litre su kullanır?', choices: ['400 L', '155 L', '450 L', '1.200 L'], answer: 0, feedback: [null, '5 yıkama fazla diye 5 L eklemek olmaz; yıkama başına 50 L düşüyor.', '9 yıkama için 450 L gerekir.', '150 · 8 yaptın; önce bir yıkamanın suyunu bulmalısın.'] },
      { prompt: 'Bir otoparkta ilk saat 50 TL, sonraki her saat 20 TL. 3 saat 90 TL ise 6 saat kaç TL’dir?', choices: ['150 TL', '180 TL', '120 TL', '200 TL'], answer: 0, feedback: [null, 'Bu durum orantılı değil: İlk saat farklı ücretli. 3 saatin ücretini 2 katına çıkarmak işe yaramaz.', 'Ücret 6 saatte azalmaz.', '6 saatte ilk saat 50, kalan 5 saat 5 · 20 = 100 TL.'], explain: '50 + 5 · 20 = 150 TL. Saat ile ücret orantılı değildir.' },
    ],
  },
  {
    id: 'g7-t6-hangisi-farkli',
    outcomes: ['MAT.7.1.7', 'MAT.7.1.5'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Dört limonata tarifinin limon : su oranları verildi. Birini seç ve neden farklı olduğunu açıkla. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: {
      text: 'Dört arkadaş limonata yaptı. Üçünün limonatası aynı tatta, birininki farklı. Ama “farklı” olmanın başka yolları da var!',
    },
    reflect: 'Aynı tatta olan tarifleri nasıl buldun? Sınıfta başka bir gerekçe öne süren oldu mu?',
    questions: [
      {
        prompt: 'Hangisi farklı? (limon : su)',
        choices: ['2 : 3', '4 : 6', '10 : 15', '3 : 4'],
        answer: 0,
        reasons: ['İki terimi de asal sayı olan tek oran.', 'İki terimi de çift sayı olan tek oran.', 'İki terimi de 5’in katı olan tek oran.', 'Diğerlerine denk olmayan, yani tadı farklı olan tek tarif.'],
      },
    ],
  },

  // ── Veriden Olasılığa ───────────────────────────────────────────────────

  // MAT.7.7.1
  {
    id: 'g7-zar-deneyi',
    outcomes: ['MAT.7.7.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Zar deneyi',
    instructions: 'Zarı birçok kez at ve sonuçları incele. Deneme sayısı arttıkça oranlar teorik olasılığa yaklaşır. Sonra soruyu cevapla.',
    level: 2,
    launch: {
      text: 'Bir zar attığında 3 gelmesini bekliyorsun. Kaç atışta bir 3 gelir? 6 atışta tam olarak bir kez mi?',
      visual: { kind: 'dice', value: 3 },
    },
    reflect: '10 atışta 3 hiç gelmeyebilir mi? Deneme sayısını artırınca ne fark ettin?',
    tool: 'probability',
    config: { mode: 'dice' },
    tasks: [
      { prompt: 'Zarı birçok kez at. Örnek uzaydaki çıktıları ve 3 gelmeyen atışları düşün.', target: { question: '3 gelmeme olasılığı kaçtır?', choices: ['[[1/6]]', '[[1/3]]', '[[5/6]]', '1'], answer: '[[5/6]]' }, hints: ['3 dışında kaç çıktı var?'] },
      { prompt: 'Çift sayı gelen ve tek sayı gelen atışları karşılaştır.', target: { question: 'Çift sayı gelmesi ile tek sayı gelmesi eşit olasılıklı mıdır?', choices: ['Evet, ikisi de [[1/2]]', 'Hayır, çift daha olası', 'Hayır, tek daha olası'], answer: 'Evet, ikisi de [[1/2]]' } },
      { prompt: '“5’ten büyük sayı gelmesi” olayını düşün.', target: { question: 'Bu olayın tümleyeni hangisidir?', choices: ['5 ya da 5’ten küçük sayı gelmesi', '5’ten küçük sayı gelmesi', '6 gelmesi'], answer: '5 ya da 5’ten küçük sayı gelmesi' }, hints: ['Tümleyen, olaya ait olmayan bütün çıktılardan oluşur. 5 hangi gruba girer?'] },
    ],
  },
  {
    id: 'g7-tumleyen-olay',
    outcomes: ['MAT.7.7.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Olay ve tümleyeni',
    instructions: 'Örnek uzaydaki çıktıları say. Olayın çıktıları ile tümleyenin çıktıları birlikte örnek uzayı oluşturur. Kesirleri “5/6” biçiminde yazabilirsin.',
    level: 2,
    launch: {
      text: 'Bir torbada 3 kırmızı ve 5 mavi top var. “Kırmızı çekmek” ve “kırmızı çekmemek” olaylarının çıktılarını yan yana koyarsan ne elde edersin?',
      visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 5 }] },
    },
    reflect: 'Bir olayın olasılığını bilince tümleyeninin olasılığını hiç çıktı saymadan nasıl bulursun? Neden işe yarıyor?',
    items: [
      { text: 'Zar atma deneyinin örnek uzayında __ çıktı vardır.', answers: ['6'] },
      { text: 'Zar atıldığında 3 gelme olasılığı [[1/6]]’dir. 3 gelmeme olasılığı __', answers: ['5/6'], hints: ['3 gelmeyen çıktıları listele: 1, 2, …'] },
      { text: 'Torbadan çekilen topun kırmızı olmama olasılığı __', answers: ['5/8|0,625'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 5 }] }, hints: ['Kırmızı olmayan kaç top var? Toplam kaç top var?'] },
      { text: 'A, B, C, D yazan dört karttan biri çekiliyor. A çekilmeme olasılığı __', answers: ['3/4|0,75'] },
      { text: 'Çark 6 eş parçaya bölünmüş. Sarı gelmeme olasılığı __', answers: ['5/6'], visual: { kind: 'spinner', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }, { label: 'S', color: '#eab308' }, { label: 'M', color: '#3b82f6' }, { label: 'K', color: '#ef4444' }] }, hints: ['Kaç parça sarı değil?'] },
      { text: 'Bir olayın olma olasılığı 0,35 ise olmama olasılığı __', answers: ['0,65|13/20|65/100'], hints: ['İkisinin toplamı kaç olmalı?'] },
      { text: 'Yarın yağmur yağma olasılığı %70 ise yağmur yağmama olasılığı %__', answers: ['30'] },
      { text: 'Bir olay ile tümleyeninin olasılıkları toplamı __', answers: ['1'] },
    ],
  },
  {
    id: 'g7-tumleyen-problem',
    outcomes: ['MAT.7.7.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ya olur ya olmaz!',
    instructions: 'Bir olay ile tümleyeni arasındaki ilişkiyi kullanarak problemleri çöz ve yanlış yorumları yakala.',
    level: 2,
    launch: {
      text: 'Hava durumu “yarın yağmur olasılığı %30” dedi. Ece “Ya yağar ya yağmaz; yani olasılık %50.” diyor. Ece’ye katılıyor musun?',
    },
    reflect: '“İki sonuç var, o hâlde olasılık yarı yarıya” düşüncesi ne zaman doğru, ne zaman yanlış? Bir örnek ver.',
    questions: [
      { prompt: 'Yarın yağmur yağma olasılığı %30. Yağmur yağmama olasılığı nedir?', choices: ['%70', '%30', '%50', '%130'], answer: 0, feedback: [null, 'Olay ile tümleyeninin olasılığı eşit olmak zorunda değil; toplamları %100 olmalı.', 'İki sonuç olması eşit olasılıklı olduklarını göstermez.', 'Olasılık %100’ü geçemez.'] },
      { prompt: 'Bir çekilişte 20 kart var ve yalnız 1 kart kazandırıyor. Kazanmama olasılığı kaçtır?', choices: ['[[19/20]]', '[[1/20]]', '[[1/19]]', '19'], answer: 0, feedback: [null, 'Bu kazanma olasılığı.', 'Payda örnek uzaydaki bütün çıktıların sayısıdır: 20.', 'Olasılık 0 ile 1 arasında bir sayıdır.'] },
      { prompt: 'Bir torbadan mavi top çekme olasılığı [[2/7]]. Torbada 14 top varsa kaç top mavi değildir?', choices: ['10', '4', '5', '12'], answer: 0, feedback: [null, '4, mavi topların sayısı.', 'Mavi olmama olasılığı [[5/7]]; ama torbada 7 değil 14 top var.', '14 − 2 = 12 yaptın; [[2/7]], 2 top demek değil.'], explain: 'Mavi olmama olasılığı [[5/7]] = [[10/14]]; 10 top mavi değildir.' },
      { prompt: 'Zar atma deneyinde “5’ten büyük sayı gelmesi” olayının tümleyeni hangisidir?', choices: ['5 ya da 5’ten küçük sayı gelmesi', '5’ten küçük sayı gelmesi', '6 gelmesi', 'Tek sayı gelmesi'], answer: 0, feedback: [null, '5 dışarıda kaldı; tümleyen olaya ait olmayan bütün çıktıları içerir.', '6, olayın kendisi.', 'Tek sayılar 1, 3, 5; 2 ve 4 de tümleyene girer.'] },
      { prompt: 'Bir olayın olasılığı 1 ise tümleyeninin olasılığı kaçtır?', choices: ['0', '1', '[[1/2]]', 'Bilinemez'], answer: 0, feedback: [null, 'Toplam 1 olmalı; 1 + 1 = 2 olur.', 'Kesin olayın tümleyeni imkânsız olaydır.', 'Toplamın 1 olduğunu kullanarak bulabilirsin.'] },
      { prompt: 'Ali: “Bir olayın olasılığı 0,6, tümleyeninin olasılığı 0,5.” diyor. Bu mümkün mü?', choices: ['Hayır; toplamları 1 olmalı, 0,6 + 0,5 = 1,1.', 'Evet; olasılıklar 1’den küçük.', 'Evet; olay ile tümleyeni ilişkisizdir.'], answer: 0, feedback: [null, 'Her biri 1’den küçük olsa da toplamları tam 1 olmalı.', 'Olay ile tümleyeni birlikte bütün örnek uzayı oluşturur.'] },
    ],
  },

  // MAT.7.7.2
  {
    id: 'g7-torba-deneyi',
    outcomes: ['MAT.7.7.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Torbadan top çek',
    instructions: 'Torbada 4 kırmızı, 3 sarı, 2 mavi top var. Çekilen top geri konuyor. Deneyi yap ve soruları cevapla.',
    level: 2,
    launch: {
      text: 'Torbada üç renk top var. Her rengin çekilme şansı aynı mı? Önce tahmin et, sonra deneyerek gör.',
      visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 4 }, { emoji: '🟡', count: 3 }, { emoji: '🔵', count: 2 }] },
    },
    reflect: 'Deney sonuçların teorik olasılıklara benziyor muydu? Benzemiyorsa neden olabilir?',
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Kırmızı', color: '#ef4444', weight: 4 }, { label: 'Sarı', color: '#eab308', weight: 3 }, { label: 'Mavi', color: '#3b82f6', weight: 2 }] },
    tasks: [
      { prompt: 'Torbadan birçok kez top çek ve sonuçları incele.', target: { question: 'Kırmızı top çekme olasılığı teorik olarak kaçtır?', choices: ['[[1/3]]', '[[4/9]]', '[[2/9]]', '[[4/5]]'], answer: '[[4/9]]' }, hints: ['Torbada toplam kaç top var? Kaçı kırmızı?'] },
      { prompt: 'Sarı ve mavi topların çekilme sayılarını karşılaştır.', target: { question: 'Sarı top çekme ile mavi top çekme olayları eşit olasılıklı mıdır?', choices: ['Evet', 'Hayır, sarı daha olası', 'Hayır, mavi daha olası'], answer: 'Hayır, sarı daha olası' }, explain: 'Eşit olasılık için olaylara ait çıktı (top) sayılarının eşit olması gerekir: 3 ≠ 2.' },
      { prompt: 'Torbaya top ekleyerek renkleri eşit olasılıklı yapmak istiyoruz.', target: { question: 'Üç rengin çekilme olasılığının eşit olması için torbaya en az kaç top eklenmeli?', choices: ['2', '3', '4', '9'], answer: '3' }, hints: ['En çok top hangi renkte? Diğer renkleri ona eşitlemek için kaçar top gerekir?'] },
    ],
  },
  {
    id: 'g7-esit-olasilik',
    outcomes: ['MAT.7.7.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Eşit olasılıklı olaylar',
    instructions: 'Aynı deneye ait olayların çıktılarını say. Çıktı sayıları eşitse olaylar eşit olasılıklıdır.',
    level: 2,
    launch: {
      text: 'Bir çarkta kırmızı iki parça, mavi ve sarı birer parça. Hangi renklerin gelme şansı aynı?',
      visual: { kind: 'spinner', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }, { label: 'K', color: '#ef4444' }, { label: 'S', color: '#eab308' }] },
    },
    reflect: 'İki olayın eşit olasılıklı olup olmadığına karar vermek için kullandığın ölçütü kendi cümlelerinle yaz.',
    questions: [
      { prompt: { text: 'Çark 4 eş parçaya ayrılmıştır (K: kırmızı, M: mavi, S: sarı). Hangi iki olay eşit olasılıklıdır?', visual: { kind: 'spinner', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }, { label: 'K', color: '#ef4444' }, { label: 'S', color: '#eab308' }] } }, choices: ['Kırmızı gelmesi ve mavi gelmesi', 'Mavi gelmesi ve sarı gelmesi', 'Kırmızı gelmesi ve sarı gelmesi', 'Hiçbiri'], answer: 1, feedback: ['Kırmızının 2 parçası, mavinin 1 parçası var.', null, 'Kırmızının 2 parçası, sarının 1 parçası var.', 'Mavi ve sarının parça sayıları eşit.'], explain: 'Mavi ve sarının birer parçası var: İkisinin olasılığı da [[1/4]].' },
      { prompt: 'Zar atıldığında “asal sayı gelmesi” ile “4’ten küçük sayı gelmesi” olayları için hangisi doğrudur?', choices: ['Asal sayı gelmesi daha olasıdır.', '4’ten küçük sayı gelmesi daha olasıdır.', 'Eşit olasılıklıdır.', 'Karşılaştırılamaz.'], answer: 2, feedback: ['Asal: 2, 3, 5 (3 çıktı). 4’ten küçük: 1, 2, 3 (3 çıktı).', 'Çıktıları listele: ikisinde de 3 çıktı var.', null, 'Çıktıları sayarak karşılaştırabiliriz.'], explain: 'Çıktılar farklı olsa da sayıları eşit (3); olasılıklar eşittir.' },
      { prompt: '1’den 10’a kadar numaralı kartlardan biri çekiliyor. Hangi olay çifti eşit olasılıklıdır?', choices: ['3’ün katı çekilmesi ve 5’in katı çekilmesi', 'Asal sayı çekilmesi ve 5’ten büyük sayı çekilmesi', 'Çift sayı çekilmesi ve tek sayı çekilmesi', '1 çekilmesi ve 10’dan büyük sayı çekilmesi'], answer: 2, feedback: ['3’ün katları: 3, 6, 9 (3 tane); 5’in katları: 5, 10 (2 tane).', 'Asallar: 2, 3, 5, 7 (4 tane); 5’ten büyükler: 6, 7, 8, 9, 10 (5 tane).', null, '10’dan büyük kart yok; bu olay imkânsız.'] },
      { prompt: 'Torbada 5 kırmızı ve 5 mavi top var. Bir kırmızı top çıkarılırsa kırmızı ve mavi çekme olayları için ne olur?', choices: ['Artık eşit olasılıklı değildir; mavi daha olası olur.', 'Yine eşit olasılıklıdır.', 'Kırmızı daha olası olur.'], answer: 0, feedback: [null, '4 kırmızı ve 5 mavi kaldı; çıktı sayıları eşit değil.', 'Kırmızı azaldı; şansı da azaldı.'] },
      { prompt: 'Aynı deneye ait iki olayın eşit olasılıklı olması için ölçüt nedir?', choices: ['Olayların adlarının benzer olması', 'Olaylara ait çıktı sayılarının eşit olması', 'Deneyin iki kez yapılması', 'Olayların ayrık olması'], answer: 1, feedback: ['Adlar değil, çıktı sayıları önemlidir.', null, 'Deneyin kaç kez yapıldığı teorik olasılığı değiştirmez.', 'Ayrık olmak, ortak çıktı olmaması demektir; eşit olasılıkla ilgisi yoktur.'] },
    ],
  },
  {
    id: 'g7-esit-olasilikli-mi',
    outcomes: ['MAT.7.7.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Eşit olasılıklı mı?',
    instructions: 'Her olay çiftinin çıktılarını say ve doğru gruba koy.',
    level: 2,
    launch: {
      text: 'Bir olayı “daha olası” yapan şey nedir? Çıktıları listeleyip saymak çoğu zaman cevabı verir.',
    },
    reflect: 'ÇANAKKALE kelimesindeki harflerle eşit olasılıklı iki olay oluşturabilir misin?',
    categories: [
      { id: 'esit', label: 'Eşit olasılıklı', color: '#22c55e' },
      { id: 'degil', label: 'Eşit olasılıklı değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Zar: 1 gelmesi – 6 gelmesi', category: 'esit' },
      { content: 'Madenî para: yazı gelmesi – tura gelmesi', category: 'esit' },
      { content: 'Torba (3 kırmızı, 3 mavi, 2 yeşil): kırmızı – mavi', category: 'esit' },
      { content: '1–8 numaralı kartlar: asal sayı – 4’ten büyük sayı', category: 'esit', explain: 'Asal: 2, 3, 5, 7; 4’ten büyük: 5, 6, 7, 8. İkisinde de 4 çıktı var.' },
      { content: 'Zar: 2’den büyük gelmesi – 2’den küçük gelmesi', category: 'degil', explain: '2’den büyük: 4 çıktı; 2’den küçük: yalnız 1.' },
      { content: 'Torba (3 kırmızı, 3 mavi, 2 yeşil): mavi – yeşil', category: 'degil' },
      { content: 'ÇANAKKALE kelimesinden bir harf: A – K', category: 'degil', explain: 'Kelimede 3 tane A, 2 tane K var.' },
      { content: '1–10 numaralı kartlar: 2’nin katı – 3’ün katı', category: 'degil' },
    ],
  },
  {
    id: 'g7-adil-mi',
    outcomes: ['MAT.7.7.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Adil mi?',
    instructions: 'Bir oyun, oyuncuların kazanma olasılıkları eşitse adildir. Her oyunu olasılıklarla değerlendir.',
    level: 3,
    launch: {
      text: 'Ali ile Ayşe zar oyunu oynuyor: 1, 2, 3 ya da 4 gelirse Ali, 5 ya da 6 gelirse Ayşe kazanıyor. Ayşe biraz huzursuz. Haklı mı?',
    },
    reflect: 'Kendi adil zar oyununu tasarla. Neden adil olduğunu olasılıklarla nasıl gösterirsin?',
    questions: [
      { prompt: '1, 2, 3 ya da 4 gelirse Ali, 5 ya da 6 gelirse Ayşe kazanıyor. Oyun adil mi?', choices: ['Adil değil; Ali’nin olasılığı [[4/6]], Ayşe’ninki [[2/6]].', 'Adil; ikisinin de kazanma şansı var.', 'Adil; çünkü zar hilesiz.'], answer: 0, feedback: [null, 'Şansın olması yetmez; şansların eşit olması gerekir.', 'Zar hilesiz ama kurallar eşit değil: Ali’nin 4, Ayşe’nin 2 çıktısı var.'] },
      { prompt: 'Oyunu adil yapmak için kurallar nasıl değiştirilmeli?', choices: ['Ali 1, 2, 3’te; Ayşe 4, 5, 6’da kazansın.', 'Ali 1, 2, 3, 4’te; Ayşe 6’da kazansın.', 'Ali çift sayıda; Ayşe 5’te kazansın.', 'Ali 1’de; Ayşe 2 ya da 3’te kazansın.'], answer: 0, feedback: [null, 'Bu Ayşe için daha da kötü: 4 çıktıya karşı 1 çıktı.', 'Çift sayılar 3 çıktı, 5 yalnız 1 çıktı.', 'Ali’nin 1, Ayşe’nin 2 çıktısı olur.'] },
      { prompt: { text: 'Çark 4 eş parçalı. Kırmızı gelirse Can, mavi ya da sarı gelirse Ece kazanıyor. Oyun adil mi?', visual: { kind: 'spinner', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }, { label: 'K', color: '#ef4444' }, { label: 'S', color: '#eab308' }] } }, choices: ['Adil; ikisinin olasılığı da [[2/4]].', 'Adil değil; Ece’nin iki rengi var.', 'Adil değil; kırmızı daha çok.'], answer: 0, feedback: [null, 'Renk sayısı değil, parça sayısı önemli: Ece’nin de Can’ın da 2 parçası var.', 'Kırmızı 2 parça; mavi ile sarı birlikte yine 2 parça.'] },
      { prompt: 'Torbada 4 kırmızı, 3 sarı, 2 mavi top var. Üç rengin çekilme olasılığının eşit olması için torbaya en az kaç top eklenmelidir?', choices: ['3', '2', '4', '9'], answer: 0, feedback: [null, '2 top eklersen renklerden biri yine eksik kalır.', '4 top gerekmez; 1 sarı ve 2 mavi yeter.', '9 top eklemek gerekmez; renkleri 4’er topa eşitlemek yeter.'], explain: '1 sarı ve 2 mavi eklenirse her renkten 4 top olur.' },
      { prompt: 'Sınıfta 12 kız, 18 erkek var. Kurayla bir başkan seçilecek. Mert: “Kız ya da erkek; iki seçenek var, olasılıklar eşit.” diyor. Mert haklı mı?', choices: ['Hayır; kız seçilme olasılığı [[12/30]], erkek seçilme olasılığı [[18/30]].', 'Evet; iki seçenek varsa olasılıklar eşittir.', 'Evet; kura adildir.'], answer: 0, feedback: [null, 'İki sonuç olması eşit olasılıklı oldukları anlamına gelmez; çıktı sayılarına bak: 12 ve 18.', 'Kura her öğrenci için adildir, ama erkek öğrenci sayısı daha fazla.'] },
    ],
  },

  // MAT.7.7.3
  {
    id: 'g7-ayrik-ortak-cikti',
    outcomes: ['MAT.7.7.3'],
    type: 'fill',
    stage: 'model',
    title: 'Ortak çıktı var mı?',
    instructions: 'Olayların çıktılarını tabloda karşılaştır. Ortak çıktı yoksa olaylar ayrıktır.',
    level: 1,
    launch: {
      text: 'Bir zar atıldı. “Çift sayı geldi” ve “asal sayı geldi” cümleleri aynı anda doğru olabilir mi? Peki “tek sayı geldi” ve “4 geldi”?',
      visual: { kind: 'table', headers: ['Olay', 'Çıktılar'], rows: [['Çift sayı', '2, 4, 6'], ['Asal sayı', '2, 3, 5']] },
    },
    reflect: 'İki olayın aynı anda gerçekleşip gerçekleşemeyeceğini nasıl anlarsın? Ortak çıktı neden önemli?',
    items: [
      { text: 'Çift sayı gelmesi ile asal sayı gelmesi olaylarının ortak çıktısı __', answers: ['2'], visual: { kind: 'table', headers: ['Olay', 'Çıktılar'], rows: [['Çift sayı', '2, 4, 6'], ['Asal sayı', '2, 3, 5']] }, hints: ['İki satırda da bulunan sayı hangisi?'] },
      { text: 'Tek sayı gelmesi ile 4 gelmesi olaylarının ortak çıktı sayısı __', answers: ['0'], visual: { kind: 'table', headers: ['Olay', 'Çıktılar'], rows: [['Tek sayı', '1, 3, 5'], ['4 gelmesi', '4']] } },
      { text: '2’den büyük gelmesi ile 5’ten küçük gelmesi olaylarının ortak çıktıları 3 ve __’tür.', answers: ['4'], hints: ['2’den büyük: 3, 4, 5, 6. 5’ten küçük: 1, 2, 3, 4.'] },
      { text: '“4 gelmesi” ile “4 gelmemesi” olaylarının ortak çıktı sayısı __', answers: ['0'], explain: 'Bir olay ile tümleyeni her zaman ayrıktır.' },
      { text: '1–12 numaralı kartlardan biri çekiliyor. “Çift sayı” ile “5’in katı” olaylarının ortak çıktısı __', answers: ['10'], hints: ['5’in katları: 5, 10. Hangisi çift?'] },
      { text: 'Ortak çıktısı olmayan olaylara __ olaylar denir.', answers: ['ayrık'], choices: ['ayrık', 'eşit olasılıklı', 'tümleyen', 'kesin'] },
    ],
  },
  {
    id: 'g7-ayrik-olaylar',
    outcomes: ['MAT.7.7.3'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Ayrık mı, değil mi?',
    instructions: 'Bir zar atılıyor. Olay çiftlerinin ortak çıktısı var mı? Ortak çıktısı yoksa olaylar ayrıktır.',
    level: 2,
    launch: {
      text: 'Çıktıları listelemek bir dedektifin parmak izi karşılaştırması gibidir: Ortak bir çıktı bulursan olaylar ayrık değildir.',
    },
    reflect: 'Ayrık olan iki olay eşit olasılıklı olabilir mi? Bir örnek bul.',
    categories: [
      { id: 'ayrik', label: 'Ayrık olaylar', color: '#3b82f6' },
      { id: 'degil', label: 'Ayrık olmayan olaylar', color: '#f97316' },
    ],
    items: [
      { content: 'Çift sayı gelmesi – tek sayı gelmesi', category: 'ayrik' },
      { content: '4 gelmesi – 4 gelmemesi', category: 'ayrik' },
      { content: '1 gelmesi – asal sayı gelmesi', category: 'ayrik', explain: '1 asal sayı değildir; ortak çıktı yok.' },
      { content: '5’ten büyük gelmesi – 3’ten küçük gelmesi', category: 'ayrik' },
      { content: 'Çift sayı gelmesi – asal sayı gelmesi', category: 'degil', explain: '2 hem çift hem asal.' },
      { content: '2’den büyük gelmesi – 5’ten küçük gelmesi', category: 'degil' },
      { content: '3’ün katı gelmesi – çift sayı gelmesi', category: 'degil', explain: '6 ortak çıktı.' },
      { content: 'Tek sayı gelmesi – 3’ün katı gelmesi', category: 'degil', explain: '3 ortak çıktı.' },
    ],
  },
  {
    id: 'g7-ayrik-olay-yorumla',
    outcomes: ['MAT.7.7.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ayrık olayları yorumla',
    instructions: 'Olayların çıktılarını listele ve ortak çıktı olup olmadığını incele.',
    level: 3,
    launch: {
      text: 'Haftanın günlerinden biri rastgele seçilecek. “Adında ş harfi olan gün” ile “hafta sonu günü” aynı anda gerçekleşebilir mi?',
    },
    reflect: 'Bir olay ile tümleyeni neden her zaman ayrıktır? Bir arkadaşına zar örneğiyle anlat.',
    questions: [
      { prompt: 'Ayrık olaylar için hangisi doğrudur?', choices: ['Ortak çıktıları yoktur.', 'Olasılıkları eşittir.', 'Olasılıkları toplamı 2’dir.', 'En az bir ortak çıktıları vardır.'], answer: 0, feedback: [null, 'Ayrık olmak ile eşit olasılıklı olmak farklı şeylerdir.', 'Hiçbir olasılık toplamı 1’i geçemez.', 'Bu, ayrık olmayan olayların tanımıdır.'] },
      { prompt: '1’den 12’ye kadar numaralı kartlardan biri çekiliyor. “Çift sayı çekme” ve “5’in katı çekme” olayları için hangisi doğrudur?', choices: ['Ayrıktır.', 'Ayrık değildir; ortak çıktı 10’dur.', 'Ayrık değildir; ortak çıktı 5’tir.', 'Eşit olasılıklıdır.'], answer: 1, feedback: ['10 hem çift hem 5’in katı.', null, '5 çift sayı değildir.', 'Çiftler 6 tane, 5’in katları 2 tane.'] },
      { prompt: 'Bir olay ile tümleyeni için hangisi her zaman doğrudur?', choices: ['Eşit olasılıklıdır.', 'Ayrıktır ve olasılıkları toplamı 1’dir.', 'Ortak çıktıları vardır.', 'Olasılıkları toplamı 0’dır.'], answer: 1, feedback: ['Zarda “6 gelmesi” ile tümleyeni eşit olasılıklı değildir.', null, 'Tümleyen, olaya ait olmayan çıktılardan oluşur; ortak çıktı olamaz.', 'Toplamları her zaman 1’dir.'] },
      { prompt: 'Zar atma deneyinde “asal sayı gelmesi” olayı ile hangi olay ayrıktır?', choices: ['Tek sayı gelmesi', '2’den büyük gelmesi', 'Çift sayı gelmesi', '4 gelmesi'], answer: 3, feedback: ['3 ve 5 hem asal hem tek.', '3 ve 5 ortak çıktılar.', '2 hem asal hem çift.', null], explain: 'Asal sayılar 2, 3, 5’tir. 4 bunlardan biri değildir.' },
      { prompt: 'Haftanın günlerinden biri rastgele seçiliyor. “Adında ş harfi olan gün” ile “hafta sonu günü” olayları için hangisi doğrudur?', choices: ['Ayrık değildir.', 'Ayrıktır.', 'İkisi de imkânsızdır.'], answer: 1, feedback: ['Ortak bir gün bulmaya çalış: Çarşamba ve Perşembe hafta sonu değil.', null, 'Çarşamba ve Perşembe’nin adında ş var; olay imkânsız değil.'], explain: 'Adında ş olan günler: Çarşamba, Perşembe. Hafta sonu: Cumartesi, Pazar. Ortak gün yoktur.' },
    ],
  },
  {
    id: 'g7-t7-hangisi-farkli',
    outcomes: ['MAT.7.7.3', 'MAT.7.7.1'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Bir zar atılıyor. Dört olaydan birini seç ve neden farklı olduğunu açıkla. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: {
      text: 'Olayları olasılıklarına, çıktı sayılarına, imkânsız ya da kesin olmalarına göre karşılaştırabiliriz. Sen hangi açıdan bakacaksın?',
    },
    reflect: 'Bu dört olaydan hangi ikisi ayrık? Hangi ikisi ayrık değil? Gerekçenle söyle.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Çift sayı gelmesi', '6’dan küçük sayı gelmesi', '7 gelmesi', '3 gelmesi'],
        answer: 0,
        reasons: ['Olasılığı tam [[1/2]] olan tek olay.', 'En olası olay ([[5/6]]); tümleyeni tek bir çıktıdan (6) oluşuyor.', 'İmkânsız bir olay: olasılığı 0 olan tek olay.', 'Tam olarak bir çıktısı olan tek olay; olasılığı [[1/6]].'],
      },
    ],
  },

  // ── İşlemlerle Cebirsel Düşünme ve Değişimler ───────────────────────────

  // MAT.7.2.1
  {
    id: 'g7-cebir-karolari',
    outcomes: ['MAT.7.2.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Cebir karolarıyla işlem',
    instructions: 'İfadeyi karolarla modelle. Uzun karo x, küçük kare 1’dir; kırmızılar negatiftir. Bir pozitif ve bir negatif karo sıfır çifti oluşturur. Sonucu en sade hâliyle göster.',
    level: 2,
    launch: {
      text: 'Bir manav kasaları (x) ve tek tek elmaları (1) sayıyor. 2 kasa ve 3 elmaya 1 kasa ve 4 elma daha gelirse toplam ne olur? Kasalarla elmaları neden ayrı sayarız?',
    },
    reflect: 'x karoları ile 1 karolarını neden birleştiremiyoruz? “Benzer terim” ne demek, karolarla açıkla.',
    tool: 'algebra',
    tasks: [
      { prompt: '2x + 3 ifadesini modelle.', target: { x2: 0, x: 2, c: 3 } },
      { prompt: '(x + 4) + (2x − 6) toplamını modelle ve sadeleştir.', target: { x2: 0, x: 3, c: -2 }, hints: ['x karolarını bir araya, 1 karolarını bir araya topla.', '4 pozitif ile 6 negatif birim karodan kaç sıfır çifti çıkar?'] },
      { prompt: '(4x + 2) − (2x + 5) farkını modelle ve sadeleştir.', target: { x2: 0, x: 2, c: -3 }, hints: ['4 x karosundan 2’sini çıkar.', '2 birim karodan 5 birim çıkarmak için 3 sıfır çifti eklemen gerekir.'] },
      { prompt: '−2(x − 2) ifadesini modelle: (x − 2) grubunun tersinden 2 tane.', target: { x2: 0, x: -2, c: 4 }, hints: ['(x − 2) grubunun tersi (−x + 2) olur. Bundan 2 tane al.'], explain: '−2(x − 2) = −2x + 4: Ayraç önündeki −2, içerideki her terimle çarpılır.' },
    ],
  },
  {
    id: 'g7-ifade-model',
    outcomes: ['MAT.7.2.1'],
    type: 'match',
    stage: 'model',
    title: 'Model ↔ cebirsel ifade',
    instructions: 'Her şerit modelini ya da durumu onu anlatan cebirsel ifadeyle eşleştir.',
    level: 2,
    launch: {
      text: 'Can’ın x TL’si var. Elif’in parası Can’ınkinin 3 katından 5 TL eksik. Bunu bir şeritle çizebilir misin? Peki bir ifadeyle yazabilir misin?',
      visual: { kind: 'tape', parts: [{ label: 'x', value: 2 }, { label: 'x', value: 2 }, { label: 'x', value: 2 }], compare: [{ label: 'Elif', value: 5 }, { label: '5', value: 1 }] },
    },
    reflect: '3(x + 2) ile 3x + 6’nın aynı şeyi anlattığını şerit modelinde nasıl görürsün?',
    perRound: 6,
    pairs: [
      { left: { text: 'Şerit modeli', visual: { kind: 'tape', parts: [{ label: 'x', value: 2 }, { label: 'x', value: 2 }, { label: 'x', value: 2 }, { label: '5', value: 1 }] } }, right: '3x + 5' },
      { left: { text: 'Şerit modeli', visual: { kind: 'tape', parts: [{ label: 'x + 2', value: 2 }, { label: 'x + 2', value: 2 }, { label: 'x + 2', value: 2 }] } }, right: '3x + 6' },
      { left: 'Kenarları (x + 4) cm ve 3 cm olan dikdörtgenin alanı', right: '3x + 12' },
      { left: 'Can’ın x TL’si var; Elif’in parası bunun 3 katından 5 TL eksik.', right: '3x − 5' },
      { left: 'Kenarı x cm olan eşkenar üçgenin çevresi', right: '3x' },
      { left: 'x TL’lik bir ürünün yarı fiyatına 10 TL kargo ekleniyor.', right: '[[1/2]]x + 10' },
    ],
  },
  {
    id: 'g7-terimleri-tani',
    outcomes: ['MAT.7.2.1'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Terimler ve denk ifadeler',
    instructions: 'Terim, katsayı ve sabit terimi belirle; işlem özelliklerini kullanarak denk ifadeleri bul. Emin değilsen x yerine bir sayı koyup dene!',
    level: 2,
    launch: {
      text: 'Bir öğrenci 2x + 3x = 5x² yazmış. Başka biri 5(a − b) = 5a − b. İkisi de “Bence doğru!” diyor. Bu ifadeleri nasıl kontrol edebiliriz?',
    },
    reflect: 'İki ifadenin denk olup olmadığını x yerine sayı koyarak kontrol ettin mi? Tek bir sayı denemek yeterli mi?',
    questions: [
      { prompt: '5x − 3 + 2x ifadesindeki benzer terimler hangileridir?', choices: ['5x ve −3', '5x ve 2x', '−3 ve 2x', 'Benzer terim yoktur'], answer: 1, feedback: ['5x’te değişken var, −3’te yok; benzer değiller.', null, '2x’te değişken var, −3’te yok.', '5x ile 2x aynı değişkeni içeriyor.'] },
      { prompt: '−4a + 7 ifadesinde a’nın katsayısı kaçtır?', choices: ['4', '7', '−4', 'a'], answer: 2, feedback: ['Katsayı işaretiyle birlikte alınır: −4.', '7 sabit terimdir.', null, 'a değişkendir; katsayı onun önündeki sayıdır.'] },
      { prompt: '2x + 3x ifadesinin en sade hâli hangisidir?', choices: ['5x', '5x^{2}', '6x', '5'], answer: 0, feedback: [null, 'x’ler toplanınca kare olmaz: 2 tane x ile 3 tane x, 5 tane x eder.', 'Katsayıları çarptın; benzer terimler toplanırken katsayılar toplanır.', 'x’i kaybettin; 5 tane x var.'] },
      { prompt: '5(a − b) ifadesine denk olan hangisidir?', choices: ['5a − b', '5a − 5b', 'a − 5b', '5a + 5b'], answer: 1, feedback: ['5, ayraç içindeki her terimle çarpılır; b ile de.', null, '5 yalnız b ile değil, a ile de çarpılır.', 'Ayraç içindeki eksi işareti korunur.'] },
      { prompt: '(2x + 3) ile (4x − 1) ifadelerinin toplamı hangisidir?', choices: ['6x + 2', '6x + 4', '2x + 2', '8x − 3'], answer: 0, feedback: [null, '3 + (−1) = 2; 4 değil.', '4x − 2x yaptın; toplamamız gerekiyor.', 'x’leri çarpmadın, topla: 2x + 4x.'] },
      { prompt: 'x = 2 için 3(x + 4) ve 3x + 4 ifadelerinin değerleri nedir?', choices: ['18 ve 10; bu ifadeler denk değildir.', '18 ve 18; ifadeler denktir.', '10 ve 10; ifadeler denktir.', '14 ve 10; ifadeler denk değildir.'], answer: 0, feedback: [null, '3x + 4 ifadesinde x = 2 için 3 · 2 + 4 = 10 bulunur.', '3(x + 4) ifadesinde x = 2 için 3 · 6 = 18 bulunur.', '3(2 + 4) = 3 · 6 = 18; 14 değil.'], explain: '3(x + 4) = 3x + 12 olmalı; 3 yalnız x ile değil, 4 ile de çarpılır.' },
      { prompt: '(5y + 3) − (2y − 4) ifadesinin en sade hâli hangisidir?', choices: ['3y + 7', '3y − 1', '7y − 1'], answer: 0, feedback: [null, 'Ayraç önündeki eksi her terimin işaretini değiştirir: −(−4) = +4.', 'y’leri topladın; 5y’den 2y çıkarılmalı.'] },
    ],
  },
  {
    id: 'g7-t8-hangisi-farkli',
    outcomes: ['MAT.7.2.1'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Dört ifadeden birini seç ve neden farklı olduğunu açıkla. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: {
      text: 'Aynı değeri anlatan ifadeler birbirinden çok farklı görünebilir. Görünüşe mi bakacaksın, değere mi?',
    },
    reflect: 'Hangi ifadelerin denk olduğunu nasıl kontrol ettin? x yerine birkaç sayı koymak sana ne söyledi?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['2(x + 3)', '2x + 6', 'x + x + 6', '2x + 3'],
        answer: 0,
        reasons: ['Ayraç içeren, çarpım biçiminde yazılmış tek ifade.', 'Hem en sade hâlde yazılmış hem de sabit terimi 6 olan tek ifade.', 'Benzer terimleri henüz toplanmamış tek ifade.', 'Diğerlerine denk olmayan tek ifade: x = 1 için 5 eder, diğerleri 8.'],
      },
    ],
  },

  // MAT.7.2.2
  {
    id: 'g7-terazi-denklem',
    outcomes: ['MAT.7.2.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Terazide denklem',
    instructions: 'Terazinin dengesini bozmadan iki kefeden aynı miktarı çıkar ve bir kutunun (x) değerini bul.',
    level: 1,
    launch: {
      text: 'Terazinin bir kefesinde 2 kutu ve 3 bilye, öbür kefesinde 11 bilye var. Terazi dengede. Kutuyu açmadan içinde kaç bilye olduğunu bulabilir misin?',
      visual: { kind: 'balance', left: ['x', 'x', '1', '1', '1'], right: ['11'] },
    },
    reflect: 'Terazide iki kefeden aynı şeyi çıkarmak, denklemde neye karşılık geliyor? Neden dengeyi bozmuyor?',
    tool: 'balance',
    tasks: [
      { prompt: '2x + 3 = 11 denklemini çöz.', target: { a: 2, b: 3, c: 11 }, hints: ['İki kefeden de 3 bilye çıkar. Ne kalır?', '2 kutu 8 bilyeye eşitse 1 kutu kaç bilye?'] },
      { prompt: '3x + 2 = 14 denklemini çöz.', target: { a: 3, b: 2, c: 14 } },
      { prompt: '4x + 1 = 21 denklemini çöz.', target: { a: 4, b: 1, c: 21 } },
      { prompt: '5x + 2 = 17 denklemini çöz.', target: { a: 5, b: 2, c: 17 } },
    ],
  },
  {
    id: 'g7-serit-denklem',
    outcomes: ['MAT.7.2.2'],
    type: 'fill',
    stage: 'model',
    title: 'Şerit modeliyle denklem',
    instructions: 'Şeridin parçalarını düşün: Bilinen parçayı çıkar, kalanı eş parçalara paylaştır. Sonucu denklemde yerine koyarak kontrol et.',
    level: 2,
    launch: {
      text: 'Elif 5 defter ve 12 TL’lik bir kalem aldı, toplam 87 TL ödedi. Defterlerin hepsi aynı fiyatta. Bir şerit çizip bir defterin fiyatını bulalım.',
      visual: { kind: 'tape', parts: [{ label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: '12', value: 12 }], total: '87 TL' },
    },
    reflect: 'Şerit modeli ile terazi modeli arasında nasıl bir benzerlik var? Hangisi senin için daha kullanışlı?',
    items: [
      { text: '3x + 4 = 19 ise x = __', answers: ['5'], visual: { kind: 'tape', parts: [{ label: 'x', value: 5 }, { label: 'x', value: 5 }, { label: 'x', value: 5 }, { label: '4', value: 4 }], total: '19' }, hints: ['Şeridin tamamından 4’lük parçayı çıkarırsan geriye ne kalır?', '3 eş parça 15 ise bir parça kaç?'] },
      { text: '2x + 7 = 25 ise x = __', answers: ['9'], visual: { kind: 'tape', parts: [{ label: 'x', value: 9 }, { label: 'x', value: 9 }, { label: '7', value: 7 }], total: '25' } },
      { text: 'Elif’in aldığı bir defter __ TL’dir.', answers: ['15'], visual: { kind: 'tape', parts: [{ label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: 'x', value: 15 }, { label: '12', value: 12 }], total: '87 TL' }, hints: ['Önce kalemin fiyatını çıkar: 87 − 12.'] },
      { text: 'İki şerit eşit uzunlukta: 3x + 4 = x + 18. x = __', answers: ['7'], visual: { kind: 'tape', parts: [{ label: 'x', value: 7 }, { label: 'x', value: 7 }, { label: 'x', value: 7 }, { label: '4', value: 4 }], compare: [{ label: 'x', value: 7 }, { label: '18', value: 18 }] }, hints: ['İki şeritten de birer x çıkar. Geriye ne kalır?', '2x + 4 = 18 ise 2x kaç?'] },
      { text: 'Bir sayının [[1/3]]’ü 6 ise sayı __', answers: ['18'], visual: { kind: 'tape', parts: [{ label: '6', value: 1 }, { label: '', value: 1 }, { label: '', value: 1 }], total: 'x' }, hints: ['Şerit 3 eş parça; bir parça 6.'] },
      { text: '4(x − 2) = 20 ise x = __', answers: ['7'], hints: ['4 eş parçanın toplamı 20 ise bir parça, yani (x − 2) kaç?'] },
      { text: '−2x + 5 = 11 ise x = __', answers: ['-3'], hints: ['Önce iki taraftan 5 çıkar.', '−2x = 6 ise x pozitif mi negatif mi olmalı?'] },
    ],
  },
  {
    id: 'g7-esitsizlik-sayi-dogrusu',
    outcomes: ['MAT.7.2.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Eşitsizlik sayı doğrusunda',
    instructions: 'Eşitsizliğin çözümü tek bir sayı değil, bir aralıktır. Dolu daire “dâhil”, boş daire “dâhil değil” demektir. Emin değilsen birkaç sayı dene!',
    level: 2,
    launch: {
      text: 'Asansörde “En fazla 8 kişi” yazıyor. 8 kişi binebilir mi? 9 kişi? 5,5 kişi olmaz ama 7 kişi olur. Bütün olası değerleri sayı doğrusunda nasıl gösteririz?',
      visual: ineq(8, '≤', 3, 10),
    },
    reflect: 'Bir eşitsizliği negatif bir sayıyla bölünce yönü neden değişiyor? x = −5 ve x = 0 gibi sayıları deneyerek açıkla.',
    questions: [
      { prompt: 'Asansöre binen kişi sayısı k için k ≤ 8. Hangi gösterim doğrudur?', choices: [{ visual: ineq(8, '≤', 3, 10) }, { visual: ineq(8, '<', 3, 10) }, { visual: ineq(8, '≥', 3, 10) }, { visual: ineq(8, '>', 3, 10) }], answer: 0, feedback: [null, 'Boş daire 8’in dâhil olmadığını gösterir; ama tam 8 kişi binebilir.', 'Bu “en az 8 kişi” demek.', 'Bu “8’den fazla kişi” demek.'] },
      { prompt: { text: 'Sayı doğrusundaki gösterim hangi eşitsizliktir?', visual: ineq(-2, '>', -5, 5) }, choices: ['x > −2', 'x ≥ −2', 'x < −2', 'x ≤ −2'], answer: 0, feedback: [null, 'Daire boş: −2 çözüme dâhil değil.', 'Işın sağa, yani büyük sayılara doğru gidiyor.', 'Işın sağa gidiyor ve daire boş.'] },
      { prompt: 'x + 5 > 12 eşitsizliğinin çözümü hangisidir?', choices: ['x > 7', 'x < 7', 'x > 17', 'x = 7'], answer: 0, feedback: [null, 'x = 8’i dene: 13 > 12 doğru. x = 6’yı dene: 11 > 12 yanlış.', 'İki taraftan 5 çıkarmalısın, eklememelisin.', '7 + 5 = 12; 12, 12’den büyük değil. Çözüm tek bir sayı değil, bir aralıktır.'] },
      { prompt: '−2x < 8 eşitsizliğinin çözümü hangisidir? Önce x = −5 ve x = 0 değerlerini dene.', choices: ['x > −4', 'x < −4', 'x > 4', 'x < 4'], answer: 0, feedback: [null, 'x = −5’i dene: −2 · (−5) = 10; 10 < 8 yanlış. Negatif bir sayıya bölünce eşitsizliğin yönü değişir.', '8 ÷ (−2) = −4; 4 değil.', 'x = 0 sağlıyor ama x = −3 de sağlıyor; çözüm −4’ten büyük sayılardır.'], explain: 'Her iki taraf −2’ye bölünür ve yön değişir: x > −4' },
      { prompt: '3x − 4 ≤ 11 eşitsizliğini sağlayan en büyük tam sayı kaçtır?', choices: ['5', '4', '6', '15'], answer: 0, feedback: [null, '5’i de dene: 3 · 5 − 4 = 11 ≤ 11 doğru.', '3 · 6 − 4 = 14; 14 ≤ 11 yanlış.', '15, 3x’in en büyük değeri; x değil.'], explain: '3x ≤ 15 → x ≤ 5' },
      { prompt: 'Hangi sayı 2x + 1 > 3x − 2 eşitsizliğini sağlar?', choices: ['2', '3', '4', '5'], answer: 0, feedback: [null, '3’ü yerine koy: 7 > 7 doğru değil; eşit olmak büyük olmak değildir.', '4 için 9 > 10 yanlış.', '5 için 11 > 13 yanlış.'], explain: '2x + 1 > 3x − 2 → 3 > x. Seçeneklerden yalnız 2 sağlar.' },
    ],
  },
  {
    id: 'g7-denklem-coz',
    outcomes: ['MAT.7.2.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Denklem çöz',
    instructions: 'Eşitliğin her iki tarafına aynı işlemi uygula (terazi gibi). Çözümü denklemde yerine koyarak kontrol et.',
    level: 2,
    launch: {
      text: 'Terazi ve şerit modelleri zihninde. Şimdi yalnız sembollerle çalışacağız; her adımda “dengeyi koruyor muyum?” diye sor.',
    },
    reflect: 'Bir denklemi çözerken hangi adımda en çok hata yaptın? Kontrol adımı hatayı yakalamana yardım etti mi?',
    generator: { id: 'equation', params: { maxA: 6, max: 12, negatives: true }, count: 8 },
  },
  {
    id: 'g7-denklem-problemleri',
    outcomes: ['MAT.7.2.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Denklem ve eşitsizlik kur, çöz',
    instructions: 'Problemdeki bilinmeyene bir harf ver, eşitlik mi eşitsizlik mi olduğuna karar ver, kur ve çöz.',
    level: 3,
    launch: {
      text: 'Bir şehrin günlük enerji tüketimi 500 megavat (MW). Sürdürülebilir olması için en az %60’ını yenilenebilir kaynaklardan karşılamalı. “En az” sözcüğü matematikte nasıl yazılır?',
    },
    reflect: 'Bir problemde “en az”, “en fazla”, “eşit” gibi sözcükler hangi sembollere dönüşür? Kendi örneğini kur.',
    questions: [
      { prompt: 'Ayşe’nin yaşının 3 katının 4 fazlası 40’tır. Ayşe kaç yaşındadır?', choices: ['12', '10', '14', '36'], answer: 0, feedback: [null, '3 · 10 + 4 = 34; 40 değil.', '3 · 14 + 4 = 46; 40 değil.', '36, Ayşe’nin yaşının 3 katı; bir adım daha var.'], explain: '3x + 4 = 40 → 3x = 36 → x = 12' },
      { prompt: 'Ardışık üç tam sayının toplamı 72’dir. En büyük sayı kaçtır?', choices: ['25', '23', '24', '26'], answer: 0, feedback: [null, '23 en küçük sayı; en büyüğü soruluyor.', '24 ortadaki sayı (72 ÷ 3).', '24 + 25 + 26 = 75 eder.'], explain: 'x + (x + 1) + (x + 2) = 72 → 3x + 3 = 72 → x = 23. En büyüğü 25.' },
      { prompt: 'Mehmet’in kumbarasında 120 TL var ve her hafta 30 TL ekliyor. Can’ın 300 TL’si var ve her hafta 15 TL ekliyor. Kaç hafta sonra paraları eşit olur?', choices: ['12', '6', '10', '18'], answer: 0, feedback: [null, '6 hafta sonra Mehmet’in 300, Can’ın 390 TL’si olur.', '10 hafta sonra 420 ve 450 TL; henüz eşit değil.', '18 hafta sonra Mehmet geçmiş olur: 660 ve 570 TL.'], explain: '120 + 30x = 300 + 15x → 15x = 180 → x = 12' },
      { prompt: '3x − x = 4x − 2x denklemi için hangisi doğrudur?', choices: ['Her x değeri için doğrudur.', 'Yalnız x = 0 için doğrudur.', 'Hiçbir x değeri için doğru değildir.', 'Yalnız x = 1 için doğrudur.'], answer: 0, feedback: [null, 'x = 5’i dene: 10 = 10. Başka değerler de sağlıyor.', 'İki taraf da 2x’e eşit; her değer sağlar.', 'x = 3’ü dene: 6 = 6.'], explain: 'İki taraf da 2x’e eşittir; x yerine hangi sayı yazılırsa yazılsın eşitlik sağlanır.' },
      { prompt: 'Bir asansör en fazla 480 kg taşıyabiliyor. Asansörde 75 kg’lık bir görevli var. Her biri 25 kg olan kolilerden en fazla kaç tane yüklenebilir?', choices: ['16', '17', '19', '15'], answer: 0, feedback: [null, '75 + 25 · 17 = 500 kg; 480’i geçer.', '19 koli, görevliyi hesaba katmayınca bulunur.', '15 koli yüklenebilir ama en fazla sayı 16.'], explain: '75 + 25k ≤ 480 → 25k ≤ 405 → k ≤ 16,2. En fazla 16 koli.' },
      { prompt: 'Şehrin yenilenebilir enerji üretimi y MW olsun. Üretim, 500 MW’lık tüketimin en az %60’ı olmalı. Hangi eşitsizlik bu durumu anlatır?', choices: ['y ≥ 300', 'y ≤ 300', 'y > 500', 'y = 60'], answer: 0, feedback: [null, '“En az” 300 MW demek: 300 ya da daha fazlası. ≤ ise “en fazla” anlamına gelir.', '500 MW tüketimin tamamı; %60’ı 300 MW.', '60 bir yüzde; MW cinsinden değer 500’ün %60’ı.'] },
      { prompt: '5x − 3x > 4 + 2x eşitsizliği için hangisi doğrudur?', choices: ['Hiçbir x değeri için doğru değildir.', 'Her x değeri için doğrudur.', 'Yalnız x > 2 için doğrudur.', 'Yalnız x = 0 için doğrudur.'], answer: 0, feedback: [null, 'x = 0’ı dene: 0 > 4 yanlış.', 'x = 3’ü dene: 6 > 10 yanlış.', 'x = 0 için 0 > 4 yanlış.'], explain: '2x > 4 + 2x → 0 > 4 olur; bu hiçbir zaman doğru değildir.' },
    ],
  },

  // MAT.7.2.3
  {
    id: 'g7-nokta-dizilimi',
    outcomes: ['MAT.7.2.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Noktalarla düşün',
    instructions: 'Sayıları ikişerli sıralar hâlinde noktalarla göster. Çift sayılarda her noktanın eşi vardır; tek sayılarda bir nokta eşsiz kalır.',
    level: 1,
    launch: {
      text: '5 + 7 = 12, 3 + 9 = 12, 11 + 1 = 12… İki tek sayıyı topladığında hep çift mi çıkıyor? Bunu yalnız örneklerle mi söyleyebiliriz?',
      visual: pairDots([5, 7]),
    },
    reflect: 'Nokta modeli, “iki tek sayının toplamı her zaman çifttir” önermesini neden bütün sayılar için gösteriyor?',
    questions: [
      { prompt: { text: '7 sayısı ikişerli sıralarla gösterildi. Ne fark ediyorsun?', visual: pairDots([7]) }, choices: ['Bir nokta eşsiz kalıyor.', 'Bütün noktalar eşleşiyor.', 'İki nokta eşsiz kalıyor.'], answer: 0, feedback: [null, 'Son sütuna bak: bir nokta tek başına.', 'Yalnız bir nokta eşsiz; tek sayıların hepsinde böyle.'] },
      { prompt: { text: 'İki tek sayı (5 ve 7) yan yana konuldu. Eşsiz kalan iki nokta ne yapar?', visual: pairDots([5, 7]) }, choices: ['Birbirleriyle eşleşir; toplam çift olur.', 'Eşsiz kalırlar; toplam tek olur.', 'Kaybolurlar.'], answer: 0, feedback: [null, 'İki eşsiz nokta birleşince yeni bir çift oluşturur.', 'Noktalar kaybolmaz; yeni bir ikili oluşturur.'] },
      { prompt: { text: 'Bir çift sayı (6) ile bir tek sayı (5) toplanıyor. Toplam için ne söylenebilir?', visual: pairDots([6, 5]) }, choices: ['Her zaman tektir; bir nokta eşsiz kalır.', 'Her zaman çifttir.', 'Bazen tek, bazen çifttir.'], answer: 0, feedback: [null, 'Çift sayının bütün noktaları eşli; tek sayının bir noktası eşsiz.', 'Hangi çift ve tek sayıyı seçersen seç, bir nokta hep eşsiz kalır.'] },
      { prompt: { text: 'İki çift sayının (4 ve 6) toplamı için ne söylenebilir?', visual: pairDots([4, 6]) }, choices: ['Her zaman çifttir.', 'Her zaman tektir.', 'Bazen tektir.'], answer: 0, feedback: [null, 'Hiçbir sayıda eşsiz nokta yok; toplamda da olmaz.', 'Eşsiz nokta olmadığı için toplam tek olamaz.'] },
      { prompt: 'Ardışık üç sayı 4, 5, 6. Büyük sayıdan 1 alıp küçük sayıya verirsek 5 + 5 + 5 = 15 olur. Bu ne gösterir?', choices: ['Ardışık üç sayının toplamı ortadaki sayının 3 katıdır; bu yüzden 3’e bölünür.', 'Ardışık üç sayının toplamı her zaman 15’tir.', 'Ardışık üç sayının toplamı her zaman tektir.'], answer: 0, feedback: [null, '7, 8, 9 için toplam 24; 15 değil. Ama yine ortadaki sayının 3 katı.', '7 + 8 + 9 = 24 çift.'] },
    ],
  },
  {
    id: 'g7-her-zaman-bazen-asla',
    outcomes: ['MAT.7.2.3'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Her zaman, bazen, asla',
    instructions: 'Her önermeyi örneklerle dene ve doğru gruba koy. Tek bir karşı örnek “her zaman”ı çürütür!',
    level: 3,
    launch: {
      text: 'Mert “İki asal sayının toplamı çifttir: 3 + 5 = 8, 5 + 7 = 12, 11 + 13 = 24.” diyor. Üç örnek bir şeyi kanıtlar mı?',
    },
    reflect: '“Bazen” grubuna koyduğun bir önerme için bir örnek ve bir karşı örnek yaz.',
    categories: [
      { id: 'herzaman', label: 'Her zaman doğru', color: '#22c55e' },
      { id: 'bazen', label: 'Bazen doğru', color: '#eab308' },
      { id: 'asla', label: 'Hiçbir zaman doğru değil', color: '#ef4444' },
    ],
    items: [
      { content: 'İki çift sayının toplamı çifttir.', category: 'herzaman' },
      { content: 'Bir tek ve bir çift sayının çarpımı çifttir.', category: 'herzaman' },
      { content: 'Ardışık üç tam sayının toplamı 3’e bölünür.', category: 'herzaman' },
      { content: 'İki asal sayının toplamı çifttir.', category: 'bazen', explain: '3 + 5 = 8 çift ama 2 + 3 = 5 tek.' },
      { content: 'Bir doğal sayının karesi çifttir.', category: 'bazen', explain: '4² = 16 çift ama 3² = 9 tek.' },
      { content: '3’ün katı olan bir sayı 6’nın da katıdır.', category: 'bazen', explain: '12 hem 3’ün hem 6’nın katı; 9 ise yalnız 3’ün katı.' },
      { content: 'İki tek sayının toplamı tektir.', category: 'asla' },
      { content: 'Ardışık iki tam sayının toplamı çifttir.', category: 'asla', explain: 'Ardışık iki sayıdan biri tek, biri çifttir; toplamları hep tektir.' },
      { content: 'İki tek sayının çarpımı çifttir.', category: 'asla' },
    ],
  },
  {
    id: 'g7-ispat-adimlari',
    outcomes: ['MAT.7.2.3'],
    type: 'sort',
    stage: 'sembol',
    title: 'İspatın adımları',
    instructions: 'Cebirsel ispatın adımlarını mantıklı sıraya koy.',
    level: 3,
    launch: {
      text: 'Nokta modelinde gördüğümüzü cebirle yazalım. Bir tek sayıyı “2’nin bir katı + 1” diye yazabiliriz. İspat bu fikirden başlıyor.',
    },
    reflect: 'İspatta k ve m diye iki farklı harf kullandık. Neden ikisine de k demedik?',
    rounds: [
      { prompt: 'İki tek sayının toplamının çift olduğunu ispatla.', items: ['x ve y iki tek sayı olsun.', 'k ve m tam sayılar olmak üzere x = 2k + 1 ve y = 2m + 1 yazılır.', 'x + y = 2k + 1 + 2m + 1 = 2k + 2m + 2 olur.', 'x + y = 2(k + m + 1) şeklinde yazılır.', '2’nin katı olduğu için x + y çift sayıdır.'] },
      { prompt: 'Ardışık üç tam sayının toplamının 3’e bölündüğünü ispatla.', items: ['En küçük sayıya n diyelim.', 'Sayılar n, n + 1 ve n + 2 olur.', 'Toplamları n + (n + 1) + (n + 2) = 3n + 3 olur.', '3n + 3 = 3(n + 1) şeklinde yazılır.', '3’ün katı olduğu için toplam 3’e tam bölünür.'] },
    ],
  },
  {
    id: 'g7-ispat-muhakeme',
    outcomes: ['MAT.7.2.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Sayılarla ispat',
    instructions: 'Örnek mi yeter, karşı örnek mi, ispat mı gerekir? Her soruda gerekçeni düşün.',
    level: 3,
    launch: {
      text: 'Bilim insanları bir şeyi binlerce kez deneyip doğru bulsa da matematikçiler “ispatla” der. Neden örnekler yetmez?',
    },
    reflect: 'Bir önermenin yanlış olduğunu göstermek mi daha kolay, doğru olduğunu göstermek mi? Neden?',
    questions: [
      { prompt: 'İki tek sayının toplamı için hangisi her zaman doğrudur?', choices: ['Çift sayıdır.', 'Tek sayıdır.', 'Asal sayıdır.', '3’e bölünür.'], answer: 0, feedback: [null, '3 + 5 = 8 çift; tek değil.', '3 + 5 = 8 asal değil.', '1 + 3 = 4, 3’e bölünmez.'] },
      { prompt: '“İki tek sayının toplamı tektir.” varsayımının yanlış olduğunu göstermek için hangisi yeterlidir?', choices: ['3 + 5 = 8', '2 + 4 = 6', '1 + 2 = 3', '7 · 3 = 21'], answer: 0, feedback: [null, '2 ve 4 tek sayı değil.', '2 tek sayı değil; ayrıca sonuç 3 tek.', 'Bu bir çarpma; önerme toplamla ilgili.'], explain: 'Tek bir karşı örnek, bir önermenin her zaman doğru olmadığını gösterir.' },
      { prompt: 'k bir tam sayı olmak üzere tek sayılar cebirsel olarak nasıl gösterilir?', choices: ['2k + 1', '2k', 'k + 2', 'k²'], answer: 0, feedback: [null, '2k her zaman çifttir.', 'k = 2 için 4 olur, çift.', 'k = 2 için 4 olur, çift.'] },
      { prompt: 'x = 2k + 1 ve y = 2m + 1 olmak üzere x + y = 2k + 2m + 2 ifadesi hangisine eşittir?', choices: ['2(k + m + 1)', '2(k + m) + 1', 'k + m + 2', '4km'], answer: 0, feedback: [null, 'Bu 2k + 2m + 1 eder; 1 eksik.', '2 ortak çarpanını dışarı alırken her terimi 2’ye bölmelisin.', 'Toplamayı çarpmaya çevirdin.'], explain: '2’nin katı olarak yazılabildiği için x + y çifttir.' },
      { prompt: 'Bir önermenin bütün sayılar için doğru olduğunu göstermek için ne gerekir?', choices: ['Cebirsel bir ispat yapmak', 'Üç örnek denemek', 'Hesap makinesiyle kontrol etmek', 'Arkadaşlarına sormak'], answer: 0, feedback: [null, 'Üç örnek doğru olsa da dördüncüsü yanlış çıkabilir.', 'Hesap makinesi yalnız denediğin sayıları kontrol eder.', 'Fikir birliği bir ispat değildir.'] },
      { prompt: 'İki çift sayının çarpımı (2k) · (2m) = 4km’dir. Buna göre iki çift sayının çarpımı için hangisi her zaman doğrudur?', choices: ['4’e tam bölünür.', 'Tek sayıdır.', '8’e tam bölünür.', 'Asal sayıdır.'], answer: 0, feedback: [null, '4km, 2’nin katıdır; tek olamaz.', '2 · 2 = 4, 8’e bölünmez.', '4 · 1 · 1 = 4 asal değil.'] },
    ],
  },

  // MAT.7.2.4
  {
    id: 'g7-akis-semasi',
    outcomes: ['MAT.7.2.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Akış şemasını izle',
    instructions: 'Akış şemasındaki adımları sırayla uygula. Adımların sırası sonucu değiştirir!',
    level: 2,
    launch: {
      text: 'Bir robot yalnız söylenen adımları sırayla yapar. “Önce 3 ile çarp, sonra 2 ekle” ile “önce 2 ekle, sonra 3 ile çarp” robot için aynı mı?',
      visual: flow(['Başla', 'x’i al', 'x’i 3 ile çarp', 'Sonuca 2 ekle', 'Sonucu yaz', 'Bitir']),
    },
    reflect: 'Çıktıdan girdiye geri giderken adımları nasıl değiştirdin? Bu, denklem çözmeye nasıl benziyor?',
    questions: [
      { prompt: { text: 'x = 4 girilirse çıktı kaç olur?', visual: flow(['Başla', 'x’i al', 'x’i 3 ile çarp', 'Sonuca 2 ekle', 'Sonucu yaz', 'Bitir']) }, choices: ['14', '18', '9', '12'], answer: 0, feedback: [null, 'Önce 2 ekleyip sonra 3 ile çarptın; adımların sırası önemlidir.', '4 + 3 + 2 yaptın; ilk adım çarpma.', '2 eklemeyi unuttun.'] },
      { prompt: { text: 'Aynı akış şemasının çıktısı 20 ise girilen x kaçtır?', visual: flow(['Başla', 'x’i al', 'x’i 3 ile çarp', 'Sonuca 2 ekle', 'Sonucu yaz', 'Bitir']) }, choices: ['6', '62', '22', '7'], answer: 0, feedback: [null, '20’yi şemaya yeniden girdin; geriye doğru giderken işlemleri tersine çevirmelisin.', 'Geriye doğru giderken 2’yi eklemek değil, çıkarmak gerekir.', '3 · 7 + 2 = 23; 20 değil.'], explain: 'Geriye doğru: 20 − 2 = 18, 18 ÷ 3 = 6.' },
      { prompt: { text: 'a = −12 ve b = 4 girilirse çıktı kaç olur?', visual: flow(['Başla', 'a ve b’yi al', 'a’yı b’ye böl', 'Sonucu yaz', 'Bitir']) }, choices: ['−3', '3', '−48', '−8'], answer: 0, feedback: [null, 'Negatif bir sayıyı pozitif bir sayıya bölünce sonuç negatiftir.', 'Bölme yerine çarptın.', '−12 + 4 yaptın.'] },
      { prompt: { text: 'x = 1 girilirse çıktı kaç olur?', visual: flow(['Başla', 'x’i al', 'x’ten 4 çıkar', 'Sonucu 3 ile çarp', 'Sonucu yaz', 'Bitir']) }, choices: ['−9', '−1', '9', '−3'], answer: 0, feedback: [null, 'Önce 3 ile çarpıp sonra 4 çıkardın; şemada önce 4 çıkarılıyor: 1 − 4 = −3, −3 · 3 = −9.', 'İşaret: negatif · pozitif = negatif.', '4 çıkardın ama 3 ile çarpmayı unuttun.'] },
      { prompt: '(−3) · 4 + 18 ÷ (−6) işlemini yapan bir algoritma işlemleri hangi sırayla yapmalıdır?', choices: ['Çarpma ve bölme, sonra toplama', 'Toplama, sonra çarpma, sonra bölme', 'Soldan sağa: çarpma, toplama, bölme', 'Bölme, toplama, çarpma'], answer: 0, feedback: [null, 'Toplama, çarpma ve bölmeden sonra yapılır.', 'İşlem önceliğine göre çarpma ve bölme toplamadan önce gelir.', 'Toplama en sona kalmalı.'], explain: '(−3) · 4 = −12, 18 ÷ (−6) = −3, −12 + (−3) = −15' },
    ],
  },
  {
    id: 'g7-algoritma-sirala',
    outcomes: ['MAT.7.2.4'],
    type: 'sort',
    stage: 'sembol',
    title: 'Algoritmayı kur',
    instructions: 'Algoritmanın adımlarını doğru sıraya koy.',
    level: 2,
    launch: {
      text: 'Bir tarif gibi: önce un, sonra yumurta… Sıra bozulursa kek olmaz. Algoritmalarda da her adımın bir yeri vardır.',
    },
    reflect: 'Hangi algoritmada iki adımın yerini değiştirsen sonuç değişmezdi? Hangisinde değişirdi?',
    rounds: [
      { prompt: 'x = 4 için 3x − 5 ifadesinin değerini bulan algoritma', items: ['Başla', 'x değerini al (x = 4)', 'x’i 3 ile çarp (12)', 'Sonuçtan 5 çıkar (7)', 'Sonucu yaz', 'Bitir'] },
      { prompt: '2x + 7 = 19 denklemini çözen algoritma', items: ['Başla', 'Her iki taraftan 7 çıkar: 2x = 12', 'Her iki tarafı 2’ye böl: x = 6', 'Kontrol et: 2 · 6 + 7 = 19', 'Bitir'] },
      { prompt: 'Üç sayının aritmetik ortalamasını bulan algoritma', items: ['Başla', 'Üç sayıyı al', 'Sayıları topla', 'Toplamı 3’e böl', 'Sonucu yaz', 'Bitir'] },
      { prompt: '(−3) · 4 + 18 ÷ (−6) işlemini yapan algoritma', items: ['Başla', 'Çarpmayı yap: (−3) · 4 = −12', 'Bölmeyi yap: 18 ÷ (−6) = −3', 'Toplamayı yap: −12 + (−3) = −15', 'Sonucu yaz', 'Bitir'] },
    ],
  },
  {
    id: 'g7-algoritma-izle',
    outcomes: ['MAT.7.2.4'],
    type: 'fill',
    stage: 'problem',
    title: 'Algoritmayı izle, hatayı bul',
    instructions: 'Sözde kodu adım adım uygula ve çıktıyı bul. Hatalı algoritmaların nerede yanlış gittiğini yakala.',
    level: 3,
    launch: {
      text: 'Can, 3x + 2 ifadesini hesaplayan bir algoritma yazdı ama sonuçlar hep fazla çıkıyor. Sorun hangi adımda olabilir?',
    },
    reflect: 'Hatalı bir algoritmayı bulmak için hangi yolu izledin: adım adım izlemek mi, bir örnekle denemek mi?',
    items: [
      { text: 'Başla → x’i al → y = 2x + 3 hesapla → y’yi yaz → Bitir\nx = 5 girilirse çıktı __', answers: ['13'] },
      { text: 'Başla → x’i al → x’ten 4 çıkar → sonucu 3 ile çarp → sonucu yaz → Bitir\nx = −2 girilirse çıktı __', answers: ['-18'], hints: ['−2 − 4 kaç eder?'] },
      { text: 'Başla → a’yı al → a negatifse a’yı −1 ile çarp → a’yı yaz → Bitir\na = −7 girilirse çıktı __', answers: ['7'], hints: ['Bu algoritma hangi kavramı hesaplıyor? (İpucu: 0’a uzaklık)'] },
      { text: 'Başla → toplam = 0 → 1’den 4’e kadar her k için toplam = toplam + k → toplamı yaz → Bitir\nÇıktı __', answers: ['10'] },
      { text: 'Başla → [[3/4]] kesrini al → [[2/5]]’e böl → sonucu yaz → Bitir\nÇıktı __ (kesir olarak yaz)', answers: ['15/8'], hints: ['[[3/4]]’ün içinde kaç tane [[2/5]] var? Ortak paydayla düşün: [[15/20]] ve [[8/20]].'] },
      { text: 'Can’ın algoritması: x’i al → x’e 2 ekle → 3 ile çarp → yaz. Amacı 3x + 2’yi hesaplamaktı. x = 4 için Can __ buldu; doğru sonuç __ olmalıydı.', answers: ['18', '14'], explain: 'Can adımların sırasını karıştırdı: Önce 3 ile çarpıp sonra 2 eklemeliydi.' },
      { text: 'Bir algoritmada x = 3 için çıktı 11, x = 5 için çıktı 17’dir. Algoritma “x’i 3 ile çarp, __ ekle” şeklindedir.', answers: ['2'] },
      { text: 'Başla → n’yi al → n’yi 2’ye böl → kalan 0 ise “çift”, değilse “tek” yaz → Bitir\nn = 17 girilirse çıktı __', answers: ['tek'], choices: ['çift', 'tek'] },
    ],
  },

  // ── Geometrik Nicelikler (2) ────────────────────────────────────────────

  // MAT.7.4.7
  {
    id: 'g7-daire-alani-kavram',
    outcomes: ['MAT.7.4.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Dairenin alanı nereden geliyor?',
    instructions: 'Daireyi eş dilimlere ayırıp yeniden dizince ne olduğunu düşün. π yerine 3 al.',
    level: 2,
    launch: {
      text: 'Paralelkenarın alanını, bir ucundan üçgen kesip öbür ucuna yapıştırarak dikdörtgene çevirip bulmuştuk. Bir daireyi de keserek dikdörtgene çevirebilir miyiz?',
      visual: SVG_CIRCLE_8,
    },
    reflect: 'Dairenin alan bağıntısını hiç ezberlememiş bir arkadaşına dilimleri kullanarak nasıl açıklarsın?',
    questions: [
      { prompt: { text: 'Daireyi 8 eş dilime ayırıp dilimleri bir yukarı bir aşağı yan yana dizersek oluşan şekil neye benzer?', visual: SVG_CIRCLE_8 }, choices: ['Paralelkenara', 'Üçgene', 'Daireye', 'Kareye'], answer: 0, feedback: [null, 'Dilimler ters-düz dizilince kenarlar paralel olur; üçgen oluşmaz.', 'Dilimler yeniden dizilince artık yuvarlak değil.', 'Kenarlar eşit olmak zorunda değil; uzun kenar yarıçaptan uzun.'] },
      { prompt: 'Dilim sayısını 16’ya, 32’ye çıkarırsak şekil neye yaklaşır?', choices: ['Dikdörtgene', 'Kareye', 'Üçgene'], answer: 0, feedback: [null, 'Kısa kenar r, uzun kenar π · r; eşit değiller.', 'Dilimler küçüldükçe kenarlar düzleşir ve köşeler dik olur.'] },
      { prompt: { text: 'Dilimler yeniden dizildi. Kısa kenar yarıçap (r) ise uzun kenar neye eşittir?', visual: SVG_CIRCLE_RECT }, choices: ['Çemberin uzunluğunun yarısına (π · r)', 'Çapa', 'Çemberin uzunluğuna (2 · π · r)', 'Yarıçapın karesine'], answer: 0, feedback: [null, 'Uzun kenar yayların yarısından oluşuyor; çaptan uzun.', 'Yayların yarısı üstte, yarısı altta kalıyor.', 'Bir kenar bir uzunluktur, alan değil.'], explain: 'Çemberin uzunluğu 2 · π · r’dir. Yayların yarısı üstte, yarısı altta kalır.' },
      { prompt: 'Buna göre dairenin alanı hangi bağıntıyla bulunur?', choices: ['π · r^{2}', '2 · π · r', 'π · d', '2 · r^{2}'], answer: 0, feedback: [null, 'Bu çemberin uzunluğu; alan değil.', 'π · d de çemberin uzunluğudur.', 'π’yi unutma: uzun kenar π · r.'], explain: 'Dikdörtgenin alanı: (π · r) · r = π · r^{2}' },
      { prompt: 'Yarıçapı 5 cm olan dairenin alanı kaç cm²’dir? (π = 3)', choices: ['75', '30', '15', '150'], answer: 0, feedback: [null, 'Bu çemberin uzunluğu: 2 · 3 · 5.', 'Yarıçapın karesini almayı unuttun: 3 · 5 · 5.', '2 ile çarpmaya gerek yok: 3 · 25.'] },
      { prompt: 'Çapı 8 cm olan dairenin alanı kaç cm²’dir? (π = 3)', choices: ['48', '192', '24', '64'], answer: 0, feedback: [null, '8 çap; yarıçap 4 cm. Çapı yarıçap gibi kullandın.', 'Bu çemberin uzunluğu: 3 · 8.', 'π’yi unuttun ve çapı kullandın: 8 · 8.'], explain: 'Yarıçap 4 cm: 3 · 4^{2} = 48' },
    ],
  },
  {
    id: 'g7-daire-alani',
    outcomes: ['MAT.7.4.7'],
    type: 'fill',
    stage: 'sembol',
    title: 'Dairenin alanını hesapla',
    instructions: 'Dairenin alanı = π · r². π yerine 3 al. Önce yarıçapın karesini al!',
    level: 1,
    launch: {
      text: 'Dilimlerden dikdörtgene, dikdörtgenden π · r² bağıntısına ulaştık. Şimdi farklı yarıçaplarla deneyip bağıntının hep işe yaradığını görelim.',
    },
    reflect: 'Yarıçap 1 artınca alan her seferinde aynı miktarda mı artıyor? Birkaç örneğe bakarak açıkla.',
    generator: { id: 'circle', params: { ask: 'area' }, count: 8 },
  },
  {
    id: 'g7-daire-alani-tahmin',
    outcomes: ['MAT.7.4.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Önce tahmin et, sonra hesapla',
    instructions: 'Hesaplamadan önce sonucu tahmin et. π yerine 3 al.',
    level: 3,
    launch: {
      text: 'Pizzacıda 30 cm çaplı büyük pizza ile 15 cm çaplı iki küçük pizza aynı fiyata satılıyor. “Çaplar toplamı aynı, o hâlde aynı miktar” diyen haklı mı?',
      visual: SVG_CIRCLE_SQUARES,
    },
    reflect: 'Pizza sorusunda tahminin ne çıkmıştı? Hesap tahmininden farklıysa neden?',
    questions: [
      { prompt: { text: 'Daire, kenarı r olan 4 küçük kareden oluşan büyük karenin içinde. Dairenin alanı yaklaşık kaç küçük kare eder?', visual: SVG_CIRCLE_SQUARES }, choices: ['3’ten biraz fazla', '4', '2', '1'], answer: 0, feedback: [null, 'Daire büyük karenin köşelerini doldurmuyor; 4’ten az.', 'Daire büyük karenin yarısından çok daha fazlasını kaplıyor.', 'Daire 4 küçük karenin her birine taşıyor.'], explain: 'Dairenin alanı π · r², yani yaklaşık 3,14 tane r × r karesi.' },
      { prompt: 'Bir dairenin yarıçapı 2 katına çıkarılırsa alanı kaç katına çıkar?', choices: ['4', '2', '3', '8'], answer: 0, feedback: [null, 'Alan yarıçapın karesiyle büyür: (2r)² = 4r².', 'π her dairede aynı; alan π ile değil, r² ile büyür.', '8 kat, hacim gibi üç boyut olsaydı geçerli olurdu.'], explain: 'π · (2r)^{2} = 4 · π · r^{2}' },
      { prompt: 'Çevresi 36 cm olan dairenin alanı kaç cm²’dir? (π = 3)', choices: ['108', '72', '36', '216'], answer: 0, feedback: [null, 'Alan = 3 · 6 · 6 = 108; 72 değil.', 'Çevre ile alan aynı sayı olmak zorunda değil.', 'Yarıçapı 6 bulduysan karesi 36; 2 ile çarpma.'], explain: '2 · 3 · r = 36 → r = 6 cm. Alan 3 · 36 = 108 cm²' },
      { prompt: '30 cm çaplı bir pizza ile 15 cm çaplı iki pizzayı karşılaştır. Hangisi doğrudur? (π = 3)', choices: ['Büyük pizzanın alanı, iki küçük pizzanın toplamının 2 katıdır.', 'Aynıdır; çapların toplamı eşit.', 'İki küçük pizza daha büyüktür.'], answer: 0, feedback: [null, 'Büyük pizza 3 · 15² = 675 cm²; bir küçük pizza 3 · 7,5² = 168,75 cm², ikisi 337,5 cm².', 'Çap 2 katına çıkınca alan 4 katına çıkar.'] },
      { prompt: 'Ali “Dairenin alanı 2 · π · r’dir.” diyor. Ayşe “π · r²’dir.” diyor. Birimlere bakarak kim haklı?', choices: ['Ayşe; r · r cm² verir, alan da cm² ile ölçülür.', 'Ali; 2 · π · r daha büyük bir sayı.', 'İkisi de; aynı şeyi anlatırlar.'], answer: 0, feedback: [null, '2 · π · r cm cinsinden bir uzunluktur: çemberin uzunluğu.', '2 · π · r çemberin uzunluğu, π · r² dairenin alanıdır.'] },
    ],
  },

  // MAT.7.4.8
  {
    id: 'g7-merkez-acisi-eslestir',
    outcomes: ['MAT.7.4.8'],
    type: 'match',
    stage: 'model',
    title: 'Dilim ↔ dairenin kesri',
    instructions: 'Her daire dilimini, dairenin kaçta kaçı olduğuyla eşleştir. Tam bir tur 360°’dir.',
    level: 2,
    launch: {
      text: 'Bir pizzayı arkadaşların arasında adil paylaştırmak istiyorsun. Dilimin büyüklüğünü ne belirler: kenar uzunluğu mu, merkezdeki açı mı?',
      visual: sector(90),
    },
    reflect: '72°’lik bir dilimin dairenin [[1/5]]’i olduğunu nasıl buldun? Aynı yolu çemberde yay uzunluğu için de kullanabilir misin?',
    perRound: 4,
    pairs: [
      { left: { visual: sector(90) }, right: '[[1/4]]' },
      { left: { visual: sector(120) }, right: '[[1/3]]' },
      { left: { visual: sector(60) }, right: '[[1/6]]' },
      { left: { visual: sector(180) }, right: '[[1/2]]' },
      { left: { visual: sector(45) }, right: '[[1/8]]' },
      { left: { visual: sector(270) }, right: '[[3/4]]' },
      { left: { visual: sector(72) }, right: '[[1/5]]' },
      { left: { visual: sector(30) }, right: '[[1/12]]' },
    ],
  },
  {
    id: 'g7-daire-dilimi-alani',
    outcomes: ['MAT.7.4.8'],
    type: 'fill',
    stage: 'sembol',
    title: 'Daire diliminin alanı',
    instructions: 'Dilimin alanı, merkez açısıyla orantılıdır: dairenin alanının (merkez açı ÷ 360°) kadarıdır. π yerine 3 al.',
    level: 2,
    launch: {
      text: 'Çemberde 90°’lik yay çemberin dörtte biriydi. Daire diliminin alanı için de aynı düşünce işe yarar mı?',
    },
    reflect: 'Yay uzunluğu ile dilimin alanını bulurken hangi adımlar aynı, hangileri farklıydı?',
    items: [
      { text: 'Yarıçapı 4 cm, merkez açısı 90° olan daire diliminin alanı __ cm²', answers: ['12'], visual: sector(90), hints: ['Dairenin alanı kaç? 90°, dairenin kaçta kaçı?'] },
      { text: 'Yarıçapı 6 cm, merkez açısı 60° olan daire diliminin alanı __ cm²', answers: ['18'], visual: sector(60), hints: ['60° tam turun kaçta kaçı?'] },
      { text: 'Yarıçapı 10 cm, merkez açısı 36° olan daire diliminin alanı __ cm²', answers: ['30'], hints: ['360°’yi 36°’ye böl: daire kaç eş dilime ayrılır?'] },
      { text: 'Yarıçapı 2 cm, merkez açısı 180° olan daire diliminin alanı __ cm²', answers: ['6'] },
      { text: 'Yarıçapı 4 cm, merkez açısı 270° olan daire diliminin alanı __ cm²', answers: ['36'], visual: sector(270), hints: ['270°, dairenin dörtte kaçı?'] },
      { text: 'Alanı 432 cm² olan bir pizza 8 eş dilime bölündü. Bir dilimin alanı __ cm²', answers: ['54'] },
      { text: 'Bir dilimin alanı dairenin alanının [[1/3]]’ü ise merkez açısı __°', answers: ['120'] },
      { text: 'Yarıçapı 6 cm olan çemberde 120°’lik yayın uzunluğu __ cm', answers: ['12'], hints: ['Çemberin uzunluğu 2 · 3 · 6 = 36 cm. 120°, çemberin kaçta kaçı?'] },
    ],
  },
  {
    id: 'g7-dilim-problem',
    outcomes: ['MAT.7.4.8'],
    type: 'quiz',
    stage: 'problem',
    title: 'Pizza, yelpaze, silecek',
    instructions: 'Dilimin dairenin kaçta kaçı olduğunu bul, sonra hesapla. π yerine 3 al.',
    level: 3,
    launch: {
      text: 'Bir arabanın silecek kolu camda bir daire dilimi çizer. Kolun uzunluğu ve döndüğü açı bilinirse silinen alanı bulabilir miyiz?',
    },
    reflect: 'Merkez açı 2 katına çıkınca dilimin alanı 2 katına çıkıyor ama yarıçap 2 katına çıkınca 4 katına çıkıyor. Neden?',
    questions: [
      { prompt: '5 arkadaş bir pizzayı eşit paylaşacak. Her dilimin merkez açısı kaç derece olmalı?', choices: ['72°', '60°', '90°', '50°'], answer: 0, feedback: [null, '60° ile 6 dilim olur.', '90° ile 4 dilim olur.', '5 · 50° = 250°; pizza bitmez.'], explain: '360° ÷ 5 = 72°' },
      { prompt: 'Çapı 30 cm olan bir pizza 6 eş dilime bölündü. Ayşe 2 dilim yedi. Ayşe kaç cm² pizza yedi?', choices: ['225 cm²', '900 cm²', '75 cm²', '675 cm²'], answer: 0, feedback: [null, 'Çapı yarıçap gibi kullandın: yarıçap 15 cm.', 'π ile çarpmayı unuttun: [[2/6]] · 15² = 75.', 'Bu bütün pizza; Ayşe 2 dilim yedi.'], explain: 'Pizza 3 · 15² = 675 cm². 2 dilim [[2/6]]’sı: 225 cm²' },
      { prompt: 'Bir arabanın 60 cm uzunluğundaki silecek kolu 120°’lik açıyla dönüyor. Silecek lastiği kolun tamamı boyunca ise silinen alan kaç cm²’dir?', choices: ['3.600 cm²', '10.800 cm²', '1.800 cm²', '120 cm²'], answer: 0, feedback: [null, 'Bu bütün dairenin alanı; silecek yalnız 120° dönüyor.', '120°, dairenin [[1/6]]’sı değil [[1/3]]’üdür.', 'Bu çemberin [[1/3]]’ünün uzunluğu (yay); alan değil.'], explain: '3 · 60^{2} · [[120/360]] = 10.800 · [[1/3]] = 3.600 cm²' },
      { prompt: 'Uzunluğu 20 cm olan bir yelpaze 150° açılıyor. Yelpazenin kapladığı alan kaç cm²’dir?', choices: ['500 cm²', '1.200 cm²', '150 cm²', '3.000 cm²'], answer: 0, feedback: [null, 'Bu bütün dairenin alanı.', '150 açının ölçüsü; alan değil.', '1.200 · 150 ÷ 60 yaptın; 360’a bölmelisin.'], explain: '3 · 20² · [[150/360]] = 1.200 · [[5/12]] = 500 cm²' },
      { prompt: 'Bir daire diliminin merkez açısı 2 katına çıkarılırsa (yarıçap aynı) alanı ne olur?', choices: ['2 katına çıkar.', '4 katına çıkar.', 'Değişmez.'], answer: 0, feedback: [null, 'Yarıçap değil, açı 2 katına çıktı; dilimin alanı açıyla orantılıdır.', 'Açı büyüyünce dilim de büyür.'] },
    ],
  },

  // MAT.7.4.9
  {
    id: 'g7-eskenar-dortgen-yamuk',
    outcomes: ['MAT.7.4.9'],
    type: 'fill',
    stage: 'model',
    title: 'Parçala, birleştir, alanı bul',
    instructions: 'Eşkenar dörtgeni ve yamuğu bildiğin şekillere (dikdörtgen, üçgen, paralelkenar) dönüştürerek alanlarını keşfet.',
    level: 2,
    launch: {
      text: 'Bir uçurtma eşkenar dörtgen şeklinde, bir bahçe yamuk şeklinde. Bunların alan bağıntısını bilmiyoruz ama dikdörtgeni, üçgeni ve paralelkenarı biliyoruz. Bu yeter mi?',
      visual: SVG_RHOMBUS_RECT,
    },
    reflect: 'Yamuğun alan bağıntısında neden 2’ye bölüyoruz? İki eş yamuk modelini kullanarak açıkla.',
    items: [
      { text: 'Eşkenar dörtgen, kenarları köşegenleri kadar olan dikdörtgenin içine çizildi. Eşkenar dörtgen dikdörtgenin kaçta kaçını kaplar? __', answers: ['1/2|0,5|2/4|4/8'], visual: SVG_RHOMBUS_RECT, hints: ['Köşegenler dikdörtgeni 4 küçük dikdörtgene ayırıyor. Her küçük dikdörtgenin ne kadarı eşkenar dörtgenin içinde?'] },
      { text: 'Köşegenleri 12 cm ve 8 cm olan eşkenar dörtgeni içine alan dikdörtgenin alanı __ cm², eşkenar dörtgenin alanı __ cm²’dir.', answers: ['96', '48'], visual: SVG_RHOMBUS },
      { text: 'Köşegenler eşkenar dörtgeni 4 eş dik üçgene ayırır. Dik kenarları 6 cm ve 4 cm olan bir dik üçgenin alanı __ cm²; dördünün toplamı __ cm²’dir.', answers: ['12', '48'], visual: SVG_RHOMBUS, hints: ['Köşegenlerin yarısı 6 cm ve 4 cm.'] },
      { text: 'İki eş yamuk ters çevrilip birleştirilince tabanı (a + c), yüksekliği h olan bir __ oluşur.', answers: ['paralelkenar'], choices: ['paralelkenar', 'dikdörtgen', 'üçgen', 'kare'], visual: SVG_TRAP_DOUBLE },
      { text: 'a = 12 cm, c = 6 cm, h = 6 cm ise oluşan paralelkenarın alanı __ cm², bir yamuğun alanı __ cm²’dir.', answers: ['108', '54'], visual: SVG_TRAP_DOUBLE, hints: ['Paralelkenarın tabanı 12 + 6 = 18 cm.', 'Yamuk paralelkenarın yarısı.'] },
      { text: 'Alanı 60 cm² olan eşkenar dörtgenin bir köşegeni 10 cm ise diğer köşegeni __ cm’dir.', answers: ['12'], hints: ['Köşegenlerin çarpımı alanın 2 katıdır.'] },
      { text: 'Alanı 45 cm², yüksekliği 5 cm olan yamuğun paralel kenarlarının uzunlukları toplamı __ cm’dir.', answers: ['18'], hints: ['İki eş yamuktan oluşan paralelkenarın alanı 90 cm² olur.'] },
    ],
  },
  {
    id: 'g7-alan-bagintilari-eslestir',
    outcomes: ['MAT.7.4.9', 'MAT.7.4.7'],
    type: 'match',
    stage: 'sembol',
    title: 'Şekil ↔ alan bağıntısı',
    instructions: 'Her şekli alan bağıntısıyla eşleştir. (e, f: köşegenler; a, c: paralel kenarlar; h: yükseklik; r: yarıçap)',
    level: 1,
    launch: {
      text: 'Bütün alan bağıntıları aslında bir aile: Hepsi dikdörtgenin alanından türetildi. Hangisi hangisinden geliyor?',
    },
    reflect: 'Hangi bağıntılar dikdörtgenin “yarısı” fikrini kullanıyor? Neden?',
    perRound: 6,
    pairs: [
      { left: { text: 'Eşkenar dörtgen', visual: { kind: 'shape', shape: 'rhombus' } }, right: '[[e · f/2]]' },
      { left: { text: 'Yamuk', visual: { kind: 'shape', shape: 'trapezoid' } }, right: '[[(a + c) · h/2]]' },
      { left: { text: 'Paralelkenar', visual: { kind: 'shape', shape: 'parallelogram' } }, right: 'a · h' },
      { left: { text: 'Üçgen', visual: { kind: 'shape', shape: 'triangle' } }, right: '[[a · h/2]]' },
      { left: { text: 'Daire', visual: { kind: 'shape', shape: 'circle' } }, right: 'π · r^{2}' },
      { left: { text: 'Dikdörtgen', visual: { kind: 'shape', shape: 'rectangle' } }, right: 'a · b' },
    ],
  },
  {
    id: 'g7-t9-hangisi-farkli',
    outcomes: ['MAT.7.4.9', 'MAT.7.4.10'],
    type: 'quiz',
    anyCorrect: true,
    stage: 'problem',
    title: 'Hangisi farklı?',
    instructions: 'Dört şekilden birini seç ve neden farklı olduğunu açıkla. Önce alanlarını hesapla (π = 3). Her seçenek bir gerekçeyle doğru olabilir!',
    level: 3,
    launch: {
      text: 'Bir mimar dört farklı şekilde süs havuzu tasarladı. Üçünün alanı aynı çıktı. Ama farklı olmanın tek yolu alan değil!',
    },
    reflect: 'Alanları aynı olan şekillerin çevreleri de aynı mı? Birini seçip hesapla.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Köşegenleri 6 cm ve 8 cm olan eşkenar dörtgen', 'Paralel kenarları 4 cm ve 8 cm, yüksekliği 4 cm olan yamuk', 'Yarıçapı 2 cm olan daire', 'Kenarları 4 cm ve 6 cm olan dikdörtgen'],
        answer: 0,
        reasons: ['Bütün kenarları eşit (5 cm) olan tek şekil; alanı köşegenlerle bulunuyor.', 'Yalnız bir çift kenarı paralel olan tek şekil.', 'Alanı 24 cm² olmayan (12 cm²) ve köşesi olmayan tek şekil.', 'Bütün açıları dik olan tek şekil.'],
      },
    ],
  },

  // MAT.7.4.10
  {
    id: 'g7-alan-problemleri-model',
    outcomes: ['MAT.7.4.10'],
    type: 'fill',
    stage: 'model',
    title: 'Şekli çiz, alanı bul',
    instructions: 'Her problemdeki şekli belirle ve çiz. Önce tahmin et, sonra hesapla. π yerine 3 al.',
    level: 2,
    launch: {
      text: 'Dairesel bir havuzun çevresine taş yol döşenecek. Yol bir halka şeklinde. Halkanın alanını hiç bilmediğimiz bir bağıntı olmadan bulabilir miyiz?',
      visual: svg(150, 150, `<circle cx="75" cy="75" r="66" fill="#d6d3d1" stroke="${INK}" stroke-width="2"/><circle cx="75" cy="75" r="55" fill="#93c5fd" stroke="${INK}" stroke-width="2"/><line x1="75" y1="75" x2="130" y2="75" stroke="${ROSE}" stroke-width="2.5"/>` + txt(102, 70, '5 m', 'middle', 12, ROSE) + txt(75, 14, '1 m yol', 'middle', 11)),
    },
    reflect: 'Havuz yolu sorusunu çözerken hangi stratejiyi kullandın: büyük daireden küçüğü çıkarmak mı, başka bir yol mu?',
    items: [
      { text: 'Yarıçapı 5 m olan dairesel havuzun çevresine 1 m genişliğinde yol yapılıyor. Dış dairenin yarıçapı __ m, yolun alanı __ m²’dir.', answers: ['6', '33'], hints: ['Dış dairenin alanından havuzun alanını çıkar.'], explain: '3 · 6² − 3 · 5² = 108 − 75 = 33 m²' },
      { text: 'Eşkenar dörtgen şeklindeki bir uçurtmanın köşegenleri 80 cm ve 50 cm. Bir yüzünü kaplamak için __ cm² kâğıt gerekir.', answers: ['2000|2.000'], hints: ['Köşegenleri kenar kabul eden dikdörtgenin yarısı.'] },
      { text: 'Yamuk şeklindeki bir bahçenin paralel kenarları 30 m ve 20 m, aralarındaki uzaklık 12 m. Bahçenin alanı __ m²; her m²’ye 4 kg gübre atılırsa __ kg gübre gerekir.', answers: ['300', '1200|1.200'] },
      { text: 'Yarım daire şeklindeki bir hız göstergesinin yarıçapı 8 cm. Göstergenin alanı __ cm²’dir.', answers: ['96'], visual: sector(180, 'yarım'), hints: ['Bütün dairenin alanını bul, yarısını al.'] },
      { text: 'Döner bir kapının kanatları yarıçapı 2 m olan bir daireyi 4 eş bölmeye ayırıyor. Bir bölmenin taban alanı __ m²’dir.', answers: ['3'], visual: sector(90) },
    ],
  },
  {
    id: 'g7-alanlari-sirala',
    outcomes: ['MAT.7.4.10'],
    type: 'sort',
    stage: 'sembol',
    title: 'Alanları sırala',
    instructions: 'Önce tahmin et, sonra her şeklin alanını hesapla (π = 3) ve küçükten büyüğe sırala.',
    level: 3,
    launch: {
      text: 'Bir peyzaj mimarı farklı şekillerde çiçek tarhları tasarladı. Hangisine en çok fide gerekir?',
    },
    reflect: 'Hesaplamadan önceki tahminin ne kadar doğruydu? Hangi şekil seni şaşırttı?',
    rounds: [
      { prompt: 'Alanları küçükten büyüğe sırala.', items: ['Yarıçapı 3 cm olan daire', 'Köşegenleri 10 cm ve 6 cm olan eşkenar dörtgen', 'Paralel kenarları 8 cm ve 4 cm, yüksekliği 6 cm olan yamuk', 'Yarıçapı 4 cm olan daire', 'Bir kenarı 7 cm olan kare'], ends: ['En küçük', 'En büyük'], hints: ['Daireler: 3 · 9 ve 3 · 16. Eşkenar dörtgen: 60 ÷ 2.'] },
      { prompt: 'Daire dilimlerinin alanlarını küçükten büyüğe sırala.', items: ['r = 6 cm, 30°’lik dilim', 'r = 4 cm, 90°’lik dilim', 'r = 6 cm, 60°’lik dilim', 'r = 10 cm, 36°’lik dilim', 'r = 6 cm, 180°’lik dilim'], ends: ['En küçük', 'En büyük'], hints: ['Her dilim dairenin kaçta kaçı?'] },
    ],
  },
  {
    id: 'g7-alan-problemleri',
    outcomes: ['MAT.7.4.10'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bahçeler, karolar, arsalar',
    instructions: 'Problemdeki şekilleri ve gereken ölçüleri belirle; gerekirse şekilleri birleştir ya da çıkar. π yerine 3 al.',
    level: 3,
    launch: {
      text: 'Kare bir bahçenin ortasına dairesel bir havuz yapılacak, kalan yere çim ekilecek. Ne kadar çim tohumu almalıyız?',
    },
    reflect: 'Bir alan problemini çözerken şekli parçalara ayırmak ya da büyük şekilden küçük şekli çıkarmak işini nasıl kolaylaştırdı?',
    questions: [
      { prompt: '10 m × 10 m’lik kare bahçenin ortasına çapı 6 m olan dairesel bir havuz yapıldı. Çim ekilecek alan kaç m²’dir?', choices: ['73 m²', '82 m²', '91 m²', '64 m²'], answer: 0, feedback: [null, '3 · 6 = 18 çıkardın; dairenin alanı için yarıçapın karesi gerekir.', 'Yarıçapın karesini almayı unuttun: 3 · 3 = 9 değil, 3 · 3² = 27.', 'π’yi unuttun ve çapı kullandın: 6 · 6 = 36.'], explain: 'Havuz: 3 · 3² = 27 m². Çim: 100 − 27 = 73 m²' },
      { prompt: 'Eşkenar dörtgen şeklindeki karoların köşegenleri 30 cm ve 20 cm. 6 m²’lik bir duvarı kaplamak için kaç karo gerekir?', choices: ['200', '20', '2.000', '100'], answer: 0, feedback: [null, 'Birimleri kontrol et: 6 m² = 60.000 cm².', 'Bir karo 300 cm²; 60.000 ÷ 300 = 200.', 'Köşegenlerin çarpımını 2’ye bölmeyi unutma: bir karo 600 değil 300 cm².'], explain: 'Bir karo 30 · 20 ÷ 2 = 300 cm². 60.000 ÷ 300 = 200 karo.' },
      { prompt: 'Yamuk şeklindeki bir arsanın paralel kenarları 40 m ve 60 m, aralarındaki uzaklık 25 m. Arsanın m²’si 2.000 TL ise arsa kaç TL’dir?', choices: ['2.500.000 TL', '5.000.000 TL', '200.000 TL', '4.800.000 TL'], answer: 0, feedback: [null, 'Yamuğun alanında 2’ye bölmeyi unuttun.', 'Yüksekliği hesaba katmadın: (40 + 60) · 25 ÷ 2.', '40 · 60 = 2.400 m² bir dikdörtgenin alanı olurdu; arsa yamuk.'], explain: 'Alan (40 + 60) · 25 ÷ 2 = 1.250 m². 1.250 · 2.000 = 2.500.000 TL' },
      { prompt: 'Dairesel bir kavşaktaki çim alanın yarıçapı 10 m. Çimin %60’ı çiçekle kaplanacak. Çiçekli alan kaç m²’dir?', choices: ['180 m²', '300 m²', '120 m²', '36 m²'], answer: 0, feedback: [null, 'Bu bütün çim alan; yalnız %60’ı çiçekli.', 'Bu çiçeksiz kalan %40.', 'Çemberin uzunluğunun (60 m) %60’ını aldın; alan gerekiyor.'], explain: 'Alan 3 · 10² = 300 m². %60’ı 180 m².' },
      { prompt: 'Çeyrek daire şeklindeki bir bahçe köşesinin yarıçapı 4 m. Alanı kaç m²’dir?', choices: ['12 m²', '48 m²', '6 m²', '3 m²'], answer: 0, feedback: [null, 'Bu bütün dairenin alanı; çeyreği gerekiyor.', 'Çemberin uzunluğunun çeyreği (24 ÷ 4); alan değil.', '3 · 4 ÷ 4: yarıçapın karesini almayı unuttun.'], explain: '3 · 4² ÷ 4 = 12 m²' },
    ],
  },
]

/** Tema notları: öğretmen ve veliler için büyük fikirler */
export const grade7Notes: ThemeNotes = {
  'sayilar-ve-nicelikler-1': {
    bigIdeas: [
      'Negatif sayılar bir yönü ve bir başlangıç noktasını (0) anlatır: sıfırın altı, borç, deniz seviyesinin altı. Kurallardan önce bu bağlamlar ve sayı doğrusu gelir.',
      'Sayı doğrusunda sağdaki sayı daha büyüktür; −5 < −2 olması “0’dan daha uzakta, daha solda” olmasıyla açıklanır. Mutlak değer yön değil uzaklıktır.',
      'Her rasyonel sayı sayı doğrusunda bir noktadır ve iki rasyonel sayı arasında her zaman başka bir rasyonel sayı bulunur. Kesir çizgisi bir bölmedir; bölme ya biter (sonlu) ya da dönmeye başlar (devirli).',
      'Tam sayılarla toplama–çıkarma sayma pulları (sıfır çiftleri) ve sayı doğrusuyla anlam kazanır; “negatif çarpı negatif” ise ezber kural değil, devam eden bir örüntünün sonucudur.',
    ],
  },
  'geometrik-nicelikler-1': {
    bigIdeas: [
      'Üç boyutlu bir yapının iki boyutlu görünümleri yapı hakkında her şeyi söylemez; görünmeyen küpler olabilir. Ön–arka ve sağ–sol görünümler birbirinin yansımasıdır.',
      'Hacim, bir cismi dolduran eş birimlerin sayısıdır. Küpleri kat kat saymak “taban alanı × yükseklik” bağıntısını doğal olarak ortaya çıkarır.',
      'Yüzey alanı kaplamak, hacim doldurmaktır. Aynı hacimli prizmaların yüzey alanları farklı olabilir.',
      'Hacim birimleri 1000’er kat büyür, çünkü bir küp üç yönde 10’ar kat büyür; 1 dm³ = 1 L bağlantısı hacim ile sıvı ölçmeyi birleştirir.',
    ],
  },
  'istatistiksel-arastirma-sureci': {
    bigIdeas: [
      'İstatistik, değişkenlik gösteren veriyle bir soruyu cevaplama sürecidir: soru → örneklem → veri → analiz → yorum. Örneklem evreni temsil etmelidir.',
      'Merkezi en iyi temsil eden değer veriye ve soruya bağlıdır: uç değerler varken ortanca, en çok tercih edilen için tepe değer daha anlamlı olabilir.',
      'Aynı ortalamaya sahip veri grupları çok farklı yayılabilir; açıklık ve ortalama mutlak sapma bu yayılımı anlatır.',
      'Grafikler ve yorumlar yanıltıcı olabilir (0’dan başlamayan eksen, büyütülmüş simge, yönlendirici soru). Eleştirel okuma bir matematik becerisidir.',
    ],
  },
  donusum: {
    bigIdeas: [
      'Yansımada her nokta simetri doğrusuna dik olarak, aynı uzaklıkta öbür tarafa geçer; şekil ile görüntüsü eştir, yalnız yönü değişir.',
      'Bir doğru parçasının simetri doğrusu onun orta dikmesi, bir açının simetri doğrusu onun açıortayıdır. İnşa adımları bu simetri fikrinden gelir.',
      'Orta dikme üzerindeki her nokta doğru parçasının uçlarına, açıortay üzerindeki her nokta açının kollarına eşit uzaklıktadır; bu özellik gerçek yaşamda yer seçimi problemlerini çözer.',
    ],
  },
  'geometrik-sekiller': {
    bigIdeas: [
      'Kenarortay, açıortay ve yükseklik farklı fikirlerdir: kenarı ortalamak, açıyı ortalamak, kenara dik inmek. Genel bir üçgende üçü farklı doğru parçalarıdır.',
      'İkizkenar üçgende tabana ait kenarortay, açıortay ve yükseklik çakışır; eşkenar üçgende bu her kenar için doğrudur. Bunun nedeni üçgenin simetrisidir.',
      'Kenarortay inşası, orta dikme inşasıyla kenarın orta noktasını bulmaya dayanır; önceki deneyimler yeni inşalara aktarılır.',
    ],
  },
  'sayilar-ve-nicelikler-2': {
    bigIdeas: [
      'Oran çarpımsal bir karşılaştırmadır. İki niceliği farkla (toplamsal) ya da katla (çarpımsal) karşılaştırmak farklı sorulara cevap verir; orantısal akıl yürütmenin temeli bu ayrımdır.',
      'Denk oranlar aynı ilişkiyi anlatır (aynı tat, aynı ton). Oran tabloları, çift sayı doğruları ve şerit modelleri birlikte değişimi görünür kılar; birim oran güçlü bir köprüdür.',
      'İki nicelik orantılıysa oranları sabittir ve grafikleri başlangıç noktasından çıkan bir ışındır. Düzenli artış (taksi ücreti gibi) her zaman orantı demek değildir.',
      'Doğru orantı ve yüzde problemleri içler dışlar çarpımı ezberiyle değil, birim oran, ölçekleme ve %10 gibi referanslarla çözülür.',
    ],
  },
  'veriden-olasiliga': {
    bigIdeas: [
      'Teorik olasılık, olaya ait çıktı sayısının bütün olası çıktıların sayısına oranıdır; önce örnek uzayı listelemek gerekir.',
      'Bir olay ile tümleyeni birlikte örnek uzayı oluşturur: olasılıkları toplamı 1’dir ve her zaman ayrıktırlar.',
      'İki sonuç olması eşit olasılık demek değildir; eşit olasılık için çıktı sayıları eşit olmalıdır. Bir oyun ancak oyuncuların kazanma olasılıkları eşitse adildir.',
      'Ayrık olaylar ortak çıktısı olmayan olaylardır; ayrık olmak ile eşit olasılıklı olmak farklı kavramlardır.',
    ],
  },
  'islemlerle-cebirsel-dusunme-ve-degisimler': {
    bigIdeas: [
      'Cebirsel ifadelerle işlem, işlem özelliklerinin (değişme, birleşme, dağılma) genellenmesidir; denk ifadeler görünüşleri farklı olsa da her değer için aynı sonucu verir.',
      'Denklem bir terazidir: iki tarafa aynı işlem dengeyi korur. Şerit ve terazi modelleri sembolik çözümün anlamını taşır; çözüm yerine koyarak kontrol edilir.',
      'Eşitsizliğin çözümü bir değerler kümesidir ve sayı doğrusunda gösterilir; negatif sayıyla çarpma ya da bölme yönü değiştirir, bunu değer deneyerek görmek kuraldan önce gelir.',
      'Örnekler bir önermeyi desteklemeye yeter ama kanıtlamaya yetmez; tek bir karşı örnek yanlışlar, cebirsel ispat ise bütün sayılar için gösterir.',
    ],
  },
  'geometrik-nicelikler-2': {
    bigIdeas: [
      'Yeni alan bağıntıları bilinen şekillerden türetilir: daire dilimlerle dikdörtgene, eşkenar dörtgen dikdörtgenin yarısına, iki eş yamuk paralelkenara dönüşür.',
      'Dairenin alanı π · r²’dir; yarıçap iki katına çıkınca alan dört katına çıkar. Çemberin uzunluğu (2 · π · r) ile alan karıştırılmamalıdır.',
      'Daire diliminin alanı merkez açısıyla orantılıdır, tıpkı yay uzunluğu gibi: dilim, dairenin (açı ÷ 360°) kadarıdır.',
      'Karmaşık alan problemleri şekilleri parçalayarak ya da büyük şekilden küçüğünü çıkararak çözülür; önce tahmin etmek sonucu kontrol etmeyi sağlar.',
    ],
  },
}
