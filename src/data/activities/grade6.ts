import type { Activity, Visual } from '../types'

// ───────────────────────────────────────────────────────────────────────────
// Çizim yardımcıları (geometri soruları için elle üretilen SVG'ler)
// ───────────────────────────────────────────────────────────────────────────

const INK = '#1f2340'
const ORANGE = '#f97316'
const INDIGO = '#6366f1'
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

// Sık kullanılan sabit görseller
const FIG_NUMBERED = parallel(62, { numbers: true })
const FIG_YAMUK = transversals([95, 70], [165, 200], [[[95, 50], [165, 50], [200, 115], [70, 115]]], [['A', 88, 40], ['B', 168, 40], ['C', 208, 126], ['D', 64, 126]])
const FIG_PARALELKENAR = transversals([90, 65], [175, 150], [[[90, 50], [175, 50], [150, 115], [65, 115]]], [['A', 84, 40], ['B', 180, 40], ['C', 156, 126], ['D', 58, 126]])
const FIG_UCGEN = transversals([130, 85], [130, 190], [[[130, 50], [190, 115], [85, 115]]], [['A', 130, 38], ['B', 80, 126], ['C', 196, 126]])
const FIG_KELEBEK = transversals([90, 170], [170, 90], [[[90, 50], [170, 50], [130, 82.5]], [[90, 115], [170, 115], [130, 82.5]]])

/** Dikey ekseni 18'den başlayan (yanıltıcı) sütun grafiği */
const FIG_YANILTICI_GRAFIK = svg(
  240,
  175,
  seg(40, 20, 40, 140, { w: 2 }) +
    seg(40, 140, 230, 140, { w: 2 }) +
    [18, 20, 22, 24].map((v) => seg(36, 140 - (v - 18) * 20, 40, 140 - (v - 18) * 20, { w: 1.5 }) + txt(32, 140 - (v - 18) * 20, String(v), { size: 11, anchor: 'end' })).join('') +
    [['Pzt', 20], ['Salı', 22], ['Çar', 21], ['Per', 23]]
      .map(([d, v], i) => {
        const y = 140 - ((v as number) - 18) * 20
        const x = 55 + i * 45
        return `<rect x="${x}" y="${y}" width="30" height="${140 - y}" fill="${INDIGO}" rx="3"/>` + txt(x + 15, 155, d as string, { size: 11 })
      })
      .join('') +
    txt(135, 9, 'Satılan simit sayısı', { size: 11 }),
)

/** Aynı paralel doğrular arasında tabanı ortak üç üçgen */
const FIG_ESIT_YUKSEKLIK = svg(
  260,
  130,
  [['40,20', ORANGE], ['135,20', INDIGO], ['225,20', '#16a34a']].map(([p, c]) => `<polygon points="100,110 170,110 ${p}" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`).join('') +
    seg(10, 20, 250, 20) +
    seg(10, 110, 250, 110) +
    parMark(18, 20) +
    parMark(18, 110) +
    txt(100, 122, 'A', { size: 12 }) +
    txt(170, 122, 'B', { size: 12 }),
)

/** 6. SINIF ETKİNLİKLERİ */
export const grade6: Activity[] = [
  // ── Sayılar ve Nicelikler (1) ───────────────────────────────────────────
  {
    id: 'g6-carpan-ve-kat',
    outcomes: ['MAT.6.1.1'],
    type: 'quiz',
    title: 'Çarpanlar ve katlar',
    instructions: 'Her soruyu dikkatle oku ve doğru seçeneği işaretle.',
    level: 1,
    questions: [
      { prompt: 'Aşağıdakilerden hangisi 24’ün çarpanlarından biri değildir?', choices: ['6', '8', '16', '12'], answer: 2, explain: '24 ÷ 16 işleminde kalan 8’dir. 24’ün çarpanları: 1, 2, 3, 4, 6, 8, 12, 24.' },
      { prompt: 'Aşağıdakilerden hangisi 7’nin bir katıdır?', choices: ['63', '27', '47', '71'], answer: 0, explain: '7 × 9 = 63' },
      { prompt: 'Sıfırdan farklı her doğal sayının en küçük doğal sayı böleni kaçtır?', choices: ['0', 'Sayının kendisi', '2', '1'], answer: 3, explain: 'Sıfır hariç tüm doğal sayılar 1’e kalansız bölünür.' },
      { prompt: { text: 'Alanı 36 m² olan dikdörtgen biçimli bir bahçenin kenar uzunlukları metre cinsinden doğal sayıdır. Bahçenin çevresi en az kaç metre olabilir?', visual: { kind: 'area', w: 6, h: 6, showGrid: true } }, choices: ['24 m', '26 m', '40 m', '74 m'], answer: 0, explain: '36 = 6 × 6 seçilirse çevre 2 × (6 + 6) = 24 m olur. Kenarlar birbirine yaklaştıkça çevre azalır.' },
      { prompt: 'Aynı bahçenin (alanı 36 m²) çevresi en fazla kaç metre olabilir?', choices: ['36 m', '40 m', '74 m', '72 m'], answer: 2, explain: '36 = 1 × 36 seçilirse çevre 2 × (1 + 36) = 74 m olur.' },
      { prompt: 'Ayşe 48 kurabiyeyi tabaklara, her tabakta eşit sayıda olacak ve hiç kurabiye artmayacak şekilde dağıtacak. Bir tabağa kaç kurabiye KOYAMAZ?', choices: ['6', '5', '8', '12'], answer: 1, explain: '5, 48’in çarpanı değildir; 48 ÷ 5 işleminde kalan 3’tür.' },
      { prompt: 'Hangisi doğrudur?', choices: ['Bir sayının çarpanları sonsuz tanedir.', 'Bir sayının en büyük katı kendisidir.', 'Bir sayının katları istenildiği kadar devam ettirilebilir.', 'Bir sayının çarpanları ondan büyük olabilir.'], answer: 2 },
      { prompt: 'Bir duraktan servisler 15 dakikada bir kalkıyor. İlk servis 08.00’de kalktığına göre hangisi bir servisin kalkış saati OLAMAZ?', choices: ['08.45', '09.15', '09.40', '10.00'], answer: 2, explain: '08.00’den 09.40’a kadar 100 dakika geçer; 100, 15’in katı değildir.' },
    ],
  },
  {
    id: 'g6-carpan-mi-kat-mi',
    outcomes: ['MAT.6.1.1'],
    type: 'categorize',
    title: '24’ün çarpanı mı, katı mı?',
    instructions: 'Her sayıyı doğru gruba taşı: 24’ün çarpanı mı, 24’ün katı mı, yoksa ikisi de değil mi?',
    level: 1,
    categories: [
      { id: 'carpan', label: '24’ün çarpanı', color: '#3b82f6' },
      { id: 'kat', label: '24’ün katı', color: '#22c55e' },
      { id: 'hicbiri', label: 'İkisi de değil', color: '#ef4444' },
    ],
    items: [
      { content: '2', category: 'carpan' },
      { content: '6', category: 'carpan' },
      { content: '8', category: 'carpan' },
      { content: '12', category: 'carpan' },
      { content: '48', category: 'kat' },
      { content: '72', category: 'kat' },
      { content: '120', category: 'kat' },
      { content: '10', category: 'hicbiri' },
      { content: '36', category: 'hicbiri' },
      { content: '9', category: 'hicbiri' },
    ],
  },
  {
    id: 'g6-carpan-listesi',
    outcomes: ['MAT.6.1.1'],
    type: 'match',
    title: 'Tüm çarpanları bul',
    instructions: 'Her sayıyı, çarpanlarının tamamını gösteren listeyle eşleştir.',
    level: 2,
    pairs: [
      { left: '12', right: '1, 2, 3, 4, 6, 12' },
      { left: '18', right: '1, 2, 3, 6, 9, 18' },
      { left: '20', right: '1, 2, 4, 5, 10, 20' },
      { left: '16', right: '1, 2, 4, 8, 16' },
      { left: '15', right: '1, 3, 5, 15' },
      { left: '28', right: '1, 2, 4, 7, 14, 28' },
      { left: '30', right: '1, 2, 3, 5, 6, 10, 15, 30' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-carpan-kat-alistirma',
    outcomes: ['MAT.6.1.1'],
    type: 'fill',
    title: 'Çarpan say, kat bul',
    instructions: 'Sayının kaç çarpanı olduğunu ya da istenen katını yaz.',
    level: 2,
    generator: { id: 'factors', params: { ask: 'mix', max: 60 }, count: 8 },
  },
  {
    id: 'g6-bolunebilme-kurallari',
    outcomes: ['MAT.6.1.2'],
    type: 'match',
    title: 'Bölünebilme kuralları',
    instructions: 'Her bölünebilme kuralını ait olduğu sayıyla eşleştir.',
    level: 1,
    pairs: [
      { left: '2 ile bölünebilme', right: 'Birler basamağı 0, 2, 4, 6 veya 8’dir.' },
      { left: '5 ile bölünebilme', right: 'Birler basamağı 0 veya 5’tir.' },
      { left: '10 ile bölünebilme', right: 'Birler basamağı 0’dır.' },
      { left: '3 ile bölünebilme', right: 'Rakamlarının toplamı 3’ün katıdır.' },
      { left: '9 ile bölünebilme', right: 'Rakamlarının toplamı 9’un katıdır.' },
      { left: '4 ile bölünebilme', right: 'Son iki basamağı 00 ya da 4’ün katıdır.' },
      { left: '6 ile bölünebilme', right: 'Hem 2 hem de 3 ile bölünebilir.' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-bolunebilme-grupla',
    outcomes: ['MAT.6.1.2'],
    type: 'categorize',
    title: '2 ve 5 ile bölünebilme',
    instructions: 'Bölme işlemi yapmadan, birler basamağına bakarak her sayıyı doğru gruba taşı.',
    level: 2,
    categories: [
      { id: 'ikisi', label: 'Hem 2 hem 5 ile bölünür', color: '#22c55e' },
      { id: 'iki', label: 'Yalnızca 2 ile bölünür', color: '#3b82f6' },
      { id: 'bes', label: 'Yalnızca 5 ile bölünür', color: '#f97316' },
      { id: 'hic', label: 'İkisiyle de bölünmez', color: '#ef4444' },
    ],
    items: [
      { content: '340', category: 'ikisi' },
      { content: '1.250', category: 'ikisi' },
      { content: '560', category: 'ikisi' },
      { content: '786', category: 'iki' },
      { content: '1.034', category: 'iki' },
      { content: '238', category: 'iki' },
      { content: '475', category: 'bes' },
      { content: '905', category: 'bes' },
      { content: '731', category: 'hic' },
      { content: '1.009', category: 'hic' },
    ],
  },
  {
    id: 'g6-eksik-rakam',
    outcomes: ['MAT.6.1.2'],
    type: 'fill',
    title: 'Eksik rakamı bul',
    instructions: 'Bölünebilme kurallarını kullanarak □ yerine gelecek rakamı ya da istenen cevabı yaz.',
    level: 3,
    items: [
      { text: '52□ sayısı 10 ile tam bölünüyorsa □ yerine __ gelir.', answers: ['0'] },
      { text: '71□ sayısı 5 ile bölünebilen bir tek sayı ise □ = __', answers: ['5'] },
      { text: '3□6 sayısı 9 ile tam bölünüyorsa □ yerine gelebilecek en büyük rakam __', answers: ['9'], hint: 'Rakamların toplamı 9’un katı olmalı.' },
      { text: '1.3□2 sayısı 4 ile tam bölünüyorsa □ yerine gelebilecek en küçük rakam __', answers: ['1'], hint: 'Son iki basamağın oluşturduğu sayıya bak.' },
      { text: '57□ sayısı 6 ile tam bölünüyorsa □ yerine gelebilecek rakamların toplamı __', answers: ['6'], hint: 'Sayı hem çift olmalı hem de rakamları toplamı 3’ün katı olmalı.' },
      { text: '3.4□ sayısı hem 2 hem 9 ile tam bölünüyorsa □ = __', answers: ['2'] },
      { text: 'Rakamlarının toplamı 18 olan her doğal sayı 9 ile tam bölünür. Bu önerme __', answers: ['doğru'], choices: ['doğru', 'yanlış'] },
      { text: 'Hem 2 hem 4 ile tam bölünen her sayı 8 ile de tam bölünür. Bu önerme __', answers: ['yanlış'], choices: ['doğru', 'yanlış'], hint: '12 sayısını dene.' },
    ],
  },
  {
    id: 'g6-bolunebilme-alistirma',
    outcomes: ['MAT.6.1.2'],
    type: 'quiz',
    title: 'Hangisi kalansız bölünür?',
    instructions: 'Bölünebilme kurallarını kullanarak doğru sayıyı seç.',
    level: 2,
    generator: { id: 'divisibility', params: { divisors: [2, 3, 4, 5, 6, 9, 10], max: 999 }, count: 8 },
  },
  {
    id: 'g6-asal-mi',
    outcomes: ['MAT.6.1.3'],
    type: 'categorize',
    title: 'Asal mı, değil mi?',
    instructions: 'Yalnızca iki farklı böleni (1 ve kendisi) olan sayılar asaldır. Sayıları doğru gruba taşı.',
    level: 2,
    categories: [
      { id: 'asal', label: 'Asal sayı', color: '#22c55e' },
      { id: 'degil', label: 'Asal sayı değil', color: '#ef4444' },
    ],
    items: [
      { content: '2', category: 'asal' },
      { content: '13', category: 'asal' },
      { content: '29', category: 'asal' },
      { content: '41', category: 'asal' },
      { content: '53', category: 'asal' },
      { content: '1', category: 'degil' },
      { content: '21', category: 'degil' },
      { content: '27', category: 'degil' },
      { content: '51', category: 'degil' },
      { content: '57', category: 'degil' },
    ],
  },
  {
    id: 'g6-asal-alistirma',
    outcomes: ['MAT.6.1.3'],
    type: 'quiz',
    title: 'Asal sayıyı yakala',
    instructions: 'Asal olan ya da asal olmayan sayıyı seç.',
    level: 2,
    generator: { id: 'primes', params: { max: 100 }, count: 8 },
  },
  {
    id: 'g6-asal-carpanlar',
    outcomes: ['MAT.6.1.3'],
    type: 'fill',
    title: 'Asal çarpanlara ayır',
    instructions: 'Asal çarpan ağacını ya da bölme algoritmasını düşünerek boşlukları doldur.',
    level: 2,
    items: [
      { text: '60 = 2 · 2 · 3 · __', answers: ['5'] },
      { text: '84 = 2 · 2 · __ · 7', answers: ['3'] },
      { text: '45 = 3 · 3 · __', answers: ['5'] },
      { text: '90 sayısının asal çarpanları 2, 3 ve __', answers: ['5'] },
      { text: '2 · 3 · 5 · 5 çarpımı __ sayısının asal çarpanlarına ayrılmış hâlidir.', answers: ['150'] },
      { text: 'Asal çarpanları yalnızca 2 ve 7 olan en küçük iki basamaklı sayı __', answers: ['14'] },
      { text: 'Çift olan tek asal sayı __', answers: ['2'] },
      { text: '1’den 20’ye kadar __ tane asal sayı vardır.', answers: ['8'], hint: 'Eratosthenes kalburunu düşün: 2, 3, 5, 7, ...' },
    ],
  },
  {
    id: 'g6-asal-carpan-eslestir',
    outcomes: ['MAT.6.1.3'],
    type: 'match',
    title: 'Asal çarpan ağacı',
    instructions: 'Her sayıyı asal çarpanlarının çarpımıyla eşleştir.',
    level: 2,
    pairs: [
      { left: '12', right: '2 · 2 · 3' },
      { left: '18', right: '2 · 3 · 3' },
      { left: '20', right: '2 · 2 · 5' },
      { left: '45', right: '3 · 3 · 5' },
      { left: '28', right: '2 · 2 · 7' },
      { left: '30', right: '2 · 3 · 5' },
      { left: '50', right: '2 · 5 · 5' },
      { left: '42', right: '2 · 3 · 7' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-ortak-bolen-ortak-kat-problemleri',
    outcomes: ['MAT.6.1.4'],
    type: 'quiz',
    title: 'Ortak bölen ve ortak kat problemleri',
    instructions: 'Problemi oku, ortak bölenleri ya da ortak katları listeleyerek çöz.',
    level: 2,
    questions: [
      { prompt: 'Elif’in 12 kırmızı ve 18 sarı lalesi var. Laleleri, her demette aynı sayıda kırmızı ve aynı sayıda sarı lale olacak ve hiç lale artmayacak şekilde demetlere ayıracak. En çok kaç demet yapabilir?', choices: ['3', '6', '12', '36'], answer: 1, explain: '12 ve 18’in ortak bölenleri 1, 2, 3 ve 6’dır. En çok 6 demet yapılır.' },
      { prompt: 'Bir barınağa bağışlanan 24 kutu kedi maması ve 36 kutu köpek maması, her pakette tek tür mama olacak ve tüm paketlerde eşit sayıda kutu bulunacak şekilde hiç artmadan paketlenecek. Bir pakette en fazla kaç kutu olabilir?', choices: ['6', '24', '72', '12'], answer: 3, explain: '24 ve 36’nın ortak bölenleri 1, 2, 3, 4, 6, 12’dir. En büyüğü 12’dir.' },
      { prompt: 'İki trafik lambasından biri 40 saniyede, diğeri 60 saniyede bir yeşil yanıyor. İkisi aynı anda yeşil yandıktan en az kaç saniye sonra yeniden birlikte yeşil yanarlar?', choices: ['100', '240', '120', '20'], answer: 2, explain: '40’ın katları: 40, 80, 120, ... 60’ın katları: 60, 120, ... İlk ortak kat 120’dir.' },
      { prompt: 'Mehmet merdiveni 3’er 3’er, Can 4’er 4’er çıkıyor. 30 basamaklı merdivende ikisinin de bastığı basamaklar hangileridir?', choices: ['3, 6 ve 9', '12 ve 24', '4, 8 ve 12', '7, 14 ve 21'], answer: 1, explain: '30’a kadar 3’ün ve 4’ün ortak katları 12 ve 24’tür.' },
      { prompt: 'Aşağıdaki sayı çiftlerinden hangisi aralarında asaldır?', choices: ['6 ve 9', '10 ve 25', '8 ve 15', '14 ve 21'], answer: 2, explain: '8 ile 15’in 1’den başka ortak böleni yoktur.' },
      { prompt: 'Bir tarlada 90 m ve 120 m uzunluğundaki iki sıra boyunca eşit aralıklarla fidan dikilecek. Her iki sırada aralıklar aynı ve metre cinsinden doğal sayı olacak; sıraların başına ve sonuna da fidan dikilecek. Aralık uzunluğu hangisi OLAMAZ?', choices: ['15 m', '30 m', '10 m', '20 m'], answer: 3, explain: '20, 90’ın böleni değildir. Aralık, 90 ve 120’nin ortak böleni olmalıdır.' },
      { prompt: 'Bir otobüs 20 dakikada, bir minibüs 15 dakikada bir duraktan kalkıyor. Saat 07.00’de birlikte kalktıklarına göre bir sonraki birlikte kalkış saati kaçtır?', choices: ['08.00', '07.35', '07.45', '08.20'], answer: 0, explain: '20 ve 15’in ilk ortak katı 60’tır; 60 dakika sonra saat 08.00 olur.' },
    ],
  },
  {
    id: 'g6-ortak-bolen-ortak-kat-grupla',
    outcomes: ['MAT.6.1.4'],
    type: 'categorize',
    title: '12 ve 18 için grupla',
    instructions: 'Her sayı 12 ve 18’in ortak böleni mi, ortak katı mı, yoksa hiçbiri mi? Doğru gruba taşı.',
    level: 2,
    categories: [
      { id: 'bolen', label: 'Ortak bölen', color: '#3b82f6' },
      { id: 'kat', label: 'Ortak kat', color: '#22c55e' },
      { id: 'hicbiri', label: 'Hiçbiri', color: '#ef4444' },
    ],
    items: [
      { content: '1', category: 'bolen' },
      { content: '2', category: 'bolen' },
      { content: '3', category: 'bolen' },
      { content: '6', category: 'bolen' },
      { content: '36', category: 'kat' },
      { content: '72', category: 'kat' },
      { content: '108', category: 'kat' },
      { content: '4', category: 'hicbiri' },
      { content: '9', category: 'hicbiri' },
      { content: '24', category: 'hicbiri' },
    ],
  },
  {
    id: 'g6-ortak-kat-sayi-dogrusu',
    outcomes: ['MAT.6.1.4'],
    type: 'manipulative',
    title: 'Sayı doğrusunda ortak kat',
    instructions: 'İki sayının katlarını sayı doğrusunda zihninde sıçrayarak ilerlet; ilk buluştukları yeri işaretle.',
    level: 2,
    tool: 'numberline',
    config: { min: 0, max: 40, step: 2 },
    tasks: [
      { prompt: '4 ve 6’nın sıfırdan büyük ilk ortak katını işaretle.', target: { value: 12 } },
      { prompt: '4 ve 10’un sıfırdan büyük ilk ortak katını işaretle.', target: { value: 20 } },
      { prompt: '6 ve 8’in sıfırdan büyük ilk ortak katını işaretle.', target: { value: 24 } },
      { prompt: '10 ve 15’in sıfırdan büyük ilk ortak katını işaretle.', target: { value: 30 } },
    ],
  },
  {
    id: 'g6-ortak-bolenleri-yaz',
    outcomes: ['MAT.6.1.4'],
    type: 'fill',
    title: 'Ortak bölenler, ortak katlar',
    instructions: 'Sayıların bölenlerini ve katlarını listeleyerek boşlukları doldur.',
    level: 2,
    items: [
      { text: '12 ve 18’in ortak bölenleri 1, 2, 3 ve __', answers: ['6'] },
      { text: '16 ve 24’ün ortak bölenleri 1, 2, 4 ve __', answers: ['8'] },
      { text: '4 ve 6’nın 30’dan küçük ortak katları 12 ve __', answers: ['24'] },
      { text: '6 ve 9’un 50’den küçük ortak katları 18 ve __', answers: ['36'] },
      { text: '9 ve 10’un ortak bölenlerinin sayısı __', answers: ['1'], hint: 'Ortak bölenlerini listele.' },
      { text: 'Ali’nin 20, Zeynep’in 30 bilyesi var. İkisi de bilyelerini hiç artmadan, gruplardaki bilye sayısı aynı olacak şekilde gruplara ayırıyor. Bir grupta en çok __ bilye olabilir.', answers: ['10'] },
      { text: 'Ortak böleni yalnızca 1 olan iki doğal sayıya __ sayılar denir.', answers: ['aralarında asal'], choices: ['aralarında asal', 'asal çarpan', 'ortak kat'] },
    ],
  },

  // ── Veriden Olasılığa ───────────────────────────────────────────────────
  {
    id: 'g6-zar-deneyi',
    outcomes: ['MAT.6.6.1'],
    type: 'manipulative',
    title: 'Zar atma deneyi',
    instructions: 'Zarı çok kez at, sonuçları tablodan izle ve soruyu deney verisine dayanarak cevapla.',
    level: 1,
    tool: 'probability',
    config: { mode: 'dice' },
    tasks: [
      { prompt: 'Zarı 10 kez at ve tablodaki “Oran” satırına bak.', target: { question: 'Bir sayının göreli sıklığı nasıl hesaplanır?', choices: ['Gelme sayısı ÷ toplam deneme sayısı', 'Toplam deneme sayısı ÷ 6', 'Gelme sayısı × 6', 'Toplam deneme sayısı − gelme sayısı'], answer: 'Gelme sayısı ÷ toplam deneme sayısı' } },
      { prompt: 'Şimdi zarı en az 100 kez at.', target: { question: 'Zarı çok kez attığında 6 gelmesinin göreli sıklığı yaklaşık hangi değere yakın olur?', choices: ['0,05', '0,17', '0,5', '0,83'], answer: '0,17' } },
      { prompt: 'Deneme sayısını artırmaya devam et ve oranları karşılaştır.', target: { question: 'Deneme sayısı arttıkça altı sayının göreli sıklıkları için ne söylenebilir?', choices: ['Birbirine yaklaşır', 'Birbirinden uzaklaşır', 'Hepsi 0 olur', 'Hiç değişmez'], answer: 'Birbirine yaklaşır' } },
    ],
  },
  {
    id: 'g6-torba-deneyi',
    outcomes: ['MAT.6.6.1'],
    type: 'manipulative',
    title: 'Torbadan top çekme',
    instructions: 'Torbada 5 yeşil ve 3 pembe top var. Her seferinde çekilen top torbaya geri konuyor. Deney yap ve soruları cevapla.',
    level: 2,
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Yeşil', color: '#22c55e', weight: 5 }, { label: 'Pembe', color: '#ec4899', weight: 3 }] },
    tasks: [
      { prompt: 'Torbadan 100 kez top çek.', target: { question: 'Hangi rengin çekilme sıklığı daha fazla olur?', choices: ['Yeşil', 'Pembe', 'Eşit olur'], answer: 'Yeşil' } },
      { prompt: 'Çekiliş sayısını 200’e ya da daha fazlasına çıkar.', target: { question: 'Yeşil top çekmenin göreli sıklığı yaklaşık kaçtır?', choices: ['0,2', '0,4', '0,6', '0,9'], answer: '0,6' } },
      { prompt: 'Ayşe yalnızca 4 kez çekti ve 3 kez pembe geldi.', target: { question: 'Buna göre pembe top çekme olasılığının 3/4 olduğu kesin midir?', choices: ['Evet, kesindir', 'Hayır, deneme sayısı çok az', 'Pembe hiç gelmemeliydi'], answer: 'Hayır, deneme sayısı çok az' } },
    ],
  },
  {
    id: 'g6-goreli-siklik',
    outcomes: ['MAT.6.6.1'],
    type: 'fill',
    title: 'Göreli sıklığı hesapla',
    instructions: 'Olayın gerçekleşme sayısını deneme sayısına bölerek deneysel olasılığı bul.',
    level: 2,
    items: [
      { text: 'Bir madenî para 40 kez atıldı ve 18 kez yazı geldi. Yazı gelme göreli sıklığı __', answers: ['0,45'] },
      { text: 'Bir zar 50 kez atıldı ve 9 kez 3 geldi. 3 gelme göreli sıklığı __', answers: ['0,18'] },
      { text: 'Bir çark 20 kez çevrildi ve 5 kez kırmızı geldi. Kırmızı gelme deneysel olasılığı yüzde olarak %__', answers: ['25'] },
      { text: 'Bir torbadan geri koyarak 25 kez top çekildi ve 15’inde mavi geldi. Mavi gelme göreli sıklığı __', answers: ['0,6'] },
      { text: 'Rastgele seçilen 30 öğrenciden 12’sinin kan grubu A’dır. Bir öğrencinin kan grubunun A olma deneysel olasılığı __', answers: ['0,4'] },
      { text: 'Bir para 200 kez atıldı ve tura gelme göreli sıklığı 0,52 bulundu. Tura __ kez gelmiştir.', answers: ['104'] },
      { text: '20 kez atılan zarda 6 sayısı 4 kez geldi. “20’de 4” yani [[4/20]] = [[1/__]]', answers: ['5'] },
    ],
  },
  {
    id: 'g6-deney-verisini-yorumla',
    outcomes: ['MAT.6.6.1'],
    type: 'quiz',
    title: 'Deney verisini yorumla',
    instructions: 'Tabloları incele ve deneysel olasılıkla ilgili soruları cevapla.',
    level: 2,
    questions: [
      { prompt: { text: 'Ece bir çarkı 50 kez çevirdi. Hangi rengin deneysel olasılığı en büyüktür?', visual: { kind: 'table', headers: ['Renk', 'Kırmızı', 'Mavi', 'Yeşil'], rows: [['Gelme sayısı', 22, 18, 10]] } }, choices: ['Kırmızı', 'Mavi', 'Yeşil'], answer: 0 },
      { prompt: { text: 'Aynı deneyde yeşil rengin göreli sıklığı kaçtır?', visual: { kind: 'table', headers: ['Renk', 'Kırmızı', 'Mavi', 'Yeşil'], rows: [['Gelme sayısı', 22, 18, 10]] } }, choices: ['0,1', '0,2', '0,5', '10'], answer: 1, explain: '10 ÷ 50 = 0,2' },
      { prompt: { text: 'Can bir parayı 25 kez attı. Tura gelme göreli sıklığı kaçtır?', visual: { kind: 'table', headers: ['Sonuç', 'Çetele', 'Sayı'], rows: [['Yazı', '||||| ||||| ||||', 14], ['Tura', '||||| ||||| |', 11]] } }, choices: ['0,11', '0,56', '0,44', '11'], answer: 2, explain: '11 ÷ 25 = 0,44' },
      { prompt: 'Bir deneyde elde edilebilecek her bir sonuca ne ad verilir?', choices: ['Deney', 'Çıktı', 'Göreli sıklık', 'Çetele'], answer: 1 },
      { prompt: 'Hangisi bir deneyden elde edilen göreli sıklık OLAMAZ?', choices: ['0', '0,35', '1', '1,2'], answer: 3, explain: 'Göreli sıklık 0 ile 1 arasındadır; olay sayısı deneme sayısından büyük olamaz.' },
      { prompt: 'Can bir parayı 10 kez attı, 7 kez yazı geldi. Zeynep 1.000 kez attı, 508 kez yazı geldi. Yazı gelme olasılığını hangisinin sonucu daha iyi tahmin eder?', choices: ['Can’ın, çünkü daha az deneme yaptı', 'Zeynep’in, çünkü deneme sayısı çok daha fazla', 'İkisi de aynı derecede iyi tahmin eder'], answer: 1 },
      { prompt: 'Bir zar 60 kez atıldığında yaklaşık kaç kez 4 gelmesi beklenir?', choices: ['6', '20', '10', '30'], answer: 2, explain: 'Her sayının gelme olasılığı yaklaşık altıda birdir: 60 ÷ 6 = 10.' },
    ],
  },
  {
    id: 'g6-goreli-siklik-sirala',
    outcomes: ['MAT.6.6.1'],
    type: 'sort',
    title: 'Göreli sıklıkları sırala',
    instructions: 'Göreli sıklıkları hesapla ve küçükten büyüğe sırala.',
    level: 3,
    rounds: [
      { prompt: 'Dört arkadaş zar attı. 6 gelme göreli sıklıklarını küçükten büyüğe sırala.', items: ['Defne: 40 atışta 4 kez', 'Buse: 50 atışta 8 kez', 'Ahmet: 20 atışta 5 kez', 'Cem: 10 atışta 3 kez'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Olasılık değerlerini küçükten büyüğe sırala.', items: ['0', '0,15', '[[2/5]]', '%70', '1'], ends: ['İmkânsız', 'Kesin'] },
      { prompt: 'Torbadan 40 kez top çekildi: kırmızı 6, mavi 14, sarı 20 kez. Renkleri göreli sıklıklarına göre küçükten büyüğe sırala.', items: ['Kırmızı', 'Mavi', 'Sarı'], ends: ['En az', 'En çok'] },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ───────────────────────────────────────────
  {
    id: 'g6-ondalik-kesir-toplami',
    outcomes: ['MAT.6.1.5'],
    type: 'match',
    title: 'Ondalık gösterimi çözümle',
    instructions: 'Her ondalık gösterimi, paydası 10, 100 ve 1000 olan kesirlerin toplamıyla eşleştir.',
    level: 1,
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
    id: 'g6-ondalik-basamak-degeri',
    outcomes: ['MAT.6.1.5'],
    type: 'fill',
    title: 'Basamak değeri',
    instructions: 'Ondalık gösterimlerin basamaklarını ve basamak değerlerini düşünerek boşlukları doldur.',
    level: 2,
    items: [
      { text: '4,728 sayısında 2 rakamının basamak değeri __', answers: ['0,02'] },
      { text: '4,728 sayısında 8 rakamı __ basamağındadır.', answers: ['binde birler'], choices: ['onda birler', 'yüzde birler', 'binde birler'] },
      { text: 'Bir koşucu 100 metreyi 12,57 saniyede koştu. Bu sayıdaki 5 rakamının basamak değeri __', answers: ['0,5'] },
      { text: '0,6 = [[6/10]] = [[__/100]]', answers: ['60'] },
      { text: '3 + [[4/10]] + [[9/1000]] = __', answers: ['3,409'] },
      { text: 'Elif’in boyu 1,48 m. Bu sayı 1 bütün, 4 onda bir ve __ yüzde birden oluşur.', answers: ['8'] },
      { text: '7,35 sayısı onda birler basamağına yuvarlanırsa __ olur.', answers: ['7,4'] },
      { text: 'Bir kilogram peynir 312,85 TL’dir. Bu fiyat en yakın liraya yuvarlanırsa __ TL olur.', answers: ['313'] },
    ],
  },
  {
    id: 'g6-ondalik-sayi-dogrusu',
    outcomes: ['MAT.6.1.5'],
    type: 'manipulative',
    title: 'Sayı doğrusunda ondalıklar',
    instructions: '2 ile 3 arası 10 eş parçaya bölünmüştür. Her çentik 0,1 artar. İstenen sayıyı işaretle.',
    level: 2,
    tool: 'numberline',
    config: { min: 2, max: 3, step: 0.1 },
    tasks: [
      { prompt: '2,7 sayısını işaretle.', target: { value: 2.7 } },
      { prompt: '2 + [[4/10]] toplamına eşit olan sayıyı işaretle.', target: { value: 2.4 } },
      { prompt: '2,5’ten 0,3 fazla olan sayıyı işaretle.', target: { value: 2.8 } },
      { prompt: 'Bir kumaş 2,96 m uzunluğunda. Bu uzunluğu onda birler basamağına yuvarla ve işaretle.', target: { value: 3 } },
    ],
  },
  {
    id: 'g6-ondalik-sirala',
    outcomes: ['MAT.6.1.5'],
    type: 'sort',
    title: 'Ondalıkları sırala',
    instructions: 'Basamak değerlerini karşılaştırarak küçükten büyüğe sırala.',
    level: 2,
    rounds: [
      { prompt: 'Sayıları küçükten büyüğe sırala.', items: ['0,06', '0,6', '0,606', '0,66'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Uzun atlama dereceleri (metre). Kısadan uzuna sırala.', items: ['3,09', '3,19', '3,9', '3,91'], ends: ['En kısa', 'En uzun'] },
      { prompt: 'Ürün fiyatları (TL). Ucuzdan pahalıya sırala.', items: ['12,05', '12,5', '12,55', '15,2'], ends: ['En ucuz', 'En pahalı'] },
    ],
  },
  {
    id: 'g6-kesir-ondalik-eslestir',
    outcomes: ['MAT.6.1.6'],
    type: 'match',
    title: 'Kesir = bölme',
    instructions: 'Payı paydaya bölerek her kesri ondalık gösterimiyle eşleştir.',
    level: 2,
    pairs: [
      { left: '[[1/4]]', right: '0,25' },
      { left: '[[3/8]]', right: '0,375' },
      { left: '[[1/3]]', right: '0,333...' },
      { left: '[[2/3]]', right: '0,666...' },
      { left: '[[7/20]]', right: '0,35' },
      { left: '[[5/6]]', right: '0,8333...' },
      { left: '[[4/9]]', right: '0,444...' },
      { left: '[[3/5]]', right: '0,6' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-sonlu-devirli',
    outcomes: ['MAT.6.1.6'],
    type: 'categorize',
    title: 'Sonlu mu, devirli mi?',
    instructions: 'Payı paydaya böldüğünde bölme işlemi biter mi, yoksa rakamlar sürekli tekrar mı eder? Kesirleri grupla.',
    level: 3,
    categories: [
      { id: 'sonlu', label: 'Sonlu ondalık gösterim', color: '#22c55e' },
      { id: 'devirli', label: 'Devirli ondalık gösterim', color: '#a855f7' },
    ],
    items: [
      { content: '[[3/4]]', category: 'sonlu' },
      { content: '[[2/5]]', category: 'sonlu' },
      { content: '[[7/8]]', category: 'sonlu' },
      { content: '[[9/20]]', category: 'sonlu' },
      { content: '[[3/15]]', category: 'sonlu' },
      { content: '[[1/3]]', category: 'devirli' },
      { content: '[[5/6]]', category: 'devirli' },
      { content: '[[2/9]]', category: 'devirli' },
      { content: '[[4/11]]', category: 'devirli' },
      { content: '[[7/12]]', category: 'devirli' },
    ],
  },
  {
    id: 'g6-kesir-bolme-iliskisi',
    outcomes: ['MAT.6.1.6'],
    type: 'fill',
    title: 'Kesirden ondalığa',
    instructions: 'Kesri bir bölme işlemi olarak düşün ve boşlukları doldur.',
    level: 2,
    items: [
      { text: '3 ÷ 4 = [[3/4]] = __', answers: ['0,75'] },
      { text: '7 ÷ 2 = [[7/2]] = __', answers: ['3,5'] },
      { text: '[[9/4]] kesrinin ondalık gösterimi __', answers: ['2,25'] },
      { text: '5 pizza 8 kişiye eşit paylaştırılırsa kişi başına __ pizza düşer.', answers: ['0,625'] },
      { text: '6 m’lik bir ip 5 eş parçaya bölünürse her parça __ m olur.', answers: ['1,2'] },
      { text: '[[1/3]] için 1 ÷ 3 bölmesi sürdükçe bölümde hep __ rakamı tekrar eder.', answers: ['3'] },
      { text: '[[2/11]] = 0,181818... Bu gösterimde sürekli tekrar eden rakam grubu __', answers: ['18'] },
      { text: 'Sadeleştirilmiş bir kesrin paydasında 2 ve 5’ten başka asal çarpan yoksa kesrin ondalık gösterimi __ olur.', answers: ['sonlu'], choices: ['sonlu', 'devirli'] },
    ],
  },
  {
    id: 'g6-kesir-ondalik-yuzde-problemleri',
    outcomes: ['MAT.6.1.7'],
    type: 'quiz',
    title: 'Günlük hayat problemleri',
    instructions: 'Problemde verilenleri ve isteneni belirle, uygun işlemi seç ve çöz.',
    level: 2,
    questions: [
      { prompt: 'Bir pizzanın [[3/4]]’ü kalmıştı. Can kalan pizzanın [[1/3]]’ünü yedi. Can pizzanın tamamının ne kadarını yedi?', choices: ['[[1/12]]', '[[1/4]]', '[[3/7]]', '[[4/7]]'], answer: 1, explain: '[[1/3]] × [[3/4]] = [[3/12]] = [[1/4]]' },
      { prompt: 'Bir porsiyon kurabiye [[1/3]] paket ise 6 paket kurabiyeden kaç porsiyon çıkar?', choices: ['2', '9', '18', '3'], answer: 2, explain: '6 ÷ [[1/3]] = 18. Her paketten 3 porsiyon çıkar.' },
      { prompt: 'Fiyatı 840 TL olan bir ayakkabıda %25 indirim var. İndirimli fiyat kaç TL’dir?', choices: ['210 TL', '815 TL', '630 TL', '600 TL'], answer: 2, explain: '840’ın %25’i 210 TL’dir. 840 − 210 = 630 TL.' },
      { prompt: 'Ayşe’nin 125,5 TL’si var. Parasının onda biri kadar olan borcunu ödedi. Kaç TL’si kaldı?', choices: ['112,95 TL', '113,5 TL', '12,55 TL', '115,5 TL'], answer: 0, explain: '125,5 ÷ 10 = 12,55 ve 125,5 − 12,55 = 112,95' },
      { prompt: 'Bir kırtasiyeci 60 TL’ye aldığı bir çantayı %20 kârla satıyor. Satış fiyatı kaç TL’dir?', choices: ['48 TL', '62 TL', '80 TL', '72 TL'], answer: 3, explain: '60’ın %20’si 12 TL’dir. 60 + 12 = 72 TL.' },
      { prompt: 'Okulda toplanan atıkların [[2/5]]’i kâğıt, %35’i plastik, geri kalanı camdır. Camın oranı yüzde kaçtır?', choices: ['%35', '%25', '%40', '%65'], answer: 1, explain: '[[2/5]] = %40. %40 + %35 = %75, kalan %25.' },
      { prompt: 'Hangi işlemin sonucu 20’den küçüktür?', choices: ['20 × [[3/2]]', '20 ÷ 0,5', '20 × 0,8', '20 × [[5/4]]'], answer: 2, explain: 'Bir doğal sayı 1’den küçük bir sayıyla çarpılınca sonuç o sayıdan küçük olur.' },
      { prompt: 'Buzul kaybı nedeniyle bir bölgedeki 2.400 olan fok sayısı %5 azaldı. Fok sayısı kaça düştü?', choices: ['2.395', '2.280', '120', '2.520'], answer: 1, explain: '2.400’ün %5’i 120’dir. 2.400 − 120 = 2.280' },
    ],
  },
  {
    id: 'g6-kesir-ondalik-islemler',
    outcomes: ['MAT.6.1.7'],
    type: 'fill',
    title: 'Kesir, ondalık ve yüzde işlemleri',
    instructions: 'İşlemleri yap ve sonucu yaz.',
    level: 2,
    items: [
      { text: '[[2/3]] × 12 = __', answers: ['8'] },
      { text: '[[3/4]] ÷ 3 = [[1/__]]', answers: ['4'] },
      { text: '[[1/5]] + [[1/10]] = [[__/10]]', answers: ['3'], hint: '[[1/5]] kesrini paydası 10 olan denk kesre çevir.' },
      { text: '[[1/2]] ÷ [[1/4]] = __', answers: ['2'], hint: 'Yarımın içinde kaç tane çeyrek var?' },
      { text: '3,75 × 100 = __', answers: ['375'] },
      { text: '48,6 ÷ 10 = __', answers: ['4,86'] },
      { text: '4,5 ÷ 0,5 = __', answers: ['9'] },
      { text: '320’nin %15’i __', answers: ['48'] },
    ],
  },
  {
    id: 'g6-ondalik-islem-alistirma',
    outcomes: ['MAT.6.1.7'],
    type: 'fill',
    title: 'Ondalık gösterimlerle işlem',
    instructions: 'Virgülleri alt alta getirerek işlemi yap.',
    level: 2,
    generator: { id: 'decimals', params: { ops: ['+', '-', '×'], decimals: 2, max: 10 }, count: 8 },
  },
  {
    id: 'g6-kesir-ondalik-yuzde-eslestir',
    outcomes: ['MAT.6.1.7'],
    type: 'match',
    title: 'Kesir, ondalık, yüzde',
    instructions: 'Aynı büyüklüğü gösteren kartları eşleştir.',
    level: 1,
    generator: { id: 'fracDecPct', count: 6 },
  },
  {
    id: 'g6-kesir-modeli',
    outcomes: ['MAT.6.1.7'],
    type: 'manipulative',
    title: 'Kesir şeridiyle işlem',
    instructions: 'Parça sayısını seç ve sonucu gösterecek kadar parçayı boya.',
    level: 2,
    tool: 'fractions',
    config: { dens: [2, 3, 4, 6, 8, 12] },
    tasks: [
      { prompt: 'Bir pizzanın [[3/4]]’ünün yarısı ne kadar eder? Kesir şeridinde göster.', target: { num: 3, den: 8 } },
      { prompt: '[[2/3]] × [[1/2]] işleminin sonucunu göster.', target: { num: 1, den: 3 } },
      { prompt: '[[3/4]] ÷ 3 işleminin sonucunu göster.', target: { num: 1, den: 4 } },
      { prompt: '[[1/2]] + [[1/4]] toplamını göster.', target: { num: 3, den: 4 } },
    ],
  },
  {
    id: 'g6-uzunluk-birimleri-sirala',
    outcomes: ['MAT.6.1.8'],
    type: 'sort',
    title: 'Uzunlukları sırala',
    instructions: 'Gerekirse aynı birime çevir ve kısadan uzuna sırala.',
    level: 2,
    rounds: [
      { prompt: 'Uzunluk ölçme birimlerini küçükten büyüğe sırala.', items: ['mm', 'cm', 'dm', 'm', 'dam', 'hm', 'km'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Uzunlukları kısadan uzuna sırala.', items: ['3.050 mm', '0,0032 km', '340 cm', '3,5 m'], ends: ['En kısa', 'En uzun'] },
      { prompt: 'Yürüyüş mesafelerini kısadan uzuna sırala.', items: ['850 m', '1,2 km', '1.250 m', '1,3 km'], ends: ['En kısa', 'En uzun'] },
    ],
  },
  {
    id: 'g6-uzunluk-birim-iliskileri',
    outcomes: ['MAT.6.1.8'],
    type: 'match',
    title: 'Metrenin katları',
    instructions: 'Her uzunluğu kendisine eşit olan uzunlukla eşleştir.',
    level: 1,
    pairs: [
      { left: '1 km', right: '1.000 m' },
      { left: '1 hm', right: '100 m' },
      { left: '1 dam', right: '10 m' },
      { left: '1 m', right: '10 dm' },
      { left: '1 dm', right: '10 cm' },
      { left: '1 cm', right: '10 mm' },
    ],
    perRound: 3,
  },
  {
    id: 'g6-uzunluk-donusum',
    outcomes: ['MAT.6.1.8'],
    type: 'fill',
    title: 'Birim dönüştürme',
    instructions: 'Uzunlukları istenen birime çevir.',
    level: 2,
    items: [
      { text: '634,9 cm = 6 m __ cm 9 mm', answers: ['34'] },
      { text: '6 m 3 dm 4 cm 9 mm = __ mm', answers: ['6349'] },
      { text: '2,4 km = __ m', answers: ['2400'] },
      { text: '45 dm = __ m', answers: ['4,5'] },
      { text: 'Bir kalemin uzunluğu 0,15 m = __ cm', answers: ['15'] },
      { text: '750 m = __ km', answers: ['0,75'] },
      { text: 'Bir karıncanın boyu 0,8 cm = __ mm', answers: ['8'] },
      { text: 'Okulun koşu pisti 400 m’dir. Can 5 tur koşarsa __ km koşmuş olur.', answers: ['2'] },
    ],
  },
  {
    id: 'g6-uygun-uzunluk-birimi',
    outcomes: ['MAT.6.1.8'],
    type: 'quiz',
    title: 'Hangi birim uygun?',
    instructions: 'Ölçülecek uzunluğa en uygun birimi seç ve ölçümleri karşılaştır.',
    level: 1,
    questions: [
      { prompt: 'İstanbul ile Ankara arasındaki uzaklığı ifade etmek için en uygun birim hangisidir?', choices: ['km', 'm', 'cm', 'mm'], answer: 0 },
      { prompt: 'Bir silginin uzunluğunu ifade etmek için en uygun birim hangisidir?', choices: ['km', 'm', 'cm', 'hm'], answer: 2 },
      { prompt: 'Bir karıncanın boyunu ifade etmek için en uygun birim hangisidir?', choices: ['m', 'mm', 'dam', 'km'], answer: 1 },
      { prompt: 'Uzunluk ölçme birimlerinde ölçüt (temel birim) olarak hangisi alınır?', choices: ['Santimetre', 'Metre', 'Kilometre', 'Milimetre'], answer: 1 },
      { prompt: 'Elif sınıf kapısının yüksekliğini 2,1 m, Can ise 210 cm olarak ölçtü. Hangisi doğrudur?', choices: ['Elif’in ölçümü daha büyüktür.', 'Can’ın ölçümü daha büyüktür.', 'İki ölçüm eşittir.', 'Karşılaştırılamaz.'], answer: 2, explain: '2,1 m = 210 cm' },
      { prompt: 'Hangisi 1 metreden uzundur?', choices: ['95 cm', '999 mm', '0,9 m', '11 dm'], answer: 3, explain: '11 dm = 1,1 m' },
    ],
  },

  // ── İstatistiksel Araştırma Süreci ──────────────────────────────────────
  {
    id: 'g6-veri-turu',
    outcomes: ['MAT.6.5.1'],
    type: 'categorize',
    title: 'Kategorik mi, nicel mi?',
    instructions: 'Sayıyla ifade edilen ve sayılarak elde edilen veriler nicel (kesikli) veridir. Her veriyi doğru gruba taşı.',
    level: 1,
    categories: [
      { id: 'kategorik', label: 'Kategorik veri', color: '#f97316' },
      { id: 'nicel', label: 'Nicel (kesikli) veri', color: '#3b82f6' },
    ],
    items: [
      { content: 'Öğrencilerin göz rengi', category: 'kategorik' },
      { content: 'En sevilen spor dalı', category: 'kategorik' },
      { content: 'Doğum yeri (il)', category: 'kategorik' },
      { content: 'Kan grubu', category: 'kategorik' },
      { content: 'Okula geliş şekli', category: 'kategorik' },
      { content: 'Ailedeki kardeş sayısı', category: 'nicel' },
      { content: 'Bir ayda okunan kitap sayısı', category: 'nicel' },
      { content: 'Bir maçta atılan gol sayısı', category: 'nicel' },
      { content: 'Evdeki bisiklet sayısı', category: 'nicel' },
      { content: 'Günde içilen su bardağı sayısı', category: 'nicel' },
    ],
  },
  {
    id: 'g6-kok-yaprak',
    outcomes: ['MAT.6.5.1'],
    type: 'quiz',
    title: 'Kök-yaprak gösterimi',
    instructions: 'Bir basketbol takımındaki 11 oyuncunun sezon boyunca attığı sayılar kök-yaprak gösterimiyle verilmiştir (1 | 2 = 12). Soruları cevapla.',
    level: 2,
    questions: [
      { prompt: { text: 'Gösterimde kaç veri vardır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['4', '11', '9', '12'], answer: 1 },
      { prompt: { text: 'Tepe değer (en çok tekrar eden veri) kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['3', '23', '28', '2'], answer: 1 },
      { prompt: { text: 'Ortanca (ortadaki değer) kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['20', '25', '23', '28'], answer: 2, explain: '11 veri sıralıdır; ortadaki (6.) veri 23’tür.' },
      { prompt: { text: 'Açıklık kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['37', '49', '12', '27'], answer: 0, explain: '49 − 12 = 37' },
      { prompt: { text: 'Aritmetik ortalama kaçtır?', visual: { kind: 'table', headers: ['Kök', 'Yaprak'], rows: [['1', '2 5 7'], ['2', '0 3 3 3 8'], ['3', '1 4'], ['4', '9']] } }, choices: ['23', '24', '27', '25'], answer: 3, explain: 'Verilerin toplamı 275’tir. 275 ÷ 11 = 25' },
      { prompt: 'Kök-yaprak gösteriminde “3 | 1” hangi veriyi gösterir?', choices: ['13', '31', '3,1', '4'], answer: 1 },
      { prompt: 'Hangisi veri toplanarak cevaplanabilecek uygun bir araştırma sorusudur?', choices: ['Kitap okumak güzel midir?', 'Dünyanın en iyi kitabı hangisidir?', 'Sınıfımızdaki öğrenciler bir haftada kaç kitap okuyor?', 'Kitapları kim icat etti?'], answer: 2 },
      { prompt: 'Bir veri grubu: 3, 4, 4, 5, 60. Bu grubun merkezini en iyi hangisi temsil eder?', choices: ['Aritmetik ortalama (15,2)', 'Ortanca (4)', 'En büyük değer (60)', 'Açıklık (57)'], answer: 1, explain: '60 değeri uç değerdir ve ortalamayı büyütür; ortanca verilerin çoğunu daha iyi temsil eder.' },
    ],
  },
  {
    id: 'g6-merkezi-egilim-alistirma',
    outcomes: ['MAT.6.5.1'],
    type: 'fill',
    title: 'Ortalama, ortanca, tepe değer, açıklık',
    instructions: 'Veri grubunu incele ve istenen değeri hesapla.',
    level: 2,
    generator: { id: 'stats', params: { stats: ['mean', 'median', 'mode', 'range'] }, count: 8 },
  },
  {
    id: 'g6-arastirma-sureci',
    outcomes: ['MAT.6.5.1'],
    type: 'sort',
    title: 'Araştırma adımları',
    instructions: 'Adımları doğru sıraya koy.',
    level: 2,
    rounds: [
      { prompt: 'İstatistiksel araştırma sürecinin adımlarını sırala.', items: ['Araştırma sorusunu oluştur', 'Veri toplamayı planla', 'Veriyi topla', 'Veriyi görselleştir ve özetle', 'Sonuçları yorumla ve karar ver'] },
      { prompt: 'Aritmetik ortalamayı bulma adımlarını sırala.', items: ['Verileri belirle', 'Tüm verileri topla', 'Veri sayısını bul', 'Toplamı veri sayısına böl'] },
      { prompt: 'Ortancayı bulmak için verileri küçükten büyüğe sırala: 12, 7, 15, 9, 11', items: ['7', '9', '11', '12', '15'], ends: ['En küçük', 'En büyük'] },
    ],
  },
  {
    id: 'g6-anket-grafigi',
    outcomes: ['MAT.6.5.1'],
    type: 'manipulative',
    title: 'Anket sonuçlarını görselleştir',
    instructions: 'Tablodaki verilere göre sütunları yükselt.',
    level: 1,
    tool: 'bargraph',
    tasks: [
      { prompt: '6/B sınıfında “Okula nasıl geliyorsun?” anketi yapıldı (kategorik veri). Grafiği oluştur.', target: { data: [{ label: 'Yürüyerek', value: 9 }, { label: 'Servis', value: 7 }, { label: 'Otobüs', value: 5 }, { label: 'Bisiklet', value: 3 }] } },
      { prompt: 'Aynı sınıfta “Bu hafta kaç kitap okudun?” sorusu soruldu (nicel veri). Grafiği oluştur.', target: { data: [{ label: '0 kitap', value: 2 }, { label: '1 kitap', value: 6 }, { label: '2 kitap', value: 8 }, { label: '3 kitap', value: 4 }] } },
    ],
  },
  {
    id: 'g6-istatistiksel-yorumlari-tartis',
    outcomes: ['MAT.6.5.2'],
    type: 'quiz',
    title: 'Bu yorum doğru mu?',
    instructions: 'Başkalarının veriye dayalı sonuç ve yorumlarını incele; hatalı ya da yanlı olanları fark et.',
    level: 2,
    questions: [
      { prompt: { text: 'Murat bu grafiğe bakarak “Perşembe satılan simit, pazartesinin iki katından fazla.” dedi. Bu yorum için ne söylenebilir?', visual: FIG_YANILTICI_GRAFIK }, choices: ['Doğrudur, çünkü sütun çok daha uzun.', 'Hatalıdır; eksen 18’den başlıyor, 23 sayısı 20’nin iki katı değildir.', 'Doğrudur, çünkü grafikler yanıltmaz.'], answer: 1 },
      { prompt: '“En sevilen spor” anketi yalnızca okulun basketbol takımındaki öğrencilere uygulanmış ve “Okulun en sevdiği spor basketboldur.” sonucuna varılmış. Bu sonuçla ilgili hangisi doğrudur?', choices: ['Sonuç kesinlikle doğrudur.', 'Veri yanlı toplanmıştır; sonuç tüm okulu temsil etmez.', 'Anket sorusu yanlıştır.', 'Grafik çizilmediği için yorum yapılamaz.'], answer: 1 },
      { prompt: 'Selin, 4, 6, 8, 10 veri grubunun ortancasını 6 olarak buldu. Bu sonuç için ne söylenebilir?', choices: ['Doğrudur.', 'Hatalıdır; ortanca 8’dir.', 'Hatalıdır; veri sayısı çift olduğu için ortanca 6 ile 8’in ortası olan 7’dir.', 'Hatalıdır; ortanca 28’dir.'], answer: 2 },
      { prompt: '“Sınıfımızdaki öğrencilerin kardeş sayılarının aritmetik ortalaması 2’dir. O hâlde her öğrencinin 2 kardeşi vardır.” Bu yorum için ne söylenebilir?', choices: ['Hatalıdır; ortalama herkesin aynı değere sahip olduğunu göstermez.', 'Doğrudur.', 'Doğrudur, çünkü ortalama her zaman tepe değere eşittir.'], answer: 0 },
      { prompt: { text: 'Bir reklamda “Herkes A markasını tercih ediyor!” deniyor. Grafiğe göre bu iddia için ne söylenebilir?', visual: { kind: 'bars', data: [{ label: 'A markası', value: 12 }, { label: 'B markası', value: 8 }], title: 'Tercih edilen marka', unit: 'kişi' } }, choices: ['Kabul edilir; A markası daha çok tercih edilmiş.', 'Kabul edilir; 12 kişi çok fazladır.', 'Çürütülür; 20 kişiden 8’i B markasını tercih etmiş.'], answer: 2 },
      { prompt: 'Bir araştırmada yalnızca 5 kişiye soru sorulmuş ve “Türkiye’deki gençlerin %80’i kahvaltı yapmıyor.” sonucuna varılmış. Bu sonuçtaki temel sorun nedir?', choices: ['Yüzde kullanılmıştır.', 'Veri sayısı çok azdır ve tüm gençleri temsil etmez.', 'Soru kahvaltıyla ilgilidir.', 'Sonuç bir sayı içermektedir.'], answer: 1 },
      { prompt: 'Veri grubu: 5, 7, 7, 9, 9, 10. Arda “Bu veri grubunun tepe değeri yoktur.” dedi. Bu yorum için ne söylenebilir?', choices: ['Doğrudur.', 'Hatalıdır; tepe değer 10’dur.', 'Hatalıdır; 7 ve 9’un ikisi de tepe değerdir.'], answer: 2 },
    ],
  },
  {
    id: 'g6-yorum-kabul-curut',
    outcomes: ['MAT.6.5.2'],
    type: 'categorize',
    title: 'Kabul et ya da çürüt',
    instructions: 'Her yorumu verilen veriye göre değerlendir: doğruysa kabul et, hatalı ya da yanlıysa çürüt.',
    level: 3,
    categories: [
      { id: 'kabul', label: 'Kabul edilir', color: '#22c55e' },
      { id: 'curut', label: 'Çürütülür', color: '#ef4444' },
    ],
    items: [
      { content: 'Veri: 2, 4, 6 → “Aritmetik ortalama 4’tür.”', category: 'kabul' },
      { content: 'Veri: 3, 5, 5, 8 → “Tepe değer 5’tir.”', category: 'kabul' },
      { content: 'Veri: 7, 8, 9 → “Ortanca 8’dir.”', category: 'kabul' },
      { content: '30 kişiden 18’i “evet” dedi → “Katılımcıların %60’ı evet dedi.”', category: 'kabul' },
      { content: '40 öğrenciden 10’u bisikletle geliyor → “Öğrencilerin dörtte biri bisikletle geliyor.”', category: 'kabul' },
      { content: 'Veri: 1, 3, 9 → “Açıklık 9’dur.”', category: 'curut' },
      { content: 'Veri: 10, 20, 30, 40 → “Ortanca 20’dir.”', category: 'curut' },
      { content: 'Veri: 2, 2, 3, 3 → “Aritmetik ortalama 3’tür.”', category: 'curut' },
      { content: 'Yalnızca futbol kulübü üyelerine sorulup “Okulda herkes futbolu seviyor.” denmesi', category: 'curut' },
      { content: 'Veri: 5, 5, 6, 100 → “Ortalama 29’dur ve verilerin çoğunu iyi temsil eder.”', category: 'curut' },
    ],
  },

  // ── Geometrik Şekiller ──────────────────────────────────────────────────
  {
    id: 'g6-paralel-dogrular-aci-adlari',
    outcomes: ['MAT.6.3.1'],
    type: 'quiz',
    title: 'Paralel doğrular ve kesen',
    instructions: 'd₁ ∥ d₂ ve k bir kesendir. Şekildeki açı numaralarına göre soruları cevapla.',
    level: 1,
    questions: [
      { prompt: { text: '1 ve 5 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED }, choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'], answer: 0, explain: 'İkisi de kesenin solunda ve doğruların üst tarafındadır; aynı yöne bakarlar.' },
      { prompt: { text: '4 ve 6 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED }, choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'], answer: 1, explain: 'İkisi de paralel doğruların arasında (iç bölgede) ve kesenin farklı taraflarındadır.' },
      { prompt: { text: '2 ve 8 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED }, choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'], answer: 2, explain: 'İkisi de paralel doğruların dışında ve kesenin farklı taraflarındadır.' },
      { prompt: { text: '1 ve 3 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED }, choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'], answer: 3 },
      { prompt: { text: '3 ve 5 numaralı açılar hangi açı çiftidir?', visual: FIG_NUMBERED }, choices: ['Yöndeş açılar', 'İç ters açılar', 'Dış ters açılar', 'Ters açılar'], answer: 1 },
      { prompt: { text: 'Hangi açı 3 numaralı açının yöndeşidir?', visual: FIG_NUMBERED }, choices: ['5', '7', '1', '8'], answer: 1 },
      { prompt: { text: 'Hangi açı 1 numaralı açının dış ters açısıdır?', visual: FIG_NUMBERED }, choices: ['5', '3', '7', '8'], answer: 2 },
      { prompt: 'İki paralel doğru ve bir kesenle oluşan yöndeş, iç ters ve dış ters açıların ölçüleri için ne söylenebilir?', choices: ['Toplamları 90°’dir.', 'Eştir.', 'Toplamları 360°’dir.', 'Her zaman farklıdır.'], answer: 1 },
    ],
  },
  {
    id: 'g6-aci-ciftlerini-grupla',
    outcomes: ['MAT.6.3.1'],
    type: 'categorize',
    title: 'Açı çiftlerini sınıflandır',
    instructions: 'Her şekilde d₁ ∥ d₂ ve iki açı boyanmıştır. Boyalı açı çiftini doğru gruba taşı.',
    level: 2,
    categories: [
      { id: 'yondes', label: 'Yöndeş açılar', color: '#3b82f6' },
      { id: 'icters', label: 'İç ters açılar', color: '#22c55e' },
      { id: 'dister', label: 'Dış ters açılar', color: '#f97316' },
    ],
    items: [
      { content: { visual: parallel(60, { marks: [{ pos: 1 }, { pos: 5 }] }) }, category: 'yondes' },
      { content: { visual: parallel(70, { marks: [{ pos: 2 }, { pos: 6 }] }) }, category: 'yondes' },
      { content: { visual: parallel(115, { marks: [{ pos: 4 }, { pos: 8 }] }) }, category: 'yondes' },
      { content: { visual: parallel(60, { marks: [{ pos: 3 }, { pos: 5 }] }) }, category: 'icters' },
      { content: { visual: parallel(65, { marks: [{ pos: 4 }, { pos: 6 }] }) }, category: 'icters' },
      { content: { visual: parallel(120, { marks: [{ pos: 3 }, { pos: 5 }] }) }, category: 'icters' },
      { content: { visual: parallel(60, { marks: [{ pos: 1 }, { pos: 7 }] }) }, category: 'dister' },
      { content: { visual: parallel(65, { marks: [{ pos: 2 }, { pos: 8 }] }) }, category: 'dister' },
      { content: { visual: parallel(115, { marks: [{ pos: 1 }, { pos: 7 }] }) }, category: 'dister' },
    ],
  },
  {
    id: 'g6-paralel-aci-olculeri',
    outcomes: ['MAT.6.3.1'],
    type: 'fill',
    title: 'Açı ölçülerini bul',
    instructions: 'd₁ ∥ d₂. Yöndeş, iç ters, dış ters ve ters açıların eş olduğunu kullanarak ölçüleri bul.',
    level: 2,
    items: [
      { text: '2 numaralı açı 62° ise 6 numaralı açı __°', answers: ['62'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }) },
      { text: '2 numaralı açı 62° ise 8 numaralı açı __°', answers: ['62'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }) },
      { text: '2 numaralı açı 62° ise 4 numaralı açı __°', answers: ['62'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }) },
      { text: '2 numaralı açı 62° ise 5 numaralı açı __°', answers: ['118'], visual: parallel(62, { numbers: true, marks: [{ pos: 2, text: '62°' }] }), hint: '5 ile 6 numaralı açılar komşu ve bütünlerdir.' },
      { text: '1 numaralı açı 110° ise 7 numaralı açı __°', answers: ['110'], visual: parallel(70, { numbers: true, marks: [{ pos: 1, text: '110°' }] }) },
      { text: '1 numaralı açı 110° ise 3 numaralı açı __°', answers: ['110'], visual: parallel(70, { numbers: true, marks: [{ pos: 1, text: '110°' }] }) },
      { text: '1 numaralı açı 110° ise 6 numaralı açı __°', answers: ['70'], visual: parallel(70, { numbers: true, marks: [{ pos: 1, text: '110°' }] }) },
    ],
  },
  {
    id: 'g6-paralel-dogrular-iki-kesen',
    outcomes: ['MAT.6.3.2'],
    type: 'quiz',
    title: 'İki kesenle oluşan şekiller',
    instructions: 'd₁ ∥ d₂ doğrularını iki kesen kesiyor. Oluşan şekilleri ve özelliklerini incele.',
    level: 2,
    questions: [
      { prompt: { text: 'Kesenler birbirine paralel değil ve paralel doğruların arasında kesişmiyor. Oluşan ABCD dörtgeni için hangisi kesinlikle doğrudur?', visual: FIG_YAMUK }, choices: ['Tüm kenarları eşittir.', 'En az bir çift karşılıklı kenarı paraleldir.', 'Tüm açıları diktir.', 'Hiç paralel kenarı yoktur.'], answer: 1, explain: 'AB ve DC, paralel doğrular üzerinde olduğundan paraleldir. Bu dörtgen bir yamuktur.' },
      { prompt: { text: 'Kesenler de birbirine paraleldir. Oluşan ABCD dörtgenine ne ad verilir?', visual: FIG_PARALELKENAR }, choices: ['Üçgen', 'Beşgen', 'Paralelkenar', 'Çember'], answer: 2 },
      { prompt: { text: 'Kesenler d₁ doğrusu üzerinde kesişiyor. Hangi şekil oluşur?', visual: FIG_UCGEN }, choices: ['Üçgen', 'Dörtgen', 'Beşgen', 'İki üçgen'], answer: 0 },
      { prompt: { text: 'Kesenler paralel doğruların arasında kesişiyor. Hangi şekiller oluşur?', visual: FIG_KELEBEK }, choices: ['Bir dörtgen', 'İki üçgen', 'Bir paralelkenar', 'Bir beşgen'], answer: 1 },
      { prompt: 'Bir dörtgenin iç açılarının ölçüleri toplamı kaç derecedir?', choices: ['180°', '270°', '360°', '540°'], answer: 2, explain: 'Dörtgen bir köşegenle iki üçgene ayrılır: 2 × 180° = 360°.' },
      { prompt: 'Bir üçgenin dış açılarının ölçüleri toplamı kaç derecedir?', choices: ['360°', '180°', '540°', '90°'], answer: 0 },
      { prompt: 'Paralelkenarda ardışık (komşu) iki iç açının ölçüleri toplamı kaç derecedir?', choices: ['90°', '360°', 'Bu açılar eştir.', '180°'], answer: 3 },
      { prompt: 'Bir üçgende bir dış açının ölçüsü neye eşittir?', choices: ['Komşu iç açısına', 'Kendisine komşu olmayan iki iç açının ölçüleri toplamına', '180°’ye', 'Üç iç açının ölçüleri toplamına'], answer: 1 },
    ],
  },
  {
    id: 'g6-dortgen-onermeleri',
    outcomes: ['MAT.6.3.2'],
    type: 'categorize',
    title: 'Dörtgenler hakkında önermeler',
    instructions: 'Yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen ve kare ile ilgili her önermeyi doğru gruba taşı.',
    level: 2,
    categories: [
      { id: 'dogru', label: 'Doğru önerme', color: '#22c55e' },
      { id: 'yanlis', label: 'Yanlış önerme', color: '#ef4444' },
    ],
    items: [
      { content: 'Her kare bir dikdörtgendir.', category: 'dogru' },
      { content: 'Her eşkenar dörtgen bir paralelkenardır.', category: 'dogru' },
      { content: 'Her dikdörtgen bir paralelkenardır.', category: 'dogru' },
      { content: 'Paralelkenarın karşılıklı açıları eştir.', category: 'dogru' },
      { content: 'Bu beş dörtgenin hepsinin iç açıları toplamı 360°’dir.', category: 'dogru' },
      { content: 'Her dikdörtgen bir karedir.', category: 'yanlis' },
      { content: 'Her paralelkenar bir eşkenar dörtgendir.', category: 'yanlis' },
      { content: 'Paralelkenarın komşu açıları her zaman eştir.', category: 'yanlis' },
      { content: 'Eşkenar dörtgenin bütün açıları diktir.', category: 'yanlis' },
      { content: 'Bir üçgenin iç açıları toplamı 360°’dir.', category: 'yanlis' },
    ],
  },
  {
    id: 'g6-ucgen-dortgen-ic-dis-acilar',
    outcomes: ['MAT.6.3.2'],
    type: 'fill',
    title: 'İç ve dış açılar',
    instructions: 'Üçgende iç açılar toplamı 180°, dörtgende 360°; dış açılar toplamı ise her ikisinde de 360°’dir. Boşlukları doldur.',
    level: 2,
    items: [
      { text: 'Bir üçgenin iki iç açısı 50° ve 70° ise üçüncü iç açısı __°', answers: ['60'] },
      { text: 'Bir dörtgenin üç iç açısı 80°, 95° ve 100° ise dördüncü iç açısı __°', answers: ['85'] },
      { text: 'Bir üçgende iki iç açı 45° ve 65° ise bunlara komşu olmayan dış açı __°', answers: ['110'] },
      { text: 'Bir üçgenin iki dış açısı 120° ve 130° ise üçüncü dış açısı __°', answers: ['110'] },
      { text: 'Bir dörtgenin dış açılarının ölçüleri toplamı __°', answers: ['360'] },
      { text: 'Bir yamukta aynı yan kenar üzerindeki iki iç açıdan biri 72° ise diğeri __°', answers: ['108'], hint: 'Yan kenar, iki paralel doğruyu kesen bir kesendir.' },
      { text: 'Bir paralelkenarın bir iç açısı 65° ise ona komşu iç açı __°', answers: ['115'] },
    ],
  },
  {
    id: 'g6-kosegen-ozellikleri',
    outcomes: ['MAT.6.3.3'],
    type: 'match',
    title: 'Köşegenlerden dörtgene',
    instructions: 'Köşegen özelliğini, bu köşegenlerle oluşan dörtgenle eşleştir.',
    level: 2,
    pairs: [
      { left: 'Köşegenleri birbirini ortalar.', right: 'Paralelkenar' },
      { left: 'Köşegenleri birbirini ortalar ve eşit uzunluktadır.', right: 'Dikdörtgen' },
      { left: 'Köşegenleri birbirini dik ortalar.', right: 'Eşkenar dörtgen' },
      { left: 'Köşegenleri birbirini dik ortalar ve eşit uzunluktadır.', right: 'Kare' },
    ],
    perRound: 4,
  },
  {
    id: 'g6-kosegenleri-birlestir',
    outcomes: ['MAT.6.3.3'],
    type: 'quiz',
    title: 'Hangi dörtgen oluşur?',
    instructions: 'AC ve BD doğru parçaları birbirini O noktasında ortalıyor. Aynı işaretli parçalar eş uzunluktadır. A, B, C ve D noktaları birleştirilince oluşan dörtgeni bul.',
    level: 2,
    questions: [
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(200, 110, 55) }, choices: ['Kare', 'Paralelkenar', 'Eşkenar dörtgen', 'Dikdörtgen'], answer: 1, explain: 'Köşegenler yalnızca birbirini ortalıyor; eşit uzunlukta ve dik değiller.' },
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(140, 140, 55) }, choices: ['Dikdörtgen', 'Eşkenar dörtgen', 'Kare', 'Yamuk'], answer: 0, explain: 'Köşegenler birbirini ortalıyor ve eşit uzunlukta, fakat dik değil.' },
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(200, 110, 90) }, choices: ['Dikdörtgen', 'Kare', 'Paralelkenar değildir', 'Eşkenar dörtgen'], answer: 3, explain: 'Köşegenler birbirini dik ortalıyor, fakat eşit uzunlukta değil.' },
      { prompt: { text: 'Hangi dörtgen oluşur?', visual: diagonals(140, 140, 90) }, choices: ['Eşkenar dörtgen', 'Kare', 'Dikdörtgen', 'Yamuk'], answer: 1, explain: 'Köşegenler birbirini dik ortalıyor ve eşit uzunlukta.' },
      { prompt: 'Dikdörtgenin köşegenleri için hangisi her zaman doğrudur?', choices: ['Birbirine diktir.', 'Eşit uzunluktadır ve birbirini ortalar.', 'Eşit uzunlukta değildir.', 'Birbirini ortalamaz.'], answer: 1 },
      { prompt: 'Köşegenleri birbirini dik ortalayan ama eşit uzunlukta olmayan dörtgen hangisidir?', choices: ['Kare', 'Dikdörtgen', 'Eşkenar dörtgen', 'Yamuk'], answer: 2 },
      { prompt: 'Hangi dörtgenin köşegenleri hem eşit uzunlukta hem de birbirine diktir?', choices: ['Dikdörtgen', 'Paralelkenar', 'Eşkenar dörtgen', 'Kare'], answer: 3 },
    ],
  },
  {
    id: 'g6-kosegen-uzunluklari',
    outcomes: ['MAT.6.3.3'],
    type: 'fill',
    title: 'Köşegen uzunlukları',
    instructions: 'Köşegenlerin birbirini ortaladığını ve eşitlik durumlarını kullanarak boşlukları doldur.',
    level: 2,
    items: [
      { text: 'ABCD paralelkenarında köşegenler O noktasında kesişiyor. |AO| = 5 cm ise |AC| = __ cm', answers: ['10'] },
      { text: 'ABCD dikdörtgeninde |AC| = 12 cm ise |BD| = __ cm', answers: ['12'] },
      { text: 'ABCD dikdörtgeninde köşegenler O noktasında kesişiyor ve |AC| = 12 cm ise |BO| = __ cm', answers: ['6'] },
      { text: 'ABCD karesinde |BD| = 8 cm ise |AC| = __ cm', answers: ['8'] },
      { text: 'Eşkenar dörtgenin köşegenleri arasındaki açının ölçüsü __°', answers: ['90'] },
      { text: 'KLMN paralelkenarında köşegenler O noktasında kesişiyor. |KO| = 7 cm ve |LO| = 4 cm ise |KM| + |LN| = __ cm', answers: ['22'] },
      { text: 'Köşegenleri birbirini ortalayan ve eşit uzunlukta olan dörtgen bir __ ya da karedir.', answers: ['dikdörtgen'], choices: ['dikdörtgen', 'yamuk', 'eşkenar dörtgen'] },
    ],
  },
  {
    id: 'g6-aci-problemleri',
    outcomes: ['MAT.6.3.4'],
    type: 'quiz',
    title: 'Açı problemleri',
    instructions: 'Şekildeki ya da problemdeki bilgileri kullanarak bilinmeyen açıyı bul.',
    level: 2,
    questions: [
      { prompt: { text: 'd₁ ∥ d₂ ise x kaç derecedir?', visual: parallel(65, { marks: [{ pos: 2, text: '65°' }, { pos: 6, text: 'x', color: INDIGO }] }) }, choices: ['65°', '115°', '25°', '130°'], answer: 0, explain: 'Yöndeş açılar eştir.' },
      { prompt: { text: 'd₁ ∥ d₂ ise x kaç derecedir?', visual: parallel(65, { marks: [{ pos: 2, text: '65°' }, { pos: 5, text: 'x', color: INDIGO }] }) }, choices: ['65°', '115°', '125°', '95°'], answer: 1, explain: 'x, 65°’lik açının yöndeşine komşu bütünler açıdır: 180° − 65° = 115°.' },
      { prompt: { text: 'd₁ ∥ d₂ ise x kaç derecedir?', visual: parallel(58, { marks: [{ pos: 3, text: '122°' }, { pos: 5, text: 'x', color: INDIGO }] }) }, choices: ['58°', '132°', '122°', '90°'], answer: 2, explain: 'İç ters açılar eştir.' },
      { prompt: 'Ayşe eşkenar dörtgen biçiminde bir uçurtma yapıyor. Uçurtmanın bir açısı 70°’dir. Bu açıya komşu olan açı kaç derecedir?', choices: ['70°', '110°', '140°', '290°'], answer: 1, explain: 'Eşkenar dörtgenin komşu açıları bütünlerdir: 180° − 70° = 110°.' },
      { prompt: 'Yere dik bir duvara yaslanan merdiven yerle 65°’lik açı yapıyor. Merdiven ile duvar arasındaki açı kaç derecedir?', choices: ['35°', '115°', '25°', '65°'], answer: 2, explain: 'Merdiven, duvar ve yer bir dik üçgen oluşturur: 180° − 90° − 65° = 25°.' },
      { prompt: 'Bir ikizkenar üçgenin tepe açısı 40°’dir. Taban açılarından birinin ölçüsü kaç derecedir?', choices: ['70°', '40°', '140°', '80°'], answer: 0, explain: '(180° − 40°) ÷ 2 = 70°' },
      { prompt: 'Yamuk biçimindeki bir bahçenin iki açısı 60° ve 75°’dir. Diğer iki açısının ölçüleri toplamı kaç derecedir?', choices: ['135°', '180°', '225°', '300°'], answer: 2, explain: '360° − (60° + 75°) = 225°' },
    ],
  },
  {
    id: 'g6-ucgen-dortgen-aci-hesapla',
    outcomes: ['MAT.6.3.4'],
    type: 'fill',
    title: 'Üçgen ve dörtgenlerde açılar',
    instructions: 'Üçgen ve dörtgenlerin açı özelliklerini kullanarak bilinmeyen açıyı bul.',
    level: 2,
    items: [
      { text: 'ABC üçgeninde A açısı 50°, B açısı 60° ise C açısı __°', answers: ['70'] },
      { text: 'Bir dik üçgende dar açılardan biri 35° ise diğer dar açı __°', answers: ['55'] },
      { text: 'Eşkenar üçgenin bir iç açısı __°', answers: ['60'] },
      { text: 'Bir paralelkenarın bir açısı 70° ise bu açının karşısındaki açı __°', answers: ['70'] },
      { text: 'Bir eşkenar dörtgenin bir açısı 40° ise ona komşu açı __°', answers: ['140'] },
      { text: 'Karenin bir köşegeni ile bir kenarı arasındaki açı __°', answers: ['45'] },
      { text: 'Bir dikdörtgenin köşegeni, bir köşede kenarlardan biriyle 30° açı yapıyorsa aynı köşede diğer kenarla __° açı yapar.', answers: ['60'] },
    ],
  },
  {
    id: 'g6-aci-olustur',
    outcomes: ['MAT.6.3.4', 'MAT.6.3.1'],
    type: 'manipulative',
    title: 'Açıyı hesapla ve oluştur',
    instructions: 'Önce bilinmeyen açıyı hesapla, sonra açıölçerle o açıyı oluştur.',
    level: 2,
    tool: 'angle',
    tasks: [
      { prompt: 'Bir üçgenin iki açısı 50° ve 60°’dir. Üçüncü açıyı oluştur.', target: { degrees: 70 } },
      { prompt: 'Bir paralelkenarın bir açısı 65°’dir. Ona komşu olan açıyı oluştur.', target: { degrees: 115 } },
      { prompt: 'Bir ikizkenar üçgenin taban açıları 75°’dir. Tepe açısını oluştur.', target: { degrees: 30 } },
      { prompt: 'd₁ ∥ d₂ doğrularını bir kesen kesiyor ve oluşan açılardan biri 125°’dir. Bu açının yöndeşini oluştur.', target: { degrees: 125 } },
    ],
  },

  // ── İşlemlerle Cebirsel Düşünme ve Değişimler ───────────────────────────
  {
    id: 'g6-sozel-cebirsel',
    outcomes: ['MAT.6.2.1'],
    type: 'match',
    title: 'Sözelden cebirsele',
    instructions: 'Her sözel ifadeyi onu gösteren cebirsel ifadeyle eşleştir.',
    level: 1,
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
    id: 'g6-cebirsel-ifade-kavramlari',
    outcomes: ['MAT.6.2.1'],
    type: 'quiz',
    title: 'Değişken, katsayı, sabit terim',
    instructions: 'Cebirsel ifadeleri ve anlamlarını yorumla.',
    level: 2,
    questions: [
      { prompt: '5x + 7 cebirsel ifadesinde x’in katsayısı kaçtır?', choices: ['5', '7', 'x', '12'], answer: 0 },
      { prompt: '5x + 7 cebirsel ifadesinde sabit terim hangisidir?', choices: ['5', '5x', '7', 'x'], answer: 2 },
      { prompt: '3a + 2b + 6 cebirsel ifadesi kaç terimlidir?', choices: ['1', '2', '6', '3'], answer: 3 },
      { prompt: 'Okul kantininde simidin tanesi 9 TL, ayranın tanesi 5 TL’dir. m tane simit ve n tane ayran alan öğrencinin ödeyeceği tutar hangisidir?', choices: ['5m + 9n', '9m + 5n', '14mn', '9 + 5 + m + n'], answer: 1 },
      { prompt: 'Mehmet’in parası Ahmet’in parasından 8 TL fazladır. Mehmet’in parası y TL ise Ahmet’in parası hangisidir?', choices: ['y + 8', '8y', 'y − 8', '[[y/8]]'], answer: 2 },
      { prompt: 'Hangisi 4a ifadesine denk değildir?', choices: ['a + 3a', '2a + a + a', 'a · 4', 'a + 4'], answer: 3 },
      { prompt: 'Kütüphane kampanyası için tişört satılıyor. Bir tişörtün maliyeti 120 TL, satış fiyatı 200 TL’dir. t tane tişört satılınca elde edilen kâr hangi ifadeyle gösterilir?', choices: ['80t', '200t', '320t', '200 + t'], answer: 0, explain: 'Her tişörtten 200 − 120 = 80 TL kâr edilir.' },
      { prompt: 'x + y + z ifadesi hangi durumu modelleyebilir?', choices: ['Kenarı x olan karenin alanı', 'Kenar uzunlukları x, y ve z olan üçgenin çevre uzunluğu', 'x’in 3 katı', 'Bir sayının yarısı'], answer: 1 },
    ],
  },
  {
    id: 'g6-ifade-degeri-alistirma',
    outcomes: ['MAT.6.2.1'],
    type: 'fill',
    title: 'Cebirsel ifadenin değeri',
    instructions: 'Değişkenin yerine verilen sayıyı yaz ve işlemi yap.',
    level: 1,
    generator: { id: 'evaluate', params: { max: 10 }, count: 8 },
  },
  {
    id: 'g6-cebir-karolari',
    outcomes: ['MAT.6.2.1'],
    type: 'manipulative',
    title: 'Cebir karolarıyla modelle',
    instructions: 'Uzun yeşil karo x’i, küçük sarı karo 1’i gösterir. İfadeyi karolarla oluştur.',
    level: 2,
    tool: 'algebra',
    tasks: [
      { prompt: '2x + 3 ifadesini modelle.', target: { x2: 0, x: 2, c: 3 } },
      { prompt: 'x + 2x + 1 ifadesini modelle.', target: { x2: 0, x: 3, c: 1 } },
      { prompt: '3(x + 1) ifadesini modelle.', target: { x2: 0, x: 3, c: 3 } },
      { prompt: 'Kenar uzunlukları x birim ve 2 birim olan dikdörtgenin çevre uzunluğunu gösteren ifadeyi modelle.', target: { x2: 0, x: 2, c: 4 } },
    ],
  },
  {
    id: 'g6-denk-ifadeler',
    outcomes: ['MAT.6.2.1'],
    type: 'categorize',
    title: 'Denk ifadeleri grupla',
    instructions: 'Her ifadeyi, kendisine denk olan ifadenin grubuna taşı.',
    level: 3,
    categories: [
      { id: 'a', label: '3x + 6', color: '#3b82f6' },
      { id: 'b', label: '6x', color: '#22c55e' },
      { id: 'c', label: '3x + 2', color: '#f97316' },
    ],
    items: [
      { content: 'x + x + x + 6', category: 'a' },
      { content: '3(x + 2)', category: 'a' },
      { content: '2x + x + 6', category: 'a' },
      { content: '6 · x', category: 'b' },
      { content: 'x · 6', category: 'b' },
      { content: '2x + 4x', category: 'b' },
      { content: 'x + 2x + 2', category: 'c' },
      { content: '2 + 3x', category: 'c' },
      { content: '3 · x + 2', category: 'c' },
    ],
  },
  {
    id: 'g6-oruntu-kurali',
    outcomes: ['MAT.6.2.2'],
    type: 'match',
    title: 'Örüntünün kuralı',
    instructions: 'Her sayı örüntüsünü, n. terimini veren cebirsel ifadeyle eşleştir.',
    level: 2,
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
    title: 'Örüntüler ve çokgenler',
    instructions: 'Örüntüdeki adım sayısı ile terim arasındaki ilişkiyi bul ve boşlukları doldur.',
    level: 3,
    items: [
      { text: '3, 7, 11, 15, ... örüntüsünün kuralı 4n − __', answers: ['1'] },
      { text: 'Kuralı 4n − 1 olan örüntünün 10. terimi __', answers: ['39'] },
      { text: 'Kibrit çöpleriyle yan yana kareler yapılıyor. Kuralı bularak 20 kare için gereken çöp sayısını yaz: __', answers: ['61'], visual: { kind: 'table', headers: ['Kare sayısı', '1', '2', '3', '20'], rows: [['Çöp sayısı', 4, 7, 10, '?']] }, hint: 'Her yeni kare için 3 çöp eklenir: 3n + 1.' },
      { text: 'Bir beşgen, bir köşesinden çizilen köşegenlerle 3 üçgene ayrılır. Beşgenin iç açılarının ölçüleri toplamı __°', answers: ['540'] },
      { text: 'Bir altıgen, bir köşesinden çizilen köşegenlerle __ üçgene ayrılır.', answers: ['4'] },
      { text: 'n kenarlı bir çokgenin iç açılarının ölçüleri toplamı (n − __) · 180°', answers: ['2'] },
      { text: 'Düzgün altıgenin bir dış açısının ölçüsü 360° ÷ 6 = __°', answers: ['60'] },
      { text: 'Düzgün sekizgenin bir iç açısının ölçüsü __°', answers: ['135'], hint: 'Önce bir dış açıyı bul: 360° ÷ 8.' },
    ],
  },
  {
    id: 'g6-duzgun-cokgen-sirala',
    outcomes: ['MAT.6.2.2'],
    type: 'sort',
    title: 'Düzgün çokgenlerde açılar',
    instructions: 'Kenar sayısı arttıkça açıların nasıl değiştiğini düşünerek sırala.',
    level: 2,
    rounds: [
      {
        prompt: 'Düzgün çokgenleri bir iç açısının ölçüsüne göre küçükten büyüğe sırala.',
        items: [
          { text: 'Eşkenar üçgen', visual: { kind: 'shape', shape: 'triangle', color: '#f97316' } },
          { text: 'Kare', visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } },
          { text: 'Düzgün beşgen', visual: { kind: 'shape', shape: 'pentagon', color: '#22c55e' } },
          { text: 'Düzgün altıgen', visual: { kind: 'shape', shape: 'hexagon', color: '#a855f7' } },
          { text: 'Düzgün sekizgen', visual: { kind: 'shape', shape: 'octagon', color: '#ec4899' } },
        ],
        ends: ['En küçük iç açı', 'En büyük iç açı'],
      },
      {
        prompt: 'Düzgün çokgenleri bir dış açısının ölçüsüne göre büyükten küçüğe sırala.',
        items: ['Eşkenar üçgen (3 kenar)', 'Kare (4 kenar)', 'Düzgün beşgen (5 kenar)', 'Düzgün altıgen (6 kenar)', 'Düzgün sekizgen (8 kenar)'],
        ends: ['En büyük dış açı', 'En küçük dış açı'],
      },
    ],
  },
  {
    id: 'g6-algoritma-sirala',
    outcomes: ['MAT.6.2.3'],
    type: 'sort',
    title: 'Algoritmayı sırala',
    instructions: 'Algoritmanın adımlarını doğru sıraya koy.',
    level: 2,
    rounds: [
      { prompt: 'Kuralı 3n + 2 olan örüntünün n. terimini hesaplayan algoritma', items: ['Başla', 'n değerini al', 'n’yi 3 ile çarp', 'Çarpıma 2 ekle', 'Sonucu yazdır', 'Bitir'] },
      { prompt: 'Kantinden m simit (tanesi 9 TL) ve n ayran (tanesi 5 TL) alan öğrencinin ödeyeceği tutarı bulan algoritma', items: ['Başla', 'm ve n değerlerini al', 'T = 9 · m hesapla', 'T’ye 5 · n ekle', 'T’yi yazdır', 'Bitir'] },
      { prompt: '“Aklından bir sayı tut” oyununun algoritması (sonuç hep 4 çıkar)', items: ['Bir sayı tut: x', '2 ile çarp: 2x', '8 ekle: 2x + 8', '2’ye böl: x + 4', 'Tuttuğun sayıyı çıkar: 4'] },
    ],
  },
  {
    id: 'g6-algoritma-yorumla',
    outcomes: ['MAT.6.2.3'],
    type: 'quiz',
    title: 'Algoritmayı yorumla',
    instructions: 'Tabloda adım adım verilen algoritmaları incele ve soruları cevapla.',
    level: 2,
    questions: [
      { prompt: { text: 'n = 5 girilirse algoritmanın çıktısı ne olur?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'n’yi oku'], [3, 's = 4 · n + 1'], [4, 's’yi yazdır'], [5, 'Bitir']] } }, choices: ['20', '21', '9', '25'], answer: 1 },
      { prompt: { text: 'Bu algoritma hangi örüntünün n. terimini hesaplar?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'n’yi oku'], [3, 's = 4 · n + 1'], [4, 's’yi yazdır'], [5, 'Bitir']] } }, choices: ['4, 8, 12, 16, ...', '1, 5, 9, 13, ...', '5, 9, 13, 17, ...', '5, 10, 15, 20, ...'], answer: 2 },
      { prompt: { text: 'Algoritmanın hesapladığı cebirsel ifade hangisidir?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'x’i oku'], [3, 'y = 2 · x'], [4, 'y = y − 3'], [5, 'y’yi yazdır'], [6, 'Bitir']] } }, choices: ['2x − 3', '2(x − 3)', 'x − 6', '3 − 2x'], answer: 0 },
      { prompt: { text: 'Aynı algoritmanın çıktısı 11 ise girilen x kaçtır?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'x’i oku'], [3, 'y = 2 · x'], [4, 'y = y − 3'], [5, 'y’yi yazdır'], [6, 'Bitir']] } }, choices: ['4', '19', '7', '8'], answer: 2, explain: '2 · 7 − 3 = 11' },
      { prompt: { text: 'Girdi-çıktı tablosunu oluşturan algoritma hangi ifadeyi hesaplar?', visual: { kind: 'table', headers: ['Girdi (x)', '1', '2', '3', '4'], rows: [['Çıktı', 6, 9, 12, 15]] } }, choices: ['x + 5', '3x', '3x + 3', '6x'], answer: 2 },
      { prompt: { text: 'Bu algoritma karenin çevre uzunluğunu bulmak için yazılmıştır. Hangi adım hatalıdır?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'Kenar uzunluğu a’yı oku'], [3, 'Ç = a + 4'], [4, 'Ç’yi yazdır'], [5, 'Bitir']] } }, choices: ['3. adım; Ç = 4 · a olmalı', '2. adım; a okunmamalı', '4. adım; Ç yazdırılmamalı', 'Hata yoktur'], answer: 0 },
      { prompt: { text: 'Algoritma hangi sayıları yazdırır?', visual: { kind: 'table', headers: ['Adım', 'Komut'], rows: [[1, 'Başla'], [2, 'n = 1 al'], [3, '2 · n + 1 değerini yazdır'], [4, 'n’yi 1 artır'], [5, 'n ≤ 4 ise 3. adıma dön'], [6, 'Bitir']] } }, choices: ['1, 3, 5, 7', '3, 5, 7, 9', '3, 5, 7, 9, 11', '2, 4, 6, 8'], answer: 1 },
    ],
  },
  {
    id: 'g6-algoritma-ciktisi',
    outcomes: ['MAT.6.2.3'],
    type: 'fill',
    title: 'Girdi ve çıktı',
    instructions: 'Algoritmayı adım adım uygula ya da cebirsel ifadesini yaz.',
    level: 2,
    items: [
      { text: 'Algoritma: “x’i 2 ile çarp, 3 ekle.” Girdi x = 4 ise çıktı __', answers: ['11'] },
      { text: 'Aynı algoritmada çıktı 17 ise girdi x = __', answers: ['7'] },
      { text: 'Algoritma: “n’yi oku, 5 ile çarp, 2 çıkar, yazdır.” Cebirsel ifadesi 5n − __', answers: ['2'] },
      { text: '“Bir sayı tut, 3 ekle, sonucu 2 ile çarp.” algoritmasının ifadesi 2(x + __)', answers: ['3'] },
      { text: 'Algoritma: “a’yı oku, a ile a’yı topla, sonuca a ekle.” Sonuç __a', answers: ['3'] },
      { text: 'Bir taksi açılışta 40 TL, her kilometre için 25 TL alıyor: T = 40 + 25 · k. k = 6 için T = __ TL', answers: ['190'] },
      { text: 'Aynı taksi algoritmasında T = 290 TL ise k = __ km', answers: ['10'] },
    ],
  },

  // ── Geometrik Nicelikler ────────────────────────────────────────────────
  {
    id: 'g6-alan-birimleri-donustur',
    outcomes: ['MAT.6.4.1'],
    type: 'fill',
    title: 'Alan birimlerini dönüştür',
    instructions: 'Alan ölçme birimleri 100’er 100’er büyür ve küçülür. İstenen birime çevir.',
    level: 2,
    generator: { id: 'convert', params: { kind: 'area' }, count: 8 },
  },
  {
    id: 'g6-alan-birimleri-sirala',
    outcomes: ['MAT.6.4.1'],
    type: 'sort',
    title: 'Alanları sırala',
    instructions: 'Gerekirse aynı birime çevir ve küçükten büyüğe sırala.',
    level: 2,
    rounds: [
      { prompt: 'Alan ölçme birimlerini küçükten büyüğe sırala.', items: ['mm²', 'cm²', 'dm²', 'm²', 'dam²', 'hm²', 'km²'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Alanları küçükten büyüğe sırala.', items: ['0,5 m²', '250 dm²', '3 m²', '32.000 cm²'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Alanları küçükten büyüğe sırala.', items: ['8.000 mm²', '1 dm²', '150 cm²', '0,02 m²'], ends: ['En küçük', 'En büyük'] },
    ],
  },
  {
    id: 'g6-uzunluk-alan-benzetimi',
    outcomes: ['MAT.6.4.1'],
    type: 'match',
    title: 'Uzunluktan alana',
    instructions: 'Uzunluk birimleri arasındaki ilişkiyi, ona karşılık gelen alan birimleri ilişkisiyle eşleştir.',
    level: 2,
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
    id: 'g6-paralelkenar-ucgen-alani',
    outcomes: ['MAT.6.4.2'],
    type: 'fill',
    title: 'Paralelkenarın ve üçgenin alanı',
    instructions: 'Paralelkenarın alanı = taban × yükseklik; üçgenin alanı = (taban × yükseklik) ÷ 2. Kesikli çizgi yüksekliği gösterir.',
    level: 2,
    items: [
      { text: 'Paralelkenarın alanı __ cm²', answers: ['40'], visual: areaFig('paralelkenar', '8 cm', '5 cm', '6 cm'), hint: 'Eğik kenarı değil, yüksekliği kullan.' },
      { text: 'Üçgenin alanı __ cm²', answers: ['30'], visual: areaFig('ucgen', '10 cm', '6 cm') },
      { text: 'Üçgenin alanı __ cm²', answers: ['14'], visual: areaFig('genis', '7 cm', '4 cm'), hint: 'Geniş açılı üçgende yükseklik üçgenin dışına düşebilir.' },
      { text: 'Paralelkenarın alanı __ m²', answers: ['84'], visual: areaFig('paralelkenar', '12 m', '7 m', '9 m') },
      { text: 'Üçgenin alanı __ cm²', answers: ['36'], visual: areaFig('ucgen', '9 cm', '8 cm') },
      { text: 'Alanı 48 cm² olan bir paralelkenarın bir kenarı 8 cm ise bu kenara ait yükseklik __ cm', answers: ['6'] },
      { text: 'Alanı 24 cm² olan bir üçgenin bir kenarı 8 cm ise bu kenara ait yükseklik __ cm', answers: ['6'] },
    ],
  },
  {
    id: 'g6-alan-bagintilari',
    outcomes: ['MAT.6.4.2'],
    type: 'quiz',
    title: 'Dikdörtgenden paralelkenara ve üçgene',
    instructions: 'Dikdörtgenin alan bağıntısından yola çıkarak paralelkenar ve üçgenin alanlarını yorumla.',
    level: 2,
    questions: [
      { prompt: 'Bir paralelkenarın bir ucundan kesilen dik üçgen diğer uca taşınarak dikdörtgen elde ediliyor. Alan için ne söylenebilir?', choices: ['İki katına çıkar.', 'Değişmez.', 'Yarıya iner.', 'Azalır.'], answer: 1, explain: 'Parçalar yalnızca yer değiştirdi; alan korunur.' },
      { prompt: 'Paralelkenarın alanı nasıl hesaplanır?', choices: ['İki komşu kenarın çarpımıyla', 'Tüm kenarların toplamıyla', 'Bir kenar uzunluğu ile o kenara ait yüksekliğin çarpımıyla', 'Bir kenarın 4 katıyla'], answer: 2 },
      { prompt: 'Bir paralelkenar bir köşegeniyle iki üçgene ayrılırsa her üçgenin alanı paralelkenarın alanının ne kadarıdır?', choices: ['Yarısı', 'Üçte biri', 'Aynısı', 'İki katı'], answer: 0 },
      { prompt: { text: 'Aynı paralel doğrular arasındaki bu üç üçgenin tabanı ortaktır (AB). Alanları için ne söylenebilir?', visual: FIG_ESIT_YUKSEKLIK }, choices: ['Ortadaki en büyüktür.', 'Sağdaki en büyüktür.', 'Karşılaştırılamaz.', 'Alanları eşittir.'], answer: 3, explain: 'Tabanları ortak, yükseklikleri paralel doğrular arasındaki uzaklık olduğu için eşittir.' },
      { prompt: 'Bir üçgenin tabanı 2 katına çıkarılır, yüksekliği aynı kalırsa alanı ne olur?', choices: ['2 katına çıkar.', '4 katına çıkar.', 'Değişmez.', 'Yarıya iner.'], answer: 0 },
      { prompt: 'Taban uzunlukları ve yükseklikleri eşit olan bir paralelkenar ile bir üçgenin alanları için hangisi doğrudur?', choices: ['Alanları eşittir.', 'Üçgenin alanı paralelkenarın alanının yarısıdır.', 'Üçgenin alanı daha büyüktür.', 'Paralelkenarın alanı üçgeninkinin yarısıdır.'], answer: 1 },
    ],
  },
  {
    id: 'g6-geometri-tahtasinda-alan',
    outcomes: ['MAT.6.4.2'],
    type: 'manipulative',
    title: 'Geometri tahtasında alan',
    instructions: 'Çivilere dokunarak istenen alana sahip şekli oluştur. Her küçük kare 1 birimkaredir.',
    level: 3,
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Alanı 6 birimkare olan bir üçgen oluştur.', target: { sides: 3, area: 6 } },
      { prompt: 'Alanı 8 birimkare olan bir üçgen oluştur. (İpucu: taban 4, yükseklik 4 olabilir.)', target: { sides: 3, area: 8 } },
      { prompt: 'Alanı 12 birimkare olan bir paralelkenar oluştur.', target: { sides: 4, area: 12 } },
      { prompt: 'Tabanı 5 birim olan ve alanı 10 birimkare olan bir paralelkenar oluştur.', target: { sides: 4, area: 10 } },
    ],
  },
  {
    id: 'g6-alan-problemleri',
    outcomes: ['MAT.6.4.3'],
    type: 'quiz',
    title: 'Alan problemleri',
    instructions: 'Problemi bir şekille modelle, verilenleri belirle ve çöz.',
    level: 2,
    questions: [
      { prompt: 'Paralelkenar biçimindeki bir tarlanın bir kenarı 120 m, bu kenara ait yüksekliği 50 m’dir. Tarlanın alanı kaç m²’dir?', choices: ['6.000 m²', '170 m²', '3.000 m²', '12.000 m²'], answer: 0 },
      { prompt: 'Üçgen biçimindeki bir flamanın tabanı 30 cm, yüksekliği 40 cm’dir. Bu flamalardan 10 tane yapmak için kaç cm² kumaş gerekir?', choices: ['12.000 cm²', '6.000 cm²', '600 cm²', '700 cm²'], answer: 1, explain: 'Bir flama: 30 × 40 ÷ 2 = 600 cm². 10 flama: 6.000 cm².' },
      { prompt: 'Boyutları 4 m ve 3 m olan bir duvar boyanacak. 1 kutu boya 6 m² alanı boyuyor. Kaç kutu boya gerekir?', choices: ['3', '4', '2', '12'], answer: 2 },
      { prompt: 'Kenar uzunlukları 5 m ve 4 m olan dikdörtgen biçimli bir odanın zemini, her birinin alanı 0,25 m² olan kare fayanslarla kaplanacak. Kaç fayans gerekir?', choices: ['20', '40', '100', '80'], answer: 3, explain: '20 ÷ 0,25 = 80' },
      { prompt: 'Bir kilim deseninde tabanı 6 cm, yüksekliği 4 cm olan 25 eş üçgen var. Üçgenlerin toplam alanı kaç cm²’dir?', choices: ['300 cm²', '600 cm²', '250 cm²', '150 cm²'], answer: 0 },
      { prompt: 'Uzunluğu 20 m, genişliği 12 m olan dikdörtgen bir bahçede, tabanı 6 m ve yüksekliği 4 m olan üçgen biçimli bir çiçeklik var. Kalan alana çim ekilecek. Çim ekilecek alan kaç m²’dir?', choices: ['216 m²', '228 m²', '240 m²', '252 m²'], answer: 1, explain: '20 × 12 = 240 m²; çiçeklik 6 × 4 ÷ 2 = 12 m²; 240 − 12 = 228 m².' },
      { prompt: 'Paralelkenar biçimindeki bir parkın alanı 1.800 m², bir kenarı 60 m’dir. Bu kenara ait yükseklik kaç metredir?', choices: ['120 m', '1.740 m', '30 m', '15 m'], answer: 2 },
    ],
  },
  {
    id: 'g6-alan-problemleri-hesapla',
    outcomes: ['MAT.6.4.3'],
    type: 'fill',
    title: 'Alanı hesapla',
    instructions: 'Problemleri çöz ve sonucu yaz.',
    level: 3,
    items: [
      { text: 'Boyutları 100 m ve 64 m olan dikdörtgen biçimli bir futbol sahasının alanı __ m²', answers: ['6400'] },
      { text: 'Paralelkenar biçimindeki bir camın bir kenarı 80 cm, bu kenara ait yüksekliği 50 cm’dir. Camın alanı __ cm²', answers: ['4000'] },
      { text: 'Tabanı 8 m, yüksekliği 5 m olan üçgen biçimli bir arsanın metrekaresi 1.500 TL ise arsanın fiyatı __ TL', answers: ['30000'] },
      { text: 'Kenar uzunluğu 3 m olan kare biçimli bir duvarda 1 m’ye 2 m’lik bir kapı var. Kapı dışındaki duvarın alanı __ m²', answers: ['7'] },
      { text: 'Bir çiftçi tabanı 40 m, yüksekliği 30 m olan üçgen biçimli tarlasının her metrekaresine 2 fide dikiyor. Toplam __ fide diker.', answers: ['1200'] },
      { text: 'Alanı 6 m² olan bir halının alanı __ dm²', answers: ['600'] },
    ],
  },
  {
    id: 'g6-pi-sayisi',
    outcomes: ['MAT.6.4.4'],
    type: 'quiz',
    title: 'Pi sayısını keşfet',
    instructions: 'Çember biçimli nesnelerin çevre ve çap uzunlukları arasındaki ilişkiyi incele.',
    level: 1,
    questions: [
      { prompt: { text: 'Tablodaki her nesnenin çevre uzunluğunu çap uzunluğuna bölersek ne fark ederiz?', visual: { kind: 'table', headers: ['Nesne', 'Çevre (cm)', 'Çap (cm)'], rows: [['Tabak', 62.8, 20], ['Duvar saati', 94.2, 30], ['Kavanoz kapağı', 31.4, 10]] } }, choices: ['Sonuçlar hep farklıdır.', 'Her birinde yaklaşık 3,14 elde edilir.', 'Her birinde 2 elde edilir.', 'Sonuç çapa eşittir.'], answer: 1 },
      { prompt: 'Çemberin uzunluğunun çap uzunluğuna bölümüyle elde edilen sabit sayıya ne ad verilir?', choices: ['Yarıçap', 'Merkez açı', 'Pi sayısı (π)', 'Alan'], answer: 2 },
      { prompt: 'r yarıçap uzunluğu olmak üzere çemberin uzunluğunu veren bağıntı hangisidir?', choices: ['Ç = 2 · π · r', 'Ç = π · r', 'Ç = 2 · r', 'Ç = π + r'], answer: 0 },
      { prompt: 'Bir çemberin çapı 2 katına çıkarsa çemberin uzunluğu ne olur?', choices: ['Değişmez.', '4 katına çıkar.', 'Yarıya iner.', '2 katına çıkar.'], answer: 3 },
      { prompt: 'π sayısının yaklaşık değeri hangisidir?', choices: ['2,14', '3,14', '3,41', '31,4'], answer: 1 },
      { prompt: 'Hangisi doğrudur?', choices: ['Çemberin uzunluğu, çapının 3 katından biraz fazladır.', 'Çemberin uzunluğu, çapının 2 katıdır.', 'Çemberin uzunluğu, çapına eşittir.', 'Çemberin uzunluğu, yarıçapının π katıdır.'], answer: 0 },
    ],
  },
  {
    id: 'g6-cevre-cap-orani',
    outcomes: ['MAT.6.4.4'],
    type: 'fill',
    title: 'Çevre ÷ çap',
    instructions: 'Ölçümleri kullanarak çember uzunluğu ile çap arasındaki ilişkiyi bul.',
    level: 2,
    items: [
      { text: 'Çevresi 31,4 cm, çapı 10 cm olan kapak için çevre ÷ çap = __', answers: ['3,14'] },
      { text: 'Çevresi 47,1 cm, çapı 15 cm olan tabak için çevre ÷ çap = __', answers: ['3,14'] },
      { text: 'Çapı 50 cm olan bir bisiklet tekerleğinin çevresi yaklaşık 157 cm’dir. Çevre ÷ çap ≈ __', answers: ['3,14'] },
      { text: 'Ç = π · R bağıntısında R, çemberin __ uzunluğudur.', answers: ['çap'], choices: ['çap', 'yarıçap', 'yay'] },
      { text: 'Ç = 2 · π · r bağıntısında r, çemberin __ uzunluğudur.', answers: ['yarıçap'], choices: ['çap', 'yarıçap', 'yay'] },
      { text: 'Yarıçapı 5 cm olan bir çemberin çapı __ cm', answers: ['10'] },
      { text: 'Çapı 20 cm olan bir çemberin uzunluğu (π = 3,14) __ cm', answers: ['62,8'] },
    ],
  },
  {
    id: 'g6-cember-uzunlugu-alistirma',
    outcomes: ['MAT.6.4.5'],
    type: 'fill',
    title: 'Çemberin uzunluğu',
    instructions: 'π = 3 alarak çemberin uzunluğunu hesapla: Ç = 2 · π · r',
    level: 1,
    generator: { id: 'circle', params: { ask: 'circ' }, count: 8 },
  },
  {
    id: 'g6-cember-problemleri',
    outcomes: ['MAT.6.4.5'],
    type: 'quiz',
    title: 'Çember problemleri',
    instructions: 'Çap ya da yarıçap verilen çemberlerle ilgili problemleri çöz. π değerini soruda verildiği gibi kullan.',
    level: 2,
    questions: [
      { prompt: 'Yarıçapı 35 cm olan bir bisiklet tekerleği 10 tur dönerse bisiklet kaç cm yol alır? (π = 3)', choices: ['1.050 cm', '2.100 cm', '210 cm', '700 cm'], answer: 1, explain: 'Bir tur: 2 · 3 · 35 = 210 cm. 10 tur: 2.100 cm.' },
      { prompt: 'Çapı 70 cm olan bir hulahop çemberinin uzunluğu kaç cm’dir? (π = 3,14)', choices: ['219,8 cm', '439,6 cm', '109,9 cm', '73,14 cm'], answer: 0 },
      { prompt: 'Çapı 10 m olan çember biçimli bir havuzun çevresine 2 sıra çit çekilecek. Kaç metre çit gerekir? (π = 3)', choices: ['30 m', '120 m', '20 m', '60 m'], answer: 3, explain: 'Bir sıra: 3 · 10 = 30 m. İki sıra: 60 m.' },
      { prompt: 'Uzunluğu 18 cm olan bir çemberin yarıçapı kaç cm’dir? (π = 3)', choices: ['6 cm', '3 cm', '9 cm', '54 cm'], answer: 1, explain: '2 · 3 · r = 18 ise r = 3 cm.' },
      { prompt: 'Bir koşu pistinin iki ucu yarım çember biçimindedir. Yarım çemberlerin çapı 60 m, düz kısımların her biri 100 m ise pistin bir turu kaç metredir? (π = 3)', choices: ['280 m', '560 m', '380 m', '360 m'], answer: 2, explain: 'İki yarım çember bir tam çember eder: 3 · 60 = 180 m. 180 + 200 = 380 m.' },
      { prompt: 'Akrebinin uzunluğu 6 cm olan bir duvar saatinde akrebin ucu 12 saatte kaç cm yol alır? (π = 3,14)', choices: ['18,84 cm', '37,68 cm', '75,36 cm', '113,04 cm'], answer: 1, explain: 'Akrep 12 saatte bir tam tur atar: 2 · 3,14 · 6 = 37,68 cm.' },
    ],
  },
  {
    id: 'g6-cemberleri-sirala',
    outcomes: ['MAT.6.4.5'],
    type: 'sort',
    title: 'Çemberleri sırala',
    instructions: 'π = 3 alarak çember uzunluklarını hesapla ve kısadan uzuna sırala.',
    level: 2,
    rounds: [
      { prompt: 'Çemberleri uzunluklarına göre kısadan uzuna sırala. (π = 3)', items: ['Yarıçapı 2 cm', 'Çapı 5 cm', 'Yarıçapı 3 cm', 'Çapı 8 cm'], ends: ['En kısa', 'En uzun'] },
      { prompt: 'Çemberleri uzunluklarına göre kısadan uzuna sırala. (π = 3)', items: ['Uzunluğu 20 cm', 'Çapı 7 cm', 'Yarıçapı 4 cm', 'Çapı 9 cm'], ends: ['En kısa', 'En uzun'] },
    ],
  },
  {
    id: 'g6-merkez-aci-ve-yay',
    outcomes: ['MAT.6.4.6'],
    type: 'fill',
    title: 'Merkez açı ve yay uzunluğu',
    instructions: 'Merkez açı tam açının (360°) kaçta biriyse, gördüğü yay da çemberin o kadarıdır.',
    level: 2,
    items: [
      { text: 'Çemberin uzunluğu 36 cm. 90°’lik merkez açının gördüğü yay __ cm', answers: ['9'], visual: sector(90) },
      { text: 'Çemberin uzunluğu 36 cm. 120°’lik merkez açının gördüğü yay __ cm', answers: ['12'], visual: sector(120) },
      { text: 'Çemberin uzunluğu 24 cm. 60°’lik merkez açının gördüğü yay __ cm', answers: ['4'], visual: sector(60) },
      { text: 'Çemberin uzunluğu 30 cm. 180°’lik merkez açının gördüğü yay __ cm', answers: ['15'], visual: sector(180) },
      { text: 'Çemberin uzunluğu 48 cm. 45°’lik merkez açının gördüğü yay __ cm', answers: ['6'], visual: sector(45) },
      { text: 'Çemberin uzunluğu 60 cm. 270°’lik merkez açının gördüğü yay __ cm', answers: ['45'], visual: sector(270) },
      { text: 'Çemberin uzunluğu 40 cm, yayın uzunluğu 10 cm ise merkez açı __°', answers: ['90'], visual: sector(90, '?') },
      { text: 'Yarıçapı 6 cm olan çemberde 60°’lik merkez açının gördüğü yay __ cm (π = 3)', answers: ['6'] },
    ],
  },
  {
    id: 'g6-merkez-aci-kesir',
    outcomes: ['MAT.6.4.6'],
    type: 'match',
    title: 'Merkez açı çemberin kaçta biri?',
    instructions: 'Her merkez açıyı, gördüğü yayın çemberin ne kadarı olduğunu gösteren kartla eşleştir.',
    level: 1,
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
    id: 'g6-merkez-aci-problemleri',
    outcomes: ['MAT.6.4.6'],
    type: 'quiz',
    title: 'Dönme dolap, saat ve pizza',
    instructions: 'Merkez açı ile yay arasındaki ilişkiyi günlük hayat durumlarında kullan.',
    level: 2,
    questions: [
      { prompt: '12 kabinli bir dönme dolapta kabinler eşit aralıklarla yerleştirilmiştir. Ardışık iki kabin ile merkez arasındaki açı kaç derecedir?', choices: ['12°', '30°', '36°', '60°'], answer: 1, explain: '360° ÷ 12 = 30°' },
      { prompt: 'Saat 03.00’te akrep ile yelkovan arasındaki küçük açı kaç derecedir?', choices: ['30°', '60°', '90°', '120°'], answer: 2 },
      { prompt: 'Saat 02.00’de akrep ile yelkovan arasındaki küçük açı kaç derecedir?', choices: ['60°', '30°', '45°', '120°'], answer: 0, explain: 'Saat kadranında her saat aralığı 360° ÷ 12 = 30°’dir: 2 · 30° = 60°.' },
      { prompt: 'Bir pizza 8 eş dilime ayrılmıştır. Bir dilimin merkez açısı kaç derecedir?', choices: ['8°', '36°', '60°', '45°'], answer: 3 },
      { prompt: 'Uzunluğu 60 cm olan bir çemberde 15 cm’lik yayı gören merkez açı kaç derecedir?', choices: ['15°', '90°', '45°', '60°'], answer: 1, explain: '15 cm, 60 cm’nin dörtte biridir; 360°’nin dörtte biri 90°’dir.' },
      { prompt: 'Bir çemberde merkez açının ölçüsü 2 katına çıkarsa gördüğü yayın uzunluğu ne olur?', choices: ['Değişmez.', '2 katına çıkar.', 'Yarıya iner.', '4 katına çıkar.'], answer: 1 },
      { prompt: 'Bir çemberde 40°’lik merkez açının gördüğü yay 5 cm ise 120°’lik merkez açının gördüğü yay kaç cm’dir?', choices: ['10 cm', '20 cm', '15 cm', '45 cm'], answer: 2, explain: '120°, 40°’nin 3 katıdır; yay da 3 katı olur: 15 cm.' },
    ],
  },
]
