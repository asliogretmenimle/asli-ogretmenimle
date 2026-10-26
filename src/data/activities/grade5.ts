import type { Activity, Visual } from '../types'

// ───────────────────────────────────────────────────────────────────────────
// Çizim yardımcıları (elle yazılmış, basit ve geometrik olarak doğru SVG'ler)
// ───────────────────────────────────────────────────────────────────────────
const INK = '#1f2340'
const BLUE = '#6366f1'
const SOFT = '#e0e7ff'
const r1 = (n: number) => String(Math.round(n * 10) / 10)

const svg = (w: number, h: number, body: string, x0 = 0, y0 = 0): Visual => ({
  kind: 'svg',
  svg: `<svg viewBox="${r1(x0)} ${r1(y0)} ${r1(w)} ${r1(h)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
})
const ln = (x1: number, y1: number, x2: number, y2: number, color = INK, w = 3, dash = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
/** (x1,y1)'den (x2,y2)'ye bakan ok ucu; ucu (x2,y2)'dedir */
const head = (x1: number, y1: number, x2: number, y2: number, color = INK) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 12, W = 6
  const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a)
  const p = (x: number, y: number) => `${r1(x)},${r1(y)}`
  return `<polygon points="${p(x2, y2)} ${p(bx + W * Math.sin(a), by - W * Math.cos(a))} ${p(bx - W * Math.sin(a), by + W * Math.cos(a))}" fill="${color}"/>`
}
const txt = (x: number, y: number, s: string, size = 15, color = INK, anchor = 'middle') =>
  `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="${color}" font-family="sans-serif">${s}</text>`
const pt = (x: number, y: number, label: string, lx: number, ly: number) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="4.5" fill="${INK}"/>${txt(lx, ly, label)}`
/** İki ucu oklu doğru */
const fullLine = (x1: number, y1: number, x2: number, y2: number) => ln(x1, y1, x2, y2) + head(x2, y2, x1, y1) + head(x1, y1, x2, y2)

// Temel çizimler
const NOKTA = svg(200, 80, pt(100, 42, 'A', 100, 26))
const DOGRU = svg(200, 80, fullLine(10, 45, 190, 45) + pt(70, 45, 'A', 70, 30) + pt(130, 45, 'B', 130, 30) + txt(182, 70, 'd', 15))
const DOGRU_PARCASI = svg(200, 80, ln(40, 45, 160, 45) + pt(40, 45, 'A', 40, 30) + pt(160, 45, 'B', 160, 30))
const ISIN = svg(200, 80, ln(40, 45, 190, 45) + head(40, 45, 190, 45) + pt(40, 45, 'A', 40, 30) + pt(115, 45, 'B', 115, 30))
const ACI = svg(
  200,
  130,
  ln(40, 110, 185, 110) + head(40, 110, 188, 110) +
    ln(40, 110, 40 + 135 * Math.cos(0.8727), 110 - 135 * Math.sin(0.8727)) + head(40, 110, 40 + 138 * Math.cos(0.8727), 110 - 138 * Math.sin(0.8727)) +
    `<path d="M68,110 A28,28 0 0,0 ${r1(40 + 28 * Math.cos(0.8727))},${r1(110 - 28 * Math.sin(0.8727))}" fill="none" stroke="${BLUE}" stroke-width="3"/>` +
    pt(150, 110, 'A', 150, 127) + pt(40, 110, 'B', 26, 124) + pt(40 + 90 * Math.cos(0.8727), 110 - 90 * Math.sin(0.8727), 'C', 82, 36),
)
const CEMBER = svg(
  200,
  130,
  `<circle cx="100" cy="65" r="52" fill="none" stroke="${BLUE}" stroke-width="3"/>` + ln(100, 65, 152, 65) + pt(100, 65, 'O', 88, 60) + pt(152, 65, 'A', 166, 60) + txt(126, 58, 'r', 14),
)
const DIKME = svg(
  200,
  125,
  fullLine(10, 100, 190, 100) + ln(100, 25, 100, 100) + `<path d="M100,88 L112,88 L112,100" fill="none" stroke="${INK}" stroke-width="2"/>` +
    pt(100, 25, 'A', 114, 30) + pt(100, 100, 'H', 92, 118) + txt(182, 90, 'd', 15),
)
const PARALEL = svg(200, 125, fullLine(10, 38, 190, 38) + fullLine(10, 92, 190, 92) + txt(182, 28, 'd', 15) + txt(182, 82, 'k', 15))
// 50°'lik açıyla kesişen iki doğru (kesişim noktası 100,65)
const KX = 75 * Math.cos(0.8727), KY = 75 * Math.sin(0.8727)
const KESISEN = svg(200, 130, fullLine(10, 65, 190, 65) + fullLine(100 - KX, 65 + KY, 100 + KX, 65 - KY) + txt(182, 58, 'd', 15) + txt(160, 22, 'k', 15))
const DIK_KESISEN = svg(
  200,
  130,
  fullLine(10, 65, 190, 65) + fullLine(100, 6, 100, 124) + `<path d="M100,53 L112,53 L112,65" fill="none" stroke="${INK}" stroke-width="2"/>` + txt(182, 58, 'd', 15) + txt(115, 18, 'k', 15),
)
const KESISEN_ABCD = svg(
  200,
  130,
  fullLine(10, 65, 190, 65) + fullLine(100 - KX, 65 + KY, 100 + KX, 65 - KY) +
    txt(128, 58, 'a', 16, BLUE) + txt(86, 44, 'b', 16, BLUE) + txt(72, 84, 'c', 16, BLUE) + txt(114, 98, 'd', 16, BLUE),
)
// Ardışık kesişen üç doğrunun oluşturduğu üçgen
const UC_DOGRU = svg(
  200,
  150,
  `<polygon points="40,120 160,120 100,30" fill="${SOFT}"/>` + ln(15, 120, 185, 120) + ln(175, 142.5, 85, 7.5) + ln(115, 7.5, 25, 142.5) +
    txt(190, 114, 'd', 15) + txt(74, 16, 'e', 15) + txt(128, 16, 'f', 15),
)
/**
 * Köşeleri A, B, C olan üçgen; iç açı etiketleri verilir.
 * acute: A = 50°, B = 60°, C = 70° · right: A = 90°, B = 35° · obtuse: A ≈ 41°, B ≈ 28°, C ≈ 111° (çizimler ölçülere yakındır)
 */
const tri = (a: string, b: string, c: string, kind: 'acute' | 'right' | 'obtuse') => {
  const C = kind === 'acute' ? [119.8, 15] : kind === 'right' ? [25, 16] : [85, 75]
  const la = kind === 'right' ? [58, 112] : [56, 121]
  const lc = kind === 'acute' ? [119, 46] : kind === 'right' ? [38, 54] : [86, 99]
  const lC = kind === 'acute' ? [120, 9] : kind === 'right' ? [14, 18] : [85, 66]
  return svg(
    210,
    150,
    `<polygon points="25,128 185,128 ${C[0]},${C[1]}" fill="${SOFT}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      (kind === 'right' ? `<path d="M25,114 L39,114 L39,128" fill="none" stroke="${INK}" stroke-width="2"/>` : '') +
      txt(la[0], la[1], a, 14, BLUE) + txt(152, 121, b, 14, BLUE) + txt(lc[0], lc[1], c, 14, BLUE) +
      txt(14, 144, 'A', 15) + txt(196, 144, 'B', 15) + txt(lC[0], lC[1], 'C', 15),
  )
}
/** A ve B merkezli, yarıçapları rA ve rB (cm), merkezleri arası d (cm) olan iki çember ve ABC üçgeni */
const cemberUcgen = (rA: number, rB: number, d: number) => {
  const k = 12
  const ax = 0, bx = d * k, cy = 0
  const xc = (d * d + rA * rA - rB * rB) / (2 * d)
  const yc = Math.sqrt(rA * rA - xc * xc)
  const cx = xc * k, cyy = cy - yc * k
  const minX = Math.min(ax - rA * k, bx - rB * k) - 14, maxX = Math.max(ax + rA * k, bx + rB * k) + 14
  const R = Math.max(rA, rB) * k
  const body =
    `<circle cx="${r1(ax)}" cy="0" r="${r1(rA * k)}" fill="none" stroke="${BLUE}" stroke-width="2" opacity="0.7"/>` +
    `<circle cx="${r1(bx)}" cy="0" r="${r1(rB * k)}" fill="none" stroke="#f97316" stroke-width="2" opacity="0.7"/>` +
    `<polygon points="${r1(ax)},0 ${r1(bx)},0 ${r1(cx)},${r1(cyy)}" fill="${SOFT}" fill-opacity="0.6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    pt(ax, 0, 'A', ax - 10, 18) + pt(bx, 0, 'B', bx + 10, 18) + pt(cx, cyy, 'C', cx, cyy - 9)
  return svg(maxX - minX, 2 * R + 28, body, minX, -R - 14)
}
// Kibrit çöpü örüntüsü: 1, 2, 3 kare
const sticks = (k: number, x0: number) => {
  const s = 22, y0 = 12, c = '#b45309'
  let out = ''
  for (let i = 0; i < k; i++) out += ln(x0 + i * s, y0, x0 + (i + 1) * s, y0, c, 4) + ln(x0 + i * s, y0 + s, x0 + (i + 1) * s, y0 + s, c, 4)
  for (let i = 0; i <= k; i++) out += ln(x0 + i * s, y0, x0 + i * s, y0 + s, c, 4)
  return out + txt(x0 + (k * s) / 2, 56, `${k}. adım`, 11)
}
const KIBRIT = svg(200, 64, sticks(1, 12) + sticks(2, 56) + sticks(3, 122))
// Daire grafiği: yarım + çeyrek + çeyrek
const DAIRE_GRAFIGI = svg(
  140,
  140,
  `<path d="M70,70 L70,10 A60,60 0 0,1 70,130 Z" fill="#6366f1" stroke="#fff" stroke-width="2"/>` +
    `<path d="M70,70 L70,130 A60,60 0 0,1 10,70 Z" fill="#f59e0b" stroke="#fff" stroke-width="2"/>` +
    `<path d="M70,70 L10,70 A60,60 0 0,1 70,10 Z" fill="#10b981" stroke="#fff" stroke-width="2"/>` +
    txt(101, 74, 'Yürüyerek', 11, '#fff') + txt(45, 101, 'Servis', 11, '#fff') + txt(44, 50, 'Özel araç', 10, '#fff'),
)
// Dikey ekseni 90'dan başlayan yanıltıcı sütun grafiği
const YANILTICI_GRAFIK = svg(
  200,
  160,
  ln(45, 15, 45, 130, INK, 2) + ln(45, 130, 190, 130, INK, 2) +
    txt(36, 134, '90', 11, INK, 'end') + txt(36, 79, '95', 11, INK, 'end') + txt(36, 24, '100', 11, INK, 'end') +
    ln(41, 75, 45, 75, INK, 2) + ln(41, 20, 45, 20, INK, 2) +
    `<rect x="70" y="75" width="40" height="55" fill="#f59e0b"/><rect x="130" y="20" width="40" height="110" fill="#6366f1"/>` +
    txt(90, 148, 'A', 13) + txt(150, 148, 'B', 13),
)
/** Basit akış şeması: o = başla/bitir, p = giriş/çıkış, r = işlem, d = karar */
const flow = (steps: [('o' | 'p' | 'r' | 'd'), string][]) => {
  const H = 32, G = 18
  let body = ''
  steps.forEach(([k, s], i) => {
    const y = 8 + i * (H + G), cy = y + H / 2
    if (k === 'o') body += `<ellipse cx="100" cy="${cy}" rx="62" ry="${H / 2}" fill="#fde68a" stroke="${INK}" stroke-width="2"/>`
    if (k === 'p') body += `<polygon points="42,${y} 172,${y} 158,${y + H} 28,${y + H}" fill="#bae6fd" stroke="${INK}" stroke-width="2"/>`
    if (k === 'r') body += `<rect x="30" y="${y}" width="140" height="${H}" rx="3" fill="#ddd6fe" stroke="${INK}" stroke-width="2"/>`
    if (k === 'd') body += `<polygon points="100,${y - 4} 175,${cy} 100,${y + H + 4} 25,${cy}" fill="#bbf7d0" stroke="${INK}" stroke-width="2"/>`
    body += txt(100, cy + 4, s, 12)
    if (i < steps.length - 1) body += ln(100, y + H + (k === 'd' ? 4 : 0), 100, y + H + G - 2, INK, 2) + head(100, y + H, 100, y + H + G, INK)
  })
  return svg(200, 16 + steps.length * (H + G) - G, body)
}
const AKIS_1 = flow([['o', 'Başla'], ['p', 'Sayıyı gir'], ['r', 'Sayıyı 4 ile çarp'], ['r', 'Sonuçtan 8 çıkar'], ['p', 'Sonucu yazdır'], ['o', 'Bitir']])
const AKIS_2 = flow([['o', 'Başla'], ['p', 'Ürünün fiyatını gir'], ['r', 'Fiyatı 2 ile çarp'], ['r', 'Sonuçtan 50 çıkar'], ['p', 'Ödenecek tutarı yazdır'], ['o', 'Bitir']])
const SEKIL_OVAL = svg(160, 50, `<ellipse cx="80" cy="25" rx="62" ry="18" fill="#fde68a" stroke="${INK}" stroke-width="2"/>` + txt(80, 30, 'Başla', 13))
const SEKIL_PARALEL = svg(160, 50, `<polygon points="30,7 150,7 130,43 10,43" fill="#bae6fd" stroke="${INK}" stroke-width="2"/>` + txt(80, 30, 'Sayıyı gir', 13))
const SEKIL_DIKDORTGEN = svg(160, 50, `<rect x="15" y="7" width="130" height="36" rx="3" fill="#ddd6fe" stroke="${INK}" stroke-width="2"/>` + txt(80, 30, 'Sayıyı 2 ile çarp', 12))
const SEKIL_KARAR = svg(160, 56, `<polygon points="80,3 150,28 80,53 10,28" fill="#bbf7d0" stroke="${INK}" stroke-width="2"/>` + txt(80, 33, 'Sayı > 10 mu?', 12))
const SEKIL_OK = svg(160, 50, ln(20, 25, 128, 25, INK, 3) + head(20, 25, 140, 25))
// Köşegeni çizilmiş beşgen
const BESGEN_KOSEGEN = svg(
  140,
  120,
  `<polygon points="70,12 117.6,46.5 99.4,102.5 40.6,102.5 22.4,46.5" fill="${SOFT}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    ln(70, 12, 99.4, 102.5, '#ef4444', 3, '6 5') +
    txt(70, 8, 'A', 13) + txt(127, 46, 'B', 13) + txt(106, 116, 'C', 13) + txt(34, 116, 'D', 13) + txt(13, 46, 'E', 13),
)
// Çokgen olmayan şekiller
const ACIK_SEKIL = svg(120, 120, `<polyline points="22,98 32,28 92,18 102,88 55,104" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`)
const KEMER = svg(120, 120, `<path d="M20,104 L20,58 A40,40 0 0,1 100,58 L100,104 Z" fill="#fde68a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`)

/** Yüzlük kart: ilk n kare boyalı */
const hundred = (n: number): Visual => ({ kind: 'grid', cols: 10, rows: 10, cells: Array.from({ length: n }, (_, i) => `${Math.floor(i / 10)},${i % 10}`), color: '#6366f1' })

const SPOR_GRAFIGI: Visual = {
  kind: 'bars',
  title: '5-B sınıfının en sevdiği spor',
  unit: 'öğrenci',
  data: [
    { label: 'Futbol', value: 9 },
    { label: 'Voleybol', value: 7 },
    { label: 'Basketbol', value: 5 },
    { label: 'Yüzme', value: 3 },
  ],
}

/** 5. SINIF ETKİNLİKLERİ */
export const grade5: Activity[] = [
  // ── Geometrik Şekiller ─────────────────────────────────────────────────
  {
    id: 'g5-temel-geometrik-cizimler',
    outcomes: ['MAT.5.3.1'],
    type: 'match',
    title: 'Temel geometrik çizimler',
    instructions: 'Her çizimi adı ve gösterimiyle eşleştir.',
    level: 1,
    pairs: [
      { left: { visual: NOKTA }, right: 'Nokta: A' },
      { left: { visual: DOGRU }, right: 'Doğru: AB doğrusu (d)' },
      { left: { visual: DOGRU_PARCASI }, right: 'Doğru parçası: [AB]' },
      { left: { visual: ISIN }, right: 'Işın: [AB' },
      { left: { visual: ACI }, right: 'Açı: ABC açısı' },
      { left: { visual: CEMBER }, right: 'Çember: merkezi O, yarıçapı r' },
      { left: { visual: DIKME }, right: 'Dikme: [AH] ⊥ d' },
      { left: { visual: PARALEL }, right: 'Paralel doğrular: d // k' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-cizim-araclari',
    outcomes: ['MAT.5.3.1'],
    type: 'categorize',
    title: 'Hangi araçla çizeriz?',
    instructions: 'Her çizimi ya da ölçümü yapmak için kullanılacak uygun aracın grubuna sürükle.',
    level: 1,
    categories: [
      { id: 'cetvel', label: 'Ölçüsüz cetvel (çizgeç)', color: '#3b82f6' },
      { id: 'pergel', label: 'Pergel', color: '#f97316' },
      { id: 'gonye', label: 'Gönye', color: '#22c55e' },
      { id: 'aciolcer', label: 'Açıölçer', color: '#a855f7' },
    ],
    items: [
      { content: 'İki noktayı birleştiren doğru parçası çizmek', category: 'cetvel' },
      { content: 'Bir ışın çizmek', category: 'cetvel' },
      { content: 'Bir doğru çizmek', category: 'cetvel' },
      { content: 'Merkezi ve yarıçapı verilen çemberi çizmek', category: 'pergel' },
      { content: 'Yarıçapları eşit iki çember çizmek', category: 'pergel' },
      { content: 'Bir doğruya dışındaki noktadan dikme çizmek', category: 'gonye' },
      { content: 'Dik açı oluşturmak', category: 'gonye' },
      { content: 'Bir açının ölçüsünü derece cinsinden bulmak', category: 'aciolcer' },
      { content: '75°’lik bir açı oluşturmak', category: 'aciolcer' },
    ],
  },
  {
    id: 'g5-geometri-kavramlari',
    outcomes: ['MAT.5.3.1', 'MAT.5.3.2'],
    type: 'quiz',
    title: 'Nokta, doğru, ışın ve çember',
    instructions: 'Soruyu oku, doğru cevabı seç.',
    level: 1,
    questions: [
      { prompt: { text: 'Şekildeki geometrik çizim nasıl gösterilir?', visual: ISIN }, choices: ['[AB', '[AB]', 'AB doğrusu', '|AB|'], answer: 0, explain: 'Işının bir başlangıç noktası (A) vardır, B yönünde sınırsız uzar: [AB biçiminde gösterilir.' },
      { prompt: { text: 'Şekildeki çizimin adı nedir?', visual: DOGRU_PARCASI }, choices: ['Doğru', 'Işın', 'Doğru parçası', 'Açı'], answer: 2, explain: 'İki uç noktası olan çizime doğru parçası denir: [AB].' },
      { prompt: 'Bir doğrunun kaç tane uç noktası vardır?', choices: ['Hiç yoktur', '1', '2', '3'], answer: 0, explain: 'Doğru iki yönde de sınırsız uzar; uç noktası yoktur.' },
      { prompt: 'Bir noktaya eşit uzaklıktaki tüm noktaların oluşturduğu şekil hangisidir?', choices: ['Daire', 'Çember', 'Doğru', 'Kare'], answer: 1, explain: 'Çember, merkezine eşit uzaklıktaki noktaların oluşturduğu şekildir. Daire ise çember ile iç bölgesidir.' },
      { prompt: 'Çemberin merkezini çember üzerindeki bir noktaya birleştiren doğru parçasına ne denir?', choices: ['Çap', 'Yarıçap', 'Dikme', 'Işın'], answer: 1 },
      { prompt: 'Yarıçapı 4 cm olan bir çemberin çapı kaç santimetredir?', choices: ['2 cm', '4 cm', '8 cm', '16 cm'], answer: 2, explain: 'Çap, iki yarıçap uzunluğundadır: 4 + 4 = 8 cm.' },
      { prompt: '|AB| = 6 cm gösterimi ne anlama gelir?', choices: ['[AB] doğru parçasının uzunluğu 6 cm’dir.', '[AB ışınının uzunluğu 6 cm’dir.', 'AB doğrusunun uzunluğu 6 cm’dir.', 'A ile B arasında 6 nokta vardır.'], answer: 0, explain: 'Yalnızca doğru parçasının uzunluğu ölçülebilir; doğru ve ışın sınırsızdır.' },
      { prompt: 'Bir doğruya dışındaki bir noktadan çizilebilecek en kısa doğru parçası hangisidir?', choices: ['Yarıçap', 'Işın', 'Dikme', 'Çap'], answer: 2 },
    ],
  },
  {
    id: 'g5-cizim-cikarimlari',
    outcomes: ['MAT.5.3.2'],
    type: 'categorize',
    title: 'Doğru mu, yanlış mı?',
    instructions: 'Temel geometrik çizimlerle ilgili her önermeyi “Doğru” ya da “Yanlış” grubuna sürükle.',
    level: 2,
    categories: [
      { id: 'dogru', label: 'Doğru', color: '#22c55e' },
      { id: 'yanlis', label: 'Yanlış', color: '#ef4444' },
    ],
    items: [
      { content: 'İki noktadan yalnız bir doğru geçer.', category: 'dogru' },
      { content: 'Çemberin merkezinden çember üzerindeki noktalara çizilen doğru parçaları eşit uzunluktadır.', category: 'dogru' },
      { content: 'Pergel açıklığı değiştirilmeden çizilen çemberlerin yarıçapları eşittir.', category: 'dogru' },
      { content: 'Paralel iki doğru arasındaki uzaklık her yerde aynıdır.', category: 'dogru' },
      { content: 'Doğru parçasının uzunluğu cetvelle ölçülebilir.', category: 'dogru' },
      { content: 'Bir noktadan yalnız bir doğru geçer.', category: 'yanlis' },
      { content: 'Bir doğruya dışındaki bir noktadan iki farklı dikme çizilebilir.', category: 'yanlis' },
      { content: 'Işının iki uç noktası vardır.', category: 'yanlis' },
      { content: 'Bir doğrunun uzunluğu cetvelle ölçülebilir.', category: 'yanlis' },
      { content: 'Paralel doğrular bir noktada kesişir.', category: 'yanlis' },
    ],
  },
  {
    id: 'g5-paralel-dik-kesisen',
    outcomes: ['MAT.5.3.2', 'MAT.5.3.4'],
    type: 'quiz',
    title: 'Paralel mi, dik mi?',
    instructions: 'Doğruların birbirine göre durumunu belirle.',
    level: 1,
    questions: [
      { prompt: { text: 'd ve k doğruları birbirine göre nasıldır?', visual: PARALEL }, choices: ['Paralel doğrular', 'Dik kesişen doğrular', 'Kesişen (dik olmayan) doğrular', 'Çakışık doğrular'], answer: 0, explain: 'Ortak noktaları yoktur, aralarındaki uzaklık her yerde aynıdır: d // k.' },
      { prompt: { text: 'd ve k doğruları birbirine göre nasıldır?', visual: DIK_KESISEN }, choices: ['Paralel doğrular', 'Dik kesişen doğrular', 'Kesişen (dik olmayan) doğrular', 'Çakışık doğrular'], answer: 1, explain: 'Kesiştikleri noktada dik açı oluşur: d ⊥ k.' },
      { prompt: { text: 'd ve k doğruları birbirine göre nasıldır?', visual: KESISEN }, choices: ['Paralel doğrular', 'Dik kesişen doğrular', 'Kesişen (dik olmayan) doğrular', 'Çakışık doğrular'], answer: 2 },
      { prompt: 'Tren rayları hangi doğrulara örnektir?', choices: ['Kesişen doğrular', 'Paralel doğrular', 'Dik doğrular', 'Çakışık doğrular'], answer: 1 },
      { prompt: 'Satranç tahtasındaki yatay ve dikey çizgiler birbirine göre nasıldır?', choices: ['Paralel', 'Çakışık', 'Dik', 'Hiç kesişmez'], answer: 2 },
      { prompt: 'Tüm noktaları ortak olan iki doğruya ne denir?', choices: ['Paralel doğrular', 'Kesişen doğrular', 'Dik doğrular', 'Çakışık doğrular'], answer: 3 },
      { prompt: '“d ⊥ k” gösterimi ne anlama gelir?', choices: ['d ile k birbirine diktir.', 'd ile k birbirine paraleldir.', 'd ile k çakışıktır.', 'd, k’den uzundur.'], answer: 0 },
    ],
  },
  {
    id: 'g5-aci-olustur',
    outcomes: ['MAT.5.3.3'],
    type: 'manipulative',
    title: 'Açıölçerle açı oluştur',
    instructions: 'Işını sürükleyerek istenen ölçüde açı oluştur. Açıölçerin derece çizgilerini kullan.',
    level: 2,
    tool: 'angle',
    tasks: [
      { prompt: 'Ölçüsü 35° olan bir açı oluştur.', target: { degrees: 35 } },
      { prompt: 'Bir dik açı oluştur.', target: { degrees: 90 } },
      { prompt: 'Ölçüsü 145° olan bir geniş açı oluştur.', target: { degrees: 145 } },
      { prompt: 'Bir doğru açı oluştur.', target: { degrees: 180 } },
    ],
  },
  {
    id: 'g5-aci-olcme',
    outcomes: ['MAT.5.3.3'],
    type: 'quiz',
    title: 'Açıları ölçelim',
    instructions: 'Açı ölçme birimlerini düşün ve doğru cevabı seç.',
    level: 1,
    questions: [
      { prompt: 'Tam açının ölçüsü kaç derecedir?', choices: ['90°', '180°', '270°', '360°'], answer: 3, explain: 'Bir ışının tam bir dönüşüyle tam açı oluşur: 360°.' },
      { prompt: '1 derece (1°) neyi ifade eder?', choices: ['Tam açının 360 eş parçasından birini', 'Dik açının 10 eş parçasından birini', 'Doğru açının 100 eş parçasından birini', 'Bir ışının uzunluğunu'], answer: 0 },
      { prompt: 'Bir açının ölçüsünü derece cinsinden bulmak için hangi araç kullanılır?', choices: ['Pergel', 'Açıölçer', 'Ölçüsüz cetvel', 'Gönye'], answer: 1 },
      { prompt: { text: 'Şekildeki açının ölçüsü yaklaşık kaç derecedir?', visual: { kind: 'angle', degrees: 30 } }, choices: ['30°', '90°', '120°', '170°'], answer: 0 },
      { prompt: { text: 'Şekildeki açının ölçüsü yaklaşık kaç derecedir?', visual: { kind: 'angle', degrees: 135 } }, choices: ['45°', '90°', '135°', '180°'], answer: 2 },
      { prompt: 'Ölçüleri eşit olan açılara ne denir?', choices: ['Komşu açılar', 'Tümler açılar', 'Doğru açılar', 'Eş açılar'], answer: 3 },
      { prompt: { text: 'Saat 3.00’te akrep ile yelkovan arasındaki küçük açı kaç derecedir?', visual: { kind: 'clock', h: 3, m: 0 } }, choices: ['30°', '60°', '90°', '180°'], answer: 2 },
      { prompt: 'Doğru açı, tam açının kaçta kaçıdır?', choices: ['[[1/4]]', '[[1/2]]', '[[3/4]]', '[[1/3]]'], answer: 1, explain: 'Doğru açı 180°, tam açı 360°’dir. 180, 360’ın yarısıdır.' },
    ],
  },
  {
    id: 'g5-aci-turleri',
    outcomes: ['MAT.5.3.3'],
    type: 'quiz',
    title: 'Açı türleri',
    instructions: 'Açının dar, dik, geniş ya da doğru açı olduğunu belirle.',
    level: 1,
    generator: { id: 'angleType', params: { straight: true }, count: 8 },
  },
  {
    id: 'g5-acilari-sirala',
    outcomes: ['MAT.5.3.3'],
    type: 'sort',
    title: 'Açıları sırala',
    instructions: 'Açıları ölçülerine göre küçükten büyüğe sırala.',
    level: 2,
    rounds: [
      {
        prompt: 'Açıları ölçülerine göre küçükten büyüğe sırala.',
        items: [{ visual: { kind: 'angle', degrees: 25 } }, { visual: { kind: 'angle', degrees: 70 } }, { visual: { kind: 'angle', degrees: 110 } }, { visual: { kind: 'angle', degrees: 160 } }],
        ends: ['En küçük', 'En büyük'],
      },
      { prompt: 'Açı türlerini ölçülerine göre küçükten büyüğe sırala.', items: ['Dar açı', 'Dik açı', 'Geniş açı', 'Doğru açı', 'Tam açı'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Açı ölçülerini küçükten büyüğe sırala.', items: ['15°', '89°', '90°', '91°', '179°', '360°'], ends: ['En küçük', 'En büyük'] },
    ],
  },
  {
    id: 'g5-aci-ciftleri',
    outcomes: ['MAT.5.3.4'],
    type: 'match',
    title: 'Doğrular ve açılar',
    instructions: 'Her kavramı doğru açıklamasıyla eşleştir.',
    level: 2,
    pairs: [
      { left: 'Ters açılar', right: 'Kesişen iki doğrunun karşılıklı oluşturduğu, ölçüleri eşit açılar' },
      { left: 'Komşu açılar', right: 'Köşeleri ve birer kenarları ortak, iç bölgeleri ayrık açılar' },
      { left: 'Tümler açılar', right: 'Ölçüleri toplamı 90° olan açılar' },
      { left: 'Bütünler açılar', right: 'Ölçüleri toplamı 180° olan açılar' },
      { left: 'Kesişen doğrular', right: 'Yalnız bir ortak noktası olan doğrular' },
      { left: 'Paralel doğrular', right: 'Ortak noktası olmayan, açı oluşturmayan doğrular' },
      { left: 'Çakışık doğrular', right: 'Tüm noktaları ortak olan doğrular' },
      { left: 'Dik doğrular', right: 'Kesiştiklerinde dört dik açı oluşturan doğrular' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-tumler-butunler-hesapla',
    outcomes: ['MAT.5.3.4'],
    type: 'fill',
    title: 'Tümler, bütünler ve ters açılar',
    instructions: 'Açı ölçülerini hesapla ve boşluklara yaz.',
    level: 2,
    items: [
      { text: 'Ölçüsü 35° olan açının tümleri __° dir.', answers: ['55'], hint: 'Tümler açıların toplamı 90°’dir.' },
      { text: 'Ölçüsü 72° olan açının tümleri __° dir.', answers: ['18'] },
      { text: 'Ölçüsü 120° olan açının bütünleri __° dir.', answers: ['60'], hint: 'Bütünler açıların toplamı 180°’dir.' },
      { text: 'Ölçüsü 45° olan açının bütünleri __° dir.', answers: ['135'] },
      { text: 'Şekilde a = 50° ise c = __° ve b = __° olur.', answers: ['50', '130'], visual: KESISEN_ABCD, hint: 'a ile c ters açılardır; a ile b komşu bütünlerdir.' },
      { text: 'Şekilde d = 130° ise b = __° ve c = __° olur.', answers: ['130', '50'], visual: KESISEN_ABCD },
      { text: 'Kesişen iki doğrunun oluşturduğu açılardan biri 65° ise ters açısı __°, komşu bütünleri __° olur.', answers: ['65', '115'] },
      { text: 'Ölçüleri eşit olan komşu bütünler iki açının her biri __° dir.', answers: ['90'] },
    ],
  },
  {
    id: 'g5-dogrularin-olusturdugu-acilar',
    outcomes: ['MAT.5.3.4'],
    type: 'quiz',
    title: 'Kesişen doğrular ve açılar',
    instructions: 'İki ya da üç doğrunun oluşturduğu açıları incele.',
    level: 2,
    questions: [
      { prompt: { text: 'Şekildeki açılardan hangileri ters açılardır?', visual: KESISEN_ABCD }, choices: ['a ve c', 'a ve b', 'b ve c', 'c ve d'], answer: 0, explain: 'Ters açılar kesişim noktasının karşılıklı iki yanındadır ve ölçüleri eşittir.' },
      { prompt: { text: 'a ile b açıları nasıl açılardır?', visual: KESISEN_ABCD }, choices: ['Ters açılar', 'Komşu bütünler açılar', 'Tümler açılar', 'Eş açılar'], answer: 1, explain: 'Ortak bir kenarları vardır ve birlikte doğru açı (180°) oluştururlar.' },
      { prompt: 'İki doğru kesiştiğinde kaç açı oluşur?', choices: ['2', '3', '4', '6'], answer: 2 },
      { prompt: 'Üç doğru aynı noktada kesiştiğinde kaç açı oluşur?', choices: ['6', '3', '9', '4'], answer: 0 },
      { prompt: 'Paralel iki doğru kaç açı oluşturur?', choices: ['2 açı', 'Hiç açı oluşturmaz', '4 açı', '4 dik açı'], answer: 1 },
      { prompt: 'Kesişen iki doğrunun oluşturduğu açılardan biri dik açı ise diğer açılar için ne söylenebilir?', choices: ['İkisi dar, biri geniş açıdır.', 'Hepsi dar açıdır.', 'İkisi geniş açıdır.', 'Hepsi dik açıdır.'], answer: 3 },
      { prompt: 'Dik olmayan iki doğru kesiştiğinde hangi açılar oluşur?', choices: ['4 dar açı', '2 dar ve 2 geniş açı', '1 dar ve 3 geniş açı', '4 geniş açı'], answer: 1 },
      { prompt: 'Ölçüsü 40° olan bir açının bütünleri ile tümleri arasındaki fark kaç derecedir?', choices: ['40°', '50°', '90°', '140°'], answer: 2, explain: 'Bütünleri 140°, tümleri 50°’dir. 140 − 50 = 90.' },
    ],
  },
  {
    id: 'g5-tumler-mi-butunler-mi',
    outcomes: ['MAT.5.3.4'],
    type: 'categorize',
    title: 'Tümler mi, bütünler mi?',
    instructions: 'Her açı çiftini toplamına göre doğru gruba sürükle.',
    level: 1,
    categories: [
      { id: 'tumler', label: 'Tümler (90°)', color: '#3b82f6' },
      { id: 'butunler', label: 'Bütünler (180°)', color: '#f97316' },
      { id: 'hicbiri', label: 'Hiçbiri', color: '#64748b' },
    ],
    items: [
      { content: '30° ve 60°', category: 'tumler' },
      { content: '45° ve 45°', category: 'tumler' },
      { content: '25° ve 65°', category: 'tumler' },
      { content: '12° ve 78°', category: 'tumler' },
      { content: '110° ve 70°', category: 'butunler' },
      { content: '90° ve 90°', category: 'butunler' },
      { content: '135° ve 45°', category: 'butunler' },
      { content: '155° ve 25°', category: 'butunler' },
      { content: '100° ve 100°', category: 'hicbiri' },
      { content: '50° ve 50°', category: 'hicbiri' },
    ],
  },
  {
    id: 'g5-cokgen-mi',
    outcomes: ['MAT.5.3.5'],
    type: 'categorize',
    title: 'Çokgen mi, değil mi?',
    instructions: 'Doğru parçalarıyla çevrili kapalı şekiller çokgendir. Şekilleri doğru gruba sürükle.',
    level: 1,
    categories: [
      { id: 'cokgen', label: 'Çokgen', color: '#22c55e' },
      { id: 'degil', label: 'Çokgen değil', color: '#ef4444' },
    ],
    items: [
      { content: { visual: { kind: 'shape', shape: 'triangle', color: '#f97316' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'pentagon', color: '#3b82f6' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'hexagon', color: '#a855f7' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'trapezoid', color: '#22c55e' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'parallelogram', color: '#eab308' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'octagon', color: '#ec4899' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'circle', color: '#06b6d4' } }, category: 'degil' },
      { content: { visual: { kind: 'shape', shape: 'semicircle', color: '#f97316' } }, category: 'degil' },
      { content: { visual: ACIK_SEKIL }, category: 'degil' },
      { content: { visual: KEMER }, category: 'degil' },
    ],
  },
  {
    id: 'g5-dogrularla-cokgen',
    outcomes: ['MAT.5.3.5'],
    type: 'fill',
    title: 'Doğrulardan çokgenlere',
    instructions: 'Ardışık olarak kesişen doğruları düşünerek boşlukları doldur.',
    level: 2,
    items: [
      { text: 'Şekilde d, e ve f doğruları ardışık olarak kesişerek __ kenarlı bir çokgen oluşturmuştur.', answers: ['3'], visual: UC_DOGRU },
      { text: 'Bir çokgen oluşturmak için en az __ doğrunun ardışık olarak kesişmesi gerekir.', answers: ['3'] },
      { text: 'Ardışık kesişen 5 doğrunun oluşturduğu çokgenin __ kenarı ve __ köşesi vardır.', answers: ['5', '5'] },
      { text: 'Altıgen, __ doğrunun ardışık kesişmesiyle oluşur.', answers: ['6'] },
      { text: '8 doğrunun ardışık kesişmesiyle oluşan çokgene __ denir.', answers: ['sekizgen'], choices: ['altıgen', 'yedigen', 'sekizgen', 'dokuzgen'] },
      { text: 'Bir dörtgenin __ kenarı, __ köşesi ve __ iç açısı vardır.', answers: ['4', '4', '4'] },
      { text: 'Yedigen, __ doğrunun ardışık kesişmesiyle oluşur.', answers: ['7'] },
    ],
  },
  {
    id: 'g5-geometri-tahtasinda-cokgen',
    outcomes: ['MAT.5.3.5'],
    type: 'manipulative',
    title: 'Geometri tahtasında çokgenler',
    instructions: 'Çivilere dokunarak köşeleri seç, ilk köşeye dönerek şekli kapat.',
    level: 1,
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: '3 kenarlı bir çokgen (üçgen) oluştur.', target: { sides: 3 } },
      { prompt: '4 kenarlı bir çokgen (dörtgen) oluştur.', target: { sides: 4 } },
      { prompt: '5 kenarlı bir çokgen (beşgen) oluştur.', target: { sides: 5 } },
      { prompt: '6 kenarlı bir çokgen (altıgen) oluştur.', target: { sides: 6 } },
    ],
  },
  {
    id: 'g5-cokgenleri-sirala',
    outcomes: ['MAT.5.3.5', 'MAT.5.3.6'],
    type: 'sort',
    title: 'Kenar sayısına göre sırala',
    instructions: 'Çokgenleri kenar sayılarına göre azdan çoğa sırala.',
    level: 1,
    rounds: [
      {
        prompt: 'Çokgenleri kenar sayısına göre azdan çoğa sırala.',
        items: [
          { visual: { kind: 'shape', shape: 'triangle', color: '#f97316' } },
          { visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } },
          { visual: { kind: 'shape', shape: 'pentagon', color: '#22c55e' } },
          { visual: { kind: 'shape', shape: 'hexagon', color: '#a855f7' } },
          { visual: { kind: 'shape', shape: 'octagon', color: '#ec4899' } },
        ],
        ends: ['En az kenar', 'En çok kenar'],
      },
      { prompt: 'Çokgen adlarını kenar sayısına göre azdan çoğa sırala.', items: ['Üçgen', 'Dörtgen', 'Beşgen', 'Altıgen', 'Yedigen', 'Sekizgen'], ends: ['En az kenar', 'En çok kenar'] },
    ],
  },
  {
    id: 'g5-ucgenin-ic-acilari',
    outcomes: ['MAT.5.3.6'],
    type: 'fill',
    title: 'Üçgenin iç açıları',
    instructions: 'Üçgenin iç açılarının ölçüleri toplamının 180° olduğunu kullanarak boşlukları doldur.',
    level: 2,
    items: [
      { text: 'Bir üçgenin iç açılarının ölçüleri toplamı __° dir.', answers: ['180'] },
      { text: 'Şekildeki üçgende C açısının ölçüsü __° dir.', answers: ['70'], visual: tri('50°', '60°', '?', 'acute') },
      { text: 'Şekildeki dik üçgende C açısının ölçüsü __° dir.', answers: ['55'], visual: tri('90°', '35°', '?', 'right'), hint: '180 − 90 − 35 = ?' },
      { text: 'Şekildeki geniş açılı üçgende B açısının ölçüsü __° dir.', answers: ['30'], visual: tri('40°', '?', '110°', 'obtuse') },
      { text: 'Eşkenar üçgenin her bir iç açısı __° dir.', answers: ['60'] },
      { text: 'Tepe açısı 40° olan ikizkenar üçgenin taban açılarının her biri __° dir.', answers: ['70'], hint: 'Taban açıları eşittir: (180 − 40) ÷ 2' },
      { text: 'Taban açılarından biri 65° olan ikizkenar üçgenin tepe açısı __° dir.', answers: ['50'] },
      { text: 'İkizkenar dik üçgenin dar açılarının her biri __° dir.', answers: ['45'] },
    ],
  },
  {
    id: 'g5-ucgenleri-acilarina-gore-sinifla',
    outcomes: ['MAT.5.3.6'],
    type: 'categorize',
    title: 'Üçgenleri açılarına göre sınıflandır',
    instructions: 'İç açı ölçüleri verilen üçgenleri doğru gruba sürükle.',
    level: 2,
    categories: [
      { id: 'dar', label: 'Dar açılı üçgen', color: '#22c55e' },
      { id: 'dik', label: 'Dik üçgen', color: '#3b82f6' },
      { id: 'genis', label: 'Geniş açılı üçgen', color: '#f97316' },
    ],
    items: [
      { content: '50°, 60°, 70°', category: 'dar' },
      { content: '80°, 55°, 45°', category: 'dar' },
      { content: '60°, 60°, 60°', category: 'dar' },
      { content: '90°, 30°, 60°', category: 'dik' },
      { content: '45°, 90°, 45°', category: 'dik' },
      { content: '18°, 72°, 90°', category: 'dik' },
      { content: '120°, 30°, 30°', category: 'genis' },
      { content: '100°, 45°, 35°', category: 'genis' },
      { content: '25°, 130°, 25°', category: 'genis' },
    ],
  },
  {
    id: 'g5-cokgenlerin-ozellikleri',
    outcomes: ['MAT.5.3.6'],
    type: 'quiz',
    title: 'Çokgenlerin özellikleri',
    instructions: 'Çokgenlerin kenar ve açı özelliklerini düşünerek doğru cevabı seç.',
    level: 2,
    questions: [
      { prompt: 'Aşağıdakilerden hangisi düzgün çokgendir?', choices: ['Dikdörtgen', 'Kare', 'Eşkenar dörtgen', 'Paralelkenar'], answer: 1, explain: 'Düzgün çokgenin tüm kenar uzunlukları ve tüm iç açılarının ölçüleri eşittir.' },
      { prompt: 'Dikdörtgen neden düzgün çokgen değildir?', choices: ['Açıları eşit değildir.', 'Köşegeni yoktur.', 'Tüm kenar uzunlukları eşit değildir.', 'Dört kenarı vardır.'], answer: 2 },
      { prompt: 'Bir üçgende iki geniş açı olabilir mi?', choices: ['Hayır, çünkü iç açıların toplamı 180°’yi geçer.', 'Evet, her üçgende olur.', 'Evet, ikizkenar üçgenlerde olur.', 'Yalnızca eşkenar üçgende olur.'], answer: 0 },
      { prompt: { text: 'Şekildeki kesikli [AC] doğru parçasına ne denir?', visual: BESGEN_KOSEGEN }, choices: ['Kenar', 'Yarıçap', 'Köşegen', 'Dikme'], answer: 2, explain: 'Ardışık olmayan iki köşeyi birleştiren doğru parçası köşegendir.' },
      { prompt: 'Bir kenarı 5 cm olan düzgün altıgenin çevre uzunluğu kaç santimetredir?', choices: ['25 cm', '30 cm', '35 cm', '36 cm'], answer: 1 },
      { prompt: 'Eşkenar üçgen için hangisi doğrudur?', choices: ['Bir dik açısı olabilir.', 'Bir açısı geniş olabilir.', 'Kenarları farklı uzunluktadır.', 'Tüm iç açıları 60°’dir.'], answer: 3 },
      { prompt: 'Bir çokgenin bir köşesindeki iç açı ile dış açının ölçüleri toplamı kaç derecedir?', choices: ['90°', '180°', '270°', '360°'], answer: 1, explain: 'İç açı ile dış açı komşu bütünler açılardır.' },
      { prompt: 'İkizkenar üçgende eşit uzunluktaki kenarları gören açılar için ne söylenebilir?', choices: ['Ölçüleri eşittir.', 'Toplamları 90°’dir.', 'Biri diğerinin iki katıdır.', 'İkisi de dik açıdır.'], answer: 0 },
    ],
  },
  {
    id: 'g5-kesisen-cemberler',
    outcomes: ['MAT.5.3.7'],
    type: 'quiz',
    title: 'Kesişen çemberlerle üçgen',
    instructions: 'A ve B çemberlerin merkezleri, C ise kesişim noktalarından biridir. ABC üçgenini incele.',
    level: 2,
    questions: [
      { prompt: { text: 'Çemberlerin yarıçapları 5 cm ve |AB| = 5 cm’dir. ABC üçgeni hangi üçgendir?', visual: cemberUcgen(5, 5, 5) }, choices: ['Eşkenar üçgen', 'İkizkenar (eşkenar olmayan) üçgen', 'Çeşitkenar üçgen'], answer: 0, explain: '|AC| ve |BC| yarıçaplara eşittir: 5 cm. Üç kenar da 5 cm olur.' },
      { prompt: { text: 'Çemberlerin yarıçapları 5 cm ve |AB| = 6 cm’dir. ABC üçgeni hangi üçgendir?', visual: cemberUcgen(5, 5, 6) }, choices: ['Eşkenar üçgen', 'İkizkenar (eşkenar olmayan) üçgen', 'Çeşitkenar üçgen'], answer: 1, explain: '|AC| = |BC| = 5 cm, |AB| = 6 cm. Yalnızca iki kenar eşittir.' },
      { prompt: { text: 'A merkezli çemberin yarıçapı 4 cm, B merkezli çemberin yarıçapı 5,5 cm ve |AB| = 6 cm’dir. ABC üçgeni hangi üçgendir?', visual: cemberUcgen(4, 5.5, 6) }, choices: ['Eşkenar üçgen', 'İkizkenar (eşkenar olmayan) üçgen', 'Çeşitkenar üçgen'], answer: 2 },
      { prompt: 'Bu inşada |AC| uzunluğu neden A merkezli çemberin yarıçapına eşittir?', choices: ['C noktası B’ye yakın olduğu için', 'C noktası A merkezli çemberin üzerinde olduğu için', '[AC] bir çap olduğu için', 'Her üçgen eşkenar olduğu için'], answer: 1 },
      { prompt: 'Eşkenar üçgen inşa etmek için çemberlerin yarıçapları ve merkezleri arasındaki uzaklık nasıl olmalıdır?', choices: ['Yarıçaplar farklı olmalıdır.', 'Yarıçaplar eşit, merkezler arası uzaklık farklı olmalıdır.', 'Merkezler arası uzaklık yarıçapların toplamı olmalıdır.', 'İki yarıçap ve merkezler arası uzaklık birbirine eşit olmalıdır.'], answer: 3 },
      { prompt: 'Yarıçapları 6 cm olan iki çemberin merkezleri arası 6 cm’dir. Bu çemberlerle inşa edilen ABC üçgeninin çevre uzunluğu kaç santimetredir?', choices: ['12 cm', '18 cm', '24 cm', '36 cm'], answer: 1 },
      { prompt: 'Cetvelle uzunluk ölçmeden eşkenar üçgen çizmek için hangi araçlar yeterlidir?', choices: ['Pergel ve ölçüsüz cetvel', 'Yalnızca açıölçer', 'Gönye ve açıölçer', 'Yalnızca gönye'], answer: 0 },
    ],
  },
  {
    id: 'g5-cember-kosullari',
    outcomes: ['MAT.5.3.7'],
    type: 'categorize',
    title: 'Hangi üçgen oluşur?',
    instructions: 'A ve B merkezli iki çemberin yarıçapları ile |AB| verildi. C kesişim noktası olmak üzere ABC üçgeninin türüne göre grupla.',
    level: 3,
    categories: [
      { id: 'eskenar', label: 'Eşkenar', color: '#22c55e' },
      { id: 'ikizkenar', label: 'İkizkenar', color: '#3b82f6' },
      { id: 'cesitkenar', label: 'Çeşitkenar', color: '#f97316' },
    ],
    items: [
      { content: 'Yarıçaplar 4 cm ve 4 cm, |AB| = 4 cm', category: 'eskenar' },
      { content: 'Yarıçaplar 6 cm ve 6 cm, |AB| = 6 cm', category: 'eskenar' },
      { content: 'Yarıçaplar 5 cm ve 5 cm, |AB| = 3 cm', category: 'ikizkenar' },
      { content: 'Yarıçaplar 4 cm ve 6 cm, |AB| = 4 cm', category: 'ikizkenar' },
      { content: 'Yarıçaplar 3 cm ve 3 cm, |AB| = 5 cm', category: 'ikizkenar' },
      { content: 'Yarıçaplar 7 cm ve 5 cm, |AB| = 5 cm', category: 'ikizkenar' },
      { content: 'Yarıçaplar 3 cm ve 4 cm, |AB| = 5 cm', category: 'cesitkenar' },
      { content: 'Yarıçaplar 5 cm ve 6 cm, |AB| = 7 cm', category: 'cesitkenar' },
      { content: 'Yarıçaplar 4 cm ve 7 cm, |AB| = 6 cm', category: 'cesitkenar' },
    ],
  },
  {
    id: 'g5-cemberle-ucgen-kenarlari',
    outcomes: ['MAT.5.3.7'],
    type: 'fill',
    title: 'Çemberlerden kenar uzunluklarına',
    instructions: 'Çemberin yarıçapını kullanarak üçgenin kenar uzunluklarını bul.',
    level: 2,
    items: [
      { text: 'A merkezli çemberin yarıçapı 5 cm’dir. C noktası bu çemberin üzerindeyse |AC| = __ cm olur.', answers: ['5'] },
      { text: 'Şekilde çemberlerin yarıçapları 4 cm ve |AB| = 4 cm ise |BC| = __ cm olur.', answers: ['4'], visual: cemberUcgen(4, 4, 4) },
      { text: 'Yarıçapları 3 cm ve 4 cm olan iki çemberin merkezleri arası 5 cm’dir. ABC üçgeninin çevre uzunluğu __ cm olur.', answers: ['12'] },
      { text: '|AB| = 7 cm alınarak pergelle eşkenar ABC üçgeni inşa edilecek. Pergel açıklığı __ cm olmalıdır.', answers: ['7'] },
      { text: 'Yarıçapları 6 cm olan çemberlerle inşa edilen ikizkenar ABC üçgeninin çevre uzunluğu 20 cm ise |AB| = __ cm olur.', answers: ['8'], hint: '|AC| = |BC| = 6 cm' },
      { text: 'Yarıçapları 5 cm olan iki çemberin merkezleri arası 5 cm ise ABC üçgeninin her bir iç açısı __° olur.', answers: ['60'], hint: 'Bu üçgen eşkenardır.' },
    ],
  },

  // ── Sayılar ve Nicelikler (1) ──────────────────────────────────────────
  {
    id: 'g5-buyuk-sayilarin-okunusu',
    outcomes: ['MAT.5.1.1'],
    type: 'match',
    title: 'Milyonlar ve milyarlar',
    instructions: 'Her sayıyı okunuşuyla eşleştir. Sıfır olan bölüklere dikkat et!',
    level: 2,
    pairs: [
      { left: '3.000.000', right: 'üç milyon' },
      { left: '3.241.123', right: 'üç milyon iki yüz kırk bir bin yüz yirmi üç' },
      { left: '3.000.085', right: 'üç milyon seksen beş' },
      { left: '30.085.000', right: 'otuz milyon seksen beş bin' },
      { left: '300.000.850', right: 'üç yüz milyon sekiz yüz elli' },
      { left: '3.085.000.000', right: 'üç milyar seksen beş milyon' },
      { left: '85.003.000', right: 'seksen beş milyon üç bin' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-okunustan-yazilisa',
    outcomes: ['MAT.5.1.1'],
    type: 'fill',
    title: 'Okunuştan yazılışa',
    instructions: 'Sayıları rakamlarla yaz ya da bölükleri belirle.',
    level: 2,
    items: [
      { text: 'İki milyon üç yüz bin kırk beş: __', answers: ['2300045'] },
      { text: 'Kırk yedi milyon altı bin iki yüz: __', answers: ['47006200'] },
      { text: 'On iki milyar beş yüz milyon: __', answers: ['12500000000'] },
      { text: '4.508.120.300 sayısının milyarlar bölüğündeki sayı __, milyonlar bölüğündeki sayı __ dir.', answers: ['4', '508'] },
      { text: 'Dünya’nın Güneş’e uzaklığı yaklaşık 149.600.000 km’dir. Bu sayıda 6 rakamının basamak değeri __ dir.', answers: ['600000'] },
      { text: '7 basamaklı en küçük doğal sayı __ dir.', answers: ['1000000'] },
      { text: '9 basamaklı en büyük doğal sayı __ dir.', answers: ['999999999'] },
      { text: '25.000.000 + 400.000 + 3.000 + 7 = __', answers: ['25403007'] },
    ],
  },
  {
    id: 'g5-basamak-degeri',
    outcomes: ['MAT.5.1.1'],
    type: 'fill',
    title: 'Basamak değeri',
    instructions: 'Dokuz basamaklı sayılarda basamak adını ve basamak değerini bul.',
    level: 2,
    generator: { id: 'placeValue', params: { digits: 9 }, count: 8 },
  },
  {
    id: 'g5-buyuk-sayilari-sirala',
    outcomes: ['MAT.5.1.1'],
    type: 'sort',
    title: 'Büyük sayıları sırala',
    instructions: 'Sayıları basamak sayılarına ve bölüklerine bakarak sırala.',
    level: 2,
    rounds: [
      { prompt: 'Gezegenlerin Güneş’e ortalama uzaklıklarını (km) küçükten büyüğe sırala.', items: ['Merkür: 57.900.000', 'Venüs: 108.200.000', 'Dünya: 149.600.000', 'Mars: 227.900.000', 'Jüpiter: 778.500.000'], ends: ['En yakın', 'En uzak'] },
      { prompt: 'Sayıları küçükten büyüğe sırala.', items: ['4.099.999', '4.909.099', '4.990.000', '40.009.000', '40.090.000'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Sayıları büyükten küçüğe sırala.', items: ['1.000.000.000', '999.999.999', '99.999.999', '10.000.000', '9.999.999'], ends: ['En büyük', 'En küçük'] },
      { prompt: 'İllerin yaklaşık nüfuslarını büyükten küçüğe sırala.', items: ['İstanbul: 15.650.000', 'Ankara: 5.800.000', 'İzmir: 4.480.000', 'Bursa: 3.210.000', 'Antalya: 2.700.000'], ends: ['En kalabalık', 'En az nüfuslu'] },
    ],
  },
  {
    id: 'g5-dogal-sayi-problemleri',
    outcomes: ['MAT.5.1.2'],
    type: 'fill',
    title: 'Gerçek yaşam problemleri',
    instructions: 'Problemi oku, verilenleri ve isteneni belirle, işlemi yap.',
    level: 2,
    items: [
      { text: 'Bir kitap kampanyasında 1. hafta 12.475, 2. hafta 9.638 kitap toplandı. Toplam __ kitap toplandı.', answers: ['22113'] },
      { text: 'Kutuplarda son 10 yılda yaklaşık 45.485, sadece bu yıl 51.373 futbol sahası büyüklüğünde buzul eridi. Bu yıl eriyen buzul __ futbol sahası kadar daha fazladır.', answers: ['5888'] },
      { text: 'Ağaç dikme kampanyasında 24 sınıfın her biri 135 fidan dikti. Toplam __ fidan dikildi.', answers: ['3240'] },
      { text: 'Kütüphaneye bağışlanan 2.856 kitap, her rafa 34 kitap gelecek şekilde dizilecek. __ raf dolar.', answers: ['84'] },
      { text: 'Elif’in kumbarasında 3.450 TL var. Her ay 275 TL daha biriktirirse 6 ay sonra __ TL’si olur.', answers: ['5100'] },
      { text: 'Bir film 19.45’te başlayıp 22.10’da bitiyor. Film __ dakika sürer.', answers: ['145'], hint: '19.45’ten 22.10’a kadar kaç saat kaç dakika geçer?' },
      { text: '250 öğrenci 45 kişilik otobüslerle geziye gidecek. En az __ otobüs gerekir.', answers: ['6'], hint: 'Kalan öğrenciler için de bir otobüs gerekir.' },
      { text: 'Bir fabrika günde 245 koli üretiyor; her kolide 120 şişe var. Fabrika bir günde __ şişe üretir.', answers: ['29400'] },
    ],
  },
  {
    id: 'g5-problem-stratejileri',
    outcomes: ['MAT.5.1.2'],
    type: 'quiz',
    title: 'Hangi işlem, hangi strateji?',
    instructions: 'Problemleri çözmek için uygun işlemi, tahmini ve stratejiyi seç.',
    level: 2,
    questions: [
      { prompt: 'Bir okulda 1.250 öğrenci var; bunların 486’sı kız. Erkek öğrenci sayısını bulmak için hangi işlem yapılır?', choices: ['1.250 + 486', '1.250 − 486', '1.250 × 486', '1.250 ÷ 486'], answer: 1 },
      { prompt: '4.987 + 3.012 işleminin sonucu için en iyi tahmin hangisidir?', choices: ['7.000', '9.000', '8.000', '80.000'], answer: 2, explain: '4.987 yaklaşık 5.000, 3.012 yaklaşık 3.000’dir. 5.000 + 3.000 = 8.000.' },
      { prompt: '100 yumurta 6’lık kolilere konuyor. Kaç koli tamamen dolar?', choices: ['16', '17', '15', '4'], answer: 0, explain: '100 ÷ 6 = 16, kalan 4. Kalan 4 yumurta bir koliyi doldurmaz.' },
      { prompt: 'A marketinde 2 kg pirinç 130 TL, B marketinde 5 kg pirinç 300 TL. Hangisi daha ekonomiktir?', choices: ['A marketi', 'B marketi', 'İkisi de aynı'], answer: 1, explain: 'A’da 1 kg 130 ÷ 2 = 65 TL, B’de 1 kg 300 ÷ 5 = 60 TL’dir.' },
      { prompt: '245 dakika kaç saat kaç dakikadır?', choices: ['2 saat 45 dakika', '4 saat 45 dakika', '3 saat 65 dakika', '4 saat 5 dakika'], answer: 3, explain: '245 ÷ 60 = 4, kalan 5.' },
      { prompt: 'Bir bölme işleminde bölen 24, bölüm 15, kalan 7 ise bölünen kaçtır?', choices: ['360', '367', '353', '46'], answer: 1, explain: 'Bölünen = bölen × bölüm + kalan = 24 × 15 + 7 = 367.' },
      { prompt: 'Zeynep 36 × 25 işlemini kısa yoldan yapmak istiyor. Hangisi doğru bir stratejidir?', choices: ['36 × 100 ÷ 4', '36 × 20 + 5', '36 + 25 × 4', '30 × 25 + 6'], answer: 0, explain: '25, 100’ün dörtte biridir: 36 × 100 = 3.600, 3.600 ÷ 4 = 900.' },
      { prompt: 'Bir çiftçi 1.248 kg domatesi 24 kasaya eşit olarak paylaştırıyor. Her kasada kaç kg domates olur?', choices: ['48', '62', '52', '502'], answer: 2 },
    ],
  },
  {
    id: 'g5-problem-cozme-adimlari',
    outcomes: ['MAT.5.1.2'],
    type: 'sort',
    title: 'Problem çözme adımları',
    instructions: 'Çözüm adımlarını doğru sıraya koy.',
    level: 1,
    rounds: [
      { prompt: 'Problem çözme adımlarını sırala.', items: ['Verilenleri ve isteneni belirle', 'Şekil, tablo ya da diyagram çiz', 'Sonucu tahmin et ve strateji seç', 'İşlemleri uygula', 'Çözümü kontrol et'] },
      { prompt: 'Can’ın her birinde 24 kalem olan 3 kutusu var. 18 kalemi arkadaşlarına verdi. Kaç kalemi kaldı?', items: ['Toplam kalem: 3 × 24 = 72', 'Verdiklerini çıkar: 72 − 18 = 54', 'Kontrol: 54 + 18 = 72'] },
      { prompt: 'Tren 08.40’ta kalktı, 3 saat 35 dakika sonra vardı. Tren saat kaçta vardı?', items: ['08.40 + 3 saat = 11.40', '11.40 + 20 dakika = 12.00', '12.00 + 15 dakika = 12.15'] },
    ],
  },
  {
    id: 'g5-bolme-pratigi',
    outcomes: ['MAT.5.1.2'],
    type: 'fill',
    title: 'Dört basamaklıyı iki basamaklıya böl',
    instructions: 'Bölme işlemlerini yap. Önce sonucu tahmin etmeyi unutma!',
    level: 2,
    generator: { id: 'arith', params: { op: '÷', min: 12, max: 99, maxResult: 9999 }, count: 6 },
  },

  // ── Geometrik Nicelikler ───────────────────────────────────────────────
  {
    id: 'g5-cevreden-kenarlara',
    outcomes: ['MAT.5.4.1'],
    type: 'fill',
    title: 'Çevreden kenarlara',
    instructions: 'Dikdörtgenin çevre uzunluğundan kenar uzunluklarını bul. Kenar uzunlukları doğal sayıdır.',
    level: 2,
    items: [
      { text: 'Çevresi 20 cm olan dikdörtgenin bir kenarı 6 cm ise diğer kenarı __ cm’dir.', answers: ['4'], hint: 'Kısa kenar + uzun kenar = çevrenin yarısı' },
      { text: 'Çevresi 24 cm olan karenin bir kenarı __ cm’dir.', answers: ['6'] },
      { text: 'Çevresi 30 m olan dikdörtgen bir bahçenin kısa ve uzun kenarlarının toplamı __ m’dir.', answers: ['15'] },
      { text: 'Çevresi 36 cm olan dikdörtgenin uzun kenarı 11 cm ise kısa kenarı __ cm’dir.', answers: ['7'] },
      { text: 'Çevresi 14 cm olan, kenar uzunlukları doğal sayı olan __ farklı dikdörtgen çizilebilir.', answers: ['3'], hint: 'Kenarların toplamı 7: 1 + 6, 2 + 5, …' },
      { text: 'Çevresi 16 cm olan, kenar uzunlukları doğal sayı olan __ farklı dikdörtgen çizilebilir (kare dâhil).', answers: ['4'] },
      { text: 'Uzun kenarı kısa kenarının 2 katı olan dikdörtgenin çevresi 18 cm ise kısa kenarı __ cm’dir.', answers: ['3'] },
    ],
  },
  {
    id: 'g5-cevresi-16-olanlar',
    outcomes: ['MAT.5.4.1'],
    type: 'categorize',
    title: 'Çevresi 16 cm olanlar',
    instructions: 'Kenar uzunlukları verilen dikdörtgenlerin çevresini hesapla ve doğru gruba sürükle.',
    level: 1,
    categories: [
      { id: 'evet', label: 'Çevresi 16 cm', color: '#22c55e' },
      { id: 'hayir', label: 'Çevresi 16 cm değil', color: '#ef4444' },
    ],
    items: [
      { content: '1 cm × 7 cm', category: 'evet' },
      { content: '2 cm × 6 cm', category: 'evet' },
      { content: '3 cm × 5 cm', category: 'evet' },
      { content: '4 cm × 4 cm', category: 'evet' },
      { content: '2 cm × 8 cm', category: 'hayir' },
      { content: '3 cm × 6 cm', category: 'hayir' },
      { content: '4 cm × 5 cm', category: 'hayir' },
      { content: '1 cm × 8 cm', category: 'hayir' },
    ],
  },
  {
    id: 'g5-geometri-tahtasinda-dikdortgen',
    outcomes: ['MAT.5.4.1', 'MAT.5.4.3'],
    type: 'manipulative',
    title: 'Geometri tahtasında dikdörtgen',
    instructions: 'Çivilere dokunarak istenen dikdörtgeni oluştur. Bir aralık 1 birimdir.',
    level: 2,
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Çevresi 12 birim olan bir dikdörtgen oluştur.', target: { sides: 4, perimeter: 12 } },
      { prompt: 'Çevresi 16 birim olan bir dikdörtgen oluştur.', target: { sides: 4, perimeter: 16 } },
      { prompt: 'Alanı 12 birimkare olan bir dikdörtgen oluştur.', target: { sides: 4, area: 12 } },
      { prompt: 'Hem alanı 16 birimkare hem çevresi 16 birim olan dikdörtgeni oluştur.', target: { sides: 4, area: 16, perimeter: 16 } },
    ],
  },
  {
    id: 'g5-birim-karelerle-alan',
    outcomes: ['MAT.5.4.2'],
    type: 'fill',
    title: 'Birim karelerle alan',
    instructions: 'Dikdörtgenin içindeki birim kareleri say ya da satır ve sütun sayısını çarp.',
    level: 1,
    generator: { id: 'rectangle', params: { ask: 'area', max: 9, grid: true }, count: 6 },
  },
  {
    id: 'g5-alan-bagintisi',
    outcomes: ['MAT.5.4.2'],
    type: 'fill',
    title: 'Dikdörtgenin alanı',
    instructions: 'Alanı, iki ardışık kenarın uzunluklarını çarparak bul.',
    level: 2,
    items: [
      { text: 'Her satırda __ birim kare ve __ satır var. Alanı __ birimkaredir.', answers: ['6', '4', '24'], visual: { kind: 'area', w: 6, h: 4, showGrid: true } },
      { text: 'Kenar uzunlukları 9 cm ve 7 cm olan dikdörtgenin alanı __ cm² dir.', answers: ['63'] },
      { text: 'Bir sınıfın tabanı 8 m × 6 m’dir. Tabanın alanı __ m² dir.', answers: ['48'] },
      { text: 'Bir kenarı 12 cm olan karenin alanı __ cm² dir.', answers: ['144'] },
      { text: 'A(ABCD) = 45 cm² ve |AB| = 9 cm olan ABCD dikdörtgeninde |BC| = __ cm’dir.', answers: ['5'] },
      { text: '9 × 5’lik dikdörtgeni 3 × 5 ve __ × 5’lik iki parçaya ayırırsak alan 15 + __ = 45 birimkare olur.', answers: ['6', '30'], visual: { kind: 'area', w: 9, h: 5, showGrid: true } },
      { text: 'Alanı 56 m² olan dikdörtgen bir tarlanın bir kenarı 7 m ise diğer kenarı __ m’dir.', answers: ['8'] },
    ],
  },
  {
    id: 'g5-alan-cevre-iliskisi',
    outcomes: ['MAT.5.4.3'],
    type: 'quiz',
    title: 'Aynı alan, farklı çevre',
    instructions: 'Dikdörtgenlerin alan ve çevre uzunluklarını karşılaştır.',
    level: 2,
    questions: [
      { prompt: 'Alanı 24 cm² olan dikdörtgenlerden hangisinin çevresi en uzundur?', choices: ['1 cm × 24 cm', '2 cm × 12 cm', '3 cm × 8 cm', '4 cm × 6 cm'], answer: 0, explain: 'Çevreler: 50, 28, 22 ve 20 cm. Kenarlar birbirinden ne kadar farklıysa çevre o kadar uzun olur.' },
      { prompt: 'Çevresi 20 cm olan dikdörtgenlerden hangisinin alanı en büyüktür?', choices: ['1 cm × 9 cm', '2 cm × 8 cm', '3 cm × 7 cm', '5 cm × 5 cm'], answer: 3, explain: 'Alanlar: 9, 16, 21 ve 25 cm². Kenarlar birbirine yaklaştıkça alan büyür.' },
      { prompt: 'Alanları eşit olan iki dikdörtgenin çevre uzunlukları için ne söylenebilir?', choices: ['Her zaman eşittir.', 'Eşit olmak zorunda değildir.', 'Her zaman farklıdır.', 'Alanın iki katıdır.'], answer: 1 },
      { prompt: 'Alanı 36 cm² olan karenin çevre uzunluğu kaç santimetredir?', choices: ['18 cm', '24 cm', '36 cm', '144 cm'], answer: 1, explain: '6 × 6 = 36, karenin bir kenarı 6 cm. Çevre 4 × 6 = 24 cm.' },
      { prompt: 'Çevresi 24 cm olan dikdörtgenin bir kenarı 8 cm ise alanı kaç cm²’dir?', choices: ['16', '48', '32', '64'], answer: 2, explain: 'Diğer kenar 12 − 8 = 4 cm. Alan 8 × 4 = 32 cm².' },
      { prompt: 'Hangi iki dikdörtgenin alanları eşit, çevreleri farklıdır?', choices: ['2 × 9 ve 3 × 6', '2 × 6 ve 3 × 5', '4 × 4 ve 3 × 5', '1 × 5 ve 2 × 4'], answer: 0, explain: 'İkisinin de alanı 18 birimkare; çevreleri 22 ve 18 birim.' },
      { prompt: 'Hangi iki dikdörtgenin çevreleri eşit, alanları farklıdır?', choices: ['2 × 9 ve 3 × 6', '2 × 3 ve 1 × 6', '1 × 8 ve 2 × 4', '4 × 4 ve 3 × 5'], answer: 3, explain: 'İkisinin de çevresi 16 birim; alanları 16 ve 15 birimkare.' },
    ],
  },
  {
    id: 'g5-alan-cevre-tablosu',
    outcomes: ['MAT.5.4.3'],
    type: 'fill',
    title: 'Alan ve çevre tablosu',
    instructions: 'Alanı verilen dikdörtgenin çevresini, çevresi verilenin alanını bul.',
    level: 2,
    items: [
      {
        text: 'Tabloya göre alanı 36 cm² olan dikdörtgenlerden en kısa çevreye sahip olanın çevresi __ cm’dir.',
        answers: ['24'],
        visual: { kind: 'table', headers: ['Kısa kenar (cm)', 'Uzun kenar (cm)', 'Alan (cm²)', 'Çevre (cm)'], rows: [[1, 36, 36, 74], [2, 18, 36, 40], [3, 12, 36, 30], [4, 9, 36, 26], [6, 6, 36, 24]] },
      },
      { text: 'Alanı 20 cm² ve bir kenarı 4 cm olan dikdörtgenin çevresi __ cm’dir.', answers: ['18'] },
      { text: 'Çevresi 18 cm ve bir kenarı 5 cm olan dikdörtgenin alanı __ cm² dir.', answers: ['20'] },
      { text: 'Alanı 30 cm² ve bir kenarı 5 cm olan dikdörtgenin çevresi __ cm’dir.', answers: ['22'] },
      { text: 'Çevresi 28 cm olan karenin alanı __ cm² dir.', answers: ['49'] },
      { text: 'Alanı 12 cm² olan, kenar uzunlukları doğal sayı olan __ farklı dikdörtgen vardır.', answers: ['3'], hint: '1 × 12, 2 × 6, …' },
      { text: 'Çevresi 22 cm ve bir kenarı 8 cm olan dikdörtgenin alanı __ cm² dir.', answers: ['24'] },
    ],
  },
  {
    id: 'g5-alan-cevre-sirala',
    outcomes: ['MAT.5.4.3', 'MAT.5.4.2'],
    type: 'sort',
    title: 'Alan ve çevreye göre sırala',
    instructions: 'Dikdörtgenleri istenen ölçüye göre küçükten büyüğe sırala.',
    level: 3,
    rounds: [
      { prompt: 'Alanı 24 cm² olan dikdörtgenleri çevre uzunluğuna göre küçükten büyüğe sırala.', items: ['4 cm × 6 cm', '3 cm × 8 cm', '2 cm × 12 cm', '1 cm × 24 cm'], ends: ['En kısa çevre', 'En uzun çevre'] },
      { prompt: 'Çevresi 20 cm olan dikdörtgenleri alanlarına göre küçükten büyüğe sırala.', items: ['1 cm × 9 cm', '2 cm × 8 cm', '3 cm × 7 cm', '4 cm × 6 cm', '5 cm × 5 cm'], ends: ['En küçük alan', 'En büyük alan'] },
      {
        prompt: 'Dikdörtgenleri alanlarına göre küçükten büyüğe sırala.',
        items: [{ visual: { kind: 'area', w: 2, h: 3, showGrid: true } }, { visual: { kind: 'area', w: 4, h: 2, showGrid: true } }, { visual: { kind: 'area', w: 4, h: 3, showGrid: true } }, { visual: { kind: 'area', w: 5, h: 3, showGrid: true } }],
        ends: ['En küçük alan', 'En büyük alan'],
      },
    ],
  },
  {
    id: 'g5-alan-cevre-problemleri',
    outcomes: ['MAT.5.4.4'],
    type: 'fill',
    title: 'Bahçe, oda ve çerçeve problemleri',
    instructions: 'Problemde çevre mi alan mı istendiğine karar ver ve çöz.',
    level: 2,
    items: [
      { text: 'Kenarları 15 m ve 9 m olan dikdörtgen bahçenin çevresine 2 sıra tel çekilecek. __ m tel gerekir.', answers: ['96'], hint: 'Önce çevreyi bul, sonra 2 ile çarp.' },
      { text: 'Kenarları 4 m ve 3 m olan odanın tabanı, metrekaresi 250 TL olan parkeyle kaplanacak. __ TL ödenir.', answers: ['3000'] },
      { text: 'Alanı 1 m² olan kare karolarla 6 m × 5 m’lik bir avlu kaplanacak. __ karo gerekir.', answers: ['30'] },
      { text: 'Ayşe 30 cm × 20 cm’lik resminin çevresine çerçeve yapacak. __ cm çıta gerekir.', answers: ['100'] },
      { text: '12 m × 8 m’lik dikdörtgen bir tarlanın çevresine 1 m arayla direk dikilecek. Köşelere de direk dikilirse __ direk gerekir.', answers: ['40'], hint: 'Kapalı bir şeklin çevresinde direk sayısı, çevre uzunluğu kadardır.' },
      { text: 'Çevresi 40 m olan kare şeklindeki parkın alanı __ m² dir.', answers: ['100'] },
      { text: '12 m × 7 m’lik havuzun çevresinde 1 m genişliğinde yürüme yolu var. Havuz ve yol birlikte __ m × __ m’lik bir dikdörtgen oluşturur.', answers: ['14', '9'] },
      { text: 'Bu yürüme yolunun alanı __ m² dir.', answers: ['42'], hint: 'Büyük dikdörtgenin alanından havuzun alanını çıkar: 126 − 84' },
    ],
  },
  {
    id: 'g5-alan-cevre-karar',
    outcomes: ['MAT.5.4.4'],
    type: 'quiz',
    title: 'Alan mı, çevre mi?',
    instructions: 'Problemleri çöz, doğru cevabı seç.',
    level: 3,
    questions: [
      { prompt: 'Elif 24 tane 1 cm²’lik kare kartla dikdörtgen yapacak. Hangisini yapamaz?', choices: ['4 cm × 6 cm', '3 cm × 8 cm', '5 cm × 5 cm', '2 cm × 12 cm'], answer: 2, explain: '5 × 5 = 25 kart gerekir; Elif’in 24 kartı var.' },
      { prompt: 'Dikdörtgen bir bahçenin uzunluğu 2 katına çıkarılır, genişliği aynı kalırsa alanı ne olur?', choices: ['Değişmez.', '2 katına çıkar.', '4 katına çıkar.', 'Yarıya iner.'], answer: 1 },
      { prompt: 'Kenarları 6 m ve 4 m olan odanın duvar diplerine süpürgelik döşenecek. Kapı 1 m genişliğindeyse kaç metre süpürgelik gerekir?', choices: ['20 m', '19 m', '24 m', '23 m'], answer: 1, explain: 'Çevre 2 × (6 + 4) = 20 m. Kapının olduğu 1 m’ye süpürgelik konmaz: 19 m.' },
      { prompt: 'Bir kenarı 8 cm olan kareyle aynı alana sahip, bir kenarı 4 cm olan dikdörtgenin çevresi kaç santimetredir?', choices: ['32 cm', '40 cm', '36 cm', '64 cm'], answer: 1, explain: 'Alan 64 cm². Diğer kenar 64 ÷ 4 = 16 cm. Çevre 2 × (16 + 4) = 40 cm.' },
      { prompt: 'Kenarları 10 m ve 6 m olan bahçenin yarısına çim ekiliyor. Çim ekilen alan kaç m²’dir?', choices: ['16 m²', '32 m²', '60 m²', '30 m²'], answer: 3 },
      { prompt: 'Bir dikdörtgenin her kenarı 1 cm uzatılırsa çevresi kaç santimetre artar?', choices: ['1 cm', '2 cm', '4 cm', '8 cm'], answer: 2 },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ──────────────────────────────────────────
  {
    id: 'g5-kesir-modelleri',
    outcomes: ['MAT.5.1.3'],
    type: 'quiz',
    title: 'Modeldeki kesir',
    instructions: 'Boyalı kısmı gösteren kesri seç. Birden fazla bütün olabilir!',
    level: 1,
    generator: { id: 'fractionModel', params: { improper: true, dens: [2, 3, 4, 5, 6, 8] }, count: 8 },
  },
  {
    id: 'g5-bilesik-ve-tam-sayili-kesir',
    outcomes: ['MAT.5.1.3'],
    type: 'fill',
    title: 'Bileşik ve tam sayılı kesirler',
    instructions: 'Birim kesirleri sayarak bileşik ve tam sayılı kesirleri birbirine dönüştür.',
    level: 2,
    items: [
      { text: 'Modelde __ tane [[1/3]] boyalıdır. [[7/3]] = __ tam [[1/3]]', answers: ['7', '2'], visual: { kind: 'fraction', num: 7, den: 3, shape: 'circle' } },
      { text: '[[11/4]] = __ tam [[3/4]]', answers: ['2'] },
      { text: '[[9/2]] = __ tam [[1/2]]', answers: ['4'] },
      { text: '[[2 3/5]] tam sayılı kesrinde __ tane [[1/5]] vardır.', answers: ['13'] },
      { text: '[[1 1/2]] bütünde __ tane [[1/2]] vardır.', answers: ['3'] },
      { text: 'Annem 3 bütün ve [[1/2]] ekmek aldı. Bunu bileşik kesirle __ / 2 şeklinde yazarız.', answers: ['7'] },
      { text: '[[17/5]] kesri 3 tam ile __ tane [[1/5]] eder.', answers: ['2'] },
    ],
  },
  {
    id: 'g5-kesir-ondalik-yuzde',
    outcomes: ['MAT.5.1.3'],
    type: 'match',
    title: 'Kesir, ondalık ve yüzde',
    instructions: 'Aynı büyüklüğü gösteren kesir ile ondalık ya da yüzde gösterimini eşleştir.',
    level: 2,
    pairs: [
      { left: '[[1/2]]', right: '0,5' },
      { left: '[[3/4]]', right: '%75' },
      { left: '[[3/10]]', right: '0,3' },
      { left: '[[65/100]]', right: '%65' },
      { left: '[[7/100]]', right: '0,07' },
      { left: '[[1 1/2]]', right: '1,5' },
      { left: '[[2/5]]', right: '%40' },
      { left: '[[1/4]]', right: '0,25' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-yuzluk-kart',
    outcomes: ['MAT.5.1.3'],
    type: 'fill',
    title: 'Yüzlük kart',
    instructions: 'Yüzlük karttaki boyalı kısmı yüzde ve ondalık gösterimle yaz.',
    level: 2,
    items: [
      { text: 'Boyalı kısım [[35/100]] tür. Yüzde olarak %__, ondalık olarak __ yazılır.', answers: ['35', '0,35|0.35'], visual: hundred(35) },
      { text: 'Boyalı kısım yüzde olarak %__, ondalık olarak __ yazılır.', answers: ['60', '0,6|0.6|0,60'], visual: hundred(60) },
      { text: 'Boyalı kısım yüzde olarak %__, ondalık olarak __ yazılır.', answers: ['7', '0,07|0.07'], visual: hundred(7) },
      { text: 'Boyalı kısım bütünün yarısıdır: [[1/2]] = %__', answers: ['50'], visual: hundred(50) },
      { text: 'Boyalı kısım bütünün dörtte biridir: [[1/4]] = %__', answers: ['25'], visual: hundred(25) },
      { text: '[[65/100]] = [[6/10]] + [[5/100]] = %60 + %__', answers: ['5'] },
    ],
  },
  {
    id: 'g5-kesir-seritleri',
    outcomes: ['MAT.5.1.3'],
    type: 'manipulative',
    title: 'Kesir şeritlerinde göster',
    instructions: 'Bütünü eş parçalara böl ve istenen kadarını boya.',
    level: 2,
    tool: 'fractions',
    config: { dens: [2, 4, 5, 10] },
    tasks: [
      { prompt: '%50’yi kesir şeridinde göster.', target: { num: 1, den: 2 } },
      { prompt: '0,4’ü kesir şeridinde göster.', target: { num: 2, den: 5 } },
      { prompt: '[[3/4]] kesrini kesir şeridinde göster.', target: { num: 3, den: 4 } },
      { prompt: '%70’i onda birlik parçalarla göster.', target: { num: 7, den: 10, exact: true } },
    ],
  },
  {
    id: 'g5-sayi-dogrusunda-kesirler',
    outcomes: ['MAT.5.1.3', 'MAT.5.1.4'],
    type: 'manipulative',
    title: 'Sayı doğrusunda kesirler',
    instructions: 'Sayı doğrusu 0,1’er artıyor. İstenen sayıyı işaretle.',
    level: 2,
    tool: 'numberline',
    config: { min: 0, max: 2, step: 0.1 },
    tasks: [
      { prompt: '0,7’yi işaretle.', target: { value: 0.7 } },
      { prompt: '[[1 1/2]] tam sayılı kesrini işaretle.', target: { value: 1.5 } },
      { prompt: '[[6/5]] bileşik kesrini işaretle.', target: { value: 1.2 } },
      { prompt: '%30’u işaretle.', target: { value: 0.3 } },
    ],
  },
  {
    id: 'g5-gercek-yasamda-kesirler',
    outcomes: ['MAT.5.1.3'],
    type: 'quiz',
    title: 'Gerçek yaşamda kesirler',
    instructions: 'Günlük hayattaki kesir, ondalık ve yüzde gösterimlerini yorumla.',
    level: 2,
    questions: [
      { prompt: 'Bir mağazada “Tüm ürünlerde %25 indirim” yazıyor. Bu indirim kesirle nasıl gösterilir?', choices: ['[[1/4]]', '[[1/25]]', '[[25/10]]', '[[2/5]]'], answer: 0, explain: '%25 = [[25/100]] = [[1/4]]' },
      { prompt: 'Elif 1,5 litre su içti. Bu miktar tam sayılı kesirle nasıl yazılır?', choices: ['[[1 1/5]]', '[[1 1/2]]', '[[1/15]]', '[[5/10]]'], answer: 1 },
      { prompt: '20 kişilik bir sınıfta 5 öğrenci gözlük takıyor. Gözlüklü öğrenciler sınıfın yüzde kaçıdır?', choices: ['%5', '%20', '%25', '%50'], answer: 2, explain: '[[5/20]] = [[1/4]] = %25' },
      { prompt: 'Hava durumu raporunda “yağış olasılığı %40” deniyor. Bu oran ondalık gösterimle nasıl yazılır?', choices: ['0,04', '0,4', '4,0', '40'], answer: 1 },
      { prompt: 'Bir otoparkın [[7/10]]’u dolu. Otoparkın yüzde kaçı doludur?', choices: ['%7', '%17', '%70', '%710'], answer: 2 },
      { prompt: 'Hangisi “2 tam 3 bölü 4” kesrini gösterir?', choices: ['[[3 2/4]]', '[[23/4]]', '[[2/34]]', '[[2 3/4]]'], answer: 3 },
      { prompt: 'Alışveriş fişinde KDV oranı %20 yazıyor. %20 hangi kesre eşittir?', choices: ['[[1/20]]', '[[1/5]]', '[[20/10]]', '[[1/2]]'], answer: 1, explain: '%20 = [[20/100]] = [[1/5]]' },
    ],
  },
  {
    id: 'g5-kesirleri-karsilastir',
    outcomes: ['MAT.5.1.4'],
    type: 'fill',
    title: 'Büyük mü, küçük mü, eşit mi?',
    instructions: 'Farklı gösterimlerle verilen kesirleri karşılaştır ve uygun işareti seç.',
    level: 2,
    items: [
      { text: '[[3/4]]  __  0,7', answers: ['>'], choices: ['<', '=', '>'] },
      { text: '%45  __  [[1/2]]', answers: ['<'], choices: ['<', '=', '>'] },
      { text: '0,25  __  [[1/4]]', answers: ['='], choices: ['<', '=', '>'] },
      { text: '[[5/4]]  __  1,2', answers: ['>'], choices: ['<', '=', '>'] },
      { text: '0,2  __  0,19', answers: ['>'], choices: ['<', '=', '>'] },
      { text: '2,3  __  2,30', answers: ['='], choices: ['<', '=', '>'] },
      { text: '[[7/8]]  __  [[8/9]]', answers: ['<'], choices: ['<', '=', '>'], hint: 'Hangisi 1’e daha yakın?' },
      { text: '[[3/7]]  __  [[3/5]]', answers: ['<'], choices: ['<', '=', '>'], hint: 'Payları eşit kesirlerde paydası küçük olan daha büyüktür.' },
    ],
  },
  {
    id: 'g5-kesirleri-sirala',
    outcomes: ['MAT.5.1.4'],
    type: 'sort',
    title: 'Farklı gösterimleri sırala',
    instructions: 'Kesir, ondalık ve yüzde gösterimlerini küçükten büyüğe sırala.',
    level: 3,
    rounds: [
      { prompt: 'Küçükten büyüğe sırala.', items: ['0,2', '[[1/4]]', '%30', '[[2/5]]', '0,5'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Küçükten büyüğe sırala.', items: ['[[3/4]]', '0,8', '%85', '[[9/10]]', '0,95'], ends: ['En küçük', 'En büyük'] },
      { prompt: '1’den büyük sayıları küçükten büyüğe sırala.', items: ['1,1', '[[5/4]]', '1,3', '[[3/2]]', '[[1 3/4]]'], ends: ['En küçük', 'En büyük'] },
      { prompt: 'Ondalık gösterimleri küçükten büyüğe sırala.', items: ['2,3', '2,32', '2,36', '2,4'], ends: ['En küçük', 'En büyük'] },
    ],
  },
  {
    id: 'g5-sifira-yarima-bire-yakin',
    outcomes: ['MAT.5.1.4'],
    type: 'categorize',
    title: '0’a mı, yarıma mı, 1’e mi yakın?',
    instructions: 'Her sayının 0’a mı, yarıma (0,5) mı yoksa 1’e mi daha yakın olduğuna karar ver ve sürükle.',
    level: 2,
    categories: [
      { id: 'sifir', label: '0’a yakın', color: '#3b82f6' },
      { id: 'yarim', label: 'Yarıma (0,5) yakın', color: '#a855f7' },
      { id: 'bir', label: '1’e yakın', color: '#f97316' },
    ],
    items: [
      { content: '[[1/10]]', category: 'sifir' },
      { content: '0,05', category: 'sifir' },
      { content: '%8', category: 'sifir' },
      { content: '[[5/9]]', category: 'yarim' },
      { content: '0,48', category: 'yarim' },
      { content: '%52', category: 'yarim' },
      { content: '[[9/10]]', category: 'bir' },
      { content: '0,95', category: 'bir' },
      { content: '%97', category: 'bir' },
      { content: '[[11/12]]', category: 'bir' },
    ],
  },
  {
    id: 'g5-kesir-karsilastirma-problemleri',
    outcomes: ['MAT.5.1.4'],
    type: 'quiz',
    title: 'Kim daha çok?',
    instructions: 'Gerçek yaşam durumlarında kesirleri karşılaştır.',
    level: 2,
    questions: [
      { prompt: 'Ayşe kitabının [[3/5]]’ini, Can aynı kitabın %55’ini okudu. Kim daha çok okudu?', choices: ['Ayşe', 'Can', 'Eşit okudular'], answer: 0, explain: '[[3/5]] = [[60/100]] = %60 ve %60 > %55.' },
      { prompt: '20 kişilik sınıfta 5 öğrenci basketbolu, 10 öğrenci voleybolu, 5 öğrenci tenisi seviyor. Sınıfın yarısı hangi sporu seviyor?', choices: ['Basketbol', 'Voleybol', 'Tenis'], answer: 1, explain: '[[10/20]] = [[1/2]]' },
      { prompt: 'Hangi kesir 1’e en yakındır?', choices: ['[[3/4]]', '[[5/6]]', '[[7/8]]', '[[2/3]]'], answer: 2, explain: '1’den eksik olan parçalar: [[1/4]], [[1/6]], [[1/8]], [[1/3]]. En küçük eksik [[1/8]]’dir.' },
      { prompt: '0,2 ile 0,21’den hangisi 0,19’a daha yakındır?', choices: ['0,2', '0,21', 'İkisi eşit uzaklıkta'], answer: 0 },
      { prompt: 'A markasının 1 kg peyniri 312,5 TL, B markasının 1 kg peyniri 312,45 TL. Hangisi daha ucuzdur?', choices: ['A markası', 'B markası', 'Fiyatları aynı'], answer: 1, explain: '312,5 = 312,50 ve 312,45 < 312,50.' },
      { prompt: 'İki kardeşten Ali bahçenin [[2/5]]’ini, Zeynep %45’ini aldı. Paylaşım için ne söylenebilir?', choices: ['Ali’nin payı daha büyüktür.', 'Payları eşittir.', 'Zeynep’in payı daha büyüktür.'], answer: 2, explain: '[[2/5]] = %40 ve %40 < %45.' },
      { prompt: 'Paydaları eşit iki kesirden hangisi daha büyüktür?', choices: ['Payı büyük olan', 'Payı küçük olan', 'Her zaman eşittirler'], answer: 0 },
      { prompt: 'Payları eşit iki kesirden hangisi daha büyüktür?', choices: ['Paydası büyük olan', 'Paydası küçük olan', 'Her zaman eşittirler'], answer: 1 },
    ],
  },
  {
    id: 'g5-kesir-siralama-pratigi',
    outcomes: ['MAT.5.1.4'],
    type: 'sort',
    title: 'Kesirleri sırala',
    instructions: 'Paydaları farklı kesirleri küçükten büyüğe sırala. 0’a, yarıma ve 1’e yakınlığı düşün.',
    level: 3,
    generator: { id: 'sortFractions', params: { dens: [2, 3, 4, 5, 6, 8, 10], n: 4 }, count: 3 },
  },

  // ── İstatistiksel Araştırma Süreci ─────────────────────────────────────
  {
    id: 'g5-arastirma-sorusu-mu',
    outcomes: ['MAT.5.5.1'],
    type: 'categorize',
    title: 'Araştırma sorusu mu?',
    instructions: 'Veri toplanarak cevaplanabilen soruları “İstatistiksel araştırma sorusu” grubuna, diğerlerini “Değil” grubuna sürükle.',
    level: 2,
    categories: [
      { id: 'evet', label: 'İstatistiksel araştırma sorusu', color: '#22c55e' },
      { id: 'hayir', label: 'Değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Sınıfımızdaki öğrenciler en çok hangi sporu seviyor?', category: 'evet' },
      { content: 'Okulumuzdaki öğrenciler okula en çok hangi ulaşım aracıyla geliyor?', category: 'evet' },
      { content: '5-A sınıfında en çok sevilen meyve hangisi?', category: 'evet' },
      { content: 'Mahallemizdeki aileler en çok hangi atıkları geri dönüştürüyor?', category: 'evet' },
      { content: 'Ali kaç yaşında?', category: 'hayir' },
      { content: 'Türkiye’nin başkenti neresidir?', category: 'hayir' },
      { content: 'Mehmet’in en sevdiği renk hangisi?', category: 'hayir' },
      { content: 'Bir haftada kaç gün vardır?', category: 'hayir' },
    ],
  },
  {
    id: 'g5-kategorik-mi-sayisal-mi',
    outcomes: ['MAT.5.5.1'],
    type: 'categorize',
    title: 'Kategorik veri mi, sayısal veri mi?',
    instructions: 'Ankette toplanan verinin kategorik mi (sözcüklerle gruplanan) yoksa sayısal mı olduğunu belirle.',
    level: 2,
    categories: [
      { id: 'kategorik', label: 'Kategorik veri', color: '#a855f7' },
      { id: 'sayisal', label: 'Sayısal veri', color: '#3b82f6' },
    ],
    items: [
      { content: 'En sevilen spor dalı', category: 'kategorik' },
      { content: 'Göz rengi', category: 'kategorik' },
      { content: 'Okula geliş şekli (yürüyerek, servis, otobüs)', category: 'kategorik' },
      { content: 'Tutulan takım', category: 'kategorik' },
      { content: 'En sevilen meyve', category: 'kategorik' },
      { content: 'Boy uzunluğu (cm)', category: 'sayisal' },
      { content: 'Kardeş sayısı', category: 'sayisal' },
      { content: 'Günlük uyku süresi (saat)', category: 'sayisal' },
      { content: 'Bir ayda okunan kitap sayısı', category: 'sayisal' },
    ],
  },
  {
    id: 'g5-istatistiksel-arastirma-adimlari',
    outcomes: ['MAT.5.5.1'],
    type: 'sort',
    title: 'Araştırma sürecinin adımları',
    instructions: 'İstatistiksel araştırma sürecinin adımlarını doğru sıraya koy.',
    level: 1,
    rounds: [
      { prompt: 'İstatistiksel araştırma sürecini sırala.', items: ['Araştırma sorusunu oluştur', 'Veri toplama planı yap', 'Anketle veri topla', 'Veriyi tablo ve grafikle görselleştir', 'Veriyi analiz et', 'Sonuçları yorumla ve sun'] },
      {
        prompt: '“5-A sınıfı en çok hangi meyveyi seviyor?” araştırmasının adımlarını sırala.',
        items: ['Seçenekleri (elma, muz, çilek, portakal) içeren anket sorusunu hazırla', 'Anketi sınıftaki her öğrenciye uygula', 'Cevapları sıklık tablosuna işle', 'Sütun grafiğini çiz', 'En çok seçilen meyveyi belirle ve sonucu açıkla'],
      },
    ],
  },
  {
    id: 'g5-sutun-grafigi-olustur',
    outcomes: ['MAT.5.5.1'],
    type: 'manipulative',
    title: 'Sütun grafiği oluştur',
    instructions: 'Tablodaki sıklıklara göre sütunların yüksekliğini ayarla.',
    level: 1,
    tool: 'bargraph',
    tasks: [
      { prompt: '5-A sınıfında okula geliş şekli anketi: Yürüyerek 8, Servis 6, Otobüs 4, Özel araç 3. Sütun grafiğini oluştur.', target: { data: [{ label: 'Yürüyerek', value: 8 }, { label: 'Servis', value: 6 }, { label: 'Otobüs', value: 4 }, { label: 'Özel araç', value: 3 }] } },
      { prompt: 'Kütüphaneden bir haftada ödünç alınan kitap türleri: Macera 9, Bilim 5, Şiir 2, Masal 7. Sütun grafiğini oluştur.', target: { data: [{ label: 'Macera', value: 9 }, { label: 'Bilim', value: 5 }, { label: 'Şiir', value: 2 }, { label: 'Masal', value: 7 }] } },
      { prompt: 'Okulun geri dönüşüm kutularında toplanan atıklar (kg): Kâğıt 10, Plastik 7, Cam 4, Metal 2. Sütun grafiğini oluştur.', target: { data: [{ label: 'Kâğıt', value: 10 }, { label: 'Plastik', value: 7 }, { label: 'Cam', value: 4 }, { label: 'Metal', value: 2 }] } },
    ],
  },
  {
    id: 'g5-grafik-ve-tablo-oku',
    outcomes: ['MAT.5.5.1'],
    type: 'fill',
    title: 'Grafik ve tablo okuma',
    instructions: 'Sütun grafiği, sıklık tablosu ve daire grafiğindeki verileri yorumla.',
    level: 2,
    items: [
      { text: 'Ankete __ öğrenci katılmıştır.', answers: ['24'], visual: SPOR_GRAFIGI },
      { text: 'En çok tercih edilen spor __ dur.', answers: ['Futbol'], choices: ['Futbol', 'Voleybol', 'Basketbol', 'Yüzme'], visual: SPOR_GRAFIGI },
      { text: 'Futbolu seçenler, yüzmeyi seçenlerden __ kişi fazladır.', answers: ['6'], visual: SPOR_GRAFIGI },
      { text: 'Verinin en çok yoğunlaştığı kategori __ dir.', answers: ['Mavi'], choices: ['Mavi', 'Kırmızı', 'Yeşil', 'Sarı'], visual: { kind: 'table', headers: ['En sevilen renk', 'Sıklık'], rows: [['Mavi', 12], ['Kırmızı', 8], ['Yeşil', 6], ['Sarı', 4]] } },
      { text: 'Tabloya göre yeşil ya da sarıyı seçen __ öğrenci vardır.', answers: ['10'], visual: { kind: 'table', headers: ['En sevilen renk', 'Sıklık'], rows: [['Mavi', 12], ['Kırmızı', 8], ['Yeşil', 6], ['Sarı', 4]] } },
      { text: 'Daire grafiği 40 öğrencinin okula geliş şeklini gösteriyor. Yürüyerek gelenler grafiğin yarısıdır: __ öğrenci.', answers: ['20'], visual: DAIRE_GRAFIGI },
      { text: 'Aynı grafikte servisle gelenler bütünün dörtte biridir: __ öğrenci.', answers: ['10'], visual: DAIRE_GRAFIGI },
    ],
  },
  {
    id: 'g5-veri-gorsellestirme',
    outcomes: ['MAT.5.5.1'],
    type: 'quiz',
    title: 'Hangi grafik, hangi anket?',
    instructions: 'Araştırma sürecinde doğru aracı ve doğru soruyu seç.',
    level: 2,
    questions: [
      { prompt: 'Bir bütünün parçalara nasıl dağıldığını (parça-bütün ilişkisini) göstermek için en uygun grafik hangisidir?', choices: ['Sütun grafiği', 'Daire grafiği', 'Nokta grafiği', 'Çetele tablosu'], answer: 1 },
      { prompt: 'Kategorilerin sıklıklarını yan yana karşılaştırmak için en uygun grafik hangisidir?', choices: ['Sütun grafiği', 'Daire grafiği', 'Saat', 'Sayı doğrusu'], answer: 0 },
      { prompt: { text: 'Grafiğe göre öğrencilerin en çok kullandığı ulaşım şekli hangisidir?', visual: DAIRE_GRAFIGI }, choices: ['Servis', 'Özel araç', 'Yürüyerek'], answer: 2 },
      { prompt: 'Araştırma sorusu: “Sınıfımız en çok hangi tür kitabı okuyor?” Hangisi uygun bir anket sorusudur?', choices: ['Kitap okumayı seviyor musun?', 'En çok okuduğun kitap türü hangisi? (Macera / Bilim / Masal / Şiir / Diğer)', 'Kaç yaşındasın?', 'En sevdiğin renk hangisi?'], answer: 1 },
      { prompt: 'Sıklık değeri neyi gösterir?', choices: ['Bir kategorinin veride kaç kez tekrarlandığını', 'Grafiğin rengini', 'Ankete katılmayanların sayısını', 'Anket sorusunun uzunluğunu'], answer: 0 },
      { prompt: 'Anket yaparken kişisel bilgilerin gizliliğini korumak için ne yapılmalıdır?', choices: ['Cevaplar isimleriyle panoya asılmalıdır.', 'Arkadaşların cevapları herkese söylenmelidir.', 'Ankette isim istenmemelidir.', 'Sadece yakın arkadaşlara sorulmalıdır.'], answer: 2 },
    ],
  },
  {
    id: 'g5-grafik-yorumlarini-tartis',
    outcomes: ['MAT.5.5.2'],
    type: 'quiz',
    title: 'Bu yorum doğru mu?',
    instructions: 'Başkalarının grafiklere dayanarak yaptığı yorumları değerlendir.',
    level: 3,
    fixedOrder: true,
    questions: [
      { prompt: { text: 'Fatma: “Futbolu seçenlerin sayısı, yüzmeyi seçenlerin 3 katıdır.”', visual: SPOR_GRAFIGI }, choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'], answer: 0, explain: 'Futbol 9, yüzme 3 kişi: 9 = 3 × 3.' },
      { prompt: { text: 'Emre: “Sınıfın yarısından fazlası futbolu seviyor.”', visual: SPOR_GRAFIGI }, choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'], answer: 1, explain: '24 kişinin yarısı 12’dir; futbolu seçen 9 kişi yarıdan azdır.' },
      { prompt: { text: 'Selin: “Türkiye’deki tüm öğrencilerin en sevdiği spor futboldur.”', visual: SPOR_GRAFIGI }, choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'], answer: 2, explain: 'Veri yalnızca bir sınıftan toplanmıştır; tüm Türkiye için genelleme yapılamaz.' },
      { prompt: 'Okulda en sevilen spor araştırılırken yalnızca basketbol takımındaki öğrencilere soru soruldu ve “En sevilen spor basketboldur.” sonucuna ulaşıldı. Bu araştırmadaki hata nedir?', choices: ['Anket sorusu çok kısadır.', 'Veri yalnızca basketbol takımından toplandığı için sonuç yanlıdır.', 'Grafik yanlış renkte çizilmiştir.', 'Hata yoktur, sonuç doğrudur.'], answer: 1 },
      { prompt: { text: 'Bir reklamda A ve B markalarının satışları gösteriliyor. B’nin sütunu A’nınkinin 2 katı uzunlukta. B markası A’nın 2 katı mı satmış?', visual: YANILTICI_GRAFIK }, choices: ['Evet, sütunu 2 kat uzun.', 'Grafikten hiçbir şey anlaşılmaz.', 'Hayır, A daha çok satmış.', 'Hayır; A 95, B 100 satmış. Eksen 90’dan başladığı için fark büyük görünüyor.'], answer: 3 },
      { prompt: 'Bir anketin sonucu “Öğrencilerin %60’ı kantini beğeniyor.” şeklinde açıklandı. Ankete yalnızca 5 öğrenci katılmış. Bu sonuç bütün okul için güvenilir midir?', choices: ['Evet, %60 yüksek bir orandır.', 'Hayır, katılımcı sayısı çok az olduğu için okulu temsil etmez.', 'Evet, 5 kişi yeterlidir.', 'Hayır, çünkü yüzde kullanılmıştır.'], answer: 1 },
      { prompt: { text: 'Mert: “Grafiğe göre servisle gelenler ile özel araçla gelenler eşit sayıdadır.”', visual: DAIRE_GRAFIGI }, choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'], answer: 0, explain: 'İki dilim de dairenin dörtte biri kadardır.' },
    ],
  },
  {
    id: 'g5-kabul-mu-curut-mu',
    outcomes: ['MAT.5.5.2'],
    type: 'categorize',
    title: 'Kabul et ya da çürüt',
    instructions: '5-A sınıfındaki 30 öğrenciye en sevdiği meyve soruldu: Elma 12, Muz 8, Çilek 6, Portakal 4. Her yorumu doğru gruba sürükle.',
    level: 3,
    categories: [
      { id: 'kabul', label: 'Kabul edilir', color: '#22c55e' },
      { id: 'curut', label: 'Çürütülür', color: '#ef4444' },
      { id: 'yetersiz', label: 'Veri yetersiz', color: '#64748b' },
    ],
    items: [
      { content: 'Elmayı seçenler, muzu seçenlerden 4 kişi fazladır.', category: 'kabul' },
      { content: 'Çilek ve portakalı seçenlerin toplamı, muzu seçenlerden fazladır.', category: 'kabul' },
      { content: 'En az tercih edilen meyve portakaldır.', category: 'kabul' },
      { content: 'Sınıfın [[2/5]]’i elmayı seçmiştir.', category: 'kabul' },
      { content: 'Sınıfın yarısından fazlası elmayı seçmiştir.', category: 'curut' },
      { content: 'Muzu seçenler, çileği seçenlerin 2 katıdır.', category: 'curut' },
      { content: 'Portakalı seçenler sınıfın %20’sidir.', category: 'curut' },
      { content: 'Türkiye’deki çocukların en sevdiği meyve elmadır.', category: 'yetersiz' },
      { content: '5-B sınıfında da en sevilen meyve elmadır.', category: 'yetersiz' },
    ],
  },

  // ── İşlemlerle Cebirsel Düşünme ────────────────────────────────────────
  {
    id: 'g5-esitligin-korunumu',
    outcomes: ['MAT.5.2.1'],
    type: 'manipulative',
    title: 'Dengeyi koru',
    instructions: 'Terazinin iki kefesinden aynı miktarı çıkararak ya da kefeleri eşit paylara bölerek bilinmeyeni bul.',
    level: 2,
    tool: 'balance',
    tasks: [
      { prompt: 'Terazi dengede: x + 8 = 21. Her iki kefeden 8 çıkar. x kaçtır?', target: { a: 1, b: 8, c: 21 } },
      { prompt: 'Terazi dengede: x + 12 = 30. x kaçtır?', target: { a: 1, b: 12, c: 30 } },
      { prompt: 'Terazi dengede: 3 kutu = 24. Bir kutu kaçtır?', target: { a: 3, b: 0, c: 24 } },
      { prompt: 'Terazi dengede: 2 kutu + 5 = 17. Bir kutu kaçtır?', target: { a: 2, b: 5, c: 17 } },
    ],
  },
  {
    id: 'g5-islem-ozellikleri',
    outcomes: ['MAT.5.2.1'],
    type: 'match',
    title: 'İşlem özellikleri',
    instructions: 'Her sayı cümlesini gösterdiği özellikle eşleştir.',
    level: 2,
    pairs: [
      { left: '25 + 48 = 48 + 25', right: 'Toplamada değişme özelliği' },
      { left: '9 × 4 = 4 × 9', right: 'Çarpmada değişme özelliği' },
      { left: '(12 + 8) + 5 = 12 + (8 + 5)', right: 'Toplamada birleşme özelliği' },
      { left: '(20 × 10) × 25 = 20 × (10 × 25)', right: 'Çarpmada birleşme özelliği' },
      { left: '7 × (10 + 3) = 7 × 10 + 7 × 3', right: 'Çarpmanın toplama üzerine dağılma özelliği' },
      { left: '6 × (10 − 2) = 6 × 10 − 6 × 2', right: 'Çarpmanın çıkarma üzerine dağılma özelliği' },
      { left: '2 + 3 = 7 − 2 ise 2 + 3 + 4 = 7 − 2 + 4', right: 'Eşitliğin korunumu' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-esitligi-tamamla',
    outcomes: ['MAT.5.2.1'],
    type: 'fill',
    title: 'Eşitliği tamamla',
    instructions: 'İşlem yapmadan önce iki tarafı karşılaştır, sonra eksik sayıyı bul.',
    level: 2,
    items: [
      { text: '25 + 48 = 45 + __', answers: ['28'], hint: 'Bir toplanan 20 azaldıysa diğeri 20 artmalı.' },
      { text: '36 + 17 = 40 + __', answers: ['13'] },
      { text: '8 × 25 = 4 × __', answers: ['50'], hint: 'Bir çarpan yarıya inerse diğeri 2 katına çıkmalı.' },
      { text: '5 × 9 = 5 × 3 + 5 × __', answers: ['6'] },
      { text: '12 × 15 = 12 × 10 + 12 × __', answers: ['5'] },
      { text: '(2 × 9) × 30 = 2 × (9 × __)', answers: ['30'] },
      { text: '7 × 98 = 7 × 100 − 7 × __', answers: ['2'] },
      { text: '17 + 8 = 25 ise 17 + 8 + 6 = 25 + __', answers: ['6'] },
    ],
  },
  {
    id: 'g5-sayi-cumlesi-dogru-mu',
    outcomes: ['MAT.5.2.1'],
    type: 'categorize',
    title: 'Sayı cümlesi doğru mu?',
    instructions: 'İşlem özelliklerini kullanarak her sayı cümlesinin doğru mu yanlış mı olduğuna karar ver.',
    level: 2,
    categories: [
      { id: 'dogru', label: 'Doğru', color: '#22c55e' },
      { id: 'yanlis', label: 'Yanlış', color: '#ef4444' },
    ],
    items: [
      { content: '25 + 48 = 48 + 25', category: 'dogru' },
      { content: '25 + 48 = 45 + 28', category: 'dogru' },
      { content: '4 × 25 × 7 = 100 × 7', category: 'dogru' },
      { content: '6 × 14 = 6 × 10 + 6 × 4', category: 'dogru' },
      { content: '18 × 30 = 4 × 27 × 5', category: 'dogru' },
      { content: '36 − 12 = 12 − 36', category: 'yanlis' },
      { content: '24 ÷ 6 = 6 ÷ 24', category: 'yanlis' },
      { content: '(20 − 8) − 2 = 20 − (8 − 2)', category: 'yanlis' },
      { content: '8 × 12 = 8 × 10 + 2', category: 'yanlis' },
    ],
  },
  {
    id: 'g5-islem-onceligi',
    outcomes: ['MAT.5.2.2'],
    type: 'fill',
    title: 'İşlem önceliği',
    instructions: 'Önce parantez, sonra üslü ifade, sonra çarpma-bölme, en son toplama-çıkarma. Soldan sağa ilerle.',
    level: 2,
    items: [
      { text: '18 + 6 × 4 = __', answers: ['42'] },
      { text: '(18 + 6) × 4 = __', answers: ['96'] },
      { text: '48 ÷ 6 + 2 × 5 = __', answers: ['18'] },
      { text: '60 − 24 ÷ 4 × 3 = __', answers: ['42'], hint: 'Bölme ve çarpmayı soldan sağa yap: 24 ÷ 4 = 6, 6 × 3 = 18.' },
      { text: '3^{2} + 4 × 5 = __', answers: ['29'] },
      { text: '2^{3} × (10 − 7) = __', answers: ['24'] },
      { text: '100 − (5^{2} + 15) ÷ 8 = __', answers: ['95'] },
      { text: '(7 + 5) ÷ 3 + 6^{2} = __', answers: ['40'] },
    ],
  },
  {
    id: 'g5-islem-onceligi-problemleri',
    outcomes: ['MAT.5.2.2'],
    type: 'quiz',
    title: 'Sayı cümlesini seç',
    instructions: 'Durumlara uygun sayı cümlesini seç ve işlem önceliğini yorumla.',
    level: 2,
    questions: [
      { prompt: 'Can tanesi 45 TL olan 3 defter ve 20 TL’lik bir kalem aldı. Ödediği tutarı gösteren işlem hangisidir?', choices: ['3 × 45 + 20', '3 × (45 + 20)', '(3 + 45) × 20', '3 + 45 × 20'], answer: 0 },
      { prompt: 'Elif 8 + 4 × 3 işleminin sonucunu 36 buldu. Elif’in hatası nedir?', choices: ['Toplamayı daha önce yapmalıydı.', 'Çarpmayı toplamadan önce yapmadı; doğru sonuç 20’dir.', 'Sonuç doğrudur.', 'Çıkarma yapmalıydı.'], answer: 1 },
      { prompt: '5 arkadaş 250 TL’lik pizza ve 50 TL’lik içecek parasını eşit paylaşacak. Kişi başına düşen tutar hangi işlemle bulunur?', choices: ['250 + 50 ÷ 5', '250 ÷ 5 + 50 × 5', '(250 + 50) ÷ 5', '250 × 5 + 50'], answer: 2 },
      { prompt: '5^{2} ifadesinin değeri kaçtır?', choices: ['10', '25', '52', '7'], answer: 1, explain: '5^{2} = 5 × 5 = 25' },
      { prompt: '4^{3} ifadesi neyi gösterir?', choices: ['4 × 3', '4 + 4 + 4', '3 × 3 × 3 × 3', '4 × 4 × 4'], answer: 3 },
      { prompt: 'Hangi işlemin sonucu en büyüktür?', choices: ['(6 + 4) × 5', '6 + 4 × 5', '6 × 4 + 5', '6 + 4 + 5'], answer: 0, explain: 'Sonuçlar: 50, 26, 29 ve 15.' },
      { prompt: '24 − 4 × 5 + 2 işleminde ilk yapılması gereken işlem hangisidir?', choices: ['24 − 4', '4 × 5', '5 + 2', '24 − 2'], answer: 1 },
      { prompt: 'Bir otoparkta 6 sıra var ve her sırada 12 araç duruyor. 15 araç çıktı. Kalan araç sayısını gösteren işlem ve sonucu hangisidir?', choices: ['6 × 12 − 15 = 57', '6 × (12 − 15)', '6 + 12 − 15 = 3', '6 × 12 + 15 = 87'], answer: 0 },
    ],
  },
  {
    id: 'g5-islem-adimlarini-sirala',
    outcomes: ['MAT.5.2.2'],
    type: 'sort',
    title: 'Hangi işlem önce?',
    instructions: 'İşlem önceliğine göre adımları sırala.',
    level: 2,
    rounds: [
      { prompt: '48 ÷ (2 + 6) × 3 − 5 işleminin adımlarını sırala.', items: ['2 + 6 = 8', '48 ÷ 8 = 6', '6 × 3 = 18', '18 − 5 = 13'] },
      { prompt: '5 + 3 × 4 − 10 ÷ 2 işleminin adımlarını sırala.', items: ['3 × 4 = 12', '10 ÷ 2 = 5', '5 + 12 = 17', '17 − 5 = 12'] },
      { prompt: '(15 − 3) ÷ 4 + 2 × 6 işleminin adımlarını sırala.', items: ['15 − 3 = 12', '12 ÷ 4 = 3', '2 × 6 = 12', '3 + 12 = 15'] },
      { prompt: '2 × 4² + 7 işleminin adımlarını sırala.', items: ['4^{2} = 16', '2 × 16 = 32', '32 + 7 = 39'] },
    ],
  },
  {
    id: 'g5-oruntu-kurali',
    outcomes: ['MAT.5.2.3'],
    type: 'fill',
    title: 'Örüntünün kuralı',
    instructions: 'Adım sayısı ile terim arasındaki ilişkiyi bul; yakın ve uzak adımlardaki terimleri hesapla.',
    level: 3,
    items: [
      { text: '4, 7, 10, 13, … örüntüsünde sabit artış miktarı __ dir.', answers: ['3'] },
      { text: '4, 7, 10, 13, … örüntüsünün 10. terimi __ dir.', answers: ['31'], hint: 'Kural: adım sayısının 3 katının 1 fazlası' },
      { text: '4, 7, 10, 13, … örüntüsünün 50. terimi __ dir.', answers: ['151'] },
      { text: '2, 4, 6, 8, … örüntüsünün 50. terimi __ dir.', answers: ['100'] },
      { text: '1. adımda 4, 2. adımda 7, 3. adımda 10 kibrit çöpü kullanılmıştır. 8. adımda __ çöp kullanılır.', answers: ['25'], visual: KIBRIT },
      { text: 'Kuralı “adım sayısının 5 katının 2 eksiği” olan örüntünün ilk üç terimi __, __, __ dir.', answers: ['3', '8', '13'] },
      { text: 'Elif kumbarasına 1. gün 10 TL, sonraki her gün bir önceki günden 5 TL fazla atıyor (10, 15, 20, …). 12. gün __ TL atar.', answers: ['65'] },
      { text: '6, 11, 16, 21, … örüntüsünde 101 sayısı __. terimdir.', answers: ['20'], hint: 'Kural: adım sayısının 5 katının 1 fazlası' },
    ],
  },
  {
    id: 'g5-oruntu-kural-eslestir',
    outcomes: ['MAT.5.2.3'],
    type: 'match',
    title: 'Örüntü ve kuralı',
    instructions: 'Her örüntüyü kuralıyla eşleştir. İlk terimi 1. adımda kontrol et.',
    level: 2,
    pairs: [
      { left: '2, 4, 6, 8, …', right: 'Adım sayısının 2 katı' },
      { left: '3, 5, 7, 9, …', right: 'Adım sayısının 2 katının 1 fazlası' },
      { left: '4, 7, 10, 13, …', right: 'Adım sayısının 3 katının 1 fazlası' },
      { left: '1, 4, 7, 10, …', right: 'Adım sayısının 3 katının 2 eksiği' },
      { left: '5, 10, 15, 20, …', right: 'Adım sayısının 5 katı' },
      { left: '9, 14, 19, 24, …', right: 'Adım sayısının 5 katının 4 fazlası' },
      { left: '6, 10, 14, 18, …', right: 'Adım sayısının 4 katının 2 fazlası' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-oruntuyu-devam-ettir',
    outcomes: ['MAT.5.2.3'],
    type: 'fill',
    title: 'Örüntüyü devam ettir',
    instructions: 'Sabit artış miktarını bul ve sıradaki terimi yaz.',
    level: 1,
    generator: { id: 'numberPattern', params: { stepMin: 3, stepMax: 15, max: 60 }, count: 6 },
  },
  {
    id: 'g5-akis-semasi-sekilleri',
    outcomes: ['MAT.5.2.4'],
    type: 'match',
    title: 'Akış şeması şekilleri',
    instructions: 'Akış şemasındaki her şekli anlamıyla eşleştir.',
    level: 1,
    pairs: [
      { left: { visual: SEKIL_OVAL }, right: 'Başlangıç ya da bitiş' },
      { left: { visual: SEKIL_PARALEL }, right: 'Veri girişi ya da sonucu yazdırma' },
      { left: { visual: SEKIL_DIKDORTGEN }, right: 'İşlem (hesaplama)' },
      { left: { visual: SEKIL_KARAR }, right: 'Karar (evet / hayır)' },
      { left: { visual: SEKIL_OK }, right: 'Akış yönü' },
    ],
    perRound: 5,
  },
  {
    id: 'g5-algoritmayi-sirala',
    outcomes: ['MAT.5.2.4'],
    type: 'sort',
    title: 'Algoritmayı sırala',
    instructions: 'Algoritmanın adımlarını doğru sıraya koy.',
    level: 2,
    rounds: [
      { prompt: 'Bir sayının 3 katının 5 fazlasını bulan algoritmayı sırala.', items: ['Başla', 'Sayıyı gir', 'Sayıyı 3 ile çarp', 'Sonuca 5 ekle', 'Sonucu yazdır', 'Bitir'] },
      { prompt: '700 gramlık paketin fiyatından 1 kilogramın fiyatını bulan algoritmayı sırala.', items: ['Başla', '700 g’lık paketin fiyatını gir', 'Fiyatı 7’ye bölerek 100 g’ın fiyatını hesapla', 'Bulunan sayıyı 10 ile çarp', '1 kg’ın fiyatını yazdır', 'Bitir'] },
      { prompt: '367 + 485 işlemini alt alta toplama algoritmasını sırala.', items: ['Birler: 7 + 5 = 12', '2’yi yaz, 1’i onlar basamağına aktar', 'Onlar: 6 + 8 + 1 = 15', '5’i yaz, 1’i yüzler basamağına aktar', 'Yüzler: 3 + 4 + 1 = 8', 'Sonuç: 852'] },
    ],
  },
  {
    id: 'g5-akis-semasi-oku',
    outcomes: ['MAT.5.2.4'],
    type: 'quiz',
    title: 'Akış şemasını oku',
    instructions: 'Akış şemasını ve algoritmayı adım adım takip et.',
    level: 2,
    questions: [
      { prompt: { text: 'Bu akış şemasına 12 girilirse ne yazdırılır?', visual: AKIS_1 }, choices: ['40', '48', '4', '56'], answer: 0, explain: '12 × 4 = 48, 48 − 8 = 40' },
      { prompt: { text: 'Bu akış şeması 32 yazdırdıysa girilen sayı kaçtır?', visual: AKIS_1 }, choices: ['6', '10', '8', '160'], answer: 1, explain: 'Geriye doğru düşün: 32 + 8 = 40, 40 ÷ 4 = 10' },
      { prompt: 'Akış şemasında karar adımı hangi şekille gösterilir?', choices: [{ visual: { kind: 'shape', shape: 'rhombus', color: '#22c55e' } }, { visual: { kind: 'shape', shape: 'oval', color: '#eab308' } }, { visual: { kind: 'shape', shape: 'rectangle', color: '#a855f7' } }, { visual: { kind: 'shape', shape: 'parallelogram', color: '#3b82f6' } }], answer: 0 },
      { prompt: { text: 'Bir mağazada aynı üründen 2 tane alana 50 TL indirim yapılıyor. Ürünün fiyatı 175 TL girilirse ne yazdırılır?', visual: AKIS_2 }, choices: ['350', '300', '125', '400'], answer: 1, explain: '175 × 2 = 350, 350 − 50 = 300' },
      { prompt: 'Algoritma: 1) 17’den 5 çıkar ve sayacı 1 artır. 2) Kalan 5’ten küçük olana kadar 1. adımı tekrarla. 3) Sayacı ve kalanı yazdır. Ne yazdırılır?', choices: ['Sayaç: 3, kalan: 2', 'Sayaç: 2, kalan: 7', 'Sayaç: 4, kalan: 0', 'Sayaç: 3, kalan: 5'], answer: 0, explain: '17 → 12 → 7 → 2. Üç kez çıkarıldı, 2 kaldı.' },
      { prompt: 'Bir önceki sorudaki tekrarlı çıkarma algoritması hangi işlemi yapar?', choices: ['Toplama', 'Çarpma', 'Bölme', 'Üslü ifade'], answer: 2, explain: '17 ÷ 5 işleminde bölüm 3, kalan 2’dir.' },
      { prompt: '“Algoritma” sözcüğü hangi bilim insanının adından gelir?', choices: ['Öklid', 'Pisagor', 'Harizmi', 'Ali Kuşçu'], answer: 2 },
    ],
  },
  {
    id: 'g5-algoritma-tablosu',
    outcomes: ['MAT.5.2.4'],
    type: 'fill',
    title: 'Algoritmayı tabloya dönüştür',
    instructions: 'Algoritmanın adımlarını uygula; girdi ve çıktılar arasındaki ilişkiyi bul.',
    level: 2,
    items: [
      { text: 'Algoritma: Sayıyı gir → 2 ile çarp → 3 ekle → yazdır. Girilen sayı 6 ise yazdırılan sayı __ olur.', answers: ['15'] },
      { text: 'Tablodaki algoritmada girdi 4 iken çıktı __ olur.', answers: ['14'], visual: { kind: 'table', headers: ['Girdi', 'Çıktı'], rows: [[1, 5], [2, 8], [3, 11], [4, '?']] } },
      { text: 'Bu tablodaki algoritma girdiyi __ ile çarpıp __ ekler.', answers: ['3', '2'], visual: { kind: 'table', headers: ['Girdi', 'Çıktı'], rows: [[1, 5], [2, 8], [3, 11], [4, '?']] } },
      { text: 'Algoritma: Sayıyı gir → 5’e böl → 7 ekle → yazdır. Yazdırılan sayı 15 ise girilen sayı __ dir.', answers: ['40'], hint: 'Geriye doğru çalış: önce 7 çıkar, sonra 5 ile çarp.' },
      { text: '700 g’lık paket 420 TL ise algoritma 420 ÷ 7 × 10 işlemiyle 1 kg’ın fiyatını __ TL bulur.', answers: ['600'] },
      { text: 'Sayı 5’ten başlıyor. “Sayı 20’den küçükse 4 ekle ve yeniden kontrol et; değilse sayıyı yazdır.” Yazdırılan sayı __ olur.', answers: ['21'], hint: '5, 9, 13, 17, …' },
    ],
  },

  // ── Veriden Olasılığa ──────────────────────────────────────────────────
  {
    id: 'g5-olasilik-spektrumu',
    outcomes: ['MAT.5.6.1'],
    type: 'quiz',
    title: 'Olasılık spektrumu',
    instructions: 'Olayın olasılığını spektrum üzerinde nereye yerleştirirsin?',
    level: 1,
    fixedOrder: true,
    questions: [
      { prompt: 'Bir zar atıldığında 7 gelmesi', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 0, explain: 'Zarda 7 yoktur.' },
      { prompt: 'Yazı-tura atıldığında tura gelmesi', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 2 },
      { prompt: 'Yarın sabah Güneş’in doğması', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 4 },
      { prompt: '9 kırmızı ve 1 mavi top bulunan torbadan kırmızı top çekilmesi', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 3 },
      { prompt: '9 kırmızı ve 1 mavi top bulunan torbadan mavi top çekilmesi', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 1 },
      { prompt: 'Bir zar atıldığında çift sayı gelmesi', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 2, explain: '6 sonuçtan 3’ü çifttir: 2, 4, 6.' },
      { prompt: 'Bir haftanın 8 gün sürmesi', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 0 },
      { prompt: 'Temmuz ayında Antalya’da havanın sıcak olması', choices: ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)'], answer: 3 },
    ],
  },
  {
    id: 'g5-olasilik-degeri-olabilir-mi',
    outcomes: ['MAT.5.6.1'],
    type: 'categorize',
    title: 'Olasılık değeri olabilir mi?',
    instructions: 'Bir olayın olasılığı 0 ile 1 arasındadır (0 ve 1 dâhil). Her sayıyı doğru gruba sürükle.',
    level: 2,
    categories: [
      { id: 'olur', label: 'Olasılık değeri olabilir', color: '#22c55e' },
      { id: 'olmaz', label: 'Olasılık değeri olamaz', color: '#ef4444' },
    ],
    items: [
      { content: '0', category: 'olur' },
      { content: '1', category: 'olur' },
      { content: '[[1/2]]', category: 'olur' },
      { content: '0,75', category: 'olur' },
      { content: '%30', category: 'olur' },
      { content: '%100', category: 'olur' },
      { content: '1,5', category: 'olmaz' },
      { content: '%120', category: 'olmaz' },
      { content: '[[5/4]]', category: 'olmaz' },
      { content: '2', category: 'olmaz' },
    ],
  },
  {
    id: 'g5-spektrumda-isaretle',
    outcomes: ['MAT.5.6.1'],
    type: 'manipulative',
    title: 'Olasılığı işaretle',
    instructions: 'Sayı doğrusu 0 (imkânsız) ile 1 (kesin) arasındadır. Olayın olasılığını işaretle.',
    level: 2,
    tool: 'numberline',
    config: { min: 0, max: 1, step: 0.1 },
    tasks: [
      { prompt: 'İmkânsız bir olayın olasılığını işaretle.', target: { value: 0 } },
      { prompt: 'Yazı-tura atıldığında yazı gelme olasılığını işaretle.', target: { value: 0.5 } },
      { prompt: 'Yağış olasılığı %30 olarak açıklandı. Bu olasılığı işaretle.', target: { value: 0.3 } },
      { prompt: '10 eş parçalı bir çarkın 9 parçası kırmızıdır. Kırmızı gelme olasılığını işaretle.', target: { value: 0.9 } },
    ],
  },
  {
    id: 'g5-olasilik-gosterimleri',
    outcomes: ['MAT.5.6.1'],
    type: 'match',
    title: 'Olasılığın farklı gösterimleri',
    instructions: 'Her olasılığı kesir, ondalık ya da yüzde gösterimiyle eşleştir.',
    level: 2,
    pairs: [
      { left: 'İmkânsız', right: '0 = %0' },
      { left: 'Eşit olası', right: '[[1/2]] = 0,5 = %50' },
      { left: 'Kesin', right: '1 = %100' },
      { left: '%25', right: '[[1/4]] = 0,25' },
      { left: '%75', right: '[[3/4]] = 0,75' },
      { left: '%10', right: '[[1/10]] = 0,1' },
    ],
    perRound: 3,
  },
  {
    id: 'g5-az-mi-cok-mu-olasi',
    outcomes: ['MAT.5.6.2'],
    type: 'categorize',
    title: 'Az olası mı, çok olası mı?',
    instructions: 'Olayları olasılıklarına göre “Az olası” ya da “Çok olası” grubuna sürükle.',
    level: 1,
    categories: [
      { id: 'az', label: 'Az olası', color: '#3b82f6' },
      { id: 'cok', label: 'Çok olası', color: '#f97316' },
    ],
    items: [
      { content: '3 kırmızı, 1 mavi top bulunan torbadan kırmızı top çekmek', category: 'cok' },
      { content: '3 kırmızı, 1 mavi top bulunan torbadan mavi top çekmek', category: 'az' },
      { content: 'Ocak ayında Erzurum’a kar yağması', category: 'cok' },
      { content: 'Temmuz ayında Antalya’ya kar yağması', category: 'az' },
      { content: 'Zar atıldığında 6 gelmesi', category: 'az' },
      { content: 'Zar atıldığında 6’dan küçük bir sayı gelmesi', category: 'cok' },
      { content: 'Yağış olasılığı %90 denilen günde yağmur yağması', category: 'cok' },
      { content: 'Yağış olasılığı %20 denilen günde yağmur yağması', category: 'az' },
      { content: 'Sekiz eş parçasının yedisi kırmızı olan çarkta kırmızı gelmesi', category: 'cok' },
      { content: '30 kişilik sınıfta kurayla seçilen öğrencinin sen olman', category: 'az' },
    ],
  },
  {
    id: 'g5-torba-deneyi',
    outcomes: ['MAT.5.6.2'],
    type: 'manipulative',
    title: 'Torbadan top çek',
    instructions: 'Torbada 3 kırmızı ve 1 mavi top var. Birkaç kez top çek, sonuçları incele ve soruyu cevapla.',
    level: 1,
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Kırmızı', color: '#ef4444', weight: 3 }, { label: 'Mavi', color: '#3b82f6', weight: 1 }] },
    tasks: [
      { prompt: 'Torbadan 10 kez top çek. Kırmızı top çekme olasılığı nasıldır?', target: { question: 'Kırmızı top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'Çok olası' } },
      { prompt: 'Sonuçlara yeniden bak. Mavi top çekme olasılığı nasıldır?', target: { question: 'Mavi top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'Az olası' } },
      { prompt: 'Torbada yeşil top yok. Yeşil top çekme olasılığı nasıldır?', target: { question: 'Yeşil top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'İmkânsız' } },
      { prompt: 'Çekilen topun kırmızı ya da mavi olma olasılığı nasıldır?', target: { question: 'Kırmızı ya da mavi top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'Kesin' } },
    ],
  },
  {
    id: 'g5-cark-deneyi',
    outcomes: ['MAT.5.6.1', 'MAT.5.6.2'],
    type: 'manipulative',
    title: 'Çarkı çevir',
    instructions: 'Çarkın yarısı mor, dörtte biri sarı, dörtte biri yeşil. Çarkı birkaç kez çevir ve soruyu cevapla.',
    level: 2,
    tool: 'probability',
    config: { mode: 'spinner', sectors: [{ label: 'Mor', color: '#a855f7', weight: 2 }, { label: 'Sarı', color: '#eab308', weight: 1 }, { label: 'Yeşil', color: '#22c55e', weight: 1 }] },
    tasks: [
      { prompt: 'Çarkı 10 kez çevir. Mor gelme olasılığı nasıldır?', target: { question: 'Mor gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'Eşit olası (%50)' } },
      { prompt: 'Sarı gelme olasılığı nasıldır?', target: { question: 'Sarı gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'Az olası' } },
      { prompt: 'Çarkta turuncu bölge yok. Turuncu gelme olasılığı nasıldır?', target: { question: 'Turuncu gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'İmkânsız (%0)' } },
      { prompt: 'Mor ya da sarı gelme olasılığı nasıldır?', target: { question: 'Mor ya da sarı gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'Çok olası' } },
    ],
  },
  {
    id: 'g5-hangisi-daha-olasi',
    outcomes: ['MAT.5.6.2'],
    type: 'quiz',
    title: 'Hangisi daha olası?',
    instructions: 'Olayların olasılıklarını karşılaştır, gerekçeni düşün.',
    level: 2,
    questions: [
      { prompt: 'A torbasında 3 kırmızı ve 1 mavi, B torbasında 1 kırmızı ve 3 mavi top var. Hangi torbadan kırmızı top çekmek daha olasıdır?', choices: ['A torbasından', 'B torbasından', 'İkisi de eşit olası'], answer: 0 },
      { prompt: 'Bir zar atıldığında hangisi daha olasıdır?', choices: ['1 gelmesi', '6’dan küçük bir sayı gelmesi', '7 gelmesi'], answer: 1, explain: '6’dan küçük 5 sonuç vardır (1, 2, 3, 4, 5); 1 gelmesi ise tek bir sonuçtur.' },
      { prompt: 'Yağış olasılığı %80 olan bir gün için hangisi doğrudur?', choices: ['Yağmur yağması kesindir.', 'Yağmur yağması çok olasıdır.', 'Yağmur yağması az olasıdır.', 'Yağmur yağması imkânsızdır.'], answer: 1 },
      { prompt: 'Ece: “Kırmızı benim şanslı rengim. 1 kırmızı ve 5 mavi top olan torbadan kırmızı çekeceğim.” Ece’nin düşüncesi için ne söylenebilir?', choices: ['Doğrudur; şanslı renk olasılığı artırır.', 'Kırmızı çekmek kesindir.', 'Yanlıştır; mavi toplar daha fazla olduğundan kırmızı çekmek az olasıdır.', 'Kırmızı çekmek imkânsızdır.'], answer: 2 },
      { prompt: 'Bir oyunda zar atılıyor. 1 ya da 2 gelirse Ali, 3, 4, 5 ya da 6 gelirse Ayşe kazanıyor. Oyun adil midir?', choices: ['Evet, adildir.', 'Hayır, Ali’nin kazanması daha olasıdır.', 'Hayır, Ayşe’nin kazanması daha olasıdır.'], answer: 2, explain: 'Ayşe’nin 4, Ali’nin 2 kazanma durumu var.' },
      { prompt: '15 kız ve 10 erkek öğrenci arasından kurayla bir öğrenci seçilecek. Seçilenin kız olması için ne söylenebilir?', choices: ['Erkek olmasından daha olasıdır.', 'Erkek olmasından daha az olasıdır.', 'Erkek olmasıyla eşit olasıdır.', 'İmkânsızdır.'], answer: 0 },
      { prompt: 'Hangi olayın olasılığı daha azdır?', choices: ['Ocak ayında Erzurum’a kar yağması', 'Ağustos ayında Erzurum’a kar yağması', 'İlkbaharda İstanbul’a yağmur yağması'], answer: 1 },
    ],
  },
]
