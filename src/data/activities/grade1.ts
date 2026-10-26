import type { Activity, ThemeNotes, Visual } from '../types'

/**
 * 1. SINIF ETKİNLİKLERİ — Van de Walle yaklaşımı
 * Her öğrenme çıktısı: somut → model → sembol → problem
 * Her etkinlik: Başlarken (launch) → Keşfet → Düşün ve Paylaş (reflect)
 */

// ── Yardımcı çizimler ─────────────────────────────────────────────────────
const INK = 'stroke="#1f2340" stroke-width="3" stroke-linejoin="round"'
const svg = (body: string, vb = '0 0 120 120') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
const pic = (body: string, vb?: string): Visual => ({ kind: 'svg', svg: svg(body, vb) })
const em = (x: number, y: number, e: string, size = 24) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}">${e}</text>`
const r1 = (n: number) => Math.round(n * 10) / 10

/** Geometrik şekil (boyut ve dönme ile) */
type Sekil = 'ucgen' | 'kare' | 'dikdortgen' | 'cember' | 'inceUcgen'
const SEKIL: Record<Sekil, string> = {
  ucgen: '<polygon points="60,14 108,98 12,98"',
  kare: '<rect x="22" y="22" width="76" height="76"',
  dikdortgen: '<rect x="8" y="34" width="104" height="52"',
  cember: '<circle cx="60" cy="60" r="46"',
  inceUcgen: '<polygon points="6,92 114,92 98,56"',
}
type S = [Sekil, string, number?, number?]
const sekilBody = ([s, fill, scale = 1, rot = 0]: S, cx = 60) =>
  `<g transform="translate(${cx} 60) rotate(${rot}) scale(${scale}) translate(-60 -60)">${SEKIL[s]} fill="${fill}" stroke="#1f2340" stroke-width="${r1(3 / scale)}" stroke-linejoin="round"/></g>`
const sekil = (s: Sekil, fill: string, scale = 1, rot = 0): Visual => pic(sekilBody([s, fill, scale, rot]))
/** İki şekil yan yana (eşlik karşılaştırması) */
const cift = (a: S, b: S): Visual => pic(sekilBody(a, 60) + sekilBody(b, 180), '0 0 240 120')

/** Terazi / tahterevalli. tilt: -1 sol ağır, 1 sağ ağır, 0 denge */
function terazi(left: string, right: string, tilt: -1 | 0 | 1 = 0): Visual {
  const t = (tilt * 12 * Math.PI) / 180
  const dx = 70 * Math.cos(t), dy = 70 * Math.sin(t)
  const pan = (x: number, y: number, label: string) =>
    `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x - 24)}" y2="${r1(y + 34)}" stroke="#1f2340" stroke-width="2"/>` +
    `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x + 24)}" y2="${r1(y + 34)}" stroke="#1f2340" stroke-width="2"/>` +
    `<path d="M${r1(x - 32)} ${r1(y + 34)} h64 l-8 10 h-48 z" fill="#94a3b8" ${INK}/>` +
    em(r1(x), r1(y + 30), label, 20)
  return pic(
    `<polygon points="100,46 84,124 116,124" fill="#cbd5e1" ${INK}/>` +
      `<line x1="${r1(100 - dx)}" y1="${r1(46 - dy)}" x2="${r1(100 + dx)}" y2="${r1(46 + dy)}" stroke="#1f2340" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="100" cy="46" r="5" fill="#1f2340"/>` +
      pan(100 - dx, 46 - dy, left) +
      pan(100 + dx, 46 + dy, right),
    '0 0 200 130',
  )
}

/** Kalemi ataşla ölçme. hata: bosluk (aralıklı), ust (üst üste), kayik (baştan başlamıyor) */
function olcum(n: number, k: number, hata?: 'bosluk' | 'ust' | 'kayik'): Visual {
  const U = 26, x0 = 12, L = n * U
  let b = `<line x1="${x0}" y1="4" x2="${x0}" y2="62" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 3"/>`
  b += `<rect x="${x0}" y="10" width="${L - 16}" height="18" rx="3" fill="#facc15" ${INK}/><polygon points="${x0 + L - 16},10 ${x0 + L},19 ${x0 + L - 16},28" fill="#fde68a" ${INK}/>`
  const step = hata === 'bosluk' ? U + 9 : hata === 'ust' ? U - 9 : U
  const start = hata === 'kayik' ? x0 + 14 : x0
  for (let i = 0; i < k; i++) {
    const x = start + i * step, y = hata === 'ust' && i % 2 ? 48 : 40
    b += `<rect x="${x + 1}" y="${y}" width="${U - 2}" height="12" rx="6" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/><rect x="${x + 6}" y="${y + 4}" width="${U - 12}" height="4" rx="2" fill="none" stroke="#1d4ed8" stroke-width="1.5"/>`
  }
  const W = Math.max(x0 + L, start + (k - 1) * step + U) + 12
  return pic(b, `0 0 ${W} 66`)
}

/** Aynı kalem: üstte 6 ataş, altta 3 silgi */
const ATAS_SILGI = (() => {
  const U = 26, x0 = 12
  let b = `<rect x="${x0}" y="8" width="${6 * U - 16}" height="18" rx="3" fill="#facc15" ${INK}/><polygon points="${x0 + 6 * U - 16},8 ${x0 + 6 * U},17 ${x0 + 6 * U - 16},26" fill="#fde68a" ${INK}/>`
  for (let i = 0; i < 6; i++) b += `<rect x="${x0 + i * U + 1}" y="36" width="${U - 2}" height="12" rx="6" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>`
  for (let i = 0; i < 3; i++) b += `<rect x="${x0 + i * 2 * U + 1}" y="56" width="${2 * U - 2}" height="18" rx="4" fill="#fbcfe8" stroke="#be185d" stroke-width="2"/>`
  b += em(x0 + 6 * U + 22, 47, '📎', 14) + em(x0 + 6 * U + 22, 70, '🧽', 14)
  return pic(b, `0 0 ${x0 + 6 * U + 36} 80`)
})()

/** İki şerit (kurdele) karşılaştırma: [başlangıç x, uzunluk, renk] */
const ikiSerit = (a: [number, number, string], b: [number, number, string]): Visual =>
  pic(`<rect x="${a[0]}" y="14" width="${a[1]}" height="18" rx="4" fill="${a[2]}" ${INK}/><rect x="${b[0]}" y="50" width="${b[1]}" height="18" rx="4" fill="${b[2]}" ${INK}/>`, '0 0 180 80')

/** Çetele çizgileri (5’li gruplar) */
function tally(x0: number, y: number, n: number): [string, number] {
  let b = '', x = x0
  for (let g = 0; g < Math.ceil(n / 5); g++) {
    const k = Math.min(5, n - g * 5)
    for (let i = 0; i < Math.min(k, 4); i++) b += `<line x1="${x + i * 9}" y1="${y}" x2="${x + i * 9}" y2="${y + 34}" stroke="#1f2340" stroke-width="3.5" stroke-linecap="round"/>`
    if (k === 5) b += `<line x1="${x - 5}" y1="${y + 29}" x2="${x + 32}" y2="${y + 5}" stroke="#e11d48" stroke-width="3.5" stroke-linecap="round"/>`
    x += 48
  }
  return [b, x]
}
function cetele(n: number): Visual {
  const [b, x] = tally(10, 8, n)
  return pic(b, `0 0 ${x - 4} 50`)
}
function cetelePano(rows: [string, number][]): Visual {
  let b = '', w = 0
  rows.forEach(([e, n], r) => {
    const y = 8 + r * 46
    b += em(18, y + 28, e, 24)
    const [t, x] = tally(46, y, n)
    b += t
    w = Math.max(w, x)
  })
  return pic(b, `0 0 ${w} ${rows.length * 46 + 8}`)
}

/** Kareli harita: [sütun, satır, emoji] */
function harita(cols: number, rows: number, items: [number, number, string][]): Visual {
  const c = 32
  let b = ''
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) b += `<rect x="${x * c + 2}" y="${y * c + 2}" width="${c}" height="${c}" fill="${(x + y) % 2 ? '#f0fdf4' : '#dcfce7'}" stroke="#94a3b8" stroke-width="1"/>`
  for (const [x, y, e] of items) b += em(x * c + 2 + c / 2, y * c + 2 + c / 2 + 8, e, 22)
  return pic(b, `0 0 ${cols * c + 4} ${rows * c + 4}`)
}

/** İki sıra nesne (bire bir eşleme, korunum) */
function sira(a: string, na: number, ga: number, b: string, nb: number, gb: number): Visual {
  const row = (e: string, n: number, g: number, y: number) => Array.from({ length: n }, (_, i) => em(18 + i * g, y, e, 22)).join('')
  const W = Math.max(18 + (na - 1) * ga, 18 + (nb - 1) * gb) + 22
  return pic(row(a, na, ga, 34) + row(b, nb, gb, 76), `0 0 ${W} 90`)
}

/** Referans küme (üstte sıralı, sayısı belli) ve tahmin edilecek dağınık küme */
const DAGINIK = [7, 0, 13, 4, 18, 10, 2, 15, 8, 19, 5, 12, 1, 17, 9, 3, 14, 6, 16, 11]
function referans(e: string, n1: number, n2: number): Visual {
  let b = `<rect x="4" y="4" width="232" height="44" rx="10" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>`
  for (let i = 0; i < n1; i++) b += em(24 + i * 20, 34, e, 18)
  b += `<text x="252" y="33" text-anchor="middle" font-size="18" font-weight="900" fill="#1f2340">${n1}</text>`
  b += `<rect x="4" y="58" width="232" height="104" rx="10" fill="#fff" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 4"/>`
  for (let i = 0; i < n2; i++) {
    const cell = DAGINIK[i], col = cell % 5, row = Math.floor(cell / 5)
    b += em(30 + col * 44 + ((cell * 7) % 9) - 4, 84 + row * 22 + ((cell * 5) % 7) - 3, e, 18)
  }
  b += `<text x="252" y="116" text-anchor="middle" font-size="20" font-weight="900" fill="#e11d48">?</text>`
  return pic(b, '0 0 266 166')
}

// Sahneler (konum)
const ZEMIN = '<line x1="0" y1="102" x2="160" y2="102" stroke="#94a3b8" stroke-width="3"/>'
const KEDI_MASA = pic(`<rect x="20" y="40" width="120" height="10" rx="2" fill="#a16207" ${INK}/><rect x="28" y="50" width="8" height="52" fill="#a16207" ${INK}/><rect x="124" y="50" width="8" height="52" fill="#a16207" ${INK}/>${ZEMIN}${em(80, 96, '🐱', 34)}`, '0 0 160 110')
const KUS_AGAC = pic(`${ZEMIN}${em(80, 100, '🌳', 62)}${em(80, 26, '🐦', 26)}`, '0 0 160 110')
const KUTU_TOP = pic(`${ZEMIN}<rect x="16" y="46" width="76" height="56" fill="#fef3c7" ${INK}/>${em(54, 88, '⚽', 28)}${em(128, 98, '🏀', 28)}`, '0 0 160 110')
const YUKSEK_ALCAK = pic(`<line x1="0" y1="102" x2="160" y2="102" stroke="#16a34a" stroke-width="4"/>${em(46, 38, '🎈', 30)}${em(118, 98, '🐢', 28)}`, '0 0 160 110')
const CUKUR_TUMSEK = pic(`<path d="M0 70 H25 Q45 32 65 70 H95 Q115 108 135 70 H160 V110 H0 Z" fill="#d6b88a" ${INK}/>${em(115, 87, '⚽', 18)}`, '0 0 160 110')

// Yapılar
const EV = pic(
  `<circle cx="138" cy="24" r="14" fill="#facc15" ${INK}/><polygon points="20,60 70,15 120,60" fill="#f97316" ${INK}/>` +
    `<rect x="30" y="60" width="80" height="80" fill="#93c5fd" ${INK}/><rect x="38" y="72" width="18" height="18" fill="#fef9c3" ${INK}/>` +
    `<rect x="84" y="72" width="18" height="18" fill="#fef9c3" ${INK}/><rect x="60" y="100" width="20" height="40" fill="#a16207" ${INK}/>`,
  '0 0 160 145',
)
const EV2 = pic(
  `<polygon points="20,60 70,15 120,60" fill="#f97316" ${INK}/><rect x="30" y="60" width="80" height="80" fill="#93c5fd" ${INK}/>` +
    `<rect x="38" y="72" width="18" height="18" fill="#fef9c3" ${INK}/><rect x="84" y="72" width="18" height="18" fill="#fef9c3" ${INK}/>` +
    `<rect x="60" y="100" width="20" height="40" fill="#a16207" ${INK}/>`,
  '0 0 140 145',
)
const TREN = pic(
  `<rect x="10" y="38" width="62" height="42" fill="#ef4444" ${INK}/><rect x="20" y="16" width="14" height="22" fill="#475569" ${INK}/>` +
    `<rect x="80" y="44" width="62" height="36" fill="#3b82f6" ${INK}/>` +
    [26, 56, 96, 126].map((x) => `<circle cx="${x}" cy="88" r="9" fill="#facc15" ${INK}/>`).join(''),
  '0 0 152 100',
)
const ROKET = pic(
  `<polygon points="40,50 60,10 80,50" fill="#ef4444" ${INK}/><rect x="40" y="50" width="40" height="70" fill="#e2e8f0" ${INK}/>` +
    `<circle cx="60" cy="72" r="9" fill="#38bdf8" ${INK}/><circle cx="60" cy="100" r="9" fill="#38bdf8" ${INK}/>` +
    `<polygon points="40,90 20,124 40,120" fill="#f97316" ${INK}/><polygon points="80,90 100,124 80,120" fill="#f97316" ${INK}/>`,
  '0 0 120 130',
)
const DIK_UCGEN = pic(`<polygon points="20,20 20,100 100,100" fill="#a855f7" ${INK}/>`)

const MEYVE_GRAFIK: Visual = {
  kind: 'pictograph',
  data: [{ label: '🍎 Elma', value: 5 }, { label: '🍌 Muz', value: 3 }, { label: '🍓 Çilek', value: 7 }, { label: '🍇 Üzüm', value: 5 }],
  icon: '😊',
}

export const grade1: Activity[] = [
  // ── Nesnelerin Geometrisi (1) ───────────────────────────────────────────

  // MAT.1.3.1 Yön ve konum
  {
    id: 'g1-kurbaga-adimlari',
    outcomes: ['MAT.1.3.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kurbağa taşları: ileri ve geri',
    instructions: 'Yönergeyi oku, kurbağanın varacağı taşa dokun.',
    launch: { text: 'Kurbağa Vak dere üstündeki taşlarda zıplıyor 🐸. Ona “3 adım ileri git” dersek nereye varır? “Geri” dersek?', visual: { kind: 'numberline', min: 0, max: 10, step: 1, points: [2] } },
    reflect: 'Hedefe ulaşmak için sadece “ileri” demek yeter mi? Yönün yanında başka neyi söylemeliyiz?',
    tool: 'numberline',
    config: { min: 0, max: 10, step: 1 },
    tasks: [
      { prompt: 'Kurbağa 0’da. 4 adım ileri zıplasın. Nereye varır?', target: { value: 4 }, hints: ['0’dan başla, her zıplayışta bir taş say.', 'Bir, iki, üç, dört… Hangi taştasın?'] },
      { prompt: 'Kurbağa 2’de. 5 adım ileri zıplasın. Nereye varır?', target: { value: 7 }, hints: ['İleri gidince sayılar büyür mü, küçülür mü?'] },
      { prompt: 'Kurbağa 9’da. 3 adım geri zıplasın. Nereye varır?', target: { value: 6 }, hints: ['Geri gidince sayılar küçülür. 9’dan geriye üç taş say.'] },
      { prompt: 'Kurbağa 3’te. Önce 5 adım ileri, sonra 2 adım geri zıplasın.', target: { value: 6 }, hints: ['Önce ileri git: 3’ten 5 adım ileride hangi taş var?', 'Şimdi oradan 2 adım geri dön.'], explain: 'Başlangıç noktası, yön ve adım sayısı birlikte hedefi belirler: 3 → 8 → 6.' },
    ],
  },
  {
    id: 'g1-yon-ve-konum',
    outcomes: ['MAT.1.3.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Nerede? Konumunu söyle',
    instructions: 'Resme bak. Nesnenin nerede olduğunu seç.',
    launch: { text: 'Annen “Top masanın altında” dedi. Topu bulmak için nereye bakarsın? Konum sözcükleri bir şeyin yerini başka bir şeye göre söyler.' },
    reflect: 'Sınıftaki bir eşyanın yerini, adını söylemeden bir arkadaşına nasıl tarif edersin?',
    questions: [
      { prompt: { text: 'Kedi nerede?', visual: KEDI_MASA }, choices: ['Masanın altında', 'Masanın üstünde', 'Masanın içinde'], answer: 0, feedback: [null, 'Masanın üstü, tablanın yukarısıdır. Kedi tablanın aşağısında duruyor.', '“İçinde” kutu ya da oda gibi yerler için kullanılır. Masanın içi yoktur.'] },
      { prompt: { text: 'Kuş ağaca göre nerede?', visual: KUS_AGAC }, choices: ['Ağacın üstünde', 'Ağacın altında', 'Ağacın arkasında'], answer: 0, feedback: [null, 'Ağacın altı, gövdesinin yere yakın tarafıdır. Kuş tepenin de yukarısında.', 'Arkasında olsaydı ağaç kuşu kapatırdı. Kuşu açıkça görüyoruz.'] },
      { prompt: { text: 'Kedinin SAĞINDA kim var? (Senin sağ elinin olduğu taraf)', visual: { kind: 'pattern', items: ['🐶', '🐱', '🐰'] } }, choices: ['🐰 Tavşan', '🐶 Köpek', '🐱 Kedi'], answer: 0, feedback: [null, 'Sağ ile sol karışmış olabilir. Sağ elini kaldır: kedinin o tarafında kim var?', 'Kedinin yanındakini soruyoruz, kendisini değil.'] },
      { prompt: { text: 'Ayıcık ile tavşanın ARASINDA kim var?', visual: { kind: 'pattern', items: ['🧸', '🐥', '🐰'] } }, choices: ['🐥 Civciv', '🧸 Ayıcık', '🐰 Tavşan'], answer: 0, feedback: [null, 'Ayıcık uçlardan biri. “Arasında” ikisinin ortasındaki demek.', 'Tavşan da uçlardan biri. Ortaya bak.'] },
      { prompt: { text: 'Hangi top kutunun DIŞINDA?', visual: KUTU_TOP }, choices: ['🏀', '⚽'], answer: 0, feedback: [null, '⚽ kutunun duvarlarının arasında, yani içinde.'] },
      { prompt: { text: 'Hangisi YÜKSEKTE?', visual: YUKSEK_ALCAK }, choices: ['🎈 Balon', '🐢 Kaplumbağa'], answer: 0, feedback: [null, 'Kaplumbağa yerde, yani alçakta. Balon yerden çok uzakta, yukarıda.'] },
      { prompt: { text: 'Top nerede?', visual: CUKUR_TUMSEK }, choices: ['Çukurda', 'Tümsekte'], answer: 0, feedback: [null, 'Tümsek yerden yukarı kabaran yerdir. Top yerin içine doğru inen yerde duruyor.'] },
    ],
  },
  {
    id: 'g1-ok-yonergeleri',
    outcomes: ['MAT.1.3.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Sözden oka',
    instructions: 'Her yönergeyi aynı yolu gösteren oklarla eşleştir.',
    launch: { text: 'Haritalarda yönergeler bazen sözle, bazen oklarla yazılır. “2 adım sağa” demek ile ➡️➡️ çizmek aynı şeyi mi söyler?' },
    reflect: 'Yönergeyi okla yazmanın sözle yazmaya göre kolay ve zor yanı ne? Neden?',
    pairs: [
      { left: '3 adım sağa', right: '➡️➡️➡️' },
      { left: '2 adım sola', right: '⬅️⬅️' },
      { left: '1 adım yukarı', right: '⬆️' },
      { left: '2 adım aşağı', right: '⬇️⬇️' },
      { left: '1 adım sağa, 2 adım yukarı', right: '➡️⬆️⬆️' },
      { left: '2 adım sağa, 1 adım aşağı', right: '➡️➡️⬇️' },
      { left: '1 adım sola, 1 adım yukarı', right: '⬅️⬆️' },
      { left: '4 adım sağa', right: '➡️➡️➡️➡️' },
    ],
    perRound: 4,
  },
  {
    id: 'g1-hedefe-ulas',
    outcomes: ['MAT.1.3.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hedefe giden yol',
    instructions: 'Haritaya bak. Başlangıç ile hedef arasındaki yolu düşün.',
    launch: { text: 'Birine yol tarif ederken nereden başladığını, hangi yöne ve kaç adım gideceğini söylemen gerekir. Haritada deneyelim!', visual: harita(5, 4, [[0, 3, '🐰'], [3, 3, '🥕']]) },
    reflect: 'Hedefe giden birden çok yol olabilir mi? Sen hangisini seçerdin, neden?',
    questions: [
      { prompt: { text: 'Tavşan havuca gitmek istiyor. Hangi yolu izlemeli?', visual: harita(5, 4, [[0, 3, '🐰'], [3, 3, '🥕']]) }, choices: ['➡️➡️➡️', '➡️➡️➡️➡️', '⬅️⬅️⬅️', '⬆️⬆️⬆️'], answer: 0, feedback: [null, 'Başladığın kareyi de saymış olabilirsin. Adımları bir sonraki kareye geçişlerle say.', 'Sola gidersen havuçtan uzaklaşırsın. Havuç tavşanın sağında.', 'Yukarı gidersen başka sıraya geçersin. Havuç aynı sırada, sağda.'] },
      { prompt: { text: 'Şimdi havuç başka yerde. Hangi yol tavşanı havuca götürür?', visual: harita(5, 4, [[0, 3, '🐰'], [2, 1, '🥕']]) }, choices: ['➡️➡️⬆️⬆️', '➡️⬆️', '⬅️⬅️⬆️⬆️', '➡️➡️➡️⬆️⬆️'], answer: 0, feedback: [null, 'Bu yol havuca kadar uzanmıyor. Kaç kare sağa, kaç kare yukarı gitmen gerek? Tekrar say.', 'Sola gidersen havuçtan uzaklaşırsın. Havuç tavşanın sağında.', 'Bir adım fazla sağa gittin; havucu geçtin.'] },
      { prompt: { text: '➡️➡️⬆️⬆️ ile ⬆️⬆️➡️➡️ aynı yere götürür mü?', visual: harita(5, 4, [[0, 3, '🐰'], [2, 1, '🥕']]) }, choices: ['Evet, ikisi de havuca götürür', 'Hayır, sıra değişince hedef değişir'], answer: 0, feedback: [null, 'İki yolda da 2 sağa ve 2 yukarı adım var. Sırası farklı olsa da aynı kareye varırsın. Haritada dene!'] },
      { prompt: { text: 'Ayı ⬇️⬇️➡️ yolunu izledi. Nereye vardı?', visual: harita(4, 3, [[1, 0, '🐻'], [1, 2, '🍎'], [2, 2, '🍯'], [3, 2, '🌸']]) }, choices: ['🍯', '🍎', '🌸'], answer: 0, feedback: [null, '🍎’ya sadece aşağı inince varırsın. Sonra bir de sağa adım var.', '🌸 için 2 adım sağa gitmesi gerekirdi.'] },
      { prompt: { text: 'Kuş yuvasına gidecek. Hangi yol EN KISA?', visual: harita(4, 4, [[0, 0, '🐦'], [2, 2, '🪺']]) }, choices: ['➡️➡️⬇️⬇️', '➡️➡️➡️⬇️⬇️⬅️', '⬇️⬇️⬇️➡️➡️⬆️'], answer: 0, feedback: [null, 'Bu yol da yuvaya varıyor ama 6 adım. Gereksiz bir sağa-sola gidip gelme var.', 'Bu yol da yuvaya varıyor ama 6 adım. Fazla aşağı inip geri çıkıyor.'] },
    ],
  },

  // MAT.1.3.2 Eş nesneler
  {
    id: 'g1-es-sekil-tahtasi',
    outcomes: ['MAT.1.3.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Eşini sen yap',
    instructions: 'Geometri tahtasında çivilere dokunarak istenen şeklin eşini yap.',
    launch: { text: 'Arkadaşın geometri tahtasında bir kare yaptı. Sen de onunkinin tıpatıp aynısını, yani eşini yapabilir misin? Nelere dikkat etmelisin?' },
    reflect: 'Senin şeklinle arkadaşınınki eş mi? Bunu nasıl kontrol edersin?',
    tool: 'geoboard',
    config: { size: 6 },
    tasks: [
      { prompt: 'Kenarları 2 aralık olan bir kare yap.', target: { sides: 4, square: true, area: 4 }, hints: ['Kenarın 2 aralık olması için kaç çivi ilerlersin?', 'Dört kenarın da aynı uzunlukta mı?'] },
      { prompt: 'Eni 3, boyu 1 aralık olan bir dikdörtgen yap.', target: { sides: 4, rect: true, area: 3 }, hints: ['Uzun kenar 3 aralık, kısa kenar 1 aralık olmalı.'], explain: 'Dikdörtgeni yan çevirsen de eş kalır: boyu da biçimi de değişmez.' },
      { prompt: 'Eni 2, boyu 3 aralık olan bir dikdörtgen yap.', target: { sides: 4, rect: true, area: 6 }, hints: ['Önce 2 aralıklık kenarı, sonra 3 aralıklık kenarı yap.'] },
    ],
  },
  {
    id: 'g1-es-nesneler',
    outcomes: ['MAT.1.3.2'],
    type: 'match',
    stage: 'model',
    title: 'Eşini bul',
    instructions: 'Her şekli rengi, boyu ve biçimi aynı olan eşiyle eşleştir.',
    launch: { text: 'Çorap çekmecen karışmış 🧦. Bir çorabın eşini ararken nelere bakarsın? Rengine mi, boyuna mı, desenine mi?' },
    reflect: 'Eşini bulurken önce neye baktın: rengine mi, boyuna mı, biçimine mi? Neden?',
    pairs: [
      { left: { visual: sekil('kare', '#3b82f6') }, right: { visual: sekil('kare', '#3b82f6') } },
      { left: { visual: sekil('kare', '#3b82f6', 0.55) }, right: { visual: sekil('kare', '#3b82f6', 0.55) } },
      { left: { visual: sekil('kare', '#ef4444') }, right: { visual: sekil('kare', '#ef4444') } },
      { left: { visual: sekil('dikdortgen', '#3b82f6') }, right: { visual: sekil('dikdortgen', '#3b82f6', 1, 90) } },
      { left: { visual: sekil('ucgen', '#f97316') }, right: { visual: sekil('ucgen', '#f97316') } },
      { left: { visual: sekil('ucgen', '#f97316', 0.55) }, right: { visual: sekil('ucgen', '#f97316', 0.55) } },
      { left: { visual: sekil('ucgen', '#22c55e') }, right: { visual: sekil('ucgen', '#22c55e') } },
      { left: { visual: sekil('cember', '#f97316') }, right: { visual: sekil('cember', '#f97316') } },
    ],
    perRound: 4,
  },
  {
    id: 'g1-es-mi',
    outcomes: ['MAT.1.3.2'],
    type: 'categorize',
    stage: 'model',
    title: 'Eş mi? Değilse neden?',
    instructions: 'İki şekli karşılaştır. Eşse “Eş” grubuna, değilse farklı olan özelliğin grubuna koy.',
    launch: { text: 'İki şeye “eş” diyebilmemiz için hangi özellikleri aynı olmalı? Bir ölçüt seç: renk, boy, biçim… Sonra kontrol et.' },
    reflect: '“Eş” ile “eşit” aynı şey mi? 5 elma ile 5 armut eşit sayıda, peki eş mi?',
    categories: [
      { id: 'es', label: 'Eş ✔', color: '#22c55e' },
      { id: 'renk', label: 'Rengi farklı', color: '#ef4444' },
      { id: 'boy', label: 'Boyu farklı', color: '#3b82f6' },
      { id: 'bicim', label: 'Biçimi farklı', color: '#a855f7' },
    ],
    items: [
      { content: { visual: cift(['kare', '#3b82f6'], ['kare', '#3b82f6']) }, category: 'es', explain: 'Rengi, boyu, biçimi aynı: eş.' },
      { content: { visual: cift(['cember', '#ef4444'], ['cember', '#ef4444']) }, category: 'es', explain: 'İki çember de aynı renk ve aynı büyüklükte: eş.' },
      { content: { visual: cift(['ucgen', '#22c55e'], ['ucgen', '#22c55e', 1, 180]) }, category: 'es', explain: 'Biri ters duruyor ama döndürünce tıpatıp aynı. Döndürmek eşliği bozmaz.' },
      { content: { visual: cift(['kare', '#3b82f6'], ['kare', '#ef4444']) }, category: 'renk', explain: 'Biçim ve boy aynı ama renkler farklı.' },
      { content: { visual: cift(['ucgen', '#22c55e'], ['ucgen', '#a855f7']) }, category: 'renk', explain: 'İkisi de aynı büyüklükte üçgen; renkleri farklı.' },
      { content: { visual: cift(['cember', '#f97316'], ['cember', '#f97316', 0.5]) }, category: 'boy', explain: 'Renk ve biçim aynı ama biri küçük.' },
      { content: { visual: cift(['dikdortgen', '#14b8a6'], ['dikdortgen', '#14b8a6', 0.55]) }, category: 'boy', explain: 'İkisi de dikdörtgen ve aynı renk; boyları farklı.' },
      { content: { visual: cift(['kare', '#eab308'], ['cember', '#eab308']) }, category: 'bicim', explain: 'Renk aynı ama biri köşeli, biri yuvarlak.' },
      { content: { visual: cift(['ucgen', '#ec4899'], ['kare', '#ec4899']) }, category: 'bicim', explain: 'Birinin 3, diğerinin 4 köşesi var.' },
    ],
  },
  {
    id: 'g1-hangisi-farkli-sekil',
    outcomes: ['MAT.1.3.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Aslı Öğretmen dört şekil gösterdi ve “Hangisi farklı?” diye sordu. Ece bir şekli, Can başka bir şekli seçti. İkisi de haklı olabilir mi?' },
    reflect: 'Senin seçtiğin farklı olanı arkadaşın başka bir nedenle seçebilir mi? Kendi ölçütünü anlat.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: sekil('ucgen', '#ef4444', 0.55) }, { visual: sekil('ucgen', '#3b82f6') }, { visual: sekil('kare', '#ef4444') }, { visual: sekil('ucgen', '#ef4444', 1, 180) }],
        answer: 0,
        reasons: ['Tek küçük şekil; diğerleri büyük.', 'Tek mavi şekil; diğerleri kırmızı.', 'Tek dört köşeli şekil; diğerleri üçgen.', 'Tek ters duran şekil; ucu aşağı bakıyor. Ama döndürünce yine üçgen!'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['🧦 Çorap', '🧤 Eldiven', '👟 Ayakkabı', '🧢 Şapka'],
        answer: 0,
        reasons: ['Ayakkabının içine giyilen tek eşya.', 'Ellere takılan tek eşya.', 'Bağcığı olan tek eşya.', 'Çift olarak kullanılmayan tek eşya; onun eşi yok.'],
      },
    ],
  },

  // ── Sayılar ve Nicelikler (1) ───────────────────────────────────────────

  // MAT.1.1.1 20’ye kadar sayılar
  {
    id: 'g1-onluk-cerceve',
    outcomes: ['MAT.1.1.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Onluk çerçeveyi doldur',
    instructions: 'İstenen kadar sayacı çerçeveye yerleştir.',
    launch: { text: 'Yumurta kolisinde 10 göz var 🥚. Bir koli dolunca kaç yumurta olur? İki koli dolunca?', visual: { kind: 'tenframe', filled: 10, size: 10 } },
    reflect: 'Sayaçları tek tek saymadan 14’ü nasıl gösterdin? Çerçevenin sana nasıl bir yardımı oldu?',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: 'Çerçeveye 7 sayaç koy.', target: { count: 7 }, hints: ['Üst sırada 5 kutu var. 5’ten sonra kaç tane daha gerekir?'], explain: '7 = 5 ve 2. Üst sıra dolu, alt sırada 2 sayaç var.' },
      { prompt: 'Bir çerçeveyi tam doldur.', target: { count: 10 }, explain: 'Dolu bir çerçeve 10’dur: bir onluk.' },
      { prompt: 'Çerçevelere 14 sayaç koy.', target: { count: 14 }, hints: ['Önce bir çerçeveyi doldur. 14’e ulaşmak için kaç tane daha gerekir?'], explain: '14 = 10 ve 4.' },
      { prompt: 'Çerçevelere 20 sayaç koy.', target: { count: 20 }, explain: 'İki dolu çerçeve: 10 ve 10, yani 20.' },
    ],
  },
  {
    id: 'g1-sayi-ve-cokluk',
    outcomes: ['MAT.1.1.1'],
    type: 'match',
    stage: 'model',
    title: 'Bir sayı, birçok gösterim',
    instructions: 'Her sayıyı aynı çokluğu gösteren resimle eşleştir.',
    launch: { text: 'Beş tane şeyi kaç farklı yolla gösterebiliriz? Parmakla ✋, çizgiyle, noktayla… Hepsi aynı sayıyı söyler.', visual: cetele(5) },
    reflect: 'Sıfırı nasıl gösterdin? Hiç nesne yoksa da bir sayı yazabilir miyiz?',
    pairs: [
      { left: '0', right: { visual: { kind: 'tenframe', filled: 0, size: 10 } } },
      { left: '3', right: { visual: { kind: 'dots', count: 3, arrangement: 'dice' } } },
      { left: '5', right: { visual: cetele(5) } },
      { left: '6', right: { visual: { kind: 'emoji', emoji: '🐞', count: 6 } } },
      { left: '8', right: { visual: { kind: 'tenframe', filled: 8, size: 10 } } },
      { left: '12', right: { visual: { kind: 'tenframe', filled: 12, size: 20 } } },
      { left: '15', right: { visual: cetele(15) } },
      { left: '19', right: { visual: { kind: 'dots', count: 19, arrangement: 'five' } } },
    ],
    perRound: 4,
  },
  {
    id: 'g1-sayi-okunus',
    outcomes: ['MAT.1.1.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Okunuşu ve yazılışı',
    instructions: 'Sayının okunuşunu rakamlarla yazılışıyla eşleştir.',
    launch: { text: 'Takvimde “on dört” yazıyor ama sen 14’ü arıyorsun. Okunuşla yazılışı eşleştirelim.' },
    reflect: '“On altı” derken önce hangi sözcüğü söylüyoruz? 16 yazarken önce hangi rakamı yazıyoruz? Bir bağlantı görüyor musun?',
    pairs: [
      { left: 'sıfır', right: '0' },
      { left: 'dokuz', right: '9' },
      { left: 'on', right: '10' },
      { left: 'on bir', right: '11' },
      { left: 'on iki', right: '12' },
      { left: 'on altı', right: '16' },
      { left: 'on dokuz', right: '19' },
      { left: 'yirmi', right: '20' },
    ],
    perRound: 4,
  },
  {
    id: 'g1-sayilar-hayatta',
    outcomes: ['MAT.1.1.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Sayılar her yerde',
    instructions: 'Soruyu oku, en uygun cevabı seç.',
    launch: { text: 'Bugün kaç sayı gördün? Saatte, otobüste, kapı numarasında… Sayılar bize “kaç tane” olduğunu söyler.' },
    reflect: '0 hiçbir şey yokken kullanılıyor. Günlük hayatta 0’ı nerede görürsün?',
    questions: [
      { prompt: 'Tabakta hiç kurabiye kalmadı 🍽️. Tabakta kaç kurabiye var?', choices: ['0', '1', '10'], answer: 0, feedback: [null, '1 olsaydı tabakta bir kurabiye görürdük. Hiç yoksa sayı 0’dır.', '10’da da 0 rakamı var ama 10 bir onluk demektir. Hiç yoksa yalnızca 0 yazarız.'] },
      { prompt: '“On altı” nasıl yazılır?', choices: ['16', '61', '106', '6'], answer: 0, feedback: [null, '61’de rakamların yeri değişmiş. On altı, bir onluk ve 6 birliktir; önce 1 yazılır.', '“On”u 10, “altı”yı 6 diye yan yana yazmışsın. On altı iki rakamla yazılır: 16.', '6 yalnızca altı. On altı, ondan altı fazladır.'] },
      { prompt: 'Kalem kutusunda 8 kalem var 🥁. Her kalem için masaya bir kez vurursan kaç kez vurursun?', choices: ['8', '7', '9'], answer: 0, feedback: [null, 'Bir kalemi atlamış olabilirsin. Her kaleme bir vuruş!', 'Bir kalemi iki kez saymış olabilirsin.'] },
      { prompt: 'Senin 10 parmağın, arkadaşının da 10 parmağı var. Birlikte kaç parmağınız var?', choices: ['20', '11', '10'], answer: 0, feedback: [null, 'Arkadaşının yalnızca bir parmağını saydın. Onun da 10 parmağı var.', 'Yalnızca kendi parmaklarını saydın.'] },
      { prompt: '7 bir rakamdır. 17 için hangisi doğru?', choices: ['17, iki rakamla yazılmış bir sayıdır', '17 tek bir rakamdır', '17’de hiç rakam yoktur'], answer: 0, feedback: [null, 'Rakamlar 0’dan 9’a kadar olan 10 işarettir. 17’de iki rakam var: 1 ve 7.', '17’yi yazarken 1 ve 7 rakamlarını kullandık.'] },
      { prompt: 'Hangisi 20’yi gösterir?', choices: [{ visual: { kind: 'tenframe', filled: 20, size: 20 } }, { visual: { kind: 'tenframe', filled: 12, size: 20 } }, { visual: { kind: 'dots', count: 10, arrangement: 'five' } }], answer: 0, feedback: [null, 'Burada bir dolu çerçeve ve 2 sayaç var: 12.', 'Bunlar 10 nokta. 20 için iki tane 10 gerekir.'] },
    ],
  },

  // MAT.1.1.2 Sayarken parçalar
  {
    id: 'g1-parca-cerceve',
    outcomes: ['MAT.1.1.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Parça parça doldur',
    instructions: 'Yönergeye göre sayaçları parça parça koy.',
    launch: { text: '9 misketini iki avucuna paylaştırıyorsun. Bir avucunda 4 varsa diğerinde kaç olur? Parçalar birleşince bütün oluşur.' },
    reflect: '13 sayacı “10 ve 3” diye görmek, tek tek saymaktan neden daha hızlı?',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: 'Önce 5 sayaç koy, sonra 3 tane daha ekle.', target: { count: 8 }, hints: ['Üst sıra 5’tir. Alt sıraya 3 koyunca kaç olur?'], explain: '5 ve 3 birlikte 8 eder.' },
      { prompt: '6 sayaç koy, sonra çerçeveyi dolduracak kadar ekle.', target: { count: 10 }, hints: ['Kaç boş kutu kaldı?'], explain: '6 ve 4 birlikte 10 eder.' },
      { prompt: 'Bir dolu çerçeve ve 6 sayaç daha yap.', target: { count: 16 }, hints: ['Bir dolu çerçeve 10’dur.'], explain: '10 ve 6 birlikte 16 eder.' },
      { prompt: '9 sayaç koy, sonra 4 tane daha ekle.', target: { count: 13 }, hints: ['9’u 10 yapmak için 1 gerekir. 4’ten 1’ini kullanınca kaç kalır?'], explain: '9 ve 1 = 10; kalan 3 ile 13.' },
    ],
  },
  {
    id: 'g1-sipsak-parcalar',
    outcomes: ['MAT.1.1.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Şipşak bak: parçaları gör',
    instructions: 'Resim kısa bir süre görünecek. Saymadan, parçalara bakarak kaç tane olduğunu söyle.',
    launch: { text: 'Zarı atınca noktaları tek tek saymadan “beş!” diyebiliyor musun? Gözümüz küçük grupları hemen tanır.', visual: { kind: 'dots', count: 5, arrangement: 'dice' } },
    reflect: '17’yi saymadan nasıl gördün? “10 ve 7” mi, “20’den 3 eksik” mi? Başka bir yol var mı?',
    questions: [
      { prompt: { text: 'Kaç nokta gördün?', visual: { kind: 'dots', count: 7, arrangement: 'five' } }, flash: 2000, choices: ['7', '6', '8', '5'], answer: 0, feedback: [null, 'Üst sırada 5 nokta vardı. Alttakileri düşün: 5 ve kaç?', 'Neredeyse! 5’li sıranın altında 2 nokta vardı, 3 değil.', '5 yalnızca üst sıraydı; alt sıradakileri de ekle.'] },
      { prompt: { text: 'Kaç sayaç gördün?', visual: { kind: 'tenframe', filled: 9, size: 10 } }, flash: 2000, choices: ['9', '8', '10', '7'], answer: 0, feedback: [null, 'Çerçevede yalnızca 1 boş kutu vardı. Dolu çerçeveden 1 eksik kaç eder?', 'Çerçeve tam dolu değildi; bir kutu boştu.', 'Alt sırada yalnızca 1 boş kutu vardı.'] },
      { prompt: { text: 'Hepsi kaç tane?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🍎', count: 4 }, { emoji: '🍐', count: 3 }] } }, flash: 2500, choices: ['7', '6', '8', '4'], answer: 0, feedback: [null, '4 elma ve 3 armut vardı. 4’ten sonra üç sayı say: 5, 6, 7.', 'Bir tanesini iki kez saymış olabilirsin. 4 ve 3’ü birleştir.', 'Yalnızca elmaları saydın; armutları da ekle.'] },
      { prompt: { text: 'Kaç sayaç gördün?', visual: { kind: 'tenframe', filled: 13, size: 20 } }, flash: 2500, choices: ['13', '3', '10', '14'], answer: 0, feedback: [null, '3 yalnızca ikinci çerçevedekiler. Dolu çerçeveyi, yani 10’u unutma!', '10 dolu çerçeve; ikinci çerçevede de sayaçlar vardı.', 'İkinci çerçevede 3 sayaç vardı, 4 değil.'] },
      { prompt: { text: 'Kırmızı ve mavi birlikte kaç?', visual: { kind: 'tenframe', filled: 6, add: 2, size: 10 } }, flash: 2000, choices: ['8', '6', '2', '9'], answer: 0, feedback: [null, '6 yalnızca kırmızılar. Mavileri de ekle.', '2 yalnızca maviler. Kırmızıları da ekle.', 'Çerçevede 2 boş kutu vardı; 10’dan 2 eksik kaç eder?'] },
      { prompt: { text: 'Kaç sayaç gördün?', visual: { kind: 'tenframe', filled: 17, size: 20 } }, flash: 2500, choices: ['17', '7', '15', '18'], answer: 0, feedback: [null, '7 yalnızca ikinci çerçevedekiler. Dolu çerçeveyi de ekle: 10 ve 7.', 'İkinci çerçevede 5’ten fazla sayaç vardı: 5 ve 2.', 'İkinci çerçevede 3 boş kutu vardı, 2 değil.'] },
    ],
  },
  {
    id: 'g1-bardak-alti',
    outcomes: ['MAT.1.1.2'],
    type: 'fill',
    stage: 'model',
    title: 'Bardağın altında kaç tane?',
    instructions: 'Toplam kaç tane olduğu yazıyor. Görünenlere bak, bardağın altındakileri bul.',
    launch: { text: 'Aslı Öğretmen masaya 7 düğme koydu, sonra bazılarını bardakla kapattı 🥤. Kaç düğme görünmüyor? Görünen parça ile saklı parça birlikte bütünü oluşturur.', visual: { kind: 'hidden', shown: 4, emoji: '🟡', total: 7 } },
    reflect: 'Saklı parçayı bulmak için ne yaptın: görünenlerden toplama doğru mu saydın, yoksa başka bir yol mu buldun?',
    generator: { id: 'hiddenPart', params: { min: 4, max: 10, emoji: '🔵' }, count: 6 },
  },
  {
    id: 'g1-parcalar',
    outcomes: ['MAT.1.1.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Parçalardan bütüne',
    instructions: 'Sayıyı parçalarına ayır. Boşlukları doldur.',
    launch: { text: '8 kalemi iki kalemliğe koyacaksın. 4 ve 4 koyabilirsin, 5 ve 3 de… Kaç farklı yolu var?' },
    reflect: '10’u iki parçaya kaç farklı yolla ayırabilirsin? Birkaçını söyle.',
    items: [
      { text: '7 = 5 + __', answers: ['2'], visual: { kind: 'dots', count: 7, arrangement: 'five' }, hints: ['5’li sıranın dışında kaç nokta var?'] },
      { text: '9 = 4 + __', answers: ['5'], hints: ['4’ten 9’a kadar ileri say: 5, 6, 7, 8, 9. Kaç sayı söyledin?'] },
      { text: '10 = 7 + __', answers: ['3'], visual: { kind: 'tenframe', filled: 7, size: 10 }, hints: ['Çerçevede kaç boş kutu var?'] },
      { text: '__ + 2 = 6', answers: ['4'], hints: ['6’nın içinde 2 var. Geriye kaç kalıyor?'] },
      { text: '14 = 10 + __', answers: ['4'], visual: { kind: 'tenframe', filled: 14, size: 20 }, hints: ['Dolu çerçeve 10. İkinci çerçevede kaç sayaç var?'], explain: '14, bir onluk ve 4 birlikten oluşur.' },
      { text: '10 + 8 = __', answers: ['18'], hints: ['Bir onluk ve 8 birlik: on…?'], explain: 'On ve sekiz: on sekiz, 18.' },
      { text: '17 = __ + 7', answers: ['10'], hints: ['17’nin içindeki onluk kaç eder?'] },
    ],
  },
  {
    id: 'g1-hangisi-farkli-sayi',
    outcomes: ['MAT.1.1.2'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Dört onluk çerçeveye bak. Her biri bir yönüyle diğerlerinden farklı. Sen hangisini seçersin?' },
    reflect: 'Seçtiğin farklı olanın nedenini arkadaşına anlat. Arkadaşın başka birini seçtiyse onun nedeni de doğru olabilir mi?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: { kind: 'tenframe', filled: 10, size: 10 } }, { visual: { kind: 'tenframe', filled: 5, size: 10 } }, { visual: { kind: 'tenframe', filled: 9, size: 10 } }, { visual: { kind: 'tenframe', filled: 4, add: 3, size: 10 } }],
        answer: 0,
        reasons: ['Tek dolu çerçeve: tam 10.', 'Yalnızca üst sırası dolu olan tek çerçeve: 5.', 'Bir tek kutusu boş kalan çerçeve: 9, yani 10’dan 1 eksik.', 'İki renk sayacı olan tek çerçeve: 4 ve 3, toplam 7.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['5', '10', '12', '20'],
        answer: 0,
        reasons: ['Tek rakamla yazılan tek sayı.', '20’yi iki eşit parçaya ayırınca bir parçası: 10 ve 10.', '5’er sayarken söylemediğimiz tek sayı.', 'İki onluktan oluşan tek sayı; en büyüğü.'],
      },
    ],
  },

  // MAT.1.1.3 Sıra sayıları
  {
    id: 'g1-sira-sayilari',
    outcomes: ['MAT.1.1.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Kaçıncı sırada?',
    instructions: 'Yarışçıların sırasına bak. Bitiş bayrağına en yakın olan birincidir.',
    launch: { text: 'Koşu yarışında bitiş çizgisine ilk varan “birinci” olur 🏁. Sıra sayıları kimin kaçıncı geldiğini söyler.' },
    reflect: 'Yarışçıları sondan saysaydık sıralar nasıl değişirdi? Neden nereden başladığımızı söylememiz gerekir?',
    fixedOrder: true,
    questions: [
      { prompt: { text: '🐢 kaçıncı?', visual: { kind: 'pattern', items: ['🏁', '🐇', '🐢', '🐌', '🦊'] } }, choices: ['Birinci', 'İkinci', 'Üçüncü', 'Dördüncü'], answer: 1, feedback: ['🐇 bayrağa daha yakın; birinci o.', null, 'Sondan saymış olabilirsin. Bayrağın yanından başla: 🐇 birinci.', 'Dördüncü 🦊. 🐢 bayrağa daha yakın.'] },
      { prompt: { text: '🦊 kaçıncı?', visual: { kind: 'pattern', items: ['🏁', '🐇', '🐢', '🐌', '🦊'] } }, choices: ['Birinci', 'İkinci', 'Üçüncü', 'Dördüncü'], answer: 3, feedback: ['Birinci, bayrağın hemen yanındaki 🐇.', 'İkinci 🐢. 🦊 daha geride.', 'Üçüncü 🐌. 🦊 onun da arkasında.', null] },
      { prompt: { text: 'Üçüncü sıradaki araç hangisi?', visual: { kind: 'pattern', items: ['🏁', '🚗', '🚕', '🚙', '🚌', '🚑'] } }, choices: ['🚗', '🚕', '🚙', '🚌'], answer: 2, feedback: ['🚗 birinci.', '🚕 ikinci.', null, '🚌 dördüncü; bir fazla saydın.'] },
      { prompt: '“4 araba” ile “4. araba” aynı şey mi?', choices: ['Hayır: “4 araba” kaç tane olduğunu, “4. araba” hangisi olduğunu söyler', 'Evet, ikisi de aynı'], answer: 0, feedback: [null, '“4 araba” dördünün hepsidir. “4. araba” ise sıradaki tek bir arabadır.'] },
      { prompt: { text: 'Şeftaliden 🍑 hemen önce hangisi geliyor?', visual: { kind: 'pattern', items: ['🏁', '🍓', '🍒', '🍑', '🍍', '🍇'] } }, choices: ['🍒', '🍍', '🍓'], answer: 0, feedback: [null, '🍍 şeftaliden sonra geliyor.', '🍓 birinci; şeftalinin hemen yanında değil.'] },
      { prompt: { text: '🍇 kaçıncı?', visual: { kind: 'pattern', items: ['🏁', '🍓', '🍒', '🍑', '🍍', '🍇'] } }, choices: ['Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı'], answer: 2, feedback: ['Üçüncü 🍑. Üzüm daha geride.', 'Dördüncü 🍍. Bir sonraki üzüm.', null, 'Bayrağı da saymış olabilirsin. Bayrak yarışçı değil!'] },
    ],
  },
  {
    id: 'g1-sira-sayisi-eslestir',
    outcomes: ['MAT.1.1.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Sıra sayılarını eşleştir',
    instructions: 'Sıra sayısının okunuşunu yazılışıyla eşleştir.',
    launch: { text: 'Yarış sonuçları panoda “1.”, “2.” diye yazılır. Sayının yanındaki küçük nokta ne anlama geliyor olabilir?' },
    reflect: '“3” ile “3.” arasındaki fark nedir? Bir örnekle anlat.',
    pairs: [
      { left: 'Birinci', right: '1.' },
      { left: 'İkinci', right: '2.' },
      { left: 'Üçüncü', right: '3.' },
      { left: 'Beşinci', right: '5.' },
      { left: 'Yedinci', right: '7.' },
      { left: 'Onuncu', right: '10.' },
      { left: 'On beşinci', right: '15.' },
      { left: 'Yirminci', right: '20.' },
    ],
    perRound: 4,
  },
  {
    id: 'g1-sira-problem',
    outcomes: ['MAT.1.1.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kuyrukta kaçıncıyım?',
    instructions: 'Durumu gözünün önüne getir, sonra cevabı seç.',
    launch: { text: 'Kantinde kuyruğa girdin 🥪. Önünde 3 kişi var. Sen kaçıncısın? Sıra sayıları ile sayma sayıları birlikte çalışır.' },
    reflect: 'Kuyrukta 5. olan biri “önümde 5 kişi var” derse ona nasıl açıklarsın?',
    questions: [
      { prompt: 'Ali kuyrukta 5. sırada. Önünde kaç kişi var?', choices: ['4', '5', '6'], answer: 0, feedback: [null, '5 kişi, Ali ile birlikte. Önündekileri sayarken Ali’yi sayma.', 'Ali’nin arkasındakileri değil, önündekileri sayıyoruz.'] },
      { prompt: 'Kuyrukta önünde 2 kişi var. Sen kaçıncısın?', choices: ['Üçüncü', 'İkinci', 'Birinci'], answer: 0, feedback: [null, 'İkinci olsaydın önünde yalnızca 1 kişi olurdu.', 'Birinci olsaydın önünde kimse olmazdı.'] },
      { prompt: 'Merdivenin 3. basamağındasın. 2 basamak daha çıkarsan kaçıncı basamakta olursun?', choices: ['Beşinci', 'Dördüncü', 'Birinci'], answer: 0, feedback: [null, 'Bir basamak eksik saydın: 3’ten sonra 4, sonra 5.', 'Çıkmak yukarı gitmektir; basamak numarası büyür.'] },
      { prompt: 'Bir yarışta 8 kişi koştu. Ece sondan birinci oldu. Baştan kaçıncı?', choices: ['Sekizinci', 'Birinci', 'Yedinci'], answer: 0, feedback: [null, 'Sondan birinci, en sonda gelen demek.', 'Yedinci olsaydı arkasında bir kişi daha olurdu.'] },
      { prompt: 'Sırada Can 10., Elif 11. Elif, Can’ın önünde mi, arkasında mı?', choices: ['Arkasında', 'Önünde'], answer: 0, feedback: [null, '11, 10’dan sonra gelir. Sonra gelen arkadadır.'] },
      { prompt: 'Kitaplığın 2. ile 4. rafı arasında hangi raf var?', choices: ['3. raf', '1. raf', '5. raf'], answer: 0, feedback: [null, '1. raf, 2. raftan da önce gelir; arada değil.', '5. raf, 4. raftan sonra gelir; arada değil.'] },
    ],
  },

  // MAT.1.1.4 Çok mu, az mı?
  {
    id: 'g1-esitle-cerceve',
    outcomes: ['MAT.1.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Eşit, daha çok, daha az',
    instructions: 'Yönergeyi oku ve çerçeveye o kadar sayaç koy.',
    launch: { text: 'Ayşe’nin 6 bilyesi var, senin 4. Eşit olmanız için ne yapmalısın? Bire bir eşleyerek düşünelim.', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔵', count: 6 }, { emoji: '🔴', count: 4 }], separator: '|' } },
    reflect: '“Daha çok” ile “daha az” arasındaki farkı bir örnekle anlat.',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: 'Ayşe’nin 6 bilyesi var. Çerçeveye onunkine EŞİT sayıda sayaç koy.', target: { count: 6 }, hints: ['Ayşe’nin her bilyesine bir sayaç eşle.'] },
      { prompt: 'Can’ın 9 bilyesi var. Çerçeveye Can’dan 2 DAHA AZ sayaç koy.', target: { count: 7 }, hints: ['Önce 9 sayaç koy, sonra 2’sini çıkar.'] },
      { prompt: '10’dan 1 DAHA ÇOK sayaç koy.', target: { count: 11 }, hints: ['Bir çerçeveyi doldur, sonra bir tane daha koy.'] },
      { prompt: 'Elif’in 15 bilyesi var. Çerçeveye Elif’ten 3 daha az sayaç koy.', target: { count: 12 }, hints: ['15’i göster, sonra 3 sayaç çıkar.'], explain: '15’ten 3 eksik 12’dir. 12, 15’ten daha azdır.' },
    ],
  },
  {
    id: 'g1-cok-az',
    outcomes: ['MAT.1.1.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Hangisi daha çok?',
    instructions: 'Grupları karşılaştır. Gerekirse bire bir eşle.',
    launch: { text: 'Bir sepette 6, diğerinde 10 elma var 🍎. Hangisinde daha çok olduğunu saymadan anlayabilir misin?' },
    reflect: 'İki grubu saymadan karşılaştırmanın bir yolu var mı? Bire bir eşlemeyi arkadaşına nasıl anlatırsın?',
    questions: [
      { prompt: { text: 'Hangi sırada daha ÇOK balık var?', visual: sira('🐟', 5, 46, '🐠', 7, 24) }, choices: ['Alt sırada', 'Üst sırada', 'Eşit'], answer: 0, feedback: [null, 'Üst sıra daha uzun görünüyor çünkü balıklar aralıklı. Bire bir eşle: alt sırada fazlası kalıyor.', 'Bire bir eşleyince alt sırada 2 balık eşsiz kalıyor.'] },
      { prompt: { text: 'Yıldızlar mı daha çok, aylar mı?', visual: sira('⭐', 6, 24, '🌙', 6, 40) }, choices: ['Eşit', 'Yıldızlar daha çok', 'Aylar daha çok'], answer: 0, feedback: [null, 'Bire bir eşle: hiçbir yıldız eşsiz kalmıyor.', 'Aylar daha uzun bir sıra yapıyor ama sayıları aynı: 6 ve 6.'] },
      { prompt: { text: 'Çerçevelerde 10’dan AZ mı, ÇOK mu, yoksa 10’a EŞİT mi?', visual: { kind: 'tenframe', filled: 13, size: 20 } }, choices: ['10’dan çok', '10’dan az', '10’a eşit'], answer: 0, feedback: [null, 'Bir çerçeve dolu, fazlası da var. 10’u geçmiş.', 'Bir dolu çerçeve 10 eder; burada fazlası da var.'] },
      { prompt: { text: 'Çerçevede 10’dan AZ mı, ÇOK mu, yoksa 10’a EŞİT mi?', visual: { kind: 'tenframe', filled: 8, size: 10 } }, choices: ['10’dan çok', '10’dan az', '10’a eşit'], answer: 1, feedback: ['Çerçevede boş kutular var; 10’a ulaşmamış.', null, 'Tam 10 olsaydı hiç boş kutu kalmazdı.'] },
      { prompt: { text: 'Kurabiyeler 10’dan AZ mı, ÇOK mu, yoksa 10’a EŞİT mi?', visual: { kind: 'emoji', emoji: '🍪', count: 10, group: 5 } }, choices: ['10’dan çok', '10’dan az', '10’a eşit'], answer: 2, feedback: ['İki tane 5’li grup var: 5 ve 5. Fazlası yok.', 'İki tane 5’li grup 10 eder; eksik yok.', null] },
      { prompt: 'Hangisi daha AZ: 12 mi, 9 mu?', choices: ['9', '12', 'Eşit'], answer: 0, feedback: [null, '12, bir onluk ve 2 birlik; 9 ise bir onluğa bile ulaşmıyor.', 'Sayılar farklı; eşit değiller.'] },
    ],
  },
  {
    id: 'g1-karsilastir',
    outcomes: ['MAT.1.1.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Daha çok mu, daha az mı, eşit mi?',
    instructions: 'Sayıları karşılaştır. Uygun sözcüğü seç.',
    launch: { text: 'Sınıfta 12 kız, 9 erkek öğrenci var. Kızlar mı daha çok, erkekler mi? Rakamlarla da karşılaştırabiliriz.' },
    reflect: '20 ile 2’de aynı rakam var. Hangisi daha çok, neden?',
    items: [
      { text: '12, 9’dan __.', answers: ['daha çok'], choices: ['daha çok', 'daha az', 'eşit'], hints: ['12 bir onluğu geçiyor mu? 9 geçiyor mu?'] },
      { text: '7, 11’den __.', answers: ['daha az'], choices: ['daha çok', 'daha az', 'eşit'], hints: ['Sayarken hangisini önce söylersin?'] },
      { text: '15 ile 15 __.', answers: ['eşit'], choices: ['daha çok', 'daha az', 'eşit'] },
      { text: '20, 2’den __.', answers: ['daha çok'], choices: ['daha çok', 'daha az', 'eşit'], hints: ['20’de kaç onluk var? 2’de hiç onluk var mı?'], explain: '20 ile 2’de aynı rakam var ama 20 iki onluktur.' },
      { text: '13, 18’den __.', answers: ['daha az'], choices: ['daha çok', 'daha az', 'eşit'] },
      { text: '19, 16’dan __.', answers: ['daha çok'], choices: ['daha çok', 'daha az', 'eşit'] },
      { text: '0, 1’den __.', answers: ['daha az'], choices: ['daha çok', 'daha az', 'eşit'], explain: 'Sıfır hiç demektir; hiçbir şey, birden azdır.' },
      { text: 'Sepette 14 elma, kasede 17 çilek var. Elmalar çileklerden __.', answers: ['daha az'], choices: ['daha çok', 'daha az', 'eşit'], hints: ['14 mü önce gelir, 17 mi?'] },
    ],
  },

  // MAT.1.1.5 Ritmik sayma
  {
    id: 'g1-sayi-dogrusu',
    outcomes: ['MAT.1.1.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusunda zıpla',
    instructions: 'Yönergeye göre zıpla ve vardığın sayıya dokun.',
    launch: { text: 'Seksek oynarken taşları ikişer ikişer atlayabilirsin. Hangi sayılara basarsın?', visual: { kind: 'numberline', min: 0, max: 10, step: 1, jumps: [0, 2, 4, 6] } },
    reflect: 'İkişer sayarken hangi sayılara hiç basmadın? Bir örüntü görüyor musun?',
    tool: 'numberline',
    config: { min: 0, max: 20, step: 1 },
    tasks: [
      { prompt: '0’dan başla, ikişer zıpla: 2, 4, 6… 5. zıplayışında nereye varırsın?', target: { value: 10 }, hints: ['Her zıplayışta bir sayıyı atla.', '2, 4, 6, 8… bir zıplayış daha!'] },
      { prompt: '20’den geriye birer say: 20, 19, 18, __, __. Söylediğin son sayıyı işaretle.', target: { value: 16 }, hints: ['Geriye sayınca sayılar küçülür.'] },
      { prompt: '20’den geriye ikişer zıpla: 18, 16… 4. zıplayışında nereye varırsın?', target: { value: 12 }, hints: ['Her zıplayış 2 geri. 20’den 18’e ilk zıplayış.'] },
      { prompt: '0’dan beşer zıpla. 3. zıplayışında nereye varırsın?', target: { value: 15 }, hints: ['Bir elin parmakları kadar zıpla: 5, …'] },
    ],
  },
  {
    id: 'g1-ritmik-ileri',
    outcomes: ['MAT.1.1.5'],
    type: 'fill',
    stage: 'model',
    title: 'Beşer ve onar sayalım',
    instructions: 'Gruplara bak, ritmik sayarak eksik sayıyı yaz.',
    launch: { text: 'Bir elde 5 parmak var ✋. Sınıftaki herkesin parmaklarını tek tek saymak yerine nasıl daha hızlı sayarsın?', visual: { kind: 'emoji', emoji: '✋', count: 4 } },
    reflect: 'Beşer saymak birer saymaktan neden daha hızlı? Nerelerde beşer ya da onar sayarız?',
    items: [
      { text: '5, 10, 15, __', answers: ['20'], visual: { kind: 'emoji', emoji: '✋', count: 4 }, hints: ['Her el 5 parmak. Bir el daha ekle.'] },
      { text: '5, 10, 15, 20, 25, __', answers: ['30'], visual: { kind: 'emoji', emoji: '✋', count: 6 } },
      { text: '10, 20, 30, __', answers: ['40'], visual: { kind: 'blocks', tens: 4 }, hints: ['Her çubukta 10 küp var.'] },
      { text: '10, 20, 30, 40, 50, 60, __', answers: ['70'], visual: { kind: 'blocks', tens: 7 } },
      { text: 'Onar sayınca 90’dan sonra __ gelir.', answers: ['100'], hints: ['Dokuz onluktan sonra on onluk gelir.'], explain: '10 tane onluk 100 eder.' },
      { text: '50, 55, 60, __, 70', answers: ['65'], hints: ['Her adımda 5 artıyor. 60’tan 5 ileri?'] },
      { text: '12, 14, 16, __, 20', answers: ['18'], visual: { kind: 'emoji', emoji: '🧦', count: 18, group: 2 }, hints: ['Çoraplar ikişer ikişer: her adımda 2 artıyor.'] },
      { text: '47, 48, 49, __', answers: ['50'], hints: ['49’dan sonra yeni bir onluk başlıyor.'] },
    ],
  },
  {
    id: 'g1-geriye-say',
    outcomes: ['MAT.1.1.5'],
    type: 'sort',
    stage: 'sembol',
    title: 'Roket fırlatma: geriye say!',
    instructions: 'Geriye doğru sayarak sayıları sırala.',
    launch: { text: 'Roket kalkmadan önce geriye sayılır: 10, 9, 8… 🚀 Geriye sayarken sayılar nasıl değişir?' },
    reflect: 'Geriye ikişer sayarken 20’den başlayıp hangi sayılara uğrarsın? İleriye ikişer sayarken uğradıklarınla karşılaştır.',
    rounds: [
      { prompt: '🚀 20’den geriye birer say!', items: ['20', '19', '18', '17', '16'], ends: ['Başla', 'Bitir'] },
      { prompt: '🚀 20’den geriye ikişer say!', items: ['20', '18', '16', '14', '12'], ends: ['Başla', 'Bitir'], hints: ['Her adımda bir sayıyı atla.'] },
      { prompt: '🚀 13’ten geriye birer say!', items: ['13', '12', '11', '10', '9'], ends: ['Başla', 'Bitir'] },
      { prompt: '🚀 10’dan geriye ikişer say!', items: ['10', '8', '6', '4', '2'], ends: ['Başla', 'Bitir'] },
    ],
  },

  // MAT.1.1.6 Örüntüler
  {
    id: 'g1-buyuyen-oruntu',
    outcomes: ['MAT.1.1.6'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Büyüyen örüntüyü kur',
    instructions: 'Örüntünün ilk üç adımına bak. Dördüncü adımı çerçevede oluştur.',
    launch: { text: 'Bir kule her gün 2 blok büyüyor: 2, 4, 6… Dördüncü gün kaç blok olur? Örüntüyü sayaçlarla kuralım.', visual: { kind: 'pattern', items: ['🟦🟦', '🟦🟦🟦🟦', '🟦🟦🟦🟦🟦🟦', '?'] } },
    reflect: 'Dördüncü adımı bulmak için neye baktın? Beşinci adım kaç olur, nasıl bilirsin?',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: 'Örüntü: 1, 2, 3 sayaç. 4. adımı göster.', target: { count: 4 }, hints: ['Her adımda kaç sayaç ekleniyor?'] },
      { prompt: 'Örüntü: 2, 4, 6 sayaç. 4. adımı göster.', target: { count: 8 }, hints: ['Her adımda 2 sayaç ekleniyor mu?'] },
      { prompt: 'Örüntü azalıyor: 10, 8, 6 sayaç. 4. adımı göster.', target: { count: 4 }, hints: ['Her adımda kaç sayaç çıkarılıyor?'] },
      { prompt: 'Örüntü: 5, 10, 15 sayaç. 4. adımı göster.', target: { count: 20 }, hints: ['Her adımda bir el kadar, yani 5 sayaç ekleniyor.'], explain: '5’er artan örüntünün 4. adımı 20’dir: iki dolu çerçeve.' },
    ],
  },
  {
    id: 'g1-sekil-oruntusu',
    outcomes: ['MAT.1.1.6'],
    type: 'quiz',
    stage: 'model',
    title: 'Sırada ne var?',
    instructions: 'Örüntünün tekrar eden ya da büyüyen kısmını bul. Soru işaretinin yerine geleni seç.',
    launch: { text: 'Annenin kolyesinde boncuklar 🔴🔵🔴🔵 diye diziliyor. Sıradaki boncuğun rengini nasıl tahmin edersin?' },
    reflect: 'Tekrar eden örüntü ile büyüyen örüntü arasındaki fark ne? Birer örnek ver.',
    questions: [
      { prompt: { visual: { kind: 'pattern', items: ['🔴', '🔵', '🔴', '🔵', '🔴', '?'] } }, choices: ['🔵', '🔴', '🟢'], answer: 0, feedback: [null, 'Kırmızıdan sonra hep mavi geliyor. Tekrar eden parça: 🔴🔵.', 'Yeşil bu örüntüde hiç yok.'] },
      { prompt: { visual: { kind: 'pattern', items: ['⭐', '⭐', '🌙', '⭐', '⭐', '?'] } }, choices: ['🌙', '⭐', '☀️'], answer: 0, feedback: [null, 'Tekrar eden parça: ⭐⭐🌙. İki yıldızdan sonra ay gelir.', 'Güneş bu örüntüde hiç yok.'] },
      { prompt: { visual: { kind: 'pattern', items: ['🍎', '🍌', '🍇', '🍎', '🍌', '?'] } }, choices: ['🍇', '🍎', '🍌'], answer: 0, feedback: [null, 'Tekrar eden parça üç meyveden oluşuyor: 🍎🍌🍇.', 'Muz az önce geldi. Muzdan sonra ne geliyordu?'] },
      { prompt: { visual: { kind: 'pattern', items: ['🔺', '🟦', '🟦', '🔺', '🟦', '?'] } }, choices: ['🟦', '🔺', '🟢'], answer: 0, feedback: [null, 'Tekrar eden parça: 🔺🟦🟦. Üçgenden sonra iki kare gelir.', 'Yeşil daire bu örüntüde yok.'] },
      { prompt: { text: 'Örüntü büyüyor. Sırada ne var?', visual: { kind: 'pattern', items: ['🟢', '🟢🟢', '🟢🟢🟢', '?'] } }, choices: ['🟢🟢🟢🟢', '🟢🟢🟢', '🟢'], answer: 0, feedback: [null, 'Örüntü her adımda büyüyor; aynı kalmıyor.', 'Tekrar etmiyor, büyüyor! Her adımda bir tane ekleniyor.'] },
      { prompt: { text: 'Örüntü küçülüyor. Sırada ne var?', visual: { kind: 'pattern', items: ['🌸🌸🌸🌸🌸', '🌸🌸🌸🌸', '🌸🌸🌸', '?'] } }, choices: ['🌸🌸', '🌸🌸🌸🌸', '🌸🌸🌸'], answer: 0, feedback: [null, 'Örüntü azalıyor; çiçekler artmıyor.', 'Her adımda bir çiçek eksiliyor; aynı kalmıyor.'] },
      { prompt: { text: 'Aradaki boşluğa ne gelir?', visual: { kind: 'pattern', items: ['🐱', '🐶', '🐶', '🐱', '?', '🐶'] } }, choices: ['🐶', '🐱', '🐰'], answer: 0, feedback: [null, 'Kediden sonra iki köpek geliyor: 🐱🐶🐶.', 'Tavşan bu örüntüde yok.'] },
    ],
  },
  {
    id: 'g1-sayi-oruntusu',
    outcomes: ['MAT.1.1.6'],
    type: 'fill',
    stage: 'sembol',
    title: 'Artan ve azalan sayı örüntüleri',
    instructions: 'İlk adımlara bak, kuralı bul, eksik sayıyı yaz.',
    launch: { text: 'Kumbarana her gün 2 lira atıyorsun: 2, 4, 6… Dördüncü gün kumbarada kaç lira olur? 🐷' },
    reflect: 'Bir örüntünün artan mı azalan mı olduğunu nasıl anlarsın?',
    items: [
      { text: '2, 4, 6, __', answers: ['8'], hints: ['2’den 4’e kaç arttı? 4’ten 6’ya?'] },
      { text: '5, 10, 15, __', answers: ['20'], hints: ['Her adımda kaç artıyor?'] },
      { text: '20, 30, 40, __', answers: ['50'], hints: ['Onar mı artıyor?'] },
      { text: '20, 19, 18, __', answers: ['17'], hints: ['Sayılar artıyor mu, azalıyor mu?'] },
      { text: '20, 18, 16, __', answers: ['14'], hints: ['Her adımda kaç azalıyor?'] },
      { text: '11, 12, 13, __, 15', answers: ['14'] },
      { text: '10, 8, 6, __, 2', answers: ['4'], hints: ['Sayılar ikişer azalıyor.'] },
      { text: '40, 45, 50, __, 60, 65', answers: ['55'], hints: ['Beşer artıyor. 50’den 5 ileri?'] },
    ],
  },
  {
    id: 'g1-oruntu-kurali',
    outcomes: ['MAT.1.1.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kuralı söyle',
    instructions: 'Örüntünün kuralını bul. Kuralı söylemek, sıradakini bulmaktan daha güçlüdür!',
    launch: { text: 'Ece “3, 4, 5, 6” dedi, Can “5, 10, 15, 20”. İkisi de bir kurala göre sayıyor. Kurallarını bulabilir misin?' },
    reflect: 'Kendi örüntünü uydur ve kuralını söylemeden bir arkadaşına göster. Kuralı bulabildi mi?',
    questions: [
      { prompt: '2, 4, 6, 8 örüntüsünün kuralı ne?', choices: ['İkişer artıyor', 'Birer artıyor', 'İkişer azalıyor'], answer: 0, feedback: [null, 'Birer artsaydı 2’den sonra 3 gelirdi.', 'Sayılar büyüyor; azalmıyor.'] },
      { prompt: '15, 14, 13, 12 örüntüsünün kuralı ne?', choices: ['Birer azalıyor', 'Birer artıyor', 'Beşer azalıyor'], answer: 0, feedback: [null, 'Sayılar küçülüyor; artmıyor.', '15’ten 5 azalsaydı 10 gelirdi.'] },
      { prompt: '10, 20, 30, 40… Bu kuralla devam edersek hangi sayı örüntüde OLMAZ?', choices: ['45', '50', '60'], answer: 0, feedback: [null, '50, 40’tan sonra gelir: onar artıyoruz.', '60 da örüntüde var: 50’den sonra gelir.'] },
      { prompt: 'Hangi örüntüde bir HATA var?', choices: ['5, 10, 15, 21', '2, 4, 6, 8', '20, 18, 16, 14'], answer: 0, explain: 'Beşer artınca 15’ten sonra 20 gelir, 21 değil.', feedback: [null, 'Bu örüntü ikişer artıyor; hatası yok.', 'Bu örüntü ikişer azalıyor; hatası yok.'] },
      { prompt: '🔺🟦🔺🟦… örüntüsünde 8. şekil hangisi?', choices: ['🟦', '🔺'], answer: 0, feedback: [null, 'Üçgenler 1., 3., 5., 7. sırada. 8. sırada kare var.'] },
      { prompt: 'Bir binanın 1. katında 2, 2. katında 4, 3. katında 6 pencere var. Kural böyle sürerse 4. katta kaç pencere olur?', choices: ['8', '7', '10'], answer: 0, feedback: [null, 'Birer değil, ikişer artıyor.', 'Bir adım fazla gittin: 6’dan sonra 8 gelir.'] },
    ],
  },

  // MAT.1.1.7 Tahmin et
  {
    id: 'g1-sipsak-bak',
    outcomes: ['MAT.1.1.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Şipşak sayma',
    instructions: 'Noktalar bir an görünüp kaybolacak. Saymadan, bakarak söyle!',
    launch: { text: 'Zarın üstündeki noktaları saymadan tanıyabiliyorsun. Ya 7 nokta? 5’i görüp üstüne eklemek işe yarar mı?', visual: { kind: 'dots', count: 6, arrangement: 'dice' } },
    reflect: 'Noktaları tek tek saymaya vaktin yoktu. Nasıl bildin? “5 ve 2” gibi gruplar gördün mü?',
    generator: { id: 'subitize', params: { min: 1, max: 10, arrangement: 'mix', flash: 1500 }, count: 8 },
  },
  {
    id: 'g1-tahmin-et',
    outcomes: ['MAT.1.1.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Bak ve tahmin et!',
    instructions: 'Resim kısa süre görünecek. Saymaya vakit yok: 5’i ve 10’u düşünerek tahmin et.',
    launch: { text: 'Bir avuç fındığı saymadan “yaklaşık 10” diyebilir misin? Tahmin ederken bildiğimiz çokluklarla karşılaştırırız.' },
    reflect: 'Tahmin ederken neyi kullandın: 5’i mi, 10’u mu? Tahminin gerçek sayıya ne kadar yakındı?',
    fixedOrder: true,
    questions: [
      { prompt: { text: 'Yaklaşık kaç uğur böceği?', visual: { kind: 'emoji', emoji: '🐞', count: 9 } }, flash: 2500, choices: ['3', '9', '18'], answer: 1, feedback: ['3 çok az. Resimde 5’ten fazla böcek vardı.', null, '18 çok fazla. O kadar böcek iki onluk çerçeveyi neredeyse doldururdu.'] },
      { prompt: { text: 'Yaklaşık kaç çiçek?', visual: { kind: 'emoji', emoji: '🌸', count: 17 } }, flash: 2500, choices: ['5', '10', '17'], answer: 2, feedback: ['5 çok az; bir elin parmaklarından çok daha fazla çiçek vardı.', '10’dan fazlaydı: 10’luk bir grup ve yanında 7 kadar daha.', null] },
      { prompt: { text: 'Kaç top?', visual: { kind: 'emoji', emoji: '⚽', count: 4 } }, flash: 2000, choices: ['4', '12', '20'], answer: 0, feedback: [null, '12 çok fazla; 4 topu tek bakışta görürsün.', '20 çok fazla.'] },
      { prompt: { text: 'Gruplara bak. Kaç çilek?', visual: { kind: 'emoji', emoji: '🍓', count: 15, group: 5 } }, flash: 2500, choices: ['10', '15', '20'], answer: 1, feedback: ['İki değil, üç tane 5’li grup vardı.', null, 'Dört değil, üç tane 5’li grup vardı.'] },
      { prompt: { text: 'Yaklaşık kaç balık?', visual: { kind: 'emoji', emoji: '🐟', count: 12 } }, flash: 2500, choices: ['6', '12', '20'], answer: 1, feedback: ['6 çok az; resimde 10’dan fazla balık vardı.', null, '20 çok fazla; 10’u biraz geçiyordu.'] },
      { prompt: { text: 'Gruplara bak. Kaç balon?', visual: { kind: 'emoji', emoji: '🎈', count: 20, group: 10 } }, flash: 2500, choices: ['10', '15', '20'], answer: 2, feedback: ['Bir değil, iki tane 10’lu grup vardı.', '15, bir 10’lu ve bir 5’li grup olurdu. Burada iki 10’lu grup vardı.', null] },
    ],
  },
  {
    id: 'g1-tahmin-sayma',
    outcomes: ['MAT.1.1.7'],
    type: 'fill',
    stage: 'sembol',
    title: 'Tahminim ve sayımım',
    instructions: 'Tahmini sayma sonucuyla karşılaştır. Uygun sözcüğü seç.',
    launch: { text: 'Ece kavanozdaki bilyeler için “12” diye tahmin etti, sonra saydı: 15 çıktı. Tahmini iyi miydi? Az mı, çok mu kaldı?' },
    reflect: 'İyi bir tahmin tam doğru olmak zorunda mı? Yakın olması neden yeterli?',
    items: [
      { text: 'Tahminim 12, saydım 15. Tahminim saydığımdan __.', answers: ['az'], choices: ['az', 'çok', 'eşit'], hints: ['12 mi daha büyük, 15 mi?'] },
      { text: 'Tahminim 10, saydım 8. Tahminim saydığımdan __.', answers: ['çok'], choices: ['az', 'çok', 'eşit'] },
      { text: 'Tahminim 7, saydım 7. Tahminim ile sayım __.', answers: ['eşit'], choices: ['az', 'çok', 'eşit'] },
      { text: 'Tahminim 20, saydım 11. Tahminim saydığımdan __.', answers: ['çok'], choices: ['az', 'çok', 'eşit'] },
      { text: 'Tahminim 5, saydım 9. Tahminim saydığımdan __.', answers: ['az'], choices: ['az', 'çok', 'eşit'] },
      { text: 'Tahminim 10, saydım 13. Sayım tahminimden __ fazla.', answers: ['3'], choices: ['1', '2', '3', '4'], hints: ['10’dan 13’e kadar ileri say. Kaç adım attın?'] },
      { text: 'Ali 9, Ece 14 tahmin etti. Sayınca 13 çıktı. Kimin tahmini daha yakın? __', answers: ['Ece'], choices: ['Ali', 'Ece'], hints: ['9’dan 13’e kaç adım var? 14’ten 13’e kaç adım var?'], explain: '14 ile 13 arasında 1 adım, 9 ile 13 arasında 4 adım var.' },
    ],
  },
  {
    id: 'g1-tahmin-referans',
    outcomes: ['MAT.1.1.7'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bildiğinle tahmin et',
    instructions: 'Sayısını bildiğin grubu kullanarak diğerini tahmin et.',
    launch: { text: 'Küçük kavanozda 5 bilye olduğunu biliyorsun. Büyük kavanoz ondan iki kat dolu görünüyorsa içinde yaklaşık kaç bilye vardır?' },
    reflect: 'Bilinen bir çokluğu (5 ya da 10) kullanmak tahminini nasıl kolaylaştırdı?',
    questions: [
      { prompt: { text: 'Üstte 5 kurabiye var. Alttakiler yaklaşık kaç?', visual: referans('🍪', 5, 10) }, choices: ['Yaklaşık 10', 'Yaklaşık 5', 'Yaklaşık 20'], answer: 0, feedback: [null, 'Alttaki grup üsttekinden belirgin biçimde büyük; 5’ten çok.', '20 olsaydı dört tane 5’li grup sığardı. Alttakinde yaklaşık iki tane var.'] },
      { prompt: { text: 'Üstte 10 balon var. Alttakiler yaklaşık kaç?', visual: referans('🎈', 10, 5) }, choices: ['Yaklaşık 5', 'Yaklaşık 10', 'Yaklaşık 15'], answer: 0, feedback: [null, 'Alttaki grup üsttekinin yarısı kadar görünüyor.', 'Alttaki grup üsttekinden büyük değil, küçük.'] },
      { prompt: { text: 'Üstte 5 yıldız var. Alttakiler yaklaşık kaç?', visual: referans('⭐', 5, 15) }, choices: ['Yaklaşık 15', 'Yaklaşık 5', 'Yaklaşık 8'], answer: 0, feedback: [null, 'Alttaki grup üsttekinden çok daha büyük.', 'Alttakinde üç tane 5’li grup kadar yıldız var gibi görünüyor.'] },
      { prompt: 'Bir avuçta yaklaşık kaç fındık olur? 🌰', choices: ['Yaklaşık 10', 'Yaklaşık 1', 'Yaklaşık 100'], answer: 0, feedback: [null, 'Bir avuca birden çok fındık sığar.', '100 fındık bir avuca sığmaz; bir kâse dolusu olur.'] },
      { prompt: 'Kavanozda 13 misket var. Can “yaklaşık 20”, Elif “yaklaşık 10” dedi. Kimin tahmini daha yakın?', choices: ['Elif', 'Can'], answer: 0, feedback: [null, '13, 10’a 3 adım, 20’ye 7 adım uzaklıkta.'] },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ───────────────────────────────────────────

  // MAT.1.1.8 Uzunluk ve ağırlık
  {
    id: 'g1-kac-kup-tartar',
    outcomes: ['MAT.1.1.8'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kaç küp ağırlığında?',
    instructions: 'Kutunun değerini değiştirerek teraziyi dengele. Önce tahmin et, sonra dene!',
    launch: { text: 'Tahterevallide ağır olan taraf aşağı iner. Eşit kollu terazide de öyle ⚖️. Bir oyuncağın kaç küp ağırlığında olduğunu, terazi dengelenince anlarız.', visual: terazi('🧸', '🧊🧊🧊', 0) },
    reflect: 'Terazi dengede olduğunda iki kefe için ne söyleyebiliriz? Tahminin ölçümüne yakın mıydı?',
    tool: 'balance',
    tasks: [
      { prompt: 'Sol kefede bir oyuncak kutusu (x), sağ kefede 6 küp var. Kutu kaç küp ağırlığında olursa terazi dengede kalır?', target: { a: 1, b: 0, c: 6 }, hints: ['Sağ kefede kaç küp var? Dengede olunca iki taraf aynı ağırlıktadır.'] },
      { prompt: 'Sol kefede kutu ve 2 küp, sağ kefede 7 küp var. Kutu kaç küp ağırlığında?', target: { a: 1, b: 2, c: 7 }, hints: ['Önce tahmin et! Sonra iki kefeden de birer küp çıkarmayı dene.'], explain: 'Kutu 5 küp ağırlığında: 5 ve 2, 7 eder.' },
      { prompt: 'Sol kefede iki aynı kutu, sağ kefede 8 küp var. Bir kutu kaç küp ağırlığında?', target: { a: 2, b: 0, c: 8 }, hints: ['İki kutu 8 küp ediyorsa bir kutu kaç küp eder? İkizleri düşün.'] },
    ],
  },
  {
    id: 'g1-uzun-kisa',
    outcomes: ['MAT.1.1.8'],
    type: 'quiz',
    stage: 'model',
    title: 'Uzun mu, kısa mı? Ağır mı, hafif mi?',
    instructions: 'Resme dikkatle bak ve karşılaştır.',
    launch: { text: 'Kardeşinle sırt sırta durunca kimin daha uzun olduğunu nasıl anlarsınız? Ayaklarınız aynı yerde mi olmalı?' },
    reflect: 'İki şeyin uzunluğunu karşılaştırırken neden uçlarını aynı hizaya getirmeliyiz?',
    questions: [
      { prompt: { text: 'Hangi kurdele daha UZUN?', visual: ikiSerit([10, 120, '#ef4444'], [64, 104, '#3b82f6']) }, choices: ['🔴 Kırmızı', '🔵 Mavi', 'İkisi eşit'], answer: 0, feedback: [null, 'Mavinin ucu daha sağda ama başlangıcı da daha sağda! Karşılaştırmak için kurdelelerin başlarını aynı hizaya getirmeliyiz.', 'Başlarını aynı yere koyarsak biri diğerinden taşar.'] },
      { prompt: { text: 'Hangi kurdele daha KISA?', visual: ikiSerit([10, 100, '#facc15'], [10, 150, '#22c55e']) }, choices: ['Üstteki', 'Alttaki', 'İkisi eşit'], answer: 0, feedback: [null, 'Alttaki daha uzun: başları aynı hizada, sağda taşan o.', 'Başları aynı hizada ama biri daha ileri uzanıyor.'] },
      { prompt: { text: 'Hangisi daha AĞIR?', visual: terazi('🍉', '🍓', -1) }, choices: ['🍉 Karpuz', '🍓 Çilek'], answer: 0, feedback: [null, 'Terazide aşağı inen kefe daha ağırdır. Karpuzun kefesi aşağıda.'] },
      { prompt: { text: 'Hangisi daha AĞIR?', visual: terazi('🎈', '🪨', 1) }, choices: ['🪨 Taş', '🎈 Balon'], answer: 0, feedback: [null, 'Balon büyük ama hafif! Büyük görünmek ağır olmak demek değil. Aşağı inen kefe taşınki.'] },
      { prompt: { text: 'Terazi dengede. Ne söyleyebiliriz?', visual: terazi('🍎', '🍐', 0) }, choices: ['Elma ile armut eşit ağırlıkta', 'Elma daha ağır', 'Armut daha ağır'], answer: 0, feedback: [null, 'Elmanın kefesi aşağı inmemiş; terazi dümdüz.', 'Armudun kefesi de aşağı inmemiş; iki taraf eşit.'] },
      { prompt: 'Hangisi daha UZUN?', choices: ['🦒 Zürafa', '🐈 Kedi'], answer: 0, feedback: [null, 'Kedi, zürafanın bacağı kadar bile uzun değildir.'] },
    ],
  },
  {
    id: 'g1-dogru-olcum',
    outcomes: ['MAT.1.1.8'],
    type: 'quiz',
    stage: 'model',
    title: 'Ataşla ölç',
    instructions: 'Birimlerin nasıl dizildiğine dikkat et.',
    launch: { text: 'Cetvelin yok ama bir kutu ataşın var 📎. Kaleminin uzunluğunu ataşlarla nasıl ölçersin? Ataşları nasıl dizmelisin?', visual: olcum(5, 5) },
    reflect: 'Ölçerken ataşları neden boşluk bırakmadan ve üst üste bindirmeden dizmeliyiz?',
    questions: [
      { prompt: { text: 'Kalem kaç ataş uzunluğunda?', visual: olcum(5, 5) }, choices: ['5 ataş', '4 ataş', '6 ataş'], answer: 0, feedback: [null, 'Ataşları bir daha say; birini atlamış olabilirsin.', 'Bir ataşı iki kez saymış olabilirsin.'] },
      { prompt: 'Hangi ölçüm DOĞRU yapılmış?', choices: [{ visual: olcum(5, 5) }, { visual: olcum(5, 4, 'bosluk') }, { visual: olcum(5, 7, 'ust') }, { visual: olcum(5, 5, 'kayik') }], answer: 0, feedback: [null, 'Ataşların arasında boşluk var. Boşluklar ölçülmeden kalır, sonuç az çıkar.', 'Ataşlar üst üste binmiş. Aynı yeri iki kez ölçünce sonuç fazla çıkar.', 'Ölçmeye kalemin başından başlanmamış. Başlangıç noktaları aynı hizada olmalı.'] },
      { prompt: { text: 'Aynı kalemi ataşla ve silgiyle ölçtük. Hangisiyle ölçünce sayı DAHA BÜYÜK çıkar?', visual: ATAS_SILGI }, choices: ['Ataşla', 'Silgiyle', 'İkisi aynı çıkar'], answer: 0, feedback: [null, 'Silgi ataştan uzun. Uzun birimden daha az tane gerekir.', 'Birimler farklı uzunlukta olduğu için sayılar da farklı çıkar.'] },
      { prompt: 'Masa 4 karış, kitap 1 karış geldi. Hangisi daha uzun?', choices: ['Masa', 'Kitap', 'Bilemeyiz'], answer: 0, feedback: [null, 'Kitap 1 karış, masa 4 karış: masa daha çok karış tutuyor.', 'Aynı birimle ölçtüğümüz için karşılaştırabiliriz.'] },
      { prompt: 'Ali sırayı kendi karışıyla ölçtü: 6 karış. Öğretmeni kendi karışıyla ölçtü: 4 karış. Neden farklı çıktı?', choices: ['Öğretmenin karışı daha büyük', 'Sıra uzayıp kısaldı', 'Biri mutlaka yanlış saydı'], answer: 0, feedback: [null, 'Sıra hep aynı uzunlukta. Değişen, ölçtüğümüz birim.', 'İkisi de doğru saymış olabilir. Karışları farklı uzunlukta!'] },
    ],
  },
  {
    id: 'g1-boy-sirala',
    outcomes: ['MAT.1.1.8'],
    type: 'sort',
    stage: 'sembol',
    title: 'Ölçümlere göre sırala',
    instructions: 'Ölçüm sonuçlarına bak ve sırala.',
    launch: { text: 'Sınıfta herkes bir eşyasını ölçtü. Sonuçları kullanarak eşyaları kısadan uzuna dizebilir miyiz?' },
    reflect: 'Sıralarken nesnenin görünüşüne mi, ölçüm sayısına mı baktın? Hangisi daha güvenilir?',
    rounds: [
      { prompt: 'Hepsi ataşla ölçüldü. Kısadan uzuna sırala.', items: ['🧽 Silgi: 2 ataş', '✏️ Kalem: 6 ataş', '📘 Kitap: 8 ataş', '📏 Cetvel: 10 ataş'], ends: ['En kısa', 'En uzun'] },
      { prompt: 'Her biri kaç küple dengelendi? Hafiften ağıra sırala.', items: ['✏️ Kalem: 2 küp', '🍎 Elma: 5 küp', '📘 Kitap: 9 küp', '🎒 Çanta: 15 küp'], ends: ['En hafif', 'En ağır'] },
      { prompt: 'Büyük ama hafif olabilir! Hafiften ağıra sırala.', items: ['🎈 Balon: 1 küp', '🍊 Portakal: 4 küp', '🪨 Taş: 12 küp'], ends: ['En hafif', 'En ağır'], explain: 'Büyük olan her zaman daha ağır değildir. Balon büyük ama en hafif.' },
      { prompt: 'Hepsi adımla ölçüldü. Kısadan uzuna sırala.', items: ['🚪 Kapının genişliği: 1 adım', '🟫 Halı: 3 adım', '🏫 Sınıf: 8 adım', '🛣️ Koridor: 20 adım'], ends: ['En kısa', 'En uzun'] },
    ],
  },
  {
    id: 'g1-uygun-arac',
    outcomes: ['MAT.1.1.8'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangi araçla ölçelim?',
    instructions: 'Duruma en uygun ölçme aracını ya da en akla yatkın tahmini seç.',
    launch: { text: 'Sınıf kapısının genişliğini ataşla ölçmek ister misin? Neden? Ölçeceğimiz şeye göre uygun bir birim seçmeliyiz.' },
    reflect: 'Ölçeceğin şey büyüdükçe hangi birimi seçersin? Neden?',
    questions: [
      { prompt: 'Sınıfın uzunluğunu ölçmek için en uygun birim hangisi?', choices: ['👣 Adım', '📎 Ataş', '🤏 Parmak'], answer: 0, feedback: [null, 'Ataşla da ölçülür ama yüzlerce ataş gerekir; çok uzun sürer.', 'Parmakla ölçmek çok uzun sürer. Uzun yerler için uzun birim seç.'] },
      { prompt: 'Silginin uzunluğunu ölçmek için en uygun birim hangisi?', choices: ['📎 Ataş', '👣 Adım', '🛏️ Yatak boyu'], answer: 0, feedback: [null, 'Silgi bir adımdan çok kısa; adımla ölçemeyiz.', 'Yatak silgiden çok çok uzun!'] },
      { prompt: 'Bir kalemin kaç küp ağırlığında olduğunu bulmak için ne kullanırız?', choices: ['⚖️ Eşit kollu terazi', '📏 Cetvel', '✋ Karış'], answer: 0, feedback: [null, 'Cetvel uzunluk ölçer, ağırlık değil.', 'Karış uzunluk ölçer, ağırlık değil.'] },
      { prompt: 'Sıran yaklaşık kaç karış olabilir? Önce tahmin et!', choices: ['Yaklaşık 5 karış', 'Yaklaşık 1 karış', 'Yaklaşık 100 karış'], answer: 0, feedback: [null, 'Bir karış senin elin kadar; sıra ondan çok daha uzun.', '100 karış sınıfın boyundan bile uzun olurdu!'] },
      { prompt: 'Ece sıranın 6 karış olduğunu tahmin etti. Ölçünce 8 karış çıktı. Tahmini için ne söylersin?', choices: ['Ölçümden biraz az ama yakın', 'Ölçümden çok fazla', 'Ölçümle eşit'], answer: 0, feedback: [null, '6, 8’den azdır; fazla değil.', '6 ile 8 eşit değil; aralarında 2 karış var.'] },
      { prompt: 'Futbol topu ile pinpon topunu terazide karşılaştırsak ne olur? ⚽🏓', choices: ['Futbol topunun kefesi aşağı iner', 'Terazi dengede kalır', 'Pinpon topunun kefesi aşağı iner'], answer: 0, feedback: [null, 'İkisi de yuvarlak ama aynı ağırlıkta değil. Elinde tutsan hangisi kolunu daha çok çeker?', 'Pinpon topu çok hafiftir; futbol topu daha ağırdır.'] },
    ],
  },
  {
    id: 'g1-hangisi-farkli-olcu',
    outcomes: ['MAT.1.1.8'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Dört ölçme aracı ve dört nesne var. Her biri bir yönüyle diğerlerinden farklı. Sen hangisini seçersin?' },
    reflect: 'Büyük bir şey her zaman ağır mıdır? Bir örnekle anlat.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['✋ Karış', '👣 Adım', '📎 Ataş', '⚖️ Terazi'],
        answer: 0,
        reasons: ['Elimizle yaptığımız tek ölçü.', 'Ayağımızla yaptığımız ve en uzun olan tek birim; koridor gibi uzun yerlere uygun.', 'Herkes için aynı uzunlukta olan tek uzunluk birimi; karış ve adım kişiden kişiye değişir.', 'Uzunluğu değil, ağırlığı karşılaştıran tek araç.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['🎈 Balon', '🪨 Taş', '🪶 Tüy', '🍉 Karpuz'],
        answer: 0,
        reasons: ['Büyük ama hafif olan tek nesne.', 'Küçük ama ağır olan tek nesne.', 'Hem küçük hem hafif olan tek nesne.', 'Hem büyük hem ağır olan tek nesne.'],
      },
    ],
  },

  // ── İşlemlerden Cebirsel Düşünmeye ──────────────────────────────────────

  // MAT.1.2.1 Toplama ve çıkarma
  {
    id: 'g1-hikaye-canlandir',
    outcomes: ['MAT.1.2.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Hikâyeyi sayaçlarla canlandır',
    instructions: 'Hikâyeyi oku. Çerçevede sayaç ekleyerek ya da çıkararak canlandır.',
    launch: { text: 'Kümeste 4 tavuk vardı, 3 tavuk daha geldi 🐔. Şimdi kaç tavuk var? Bunu sayaçlarla canlandırabiliriz.' },
    reflect: 'Hikâyede sayaç eklediğin ve çıkardığın yerler hangileriydi? Hangi sözcükler sana ipucu verdi?',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: 'Kümeste 4 tavuk vardı, 3 tavuk daha geldi. Şimdi kaç tavuk var?', target: { count: 7 }, hints: ['Önce 4 sayaç koy. Gelen tavuklar için ne yaparsın?'], explain: 'Tavuklar gelince sayı arttı: 4 + 3 = 7.' },
      { prompt: 'Dalda 9 kuş vardı, 3’ü uçtu. Dalda kaç kuş kaldı?', target: { count: 6 }, hints: ['Önce 9 sayaç koy. Uçan kuşlar için sayaçları ne yaparsın?'], explain: 'Kuşlar gidince sayı azaldı: 9 − 3 = 6.' },
      { prompt: 'Ece’nin 12 boncuğu vardı, 5 boncuk daha aldı. Kaç boncuğu oldu?', target: { count: 17 }, hints: ['12’yi bir dolu çerçeve ve 2 sayaçla göster. Sonra 5 ekle.'], explain: '12 + 5 = 17. Onluk aynı kaldı, birlikler 2’den 7’ye çıktı.' },
      { prompt: 'Sepette 16 yumurta vardı, 4’ü kırıldı. Kaç sağlam yumurta kaldı?', target: { count: 12 }, explain: '16 − 4 = 12. Onluğa dokunmadan birliklerden çıkardık.' },
    ],
  },
  {
    id: 'g1-toplama-resimli',
    outcomes: ['MAT.1.2.1'],
    type: 'fill',
    stage: 'model',
    title: 'Resimli toplama ve çıkarma',
    instructions: 'Resme bak, ne olduğunu düşün, işlemi tamamla.',
    launch: { text: 'Bir resim bir hikâye anlatır: Biri geldi mi, biri gitti mi? Resme bakıp işlemi yazalım.' },
    reflect: '7 + 0 ile 8 − 8 sence neden özel? 0 toplamada ve çıkarmada ne yapıyor?',
    items: [
      { text: '3 + 2 = __', answers: ['5'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🐥', count: 3 }, { emoji: '🐥', count: 2 }], separator: '+' }, hints: ['Kaç civciv vardı, kaç tane geldi?'] },
      { text: '6 − 2 = __', answers: ['4'], visual: { kind: 'tape', parts: [{ label: '?', value: 4 }, { label: '2 uçtu', value: 2 }], total: '6 balon' }, hints: ['6 balondan 2’si uçtu. Geriye kaç balon kaldı?'] },
      { text: '7 + 0 = __', answers: ['7'], visual: { kind: 'emoji', emoji: '🍪', count: 7 }, hints: ['Tabağa hiç kurabiye eklenmedi. Sayı değişir mi?'], explain: 'Bir sayıya 0 eklemek sayıyı değiştirmez.' },
      { text: '8 − 8 = __', answers: ['0'], visual: { kind: 'emoji', emoji: '🍎', count: 8 }, hints: ['8 elmanın hepsini yersek kaç elma kalır?'], explain: 'Bir sayıdan kendisini çıkarınca geriye hiç kalmaz: 0.' },
      { text: '5 + 4 = __', answers: ['9'], visual: { kind: 'tenframe', filled: 5, add: 4, size: 10 }, hints: ['Kırmızılar 5. Mavileri ekleyerek say: 6, 7, …'] },
      { text: '13 + 4 = __', answers: ['17'], visual: { kind: 'tenframe', filled: 13, add: 4, size: 20 }, hints: ['Bir dolu çerçeve 10. Kalan sayaçlar 3 ve 4.'] },
      { text: '15 − 3 = __', answers: ['12'], visual: { kind: 'tape', parts: [{ label: '?', value: 12 }, { label: '3', value: 3 }], total: '15' }, hints: ['15’ten geriye 3 say: 14, 13, …'] },
      { text: '9 − 0 = __', answers: ['9'], hints: ['Hiçbir şey çıkarmazsak ne olur?'], explain: 'Bir sayıdan 0 çıkarınca sayı aynı kalır.' },
    ],
  },
  {
    id: 'g1-toplama-20',
    outcomes: ['MAT.1.2.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Onluğu koru: toplama ve çıkarma',
    instructions: 'Onluğa dokunmadan birlikleri topla ya da çıkar.',
    launch: { text: 'Bir paket 10 kalem 📦 ve 3 tane de tek kalemin var. 4 kalem daha alınca paket değişir mi, yoksa yalnız tek kalemler mi artar?', visual: { kind: 'blocks', tens: 1, ones: 3 } },
    reflect: '13 + 4’ü yaparken onluğa neden dokunmadın? Bir arkadaşına anlat.',
    items: [
      { text: '13 + 4 = __', answers: ['17'], hints: ['13 = 10 ve 3. Birlikleri topla: 3 + 4 kaç?'], explain: '10 + 3 + 4 = 10 + 7 = 17' },
      { text: '11 + 5 = __', answers: ['16'], hints: ['Birlikler: 1 + 5 kaç?'] },
      { text: '2 + 16 = __', answers: ['18'], hints: ['Büyük sayıdan başla: 16’dan 2 ileri say.'], explain: 'Toplananların yeri değişse de toplam değişmez: 2 + 16 = 16 + 2.' },
      { text: '12 + 7 = __', answers: ['19'] },
      { text: '18 − 5 = __', answers: ['13'], hints: ['18 = 10 ve 8. Birliklerden 5 çıkar.'] },
      { text: '17 − 7 = __', answers: ['10'], hints: ['17’nin kaç birliği var? Hepsini çıkarınca ne kalır?'] },
      { text: '19 − 4 = __', answers: ['15'] },
      { text: '20 − 10 = __', answers: ['10'], hints: ['20 iki onluktur. Bir onluk çıkarınca ne kalır?'] },
    ],
  },
  {
    id: 'g1-artma-azalma',
    outcomes: ['MAT.1.2.1'],
    type: 'categorize',
    stage: 'problem',
    title: 'Toplama mı, çıkarma mı?',
    instructions: 'Hikâyeyi oku. Sayı artıyorsa “Toplama”, azalıyorsa “Çıkarma” grubuna koy.',
    launch: { text: 'Bir hikâyede sayı artıyorsa mı toplarız, azalıyorsa mı? “Geldi, aldı”, “gitti, yedi” gibi sözcükler ipucu verir ama hep yeterli midir?' },
    reflect: '“Verdi” sözcüğü bir hikâyede toplama, başka bir hikâyede çıkarma olabilir mi? Örnek ver.',
    categories: [
      { id: 'top', label: 'Toplama ➕', color: '#22c55e' },
      { id: 'cik', label: 'Çıkarma ➖', color: '#3b82f6' },
    ],
    items: [
      { content: 'Bahçede 6 kedi vardı, 3 kedi daha geldi.', category: 'top', explain: 'Kediler geldi; sayı arttı.' },
      { content: 'Ece’nin 10 balonu vardı, 4’ü patladı.', category: 'cik', explain: 'Balonlar patladı; sayı azaldı.' },
      { content: 'Can’ın 8 bilyesi vardı. Annesi ona 5 bilye daha verdi.', category: 'top', explain: '“Verdi” dese de Can’ın bilyeleri arttı.' },
      { content: 'Ali 12 kaleminden 2’sini arkadaşına verdi.', category: 'cik', explain: 'Ali kalem verdi; onun kalemleri azaldı.' },
      { content: 'Otobüste 15 kişi vardı, durakta 4 kişi indi.', category: 'cik', explain: 'İnenler otobüsten ayrıldı; sayı azaldı.' },
      { content: 'Kumbarada 11 lira vardı, 7 lira daha attım.', category: 'top', explain: 'Kumbaradaki para arttı.' },
      { content: 'Tabakta 9 kurabiye vardı, 9’unu da yedik.', category: 'cik', explain: 'Hepsini yedik: 9 − 9 = 0.' },
      { content: 'Rafta 13 kitap vardı. Öğretmen 5 kitap daha koydu.', category: 'top', explain: 'Rafa kitap eklendi; sayı arttı.' },
      { content: 'Daldaki 14 kuştan 3’ü uçup gitti.', category: 'cik', explain: 'Kuşlar gitti; daldakiler azaldı.' },
    ],
  },

  // MAT.1.2.2 Zihinden işlem ve tahmin
  {
    id: 'g1-zihinden-zipla',
    outcomes: ['MAT.1.2.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Büyükten başla, akıllı zıpla',
    instructions: 'Sayı doğrusunda stratejiye göre zıpla ve vardığın sayıya dokun.',
    launch: { text: '2 + 9 işleminde 2’den 9 adım mı zıplamak kolay, 9’dan 2 adım mı? Akıllı bir başlangıç noktası seçelim.' },
    reflect: 'Hangi zıplama yolu sana daha kolay geldi? Neden 10’da durmak işe yarıyor?',
    tool: 'numberline',
    config: { min: 0, max: 20, step: 1 },
    tasks: [
      { prompt: '2 + 9: Büyük sayıdan başla ve zıpla. Nereye varırsın?', target: { value: 11 }, hints: ['Hangi sayı daha büyük? Oradan başla.', '9’dan 2 adım ileri: 10, …'], explain: '2 + 9 = 9 + 2 = 11. Toplananların yeri değişince toplam değişmez.' },
      { prompt: '8 + 5: Önce 10’a kadar zıpla, sonra kalanı ekle.', target: { value: 13 }, hints: ['8’den 10’a kaç adım var?', '5 adımın 2’sini kullandın. Kaç adım kaldı?'], explain: '8 + 2 = 10, 10 + 3 = 13.' },
      { prompt: '13 − 3: Geriye zıpla. Nereye varırsın?', target: { value: 10 }, hints: ['13’ten geriye üç adım: 12, 11, …'] },
      { prompt: '14 − 6: Önce 10’a kadar geri zıpla, sonra kalanı çıkar.', target: { value: 8 }, hints: ['14’ten 10’a kaç adım geri gidersin?', '6 adımın 4’ünü kullandın. Kaç adım daha geri gideceksin?'], explain: '14 − 4 = 10, 10 − 2 = 8.' },
    ],
  },
  {
    id: 'g1-ona-tamamla',
    outcomes: ['MAT.1.2.2'],
    type: 'fill',
    stage: 'model',
    title: '10’a tamamla, sonra ekle',
    instructions: 'Kırmızılar 10’a tamamlanınca kaç mavi kalır? Önce 10’dan sonrasını, sonra toplamı yaz.',
    launch: { text: 'Yumurta kolisinde 8 yumurta var, 5 yumurta daha geldi 🥚. Önce koliyi doldurup kalanları yanına koyarsan saymak kolaylaşır mı?', visual: { kind: 'tenframe', filled: 8, add: 5, size: 20 } },
    reflect: '8 + 5 yerine neden 10 + 3 yapabiliriz? Bir arkadaşına anlat.',
    generator: { id: 'makeTen', params: { split: true }, count: 6 },
  },
  {
    id: 'g1-ikizler',
    outcomes: ['MAT.1.2.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'İkizler ve ikizlere yakın',
    instructions: 'İkizleri biliyorsan ikizlere yakın toplamları da bulabilirsin!',
    launch: { text: 'Bir kutuda iki sıra yumurta var, her sırada 6 tane 🥚. 6 + 6’yı biliyorsan 6 + 7’yi nasıl bulursun?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔵', count: 6 }, { emoji: '🔵', count: 6 }], separator: '+' } },
    reflect: '7 + 8’i bilmiyorsan hangi ikizden yardım alırsın? Başka bir yol var mı?',
    generator: { id: 'doubles', params: { max: 9, near: true }, count: 8 },
  },
  {
    id: 'g1-islem-eslestir',
    outcomes: ['MAT.1.2.2'],
    type: 'match',
    stage: 'sembol',
    title: 'İşlemin öğeleri',
    instructions: 'Her öğenin adını işlemdeki sayısıyla eşleştir.',
    launch: { text: '“11 + 7 = 18” işleminde her sayının bir görevi ve adı var: 11 ile 7 toplanan, 18 toplam. Çıkarmada da öyle: eksilen, çıkan, fark.' },
    reflect: 'Toplam, toplananlardan küçük olabilir mi? Fark ile eksilen arasında nasıl bir ilişki var?',
    pairs: [
      { left: '4 + 5 = 9 işleminde TOPLAM', right: '9' },
      { left: '16 − 3 = 13 işleminde EKSİLEN', right: '16' },
      { left: '16 − 3 = 13 işleminde ÇIKAN', right: '3' },
      { left: '16 − 3 = 13 işleminde FARK', right: '13' },
      { left: '11 + 7 = 18 işleminde TOPLAM', right: '18' },
      { left: '8 − 6 = 2 işleminde FARK', right: '2' },
    ],
    perRound: 6,
  },
  {
    id: 'g1-tahmin-islem',
    outcomes: ['MAT.1.2.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Önce tahmin et, sonra düşün',
    instructions: 'Hesaplamadan önce tahmin et. Sonucun mantıklı olup olmadığını düşün.',
    launch: { text: 'Can 6 + 5’e “15” dedi. Hesaplamadan bile bunun çok olduğunu anlayabilir misin? 5 + 5’i biliyorsun!' },
    reflect: 'Tahmin etmek, bir işlemin doğru olup olmadığını kontrol etmene nasıl yardım eder?',
    questions: [
      { prompt: '8 + 7’nin sonucu 10’dan çok mu, az mı?', choices: ['10’dan çok', '10’dan az'], answer: 0, feedback: [null, '8’e 2 eklesen bile 10 olur. 7 eklersen 10’u geçersin.'] },
      { prompt: '12 − 2’nin sonucu 12’den çok mu, az mı?', choices: ['12’den az', '12’den çok'], answer: 0, feedback: [null, 'Çıkarınca bir şeyler eksilir. Sonuç, başladığın sayıdan büyük olamaz.'] },
      { prompt: 'Can 6 + 5 = 15 buldu. Bu sonuç mantıklı mı?', choices: ['Hayır, çok fazla: 5 + 5 = 10, bir fazlası 11', 'Evet, doğru'], answer: 0, feedback: [null, '5 + 5 = 10. 6 + 5 bundan yalnızca 1 fazla olmalı.'] },
      { prompt: '9 + 4’ü zihinden nasıl yaparsın?', choices: ['9’a 1 ver, 10 olsun; kalan 3’ü ekle: 13', '9 ile 4’ü yan yana yaz: 94', '9 − 4 = 5'], answer: 0, feedback: [null, 'Rakamları yan yana yazmak toplamak değildir. 9 ile 4’ü birleştirince 20’yi bile geçmez.', 'Toplamayı çıkarma gibi okumuşsun. Toplarken sayı büyür.'] },
      { prompt: '15 − 4 için hangi strateji işe yarar?', choices: ['15’ten geriye 4 say: 14, 13, 12, 11', '15’e 4 ekle', '15’ten 10 çıkar'], answer: 0, feedback: [null, 'Eklemek sonucu büyütür; oysa çıkarınca azalmalı.', '4’ü çıkaracağız, 10’u değil.'] },
      { prompt: '7 + 6 ile 6 + 7 aynı mı?', choices: ['Evet, toplananların yeri değişince toplam değişmez', 'Hayır, farklı sonuç verir'], answer: 0, feedback: [null, 'İki tabağın yerini değiştirsen içlerindeki kurabiye sayısı değişir mi? 7 + 6 = 6 + 7 = 13.'] },
      { prompt: 'Hangisinin sonucu 20’ye en yakın?', choices: ['10 + 9', '10 + 5', '10 + 1'], answer: 0, feedback: [null, '10 + 5 = 15; 20’ye 5 adım var.', '10 + 1 = 11; 20’ye çok uzak.'] },
    ],
  },

  // MAT.1.2.3 Eşittir işareti
  {
    id: 'g1-terazi',
    outcomes: ['MAT.1.2.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Teraziyi dengele',
    instructions: 'Kutunun değerini değiştir. Terazi dengeye gelince iki taraf eşittir.',
    launch: { text: 'Tahterevallide iki taraf eşit olunca tahterevalli dümdüz durur ⚖️. Eşittir işareti de “iki taraf aynı değerde” demektir.', visual: terazi('3 + 4', '7', 0) },
    reflect: 'Terazinin dengede olması ile “=” işareti arasında nasıl bir benzerlik var?',
    tool: 'balance',
    tasks: [
      { prompt: 'Sol kefede kutu ve 3, sağ kefede 7 var. Kutu kaç olursa terazi dengede olur?', target: { a: 1, b: 3, c: 7 }, hints: ['3’e kaç eklersen 7 olur?'] },
      { prompt: 'Sol kefede kutu ve 5, sağ kefede 9 var. Kutu kaç olmalı?', target: { a: 1, b: 5, c: 9 } },
      { prompt: 'Sol kefede kutu ve 4, sağ kefede 14 var. Kutu kaç olmalı?', target: { a: 1, b: 4, c: 14 }, hints: ['4’ten 14’e kaç adım var? Onluğu düşün.'] },
      { prompt: 'Sol kefede kutu ve 2, sağ kefede 10 var. Kutu kaç olmalı?', target: { a: 1, b: 2, c: 10 }, explain: 'Kutu 8’dir: 8 ve 2, 10 eder. İki tarafta da 10 var.' },
    ],
  },
  {
    id: 'g1-esittir',
    outcomes: ['MAT.1.2.3'],
    type: 'fill',
    stage: 'model',
    title: 'Eşittirin iki yanı',
    instructions: 'Eşittir işaretinin iki yanı aynı değerde olmalı. Boşluğu doldur.',
    launch: { text: 'Sol kefede 3 ve 4, sağ kefede 5 ve bir kutu var. Terazi dengedeyse kutuda kaç olmalı?', visual: { kind: 'balance', left: ['3', '4'], right: ['5', '?'] } },
    reflect: '3 + 4 = __ + 2 sorusuna birisi 7 yazarsa ona “=” işaretini nasıl açıklarsın?',
    items: [
      { text: '3 + 4 = 5 + __', answers: ['2'], visual: { kind: 'balance', left: ['3', '4'], right: ['5', '?'] }, hints: ['Sol taraf kaç ediyor?', '5’e kaç eklersen o sayıya ulaşırsın?'], explain: '3 + 4 = 7 ve 5 + 2 = 7. İki taraf da 7.' },
      { text: '5 + 5 = 6 + __', answers: ['4'], visual: { kind: 'balance', left: ['5', '5'], right: ['6', '?'] }, hints: ['Sol taraf 10. 6’dan 10’a kaç adım var?'] },
      { text: '__ = 2 + 6', answers: ['8'], hints: ['Eşittir işareti solda da olabilir. Sağ taraf kaç ediyor?'], explain: '8 = 2 + 6 de doğru bir eşitliktir; “=” “aynı değerde” demektir.' },
      { text: '9 = 4 + __', answers: ['5'], hints: ['4’e kaç eklersen 9 olur?'] },
      { text: '7 + 1 = __ + 3', answers: ['5'], visual: { kind: 'balance', left: ['7', '1'], right: ['?', '3'] }, hints: ['Sol taraf 8. Hangi sayıya 3 eklersen 8 olur?'] },
      { text: '10 − 2 = 4 + __', answers: ['4'], hints: ['Sol taraf kaç? 4’e kaç eklersen ona ulaşırsın?'] },
      { text: '6 + 4 = 4 + __', answers: ['6'], hints: ['İki tarafta da 4 var! Diğer sayı ne olmalı?'], explain: 'Toplananların yeri değişince toplam değişmez.' },
      { text: '12 + 3 = 10 + __', answers: ['5'], hints: ['12 = 10 ve 2. Sol taraf kaç ediyor?'] },
    ],
  },
  {
    id: 'g1-dogru-yanlis-esitlik',
    outcomes: ['MAT.1.2.3'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Eşitlik doğru mu?',
    instructions: 'İki tarafın değeri aynıysa “Doğru”, farklıysa “Yanlış” grubuna koy.',
    launch: { text: 'Can “8 = 8” yazdı. Arkadaşı “Bu olmaz, işlem yok!” dedi. Sence kim haklı?' },
    reflect: '“3 + 4 = 7 + 2” neden yanlış? Bir arkadaşına teraziyi kullanarak açıkla.',
    categories: [
      { id: 'd', label: 'Doğru ✔', color: '#22c55e' },
      { id: 'y', label: 'Yanlış ✘', color: '#ef4444' },
    ],
    items: [
      { content: '4 + 3 = 7', category: 'd', explain: 'İki taraf da 7.' },
      { content: '8 = 5 + 3', category: 'd', explain: 'Eşittir işareti solda da olabilir: 8 ile 5 + 3 aynı değerde.' },
      { content: '8 = 8', category: 'd', explain: 'İki taraf aynı; işlem olmasa da eşitlik doğrudur.' },
      { content: '2 + 6 = 4 + 4', category: 'd', explain: 'İki taraf da 8 ediyor.' },
      { content: '5 + 3 = 3 + 5', category: 'd', explain: 'Toplananların yeri değişince toplam değişmez.' },
      { content: '10 − 3 = 7 + 0', category: 'd', explain: 'İki taraf da 7. 0 eklemek sayıyı değiştirmez.' },
      { content: '5 + 2 = 8', category: 'y', explain: '5 + 2 = 7; 8 değil.' },
      { content: '6 = 6 + 1', category: 'y', explain: 'Sağ taraf 7, sol taraf 6. Aynı değil.' },
      { content: '3 + 4 = 7 + 2', category: 'y', explain: '7, ilk işlemin sonucu ama eşitliğin sağ tarafı 7 + 2 = 9. İki taraf aynı değil.' },
      { content: '9 − 4 = 6', category: 'y', explain: '9 − 4 = 5; 6 değil.' },
    ],
  },
  {
    id: 'g1-hangisi-farkli-islem',
    outcomes: ['MAT.1.2.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Dört ifadeden üçü aynı değerde, ama her biri bir yönüyle farklı. “=” ile hangi ikisini birleştirebilirsin?' },
    reflect: 'Aynı değerdeki iki ifadeyi “=” ile birleştirip doğru bir eşitlik yaz. Örneğin 4 + 4 = 10 − 2.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['4 + 4', '8', '10 − 2', '5 + 2'],
        answer: 0,
        reasons: ['Aynı sayıyı iki kez toplayan tek ifade: ikizler.', 'İşlem içermeyen, yalnızca sayı olan tek ifade.', 'Çıkarma olan tek ifade.', 'Değeri 8 olmayan tek ifade: 5 + 2 = 7.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['10 + 7', '17', '19 − 2', '9 + 9'],
        answer: 0,
        reasons: ['17’yi bir onluk ve birlikleri olarak gösteren tek ifade.', 'İşlem içermeyen, yalnızca sayı olan tek ifade.', 'Çıkarma olan tek ifade.', 'Değeri 17 olmayan tek ifade: 9 + 9 = 18.'],
      },
    ],
  },

  // MAT.1.2.4 Toplama-çıkarma ilişkisi
  {
    id: 'g1-ileri-geri-don',
    outcomes: ['MAT.1.2.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'İleri git, geri dön',
    instructions: 'Kurbağanın hareketlerini izle ve istenen taşa dokun.',
    launch: { text: 'Kurbağa 5 adım ileri zıpladı, sonra fikrini değiştirip 5 adım geri döndü 🐸. Nerede olur? Toplama ile çıkarma birbirini geri alır mı?' },
    reflect: 'Kurbağanın başladığı yeri bulmak için neden ters yöne gittin?',
    tool: 'numberline',
    config: { min: 0, max: 20, step: 1 },
    tasks: [
      { prompt: 'Kurbağa 6’da. 4 adım ileri, sonra 4 adım geri zıplasın. Nereye varır?', target: { value: 6 }, explain: '6 + 4 = 10, 10 − 4 = 6. Çıkarma, toplamayı geri aldı.' },
      { prompt: 'Kurbağa 11’de. 5 adım ileri, sonra 5 adım geri zıplasın. Nereye varır?', target: { value: 11 } },
      { prompt: 'Kurbağa bir taştan 3 adım ileri zıpladı ve 10’a vardı. Nereden başlamıştı?', target: { value: 7 }, hints: ['Geri giderek düşün: 10’dan 3 adım geri.'], explain: '7 + 3 = 10 olduğu için 10 − 3 = 7.' },
      { prompt: 'Kurbağa bir taştan 4 adım geri zıpladı ve 13’e vardı. Nereden başlamıştı?', target: { value: 17 }, hints: ['Geri gittiyse, başlangıcı bulmak için hangi yöne gitmelisin?'], explain: '17 − 4 = 13 olduğu için 13 + 4 = 17.' },
    ],
  },
  {
    id: 'g1-serit-ailesi',
    outcomes: ['MAT.1.2.4'],
    type: 'fill',
    stage: 'model',
    title: 'Şerit modeli: bir bütün, iki parça',
    instructions: 'Şeride bak. Parçalar ve bütün aynı kalırken işlemleri yaz.',
    launch: { text: '8 kalemin 3’ü kırmızı, 5’i mavi. Bu durumu hem toplama hem çıkarma ile anlatabilir miyiz?', visual: { kind: 'tape', parts: [{ label: '3', value: 3 }, { label: '5', value: 5 }], total: '8' } },
    reflect: 'Bir şerit modelinden kaç farklı işlem yazabilirsin? Hepsi aynı durumu mu anlatıyor?',
    items: [
      { text: '3 + 5 = __', answers: ['8'], visual: { kind: 'tape', parts: [{ label: '3', value: 3 }, { label: '5', value: 5 }], total: '8' } },
      { text: '8 − 3 = __', answers: ['5'], visual: { kind: 'tape', parts: [{ label: '3', value: 3 }, { label: '5', value: 5 }], total: '8' }, hints: ['Bütünden 3’lük parçayı çıkarırsan hangi parça kalır?'] },
      { text: '8 − __ = 3', answers: ['5'], visual: { kind: 'tape', parts: [{ label: '3', value: 3 }, { label: '5', value: 5 }], total: '8' } },
      { text: '4 + 6 = __ ve 10 − 6 = __', answers: ['10', '4'], visual: { kind: 'tape', parts: [{ label: '4', value: 4 }, { label: '6', value: 6 }], total: '10' }, hints: ['İki parça birleşince bütün olur. Bütünden bir parça çıkınca diğer parça kalır.'] },
      { text: '12 + 5 = 17 ise 17 − 5 = __', answers: ['12'], visual: { kind: 'tape', parts: [{ label: '12', value: 12 }, { label: '5', value: 5 }], total: '17' } },
      { text: '__ + 3 = 9', answers: ['6'], visual: { kind: 'tape', parts: [{ label: '?', value: 6 }, { label: '3', value: 3 }], total: '9' }, hints: ['Bütün 9, bir parça 3. Diğer parçayı nasıl bulursun?'], explain: '9 − 3 = 6, çünkü 6 + 3 = 9.' },
      { text: '15 − __ = 11', answers: ['4'], visual: { kind: 'tape', parts: [{ label: '11', value: 11 }, { label: '?', value: 4 }], total: '15' }, hints: ['11’den 15’e kaç adım var?'] },
    ],
  },
  {
    id: 'g1-islem-ailesi',
    outcomes: ['MAT.1.2.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'İşlem ailesi',
    instructions: 'Aynı üç sayı bir aile kurar. Bir işlemi biliyorsan diğerlerini de bulabilirsin.',
    launch: { text: '3, 5 ve 8 bir aile: 3 + 5 = 8. Bu aileyle başka hangi işlemleri yazabilirsin?' },
    reflect: 'Bir çıkarma işleminin doğru olup olmadığını toplama ile nasıl kontrol edersin?',
    items: [
      { text: '3 + 5 = 8 ise 8 − 5 = __', answers: ['3'], hints: ['8’in parçaları 3 ve 5. 5’i çıkarınca hangi parça kalır?'] },
      { text: '6 + 4 = 10 ise 10 − 4 = __', answers: ['6'] },
      { text: '7 + 2 = 9 ise 9 − __ = 7', answers: ['2'] },
      { text: '12 − 1 = 11 ise 11 + 1 = __', answers: ['12'] },
      { text: '15 − 5 = 10 ise 10 + __ = 15', answers: ['5'] },
      { text: '13 + 6 = 19 ise 19 − 6 = __', answers: ['13'], explain: 'Toplama ile çıkarma birbirinin tersidir: 13’e 6 ekleyip 6 çıkarınca yine 13.' },
      { text: '__ + 4 = 18 ise 18 − 4 = 14', answers: ['14'], hints: ['18’den 4 çıkarınca 14 kalıyorsa, 4 hangi sayıya eklenince 18 olur?'] },
      { text: '16 − 6 = 10 ise 10 + 6 = __', answers: ['16'] },
    ],
  },
  {
    id: 'g1-eksik-sayi',
    outcomes: ['MAT.1.2.4'],
    type: 'fill',
    stage: 'problem',
    title: 'Hikâyede eksik sayı',
    instructions: 'Hikâyede bir sayı eksik. Toplama ile çıkarmanın ilişkisini kullanarak bul.',
    launch: { text: 'Kumbaranda bir miktar para vardı, annen 5 lira ekledi ve 17 lira oldu 🐷. Başta kaç liran vardı? Bilinmeyen sayı başta da olabilir!' },
    reflect: 'Başta kaç olduğunu bilmediğin bir hikâyede hangi işlemi kullandın? Neden?',
    items: [
      { text: 'Ali’nin bazı bilyeleri vardı. 4 bilye daha alınca 9 bilyesi oldu. Başta __ bilyesi vardı.', answers: ['5'], hints: ['Sonda 9 var. Aldığı 4 bilyeyi geri çıkarırsan başa dönersin.'], explain: '__ + 4 = 9 olduğundan 9 − 4 = 5.' },
      { text: 'Kumbarada bir miktar para vardı. Annem 5 lira ekledi, 17 lira oldu. Başta __ lira vardı.', answers: ['12'], hints: ['17’den eklenen 5 lirayı çıkar.'] },
      { text: 'Ağaçta 15 elma vardı. Birkaçı düştü, 11 elma kaldı. __ elma düştü.', answers: ['4'], hints: ['15’ten kaç çıkarırsan 11 kalır?', '11’den 15’e kaç adım var?'] },
      { text: 'Sınıfta 8 kız var. Kızlar ve erkekler birlikte 18 kişi. Sınıfta __ erkek var.', answers: ['10'], hints: ['Bütün 18, bir parça 8. Diğer parça kaç?'] },
      { text: 'Ece’nin 16 çıkartması vardı. Birkaçını verdi, 13 kaldı. __ çıkartma verdi.', answers: ['3'] },
      { text: 'Otobüse 6 kişi bindi, otobüste 19 kişi oldu. Önceden __ kişi vardı.', answers: ['13'], hints: ['Binenleri geri indirirsen kaç kişi kalır?'] },
      { text: 'Tabakta bazı kurabiyeler vardı. 2’sini yedik, 7 kaldı. Başta __ kurabiye vardı.', answers: ['9'], hints: ['Yediklerimizi geri koysak kaç olur?'] },
    ],
  },

  // ── Sayılar ve Nicelikler (3) ───────────────────────────────────────────

  // MAT.1.1.9 Paralarımız
  {
    id: 'g1-cuzdan',
    outcomes: ['MAT.1.1.9'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Cüzdanı doldur',
    instructions: 'İstenen tutarı paralarla oluştur.',
    launch: { text: 'Kırtasiyede bir defter 10 lira 📒. Cebinde yalnızca 5 liralıklar varsa defteri alabilir misin? Aynı tutarı farklı paralarla ödeyebiliriz.' },
    reflect: '10 lirayı kaç farklı yolla oluşturdun? Hangisinde en az para kullandın?',
    tool: 'money',
    config: { coins: [1, 5, 10, 20] },
    tasks: [
      { prompt: 'Cüzdana 6 lira koy.', target: { total: 6 }, hints: ['Hangi iki para 6 eder?'] },
      { prompt: 'Cüzdana yalnızca 5 liralıklar kullanarak 10 lira koy.', target: { total: 10 }, explain: 'İki tane 5 lira, bir tane 10 liraya eşittir.' },
      { prompt: 'Cüzdana 15 lira koy.', target: { total: 15 }, hints: ['10 liraya kaç lira daha eklersen 15 olur?'] },
      { prompt: 'Cüzdana 20 lira koy. Kaç farklı yolla yapabilirsin?', target: { total: 20 }, explain: '20 lira; bir 20’lik, iki 10’luk ya da dört 5’lik olabilir.' },
    ],
  },
  {
    id: 'g1-paralarimiz',
    outcomes: ['MAT.1.1.9'],
    type: 'quiz',
    stage: 'model',
    title: 'Paralarımızı tanıyalım',
    instructions: 'Paralara dikkatle bak ve soruyu cevapla.',
    launch: { text: 'Paranın üstünde yazan sayı onun değerini söyler. “₺” işaretini ve “TL” kısaltmasını gördün mü?', visual: { kind: 'money', items: [1, 5, 10] } },
    reflect: 'Para sayısı çok olan bir cüzdanda her zaman daha çok para mı vardır? Neden?',
    questions: [
      { prompt: { text: 'Bu para kaç lira?', visual: { kind: 'money', items: [10] } }, choices: ['10 TL', '1 TL', '100 TL'], answer: 0, feedback: [null, 'Üstünde 1’in yanında bir 0 var: on.', '100’de iki tane 0 olurdu.'] },
      { prompt: { text: 'Bu para kaç lira?', visual: { kind: 'money', items: [50] } }, choices: ['50 TL', '5 TL', '20 TL'], answer: 0, feedback: [null, '5’in yanında bir 0 var: elli.', 'Üstündeki sayıya bir daha bak: 5 ve 0.'] },
      { prompt: { text: 'Bu para kaç lira?', visual: { kind: 'money', items: [200] } }, choices: ['200 TL', '20 TL', '2 TL'], answer: 0, feedback: [null, '2’nin yanında iki tane 0 var: iki yüz.', '2 TL diye bir kâğıt para yok; burada iki yüz yazıyor.'] },
      { prompt: 'Hangisi daha değerli?', choices: [{ visual: { kind: 'money', items: [1, 1, 1] } }, { visual: { kind: 'money', items: [5] } }], answer: 1, feedback: ['Üç para daha çok görünüyor ama her biri 1 lira: hepsi 3 lira eder. 5 lira daha değerli.', null] },
      { prompt: 'Hangisi daha değerli?', choices: [{ visual: { kind: 'money', items: [100] } }, { visual: { kind: 'money', items: [20] } }], answer: 0, feedback: [null, '20 lira, 100 liradan azdır. Paranın üstündeki sayıya bak.'] },
      { prompt: '“₺” işareti ne demek?', choices: ['Türk lirası', 'Kuruş', 'Dolar'], answer: 0, feedback: [null, 'Kuruş, liradan küçük bir birimdir.', 'Bizim paramız Türk lirasıdır. ₺ onun simgesidir.'] },
      { prompt: '1 TL madenî para mı, kâğıt para mı?', choices: ['Madenî para', 'Kâğıt para'], answer: 0, feedback: [null, '1 lira yuvarlak, metal bir paradır.'] },
    ],
  },
  {
    id: 'g1-para-sirala',
    outcomes: ['MAT.1.1.9'],
    type: 'sort',
    stage: 'sembol',
    title: 'Paraları sırala',
    instructions: 'Paraları değerlerine göre sırala.',
    launch: { text: 'Kumbaranı boşalttın: içinden 1, 5, 10 ve 20 lira çıktı. Bunları en az değerliden en çok değerliye dizebilir misin?' },
    reflect: '50 lira ile 5 lira arasındaki farkı nasıl anlarsın? Hangi rakamlar ipucu verir?',
    rounds: [
      { prompt: 'Küçükten büyüğe sırala.', items: [{ visual: { kind: 'money', items: [1] } }, { visual: { kind: 'money', items: [5] } }, { visual: { kind: 'money', items: [10] } }, { visual: { kind: 'money', items: [20] } }], ends: ['En az', 'En çok'] },
      { prompt: 'Küçükten büyüğe sırala.', items: [{ visual: { kind: 'money', items: [10] } }, { visual: { kind: 'money', items: [20] } }, { visual: { kind: 'money', items: [50] } }, { visual: { kind: 'money', items: [100] } }], ends: ['En az', 'En çok'] },
      { prompt: 'Büyükten küçüğe sırala.', items: ['100 TL', '50 TL', '20 TL', '5 TL'], ends: ['En çok', 'En az'], hints: ['Sayıların kaç rakamla yazıldığına bak.'] },
    ],
  },
  {
    id: 'g1-alisveris',
    outcomes: ['MAT.1.1.9'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alışveriş istasyonu',
    instructions: 'Paranla neler alabileceğini düşün.',
    launch: { text: 'Sınıfta bir manav kurduk 🍎🍌. Elinde 20 lira var. Bir şey mi alırsın, iki şey mi? İhtiyacın olanı seçmeyi unutma!' },
    reflect: 'Paranın hepsini harcamak yerine biriktirmek ne zaman iyi bir fikir olabilir?',
    questions: [
      { prompt: 'Bir elma 5 lira. Elinde 10 liralık var. Kaç elma alabilirsin?', choices: ['2', '1', '10'], answer: 0, feedback: [null, '10 lira, iki tane 5 lira eder. Bir elma alınca 5 liran kalır.', '10 lira ile 10 elma alamazsın; her elma 5 lira.'] },
      { prompt: '10 liralık bir kitabı hangi paralarla tam ödeyebilirsin?', choices: [{ visual: { kind: 'money', items: [5, 5] } }, { visual: { kind: 'money', items: [5, 1] } }, { visual: { kind: 'money', items: [1, 1, 1] } }], answer: 0, feedback: [null, '5 ve 1 lira, 6 lira eder. 10 liraya yetmez.', 'Üç tane 1 lira, 3 lira eder. 10 liraya yetmez.'] },
      { prompt: 'Elinde 20 lira var. Hangisini ALAMAZSIN?', choices: ['50 liralık top', '10 liralık kalem kutusu', '5 liralık silgi'], answer: 0, feedback: [null, '10 lira, 20 liradan azdır; alabilirsin.', '5 lira, 20 liradan azdır; alabilirsin.'] },
      { prompt: 'Elinde 20 lira var. Hangi ikisini birlikte alabilirsin?', choices: ['10 liralık defter ve 10 liralık kalem', '20 liralık oyuncak ve 5 liralık balon', '50 liralık çanta ve 1 liralık silgi'], answer: 0, feedback: [null, '20 lira oyuncağa gider; balon için para kalmaz.', 'Çanta tek başına 50 lira; 20 lira yetmez.'] },
      { prompt: 'Kantinde simit 10 lira. Hangisi doğru?', choices: ['Bir 10 lira ile de, iki 5 lira ile de alınır', 'Yalnızca 10 liralıkla alınır', 'Yalnızca 5 liralıklarla alınır'], answer: 0, feedback: [null, 'İki 5 lira da 10 lira eder; o da olur.', 'Bir 10 liralıkla da alınır!'] },
    ],
  },
  {
    id: 'g1-hangisi-farkli-para',
    outcomes: ['MAT.1.1.9'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Dört paraya bak. Her biri bir yönüyle diğerlerinden farklı. Sen hangisini seçerdin?' },
    reflect: 'Seçtiğin paranın farkını arkadaşına anlat. Başka bir paranın farklı olması için bir neden bulabilir misin?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: { kind: 'money', items: [1] } }, { visual: { kind: 'money', items: [5] } }, { visual: { kind: 'money', items: [20] } }, { visual: { kind: 'money', items: [200] } }],
        answer: 0,
        reasons: ['Tek madenî para; diğerleri kâğıt para.', '10 liradan az değerli tek kâğıt para.', 'İki tane 10 liraya eşit olan tek para.', 'En değerli para; adında “yüz” geçen tek para.'],
      },
    ],
  },

  // ── Nesnelerin Geometrisi (2) ───────────────────────────────────────────

  // MAT.1.3.3 Nesnelerin biçimi
  {
    id: 'g1-yuvarlak-koseli',
    outcomes: ['MAT.1.3.3'],
    type: 'categorize',
    stage: 'model',
    title: 'Yuvarlak mı, köşeli mi?',
    instructions: 'Nesneleri biçimlerine göre grupla: köşesi yoksa “Yuvarlak”, köşesi varsa “Köşeli”.',
    launch: { text: 'Bir top yokuştan yuvarlanır ama bir kutu yuvarlanmaz. Neden? Nesnelerin biçimine bakalım.' },
    reflect: 'Bir nesnenin yuvarlak mı köşeli mi olduğunu anlamak için ne yaptın? Elinle dokunsaydın neyi hissederdin?',
    categories: [
      { id: 'yuvarlak', label: 'Yuvarlak', color: '#3b82f6' },
      { id: 'koseli', label: 'Köşeli', color: '#f97316' },
    ],
    items: [
      { content: '⚽ Top', category: 'yuvarlak', explain: 'Topun hiç köşesi yok; her yöne yuvarlanır.' },
      { content: '🍊 Portakal', category: 'yuvarlak' },
      { content: '🪙 Madenî para', category: 'yuvarlak', explain: 'Para yassı ama kenarı yuvarlak; köşesi yok.' },
      { content: '🍩 Simit', category: 'yuvarlak' },
      { content: '🕐 Duvar saati', category: 'yuvarlak' },
      { content: '📦 Kutu', category: 'koseli' },
      { content: '📘 Kitap', category: 'koseli' },
      { content: '🎲 Zar', category: 'koseli', explain: 'Zarın köşeleri var; kolay yuvarlanmaz.' },
      { content: '🖼️ Çerçeve', category: 'koseli' },
      { content: '🧀 Peynir dilimi', category: 'koseli', explain: 'Peynir diliminin sivri köşeleri var.' },
    ],
  },
  {
    id: 'g1-bicim-tarif',
    outcomes: ['MAT.1.3.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Tarifi bul',
    instructions: 'Her tarifi uygun nesneyle eşleştir.',
    launch: { text: 'Arkadaşın bir nesneyi adını söylemeden tarif ediyor: “Köşesi yok, her yöne yuvarlanır.” Hangi nesneyi anlatıyor olabilir?' },
    reflect: 'Bir nesneyi adını söylemeden arkadaşına tarif et. Hangi özelliklerini söyledin?',
    pairs: [
      { left: 'Köşesi yok, her yöne yuvarlanır.', right: '⚽ Top' },
      { left: 'Köşeleri var, her yüzü kare.', right: '🎲 Zar' },
      { left: 'Üç köşeli, ucu sivri.', right: '🍕 Pizza dilimi' },
      { left: 'Yassı ve yuvarlak, köşesi yok.', right: '🪙 Madenî para' },
      { left: 'Uzun ve dört köşeli; açılıp kapanır.', right: '🚪 Kapı' },
      { left: 'Yan yatınca yuvarlanır, düz yüzünün üstünde durur.', right: '🥫 Konserve kutusu' },
    ],
    perRound: 6,
  },
  {
    id: 'g1-hangisi-farkli-nesne',
    outcomes: ['MAT.1.3.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Aslı Öğretmen masaya dört nesne koydu ve “Hangisi farklı?” diye sordu. Herkes başka bir nesne seçti ve hepsi haklıydı!' },
    reflect: 'Nesneleri hangi özelliğe göre ayırdın: biçimine mi, kullanımına mı? Biçimine göre farklı olan hangisi?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['⚽ Top', '🍊 Portakal', '🎲 Zar', '🪙 Madenî para'],
        answer: 0,
        reasons: ['İçi hava dolu tek nesne; onunla oyun oynarız.', 'Yenebilen tek nesne.', 'Köşeleri olan tek nesne.', 'İnce ve yassı olan tek nesne.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['🚪 Kapı', '📱 Telefon', '🍕 Pizza dilimi', '🖼️ Çerçeve'],
        answer: 0,
        reasons: ['En büyük nesne; içinden geçeriz.', 'Elektrikle çalışan tek nesne.', 'Üç köşeli tek nesne; diğerleri dört köşeli.', 'Ortası boş olan tek nesne.'],
      },
    ],
  },

  // MAT.1.3.4 Yapılardaki şekiller
  {
    id: 'g1-yapi-tahtasi',
    outcomes: ['MAT.1.3.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Evin parçalarını yap',
    instructions: 'Geometri tahtasında çivilere dokunarak evin parçalarını oluştur.',
    launch: { text: 'Bir ev yapacağız: çatısı, kapısı, penceresi… Her parçası bir şekle benziyor. Geometri tahtasında bu şekilleri yapalım.', visual: EV2 },
    reflect: 'Kapı ile pencerenin ikisi de dört köşeli. Aralarında nasıl bir fark var?',
    tool: 'geoboard',
    config: { size: 6 },
    tasks: [
      { prompt: 'Evin çatısı için bir üçgen yap.', target: { sides: 3 }, hints: ['Üç çivi seç ve lastikle birleştir. Kaç köşe oldu?'] },
      { prompt: 'Evin kapısı için eni 1, boyu 3 aralık olan bir dikdörtgen yap.', target: { sides: 4, rect: true, area: 3 }, hints: ['Kapı uzun ve dar olmalı.'] },
      { prompt: 'Pencere için bir kare yap.', target: { sides: 4, square: true }, hints: ['Karenin dört kenarı da aynı uzunlukta.'] },
    ],
  },
  {
    id: 'g1-yapilardaki-sekiller',
    outcomes: ['MAT.1.3.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Yapıda hangi şekiller var?',
    instructions: 'Yapıya dikkatle bak. Şekilleri bul ve say.',
    launch: { text: 'Okulunun binasına bak: pencereler, kapı, çatı… Yapılar şekillerin bir araya gelmesiyle oluşur 🏫.' },
    reflect: 'Evinde ya da okulunda üçgene, kareye, dikdörtgene ve çembere benzeyen yerler bul. En çok hangisini gördün?',
    questions: [
      { prompt: { text: 'Evin çatısı hangi şekle benziyor?', visual: EV }, choices: ['Üçgen', 'Kare', 'Çember'], answer: 0, feedback: [null, 'Karenin 4 köşesi var. Çatının kaç köşesi var?', 'Çemberin köşesi yok; çatının sivri köşeleri var.'] },
      { prompt: { text: 'Bu evde kaç kare pencere var?', visual: EV }, choices: ['2', '1', '3'], answer: 0, feedback: [null, 'Bir pencere daha var; diğer yana da bak.', 'Kapı kare değil, uzun bir dikdörtgen.'] },
      { prompt: { text: 'Evin kapısı hangi şekle benziyor?', visual: EV }, choices: ['Dikdörtgen', 'Kare', 'Üçgen'], answer: 0, feedback: [null, 'Kapının kenarları eşit değil: iki uzun, iki kısa kenarı var.', 'Kapının dört köşesi var.'] },
      { prompt: { text: 'Bu resimde hiç köşesi olmayan şekil hangisi?', visual: EV }, choices: ['Güneş', 'Kapı', 'Çatı'], answer: 0, feedback: [null, 'Kapının 4 köşesi var.', 'Çatının 3 köşesi var.'] },
      { prompt: { text: 'Bu trende kaç çember var?', visual: TREN }, choices: ['4', '2', '6'], answer: 0, feedback: [null, 'Yalnızca bir vagonun tekerleklerini saydın; diğerine de bak.', 'Tekerlekleri bir daha say; iki fazla saydın.'] },
      { prompt: { text: 'Roketin ucu hangi şekle benziyor?', visual: ROKET }, choices: ['Üçgen', 'Dikdörtgen', 'Çember'], answer: 0, feedback: [null, 'Roketin gövdesi dikdörtgen; ucu sivri.', 'Çemberler roketin pencereleri; ucunun köşeleri var.'] },
      { prompt: '🚦 Trafik lambasının ışıkları hangi şekle benzer?', choices: ['Çember', 'Kare', 'Üçgen'], answer: 0, feedback: [null, 'Işıkların köşesi yok; yuvarlaklar.', 'Işıkların köşesi yok; yuvarlaklar.'] },
    ],
  },
  {
    id: 'g1-kose-sayisi',
    outcomes: ['MAT.1.3.4'],
    type: 'match',
    stage: 'sembol',
    title: 'Köşe ve kenar',
    instructions: 'Her şekli köşe ve kenarlarını anlatan kartla eşleştir.',
    launch: { text: 'Parmağını bir şeklin kenarında gezdir. Her köşeye gelince dur ve say. Kaç kenar, kaç köşe?' },
    reflect: 'Kare ile dikdörtgenin ikisinin de 4 köşesi var. Onları nasıl ayırt edersin?',
    pairs: [
      { left: { visual: sekil('ucgen', '#f97316') }, right: '3 köşe, 3 kenar' },
      { left: { visual: sekil('kare', '#3b82f6') }, right: '4 köşe, 4 eşit kenar' },
      { left: { visual: sekil('dikdortgen', '#ec4899') }, right: '4 köşe; 2 uzun, 2 kısa kenar' },
      { left: { visual: sekil('cember', '#22c55e') }, right: 'Köşesi ve kenarı yok' },
    ],
    perRound: 4,
  },
  {
    id: 'g1-yapi-cozumle',
    outcomes: ['MAT.1.3.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Bu yapıyı hangi şekillerle kurarız?',
    instructions: 'Yapıyı parçalarına ayır. Hangi şekiller gerekiyor?',
    launch: { text: 'Elinde kartondan kesilmiş şekiller var. Resimdeki yapıyı kurmak için hangilerini ve kaç tane kullanmalısın?' },
    reflect: 'Bir yapıdaki şekilleri sayarken hiçbirini atlamamak için nasıl bir yol izledin?',
    questions: [
      { prompt: { text: 'Bu evi kurmak için hangi şekiller gerekir?', visual: EV2 }, choices: ['1 üçgen, 3 kare, 1 dikdörtgen', '1 üçgen, 2 kare, 1 dikdörtgen', '2 üçgen, 3 kare, 1 çember'], answer: 0, feedback: [null, 'Duvarın kendisi de bir kare! Pencereleri ve duvarı birlikte say.', 'Evde çember yok; üçgen de tek.'] },
      { prompt: { text: 'Bu roketi kurmak için kaç üçgen gerekir?', visual: ROKET }, choices: ['3', '1', '2'], answer: 0, feedback: [null, 'Yalnızca ucunu saydın; iki yandaki kanatlar da üçgen.', 'Ucunu da unutma; o da bir üçgen.'] },
      { prompt: { text: 'Bu trende kaç dikdörtgen var?', visual: TREN }, choices: ['3', '2', '4'], answer: 0, feedback: [null, 'Bacayı unuttun; o da bir dikdörtgen.', 'Tekerlekler dikdörtgen değil, çember.'] },
      { prompt: { text: 'Bu dik üçgenden iki tane birleştirip yeni bir şekil yaptım. Hangisi OLAMAZ?', visual: DIK_UCGEN }, choices: ['Çember', 'Kare', 'Daha büyük bir üçgen'], answer: 0, feedback: [null, 'İki dik üçgen uzun kenarlarından birleşince kare olabilir.', 'İki dik üçgen kısa kenarlarından birleşince daha büyük bir üçgen olabilir.'] },
    ],
  },

  // MAT.1.3.5 Şekilleri grupla
  {
    id: 'g1-geometri-tahtasi',
    outcomes: ['MAT.1.3.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Şekil oluştur',
    instructions: 'Geometri tahtasında çivilere dokunarak şekil oluştur.',
    launch: { text: 'Geometri tahtasında lastikle şekil yapacağız. Bir şekle “üçgen” diyebilmek için nesi olmalı? “Kare” için?' },
    reflect: 'Yaptığın iki üçgen birbirine benzemiyor ama ikisi de üçgen. Neden?',
    tool: 'geoboard',
    config: { size: 6 },
    tasks: [
      { prompt: 'Bir üçgen yap.', target: { sides: 3 }, explain: 'Üç kenarı ve üç köşesi olan her şekil üçgendir.' },
      { prompt: 'Bir kare yap.', target: { sides: 4, square: true }, hints: ['Dört kenarı da aynı uzunlukta olmalı.'] },
      { prompt: 'Eni 3, boyu 2 aralık olan bir dikdörtgen yap.', target: { sides: 4, rect: true, area: 6 }, hints: ['İki kenar 3 aralık, iki kenar 2 aralık olmalı.'] },
      { prompt: 'Şimdi çok uzun ve ince bir üçgen yap.', target: { sides: 3 }, explain: 'Uzun, ince, yamuk duran… Üç köşesi ve üç kenarı varsa yine üçgendir!' },
    ],
  },
  {
    id: 'g1-sekilleri-grupla',
    outcomes: ['MAT.1.3.5'],
    type: 'categorize',
    stage: 'model',
    title: 'Şekilleri grupla',
    instructions: 'Her şekli köşelerine ve kenarlarına bakarak doğru gruba koy. Şeklin duruşu seni yanıltmasın!',
    launch: { text: 'Ters duran bir üçgen yine üçgen midir? Yan yatmış bir kare? Bir şekli tanımak için neye bakmalıyız?' },
    reflect: 'Bir şekli döndürdüğünde adı değişir mi? Neden?',
    categories: [
      { id: 'ucgen', label: 'Üçgen', color: '#f97316' },
      { id: 'kare', label: 'Kare', color: '#3b82f6' },
      { id: 'dikdortgen', label: 'Dikdörtgen', color: '#eab308' },
      { id: 'cember', label: 'Çember', color: '#a855f7' },
    ],
    items: [
      { content: { visual: sekil('ucgen', '#f97316') }, category: 'ucgen' },
      { content: { visual: sekil('ucgen', '#22c55e', 1, 180) }, category: 'ucgen', explain: 'Ters dursa da üç köşesi, üç kenarı var: üçgen.' },
      { content: { visual: sekil('inceUcgen', '#3b82f6') }, category: 'ucgen', explain: 'Uzun ve ince ama 3 köşeli: üçgen.' },
      { content: { visual: sekil('kare', '#3b82f6') }, category: 'kare' },
      { content: { visual: sekil('kare', '#ec4899', 1, 45) }, category: 'kare', explain: 'Döndürülmüş bir kare. Dört kenarı hâlâ eşit: kare.' },
      { content: { visual: sekil('dikdortgen', '#eab308') }, category: 'dikdortgen' },
      { content: { visual: sekil('dikdortgen', '#14b8a6', 1, 90) }, category: 'dikdortgen', explain: 'Dik duran bir dikdörtgen; iki uzun, iki kısa kenarı var.' },
      { content: { visual: sekil('cember', '#a855f7') }, category: 'cember' },
      { content: { visual: sekil('cember', '#ef4444', 0.5) }, category: 'cember', explain: 'Küçük de olsa köşesi yok: çember.' },
    ],
  },
  {
    id: 'g1-ben-kimim',
    outcomes: ['MAT.1.3.5'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Ben kimim?',
    instructions: 'İpuçlarını oku. Hangi şekil olduğunu bul.',
    launch: { text: 'Bir şekil kendini anlatıyor ama adını söylemiyor 🕵️. İpuçlarından onu bulabilir misin?' },
    reflect: 'Kendi “Ben kimim?” bilmeceni yaz. Arkadaşın tek bir şekil bulsun diye hangi ipuçlarını vermelisin?',
    questions: [
      { prompt: 'Üç köşem ve üç kenarım var. Ben kimim?', choices: ['Üçgen', 'Kare', 'Çember', 'Dikdörtgen'], answer: 0, feedback: [null, 'Karenin 4 köşesi var.', 'Çemberin hiç köşesi yok.', 'Dikdörtgenin 4 köşesi var.'] },
      { prompt: 'Dört köşem var. Dört kenarım da aynı uzunlukta. Ben kimim?', choices: ['Kare', 'Dikdörtgen', 'Üçgen', 'Çember'], answer: 0, feedback: [null, 'Dikdörtgenin iki kenarı uzun, iki kenarı kısa olabilir. Dört kenarı eşitse ona kare deriz.', 'Üçgenin 3 köşesi var.', 'Çemberin köşesi yok.'] },
      { prompt: 'Hiç köşem yok. Yuvarlağım. Ben kimim?', choices: ['Çember', 'Kare', 'Üçgen', 'Dikdörtgen'], answer: 0, feedback: [null, 'Karenin 4 köşesi var.', 'Üçgenin 3 köşesi var.', 'Dikdörtgenin 4 köşesi var.'] },
      { prompt: 'Dört köşem var. İki kenarım uzun, iki kenarım kısa. Ben kimim?', choices: ['Dikdörtgen', 'Kare', 'Üçgen', 'Çember'], answer: 0, feedback: [null, 'Karenin dört kenarı eşittir; uzun-kısa kenarı yoktur.', 'Üçgenin 3 köşesi var.', 'Çemberin köşesi yok.'] },
      { prompt: 'Bir arkadaşın “Ters duran üçgen artık üçgen değil” dedi. Sence?', choices: ['Yine üçgendir; köşe ve kenar sayısı değişmedi', 'Haklı, artık başka bir şekil', 'Ters durunca kare olur'], answer: 0, feedback: [null, 'Döndürmek şeklin köşelerini ve kenarlarını değiştirmez.', 'Döndürünce köşe sayısı 3’ten 4’e çıkmaz.'] },
      { prompt: 'Benim 4 köşem var ama dört kenarım eşit değil. Kare olabilir miyim?', choices: ['Hayır, ben bir dikdörtgenim', 'Evet, kareyim'], answer: 0, feedback: [null, 'Karenin dört kenarı da eşittir.'] },
    ],
  },
  {
    id: 'g1-hangisi-farkli-dortlu',
    outcomes: ['MAT.1.3.5'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Dört şekil var. Her birini farklı yapan bir özellik bul. Köşelere, kenarlara, renklere bak!' },
    reflect: 'Şekilleri ayırırken renk ve büyüklük mü, köşe ve kenarlar mı daha önemli? Neden?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: sekil('kare', '#3b82f6') }, { visual: sekil('dikdortgen', '#eab308') }, { visual: sekil('ucgen', '#22c55e') }, { visual: sekil('cember', '#ef4444') }],
        answer: 0,
        reasons: ['Dört kenarı da eşit olan tek şekil.', 'Uzun ve kısa kenarları olan tek şekil.', 'Üç köşeli tek şekil.', 'Köşesi olmayan tek şekil.'],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: sekil('kare', '#ef4444', 0.55) }, { visual: sekil('kare', '#3b82f6') }, { visual: sekil('dikdortgen', '#ef4444') }, { visual: sekil('kare', '#ef4444', 1, 45) }],
        answer: 0,
        reasons: ['Tek küçük şekil.', 'Tek mavi şekil.', 'Tek dikdörtgen; uzun ve kısa kenarları var.', 'Tek döndürülmüş duran şekil. Ama yine kare!'],
      },
    ],
  },

  // ── Veriye Dayalı Araştırma ─────────────────────────────────────────────

  // MAT.1.4.1 Veri toplama
  {
    id: 'g1-grafik-olustur',
    outcomes: ['MAT.1.4.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Grafiği sen oluştur',
    instructions: 'Sıklık tablosundaki sayılara göre her sütunu yükselt. Her kare bir çocuğu gösterir.',
    launch: { text: 'Sınıfta “Okula nasıl geliyorsun?” diye sorduk 🚶🚌🚗. Cevapları bir grafikte gösterirsek kimin neyi seçtiğini tek bakışta görebilir miyiz?' },
    reflect: 'Grafiğe bakınca hangi soruların cevabını hemen görebiliyorsun? Hangilerini göremiyorsun?',
    tool: 'bargraph',
    tasks: [
      { prompt: 'Soru: “En sevdiğin mevsim hangisi?” Sınıfın cevaplarıyla grafiği oluştur.', target: { data: [{ label: '☀️ Yaz', value: 7 }, { label: '❄️ Kış', value: 4 }, { label: '🌸 İlkbahar', value: 5 }, { label: '🍂 Sonbahar', value: 2 }] }, explain: 'En çok yaz, en az sonbahar seçilmiş.' },
      { prompt: 'Soru: “Okula nasıl geliyorsun?” Grafiği oluştur.', target: { data: [{ label: '🚶 Yürüyerek', value: 6 }, { label: '🚌 Servisle', value: 8 }, { label: '🚗 Arabayla', value: 3 }] } },
      { prompt: 'Soru: “Evinde hangi evcil hayvan var?” Grafiği oluştur.', target: { data: [{ label: '🐱 Kedi', value: 4 }, { label: '🐶 Köpek', value: 3 }, { label: '🐦 Kuş', value: 2 }, { label: '🐟 Balık', value: 5 }] } },
    ],
  },
  {
    id: 'g1-cetele-eslestir',
    outcomes: ['MAT.1.4.1'],
    type: 'match',
    stage: 'model',
    title: 'Çeteleden sıklığa',
    instructions: 'Her çeteleyi gösterdiği sayıyla eşleştir. Beşinci çizgi diğer dördünü çapraz keser!',
    launch: { text: 'Sınıfta oylama yaparken her oy için bir çizgi çekeriz. Beşinci çizgi diğer dördünü çapraz keser. Sence neden böyle yaparız?', visual: cetele(7) },
    reflect: 'Çizgileri beşerli gruplamak saymayı nasıl kolaylaştırıyor?',
    pairs: [
      { left: { visual: cetele(3) }, right: '3' },
      { left: { visual: cetele(5) }, right: '5' },
      { left: { visual: cetele(6) }, right: '6' },
      { left: { visual: cetele(8) }, right: '8' },
      { left: { visual: cetele(10) }, right: '10' },
      { left: { visual: cetele(12) }, right: '12' },
    ],
    perRound: 4,
  },
  {
    id: 'g1-nesne-grafigi',
    outcomes: ['MAT.1.4.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Grafiği oku, karar ver',
    instructions: 'Nesne grafiğini incele ve soruları cevapla. Her 😊 bir çocuğu gösterir.',
    launch: { text: '1/A sınıfı “En sevdiğin meyve hangisi?” diye bir araştırma yaptı ve sonuçları bir nesne grafiğinde gösterdi. Grafik bize neler anlatıyor?', visual: MEYVE_GRAFIK },
    reflect: 'Bu grafikten başka hangi soruları cevaplayabilirsin? Bir soru uydur ve arkadaşına sor.',
    questions: [
      { prompt: { text: 'En çok sevilen meyve hangisi?', visual: MEYVE_GRAFIK }, choices: ['🍓 Çilek', '🍎 Elma', '🍌 Muz'], answer: 0, feedback: [null, 'Elmanın sırası çileğinkinden kısa.', 'Muzun sırası en kısa; en az sevilen o.'] },
      { prompt: { text: 'Muzu kaç çocuk seviyor?', visual: MEYVE_GRAFIK }, choices: ['3', '5', '7'], answer: 0, feedback: [null, '5, elmanın ya da üzümün sırası. Muzun sırasındaki yüzleri say.', '7, çileğin sırası. Muzun sırasındaki yüzleri say.'] },
      { prompt: { text: 'Hangi iki meyveyi eşit sayıda çocuk seviyor?', visual: MEYVE_GRAFIK }, choices: ['🍎 Elma ve 🍇 Üzüm', '🍓 Çilek ve 🍎 Elma', '🍌 Muz ve 🍇 Üzüm'], answer: 0, feedback: [null, 'Çileğin sırası daha uzun.', 'Muzun sırası daha kısa.'] },
      { prompt: { text: 'Muz mu daha az seviliyor, üzüm mü?', visual: MEYVE_GRAFIK }, choices: ['Muz', 'Üzüm'], answer: 0, feedback: [null, 'Üzümün sırası muzunkinden uzun; üzüm daha çok seviliyor.'] },
      { prompt: 'Bu veriler 1/B sınıfından toplansaydı sonuç aynı olur muydu?', choices: ['Farklı olabilir; başka çocuklar başka meyveleri sevebilir', 'Kesinlikle aynı olurdu'], answer: 0, feedback: [null, 'Her sınıfta farklı çocuklar var. Veri, kimden toplandığına göre değişebilir.'] },
      { prompt: { text: 'Sınıfa meyve alınacak. Grafiğe göre en çok hangisinden almak mantıklı?', visual: MEYVE_GRAFIK }, choices: ['🍓 Çilek', '🍌 Muz', 'Hepsinden eşit'], answer: 0, feedback: [null, 'Muz en az seviliyor; en çok ondan almak çocukları mutlu etmez.', 'Çocuklar meyveleri eşit sevmiyor; grafiğe bak.'] },
    ],
  },
  {
    id: 'g1-arastirma-sorusu',
    outcomes: ['MAT.1.4.1'],
    type: 'categorize',
    stage: 'problem',
    title: 'Hangi soruyla araştırma yapılır?',
    instructions: 'Cevabı veri toplayarak bulunan soruları bir gruba, tek bir cevabı olan soruları diğer gruba koy.',
    launch: { text: 'Sınıfın hakkında merak ettiğin bir şey var mı? “Sınıfımızda en çok hangi renk seviliyor?” sorusunu kime sormalıyız? Herkes aynı cevabı mı verir?' },
    reflect: 'Sınıfında araştırmak istediğin bir soru yaz. Cevapları nasıl toplar, nasıl gösterirsin?',
    categories: [
      { id: 'veri', label: 'Veri toplayarak cevaplanır 📊', color: '#22c55e' },
      { id: 'tek', label: 'Tek bir cevabı var ☝️', color: '#f97316' },
    ],
    items: [
      { content: 'Sınıfımızda en çok hangi meyve seviliyor?', category: 'veri', explain: 'Herkese sormamız gerekir; cevaplar kişiden kişiye değişir.' },
      { content: 'Arkadaşlarımız okula nasıl geliyor?', category: 'veri', explain: 'Her arkadaşın cevabı farklı olabilir; veri toplamalıyız.' },
      { content: 'Sınıfımızda en çok hangi renk seviliyor?', category: 'veri' },
      { content: 'Sınıfımızdakilerin evinde hangi evcil hayvanlar var?', category: 'veri' },
      { content: 'Teneffüste en çok hangi oyunu oynamak istiyoruz?', category: 'veri' },
      { content: 'Öğretmenimizin adı ne?', category: 'tek', explain: 'Bunun tek bir cevabı var; herkese sormaya gerek yok.' },
      { content: 'Okulumuzun adı ne?', category: 'tek', explain: 'Okulun tek bir adı var.' },
      { content: 'Bugün haftanın hangi günü?', category: 'tek' },
      { content: 'Benim en sevdiğim renk ne?', category: 'tek', explain: 'Bu yalnızca senin cevabın; birçok kişiden veri toplamıyoruz.' },
    ],
  },
  {
    id: 'g1-hangisi-farkli-veri',
    outcomes: ['MAT.1.4.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı?',
    instructions: 'Farklı olanı seç ve nedenini düşün. Birden çok doğru cevap var!',
    launch: { text: 'Bir sınıf meyve oylaması yaptı ve sonuçları dört farklı biçimde gösterdi. Hepsi aynı şeyi mi anlatıyor?' },
    reflect: 'Bu dört gösterimden hangisi en çok sevilen meyveyi en hızlı gösteriyor? Neden?',
    questions: [
      {
        prompt: 'Dördü de aynı oylamayı gösteriyor. Hangisi farklı?',
        choices: [
          { visual: { kind: 'pattern', items: ['🍎', '🍌', '🍎', '🍓', '🍎', '🍓', '🍌', '🍎', '🍓'] } },
          { visual: cetelePano([['🍎', 4], ['🍌', 2], ['🍓', 3]]) },
          { visual: { kind: 'table', headers: ['Meyve', 'Sıklık'], rows: [['🍎', 4], ['🍌', 2], ['🍓', 3]] } },
          { visual: { kind: 'pictograph', data: [{ label: '🍎', value: 4 }, { label: '🍌', value: 2 }, { label: '🍓', value: 3 }], icon: '🙂' } },
        ],
        answer: 0,
        reasons: ['Henüz gruplanmamış, karışık duran tek veri.', 'Çizgilerle gösterilen tek gösterim: çetele.', 'Sayılarla yazılan tek gösterim: sıklık tablosu.', 'Her çocuğu bir resimle gösteren tek gösterim: nesne grafiği.'],
      },
    ],
  },
]

/** Tema notları: Van de Walle’ün “büyük fikirler”i gibi, öğretmen ve veliler için */
export const grade1Notes: ThemeNotes = {
  'nesnelerin-geometrisi-1': {
    bigIdeas: [
      'Konum her zaman bir referansa göre söylenir: “sağında”, “altında”, “arasında” başka bir nesneye göredir. Referans değişince söz de değişir.',
      'Bir yol tarifi başlangıç noktası, yön ve mesafeden (kaç adım) oluşur. Aynı hedefe farklı yollarla ulaşılabilir.',
      'Sözle verilen yönergeyi oklarla, haritayla ya da bedenle göstermek uzamsal düşünmeyi güçlendirir.',
      'İki nesnenin eş olup olmadığına bir ölçüt (renk, boy, biçim) seçip karşılaştırarak karar veririz. Döndürmek eşliği bozmaz; eşlik, sayıca eşitlikten farklıdır.',
    ],
  },
  'sayilar-ve-nicelikler-1': {
    bigIdeas: [
      'Sayılar çokluğu anlatır: sayarken son söylenen sayı grubun tamamını gösterir. 0, hiç olmayanı gösteren bir sayıdır.',
      'Sayılar başka sayılardan oluşur (parça-parça-bütün). 5 ve 10 güçlü çapalardır: 7’yi “5 ve 2”, 14’ü “10 ve 4” görmek tek tek saymaktan hızlıdır.',
      'Sıra sayıları “hangisi?”, sayma sayıları “kaç tane?” sorusunu cevaplar; sıra, nereden başladığımıza bağlıdır.',
      'Örüntüler bir kurala göre tekrar eder, büyür ya da azalır. Kuralı sözle açıklamak sıradakini bulmaktan güçlüdür; tahmin de bilinen bir çokluğa (5, 10) göre yapılır.',
    ],
  },
  'sayilar-ve-nicelikler-2': {
    bigIdeas: [
      'Ölçmek, aynı türden bir birimi boşluksuz ve üst üste bindirmeden yinelemektir. Ölçüm “kaç birim?” sorusunun cevabıdır.',
      'Nesneler sayı kullanmadan da karşılaştırılabilir: uçları hizalayarak (uzunluk) ya da terazide (kütle). Büyük olan her zaman ağır değildir.',
      'Birim büyüdükçe gereken birim sayısı azalır. Karış ve adım kişiden kişiye değiştiği için herkesin aynı birimi kullanmasına ihtiyaç duyarız.',
      'Önce tahmin edip sonra ölçmek ve ikisini karşılaştırmak ölçü duygusunu geliştirir.',
    ],
  },
  'islemlerden-cebirsel-dusunmeye': {
    bigIdeas: [
      'Toplama birleştirmeyi ve artmayı, çıkarma ayırmayı ve azalmayı anlatır. Hikâyedeki ilişkiyi anlamak, “anahtar sözcük” ezberlemekten önemlidir.',
      'Temel işlemler ezberle değil stratejiyle akıcı hâle gelir: büyük sayıdan başlama, 10’a tamamlama, ikizler, geriye sayma, parçalayarak çıkarma.',
      'Eşittir işareti “sonucu yaz” değil, “iki yanı aynı değerde” demektir; terazi bu ilişkinin modelidir.',
      'Toplama ve çıkarma birbirinin tersidir: aynı parça-bütün ilişkisi hem toplama hem çıkarma ile yazılır ve eksik terim bu ilişkiyle bulunur.',
    ],
  },
  'sayilar-ve-nicelikler-3': {
    bigIdeas: [
      'Para bir değişim aracıdır. Bir paranın değeri üzerindeki sayıdır; büyüklüğü, rengi ya da adedi değildir.',
      'Aynı tutar farklı paralarla oluşturulabilir (10 TL = iki 5 TL). Bu, sayıları parçalara ayırmanın günlük hayattaki karşılığıdır.',
      'Alışverişte ihtiyaç ile isteği ayırmak ve paranın yetip yetmediğine karar vermek finansal okuryazarlığın ilk adımıdır.',
    ],
  },
  'nesnelerin-geometrisi-2': {
    bigIdeas: [
      'Çocuklar önce şekilleri bütün olarak, görünüşüyle tanır (van Hiele 0. düzey). Amaç, köşe ve kenar gibi özelliklere bakarak düşünmeye geçmektir (1. düzey).',
      'Bir şeklin adı duruşuna, rengine ya da büyüklüğüne değil özelliklerine bağlıdır: ters duran üçgen de, döndürülmüş kare de aynı şekildir.',
      'Çevremizdeki yapılar şekillerin bir araya gelmesiyle oluşur. Bir yapıyı parçalarına ayırmak ve parçalardan yapı kurmak şekiller arasındaki ilişkiyi gösterir.',
    ],
  },
  'veriye-dayali-arastirma': {
    bigIdeas: [
      'Veri, cevabı kişiden kişiye değişen bir soruyu cevaplamak için toplanır. Araştırma sorusunu çocukların kendisi sorduğunda veri anlam kazanır.',
      'Aynı veri farklı biçimlerde gösterilebilir: karışık liste, çetele, sıklık tablosu, nesne grafiği. Her biri bir şeyi daha kolay görmemizi sağlar.',
      'Grafik bir karar vermek için okunur. Yorum, verinin toplandığı grup için geçerlidir; başka bir grupta sonuç farklı çıkabilir.',
    ],
  },
}
