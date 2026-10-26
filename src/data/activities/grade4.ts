import type { Activity, ThemeNotes, Visual } from '../types'

/**
 * 4. SINIF ETKİNLİKLERİ
 * Van de Walle’ün gelişimsel yaklaşımı: her öğrenme çıktısında etkinlikler
 * somut → model → sembol → problem sırasıyla dizilir. Her etkinlik bir
 * Başlarken (launch) durumuyla açılır, Düşün ve Paylaş (reflect) sorusuyla kapanır.
 */

// ─── Yerel görsel yardımcıları (ham SVG) ───────────────────────────────────

const INK = '#1f2340'
const ORANGE = '#f97316'
const BLUE = '#6366f1'

/** 12345 → "12.345" */
const th = (n: number) => (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const svg = (s: string): Visual => ({ kind: 'svg', svg: s })
const r1 = (n: number) => Math.round(n * 10) / 10
const T = (x: number, y: number, s: string | number, size = 13, color = INK, anchor = 'middle') =>
  `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="800" fill="${color}">${s}</text>`

/** Basamak tablosu: iki bölük, altı basamak. hide: sağdan basamak sırası (0 = birler) “?” gösterilir */
function placeChart(n: number, hide = -1): Visual {
  const names = ['Yüz bin', 'On bin', 'Bin', 'Yüz', 'On', 'Bir']
  const ds = String(n).padStart(6, ' ').split('')
  const w = 52, x0 = 4
  let s = `<svg viewBox="0 0 ${6 * w + 8} 112">`
  s += `<rect x="${x0}" y="4" width="${3 * w}" height="24" fill="#fed7aa" stroke="${INK}" stroke-width="1.5"/>`
  s += `<rect x="${x0 + 3 * w}" y="4" width="${3 * w}" height="24" fill="#bfdbfe" stroke="${INK}" stroke-width="1.5"/>`
  s += T(x0 + 1.5 * w, 21, 'Binler bölüğü') + T(x0 + 4.5 * w, 21, 'Birler bölüğü')
  names.forEach((nm, i) => {
    const x = x0 + i * w
    const d = 5 - i === hide ? '?' : ds[i].trim()
    s += `<rect x="${x}" y="28" width="${w}" height="22" fill="${i < 3 ? '#ffedd5' : '#dbeafe'}" stroke="${INK}"/>`
    s += T(x + w / 2, 43, nm, 10.5)
    s += `<rect x="${x}" y="50" width="${w}" height="56" fill="#fff" stroke="${INK}"/>`
    s += T(x + w / 2, 89, d, 30, d === '?' ? ORANGE : INK)
  })
  s += `<line x1="${x0 + 3 * w}" y1="4" x2="${x0 + 3 * w}" y2="106" stroke="${INK}" stroke-width="3"/>`
  return svg(s + '</svg>')
}

/** Alt alta kesir şeritleri (aynı bütün): [pay, payda, etiket?] */
function fracBars(rows: [number, number, string?][], color = BLUE): Visual {
  const W = 320, L = rows.some((r) => (r[2] ?? '').length > 4) ? 66 : 48, h = 26, gap = 10
  const bw = W - L - 6
  let s = `<svg viewBox="0 0 ${W} ${rows.length * (h + gap) + 4}">`
  rows.forEach(([n, d, label], r) => {
    const y = 4 + r * (h + gap)
    s += T(L - 8, y + 18, label ?? `${n}/${d}`, 14, INK, 'end')
    for (let k = 0; k < d; k++) s += `<rect x="${r1(L + (k * bw) / d)}" y="${y}" width="${r1(bw / d)}" height="${h}" fill="${k < n ? color : '#fff'}" stroke="${INK}" stroke-width="1.5"/>`
  })
  return svg(s + '</svg>')
}

/** Boş sayı doğrusunda zıplamalar (ölçeksiz). hideEnd: varılan sayı “?” olarak gösterilir */
function jumpLine(start: number, steps: number[], hideEnd = true): Visual {
  const W = 340, pad = 36, span = W - 2 * pad
  const total = steps.reduce((a, x) => a + Math.abs(x), 0) || 1
  const vis = steps.map((x) => Math.sign(x) * Math.max(Math.abs(x) / total, 0.2))
  const pos = [0]
  vis.forEach((v) => pos.push(pos[pos.length - 1] + v))
  const lo = Math.min(...pos), hi = Math.max(...pos)
  const X = (p: number) => pad + ((p - lo) / (hi - lo || 1)) * span
  const vals = [start]
  steps.forEach((x) => vals.push(vals[vals.length - 1] + x))
  let s = `<svg viewBox="0 0 ${W} 108"><line x1="8" y1="70" x2="${W - 8}" y2="70" stroke="${INK}" stroke-width="2.5"/>`
  steps.forEach((st, i) => {
    const a = X(pos[i]), b = X(pos[i + 1]), m = (a + b) / 2, c = i % 2 ? 0 : 14
    s += `<path d="M${r1(a)} 66 Q${r1(m)} ${c} ${r1(b)} 66" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>`
    s += `<circle cx="${r1(b)}" cy="66" r="3.5" fill="${ORANGE}"/>`
    s += T(m, (66 + c) / 2 - 6, (st > 0 ? '+' : '−') + th(Math.abs(st)), 12, ORANGE)
  })
  vals.forEach((v, i) => {
    const x = X(pos[i])
    const label = i === vals.length - 1 && hideEnd ? '?' : th(v)
    s += `<line x1="${r1(x)}" y1="62" x2="${r1(x)}" y2="78" stroke="${INK}" stroke-width="2"/>`
    s += T(x, 96, label, 12.5, label === '?' ? ORANGE : INK)
  })
  return svg(s + '</svg>')
}

/** Alan modeli (çarpma): sütun parçaları × satır parçaları; inner: hücre yazıları */
function areaModel(cols: number[], rows: number[], inner?: string[][]): Visual {
  const scale = (arr: number[], target: number, min: number) => {
    const t = arr.reduce((a, b) => a + b, 0)
    const raw = arr.map((v) => Math.max(min, (v / t) * target))
    const k = target / raw.reduce((a, b) => a + b, 0)
    return raw.map((v) => v * k)
  }
  const ws = scale(cols, 260, 48), hs = scale(rows, rows.length > 1 ? 120 : 70, 36)
  const x0 = 46, y0 = 28, H = hs.reduce((a, b) => a + b, 0)
  let s = `<svg viewBox="0 0 ${x0 + 268} ${y0 + H + 6}">`
  let x = x0
  cols.forEach((c, i) => {
    s += T(x + ws[i] / 2, 19, th(c), 14)
    let y = y0
    rows.forEach((_, j) => {
      s += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(ws[i])}" height="${r1(hs[j])}" fill="${(i + j) % 2 ? '#fde68a' : '#c7d2fe'}" stroke="${INK}" stroke-width="2"/>`
      const txt = inner?.[j]?.[i]
      if (txt) s += T(x + ws[i] / 2, y + hs[j] / 2 + 5, txt, 13)
      y += hs[j]
    })
    x += ws[i]
  })
  let y = y0
  rows.forEach((r, j) => {
    s += T(x0 - 8, y + hs[j] / 2 + 5, th(r), 14, INK, 'end')
    y += hs[j]
  })
  return svg(s + '</svg>')
}

/** İşlem makinesi (yönerge akışı): başlangıç kutusu → işlemler → sonuç kutusu */
function flow(start: string, ops: string[], end = '?'): Visual {
  const bw = 52, aw = 54, h = 40
  const W = (ops.length + 1) * bw + ops.length * aw + 8
  let s = `<svg viewBox="0 0 ${W} 70">`
  let x = 4
  for (let i = 0; i <= ops.length; i++) {
    const label = i === 0 ? start : i === ops.length ? end : ''
    s += `<rect x="${x}" y="24" width="${bw}" height="${h}" rx="8" fill="${i === 0 ? '#dbeafe' : i === ops.length ? '#ffedd5' : '#fff'}" stroke="${INK}" stroke-width="2"/>`
    if (label) s += T(x + bw / 2, 50, label, label.length > 4 ? 12 : 15, label === '?' ? ORANGE : INK)
    x += bw
    if (i < ops.length) {
      s += `<line x1="${x + 4}" y1="44" x2="${x + aw - 9}" y2="44" stroke="${INK}" stroke-width="2"/><polygon points="${x + aw - 4},44 ${x + aw - 12},39 ${x + aw - 12},49" fill="${INK}"/>`
      s += T(x + aw / 2, 17, ops[i], 13, ORANGE)
      x += aw
    }
  }
  return svg(s + '</svg>')
}

/** Cetvel (cm ve mm çizgileri) ve üzerinde mm uzunluğunda bir çubuk */
function ruler(mm: number): Visual {
  const cm = Math.ceil(mm / 10) + 1, u = 2.4, x0 = 14
  const W = x0 * 2 + cm * 10 * u
  let s = `<svg viewBox="0 0 ${r1(W)} 84">`
  s += `<rect x="${x0}" y="6" width="${r1(mm * u)}" height="16" rx="6" fill="#fbbf24" stroke="${INK}" stroke-width="1.5"/>`
  s += `<line x1="${r1(x0 + mm * u)}" y1="22" x2="${r1(x0 + mm * u)}" y2="30" stroke="${ORANGE}" stroke-width="1.5" stroke-dasharray="2 2"/>`
  s += `<rect x="${x0 - 8}" y="30" width="${r1(cm * 10 * u + 16)}" height="48" rx="4" fill="#fef3c7" stroke="${INK}" stroke-width="1.5"/>`
  for (let k = 0; k <= cm * 10; k++) {
    const x = r1(x0 + k * u), len = k % 10 === 0 ? 16 : k % 5 === 0 ? 11 : 6
    s += `<line x1="${x}" y1="30" x2="${x}" y2="${30 + len}" stroke="${INK}" stroke-width="${k % 10 === 0 ? 1.4 : 0.7}"/>`
    if (k % 10 === 0) s += T(x, 62, k / 10, 11)
  }
  return svg(s + '</svg>')
}

/** Kenar uzunlukları yazılı dikdörtgen/kare (yalnızca iki kenar etiketli) */
function sideRect(w: number, h: number, unit = 'cm'): Visual {
  const k = Math.min(200 / w, 100 / h), rw = w * k, rh = h * k
  let s = `<svg viewBox="0 0 ${r1(rw + 80)} ${r1(rh + 40)}">`
  s += `<rect x="64" y="28" width="${r1(rw)}" height="${r1(rh)}" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5"/>`
  s += T(64 + rw / 2, 20, `${w} ${unit}`, 13) + T(58, 28 + rh / 2 + 5, `${h} ${unit}`, 13, INK, 'end')
  return svg(s + '</svg>')
}

/** Kenar uzunlukları yazılı üçgen (gerçek oranlarla): taban a, sol kenar b, sağ kenar c */
function sideTri(a: number, b: number, c: number, unit = 'cm'): Visual {
  const cx = (b * b - c * c + a * a) / (2 * a), cy = Math.sqrt(Math.max(1, b * b - cx * cx))
  const minX = Math.min(0, cx), maxX = Math.max(a, cx)
  const k = Math.min(200 / (maxX - minX), 110 / cy)
  const P = (x: number, y: number) => [60 + (x - minX) * k, 14 + (cy - y) * k]
  const [ax, ay] = P(0, 0), [bx, by] = P(a, 0), [qx, qy] = P(cx, cy)
  let s = `<svg viewBox="0 0 ${r1(60 + (maxX - minX) * k + 64)} ${r1(14 + cy * k + 28)}">`
  s += `<polygon points="${r1(ax)},${r1(ay)} ${r1(bx)},${r1(by)} ${r1(qx)},${r1(qy)}" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  s += T((ax + bx) / 2, ay + 20, `${a} ${unit}`, 13)
  s += T((ax + qx) / 2 - 8, (ay + qy) / 2 + 4, `${b} ${unit}`, 13, INK, 'end')
  s += T((bx + qx) / 2 + 8, (by + qy) / 2 + 4, `${c} ${unit}`, 13, INK, 'start')
  return svg(s + '</svg>')
}

/** Birim karelerden yan yana dikdörtgenler: [en, boy] */
function rectsGrid(list: [number, number][]): Visual {
  const u = 22, H = Math.max(...list.map((r) => r[1])) * u + 12
  let x = 6, s = ''
  for (const [w, h] of list) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) s += `<rect x="${x + i * u}" y="${6 + j * u}" width="${u}" height="${u}" fill="#c7d2fe" stroke="${INK}"/>`
    x += w * u + 34
  }
  return svg(`<svg viewBox="0 0 ${x - 28} ${H}">${s}</svg>`)
}

/** Kibrit çöplerinden yan yana kareler: her sayı bir adım */
function matchRow(ks: number[]): Visual {
  const u = 26, gap = 30
  const seg = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>`
  let x = 10, s = ''
  for (const k of ks) {
    for (let i = 0; i < k; i++) s += seg(x + i * u + 3, 8, x + (i + 1) * u - 3, 8) + seg(x + i * u + 3, 8 + u, x + (i + 1) * u - 3, 8 + u)
    for (let i = 0; i <= k; i++) s += seg(x + i * u, 11, x + i * u, 5 + u)
    x += k * u + gap
  }
  return svg(`<svg viewBox="0 0 ${x - gap + 10} ${u + 16}">${s}</svg>`)
}

/** Kareli zeminde kodla çizilen yol: R/L/U/D + birim, B = başlangıca dön */
function pathGrid(start: [number, number], moves: string, cols = 8, rows = 6): Visual {
  const u = 30
  let s = `<svg viewBox="0 0 ${cols * u + 12} ${rows * u + 12}"><g transform="translate(6 6)">`
  for (let i = 0; i <= cols; i++) s += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${rows * u}" stroke="#cbd5e1"/>`
  for (let j = 0; j <= rows; j++) s += `<line x1="0" y1="${j * u}" x2="${cols * u}" y2="${j * u}" stroke="#cbd5e1"/>`
  let [x, y] = start
  const pts: [number, number][] = [[x, y]]
  for (const m of moves.split(' ')) {
    if (m === 'B') { pts.push([start[0], start[1]]); continue }
    const k = Number(m.slice(1))
    if (m[0] === 'R') x += k
    if (m[0] === 'L') x -= k
    if (m[0] === 'U') y -= k
    if (m[0] === 'D') y += k
    pts.push([x, y])
  }
  s += `<polyline points="${pts.map(([a, b]) => `${a * u},${b * u}`).join(' ')}" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linejoin="round"/>`
  s += `<circle cx="${start[0] * u}" cy="${start[1] * u}" r="7" fill="#22c55e" stroke="#fff" stroke-width="2"/>`
  s += T(start[0] * u - 12, start[1] * u - 10, 'A', 14)
  return svg(s + '</g></svg>')
}

/** İki veri gruplu nokta grafiği */
function dotPlot2(cats: string[], a: number[], b: number[], la: string, lb: string): Visual {
  const cw = 78, r = 6, step = 15, max = Math.max(...a, ...b)
  const top = 36, base = top + max * step + 6
  const W = cats.length * cw + 16
  let s = `<svg viewBox="0 0 ${W} ${base + 30}">`
  s += `<circle cx="16" cy="14" r="${r}" fill="${BLUE}"/>` + T(28, 19, la, 13, INK, 'start')
  s += `<circle cx="${W / 2 + 8}" cy="14" r="${r}" fill="${ORANGE}"/>` + T(W / 2 + 20, 19, lb, 13, INK, 'start')
  s += `<line x1="6" y1="${base}" x2="${W - 6}" y2="${base}" stroke="${INK}" stroke-width="2"/>`
  cats.forEach((c, i) => {
    const cx = 8 + i * cw + cw / 2
    for (let k = 0; k < a[i]; k++) s += `<circle cx="${cx - 10}" cy="${base - 9 - k * step}" r="${r}" fill="${BLUE}"/>`
    for (let k = 0; k < b[i]; k++) s += `<circle cx="${cx + 10}" cy="${base - 9 - k * step}" r="${r}" fill="${ORANGE}"/>`
    s += T(cx, base + 20, c, 12)
  })
  return svg(s + '</svg>')
}

/** Çetele: beşli gruplar (4 çizgi + çapraz) */
function tally(n: number): Visual {
  const groups = Math.floor(n / 5), rest = n % 5, gw = 44
  const W = (groups + (rest ? 1 : 0)) * gw + 12
  const ln = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
  let s = ''
  for (let g = 0; g < groups; g++) {
    const x = 12 + g * gw
    for (let k = 0; k < 4; k++) s += ln(x + k * 7, 8, x + k * 7, 44)
    s += ln(x - 5, 38, x + 26, 14)
  }
  for (let k = 0; k < rest; k++) s += ln(12 + groups * gw + k * 7, 8, 12 + groups * gw + k * 7, 44)
  return svg(`<svg viewBox="0 0 ${W} 52">${s}</svg>`)
}

/** Olasılık çizgisi: imkânsız – olabilir – kesin */
const PROB_LINE = svg(
  `<svg viewBox="0 0 320 64"><defs><linearGradient id="pl4" x1="0" x2="1"><stop offset="0" stop-color="#ef4444"/><stop offset="0.5" stop-color="#eab308"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs><rect x="20" y="16" width="280" height="10" rx="5" fill="url(#pl4)"/>` +
    [20, 160, 300].map((x) => `<circle cx="${x}" cy="21" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/>`).join('') +
    T(28, 52, 'İmkânsız', 13, INK, 'start') + T(160, 52, 'Olabilir', 13) + T(296, 52, 'Kesin', 13, INK, 'end') + '</svg>',
)

// ─── Sabit çizimler ─────────────────────────────────────────────────────────

const NET_STYLE = `fill="#c7d2fe" stroke="${INK}" stroke-width="2" stroke-linejoin="round"`

/** Küp açınımı (numaralı): 1–5, 3–6, 2–4 karşılıklı yüzler */
const CUBE_NET = svg(
  `<svg viewBox="0 0 130 170"><g ${NET_STYLE}><rect x="45" y="5" width="40" height="40"/><rect x="5" y="45" width="40" height="40"/><rect x="45" y="45" width="40" height="40"/><rect x="85" y="45" width="40" height="40"/><rect x="45" y="85" width="40" height="40"/><rect x="45" y="125" width="40" height="40"/></g>` +
    T(65, 32, 1, 20) + T(25, 72, 2, 20) + T(65, 72, 3, 20) + T(105, 72, 4, 20) + T(65, 112, 5, 20) + T(65, 152, 6, 20) + '</svg>',
)
const CUBE_NET_PLAIN = svg(
  `<svg viewBox="0 0 170 130"><g ${NET_STYLE} transform="translate(5 5)"><rect x="40" y="0" width="40" height="40"/><rect x="0" y="40" width="40" height="40"/><rect x="40" y="40" width="40" height="40"/><rect x="80" y="40" width="40" height="40"/><rect x="120" y="40" width="40" height="40"/><rect x="40" y="80" width="40" height="40"/></g></svg>`,
)
const CUBOID_NET = svg(
  `<svg viewBox="0 0 148 78"><g ${NET_STYLE} transform="translate(2 2)"><rect x="22" y="0" width="50" height="22"/><rect x="0" y="22" width="22" height="30"/><rect x="22" y="22" width="50" height="30"/><rect x="72" y="22" width="22" height="30"/><rect x="94" y="22" width="50" height="30"/><rect x="22" y="52" width="50" height="22"/></g></svg>`,
)
const PRISM_NET = svg(
  `<svg viewBox="0 0 184 124"><g ${NET_STYLE} transform="translate(2 2)"><rect x="0" y="34" width="60" height="50"/><rect x="60" y="34" width="60" height="50"/><rect x="120" y="34" width="60" height="50"/><polygon points="60,34 120,34 90,0"/><polygon points="60,84 120,84 90,118"/></g></svg>`,
)
const CYL_NET = svg(
  `<svg viewBox="0 0 160 134"><g ${NET_STYLE}><circle cx="80" cy="22" r="18"/><rect x="20" y="40" width="120" height="52"/><circle cx="80" cy="110" r="18"/></g></svg>`,
)
const PYR_NET = svg(
  `<svg viewBox="0 0 130 130"><g ${NET_STYLE}><rect x="40" y="40" width="50" height="50"/><polygon points="40,40 90,40 65,5"/><polygon points="40,90 90,90 65,125"/><polygon points="40,40 40,90 5,65"/><polygon points="90,40 90,90 125,65"/></g></svg>`,
)
const CONE_NET = svg(
  `<svg viewBox="0 0 140 122"><g ${NET_STYLE}><path d="M70 8 L110.2 65.3 A70 70 0 0 1 29.8 65.3 Z"/><circle cx="70" cy="98" r="20"/></g></svg>`,
)
/** Küp açınımı OLMAYAN 2 × 3 kare */
const BAD_NET = svg(
  `<svg viewBox="0 0 128 88"><g ${NET_STYLE} transform="translate(4 4)"><rect x="0" y="0" width="40" height="40"/><rect x="40" y="0" width="40" height="40"/><rect x="80" y="0" width="40" height="40"/><rect x="0" y="40" width="40" height="40"/><rect x="40" y="40" width="40" height="40"/><rect x="80" y="40" width="40" height="40"/></g></svg>`,
)

/** 60°’lik açı, 15°’lik 4 dilim */
const WEDGE_60_4 = svg(
  '<svg viewBox="0 0 120 110"><g stroke="#1f2340" stroke-width="1.5"><path d="M20 100 L100 100 A80 80 0 0 0 97.27 79.29 Z" fill="#fde68a"/><path d="M20 100 L97.27 79.29 A80 80 0 0 0 89.28 60 Z" fill="#fca5a5"/><path d="M20 100 L89.28 60 A80 80 0 0 0 76.57 43.43 Z" fill="#fde68a"/><path d="M20 100 L76.57 43.43 A80 80 0 0 0 60 30.72 Z" fill="#fca5a5"/></g><circle cx="20" cy="100" r="3" fill="#1f2340"/></svg>',
)
/** 90°’lik açı, 30°’lik 3 dilim */
const WEDGE_90_3 = svg(
  '<svg viewBox="0 0 120 110"><g stroke="#1f2340" stroke-width="1.5"><path d="M20 100 L100 100 A80 80 0 0 0 89.28 60 Z" fill="#fde68a"/><path d="M20 100 L89.28 60 A80 80 0 0 0 60 30.72 Z" fill="#fca5a5"/><path d="M20 100 L60 30.72 A80 80 0 0 0 20 20 Z" fill="#fde68a"/></g><circle cx="20" cy="100" r="3" fill="#1f2340"/></svg>',
)
/** 90°’lik açı, 15°’lik 6 dilim */
const WEDGE_90_6 = svg(
  '<svg viewBox="0 0 120 110"><g stroke="#1f2340" stroke-width="1.5"><path d="M20 100 L100 100 A80 80 0 0 0 97.27 79.29 Z" fill="#fde68a"/><path d="M20 100 L97.27 79.29 A80 80 0 0 0 89.28 60 Z" fill="#fca5a5"/><path d="M20 100 L89.28 60 A80 80 0 0 0 76.57 43.43 Z" fill="#fde68a"/><path d="M20 100 L76.57 43.43 A80 80 0 0 0 60 30.72 Z" fill="#fca5a5"/><path d="M20 100 L60 30.72 A80 80 0 0 0 40.71 22.73 Z" fill="#fde68a"/><path d="M20 100 L40.71 22.73 A80 80 0 0 0 20 20 Z" fill="#fca5a5"/></g><circle cx="20" cy="100" r="3" fill="#1f2340"/></svg>',
)

/** Kare, üçgen ve dikdörtgenden oluşan ev */
const HOUSE = svg(
  '<svg viewBox="0 0 120 140"><polygon points="60,8 108,48 12,48" fill="#f97316" stroke="#1f2340" stroke-width="3"/><rect x="20" y="48" width="80" height="80" fill="#93c5fd" stroke="#1f2340" stroke-width="3"/><rect x="50" y="88" width="20" height="40" fill="#fde68a" stroke="#1f2340" stroke-width="2"/></svg>',
)

/** Yaklaşık alan: 6 × 6 kareli zeminde yarıçapı 2 birim olan daire (≈ 12–13 birim kare) */
const CIRCLE_ON_GRID = svg(
  `<svg viewBox="0 0 184 184"><g transform="translate(2 2)">${Array.from({ length: 7 }, (_, i) => `<line x1="${i * 30}" y1="0" x2="${i * 30}" y2="180" stroke="#cbd5e1"/><line x1="0" y1="${i * 30}" x2="180" y2="${i * 30}" stroke="#cbd5e1"/>`).join('')}<circle cx="90" cy="90" r="60" fill="#a7f3d0" fill-opacity="0.8" stroke="${INK}" stroke-width="2.5"/></g></svg>`,
)

const SYM_L = ['1,0', '1,1', '1,2', '2,2']

const SPORTS_TABLE: Visual = {
  kind: 'table',
  headers: ['Spor dalı', '4/A', '4/B'],
  rows: [
    ['⚽ Futbol', 9, 6],
    ['🏀 Basketbol', 5, 8],
    ['🏐 Voleybol', 7, 7],
    ['🏊 Yüzme', 3, 5],
  ],
}

const TRANSPORT = dotPlot2(['Yürüyerek', 'Servisle', 'Arabayla', 'Bisikletle'], [9, 6, 5, 3], [6, 8, 4, 4], '4/A', '4/B')

/** Şerit modeli kısayolu */
const tape = (parts: [string, number][], total?: string, compare?: [string, number][]): Visual => ({
  kind: 'tape',
  parts: parts.map(([label, value]) => ({ label, value })),
  total,
  compare: compare?.map(([label, value]) => ({ label, value })),
})
const eqParts = (n: number, label = ''): [string, number][] => Array.from({ length: n }, () => [label, 1])

const CMP = ['<', '=', '>']

export const grade4: Activity[] = [
  // ── Sayılar ve Nicelikler (1) ───────────────────────────────────────────

  // MAT.4.1.1
  {
    id: 'g4-binlik-bloklar',
    outcomes: ['MAT.4.1.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Binlik bloklarla sayı oluştur',
    instructions: 'Binlik, yüzlük, onluk ve birlik blokları kullanarak sayıyı oluştur.',
    level: 1,
    launch: {
      text: 'Okul kütüphanemizde 1.452 kitap var. Bunu tek tek birlik bloklarla göstermek ne kadar sürerdi? 10 yüzlük bir araya gelince ne oluşur?',
      visual: { kind: 'blocks', thousands: 1, hundreds: 4, tens: 5, ones: 2 },
    },
    reflect: '10 tane yüzlük blok neden 1 binlik blok eder? Bir arkadaşına bloklarla anlat.',
    tool: 'base10',
    config: { maxPlace: 'thousands' },
    tasks: [
      { prompt: 'Bloklarla 1.452 sayısını oluştur.', target: { value: 1452 }, hints: ['Kaç tane binlik bloğa ihtiyacın var?', 'Binlikten sonra yüzlükleri, onlukları ve birlikleri yerleştir.'], explain: '1.452 = 1 binlik + 4 yüzlük + 5 onluk + 2 birlik' },
      { prompt: 'Bir okulda 2.410 öğrenci var. Bu sayıyı bloklarla göster.', target: { value: 2410 }, explain: '2.410’da hiç birlik yok; birler basamağındaki 0 bunu söyler.' },
      { prompt: '3.057 sayısını oluştur. Hangi basamakta hiç blok olmayacak?', target: { value: 3057 }, hints: ['Yüzler basamağında hangi rakam var?'], explain: 'Yüzler basamağındaki 0, hiç yüzlük blok olmadığını gösterir.' },
      { prompt: '4.000 + 600 + 8 sayısını bloklarla oluştur.', target: { value: 4608 }, hints: ['Hiç onluk gerekiyor mu?'], explain: '4.608: onlar basamağı 0, çünkü hiç onluk yok.' },
    ],
  },
  {
    id: 'g4-sayilarin-okunusu',
    outcomes: ['MAT.4.1.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Büyük sayıları oku',
    instructions: 'Her sayıyı okunuşuyla eşleştir. Önce binler bölüğünü, sonra birler bölüğünü oku.',
    level: 1,
    launch: { text: 'Bir spiker “kırk beş bin seksen kişi” dedi. Ekranda 45.080 mi yazmalı, 4.580 mi? Sayıları bölüklere ayırınca okumak kolaylaşır.' },
    reflect: '207.035 sayısını okurken sıfırlara ne oluyor? Okunuşta neden duyulmuyorlar?',
    pairs: [
      { left: '4.508', right: 'dört bin beş yüz sekiz' },
      { left: '45.080', right: 'kırk beş bin seksen' },
      { left: '450.800', right: 'dört yüz elli bin sekiz yüz' },
      { left: '27.315', right: 'yirmi yedi bin üç yüz on beş' },
      { left: '207.035', right: 'iki yüz yedi bin otuz beş' },
      { left: '100.001', right: 'yüz bin bir' },
      { left: '9.090', right: 'dokuz bin doksan' },
      { left: '360.400', right: 'üç yüz altmış bin dört yüz' },
    ],
    perRound: 4,
  },
  {
    id: 'g4-sayilari-yaz',
    outcomes: ['MAT.4.1.1'],
    type: 'fill',
    stage: 'problem',
    title: 'Haberdeki sayılar',
    instructions: 'Okunuşu verilen sayıyı rakamlarla yaz.',
    level: 2,
    launch: { text: 'Gazetede “Maçı kırk iki bin altı yüz on beş kişi izledi.” yazıyor. Bu sayıyı rakamlarla nasıl yazarsın?' },
    reflect: 'Okunuşu verilen bir sayıyı yazarken hangi basamağa 0 yazman gerektiğini nasıl anlıyorsun?',
    items: [
      { text: 'Bir stadyumda kırk iki bin altı yüz on beş kişi maç izledi. Rakamla: __', answers: ['42615'], hints: ['Önce binler bölüğünü yaz: kırk iki bin → 42.', 'Sonra birler bölüğünü yaz: altı yüz on beş.'] },
      { text: 'Ağrı Dağı’nın yüksekliği beş bin yüz otuz yedi metredir. Rakamla: __ m', answers: ['5137'] },
      { text: 'Bir kitapta on iki bin beş yüz kelime var. Rakamla: __', answers: ['12500'] },
      { text: 'Bir şehirde üç yüz yedi bin seksen dört kişi yaşıyor. Rakamla: __', answers: ['307084'], hints: ['Birler bölüğü “seksen dört”. Bu bölük de üç basamaklı olmalı. Yüzler basamağına ne yazarsın?'], explain: '307.084: birler bölüğü 084, çünkü hiç yüzlük yok.' },
      { text: 'Bir evin fiyatı dokuz yüz elli bin lira. Rakamla: __ TL', answers: ['950000'] },
      { text: 'Bir fabrika bir günde altmış bin altı yüz altı şişe su üretti. Rakamla: __', answers: ['60606'], hints: ['Binler bölüğü: altmış → 60. Birler bölüğü: altı yüz altı → kaç basamaklı?'] },
      { text: 'Yüz binler basamağında 2, binler basamağında 5, onlar basamağında 3 olan, diğer basamakları 0 olan sayı __', answers: ['205030'], hints: ['Altı basamak çiz: _ _ _ . _ _ _ ve rakamları yerine koy.'] },
    ],
  },

  // MAT.4.1.2
  {
    id: 'g4-basamak-tablosu',
    outcomes: ['MAT.4.1.2'],
    type: 'fill',
    stage: 'model',
    title: 'Basamak tablosu',
    instructions: 'Basamak tablosuna bak ve boşlukları doldur.',
    level: 1,
    launch: { text: 'Bir basamak tablosunda her sütun, sağındakinin 10 katıdır. Rakam aynı kalsa bile yeri değişince değeri nasıl değişir?', visual: placeChart(222222) },
    reflect: '222.222 sayısındaki altı tane 2’nin hepsi aynı değerde mi? Neden?',
    items: [
      { text: 'Tablodaki sayı __', answers: ['305164'], visual: placeChart(305164), hints: ['Önce binler bölüğünü oku, sonra birler bölüğünü.'] },
      { text: '8 rakamının basamak değeri __', answers: ['80000'], visual: placeChart(482917), hints: ['8 hangi sütunda?', 'On binler basamağındaki 1 rakamı 10.000 değerindedir. 8 tane olursa?'] },
      { text: 'Bu sayının binler bölüğü __, birler bölüğü __', answers: ['250', '0'], visual: placeChart(250000), explain: 'Binler bölüğü 250, birler bölüğü 000 (yani 0): 250 bin.' },
      { text: 'Bu sayı __ tane binlik eder.', answers: ['36'], visual: placeChart(36000), hints: ['Binler bölüğündeki sayıyı oku.'], explain: '36.000 = 36 binlik.' },
      { text: 'Bu sayının 10 katı __', answers: ['40000'], visual: placeChart(4000), hints: ['4 binliğin 10 katı kaç binlik eder? 10 binlik kaç on binlik eder?'], explain: '4 binlik × 10 = 40 binlik = 4 on binlik. 4 rakamı bir basamak sola geçer.' },
      { text: 'Tablodaki iki 1 rakamından soldaki, sağdakinin __ katı değerindedir.', answers: ['10'], visual: placeChart(110000), explain: '100.000, 10.000’in 10 katıdır.' },
      { text: 'En büyük basamak değerine sahip rakam __, değeri __', answers: ['1', '100000'], visual: placeChart(123456) },
    ],
  },
  {
    id: 'g4-bolukler',
    outcomes: ['MAT.4.1.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Birler bölüğü mü, binler bölüğü mü?',
    instructions: 'Her basamağı ya da rakamı ait olduğu bölüğe yerleştir.',
    level: 2,
    launch: { text: 'Uzun sayıları okurken sağdan üçer üçer ayırırız. Her üçlü bir bölüktür. 482.917 sayısında nokta neden oraya konmuş?' },
    reflect: 'Sayıları sağdan üçer üçer ayırmak okumayı neden kolaylaştırır?',
    categories: [
      { id: 'birler', label: 'Birler bölüğü', color: '#3b82f6' },
      { id: 'binler', label: 'Binler bölüğü', color: '#f97316' },
    ],
    items: [
      { content: 'Birler basamağı', category: 'birler' },
      { content: 'Onlar basamağı', category: 'birler' },
      { content: 'Yüzler basamağı', category: 'birler', explain: 'Birler bölüğü: birler, onlar ve yüzler basamakları.' },
      { content: 'Binler basamağı', category: 'binler', explain: 'Binler bölüğü: binler, on binler ve yüz binler basamakları.' },
      { content: 'On binler basamağı', category: 'binler' },
      { content: 'Yüz binler basamağı', category: 'binler' },
      { content: '482.917 sayısındaki 9', category: 'birler', explain: '9 yüzler basamağında: noktanın sağında kalıyor.' },
      { content: '482.917 sayısındaki 8', category: 'binler', explain: '8 on binler basamağında: noktanın solunda.' },
      { content: '305.164 sayısındaki 5', category: 'binler' },
      { content: '305.164 sayısındaki 6', category: 'birler' },
    ],
  },
  {
    id: 'g4-cozumleme',
    outcomes: ['MAT.4.1.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Sayıları farklı yollarla çözümle',
    instructions: 'Sayıları basamaklarına ayır ya da birleştir. Bir sayıyı farklı biçimlerde parçalayabilirsin.',
    level: 2,
    launch: { text: 'Bir fabrika 24.700 kalem üretti ve 100’lük kutulara koydu. Kaç kutu doldu? Bir sayıyı yüzlük, binlik gibi farklı birimlerle düşünebiliriz.' },
    reflect: '3 binlik 14 yüzlük ile 4 binlik 4 yüzlük neden aynı sayıdır?',
    items: [
      { text: '35.472 = 30.000 + 5.000 + 400 + __ + 2', answers: ['70'] },
      { text: '208.019 = 200.000 + 8.000 + __ + 9', answers: ['10'] },
      { text: '600.000 + 40.000 + 300 + 5 = __', answers: ['640305'], hints: ['Hangi basamaklar boş kalıyor? Oralara 0 yazmayı unutma.'] },
      { text: '4 yüz binlik + 2 on binlik + 7 binlik + 5 onluk = __', answers: ['427050'] },
      { text: '83.650 sayısında 6’nın sayı değeri __, basamak değeri __', answers: ['6', '600'], hints: ['Sayı değeri rakamın kendisidir. Basamak değeri bulunduğu yere göre değişir.'] },
      { text: '24.700 = __ yüzlük', answers: ['247'], hints: ['1.000’de kaç yüzlük var? 24.000’de kaç yüzlük var?'], explain: '24.000 = 240 yüzlük, 700 = 7 yüzlük → 247 yüzlük.' },
      { text: '3 binlik 14 yüzlük = __', answers: ['4400'], hints: ['10 yüzlük kaç binlik eder?'], explain: '14 yüzlük = 1 binlik 4 yüzlük → 4 binlik 4 yüzlük = 4.400' },
      { text: '56.000 = 5 on binlik + __ binlik', answers: ['6'] },
    ],
  },
  {
    id: 'g4-basamak-farkli',
    outcomes: ['MAT.4.1.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Büyük sayılar)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçeneğin bir gerekçesi olabilir. Seç ve gerekçeni düşün.',
    level: 2,
    launch: { text: 'Dört sayı ya da ifade var; hangisi diğerlerinden farklı? Tek bir doğru cevap yok, önemli olan gerekçen!' },
    reflect: 'Seçtiğin cevabın gerekçesini bir arkadaşına açıkla. O başka bir seçeneği seçtiyse onun gerekçesi de doğru olabilir mi?',
    questions: [
      {
        prompt: 'Hangisi farklı?',
        choices: ['24 binlik', '240 yüzlük', '2.400 onluk', '2.400 birlik'],
        answer: 3,
        reasons: ['Binlik birimiyle söylenen tek ifade.', 'Yüzlük birimiyle söylenen tek ifade.', 'Onluk birimiyle söylenen tek ifade.', 'Diğerleri 24.000 ederken bu yalnızca 2.400 eder.'],
      },
      {
        prompt: 'Hangisi farklı?',
        choices: ['482.917', '428.917', '482.971', '842.917'],
        answer: 0,
        reasons: ['Diğer üçü, bu sayının iki rakamının yer değiştirmesiyle elde edilmiş.', 'On binler basamağında 2 olan tek sayı.', 'Birler basamağında 1 olan tek sayı.', 'Yüz binler basamağında 8 olan, en büyük sayı.'],
      },
      {
        prompt: 'Hangisi farklı?',
        choices: ['1.000’in 10 katı', '100’ün 100 katı', '10.000', '1.000 tane 10'],
        answer: 2,
        reasons: ['Binlikten yola çıkan tek ifade.', 'Yüzlükten yola çıkan tek ifade.', 'Rakamlarla doğrudan yazılmış tek sayı.', 'Onluklarla anlatılan tek ifade.'],
      },
      {
        prompt: 'Hangisi farklı?',
        choices: ['70.007', '70.070', '70.700', '77.000'],
        answer: 3,
        reasons: ['Birler basamağı 0 olmayan tek sayı.', 'Onlar basamağında 7 olan tek sayı.', 'Yüzler basamağında 7 olan tek sayı.', 'Birler bölüğü 000 olan tek sayı.'],
      },
      {
        prompt: 'Hangisi farklı?',
        choices: ['999.999', '100.000', '1.000', '10.000'],
        answer: 0,
        reasons: ['Hiç 0 içermeyen tek sayı.', 'Altı basamaklı en küçük sayı.', 'Dört basamaklı tek sayı.', 'Beş basamaklı tek sayı.'],
      },
    ],
  },

  // MAT.4.1.3
  {
    id: 'g4-yuvarla-sayi-dogrusu',
    outcomes: ['MAT.4.1.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusunda yuvarla',
    instructions: 'Sayıyı en yakın yüzlüğe yuvarla ve sayı doğrusunda işaretle.',
    level: 2,
    launch: { text: 'Kütüphanede 3.462 kitap var. Müdür “Yaklaşık 3.500 kitabımız var.” dedi. Neden 3.400 demedi?', visual: { kind: 'numberline', min: 3400, max: 3500, step: 10, points: [3462] } },
    reflect: 'Bir sayıyı yuvarlarken sayı doğrusu sana nasıl yardım ediyor?',
    tool: 'numberline',
    config: { min: 3000, max: 4000, step: 100 },
    tasks: [
      { prompt: '3.462 sayısını en yakın yüzlüğe yuvarla ve işaretle.', target: { value: 3500 }, hints: ['3.462 hangi iki yüzlüğün arasında?', 'Bu iki yüzlüğün tam ortası 3.450. 3.462 ortayı geçti mi?'], explain: '3.462, 3.450’yi geçti; 3.500’e daha yakın.' },
      { prompt: '3.849 sayısını en yakın yüzlüğe yuvarla ve işaretle.', target: { value: 3800 }, hints: ['3.800 ile 3.900’ün ortası kaç?'], explain: '3.849, ortadaki 3.850’ye varmadı; 3.800’e daha yakın.' },
      { prompt: '3.150 sayısını en yakın yüzlüğe yuvarla ve işaretle.', target: { value: 3200 }, hints: ['3.150 tam ortada. Tam ortadaki sayıları hangi yöne yuvarlarız?'], explain: 'Tam ortadaki sayılar bir üst yüzlüğe yuvarlanır: 3.200.' },
      { prompt: '3.709 sayısını en yakın yüzlüğe yuvarla ve işaretle.', target: { value: 3700 } },
    ],
  },
  {
    id: 'g4-yakin-yuzluk',
    outcomes: ['MAT.4.1.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Hangisine daha yakın?',
    instructions: 'Sayı doğrusundaki noktaya bak. Sayı hangi onluğa, yüzlüğe ya da binliğe daha yakın?',
    level: 2,
    launch: { text: 'Bir konsere 2.583 kişi başvurdu. Gazeteler “yaklaşık 2.600 kişi” yazdı. Sayıyı sayı doğrusunda düşünürsek neden 2.600?' },
    reflect: 'Aynı sayıyı onluğa, yüzlüğe ve binliğe yuvarlayınca sonuçlar neden farklı çıkıyor?',
    questions: [
      { prompt: { text: 'Nokta 2.583’ü gösteriyor. En yakın yüzlük hangisi?', visual: { kind: 'numberline', min: 2500, max: 2600, step: 10, points: [2583] } }, choices: ['2.500', '2.600', '2.580'], answer: 1, feedback: ['2.583, ortadaki 2.550’yi geçmiş; 2.600’e daha yakın.', null, '2.580 en yakın onluktur; soru yüzlüğü soruyor.'] },
      { prompt: { text: 'Aynı sayı: 2.583. En yakın onluk hangisi?', visual: { kind: 'numberline', min: 2580, max: 2590, step: 1, points: [2583] } }, choices: ['2.580', '2.590', '2.600'], answer: 0, feedback: [null, '2.583’ten 2.580’e 3, 2.590’a 7 adım var.', '2.600 en yakın yüzlüktür; soru onluğu soruyor.'] },
      { prompt: { text: 'Nokta 8.750’yi gösteriyor. En yakın binlik hangisi?', visual: { kind: 'numberline', min: 8000, max: 9000, step: 100, points: [8750] } }, choices: ['8.000', '9.000', '8.800'], answer: 1, feedback: ['8.750, ortadaki 8.500’ü geçmiş; 9.000’e daha yakın.', null, '8.800 en yakın yüzlüktür; soru binliği soruyor.'] },
      { prompt: { text: 'Nokta 1.249’u gösteriyor. En yakın yüzlük hangisi?', visual: { kind: 'numberline', min: 1200, max: 1300, step: 10, points: [1249] } }, choices: ['1.200', '1.300', '1.250'], answer: 0, feedback: [null, '1.249 ortadaki 1.250’ye bile ulaşmadı; 1.200’e daha yakın.', '1.250 yuvarlak bir sayı ama yüzlük değil.'] },
      { prompt: { text: 'Nokta 6.995’i gösteriyor. En yakın onluk hangisi?', visual: { kind: 'numberline', min: 6900, max: 7000, step: 10, points: [6995] } }, choices: ['6.990', '7.000', '6.900'], answer: 1, feedback: ['6.995, 6.990 ile 7.000’in tam ortasında. Tam ortadaki sayıları yukarı yuvarlarız.', null, '6.900 en yakın onluk değil; aradaki onlukları atladın.'] },
      { prompt: { text: 'Nokta 3.462’yi gösteriyor. En yakın binlik hangisi?', visual: { kind: 'numberline', min: 3000, max: 4000, step: 100, points: [3462] } }, choices: ['3.000', '4.000', '3.500'], answer: 0, feedback: [null, '3.462, ortadaki 3.500’e varmadı; 3.000’e daha yakın.', '3.500 en yakın yüzlüktür; soru binliği soruyor.'] },
    ],
  },
  {
    id: 'g4-karsilastir',
    outcomes: ['MAT.4.1.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Hangisi daha büyük?',
    instructions: 'Doğru işareti seç: <, > veya =',
    level: 1,
    launch: { text: 'İki ilçeden birinin nüfusu 45.302, diğerinin 45.230. Hangisi daha kalabalık? Karşılaştırmaya hangi basamaktan başlarsın?' },
    reflect: 'İki sayıyı karşılaştırırken hangi basamaktan başlıyorsun? Neden?',
    items: [
      { text: '45.302  __  45.230', answers: ['>'], choices: CMP, hints: ['On binler ve binler aynı. Sonraki basamağa bak.'] },
      { text: '199.999  __  200.000', answers: ['<'], choices: CMP, hints: ['199.999’a 1 eklersen kaç olur?'] },
      { text: '70.007  __  70.070', answers: ['<'], choices: CMP },
      { text: '312.450  __  312.405', answers: ['>'], choices: CMP },
      { text: '8.765  __  87.650', answers: ['<'], choices: CMP, hints: ['Önce basamak sayılarını karşılaştır.'] },
      { text: '62.084  __  60.000 + 2.000 + 80 + 4', answers: ['='], choices: CMP },
      { text: '903.110  __  930.011', answers: ['<'], choices: CMP, hints: ['Soldan başlayarak aynı basamaktaki rakamları karşılaştır.'] },
      { text: '540.000  __  504.000', answers: ['>'], choices: CMP },
    ],
  },
  {
    id: 'g4-sayilari-sirala',
    outcomes: ['MAT.4.1.3'],
    type: 'sort',
    stage: 'problem',
    title: 'Dağlar ve şehirler',
    instructions: 'Sayıları istenen sıraya koy.',
    level: 2,
    launch: { text: 'Türkiye’nin yüksek dağlarını bir posterde sıralamak istiyoruz. Yükseklikleri dört basamaklı. Hangisi en yüksek?' },
    reflect: 'Sıralarken iki sayının ilk rakamları aynıysa ne yaptın?',
    rounds: [
      { prompt: 'Dağları yüksekliklerine göre küçükten büyüğe sırala.', items: ['Uludağ: 2.543 m', 'Erciyes: 3.917 m', 'Süphan: 4.058 m', 'Ağrı: 5.137 m'], ends: ['En alçak', 'En yüksek'], hints: ['Binler basamaklarına bak.'] },
      { prompt: 'Yerleşim yerlerini nüfusa göre küçükten büyüğe sırala.', items: ['🏡 Köy: 2.480', '🏘️ Kasaba: 12.430', '🏙️ İlçe: 48.200', '🏙️ İlçe: 84.020', '🌆 Şehir: 248.000'], ends: ['En az', 'En çok'], hints: ['Önce basamak sayılarına bak.'] },
      { prompt: 'Büyükten küçüğe sırala. Dikkat: rakamlar benzer, yerleri farklı!', items: ['605.100', '560.010', '506.110', '501.600', '150.600'], ends: ['En büyük', 'En küçük'], hints: ['Yüz binler basamağı aynıysa on binler basamağına bak.'] },
    ],
  },

  // MAT.4.1.4
  {
    id: 'g4-hedef-sayi',
    outcomes: ['MAT.4.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Biner zıpla, hedefe ulaş',
    instructions: 'Biner sayarak ulaştığın sayıyı sayı doğrusunda işaretle.',
    level: 1,
    launch: { text: 'Bir kumbaraya her ay 1.000 TL atıyoruz. 2.000 TL’den başlarsak 5 ay sonra ne kadar olur? Sayı doğrusunda zıplayarak bulalım.' },
    reflect: 'Biner sayarken sayının hangi basamağı değişiyor, hangileri aynı kalıyor?',
    tool: 'numberline',
    config: { min: 0, max: 10000, step: 1000 },
    tasks: [
      { prompt: '2.000’den başla, biner ileriye 5 kez say. Ulaştığın sayıyı işaretle.', target: { value: 7000 }, hints: ['2.000, 3.000, … Her zıplayışta parmağını say.'] },
      { prompt: '9.000’den başla, biner geriye 6 kez say. Ulaştığın sayıyı işaretle.', target: { value: 3000 } },
      { prompt: '1.000’den başla, biner ileriye 8 kez say. Ulaştığın sayıyı işaretle.', target: { value: 9000 } },
      { prompt: '6.000’den başla, biner geriye 6 kez say. Ulaştığın sayıyı işaretle.', target: { value: 0 }, explain: '6.000’de 6 tane binlik var; 6 kez geri sayınca hiç kalmaz.' },
    ],
  },
  {
    id: 'g4-ritmik-dogru',
    outcomes: ['MAT.4.1.4'],
    type: 'fill',
    stage: 'model',
    title: 'Sayı doğrusunda ritmik sayma',
    instructions: 'Sayı doğrusundaki “?” yerlerine gelen sayıları soldan sağa yaz.',
    level: 2,
    launch: { text: 'Bir depoya paketler 100’lük kolilerle geliyor. Sayaç 4.700’ü gösteriyor; 3 koli daha gelince sayaç ne gösterir?', visual: { kind: 'numberline', min: 4700, max: 5000, step: 100, jumps: [4700, 4800, 4900, 5000] } },
    reflect: 'Yüzer sayarken binler basamağı ne zaman değişir? Bir örnekle açıkla.',
    items: [
      { text: 'Yüzer sayıyoruz. “?” yerine __ gelir.', answers: ['5000'], visual: { kind: 'numberline', min: 4700, max: 5300, step: 100, hidden: [5000] }, hints: ['4.900’e 100 eklersen yüzler basamağında 10 yüzlük olur. 10 yüzlük kaç eder?'] },
      { text: 'Onar sayıyoruz. “?” yerlerine __ ve __ gelir.', answers: ['2980', '3000'], visual: { kind: 'numberline', min: 2960, max: 3020, step: 10, hidden: [2980, 3000] } },
      { text: 'Biner sayıyoruz. “?” yerlerine __ ve __ gelir.', answers: ['6500', '8500'], visual: { kind: 'numberline', min: 3500, max: 9500, step: 1000, hidden: [6500, 8500] }, hints: ['Hangi basamak değişiyor? Yüzler basamağı aynı kalıyor mu?'] },
      { text: 'Yüzer sayıyoruz. “?” yerlerine __ ve __ gelir.', answers: ['9800', '10000'], visual: { kind: 'numberline', min: 9400, max: 10000, step: 100, hidden: [9800, 10000] }, hints: ['9.900’den 100 sonra hangi sayı gelir? On binler basamağına dikkat!'] },
      { text: 'Yüzer sayıyoruz. “?” yerine __ gelir.', answers: ['1550'], visual: { kind: 'numberline', min: 1250, max: 1850, step: 100, hidden: [1550] } },
      { text: '2.000’den yüzer 10 kez zıplayınca ulaşılan sayı __. Bu, biner saymada kaç adım eder? __', answers: ['3000', '1'], visual: { kind: 'numberline', min: 2000, max: 3000, step: 100, jumps: [2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000] }, explain: '10 tane yüz = 1 bin. 10 küçük zıplama, 1 büyük zıplama eder.' },
    ],
  },
  {
    id: 'g4-ritmik-problem',
    outcomes: ['MAT.4.1.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ritmik sayma problemleri',
    instructions: 'Ritmik sayarak problemi çöz.',
    level: 2,
    launch: { text: 'Bir sayaç her gün 1.000 artıyor. Yarın ne gösterir, 5 gün sonra ne gösterir? Ritmik sayma, ilerideki sayıyı tahmin etmenin kısa yoludur.' },
    reflect: '10 tane yüzer sayma ile 1 tane biner sayma neden aynı yere götürür?',
    questions: [
      { prompt: 'Bir fabrika her gün 1.000 şişe su üretiyor. Depoda 3.500 şişe varken 4 gün sonra kaç şişe olur?', choices: ['7.500', '3.504', '4.500', '8.500'], answer: 0, feedback: [null, 'Her gün 1 değil, 1.000 şişe ekleniyor.', 'Bu yalnızca 1 günlük üretim; 4 gün say.', '4 değil 5 kez saymışsın: 4.500, 5.500, 6.500, 7.500.'] },
      { prompt: 'Ece 10.000’den yüzer geriye sayarak 5 sayı söyledi: 10.000, 9.900, … Söylediği son sayı kaçtır?', choices: ['9.600', '9.500', '9.000', '5.000'], answer: 0, feedback: [null, '10.000 de söylenen sayılardan biri. Beş sayıyı tek tek say.', 'Yüzer değil biner geri saydın.', 'Her adımda yalnızca 100 azalıyor.'] },
      { prompt: '7.250’den onar ileri sayarken 7.300’e kaç adımda ulaşılır?', choices: ['5', '50', '3', '10'], answer: 0, feedback: [null, '50, aradaki fark; ama her adımda 10 ilerliyoruz.', '7.260, 7.270, … adımları tek tek say.', '10 adım 100 eder; 50 için kaç adım gerekir?'] },
      { prompt: 'Biner sayarken hangi basamaktaki rakam her adımda 1 artar?', choices: ['Binler basamağı', 'Birler basamağı', 'Yüzler basamağı'], answer: 0, feedback: [null, 'Birler basamağı 1 artsaydı birer sayıyor olurduk.', 'Yüzler basamağı yüzer saymada değişir.'] },
      { prompt: 'Can 2.900’den yüzer ileri sayarken “2.900, 2.1000” dedi. Doğrusu nedir?', choices: ['3.000', '2.910', '2.100', '2.000'], answer: 0, feedback: [null, 'Bu onar saymadır.', '2.100, 2.900’den küçük! İleri sayıyoruz.', 'Geri gittin; ileri sayıyoruz.'] },
      { prompt: 'Bir kütüphanede 6.400 kitap var. Her yıl 100 kitap ekleniyor. Kaç yıl sonra 7.000 kitap olur?', choices: ['6', '60', '600', '7'], answer: 0, feedback: [null, '60 yılda 6.000 kitap eklenirdi.', '600 aradaki kitap sayısı; içinde kaç tane 100 var?', '6.500, 6.600, … 7.000: zıplamaları tek tek say.'] },
    ],
  },

  // MAT.4.1.5
  {
    id: 'g4-sekil-oruntuleri',
    outcomes: ['MAT.4.1.5'],
    type: 'quiz',
    stage: 'model',
    title: 'Büyüyen şekil örüntüleri',
    instructions: 'Örüntüyü incele: Her adımda ne değişiyor?',
    level: 2,
    launch: { text: 'Bahçe yoluna taşlar diziliyor: ilk gün 1, sonra 3, sonra 5 taş. Her gün kaç taş ekleniyor? Değişimi görürsen ilerisini tahmin edebilirsin.', visual: { kind: 'pattern', items: ['🟦', '🟦🟦🟦', '🟦🟦🟦🟦🟦'] } },
    reflect: 'Bir şekil örüntüsünde “Her adımda ne değişiyor?” sorusunu nasıl cevapladın?',
    questions: [
      { prompt: { text: 'Her adımda kaç kare ekleniyor?', visual: { kind: 'pattern', items: ['🟦', '🟦🟦🟦', '🟦🟦🟦🟦🟦', '🟦🟦🟦🟦🟦🟦🟦'] } }, choices: ['1', '2', '3', '4'], answer: 1, feedback: ['Ardışık iki adımı karşılaştır: 1’den 3’e kaç artmış?', null, '3, ikinci adımdaki kare sayısı; artış miktarı değil.', '4 artsaydı 1, 5, 9 olurdu.'] },
      { prompt: { text: 'Bu örüntünün 5. adımında kaç kare olur?', visual: { kind: 'pattern', items: ['🟦', '🟦🟦🟦', '🟦🟦🟦🟦🟦', '🟦🟦🟦🟦🟦🟦🟦'] } }, choices: ['8', '10', '11', '9'], answer: 3, explain: '1, 3, 5, 7, 9: her adımda 2 kare ekleniyor.', feedback: ['Bu örüntüde hep tek sayıda kare var; 8 olamaz.', 'Her adımda 3 değil 2 kare ekleniyor.', '11, bir adım sonrası: 6. adım.', null] },
      { prompt: { text: 'Soru işaretinin yerine kaç yıldız gelmeli?', visual: { kind: 'pattern', items: ['⭐⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '?'] } }, choices: ['5', '3', '2', '4'], answer: 1, feedback: ['Örüntü azalıyor; geriye gitmiyoruz.', null, 'Bir adım fazla azalttın.', '4, üçüncü adım; sıradaki adım ondan 1 eksik.'] },
      { prompt: { text: 'Sıradaki adım hangisi?', visual: { kind: 'pattern', items: ['🔺', '🔺🔵', '🔺🔵🔺', '🔺🔵🔺🔵', '?'] } }, choices: ['🔵🔺🔵🔺🔵', '🔺🔵🔺🔵', '🔺🔵🔺🔵🔺', '🔺🔺🔵🔵🔺'], answer: 2, feedback: ['Şekil sayısı doğru ama örüntü hep 🔺 ile başlıyor.', 'Bu, önceki adımın aynısı; her adımda bir şekil ekleniyor.', null, 'Sıra bozulmuş: 🔺 ve 🔵 sırayla gelmeli.'] },
      { prompt: { text: 'Kibrit çöpleriyle yan yana kareler yapılıyor: 1 kare için 4, 2 kare için 7, 3 kare için 10 çöp gerekiyor. 4 kare için kaç çöp gerekir?', visual: matchRow([1, 2, 3]) }, choices: ['12', '14', '13', '16'], answer: 2, explain: 'Her yeni kare için 3 çöp eklenir: 10 + 3 = 13.', feedback: ['Her yeni kare için 2 değil 3 çöp eklenir.', 'Yeni kare öncekiyle bir çöpü paylaşır; 4 değil 3 çöp eklenir.', null, '4 × 4 = 16 diye düşündün; ama yan yana kareler ortak kenarı paylaşır.'] },
    ],
  },
  {
    id: 'g4-oruntu-kurali',
    outcomes: ['MAT.4.1.5'],
    type: 'match',
    stage: 'sembol',
    title: 'Örüntünün kuralı',
    instructions: 'Her örüntüyü sözcüklerle yazılmış kuralıyla eşleştir.',
    level: 2,
    launch: { text: 'Bir örüntünün kuralını söyleyebilirsen 100. terimi bile bulabilirsin. Önce kuralı sözcüklerle anlatmayı deneyelim.' },
    reflect: 'Hem artıp hem azalan bir örüntünün kuralını nasıl buldun?',
    pairs: [
      { left: '15, 30, 45, 60', right: '15’er artıyor' },
      { left: '900, 800, 700, 600', right: '100’er azalıyor' },
      { left: '7, 11, 15, 19', right: '4’er artıyor' },
      { left: '64, 56, 48, 40', right: '8’er azalıyor' },
      { left: '2, 5, 3, 6, 4', right: '3 artıp 2 azalıyor' },
      { left: '1.000, 3.000, 5.000', right: '2.000’er artıyor' },
      { left: '10, 8, 13, 11, 16', right: '2 azalıp 5 artıyor' },
      { left: '120, 115, 125, 120, 130', right: '5 azalıp 10 artıyor' },
    ],
    perRound: 4,
  },
  {
    id: 'g4-oruntu-genelle',
    outcomes: ['MAT.4.1.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Örüntüyü genelle',
    instructions: 'Örüntünün kuralını bul ve uzaktaki terimleri tahmin et.',
    level: 3,
    launch: { text: 'Bir örüntünün her terimini tek tek yazmadan uzaktaki bir terimi bulabilir miyiz? Kuralı genellersek evet!' },
    reflect: 'Bir örüntünün 10. terimini ilk 9 terimi yazmadan nasıl bulursun?',
    questions: [
      { prompt: 'Bir sinema salonunda 1. sırada 12, 2. sırada 15, 3. sırada 18 koltuk var. Örüntü böyle sürerse 6. sırada kaç koltuk olur?', choices: ['27', '24', '30', '21'], answer: 0, feedback: [null, '24, 5. sıradaki koltuk sayısı.', '30, 7. sıradaki koltuk sayısı.', '21, 4. sıra; 6. sıraya kadar devam et.'] },
      { prompt: 'Masalar yan yana diziliyor: 1 masaya 6, 2 masaya 10, 3 masaya 14 kişi oturuyor. 5 masaya kaç kişi oturur?', choices: ['22', '30', '18', '20'], answer: 0, feedback: [null, '6 × 5 = 30 diye düşündün; masalar birleşince uçlardaki yerler kaybolur.', '18, 4 masa için.', 'Her masa 4 kişi ekliyor ama ilk masa 6 kişiyle başlıyor.'] },
      { prompt: '3, 8, 13, 18, … örüntüsünde 50’den küçük en büyük terim hangisi?', choices: ['48', '50', '45', '43'], answer: 0, feedback: [null, '50 bu örüntüde yok: terimlerin birler basamağı hep 3 ya da 8.', '45 bu örüntüde yok; 3’ten başlayıp 5’er artıyor.', '43’ten sonra gelen 48 de 50’den küçük.'] },
      { prompt: 'Bir fide her hafta 3 cm uzuyor. Şu an 10 cm. Kaç hafta sonra 25 cm olur?', choices: ['5', '15', '8', '3'], answer: 0, feedback: [null, '15, uzaması gereken santimetre. Kaç haftada 15 cm uzar?', 'Fide 0’dan değil 10 cm’den başlıyor.', '3, haftalık uzama miktarı.'] },
      { prompt: 'Hangi örüntüde hem artma hem azalma vardır?', choices: ['2, 4, 6, 8, 10', '30, 25, 20, 15', '100, 200, 300, 400', '3, 8, 5, 10, 7, 12'], answer: 3, feedback: ['Bu örüntü hep 2’şer artıyor.', 'Bu örüntü hep 5’er azalıyor.', 'Bu örüntü hep 100’er artıyor.', null] },
      { prompt: 'Elif 5, 10, 15, 20, … örüntüsü için “Her terim, sıra sayısının 5 katı.” dedi. Buna göre 10. terim kaçtır?', choices: ['50', '25', '45', '100'], answer: 0, feedback: [null, '25, 5. terim.', '45, 9. terim; bir adım daha var.', '10 kere 10 değil, 10 kere 5.'] },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ───────────────────────────────────────────

  // MAT.4.1.6
  {
    id: 'g4-kesir-seridi-bilesik',
    outcomes: ['MAT.4.1.6'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Bir bütüne kadar ve ötesi',
    instructions: 'Kesir şeridini eş parçalara böl ve istenen kesri oluştur.',
    level: 1,
    launch: { text: 'Bir kek 4 eş dilime bölündü. 4 dilimin hepsini yersen keki bütün yemiş olursun. Peki 5 dilim yemek istersen ne gerekir?', visual: { kind: 'fraction', num: 4, den: 4, shape: 'circle' } },
    reflect: '[[5/4]] kesrini bu tek şeritte neden oluşturamadın? Ne yapsak oluşturabilirdik?',
    tool: 'fractions',
    config: { dens: [2, 3, 4, 5, 6, 8] },
    tasks: [
      { prompt: '[[3/5]] kesrini oluştur. Bir bütünden az mı?', target: { num: 3, den: 5, exact: true }, hints: ['Şeridi kaç eş parçaya bölmelisin? Kaçını boyamalısın?'], explain: 'Payı paydasından küçük: bir bütünden az. Bu bir basit kesir.' },
      { prompt: '[[4/4]] kesrini oluştur.', target: { num: 4, den: 4, exact: true }, explain: 'Bütün şerit boyandı: [[4/4]] = 1 bütün. Payı paydasına eşit olan kesir bileşik kesirdir.' },
      { prompt: '[[6/6]] kesrini oluştur. [[4/4]] ile karşılaştır.', target: { num: 6, den: 6, exact: true }, explain: 'İkisi de tam 1 bütün; yalnızca parçaların sayısı farklı.' },
      { prompt: '[[7/8]] kesrini oluştur. Bir bütün olması için kaç sekizde bir daha gerekir?', target: { num: 7, den: 8, exact: true }, hints: ['1 bütün kaç tane [[1/8]] eder?'], explain: '[[8/8]] = 1 bütün; 1 tane [[1/8]] daha gerekir.' },
    ],
  },
  {
    id: 'g4-tam-sayili-kesir-model',
    outcomes: ['MAT.4.1.6'],
    type: 'match',
    stage: 'model',
    title: 'Birden fazla bütün',
    instructions: 'Her modeli ya da sayı doğrusunu gösterdiği kesirle eşleştir. Bütünleri değil, parçaları say!',
    level: 2,
    launch: { text: 'Bir doğum gününden 2 bütün pizza ve bir pizzanın [[1/3]] kadarı kaldı. Bunu tek bir sayıyla nasıl söyleriz?', visual: { kind: 'fraction', num: 7, den: 3, shape: 'circle' } },
    reflect: '[[7/4]] ile [[1 3/4]] aynı miktarı mı gösterir? Modelle açıkla.',
    pairs: [
      { left: { visual: { kind: 'fraction', num: 5, den: 4, shape: 'circle' } }, right: '[[1 1/4]]' },
      { left: { visual: { kind: 'fraction', num: 7, den: 3, shape: 'bar' } }, right: '[[2 1/3]]' },
      { left: { visual: { kind: 'fraction', num: 3, den: 2, shape: 'rect' } }, right: '[[1 1/2]]' },
      { left: { visual: { kind: 'fraction', num: 2, den: 3, shape: 'circle' } }, right: '[[2/3]]' },
      { left: { visual: { kind: 'numberline', min: 0, max: 2, step: 0.25, points: [1.75], labels: false, integerLabels: true } }, right: '[[7/4]]' },
      { left: { visual: { kind: 'numberline', min: 0, max: 3, step: 0.5, points: [2.5], labels: false, integerLabels: true } }, right: '[[5/2]]' },
      { left: { visual: { kind: 'fraction', num: 11, den: 4, shape: 'bar' } }, right: '[[2 3/4]]' },
    ],
    perRound: 4,
  },
  {
    id: 'g4-kesir-cesitleri',
    outcomes: ['MAT.4.1.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Basit, bileşik, tam sayılı',
    instructions: 'Kesri bir bütünle karşılaştır ve grubuna yerleştir.',
    level: 1,
    launch: { text: 'Kesirleri bir bütünle karşılaştırarak gruplayabiliriz: bir bütünden az olanlar, bir bütün ya da daha fazlası olanlar ve tam sayıyla birlikte yazılanlar.' },
    reflect: 'Bir kesrin bir bütünden büyük olduğunu payına ve paydasına bakarak nasıl anlarsın?',
    categories: [
      { id: 'basit', label: 'Basit kesir', color: '#22c55e' },
      { id: 'bilesik', label: 'Bileşik kesir', color: '#f97316' },
      { id: 'tam', label: 'Tam sayılı kesir', color: '#6366f1' },
    ],
    items: [
      { content: '[[3/5]]', category: 'basit', explain: 'Payı paydasından küçük: bir bütünden az.' },
      { content: '[[1/8]]', category: 'basit' },
      { content: '[[6/7]]', category: 'basit', explain: '7 parçadan 6’sı: bütüne yakın ama bütünden az.' },
      { content: '[[7/4]]', category: 'bilesik', explain: 'Payı paydasından büyük: bir bütünden fazla.' },
      { content: '[[9/9]]', category: 'bilesik', explain: 'Payı paydasına eşit: tam 1 bütün. Bu da bileşik kesirdir.' },
      { content: '[[5/2]]', category: 'bilesik' },
      { content: '[[2 1/3]]', category: 'tam', explain: '2 bütün ve [[1/3]]: tam sayı ile basit kesir birlikte yazılmış.' },
      { content: '[[1 3/4]]', category: 'tam' },
      { content: '[[3 1/2]]', category: 'tam' },
    ],
  },
  {
    id: 'g4-kesir-farkli',
    outcomes: ['MAT.4.1.6'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Kesirler)',
    instructions: 'Hangisi diğerlerinden farklı? Seç ve gerekçeni düşün. Her seçenek için iyi bir gerekçe bulunabilir.',
    level: 2,
    launch: { text: 'Dört seçenekten hangisi farklı? Sen hangisini seçip nasıl savunursun?' },
    reflect: 'Arkadaşın senden farklı bir seçeneği seçti. Onun gerekçesi de doğru olabilir mi? Neden?',
    questions: [
      { prompt: 'Hangisi farklı?', choices: ['[[3/4]]', '[[4/4]]', '[[5/4]]', '[[1 1/4]]'], answer: 0, reasons: ['Bir bütünden küçük olan tek kesir: basit kesir.', 'Tam olarak 1 bütüne eşit olan tek kesir.', 'Payı paydasından büyük olan tek kesir.', 'Tam sayılı kesir olarak yazılmış tek kesir.'] },
      {
        prompt: 'Hangisi farklı?',
        choices: [
          { visual: { kind: 'fraction', num: 1, den: 2, shape: 'circle' } },
          { visual: { kind: 'fraction', num: 2, den: 4, shape: 'bar' } },
          { visual: { kind: 'fraction', num: 4, den: 8, shape: 'rect' } },
          { visual: { kind: 'fraction', num: 1, den: 3, shape: 'circle' } },
        ],
        answer: 3,
        reasons: ['Yalnızca 2 eş parçaya bölünmüş tek model.', 'Şerit (uzunluk) modeli olan tek model.', 'Dikdörtgen alan modeli olan, 8 parçalı tek model.', 'Yarımı göstermeyen tek model: diğerleri [[1/2]] kadar.'],
      },
      { prompt: 'Hangisi farklı?', choices: ['[[1/2]]', '[[1/5]]', '[[4/5]]', '[[5/5]]'], answer: 0, reasons: ['Paydası 5 olmayan tek kesir.', '0’a en yakın kesir.', 'Bir bütüne çok yakın ama bütün olmayan kesir.', '1 bütüne eşit olan tek kesir.'] },
      { prompt: 'Hangisi farklı?', choices: ['[[2 1/2]]', '[[5/2]]', '2 bütün ve 1 yarım', '[[2/5]]'], answer: 3, reasons: ['Tam sayılı kesir olarak yazılmış tek gösterim.', 'Bileşik kesir olarak yazılmış tek gösterim.', 'Sözcüklerle yazılmış tek gösterim.', 'Farklı bir miktar: [[2/5]] bir bütünden bile azdır.'] },
      { prompt: 'Hangisi farklı?', choices: ['🍕 2 bütün pizza', '[[8/4]]', '[[2/2]]', '2'], answer: 2, reasons: ['Gerçek yaşamdan bir durumla anlatılan tek seçenek.', 'Paydası 4 olan tek seçenek: 2 bütünü dörtte birlerle anlatıyor.', 'Değeri 1 olan tek seçenek; diğerleri 2’ye eşit.', 'Doğal sayı olarak yazılmış tek seçenek.'] },
    ],
  },

  // MAT.4.1.7
  {
    id: 'g4-denk-kesir-serit',
    outcomes: ['MAT.4.1.7'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kesir şeritleriyle denk kesir',
    instructions: 'Şeridi istenen sayıda eş parçaya böl ve verilen kesirle aynı uzunluk olacak kadar boya.',
    level: 2,
    launch: { text: 'Bir kâğıt şeridi ikiye katla, sonra yine ikiye, sonra yine ikiye. Her katlamada parça sayısı değişiyor ama yarım hep aynı yerde kalıyor. Neden?', visual: fracBars([[1, 2], [2, 4], [4, 8]]) },
    reflect: '[[1/2]] ile [[4/8]] farklı yazılıyor ama neden aynı miktar? Şeritlerle açıkla.',
    tool: 'fractions',
    config: { dens: [2, 3, 4, 6, 8, 12] },
    tasks: [
      { prompt: '[[1/2]] kesrine denk kesri 8 eş parçalı şeritte oluştur.', target: { num: 4, den: 8, exact: true }, hints: ['Şeridin yarısı kaç tane sekizde bir eder?'], explain: '[[1/2]] = [[4/8]]: aynı uzunluk, daha küçük parçalar.' },
      { prompt: '[[2/3]] kesrine denk kesri 6 eş parçalı şeritte oluştur.', target: { num: 4, den: 6, exact: true }, hints: ['Her üçte birlik parçayı ikiye bölersen kaç altıda bir olur?'], explain: 'Her [[1/3]], 2 tane [[1/6]] eder; [[2/3]] = [[4/6]].' },
      { prompt: '[[3/4]] kesrine denk kesri 8 eş parçalı şeritte oluştur.', target: { num: 6, den: 8, exact: true }, explain: 'Her [[1/4]], 2 tane [[1/8]] eder; [[3/4]] = [[6/8]].' },
      { prompt: '[[1/3]] kesrine denk kesri 12 eş parçalı şeritte oluştur.', target: { num: 4, den: 12, exact: true }, hints: ['Bir üçte birlik parça kaç tane on ikide bir eder?'], explain: '[[1/3]] = [[4/12]]' },
    ],
  },
  {
    id: 'g4-denk-kesir-eslestir',
    outcomes: ['MAT.4.1.7'],
    type: 'match',
    stage: 'model',
    title: 'Aynı miktar, farklı kesir',
    instructions: 'Her modeli (alan, uzunluk ya da küme), aynı miktarı gösteren denk kesirle eşleştir.',
    level: 2,
    launch: { text: 'Aynı büyüklükte iki pizzadan biri 4, diğeri 8 dilime bölündü. Ali 4’lükten 3 dilim, Elif 8’likten 6 dilim yedi. Kim daha çok yedi?', visual: fracBars([[3, 4, 'Ali'], [6, 8, 'Elif']]) },
    reflect: 'Bir modelde parça sayısını iki katına çıkarınca boyalı parça sayısı neden de iki katına çıkıyor?',
    pairs: [
      { left: { visual: { kind: 'fraction', num: 1, den: 2, shape: 'bar' } }, right: '[[4/8]]' },
      { left: { visual: { kind: 'fraction', num: 1, den: 3, shape: 'circle' } }, right: '[[2/6]]' },
      { left: { visual: { kind: 'fraction', num: 3, den: 4, shape: 'rect' } }, right: '[[6/8]]' },
      { left: { visual: { kind: 'numberline', min: 0, max: 1, step: 0.2, points: [0.4], labels: false, integerLabels: true } }, right: '[[4/10]]' },
      { left: { visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 2 }, { emoji: '⚪', count: 1 }] } }, right: '[[4/6]]' },
      { left: { visual: { kind: 'fraction', num: 1, den: 4, shape: 'rect' } }, right: '[[3/12]]' },
    ],
    perRound: 3,
  },
  {
    id: 'g4-denk-kesir-model',
    outcomes: ['MAT.4.1.7'],
    type: 'fill',
    stage: 'model',
    title: 'Modelle denk kesir',
    instructions: 'Modeldeki boyalı kısım verilen kesre denktir. Modele bakarak boşluğu doldur.',
    level: 2,
    launch: { text: 'Bir şerit 4 eş parçaya bölündü ve 2 parçası boyandı. Aynı şerit 8 parçaya bölünseydi kaç parça boyalı görünürdü?', visual: fracBars([[2, 4], [4, 8]]) },
    reflect: 'Denk kesirleri bulurken modele bakmak sana nasıl yardım etti?',
    items: [
      { text: '[[1/2]] = __ / 4', answers: ['2'], visual: { kind: 'fraction', num: 2, den: 4, shape: 'rect' }, hints: ['Modelde kaç eş parça var? Kaçı boyalı?'] },
      { text: '[[1/3]] = __ / 6', answers: ['2'], visual: { kind: 'fraction', num: 2, den: 6, shape: 'bar' } },
      { text: '[[3/4]] = __ / 8', answers: ['6'], visual: { kind: 'fraction', num: 6, den: 8, shape: 'circle' } },
      { text: '[[2/5]] = __ / 10', answers: ['4'], visual: { kind: 'fraction', num: 4, den: 10, shape: 'bar' } },
      { text: '[[1/4]] = 2 / __', answers: ['8'], visual: { kind: 'fraction', num: 2, den: 8, shape: 'rect' }, hints: ['Bütün kaç eş parçaya bölünmüş?'] },
      { text: '[[2/3]] = 4 / __', answers: ['6'], visual: { kind: 'fraction', num: 4, den: 6, shape: 'circle' } },
      { text: 'Sayı doğrusunda [[2/3]] ile aynı noktayı gösteren kesir: __ / 6', answers: ['4'], visual: { kind: 'numberline', min: 0, max: 1, step: 1 / 6, points: [4 / 6], labels: false, integerLabels: true }, hints: ['0 ile 1 arası kaç eş parçaya bölünmüş? Nokta 0’dan kaç parça uzakta?'] },
    ],
  },
  {
    id: 'g4-denk-mi',
    outcomes: ['MAT.4.1.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Denk mi, değil mi?',
    instructions: 'Modelleri düşünerek karar ver.',
    level: 3,
    launch: { text: 'İki arkadaş aynı büyüklükteki iki pizzayı farklı sayıda dilime böldü. Farklı kesirler aynı miktarı gösterebilir mi?' },
    reflect: 'İki kesrin denk olup olmadığını anlamak için hangi modeli kullanmayı tercih edersin? Neden?',
    questions: [
      { prompt: { text: 'Ali bir pizzanın [[2/4]] kadarını, Elif aynı büyüklükteki pizzanın [[1/2]] kadarını yedi. Hangisi doğru?', visual: fracBars([[2, 4, 'Ali'], [1, 2, 'Elif']]) }, choices: ['İkisi eşit miktarda yedi.', 'Ali daha çok yedi, çünkü 2 > 1.', 'Elif daha çok yedi, çünkü dilimi büyük.'], answer: 0, feedback: [null, 'Ali’nin dilimleri daha küçük: 4 parçadan 2’si, 2 parçadan 1’i ile aynı miktardır.', 'Elif 1 büyük dilim, Ali 2 küçük dilim yedi; toplamları aynı.'] },
      { prompt: { text: 'Şeritlere bak. Hangisi [[1/3]] kesrine denk değildir?', visual: fracBars([[1, 3], [2, 6], [3, 9], [4, 12]]) }, choices: ['[[2/6]]', '[[3/9]]', '[[4/12]]', '[[2/5]]'], answer: 3, feedback: ['[[2/6]] şeridi [[1/3]] ile aynı uzunlukta; bu denk.', '[[3/9]] şeridi [[1/3]] ile aynı uzunlukta; bu denk.', '[[4/12]] şeridi [[1/3]] ile aynı uzunlukta; bu denk.', null] },
      { prompt: { text: 'Bir şerit 8 eş parçaya bölündü, 6 parçası boyandı. Aynı şerit 4 eş parçaya bölünseydi kaç parça boyalı olurdu?', visual: { kind: 'fraction', num: 6, den: 8, shape: 'bar' } }, choices: ['3', '6', '2', '4'], answer: 0, feedback: [null, 'Parçalar büyüdü; aynı uzunluğu daha az parçayla gösteririz.', '[[2/4]] yarım eder; boyalı kısım yarımdan fazla.', '4 parça bütün şerit olurdu.'] },
      { prompt: { text: 'Sayı doğrusunda [[1/2]] ile aynı noktada hangi kesir bulunur?', visual: { kind: 'numberline', min: 0, max: 1, step: 0.125, labels: false, integerLabels: true } }, choices: ['[[4/8]]', '[[2/8]]', '[[1/8]]', '[[8/4]]'], answer: 0, feedback: [null, '[[2/8]], 0 ile [[1/2]] arasının ortasında.', '[[1/8]] 0’a çok yakın.', '[[8/4]], 2 bütün eder; 1’in bile ötesinde.'] },
      { prompt: { text: 'Can: “[[3/4]] ile [[3/8]] denktir, çünkü payları aynı.” dedi. Can haklı mı?', visual: fracBars([[3, 4], [3, 8]]) }, choices: ['Hayır, [[3/8]] daha küçüktür.', 'Evet, payları aynı olduğu için denktir.', 'Hayır, [[3/8]] daha büyüktür.'], answer: 0, feedback: [null, 'Paylar aynı ama parçaların büyüklüğü farklı: sekizde birler, dörtte birlerin yarısı kadardır.', 'Sekizde birler daha küçük parçalardır; 3 küçük parça, 3 büyük parçadan azdır.'] },
      { prompt: 'Ayşe bir çikolatayı 6 eş parçaya böldü ve 3 parçasını kardeşine verdi. Kardeşi çikolatanın ne kadarını aldı?', choices: ['[[1/2]]', '[[1/3]]', '[[3/3]]', '[[1/6]]'], answer: 0, feedback: [null, '[[1/3]] için 6 parçanın 2’si verilmeliydi.', '[[3/3]] çikolatanın tamamı olurdu.', '[[1/6]] yalnızca bir parçadır.'] },
    ],
  },

  // MAT.4.1.8
  {
    id: 'g4-birim-kesir-serit',
    outcomes: ['MAT.4.1.8'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Birim kesirleri oluştur',
    instructions: 'Şeridi eş parçalara böl ve yalnızca bir parçayı boya.',
    level: 1,
    launch: { text: 'Aynı büyüklükte bir pastayı 2 kişi mi paylaşsın, 8 kişi mi? Hangisinde senin payın daha büyük olur?', visual: fracBars([[1, 2], [1, 8]]) },
    reflect: 'Paydası büyük olan birim kesir neden daha küçüktür? Bir pasta örneğiyle anlat.',
    tool: 'fractions',
    config: { dens: [2, 3, 4, 5, 6, 8, 10, 12] },
    tasks: [
      { prompt: '[[1/2]] kesrini oluştur.', target: { num: 1, den: 2, exact: true } },
      { prompt: '[[1/4]] kesrini oluştur. [[1/2]]’den kısa mı, uzun mu?', target: { num: 1, den: 4, exact: true }, explain: 'Bütün daha çok parçaya bölündü; her parça küçüldü: [[1/4]] < [[1/2]].' },
      { prompt: '[[1/8]] kesrini oluştur.', target: { num: 1, den: 8, exact: true }, explain: '[[1/8]] < [[1/4]] < [[1/2]]' },
      { prompt: '[[1/3]] ile [[1/6]] kesirlerinden büyük olanı oluştur.', target: { num: 1, den: 3, exact: true }, hints: ['Bütünü 3 parçaya mı, 6 parçaya mı bölünce parçalar daha büyük olur?'], explain: '3 parçaya bölünen bütünün bir parçası, 6 parçaya bölünenin bir parçasının iki katıdır.' },
    ],
  },
  {
    id: 'g4-birim-kesir-sirala',
    outcomes: ['MAT.4.1.8'],
    type: 'sort',
    stage: 'model',
    title: 'Birim kesirleri sırala',
    instructions: 'Modellere bakarak birim kesirleri sırala.',
    level: 2,
    launch: { text: 'Aynı uzunluktaki kurdeleler farklı sayıda eş parçaya kesildi. Birer parçayı uzunluklarına göre dizebilir misin?' },
    reflect: '[[1/15]] ile [[1/20]] kesirlerini model çizmeden nasıl karşılaştırdın?',
    rounds: [
      {
        prompt: 'Aynı büyüklükteki pastalardan alınan dilimleri küçükten büyüğe sırala.',
        items: [
          { text: '[[1/10]]', visual: { kind: 'fraction', num: 1, den: 10, shape: 'circle' } },
          { text: '[[1/6]]', visual: { kind: 'fraction', num: 1, den: 6, shape: 'circle' } },
          { text: '[[1/4]]', visual: { kind: 'fraction', num: 1, den: 4, shape: 'circle' } },
          { text: '[[1/2]]', visual: { kind: 'fraction', num: 1, den: 2, shape: 'circle' } },
        ],
        ends: ['En küçük', 'En büyük'],
        hints: ['Bütün kaç parçaya bölünmüş? Parça sayısı arttıkça bir parça ne olur?'],
      },
      {
        prompt: 'Aynı uzunluktaki kurdele parçalarını küçükten büyüğe sırala.',
        items: [
          { text: '[[1/12]]', visual: { kind: 'fraction', num: 1, den: 12, shape: 'bar' } },
          { text: '[[1/8]]', visual: { kind: 'fraction', num: 1, den: 8, shape: 'bar' } },
          { text: '[[1/5]]', visual: { kind: 'fraction', num: 1, den: 5, shape: 'bar' } },
          { text: '[[1/3]]', visual: { kind: 'fraction', num: 1, den: 3, shape: 'bar' } },
        ],
        ends: ['En küçük', 'En büyük'],
      },
      { prompt: 'Model olmadan büyükten küçüğe sırala.', items: ['[[1/4]]', '[[1/6]]', '[[1/9]]', '[[1/15]]', '[[1/20]]'], ends: ['En büyük', 'En küçük'], hints: ['Hangisinde bütün en az parçaya bölünmüş?'] },
    ],
  },
  {
    id: 'g4-birim-kesir-karsilastir',
    outcomes: ['MAT.4.1.8'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangi dilim daha büyük?',
    instructions: 'Birim kesirleri karşılaştır. Aynı bütünü düşün.',
    level: 2,
    launch: { text: 'Sınıfta “Pastayı kaç kişiyle paylaşmak istersin?” diye soruldu. Can “Ne kadar çok kişi, o kadar iyi!” dedi. Can’ın payı büyür mü?' },
    reflect: 'Birim kesirleri karşılaştırırken bütünlerin aynı büyüklükte olması neden önemli?',
    questions: [
      { prompt: 'Hangisi daha büyüktür?', choices: ['[[1/7]]', '[[1/3]]'], answer: 1, feedback: ['7 > 3 ama paydası büyük olan birim kesir daha küçüktür: bütün daha çok parçaya bölünür.', null] },
      { prompt: 'Hangisi en küçüktür?', choices: ['[[1/5]]', '[[1/2]]', '[[1/12]]'], answer: 2, feedback: ['[[1/5]], [[1/12]]’den büyüktür: 5 parçadan biri, 12 parçadan birinden iridir.', '[[1/2]] bu üçünün en büyüğü.', null] },
      { prompt: 'Aynı büyüklükteki iki pizzadan biri 6, diğeri 8 eş dilime bölündü. Hangi pizzanın bir dilimi daha büyüktür?', choices: ['6 dilime bölünenin', '8 dilime bölünenin', 'İkisi eşit'], answer: 0, explain: 'Bütün daha az parçaya bölündükçe her parça büyür.', feedback: [null, '8 dilim daha çok ama her biri daha küçük.', 'Bütünler aynı ama dilim sayıları farklı; dilimler eşit olamaz.'] },
      { prompt: '[[1/4]] ile [[1/9]] için hangisi doğrudur?', choices: ['[[1/4]] < [[1/9]]', '[[1/4]] > [[1/9]]', '[[1/4]] = [[1/9]]'], answer: 1, feedback: ['9 > 4 diye [[1/9]] büyük olmaz; 9 parçadan biri daha küçüktür.', null, 'Paylar aynı ama paydalar farklı; parçalar aynı büyüklükte değil.'] },
      { prompt: 'Elif bir şeridin [[1/5]] kadarını, Can aynı uzunluktaki şeridin [[1/3]] kadarını aldı. Kim daha uzun parça aldı?', choices: ['Elif', 'Can', 'İkisi eşit'], answer: 1, feedback: ['Şerit 5 parçaya bölününce parçalar 3 parçaya bölünmeye göre daha kısa olur.', null, 'Şeritler aynı ama farklı sayıda parçaya bölündü.'] },
      { prompt: 'Kocaman bir pastanın [[1/2]] kadarı, minik bir kekin [[1/2]] kadarından büyük olabilir mi?', choices: ['Evet, bütünler farklıysa yarımlar da farklıdır.', 'Hayır, yarım her zaman aynıdır.'], answer: 0, feedback: [null, 'Kesir, bütüne göre bir büyüklüktür. Büyük pastanın yarısı küçük kekin yarısından büyüktür.'] },
      { prompt: 'Hangi sıralama doğrudur?', choices: ['[[1/8]] < [[1/4]] < [[1/2]]', '[[1/2]] < [[1/4]] < [[1/8]]', '[[1/4]] < [[1/2]] < [[1/8]]'], answer: 0, feedback: [null, 'Paydalara göre sıraladın; birim kesirlerde payda büyüdükçe kesir küçülür.', '[[1/8]] en küçük olmalı: 8 parçadan biri.'] },
    ],
  },

  // MAT.4.1.9
  {
    id: 'g4-paydasi-esit-karsilastir',
    outcomes: ['MAT.4.1.9'],
    type: 'fill',
    stage: 'model',
    title: 'Aynı parçalar, farklı sayıda',
    instructions: 'Şeritlere bak ve doğru işareti seç: <, > veya =',
    level: 1,
    launch: { text: 'Ece ve Can aynı kitabı okuyor. Kitap 8 eş bölüm. Ece 5 bölüm, Can 3 bölüm okudu. Kitabın daha büyük kısmını kim okudu?', visual: fracBars([[5, 8, 'Ece'], [3, 8, 'Can']]) },
    reflect: 'Paydaları eşit iki kesri karşılaştırırken neden yalnızca paylara bakman yeterli?',
    items: [
      { text: '[[3/7]]  __  [[5/7]]', answers: ['<'], choices: CMP, visual: fracBars([[3, 7], [5, 7]]), hints: ['Parçalar aynı büyüklükte mi? Hangisinde daha çok parça boyalı?'] },
      { text: '[[8/9]]  __  [[4/9]]', answers: ['>'], choices: CMP, visual: fracBars([[8, 9], [4, 9]]) },
      { text: '[[6/10]]  __  [[6/10]]', answers: ['='], choices: CMP, visual: fracBars([[6, 10], [6, 10]]) },
      { text: '[[2/5]]  __  [[4/5]]', answers: ['<'], choices: CMP, visual: fracBars([[2, 5], [4, 5]]) },
      { text: '[[11/12]]  __  [[7/12]]', answers: ['>'], choices: CMP, visual: fracBars([[11, 12], [7, 12]]) },
      { text: '[[5/8]]  __  [[3/8]]', answers: ['>'], choices: CMP, visual: fracBars([[5, 8], [3, 8]]), explain: 'Paydalar eşitse parçalar aynı büyüklüktedir; daha çok parça daha büyük demektir.' },
      { text: '[[1/6]]  __  [[5/6]]', answers: ['<'], choices: CMP, visual: fracBars([[1, 6], [5, 6]]) },
    ],
  },
  {
    id: 'g4-referans-kesir',
    outcomes: ['MAT.4.1.9'],
    type: 'quiz',
    stage: 'model',
    fixedOrder: true,
    title: '0’a mı, yarıma mı, 1’e mi yakın?',
    instructions: 'Kesir 0’a mı, [[1/2]]’ye mi, 1’e mi daha yakın? Modele bak ve tahmin et.',
    level: 2,
    launch: { text: 'Bir sürahi “neredeyse boş” mu, “yarısı dolu” mu, “neredeyse dolu” mu? Kesirleri de 0, [[1/2]] ve 1 ile karşılaştırarak hızlıca düşünebiliriz.' },
    reflect: '[[5/8]] kesrinin yarımdan büyük olduğunu modele bakmadan nasıl anlarsın?',
    generator: { id: 'benchmark', params: { dens: [5, 6, 8, 10, 12] }, count: 8 },
  },
  {
    id: 'g4-paydasi-esit-sirala',
    outcomes: ['MAT.4.1.9'],
    type: 'sort',
    stage: 'sembol',
    title: 'Paydası eşit kesirleri sırala',
    instructions: 'Paydalar eşit, yani parçalar aynı büyüklükte. Kesirleri küçükten büyüğe sırala.',
    level: 2,
    launch: { text: 'Üç arkadaş aynı yolda yürüyor. Ali yolun [[5/9]] kadarını, Ece [[7/9]] kadarını, Can [[2/9]] kadarını yürüdü. Kim en önde?' },
    reflect: 'Paydaları eşit kesirleri sıralarken sayı doğrusunu nasıl kullanırsın?',
    generator: { id: 'sortFractions', params: { dens: [5, 6, 7, 8, 9, 10, 12], n: 3, sameDen: true }, count: 3 },
  },
  {
    id: 'g4-paydasi-esit-problem',
    outcomes: ['MAT.4.1.9'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kim önde?',
    instructions: 'Paydaları eşit kesirleri karşılaştırarak problemi çöz.',
    level: 2,
    launch: { text: 'Bir yarış yolu 9 eş parçaya bölünmüş. Kimin kaç parça koştuğunu bilirsek kimin önde olduğunu söyleyebilir miyiz?' },
    reflect: 'Paydaları eşit kesirleri karşılaştırmayı gerçek hayatta nerede kullanırsın?',
    questions: [
      { prompt: 'Ali yolun [[5/9]] kadarını, Ece [[7/9]] kadarını, Can [[2/9]] kadarını koştu. Kim en önde?', choices: ['Ece', 'Ali', 'Can'], answer: 0, feedback: [null, 'Ali [[5/9]] kadar koştu; [[7/9]] daha fazla.', 'Can en az koşan; [[2/9]] en küçük kesir.'] },
      { prompt: 'Aynı büyüklükteki iki sürahiden birinin [[3/10]] kadarı, diğerinin [[7/10]] kadarı dolu. Hangisi doğru?', choices: ['[[7/10]] > [[3/10]]', '[[3/10]] > [[7/10]]', 'İkisi eşit'], answer: 0, feedback: [null, 'Paydalar aynı, parçalar eşit; 3 parça 7 parçadan azdır.', 'Paylar farklı; eşit olamazlar.'] },
      { prompt: 'Hangi kesir 1 bütüne en yakındır?', choices: ['[[11/12]]', '[[7/12]]', '[[1/12]]', '[[6/12]]'], answer: 0, feedback: [null, '[[7/12]] yarımdan biraz fazla; bütüne 5 parça var.', '[[1/12]] 0’a çok yakın.', '[[6/12]] tam yarım.'] },
      { prompt: 'Zeynep: “[[4/6]] < [[5/6]], çünkü 4 parça 5 parçadan az ve parçalar aynı büyüklükte.” dedi. Gerekçesi doğru mu?', choices: ['Evet, doğru.', 'Hayır, paydaları da karşılaştırmak gerekir.', 'Hayır, [[4/6]] daha büyüktür.'], answer: 0, feedback: [null, 'Paydalar zaten eşit; parçalar aynı büyüklükte.', '4 eş parça, 5 eş parçadan azdır.'] },
      { prompt: { text: 'Sayı doğrusunda işaretli iki noktadan sağdaki hangi kesri gösterir?', visual: { kind: 'numberline', min: 0, max: 1, step: 0.125, points: [0.375, 0.75], labels: false, integerLabels: true } }, choices: ['[[6/8]]', '[[3/8]]', '[[8/6]]', '[[7/8]]'], answer: 0, feedback: [null, '[[3/8]] soldaki nokta; sağdaki daha büyük.', 'Pay ve payda yer değiştirmiş: payda bütünün kaç eş parçaya bölündüğünü söyler.', 'Aralıkları tekrar say: 0’dan noktaya kaç parça var?'] },
      { prompt: 'Paydası 5 olan ve [[2/5]] ile [[4/5]] arasında bulunan kesir hangisi?', choices: ['[[3/5]]', '[[3/10]]', '[[5/5]]', '[[1/5]]'], answer: 0, feedback: [null, 'Paydası 5 olan bir kesir arıyoruz.', '[[5/5]], [[4/5]]’ten büyüktür.', '[[1/5]], [[2/5]]’ten küçüktür.'] },
    ],
  },

  // MAT.4.1.10
  {
    id: 'g4-coklugun-kesri-sayac',
    outcomes: ['MAT.4.1.10'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Eş gruplarla kesir kadarı',
    instructions: 'Çokluğu eş gruplara ayırmayı düşün ve istenen kadar sayaç koy.',
    level: 1,
    launch: { text: '20 kişilik bir sınıfın [[3/4]] kadarı geziye katılacak. Kaç kişi katılacak? Eş gruplar oluşturarak bulalım.', visual: { kind: 'emoji', emoji: '🧒', count: 20, group: 5 } },
    reflect: 'Bir çokluğun [[3/4]] kadarını bulurken neden önce [[1/4]] kadarını buldun?',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: '16 boncuğun [[1/4]] kadarı mavi. Mavi boncuk sayısı kadar sayaç koy.', target: { count: 4 }, hints: ['16 boncuğu 4 eş gruba ayır. Bir grupta kaç boncuk olur?'], explain: '16 = 4 + 4 + 4 + 4; bir grup [[1/4]] kadardır: 4 boncuk.' },
      { prompt: '20 elmanın [[3/4]] kadarı kırmızı. Kırmızı elma sayısı kadar sayaç koy.', target: { count: 15 }, hints: ['Önce [[1/4]] kadarını bul: 20 elmayı 4 eş gruba ayır.', '[[3/4]] kaç grup eder?'], explain: '[[1/4]] kadarı 5; [[3/4]] kadarı 5 + 5 + 5 = 15.' },
      { prompt: '18 kalemin [[2/3]] kadarı kadar sayaç koy.', target: { count: 12 }, hints: ['18 kalemi 3 eş gruba ayır.'], explain: '[[1/3]] kadarı 6; [[2/3]] kadarı 12.' },
      { prompt: 'Bir sepetteki yumurtaların [[1/5]] kadarı 3 tane. Sepette toplam kaç yumurta var? O kadar sayaç koy.', target: { count: 15 }, hints: ['[[1/5]] kadarı bir grup ise bütün kaç grup eder?'], explain: 'Bütün = [[5/5]] = 5 grup: 3 + 3 + 3 + 3 + 3 = 15.' },
    ],
  },
  {
    id: 'g4-coklugun-kesri',
    outcomes: ['MAT.4.1.10'],
    type: 'fill',
    stage: 'model',
    title: 'Modelle bir çokluğun kesri',
    instructions: 'Gruplara ya da şerit modeline bak, istenen kadarını bul.',
    level: 2,
    launch: { text: 'Bir kutuda 12 elma var. Annem “[[1/4]] kadarını komşuya götür.” dedi. Elmaları nasıl gruplarsın?', visual: { kind: 'emoji', emoji: '🍎', count: 12, group: 3 } },
    reflect: 'Şerit modeli bir çokluğun kesrini bulmana nasıl yardım ediyor?',
    items: [
      { text: '12 elmanın [[1/4]] kadarı __ elmadır.', answers: ['3'], visual: { kind: 'emoji', emoji: '🍎', count: 12, group: 3 }, hints: ['Elmalar kaç eş gruba ayrılmış? Bir grupta kaç elma var?'] },
      { text: '15 kalemin [[2/5]] kadarı __ kalemdir.', answers: ['6'], visual: { kind: 'emoji', emoji: '✏️', count: 15, group: 3 }, hints: ['5 eş grup var. [[2/5]] kaç grup eder?'] },
      { text: '24 öğrencinin [[3/8]] kadarı gözlüklü. Gözlüklü öğrenci sayısı __', answers: ['9'], visual: { kind: 'emoji', emoji: '🧑', count: 24, group: 3 } },
      { text: 'Bir kutuda 40 boncuk var. [[3/4]] kadarı mavi. Mavi boncuk sayısı __', answers: ['30'], visual: tape(eqParts(4), '40'), hints: ['40’ı 4 eş parçaya bölersen bir parça kaç olur?'] },
      { text: '120 sayfalık kitabın [[2/3]] kadarını okudum. __ sayfa okudum.', answers: ['80'], visual: tape(eqParts(3), '120'), hints: ['Bir parça kaç sayfa?'] },
      { text: '360 TL’nin [[5/6]] kadarı __ TL’dir.', answers: ['300'], visual: tape(eqParts(6), '360') },
      { text: '18 balonun [[2/3]] kadarı patladı. Patlamayan balon sayısı __', answers: ['6'], visual: { kind: 'emoji', emoji: '🎈', count: 18, group: 6 }, hints: ['Önce patlayanları bul. Patlamayanlar kaç grup?'], explain: '[[2/3]] patladı, [[1/3]] patlamadı: 18’in [[1/3]] kadarı 6.' },
    ],
  },
  {
    id: 'g4-tamamini-bul',
    outcomes: ['MAT.4.1.10'],
    type: 'match',
    stage: 'model',
    title: 'Parçadan bütüne',
    instructions: 'Şerit modelinde bir kısmı bilinen çokluğun tamamını bul ve eşleştir.',
    level: 3,
    launch: { text: 'Ece kumbarasındaki paranın [[1/4]] kadarını harcadı; bu 6 TL. Başta ne kadar parası vardı? Parçayı biliyorsak bütünü bulabiliriz.', visual: tape([['6', 1], ['', 1], ['', 1], ['', 1]], '?') },
    reflect: '[[2/3]] kadarı 10 olan çokluğu bulurken neden önce [[1/3]] kadarını buldun?',
    pairs: [
      { left: { text: '[[1/4]] kadarı 6', visual: tape([['6', 1], ['', 1], ['', 1], ['', 1]], '?') }, right: '24' },
      { left: { text: '[[1/3]] kadarı 9', visual: tape([['9', 1], ['', 1], ['', 1]], '?') }, right: '27' },
      { left: { text: '[[1/5]] kadarı 7', visual: tape([['7', 1], ['', 1], ['', 1], ['', 1], ['', 1]], '?') }, right: '35' },
      { left: { text: '[[2/3]] kadarı 10', visual: tape([['10', 2], ['', 1]], '?') }, right: '15' },
      { left: { text: '[[3/4]] kadarı 12', visual: tape([['12', 3], ['', 1]], '?') }, right: '16' },
      { left: { text: '[[1/2]] kadarı 25', visual: tape([['25', 1], ['', 1]], '?') }, right: '50' },
    ],
    perRound: 3,
  },
  {
    id: 'g4-coklugun-kesri-problem',
    outcomes: ['MAT.4.1.10'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kesir kadarı problemleri',
    instructions: 'Problemi oku, eş grupları düşünerek çöz.',
    level: 2,
    launch: { text: 'Markette 24 yumurtalık bir kolinin [[1/4]] kadarı kırık. Kaç yumurta kırık, kaç yumurta sağlam? Gerçek problemlerde kesir ve bütün birlikte çalışır.' },
    reflect: 'Bir problemde “kalan” sorulduğunda kesir kadarını bulduktan sonra ne yaptın? Neden?',
    questions: [
      { prompt: '18 balonun [[2/3]] kadarı patladı. Kaç balon patlamadı?', choices: ['6', '12', '9', '3'], answer: 0, feedback: [null, '12, patlayan balon sayısı; soru patlamayanları soruyor.', '9, 18’in yarısı; [[2/3]] yarım değil.', '3, grup sayısı; bir grupta kaç balon var?'] },
      { prompt: 'Bir sınıftaki 28 öğrencinin [[1/4]] kadarı gözlüklü. Kaç öğrenci gözlüklü?', choices: ['7', '4', '14', '24'], answer: 0, feedback: [null, '4, grup sayısı. 28’i 4 eş gruba ayırınca bir grupta kaç kişi olur?', '14, 28’in yarısı.', '28’den 4 çıkardın; kesir kadarı böyle bulunmaz.'] },
      { prompt: 'Bir otoparktaki arabaların [[1/5]] kadarı beyaz ve beyaz araba sayısı 9. Otoparkta kaç araba var?', choices: ['45', '9', '14', '5'], answer: 0, feedback: [null, '9 yalnızca [[1/5]] kadarı; bütün 5 eş parçadır.', '9 + 5 değil; bütün, 5 tane 9’dan oluşur.', '5, grup sayısı.'] },
      { prompt: '120 sayfalık bir kitabın [[3/4]] kadarı okundu. Kaç sayfa kaldı?', choices: ['30', '90', '40', '60'], answer: 0, feedback: [null, '90, okunan sayfa sayısı; kalan soruluyor.', '40, 120’nin [[1/3]] kadarı.', '60, kitabın yarısı.'] },
      { prompt: '24 cevizin [[3/8]] kadarını Ayşe, [[4/8]] kadarını Can yedi. Kim daha çok yedi, kaç ceviz fazla?', choices: ['Can, 3 ceviz fazla', 'Ayşe, 3 ceviz fazla', 'Can, 1 ceviz fazla', 'İkisi eşit'], answer: 0, feedback: [null, '[[3/8]] < [[4/8]]; Can daha çok yedi.', 'Fark [[1/8]] kadar; ama 24’ün [[1/8]] kadarı kaç ceviz eder?', '[[3/8]] ile [[4/8]] eşit değil.'] },
      { prompt: 'Bir çiftlikteki 300 tavuğun [[2/5]] kadarı kahverengi. Kaç tavuk kahverengi?', choices: ['120', '60', '150', '200'], answer: 0, feedback: [null, '60, [[1/5]] kadarı; [[2/5]] iki grup eder.', '150, 300’ün yarısı.', '200, [[2/3]] kadarı olurdu.'] },
    ],
  },

  // MAT.4.1.11
  {
    id: 'g4-kesir-toplama-serit',
    outcomes: ['MAT.4.1.11'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Şeritte topla, şeritte çıkar',
    instructions: 'İşlemin sonucunu kesir şeridinde boyayarak oluştur.',
    level: 2,
    launch: { text: '3 elma + 2 elma = 5 elma. Peki 3 tane sekizde bir + 2 tane sekizde bir kaç sekizde bir eder? Kesir parçalarını da nesneler gibi sayabiliriz!', visual: fracBars([[3, 8], [2, 8]]) },
    reflect: '[[2/8]] + [[3/8]] işleminde paydalar neden toplanmıyor? “Sekizde bir”i bir nesnenin adı gibi düşünerek açıkla.',
    tool: 'fractions',
    config: { dens: [4, 5, 6, 8, 10] },
    tasks: [
      { prompt: '[[2/8]] + [[3/8]] işleminin sonucunu oluştur.', target: { num: 5, den: 8, exact: true }, hints: ['Önce 2 tane [[1/8]] boya, sonra 3 tane daha.'], explain: '2 sekizde bir + 3 sekizde bir = 5 sekizde bir. Parçaların adı (payda) değişmedi.' },
      { prompt: '[[1/5]] + [[3/5]] işleminin sonucunu oluştur.', target: { num: 4, den: 5, exact: true } },
      { prompt: '[[5/6]] − [[2/6]] işleminin sonucunu oluştur.', target: { num: 3, den: 6, exact: true }, hints: ['5 tane [[1/6]] boya, sonra 2 tanesini sil.'], explain: '5 altıda birden 2 altıda bir çıkınca 3 altıda bir kalır.' },
      { prompt: '[[7/10]] − [[4/10]] işleminin sonucunu oluştur.', target: { num: 3, den: 10, exact: true } },
    ],
  },
  {
    id: 'g4-birim-kesir-yinele',
    outcomes: ['MAT.4.1.11'],
    type: 'fill',
    stage: 'model',
    title: 'Kesir zıplamaları',
    instructions: 'Sayı doğrusundaki zıplamalara bak. Sonucun payını ve paydasını yaz.',
    level: 2,
    launch: { text: 'Bir kurbağa sayı doğrusunda her seferinde [[1/8]] zıplıyor. 5 zıplayışta nereye varır?', visual: { kind: 'numberline', min: 0, max: 1, step: 0.125, labels: false, integerLabels: true, jumps: [0, 0.125, 0.25, 0.375, 0.5, 0.625] } },
    reflect: 'Sayı doğrusundaki zıplamalar paydaları eşit kesirleri toplamayı nasıl açıklıyor?',
    items: [
      { text: '[[3/8]] kaç tane [[1/8]] eder? __', answers: ['3'], visual: { kind: 'numberline', min: 0, max: 1, step: 0.125, labels: false, integerLabels: true, jumps: [0, 0.125, 0.25, 0.375] } },
      { text: '[[2/8]] + [[3/8]] = __ / __', answers: ['5', '8'], visual: { kind: 'numberline', min: 0, max: 1, step: 0.125, labels: false, integerLabels: true, jumps: [0, 0.25, 0.625] }, hints: ['İlk zıplama kaç tane [[1/8]]? İkincisi kaç tane?', 'Toplam kaç tane [[1/8]] oldu? Parçaların adı değişti mi?'], explain: '2 tane [[1/8]] + 3 tane [[1/8]] = 5 tane [[1/8]] = [[5/8]]' },
      { text: '[[1/5]] + [[3/5]] = __ / __', answers: ['4', '5'], visual: { kind: 'numberline', min: 0, max: 1, step: 0.2, labels: false, integerLabels: true, jumps: [0, 0.2, 0.8] } },
      { text: '[[6/7]] − [[4/7]] = __ / __', answers: ['2', '7'], visual: { kind: 'numberline', min: 0, max: 1, step: 1 / 7, labels: false, integerLabels: true, jumps: [6 / 7, 2 / 7] }, hints: ['[[6/7]] noktasından geriye 4 tane [[1/7]] zıpla.'] },
      { text: '[[4/6]] + [[2/6]] = __ / __', answers: ['6', '6'], visual: { kind: 'numberline', min: 0, max: 1, step: 1 / 6, labels: false, integerLabels: true, jumps: [0, 4 / 6, 1] }, explain: '[[6/6]] = 1 bütün: tam 1’e vardık.' },
      { text: '[[9/10]] − [[3/10]] = __ / __', answers: ['6', '10'], visual: { kind: 'numberline', min: 0, max: 1, step: 0.1, labels: false, integerLabels: true, jumps: [0.9, 0.6] } },
    ],
  },
  {
    id: 'g4-kesir-topla-cikar',
    outcomes: ['MAT.4.1.11'],
    type: 'fill',
    stage: 'sembol',
    title: 'Paydaları eşit kesirlerle işlem',
    instructions: 'Kaç tane birim kesir olduğunu düşün. Sonucun payını ve paydasını yaz.',
    level: 2,
    launch: { text: 'Ali [[2/7]] + [[3/7]] için [[5/14]] buldu. Ama [[5/14]], tek başına [[3/7]]’den bile küçük! Toplam, toplananlardan küçük olabilir mi?' },
    reflect: 'Paydaları eşit kesirlerle toplama yaparken paydanın neden aynı kaldığını bir arkadaşına nasıl anlatırsın?',
    items: [
      { text: '[[3/7]] + [[2/7]] = __ / __', answers: ['5', '7'], hints: ['Kaç tane [[1/7]] var?'] },
      { text: '[[4/9]] + [[4/9]] = __ / __', answers: ['8', '9'] },
      { text: '[[11/12]] − [[5/12]] = __ / __', answers: ['6', '12'] },
      { text: '[[2/5]] + [[3/5]] = __ / __', answers: ['5', '5'], explain: '[[5/5]] = 1 bütün.' },
      { text: '[[7/8]] − [[7/8]] = __', answers: ['0'], explain: 'Hepsini çıkarınca hiç kalmaz: 0.' },
      { text: '1 − [[3/10]] = __ / __', answers: ['7', '10'], hints: ['1 bütün kaç tane [[1/10]] eder?'], explain: '1 = [[10/10]]; [[10/10]] − [[3/10]] = [[7/10]]' },
      { text: '[[3/6]] + __ / 6 = [[5/6]]', answers: ['2'], hints: ['[[3/6]]’dan [[5/6]]’ya kaç tane [[1/6]] var?'] },
      { text: '[[2/4]] + [[3/4]] = __ / __', answers: ['5', '4'], explain: '[[5/4]] = [[1 1/4]]: sonuç bir bütünden fazla!' },
    ],
  },

  // MAT.4.1.12
  {
    id: 'g4-kesir-problem-serit',
    outcomes: ['MAT.4.1.12'],
    type: 'fill',
    stage: 'model',
    title: 'Şeritle kesir problemi',
    instructions: 'Şerit modeline bak, problemi çöz. Sonucu pay ve payda olarak yaz.',
    level: 2,
    launch: { text: 'Annem bir tepsi böreği 8 eş dilime böldü. Kahvaltıda 3 dilim, öğlen 4 dilim yendi. Akşama ne kadar kaldı? Şeritle düşünelim.', visual: tape([['kahvaltı', 3], ['öğlen', 4], ['?', 1]]) },
    reflect: 'Bir kesir probleminde toplama mı çıkarma mı yapacağına nasıl karar veriyorsun?',
    items: [
      { text: 'Bir pizzanın [[3/8]] kadarını Ali, [[4/8]] kadarını Veli yedi. İkisi birlikte __ / __ kadarını yedi.', answers: ['7', '8'], visual: tape([['Ali', 3], ['Veli', 4], ['?', 1]]) },
      { text: 'Bir kumaşın [[5/6]] kadarı perde için kullanıldı. Geriye __ / __ kadarı kaldı.', answers: ['1', '6'], visual: tape([['perde', 5], ['?', 1]]), hints: ['Bütün kumaş kaç tane [[1/6]] eder?'] },
      { text: 'Kitabın ilk gün [[2/10]] kadarını, ikinci gün [[5/10]] kadarını okudum. Toplam __ / __ kadarını okudum.', answers: ['7', '10'], visual: fracBars([[2, 10, '1. gün'], [5, 10, '2. gün']]) },
      { text: 'Bir sınıftaki öğrencilerin [[4/9]] kadarı kız. Erkekler sınıfın __ / __ kadarıdır.', answers: ['5', '9'], visual: tape([['kızlar', 4], ['?', 5]]), hints: ['Bütün sınıf kaç tane [[1/9]] eder?'] },
      { text: 'Ece’de bir ipin [[7/8]] kadarı vardı. [[3/8]] kadarını kardeşine verdi. Elinde ipin __ / 8 kadarı kaldı.', answers: ['4'], visual: tape([['kardeşi', 3], ['?', 4], ['', 1]]) },
      { text: 'Bir deponun [[9/12]] kadarı doluydu. [[2/12]] kadarı kullanıldı. Depoda __ / __ kadar su kaldı.', answers: ['7', '12'], visual: tape([['?', 7], ['kullanılan', 2], ['boş', 3]]) },
    ],
  },
  {
    id: 'g4-kesir-problem-islem',
    outcomes: ['MAT.4.1.12'],
    type: 'match',
    stage: 'sembol',
    title: 'Hikâye ve işlem',
    instructions: 'Her hikâyeyi onu çözen işlemle eşleştir.',
    level: 2,
    launch: { text: 'Aynı kesirlerle farklı hikâyeler kurulabilir. Birleştirme, kalan ve karşılaştırma hikâyelerinin işlemleri neler?' },
    reflect: '“Ne kadar fazla?” sorusu neden çıkarma işlemiyle çözülür?',
    pairs: [
      { left: 'Ali pastanın [[3/8]] kadarını, sonra [[2/8]] kadarını daha yedi. Toplam ne kadar yedi?', right: '[[3/8]] + [[2/8]]' },
      { left: 'Sürahinin [[7/8]] kadarı doluydu, [[2/8]] kadarı içildi. Ne kadar kaldı?', right: '[[7/8]] − [[2/8]]' },
      { left: 'Yolun [[3/8]] kadarı yüründü. Ne kadar yol kaldı?', right: '1 − [[3/8]]' },
      { left: 'Ece kurdelenin [[5/8]] kadarını, Can [[3/8]] kadarını aldı. Ece ne kadar fazla aldı?', right: '[[5/8]] − [[3/8]]' },
      { left: 'Bahçenin [[2/8]] kadarına domates, [[5/8]] kadarına biber ekildi. Bahçenin ne kadarı ekildi?', right: '[[2/8]] + [[5/8]]' },
    ],
    perRound: 5,
  },
  {
    id: 'g4-kesir-problemleri',
    outcomes: ['MAT.4.1.12'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kesir problemleri',
    instructions: 'Problemi oku: artma mı, azalma mı, karşılaştırma mı? Sonra cevabı seç.',
    level: 2,
    launch: { text: 'Kesirler pasta, yol, zaman ve para paylaşırken karşımıza çıkar. Her problemde önce “Artma mı, azalma mı?” diye sor.' },
    reflect: 'Bulduğun cevabın mantıklı olup olmadığını nasıl kontrol ettin?',
    questions: [
      { prompt: 'Ayşe bir pastanın [[3/8]] kadarını, annesi [[2/8]] kadarını yedi. İkisi birlikte pastanın ne kadarını yedi?', choices: ['[[5/16]]', '[[5/8]]', '[[1/8]]', '[[6/8]]'], answer: 1, feedback: ['Paydaları da toplamışsın; parçalar hâlâ sekizde bir büyüklüğünde.', null, 'Çıkarma yaptın; ikisinin birlikte yediği soruluyor.', 'Sekizde birleri tekrar say: 3 + 2 kaç eder?'] },
      { prompt: 'Bir sürahinin [[7/10]] kadarı su ile dolu. Mehmet sürahinin [[4/10]] kadarı suyu içti. Sürahinin ne kadarı dolu kaldı?', choices: ['[[3/10]]', '[[11/10]]', '[[4/10]]', '[[3/20]]'], answer: 0, feedback: [null, 'Topladın; içilen su azaltılır.', '[[4/10]] içilen miktar; kalan soruluyor.', 'Paydaları işleme katmışsın; payda değişmez.'] },
      { prompt: 'Can bir yolun önce [[2/9]] kadarını, sonra [[4/9]] kadarını yürüdü. Yolun ne kadarı kaldı?', choices: ['[[6/9]]', '[[2/9]]', '[[4/9]]', '[[3/9]]'], answer: 3, explain: 'Yürüdüğü: [[6/9]]. Kalan: [[9/9]] − [[6/9]] = [[3/9]].', feedback: ['[[6/9]] yürünen yol; kalan yol soruluyor.', '[[2/9]] yalnızca ilk yürünen kısım.', '[[4/9]] yalnızca ikinci yürünen kısım.', null] },
      { prompt: 'Elif kumbarasındaki paranın [[1/6]] kadarıyla kitap, [[3/6]] kadarıyla oyuncak aldı. Parasının ne kadarını harcadı?', choices: ['[[4/12]]', '[[2/6]]', '[[4/6]]', '[[3/6]]'], answer: 2, feedback: ['Paydaları da topladın.', 'Çıkarma yaptın; harcanan toplam soruluyor.', null, '[[3/6]] yalnızca oyuncak için harcanan.'] },
      { prompt: 'Bir bahçenin [[5/12]] kadarına domates, [[4/12]] kadarına biber ekildi. Domates ekilen kısım biber ekilen kısımdan ne kadar fazladır?', choices: ['[[1/12]]', '[[9/12]]', '[[1/24]]', '[[3/12]]'], answer: 0, feedback: [null, 'Topladın; “ne kadar fazla” bir karşılaştırma sorusu.', 'Paydaları da işleme kattın.', 'Payları tekrar karşılaştır: 5 − 4 kaç eder?'] },
      { prompt: 'Zeynep [[3/4]] saat kitap okudu, [[2/4]] saat resim yaptı. Toplam kaç saat etkinlik yaptı?', choices: ['[[5/8]] saat', '[[1/4]] saat', '[[1 1/4]] saat', '[[1 2/4]] saat'], answer: 2, explain: '[[3/4]] + [[2/4]] = [[5/4]] = [[1 1/4]]', feedback: ['Paydaları da topladın.', 'Çıkardın; toplam süre soruluyor.', null, '[[5/4]] içinde [[4/4]] bir bütün eder, geriye [[1/4]] kalır.'] },
      { prompt: 'Ali [[2/7]] + [[3/7]] işleminin sonucunu [[5/14]] buldu. Hatası nedir?', choices: ['Payları çıkardı', 'Paydaları da topladı', 'Hata yok', 'Payları çarptı'], answer: 1, explain: 'Paydaları eşit kesirler toplanırken parçaların adı değişmez: [[5/7]].', feedback: ['2 ile 3’ü çıkarsaydı 1 bulurdu; o 5 bulmuş.', null, '[[5/14]], [[3/7]]’den bile küçük; toplam bu kadar küçük olamaz.', '2 × 3 = 6 olurdu; o 5 bulmuş.'] },
    ],
  },

  // MAT.4.1.13
  {
    id: 'g4-hangi-birim',
    outcomes: ['MAT.4.1.13'],
    type: 'categorize',
    stage: 'model',
    title: 'Hangi birimle ölçülür?',
    instructions: 'Her ölçümü en uygun birimin grubuna yerleştir. Büyüklükleri gözünde canlandır.',
    level: 1,
    launch: { text: 'Kolye ucu tasarlayan bir kuyumcu hangi birimi kullanır? Şehirler arası yolu ölçen harita uzmanı hangisini? Doğru birimi seçmek için büyüklükleri gözünde canlandır.' },
    reflect: '1 milimetre ve 1 kilometre için çevrende birer örnek söyler misin?',
    categories: [
      { id: 'mm', label: 'Milimetre (mm)', color: '#22c55e' },
      { id: 'km', label: 'Kilometre (km)', color: '#3b82f6' },
      { id: 'g', label: 'Gram (g)', color: '#f97316' },
      { id: 'ton', label: 'Ton (t)', color: '#a855f7' },
    ],
    items: [
      { content: '🐜 Karıncanın boyu', category: 'mm', explain: 'Karınca birkaç milimetredir; cetveldeki küçük çizgiler kadar.' },
      { content: '✏️ Kalem ucunun kalınlığı', category: 'mm' },
      { content: '🛣️ İstanbul ile Ankara arası uzaklık', category: 'km', explain: 'Şehirler arası uzaklıklar metreyle çok büyük sayılar olur; kilometre kullanırız.' },
      { content: '🏃 Maraton koşusunun uzunluğu', category: 'km' },
      { content: '🧽 Bir silginin kütlesi', category: 'g' },
      { content: '🍎 Bir elmanın kütlesi', category: 'g', explain: 'Bir elma yaklaşık 150–200 gramdır.' },
      { content: '🚚 Bir kamyon kumun kütlesi', category: 'ton', explain: 'Kamyon dolusu kum binlerce kilogramdır; ton kullanırız.' },
      { content: '🐘 Bir filin kütlesi', category: 'ton' },
    ],
  },
  {
    id: 'g4-cetvel-mm',
    outcomes: ['MAT.4.1.13'],
    type: 'fill',
    stage: 'model',
    title: 'Cetveldeki küçük çizgiler',
    instructions: 'Sarı çubuğun uzunluğunu cetvelden oku. Her santimetre 10 eş parçaya bölünmüştür: her parça 1 milimetre.',
    level: 2,
    launch: { text: 'Cetvelindeki iki santimetre çizgisi arasında küçük çizgiler var. Bunlar ne işe yarıyor? Daha hassas ölçmek için daha küçük bir birime ihtiyacımız var.', visual: ruler(20) },
    reflect: 'Bir nesneyi santimetre yerine milimetreyle ölçmek ne zaman daha uygun olur?',
    items: [
      { text: 'Silginin uzunluğu __ cm __ mm', answers: ['5', '7'], visual: ruler(57), hints: ['Çubuk hangi iki santimetre çizgisinin arasında bitiyor?', '5 cm’den sonra kaç küçük çizgi var?'] },
      { text: 'Aynı silgi __ mm uzunluğundadır.', answers: ['57'], visual: ruler(57), hints: ['1 cm kaç mm? 5 cm kaç mm eder?'], explain: '5 cm = 50 mm; 50 mm + 7 mm = 57 mm' },
      { text: 'Pastel boyanın uzunluğu __ cm, yani __ mm', answers: ['8', '80'], visual: ruler(80) },
      { text: 'Ataşın uzunluğu __ mm', answers: ['33'], visual: ruler(33) },
      { text: 'Kalemin uzunluğu __ cm __ mm, yani __ mm', answers: ['12', '4', '124'], visual: ruler(124), explain: '12 cm = 120 mm; 120 + 4 = 124 mm' },
    ],
  },
  {
    id: 'g4-olcu-eslestir',
    outcomes: ['MAT.4.1.13'],
    type: 'match',
    stage: 'sembol',
    title: 'Eşit ölçüler',
    instructions: 'Aynı uzunluğu ya da kütleyi gösteren ölçüleri eşleştir.',
    level: 2,
    launch: { text: 'Aynı uzunluk farklı birimlerle farklı sayılarla yazılabilir: 2 m da 200 cm de aynı ipi anlatır. Birim küçülünce sayı neden büyüyor?' },
    reflect: 'Birim küçüldüğünde ölçüyü gösteren sayı neden büyür? Bir örnekle açıkla.',
    pairs: [
      { left: '2 m', right: '200 cm' },
      { left: '5 cm', right: '50 mm' },
      { left: '4 km', right: '4.000 m' },
      { left: '3 kg', right: '3.000 g' },
      { left: '2 ton', right: '2.000 kg' },
      { left: '1 m 25 cm', right: '125 cm' },
      { left: '1 kg 500 g', right: '1.500 g' },
      { left: '7 m', right: '7.000 mm' },
    ],
    perRound: 4,
  },
  {
    id: 'g4-olcu-problem',
    outcomes: ['MAT.4.1.13'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ölçü problemleri',
    instructions: 'Birimleri aynı yaparak problemi çöz.',
    level: 3,
    launch: { text: 'Tarif 1 kg 500 g un istiyor, paketin üzerinde 750 g yazıyor. Kaç paket gerekir? Birimleri aynı yapınca karşılaştırmak kolaylaşır.' },
    reflect: 'Farklı birimlerle verilen iki ölçüyü karşılaştırırken ilk olarak ne yaptın?',
    questions: [
      { prompt: 'Hangisi daha uzundur?', choices: ['1 m 5 cm', '150 cm'], answer: 1, feedback: ['1 m 5 cm = 100 cm + 5 cm = 105 cm; 150 cm daha uzun.', null] },
      { prompt: '3 m uzunluğundaki bir kurdele 25 cm’lik parçalara ayrılıyor. Kaç parça olur?', choices: ['12', '75', '28', '120'], answer: 0, feedback: [null, '3 × 25 yaptın; önce metreyi santimetreye çevirip içinde kaç tane 25 cm olduğunu bul.', '3 m = 300 cm; 300 cm’de kaç tane 25 cm var?', '3 m = 3.000 cm değil, 300 cm.'] },
      { prompt: 'Bir kamyon 4 ton kum taşıyor. Bu kaç kilogramdır?', choices: ['4.000 kg', '400 kg', '40 kg', '4 kg'], answer: 0, feedback: [null, '1 ton = 1.000 kg; 4 ton kaç kilogram eder?', '1 ton 10 kg değil, 1.000 kg.', 'Ton ile kilogram aynı birim değil.'] },
      { prompt: 'Elif’in boyu 1 m 35 cm, kardeşinin boyu 98 cm. Elif kardeşinden kaç cm uzun?', choices: ['37 cm', '2 m 33 cm', '63 cm'], answer: 0, feedback: [null, 'Boyları topladın; fark soruluyor.', '1 m’yi unutup 98 − 35 yapmış olabilirsin. Önce 1 m 35 cm’yi 135 cm’ye çevir.'] },
      { prompt: 'Bir paket makarna 500 g. 4 paket kaç kilogramdır?', choices: ['2 kg', '2.000 kg', '20 kg', '200 g'], answer: 0, feedback: [null, '4 × 500 = 2.000 gram; kilograma çevirmeyi unuttun.', '1 kg = 1.000 g; 2.000 g kaç kg eder?', '4 paket, 1 paketten daha ağır olmalı.'] },
      { prompt: 'Okul ile ev arası 1.500 m. Ali her gün okula gidip geri dönüyor. Günde kaç km yürür?', choices: ['3 km', '1 km 500 m', '15 km', '300 m'], answer: 0, feedback: [null, 'Bu yalnızca gidiş; dönüşü de ekle.', '1.500 + 1.500 = 3.000 m. 1 km = 1.000 m olduğunu hatırla.', '3.000 m’yi çevirirken 1 km = 1.000 m olduğunu hatırla.'] },
    ],
  },

  // ── İşlemlerden Cebirsel Düşünmeye ──────────────────────────────────────

  // MAT.4.2.1
  {
    id: 'g4-zihinden-sayi-dogrusu',
    outcomes: ['MAT.4.2.1'],
    type: 'fill',
    stage: 'model',
    title: 'Boş sayı doğrusunda zıpla',
    instructions: 'Sayıları parçalara ayır ve sayı doğrusundaki zıplamaları izle. Sonucu zihninden bul.',
    level: 2,
    launch: { text: 'Kâğıt kalem olmadan 2.345 + 1.200 işlemini nasıl yaparsın? Sayıları parçalara ayırıp boş bir sayı doğrusunda zıplayabilirsin.', visual: jumpLine(2345, [1000, 200]) },
    reflect: '4.020 − 1.990 işlemini 1.990’dan ileri sayarak yapmak neden kolay? Başka hangi yolla yapabilirdin?',
    items: [
      { text: '2.345 + 1.200 = __', answers: ['3545'], visual: jumpLine(2345, [1000, 200]), hints: ['Önce 1.000 ekle. Nereye vardın?', 'Sonra 200 ekle.'], explain: '2.345 + 1.000 = 3.345; 3.345 + 200 = 3.545' },
      { text: '3.600 + 2.400 = __', answers: ['6000'], visual: jumpLine(3600, [400, 2000]), hints: ['3.600’ü 4.000’e tamamlamak için kaç gerekir? 2.400’den geriye ne kalır?'], explain: '3.600 + 400 = 4.000; 4.000 + 2.000 = 6.000' },
      { text: '6.800 − 2.500 = __', answers: ['4300'], visual: jumpLine(6800, [-2000, -500]), hints: ['Önce 2.000 geri zıpla, sonra 500.'] },
      { text: '4.020 − 1.990 = __ (1.990’dan 4.020’ye kaç zıpladık?)', answers: ['2030'], visual: jumpLine(1990, [10, 2000, 20], false), hints: ['1.990’dan 2.000’e kaç var?', 'Zıplamaları topla: 10 + 2.000 + 20.'], explain: 'Çıkarmayı toplama gibi düşündük: 1.990 + 2.030 = 4.020.' },
      { text: '5.000 − 1.750 = __ (1.750’den 5.000’e kaç zıpladık?)', answers: ['3250'], visual: jumpLine(1750, [250, 3000], false), hints: ['1.750’den 2.000’e kaç var?'] },
      { text: '1.456 + 2.999 = __', answers: ['4455'], visual: jumpLine(1456, [3000, -1]), hints: ['2.999 yerine 3.000 eklersen kaç fazla eklemiş olursun?'], explain: '1.456 + 3.000 = 4.456; 1 fazla eklediğimiz için 4.455.' },
    ],
  },
  {
    id: 'g4-telafi',
    outcomes: ['MAT.4.2.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Yuvarlak sayıya tamamla',
    instructions: 'Bir sayıyı yuvarlak sayıya tamamla, diğer sayıyı buna göre ayarla.',
    level: 2,
    launch: { text: '398 TL’lik bir bisiklet ve 57 TL’lik bir kask aldık. 398’i 400 gibi düşünürsek hesap kolaylaşır. Ama gereken 2 TL’yi nereden alacağız?' },
    reflect: 'Toplamada bir sayıya 2 ekleyince diğerinden neden 2 çıkarıyoruz? Çıkarmada neden ikisine de ekliyoruz?',
    generator: { id: 'compensation', params: { hundreds: true }, count: 8 },
  },
  {
    id: 'g4-zihinden-problem',
    outcomes: ['MAT.4.2.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Zihinden hesapla, karar ver',
    instructions: 'Kâğıt kalem kullanmadan düşün ve cevabı seç.',
    level: 2,
    launch: { text: 'Markette hesap yaparken hep kâğıt kalem olmaz. Sayıları yuvarlak sayılara tamamlamak ve parçalamak zihinden işlemin süper güçleridir.' },
    reflect: 'Zihinden işlem yaparken en çok hangi stratejiyi kullanıyorsun? Bir örnekle göster.',
    questions: [
      { prompt: 'Ayşe 1.990 TL’lik bir tablet ve 1.250 TL’lik bir kulaklık aldı. Zihinden en kolay hesap hangisi?', choices: ['2.000 + 1.250 − 10', '1.990 + 1.250 + 10', '2.000 + 1.250 + 10', '1.000 + 1.000 + 1.250'], answer: 0, feedback: [null, '1.990’a 10 daha eklemek sonucu bozar; 1.990’ı 2.000 yapınca 10 fazla eklemiş olursun.', '1.990’ı 2.000 yaptın, yani 10 fazla ekledin; bu 10’u çıkarmalısın.', 'Bu yolla 10 fazla bulursun; düzeltmeyi unutma.'] },
      { prompt: 'Bir otoparkta 2.500 araç vardı, 1.300 araç çıktı. Kaç araç kaldı?', choices: ['1.200', '3.800', '1.300', '1.100'], answer: 0, feedback: [null, 'Topladın; çıkan araçlar azaltılır.', '1.300, çıkan araç sayısı.', '2.500 − 1.000 = 1.500; 1.500 − 300 = ? Tekrar hesapla.'] },
      { prompt: 'Can 5.000 − 2.998 işlemini “5.000 − 3.000 = 2.000, sonra 2 ekle.” diye yaptı. Neden 2 ekledi?', choices: ['2 fazla çıkardığı için', '2 eksik çıkardığı için', 'Sonuç çift olsun diye'], answer: 0, feedback: [null, '3.000, 2.998’den büyük; Can fazla çıkardı.', 'Sayının tek ya da çift olması sebep değil; 2.998 yerine 3.000 çıkarıldı.'] },
      { prompt: 'Hangi işlemin sonucu 4.000’dir?', choices: ['2.750 + 1.250', '2.750 + 1.350', '3.500 + 1.500', '1.999 + 2.999'], answer: 0, feedback: [null, '750 + 350 = 1.100; sonuç 4.100.', '3.500 + 1.500 = 5.000.', '1.999 neredeyse 2.000, 2.999 neredeyse 3.000; toplam 5.000’e yakın.'] },
      { prompt: 'Bir kitapçıda 3.450 kitap vardı. 1.200 kitap satıldı, sonra 800 kitap geldi. Şimdi kaç kitap var?', choices: ['3.050', '2.250', '5.450', '1.450'], answer: 0, feedback: [null, 'Bu, satıştan sonraki sayı; gelen kitapları da ekle.', 'Satılan kitapları da ekledin; satılanlar azaltılır.', 'Gelen kitapları çıkardın; gelenler eklenir.'] },
    ],
  },

  // MAT.4.2.2
  {
    id: 'g4-bloklarla-toplama',
    outcomes: ['MAT.4.2.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Bloklarla topla ve çıkar',
    instructions: 'İşlemi bloklarla yap ve sonucu göster. 10 tane olunca bir üst bloğa çevir; gerekirse bir bloğu boz.',
    level: 2,
    launch: { text: 'Bir okulda 1.245 kız ve 2.378 erkek öğrenci var. Toplam kaç öğrenci? Bloklarla toplarken “elde”nin nereden geldiğini göreceğiz.', visual: { kind: 'blocks', thousands: 1, hundreds: 2, tens: 4, ones: 5 } },
    reflect: 'Eldeli toplamada “elde 1” aslında neyi gösterir? Bloklarla açıkla.',
    tool: 'base10',
    config: { maxPlace: 'thousands' },
    tasks: [
      { prompt: '1.245 + 2.378 işlemini bloklarla yap: önce 1.245’i koy, sonra 2.378’i ekle. Sonucu göster.', target: { value: 3623 }, hints: ['Birlikler: 5 + 8 = 13. 10 birliği bir onluğa çevir.', 'Onluklar: 4 + 7 + 1 = 12. 10 onluğu bir yüzlüğe çevir.'], explain: '1.245 + 2.378 = 3.623' },
      { prompt: '2.468 + 1.375 işleminin sonucunu bloklarla göster.', target: { value: 3843 }, explain: 'Birler: 13 → 1 onluk elde; onlar: 14 → 1 yüzlük elde; sonuç 3.843.' },
      { prompt: '4.000 − 1.250 işleminin sonucunu bloklarla göster. Bir binliği 10 yüzlüğe bozman gerekebilir.', target: { value: 2750 }, hints: ['4 binlikten 2 yüzlük nasıl çıkar? Önce bir binliği yüzlüklere boz.', '50 için de bir yüzlüğü onluklara bozmalısın.'], explain: '4.000 − 1.250 = 2.750' },
      { prompt: '3.506 − 1.248 işleminin sonucunu bloklarla göster.', target: { value: 2258 }, hints: ['Birlerde 6’dan 8 çıkmaz. Onluk yok! Önce bir yüzlüğü onluklara boz.'], explain: '3.506 − 1.248 = 2.258' },
    ],
  },
  {
    id: 'g4-eksik-terim',
    outcomes: ['MAT.4.2.2'],
    type: 'fill',
    stage: 'model',
    title: 'Bütün ve parçalar',
    instructions: 'Şerit modelinde bütün ve parçalara bak. Eksik sayıyı bul.',
    level: 3,
    launch: { text: 'Bir kumbara 5.000 TL’de doluyor. İçinde 2.375 TL var. Daha ne kadar gerekiyor? Şerit modeli bütünü ve parçaları gösterir.', visual: tape([['2.375', 2375], ['?', 2625]], '5.000') },
    reflect: 'Toplama ile çıkarma neden birbirinin tersidir? Şerit modeline bakarak açıkla.',
    items: [
      { text: '__ + 2.375 = 5.000', answers: ['2625'], visual: tape([['?', 2625], ['2.375', 2375]], '5.000'), hints: ['Bütün 5.000, bir parça 2.375. Diğer parçayı bulmak için hangi işlemi yaparsın?'] },
      { text: '6.400 − __ = 3.850', answers: ['2550'], visual: tape([['3.850', 3850], ['?', 2550]], '6.400') },
      { text: '(1.250 + 340) + __ = 2.000', answers: ['410'], visual: tape([['1.250', 1250], ['340', 340], ['?', 410]], '2.000'), hints: ['Önce parantezin içini topla.'] },
      { text: '4.523 + 2.180 = 6.703 ise 6.703 − 2.180 = __', answers: ['4523'], visual: tape([['4.523', 4523], ['2.180', 2180]], '6.703'), explain: 'Bütünden bir parçayı çıkarınca diğer parça kalır.' },
      { text: '2.416 + 3.589 = 6.005 ise 3.589 + 2.416 = __', answers: ['6005'], visual: tape([['3.589', 3589], ['2.416', 2416]], '?'), explain: 'Toplananların yeri değişse de bütün aynıdır.' },
      { text: '10.000 − 3.456 = __', answers: ['6544'], visual: tape([['3.456', 3456], ['?', 6544]], '10.000'), hints: ['3.456’dan 4.000’e, 4.000’den 10.000’e kaç var?'] },
      { text: '(500 + 1.200) + 800 = 500 + (1.200 + __)', answers: ['800'], hints: ['Toplananları farklı gruplasak toplam değişir mi?'] },
    ],
  },
  {
    id: 'g4-islem-adimlari',
    outcomes: ['MAT.4.2.2'],
    type: 'sort',
    stage: 'sembol',
    title: 'İşlemin adımları',
    instructions: 'İşlem adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Bir aşçı tarifin adımlarını karıştırırsa yemek bozulur. İşlemlerin de bir sırası var. Neden birlerden başlıyoruz?' },
    reflect: 'Toplamaya binler basamağından başlasaydık ne sorun çıkardı?',
    rounds: [
      {
        prompt: 'Eldeli toplama: 2.468 + 1.375',
        items: [
          'Basamakları alt alta gelecek şekilde yaz.',
          'Birler: 8 + 5 = 13 → 3’ü yaz, 1 onluk elde.',
          'Onlar: 6 + 7 + 1 = 14 → 4’ü yaz, 1 yüzlük elde.',
          'Yüzler: 4 + 3 + 1 = 8 → 8’i yaz.',
          'Binler: 2 + 1 = 3 → Sonuç 3.843',
        ],
        hints: ['Toplamada hangi basamaktan başlarız?'],
      },
      {
        prompt: 'Bozarak çıkarma: 5.302 − 1.247',
        items: [
          'Basamakları alt alta gelecek şekilde yaz.',
          'Birlerde 2’den 7 çıkmaz; onlarda 0 var, yüzlerden 1 yüzlük boz.',
          '1 onluğu birlere ver: 12 − 7 = 5',
          'Onlar: 9 − 4 = 5, yüzler: 2 − 2 = 0',
          'Binler: 5 − 1 = 4 → Sonuç 4.055',
        ],
      },
      {
        prompt: 'Tahminle kontrol: 3.896 + 2.150',
        items: [
          'Önce tahmin et: 3.900 + 2.100 yaklaşık 6.000 eder.',
          'Basamakları alt alta yaz.',
          'Birlerden başlayarak topla.',
          'Sonucu bul: 6.046',
          'Sonucu tahminle karşılaştır: 6.046, 6.000’e yakın.',
        ],
      },
    ],
  },
  {
    id: 'g4-toplama-hata',
    outcomes: ['MAT.4.2.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'İşlem dedektifi',
    instructions: 'İşlemleri ve çözümleri incele. Hatayı bul ya da en iyi tahmini seç.',
    level: 3,
    launch: { text: 'Bir öğrencinin işleminde hata var. Dedektif gibi hatayı bul ve nedenini açıkla. Hatalar öğrenmenin bir parçasıdır!' },
    reflect: 'Bir işlemin sonucunun mantıklı olup olmadığını tahmin ederek nasıl kontrol edersin?',
    questions: [
      { prompt: 'Can 5.302 − 1.247 işleminin sonucunu 4.145 buldu. Hatası ne olabilir?', choices: ['Her basamakta büyük rakamdan küçüğü çıkardı.', 'Hata yok, sonuç doğru.', 'Toplama yaptı.'], answer: 0, feedback: [null, 'Doğru sonuç 4.055; Can bozma yapmadan her basamakta büyükten küçüğü çıkardı.', 'Toplasaydı 6.549 bulurdu.'] },
      { prompt: 'Elif 3.896 + 2.150 işlemini yapmadan önce tahmin etti. Hangi tahmin en uygundur?', choices: ['Yaklaşık 6.000', 'Yaklaşık 5.000', 'Yaklaşık 60.000', 'Yaklaşık 1.700'], answer: 0, feedback: [null, '3.896 neredeyse 4.000; 4.000 + 2.000 kaç eder?', 'Dört basamaklı iki sayının toplamı 60.000 olamaz.', 'Bu, iki sayının farkına yakın; toplama yapıyoruz.'] },
      { prompt: 'Mert 2.468 + 1.375 işleminin sonucunu 3.733 buldu. Hatası nedir?', choices: ['Eldeleri eklemeyi unuttu.', 'Birlerden başlamadı.', 'Çıkarma yaptı.'], answer: 0, feedback: [null, 'Hangi basamaktan başlarsa başlasın eldeyi eklemezse bu sonucu bulur.', 'Çıkarsaydı 1.093 bulurdu.'] },
      { prompt: 'Bir çiftlikte 4.250 kg buğday vardı. 1.875 kg satıldı. Kaç kg kaldı?', choices: ['2.375 kg', '3.625 kg', '6.125 kg', '2.625 kg'], answer: 0, feedback: [null, 'Her basamakta büyükten küçüğü çıkarmış olabilir misin? Bozma gerekiyor.', 'Topladın; satılan buğday azaltılır.', 'Bozma yaparken bir basamağı azaltmayı unutmuş olabilirsin.'] },
      { prompt: 'Hangi toplam 10.000’i geçer?', choices: ['6.500 + 3.700', '4.999 + 4.999', '5.000 + 5.000', '2.800 + 7.100'], answer: 0, feedback: [null, 'İkisi de 5.000’den az; toplam 10.000’den az.', 'Tam 10.000; geçmiyor, eşit.', '2.800 + 7.100 = 9.900.'] },
      { prompt: 'Ayşe 7.000 − 2.346 için “7.000 − 2.000 = 5.000, 5.000 − 346 = 4.654” dedi. Sonuç doğru mu?', choices: ['Evet, çıkanı parçalayarak doğru çıkardı.', 'Hayır, 346’yı eklemeliydi.', 'Hayır, mutlaka birlerden başlamalıydı.'], answer: 0, feedback: [null, '2.346’nın tamamını çıkarmalıyız: önce 2.000, sonra 346.', 'Zihinden işlemde büyük basamaktan başlamak da doğrudur; önemli olan parçaların hepsini çıkarmak.'] },
    ],
  },

  // MAT.4.2.3
  {
    id: 'g4-tahmin-yuvarla',
    outcomes: ['MAT.4.2.3'],
    type: 'fill',
    stage: 'model',
    title: 'Yuvarla ve tahmin et',
    instructions: 'Çarpmada sayıları en yakın onluğa ya da yüzlüğe yuvarla. Bölmede bölene kolayca bölünen yakın bir sayı seç. Tahminini yaz.',
    level: 2,
    launch: { text: 'Okulda 28 sınıf var, her sınıfta 31 öğrenci. Tam sayıyı hesaplamadan “yaklaşık kaç?” diye sorsak? 28 ve 31 hangi yuvarlak sayılara yakın?', visual: { kind: 'numberline', min: 20, max: 40, step: 1, points: [28, 31] } },
    reflect: 'Bölmede tahmin yaparken neden en yakın yüzlük yerine bölene kolay bölünen bir sayı seçtin?',
    items: [
      { text: '28 × 31 ≈ __ × __ = __', answers: ['30', '30', '900'], visual: { kind: 'numberline', min: 20, max: 40, step: 1, points: [28, 31] }, hints: ['28 hangi onluğa yakın? 31 hangi onluğa yakın?'] },
      { text: '198 × 5 ≈ __ × 5 = __', answers: ['200', '1000'], visual: { kind: 'numberline', min: 190, max: 210, step: 1, points: [198] } },
      { text: '39 × 21 ≈ __ × __ = __', answers: ['40', '20', '800'], visual: { kind: 'numberline', min: 20, max: 40, step: 1, points: [21, 39] } },
      { text: '312 × 19 ≈ __ × __ = __', answers: ['300', '20', '6000'], visual: { kind: 'numberline', min: 300, max: 320, step: 1, points: [312] }, hints: ['312 hangi yüzlüğe yakın? 19 hangi onluğa yakın?'] },
      { text: '4.812 ÷ 6 ≈ __ ÷ 6 = __', answers: ['4800', '800'], visual: { kind: 'numberline', min: 4700, max: 4900, step: 20, points: [4812] }, hints: ['48 yüzlük 6’ya kolayca bölünür. 4.812’ye en yakın böyle sayı hangisi?'] },
      { text: '2.418 ÷ 8 ≈ __ ÷ 8 = __', answers: ['2400', '300'], visual: { kind: 'numberline', min: 2300, max: 2500, step: 20, points: [2418] }, hints: ['24 yüzlük 8’e nasıl bölünür?'] },
      { text: '3.590 ÷ 9 ≈ __ ÷ 9 = __', answers: ['3600', '400'], visual: { kind: 'numberline', min: 3500, max: 3700, step: 20, points: [3590] } },
    ],
  },
  {
    id: 'g4-tahmin-1000',
    outcomes: ['MAT.4.2.3'],
    type: 'categorize',
    stage: 'sembol',
    title: '1.000’den büyük mü, küçük mü?',
    instructions: 'İşlem yapmadan tahmin et: Sonuç 1.000’den büyük mü, küçük mü?',
    level: 2,
    launch: { text: 'Bir kantinci 1.000 TL’lik bütçeyle alışveriş yapacak. Hangi siparişler bütçeyi aşar? Hesaplamadan, yuvarlak sayılarla karar verelim.' },
    reflect: 'Sonucu hesaplamadan 1.000’den büyük olduğuna nasıl karar verdin?',
    categories: [
      { id: 'kucuk', label: '1.000’den küçük', color: '#22c55e' },
      { id: 'buyuk', label: '1.000’den büyük', color: '#f97316' },
    ],
    items: [
      { content: '312 × 4', category: 'buyuk', explain: '300 × 4 = 1.200 bile 1.000’i geçer.' },
      { content: '520 × 3', category: 'buyuk', explain: '500 × 3 = 1.500.' },
      { content: '32 × 48', category: 'buyuk', explain: '30 × 50 = 1.500’e yakın.' },
      { content: '8.400 ÷ 4', category: 'buyuk', explain: '84 yüzlük ÷ 4 = 21 yüzlük = 2.100.' },
      { content: '180 × 5', category: 'kucuk', explain: '200 × 5 = 1.000; 180 daha küçük olduğu için sonuç 1.000’den az.' },
      { content: '4.200 ÷ 6', category: 'kucuk', explain: '42 yüzlük ÷ 6 = 7 yüzlük = 700.' },
      { content: '245 × 3', category: 'kucuk', explain: '250 × 3 = 750’ye yakın.' },
      { content: '6.300 ÷ 9', category: 'kucuk', explain: '63 yüzlük ÷ 9 = 7 yüzlük = 700.' },
      { content: '19 × 21', category: 'kucuk', explain: '20 × 20 = 400’e yakın.' },
    ],
  },
  {
    id: 'g4-carpma-tahmini',
    outcomes: ['MAT.4.2.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Önce tahmin et',
    instructions: 'Sayıları yuvarlayarak sonucu tahmin et.',
    level: 2,
    launch: { text: 'Sınıf gezisi için otobüs kiralanacak. Öğretmen “Toplam ücret yaklaşık ne kadar?” diye soruyor. Tahmin, hesaptan önce sonucun mantıklı olup olmadığını gösterir.' },
    reflect: 'Tahminin gerçek sonuçtan fazla mı eksik mi olacağını yuvarladığın sayılara bakarak nasıl söyleyebilirsin?',
    questions: [
      { prompt: 'Bir okulda 28 sınıf var ve her sınıfta 31 öğrenci bulunuyor. Okulda yaklaşık kaç öğrenci vardır?', choices: ['600', '900', '1.200', '300'], answer: 1, explain: '28 ≈ 30, 31 ≈ 30 → 30 × 30 = 900', feedback: ['20 × 30 olarak yuvarlamışsın; 28, 30’a daha yakın.', null, '40 × 30 olurdu; 28 kırka değil otuza yakın.', 'Bu yalnızca 10 sınıf için yaklaşık sonuç.'] },
      { prompt: '4.812 ÷ 6 işleminin sonucu yaklaşık kaçtır?', choices: ['80', '8.000', '800', '600'], answer: 2, explain: '4.812 ≈ 4.800 → 48 yüzlük ÷ 6 = 8 yüzlük = 800', feedback: ['48 yüzlük ÷ 6 = 8 yüzlük; 8 onluk değil.', 'Bölünce sonuç küçülür; 8.000, 4.812’den büyük!', null, '4.800 ÷ 8 gibi düşünmüş olabilirsin.'] },
      { prompt: '198 × 5 işleminin sonucu yaklaşık kaçtır?', choices: ['1.000', '100', '10.000', '500'], answer: 0, feedback: [null, '200 × 5 = 1.000; 100 çok küçük.', '200 × 50 olurdu.', '100 × 5 olurdu; 198, 200’e yakın.'] },
      { prompt: 'Bir kitap 39 TL. 21 kitap için yaklaşık ne kadar ödenir?', choices: ['600 TL', '1.200 TL', '400 TL', '800 TL'], answer: 3, explain: '40 × 20 = 800', feedback: ['30 × 20 olarak yuvarladın; 39, 40’a daha yakın.', '40 × 30 olurdu; 21, 20’ye yakın.', '40 × 10 olurdu.', null] },
      { prompt: '2.418 ÷ 8 işleminin sonucu yaklaşık kaçtır?', choices: ['30', '300', '3.000', '200'], answer: 1, explain: '2.418 ≈ 2.400 → 24 yüzlük ÷ 8 = 3 yüzlük = 300', feedback: ['24 yüzlük ÷ 8 = 3 yüzlük; 3 onluk değil.', null, 'Bölüm, bölünenden (2.418) büyük olamaz.', '1.600 ÷ 8 gibi düşünmüşsün; 2.418’e 2.400 daha yakın.'] },
      { prompt: 'Elif 312 × 19 işlemini 300 × 20 = 6.000 olarak tahmin etti. Gerçek sonuç 5.928’dir. Tahmini gerçek sonuca göre nasıldır?', choices: ['Eksik', 'Eşit', 'Fazla'], answer: 2, feedback: ['6.000, 5.928’den büyük; tahmin fazla.', 'Tahmin ile sonuç arasında 72 fark var.', null] },
      { prompt: 'Bir otobüs bileti 135 TL. 24 kişilik bir sınıfın toplam bilet ücreti hangisine en yakındır?', choices: ['3.000 TL', '300 TL', '30.000 TL', '2.000 TL'], answer: 0, feedback: [null, 'Bu, yaklaşık 2 kişinin ücreti; 24 kişi için çok az.', '100 × 24 = 2.400 ile 200 × 24 = 4.800 arasında olmalı; 30.000 çok büyük.', '100 × 20 diye yuvarlayınca çok aşağıda kalırsın; 135, 100’den epey büyük.'] },
    ],
  },

  // MAT.4.2.4
  {
    id: 'g4-onluk-katlar',
    outcomes: ['MAT.4.2.4'],
    type: 'match',
    stage: 'model',
    title: 'Onluklar, yüzlükler, binlikler',
    instructions: 'Basamak birimleriyle söylenen her ifadeyi değeriyle eşleştir.',
    level: 2,
    launch: { text: 'Bir kırtasiye kalemleri 10’luk, 100’lük ve 1.000’lik kutularda satıyor. 34 tane 100’lük kutuda kaç kalem vardır?', visual: { kind: 'blocks', hundreds: 3, tens: 4 } },
    reflect: '34 × 100 işleminin sonucunun neden 3.400 olduğunu “yüzlük” sözcüğünü kullanarak açıkla.',
    pairs: [
      { left: '34 tane onluk', right: '340' },
      { left: '34 tane yüzlük', right: '3.400' },
      { left: '34 tane binlik', right: '34.000' },
      { left: '6 tane 400 (24 yüzlük)', right: '2.400' },
      { left: '7 tane 3.000', right: '21.000' },
      { left: '125 tane onluk', right: '1.250' },
      { left: '45.000 içindeki yüzlük sayısı', right: '450' },
      { left: '8.000 içindeki binlik sayısı', right: '8' },
    ],
    perRound: 4,
  },
  {
    id: 'g4-kisa-yoldan',
    outcomes: ['MAT.4.2.4'],
    type: 'fill',
    stage: 'sembol',
    title: '10, 100, 1.000 ile kısa yoldan',
    instructions: 'Basamak değerini düşünerek kısa yoldan işlem yap.',
    level: 1,
    launch: { text: '46 tane 100 TL’lik banknot kaç TL eder? Tek tek saymak yerine basamak değerini düşünelim.' },
    reflect: '45.000 ÷ 100 işleminde neden 450 bulduk? “Kaç tane yüzlük var?” sorusuyla açıkla.',
    items: [
      { text: '46 × 10 = __', answers: ['460'], hints: ['46 tane onluk kaç eder?'] },
      { text: '46 × 100 = __', answers: ['4600'], hints: ['46 tane yüzlük kaç eder?'] },
      { text: '46 × 1.000 = __', answers: ['46000'] },
      { text: '7 × 400 = __', answers: ['2800'], hints: ['7 × 4 yüzlük kaç yüzlük eder?'], explain: '7 × 4 = 28 → 28 yüzlük = 2.800' },
      { text: '125 × 3.000 = __', answers: ['375000'], hints: ['125 × 3 kaç eder? Bu kaç binlik?'], explain: '125 × 3 = 375 → 375 binlik = 375.000' },
      { text: '45.000 ÷ 100 = __', answers: ['450'], hints: ['45.000 içinde kaç tane yüzlük var?'] },
      { text: '82.000 ÷ 10 = __', answers: ['8200'], hints: ['82.000 içinde kaç tane onluk var?'] },
      { text: '6.000 ÷ 1.000 = __', answers: ['6'] },
    ],
  },
  {
    id: 'g4-5-25-50-ile-carpma',
    outcomes: ['MAT.4.2.4'],
    type: 'fill',
    stage: 'sembol',
    title: '5, 25 ve 50 ile kısa yoldan çarpma',
    instructions: '5’in 10’un yarısı, 25’in 100’ün dörtte biri, 50’nin 100’ün yarısı olduğunu kullan.',
    level: 3,
    launch: { text: 'Bir paketi 25 TL olan çıkartmalardan 36 paket alınca ne ödenir? 4 tane 25 TL’nin 100 TL ettiğini biliyorsan hesap çok kolaylaşır!' },
    reflect: '× 25 yaparken neden önce 100 ile çarpıp sonra 4’e bölebiliriz? Para örneğiyle açıkla.',
    items: [
      { text: '48 × 5 = 48 × 10 ÷ 2 = __', answers: ['240'], explain: '5, 10’un yarısıdır; 48 × 10 = 480’in yarısı 240.' },
      { text: '86 × 5 = __', answers: ['430'], hints: ['86 × 10 kaç eder? 5, 10’un neyidir?'] },
      { text: '36 × 25 = 36 × 100 ÷ 4 = __', answers: ['900'], explain: '25, 100’ün dörtte biridir: 3.600’ün dörtte biri 900.' },
      { text: '44 × 25 = __', answers: ['1100'], hints: ['4 tane 25 kaç eder? 44’te kaç tane 4 var?'], explain: '44 = 11 × 4; 11 tane 100 = 1.100' },
      { text: '64 × 50 = 64 × 100 ÷ 2 = __', answers: ['3200'] },
      { text: '120 × 50 = __', answers: ['6000'], hints: ['120 × 100 kaç eder? 50, 100’ün neyidir?'] },
      { text: '250 × 5 = __', answers: ['1250'] },
    ],
  },
  {
    id: 'g4-kisa-yol-problem',
    outcomes: ['MAT.4.2.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kısa yolla problem çöz',
    instructions: 'Problemi kısa yolları kullanarak çöz.',
    level: 2,
    launch: { text: 'Bir oyuncak fabrikası günde 300 oyuncak üretiyor. Kısa yolları bilen biri 8 günlük üretimi saniyeler içinde söyleyebilir. Sen de dene!' },
    reflect: 'Kısa yoldan çarpma ve bölme yaparken hangi basamak değeri bilgisini kullandın?',
    questions: [
      { prompt: 'Bir koli 25 kalem alıyor. 36 koli kaç kalem eder?', choices: ['900', '360', '3.600', '61'], answer: 0, feedback: [null, '36 × 10 yaptın; bir kolide 25 kalem var.', '36 × 100 yaptın; 25, 100’ün dörtte biridir.', 'Topladın; her kolide 25 kalem var, 36 kez.'] },
      { prompt: 'Bir fabrika 1 günde 300 oyuncak yapıyor. 8 günde kaç oyuncak yapar?', choices: ['2.400', '240', '24.000', '308'], answer: 0, feedback: [null, '8 × 3 yüzlük = 24 yüzlük; 24 onluk değil.', '24 binlik olmaz; 24 yüzlük.', 'Topladın; her gün 300 oyuncak yapılıyor.'] },
      { prompt: '24.000 TL 100 kişiye eşit paylaştırılıyor. Kişi başı kaç TL düşer?', choices: ['240 TL', '2.400 TL', '24 TL', '2.400.000 TL'], answer: 0, feedback: [null, 'Bu, 10 kişiye paylaştırma olurdu.', 'Bu, 1.000 kişiye paylaştırma olurdu.', 'Bölünce sayı küçülür, büyümez.'] },
      { prompt: 'Hangisi 48 × 5 ile aynı sonucu verir?', choices: ['48 × 10’un yarısı', '48 × 10’un iki katı', '48 + 5', '48 × 100 ÷ 4'], answer: 0, feedback: [null, 'Bu, 48 × 20 olur.', 'Toplama, çarpmayla aynı sonucu vermez.', 'Bu, 48 × 25 olur.'] },
      { prompt: 'Bir gemi 9.000 kg yükü 1.000 kg’lık konteynerlere koyuyor. Kaç konteyner gerekir?', choices: ['9', '90', '900', '9.000'], answer: 0, feedback: [null, '90 konteyner 90.000 kg alırdı.', '900 konteyner çok fazla; 9.000 içinde kaç tane 1.000 var?', 'Bu, yükün kendisi; içinde kaç tane 1.000 olduğunu bul.'] },
      { prompt: 'Elif 70 × 600 için “7 × 6 = 42, sonuç 42 yüzlük, yani 4.200” dedi. Neyi gözden kaçırdı?', choices: ['70’in 7 onluk olduğunu', '600’ün 6 yüzlük olduğunu', 'Hiçbir şeyi, sonuç doğru'], answer: 0, feedback: [null, '600’ü 6 yüzlük olarak doğru düşündü; ama 70, 7 değil 7 onluktur.', 'Doğru sonuç 42.000: 7 onluk × 6 yüzlük.'] },
    ],
  },

  // MAT.4.2.5
  {
    id: 'g4-carpma-blok',
    outcomes: ['MAT.4.2.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Bloklarla çarp ve paylaştır',
    instructions: 'Bloklarla eş gruplar oluştur ya da eşit paylaştır. Sonucu göster.',
    level: 2,
    launch: { text: 'Bir kantinde her biri 123 TL olan 4 sipariş var. Bloklarla 4 grup kurarsak toplamı görebiliriz. Bölme de bloklarla eşit paylaştırmadır.', visual: { kind: 'blocks', hundreds: 1, tens: 2, ones: 3 } },
    reflect: 'Çarparken basamakları ayrı ayrı çarpmak (400 + 80 + 12) neden işe yarıyor?',
    tool: 'base10',
    tasks: [
      { prompt: '123’lük 4 grup oluştur ve hepsini birleştir. 4 × 123 kaç eder? Sonucu göster.', target: { value: 492 }, hints: ['Her grupta 1 yüzlük, 2 onluk, 3 birlik var. 4 grupta kaç yüzlük, onluk, birlik olur?'], explain: '4 × 123 = 400 + 80 + 12 = 492' },
      { prompt: '3 × 245 sonucunu bloklarla göster.', target: { value: 735 }, hints: ['3 × 5 birlik = 15 birlik: 10 birliği onluğa çevir.'], explain: '3 × 245 = 600 + 120 + 15 = 735' },
      { prompt: '639 boncuk 3 kardeşe eşit paylaştırılıyor. Bir kardeşin payını bloklarla göster.', target: { value: 213 }, hints: ['6 yüzlüğü 3’e paylaştır, sonra 3 onluğu, sonra 9 birliği.'], explain: '639 ÷ 3 = 213: her kardeşe 2 yüzlük, 1 onluk, 3 birlik.' },
      { prompt: '456 ceviz 4 torbaya eşit konuyor. Bir torbadaki cevizi bloklarla göster.', target: { value: 114 }, hints: ['4 yüzlüğü 4’e paylaştır. 5 onluğun 4’ünü paylaştır; kalan 1 onluğu birliklere boz.'], explain: '456 ÷ 4 = 114' },
    ],
  },
  {
    id: 'g4-dizi-carpma',
    outcomes: ['MAT.4.2.5'],
    type: 'fill',
    stage: 'model',
    title: 'Dizi ve alan modeliyle çarpma',
    instructions: 'Modeli parçalara ayır, parçaların çarpımlarını bul ve topla.',
    level: 2,
    launch: { text: 'Bir sinema salonunda 12 sıra ve her sırada 15 koltuk var. Koltukları tek tek saymak yerine salonu parçalara ayırabiliriz.', visual: areaModel([10, 5], [10, 2]) },
    reflect: 'Alan modelinde dikdörtgeni parçalara ayırmak çarpmayı nasıl kolaylaştırdı?',
    items: [
      { text: '6 × 14 = 6 × 10 + 6 × 4 = __ + __ = __', answers: ['60', '24', '84'], visual: { kind: 'array', rows: 6, cols: 14, splitCol: 10 }, hints: ['Kesikli çizginin solunda kaç nokta var? Sağında?'] },
      { text: '23 × 4 = __', answers: ['92'], visual: areaModel([20, 3], [4]), hints: ['20 × 4 kaç eder? 3 × 4 kaç eder?'], explain: '20 × 4 = 80, 3 × 4 = 12, 80 + 12 = 92' },
      { text: '125 × 3 = __', answers: ['375'], visual: areaModel([100, 20, 5], [3]), explain: '300 + 60 + 15 = 375' },
      { text: '12 × 15 = __', answers: ['180'], visual: areaModel([10, 5], [10, 2]), hints: ['Dört parçanın her birini bul: 10 × 10, 5 × 10, 10 × 2, 5 × 2.'], explain: '100 + 50 + 20 + 10 = 180' },
      { text: '24 × 13 = __', answers: ['312'], visual: areaModel([20, 4], [10, 3]), explain: '200 + 40 + 60 + 12 = 312' },
      { text: '7 × 18 = 7 × 20 − 7 × 2 = __', answers: ['126'], visual: { kind: 'array', rows: 7, cols: 18 }, hints: ['7 × 20 kaç eder? Fazladan sayılan 7 × 2 kaç?'] },
      { text: '8 × 9 = 72 ise 8 × 10 = __', answers: ['80'], visual: { kind: 'array', rows: 8, cols: 10, splitCol: 9 }, explain: 'Bir sütun daha eklendi: 8 nokta daha. Çarpanlardan biri 1 artınca çarpım diğer çarpan kadar artar.' },
    ],
  },
  {
    id: 'g4-carpma-bolme-iliskisi',
    outcomes: ['MAT.4.2.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Çarpma ve bölme kardeştir',
    instructions: 'Çarpma ile bölme arasındaki ilişkiyi kullan. Kalanlı bölmelerde bölümü ve kalanı yaz.',
    level: 3,
    launch: { text: 'Çarpma ve bölme bir ailenin kardeşleri gibidir: 7 × 8 = 56 biliyorsan 56 ÷ 8’i de bilirsin. Peki bölme tam çıkmazsa?' },
    reflect: 'Bölmede kalan neden bölenden küçük olmak zorunda? Bir örnekle açıkla.',
    items: [
      { text: '7 × 8 = 56 ise 56 ÷ 8 = __', answers: ['7'] },
      { text: '6 × 45 = 270 ise 270 ÷ 6 = __', answers: ['45'] },
      { text: '15 × 8 = 120 ise 15 × 9 = __', answers: ['135'], hints: ['Bir tane daha 15 eklersen ne olur?'], explain: '15 × 9 = 15 × 8 + 15' },
      { text: '235 ÷ 4 → bölüm __, kalan __', answers: ['58', '3'], hints: ['4 × 50 = 200. Geriye 35 kalır. 35 içinde kaç tane 4 var?'], explain: '4 × 58 = 232; 235 − 232 = 3' },
      { text: '750 ÷ 7 → bölüm __, kalan __', answers: ['107', '1'], hints: ['7 × 100 = 700. Geriye 50 kalır.'] },
      { text: '476 ÷ 3 → bölüm __, kalan __', answers: ['158', '2'], hints: ['Kalan her zaman bölenden küçüktür.'] },
      { text: 'Bir bölme işleminde bölen 6 ise kalan en çok __ olabilir.', answers: ['5'], explain: 'Kalan 6 olsaydı bir grup daha oluşturabilirdik.' },
      { text: '245 ÷ 5 işleminde bölüm __ basamaklıdır.', answers: ['2'], hints: ['2 yüzlüğü 5’e eşit paylaştırabilir misin?'], explain: '2 < 5 olduğu için yüzlükler basamağında bölüm çıkmaz: 245 ÷ 5 = 49.' },
    ],
  },
  {
    id: 'g4-bolme-iki-anlam',
    outcomes: ['MAT.4.2.5'],
    type: 'categorize',
    stage: 'problem',
    title: 'Bölmenin iki anlamı',
    instructions: 'Problem neyi soruyor? “Bir grupta kaç tane?” mı, “Kaç grup?” mu? Grubuna yerleştir.',
    level: 2,
    launch: { text: '12 kurabiyeyi 3 tabağa eşit paylaştırmak ile 12 kurabiyeyi 3’erli paketlemek aynı işlemle (12 ÷ 3) yazılır. Ama sorulan şey farklıdır!', visual: { kind: 'emoji', emoji: '🍪', count: 12, group: 3 } },
    reflect: 'Bölmenin iki anlamını kendi örneklerinle anlat: biri paylaştırma, biri gruplama olsun.',
    categories: [
      { id: 'paylas', label: 'Paylaştırma: Bir grupta kaç tane?', color: '#6366f1' },
      { id: 'grupla', label: 'Gruplama: Kaç grup?', color: '#f97316' },
    ],
    items: [
      { content: '84 TL 4 kardeşe eşit paylaştırılıyor. Her birine kaç TL düşer?', category: 'paylas', explain: 'Grup sayısı (4 kardeş) belli; bir gruptaki miktarı arıyoruz.' },
      { content: '120 fidan, her sırada 10 fidan olacak şekilde dikildi. Kaç sıra oluştu?', category: 'grupla', explain: 'Bir gruptaki miktar (10 fidan) belli; grup sayısını arıyoruz.' },
      { content: '96 yumurta 12’li kolilere konuyor. Kaç koli gerekir?', category: 'grupla' },
      { content: '144 öğrenci 6 otobüse eşit dağıldı. Bir otobüste kaç öğrenci var?', category: 'paylas' },
      { content: '250 cm kurdeleden 25’er cm’lik parçalar kesiliyor. Kaç parça olur?', category: 'grupla' },
      { content: '360 sayfalık kitabı 9 günde eşit bölerek okuyacağım. Günde kaç sayfa okurum?', category: 'paylas' },
      { content: '72 kalem 8 kutuya eşit konuyor. Bir kutuda kaç kalem olur?', category: 'paylas' },
      { content: '500 TL ile 50 TL’lik biletlerden kaç tane alınır?', category: 'grupla' },
    ],
  },

  // MAT.4.2.6
  {
    id: 'g4-yonerge-akis',
    outcomes: ['MAT.4.2.6'],
    type: 'fill',
    stage: 'model',
    title: 'İşlem makinesi',
    instructions: 'Makinenin yönergesini adım adım uygula ve boşluğu doldur.',
    level: 2,
    launch: { text: 'Bir oyunda makine sayıları sırayla değiştiriyor: önce 4 ile çarpıyor, sonra 30 ekliyor… Yönergeyi takip edersen sonucu bulursun.', visual: flow('25', ['× 4', '+ 30', '÷ 10', '− 7']) },
    reflect: 'Sonucu bilip başlangıç sayısını bulmak için ne yaptın? Neden ters işlem kullandın?',
    items: [
      { text: 'Sonuç: __', answers: ['6'], visual: flow('25', ['× 4', '+ 30', '÷ 10', '− 7']), hints: ['25 × 4 kaç eder? Her ara sonucu boş kutuya yazdığını düşün.'] },
      { text: 'Sonuç: __', answers: ['110'], visual: flow('120', ['÷ 3', '+ 15', '× 2']) },
      { text: 'Sonuç: __', answers: ['150'], visual: flow('8', ['× 100', '− 250', '÷ 5', '+ 40']) },
      { text: 'Sonuç: __', answers: ['375'], visual: flow('1.000', ['− 375', '÷ 5', '× 3']) },
      { text: 'Sonuç: __', answers: ['10000'], visual: flow('7', ['× 9', '+ 37', '× 100']) },
      { text: 'Başlangıç sayısı: __', answers: ['8'], visual: flow('?', ['× 6', '+ 12'], '60'), hints: ['Sondan başa ters işlemlerle git: 60’tan 12 çıkar, sonra 6’ya böl.'] },
      { text: 'Ayşe’nin 200 TL’si var. 45 TL’lik kitap aldı, annesi 30 TL verdi, parasını 5 eşit zarfa koydu. Bir zarfta __ TL var.', answers: ['37'], visual: flow('200', ['− 45', '+ 30', '÷ 5']) },
    ],
  },
  {
    id: 'g4-yonerge-sirala',
    outcomes: ['MAT.4.2.6'],
    type: 'sort',
    stage: 'sembol',
    title: 'Yönergeyi oluştur',
    instructions: 'Yönergenin adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Bir yönergenin adımları karışırsa sonuç değişir. Adımları doğru sıraya koy ve her adımda ne olduğunu kontrol et.' },
    reflect: 'Yönergede iki adımın yerini değiştirseydik sonuç değişir miydi? Bir örnekle dene.',
    rounds: [
      { prompt: 'Başlangıç sayısı 6. Adımları sırala.', items: ['6’yı yaz.', '8 ile çarp → 48', '12 ekle → 60', '5’e böl → 12', '7 çıkar → 5'] },
      { prompt: 'Sonuçta 100’e ulaşan yönergeyi sırala.', items: ['15’i yaz.', '3 ile çarp → 45', '5 ekle → 50', '2 ile çarp → 100'] },
      { prompt: 'Alışveriş yönergesini sırala.', items: ['Cüzdanda 500 TL var.', '80 TL’lik 3 kitap al → 240 TL harca.', 'Kalan parayı hesapla → 260 TL', 'Kalanı 2 kardeşe eşit böl → 130’ar TL'] },
    ],
  },
  {
    id: 'g4-yonerge-sec',
    outcomes: ['MAT.4.2.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangi yönerge işe yarar?',
    instructions: 'Yönergeleri dene ve doğru olanı seç.',
    level: 3,
    launch: { text: 'Aynı başlangıç ve sonuç sayısına farklı yönergelerle ulaşılabilir. Hangi yönerge gerçekten işe yarıyor? Her birini dene!' },
    reflect: '12’den 30’a ulaşan kendi yönergeni oluştur. Arkadaşınınki seninkinden farklı mı?',
    questions: [
      { prompt: 'Hangi yönerge 5’ten başlayıp 40’a ulaştırır?', choices: ['3 ile çarp, 20 ekle', '6 ile çarp, 5 çıkar', '5 ile çarp, 15 ekle', '10 ile çarp, 5 çıkar'], answer: 2, feedback: ['5 × 3 + 20 = 35 eder.', '5 × 6 − 5 = 25 eder.', null, '5 × 10 − 5 = 45 eder.'] },
      { prompt: '2.000’den başla, her adımda 250 çıkar. 4 adım sonra hangi sayıya ulaşırsın?', choices: ['1.250', '1.000', '750', '1.500'], answer: 1, feedback: ['3 adım saymışsın.', null, '5 adım saymışsın.', '2 adım saymışsın.'] },
      { prompt: '“Sayıyı 10 ile çarp, sonra 10’a böl.” Sonuç başlangıç sayısına göre nasıldır?', choices: ['10 kat büyür', '10 azalır', 'Aynı kalır'], answer: 2, feedback: ['Önce 10 kat büyür ama sonra 10’a bölünür.', '10’a bölmek 10 çıkarmak değildir.', null] },
      { prompt: 'Merve şu yönergeyi yazdı: “48’i 6’ya böl, sonucu 9 ile çarp.” Sonuç kaçtır?', choices: ['54', '72', '63', '81'], answer: 1, feedback: ['6 × 9 yaptın; önce 48’i 6’ya böl.', null, '48 ÷ 6 = 8; 7 × 9 değil 8 × 9.', '48 ÷ 6 = 8; 9 × 9 değil 8 × 9.'] },
      { prompt: '“Sayıya 3 ekle, sonra yine 3 ekle.” yönergesini başka nasıl ifade edebiliriz?', choices: ['Sayıya 6 ekle', 'Sayıyı 3 ile çarp', 'Sayıya 9 ekle', 'Sayıyı 6 ile çarp'], answer: 0, feedback: [null, '3 eklemek, 3 ile çarpmak değildir.', 'İki kez 3 eklemek 6 eder.', 'Ekleme yapıyoruz, çarpma değil.'] },
      { prompt: 'Başlangıç sayısı 12, sonuç 30. Hangi yönerge doğrudur?', choices: ['12’ye 20 ekle', '12’yi 3 ile çarp', '12’yi 2’ye böl, 20 ekle', '12’yi 2 ile çarp, 6 ekle'], answer: 3, feedback: ['12 + 20 = 32 eder.', '12 × 3 = 36 eder.', '12 ÷ 2 + 20 = 26 eder.', null] },
    ],
  },

  // MAT.4.2.7
  {
    id: 'g4-problem-serit',
    outcomes: ['MAT.4.2.7'],
    type: 'fill',
    stage: 'model',
    title: 'Önce çiz, sonra çöz',
    instructions: 'Şerit modeline bakarak problemi çöz.',
    level: 2,
    launch: { text: 'Bir problemi şerit modeliyle çizmek verilenleri ve isteneni görünür kılar. Önce çiz, sonra hesapla!' },
    reflect: 'Şerit modeli çizmek hangi problemde işini en çok kolaylaştırdı? Neden?',
    items: [
      { text: 'Bir fırın günde 240 simit yapıyor. Bir haftada __ simit yapar.', answers: ['1680'], visual: tape(eqParts(7, '240'), '?'), hints: ['Bir hafta kaç gün? Şeritte kaç tane 240 var?'] },
      { text: 'Can’ın kumbarasında 1.375 TL var. 289 TL’lik kask ve 146 TL’lik top aldı. Kumbarada __ TL kaldı.', answers: ['940'], visual: tape([['289', 289], ['146', 146], ['?', 940]], '1.375') },
      { text: '144 öğrenci 6 kişilik takımlara ayrıldı. __ takım oluştu.', answers: ['24'], visual: tape([['6', 1], ['6', 1], ['6', 1], ['…', 2], ['6', 1]], '144'), hints: ['144 içinde kaç tane 6 var? Önce 60 içinde kaç tane 6 olduğunu düşün.'] },
      { text: 'Elif 1.250 TL biriktirdi. Kardeşi Elif’ten 380 TL az biriktirdi. İkisi birlikte __ TL biriktirdi.', answers: ['2120'], visual: tape([['Elif: 1.250', 1250]], undefined, [['Kardeşi: ?', 870], ['380', 380]]), hints: ['Önce kardeşinin parasını bul: 1.250 − 380.'] },
      { text: 'Bir manav her birinde 12 kg domates olan 4 kasa aldı. 29 kg sattı. Geriye __ kg domates kaldı.', answers: ['19'], visual: tape(eqParts(4, '12'), '?') },
      { text: 'Bir sinema salonunda 18 sıra, her sırada 24 koltuk var. 397 kişi film izliyor. __ koltuk boş.', answers: ['35'], visual: tape([['397 dolu', 397], ['?', 35]], '18 × 24'), hints: ['Önce salondaki koltuk sayısını bul.'] },
    ],
  },
  {
    id: 'g4-problem-coz',
    outcomes: ['MAT.4.2.7'],
    type: 'fill',
    stage: 'sembol',
    title: 'Problemi işleme çevir',
    instructions: 'Problemi çözen işlem yazılmış. İşlemi yap ve sonucu yaz.',
    level: 2,
    launch: { text: 'Problemi matematik diline çevirmek, yani işlemi yazmak, çözümün yarısıdır.' },
    reflect: 'Bir problemi işlem olarak yazarken hangi bilgiler sana yol gösterdi?',
    items: [
      { text: 'Bir kitap 35 TL. 12 kitap kaç TL? 35 × 12 = __', answers: ['420'], hints: ['35 × 10 + 35 × 2'] },
      { text: '3 m kurdele 25 cm’lik parçalara ayrıldı: 300 ÷ 25 = __ parça', answers: ['12'], hints: ['100 cm içinde kaç tane 25 cm var?'] },
      { text: 'Günde 5 porsiyon meyve ve sebze yenmesi öneriliyor. Bir haftada: 5 × 7 = __ porsiyon', answers: ['35'] },
      { text: 'Bir çiftçi 2.400 kg buğdayın 1.650 kg’ını sattı, kalanı 50 kg’lık çuvallara koydu: (2.400 − 1.650) ÷ 50 = __ çuval', answers: ['15'], hints: ['Önce parantezin içini yap.'] },
      { text: 'Mehmet her gün 15 sayfa okuyor. 3 haftada: 15 × 21 = __ sayfa', answers: ['315'] },
      { text: 'Bir okulda 645 kız, 578 erkek öğrenci var. 645 + 578 = __ öğrenci. 1.000 kişilik salona __ kişi sığmaz.', answers: ['1223', '223'] },
      { text: '936 ceviz 4 torbaya eşit konuyor: 936 ÷ 4 = __', answers: ['234'] },
    ],
  },
  {
    id: 'g4-dort-islem-problemleri',
    outcomes: ['MAT.4.2.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Dört işlem problemleri',
    instructions: 'Verilenleri ve isteneni belirle, sonucu tahmin et, sonra doğru cevabı seç.',
    level: 2,
    launch: { text: 'Günlük hayatta problemler tek adımda bitmez: alışveriş, yolculuk, tarif… Önce verilenleri ve isteneni belirle, sonucu tahmin et, sonra çöz.' },
    reflect: 'Çok adımlı bir problemde hangi işlemi önce yapacağına nasıl karar verdin?',
    questions: [
      { prompt: 'Bir kırtasiye 1.250 defter aldı. 875 tanesini sattı, sonra 400 defter daha aldı. Kırtasiyede kaç defter oldu?', choices: ['1.725', '775', '375', '675'], answer: 1, explain: '1.250 − 875 = 375, 375 + 400 = 775', feedback: ['875’i ekledin; satılan defterler azaltılır.', null, 'Bu, satıştan sonraki sayı; gelen 400 defteri ekle.', '1.250 − 875 işlemini tekrar kontrol et.'] },
      { prompt: 'Bir otobüs 48 yolcu alıyor. 6 otobüs dolusu öğrenci geziye gitti. Geziye kaç öğrenci gitti?', choices: ['248', '54', '308', '288'], answer: 3, feedback: ['48 × 6’yı tekrar hesapla: 40 × 6 + 8 × 6.', 'Topladın; 6 otobüsün her birinde 48 yolcu var.', 'Tahmin et: 50 × 6 = 300; sonuç 300’den biraz az olmalı.', null] },
      { prompt: '936 ceviz 4 eşit torbaya konuyor. Bir torbada kaç ceviz olur?', choices: ['234', '232', '244', '324'], answer: 0, feedback: [null, '4 × 232 = 928; 936’ya ulaşmıyor.', '4 × 244 = 976; fazla.', 'Rakamların sırası karışmış; 4 × 324 = 1.296.'] },
      { prompt: 'Mehmet her gün 15 sayfa kitap okuyor. 3 hafta boyunca kaç sayfa okur?', choices: ['45', '105', '315', '215'], answer: 2, explain: '3 hafta = 21 gün, 21 × 15 = 315', feedback: ['3 hafta 3 gün değildir; 21 gün eder.', '105, 1 haftalık sayfa sayısı; 3 hafta soruluyor.', null, '15 × 21 = 15 × 20 + 15; tekrar hesapla.'] },
      { prompt: 'Bir çiftçi 2.400 kg buğdayın 1.650 kg’ını sattı. Kalanı 50 kg’lık çuvallara doldurdu. Kaç çuval kullandı?', choices: ['33', '15', '48', '75'], answer: 1, explain: '2.400 − 1.650 = 750, 750 ÷ 50 = 15', feedback: ['33 = 1.650 ÷ 50; ama satılan değil kalan buğday çuvallara konuyor.', null, '48 = 2.400 ÷ 50; önce satılanı çıkarmalısın.', '750 kalan kilogram; içinde kaç tane 50 kg var?'] },
      { prompt: 'Bir sinema salonunda 18 sıra, her sırada 24 koltuk var. 397 kişi film izliyor. Kaç koltuk boş?', choices: ['35', '45', '25', '432'], answer: 0, explain: '18 × 24 = 432, 432 − 397 = 35', feedback: [null, '432 − 397 işlemini tekrar yap.', '432 − 397 işlemini tekrar yap.', '432, salondaki koltuk sayısı; boş koltuklar soruluyor.'] },
      { prompt: 'Önce tahmin et: Bir dükkân 195 TL’lik ayakkabıdan 21 çift sattı. Toplam satış yaklaşık kaç TL?', choices: ['Yaklaşık 4.000 TL', 'Yaklaşık 400 TL', 'Yaklaşık 40.000 TL', 'Yaklaşık 2.000 TL'], answer: 0, feedback: [null, '200 × 2 değil, 200 × 20 düşün.', '200 × 200 olurdu; yalnızca 21 çift satılmış.', '100 × 20 diye yuvarladın; 195, 200’e daha yakın.'] },
    ],
  },
  {
    id: 'g4-kalan-ne-anlama-gelir',
    outcomes: ['MAT.4.2.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kalan ne anlama gelir?',
    instructions: 'Bölmeyi yap, sonra kalanın bu problemde ne anlama geldiğini düşün.',
    level: 3,
    launch: { text: '100 öğrenci 8 kişilik minibüslere binecek. 100 ÷ 8 = 12, kalan 4. Peki 12 minibüs yeterli mi? Kalanın anlamı soruya göre değişir!' },
    reflect: 'Kalanlı bir bölmede cevabı bazen bir artırdık, bazen kalanı cevap olarak verdik. Buna nasıl karar verdin?',
    questions: [
      { prompt: '100 öğrenci 8 kişilik minibüslerle geziye gidecek. Kaç minibüs gerekir?', choices: ['13', '12', '4', '108'], answer: 0, feedback: [null, '12 minibüse 96 öğrenci biner; kalan 4 öğrenci ne olacak?', '4, kalan öğrenci sayısı; minibüs sayısı değil.', '100 + 8 yaptın; öğrenciler 8’erli gruplara ayrılıyor.'] },
      { prompt: '50 kalem 6’şar kalemlik kutulara konuyor. Kaç kutu tamamen dolar?', choices: ['8', '9', '2', '56'], answer: 0, feedback: [null, '9. kutu yalnızca 2 kalemle dolmaz.', '2, artan kalem sayısı.', 'Topladın; kalemler kutulara bölünüyor.'] },
      { prompt: 'Aynı soruda kaç kalem artar?', choices: ['2', '8', '6', '0'], answer: 0, feedback: [null, '8, dolu kutu sayısı.', '6, bir kutudaki kalem sayısı; artan kalem bundan az olmalı.', '8 × 6 = 48; 50’den 48 çıkınca kalan var.'] },
      { prompt: '25 TL ile 4 TL’lik kalemlerden en çok kaç tane alınır?', choices: ['6', '7', '1', '100'], answer: 0, feedback: [null, '7 kalem 28 TL eder; para yetmez.', '1 TL, para üstü.', '25 × 4 yaptın; kaç kalem alınacağı bölmeyle bulunur.'] },
      { prompt: '17 kurabiye 4 kardeşe eşit paylaştırılıyor; artan kurabiye anneye veriliyor. Anne kaç kurabiye alır?', choices: ['1', '4', '5', '0'], answer: 0, feedback: [null, '4, bir kardeşin aldığı kurabiye.', 'Her kardeş 5 alsaydı 20 kurabiye gerekirdi.', '4 × 4 = 16; 17’den bir kurabiye artar.'] },
      { prompt: '58 kişilik bir grup 9 kişilik masalara oturacak. Herkesin oturması için en az kaç masa gerekir?', choices: ['7', '6', '4', '67'], answer: 0, feedback: [null, '6 masaya 54 kişi oturur; 4 kişi ayakta kalır.', '4, masası olmayan kişi sayısı.', 'Topladın; kişiler masalara bölünüyor.'] },
    ],
  },

  // MAT.4.2.8
  {
    id: 'g4-problem-model-eslestir',
    outcomes: ['MAT.4.2.8'],
    type: 'match',
    stage: 'model',
    title: 'Şerit ve hikâye',
    instructions: 'Her şerit modelini anlattığı problemle eşleştir.',
    level: 2,
    launch: { text: 'Bir problemi şeritle çizebiliyorsan, bir şeride bakarak problem de yazabilirsin! Modeli hikâyeyle eşleştir.' },
    reflect: '96 ÷ 12 ve 84 ÷ 4 problemlerinin şeritleri neden farklı çizildi?',
    pairs: [
      { left: { visual: tape([['380', 380], ['?', 870]], '1.250') }, right: 'Ali’nin 1.250 TL’si vardı, 380 TL harcadı. Kaç TL’si kaldı?' },
      { left: { visual: tape(eqParts(6, '24'), '?') }, right: 'Bir kutuda 24 kalem var. 6 kutuda kaç kalem vardır?' },
      { left: { visual: tape([['12', 1], ['12', 1], ['…', 1], ['12', 1]], '96') }, right: '96 yumurta 12’li kolilere konuyor. Kaç koli gerekir?' },
      { left: { visual: tape([['645', 645], ['578', 578]], '?') }, right: 'Okulda 645 kız ve 578 erkek öğrenci var. Toplam kaç öğrenci vardır?' },
      { left: { visual: tape(eqParts(4, '?'), '84') }, right: '84 TL 4 kardeşe eşit paylaştırılıyor. Kişi başı kaç TL düşer?' },
      { left: { visual: tape([['Ahmet: 1.450', 1450]], undefined, [['Zeynep: 1.180', 1180], ['?', 270]]) }, right: 'Ahmet 1.450, Zeynep 1.180 adım attı. Ahmet kaç adım fazla attı?' },
    ],
    perRound: 3,
  },
  {
    id: 'g4-hangi-islem',
    outcomes: ['MAT.4.2.8'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Hangi işlemle çözülür?',
    instructions: 'Problemdeki duruma bak: birleştirme, ayırma, eş gruplar ya da paylaştırma. İşlemin grubuna yerleştir.',
    level: 2,
    launch: { text: 'Problemdeki durum (birleştirme, ayırma, karşılaştırma, eş gruplar, paylaştırma) hangi işlemi seçeceğimizi belirler. Anahtar sözcüklere değil, duruma bak!' },
    reflect: '“Toplam” sözcüğü geçen ama toplama ile çözülmeyen bir problem yazabilir misin?',
    categories: [
      { id: 'topla', label: '➕ Toplama', color: '#22c55e' },
      { id: 'cikar', label: '➖ Çıkarma', color: '#ef4444' },
      { id: 'carp', label: '✖️ Çarpma', color: '#3b82f6' },
      { id: 'bol', label: '➗ Bölme', color: '#a855f7' },
    ],
    items: [
      { content: 'Kütüphanede 1.200 kitap vardı, 350 kitap daha geldi. Şimdi kaç kitap var?', category: 'topla' },
      { content: '75 cm ve 48 cm’lik iki kurdele uç uca eklendi. Kurdele kaç cm oldu?', category: 'topla' },
      { content: '2.000 TL’den 650 TL harcanırsa kaç TL kalır?', category: 'cikar' },
      { content: 'Ahmet 1.450, Zeynep 1.180 adım attı. Ahmet kaç adım fazla attı?', category: 'cikar', explain: 'Karşılaştırma durumu: fark çıkarmayla bulunur.' },
      { content: 'Her gün 8 bardak su içen Can bir haftada kaç bardak su içer?', category: 'carp', explain: '7 eş grup, her grupta 8 bardak.' },
      { content: 'Toplam 12 katlı bir apartmanda her katta 4 daire var. Kaç daire vardır?', category: 'carp', explain: '“Toplam” sözcüğü geçiyor ama durum eş gruplar: 12 × 4.' },
      { content: '84 TL 4 kardeşe eşit paylaştırılırsa her birine kaç TL düşer?', category: 'bol' },
      { content: '120 fidan, her sırada 10 fidan olacak şekilde dikildi. Kaç sıra oluştu?', category: 'bol' },
    ],
  },
  {
    id: 'g4-problem-kur',
    outcomes: ['MAT.4.2.8'],
    type: 'quiz',
    stage: 'problem',
    title: 'Problemi sen kur',
    instructions: 'İşleme ya da duruma uygun problemi seç.',
    level: 3,
    launch: { text: 'Şimdi sıra sende: Problemi sen kur! Bir işleme uygun hikâye yazmak, işlemin anlamını gerçekten bildiğini gösterir.' },
    reflect: '24 × 6 işlemine uygun kendi problemini yaz. Bir arkadaşın çözebilsin.',
    questions: [
      { prompt: 'Hangi problem 250 × 4 işlemiyle çözülür?', choices: ['250 cevizin 4’ü yendi. Kaç ceviz kaldı?', 'Bir paket 250 g. 4 paket kaç gramdır?', '250 TL 4 kişiye bölündü. Her biri kaç TL aldı?', '250 kişiye 4 kişi daha katıldı. Kaç kişi oldu?'], answer: 1, feedback: ['Bu, 250 − 4 ile çözülür.', null, 'Bu, 250 ÷ 4 ile çözülür.', 'Bu, 250 + 4 ile çözülür.'] },
      { prompt: '“Bir çiftlikte 360 tavuk var. Tavuklar 9 kümese eşit dağıtılıyor.” Bu problemin sorusu ne olmalı?', choices: ['Çiftlikte kaç hayvan var?', 'Tavuklar kaç yumurta verir?', 'Bir kümeste kaç tavuk olur?', 'Kümesler kaç metre uzunluğunda?'], answer: 2, feedback: ['Problemde yalnızca tavuklardan söz ediliyor.', 'Yumurta sayısı hakkında bilgi yok.', null, 'Kümeslerin uzunluğu hakkında bilgi yok.'] },
      { prompt: 'Selin bir problem kurdu: “Kumbaramda 500 TL vardı…” Problem 500 − 120 − 85 işlemiyle çözülecekse devamı hangisi olmalı?', choices: ['120 TL ve 85 TL daha biriktirdim. Kaç TL’m oldu?', '85 TL’lik 120 kitap aldım.', 'Paramı 120 kişiye dağıttım.', '120 TL’lik ayakkabı ve 85 TL’lik kitap aldım. Kaç TL’m kaldı?'], answer: 3, feedback: ['Bu, 500 + 120 + 85 ile çözülür.', 'Bu, 85 × 120 gibi bir işlem gerektirir.', 'Bu, 500 ÷ 120 gibi bir işlem gerektirir.', null] },
      { prompt: 'Hangi problem bölme işlemi gerektirir?', choices: ['48 öğrenci 4’er kişilik gruplara ayrıldı. Kaç grup oldu?', '48 öğrenciye 4 öğrenci daha katıldı. Kaç öğrenci oldu?', 'Her biri 48 sayfa olan 4 defterde kaç sayfa var?', '48 öğrenciden 4’ü gelmedi. Kaç öğrenci geldi?'], answer: 0, feedback: [null, 'Bu, toplama ile çözülür.', 'Bu, çarpma ile çözülür.', 'Bu, çıkarma ile çözülür.'] },
      { prompt: '“Bir paket makarna 1.000 g…” Problemin 1.000 ÷ 4 ile çözülmesi için hangi bilgi eklenmeli?', choices: ['4 paket makarna daha alındı.', 'Makarna 4 eş tabağa paylaştırıldı.', 'Makarnanın 4 gramı döküldü.', 'Makarna 4 dakika pişti.'], answer: 1, feedback: ['Bu bilgiyle çarpma ya da toplama yapılır.', null, 'Bu bilgiyle çıkarma yapılır.', 'Pişme süresi bölmeyle ilgili değil.'] },
      { prompt: 'Hangi problem 1.000 − 350 işlemiyle çözülmez?', choices: ['Bir şişede 1.000 mL su vardı, 350 mL içildi. Kaç mL kaldı?', '1.000 TL’nin 350 TL’si harcandı. Kaç TL kaldı?', 'Rafta 350 kitap var. 1.000 kitaba ulaşmak için kaç kitap gerekir?', 'Bir kutuda 1.000 boncuk ve 350 düğme var. Kutuda kaç parça var?'], answer: 3, feedback: ['İçilen su azaltılır: 1.000 − 350.', 'Harcanan para azaltılır: 1.000 − 350.', 'Eksik miktar da 1.000 − 350 ile bulunur.', null] },
    ],
  },

  // MAT.4.2.9
  {
    id: 'g4-terazi',
    outcomes: ['MAT.4.2.9'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Teraziyi dengele',
    instructions: 'Her kutuda eşit sayıda bilye var. Kutunun değerini değiştirerek teraziyi dengeye getir.',
    level: 3,
    launch: { text: 'Bir terazinin iki kefesi dengedeyse iki taraftaki ağırlıklar eşittir. “=” işareti de tam olarak bunu söyler: iki taraf aynı değerde.', visual: { kind: 'balance', left: ['?', '?', '?', '4'], right: ['19'] } },
    reflect: 'Teraziyi dengede tutarak her iki taraftan aynı şeyi çıkarmak neden işe yarıyor?',
    tool: 'balance',
    tasks: [
      { prompt: '3 kutu ve 4 bilye, 19 bilye ile dengede. Bir kutuda kaç bilye var?', target: { a: 3, b: 4, c: 19 }, hints: ['İki kefeden de 4 bilye çıkarırsan denge bozulur mu?', '3 kutu kaç bilyeyle dengede kaldı?'], explain: '3 kutu = 15 bilye, 1 kutu = 5 bilye.' },
      { prompt: '2 kutu ve 6 bilye, 20 bilye ile dengede. Bir kutuda kaç bilye var?', target: { a: 2, b: 6, c: 20 } },
      { prompt: '4 kutu ve 8 bilye, 32 bilye ile dengede. Bir kutuda kaç bilye var?', target: { a: 4, b: 8, c: 32 } },
      { prompt: '5 kutu ve 5 bilye, 30 bilye ile dengede. Bir kutuda kaç bilye var?', target: { a: 5, b: 5, c: 30 } },
    ],
  },
  {
    id: 'g4-esitlik-tamamla',
    outcomes: ['MAT.4.2.9'],
    type: 'fill',
    stage: 'model',
    title: 'Eşitliği koru',
    instructions: 'Terazinin iki kefesi aynı değerde olmalı. Boşluğu doldur.',
    level: 2,
    launch: { text: 'Ece “7 × 8 = __ + 6” sorusuna 56 yazdı. Terazinin iki tarafı dengede kalır mı? “=” işaretinin anlamını terazide görelim.', visual: { kind: 'balance', left: ['7 × 8'], right: ['? + 6'] } },
    reflect: '“=” işaretini görünce ne düşünmelisin: “sonucu yaz” mı, “iki taraf eşit” mi? Neden?',
    items: [
      { text: '6 × 4 = 3 × __', answers: ['8'], visual: { kind: 'balance', left: ['6 × 4'], right: ['3 × ?'] } },
      { text: '36 ÷ 4 = 3 × __', answers: ['3'], visual: { kind: 'balance', left: ['36 ÷ 4'], right: ['3 × ?'] } },
      { text: '125 + 75 = 400 ÷ __', answers: ['2'], visual: { kind: 'balance', left: ['125 + 75'], right: ['400 ÷ ?'] } },
      { text: '5 × 12 = 100 − __', answers: ['40'], visual: { kind: 'balance', left: ['5 × 12'], right: ['100 − ?'] } },
      { text: '7 × 8 = 50 + __', answers: ['6'], visual: { kind: 'balance', left: ['7 × 8'], right: ['50 + ?'] }, hints: ['Sol kefe kaç ediyor? Sağ kefenin de o kadar etmesi gerekir.'], explain: '56 = 50 + 6. “=” işareti “sonucu yaz” demek değildir; iki tarafın eşit olduğunu söyler.' },
      { text: '8 × 5 = __ + 10', answers: ['30'], visual: { kind: 'balance', left: ['8 × 5'], right: ['? + 10'] }, explain: '40 yazsaydık sağ taraf 50 olurdu. 30 + 10 = 40.' },
      { text: '48 ÷ 6 = 2 × __', answers: ['4'], visual: { kind: 'balance', left: ['48 ÷ 6'], right: ['2 × ?'] } },
      { text: '24 sandalye 4 sıraya dizilince her sırada 6 sandalye olur: 4 × 6 = 24. Aynı sandalyeler 3 sıraya dizilirse: 4 × 6 = 3 × __', answers: ['8'], visual: { kind: 'array', rows: 4, cols: 6, emoji: '🪑' } },
    ],
  },
  {
    id: 'g4-esit-mi',
    outcomes: ['MAT.4.2.9'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Eşit mi, eşit değil mi?',
    instructions: 'İki tarafın değeri aynıysa “=”, farklıysa “≠” grubuna koy.',
    level: 2,
    launch: { text: 'Bir hakem gibi karar ver: İki taraf gerçekten aynı değerde mi? Yakın olmak yetmez, tam eşit olmalı.' },
    reflect: '4 × 6 = 3 × 8 eşitliğini sandalye dizileriyle nasıl açıklarsın?',
    categories: [
      { id: 'esit', label: '= Eşit', color: '#22c55e' },
      { id: 'degil', label: '≠ Eşit değil', color: '#ef4444' },
    ],
    items: [
      { content: '4 × 6  …  3 × 8', category: 'esit', explain: 'İkisi de 24.' },
      { content: '48 ÷ 6  …  2 × 4', category: 'esit' },
      { content: '100 − 35  …  50 + 15', category: 'esit' },
      { content: '9 × 5  …  90 ÷ 2', category: 'esit' },
      { content: '7 × 7  …  6 × 8', category: 'degil', explain: '49 ≠ 48: çok yakın ama eşit değil.' },
      { content: '64 ÷ 8  …  4 + 5', category: 'degil', explain: '8 ≠ 9' },
      { content: '250 + 250  …  1.000 ÷ 4', category: 'degil', explain: '500 ≠ 250' },
      { content: '12 × 3  …  40 − 6', category: 'degil', explain: '36 ≠ 34' },
    ],
  },
  {
    id: 'g4-esitlik-farkli',
    outcomes: ['MAT.4.2.9'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (İşlemler)',
    instructions: 'Hangisi diğerlerinden farklı? Seç ve gerekçeni düşün. Her seçeneğin bir gerekçesi var.',
    level: 2,
    launch: { text: 'Dört seçenekten hangisi farklı? Her birini savunabilirsin! Gerekçeni işlemlerle ve eşitlik fikriyle açıkla.' },
    reflect: '6 × 40 ile 250 − 10 farklı görünüyor ama eşit. Bunu “=” işaretiyle nasıl yazarsın?',
    questions: [
      { prompt: 'Hangisi farklı?', choices: ['6 × 40', '24 × 10', '4 × 60', '250 − 10'], answer: 3, reasons: ['Çarpanlarından biri 6 olan tek ifade.', '10 ile çarpılan tek ifade: 24 onluk.', 'Çarpanlarından biri 60 olan tek ifade.', 'Çıkarma işlemiyle yazılmış tek ifade (ama o da 240 eder!).'] },
      { prompt: 'Hangisi farklı?', choices: ['12 ÷ 3', '2 × 2', '8 − 4', '4 ÷ 2'], answer: 3, reasons: ['Bölüneni iki basamaklı olan tek ifade.', 'Çarpma işlemi olan tek ifade.', 'Çıkarma işlemi olan tek ifade.', 'Sonucu 4 olmayan tek ifade: 2 eder.'] },
      { prompt: 'Hangisi farklı?', choices: ['12 kurabiye 3 tabağa eşit paylaştırıldı.', '12 kurabiye 3’erli paketlendi.', '3 tabağın her birinde 4 kurabiye var.', '12 kurabiyenin 3’ü yendi.'], answer: 3, reasons: ['Bir tabaktakini soran paylaştırma durumu (12 ÷ 3).', 'Kaç paket olduğunu soran gruplama durumu (12 ÷ 3).', 'Çarpmayla (3 × 4) anlatılan tek durum.', 'Çıkarmayla (12 − 3) çözülen, sonucu 4 olmayan tek durum.'] },
      { prompt: 'Hangisi farklı?', choices: ['5 × 8 = 40', '40 = 5 × 8', '40 ÷ 5 = 8', '40 = 40'], answer: 1, reasons: ['İşlemin solda, sonucun sağda olduğu alışılmış yazım.', 'Sonucun solda yazıldığı eşitlik: “=” iki yönlü okunur.', 'Bölme işlemi içeren tek eşitlik.', 'Hiç işlem içermeyen tek eşitlik.'] },
      { prompt: 'Hangisi farklı?', choices: ['3 × 8', '4 × 6', '2 × 12', '5 × 5'], answer: 3, reasons: ['Çarpanlarından biri 3 olan tek ifade.', 'İki çarpanı da tek basamaklı çift sayı olan tek ifade.', 'İki basamaklı çarpanı olan tek ifade.', 'Sonucu 24 değil 25 olan tek ifade.'] },
    ],
  },

  // ── Nesnelerin Geometrisi (1) ───────────────────────────────────────────

  // MAT.4.3.1
  {
    id: 'g4-acinim-katla',
    outcomes: ['MAT.4.3.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Açınımdan cisme',
    instructions: 'Açınımı incele ve katla. Hangi cisim oluşur?',
    level: 1,
    launch: { text: 'Bir kutuyu ayrıtlarından kesip açarsak düz bir şekil elde ederiz: açınım. Peki bir açınımı katlarsak hangi cisim oluşur?', visual: CUBE_NET_PLAIN },
    reflect: 'Bir açınıma bakarak cismi tahmin ederken hangi ipuçlarını kullandın?',
    tool: 'nets',
    tasks: [
      { prompt: 'Bu açınım katlanınca hangi cisim oluşur?', target: { solid: 'cube' }, hints: ['Kaç yüz var? Yüzlerin hepsi eş kare mi?'] },
      { prompt: 'Yüzlerine dikkat et: Bu açınım hangi cismin açınımıdır?', target: { solid: 'cuboid' }, hints: ['Karşılıklı yüzler eş dikdörtgenler mi?'] },
      { prompt: 'Üçgen ve dikdörtgen yüzlerden oluşan bu açınım hangi cismindir?', target: { solid: 'triangular-prism' } },
      { prompt: 'İki daire ve bir dikdörtgenden oluşan bu açınım hangi cismindir?', target: { solid: 'cylinder' }, explain: 'Dikdörtgen kıvrılınca silindirin yan yüzü olur; daireler alt ve üst yüzlerdir.' },
    ],
  },
  {
    id: 'g4-acinim-eslestir',
    outcomes: ['MAT.4.3.1'],
    type: 'match',
    stage: 'model',
    title: 'Cisim ve açınımı',
    instructions: 'Her cismi kendi açınımıyla eşleştir.',
    level: 2,
    launch: { text: 'Ambalaj tasarımcıları kutuları yapmadan önce düz kartona açınımlarını çizer. Her cismi kendi açınımıyla eşleştir.' },
    reflect: 'Silindirin açınımındaki dikdörtgen cismin neresinden gelir?',
    pairs: [
      { left: { visual: { kind: 'shape', shape: 'cube' } }, right: { visual: CUBE_NET_PLAIN } },
      { left: { visual: { kind: 'shape', shape: 'cuboid' } }, right: { visual: CUBOID_NET } },
      { left: { visual: { kind: 'shape', shape: 'triangular-prism' } }, right: { visual: PRISM_NET } },
      { left: { visual: { kind: 'shape', shape: 'cylinder' } }, right: { visual: CYL_NET } },
      { left: { visual: { kind: 'shape', shape: 'pyramid' } }, right: { visual: PYR_NET } },
      { left: { visual: { kind: 'shape', shape: 'cone' } }, right: { visual: CONE_NET } },
    ],
    perRound: 3,
  },
  {
    id: 'g4-kup-acinimi',
    outcomes: ['MAT.4.3.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Zihninde katla',
    instructions: 'Açınımı zihninde katla ve soruyu cevapla.',
    level: 3,
    launch: { text: 'Bir zar yapmak istiyoruz. Açınımda karşılıklı yüzler hangileri olacak? Zihninde katla!', visual: CUBE_NET },
    reflect: 'Bir açınımın küp oluşturup oluşturmayacağını nasıl test edersin?',
    questions: [
      { prompt: { text: 'Küp katlandığında 1 numaralı yüzün karşısına hangi yüz gelir?', visual: CUBE_NET }, choices: ['5', '3', '6', '2'], answer: 0, explain: '3 numaralı yüz taban olursa 1 ve 5 karşılıklı yan yüzler olur.', feedback: [null, '3, 1’e komşu: katlayınca kenar kenara gelirler.', '6, 3’ün karşısına gelir.', '2, 1’e komşu yüzlerden biri.'] },
      { prompt: { text: '3 numaralı yüzün karşısına hangi yüz gelir?', visual: CUBE_NET }, choices: ['1', '4', '6', '5'], answer: 2, feedback: ['1, 3’ün hemen üstünde; komşu yüz.', '4, 3’ün yanında; komşu yüz.', null, '5, 3’ün hemen altında; komşu yüz.'] },
      { prompt: { text: '2 numaralı yüzün karşısına hangi yüz gelir?', visual: CUBE_NET }, choices: ['6', '4', '1', '5'], answer: 1, feedback: ['6, katlanınca 2’ye komşu olur.', null, '1, 2’ye komşu olur.', '5, 2’ye komşu olur.'] },
      { prompt: { text: 'Bu açınım katlanınca küp olur mu?', visual: BAD_NET }, choices: ['Hayır, bazı yüzler üst üste biner.', 'Evet, 6 kare olduğu için küp olur.'], answer: 0, feedback: [null, '6 kare gerekli ama yeterli değil; kareler doğru yerde olmalı. 2 sıra 3 kare katlanınca kapalı bir kutu oluşmaz.'] },
      { prompt: 'Küpün açınımında kaç kare vardır?', choices: ['4', '8', '6', '12'], answer: 2, feedback: ['Küpün kaç yüzü var? Her yüz bir kare.', 'Küpün 8 köşesi var; yüz sayısı farklı.', null, '12, küpün ayrıt sayısı.'] },
      { prompt: 'Silindirin açınımında yan yüz hangi şekildir?', choices: ['Daire', 'Üçgen', 'Dikdörtgen'], answer: 2, feedback: ['Daireler silindirin alt ve üst yüzleridir.', 'Silindirde üçgen yüz yoktur.', null] },
      { prompt: 'Üçgen prizmanın açınımında kaç üçgen vardır?', choices: ['1', '3', '2', '5'], answer: 2, feedback: ['Üçgen prizmanın alt ve üst yüzü üçgendir.', '3 tane dikdörtgen yan yüzü var; üçgen sayısı farklı.', null, '5, toplam yüz sayısı.'] },
    ],
  },

  // MAT.4.3.2
  {
    id: 'g4-geometri-tahtasi',
    outcomes: ['MAT.4.3.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Geometri tahtasında şekiller',
    instructions: 'Çivilere dokunarak istenen şekli oluştur. Başladığın çiviye dönerek şekli kapat.',
    level: 2,
    launch: { text: 'Geometri tahtasında lastiklerle şekiller yapalım. Kenar sayısı ile köşe sayısı arasında bir ilişki var mı?' },
    reflect: 'Kare bir dikdörtgen midir? Geometri tahtasında oluşturduğun şekillerle açıkla.',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Bir üçgen oluştur. Kaç kenarı, kaç köşesi var?', target: { sides: 3 }, explain: 'Üçgenin 3 kenarı ve 3 köşesi vardır.' },
      { prompt: 'Bütün kenarları 3 birim olan bir kare oluştur.', target: { sides: 4, square: true, perimeter: 12 }, hints: ['Dört kenarın her biri kaç çivi aralığı olmalı?'] },
      { prompt: 'Karşılıklı kenarları 5 birim ve 2 birim olan bir dikdörtgen oluştur.', target: { sides: 4, rect: true, perimeter: 14, area: 10 } },
      { prompt: 'Köşeleri dik, karşılıklı kenarları eş olan herhangi bir dörtgen oluştur.', target: { sides: 4, rect: true }, explain: 'Bu bir dikdörtgendir. Bütün kenarları eşitse aynı zamanda karedir.' },
    ],
  },
  {
    id: 'g4-kenar-kose',
    outcomes: ['MAT.4.3.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Kenarlar ve köşeler',
    instructions: 'Üçgen, kare ve dikdörtgenin özelliklerini düşün.',
    level: 2,
    launch: { text: 'Etrafına bak: pencere, defter, trafik levhası… Bu şekilleri kenar ve köşe sayılarına, kenar uzunluklarına göre nasıl tanırız?' },
    reflect: 'Bir arkadaşına kareyi “dikdörtgen” sözcüğünü kullanarak nasıl tarif edersin?',
    questions: [
      { prompt: { text: 'Dikdörtgenin kaç kenarı ve kaç köşesi vardır?', visual: { kind: 'shape', shape: 'rectangle' } }, choices: ['3 kenar, 3 köşe', '4 kenar, 6 köşe', '4 kenar, 4 köşe'], answer: 2, feedback: ['Bu, üçgenin özelliği.', 'Köşeleri tekrar say: iki kenarın birleştiği her yer bir köşedir.', null] },
      { prompt: { text: 'Dikdörtgenin karşılıklı kenarları için hangisi doğrudur?', visual: { kind: 'shape', shape: 'rectangle' } }, choices: ['Karşılıklı kenarları eş uzunluktadır.', 'Bütün kenarları farklı uzunluktadır.', 'Hiçbir kenarı eş değildir.'], answer: 0, feedback: [null, 'Dikdörtgenin karşılıklı kenarlarını ölçersen eş olduklarını görürsün.', 'Karşılıklı kenarlar eştir.'] },
      { prompt: { text: 'Kareyi diğer dikdörtgenlerden ayıran özellik nedir?', visual: { kind: 'shape', shape: 'square' } }, choices: ['Köşe sayısı daha fazladır.', 'Köşeleri dik değildir.', 'Bütün kenarları eş uzunluktadır.'], answer: 2, feedback: ['Karenin de dikdörtgenin de 4 köşesi var.', 'Karenin köşeleri de diktir.', null] },
      { prompt: 'Hangisi doğrudur?', choices: ['Her dikdörtgen bir karedir.', 'Her kare bir dikdörtgendir.', 'Karenin köşe sayısı dikdörtgenden fazladır.'], answer: 1, feedback: ['Bütün kenarları eş olmayan dikdörtgenler kare değildir.', null, 'İkisinin de 4 köşesi var.'] },
      { prompt: { text: 'Bu üçgenin kenarları 4 cm, 4 cm ve 4 cm’dir. Hangi üçgendir?', visual: sideTri(4, 4, 4) }, choices: ['Çeşitkenar üçgen', 'Eşkenar üçgen', 'Kare'], answer: 1, feedback: ['Çeşitkenar üçgenin bütün kenarları farklıdır.', null, 'Karenin 4 kenarı var.'] },
      { prompt: { text: 'Bir üçgenin iki kenarı eş, üçüncü kenarı farklı uzunlukta. Bu hangi üçgendir?', visual: sideTri(4, 6, 6) }, choices: ['İkizkenar üçgen', 'Eşkenar üçgen', 'Çeşitkenar üçgen'], answer: 0, feedback: [null, 'Eşkenar üçgende üç kenar da eştir.', 'Çeşitkenar üçgende hiçbir kenar eş değildir.'] },
      { prompt: 'Bir üçgen, bir kare ve bir dikdörtgenin köşe sayılarının toplamı kaçtır?', choices: ['10', '12', '9', '11'], answer: 3, feedback: ['Üçgenin 3, karenin 4, dikdörtgenin 4 köşesi var; tekrar topla.', '12 için üç dörtgen olması gerekirdi.', '9, üç üçgen olurdu.', null] },
    ],
  },
  {
    id: 'g4-ucgen-cesitleri',
    outcomes: ['MAT.4.3.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Kenarlarına göre üçgenler',
    instructions: 'Kenar uzunluklarına bak ve her üçgeni kendi grubuna yerleştir.',
    level: 2,
    launch: { text: 'Üç çubukla üçgen yapıyoruz. Çubukların uzunlukları üçgene adını verir: hepsi mi eş, ikisi mi, hiçbiri mi?' },
    reflect: 'Her eşkenar üçgenin iki kenarı da eştir. Sence eşkenar üçgen aynı zamanda ikizkenar sayılabilir mi? Neden?',
    categories: [
      { id: 'eskenar', label: 'Eşkenar üçgen', color: '#22c55e' },
      { id: 'ikizkenar', label: 'İkizkenar üçgen', color: '#3b82f6' },
      { id: 'cesitkenar', label: 'Çeşitkenar üçgen', color: '#f97316' },
    ],
    items: [
      { content: '5 cm, 5 cm, 5 cm', category: 'eskenar', explain: 'Üç kenar da eş.' },
      { content: '8 cm, 8 cm, 8 cm', category: 'eskenar' },
      { content: '9 cm, 9 cm, 9 cm', category: 'eskenar' },
      { content: '6 cm, 6 cm, 4 cm', category: 'ikizkenar', explain: 'Yalnızca iki kenar eş (6 cm).' },
      { content: '7 cm, 3 cm, 7 cm', category: 'ikizkenar', explain: 'İki kenar eş (7 cm); sırası önemli değil.' },
      { content: '10 cm, 10 cm, 12 cm', category: 'ikizkenar' },
      { content: '3 cm, 4 cm, 5 cm', category: 'cesitkenar', explain: 'Hiçbir kenar eş değil.' },
      { content: '6 cm, 8 cm, 9 cm', category: 'cesitkenar' },
      { content: '5 cm, 7 cm, 10 cm', category: 'cesitkenar' },
    ],
  },
  {
    id: 'g4-sekil-farkli',
    outcomes: ['MAT.4.3.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Şekiller ve cisimler)',
    instructions: 'Hangisi diğerlerinden farklı? Kenar, köşe ve yüz özelliklerine bakarak gerekçeni oluştur.',
    level: 2,
    launch: { text: 'Dört şekil ya da cisim var. Hangisi farklı? Her biri için bir gerekçe bulunabilir.' },
    reflect: 'Seçtiğin gerekçe şeklin hangi özelliğine dayanıyordu: kenar mı, köşe mi, yüz mü?',
    questions: [
      {
        prompt: 'Hangisi farklı?',
        choices: [{ visual: { kind: 'shape', shape: 'square' } }, { visual: { kind: 'shape', shape: 'rectangle' } }, { visual: { kind: 'shape', shape: 'triangle' } }, { visual: { kind: 'shape', shape: 'circle' } }],
        answer: 3,
        reasons: ['Bütün kenarları eş olan tek dörtgen.', 'Karşılıklı kenarları eş ama bütün kenarları eş olmayan tek şekil.', 'Üç kenarı olan tek şekil.', 'Köşesi ve kenarı olmayan tek şekil.'],
      },
      {
        prompt: 'Hangisi farklı?',
        choices: [{ visual: { kind: 'shape', shape: 'cube' } }, { visual: { kind: 'shape', shape: 'cuboid' } }, { visual: { kind: 'shape', shape: 'cylinder' } }, { visual: { kind: 'shape', shape: 'pyramid' } }],
        answer: 2,
        reasons: ['Bütün yüzleri eş kare olan tek cisim.', 'Yüzleri karşılıklı eş dikdörtgenler olan, kare yüzü olmayan cisim.', 'Açınımında daire bulunan tek cisim.', 'Açınımında üçgen bulunan tek cisim.'],
      },
      { prompt: 'Hangisi farklı?', choices: ['5 cm, 5 cm, 5 cm', '5 cm, 5 cm, 8 cm', '3 cm, 4 cm, 5 cm', '6 cm, 6 cm, 6 cm'], answer: 2, reasons: ['Çevresi 15 cm olan tek üçgen.', 'İkizkenar olan tek üçgen.', 'Çeşitkenar olan tek üçgen.', 'Hiç 5 cm’lik kenarı olmayan tek üçgen.'] },
      { prompt: 'Hangisi farklı?', choices: ['Karenin köşe sayısı', 'Dikdörtgenin kenar sayısı', 'Üçgenin kenar sayısı', 'Küpün yüz sayısı'], answer: 2, reasons: ['Köşe sayısını soran tek seçenek.', 'Karşılıklı kenarları eş bir şeklin kenarlarını sayan tek seçenek.', 'Değeri 3 olan tek seçenek.', 'Bir cisimle ilgili olan tek seçenek; değeri 6.'] },
    ],
  },

  // MAT.4.3.3
  {
    id: 'g4-cevre-geometri-tahtasi',
    outcomes: ['MAT.4.3.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Çevresi belli şekiller',
    instructions: 'Geometri tahtasında istenen çevre uzunluğuna sahip şekli oluştur. Kenarları birim birim say.',
    level: 2,
    launch: { text: 'Bir bahçenin etrafına çit çekeceğiz. Ne kadar çit gerektiğini bulmak için bahçenin çevresini dolaşmalıyız.' },
    reflect: 'Çevre uzunluğu aynı olan iki farklı dikdörtgen yapabildin mi? Nasıl?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Çevre uzunluğu 12 birim olan bir kare oluştur.', target: { sides: 4, square: true, perimeter: 12 }, hints: ['Dört eş kenarın toplamı 12. Bir kenar kaç birim?'] },
      { prompt: 'Çevre uzunluğu 16 birim olan bir dikdörtgen oluştur.', target: { sides: 4, rect: true, perimeter: 16 }, hints: ['İki komşu kenarın toplamı kaç olmalı?'] },
      { prompt: 'Çevre uzunluğu 16 birim olan, öncekinden farklı bir dikdörtgen daha oluştur.', target: { sides: 4, rect: true, perimeter: 16 }, explain: 'Çevresi 16 birim olan farklı dikdörtgenler: 7 ve 1, 6 ve 2, 5 ve 3, 4 ve 4.' },
      { prompt: 'Çevre uzunluğu 10 birim olan bir dikdörtgen oluştur.', target: { sides: 4, rect: true, perimeter: 10 } },
    ],
  },
  {
    id: 'g4-cevre-hesapla',
    outcomes: ['MAT.4.3.3'],
    type: 'fill',
    stage: 'model',
    title: 'Ölç ve topla',
    instructions: 'Çevre uzunluğu, şeklin bütün kenar uzunluklarının toplamıdır. Görünmeyen kenarları düşün!',
    level: 2,
    launch: { text: 'Bir resim çerçevesinin etrafına kurdele saracağız. Kaç santimetre kurdele gerekir? Kenarları ölçüp toplayalım.', visual: sideRect(30, 20) },
    reflect: 'Dikdörtgenin çevresini bulmak için neden yalnızca iki kenarını ölçmek yeterli?',
    items: [
      { text: 'Üçgenin çevre uzunluğu __ cm', answers: ['21'], visual: sideTri(9, 5, 7) },
      { text: 'Karenin çevre uzunluğu __ cm', answers: ['24'], visual: sideRect(6, 6), hints: ['Karenin dört kenarı da eş. 6 cm’lik kenardan kaç tane var?'] },
      { text: 'Dikdörtgenin çevre uzunluğu __ cm', answers: ['22'], visual: sideRect(8, 3), hints: ['Karşılıklı kenarlar eş: hangi kenarların uzunluğu yazılmamış?'], explain: '8 + 3 + 8 + 3 = 22' },
      { text: 'Dikdörtgenin çevre uzunluğu __ birim', answers: ['16'], visual: { kind: 'area', w: 6, h: 2, showGrid: true }, hints: ['Kenarlardaki birimleri tek tek say; içteki kareleri değil.'] },
      { text: 'Eşkenar üçgenin çevre uzunluğu __ cm', answers: ['36'], visual: sideTri(12, 12, 12) },
      { text: 'İkizkenar üçgenin çevre uzunluğu __ cm', answers: ['18'], visual: sideTri(4, 7, 7) },
      { text: 'Kare şeklindeki bir bahçenin bir kenarı 15 m. Bahçenin etrafını bir kez çevirmek için __ m tel gerekir.', answers: ['60'], visual: sideRect(15, 15, 'm') },
      { text: 'Çevre uzunluğu 20 cm olan karenin bir kenarı __ cm', answers: ['5'], hints: ['4 eş kenarın toplamı 20.'] },
    ],
  },
  {
    id: 'g4-cevre-araclari',
    outcomes: ['MAT.4.3.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çevreyi neyle ölçeriz?',
    instructions: 'Çevre uzunluğunu ölçmek için doğru aracı ve yöntemi seç.',
    level: 1,
    launch: { text: 'Ölçme yaparken doğru aracı seçmek önemlidir. Defterini şerit metreyle, okul bahçesini 15 cm’lik cetvelle ölçmeye çalışsan ne olur?' },
    reflect: 'Bir şeklin çevresini ölçerken hangi hatalar yapılabilir? Nasıl önlersin?',
    questions: [
      { prompt: 'Defterinin çevre uzunluğunu ölçmek için hangi araç en uygundur?', choices: ['Terazi', 'Cetvel', 'Termometre', 'Saat'], answer: 1, feedback: ['Terazi kütle ölçer.', null, 'Termometre sıcaklık ölçer.', 'Saat zamanı ölçer.'] },
      { prompt: 'Okul bahçesinin çevre uzunluğunu ölçmek için hangisi daha uygundur?', choices: ['15 cm’lik cetvel', 'Açı ölçer', 'Şerit metre'], answer: 2, feedback: ['15 cm’lik cetvelle bahçeyi ölçmek çok uzun sürer ve hata artar.', 'Açı ölçer uzunluk ölçmez.', null] },
      { prompt: 'Bir üçgenin çevre uzunluğunu nasıl buluruz?', choices: ['Üç kenarının uzunluklarını toplarız.', 'Yalnızca en uzun kenarını ölçeriz.', 'Köşelerini sayarız.'], answer: 0, feedback: [null, 'Çevre bütün kenarların toplamıdır.', 'Köşe sayısı bir uzunluk değildir.'] },
      { prompt: 'Cetvelle ölçüm yaparken kenarın ucunu cetvelin hangi çizgisine getiririz?', choices: ['1 çizgisine', '0 çizgisine', 'Herhangi bir çizgiye'], answer: 1, feedback: ['1’den başlarsan ölçüm 1 cm fazla okunur.', null, 'Başlangıç 0 olmalı ki okunan sayı uzunluğu göstersin.'] },
      { prompt: 'Pergeli cetvelle birlikte nasıl kullanabiliriz?', choices: ['Pergelle ağırlık ölçeriz.', 'Pergelle saati okuruz.', 'Pergeli kenar uzunluğu kadar açar, açıklığı cetvelde okuruz.'], answer: 2, feedback: ['Pergel ağırlık ölçmez.', 'Pergelin saatle ilgisi yok.', null] },
      { prompt: 'Bir karenin bir kenarını 4 cm ölçtün. Çevre uzunluğunu bulmak için ne yapmalısın?', choices: ['4 + 4 + 4 + 4 işlemini yaparım.', 'Yalnızca 4 + 4 işlemini yaparım.', 'Karenin köşelerini sayarım.'], answer: 0, feedback: [null, 'Karenin 4 kenarı var; yalnızca ikisini topladın.', 'Köşeleri saymak uzunluk vermez.'] },
      { prompt: 'Ali bir masanın çevresini karışlarıyla 20 karış, öğretmeni 14 karış ölçtü. Sonuçlar neden farklı?', choices: ['Karışların uzunluğu farklı.', 'Masa küçüldü.', 'Biri yanlış saydı, başka sebep olamaz.'], answer: 0, feedback: [null, 'Masa aynı masa; değişen ölçü birimi.', 'İkisi de doğru saymış olabilir; karışlar farklı uzunlukta. Bu yüzden cetvel, metre gibi standart birimler kullanırız.'] },
    ],
  },

  // MAT.4.3.4
  {
    id: 'g4-alan-geometri-tahtasi',
    outcomes: ['MAT.4.3.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Alanı belli şekiller',
    instructions: 'Geometri tahtasında istenen alana sahip şekli oluştur. Şeklin içindeki birim kareleri say.',
    level: 2,
    launch: { text: 'Bir odanın tabanını kare halılarla kaplayacağız. Kaç halı gerekir? Alan, bir yüzeyi boşluk bırakmadan kaplayan birimlerin sayısıdır.' },
    reflect: 'Alanları aynı olan iki şeklin çevreleri de aynı olmak zorunda mı? Geometri tahtasındaki örneğinle açıkla.',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Alanı 6 birim kare olan bir dikdörtgen oluştur.', target: { sides: 4, rect: true, area: 6 }, hints: ['Kaç sıra, her sırada kaç kare olabilir?'] },
      { prompt: 'Alanı 4 birim kare olan bir kare oluştur.', target: { sides: 4, square: true, area: 4 } },
      { prompt: 'Alanı 8 birim kare olan herhangi bir şekil oluştur.', target: { area: 8 } },
      { prompt: 'Alanı 12 birim kare olan bir dikdörtgen oluştur. Çevresini de say.', target: { sides: 4, rect: true, area: 12 }, explain: '12 birim kare: 6 × 2 (çevre 16 birim) ya da 4 × 3 (çevre 14 birim). Alan aynı, çevreler farklı!' },
    ],
  },
  {
    id: 'g4-alan-say',
    outcomes: ['MAT.4.3.4'],
    type: 'fill',
    stage: 'model',
    title: 'Birimlerle alan',
    instructions: 'Şekli kaplayan birimleri say ya da tahmin et.',
    level: 1,
    launch: { text: 'Kareli kâğıtta çizilmiş bir şeklin alanını bulmak için kareleri sayabiliriz. Peki kareler tam değilse? Tam kareleri ve parçaları birleştirerek tahmin ederiz.', visual: CIRCLE_ON_GRID },
    reflect: 'Tam olmayan kareleri sayarken nasıl bir yol izledin?',
    items: [
      { text: 'Boyalı şeklin alanı __ birim kare', answers: ['12'], visual: { kind: 'grid', cols: 6, rows: 4, cells: ['1,0', '2,0', '1,1', '2,1', '1,2', '2,2', '3,2', '4,2', '1,3', '2,3', '3,3', '4,3'] } },
      { text: 'Dikdörtgen __ birim kare ile kaplanmıştır.', answers: ['15'], visual: { kind: 'area', w: 5, h: 3, showGrid: true }, hints: ['Kaç sıra var? Her sırada kaç kare var?'] },
      { text: 'Boyalı şeklin alanı __ birim kare', answers: ['9'], visual: { kind: 'grid', cols: 7, rows: 5, cells: ['3,0', '3,1', '3,2', '3,3', '3,4', '1,2', '2,2', '4,2', '5,2'] } },
      { text: 'Merdiven şeklinin alanı __ birim kare', answers: ['15'], visual: { kind: 'grid', cols: 6, rows: 5, cells: ['0,0', '0,1', '1,1', '0,2', '1,2', '2,2', '0,3', '1,3', '2,3', '3,3', '0,4', '1,4', '2,4', '3,4', '4,4'] } },
      { text: 'Daire yaklaşık __ birim kareyi kaplıyor.', answers: ['12|11|13|14'], visual: CIRCLE_ON_GRID, hints: ['Önce tam dolu kareleri say.', 'Yarıdan fazlası dolu kareleri bir tam gibi say; az dolu olanları sayma.'], explain: 'Ortadaki 4 kare tam dolu, kenarlardakiler parça parça: yaklaşık 12 birim kare.' },
      { text: 'Bir masa büyük defterlerle 6 defterde kaplandı. Küçük defter, büyük defterin yarısı kadar. Aynı masa __ küçük defterle kaplanır.', answers: ['12'], hints: ['Her büyük defterin yerine kaç küçük defter gerekir?'] },
      { text: 'Bir halıyı büyük kareler yerine daha küçük karelerle kaplarsak gereken kare sayısı __.', answers: ['artar'], choices: ['artar', 'azalır', 'değişmez'] },
    ],
  },
  {
    id: 'g4-alan-tahmini',
    outcomes: ['MAT.4.3.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alanı tahmin et',
    instructions: 'Standart olmayan birimlerle alanı tahmin et ve düşün.',
    level: 2,
    launch: { text: 'Sınıfının tabanını kaplamak için kaç gazete sayfası gerekir? Tam ölçmeden önce tahmin edelim, sonra kontrol edelim.' },
    reflect: 'Alan tahmininde hangi birimi seçmek işini kolaylaştırdı? Neden?',
    questions: [
      { prompt: 'Sınıfın tabanının alanını tahmin etmek için hangisi en uygun birimdir?', choices: ['Posta pulu', 'Gazete sayfası', 'Kum tanesi'], answer: 1, feedback: ['Pul çok küçük; binlerce pul saymak gerekir.', null, 'Kum tanesi çok çok küçük; sayamazsın.'] },
      { prompt: { text: 'Şekil yaklaşık kaç birim kareyi kaplıyor?', visual: { kind: 'grid', cols: 6, rows: 6, cells: ['2,0', '3,0', '1,1', '2,1', '3,1', '4,1', '0,2', '1,2', '2,2', '3,2', '4,2', '5,2', '0,3', '1,3', '2,3', '3,3', '4,3', '5,3', '1,4', '2,4', '3,4', '4,4', '2,5', '3,5'] } }, choices: ['Yaklaşık 12', 'Yaklaşık 24', 'Yaklaşık 36'], answer: 1, feedback: ['Bu, şeklin yalnızca yarısı kadar.', null, '36, bütün ızgaranın alanı; şekil köşeleri doldurmuyor.'] },
      { prompt: 'Ayşe masasını defterlerle 6, Can aynı masayı kitaplarla 4 birim olarak ölçtü. Sonuçlar neden farklı?', choices: ['Masalar farklıdır.', 'Kullanılan birimlerin büyüklükleri farklıdır.', 'Biri yanlış saymıştır.'], answer: 1, feedback: ['Aynı masayı ölçtüler.', null, 'İkisi de doğru saymış olabilir; birimler farklı.'] },
      { prompt: 'Elif bir şeklin alanını 20 birim kare tahmin etti, ölçünce 23 birim kare buldu. Tahmini için ne söylenebilir?', choices: ['Gerçek değere yakın, biraz eksik.', 'Gerçek değerden çok fazla.', 'Tam doğru.'], answer: 0, feedback: [null, '20, 23’ten küçük; fazla değil eksik.', '20 ile 23 eşit değil; ama tahmin için çok yakın.'] },
      { prompt: 'Alan ölçerken birimleri nasıl yerleştirmeliyiz?', choices: ['Aralarında boşluk bırakarak', 'Üst üste bindirerek', 'Boşluk bırakmadan ve üst üste bindirmeden'], answer: 2, feedback: ['Boşluk kalırsa alan eksik ölçülür.', 'Üst üste binerse aynı yer iki kez sayılır.', null] },
      { prompt: 'Birim büyüdükçe bir yüzeyi kaplamak için gereken birim sayısı nasıl değişir?', choices: ['Artar', 'Azalır', 'Değişmez'], answer: 1, feedback: ['Büyük birimlerden daha azı yeter.', null, 'Birim değişince sayı da değişir.'] },
      { prompt: { text: 'İki dikdörtgenin ikisi de 12 birim kareden oluşuyor. Hangisi doğrudur?', visual: rectsGrid([[6, 2], [4, 3]]) }, choices: ['Alanları eşit ama çevreleri farklı.', 'Alanları eşitse çevreleri de eşittir.', 'Uzun olanın alanı daha büyüktür.'], answer: 0, feedback: [null, '6 × 2’lik dikdörtgenin çevresi 16, 4 × 3’lüğün çevresi 14 birim. Alan aynıyken çevre değişebilir.', 'İkisi de 12 birim kare; uzun görünmek alanı büyütmez.'] },
    ],
  },

  // ── Nesnelerin Geometrisi (2) ───────────────────────────────────────────

  // MAT.4.3.5
  {
    id: 'g4-donme-miktari',
    outcomes: ['MAT.4.3.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Ne kadar döndü?',
    instructions: 'Hareketli kolu sürükleyerek istenen kadar döndür.',
    level: 2,
    launch: { text: 'Bir kapıyı açtığında kapı menteşe çevresinde döner. Ne kadar çok açarsan dönme miktarı o kadar büyür. İşte açı bir dönme miktarıdır!' },
    reflect: 'Kapının açılması ile saatin yelkovanının dönmesi arasında nasıl bir benzerlik var?',
    tool: 'angle',
    tasks: [
      { prompt: 'Kolu çeyrek tur döndür.', target: { degrees: 90 }, hints: ['Saatte yelkovan 12’den 3’e gidince çeyrek tur döner.'] },
      { prompt: 'Kolu yarım tur döndür.', target: { degrees: 180 }, explain: 'Yarım tur, iki çeyrek tur eder: kol dümdüz karşıya geçer.' },
      { prompt: 'Kolu çeyrek turun yarısı kadar döndür.', target: { degrees: 45 } },
      { prompt: 'Yelkovan 12’den 2’ye gelince ne kadar dönerse kolu o kadar döndür.', target: { degrees: 60 }, hints: ['12’den 3’e çeyrek tur. 12’den 2’ye bunun ne kadarı?'], explain: 'Çeyrek tur 3 eş parçaya bölünürse 12’den 2’ye 2 parça döner.' },
    ],
  },
  {
    id: 'g4-saat-acilari',
    outcomes: ['MAT.4.3.5'],
    type: 'match',
    stage: 'model',
    title: 'Saatteki açılar',
    instructions: 'Akrep ile yelkovanın oluşturduğu açıyı aynı büyüklükteki açıyla eşleştir.',
    level: 2,
    launch: { text: 'Saatin akrebi ile yelkovanı her an bir açı oluşturur. Saat 3’te çeyrek tur, saat 6’da yarım tur açılmış olurlar.', visual: { kind: 'clock', h: 3, m: 0 } },
    reflect: 'Saat 1’deki açı ile saat 11’deki açı aynı büyüklükte mi? Neden?',
    pairs: [
      { left: { visual: { kind: 'clock', h: 1, m: 0 } }, right: { visual: { kind: 'angle', degrees: 30 } } },
      { left: { visual: { kind: 'clock', h: 2, m: 0 } }, right: { visual: { kind: 'angle', degrees: 60 } } },
      { left: { visual: { kind: 'clock', h: 3, m: 0 } }, right: { visual: { kind: 'angle', degrees: 90 } } },
      { left: { visual: { kind: 'clock', h: 4, m: 0 } }, right: { visual: { kind: 'angle', degrees: 120 } } },
      { left: { visual: { kind: 'clock', h: 5, m: 0 } }, right: { visual: { kind: 'angle', degrees: 150 } } },
      { left: { visual: { kind: 'clock', h: 6, m: 0 } }, right: { visual: { kind: 'angle', degrees: 180 } } },
    ],
    perRound: 3,
  },
  {
    id: 'g4-aci-donme',
    outcomes: ['MAT.4.3.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Açı bir dönmedir',
    instructions: 'Günlük yaşamdaki dönmeleri düşün ve cevapla.',
    level: 1,
    launch: { text: 'Bir saat yelkovanı, bir kapı, bir pervane… Hepsi döner. Ne kadar döndüklerini nasıl anlatırız? Çeyrek tur, yarım tur, tam tur!' },
    reflect: 'Bir açının kolları uzadığında açı büyür mü? Bir arkadaşına örnekle açıkla.',
    questions: [
      { prompt: '🚪 Kapı açılırken hangi kısmı sabit kalır ve açının köşesi olur?', choices: ['Kapı kolu', 'Menteşe tarafı', 'Kapının üst kenarı'], answer: 1, feedback: ['Kapı kolu kapıyla birlikte döner; sabit kalmaz.', null, 'Üst kenar da kapıyla birlikte döner.'] },
      { prompt: 'Bir açının kollarını uzatırsak açının büyüklüğü ne olur?', choices: ['Büyür', 'Küçülür', 'Değişmez'], answer: 2, explain: 'Açı, kolların uzunluğuna değil dönme miktarına bağlıdır.', feedback: ['Kolları uzatmak dönme miktarını değiştirmez.', 'Kolları uzatmak dönme miktarını değiştirmez.', null] },
      { prompt: '🕒 Yelkovan 12’den 3’e gelince ne kadar döner?', choices: ['Çeyrek tur', 'Yarım tur', 'Tam tur'], answer: 0, feedback: [null, 'Yarım tur 12’den 6’ya gitmektir.', 'Tam tur 12’den yine 12’ye dönmektir.'] },
      { prompt: '🕕 Yelkovan 12’den 6’ya gelince ne kadar döner?', choices: ['Çeyrek tur', 'Yarım tur', 'Tam tur'], answer: 1, feedback: ['Çeyrek tur 12’den 3’e gitmektir.', null, 'Tam tur 12’den yine 12’ye dönmektir.'] },
      { prompt: 'Hangisinde bir açı oluşur?', choices: ['Gergin, düz bir ip', 'Bir topun yüzeyi', '✂️ Açılmış bir makasın iki ağzı'], answer: 2, feedback: ['Düz ipte dönme ya da köşe yok.', 'Topun yüzeyinde köşe yok.', null] },
      { prompt: 'Kapı daha çok açıldıkça oluşan açı nasıl değişir?', choices: ['Büyür', 'Küçülür', 'Değişmez'], answer: 0, feedback: [null, 'Kapı daha çok döndükçe açı büyür.', 'Dönme miktarı arttı; açı da değişir.'] },
      { prompt: 'Ali yanında duran kolunu dümdüz başının üstüne kaldırdı. Kolu ne kadar döndü?', choices: ['Çeyrek tur', 'Yarım tur', 'Tam tur'], answer: 1, feedback: ['Kol yana kaldırılınca çeyrek tur döner; başın üstüne kadar bunun iki katı.', null, 'Tam tur, kolun yine aşağıya dönmesidir.'] },
      { prompt: '🍕 Büyük bir pizzadan ve küçük bir pizzadan aynı şekilde kesilmiş birer dilim var. Dilimlerin uçlarındaki açılar için ne söylenebilir?', choices: ['Eşittir; açı kolların uzunluğuna bağlı değildir.', 'Büyük pizzanın dilim açısı daha büyüktür.'], answer: 0, feedback: [null, 'Büyük pizzanın dilimi daha uzun ama dönme miktarı aynı.'] },
    ],
  },

  // MAT.4.3.6
  {
    id: 'g4-dilimle-ac',
    outcomes: ['MAT.4.3.6'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Dilimlerle açı',
    instructions: 'Bir dilim, saatte iki rakam arasındaki açı kadardır. Kolu istenen sayıda dilim kadar aç.',
    level: 2,
    launch: { text: 'Kâğıttan kesilmiş eş dilimlerle açıları ölçebiliriz. Bir dilim, saatte iki rakam arasındaki açı kadar olsun. Açı kaç dilim kaplıyor?', visual: WEDGE_90_3 },
    reflect: 'Herkes kendi dilimini kullansaydı ölçüm sonuçları neden farklı çıkardı?',
    tool: 'angle',
    tasks: [
      { prompt: 'Kolu 2 dilim kadar aç (saatte 12’den 2’ye).', target: { degrees: 60 }, hints: ['Saat kadranında iki rakam arası bir dilimdir.'] },
      { prompt: 'Kolu 3 dilim kadar aç.', target: { degrees: 90 }, explain: '3 dilim = çeyrek tur.' },
      { prompt: 'Kolu 4 dilim kadar aç.', target: { degrees: 120 } },
      { prompt: 'Kolu 5 dilim kadar aç.', target: { degrees: 150 }, explain: '5 dilim, çeyrek turdan 2 dilim fazla.' },
    ],
  },
  {
    id: 'g4-aci-birimleri',
    outcomes: ['MAT.4.3.6'],
    type: 'quiz',
    stage: 'model',
    title: 'Açıyı dilimlerle ölç',
    instructions: 'Açıları eş dilimlerle ölç ve sonuçları karşılaştır.',
    level: 2,
    launch: { text: 'Ayşe ve Can aynı açıyı ölçtü ama farklı sonuçlar buldu. Biri hatalı mı, yoksa başka bir sebep mi var?' },
    reflect: 'Herkesin aynı sonucu bulması için ne yapmalıyız? Standart bir ölçme aracı neden gerekli?',
    questions: [
      { prompt: { text: 'Bu açı kaç eş dilim kadardır?', visual: WEDGE_60_4 }, choices: ['3', '4', '5', '6'], answer: 1, feedback: ['Dilimleri tek tek say; renkler sırayla değişiyor.', null, 'Bir dilimi iki kez saymış olabilir misin?', '6 dilim için açının daha geniş olması gerekirdi.'] },
      { prompt: { text: 'Bu açı büyük dilimlerle ölçüldü. Kaç dilim kadardır?', visual: WEDGE_90_3 }, choices: ['2', '4', '3', '6'], answer: 2, feedback: ['Bir dilimi atladın.', '4 büyük dilim çeyrek turdan fazla olur.', null, 'Küçük dilimlerle karıştırdın.'] },
      { prompt: { text: 'Aynı açı bu kez küçük dilimlerle ölçüldü. Kaç dilim kadardır?', visual: WEDGE_90_6 }, choices: ['6', '3', '5', '8'], answer: 0, feedback: [null, '3, aynı açının büyük dilimlerle ölçüsüdür.', 'Dilimleri tekrar say.', '8 dilim bu açıya sığmaz.'] },
      { prompt: 'Ayşe aynı açıyı büyük dilimlerle 3, Can küçük dilimlerle 6 buldu. Bu durum neyi gösterir?', choices: ['Açı ölçülürken değişmiştir.', 'Can yanlış saymıştır.', 'Herkesin aynı birimi kullanması gerekir.'], answer: 2, feedback: ['Açı aynı açı; birimler farklı.', 'İkisi de doğru saydı; Can’ın dilimleri daha küçük.', null] },
      { prompt: 'Bir açıyı daha küçük dilimlerle ölçünce dilim sayısı nasıl değişir?', choices: ['Artar', 'Azalır', 'Değişmez'], answer: 0, feedback: [null, 'Dilim küçüldükçe aynı açıya daha çok dilim sığar.', 'Birim değişince sayı da değişir; açı ise aynı kalır.'] },
      { prompt: 'Herkesin aynı sonucu bulması için açıları hangi araçla ölçeriz?', choices: ['Cetvel', 'Açı ölçer', 'Terazi', 'Termometre'], answer: 1, feedback: ['Cetvel uzunluk ölçer.', null, 'Terazi kütle ölçer.', 'Termometre sıcaklık ölçer.'] },
    ],
  },
  {
    id: 'g4-standart-olcme',
    outcomes: ['MAT.4.3.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Standart mı, değil mi?',
    instructions: 'Açı ölçmede kullanılabilecek araç ve birimleri grupla.',
    level: 1,
    launch: { text: 'Açı ölçmek için kullanabileceğimiz araçları ikiye ayıralım: herkesin aynı sonucu bulduğu araçlar ve kişiden kişiye değişen birimler.' },
    reflect: 'Parmak açıklığıyla açı ölçmenin iyi ve kötü yanları neler?',
    categories: [
      { id: 'standart', label: 'Standart ölçme aracı', color: '#22c55e' },
      { id: 'degil', label: 'Standart olmayan birim', color: '#f97316' },
    ],
    items: [
      { content: '📐 Açı ölçer', category: 'standart' },
      { content: '📐 Gönye', category: 'standart', explain: 'Gönyenin köşesi herkes için aynı dik açıyı gösterir.' },
      { content: '📱 Dijital açı ölçer', category: 'standart' },
      { content: '🍕 Pizza dilimi', category: 'degil', explain: 'Her pizza farklı sayıda dilime bölünebilir; dilimler kişiden kişiye değişir.' },
      { content: '📄 Kâğıttan kesilmiş eş dilimler', category: 'degil' },
      { content: '✋ Parmak açıklığı', category: 'degil', explain: 'Herkesin parmak açıklığı farklıdır.' },
      { content: '🍊 Portakal dilimi', category: 'degil' },
    ],
  },

  // MAT.4.3.7
  {
    id: 'g4-aci-olustur',
    outcomes: ['MAT.4.3.7'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Dik açıya göre oluştur',
    instructions: 'Hareketli kolu sürükleyerek istenen açıyı oluştur. Dik açıyı ölçüt al.',
    level: 2,
    launch: { text: 'Bir kitabın köşesi dik açıya güzel bir örnektir. Kitabın köşesini bir açının üzerine koyarak açının dik açıdan küçük mü, büyük mü olduğunu anlayabiliriz.', visual: { kind: 'angle', degrees: 90 } },
    reflect: 'Bir açının dar mı, geniş mi olduğunu ölçmeden nasıl anlarsın?',
    tool: 'angle',
    tasks: [
      { prompt: 'Bir dik açı oluştur (çeyrek tur).', target: { degrees: 90 } },
      { prompt: 'Dik açıdan küçük bir açı oluştur: dik açının yarısı kadar.', target: { degrees: 45 }, explain: 'Dik açıdan küçük açılar dar açıdır.' },
      { prompt: 'Dik açıdan büyük bir açı oluştur: bir dik açı ve yarım dik açı kadar.', target: { degrees: 135 }, explain: 'Dik açıdan büyük açılar geniş açıdır.' },
      { prompt: 'Saat 4’te akrep ile yelkovan arasındaki açıyı oluştur. Bu açı dar mı, geniş mi?', target: { degrees: 120 }, hints: ['Saatte iki rakam arası bir dilim. 12’den 4’e kaç dilim var?'], explain: '4 dilim, dik açıdan (3 dilim) büyüktür: geniş açı.' },
    ],
  },
  {
    id: 'g4-acilari-grupla',
    outcomes: ['MAT.4.3.7'],
    type: 'categorize',
    stage: 'model',
    title: 'Açıları grupla',
    instructions: 'Her açıyı dik açıyla karşılaştır ve grubuna yerleştir.',
    level: 2,
    launch: { text: 'Etrafımızda pek çok açı var: makasın ağzı, saatin kolları, kitabın köşesi. Hepsini dik açıyla karşılaştırarak gruplayalım.' },
    reflect: 'Saat kaçta akrep ile yelkovan dik açı oluşturur? Başka bir saat bulabilir misin?',
    categories: [
      { id: 'dar', label: 'Dar açı', color: '#22c55e' },
      { id: 'dik', label: 'Dik açı', color: '#3b82f6' },
      { id: 'genis', label: 'Geniş açı', color: '#f97316' },
    ],
    items: [
      { content: { visual: { kind: 'angle', degrees: 35 } }, category: 'dar' },
      { content: { visual: { kind: 'angle', degrees: 70 } }, category: 'dar', explain: 'Dik açıya yakın ama ondan küçük: dar açı.' },
      { content: { visual: { kind: 'angle', degrees: 90 } }, category: 'dik' },
      { content: { visual: { kind: 'angle', degrees: 120 } }, category: 'genis' },
      { content: { visual: { kind: 'angle', degrees: 160 } }, category: 'genis' },
      { content: '🕐 Saat 1.00’de akrep ile yelkovan', category: 'dar', explain: '1 dilim: dik açının (3 dilim) üçte biri.' },
      { content: '🕒 Saat 3.00’te akrep ile yelkovan', category: 'dik' },
      { content: '📘 Kitabın köşesi', category: 'dik' },
      { content: '🕓 Saat 4.00’te akrep ile yelkovan', category: 'genis', explain: '4 dilim, dik açıdan 1 dilim fazla.' },
      { content: '✂️ Az açılmış makasın ağzı', category: 'dar' },
    ],
  },
  {
    id: 'g4-aci-turu',
    outcomes: ['MAT.4.3.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Dar mı, dik mi, geniş mi?',
    instructions: 'Dik açıyı ölçüt al: Ondan küçükse dar, büyükse geniş açıdır.',
    level: 1,
    launch: { text: 'Gözünü eğit! Her açıya bak ve kafandaki dik açıyla karşılaştır.' },
    reflect: 'Dik açıya çok yakın bir açıda karar vermek zor muydu? O zaman ne yapardın?',
    generator: { id: 'angleType', params: { straight: false }, count: 8 },
  },
  {
    id: 'g4-aci-farkli',
    outcomes: ['MAT.4.3.7'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Açılar)',
    instructions: 'Hangisi diğerlerinden farklı? Açıları dönme miktarıyla, dik açıyla ya da günlük yaşamla düşün.',
    level: 2,
    launch: { text: 'Hangisi farklı? Her seçeneğin bir gerekçesi var. Sen hangisini seçip nasıl savunursun?' },
    reflect: 'Arkadaşınla farklı seçenekler seçtiyseniz gerekçelerinizi karşılaştırın. İkiniz de haklı olabilir misiniz?',
    questions: [
      {
        prompt: 'Hangisi farklı?',
        choices: [{ visual: { kind: 'angle', degrees: 30 } }, { visual: { kind: 'angle', degrees: 90 } }, { visual: { kind: 'angle', degrees: 120 } }, { visual: { kind: 'clock', h: 2, m: 0 } }],
        answer: 2,
        reasons: ['En dar açı.', 'Tek dik açı.', 'Dik açıdan büyük olan tek açı: geniş açı.', 'Saat üzerinde, günlük yaşamdan gösterilen tek açı.'],
      },
      { prompt: 'Hangisi farklı?', choices: ['Çeyrek tur', 'Yarım tur', 'Saat 3’te akrep ile yelkovan', 'Kitabın köşesi'], answer: 1, reasons: ['Dönme miktarıyla anlatılan dik açı.', 'Dik açı olmayan tek seçenek: iki dik açı kadar.', 'Saat üzerinde gösterilen tek seçenek.', 'Dönmeyen, sabit bir nesnedeki tek açı.'] },
      { prompt: 'Hangisi farklı?', choices: ['Az açılmış makas', 'Saat 1’de akrep ile yelkovan', 'Çeyrek turun yarısı', 'Saat 5’te akrep ile yelkovan'], answer: 3, reasons: ['Bir araç üzerinde oluşan tek açı.', 'Yalnızca 1 dilim kadar olan, en küçük açı.', 'Dönme miktarıyla anlatılan tek açı.', 'Geniş açı olan tek seçenek.'] },
      {
        prompt: 'Hangisi farklı?',
        choices: [{ visual: { kind: 'angle', degrees: 45 } }, { visual: { kind: 'angle', degrees: 60 } }, { visual: { kind: 'angle', degrees: 80 } }, { visual: { kind: 'angle', degrees: 100 } }],
        answer: 3,
        reasons: ['Dik açının tam yarısı olan açı.', 'Saatte 2 dilime eşit olan açı.', 'Dik açıya en yakın dar açı.', 'Dik açıdan büyük olan tek açı.'],
      },
    ],
  },

  // ── Nesnelerin Geometrisi (3) ───────────────────────────────────────────

  // MAT.4.3.8
  {
    id: 'g4-ayna-simetrisi',
    outcomes: ['MAT.4.3.8'],
    type: 'quiz',
    stage: 'model',
    title: 'Aynadaki görüntü',
    instructions: 'Aynayı bir doğru gibi düşün ve soruları cevapla.',
    level: 2,
    launch: { text: 'Aynanın karşısına geç ve sağ elini kaldır. Aynadaki sen hangi elini kaldırıyor? Ayna yerine bir çizgi çizersek ne olur?' },
    reflect: 'Ayna görüntüsü ile doğruya göre simetri arasındaki benzerliği bir arkadaşına nasıl anlatırsın?',
    questions: [
      {
        prompt: { text: 'Ayna kırmızı çizginin yerinde. Şekil ve aynadaki görüntüsü birlikte hangi çizimde doğru gösterilmiş?', visual: { kind: 'grid', cols: 8, rows: 4, cells: SYM_L, axis: 'v' } },
        choices: [
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: [...SYM_L, '5,0', '5,1', '5,2', '6,2'], axis: 'v' } },
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: [...SYM_L, '6,0', '6,1', '6,2', '5,2'], axis: 'v' } },
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: [...SYM_L, '6,1', '6,2', '6,3', '5,1'], axis: 'v' } },
        ],
        answer: 1,
        explain: 'Görüntü, şeklin ters yüz edilmiş hâlidir ve doğruya aynı uzaklıktadır.',
        feedback: ['Bu, şeklin kaydırılmış hâli; ayna görüntüsü ters yüz olur.', null, 'Görüntü yukarı ya da aşağı kaymamalı; her kare aynı satırda kalır.'],
      },
      { prompt: 'Aynaya bitişik duran bir nesnenin görüntüsü için hangisi doğrudur?', choices: ['Görüntü aynadan uzaktadır.', 'Görüntü de aynaya bitişiktir.', 'Görüntü oluşmaz.'], answer: 1, feedback: ['Nesne aynaya bitişikse görüntüsü de aynaya bitişiktir.', null, 'Aynanın önündeki her nesnenin görüntüsü oluşur.'] },
      { prompt: 'Bir nesne aynadan 3 adım uzaklaşırsa görüntüsüne ne olur?', choices: ['Aynadan 3 adım uzaklaşır.', 'Yerinde kalır.', 'Aynaya yaklaşır.'], answer: 0, feedback: [null, 'Nesne hareket edince görüntüsü de hareket eder.', 'Nesne uzaklaşırsa görüntüsü de uzaklaşır.'] },
      { prompt: '“b” harfinin yanına dik tutulan bir aynadaki görüntüsü hangi harfe benzer?', choices: ['p', 'd', 'q', 'b'], answer: 1, feedback: ['p, b’nin baş aşağı çevrilmiş hâline benzer; yan aynada sağ ile sol yer değiştirir.', null, 'q için hem sağ-sol hem alt-üst değişmeli.', 'Ayna görüntüsü ters yüz olur; b aynı kalmaz.'] },
      { prompt: 'Bir şekil ile simetri doğrusuna göre görüntüsü için hangisi doğrudur?', choices: ['Görüntü daha büyüktür.', 'Görüntü daha küçüktür.', 'Eştirler, yalnızca yönleri terstir.'], answer: 2, feedback: ['Ayna görüntüsü büyümez.', 'Ayna görüntüsü küçülmez.', null] },
      { prompt: 'Bir kâğıdı ikiye katlayıp kestiğimizde açınca görünen kat izi neyi gösterir?', choices: ['Simetri doğrusunu', 'Çevre uzunluğunu', 'Alanı'], answer: 0, feedback: [null, 'Çevre uzunluğu kenarların toplamıdır.', 'Alan kaplanan yüzeydir.'] },
    ],
  },
  {
    id: 'g4-simetri-dogrusu-var-mi',
    outcomes: ['MAT.4.3.8'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Simetri doğrusu var mı?',
    instructions: 'Harfin dikey ya da yatay bir simetri doğrusu varsa “var” grubuna koy.',
    level: 1,
    launch: { text: 'Bir kâğıda büyük bir harf yazıp ortasından katlarsak iki yarısı üst üste gelir mi? Gelirse kat izi bir simetri doğrusudur.' },
    reflect: 'Hem dikey hem yatay simetri doğrusu olan bir harf bulabilir misin?',
    categories: [
      { id: 'var', label: 'Simetri doğrusu var', color: '#22c55e' },
      { id: 'yok', label: 'Simetri doğrusu yok', color: '#ef4444' },
    ],
    items: [
      { content: 'A', category: 'var', explain: 'Dikey bir doğruyla katlanınca iki yarısı üst üste gelir.' },
      { content: 'H', category: 'var' },
      { content: 'M', category: 'var' },
      { content: 'T', category: 'var' },
      { content: 'B', category: 'var', explain: 'Yatay bir doğruyla katlanınca üst ve alt yarısı üst üste gelir.' },
      { content: 'F', category: 'yok' },
      { content: 'G', category: 'yok' },
      { content: 'L', category: 'yok', explain: 'Hangi yönden katlarsan katla iki yarısı üst üste gelmez.' },
      { content: 'P', category: 'yok' },
      { content: 'R', category: 'yok' },
    ],
  },
  {
    id: 'g4-simetri-farkli',
    outcomes: ['MAT.4.3.8'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Simetri)',
    instructions: 'Hangisi diğerlerinden farklı? Simetri doğrularına ve görüntülere bakarak gerekçeni oluştur.',
    level: 2,
    launch: { text: 'Hangisi farklı? Simetri doğrularına, aynaya ve günlük yaşama bakarak gerekçeni oluştur.' },
    reflect: 'Bir şeklin simetrik olup olmadığını anlamak için hangi testi yapıyorsun?',
    questions: [
      { prompt: 'Hangisi farklı?', choices: ['A', 'H', 'B', 'N'], answer: 3, reasons: ['Yalnızca dikey simetri doğrusu olan harf.', 'Hem dikey hem yatay simetri doğrusu olan tek harf.', 'Yalnızca yatay simetri doğrusu olan harf.', 'Hiç simetri doğrusu olmayan tek harf.'] },
      {
        prompt: 'Kırmızı çizgi simetri doğrusu. Hangisi farklı?',
        choices: [
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: ['3,1', '3,2', '2,2', '4,1', '4,2', '5,2'], axis: 'v' } },
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: ['1,0', '1,1', '2,1', '6,0', '6,1', '5,1'], axis: 'v' } },
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: ['1,1', '1,2', '2,2', '5,1', '5,2', '6,2'], axis: 'v' } },
          { visual: { kind: 'grid', cols: 8, rows: 4, cells: ['2,1', '3,1', '2,2', '3,2', '4,1', '5,1', '4,2', '5,2'], axis: 'v' } },
        ],
        answer: 2,
        reasons: ['Şekil ile görüntüsünün çizgide birleşip ters bir “T” oluşturduğu çizim.', 'Şeklin çizgiden 1 birim uzakta olduğu, doğru çizilmiş simetri.', 'Görüntünün ters yüz edilmeden yalnızca kaydırıldığı tek çizim: bu bir simetri değil.', 'Şekil ile görüntüsü birleşince tek bir dikdörtgen olan çizim.'],
      },
      { prompt: 'Hangisi farklı?', choices: ['🦋 Kelebeğin kanatları', '🪞 Aynadaki yüzün', '👣 Yürürken bıraktığın ayak izleri', '✂️ Katlanıp kesilmiş kâğıt'], answer: 2, reasons: ['Doğada kendiliğinden oluşan simetri örneği.', 'Bir yansımayla oluşan tek örnek; görüntü gerçek bir nesne değil.', 'Sağ ve sol izler kayarak ilerlediği için tam bir doğruya göre simetri olmayan tek örnek.', 'İnsanın katlayarak oluşturduğu tek örnek; kat izi simetri doğrusudur.'] },
    ],
  },

  // MAT.4.3.9
  {
    id: 'g4-simetriyi-tamamla',
    outcomes: ['MAT.4.3.9'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Simetriyi tamamla',
    instructions: 'Kırmızı çizgi simetri doğrusudur. Kareleri boyayarak şeklin diğer yarısını çiz.',
    level: 2,
    launch: { text: 'Bir kelebeğin yalnızca bir kanadı çizilmiş. Diğer kanadı nasıl çizeriz? Her karenin simetri doğrusuna uzaklığı korunmalı.' },
    reflect: 'Simetriyi tamamlarken en çok neye dikkat ettin? Hangi kareler en zordu?',
    tool: 'symmetry',
    config: { size: 10 },
    tasks: [
      { prompt: 'Kalbin diğer yarısını çiz.', target: { cells: ['2,1', '3,1', '1,2', '2,2', '3,2', '4,2', '1,3', '2,3', '3,3', '4,3', '2,4', '3,4', '4,4', '3,5', '4,5', '4,6'], axis: 'v' }, hints: ['Her karenin çizgiye kaç kare uzaklıkta olduğunu say; görüntüsü diğer tarafta aynı uzaklıkta olmalı.'] },
      { prompt: 'Okun diğer yarısını çiz.', target: { cells: ['4,1', '3,2', '4,2', '2,3', '3,3', '4,3', '4,4', '4,5', '4,6', '4,7'], axis: 'v' } },
      { prompt: 'Evin diğer yarısını çiz.', target: { cells: ['4,1', '3,2', '4,2', '2,3', '3,3', '4,3', '2,4', '2,5', '2,6', '2,7', '3,7', '4,7', '4,4'], axis: 'v' } },
      { prompt: 'Yatay simetri doğrusuna göre ağacın alt yarısını çiz.', target: { cells: ['4,1', '5,1', '3,2', '4,2', '5,2', '6,2', '2,3', '3,3', '4,3', '5,3', '6,3', '7,3', '4,4', '5,4'], axis: 'h' }, hints: ['Bu kez çizgi yatay: her karenin görüntüsü aynı sütunda, çizginin altında olur.'] },
    ],
  },
  {
    id: 'g4-simetri-uzaklik',
    outcomes: ['MAT.4.3.9'],
    type: 'fill',
    stage: 'model',
    title: 'Simetri doğrusuna uzaklık',
    instructions: 'Şekil ile görüntüsü simetri doğrusuna eşit uzaklıktadır. Kareleri sayarak boşlukları doldur.',
    level: 2,
    launch: { text: 'Bir nesne aynadan 3 adım uzaktaysa görüntüsü de aynanın arkasında 3 adım uzakta görünür. Kareli kâğıtta da aynısı geçerli.' },
    reflect: 'Bir karenin görüntüsünü bulmak için kaç kare sayman gerektiğini nasıl belirliyorsun?',
    items: [
      { text: 'Boyalı kare ile kırmızı çizgi arasında __ boş kare var. Görüntüsü ile çizgi arasında da __ boş kare olur.', answers: ['2', '2'], visual: { kind: 'grid', cols: 8, rows: 3, cells: ['1,1'], axis: 'v' } },
      { text: 'Bir nokta dikey simetri doğrusunun 3 birim solunda. Görüntüsü doğrunun __ birim sağındadır.', answers: ['3'] },
      { text: 'Bir şekil simetri doğrusuna bitişik. Görüntüsü doğruya __ birim uzaklıktadır.', answers: ['0'] },
      { text: 'A noktası ile görüntüsü arasındaki uzaklık 10 birim. A noktası simetri doğrusuna __ birim uzaklıktadır.', answers: ['5'], hints: ['Simetri doğrusu, nokta ile görüntüsünün tam ortasındadır.'] },
      { text: 'Şekil simetri doğrusuna göre tamamlanınca __ birim kare olur.', answers: ['12'], visual: { kind: 'grid', cols: 8, rows: 4, cells: ['2,0', '3,0', '3,1', '3,2', '1,2', '2,2'], axis: 'v' } },
      { text: 'Simetrik bir şeklin bir yarısı 7 birim kareden oluşuyor. Şeklin tamamı __ birim karedir.', answers: ['14'] },
    ],
  },
  {
    id: 'g4-simetri-hata',
    outcomes: ['MAT.4.3.9'],
    type: 'quiz',
    stage: 'problem',
    title: 'Simetri dedektifi',
    instructions: 'Çizimleri incele. Doğru mu, hatalı mı? Hata nerede?',
    level: 3,
    launch: { text: 'Arkadaşların simetri çizimleri yaptı ama bazılarında bir şeyler ters gitti. Hatayı bulup düzeltmelerine yardım eder misin?' },
    reflect: 'Simetri çizerken en sık yapılan hata sence hangisi? Nasıl önlenir?',
    questions: [
      { prompt: { text: 'Can soldaki şeklin simetriğini sağa çizdi. Hatası ne?', visual: { kind: 'grid', cols: 8, rows: 4, cells: ['1,1', '1,2', '2,2', '5,1', '5,2', '6,2'], axis: 'v' } }, choices: ['Şekli ters çevirmeden kaydırdı.', 'Hata yok, doğru çizdi.', 'Şekli büyüttü.'], answer: 0, feedback: [null, 'Ayna görüntüsünde şeklin çizgiye yakın kısmı yine çizgiye yakın olmalıydı; Can şekli yalnızca kaydırdı.', 'Kare sayısı aynı: 3 kare. Büyütme yok.'] },
      { prompt: { text: 'Elif tek bir karenin simetriğini çizdi. Hatası ne?', visual: { kind: 'grid', cols: 8, rows: 3, cells: ['2,1', '6,1'], axis: 'v' } }, choices: ['Görüntüyü çizgiye fazla uzak çizdi.', 'Hata yok, doğru çizdi.', 'Görüntüyü çizgiye fazla yakın çizdi.'], answer: 0, feedback: [null, 'Soldaki kare ile çizgi arasında 1 boş kare var; sağda ise 2 boş kare var.', 'Görüntü çizgiye yakın değil, uzak.'] },
      { prompt: { text: 'Mert’in çiziminde hata ne?', visual: { kind: 'grid', cols: 8, rows: 4, cells: ['1,0', '2,0', '5,1', '6,1'], axis: 'v' } }, choices: ['Görüntüyü bir satır aşağı kaydırdı.', 'Hata yok, doğru çizdi.', 'Görüntüyü çizgiye bitişik çizdi.'], answer: 0, feedback: [null, 'Görüntü şekille aynı satırda olmalı.', 'Görüntü çizgiye bitişik değil; ama satırı değişmiş.'] },
      {
        prompt: { text: 'Kırmızı çizgi yatay simetri doğrusu. Şekil ve görüntüsü hangi çizimde doğru?', visual: { kind: 'grid', cols: 6, rows: 6, cells: ['2,0', '3,0', '2,1'], axis: 'h' } },
        choices: [
          { visual: { kind: 'grid', cols: 6, rows: 6, cells: ['2,0', '3,0', '2,1', '2,5', '3,5', '2,4'], axis: 'h' } },
          { visual: { kind: 'grid', cols: 6, rows: 6, cells: ['2,0', '3,0', '2,1', '2,4', '3,4', '2,5'], axis: 'h' } },
          { visual: { kind: 'grid', cols: 6, rows: 6, cells: ['2,0', '3,0', '2,1', '3,5', '2,5', '3,4'], axis: 'h' } },
        ],
        answer: 0,
        feedback: [null, 'Şekil yalnızca aşağı kaydırılmış; ayna görüntüsü ters yüz olur.', 'Görüntü sağ-sol da çevrilmiş; yatay doğruya göre simetride kareler aynı sütunda kalır.'],
      },
      { prompt: 'Bir şekil simetri doğrusuna bitişikse görüntüsü nerede olur?', choices: ['Doğruya bitişik', 'Doğrudan 1 birim uzakta', 'Doğrunun üzerinde, şeklin içinde'], answer: 0, feedback: [null, 'Uzaklık korunur: şekil bitişikse görüntü de bitişiktir.', 'Görüntü doğrunun diğer tarafında olur.'] },
      { prompt: 'Simetrik bir şeklin bir yarısı 9 birim kare. Bütün şekil kaç birim kare?', choices: ['18', '9', '10', '81'], answer: 0, feedback: [null, 'Bu yalnızca bir yarı.', 'Simetrik şeklin iki yarısı eştir; 1 kare eklemek yetmez.', '9 × 9 değil; iki eş yarı var.'] },
    ],
  },

  // MAT.4.3.10
  {
    id: 'g4-kod-izle',
    outcomes: ['MAT.4.3.10'],
    type: 'quiz',
    stage: 'model',
    title: 'Kodu oku, şekli bul',
    instructions: 'Kareli zemindeki çizime bak. Robot A noktasından başlıyor. Hangi kod bu şekli çizer?',
    level: 2,
    launch: { text: 'Bir robota kareli zeminde şekil çizdirmek istiyoruz. Robot yalnızca “sağa, sola, yukarı, aşağı ve kaç birim” komutlarını anlıyor.', visual: pathGrid([1, 5], 'R4 U3 L4 D3') },
    reflect: 'Bir kodun doğru olup olmadığını nasıl kontrol edersin?',
    questions: [
      { prompt: { text: 'Bu şekli hangi kod çizer?', visual: pathGrid([1, 5], 'R4 U3 L4 D3') }, choices: ['→4 ↑3 ←4 ↓3', '→4 ↑4 ←4 ↓4', '→3 ↑4 ←3 ↓4', '→4 ↑3 ←4'], answer: 0, feedback: [null, 'Bu kod bir kare çizer; şeklin yüksekliği 3 birim.', 'Sağa ve yukarı adımların sayıları yer değiştirmiş.', 'Son adım eksik: şekil kapanmıyor.'] },
      { prompt: { text: 'Bu şekli hangi kod çizer?', visual: pathGrid([2, 5], 'R3 U3 L3 D3') }, choices: ['→3 ↑3 ←3 ↓3', '→3 ↑3 ←3', '→3 ↑2 ←3 ↓2', '→2 ↑2 ←2 ↓2'], answer: 0, feedback: [null, 'Son adım eksik; başladığın noktaya dönmedin.', 'Bu kod bir dikdörtgen çizer.', 'Kenarlar 3 birim, 2 değil.'] },
      { prompt: { text: 'Bu şekli hangi kod çizer?', visual: pathGrid([2, 5], 'R3 U3 B') }, choices: ['→3 ↑3, sonra A’ya düz çizgi', '→3 ↑3 ←3 ↓3', '→3 ↑3 ←3', '↑3 →3 ↓3'], answer: 0, feedback: [null, 'Bu kod bir kare çizer.', 'Bu kod kapanmayan bir yol çizer.', 'Bu kod yukarı başlıyor ve kapanmıyor.'] },
      { prompt: { text: 'Bu yapıyı oluşturmak için hangi şekiller kullanılmıştır?', visual: HOUSE }, choices: ['2 kare ve 1 üçgen', '1 kare, 1 üçgen ve 1 dikdörtgen', '1 daire, 1 üçgen ve 1 kare'], answer: 1, feedback: ['Kapıya dikkat et: kare mi, dikdörtgen mi?', null, 'Yapıda daire yok.'] },
      { prompt: 'Kod: “Bir kare çiz. Karenin üst kenarına bitişik bir üçgen çiz.” Hangi yapı oluşur?', choices: ['Bir ev', 'Bir ok', 'Bir köprü'], answer: 0, feedback: [null, 'Ok için üçgen karenin yanında olurdu.', 'Köprü için kemer ya da ayaklar gerekir.'] },
      { prompt: 'İki eş dik üçgeni en uzun kenarlarından birleştirirsek hangi şekil oluşur?', choices: ['Dikdörtgen', 'Çember', 'Beşgen'], answer: 0, feedback: [null, 'Çemberin köşesi yoktur.', 'İki üçgenden 4 köşeli bir şekil oluşur.'] },
    ],
  },
  {
    id: 'g4-kodlama-sirala',
    outcomes: ['MAT.4.3.10'],
    type: 'sort',
    stage: 'sembol',
    title: 'Kodu sırala',
    instructions: 'Yapıyı oluşturan kod adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Kod yazmak, adımları doğru sırayla yazmaktır. Sıra karışırsa robot yanlış şekil çizer!' },
    reflect: 'Hangi adımların yeri değişse bile şekil aynı kalırdı? Hangilerinin yeri değişemez?',
    rounds: [
      { prompt: 'Kareli kâğıtta dikdörtgen çizme kodu', items: ['● A noktasından başla.', '→ 6 birim sağa git (B).', '↑ 3 birim yukarı git (C).', '← 6 birim sola git (D).', '↓ 3 birim aşağı git, A’ya dön.'] },
      { prompt: 'Ev yapısı oluşturma kodu', items: ['Bir kare çiz.', 'Karenin üst kenarına bitişik bir üçgen çiz.', 'Üçgenin sağ kenarına küçük bir dikdörtgen baca ekle.', 'Bacanın üstüne küçük bir daire (duman) çiz.'] },
      { prompt: 'Kareli kâğıtta üçgen çizme kodu', items: ['● A noktasından başla.', '→ 4 birim sağa git (B).', '↑ 3 birim yukarı git (C).', 'C’den A’ya düz bir çizgi çiz.'] },
    ],
  },
  {
    id: 'g4-kod-tamamla',
    outcomes: ['MAT.4.3.10'],
    type: 'fill',
    stage: 'problem',
    title: 'Kodu tamamla ve düzelt',
    instructions: 'Kodda eksik ya da hatalı olan sayıyı veya sözcüğü bul.',
    level: 2,
    launch: { text: 'Bir kodda eksik ya da hatalı bir adım varsa yapı tamamlanmaz. Kodu inceleyip eksikleri bulalım.' },
    reflect: 'Hatalı bir kodu düzeltirken nasıl bir yol izledin?',
    items: [
      { text: 'Kare kodu: 3 birim sağa, 3 birim yukarı, __ birim sola, __ birim aşağı.', answers: ['3', '3'] },
      { text: 'Dikdörtgen kodu: 7 birim sağa, 2 birim yukarı, __ birim sola, 2 birim aşağı.', answers: ['7'], hints: ['Karşılıklı kenarlar eş olmalı.'] },
      { text: '“4 birim sağa, 4 birim yukarı, 4 birim sola, 4 birim aşağı” kodu bir __ çizer.', answers: ['kare'], choices: ['kare', 'üçgen', 'dikdörtgen'] },
      { text: 'Robot “→5 ↑2 ←4 ↓2” kodunu çalıştırınca başladığı yere dönemedi. Dönmesi için 3. adım “← __” olmalı.', answers: ['5'], hints: ['Sağa kaç birim gitti? Sola da o kadar gitmeli.'] },
      { text: 'Kenarı 5 birim olan kareyi çizen kod toplam __ birim yol çizer.', answers: ['20'] },
      { text: 'Bir yapıda 2 kare ve 3 üçgen var. Şekillerin köşe sayılarının toplamı __', answers: ['17'], hints: ['Bir karenin kaç köşesi var? Bir üçgenin?'] },
      { text: '“Bir kare çiz, karenin üstüne bir üçgen koy.” kodu 3 kez tekrarlanırsa toplam __ şekil kullanılır.', answers: ['6'] },
    ],
  },

  // ── Olayların Olasılığı ve Veriye Dayalı Araştırma ──────────────────────

  // MAT.4.4.1
  {
    id: 'g4-torba-deneyi',
    outcomes: ['MAT.4.4.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Torbadan top çek',
    instructions: 'Torbada 4 kırmızı ve 2 mavi top var. Önce tahmin et, sonra deney yap ve soruyu cevapla.',
    level: 2,
    launch: { text: 'Torbada 4 kırmızı ve 2 mavi top var. Gözün kapalı bir top çekersen ne olabilir? Önce tahmin et, sonra dene!', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 4 }, { emoji: '🔵', count: 2 }] } },
    reflect: 'Deneyde mavi top da çekebildin mi? Bu, mavi çekmenin “olabilir” olduğunu nasıl gösterir?',
    tool: 'probability',
    config: {
      mode: 'bag',
      sectors: [
        { label: 'Kırmızı', color: '#ef4444', weight: 4 },
        { label: 'Mavi', color: '#3b82f6', weight: 2 },
      ],
    },
    tasks: [
      { prompt: 'Birkaç kez top çek, sonra cevapla.', target: { question: 'Torbadan yeşil top çekmek nasıl bir olaydır?', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 'İmkânsız' }, explain: 'Torbada hiç yeşil top yok.' },
      { prompt: 'Birkaç kez top çek, sonra cevapla.', target: { question: 'Torbadan mavi top çekmek nasıl bir olaydır?', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 'Olabilir' } },
      { prompt: 'Birkaç kez top çek, sonra cevapla.', target: { question: 'Torbadan kırmızı ya da mavi top çekmek nasıl bir olaydır?', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 'Kesin' }, explain: 'Torbadaki bütün toplar ya kırmızı ya mavi.' },
      { prompt: '10 kez çekiliş yap ve sonuçlara bak.', target: { question: 'Hangi rengin daha sık gelmesini beklersin?', choices: ['Kırmızı', 'Mavi', 'İkisi de aynı'], answer: 'Kırmızı' }, explain: 'Torbada kırmızı top daha çok olduğu için kırmızının daha sık gelmesini bekleriz.' },
    ],
  },
  {
    id: 'g4-imkansiz-olabilir-kesin',
    outcomes: ['MAT.4.4.1'],
    type: 'quiz',
    stage: 'model',
    fixedOrder: true,
    title: 'Olasılık çizgisi',
    instructions: 'Olayın olasılık çizgisinde nerede olduğunu seç: imkânsız, olabilir ya da kesin.',
    level: 1,
    launch: { text: 'Olayları bir çizgi üzerinde düşünebiliriz: bir ucunda hiç olmayacak olaylar (imkânsız), diğer ucunda mutlaka olacaklar (kesin), arada olabilecek olaylar.', visual: PROB_LINE },
    reflect: '“Olabilir” grubundaki olaylardan hangisi “kesin”e daha yakın? Neden öyle düşünüyorsun?',
    questions: [
      { prompt: '☀️ Yarın güneş doğudan doğacak.', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 2, feedback: ['Güneş her sabah doğudan doğar; bu olay mutlaka olur.', '“Olabilir” bazen olan bazen olmayan olaylar içindir; güneş her gün doğar.', null] },
      { prompt: '🐦 Kuşlar yarın bizimle konuşacak.', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 0, feedback: [null, 'Kuşlar insanlar gibi konuşamaz; bu olay hiç olmaz.', 'Kuşların bizimle konuşması mümkün değil.'] },
      { prompt: '🌧️ Bu yaz çok yağmur yağacak.', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 1, feedback: ['Yazın da yağmur yağabilir.', null, 'Yağmurun çok yağacağından emin olamayız.'] },
      { prompt: { text: 'Torbadan çekilen top kırmızı olacak.', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 5 }] } }, choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 2, feedback: ['Torbada kırmızı top var; çekmek mümkün.', 'Torbada başka renk yok; ne çekersen kırmızı.', null] },
      { prompt: { text: 'Torbadan çekilen top mavi olacak.', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 2 }] } }, choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 1, feedback: ['Torbada mavi top var.', null, 'Kırmızı da çekebilirsin; mavi kesin değil.'] },
      { prompt: { text: 'Zar atınca 7 gelecek.', visual: { kind: 'dice', value: 3 } }, choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 0, feedback: [null, 'Zarda 1’den 6’ya kadar sayılar var; 7 yok.', 'Zarda 7 yok.'] },
      { prompt: '🪙 Havaya atılan madeni para yazı gelecek.', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 1, feedback: ['Paranın bir yüzü yazı; gelebilir.', null, 'Tura da gelebilir.'] },
      { prompt: '📅 Pazartesiden sonra salı gelecek.', choices: ['İmkânsız', 'Olabilir', 'Kesin'], answer: 2, feedback: ['Günlerin sırası hiç değişmez.', 'Pazartesiden sonra her zaman salı gelir.', null] },
    ],
  },
  {
    id: 'g4-olaylari-grupla',
    outcomes: ['MAT.4.4.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Olayları grupla',
    instructions: 'Her olayı olasılığına göre grubuna yerleştir.',
    level: 2,
    launch: { text: 'Günlük hayattaki olayları üç gruba ayıralım. Arkadaşınla aynı gruplamayı mı yaparsınız?' },
    reflect: '“Okul takımımızın maçı kazanması” olayı için “kesin” diyen birine ne söylersin?',
    categories: [
      { id: 'imkansiz', label: 'İmkânsız', color: '#ef4444' },
      { id: 'olabilir', label: 'Olabilir', color: '#eab308' },
      { id: 'kesin', label: 'Kesin', color: '#22c55e' },
    ],
    items: [
      { content: '🐟 Balıkların ağaca tırmanması', category: 'imkansiz' },
      { content: '🎲 Zar atınca 0 gelmesi', category: 'imkansiz', explain: 'Zarda 0 yok.' },
      { content: '🐘 Bir filin kanat çırparak uçması', category: 'imkansiz' },
      { content: '🌧️ Yarın yağmur yağması', category: 'olabilir' },
      { content: '⚽ Okul takımımızın maçı kazanması', category: 'olabilir', explain: 'Kazanabilir de kaybedebilir de; emin olamayız.' },
      { content: '🎡 Kırmızı ve mavi bölümlü çarkın kırmızıda durması', category: 'olabilir' },
      { content: '🌙 Gündüzden sonra gecenin gelmesi', category: 'kesin' },
      { content: '❄️ Ocak ayından sonra şubat ayının gelmesi', category: 'kesin' },
      { content: '🎂 Gelecek yıl yaşının 1 artması', category: 'kesin' },
    ],
  },
  {
    id: 'g4-olasilik-farkli',
    outcomes: ['MAT.4.4.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Olasılık)',
    instructions: 'Hangisi diğerlerinden farklı? “İmkânsız, olabilir, kesin” sözcüklerini kullanarak gerekçeni oluştur.',
    level: 2,
    launch: { text: 'Hangisi farklı? Olasılık sözcüklerini kullanarak gerekçeni oluştur: imkânsız, olabilir, kesin.' },
    reflect: 'Seçtiğin gerekçeyi “imkânsız, olabilir, kesin” sözcüklerinden en az birini kullanarak açıkla.',
    questions: [
      {
        prompt: 'Torbadan kırmızı top çekme açısından hangisi farklı?',
        choices: [
          { visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 4 }] } },
          { visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 1 }] } },
          { visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 1 }, { emoji: '🔵', count: 3 }] } },
          { visual: { kind: 'emojiGroups', groups: [{ emoji: '🔵', count: 4 }] } },
        ],
        answer: 0,
        reasons: ['Kırmızı çekmenin kesin olduğu tek torba.', 'Kırmızı çekmek olabilir ve kırmızı toplar çoğunlukta.', 'Kırmızı çekmek olabilir ama mavi toplar çoğunlukta.', 'Kırmızı çekmenin imkânsız olduğu tek torba.'],
      },
      { prompt: 'Hangisi farklı?', choices: ['Yarın sabah güneşin doğması', 'Zar atınca 6 gelmesi', 'Yazı tura atınca tura gelmesi', 'Bir balığın ağaca tırmanması'], answer: 3, reasons: ['Kesin olan tek olay.', 'Altı farklı sonuçtan biri olan tek olay.', 'Yalnızca iki sonucu olan tek deney.', 'İmkânsız olan tek olay.'] },
      { prompt: 'Hangisi farklı?', choices: ['Ocak’tan sonra şubatın gelmesi', 'Gelecek yıl yaşının 1 artması', 'Yarın yağmur yağması', 'Ayın 32’sinin gelmesi'], answer: 2, reasons: ['Takvimle ilgili kesin bir olay.', 'Sana özel olan kesin bir olay.', 'Olabilir olan tek olay.', 'İmkânsız olan tek olay.'] },
    ],
  },

  // MAT.4.4.2
  {
    id: 'g4-nokta-grafigi',
    outcomes: ['MAT.4.4.2'],
    type: 'quiz',
    stage: 'model',
    title: 'İki sınıfın nokta grafiği',
    instructions: 'Nokta grafiğinde her nokta bir öğrenciyi gösteriyor. Mavi noktalar 4/A, turuncu noktalar 4/B.',
    level: 2,
    launch: { text: '4/A ve 4/B sınıflarına “Okula nasıl geliyorsun?” diye soruldu. Cevapları iki renkli bir nokta grafiğinde gösterdik. İki sınıfı karşılaştırabilir miyiz?', visual: TRANSPORT },
    reflect: 'İki veri grubunu aynı grafikte göstermek karşılaştırmayı nasıl kolaylaştırdı?',
    questions: [
      { prompt: { text: '4/A’da en çok kullanılan ulaşım yolu hangisi?', visual: TRANSPORT }, choices: ['Yürüyerek', 'Servisle', 'Arabayla', 'Bisikletle'], answer: 0, feedback: [null, '4/A’da servisle gelen 6 kişi; yürüyerek gelen daha çok.', '4/A’da arabayla gelen 5 kişi.', '4/A’da bisikletle gelen 3 kişi; en az.'] },
      { prompt: { text: '4/B’de servisle kaç öğrenci geliyor?', visual: TRANSPORT }, choices: ['8', '6', '14', '4'], answer: 0, feedback: [null, '6, 4/A’daki servisle gelenler; renklere dikkat.', '14, iki sınıfın toplamı.', '4, 4/B’de arabayla ya da bisikletle gelenler.'] },
      { prompt: { text: 'Hangi sınıfta bisikletle gelen daha çok?', visual: TRANSPORT }, choices: ['4/B', '4/A', 'İkisi eşit'], answer: 0, feedback: [null, '4/A’da 3, 4/B’de 4 kişi.', '3 ile 4 eşit değil.'] },
      { prompt: { text: 'Yürüyerek gelenler 4/A’da 4/B’dekinden kaç fazla?', visual: TRANSPORT }, choices: ['3', '15', '9', '6'], answer: 0, feedback: [null, 'Topladın; fark soruluyor.', '9, yalnızca 4/A’daki sayı.', '6, yalnızca 4/B’deki sayı.'] },
      { prompt: { text: 'Ankete 4/B’den kaç öğrenci katıldı?', visual: TRANSPORT }, choices: ['22', '23', '45', '8'], answer: 0, feedback: [null, '23, 4/A’nın toplamı: 9 + 6 + 5 + 3.', '45, iki sınıfın toplamı.', '8, yalnızca servisle gelenler.'] },
      { prompt: { text: 'Çetelede kaç öğrenci gösterilmiş?', visual: tally(12) }, choices: ['12', '10', '3', '15'], answer: 0, feedback: [null, 'Son grubu da say: iki tam beşli ve 2 çizgi.', '3, grup sayısı; her tam grup 5 sayılır.', 'Üç tam grup yok; son grupta yalnızca 2 çizgi var.'] },
    ],
  },
  {
    id: 'g4-arastirma-sorusu',
    outcomes: ['MAT.4.4.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Araştırma sorusu mu?',
    instructions: 'Cevabı kişiden kişiye değişen ve veri toplamayı gerektiren sorular istatistiksel araştırma sorusudur. Soruları grupla.',
    level: 2,
    launch: { text: 'Her soru bir araştırma sorusu değildir. Cevabı kişiden kişiye değişiyorsa ve veri toplayarak cevaplanıyorsa istatistiksel araştırma sorusudur.' },
    reflect: '“Elif kaç yaşında?” sorusunu bir araştırma sorusuna nasıl dönüştürürsün?',
    categories: [
      { id: 'evet', label: 'İstatistiksel araştırma sorusu', color: '#22c55e' },
      { id: 'hayir', label: 'Araştırma sorusu değil', color: '#ef4444' },
    ],
    items: [
      { content: '4/A sınıfındaki öğrenciler en çok hangi meyveyi seviyor?', category: 'evet', explain: 'Cevap öğrenciden öğrenciye değişir; veri toplamak gerekir.' },
      { content: 'Okulumuzdaki öğrenciler okula nasıl geliyor?', category: 'evet' },
      { content: '4. sınıf öğrencilerinin ayakkabı numaraları nelerdir?', category: 'evet' },
      { content: '4/A ve 4/B sınıflarında en çok sevilen renk hangisi?', category: 'evet' },
      { content: 'Elif kaç yaşında?', category: 'hayir', explain: 'Tek bir kişiye sorulur, tek bir cevabı vardır.' },
      { content: 'Okulumuzun adı nedir?', category: 'hayir' },
      { content: 'Bugün hava kaç derece?', category: 'hayir' },
      { content: 'Mehmet’in en sevdiği oyun hangisi?', category: 'hayir' },
    ],
  },
  {
    id: 'g4-arastirma-adimlari',
    outcomes: ['MAT.4.4.2'],
    type: 'sort',
    stage: 'sembol',
    title: 'Araştırmanın adımları',
    instructions: 'İstatistiksel araştırmanın adımlarını sırala.',
    level: 2,
    launch: { text: 'Bir araştırmacı gibi çalışalım: önce soru, sonra plan, veri, grafik ve yorum. Sıra önemli!' },
    reflect: 'Veriyi toplamadan önce plan yapmak neden önemli?',
    rounds: [
      { prompt: 'Araştırma sürecinin adımlarını sırala.', items: ['Bir problem belirle.', 'Araştırma sorusunu yaz.', 'Veri toplama planı yap.', 'Verileri topla.', 'Verileri çetele ve sıklık tablosuna yerleştir.', 'Grafik çiz.', 'Sonuçları yorumla.'] },
      { prompt: 'İki sınıflı anketin adımlarını sırala.', items: ['“4/A ve 4/B’de en sevilen mevsim hangisi?” sorusunu belirle.', 'Soruyu iki sınıftaki her öğrenciye sor.', 'Cevapları her sınıf için ayrı çeteleyle işaretle.', 'İki sütunlu bir sıklık tablosu doldur.', 'İki renkli bir nokta grafiği çiz.', 'İki sınıfın sonuçlarını karşılaştır ve yorumla.'] },
    ],
  },
  {
    id: 'g4-veriye-dayali-karar',
    outcomes: ['MAT.4.4.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Veriye dayalı karar',
    instructions: '4/A ve 4/B sınıflarına “En sevdiğin spor hangisi?” diye soruldu. Tabloyu incele ve karar ver.',
    level: 2,
    launch: { text: 'Okul spor malzemesi alacak ama bütçe kısıtlı. 4/A ve 4/B’nin verilerine bakarak en doğru kararı verelim.', visual: SPORTS_TABLE },
    reflect: 'Tek bir sınıfın verisine bakmak ile iki sınıfın verisine bakmak kararı nasıl değiştirdi?',
    questions: [
      { prompt: { text: '4/A sınıfında en çok sevilen spor hangisi?', visual: SPORTS_TABLE }, choices: ['Basketbol', 'Futbol', 'Voleybol', 'Yüzme'], answer: 1, feedback: ['4/A’da basketbolu 5 kişi seviyor; 4/B sütununa bakmış olabilir misin?', null, 'Voleybol 7 kişi; futbol daha çok.', 'Yüzme en az sevilen.'] },
      { prompt: { text: '4/B sınıfında basketbolu kaç öğrenci seviyor?', visual: SPORTS_TABLE }, choices: ['5', '7', '8', '6'], answer: 2, feedback: ['5, 4/A’daki basketbolcular.', '7, voleybol sayısı.', null, '6, 4/B’de futbolu sevenler.'] },
      { prompt: { text: 'Hangi spor dalını iki sınıfta eşit sayıda öğrenci seviyor?', visual: SPORTS_TABLE }, choices: ['Futbol', 'Voleybol', 'Yüzme', 'Basketbol'], answer: 1, feedback: ['Futbol: 9 ve 6, eşit değil.', null, 'Yüzme: 3 ve 5.', 'Basketbol: 5 ve 8.'] },
      { prompt: { text: 'Futbolu seven öğrenciler 4/A’da 4/B’dekinden kaç fazla?', visual: SPORTS_TABLE }, choices: ['2', '15', '4', '3'], answer: 3, feedback: ['9 − 6 işlemini tekrar yap.', 'Topladın; fark soruluyor.', '9 − 6 işlemini tekrar yap.', null] },
      { prompt: { text: 'Ankete 4/A sınıfından kaç öğrenci katıldı?', visual: SPORTS_TABLE }, choices: ['24', '26', '50', '20'], answer: 0, feedback: [null, '26, 4/B’nin toplamı.', '50, iki sınıfın toplamı.', 'Bir sporu atlamış olabilir misin? 9 + 5 + 7 + 3.'] },
      { prompt: { text: 'İki sınıfın toplamına göre okul hangi spor için yeni malzeme almalı?', visual: SPORTS_TABLE }, choices: ['Voleybol', 'Basketbol', 'Futbol', 'Yüzme'], answer: 2, explain: 'Futbol 15, voleybol 14, basketbol 13, yüzme 8 kişi.', feedback: ['Voleybol toplam 14; futbol 15.', 'Basketbol toplam 13.', null, 'Yüzme toplam 8; en az.'] },
      { prompt: { text: 'Müdür yalnızca 4/B’nin verisine bakarak karar verseydi hangi spor için malzeme alırdı?', visual: SPORTS_TABLE }, choices: ['Basketbol', 'Futbol', 'Voleybol', 'Yüzme'], answer: 0, feedback: [null, '4/B’de futbolu 6 kişi seviyor; basketbolu 8.', 'Voleybol 4/B’de 7 kişi.', 'Yüzme 4/B’de 5 kişi.'] },
      { prompt: 'Bu anket bir yıl sonra aynı sınıflarda yapılsa aynı sonuç çıkar mı?', choices: ['Değişebilir; öğrencilerin tercihleri zamanla değişebilir.', 'Kesinlikle aynı çıkar.'], answer: 0, feedback: [null, 'Veriler toplandığı zamana ve kişilere göre değişebilir; bu yüzden veriyi kaydeder ve tarihini yazarız.'] },
    ],
  },
]

/** Öğretmen ve veliler için tema bazında büyük fikirler */
export const grade4Notes: ThemeNotes = {
  'sayilar-ve-nicelikler-1': {
    bigIdeas: [
      'Basamak değeri sistemi 10’luk gruplamaya dayanır: her basamak sağındakinin 10 katıdır. 10 yüzlük bir binlik, 10 binlik bir on binlik eder.',
      'Bölükler (birler, binler) üçlü basamak gruplarıdır; büyük sayıları okumayı ve yazmayı kolaylaştırır.',
      'Sayılar esnek biçimde çözümlenebilir: 24.700 hem 24 binlik 7 yüzlük hem de 247 yüzlüktür. Bu esneklik zihinden işlemin temelidir.',
      'Yuvarlama bir kural değil, sayı doğrusunda “hangi yuvarlak sayıya daha yakın?” sorusudur; örüntüler ise değişimi genelleyerek uzaktaki terimleri tahmin etmeyi sağlar.',
    ],
  },
  'sayilar-ve-nicelikler-2': {
    bigIdeas: [
      'Kesir, bir bütünün eş parçalarını sayar: payda parçaların büyüklüğünü (adını), pay kaç parça olduğunu söyler. Her kesir birim kesirlerin yinelenmesiyle oluşur ([[3/4]] = 3 tane [[1/4]]).',
      'Aynı miktar farklı kesirlerle gösterilebilir (denk kesirler); bu, kural ezberiyle değil alan, uzunluk ve küme modelleri ile sayı doğrusunda görülerek anlaşılır.',
      'Kesirleri karşılaştırırken bütün aynı olmalıdır. Birim kesirlerde payda büyüdükçe parça küçülür; paydaları eşit kesirlerde parçalar aynı büyüklükte olduğundan paylar karşılaştırılır. 0, [[1/2]] ve 1 referansları hızlı tahmin sağlar.',
      'Paydaları eşit kesirlerle toplama-çıkarma, aynı adlı parçaları saymaktır; payda değişmez. Ölçü birimleri arasındaki dönüşümler de “Bu büyük birimde kaç tane küçük birim var?” sorusuyla anlamlanır.',
    ],
  },
  'islemlerden-cebirsel-dusunmeye': {
    bigIdeas: [
      'Zihinden işlem ve tahmin, basamak değeri ile sayıların esnek parçalanmasına dayanır (telafi, ileri sayma, yuvarlak sayılara tamamlama). Hesaplamadan önce tahmin, sonucun mantıklılığını kontrol etmeyi sağlar.',
      'Algoritmaların her adımı bir anlama karşılık gelir: “elde” 10 birliğin bir onluğa dönüşmesi, “bozma” bir onluğun 10 birliğe çevrilmesidir. Alan modeli, çok basamaklı çarpmayı parçaların toplamı olarak gösterir.',
      'Bölmenin iki anlamı vardır: paylaştırma (bir grupta kaç?) ve gruplama (kaç grup?). Kalanın yorumu bağlama göre değişir: bazen bir fazla grup gerekir, bazen kalan cevabın kendisidir.',
      'Eşittir işareti “sonucu yaz” demek değil, iki tarafın aynı değerde olduğunu söyleyen bir ilişkidir; şerit modeli problemlerdeki parça-bütün ve karşılaştırma ilişkilerini görünür kılar.',
    ],
  },
  'nesnelerin-geometrisi-1': {
    bigIdeas: [
      'Cisimler ile açınımları arasında yüzlerin sayısı, şekli ve konumu üzerinden mantıksal ilişki vardır; altı kare her zaman küp açınımı değildir.',
      'Şekiller kenar ve köşe özelliklerine göre sınıflandırılır: kare, bütün kenarları eş olan özel bir dikdörtgendir; üçgenler kenar uzunluklarına göre eşkenar, ikizkenar ve çeşitkenar olarak adlandırılır.',
      'Çevre bir uzunluk (kenarların toplamı), alan ise yüzeyi kaplayan birimlerin sayısıdır. Alanları eşit şekillerin çevreleri farklı olabilir.',
      'Ölçme, bir birimi yinelemektir: birim büyüdükçe gereken birim sayısı azalır. Standart olmayan birimlerle tahmin, standart birimlere duyulan ihtiyacı hissettirir.',
    ],
  },
  'nesnelerin-geometrisi-2': {
    bigIdeas: [
      'Açı bir dönme miktarıdır (kapı, saat kolları, kol hareketi); büyüklüğü kolların uzunluğuna bağlı değildir.',
      'Açılar eş dilimler gibi standart olmayan birimlerle ölçülebilir; farklı birimler farklı sayılar verdiği için standart bir ölçme aracına ihtiyaç vardır.',
      'Dik açı (çeyrek tur) bir referanstır: ondan küçük açılar dar, büyük açılar geniş açıdır.',
    ],
  },
  'nesnelerin-geometrisi-3': {
    bigIdeas: [
      'Doğruya göre simetri, ayna görüntüsünün bir çizgiye taşınmış hâlidir: şekil ile görüntüsü eştir, yönleri terstir.',
      'Simetride her noktanın simetri doğrusuna uzaklığı korunur; görüntü aynı satırda (dikey doğruda) ya da aynı sütunda (yatay doğruda) kalır. Kaydırma simetri değildir.',
      'Kodlama, bir yapıyı oluşturan adımları doğru sırayla ve eksiksiz ifade etmektir; kodu çalıştırıp kontrol etmek ve hatayı ayıklamak sürecin parçasıdır.',
    ],
  },
  'olasilik-ve-veri': {
    bigIdeas: [
      'Olasılık bir sürekliliktir: imkânsız ile kesin arasında “olabilir” olaylar vardır ve bazıları diğerlerinden daha olasıdır. Deney yapmak tahminleri sınamanın yoludur.',
      'İstatistiksel araştırma, cevabı kişiden kişiye değişen bir soruyla başlar; veriler planlanarak toplanır, çetele ve sıklık tablosuyla düzenlenir.',
      'İki veri grubunu aynı grafikte (nokta, nesne, şekil grafiği) göstermek karşılaştırmayı kolaylaştırır; kararlar tek grubun değil, bütün verinin incelenmesine dayanmalıdır.',
    ],
  },
}
