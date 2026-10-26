import type { Activity, ThemeNotes, Visual } from '../types'

/**
 * 2. SINIF ETKİNLİKLERİ — Van de Walle yaklaşımı
 * Her öğrenme çıktısında etkinlikler somut → model → sembol → problem sırasıyla dizilir.
 * Her etkinlik: Başlarken (launch) → Keşfet (oyun) → Düşün ve Paylaş (reflect).
 */

// ── Yardımcı SVG çizimleri ────────────────────────────────────────────────
const INK = 'stroke="#1f2340" stroke-width="3" stroke-linejoin="round"'
const svg = (body: string, vb = '0 0 120 120') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
const V = (s: string): Visual => ({ kind: 'svg', svg: s })

/** Şerit (parça-parça-bütün) modeli: [etiket, değer] çiftleri */
const tape = (parts: [string, number][], total?: string, compare?: [string, number][]): Visual => ({
  kind: 'tape',
  parts: parts.map(([label, value]) => ({ label, value })),
  ...(total ? { total } : {}),
  ...(compare ? { compare: compare.map(([label, value]) => ({ label, value })) } : {}),
})

/** Kare prizma (yüksek, tabanı kare) */
const KARE_PRIZMA = svg(
  `<polygon points="30,40 66,40 66,110 30,110" fill="#22c55e" fill-opacity="0.85" ${INK}/>` +
    `<polygon points="30,40 48,24 84,24 66,40" fill="#22c55e" fill-opacity="0.55" ${INK}/>` +
    `<polygon points="66,40 84,24 84,94 66,110" fill="#16a34a" ${INK}/>`,
)

/** Dikdörtgen prizma gövdeli, üçgen prizma çatılı ev */
const EV_3B = svg(
  `<rect x="10" y="60" width="60" height="45" fill="#93c5fd" ${INK}/>` +
    `<polygon points="70,60 100,45 100,90 70,105" fill="#60a5fa" ${INK}/>` +
    `<polygon points="10,60 40,25 70,60" fill="#f97316" ${INK}/>` +
    `<polygon points="40,25 70,10 100,45 70,60" fill="#fb923c" ${INK}/>` +
    `<rect x="33" y="80" width="14" height="25" fill="#fde68a" ${INK}/>`,
  '0 0 110 115',
)

/** Küp üzerinde silindir: kule */
const KULE = svg(
  `<polygon points="20,70 70,70 70,120 20,120" fill="#fbbf24" ${INK}/>` +
    `<polygon points="20,70 35,58 85,58 70,70" fill="#fde68a" ${INK}/>` +
    `<polygon points="70,70 85,58 85,108 70,120" fill="#f59e0b" ${INK}/>` +
    `<path d="M36 20 L36 64 A16 5 0 0 0 68 64 L68 20 Z" fill="#a78bfa" ${INK}/>` +
    `<ellipse cx="52" cy="20" rx="16" ry="5" fill="#c4b5fd" ${INK}/>`,
  '0 0 110 125',
)

/** Kardan adam: üç küre */
const KARDAN_ADAM = svg(
  `<circle cx="50" cy="98" r="28" fill="#f8fafc" ${INK}/>` +
    `<circle cx="50" cy="55" r="20" fill="#f8fafc" ${INK}/>` +
    `<circle cx="50" cy="24" r="14" fill="#f8fafc" ${INK}/>` +
    `<circle cx="45" cy="21" r="2" fill="#1f2340"/><circle cx="55" cy="21" r="2" fill="#1f2340"/>` +
    `<polygon points="50,25 50,29 62,27" fill="#f97316"/>`,
  '0 0 100 130',
)

/** İki silindir ayak üzerinde dikdörtgen prizma: köprü */
const KOPRU = svg(
  `<path d="M18 50 L18 110 A12 4 0 0 0 42 110 L42 50 Z" fill="#a78bfa" ${INK}/><ellipse cx="30" cy="50" rx="12" ry="4" fill="#c4b5fd" ${INK}/>` +
    `<path d="M88 50 L88 110 A12 4 0 0 0 112 110 L112 50 Z" fill="#a78bfa" ${INK}/><ellipse cx="100" cy="50" rx="12" ry="4" fill="#c4b5fd" ${INK}/>` +
    `<polygon points="8,30 112,30 112,46 8,46" fill="#60a5fa" ${INK}/>` +
    `<polygon points="8,30 20,20 124,20 112,30" fill="#93c5fd" ${INK}/>` +
    `<polygon points="112,30 124,20 124,36 112,46" fill="#3b82f6" ${INK}/>`,
  '0 0 130 120',
)

/** Küp üzerinde üçgen prizma: kulübe */
const KULUBE = svg(
  `<rect x="30" y="60" width="50" height="50" fill="#fbbf24" ${INK}/>` +
    `<polygon points="80,60 95,48 95,98 80,110" fill="#f59e0b" ${INK}/>` +
    `<polygon points="55,30 70,18 95,48 80,60" fill="#fb923c" ${INK}/>` +
    `<polygon points="30,60 55,30 80,60" fill="#f97316" ${INK}/>`,
  '0 0 110 120',
)

/** Şekillerden ev modeli: 3 kare, 1 üçgen, 1 dikdörtgen, 1 daire */
const EV_MODELI = svg(
  `<circle cx="138" cy="24" r="14" fill="#facc15" ${INK}/>` +
    `<polygon points="20,60 70,15 120,60" fill="#f97316" ${INK}/>` +
    `<rect x="30" y="60" width="80" height="80" fill="#93c5fd" ${INK}/>` +
    `<rect x="38" y="72" width="18" height="18" fill="#fef9c3" ${INK}/>` +
    `<rect x="84" y="72" width="18" height="18" fill="#fef9c3" ${INK}/>` +
    `<rect x="60" y="100" width="20" height="40" fill="#a16207" ${INK}/>`,
  '0 0 160 145',
)

/** Şekillerden roket modeli: 3 üçgen, 1 dikdörtgen, 2 daire */
const ROKET = svg(
  `<polygon points="40,50 60,10 80,50" fill="#ef4444" ${INK}/>` +
    `<rect x="40" y="50" width="40" height="80" fill="#e2e8f0" ${INK}/>` +
    `<circle cx="60" cy="72" r="9" fill="#38bdf8" ${INK}/>` +
    `<circle cx="60" cy="102" r="9" fill="#38bdf8" ${INK}/>` +
    `<polygon points="40,105 18,135 40,130" fill="#ef4444" ${INK}/>` +
    `<polygon points="80,105 102,135 80,130" fill="#ef4444" ${INK}/>`,
  '0 0 120 145',
)

const IKI_KARE = svg(
  `<rect x="10" y="35" width="50" height="50" fill="#93c5fd" ${INK}/><rect x="60" y="35" width="50" height="50" fill="#93c5fd" ${INK}/>`,
)
const KOSEGENLI_KARE = svg(
  `<rect x="20" y="20" width="80" height="80" fill="#fde68a" ${INK}/><line x1="20" y1="20" x2="100" y2="100" stroke="#ef4444" stroke-width="3" stroke-dasharray="6 4"/>`,
)
const IKI_UCGEN = svg(
  `<polygon points="20,100 100,100 20,20" fill="#fdba74" ${INK}/><polygon points="20,20 100,20 100,100" fill="#fde68a" ${INK}/>`,
)
const KILIM = svg(
  `<rect x="0" y="0" width="160" height="80" fill="#fee2e2"/>` +
    `<polygon points="5,70 25,20 45,70" fill="#dc2626" ${INK}/>` +
    `<rect x="52" y="35" width="28" height="28" fill="#2563eb" ${INK}/>` +
    `<polygon points="85,70 105,20 125,70" fill="#dc2626" ${INK}/>` +
    `<rect x="130" y="35" width="26" height="26" fill="#2563eb" ${INK}/>`,
  '0 0 160 80',
)

// Döndürülmüş / büyütülmüş / küçültülmüş şekiller
const TERS_UCGEN = svg(`<polygon points="15,20 105,20 60,100" fill="#f97316" ${INK}/>`)
const EGIK_UCGEN = svg(`<polygon points="40,35 95,55 50,95" fill="#fb923c" ${INK}/>`)
const DONMUS_KARE = svg(`<polygon points="60,12 108,60 60,108 12,60" fill="#3b82f6" ${INK}/>`)
const KUCUK_KARE = svg(`<rect x="45" y="45" width="30" height="30" fill="#60a5fa" ${INK}/>`)
const DIK_DIKDORTGEN = svg(`<rect x="42" y="10" width="36" height="100" fill="#eab308" ${INK}/>`)
const EGIK_DIKDORTGEN = svg(`<rect x="20" y="42" width="80" height="36" fill="#facc15" transform="rotate(-30 60 60)" ${INK}/>`)
const KUCUK_DAIRE = svg(`<circle cx="60" cy="60" r="16" fill="#a855f7" ${INK}/>`)

const ESIT_OLMAYAN = svg(
  `<rect x="10" y="30" width="30" height="60" fill="#f472b6"/><rect x="10" y="30" width="100" height="60" fill="none" ${INK}/><line x1="40" y1="30" x2="40" y2="90" ${INK}/>`,
)
const CESITKENAR_UCGEN = svg(`<polygon points="10,100 30,20 110,100" fill="#14b8a6" ${INK}/>`)

/** Kareli harita: items = [sütun, satır, emoji] */
function harita(cols: number, rows: number, items: [number, number, string][]) {
  const u = 40
  const W = cols * u, H = rows * u
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="#ecfccb" stroke="#1f2340" stroke-width="2"/>`
  for (let x = 1; x < cols; x++) s += `<line x1="${x * u}" y1="0" x2="${x * u}" y2="${H}" stroke="#a3a3a3" stroke-width="1"/>`
  for (let y = 1; y < rows; y++) s += `<line x1="0" y1="${y * u}" x2="${W}" y2="${y * u}" stroke="#a3a3a3" stroke-width="1"/>`
  for (const [c, r, e] of items) s += `<text x="${c * u + u / 2}" y="${r * u + u / 2 + 9}" font-size="26" text-anchor="middle">${e}</text>`
  return svg(s, `0 0 ${W} ${H}`)
}
const HARITA_OKUL = harita(5, 4, [[0, 3, '🏠'], [4, 0, '🏫'], [1, 1, '🌳'], [3, 2, '🌳']])
const HARITA_TAVSAN = harita(5, 3, [[0, 1, '🐰'], [4, 1, '🥕'], [2, 1, '🚧']])
const HARITA_PARK = harita(5, 5, [[0, 4, '🧒'], [4, 4, '🛝'], [2, 0, '🍦']])
const HARITA_MARKET = harita(5, 3, [[0, 2, '🧒'], [2, 0, '🛒'], [4, 2, '🏠']])
const HARITA_YOL = harita(4, 3, [[0, 0, '🧒'], [3, 0, '🏫'], [1, 0, '🚧']])

/** Yüzlük tablo: highlight sarı, hidden soru işaretli kutular */
function yuzluk(highlight: number[], hidden: number[] = []): Visual {
  const u = 30
  let s = ''
  for (let n = 1; n <= 100; n++) {
    const x = ((n - 1) % 10) * u, y = Math.floor((n - 1) / 10) * u
    const h = highlight.includes(n), q = hidden.includes(n)
    s += `<rect x="${x + 1}" y="${y + 1}" width="${u - 2}" height="${u - 2}" rx="4" fill="${q ? '#ffffff' : h ? '#fde68a' : '#f8fafc'}" stroke="${q ? '#ef4444' : '#cbd5e1'}" stroke-width="${q ? 2.5 : 1}"/>`
    s += `<text x="${x + u / 2}" y="${y + u / 2 + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="${q ? '#ef4444' : '#1f2340'}">${q ? '?' : n}</text>`
  }
  return V(svg(s, '0 0 300 300'))
}

/** Cetvel üzerinde start–end arasında duran bir nesne (cm) */
function cetvel(start: number, end: number, renk = '#f97316', max = 15): Visual {
  const u = 20, L = 14, W = max * u + 2 * L
  let s = `<rect x="${L + start * u}" y="8" width="${(end - start) * u}" height="22" rx="8" fill="${renk}" stroke="#1f2340" stroke-width="2"/>`
  s += `<rect x="4" y="40" width="${W - 8}" height="40" rx="4" fill="#fef3c7" stroke="#1f2340" stroke-width="2"/>`
  for (let i = 0; i <= max; i++) {
    const x = L + i * u
    s += `<line x1="${x}" y1="40" x2="${x}" y2="54" stroke="#1f2340" stroke-width="2"/>`
    s += `<text x="${x}" y="72" font-size="11" font-weight="700" text-anchor="middle" fill="#1f2340">${i}</text>`
  }
  for (const v of [start, end]) s += `<line x1="${L + v * u}" y1="30" x2="${L + v * u}" y2="40" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 2"/>`
  return V(svg(s, `0 0 ${W} 86`))
}

/** Bir masayı n tane eş birimle (karış, kalem, ataş…) ölçmek */
function birimle(n: number, renk: string, etiket = 'MASA'): Visual {
  const W = 300, L = 10, w = W / n
  let s = `<rect x="${L}" y="10" width="${W}" height="34" rx="4" fill="#d6a46c" stroke="#1f2340" stroke-width="2"/>`
  s += `<text x="${L + W / 2}" y="32" font-size="13" font-weight="800" text-anchor="middle" fill="#1f2340">${etiket}</text>`
  for (let i = 0; i < n; i++) s += `<rect x="${L + i * w + 1}" y="52" width="${w - 2}" height="18" rx="6" fill="${renk}" stroke="#1f2340" stroke-width="1.5"/>`
  return V(svg(s, `0 0 ${W + 2 * L} 78`))
}

/** 1 metrelik mavi çubuk ve yaklaşık n metre uzunluğunda bir nesne */
function metreyle(n: number, etiket: string): Visual {
  const u = 60, L = 10, W = n * u
  let s = `<rect x="${L}" y="8" width="${u}" height="14" rx="3" fill="#3b82f6" stroke="#1f2340" stroke-width="1.5"/>`
  s += `<text x="${L + u + 8}" y="20" font-size="12" font-weight="800" fill="#1f2340">1 m</text>`
  s += `<rect x="${L}" y="34" width="${W}" height="30" rx="4" fill="#a3e635" stroke="#1f2340" stroke-width="2"/>`
  s += `<text x="${L + W / 2}" y="54" font-size="13" font-weight="800" text-anchor="middle" fill="#1f2340">${etiket}</text>`
  return V(svg(s, `0 0 ${Math.max(W, u + 40) + 2 * L} 72`))
}

/** Tahmin sorularında yanlış seçenek geri bildirimi (seçenekler küçükten büyüğe) */
const tahminFb = (n: number, ans: number): (string | null)[] =>
  Array.from({ length: n }, (_, i) =>
    i === ans
      ? null
      : i < ans
        ? 'Tahminin az kaldı. 10’luk bir grubu gözünde canlandır: resimde böyle kaç grup vardı?'
        : 'Tahminin fazla oldu. Resmi 10’luk gruplarla düşün: o kadar çok grup var mıydı?',
  )

export const grade2: Activity[] = [
  // ── Nesnelerin Geometrisi (1) ───────────────────────────────────────────

  // MAT.2.3.1 Günlük yaşamdaki nesneleri geometrik cisim olarak sınıflandırma
  {
    id: 'g2-cisimleri-tani',
    outcomes: ['MAT.2.3.1'],
    type: 'match',
    stage: 'model',
    title: 'Cisimleri tanıyalım',
    instructions: 'Her cisim modelini adıyla eşleştir. Yüzlerine ve köşelerine bak!',
    level: 1,
    launch: {
      text: 'Market poşetinden bir konserve kutusu, bir zar ve bir portakal çıktı. Bunlar birbirine hiç benzemiyor. Hangi cisimlere benziyorlar?',
      visual: { kind: 'emojiGroups', groups: [{ emoji: '🥫', count: 1 }, { emoji: '🎲', count: 1 }, { emoji: '🍊', count: 1 }] },
    },
    reflect: 'Küp ile kare prizmayı birbirinden nasıl ayırırsın? Bir arkadaşına anlat.',
    pairs: [
      { left: { visual: { kind: 'shape', shape: 'cube', color: '#f97316' } }, right: 'Küp' },
      { left: { visual: { kind: 'shape', shape: 'cuboid', color: '#3b82f6' } }, right: 'Dikdörtgen prizma' },
      { left: { visual: { kind: 'svg', svg: KARE_PRIZMA } }, right: 'Kare prizma' },
      { left: { visual: { kind: 'shape', shape: 'triangular-prism', color: '#eab308' } }, right: 'Üçgen prizma' },
      { left: { visual: { kind: 'shape', shape: 'sphere', color: '#ec4899' } }, right: 'Küre' },
      { left: { visual: { kind: 'shape', shape: 'cylinder', color: '#a855f7' } }, right: 'Silindir' },
    ],
    perRound: 3,
  },
  {
    id: 'g2-nesne-cisim',
    outcomes: ['MAT.2.3.1'],
    type: 'categorize',
    stage: 'model',
    title: 'Hangi cisme benziyor?',
    instructions: 'Günlük yaşamdaki nesneleri benzedikleri geometrik cisme göre grupla.',
    level: 1,
    launch: { text: 'Sınıfın oyuncak dolabı karıştı. Nesneleri biçimlerine göre kutulara yerleştirmemiz gerekiyor. Neye bakarak karar vereceksin?' },
    reflect: 'Bir nesnenin hangi cisme benzediğine karar verirken nelere baktın?',
    categories: [
      { id: 'kure', label: 'Küre', color: '#ec4899' },
      { id: 'silindir', label: 'Silindir', color: '#a855f7' },
      { id: 'kup', label: 'Küp', color: '#f97316' },
      { id: 'dprizma', label: 'Dikdörtgen prizma', color: '#3b82f6' },
    ],
    items: [
      { content: '⚽ Futbol topu', category: 'kure', explain: 'Topun hiç düz yüzü ve köşesi yok; her yöne yuvarlanır.' },
      { content: '🍊 Portakal', category: 'kure', explain: 'Portakal her yönden yuvarlaktır, düz yüzü yoktur.' },
      { content: '🌍 Yerküre modeli', category: 'kure', explain: 'Yerküre modeli top gibidir: hiç düz yüzü yoktur.' },
      { content: '🥫 Konserve kutusu', category: 'silindir', explain: 'Alt ve üst yüzü daire, yan yüzü eğri: silindir.' },
      { content: '🔋 Pil', category: 'silindir', explain: 'Pilin iki ucu daire biçiminde düz yüzdür, yanı eğridir.' },
      { content: '🎲 Oyun zarı', category: 'kup', explain: 'Zarın 6 yüzü de birbirine eş karedir.' },
      { content: '🧊 Buz küpü', category: 'kup', explain: 'Buz küpünün bütün yüzleri eş karedir.' },
      { content: '📦 Ayakkabı kutusu', category: 'dprizma', explain: 'Ayakkabı kutusunun yüzleri dikdörtgendir, hepsi eş kare değildir.' },
      { content: '📕 Kitap', category: 'dprizma', explain: 'Kitabın yüzleri dikdörtgendir.' },
      { content: '🧱 Tuğla', category: 'dprizma', explain: 'Tuğlanın yüzleri dikdörtgendir; uzunluğu, genişliği ve yüksekliği farklıdır.' },
    ],
  },
  {
    id: 'g2-cisim-ozellikleri',
    outcomes: ['MAT.2.3.1'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Ben hangi cisim?',
    instructions: 'Bilmeceyi oku. Cismin yüzlerini ve köşelerini düşünerek bul.',
    level: 2,
    launch: { text: 'Gözü kapalı bir oyun: Torbadaki cisme sadece dokunuyorsun. “Düz yüzü var mı? Köşesi var mı?” diye düşünerek adını bulabilir misin?' },
    reflect: 'Kendin bir cisim bilmecesi yaz. Hangi özellikleri ipucu olarak verirdin?',
    questions: [
      { prompt: 'Hiç köşem yok, hiç düz yüzüm yok. Her yöne yuvarlanırım. Ben hangi cisim?', choices: ['Küre', 'Silindir', 'Küp'], answer: 0, feedback: [null, 'Silindirin alt ve üst yüzü düzdür; yalnızca yan yatınca yuvarlanır.', 'Küpün köşeleri ve 6 düz yüzü var; yuvarlanmaz.'] },
      { prompt: '6 yüzüm var, hepsi birbirine eş kare. Ben hangi cisim?', choices: ['Kare prizma', 'Küp', 'Dikdörtgen prizma'], answer: 1, feedback: ['Kare prizmanın yalnız alt ve üst yüzü karedir; yan yüzleri uzun dikdörtgendir.', null, 'Dikdörtgen prizmanın yüzleri dikdörtgendir; hepsi eş kare değildir.'] },
      { prompt: { text: 'Alt ve üst yüzüm daire. Yan yüzüm eğri. Ben hangi cisim?', visual: { kind: 'shape', shape: 'cylinder', color: '#a855f7' } }, choices: ['Küre', 'Silindir', 'Üçgen prizma'], answer: 1, feedback: ['Kürenin hiç düz yüzü yoktur, daire biçiminde yüzü olamaz.', null, 'Üçgen prizmanın iki yüzü üçgendir, daire değil.'] },
      { prompt: 'İki yüzüm üçgen, diğer yüzlerim dikdörtgen. Kamp çadırına benzerim. Ben hangi cisim?', choices: ['Üçgen prizma', 'Küp', 'Silindir'], answer: 0, feedback: [null, 'Küpün hiç üçgen yüzü yoktur.', 'Silindirin düz yüzleri dairedir.'] },
      { prompt: { text: 'Alt ve üst yüzüm kare, yan yüzlerim uzun dikdörtgen. Ben hangi cisim?', visual: { kind: 'svg', svg: KARE_PRIZMA } }, choices: ['Küp', 'Kare prizma', 'Dikdörtgen prizma'], answer: 1, feedback: ['Küpün bütün yüzleri eş karedir; yan yüzleri uzun dikdörtgen olmaz.', null, 'Bu cismin alt ve üst yüzü kare; adında bu özellik var.'] },
      { prompt: 'Hem yuvarlanabilirim hem de dik durunca üst üste konabilirim. Ben hangi cisim?', choices: ['Küp', 'Küre', 'Silindir'], answer: 2, feedback: ['Küp üst üste konur ama yuvarlanmaz.', 'Küre yuvarlanır ama düz yüzü olmadığı için üst üste düzgün durmaz.', null] },
    ],
  },
  {
    id: 'g2-cisim-farkli',
    outcomes: ['MAT.2.3.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Cisimler)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçenek doğru olabilir; önemli olan gerekçen!',
    level: 2,
    launch: { text: 'Ece ile Can aynı dört cisme baktı ama farklı birini seçtiler. İkisi de haklı olabilir mi? Sen hangisini seçerdin?' },
    reflect: 'Seçtiğin cisim için gerekçeni söyle. Bir arkadaşın başka bir cismi seçtiyse onun gerekçesi ne olabilir?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [{ visual: { kind: 'shape', shape: 'cube', color: '#f97316' } }, { visual: { kind: 'shape', shape: 'sphere', color: '#ec4899' } }, { visual: { kind: 'shape', shape: 'cylinder', color: '#a855f7' } }, { visual: { kind: 'shape', shape: 'triangular-prism', color: '#eab308' } }],
        answer: 0,
        reasons: ['Bütün yüzleri eş kare olan tek cisim küp.', 'Hiç düz yüzü olmayan tek cisim küre.', 'Hem düz hem eğri yüzü olan tek cisim silindir.', 'Üçgen biçiminde yüzü olan tek cisim üçgen prizma.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [{ visual: { kind: 'shape', shape: 'cube', color: '#f97316' } }, { visual: { kind: 'svg', svg: KARE_PRIZMA } }, { visual: { kind: 'shape', shape: 'cuboid', color: '#3b82f6' } }, { visual: { kind: 'shape', shape: 'cylinder', color: '#a855f7' } }],
        answer: 0,
        reasons: ['Bütün yüzleri eş kare olan tek cisim küp.', 'Yalnızca iki yüzü kare olan tek cisim kare prizma.', 'Hiç kare yüzü olmayan, bütün yüzleri dikdörtgen olan tek cisim dikdörtgen prizma.', 'Eğri yüzü olan ve yuvarlanabilen tek cisim silindir.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['🎲 Zar', '📦 Koli', '🥫 Konserve kutusu', '🧊 Buz küpü'],
        answer: 0,
        reasons: ['Yüzlerinde noktalar olan, oyunda kullanılan tek nesne zar.', 'Dikdörtgen prizmaya benzeyen tek nesne koli; zar ve buz küpü küpe benziyor.', 'Silindire benzeyen, yuvarlanabilen tek nesne konserve kutusu.', 'Isınınca eriyen tek nesne buz küpü.'],
      },
    ],
  },

  // MAT.2.3.2 Geometrik cisim modelleriyle yapılar
  {
    id: 'g2-cisimlerle-yapilar',
    outcomes: ['MAT.2.3.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Yapılardaki cisimler',
    instructions: 'Yapıyı incele. Hangi cisimlerden oluştuğunu bul.',
    level: 1,
    launch: { text: 'Ahmet blok kutusundaki parçalarla bir ev ve bir kule yaptı. Bu yapıları sökersek hangi cisimler çıkar?', visual: { kind: 'svg', svg: EV_3B } },
    reflect: 'Bir yapıyı incelerken önce neye baktın? Parçaları nasıl ayırt ettin?',
    questions: [
      { prompt: { text: 'Bu evin çatısı hangi cisme benziyor?', visual: { kind: 'svg', svg: EV_3B } }, choices: ['Üçgen prizma', 'Küre', 'Silindir'], answer: 0, feedback: [null, 'Kürenin düz yüzü yoktur; çatının düz yüzleri ve köşeleri var.', 'Silindirin düz yüzleri dairedir; çatının ön yüzü ise üçgen.'] },
      { prompt: { text: 'Evin gövdesi hangi cisme benziyor?', visual: { kind: 'svg', svg: EV_3B } }, choices: ['Küre', 'Dikdörtgen prizma', 'Üçgen prizma'], answer: 1, feedback: ['Gövdenin düz yüzleri ve köşeleri var; kürenin yok.', null, 'Gövdenin ön yüzü üçgen değil, dikdörtgen.'] },
      { prompt: { text: 'Bu kule hangi cisimlerden yapılmış?', visual: { kind: 'svg', svg: KULE } }, choices: ['Küre ve küp', 'Silindir ve üçgen prizma', 'Küp ve silindir'], answer: 2, feedback: ['Üstteki parçanın alt ve üst yüzü düz daire; küre değil.', 'Alttaki parçanın yüzleri kare; üçgen prizma değil.', null] },
      { prompt: { text: 'Kardan adam hangi cisme benzeyen parçalardan oluşur?', visual: { kind: 'svg', svg: KARDAN_ADAM } }, choices: ['Kürelerden', 'Küplerden', 'Silindirlerden'], answer: 0, feedback: [null, 'Parçalarda köşe var mı? Bir daha bak.', 'Parçaların hiç düz yüzü yok; silindirin iki düz yüzü olurdu.'] },
      { prompt: { text: 'Bu köprü hangi cisimlerden yapılmış?', visual: { kind: 'svg', svg: KOPRU } }, choices: ['2 silindir ve 1 dikdörtgen prizma', '2 küp ve 1 silindir', '3 silindir'], answer: 0, feedback: [null, 'Ayakların yan yüzü eğri; küp olsaydı köşeleri olurdu.', 'Üstteki uzun parçanın köşeleri var; silindir değil.'] },
      { prompt: { text: 'Bu kulübe hangi cisimlerden oluşuyor?', visual: { kind: 'svg', svg: KULUBE } }, choices: ['Küp ve üçgen prizma', 'Küre ve küp', 'Silindir ve küp'], answer: 0, feedback: [null, 'Çatının düz yüzleri ve köşeleri var; küre olamaz.', 'Çatının ön yüzü üçgen; silindirde üçgen yüz yoktur.'] },
    ],
  },
  {
    id: 'g2-yapi-tarifi',
    outcomes: ['MAT.2.3.2'],
    type: 'match',
    stage: 'sembol',
    title: 'Yapı tarifi',
    instructions: 'Sözle yazılan tarifi doğru yapıyla eşleştir.',
    level: 2,
    launch: { text: 'Can bir yapı yaptı ve telefonda arkadaşına tarif etti: “Bir küp koydum, üstüne bir silindir koydum.” Arkadaşı aynı yapıyı kurabilir mi?' },
    reflect: 'Kendi hayalindeki bir yapıyı sözle tarif et. Arkadaşın çizerek aynısını yapabildi mi?',
    pairs: [
      { left: '1 küp, üstünde 1 silindir', right: { visual: { kind: 'svg', svg: KULE } } },
      { left: '1 dikdörtgen prizma, üstünde 1 üçgen prizma', right: { visual: { kind: 'svg', svg: EV_3B } } },
      { left: '3 küre üst üste', right: { visual: { kind: 'svg', svg: KARDAN_ADAM } } },
      { left: '2 silindir ayak, üstlerinde 1 dikdörtgen prizma', right: { visual: { kind: 'svg', svg: KOPRU } } },
      { left: '1 küp, üstünde 1 üçgen prizma', right: { visual: { kind: 'svg', svg: KULUBE } } },
    ],
    perRound: 5,
  },
  {
    id: 'g2-yapi-tasarla',
    outcomes: ['MAT.2.3.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Mühendis gibi düşün',
    instructions: 'Yapını tasarlarken hangi cismi seçersin? Nedenini düşünerek seç.',
    level: 2,
    launch: { text: 'Sınıfça bir oyuncak şehir kuracağız: kuleler, köprüler, arabalar… Her parça için en uygun cismi seçmek gerekiyor.' },
    reflect: 'Kendi yapını tasarlasaydın hangi cisimleri kullanırdın? Neden o cisimleri seçtin?',
    questions: [
      { prompt: 'Kulenin en üstüne hangisini koyarsan yuvarlanıp düşebilir?', choices: ['Küp', 'Kare prizma', 'Küre'], answer: 2, feedback: ['Küpün altı düz; üstte dengede durur.', 'Kare prizmanın düz yüzü üstte rahatça durur.', null] },
      { prompt: 'En sağlam kuleyi hangi cisimlerle yaparsın?', choices: ['Küplerle', 'Kürelerle', 'Yan yatırılmış silindirlerle'], answer: 0, feedback: [null, 'Kürelerin düz yüzü yok; üst üste konunca kayar.', 'Yan yatan silindir yuvarlanır; üstündeki cisim düşebilir.'] },
      { prompt: 'Oyuncak arabaya tekerlek yapacağız. Hangi cisim en uygun?', choices: ['Küp', 'Silindir', 'Üçgen prizma'], answer: 1, feedback: ['Küpün köşeleri var; dönerken takılır.', null, 'Üçgen prizmanın köşeleri var; yuvarlanmaz.'] },
      { prompt: 'Ev maketine yağmur suyu aksın diye eğimli bir çatı yapacağız. Hangi cisim uygun?', choices: ['Küp', 'Üçgen prizma', 'Küre'], answer: 1, feedback: ['Küpün üst yüzü düz; su birikir.', null, 'Küre evin üstünde durmaz, yuvarlanır.'] },
      { prompt: 'Robot yapıyoruz: kafası küp, gövdesi dikdörtgen prizma, kolları ve bacakları silindir. Kaç farklı cisim çeşidi kullandık?', choices: ['2', '3', '4'], answer: 1, feedback: ['Küp, dikdörtgen prizma, silindir… bir daha say.', null, 'Kollar ve bacaklar aynı cisim (silindir); onu bir kez say.'] },
      { prompt: 'Ece kumdan kale yaptı: 4 küp ve 1 üçgen prizma kullandı. Toplam kaç cisim kullandı?', choices: ['4', '5', '2'], answer: 1, feedback: ['Üçgen prizmayı da saymayı unutma.', null, '2, cisim çeşidi sayısı; toplam kaç parça kullanıldı?'] },
    ],
  },

  // MAT.2.3.3 Geometrik şekillerle modeller
  {
    id: 'g2-geometri-tahtasi',
    outcomes: ['MAT.2.3.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Geometri tahtasında şekiller',
    instructions: 'Çivilere dokunarak şekli oluştur ve kapat.',
    level: 2,
    launch: { text: 'Bir tahtaya çiviler çakılmış ve elinde lastik var. Lastiği çivilere takarak hangi şekilleri yapabilirsin?' },
    reflect: 'Kare ile dikdörtgeni yaparken neyin farklı olduğunu fark ettin?',
    tool: 'geoboard',
    config: { size: 6 },
    tasks: [
      { prompt: 'Bir üçgen oluştur.', target: { sides: 3 }, hints: ['Kaç köşesi olmalı?', 'Üç çiviye dokun, sonra ilk çiviye dönerek şekli kapat.'], explain: 'Üçgenin 3 kenarı, 3 köşesi var. Büyük ya da küçük, hepsi üçgen!' },
      { prompt: 'Bir kare oluştur. Bütün kenarları eşit olsun.', target: { sides: 4, square: true }, hints: ['Her kenarda kaç çivi aralığı var? Hepsi aynı mı?'], explain: 'Karenin 4 kenarı da eşit uzunlukta.' },
      { prompt: 'Bir dikdörtgen oluştur. İki kenarı uzun, iki kenarı kısa olsun.', target: { sides: 4, rect: true }, hints: ['Karşılıklı kenarlar eşit olmalı.', 'Uzun kenarda 3, kısa kenarda 1 aralık deneyebilirsin.'], explain: 'Dikdörtgenin karşılıklı kenarları eşittir.' },
      { prompt: '4 kenarlı ama ne kare ne de dikdörtgen olan bir şekil oluştur.', target: { sides: 4 }, hints: ['Bir köşeyi biraz kaydırırsan ne olur?'], explain: '4 kenarlı şekillerin hepsi kare ya da dikdörtgen değildir.' },
    ],
  },
  {
    id: 'g2-modeldeki-sekiller',
    outcomes: ['MAT.2.3.3'],
    type: 'fill',
    stage: 'model',
    title: 'Şekillerden modeller',
    instructions: 'Modeli oluşturan şekilleri say ve boşlukları doldur.',
    level: 1,
    launch: { text: 'Defne kâğıttan kestiği şekilleri yapıştırarak bir ev ve bir roket yaptı. Hangi şekillerden kaçar tane kullandı?', visual: { kind: 'svg', svg: EV_MODELI } },
    reflect: 'Sen bu şekillerle ne yapardın? Modelinde hangi şekilden kaç tane olurdu?',
    items: [
      { text: 'Ev modelinde __ kare var.', answers: ['3'], visual: { kind: 'svg', svg: EV_MODELI }, hints: ['Pencerelere bak. Evin gövdesine de bak.', 'Kapı kare mi, yoksa uzun mu?'], explain: 'Gövde ve iki pencere kare; kapı dikdörtgen.' },
      { text: 'Ev modelinde __ üçgen var.', answers: ['1'], visual: { kind: 'svg', svg: EV_MODELI }, hints: ['3 kenarlı şekilleri ara.'] },
      { text: 'Güneş __ şekline benziyor.', answers: ['daire'], choices: ['daire', 'kare', 'üçgen'], visual: { kind: 'svg', svg: EV_MODELI } },
      { text: 'Roket modelinde __ üçgen var.', answers: ['3'], visual: { kind: 'svg', svg: ROKET }, hints: ['Roketin burnuna ve kanatlarına bak.'] },
      { text: 'Roket modelinde __ daire var.', answers: ['2'], visual: { kind: 'svg', svg: ROKET } },
      { text: 'Roketin gövdesi bir __.', answers: ['dikdörtgen'], choices: ['dikdörtgen', 'üçgen', 'daire'], visual: { kind: 'svg', svg: ROKET } },
      { text: 'Roket toplam __ şekilden oluşuyor.', answers: ['6'], visual: { kind: 'svg', svg: ROKET }, hints: ['Üçgenleri, daireleri ve dikdörtgeni ayrı ayrı say, sonra topla.'], explain: '3 üçgen + 2 daire + 1 dikdörtgen = 6 şekil.' },
    ],
  },
  {
    id: 'g2-sekil-iliskileri',
    outcomes: ['MAT.2.3.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Şekilleri birleştir, ayır',
    instructions: 'Şekilleri birleştirince ya da kesince ne olur? Düşün ve seç.',
    level: 2,
    launch: { text: 'Tangram parçalarıyla oynarken iki üçgeni yan yana koyduk ve bir kare oluştu! Başka hangi şekiller birleşince yeni şekiller oluşur?', visual: { kind: 'svg', svg: IKI_UCGEN } },
    reflect: 'İki şekli birleştirerek yeni bir şekil elde ettiğin bir örnek ver. Nasıl yaptın?',
    questions: [
      { prompt: { text: 'İki eş kareyi yan yana koyarsak hangi şekli elde ederiz?', visual: { kind: 'svg', svg: IKI_KARE } }, choices: ['Üçgen', 'Dikdörtgen', 'Daha büyük bir kare'], answer: 1, feedback: ['Yeni şeklin kaç köşesi var? Say bakalım.', null, 'Yeni şeklin bir kenarı uzun, bir kenarı kısa oldu; bütün kenarları eşit değil.'] },
      { prompt: { text: 'Kareyi kırmızı çizgiden kesersek kaç üçgen elde ederiz?', visual: { kind: 'svg', svg: KOSEGENLI_KARE } }, choices: ['2', '3', '4'], answer: 0, feedback: [null, 'Kesik çizgi kareyi kaç parçaya ayırıyor?', 'Tek bir çizgi kareyi 4 parçaya ayırmaz.'] },
      { prompt: { text: 'İki eş üçgeni şekildeki gibi birleştirdik. Hangi şekil oluştu?', visual: { kind: 'svg', svg: IKI_UCGEN } }, choices: ['Kare', 'Daire', 'Üçgen'], answer: 0, feedback: [null, 'Oluşan şeklin köşeleri var; dairenin köşesi yoktur.', 'Oluşan şeklin kaç köşesi var? Üçgenin 3 köşesi olur.'] },
      { prompt: 'Kare ile dikdörtgenin ortak özelliği nedir?', choices: ['İkisi de yuvarlaktır', 'İkisinin de 3 kenarı vardır', 'İkisinin de 4 köşesi vardır'], answer: 2, feedback: ['İkisinin de köşeleri var; yuvarlak değiller.', 'Kare ve dikdörtgenin kenarlarını say.', null] },
      { prompt: 'Dairenin etrafını çizen kapalı çizgiye ne denir?', choices: ['Köşe', 'Çember', 'Kare'], answer: 1, feedback: ['Dairenin köşesi yoktur.', null, 'Karenin köşeleri var; dairenin sınırı yuvarlak bir çizgidir.'] },
      { prompt: { text: 'Bu kilim deseninde hangi şekiller var?', visual: { kind: 'svg', svg: KILIM } }, choices: ['Daire ve çember', 'Üçgen ve kare', 'Sadece daire'], answer: 1, feedback: ['Desende yuvarlak bir şekil görüyor musun?', null, 'Desendeki şekillerin köşeleri var.'] },
    ],
  },

  // MAT.2.3.4 Yön, konum, büyüklük değişince biçimsel özellikler değişmez
  {
    id: 'g2-tahtada-buyut',
    outcomes: ['MAT.2.3.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Büyüt, döndür: yine aynı mı?',
    instructions: 'Geometri tahtasında istenen şekilleri oluştur.',
    level: 2,
    launch: { text: 'Can küçük bir kare çizdi, Ece kocaman bir kare çizdi. Ece: “Benimki daha çok kare!” dedi. Sence büyüklük şeklin adını değiştirir mi?' },
    reflect: 'Küçük kare ile büyük karenin ortak özellikleri nelerdi? Ne değişti, ne değişmedi?',
    tool: 'geoboard',
    config: { size: 6 },
    tasks: [
      { prompt: 'Kenarı 1 aralık olan küçük bir kare oluştur.', target: { sides: 4, square: true, area: 1 }, hints: ['Yan yana iki çivi ve onların altındaki iki çivi.'] },
      { prompt: 'Şimdi kenarı 3 aralık olan büyük bir kare oluştur. Hâlâ kare mi?', target: { sides: 4, square: true, area: 9 }, hints: ['Her kenarda 3 aralık say.'], explain: 'Büyüdü ama 4 kenarı yine eşit: yine bir kare!' },
      { prompt: 'Uzun kenarları yatay duran bir dikdörtgen oluştur.', target: { sides: 4, rect: true }, hints: ['Yatayda uzun, dikeyde kısa bir şekil düşün.'] },
      { prompt: 'Aynı dikdörtgeni bu kez uzun kenarları dik duracak şekilde oluştur.', target: { sides: 4, rect: true }, hints: ['Önceki dikdörtgeni yan yatırdığını düşün.'], explain: 'Dikdörtgen dik dursa da yatık dursa da dikdörtgendir.' },
    ],
  },
  {
    id: 'g2-ayni-sekil',
    outcomes: ['MAT.2.3.4'],
    type: 'categorize',
    stage: 'model',
    title: 'Döndürsek de aynı şekil',
    instructions: 'Şekiller döndürülmüş, büyütülmüş ya da küçültülmüş olabilir. Her birini kendi grubuna koy.',
    level: 2,
    launch: { text: 'Trafik levhalarına bak: bazıları ters duruyor, bazıları küçük, bazıları büyük. Şeklin adını bulmak için neye bakarız?', visual: { kind: 'svg', svg: TERS_UCGEN } },
    reflect: 'Döndürülmüş kareyi tanımak için neyi saydın ya da neye baktın?',
    categories: [
      { id: 'ucgen', label: 'Üçgen', color: '#f97316' },
      { id: 'kare', label: 'Kare', color: '#3b82f6' },
      { id: 'dikdortgen', label: 'Dikdörtgen', color: '#eab308' },
      { id: 'daire', label: 'Daire', color: '#a855f7' },
    ],
    items: [
      { content: { visual: { kind: 'shape', shape: 'triangle', color: '#f97316' } }, category: 'ucgen', explain: '3 kenar, 3 köşe: üçgen.' },
      { content: { visual: { kind: 'svg', svg: TERS_UCGEN } }, category: 'ucgen', explain: 'Ters dursa da 3 kenarı ve 3 köşesi var.' },
      { content: { visual: { kind: 'svg', svg: EGIK_UCGEN } }, category: 'ucgen', explain: 'Eğik dursa da 3 köşesi var: üçgen.' },
      { content: { visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } }, category: 'kare', explain: '4 eş kenar: kare.' },
      { content: { visual: { kind: 'svg', svg: DONMUS_KARE } }, category: 'kare', explain: 'Köşesi üstte duran kare de karedir; 4 kenarı hâlâ eşit.' },
      { content: { visual: { kind: 'svg', svg: KUCUK_KARE } }, category: 'kare', explain: 'Küçük de olsa 4 kenarı eşit: kare.' },
      { content: { visual: { kind: 'shape', shape: 'rectangle', color: '#eab308' } }, category: 'dikdortgen', explain: 'İki uzun, iki kısa kenar: dikdörtgen.' },
      { content: { visual: { kind: 'svg', svg: DIK_DIKDORTGEN } }, category: 'dikdortgen', explain: 'Dik dursa da iki uzun, iki kısa kenarı var.' },
      { content: { visual: { kind: 'svg', svg: EGIK_DIKDORTGEN } }, category: 'dikdortgen', explain: 'Eğik dursa da karşılıklı kenarları eşit: dikdörtgen.' },
      { content: { visual: { kind: 'shape', shape: 'circle', color: '#a855f7' } }, category: 'daire', explain: 'Köşesi yok, yuvarlak: daire.' },
      { content: { visual: { kind: 'svg', svg: KUCUK_DAIRE } }, category: 'daire', explain: 'Küçük daire de dairedir.' },
    ],
  },
  {
    id: 'g2-donunce-degisir-mi',
    outcomes: ['MAT.2.3.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Döndürünce değişir mi?',
    instructions: 'Şeklin ya da cismin yönü, yeri veya büyüklüğü değişince adı değişir mi? Düşün ve seç.',
    level: 2,
    launch: { text: 'Kardeşin konserve kutusunu yan yatırdı ve “Artık silindir değil!” dedi. Sen ona ne söylerdin?' },
    reflect: 'Bir şekli döndürünce ne değişir, ne değişmez? Kendi örneğinle anlat.',
    questions: [
      { prompt: { text: 'Bir kareyi biraz döndürdük. Bu şeklin adı nedir?', visual: { kind: 'svg', svg: DONMUS_KARE } }, choices: ['Üçgen', 'Kare', 'Daire'], answer: 1, feedback: ['Köşeleri say: 3 değil, 4 köşe var.', null, 'Bu şeklin köşeleri var; dairenin köşesi yoktur.'] },
      { prompt: 'Bir üçgeni büyütürsek kaç köşesi olur?', choices: ['3', '4', '6'], answer: 0, feedback: [null, 'Büyütmek yeni köşe eklemez; sadece kenarlar uzar.', 'Büyüdü diye köşe sayısı katlanmaz.'] },
      { prompt: { text: 'Ters çevrilmiş bu şekil hangisidir?', visual: { kind: 'svg', svg: TERS_UCGEN } }, choices: ['Kare', 'Dikdörtgen', 'Üçgen'], answer: 2, feedback: ['Köşelerini say: kaç tane?', 'Kenarlarını say: dikdörtgenin 4 kenarı olur.', null] },
      { prompt: 'Bir konserve kutusunu yan yatırırsak hangi cisme benzer?', choices: ['Silindir', 'Küre', 'Küp'], answer: 0, feedback: [null, 'Yan yatınca yuvarlanır ama iki düz daire yüzü hâlâ var.', 'Kutunun hiç kare yüzü yok.'] },
      { prompt: 'Küçük bir misket ile büyük bir plaj topu hangi cisme benzer?', choices: ['Misket küreye, top silindire', 'İkisi de küreye', 'İkisi de küpe'], answer: 1, feedback: ['Topun da hiç düz yüzü yok; büyüklük cismin adını değiştirmez.', null, 'İkisinin de köşesi yok.'] },
      { prompt: 'Ayşe yatay duran bir dikdörtgeni dik duracak şekilde çevirdi. Şekil ne oldu?', choices: ['Kare oldu', 'Üçgen oldu', 'Yine dikdörtgen'], answer: 2, feedback: ['Kenarlar eşit olmadı; sadece duruşu değişti.', 'Kenar sayısı değişmedi: hâlâ 4 kenar.', null] },
      { prompt: 'Bir kareyi küçültürsek kenarları ne olur?', choices: ['Kısalır ama yine birbirine eşit kalır', 'Biri uzun biri kısa olur', 'Köşeleri kaybolur'], answer: 0, feedback: [null, 'Küçültünce bütün kenarlar birlikte kısalır.', 'Küçültmek köşeleri yok etmez.'] },
    ],
  },

  // MAT.2.3.5 Standart olmayan araçlarla sıvı miktarını tahmin etme
  {
    id: 'g2-sivi-sirala',
    outcomes: ['MAT.2.3.5'],
    type: 'sort',
    stage: 'model',
    title: 'Hangisi daha çok alır?',
    instructions: 'Kapları aldıkları sıvı miktarına göre sırala.',
    level: 1,
    launch: { text: 'Bahçedeki çiçekleri sulayacağız. Elimizde kaşık, bardak, sürahi ve kova var. Hangisiyle daha az taşıma yaparız?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🥄', count: 1 }, { emoji: '🥛', count: 1 }, { emoji: '🫖', count: 1 }, { emoji: '🪣', count: 1 }] } },
    reflect: 'Küçük kapla ölçünce neden daha çok kez doldurmamız gerekiyor?',
    rounds: [
      { prompt: 'Az sıvı alandan çok sıvı alana sırala.', items: ['🥄 Çay kaşığı', '☕ Fincan', '🥛 Su bardağı', '🪣 Kova', '🛁 Küvet'], ends: ['En az', 'En çok'], hints: ['Hangisinin içine en az su sığar?'] },
      { prompt: 'Kaplar aynı bardakla ölçüldü. Az sıvı alandan çok sıvı alana sırala.', items: ['🧴 Şişe · 3 bardak', '🫙 Kavanoz · 4 bardak', '🫖 Demlik · 6 bardak', '🪣 Kova · 20 bardak'], ends: ['En az', 'En çok'], hints: ['Aynı bardakla ölçüldüyse daha çok bardak ne demek?'] },
      { prompt: 'Aynı sürahiyi bu kaplarla boşaltıyoruz. Hangisini daha çok kez doldururuz? Azdan çoğa sırala.', items: ['🍲 Büyük tas', '🥛 Su bardağı', '🍵 Çay bardağı', '🥄 Kaşık'], ends: ['En az kez', 'En çok kez'], hints: ['Kap küçüldükçe kaç kez doldurmamız gerekir?'], explain: 'Kap küçüldükçe sayı büyür: sürahideki su değişmez, ölçme aracı değişir.' },
    ],
  },
  {
    id: 'g2-sivi-tahmin-olcum',
    outcomes: ['MAT.2.3.5'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Tahmin ve ölçüm',
    instructions: 'Sıvı miktarı için yapılan tahmini ölçümle karşılaştır ve doğru gruba koy.',
    level: 2,
    launch: { text: 'Öğrenciler önce “Bu kova kaç bardak su alır?” diye tahmin edip not aldılar. Sonra bardak bardak doldurup saydılar. Tahminler nasıl çıktı?' },
    reflect: 'Bir sonraki tahminini daha iyi yapmak için ne yapabilirsin?',
    categories: [
      { id: 'az', label: 'Tahmin ölçümden AZ', color: '#3b82f6' },
      { id: 'esit', label: 'Tahmin ölçüme EŞİT', color: '#22c55e' },
      { id: 'fazla', label: 'Tahmin ölçümden FAZLA', color: '#f97316' },
    ],
    items: [
      { content: 'Kova · Tahmin 10 bardak · Ölçüm 12 bardak', category: 'az', explain: '10, 12’den azdır.' },
      { content: 'Sürahi · Tahmin 4 bardak · Ölçüm 6 bardak', category: 'az', explain: '4, 6’dan azdır.' },
      { content: 'Şişe · Tahmin 2 bardak · Ölçüm 3 bardak', category: 'az', explain: '2, 3’ten azdır.' },
      { content: 'Demlik · Tahmin 5 bardak · Ölçüm 5 bardak', category: 'esit', explain: 'Tahmin ve ölçüm aynı.' },
      { content: 'Tas · Tahmin 8 kaşık · Ölçüm 8 kaşık', category: 'esit', explain: 'Tahmin ve ölçüm aynı.' },
      { content: 'Kavanoz · Tahmin 7 bardak · Ölçüm 4 bardak', category: 'fazla', explain: '7, 4’ten fazladır.' },
      { content: 'Fincan · Tahmin 10 kaşık · Ölçüm 9 kaşık', category: 'fazla', explain: '10, 9’dan fazladır; ama çok yakın bir tahmin!' },
      { content: 'Leğen · Tahmin 30 bardak · Ölçüm 25 bardak', category: 'fazla', explain: '30, 25’ten fazladır.' },
    ],
  },
  {
    id: 'g2-sivi-tahmin',
    outcomes: ['MAT.2.3.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kaç bardak su?',
    instructions: 'Kaplardaki sıvı miktarını tahmin et ve muhakeme et.',
    level: 2,
    launch: { text: 'Ali limonata yapacak. Sürahideki limonata kaç bardağa yeter? Bardak büyük olursa ne olur, küçük olursa ne olur?' },
    reflect: 'Aynı suyu büyük ve küçük bardakla ölçünce sonuçlar neden farklı çıkıyor? Su değişti mi?',
    questions: [
      { prompt: 'Bir sürahi su 4 bardağı dolduruyor. 2 sürahi su kaç bardağı doldurur?', choices: ['6', '8', '4'], answer: 1, feedback: ['4 + 2 değil; her sürahi 4 bardak doldurur.', null, 'Bu yalnızca 1 sürahi. 2 sürahi var.'] },
      { prompt: 'Aynı şişedeki suyu önce küçük, sonra büyük bardakla ölçüyoruz. Hangisiyle daha çok bardak sayarız?', choices: ['Küçük bardakla', 'Büyük bardakla', 'İkisi aynı'], answer: 0, feedback: [null, 'Büyük bardak bir seferde daha çok su alır; daha az kez doldururuz.', 'Bardaklar farklı büyüklükte; sayılar da farklı olur.'] },
      { prompt: 'Ölçme aracını değiştirdik. Şişedeki suyun miktarı değişir mi?', choices: ['Evet, artar', 'Hayır, değişmez', 'Evet, azalır'], answer: 1, feedback: ['Sayı değişebilir ama suyun kendisi artmaz.', null, 'Su dökülmedikçe azalmaz; sadece ölçtüğümüz sayı değişir.'] },
      { prompt: 'Bir kovayı doldurmak için hangisiyle daha az sayıda taşıma yaparız?', choices: ['🥄 Kaşıkla', '🥛 Bardakla', '🫖 Sürahiyle'], answer: 2, feedback: ['Kaşık çok küçük; kovayı doldurmak çok uzun sürer.', 'Bardaktan daha büyük bir kap var mı?', null] },
      { prompt: 'Ali, kovanın 10 bardak su alacağını tahmin etti. Ölçünce 12 bardak çıktı. Tahmini için ne söylenir?', choices: ['Tam doğru', 'Çok fazla', 'Gerçeğe yakın, biraz az'], answer: 2, feedback: ['10 ile 12 aynı değil.', 'Tahmin ölçümden fazla değil; 10, 12’den az.', null] },
      { prompt: 'Sürahi 6 bardak su alıyor. Sürahinin yarısı dolu. İçinde kaç bardak su var?', choices: ['3', '6', '12'], answer: 0, feedback: [null, '6 bardak, sürahi tamamen doluyken. Yarısı dolu.', 'Yarısı, bütünden az olmalı.'] },
    ],
  },

  // ── Sayılar ve Nicelikler (1) ───────────────────────────────────────────

  // MAT.2.1.1 100’e kadar niceliklerin sembolik temsilleri
  {
    id: 'g2-cokluk-olustur',
    outcomes: ['MAT.2.1.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Çokluğu bloklarla göster',
    instructions: 'Onluk ve birlik bloklarıyla çokluğu oluştur.',
    level: 1,
    launch: { text: 'Kırtasiyede boya kalemleri 10’arlı kutularda satılıyor. Tek tek saymak yerine kutuları sayarsak işimiz kolaylaşır mı?', visual: { kind: 'blocks', tens: 3, ones: 6 } },
    reflect: 'Büyük bir çokluğu tek tek saymak yerine 10’arlı gruplamak neden işimizi kolaylaştırır?',
    tool: 'base10',
    tasks: [
      { prompt: '3 kutu boya kalemi var, her kutuda 10 kalem. Yanında 6 kalem daha var. Hepsini bloklarla göster.', target: { value: 36 }, hints: ['Her kutu bir onluk blok olur.', 'Tek kalemler için birlik blok kullan.'], explain: '3 onluk 6 birlik = 36 kalem.' },
      { prompt: 'Okul bahçesinde 52 ağaç var. Bloklarla göster.', target: { value: 52 }, hints: ['52’de kaç tane 10 var?'] },
      { prompt: 'Bir kitap 70 sayfa. Bloklarla göster.', target: { value: 70 }, hints: ['Hiç tek sayfa kalmıyor mu? Birlik gerekir mi?'], explain: '70 = 7 onluk, 0 birlik.' },
      { prompt: 'Doksan dokuz bilyeyi bloklarla göster.', target: { value: 99 }, hints: ['Doksan kaç onluk eder?', 'Dokuz için kaç birlik gerekir?'] },
    ],
  },
  {
    id: 'g2-hizli-bakis-onluk',
    outcomes: ['MAT.2.1.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Hızlı bakış: onluklar',
    instructions: 'Görsel kısa süre görünüp kaybolacak. Tek tek sayma, onlukları gör!',
    level: 2,
    launch: { text: 'Öğretmen bir kartı 2 saniye gösterip saklayacak. Tek tek saymaya vaktin yok! Dolu onlukları görürsen hızlıca bulursun.', visual: { kind: 'dots', count: 23, arrangement: 'five' } },
    reflect: 'Noktaları tek tek saymadan nasıl bildin? 10’luk grupları görmek nasıl yardım etti?',
    questions: [
      { prompt: { text: 'Kaç nokta gördün?', visual: { kind: 'dots', count: 23, arrangement: 'five' } }, choices: ['23', '32', '13', '20'], answer: 0, flash: 2500, feedback: [null, 'Onluk ile birliğin yerini değiştirdin: 2 dolu onluk ve 3 tek nokta vardı.', 'Bir dolu onluğu atladın. Dolu kartları say: 10, 20…', 'Tek noktaları unutma: dolu onluklardan sonra birkaç nokta daha vardı.'] },
      { prompt: { text: 'Modeldeki sayı kaç?', visual: { kind: 'blocks', tens: 4, ones: 6 } }, choices: ['46', '64', '10', '40'], answer: 0, flash: 2500, feedback: [null, 'Uzun çubuklar onluk, küçük kareler birliktir. Kaç çubuk vardı?', 'Blokların sayısını saydın (4 + 6). Ama her çubuk 10 değerinde.', 'Birlikleri de ekle: çubuklardan sonra küçük kareler de vardı.'] },
      { prompt: { text: 'Kaç nokta gördün?', visual: { kind: 'dots', count: 37, arrangement: 'five' } }, choices: ['37', '73', '27', '30'], answer: 0, flash: 2500, feedback: [null, 'Önce onlukları yaz: 3 dolu onluk vardı.', 'Dolu onlukları tekrar say: 10, 20, 30.', 'Tek noktaları da ekle: 3 onluktan sonra 7 nokta vardı.'] },
      { prompt: { text: 'Çerçevede kaç sayaç var?', visual: { kind: 'tenframe', filled: 17, size: 20 } }, choices: ['17', '7', '10', '71'], answer: 0, flash: 2000, feedback: [null, 'Dolu çerçeveyi de say: 10 ve 7.', 'İkinci çerçevedeki sayaçları da ekle.', '1 onluk ve 7 birlik: önce onluğu yaz.'] },
      { prompt: { text: 'Modeldeki sayı kaç?', visual: { kind: 'blocks', tens: 7, ones: 0 } }, choices: ['70', '7', '17', '60'], answer: 0, flash: 2500, feedback: [null, 'Her çubuk 10 değerinde: 7 çubuk 7 değil, 70 eder.', 'Hiç birlik yoktu; sadece onluk çubuklar vardı.', 'Çubukları tekrar say: 10, 20, 30…'] },
      { prompt: { text: 'Kaç nokta gördün?', visual: { kind: 'dots', count: 41, arrangement: 'five' } }, choices: ['41', '14', '40', '51'], answer: 0, flash: 2500, feedback: [null, 'Onluk ile birliğin yerini değiştirdin: 4 dolu onluk vardı.', 'Son karttaki tek noktayı unutma.', 'Dolu onlukları tekrar say: 5 değil, 4 tane vardı.'] },
    ],
  },
  {
    id: 'g2-okunus-yazilis',
    outcomes: ['MAT.2.1.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Sayıların okunuşu',
    instructions: 'Rakamla yazılan sayıyı okunuşuyla eşleştir.',
    level: 1,
    launch: { text: 'Mektup yazan Ayşe “Sınıfımızda yirmi yedi öğrenci var.” yazdı. Arkadaşı aynı sayıyı rakamla yazdı. Aynı sayıyı iki farklı yolla yazabilir miyiz?' },
    reflect: '“Kırk iki” sözcüklerindeki “kırk” ve “iki” rakamla yazınca nereye gelir? Neden?',
    generator: { id: 'numberWords', params: { digits: 2 }, count: 8 },
    perRound: 4,
  },
  {
    id: 'g2-sayi-farkli',
    outcomes: ['MAT.2.1.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Sayılar)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçenek doğru olabilir; gerekçeni düşün!',
    level: 2,
    launch: { text: 'Dört kart var. Ece bir kartı, Can başka bir kartı “farklı” diye seçti. İkisi de gerekçesini söyleyince ikisinin de haklı olduğu anlaşıldı. Nasıl olabilir?' },
    reflect: 'Seçtiğin kartın farklı olduğunu bir arkadaşına nasıl kanıtlarsın? Başka bir kart için de gerekçe bulabilir misin?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [{ visual: { kind: 'blocks', tens: 4, ones: 3 } }, '34', 'kırk üç', '4 onluk 3 birlik'],
        answer: 0,
        reasons: ['Bloklarla, resimle gösterilen tek temsil; diğerleri yazıyla.', 'Diğer üçü 43’ü gösteriyor; bu kart 34.', 'Okunuşuyla, yalnızca sözcüklerle yazılan tek temsil.', 'Basamakları adıyla (onluk, birlik) söyleyen tek temsil.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['30', '45', '62', '99'],
        answer: 0,
        reasons: ['Tam onluk olan, birler basamağı 0 olan tek sayı.', 'Birler basamağında 5 olan tek sayı.', '60 ile 70 arasında olan tek sayı.', 'İki rakamı aynı olan tek sayı.'],
      },
    ],
  },

  // MAT.2.1.2 İki basamaklı sayıları çözümleme
  {
    id: 'g2-blok-olustur',
    outcomes: ['MAT.2.1.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayıyı bloklarla oluştur',
    instructions: 'Onluk ve birlik bloklarını ekleyerek sayıyı oluştur. “10’lu grupla” ve “Boz” düğmelerini dene!',
    level: 2,
    launch: { text: 'Elinde 10 tane birlik blok varsa, onları bir onluk çubukla değiştirebilir misin? Sayı değişir mi?' },
    reflect: '10 birliği bir onluğa çevirince sayı neden değişmedi?',
    tool: 'base10',
    tasks: [
      { prompt: '23’ü oluştur.', target: { value: 23 }, hints: ['23’te kaç onluk var?', 'Kaç birlik kaldı?'] },
      { prompt: '47’yi oluştur.', target: { value: 47 }, hints: ['Önce onlukları koy, sonra birlikleri.'] },
      { prompt: '3 onluk ve 15 birlik koy, sonra “10’lu grupla” düğmesine bas. Hangi sayıyı yaptın?', target: { value: 45 }, hints: ['15 birliğin içinde bir onluk saklı.'], explain: '3 onluk 15 birlik = 4 onluk 5 birlik = 45. Sayı aynı kaldı!' },
      { prompt: '6 onluktan oluşan sayıyı oluştur.', target: { value: 60 }, hints: ['10, 20, 30… diye 6 kez say.'] },
      { prompt: '100’ü oluştur. 10 onluğu gruplayınca ne oluyor?', target: { value: 100 }, hints: ['10 onluk kaç eder?'], explain: '10 onluk = 1 yüzlük = 100.' },
    ],
  },
  {
    id: 'g2-bloklarla-sayi',
    outcomes: ['MAT.2.1.2', 'MAT.2.1.1'],
    type: 'fill',
    stage: 'model',
    title: 'Bloklardaki sayı',
    instructions: 'Onlukları ve birlikleri say, sayıyı yaz.',
    level: 1,
    launch: { text: 'Kardeşin masaya onluk çubuklar ve birlik kareler dizmiş. Hangi sayıyı yaptığını bulabilir misin?' },
    reflect: 'Onluk çubukları sayarken nasıl saydın? “1, 2, 3” mü, “10, 20, 30” mu?',
    generator: { id: 'blocks', params: { maxHundreds: 0 }, count: 8 },
  },
  {
    id: 'g2-esnek-basamak',
    outcomes: ['MAT.2.1.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Esnek onluk ve birlik',
    instructions: 'Bir sayıyı farklı şekillerde çözümleyebiliriz. Boşluğu doldur.',
    level: 2,
    launch: { text: 'Ece 52 kalemi “5 kutu ve 2 tek kalem” diye saydı. Can aynı kalemleri “4 kutu ve 12 tek kalem” diye saydı. İkisi de doğru olabilir mi?' },
    reflect: '52’yi 5 onluk 2 birlik dışında nasıl çözümleyebilirsin? Kaç farklı yol bulabilirsin?',
    generator: { id: 'placeFlex', params: { hundreds: false }, count: 8 },
  },
  {
    id: 'g2-onluk-birlik',
    outcomes: ['MAT.2.1.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kim haklı? Onluk ve birlik',
    instructions: 'Durumu oku, onluk ve birliklerle düşünerek doğru cevabı seç.',
    level: 2,
    launch: { text: 'Pazarda yumurtalar 10’luk kolilerde, kalemler 10’luk destelerde satılıyor. Onluk ve birlik düşüncesi alışverişte nasıl işimize yarar?' },
    reflect: 'Bir sayıyı iki farklı şekilde çözümleyen iki arkadaşın neden ikisinin de haklı olabileceğini açıkla.',
    questions: [
      { prompt: 'Can: “52, 4 onluk 12 birliktir.” Ece: “52, 5 onluk 2 birliktir.” Kim haklı?', choices: ['İkisi de haklı', 'Sadece Ece', 'Sadece Can'], answer: 0, feedback: [null, '4 onluk 12 birliği say: 40 ve 12 daha. Can’ın yolu da 52 eder!', '5 onluk 2 birlik de 52 eder. Ece’nin yolu da doğru.'] },
      { prompt: 'Kalemler 10’arlı kutularda. 38 kalem için kaç kutu ve kaç tek kalem gerekir?', choices: ['3 kutu, 8 tek kalem', '8 kutu, 3 tek kalem', '38 kutu'], answer: 0, feedback: [null, 'Onluk ile birliğin yeri karıştı: 38’de 3 onluk var.', 'Her kutuda 10 kalem var; 38 kutu çok fazla olur.'] },
      { prompt: '4 deste kalem ve 6 kalem kaç kalem eder? (1 deste = 10)', choices: ['46', '64', '10'], answer: 0, feedback: [null, '4 deste 40 kalem eder; 6 kalem birliktir.', '4 + 6 değil; her deste 10 kalemdir.'] },
      { prompt: 'Hangisi 65 DEĞİLDİR?', choices: ['6 onluk 5 birlik', '5 onluk 15 birlik', '5 onluk 6 birlik'], answer: 2, feedback: ['6 onluk 60 eder, 5 birlik daha: 65.', '5 onluk 50 eder, 15 birlik daha: 65. Bu da 65!', null] },
      { prompt: 'Elif’in 7 onluk bloğu var. 75’i yapmak için kaç birlik daha eklemeli?', choices: ['5', '75', '68'], answer: 0, feedback: [null, '7 onluk zaten 70 eder; 75’e ne kadar kaldı?', '70’e kaç eklersen 75 olur? Birlikleri say.'] },
      { prompt: 'Mert 3 onluk 4 birlik yerine yanlışlıkla 4 onluk 3 birlik koydu. Ne oldu?', choices: ['43 oldu, 34’ten büyük', 'Değişmedi, yine 34', '43 oldu, 34’ten küçük'], answer: 0, feedback: [null, 'Onluk ile birliğin yeri değişince sayı değişir: 4 onluk 40 eder.', '43’te 4 onluk, 34’te 3 onluk var. Hangisi daha çok?'] },
    ],
  },

  // MAT.2.1.3 Sayıların sırası, sayı doğrusu, en yakın onluk
  {
    id: 'g2-sayi-dogrusu',
    outcomes: ['MAT.2.1.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusunda yerini bul',
    instructions: 'Sayı doğrusunda istenen noktayı işaretle.',
    level: 2,
    launch: { text: 'Uzun bir ip gerdik ve üzerine sayı kartları asıyoruz. 35 numaralı kartı nereye asarsın? 0’a mı yakın, 100’e mi?' },
    reflect: '37’nin 40’a 30’dan daha yakın olduğunu sayı doğrusunda nasıl gördün?',
    tool: 'numberline',
    config: { min: 0, max: 100, step: 5 },
    tasks: [
      { prompt: '35’i işaretle.', target: { value: 35 }, hints: ['Önce 30’u bul. 35, 30 ile 40’ın tam ortasında.'] },
      { prompt: '60’ı işaretle.', target: { value: 60 }, hints: ['50’nin yerini bul; 60 ondan bir onluk sonra.'] },
      { prompt: '37’ye en yakın onluğu işaretle.', target: { value: 40 }, hints: ['37, 30 ile 40 arasında. Hangisine daha az adım var?'], explain: '37’den 40’a 3 adım, 30’a 7 adım: 40 daha yakın.' },
      { prompt: '83’e en yakın onluğu işaretle.', target: { value: 80 }, hints: ['83, 80 ile 90 arasında. Hangisine daha yakın?'] },
      { prompt: '40 ile 50’nin tam ortasındaki sayıyı işaretle.', target: { value: 45 }, hints: ['40’tan da 50’den de aynı uzaklıkta olan sayı.'] },
    ],
  },
  {
    id: 'g2-once-sonra-arasinda',
    outcomes: ['MAT.2.1.3'],
    type: 'fill',
    stage: 'model',
    title: 'Önce, sonra, arasında',
    instructions: 'Sayı doğrusuna bak. Sayıların sırasını düşün ve boşlukları doldur.',
    level: 2,
    launch: { text: 'Sinemada koltuklar numaralı. Senin koltuğun 57. Hemen solundaki ve sağındaki koltukların numaraları kaç olabilir?' },
    reflect: 'En yakın onluğu bulurken sayı doğrusu sana nasıl yardım etti?',
    items: [
      { text: '57’den hemen önce gelen sayı __', answers: ['56'], visual: { kind: 'numberline', min: 50, max: 60, step: 1, hidden: [56], points: [57] }, hints: ['Sayı doğrusunda 57’den bir adım geri git.'] },
      { text: '69’dan hemen sonra gelen sayı __', answers: ['70'], visual: { kind: 'numberline', min: 64, max: 74, step: 1, hidden: [70], points: [69] }, hints: ['69’dan bir adım ileri gidince yeni bir onluğa geçiyor musun?'] },
      { text: '43 ile 45 arasındaki sayı __', answers: ['44'], visual: { kind: 'numberline', min: 40, max: 50, step: 1, hidden: [44] } },
      { text: '38’e en yakın onluk __', answers: ['40'], visual: { kind: 'numberline', min: 30, max: 40, step: 1, points: [38] }, hints: ['38, 30’a mı yoksa 40’a mı daha yakın?', 'Adımları say: 38’den 40’a kaç, 38’den 30’a kaç?'] },
      { text: '71’e en yakın onluk __', answers: ['70'], visual: { kind: 'numberline', min: 70, max: 80, step: 1, points: [71] }, hints: ['71, 70’ten kaç adım uzakta?'] },
      { text: '64  __  46', answers: ['>'], choices: ['<', '=', '>'], hints: ['Önce onlar basamağına bak: 6 onluk mu, 4 onluk mu çok?'] },
      { text: '39  __  93', answers: ['<'], choices: ['<', '=', '>'], hints: ['39’da kaç onluk, 93’te kaç onluk var?'] },
      { text: '70  __  7 onluk', answers: ['='], choices: ['<', '=', '>'], hints: ['7 onluk kaç eder?'] },
    ],
  },
  {
    id: 'g2-sayilari-sirala',
    outcomes: ['MAT.2.1.3'],
    type: 'sort',
    stage: 'sembol',
    title: 'Sayıları sırala',
    instructions: 'Sayıları istenen sıraya koy.',
    level: 1,
    launch: { text: 'Kütüphanedeki kitapların sırt numaraları karışmış: 34, 91, 19, 70, 43. Kitapları rafa sırayla nasıl dizersin?' },
    reflect: '26 ile 62’yi sıralarken önce hangi basamağa baktın? Neden?',
    rounds: [
      { prompt: 'Küçükten büyüğe sırala.', items: ['19', '34', '43', '70', '91'], ends: ['En küçük', 'En büyük'], hints: ['Önce onlar basamağına bak.'] },
      { prompt: 'Büyükten küçüğe sırala.', items: ['88', '85', '58', '50', '15'], ends: ['En büyük', 'En küçük'], hints: ['88 ile 85’in onlukları aynı; o zaman neye bakarsın?'] },
      { prompt: 'Küçükten büyüğe sırala.', items: ['26', '29', '62', '66', '92'], ends: ['En küçük', 'En büyük'], hints: ['26 ve 62 aynı rakamlardan oluşuyor ama onlukları farklı.'] },
      { prompt: 'Büyükten küçüğe sırala.', items: ['100', '99', '90', '19', '9'], ends: ['En büyük', 'En küçük'], hints: ['100, 10 onluktur.'] },
    ],
  },
  {
    id: 'g2-siralama-muhakeme',
    outcomes: ['MAT.2.1.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Sıralamada kim haklı?',
    instructions: 'Durumu oku, sayıları karşılaştırarak karar ver.',
    level: 2,
    launch: { text: 'Ece “29, 31’den büyüktür, çünkü 9 büyük bir rakam!” dedi. Sen ne düşünüyorsun?' },
    reflect: 'İki sayıyı karşılaştırırken önce hangi basamağa bakmalıyız? Bir örnekle açıkla.',
    questions: [
      { prompt: 'Ece: “29, 31’den büyüktür çünkü 9, 1’den büyük.” Ece haklı mı?', choices: ['Hayır; 31’de 3 onluk, 29’da 2 onluk var', 'Evet, haklı', 'İkisi eşittir'], answer: 0, feedback: [null, 'Birlere bakmadan önce onları karşılaştır: 2 onluk mu çok, 3 onluk mu?', '29 ile 31 farklı sayılar; sayı doğrusunda yerleri farklı.'] },
      { prompt: { text: '25 hangi onluğa daha yakın?', visual: { kind: 'numberline', min: 20, max: 30, step: 1, points: [25] } }, choices: ['20’ye', '30’a', 'İkisine eşit uzaklıkta'], answer: 2, feedback: ['20’den 25’e kaç adım, 25’ten 30’a kaç adım? Say bakalım.', 'Adımları say: 25’ten 30’a 5, 20’den 25’e de 5 adım.', null] },
      { prompt: 'Koşuda Ali 47., Can 52. sırada bitirdi. Kim daha önce bitirdi?', choices: ['Ali', 'Can', 'Aynı anda'], answer: 0, feedback: [null, '52, 47’den sonra gelir; sırası sonra gelen daha geç bitirmiştir.', 'Sıraları farklı; biri diğerinden önce bitirdi.'] },
      { prompt: 'Raftaki fiyatlar: 38 TL, 83 TL, 58 TL. En ucuzu hangisi?', choices: ['38 TL', '83 TL', '58 TL'], answer: 0, feedback: [null, '83’te 8 onluk var; en pahalısı bu.', '58’de 5 onluk var; 3 onluktan fazla.'] },
      { prompt: 'Hangisi 60 ile 70 arasındadır?', choices: ['67', '76', '59'], answer: 0, feedback: [null, '76, 7 onluk 6 birlik: 70’ten sonra gelir.', '59, 60’tan önce gelir.'] },
      { prompt: 'Hangisi 50’ye en yakın?', choices: ['48', '55', '60'], answer: 0, feedback: [null, '55, 50’den 5 adım uzakta. 48 kaç adım uzakta?', '60, 50’den 10 adım uzakta.'] },
    ],
  },

  // MAT.2.1.4 İleriye ve geriye ritmik sayma
  {
    id: 'g2-sicrayarak-say',
    outcomes: ['MAT.2.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kurbağa gibi sıçra',
    instructions: 'Sayı doğrusunda kafanda sıçra. Vardığın sayıyı işaretle.',
    level: 1,
    launch: { text: 'Bir kurbağa sayı doğrusunda hep aynı uzunlukta sıçrıyor. 0’dan başlayıp 3’er sıçrarsa hangi sayılara basar?' },
    reflect: 'Geriye doğru sıçrarken ne fark ettin? İleriye sıçramakla nasıl bir ilişkisi var?',
    tool: 'numberline',
    config: { min: 0, max: 40, step: 1 },
    tasks: [
      { prompt: '0’dan başla, 2’şer 2’şer 6 kez sıçra. Nereye vardın?', target: { value: 12 }, hints: ['2, 4, 6… diye say. Parmaklarınla sıçrayışları tut.'] },
      { prompt: '0’dan başla, 3’er 3’er 7 kez sıçra. Nereye vardın?', target: { value: 21 }, hints: ['3, 6, 9… Kaç kez saydığını unutma.'] },
      { prompt: '0’dan başla, 4’er 4’er 5 kez sıçra. Nereye vardın?', target: { value: 20 }, hints: ['4, 8, 12… 5 sıçrayış.'] },
      { prompt: '40’tan başla, 4’er 4’er geriye 3 kez sıçra. Nereye vardın?', target: { value: 28 }, hints: ['40, 36, … diye geri say.'] },
      { prompt: '30’dan başla, 3’er 3’er geriye 4 kez sıçra. Nereye vardın?', target: { value: 18 }, hints: ['30, 27, … diye geri say.'] },
    ],
  },
  {
    id: 'g2-yuzluk-tablo',
    outcomes: ['MAT.2.1.4'],
    type: 'fill',
    stage: 'model',
    title: 'Yüzlük tabloda ritim',
    instructions: 'Sarı kutular bir ritimle boyanmış. Soru işaretli kutudaki sayıyı bul.',
    level: 2,
    launch: { text: 'Yüzlük tabloda 5’er sayarken kutuları boyadık. Boyalı kutular düz bir çizgi oluşturdu! Başka ritimler nasıl desenler oluşturur?', visual: yuzluk([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) },
    reflect: '10’ar sayarken yüzlük tabloda nasıl hareket ettin? 5’er sayınca hangi sütunlar boyandı?',
    items: [
      { text: '5’er ileri sayıyoruz. Soru işaretli kutuda __ var.', answers: ['75'], visual: yuzluk([50, 55, 60, 65, 70], [75]), hints: ['Sarı kutular arasında kaç kutu atlanıyor?', 'Son sarı kutudan 5 kutu ilerle.'] },
      { text: '7’den başlayıp 10’ar ileri sayıyoruz. Soru işaretli kutuda __ var.', answers: ['57'], visual: yuzluk([7, 17, 27, 37, 47], [57]), hints: ['10 ilerleyince tabloda nereye gidiyorsun?'], explain: '10’ar sayınca hep bir alt satıra ineriz; birler basamağı değişmez.' },
      { text: '2’şer ileri sayıyoruz. Soru işaretli kutuda __ var.', answers: ['14'], visual: yuzluk([2, 4, 6, 8, 10, 12], [14]), hints: ['Her seferinde bir kutu atlıyoruz.'] },
      { text: '3’er ileri sayıyoruz. Soru işaretli kutuda __ var.', answers: ['18'], visual: yuzluk([3, 6, 9, 12, 15], [18]), hints: ['Sarı kutular arasında kaç kutu atlanıyor?'] },
      { text: '4’er ileri sayıyoruz. Soru işaretli kutuda __ var.', answers: ['28'], visual: yuzluk([4, 8, 12, 16, 20, 24], [28]), hints: ['24’ten 4 kutu ilerle.'] },
      { text: '100’den 5’er geri sayıyoruz. Soru işaretli kutuda __ var.', answers: ['80'], visual: yuzluk([100, 95, 90, 85], [80]), hints: ['Geri sayınca tabloda hangi yöne gidiyorsun?'] },
    ],
  },
  {
    id: 'g2-ritmik-sayma',
    outcomes: ['MAT.2.1.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'İleri ve geri ritmik sayma',
    instructions: 'Ritmik saymayı sürdür. Eksik sayıları yaz.',
    level: 1,
    launch: { text: 'Sınıfta bir ritim oyunu: Her öğrenci sırayla bir sayı söylüyor. Ali “3”, Ece “6”, Can “9” dedi. Sıradaki ne söylemeli?' },
    reflect: 'Bir sayı dizisinin kaçar kaçar ilerlediğini nasıl anlarsın?',
    items: [
      { text: '2, 4, 6, __, 10, __', answers: ['8', '12'], hints: ['Ardışık iki sayı arasındaki fark kaç?'] },
      { text: '20, 18, 16, __, __', answers: ['14', '12'], hints: ['Sayılar artıyor mu, azalıyor mu?', 'Kaçar kaçar azalıyor?'] },
      { text: '3, 6, 9, __, 15, __', answers: ['12', '18'], hints: ['3’er ileri say.'] },
      { text: '30, 27, 24, __, __', answers: ['21', '18'], hints: ['30’dan 27’ye kaç azaldı?'] },
      { text: '4, 8, 12, __, __', answers: ['16', '20'], hints: ['8’den 12’ye kaç arttı?'] },
      { text: '40, 36, __, 28, __', answers: ['32', '24'], hints: ['4’er geri say.'] },
      { text: '55, 60, 65, __, __', answers: ['70', '75'], hints: ['Birler basamağı 5, 0, 5, 0… diye gidiyor.'] },
      { text: '33, 43, 53, __, __', answers: ['63', '73'], hints: ['Hangi basamak değişiyor, hangisi aynı kalıyor?'] },
    ],
  },
  {
    id: 'g2-beser-sayarken',
    outcomes: ['MAT.2.1.4'],
    type: 'categorize',
    stage: 'problem',
    title: '5’er sayarken söyler miyiz?',
    instructions: '0’dan başlayıp 5’er ileri sayıyoruz. Hangi sayıları söyleriz? Grupla.',
    level: 2,
    launch: { text: 'Can 0’dan 100’e kadar 5’er sayacak. Ece “67’yi söyleyecek mi?” diye merak ediyor. Saymadan bilebilir miyiz?' },
    reflect: '5’er sayarken söylediğimiz sayıların hepsinde ortak olan ne? Bu kural 10’ar sayarken nasıl değişir?',
    categories: [
      { id: 'evet', label: 'Söyleriz', color: '#22c55e' },
      { id: 'hayir', label: 'Söylemeyiz', color: '#ef4444' },
    ],
    items: [
      { content: '15', category: 'evet', explain: '15’in birler basamağı 5: 5, 10, 15…' },
      { content: '40', category: 'evet', explain: '40’ın birler basamağı 0; 5’er sayarken söyleriz.' },
      { content: '65', category: 'evet', explain: 'Birler basamağı 5 olan sayıları söyleriz.' },
      { content: '85', category: 'evet', explain: '80’den sonra 85 gelir.' },
      { content: '100', category: 'evet', explain: '95’ten sonra 100 gelir.' },
      { content: '23', category: 'hayir', explain: '20’den sonra 25 gelir; 23 atlanır.' },
      { content: '52', category: 'hayir', explain: '50’den sonra 55 gelir; 52 atlanır.' },
      { content: '67', category: 'hayir', explain: '5’er sayarken birler basamağı hep 0 ya da 5’tir; 67’nin birler basamağı 7.' },
      { content: '98', category: 'hayir', explain: '95’ten sonra 100 gelir; 98 atlanır.' },
      { content: '41', category: 'hayir', explain: '40’tan sonra 45 gelir; 41 atlanır.' },
    ],
  },

  // MAT.2.1.5 Sayı ve şekil örüntüleri
  {
    id: 'g2-sekil-oruntuleri',
    outcomes: ['MAT.2.1.5'],
    type: 'quiz',
    stage: 'model',
    title: 'Şekil örüntüleri',
    instructions: 'Örüntünün ilk adımlarına bak, bir varsayımda bulun ve sıradaki adımı seç.',
    level: 2,
    launch: { text: 'Kibrit çöpleriyle ayrı ayrı üçgenler yapıyoruz: 1 üçgen 3 çöp, 2 üçgen 6 çöp… Çöplerin sayısı nasıl bir kural izliyor?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔺', count: 1 }, { emoji: '🔺', count: 2 }, { emoji: '🔺', count: 3 }], separator: '|' } },
    reflect: 'Bir örüntünün kuralını bulunca, kuralının doğru olduğunu nasıl sınadın?',
    questions: [
      { prompt: { text: 'Sıradaki adımda kaç 🔵 olur?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔵', count: 1 }, { emoji: '🔵', count: 3 }, { emoji: '🔵', count: 5 }], separator: '|' } }, choices: ['6', '7', '9'], answer: 1, feedback: ['Her adımda kaç tane eklendi? 1’den 3’e, 3’ten 5’e bak.', null, 'Her adımda 2 ekleniyor; 5’ten sonra bir adım ilerle, iki değil.'] },
      { prompt: 'Üçgen → Kare → Beşgen → ? Kenar sayıları 3, 4, 5 diye artıyor. Sıradaki şekil hangisi?', choices: [{ visual: { kind: 'shape', shape: 'hexagon', color: '#a855f7' } }, { visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } }, { visual: { kind: 'shape', shape: 'triangle', color: '#f97316' } }], answer: 0, feedback: [null, 'Kare 4 kenarlı; örüntüde kenar sayısı her adımda artıyor.', 'Örüntü başa dönmüyor; kenar sayısı 3, 4, 5 diye artıyor.'] },
      { prompt: { text: 'Kenar sayısı örüntüsü: 3, 4, 3, 4, 3, ? Soru işaretinin yerine kaç gelir?', visual: { kind: 'pattern', items: ['🔺', '🟦', '🔺', '🟦', '🔺', '?'] } }, choices: ['3', '4', '5'], answer: 1, feedback: ['Üçgenden sonra hangi şekil geliyor? Kenarlarını say.', null, 'Örüntü tekrar ediyor: 3, 4, 3, 4… 5 kenarlı şekil yok.'] },
      { prompt: { text: 'Sıradaki adımda kaç ⭐ olur?', visual: { kind: 'emojiGroups', groups: [{ emoji: '⭐', count: 2 }, { emoji: '⭐', count: 4 }, { emoji: '⭐', count: 6 }], separator: '|' } }, choices: ['7', '8', '10'], answer: 1, feedback: ['Her adımda 1 değil, 2 yıldız ekleniyor.', null, 'Bir adım sonrasını düşün; iki adım sonrasını değil.'] },
      { prompt: { text: 'Sıradaki adımda kaç 🍎 kalır?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🍎', count: 10 }, { emoji: '🍎', count: 8 }, { emoji: '🍎', count: 6 }], separator: '|' } }, choices: ['5', '2', '4'], answer: 2, feedback: ['Her adımda 1 değil, 2 elma eksiliyor.', 'Bir adım sonrasını düşün: 6’dan 2 eksilt.', null] },
      { prompt: 'Ece: “Bu örüntü 3’er artıyor.” diyor. Örüntü: 4, 7, 10, 13. Ece’nin varsayımı doğru mu?', choices: ['Hayır, 2’şer artıyor', 'Evet, doğru', 'Hayır, 4’er artıyor'], answer: 1, feedback: ['4’ten 7’ye kaç adım var? Sınayalım.', null, '4’ten başlıyor ama 4’er artmıyor: 7 − 4 kaç?'] },
      { prompt: 'Kibritle ayrı ayrı üçgenler: 1 üçgen 3 çöp, 2 üçgen 6 çöp, 3 üçgen 9 çöp. 4 üçgen için kaç çöp gerekir?', choices: ['10', '12', '13'], answer: 1, feedback: ['Her yeni üçgen 1 değil, 3 çöp ister.', null, 'Her adımda 3 çöp ekleniyor: 9’dan sonra ne gelir?'] },
    ],
  },
  {
    id: 'g2-sayi-oruntuleri',
    outcomes: ['MAT.2.1.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Sayı örüntüleri',
    instructions: 'Örüntü artıyor mu, azalıyor mu, tekrar mı ediyor? Eksikleri bul.',
    level: 2,
    launch: { text: 'Bir bitki her hafta aynı miktarda uzuyor: 12 cm, 15 cm, 18 cm… Gelecek hafta kaç cm olur dersin?' },
    reflect: 'Artan, azalan ve tekrar eden örüntüleri birbirinden nasıl ayırırsın?',
    items: [
      { text: '12, 15, 18, __, __', answers: ['21', '24'], hints: ['12’den 15’e kaç arttı?'] },
      { text: '40, 36, 32, __, __', answers: ['28', '24'], hints: ['Sayılar küçülüyor; her adımda kaç azalıyor?'] },
      { text: '2, 5, 8, 11, __', answers: ['14'], hints: ['Ardışık sayıların farkına bak.'] },
      { text: '90, 80, 70, __', answers: ['60'], hints: ['Hangi basamak değişiyor?'] },
      { text: '7, 7, 9, 7, 7, 9, 7, 7, __', answers: ['9'], hints: ['Tekrar eden parçayı bul.'], explain: '“7, 7, 9” tekrar ediyor.' },
      { text: '1. adımda 3, 2. adımda 6, 3. adımda 9 kenar var. 4. adımda __ kenar olur.', answers: ['12'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🔺', count: 1 }, { emoji: '🔺', count: 2 }, { emoji: '🔺', count: 3 }], separator: '|' }, hints: ['Her yeni üçgen kaç kenar getiriyor?'] },
      { text: 'Her karenin 4 köşesi var. 1 kare 4, 2 kare 8, 3 kare __ köşe eder.', answers: ['12'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🟦', count: 1 }, { emoji: '🟦', count: 2 }, { emoji: '🟦', count: 3 }], separator: '|' }, hints: ['4’er say.'] },
    ],
  },
  {
    id: 'g2-oruntu-kurali',
    outcomes: ['MAT.2.1.5'],
    type: 'match',
    stage: 'sembol',
    title: 'Örüntünün kuralı',
    instructions: 'Her örüntüyü sözle yazılmış kuralıyla eşleştir.',
    level: 2,
    launch: { text: 'Can bir sayı örüntüsü yazdı ama kuralını söylemedi. Kuralı bulup sözle anlatabilir misin?' },
    reflect: 'Kendi örüntünü yaz ve kuralını bir cümleyle söyle. Arkadaşın kuralı bulabildi mi?',
    pairs: [
      { left: '5, 10, 15, 20', right: '5’er artıyor' },
      { left: '30, 27, 24, 21', right: '3’er azalıyor' },
      { left: '12, 14, 16, 18', right: '2’şer artıyor' },
      { left: '40, 36, 32, 28', right: '4’er azalıyor' },
      { left: '8, 11, 14, 17', right: '3’er artıyor' },
      { left: '1, 2, 1, 2, 1, 2', right: 'Tekrar ediyor' },
      { left: '70, 60, 50, 40', right: '10’ar azalıyor' },
    ],
    perRound: 4,
  },
  {
    id: 'g2-oruntu-farkli',
    outcomes: ['MAT.2.1.5'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Örüntüler)',
    instructions: 'Hangi örüntü diğerlerinden farklı? Gerekçeni düşün; birden çok doğru cevap var!',
    level: 2,
    launch: { text: 'Dört örüntü yan yana duruyor. Her birinde başka bir kural saklı. Hangisini “farklı” diye seçersin?' },
    reflect: 'Seçtiğin örüntünün kuralını sözle söyle. Başka bir örüntüyü seçen arkadaşına ne derdin?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['10, 20, 30, 40', '3, 6, 9, 12', '40, 36, 32, 28', '7, 8, 7, 8'],
        answer: 0,
        reasons: ['Bütün sayıları tam onluk olan tek örüntü.', '3’er artan tek örüntü; diğer artan örüntü 10’ar artıyor.', 'Azalan tek örüntü.', 'Tekrar eden tek örüntü.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [{ visual: { kind: 'pattern', items: ['🔺', '🟦', '🔺', '🟦'] } }, { visual: { kind: 'emojiGroups', groups: [{ emoji: '⭐', count: 1 }, { emoji: '⭐', count: 2 }, { emoji: '⭐', count: 3 }], separator: '|' } }, { visual: { kind: 'emojiGroups', groups: [{ emoji: '🍎', count: 3 }, { emoji: '🍎', count: 2 }, { emoji: '🍎', count: 1 }], separator: '|' } }, { visual: { kind: 'pattern', items: ['🔺', '🔺', '🟦', '🔺', '🔺', '🟦'] } }],
        answer: 0,
        reasons: ['İki şeklin sırayla tekrar ettiği tek örüntü.', 'Her adımda bir tane artan tek örüntü.', 'Her adımda azalan tek örüntü.', 'Tekrar eden parçası üç şekilden oluşan tek örüntü.'],
      },
    ],
  },

  // MAT.2.1.6 50’ye kadar nesnelerin sayısını tahmin etme
  {
    id: 'g2-tahmin-et',
    outcomes: ['MAT.2.1.6'],
    type: 'quiz',
    stage: 'model',
    title: 'Hızlı bakış: saymadan tahmin et',
    instructions: 'Resim kısa süre görünecek. Saymaya çalışma; 10’luk grupları düşünerek en yakın tahmini seç.',
    level: 2,
    fixedOrder: true,
    launch: { text: 'Parkta bir kuş sürüsü havalandı. Saymaya vakit yok! Yaklaşık kaç kuş olduğunu nasıl tahmin edersin?' },
    reflect: 'Tahmin ederken hangi stratejiyi kullandın? 10’luk bir grubu gözünde canlandırmak işe yaradı mı?',
    questions: [
      { prompt: { text: 'Yaklaşık kaç uğur böceği var?', visual: { kind: 'emoji', emoji: '🐞', count: 11 } }, choices: ['Yaklaşık 10', 'Yaklaşık 25', 'Yaklaşık 45'], answer: 0, flash: 2000, feedback: tahminFb(3, 0) },
      { prompt: { text: 'Yaklaşık kaç çilek var?', visual: { kind: 'emoji', emoji: '🍓', count: 24 } }, choices: ['Yaklaşık 10', 'Yaklaşık 25', 'Yaklaşık 45'], answer: 1, flash: 2000, feedback: tahminFb(3, 1) },
      { prompt: { text: '10’arlı gruplara bak. Yaklaşık kaç yıldız var?', visual: { kind: 'emoji', emoji: '⭐', count: 44, group: 10 } }, choices: ['Yaklaşık 10', 'Yaklaşık 25', 'Yaklaşık 45'], answer: 2, flash: 2500, feedback: tahminFb(3, 2) },
      { prompt: { text: 'Yaklaşık kaç balık var?', visual: { kind: 'emoji', emoji: '🐟', count: 27 } }, choices: ['Yaklaşık 10', 'Yaklaşık 25', 'Yaklaşık 45'], answer: 1, flash: 2000, feedback: tahminFb(3, 1) },
      { prompt: { text: 'Yaklaşık kaç çiçek var?', visual: { kind: 'emoji', emoji: '🌸', count: 47 } }, choices: ['Yaklaşık 10', 'Yaklaşık 25', 'Yaklaşık 45'], answer: 2, flash: 2500, feedback: tahminFb(3, 2) },
      { prompt: { text: 'Yaklaşık kaç balon var?', visual: { kind: 'emoji', emoji: '🎈', count: 9 } }, choices: ['Yaklaşık 10', 'Yaklaşık 25', 'Yaklaşık 45'], answer: 0, flash: 2000, feedback: tahminFb(3, 0) },
    ],
  },
  {
    id: 'g2-tahmin-sayim',
    outcomes: ['MAT.2.1.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Tahminim nasıldı?',
    instructions: 'Tahmini sayma sonucuyla karşılaştır ve doğru gruba koy.',
    level: 2,
    launch: { text: 'Öğrenciler kavanozdaki şekerleri önce tahmin etti, sonra saydı. Tahminleri sayımdan az mı çıktı, fazla mı?' },
    reflect: '“Tahminim sayımdan biraz azdı.” ile “Tahminim sayımdan çok azdı.” arasındaki farkı bir örnekle açıkla.',
    categories: [
      { id: 'az', label: 'Tahmin sayımdan AZ', color: '#3b82f6' },
      { id: 'esit', label: 'Tahmin sayıma EŞİT', color: '#22c55e' },
      { id: 'fazla', label: 'Tahmin sayımdan FAZLA', color: '#f97316' },
    ],
    items: [
      { content: 'Tahmin 25 · Sayım 30', category: 'az', explain: '25, 30’dan azdır.' },
      { content: 'Tahmin 12 · Sayım 21', category: 'az', explain: '12, 21’den azdır. Rakamlar aynı ama sayılar farklı!' },
      { content: 'Tahmin 20 · Sayım 28', category: 'az', explain: '20, 28’den azdır.' },
      { content: 'Tahmin 18 · Sayım 18', category: 'esit', explain: 'Tahmin ve sayım aynı.' },
      { content: 'Tahmin 33 · Sayım 33', category: 'esit', explain: 'Tahmin ve sayım aynı.' },
      { content: 'Tahmin 40 · Sayım 36', category: 'fazla', explain: '40, 36’dan fazladır.' },
      { content: 'Tahmin 45 · Sayım 39', category: 'fazla', explain: '45, 39’dan fazladır.' },
      { content: 'Tahmin 50 · Sayım 47', category: 'fazla', explain: '50, 47’den fazladır; ama çok yakın bir tahmin.' },
    ],
  },
  {
    id: 'g2-tahmin-stratejisi',
    outcomes: ['MAT.2.1.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Tahmin stratejileri',
    instructions: 'Bir çokluğun parçasından yararlanarak tahmin et.',
    level: 2,
    launch: { text: 'Kavanozun yarısını doldurunca 20 bilye sığdı. Kavanozun tamamına kaç bilye sığar? Saymadan tahmin edebilir miyiz?' },
    reflect: 'Bir parçayı sayıp bütünü tahmin etmek neden işe yarar? Kendi örneğini ver.',
    questions: [
      { prompt: 'Kavanozun yarısında 20 bilye var. Kavanoz tamamen dolunca yaklaşık kaç bilye olur?', choices: ['Yaklaşık 20', 'Yaklaşık 40', 'Yaklaşık 100'], answer: 1, feedback: ['20 bilye sadece yarısında; diğer yarısı da dolunca?', null, 'İki yarım bir bütün eder: 20 ve 20. 100 çok fazla.'] },
      { prompt: 'Bir sırada 10 sandalye var. Salonda 4 sıra var ve hepsi dolu. Yaklaşık kaç kişi var?', choices: ['14', '40', '10'], answer: 1, feedback: ['10 + 4 değil; her sırada 10 kişi, toplam 4 sıra var.', null, 'Bu sadece bir sıra; salonda 4 sıra var.'] },
      { prompt: 'Ayşe’nin bir avucuna yaklaşık 10 fasulye sığıyor. Tabakta 3 avuç kadar fasulye var. Yaklaşık kaç fasulye var?', choices: ['13', '30', '50'], answer: 1, feedback: ['10 + 3 değil; her avuç yaklaşık 10 fasulye.', null, '50 için 5 avuç gerekirdi.'] },
      { prompt: { text: '10’arlı gruplara bak. Yaklaşık kaç şeker var?', visual: { kind: 'emoji', emoji: '🍬', count: 34, group: 10 } }, choices: ['Yaklaşık 15', 'Yaklaşık 35', 'Yaklaşık 50'], answer: 1, feedback: ['Dolu 10’luk gruplar kaç tane? Bir daha bak.', null, '50 için 5 dolu grup gerekirdi.'] },
      { prompt: 'Ali kurabiyeleri saymadan “yaklaşık 30” dedi. Sayınca 28 çıktı. Ali’nin tahmini nasıl?', choices: ['Sayıma çok yakın, iyi bir tahmin', 'Çok uzak, kötü bir tahmin', 'Tahmin sayımla aynı olmalıydı'], answer: 0, feedback: [null, '28 ile 30 arasında sadece 2 fark var; bu çok yakın!', 'Tahmin tam doğru olmak zorunda değil; yakın olması yeter.'] },
      { prompt: 'Hangi strateji tahmini kolaylaştırır?', choices: ['Önce 10 tanesini ayırıp kalanı bu grupla karşılaştırmak', 'Gözünü kapatıp bir sayı söylemek', 'Bildiğin en büyük sayıyı söylemek'], answer: 0, feedback: [null, 'Tahmin bir tahmindir ama bir dayanağı olmalı.', 'Büyük sayı söylemek tahmini iyileştirmez; neye dayandığın önemli.'] },
    ],
  },

  // ── İşlemlerden Cebirsel Düşünmeye ──────────────────────────────────────

  // MAT.2.2.1 Toplama ve çıkarma gerektiren günlük yaşam problemleri
  {
    id: 'g2-problem-serit',
    outcomes: ['MAT.2.2.1'],
    type: 'match',
    stage: 'model',
    title: 'Problemi şeritle göster',
    instructions: 'Her problemi onu gösteren şerit modeliyle eşleştir. Soru işareti bilinmeyeni gösterir.',
    level: 2,
    launch: { text: 'Elif’in 30 bilyesi var. Bazı problemlerde bilye alıyor, bazılarında veriyor, bazılarında arkadaşıyla karşılaştırıyor. Bir şerit çizerek hangisinin hangisi olduğunu görebilir miyiz?', visual: tape([['30', 30], ['12', 12]], '?') },
    reflect: 'Şerit modelinde “?” bütünün üstündeyse mi, bir parçanın içindeyse mi toplama yaparız? Neden?',
    pairs: [
      { left: 'Elif’in 30 bilyesi vardı, 12 bilye daha aldı. Kaç bilyesi oldu?', right: { visual: tape([['30', 30], ['12', 12]], '?') } },
      { left: 'Elif’in 30 bilyesi vardı, 12’sini kardeşine verdi. Kaç bilyesi kaldı?', right: { visual: tape([['12', 12], ['?', 18]], '30') } },
      { left: 'Elif’in 30, Can’ın 12 bilyesi var. Elif’in kaç fazla bilyesi var?', right: { visual: tape([['Elif 30', 30]], undefined, [['Can 12', 12], ['?', 18]]) } },
      { left: 'Kumbarada bir miktar para vardı. 20 TL atınca 45 TL oldu. Başta kaç TL vardı?', right: { visual: tape([['?', 25], ['20', 20]], '45') } },
      { left: 'Sınıfta 18 kız ve 15 erkek öğrenci var. Kaç öğrenci var?', right: { visual: tape([['18', 18], ['15', 15]], '?') } },
    ],
    perRound: 5,
  },
  {
    id: 'g2-hangi-islem',
    outcomes: ['MAT.2.2.1'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Hangi işlemle çözülür?',
    instructions: 'Problemi çözmek için doğru işlemi seç. Anahtar kelimeye değil, duruma bak!',
    level: 2,
    launch: { text: 'Can “Problemde ‘daha’ kelimesi varsa hep toplarım.” diyor. Bu her zaman işe yarar mı? Birlikte bakalım.' },
    reflect: 'Bir problemde toplama mı çıkarma mı yapacağına nasıl karar verdin? Kelimelere mi baktın, duruma mı?',
    questions: [
      { prompt: 'Selin’in 35 çıkartması vardı. 12 çıkartma daha aldı. Kaç çıkartması oldu?', choices: ['35 − 12', '35 + 12', '12 − 35'], answer: 1, feedback: ['Selin çıkartma verdi mi, aldı mı? Aldıysa çıkartmaları arttı.', null, 'Küçük sayıdan büyük sayıyı çıkarmıyoruz; ayrıca çıkartmalar arttı.'] },
      { prompt: 'Bahçede 60 çiçek vardı. 24’ünü kopardık. Kaç çiçek kaldı?', choices: ['60 − 24', '60 + 24', '24 + 24'], answer: 0, feedback: [null, 'Çiçek kopardıysak çiçek sayısı arttı mı, azaldı mı?', 'Başta 60 çiçek vardı; bu sayı işlemde olmalı.'] },
      { prompt: 'Bir tişört 45 TL, bir şapka 30 TL. İkisi birlikte kaç TL?', choices: ['45 − 30', '30 − 15', '45 + 30'], answer: 2, feedback: ['“Birlikte” iki parçayı birleştirmek demek.', 'Problemde 15 diye bir sayı yok.', null] },
      { prompt: { text: 'Emre’nin boyu 98 cm, kardeşinin boyu 76 cm. Emre kardeşinden kaç cm uzun?', visual: tape([['Emre 98', 98]], undefined, [['76', 76], ['?', 22]]) }, choices: ['98 + 76', '98 − 76', '76 − 98'], answer: 1, feedback: ['“Uzun” kelimesi toplama demek değil; iki boyu karşılaştırıp farkı buluyoruz.', null, 'Büyük sayıdan küçük sayıyı çıkarırız: hangisi daha uzun?'] },
      { prompt: { text: 'Kumbarada bir miktar para vardı. 20 TL atınca 45 TL oldu. Başta kaç TL vardı?', visual: tape([['?', 25], ['20', 20]], '45') }, choices: ['45 − 20', '45 + 20', '20 + 20'], answer: 0, feedback: [null, '“Atınca” toplama gibi görünüyor ama 45 bütün; başlangıç parçasını arıyoruz.', 'Bütün 45 TL; bu sayı işlemde olmalı.'] },
      { prompt: 'Ayşe 20 TL ile 8 TL’lik simit ve 5 TL’lik ayran aldı. Kalan parasını hangi işlemle buluruz?', choices: ['20 − 8 − 5', '20 + 8 + 5', '20 − 8 + 5'], answer: 0, feedback: [null, 'Alışveriş yapınca para azalır mı, artar mı?', 'Ayran da para harcatır; onu da çıkarmalıyız.'] },
      { prompt: 'Bir sepette bir düzine, diğerinde bir deste yumurta var. Toplam kaç yumurta var?', choices: ['10 + 10', '12 + 12', '12 + 10'], answer: 2, feedback: ['1 düzine 10 değil, 12 tanedir.', '1 deste 12 değil, 10 tanedir.', null] },
    ],
  },
  {
    id: 'g2-problemler',
    outcomes: ['MAT.2.2.1'],
    type: 'fill',
    stage: 'problem',
    title: 'Günlük yaşam problemleri',
    instructions: 'Problemi oku, şeride bak. Verilenleri ve isteneni bul, sonucu yaz.',
    level: 2,
    launch: { text: 'Pazar, okul, otobüs, kütüphane… Gün boyunca karşımıza toplama ve çıkarma problemleri çıkar. Önce ne olduğunu anlayalım, sonra çözelim.' },
    reflect: 'Hangi problem sana en zor geldi? Şerit modeli onu çözmene nasıl yardım etti?',
    items: [
      { text: 'Elif’in kumbarasında 45 TL vardı. Annesi 30 TL daha verdi. Elif’in __ TL’si oldu.', answers: ['75'], visual: tape([['45', 45], ['30', 30]], '?'), hints: ['Elif’in parası arttı mı, azaldı mı?', '45’e onluk onluk ekle: 55, 65, …'] },
      { text: 'Otobüste 52 yolcu vardı. Durakta 17 yolcu indi. Otobüste __ yolcu kaldı.', answers: ['35'], visual: tape([['17', 17], ['?', 35]], '52'), hints: ['Bütün kaç, inen parça kaç?', '52’den önce 10, sonra 7 geri say.'] },
      { text: 'Defne’nin 28 boncuğu vardı. Annesi biraz daha verdi, 50 boncuğu oldu. Annesi __ boncuk verdi.', answers: ['22'], visual: tape([['28', 28], ['?', 22]], '50'), hints: ['28’den 50’ye kaç adım var?', 'Önce 28’den 30’a, sonra 30’dan 50’ye atla.'], explain: '28 + 2 = 30, 30 + 20 = 50. Toplam 22 adım.' },
      { text: 'Emre 98 cm, kardeşi 76 cm. Emre kardeşinden __ cm uzun.', answers: ['22'], visual: tape([['Emre 98', 98]], undefined, [['76', 76], ['?', 22]]), hints: ['İki boy arasındaki farkı arıyoruz.', '76’dan 98’e kaç adım var?'] },
      { text: 'Rafta bir miktar kitap vardı. 15 kitap satılınca 40 kitap kaldı. Başta __ kitap vardı.', answers: ['55'], visual: tape([['15', 15], ['40', 40]], '?'), hints: ['Satılanlar ve kalanlar birlikte başlangıçtaki kitapları oluşturur.'] },
      { text: 'Can bir deste kalem ve bir düzine silgi aldı. Toplam __ ürün aldı.', answers: ['22'], hints: ['1 deste kaç tanedir? 1 düzine kaç tanedir?'] },
      { text: 'Zeynep pazar 18, pazartesi 25, salı 30 sayfa kitap okudu. Toplam __ sayfa okudu.', answers: ['73'], hints: ['Önce hangi iki sayıyı toplamak daha kolay?', '25 + 30 = 55. Şimdi 18 ekle.'] },
      { text: '80 cm’lik kurdelenin 35 cm’sini kestik. Geriye __ cm kurdele kaldı.', answers: ['45'], visual: tape([['35', 35], ['?', 45]], '80'), hints: ['35’ten 80’e kaç adım var?'] },
    ],
  },
  {
    id: 'g2-iki-islemli-problemler',
    outcomes: ['MAT.2.2.1'],
    type: 'fill',
    stage: 'problem',
    title: 'İki işlemli problemler',
    instructions: 'Problemi iki adımda çöz. Önce tahmin et, sonra işlem yap.',
    level: 3,
    launch: { text: 'Zeynep 50 TL ile pazara gitti: domates ve peynir aldı. Kalan parasını bulmak için kaç adım gerekir?' },
    reflect: 'İki adımlı bir problemde önce hangi adımı yapacağına nasıl karar verdin? Başka bir sırayla da çözülebilir miydi?',
    items: [
      { text: 'Zeynep 50 TL ile pazara gitti. 18 TL’ye domates, 15 TL’ye peynir aldı. Zeynep’in __ TL’si kaldı.', answers: ['17'], hints: ['Önce toplam kaç TL harcadığını bul.', '18 + 15 = ? Sonra 50’den çıkar.'] },
      { text: 'Manavda 28 kg elma ve 34 kg armut vardı. 40 kg meyve satıldı. Geriye __ kg meyve kaldı.', answers: ['22'], hints: ['Başta toplam kaç kg meyve vardı?'] },
      { text: 'Sınıfta 15 kız ve 13 erkek öğrenci var. 4 öğrenci gezide. Sınıfta __ öğrenci var.', answers: ['24'], hints: ['Önce sınıfın tamamı kaç kişi?'] },
      { text: 'Mehmet’in 2 deste bilyesi vardı. Arkadaşından 8 bilye aldı, sonra 5 bilye kaybetti. __ bilyesi oldu.', answers: ['23'], hints: ['2 deste kaç bilye eder?', 'Önce aldıklarını ekle, sonra kaybettiklerini çıkar.'] },
      { text: 'Kitapçıda 36 masal ve 25 roman vardı. Akşama kadar 20 kitap satıldı. __ kitap kaldı.', answers: ['41'], hints: ['Toplam kitap sayısını bul, sonra satılanları çıkar.'] },
      { text: 'Ali sabah 25, öğleden sonra 30 dakika kitap okudu. 1 saat okumak için __ dakika daha okumalı.', answers: ['5'], hints: ['1 saat kaç dakikadır?', 'Şimdiye kadar kaç dakika okudu?'] },
    ],
  },

  // MAT.2.2.2 Tahmin ve zihinden toplama-çıkarma
  {
    id: 'g2-on-a-tamamla',
    outcomes: ['MAT.2.2.2'],
    type: 'fill',
    stage: 'model',
    title: '10’a tamamla',
    instructions: 'Önce 10’a tamamla, sonra kalanı ekle.',
    level: 1,
    launch: { text: 'Bir yumurta kolisinde 10 göz var. 8 yumurta varken 5 yumurta daha geldi. Koliyi doldurup kalanı nasıl sayarsın?', visual: { kind: 'tenframe', filled: 8, add: 5, size: 20 } },
    reflect: '8 + 5 yerine neden 10 + 3 yapabiliriz? Bir arkadaşına anlat.',
    generator: { id: 'makeTen', params: { split: true }, count: 8 },
  },
  {
    id: 'g2-ikizler',
    outcomes: ['MAT.2.2.2'],
    type: 'fill',
    stage: 'model',
    title: 'İkizler ve ikizlere yakın',
    instructions: 'İkizleri biliyorsan ikizlere yakınları da hemen bulursun!',
    level: 1,
    launch: { text: 'Ellerinin parmaklarına bak: 5 + 5 = 10. Peki bir elinde 5, diğerinde 6 parmak olsaydı? İkizleri bilmek işimize yarar mı?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🖐️', count: 1 }, { emoji: '🖐️', count: 1 }], separator: '+' } },
    reflect: '7 + 8’i bulmak için hangi ikizi kullanırsın? Başka bir ikizle de bulabilir misin?',
    generator: { id: 'doubles', params: { max: 10, near: true }, count: 8 },
  },
  {
    id: 'g2-zihinden-islem',
    outcomes: ['MAT.2.2.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Zihinden toplama ve çıkarma',
    instructions: 'Kâğıt kalem kullanmadan, bir strateji seçerek zihninden hesapla.',
    level: 2,
    launch: { text: 'Kasada hesap makinesi bozuldu! Kasiyer 38 + 25’i zihninden hesaplayacak. Sence hangi yolu kullanır?' },
    reflect: '38 + 25’i hangi yolla hesapladın? Arkadaşın başka bir yol kullandıysa ikisini karşılaştır.',
    items: [
      { text: '40 + 30 = __', answers: ['70'], hints: ['4 onluk ile 3 onluk kaç onluk eder?'] },
      { text: '57 + 10 = __', answers: ['67'], hints: ['10 eklenince hangi basamak değişir?'], explain: 'Yüzlük tabloda bir alt satıra inmek gibi: 57 → 67.' },
      { text: '25 + 25 = __', answers: ['50'], hints: ['İkizler! 20 + 20 kaç eder? 5 + 5 kaç eder?'] },
      { text: '35 + 36 = __', answers: ['71'], hints: ['35 + 35 kaç eder?', 'Bir fazlası kaç?'], explain: '35 + 35 = 70, 35 + 36 bundan 1 fazla: 71.' },
      { text: '38 + 25 = 40 + __ = __', answers: ['23', '63'], hints: ['38’i 40 yapmak için 25’ten kaç ödünç alırsın?', '25’ten 2 alınca geriye kaç kalır?'], explain: '38 + 25 = (38 + 2) + (25 − 2) = 40 + 23 = 63' },
      { text: '47 + 29 = 47 + 30 − __ = __', answers: ['1', '76'], hints: ['29, 30’dan kaç eksik?', '30 eklersen 1 fazla eklemiş olursun. Ne yapmalısın?'], explain: '47 + 30 = 77; 1 fazla eklediğimiz için 1 çıkarırız: 76.' },
      { text: '62 − 9 = 62 − 10 + __ = __', answers: ['1', '53'], hints: ['9, 10’dan kaç eksik?', '10 çıkarınca 1 fazla çıkarmış olursun. Ne yapmalısın?'], explain: '62 − 10 = 52; 1 fazla çıkardığımız için 1 ekleriz: 53.' },
      { text: '23 + 45 = 45 + __', answers: ['23'], hints: ['Toplananların yeri değişince toplam değişir mi?'] },
    ],
  },
  {
    id: 'g2-sonucu-tahmin-et',
    outcomes: ['MAT.2.2.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Sonucu tahmin et',
    instructions: 'Sayıları en yakın onluğa yuvarla ve sonucu tahmin et. Tahminini işlemle karşılaştır.',
    level: 2,
    launch: { text: 'Mert’in 50 TL’si var. 28 TL’lik kitap ve 19 TL’lik defter almak istiyor. Kasaya gitmeden parasının yetip yetmeyeceğini nasıl anlar?' },
    reflect: 'Tahmin ettiğin sonuç ile gerçek sonuç arasında fark var mıydı? Tahmin neden işe yarar?',
    questions: [
      { prompt: '38 + 41 işleminin sonucu yaklaşık kaçtır?', choices: ['60', '80', '100'], answer: 1, feedback: ['38 yaklaşık 40, 41 yaklaşık 40. 40 + 40 kaç eder?', null, '100’e ulaşmak için iki sayının da 50 civarında olması gerekirdi.'] },
      { prompt: '62 − 29 işleminin sonucu yaklaşık kaçtır?', choices: ['30', '40', '90'], answer: 0, feedback: [null, '62’yi 60’a, 29’u 30’a yuvarla: 60 − 30 kaç?', 'Bu bir çıkarma; sonuç 62’den küçük olmalı.'] },
      { prompt: '19 + 52 işleminin sonucu yaklaşık kaçtır?', choices: ['50', '90', '70'], answer: 2, feedback: ['Sonuç 52’den küçük olamaz; bir şey ekliyoruz.', '19 yaklaşık 20, 52 yaklaşık 50. 20 + 50 kaç?', null] },
      { prompt: 'Duru 47 + 21 için “yaklaşık 70” dedi. Gerçek sonuç 68. Tahmini nasıl?', choices: ['Gerçek sonuca çok yakın', 'Gerçek sonuçtan çok uzak', 'Tahmin sonuçla aynı olmak zorundaydı'], answer: 0, feedback: [null, '68 ile 70 arasında sadece 2 fark var.', 'Tahmin, sonuca yakın olmalı; tam aynı olmak zorunda değil.'] },
      { prompt: 'Hangisinin sonucu 50’den büyüktür?', choices: ['18 + 20', '23 + 31', '40 − 15'], answer: 1, feedback: ['20 + 20 = 40 civarı; 50’ye ulaşmaz.', null, 'Çıkarmada sonuç 40’tan bile küçük olur.'] },
      { prompt: 'Mert’in 50 TL’si var. 28 TL’lik kitap ve 19 TL’lik defter alabilir mi?', choices: ['Alabilir; 30 + 20 = 50 ve iki sayıyı da yukarı yuvarladık', 'Alamaz; 28 + 19 yaklaşık 60', 'Alamaz; 50’den çok fazla'], answer: 0, feedback: [null, '28 yaklaşık 30, 19 yaklaşık 20: toplam yaklaşık 50. İkisini de yukarı yuvarladık; gerçek toplam daha az.', 'İki sayı da 30’dan küçük; toplam 60’ı bile geçemez.'] },
      { prompt: '57 − 30 = ?', choices: ['27', '54', '87'], answer: 0, feedback: [null, '30 çıkarmak 3 onluk çıkarmaktır, 3 birlik değil.', 'Bu bir çıkarma; sonuç 57’den küçük olmalı.'] },
    ],
  },

  // MAT.2.2.3 Toplama ve çıkarmanın ilişkisi
  {
    id: 'g2-sakli-parca',
    outcomes: ['MAT.2.2.3'],
    type: 'fill',
    stage: 'model',
    title: 'Bardağın altında kaç tane?',
    instructions: 'Bütünü ve gördüğün parçayı kullanarak saklı parçayı bul.',
    level: 1,
    launch: { text: 'Can 15 kurabiyenin bir kısmını bardağın altına sakladı. 9 tanesini görüyorsun. Altta kaç tane var? Toplamayla mı, çıkarmayla mı bulursun?', visual: { kind: 'hidden', shown: 9, emoji: '🍪', total: 15 } },
    reflect: 'Saklı parçayı bulurken “kaç eklersem bütün olur?” diye mi düşündün, yoksa çıkardın mı? İkisi neden aynı sonucu verir?',
    generator: { id: 'hiddenPart', params: { min: 10, max: 20, emoji: '🍪' }, count: 6 },
  },
  {
    id: 'g2-toplamayi-dusun',
    outcomes: ['MAT.2.2.3'],
    type: 'fill',
    stage: 'model',
    title: 'Çıkarırken toplamayı düşün',
    instructions: '13 − 8’i bulmak için “8’e kaç eklersem 13 olur?” diye düşün.',
    level: 2,
    launch: { text: '13 sayfalık bir hikâyenin 8 sayfasını okudun. Kaç sayfa kaldığını bulmak için 8’den 13’e doğru sayabilir misin?', visual: tape([['8', 8], ['?', 5]], '13') },
    reflect: 'Çıkarma yaparken toplamayı düşünmek neden işe yarıyor? Bir örnekle göster.',
    generator: { id: 'thinkAddition', params: { maxWhole: 18 }, count: 8 },
  },
  {
    id: 'g2-islem-ailesi',
    outcomes: ['MAT.2.2.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Toplama ve çıkarma kardeştir',
    instructions: 'Toplama ve çıkarma birbirinin tersidir. Boşlukları doldur.',
    level: 2,
    launch: { text: 'Bir şeritte iki parça ve bir bütün var: 34, 25 ve 59. Bu üç sayıyla kaç farklı işlem yazabiliriz?', visual: tape([['34', 34], ['25', 25]], '59') },
    reflect: '34 + 25 = 59 işlemini bilince başka hangi işlemleri hesap yapmadan bilirsin? Neden?',
    items: [
      { text: '34 + 25 = 59   →   59 − 25 = __', answers: ['34'], visual: tape([['34', 34], ['25', 25]], '59'), hints: ['Bütünden bir parçayı çıkarınca ne kalır?'] },
      { text: '48 + 31 = 79   →   79 − __ = 48', answers: ['31'], hints: ['Aynı üç sayı: 48, 31, 79.'] },
      { text: '86 − 42 = 44   →   44 + 42 = __', answers: ['86'], hints: ['Fark ile çıkanı toplarsan neyi bulursun?'] },
      { text: '70 − 26 = 44   →   44 + __ = 70', answers: ['26'] },
      { text: '__ + 15 = 60   →   60 − 15 = 45', answers: ['45'], hints: ['İkinci işlemin sonucu sana ne söylüyor?'] },
      { text: 'Toplananlardan biri 23, toplam 50. Diğer toplanan __', answers: ['27'], visual: tape([['23', 23], ['?', 27]], '50'), hints: ['23’ten 50’ye kaç adım var?'] },
      { text: 'Eksilen 65, fark 40. Çıkan __', answers: ['25'], hints: ['65’ten kaç çıkarınca 40 kalır?', '40’a kaç eklersen 65 olur?'] },
      { text: 'Çıkan 18, fark 32. Eksilen __', answers: ['50'], hints: ['Eksilen bütündür: çıkan ve fark birlikte bütünü oluşturur.'] },
    ],
  },
  {
    id: 'g2-kontrol-et',
    outcomes: ['MAT.2.2.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ters işlemle kontrol et',
    instructions: 'Toplama ile çıkarma arasındaki ilişkiyi kullanarak karar ver.',
    level: 2,
    launch: { text: 'Ali 52 − 17 = 45 buldu ve emin değil. Hesap makinesi olmadan sonucunu nasıl kontrol edebilir?' },
    reflect: 'Bir çıkarma işleminin sonucunu toplamayla nasıl kontrol edersin? Kendi örneğini yaz.',
    questions: [
      { prompt: 'Ali 52 − 17 = 45 buldu. Sonucunu nasıl kontrol eder?', choices: ['45 + 17 işlemini yapar', '52 + 17 işlemini yapar', '45 − 17 işlemini yapar'], answer: 0, feedback: [null, 'Kontrolde eksileni (52) bulmayı umarız; 52’ye eklemeyiz.', 'Çıkarmayı çıkarmayla değil, toplamayla kontrol ederiz.'] },
      { prompt: 'Ali kontrol etti: 45 + 17 = 62. Bu ne gösterir?', choices: ['Ali’nin sonucu henüz doğru değil, çünkü 52 bulunmalıydı', 'Ali’nin sonucu doğru', 'Kontrol işe yaramaz'], answer: 0, feedback: [null, 'Kontrolde 52’yi bulmalıydık ama 62 bulduk.', 'Kontrol, hatayı bulmamıza yardım etti!'] },
      { prompt: 'Hangisi 30 + 25 = 55 ile aynı işlem ailesindendir?', choices: ['55 − 25 = 30', '55 + 25 = 80', '30 − 25 = 5'], answer: 0, feedback: [null, 'Aile aynı üç sayıdan oluşur: 30, 25 ve 55. 80 bu ailede yok.', 'Bütün (55) bu işlemde yok.'] },
      { prompt: { text: 'Toplam 70, toplananlardan biri 40. Diğer toplananı hangi işlemle buluruz?', visual: tape([['40', 40], ['?', 30]], '70') }, choices: ['70 − 40', '70 + 40', '40 − 70'], answer: 0, feedback: [null, 'Toplam bütündür; diğer parça bütünden küçük olmalı.', 'Küçük sayıdan büyüğünü çıkarmıyoruz; bütünden parçayı çıkar.'] },
      { prompt: '8 + 5 = 13 için hangisi DOĞRU DEĞİLDİR?', choices: ['13 − 5 = 8', '13 − 8 = 5', '8 − 5 = 13'], answer: 2, feedback: ['13 − 5 = 8 doğru: bütünden bir parçayı çıkarınca diğeri kalır.', '13 − 8 = 5 de doğru.', null] },
      { prompt: 'Elif bir sayıya 20 ekledi ve 65 buldu. Başlangıçtaki sayı kaçtı?', choices: ['45', '85', '20'], answer: 0, feedback: [null, 'Tersini yap: 65’e eklemek değil, 65’ten 20 çıkarmak gerekir.', '20 eklenen sayı; biz başlangıç sayısını arıyoruz.'] },
    ],
  },

  // MAT.2.2.4 Çarpma (tekrarlı toplama) ve bölme (ardışık çıkarma, eşit paylaştırma)
  {
    id: 'g2-esit-gruplar-kur',
    outcomes: ['MAT.2.2.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Eşit gruplar kur',
    instructions: 'Sayaçları eşit gruplar hâlinde yerleştir.',
    level: 1,
    launch: { text: 'Doğum günü masasında her tabağa 4 kurabiye koyacağız. 3 tabak için kaç kurabiye gerekir? Tek tek saymadan bulabilir miyiz?' },
    reflect: '4’er 4’er 3 grup yaptığında toplamı nasıl buldun? Bunu daha kısa nasıl yazabiliriz?',
    tool: 'tenframe',
    config: { frames: 2 },
    tasks: [
      { prompt: 'Her tabakta 4 kurabiye, 3 tabak var. Çerçeveye 4’er 4’er sayaç koy.', target: { count: 12 }, hints: ['Önce 4 sayaç koy. Sonra 4 daha, sonra 4 daha.'], explain: '4 + 4 + 4 = 12, yani 3 × 4 = 12.' },
      { prompt: '7 çift çorap var. Her çiftte 2 çorap. Çerçeveye 2’şer 2’şer sayaç koy.', target: { count: 14 }, hints: ['2, 4, 6… diye say.'], explain: '7 tane 2: 7 × 2 = 14.' },
      { prompt: '4 çocuğun ellerindeki parmakları göster: her elde 5 parmak, 4 el.', target: { count: 20 }, hints: ['5’er say: 5, 10, …'], explain: '5 + 5 + 5 + 5 = 20, yani 4 × 5 = 20.' },
      { prompt: '15 elmayı 5 tabağa eşit paylaştırıyoruz. Bir tabaktaki elma kadar sayaç koy.', target: { count: 3 }, hints: ['Her tabağa birer birer dağıtmayı düşün.', '15’ten 5’er geri say: kaç kez saydın?'], explain: '15 ÷ 5 = 3: her tabağa 3 elma düşer.' },
    ],
  },
  {
    id: 'g2-tekrarli-toplama',
    outcomes: ['MAT.2.2.4'],
    type: 'fill',
    stage: 'model',
    title: 'Tekrarlı toplama ve çarpma',
    instructions: 'Eşit grupları say. Toplamayı çarpma olarak da yaz.',
    level: 1,
    launch: { text: 'Sinema salonunda sandalyeler sıra sıra dizilmiş. Her sırada aynı sayıda sandalye var. Tek tek saymadan toplamı bulabilir misin?', visual: { kind: 'array', rows: 3, cols: 5, emoji: '🪑' } },
    reflect: '4 + 4 + 4 ile 3 × 4 aynı şeyi mi anlatıyor? Bir resim çizerek açıkla.',
    items: [
      { text: '4 + 4 + 4 = __   →   3 × 4 = __', answers: ['12', '12'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🍎', count: 4 }, { emoji: '🍎', count: 4 }, { emoji: '🍎', count: 4 }], separator: '+' }, hints: ['Kaç grup var? Her grupta kaç elma var?'] },
      { text: '2 + 2 + 2 + 2 + 2 = __   →   5 × 2 = __', answers: ['10', '10'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🧦', count: 2 }, { emoji: '🧦', count: 2 }, { emoji: '🧦', count: 2 }, { emoji: '🧦', count: 2 }, { emoji: '🧦', count: 2 }], separator: '+' }, hints: ['2’şer say: 2, 4, 6…'] },
      { text: '5 + 5 = __   →   2 × __ = 10', answers: ['10', '5'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🖐️', count: 1 }, { emoji: '🖐️', count: 1 }], separator: '+' }, hints: ['Her elde 5 parmak var. Kaç el var?'] },
      { text: '3 + 3 + 3 + 3 = __ × 3', answers: ['4'], visual: { kind: 'emojiGroups', groups: [{ emoji: '🌸', count: 3 }, { emoji: '🌸', count: 3 }, { emoji: '🌸', count: 3 }, { emoji: '🌸', count: 3 }], separator: '+' }, hints: ['3 kaç kez tekrar ediyor?'] },
      { text: '3 sıra, her sırada 5 sandalye var: 3 × 5 = __', answers: ['15'], visual: { kind: 'array', rows: 3, cols: 5, emoji: '🪑' }, hints: ['Sıraları 5’er say: 5, 10, …'] },
      { text: '6 + 6 + 6 = 3 × __', answers: ['6'], hints: ['Hangi sayı tekrar ediyor?'] },
      { text: 'Bir bisikletin 2 tekerleği var. 4 bisikletin __ tekerleği var.', answers: ['8'], visual: { kind: 'emoji', emoji: '🚲', count: 4 }, hints: ['2 + 2 + 2 + 2 kaç eder?'] },
      { text: 'Her tabakta 5 kurabiye var. 3 tabakta __ kurabiye var.', answers: ['15'], visual: { kind: 'emoji', emoji: '🍪', count: 15, group: 5 }, hints: ['5’er say.'] },
    ],
  },
  {
    id: 'g2-carpma-eslestir',
    outcomes: ['MAT.2.2.4'],
    type: 'match',
    stage: 'sembol',
    title: 'Toplamadan çarpmaya, çıkarmadan bölmeye',
    instructions: 'Her modeli, tekrarlı toplamayı ya da ardışık çıkarmayı kısa yazılışıyla eşleştir.',
    level: 2,
    launch: { text: '5 + 5 + 5 yazmak kolay. Peki 5’i 10 kez toplamak gerekseydi? Matematikçiler bunun için kısa bir yazılış bulmuşlar.' },
    reflect: 'Ardışık çıkarma ile bölme arasındaki ilişkiyi bir arkadaşına nasıl anlatırsın?',
    pairs: [
      { left: '5 + 5 + 5', right: '3 × 5' },
      { left: { visual: { kind: 'array', rows: 2, cols: 4, emoji: '🍎' } }, right: '2 × 4' },
      { left: '4 + 4 + 4 + 4 + 4', right: '5 × 4' },
      { left: { visual: { kind: 'emojiGroups', groups: [{ emoji: '🧦', count: 2 }, { emoji: '🧦', count: 2 }, { emoji: '🧦', count: 2 }], separator: '+' } }, right: '3 × 2' },
      { left: '7 + 7', right: '2 × 7' },
      { left: '10 − 2 − 2 − 2 − 2 − 2 = 0', right: '10 ÷ 2' },
      { left: '12 − 4 − 4 − 4 = 0', right: '12 ÷ 4' },
      { left: { text: '15 şekeri 5’er 5’er paylaştırıyoruz.', visual: { kind: 'emoji', emoji: '🍬', count: 15, group: 5 } }, right: '15 ÷ 5' },
    ],
    perRound: 4,
  },
  {
    id: 'g2-paylastir',
    outcomes: ['MAT.2.2.4'],
    type: 'fill',
    stage: 'problem',
    title: 'Eşit paylaştırma ve bölme',
    instructions: 'Eşit paylaştır ya da gruplara ayır. Geriye ritmik sayma ya da ardışık çıkarma yapabilirsin.',
    level: 2,
    launch: { text: '18 kalemi 3 arkadaş eşit paylaşacak. Kimse küsmesin diye herkese aynı sayıda kalem düşmeli. Nasıl paylaştırırsın?' },
    reflect: '“15 elmayı 5 tabağa paylaştırmak” ile “15 elmayı 5’er 5’er gruplamak” arasında ne fark var? İkisinde de bölme var mı?',
    items: [
      { text: '12 − 3 − 3 − 3 − 3 = 0. 3’ü __ kez çıkardık.   →   12 ÷ 3 = __', answers: ['4', '4'], hints: ['Kaç tane “− 3” var? Say.'] },
      { text: '15 elmayı 5 tabağa eşit paylaştırdık. Her tabakta __ elma var.', answers: ['3'], visual: { kind: 'emoji', emoji: '🍎', count: 15, group: 3 }, hints: ['Her tabağa birer birer dağıt; kaç tur yaptın?'] },
      { text: '18 kalemi 3 kişiye eşit paylaştırırsak her biri __ kalem alır.', answers: ['6'], hints: ['Her kişiye birer birer dağıt.', '18’den 3’er geri say: kaç kez saydın?'] },
      { text: '8 çorabı 2’şerli çift yaparsak __ çift olur.', answers: ['4'], visual: { kind: 'emoji', emoji: '🧦', count: 8, group: 2 }, hints: ['2’şer grupla, grupları say.'] },
      { text: '20 öğrenci 4’erli takımlara ayrıldı. __ takım oldu.', answers: ['5'], hints: ['20’den 4’er geri say: 16, 12, …', 'Kaç kez saydın?'] },
      { text: '16 boya kalemi 4 kutuya eşit konuldu. Her kutuda __ kalem var.', answers: ['4'], hints: ['4 × ? = 16 diye düşünebilirsin.'] },
      { text: '10 lirayı 2 kardeş eşit paylaştı. Her biri __ lira aldı.', answers: ['5'], hints: ['İkizleri düşün: hangi sayının iki katı 10?'] },
    ],
  },

  // MAT.2.2.5 Tahmin ve zihinden çarpma-bölme
  {
    id: 'g2-carpma-stratejisi',
    outcomes: ['MAT.2.2.5'],
    type: 'fill',
    stage: 'model',
    title: 'Diziyle çarp',
    instructions: 'Diziye bak. Bildiğin bir çarpmadan yola çıkarak sonucu bul.',
    level: 2,
    launch: { text: 'Bir yumurta kolisinde yumurtalar sıra sıra dizili. 3 sıra, her sırada 4 yumurta. 2 sırayı biliyorsan 3. sırayı eklemek kolay mı?', visual: { kind: 'array', rows: 3, cols: 4, emoji: '🥚', splitRow: 2 } },
    reflect: '3 × 7’yi bulmak için 2 × 7’yi nasıl kullandın? Başka hangi çarpmaları bu yolla bulabilirsin?',
    generator: { id: 'multStrategy', params: { tables: [2, 3, 4, 5] }, count: 8 },
  },
  {
    id: 'g2-carpim-tablosu',
    outcomes: ['MAT.2.2.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Bildiğinden bilmediğine',
    instructions: 'Bildiğin çarpmayı kullanarak yeni çarpmayı bul. Ezberleme, düşün!',
    level: 2,
    launch: { text: 'Ece 2 × 4 = 8 olduğunu biliyor ama 4 × 4’ü unutmuş. Sence Ece hiç ezberlemeden 4 × 4’ü bulabilir mi?' },
    reflect: '5 × 8 = 40’ı bilince 4 × 8’i nasıl buldun? Bu yol neden işe yarıyor?',
    items: [
      { text: '2 × 4 = 8 ise 4 × 4 = __', answers: ['16'], hints: ['4 grup, 2 grubun iki katıdır.', '8’in iki katı kaç?'] },
      { text: '5 × 6 = 30 ise 6 × 5 = __', answers: ['30'], hints: ['Çarpanların yeri değişince çarpım değişir mi?'] },
      { text: '2 × 7 = 14 ise 3 × 7 = __', answers: ['21'], hints: ['3 tane 7, 2 tane 7’den bir 7 fazladır.'] },
      { text: '5 × 8 = 40 ise 4 × 8 = __', answers: ['32'], hints: ['4 tane 8, 5 tane 8’den bir 8 eksiktir.'] },
      { text: '1 × 9 = __', answers: ['9'], hints: ['1 tane 9 kaç eder?'] },
      { text: '0 × 7 = __', answers: ['0'], hints: ['Hiç grup yoksa kaç nesne olur?'] },
      { text: '5 × 5 = __', answers: ['25'], hints: ['5’er say: 5, 10, …'] },
      { text: '3 × __ = 24', answers: ['8'], hints: ['3’er say: 24’e kaç adımda varırsın?'] },
    ],
  },
  {
    id: 'g2-zihinden-bolme',
    outcomes: ['MAT.2.2.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Çarpmayı düşünerek böl',
    instructions: 'Çarpma ile bölme arasındaki ilişkiyi kullan.',
    level: 2,
    launch: { text: '20 öğrenci 5’erli gruplara ayrılacak. Kaç grup olur? “Kaç tane 5, 20 eder?” diye düşünebilir misin?' },
    reflect: 'Bir bölme işleminin sonucunu çarpma ile nasıl kontrol edersin?',
    items: [
      { text: '4 × 5 = 20 olduğu için 20 ÷ 5 = __', answers: ['4'], hints: ['Kaç tane 5, 20 eder?'] },
      { text: '3 × 6 = 18 olduğu için 18 ÷ __ = 6', answers: ['3'], hints: ['Aynı üç sayı: 3, 6 ve 18.'] },
      { text: '12 ÷ 3 = 4, çünkü 4 × 3 = __', answers: ['12'] },
      { text: '10 ÷ 2 = __', answers: ['5'], hints: ['Hangi sayının iki katı 10 eder?'] },
      { text: '15 ÷ 5 = __', answers: ['3'], hints: ['5’er say: 15’e kaç adımda varırsın?'] },
      { text: '16 ÷ 4 = __', answers: ['4'], hints: ['4 × ? = 16'] },
      { text: '8 × 1 = __', answers: ['8'], hints: ['8 tane 1 ya da 1 tane 8: kaç eder?'] },
      { text: '0 × 4 = __', answers: ['0'], hints: ['Hiç grup yoksa hiç nesne de yoktur.'] },
    ],
  },
  {
    id: 'g2-carpma-muhakeme',
    outcomes: ['MAT.2.2.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çarpma ve bölmede düşün',
    instructions: 'Tahmin et ve zihinden işlem yaparak doğru cevabı seç.',
    level: 2,
    launch: { text: 'Aras “2 × 9’u bilmiyorum ama 2 × 10’u biliyorum!” diyor. Bildiği çarpma ona nasıl yardım edebilir?' },
    reflect: 'Bir çarpmanın sonucunu hesaplamadan önce yaklaşık nasıl tahmin edersin?',
    questions: [
      { prompt: { text: '3 × 4 ile 4 × 3’ün sonuçları için ne söylenir?', visual: { kind: 'array', rows: 3, cols: 4 } }, choices: ['3 × 4 daha büyük', 'Eşittir', '4 × 3 daha büyük'], answer: 1, feedback: ['Diziyi yan çevir: 3 sıra 4 nokta, 4 sıra 3 nokta olur; noktalar azalmaz.', null, 'Diziyi yan çevir: nokta sayısı değişmez.'] },
      { prompt: 'Hangi çarpmanın sonucu 20’den büyüktür?', choices: ['4 × 4', '3 × 5', '5 × 5'], answer: 2, feedback: ['4 × 4 = 16, 20’den küçük.', '3 × 5 = 15, 20’den küçük.', null] },
      { prompt: 'Bir sayıyı 1 ile çarparsak sonuç ne olur?', choices: ['Sayının kendisi', '0', '1'], answer: 0, feedback: [null, '1 grup varsa, o grubun içindeki kadar nesne vardır; 0 değil.', 'Sonuç her zaman 1 olmaz: 1 × 7 = 7.'] },
      { prompt: 'Bir sayıyı 0 ile çarparsak sonuç ne olur?', choices: ['Sayının kendisi', '10', '0'], answer: 2, feedback: ['0 grup, hiç grup yok demektir.', 'Hiç grup yoksa hiç nesne de yoktur.', null] },
      { prompt: '4 × 3 = 12 işleminde 12’ye ne denir?', choices: ['Çarpan', 'Çarpım', 'Bölüm'], answer: 1, feedback: ['4 ve 3 çarpandır; sonucun başka bir adı var.', null, 'Bölüm, bölme işleminin sonucudur.'] },
      { prompt: '15 ÷ 3 = 5 işleminde 15’e ne denir?', choices: ['Bölünen', 'Bölen', 'Bölüm'], answer: 0, feedback: [null, 'Bölen 3’tür: 15’i kaça böldüğümüzü söyler.', 'Bölüm 5’tir: işlemin sonucudur.'] },
      { prompt: 'Aras: “2 × 9, 2 × 10’dan biraz azdır.” 2 × 9 kaçtır?', choices: ['11', '20', '18'], answer: 2, feedback: ['2 + 9 değil; 2 tane 9 demek.', '2 × 10 = 20; 2 × 9 bundan bir 2 eksik.', null] },
      { prompt: 'Tahmin et: 4 × 5 = 20. 4 × 6’nın sonucu nasıldır?', choices: ['20’den biraz fazla', '20’den az', 'Tam 20'], answer: 0, feedback: [null, 'Bir grup daha ekledik; sonuç artar.', 'Bir grup daha var; sonuç değişir.'] },
    ],
  },

  // MAT.2.2.6 Dört işlemde eşitliğin anlamları
  {
    id: 'g2-terazi',
    outcomes: ['MAT.2.2.6', 'MAT.2.2.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Teraziyi dengele',
    instructions: 'Kutunun değerini değiştirerek teraziyi dengele.',
    level: 3,
    launch: { text: 'Eşit kollu terazinin bir kefesinde 40 gram, diğerinde 15 gram ve bir kutu var. Kutunun içinde kaç gram olmalı ki terazi dengede dursun?', visual: { kind: 'balance', left: ['?', '15'], right: ['40'] } },
    reflect: 'Terazi dengede olunca iki kefe için ne söyleyebilirsin? Bu “=” işaretine nasıl benziyor?',
    tool: 'balance',
    tasks: [
      { prompt: 'x + 15 = 40 olması için x kutusu kaç olmalı?', target: { a: 1, b: 15, c: 40 }, hints: ['15’ten 40’a kaç adım var?'] },
      { prompt: 'x + 32 = 50 olması için x kutusu kaç olmalı?', target: { a: 1, b: 32, c: 50 }, hints: ['32’ye kaç eklersen 50 olur?'] },
      { prompt: 'İki eş kutu 10’a eşit. Bir kutu kaç olmalı?', target: { a: 2, b: 0, c: 10 }, hints: ['Hangi sayının ikizi 10 eder?'] },
      { prompt: 'İki eş kutu ve 4, toplam 14 ediyor. Bir kutu kaç olmalı?', target: { a: 2, b: 4, c: 14 }, hints: ['Önce 4’ü iki kefeden de çıkardığını düşün.', 'İki kutu 10 ederse bir kutu kaç eder?'] },
    ],
  },
  {
    id: 'g2-esitlik',
    outcomes: ['MAT.2.2.6'],
    type: 'fill',
    stage: 'model',
    title: 'Eşitliği sağla',
    instructions: 'Eşittir işaretinin iki yanı aynı değerde olmalı. Teraziye bak, boşluğu doldur.',
    level: 2,
    launch: { text: 'Can 8 + 4 = __ + 5 sorusuna “12” yazdı. Ece “Terazi o zaman dengede olmaz!” dedi. Kim haklı?', visual: { kind: 'balance', left: ['8', '4'], right: ['?', '5'] } },
    reflect: '“=” işareti “cevabı yaz” mı demek, yoksa başka bir anlamı mı var? Kendi sözlerinle açıkla.',
    items: [
      { text: '8 + 4 = __ + 5', answers: ['7'], visual: { kind: 'balance', left: ['8', '4'], right: ['?', '5'] }, hints: ['Sol kefede toplam kaç var?', 'Sağ kefede 5 varken kaç eklersen sol kefeye eşit olur?'], explain: '“=”, iki tarafın eşit olması demek: 8 + 4 = 12 ve 7 + 5 = 12.' },
      { text: '3 × 4 = 6 + __', answers: ['6'], visual: { kind: 'balance', left: ['3 × 4'], right: ['6', '?'] }, hints: ['Önce sol tarafı bul: 3 × 4 kaç?'] },
      { text: '20 ÷ 4 = 2 + __', answers: ['3'], visual: { kind: 'balance', left: ['20 ÷ 4'], right: ['2', '?'] }, hints: ['20 ÷ 4 kaç eder?'] },
      { text: '15 + 5 = 4 × __', answers: ['5'], visual: { kind: 'balance', left: ['15', '5'], right: ['4 × ?'] }, hints: ['Sol taraf 20. Kaç tane 4, 20 eder?'] },
      { text: '__ − 10 = 2 × 5', answers: ['20'], visual: { kind: 'balance', left: ['? − 10'], right: ['2 × 5'] }, hints: ['Sağ taraf kaç eder?', 'Hangi sayıdan 10 çıkarınca o sonuç kalır?'] },
      { text: '2 × 5 = 5 × __', answers: ['2'], hints: ['Çarpanların yeri değişince çarpım değişir mi?'] },
      { text: '12 ÷ 3 = 2 × __', answers: ['2'], hints: ['12 ÷ 3 kaç eder?'] },
      { text: '40 + 20 = 70 − __', answers: ['10'], hints: ['Sol taraf 60. 70’ten kaç çıkarınca 60 kalır?'] },
    ],
  },
  {
    id: 'g2-esitlik-dogru-mu',
    outcomes: ['MAT.2.2.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Eşitlik doğru mu?',
    instructions: 'İki taraf aynı değerdeyse “Doğru”, değilse “Yanlış” grubuna koy.',
    level: 2,
    launch: { text: 'Tahtada “9 = 9” yazıyor. Can “Bu çok garip, eşittirden sonra cevap gelmeli!” diyor. Sence bu eşitlik doğru mu?' },
    reflect: '“7 + 5 = 12 + 3” neden doğru bir eşitlik değil? Doğru olması için nasıl değiştirirsin?',
    categories: [
      { id: 'd', label: 'Doğru ✔', color: '#22c55e' },
      { id: 'y', label: 'Yanlış ✘', color: '#ef4444' },
    ],
    items: [
      { content: '2 × 4 = 8', category: 'd', explain: '2 tane 4 = 8.' },
      { content: '9 = 9', category: 'd', explain: 'İki taraf aynı değerde. “=” her zaman bir işlem beklemez.' },
      { content: '3 × 5 = 10 + 5', category: 'd', explain: 'İki taraf da 15.' },
      { content: '16 ÷ 4 = 2 × 2', category: 'd', explain: 'İki taraf da 4.' },
      { content: '30 + 20 = 60 − 10', category: 'd', explain: 'İki taraf da 50.' },
      { content: '4 × 3 = 7', category: 'y', explain: '4 × 3, 4 + 3 değildir: 3 tane 4 = 12.' },
      { content: '15 ÷ 3 = 3', category: 'y', explain: '15 ÷ 3 = 5, çünkü 5 × 3 = 15.' },
      { content: '2 × 5 = 5 + 2', category: 'y', explain: 'Sol 10, sağ 7: eşit değil.' },
      { content: '20 − 8 = 3 × 5', category: 'y', explain: 'Sol 12, sağ 15: eşit değil.' },
      { content: '7 + 5 = 12 + 3', category: 'y', explain: 'Sol 12, sağ 15. “=”den sonra cevabı yazıp devam edemeyiz; iki taraf eşit olmalı.' },
    ],
  },
  {
    id: 'g2-esitlik-farkli',
    outcomes: ['MAT.2.2.6'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Eşitlik)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçenek için bir gerekçe bulunabilir!',
    level: 2,
    launch: { text: 'Aynı sayıyı göstermenin pek çok yolu var: 12 kurabiyeyi 3 tabağa 4’er de koyabilirsin, 2 tabağa 6’şar da. Hangisi farklı?' },
    reflect: 'Değeri aynı olan ifadeleri “=” ile bağlayarak bir eşitlik yaz. Kaç farklı eşitlik yazabilirsin?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['3 × 4', '4 + 4 + 4', '12', '6 + 6'],
        answer: 0,
        reasons: ['Çarpma işareti olan tek ifade.', 'Üç sayının toplandığı tek ifade.', 'İşlem içermeyen, tek bir sayı olan ifade.', 'İki eş grubun (ikizlerin) toplandığı tek ifade.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['10 + 5', '20 − 5', '3 × 5', '15 ÷ 3'],
        answer: 0,
        reasons: ['Toplama olan tek ifade.', 'Çıkarma olan tek ifade.', 'Çarpma olan tek ifade.', 'Değeri 15 olmayan tek ifade: 15 ÷ 3 = 5.'],
      },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ───────────────────────────────────────────

  // MAT.2.1.7 Bütün, yarım ve çeyrek arasındaki ilişki
  {
    id: 'g2-yarim-ceyrek-boya',
    outcomes: ['MAT.2.1.7'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Böl ve boya',
    instructions: 'Şeridi eş parçalara böl ve istenen kadarını boya.',
    level: 2,
    launch: { text: 'Bir çikolatayı kardeşinle eşit paylaşacaksın. Sonra iki arkadaşın daha geldi: şimdi 4 kişisiniz! Çikolatayı nasıl bölersin?' },
    reflect: 'Yarımı boyarken ve iki çeyreği boyarken ne fark ettin?',
    tool: 'fractions',
    config: { dens: [1, 2, 4] },
    tasks: [
      { prompt: 'Şeridi 2 eş parçaya böl ve YARIMINI boya.', target: { num: 1, den: 2, exact: true }, hints: ['Kaç eş parçaya bölmelisin?'] },
      { prompt: 'Şeridi 4 eş parçaya böl ve ÇEYREĞİNİ boya.', target: { num: 1, den: 4, exact: true }, hints: ['Çeyrek, 4 eş parçadan biridir.'] },
      { prompt: 'Şeridi 4 eş parçaya böl. Bir yarım edecek kadar çeyrek boya.', target: { num: 2, den: 4, exact: true }, hints: ['Bir yarımın içine kaç çeyrek sığar?'], explain: '2 çeyrek = 1 yarım.' },
      { prompt: 'Şeridin BÜTÜNÜNÜ boya.', target: { num: 1, den: 1 }, hints: ['Bütün, hiç parça dışarıda kalmaması demek.'] },
    ],
  },
  {
    id: 'g2-yarim-ceyrek',
    outcomes: ['MAT.2.1.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Bütün, yarım ve çeyrek',
    instructions: 'Parçaları incele. Parçalar eş mi? Doğru cevabı seç.',
    level: 1,
    launch: { text: 'İki kardeş bir pizzayı paylaşıyor. Abi pizzayı ikiye kesti ama bir parça çok büyük oldu. Kardeşi “Bu yarım değil!” dedi. Neden?', visual: { kind: 'svg', svg: ESIT_OLMAYAN } },
    reflect: 'Bir parçaya “yarım” diyebilmemiz için ne gerekir? Kendi örneğinle anlat.',
    questions: [
      { prompt: 'Hangi şeklin YARIMI boyalı?', choices: [{ visual: { kind: 'fraction', num: 1, den: 4 } }, { visual: { kind: 'fraction', num: 1, den: 2 } }, { visual: { kind: 'fraction', num: 3, den: 4 } }], answer: 1, feedback: ['Bu şekil 4 eş parçaya bölünmüş, 1 parçası boyalı: çeyrek.', null, '4 parçadan 3’ü boyalı; yarımdan fazla.'] },
      { prompt: 'Hangi şeklin ÇEYREĞİ boyalı?', choices: [{ visual: { kind: 'fraction', num: 1, den: 2, shape: 'rect' } }, { visual: { kind: 'fraction', num: 4, den: 4, shape: 'rect' } }, { visual: { kind: 'fraction', num: 1, den: 4, shape: 'rect' } }], answer: 2, feedback: ['2 eş parçadan biri boyalı: bu yarım.', 'Bütün parçalar boyalı: bu bütün.', null] },
      { prompt: { text: 'Bu şekil iki yarıma mı bölünmüş?', visual: { kind: 'svg', svg: ESIT_OLMAYAN } }, choices: ['Evet, iki yarım', 'Hayır, parçalar eş değil'], answer: 1, feedback: ['İki parça var ama biri büyük biri küçük; yarımlar eş olmalı.', null] },
      { prompt: 'Bir bütün kaç yarımdan oluşur?', choices: ['2', '3', '4'], answer: 0, feedback: [null, 'Yarım, bütünü 2 eş parçaya bölünce oluşur.', '4 eş parçanın her biri çeyrektir.'] },
      { prompt: 'Bir bütün kaç çeyrekten oluşur?', choices: ['2', '3', '4'], answer: 2, feedback: ['2 eş parça yarımları verir; çeyrek için daha çok parça gerekir.', 'Çeyrekler bütünü 4 eş parçaya bölünce oluşur.', null] },
      { prompt: { text: 'Bir yarım kaç çeyrekten oluşur?', visual: { kind: 'fraction', num: 2, den: 4 } }, choices: ['1', '2', '4'], answer: 1, feedback: ['Bir çeyrek, yarımın sadece yarısıdır.', null, '4 çeyrek bir bütün eder, yarım değil.'] },
      { prompt: 'Aynı pizzanın çeyreği mi daha büyüktür, yarısı mı?', choices: ['Çeyreği', 'Yarısı'], answer: 1, feedback: ['Çeyrekte bütün 4 parçaya bölünür; parçalar daha küçük olur.', null] },
      { prompt: '4 arkadaş 2 simidi eşit paylaşıyor. Her biri ne kadar alır?', choices: ['Yarım simit', 'Çeyrek simit', 'Bütün simit'], answer: 0, feedback: [null, 'Bir simit 4 kişiye paylaşılsaydı çeyrek alırlardı; ama 2 simit var.', '2 simit 4 kişiye bütün olarak yetmez.'] },
    ],
  },
  {
    id: 'g2-parca-butun-eslestir',
    outcomes: ['MAT.2.1.7'],
    type: 'match',
    stage: 'sembol',
    title: 'Parça ve bütün',
    instructions: 'Her modeli doğru adıyla eşleştir. Parça sayısına dikkat et!',
    level: 2,
    launch: { text: 'Annen “Pastanın üç çeyreğini misafirlere ayır.” dedi. Pastanın ne kadarını ayıracaksın? Resimle sözü eşleştirebilir misin?' },
    reflect: '“İki çeyrek” ile “yarım” aynı miktar mı? Bir model çizerek göster.',
    pairs: [
      { left: { visual: { kind: 'fraction', num: 1, den: 1 } }, right: 'Bütün' },
      { left: { visual: { kind: 'fraction', num: 1, den: 2 } }, right: 'Yarım' },
      { left: { visual: { kind: 'fraction', num: 1, den: 4 } }, right: 'Çeyrek' },
      { left: { visual: { kind: 'fraction', num: 2, den: 4 } }, right: 'İki çeyrek' },
      { left: { visual: { kind: 'fraction', num: 3, den: 4 } }, right: 'Üç çeyrek' },
      { left: { visual: { kind: 'fraction', num: 2, den: 2, shape: 'bar' } }, right: 'İki yarım' },
    ],
    perRound: 3,
  },
  {
    id: 'g2-yarim-farkli',
    outcomes: ['MAT.2.1.7'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Yarım ve çeyrek)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçenek için bir gerekçe bulunabilir.',
    level: 2,
    launch: { text: 'Dört model var: biri daire, biri dikdörtgen; bazıları eş, bazıları eş olmayan parçalara bölünmüş. Sen hangisini farklı bulursun?' },
    reflect: 'Seçtiğin modeli bir arkadaşına anlat. O başka bir model seçtiyse gerekçesi ne olabilir?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [{ visual: { kind: 'fraction', num: 1, den: 2 } }, { visual: { kind: 'fraction', num: 2, den: 4, shape: 'rect' } }, { visual: { kind: 'fraction', num: 1, den: 4 } }, { visual: { kind: 'svg', svg: ESIT_OLMAYAN } }],
        answer: 0,
        reasons: ['2 eş parçaya bölünmüş tek model: yarımları gösteriyor.', 'Yarımı çeyreklerle (4 parçadan 2’si) gösteren tek model.', 'Boyalı kısmı yarımdan az olan tek model: çeyrek.', 'Parçaları eş olmayan tek model; bu yüzden boyalı kısım yarım değil.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['Bütün', 'Yarım', 'Çeyrek', 'İki çeyrek'],
        answer: 0,
        reasons: ['Bölünmemiş olan tek ifade; diğerleri bütünün parçaları.', 'Bütünün 2 eş parçasından biri olan tek ifade.', 'Yarımdan küçük olan tek ifade.', 'İki parçadan oluşan tek ifade; yine de yarıma eşit.'],
      },
    ],
  },

  // MAT.2.1.8 Paraları değerlerine göre ilişkilendirme (kuruş ve lira)
  {
    id: 'g2-kumbara',
    outcomes: ['MAT.2.1.8'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kumbarayı doldur',
    instructions: 'Madenî paralarla istenen tutarı oluştur. Farklı yollar deneyebilirsin!',
    level: 2,
    launch: { text: 'Kumbarana 1 TL atmak istiyorsun ama cebinde sadece bozuk paralar var. Hangi paraları birleştirirsen 1 TL eder?' },
    reflect: '1 TL’yi en az kaç parayla, en çok kaç parayla oluşturdun? Neden farklı sayıda para kullanabildin?',
    tool: 'money',
    config: { coins: [0.05, 0.1, 0.25, 0.5, 1] },
    tasks: [
      { prompt: 'Kumbaraya 75 kuruş koy.', target: { total: 0.75 }, hints: ['50 kuruşa kaç kuruş eklersen 75 olur?'] },
      { prompt: 'Kumbaraya 1 TL koy. Sadece bozuk paralar kullanmayı dene!', target: { total: 1 }, hints: ['1 TL = 100 kuruş.', '4 tane 25 kuruş ya da 2 tane 50 kuruş deneyebilirsin.'], explain: '2 yarım bir bütün eder: 2 × 50 kuruş = 1 TL. 4 çeyrek bir bütün eder: 4 × 25 kuruş = 1 TL.' },
      { prompt: 'Kumbaraya 1 TL 50 kuruş koy.', target: { total: 1.5 }, hints: ['Önce 1 TL’yi koy, sonra 50 kuruşu.'] },
      { prompt: 'Kumbaraya 2 TL 25 kuruş koy.', target: { total: 2.25 }, hints: ['2 TL için kaç tane 1 TL gerekir?'] },
    ],
  },
  {
    id: 'g2-para-sirala',
    outcomes: ['MAT.2.1.8'],
    type: 'sort',
    stage: 'model',
    title: 'Paraları sırala',
    instructions: 'Paraları değerlerine göre sırala.',
    level: 2,
    launch: { text: 'Cüzdanından madenî ve kâğıt paralar döküldü. Hangisi en değerli? Büyüklüğüne mi bakarsın, üzerindeki sayıya mı?' },
    reflect: 'Para gruplarını sıralarken nasıl karşılaştırdın? Para sayısı mı önemli, değeri mi?',
    rounds: [
      { prompt: 'Madenî paraları azdan çoğa sırala.', items: [{ visual: { kind: 'money', items: [0.05] } }, { visual: { kind: 'money', items: [0.1] } }, { visual: { kind: 'money', items: [0.25] } }, { visual: { kind: 'money', items: [0.5] } }, { visual: { kind: 'money', items: [1] } }], ends: ['En az', 'En çok'], hints: ['Her paranın üzerindeki sayıya ve birimine (kuruş/lira) bak.'] },
      { prompt: 'Paraları azdan çoğa sırala.', items: [{ visual: { kind: 'money', items: [0.5] } }, { visual: { kind: 'money', items: [1] } }, { visual: { kind: 'money', items: [5] } }, { visual: { kind: 'money', items: [10] } }, { visual: { kind: 'money', items: [20] } }], ends: ['En az', 'En çok'] },
      { prompt: 'Para gruplarını toplam değerlerine göre azdan çoğa sırala.', items: [{ visual: { kind: 'money', items: [0.1, 0.1] } }, { visual: { kind: 'money', items: [0.25, 0.1] } }, { visual: { kind: 'money', items: [0.25, 0.25] } }, { visual: { kind: 'money', items: [0.5, 0.25] } }, { visual: { kind: 'money', items: [1, 0.5] } }], ends: ['En az', 'En çok'], hints: ['Her grubun toplamını kuruş olarak bul.'], explain: '20 kuruş < 35 kuruş < 50 kuruş < 75 kuruş < 1 TL 50 kuruş.' },
    ],
  },
  {
    id: 'g2-kurus-lira',
    outcomes: ['MAT.2.1.8'],
    type: 'fill',
    stage: 'sembol',
    title: 'Kuruş ve lira',
    instructions: 'Madenî paraları incele ve boşlukları doldur.',
    level: 2,
    launch: { text: '1 lirada kaç kuruş saklı? 50 kuruş liranın yarısı mı? 25 kuruş çeyreği mi? Yarım ve çeyreği paralarda da bulabilir miyiz?' },
    reflect: '25 kuruşa neden “çeyrek”, 50 kuruşa neden “yarım lira” denebilir? Açıkla.',
    items: [
      { text: '1 TL = __ kuruş', answers: ['100'], visual: { kind: 'money', items: [1] } },
      { text: '2 tane 50 kuruş = __ TL', answers: ['1'], visual: { kind: 'money', items: [0.5, 0.5] }, hints: ['2 yarım kaç bütün eder?'] },
      { text: '4 tane 25 kuruş = __ kuruş', answers: ['100'], visual: { kind: 'money', items: [0.25, 0.25, 0.25, 0.25] }, hints: ['25, 50, 75, … diye say.'] },
      { text: '2 tane 25 kuruş = __ kuruş', answers: ['50'], visual: { kind: 'money', items: [0.25, 0.25] }, hints: ['2 çeyrek bir yarım eder.'] },
      { text: '1 TL için __ tane 10 kuruş gerekir.', answers: ['10'], hints: ['10’ar say: 100’e kaç adımda varırsın?'] },
      { text: 'Toplam __ TL __ kuruş', answers: ['1', '75'], visual: { kind: 'money', items: [1, 0.5, 0.25] }, hints: ['Önce lirayı, sonra kuruşları say.'] },
      { text: '17 tane 10 kuruş = __ kuruş', answers: ['170'], hints: ['10 tane 10 kuruş 100 kuruş eder. 7 tane daha?'] },
      { text: 'Hangisi daha değerli: 2 TL mi, 17 tane 10 kuruş mu? __', answers: ['2 TL'], choices: ['2 TL', '17 tane 10 kuruş'], hints: ['2 TL kaç kuruş eder?'], explain: '2 TL = 200 kuruş; 17 tane 10 kuruş = 170 kuruş.' },
    ],
  },
  {
    id: 'g2-alisveris',
    outcomes: ['MAT.2.1.8'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alışveriş istasyonu',
    instructions: 'Paraların değerlerini düşünerek doğru kararı ver.',
    level: 2,
    launch: { text: 'Sınıfta bir alışveriş istasyonu kurduk: simit 75 kuruş, silgi 50 kuruş, kalem 2 TL. Elindeki paralarla ne alabilirsin?' },
    reflect: 'Daha çok para tanesi her zaman daha çok değer demek mi? Bir örnekle açıkla.',
    questions: [
      { prompt: 'Hangisi daha değerli: 3 tane 1 TL mi, 9 tane 10 kuruş mu?', choices: ['3 tane 1 TL', '9 tane 10 kuruş', 'İkisi eşit'], answer: 0, feedback: [null, 'Çok sayıda para her zaman çok değer demek değil: 9 tane 10 kuruş = 90 kuruş, 1 TL bile etmez.', '3 TL = 300 kuruş; 9 tane 10 kuruş = 90 kuruş.'] },
      { prompt: 'Simit 75 kuruş. Hangisiyle tam ödeyebilirsin?', choices: [{ visual: { kind: 'money', items: [0.5, 0.25] } }, { visual: { kind: 'money', items: [0.5, 0.1, 0.1] } }, { visual: { kind: 'money', items: [0.25, 0.25] } }], answer: 0, feedback: [null, '50 + 10 + 10 = 70 kuruş; 5 kuruş eksik.', '25 + 25 = 50 kuruş; 25 kuruş eksik.'] },
      { prompt: 'Elinde 1 TL var. 50 kuruşluk bir silgi aldın. Ne kadar paran kaldı?', choices: ['50 kuruş', '1 TL', '25 kuruş'], answer: 0, feedback: [null, 'Silgi için para verdin; paran azaldı.', '1 TL = 100 kuruş. 100’den 50 çıkarınca kaç kalır?'] },
      { prompt: '1 TL’yi 25 kuruşluklarla bozdurursan kaç tane alırsın?', choices: ['4', '2', '25'], answer: 0, feedback: [null, '2 tane 50 kuruş 1 TL eder; 25 kuruş daha küçük bir para.', '25, paranın değeri; kaç tane gerektiğini soruyoruz.'] },
      { prompt: '2 TL için kaç tane 10 kuruş gerekir?', choices: ['20', '2', '10'], answer: 0, feedback: [null, '2 tane 10 kuruş sadece 20 kuruş eder.', '10 tane 10 kuruş 1 TL eder; 2 TL için iki katı gerekir.'] },
      { prompt: 'Ayşe’nin kumbarasından 1 TL, 50 kuruş ve 25 kuruş çıktı. 2 TL’lik kalemi alabilir mi?', choices: ['Hayır; 1 TL 75 kuruşu var, 25 kuruş eksik', 'Evet; 3 parası var', 'Evet; 76 kuruşu var'], answer: 0, feedback: [null, 'Para sayısına değil, değerlerine bak: toplam kaç kuruş?', '1 TL, 100 kuruş eder; 1 kuruş değil.'] },
    ],
  },

  // MAT.2.1.9 Zaman ölçü birimlerini okuma ve yazma
  {
    id: 'g2-saati-kur',
    outcomes: ['MAT.2.1.9'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Saati kur',
    instructions: 'Akrep ve yelkovanı hareket ettirerek saati ayarla.',
    level: 2,
    launch: { text: 'Okul saat 9’da başlıyor, teneffüs yarım saat sonra. Saatin yelkovanı bir tur dönünce ne oluyor?', visual: { kind: 'clock', h: 9, m: 0, digital: true } },
    reflect: 'Yelkovan yarım tur dönünce akrep nerede duruyor? Neden?',
    tool: 'clock',
    config: { minuteStep: 15 },
    tasks: [
      { prompt: 'Okul saat 9’da başlıyor. Saati 09.00’a kur.', target: { h: 9, m: 0 }, hints: ['Yelkovan tam saatte hangi sayının üzerinde durur?'] },
      { prompt: 'Saati yedi buçuğa (07.30) kur.', target: { h: 7, m: 30 }, hints: ['Buçukta yelkovan 6’nın üzerindedir.', 'Akrep 7 ile 8’in ortasında olmalı.'] },
      { prompt: 'Saati üçü çeyrek geçeye (03.15) kur.', target: { h: 3, m: 15 }, hints: ['Çeyrek geçe: yelkovan bir çeyrek tur dönmüş, 3’ün üzerinde.'] },
      { prompt: 'Saati beşe çeyrek kalaya (04.45) kur.', target: { h: 4, m: 45 }, hints: ['5’e bir çeyrek kaldı: yelkovan 9’un üzerinde.', 'Akrep 5’e yaklaşmış ama henüz varmamış.'] },
    ],
  },
  {
    id: 'g2-saat-turleri',
    outcomes: ['MAT.2.1.9'],
    type: 'categorize',
    stage: 'model',
    title: 'Tam, yarım, çeyrek',
    instructions: 'Saatleri oku ve gösterdikleri zamana göre grupla.',
    level: 1,
    launch: { text: 'Bir saatin kadranını bir pizza gibi düşün: yelkovan yarım tur dönünce yarım saat, çeyrek tur dönünce çeyrek saat geçer.' },
    reflect: 'Bir saatin tam, buçuk ya da çeyrek olduğunu anlamak için hangi kola baktın?',
    categories: [
      { id: 'tam', label: 'Tam saat', color: '#3b82f6' },
      { id: 'yarim', label: 'Yarım saat (buçuk)', color: '#22c55e' },
      { id: 'ceyrek', label: 'Çeyrek (geçiyor / var)', color: '#f97316' },
    ],
    items: [
      { content: { visual: { kind: 'clock', h: 3, m: 0 } }, category: 'tam', explain: 'Yelkovan 12’de: tam saat.' },
      { content: { visual: { kind: 'clock', h: 8, m: 0, digital: true } }, category: 'tam', explain: '08.00: dakika 00, tam saat.' },
      { content: { visual: { kind: 'clock', h: 11, m: 0 } }, category: 'tam', explain: 'Yelkovan 12’de: tam saat.' },
      { content: { visual: { kind: 'clock', h: 2, m: 30 } }, category: 'yarim', explain: 'Yelkovan 6’da: yarım tur, buçuk.' },
      { content: { visual: { kind: 'clock', h: 6, m: 30, digital: true } }, category: 'yarim', explain: '06.30: 30 dakika yarım saattir.' },
      { content: { visual: { kind: 'clock', h: 10, m: 30 } }, category: 'yarim', explain: 'Yelkovan 6’da: buçuk.' },
      { content: { visual: { kind: 'clock', h: 4, m: 15 } }, category: 'ceyrek', explain: 'Yelkovan 3’te: çeyrek geçiyor.' },
      { content: { visual: { kind: 'clock', h: 7, m: 45, digital: true } }, category: 'ceyrek', explain: '07.45: 8’e çeyrek var.' },
      { content: { visual: { kind: 'clock', h: 9, m: 15 } }, category: 'ceyrek', explain: 'Yelkovan 3’te: çeyrek geçiyor.' },
      { content: { visual: { kind: 'clock', h: 12, m: 45 } }, category: 'ceyrek', explain: 'Yelkovan 9’da: 1’e çeyrek var.' },
    ],
  },
  {
    id: 'g2-zaman-birimleri',
    outcomes: ['MAT.2.1.9'],
    type: 'match',
    stage: 'sembol',
    title: 'Zaman birimleri',
    instructions: 'Eşit süreleri eşleştir.',
    level: 2,
    launch: { text: 'Ece “Yaz tatiline 3 ay var.” dedi, Can “Hayır, 12 hafta var!” dedi. İkisi aynı şeyi mi söylüyor?' },
    reflect: 'Kısa ve uzun zaman birimlerini sıraya koysan hangisi nereye gelir? Aralarındaki ilişkiyi anlat.',
    pairs: [
      { left: '1 saat', right: '60 dakika' },
      { left: 'Yarım saat', right: '30 dakika' },
      { left: 'Çeyrek saat', right: '15 dakika' },
      { left: '1 gün', right: '24 saat' },
      { left: '1 hafta', right: '7 gün' },
      { left: '1 ay', right: 'Yaklaşık 4 hafta' },
      { left: '1 mevsim', right: '3 ay' },
      { left: '1 yıl', right: '12 ay' },
    ],
    perRound: 4,
  },
  {
    id: 'g2-takvim-sirala',
    outcomes: ['MAT.2.1.9'],
    type: 'sort',
    stage: 'sembol',
    title: 'Takvimde sıra',
    instructions: 'Zaman birimlerini doğru sıraya koy.',
    level: 1,
    launch: { text: 'Duvar takvimine bakıyoruz: günler, aylar, mevsimler hep bir sırayla geliyor. Bu sıraları birlikte kuralım.' },
    reflect: 'Doğum günün hangi ayda, hangi mevsimde? Takvimde nasıl bulursun?',
    rounds: [
      { prompt: 'Hafta içi günlerini sırala.', items: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], ends: ['İlk', 'Son'] },
      { prompt: 'Mevsimleri ilkbahardan başlayarak sırala.', items: ['🌷 İlkbahar', '☀️ Yaz', '🍂 Sonbahar', '❄️ Kış'], ends: ['İlk', 'Son'] },
      { prompt: 'Yılın ilk altı ayını sırala.', items: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'], ends: ['İlk', 'Son'] },
      { prompt: 'Kısa süreden uzun süreye sırala.', items: ['Dakika', 'Saat', 'Gün', 'Hafta', 'Ay', 'Mevsim', 'Yıl'], ends: ['En kısa', 'En uzun'], hints: ['Hangisi diğerinin içine sığar? 1 saatte 60 dakika var.'] },
    ],
  },
  {
    id: 'g2-zaman-problemleri',
    outcomes: ['MAT.2.1.9'],
    type: 'quiz',
    stage: 'problem',
    title: 'Zamanla ilgili düşün',
    instructions: 'Zaman birimleri arasındaki ilişkileri kullanarak karar ver.',
    level: 2,
    launch: { text: 'Teneffüs çeyrek saat sürüyor. Ali “Çeyrek 25 demekti, kuruşta öyleydi!” diyor. Sence Ali haklı mı?' },
    reflect: 'Çeyrek saat ile 25 kuruşu neden karıştırabiliriz? Aralarındaki farkı nasıl anlatırsın?',
    questions: [
      { prompt: 'Teneffüs çeyrek saat sürüyor. Kaç dakika?', choices: ['15 dakika', '25 dakika', '4 dakika'], answer: 0, feedback: [null, '25 kuruş liranın çeyreğiydi çünkü 1 TL 100 kuruş. 1 saat ise 60 dakika: 4 çeyrek 15, 30, 45, 60.', 'Saat 4 çeyrekten oluşur ama bir çeyrek 4 dakika değil.'] },
      { prompt: 'Yarım saat kaç dakikadır?', choices: ['30', '50', '12'], answer: 0, feedback: [null, 'Yarım, 100’ün değil 60’ın yarısıdır.', '12, saat kadranındaki en büyük sayı; dakika değil.'] },
      { prompt: 'Okul 09.00’da başladı. İlk ders 40 dakika sürdü. Ders kaçta bitti?', choices: ['09.40', '10.00', '09.04'], answer: 0, feedback: [null, '1 saat geçmedi; sadece 40 dakika geçti.', '40 dakika, “04” değil “40” diye yazılır.'] },
      { prompt: 'Hangisi en uzun sürer?', choices: ['Dişlerini fırçalamak', 'Bir çizgi film izlemek', 'Ayakkabı bağlamak'], answer: 1, feedback: ['Diş fırçalamak birkaç dakika sürer.', null, 'Ayakkabı bağlamak bir dakika bile sürmeyebilir.'] },
      { prompt: { text: 'Saat kaçı gösteriyor?', visual: { kind: 'clock', h: 2, m: 30 } }, choices: ['02.30', '06.10', '03.30'], answer: 0, feedback: [null, 'Akrebi ve yelkovanı karıştırdın: kısa olan akrep saati gösterir.', 'Akrep 2 ile 3’ün arasında; henüz 3 olmadı.'] },
      { prompt: 'Ece 4 hafta tatil yaptı. Bu yaklaşık ne kadardır?', choices: ['1 ay', '4 ay', '1 yıl'], answer: 0, feedback: [null, '1 ay yaklaşık 4 haftadır; 4 ay çok daha uzun.', '1 yıl 12 aydır.'] },
      { prompt: 'Bir mevsim kaç ay sürer?', choices: ['3', '4', '12'], answer: 0, feedback: [null, 'Yılda 4 mevsim var; bir mevsim kaç ay?', '12 ay bir yıl eder.'] },
    ],
  },

  // MAT.2.1.10 Standart uzunluk ve kütle ölçme araçlarının gerekliliği
  {
    id: 'g2-karis-olcumu',
    outcomes: ['MAT.2.1.10'],
    type: 'fill',
    stage: 'model',
    title: 'Karışla, kalemle, ataşla',
    instructions: 'Aynı masa farklı birimlerle ölçüldü. Birimleri say ve boşlukları doldur.',
    level: 1,
    launch: { text: 'Ali masasını 8 karış, öğretmeni aynı masayı 5 karış ölçtü. Masa değişmedi; peki sonuçlar neden farklı?', visual: birimle(8, '#fbbf24') },
    reflect: 'Herkesin aynı sonucu bulması için ne yapmalıyız? Neden?',
    items: [
      { text: 'Ali masayı karışıyla ölçtü: __ karış.', answers: ['8'], visual: birimle(8, '#fbbf24'), hints: ['Sarı birimleri tek tek say.'] },
      { text: 'Öğretmen aynı masayı kendi karışıyla ölçtü: __ karış.', answers: ['5'], visual: birimle(5, '#f472b6'), hints: ['Pembe birimleri say.'] },
      { text: 'Aynı masa kurşun kalemle ölçüldü: __ kalem boyu.', answers: ['4'], visual: birimle(4, '#60a5fa') },
      { text: 'Aynı masa ataşla ölçüldü: __ ataş boyu.', answers: ['12'], visual: birimle(12, '#a3e635'), hints: ['Dikkatli say; birimler küçük.'] },
      { text: 'Birim büyüdükçe ölçüm sonucu __.', answers: ['azalır'], choices: ['azalır', 'artar', 'değişmez'], hints: ['Kalem (büyük birim) ile ataş (küçük birim) sonuçlarını karşılaştır.'], explain: 'Büyük birimden masaya daha az sığar; bu yüzden sayı küçülür.' },
      { text: 'Farklı birimlerle ölçünce masanın uzunluğu değişti mi? __', answers: ['Hayır'], choices: ['Hayır', 'Evet'], explain: 'Masa aynı; değişen yalnızca kullandığımız birim.' },
    ],
  },
  {
    id: 'g2-cetvelle-olc',
    outcomes: ['MAT.2.1.10'],
    type: 'quiz',
    stage: 'model',
    title: 'Cetvelle doğru ölç',
    instructions: 'Nesnenin cetvelde nerede başlayıp nerede bittiğine dikkat et.',
    level: 2,
    launch: { text: 'Karışlar herkeste farklı. Cetvel ise herkeste aynı! Ama cetveli doğru kullanmak da önemli. Nesneyi nereye koymalıyız?', visual: cetvel(0, 7) },
    reflect: 'Bir nesne cetvelde 0’dan değil de 2’den başlıyorsa uzunluğunu nasıl bulursun?',
    questions: [
      { prompt: { text: 'Silgi kaç cm?', visual: cetvel(0, 7, '#f472b6') }, choices: ['7 cm', '8 cm', '6 cm'], answer: 0, feedback: [null, 'Çizgileri değil aralıkları say: 0’dan 7’ye kaç aralık var?', 'Silginin ucu tam 7’de bitiyor.'] },
      { prompt: { text: 'Kalem kaç cm?', visual: cetvel(2, 9) }, choices: ['7 cm', '9 cm', '2 cm'], answer: 0, feedback: [null, 'Kalem 0’dan değil 2’den başlıyor; sadece bitiş sayısına bakamayız.', '2, başlangıç noktası; uzunluk değil.'] },
      { prompt: { text: 'Pastel boya kaç cm?', visual: cetvel(0, 12, '#22c55e') }, choices: ['12 cm', '13 cm', '11 cm'], answer: 0, feedback: [null, '0’dan başlayıp 12’de bitiyor. Fazladan aralık saymış olabilir misin?', 'Son aralığı da say.'] },
      { prompt: { text: 'Fırça kaç cm?', visual: cetvel(3, 8, '#a855f7') }, choices: ['5 cm', '8 cm', '11 cm'], answer: 0, feedback: [null, 'Fırça 3’ten başlıyor. 3’ten 8’e kaç cm var?', 'Başlangıç ile bitişi toplamıyoruz; aradaki aralıkları sayıyoruz.'] },
      { prompt: 'Cetvelle doğru ölçmek için ne yapmalıyız?', choices: ['Nesnenin bir ucunu 0’a hizalamak', 'Nesneyi cetvelin ortasına koymak', 'Cetveli eğri tutmak'], answer: 0, feedback: [null, 'Ortaya koyarsan başlangıç noktasını hesaba katman gerekir; 0’dan başlamak daha kolay.', 'Eğri tutulan cetvel yanlış sonuç verir.'] },
      { prompt: 'Ali ve Ece aynı kitabı cetvelle ölçtü. Ali 20 cm buldu. Ece doğru ölçtüyse kaç cm bulur?', choices: ['20 cm', 'Eli büyükse daha az', 'Bilemeyiz'], answer: 0, feedback: [null, 'Cetvel herkes için aynıdır; elin büyüklüğü sonucu değiştirmez.', 'Standart araçla doğru ölçen herkes aynı sonucu bulur.'] },
    ],
  },
  {
    id: 'g2-olcme-araclari',
    outcomes: ['MAT.2.1.10'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Uzunluk mu, kütle mi?',
    instructions: 'Ölçme araçlarını ve birimleri ne ölçtüklerine göre grupla.',
    level: 1,
    launch: { text: 'Terzi, manav, doktor ve marangoz işlerinde ölçme araçları kullanır. Kim neyi ölçer, hangi araçla?' },
    reflect: 'Bir marangoz ve bir manav hangi araçları kullanır? Neden farklı araçlara ihtiyaç duyarlar?',
    categories: [
      { id: 'uzunluk', label: '📏 Uzunluk ölçeriz', color: '#3b82f6' },
      { id: 'kutle', label: '⚖️ Kütle ölçeriz', color: '#f97316' },
    ],
    items: [
      { content: '📏 Cetvel', category: 'uzunluk', explain: 'Cetvel nesnelerin ne kadar uzun olduğunu ölçer.' },
      { content: 'Şerit metre', category: 'uzunluk', explain: 'Marangozlar şerit metreyle uzunluk ölçer.' },
      { content: 'Terzi mezurası', category: 'uzunluk', explain: 'Terzi kumaşın uzunluğunu mezurayla ölçer.' },
      { content: 'metre (m)', category: 'uzunluk', explain: 'Metre bir uzunluk birimidir.' },
      { content: 'santimetre (cm)', category: 'uzunluk', explain: 'Santimetre küçük uzunlukları ölçen bir birimdir.' },
      { content: '⚖️ Eşit kollu terazi', category: 'kutle', explain: 'Terazi iki tarafı karşılaştırarak kütle ölçer.' },
      { content: 'Baskül', category: 'kutle', explain: 'Baskülde kendi kütlemizi ölçeriz.' },
      { content: 'Mutfak tartısı', category: 'kutle', explain: 'Mutfak tartısı un, şeker gibi şeylerin kütlesini ölçer.' },
      { content: 'kilogram (kg)', category: 'kutle', explain: 'Kilogram bir kütle birimidir.' },
      { content: 'gram (g)', category: 'kutle', explain: 'Gram hafif şeylerin kütlesini ölçen bir birimdir.' },
    ],
  },
  {
    id: 'g2-neden-standart',
    outcomes: ['MAT.2.1.10'],
    type: 'quiz',
    stage: 'problem',
    title: 'Neden standart ölçme aracı?',
    instructions: 'Durumu oku ve en uygun cevabı seç.',
    level: 2,
    launch: { text: 'Pazarcı domatesleri avuçla satsa, iri elli bir müşteri daha çok domates alırdı. Bu adil olur muydu?' },
    reflect: 'Herkes kendi karışıyla, kendi avucuyla ölçseydi alışverişte ne gibi sorunlar çıkardı?',
    questions: [
      { prompt: 'Ali sırasını 8 karış, öğretmeni 5 karış ölçtü. Neden farklı sonuç buldular?', choices: ['Sıra uzadı', 'Karışları farklı uzunlukta', 'İkisi de yanlış saydı'], answer: 1, feedback: ['Sıra hiç değişmedi.', null, 'İkisi de doğru saymış olabilir; birimleri farklı.'] },
      { prompt: 'Herkesin aynı ölçüm sonucunu bulması için ne kullanmalıyız?', choices: ['Karış', 'Adım', 'Cetvel veya metre'], answer: 2, feedback: ['Herkesin karışı farklıdır.', 'Herkesin adımı farklıdır.', null] },
      { prompt: 'Manav elmaları neyle tartar?', choices: ['Terazi', 'Cetvel', 'Saat'], answer: 0, feedback: [null, 'Cetvel uzunluk ölçer; elmanın ağırlığını değil.', 'Saat zamanı ölçer.'] },
      { prompt: 'Terzi kumaşın uzunluğunu neyle ölçer?', choices: ['Baskül', 'Mezura', 'Termometre'], answer: 1, feedback: ['Baskül kütle ölçer.', null, 'Termometre sıcaklık ölçer.'] },
      { prompt: 'Doktor kütlemizi hangi araçla ölçer?', choices: ['Cetvel', 'Mezura', 'Baskül'], answer: 2, feedback: ['Cetvel uzunluk ölçer.', 'Mezura uzunluk ölçer.', null] },
      { prompt: 'Marangoz bir tahtanın uzunluğunu hangi birimle söyler?', choices: ['santimetre (cm)', 'kilogram (kg)', 'gram (g)'], answer: 0, feedback: [null, 'Kilogram kütle birimidir.', 'Gram kütle birimidir.'] },
      { prompt: 'Pazarcı domatesleri avuçla tartarsa ne olur?', choices: ['Herkes aynı miktar alır', 'Her müşteri farklı miktar alır, bu adil olmaz'], answer: 1, feedback: ['Avuçlar farklı büyüklükte; herkes aynı miktarı almaz.', null] },
    ],
  },

  // MAT.2.1.11 Standart birimlerle uzunluk ve kütle tahmini
  {
    id: 'g2-referansla-tahmin',
    outcomes: ['MAT.2.1.11'],
    type: 'fill',
    stage: 'model',
    title: 'Referansla tahmin et',
    instructions: 'Bildiğin bir ölçüyü (1 metrelik çubuk, 1 kg’lık paket) kullanarak tahmin et.',
    level: 2,
    launch: { text: 'Elinde 1 metrelik bir çubuk ve 1 kilogramlık bir şeker paketi var. Bunlarla başka şeylerin uzunluğunu ve kütlesini tahmin edebilir misin?', visual: metreyle(3, 'TAHTA') },
    reflect: '1 metreyi ya da 1 kilogramı vücudunda neyle hatırlarsın? Bu tahmin yapmana nasıl yardım eder?',
    items: [
      { text: 'Mavi çubuk 1 metre. Yeşil tahta yaklaşık __ metre.', answers: ['3'], visual: metreyle(3, 'TAHTA'), hints: ['Mavi çubuk tahtanın üzerine kaç kez sığar?'] },
      { text: 'Mavi çubuk 1 metre. Halı yaklaşık __ metre.', answers: ['2'], visual: metreyle(2, 'HALI'), hints: ['Çubuğu gözünde halının üzerinde kaydır.'] },
      { text: 'Mavi çubuk 1 metre. Koridor duvarı yaklaşık __ metre.', answers: ['5'], visual: metreyle(5, 'DUVAR'), hints: ['Çubuk boyunu gözünle kaç kez tekrar edersin?'] },
      { text: 'Terazi dengede. Karpuz yaklaşık __ kg.', answers: ['4'], visual: { kind: 'balance', left: ['🍉'], right: ['1 kg', '1 kg', '1 kg', '1 kg'] }, hints: ['Diğer kefede kaç tane 1 kg var?'] },
      { text: 'Terazi dengede. Okul çantası yaklaşık __ kg.', answers: ['2'], visual: { kind: 'balance', left: ['🎒'], right: ['1 kg', '1 kg'] } },
      { text: 'Terazi dengede. Çocuğun kütlesi yaklaşık __ kg.', answers: ['25'], visual: { kind: 'balance', left: ['🧒'], right: ['10 kg', '10 kg', '5 kg'] }, hints: ['10, 20, … diye say, sonra 5 ekle.'] },
    ],
  },
  {
    id: 'g2-birim-sec',
    outcomes: ['MAT.2.1.11'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Hangi birimle tahmin ederiz?',
    instructions: 'Her biri için en uygun ölçü birimini seç ve grupla.',
    level: 2,
    launch: { text: 'Can okul koridorunun uzunluğunu santimetreyle söylemeye çalıştı ve sayı çok büyüdü! Hangi birimi seçmeliydi?' },
    reflect: 'Bir birimin uygun olup olmadığına nasıl karar verirsin? Örnek ver.',
    categories: [
      { id: 'm', label: 'metre (m)', color: '#3b82f6' },
      { id: 'cm', label: 'santimetre (cm)', color: '#22c55e' },
      { id: 'kg', label: 'kilogram (kg)', color: '#f97316' },
      { id: 'g', label: 'gram (g)', color: '#a855f7' },
    ],
    items: [
      { content: '🏫 Okul koridorunun uzunluğu', category: 'm', explain: 'Uzun mesafeler metreyle söylenir.' },
      { content: '⚽ Futbol sahasının uzunluğu', category: 'm', explain: 'Futbol sahası çok uzun: metre uygun.' },
      { content: '🧽 Silginin uzunluğu', category: 'cm', explain: 'Silgi küçük; santimetre uygun.' },
      { content: '☝️ Parmağımızın uzunluğu', category: 'cm', explain: 'Parmak birkaç santimetre uzunluğundadır.' },
      { content: '🍉 Karpuzun kütlesi', category: 'kg', explain: 'Karpuz ağırdır; kilogram uygun.' },
      { content: '🌾 Bir çuval unun kütlesi', category: 'kg', explain: 'Bir çuval un çok ağırdır: kilogram.' },
      { content: '🍬 Bir şekerin kütlesi', category: 'g', explain: 'Şeker çok hafiftir; gram uygun.' },
      { content: '📎 Bir ataşın kütlesi', category: 'g', explain: 'Ataş çok hafiftir: gram.' },
    ],
  },
  {
    id: 'g2-olcu-tahmini',
    outcomes: ['MAT.2.1.11'],
    type: 'quiz',
    stage: 'problem',
    title: 'Yaklaşık ne kadar?',
    instructions: 'Ölçmeden önce tahmin et. En uygun cevabı seç.',
    level: 2,
    launch: { text: 'Ölçmeden önce tahmin etmek bir oyun gibidir: önce tahminini söyle, sonra ölç ve karşılaştır. Ne kadar yaklaşabilirsin?' },
    reflect: 'Bir tahminin “iyi” olduğunu nasıl anlarsın? Tahminin ölçümle tam aynı olması gerekir mi?',
    questions: [
      { prompt: '✏️ Bir kurşun kalemin uzunluğu yaklaşık ne kadardır?', choices: ['15 cm', '15 m', '150 m'], answer: 0, feedback: [null, '15 metre bir evden daha uzundur!', '150 metre bir futbol sahasından bile uzundur.'] },
      { prompt: '🚪 Sınıf kapısının yüksekliği yaklaşık ne kadardır?', choices: ['2 cm', '20 m', '2 m'], answer: 2, feedback: ['2 cm, bir silgiden bile kısadır.', '20 metre birkaç katlı bir binadan yüksektir.', null] },
      { prompt: '🍎 Bir elmanın kütlesi yaklaşık ne kadardır?', choices: ['2 g', '200 g', '20 kg'], answer: 1, feedback: ['2 g bir ataş kadar hafiftir.', null, '20 kg bir çocuğun kütlesine yakındır.'] },
      { prompt: '🧒 2. sınıftaki bir öğrencinin kütlesi yaklaşık ne kadardır?', choices: ['25 kg', '25 g', '250 kg'], answer: 0, feedback: [null, '25 g birkaç şeker kadar hafiftir.', '250 kg birkaç yetişkinden ağırdır.'] },
      { prompt: '🍉 Bir karpuzun kütlesi yaklaşık ne kadardır?', choices: ['5 g', '500 kg', '5 kg'], answer: 2, feedback: ['5 g bir şeker kadar hafiftir.', '500 kg bir inekten bile ağır olabilir.', null] },
      { prompt: '🧽 Bir silginin uzunluğu yaklaşık ne kadardır?', choices: ['4 m', '4 cm', '40 m'], answer: 1, feedback: ['4 metre bir odadan uzundur.', null, '40 metre çok çok uzundur.'] },
      { prompt: 'Defne masasının uzunluğunu 60 cm tahmin etti. Cetvelle ölçünce 58 cm buldu. Tahmini nasıldı?', choices: ['Ölçüme çok yakın', 'Ölçümden çok uzak'], answer: 0, feedback: [null, '58 ile 60 arasında sadece 2 cm fark var.'] },
    ],
  },

  // ── Nesnelerin Geometrisi (2) ───────────────────────────────────────────

  // MAT.2.3.6 Mesafe ve yön içeren hedefe ulaşma stratejileri
  {
    id: 'g2-hedefe-ulas',
    outcomes: ['MAT.2.3.6'],
    type: 'quiz',
    stage: 'model',
    title: 'Hedefe en iyi yol',
    instructions: 'Haritayı incele. Her kare bir adım. En uygun yolu seç.',
    level: 2,
    launch: { text: 'Evinden okula giderken her gün aynı yolu mu kullanıyorsun? En kısa yolu bulmak için haritada neye bakarız?', visual: { kind: 'svg', svg: HARITA_OKUL } },
    reflect: 'En kısa yolu bulmak için kareleri nasıl saydın? Başka bir yol da aynı uzunlukta olabilir mi?',
    questions: [
      { prompt: { text: 'Evden 🏠 okula 🏫 hangi yönerge götürür?', visual: { kind: 'svg', svg: HARITA_OKUL } }, choices: ['3 kare sağa, 4 kare yukarı', '4 kare sağa, 3 kare yukarı', '4 kare sola, 3 kare yukarı'], answer: 1, feedback: ['Sağa ve yukarı kareleri ayrı ayrı say: okul kaç sütun sağda?', null, 'Okul evin sağında; sola gidersen haritadan çıkarsın.'] },
      { prompt: { text: 'Evden okula en kısa yol kaç karedir?', visual: { kind: 'svg', svg: HARITA_OKUL } }, choices: ['5', '7', '9'], answer: 1, feedback: ['Sağa 4, yukarı 3 kare gitmen gerekiyor. Topla.', null, 'Gereksiz kareler eklemiş olabilir misin? En kısa yolu düşün.'] },
      { prompt: { text: 'Tavşan 🐰 havuca 🥕 gidecek ama yol kapalı 🚧. Hangi yol uygun?', visual: { kind: 'svg', svg: HARITA_TAVSAN } }, choices: ['4 kare sağa', '2 kare sağa, 2 kare yukarı', '1 kare yukarı, 4 kare sağa, 1 kare aşağı'], answer: 2, feedback: ['Bu yol 🚧 engelinden geçiyor.', 'Bu yol havuca ulaşmıyor; nerede durduğunu kontrol et.', null] },
      { prompt: { text: 'Can 🧒 önce dondurmacıya 🍦, sonra parka 🛝 gidecek. En az kaç kare yürür?', visual: { kind: 'svg', svg: HARITA_PARK } }, choices: ['4', '8', '12'], answer: 2, feedback: ['4 kare, dondurmacıya uğramadan doğrudan parka gitmek olurdu.', 'Dondurmacıya kaç kare, oradan parka kaç kare? İkisini ayrı say.', null] },
      { prompt: { text: 'Can dondurmacıya uğramadan doğrudan parka gitseydi kaç kare yürürdü?', visual: { kind: 'svg', svg: HARITA_PARK } }, choices: ['4', '6', '12'], answer: 0, feedback: [null, 'Park Can ile aynı sırada; yalnızca sağa gitmesi yeterli.', '12 kare, dondurmacıya uğrayan yoldu.'] },
      { prompt: 'Okula giderken en kısa yolu seçmek için neye bakarız?', choices: ['Evlerin rengine', 'Adım ya da kare sayısına', 'Ağaçların boyuna'], answer: 1, feedback: ['Renkler yolun uzunluğunu değiştirmez.', null, 'Ağaçların boyu yolun uzunluğunu değiştirmez.'] },
    ],
  },
  {
    id: 'g2-ok-kodlari',
    outcomes: ['MAT.2.3.6'],
    type: 'match',
    stage: 'sembol',
    title: 'Robotun ok kodları',
    instructions: 'Ok kodunu sözle yazılmış yönergeyle eşleştir.',
    level: 2,
    launch: { text: 'Bir robot sadece okları anlıyor: ➡️ bir kare sağa, ⬆️ bir kare yukarı. Robota yolu oklarla nasıl anlatırsın?' },
    reflect: 'Kendi ok kodunu yaz. Arkadaşın kodu sözle söyleyebildi mi?',
    pairs: [
      { left: '➡️➡️➡️⬆️', right: '3 kare sağa, 1 kare yukarı' },
      { left: '⬆️⬆️➡️', right: '2 kare yukarı, 1 kare sağa' },
      { left: '⬅️⬅️⬇️⬇️', right: '2 kare sola, 2 kare aşağı' },
      { left: '⬇️➡️➡️➡️', right: '1 kare aşağı, 3 kare sağa' },
      { left: '⬆️⬆️⬆️⬅️', right: '3 kare yukarı, 1 kare sola' },
    ],
    perRound: 5,
  },
  {
    id: 'g2-yol-tarifi',
    outcomes: ['MAT.2.3.6'],
    type: 'sort',
    stage: 'sembol',
    title: 'Yol tarifi',
    instructions: 'Hedefe ulaşmak için adımları doğru sıraya koy.',
    level: 2,
    launch: { text: 'Yeni gelen bir arkadaşın kütüphaneye gitmek istiyor. Ona yolu adım adım nasıl tarif edersin?' },
    reflect: 'İyi bir yol tarifinde hangi bilgiler olmalı? Yön mü, mesafe mi, ikisi de mi?',
    rounds: [
      { prompt: 'Elif evden kütüphaneye gidiyor.', items: ['🏠 Evden çık', '⬆️ 20 adım ileri yürü', '➡️ Fırının önünde sağa dön', '⬆️ 10 adım daha yürü', '📚 Kütüphaneye var'], ends: ['Başla', 'Bitir'] },
      { prompt: 'Robot 🤖 yıldızı ⭐ almaya gidiyor.', items: ['🤖 Başlangıç noktasından çık', '➡️ 3 kare sağa git, 🌳 ağaca ulaş', '⬆️ 2 kare yukarı git, ⛲ çeşmeye ulaş', '➡️ 1 kare sağa git, ⭐ yıldızı al'], ends: ['Başla', 'Bitir'] },
      { prompt: 'Mehmet okuldan eve dönerken markete uğrayacak.', items: ['🏫 Okuldan çık', '⬅️ 15 adım sola yürü', '🛒 Marketten ekmek al', '⬆️ 25 adım ileri yürü', '🏠 Eve var'], ends: ['Başla', 'Bitir'], hints: ['Mehmet eve varmadan önce nereye uğramalı?'] },
    ],
  },
  {
    id: 'g2-olcut-degisirse',
    outcomes: ['MAT.2.3.6'],
    type: 'quiz',
    stage: 'problem',
    title: 'Ölçüt değişirse yol değişir',
    instructions: 'Hedefe ulaşmak için ölçütü belirle (en kısa, güvenli, uğranacak yer) ve en uygun seçimi yap.',
    level: 3,
    launch: { text: 'En kısa yol her zaman en iyi yol mudur? Yol çalışması varsa ya da markete uğraman gerekiyorsa ne olur?', visual: { kind: 'svg', svg: HARITA_YOL } },
    reflect: 'Ölçütün değiştiği bir gün yaşadın mı? (Yol kapalıydı, bir yere uğraman gerekti…) Yolunu nasıl değiştirdin?',
    questions: [
      { prompt: { text: 'Çocuk 🧒 önce markete 🛒, sonra eve 🏠 gidecek. En az kaç kare yürür?', visual: { kind: 'svg', svg: HARITA_MARKET } }, choices: ['4', '8', '6'], answer: 1, feedback: ['4 kare yalnızca markete kadar. Oradan eve de gitmeli.', null, 'Markete 2 sağ 2 yukarı, eve 2 sağ 2 aşağı: kareleri yeniden say.'] },
      { prompt: { text: 'Okula giden yolda çalışma var 🚧. Hangi yol uygun?', visual: { kind: 'svg', svg: HARITA_YOL } }, choices: ['3 kare sağa', '1 kare aşağı, 3 kare sağa, 1 kare yukarı', '2 kare aşağı, 2 kare sağa'], answer: 1, feedback: ['Bu yol 🚧 çalışmanın içinden geçiyor.', null, 'Bu yol okula varmıyor; nerede bittiğine bak.'] },
      { prompt: 'Elif parka en kısa yoldan gitmek istiyor ama o yolda havlayan bir köpek var ve Elif korkuyor. Ne yapmalı?', choices: ['Köpeğin olmadığı, biraz daha uzun bir yol seçmeli', 'Yine de köpeğin yanından geçmeli', 'Parka hiç gitmemeli'], answer: 0, feedback: [null, 'Ölçüt değişti: artık “en kısa” değil “güvenli” yol önemli.', 'Başka bir yol seçerek hedefe yine ulaşabilir.'] },
      { prompt: 'A yolu 6 kare, B yolu 9 kare. Ölçüt “en kısa yol” ise hangisini seçeriz?', choices: ['A yolunu', 'B yolunu', 'Fark etmez'], answer: 0, feedback: [null, '9 kare, 6 kareden uzundur.', 'Ölçüt “en kısa” olduğunda kare sayısı fark eder.'] },
      { prompt: 'Hedefe ulaşmak için hangi bilgiyi toplamamız gerekmez?', choices: ['Evlerin boyası hangi renk', 'Kaç kare ya da adım gideceğim', 'Hangi yöne döneceğim'], answer: 0, feedback: [null, 'Mesafe, yolu planlamak için gereklidir.', 'Yön bilgisi olmadan hedefe ulaşamayız.'] },
      { prompt: { text: '“4 kare sağa, 3 kare yukarı” yerine “3 kare yukarı, 4 kare sağa” gidersek kaç kare yürürüz?', visual: { kind: 'svg', svg: HARITA_OKUL } }, choices: ['Yine 7', 'Daha fazla, 12', 'Daha az, 4'], answer: 0, feedback: [null, 'Sıra değişse de kare sayısı değişmez: 3 + 4 = 4 + 3.', 'Hâlâ 3 kare yukarı ve 4 kare sağa gidiyoruz.'] },
    ],
  },

  // MAT.2.3.7 Simetrik şekilleri ayırt etme
  {
    id: 'g2-simetri-tamamla',
    outcomes: ['MAT.2.3.7'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Simetriyi tamamla',
    instructions: 'Kırmızı çizginin öbür yanına şeklin eşini boya.',
    level: 2,
    launch: { text: 'Kâğıdı ikiye katlayıp bir yarısına boya damlattık. Kâğıdı açınca ne göreceğiz? Şimdi bunu karelerle yapalım.' },
    reflect: 'Bir kareyi boyarken eşini nereye boyayacağını nasıl buldun? Çizgiye olan uzaklığı nasıl düşündün?',
    tool: 'symmetry',
    config: { size: 8 },
    tasks: [
      { prompt: 'Ağacın diğer yarısını boya.', target: { axis: 'v', cells: ['3,1', '2,2', '3,2', '1,3', '2,3', '3,3', '3,4', '3,5'] }, hints: ['Her boyalı karenin çizgiye kaç kare uzak olduğunu say.', 'Eşini çizginin öbür yanında aynı uzaklığa boya.'] },
      { prompt: 'Kalbin diğer yarısını boya.', target: { axis: 'v', cells: ['1,1', '2,1', '0,2', '1,2', '2,2', '3,2', '1,3', '2,3', '3,3', '2,4', '3,4', '3,5'] }, hints: ['Satır satır ilerle.'] },
      { prompt: 'Evin diğer yarısını boya.', target: { axis: 'v', cells: ['3,0', '2,1', '3,1', '1,2', '2,2', '3,2', '1,3', '1,4', '1,5', '3,4', '3,5'] }, hints: ['Çatıdan başla, aşağı doğru in.'] },
    ],
  },
  {
    id: 'g2-simetri-dogrusu',
    outcomes: ['MAT.2.3.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Simetrik olanı bul',
    instructions: 'Şekilleri zihninde kırmızı çizgiden katla. İki yarısı üst üste geliyor mu?',
    level: 2,
    launch: { text: 'Kelebeğin kanatlarına bak: sol kanat sağ kanadın tıpkısı. Bir şeklin ortasından katlayınca iki yarısı tam üst üste gelirse ne deriz?' },
    reflect: 'Bir şeklin simetrik olduğunu katlamadan nasıl anlarsın?',
    questions: [
      {
        prompt: 'Kırmızı çizgiye göre simetrik olan hangisi?',
        choices: [
          { visual: { kind: 'grid', cols: 6, rows: 4, axis: 'v', cells: ['1,0', '2,0', '1,1', '1,2', '2,2', '1,3'] } },
          { visual: { kind: 'grid', cols: 6, rows: 4, axis: 'v', cells: ['2,0', '3,0', '1,1', '2,1', '3,1', '4,1', '2,2', '3,2', '2,3', '3,3'] } },
          { visual: { kind: 'grid', cols: 6, rows: 4, axis: 'v', cells: ['2,0', '3,0', '4,0', '2,1', '2,2', '3,2', '2,3'] } },
        ],
        answer: 1,
        feedback: ['Şeklin tamamı çizginin bir yanında; katlayınca öbür yanda eşi yok.', null, 'Çizgiden katla: sağ taraf sol tarafla aynı mı? Sağda daha az kare var.'],
      },
      {
        prompt: 'Kırmızı çizgiye göre simetrik olan hangisi?',
        choices: [
          { visual: { kind: 'grid', cols: 4, rows: 6, axis: 'h', cells: ['1,1', '2,1', '0,2', '3,2', '0,3', '3,3', '1,4', '2,4'] } },
          { visual: { kind: 'grid', cols: 4, rows: 6, axis: 'h', cells: ['1,0', '1,1', '1,2', '2,2', '2,3'] } },
          { visual: { kind: 'grid', cols: 4, rows: 6, axis: 'h', cells: ['0,1', '1,1', '2,1', '3,1', '0,4'] } },
        ],
        answer: 0,
        feedback: [null, 'Yukarıdan aşağı katla: üst yarı ile alt yarı aynı mı?', 'Üstte 4 kare, altta 1 kare var; katlayınca üst üste gelmez.'],
      },
      { prompt: 'Hangi rakam simetriktir?', choices: ['4', '7', '8'], answer: 2, feedback: ['4’ü ortadan katlayınca iki yarısı aynı olmaz.', '7’nin üst çizgisi tek tarafa doğru uzanır.', null] },
      { prompt: 'Hangisi simetrik DEĞİLDİR?', choices: [{ visual: { kind: 'shape', shape: 'circle', color: '#a855f7' } }, { visual: { kind: 'svg', svg: CESITKENAR_UCGEN } }, { visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } }], answer: 1, feedback: ['Daireyi ortasından katlarsan iki yarısı tam üst üste gelir.', null, 'Kareyi ortasından katlarsan iki yarısı tam üst üste gelir.'] },
      { prompt: 'Kelebeğin iki kanadı simetri doğrusunun iki yanında nasıldır?', choices: ['Farklı büyüklükte', 'Birbirinin tıpkısı, aynı', 'Farklı biçimde'], answer: 1, feedback: ['Simetrik kanatlar aynı büyüklüktedir.', null, 'Simetrik kanatların biçimi de aynıdır.'] },
      { prompt: 'Kâğıdı ikiye katlayıp bir yarısına boya damlattık, kapatıp açtık. Oluşan resim nasıldır?', choices: ['Simetrik', 'Simetrik değil'], answer: 0, feedback: [null, 'Boya katlama çizgisinin öbür yanına aynen geçer; iki yarı aynı olur.'] },
    ],
  },
  {
    id: 'g2-simetrik-mi',
    outcomes: ['MAT.2.3.7'],
    type: 'categorize',
    stage: 'model',
    title: 'Simetrik mi?',
    instructions: 'Bir çizgi boyunca katlayınca iki yarısı tam üst üste geliyorsa simetriktir. Grupla.',
    level: 1,
    launch: { text: 'Adının harflerine bak. Hangi harfleri ortasından katlarsan iki yarısı tam üst üste gelir?' },
    reflect: 'Simetrik olan harflerde nasıl bir ortaklık buldun? Kendi adındaki harfleri incele.',
    categories: [
      { id: 'evet', label: 'Simetrik', color: '#22c55e' },
      { id: 'hayir', label: 'Simetrik değil', color: '#ef4444' },
    ],
    items: [
      { content: 'A', category: 'evet', explain: 'A’yı ortadan dikey katla: iki yarısı aynı.' },
      { content: 'H', category: 'evet', explain: 'H hem dikey hem yatay katlanınca üst üste gelir.' },
      { content: 'M', category: 'evet', explain: 'M’yi ortadan dikey katla: iki yarısı aynı.' },
      { content: 'T', category: 'evet', explain: 'T’nin sapı ortada; iki yanı aynı.' },
      { content: '🦋', category: 'evet', explain: 'Kelebeğin iki kanadı birbirinin tıpkısıdır.' },
      { content: 'F', category: 'hayir', explain: 'F’nin kolları yalnızca bir yana uzanır.' },
      { content: 'G', category: 'hayir', explain: 'G’yi hangi çizgiden katlasan iki yarısı aynı olmaz.' },
      { content: 'R', category: 'hayir', explain: 'R’nin bacağı yalnızca bir yana uzanır.' },
      { content: 'J', category: 'hayir', explain: 'J’nin kıvrımı tek taraftadır.' },
      { content: 'L', category: 'hayir', explain: 'L’nin alt çizgisi yalnızca sağa uzanır.' },
    ],
  },
  {
    id: 'g2-simetri-farkli',
    outcomes: ['MAT.2.3.7'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Simetri)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçenek için bir gerekçe bulunabilir!',
    level: 2,
    launch: { text: 'Doğada, harflerde, rakamlarda simetri saklı. Dört örneğe bak: hangisini farklı bulursun, neden?' },
    reflect: 'Seçtiğin örneği bir arkadaşına gerekçesiyle anlat. Arkadaşın başka bir örnek seçtiyse onun gerekçesi de doğru olabilir mi?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: ['🦋', 'H', 'F', '8'],
        answer: 0,
        reasons: ['Doğada bulunan, canlı olan tek örnek.', 'Simetrik olan tek harf.', 'Simetrik olmayan tek örnek.', 'Rakam olan tek örnek.'],
      },
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [{ visual: { kind: 'shape', shape: 'circle', color: '#a855f7' } }, { visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } }, { visual: { kind: 'svg', svg: CESITKENAR_UCGEN } }, { visual: { kind: 'shape', shape: 'rectangle', color: '#eab308' } }],
        answer: 0,
        reasons: ['Köşesi olmayan tek şekil; ortasından nereden katlarsan katla iki yarısı üst üste gelir.', '4 kenarı da eşit olan tek şekil.', 'Hiçbir çizgiden katlayınca iki yarısı üst üste gelmeyen, simetrik olmayan tek şekil.', 'İki kenarı uzun, iki kenarı kısa olan tek şekil.'],
      },
    ],
  },

  // ── Veriye Dayalı Araştırma ─────────────────────────────────────────────

  // MAT.2.4.1 En çok iki veri grubuyla çalışma ve veriye dayalı karar verme
  {
    id: 'g2-grafik-olustur',
    outcomes: ['MAT.2.4.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Grafiği sen oluştur',
    instructions: 'Tablodaki sayılara göre grafiği oluştur.',
    level: 2,
    launch: { text: 'Sınıfta “Yazı mı kışı mı daha çok seviyoruz?” diye sorduk ve oyları topladık. Sonuçları herkesin bir bakışta göreceği şekilde nasıl gösterebiliriz?' },
    reflect: 'Grafiğe bakınca hangi grubun daha çok olduğunu saymadan nasıl anladın?',
    tool: 'bargraph',
    tasks: [
      { prompt: '2/A sınıfının sevdiği mevsim: Yaz 8, Kış 5. Grafiği oluştur.', target: { data: [{ label: '☀️ Yaz', value: 8 }, { label: '❄️ Kış', value: 5 }] }, hints: ['Her sütunu tablodaki sayı kadar yükselt.'] },
      { prompt: 'Teneffüste yenen meyveler: Elma 6, Muz 9. Grafiği oluştur.', target: { data: [{ label: '🍎 Elma', value: 6 }, { label: '🍌 Muz', value: 9 }] } },
      { prompt: 'Öğrencilerin evcil hayvan tercihi: Kedi 7, Köpek 4. Grafiği oluştur.', target: { data: [{ label: '🐱 Kedi', value: 7 }, { label: '🐶 Köpek', value: 4 }] } },
    ],
  },
  {
    id: 'g2-cetele-siklik',
    outcomes: ['MAT.2.4.1'],
    type: 'fill',
    stage: 'model',
    title: 'Çetele ve sıklık tablosu',
    instructions: 'Tabloyu ya da grafiği oku, boşlukları doldur.',
    level: 2,
    launch: { text: 'Oylama yaparken her oy için bir çizgi çektik. Çizgiler çoğalınca saymak zorlaştı. 5’erli demetler yaparsak kolaylaşır mı?', visual: { kind: 'table', headers: ['Meyve', 'Çetele'], rows: [['🍎 Elma', '||||| ||'], ['🍌 Muz', '||||']] } },
    reflect: 'Çetele, sıklık tablosu ve şekil grafiği aynı veriyi nasıl farklı gösterir? Hangisini okumak sana daha kolay geldi?',
    items: [
      { text: 'Elmayı seven __ kişi, muzu seven __ kişi var.', answers: ['7', '4'], visual: { kind: 'table', headers: ['Meyve', 'Çetele'], rows: [['🍎 Elma', '||||| ||'], ['🍌 Muz', '||||']] }, hints: ['Çizgileri 5’erli say.'] },
      { text: 'Kırmızıyı seven __ kişi, maviyi seven __ kişi var.', answers: ['10', '6'], visual: { kind: 'table', headers: ['Renk', 'Çetele'], rows: [['🔴 Kırmızı', '||||| |||||'], ['🔵 Mavi', '||||| |']] }, hints: ['Her demet 5 çizgi.'] },
      { text: 'Okula yürüyerek __ öğrenci, servisle __ öğrenci geliyor.', answers: ['12', '8'], visual: { kind: 'table', headers: ['Okula geliş', 'Öğrenci sayısı'], rows: [['🚶 Yürüyerek', 12], ['🚌 Servisle', 8]] } },
      { text: 'Futbolu seven __ kişi, basketbolu seven __ kişi var.', answers: ['5', '3'], visual: { kind: 'pictograph', data: [{ label: '⚽ Futbol', value: 5 }, { label: '🏀 Basketbol', value: 3 }], icon: '🟦' }, hints: ['Her 🟦 bir kişiyi gösteriyor.'] },
      { text: 'Daha çok seçilen kitap türü __.', answers: ['Masal'], choices: ['Masal', 'Çizgi roman'], visual: { kind: 'pictograph', data: [{ label: '📚 Masal', value: 8 }, { label: '🦸 Çizgi roman', value: 6 }], icon: '⭐' }, hints: ['Hangi satır daha uzun?'] },
      { text: 'Şekil grafiğinde her ⭐ 1 öğrenciyi gösteriyor. 7 öğrenci için __ tane ⭐ çizeriz.', answers: ['7'] },
    ],
  },
  {
    id: 'g2-sekil-grafigi',
    outcomes: ['MAT.2.4.1'],
    type: 'quiz',
    stage: 'model',
    title: 'Şekil grafiğini yorumla',
    instructions: 'Grafiği ve tabloyu incele, soruları cevapla.',
    level: 1,
    launch: { text: '2/A sınıfı en sevdiği mevsimi seçti ve her öğrenci için bir yıldız çizildi. Grafik bize ne anlatıyor?', visual: { kind: 'pictograph', title: '2/A sınıfının sevdiği mevsim', data: [{ label: '☀️ Yaz', value: 9 }, { label: '❄️ Kış', value: 6 }], icon: '⭐' } },
    reflect: 'Bu grafiğe bakarak sınıfınız için hangi kararı verebilirsiniz? Neden?',
    questions: [
      { prompt: { text: 'Hangi mevsimi seven öğrenci daha çok?', visual: { kind: 'pictograph', title: '2/A sınıfının sevdiği mevsim', data: [{ label: '☀️ Yaz', value: 9 }, { label: '❄️ Kış', value: 6 }], icon: '⭐' } }, choices: ['☀️ Yaz', '❄️ Kış'], answer: 0, feedback: [null, 'Satırların uzunluğunu karşılaştır: hangisinde daha çok yıldız var?'] },
      { prompt: { text: 'Kışı kaç öğrenci seviyor?', visual: { kind: 'pictograph', title: '2/A sınıfının sevdiği mevsim', data: [{ label: '☀️ Yaz', value: 9 }, { label: '❄️ Kış', value: 6 }], icon: '⭐' } }, choices: ['9', '6', '15'], answer: 1, feedback: ['9, yazı sevenlerin sayısı.', null, '15, iki grubun toplamı; sadece kışı soruyoruz.'] },
      { prompt: { text: 'Grafikte her ⭐ neyi gösteriyor?', visual: { kind: 'pictograph', title: '2/A sınıfının sevdiği mevsim', data: [{ label: '☀️ Yaz', value: 9 }, { label: '❄️ Kış', value: 6 }], icon: '⭐' } }, choices: ['1 mevsimi', '2 öğrenciyi', '1 öğrenciyi'], answer: 2, feedback: ['Yıldızlar mevsimleri değil, oy veren öğrencileri gösterir.', 'Burada her yıldız tek bir öğrenciyi gösteriyor.', null] },
      { prompt: { text: '2/B sınıfında hangi hayvanı seven daha çok?', visual: { kind: 'table', headers: ['Sınıf', '🐱 Kedi', '🐶 Köpek'], rows: [['2/A', 7, 5], ['2/B', 4, 8]] } }, choices: ['🐱 Kedi', '🐶 Köpek'], answer: 1, feedback: ['2/B satırına bak: kedi 4, köpek 8.', null] },
      { prompt: { text: 'Hangi sınıfta kediyi seven daha çok?', visual: { kind: 'table', headers: ['Sınıf', '🐱 Kedi', '🐶 Köpek'], rows: [['2/A', 7, 5], ['2/B', 4, 8]] } }, choices: ['2/A', '2/B'], answer: 0, feedback: [null, 'Kedi sütununa bak: 2/A’da 7, 2/B’de 4.'] },
    ],
  },
  {
    id: 'g2-veri-grupla',
    outcomes: ['MAT.2.4.1', 'MAT.2.1.9'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Ayları grupla',
    instructions: 'Öğrencilerin en sevdiği aylar toplandı. Her ayı ait olduğu mevsime koy.',
    level: 1,
    launch: { text: 'Sınıfa “En sevdiğin ay hangisi?” diye sorduk. Cevapları yaz ve kış diye iki gruba ayırırsak hangi mevsimin daha çok sevildiğini görebiliriz.' },
    reflect: 'Verileri gruplamak, araştırma sorumuzu cevaplamamıza nasıl yardım etti?',
    categories: [
      { id: 'yaz', label: '☀️ Yaz ayları', color: '#f97316' },
      { id: 'kis', label: '❄️ Kış ayları', color: '#3b82f6' },
    ],
    items: [
      { content: 'Haziran', category: 'yaz', explain: 'Haziran, yazın ilk ayıdır.' },
      { content: 'Temmuz', category: 'yaz', explain: 'Temmuz bir yaz ayıdır.' },
      { content: 'Ağustos', category: 'yaz', explain: 'Ağustos, yazın son ayıdır.' },
      { content: 'Aralık', category: 'kis', explain: 'Aralık, kışın ilk ayıdır.' },
      { content: 'Ocak', category: 'kis', explain: 'Ocak bir kış ayıdır.' },
      { content: 'Şubat', category: 'kis', explain: 'Şubat, kışın son ayıdır.' },
    ],
  },
  {
    id: 'g2-arastirma-sorusu',
    outcomes: ['MAT.2.4.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Araştırmacı ol',
    instructions: 'Araştırma sorusunu, veri toplamayı ve veriye dayalı kararı düşün.',
    level: 2,
    launch: { text: 'Sınıf gezisine nereye gideceğimize karar vermemiz gerekiyor. Öğretmen “Veriye bakarak karar verelim.” dedi. Bunu nasıl yaparız?' },
    reflect: 'Sen sınıfında hangi soruyu araştırmak isterdin? Verileri kimden, nasıl toplardın?',
    questions: [
      { prompt: 'Hangisi veri toplayarak cevaplayabileceğimiz bir araştırma sorusudur?', choices: ['Sınıfımızdakiler yazı mı kışı mı daha çok seviyor?', 'Kalemim nerede?', 'Bugün günlerden ne?'], answer: 0, feedback: [null, 'Bu sorunun tek bir cevabı var; kimseye sormadan bakarak bulursun.', 'Takvime bakarak bulunur; veri toplamaya gerek yok.'] },
      { prompt: '“2/A’daki öğrenciler kediyi mi köpeği mi daha çok seviyor?” Bu soruyu kimlere sorarız?', choices: ['2/A’daki öğrencilere', 'Okuldaki öğretmenlere', 'Sadece en iyi arkadaşıma'], answer: 0, feedback: [null, 'Soru 2/A’daki öğrencilerle ilgili; öğretmenlerin cevabı soruyu cevaplamaz.', 'Bir kişinin cevabı bütün sınıfı göstermez.'] },
      { prompt: 'Veriler 2/A’dan toplandı. Aynı soru 2/B’ye sorulsaydı sonuçlar kesinlikle aynı mı olurdu?', choices: ['Hayır, farklı olabilir', 'Evet, kesinlikle aynı olurdu'], answer: 0, feedback: [null, 'Farklı öğrenciler farklı şeyleri sevebilir; sonuç değişebilir.'] },
      { prompt: { text: 'Gezi oylaması yapıldı. Verilere göre hangi karar uygun?', visual: { kind: 'pictograph', title: 'Gezi oylaması', data: [{ label: '🏞️ Park', value: 14 }, { label: '🏛️ Müze', value: 9 }], icon: '⭐' } }, choices: ['Parka gitmek', 'Müzeye gitmek', 'Karar verilemez'], answer: 0, feedback: [null, 'Müzeye daha az oy çıktı; veriye göre karar verelim.', 'Veriler bize hangisinin daha çok istendiğini gösteriyor.'] },
      { prompt: 'Toplanan verileri neden kaydederiz?', choices: ['Unutmamak ve sonra tabloyla, grafikle göstermek için', 'Veri hiç değişmesin diye', 'Kaydetmeye gerek yok'], answer: 0, feedback: [null, 'Kaydetmek veriyi değiştirmez ya da sabitlemez; unutmamamızı sağlar.', 'Kaydetmezsek sonuçları unutabilir, karıştırabiliriz.'] },
      { prompt: 'Aynı soruyu bir hafta sonra yine sorsak aynı sonuçları bulur muyuz?', choices: ['Farklı olabilir; bazı öğrenciler fikrini değiştirebilir', 'Her zaman aynı olur'], answer: 0, feedback: [null, 'İnsanların fikirleri değişebilir; veriler de değişebilir.'] },
    ],
  },
  {
    id: 'g2-veri-farkli',
    outcomes: ['MAT.2.4.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? (Veri)',
    instructions: 'Hangisi diğerlerinden farklı? Her seçenek için bir gerekçe bulunabilir!',
    level: 2,
    launch: { text: 'Aynı araştırmanın sonuçları dört farklı şekilde gösterilmiş. Ama biri gizli bir farklılık taşıyor olabilir. Dikkatle bak!' },
    reflect: 'Çetele, sıklık tablosu ve şekil grafiğinden hangisini kullanmayı seçerdin? Neden?',
    questions: [
      {
        prompt: 'Hangisi farklı? Bir gerekçe bul.',
        choices: [
          { visual: { kind: 'table', headers: ['Hayvan', 'Çetele'], rows: [['🐱 Kedi', '||||| ||'], ['🐶 Köpek', '|||||']] } },
          { visual: { kind: 'table', headers: ['Hayvan', 'Öğrenci sayısı'], rows: [['🐱 Kedi', 7], ['🐶 Köpek', 5]] } },
          { visual: { kind: 'pictograph', data: [{ label: '🐱 Kedi', value: 7 }, { label: '🐶 Köpek', value: 5 }], icon: '⭐' } },
          { visual: { kind: 'bars', data: [{ label: '🐱 Kedi', value: 5 }, { label: '🐶 Köpek', value: 7 }] } },
        ],
        answer: 0,
        reasons: ['Çetele çizgileriyle gösterilen tek temsil.', 'Sayıların doğrudan yazıldığı tek temsil (sıklık tablosu).', 'Her öğrencinin bir şekille (⭐) gösterildiği tek temsil.', 'Farklı bir veriyi gösteren tek temsil: burada köpeği seven daha çok. Diğer üçünde kedi 7, köpek 5.'],
      },
      {
        prompt: 'Hangi araştırma sorusu farklı? Bir gerekçe bul.',
        choices: ['Benim en sevdiğim renk ne?', '2/A ve 2/B’de en çok hangi meyve seviliyor?', 'Sınıfımızda kediyi mi köpeği mi seven daha çok?', 'Okula servisle mi yürüyerek mi gelen daha çok?'],
        answer: 0,
        reasons: ['Cevabı tek bir kişiden gelen, veri toplamayı gerektirmeyen tek soru.', 'İki farklı sınıftan veri toplamayı gerektiren tek soru.', 'Hayvanlarla ilgili tek soru.', 'Cevabı havaya ya da güne göre değişebilecek, ulaşımla ilgili tek soru.'],
      },
    ],
  },
]

/** Tema notları: öğretmen ve veliler için “büyük fikirler” (Van de Walle) */
export const grade2Notes: ThemeNotes = {
  'nesnelerin-geometrisi-1': {
    bigIdeas: [
      'Cisimler ve şekiller özellikleriyle tanınır: yüzleri, köşeleri, kenarları, yuvarlanıp yuvarlanmadığı. Ad ezberinden çok “Neden bu cisim?” sorusu önemlidir.',
      'Büyük yapılar küçük cisim ve şekillerin birleşmesiyle oluşur; bir yapıyı parçalarına ayırmak ve yeniden birleştirmek uzamsal düşünmeyi geliştirir.',
      'Bir şeklin yönü, yeri ya da büyüklüğü değişse de özellikleri değişmez: döndürülmüş kare yine karedir, yan yatan kutu yine silindirdir.',
      'Ölçme, bir birimi tekrar tekrar kullanmaktır. Ölçme aracı küçüldükçe sayı büyür; ama sıvının kendisi değişmez.',
    ],
  },
  'sayilar-ve-nicelikler-1': {
    bigIdeas: [
      '10 birlik 1 onluk eder: iki basamaklı sayılar onluk ve birlik gruplarından oluşur. 52, 5 onluk 2 birlik olduğu kadar 4 onluk 12 birliktir de.',
      'Her sayının sayı doğrusunda bir yeri vardır; en yakın onluk ve 10’ar, 5’er atlamalar sayıları karşılaştırmayı ve tahmin etmeyi kolaylaştırır.',
      'Ritmik sayma ve örüntüler bir kuralın tekrarıdır; kuralı söze dökmek ve örneklerle sınamak cebirsel düşünmenin başlangıcıdır.',
      'Tahmin bir stratejidir: 10’luk bir grubu referans almak, saymadan “yaklaşık kaç?” sorusunu cevaplamayı sağlar.',
    ],
  },
  'islemlerden-cebirsel-dusunmeye': {
    bigIdeas: [
      'Toplama ve çıkarma problemleri birleştirme, ayırma, parça-parça-bütün ve karşılaştırma yapılarındadır. Hangi işlemin gerektiğini “anahtar kelime” değil, şerit modeli gösterir.',
      'Toplama ve çıkarma birbirinin tersidir: 13 − 8’i bulmak için “8’e kaç eklersem 13 olur?” diye düşünebiliriz.',
      'Zihinden işlemde stratejiler (10’a tamamlama, ikizler, onlukla sayma, telafi) ezberden güçlüdür ve sonuç tahminle kontrol edilir.',
      'Çarpma eşit grupların tekrarlı toplamıdır, bölme eşit paylaştırma ya da ardışık çıkarmadır. “=” işareti “cevabı yaz” değil, “iki taraf aynı değerde” demektir.',
    ],
  },
  'sayilar-ve-nicelikler-2': {
    bigIdeas: [
      'Yarım ve çeyrek, bir bütünün EŞ parçalarıdır: 2 çeyrek 1 yarım eder; 4 çeyrek ya da 2 yarım 1 bütün eder.',
      'Paranın değeri tane sayısına değil cinsine bağlıdır: 4 tane 25 kuruş 1 TL eder, 9 tane 10 kuruş ise 1 TL bile etmez.',
      'Zaman parça-bütün ilişkileriyle ölçülür: 1 saat 60 dakikadır; yarım saat 30, çeyrek saat 15 dakikadır.',
      'Standart birimler (m, cm, kg, g) herkesin aynı sonucu bulmasını sağlar. Ölçmeden önce, bilinen referanslarla (1 metrelik çubuk, 1 kg’lık paket) tahmin edilir.',
    ],
  },
  'nesnelerin-geometrisi-2': {
    bigIdeas: [
      'Hedefe ulaşmak için önce bir ölçüt seçilir (en kısa, en güvenli, uğranacak yer); ölçüt değişirse en iyi yol da değişir.',
      'Yol tarifi yön ve mesafe bilgilerinin sıralı bir dizisidir; okları kullanmak kodlamaya hazırlıktır.',
      'Bir şekil bir çizgi boyunca katlandığında iki yarısı tam üst üste geliyorsa simetriktir; simetri doğada, harflerde ve desenlerde karşımıza çıkar.',
    ],
  },
  'veriye-dayali-arastirma': {
    bigIdeas: [
      'Veri, merak ettiğimiz bir soruyu cevaplamak için toplanır; iyi bir araştırma sorusunun cevabı kişiden kişiye değişir.',
      'Çetele, sıklık tablosu ve şekil grafiği aynı verinin farklı temsilleridir; şekil grafiğinde her şekil bir veriyi gösterir.',
      'Sonuçlar, verinin toplandığı gruba ve zamana bağlıdır: başka sınıfta ya da başka gün farklı çıkabilir. Kararlar veriye dayanarak verilir.',
    ],
  },
}
