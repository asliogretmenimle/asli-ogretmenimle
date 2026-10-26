import type { Activity, ThemeNotes, Visual } from '../types'

/**
 * 6. SINIF ETKİNLİKLERİ — Van de Walle’ün gelişimsel, problem temelli yaklaşımı
 *
 * Her etkinlik: Başlarken (launch) → Keşfet (oyun) → Düşün ve Paylaş (reflect)
 * Her öğrenme çıktısında etkinlikler somut → model → sembol → problem sırasıyla dizilmiştir.
 * Program sınırları: EBOB/EKOK kavramlarına girilmez; deneysel olasılıkta tek olaylı deneyler;
 * uzunluk dönüşümleri m–km ve m–dm–cm–mm, alan dönüşümleri m²–km² ve m²–dm²–cm²–mm² ile sınırlı.
 */

// ───────────────────────────────────────────────────────────────────────────
// Çizim yardımcıları (elle üretilen SVG’ler)
// ───────────────────────────────────────────────────────────────────────────

const INK = '#1f2340'
const ORANGE = '#f97316'
const INDIGO = '#6366f1'
const GREEN = '#16a34a'
const r1 = (n: number) => Math.round(n * 10) / 10

/** Merkezi (cx, cy) olan çemberde `deg` derecelik doğrultudaki nokta (matematik yönü: saat yönünün tersi) */
function at(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [r1(cx + r * Math.cos(a)), r1(cy - r * Math.sin(a))]
}

const svg = (w: number, h: number, body: string): Visual => ({
  kind: 'svg',
  svg: `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="inherit">${body}</svg>`,
})

function txt(x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: 'start' | 'middle' | 'end' } = {}) {
  return `<text x="${x}" y="${y}" font-size="${o.size ?? 13}" font-weight="700" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? 'middle'}" dominant-baseline="middle">${s}</text>`
}

function seg(x1: number, y1: number, x2: number, y2: number, o: { w?: number; color?: string; dash?: boolean } = {}) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.color ?? INK}" stroke-width="${o.w ?? 2.5}" stroke-linecap="round"${o.dash ? ' stroke-dasharray="5 4"' : ''}/>`
}

/** Paralellik işareti (>) */
const parMark = (x: number, y: number) => `<path d="M${x} ${y - 5} L${x + 7} ${y} L${x} ${y + 5}" fill="none" stroke="${INK}" stroke-width="2"/>`

type AngleMark = { pos: number; text?: string; color?: string }

/**
 * İki paralel doğru (d₁ ∥ d₂) ve bir kesen (k).
 * Açılar her kesişim noktasında sol üstten başlayarak saat yönünde numaralanır:
 * d₁ üzerinde 1 (sol üst), 2 (sağ üst), 3 (sağ alt), 4 (sol alt); d₂ üzerinde 5, 6, 7, 8.
 * `alpha`: kesenin d doğrularıyla sağ üstte yaptığı açı (2 ve 6 numaralı açıların ölçüsü).
 */
function parallel(alpha: number, opts: { numbers?: boolean; marks?: AngleMark[] } = {}): Visual {
  const yA = 55, yB = 120
  const cot = 1 / Math.tan((alpha * Math.PI) / 180)
  const P: [number, number][] = [[r1(130 + 32.5 * cot), yA], [r1(130 - 32.5 * cot), yB]]
  const top: [number, number] = [r1(P[0][0] + 40 * cot), 15]
  const bot: [number, number] = [r1(P[1][0] - 40 * cot), 160]
  const ranges: [number, number][] = [[alpha, 180], [0, alpha], [180 + alpha, 360], [180, 180 + alpha]]
  const info = (pos: number) => ({ p: P[pos <= 4 ? 0 : 1], range: ranges[(pos - 1) % 4] })
  let b = ''
  for (const m of opts.marks ?? []) {
    const { p, range: [a0, a1] } = info(m.pos)
    const c = m.color ?? ORANGE
    const [sx, sy] = at(p[0], p[1], 18, a0)
    const [ex, ey] = at(p[0], p[1], 18, a1)
    b += `<path d="M${p[0]} ${p[1]} L${sx} ${sy} A18 18 0 0 0 ${ex} ${ey} Z" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="2"/>`
  }
  for (const y of [yA, yB]) b += seg(10, y, 250, y) + parMark(28, y)
  b += txt(246, yA - 11, 'd₁', { anchor: 'end' }) + txt(246, yB - 11, 'd₂', { anchor: 'end' })
  b += seg(top[0], top[1], bot[0], bot[1]) + txt(top[0] + (cot >= 0 ? 11 : -11), top[1] + 3, 'k')
  if (opts.numbers) {
    for (let pos = 1; pos <= 8; pos++) {
      const { p, range: [a0, a1] } = info(pos)
      const [x, y] = at(p[0], p[1], 12, (a0 + a1) / 2)
      b += txt(x, y, String(pos), { size: 10 })
    }
  }
  for (const m of opts.marks ?? []) {
    if (!m.text) continue
    const { p, range: [a0, a1] } = info(m.pos)
    const [x, y] = at(p[0], p[1], 33, (a0 + a1) / 2)
    b += txt(x, y, m.text, { size: 13, color: m.color ?? '#c2410c' })
  }
  return svg(260, 170, b)
}

/** İki paralel doğru ve iki kesen; kesenler d₁ ve d₂ üzerindeki noktalarla verilir, `shapes` taranır */
function transversals(t1: [number, number], t2: [number, number], shapes: [number, number][][], labels: [string, number, number][] = []): Visual {
  const yA = 50, yB = 115
  let b = ''
  for (const s of shapes) b += `<polygon points="${s.map((p) => p.join(',')).join(' ')}" fill="${INDIGO}" fill-opacity="0.22" stroke="none"/>`
  for (const y of [yA, yB]) b += seg(10, y, 250, y) + parMark(24, y)
  b += txt(246, yA - 11, 'd₁', { anchor: 'end' }) + txt(246, yB - 11, 'd₂', { anchor: 'end' })
  for (const [xa, xb] of [t1, t2]) {
    const k = (xb - xa) / 65
    b += seg(r1(xa - 30 * k), 20, r1(xb + 30 * k), 145)
  }
  for (const [s, x, y] of labels) b += txt(x, y, s, { size: 12 })
  return svg(260, 165, b)
}

/** Birbirini O noktasında ortalayan AC ve BD doğru parçaları (l1, l2 uzunluk; phi aradaki açı) */
function diagonals(l1: number, l2: number, phi: number): Visual {
  const cx = 130, cy = 90
  const A = at(cx, cy, l1 / 2, 180), C = at(cx, cy, l1 / 2, 0)
  const B = at(cx, cy, l2 / 2, phi), D = at(cx, cy, l2 / 2, phi + 180)
  const tick = (deg: number, half: number, n: number) => {
    const [mx, my] = at(cx, cy, half / 2, deg)
    let s = ''
    for (let i = 0; i < n; i++) {
      const [ox, oy] = at(mx, my, (i - (n - 1) / 2) * 5, deg)
      const [x1, y1] = at(ox, oy, 6, deg + 90)
      const [x2, y2] = at(ox, oy, 6, deg - 90)
      s += seg(x1, y1, x2, y2, { w: 2, color: ORANGE })
    }
    return s
  }
  const n2 = l1 === l2 ? 1 : 2
  let b = seg(A[0], A[1], C[0], C[1]) + seg(B[0], B[1], D[0], D[1])
  b += tick(0, l1 / 2, 1) + tick(180, l1 / 2, 1) + tick(phi, l2 / 2, n2) + tick(phi + 180, l2 / 2, n2)
  if (phi === 90) b += `<path d="M${cx + 9} ${cy} L${cx + 9} ${cy - 9} L${cx} ${cy - 9}" fill="none" stroke="${INK}" stroke-width="1.5"/>`
  b += `<circle cx="${cx}" cy="${cy}" r="3" fill="${INK}"/>`
  const [ox, oy] = at(cx, cy, 15, 180 + phi / 2)
  b += txt(ox, oy, 'O', { size: 12 })
  const pts: [string, number, number][] = [['A', 180, l1 / 2], ['C', 0, l1 / 2], ['B', phi, l2 / 2], ['D', phi + 180, l2 / 2]]
  for (const [s, deg, r] of pts) {
    const [x, y] = at(cx, cy, r + 12, deg)
    b += txt(x, y, s)
  }
  return svg(260, 180, b)
}

/** Çemberde merkez açı ve gördüğü yay (yay turuncu) */
function sector(deg: number, label = `${deg}°`): Visual {
  const cx = 80, cy = 80, r = 60
  const [sx, sy] = at(cx, cy, r, 90)
  const [ex, ey] = at(cx, cy, r, 90 - deg)
  const large = deg > 180 ? 1 : 0
  const [lx, ly] = at(cx, cy, 33, 90 - deg / 2)
  const [ox, oy] = at(cx, cy, 13, 270 - deg / 2)
  let b = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`
  b += `<path d="M${cx} ${cy} L${sx} ${sy} A${r} ${r} 0 ${large} 1 ${ex} ${ey} Z" fill="${INDIGO}" fill-opacity="0.25" stroke="${INDIGO}" stroke-width="2"/>`
  b += `<path d="M${sx} ${sy} A${r} ${r} 0 ${large} 1 ${ex} ${ey}" fill="none" stroke="${ORANGE}" stroke-width="5" stroke-linecap="round"/>`
  b += `<circle cx="${cx}" cy="${cy}" r="3" fill="${INK}"/>` + txt(lx, ly, label, { size: 13 }) + txt(ox, oy, 'O', { size: 11 })
  return svg(160, 160, b)
}

/** Paralelkenar / üçgen; taban ve yükseklik etiketli (ölçekli değildir) */
function areaFig(kind: 'paralelkenar' | 'ucgen' | 'genis', base: string, h: string, side?: string): Visual {
  const fill = `fill="${INDIGO}" fill-opacity="0.2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`
  const hColor = '#c2410c'
  let b = ''
  if (kind === 'paralelkenar') {
    b += `<polygon points="40,120 190,120 230,30 80,30" ${fill}/>`
    b += seg(80, 30, 80, 120, { w: 2, color: ORANGE, dash: true })
    b += `<path d="M80 110 L90 110 L90 120" fill="none" stroke="${INK}" stroke-width="1.5"/>`
    b += txt(115, 138, base) + txt(86, 72, h, { anchor: 'start', color: hColor })
    if (side) b += txt(220, 78, side, { anchor: 'start' })
  } else if (kind === 'ucgen') {
    b += `<polygon points="30,120 210,120 140,30" ${fill}/>`
    b += seg(140, 30, 140, 120, { w: 2, color: ORANGE, dash: true })
    b += `<path d="M140 110 L150 110 L150 120" fill="none" stroke="${INK}" stroke-width="1.5"/>`
    b += txt(120, 138, base) + txt(146, 98, h, { anchor: 'start', color: hColor })
  } else {
    b += `<polygon points="30,120 150,120 215,30" ${fill}/>`
    b += seg(150, 120, 215, 120, { w: 1.5, color: '#8a8fb0', dash: true })
    b += seg(215, 30, 215, 120, { w: 2, color: ORANGE, dash: true })
    b += `<path d="M215 110 L205 110 L205 120" fill="none" stroke="${INK}" stroke-width="1.5"/>`
    b += txt(90, 138, base) + txt(221, 80, h, { anchor: 'start', color: hColor })
  }
  return svg(260, 150, b)
}

/** Yüzlük tablo (1–100); `mark` doğru dönen sayılar boyanır */
function hundredChart(mark: (n: number) => boolean, color = ORANGE): Visual {
  const u = 26
  let b = ''
  for (let n = 1; n <= 100; n++) {
    const x = 2 + ((n - 1) % 10) * u, y = 2 + Math.floor((n - 1) / 10) * u
    const on = mark(n)
    b += `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="${on ? color : '#fff'}" stroke="#cfd3e6"/>`
    b += txt(x + u / 2, y + u / 2 + 1, String(n), { size: 9, color: on ? '#fff' : INK })
  }
  return svg(264, 264, b)
}

/** 10 × 10’luk kareli kâğıt: ilk `n` küçük kare sütun sütun boyanır (her sütun 0,1) */
const hundredGrid = (n: number): Visual => ({
  kind: 'grid',
  cols: 10,
  rows: 10,
  cells: Array.from({ length: n }, (_, i) => `${Math.floor(i / 10)},${i % 10}`),
})

/** Asal çarpan ağacı. Düğüm değeri '?' ise kesikli çizgiyle boş gösterilir. */
type TNode = { v: string; k?: TNode[] }
function factorTree(root: TNode): Visual {
  const leaves = (t: TNode): number => (t.k ? t.k.reduce((s, c) => s + leaves(c), 0) : 1)
  const depth = (t: TNode): number => (t.k ? 1 + Math.max(...t.k.map(depth)) : 0)
  const total = leaves(root)
  const W = Math.max(200, total * 56), H = 44 + depth(root) * 52, cell = W / total
  let lines = '', nodes = ''
  const place = (t: TNode, x0: number, d: number): [number, number] => {
    const x = r1(x0 + (leaves(t) * cell) / 2), y = 22 + d * 52
    if (t.k) {
      let cx = x0
      for (const c of t.k) {
        const [px, py] = place(c, cx, d + 1)
        lines += seg(x, y + 14, px, py - 14, { w: 2 })
        cx += leaves(c) * cell
      }
    }
    const hidden = t.v === '?'
    nodes += `<circle cx="${x}" cy="${y}" r="16" fill="${hidden ? '#fff' : t.k ? '#e0e7ff' : '#fde2b8'}" stroke="${hidden ? ORANGE : INK}" stroke-width="2"${hidden ? ' stroke-dasharray="4 3"' : ''}/>`
    nodes += txt(x, y + 1, t.v, { size: 13, color: hidden ? ORANGE : INK })
    return [x, y]
  }
  place(root, 0, 0)
  return svg(W, H, lines + nodes)
}

/** Kibrit çöpü örüntüsü: yan yana kareler (her adım ayrı çizilir) */
function stickSteps(steps: number[]): Visual {
  const s = 26
  let x = 10, b = ''
  const st = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c2410c" stroke-width="4.5" stroke-linecap="round"/>`
  steps.forEach((n, k) => {
    for (let i = 0; i < n; i++) b += st(x + i * s + 3, 14, x + (i + 1) * s - 3, 14) + st(x + i * s + 3, 14 + s, x + (i + 1) * s - 3, 14 + s)
    for (let i = 0; i <= n; i++) b += st(x + i * s, 17, x + i * s, 11 + s)
    b += txt(x + (n * s) / 2, 62, `${k + 1}. adım`, { size: 11 })
    x += n * s + 24
  })
  return svg(x - 4, 74, b)
}

/** Düzgün çokgen ve bir köşesinden çizilen köşegenlerle oluşan üçgenler */
function polyTri(n: number): Visual {
  const c = 70, R = 58
  const P = Array.from({ length: n }, (_, i) => at(c, c, R, 90 + (i * 360) / n))
  let b = ''
  for (let i = 1; i < n - 1; i++) b += `<polygon points="${[P[0], P[i], P[i + 1]].map((p) => p.join(',')).join(' ')}" fill="${i % 2 ? INDIGO : ORANGE}" fill-opacity="0.25" stroke="none"/>`
  b += `<polygon points="${P.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  for (let i = 2; i < n - 1; i++) b += seg(P[0][0], P[0][1], P[i][0], P[i][1], { w: 2, dash: true })
  return svg(140, 140, b)
}

/** Köşelerinde açı etiketleri olan çokgen (etiketler köşeden ağırlık merkezine doğru yazılır) */
function polyFig(pts: [number, number][], labels: string[], w = 260, h = 150): Visual {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  let b = `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${INDIGO}" fill-opacity="0.18" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  pts.forEach(([x, y], i) => {
    if (!labels[i]) return
    b += txt(r1(x + (cx - x) * 0.3), r1(y + (cy - y) * 0.3), labels[i], { size: 13, color: labels[i] === 'x' ? INDIGO : '#c2410c' })
  })
  return svg(w, h, b)
}
const TRI: [number, number][] = [[30, 130], [230, 130], [115, 20]]
const QUAD: [number, number][] = [[30, 130], [225, 130], [195, 25], [60, 45]]

/** Çember: yarıçap (r) ya da çap (d) çizili ve etiketli */
function circleFig(kind: 'r' | 'd', label: string): Visual {
  let b = `<circle cx="90" cy="80" r="60" fill="${INDIGO}" fill-opacity="0.12" stroke="${INK}" stroke-width="2.5"/><circle cx="90" cy="80" r="3" fill="${INK}"/>`
  if (kind === 'r') b += seg(90, 80, 150, 80, { color: ORANGE }) + txt(120, 68, label, { size: 13, color: '#c2410c' })
  else b += seg(30, 80, 150, 80, { color: ORANGE }) + txt(90, 68, label, { size: 13, color: '#c2410c' })
  return svg(180, 160, b)
}

/** Haftalık simit satışları; dikey eksen `from` değerinden başlar (18 → yanıltıcı, 0 → dürüst) */
function simitGraph(from: number, ticks: number[]): Visual {
  const k = 120 / (24 - from), Y = (v: number) => r1(140 - (v - from) * k)
  const data: [string, number][] = [['Pzt', 20], ['Salı', 22], ['Çar', 21], ['Per', 23]]
  return svg(
    240,
    175,
    seg(40, 20, 40, 140, { w: 2 }) +
      seg(40, 140, 230, 140, { w: 2 }) +
      ticks.map((v) => seg(36, Y(v), 40, Y(v), { w: 1.5 }) + txt(32, Y(v), String(v), { size: 11, anchor: 'end' })).join('') +
      data.map(([d, v], i) => `<rect x="${55 + i * 45}" y="${Y(v)}" width="30" height="${r1(140 - Y(v))}" fill="${INDIGO}" rx="3"/>` + txt(70 + i * 45, 155, d, { size: 11 })).join('') +
      txt(135, 9, 'Satılan simit sayısı', { size: 11 }),
  )
}

// Sık kullanılan sabit görseller
const FIG_NUMBERED = parallel(62, { numbers: true })
const FIG_YAMUK = transversals([95, 70], [165, 200], [[[95, 50], [165, 50], [200, 115], [70, 115]]], [['A', 88, 40], ['B', 168, 40], ['C', 208, 126], ['D', 64, 126]])
const FIG_PARALELKENAR = transversals([90, 65], [175, 150], [[[90, 50], [175, 50], [150, 115], [65, 115]]], [['A', 84, 40], ['B', 180, 40], ['C', 156, 126], ['D', 58, 126]])
const FIG_UCGEN = transversals([130, 85], [130, 190], [[[130, 50], [190, 115], [85, 115]]], [['A', 130, 38], ['B', 80, 126], ['C', 196, 126]])
const FIG_KELEBEK = transversals([90, 170], [170, 90], [[[90, 50], [170, 50], [130, 82.5]], [[90, 115], [170, 115], [130, 82.5]]])
const FIG_YANILTICI_GRAFIK = simitGraph(18, [18, 20, 22, 24])
const FIG_DURUST_GRAFIK = simitGraph(0, [0, 6, 12, 18, 24])

/** Aynı paralel doğrular arasında tabanı ortak üç üçgen */
const FIG_ESIT_YUKSEKLIK = svg(
  260,
  130,
  [['40,20', ORANGE], ['135,20', INDIGO], ['225,20', GREEN]].map(([p, c]) => `<polygon points="100,110 170,110 ${p}" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`).join('') +
    seg(10, 20, 250, 20) +
    seg(10, 110, 250, 110) +
    parMark(18, 20) +
    parMark(18, 110) +
    txt(100, 122, 'A', { size: 12 }) +
    txt(170, 122, 'B', { size: 12 }),
)

/** Paralelkenarı kesip taşıyarak dikdörtgen elde etme */
const FIG_KES_TASI = svg(
  270,
  175,
  `<polygon points="40,120 190,120 230,40 80,40" fill="${INDIGO}" fill-opacity="0.2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<polygon points="40,120 80,120 80,40" fill="${ORANGE}" fill-opacity="0.5" stroke="${ORANGE}" stroke-width="2"/>` +
    `<polygon points="190,120 230,120 230,40" fill="${ORANGE}" fill-opacity="0.15" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="5 4"/>` +
    seg(80, 40, 80, 120, { w: 2, color: ORANGE, dash: true }) +
    `<path d="M58 140 Q135 174 212 140" fill="none" stroke="${ORANGE}" stroke-width="2.5"/><path d="M214 137 l-4 11 l-7 -7 z" fill="${ORANGE}"/>` +
    txt(135, 132, 'taban', { size: 12 }) +
    txt(86, 80, 'yükseklik', { size: 11, anchor: 'start', color: '#c2410c' }),
)

/** Paralelkenar bir köşegenle iki eş üçgene ayrılır */
const FIG_YARIM = svg(
  270,
  145,
  `<polygon points="40,120 190,120 80,40" fill="${ORANGE}" fill-opacity="0.35" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<polygon points="190,120 230,40 80,40" fill="${INDIGO}" fill-opacity="0.2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    seg(80, 40, 80, 120, { w: 2, color: '#c2410c', dash: true }) +
    txt(115, 136, 'taban') +
    txt(86, 92, 'yükseklik', { size: 11, anchor: 'start', color: '#c2410c' }),
)

/** Üçgenin iç açıları toplamı: tepeden tabana paralel çizilen doğruda açılar yan yana gelir */
const FIG_UCGEN_TOPLAM = (() => {
  const A: [number, number] = [60, 130], B: [number, number] = [220, 130], C: [number, number] = [110, 30]
  const aA = (Math.atan2(100, 50) * 180) / Math.PI
  const aB = (Math.atan2(100, 110) * 180) / Math.PI
  const wedge = (p: [number, number], a0: number, a1: number, color: string, label: string) => {
    const [sx, sy] = at(p[0], p[1], 20, a0)
    const [ex, ey] = at(p[0], p[1], 20, a1)
    const [lx, ly] = at(p[0], p[1], 31, (a0 + a1) / 2)
    return `<path d="M${p[0]} ${p[1]} L${sx} ${sy} A20 20 0 0 0 ${ex} ${ey} Z" fill="${color}" fill-opacity="0.4" stroke="${color}" stroke-width="1.5"/>` + txt(lx, ly, label, { size: 12, color })
  }
  let b = seg(10, 30, 250, 30) + seg(10, 130, 250, 130) + parMark(22, 30) + parMark(22, 130)
  b += txt(246, 19, 'd₁', { anchor: 'end' }) + txt(246, 145, 'd₂', { anchor: 'end' })
  b += wedge(A, 0, aA, ORANGE, 'a') + wedge(B, 180 - aB, 180, INDIGO, 'b')
  b += wedge(C, 180, 180 + aA, ORANGE, 'a') + wedge(C, 180 + aA, 360 - aB, GREEN, 'c') + wedge(C, 360 - aB, 360, INDIGO, 'b')
  b += `<polygon points="${[A, B, C].map((p) => p.join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  return svg(260, 155, b)
})()

/** Çapı 1 birim olan tekerlek bir tur yuvarlanınca: “3 çap ve biraz” */
const FIG_TEKERLEK = (() => {
  const d = 40, L = 20, end = r1(L + Math.PI * d)
  let b = `<circle cx="${L + d / 2}" cy="${100 - d / 2 + 20}" r="${d / 2}" fill="${INDIGO}" fill-opacity="0.15" stroke="${INK}" stroke-width="2.5"/>`
  b += seg(L, 100, L + d, 100, { color: ORANGE, w: 2 }) + txt(L + d / 2, 92, 'çap', { size: 10, color: '#c2410c' })
  b += `<line x1="${L}" y1="132" x2="${end}" y2="132" stroke="${ORANGE}" stroke-width="5" stroke-linecap="round"/>`
  for (let k = 0; k <= 3; k++) b += seg(L + k * d, 125, L + k * d, 139, { w: 2 })
  for (let k = 1; k <= 3; k++) b += txt(L + k * d - d / 2, 152, `${k}. çap`, { size: 10 })
  b += txt(end + 22, 132, '+ biraz', { size: 10, color: '#c2410c' })
  return svg(200, 165, b)
})()

// ───────────────────────────────────────────────────────────────────────────
// 6. SINIF ETKİNLİKLERİ
// ───────────────────────────────────────────────────────────────────────────

const HF_LAUNCH = 'Bu soruda tek bir doğru cevap yok! Her seçenek bir gerekçeyle “farklı” olabilir. Sen hangisini seçip nasıl savunacaksın?'
const HF_REFLECT = 'Seçtiğin seçenek için gerekçeni bir arkadaşına anlat. Onun seçtiği seçenek ve gerekçesi seninkinden farklı mıydı?'
const HF_INSTR = 'Dört seçenekten birini seç ve neden farklı olduğunu düşün; ardından diğer gerekçeleri de incele.'
const HF_PROMPT = 'Hangisi farklı? Seçtiğin seçeneğin neden farklı olduğunu düşün.'

const GEO_INSTR = 'Çivilere dokunarak şekli oluştur; ilk çiviye yeniden dokunarak şekli kapat. Her küçük kare 1 birimkaredir.'

export const grade6: Activity[] = [
  // ── Sayılar ve Nicelikler (1) ───────────────────────────────────────────

  // MAT.6.1.1
  {
    id: 'g6-alan-dikdortgenleri',
    outcomes: ['MAT.6.1.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Aynı alan, farklı dikdörtgenler',
    instructions: GEO_INSTR,
    level: 1,
    launch: {
      text: 'Okul bahçesinde 12 m²’lik dikdörtgen bir sebze tarhı yapılacak. Kenar uzunlukları metre cinsinden doğal sayı olacaksa tarh hangi biçimlerde olabilir?',
      visual: { kind: 'area', w: 4, h: 3, showGrid: true },
    },
    reflect: '12 için üç farklı dikdörtgen bulduk. Bir sayının kaç farklı dikdörtgeni olduğunu bilmek, o sayının çarpanları hakkında sana ne söyler?',
    tool: 'geoboard',
    config: { size: 12 },
    tasks: [
      {
        prompt: 'Alanı 12 birimkare olan bir dikdörtgen oluştur.',
        target: { sides: 4, area: 12, rect: true },
        hints: ['12 kareyi kaç sıraya eşit olarak dizebilirsin?', 'Bir kenarı 3 birim alırsan diğer kenar kaç birim olmalı?'],
        explain: '12’yi 1 × 12, 2 × 6 ve 3 × 4 dikdörtgenleriyle gösterebiliriz. Bu kenar uzunlukları 12’nin çarpanlarıdır: 1, 2, 3, 4, 6, 12.',
      },
      {
        prompt: 'Alanı 12 birimkare, çevresi 26 birim olan dikdörtgeni oluştur.',
        target: { sides: 4, area: 12, perimeter: 26, rect: true },
        hints: ['Çevre 26 ise iki komşu kenarın toplamı kaç olmalı?', 'Çarpımı 12, toplamı 13 olan iki sayı hangileri?'],
        explain: '1 × 12 = 12. Her doğal sayının 1 ve kendisi çarpanıdır; bu yüzden tek sıralı dikdörtgen her zaman yapılabilir.',
      },
      {
        prompt: 'Alanı 18 birimkare olan dikdörtgenlerden çevresi en küçük olanı oluştur.',
        target: { sides: 4, area: 18, perimeter: 18, rect: true },
        hints: ['18’i iki sayının çarpımı olarak kaç farklı yolla yazabilirsin?', 'Kenarlar birbirine yaklaştıkça çevre ne olur?'],
        explain: '18 = 1 × 18 = 2 × 9 = 3 × 6. Kenarları birbirine en yakın olan 3 × 6 dikdörtgeninin çevresi en küçüktür (18 birim).',
      },
      {
        prompt: 'Alanı 16 birimkare olan bir kare oluştur.',
        target: { sides: 4, area: 16, square: true },
        hints: ['Hangi sayıyı kendisiyle çarparsan 16 olur?'],
        explain: '16 = 4 × 4. Bir sayı, bir doğal sayının kendisiyle çarpımıysa o sayıyla kare oluşturabiliriz.',
      },
    ],
  },
  {
    id: 'g6-carpan-listesi',
    outcomes: ['MAT.6.1.1'],
    type: 'match',
    stage: 'model',
    title: 'Dikdörtgenden çarpana',
    instructions: 'Her kareli dikdörtgeni, alanını iki çarpanın çarpımı olarak gösteren eşitlikle eşleştir.',
    level: 1,
    launch: { text: 'Bir mozaik ustası kare fayansları dikdörtgen biçiminde diziyor. Fayans dizisine bakarak kaç fayans kullandığını ve hangi iki sayının çarpıldığını nasıl bulursun?' },
    reflect: '24 için iki farklı dikdörtgen gördün (4 × 6 ve 3 × 8). 24’ün başka dikdörtgenleri de var mı? Hepsini bulduğundan nasıl emin olursun?',
    pairs: [
      { left: { visual: { kind: 'area', w: 5, h: 3, showGrid: true } }, right: '15 = 3 × 5' },
      { left: { visual: { kind: 'area', w: 6, h: 4, showGrid: true } }, right: '24 = 4 × 6' },
      { left: { visual: { kind: 'area', w: 9, h: 2, showGrid: true } }, right: '18 = 2 × 9' },
      { left: { visual: { kind: 'area', w: 7, h: 1, showGrid: true } }, right: '7 = 1 × 7' },
      { left: { visual: { kind: 'area', w: 4, h: 4, showGrid: true } }, right: '16 = 4 × 4' },
      { left: { visual: { kind: 'area', w: 8, h: 3, showGrid: true } }, right: '24 = 3 × 8' },
    ],
    perRound: 3,
  },
  {
    id: 'g6-carpan-mi-kat-mi',
    outcomes: ['MAT.6.1.1'],
    type: 'categorize',
    stage: 'sembol',
    title: '24’ün çarpanı mı, katı mı?',
    instructions: 'Her sayıyı doğru gruba taşı: 24’ün çarpanı mı, 24’ün katı mı, yoksa ikisi de değil mi?',
    level: 1,
    launch: { text: '24 öğrenci eşit gruplara ayrılacak: grupta kaç öğrenci olabilir? Okula her gün 24’er kişilik otobüsler de geliyor: toplam kaç öğrenci gelmiş olabilir?' },
    reflect: '24’ün çarpanlarını saymayı bitirebilirsin ama katlarını sayarken neden hiç bitiremezsin?',
    categories: [
      { id: 'carpan', label: '24’ün çarpanı', color: '#3b82f6' },
      { id: 'kat', label: '24’ün katı', color: '#22c55e' },
      { id: 'hicbiri', label: 'İkisi de değil', color: '#ef4444' },
    ],
    items: [
      { content: '2', category: 'carpan', explain: '2 × 12 = 24; 24, 2’ye kalansız bölünür.' },
      { content: '6', category: 'carpan', explain: '6 × 4 = 24' },
      { content: '8', category: 'carpan', explain: '8 × 3 = 24' },
      { content: '12', category: 'carpan', explain: '12 × 2 = 24' },
      { content: '48', category: 'kat', explain: '24 × 2 = 48; 48, 24’ün katıdır.' },
      { content: '72', category: 'kat', explain: '24 × 3 = 72' },
      { content: '120', category: 'kat', explain: '24 × 5 = 120' },
      { content: '10', category: 'hicbiri', explain: '24 ÷ 10 kalanlı bölünür; 10, 24’ün katı da değildir.' },
      { content: '36', category: 'hicbiri', explain: '24 × 1 = 24 ve 24 × 2 = 48; 36 bu ikisinin arasında kalıyor. 36, 24’ü de bölmez.' },
      { content: '9', category: 'hicbiri', explain: '24 ÷ 9 = 2, kalan 6; 9, 24’ün çarpanı değildir.' },
    ],
  },
  {
    id: 'g6-carpan-ve-kat',
    outcomes: ['MAT.6.1.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çarpan ve kat problemleri',
    instructions: 'Problemi bir dikdörtgenle ya da listeyle modelle; sonra doğru seçeneği işaretle.',
    level: 2,
    launch: { text: 'Bir okulun 36 m²’lik dikdörtgen bahçesinin çevresine duvar örülecek. Duvar ustası “Duvarın uzunluğu bahçenin biçimine göre değişir.” diyor. Haklı mı?' },
    reflect: 'Alanı aynı kalan dikdörtgenlerde kenarlar birbirine yaklaştıkça çevre neden kısalıyor? Bir çizimle arkadaşına göster.',
    questions: [
      {
        prompt: { text: 'Alanı 36 m² olan dikdörtgen biçimli bahçenin kenar uzunlukları metre cinsinden doğal sayıdır. Bahçenin çevresi en az kaç metre olabilir?', visual: { kind: 'area', w: 6, h: 6, showGrid: true } },
        choices: ['24 m', '26 m', '40 m', '74 m'],
        answer: 0,
        explain: '36 = 6 × 6 seçilirse çevre 2 × (6 + 6) = 24 m olur. Kenarlar birbirine yaklaştıkça çevre azalır.',
        feedback: [null, '26 m, 4 × 9 dikdörtgeninin çevresi. Kenarları birbirine daha yakın bir dikdörtgen var mı?', '40 m, 2 × 18 dikdörtgeninin çevresi. Kenarlar birbirine yaklaştıkça çevre ne oluyor?', '74 m, 1 × 36 dikdörtgeninin çevresi; bu en büyük çevredir.'],
      },
      {
        prompt: 'Aynı bahçenin (alanı 36 m²) çevresi en fazla kaç metre olabilir?',
        choices: ['36 m', '40 m', '74 m', '72 m'],
        answer: 2,
        explain: '36 = 1 × 36 seçilirse çevre 2 × (1 + 36) = 74 m olur.',
        feedback: ['36, alanın ölçüsü. Çevreyi bulmak için kenarları topla.', '40 m, 2 × 18 dikdörtgeninin çevresi. Daha uzun ve ince bir dikdörtgen olabilir mi?', null, '72 = 2 × 36: yalnızca uzun kenarları topladın; kısa kenarları (1 m + 1 m) unutma.'],
      },
      {
        prompt: 'Ayşe 48 kurabiyeyi tabaklara, her tabakta eşit sayıda olacak ve hiç kurabiye artmayacak biçimde dağıtacak. Bir tabağa kaç kurabiye KOYAMAZ?',
        choices: ['6', '5', '8', '12'],
        answer: 1,
        explain: '5, 48’in çarpanı değildir; 48 ÷ 5 işleminde kalan 3’tür.',
        feedback: ['6 × 8 = 48; tabaklara 6’şar kurabiye konabilir.', null, '8 × 6 = 48; tabaklara 8’er kurabiye konabilir.', '12 × 4 = 48; tabaklara 12’şer kurabiye konabilir.'],
      },
      {
        prompt: 'Bir duraktan servisler 15 dakikada bir kalkıyor. İlk servis 08.00’de kalktığına göre hangisi bir servisin kalkış saati OLAMAZ?',
        choices: ['08.45', '09.15', '09.40', '10.00'],
        answer: 2,
        explain: '08.00’den 09.40’a kadar 100 dakika geçer; 100, 15’in katı değildir.',
        feedback: ['45 dakika = 3 × 15; bu bir kalkış saatidir.', '75 dakika = 5 × 15; bu bir kalkış saatidir.', null, '120 dakika = 8 × 15; bu bir kalkış saatidir.'],
      },
      {
        prompt: 'Hangisi her zaman doğrudur?',
        choices: ['Bir sayının çarpanları sonsuz tanedir.', 'Bir sayının en büyük katı kendisidir.', 'Bir sayının katları istenildiği kadar devam ettirilebilir.', 'Bir sayının çarpanları kendisinden büyük olabilir.'],
        answer: 2,
        feedback: ['Çarpanlar sayının kendisini geçemez; bu yüzden sayılıdır (sonludur).', 'Sayının kendisi, sıfırdan farklı en küçük katıdır; katlar 2 ×, 3 × ... diye büyür.', null, 'Bir sayıyı kendisinden büyük bir sayıya bölünce bölüm 1’den küçük olur; kalansız bölünemez.'],
      },
      {
        prompt: 'Kerem “Çarpanı çok olan sayı daha büyüktür.” dedi. Hangisi bu iddiayı çürüten bir örnektir?',
        choices: ['12’nin 6, 11’in 2 çarpanı var.', '12’nin 6, 13’ün 2 çarpanı var.', '6’nın 4, 5’in 2 çarpanı var.', '30’un 8, 29’un 2 çarpanı var.'],
        answer: 1,
        explain: '13, 12’den büyük ama yalnızca 2 çarpanı var. Tek bir karşı örnek iddiayı çürütmeye yeter.',
        feedback: ['Bu örnekte büyük olan 12’nin çarpanı daha çok; iddiayı destekliyor.', null, 'Büyük olan 6’nın çarpanı daha çok; iddiayla uyumlu.', 'Büyük olan 30’un çarpanı daha çok; iddiayla uyumlu.'],
      },
    ],
  },

  // MAT.6.1.2
  {
    id: 'g6-bolunebilme-yuzluk',
    outcomes: ['MAT.6.1.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Yüzlük tablodaki örüntüler',
    instructions: 'Yüzlük tablodaki boyalı sayıları incele; örüntüyü anlatan seçeneği işaretle.',
    level: 1,
    launch: { text: 'Öğretmen “Söyleyin, bölmeden cevap vereyim!” diyor: 7.380 sayısı 2’ye, 5’e, 10’a bölünür mü? Öğretmen bu kadar hızlı nasıl karar veriyor?' },
    reflect: '9’un katlarında rakamların toplamı neden önemli? İpucu: 10 = 9 + 1, 20 = 18 + 2, 30 = 27 + 3... Bir arkadaşına açıkla.',
    questions: [
      {
        prompt: { text: 'Yüzlük tabloda 2’nin katları boyandı. Boyalı sayıların ortak özelliği nedir?', visual: hundredChart((n) => n % 2 === 0) },
        choices: ['Birler basamakları 0, 2, 4, 6 veya 8’dir.', 'Rakamlarının toplamı 2’dir.', 'Hepsi iki basamaklıdır.', 'Onlar basamakları çifttir.'],
        answer: 0,
        explain: 'Her onluk 2’ye tam bölünür; bu yüzden yalnızca birler basamağına bakmak yeter.',
        feedback: [null, '12’nin rakamları toplamı 3 ama 12 boyalı. Sütunlara bak.', '2, 4, 6, 8 tek basamaklı ve boyalı.', '12’nin onlar basamağı 1 (tek) ama 12 boyalı. Hangi sütunlar boyalı?'],
      },
      {
        prompt: { text: '5’in katları boyandı. Boyalı sayıların ortak özelliği nedir?', visual: hundredChart((n) => n % 5 === 0) },
        choices: ['Birler basamakları 0 veya 5’tir.', 'Onlar basamakları 5’tir.', 'Hepsi tek sayıdır.', 'Rakamlarının toplamı 5’tir.'],
        answer: 0,
        feedback: [null, 'Yalnızca 50’li satır değil, iki sütun boyalı.', '10, 20, 30 çift ve boyalı.', '14’ün rakamları toplamı 5 ama boyalı değil.'],
      },
      {
        prompt: { text: '10’un katları boyandı. 10’a bölünmede neden yalnızca birler basamağına bakmak yeter?', visual: hundredChart((n) => n % 10 === 0) },
        choices: ['Her onluk 10’a tam bölünür; geriye kalan birlerin 0 olması gerekir.', '10 çift sayı olduğu için.', 'Onlar basamağı her zaman 1 olduğu için.', '10’un katları 100’den küçük olduğu için.'],
        answer: 0,
        feedback: [null, 'Çift olmak 2’ye bölünmeyi açıklar; 10’a bölünme için başka bir şey gerekir.', '20, 30, 40... onlar basamakları farklı.', '110, 250 gibi sayılar da 10’un katıdır.'],
      },
      {
        prompt: { text: '9’un katları boyandı: 18, 27, 36, 45... Bu sayıların rakamları için ne fark ediyorsun?', visual: hundredChart((n) => n % 9 === 0) },
        choices: ['Rakamlarının toplamı 9’un katıdır (9 ya da 18).', 'Birler basamakları hep 9’dur.', 'Hepsi tek sayıdır.', 'Onlar basamakları hep 9’dur.'],
        answer: 0,
        explain: 'Her onluk 9’a bölününce 1 artar (10 = 9 + 1). 36’da 3 onluktan 3, birlerden 6 artar: 3 + 6 = 9.',
        feedback: [null, '18’in birler basamağı 8.', '18 ve 36 çift sayılar.', '18’in onlar basamağı 1.'],
      },
      {
        prompt: { text: '3’ün katları boyandı (çapraz çizgiler oluşuyor). Hangisi 3’ün katı olan bir sayıyı anlatır?', visual: hundredChart((n) => n % 3 === 0) },
        choices: ['Rakamlarının toplamı 3’ün katı olan sayı', 'Birler basamağı 3 olan sayı', 'Birler basamağı 3, 6 veya 9 olan sayı', 'Tek sayı'],
        answer: 0,
        feedback: [null, '13’ün birler basamağı 3 ama 13 boyalı değil.', '16’nın birler basamağı 6 ama 16 boyalı değil; 12 ise boyalı.', '12 çift ve boyalı; 25 tek ama boyalı değil.'],
      },
      {
        prompt: { text: '4’ün katları boyandı. 100 de 4’e tam bölünür (100 = 4 × 25). Buna göre 1.316’nın 4’e bölünüp bölünmediğini anlamak için neye bakmak yeter?', visual: hundredChart((n) => n % 4 === 0) },
        choices: ['Son iki basamağın oluşturduğu sayıya (16)', 'Yalnızca birler basamağına (6)', 'Rakamların toplamına (11)', 'İlk iki basamağa (13)'],
        answer: 0,
        feedback: [null, '26’nın birler basamağı da 6 ama 26, 4’e bölünmez. Tek basamak yetmez.', 'Rakamlar toplamı 3 ve 9 için işe yarar; 4 için değil.', 'Yüzlükler ve binlikler zaten 4’e bölünür; onlara bakmaya gerek yok.'],
      },
    ],
  },
  {
    id: 'g6-bolunebilme-grupla',
    outcomes: ['MAT.6.1.2'],
    type: 'categorize',
    stage: 'sembol',
    title: '2 ve 5 ile bölünebilme',
    instructions: 'Bölme işlemi yapmadan, birler basamağına bakarak her sayıyı doğru gruba taşı.',
    level: 2,
    launch: { text: 'Bir fabrika ürünleri 2’li ya da 5’li kutulara hiç artmadan dolduruyor. Elindeki ürün sayısına bakarak hangi kutuları kullanabileceğini bölme yapmadan nasıl anlarsın?' },
    reflect: 'Hem 2’ye hem 5’e bölünen sayıların hepsinin birler basamağı neden 0? Bu sayılar 10’a da bölünür mü?',
    categories: [
      { id: 'ikisi', label: 'Hem 2 hem 5 ile bölünür', color: '#22c55e' },
      { id: 'iki', label: 'Yalnızca 2 ile bölünür', color: '#3b82f6' },
      { id: 'bes', label: 'Yalnızca 5 ile bölünür', color: '#f97316' },
      { id: 'hic', label: 'İkisiyle de bölünmez', color: '#ef4444' },
    ],
    items: [
      { content: '340', category: 'ikisi', explain: 'Birler basamağı 0: hem 2’ye hem 5’e (dolayısıyla 10’a) bölünür.' },
      { content: '1.250', category: 'ikisi', explain: 'Birler basamağı 0: hem 2’ye hem 5’e bölünür.' },
      { content: '560', category: 'ikisi', explain: 'Birler basamağı 0: hem 2’ye hem 5’e bölünür.' },
      { content: '786', category: 'iki', explain: 'Birler basamağı 6: çift, ama 0 ya da 5 değil.' },
      { content: '1.034', category: 'iki', explain: 'Birler basamağı 4: çift, ama 5’e bölünmez.' },
      { content: '238', category: 'iki', explain: 'Birler basamağı 8: çift, ama 5’e bölünmez.' },
      { content: '475', category: 'bes', explain: 'Birler basamağı 5: 5’e bölünür ama tek sayıdır.' },
      { content: '905', category: 'bes', explain: 'Birler basamağı 5: 5’e bölünür ama tek sayıdır.' },
      { content: '731', category: 'hic', explain: 'Birler basamağı 1: ne çift ne de 0 ya da 5.' },
      { content: '1.009', category: 'hic', explain: 'Birler basamağı 9: ne 2’ye ne 5’e bölünür.' },
    ],
  },
  {
    id: 'g6-eksik-rakam',
    outcomes: ['MAT.6.1.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Eksik rakamı bul',
    instructions: 'Bölünebilme kriterlerini kullanarak □ yerine gelecek rakamı ya da istenen cevabı yaz.',
    level: 3,
    launch: { text: 'Bir kumbaranın şifresi 3□6 biçiminde ve 9’a tam bölünen bir sayı. Kaybolan rakamı bölme yapmadan bulabilir misin?' },
    reflect: '3□6 sayısında □ için iki rakam (0 ve 9) uyuyor. Bir sorunun birden fazla doğru cevabı olabilmesi sana ne düşündürdü?',
    items: [
      { text: '52□ sayısı 10 ile tam bölünüyorsa □ yerine __ gelir.', answers: ['0'], hints: ['10’un katlarının birler basamağında hangi rakam vardır?'] },
      { text: '71□ sayısı 5 ile bölünebilen bir tek sayı ise □ = __', answers: ['5'], hints: ['5’in katlarının birler basamağı hangi rakamlar olabilir?', 'Bunlardan hangisi sayıyı tek yapar?'] },
      { text: '3□6 sayısı 9 ile tam bölünüyorsa □ yerine gelebilecek en büyük rakam __', answers: ['9'], hints: ['Bilinen rakamların toplamı kaç?', 'Toplamı 9’un katı yapmak için hangi rakamları ekleyebilirsin?'] },
      { text: '1.3□2 sayısı 4 ile tam bölünüyorsa □ yerine gelebilecek en küçük rakam __', answers: ['1'], hints: ['1.300 zaten 4’e bölünür; geriye hangi iki basamak kalıyor?', '□2 sayısı 02, 12, 22... olabilir. Hangisi 4’ün katı?'] },
      { text: '57□ sayısı 6 ile tam bölünüyorsa □ yerine gelebilecek rakamların toplamı __', answers: ['6'], hints: ['6’ya bölünen bir sayı hangi iki sayıya da bölünür?', 'Sayı hem çift olmalı hem de rakamları toplamı 3’ün katı olmalı.'], explain: '□ = 0 ya da □ = 6 olabilir: 570 ve 576. 0 + 6 = 6.' },
      { text: '3.4□ sayısı hem 2 hem 9 ile tam bölünüyorsa □ = __', answers: ['2'], hints: ['Rakamlar toplamını 9’un katı yapan rakam hangisi?', 'Bu rakam sayıyı çift yapıyor mu?'] },
      { text: '4□5 sayısı hem 3 hem 5 ile tam bölünüyorsa □ yerine __ farklı rakam gelebilir.', answers: ['4'], hints: ['Birler basamağı 5 olduğuna göre 5’e bölünme sağlanıyor mu?', '4 + □ + 5 toplamı 3’ün katı olmalı. □ yerine hangi rakamlar uyar?'], explain: '□ = 0, 3, 6 ya da 9 olabilir: 405, 435, 465, 495.' },
    ],
  },
  {
    id: 'g6-bolunebilme-neden',
    outcomes: ['MAT.6.1.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kurallar neden işe yarıyor?',
    instructions: 'Her iddiayı örneklerle sına; doğru gerekçeyi seç.',
    level: 3,
    launch: { text: 'Bir arkadaşın “Bölünebilme kurallarının ezberlenecek bir yanı yok, hepsinin bir sebebi var.” diyor. Bu etkinlikte kuralların neden işe yaradığını sorgulayacağız.' },
    reflect: '“Hem 2 hem 3’e bölünen sayı 6’ya bölünür.” doğruyken “Hem 2 hem 4’e bölünen sayı 8’e bölünür.” neden yanlış? Kendi cümlelerinle açıkla.',
    questions: [
      {
        prompt: 'Ece “Birler basamağı 4 olan her sayı 4’e tam bölünür.” dedi. Hangisi Ece’nin iddiasını çürüten bir örnektir?',
        choices: ['24', '44', '14', '64'],
        answer: 2,
        explain: '14 ÷ 4 = 3, kalan 2. Tek bir karşı örnek bir iddiayı çürütmeye yeter.',
        feedback: ['24 = 4 × 6; iddiayı destekliyor, çürütmüyor.', '44 = 4 × 11; iddiayla uyumlu.', null, '64 = 4 × 16; iddiayla uyumlu.'],
      },
      {
        prompt: '“Hem 2 hem 3 ile tam bölünen her sayı 6 ile de tam bölünür.” Bu önerme için ne söylenebilir?',
        choices: ['Doğrudur; 2’ye ve 3’e bölünen sayı 6’nın katıdır.', 'Yanlıştır; 18 buna bir karşı örnektir.', 'Yalnızca çift sayılar için doğrudur.', 'Yalnızca 100’den küçük sayılar için doğrudur.'],
        answer: 0,
        feedback: [null, '18 = 6 × 3; 18 önermeyi destekler.', '2’ye bölünen her sayı zaten çifttir; bu bir sınırlama değil.', 'Önerme her büyüklükteki sayı için geçerlidir: 600, 6.006 gibi.'],
      },
      {
        prompt: '“Hem 2 hem 4 ile tam bölünen her sayı 8 ile de tam bölünür.” Bu önerme için ne söylenebilir?',
        choices: ['Doğrudur.', 'Yanlıştır; 12 hem 2’ye hem 4’e bölünür ama 8’e bölünmez.', 'Yanlıştır; 16, 8’e bölünmez.', 'Doğrudur, çünkü 2 × 4 = 8.'],
        answer: 1,
        feedback: ['Bir karşı örnek aramayı dene: 4’ün katlarından 12’yi incele.', null, '16 = 8 × 2; 16, 8’e bölünür.', '4’e bölünen her sayı zaten 2’ye de bölünür; “2’ye bölünme” yeni bir bilgi katmaz.'],
      },
      {
        prompt: 'Rakamlarının toplamı 9’un katı olan bir sayı 3’e de tam bölünür mü?',
        choices: ['Evet; 9’un katları 3’ün de katıdır.', 'Hayır; yalnızca 9’a bölünür.', 'Bazen bölünür, bazen bölünmez.', 'Yalnızca sayı tekse bölünür.'],
        answer: 0,
        feedback: [null, '9 = 3 × 3 olduğundan 9’a bölünen sayı 3’e de bölünür.', 'Rakamlar toplamı 9’un katıysa 3’ün de katıdır; bunun istisnası yok.', '27 tek, 36 çift; ikisi de 3’e bölünür.'],
      },
      {
        prompt: 'Bir sayının 4’e bölünüp bölünmediğine bakarken neden yüzler ve binler basamaklarını dikkate almayız?',
        choices: ['100 ve 1.000, 4’e tam bölündüğü için bu basamaklar kalan oluşturmaz.', 'Bu basamaklar her zaman 0 olduğu için.', '4 tek basamaklı bir sayı olduğu için.', '4’e bölünme kuralı yalnızca iki basamaklı sayılar için olduğu için.'],
        answer: 0,
        feedback: [null, '2.316 gibi sayılarda bu basamaklar 0 değil; yine de bakmayız. Neden?', '9 da tek basamaklı ama 9 için tüm rakamlara bakarız.', 'Kural 4.316 gibi büyük sayılar için de kullanılır.'],
      },
      {
        prompt: 'Bir okulda 2.346 öğrenci var. Öğrenciler 6’şar kişilik gruplara hiç artmadan ayrılabilir mi?',
        choices: ['Evet; 2.346 çift ve rakamları toplamı 15 (3’ün katı).', 'Hayır; birler basamağı 0 olmalı.', 'Hayır; rakamları toplamı 9’un katı değil.', 'Bölme yapmadan karar verilemez.'],
        answer: 0,
        feedback: [null, '6’ya bölünme için birler basamağının 0 olması gerekmez; 12, 18, 24 de 6’ya bölünür.', '9’a bölünme gerekmiyor; 6 = 2 × 3 olduğundan 3’e bölünme yeter.', 'Bölünebilme kriterleri tam da bunun için var: 2 ve 3 kriterini birlikte kullan.'],
      },
    ],
  },

  // MAT.6.1.3
  {
    id: 'g6-asal-dikdortgen',
    outcomes: ['MAT.6.1.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Tek dikdörtgenli sayılar',
    instructions: GEO_INSTR,
    level: 1,
    launch: { text: 'Bir öğretmen 7 sırayı sınıfa dikdörtgen biçiminde yerleştirmek istiyor ama hep tek sıra hâlinde kalıyor. 12 sırayla ise birçok farklı düzen kurabiliyor. Neden?' },
    reflect: 'Bir sayının asal olup olmadığını dikdörtgenlerle nasıl anlarsın? 1 ile kaç dikdörtgen yapılabilir; sence 1 asal mı?',
    tool: 'geoboard',
    config: { size: 12 },
    tasks: [
      {
        prompt: 'Alanı 7 birimkare olan bir dikdörtgen oluştur. Başka bir dikdörtgen de bulabiliyor musun?',
        target: { sides: 4, area: 7, rect: true },
        hints: ['7 kareyi 2 sıraya eşit olarak dizebilir misin?', 'Peki 3 sıraya?'],
        explain: '7 yalnızca 1 × 7 dikdörtgeniyle gösterilebilir. Yalnızca iki çarpanı (1 ve kendisi) olan sayılara asal sayı denir.',
      },
      {
        prompt: 'Alanı 11 birimkare olan bir dikdörtgen oluştur.',
        target: { sides: 4, area: 11, rect: true },
        explain: '11 de yalnızca 1 × 11 biçiminde dizilebilir: 11 asaldır.',
      },
      {
        prompt: 'Alanı 10 birimkare, çevresi 14 birim olan dikdörtgeni oluştur.',
        target: { sides: 4, area: 10, perimeter: 14, rect: true },
        hints: ['Çevre 14 ise iki komşu kenarın toplamı 7 olmalı.', 'Toplamı 7, çarpımı 10 olan iki sayı hangileri?'],
        explain: '10 = 2 × 5. Tek sıra dışında bir dikdörtgen yapılabildiği için 10 asal değildir.',
      },
      {
        prompt: 'Alanı 9 birimkare olan bir kare oluştur.',
        target: { sides: 4, area: 9, square: true },
        explain: '9 = 3 × 3 olduğu için 9 asal değildir. Tek sayı olmak, asal olmaya yetmez.',
      },
    ],
  },
  {
    id: 'g6-asal-carpan-agaci',
    outcomes: ['MAT.6.1.3'],
    type: 'fill',
    stage: 'model',
    title: 'Asal çarpan ağacı',
    instructions: 'Asal çarpan ağacını incele; “?” ile gösterilen ya da istenen sayıyı yaz.',
    level: 2,
    launch: {
      text: 'Bir sayıyı daha küçük çarpanlara ayırmaya devam edersen sonunda bir yerde durmak zorunda kalırsın. Nerede durursun ve neden?',
      visual: factorTree({ v: '12', k: [{ v: '3' }, { v: '4', k: [{ v: '2' }, { v: '2' }] }] }),
    },
    reflect: '60’ı 6 · 10 ya da 4 · 15 diye ayırmaya başlasan ağacın ucunda aynı asal sayılar mı çıkar? Deneyerek açıkla.',
    items: [
      { text: '60 = 2 · 3 · 2 · __', answers: ['5'], visual: factorTree({ v: '60', k: [{ v: '6', k: [{ v: '2' }, { v: '3' }] }, { v: '10', k: [{ v: '2' }, { v: '?' }] }] }), hints: ['10’u hangi iki asal sayının çarpımı olarak yazabilirsin?'] },
      { text: '84 = 2 · 2 · __ · 7', answers: ['3'], visual: factorTree({ v: '84', k: [{ v: '4', k: [{ v: '2' }, { v: '2' }] }, { v: '21', k: [{ v: '?' }, { v: '7' }] }] }), hints: ['21’i hangi iki sayının çarpımı olarak yazabilirsin?'] },
      { text: '45 = 9 · 5 ve 9 = 3 · 3 olduğuna göre ağaçtaki “?” yerine __ gelir.', answers: ['9'], visual: factorTree({ v: '45', k: [{ v: '?', k: [{ v: '3' }, { v: '3' }] }, { v: '5' }] }) },
      { text: 'Can 90’ı 6 · 15 diye ayırmaya başladı. Ağacın ucundaki asal çarpanlar 2, 3, 3 ve __', answers: ['5'], visual: factorTree({ v: '90', k: [{ v: '6', k: [{ v: '2' }, { v: '3' }] }, { v: '15', k: [{ v: '3' }, { v: '?' }] }] }) },
      { text: '2 · 3 · 5 · 5 çarpımı __ sayısının asal çarpanlarına ayrılmış hâlidir.', answers: ['150'], visual: factorTree({ v: '?', k: [{ v: '6', k: [{ v: '2' }, { v: '3' }] }, { v: '25', k: [{ v: '5' }, { v: '5' }] }] }), hints: ['Önce 6 ile 25’i bul, sonra çarp.'] },
      { text: 'Asal çarpanları yalnızca 2 ve 7 olan en küçük iki basamaklı sayı __', answers: ['14'], hints: ['2 ile 7’yi çarparsan kaç olur? Bu sayı iki basamaklı mı?'] },
      { text: '1’den 20’ye kadar __ tane asal sayı vardır.', answers: ['8'], hints: ['Eratosthenes kalburunu düşün: 2’nin, 3’ün katlarını (kendileri hariç) ele.', 'Kalanları say: 2, 3, 5, 7, ...'] },
    ],
  },
  {
    id: 'g6-asal-mi',
    outcomes: ['MAT.6.1.3'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Asal mı, değil mi?',
    instructions: 'Yalnızca iki farklı böleni (1 ve kendisi) olan sayılar asaldır. Sayıları doğru gruba taşı.',
    level: 2,
    launch: { text: 'Ali “Tek sayıların hepsi asaldır.” diyor. Bu gruplamayı yaptıktan sonra Ali’ye ne söylersin?' },
    reflect: '51 ve 91 asal gibi görünse de değil. Bir sayının asal olmadığını göstermenin en kısa yolu nedir?',
    categories: [
      { id: 'asal', label: 'Asal sayı', color: '#22c55e' },
      { id: 'degil', label: 'Asal sayı değil', color: '#ef4444' },
    ],
    items: [
      { content: '2', category: 'asal', explain: 'Yalnızca 1 ve 2’ye bölünür; çift olan tek asal sayıdır.' },
      { content: '13', category: 'asal', explain: 'Yalnızca 1 × 13 biçiminde yazılabilir.' },
      { content: '29', category: 'asal', explain: '2, 3, 5 hiçbiri 29’u bölmez; yalnızca 1 × 29.' },
      { content: '41', category: 'asal', explain: '2, 3, 5 ve 7’nin hiçbiri 41’i bölmez.' },
      { content: '53', category: 'asal', explain: '2, 3, 5 ve 7’nin hiçbiri 53’ü bölmez.' },
      { content: '1', category: 'degil', explain: '1’in yalnızca bir böleni vardır; asal sayıların tam iki böleni olmalıdır.' },
      { content: '21', category: 'degil', explain: '21 = 3 × 7' },
      { content: '27', category: 'degil', explain: '27 = 3 × 9' },
      { content: '51', category: 'degil', explain: '51 = 3 × 17 (rakamları toplamı 6, 3’e bölünür).' },
      { content: '91', category: 'degil', explain: '91 = 7 × 13' },
    ],
  },
  {
    id: 'g6-asal-ozellikleri',
    outcomes: ['MAT.6.1.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Asal sayıların sırları',
    instructions: 'Her iddiayı örneklerle sına ve doğru seçeneği işaretle.',
    level: 2,
    launch: { text: 'Bilgisayarlar şifreleri korumak için çok büyük asal sayılar kullanır. Asal sayıların hangi özellikleri onları bu kadar özel yapıyor?' },
    reflect: 'Asal sayıları “sayıların yapı taşları” diye anlatırsak ne demek istemiş oluruz? Bir örnekle açıkla.',
    questions: [
      {
        prompt: 'Hangisi doğrudur?',
        choices: ['Tüm asal sayılar tektir.', '2 dışındaki tüm asal sayılar tektir.', '1 en küçük asal sayıdır.', 'İki asal sayının toplamı her zaman asaldır.'],
        answer: 1,
        feedback: ['2 hem çift hem asal.', null, '1’in yalnızca bir böleni var; asal sayıların tam iki böleni olmalı.', '3 + 5 = 8 asal değil.'],
      },
      {
        prompt: 'Bir sayının asal çarpanları 2, 3 ve 5’tir. Bu sayı için hangisi kesinlikle doğrudur?',
        choices: ['30’a tam bölünür.', 'Tek sayıdır.', 'Asal sayıdır.', '100’den küçüktür.'],
        answer: 0,
        feedback: [null, '2 çarpanı olduğu için çifttir.', 'Asal bir sayının asal çarpanı yalnızca kendisidir.', '60, 90, 120 gibi büyük sayıların da asal çarpanları 2, 3 ve 5’tir.'],
      },
      {
        prompt: 'Selin 48’i asal çarpanlarına 2 · 4 · 6 diye ayırdı. Bu çalışma için ne söylenebilir?',
        choices: ['Doğrudur; çarpım 48’dir.', 'Eksiktir; 4 ve 6 asal değil, ayırmaya devam etmeli: 2 · 2 · 2 · 2 · 3.', 'Yanlıştır; 48’in asal çarpanı yoktur.', 'Yanlıştır; 48 = 2 · 24 diye bırakılmalıdır.'],
        answer: 1,
        feedback: ['Çarpım doğru ama 4 ve 6 asal değil; ağaç bitmedi.', null, '1’den büyük her doğal sayı ya asaldır ya da asal sayıların çarpımıdır.', '24 asal olmadığı için orada da durulmaz.'],
      },
      {
        prompt: '1’den büyük her doğal sayı için hangisi doğrudur?',
        choices: ['Ya asaldır ya da asal sayıların çarpımı olarak yazılabilir.', 'Ya çifttir ya da asaldır.', 'En az üç böleni vardır.', 'Asal çarpanları birbirinden farklıdır.'],
        answer: 0,
        feedback: [null, '9, 15, 21 tek ama asal değil.', 'Asal sayıların yalnızca iki böleni var.', '12 = 2 · 2 · 3: 2 iki kez tekrar ediyor.'],
      },
      {
        prompt: 'Ezgi 100’e kadar asal sayıları bulmak için kalbur yapıyor: 2’nin, 3’ün, 5’in ve 7’nin katlarını (kendileri hariç) eledi. 11’in katlarını ayrıca elemesine neden gerek yok?',
        choices: ['11’in 100’den küçük katları (22, 33, ..., 99) zaten 2, 3, 5 ya da 7’nin katı olarak elendi.', '11 asal olmadığı için.', '11’in katı olmadığı için.', '11 iki basamaklı olduğu için.'],
        answer: 0,
        feedback: [null, '11 asaldır; yalnızca 1 ve 11’e bölünür.', '22, 33, 44 11’in katlarıdır.', '13 de iki basamaklı; mesele basamak sayısı değil.'],
      },
      {
        prompt: 'Asal çarpanlarına ayrılmış hâli 2 · 2 · 3 · 7 olan sayının çarpanlarından biri hangisi DEĞİLDİR?',
        choices: ['12', '14', '21', '9'],
        answer: 3,
        explain: 'Sayı 84’tür. 9 = 3 · 3 için iki tane 3 gerekir; çarpımda yalnızca bir tane 3 var.',
        feedback: ['2 · 2 · 3 = 12; çarpımda var.', '2 · 7 = 14; çarpımda var.', '3 · 7 = 21; çarpımda var.', null],
      },
    ],
  },

  // MAT.6.1.4
  {
    id: 'g6-ortak-kat-sayi-dogrusu',
    outcomes: ['MAT.6.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sıçrayan kurbağalar',
    instructions: 'İki kurbağanın sıçramalarını sayı doğrusunda zihninde ilerlet; ikisinin de bastığı ilk sayıyı işaretle.',
    level: 1,
    launch: {
      text: 'İki kurbağa 0’dan yola çıkıyor: biri 4’er, diğeri 6’şar birim sıçrıyor. Aynı taşa basacakları yerler var mı?',
      visual: { kind: 'numberline', min: 0, max: 24, step: 2, jumps: [0, 4, 8, 12] },
    },
    reflect: 'İki kurbağanın ilk buluştuğu sayıdan sonraki buluşma yerlerini nasıl tahmin edersin? Ortak katlar hakkında ne fark ettin?',
    tool: 'numberline',
    config: { min: 0, max: 40, step: 2 },
    tasks: [
      { prompt: '4’er ve 6’şar sıçrayan kurbağaların ikisinin de bastığı ilk sayıyı (0 hariç) işaretle.', target: { value: 12 }, hints: ['4’er sıçrayan kurbağa hangi sayılara basar: 4, 8, 12, ...?', '6’şar sıçrayan: 6, 12, ...? İki listede ortak olan ilk sayı hangisi?'], explain: '4’ün ve 6’nın katları 12’de buluşur; sonra 24’te, 36’da... Bunlar 4 ile 6’nın ortak katlarıdır.' },
      { prompt: '4’er ve 10’ar sıçrayan iki kurbağanın ilk buluştuğu sayıyı işaretle.', target: { value: 20 }, explain: '4, 8, 12, 16, 20 ve 10, 20: ilk ortak kat 20.' },
      { prompt: '6’şar ve 8’er sıçrayan iki kurbağanın ilk buluştuğu sayıyı işaretle.', target: { value: 24 }, hints: ['8’in katlarını yaz: 8, 16, 24, ... Bunlardan hangisi 6’nın da katı?'], explain: '6 × 4 = 24 ve 8 × 3 = 24.' },
      { prompt: '10’ar ve 15’er sıçrayan iki kurbağanın ilk buluştuğu sayıyı işaretle.', target: { value: 30 }, explain: '10 × 3 = 30 ve 15 × 2 = 30.' },
    ],
  },
  {
    id: 'g6-ortak-bolen-model',
    outcomes: ['MAT.6.1.4'],
    type: 'fill',
    stage: 'model',
    title: 'Şeritlerle ve tablolarla ortak bölen, ortak kat',
    instructions: 'Şerit modellerini ve tabloları incele; boşlukları doldur.',
    level: 2,
    launch: {
      text: 'Bir terzinin 12 m kırmızı ve 18 m mavi kurdelesi var. İkisini de hiç artmayacak biçimde, aynı uzunlukta parçalara kesmek istiyor. Parçalar kaç metre olabilir?',
      visual: { kind: 'tape', parts: [{ label: '12 m', value: 12 }], compare: [{ label: '18 m', value: 18 }] },
    },
    reflect: '12 m ve 18 m’lik kurdeleler için 1, 2, 3 ve 6 m’lik parçalar işe yarıyor. 4 m neden işe yaramıyor? Şeritle göster.',
    items: [
      { text: 'Üstte 12 m, altta 18 m’lik kurdele aynı uzunlukta parçalara kesildi. Her parça __ m', answers: ['3'], visual: { kind: 'tape', parts: Array.from({ length: 4 }, () => ({ label: '3', value: 3 })), compare: Array.from({ length: 6 }, () => ({ label: '3', value: 3 })) }, hints: ['Üstteki 12 m kaç eş parçaya bölünmüş?'] },
      { text: 'Bu durumda 12 m’lik kurdeleden 4, 18 m’lik kurdeleden __ parça çıkar.', answers: ['6'], visual: { kind: 'tape', parts: Array.from({ length: 4 }, () => ({ label: '3', value: 3 })), compare: Array.from({ length: 6 }, () => ({ label: '3', value: 3 })) } },
      { text: 'Kurdeleler 6’şar metrelik parçalara da kesilebiliyor. 6 sayısı 12 ile 18’in ortak __', answers: ['böleni'], choices: ['böleni', 'katı'], visual: { kind: 'tape', parts: [{ label: '6', value: 6 }, { label: '6', value: 6 }], compare: [{ label: '6', value: 6 }, { label: '6', value: 6 }, { label: '6', value: 6 }] } },
      { text: 'İki satırda da bulunan sayılar 4 ile 6’nın ortak katlarıdır. İki satırda da bulunan ilk sayı __', answers: ['12'], visual: { kind: 'table', headers: ['4’ün katları', '4', '8', '12', '16', '20', '24'], rows: [['6’nın katları', 6, 12, 18, 24, 30, 36]] }, hints: ['Üst satırdaki sayılardan hangisi alt satırda da var?'] },
      { text: 'Aynı tabloda görünen ikinci ortak kat __', answers: ['24'], visual: { kind: 'table', headers: ['4’ün katları', '4', '8', '12', '16', '20', '24'], rows: [['6’nın katları', 6, 12, 18, 24, 30, 36]] } },
      { text: '16 ile 24’ün ortak bölenleri 1, 2, 4 ve __', answers: ['8'], visual: { kind: 'table', headers: ['Sayı', 'Bölenleri'], rows: [['16', '1, 2, 4, 8, 16'], ['24', '1, 2, 3, 4, 6, 8, 12, 24']] } },
      { text: '9 ile 10’un ortak bölenlerinin sayısı __', answers: ['1'], hints: ['9’un bölenlerini ve 10’un bölenlerini ayrı ayrı listele.'], explain: 'Yalnızca 1 ortak bölendir. Ortak böleni yalnızca 1 olan sayılara aralarında asal sayılar denir.' },
    ],
  },
  {
    id: 'g6-ortak-bolen-ortak-kat-grupla',
    outcomes: ['MAT.6.1.4'],
    type: 'categorize',
    stage: 'sembol',
    title: '12 ve 18 için grupla',
    instructions: 'Her sayı 12 ile 18’in ortak böleni mi, ortak katı mı, yoksa hiçbiri mi? Doğru gruba taşı.',
    level: 2,
    launch: { text: 'Bir otobüs 12, diğeri 18 dakikada bir kalkıyor. Ayrıca 12 kek ve 18 kurabiye eşit tabaklara bölünecek. Aynı iki sayı iki farklı soruya yol açıyor!' },
    reflect: 'Ortak bölenler neden hep küçük, ortak katlar neden hep büyük sayılar çıktı? 12 ve 18’i kullanarak açıkla.',
    categories: [
      { id: 'bolen', label: 'Ortak bölen', color: '#3b82f6' },
      { id: 'kat', label: 'Ortak kat', color: '#22c55e' },
      { id: 'hicbiri', label: 'Hiçbiri', color: '#ef4444' },
    ],
    items: [
      { content: '1', category: 'bolen', explain: '1 her doğal sayıyı böler.' },
      { content: '2', category: 'bolen', explain: '12 = 2 · 6 ve 18 = 2 · 9' },
      { content: '3', category: 'bolen', explain: '12 = 3 · 4 ve 18 = 3 · 6' },
      { content: '6', category: 'bolen', explain: '12 = 6 · 2 ve 18 = 6 · 3' },
      { content: '36', category: 'kat', explain: '36 = 12 · 3 = 18 · 2' },
      { content: '72', category: 'kat', explain: '72 = 12 · 6 = 18 · 4' },
      { content: '108', category: 'kat', explain: '108 = 12 · 9 = 18 · 6' },
      { content: '4', category: 'hicbiri', explain: '4, 12’yi böler ama 18’i bölmez.' },
      { content: '9', category: 'hicbiri', explain: '9, 18’i böler ama 12’yi bölmez.' },
      { content: '24', category: 'hicbiri', explain: '24, 12’nin katı ama 18’in katı değil.' },
    ],
  },
  {
    id: 'g6-ortak-bolen-ortak-kat-problemleri',
    outcomes: ['MAT.6.1.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ortak bölen mi, ortak kat mı?',
    instructions: 'Problemi oku: eşit parçalara mı ayırıyoruz, yoksa tekrar eden olaylar mı buluşuyor? Listeleyerek çöz.',
    level: 2,
    launch: { text: 'Barınaktaki hayvanlar için toplanan mamalar eşit paketlere ayrılacak; trafik ışıkları aynı anda yanacak. Bu problemlerin hangisinde bölenlere, hangisinde katlara bakmalıyız?' },
    reflect: 'Bir problemde ortak bölene mi ortak kata mı ihtiyaç olduğunu nasıl anlıyorsun? İpucu olan kelimeleri bir arkadaşınla listeleyin.',
    questions: [
      {
        prompt: 'Elif’in 12 kırmızı ve 18 sarı lalesi var. Laleleri, her demette aynı sayıda kırmızı ve aynı sayıda sarı lale olacak ve hiç lale artmayacak biçimde demetlere ayıracak. En çok kaç demet yapabilir?',
        choices: ['3', '6', '12', '36'],
        answer: 1,
        explain: '12 ve 18’in ortak bölenleri 1, 2, 3 ve 6’dır. En çok 6 demet yapılır.',
        feedback: ['3 demet de olur ama daha fazla demet yapabilir misin?', null, '12 demet olursa 18 sarı lale 12 demete eşit bölünemez.', '36, 12 ile 18’in ortak katı; demet sayısı bu sayıları bölmeli.'],
      },
      {
        prompt: 'Barınağa bağışlanan 24 kutu kedi maması ve 36 kutu köpek maması, her pakette tek tür mama olacak ve tüm paketlerde eşit sayıda kutu bulunacak biçimde hiç artmadan paketlenecek. Bir pakette en fazla kaç kutu olabilir?',
        choices: ['6', '24', '72', '12'],
        answer: 3,
        explain: '24 ve 36’nın ortak bölenleri 1, 2, 3, 4, 6, 12’dir. En büyüğü 12’dir.',
        feedback: ['6 kutuluk paketler olur ama daha büyük paket yapılabilir mi?', '24 kutuluk paketlerle 36 kutu hiç artmadan paketlenemez.', '72 bir ortak kat; paketteki kutu sayısı 24’ü ve 36’yı bölmeli.', null],
      },
      {
        prompt: 'İki trafik lambasından biri 40 saniyede, diğeri 60 saniyede bir yeşil yanıyor. İkisi aynı anda yeşil yandıktan en az kaç saniye sonra yeniden birlikte yeşil yanarlar?',
        choices: ['100', '240', '120', '20'],
        answer: 2,
        explain: '40’ın katları: 40, 80, 120, ... 60’ın katları: 60, 120, ... İlk ortak kat 120’dir.',
        feedback: ['100 = 40 + 60; ama 100, 40’ın katı değil.', '240 de bir ortak kat ama daha önce buluşurlar.', null, '20, 40 ile 60’ın ortak böleni. Burada zaman ilerliyor; katlara bakmalısın.'],
      },
      {
        prompt: 'Mehmet merdiveni 3’er 3’er, Can 4’er 4’er çıkıyor. 30 basamaklı merdivende ikisinin de bastığı basamaklar hangileridir?',
        choices: ['3, 6 ve 9', '12 ve 24', '4, 8 ve 12', '7, 14 ve 21'],
        answer: 1,
        explain: '30’a kadar 3’ün ve 4’ün ortak katları 12 ve 24’tür.',
        feedback: ['Bu basamaklara yalnızca Mehmet basar.', null, '4 ve 8’e yalnızca Can basar.', '3 + 4 = 7; ama ikisi de 7’ye basmaz.'],
      },
      {
        prompt: '90 m ve 120 m uzunluğundaki iki sıra boyunca eşit aralıklarla fidan dikilecek. İki sırada aralıklar aynı ve metre cinsinden doğal sayı olacak; sıraların başına ve sonuna da fidan dikilecek. Aralık uzunluğu hangisi OLAMAZ?',
        choices: ['15 m', '30 m', '10 m', '20 m'],
        answer: 3,
        explain: '20, 90’ın böleni değildir. Aralık, 90 ve 120’nin ortak böleni olmalıdır.',
        feedback: ['15 hem 90’ı hem 120’yi böler.', '30 hem 90’ı hem 120’yi böler.', '10 hem 90’ı hem 120’yi böler.', null],
      },
      {
        prompt: 'Bir otobüs 20 dakikada, bir minibüs 15 dakikada bir duraktan kalkıyor. Saat 07.00’de birlikte kalktıklarına göre bir sonraki birlikte kalkış saati kaçtır?',
        choices: ['08.00', '07.35', '07.45', '08.20'],
        answer: 0,
        explain: '20 ve 15’in ilk ortak katı 60’tır; 60 dakika sonra saat 08.00 olur.',
        feedback: [null, '35 dakika = 20 + 15; ama 35 ne 20’nin ne 15’in katı.', '45, 15’in katı ama 20’nin katı değil.', '80 dakika 20’nin katı ama 15’in katı değil; üstelik daha önce buluşurlar.'],
      },
    ],
  },
  {
    id: 'g6-sayilar-hangisi-farkli',
    outcomes: ['MAT.6.1.4'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Sayıların özellikleri',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['12', '18', '25', '30'],
        answer: 0,
        reasons: ['4’e tam bölünen tek sayı.', '9’a tam bölünen tek sayı.', 'Tek sayı olan tek sayı; 2’ye bölünmez.', '10’a tam bölünen tek sayı.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['2', '11', '21', '29'],
        answer: 0,
        reasons: ['Çift olan tek sayı; çift olan tek asal sayıdır.', 'İki rakamı aynı olan tek sayı.', 'Asal olmayan tek sayı: 21 = 3 · 7.', 'Rakamları toplamı iki basamaklı (11) olan tek sayı.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['12 = 3 · 4', '12 = 2 · 6', '12 = 1 · 12', '12 = 2 · 2 · 3'],
        answer: 0,
        reasons: ['Kareye en yakın dikdörtgeni anlatır: kenarlar arasındaki fark yalnızca 1.', 'İki çarpanı da çift olan tek gösterim.', 'Çarpanlardan biri 1 olan tek gösterim; tek sıralı dikdörtgen.', 'Üç çarpanlı ve tüm çarpanları asal olan tek gösterim.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['4 ve 9', '6 ve 8', '5 ve 7', '10 ve 15'],
        answer: 0,
        reasons: ['Aralarında asal olup ikisi de asal olmayan tek ikili.', 'Ortak böleni 2 olan, ikisi de çift olan tek ikili.', 'İkisi de asal olan tek ikili.', 'İkisi de 5’in katı olan tek ikili.'],
      },
    ],
  },

  // ── Veriden Olasılığa ───────────────────────────────────────────────────

  // MAT.6.6.1
  {
    id: 'g6-zar-deneyi',
    outcomes: ['MAT.6.6.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Zar atma deneyi',
    instructions: 'Zarı istediğin kadar at; sonuçları tablodan izle ve soruyu deney verisine dayanarak cevapla.',
    level: 1,
    launch: { text: 'Bir kutu oyununda 6 atan oyuncu başlıyor. Ece “Ben hiç 6 atamıyorum, bu zar bozuk!” diyor. Bunu nasıl test edebiliriz?', visual: { kind: 'dice', value: 6 } },
    reflect: 'Göreli sıklığa bakarak bir olayın olasılığını tahmin ederken neden çok sayıda deneme yapmak gerekir?',
    tool: 'probability',
    config: { mode: 'dice' },
    tasks: [
      {
        prompt: 'Önce tahmin et: 30 atışta kaç kez 6 gelir? Şimdi zarı 30 kez at ve tablodaki “Oran” satırına bak.',
        target: { question: 'Bir sayının göreli sıklığı nasıl hesaplanır?', choices: ['Gelme sayısı ÷ toplam atış sayısı', 'Toplam atış sayısı ÷ 6', 'Gelme sayısı × 6', 'Toplam atış sayısı − gelme sayısı'], answer: 'Gelme sayısı ÷ toplam atış sayısı' },
        explain: 'Örneğin 30 atışta 6 kez 6 geldiyse 6’nın göreli sıklığı [[6/30]] = 0,2’dir.',
      },
      {
        prompt: 'Şimdi atış sayısını en az 200’e çıkar ve 6’nın oranını izle.',
        target: { question: 'Atış sayısı arttıkça 6 gelmesinin göreli sıklığı hangi değere yaklaşır?', choices: ['0,05 civarı', '0,17 civarı', '0,5 civarı', '0,83 civarı'], answer: '0,17 civarı' },
        hints: ['Zarın kaç yüzü var? Hepsinin gelme şansı aynı mı?'],
        explain: 'Altı yüzün şansı eşit olduğundan çok sayıda atışta her yüz yaklaşık altıda bir (≈ 0,17) oranında gelir.',
      },
      {
        prompt: 'Bir arkadaşın da 200 atış yapsaydı onunla senin sonuçların tıpatıp aynı olur muydu?',
        target: { question: 'Aynı deneyi tekrarlayan iki kişinin sonuçları için ne söylenebilir?', choices: ['Her zaman tıpatıp aynı olur.', 'Biraz farklı olabilir ama göreli sıklıklar birbirine yakın çıkar.', 'Tamamen farklı ve ilgisiz çıkar.'], answer: 'Biraz farklı olabilir ama göreli sıklıklar birbirine yakın çıkar.' },
        explain: 'Deney sonuçları rastgeledir; küçük farklar olur. Deneme sayısı arttıkça göreli sıklıklar birbirine yaklaşır.',
      },
      {
        prompt: 'Ece’nin zarı 12 atışta hiç 6 göstermedi.',
        target: { question: 'Zarın bozuk olduğu kesin midir?', choices: ['Evet, kesindir.', 'Hayır; 12 atış az, karar için çok daha fazla atış gerekir.', 'Evet, 6 hiç gelmeyecek demektir.'], answer: 'Hayır; 12 atış az, karar için çok daha fazla atış gerekir.' },
      },
    ],
  },
  {
    id: 'g6-torba-deneyi',
    outcomes: ['MAT.6.6.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Torbadan top çekme',
    instructions: 'Torbada 5 yeşil ve 3 mor top var. Her seferinde çekilen top torbaya geri konuyor. Deney yap ve soruları cevapla.',
    level: 2,
    launch: {
      text: 'Bir torbada 5 yeşil ve 3 mor top var; çekilen top geri konuyor. Önce tahmin et: 40 çekilişte yaklaşık kaç yeşil top gelir?',
      visual: { kind: 'emojiGroups', groups: [{ emoji: '🟢', count: 5 }, { emoji: '🟣', count: 3 }] },
    },
    reflect: 'Torbanın içini görmeseydin, yalnızca çok sayıda çekilişin sonucuna bakarak torbada hangi renkten daha çok top olduğunu tahmin edebilir miydin? Nasıl?',
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Yeşil', color: '#22c55e', weight: 5 }, { label: 'Mor', color: '#a855f7', weight: 3 }] },
    tasks: [
      { prompt: 'Torbadan 100 kez top çek.', target: { question: 'Hangi rengin göreli sıklığı daha büyük çıkar?', choices: ['Yeşil', 'Mor', 'Eşit olur'], answer: 'Yeşil' }, explain: 'Torbada yeşil top daha çok olduğu için yeşil daha sık gelir.' },
      { prompt: 'Çekiliş sayısını 200’e ya da daha fazlasına çıkar.', target: { question: 'Yeşil top çekmenin göreli sıklığı yaklaşık kaçtır?', choices: ['0,2', '0,4', '0,6', '0,9'], answer: '0,6' }, explain: '8 topun 5’i yeşil: [[5/8]] = 0,625. Çok sayıda çekilişte göreli sıklık bu değere yaklaşır.' },
      { prompt: 'Ayşe yalnızca 4 kez çekti ve 3 kez mor geldi.', target: { question: 'Buna göre mor top çekme olasılığının [[3/4]] olduğu söylenebilir mi?', choices: ['Evet, kesindir.', 'Hayır, deneme sayısı çok az.', 'Mor hiç gelmemeliydi.'], answer: 'Hayır, deneme sayısı çok az.' } },
    ],
  },
  {
    id: 'g6-cetele-goreli-siklik',
    outcomes: ['MAT.6.6.1'],
    type: 'fill',
    stage: 'model',
    title: 'Çeteleden olasılığa',
    instructions: 'Tabloyu ya da grafiği incele; göreli sıklığı kesir, ondalık ya da yüzde olarak yaz.',
    level: 2,
    launch: {
      text: 'Deney yaparken sonuçları çetele tablosuna ya da grafiğe kaydederiz. Peki bu kayıtları “olasılık” diliyle nasıl söyleriz?',
      visual: { kind: 'table', headers: ['Sonuç', 'Çetele', 'Sayı'], rows: [['Yazı', '||||| ||||| ||||', 14], ['Tura', '||||| ||||| |', 11]] },
    },
    reflect: '“20’de 6”, [[6/20]], 0,3 ve %30 aynı şeyi mi söylüyor? Hangisini kullanmak sana daha kolay geliyor, neden?',
    items: [
      { text: 'Can parayı 25 kez attı. Tura gelme göreli sıklığı [[11/25]] = __', answers: ['0,44'], visual: { kind: 'table', headers: ['Sonuç', 'Çetele', 'Sayı'], rows: [['Yazı', '||||| ||||| ||||', 14], ['Tura', '||||| ||||| |', 11]] }, hints: ['Tura kaç kez geldi, toplam kaç atış yapıldı?', '[[11/25]] kesrini paydası 100 olan bir kesre genişletebilir misin?'] },
      { text: 'Yeşilin göreli sıklığı __', answers: ['0,2'], visual: { kind: 'bars', data: [{ label: 'Kırmızı', value: 22 }, { label: 'Mavi', value: 18 }, { label: 'Yeşil', value: 10 }], title: 'Çark 50 kez çevrildi', unit: 'kez' }, hints: ['Yeşil 50 çevirmede kaç kez geldi?', '[[10/50]] kesrini sadeleştir.'] },
      { text: 'Aynı deneyde kırmızının göreli sıklığı yüzde olarak %__', answers: ['44'], visual: { kind: 'bars', data: [{ label: 'Kırmızı', value: 22 }, { label: 'Mavi', value: 18 }, { label: 'Yeşil', value: 10 }], title: 'Çark 50 kez çevrildi', unit: 'kez' }, hints: ['[[22/50]] = [[?/100]]'] },
      { text: '“20’de 6” ifadesi bir kesirdir: [[6/20]] = [[3/__]]', answers: ['10'] },
      { text: 'Zar 60 kez atıldı. 5 gelmesinin göreli sıklığı __', answers: ['0,2'], visual: { kind: 'table', headers: ['Yüz', '1', '2', '3', '4', '5', '6'], rows: [['Gelme sayısı', 9, 11, 10, 8, 12, 10]] }, hints: ['5 kaç kez gelmiş?', '[[12/60]] kesrini sadeleştir.'] },
      { text: 'Aynı tabloda tüm yüzlerin göreli sıklıklarının toplamı __', answers: ['1'], visual: { kind: 'table', headers: ['Yüz', '1', '2', '3', '4', '5', '6'], rows: [['Gelme sayısı', 9, 11, 10, 8, 12, 10]] }, hints: ['9 + 11 + 10 + 8 + 12 + 10 = ?', 'Toplam gelme sayısını toplam atış sayısına bölersen ne çıkar?'] },
      { text: 'Bir para 200 kez atıldı ve tura gelme göreli sıklığı 0,52 bulundu. Tura __ kez gelmiştir.', answers: ['104'], hints: ['0,52 = %52. 100 atışta 52 kez ise 200 atışta kaç kez?'] },
    ],
  },
  {
    id: 'g6-deney-verisini-yorumla',
    outcomes: ['MAT.6.6.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Deney verisini yorumla',
    instructions: 'Deney sonuçlarını incele ve deneysel olasılıkla ilgili kararları değerlendir.',
    level: 2,
    launch: { text: 'Gazetede “Bir futbolcu son 20 penaltının 16’sını gole çevirdi.” yazıyor. Bu futbolcunun bir sonraki penaltıyı gole çevirme olasılığını nasıl tahmin ederiz?' },
    reflect: 'Deneysel olasılıkla yapılan bir tahmin ne zaman güvenilir, ne zaman güvenilmez? Bir örnek ver.',
    questions: [
      {
        prompt: { text: 'Ece bir çarkı 50 kez çevirdi. Hangi rengin deneysel olasılığı en büyüktür?', visual: { kind: 'table', headers: ['Renk', 'Kırmızı', 'Mavi', 'Yeşil'], rows: [['Gelme sayısı', 22, 18, 10]] } },
        choices: ['Kırmızı', 'Mavi', 'Yeşil'],
        answer: 0,
        feedback: [null, 'Mavi 18 kez geldi; daha sık gelen bir renk var mı?', 'Yeşil en az gelen renk.'],
      },
      {
        prompt: 'Hangisi bir deneyden elde edilen göreli sıklık OLAMAZ?',
        choices: ['0', '0,35', '1', '1,2'],
        answer: 3,
        explain: 'Göreli sıklık 0 ile 1 arasındadır; olayın gerçekleşme sayısı deneme sayısından büyük olamaz.',
        feedback: ['Olay hiç gerçekleşmediyse göreli sıklık 0 olur.', '0 ile 1 arasında; olabilir.', 'Olay her denemede gerçekleştiyse göreli sıklık 1 olur.', null],
      },
      {
        prompt: 'Can bir parayı 10 kez attı, 7 kez yazı geldi. Zeynep 1.000 kez attı, 508 kez yazı geldi. Yazı gelme olasılığını hangisinin sonucu daha iyi tahmin eder?',
        choices: ['Can’ın, çünkü daha az deneme yaptı', 'Zeynep’in, çünkü deneme sayısı çok daha fazla', 'İkisi de aynı derecede iyi tahmin eder'],
        answer: 1,
        feedback: ['Az denemede şans payı büyüktür; 10’da 7 tesadüf olabilir.', null, 'Deneme sayısı arttıkça göreli sıklık daha kararlı hâle gelir.'],
      },
      {
        prompt: 'Bir zar 60 kez atıldığında yaklaşık kaç kez 4 gelmesi beklenir?',
        choices: ['6', '20', '10', '30'],
        answer: 2,
        explain: 'Her yüzün gelme şansı eşittir; 60 atışın yaklaşık altıda biri: 60 ÷ 6 = 10.',
        feedback: ['6 zarın yüz sayısı; 60 atışın altıda biri kaç?', '20, 60’ın üçte biri; zarın 6 yüzü var.', null, '30, 60’ın yarısı; bu bir para atışında beklenirdi.'],
      },
      {
        prompt: 'Deniz 20 kez zar attı ve hiç 3 gelmedi. Deniz “Bu zarda 3 gelme olasılığı 0’dır.” dedi. Hangisi doğrudur?',
        choices: ['Deniz haklıdır; deney bunu gösterdi.', '20 atış azdır; daha çok atışta 3 de gelir, olasılık 0 değildir.', 'Zar kesinlikle hilelidir.', '3 gelmesi imkânsızdır.'],
        answer: 1,
        feedback: ['20 atışta 3 gelmemesi şans eseri olabilir; deneme sayısını artırmalı.', null, 'Bunu söylemek için çok daha fazla veri gerekir.', 'Zarın bir yüzünde 3 yazıyorsa 3 gelmesi imkânsız değildir.'],
      },
      {
        prompt: 'Sınıftaki 30 öğrenciden 12’sinin kan grubu A. Bu veriye göre rastgele seçilen bir öğrencinin kan grubunun A olma olasılığını en iyi hangisi tahmin eder?',
        choices: ['0,4', '0,12', '0,3', '12'],
        answer: 0,
        explain: '[[12/30]] = [[4/10]] = 0,4',
        feedback: [null, '12 gözlem sayısı; toplam öğrenci sayısına bölmelisin.', '30 toplam öğrenci sayısı; 12’nin 30’a oranı ne?', 'Olasılık 1’den büyük olamaz; bir oran yazmalısın.'],
      },
    ],
  },
  {
    id: 'g6-olasilik-hangisi-farkli',
    outcomes: ['MAT.6.6.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Deneyler ve olasılıklar',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['[[1/4]]', '0,25', '%25', '[[1/5]]'],
        answer: 0,
        reasons: ['Paydası 4 olan tek kesir.', 'Ondalık gösterimle yazılmış tek değer.', 'Yüzde ile yazılmış tek değer.', 'Değeri (0,2) diğerlerinden farklı olan tek seçenek.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['Para 10 kez atıldı, 6 kez yazı geldi.', 'Para 100 kez atıldı, 48 kez yazı geldi.', 'Zar 60 kez atıldı, 10 kez 6 geldi.', 'Zar 30 kez atıldı, 9 kez 6 geldi.'],
        answer: 0,
        reasons: ['Göreli sıklığı (0,6) yarımdan büyük olan tek deney.', 'Deneme sayısı en çok olan, bu yüzden sonucu en güvenilir deney.', '6’nın gelme sayısı tam olarak atış sayısının altıda biri olan tek deney.', 'Göreli sıklığı (0,3) beklenen değerden (yaklaşık 0,17) en çok uzaklaşan zar deneyi.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['0', '0,5', '1', '1,5'],
        answer: 0,
        reasons: ['Hiç gerçekleşmeyen (imkânsız) bir olayın değeri.', '“Yarı yarıya” şansı anlatan tek değer.', 'Her denemede gerçekleşen (kesin) bir olayın değeri.', 'Göreli sıklık ya da olasılık olamayacak tek değer; 1’den büyük.'],
      },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ───────────────────────────────────────────

  // MAT.6.1.5
  {
    id: 'g6-ondalik-bloklar',
    outcomes: ['MAT.6.1.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Bloklarla ondalık gösterim',
    instructions: 'Bu etkinlikte yüzlük kare 1 bütün; onluk çubuk 0,1 (onda bir); birlik küp 0,01 (yüzde bir). İstenen sayıyı bloklarla oluştur.',
    level: 1,
    launch: {
      text: 'Bir terzi 1 metreyi bütün olarak düşünüyor: metrenin onda biri 1 desimetre, yüzde biri 1 santimetre. Bloklarla da aynısını yapabiliriz: büyük kareyi 1 bütün sayalım!',
      visual: { kind: 'blocks', hundreds: 1, tens: 3, ones: 5 },
    },
    reflect: 'Bir onluk çubuk neden 0,1’i gösteriyor? 10 tane onluk çubuk yan yana gelince ne oluşur?',
    tool: 'base10',
    tasks: [
      { prompt: '1,35’i oluştur.', target: { value: 135 }, hints: ['1 bütün için hangi bloğu kullanmalısın?', '0,35 kaç onda bir ve kaç yüzde birden oluşur?'], explain: '1,35 = 1 + [[3/10]] + [[5/100]]: 1 yüzlük kare, 3 onluk çubuk, 5 birlik küp.' },
      { prompt: '0,7’yi oluştur.', target: { value: 70 }, hints: ['0,7 kaç onda birdir?'], explain: '0,7 = [[7/10]]: 7 onluk çubuk. Aynı miktarı 70 birlik küple de gösterebilirdin: [[7/10]] = [[70/100]].' },
      { prompt: '2,06’yı oluştur.', target: { value: 206 }, hints: ['0,06’da hiç onda bir var mı?'], explain: '2,06 = 2 + [[6/100]]: onda birler basamağında 0 var, hiç onluk çubuk yok.' },
      { prompt: '0,45’i oluştur.', target: { value: 45 }, explain: '0,45 = [[4/10]] + [[5/100]] = [[45/100]]' },
      { prompt: 'Bir bütünün onda biri ile yüzde birinin toplamını oluştur.', target: { value: 11 }, explain: '[[1/10]] + [[1/100]] = 0,11' },
    ],
  },
  {
    id: 'g6-ondalik-sayi-dogrusu',
    outcomes: ['MAT.6.1.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusunda ondalıklar',
    instructions: '2 ile 3 arası 10 eş parçaya bölünmüştür; her çentik 0,1 artar. İstenen sayıyı işaretle.',
    level: 2,
    launch: { text: 'Uzun atlamada Elif 2,7 m atladı. Ölçü bandında 2 ile 3 metre arası 10 eş parçaya bölünmüş. Elif’in düştüğü yer nerede?' },
    reflect: '2,96’yı onda birlere yuvarlarken neden 2,9 değil de 3 dedik? Sayı doğrusunda göster.',
    tool: 'numberline',
    config: { min: 2, max: 3, step: 0.1 },
    tasks: [
      { prompt: '2,7 sayısını işaretle.', target: { value: 2.7 }, explain: '2,7 = 2 + [[7/10]]: 2’den sonra 7 çentik.' },
      { prompt: '2 + [[4/10]] toplamına eşit olan sayıyı işaretle.', target: { value: 2.4 } },
      { prompt: '2,5’ten 0,3 fazla olan sayıyı işaretle.', target: { value: 2.8 }, hints: ['2,5’ten başlayıp kaç çentik ilerlemelisin?'] },
      { prompt: 'Bir kumaş 2,96 m uzunluğunda. Bu uzunluğu onda birler basamağına yuvarla ve işaretle.', target: { value: 3 }, hints: ['2,96 hangi iki çentiğin arasında: 2,9 ile 3 mü?', 'Hangisine daha yakın?'], explain: '2,96, 2,9’dan 0,06; 3’ten 0,04 uzakta. 3’e daha yakın.' },
    ],
  },
  {
    id: 'g6-onluk-kareli-kagit',
    outcomes: ['MAT.6.1.5'],
    type: 'fill',
    stage: 'model',
    title: 'Yüzlük karede ondalıklar',
    instructions: 'Yüzlük karede bütün 100 küçük kareden oluşur. Boyalı kısmı ve basamak değerlerini düşünerek boşlukları doldur.',
    level: 1,
    launch: { text: 'Bir çikolata 100 eş kareden oluşuyor. Can 37 kare yedi. Can çikolatanın ne kadarını yedi? Bunu kesirle ve ondalık gösterimle nasıl yazarsın?', visual: hundredGrid(37) },
    reflect: '0,6 ile 0,60 aynı büyüklük mü? Yüzlük karede göstererek bir arkadaşını ikna et.',
    items: [
      { text: 'Boyalı kısım: [[37/100]] = __', answers: ['0,37'], visual: hundredGrid(37), hints: ['Kaç küçük kare boyalı? Bütün kaç küçük kareden oluşuyor?'] },
      { text: 'Boyalı kısımda __ tam sütun var. Her sütun 0,1 olduğuna göre boyalı kısım 0,6 = 0,60’tır.', answers: ['6'], visual: hundredGrid(60) },
      { text: 'Boyalı kısım __', answers: ['0,05'], visual: hundredGrid(5), hints: ['Bir sütunun tamamı bile boyalı değil. Kaç küçük kare boyalı?'], explain: '5 küçük kare = [[5/100]] = 0,05. 0,5 yazsaydık karenin yarısı boyalı olurdu.' },
      { text: 'Boyalı kısım 0,25. 0,3’ü göstermek için __ küçük kare boyamak gerekir.', answers: ['30'], visual: hundredGrid(25), hints: ['0,3 kaç onda birdir? Her onda bir kaç küçük kare eder?'], explain: '0,3 = 30 küçük kare, 0,25 = 25 küçük kare. Basamak sayısı çok olan sayı daha büyük olmak zorunda değil.' },
      { text: '4,728 sayısında 2 rakamının basamak değeri __', answers: ['0,02'], hints: ['2 hangi basamakta: onda birler mi, yüzde birler mi?'] },
      { text: '0,6 = [[6/10]] = [[__/100]]', answers: ['60'], hints: ['Her onda bir kaç yüzde bir eder?'] },
      { text: 'Elif’in boyu 1,48 m. Bu sayı 1 bütün, 4 onda bir ve __ yüzde birden oluşur.', answers: ['8'] },
    ],
  },
  {
    id: 'g6-ondalik-kesir-toplami',
    outcomes: ['MAT.6.1.5'],
    type: 'match',
    stage: 'sembol',
    title: 'Ondalık gösterimi çözümle',
    instructions: 'Her ondalık gösterimi, paydası 10, 100 ve 1000 olan kesirlerin toplamıyla eşleştir.',
    level: 2,
    launch: { text: 'Kâşî, ondalık gösterimi kullanan ilk matematikçilerdendir. Virgülden sonraki her basamak aslında paydası 10, 100 ya da 1000 olan bir kesirdir.' },
    reflect: '3,128’i kesirlerin toplamı olarak yazarken her basamağın değeri solundakinin kaçta biri oluyor?',
    pairs: [
      { left: '2,35', right: '2 + [[3/10]] + [[5/100]]' },
      { left: '0,407', right: '[[4/10]] + [[7/1000]]' },
      { left: '5,06', right: '5 + [[6/100]]' },
      { left: '1,9', right: '1 + [[9/10]]' },
      { left: '3,128', right: '3 + [[1/10]] + [[2/100]] + [[8/1000]]' },
      { left: '0,52', right: '[[5/10]] + [[2/100]]' },
      { left: '4,003', right: '4 + [[3/1000]]' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-ondalik-karsilastir',
    outcomes: ['MAT.6.1.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangisi daha büyük?',
    instructions: 'Ondalık gösterimleri basamak değerlerini düşünerek karşılaştır.',
    level: 2,
    launch: { text: 'Bir öğrenci “0,25 daha büyük, çünkü 25, 3’ten büyük.” diyor. Bu düşünce doğru mu? Yüzlük kareyi hatırla.', visual: hundredGrid(25) },
    reflect: 'İki ondalık gösterimi karşılaştırırken basamakların sayısına mı, basamak değerlerine mi bakarsın? Neden?',
    questions: [
      {
        prompt: '100 m koşusunda Ada 12,5 saniye, Bora 12,45 saniye koştu. Kim daha hızlı koştu (daha kısa sürede bitirdi)?',
        choices: ['Bora', 'Ada', 'İkisi eşit'],
        answer: 0,
        feedback: [null, '12,5 = 12,50 > 12,45. Ada daha uzun sürede koştu.', '12,5 = 12,50; 12,45 ile aynı değil.'],
      },
      {
        prompt: 'Hangisi daha büyüktür?',
        choices: ['0,25', '0,3'],
        answer: 1,
        feedback: ['Basamağı çok diye büyük değil: 0,25 = 25 yüzde bir, 0,3 = 30 yüzde bir.', null],
      },
      {
        prompt: 'Markette 1,09 kg ve 1,9 kg’lık iki paket peynir var. Hangisi doğrudur?',
        choices: ['1,9 kg’lık paket daha ağırdır.', '1,09 kg’lık paket daha ağırdır.', 'İkisi eşittir.', 'Karşılaştırılamaz.'],
        answer: 0,
        feedback: [null, '1,09’daki 9 yüzde birler basamağında; 1,9’daki 9 ise onda birler basamağında.', '0 rakamı yer tutar: 1,09 = 1 + [[9/100]], 1,9 = 1 + [[9/10]].', 'İkisi de kilogram; basamak değerleriyle karşılaştırabilirsin.'],
      },
      {
        prompt: 'Hangisi 0,6’ya eşittir?',
        choices: ['0,06', '0,60', '6,0', '0,006'],
        answer: 1,
        feedback: ['0,06 = [[6/100]]; 0,6’dan 10 kat küçük.', null, '6,0 = 6 bütün.', '0,006 = [[6/1000]].'],
      },
      {
        prompt: '0,5 ile 0,6 arasında başka bir sayı var mı?',
        choices: ['Yok, ardışık sayılardır.', 'Var; örneğin 0,55.', 'Var; örneğin 0,65.', 'Yalnızca 0,51 vardır.'],
        answer: 1,
        feedback: ['0,5 = 0,50 ve 0,6 = 0,60 diye düşün; arada 0,51, 0,52... var.', null, '0,65 > 0,6; aralığın dışında.', '0,51 bir örnek ama tek değil: 0,52, 0,555...'],
      },
      {
        prompt: 'Bir kilogram peynir 312,85 TL. Bu fiyat en yakın liraya yuvarlanırsa kaç TL olur?',
        choices: ['312 TL', '313 TL', '312,9 TL', '310 TL'],
        answer: 1,
        feedback: ['0,85 yarımdan büyük; 313’e daha yakın.', null, 'Bu onda birlere yuvarlama; soru en yakın lirayı istiyor.', 'Bu onluğa yuvarlama.'],
      },
      {
        prompt: 'Hangisi küçükten büyüğe doğru sıralamadır?',
        choices: ['0,06 < 0,6 < 0,606 < 0,66', '0,6 < 0,06 < 0,66 < 0,606', '0,606 < 0,66 < 0,6 < 0,06', '0,06 < 0,606 < 0,6 < 0,66'],
        answer: 0,
        feedback: [null, '0,6 = 0,60 ve 0,06: hangisinde 6 daha büyük basamakta?', 'Basamak sayısı çok olan sayı büyük olmak zorunda değil.', '0,606 > 0,6: 0,600 ile 0,606’yı karşılaştır.'],
      },
    ],
  },

  // MAT.6.1.6
  {
    id: 'g6-adil-paylasim',
    outcomes: ['MAT.6.1.6'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Adil paylaşım',
    instructions: 'Parça sayısını seç ve bir kişinin payı kadar parçayı boya.',
    level: 1,
    launch: { text: '3 pizza 4 arkadaş arasında eşit paylaşılacak. Her pizzayı 4’e bölersen her arkadaş kaç dilim alır? Bir kişinin payı bir pizzanın ne kadarıdır?', visual: { kind: 'emoji', emoji: '🍕', count: 3 } },
    reflect: 'a tane pizza b kişiye eşit paylaşılırsa bir kişinin payı ne olur? Gördüğün örüntüyü kendi cümlelerinle yaz.',
    tool: 'fractions',
    config: { dens: [2, 3, 4, 5, 6, 8, 10] },
    tasks: [
      { prompt: '3 pizza 4 kişiye eşit paylaşılıyor. Bir kişinin payını kesir şeridinde göster.', target: { num: 3, den: 4 }, hints: ['Her pizzayı 4 eş dilime böl. Toplam kaç dilim olur?', '12 dilim 4 kişiye bölününce her kişiye kaç dilim düşer? Bir dilim pizzanın kaçta biri?'], explain: '3 ÷ 4 = [[3/4]]: Her kişi her pizzadan [[1/4]] alır; toplam [[3/4]] pizza.' },
      { prompt: '2 pizza 5 kişiye eşit paylaşılıyor. Bir kişinin payını göster.', target: { num: 2, den: 5 }, explain: '2 ÷ 5 = [[2/5]]' },
      { prompt: '1 kek 3 kişiye eşit paylaşılıyor. Bir kişinin payını göster.', target: { num: 1, den: 3 }, explain: '1 ÷ 3 = [[1/3]]' },
      { prompt: '5 sandviç 8 kişiye eşit paylaşılıyor. Bir kişinin payını göster.', target: { num: 5, den: 8 }, explain: '5 ÷ 8 = [[5/8]]. Bölünen paya, bölen paydaya gidiyor!' },
      { prompt: '4 şerit kâğıt 10 öğrenciye eşit paylaşılıyor. Bir öğrencinin payını göster.', target: { num: 4, den: 10 }, explain: '4 ÷ 10 = [[4/10]] = 0,4. [[2/5]] de aynı payı gösterir.' },
    ],
  },
  {
    id: 'g6-kesir-bolme-iliskisi',
    outcomes: ['MAT.6.1.6'],
    type: 'fill',
    stage: 'sembol',
    title: 'Kesirden ondalığa',
    instructions: 'Kesri bir bölme işlemi olarak düşün ve boşlukları doldur.',
    level: 2,
    launch: { text: 'Hesap makinesinde 3 ÷ 4 yazınca 0,75 çıkıyor. [[3/4]] kesrinin ondalık gösterimi de 0,75. Kesir çizgisi aslında bir bölme işareti olabilir mi?' },
    reflect: '[[3/4]] kesrini “3 bölü 4” diye okumak neden mantıklı? Pizza paylaşımıyla açıkla.',
    items: [
      { text: '3 ÷ 4 = [[3/4]] = __', answers: ['0,75'], hints: ['3 bütünü 30 onda bir olarak düşünebilirsin.', '[[3/4]] = [[75/100]] olabilir mi?'] },
      { text: '7 ÷ 2 = [[7/2]] = __', answers: ['3,5'] },
      { text: '[[9/4]] kesrinin ondalık gösterimi __', answers: ['2,25'], hints: ['9’un içinde kaç tane 4 var, kalan ne?'] },
      { text: '5 pizza 8 kişiye eşit paylaştırılırsa kişi başına [[5/8]] = __ pizza düşer.', answers: ['0,625'], hints: ['[[1/8]] = 0,125 olduğunu kullanabilirsin.'] },
      { text: '6 m’lik bir ip 5 eş parçaya bölünürse her parça __ m olur.', answers: ['1,2'], hints: ['6 ÷ 5 = [[6/5]]. Bu kesir 1’den büyük mü?'] },
      { text: '[[1/3]] için 1 ÷ 3 bölmesi sürdükçe bölümde hep __ rakamı tekrar eder.', answers: ['3'] },
      { text: '[[2/11]] = 0,181818... Bu gösterimde sürekli tekrar eden rakam grubu __', answers: ['18'] },
    ],
  },
  {
    id: 'g6-sonlu-devirli',
    outcomes: ['MAT.6.1.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Sonlu mu, devirli mi?',
    instructions: 'Payı paydaya böldüğünde bölme işlemi biter mi, yoksa rakamlar sürekli tekrar mı eder? Kesirleri grupla.',
    level: 3,
    launch: { text: 'Ali hesap makinesiyle [[1/4]] için 0,25; [[1/3]] için 0,3333333 buldu. Neden bazı bölmeler bitiyor da bazıları bitmiyor?' },
    reflect: 'Sadeleştirilmiş bir kesrin ondalık gösteriminin sonlu mu devirli mi olacağını paydaya bakarak nasıl tahmin edersin?',
    categories: [
      { id: 'sonlu', label: 'Sonlu ondalık gösterim', color: '#22c55e' },
      { id: 'devirli', label: 'Devirli ondalık gösterim', color: '#a855f7' },
    ],
    items: [
      { content: '[[3/4]]', category: 'sonlu', explain: '3 ÷ 4 = 0,75; bölme biter. Payda 4 = 2 · 2.' },
      { content: '[[2/5]]', category: 'sonlu', explain: '2 ÷ 5 = 0,4; payda 5.' },
      { content: '[[7/8]]', category: 'sonlu', explain: '7 ÷ 8 = 0,875; payda 8 = 2 · 2 · 2.' },
      { content: '[[9/20]]', category: 'sonlu', explain: '9 ÷ 20 = 0,45; payda 20 = 2 · 2 · 5.' },
      { content: '[[3/15]]', category: 'sonlu', explain: '[[3/15]] = [[1/5]] = 0,2; sadeleşince paydada yalnızca 5 kalır.' },
      { content: '[[1/3]]', category: 'devirli', explain: '1 ÷ 3 = 0,333...; her adımda kalan 1.' },
      { content: '[[5/6]]', category: 'devirli', explain: '5 ÷ 6 = 0,8333...; 6 = 2 · 3, paydada 3 çarpanı var.' },
      { content: '[[2/9]]', category: 'devirli', explain: '2 ÷ 9 = 0,222...' },
      { content: '[[4/11]]', category: 'devirli', explain: '4 ÷ 11 = 0,3636...' },
      { content: '[[7/12]]', category: 'devirli', explain: '7 ÷ 12 = 0,58333...; 12 = 2 · 2 · 3.' },
    ],
  },
  {
    id: 'g6-devirli-oruntu',
    outcomes: ['MAT.6.1.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bölmedeki örüntüler',
    instructions: 'Örüntüleri incele, genelle ve tahminini seç.',
    level: 3,
    launch: { text: 'Mısırlılar kesirleri birim kesirlerin toplamı olarak yazardı. Biz ise kesirleri bölme yaparak ondalık gösterime çevirebiliyoruz. Bazı bölmelerde ilginç örüntüler çıkıyor!' },
    reflect: 'Dokuzda birler örüntüsünü gördükten sonra [[8/9]] için tahminin ne? Peki [[9/9]] bu örüntüye nasıl uyar? Tartışın.',
    questions: [
      {
        prompt: '[[1/9]] = 0,111..., [[2/9]] = 0,222..., [[4/9]] = 0,444... Bu örüntüye göre [[5/9]] hangisidir?',
        choices: ['0,555...', '0,5', '0,59', '5,9'],
        answer: 0,
        feedback: [null, '0,5 = [[1/2]]; [[5/9]] yarımdan biraz büyük ve bölme bitmiyor.', 'Örüntüde pay, tekrar eden rakam oluyor.', '5,9 birden büyük; [[5/9]] ise 1’den küçük.'],
      },
      {
        prompt: '[[1/11]] = 0,0909..., [[2/11]] = 0,1818..., [[3/11]] = 0,2727... Buna göre [[4/11]] hangisidir?',
        choices: ['0,3636...', '0,4444...', '0,4040...', '0,3333...'],
        answer: 0,
        feedback: [null, 'Tekrar eden grup her adımda 09 artıyor: 09, 18, 27, ...', '27 + 9 = 36; tekrar eden grup 36 olmalı.', '0,333... = [[1/3]]; [[4/11]] ile aynı değil.'],
      },
      {
        prompt: 'Hesap makinesi [[2/3]] için 0,6666667 gösterdi. Son rakamın 7 olmasının nedeni nedir?',
        choices: ['Ekran doldu ve makine sonucu yuvarladı; aslında 6’lar sonsuza dek sürer.', '[[2/3]] kesrinin ondalık gösterimi tam olarak 0,6666667’dir.', 'Bölme orada bitmiştir.', 'Hesap makinesi bozuktur.'],
        answer: 0,
        feedback: [null, '2 ÷ 3 bölmesini kâğıtta sürdür: her adımda kalan 2 olur, bölüm hep 6.', 'Bölme bitseydi kalan 0 olurdu; burada kalan hep 2.', 'Makine sınırlı sayıda basamak gösterir ve son basamağı yuvarlar.'],
      },
      {
        prompt: 'Hangi kesrin ondalık gösterimi sonludur?',
        choices: ['[[7/20]]', '[[1/6]]', '[[2/3]]', '[[5/12]]'],
        answer: 0,
        feedback: [null, '6 = 2 · 3; paydadaki 3 bölmenin bitmesini engeller.', 'Payda 3 olunca 0,666... devam eder.', '12 = 2 · 2 · 3; paydada 3 çarpanı var.'],
      },
      {
        prompt: 'Defne “Paydası tek sayı olan kesirlerin hepsi devirlidir.” dedi. Hangisi Defne’nin iddiasını çürütür?',
        choices: ['[[1/5]] = 0,2', '[[1/3]] = 0,333...', '[[1/7]] = 0,142857...', '[[1/9]] = 0,111...'],
        answer: 0,
        feedback: [null, 'Bu örnek Defne’yi destekliyor; çürüten bir örnek ara.', 'Bu örnek Defne’yi destekliyor; çürüten bir örnek ara.', 'Bu örnek Defne’yi destekliyor; çürüten bir örnek ara.'],
      },
      {
        prompt: '[[1/8]] = 0,125 olduğunu bilen Ece, [[3/8]]’in ondalık gösterimini nasıl bulabilir?',
        choices: ['0,125’i 3 ile çarpar: 0,375', '0,125’e 3 ekler: 3,125', '0,125’i 3’e böler', '[[3/8]]’i 0,38 diye yazar'],
        answer: 0,
        feedback: [null, '[[3/8]], üç tane [[1/8]] demektir; 3 eklemek değil, 3 tane toplamak gerekir.', '3’e bölmek [[1/24]] verir; [[3/8]] daha büyük olmalı.', '0,38 yaklaşık bir değer; tam değeri bulabilirsin.'],
      },
    ],
  },

  // MAT.6.1.7
  {
    id: 'g6-kesir-modeli',
    outcomes: ['MAT.6.1.7'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kesir şeridiyle işlem',
    instructions: 'Parça sayısını seç ve sonucu gösterecek kadar parçayı boya.',
    level: 2,
    launch: { text: 'Tepsideki böreğin [[3/4]]’ü kalmıştı. Can kalan böreğin yarısını yedi. Can böreğin tamamının ne kadarını yedi? Önce tahmin et: yarımdan çok mu, az mı?' },
    reflect: '“Çarpma her zaman sonucu büyütür.” diyen bir arkadaşına [[3/4]]’ün yarısı örneğiyle ne söylersin?',
    tool: 'fractions',
    config: { dens: [2, 3, 4, 6, 8, 12] },
    tasks: [
      { prompt: 'Bir böreğin [[3/4]]’ünün yarısı ne kadar eder? Kesir şeridinde göster.', target: { num: 3, den: 8 }, hints: ['[[3/4]]’ü boya; sonra her çeyreği ikiye böl.', 'Bütün kaç eş parçaya bölünmüş oldu?'], explain: '[[1/2]] × [[3/4]] = [[3/8]]: 4 parçanın her biri ikiye bölündü, 8 parça oldu; bunların 3’ünü aldık.' },
      { prompt: 'Yarım şeridin [[2/3]]’ü ne kadar eder? ([[2/3]] × [[1/2]]) Göster.', target: { num: 1, den: 3 }, hints: ['Yarımı 3 eş parçaya bölersen her parça bütünün kaçta biri olur?'], explain: '[[2/3]] × [[1/2]] = [[2/6]] = [[1/3]]' },
      { prompt: '[[3/4]] ÷ 3 işleminin sonucunu göster.', target: { num: 1, den: 4 }, explain: '[[3/4]]’ü 3 eş parçaya paylaştırınca her pay [[1/4]] olur.' },
      { prompt: '[[1/2]] + [[1/4]] toplamını göster.', target: { num: 3, den: 4 }, explain: 'Eş birim kesirlerle toplarız: [[2/4]] + [[1/4]] = [[3/4]].' },
    ],
  },
  {
    id: 'g6-yuzde-modeli',
    outcomes: ['MAT.6.1.7'],
    type: 'fill',
    stage: 'model',
    title: 'Yüzde: yüzde kaç parça?',
    instructions: 'Yüzlük kareyi ve şerit modelini kullanarak yüzdeleri bul.',
    level: 1,
    launch: { text: '“Yüzde” kelimesi “yüz parçada kaç parça” demektir. %35 indirim, 100 TL’de 35 TL indirim demek. Peki 300 TL’lik bir üründe?', visual: hundredGrid(35) },
    reflect: '%25’i bulmak için neden yarının yarısını almak işe yarıyor? Şerit modeliyle bir arkadaşına göster.',
    items: [
      { text: 'Boyalı kısım: [[35/100]] = %__', answers: ['35'], visual: hundredGrid(35) },
      { text: '25 küçük kare boyalı: %25 = [[1/__]]', answers: ['4'], visual: hundredGrid(25), hints: ['Yüzlük karenin dörtte biri kaç küçük kare eder?'] },
      { text: '%10 = [[1/10]]. 300 TL’nin %10’u __ TL', answers: ['30'], visual: hundredGrid(10), hints: ['300’ü 10 eş parçaya bölersen bir parça kaç olur?'] },
      { text: 'Şeridin tamamı 200 TL. %25’lik bir parça __ TL', answers: ['50'], visual: { kind: 'tape', parts: Array.from({ length: 4 }, () => ({ label: '%25', value: 25 })), total: '200 TL' } },
      { text: 'Şeridin tamamı 80 TL. %75’i __ TL', answers: ['60'], visual: { kind: 'tape', parts: [{ label: '%50', value: 50 }, { label: '%25', value: 25 }, { label: '%25', value: 25 }], total: '80 TL' }, hints: ['%50’lik parça kaç TL? %25’lik parça bunun yarısı.'] },
      { text: 'Şeridin tamamı 450 TL. Turuncu kısım %20’dir ve __ TL eder.', answers: ['90'], visual: { kind: 'tape', parts: Array.from({ length: 10 }, (_, i) => ({ label: '', value: 10, color: i < 2 ? '#fdba74' : undefined })), total: '450 TL' }, hints: ['%10 kaç TL eder?', '%20 kaç tane %10 eder?'] },
      { text: '%1’i 6 TL olan bir tutarın tamamı __ TL', answers: ['600'], hints: ['%1, bütünün yüzde biridir. 100 tane %1 ne eder?'] },
    ],
  },
  {
    id: 'g6-once-tahmin-et',
    outcomes: ['MAT.6.1.7'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Önce tahmin et',
    instructions: 'Hesap yapmadan önce tahmin et: referans sayıları (0, [[1/2]], 1, %10, %25, %50) kullanarak en makul sonucu seç.',
    level: 2,
    launch: { text: 'Markette 3,9 TL’lik üründen 4 tane aldın. Kasaya gitmeden önce yaklaşık ne ödeyeceğini nasıl tahmin edersin?' },
    reflect: 'Tahmin ederken hangi referans sayıları kullandın? Tahmin, hesabını kontrol etmene nasıl yardım eder?',
    questions: [
      {
        prompt: '[[7/8]] + [[11/12]] toplamı yaklaşık kaçtır?',
        choices: ['1', '2', '18', '[[18/20]]'],
        answer: 1,
        explain: 'İki kesir de 1’e çok yakın; toplamları 2’ye yakındır.',
        feedback: ['İki kesir de 1’e çok yakın; toplamları 1’den çok daha büyük olmalı.', null, 'Payları topladın; kesirler 1’e yakın, toplam 2’ye yakın olur.', 'Payları ve paydaları ayrı ayrı topladın; [[18/20]] 1’den küçük. Toplam 2’ye yakın olmalı.'],
      },
      {
        prompt: '[[3 1/8]] − [[1 7/8]] farkı yaklaşık kaçtır?',
        choices: ['Yaklaşık 1', 'Yaklaşık 2', 'Yaklaşık 4', 'Yaklaşık 5'],
        answer: 0,
        feedback: [null, '3’ten biraz fazla bir sayıdan 2’den biraz az bir sayı çıkıyor: 3 − 2 = 1 civarı.', 'Toplama gibi düşündün; burada çıkarma yapıyoruz.', 'Fark, çıkardığımız sayıların ikisinden de küçük olur.'],
      },
      {
        prompt: '0,48 × 62 işleminin sonucu yaklaşık kaçtır?',
        choices: ['31', '3', '310', '62'],
        answer: 0,
        feedback: [null, '0,48 yarıma yakın: 62’nin yarısı kaç?', '0,48, 1’den küçük; sonuç 62’den büyük olamaz.', '1’den küçük bir sayıyla çarpınca sonuç 62’den küçük olur.'],
      },
      {
        prompt: '81’in %26’sı yaklaşık kaçtır?',
        choices: ['20', '8', '40', '60'],
        answer: 0,
        feedback: [null, '8 yaklaşık %10 olurdu; %26 yaklaşık dörtte birdir.', '40 yaklaşık %50 olurdu.', '60 yaklaşık %75 olurdu.'],
      },
      {
        prompt: 'Hangi işlemin sonucu 20’den küçüktür?',
        choices: ['20 × [[3/2]]', '20 ÷ 0,5', '20 × 0,8', '20 × [[5/4]]'],
        answer: 2,
        feedback: ['[[3/2]] 1’den büyük; sonuç 20’den büyük olur (30).', '0,5’e bölmek “20’nin içinde kaç yarım var?” demektir: 40.', null, '[[5/4]] 1’den büyük; sonuç 25 olur.'],
      },
      {
        prompt: '12 ÷ [[1/4]] işleminin sonucu için hangisi doğrudur?',
        choices: ['12’den büyüktür; 12’nin içinde 48 tane çeyrek vardır.', '12’den küçüktür; bölme her zaman küçültür.', '3’tür.', '12’dir.'],
        answer: 0,
        feedback: [null, '1’den küçük bir sayıya bölmek “içinde kaç tane var?” sorusudur; sonuç büyür.', '3 = 12 ÷ 4; çeyreğe bölmek, 4’e bölmekle aynı değildir.', '1’e bölseydik 12 olurdu.'],
      },
      {
        prompt: '3,9 × 4,1 işleminin sonucu hangi aralıktadır?',
        choices: ['12 ile 16 arasında', '1 ile 2 arasında', '100 ile 200 arasında', '40 ile 50 arasında'],
        answer: 0,
        feedback: [null, '3,9 yaklaşık 4, 4,1 yaklaşık 4: sonuç 4 × 4’e yakın.', 'Virgülleri yok saydın; çarpanlar 4 civarında, sonuç 16 civarında olmalı.', '4 × 4 = 16; 40 civarı çıkmaz.'],
      },
    ],
  },
  {
    id: 'g6-kesir-ondalik-islemler',
    outcomes: ['MAT.6.1.7'],
    type: 'fill',
    stage: 'sembol',
    title: 'Kesir, ondalık ve yüzde işlemleri',
    instructions: 'İşlemleri anlamını düşünerek yap ve sonucu yaz.',
    level: 2,
    launch: { text: 'Pastanede 4,5 kg un, 0,5 kg’lık paketlere ayrılacak. Kaç paket olur? Bölmeye “içinde kaç tane var?” diye bakarsak işler kolaylaşır.' },
    reflect: '4,5 ÷ 0,5 işleminin sonucu neden 4,5’ten büyük çıktı? Kendi örneğinle açıkla.',
    items: [
      { text: '[[2/3]] × 12 = __', answers: ['8'], hints: ['12’nin [[1/3]]’ü kaç? [[2/3]]’ü bunun kaç katı?'] },
      { text: '[[3/4]] ÷ 3 = [[1/__]]', answers: ['4'], hints: ['[[3/4]], üç tane [[1/4]] demektir. 3 kişiye paylaşınca her paya kaç düşer?'] },
      { text: '[[1/5]] + [[1/10]] = [[__/10]]', answers: ['3'], hints: ['[[1/5]] kaç tane [[1/10]] eder?'] },
      { text: '[[1/2]] ÷ [[1/4]] = __', answers: ['2'], hints: ['Yarımın içinde kaç tane çeyrek var?'] },
      { text: '3,75 × 100 = __', answers: ['375'], hints: ['Her basamak 100 kat büyüyünce 3 birlik ne olur? 7 onda bir ne olur?'], explain: '3 birlik 3 yüzlük, 7 onda bir 7 onluk, 5 yüzde bir 5 birlik olur: 375.' },
      { text: '48,6 ÷ 10 = __', answers: ['4,86'], hints: ['Her basamak 10 kat küçülür: 4 onluk ne olur? 6 onda bir ne olur?'] },
      { text: '4,5 ÷ 0,5 = __', answers: ['9'], hints: ['4,5’in içinde kaç tane yarım var?', '1 bütünde 2 yarım varsa 4 bütünde kaç yarım olur?'] },
      { text: '320’nin %15’i __', answers: ['48'], hints: ['320’nin %10’u kaç? %5’i bunun yarısı.'] },
    ],
  },
  {
    id: 'g6-kesir-ondalik-yuzde-problemleri',
    outcomes: ['MAT.6.1.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Günlük hayat problemleri',
    instructions: 'Verilenleri ve isteneni belirle, gerekirse şerit modeli çiz, sonra çöz.',
    level: 2,
    launch: { text: 'İndirimler, kâr-zarar, borçlar ve çevre sorunları kesir, ondalık ve yüzdelerle anlatılır. Her problemde önce “Ne veriliyor, ne isteniyor?” diye soralım.' },
    reflect: 'Bu problemlerden birini şerit modeliyle çiz. Model, hangi işlemi yapacağına karar vermene nasıl yardım etti?',
    questions: [
      {
        prompt: 'Bir pizzanın [[3/4]]’ü kalmıştı. Can kalan pizzanın [[1/3]]’ünü yedi. Can pizzanın tamamının ne kadarını yedi?',
        choices: ['[[1/12]]', '[[1/4]]', '[[3/7]]', '[[4/7]]'],
        answer: 1,
        explain: '[[1/3]] × [[3/4]] = [[3/12]] = [[1/4]]',
        feedback: ['[[1/3]] ile [[1/4]]’ü çarpmışsın; kalan pizza [[3/4]].', null, 'Payları ve paydaları topladın; “kalanın [[1/3]]’ü” bir çarpmadır.', 'Kesirleri topladın; “kalanın üçte biri” bir çarpmadır.'],
      },
      {
        prompt: 'Bir porsiyon kurabiye [[1/3]] paket ise 6 paket kurabiyeden kaç porsiyon çıkar?',
        choices: ['2', '9', '18', '3'],
        answer: 2,
        explain: '6 ÷ [[1/3]] = 18. Her paketten 3 porsiyon çıkar.',
        feedback: ['6’yı 3’e böldün; ama her paketten 3 porsiyon çıkıyor.', '6 + 3 = 9; 6 pakette kaç tane üçte bir olduğunu say.', null, 'Her paketten 3 porsiyon çıkar; 6 paketten kaç çıkar?'],
      },
      {
        prompt: 'Fiyatı 840 TL olan bir ayakkabıda %25 indirim var. İndirimli fiyat kaç TL’dir?',
        choices: ['210 TL', '815 TL', '630 TL', '600 TL'],
        answer: 2,
        explain: '840’ın %25’i (dörtte biri) 210 TL’dir. 840 − 210 = 630 TL.',
        feedback: ['210 TL indirim miktarı; soru indirimli fiyatı soruyor.', '25 TL düştün; %25, 840’ın dörtte biridir.', null, '%25 = [[1/4]]; 840’ın dörtte birini bul.'],
      },
      {
        prompt: 'Ayşe’nin 125,5 TL’si var. Parasının onda biri kadar olan borcunu ödedi. Kaç TL’si kaldı?',
        choices: ['112,95 TL', '113,5 TL', '12,55 TL', '115,5 TL'],
        answer: 0,
        explain: '125,5 ÷ 10 = 12,55 ve 125,5 − 12,55 = 112,95',
        feedback: [null, '12 TL çıkardın; onda biri 12,55 TL.', '12,55 TL ödediği borç; soru kalan parayı soruyor.', '10 TL çıkardın; onda biri 12,55 TL.'],
      },
      {
        prompt: 'Bir kırtasiyeci 60 TL’ye aldığı bir çantayı %20 kârla satıyor. Satış fiyatı kaç TL’dir?',
        choices: ['48 TL', '62 TL', '80 TL', '72 TL'],
        answer: 3,
        explain: '60’ın %10’u 6 TL, %20’si 12 TL. 60 + 12 = 72 TL.',
        feedback: ['Kâr satış fiyatına eklenir; sen çıkardın.', '%20 kâr 2 TL değil; 60’ın %20’sini hesapla.', 'Kâr 20 TL değil; 60’ın %10’u 6 TL ise %20’si kaç?', null],
      },
      {
        prompt: 'Okulda toplanan atıkların [[2/5]]’i kâğıt, %35’i plastik, geri kalanı camdır. Camın oranı yüzde kaçtır?',
        choices: ['%35', '%25', '%40', '%65'],
        answer: 1,
        explain: '[[2/5]] = %40. %40 + %35 = %75; kalan %25.',
        feedback: ['%35 plastiğin oranı.', null, '%40 kâğıdın oranı ([[2/5]]).', '100 − 35 = 65: kâğıdı çıkarmayı unuttun.'],
      },
      {
        prompt: 'Buzul kaybı nedeniyle bir bölgedeki 2.400 olan fok sayısı %5 azaldı. Fok sayısı kaça düştü?',
        choices: ['2.395', '2.280', '120', '2.520'],
        answer: 1,
        explain: '2.400’ün %5’i 120’dir. 2.400 − 120 = 2.280',
        feedback: ['5 çıkardın; %5, 2.400’ün yüzde 5’i yani 120.', null, '120 azalma miktarı; soru yeni fok sayısını soruyor.', 'Sayı azaldı; %5 eklememelisin.'],
      },
      {
        prompt: 'Her 0,5 milyon ton karbon salımı yaklaşık 145 futbol sahası büyüklüğünde buzulun erimesine neden oluyor. 2 milyon ton salım yaklaşık kaç futbol sahası büyüklüğünde buzul eritir?',
        choices: ['580', '290', '145', '72,5'],
        answer: 0,
        explain: '2 milyon, 0,5 milyonun 4 katıdır: 4 × 145 = 580.',
        feedback: [null, '290, 1 milyon tonun etkisi; 2 milyon ton bunun 2 katı.', '145, yalnızca 0,5 milyon tonun etkisi.', 'Bölmedin mi? 2 milyon, 0,5 milyonun 4 katıdır.'],
      },
    ],
  },

  // MAT.6.1.8
  {
    id: 'g6-metre-serit',
    outcomes: ['MAT.6.1.8'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Şerit metre',
    instructions: 'Sayı doğrusu 1 metrelik bir şerit metredir; her çentik 5 cm’dir (0,05 m). İstenen uzunluğu işaretle.',
    level: 1,
    launch: { text: 'Terzi metresi 1 metre uzunluğunda ve 100 santimetreye bölünmüş. Kalemin 15 cm olduğunu metre cinsinden nasıl yazarsın?' },
    reflect: 'Metre yerine santimetre ya da milimetre kullanmak ne zaman daha uygundur? Örnek ver.',
    tool: 'numberline',
    config: { min: 0, max: 1, step: 0.05 },
    tasks: [
      { prompt: 'Kalemin boyu 15 cm. Şerit metrede 15 cm’yi işaretle (sayılar metre cinsindendir).', target: { value: 0.15 }, hints: ['1 m = 100 cm. 15 cm, metrenin yüzde kaçı?'], explain: '15 cm = [[15/100]] m = 0,15 m' },
      { prompt: 'Bir defterin uzunluğu 3 dm 5 cm. İşaretle.', target: { value: 0.35 }, hints: ['1 dm = 10 cm. 3 dm 5 cm kaç cm eder?'], explain: '3 dm 5 cm = 35 cm = 0,35 m' },
      { prompt: 'Masanın yüksekliği 80 cm. İşaretle.', target: { value: 0.8 }, explain: '80 cm = 8 dm = 0,8 m' },
      { prompt: 'Yarım metreyi işaretle.', target: { value: 0.5 }, explain: '[[1/2]] m = 50 cm = 5 dm = 0,5 m' },
      { prompt: 'Bir kurdelenin uzunluğu 950 mm. İşaretle.', target: { value: 0.95 }, hints: ['1 m = 1.000 mm. 950 mm kaç cm eder?'], explain: '950 mm = 95 cm = 0,95 m' },
    ],
  },
  {
    id: 'g6-uzunluk-birim-iliskileri',
    outcomes: ['MAT.6.1.8'],
    type: 'match',
    stage: 'model',
    title: 'Şeritlerle birim ilişkileri',
    instructions: 'Her şerit modelini, gösterdiği birim ilişkisiyle eşleştir.',
    level: 1,
    launch: { text: 'Metrenin katları ve askatları, tıpkı basamak değerleri gibi 10’ar 10’ar büyüyüp küçülür. Şerit modelleri bu ilişkiyi görmemize yardım eder.' },
    reflect: 'Uzunluk birimleri arasındaki “10 kat” ilişkisi ondalık gösterimdeki basamaklara nasıl benziyor?',
    pairs: [
      { left: { visual: { kind: 'tape', parts: Array.from({ length: 10 }, () => ({ label: 'dm', value: 1 })), total: '1 m' } }, right: '1 m = 10 dm' },
      { left: { visual: { kind: 'tape', parts: Array.from({ length: 10 }, () => ({ label: 'cm', value: 1 })), total: '1 dm' } }, right: '1 dm = 10 cm' },
      { left: { visual: { kind: 'tape', parts: Array.from({ length: 10 }, () => ({ label: 'mm', value: 1 })), total: '1 cm' } }, right: '1 cm = 10 mm' },
      { left: { visual: { kind: 'tape', parts: Array.from({ length: 4 }, () => ({ label: '250 m', value: 1 })), total: '1 km' } }, right: '1 km = 1.000 m' },
      { left: { visual: { kind: 'tape', parts: Array.from({ length: 4 }, () => ({ label: '25 cm', value: 1 })), total: '1 m' } }, right: '1 m = 100 cm' },
      { left: { visual: { kind: 'tape', parts: [{ label: '500 mm', value: 1 }, { label: '500 mm', value: 1 }], total: '1 m' } }, right: '1 m = 1.000 mm' },
    ],
    perRound: 3,
  },
  {
    id: 'g6-uzunluk-donusum',
    outcomes: ['MAT.6.1.8'],
    type: 'fill',
    stage: 'sembol',
    title: 'Birim dönüştürme',
    instructions: 'Uzunlukları istenen birime çevir.',
    level: 2,
    launch: { text: '634,9 cm = 6 m 34 cm 9 mm = 6 m 3 dm 4 cm 9 mm = 6.349 mm. Aynı uzunluğu kaç farklı biçimde yazabiliriz?' },
    reflect: 'Büyük birimden küçük birime geçerken sayı neden büyür? Ölçme fikriyle açıkla.',
    items: [
      { text: '634,9 cm = 6 m __ cm 9 mm', answers: ['34'], hints: ['6 m kaç cm eder? Geriye kaç cm kalır?'] },
      { text: '6 m 3 dm 4 cm 9 mm = __ mm', answers: ['6349'], hints: ['1 m = 1.000 mm, 1 dm = 100 mm, 1 cm = 10 mm'] },
      { text: '2,4 km = __ m', answers: ['2400'], hints: ['1 km = 1.000 m. 0,4 km kaç metre?'] },
      { text: '45 dm = __ m', answers: ['4,5'], hints: ['10 dm = 1 m. 45 dm’de kaç tane 10 dm var?'] },
      { text: 'Bir kalemin uzunluğu 0,15 m = __ cm', answers: ['15'] },
      { text: '750 m = __ km', answers: ['0,75'], hints: ['750 m, 1.000 m’nin ne kadarı?'] },
      { text: 'Bir karıncanın boyu 0,8 cm = __ mm', answers: ['8'] },
      { text: '3 m 7 cm = __ cm', answers: ['307'], hints: ['3 m = 300 cm. 7 cm’yi ekle; onlar basamağına dikkat!'] },
    ],
  },
  {
    id: 'g6-uygun-uzunluk-birimi',
    outcomes: ['MAT.6.1.8'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangi birim uygun?',
    instructions: 'Ölçülecek uzunluğa en uygun birimi seç ve ölçümleri karşılaştır.',
    level: 1,
    launch: { text: 'Bir arkadaşın “Evden okula 1.500.000 mm yürüyorum.” diyor. Bu ölçü yanlış değil ama neden tuhaf geliyor?' },
    reflect: 'Bir uzunluğu ifade etmek için birim seçerken nelere dikkat edersin?',
    questions: [
      { prompt: 'İstanbul ile Ankara arasındaki uzaklığı ifade etmek için en uygun birim hangisidir?', choices: ['km', 'm', 'cm', 'mm'], answer: 0, feedback: [null, 'Metreyle çok büyük bir sayı çıkar (yaklaşık 450.000 m).', 'Santimetreyle sayı çok çok büyük olur.', 'Milimetre küçük nesneler için uygundur.'] },
      { prompt: 'Bir silginin uzunluğunu ifade etmek için en uygun birim hangisidir?', choices: ['km', 'm', 'cm', 'hm'], answer: 2, feedback: ['Kilometre şehirler arası uzaklıklar içindir.', 'Silgi 1 metreden çok kısa; metreyle 0,04 m gibi küçük sayılar çıkar.', null, 'Hektometre 100 metredir; silgi için çok büyük.'] },
      { prompt: 'Bir karıncanın boyunu ifade etmek için en uygun birim hangisidir?', choices: ['m', 'mm', 'dam', 'km'], answer: 1, feedback: ['Karınca birkaç milimetre; metre çok büyük kalır.', null, 'Dekametre 10 metredir.', 'Kilometre çok büyük.'] },
      { prompt: 'Uzunluk ölçme birimlerinde ölçüt (temel birim) olarak hangisi alınır?', choices: ['Santimetre', 'Metre', 'Kilometre', 'Milimetre'], answer: 1, feedback: ['Santimetre metrenin yüzde biridir.', null, 'Kilometre metrenin 1.000 katıdır.', 'Milimetre metrenin binde biridir.'] },
      { prompt: 'Elif sınıf kapısının yüksekliğini 2,1 m, Can ise 210 cm olarak ölçtü. Hangisi doğrudur?', choices: ['Elif’in ölçümü daha büyüktür.', 'Can’ın ölçümü daha büyüktür.', 'İki ölçüm eşittir.', 'Karşılaştırılamaz.'], answer: 2, explain: '2,1 m = 210 cm', feedback: ['2,1 m = 210 cm; aynı uzunluk.', '210 > 2,1 ama birimler farklı; önce aynı birime çevir.', null, 'Aynı birime çevirerek karşılaştırabilirsin.'] },
      { prompt: 'Hangisi 1 metreden uzundur?', choices: ['95 cm', '999 mm', '0,9 m', '11 dm'], answer: 3, explain: '11 dm = 1,1 m', feedback: ['95 cm < 100 cm', '999 mm < 1.000 mm', '0,9 m = 90 cm', null] },
      { prompt: 'Okulun koşu pisti 400 m. Can 5 tur koşarsa kaç km koşmuş olur?', choices: ['2 km', '20 km', '0,2 km', '2.000 km'], answer: 0, feedback: [null, '5 × 400 = 2.000 m ve 1 km = 1.000 m.', '2.000 m, 0,2 km değil; 1 km 1.000 m.', '2.000 metreyi kilometreye çevirmeyi unuttun.'] },
    ],
  },
  {
    id: 'g6-ondalik-hangisi-farkli',
    outcomes: ['MAT.6.1.8', 'MAT.6.1.7'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Kesir, ondalık, yüzde ve uzunluk',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['0,5', '[[1/2]]', '%50', '0,05'],
        answer: 0,
        reasons: ['Yarıma eşit olan tek ondalık gösterim.', 'Kesirle yazılmış tek değer.', 'Yüzdeyle yazılmış tek değer.', 'Değeri yarım olmayan tek seçenek; yüzde 5’i gösterir.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['20 × 0,5', '20 ÷ 0,5', '20 × 1,5', '20 ÷ 2'],
        answer: 0,
        reasons: ['1’den küçük bir sayıyla çarpılan tek işlem; sonuç 20’den küçük.', '1’den küçük bir sayıya bölünen tek işlem; sonuç 20’den büyük (40).', '1’den büyük bir ondalık gösterimle çarpılan tek işlem.', 'Ondalık gösterim içermeyen tek işlem.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['2,5 m', '25 dm', '250 cm', '25 cm'],
        answer: 0,
        reasons: ['Temel birim olan metreyle yazılmış tek uzunluk.', 'Desimetreyle yazılmış tek uzunluk.', 'Üç basamaklı bir sayıyla yazılmış tek uzunluk.', 'Diğerlerinden farklı uzunlukta olan tek seçenek (0,25 m); diğer üçü birbirine eşit.'],
      },
    ],
  },

  // ── İstatistiksel Araştırma Süreci ──────────────────────────────────────

  // MAT.6.5.1
  {
    id: 'g6-anket-grafigi',
    outcomes: ['MAT.6.5.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Anket sonuçlarını görselleştir',
    instructions: 'Tablodaki verilere göre sütunları yükselt.',
    level: 1,
    launch: { text: '6/B sınıfı “Okula nasıl geliyoruz?” sorusunu araştırmaya karar verdi. Soruyu sordular, cevapları çeteleyle kaydettiler. Şimdi veriyi görselleştirme zamanı!' },
    reflect: 'Bu grafiklerden hangisinde aritmetik ortalama hesaplayabilirsin, hangisinde hesaplayamazsın? Neden?',
    tool: 'bargraph',
    tasks: [
      { prompt: '“Okula nasıl geliyorsun?” anketinin sonuçları (kategorik veri). Grafiği oluştur.', target: { data: [{ label: 'Yürüyerek', value: 9 }, { label: 'Servis', value: 7 }, { label: 'Otobüs', value: 5 }, { label: 'Bisiklet', value: 3 }] }, explain: 'Kategorik veride en yüksek sütun tepe değeri gösterir: en çok tercih edilen “yürüyerek”.' },
      { prompt: '“Bu hafta kaç kitap okudun?” sorusunun sonuçları (nicel veri). Grafiği oluştur.', target: { data: [{ label: '0 kitap', value: 2 }, { label: '1 kitap', value: 6 }, { label: '2 kitap', value: 8 }, { label: '3 kitap', value: 4 }] }, explain: 'Nicel veride de en çok tekrar eden değer (2 kitap) tepe değerdir; ayrıca ortalama ve ortanca da hesaplanabilir.' },
      { prompt: '“Kaç kardeşin var?” sorusunun sonuçları. Grafiği oluştur.', target: { data: [{ label: '0', value: 3 }, { label: '1', value: 9 }, { label: '2', value: 6 }, { label: '3', value: 2 }] }, explain: 'Grafik, verinin nasıl dağıldığını gösterir: çoğu öğrencinin 1 kardeşi var.' },
    ],
  },
  {
    id: 'g6-ortalama-esitle',
    outcomes: ['MAT.6.5.1'],
    type: 'fill',
    stage: 'model',
    title: 'Kuleleri eşitle: aritmetik ortalama',
    instructions: 'Sütunları (küp kulelerini) zihninde eşitle; her birinde kaç küp olacağını bul.',
    level: 1,
    launch: { text: 'Üç arkadaşın 3, 7 ve 5 bilyesi var. “Hepimizin eşit sayıda bilyesi olsaydı kaçar tane olurdu?” Bu soru aritmetik ortalamanın ta kendisi!', visual: { kind: 'bars', data: [{ label: 'Ali', value: 3 }, { label: 'Can', value: 7 }, { label: 'Ece', value: 5 }], title: 'Bilye sayıları' } },
    reflect: 'Aritmetik ortalamayı “eşit paylaşım” ya da “kuleleri dengeleme” diye anlatmak neden işe yarar? Ortalama, veri grubundaki sayılardan biri olmak zorunda mı?',
    items: [
      { text: 'Küpleri kuleler eşit olacak biçimde dağıtırsan her kulede __ küp olur.', answers: ['5'], visual: { kind: 'bars', data: [{ label: 'Ali', value: 3 }, { label: 'Can', value: 7 }, { label: 'Ece', value: 5 }], title: 'Küp kuleleri' }, hints: ['Can’ın kulesinden Ali’nin kulesine kaç küp taşırsan ikisi eşitlenir?', 'Toplam kaç küp var, kaç kuleye paylaşılacak?'], explain: 'Toplam 15 küp, 3 kule: 15 ÷ 3 = 5. Aritmetik ortalama, verileri eşit paylaştırmaktır.' },
      { text: 'Dört arkadaşın okuduğu kitaplar eşit paylaşılsaydı kişi başına __ kitap düşerdi.', answers: ['5'], visual: { kind: 'bars', data: [{ label: 'Ada', value: 2 }, { label: 'Bora', value: 8 }, { label: 'Cem', value: 4 }, { label: 'Defne', value: 6 }], title: 'Okunan kitap sayısı' }, hints: ['Bora’dan Ada’ya kaç kitap “verirsen” ikisi eşitlenir?'] },
      { text: 'Tüm kuleler eşit. Ortalama __', answers: ['6'], visual: { kind: 'bars', data: [{ label: 'A', value: 6 }, { label: 'B', value: 6 }, { label: 'C', value: 6 }], title: 'Küp kuleleri' }, explain: 'Tüm veriler eşitse ortalama o değerin kendisidir.' },
      { text: 'Kuleler dengelenince her birinde __ küp olur.', answers: ['6'], visual: { kind: 'bars', data: [{ label: 'A', value: 4 }, { label: 'B', value: 9 }, { label: 'C', value: 5 }], title: 'Küp kuleleri' }, hints: ['4 + 9 + 5 = ?'] },
      { text: 'Elif’in dört günde içtiği su bardağı sayıları grafikte. Günlük ortalama __ bardak.', answers: ['5'], visual: { kind: 'bars', data: [{ label: 'Pzt', value: 3 }, { label: 'Salı', value: 5 }, { label: 'Çar', value: 4 }, { label: 'Per', value: 8 }], title: 'Su (bardak)' } },
      { text: 'Üç kulenin ortalaması 6 küp. İki kulede 5 ve 4 küp varsa üçüncü kulede __ küp vardır.', answers: ['9'], hints: ['Ortalama 6 ise toplam kaç küp olmalı?', '3 × 6 = 18. Bundan 5’i ve 4’ü çıkarınca?'] },
      { text: 'Ortalaması 4,5 olan iki sayıdan biri 3 ise diğeri __', answers: ['6'], hints: ['İki sayının toplamı kaç olmalı?'] },
    ],
  },
  {
    id: 'g6-veri-turu',
    outcomes: ['MAT.6.5.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Kategorik mi, nicel mi?',
    instructions: 'Sayılarak elde edilen ve sayıyla ifade edilen veriler nicel (kesikli) veridir. Her veriyi doğru gruba taşı.',
    level: 1,
    launch: { text: 'Bir anket hazırlıyorsun: “Göz rengin ne?” ve “Kaç kardeşin var?” sorularının cevapları birbirinden nasıl farklı?' },
    reflect: 'Kategorik bir veri için “ortalama göz rengi” hesaplanabilir mi? Kategorik veride merkezi hangi değerle anlatırsın?',
    categories: [
      { id: 'kategorik', label: 'Kategorik veri', color: '#f97316' },
      { id: 'nicel', label: 'Nicel (kesikli) veri', color: '#3b82f6' },
    ],
    items: [
      { content: 'Öğrencilerin göz rengi', category: 'kategorik', explain: 'Cevap bir sayı değil, bir renk.' },
      { content: 'En sevilen spor dalı', category: 'kategorik', explain: 'Cevap bir spor dalının adı.' },
      { content: 'Doğum yeri (il)', category: 'kategorik', explain: 'Cevap bir il adı.' },
      { content: 'Kan grubu', category: 'kategorik', explain: 'A, B, AB, 0 birer kategoridir; sayı değildir.' },
      { content: 'Okula geliş şekli', category: 'kategorik', explain: 'Yürüyerek, servisle... birer kategoridir.' },
      { content: 'Ailedeki kardeş sayısı', category: 'nicel', explain: 'Sayılarak elde edilir: 0, 1, 2, ...' },
      { content: 'Bir ayda okunan kitap sayısı', category: 'nicel', explain: 'Sayılarak elde edilir.' },
      { content: 'Bir maçta atılan gol sayısı', category: 'nicel', explain: 'Sayılarak elde edilir.' },
      { content: 'Evdeki bisiklet sayısı', category: 'nicel', explain: 'Sayılarak elde edilir.' },
      { content: 'Günde içilen su bardağı sayısı', category: 'nicel', explain: 'Sayılarak elde edilir.' },
    ],
  },
  {
    id: 'g6-kok-yaprak',
    outcomes: ['MAT.6.5.1'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Kök-yaprak gösterimi',
    instructions: 'Bir basketbol takımındaki 11 oyuncunun sezon boyunca attığı sayılar kök-yaprak gösterimiyle verilmiştir (1 | 2 = 12). Soruları cevapla.',
    level: 2,
    launch: {
      text: 'Kök-yaprak gösterimi verileri hem sıralar hem de dağılımın biçimini gösterir. Kök onlar basamağı, yaprak birler basamağıdır.',
      visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] },
    },
    reflect: 'Kök-yaprak gösteriminde ortancayı bulmak neden kolay? Sütun grafiğinde aynı şeyi yapabilir miydin?',
    questions: [
      { prompt: { text: 'Gösterimde kaç veri vardır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['4', '11', '9', '12'], answer: 1, feedback: ['4 kök sayısıdır; her yaprak bir veridir.', null, 'Tüm yaprakları say: 3 + 5 + 2 + 1.', 'Yaprakları yeniden say.'] },
      { prompt: { text: 'Tepe değer (en çok tekrar eden veri) kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['3', '23', '28', '2'], answer: 1, feedback: ['3 bir yaprak; veri 23’tür (kök 2, yaprak 3).', null, '28 yalnızca bir kez geçiyor.', '2 bir kök; tek başına veri değil.'] },
      { prompt: { text: 'Ortanca (sıralı verilerde ortadaki değer) kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['20', '25', '23', '28'], answer: 2, explain: '11 veri sıralıdır; ortadaki (6.) veri 23’tür.', feedback: ['20, 4. veri; 11 verinin ortası 6. veridir.', '25 aritmetik ortalama; ortanca sıralı verilerin ortasındaki değerdir.', null, '28, 8. veri.'] },
      { prompt: { text: 'Açıklık kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['37', '49', '12', '27'], answer: 0, explain: '49 − 12 = 37', feedback: [null, '49 en büyük değer; açıklık en büyük ile en küçük değerin farkıdır.', '12 en küçük değer.', 'Açıklık = 49 − 12.'] },
      { prompt: { text: 'Aritmetik ortalama kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['23', '24', '27', '25'], answer: 3, explain: 'Verilerin toplamı 275’tir. 275 ÷ 11 = 25', feedback: ['23 ortanca ve tepe değer; ortalama için tüm verileri topla.', 'Toplamı yeniden kontrol et: 275.', 'Toplam 275, veri sayısı 11.', null] },
      { prompt: 'Kök-yaprak gösteriminde “3 | 1” hangi veriyi gösterir?', choices: ['13', '31', '3,1', '4'], answer: 1, feedback: ['Kök onlar basamağıdır: 3 | 1 = 31.', null, 'Bu gösterimde 1 | 2 = 12 anahtarı var; ondalık değil.', 'Kök ile yaprak toplanmaz.'] },
    ],
  },
  {
    id: 'g6-merkezi-egilim-sec',
    outcomes: ['MAT.6.5.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Veriye dayalı karar',
    instructions: 'Araştırma sorusunu ve veriyi düşün; en uygun özetleme aracını ya da kararı seç.',
    level: 2,
    launch: { text: 'Bir sınıf başkanı “Sınıfımızda kitap okuma ortalaması çok yüksek!” diyor ama sınıftakilerin çoğu az kitap okuyor. Bu nasıl olabilir?' },
    reflect: 'Hangi durumlarda ortalama yerine ortanca ya da tepe değeri kullanırdın? Bir örnek uydur.',
    questions: [
      { prompt: 'Hangisi veri toplanarak cevaplanabilecek uygun bir araştırma sorusudur?', choices: ['Kitap okumak güzel midir?', 'Dünyanın en iyi kitabı hangisidir?', 'Sınıfımızdaki öğrenciler bir haftada kaç kitap okuyor?', 'Kitapları kim icat etti?'], answer: 2, feedback: ['Bu bir görüş sorusu; “güzel” ölçülemez.', '“En iyi” kişiden kişiye değişir; ölçülebilir bir değişken yok.', null, 'Bu bir bilgi sorusu; veri toplanarak cevaplanmaz.'] },
      { prompt: 'Veri grubu: 3, 4, 4, 5, 60. Bu grubun merkezini en iyi hangisi temsil eder?', choices: ['Aritmetik ortalama (15,2)', 'Ortanca (4)', 'En büyük değer (60)', 'Açıklık (57)'], answer: 1, explain: '60 bir uç değerdir ve ortalamayı büyütür; ortanca verilerin çoğunu daha iyi temsil eder.', feedback: ['60 uç değeri ortalamayı yukarı çekiyor; verilerin çoğu 3–5 arasında.', null, 'En büyük değer merkezi göstermez.', 'Açıklık merkezi değil, yayılımı gösterir.'] },
      { prompt: '“En sevilen meyve” anketinde merkezi gösteren değer hangisi olabilir?', choices: ['Tepe değer', 'Aritmetik ortalama', 'Ortanca', 'Açıklık'], answer: 0, feedback: [null, 'Meyveler sayı değil; toplanıp bölünemez.', 'Kategorik veri büyüklüğe göre sıralanamaz; ortanca bulunamaz.', 'Açıklık nicel veride yayılımı gösterir.'] },
      { prompt: 'Bir mağaza en çok hangi beden tişörtten sipariş vereceğine karar verecek. Satılan tişörtlerin hangi özeti en çok işe yarar?', choices: ['Tepe değer', 'Aritmetik ortalama', 'Açıklık', 'En küçük değer'], answer: 0, feedback: [null, '“Ortalama beden” var olan bir beden olmayabilir; en çok satılan bedeni bilmek gerekir.', 'Açıklık en çok satılan bedeni söylemez.', 'En küçük beden en çok satılan olmayabilir.'] },
      { prompt: 'Veri grubu: 4, 6, 8, 10. Ortanca kaçtır?', choices: ['6', '8', '7', '28'], answer: 2, explain: 'Veri sayısı çift olduğundan ortadaki iki değerin (6 ve 8) ortası alınır: 7.', feedback: ['Veri sayısı çift; ortada iki değer var: 6 ve 8.', 'Ortada iki değer var: 6 ve 8.', null, '28 verilerin toplamı.'] },
      { prompt: 'Bir sınıfın yaş verisinde aritmetik ortalama 11,6 çıktı. Hangisi doğrudur?', choices: ['Hiçbir öğrenci 11,6 yaşında olmasa da ortalama 11,6 olabilir.', 'En az bir öğrenci 11,6 yaşında olmalıdır.', 'Ortalama yaş tam sayı olmalıdır.', 'Ortalama, en çok tekrar eden yaştır.'], answer: 0, feedback: [null, 'Ortalama bir paylaşım sonucudur; veri grubunda bulunmak zorunda değil.', 'Toplam, veri sayısına tam bölünmeyebilir.', 'En çok tekrar eden değer tepe değerdir.'] },
    ],
  },

  // MAT.6.5.2
  {
    id: 'g6-yaniltici-grafik',
    outcomes: ['MAT.6.5.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Grafik bizi yanıltabilir mi?',
    instructions: 'Grafikleri dikkatle incele: eksen nereden başlıyor, ölçek ne?',
    level: 2,
    launch: { text: 'Haberlerde ve reklamlarda grafikler bazen bizi yanıltabilir. Aynı veri farklı çizilince farklı bir hikâye anlatabilir mi?', visual: FIG_YANILTICI_GRAFIK },
    reflect: 'Bir grafiğe güvenmeden önce hangi üç şeyi kontrol edersin?',
    questions: [
      {
        prompt: { text: 'Murat bu grafiğe bakarak “Perşembe satılan simit, pazartesinin iki katından fazla.” dedi. Bu yorum için ne söylenebilir?', visual: FIG_YANILTICI_GRAFIK },
        choices: ['Doğrudur, çünkü sütun çok daha uzun.', 'Hatalıdır; eksen 18’den başlıyor, 23 sayısı 20’nin iki katı değildir.', 'Doğrudur, çünkü grafikler yanıltmaz.'],
        answer: 1,
        feedback: ['Sütunların uzunluğu eksenin 18’den başlamasıyla abartılmış; sayılara bak.', null, 'Grafikler, çizim biçimleriyle yanıltıcı olabilir.'],
      },
      {
        prompt: { text: 'Aynı veri bu kez dikey ekseni 0’dan başlayan grafikle çizildi. Hangisi doğrudur?', visual: FIG_DURUST_GRAFIK },
        choices: ['Günler arasındaki farklar küçüktür; ilk grafik farkları abartıyordu.', 'Perşembe satışları pazartesinin iki katıdır.', 'İki grafik farklı verileri gösteriyor.', 'İkinci grafik yanlıştır.'],
        answer: 0,
        feedback: [null, 'Pazartesi 20, perşembe 23 simit satılmış; iki katı değil.', 'İki grafikte de aynı sayılar var: 20, 22, 21, 23.', 'Eksenin 0’dan başlaması karşılaştırmayı daha dürüst yapar.'],
      },
      {
        prompt: 'Satışların “çok arttığını” göstermek isteyen bir satıcı hangi grafiği seçer?',
        choices: ['Ekseni 18’den başlayan grafiği', 'Ekseni 0’dan başlayan grafiği', 'Fark etmez', 'Hiçbirini'],
        answer: 0,
        feedback: [null, 'Bu grafikte farklar küçük görünür.', 'Ölçek seçimi, farkların nasıl göründüğünü değiştirir.', 'Satıcı farkları büyük gösteren grafiği seçebilir; bu yüzden eksenleri kontrol etmeliyiz.'],
      },
      {
        prompt: { text: 'Bir reklamda “Herkes A markasını tercih ediyor!” deniyor. Grafiğe göre bu iddia için ne söylenebilir?', visual: { kind: 'bars', data: [{ label: 'A markası', value: 12 }, { label: 'B markası', value: 8 }], title: 'Tercih edilen marka', unit: 'kişi' } },
        choices: ['Kabul edilir; A markası daha çok tercih edilmiş.', 'Kabul edilir; 12 kişi çok fazladır.', 'Çürütülür; 20 kişiden 8’i B markasını tercih etmiş.'],
        answer: 2,
        feedback: ['Daha çok tercih edilmek, herkesin tercih etmesi demek değil.', '“Herkes” demek için B’yi seçen kimse olmamalıydı.', null],
      },
      {
        prompt: 'Bir grafiğin dikey ekseninde hiç sayı yazmıyor. Bu grafikle ilgili en doğru yorum hangisidir?',
        choices: ['Sütunlar karşılaştırılabilir ama gerçek değerler bilinmez; kesin yorum yapılamaz.', 'En uzun sütun 100’ü gösterir.', 'Sayılar yazmasa da değerler kesin olarak okunabilir.', 'Grafik her zaman doğrudur.'],
        answer: 0,
        feedback: [null, 'Ölçek yazmıyorsa sütunun hangi sayıyı gösterdiğini bilemeyiz.', 'Ölçek olmadan değer okunamaz.', 'Ölçeği belli olmayan bir grafik yanıltıcı olabilir.'],
      },
    ],
  },
  {
    id: 'g6-yorum-kabul-curut',
    outcomes: ['MAT.6.5.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Kabul et ya da çürüt',
    instructions: 'Her yorumu verilen veriye göre değerlendir: doğruysa kabul et, hatalı ya da yanlıysa çürüt.',
    level: 3,
    launch: { text: 'Bir arkadaşın verilerle ilgili bazı yorumlar yaptı. Her yorumu veriye bakarak kontrol edeceksin: kabul mü, çürüt mü?' },
    reflect: 'Bir yorumu çürütmek için neler yaptın: yeniden hesaplamak mı, verinin nasıl toplandığını sorgulamak mı? Hangisi daha zordu?',
    categories: [
      { id: 'kabul', label: 'Kabul edilir', color: '#22c55e' },
      { id: 'curut', label: 'Çürütülür', color: '#ef4444' },
    ],
    items: [
      { content: 'Veri: 2, 4, 6 → “Aritmetik ortalama 4’tür.”', category: 'kabul', explain: '(2 + 4 + 6) ÷ 3 = 4' },
      { content: 'Veri: 3, 5, 5, 8 → “Tepe değer 5’tir.”', category: 'kabul', explain: '5 iki kez tekrar ediyor.' },
      { content: 'Veri: 7, 8, 9 → “Ortanca 8’dir.”', category: 'kabul', explain: 'Sıralı üç verinin ortası 8.' },
      { content: '30 kişiden 18’i “evet” dedi → “Katılımcıların %60’ı evet dedi.”', category: 'kabul', explain: '[[18/30]] = [[60/100]] = %60' },
      { content: '40 öğrenciden 10’u bisikletle geliyor → “Öğrencilerin dörtte biri bisikletle geliyor.”', category: 'kabul', explain: '[[10/40]] = [[1/4]]' },
      { content: 'Veri: 1, 3, 9 → “Açıklık 9’dur.”', category: 'curut', explain: 'Açıklık 9 − 1 = 8’dir.' },
      { content: 'Veri: 10, 20, 30, 40 → “Ortanca 20’dir.”', category: 'curut', explain: 'Ortadaki iki değer 20 ve 30; ortanca 25’tir.' },
      { content: 'Veri: 2, 2, 3, 3 → “Aritmetik ortalama 3’tür.”', category: 'curut', explain: '10 ÷ 4 = 2,5’tir.' },
      { content: 'Yalnızca futbol kulübü üyelerine sorulup “Okulda herkes futbolu seviyor.” denmesi', category: 'curut', explain: 'Veri yanlı toplanmış; örneklem okulu temsil etmiyor.' },
      { content: 'Veri: 5, 5, 6, 100 → “Ortalama 29’dur ve verilerin çoğunu iyi temsil eder.”', category: 'curut', explain: 'Ortalama 29 doğru ama 100 uç değeri yüzünden verilerin çoğunu temsil etmez.' },
    ],
  },
  {
    id: 'g6-istatistiksel-yorumlari-tartis',
    outcomes: ['MAT.6.5.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bu yorum doğru mu?',
    instructions: 'Başkalarının veriye dayalı sonuç ve yorumlarını incele; hatalı ya da yanlı olanları fark et.',
    level: 2,
    launch: { text: 'Sosyal medyada “Araştırmaya göre gençlerin %80’i kahvaltı yapmıyor!” diye bir paylaşım gördün. Bu sonuca hemen inanmalı mısın?' },
    reflect: 'Bir araştırmanın sonucuna güvenmek için verinin kimden, nasıl ve ne kadar toplandığını bilmek neden önemli?',
    questions: [
      { prompt: '“En sevilen spor” anketi yalnızca okulun basketbol takımındaki öğrencilere uygulanmış ve “Okulun en sevdiği spor basketboldur.” sonucuna varılmış. Bu sonuçla ilgili hangisi doğrudur?', choices: ['Sonuç kesinlikle doğrudur.', 'Veri yanlı toplanmıştır; sonuç tüm okulu temsil etmez.', 'Anket sorusu yanlıştır.', 'Grafik çizilmediği için yorum yapılamaz.'], answer: 1, feedback: ['Basketbol takımındakiler zaten basketbolu seviyor; okulun geri kalanına sorulmadı.', null, 'Soru uygun; sorun kime sorulduğunda.', 'Grafik olmasa da verinin nasıl toplandığına bakarak yorum yapabiliriz.'] },
      { prompt: 'Selin, 4, 6, 8, 10 veri grubunun ortancasını 6 olarak buldu. Bu sonuç için ne söylenebilir?', choices: ['Doğrudur.', 'Hatalıdır; ortanca 8’dir.', 'Hatalıdır; veri sayısı çift olduğu için ortanca 6 ile 8’in ortası olan 7’dir.', 'Hatalıdır; ortanca 28’dir.'], answer: 2, feedback: ['Veri sayısı çift; ortada tek bir değer yok.', '8 de ortadaki iki değerden biri; ikisinin ortası alınır.', null, '28 verilerin toplamı.'] },
      { prompt: '“Sınıfımızdaki öğrencilerin kardeş sayılarının aritmetik ortalaması 2’dir. O hâlde her öğrencinin 2 kardeşi vardır.” Bu yorum için ne söylenebilir?', choices: ['Hatalıdır; ortalama herkesin aynı değere sahip olduğunu göstermez.', 'Doğrudur.', 'Doğrudur, çünkü ortalama her zaman tepe değere eşittir.'], answer: 0, feedback: [null, 'Kardeş sayıları 0, 1, 3, 4 olan öğrenciler de olabilir; ortalama yine 2 çıkabilir.', 'Ortalama ile tepe değer farklı olabilir.'] },
      { prompt: 'Bir araştırmada yalnızca 5 kişiye soru sorulmuş ve “Türkiye’deki gençlerin %80’i kahvaltı yapmıyor.” sonucuna varılmış. Bu sonuçtaki temel sorun nedir?', choices: ['Yüzde kullanılmıştır.', 'Veri sayısı çok azdır ve tüm gençleri temsil etmez.', 'Soru kahvaltıyla ilgilidir.', 'Sonuç bir sayı içermektedir.'], answer: 1, feedback: ['Yüzde kullanmak sorun değil.', null, 'Konu değil, yöntem sorunlu.', 'Sayı içermesi sorun değil.'] },
      { prompt: 'Veri grubu: 5, 7, 7, 9, 9, 10. Arda “Bu veri grubunun tepe değeri yoktur.” dedi. Bu yorum için ne söylenebilir?', choices: ['Doğrudur.', 'Hatalıdır; tepe değer 10’dur.', 'Hatalıdır; 7 ve 9’un ikisi de tepe değerdir.'], answer: 2, feedback: ['7 ve 9 ikişer kez tekrar ediyor.', '10 bir kez geçiyor.', null] },
      { prompt: 'Bir sınıfın matematik puan ortalaması 70, diğerininki 75. “İkinci sınıftaki her öğrenci birinci sınıftaki her öğrenciden daha başarılıdır.” yorumu için ne söylenebilir?', choices: ['Hatalıdır; ortalama tek tek öğrenciler hakkında kesin bilgi vermez.', 'Doğrudur.', 'Doğrudur, çünkü 75 > 70.', 'Yalnızca sınıf mevcutları eşitse doğrudur.'], answer: 0, feedback: [null, 'Birinci sınıfta 95 alan, ikinci sınıfta 50 alan biri olabilir.', 'Ortalamalar grubu özetler; her öğrenciyi değil.', 'Mevcutlar eşit olsa bile tek tek öğrencileri karşılaştıramayız.'] },
    ],
  },
  {
    id: 'g6-istatistik-hangisi-farkli',
    outcomes: ['MAT.6.5.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Veri grupları ve araçlar',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['2, 4, 6, 8', '5, 5, 5, 5', '1, 5, 5, 9', '3, 5, 7, 25'],
        answer: 0,
        reasons: ['Tüm verileri çift olan tek grup.', 'Açıklığı 0 olan tek grup; tüm veriler aynı.', 'Tepe değeri olan ama tüm verileri aynı olmayan tek grup.', 'Aritmetik ortalaması 5 olmayan (10 olan), uç değeri bulunan tek grup.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['Sütun grafiği', 'Kök-yaprak gösterimi', 'Nokta grafiği', 'Çetele tablosu'],
        answer: 0,
        reasons: ['Verileri tek tek göstermeyen, yalnızca sıklıkları sütun yüksekliğiyle gösteren grafik.', 'Her verinin rakamlarını (kök ve yaprak) doğrudan gösteren tek araç.', 'Her veriyi bir noktayla gösteren tek grafik.', 'Bir grafik değil, veri toplarken sayım yapmaya yarayan bir kayıt aracı.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['Aritmetik ortalama', 'Ortanca', 'Tepe değer', 'Açıklık'],
        answer: 0,
        reasons: ['Tüm verileri toplayıp eşit paylaştırarak bulunan tek değer.', 'Verileri sıraya dizmeyi gerektiren tek değer.', 'Kategorik veride de kullanılabilen tek değer.', 'Merkezi değil, verinin ne kadar yayıldığını anlatan tek değer.'],
      },
    ],
  },

  // ── Geometrik Şekiller ──────────────────────────────────────────────────

  // MAT.6.3.1
  {
    id: 'g6-kesen-aci-olustur',
    outcomes: ['MAT.6.3.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Paralel doğrularda açı oluştur',
    instructions: 'Açıölçerin kolunu sürükleyerek istenen açıyı oluştur.',
    level: 1,
    launch: { text: 'Demiryolu rayları birbirine paraleldir. Rayları eğik kesen bir yol, her rayla açılar oluşturur. Bu açılar arasında bir ilişki var mı?', visual: parallel(60, { numbers: true }) },
    reflect: 'Paralel doğrular ve bir kesenle oluşan sekiz açının kaç farklı ölçüsü var? Neden yalnızca o kadar?',
    tool: 'angle',
    tasks: [
      { prompt: 'd₁ ∥ d₂. Kesen, d₁ ile 60°’lik bir açı yapıyor. Bu açının d₂ üzerindeki yöndeşini oluştur.', target: { degrees: 60 }, hints: ['Yöndeş açılar aynı yöne bakar. Kesen iki paralel doğruyu aynı eğimle keser mi?'], explain: 'Yöndeş açılar eştir: 60°.' },
      { prompt: 'Aynı şekilde 60°’lik açının iç ters açısını oluştur.', target: { degrees: 60 }, explain: 'İç ters açılar eştir.' },
      { prompt: 'Aynı kesişim noktasında 60°’lik açıya komşu olan açıyı oluştur.', target: { degrees: 120 }, hints: ['Komşu iki açı bir doğru açı oluşturur. Doğru açı kaç derecedir?'], explain: '60° + 120° = 180°: komşu açılar bütünlerdir.' },
      { prompt: 'Kesen, d₁ ile 125°’lik bir açı yapıyor. Bu açının dış ters açısını oluştur.', target: { degrees: 125 }, explain: 'Dış ters açılar eştir: 125°.' },
    ],
  },
  {
    id: 'g6-aci-ciftlerini-grupla',
    outcomes: ['MAT.6.3.1'],
    type: 'categorize',
    stage: 'model',
    title: 'Açı çiftlerini sınıflandır',
    instructions: 'Her şekilde d₁ ∥ d₂ ve iki açı boyanmıştır. Boyalı açı çiftini doğru gruba taşı.',
    level: 2,
    launch: { text: 'Şekillerde boyalı iki açıya bak: Aynı yöne mi bakıyorlar? Paralel doğruların arasında mı, dışında mı? Kesenin aynı tarafında mı?' },
    reflect: 'Yöndeş, iç ters ve dış ters açıları ayırt etmek için kendine hangi soruları soruyorsun?',
    categories: [
      { id: 'yondes', label: 'Yöndeş açılar', color: '#3b82f6' },
      { id: 'icters', label: 'İç ters açılar', color: '#22c55e' },
      { id: 'dister', label: 'Dış ters açılar', color: '#f97316' },
    ],
    items: [
      { content: { visual: parallel(60, { marks: [{ pos: 1 }, { pos: 5 }] }) }, category: 'yondes', explain: 'İkisi de kesenin aynı tarafında ve doğrulara göre aynı konumda: yöndeş.' },
      { content: { visual: parallel(70, { marks: [{ pos: 2 }, { pos: 6 }] }) }, category: 'yondes', explain: 'Aynı yöne bakıyorlar: yöndeş.' },
      { content: { visual: parallel(115, { marks: [{ pos: 4 }, { pos: 8 }] }) }, category: 'yondes', explain: 'Aynı yöne bakıyorlar: yöndeş.' },
      { content: { visual: parallel(60, { marks: [{ pos: 3 }, { pos: 5 }] }) }, category: 'icters', explain: 'İkisi de paralel doğruların arasında, kesenin farklı taraflarında: iç ters.' },
      { content: { visual: parallel(65, { marks: [{ pos: 4 }, { pos: 6 }] }) }, category: 'icters', explain: 'İçeride ve kesenin farklı taraflarında: iç ters.' },
      { content: { visual: parallel(120, { marks: [{ pos: 3 }, { pos: 5 }] }) }, category: 'icters', explain: 'İçeride ve kesenin farklı taraflarında: iç ters.' },
      { content: { visual: parallel(60, { marks: [{ pos: 1 }, { pos: 7 }] }) }, category: 'dister', explain: 'İkisi de paralel doğruların dışında, kesenin farklı taraflarında: dış ters.' },
      { content: { visual: parallel(65, { marks: [{ pos: 2 }, { pos: 8 }] }) }, category: 'dister', explain: 'Dışarıda ve kesenin farklı taraflarında: dış ters.' },
      { content: { visual: parallel(115, { marks: [{ pos: 1 }, { pos: 7 }] }) }, category: 'dister', explain: 'Dışarıda ve kesenin farklı taraflarında: dış ters.' },
    ],
  },
  {
    id: 'g6-paralel-aci-olculeri',
    outcomes: ['MAT.6.3.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Açı ölçülerini bul',
    instructions: 'd₁ ∥ d₂. Yöndeş, iç ters, dış ters ve ters açıların eş; komşu açıların bütünler olduğunu kullanarak ölçüleri bul.',
    level: 2,
    launch: { text: 'Bir açının ölçüsünü bilmek, şekildeki diğer yedi açıyı bulmana yeter mi? Deneyelim.' },
    reflect: '62°’lik bir açı verildiğinde diğer açıların hepsi ya 62° ya da 118° çıktı. Neden?',
    items: [
      { text: '2 numaralı açı 62° ise 6 numaralı açı __°', answers: ['62'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }), hints: ['2 ve 6 numaralı açılar aynı yöne mi bakıyor?'] },
      { text: '2 numaralı açı 62° ise 8 numaralı açı __°', answers: ['62'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }), hints: ['2 ve 8 paralel doğruların dışında ve kesenin farklı taraflarında.'] },
      { text: '2 numaralı açı 62° ise 4 numaralı açı __°', answers: ['62'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }), hints: ['2 ve 4 aynı noktada, karşı karşıya duran açılar.'] },
      { text: '2 numaralı açı 62° ise 5 numaralı açı __°', answers: ['118'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }), hints: ['6 numaralı açı kaç derece?', '5 ile 6 komşu açılar; toplamları kaç derece?'] },
      { text: '1 numaralı açı 110° ise 7 numaralı açı __°', answers: ['110'], visual: parallel(70, { numbers: true, marks: [{ pos: 1, text: '110°' }] }) },
      { text: '1 numaralı açı 110° ise 3 numaralı açı __°', answers: ['110'], visual: parallel(70, { numbers: true, marks: [{ pos: 1, text: '110°' }] }) },
      { text: '1 numaralı açı 110° ise 6 numaralı açı __°', answers: ['70'], visual: parallel(70, { numbers: true, marks: [{ pos: 1, text: '110°' }] }), hints: ['1’e komşu olan 2 numaralı açı kaç derece?', '2 ile 6 arasında nasıl bir ilişki var?'] },
    ],
  },
  {
    id: 'g6-paralel-dogrular-problem',
    outcomes: ['MAT.6.3.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Raylar, merdivenler, yaya geçitleri',
    instructions: 'Paralel doğrular ve kesenle oluşan açıları günlük hayat durumlarında kullan.',
    level: 2,
    launch: { text: 'Hemzemin geçitte yol iki rayı keser. Bir trafik mühendisi yalnızca bir açıyı ölçerek diğerlerini hesaplayabilir mi?' },
    reflect: 'İki doğrunun paralel olup olmadığını bir kesen ve açıölçerle nasıl kontrol edersin?',
    questions: [
      {
        prompt: 'Bir merdivenin basamakları birbirine paraleldir. Merdivenin yan kirişi alttaki basamakla 70°’lik açı yapıyor. Aynı kiriş üstteki basamakla aynı konumda kaç derecelik açı yapar?',
        choices: ['70°', '110°', '20°', '140°'],
        answer: 0,
        feedback: [null, '110° komşu açı olurdu; aynı konumdaki (yöndeş) açı soruluyor.', '20° tümler açı olurdu; burada dik açı yok.', '140° = 2 × 70°; yöndeş açılar eştir.'],
      },
      {
        prompt: { text: '1 ve 5 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED },
        choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'],
        answer: 0,
        feedback: [null, 'İç ters açılar paralel doğruların arasında olur; 1 numaralı açı dışarıda.', 'Dış ters açılar kesenin farklı taraflarındadır; 1 ve 5 aynı tarafta.', 'Ters açılar aynı kesişim noktasında olur.'],
      },
      {
        prompt: { text: '4 ve 6 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED },
        choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'],
        answer: 1,
        feedback: ['Yöndeş açılar kesenin aynı tarafında olur.', null, '4 ve 6 paralel doğruların arasında; dış değil.', 'Ters açılar aynı kesişim noktasında olur.'],
      },
      {
        prompt: { text: '2 ve 8 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED },
        choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'],
        answer: 2,
        feedback: ['Yöndeş açılar kesenin aynı tarafında olur.', '2 ve 8 paralel doğruların dışında.', null, 'Ters açılar aynı kesişim noktasında olur.'],
      },
      {
        prompt: 'Ali iki doğrunun paralel olup olmadığını anlamak için bir kesen çizdi ve yöndeş açıları 75° ve 78° ölçtü. Hangisi doğrudur?',
        choices: ['Doğrular paralel değildir; paralel olsaydı yöndeş açılar eş olurdu.', 'Doğrular paraleldir.', 'Hiçbir şey söylenemez.', 'Doğrular birbirine diktir.'],
        answer: 0,
        feedback: [null, 'Paralel doğrularda yöndeş açılar eşit olmalıydı.', 'Açılara bakarak karar verebiliriz: eş değillerse doğrular paralel değildir.', 'Dik olsalardı açılardan biri 90° olurdu.'],
      },
      {
        prompt: 'Yaya geçidi çizgileri birbirine paraleldir. Yolun kenarı bir çizgiyle 65°’lik bir açı yapıyorsa komşu çizgiyle iç ters konumdaki açı kaç derecedir?',
        choices: ['65°', '115°', '25°', '130°'],
        answer: 0,
        feedback: [null, '115° komşu (bütünler) açı olurdu.', '25° tümler açı olurdu.', 'İç ters açılar eştir; iki katı değil.'],
      },
    ],
  },

  // MAT.6.3.2
  {
    id: 'g6-paralel-dogrular-iki-kesen',
    outcomes: ['MAT.6.3.2'],
    type: 'quiz',
    stage: 'model',
    title: 'İki kesenle oluşan şekiller',
    instructions: 'd₁ ∥ d₂ doğrularını iki kesen kesiyor. Oluşan şekilleri ve özelliklerini incele.',
    level: 2,
    launch: { text: 'İki paralel doğruyu iki kesenle kestiğinde hangi şekiller oluşabilir? Önce tahmin et, sonra şekillere bak.', visual: FIG_YAMUK },
    reflect: 'Kesenlerin konumunu değiştirdikçe oluşan şekil nasıl değişti? Tüm durumları sistemli olarak nasıl listelersin?',
    questions: [
      {
        prompt: { text: 'Kesenler birbirine paralel değil ve paralel doğruların arasında kesişmiyor. Oluşan ABCD dörtgeni için hangisi kesinlikle doğrudur?', visual: FIG_YAMUK },
        choices: ['Tüm kenarları eşittir.', 'En az bir çift karşılıklı kenarı paraleldir.', 'Tüm açıları diktir.', 'Hiç paralel kenarı yoktur.'],
        answer: 1,
        explain: 'AB ve DC paralel doğrular üzerinde olduğundan paraleldir. Bu dörtgen bir yamuktur.',
        feedback: ['Kenarları ölçmeden bunu söyleyemeyiz; şekilde eşit görünmüyorlar.', null, 'Kesenler eğik; açılar dik değil.', 'AB ve DC, paralel doğruların üzerinde.'],
      },
      {
        prompt: { text: 'Kesenler de birbirine paraleldir. Oluşan ABCD dörtgenine ne ad verilir?', visual: FIG_PARALELKENAR },
        choices: ['Üçgen', 'Beşgen', 'Paralelkenar', 'Çember'],
        answer: 2,
        feedback: ['Dört köşesi var.', 'Dört kenarı var.', null, 'Çember kenarı olmayan eğri bir şekildir.'],
      },
      {
        prompt: { text: 'Kesenler d₁ doğrusu üzerinde kesişiyor. Hangi şekil oluşur?', visual: FIG_UCGEN },
        choices: ['Üçgen', 'Dörtgen', 'Beşgen', 'İki üçgen'],
        answer: 0,
        feedback: [null, 'Kesenler bir köşede buluştu; kaç köşe kaldı?', 'Üç köşe var.', 'Kesişim d₁ üzerinde olduğu için yalnızca bir üçgen oluşur.'],
      },
      {
        prompt: { text: 'Kesenler paralel doğruların arasında kesişiyor. Hangi şekiller oluşur?', visual: FIG_KELEBEK },
        choices: ['Bir dörtgen', 'İki üçgen', 'Bir paralelkenar', 'Bir beşgen'],
        answer: 1,
        feedback: ['Kesişim noktası iki şekli birbirinden ayırıyor.', null, 'Taralı bölgelerin her birinin üç köşesi var.', 'Taralı bölgelerin her birinin üç köşesi var.'],
      },
      {
        prompt: { text: 'd₁ ∥ d₂. Üçgenin tepesinde oluşan a, c ve b açıları yan yana bir doğru açı oluşturuyor. Bu şekil üçgenin iç açıları hakkında ne gösterir?', visual: FIG_UCGEN_TOPLAM },
        choices: ['İç açılarının ölçüleri toplamı 180°’dir.', 'İç açılarının ölçüleri toplamı 360°’dir.', 'Üçgenin tüm açıları eştir.', 'Üçgenin bir açısı her zaman diktir.'],
        answer: 0,
        explain: 'Tepedeki a ve b açıları, tabandaki açıların iç ters açılarıdır. a + c + b bir doğru açıdır: 180°.',
        feedback: [null, '360° bir tam açıdır; burada açılar bir doğru açı oluşturuyor.', 'a, b ve c farklı büyüklükte olabilir.', 'Şekildeki üçgenin hiç dik açısı yok.'],
      },
      {
        prompt: 'Bir üçgende bir dış açının ölçüsü neye eşittir?',
        choices: ['Komşu iç açısına', 'Kendisine komşu olmayan iki iç açının ölçüleri toplamına', '180°’ye', 'Üç iç açının ölçüleri toplamına'],
        answer: 1,
        feedback: ['Dış açı ile komşu iç açısı bütünlerdir; eş değil.', null, 'Dış açı ile komşu iç açının toplamı 180°’dir.', 'Üç iç açının toplamı 180°’dir.'],
      },
      {
        prompt: 'Paralelkenarda ardışık (komşu) iki iç açının ölçüleri toplamı kaç derecedir?',
        choices: ['90°', '360°', 'Bu açılar eştir.', '180°'],
        answer: 3,
        feedback: ['Komşu açılar paralel kenarları kesen bir kenarla oluşur.', '360° dört açının toplamıdır.', 'Karşılıklı açılar eştir; komşu açılar bütünlerdir.', null],
      },
    ],
  },
  {
    id: 'g6-dortgen-onermeleri',
    outcomes: ['MAT.6.3.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Her zaman mı, bazen mi, hiçbir zaman mı?',
    instructions: 'Her önermeyi düşün: her zaman mı doğru, bazen mi, hiçbir zaman mı? Uygun gruba taşı.',
    level: 2,
    launch: { text: '“Her kare dikdörtgen midir? Her dikdörtgen kare midir?” Bu iki soru aynı mı? Dörtgenler arasındaki “aile ilişkilerini” keşfedelim.' },
    reflect: 'Karenin aynı zamanda bir dikdörtgen, bir eşkenar dörtgen ve bir paralelkenar olduğunu söyleyebilir miyiz? Dörtgenleri bir “aile ağacı” olarak çiz.',
    categories: [
      { id: 'her', label: 'Her zaman doğru', color: '#22c55e' },
      { id: 'bazen', label: 'Bazen doğru', color: '#f59e0b' },
      { id: 'hic', label: 'Hiçbir zaman doğru değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Bir kare bir dikdörtgendir.', category: 'her', explain: 'Karenin dört açısı da diktir; dikdörtgenin tüm özelliklerini taşır.' },
      { content: 'Bir eşkenar dörtgenin karşılıklı kenarları paraleldir.', category: 'her', explain: 'Eşkenar dörtgen bir paralelkenardır.' },
      { content: 'Bir paralelkenarın komşu iki açısının toplamı 180°’dir.', category: 'her', explain: 'Komşu açılar, paralel kenarları kesen bir kenarla oluşur; bütünlerdir.' },
      { content: 'Bir dörtgenin iç açılarının ölçüleri toplamı 360°’dir.', category: 'her', explain: 'Her dörtgen bir köşegenle iki üçgene ayrılır: 2 × 180° = 360°.' },
      { content: 'Bir dikdörtgen karedir.', category: 'bazen', explain: 'Yalnızca dört kenarı eşitse karedir.' },
      { content: 'Bir eşkenar dörtgenin açıları diktir.', category: 'bazen', explain: 'Kare olan eşkenar dörtgenin açıları diktir; diğerlerininki değil.' },
      { content: 'Bir paralelkenarın tüm kenarları eşittir.', category: 'bazen', explain: 'Eşkenar dörtgen ya da kare olan paralelkenarlarda doğrudur.' },
      { content: 'Bir üçgenin iç açılarının ölçüleri toplamı 360°’dir.', category: 'hic', explain: 'Üçgenin iç açıları toplamı her zaman 180°’dir.' },
      { content: 'Bir dörtgenin dört açısı da geniş açıdır.', category: 'hic', explain: 'Dört geniş açının toplamı 360°’yi geçer.' },
      { content: 'Bir paralelkenarın yalnızca bir açısı diktir.', category: 'hic', explain: 'Bir açı dikse komşuları 180° − 90° = 90° olur; hepsi dik olur.' },
    ],
  },
  {
    id: 'g6-ucgen-dortgen-ic-dis-acilar',
    outcomes: ['MAT.6.3.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'İç ve dış açılar',
    instructions: 'Üçgende iç açılar toplamı 180°, dörtgende 360°; dış açılar toplamı ise ikisinde de 360°’dir. Boşlukları doldur.',
    level: 2,
    launch: { text: 'Bir üçgenin üç köşesini yırtıp yan yana koyarsan ne olur? Peki bir dörtgenin dört köşesini?' },
    reflect: 'Dörtgenin iç açıları toplamının 360° olduğunu üçgenden yararlanarak nasıl gösterirsin?',
    items: [
      { text: 'Bir üçgenin iki iç açısı 50° ve 70° ise üçüncü iç açısı __°', answers: ['60'], hints: ['Üç iç açının toplamı kaç derece?'] },
      { text: 'Bir dörtgenin üç iç açısı 80°, 95° ve 100° ise dördüncü iç açısı __°', answers: ['85'], hints: ['Dört iç açının toplamı kaç derece?'] },
      { text: 'Bir üçgende iki iç açı 45° ve 65° ise bunlara komşu olmayan dış açı __°', answers: ['110'], hints: ['Üçüncü iç açıyı bul; dış açı ona komşu ve bütünler.'] },
      { text: 'Bir üçgenin iki dış açısı 120° ve 130° ise üçüncü dış açısı __°', answers: ['110'], hints: ['Dış açıların toplamı kaç derece?'] },
      { text: 'Bir dörtgenin dış açılarının ölçüleri toplamı __°', answers: ['360'] },
      { text: 'Bir yamukta aynı yan kenar üzerindeki iki iç açıdan biri 72° ise diğeri __°', answers: ['108'], hints: ['Yan kenar, iki paralel doğruyu kesen bir kesendir.', 'Bu iki açı kesenin aynı tarafında ve paralel doğruların arasında; toplamları kaç?'] },
      { text: 'Bir paralelkenarın bir iç açısı 65° ise ona komşu iç açı __°', answers: ['115'] },
    ],
  },
  {
    id: 'g6-dortgen-hangisi-farkli',
    outcomes: ['MAT.6.3.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Şekiller ve açılar',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['Kare', 'Dikdörtgen', 'Eşkenar dörtgen', 'Yamuk'],
        answer: 0,
        reasons: ['Hem dört açısı dik hem dört kenarı eş olan tek dörtgen.', 'Dört açısı dik olup kenarlarının hepsi eş olmak zorunda olmayan tek dörtgen.', 'Köşegenleri birbirine dik ama eşit uzunlukta olmayan tek dörtgen.', 'Paralelkenar olmak zorunda olmayan tek dörtgen; yalnızca bir çift paralel kenarı olabilir.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['50°, 60°, 70°', '90°, 45°, 45°', '60°, 60°, 60°', '30°, 30°, 120°'],
        answer: 0,
        reasons: ['Tüm açıları birbirinden farklı olan tek üçgen.', 'Dik açısı olan tek üçgen.', 'Tüm açıları eş olan (eşkenar) tek üçgen.', 'Geniş açısı olan tek üçgen.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Komşu bütünler açılar'],
        answer: 0,
        reasons: ['Kesenin aynı tarafında ama farklı kesişim noktalarında olan tek çift.', 'Farklı kesişim noktalarında olup ikisi de paralel doğruların arasında kalan tek çift.', 'Farklı kesişim noktalarında olup ikisi de paralel doğruların dışında kalan tek çift.', 'Aynı kesişim noktasında olan ve eş olmayan (toplamı 180°) tek çift.'],
      },
    ],
  },

  // MAT.6.3.3
  {
    id: 'g6-kosegen-geometri-tahtasi',
    outcomes: ['MAT.6.3.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Köşegenlerden dörtgen kur',
    instructions: GEO_INSTR,
    level: 2,
    launch: { text: 'Uçurtma yapacaksın: iki çıtayı ortalarından çakıştırıp uçlarını iple bağlayacaksın. Çıtaların uzunluğu ve aralarındaki açı uçurtmanın biçimini nasıl değiştirir?', visual: diagonals(160, 100, 90) },
    reflect: 'Köşegenlerin hangi özelliği (eşit olmak, dik olmak) dörtgenin hangi özelliğini belirliyor?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Köşegenleri birbirini ortalayan ve eşit uzunlukta olan bir dörtgen oluştur. Kenarları ızgara çizgileri üzerinde olsun.', target: { sides: 4, rect: true }, hints: ['Köşeleri bir dikdörtgenin köşelerine koymayı dene; köşegenlerini zihninde çiz.'], explain: 'Köşegenleri birbirini ortalayan ve eşit uzunlukta olan dörtgen bir dikdörtgendir.' },
      { prompt: 'Köşegenleri birbirini dik ortalayan ve eşit uzunlukta olan, alanı 16 birimkare olan bir dörtgen oluştur (kenarlar ızgara çizgileri üzerinde).', target: { sides: 4, area: 16, square: true }, explain: 'Köşegenleri birbirini dik ortalayan ve eşit uzunlukta olan dörtgen bir karedir.' },
      { prompt: 'Köşegenleri 6 birim ve 4 birim olan, birbirini dik ortalayan bir dörtgen oluştur. Köşegenleri ızgara çizgileri üzerine yerleştir.', target: { sides: 4, area: 12 }, hints: ['Önce 6 birimlik yatay bir doğru parçası düşün; ortasından geçen 4 birimlik dikey bir doğru parçası çiz.', 'Bu iki doğru parçasının dört ucu dörtgenin köşeleridir.'], explain: 'Bu bir eşkenar dörtgendir. Alanı, köşegenlerinin oluşturduğu 6 × 4 dikdörtgenin yarısıdır: 12 birimkare.' },
    ],
  },
  {
    id: 'g6-kosegenleri-birlestir',
    outcomes: ['MAT.6.3.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Hangi dörtgen oluşur?',
    instructions: 'AC ve BD doğru parçaları birbirini O noktasında ortalıyor. Aynı işaretli parçalar eş uzunluktadır. A, B, C ve D noktaları birleştirilince oluşan dörtgeni bul.',
    level: 2,
    launch: { text: 'İki çubuğu ortalarından çakıştır ve uçlarını birleştir. Çubukların uzunluğunu ve aralarındaki açıyı değiştirdikçe hangi dörtgenler oluşur?' },
    reflect: 'Bir arkadaşın “Köşegenleri dik olan dörtgen karedir.” diyor. Ona hangi örneği gösterirsin?',
    questions: [
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(200, 110, 55) }, choices: ['Kare', 'Paralelkenar', 'Eşkenar dörtgen', 'Dikdörtgen'], answer: 1, explain: 'Köşegenler yalnızca birbirini ortalıyor; eşit uzunlukta ve dik değiller.', feedback: ['Kare için köşegenler hem eşit hem dik olmalı.', null, 'Eşkenar dörtgen için köşegenler dik olmalı.', 'Dikdörtgen için köşegenler eşit uzunlukta olmalı.'] },
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(140, 140, 55) }, choices: ['Dikdörtgen', 'Eşkenar dörtgen', 'Kare', 'Yamuk'], answer: 0, explain: 'Köşegenler birbirini ortalıyor ve eşit uzunlukta, fakat dik değil.', feedback: [null, 'Köşegenler dik değil.', 'Kare için köşegenler dik olmalı.', 'Köşegenleri birbirini ortalayan dörtgen bir paralelkenardır.'] },
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(200, 110, 90) }, choices: ['Dikdörtgen', 'Kare', 'Yamuk', 'Eşkenar dörtgen'], answer: 3, explain: 'Köşegenler birbirini dik ortalıyor, fakat eşit uzunlukta değil.', feedback: ['Köşegenler eşit uzunlukta değil.', 'Kare için köşegenler eşit uzunlukta da olmalı.', 'Köşegenleri birbirini ortalayan dörtgen bir paralelkenardır.', null] },
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(140, 140, 90) }, choices: ['Eşkenar dörtgen', 'Kare', 'Dikdörtgen', 'Yamuk'], answer: 1, explain: 'Köşegenler birbirini dik ortalıyor ve eşit uzunlukta.', feedback: ['Köşegenler eşit uzunlukta da; daha özel bir dörtgen.', null, 'Köşegenler dik de; daha özel bir dörtgen.', 'Köşegenleri birbirini ortalayan dörtgen bir paralelkenardır.'] },
      { prompt: 'Dikdörtgenin köşegenleri için hangisi her zaman doğrudur?', choices: ['Birbirine diktir.', 'Eşit uzunluktadır ve birbirini ortalar.', 'Eşit uzunlukta değildir.', 'Birbirini ortalamaz.'], answer: 1, feedback: ['Yalnızca kare olan dikdörtgenlerde köşegenler diktir.', null, 'Dikdörtgenin köşegenleri her zaman eşittir.', 'Dikdörtgen bir paralelkenardır; köşegenleri birbirini ortalar.'] },
      { prompt: 'Hangi dörtgenin köşegenleri hem eşit uzunlukta hem de birbirine diktir?', choices: ['Dikdörtgen', 'Paralelkenar', 'Eşkenar dörtgen', 'Kare'], answer: 3, feedback: ['Dikdörtgenin köşegenleri eşit ama dik olmayabilir.', 'Paralelkenarın köşegenleri genelde ne eşit ne dik.', 'Eşkenar dörtgenin köşegenleri dik ama eşit olmayabilir.', null] },
    ],
  },
  {
    id: 'g6-kosegen-ozellikleri',
    outcomes: ['MAT.6.3.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Köşegenlerden dörtgene',
    instructions: 'Köşegen özelliğini, bu köşegenlerle oluşan dörtgenle eşleştir.',
    level: 2,
    launch: { text: 'Dörtgenleri yalnızca kenarlarına ve açılarına göre değil, köşegenlerine göre de tanıyabiliriz.' },
    reflect: 'Köşegen özellikleri listesine bir özellik eklendikçe dörtgen nasıl “özelleşiyor”? Paralelkenardan kareye giden yolu anlat.',
    pairs: [
      { left: 'Köşegenleri birbirini ortalar.', right: 'Paralelkenar' },
      { left: 'Köşegenleri birbirini ortalar ve eşit uzunluktadır.', right: 'Dikdörtgen' },
      { left: 'Köşegenleri birbirini dik ortalar.', right: 'Eşkenar dörtgen' },
      { left: 'Köşegenleri birbirini dik ortalar ve eşit uzunluktadır.', right: 'Kare' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-kosegen-uzunluklari',
    outcomes: ['MAT.6.3.3'],
    type: 'fill',
    stage: 'problem',
    title: 'Uçurtmalar ve pencereler',
    instructions: 'Köşegenlerin birbirini ortaladığını ve eşitlik durumlarını kullanarak boşlukları doldur.',
    level: 2,
    launch: { text: 'Bir marangoz pencere çerçevesinin dikdörtgen olup olmadığını köşegenlerini ölçerek kontrol ediyor. Neden köşegenler?' },
    reflect: 'Marangozun “Köşegenler eşitse çerçeve dikdörtgendir.” demesi her zaman doğru mu? Köşegenlerin birbirini ortalaması da gerekir mi?',
    items: [
      { text: 'Paralelkenar biçimindeki bir uçurtmanın çıtaları O noktasında kesişiyor. |AO| = 25 cm ise |AC| çıtası __ cm', answers: ['50'], hints: ['Köşegenler birbirini ortalıyorsa O, AC’nin neresidir?'] },
      { text: 'Dikdörtgen bir pencerenin bir köşegeni 120 cm ise diğer köşegeni __ cm', answers: ['120'] },
      { text: 'Dikdörtgen bir tablonun köşegenleri O’da kesişiyor. |AC| = 80 cm ise |BO| = __ cm', answers: ['40'], hints: ['|BD| kaç cm? O noktası BD’yi nasıl böler?'] },
      { text: 'Kare bir karonun bir köşegeni 30 cm ise diğer köşegeni __ cm', answers: ['30'] },
      { text: 'Eşkenar dörtgen biçimindeki bir uçurtmanın çıtaları arasındaki açı __°', answers: ['90'] },
      { text: 'KLMN paralelkenarında köşegenler O’da kesişiyor. |KO| = 7 cm ve |LO| = 4 cm ise |KM| + |LN| = __ cm', answers: ['22'], hints: ['|KM| = 2 · |KO| ve |LN| = 2 · |LO|'] },
      { text: 'Bir marangoz eşit uzunluktaki iki çıtayı ortalarından çakıştırdı ama çıtalar dik değil. Uçları birleştirince bir __ oluşur.', answers: ['dikdörtgen'], choices: ['dikdörtgen', 'kare', 'eşkenar dörtgen', 'yamuk'] },
    ],
  },

  // MAT.6.3.4
  {
    id: 'g6-aci-olustur',
    outcomes: ['MAT.6.3.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Açıyı hesapla ve oluştur',
    instructions: 'Önce bilinmeyen açıyı hesapla, sonra açıölçerle o açıyı oluştur.',
    level: 2,
    launch: { text: 'Bir uçurtma tasarlıyorsun ve çıtaları tam doğru açılarla kesmen gerekiyor. Önce hesapla, sonra açıölçerle oluştur!' },
    reflect: 'Hesapladığın açının dar mı geniş mi olacağını hesaplamadan önce tahmin edebilir miydin? Nasıl?',
    tool: 'angle',
    tasks: [
      { prompt: 'Bir üçgenin iki açısı 50° ve 60°’dir. Üçüncü açıyı oluştur.', target: { degrees: 70 }, hints: ['Üç açının toplamı 180° olmalı.'], explain: '180° − (50° + 60°) = 70°' },
      { prompt: 'Bir paralelkenarın bir açısı 65°’dir. Ona komşu olan açıyı oluştur.', target: { degrees: 115 }, explain: 'Paralelkenarda komşu açılar bütünlerdir: 180° − 65° = 115°.' },
      { prompt: 'Bir ikizkenar üçgenin taban açıları 75°’dir. Tepe açısını oluştur.', target: { degrees: 30 }, explain: '180° − 2 · 75° = 30°' },
      { prompt: 'Bir yamukta aynı yan kenar üzerindeki açılardan biri 105°’dir. Diğerini oluştur.', target: { degrees: 75 }, hints: ['Yan kenar, paralel tabanları kesen bir kesendir.'], explain: 'Aynı yan kenar üzerindeki açılar bütünlerdir: 180° − 105° = 75°.' },
    ],
  },
  {
    id: 'g6-aci-problemleri',
    outcomes: ['MAT.6.3.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Şekildeki açıyı bul',
    instructions: 'Şekildeki bilgileri kullanarak bilinmeyen açıyı bul.',
    level: 2,
    launch: { text: 'Şekildeki bilgilerden bilinmeyen açıyı bulmak bir dedektif işi gibidir: hangi ipucu (paralellik, üçgen, dörtgen) işine yarar?' },
    reflect: 'Bir açıyı bulmak için birden fazla yol kullanabildiğin bir soru oldu mu? Hangi yolu seçtin, neden?',
    questions: [
      { prompt: { text: 'd₁ ∥ d₂ ise x kaç derecedir?', visual: parallel(65, { marks: [{ pos: 2, text: '65°' }, { pos: 6, text: 'x', color: INDIGO }] }) }, choices: ['65°', '115°', '25°', '130°'], answer: 0, explain: 'Yöndeş açılar eştir.', feedback: [null, '115° komşu açı olurdu; x ile 65° aynı yöne bakıyor.', '25° tümler olurdu; burada dik açı yok.', 'Yöndeş açılar eştir; iki katı değil.'] },
      { prompt: { text: 'd₁ ∥ d₂ ise x kaç derecedir?', visual: parallel(65, { marks: [{ pos: 2, text: '65°' }, { pos: 5, text: 'x', color: INDIGO }] }) }, choices: ['65°', '115°', '125°', '95°'], answer: 1, explain: 'x, 65°’lik açının yöndeşine komşudur: 180° − 65° = 115°.', feedback: ['x ile 65°’lik açı aynı yöne bakmıyor; x geniş bir açı.', null, '180° − 65° işlemini yeniden yap.', '180° − 65° işlemini yeniden yap.'] },
      { prompt: { text: 'd₁ ∥ d₂ ise x kaç derecedir?', visual: parallel(58, { marks: [{ pos: 3, text: '122°' }, { pos: 5, text: 'x', color: INDIGO }] }) }, choices: ['58°', '132°', '122°', '90°'], answer: 2, explain: 'İç ters açılar eştir.', feedback: ['58° komşu açı olurdu; x ile 122° iç ters açılar.', '122° + 10° değil; iç ters açılar eştir.', null, 'Şekilde dik açı yok.'] },
      { prompt: { text: 'Üçgende x kaç derecedir?', visual: polyFig(TRI, ['50°', '60°', 'x']) }, choices: ['70°', '110°', '80°', '250°'], answer: 0, explain: '180° − (50° + 60°) = 70°', feedback: [null, '110° = 50° + 60°; bu, x’e komşu dış açı olurdu.', '180° − 110° işlemini yeniden yap.', 'Üçgenin iç açıları toplamı 180°, 360° değil.'] },
      { prompt: { text: 'İkizkenar üçgende taban açıları eştir (x). x kaç derecedir?', visual: polyFig(TRI, ['x', 'x', '40°']) }, choices: ['70°', '140°', '40°', '80°'], answer: 0, explain: '(180° − 40°) ÷ 2 = 70°', feedback: [null, '140° iki taban açısının toplamı; bir tanesi bunun yarısı.', 'Tepe açısı 40°; taban açıları ona eşit değil.', '(180° − 40°) ÷ 2 işlemini yeniden yap.'] },
      { prompt: { text: 'Dörtgende x kaç derecedir?', visual: polyFig(QUAD, ['80°', '100°', '95°', 'x']) }, choices: ['85°', '95°', '175°', '265°'], answer: 0, explain: '360° − (80° + 100° + 95°) = 85°', feedback: [null, 'Dörtgenin iç açıları toplamı 360°; hesabını kontrol et.', 'İç açılar toplamını 180° aldın; dörtgende 360°.', '360° − 95° yaptın; diğer iki açıyı da çıkar.'] },
    ],
  },
  {
    id: 'g6-ucgen-dortgen-aci-hesapla',
    outcomes: ['MAT.6.3.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Üçgen ve dörtgenlerde açılar',
    instructions: 'Üçgen ve dörtgenlerin açı özelliklerini kullanarak bilinmeyen açıyı bul.',
    level: 2,
    launch: { text: 'Üçgenin iç açıları toplamı 180°, dörtgeninki 360°. Bu iki bilgiyle kaç farklı açı problemi çözebiliriz?' },
    reflect: 'Eşkenar dörtgende bir açı verilince diğer üç açıyı nasıl buldun?',
    items: [
      { text: 'ABC üçgeninde A açısı 50°, B açısı 60° ise C açısı __°', answers: ['70'] },
      { text: 'Bir dik üçgende dar açılardan biri 35° ise diğer dar açı __°', answers: ['55'], hints: ['Dik açı 90°; geriye kaç derece kalır?'] },
      { text: 'Eşkenar üçgenin bir iç açısı __°', answers: ['60'], hints: ['Üç açı eş ve toplamları 180°.'] },
      { text: 'Bir paralelkenarın bir açısı 70° ise bu açının karşısındaki açı __°', answers: ['70'] },
      { text: 'Bir eşkenar dörtgenin bir açısı 40° ise ona komşu açı __°', answers: ['140'], hints: ['Eşkenar dörtgen bir paralelkenardır; komşu açılar ne olur?'] },
      { text: 'Karenin bir köşegeni ile bir kenarı arasındaki açı __°', answers: ['45'], hints: ['Köşegen karenin dik açısını iki eş parçaya böler.'] },
      { text: 'Bir dikdörtgenin köşegeni bir köşede kenarlardan biriyle 30° açı yapıyorsa aynı köşede diğer kenarla __° açı yapar.', answers: ['60'], hints: ['Köşedeki açı 90°.'] },
    ],
  },
  {
    id: 'g6-aci-problemleri-yasam',
    outcomes: ['MAT.6.3.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Açılarla gerçek hayat problemleri',
    instructions: 'Önce durumu bir şekille çiz; sonra bilinmeyen açıyı bul.',
    level: 2,
    launch: { text: 'Mimarlar, marangozlar ve uçurtma yapanlar açılarla sürekli problem çözer. Önce bir şekil çizmek işini kolaylaştırır.' },
    reflect: 'Bu problemlerden birinde önce şekil çizmek işine yaradı mı? Çizimin nasıl görünüyordu?',
    questions: [
      { prompt: 'Ayşe eşkenar dörtgen biçiminde bir uçurtma yapıyor. Uçurtmanın bir açısı 70°’dir. Bu açıya komşu olan açı kaç derecedir?', choices: ['70°', '110°', '140°', '290°'], answer: 1, explain: 'Eşkenar dörtgenin komşu açıları bütünlerdir: 180° − 70° = 110°.', feedback: ['70°’lik açının karşısındaki açı 70° olur; komşu açı farklıdır.', null, '140° iki 70°’lik açının toplamı.', '360° − 70° = 290°; bu üç açının toplamı.'] },
      { prompt: 'Yere dik bir duvara yaslanan merdiven yerle 65°’lik açı yapıyor. Merdiven ile duvar arasındaki açı kaç derecedir?', choices: ['35°', '115°', '25°', '65°'], answer: 2, explain: 'Merdiven, duvar ve yer bir dik üçgen oluşturur: 180° − 90° − 65° = 25°.', feedback: ['90° − 65° işlemini yeniden yap.', '115°, 65°’nin bütünleri; ama burada bir dik üçgen var.', null, 'Merdiven duvarla ve yerle aynı açıyı yapmaz.'] },
      { prompt: 'Bir ikizkenar üçgenin tepe açısı 40°’dir. Taban açılarından birinin ölçüsü kaç derecedir?', choices: ['70°', '40°', '140°', '80°'], answer: 0, explain: '(180° − 40°) ÷ 2 = 70°', feedback: [null, 'Taban açıları tepe açısına eşit değil; birbirine eşit.', '140° iki taban açısının toplamı.', '(180° − 40°) ÷ 2 işlemini yeniden yap.'] },
      { prompt: 'Yamuk biçimindeki bir bahçenin iki açısı 60° ve 75°’dir. Diğer iki açısının ölçüleri toplamı kaç derecedir?', choices: ['135°', '180°', '225°', '300°'], answer: 2, explain: '360° − (60° + 75°) = 225°', feedback: ['135° verilen iki açının toplamı.', 'Dörtgenin iç açıları toplamı 360°; 180° değil.', null, '360° − 60° yaptın; 75°’yi de çıkar.'] },
      { prompt: 'Paralelkenar biçimindeki bir parkın bir açısı, komşu açısının 2 katıdır. Küçük açı kaç derecedir?', choices: ['60°', '90°', '120°', '45°'], answer: 0, explain: 'Komşu açılar bütünler: x + 2x = 180°, x = 60°.', feedback: [null, 'İki açı eşit olurdu; ama biri diğerinin 2 katı.', '120° büyük açı.', '45° ve 90° toplamı 180° etmez.'] },
      { prompt: 'Dikdörtgen bir pencerenin köşegeni, bir köşede uzun kenarla 35°’lik açı yapıyor. Aynı köşede kısa kenarla kaç derecelik açı yapar?', choices: ['55°', '35°', '145°', '65°'], answer: 0, explain: 'Köşedeki açı 90°: 90° − 35° = 55°.', feedback: [null, 'Köşegen dik açıyı iki eş parçaya bölmüyor; bu kare değil.', '145° = 180° − 35°; ama köşedeki açı 90°.', '90° − 35° işlemini yeniden yap.'] },
    ],
  },

  // ── İşlemlerle Cebirsel Düşünme ve Değişimler ───────────────────────────

  // MAT.6.2.1
  {
    id: 'g6-cebir-karolari',
    outcomes: ['MAT.6.2.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Cebir karolarıyla modelle',
    instructions: 'Uzun yeşil karo x’i, küçük sarı karo 1’i gösterir. İfadeyi karolarla oluştur.',
    level: 1,
    launch: { text: 'Kantinde bir poğaça x TL. 2 poğaça ve 3 TL’lik bir meyve suyu alan birinin ödediği tutarı karolarla nasıl gösterirsin?' },
    reflect: '3(x + 1) ile 3x + 3 karolarla neden aynı görünüyor? Bir arkadaşına göster.',
    tool: 'algebra',
    tasks: [
      { prompt: '2x + 3 ifadesini modelle.', target: { x2: 0, x: 2, c: 3 }, explain: '2 tane x karosu ve 3 tane birim karo: iki poğaça ve 3 TL.' },
      { prompt: 'x + 2x + 1 ifadesini modelle.', target: { x2: 0, x: 3, c: 1 }, explain: 'x + 2x = 3x; ifade 3x + 1’e denktir.' },
      { prompt: '3(x + 1) ifadesini modelle.', target: { x2: 0, x: 3, c: 3 }, hints: ['(x + 1) grubundan 3 tane yap.'], explain: 'Üç tane (x + 1) grubu: 3 tane x ve 3 tane 1. Yani 3(x + 1) = 3x + 3.' },
      { prompt: 'Kenar uzunlukları x birim ve 2 birim olan dikdörtgenin çevre uzunluğunu gösteren ifadeyi modelle.', target: { x2: 0, x: 2, c: 4 }, hints: ['Dikdörtgenin dört kenarı var: x, 2, x, 2.'], explain: 'x + 2 + x + 2 = 2x + 4' },
    ],
  },
  {
    id: 'g6-ifade-tablo',
    outcomes: ['MAT.6.2.1'],
    type: 'fill',
    stage: 'model',
    title: 'Tablodan ve şeritten ifadeye',
    instructions: 'Tabloyu ya da şeridi incele; durumu gösteren cebirsel ifadeyi seç.',
    level: 1,
    launch: {
      text: 'Okul kütüphanesi için tişört satışı yapılacak. Her tişörtten 80 TL kâr ediliyor. Kaç tişört satılacağını bilmiyoruz; o hâlde kârı nasıl yazarız?',
      visual: { kind: 'table', headers: ['Tişört sayısı', '1', '2', '3', 't'], rows: [['Kâr (TL)', 80, 160, 240, '?']] },
    },
    reflect: 'Tabloda “t” yazan sütun ne anlama geliyor? Bir harfin “herhangi bir sayı olabilir” demesi sana neyi kolaylaştırıyor?',
    items: [
      { text: 'Tabloya göre t tişört satılınca kâr __ TL olur.', answers: ['80t'], choices: ['80t', 't + 80', '80', '240t'], visual: { kind: 'table', headers: ['Tişört sayısı', '1', '2', '3', 't'], rows: [['Kâr (TL)', 80, 160, 240, '?']] }, hints: ['Tişört sayısı 1 artınca kâr kaç TL artıyor?'] },
      { text: 'Alttaki şerit Ahmet’in parasını (x TL), üstteki Mehmet’in parasını gösteriyor. Mehmet’in parası __ TL', answers: ['x + 8'], choices: ['x + 8', '8x', 'x − 8', '8'], visual: { kind: 'tape', parts: [{ label: 'x', value: 5 }, { label: '8', value: 2 }], compare: [{ label: 'x', value: 5 }] } },
      { text: 'Üç kardeşin her birinin a tane bilyesi var. Toplam bilye sayısı __', answers: ['3a'], choices: ['3a', 'a + 3', 'a', '3'], visual: { kind: 'tape', parts: [{ label: 'a', value: 1 }, { label: 'a', value: 1 }, { label: 'a', value: 1 }], total: '?' } },
      { text: 'Kumbarada başta 20 TL var, her gün 5 TL ekleniyor. g gün sonra kumbarada __ TL olur.', answers: ['20 + 5g'], choices: ['20 + 5g', '25g', '5 + 20g', '20g'], visual: { kind: 'table', headers: ['Gün', '1', '2', '3', 'g'], rows: [['Para (TL)', 25, 30, 35, '?']] }, hints: ['1. gün: 20 + 5, 2. gün: 20 + 5 + 5... g. gün?'] },
      { text: 'y TL’lik bir hediyenin parası iki kardeş arasında eşit paylaşılırsa kişi başına __ TL düşer.', answers: ['y ÷ 2'], choices: ['y ÷ 2', '2y', 'y − 2', 'y + 2'], visual: { kind: 'tape', parts: [{ label: '?', value: 1 }, { label: '?', value: 1 }], total: 'y' } },
      { text: 'Barınaktaki her kedinin günlük maması 2 kutudur. k kedi için günde __ kutu mama gerekir.', answers: ['2k'], choices: ['2k', 'k + 2', 'k − 2', '2'], hints: ['1 kedi 2 kutu, 2 kedi 4 kutu, 3 kedi ... kutu.'] },
    ],
  },
  {
    id: 'g6-sozel-cebirsel',
    outcomes: ['MAT.6.2.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Sözelden cebirsele',
    instructions: 'Her sözel ifadeyi onu gösteren cebirsel ifadeyle eşleştir.',
    level: 1,
    launch: { text: 'Harizmi cebiri sözcüklerle yazardı. Bugün aynı düşünceleri kısaca harflerle yazıyoruz. Sözcüklerle harfler arasında çeviri yapalım!' },
    reflect: '“Bir sayının 2 katının 5 eksiği” ile “bir sayının 5 eksiğinin 2 katı” neden farklı ifadeler? Bir sayı seçerek göster.',
    pairs: [
      { left: 'Bir sayının 4 fazlası', right: 'x + 4' },
      { left: 'Bir sayının 4 eksiği', right: 'x − 4' },
      { left: 'Bir sayının 3 katı', right: '3x' },
      { left: 'Bir sayının yarısı', right: '[[x/2]]' },
      { left: 'Bir sayının 2 katının 5 eksiği', right: '2x − 5' },
      { left: 'Bir sayının 5 eksiğinin 2 katı', right: '2(x − 5)' },
      { left: 'Kenar uzunlukları x ve y olan dikdörtgenin çevre uzunluğu', right: '2x + 2y' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-denk-ifadeler',
    outcomes: ['MAT.6.2.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Denk ifadeleri grupla',
    instructions: 'Her ifadeyi, kendisine denk olan ifadenin grubuna taşı.',
    level: 3,
    launch: { text: '4a, “a + 3a” ile de “a · 4” ile de yazılabilir. Aynı büyüklüğü farklı yazmanın kaç yolu var?' },
    reflect: 'İki ifadenin denk olduğunu nasıl sınarsın? x yerine birkaç farklı sayı koymak bu konuda neden işe yarar?',
    categories: [
      { id: 'a', label: '3x + 6', color: '#3b82f6' },
      { id: 'b', label: '6x', color: '#22c55e' },
      { id: 'c', label: '3x + 2', color: '#f97316' },
    ],
    items: [
      { content: 'x + x + x + 6', category: 'a', explain: 'x + x + x = 3x; ifade 3x + 6’dır.' },
      { content: '3(x + 2)', category: 'a', explain: 'Üç tane (x + 2): 3x + 6.' },
      { content: '2x + x + 6', category: 'a', explain: '2x + x = 3x' },
      { content: '6 · x', category: 'b', explain: '6 · x = 6x' },
      { content: 'x · 6', category: 'b', explain: 'Çarpmada sıra değişebilir: x · 6 = 6x.' },
      { content: '2x + 4x', category: 'b', explain: '2x + 4x = 6x' },
      { content: 'x + 2x + 2', category: 'c', explain: 'x + 2x = 3x; ifade 3x + 2’dir.' },
      { content: '2 + 3x', category: 'c', explain: 'Toplamada sıra değişebilir.' },
      { content: '3 · x + 2', category: 'c', explain: '3 · x = 3x' },
    ],
  },
  {
    id: 'g6-cebirsel-ifade-kavramlari',
    outcomes: ['MAT.6.2.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Değişken, katsayı, sabit terim',
    instructions: 'Cebirsel ifadeleri ve gerçek hayattaki anlamlarını yorumla.',
    level: 2,
    launch: { text: 'Mehmet’in parası Ahmet’in parasından 8 TL fazla. Ahmet’in parası değiştikçe Mehmet’in parası da değişir. Harfler bu değişimi anlatmanın kısa yoludur.' },
    reflect: '“x + 8” ifadesindeki x ve 8’in bu durumda ne anlama geldiğini kendi cümlelerinle anlat.',
    questions: [
      { prompt: '5x + 7 cebirsel ifadesinde x’in katsayısı kaçtır?', choices: ['5', '7', 'x', '12'], answer: 0, feedback: [null, '7 sabit terimdir; x’e bağlı değildir.', 'x değişkendir; katsayı x’in önündeki sayıdır.', 'Katsayı ile sabit terim toplanmaz.'] },
      { prompt: '5x + 7 cebirsel ifadesinde sabit terim hangisidir?', choices: ['5', '5x', '7', 'x'], answer: 2, feedback: ['5, x’in katsayısıdır.', '5x değişkenli bir terimdir; x değiştikçe değişir.', null, 'x değişkendir.'] },
      { prompt: '3a + 2b + 6 cebirsel ifadesi kaç terimlidir?', choices: ['1', '2', '6', '3'], answer: 3, feedback: ['“+” işaretleriyle ayrılan parçaları say.', 'Sabit terim 6 da bir terimdir.', '6 sabit terimdir, terim sayısı değil.', null] },
      { prompt: 'Kantinde simidin tanesi 9 TL, ayranın tanesi 5 TL’dir. m tane simit ve n tane ayran alan öğrencinin ödeyeceği tutar hangisidir?', choices: ['5m + 9n', '9m + 5n', '14mn', '9 + 5 + m + n'], answer: 1, feedback: ['Fiyatlar yer değiştirmiş: m tane simidin her biri 9 TL.', null, 'Simit ve ayran fiyatları birbiriyle çarpılmaz; ayrı ayrı hesaplanıp toplanır.', 'Her simit için 9 TL ödenir: m simit 9 · m TL eder.'] },
      { prompt: 'Mehmet’in parası Ahmet’in parasından 8 TL fazladır. Mehmet’in parası y TL ise Ahmet’in parası hangisidir?', choices: ['y + 8', '8y', 'y − 8', '[[y/8]]'], answer: 2, feedback: ['Ahmet’in parası Mehmet’inkinden az; 8 eklememelisin.', '“8 fazla”, 8 katı demek değildir.', null, '8’e bölmek “8 fazla” anlamına gelmez.'] },
      { prompt: 'Hangisi 4a ifadesine denk DEĞİLDİR?', choices: ['a + 3a', '2a + a + a', 'a · 4', 'a + 4'], answer: 3, feedback: ['a + 3a = 4a', '2a + a + a = 4a', 'a · 4 = 4 · a = 4a', null] },
      { prompt: 'Bir tişörtün maliyeti 120 TL, satış fiyatı 200 TL’dir. t tane tişört satılınca elde edilen kâr hangi ifadeyle gösterilir?', choices: ['80t', '200t', '320t', '200 + t'], answer: 0, explain: 'Her tişörtten 200 − 120 = 80 TL kâr edilir.', feedback: [null, '200t satıştan gelen toplam para; maliyeti çıkarmadın.', 'Maliyeti ekledin; kârda maliyet çıkarılır.', 'Her tişört için 200 TL gelir; t ile toplanmaz, çarpılır.'] },
      { prompt: '9m + 5n ifadesi aşağıdakilerden hangisini de anlatabilir?', choices: ['Birim fiyatı m TL olan 9 simit ile birim fiyatı n TL olan 5 ayranın toplam fiyatı', '9 simit ile 5 ayranın toplam sayısı', 'm simit ile n ayranın toplam sayısı', '9 ile 5’in çarpımı'], answer: 0, feedback: [null, 'Bu 9 + 5 = 14 olurdu; m ve n nerede?', 'Bu m + n olurdu.', 'm ve n ifadede yer alıyor; yalnızca sayılarla ilgili değil.'] },
    ],
  },

  // MAT.6.2.2
  {
    id: 'g6-oruntu-karolar',
    outcomes: ['MAT.6.2.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Örüntünün kuralını karolarla kur',
    instructions: 'x karosunu adım sayısı (n) olarak düşün. Örüntünün n. terimini gösteren ifadeyi karolarla oluştur.',
    level: 2,
    launch: { text: 'Bir duvara her gün yeni fayanslar döşeniyor: ilk gün 4 fayans var, sonra her gün 3 fayans ekleniyor. 30. günde kaç fayans olur? Tek tek saymadan bulabilir miyiz?' },
    reflect: 'Örüntüdeki her adımdaki artış miktarı ile ifadedeki x karolarının sayısı arasında nasıl bir ilişki var?',
    tool: 'algebra',
    tasks: [
      { prompt: 'Örüntü: 4, 7, 10, 13, ... Her adımda 3 artıyor. n. terimi gösteren ifadeyi modelle.', target: { x2: 0, x: 3, c: 1 }, hints: ['Her adımda kaç artıyor? Bu sayı kaç tane x karosu gerektiğini söyler.', 'n = 1 için 3 · 1 = 3; 4 elde etmek için kaç eklemelisin?'], explain: '3n + 1: n = 1 için 4, n = 2 için 7, n = 3 için 10.' },
      { prompt: 'Örüntü: 5, 7, 9, 11, ... n. terimi gösteren ifadeyi modelle.', target: { x2: 0, x: 2, c: 3 }, explain: 'Her adımda 2 artıyor: 2n + 3.' },
      { prompt: 'Örüntü: 3, 6, 9, 12, ... n. terimi gösteren ifadeyi modelle.', target: { x2: 0, x: 3, c: 0 }, explain: 'Terimler adım sayısının 3 katı: 3n.' },
      { prompt: 'Örüntü: 6, 10, 14, 18, ... n. terimi gösteren ifadeyi modelle.', target: { x2: 0, x: 4, c: 2 }, explain: 'Her adımda 4 artıyor: 4n + 2.' },
    ],
  },
  {
    id: 'g6-kibrit-oruntusu',
    outcomes: ['MAT.6.2.2'],
    type: 'fill',
    stage: 'model',
    title: 'Kibrit çöpü örüntüsü',
    instructions: 'Şekil örüntüsündeki adım sayısı ile terim arasındaki ilişkiyi bul ve boşlukları doldur.',
    level: 2,
    launch: { text: 'Kibrit çöpleriyle yan yana kareler yapılıyor. 1 kare için 4, 2 kare için 7 çöp gerekiyor. 100 kare için kaç çöp gerekir? Tek tek saymadan bulabilir miyiz?', visual: stickSteps([1, 2, 3]) },
    reflect: 'Bir arkadaşın çöp sayısını 4 + 3 · (n − 1), sen 3n + 1 diye yazdın. İkiniz de haklı olabilir misiniz? Şekil üzerinde göster.',
    items: [
      { text: '4. adımda __ kibrit çöpü gerekir.', answers: ['13'], visual: stickSteps([1, 2, 3]), hints: ['1., 2., 3. adımlarda kaç çöp var: 4, 7, 10...?', 'Her yeni kare için kaç çöp ekleniyor?'] },
      { text: '10. adımda __ çöp gerekir.', answers: ['31'], visual: stickSteps([1, 2, 3]), hints: ['İlk dikey çöp + her kare için 3 çöp diye düşünebilirsin.'] },
      { text: 'n. adımdaki çöp sayısı 3n + __', answers: ['1'], visual: stickSteps([1, 2, 3]) },
      { text: '20. adımda __ çöp gerekir.', answers: ['61'], visual: { kind: 'table', headers: ['Adım', '1', '2', '3', '20'], rows: [['Çöp sayısı', 4, 7, 10, '?']] }, hints: ['3 · 20 + 1 = ?'] },
      { text: '100 çöple yan yana en çok __ kare yapılabilir.', answers: ['33'], hints: ['3n + 1 = 100 olacak n’yi ara.', '100 − 1 = 99 çöp, karelere 3’er 3’er dağıtılır.'] },
      { text: 'Noktalar 2 sıra hâlinde diziliyor: 1. adımda 2, 2. adımda 4, 3. adımda 6 nokta var. n. adımda __ nokta olur.', answers: ['2n'], choices: ['2n', 'n + 2', '2n + 1', 'n + 1'], visual: { kind: 'array', rows: 2, cols: 3 } },
    ],
  },
  {
    id: 'g6-oruntu-kurali',
    outcomes: ['MAT.6.2.2'],
    type: 'match',
    stage: 'sembol',
    title: 'Örüntünün kuralı',
    instructions: 'Her sayı örüntüsünü, n. terimini veren cebirsel ifadeyle eşleştir.',
    level: 2,
    launch: { text: 'Bir örüntünün kuralını bulan kişi, 100. terimi de 1.000. terimi de hesaplayabilir. Kuralı bulmak için neye bakarsın?' },
    reflect: '2, 5, 8, 11, ... örüntüsünün kuralının neden 3n − 1 olduğunu artış miktarıyla açıkla.',
    pairs: [
      { left: '5, 10, 15, 20, ...', right: '5n' },
      { left: '2, 5, 8, 11, ...', right: '3n − 1' },
      { left: '6, 7, 8, 9, ...', right: 'n + 5' },
      { left: '1, 3, 5, 7, ...', right: '2n − 1' },
      { left: '4, 7, 10, 13, ...', right: '3n + 1' },
      { left: '7, 12, 17, 22, ...', right: '5n + 2' },
    ],
    perRound: 3,
  },
  {
    id: 'g6-oruntu-ve-cokgenler',
    outcomes: ['MAT.6.2.2'],
    type: 'fill',
    stage: 'problem',
    title: 'Çokgenlerin açılarındaki örüntü',
    instructions: 'Çokgenleri bir köşesinden üçgenlere ayır; iç açılar toplamındaki örüntüyü bul ve genelle.',
    level: 3,
    launch: { text: 'Arıların petekleri düzgün altıgendir; futbol topunda beşgenler ve altıgenler var. Çokgenlerin açılarında bir örüntü saklı mı?', visual: polyTri(6) },
    reflect: 'Kenar sayısı 1 artınca iç açılar toplamı neden hep 180° artıyor? Üçgenlerle açıkla.',
    items: [
      { text: 'Beşgen, bir köşesinden çizilen köşegenlerle 3 üçgene ayrılır. Beşgenin iç açılarının ölçüleri toplamı __°', answers: ['540'], visual: polyTri(5), hints: ['Her üçgenin iç açıları toplamı 180°.'] },
      { text: 'Altıgen, bir köşesinden çizilen köşegenlerle __ üçgene ayrılır.', answers: ['4'], visual: polyTri(6) },
      { text: 'Altıgenin iç açılarının ölçüleri toplamı __°', answers: ['720'], visual: { kind: 'table', headers: ['Kenar sayısı', '3', '4', '5', '6'], rows: [['İç açılar toplamı', '180°', '360°', '540°', '?']] } },
      { text: 'n kenarlı bir çokgenin iç açılarının ölçüleri toplamı (n − __) · 180°', answers: ['2'], hints: ['Dörtgen 2, beşgen 3, altıgen 4 üçgene ayrıldı. Üçgen sayısı kenar sayısından kaç eksik?'] },
      { text: 'Düzgün altıgenin bir dış açısı 360° ÷ 6 = __°', answers: ['60'] },
      { text: 'Düzgün sekizgenin bir iç açısı __°', answers: ['135'], hints: ['Önce bir dış açıyı bul: 360° ÷ 8.', 'İç açı ile dış açı bütünlerdir.'] },
      { text: 'Bir düzgün çokgenin bir dış açısı 30° ise çokgenin __ kenarı vardır.', answers: ['12'], hints: ['Dış açıların ölçüleri toplamı her zaman kaç derece?'] },
    ],
  },

  // MAT.6.2.3
  {
    id: 'g6-algoritma-yorumla',
    outcomes: ['MAT.6.2.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Algoritmayı yorumla',
    instructions: 'Tabloda adım adım verilen algoritmaları incele ve soruları cevapla.',
    level: 2,
    launch: { text: 'Bir bilgisayar programı adımları sırayla uygular. Adımları okuyarak programın hangi cebirsel ifadeyi hesapladığını bulabilir misin?' },
    reflect: 'Bir algoritmayı tabloya ya da cebirsel ifadeye dönüştürmek onu anlamana nasıl yardım etti?',
    questions: [
      { prompt: { text: 'n = 5 girilirse algoritmanın çıktısı ne olur?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'n’yi oku'], [3, 's = 4 · n + 1'], [4, 's’yi yazdır'], [5, 'Bitir']] } }, choices: ['20', '21', '9', '25'], answer: 1, feedback: ['4 · 5 = 20; 1 eklemeyi unutma.', null, '4 + 5 = 9; 4 · n, 4 ile n’nin çarpımıdır.', '4 · 5 + 1 işlemini yeniden yap.'] },
      { prompt: { text: 'Bu algoritma hangi örüntünün n. terimini hesaplar?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'n’yi oku'], [3, 's = 4 · n + 1'], [4, 's’yi yazdır'], [5, 'Bitir']] } }, choices: ['4, 8, 12, 16, ...', '1, 5, 9, 13, ...', '5, 9, 13, 17, ...', '5, 10, 15, 20, ...'], answer: 2, feedback: ['Bu 4n örüntüsü; 1 eklenmemiş.', 'n = 1 için 4 · 1 + 1 = 5 olmalı; ilk terim 1 değil.', null, 'Artış 5 değil, 4 olmalı.'] },
      { prompt: { text: 'Algoritmanın hesapladığı cebirsel ifade hangisidir?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'x’i oku'], [3, 'y = 2 · x'], [4, 'y = y − 3'], [5, 'y’yi yazdır'], [6, 'Bitir']] } }, choices: ['2x − 3', '2(x − 3)', 'x − 6', '3 − 2x'], answer: 0, feedback: [null, 'Önce 2 ile çarpılıyor, sonra 3 çıkarılıyor; sıra önemli.', '2 ile çarpma adımı nerede?', 'Çıkarma 2x’ten yapılıyor: y − 3.'] },
      { prompt: { text: 'Aynı algoritmanın çıktısı 11 ise girilen x kaçtır?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'x’i oku'], [3, 'y = 2 · x'], [4, 'y = y − 3'], [5, 'y’yi yazdır'], [6, 'Bitir']] } }, choices: ['4', '19', '7', '8'], answer: 2, explain: '2 · 7 − 3 = 11. Geriye doğru düşün: 11 + 3 = 14, 14 ÷ 2 = 7.', feedback: ['2 · 4 − 3 = 5; 11 değil.', 'Algoritmayı tersine çalıştırırken işlemleri de tersine çevir.', null, '2 · 8 − 3 = 13; 11 değil.'] },
      { prompt: { text: 'Girdi-çıktı tablosunu oluşturan algoritma hangi ifadeyi hesaplar?', visual: { kind: 'table', headers: ['Girdi (x)', '1', '2', '3', '4'], rows: [['Çıktı', 6, 9, 12, 15]] } }, choices: ['x + 5', '3x', '3x + 3', '6x'], answer: 2, feedback: ['x = 2 için 7 olurdu; tabloda 9.', 'x = 1 için 3 olurdu; tabloda 6.', null, 'x = 2 için 12 olurdu; tabloda 9.'] },
      { prompt: { text: 'Bu algoritma karenin çevre uzunluğunu bulmak için yazılmıştır. Hangi adım hatalıdır?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'Kenar uzunluğu a’yı oku'], [3, 'Ç = a + 4'], [4, 'Ç’yi yazdır'], [5, 'Bitir']] } }, choices: ['3. adım; Ç = 4 · a olmalı', '2. adım; a okunmamalı', '4. adım; Ç yazdırılmamalı', 'Hata yoktur'], answer: 0, feedback: [null, 'Kenar uzunluğu olmadan çevre hesaplanamaz.', 'Sonucu yazdırmak gerekli.', 'a = 5 için çevre 20 olmalı; algoritma 9 buluyor.'] },
    ],
  },
  {
    id: 'g6-algoritma-sirala',
    outcomes: ['MAT.6.2.3'],
    type: 'sort',
    stage: 'sembol',
    title: 'Algoritmayı sırala',
    instructions: 'Algoritmanın adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Bir yemek tarifinde adımların sırası değişirse ne olur? Algoritmalarda da sıra çok önemlidir.' },
    reflect: '“Aklından bir sayı tut” oyununda sonuç neden hep 4 çıkıyor? Cebirsel ifadelerle açıkla.',
    rounds: [
      { prompt: 'Kuralı 3n + 2 olan örüntünün n. terimini hesaplayan algoritma', items: ['Başla', 'n değerini al', 'n’yi 3 ile çarp', 'Çarpıma 2 ekle', 'Sonucu yazdır', 'Bitir'] },
      { prompt: 'Kantinden m simit (tanesi 9 TL) ve n ayran (tanesi 5 TL) alan öğrencinin ödeyeceği tutarı bulan algoritma', items: ['Başla', 'm ve n değerlerini al', 'T = 9 · m hesapla', 'T’ye 5 · n ekle', 'T’yi yazdır', 'Bitir'] },
      { prompt: '“Aklından bir sayı tut” oyununun algoritması (sonuç hep 4 çıkar)', items: ['Bir sayı tut: x', '2 ile çarp: 2x', '8 ekle: 2x + 8', '2’ye böl: x + 4', 'Tuttuğun sayıyı çıkar: 4'] },
    ],
  },
  {
    id: 'g6-algoritma-ciktisi',
    outcomes: ['MAT.6.2.3'],
    type: 'fill',
    stage: 'problem',
    title: 'Girdi ve çıktı',
    instructions: 'Algoritmayı adım adım uygula, tersine çalıştır ya da cebirsel ifadesini yaz.',
    level: 2,
    launch: { text: 'Bir taksi açılışta 40 TL, her kilometre için 25 TL alıyor. Taksimetre aslında bir algoritma çalıştırıyor!' },
    reflect: 'Çıktısı verilen bir algoritmanın girdisini bulurken nasıl düşündün? İşlemleri neden tersine çevirdin?',
    items: [
      { text: 'Algoritma: “x’i 2 ile çarp, 3 ekle.” Girdi x = 4 ise çıktı __', answers: ['11'] },
      { text: 'Aynı algoritmada çıktı 17 ise girdi x = __', answers: ['7'], hints: ['Son adımdan geriye doğru git: 3 eklendiyse önce 3 çıkar.'] },
      { text: 'Algoritma: “n’yi oku, 5 ile çarp, 2 çıkar, yazdır.” Cebirsel ifadesi 5n − __', answers: ['2'] },
      { text: '“Bir sayı tut, 3 ekle, sonucu 2 ile çarp.” algoritmasının ifadesi 2(x + __)', answers: ['3'] },
      { text: 'Algoritma: “a’yı oku, a ile a’yı topla, sonuca a ekle.” Sonuç __a', answers: ['3'] },
      { text: 'Taksi ücreti T = 40 + 25 · k. k = 6 km için T = __ TL', answers: ['190'], hints: ['Önce 25 · 6’yı hesapla.'] },
      { text: 'Aynı taksi algoritmasında T = 290 TL ise yolculuk __ km sürmüştür.', answers: ['10'], hints: ['Açılış ücretini çıkar: 290 − 40.', 'Kalanın içinde kaç tane 25 var?'] },
    ],
  },
  {
    id: 'g6-cebir-hangisi-farkli',
    outcomes: ['MAT.6.2.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? İfadeler ve örüntüler',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['4a', 'a + 4', '2a + 2a', '4 + 4a'],
        answer: 0,
        reasons: ['Tek terimden oluşan tek ifade.', 'a’nın katsayısı 1 olan tek ifade.', '4a’ya denk olduğu hâlde iki terimle yazılmış tek ifade.', 'Hem sabit terimi hem a’nın katsayısı 4 olan; 4(a + 1) biçiminde de yazılabilen tek ifade.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['1, 4, 7, 10, ...', '3, 6, 9, 12, ...', '2, 4, 8, 16, ...', '5, 8, 11, 14, ...'],
        answer: 0,
        reasons: ['Terimleri 3’e bölündüğünde hep 1 kalanını veren tek örüntü.', 'Terimleri adım sayısının tam 3 katı olan (3n) tek örüntü; sabit terimi yok.', 'Sabit bir sayı eklenerek değil, 2 ile çarpılarak ilerleyen tek örüntü.', 'İlk terimi 5 olan; terimleri 3’e bölündüğünde hep 2 kalanını veren tek örüntü.'],
      },
    ],
  },

  // ── Geometrik Nicelikler ────────────────────────────────────────────────

  // MAT.6.4.1
  {
    id: 'g6-metrekare-model',
    outcomes: ['MAT.6.4.1'],
    type: 'fill',
    stage: 'model',
    title: 'Metrekareyi küçük karelerle kapla',
    instructions: 'Kareli modeli kullanarak alan birimleri arasındaki ilişkiyi bul.',
    level: 1,
    launch: { text: 'Sınıfta kenarı 1 metre olan kâğıttan bir kare yaptınız. Bunu kenarı 1 desimetre olan küçük karelerle kaplamak isteseniz kaç kare gerekir? Önce tahmin et!', visual: hundredGrid(10) },
    reflect: '1 m = 10 dm iken 1 m² neden 10 dm² değil de 100 dm²? Bir arkadaşına kareli kâğıt üzerinde göster.',
    items: [
      { text: 'Kenarı 1 m olan kare, kenarı 1 dm olan karelerle kaplanıyor. Bir sıraya 10 tane sığıyor. Toplam __ tane 1 dm²’lik kare gerekir.', answers: ['100'], visual: hundredGrid(10), hints: ['1 m = 10 dm. Bir sırada 10 kare varsa kaç sıra olur?'] },
      { text: 'Buna göre 1 m² = __ dm²', answers: ['100'], visual: hundredGrid(100) },
      { text: '1 dm² = __ cm²', answers: ['100'], hints: ['1 dm = 10 cm. Kenarı 1 dm olan kareye kaç sıra, her sırada kaç tane 1 cm²’lik kare sığar?'] },
      { text: '1 cm² = __ mm²', answers: ['100'] },
      { text: '1 m² = __ cm²', answers: ['10000'], hints: ['1 m² = 100 dm² ve her dm² = 100 cm².'] },
      { text: 'Uzunluk birimleri arasında 10 kat ilişki varken alan birimleri arasında __ kat ilişki vardır.', answers: ['100'] },
      { text: 'Kenarları 3 m ve 2 m olan bir halı __ m², yani __ dm²’dir.', answers: ['6', '600'], visual: { kind: 'area', w: 3, h: 2, showGrid: true, labels: true } },
    ],
  },
  {
    id: 'g6-uzunluk-alan-benzetimi',
    outcomes: ['MAT.6.4.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Uzunluktan alana',
    instructions: 'Uzunluk birimleri arasındaki ilişkiyi, ona karşılık gelen alan birimleri ilişkisiyle eşleştir.',
    level: 2,
    launch: { text: 'Uzunlukta “10 kat” varsa alanda neden “100 kat” oluyor? Bir benzetme kuralım: uzunluk ilişkisi → alan ilişkisi.' },
    reflect: '1 m = 100 cm ise 1 m² kaç cm² eder? Bunu bulmak için neden 100 ile 100’ü çarptın?',
    pairs: [
      { left: '1 m = 10 dm', right: '1 m² = 100 dm²' },
      { left: '1 dm = 10 cm', right: '1 dm² = 100 cm²' },
      { left: '1 cm = 10 mm', right: '1 cm² = 100 mm²' },
      { left: '1 m = 100 cm', right: '1 m² = 10.000 cm²' },
      { left: '1 m = 1.000 mm', right: '1 m² = 1.000.000 mm²' },
      { left: '1 km = 1.000 m', right: '1 km² = 1.000.000 m²' },
    ],
    perRound: 3,
  },
  {
    id: 'g6-alan-birimleri-donustur',
    outcomes: ['MAT.6.4.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Alan birimlerini dönüştür',
    instructions: 'Alan ölçme birimleri 100’er 100’er büyür ve küçülür. İstenen birime çevir.',
    level: 2,
    launch: { text: 'Artık 1 m²’nin 100 dm² olduğunu biliyorsun. Bu ilişkiyi kullanarak alanları farklı birimlerle yazalım.' },
    reflect: 'Büyük alan biriminden küçüğe geçerken neden 100 ile, iki basamak atlarken neden 10.000 ile çarptın?',
    generator: { id: 'convert', params: { kind: 'area' }, count: 8 },
  },
  {
    id: 'g6-alan-birimi-yanilgilari',
    outcomes: ['MAT.6.4.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alan birimlerinde tuzaklar',
    instructions: 'Alanları aynı birime çevirerek karşılaştır; uygun birimi seç.',
    level: 2,
    launch: { text: 'Bir halı mağazasında halı metrekareyle, kumaşçıda kumaş metreyle satılıyor. Alanla uzunluğu karıştırırsak neler olur?' },
    reflect: 'Alan birimlerinde neden “100 kat” var? Uzunluk birimleriyle karşılaştırarak açıkla.',
    questions: [
      { prompt: 'Elif “1 m = 100 cm olduğu için 1 m² = 100 cm²’dir.” dedi. Elif için ne söylenebilir?', choices: ['Hatalıdır; 1 m² = 100 × 100 = 10.000 cm²’dir.', 'Doğrudur.', 'Hatalıdır; 1 m² = 1.000 cm²’dir.', 'Hatalıdır; 1 m² = 10 cm²’dir.'], answer: 0, feedback: [null, '1 m²’lik karenin bir kenarına 100 tane 1 cm²’lik kare sığar; ama kaç sıra olur?', '1 m² karede 100 sıra ve her sırada 100 kare var.', '10 kat ilişki uzunlukta dm ile m arasında; burada cm² soruluyor.'] },
      { prompt: 'Hangisi en büyük alandır?', choices: ['3 m²', '250 dm²', '32.000 cm²', '0,5 m²'], answer: 2, explain: '32.000 cm² = 3,2 m² > 3 m² > 2,5 m² > 0,5 m²', feedback: ['3 m² = 30.000 cm²; 32.000 cm² ile karşılaştır.', '250 dm² = 2,5 m².', null, '0,5 m² yarım metrekare.'] },
      { prompt: 'Bir futbol sahasının alanını ifade etmek için en uygun birim hangisidir?', choices: ['m²', 'cm²', 'mm²', 'dm²'], answer: 0, feedback: [null, 'Santimetrekareyle çok büyük bir sayı çıkar.', 'Milimetrekare çok küçük yüzeyler içindir.', 'Desimetrekareyle bile sayı çok büyük olur.'] },
      { prompt: 'Türkiye’nin yüz ölçümünü ifade etmek için en uygun birim hangisidir?', choices: ['km²', 'm²', 'cm²', 'dm²'], answer: 0, feedback: [null, 'Metrekareyle sayı çok çok büyük olur.', 'Santimetrekare küçük yüzeyler içindir.', 'Desimetrekare küçük yüzeyler içindir.'] },
      { prompt: '45.000 cm² kaç m²’dir?', choices: ['4,5 m²', '45 m²', '450 m²', '0,45 m²'], answer: 0, feedback: [null, '45.000 ÷ 1.000 yaptın; 1 m² = 10.000 cm².', '45.000 ÷ 100 yaptın; bu dm²’ye çevirmek olur.', '45.000 ÷ 100.000 yaptın; 1 m² = 10.000 cm².'] },
      { prompt: 'Tabanı 12 m² olan bir odanın alanı kaç dm²’dir?', choices: ['1.200 dm²', '120 dm²', '12.000 dm²', '0,12 dm²'], answer: 0, feedback: [null, '1 m² = 100 dm², 10 dm² değil.', '1 m² = 100 dm², 1.000 dm² değil.', 'Büyük birimden küçük birime geçince sayı büyür.'] },
    ],
  },

  // MAT.6.4.2
  {
    id: 'g6-geometri-tahtasinda-alan',
    outcomes: ['MAT.6.4.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Geometri tahtasında alan',
    instructions: GEO_INSTR,
    level: 2,
    launch: { text: 'Dikdörtgenin alanını biliyoruz: bir kenar × o kenara ait yükseklik. Peki eğik kenarlı bir paralelkenarın ya da bir üçgenin alanını nasıl bulabiliriz?' },
    reflect: 'Alanı 12 birimkare olan paralelkenarı nasıl buldun? Önce bir dikdörtgen düşünüp sonra mı “eğdin”?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Alanı 12 birimkare olan bir paralelkenar oluştur.', target: { sides: 4, area: 12 }, hints: ['Önce 4 × 3’lük bir dikdörtgen düşün.', 'Üst kenarı sağa kaydırırsan taban ve yükseklik değişir mi?'], explain: 'Taban ve yükseklik aynı kaldıkça paralelkenarın alanı değişmez.' },
      { prompt: 'Tabanı 5 birim olan ve alanı 10 birimkare olan bir paralelkenar oluştur.', target: { sides: 4, area: 10 }, hints: ['Taban × yükseklik = 10 ise yükseklik kaç birim olmalı?'] },
      { prompt: 'Alanı 6 birimkare olan bir üçgen oluştur.', target: { sides: 3, area: 6 }, hints: ['Alanı 12 birimkare olan bir dikdörtgenin yarısını düşün.'], explain: 'Örneğin tabanı 4, yüksekliği 3 olan bir üçgen: (4 × 3) ÷ 2 = 6.' },
      { prompt: 'Alanı 8 birimkare olan bir üçgen oluştur.', target: { sides: 3, area: 8 }, hints: ['Taban × yükseklik 16 olmalı. Taban 4 ise yükseklik kaç olur?'] },
    ],
  },
  {
    id: 'g6-kes-tasi',
    outcomes: ['MAT.6.4.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Kes, taşı, dikdörtgen yap',
    instructions: 'Şekilleri incele; kesip taşımanın ve ikiye bölmenin alana etkisini düşün.',
    level: 2,
    launch: { text: 'Kâğıttan bir paralelkenar kes. Makasla bir ucundan bir üçgen kesip öbür uca yapıştırırsan ne elde edersin?', visual: FIG_KES_TASI },
    reflect: 'Paralelkenarın alanının neden “taban × yükseklik” olduğunu kesip taşıma fikriyle bir arkadaşına anlat.',
    questions: [
      { prompt: { text: 'Paralelkenarın sol ucundan kesilen dik üçgen sağ uca taşındı. Ne oluşur?', visual: FIG_KES_TASI }, choices: ['Tabanı ve yüksekliği paralelkenarınkiyle aynı olan bir dikdörtgen', 'Daha büyük bir paralelkenar', 'Bir üçgen', 'Bir kare'], answer: 0, feedback: [null, 'Hiçbir parça eklenmedi ya da atılmadı.', 'Dört köşeli bir şekil oluştu.', 'Kenarların eşit olması gerekmiyor.'] },
      { prompt: { text: 'Bu kesip taşıma sonunda alan için ne söylenebilir?', visual: FIG_KES_TASI }, choices: ['Değişmez.', 'İki katına çıkar.', 'Yarıya iner.', 'Azalır.'], answer: 0, explain: 'Parçalar yalnızca yer değiştirdi; alan korunur.', feedback: [null, 'Yeni parça eklenmedi.', 'Hiçbir parça atılmadı.', 'Kesilen parça atılmadı, taşındı.'] },
      { prompt: { text: 'Oluşan dikdörtgenin kısa kenarı, paralelkenarın hangi uzunluğuna eşittir?', visual: FIG_KES_TASI }, choices: ['Yüksekliğine', 'Eğik (yan) kenarına', 'Tabanına', 'Çevresine'], answer: 0, feedback: [null, 'Eğik kenar yükseklikten uzundur; dikdörtgenin kenarı dik çizilen yüksekliktir.', 'Taban, dikdörtgenin uzun kenarı oldu.', 'Çevre bir uzunluk toplamıdır.'] },
      { prompt: { text: 'Paralelkenar bir köşegeniyle iki eş üçgene ayrıldı. Her üçgenin alanı paralelkenarın alanının ne kadarıdır?', visual: FIG_YARIM }, choices: ['Yarısı', 'Üçte biri', 'Aynısı', 'İki katı'], answer: 0, feedback: [null, 'İki eş parça var, üç değil.', 'Bir üçgen paralelkenarın yalnızca bir parçası.', 'Parça bütünden büyük olamaz.'] },
      { prompt: { text: 'Buna göre tabanı 8 cm, yüksekliği 5 cm olan bir üçgenin alanı kaç cm²’dir?', visual: FIG_YARIM }, choices: ['20 cm²', '40 cm²', '13 cm²', '26 cm²'], answer: 0, explain: '(8 × 5) ÷ 2 = 20 cm²', feedback: [null, '40 cm², aynı taban ve yükseklikteki paralelkenarın alanı; üçgen bunun yarısı.', 'Taban ile yüksekliği topladın.', '(8 + 5) × 2 çevre gibi bir hesap; alan için çarpmalısın.'] },
      { prompt: { text: 'Tabanı ortak (AB) ve tepeleri aynı paralel doğru üzerinde olan üç üçgenin alanları için ne söylenebilir?', visual: FIG_ESIT_YUKSEKLIK }, choices: ['Alanları eşittir.', 'Ortadaki en büyüktür.', 'Sağdaki en büyüktür.', 'Karşılaştırılamaz.'], answer: 0, explain: 'Tabanları ortak; yükseklikleri paralel doğrular arasındaki uzaklık olduğu için eşittir.', feedback: [null, 'Ortadaki daha “düzgün” görünüyor ama yüksekliği aynı.', 'Sağdaki daha eğik görünüyor ama yüksekliği aynı.', 'Taban ve yükseklik bilindiği için karşılaştırabiliriz.'] },
    ],
  },
  {
    id: 'g6-paralelkenar-ucgen-alani',
    outcomes: ['MAT.6.4.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Paralelkenarın ve üçgenin alanı',
    instructions: 'Paralelkenarın alanı = taban × yükseklik; üçgenin alanı = (taban × yükseklik) ÷ 2. Kesikli çizgi yüksekliği gösterir.',
    level: 2,
    launch: { text: 'Artık bağıntıları biliyoruz: paralelkenarda taban × yükseklik, üçgende bunun yarısı. Dikkat: yükseklik her zaman tabana dik olan uzunluktur!' },
    reflect: 'Eğik kenarın uzunluğu verilmiş olsa da neden kullanmadın?',
    items: [
      { text: 'Paralelkenarın alanı __ cm²', answers: ['40'], visual: areaFig('paralelkenar', '8 cm', '5 cm', '6 cm'), hints: ['Hangi uzunluk tabana dik: 5 cm mi, 6 cm mi?'] },
      { text: 'Üçgenin alanı __ cm²', answers: ['30'], visual: areaFig('ucgen', '10 cm', '6 cm'), hints: ['Aynı taban ve yükseklikteki paralelkenarın alanı kaç olurdu?'] },
      { text: 'Üçgenin alanı __ cm²', answers: ['14'], visual: areaFig('genis', '7 cm', '4 cm'), hints: ['Geniş açılı üçgende yükseklik üçgenin dışına düşebilir; yine tabana diktir.'] },
      { text: 'Paralelkenarın alanı __ m²', answers: ['84'], visual: areaFig('paralelkenar', '12 m', '7 m', '9 m') },
      { text: 'Üçgenin alanı __ cm²', answers: ['36'], visual: areaFig('ucgen', '9 cm', '8 cm') },
      { text: 'Alanı 48 cm² olan bir paralelkenarın bir kenarı 8 cm ise bu kenara ait yükseklik __ cm', answers: ['6'], hints: ['8 × ? = 48'] },
      { text: 'Alanı 24 cm² olan bir üçgenin bir kenarı 8 cm ise bu kenara ait yükseklik __ cm', answers: ['6'], hints: ['Üçgenin alanı 24 ise aynı taban ve yükseklikteki paralelkenarın alanı kaç?'] },
    ],
  },
  {
    id: 'g6-alan-bagintilari',
    outcomes: ['MAT.6.4.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alan bağıntılarını sına',
    instructions: 'Dikdörtgen, paralelkenar ve üçgenin alanları arasındaki ilişkileri yorumla.',
    level: 2,
    launch: { text: 'Bir kilim deseninde aynı yükseklikte ama farklı biçimlerde üçgenler var. Hangisi daha çok ip gerektirir?' },
    reflect: 'Tabanı ve yüksekliği aynı olan bir dikdörtgen, paralelkenar ve üçgenin alanları arasındaki ilişkiyi tek cümleyle nasıl söylersin?',
    questions: [
      { prompt: 'Bir üçgenin tabanı 2 katına çıkarılır, yüksekliği aynı kalırsa alanı ne olur?', choices: ['2 katına çıkar.', '4 katına çıkar.', 'Değişmez.', 'Yarıya iner.'], answer: 0, feedback: [null, 'Yalnızca bir uzunluk 2 katına çıktı; ikisi birden değil.', 'Taban değiştiği için alan da değişir.', 'Taban büyüdü; alan küçülmez.'] },
      { prompt: 'Taban uzunlukları ve yükseklikleri eşit olan bir paralelkenar ile bir üçgenin alanları için hangisi doğrudur?', choices: ['Alanları eşittir.', 'Üçgenin alanı paralelkenarın alanının yarısıdır.', 'Üçgenin alanı daha büyüktür.', 'Paralelkenarın alanı üçgeninkinin yarısıdır.'], answer: 1, feedback: ['Paralelkenar, iki eş üçgenden oluşur.', null, 'Üçgen, paralelkenarın yarısı kadardır.', 'Tam tersi: üçgen paralelkenarın yarısıdır.'] },
      { prompt: { text: 'Can bu paralelkenarın alanını 8 × 6 = 48 cm² buldu. Hata nerede?', visual: areaFig('paralelkenar', '8 cm', '5 cm', '6 cm') }, choices: ['Yükseklik yerine eğik kenarı kullandı; alan 8 × 5 = 40 cm².', 'Hata yok.', 'Çarpmak yerine toplamalıydı.', 'Sonucu 2’ye bölmeliydi.'], answer: 0, feedback: [null, 'Kesip taşıyınca dikdörtgenin kısa kenarı 6 cm değil, 5 cm olur.', 'Toplama çevreyle ilgili olurdu.', '2’ye bölmek üçgen için gerekir.'] },
      { prompt: 'Alanı 24 cm² olan bir üçgenin tabanı 8 cm ise yüksekliği kaç cm’dir?', choices: ['6 cm', '3 cm', '16 cm', '192 cm'], answer: 0, explain: '(8 × h) ÷ 2 = 24 ise 8 × h = 48, h = 6 cm.', feedback: [null, '24 ÷ 8 = 3 yaptın; ama üçgende 2’ye bölme var.', '16 + 8 = 24; alan çarparak bulunur.', '24 × 8 yaptın; yüksekliği bulmak için bölmelisin.'] },
      { prompt: 'Kenarı 6 cm olan bir karenin içine, tabanı karenin bir kenarı ve tepesi karşı kenar üzerinde olan bir üçgen çiziliyor. Üçgenin alanı karenin alanının ne kadarıdır?', choices: ['Yarısı', 'Dörtte biri', 'Tamamı', 'Üçte biri'], answer: 0, explain: 'Üçgenin tabanı 6, yüksekliği 6: (6 × 6) ÷ 2 = 18 cm²; karenin alanı 36 cm².', feedback: [null, 'Taban ve yükseklik karenin kenarına eşit; (6 × 6) ÷ 2 = ?', 'Üçgen karenin tamamını kaplamaz.', 'Taban ve yükseklik karenin kenarına eşit; (6 × 6) ÷ 2 = ?'] },
    ],
  },

  // MAT.6.4.3
  {
    id: 'g6-alan-parcala',
    outcomes: ['MAT.6.4.3'],
    type: 'fill',
    stage: 'model',
    title: 'Parçala ya da tamamla',
    instructions: 'Şekli dikdörtgenlere ayır ya da tamamlayıp eksilt; alanı bul.',
    level: 2,
    launch: { text: 'Bir evin planı tam bir dikdörtgen değil. Zemine kaç metrekare parke gerektiğini nasıl bulursun?' },
    reflect: 'Karmaşık bir şeklin alanını bulmak için parçalara ayırma ya da tamamlayıp eksiltme yollarından hangisini tercih ettin? Neden?',
    items: [
      { text: 'Boyalı şeklin alanı __ birimkare', answers: ['18'], visual: { kind: 'grid', cols: 6, rows: 5, cells: [...Array.from({ length: 12 }, (_, i) => `${i % 6},${3 + Math.floor(i / 6)}`), ...Array.from({ length: 6 }, (_, i) => `${i % 2},${Math.floor(i / 2)}`)] }, hints: ['Şekli iki dikdörtgene ayırabilir misin?', 'Alttaki dikdörtgen kaç birimkare, üstteki kaç?'] },
      { text: 'Boyalı şeklin alanı __ birimkare', answers: ['14'], visual: { kind: 'grid', cols: 4, rows: 4, cells: Array.from({ length: 16 }, (_, i) => `${i % 4},${Math.floor(i / 4)}`).filter((c) => c !== '3,0' && c !== '3,1') }, hints: ['Önce tam kareyi düşün; sonra eksik kısmı çıkar.'] },
      { text: 'Boyalı şeklin alanı __ birimkare', answers: ['8'], visual: { kind: 'grid', cols: 5, rows: 4, cells: ['0,0', '1,0', '2,0', '3,0', '4,0', '2,1', '2,2', '2,3'] } },
      { text: 'Kareli kâğıtta tabanı 6, yüksekliği 4 birim olan bir üçgen çizildi. Alanı __ birimkare', answers: ['12'], hints: ['6 × 4’lük dikdörtgenin ne kadarı?'] },
      { text: 'Bir odanın planı: 5 m × 4 m’lik bir dikdörtgen ile kenarı 2 m olan bir kare yan yana. Odanın alanı __ m²', answers: ['24'] },
      { text: 'Önce tahmin et: 9,8 m × 4,1 m’lik bir duvarın alanı yaklaşık __ m² (en yakın onluğa yuvarla).', answers: ['40'], hints: ['9,8 yaklaşık 10, 4,1 yaklaşık 4.'] },
    ],
  },
  {
    id: 'g6-alan-problemleri-hesapla',
    outcomes: ['MAT.6.4.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Alanı hesapla',
    instructions: 'Problemleri çöz ve sonucu yaz.',
    level: 2,
    launch: { text: 'Alan hesabı; boya, parke, fide ve kumaş almak gibi pek çok günlük kararda işimize yarar.' },
    reflect: 'Bu problemlerin hangisinde alanı bulduktan sonra bir işlem daha yapman gerekti? Neden?',
    items: [
      { text: 'Boyutları 100 m ve 64 m olan dikdörtgen biçimli bir futbol sahasının alanı __ m²', answers: ['6400'] },
      { text: 'Paralelkenar biçimindeki bir camın bir kenarı 80 cm, bu kenara ait yüksekliği 50 cm. Camın alanı __ cm²', answers: ['4000'] },
      { text: 'Tabanı 8 m, yüksekliği 5 m olan üçgen biçimli bir arsanın metrekaresi 1.500 TL ise arsanın fiyatı __ TL', answers: ['30000'], hints: ['Önce arsanın alanını bul.'] },
      { text: 'Kenar uzunluğu 3 m olan kare biçimli bir duvarda 1 m’ye 2 m’lik bir kapı var. Kapı dışındaki duvarın alanı __ m²', answers: ['7'], hints: ['Duvarın tamamından kapının alanını çıkar.'] },
      { text: 'Bir çiftçi tabanı 40 m, yüksekliği 30 m olan üçgen biçimli tarlasının her metrekaresine 2 fide dikiyor. Toplam __ fide diker.', answers: ['1200'] },
      { text: 'Alanı 6 m² olan bir halının alanı __ dm²', answers: ['600'] },
    ],
  },
  {
    id: 'g6-alan-problemleri',
    outcomes: ['MAT.6.4.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alan problemleri',
    instructions: 'Problemi bir şekille modelle; alan mı çevre mi gerektiğine karar ver ve çöz.',
    level: 2,
    launch: { text: 'Bahçeye çit çekmek ile bahçeye çim ekmek aynı ölçüyü mü gerektirir? Problemleri çözmeden önce buna karar verelim.' },
    reflect: 'Bir problemde alanın mı çevrenin mi gerektiğini nasıl anladın? İki örnek ver.',
    questions: [
      { prompt: 'Bir bahçenin etrafına çit çekilecek. Hangi ölçüyü hesaplamalısın?', choices: ['Çevre uzunluğunu', 'Alanını', 'Köşegenini', 'Yüksekliğini'], answer: 0, feedback: [null, 'Alan yüzeyin büyüklüğüdür; çit bahçenin kenarları boyunca çekilir.', 'Çit köşegen boyunca değil, kenarlar boyunca çekilir.', 'Yükseklik bir kenar uzunluğu değildir.'] },
      { prompt: 'Paralelkenar biçimindeki bir tarlanın bir kenarı 120 m, bu kenara ait yüksekliği 50 m’dir. Tarlanın alanı kaç m²’dir?', choices: ['6.000 m²', '170 m²', '3.000 m²', '12.000 m²'], answer: 0, feedback: [null, 'Taban ile yüksekliği topladın; alan için çarpmalısın.', '2’ye böldün; bu üçgen için gerekir.', '120 × 100 yaptın; yükseklik 50 m.'] },
      { prompt: 'Üçgen biçimindeki bir flamanın tabanı 30 cm, yüksekliği 40 cm’dir. Bu flamalardan 10 tane yapmak için kaç cm² kumaş gerekir?', choices: ['12.000 cm²', '6.000 cm²', '600 cm²', '700 cm²'], answer: 1, explain: 'Bir flama: (30 × 40) ÷ 2 = 600 cm². 10 flama: 6.000 cm².', feedback: ['2’ye bölmeyi unuttun; flama üçgen biçiminde.', null, '600 cm² yalnızca bir flama için.', '30 + 40 = 70; alan çarparak bulunur.'] },
      { prompt: 'Boyutları 4 m ve 3 m olan bir duvar boyanacak. 1 kutu boya 6 m²’lik alanı boyuyor. Kaç kutu boya gerekir?', choices: ['3', '4', '2', '12'], answer: 2, explain: '4 × 3 = 12 m²; 12 ÷ 6 = 2 kutu.', feedback: ['Duvarın alanını bulup kutu başına düşen alana böl.', '4 duvarın bir kenarı; alanı hesapla.', null, '12 m² duvarın alanı; kaç kutu gerektiğini sordu.'] },
      { prompt: 'Kenar uzunlukları 5 m ve 4 m olan bir odanın zemini, her birinin alanı 0,25 m² olan kare fayanslarla kaplanacak. Kaç fayans gerekir?', choices: ['20', '40', '100', '80'], answer: 3, explain: '20 ÷ 0,25 = 80. Her metrekareye 4 fayans sığar.', feedback: ['20 m² odanın alanı; her fayans 1 m² değil.', '20 ÷ 0,5 yaptın; fayans 0,25 m².', '20 × 5 yaptın; 1 m²’ye kaç tane 0,25 m² sığar?', null] },
      { prompt: 'Uzunluğu 20 m, genişliği 12 m olan dikdörtgen bir bahçede, tabanı 6 m ve yüksekliği 4 m olan üçgen biçimli bir çiçeklik var. Kalan alana çim ekilecek. Çim ekilecek alan kaç m²’dir?', choices: ['216 m²', '228 m²', '240 m²', '252 m²'], answer: 1, explain: '20 × 12 = 240 m²; çiçeklik (6 × 4) ÷ 2 = 12 m²; 240 − 12 = 228 m².', feedback: ['Çiçekliğin alanını 2’ye bölmeyi unuttun.', null, '240 m² bahçenin tamamı; çiçekliği çıkar.', 'Çiçekliği ekledin; çıkarmalısın.'] },
    ],
  },
  {
    id: 'g6-olcme-hangisi-farkli',
    outcomes: ['MAT.6.4.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Alanlar ve birimler',
    instructions: HF_INSTR,
    level: 2,
    launch: { text: HF_LAUNCH },
    reflect: HF_REFLECT,
    questions: [
      {
        prompt: HF_PROMPT,
        choices: ['Tabanı 6 cm, yüksekliği 4 cm olan paralelkenar', 'Tabanı 6 cm, yüksekliği 8 cm olan üçgen', 'Kenarları 4 cm ve 6 cm olan dikdörtgen', 'Tabanı 6 cm, yüksekliği 6 cm olan üçgen'],
        answer: 0,
        reasons: ['Dörtgen olup dik açısı olmak zorunda olmayan tek şekil.', 'Yüksekliği tabanından uzun olan tek şekil.', 'Tüm açıları dik olan ve çevresi hesaplanabilen tek şekil.', 'Alanı 24 cm² olmayan (18 cm² olan) tek şekil.'],
      },
      {
        prompt: HF_PROMPT,
        choices: ['m²', 'cm²', 'km²', 'cm'],
        answer: 0,
        reasons: ['Alan birimlerinde temel birim (ölçüt) olan tek birim.', 'Listedeki en küçük alan birimi.', 'Listedeki en büyük alan birimi.', 'Alan değil, uzunluk birimi olan tek seçenek.'],
      },
    ],
  },

  // MAT.6.4.4
  {
    id: 'g6-tekerlek-yuvarla',
    outcomes: ['MAT.6.4.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Tekerleği yuvarla',
    instructions: 'Sayı doğrusundaki 1 birim, tekerleğin çapıdır. Tekerleğin bir turda ne kadar yol aldığını en yakın onda birliğe yuvarlayarak işaretle.',
    level: 1,
    launch: { text: 'Bir tekerleğin üzerine boya sürüp yerde bir tur yuvarlarsan yerde bir iz kalır. Bu iz tekerleğin çapının kaç katıdır? Önce tahmin et!', visual: FIG_TEKERLEK },
    reflect: 'Hangi büyüklükte olursa olsun her tekerlek bir turda çapının yaklaşık 3,14 katı yol alıyor. Bu sana çember hakkında ne söylüyor?',
    tool: 'numberline',
    config: { min: 0, max: 7, step: 0.1 },
    tasks: [
      { prompt: 'Çapı 1 birim olan bir tekerlek 0’dan başlayarak bir tam tur yuvarlandı. İzin bittiği yeri işaretle.', target: { value: 3.1 }, hints: ['Tekerlek çapının 3 katından biraz fazla yol alır.'], explain: 'İz yaklaşık 3,14 birim. Çevre ÷ çap ≈ 3,14; bu sabit sayıya π (pi) denir.' },
      { prompt: 'Çapı 2 birim olan bir tekerlek bir tam tur yuvarlandı. İzin bittiği yeri işaretle.', target: { value: 6.3 }, hints: ['Çap 2 katına çıkınca çevre ne olur?'], explain: '2 × 3,14 = 6,28 ≈ 6,3. Çap 2 katına çıkınca çevre de 2 katına çıktı.' },
      { prompt: 'Çapı yarım (0,5) birim olan bir tekerlek bir tam tur yuvarlandı. İzin bittiği yeri işaretle.', target: { value: 1.6 }, explain: '0,5 × 3,14 = 1,57 ≈ 1,6' },
      { prompt: 'Çapı 1 birim olan tekerlek iki tam tur yuvarlandı. İzin bittiği yeri işaretle.', target: { value: 6.3 }, explain: '2 × 3,14 = 6,28 ≈ 6,3. Çapı 2 olan tekerleğin bir turuyla aynı!' },
    ],
  },
  {
    id: 'g6-pi-sayisi',
    outcomes: ['MAT.6.4.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Pi sayısını keşfet',
    instructions: 'Çember biçimli nesnelerin çevre ve çap uzunlukları arasındaki ilişkiyi incele.',
    level: 1,
    launch: { text: 'Bir tabak, bir saat ve bir kavanoz kapağının çevresini iple, çapını cetvelle ölçtük. Ölçümler arasında bir ilişki var mı?', visual: { kind: 'table', headers: ['Nesne', 'Çevre (cm)', 'Çap (cm)'], rows: [['Tabak', '62,8', 20], ['Duvar saati', '94,2', 30], ['Kavanoz kapağı', '31,4', 10]] } },
    reflect: 'Çevre ÷ çap oranının her çemberde aynı çıkması sana ne düşündürdü? Bu oranı nasıl kullanabilirsin?',
    questions: [
      { prompt: { text: 'Tablodaki her nesnenin çevre uzunluğunu çap uzunluğuna bölersek ne fark ederiz?', visual: { kind: 'table', headers: ['Nesne', 'Çevre (cm)', 'Çap (cm)'], rows: [['Tabak', '62,8', 20], ['Duvar saati', '94,2', 30], ['Kavanoz kapağı', '31,4', 10]] } }, choices: ['Sonuçlar hep farklıdır.', 'Her birinde yaklaşık 3,14 elde edilir.', 'Her birinde 2 elde edilir.', 'Sonuç çapa eşittir.'], answer: 1, feedback: ['Bölmeleri yap: 62,8 ÷ 20, 94,2 ÷ 30, 31,4 ÷ 10.', null, 'Çevre çapın 2 katından fazla.', 'Bölüm her nesnede aynı çıkıyor; çap ise farklı.'] },
      { prompt: 'Çemberin uzunluğunun çap uzunluğuna bölümüyle elde edilen sabit sayıya ne ad verilir?', choices: ['Yarıçap', 'Merkez açı', 'Pi sayısı (π)', 'Alan'], answer: 2, feedback: ['Yarıçap bir uzunluktur; çapın yarısı.', 'Merkez açı bir açıdır.', null, 'Alan bir yüzeyin büyüklüğüdür.'] },
      { prompt: 'r yarıçap uzunluğu olmak üzere çemberin uzunluğunu veren bağıntı hangisidir?', choices: ['Ç = 2 · π · r', 'Ç = π · r', 'Ç = 2 · r', 'Ç = π + r'], answer: 0, feedback: [null, 'Çevre çapın π katıdır; çap = 2 · r.', 'Bu çapın uzunluğu; çevre çok daha uzun.', 'π ile çarpılır, toplanmaz.'] },
      { prompt: 'Bir çemberin çapı 2 katına çıkarsa çemberin uzunluğu ne olur?', choices: ['Değişmez.', '4 katına çıkar.', 'Yarıya iner.', '2 katına çıkar.'], answer: 3, feedback: ['Çap büyüyünce çevre de büyür.', 'Çevre çapın π katı; çap 2 kat olursa çevre de 2 kat olur.', 'Çap büyüdü; çevre küçülmez.', null] },
      { prompt: 'π sayısının yaklaşık değeri hangisidir?', choices: ['2,14', '3,14', '3,41', '31,4'], answer: 1, feedback: ['Çevre çapın 3 katından biraz fazla.', null, 'Rakamların yeri karışmış.', 'Çevre çapın 31 katı olamaz.'] },
      { prompt: 'Hangisi doğrudur?', choices: ['Çemberin uzunluğu çapının 3 katından biraz fazladır.', 'Çemberin uzunluğu çapının 2 katıdır.', 'Çemberin uzunluğu çapına eşittir.', 'Çemberin uzunluğu yarıçapının π katıdır.'], answer: 0, feedback: [null, 'Tekerlek deneyini hatırla: 3 çap ve biraz.', 'İp ile ölçünce çevre çaptan çok daha uzun.', 'Yarıçapın π katı, çevrenin yarısıdır.'] },
    ],
  },
  {
    id: 'g6-cevre-cap-orani',
    outcomes: ['MAT.6.4.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Çevre ÷ çap',
    instructions: 'Ölçümleri kullanarak çember uzunluğu ile çap arasındaki ilişkiyi bul.',
    level: 2,
    launch: { text: 'Farklı çemberlerin ölçümlerini tabloya yazdık. Her satırda çevre ÷ çap işlemini yaparsak ne çıkar?' },
    reflect: 'Ç = π · R bağıntısını tablodaki ölçümlerden yola çıkarak nasıl açıklarsın?',
    items: [
      { text: 'Çevresi 31,4 cm, çapı 10 cm olan kapak için çevre ÷ çap = __', answers: ['3,14'] },
      { text: 'Çevresi 47,1 cm, çapı 15 cm olan tabak için çevre ÷ çap = __', answers: ['3,14'], hints: ['15 × 3 = 45; geriye kalan 2,1’in içinde kaç tane 15 var?'] },
      { text: 'Çapı 50 cm olan bir bisiklet tekerleğinin çevresi yaklaşık 157 cm’dir. Çevre ÷ çap ≈ __', answers: ['3,14'] },
      { text: 'Ç = π · R bağıntısında R, çemberin __ uzunluğudur.', answers: ['çap'], choices: ['çap', 'yarıçap', 'yay'] },
      { text: 'Ç = 2 · π · r bağıntısında r, çemberin __ uzunluğudur.', answers: ['yarıçap'], choices: ['çap', 'yarıçap', 'yay'] },
      { text: 'Yarıçapı 5 cm olan bir çemberin çapı __ cm', answers: ['10'] },
      { text: 'Çapı 20 cm olan bir çemberin uzunluğu (π = 3,14) __ cm', answers: ['62,8'], hints: ['Çevre = π × çap'] },
    ],
  },
  {
    id: 'g6-pi-yanilgilari',
    outcomes: ['MAT.6.4.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Pi hakkında doğru mu, yanlış mı?',
    instructions: 'Her iddiayı çevre ile çap arasındaki ilişkiyi düşünerek değerlendir. π değerini soruda verildiği gibi kullan.',
    level: 2,
    launch: { text: 'Antik çağlardan beri insanlar her çemberin çevresinin çapının yaklaşık 3 katı olduğunu fark etmişti. Babilliler π için 3, Mısırlılar yaklaşık 3,16 kullandı.' },
    reflect: 'π’nin tam değeri yazılamaz (3,14159...). Problemlerde neden 3 ya da 3,14 kullanıyoruz? Hangisini ne zaman seçersin?',
    questions: [
      { prompt: 'Ece “Çemberin uzunluğu çapının 2 katıdır.” dedi. Hangisi doğrudur?', choices: ['Hatalıdır; çapının π katıdır, yani 3 katından biraz fazladır.', 'Doğrudur.', 'Hatalıdır; çapına eşittir.', 'Hatalıdır; çapının 4 katıdır.'], answer: 0, feedback: [null, '2 katı, yarıçapla çapın ilişkisi; çevre çok daha uzun.', 'Bir ipi çember boyunca sarınca çaptan çok daha uzun çıkar.', '4 katı fazla; çember, çapı kenar kabul eden kareden kısadır.'] },
      { prompt: 'Bir ağacın gövdesinin çevresi 157 cm’dir. Gövdenin çapı yaklaşık kaç cm’dir? (π = 3,14)', choices: ['50 cm', '25 cm', '78,5 cm', '493 cm'], answer: 0, explain: 'Çap = çevre ÷ π = 157 ÷ 3,14 = 50 cm', feedback: [null, '25 cm yarıçap olurdu.', '157 ÷ 2 yaptın; çapı bulmak için π’ye bölmelisin.', 'Çarptın; çapı bulmak için bölmelisin.'] },
      { prompt: 'Büyük bir çemberin çevre ÷ çap oranı küçük bir çemberinkinden büyük müdür?', choices: ['Hayır; tüm çemberlerde bu oran aynıdır (π).', 'Evet; büyük çemberde oran büyüktür.', 'Evet; küçük çemberde oran büyüktür.', 'Çapına göre bazen büyük, bazen küçük olur.'], answer: 0, feedback: [null, 'Büyük çemberin hem çevresi hem çapı büyür; oran değişmez.', 'Küçük çemberin hem çevresi hem çapı küçülür; oran değişmez.', 'Tekerlek deneyinde her çapta oran yaklaşık 3,14 çıktı.'] },
      { prompt: 'Çapı 10 cm olan bir kapağın çevresine ip sardın. İpin uzunluğu en çok hangisine yakındır?', choices: ['31 cm', '20 cm', '10 cm', '100 cm'], answer: 0, feedback: [null, '20 cm çapın 2 katı; çevre 3 katından fazla.', '10 cm çapın kendisi.', '100 cm çok fazla; çapın 10 katı olurdu.'] },
      { prompt: 'Hangisi Ç = 2 · π · r bağıntısına denktir? (R: çap, r: yarıçap)', choices: ['Ç = π · R', 'Ç = 2 · R', 'Ç = π + R', 'Ç = π · r'], answer: 0, feedback: [null, 'π çarpanı unutulmuş.', 'Çevre, çap ile π’nin çarpımıdır; toplamı değil.', 'Yarıçapla yazarsan 2 çarpanı gerekir: 2 · r = R.'] },
    ],
  },

  // MAT.6.4.5
  {
    id: 'g6-tekerlek-modeli',
    outcomes: ['MAT.6.4.5'],
    type: 'fill',
    stage: 'model',
    title: 'Çapı, yarıçapı, çevreyi bul',
    instructions: 'Şekildeki çap ya da yarıçapı kullanarak istenen uzunluğu bul. π değerini soruda verildiği gibi kullan.',
    level: 1,
    launch: { text: 'Bir bisiklet tekerleği bir tur döndüğünde bisiklet, tekerleğin çevresi kadar yol alır. Tekerleğin yarıçapını bilmek yeter mi?', visual: circleFig('r', '35 cm') },
    reflect: 'Yarıçap verildiğinde de çap verildiğinde de çemberin uzunluğunu bulabildin. Hangi bağıntıyı kullandın; neden ikisi de işe yarıyor?',
    items: [
      { text: 'Yarıçapı 5 cm olan çemberin çapı __ cm', answers: ['10'], visual: circleFig('r', '5 cm') },
      { text: 'Aynı çemberin uzunluğu (π = 3) __ cm', answers: ['30'], visual: circleFig('r', '5 cm'), hints: ['Çap 10 cm; çevre çapın π katı.'] },
      { text: 'Çapı 14 cm olan çemberin uzunluğu (π = 3) __ cm', answers: ['42'], visual: circleFig('d', '14 cm') },
      { text: 'Çapı 20 cm olan çemberin uzunluğu (π = 3,14) __ cm', answers: ['62,8'], visual: circleFig('d', '20 cm') },
      { text: 'Yarıçapı 35 cm olan bisiklet tekerleği bir tur dönünce bisiklet (π = 3) __ cm yol alır.', answers: ['210'], visual: circleFig('r', '35 cm'), hints: ['Önce çapı bul.'] },
      { text: 'Uzunluğu 36 cm olan çemberin yarıçapı (π = 3) __ cm', answers: ['6'], hints: ['Önce çapı bul: 36 ÷ 3.', 'Yarıçap çapın yarısıdır.'] },
    ],
  },
  {
    id: 'g6-cember-uzunlugu-alistirma',
    outcomes: ['MAT.6.4.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Çemberin uzunluğu',
    instructions: 'π = 3 alarak çemberin uzunluğunu hesapla: Ç = 2 · π · r ya da Ç = π · R',
    level: 1,
    launch: { text: 'Bir sirk çemberi, bir saat kadranı, bir kavanoz kapağı... Hepsinin çevresi aynı yolla bulunur. Akıcı olalım!' },
    reflect: 'Çap verildiğinde mi yarıçap verildiğinde mi hesaplamak sana daha kolay geldi? Neden?',
    generator: { id: 'circle', params: { ask: 'circ' }, count: 8 },
  },
  {
    id: 'g6-cember-problemleri',
    outcomes: ['MAT.6.4.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çember problemleri',
    instructions: 'Önce sonucu tahmin et (çevre çapın 3 katından biraz fazla), sonra çöz. π değerini soruda verildiği gibi kullan.',
    level: 2,
    launch: { text: 'Koşu pistleri, bisiklet tekerlekleri, saat akrepleri... Hepsinde çemberin uzunluğu gizli. Tahminle başla, hesapla bitir!' },
    reflect: 'Koşu pisti probleminde iki yarım çemberi nasıl düşündün? Başka bir çözüm yolu var mı?',
    questions: [
      { prompt: 'Yarıçapı 35 cm olan bir bisiklet tekerleği 10 tur dönerse bisiklet kaç cm yol alır? (π = 3)', choices: ['1.050 cm', '2.100 cm', '210 cm', '700 cm'], answer: 1, explain: 'Bir tur: 2 · 3 · 35 = 210 cm. 10 tur: 2.100 cm.', feedback: ['Yarıçapı çap gibi kullandın; çap 70 cm.', null, '210 cm yalnızca bir tur.', '70 × 10 yaptın; bir turda çevre kadar yol alınır, çap kadar değil.'] },
      { prompt: 'Çapı 70 cm olan bir hulahop çemberinin uzunluğu kaç cm’dir? (π = 3,14)', choices: ['219,8 cm', '439,6 cm', '109,9 cm', '73,14 cm'], answer: 0, feedback: [null, '70’i yarıçap sanıp 2 ile de çarptın; 70 cm çap.', '70’in yarısını aldın; çevre = π × çap.', 'π ile çarpılır, toplanmaz.'] },
      { prompt: 'Çapı 10 m olan çember biçimli bir havuzun çevresine 2 sıra çit çekilecek. Kaç metre çit gerekir? (π = 3)', choices: ['30 m', '120 m', '20 m', '60 m'], answer: 3, explain: 'Bir sıra: 3 · 10 = 30 m. İki sıra: 60 m.', feedback: ['30 m yalnızca bir sıra.', '10 m’yi yarıçap sandın; 10 m çap.', '20 m çapın 2 katı; çevre π katıdır.', null] },
      { prompt: 'Uzunluğu 18 cm olan bir çemberin yarıçapı kaç cm’dir? (π = 3)', choices: ['6 cm', '3 cm', '9 cm', '54 cm'], answer: 1, explain: '2 · 3 · r = 18 ise r = 3 cm.', feedback: ['6 cm çap; yarıçap bunun yarısı.', null, '18’in yarısını aldın; önce π’ye böl.', 'Çarptın; yarıçapı bulmak için bölmelisin.'] },
      { prompt: 'Bir koşu pistinin iki ucu yarım çember biçimindedir. Yarım çemberlerin çapı 60 m, düz kısımların her biri 100 m ise pistin bir turu kaç metredir? (π = 3)', choices: ['280 m', '560 m', '380 m', '360 m'], answer: 2, explain: 'İki yarım çember bir tam çember eder: 3 · 60 = 180 m. 180 + 200 = 380 m.', feedback: ['Düz kısımlardan yalnızca birini ekledin.', '60 m’yi yarıçap sandın.', null, 'Yarım çemberlerin toplamı 180 m; hesabını kontrol et.'] },
      { prompt: 'Akrebinin uzunluğu 6 cm olan bir duvar saatinde akrebin ucu 12 saatte kaç cm yol alır? (π = 3,14)', choices: ['18,84 cm', '37,68 cm', '75,36 cm', '113,04 cm'], answer: 1, explain: 'Akrep 12 saatte bir tam tur atar: 2 · 3,14 · 6 = 37,68 cm.', feedback: ['6 cm’yi çap gibi kullandın; akrep yarıçaptır.', null, 'Akrep 12 saatte bir tur atar, iki değil.', 'Akrep 12 saatte yalnızca bir tur atar.'] },
    ],
  },

  // MAT.6.4.6
  {
    id: 'g6-merkez-aci-olustur',
    outcomes: ['MAT.6.4.6'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Pizza, saat ve dönme dolap',
    instructions: 'Açıölçerin kolunu sürükleyerek istenen merkez açıyı oluştur.',
    level: 1,
    launch: { text: 'Bir pizza 8 eş dilime bölünüyor. Her dilimin ucundaki açı kaç derecedir? Dilimin kenar kabuğu (yay) pizzanın çevresinin ne kadarıdır?', visual: sector(45) },
    reflect: 'Merkez açı tam açının kaçta biriyse, gördüğü yay da çemberin kaçta biri oldu? Bir örnekle açıkla.',
    tool: 'angle',
    tasks: [
      { prompt: '8 eş dilime bölünen bir pizzada bir dilimin merkez açısını oluştur.', target: { degrees: 45 }, hints: ['Tam açı kaç derece? 8 eş parçaya böl.'], explain: '360° ÷ 8 = 45°. Bir dilimin yayı çemberin [[1/8]]’idir.' },
      { prompt: 'Saat 2.00’de akrep ile yelkovan arasındaki merkez açıyı oluştur.', target: { degrees: 60 }, hints: ['Kadran 12 eş parçaya bölünmüş. Her aralık kaç derece?'], explain: 'Her saat aralığı 360° ÷ 12 = 30°: 2 · 30° = 60°.' },
      { prompt: '12 kabinli bir dönme dolapta ardışık iki kabin ile merkez arasındaki açıyı oluştur.', target: { degrees: 30 }, explain: '360° ÷ 12 = 30°' },
      { prompt: 'Çemberin üçte birini gören merkez açıyı oluştur.', target: { degrees: 120 }, explain: '360° ÷ 3 = 120°. Yay da çemberin üçte biridir.' },
    ],
  },
  {
    id: 'g6-merkez-aci-kesir',
    outcomes: ['MAT.6.4.6'],
    type: 'match',
    stage: 'model',
    title: 'Merkez açı çemberin kaçta biri?',
    instructions: 'Her merkez açıyı, gördüğü yayın çemberin ne kadarı olduğunu gösteren kartla eşleştir.',
    level: 1,
    launch: { text: 'Çembersel kâğıdı ikiye, dörde, sekize katla. Her katlamada merkez açı ve yay nasıl değişiyor?' },
    reflect: '270°’lik merkez açının gördüğü yayın çemberin dörtte üçü olduğunu nasıl anladın?',
    pairs: [
      { left: { visual: sector(180) }, right: 'Çemberin yarısı' },
      { left: { visual: sector(90) }, right: 'Çemberin dörtte biri' },
      { left: { visual: sector(120) }, right: 'Çemberin üçte biri' },
      { left: { visual: sector(60) }, right: 'Çemberin altıda biri' },
      { left: { visual: sector(45) }, right: 'Çemberin sekizde biri' },
      { left: { visual: sector(30) }, right: 'Çemberin on ikide biri' },
      { left: { visual: sector(270) }, right: 'Çemberin dörtte üçü' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-merkez-aci-ve-yay',
    outcomes: ['MAT.6.4.6'],
    type: 'fill',
    stage: 'sembol',
    title: 'Merkez açı ve yay uzunluğu',
    instructions: 'Merkez açı tam açının (360°) kaçta biriyse, gördüğü yay da çemberin o kadarıdır.',
    level: 2,
    launch: { text: 'Uzunluğu 36 cm olan bir çemberde 90°’lik merkez açının gördüğü yay kaç cm? Hesap yapmadan önce kesirle düşün: 90°, 360°’nin kaçta biri?' },
    reflect: 'Yay uzunluğunu bulurken kullandığın kesir ilişkisini kendi cümlelerinle yaz.',
    items: [
      { text: 'Çemberin uzunluğu 36 cm. 90°’lik merkez açının gördüğü yay __ cm', answers: ['9'], visual: sector(90), hints: ['90°, 360°’nin kaçta biri?'] },
      { text: 'Çemberin uzunluğu 36 cm. 120°’lik merkez açının gördüğü yay __ cm', answers: ['12'], visual: sector(120), hints: ['120°, 360°’nin üçte biri mi?'] },
      { text: 'Çemberin uzunluğu 24 cm. 60°’lik merkez açının gördüğü yay __ cm', answers: ['4'], visual: sector(60) },
      { text: 'Çemberin uzunluğu 30 cm. 180°’lik merkez açının gördüğü yay __ cm', answers: ['15'], visual: sector(180) },
      { text: 'Çemberin uzunluğu 48 cm. 45°’lik merkez açının gördüğü yay __ cm', answers: ['6'], visual: sector(45) },
      { text: 'Çemberin uzunluğu 60 cm. 270°’lik merkez açının gördüğü yay __ cm', answers: ['45'], visual: sector(270), hints: ['270° = 3 × 90°'] },
      { text: 'Çemberin uzunluğu 40 cm, yayın uzunluğu 10 cm ise merkez açı __°', answers: ['90'], visual: sector(90, '?'), hints: ['10 cm, 40 cm’nin kaçta biri?'] },
      { text: 'Yarıçapı 6 cm olan çemberde 60°’lik merkez açının gördüğü yay (π = 3) __ cm', answers: ['6'], hints: ['Önce çemberin uzunluğunu bul: 2 · 3 · 6.', '60°, 360°’nin altıda biri.'] },
    ],
  },
  {
    id: 'g6-merkez-aci-problemleri',
    outcomes: ['MAT.6.4.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Dönme dolap, saat ve pizza',
    instructions: 'Merkez açı ile yay arasındaki ilişkiyi günlük hayat durumlarında kullan.',
    level: 2,
    launch: { text: 'Dönme dolabın kabinleri, saatin kadranı, pizza dilimleri... Hepsinde merkez açılar ve yaylar var. Aradaki ilişkiyi problemlerde kullanalım.' },
    reflect: 'Merkez açı 2 katına çıkınca yay da 2 katına çıkıyor. Bu ilişkiyi bir örnekle açıkla.',
    questions: [
      { prompt: '12 kabinli bir dönme dolapta kabinler eşit aralıklarla yerleştirilmiştir. Ardışık iki kabin ile merkez arasındaki açı kaç derecedir?', choices: ['12°', '30°', '36°', '60°'], answer: 1, explain: '360° ÷ 12 = 30°', feedback: ['12 kabin sayısı; tam açıyı 12’ye böl.', null, '360° ÷ 10 yaptın; 12 kabin var.', '360° ÷ 6 yaptın; 12 kabin var.'] },
      { prompt: 'Saat 03.00’te akrep ile yelkovan arasındaki küçük açı kaç derecedir?', choices: ['30°', '60°', '90°', '120°'], answer: 2, feedback: ['30° bir saat aralığı; 3 aralık var.', '60° iki aralık; 3 aralık var.', null, '120° dört aralık; 3 aralık var.'] },
      { prompt: 'Bir pizza 8 eş dilime ayrılmıştır. Bir dilimin merkez açısı kaç derecedir?', choices: ['8°', '36°', '60°', '45°'], answer: 3, feedback: ['8 dilim sayısı; 360°’yi 8’e böl.', '360° ÷ 10 yaptın.', '360° ÷ 6 yaptın.', null] },
      { prompt: 'Uzunluğu 60 cm olan bir çemberde 15 cm’lik yayı gören merkez açı kaç derecedir?', choices: ['15°', '90°', '45°', '60°'], answer: 1, explain: '15 cm, 60 cm’nin dörtte biridir; 360°’nin dörtte biri 90°’dir.', feedback: ['Yay uzunluğu ile açı ölçüsü aynı sayı olmak zorunda değil.', null, '15 cm, 60 cm’nin dörtte biri; 360°’nin dörtte biri kaç?', '60 çemberin uzunluğu; açı değil.'] },
      { prompt: 'Bir çemberde merkez açının ölçüsü 2 katına çıkarsa gördüğü yayın uzunluğu ne olur?', choices: ['Değişmez.', '2 katına çıkar.', 'Yarıya iner.', '4 katına çıkar.'], answer: 1, feedback: ['Açı büyüyünce yay da büyür.', null, 'Açı büyüdü; yay küçülmez.', 'Yay, açıyla aynı oranda büyür.'] },
      { prompt: 'Bir çemberde 40°’lik merkez açının gördüğü yay 5 cm ise 120°’lik merkez açının gördüğü yay kaç cm’dir?', choices: ['10 cm', '20 cm', '15 cm', '45 cm'], answer: 2, explain: '120°, 40°’nin 3 katıdır; yay da 3 katı olur: 15 cm.', feedback: ['120°, 40°’nin 2 katı değil, 3 katı.', '120°, 40°’nin 3 katı; 5 × 3 = ?', null, '120 ÷ 40 = 3; 45 değil.'] },
    ],
  },
]

// ───────────────────────────────────────────────────────────────────────────
// Büyük fikirler (öğretmen ve veliler için)
// ───────────────────────────────────────────────────────────────────────────

export const grade6Notes: ThemeNotes = {
  'sayilar-ve-nicelikler-1': {
    bigIdeas: [
      'Bir sayının çarpanları, o sayıda kare ile kurulabilecek dikdörtgenlerin kenar uzunluklarıdır; çarpanlar sayılıdır, katlar ise sonsuza dek sürer.',
      'Bölünebilme kriterleri ezber değil, basamak değerinin sonucudur: her onluk 2’ye, 5’e ve 10’a; her yüzlük 4’e bölünür; 10 = 9 + 1 olduğu için 3 ve 9’da rakamların toplamına bakılır.',
      'Asal sayılar yalnızca tek sıralı dikdörtgenle gösterilebilen sayılardır; 1’den büyük her doğal sayı ya asaldır ya da asal sayıların çarpımıdır.',
      'Ortak bölen “eşit parçalara ayırma”, ortak kat “tekrar eden olayların buluşması” problemlerinde ortaya çıkar; listeler, tablolar ve sayı doğrusu bu ilişkileri görünür kılar.',
    ],
  },
  'veriden-olasiliga': {
    bigIdeas: [
      'Deneysel olasılık deney verisine dayanır: olayın gerçekleşme sayısı ÷ deneme sayısı (göreli sıklık).',
      'Az sayıda denemede sonuçlar çok değişkendir; deneme sayısı arttıkça göreli sıklık kararlı bir değere yaklaşır.',
      'Olasılık 0 (imkânsız) ile 1 (kesin) arasında bir sayıdır ve kesir, ondalık gösterim ya da yüzde olarak yazılabilir.',
    ],
  },
  'sayilar-ve-nicelikler-2': {
    bigIdeas: [
      'Ondalık gösterim, basamak değeri sisteminin virgülün sağına doğru uzantısıdır: her basamak solundakinin onda biridir; 0,6 ile 0,60 aynı büyüklüktür.',
      'Kesir bir bölmedir: a tane bütün b kişiye eşit paylaşılırsa bir kişinin payı a ÷ b = [[a/b]] olur; paydanın asal çarpanları ondalık gösterimin sonlu ya da devirli olacağını belirler.',
      'Kesir, ondalık ve yüzde işlemlerinin anlamı doğal sayılarla aynıdır; ancak 1’den küçük bir sayıyla çarpmak küçültür, 1’den küçük bir sayıya bölmek büyütür.',
      'Yüzde “yüzde kaç parça” demektir; %10, %25 ve %50 gibi referanslar ve şerit modeli tahmin ve hesaplamayı kolaylaştırır. Uzunluk birimleri de basamaklar gibi 10’ar kat değişir.',
    ],
  },
  'istatistiksel-arastirma-sureci': {
    bigIdeas: [
      'İstatistik bir soruyla başlar: soru sorulur, veri toplanır, düzenlenir, görselleştirilir ve veriye dayalı karar verilir.',
      'Aritmetik ortalama “eşit paylaşım” ya da “dengeleme”dir; ortanca ve tepe değer, uç değerler ya da kategorik veri olduğunda merkezi daha iyi anlatabilir.',
      'Grafikler ve yorumlar yanıltıcı olabilir: eksenin nereden başladığı, örneklemin kimlerden oluştuğu ve verinin ne kadar olduğu sorgulanmalıdır.',
    ],
  },
  'geometrik-sekiller': {
    bigIdeas: [
      'İki paralel doğruyu kesen bir doğru yalnızca iki farklı açı ölçüsü oluşturur: yöndeş, iç ters ve dış ters açılar eştir; komşu açılar bütünlerdir.',
      'Paralellik, üçgenin iç açıları toplamının 180° olduğunu gösterir; her çokgen üçgenlere ayrılarak incelenebilir.',
      'Dörtgenler bir aile oluşturur: kare hem dikdörtgen hem eşkenar dörtgendir; bunların hepsi paralelkenardır. Bir özellik “her zaman”, “bazen” ya da “hiçbir zaman” doğru olabilir.',
      'Dörtgenler köşegen özellikleriyle de tanımlanabilir: birbirini ortalayan köşegenler paralelkenar; eşit olanlar dikdörtgen; dik olanlar eşkenar dörtgen oluşturur.',
    ],
  },
  'islemlerle-cebirsel-dusunme-ve-degisimler': {
    bigIdeas: [
      'Harfler hem bilinmeyen bir sayıyı hem de değişebilen bir niceliği gösterebilir; 4a, “herhangi bir sayının 4 katı” demektir.',
      'Aynı nicelik farklı ama denk ifadelerle yazılabilir (4a = a + 3a = a · 4); denkliği değişkene farklı değerler vererek sınarız.',
      'Örüntüler genellenebilir: adım sayısı ile terim arasındaki ilişki tabloyla görülür ve bir cebirsel ifadeyle anlatılır.',
      'Algoritmalar cebirsel ifadelerin adım adım hâlidir; bir algoritma tabloya ya da ifadeye dönüştürülerek yorumlanabilir.',
    ],
  },
  'geometrik-nicelikler': {
    bigIdeas: [
      'Alan birimleri uzunluk birimlerinin karesidir: uzunlukta 10 kat ilişki, alanda 10 × 10 = 100 kat ilişkiye dönüşür.',
      'Paralelkenarın alanı, kesip taşıyarak elde edilen dikdörtgenin alanıdır (taban × yükseklik); üçgen, aynı taban ve yükseklikteki paralelkenarın yarısıdır.',
      'Her çemberde çevre ÷ çap aynı sabit sayıdır: π ≈ 3,14. Bu yüzden Ç = π · R = 2 · π · r.',
      'Merkez açı tam açının hangi kesriyse, gördüğü yay da çemberin aynı kesridir.',
    ],
  },
}
