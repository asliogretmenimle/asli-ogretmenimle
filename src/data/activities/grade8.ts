import type { Activity, Visual } from '../types'

// ---------------------------------------------------------------------------
// Bu dosyaya özel küçük SVG yardımcıları (geometrik olarak doğru çizimler)
// ---------------------------------------------------------------------------

type Pt = [number, number]
const INK = '#1f2340'
const SIDE = '#4f46e5'
const ANG = '#ea580c'
const IV = '#6366f1'

const r1 = (n: number) => Math.round(n * 10) / 10
const unit = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}
const sub = (p: Pt, q: Pt): Pt => [p[0] - q[0], p[1] - q[1]]
const txt = (p: Pt, s: string, color: string, size = 14) =>
  `<text x="${r1(p[0])}" y="${r1(p[1])}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800" fill="${color}">${s}</text>`

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
  return { kind: 'svg', svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${triParts(t, s, ox, oy)}</svg>` }
}

/** Aynı ölçekte yan yana iki üçgen (eşlik/benzerlik) */
function twoTri(t1: TriSpec, t2: TriSpec): Visual {
  const W = 380, H = 210, pad = 44, gap = 64
  const b1 = triBox(t1), b2 = triBox(t2)
  const s = Math.min((W - 2 * pad - gap) / (b1.w + b2.w), (H - 2 * pad) / Math.max(b1.h, b2.h))
  const oy = (H + Math.max(b1.h, b2.h) * s) / 2
  const ox1 = (W - (b1.w + b2.w) * s - gap) / 2
  const ox2 = ox1 + b1.w * s + gap
  return { kind: 'svg', svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${triParts(t1, s, ox1, oy)}${triParts({ ...t2, fill: t2.fill ?? '#fde68a' }, s, ox2, oy)}</svg>` }
}

const DEG = Math.PI / 180
/** B ve C açılarından üçgen (A = 180 − B − C) */
const byAngles = (B: number, C: number, extra: Partial<TriSpec> = {}): TriSpec => ({
  a: Math.sin((180 - B - C) * DEG) * 10,
  b: Math.sin(B * DEG) * 10,
  c: Math.sin(C * DEG) * 10,
  ...extra,
})

/** Sayı doğrusunda aralık. a/b = null ise o yönde sonsuz */
function interval(min: number, max: number, a: number | null, b: number | null, closedA = true, closedB = true, marks: { v: number; label: string }[] = []): Visual {
  const W = 340, pad = 28, y = 34
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad)
  let s = `<line x1="${pad - 18}" y1="${y}" x2="${W - pad + 18}" y2="${y}" stroke="${INK}" stroke-width="2"/>`
  s += `<path d="M${W - pad + 22} ${y} l-9 -5 v10 z M${pad - 22} ${y} l9 -5 v10 z" fill="${INK}"/>`
  for (let v = min; v <= max; v++) {
    s += `<line x1="${r1(x(v))}" y1="${y - 6}" x2="${r1(x(v))}" y2="${y + 6}" stroke="${INK}" stroke-width="1.5"/>`
    s += `<text x="${r1(x(v))}" y="${y + 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}">${v < 0 ? '−' + -v : v}</text>`
  }
  const xa = a === null ? pad - 14 : x(a), xb = b === null ? W - pad + 14 : x(b)
  s += `<line x1="${r1(xa)}" y1="${y}" x2="${r1(xb)}" y2="${y}" stroke="${IV}" stroke-width="6"/>`
  if (a === null) s += `<path d="M${pad - 24} ${y} l12 -8 v16 z" fill="${IV}"/>`
  if (b === null) s += `<path d="M${W - pad + 24} ${y} l-12 -8 v16 z" fill="${IV}"/>`
  const dot = (v: number, closed: boolean) => `<circle cx="${r1(x(v))}" cy="${y}" r="6.5" fill="${closed ? IV : '#fff'}" stroke="${IV}" stroke-width="3"/>`
  if (a !== null) s += dot(a, closedA)
  if (b !== null) s += dot(b, closedB)
  marks.forEach((m) => (s += `<text x="${r1(x(m.v))}" y="${y - 16}" text-anchor="middle" font-size="12" font-weight="800" fill="${IV}">${m.label}</text>`))
  return { kind: 'svg', svg: `<svg viewBox="0 0 ${W} 66" xmlns="http://www.w3.org/2000/svg">${s}</svg>` }
}

/** Kareli zeminde çokgenler (y yukarı doğru artar) */
function gridShapes(cols: number, rows: number, shapes: { pts: Pt[]; color: string; labels?: string[] }[]): Visual {
  const c = 24, pad = 14
  const X = (x: number) => pad + x * c, Y = (y: number) => pad + (rows - y) * c
  let s = ''
  for (let i = 0; i <= cols; i++) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(rows)}" stroke="#d9dbea"/>`
  for (let j = 0; j <= rows; j++) s += `<line x1="${X(0)}" y1="${Y(j)}" x2="${X(cols)}" y2="${Y(j)}" stroke="#d9dbea"/>`
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
  return { kind: 'svg', svg: `<svg viewBox="0 0 ${cols * c + 2 * pad} ${rows * c + 2 * pad}" xmlns="http://www.w3.org/2000/svg">${s}</svg>` }
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
  const H = 12 + steps.length * (bh + gap) - gap
  return { kind: 'svg', svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>` }
}

/** Silindir açınımı */
function cylNet(rLabel: string, hLabel: string): Visual {
  const s =
    `<circle cx="110" cy="32" r="26" fill="#fde68a" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="110" y1="32" x2="136" y2="32" stroke="${INK}" stroke-width="1.5"/>` + txt([178, 32], rLabel, INK, 12) +
    `<rect x="20" y="58" width="180" height="90" fill="#e0e7ff" stroke="${INK}" stroke-width="2"/>` +
    txt([110, 100], 'yanal yüzey', SIDE, 12) + txt([110, 136], '2πr', ANG, 13) + txt([246, 103], hLabel, INK, 12) +
    `<circle cx="110" cy="174" r="26" fill="#fde68a" stroke="${INK}" stroke-width="2"/>`
  return { kind: 'svg', svg: `<svg viewBox="0 0 290 204" xmlns="http://www.w3.org/2000/svg">${s}</svg>` }
}

/** Dikey ekseni istenen değerden başlayan sütun grafiği */
function barChart(data: { label: string; value: number }[], yMin: number, yMax: number, step: number, title: string): Visual {
  const W = 300, top = 34, bottom = 170, left = 52
  const Y = (v: number) => bottom - ((v - yMin) / (yMax - yMin)) * (bottom - top)
  let s = txt([W / 2, 14], title, INK, 13)
  for (let v = yMin; v <= yMax; v += step) {
    s += `<line x1="${left}" y1="${r1(Y(v))}" x2="${W - 16}" y2="${r1(Y(v))}" stroke="#d9dbea"/>`
    s += `<text x="${left - 6}" y="${r1(Y(v)) + 4}" text-anchor="end" font-size="11" fill="${INK}">${v}</text>`
  }
  s += `<line x1="${left}" y1="${top - 6}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="2"/><line x1="${left}" y1="${bottom}" x2="${W - 16}" y2="${bottom}" stroke="${INK}" stroke-width="2"/>`
  const bw = 46, gapW = (W - 16 - left - data.length * bw) / (data.length + 1)
  data.forEach((d, i) => {
    const x = left + gapW + i * (bw + gapW)
    s += `<rect x="${r1(x)}" y="${r1(Y(d.value))}" width="${bw}" height="${r1(bottom - Y(d.value))}" fill="${['#f97316', '#3b82f6', '#22c55e'][i % 3]}"/>`
    s += txt([x + bw / 2, bottom + 14], d.label, INK, 12)
  })
  return { kind: 'svg', svg: `<svg viewBox="0 0 ${W} 196" xmlns="http://www.w3.org/2000/svg">${s}</svg>` }
}

// Paralel kenar benzerliği: A(130,20) B(30,180) C(230,180), D ve E kenarların 2/3'ünde
const PARALEL_UCGEN: Visual = {
  kind: 'svg',
  svg:
    `<svg viewBox="0 0 260 210" xmlns="http://www.w3.org/2000/svg">` +
    `<polygon points="130,20 30,180 230,180" fill="#e0e7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<line x1="63.3" y1="126.7" x2="196.7" y2="126.7" stroke="${ANG}" stroke-width="2.5"/>` +
    txt([130, 8], 'A', INK, 15) + txt([20, 192], 'B', INK, 15) + txt([240, 192], 'C', INK, 15) + txt([50, 126], 'D', INK, 15) + txt([210, 126], 'E', INK, 15) +
    txt([84, 66], '4', SIDE, 13) + txt([34, 152], '2', SIDE, 13) + txt([130, 116], '6', ANG, 13) + txt([130, 196], 'x', SIDE, 14) +
    `</svg>`,
}

const ALGORITMA_2X3 = flow(['Başla', 'x sayısını gir', 'x’i 2 ile çarp', 'Sonuca 3 ekle', 'Sonucu yazdır', 'Bitir'])
const ALGORITMA_CF = flow(['Başla', 'C değerini gir', 'C’yi 9 ile çarp', 'Sonucu 5’e böl', 'Sonuca 32 ekle', 'F değerini yazdır', 'Bitir'])
const BENZER_ABC_DEF = twoTri(
  { a: 8, b: 10, c: 6, right: 'B', sides: { a: '8 cm', b: '10 cm', c: '6 cm' } },
  { a: 12, b: 15, c: 9, right: 'B', names: ['D', 'E', 'F'], sides: { a: 'x', b: 'y', c: '9 cm' } },
)
const SILINDIR_ACINIM = cylNet('r = 3 cm', 'h = 10 cm')
const TABLO_DEPO: Visual = { kind: 'table', headers: ['x (dakika)', '0', '1', '2', '3'], rows: [['y (litre)', 5, 8, 11, 14]] }

/** 8. SINIF ETKİNLİKLERİ */
export const grade8: Activity[] = [
  // ── Sayılar ve Nicelikler ──────────────────────────────────────────────
  {
    id: 'g8-uslu-ifadenin-anlami',
    outcomes: ['MAT.8.1.1'],
    type: 'quiz',
    title: 'Üslü ifade ne anlatır?',
    instructions: 'Tekrarlı çarpma, sıfırıncı ve negatif kuvvetler üzerine düşün ve doğru seçeneği işaretle.',
    level: 1,
    questions: [
      { prompt: '3 · 3 · 3 · 3 tekrarlı çarpımının üslü gösterimi hangisidir?', choices: ['4^{3}', '3^{4}', '3 · 4', '3^{3}'], answer: 1, explain: 'Aynı sayı (3) dört kez çarpılıyor: taban 3, üs 4.' },
      { prompt: 'Bir kâğıt ortadan ikiye kesiliyor, sonra her parça yeniden ikiye kesiliyor. Bu işlem 5 kez yapılırsa kaç parça oluşur?', choices: ['10', '25', '32', '16'], answer: 2, explain: 'Her kesmede parça sayısı 2 katına çıkar: 2^{5} = 32.' },
      { prompt: 'Bir hücre her saat 3 hücreye bölünüyor. Başlangıçta 1 hücre varsa 4 saat sonra kaç hücre olur?', choices: ['12', '81', '64', '27'], answer: 1, explain: '3 · 3 · 3 · 3 = 3^{4} = 81.' },
      { prompt: '(−2)^{4} ve −2^{4} ifadelerinin değerleri sırasıyla hangisidir?', choices: ['16 ve −16', '−16 ve 16', '16 ve 16', '−16 ve −16'], answer: 0, explain: '(−2)^{4} = (−2)·(−2)·(−2)·(−2) = 16; −2^{4} = −(2·2·2·2) = −16.' },
      { prompt: '3^{3} = 27, 3^{2} = 9, 3^{1} = 3 örüntüsü aynı kuralla devam ederse 3^{0} ve 3^{−1} ne olur?', choices: ['0 ve −3', '1 ve −3', '1 ve [[1/3]]', '0 ve [[1/3]]'], answer: 2, explain: 'Her adımda 3’e bölünür: 3 : 3 = 1 ve 1 : 3 = [[1/3]].' },
      { prompt: 'Aşağıdakilerden hangisi negatif bir sayıdır?', choices: ['(−3)^{2}', '3^{−2}', '(−3)^{0}', '(−3)^{3}'], answer: 3, explain: 'Negatif sayının tek kuvveti negatiftir: (−3)^{3} = −27. 3^{−2} = [[1/9]] pozitiftir.' },
      { prompt: '“Üs büyüdükçe sayının değeri her zaman büyür.” varsayımını hangi örnek çürütür?', choices: ['2^{3} < 2^{4}', '([[1/2]])^{2} > ([[1/2]])^{3}', '10^{2} < 10^{3}', '5^{1} < 5^{2}'], answer: 1, explain: 'Tabanı 0 ile 1 arasında olan sayılarda üs büyüdükçe değer küçülür: [[1/4]] > [[1/8]].' },
      { prompt: '5^{−2} ifadesinin değeri hangisidir?', choices: ['−25', '[[1/25]]', '−10', '[[1/10]]'], answer: 1, explain: 'a^{−n}, 1’in a^{n} sayısına bölümüdür: 5^{−2} = 1 : 5^{2} = [[1/25]].' },
    ],
  },
  {
    id: 'g8-uslu-islemler',
    outcomes: ['MAT.8.1.1'],
    type: 'fill',
    title: 'Üslü ifadelerle işlemler',
    instructions: 'Üslü ifadelerin özelliklerini kullanarak boşlukları doldur.',
    level: 2,
    items: [
      { text: '(−3)^{3} = __', answers: ['-27'] },
      { text: '4^{−2} = __', answers: ['1/16|0,0625'], hint: '4^{−2}, 1’in 4^{2} sayısına bölümüdür.' },
      { text: '2^{3} · 2^{4} = 2^{n} ise n = __', answers: ['7'], hint: 'Aynı tabanlı üslü ifadeler çarpılırken üsler toplanır.' },
      { text: '5^{8} : 5^{3} = 5^{n} ise n = __', answers: ['5'], hint: 'Aynı tabanlı üslü ifadeler bölünürken üsler çıkarılır.' },
      { text: '(7^{2})^{3} = 7^{n} ise n = __', answers: ['6'], hint: 'Üssün üssü alınırken üsler çarpılır.' },
      { text: '2^{6} · 5^{6} = 10^{n} ise n = __', answers: ['6'], hint: 'a^{x} · b^{x} = (a · b)^{x}' },
      { text: '3^{−4} · 3^{6} = __', answers: ['9'] },
      { text: '([[2/3]])^{−2} = __', answers: ['9/4|2,25'], hint: 'Negatif üs, kesri ters çevirir.' },
    ],
  },
  {
    id: 'g8-uslu-ozellik-eslestir',
    outcomes: ['MAT.8.1.1'],
    type: 'match',
    title: 'Özellikleri eşleştir',
    instructions: 'Her işlemi eşit olduğu ifadeyle eşleştir.',
    level: 2,
    perRound: 4,
    pairs: [
      { left: '2^{3} · 2^{4}', right: '2^{7}' },
      { left: '5^{6} : 5^{2}', right: '5^{4}' },
      { left: '(3^{2})^{3}', right: '3^{6}' },
      { left: '2^{5} · 5^{5}', right: '10^{5}' },
      { left: '7^{0}', right: '1' },
      { left: '4^{−2}', right: '[[1/16]]' },
      { left: '(−3)^{3}', right: '−27' },
      { left: '([[2/3]])^{2}', right: '[[4/9]]' },
    ],
  },
  {
    id: 'g8-uslu-siralama',
    outcomes: ['MAT.8.1.1'],
    type: 'sort',
    title: 'Üslü ifadeleri sırala',
    instructions: 'Önce her ifadenin değerini zihninden bul, sonra küçükten büyüğe sırala.',
    level: 2,
    rounds: [
      { prompt: 'Değerlerine göre küçükten büyüğe sırala.', items: ['2^{−3}', '3^{−1}', '5^{0}', '2^{3}', '3^{2}'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Negatif tabanlara dikkat! Küçükten büyüğe sırala.', items: ['(−2)^{3}', '−2^{2}', '(−1)^{5}', '2^{−1}', '(−3)^{2}'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Taban 0 ile 1 arasında. Küçükten büyüğe sırala.', items: ['([[1/2]])^{3}', '([[1/2]])^{2}', '([[1/2]])^{1}', '([[1/2]])^{0}'], ends: ['En küçük', 'En büyük'] },
    ],
  },
  {
    id: 'g8-onun-kuvvetleriyle-cozumle',
    outcomes: ['MAT.8.1.1'],
    type: 'fill',
    title: '10’un kuvvetleriyle çözümleme',
    instructions: 'Ondalık gösterimleri 10’un tam sayı kuvvetleriyle çözümle ya da çözümlenmiş sayıyı yaz.',
    level: 2,
    items: [
      { text: '4 · 10^{2} + 3 · 10^{1} + 7 · 10^{0} + 2 · 10^{−1} = __', answers: ['437,2'] },
      { text: '5 · 10^{1} + 6 · 10^{−1} + 8 · 10^{−3} = __', answers: ['50,608'], hint: '10^{−3} binde birler basamağıdır.' },
      { text: '9 · 10^{0} + 4 · 10^{−2} = __', answers: ['9,04'] },
      { text: '0,047 sayısında 4 rakamının basamak değeri 4 · 10^{n} ise n = __', answers: ['-2'] },
      { text: '362,5 = 3 · 10^{2} + __ · 10^{1} + 2 · 10^{0} + 5 · 10^{n} ise n = __', answers: ['6', '-1'] },
      { text: 'Bir dosyanın boyutu 2^{10} kilobayttır. Bu dosya __ kilobayttır.', answers: ['1024|1.024'] },
    ],
  },
  {
    id: 'g8-kare-ve-karekok',
    outcomes: ['MAT.8.1.2'],
    type: 'match',
    title: 'Kare ve karekök',
    instructions: 'Karenin alanı ile kenar uzunluğu arasındaki ilişkiyi kullanarak eşleştir.',
    level: 1,
    perRound: 4,
    pairs: [
      { left: 'Alanı 49 cm² olan karenin bir kenarı', right: '7 cm' },
      { left: 'Alanı 144 m² olan kare bahçenin bir kenarı', right: '12 m' },
      { left: 'Kenarı 0,3 m olan karenin alanı', right: '0,09 m²' },
      { left: '√{400}', right: '20' },
      { left: '√{0,25}', right: '0,5' },
      { left: '√{1,44}', right: '1,2' },
      { left: '√{9/16}', right: '[[3/4]]' },
      { left: '√{0,04}', right: '0,2' },
    ],
  },
  {
    id: 'g8-karekok-hangi-sayilar-arasinda',
    outcomes: ['MAT.8.1.2'],
    type: 'fill',
    title: 'Karekök hangi sayılar arasında?',
    instructions: 'Tam kare sayıların kareköklerini yaz; tam kare olmayanların hangi iki doğal sayı arasında olduğunu bul.',
    level: 2,
    generator: { id: 'sqrt', params: { max: 12, between: true }, count: 8 },
  },
  {
    id: 'g8-karekok-yaklasik-deger',
    outcomes: ['MAT.8.1.2', 'MAT.8.1.4'],
    type: 'manipulative',
    title: 'Karekökü sayı doğrusunda bul',
    instructions: 'Kareköklü sayının yaklaşık yerini sayı doğrusunda işaretle.',
    level: 2,
    tool: 'numberline',
    config: { min: 2, max: 3, step: 0.1 },
    tasks: [
      { prompt: '√{6,25} sayısını işaretle. (2,5^{2} = 6,25)', target: { value: 2.5 } },
      { prompt: '√{5} sayısına en yakın onda birlik değeri işaretle. (2,2^{2} = 4,84 ve 2,3^{2} = 5,29)', target: { value: 2.2 } },
      { prompt: '√{7} sayısına en yakın onda birlik değeri işaretle. (2,6^{2} = 6,76 ve 2,7^{2} = 7,29)', target: { value: 2.6 } },
      { prompt: '√{8} sayısına en yakın onda birlik değeri işaretle. (2,8^{2} = 7,84 ve 2,9^{2} = 8,41)', target: { value: 2.8 } },
    ],
  },
  {
    id: 'g8-karekok-muhakeme',
    outcomes: ['MAT.8.1.2'],
    type: 'quiz',
    title: 'Kareköklerle akıl yürüt',
    instructions: 'Kareköklü ifadelerle ilgili problemleri çöz.',
    level: 2,
    questions: [
      { prompt: 'Alanı 225 m² olan kare şeklindeki bir tarlanın çevresine bir sıra tel çekilecek. Kaç metre tel gerekir?', choices: ['15 m', '60 m', '56,25 m', '30 m'], answer: 1, explain: 'Kenar = √{225} = 15 m, çevre = 4 · 15 = 60 m.' },
      { prompt: '√{50} sayısına en yakın tam sayı hangisidir?', choices: ['7', '25', '8', '6'], answer: 0, explain: '49 < 50 < 64 ve 50 sayısı 49’a çok yakındır; √{50} ≈ 7,07.' },
      { prompt: 'Hangi ifade doğrudur?', choices: ['√{16} = −4', '√{−16} = −4', '√{16} = 4', '√{16} = 8'], answer: 2, explain: 'Bir sayının karekökü negatif olamaz; √{16} = 4 çünkü 4^{2} = 16.' },
      { prompt: 'Kenar uzunluğu tam sayı olan bir karenin alanı aşağıdakilerden hangisi olabilir?', choices: ['50 cm²', '72 cm²', '90 cm²', '81 cm²'], answer: 3, explain: '81 bir tam kare sayıdır: 9 · 9 = 81.' },
      { prompt: '√{0,49} işleminin sonucu hangisidir?', choices: ['0,07', '0,7', '7', '0,49'], answer: 1, explain: '0,7 · 0,7 = 0,49' },
      { prompt: '√{30} sayısı hangi iki ardışık doğal sayı arasındadır?', choices: ['4 ile 5', '6 ile 7', '5 ile 6', '29 ile 31'], answer: 2, explain: '25 < 30 < 36 olduğundan 5 < √{30} < 6.' },
      { prompt: 'Hesap makinesinde √{20} = 4,4721… görünüyor. Onda birler basamağına yuvarlanırsa yaklaşık değer nedir?', choices: ['4,4', '4,5', '4,47', '5'], answer: 1, explain: 'Yüzde birler basamağı 7 olduğu için onda birler basamağı bir artar: 4,5. (Kesme stratejisi 4,4 verir.)' },
    ],
  },
  {
    id: 'g8-rasyonel-mi-irrasyonel-mi',
    outcomes: ['MAT.8.1.3'],
    type: 'categorize',
    title: 'Rasyonel mi, irrasyonel mi?',
    instructions: 'Ondalık gösterimi sonlu ya da devirli olanlar rasyoneldir; düzensiz sonsuz olanlar irrasyoneldir. Her sayıyı doğru gruba sürükle.',
    level: 2,
    categories: [
      { id: 'rasyonel', label: 'Rasyonel', color: '#22c55e' },
      { id: 'irrasyonel', label: 'İrrasyonel', color: '#a855f7' },
    ],
    items: [
      { content: '0,25', category: 'rasyonel' },
      { content: '0,333…', category: 'rasyonel' },
      { content: '√{16}', category: 'rasyonel' },
      { content: '[[7/9]]', category: 'rasyonel' },
      { content: '√{0,49}', category: 'rasyonel' },
      { content: '2,1555…', category: 'rasyonel' },
      { content: '√{2}', category: 'irrasyonel' },
      { content: 'π', category: 'irrasyonel' },
      { content: '1,010010001…', category: 'irrasyonel' },
      { content: '√{7}', category: 'irrasyonel' },
    ],
  },
  {
    id: 'g8-ondalik-gosterim-eslestir',
    outcomes: ['MAT.8.1.3'],
    type: 'match',
    title: 'Sayı ve ondalık gösterimi',
    instructions: 'Her sayıyı ondalık gösterimiyle eşleştir. Gerekirse bölme işlemi yap.',
    level: 2,
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
    id: 'g8-ondalik-gosterim-ve-yargi',
    outcomes: ['MAT.8.1.3'],
    type: 'quiz',
    title: 'Ondalık gösterimden karara',
    instructions: 'Ondalık gösterimi ölçüt alarak sayının rasyonel olup olmadığına karar ver.',
    level: 2,
    questions: [
      { prompt: '[[5/8]] sayısının ondalık gösterimi nasıldır?', choices: ['Devirli: 0,6252525…', 'Sonlu: 0,625', 'Düzensiz sonsuz', 'Sonlu: 0,58'], answer: 1, explain: '5 : 8 = 0,625. Ondalık kısmı sonludur, sayı rasyoneldir.' },
      { prompt: '[[2/11]] sayısının ondalık gösterimi 0,181818… şeklindedir. Bu sayı için ne söylenebilir?', choices: ['İrrasyoneldir, çünkü ondalık kısmı sonsuzdur.', 'Ne rasyonel ne irrasyoneldir.', 'Rasyoneldir, çünkü ondalık kısmı devirlidir.', 'Hem rasyonel hem irrasyoneldir.'], answer: 2 },
      { prompt: 'Hesap makinesinde √{3} = 1,7320508075688… görünüyor. Bu sayı için hangisi doğrudur?', choices: ['Ondalık kısmı düzensiz sonsuzdur, irrasyoneldir.', 'Ondalık kısmı devirlidir, rasyoneldir.', 'Sonlu bir ondalık gösterimdir.', '[[17/10]] kesrine eşittir.'], answer: 0 },
      { prompt: 'Aşağıdakilerden hangisi irrasyonel bir sayıdır?', choices: ['√{25}', '√{0,09}', '[[22/7]]', '√{11}'], answer: 3, explain: '11 tam kare değildir; √{11} = 3,3166… düzensiz sonsuzdur.' },
      { prompt: 'Mehmet, “Kök içindeki her sayı irrasyoneldir.” diyor. Hangi örnek Mehmet’in yanıldığını gösterir?', choices: ['√{3}', '√{36}', '√{5}', '√{8}'], answer: 1, explain: '√{36} = 6 bir rasyonel sayıdır.' },
      { prompt: 'Hangisi [[1/2]] sayısının farklı bir temsili DEĞİLDİR?', choices: ['0,5', '√{0,25}', '[[2/4]]', '√{0,5}'], answer: 3, explain: '√{0,5} ≈ 0,707… olduğundan [[1/2]]’ye eşit değildir.' },
      { prompt: 'Bir sayı hem rasyonel hem irrasyonel olabilir mi?', choices: ['Evet, √{4} gibi', 'Evet, π gibi', 'Hayır, bir sayı ya rasyoneldir ya irrasyoneldir', 'Yalnızca negatif sayılarda'], answer: 2 },
    ],
  },
  {
    id: 'g8-gercek-sayilari-sirala',
    outcomes: ['MAT.8.1.4', 'MAT.8.1.2'],
    type: 'sort',
    title: 'Gerçek sayıları sırala',
    instructions: 'Kareköklü ve kesirli sayıların yaklaşık değerlerini düşünerek sırala.',
    level: 2,
    rounds: [
      { prompt: 'Küçükten büyüğe sırala.', items: ['√{2}', '[[3/2]]', '√{3}', '2', '√{5}'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Negatif sayılara dikkat! Küçükten büyüğe sırala.', items: ['−√{10}', '−3', '−[[5/2]]', '√{6}', 'π'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Küçükten büyüğe sırala.', items: ['√{0,16}', '0,5', '√{0,36}', '[[2/3]]', '√{0,81}'], ends: ['En küçük', 'En büyük'] },
    ],
  },
  {
    id: 'g8-gercek-sayilari-yerlestir',
    outcomes: ['MAT.8.1.4'],
    type: 'manipulative',
    title: 'Sayı doğrusuna yerleştir',
    instructions: 'Verilen gerçek sayıyı sayı doğrusunda işaretle.',
    level: 1,
    tool: 'numberline',
    config: { min: -3, max: 3, step: 0.5 },
    tasks: [
      { prompt: '−[[3/2]] sayısını işaretle.', target: { value: -1.5 } },
      { prompt: '√{4} sayısını işaretle.', target: { value: 2 } },
      { prompt: '−√{9} sayısını işaretle.', target: { value: -3 } },
      { prompt: '√{2,25} sayısını işaretle.', target: { value: 1.5 } },
    ],
  },
  {
    id: 'g8-araliklari-oku',
    outcomes: ['MAT.8.1.4'],
    type: 'quiz',
    title: 'Gerçek sayı aralıkları',
    instructions: 'Dolu nokta uç noktanın aralığa dâhil olduğunu, boş nokta dâhil olmadığını gösterir.',
    level: 2,
    questions: [
      { prompt: { text: 'Sayı doğrusunda gösterilen aralık hangisidir?', visual: interval(-3, 5, -1, 3, true, false) }, choices: ['[−1, 3)', '(−1, 3]', '[−1, 3]', '(−1, 3)'], answer: 0 },
      { prompt: { text: 'Sayı doğrusunda gösterilen aralık hangisidir?', visual: interval(-2, 6, 2, null, false) }, choices: ['[2, ∞)', '(2, ∞)', '(−∞, 2)', '(−∞, 2]'], answer: 1 },
      { prompt: { text: 'Sayı doğrusunda gösterilen aralık hangisidir?', visual: interval(-5, 3, null, -1, true, true) }, choices: ['(−∞, −1)', '[−1, ∞)', '(−∞, −1]', '(−1, ∞)'], answer: 2 },
      { prompt: 'x bir gerçek sayı olmak üzere 2 ≤ x < 5 eşitsizliğini sağlayan sayılar hangi aralıktadır?', choices: ['(2, 5]', '[2, 5)', '[2, 5]', '(2, 5)'], answer: 1 },
      { prompt: '[−2, 3] aralığında kaç tane tam sayı vardır?', choices: ['4', '5', '6', 'Sonsuz çoklukta'], answer: 2, explain: '−2, −1, 0, 1, 2, 3 → 6 tam sayı. Uç noktalar dâhildir.' },
      { prompt: '(1, 4) aralığı için hangisi doğrudur?', choices: ['Bu aralıkta yalnızca 2 ve 3 vardır.', 'Bu aralıkta sonsuz çoklukta gerçek sayı vardır.', '1 ve 4 bu aralığa dâhildir.', 'Bu aralıkta irrasyonel sayı yoktur.'], answer: 1, explain: 'Örneğin 1,5; √{2}; π; 3,99… hepsi bu aralıktadır.' },
      { prompt: '(3, 6) ile [−1, 4] aralıklarının ortak sayıları hangi aralığı oluşturur?', choices: ['[3, 4]', '(−1, 6)', '(3, 4]', '[−1, 6)'], answer: 2, explain: 'Ortak sayılar 3’ten büyük ve 4’e eşit ya da 4’ten küçüktür: (3, 4].' },
      { prompt: 'Hangi sayı [1, √{5}) aralığındadır?', choices: ['√{5}', '2', '√{6}', '0,9'], answer: 1, explain: '√{5} ≈ 2,24 olduğundan 2 aralıktadır; √{5} ise aralığa dâhil değildir.' },
    ],
  },
  {
    id: 'g8-aralik-gosterimleri',
    outcomes: ['MAT.8.1.4'],
    type: 'match',
    title: 'Aralık gösterimleri',
    instructions: 'x bir gerçek sayıdır. Her aralığı eşitsizlik gösterimiyle eşleştir.',
    level: 2,
    perRound: 6,
    pairs: [
      { left: '[2, 5]', right: '2 ≤ x ≤ 5' },
      { left: '(2, 5)', right: '2 < x < 5' },
      { left: '[2, 5)', right: '2 ≤ x < 5' },
      { left: '(2, 5]', right: '2 < x ≤ 5' },
      { left: '[2, ∞)', right: 'x ≥ 2' },
      { left: '(−∞, 2)', right: 'x < 2' },
    ],
  },
  {
    id: 'g8-aralikta-mi',
    outcomes: ['MAT.8.1.4', 'MAT.8.1.2'],
    type: 'categorize',
    title: '[1, 4) aralığında mı?',
    instructions: '[1, 4) aralığı 1’i içerir, 4’ü içermez. Her sayıyı doğru gruba sürükle.',
    level: 2,
    categories: [
      { id: 'icinde', label: '[1, 4) aralığında', color: '#6366f1' },
      { id: 'disinda', label: 'Aralıkta değil', color: '#f97316' },
    ],
    items: [
      { content: '1', category: 'icinde' },
      { content: '√{2}', category: 'icinde' },
      { content: 'π', category: 'icinde' },
      { content: '√{10}', category: 'icinde' },
      { content: '[[7/2]]', category: 'icinde' },
      { content: '4', category: 'disinda' },
      { content: '√{16}', category: 'disinda' },
      { content: '0,99', category: 'disinda' },
      { content: '√{17}', category: 'disinda' },
      { content: '−2', category: 'disinda' },
    ],
  },

  // ── Geometrik Şekiller ─────────────────────────────────────────────────
  {
    id: 'g8-aci-kenar-iliskisi',
    outcomes: ['MAT.8.3.1'],
    type: 'quiz',
    title: 'Büyük açı, uzun kenar',
    instructions: 'Üçgende büyük açının karşısında uzun kenar, küçük açının karşısında kısa kenar bulunur.',
    level: 1,
    questions: [
      { prompt: { text: 'Bu üçgenin en uzun kenarı hangisidir?', visual: tri(byAngles(50, 60, { angles: { A: '70°', B: '50°', C: '60°' } })) }, choices: ['[AB]', '[BC]', '[AC]'], answer: 1, explain: 'En büyük açı A (70°); karşısındaki kenar [BC] en uzundur.' },
      { prompt: { text: 'Bu üçgenin en uzun kenarı hangisidir?', visual: tri(byAngles(35, 105, { angles: { A: '40°', B: '35°', C: '105°' } })) }, choices: ['[BC]', '[AC]', '[AB]'], answer: 2, explain: 'Geniş açının (C) karşısındaki kenar [AB] en uzundur.' },
      { prompt: 'Bir dik üçgende en uzun kenar hangisidir?', choices: ['Dik kenarlardan biri', 'En küçük açının karşısındaki kenar', 'Dik açının karşısındaki kenar (hipotenüs)', 'Kenarların hepsi eşittir'], answer: 2 },
      { prompt: { text: 'Kenar uzunlukları verilen bu üçgende en büyük açı hangisidir?', visual: tri({ a: 7, b: 5, c: 4, sides: { a: '7 cm', b: '5 cm', c: '4 cm' } }) }, choices: ['A açısı', 'B açısı', 'C açısı'], answer: 0, explain: 'En uzun kenar [BC] = 7 cm; karşısındaki açı A en büyüktür.' },
      { prompt: 'ABC üçgeninde m(Â) = m(B̂) = 65° ise en kısa kenar hangisidir?', choices: ['[BC]', '[AB]', '[AC]', 'Bütün kenarlar eşittir'], answer: 1, explain: 'm(Ĉ) = 50° en küçük açıdır; karşısındaki [AB] en kısadır.' },
      { prompt: 'ABC üçgeninde |AB| > |AC| > |BC| ise açıların sıralaması hangisidir?', choices: ['m(Â) > m(B̂) > m(Ĉ)', 'm(B̂) > m(Ĉ) > m(Â)', 'm(Ĉ) > m(Â) > m(B̂)', 'm(Ĉ) > m(B̂) > m(Â)'], answer: 3, explain: '[AB]’nin karşısında C, [AC]’nin karşısında B, [BC]’nin karşısında A açısı vardır.' },
    ],
  },
  {
    id: 'g8-aci-kenar-sirala',
    outcomes: ['MAT.8.3.1'],
    type: 'sort',
    title: 'Kenarları ve açıları sırala',
    instructions: 'Açı-kenar ilişkisini kullanarak sırala.',
    level: 2,
    rounds: [
      { prompt: 'ABC üçgeninde m(A) = 70°, m(B) = 50°, m(C) = 60°. Kenarları kısadan uzuna sırala.', items: ['[AC]', '[AB]', '[BC]'], ends: ['En kısa', 'En uzun'] },
      { prompt: 'DEF üçgeninde |DE| = 9 cm, |EF| = 6 cm, |DF| = 8 cm. Açıları küçükten büyüğe sırala.', items: ['D açısı', 'E açısı', 'F açısı'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'KLM üçgeninde m(K) = 100°, m(L) = 35°. Kenarları kısadan uzuna sırala.', items: ['[KM]', '[KL]', '[LM]'], ends: ['En kısa', 'En uzun'] },
    ],
  },
  {
    id: 'g8-ucgen-olusur-mu',
    outcomes: ['MAT.8.3.2'],
    type: 'categorize',
    title: 'Üçgen oluşur mu?',
    instructions: 'Üç çubukla üçgen oluşması için her kenar diğer ikisinin toplamından küçük olmalı. Grupla.',
    level: 1,
    categories: [
      { id: 'olusur', label: 'Üçgen oluşur', color: '#22c55e' },
      { id: 'olusmaz', label: 'Üçgen oluşmaz', color: '#ef4444' },
    ],
    items: [
      { content: '3 cm, 4 cm, 5 cm', category: 'olusur' },
      { content: '4 cm, 5 cm, 6 cm', category: 'olusur' },
      { content: '5 cm, 5 cm, 9 cm', category: 'olusur' },
      { content: '7 cm, 7 cm, 7 cm', category: 'olusur' },
      { content: '6 cm, 8 cm, 13 cm', category: 'olusur' },
      { content: '3 cm, 3 cm, 7 cm', category: 'olusmaz' },
      { content: '2 cm, 5 cm, 8 cm', category: 'olusmaz' },
      { content: '1 cm, 2 cm, 3 cm', category: 'olusmaz' },
      { content: '2 cm, 3 cm, 6 cm', category: 'olusmaz' },
      { content: '4 cm, 4 cm, 8 cm', category: 'olusmaz' },
    ],
  },
  {
    id: 'g8-ucuncu-kenar',
    outcomes: ['MAT.8.3.2'],
    type: 'fill',
    title: 'Üçüncü kenar ne olabilir?',
    instructions: 'Üçgen eşitsizliğini kullan: |a − b| < c < a + b',
    level: 2,
    items: [
      { text: 'Kenarları 5 cm ve 9 cm olan bir üçgenin üçüncü kenarı x cm ise __ < x < __', answers: ['4', '14'] },
      { text: 'Kenarları 7 cm ve 3 cm olan bir üçgenin üçüncü kenarı tam sayı olarak en az __ cm, en çok __ cm olabilir.', answers: ['5', '9'] },
      { text: 'Kenarları 6 cm ve 10 cm olan bir üçgenin üçüncü kenarı __ farklı tam sayı değeri alabilir.', answers: ['11'], hint: '4 < x < 16 → 5, 6, …, 15' },
      { text: 'İkizkenar bir üçgenin iki kenarı 4 cm ve 9 cm ise üçüncü kenar __ cm’dir.', answers: ['9'], hint: '4, 4, 9 ile üçgen oluşur mu?' },
      { text: 'Kenarları 8 cm, 5 cm ve x cm olan üçgende en uzun kenar x ise x’in alabileceği en büyük tam sayı değeri __', answers: ['12'] },
      { text: 'Elif’in 4 cm ve 11 cm’lik iki çubuğu var. Üçgen oluşturmak için üçüncü çubuk tam sayı olarak en az __ cm olmalı.', answers: ['8'] },
    ],
  },
  {
    id: 'g8-ucgen-esitsizligi',
    outcomes: ['MAT.8.3.2'],
    type: 'quiz',
    title: 'Üçgen eşitsizliği',
    instructions: 'Kenar uzunlukları arasındaki ilişkiye dair önermeleri değerlendir.',
    level: 2,
    questions: [
      { prompt: 'Can, 3 cm, 4 cm ve 8 cm’lik çubuklarla üçgen oluşturamadı. Bunun nedeni nedir?', choices: ['Kenarlar farklı uzunlukta olduğu için', '3 + 4 < 8 olduğu için kısa çubukların uçları birleşemez', '8 çift sayı olduğu için', 'Üçgende kenarlar eşit olmalıdır'], answer: 1 },
      { prompt: 'Bir üçgende herhangi bir kenar uzunluğu için hangisi her zaman doğrudur?', choices: ['Diğer iki kenarın toplamından büyüktür.', 'Diğer iki kenarın farkına eşittir.', 'Diğer iki kenarın toplamından küçük, farkının mutlak değerinden büyüktür.', 'Diğer iki kenarın toplamına eşittir.'], answer: 2 },
      { prompt: 'Hangi üç uzunluk bir üçgenin kenarları OLAMAZ?', choices: ['5, 6, 10', '2, 2, 3', '9, 9, 1', '4, 7, 12'], answer: 3, explain: '4 + 7 = 11 < 12' },
      { prompt: 'İki kenarı 5 cm ve 8 cm olan bir üçgenin çevresi aşağıdakilerden hangisi olabilir?', choices: ['16 cm', '20 cm', '26 cm', '27 cm'], answer: 1, explain: '3 < x < 13 olduğundan çevre 16 ile 26 arasında (uçlar hariç) olmalıdır.' },
      { prompt: 'İki kenarı 6 cm ve 6 cm olan bir üçgende bu kenarlar arasındaki açı büyüdükçe üçüncü kenar nasıl değişir?', choices: ['Kısalır', 'Değişmez', 'Uzar ama 12 cm’ye ulaşamaz', 'Uzar ve 12 cm’yi geçebilir'], answer: 2 },
    ],
  },
  {
    id: 'g8-es-ucgen-yeterli-mi',
    outcomes: ['MAT.8.3.3'],
    type: 'categorize',
    title: 'Eş üçgen için hangi bilgi yeter?',
    instructions: 'Gizli bir üçgene eş üçgen çizmek için verilen bilgi yeterli mi? Grupla.',
    level: 2,
    categories: [
      { id: 'yeterli', label: 'Yeterli', color: '#22c55e' },
      { id: 'yetersiz', label: 'Yeterli değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Üç kenarının uzunluğu (KKK)', category: 'yeterli' },
      { content: 'İki kenarının uzunluğu ve bu kenarlar arasındaki açının ölçüsü (KAK)', category: 'yeterli' },
      { content: 'Bir kenarının uzunluğu ve bu kenara komşu iki açının ölçüsü (AKA)', category: 'yeterli' },
      { content: 'Bir dik üçgenin iki dik kenarının uzunluğu', category: 'yeterli' },
      { content: 'Bir eşkenar üçgenin bir kenarının uzunluğu', category: 'yeterli' },
      { content: 'Üç açısının ölçüsü', category: 'yetersiz' },
      { content: 'Yalnızca iki kenarının uzunluğu', category: 'yetersiz' },
      { content: 'Yalnızca bir kenarının uzunluğu ve bir açısının ölçüsü', category: 'yetersiz' },
      { content: 'Yalnızca iki açısının ölçüsü', category: 'yetersiz' },
      { content: 'Yalnızca çevresinin uzunluğu', category: 'yetersiz' },
    ],
  },
  {
    id: 'g8-es-ucgenler',
    outcomes: ['MAT.8.3.3'],
    type: 'quiz',
    title: 'Eş üçgenler',
    instructions: 'Eş üçgenlerde karşılıklı kenarların uzunlukları ve karşılıklı açıların ölçüleri eşittir.',
    level: 2,
    questions: [
      {
        prompt: {
          text: 'Kenar uzunlukları verilen iki üçgen için ne söylenebilir?',
          visual: twoTri({ a: 8, b: 7, c: 5, sides: { a: '8', b: '7', c: '5' } }, { a: 5, b: 8, c: 7, names: ['D', 'E', 'F'], sides: { a: '5', b: '8', c: '7' } }),
        },
        choices: ['Eş değildir.', 'Yalnızca benzerdir, eş değildir.', 'Üç kenarı eşit olduğu için (KKK) eştir.', 'Bilgi yetersizdir.'],
        answer: 2,
      },
      { prompt: 'ABC ≅ DEF ise [AB] kenarının eşi hangi kenardır?', choices: ['[DE]', '[EF]', '[DF]'], answer: 0, explain: 'Eşlikte köşeler sırasıyla eşlenir: A ↔ D, B ↔ E, C ↔ F.' },
      { prompt: 'ABC ≅ KLM, m(Â) = 40° ve m(L̂) = 75° ise m(Ĉ) kaç derecedir?', choices: ['75°', '65°', '40°', '105°'], answer: 1, explain: 'B ↔ L olduğundan m(B̂) = 75°; m(Ĉ) = 180° − 40° − 75° = 65°.' },
      { prompt: 'Açıları 50°, 60° ve 70° olan iki üçgen için hangisi kesinlikle doğrudur?', choices: ['Eştir.', 'Çevreleri eşittir.', 'Ne eş ne benzerdir.', 'Benzerdir ama eş olmayabilir.'], answer: 3, explain: 'Açıların eşit olması üçgenin büyüklüğünü belirlemez.' },
      { prompt: 'Bir paralelkenar bir köşegeniyle iki üçgene ayrılıyor. Bu üçgenler için hangisi doğrudur?', choices: ['Eş değildir.', 'Eştir; karşılıklı kenarlar eşit ve köşegen ortaktır (KKK).', 'Biri mutlaka dik üçgendir.', 'Yalnızca alanları farklıdır.'], answer: 1 },
      { prompt: 'Bir ikizkenar üçgende tabana ait kenarortay, üçgeni KKK’ya göre eş iki üçgene ayırır. Buna göre kenarortay tabanla kaç derecelik açı yapar?', choices: ['45°', '60°', '120°', '90°'], answer: 3, explain: 'Eş üçgenlerde tabandaki iki açı eşittir ve toplamları 180°’dir; her biri 90° olur. Kenarortay aynı zamanda yüksekliktir.' },
      { prompt: 'Öğretmen gizli bir üçgende |AB| = 6 cm, |AC| = 4 cm ve m(Â) = 50° olduğunu söylüyor. Bu bilgilerle birbirine eş olmayan kaç farklı üçgen çizilebilir?', choices: ['1', '2', 'Sonsuz çoklukta', 'Hiç'], answer: 0, explain: 'İki kenar ve aralarındaki açı (KAK) tek bir üçgen belirler.' },
    ],
  },
  {
    id: 'g8-es-ucgen-karsilik',
    outcomes: ['MAT.8.3.3'],
    type: 'match',
    title: 'Karşılıklı elemanlar',
    instructions: 'ABC ≅ DEF olduğuna göre eş elemanları eşleştir.',
    level: 1,
    perRound: 6,
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
    id: 'g8-benzer-ucgenler-hesapla',
    outcomes: ['MAT.8.3.4'],
    type: 'fill',
    title: 'Benzerlik oranıyla hesapla',
    instructions: 'Benzer üçgenlerde karşılıklı kenar uzunluklarının oranı eşittir.',
    level: 2,
    items: [
      { text: 'ABC ∼ DEF ise x = __ cm ve y = __ cm', answers: ['12', '15'], visual: BENZER_ABC_DEF },
      { text: 'Benzerlik oranı [[|AB|/|DE|]] = __', answers: ['2/3|6/9|4/6'], visual: BENZER_ABC_DEF },
      { text: '[DE] ∥ [BC] ise x = __ cm', answers: ['9'], visual: PARALEL_UCGEN, hint: 'ADE ∼ ABC ve |AB| = 4 + 2 = 6 cm' },
      { text: 'Boyu 1,5 m olan Elif’in gölgesi 2 m iken aynı anda bir ağacın gölgesi 12 m’dir. Ağacın boyu __ m', answers: ['9'], hint: 'Güneş ışınları aynı açıyla geldiği için oluşan üçgenler benzerdir.' },
      { text: '10 cm × 15 cm’lik bir fotoğraf benzer biçimde büyütülüyor. Kısa kenarı 20 cm olursa uzun kenarı __ cm olur.', answers: ['30'] },
      { text: 'ABC ∼ KLM ve benzerlik oranı [[1/3]]’tür. |AB| = 4 cm ise |KL| = __ cm', answers: ['12'] },
      { text: 'Haritada kenarları 3 cm, 4 cm ve 5 cm olan üçgen biçimli arazinin en uzun kenarı gerçekte 250 m ise en kısa kenarı __ m', answers: ['150'] },
    ],
  },
  {
    id: 'g8-benzerlik-icin-yeterli',
    outcomes: ['MAT.8.3.4'],
    type: 'quiz',
    title: 'Benzer üçgen için ne bilmeli?',
    instructions: 'Benzer üçgenlerde karşılıklı açılar eş, karşılıklı kenarlar orantılıdır.',
    level: 2,
    questions: [
      { prompt: 'İki üçgenin benzer olduğunu göstermek için hangisi yeterlidir?', choices: ['Birer kenarlarının eşit olması', 'İkişer açılarının ölçülerinin eşit olması', 'Çevrelerinin eşit olması', 'Birer açılarının eşit olması'], answer: 1 },
      { prompt: 'Açıları 40° ve 60° olan bir üçgen ile açıları 60° ve 80° olan bir üçgen benzer midir?', choices: ['Hayır, verilen açılar farklıdır.', 'Karar verilemez.', 'Evet, ikisinin de açıları 40°, 60° ve 80°’dir.', 'Yalnızca eştir.'], answer: 2, explain: 'Üçüncü açılar 80° ve 40° olur; iki üçgenin açıları aynıdır.' },
      { prompt: 'Kenarları 3, 4 ve 5 birim olan üçgene benzer üçgen hangisidir?', choices: ['4, 5, 6', '3, 4, 6', '5, 12, 13', '6, 8, 10'], answer: 3, explain: 'Her kenar 2 katına çıkmıştır; benzerlik oranı [[1/2]].' },
      { prompt: 'Benzerlik oranı 1 olan iki üçgen için hangisi doğrudur?', choices: ['Eş üçgenlerdir.', 'Benzer değildir.', 'Biri diğerinin iki katıdır.', 'Açıları farklıdır.'], answer: 0 },
      { prompt: 'ABC ∼ DEF ise hangisi kesinlikle doğrudur?', choices: ['|AB| = |DE|', 'm(Â) = m(Ê)', 'm(Â) = m(D̂)', '|BC| = |DF|'], answer: 2 },
      { prompt: 'Hangi ifade YANLIŞTIR?', choices: ['Eş üçgenler aynı zamanda benzerdir.', 'Bütün eşkenar üçgenler benzerdir.', 'Benzer üçgenlerde karşılıklı kenarların oranı eşittir.', 'Bütün ikizkenar üçgenler benzerdir.'], answer: 3 },
      { prompt: 'Bir üçgenin iki kenarı 4 cm ve 6 cm, bu kenarlar arasındaki açı 50°’dir. Hangisi bu üçgene kesinlikle benzerdir?', choices: ['Kenarları 8 cm ve 10 cm, aralarındaki açı 50°', 'Kenarları 8 cm ve 12 cm, aralarındaki açı 50°', 'Kenarları 4 cm ve 6 cm, aralarındaki açı 60°', 'Kenarları 6 cm ve 8 cm, aralarındaki açı 50°'], answer: 1, explain: '8 : 4 = 12 : 6 = 2 ve aradaki açılar eşit.' },
    ],
  },
  {
    id: 'g8-benzer-mi',
    outcomes: ['MAT.8.3.4'],
    type: 'categorize',
    title: 'Benzer mi?',
    instructions: 'Verilen şekil çiftleri her zaman benzer mi? Grupla.',
    level: 3,
    categories: [
      { id: 'benzer', label: 'Her zaman benzer', color: '#22c55e' },
      { id: 'degil', label: 'Benzer değil ya da her zaman değil', color: '#f97316' },
    ],
    items: [
      { content: 'Kenarları 3-4-5 ve 9-12-15 olan iki üçgen', category: 'benzer' },
      { content: 'Açıları 50°-60° ve 60°-70° olan iki üçgen', category: 'benzer' },
      { content: 'Kenarları 5-5-8 ve 10-10-16 olan iki üçgen', category: 'benzer' },
      { content: 'Herhangi iki eşkenar üçgen', category: 'benzer' },
      { content: 'Herhangi iki kare', category: 'benzer' },
      { content: 'Birbirine eş iki üçgen', category: 'benzer' },
      { content: 'Kenarları 2-3-4 ve 4-6-9 olan iki üçgen', category: 'degil' },
      { content: 'Açıları 30°-80° ve 30°-60° olan iki üçgen', category: 'degil' },
      { content: 'Herhangi iki ikizkenar üçgen', category: 'degil' },
      { content: 'Herhangi iki dikdörtgen', category: 'degil' },
    ],
  },
  {
    id: 'g8-pisagor-hesapla',
    outcomes: ['MAT.8.3.5'],
    type: 'fill',
    title: 'Pisagor bağıntısı',
    instructions: 'Dik üçgende a² + b² = c² bağıntısını kullanarak eksik kenarı bul.',
    level: 2,
    generator: { id: 'pythagoras', count: 8 },
  },
  {
    id: 'g8-dik-dar-genis',
    outcomes: ['MAT.8.3.5'],
    type: 'categorize',
    title: 'Dik mi, dar mı, geniş mi?',
    instructions: 'c en uzun kenar olsun. a² + b² = c² ise dik, a² + b² > c² ise dar, a² + b² < c² ise geniş açılı üçgendir.',
    level: 3,
    categories: [
      { id: 'dik', label: 'Dik üçgen', color: '#6366f1' },
      { id: 'dar', label: 'Dar açılı', color: '#22c55e' },
      { id: 'genis', label: 'Geniş açılı', color: '#f97316' },
    ],
    items: [
      { content: '3, 4, 5', category: 'dik' },
      { content: '5, 12, 13', category: 'dik' },
      { content: '8, 15, 17', category: 'dik' },
      { content: '6, 8, 10', category: 'dik' },
      { content: '4, 5, 6', category: 'dar' },
      { content: '7, 8, 9', category: 'dar' },
      { content: '5, 5, 5', category: 'dar' },
      { content: '2, 3, 4', category: 'genis' },
      { content: '4, 6, 9', category: 'genis' },
      { content: '3, 5, 7', category: 'genis' },
    ],
  },
  {
    id: 'g8-pisagor-geometri-tahtasi',
    outcomes: ['MAT.8.3.5'],
    type: 'manipulative',
    title: 'Geometri tahtasında Pisagor',
    instructions: 'Çivilere dokunarak istenen şekli oluştur ve şekli kapat.',
    level: 3,
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Dik kenarları 3 birim ve 4 birim olan bir dik üçgen oluştur. Hipotenüsü kaç birim olur, düşün!', target: { sides: 3, area: 6 } },
      { prompt: 'Dik kenarları 2 birim ve 5 birim olan bir dik üçgen oluştur.', target: { sides: 3, area: 5 } },
      { prompt: 'Bir kenarı √{2} birim olan eğik bir kare oluştur. (İpucu: 1^{2} + 1^{2} = 2)', target: { sides: 4, area: 2 } },
      { prompt: 'Bir kenarı √{5} birim olan eğik bir kare oluştur. (İpucu: 1^{2} + 2^{2} = 5)', target: { sides: 4, area: 5 } },
    ],
  },
  {
    id: 'g8-pisagor-kavram',
    outcomes: ['MAT.8.3.5'],
    type: 'quiz',
    title: 'Dik üçgenin sırrı',
    instructions: 'Dik kenarların kareleri toplamı hipotenüsün karesine eşittir.',
    level: 2,
    questions: [
      { prompt: 'Bir dik üçgenin dik kenarları üzerine çizilen karelerin alanları 9 cm² ve 16 cm²’dir. Hipotenüs üzerine çizilen karenin alanı kaç cm²’dir?', choices: ['7', '12', '25', '144'], answer: 2 },
      { prompt: { text: 'Şekildeki dik üçgende x kaç cm’dir?', visual: tri({ a: 5, b: 12, c: 13, right: 'C', sides: { a: '5 cm', b: '12 cm', c: 'x' } }) }, choices: ['13', '17', '15', '√{119}'], answer: 0, explain: 'x^{2} = 5^{2} + 12^{2} = 25 + 144 = 169 → x = 13' },
      { prompt: 'Dik kenarları 1 cm ve 2 cm olan dik üçgenin hipotenüsü kaç cm’dir?', choices: ['√{3}', '3', '5', '√{5}'], answer: 3, explain: '1 + 4 = 5 → hipotenüs √{5} cm (irrasyonel bir uzunluk).' },
      { prompt: 'Kenarları 7 cm, 24 cm ve 25 cm olan üçgen için hangisi doğrudur?', choices: ['Geniş açılı üçgendir.', 'Dik üçgendir, hipotenüsü 25 cm’dir.', 'Dar açılı üçgendir.', 'Böyle bir üçgen yoktur.'], answer: 1, explain: '49 + 576 = 625 = 25^{2}' },
      { prompt: 'Bir üçgende c en uzun kenar ve a^{2} + b^{2} < c^{2} ise üçgen nasıldır?', choices: ['Dar açılı', 'Geniş açılı', 'Dik', 'Eşkenar'], answer: 1 },
      { prompt: 'Hangisi bir dik üçgenin kenar uzunlukları olabilir?', choices: ['2; 3; 4', '1; 1; 2', '0,3; 0,4; 0,5', '4; 5; 6'], answer: 2, explain: '0,09 + 0,16 = 0,25 = 0,5^{2}' },
      { prompt: 'Dik kenarları [[3/2]] cm ve 2 cm olan dik üçgenin hipotenüsü kaç cm’dir?', choices: ['3', '2,5', '3,5', '√{6}'], answer: 1, explain: '2,25 + 4 = 6,25 → √{6,25} = 2,5' },
    ],
  },
  {
    id: 'g8-ucgen-problemleri',
    outcomes: ['MAT.8.3.6'],
    type: 'quiz',
    title: 'Üçgen problemleri',
    instructions: 'Açı-kenar ilişkisi, üçgen eşitsizliği ve Pisagor bağıntısını kullanarak problemleri çöz.',
    level: 3,
    questions: [
      { prompt: { text: '10 m uzunluğundaki bir merdiven duvara dayanmıştır. Merdivenin alt ucu duvardan 6 m uzaktadır. Merdivenin üst ucu yerden kaç m yüksektedir?', visual: tri({ a: 6, b: 8, c: 10, right: 'C', sides: { a: '6 m', b: '?', c: '10 m' } }) }, choices: ['4', '16', '8', '√{136}'], answer: 2, explain: '10^{2} − 6^{2} = 64 → 8 m' },
      { prompt: 'Ekranının eni 80 cm, boyu 60 cm olan bir televizyonun köşegen uzunluğu kaç cm’dir?', choices: ['140', '100', '120', '90'], answer: 1 },
      { prompt: 'Dikdörtgen biçimli bir parkın kenarları 120 m ve 50 m’dir. Mehmet bir köşeden karşı köşeye kenarlar yerine köşegen boyunca yürürse kaç m daha az yol yürür?', choices: ['130', '170', '70', '40'], answer: 3, explain: 'Kenarlardan: 120 + 50 = 170 m. Köşegen: √{14400 + 2500} = √{16900} = 130 m. Fark 40 m.' },
      { prompt: 'ABC üçgeninde m(Â) = 90°, |AB| = 5 cm ve |AC| = 8 cm’dir. |BC| hangi iki ardışık tam sayı arasındadır?', choices: ['8 ile 9', '9 ile 10', '10 ile 11', '12 ile 13'], answer: 1, explain: '|BC| = √{89}; 81 < 89 < 100' },
      { prompt: 'Bir üçgenin iki kenarı 6 cm ve 8 cm’dir. Üçgen geniş açılıdır ve geniş açının karşısındaki kenar tam sayıdır. Bu kenar kaç farklı değer alabilir?', choices: ['2', '3', '4', '5'], answer: 1, explain: 'Geniş açılı olması için c^{2} > 36 + 64 = 100 → c > 10; üçgen eşitsizliğinden c < 14. c = 11, 12, 13.' },
      { prompt: 'ABC üçgeninde m(Â) = 40°, m(B̂) = 75°, |BC| = 7 cm ve |AC| = 9 cm’dir. |AB| tam sayı ise kaç cm’dir?', choices: ['7', '8', '9', '10'], answer: 1, explain: 'm(Ĉ) = 65°. 40° < 65° < 75° olduğundan |BC| < |AB| < |AC| → 7 < |AB| < 9.' },
    ],
  },
  {
    id: 'g8-ucgen-problemleri-hesapla',
    outcomes: ['MAT.8.3.6', 'MAT.8.3.5'],
    type: 'fill',
    title: 'Gerçek yaşamda dik üçgenler',
    instructions: 'Problemi bir dik üçgenle modelle ve sonucu bul.',
    level: 3,
    items: [
      { text: 'Bir uçurtmanın gergin ipi 25 m’dir. Uçurtma, ipi tutan Can’ın elinden yatayda 15 m uzaktaysa Can’ın elinden __ m yüksektedir.', answers: ['20'] },
      { text: 'Bir gemi limandan önce 9 km doğuya, sonra 12 km kuzeye gidiyor. Gemi limana kuş uçuşu __ km uzaklıktadır.', answers: ['15'] },
      { text: 'Kenarları 13 cm, 13 cm ve 10 cm olan ikizkenar üçgenin tabana ait yüksekliği __ cm’dir.', answers: ['12'], hint: 'Yükseklik tabanı iki eş parçaya ayırır: 5 cm ve 5 cm.' },
      { text: 'Kenarları 9 cm ve 12 cm olan bir dikdörtgenin köşegen uzunluğu __ cm’dir.', answers: ['15'] },
      { text: 'Dik kenarları 6 cm ve 8 cm olan bir dik üçgenin çevresi __ cm’dir.', answers: ['24'] },
      { text: 'Tekerlekli sandalye rampasının yatay uzunluğu 24 m, yüksekliği 7 m’dir. Rampanın eğik yüzeyi __ m’dir.', answers: ['25'] },
    ],
  },

  // ── Veriden Olasılığa ──────────────────────────────────────────────────
  {
    id: 'g8-olasilik-yaklasimlari',
    outcomes: ['MAT.8.7.1'],
    type: 'categorize',
    title: 'Öznel, deneysel, teorik',
    instructions: 'Her durumda hangi olasılık yaklaşımı kullanılmış? Doğru gruba sürükle.',
    level: 1,
    categories: [
      { id: 'oznel', label: 'Öznel', color: '#ec4899' },
      { id: 'deneysel', label: 'Deneysel' },
      { id: 'teorik', label: 'Teorik', color: '#22c55e' },
    ],
    items: [
      { content: 'Hava çok bulutlu; bence yarın yağmur yağma olasılığı yüksek.', category: 'oznel' },
      { content: 'Takımımızın bu maçı kazanacağını hissediyorum.', category: 'oznel' },
      { content: 'Selin, çok çalıştığı için sınavı geçme şansının yüksek olduğuna inanıyor.', category: 'oznel' },
      { content: 'Bir parayı 100 kez attım, 46 kez yazı geldi; yazı gelme olasılığı [[46/100]].', category: 'deneysel' },
      { content: 'Bir basketbolcu son 50 atışının 35’ini sokmuş; sokma olasılığı [[35/50]].', category: 'deneysel' },
      { content: 'Kantine gelen son 200 öğrenciden 120’si tost aldı; tost alma olasılığı [[120/200]].', category: 'deneysel' },
      { content: 'Bir zarın üst yüzüne 3 gelme olasılığı [[1/6]].', category: 'teorik' },
      { content: 'Torbada 3 kırmızı, 5 mavi top var; kırmızı çekme olasılığı [[3/8]].', category: 'teorik' },
      { content: '8 eş dilimli çarkın 2 dilimi sarı; sarı gelme olasılığı [[2/8]].', category: 'teorik' },
    ],
  },
  {
    id: 'g8-zar-deneyi',
    outcomes: ['MAT.8.7.1'],
    type: 'manipulative',
    title: 'Zar deneyi',
    instructions: 'Zarı birçok kez at, sonuçları gözlemle ve soruyu cevapla.',
    level: 2,
    tool: 'probability',
    config: { mode: 'dice' },
    tasks: [
      { prompt: 'Zarı birkaç kez at. Tek sayı gelme olayının teorik olasılığı nedir?', target: { question: 'Tek sayı (1, 3, 5) gelme teorik olasılığı nedir?', choices: ['1/2', '1/3', '1/6', '2/3'], answer: '1/2' } },
      { prompt: 'Zarı en az 30 kez at ve 6 gelme sıklığını incele.', target: { question: '6 gelmenin teorik olasılığı nedir?', choices: ['6/30', '1/6', '1/2', '1/3'], answer: '1/6' } },
      { prompt: 'Can zarı 10 kez attı ve 4 kez 6 geldi.', target: { question: 'Can’ın bulduğu deneysel olasılık nedir?', choices: ['1/6', '4/10', '6/10', '1/4'], answer: '4/10' } },
      { prompt: 'Zarı atmaya devam et ve toplam deneme sayısını artır.', target: { question: 'Deneme sayısı arttıkça deneysel olasılık için ne beklenir?', choices: ['Hep aynı kalır', '1’e yaklaşır', 'Teorik olasılığa yaklaşır', '0’a yaklaşır'], answer: 'Teorik olasılığa yaklaşır' } },
    ],
  },
  {
    id: 'g8-torba-deneyi',
    outcomes: ['MAT.8.7.1'],
    type: 'manipulative',
    title: 'Torbadan top çekme',
    instructions: 'Torbada 5 pembe ve 3 mavi özdeş top var. Önce tahmin et, sonra deney yap.',
    level: 2,
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Pembe', color: '#ec4899', weight: 5 }, { label: 'Mavi', color: '#3b82f6', weight: 3 }] },
    tasks: [
      { prompt: 'Deneye başlamadan önce tahmin et.', target: { question: 'Hangi renk topun çekilmesi daha olasıdır?', choices: ['Pembe', 'Mavi', 'Eşit olasılıklı'], answer: 'Pembe' } },
      { prompt: 'Torbadan en az 20 kez top çek (her seferinde topu geri koyarak).', target: { question: 'Mavi top çekmenin teorik olasılığı nedir?', choices: ['5/8', '3/8', '3/5', '1/2'], answer: '3/8' } },
      { prompt: 'Çekiliş sayısını artırmaya devam et.', target: { question: 'Pembe top çekmenin deneysel olasılığı hangi değere yaklaşır?', choices: ['3/8', '1', '5/8', '1/2'], answer: '5/8' } },
    ],
  },
  {
    id: 'g8-olasilik-karar',
    outcomes: ['MAT.8.7.1'],
    type: 'quiz',
    title: 'Olasılıkla karar ver',
    instructions: 'Duruma uygun olasılık yaklaşımını seç ve karar ver.',
    level: 2,
    questions: [
      { prompt: 'Zeynep, kantindeki simitlerin bugün öğleden önce bitip bitmeyeceğini tahmin etmek istiyor. Son 30 günün 24’ünde simitler öğleden önce bitmiş. Hangi yaklaşım daha uygundur?', choices: ['Öznel olasılık', 'Teorik olasılık', 'Deneysel olasılık (geçmiş veriler)', 'Hiçbiri'], answer: 2 },
      { prompt: 'Bir zarın hileli olup olmadığına karar vermek isteyen Can ne yapmalıdır?', choices: ['Zarı bir kez atmalı', 'Zarı çok sayıda atıp deneysel olasılıkları teorik olasılık [[1/6]] ile karşılaştırmalı', 'Zarın rengine bakmalı', 'Arkadaşlarının fikrini sormalı'], answer: 1 },
      { prompt: 'Bir para 10 kez atıldığında 7 kez tura geldi. Hangisi doğrudur?', choices: ['Tura gelme teorik olasılığı [[7/10]]’dur.', 'Bir sonraki atış kesinlikle yazı gelir.', 'Para kesinlikle hilelidir.', 'Tura gelme deneysel olasılığı [[7/10]]’dur; atış sayısı artarsa [[1/2]]’ye yaklaşması beklenir.'], answer: 3 },
      { prompt: 'Bir çark 8 eş dilimden oluşuyor ve 3 dilimi kırmızı. Kırmızı gelme teorik olasılığı nedir?', choices: ['[[5/8]]', '[[3/8]]', '[[3/5]]', '[[1/3]]'], answer: 1 },
      { prompt: 'Bir çark 40 kez çevrildi ve 12 kez sarı geldi. Sarı gelme deneysel olasılığı nedir?', choices: ['[[12/40]]', '[[28/40]]', '[[12/28]]', '[[1/12]]'], answer: 0 },
      { prompt: 'Ali bu sezon 40 serbest atışın 30’unu sokmuştur. Sonraki atışı sokma olasılığı için en uygun tahmin hangisidir?', choices: ['[[1/2]], çünkü top ya girer ya girmez', '1, çünkü Ali iyi bir oyuncudur', '[[3/4]], geçmiş atışlara göre (deneysel)', '[[1/4]]'], answer: 2, explain: 'Girme ve girmeme eş olasılıklı değildir; bu durumda deneysel veri daha uygundur.' },
      { prompt: 'Deney sayısı arttıkça deneysel olasılık için hangisi beklenir?', choices: ['Teorik olasılık değerine yaklaşır.', 'Her zaman 1 olur.', 'Teorik olasılıktan uzaklaşır.', '0’a yaklaşır.'], answer: 0 },
    ],
  },
  {
    id: 'g8-deneysel-olasilik-hesapla',
    outcomes: ['MAT.8.7.1'],
    type: 'fill',
    title: 'Deneysel ve teorik olasılık',
    instructions: 'Olasılığı kesir (ör. 3/8) ya da ondalık gösterimle yaz.',
    level: 2,
    items: [
      { text: 'Bir para 50 kez atıldı ve 28 kez tura geldi. Tura gelme deneysel olasılığı __', answers: ['28/50|14/25|0,56'] },
      { text: 'Bir zar 60 kez atıldı ve 12 kez 5 geldi. 5 gelme deneysel olasılığı __, teorik olasılığı __', answers: ['12/60|1/5|0,2|6/30', '1/6'] },
      { text: 'Torbada 4 kırmızı, 6 beyaz top var. Kırmızı top çekme teorik olasılığı __', answers: ['4/10|2/5|0,4'] },
      { text: 'Bir zarın üst yüzüne asal sayı gelme teorik olasılığı __', answers: ['3/6|1/2|0,5'], hint: '1’den 6’ya kadar asal sayılar: 2, 3, 5' },
      { text: 'Kantine gelen son 200 öğrenciden 120’si ayran aldı. Ayran alma deneysel olasılığı __', answers: ['120/200|3/5|0,6|12/20|6/10'] },
      { text: '10 eş dilimli bir çarkın 7 dilimi mavi. Mavi GELMEME teorik olasılığı __', answers: ['3/10|0,3'] },
    ],
  },

  // ── Cebirsel Düşünme ve Değişimler ─────────────────────────────────────
  {
    id: 'g8-koordinat-oku',
    outcomes: ['MAT.8.2.1'],
    type: 'quiz',
    title: 'Noktanın koordinatları',
    instructions: 'Önce apsisi (x), sonra ordinatı (y) oku.',
    level: 1,
    generator: { id: 'coordRead', params: { range: 6 }, count: 8 },
  },
  {
    id: 'g8-koordinat-kavramlari',
    outcomes: ['MAT.8.2.1'],
    type: 'match',
    title: 'Koordinat sistemi kavramları',
    instructions: 'Kavramları açıklamaları ya da örnekleriyle eşleştir.',
    level: 1,
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
  {
    id: 'g8-noktayi-yerlestir',
    outcomes: ['MAT.8.2.1'],
    type: 'manipulative',
    title: 'Noktayı yerleştir',
    instructions: 'Koordinat düzleminde istenen noktayı işaretle.',
    level: 2,
    tool: 'coordinate',
    config: { size: 6 },
    tasks: [
      { prompt: 'Sinema salonunun planında Ayşe’nin koltuğu (3, −2) noktasında. Bu noktayı işaretle.', target: { x: 3, y: -2 } },
      { prompt: 'Apsisi −4, ordinatı 1 olan noktayı işaretle.', target: { x: -4, y: 1 } },
      { prompt: 'x ekseni üzerinde bulunan ve apsisi −3 olan noktayı işaretle.', target: { x: -3, y: 0 } },
      { prompt: 'III. bölgede olan, x eksenine 2 birim ve y eksenine 5 birim uzaklıktaki noktayı işaretle.', target: { x: -5, y: -2 } },
    ],
  },
  {
    id: 'g8-bolgeler',
    outcomes: ['MAT.8.2.1'],
    type: 'categorize',
    title: 'Nokta hangi bölgede?',
    instructions: 'Apsis ve ordinatın işaretine bakarak her noktayı bulunduğu bölgeye sürükle.',
    level: 1,
    categories: [
      { id: 'b1', label: 'I. bölge', color: '#22c55e' },
      { id: 'b2', label: 'II. bölge' },
      { id: 'b3', label: 'III. bölge', color: '#a855f7' },
      { id: 'b4', label: 'IV. bölge', color: '#f97316' },
    ],
    items: [
      { content: '(2, 3)', category: 'b1' },
      { content: '(4, 1)', category: 'b1' },
      { content: '(−1, 4)', category: 'b2' },
      { content: '(−4, 2)', category: 'b2' },
      { content: '(−5, −2)', category: 'b3' },
      { content: '(−3, −3)', category: 'b3' },
      { content: '(3, −6)', category: 'b4' },
      { content: '(6, −1)', category: 'b4' },
    ],
  },
  {
    id: 'g8-dogrusal-fonksiyon-degeri',
    outcomes: ['MAT.8.2.2'],
    type: 'fill',
    title: 'Fonksiyonun değeri',
    instructions: 'x değerini denklemde yerine koy ve y’yi bul.',
    level: 1,
    generator: { id: 'linear', params: { max: 8 }, count: 8 },
  },
  {
    id: 'g8-durum-fonksiyon-eslestir',
    outcomes: ['MAT.8.2.2'],
    type: 'match',
    title: 'Durumdan fonksiyona',
    instructions: 'Her gerçek yaşam durumunu onu modelleyen doğrusal fonksiyonla eşleştir (x: bağımsız değişken).',
    level: 2,
    pairs: [
      { left: 'Taksi: açılış 20 TL, kilometre başına 15 TL', right: 'f(x) = 15x + 20' },
      { left: 'Tanesi 12 TL olan kalemlerden x tane', right: 'f(x) = 12x' },
      { left: 'Kullanımdan bağımsız, aylık 200 TL sabit tarife', right: 'f(x) = 200' },
      { left: '50 L su bulunan depodan dakikada 2 L su boşalıyor', right: 'f(x) = 50 − 2x' },
      { left: 'Dakikada 200 m koşan bir maratoncu', right: 'f(x) = 200x' },
      { left: '20 cm’lik mum saatte 3 cm kısalıyor', right: 'f(x) = 20 − 3x' },
      { left: 'Spor salonu: üyelik 100 TL, her ders 30 TL', right: 'f(x) = 30x + 100' },
    ],
  },
  {
    id: 'g8-dogrusal-temsiller',
    outcomes: ['MAT.8.2.2'],
    type: 'quiz',
    title: 'Grafik, tablo ve denklem',
    instructions: 'Doğrusal fonksiyonların farklı temsilleri arasında geçiş yap.',
    level: 2,
    questions: [
      { prompt: { text: 'Grafiği verilen doğrusal fonksiyon hangisidir?', visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: 1 }], points: [{ x: 0, y: 1 }, { x: 1, y: 3 }] } }, choices: ['f(x) = x + 2', 'f(x) = 2x + 1', 'f(x) = 2x − 1', 'f(x) = −2x + 1'], answer: 1 },
      { prompt: { text: 'Grafiği verilen doğrusal fonksiyon hangisidir?', visual: { kind: 'coords', range: 5, lines: [{ m: -1, b: 3 }], points: [{ x: 0, y: 3 }, { x: 3, y: 0 }] } }, choices: ['f(x) = x + 3', 'f(x) = −x − 3', 'f(x) = 3x', 'f(x) = −x + 3'], answer: 3 },
      { prompt: { text: 'Tablodaki doğrusal ilişkinin eğimi (değişim oranı) kaçtır?', visual: { kind: 'table', headers: ['x', '0', '1', '2', '3'], rows: [['f(x)', 4, 7, 10, 13]] } }, choices: ['3', '4', '13', '[[1/3]]'], answer: 0, explain: 'x 1 arttıkça f(x) 3 artıyor.' },
      { prompt: 'Bir telefon tarifesinde aylık ücret f(x) = 2x + 150 (x: konuşma süresi, dakika) ise bağımsız değişken hangisidir?', choices: ['Aylık ücret', 'Konuşma süresi', '150 TL', '2 TL'], answer: 1 },
      { prompt: { text: 'Grafikteki doğru hangi fonksiyona aittir?', visual: { kind: 'coords', range: 5, lines: [{ m: 0, b: -2 }] } }, choices: ['f(x) = −2x', 'f(x) = x − 2', 'f(x) = −2', 'f(x) = 2'], answer: 2 },
      { prompt: 'f(x) = 3x ve g(x) = 5x doğrularından hangisinin grafiği daha diktir?', choices: ['f(x) = 3x', 'İkisi aynı diklikte', 'Karar verilemez', 'g(x) = 5x, çünkü eğimi daha büyüktür'], answer: 3 },
      { prompt: 'Bir fidan her hafta 2 cm uzuyor. Başlangıçta boyu 6 cm ise 5. haftanın sonunda boyu kaç cm olur?', choices: ['10', '16', '12', '30'], answer: 1, explain: 'f(x) = 2x + 6 → f(5) = 16' },
      { prompt: 'Hangi tablo doğrusal bir ilişki GÖSTERMEZ?', choices: ['x: 1, 2, 3 → y: 5, 7, 9', 'x: 1, 2, 3 → y: 2, 4, 6', 'x: 1, 2, 3 → y: 10, 8, 6', 'x: 1, 2, 3 → y: 1, 4, 9'], answer: 3, explain: '1, 4, 9 dizisinde artış miktarı (3, 5) sabit değildir.' },
    ],
  },
  {
    id: 'g8-tablodan-fonksiyona',
    outcomes: ['MAT.8.2.2'],
    type: 'fill',
    title: 'Tablodan fonksiyona',
    instructions: 'Tablo, grafik ve denklem arasında geçiş yaparak boşlukları doldur.',
    level: 2,
    items: [
      { text: 'Bir depoya dolan su tabloda verilmiştir. Eğim (değişim oranı) __', answers: ['3'], visual: TABLO_DEPO },
      { text: 'Bu ilişkiyi gösteren fonksiyon: f(x) = 3x + __', answers: ['5'], visual: TABLO_DEPO },
      { text: '10. dakikada depoda f(10) = __ litre su olur.', answers: ['35'], visual: TABLO_DEPO },
      { text: 'Taksi ücreti f(x) = 15x + 20 (x: km). 8 km yol giden Elif __ TL öder.', answers: ['140'] },
      { text: 'Aynı taksiyle 230 TL ödeyen Mehmet __ km yol gitmiştir.', answers: ['14'] },
      { text: 'Grafikteki doğrunun eğimi __', answers: ['2'], visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: -1 }], points: [{ x: 0, y: -1, label: 'A' }, { x: 2, y: 3, label: 'B' }] }, hint: 'Eğim = dikey değişim / yatay değişim' },
      { text: 'Bu doğrunun denklemi y = 2x + b ise b = __', answers: ['-1'], visual: { kind: 'coords', range: 5, lines: [{ m: 2, b: -1 }], points: [{ x: 0, y: -1, label: 'A' }, { x: 2, y: 3, label: 'B' }] } },
    ],
  },
  {
    id: 'g8-dogrularin-durumu',
    outcomes: ['MAT.8.2.3'],
    type: 'quiz',
    title: 'Paralel mi, dik mi?',
    instructions: 'Eğimleri eşit doğrular paraleldir; eğimlerinin çarpımı −1 olan doğrular diktir.',
    level: 2,
    questions: [
      { prompt: { text: 'Grafikteki iki doğrunun birbirine göre durumu nedir?', visual: { kind: 'coords', range: 5, lines: [{ m: 1, b: 2 }, { m: 1, b: -1 }] } }, choices: ['Diktir.', 'Paraleldir.', 'Dik olmadan kesişir.', 'Çakışıktır.'], answer: 1 },
      { prompt: 'y = 2x + 1 doğrusuna paralel olan doğru hangisidir?', choices: ['y = −2x + 1', 'y = x + 1', 'y = 2x − 3', 'y = −[[1/2]]x + 1'], answer: 2 },
      { prompt: 'y = 2x + 1 doğrusuna dik olan doğru hangisidir?', choices: ['y = 2x + 5', 'y = −2x', 'y = [[1/2]]x', 'y = −[[1/2]]x + 4'], answer: 3, explain: '2 · (−[[1/2]]) = −1' },
      { prompt: { text: 'y = x + 1 ve y = −x + 3 doğrularının kesişim noktası hangisidir?', visual: { kind: 'coords', range: 5, lines: [{ m: 1, b: 1 }, { m: -1, b: 3 }] } }, choices: ['(1, 2)', '(2, 1)', '(0, 3)', '(−1, 0)'], answer: 0, explain: 'x + 1 = −x + 3 → x = 1, y = 2. Bu nokta iki doğrunun da üzerindedir.' },
      { prompt: 'Eğimlerinin çarpımı −1 olan iki doğru için hangisi doğrudur?', choices: ['Paraleldir.', 'Birbirine diktir.', 'Çakışıktır.', 'Hiç kesişmez.'], answer: 1 },
      { prompt: 'y = 4 ve y = −1 doğruları için hangisi doğrudur?', choices: ['Birbirine diktir.', 'Orijinde kesişir.', 'İkisi de x eksenine paraleldir; birbirine de paraleldir.', 'İkisi de y eksenine paraleldir.'], answer: 2 },
      { prompt: 'f(a) = b ve g(a) = b ise (a, b) noktası için ne söylenebilir?', choices: ['f ve g doğrularının kesişim noktasıdır.', 'İki doğrunun da eğimidir.', 'Yalnızca f doğrusunun üzerindedir.', 'Her zaman orijindir.'], answer: 0 },
      { prompt: 'y = mx + 5 doğrusu y = 3x − 2 doğrusuna paralel ise m kaçtır?', choices: ['−3', '5', '3', '−[[1/3]]'], answer: 2 },
    ],
  },
  {
    id: 'g8-dogru-ciftleri',
    outcomes: ['MAT.8.2.3'],
    type: 'categorize',
    title: 'Doğru çiftlerini grupla',
    instructions: 'Eğimleri karşılaştırarak her doğru çiftini doğru gruba sürükle.',
    level: 3,
    categories: [
      { id: 'paralel', label: 'Paralel', color: '#22c55e' },
      { id: 'dik', label: 'Dik kesişir', color: '#6366f1' },
      { id: 'kesisir', label: 'Dik olmadan kesişir', color: '#f97316' },
    ],
    items: [
      { content: 'y = 3x + 1 ve y = 3x − 4', category: 'paralel' },
      { content: 'y = 4 ve y = −2', category: 'paralel' },
      { content: 'y = −x ve y = −x + 6', category: 'paralel' },
      { content: 'y = 2x ve y = −[[1/2]]x + 1', category: 'dik' },
      { content: 'y = x + 2 ve y = −x + 5', category: 'dik' },
      { content: 'y = [[1/3]]x ve y = −3x + 2', category: 'dik' },
      { content: 'y = 2x + 1 ve y = 3x + 1', category: 'kesisir' },
      { content: 'y = 5x − 1 ve y = x + 7', category: 'kesisir' },
      { content: 'y = 4x ve y = −4x', category: 'kesisir' },
    ],
  },
  {
    id: 'g8-kesisim-noktasi',
    outcomes: ['MAT.8.2.3', 'MAT.8.2.2'],
    type: 'manipulative',
    title: 'Kesişim noktasını bul',
    instructions: 'Doğruların kesiştiği noktayı koordinat düzleminde işaretle.',
    level: 3,
    tool: 'coordinate',
    config: { size: 6 },
    tasks: [
      { prompt: 'y = x + 1 ve y = −x + 3 doğrularının kesişim noktasını işaretle.', target: { x: 1, y: 2 } },
      { prompt: 'y = 2x − 4 doğrusunun x eksenini kestiği noktayı işaretle.', target: { x: 2, y: 0 } },
      { prompt: 'y = −2x + 3 doğrusunun y eksenini kestiği noktayı işaretle.', target: { x: 0, y: 3 } },
      { prompt: 'y = 2x ve y = x + 3 doğrularının kesişim noktasını işaretle.', target: { x: 3, y: 6 } },
    ],
  },
  {
    id: 'g8-algoritma-adimlari',
    outcomes: ['MAT.8.2.4'],
    type: 'sort',
    title: 'Algoritmayı kur',
    instructions: 'Doğrusal fonksiyon problemlerinin çözüm adımlarını doğru sıraya koy.',
    level: 2,
    rounds: [
      { prompt: 'Celsius’u Fahrenheit’a çeviren algoritma (F = 9 · C : 5 + 32)', items: ['Başla', 'Celsius değerini (C) gir', 'C’yi 9 ile çarp', 'Sonucu 5’e böl', 'Sonuca 32 ekle', 'Fahrenheit değerini yazdır', 'Bitir'] },
      { prompt: 'Taksi ücretini hesaplayan algoritma (açılış 20 TL, km başına 15 TL)', items: ['Başla', 'Gidilen yolu (x km) gir', 'x’i 15 ile çarp', 'Sonuca açılış ücreti 20 TL’yi ekle', 'Toplam ücreti yazdır', 'Bitir'] },
      { prompt: 'Geri dönüşüm algoritması (toplanan atığın %60’ı geri dönüştürülüyor)', items: ['Başla', 'Toplanan atık miktarını (x kg) gir', 'Geri dönüştürülen miktarı hesapla: y = 0,6 · x', 'Eğer y > 30 ise “Hedefe ulaşıldı” yazdır', 'Bitir'] },
    ],
  },
  {
    id: 'g8-algoritmayi-calistir',
    outcomes: ['MAT.8.2.4'],
    type: 'fill',
    title: 'Algoritmayı çalıştır',
    instructions: 'Akış şemasındaki adımları sırayla uygula.',
    level: 2,
    items: [
      { text: 'Girdi x = 5 ise çıktı __', answers: ['13'], visual: ALGORITMA_2X3 },
      { text: 'Çıktı 21 ise girdi x = __', answers: ['9'], visual: ALGORITMA_2X3, hint: 'Adımları tersten uygula: önce 3 çıkar, sonra 2’ye böl.' },
      { text: 'Bu algoritma f(x) = __x + __ fonksiyonunu hesaplar.', answers: ['2', '3'], visual: ALGORITMA_2X3 },
      { text: 'C = 25 ise F = __', answers: ['77'], visual: ALGORITMA_CF },
      { text: 'C = −10 ise F = __', answers: ['14'], visual: ALGORITMA_CF },
      { text: 'Su faturası: sabit 40 TL + m³ başına 25 TL. 12 m³ su kullanan ailenin faturası __ TL', answers: ['340'] },
    ],
  },
  {
    id: 'g8-sozde-kod',
    outcomes: ['MAT.8.2.4'],
    type: 'quiz',
    title: 'Sözde kod ve akış şeması',
    instructions: 'Algoritmaları fonksiyonlarla ilişkilendir.',
    level: 3,
    questions: [
      { prompt: { text: 'Bu algoritma hangi fonksiyonu hesaplar?', visual: flow(['Başla', 'x’i oku', 'y ← 3 · x', 'y ← y − 2', 'y’yi yaz', 'Bitir']) }, choices: ['f(x) = 3(x − 2)', 'f(x) = 3x − 2', 'f(x) = 3x + 2', 'f(x) = x − 6'], answer: 1 },
      { prompt: 'f(x) = 4x + 10 fonksiyonunu hesaplayan algoritmanın adımları hangisidir?', choices: ['x’i oku → 10 ekle → 4 ile çarp → yaz', 'x’i oku → 4 ekle → 10 ile çarp → yaz', 'x’i oku → 4 ile çarp → 10 ekle → yaz', '10’u oku → x ile çarp → 4 ekle → yaz'], answer: 2 },
      { prompt: 'Bir aracın deposunda 50 L yakıt var ve araç her km’de 0,1 L yakıt harcıyor. Kalan yakıtı hesaplayan algoritmada girdi ve çıktı nedir?', choices: ['Girdi: gidilen yol, çıktı: kalan yakıt', 'Girdi: kalan yakıt, çıktı: gidilen yol', 'Girdi: 50 L, çıktı: 0,1 L', 'Girdi ve çıktı aynıdır'], answer: 0 },
      { prompt: 'Aynı araç için kalan yakıtı veren fonksiyon hangisidir? (x: gidilen yol, km)', choices: ['f(x) = 0,1x − 50', 'f(x) = 50x − 0,1', 'f(x) = 50 + 0,1x', 'f(x) = 50 − 0,1x'], answer: 3 },
      { prompt: 'Akış şemasında karar (koşul) adımı hangi şekille gösterilir?', choices: ['Daire', 'Eşkenar dörtgen (baklava dilimi)', 'Dikdörtgen', 'Üçgen'], answer: 1 },
      { prompt: 'Doğrusal bir fonksiyonu hesaplayan algoritma x = 4 için 11, x = 6 için 15 çıktısını veriyor. x = 10 için çıktı nedir?', choices: ['25', '19', '23', '20'], answer: 2, explain: 'x 2 artınca çıktı 4 artıyor; eğim 2. f(x) = 2x + 3 → f(10) = 23.' },
    ],
  },

  // ── Geometrik Nicelikler ───────────────────────────────────────────────
  {
    id: 'g8-acinimlar',
    outcomes: ['MAT.8.4.1'],
    type: 'manipulative',
    title: 'Açınımdan cisme',
    instructions: 'Açınımı incele: katlanınca hangi cisim oluşur?',
    level: 1,
    tool: 'nets',
    tasks: [
      { prompt: 'Açınımda 2 üçgen ve 3 dikdörtgen var. Hangi cisim oluşur?', target: { solid: 'triangular-prism' } },
      { prompt: 'Açınımda 1 kare ve 4 eş ikizkenar üçgen var. Hangi cisim oluşur?', target: { solid: 'pyramid' } },
      { prompt: 'Açınımda 2 daire ve 1 dikdörtgen var. Hangi cisim oluşur?', target: { solid: 'cylinder' } },
      { prompt: 'Açınımda 1 daire ve 1 daire dilimi var. Hangi cisim oluşur?', target: { solid: 'cone' } },
    ],
  },
  {
    id: 'g8-acinimdaki-sekiller',
    outcomes: ['MAT.8.4.1'],
    type: 'match',
    title: 'Açınımdaki şekiller',
    instructions: 'Her cismi yüzey açınımında bulunan şekillerle eşleştir.',
    level: 2,
    pairs: [
      { left: 'Üçgen dik prizma', right: '2 üçgen + 3 dikdörtgen' },
      { left: 'Beşgen dik prizma', right: '2 beşgen + 5 dikdörtgen' },
      { left: 'Dikdörtgen dik piramit', right: '1 dikdörtgen + ikişer eş 4 ikizkenar üçgen' },
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
    title: 'Cisimlerin elemanları',
    instructions: 'Cisimlerin elemanlarını ve açınımlarındaki şekiller arasındaki ilişkileri düşün.',
    level: 2,
    questions: [
      { prompt: { text: 'Dik dairesel konide tepe noktasını taban çemberi üzerindeki bir noktaya birleştiren doğru parçasına ne denir?', visual: { kind: 'shape', shape: 'cone' } }, choices: ['Yükseklik', 'Ana doğru', 'Yarıçap', 'Taban'], answer: 1 },
      { prompt: 'Koni açınımındaki daire diliminin yay uzunluğu neye eşittir?', choices: ['Ana doğrunun uzunluğuna', 'Koninin yüksekliğine', 'Taban çemberinin çevresine', 'Taban yarıçapına'], answer: 2 },
      { prompt: { text: 'Taban yarıçapı r, yüksekliği h olan silindirin yanal yüzeyi açıldığında oluşan dikdörtgenin kenarları nedir?', visual: { kind: 'shape', shape: 'cylinder' } }, choices: ['πr ve h', '2πr ve h', 'r ve h', '2r ve h'], answer: 1 },
      { prompt: 'Dikdörtgen dik piramidin yüzey açınımındaki üçgenler için hangisi doğrudur?', choices: ['3 eş üçgen vardır.', '4 eşkenar üçgen vardır.', '2 üçgen ve 3 dikdörtgen vardır.', '4 üçgen vardır; bunlar ikişer ikişer eş ikizkenar üçgenlerdir.'], answer: 3 },
      { prompt: 'Beşgen dik prizmanın yüzey açınımında toplam kaç yüz bulunur?', choices: ['5', '6', '7', '10'], answer: 2, explain: '2 beşgen taban + 5 dikdörtgen yan yüz = 7' },
      { prompt: 'Hangi cismin yüzey açınımında daire BULUNMAZ?', choices: ['Kare dik piramit', 'Silindir', 'Koni', 'Hepsinde bulunur'], answer: 0 },
    ],
  },
  {
    id: 'g8-silindir-yuzey-alani',
    outcomes: ['MAT.8.4.2'],
    type: 'fill',
    title: 'Silindirin yüzey alanı',
    instructions: 'Yüzey alanı = 2 taban alanı + yanal alan = 2πr² + 2πrh (π = 3)',
    level: 2,
    generator: { id: 'cylinder', params: { ask: 'surface' }, count: 6 },
  },
  {
    id: 'g8-silindir-yuzey-problemleri',
    outcomes: ['MAT.8.4.2'],
    type: 'fill',
    title: 'Açınımdan yüzey alanına',
    instructions: 'Silindirin açınımını düşünerek hesapla (π = 3).',
    level: 2,
    items: [
      { text: 'Dikdörtgenin uzun kenarı (taban çevresi) 2 · 3 · 3 = __ cm', answers: ['18'], visual: SILINDIR_ACINIM },
      { text: 'Yanal alan = 18 · 10 = __ cm²', answers: ['180'], visual: SILINDIR_ACINIM },
      { text: 'İki tabanın alanları toplamı 2 · 3 · 3^{2} = __ cm²', answers: ['54'], visual: SILINDIR_ACINIM },
      { text: 'Silindirin yüzey alanı __ cm²', answers: ['234'], visual: SILINDIR_ACINIM },
      { text: 'Yarıçapı 0,5 m, yüksekliği 4 m olan silindir biçimli bir sütunun yalnızca yan yüzü taşla kaplanacak. __ m² taş gerekir.', answers: ['12'] },
      { text: 'Çapı 8 cm, yüksekliği 12 cm olan bir konserve kutusunun etiketi yan yüzün tamamını kaplıyor. Etiketin alanı __ cm²', answers: ['288'] },
      { text: 'Üstü açık, taban yarıçapı 5 cm, yüksekliği 6 cm olan silindir biçimli kalemlik için __ cm² karton gerekir.', answers: ['255'], hint: 'Yalnızca bir taban vardır: πr² + 2πrh' },
    ],
  },
  {
    id: 'g8-silindir-yuzey-kavram',
    outcomes: ['MAT.8.4.2'],
    type: 'quiz',
    title: 'Yüzey alanı üzerine düşün',
    instructions: 'Silindirin açınımından yüzey alanına dair çıkarım yap.',
    level: 2,
    questions: [
      { prompt: 'Taban yarıçapı r, yüksekliği h olan dik dairesel silindirin yüzey alanı bağıntısı hangisidir?', choices: ['πr²h', '2πr² + 2πrh', '2πr + h', 'πr² + πrh'], answer: 1 },
      { prompt: 'Bir silindirin yüksekliği değişmeden yarıçapı 2 katına çıkarılırsa yanal alanı nasıl değişir?', choices: ['4 katına çıkar.', 'Değişmez.', '2 katına çıkar.', 'Yarıya iner.'], answer: 2, explain: 'Yanal alan 2πrh; r iki katına çıkınca yanal alan da iki katına çıkar.' },
      { prompt: 'Bir silindirin yanal yüzey açınımının alanı 120 cm², yüksekliği 10 cm ise taban çevresi kaç cm’dir?', choices: ['12', '1200', '110', '24'], answer: 0 },
      { prompt: 'Erzurum’daki Çifte Minareli Medrese’nin minareleri silindire benzer. Bir minarenin dış yan yüzeyini kaplamak için hangisi hesaplanmalıdır?', choices: ['Hacim', 'Taban alanı', 'Yanal alan', 'Taban çevresi'], answer: 2 },
      { prompt: 'Bir silindir, tabanlarının merkezlerinden geçecek biçimde dikey olarak ikiye kesiliyor. Parçalardan birinin yüzeyinde hangi şekiller vardır?', choices: ['2 daire ve 1 dikdörtgen', '2 yarım daire, yanal yüzeyin yarısı ve 1 dikdörtgen', 'Yalnızca 2 yarım daire', '1 daire ve 1 dikdörtgen'], answer: 1 },
    ],
  },
  {
    id: 'g8-silindir-hacmi',
    outcomes: ['MAT.8.4.3'],
    type: 'fill',
    title: 'Silindirin hacmi',
    instructions: 'Hacim = taban alanı · yükseklik = πr²h (π = 3)',
    level: 2,
    generator: { id: 'cylinder', params: { ask: 'volume' }, count: 6 },
  },
  {
    id: 'g8-silindir-hacim-analoji',
    outcomes: ['MAT.8.4.3'],
    type: 'quiz',
    title: 'Daireden silindire',
    instructions: 'Dairenin alan bağıntısının nasıl oluştuğunu hatırla ve silindirin hacmine uyarla.',
    level: 3,
    questions: [
      { prompt: 'Bir daire çok sayıda eş dilime ayrılıp dilimler ters düz dizildiğinde yaklaşık olarak hangi şekil oluşur?', choices: ['Kare', 'Kenarları πr ve r olan dikdörtgen', 'Üçgen', 'Çember'], answer: 1 },
      { prompt: 'Bir silindir çok sayıda eş dilime ayrılıp dilimler ters düz birleştirildiğinde hangi cisme yaklaşır?', choices: ['Koni', 'Küre', 'Dikdörtgenler prizması', 'Piramit'], answer: 2 },
      { prompt: 'Oluşan dikdörtgenler prizmasının ayrıtları silindirin hangi elemanlarına eşittir?', choices: ['h, 2r ve 2πr', 'r, r ve h', 'πr², h ve r', 'h, r ve πr (taban çevresinin yarısı)'], answer: 3 },
      { prompt: 'Buna göre silindirin hacmi nedir?', choices: ['πr²h (taban alanı · yükseklik)', '2πrh', 'πr²', '2πr² + 2πrh'], answer: 0 },
      { prompt: 'Yüksekliği aynı kalan bir silindirin yarıçapı 2 katına çıkarılırsa hacmi kaç katına çıkar?', choices: ['2', '4', '8', 'Değişmez'], answer: 1, explain: 'Hacim r² ile orantılıdır: 2² = 4.' },
      { prompt: 'Taban alanı 50 cm², yüksekliği 8 cm olan silindirin hacmi kaç cm³’tür?', choices: ['58', '200', '400', '800'], answer: 2 },
      { prompt: 'Taban yarıçapı 10 cm, yüksekliği 20 cm olan silindir biçimli bir sürahi kaç litre su alır? (π = 3, 1 L = 1000 cm³)', choices: ['60', '6', '0,6', '600'], answer: 1, explain: '3 · 10² · 20 = 6000 cm³ = 6 L' },
    ],
  },
  {
    id: 'g8-silindir-sirala',
    outcomes: ['MAT.8.4.3', 'MAT.8.4.2'],
    type: 'sort',
    title: 'Silindirleri karşılaştır',
    instructions: 'π = 3 alarak hesapla ve sırala.',
    level: 3,
    rounds: [
      { prompt: 'Silindirleri hacimlerine göre küçükten büyüğe sırala.', items: ['r = 3 cm, h = 1 cm', 'r = 1 cm, h = 10 cm', 'r = 2 cm, h = 3 cm', 'r = 2 cm, h = 5 cm'], ends: ['En küçük hacim', 'En büyük hacim'] },
      { prompt: 'Silindirleri hacimlerine göre küçükten büyüğe sırala.', items: ['r = 1 cm, h = 20 cm', 'r = 2 cm, h = 6 cm', 'r = 5 cm, h = 1 cm', 'r = 3 cm, h = 3 cm'], ends: ['En küçük hacim', 'En büyük hacim'] },
      { prompt: 'Silindirleri yüzey alanlarına göre küçükten büyüğe sırala.', items: ['r = 1 cm, h = 4 cm', 'r = 2 cm, h = 1 cm', 'r = 1 cm, h = 9 cm', 'r = 3 cm, h = 1 cm'], ends: ['En küçük alan', 'En büyük alan'] },
    ],
  },

  // ── İstatistiksel Araştırma Süreci ─────────────────────────────────────
  {
    id: 'g8-veri-turleri',
    outcomes: ['MAT.8.6.1'],
    type: 'categorize',
    title: 'Kategorik mi, nicel mi?',
    instructions: 'Sayılarak elde edilen nicel veri kesikli, ölçülerek elde edilen nicel veri süreklidir. Grupla.',
    level: 1,
    categories: [
      { id: 'kategorik', label: 'Kategorik', color: '#ec4899' },
      { id: 'kesikli', label: 'Nicel (kesikli)' },
      { id: 'surekli', label: 'Nicel (sürekli)', color: '#22c55e' },
    ],
    items: [
      { content: 'En sevilen spor dalı', category: 'kategorik' },
      { content: 'Göz rengi', category: 'kategorik' },
      { content: 'Okula ulaşım aracı türü', category: 'kategorik' },
      { content: 'Kan grubu', category: 'kategorik' },
      { content: 'Kardeş sayısı', category: 'kesikli' },
      { content: 'Bir günde okunan sayfa sayısı', category: 'kesikli' },
      { content: 'Bir ailedeki araba sayısı', category: 'kesikli' },
      { content: 'Öğrencilerin boy uzunlukları', category: 'surekli' },
      { content: 'Okula varış süresi', category: 'surekli' },
      { content: 'Günlük hava sıcaklığı', category: 'surekli' },
    ],
  },
  {
    id: 'g8-veri-ozetleme',
    outcomes: ['MAT.8.6.1'],
    type: 'fill',
    title: 'Veriyi özetle',
    instructions: 'Aritmetik ortalama, ortanca, tepe değer ve açıklığı hesapla.',
    level: 2,
    generator: { id: 'stats', params: { stats: ['mean', 'median', 'mode', 'range'] }, count: 8 },
  },
  {
    id: 'g8-ortalama-mutlak-sapma',
    outcomes: ['MAT.8.6.1'],
    type: 'fill',
    title: 'Merkez ve yayılım',
    instructions: 'Ortalama mutlak sapma: her verinin ortalamaya uzaklıklarının ortalaması.',
    level: 3,
    items: [
      { text: '2, 4, 6, 8 veri grubunun aritmetik ortalaması __', answers: ['5'] },
      { text: '2, 4, 6, 8 veri grubunun ortalama mutlak sapması __', answers: ['2'], hint: 'Ortalamaya uzaklıklar: 3, 1, 1, 3' },
      { text: '4, 6, 8, 10, 12 veri grubunun ortalama mutlak sapması __', answers: ['2,4'], hint: 'Ortalama 8; uzaklıklar: 4, 2, 0, 2, 4' },
      { text: '5 öğrencinin okuduğu kitap sayıları: 1, 2, 2, 3, 22. Aritmetik ortalama __, ortanca __', answers: ['6', '2'] },
      { text: 'Elif’in haftalık okuma süreleri (dk): 30, 45, 30, 60, 35. Açıklık __', answers: ['30'] },
      { text: 'Aynı verinin tepe değeri __ dk', answers: ['30'] },
    ],
  },
  {
    id: 'g8-arastirma-sureci',
    outcomes: ['MAT.8.6.1'],
    type: 'sort',
    title: 'İstatistiksel araştırma süreci',
    instructions: 'Araştırma sürecinin adımlarını ve kavramları doğru sıraya koy.',
    level: 2,
    rounds: [
      { prompt: 'İstatistiksel araştırmanın adımlarını sırala.', items: ['Araştırma sorusunu oluştur', 'Evreni ve örneklemi belirle', 'Veri toplama planı yap (anket hazırla)', 'Veriyi topla', 'Veriyi görselleştir ve özetle', 'Sonuçları yorumla ve karar ver'] },
      { prompt: 'Grupları kapsamı en dar olandan en geniş olana sırala.', items: ['Bir sınıftaki öğrenciler', 'Bir okuldaki öğrenciler', 'Bir ilçedeki öğrenciler', 'Bir ildeki öğrenciler', 'Türkiye’deki öğrenciler'], ends: ['En dar', 'En geniş'] },
    ],
  },
  {
    id: 'g8-grafik-ve-ozet-secimi',
    outcomes: ['MAT.8.6.1'],
    type: 'quiz',
    title: 'Doğru aracı seç',
    instructions: 'Araştırma sorusuna ve veri türüne uygun araçları seç.',
    level: 2,
    questions: [
      { prompt: 'Bir şehrin bir yıl boyunca aylık ortalama sıcaklığındaki değişimi göstermek için en uygun grafik hangisidir?', choices: ['Daire grafiği', 'Çizgi grafiği', 'Resim grafiği', 'Çetele tablosu'], answer: 1 },
      { prompt: '“İlimizdeki ortaokul öğrencileri günde kaç saat telefon kullanıyor?” araştırması için hangi örneklem daha uygundur?', choices: ['Yalnızca kendi sınıfımdaki öğrenciler', 'Yalnızca okulumuzdaki 8. sınıflar', 'İldeki farklı okullardan ve sınıf düzeylerinden rastgele seçilen öğrenciler', 'Yalnızca arkadaş grubum'], answer: 2 },
      { prompt: 'Hangisi istatistiksel bir araştırma sorusudur?', choices: ['Okulumuzun adı nedir?', 'Sınıfımızdaki öğrencilerin okula geliş süreleri nasıl dağılmaktadır?', 'Benim boyum kaç cm?', 'Bugün günlerden ne?'], answer: 1 },
      { prompt: 'Bir veri grubunda çok uç bir değer (aykırı değer) varsa merkezî eğilim ölçülerinden hangisi veriyi daha iyi temsil eder?', choices: ['Ortanca', 'Aritmetik ortalama', 'Açıklık', 'Hiçbiri'], answer: 0 },
      { prompt: '“En sevilen meyve” verisi için hangi özetleme aracı kullanılabilir?', choices: ['Aritmetik ortalama', 'Ortanca', 'Açıklık', 'Tepe değer'], answer: 3, explain: 'Kategorik veride sayısal ortalama hesaplanamaz; en çok tekrar eden kategori (tepe değer) bulunur.' },
      { prompt: 'İki sınıfın matematik puan ortalamaları eşittir. A sınıfında açıklık 20, B sınıfında 60’tır. Hangisi doğrudur?', choices: ['B sınıfı daha başarılıdır.', 'A sınıfının puanları ortalama etrafında daha az yayılmıştır.', 'A sınıfı daha başarılıdır.', 'İki sınıfın puanları aynıdır.'], answer: 1 },
      { prompt: 'Anket hazırlarken mahremiyet için hangisi yapılmalıdır?', choices: ['Telefon numaraları toplanmalı', 'Cevaplar sosyal medyada paylaşılmalı', 'Katılımcıların isimleri istenmemeli ve gerekli izinler alınmalı', 'Katılımcıların adresleri yazılmalı'], answer: 2 },
    ],
  },
  {
    id: 'g8-sutun-grafigi-olustur',
    outcomes: ['MAT.8.6.1'],
    type: 'manipulative',
    title: 'Sütun grafiği oluştur',
    instructions: 'Tablodaki veriye göre sütunların yüksekliğini ayarla.',
    level: 1,
    tool: 'bargraph',
    tasks: [
      { prompt: '8-A sınıfının seçmeli ders tercihleri tabloda verilmiştir. Sütun grafiğini oluştur.', target: { data: [{ label: 'Robotik', value: 9 }, { label: 'Satranç', value: 5 }, { label: 'Drama', value: 7 }, { label: 'Spor', value: 11 }] } },
      { prompt: 'Okul kütüphanesinden bir haftada ödünç alınan kitap sayılarının sütun grafiğini oluştur.', target: { data: [{ label: 'Pzt', value: 6 }, { label: 'Salı', value: 4 }, { label: 'Çrş', value: 8 }, { label: 'Prş', value: 3 }, { label: 'Cuma', value: 10 }] } },
    ],
  },
  {
    id: 'g8-yaniltici-yorumlar',
    outcomes: ['MAT.8.6.2'],
    type: 'quiz',
    title: 'Yanıltıcı yorumları yakala',
    instructions: 'Başkalarının oluşturduğu grafik ve yorumları eleştirel gözle incele.',
    level: 3,
    questions: [
      { prompt: { text: 'Bir haber sitesi bu grafikle “B markasının satışı A’nın 3 katı!” diyor. Bu yorum için hangisi doğrudur?', visual: barChart([{ label: 'A', value: 102 }, { label: 'B', value: 106 }], 100, 107, 1, 'Satış (bin adet)') }, choices: ['Doğrudur; B’nin sütunu 3 kat uzundur.', 'Yanlıştır; dikey eksen 100’den başladığı için fark abartılmıştır.', 'Doğrudur; B daha çok satılmıştır.', 'Grafikten hiçbir şey söylenemez.'], answer: 1, explain: 'Gerçek değerler 102 bin ve 106 bin; fark yalnızca yaklaşık %4’tür.' },
      { prompt: 'Basketbol kulübü üyelerine “En sevdiğiniz spor hangisi?” diye soran Kerem, “Okulumuzun en sevdiği spor basketboldur.” sonucuna varıyor. Bu çıkarımdaki sorun nedir?', choices: ['Soru açık değildir.', 'Veri sayısal değildir.', 'Örneklem yanlıdır; okulu temsil etmez.', 'Sonuç doğrudur.'], answer: 2 },
      { prompt: { text: 'Ayşe: “Kantinde en çok satış perşembe günü yapılmıştır.” Bu yorum için hangisi doğrudur?', visual: { kind: 'bars', title: 'Kantin satışları', data: [{ label: 'Pzt', value: 40 }, { label: 'Salı', value: 35 }, { label: 'Çrş', value: 50 }, { label: 'Prş', value: 45 }, { label: 'Cuma', value: 30 }] } }, choices: ['Doğrudur.', 'Yanlıştır; en çok satış çarşamba günü yapılmıştır.', 'Grafikte perşembe yoktur.', 'Satışlar her gün eşittir.'], answer: 1 },
      { prompt: 'Bir sokaktaki 5 evin aylık elektrik faturaları: 300, 320, 310, 330 ve 2.240 TL. Haberde “Sokakta ortalama fatura 700 TL” deniyor. En doğru değerlendirme hangisidir?', choices: ['Hesap doğru ama aykırı değer yüzünden ortalama yanıltıcıdır; ortanca (320 TL) daha iyi temsil eder.', 'Hesap yanlıştır.', 'Evlerin çoğu 700 TL civarında öder.', 'Ortanca da 700 TL’dir.'], answer: 0 },
      { prompt: '“Araştırmaya katılan 10 kişiden 8’i bu diş macununu öneriyor.” Bu reklamdaki sonuç neden sorgulanmalıdır?', choices: ['8 çift sayıdır.', 'Yüzde kullanılmamıştır.', 'Bütün diş macunları aynıdır.', 'Örneklem çok küçüktür ve nasıl seçildiği belli değildir.'], answer: 3 },
      { prompt: 'Bir şirket, yıl boyunca dalgalanan satışlarından yalnızca son iki ayı gösterip “Satışlarımız sürekli artıyor.” diyor. Bu ne tür bir hatadır?', choices: ['Verinin bir kısmını seçerek yanlı sonuç çıkarmak', 'Doğru bir genelleme', 'Yalnızca hesaplama hatası', 'Hata yoktur'], answer: 0 },
    ],
  },
  {
    id: 'g8-cikarim-gecerli-mi',
    outcomes: ['MAT.8.6.2'],
    type: 'categorize',
    title: 'Çıkarım veriyle destekleniyor mu?',
    instructions: 'Bir okulda rastgele seçilen 200 öğrenciye en sevdikleri ders soruldu: Matematik 70, Türkçe 50, Fen Bilimleri 45, İngilizce 35. Her çıkarımı doğru gruba koy.',
    level: 3,
    categories: [
      { id: 'destek', label: 'Veriyle desteklenir', color: '#22c55e' },
      { id: 'hatali', label: 'Desteklenmez / hatalı', color: '#ef4444' },
    ],
    items: [
      { content: 'En çok tercih edilen ders matematiktir.', category: 'destek' },
      { content: 'Öğrencilerin %35’i matematiği tercih etmiştir.', category: 'destek' },
      { content: 'Türkçeyi tercih edenler İngilizceyi tercih edenlerden 15 kişi fazladır.', category: 'destek' },
      { content: 'Matematiği tercih edenler, İngilizceyi tercih edenlerin 2 katıdır.', category: 'destek' },
      { content: 'Okuldaki tüm öğrenciler matematiği sever.', category: 'hatali' },
      { content: 'Türkiye’deki tüm öğrencilerin en sevdiği ders matematiktir.', category: 'hatali' },
      { content: 'İngilizce zor bir derstir.', category: 'hatali' },
      { content: 'Matematiği tercih edenler en başarılı öğrencilerdir.', category: 'hatali' },
      { content: 'Öğrencilerin yarısından fazlası matematiği tercih etmiştir.', category: 'hatali' },
    ],
  },

  // ── Dönüşüm ────────────────────────────────────────────────────────────
  {
    id: 'g8-oteleme-ozellikleri',
    outcomes: ['MAT.8.5.1'],
    type: 'quiz',
    title: 'Öteleme dönüşümü',
    instructions: 'Ötelemede şeklin her noktası aynı yönde ve eşit uzaklıkta yer değiştirir.',
    level: 1,
    questions: [
      {
        prompt: {
          text: 'Mavi üçgen, turuncu üçgenin öteleme altındaki görüntüsüdür. Öteleme nasıl yapılmıştır?',
          visual: gridShapes(9, 6, [
            { pts: [[1, 1], [3, 1], [1, 3]], color: '#f97316' },
            { pts: [[5, 3], [7, 3], [5, 5]], color: '#3b82f6' },
          ]),
        },
        choices: ['2 birim sağa, 4 birim yukarı', '4 birim sağa, 2 birim yukarı', '4 birim sola, 2 birim aşağı', '4 birim sağa, 2 birim aşağı'],
        answer: 1,
      },
      { prompt: 'Öteleme dönüşümünde bir şekil ile görüntüsü için hangisi doğrudur?', choices: ['Benzerdir ama eş değildir.', 'Görüntü her zaman daha büyüktür.', 'Eştir; kenar uzunlukları ve açı ölçüleri korunur.', 'Şeklin duruşu ters döner.'], answer: 2 },
      { prompt: 'Hangisi bir öteleme örneğidir?', choices: ['Saat yelkovanının hareketi', 'Asansörün katlar arasındaki hareketi', 'Aynadaki görüntümüz', 'Kapının menteşesi etrafında açılması'], answer: 1 },
      { prompt: 'Bir şekil ötelendiğinde şeklin noktaları için hangisi doğrudur?', choices: ['Aynı yönde, eşit uzaklıkta yer değiştirir.', 'Farklı yönlerde hareket eder.', 'Bir noktanın etrafında döner.', 'Bir doğruya göre ters döner.'], answer: 0 },
      { prompt: 'Çevresi 12 cm olan ABCD karesi 3 birim sola ötelenirse görüntünün çevresi kaç cm olur?', choices: ['15', '9', '12', '36'], answer: 2 },
      { prompt: 'Bir ötelemede A noktası 5 birim yer değiştirmiştir. Aynı ötelemede B noktası kaç birim yer değiştirir?', choices: ['Bilinemez', '5', '10', '0'], answer: 1 },
    ],
  },
  {
    id: 'g8-oteleme-mi',
    outcomes: ['MAT.8.5.1'],
    type: 'categorize',
    title: 'Öteleme mi?',
    instructions: 'Hareket bir öteleme dönüşümü mü? Doğru gruba sürükle.',
    level: 1,
    categories: [
      { id: 'oteleme', label: 'Öteleme' },
      { id: 'degil', label: 'Öteleme değil', color: '#f97316' },
    ],
    items: [
      { content: 'Asansörün yukarı çıkması', category: 'oteleme' },
      { content: 'Teleferik kabininin düz halat boyunca ilerlemesi', category: 'oteleme' },
      { content: 'Satrançta kalenin ileri gitmesi', category: 'oteleme' },
      { content: 'Çekmecenin dışarı çekilmesi', category: 'oteleme' },
      { content: 'Kilim motifinde aynı desenin yan yana tekrarlanması', category: 'oteleme' },
      { content: 'Saat yelkovanının hareketi', category: 'degil' },
      { content: 'Aynadaki görüntü', category: 'degil' },
      { content: 'Pervanenin dönmesi', category: 'degil' },
      { content: 'Kapının menteşe etrafında açılması', category: 'degil' },
    ],
  },
  {
    id: 'g8-oteleme-kurali',
    outcomes: ['MAT.8.5.1'],
    type: 'fill',
    title: 'Ötelemenin yönü ve uzaklığı',
    instructions: 'Şekil ve görüntüsüne bakarak ötelemeyi belirle.',
    level: 2,
    items: [
      {
        text: 'Turuncu şekil __ birim sağa ve __ birim yukarı ötelenerek mavi şekil elde edilmiştir.',
        answers: ['4', '2'],
        visual: gridShapes(9, 6, [
          { pts: [[1, 0], [3, 0], [3, 2], [2, 3], [1, 2]], color: '#f97316' },
          { pts: [[5, 2], [7, 2], [7, 4], [6, 5], [5, 4]], color: '#3b82f6' },
        ]),
      },
      { text: 'A(−2, 1) noktası ötelenerek A’(3, 4) noktasına taşınmıştır. Öteleme: __ birim sağa, __ birim yukarı', answers: ['5', '3'] },
      { text: 'B(4, 5) noktası 6 birim sola ötelenirse görüntüsünün apsisi __ olur.', answers: ['-2'] },
      { text: 'Bir üçgenin öteleme altındaki görüntüsünün kenarları 3 cm, 4 cm ve 5 cm’dir. Asıl üçgenin çevresi __ cm’dir.', answers: ['12'] },
      { text: 'Bir karenin K(1, 1) köşesi öteleme ile K’(1, −4) noktasına taşınmıştır. Kare __ birim aşağı ötelenmiştir.', answers: ['5'] },
    ],
  },
  {
    id: 'g8-donusum-koordinatlari',
    outcomes: ['MAT.8.5.2'],
    type: 'fill',
    title: 'Dönüşümde koordinatlar',
    instructions: 'Ötelemede yön ve uzaklığa göre; yansımada eksene göre koordinatların nasıl değiştiğini düşün.',
    level: 2,
    generator: { id: 'transformPoint', count: 8 },
  },
  {
    id: 'g8-donusum-koordinat-duzlemi',
    outcomes: ['MAT.8.5.2'],
    type: 'manipulative',
    title: 'Ötele ve yansıt',
    instructions: 'Dönüşüm sonucunda oluşan görüntü noktasını işaretle.',
    level: 2,
    tool: 'coordinate',
    config: { size: 6 },
    tasks: [
      { prompt: 'A(2, 3) noktasının x eksenine göre yansımasını işaretle.', target: { x: 2, y: -3 } },
      { prompt: 'B(−4, 1) noktasının y eksenine göre yansımasını işaretle.', target: { x: 4, y: 1 } },
      { prompt: 'C(−1, −2) noktasını 4 birim sağa ve 5 birim yukarı ötele.', target: { x: 3, y: 3 } },
      { prompt: 'D(3, −1) noktasını önce y eksenine göre yansıt, sonra 2 birim aşağı ötele.', target: { x: -3, y: -3 } },
    ],
  },
  {
    id: 'g8-donusum-eslestir',
    outcomes: ['MAT.8.5.2'],
    type: 'match',
    title: 'A(3, −2) noktasının görüntüleri',
    instructions: 'A(3, −2) noktasına uygulanan her dönüşümü görüntü noktasıyla eşleştir.',
    level: 2,
    perRound: 6,
    pairs: [
      { left: 'x eksenine göre yansıması', right: '(3, 2)' },
      { left: 'y eksenine göre yansıması', right: '(−3, −2)' },
      { left: '2 birim sola ötelenmesi', right: '(1, −2)' },
      { left: '5 birim yukarı ötelenmesi', right: '(3, 3)' },
      { left: '3 birim aşağı ötelenmesi', right: '(3, −5)' },
      { left: '1 birim sağa, 2 birim yukarı ötelenmesi', right: '(4, 0)' },
    ],
  },
  {
    id: 'g8-donusumu-belirle',
    outcomes: ['MAT.8.5.2'],
    type: 'quiz',
    title: 'Hangi dönüşüm?',
    instructions: 'Noktaların apsis ve ordinatlarındaki değişime bakarak dönüşümü belirle.',
    level: 2,
    questions: [
      {
        prompt: { text: 'AB doğru parçası ile A’B’ doğru parçası arasında hangi dönüşüm vardır?', visual: { kind: 'coords', range: 5, points: [{ x: 1, y: 3, label: 'A' }, { x: 4, y: 1, label: 'B' }, { x: 1, y: -3, label: 'A’' }, { x: 4, y: -1, label: 'B’' }] } },
        choices: ['y eksenine göre yansıma', 'x eksenine göre yansıma', '6 birim aşağı öteleme', '2 birim aşağı öteleme'],
        answer: 1,
      },
      {
        prompt: { text: 'ABC üçgeni ile A’B’C’ üçgeni arasında hangi dönüşüm vardır?', visual: { kind: 'coords', range: 5, points: [{ x: -4, y: 2, label: 'A' }, { x: -1, y: 2, label: 'B' }, { x: -1, y: 5, label: 'C' }, { x: 1, y: -1, label: 'A’' }, { x: 4, y: -1, label: 'B’' }, { x: 4, y: 2, label: 'C’' }] } },
        choices: ['3 birim sağa, 5 birim aşağı öteleme', 'y eksenine göre yansıma', '5 birim sağa, 3 birim aşağı öteleme', 'x eksenine göre yansıma'],
        answer: 2,
      },
      {
        prompt: { text: 'ABC üçgeni ile A’B’C’ üçgeni arasında hangi dönüşüm vardır?', visual: { kind: 'coords', range: 5, points: [{ x: -3, y: 1, label: 'A' }, { x: -5, y: 4, label: 'B' }, { x: -2, y: 4, label: 'C' }, { x: 3, y: 1, label: 'A’' }, { x: 5, y: 4, label: 'B’' }, { x: 2, y: 4, label: 'C’' }] } },
        choices: ['x eksenine göre yansıma', '6 birim sağa öteleme', 'y eksenine göre yansıma', '3 birim sağa öteleme'],
        answer: 2,
      },
      { prompt: 'Bir noktanın y eksenine göre yansımasında apsis ve ordinat nasıl değişir?', choices: ['Ordinat ters işaretlisine dönüşür, apsis aynı kalır.', 'Apsis ters işaretlisine dönüşür, ordinat aynı kalır.', 'İkisi de ters işaretlisine dönüşür.', 'İkisi de aynı kalır.'], answer: 1 },
      { prompt: 'Yukarı yönlü bir ötelemede noktanın hangi koordinatı değişmez?', choices: ['Ordinatı', 'Apsisi', 'Hem apsisi hem ordinatı', 'Hiçbiri'], answer: 1 },
      { prompt: 'K(−2, 5) noktasının x eksenine göre yansıması hangisidir?', choices: ['(2, 5)', '(2, −5)', '(−2, −5)', '(5, −2)'], answer: 2 },
    ],
  },
  {
    id: 'g8-donusum-problemleri',
    outcomes: ['MAT.8.5.3'],
    type: 'quiz',
    title: 'Dönüşüm problemleri',
    instructions: 'Öteleme ve yansıma dönüşümlerini kullanarak problemleri çöz.',
    level: 3,
    questions: [
      { prompt: 'A(3, 4) noktası ile x eksenine göre yansıması arasındaki uzaklık kaç birimdir?', choices: ['4', '8', '6', '3'], answer: 1, explain: 'Yansıma (3, −4); ordinatlar arası fark 4 − (−4) = 8.' },
      { prompt: 'Bir nokta önce 3 birim sağa ötelenip sonra y eksenine göre yansıtılınca (−1, 2) noktası elde ediliyor. Noktanın ilk konumu nedir?', choices: ['(4, 2)', '(2, 2)', '(−2, 2)', '(−4, 2)'], answer: 2, explain: 'Tersten git: (−1, 2) → y eksenine göre yansıt → (1, 2) → 3 birim sola → (−2, 2).' },
      { prompt: 'Köşeleri A(1, 1), B(4, 1), C(4, 3) olan üçgen 2 birim sola ve 5 birim yukarı ötelenirse görüntüsünün alanı kaç birimkare olur?', choices: ['6', '15', '3', 'Bilinemez'], answer: 2, explain: 'Öteleme şekli değiştirmez: (3 · 2) : 2 = 3.' },
      { prompt: 'Satranç tahtasında bir kale d1 karesinden d5 karesine gidiyor. Bu hareket hangi dönüşüme örnektir?', choices: ['Yansıma', '4 kare yukarı öteleme', 'Dönme', 'Hiçbir dönüşüm değildir'], answer: 1 },
      { prompt: 'Koordinat düzlemine yerleştirilen Türkiye haritasında Ankara (33, 40) noktasında gösteriliyor. Harita 2 birim sağa, 1 birim aşağı ötelenirse Ankara’nın yeni koordinatları ne olur?', choices: ['(31, 41)', '(35, 41)', '(34, 42)', '(35, 39)'], answer: 3 },
      { prompt: 'P(−2, −3) noktası x eksenine göre, elde edilen nokta da y eksenine göre yansıtılıyor. Son nokta hangisidir?', choices: ['(2, 3)', '(−2, 3)', '(2, −3)', '(−3, −2)'], answer: 0 },
      { prompt: 'A(−1, 2) noktası a birim sağa ötelenip x eksenine göre yansıtıldığında (4, −2) noktası elde ediliyor. a kaçtır?', choices: ['3', '4', '5', '6'], answer: 2, explain: '−1 + a = 4 → a = 5' },
    ],
  },
  {
    id: 'g8-donusum-problemleri-hesapla',
    outcomes: ['MAT.8.5.3', 'MAT.8.5.2'],
    type: 'fill',
    title: 'Art arda dönüşümler',
    instructions: 'Dönüşümleri verilen sırayla uygula.',
    level: 3,
    items: [
      { text: 'A(−2, 5) noktası x eksenine göre yansıtılıp 3 birim sağa ötelenirse A’( __ , __ )', answers: ['1', '-5'] },
      { text: 'B(4, −1) noktası y eksenine göre yansıtılıp 2 birim yukarı ötelenirse B’( __ , __ )', answers: ['-4', '1'] },
      { text: 'C(3, 2) noktası ile y eksenine göre yansıması arasındaki uzaklık __ birim', answers: ['6'] },
      { text: 'Köşeleri (0, 0), (4, 0), (4, 3), (0, 3) olan dikdörtgen 5 birim sola ötelenirse görüntüsünün çevresi __ birim', answers: ['14'] },
      { text: 'D noktasının x eksenine göre yansıması (−3, 4) ise D noktasının ordinatı __', answers: ['-4'] },
      { text: 'Bir nokta 4 birim aşağı ötelenip x eksenine göre yansıtıldığında (2, 1) oluyor. Noktanın ilk ordinatı __', answers: ['3'], hint: 'Tersten git: önce yansıt, sonra 4 birim yukarı ötele.' },
    ],
  },
]
