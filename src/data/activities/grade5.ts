import type { Activity, ThemeNotes, Visual } from '../types'

// ───────────────────────────────────────────────────────────────────────────
// Çizim yardımcıları (elle yazılmış, basit ve geometrik olarak doğru SVG'ler)
// ───────────────────────────────────────────────────────────────────────────
const INK = '#1f2340'
const BLUE = '#6366f1'
const SOFT = '#e0e7ff'
const r1 = (n: number) => String(Math.round(n * 10) / 10)
const rad = (d: number) => (d * Math.PI) / 180

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
const IKI_NOKTA = svg(200, 80, pt(60, 45, 'A', 60, 29) + pt(140, 45, 'B', 140, 29))
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
// O merkezli çember ve iki yarıçap: [OA] ve [OB]
const CEMBER_OAB = svg(
  200,
  130,
  `<circle cx="100" cy="65" r="52" fill="none" stroke="${BLUE}" stroke-width="3"/>` +
    ln(100, 65, 152, 65) + ln(100, 65, 100 - 52 * Math.cos(rad(60)), 65 - 52 * Math.sin(rad(60))) +
    pt(100, 65, 'O', 100, 84) + pt(152, 65, 'A', 166, 60) + pt(100 - 52 * Math.cos(rad(60)), 65 - 52 * Math.sin(rad(60)), 'B', 62, 18) + txt(128, 58, '3 cm', 12),
)
const DIKME = svg(
  200,
  125,
  fullLine(10, 100, 190, 100) + ln(100, 25, 100, 100) + `<path d="M100,88 L112,88 L112,100" fill="none" stroke="${INK}" stroke-width="2"/>` +
    pt(100, 25, 'A', 114, 30) + pt(100, 100, 'H', 92, 118) + txt(182, 90, 'd', 15),
)
const PARALEL = svg(200, 125, fullLine(10, 38, 190, 38) + fullLine(10, 92, 190, 92) + txt(182, 28, 'd', 15) + txt(182, 82, 'k', 15))
// Paralel iki doğru ve d üzerindeki A, B noktalarından k'ye dikmeler
const PARALEL_DIKMELER = svg(
  200,
  125,
  fullLine(10, 38, 190, 38) + fullLine(10, 92, 190, 92) + txt(182, 28, 'd', 15) + txt(182, 112, 'k', 15) +
    ln(55, 38, 55, 92, '#ef4444', 2.5, '5 4') + ln(145, 38, 145, 92, '#ef4444', 2.5, '5 4') +
    `<path d="M55,82 L65,82 L65,92 M145,82 L155,82 L155,92" fill="none" stroke="${INK}" stroke-width="1.8"/>` +
    pt(55, 38, 'A', 55, 24) + pt(145, 38, 'B', 145, 24),
)
// Paralel iki doğru ve bunları kesen m doğrusu
const KESEN = svg(
  200,
  130,
  fullLine(10, 40, 190, 40) + fullLine(10, 95, 190, 95) + fullLine(55, 124, 145, 8) + txt(184, 30, 'd', 15) + txt(184, 85, 'k', 15) + txt(156, 20, 'm', 15, '#ef4444'),
)
// 50°'lik açıyla kesişen iki doğru (kesişim noktası 100,65)
const KX = 75 * Math.cos(0.8727), KY = 75 * Math.sin(0.8727)
const KESISEN = svg(200, 130, fullLine(10, 65, 190, 65) + fullLine(100 - KX, 65 + KY, 100 + KX, 65 - KY) + txt(182, 58, 'd', 15) + txt(160, 22, 'k', 15))
const DIK_KESISEN = svg(
  200,
  130,
  fullLine(10, 65, 190, 65) + fullLine(100, 6, 100, 124) + `<path d="M100,53 L112,53 L112,65" fill="none" stroke="${INK}" stroke-width="2"/>` + txt(182, 58, 'd', 15) + txt(115, 18, 'k', 15),
)
// a = c = 50°, b = d = 130°
const KESISEN_ABCD = svg(
  200,
  130,
  fullLine(10, 65, 190, 65) + fullLine(100 - KX, 65 + KY, 100 + KX, 65 - KY) +
    txt(128, 58, 'a', 16, BLUE) + txt(86, 44, 'b', 16, BLUE) + txt(72, 84, 'c', 16, BLUE) + txt(114, 98, 'd', 16, BLUE),
)
/** Aynı noktada kesişen üç doğru (yönler 0°, 50°, 115°): 50°, 65°, 65°, 50°, 65°, 65° → 6 dar açı. a'nın ters açısı d'dir. */
const UC_KESISEN = (() => {
  const cx = 100, cy = 70, L = 66
  let body = ''
  for (const d of [0, 50, 115]) {
    const dx = L * Math.cos(rad(d)), dy = L * Math.sin(rad(d))
    body += fullLine(cx - dx, cy + dy, cx + dx, cy - dy)
  }
  const labs = ['a', 'b', 'c', 'd', 'e', 'f']
  ;[25, 82.5, 147.5, 205, 262.5, 327.5].forEach((m, i) => {
    body += txt(cx + 34 * Math.cos(rad(m)), cy - 34 * Math.sin(rad(m)) + 5, labs[i], 15, BLUE)
  })
  return svg(200, 140, body)
})()
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
/** Birim açıların yinelenmesi: ortak köşeden art arda `count` tane `unit` derecelik dilim */
const unitAngles = (unit: number, count: number): Visual => {
  const total = unit * count
  const R = 92, cx = 112
  const cy = total > 180 ? 112 : 104
  let body = ''
  for (let i = 0; i < count; i++) {
    const a1 = rad(i * unit), a2 = rad((i + 1) * unit)
    body +=
      `<path d="M${cx},${cy} L${r1(cx + R * Math.cos(a1))},${r1(cy - R * Math.sin(a1))} A${R},${R} 0 0,0 ${r1(cx + R * Math.cos(a2))},${r1(cy - R * Math.sin(a2))} Z" ` +
      `fill="${i % 2 ? '#c7d2fe' : '#fde68a'}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`
  }
  body += `<circle cx="${cx}" cy="${cy}" r="4" fill="${INK}"/>`
  return total > 180 ? svg(224, 224, body) : svg(224, 114, body)
}
/** Kolları farklı uzunlukta iki açı yan yana: A (degA, kol uzunluğu armA) ve B (degB, armB) */
const twoAngles = (degA: number, armA: number, degB: number, armB: number): Visual => {
  const one = (x0: number, deg: number, arm: number, label: string) => {
    const y0 = 118
    const ex = x0 + arm * Math.cos(rad(deg)), ey = y0 - arm * Math.sin(rad(deg))
    return ln(x0, y0, x0 + arm, y0) + ln(x0, y0, ex, ey) +
      `<path d="M${r1(x0 + 22)},${y0} A22,22 0 0,0 ${r1(x0 + 22 * Math.cos(rad(deg)))},${r1(y0 - 22 * Math.sin(rad(deg)))}" fill="none" stroke="${BLUE}" stroke-width="3"/>` +
      txt(x0 + 10, y0 + 18, label, 15)
  }
  return svg(300, 140, one(16, degA, armA, 'A') + one(180, degB, armB, 'B'))
}
/** Daire grafiği: dilimler saat yönünde, tepeden başlar */
const pie = (data: { label: string; value: number; color: string }[]): Visual => {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 66, c = 74
  let a = -90, body = ''
  for (const d of data) {
    const sweep = (d.value / total) * 360
    const a2 = a + sweep
    const x1 = c + R * Math.cos(rad(a)), y1 = c + R * Math.sin(rad(a))
    const x2 = c + R * Math.cos(rad(a2)), y2 = c + R * Math.sin(rad(a2))
    body += `<path d="M${c},${c} L${r1(x1)},${r1(y1)} A${R},${R} 0 ${sweep > 180 ? 1 : 0},1 ${r1(x2)},${r1(y2)} Z" fill="${d.color}" stroke="#fff" stroke-width="2"/>`
    const m = a + sweep / 2
    body += txt(c + R * 0.58 * Math.cos(rad(m)), c + R * 0.58 * Math.sin(rad(m)) + 4, d.label, 11, '#fff')
    a = a2
  }
  return svg(148, 148, body)
}
/** Dikdörtgeni iki renkli parçaya ayıran birim kareli model: w × h, ilk `split` sütun bir renk */
const splitArea = (w: number, h: number, split: number): Visual => {
  const u = Math.min(22, 240 / w)
  let body = ''
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      body += `<rect x="${r1(26 + x * u)}" y="${r1(8 + y * u)}" width="${r1(u)}" height="${r1(u)}" fill="${x < split ? '#c7d2fe' : '#fde68a'}" stroke="${INK}" stroke-width="1"/>`
  body += txt(26 + (split * u) / 2, 26 + h * u, String(split), 13) + txt(26 + split * u + ((w - split) * u) / 2, 26 + h * u, String(w - split), 13) + txt(14, 12 + (h * u) / 2, String(h), 13)
  return svg(40 + w * u, 34 + h * u, body)
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
/** Nokta örüntüsü: k. adımda 2 sıra × k sütun mavi nokta + 1 turuncu nokta (2k + 1) */
const dotStep = (k: number, x0: number) => {
  let out = ''
  for (let j = 0; j < k; j++) out += `<circle cx="${x0 + j * 14}" cy="16" r="5" fill="${BLUE}"/><circle cx="${x0 + j * 14}" cy="32" r="5" fill="${BLUE}"/>`
  out += `<circle cx="${x0 + k * 14}" cy="24" r="5" fill="#f97316"/>`
  return out + txt(x0 + (k * 14) / 2, 56, `${k}. adım`, 11)
}
const NOKTA_ORUNTU = svg(230, 64, dotStep(1, 14) + dotStep(2, 62) + dotStep(3, 124))
// Daire grafiği: yarım + çeyrek + çeyrek
const DAIRE_GRAFIGI = pie([
  { label: 'Yürüyerek', value: 2, color: '#6366f1' },
  { label: 'Servis', value: 1, color: '#f59e0b' },
  { label: 'Özel araç', value: 1, color: '#10b981' },
])
// Toplamı %100'ü aşan, hatalı daire grafiği
const HATALI_DAIRE = pie([
  { label: '%50', value: 50, color: '#6366f1' },
  { label: '%40', value: 40, color: '#f59e0b' },
  { label: '%30', value: 30, color: '#10b981' },
])
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
const AKIS_KG = flow([['o', 'Başla'], ['p', '700 g’ın fiyatını gir'], ['r', 'Fiyatı 7’ye böl'], ['r', 'Sonucu 10 ile çarp'], ['p', '1 kg’ın fiyatını yazdır'], ['o', 'Bitir']])
const SEKIL_OVAL = svg(160, 50, `<ellipse cx="80" cy="25" rx="62" ry="18" fill="#fde68a" stroke="${INK}" stroke-width="2"/>` + txt(80, 30, 'Başla', 13))
const SEKIL_PARALEL = svg(160, 50, `<polygon points="30,7 150,7 130,43 10,43" fill="#bae6fd" stroke="${INK}" stroke-width="2"/>` + txt(80, 30, 'Sayıyı gir', 13))
const SEKIL_DIKDORTGEN = svg(160, 50, `<rect x="15" y="7" width="130" height="36" rx="3" fill="#ddd6fe" stroke="${INK}" stroke-width="2"/>` + txt(80, 30, 'Sayıyı 2 ile çarp', 12))
const SEKIL_KARAR = svg(160, 56, `<polygon points="80,3 150,28 80,53 10,28" fill="#bbf7d0" stroke="${INK}" stroke-width="2"/>` + txt(80, 33, 'Sayı > 10 mu?', 12))
const SEKIL_OK = svg(160, 50, ln(20, 25, 128, 25, INK, 3) + head(20, 25, 140, 25))
// Çokgen olmayan şekiller
const ACIK_SEKIL = svg(120, 120, `<polyline points="22,98 32,28 92,18 102,88 55,104" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`)
const KEMER = svg(120, 120, `<path d="M20,104 L20,58 A40,40 0 0,1 100,58 L100,104 Z" fill="#fde68a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`)

/** Yüzlük kart: ilk n kare boyalı */
const hundred = (n: number): Visual => ({ kind: 'grid', cols: 10, rows: 10, cells: Array.from({ length: n }, (_, i) => `${i % 10},${Math.floor(i / 10)}`), color: '#6366f1' })
const area = (w: number, h: number, showGrid = true, labels = false): Visual => ({ kind: 'area', w, h, showGrid, labels })

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
const RENK_TABLOSU: Visual = { kind: 'table', headers: ['En sevilen renk', 'Sıklık'], rows: [['Mavi', 12], ['Kırmızı', 8], ['Yeşil', 6], ['Sarı', 4]] }

const HF = ['Her zaman doğru', 'Bazen doğru', 'Asla doğru değil'] as const
const HBA = [
  { id: 'her', label: HF[0], color: '#22c55e' },
  { id: 'bazen', label: HF[1], color: '#f59e0b' },
  { id: 'asla', label: HF[2], color: '#ef4444' },
]
const OLASILIK = ['İmkânsız (0)', 'Az olası', 'Eşit olası ([[1/2]])', 'Çok olası', 'Kesin (1)']

/** 5. SINIF ETKİNLİKLERİ (Van de Walle: Başlarken → Keşfet → Düşün ve Paylaş; somut → model → sembol → problem) */
export const grade5: Activity[] = [
  // ── Geometrik Şekiller ─────────────────────────────────────────────────

  // MAT.5.3.1
  {
    id: 'g5-temel-geometrik-cizimler',
    outcomes: ['MAT.5.3.1'],
    type: 'match',
    stage: 'model',
    title: 'Çizim ve adı',
    instructions: 'Her çizimi adı ve özelliğiyle eşleştir. Uç noktalara ve oklara dikkat et.',
    level: 1,
    launch: { text: 'Uçak takip haritasında uçağın konumu bir noktayla, rotası çizgiyle gösterilir. Bazı çizgilerin ucunda ok var, bazılarında yok. Ok ne anlatıyor olabilir?', visual: ISIN },
    reflect: 'Işın ile doğru parçasının farkını, hiç ok çizmeden bir arkadaşına nasıl anlatırsın?',
    pairs: [
      { left: { visual: NOKTA }, right: 'Nokta: bir konumu gösterir' },
      { left: { visual: DOGRU }, right: 'Doğru: iki yönde sınırsız uzar' },
      { left: { visual: DOGRU_PARCASI }, right: 'Doğru parçası: iki uç noktası var' },
      { left: { visual: ISIN }, right: 'Işın: bir başlangıç noktası var' },
      { left: { visual: ACI }, right: 'Açı: başlangıç noktası ortak iki ışın' },
      { left: { visual: CEMBER }, right: 'Çember: merkeze eşit uzaklıktaki noktalar' },
      { left: { visual: DIKME }, right: 'Dikme: doğruyla dik açı yapan doğru parçası' },
      { left: { visual: PARALEL }, right: 'Paralel doğrular: hiç kesişmez' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-geometri-gosterimleri',
    outcomes: ['MAT.5.3.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Sembolden söze',
    instructions: 'Her gösterimi sözlü anlamıyla eşleştir.',
    level: 2,
    launch: { text: 'Matematikçiler uzun cümleler yerine kısa semboller kullanır. “[AB]” ile “[AB” arasındaki tek fark bir köşeli parantez. Bu küçük fark ne anlatıyor olabilir?' },
    reflect: 'Neden bir doğrunun ya da ışının uzunluğunu |AB| gibi yazamayız? Bir arkadaşına açıkla.',
    pairs: [
      { left: '[AB]', right: 'A ve B uç noktalı doğru parçası' },
      { left: '[AB', right: 'A’dan başlayıp B yönünde uzayan ışın' },
      { left: '|AB|', right: '[AB] doğru parçasının uzunluğu' },
      { left: 'd ⊥ k', right: 'd ile k doğruları birbirine diktir' },
      { left: 'd // k', right: 'd ile k doğruları birbirine paraleldir' },
      { left: 'm(ABC)', right: 'ABC açısının ölçüsü' },
      { left: 'r', right: 'Çemberin yarıçap uzunluğu' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-cizim-araclari',
    outcomes: ['MAT.5.3.1'],
    type: 'categorize',
    stage: 'problem',
    title: 'Hangi araçla çizerim?',
    instructions: 'Her işi yapmak için en uygun aracın grubuna sürükle.',
    level: 1,
    launch: { text: 'Bir mimar yeni bir parkın planını çiziyor: düz yollar, yuvarlak bir havuz ve köşesi tam dik olan bir oyun alanı. Her biri için çantasından hangi aracı çıkarmalı?' },
    reflect: 'Pergelin olmasaydı bir çemberi ip ve kalemle nasıl çizerdin? Bu yöntem neden işe yarar?',
    categories: [
      { id: 'cetvel', label: 'Ölçüsüz cetvel (çizgeç)', color: '#3b82f6' },
      { id: 'pergel', label: 'Pergel', color: '#f97316' },
      { id: 'gonye', label: 'Gönye', color: '#22c55e' },
      { id: 'aciolcer', label: 'Açıölçer', color: '#a855f7' },
    ],
    items: [
      { content: 'Haritada iki şehri birleştiren düz yolu çizmek', category: 'cetvel', explain: 'İki noktayı birleştiren doğru parçasını ölçüsüz cetvelle çizeriz.' },
      { content: 'Bir noktadan başlayıp sınırsız uzayan ışını çizmek', category: 'cetvel' },
      { content: 'Yuvarlak bir havuzun kenarını çizmek', category: 'pergel', explain: 'Havuzun kenarındaki tüm noktalar merkeze eşit uzaklıkta: bu bir çember. Pergel bu uzaklığı sabit tutar.' },
      { content: 'Ölçmeden, aynı uzunlukta iki çizgi kesmek', category: 'pergel', explain: 'Pergelin açıklığını değiştirmeden aynı uzunluğu tekrar tekrar taşıyabilirsin.' },
      { content: 'Oyun alanına tam dik bir köşe çizmek', category: 'gonye' },
      { content: 'Bir doğruya dışındaki bir noktadan dikme çizmek', category: 'gonye', explain: 'Gönyenin hazır dik köşesi dikme çizmeyi kolaylaştırır.' },
      { content: 'Tren rayı gibi birbirine paralel iki çizgi çizmek', category: 'gonye', explain: 'Gönyeyle bir doğruya eşit uzaklıkta iki nokta işaretleyip birleştiririz.' },
      { content: 'Bir rampanın yerle yaptığı açının kaç derece olduğunu bulmak', category: 'aciolcer' },
      { content: 'Tam 75°’lik bir açı çizmek', category: 'aciolcer', explain: 'Belirli bir derecede açı çizmek için açıölçerin derece çizgileri gerekir.' },
    ],
  },
  {
    id: 'g5-cizimler-hangisi-farkli',
    outcomes: ['MAT.5.3.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Çizimler ve araçlar',
    instructions: 'Hangisi diğerlerinden farklı? İstediğini seç ve gerekçeni düşün. Birden çok doğru cevap var!',
    level: 2,
    launch: { text: 'Elif dört çizime bakıp “Bunlardan biri diğerlerine benzemiyor.” dedi. Kerem başka bir çizimi seçti. İkisi birden haklı olabilir mi?' },
    reflect: 'Senin gerekçen ile arkadaşınınki farklıysa ikisi birden doğru olabilir mi? Bir örnek ver.',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: DOGRU }, { visual: ISIN }, { visual: DOGRU_PARCASI }, { visual: CEMBER }],
        answer: 0,
        reasons: [
          'Hiç uç noktası olmayan tek çizim: iki yönde de sınırsız uzar.',
          'Yalnızca bir uç noktası (başlangıç noktası) olan tek çizim.',
          'İki uç noktası olan tek çizim; uzunluğu cetvelle ölçülebilir.',
          'Düz değil, eğri olan tek çizim; kapalıdır ve bir merkezi vardır.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Pergel', 'Gönye', 'Açıölçer', 'Ölçüsüz cetvel'],
        answer: 0,
        reasons: [
          'Eğri bir çizgi (çember) çizebilen tek araç.',
          'Üzerinde hazır bir dik köşe bulunan tek araç.',
          'Açıları derece cinsinden ölçebilen tek araç.',
          'Hiçbir uzunluk ya da açı bilgisi taşımayan, yalnızca düz çizgi çizen tek araç.',
        ],
      },
    ],
  },

  // MAT.5.3.2
  {
    id: 'g5-cizim-deneyimleri',
    outcomes: ['MAT.5.3.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Çizimlerden ne öğrendik?',
    instructions: 'Çizime bak, çizdiğini hayal et ve cevabı seç.',
    level: 1,
    launch: { text: 'Tren rayları kilometrelerce birbirine hiç yaklaşmadan ilerler. Raylar arasındaki uzaklık her yerde aynı mıdır? Bu neden önemlidir?', visual: PARALEL },
    reflect: 'Bugün fark ettiğin bir özelliği (örneğin “bir doğruya dışındaki bir noktadan tek dikme çizilir”) bir çizimle arkadaşına göster.',
    questions: [
      {
        prompt: { text: 'A ve B noktalarından birlikte geçen kaç farklı doğru çizebilirsin?', visual: IKI_NOKTA },
        choices: ['Yalnız 1', '2', 'Sonsuz çoklukta', 'Hiç'],
        answer: 0,
        feedback: [null, 'İki noktayı cetvelle birleştir, sonra farklı bir doğru dene. İkinci doğru noktalardan birini mutlaka kaçırır.', 'Tek bir noktadan sonsuz çoklukta doğru geçer; ama iki noktanın ikisinden birden geçen doğru yalnız bir tanedir.', 'İki nokta her zaman cetvelle birleştirilebilir.'],
      },
      {
        prompt: { text: 'A noktasından kaç doğru geçer?', visual: NOKTA },
        choices: ['Yalnız 1', '2', 'Sonsuz çoklukta', 'Hiç'],
        answer: 2,
        feedback: ['Cetveli noktanın etrafında döndür: her konumda yeni bir doğru çizebilirsin.', 'Cetveli biraz daha döndürmeyi dene; durmak zorunda mısın?', null, 'Noktadan geçen bir doğru çizmeyi dene; çizebiliyor musun?'],
      },
      {
        prompt: { text: 'O merkezli çemberde |OA| = 3 cm. |OB| kaç santimetredir?', visual: CEMBER_OAB },
        choices: ['3 cm', '6 cm', '1,5 cm', 'Bilinemez'],
        answer: 0,
        feedback: [null, '6 cm çapın uzunluğu olurdu. [OB] ise merkezden çembere giden bir yarıçap.', 'Yarıçaplar eşit uzunluktadır; neden yarıya insin?', 'B de çemberin üzerinde. Çemberin üzerindeki her nokta merkeze aynı uzaklıktadır.'],
      },
      {
        prompt: { text: 'd doğrusuna dışındaki A noktasından kaç dikme çizilebilir?', visual: DIKME },
        choices: ['Yalnız 1', '2', 'Sonsuz çoklukta'],
        answer: 0,
        feedback: [null, 'İkinci bir dikme çizmeyi dene: d ile dik açı yapmadığını göreceksin.', 'A’dan d’ye sonsuz çoklukta doğru parçası çizilebilir ama yalnızca biri dik açı yapar.'],
      },
      {
        prompt: { text: 'd ve k paralel doğrular. d üzerindeki A ve B noktalarından k’ye çizilen dikmeler için ne söylenebilir?', visual: PARALEL_DIKMELER },
        choices: ['Uzunlukları eşittir.', 'A’dan çizilen daha uzundur.', 'B’den çizilen daha uzundur.'],
        answer: 0,
        feedback: [null, 'Paralel iki doğru arasındaki uzaklık her yerde aynıdır; dikmeler bu uzaklığı gösterir.', 'Paralel iki doğru arasındaki uzaklık her yerde aynıdır; dikmeler bu uzaklığı gösterir.'],
      },
      {
        prompt: 'Pergelin açıklığını değiştirmeden iki çember çizdin. Hangisi kesinlikle doğrudur?',
        choices: ['Yarıçapları eşittir.', 'Merkezleri aynıdır.', 'Birbirlerini keserler.', 'Biri diğerinin içindedir.'],
        answer: 0,
        feedback: [null, 'Merkez, pergelin sivri ucunu nereye koyduğuna bağlıdır.', 'Merkezler birbirinden çok uzaksa çemberler kesişmez.', 'Merkezlerin yeri değişirse çemberler yan yana da durabilir.'],
      },
    ],
  },
  {
    id: 'g5-insa-adimlari',
    outcomes: ['MAT.5.3.2'],
    type: 'sort',
    stage: 'sembol',
    title: 'İnşa adımları',
    instructions: 'Pergel, gönye ve ölçüsüz cetvelle yapılan inşaların adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Bir halı desenindeki çizgilerin hepsi aynı uzunlukta. Desenci cetvelle ölçmeden bunu nasıl başarmış olabilir?' },
    reflect: 'Cetvelle ölçmek yerine pergelle uzunluk taşımanın ne avantajı var?',
    rounds: [
      {
        prompt: 'Bir ışın üzerinde art arda eşit uzunlukta iki doğru parçası kes.',
        items: [
          'Ölçüsüz cetvelle A başlangıç noktalı bir ışın çiz.',
          'Pergeli verilen doğru parçasının uzunluğu kadar aç.',
          'Sivri ucu A’ya koy, ışını kesen bir yay çiz; kesişim noktasına B de.',
          'Açıklığı bozmadan sivri ucu B’ye koy, yeni bir yay çiz; kesişim noktasına C de.',
          '|AB| = |BC| olduğunu fark et: ikisi de pergel açıklığı kadardır.',
        ],
        hints: ['İlk önce üzerinde çalışacağın çizgi gerekir. Hangisi?', 'Pergeli hangi adımda ayarlamalısın: yay çizmeden önce mi, sonra mı?'],
      },
      {
        prompt: 'Gönyeyle d doğrusuna paralel bir doğru çiz.',
        items: [
          'Bir d doğrusu çiz.',
          'Gönyeyi d’ye dik tutup d’den 3 cm uzakta bir nokta işaretle.',
          'Gönyeyi kaydır; d’nin başka bir yerinden yine 3 cm uzakta ikinci noktayı işaretle.',
          'İşaretlediğin iki noktadan geçen doğruyu çiz.',
          'Yeni doğrunun d’ye her yerde eşit uzaklıkta, yani paralel olduğunu kontrol et.',
        ],
      },
      {
        prompt: 'Bir açının kollarından eşit uzunlukta doğru parçaları kes.',
        items: [
          'Köşesi O olan bir açı çiz.',
          'Pergeli istediğin kadar aç ve sivri ucunu O’ya koy.',
          'Açının iki kolunu da kesen bir yay çiz.',
          'Kesişim noktalarına A ve B de: |OA| = |OB| olur.',
        ],
        explain: 'Yay, O merkezli bir çemberin parçasıdır; A ve B bu çemberin üzerinde olduğu için O’ya eşit uzaklıktadır.',
      },
    ],
  },
  {
    id: 'g5-cizim-her-zaman-bazen-asla',
    outcomes: ['MAT.5.3.2'],
    type: 'categorize',
    stage: 'problem',
    title: 'Her zaman mı, bazen mi, asla mı?',
    instructions: 'Her önermeyi düşün: her zaman mı doğru, bazen mi, yoksa asla mı? Emin değilsen çizerek dene.',
    level: 2,
    launch: { text: 'Kerem: “İki doğru her zaman kesişir.” dedi. Ayşe: “Bazen kesişir.” dedi. Kim haklı? Bir önermenin her zaman mı, bazen mi doğru olduğunu nasıl anlarız?' },
    reflect: '“Bazen doğru” dediğin bir önerme için hem doğru olduğu hem de yanlış olduğu birer örnek çiz.',
    categories: HBA,
    items: [
      { content: 'İki farklı noktadan yalnız bir doğru geçer.', category: 'her' },
      { content: 'Bir noktadan yalnız bir doğru geçer.', category: 'asla', explain: 'Bir noktadan sonsuz çoklukta doğru geçer; cetveli noktanın etrafında döndürmeyi düşün.' },
      { content: 'Çemberin merkezini çember üzerindeki noktalara birleştiren doğru parçaları eşit uzunluktadır.', category: 'her' },
      { content: 'Bir doğruya dışındaki bir noktadan iki farklı dikme çizilebilir.', category: 'asla', explain: 'Bir noktadan bir doğruya yalnız bir dikme çizilebilir.' },
      { content: 'Bir doğruya dışındaki iki farklı noktadan çizilen dikmeler eşit uzunluktadır.', category: 'bazen', explain: 'Noktalar doğruya eşit uzaklıktaysa dikmeler eşittir, değilse farklıdır.' },
      { content: 'Paralel iki doğru arasındaki uzaklık her yerde aynıdır.', category: 'her' },
      { content: 'Bir ışının uzunluğu cetvelle ölçülebilir.', category: 'asla', explain: 'Işın bir yönde sınırsız uzar; ölçülebilen uzunluk yalnız doğru parçasına aittir.' },
      { content: 'İki çember birbirini keser.', category: 'bazen', explain: 'Merkezlerin birbirine uzaklığına göre çemberler kesişebilir ya da kesişmeyebilir.' },
      { content: 'Pergel açıklığı değiştirilmeden çizilen çemberlerin yarıçapları eşittir.', category: 'her' },
    ],
  },

  // MAT.5.3.3
  {
    id: 'g5-aci-olustur',
    outcomes: ['MAT.5.3.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Açıölçerle açı oluştur',
    instructions: 'Işını sürükleyerek istenen ölçüde açı oluştur. Önce tahmin et, sonra açıölçerin derece çizgileriyle kontrol et.',
    level: 1,
    launch: { text: 'Bir kapıyı biraz aralarsın, sonra ardına kadar açarsın. Kapının ne kadar döndüğünü nasıl ölçebiliriz?' },
    reflect: '145°’lik açıyı oluştururken açıölçerin hangi sırasındaki sayıları kullandın? Neden?',
    tool: 'angle',
    tasks: [
      { prompt: 'Bir dik açı oluştur.', target: { degrees: 90 }, explain: 'Dik açı 90°’dir: tam açının dörtte biri.' },
      { prompt: 'Ölçüsü 35° olan bir açı oluştur.', target: { degrees: 35 }, hints: ['35°, dik açıdan küçük mü olmalı, büyük mü?', 'Önce 30°’yi bul. 5° daha ilerlemek için kaç küçük çizgi geçmelisin?'] },
      { prompt: 'Ölçüsü 145° olan bir açı oluştur.', target: { degrees: 145 }, hints: ['145°, dik açıdan ne kadar büyük?', 'Doğru açıya (180°) ulaşmana kaç derece kalmalı?'] },
      { prompt: 'Bir doğru açı oluştur.', target: { degrees: 180 }, explain: 'Doğru açı 180°’dir: iki dik açı yan yana.' },
    ],
  },
  {
    id: 'g5-birim-acilarla-olc',
    outcomes: ['MAT.5.3.3'],
    type: 'fill',
    stage: 'model',
    title: 'Birim açıları say',
    instructions: 'Açıyı dolduran eş birim açıları say ve açının ölçüsünü bul.',
    level: 1,
    launch: { text: 'Bir pizzayı 8 eş dilime böldük. Her dilimin sivri ucundaki açı aynı. 3 dilimin açısı, 1 dilimin açısının kaç katıdır?', visual: unitAngles(45, 8) },
    reflect: 'Derece, tam açının 360 eş parçasından biridir. Açıları ölçmek için neden böyle küçük ve eş bir birim seçmişiz?',
    items: [
      { text: 'Açı __ tane 10°’lik birim açıdan oluşuyor. Ölçüsü: __°', answers: ['4', '40'], visual: unitAngles(10, 4), hints: ['Renkli dilimleri tek tek say.', 'Her dilim 10° ise 4 dilim kaç derece eder?'] },
      { text: 'Açı __ tane 15°’lik birim açıdan oluşuyor. Ölçüsü: __°', answers: ['6', '90'], visual: unitAngles(15, 6), explain: '6 × 15° = 90°: bu bir dik açı!' },
      { text: 'Her dilim 20°. Açının ölçüsü: __°', answers: ['120'], visual: unitAngles(20, 6), hints: ['Kaç dilim var?', '6 tane 20 kaç eder?'] },
      { text: 'Her dilim 30°. Açının ölçüsü: __°', answers: ['180'], visual: unitAngles(30, 6), explain: '6 × 30° = 180°: doğru açı.' },
      { text: 'Her dilim 45°. Açının ölçüsü: __°', answers: ['135'], visual: unitAngles(45, 3), hints: ['45° + 45° kaç eder? Bir dilim daha eklersen?'] },
      { text: 'Doğru açıyı (180°) 10°’lik birim açılarla doldurmak için __ birim açı gerekir.', answers: ['18'], hints: ['10, kaçla çarpılınca 180 eder?'] },
      { text: 'Tam açı (360°), 1°’lik __ eş birim açıdan oluşur.', answers: ['360'], explain: '1 derece, tam açının 360 eş parçasından biridir.' },
    ],
  },
  {
    id: 'g5-aci-olcme',
    outcomes: ['MAT.5.3.3'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Açıyı doğru ölç',
    instructions: 'Açı ölçmeyle ilgili soruları düşünerek cevapla.',
    level: 2,
    launch: { text: 'Ali uzun kollu bir açı, Ece kısa kollu bir açı çizdi. Ali “Benim açım daha büyük!” diyor. Sen ne dersin?', visual: twoAngles(40, 130, 70, 55) },
    reflect: 'Açının kollarını uzatırsak ölçüsü değişir mi? Neden?',
    questions: [
      {
        prompt: { text: 'Hangi açının ölçüsü daha büyüktür?', visual: twoAngles(40, 130, 70, 55) },
        choices: ['A açısı', 'B açısı', 'Eşittir'],
        answer: 1,
        feedback: ['A’nın kolları daha uzun ama kol uzunluğu açının ölçüsünü değiştirmez. Kolların arasındaki açıklığa bak.', null, 'Kolların arasındaki açıklığı karşılaştır: gerçekten aynı mı?'],
      },
      {
        prompt: 'Selin açıölçerin merkezini açının köşesine, sıfır çizgisini bir kola yerleştirdi. Diğer kol bir sırada 50, öbür sırada 130 çizgisinden geçiyor. Açı dar açı olduğuna göre ölçüsü kaçtır?',
        choices: ['50°', '130°', '180°', '80°'],
        answer: 0,
        feedback: [null, 'Bu açı dar açı; 130° dik açıdan büyük olurdu. Sıfırdan başlayan sırayı okumalısın.', '180° doğru açıdır; kol bu kadar açılmamış.', '130 − 50 hesaplamaya gerek yok; kolun durduğu yerdeki, sıfırdan başlayan sıranın sayısını oku.'],
      },
      {
        prompt: '1 derece (1°) neyi ifade eder?',
        choices: ['Tam açının 360 eş parçasından birini', 'Dik açının 10 eş parçasından birini', 'Doğru açının 100 eş parçasından birini', 'Açının kollarının 1 cm uzunluğunu'],
        answer: 0,
        feedback: [null, 'Dik açıda 90 tane 1° vardır, 10 değil.', 'Doğru açıda 180 tane 1° vardır.', 'Açının ölçüsü kolların uzunluğuyla değil, dönme miktarıyla ilgilidir.'],
      },
      {
        prompt: 'Doğru açı, tam açının ne kadarıdır?',
        choices: ['[[1/4]]', '[[1/2]]', '[[3/4]]', '[[1/3]]'],
        answer: 1,
        feedback: ['Tam açının dörtte biri dik açıdır (90°).', null, 'Tam açının dörtte üçü 270°’dir.', '360°’nin üçte biri 120°’dir; doğru açı ise 180°.'],
      },
      {
        prompt: 'Ölçüleri eşit olan açılara ne denir?',
        choices: ['Komşu açılar', 'Doğru açılar', 'Eş açılar', 'Tam açılar'],
        answer: 2,
        feedback: ['Komşu açıların köşesi ve bir kolu ortaktır; ölçüleri eşit olmak zorunda değildir.', 'Doğru açı, 180°’lik özel bir açıdır.', null, 'Tam açı, 360°’lik özel bir açıdır.'],
      },
      {
        prompt: { text: 'Bu açının ölçüsü yaklaşık kaç derecedir?', visual: { kind: 'angle', degrees: 135 } },
        choices: ['45°', '90°', '135°', '180°'],
        answer: 2,
        feedback: ['Açı dik açıdan küçük mü büyük mü? Önce bunu düşün.', 'Kolların arası bir dik açıdan daha fazla açılmış.', null, '180° olsaydı kollar tek bir doğru gibi dururdu.'],
      },
    ],
  },
  {
    id: 'g5-saat-acilari',
    outcomes: ['MAT.5.3.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Saatteki açılar',
    instructions: 'Saat kadranındaki birim açıyı kullanarak açıları bul.',
    level: 2,
    launch: { text: 'Yelkovan bir saatte kadranın etrafında tam bir tur atar. Tam tur 360° ise kadrandaki iki komşu sayı arasındaki açı kaç derece olur?', visual: { kind: 'clock', h: 3, m: 0 } },
    reflect: 'Saat 4.00’teki açıyı hiç ölçmeden nasıl bulursun? Kullandığın “birim açı” neydi?',
    questions: [
      {
        prompt: 'Saat kadranında iki komşu sayı arasındaki açı kaç derecedir?',
        choices: ['30°', '12°', '36°', '60°'],
        answer: 0,
        feedback: [null, 'Kadranda 12 sayı var ama tam açı 360°’dir. 360’ı 12 eş parçaya bölmelisin.', 'Kadranda 10 değil 12 aralık var.', 'Bu, iki aralığın toplamı.'],
      },
      {
        prompt: { text: 'Saat 3.00’te akrep ile yelkovan arasındaki küçük açı kaç derecedir?', visual: { kind: 'clock', h: 3, m: 0 } },
        choices: ['30°', '60°', '90°', '180°'],
        answer: 2,
        feedback: ['30° yalnızca bir aralıktır. 12’den 3’e kaç aralık var?', '60° iki aralık eder. Kaç aralık saydın?', null, '180° için akrep 6’yı göstermeliydi.'],
      },
      {
        prompt: { text: 'Saat 2.00’de akrep ile yelkovan arasındaki küçük açı kaç derecedir?', visual: { kind: 'clock', h: 2, m: 0 } },
        choices: ['20°', '60°', '120°', '30°'],
        answer: 1,
        feedback: ['Her aralık 10° değil, 30°’dir.', null, '120° dört aralık eder. 12’den 2’ye kaç aralık var?', '30° yalnızca bir aralık.'],
      },
      {
        prompt: { text: 'Saat 6.00’da akrep ile yelkovan nasıl bir açı oluşturur?', visual: { kind: 'clock', h: 6, m: 0 } },
        choices: ['Dik açı', 'Doğru açı', 'Tam açı', 'Dar açı'],
        answer: 1,
        feedback: ['Dik açı 3 aralıktır (90°); burada 6 aralık var.', null, 'Tam açı için yelkovanın tam bir tur dönmesi gerekir.', 'Dar açı dik açıdan küçüktür.'],
      },
      {
        prompt: 'Yelkovan 15 dakikada kaç derece döner?',
        choices: ['15°', '90°', '45°', '180°'],
        answer: 1,
        feedback: ['15 dakikada yelkovan 3 sayı ilerler; her aralık 30°.', null, 'Yelkovan 15 dakikada çeyrek tur döner. Tam tur 360° ise çeyreği?', 'Yarım tur 30 dakika sürer.'],
      },
      {
        prompt: 'Bir kapı ardına kadar açıldığında 120° dönüyor. Yarısı kadar açılırsa kaç derece döner?',
        choices: ['60°', '240°', '90°', '30°'],
        answer: 0,
        feedback: [null, 'Yarısı kadar açılırsa açı küçülür, büyümez.', '90° dik açıdır; 120°’nin yarısı değildir.', '30°, 120°’nin dörtte biridir.'],
      },
    ],
  },

  // MAT.5.3.4
  {
    id: 'g5-komsu-aci-olustur',
    outcomes: ['MAT.5.3.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Tümler, bütünler, ters açı oluştur',
    instructions: 'Işını sürükleyerek açıyı oluştur. Önce tahmin et, sonra derece çizgileriyle kontrol et.',
    level: 2,
    launch: { text: 'Makasın iki bıçağı kesiştiği yerde dört açı oluşturur. Makası biraz açınca bu açılar nasıl değişir?', visual: KESISEN_ABCD },
    reflect: 'Ters açıların neden her zaman eşit olduğunu komşu bütünler açıları kullanarak açıklayabilir misin?',
    tool: 'angle',
    tasks: [
      { prompt: 'Kesişen iki doğrunun oluşturduğu açılardan biri 50°. Bu açıyla komşu bütünler olan açıyı oluştur.', target: { degrees: 130 }, hints: ['Komşu bütünler açılar yan yana durur ve birlikte doğru açı oluşturur.', 'Doğru açı 180° ise 50°’ye kaç derece eklenmeli?'] },
      { prompt: 'Ölçüsü 70° olan açının tümleri olan açıyı oluştur.', target: { degrees: 20 }, hints: ['Tümler açıların ölçüleri toplamı kaç derecedir?', '70°’den 90°’ye kaç derece var?'] },
      { prompt: 'Kesişen iki doğrunun oluşturduğu açılardan biri 40°. Bu açının ters açısını oluştur.', target: { degrees: 40 }, hints: ['Ters açılar kesişim noktasının iki yanında karşılıklı durur.', 'Makası düşün: karşılıklı açılar birlikte açılıp kapanır.'], explain: 'Ters açıların ölçüleri eşittir.' },
      { prompt: 'Ölçüsü 115° olan açının bütünleri olan açıyı oluştur.', target: { degrees: 65 }, hints: ['Bütünler iki açı birlikte kaç derece eder?'] },
    ],
  },
  {
    id: 'g5-paralel-dik-kesisen',
    outcomes: ['MAT.5.3.4'],
    type: 'quiz',
    stage: 'model',
    title: 'Doğrular nasıl duruyor?',
    instructions: 'Şekildeki doğruların birbirine göre durumunu ve oluşan açıları incele.',
    level: 1,
    launch: { text: 'Bir şehir haritasında bazı caddeler hiç kesişmeden uzanıyor, bazıları kavşaklarda dik kesişiyor, bazıları eğik kesişiyor. Haritada kaç farklı durum görebilirsin?' },
    reflect: 'Paralel doğruların neden hiç açı oluşturmadığını bir arkadaşına anlat.',
    questions: [
      {
        prompt: { text: 'd ve k doğruları birbirine göre nasıldır?', visual: PARALEL },
        choices: ['Paralel doğrular', 'Dik kesişen doğrular', 'Kesişen (dik olmayan) doğrular', 'Çakışık doğrular'],
        answer: 0,
        feedback: [null, 'Kesişim noktası var mı? Doğruları uzatmayı düşün.', 'Bu doğruların hiç ortak noktası yok.', 'Çakışık doğruların bütün noktaları ortaktır; burada iki ayrı doğru görüyorsun.'],
      },
      {
        prompt: { text: 'd ve k doğruları birbirine göre nasıldır?', visual: DIK_KESISEN },
        choices: ['Paralel doğrular', 'Dik kesişen doğrular', 'Kesişen (dik olmayan) doğrular', 'Çakışık doğrular'],
        answer: 1,
        feedback: ['Doğrular kesişiyor; paralel doğruların ortak noktası olmaz.', null, 'Köşedeki küçük kare dik açı işaretidir.', 'Çakışık doğrular üst üste biner.'],
      },
      {
        prompt: { text: 'd ve k doğruları birbirine göre nasıldır?', visual: KESISEN },
        choices: ['Paralel doğrular', 'Dik kesişen doğrular', 'Kesişen (dik olmayan) doğrular', 'Çakışık doğrular'],
        answer: 2,
        feedback: ['Doğrular bir noktada kesişiyor.', 'Oluşan açılar 90° değil: ikisi dar, ikisi geniş.', null, 'Çakışık doğrular üst üste biner.'],
      },
      {
        prompt: { text: 'd ve k paraleldir. İkisini de farklı noktalarda kesen m doğrusuna ne denir?', visual: KESEN },
        choices: ['Kesen', 'Dikme', 'Işın', 'Çap'],
        answer: 0,
        feedback: [null, 'Dikme, doğruyla dik açı yapmalıdır; m eğik duruyor.', 'm iki yönde de uzayan bir doğru.', 'Çap çembere ait bir doğru parçasıdır.'],
      },
      {
        prompt: { text: 'Üç doğru aynı noktada kesişiyor. Kaç açı oluşmuştur?', visual: UC_KESISEN },
        choices: ['3', '4', '6', '9'],
        answer: 2,
        feedback: ['Kesişim noktasından kaç ışın çıkıyor? Komşu iki ışın arasında bir açı vardır.', 'İki doğru 4 açı oluşturur; üçüncü doğru yeni açılar ekler.', null, 'Kesişim noktası etrafındaki açıları tek tek say.'],
      },
      {
        prompt: { text: 'Şekilde a açısının ters açısı hangisidir?', visual: UC_KESISEN },
        choices: ['b', 'c', 'd', 'f'],
        answer: 2,
        feedback: ['b, a’nın komşusudur.', 'a’nın kollarını kesişim noktasının ötesine uzat; karşıdaki açı c mi?', null, 'f, a’nın komşusudur.'],
      },
      {
        prompt: 'Tren rayları hangi doğrulara örnektir?',
        choices: ['Kesişen doğrular', 'Paralel doğrular', 'Dik doğrular', 'Çakışık doğrular'],
        answer: 1,
        feedback: ['Raylar kesişseydi tren yoluna devam edemezdi.', null, 'Raylar birbirine dik değil, yan yana ilerler.', 'Raylar üst üste değil; aralarında hep aynı uzaklık var.'],
      },
    ],
  },
  {
    id: 'g5-tumler-butunler-hesapla',
    outcomes: ['MAT.5.3.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Ölçmeden bul',
    instructions: 'Açılar arasındaki ilişkileri kullanarak ölçüleri hesapla.',
    level: 2,
    launch: { text: 'Kapı eşiğini bir doğru gibi düşün. Kapı açıldığında kapının iki yanında iki açı oluşur. Biri 60° ise diğerini açıölçer kullanmadan bulabilir miyiz?' },
    reflect: 'Bir açının tümlerini bulurken neden 90’dan, bütünlerini bulurken neden 180’den çıkarırız?',
    items: [
      { text: 'Ölçüsü 35° olan açının tümleri: __°', answers: ['55'], hints: ['Tümler açıların ölçüleri toplamı kaç derecedir?', '35’ten 90’a saymak için kaç adım atarsın?'] },
      { text: 'Ölçüsü 72° olan açının tümleri: __°', answers: ['18'], hints: ['72°’ye kaç derece eklersen dik açı olur?'] },
      { text: 'Ölçüsü 120° olan açının bütünleri: __°', answers: ['60'], hints: ['Bütünler iki açı birlikte hangi açıyı oluşturur?'] },
      { text: 'Ölçüsü 45° olan açının bütünleri: __°', answers: ['135'] },
      {
        text: 'Şekilde a = 50° ise c = __° ve b = __°',
        answers: ['50', '130'],
        visual: KESISEN_ABCD,
        hints: ['a ile c karşılıklı mı, yan yana mı duruyor?', 'a ile b birlikte bir doğru açı oluşturuyor mu?'],
        explain: 'a ile c ters açılardır, ölçüleri eşittir. a ile b komşu bütünlerdir: 50° + 130° = 180°.',
      },
      { text: 'Şekilde d = 130° ise b = __° ve c = __°', answers: ['130', '50'], visual: KESISEN_ABCD, hints: ['d’nin ters açısı hangisi?', 'c ile d yan yana durup bir doğru açı oluşturuyor.'] },
      { text: 'Ölçüleri eşit olan komşu bütünler iki açının her biri: __°', answers: ['90'], hints: ['İki eş parça birlikte 180° ediyor. Bir parça kaç derece?'] },
      {
        text: 'Komşu tümler iki açıdan büyüğü küçüğün 2 katıdır. Küçük açı: __°',
        answers: ['30'],
        visual: { kind: 'tape', parts: [{ label: 'küçük', value: 1 }, { label: 'büyük (2 kat)', value: 2 }], total: '90°' },
        hints: ['Şeritte 90° kaç eş parçaya bölünmüş gibi düşünebilirsin?', 'Bir parça kaç derece eder?'],
        explain: '90° = 1 parça + 2 parça = 3 eş parça. Bir parça 30°, büyük açı 60°.',
      },
    ],
  },
  {
    id: 'g5-acilar-her-zaman-bazen-asla',
    outcomes: ['MAT.5.3.4'],
    type: 'categorize',
    stage: 'problem',
    title: 'Açılar hakkında önermeler',
    instructions: 'Her önerme her zaman mı doğru, bazen mi, yoksa asla mı? Emin değilsen bir örnek ya da karşı örnek düşün.',
    level: 3,
    launch: { text: 'Zeynep: “İki doğru kesişince hep iki dar, iki geniş açı oluşur.” diyor. Bu önerme her zaman doğru mu? Bir karşı örnek bulabilir misin?' },
    reflect: '“Asla doğru değil” dediğin bir önermeyi küçük bir değişiklikle “her zaman doğru” bir önermeye çevirebilir misin?',
    categories: HBA,
    items: [
      { content: 'Kesişen iki doğru 4 açı oluşturur.', category: 'her' },
      { content: 'Kesişen iki doğrunun oluşturduğu açılardan ikisi dar, ikisi geniştir.', category: 'bazen', explain: 'Doğrular dik kesişirse dört açı da dik açı olur.' },
      { content: 'Ters açıların ölçüleri eşittir.', category: 'her' },
      { content: 'Komşu iki açı bütünlerdir.', category: 'bazen', explain: 'Komşu açıların toplamı 180° ise bütünlerdir; her komşu açı çifti böyle değildir.' },
      { content: 'Tümler iki açının ikisi de dar açıdır.', category: 'her', explain: 'Toplamları 90° ise ikisi de 90°’den küçüktür.' },
      { content: 'Bütünler iki açının ikisi de geniş açıdır.', category: 'asla', explain: 'İki geniş açının toplamı 180°’yi geçer.' },
      { content: 'Paralel iki doğru açı oluşturur.', category: 'asla', explain: 'Paralel doğruların ortak noktası yoktur; açı oluşmaz.' },
      { content: 'Üç doğru aynı noktada kesişirse 6 açı oluşur.', category: 'her' },
      { content: 'Aynı noktada kesişen üç doğrunun oluşturduğu açıların hepsi dar açıdır.', category: 'bazen', explain: 'Doğruların duruşuna göre 6 dar açı da, 2 geniş ve 4 dar açı da oluşabilir.' },
    ],
  },

  // MAT.5.3.5
  {
    id: 'g5-geometri-tahtasinda-cokgen',
    outcomes: ['MAT.5.3.5'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Geometri tahtasında çokgenler',
    instructions: 'Çivilere dokunarak köşeleri seç, ilk köşeye dönerek şekli kapat.',
    level: 1,
    launch: { text: 'Bahçenin etrafına düz tellerle çit çekeceğiz. En az kaç düz tel kullanırsak bahçe kapalı bir alan olur?' },
    reflect: 'Kenar sayısı ile köşe sayısı arasında nasıl bir ilişki fark ettin? Her çokgende böyle mi?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: '3 kenarlı bir çokgen (üçgen) oluştur.', target: { sides: 3 }, explain: 'Üç doğru parçası uç uca eklenip kapanınca üçgen oluşur.' },
      { prompt: '4 kenarlı bir çokgen (dörtgen) oluştur.', target: { sides: 4 } },
      { prompt: '5 kenarlı bir çokgen (beşgen) oluştur.', target: { sides: 5 }, hints: ['Her köşe yeni bir kenarın başladığı yerdir. 5 kenar için kaç köşe seçmelisin?'] },
      { prompt: '6 kenarlı bir çokgen (altıgen) oluştur.', target: { sides: 6 }, hints: ['Köşeleri aynı doğru üzerinde seçersen kenar sayısı azalır mı? Dikkat et.'] },
    ],
  },
  {
    id: 'g5-cokgen-mi',
    outcomes: ['MAT.5.3.5'],
    type: 'categorize',
    stage: 'model',
    title: 'Çokgen mi, değil mi?',
    instructions: 'Şekilleri incele: kenarları doğru parçası mı, şekil kapalı mı? Doğru gruba sürükle.',
    level: 1,
    launch: { text: 'Trafik işaretlerine bak: üçgen, sekizgen, daire... Bunların hepsine “çokgen” diyebilir miyiz?' },
    reflect: 'Bir şeklin çokgen olması için gereken iki koşulu kendi sözlerinle yaz.',
    categories: [
      { id: 'cokgen', label: 'Çokgen', color: '#22c55e' },
      { id: 'degil', label: 'Çokgen değil', color: '#ef4444' },
    ],
    items: [
      { content: { visual: { kind: 'shape', shape: 'triangle', color: '#f97316' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'pentagon', color: '#3b82f6' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'hexagon', color: '#a855f7' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'trapezoid', color: '#22c55e' } }, category: 'cokgen', explain: 'Bütün kenarları doğru parçası ve şekil kapalı: çokgendir.' },
      { content: { visual: { kind: 'shape', shape: 'parallelogram', color: '#eab308' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'octagon', color: '#ec4899' } }, category: 'cokgen' },
      { content: { visual: { kind: 'shape', shape: 'circle', color: '#06b6d4' } }, category: 'degil', explain: 'Çemberin sınırı eğri bir çizgidir; çokgenin kenarları ise doğru parçasıdır.' },
      { content: { visual: { kind: 'shape', shape: 'semicircle', color: '#f97316' } }, category: 'degil', explain: 'Yarım dairenin bir kenarı eğridir.' },
      { content: { visual: ACIK_SEKIL }, category: 'degil', explain: 'Şekil kapalı değil: son kenar ilk kenarla birleşmiyor.' },
      { content: { visual: KEMER }, category: 'degil', explain: 'Kemerin üst kısmı eğridir.' },
    ],
  },
  {
    id: 'g5-dogrularla-cokgen',
    outcomes: ['MAT.5.3.5'],
    type: 'fill',
    stage: 'sembol',
    title: 'Doğrulardan çokgenlere',
    instructions: 'Ardışık kesişen doğruları düşünerek boşlukları doldur.',
    level: 2,
    launch: { text: 'Kâğıda üç düz çizgi çiz ve son çizgiyi ilk çizgiyle kesiştir. Ortada nasıl bir şekil oluşur?', visual: UC_DOGRU },
    reflect: 'Doğru sayısı ile oluşan çokgenin kenar sayısı arasındaki ilişkiyi bir cümleyle söyle.',
    items: [
      { text: 'Şekilde d, e ve f doğruları ardışık kesişerek __ kenarlı bir çokgen oluşturmuştur.', answers: ['3'], visual: UC_DOGRU },
      { text: 'Bir çokgen oluşturmak için en az __ doğrunun ardışık kesişmesi gerekir.', answers: ['3'], hints: ['2 doğruyla kapalı bir şekil çizebilir misin? Dene.'], explain: 'İki doğru en fazla bir noktada kesişir; kapalı bir şekil oluşmaz.' },
      { text: 'Ardışık kesişen 5 doğrunun oluşturduğu çokgenin __ kenarı ve __ köşesi vardır.', answers: ['5', '5'], hints: ['Her doğrunun bir parçası bir kenar olur. Her kesişim noktası ne olur?'] },
      { text: 'Altıgen, __ doğrunun ardışık kesişmesiyle oluşur.', answers: ['6'] },
      { text: '8 doğrunun ardışık kesişmesiyle oluşan çokgene __ denir.', answers: ['sekizgen'], choices: ['altıgen', 'yedigen', 'sekizgen', 'dokuzgen'] },
      { text: 'Bir dörtgenin __ kenarı, __ köşesi ve __ iç açısı vardır.', answers: ['4', '4', '4'], hints: ['Her köşede bir iç açı oluşur.'] },
      { text: 'Yedigen, __ doğrunun ardışık kesişmesiyle oluşur.', answers: ['7'] },
    ],
  },
  {
    id: 'g5-cokgen-tartisma',
    outcomes: ['MAT.5.3.5'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çokgenler hakkında konuşalım',
    instructions: 'Arkadaşlarının düşüncelerini değerlendir ve gerekçesiyle cevapla.',
    level: 2,
    launch: { text: 'Bir müzedeki çini desenlerinde beşgenler, altıgenler ve sekizgenler var. Ustalar bu şekilleri yalnız düz çizgilerle nasıl oluşturmuş olabilir?' },
    reflect: 'Bir çokgende kenar sayısı ile köşe sayısının neden hep eşit olduğunu bir arkadaşına açıkla.',
    questions: [
      {
        prompt: 'Kerem: “2 doğruyu kesiştirerek bir çokgen yaptım.” Kerem haklı mı?',
        choices: ['Hayır, 2 doğru kapalı bir şekil oluşturamaz.', 'Evet, 2 doğru bir açı oluşturur, açı da çokgendir.', 'Evet, doğrular çok uzunsa olur.'],
        answer: 0,
        feedback: [null, 'Açı kapalı bir şekil değildir; kolları sınırsız uzar.', 'Doğrular ne kadar uzun olursa olsun yalnız bir noktada kesişir; şekil kapanmaz.'],
      },
      {
        prompt: 'Daire neden bir çokgen değildir?',
        choices: ['Sınırı doğru parçalarından oluşmadığı için', 'Kapalı olmadığı için', 'Köşesi çok fazla olduğu için', 'Çok küçük olduğu için'],
        answer: 0,
        feedback: [null, 'Daire kapalıdır; sorun başka bir yerde.', 'Dairenin hiç köşesi yoktur.', 'Büyüklük, bir şeklin çokgen olup olmadığını belirlemez.'],
      },
      {
        prompt: 'Ardışık kesişen 9 doğrunun oluşturduğu çokgenin kaç köşesi vardır?',
        choices: ['9', '18', '8', '10'],
        answer: 0,
        feedback: [null, 'Her köşe iki doğrunun kesiştiği yerdir ama her doğru iki köşede kullanılır; iki kez saymış olabilirsin.', 'Son doğru ilk doğruyla da kesişir; o köşeyi unuttun mu?', 'Fazladan bir köşe saymış olabilirsin.'],
      },
      {
        prompt: 'Bir çokgenin 12 köşesi varsa kaç kenarı vardır?',
        choices: ['12', '11', '13', '24'],
        answer: 0,
        feedback: [null, 'Kapalı bir şekilde son köşeden ilk köşeye de bir kenar gider.', 'Her köşeden yeni bir kenar başlar; fazladan kenar yok.', 'Her kenarın iki ucu vardır ama her köşe iki kenarda ortaktır.'],
      },
      {
        prompt: 'Hangisi bir çokgenin elemanlarından biri değildir?',
        choices: ['Kenar', 'Köşe', 'İç açı', 'Yarıçap'],
        answer: 3,
        feedback: ['Kenarlar çokgeni oluşturan doğru parçalarıdır.', 'Köşeler kenarların birleştiği noktalardır.', 'İç açılar her köşede iki kenar arasında oluşur.', null],
      },
    ],
  },

  // MAT.5.3.6
  {
    id: 'g5-ucgen-aci-olustur',
    outcomes: ['MAT.5.3.6'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Eksik açıyı oluştur',
    instructions: 'Işını sürükleyerek istenen açıyı oluştur. Hesaplamadan önce tahmin et.',
    level: 2,
    launch: { text: 'Kâğıttan bir üçgen kes, üç köşesini yırt ve köşeleri yan yana koy. Ne oluşacağını tahmin et!', visual: tri('a', 'b', 'c', 'acute') },
    reflect: 'Üçgenin iç açılarının toplamının 180° olduğunu yırtma deneyiyle bir arkadaşına nasıl gösterirsin?',
    tool: 'angle',
    tasks: [
      { prompt: 'Bir üçgenin iki iç açısı 50° ve 60°. Üçüncü iç açıyı oluştur.', target: { degrees: 70 }, hints: ['Yırttığın üç köşe yan yana gelince hangi açıyı oluşturdu?', 'Üç açı birlikte 180° eder. 50° + 60°’ye ne eklemelisin?'], explain: '50° + 60° + 70° = 180°' },
      { prompt: 'Eşkenar üçgenin bir iç açısını oluştur.', target: { degrees: 60 }, hints: ['Eşkenar üçgenin üç açısı da eşittir.', '180°’yi 3 eş parçaya böl.'] },
      { prompt: 'Tepe açısı 40° olan ikizkenar üçgenin bir taban açısını oluştur.', target: { degrees: 70 }, hints: ['Taban açıları eşittir. 180°’den tepe açısını çıkarınca kaç kalır?', 'Kalan açıyı iki eş parçaya böl.'] },
      { prompt: 'Bir çokgenin köşesindeki iç açı 110°. Aynı köşedeki dış açıyı oluştur.', target: { degrees: 70 }, hints: ['İç açı ile dış açı yan yana durur ve birlikte doğru açı oluşturur.'] },
    ],
  },
  {
    id: 'g5-ucgenin-ic-acilari',
    outcomes: ['MAT.5.3.6'],
    type: 'fill',
    stage: 'model',
    title: 'Üçgenin iç açıları',
    instructions: 'Şekle bak; iç açıların toplamının 180° olduğunu kullanarak boşlukları doldur.',
    level: 2,
    launch: { text: 'Bir evin çatısının ön yüzü ikizkenar üçgen şeklinde. Usta yalnızca tepe açısını biliyor. Bu, taban açılarını bulmasına yeter mi?' },
    reflect: 'Bir üçgenin iki açısını bilmek neden üçüncüsünü bulmaya yeter?',
    items: [
      { text: 'Şekildeki üçgende C açısı: __°', answers: ['70'], visual: tri('50°', '60°', '?', 'acute'), hints: ['Üç iç açının toplamı kaç derecedir?', '50° ile 60°’nin toplamından 180°’ye kaç kalır?'] },
      { text: 'Şekildeki dik üçgende C açısı: __°', answers: ['55'], visual: tri('90°', '35°', '?', 'right'), hints: ['Köşedeki kare işareti kaç dereceyi gösterir?', '90° + 35° kaç eder? 180°’ye ne kadar kaldı?'] },
      { text: 'Şekildeki geniş açılı üçgende B açısı: __°', answers: ['30'], visual: tri('40°', '?', '110°', 'obtuse'), hints: ['Bilinen iki açıyı topla. 180°’ye kaç kaldı?'] },
      { text: 'Eşkenar üçgenin her bir iç açısı: __°', answers: ['60'], visual: { kind: 'shape', shape: 'triangle', color: '#a5b4fc' }, hints: ['Üç açı eşit ve toplamları 180°.'] },
      { text: 'Tepe açısı 40° olan ikizkenar üçgenin taban açılarının her biri: __°', answers: ['70'], hints: ['Taban açıları eşittir.', '180° − 40° kaç eder? Bunu iki eş parçaya böl.'] },
      { text: 'Taban açılarından biri 65° olan ikizkenar üçgenin tepe açısı: __°', answers: ['50'], hints: ['İki taban açısı birlikte kaç derece eder?'] },
      { text: 'İkizkenar dik üçgenin dar açılarının her biri: __°', answers: ['45'], hints: ['Dik açıyı çıkarınca kalan 90° iki eş açıya paylaştırılır.'] },
      { text: 'Bir köşedeki iç açı 130° ise aynı köşedeki dış açı: __°', answers: ['50'], explain: 'İç açı ile dış açı komşu bütünlerdir: 130° + 50° = 180°.' },
    ],
  },
  {
    id: 'g5-ucgenleri-acilarina-gore-sinifla',
    outcomes: ['MAT.5.3.6'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Üçgenleri açılarına göre sınıflandır',
    instructions: 'İç açı ölçüleri verilen üçgenleri doğru gruba sürükle.',
    level: 2,
    launch: { text: 'Üç arkadaş birer üçgen çizdi ve açılarını ölçtü. Üçgenleri hiç görmeden, yalnız açı ölçülerine bakarak türlerini söyleyebilir misin?' },
    reflect: 'Bir üçgenin türünü bulmak için neden yalnız en büyük açısına bakmak yeter?',
    categories: [
      { id: 'dar', label: 'Dar açılı üçgen', color: '#22c55e' },
      { id: 'dik', label: 'Dik üçgen', color: '#3b82f6' },
      { id: 'genis', label: 'Geniş açılı üçgen', color: '#f97316' },
    ],
    items: [
      { content: '50°, 60°, 70°', category: 'dar', explain: 'Üç açının hepsi 90°’den küçük.' },
      { content: '80°, 55°, 45°', category: 'dar' },
      { content: '60°, 60°, 60°', category: 'dar', explain: 'Eşkenar üçgenin bütün açıları dardır.' },
      { content: '90°, 30°, 60°', category: 'dik', explain: 'Açılardan biri 90°: dik üçgen.' },
      { content: '45°, 90°, 45°', category: 'dik' },
      { content: '18°, 72°, 90°', category: 'dik' },
      { content: '120°, 30°, 30°', category: 'genis', explain: '120° geniş açıdır; bir geniş açı üçgeni geniş açılı yapar.' },
      { content: '100°, 45°, 35°', category: 'genis' },
      { content: '25°, 130°, 25°', category: 'genis' },
    ],
  },
  {
    id: 'g5-cokgen-her-zaman-bazen-asla',
    outcomes: ['MAT.5.3.6'],
    type: 'categorize',
    stage: 'problem',
    title: 'Çokgenler: her zaman mı, bazen mi?',
    instructions: 'Her önermeyi bir örnek ya da karşı örnekle sına ve doğru gruba sürükle.',
    level: 3,
    launch: { text: '“Her kare bir dikdörtgendir.” önermesi doğru mu? Peki “Her dikdörtgen bir karedir.” önermesi? Bugün böyle önermeleri sınayacağız.' },
    reflect: 'Bir önermenin “asla doğru olmadığını” göstermek için bir örnek yeter mi, yoksa nedenini de açıklamalı mısın?',
    categories: HBA,
    items: [
      { content: 'Bir üçgenin iki dik açısı olabilir.', category: 'asla', explain: 'İki dik açı zaten 180° eder; üçüncü açıya yer kalmaz.' },
      { content: 'Bir üçgenin iki geniş açısı olabilir.', category: 'asla', explain: 'İki geniş açının toplamı 180°’yi geçer.' },
      { content: 'Dik üçgenin diğer iki açısı dar açıdır.', category: 'her' },
      { content: 'İkizkenar üçgen dik üçgendir.', category: 'bazen', explain: 'Tepe açısı 90° ise dik üçgendir; 40° ise değildir.' },
      { content: 'Eşkenar üçgen geniş açılıdır.', category: 'asla', explain: 'Eşkenar üçgenin açılarının hepsi 60°’dir.' },
      { content: 'Düzgün çokgenin bütün kenarları eşit uzunluktadır.', category: 'her' },
      { content: 'Bütün açıları eşit olan dörtgen düzgün çokgendir.', category: 'bazen', explain: 'Kare düzgündür; ama kenarları eşit olmayan bir dikdörtgenin de bütün açıları 90°’dir.' },
      { content: 'Bir köşedeki iç açı ile dış açının toplamı 180°’dir.', category: 'her' },
      { content: 'Çeşitkenar üçgenin bir açısı geniş açıdır.', category: 'bazen', explain: 'Açıları 40°, 60°, 80° olan çeşitkenar üçgende geniş açı yoktur.' },
      { content: 'İkizkenar üçgende eşit kenarları gören açılar eşittir.', category: 'her' },
    ],
  },
  {
    id: 'g5-sekiller-hangisi-farkli',
    outcomes: ['MAT.5.3.6'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Şekiller',
    instructions: 'Hangisi diğerlerinden farklı? Kenarlara, açılara ve köşelere bak. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: { text: 'Dört şekle bakan iki arkadaş farklı şekilleri “farklı” diye seçti ve ikisi de haklı çıktı. Bu nasıl mümkün olabilir?' },
    reflect: 'Seçtiğin şeklin “farklı” olma gerekçesini şeklin hangi özelliğine (kenar, açı, köşe) dayandırdın?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [
          { visual: { kind: 'shape', shape: 'square', color: '#3b82f6' } },
          { visual: { kind: 'shape', shape: 'rectangle', color: '#22c55e' } },
          { visual: { kind: 'shape', shape: 'rhombus', color: '#f97316' } },
          { visual: { kind: 'shape', shape: 'hexagon', color: '#a855f7' } },
        ],
        answer: 0,
        reasons: [
          'Hem bütün kenarları hem bütün açıları eşit olan tek dörtgen (düzgün dörtgen).',
          'Bütün açıları dik ama bütün kenarları eşit olmayan tek şekil.',
          'Bütün kenarları eşit ama hiç dik açısı olmayan tek dörtgen.',
          'Dört kenarlı olmayan tek şekil; 6 kenarı var.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Eşkenar üçgen', 'İkizkenar dik üçgen', 'Çeşitkenar geniş açılı üçgen', 'Kare'],
        answer: 0,
        reasons: [
          'Bütün açıları 60° olan tek şekil.',
          '45°’lik açısı olan tek şekil.',
          'Hiçbir kenarı birbirine eşit olmayan, geniş açısı olan tek şekil.',
          'Dört kenarlı tek şekil; diğerleri üçgen.',
        ],
      },
    ],
  },

  // MAT.5.3.7
  {
    id: 'g5-kesisen-cemberler',
    outcomes: ['MAT.5.3.7'],
    type: 'quiz',
    stage: 'model',
    title: 'Kesişen çemberlerle üçgen',
    instructions: 'A ve B çemberlerin merkezleri, C ise kesişim noktalarından biri. ABC üçgenini incele.',
    level: 2,
    launch: { text: 'Yaşam çiçeği motifi iç içe geçmiş eş çemberlerden oluşur. Çemberlerin kesiştiği noktaları merkezlerle birleştirirsek hangi üçgenler ortaya çıkar?', visual: cemberUcgen(5, 5, 5) },
    reflect: 'Hiç cetvelle ölçmeden üçgenin kenarlarının eşit olduğunu nasıl bildin?',
    questions: [
      {
        prompt: { text: 'Çemberlerin yarıçapları 5 cm ve |AB| = 5 cm. ABC üçgeni hangi üçgendir?', visual: cemberUcgen(5, 5, 5) },
        choices: ['Eşkenar üçgen', 'İkizkenar (eşkenar olmayan) üçgen', 'Çeşitkenar üçgen'],
        answer: 0,
        feedback: [null, 'Üç kenarı da kontrol et: |AC| ve |BC| yarıçap, |AB| ise merkezler arası uzaklık. Hepsi kaç cm?', 'En az iki kenar eşit: ikisi de 5 cm’lik yarıçap.'],
      },
      {
        prompt: { text: 'Çemberlerin yarıçapları 5 cm ve |AB| = 6 cm. ABC üçgeni hangi üçgendir?', visual: cemberUcgen(5, 5, 6) },
        choices: ['Eşkenar üçgen', 'İkizkenar (eşkenar olmayan) üçgen', 'Çeşitkenar üçgen'],
        answer: 1,
        feedback: ['|AB| = 6 cm, yarıçaplar 5 cm. Üç kenar eşit mi?', null, '|AC| ve |BC| ikisi de 5 cm’lik yarıçap; eşit iki kenar var.'],
      },
      {
        prompt: { text: 'A merkezli çemberin yarıçapı 4 cm, B merkezli çemberin yarıçapı 5 cm ve |AB| = 6 cm. ABC üçgeni hangi üçgendir?', visual: cemberUcgen(4, 5, 6) },
        choices: ['Eşkenar üçgen', 'İkizkenar (eşkenar olmayan) üçgen', 'Çeşitkenar üçgen'],
        answer: 2,
        feedback: ['Kenarlar 4 cm, 5 cm ve 6 cm. Hepsi eşit mi?', 'Eşit iki kenar bulabildin mi? 4, 5 ve 6’yı karşılaştır.', null],
      },
      {
        prompt: 'Bu inşada |AC| uzunluğu neden A merkezli çemberin yarıçapına eşittir?',
        choices: ['C noktası B’ye yakın olduğu için', 'C noktası A merkezli çemberin üzerinde olduğu için', '[AC] bir çap olduğu için', 'Her üçgen eşkenar olduğu için'],
        answer: 1,
        feedback: ['C’nin B’ye yakınlığı |AC|’yi belirlemez.', null, 'Çap çemberin merkezinden geçer ve iki ucu da çemberdedir; [AC]’nin bir ucu merkezde.', 'Bu inşayla ikizkenar ve çeşitkenar üçgenler de elde ettik.'],
      },
      {
        prompt: 'Eşkenar üçgen inşa etmek için yarıçaplar ve merkezler arası uzaklık nasıl olmalıdır?',
        choices: ['Yarıçaplar farklı olmalı.', 'Yarıçaplar eşit, merkezler arası uzaklık farklı olmalı.', 'Merkezler arası uzaklık yarıçapların toplamı olmalı.', 'İki yarıçap ve merkezler arası uzaklık birbirine eşit olmalı.'],
        answer: 3,
        feedback: ['Yarıçaplar farklıysa |AC| ile |BC| eşit olmaz.', 'Bu durumda yalnız iki kenar eşit olur: ikizkenar üçgen.', 'Bu durumda çemberler yalnız bir noktada değer; üçgen oluşmaz.', null],
      },
      {
        prompt: 'Yarıçapları 6 cm olan iki çemberin merkezleri arası 6 cm. Bu çemberlerle inşa edilen ABC üçgeninin çevre uzunluğu kaç santimetredir?',
        choices: ['12 cm', '18 cm', '24 cm', '36 cm'],
        answer: 1,
        feedback: ['Yalnız iki kenarı topladın; üçüncü kenar |AB| da 6 cm.', null, 'Üçgenin 4 kenarı yok; üç kenarı topla.', 'Çevre, kenarların toplamıdır: 6 + 6 + 6.'],
      },
      {
        prompt: 'Cetvelle uzunluk ölçmeden eşkenar üçgen çizmek için hangi araçlar yeterlidir?',
        choices: ['Pergel ve ölçüsüz cetvel', 'Yalnızca açıölçer', 'Gönye ve açıölçer', 'Yalnızca gönye'],
        answer: 0,
        feedback: [null, 'Açıölçerle açı çizebilirsin ama kenarların eşitliğini nasıl sağlayacaksın?', 'Gönye dik açı içindir; eşkenar üçgende dik açı yoktur.', 'Gönye dik açı içindir; eşkenar üçgende dik açı yoktur.'],
      },
    ],
  },
  {
    id: 'g5-cemberle-ucgen-kenarlari',
    outcomes: ['MAT.5.3.7'],
    type: 'fill',
    stage: 'sembol',
    title: 'Çemberlerden kenar uzunluklarına',
    instructions: 'Yarıçapları kullanarak üçgenin kenar uzunluklarını bul.',
    level: 2,
    launch: { text: 'Pergelin açıklığını 4 cm’ye ayarladın ve iki merkezden çember çizdin. Pergeli hiç değiştirmediysen hangi uzunlukları zaten biliyorsun?' },
    reflect: 'Bir ikizkenar üçgen inşa etmek için pergeli nasıl ayarlarsın? Adım adım anlat.',
    items: [
      { text: 'A merkezli çemberin yarıçapı 5 cm. C bu çemberin üzerindeyse |AC| = __ cm', answers: ['5'], hints: ['C ile A arasındaki doğru parçası çemberin hangi elemanıdır?'] },
      { text: 'Şekilde çemberlerin yarıçapları 4 cm ve |AB| = 4 cm ise |BC| = __ cm', answers: ['4'], visual: cemberUcgen(4, 4, 4) },
      { text: 'Yarıçapları 3 cm ve 4 cm olan iki çemberin merkezleri arası 5 cm. ABC üçgeninin çevre uzunluğu: __ cm', answers: ['12'], hints: ['|AC|, |BC| ve |AB| ayrı ayrı kaç cm?'] },
      { text: '|AB| = 7 cm alınarak pergelle eşkenar ABC üçgeni inşa edilecek. Pergel açıklığı __ cm olmalı.', answers: ['7'] },
      { text: 'Yarıçapları 6 cm olan çemberlerle inşa edilen ikizkenar ABC üçgeninin çevre uzunluğu 20 cm ise |AB| = __ cm', answers: ['8'], hints: ['|AC| ve |BC| kaçar santimetre?', '20’den bu iki kenarı çıkarırsan ne kalır?'] },
      { text: 'Yarıçapları 5 cm olan iki çemberin merkezleri arası 5 cm ise ABC üçgeninin her bir iç açısı __° olur.', answers: ['60'], hints: ['Bu üçgenin kenarları hakkında ne biliyorsun?', 'Eşkenar üçgenin açıları nasıldır?'] },
    ],
  },
  {
    id: 'g5-cember-kosullari',
    outcomes: ['MAT.5.3.7'],
    type: 'categorize',
    stage: 'problem',
    title: 'Hangi üçgen oluşur?',
    instructions: 'A ve B merkezli iki çemberin yarıçapları ile |AB| verildi. C kesişim noktası olmak üzere ABC üçgenini türüne göre grupla.',
    level: 3,
    launch: { text: 'Bir logo tasarımcısı iki çemberle eşkenar, ikizkenar ve çeşitkenar üçgenler elde etmek istiyor. Hangi ölçüleri seçmeli?' },
    reflect: 'Çeşitkenar üçgen elde etmek için yarıçaplar ve merkezler arası uzaklık nasıl olmalı? Bir önerme yaz.',
    categories: [
      { id: 'eskenar', label: 'Eşkenar', color: '#22c55e' },
      { id: 'ikizkenar', label: 'İkizkenar', color: '#3b82f6' },
      { id: 'cesitkenar', label: 'Çeşitkenar', color: '#f97316' },
    ],
    items: [
      { content: 'Yarıçaplar 4 cm ve 4 cm, |AB| = 4 cm', category: 'eskenar', explain: '|AC| = 4, |BC| = 4, |AB| = 4: üç kenar eşit.' },
      { content: 'Yarıçaplar 6 cm ve 6 cm, |AB| = 6 cm', category: 'eskenar' },
      { content: 'Yarıçaplar 5 cm ve 5 cm, |AB| = 3 cm', category: 'ikizkenar', explain: '|AC| = |BC| = 5 cm ama |AB| = 3 cm.' },
      { content: 'Yarıçaplar 4 cm ve 6 cm, |AB| = 4 cm', category: 'ikizkenar', explain: '|AC| = 4 cm ve |AB| = 4 cm: iki kenar eşit.' },
      { content: 'Yarıçaplar 3 cm ve 3 cm, |AB| = 5 cm', category: 'ikizkenar' },
      { content: 'Yarıçaplar 7 cm ve 5 cm, |AB| = 5 cm', category: 'ikizkenar', explain: '|BC| = 5 cm ve |AB| = 5 cm: iki kenar eşit.' },
      { content: 'Yarıçaplar 3 cm ve 4 cm, |AB| = 5 cm', category: 'cesitkenar', explain: 'Kenarlar 3, 4 ve 5 cm: hiçbiri eşit değil.' },
      { content: 'Yarıçaplar 5 cm ve 6 cm, |AB| = 7 cm', category: 'cesitkenar' },
      { content: 'Yarıçaplar 4 cm ve 7 cm, |AB| = 6 cm', category: 'cesitkenar' },
    ],
  },

  // ── Sayılar ve Nicelikler (1) ──────────────────────────────────────────

  // MAT.5.1.1
  {
    id: 'g5-boluk-tablosu',
    outcomes: ['MAT.5.1.1'],
    type: 'fill',
    stage: 'model',
    title: 'Bölük tablosu',
    instructions: 'Bölük tablosundaki sayıyı oku; bölükler arasındaki örüntüyü kullanarak boşlukları doldur.',
    level: 1,
    launch: { text: 'Türkiye’nin nüfusu yaklaşık 85 milyon. Bu sayıyı rakamlarla yazınca kaç sıfır olur? Sıfırları tek tek saymadan bunu nasıl anlarız?' },
    reflect: 'Sayıyı sağdan üçer üçer ayırmak okumayı nasıl kolaylaştırıyor? Bölük adları hangi örüntüyle tekrar ediyor?',
    items: [
      {
        text: 'Tablodaki sayı: __',
        answers: ['4508120300|4.508.120.300'],
        visual: { kind: 'table', headers: ['Milyarlar', 'Milyonlar', 'Binler', 'Birler'], rows: [['4', '508', '120', '300']] },
        hints: ['Her bölük üç basamaklıdır. Bölükleri soldan sağa yan yana yaz.'],
      },
      {
        text: 'Tablodaki sayı: __',
        answers: ['3000085|3.000.085'],
        visual: { kind: 'table', headers: ['Milyonlar', 'Binler', 'Birler'], rows: [['3', '000', '085']] },
        hints: ['Binler bölüğü boş olsa da üç sıfırla yer tutar mı?'],
      },
      { text: '1 milyonda __ tane bin vardır.', answers: ['1000|1.000'], hints: ['1.000 tane bin yan yana gelirse kaç eder?', '1.000.000 sayısında binler bölüğünün solunda ne var?'], explain: 'Her bölük bir öncekinin 1.000 katıdır: 1.000 tane bin = 1 milyon.' },
      { text: '1 milyarda __ tane milyon vardır.', answers: ['1000|1.000'], hints: ['Bin ile milyon arasındaki ilişki, milyon ile milyar arasında da var mı?'] },
      { text: '10 tane yüz bin = __', answers: ['1000000|1.000.000'], hints: ['10 tane yüz kaç eder? 10 tane yüz bin için aynı örüntüyü kullan.'] },
      { text: '4.508.120.300 sayısının milyonlar bölüğündeki sayı __, binler bölüğündeki sayı __', answers: ['508', '120'] },
      { text: 'Dünya’nın Güneş’e uzaklığı yaklaşık 149.600.000 km. Bu sayıda 6 rakamının basamak değeri: __', answers: ['600000|600.000'], hints: ['6 hangi bölükte?', 'O bölüğün yüzler, onlar, birler basamaklarından hangisinde?'] },
    ],
  },
  {
    id: 'g5-buyuk-sayilarin-okunusu',
    outcomes: ['MAT.5.1.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Milyonlar ve milyarlar',
    instructions: 'Her sayıyı okunuşuyla eşleştir. Sıfır olan bölüklere dikkat et!',
    level: 2,
    launch: { text: 'Üç sayı: 3.000.000, 3.241.123 ve 3.000.085. Hepsi “üç milyon” diye başlıyor. Okunuşları neden farklı uzunlukta?' },
    reflect: 'Bir bölük tamamen sıfırsa okurken ne olur? Yazarken ne olur?',
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
    id: 'g5-sifirli-bolukler',
    outcomes: ['MAT.5.1.1'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Sıfırlar yer tutar',
    instructions: 'Okunuşu ya da yazılışı verilen sayıyı bul. Boş bölükleri unutma!',
    level: 2,
    launch: { text: 'Bir gazete haberinde “Kampanyada üç milyon seksen beş fidan dikildi.” yazıyor. Muhabir bu sayıyı rakamla yazarken nerede hata yapabilir?' },
    reflect: 'Sıfırların sayıyı yazarken “yer tutucu” olması neden önemli? Sıfırları yazmasaydık ne olurdu?',
    questions: [
      {
        prompt: '“Üç milyon seksen beş” sayısı rakamla nasıl yazılır?',
        choices: ['3.000.085', '385', '3.085', '3.000.850'],
        answer: 0,
        feedback: [null, 'Milyonlar bölüğünü yazdın mı? “Üç milyon” tek başına 7 basamaklıdır.', 'Binler bölüğü boş olsa da üç sıfırla yer tutmalı: 3.085 “üç bin seksen beş” olur.', '“Seksen beş” birler bölüğünde 085 olarak yazılır, 850 değil.'],
      },
      {
        prompt: '“Kırk yedi milyon altı bin iki yüz” sayısı hangisidir?',
        choices: ['47.006.200', '47.600.200', '4.706.200', '47.006.002'],
        answer: 0,
        feedback: [null, '“Altı bin” binler bölüğünde 006 olarak yazılır; 600 “altı yüz bin” olurdu.', '“Kırk yedi milyon” milyonlar bölüğünde 47 olarak durmalı.', '“İki yüz” birler bölüğünde 200 olarak yazılır.'],
      },
      {
        prompt: '“On iki milyar beş yüz milyon” sayısı kaç basamaklıdır?',
        choices: ['11', '10', '9', '12'],
        answer: 0,
        feedback: [null, 'Milyarlar bölüğünde 12 var: iki basamak. Ardından üç bölük daha gelir; her biri 3 basamak.', 'Milyonlar, binler ve birler bölüklerinin üçünü de saydın mı?', 'Milyarlar bölüğü 12, yani iki basamaklı; üç basamaklı değil.'],
      },
      {
        prompt: '2.040.000 sayısının okunuşu hangisidir?',
        choices: ['iki milyon kırk bin', 'iki milyon dört yüz bin', 'iki bin kırk', 'yirmi milyon kırk bin'],
        answer: 0,
        feedback: [null, 'Binler bölüğü 040: “kırk bin”.', 'Milyonlar bölüğünü atladın: 2, milyonlar bölüğünde.', 'Milyonlar bölüğünde yalnız 2 var: “iki milyon”.'],
      },
      {
        prompt: '7 basamaklı en küçük doğal sayı hangisidir?',
        choices: ['1.000.000', '1.000.001', '9.999.999', '999.999'],
        answer: 0,
        feedback: [null, 'Bundan 1 eksik olan sayı da 7 basamaklı mı? Kontrol et.', 'Bu, 7 basamaklı en büyük sayı.', '999.999 altı basamaklıdır.'],
      },
      {
        prompt: '999.999’dan 1 fazla olan sayı hangisidir?',
        choices: ['1.000.000', '100.000', '9.999.990', '1.000.999'],
        answer: 0,
        feedback: [null, '100.000, 999.999’dan küçüktür.', '9.999.990, 999.999’un 10 katıdır; 1 fazlası değil.', 'Birler bölüğündeki 999’a 1 ekleyince ne olur? Bu değişiklik soldaki bölüklere nasıl yayılır?'],
      },
    ],
  },
  {
    id: 'g5-buyuk-sayilari-sirala',
    outcomes: ['MAT.5.1.1'],
    type: 'sort',
    stage: 'problem',
    title: 'Büyük sayıları sırala',
    instructions: 'Sayıları basamak sayılarına ve bölüklerine bakarak sırala.',
    level: 2,
    launch: { text: 'Gezegenlerin Güneş’e uzaklıkları yüz milyonlarca kilometre. Bu kadar büyük sayıları karşılaştırmak için hepsini baştan sona okumak zorunda mıyız?' },
    reflect: 'İki büyük sayıyı karşılaştırırken önce neye bakarsın? Neden?',
    rounds: [
      { prompt: 'Gezegenlerin Güneş’e ortalama uzaklıklarını (km) küçükten büyüğe sırala.', items: ['Merkür: 57.900.000', 'Venüs: 108.200.000', 'Dünya: 149.600.000', 'Mars: 227.900.000', 'Jüpiter: 778.500.000'], ends: ['En yakın', 'En uzak'], hints: ['Önce basamak sayılarına bak: hangisi 8 basamaklı?'] },
      { prompt: 'Sayıları küçükten büyüğe sırala.', items: ['4.099.999', '4.909.099', '4.990.000', '40.009.000', '40.090.000'], ends: ['En küçük', 'En büyük'], hints: ['Önce basamak sayılarını karşılaştır.', 'Basamak sayısı eşitse en soldan başlayarak basamakları karşılaştır.'] },
      { prompt: 'Sayıları büyükten küçüğe sırala.', items: ['1.000.000.000', '999.999.999', '99.999.999', '10.000.000', '9.999.999'], ends: ['En büyük', 'En küçük'], explain: 'Basamak sayısı fazla olan sayı daha büyüktür; rakamların 9 olması bunu değiştirmez.' },
      { prompt: 'İllerin yaklaşık nüfuslarını büyükten küçüğe sırala.', items: ['İstanbul: 15.650.000', 'Ankara: 5.800.000', 'İzmir: 4.480.000', 'Bursa: 3.210.000', 'Antalya: 2.700.000'], ends: ['En kalabalık', 'En az nüfuslu'] },
    ],
  },
  {
    id: 'g5-buyuk-sayilar-hangisi-farkli',
    outcomes: ['MAT.5.1.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Büyük sayılar',
    instructions: 'Hangisi diğerlerinden farklı? İstediğini seç; basamaklara, bölüklere ya da okunuşa bakarak gerekçeni düşün.',
    level: 2,
    launch: { text: 'Dört sayıya bakıp herkes farklı bir sayıyı “farklı” seçebilir. Önemli olan seçim değil, gerekçe!' },
    reflect: 'Senin gerekçen sayının hangi özelliğine dayanıyordu: basamak sayısı mı, bölükler mi, okunuş mu?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['1.000.000', '999.999', '10.000.000', '100.000'],
        answer: 0,
        reasons: [
          '7 basamaklı tek sayı.',
          'Hiç sıfır rakamı içermeyen tek sayı.',
          '8 basamaklı tek sayı; okunuşunda “on” geçiyor.',
          'Bir milyonun onda biri olan tek sayı.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['5.000.000', '5.000.005', '50.000', '5.005.000'],
        answer: 0,
        reasons: [
          'Yalnızca milyonlar bölüğü dolu olan tek sayı.',
          'Tek sayı olan tek seçenek.',
          'Bir milyondan küçük olan tek sayı.',
          'Okunuşunda hem “milyon” hem “bin” geçen tek sayı.',
        ],
      },
    ],
  },

  // MAT.5.1.2
  {
    id: 'g5-serit-modeli',
    outcomes: ['MAT.5.1.2'],
    type: 'fill',
    stage: 'model',
    title: 'Şerit modeliyle problem',
    instructions: 'Şerit modeline bak: bütün mü bilinmiyor, bir parça mı? Sonra bilinmeyeni bul.',
    level: 2,
    launch: {
      text: 'Okul kampanyasında iki haftada kitap toplandı. Toplamı mı, farkı mı bulacağımıza bir çizim nasıl karar verdirir?',
      visual: { kind: 'tape', parts: [{ label: '1. hafta', value: 5 }, { label: '2. hafta', value: 4 }], total: '?' },
    },
    reflect: 'Hangi problemlerde soru işareti şeridin bir parçasındaydı, hangilerinde bütünün üstünde? Bu, işlemi seçmeni nasıl etkiledi?',
    items: [
      {
        text: 'Kitap kampanyasında 1. hafta 12.475, 2. hafta 9.638 kitap toplandı. Toplam: __ kitap',
        answers: ['22113|22.113'],
        visual: { kind: 'tape', parts: [{ label: '12.475', value: 12475 }, { label: '9.638', value: 9638 }], total: '?' },
        hints: ['Model iki parçayı mı birleştiriyor, yoksa bütünden bir parça mı ayırıyor?', 'Önce tahmin et: 12.000 + 10.000 yaklaşık kaç eder?'],
      },
      {
        text: 'Son 10 yılda 45.485, yalnızca bu yıl 51.373 futbol sahası kadar buzul eridi. Bu yıl eriyen alan __ futbol sahası kadar fazla.',
        answers: ['5888|5.888'],
        visual: { kind: 'tape', parts: [{ label: '45.485', value: 45485 }, { label: '?', value: 5888 }], compare: [{ label: '51.373', value: 51373 }] },
        hints: ['İki şeridin uzunluk farkı hangi parça?', '45.485’e kaç eklersen 51.373 olur?'],
        explain: '51.373 − 45.485 = 5.888',
      },
      {
        text: 'Bir okulda 1.250 öğrenci var; 486’sı kız. Erkek öğrenci sayısı: __',
        answers: ['764'],
        visual: { kind: 'tape', parts: [{ label: '486', value: 486 }, { label: '?', value: 764 }], total: '1.250' },
        hints: ['Bütün biliniyor mu? Hangi parça eksik?'],
      },
      {
        text: 'Elif’in kumbarasında 3.450 TL vardı. 6 ay boyunca her ay 275 TL ekledi. Şimdi: __ TL',
        answers: ['5100|5.100'],
        visual: { kind: 'tape', parts: [{ label: '3.450', value: 3450 }, { label: '6 × 275', value: 1650 }], total: '?' },
        hints: ['Önce 6 ayda biriken parayı bul.', '6 × 275’i 6 × 200 ve 6 × 75 olarak parçalayabilirsin.'],
      },
      {
        text: '24 sınıfın her biri 135 fidan dikti. Toplam: __ fidan',
        answers: ['3240|3.240'],
        visual: { kind: 'tape', parts: [{ label: '135', value: 1 }, { label: '135', value: 1 }, { label: '135', value: 1 }, { label: '…', value: 1 }, { label: '135', value: 1 }], total: '24 eş parça → ?' },
        hints: ['Aynı miktar 24 kez tekrar ediyor: hangi işlem?', '135 × 24’ü 135 × 20 ve 135 × 4 olarak parçalayabilirsin.'],
      },
      {
        text: '2.856 kitap, her rafa 34 kitap gelecek şekilde dizilecek. __ raf dolar.',
        answers: ['84'],
        visual: { kind: 'tape', parts: [{ label: '34', value: 1 }, { label: '34', value: 1 }, { label: '34', value: 1 }, { label: '…', value: 1 }, { label: '34', value: 1 }], total: '2.856' },
        hints: ['Bütün ve bir parçanın büyüklüğü biliniyor. Kaç parça var?', '34 × 80 kaç eder? Kalan kitaplar kaç raf daha doldurur?'],
        explain: '34 × 80 = 2.720; 2.856 − 2.720 = 136; 136 = 34 × 4. Toplam 84 raf.',
      },
    ],
  },
  {
    id: 'g5-problem-stratejileri',
    outcomes: ['MAT.5.1.2'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Önce tahmin, sonra strateji',
    instructions: 'Uygun işlemi, en iyi tahmini ya da kullanışlı stratejiyi seç.',
    level: 2,
    launch: { text: 'Bir problemi çözmeden önce sonucu tahmin etmek, hesap makinesinde yanlış tuşa bastığımızı fark etmemizi sağlar. Sen de önce tahmin ediyor musun?' },
    reflect: 'Hangi soruda tahmin, yanlış seçenekleri elemene yardım etti? Nasıl?',
    questions: [
      {
        prompt: 'Bir sinema salonunda 18 sıra var, her sırada 24 koltuk. Koltuk sayısını bulmak için hangi işlem yapılır?',
        choices: ['18 × 24', '18 + 24', '24 − 18', '24 ÷ 18'],
        answer: 0,
        feedback: [null, 'Her sıradaki 24 koltuk 18 kez tekrar ediyor. Tekrarlı toplama hangi işlemle kısaltılır?', 'Fark, kaç koltuk olduğunu söylemez.', 'Koltukları paylaştırmıyoruz, sayıyoruz.'],
      },
      {
        prompt: '4.987 + 3.012 işleminin sonucu için en iyi tahmin hangisidir?',
        choices: ['7.000', '9.000', '8.000', '80.000'],
        answer: 2,
        feedback: ['4.987’yi 4.000’e değil, daha yakın olan 5.000’e yuvarla.', '3.012, 4.000’e değil 3.000’e daha yakındır.', null, 'Binlerle toplarken basamak sayısı bu kadar artmaz: 5.000 + 3.000.'],
      },
      {
        prompt: '1.248 ÷ 24 işleminin sonucu için en iyi tahmin hangisidir?',
        choices: ['50', '5', '500', '20'],
        answer: 0,
        feedback: [null, '24 × 5 = 120; 1.248’den çok küçük.', '24 × 500 = 12.000; çok büyük.', '24 × 20 = 480; daha büyük bir sayı gerekir.'],
      },
      {
        prompt: 'Zeynep 36 × 25 işlemini kısa yoldan yapmak istiyor. Hangisi doğru bir stratejidir?',
        choices: ['36 × 100 ÷ 4', '36 × 20 + 5', '36 + 25 × 4', '30 × 25 + 6'],
        answer: 0,
        feedback: [null, '36 × 25 = 36 × 20 + 36 × 5 olmalı; 5’i de 36 ile çarpmayı unutma.', 'Bu ifade 36’ya yalnızca 100 ekliyor; 36’yı 25 kez toplamıyor.', '6’yı da 25 ile çarpmalısın: 30 × 25 + 6 × 25.'],
      },
      {
        prompt: 'Bir bölme işleminde bölen 24, bölüm 15, kalan 7 ise bölünen kaçtır?',
        choices: ['360', '367', '353', '46'],
        answer: 1,
        feedback: ['Kalanı eklemeyi unuttun.', null, 'Kalanı çıkarmak yerine eklemelisin: bölünen, bölen × bölümden büyüktür.', 'Sayıları toplamak bölüneni vermez; bölen × bölüm + kalan.'],
      },
      {
        prompt: 'A marketinde 2 kg pirinç 130 TL, B marketinde 5 kg pirinç 300 TL. Hangisi daha ekonomiktir?',
        choices: ['A marketi', 'B marketi', 'İkisi de aynı'],
        answer: 1,
        feedback: ['A’daki paket daha ucuz görünüyor ama içinde daha az pirinç var. 1 kg’ın fiyatını karşılaştır.', null, 'Her marketteki 1 kg pirincin fiyatını hesapla: A’da 130 ÷ 2, B’de 300 ÷ 5. Aynı mı?'],
      },
      {
        prompt: '245 dakika kaç saat kaç dakikadır?',
        choices: ['2 saat 45 dakika', '4 saat 45 dakika', '3 saat 65 dakika', '4 saat 5 dakika'],
        answer: 3,
        feedback: ['1 saat 100 dakika değil, 60 dakikadır.', '4 saat 240 dakika eder; 245’ten geriye kaç dakika kalır?', '65 dakika 1 saatten fazladır; bir saat daha ayırabilirsin.', null],
      },
    ],
  },
  {
    id: 'g5-kalani-yorumla',
    outcomes: ['MAT.5.1.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kalanı yorumla',
    instructions: 'Bölme yap ama cevabı seçmeden önce kalanın bu problemde ne anlama geldiğini düşün.',
    level: 2,
    launch: { text: 'Bölmede kalan bazen önemsizdir, bazen çok önemlidir. Geziye gidecek öğrenciler otobüslere sığmazsa ne olur?' },
    reflect: 'Hangi problemlerde bölümü bir artırdın, hangilerinde kalanı dikkate almadın? Buna neye bakarak karar verdin?',
    questions: [
      {
        prompt: '250 öğrenci 45 kişilik otobüslerle geziye gidecek. En az kaç otobüs gerekir?',
        choices: ['5', '6', '5, kalan 25', '7'],
        answer: 1,
        feedback: ['5 otobüse 225 öğrenci biner. Kalan 25 öğrenci evde mi kalacak?', null, 'Soru otobüs sayısını soruyor; yarım otobüs olmaz. Kalan öğrenciler için ne yapmalı?', '6 otobüs 270 kişi taşır; bir otobüse daha gerek var mı?'],
      },
      {
        prompt: '100 yumurta 6’lık kolilere konuyor. Kaç koli tamamen dolar?',
        choices: ['16', '17', '16, kalan 4', '4'],
        answer: 0,
        feedback: [null, '17. koliye yalnız 4 yumurta kalır; o koli dolmaz.', 'Soru dolu koli sayısını soruyor. Kalan yumurtalar bir koliyi doldurur mu?', '4, artan yumurta sayısıdır; koli sayısı değil.'],
      },
      {
        prompt: '100 yumurta 6’lık kolilere konuyor. Kolilere giremeyen kaç yumurta artar?',
        choices: ['4', '16', '6', '2'],
        answer: 0,
        feedback: [null, '16, dolu koli sayısıdır.', '6, bir kolideki yumurta sayısıdır.', '16 × 6 = 96. 100’den kaç eksik?'],
      },
      {
        prompt: '87 saat kaç gün kaç saattir?',
        choices: ['3 gün 15 saat', '8 gün 7 saat', '3 gün 6 saat', '4 gün'],
        answer: 0,
        feedback: [null, 'Bir gün 10 saat değil, 24 saattir.', '3 gün 72 saat eder; 87’ye kaç saat kalır?', '4 gün 96 saat eder; 87’den fazla.'],
      },
      {
        prompt: '1.000 TL ile tanesi 75 TL olan kitaplardan en çok kaç tane alınabilir?',
        choices: ['13', '14', '13, kalan 25', '12'],
        answer: 0,
        feedback: [null, '14 kitap 1.050 TL tutar; para yetmez.', 'Soru kitap sayısını soruyor; kalan 25 TL yeni bir kitaba yetmez.', '12 kitap alınabilir ama daha fazlası da alınabilir mi?'],
      },
      {
        prompt: '1.350 cm’lik bir ip 9 eş parçaya bölünecek. Her parça kaç santimetre olur?',
        choices: ['150', '105', '1.341', '15'],
        answer: 0,
        feedback: [null, '9 × 105 = 945; 1.350’ye ulaşmıyor. Bölümdeki sıfırın yerine dikkat et.', 'Paylaştırırken bölme yaparız, çıkarma değil.', '9 × 15 = 135; bir basamak eksik kalmış.'],
      },
    ],
  },
  {
    id: 'g5-dogal-sayi-problemleri',
    outcomes: ['MAT.5.1.2'],
    type: 'fill',
    stage: 'problem',
    title: 'Gerçek yaşam problemleri',
    instructions: 'Problemi oku: verilenleri ve isteneni belirle, sonucu tahmin et, sonra çöz.',
    level: 3,
    launch: { text: 'Uçak yolculukları, tarihî eserler, alışveriş, kamp... Gerçek hayattaki problemler önümüze sayılarla gelir. Önce ne verildiğini, ne istendiğini bulalım.' },
    reflect: 'Bir problemi çözerken önce şekil çizmek mi, önce tahmin etmek mi daha çok işine yarıyor? Neden?',
    items: [
      { text: 'Bir uçağın sayacı yolculuk başında 48.370 km, sonunda 52.915 km gösteriyor. Uçak __ km yol aldı.', answers: ['4545|4.545'], hints: ['Sayaç sürekli artıyor. Baştaki değerden sondaki değere ne kadar arttı?'] },
      { text: 'Bir tarihî eser 2.450 yıl önce yapıldı. Başka bir eser ondan 1.875 yıl sonra yapıldı. İkinci eser __ yıl önce yapıldı.', answers: ['575'], hints: ['İkinci eser daha yeni mi, daha eski mi?', 'Bir şerit çiz: 2.450 yılın 1.875 yılı geçtikten sonra ne kadarı kalır?'] },
      { text: 'Bir fabrika günde 245 koli üretiyor; her kolide 120 şişe var. Bir günde __ şişe üretilir.', answers: ['29400|29.400'], hints: ['Önce tahmin et: 250 × 100 kaç eder?'] },
      { text: 'Bir okul 3.672 defteri 72 sınıfa eşit olarak dağıtacak. Her sınıfa __ defter düşer.', answers: ['51'], hints: ['72 × 50 kaç eder? Geriye kaç defter kalır?'] },
      { text: 'Bir film 19.45’te başlayıp 22.10’da bitiyor. Film __ dakika sürer.', answers: ['145'], hints: ['19.45’ten 20.00’ye kaç dakika?', '20.00’den 22.10’a kaç dakika?'], explain: '15 dakika + 2 saat 10 dakika = 2 saat 25 dakika = 145 dakika' },
      { text: 'Bir köprünün yapımı 2019 yılının mart ayında başlayıp 2023 yılının eylül ayında bitti. Yapım __ yıl __ ay sürdü.', answers: ['4', '6'], hints: ['2019 martından 2023 martına kaç yıl geçer?', 'Marttan eylüle kaç ay var?'] },
      { text: '6’lı paket su 54 TL, 12’li paket su 96 TL. 12’li pakette bir şişe __ TL daha ucuzdur.', answers: ['1'], hints: ['Her paketteki bir şişenin fiyatını bul.'], explain: '54 ÷ 6 = 9 TL, 96 ÷ 12 = 8 TL. Fark 1 TL.' },
      { text: 'Bir kampta 128 öğrenci için 16 kişilik çadırlar kurulacak. Her çadır için 3 paket kazık gerekiyor. Toplam __ paket kazık gerekir.', answers: ['24'], hints: ['Önce kaç çadır gerektiğini bul.', 'Sonra her çadır için 3 paket düşün.'] },
    ],
  },

  // ── Geometrik Nicelikler ───────────────────────────────────────────────

  // MAT.5.4.1
  {
    id: 'g5-geometri-tahtasinda-dikdortgen',
    outcomes: ['MAT.5.4.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Çevresi verilen dikdörtgen',
    instructions: 'Çivilere dokunarak istenen dikdörtgeni oluştur. İki komşu çivi arası 1 birimdir.',
    level: 1,
    launch: { text: 'Elinde 12 metrelik bir çit var. Tavukların için dikdörtgen bir kümes alanı yapacaksın. Kaç farklı dikdörtgen yapabilirsin?' },
    reflect: 'Çevresi 12 birim olan kaç farklı dikdörtgen buldun? Hepsini bulduğundan nasıl emin olursun?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Çevresi 12 birim olan bir dikdörtgen oluştur.', target: { sides: 4, perimeter: 12, rect: true }, hints: ['Bir kısa ve bir uzun kenar birlikte çevrenin yarısını oluşturur. 12’nin yarısı kaç?', 'Toplamı 6 olan iki sayı düşün: 1 ile 5, 2 ile …'] },
      { prompt: 'Çevresi 12 birim olan bir kare oluştur.', target: { sides: 4, perimeter: 12, square: true }, hints: ['Karenin dört kenarı eşit. 12’yi kaç eş parçaya bölmelisin?'] },
      { prompt: 'Çevresi 16 birim olan bir dikdörtgen oluştur.', target: { sides: 4, perimeter: 16, rect: true }, hints: ['16’nın yarısı kaç? Toplamı bu sayı olan iki kenar seç.'] },
      { prompt: 'Çevresi 14 birim olan bir dikdörtgen oluştur. Kare oluşturabilir misin?', target: { sides: 4, perimeter: 14, rect: true }, explain: '14’ün yarısı 7. 7 iki eşit doğal sayıya ayrılamaz; bu yüzden kenarları doğal sayı olan ve çevresi 14 olan bir kare çizilemez.' },
    ],
  },
  {
    id: 'g5-cevresi-16-olanlar',
    outcomes: ['MAT.5.4.1'],
    type: 'categorize',
    stage: 'model',
    title: 'Çevresi 16 birim olanlar',
    instructions: 'Dikdörtgenlerin çevresini kenar uzunluklarından bul ve doğru gruba sürükle.',
    level: 1,
    launch: { text: 'Dört arkadaş, 16 birimlik birer iple dikdörtgen yaptı. Dikdörtgenleri birbirine hiç benzemiyor. Hepsi doğru yapmış olabilir mi?' },
    reflect: 'Çevresi 16 olan dikdörtgenlerin kenar uzunluklarında ortak olan neydi?',
    categories: [
      { id: 'evet', label: 'Çevresi 16 birim', color: '#22c55e' },
      { id: 'hayir', label: 'Çevresi 16 birim değil', color: '#ef4444' },
    ],
    items: [
      { content: { visual: area(7, 1, true, true) }, category: 'evet' },
      { content: { visual: area(6, 2, true, true) }, category: 'evet' },
      { content: { visual: area(5, 3, true, true) }, category: 'evet' },
      { content: { visual: area(4, 4, true, true) }, category: 'evet', explain: 'Kare de bir dikdörtgendir: 4 + 4 + 4 + 4 = 16.' },
      { content: { visual: area(8, 2, true, true) }, category: 'hayir', explain: '8 + 2 + 8 + 2 = 20 birim.' },
      { content: { visual: area(6, 3, true, true) }, category: 'hayir', explain: '6 + 3 + 6 + 3 = 18 birim.' },
      { content: { visual: area(5, 4, true, true) }, category: 'hayir', explain: '5 + 4 + 5 + 4 = 18 birim.' },
      { content: { visual: area(8, 1, true, true) }, category: 'hayir', explain: '8 + 1 + 8 + 1 = 18 birim.' },
    ],
  },
  {
    id: 'g5-cevreden-kenarlara',
    outcomes: ['MAT.5.4.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Çevreden kenarlara',
    instructions: 'Dikdörtgenin çevre uzunluğundan kenar uzunluklarını bul. Kenar uzunlukları doğal sayıdır.',
    level: 2,
    launch: { text: 'Bir bahçenin etrafı 20 metrelik tel ile çevrilmiş. Bahçenin bir kenarı 6 metre. Öbür kenarını ölçmeden bulabilir miyiz?' },
    reflect: 'Bir kısa ve bir uzun kenarın toplamının neden çevrenin yarısı olduğunu bir arkadaşına açıkla.',
    items: [
      { text: 'Çevresi 20 cm olan dikdörtgenin bir kenarı 6 cm ise diğer kenarı __ cm', answers: ['4'], hints: ['Çevrede bu 6 cm’lik kenardan kaç tane var?', 'Bir kısa ve bir uzun kenar çevrenin yarısını oluşturur. 20’nin yarısı kaç?'] },
      { text: 'Çevresi 24 cm olan karenin bir kenarı __ cm', answers: ['6'], hints: ['Karenin kaç eş kenarı var?'] },
      { text: 'Çevresi 30 m olan dikdörtgen bir bahçenin kısa ve uzun kenarlarının toplamı __ m', answers: ['15'] },
      { text: 'Çevresi 36 cm olan dikdörtgenin uzun kenarı 11 cm ise kısa kenarı __ cm', answers: ['7'] },
      { text: 'Çevresi 14 cm olan, kenar uzunlukları doğal sayı olan __ farklı dikdörtgen çizilebilir.', answers: ['3'], hints: ['Kısa ve uzun kenarın toplamı 7 olmalı.', 'Toplamı 7 olan sayı çiftlerini sırayla yaz: 1 ile 6, 2 ile 5, …'] },
      { text: 'Çevresi 16 cm olan, kenar uzunlukları doğal sayı olan __ farklı dikdörtgen çizilebilir (kare dâhil).', answers: ['4'] },
      { text: 'Uzun kenarı kısa kenarının 2 katı olan dikdörtgenin çevresi 18 cm ise kısa kenarı __ cm', answers: ['3'], visual: { kind: 'tape', parts: [{ label: 'kısa', value: 1 }, { label: 'uzun', value: 2 }], total: '9 cm' }, hints: ['Kısa + uzun = 9 cm. Şeritte 9 kaç eş parçaya bölünmüş?'] },
    ],
  },
  {
    id: 'g5-cevre-tartisma',
    outcomes: ['MAT.5.4.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Çevre hakkında düşünelim',
    instructions: 'Durumları incele, gerekçesiyle cevap ver.',
    level: 2,
    launch: { text: 'Ece çevresi 24 cm olan bir dikdörtgenin kenarlarını 10 cm ve 14 cm buldu. Arkadaşı “Hemen kontrol edelim!” dedi. Sence Ece’nin cevabı doğru mu?' },
    reflect: 'Bulduğun kenar uzunluklarının doğru olduğunu çevreyi yeniden hesaplayarak nasıl kontrol edersin?',
    questions: [
      {
        prompt: 'Çevresi 20 m olan dikdörtgen bir bahçenin kenar uzunlukları hangisi olamaz?',
        choices: ['8 m ve 12 m', '4 m ve 6 m', '1 m ve 9 m', '5 m ve 5 m'],
        answer: 0,
        feedback: [null, '2 × (4 + 6) = 20: bu olabilir.', '2 × (1 + 9) = 20: bu da olabilir.', 'Kare de bir dikdörtgendir: 4 × 5 = 20.'],
      },
      {
        prompt: 'Ece, çevresi 24 cm olan dikdörtgenin kenarlarını 10 cm ve 14 cm buldu. Ece’nin hatası nedir?',
        choices: ['Kenarların toplamını 24 aldı; oysa 24, iki kısa ve iki uzun kenarın toplamı.', 'Hata yok, cevap doğru.', 'Kenarları çarpmalıydı.', 'Kenarlar eşit olmalıydı.'],
        answer: 0,
        feedback: [null, 'Kontrol et: 10 + 14 + 10 + 14 kaç eder?', 'Kenarları çarpmak alanı verir, çevreyi değil.', 'Dikdörtgenin kenarları eşit olmak zorunda değildir.'],
      },
      {
        prompt: 'Kenarları doğal sayı olan, çevresi 18 cm olan bir kare çizilebilir mi?',
        choices: ['Hayır, 18 dört eş doğal sayıya ayrılamaz.', 'Evet, kenarı 4 cm olur.', 'Evet, kenarı 9 cm olur.', 'Evet, kenarı 6 cm olur.'],
        answer: 0,
        feedback: [null, '4 + 4 + 4 + 4 = 16, 18 değil.', '9 cm çevrenin yarısıdır; karenin dört kenarı var.', '6 + 6 + 6 + 6 = 24.'],
      },
      {
        prompt: 'Çevresi 12 cm olan, kenarları doğal sayı olan kaç farklı dikdörtgen vardır?',
        choices: ['3', '6', '2', '12'],
        answer: 0,
        feedback: [null, '1 × 5 ile 5 × 1 aynı dikdörtgendir; döndürünce üst üste gelir.', 'Kare de bir dikdörtgendir; 3 × 3’ü unuttun mu?', '12 çevrenin uzunluğudur, dikdörtgen sayısı değil.'],
      },
      {
        prompt: 'Bir dikdörtgenin kısa kenarı 1 cm uzatılıp uzun kenarı 1 cm kısaltılırsa çevresi ne olur?',
        choices: ['Değişmez.', '2 cm artar.', '2 cm azalır.', '4 cm artar.'],
        answer: 0,
        feedback: [null, 'Bir kenar uzarken diğeri aynı miktar kısaldı.', 'Kısalan kenar kadar başka bir kenar uzadı.', 'Her kenar 1 cm uzamadı.'],
      },
    ],
  },

  // MAT.5.4.2
  {
    id: 'g5-geometri-tahtasinda-alan',
    outcomes: ['MAT.5.4.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Birim karelerle dikdörtgen',
    instructions: 'Çivilere dokunarak dikdörtgen oluştur. Dört çivinin oluşturduğu küçük kare 1 birimkaredir.',
    level: 1,
    launch: { text: 'Bir masanın üstünü eş kare karolarla kaplayacağız. Karoları tek tek saymadan kaç tane gerektiğini bulabilir miyiz?' },
    reflect: 'Dikdörtgenin içindeki birim kareleri saymanın daha hızlı bir yolunu buldun mu? Nasıl?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Alanı 6 birimkare olan bir dikdörtgen oluştur.', target: { sides: 4, area: 6, rect: true }, hints: ['6 birim kareyi sıralara diz: her sırada kaç tane, kaç sıra?'] },
      { prompt: 'Alanı 12 birimkare olan bir dikdörtgen oluştur.', target: { sides: 4, area: 12, rect: true }, hints: ['Hangi iki sayının çarpımı 12 eder?'] },
      { prompt: 'Alanı 9 birimkare olan bir kare oluştur.', target: { sides: 4, area: 9, square: true }, hints: ['Kaç sıra ve her sırada kaç kare olursa kare biçimi oluşur?'] },
      { prompt: 'Alanı 8 birimkare olan bir dikdörtgen oluştur. Başka bir yolu var mı?', target: { sides: 4, area: 8, rect: true }, explain: '1 × 8 ya da 2 × 4: aynı alana sahip farklı dikdörtgenler olabilir.' },
    ],
  },
  {
    id: 'g5-birim-karelerle-alan',
    outcomes: ['MAT.5.4.2'],
    type: 'fill',
    stage: 'model',
    title: 'Birim kareleri say',
    instructions: 'Birim kareleri tek tek saymak yerine sıraları ve sütunları düşün.',
    level: 1,
    launch: { text: 'Bir yazı tahtasını 1 cm²’lik karelerle kaplamak saatler sürer. Bir sırada kaç kare olduğunu ve kaç sıra olduğunu bilsek işimiz kolaylaşır mı?', visual: area(6, 4) },
    reflect: 'Birim kare sayısı ile dikdörtgenin iki komşu kenarının uzunlukları arasında nasıl bir ilişki var?',
    items: [
      { text: 'Bir sırada __ birim kare ve __ sıra var. Alan: __ birimkare', answers: ['6', '4', '24'], visual: area(6, 4), hints: ['En üst sıradaki kareleri say.', 'Aynı sıradan kaç tane var?'] },
      { text: 'Alan: __ birimkare', answers: ['21'], visual: area(7, 3), hints: ['Her sırada 7 kare var. Kaç sıra var?'] },
      { text: 'Alan: __ birimkare', answers: ['25'], visual: area(5, 5) },
      { text: 'Alan: __ birimkare', answers: ['16'], visual: area(8, 2) },
      { text: 'Alan: __ birimkare', answers: ['36'], visual: area(9, 4), hints: ['9’ar kareden 4 sıra var. 9 × 4’ü 10 × 4’ten yararlanarak bulabilir misin?'] },
      { text: 'Birim kareler çizilmemiş. Kenarlar 4 birim ve 6 birim. Alan: __ birimkare', answers: ['24'], visual: area(4, 6, false, true), hints: ['Birim kareleri hayal et: bir sırada kaç tane olurdu? Kaç sıra olurdu?'] },
      { text: 'Bir defter kapağı 1 cm²’lik karelerle kaplanıyor: bir sırada 20 kare, 28 sıra var. __ kare gerekir.', answers: ['560'], hints: ['Aynı sıradan 28 tane var: hangi işlem?'] },
    ],
  },
  {
    id: 'g5-alan-bagintisi',
    outcomes: ['MAT.5.4.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Dikdörtgenin alanı',
    instructions: 'Alanı, iki komşu kenarın uzunluklarını çarparak bul.',
    level: 2,
    launch: { text: 'Sınıfın tabanını 1 m²’lik karolar kaplıyor. Karoları saymadan, yalnız iki duvarın uzunluğunu ölçerek alanı bulabilir miyiz?' },
    reflect: 'Bir dikdörtgeni iki parçaya ayırıp alanlarını toplamak neden işe yarar? Bu yöntem hangi işlem özelliğini hatırlatıyor?',
    items: [
      { text: 'Kenar uzunlukları 9 cm ve 7 cm olan dikdörtgenin alanı: __ cm²', answers: ['63'], hints: ['Bir sırada kaç birim kare, kaç sıra olurdu?'] },
      { text: 'Bir sınıfın tabanı 8 m × 6 m. Tabanın alanı: __ m²', answers: ['48'] },
      { text: 'Bir kenarı 12 cm olan karenin alanı: __ cm²', answers: ['144'], hints: ['Karenin komşu iki kenarı kaç santimetre?'] },
      { text: 'A(ABCD) = 45 cm² ve |AB| = 9 cm olan ABCD dikdörtgeninde |BC| = __ cm', answers: ['5'], hints: ['9 ile hangi sayıyı çarparsan 45 eder?'] },
      {
        text: '9 × 5’lik dikdörtgeni 3 × 5 ve __ × 5’lik iki parçaya ayırırsak alan 15 + __ = 45 birimkare olur.',
        answers: ['6', '30'],
        visual: splitArea(9, 5, 3),
        hints: ['Sarı parçanın kaç sütunu var?', 'Sarı parçada kaç birim kare var?'],
      },
      { text: 'Alanı 56 m² olan dikdörtgen bir tarlanın bir kenarı 7 m ise diğer kenarı: __ m', answers: ['8'] },
      { text: '12 × 15’lik dikdörtgeni 12 × 10 ve 12 × 5’lik parçalara ayırırsak alan 120 + __ = __ birimkare olur.', answers: ['60', '180'] },
    ],
  },
  {
    id: 'g5-alan-korunumu',
    outcomes: ['MAT.5.4.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Alan değişti mi?',
    instructions: 'Alanın ne olduğunu düşün: kaç birim kare ile kaplanıyor?',
    level: 2,
    launch: { text: 'Bir dikdörtgen kartonu ortadan kesip parçaları uç uca ekledik. Yeni şekil daha uzun görünüyor. Alanı büyüdü mü?' },
    reflect: 'Bir şeklin görünüşü değişince alanının değişip değişmediğine nasıl karar verirsin?',
    questions: [
      {
        prompt: '4 × 6’lık bir dikdörtgeni ortadan kesip parçaları uç uca ekleyerek 2 × 12’lik bir dikdörtgen yaptık. Alan ne oldu?',
        choices: ['Değişmedi.', 'Arttı.', 'Azaldı.', 'İki katına çıktı.'],
        answer: 0,
        feedback: [null, 'Yeni dikdörtgen daha uzun görünüyor ama hiç birim kare eklemedik.', 'Hiç birim kare atmadık.', 'Uzunluk iki katına çıktı ama genişlik yarıya indi.'],
      },
      {
        prompt: 'Bir masa büyük karolarla 6, küçük karolarla 24 karo ile kaplanıyor. Hangisi doğrudur?',
        choices: ['Masanın alanı aynıdır; küçük karo daha küçük bir birim olduğu için daha çok karo gerekir.', 'Küçük karolarla kaplayınca masa büyür.', 'Büyük karolarla ölçülen alan daha doğrudur.', 'İki ölçümden biri mutlaka yanlıştır.'],
        answer: 0,
        feedback: [null, 'Masa değişmedi; yalnızca ölçü birimi değişti.', 'İki ölçüm de doğru; birimleri farklı.', 'Birim küçüldükçe aynı alanı kaplamak için daha çok birim gerekir.'],
      },
      {
        prompt: 'Hangi dikdörtgenin alanı daha büyüktür?',
        choices: [{ visual: area(8, 2) }, { visual: area(4, 4) }, 'Alanları eşittir'],
        answer: 2,
        feedback: ['Daha uzun görünüyor ama birim kareleri say: 8’er kareden 2 sıra.', 'Birim kareleri say: 4’er kareden 4 sıra. Diğerinde kaç kare var?', null],
      },
      {
        prompt: 'Bir sınıfın tabanının alanını ölçmek için hangi birim daha uygundur?',
        choices: ['m²', 'cm²', 'm', 'cm'],
        answer: 0,
        feedback: [null, 'cm² ile de ölçebilirsin ama sayı çok büyük olur; daha büyük bir birim seç.', 'Metre bir uzunluk birimidir; alan için kare birim gerekir.', 'Santimetre bir uzunluk birimidir.'],
      },
      {
        prompt: 'Ali: “Kenarları 3 cm ve 4 cm olan dikdörtgenin alanı 3 + 4 = 7 cm².” Ali’nin hatası nedir?',
        choices: ['Kenarları çarpmalıydı: 3 sıra, her sırada 4 birim kare var.', 'Hata yok.', '2 × (3 + 4) yapmalıydı.', 'Birimi cm yazmalıydı.'],
        answer: 0,
        feedback: [null, 'Birim kareleri çizip say: 7 mi çıkıyor?', 'Bu işlem çevre uzunluğunu verir, alanı değil.', 'Alan kare birimle ölçülür; cm bir uzunluk birimidir.'],
      },
    ],
  },

  // MAT.5.4.3
  {
    id: 'g5-alan-cevre-tahtada',
    outcomes: ['MAT.5.4.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Hem alan hem çevre',
    instructions: 'Hem alanı hem çevresi istenen dikdörtgeni geometri tahtasında oluştur.',
    level: 2,
    launch: { text: '12 tane kare karonla bir bahçe yolu döşeyeceksin. Karoları farklı biçimlerde dizersen yolun kenarına koyacağın çitin uzunluğu değişir mi?' },
    reflect: 'Alanı 12 olan iki farklı dikdörtgenin çevreleri neden farklı çıktı?',
    tool: 'geoboard',
    config: { size: 8 },
    tasks: [
      { prompt: 'Alanı 12 birimkare, çevresi 14 birim olan dikdörtgeni oluştur.', target: { sides: 4, area: 12, perimeter: 14, rect: true }, hints: ['Çarpımı 12 olan sayı çiftlerini düşün: 1 ile 12, 2 ile 6, 3 ile 4.', 'Hangisinin toplamı 7 eder?'] },
      { prompt: 'Alanı 12 birimkare, çevresi 16 birim olan dikdörtgeni oluştur.', target: { sides: 4, area: 12, perimeter: 16, rect: true }, hints: ['Kenarların toplamı 8 olmalı. Hangi çift?'] },
      { prompt: 'Alanı 16 birimkare, çevresi 16 birim olan dikdörtgeni oluştur.', target: { sides: 4, area: 16, perimeter: 16, rect: true } },
      { prompt: 'Alanı 8 birimkare, çevresi 18 birim olan dikdörtgeni oluştur.', target: { sides: 4, area: 8, perimeter: 18, rect: true }, explain: '1 × 8: alanı küçük ama çevresi uzun! Uzun ve ince dikdörtgenlerin çevresi büyük olur.' },
    ],
  },
  {
    id: 'g5-alan-cevre-tablosu',
    outcomes: ['MAT.5.4.3'],
    type: 'fill',
    stage: 'model',
    title: 'Alan ve çevre tablosu',
    instructions: 'Alanı verilen dikdörtgenin çevresini, çevresi verilenin alanını bul.',
    level: 2,
    launch: { text: 'Alanı 36 m² olan bir oyun alanının çevresine çit çekilecek. Çit için en az parayı harcamak isteyen belediye hangi dikdörtgeni seçmeli?' },
    reflect: 'Tabloda kenarlar birbirine yaklaştıkça çevre nasıl değişti? Sence neden böyle oluyor?',
    items: [
      {
        text: 'Tabloya göre alanı 36 cm² olan dikdörtgenlerden en kısa çevreye sahip olanın çevresi __ cm',
        answers: ['24'],
        visual: { kind: 'table', headers: ['Kısa kenar (cm)', 'Uzun kenar (cm)', 'Alan (cm²)', 'Çevre (cm)'], rows: [[1, 36, 36, 74], [2, 18, 36, 40], [3, 12, 36, 30], [4, 9, 36, 26], [6, 6, 36, 24]] },
        hints: ['Çevre sütununda en küçük sayıyı bul.'],
      },
      { text: 'Alanı 20 cm², bir kenarı 4 cm olan dikdörtgenin çevresi: __ cm', answers: ['18'], visual: area(4, 5, false, true), hints: ['Önce diğer kenarı bul: 4 ile hangi sayının çarpımı 20?'] },
      { text: 'Çevresi 18 cm, bir kenarı 5 cm olan dikdörtgenin alanı: __ cm²', answers: ['20'], hints: ['Çevrenin yarısı kaç? Diğer kenar kaç olur?'] },
      { text: 'Alanı 30 cm², bir kenarı 5 cm olan dikdörtgenin çevresi: __ cm', answers: ['22'] },
      { text: 'Çevresi 28 cm olan karenin alanı: __ cm²', answers: ['49'], hints: ['Karenin bir kenarı kaç santimetre?'] },
      { text: 'Alanı 12 cm² olan, kenar uzunlukları doğal sayı olan __ farklı dikdörtgen vardır.', answers: ['3'], hints: ['Çarpımı 12 olan sayı çiftlerini sırayla yaz: 1 ile 12, 2 ile 6, …'] },
      { text: 'Çevresi 22 cm, bir kenarı 8 cm olan dikdörtgenin alanı: __ cm²', answers: ['24'] },
    ],
  },
  {
    id: 'g5-alan-cevre-sirala',
    outcomes: ['MAT.5.4.3'],
    type: 'sort',
    stage: 'sembol',
    title: 'Alan ve çevreye göre sırala',
    instructions: 'Dikdörtgenleri istenen ölçüye göre küçükten büyüğe sırala.',
    level: 3,
    launch: { text: 'Aynı alana sahip iki bahçeden biri uzun ve ince, diğeri kareye yakın. Hangisinin etrafına daha çok çit gerekir? Önce tahmin et!' },
    reflect: 'Alanı aynı olan dikdörtgenlerde hangisinin çevresi en kısa oldu? Çevresi aynı olanlarda hangisinin alanı en büyük oldu?',
    rounds: [
      { prompt: 'Alanı 24 cm² olan dikdörtgenleri çevre uzunluğuna göre küçükten büyüğe sırala.', items: ['4 cm × 6 cm', '3 cm × 8 cm', '2 cm × 12 cm', '1 cm × 24 cm'], ends: ['En kısa çevre', 'En uzun çevre'], hints: ['Her birinin çevresini hesapla: 2 × (kısa + uzun).'] },
      { prompt: 'Çevresi 20 cm olan dikdörtgenleri alanlarına göre küçükten büyüğe sırala.', items: ['1 cm × 9 cm', '2 cm × 8 cm', '3 cm × 7 cm', '4 cm × 6 cm', '5 cm × 5 cm'], ends: ['En küçük alan', 'En büyük alan'], explain: 'Alanlar: 9, 16, 21, 24 ve 25 cm². Kenarlar birbirine yaklaştıkça alan büyüyor.' },
      {
        prompt: 'Dikdörtgenleri alanlarına göre küçükten büyüğe sırala.',
        items: [{ visual: area(2, 3) }, { visual: area(4, 2) }, { visual: area(4, 3) }, { visual: area(5, 3) }],
        ends: ['En küçük alan', 'En büyük alan'],
      },
    ],
  },
  {
    id: 'g5-alan-cevre-iliskisi',
    outcomes: ['MAT.5.4.3'],
    type: 'categorize',
    stage: 'problem',
    title: 'Alan ve çevre: her zaman mı?',
    instructions: 'Her önermeyi örneklerle sına: her zaman mı doğru, bazen mi, asla mı?',
    level: 3,
    launch: { text: 'Can: “Çevresi büyük olan bahçenin alanı da büyüktür.” diyor. Bu önermeyi çürütecek bir örnek bulabilir misin?' },
    reflect: '“Bazen doğru” dediğin bir önerme için hem doğru hem yanlış olduğu birer dikdörtgen örneği ver.',
    categories: HBA,
    items: [
      { content: 'Alanları eşit iki dikdörtgenin çevreleri de eşittir.', category: 'bazen', explain: '2 × 6 ve 3 × 4: alanlar 12, çevreler 16 ve 14.' },
      { content: 'Çevreleri eşit iki dikdörtgenin alanları da eşittir.', category: 'bazen', explain: '1 × 5 ve 2 × 4: çevreler 12, alanlar 5 ve 8.' },
      { content: 'Çevresi daha uzun olan dikdörtgenin alanı daha büyüktür.', category: 'bazen', explain: '1 × 10’un çevresi 22, alanı 10; 4 × 5’in çevresi 18, alanı 20.' },
      { content: 'Aynı çevreye sahip dikdörtgenlerden kenarları birbirine en yakın olanın alanı en büyüktür.', category: 'her' },
      { content: 'Bir dikdörtgenin alanının ve çevresinin sayısal değerleri eşittir.', category: 'bazen', explain: '4 × 4’te ikisi de 16; 2 × 3’te alan 6, çevre 10.' },
      { content: 'Kenarları doğal sayı olan ve alanı 7 birimkare olan dikdörtgenin çevresi 16 birimdir.', category: 'her', explain: 'Alanı 7 olan tek dikdörtgen 1 × 7’dir; çevresi 16.' },
      { content: 'Çevresi 10 birim olan dikdörtgenin alanı 25 birimkaredir.', category: 'asla', explain: 'Çevresi 10 olan dikdörtgenler 1 × 4 ve 2 × 3; alanları 4 ve 6.' },
      { content: 'Bir dikdörtgenin bütün kenarları 2 katına çıkarsa çevresi de 2 katına çıkar.', category: 'her' },
      { content: 'Bir dikdörtgenin bütün kenarları 2 katına çıkarsa alanı da 2 katına çıkar.', category: 'asla', explain: 'Hem sıra sayısı hem her sıradaki kare sayısı 2 katına çıkar: alan 4 katına çıkar.' },
    ],
  },
  {
    id: 'g5-dikdortgenler-hangisi-farkli',
    outcomes: ['MAT.5.4.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Dikdörtgenler',
    instructions: 'Hangisi diğerlerinden farklı? Alanlara, çevrelere ve kenarlara bak. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: { text: 'Dört dikdörtgenin alanlarını ve çevrelerini hesapla. Bazı ilginç benzerlikler ve farklılıklar göreceksin.' },
    reflect: 'Seçtiğin dikdörtgenin farkını bulmak için alan mı, çevre mi, kenarlar mı hesapladın?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: [{ visual: area(4, 3) }, { visual: area(6, 2) }, { visual: area(4, 4) }, { visual: area(7, 1) }],
        answer: 0,
        reasons: [
          'Çevresi 14 birim olan tek dikdörtgen; diğerlerinin çevresi 16 birim.',
          'Uzun kenarı kısa kenarının 3 katı olan tek dikdörtgen.',
          'Kare olan tek şekil; alanı ve çevresi aynı sayı (16).',
          'Alanı tek sayı (7 birimkare) olan tek dikdörtgen.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['3 cm × 8 cm', '4 cm × 6 cm', '2 cm × 12 cm', '5 cm × 5 cm'],
        answer: 0,
        reasons: [
          'Bir kenarı tek, diğeri çift sayı olan tek dikdörtgen.',
          'Alanı 24 cm² olanlar arasında çevresi en kısa (20 cm) olan.',
          'Çevresi en uzun (28 cm) olan dikdörtgen.',
          'Alanı 24 cm² olmayan tek dikdörtgen; üstelik bir kare.',
        ],
      },
    ],
  },

  // MAT.5.4.4
  {
    id: 'g5-alan-cevre-cizimle',
    outcomes: ['MAT.5.4.4'],
    type: 'fill',
    stage: 'model',
    title: 'Çizimle problem çöz',
    instructions: 'Çizime bak: problem çevreyi mi soruyor, alanı mı? Sonra çöz. Kenar uzunlukları metredir.',
    level: 2,
    launch: { text: 'Bir zemin ustası işe başlamadan önce mutlaka bir çizim yapar. Çizim, ustanın neyi hesaplaması gerektiğini nasıl gösterir?' },
    reflect: 'Çizim, hangi problemde çevreyi hangisinde alanı bulman gerektiğine karar vermene nasıl yardım etti?',
    items: [
      { text: 'Şekildeki bahçenin çevresine 2 sıra tel çekilecek. __ m tel gerekir.', answers: ['96'], visual: area(15, 9, false, true), hints: ['Önce bir sıra tel için çevreyi bul.', 'Sonra iki sıra için ne yapmalısın?'] },
      { text: 'Şekildeki oda tabanı, metrekaresi 250 TL olan parkeyle kaplanacak. __ TL ödenir.', answers: ['3000|3.000'], visual: area(4, 3, false, true), hints: ['Parke tabanın kenarına mı döşenir, tamamına mı?'] },
      { text: 'Şekildeki avlu 1 m²’lik kare karolarla kaplanacak. __ karo gerekir.', answers: ['30'], visual: area(6, 5, true, true) },
      { text: 'Şekildeki tarlanın çevresine, köşelere de gelecek şekilde 1 m arayla direk dikilecek. __ direk gerekir.', answers: ['40'], visual: area(12, 8, false, true), hints: ['Önce çevreyi bul.', 'Kapalı bir şeklin etrafında yürürken her metrede bir direk dikersen başladığın yere dönünce kaç direk olur?'] },
      { text: 'Şekildeki 12 m × 7 m’lik havuzun çevresinde 1 m genişliğinde yürüme yolu var. Havuz ve yol birlikte __ m × __ m’lik bir dikdörtgen oluşturur.', answers: ['14', '9'], visual: area(12, 7, false, true), hints: ['Yol havuzun iki yanında da var. Uzun kenara kaç metre eklenir?'] },
      { text: 'Bu yürüme yolunun alanı: __ m²', answers: ['42'], visual: area(12, 7, false, true), hints: ['Büyük dikdörtgenin alanından havuzun alanını çıkar.'], explain: '14 × 9 = 126, 12 × 7 = 84. 126 − 84 = 42 m²' },
      { text: 'Ayşe 30 cm × 20 cm’lik resmine çerçeve yapacak. __ cm çıta gerekir.', answers: ['100'], hints: ['Çıta resmin kenarlarına mı gelir, üstüne mi?'] },
    ],
  },
  {
    id: 'g5-alan-mi-cevre-mi',
    outcomes: ['MAT.5.4.4'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Alan mı, çevre mi?',
    instructions: 'Her durumda çevre uzunluğunu mu, alanı mı hesaplamak gerekir? Doğru gruba sürükle.',
    level: 1,
    launch: { text: 'Bir aile yeni evine taşınıyor: halı alacaklar, süpürgelik döşetecekler, duvarları boyatacaklar. Her iş için hangi ölçüyü hesaplamalılar?' },
    reflect: 'Bir işin çevre mi alan mı gerektirdiğine karar verirken kendine hangi soruyu soruyorsun?',
    categories: [
      { id: 'cevre', label: 'Çevre uzunluğu', color: '#3b82f6' },
      { id: 'alan', label: 'Alan', color: '#f97316' },
    ],
    items: [
      { content: 'Bahçenin etrafına çit çekmek', category: 'cevre', explain: 'Çit kenarlar boyunca gider: çevre.' },
      { content: 'Odanın tabanını halıyla kaplamak', category: 'alan', explain: 'Halı yüzeyin tamamını kaplar: alan.' },
      { content: 'Duvar diplerine süpürgelik döşemek', category: 'cevre' },
      { content: 'Bir duvarı boyamak için gereken boyayı hesaplamak', category: 'alan' },
      { content: 'Bir resme çerçeve yapmak için gereken çıtayı bulmak', category: 'cevre' },
      { content: 'Banyo duvarına fayans döşemek', category: 'alan' },
      { content: 'Futbol sahasının etrafında bir tur koşmak', category: 'cevre' },
      { content: 'Bahçeye ekilecek çim tohumunun miktarını hesaplamak', category: 'alan' },
      { content: 'Masa örtüsünün kenarına dantel dikmek', category: 'cevre' },
      { content: 'Kitap kapağını kaplamak için gereken kâğıdı bulmak', category: 'alan' },
    ],
  },
  {
    id: 'g5-alan-cevre-karar',
    outcomes: ['MAT.5.4.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Düşün ve karar ver',
    instructions: 'Problemleri çöz; önce sonucu tahmin et.',
    level: 3,
    launch: { text: 'Elif’in 24 tane kare kartı var. Bunlarla kaç farklı dikdörtgen yapabileceğini merak ediyor.' },
    reflect: 'Hangi soruda ilk aklına gelen cevap yanlış çıktı? Seni doğru cevaba ne götürdü?',
    questions: [
      {
        prompt: 'Elif 24 tane 1 cm²’lik kare kartla dikdörtgen yapacak. Hangisini yapamaz?',
        choices: ['4 cm × 6 cm', '3 cm × 8 cm', '5 cm × 5 cm', '2 cm × 12 cm'],
        answer: 2,
        feedback: ['4 × 6 = 24 kart: bunu yapabilir.', '3 × 8 = 24 kart: bunu yapabilir.', null, '2 × 12 = 24 kart: bunu yapabilir.'],
      },
      {
        prompt: 'Dikdörtgen bir bahçenin uzunluğu 2 katına çıkarılır, genişliği aynı kalırsa alanı ne olur?',
        choices: ['Değişmez.', '2 katına çıkar.', '4 katına çıkar.', 'Yarıya iner.'],
        answer: 1,
        feedback: ['Bahçe uzadı; birim kare sayısı aynı kalır mı?', null, 'Yalnız bir kenar 2 katına çıktı; iki kenar da 2 kat olsaydı 4 kat olurdu.', 'Uzunluk arttı; alan küçülmez.'],
      },
      {
        prompt: 'Kenarları 6 m ve 4 m olan odanın duvar diplerine süpürgelik döşenecek. Kapı 1 m genişliğindeyse kaç metre süpürgelik gerekir?',
        choices: ['20 m', '19 m', '24 m', '23 m'],
        answer: 1,
        feedback: ['Kapının olduğu yere süpürgelik konur mu?', null, 'Bu sayı alanı (6 × 4) verir; süpürgelik ise kenarlara döşenir.', 'Alandan 1 çıkardın; süpürgelik kenarlara döşenir, önce çevreyi bul.'],
      },
      {
        prompt: 'Bir kenarı 8 cm olan kareyle aynı alana sahip, bir kenarı 4 cm olan dikdörtgenin çevresi kaç santimetredir?',
        choices: ['32 cm', '40 cm', '36 cm', '64 cm'],
        answer: 1,
        feedback: ['32 cm karenin çevresidir; aynı alan aynı çevre demek değildir.', null, 'Diğer kenar 64 ÷ 4 = 16 cm. Çevreyi yeniden hesapla: 2 × (16 + 4).', '64, alanın ölçüsüdür; çevre değil.'],
      },
      {
        prompt: 'Kenarları 10 m ve 6 m olan bahçenin yarısına çim ekiliyor. Çim ekilen alan kaç metrekaredir?',
        choices: ['16 m²', '32 m²', '60 m²', '30 m²'],
        answer: 3,
        feedback: ['16, kenarların toplamı; alan değil.', '32 m, bahçenin çevre uzunluğudur.', 'Bu bahçenin tamamı; yarısı soruluyor.', null],
      },
      {
        prompt: 'Bir dikdörtgenin her kenarı 1 cm uzatılırsa çevresi kaç santimetre artar?',
        choices: ['1 cm', '2 cm', '4 cm', '8 cm'],
        answer: 2,
        feedback: ['Dört kenarın her biri 1 cm uzadı.', 'Yalnız iki kenar değil, dört kenar da uzadı.', null, 'Her kenar 1 cm uzadı, 2 cm değil.'],
      },
    ],
  },
  {
    id: 'g5-alan-cevre-problemleri',
    outcomes: ['MAT.5.4.4'],
    type: 'fill',
    stage: 'problem',
    title: 'Usta işi problemler',
    instructions: 'Problemi oku, kendin bir şekil çiz, çevre mi alan mı istendiğine karar ver ve çöz.',
    level: 3,
    launch: { text: 'Bir zemin döşeme ustası olduğunu düşün. Müşteriler sana ölçüler veriyor; sen de ne kadar malzeme gerektiğini hesaplıyorsun.' },
    reflect: 'Bu problemlerden birini farklı bir yoldan çözebilir misin? İki yolu karşılaştır.',
    items: [
      { text: 'Kenarları 20 m ve 15 m olan dikdörtgen bir parkın çevresinde 2 tur koşan Ali __ m koşar.', answers: ['140'], hints: ['Bir tur, parkın çevre uzunluğu kadardır.'] },
      { text: 'Alanı 48 m² olan dikdörtgen bir odanın bir kenarı 6 m. Odanın çevresi: __ m', answers: ['28'], hints: ['Önce diğer kenarı bul.'] },
      { text: 'Çevresi 40 m olan kare şeklindeki parkın alanı: __ m²', answers: ['100'], hints: ['Karenin bir kenarı kaç metre?'] },
      { text: '8 m × 5 m’lik bir duvarda 2 m × 1 m’lik bir kapı var. Boyanacak alan: __ m²', answers: ['38'], hints: ['Kapı boyanır mı?', 'Duvarın alanından kapının alanını çıkar.'] },
      { text: '9 m × 4 m’lik bir koridor 1 m²’lik kare karolarla kaplanacak. Bir pakette 6 karo varsa __ paket gerekir.', answers: ['6'], hints: ['Önce kaç karo gerektiğini bul.'] },
      { text: 'Çevresi 30 cm olan bir dikdörtgenin uzun kenarı kısa kenarının 2 katı. Alanı: __ cm²', answers: ['50'], visual: { kind: 'tape', parts: [{ label: 'kısa', value: 1 }, { label: 'uzun', value: 2 }], total: '15 cm' }, hints: ['Kısa + uzun kenar = çevrenin yarısı = 15 cm.', 'Şeritte 15 cm kaç eş parçaya bölünmüş?'] },
      { text: 'Bir kenarı 6 m olan kare bahçe ile aynı alana sahip dikdörtgen bahçenin bir kenarı 4 m. Dikdörtgen bahçenin çevresi, kare bahçeninkinden __ m fazladır.', answers: ['2'], hints: ['Kare bahçenin alanı ve çevresi kaç?', 'Dikdörtgen bahçenin diğer kenarı kaç metre?'] },
    ],
  },

  // ── Sayılar ve Nicelikler (2) ──────────────────────────────────────────

  // MAT.5.1.3
  {
    id: 'g5-kesir-seritleri',
    outcomes: ['MAT.5.1.3'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Kesir şeridinde göster',
    instructions: 'Bütünü eş parçalara böl ve istenen kadarını boya.',
    level: 1,
    launch: { text: 'Bir çikolata 5 eş parçadan oluşuyor. 3 parçasını yedin. Bu kadarını kesirle, ondalık gösterimle ya da yüzdeyle nasıl söylersin?' },
    reflect: '0,4’ü gösterirken kaç parçalı şerit seçtin? Başka bir şeritle de gösterebilir miydin?',
    tool: 'fractions',
    config: { dens: [2, 3, 4, 5, 10] },
    tasks: [
      { prompt: '[[1/5]]’lik parçayı 3 kez yinele: [[3/5]] kesrini oluştur.', target: { num: 3, den: 5, exact: true }, hints: ['Şeridi kaç eş parçaya bölmelisin?', 'Kaç parça boyamalısın?'] },
      { prompt: '%50’yi kesir şeridinde göster.', target: { num: 1, den: 2 }, hints: ['%50, 100 eş parçanın 50’si demek. Bu, bütünün ne kadarı?'] },
      { prompt: '0,4’ü kesir şeridinde göster.', target: { num: 2, den: 5 }, hints: ['0,4 = [[4/10]]. Onda birlik şeritle deneyebilirsin.'], explain: '[[4/10]] = [[2/5]]: aynı uzunluk, farklı parçalar.' },
      { prompt: '%70’i onda birlik parçalarla göster.', target: { num: 7, den: 10, exact: true }, hints: ['%70 = [[70/100]]. Bu kaç tane onda bir eder?'] },
    ],
  },
  {
    id: 'g5-yuzluk-kart',
    outcomes: ['MAT.5.1.3'],
    type: 'fill',
    stage: 'model',
    title: 'Yüzlük kart',
    instructions: 'Yüzlük karttaki boyalı kısmı kesir, yüzde ve ondalık gösterimle yaz.',
    level: 1,
    launch: { text: 'Bir alışveriş fişinde “KDV %20” yazıyor. Yüzlük kartın 100 karesinden 20’sini boyarsak bu yüzdeyi görebilir miyiz?', visual: hundred(20) },
    reflect: 'Yüzlük kart, kesir, ondalık ve yüzde gösterimlerinin aynı büyüklüğü anlattığını görmene nasıl yardım etti?',
    items: [
      { text: 'Boyalı kısım [[35/100]]. Yüzde olarak %__, ondalık olarak __ yazılır.', answers: ['35', '0,35|0.35'], visual: hundred(35), hints: ['Yüzde, “100’de kaç” demektir.'] },
      { text: 'Boyalı kısım yüzde olarak %__, ondalık olarak __ yazılır.', answers: ['60', '0,6|0.6|0,60|0.60'], visual: hundred(60), hints: ['Kaç tam sıra boyalı? Her sıra kaç kare?'] },
      { text: 'Boyalı kısım yüzde olarak %__, ondalık olarak __ yazılır.', answers: ['7', '0,07|0.07'], visual: hundred(7), hints: ['7 kare, bir tam sıradan az mı?', 'Yüzde birlikleri yazarken virgülden sonra kaç rakam gerekir?'], explain: '[[7/100]] = 0,07. 0,7 olsaydı 70 kare boyalı olurdu.' },
      { text: 'Boyalı kısım bütünün yarısı: [[1/2]] = %__', answers: ['50'], visual: hundred(50) },
      { text: 'Boyalı kısım bütünün dörtte biri: [[1/4]] = %__', answers: ['25'], visual: hundred(25), hints: ['100 kareyi 4 eş parçaya böl: her parçada kaç kare var?'] },
      { text: '[[65/100]] = [[6/10]] + [[5/100]] = %60 + %__ = __', answers: ['5', '0,65|0.65'], visual: hundred(65), hints: ['6 tam sıra kaç kare eder? Geriye kaç kare kalır?'] },
      { text: 'Kartın tamamı boyalı: %__ = __ bütün', answers: ['100', '1'], visual: hundred(100) },
    ],
  },
  {
    id: 'g5-sayi-dogrusunda-kesir',
    outcomes: ['MAT.5.1.3'],
    type: 'quiz',
    stage: 'model',
    title: 'Sayı doğrusundaki kesir',
    instructions: '0 ile 1 arası kaç eş parçaya bölünmüş? Noktaya kadar kaç parça ilerlemiş? Ona göre kesri seç.',
    level: 2,
    launch: { text: 'Bir koşu parkurunun 0 ile 1 km arası eş parçalara bölünüp işaretlenmiş. Bir koşucunun nerede olduğunu kesirle nasıl söyleriz?', visual: { kind: 'numberline', min: 0, max: 2, step: 0.25, points: [1.25], labels: false, integerLabels: true } },
    reflect: 'Sayı doğrusunda kesri bulurken çentikleri mi saydın, aralıkları mı? Neden?',
    generator: { id: 'fractionOnLine', params: { improper: true, dens: [2, 3, 4, 5, 6, 8] }, count: 8 },
  },
  {
    id: 'g5-bilesik-ve-tam-sayili-kesir',
    outcomes: ['MAT.5.1.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Birim kesirleri say',
    instructions: 'Birim kesirleri sayarak bileşik ve tam sayılı kesirleri birbirine dönüştür.',
    level: 2,
    launch: { text: 'Annem 3 bütün ekmek ve bir yarım ekmek aldı. Bunu “kaç tane yarım ekmek” diye sayarsak kaç eder?' },
    reflect: 'Bileşik kesri tam sayılı kesre çevirirken kaç tane birim kesrin bir bütün ettiğini nasıl kullandın?',
    items: [
      { text: 'Modelde __ tane [[1/3]] boyalı. [[7/3]] = __ tam [[1/3]]', answers: ['7', '2'], visual: { kind: 'fraction', num: 7, den: 3, shape: 'circle' }, hints: ['Kaç tane üçte bir bir bütün eder?', '7 tane üçte birden kaç bütün çıkar? Geriye kaç tane kalır?'] },
      { text: '[[11/4]] = __ tam [[3/4]]', answers: ['2'], hints: ['4 tane dörtte bir 1 bütün eder. 11 dörtte birde kaç tane 4’lük grup var?'] },
      { text: '[[9/2]] = __ tam [[1/2]]', answers: ['4'] },
      { text: '[[2 3/5]] tam sayılı kesrinde __ tane [[1/5]] vardır.', answers: ['13'], hints: ['2 bütün kaç tane beşte bir eder?', 'Buna 3 tane daha ekle.'] },
      { text: '[[1 1/2]] bütünde __ tane [[1/2]] vardır.', answers: ['3'] },
      { text: '3 bütün ve [[1/2]] ekmek bileşik kesirle __ / 2 şeklinde yazılır.', answers: ['7'], hints: ['Her bütün ekmekte kaç yarım var?'] },
      { text: '[[17/5]] kesri 3 tam ile __ tane [[1/5]] eder.', answers: ['2'] },
    ],
  },
  {
    id: 'g5-kesir-ondalik-yuzde',
    outcomes: ['MAT.5.1.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Aynı büyüklük, farklı gösterim',
    instructions: 'Aynı büyüklüğü gösteren modeli ya da kesri, ondalık ya da yüzde gösterimiyle eşleştir.',
    level: 2,
    launch: { text: 'Bir pazarcı “yarım kilo” derken, terazi “0,5 kg” gösteriyor. İkisi aynı şeyi mi söylüyor?' },
    reflect: 'Hangi eşleştirmede modele bakmak, sembole bakmaktan daha kolaydı? Neden?',
    pairs: [
      { left: { visual: { kind: 'fraction', num: 1, den: 2, shape: 'bar' } }, right: '0,5' },
      { left: { visual: hundred(75) }, right: '%75' },
      { left: '[[3/10]]', right: '0,3' },
      { left: '[[65/100]]', right: '%65' },
      { left: '[[7/100]]', right: '0,07' },
      { left: { visual: { kind: 'fraction', num: 3, den: 2, shape: 'bar' } }, right: '[[1 1/2]]' },
      { left: '[[2/5]]', right: '%40' },
      { left: '[[1/4]]', right: '0,25' },
    ],
    perRound: 4,
  },
  {
    id: 'g5-gercek-yasamda-kesirler',
    outcomes: ['MAT.5.1.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Gerçek yaşamda kesirler',
    instructions: 'Günlük hayattaki kesir, ondalık ve yüzde gösterimlerini yorumla.',
    level: 2,
    launch: { text: 'Mağaza vitrinleri, hava durumu, alışveriş fişleri... Kesirler, ondalık gösterimler ve yüzdeler her yerde! Bugün bunları birbirine çevireceğiz.' },
    reflect: 'Bir indirimi kesirle mi yüzdeyle mi söylemek daha kullanışlı? Neden?',
    questions: [
      {
        prompt: 'Bir mağazada “Tüm ürünlerde %25 indirim” yazıyor. Bu indirim kesirle nasıl gösterilir?',
        choices: ['[[1/4]]', '[[1/25]]', '[[25/10]]', '[[2/5]]'],
        answer: 0,
        feedback: [null, '%25, 100 eş parçanın 25’i demektir; 25 eş parçanın 1’i değil.', '[[25/10]] bir bütünden fazladır; indirim ürünün fiyatından fazla olamaz.', '[[2/5]] = [[40/100]] = %40.'],
      },
      {
        prompt: 'Elif 1,5 litre su içti. Bu miktar tam sayılı kesirle nasıl yazılır?',
        choices: ['[[1 1/5]]', '[[1 1/2]]', '[[1/15]]', '[[5/10]]'],
        answer: 1,
        feedback: ['0,5 beşte bir değil, onda beştir; yani yarım.', null, 'Bu kesir 1’den çok küçük; Elif 1 litreden fazla su içti.', '[[5/10]] yarım litredir; 1 bütün eksik.'],
      },
      {
        prompt: '20 kişilik bir sınıfta 5 öğrenci gözlük takıyor. Gözlüklü öğrenciler sınıfın yüzde kaçıdır?',
        choices: ['%5', '%20', '%25', '%50'],
        answer: 2,
        feedback: ['5 kişi, 100 kişinin değil 20 kişinin içinden.', '%20 olsaydı 20 kişiden 4 kişi olurdu.', null, '%50 sınıfın yarısı, yani 10 kişi olurdu.'],
      },
      {
        prompt: 'Hava durumu raporunda “yağış olasılığı %40” deniyor. Bu oran ondalık gösterimle nasıl yazılır?',
        choices: ['0,04', '0,4', '4,0', '40'],
        answer: 1,
        feedback: ['0,04 = [[4/100]] = %4.', null, '4,0, 4 bütün demektir.', 'Yüzde işareti olmadan 40, 40 bütün demektir.'],
      },
      {
        prompt: 'Bir otoparkın onda yedisi ([[7/10]]) dolu. Otoparkın yüzde kaçı doludur?',
        choices: ['%7', '%17', '%70', '%710'],
        answer: 2,
        feedback: ['%7 = [[7/100]]; onda yedi değil.', 'Pay ile paydayı toplamak yüzdeyi vermez.', null, 'Sayıları yan yana yazmak yüzdeyi vermez. [[7/10]] = [[70/100]].'],
      },
      {
        prompt: 'Alışveriş fişinde KDV oranı %20 yazıyor. %20 hangi kesre eşittir?',
        choices: ['[[1/20]]', '[[1/5]]', '[[20/10]]', '[[1/2]]'],
        answer: 1,
        feedback: ['%20, 100 parçanın 20’sidir; 20 parçanın 1’i değil.', null, '[[20/10]] = 2 bütün eder.', '[[1/2]] = %50.'],
      },
      {
        prompt: 'Hangisi bir bütünden fazla olan bir büyüklüğü gösterir?',
        choices: ['[[7/4]]', '0,9', '%75', '[[4/7]]'],
        answer: 0,
        feedback: [null, '0,9 = [[9/10]]; 1’den küçük.', '%75 = [[3/4]]; 1’den küçük.', 'Payı paydasından küçük: 1’den küçük.'],
      },
    ],
  },
  {
    id: 'g5-kesirler-hangisi-farkli',
    outcomes: ['MAT.5.1.3'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Kesir gösterimleri',
    instructions: 'Hangisi diğerlerinden farklı? Değerlerine ve yazılış biçimlerine bak. Her seçenek bir gerekçeyle doğru olabilir!',
    level: 2,
    launch: { text: 'Dört kart da aynı büyüklüğü gösterebilir ama yine de birbirinden farklı olabilir. Bu nasıl olur?' },
    reflect: 'Aynı büyüklüğü gösteren gösterimlerden hangisini en çok kullanıyorsun? Neden?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['[[1/2]]', '0,5', '%50', '[[2/4]]'],
        answer: 0,
        reasons: [
          'Birim kesir olan tek gösterim (payı 1).',
          'Ondalık gösterimle yazılan tek seçenek.',
          'Yüzde ile yazılan tek seçenek.',
          'Payı 1’den büyük olan, sadeleştirilebilen tek kesir.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['[[3/4]]', '[[5/4]]', '0,75', '[[1 1/4]]'],
        answer: 0,
        reasons: [
          'Payı paydasından küçük olan tek kesir (basit kesir).',
          'Bileşik kesir olarak yazılan tek seçenek.',
          'Ondalık gösterimle yazılan tek seçenek.',
          'Tam sayılı kesir olarak yazılan tek seçenek.',
        ],
      },
    ],
  },

  // MAT.5.1.4
  {
    id: 'g5-sayi-dogrusunda-kesirler',
    outcomes: ['MAT.5.1.4'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sayı doğrusunda yerleştir',
    instructions: 'Sayı doğrusu 0,1’er artıyor. İstenen sayıyı işaretle; sonra komşu sayılarla karşılaştır.',
    level: 1,
    launch: { text: 'Bir termometrenin ölçeği gibi düşün: sayılar soldan sağa büyür. İki sayıdan hangisinin büyük olduğunu sayı doğrusundaki yerlerine bakarak söyleyebilir miyiz?' },
    reflect: '[[6/5]] ile 1,5’ten hangisi daha büyük? Sayı doğrusunda nasıl gördün?',
    tool: 'numberline',
    config: { min: 0, max: 2, step: 0.1 },
    tasks: [
      { prompt: '0,7’yi işaretle.', target: { value: 0.7 }, hints: ['0 ile 1 arası kaç eş parçaya bölünmüş?', 'Her parça 0,1. Kaç parça ilerlemelisin?'] },
      { prompt: '%30’u işaretle.', target: { value: 0.3 }, hints: ['%30 = [[30/100]] = [[3/10]].'] },
      { prompt: '[[1 1/2]] tam sayılı kesrini işaretle.', target: { value: 1.5 }, hints: ['Önce 1’i bul. Sonra 1 ile 2’nin tam ortasına git.'] },
      { prompt: '[[6/5]] bileşik kesrini işaretle.', target: { value: 1.2 }, hints: ['[[6/5]], 1 bütün ve [[1/5]] eder. [[1/5]] kaç onda bire eşittir?'], explain: '[[6/5]] = [[1 1/5]] = 1,2. Bu nokta 1,5’in solunda; yani [[6/5]] < [[1 1/2]].' },
    ],
  },
  {
    id: 'g5-referans-kesirler',
    outcomes: ['MAT.5.1.4'],
    type: 'quiz',
    stage: 'model',
    fixedOrder: true,
    title: '0’a mı, yarıma mı, 1’e mi yakın?',
    instructions: 'Kesri modelde incele ve 0’a mı, yarıma mı yoksa 1’e mi daha yakın olduğuna karar ver.',
    level: 1,
    launch: { text: 'Bir bardağın ne kadar dolu olduğunu söylerken “neredeyse boş”, “yarı yarıya”, “neredeyse dolu” deriz. Kesirleri de böyle referanslarla tahmin edebiliriz.' },
    reflect: 'Bir kesrin yarımdan büyük olup olmadığını payı ve paydasına bakarak nasıl hızlıca anlarsın?',
    generator: { id: 'benchmark', params: { dens: [5, 6, 8, 10, 12] }, count: 8 },
  },
  {
    id: 'g5-karsilastirma-stratejisi',
    outcomes: ['MAT.5.1.4'],
    type: 'quiz',
    stage: 'sembol',
    title: 'Karşılaştırma stratejileri',
    instructions: 'Ortak payda bulmadan karşılaştır: payları ya da paydaları aynı mı? 1’e ne kadar eksik? Yarımdan büyük mü?',
    level: 2,
    launch: { text: 'Kerem: “[[1/8]] daha büyük çünkü 8, 4’ten büyük.” dedi. Ayşe: “Bence [[1/4]] daha büyük.” dedi. Bir pizzayı düşünerek kimin haklı olduğunu nasıl gösterirsin?' },
    reflect: 'Bu sorularda hangi stratejileri kullandın? Hangisi sana en kullanışlı geldi?',
    questions: [
      {
        prompt: 'Hangisi daha büyük?',
        choices: ['[[1/4]]', '[[1/8]]', 'Eşittir'],
        answer: 0,
        feedback: [null, '8 > 4 ama payda büyüdükçe bütün daha çok parçaya bölünür; her parça küçülür.', 'Aynı bütünü 4’e ve 8’e böldüğünü hayal et; parçalar aynı büyüklükte mi?'],
      },
      {
        prompt: '[[3/7]] ile [[3/5]]: hangisi daha büyük?',
        choices: ['[[3/5]]', '[[3/7]]', 'Eşittir'],
        answer: 0,
        feedback: [null, 'İkisinde de 3 parça var ama yedide birlik parçalar beşte birlik parçalardan küçüktür.', 'Paylar aynı ama parçaların büyüklüğü aynı mı?'],
      },
      {
        prompt: '[[5/8]] ile [[7/8]]: hangisi daha büyük?',
        choices: ['[[7/8]]', '[[5/8]]', 'Eşittir'],
        answer: 0,
        feedback: [null, 'Parçalar aynı büyüklükte (sekizde bir). Hangisinde daha çok parça var?', 'Parçalar aynı büyüklükte ama sayıları farklı.'],
      },
      {
        prompt: '[[7/8]] ile [[8/9]]: hangisi daha büyük?',
        choices: ['[[8/9]]', '[[7/8]]', 'Eşittir'],
        answer: 0,
        feedback: [null, 'İkisinin de bütüne bir parçası eksik. Eksik parça [[1/8]] mi daha büyük, [[1/9]] mu?', 'Her ikisinde de bir parça eksik ama eksik parçalar aynı büyüklükte değil.'],
      },
      {
        prompt: '[[3/8]] ile [[4/7]]: hangisi daha büyük?',
        choices: ['[[4/7]]', '[[3/8]]', 'Eşittir'],
        answer: 0,
        feedback: [null, '[[3/8]] yarımdan az mı, fazla mı? Peki [[4/7]]?', 'Yarımla karşılaştır: biri yarımdan az, biri fazla.'],
      },
      {
        prompt: 'Kerem: “[[2/3]] < [[3/4]], çünkü 2 < 3 ve 3 < 4.” Kerem’in gerekçesi için ne söylenebilir?',
        choices: ['Sonuç doğru ama gerekçe yanlış; bu kural [[1/2]] ile [[2/5]] için yanlış sonuç verir.', 'Gerekçe her zaman doğrudur.', 'Sonuç yanlıştır, [[2/3]] daha büyüktür.'],
        answer: 0,
        feedback: [null, 'Bir karşı örnek dene: 1 < 2 ve 2 < 5, ama [[1/2]] > [[2/5]].', '[[2/3]]’nin bütüne [[1/3]], [[3/4]]’ün ise [[1/4]] eksiği var. Hangisi 1’e daha yakın?'],
      },
      {
        prompt: '0,2 ile 0,19: hangisi daha büyük?',
        choices: ['0,2', '0,19', 'Eşittir'],
        answer: 0,
        feedback: [null, '19 > 2 gibi görünüyor ama 0,2 = 0,20 = [[20/100]], 0,19 = [[19/100]].', '0,2’yi 0,20 olarak yaz ve karşılaştır.'],
      },
    ],
  },
  {
    id: 'g5-kesirleri-karsilastir',
    outcomes: ['MAT.5.1.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Büyük mü, küçük mü, eşit mi?',
    instructions: 'Farklı gösterimlerle verilen sayıları karşılaştır ve uygun işareti seç.',
    level: 2,
    launch: { text: 'Bir haberde “öğrencilerin %45’i”, başka bir haberde “öğrencilerin yarısı” yazıyor. Hangisi daha çok öğrenci demek?' },
    reflect: 'Kesir ile ondalık gösterimi karşılaştırırken hangisini hangisine çevirdin? Neden?',
    items: [
      { text: '[[3/4]]  __  0,7', answers: ['>'], choices: ['<', '=', '>'], hints: ['[[3/4]]’ü yüzlük kartta düşün: kaç kare eder?'] },
      { text: '%45  __  [[1/2]]', answers: ['<'], choices: ['<', '=', '>'], hints: ['Yarım yüzde kaçtır?'] },
      { text: '0,25  __  [[1/4]]', answers: ['='], choices: ['<', '=', '>'] },
      { text: '[[5/4]]  __  1,2', answers: ['>'], choices: ['<', '=', '>'], hints: ['[[5/4]] = 1 bütün ve [[1/4]]. [[1/4]] mü büyük, 0,2 mi?'] },
      { text: '1,5  __  [[3/2]]', answers: ['='], choices: ['<', '=', '>'] },
      { text: '2,3  __  2,30', answers: ['='], choices: ['<', '=', '>'], explain: '2,3 = 2 tam [[3/10]], 2,30 = 2 tam [[30/100]]. [[3/10]] = [[30/100]].' },
      { text: '[[5/6]]  __  [[6/7]]', answers: ['<'], choices: ['<', '=', '>'], hints: ['İkisinin de bütüne kaç eksiği var?', 'Eksik parça [[1/6]] mi daha büyük, [[1/7]] mi?'] },
      { text: '[[4/9]]  __  [[4/5]]', answers: ['<'], choices: ['<', '=', '>'], hints: ['Paylar aynı. Hangi kesrin parçaları daha büyük?'] },
    ],
  },
  {
    id: 'g5-kesirleri-sirala',
    outcomes: ['MAT.5.1.4'],
    type: 'sort',
    stage: 'sembol',
    title: 'Farklı gösterimleri sırala',
    instructions: 'Kesir, ondalık ve yüzde gösterimlerini küçükten büyüğe sırala. Sayı doğrusunu hayal et.',
    level: 3,
    launch: { text: 'Beş arkadaş aynı kitabın farklı bölümlerini okudu: biri “0,2’sini”, biri “%30’unu”, biri “beşte ikisini” okuduğunu söylüyor. Kim en çok okudu?' },
    reflect: '2,3 ile 2,4 arasına kaç sayı sığar? Ondalık gösterimler arasında hep yeni bir sayı bulabilir miyiz?',
    rounds: [
      { prompt: 'Küçükten büyüğe sırala.', items: ['0,2', '[[1/4]]', '%30', '[[2/5]]', '0,5'], ends: ['En küçük', 'En büyük'], hints: ['Hepsini yüzde ya da yüzde birlik olarak düşünmeyi dene.'] },
      { prompt: 'Küçükten büyüğe sırala.', items: ['[[3/4]]', '0,8', '%85', '[[9/10]]', '0,95'], ends: ['En küçük', 'En büyük'] },
      { prompt: '1’den büyük sayıları küçükten büyüğe sırala.', items: ['1,1', '[[5/4]]', '1,3', '[[3/2]]', '[[1 3/4]]'], ends: ['En küçük', 'En büyük'], hints: ['Hepsi 1 ile 2 arasında. 1’den sonra ne kadar ilerliyorlar?'] },
      { prompt: 'Ondalık gösterimleri küçükten büyüğe sırala.', items: ['2,3', '2,32', '2,36', '2,4'], ends: ['En küçük', 'En büyük'], explain: '2,3 = 2,30 ve 2,4 = 2,40. 2,32 ile 2,36 bu iki sayının arasına sığar.' },
    ],
  },
  {
    id: 'g5-kesir-karsilastirma-problemleri',
    outcomes: ['MAT.5.1.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Kim daha çok?',
    instructions: 'Gerçek yaşam durumlarında kesirleri karşılaştır ve gerekçeni düşün.',
    level: 2,
    launch: { text: 'İki kardeşe bir tarla paylaştırıldı: biri tarlanın beşte ikisini, öbürü %45’ini aldı. Paylaşım adil mi? Nasıl karar verirsin?' },
    reflect: 'Bu problemlerde karşılaştırmayı yaparken hangi gösterime çevirmeyi tercih ettin: kesir mi, ondalık mı, yüzde mi?',
    questions: [
      {
        prompt: 'Ayşe kitabının beşte üçünü ([[3/5]]), Can aynı kitabın %55’ini okudu. Kim daha çok okudu?',
        choices: ['Ayşe', 'Can', 'Eşit okudular'],
        answer: 0,
        feedback: [null, '55 sayısı büyük görünüyor ama [[3/5]] = [[60/100]] = %60.', '[[3/5]]’ü yüzdeye çevir: 100 parçada kaç parça eder?'],
      },
      {
        prompt: '20 kişilik bir sınıfta 5 öğrenci basketbolu, 10 öğrenci voleybolu, 5 öğrenci tenisi seviyor. Sınıfın yarısı hangi sporu seviyor?',
        choices: ['Basketbol', 'Voleybol', 'Tenis'],
        answer: 1,
        feedback: ['[[5/20]] sınıfın dörtte biridir.', null, '[[5/20]] sınıfın dörtte biridir.'],
      },
      {
        prompt: 'Hangi kesir 1’e en yakındır?',
        choices: ['[[3/4]]', '[[5/6]]', '[[7/8]]', '[[2/3]]'],
        answer: 2,
        feedback: ['[[3/4]]’ün 1’e [[1/4]] eksiği var. Daha küçük eksiği olan var mı?', '[[5/6]]’in 1’e [[1/6]] eksiği var. Daha küçük eksiği olan var mı?', null, '[[2/3]]’nin 1’e [[1/3]] eksiği var; bu en büyük eksik.'],
      },
      {
        prompt: '0,2 ile 0,21’den hangisi 0,19’a daha yakındır?',
        choices: ['0,2', '0,21', 'İkisi eşit uzaklıkta'],
        answer: 0,
        feedback: [null, 'Sayıları yüzde birlik olarak yaz: 0,19; 0,20; 0,21. 0,19’dan kaçar adım uzaktalar?', 'Sayıları yüzde birlik olarak yaz: 0,19; 0,20; 0,21. Uzaklıklar eşit mi?'],
      },
      {
        prompt: 'A markasının 1 kg peyniri 312,5 TL, B markasının 1 kg peyniri 312,45 TL. Hangisi daha ucuzdur?',
        choices: ['A markası', 'B markası', 'Fiyatları aynı'],
        answer: 1,
        feedback: ['312,5’i 312,50 olarak yaz ve 312,45 ile karşılaştır.', null, 'Kuruşları karşılaştır: 50 kuruş ile 45 kuruş aynı mı?'],
      },
      {
        prompt: 'İki kardeşten Ali tarlanın beşte ikisini ([[2/5]]), Zeynep %45’ini aldı. Paylaşım için ne söylenebilir?',
        choices: ['Ali’nin payı daha büyüktür.', 'Payları eşittir.', 'Zeynep’in payı daha büyüktür.'],
        answer: 2,
        feedback: ['[[2/5]]’yi yüzdeye çevir: 100 parçada kaç parça eder?', '[[2/5]] = %40. %40 ile %45 eşit mi?', null],
      },
      {
        prompt: 'Ece pastanın sekizde üçünü ([[3/8]]), Mert üçte birini ([[1/3]]) yedi. Kim daha çok yedi?',
        choices: ['Ece', 'Mert', 'Eşit yediler'],
        answer: 0,
        feedback: [null, '[[1/3]]’in parçaları büyük ama yalnız bir parça. [[3/8]] ise sekizde birlik 3 parça. Yarıma göre ikisi de nerede?', 'Pastayı 24 eş parçaya bölmeyi düşün: Ece 9, Mert 8 parça yemiş olur.'],
      },
    ],
  },

  // ── İstatistiksel Araştırma Süreci ─────────────────────────────────────

  // MAT.5.5.1
  {
    id: 'g5-sutun-grafigi-olustur',
    outcomes: ['MAT.5.5.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Sütun grafiği oluştur',
    instructions: 'Verilen sıklıklara göre sütunların yüksekliğini ayarla.',
    level: 1,
    launch: { text: 'Sınıfınızda okula nasıl gelindiğini merak ettiniz ve herkese sordunuz. Cevapları bir bakışta görmek için ne yapabilirsiniz?' },
    reflect: 'Grafiği oluşturduktan sonra tabloya bakmadan hangi soruları cevaplayabildin?',
    tool: 'bargraph',
    tasks: [
      { prompt: '5-A sınıfında okula geliş şekli: Yürüyerek 8, Servis 6, Otobüs 4, Özel araç 3. Sütun grafiğini oluştur.', target: { data: [{ label: 'Yürüyerek', value: 8 }, { label: 'Servis', value: 6 }, { label: 'Otobüs', value: 4 }, { label: 'Özel araç', value: 3 }] } },
      { prompt: 'Kütüphaneden bir haftada ödünç alınan kitap türleri: Macera 9, Bilim 5, Şiir 2, Masal 7. Sütun grafiğini oluştur.', target: { data: [{ label: 'Macera', value: 9 }, { label: 'Bilim', value: 5 }, { label: 'Şiir', value: 2 }, { label: 'Masal', value: 7 }] } },
      { prompt: 'Okulun geri dönüşüm kutularında toplanan atıklar (kg): Kâğıt 10, Plastik 7, Cam 4, Metal 2. Sütun grafiğini oluştur.', target: { data: [{ label: 'Kâğıt', value: 10 }, { label: 'Plastik', value: 7 }, { label: 'Cam', value: 4 }, { label: 'Metal', value: 2 }] }, explain: 'Sütunların yükseklikleri sıklıkları gösterir; en uzun sütun verinin en çok yoğunlaştığı kategoridir.' },
    ],
  },
  {
    id: 'g5-grafik-ve-tablo-oku',
    outcomes: ['MAT.5.5.1'],
    type: 'fill',
    stage: 'model',
    title: 'Grafik ve tablo oku',
    instructions: 'Sütun grafiği, sıklık tablosu ve daire grafiğindeki verileri yorumla.',
    level: 1,
    launch: { text: '5-B sınıfı en sevdiği sporu araştırdı ve sonuçları bir sütun grafiğiyle gösterdi. Grafik bize neler anlatıyor?', visual: SPOR_GRAFIGI },
    reflect: 'Daire grafiği ile sütun grafiği aynı soruya farklı biçimde nasıl cevap veriyor?',
    items: [
      { text: 'Ankete __ öğrenci katılmıştır.', answers: ['24'], visual: SPOR_GRAFIGI, hints: ['Her sütunun gösterdiği sayıyı oku ve topla.'] },
      { text: 'En çok tercih edilen spor: __', answers: ['Futbol'], choices: ['Futbol', 'Voleybol', 'Basketbol', 'Yüzme'], visual: SPOR_GRAFIGI },
      { text: 'Futbolu seçenler, yüzmeyi seçenlerden __ kişi fazladır.', answers: ['6'], visual: SPOR_GRAFIGI },
      { text: 'Verinin en çok yoğunlaştığı kategori: __', answers: ['Mavi'], choices: ['Mavi', 'Kırmızı', 'Yeşil', 'Sarı'], visual: RENK_TABLOSU },
      { text: 'Tabloya göre yeşili ya da sarıyı seçen __ öğrenci vardır.', answers: ['10'], visual: RENK_TABLOSU },
      { text: 'Daire grafiği 40 öğrencinin okula geliş şeklini gösteriyor. Yürüyerek gelenler dairenin yarısı: __ öğrenci', answers: ['20'], visual: DAIRE_GRAFIGI, hints: ['40’ın yarısı kaç?'] },
      { text: 'Aynı grafikte servisle gelenler dairenin dörtte biri: __ öğrenci', answers: ['10'], visual: DAIRE_GRAFIGI, hints: ['40 öğrenciyi 4 eş gruba ayır.'] },
    ],
  },
  {
    id: 'g5-istatistiksel-arastirma-adimlari',
    outcomes: ['MAT.5.5.1'],
    type: 'sort',
    stage: 'sembol',
    title: 'Araştırma sürecinin adımları',
    instructions: 'İstatistiksel araştırma sürecinin adımlarını doğru sıraya koy.',
    level: 1,
    launch: { text: 'Okul kantininde hangi yiyeceklerin satılacağına öğrencilerin tercihlerine bakarak karar vermek istiyoruz. Nereden başlamalıyız?' },
    reflect: 'Araştırma sorusu iyi kurulmazsa sonraki adımlarda neler ters gidebilir?',
    rounds: [
      { prompt: 'İstatistiksel araştırma sürecini sırala.', items: ['Araştırma sorusunu oluştur', 'Veri toplama planı yap', 'Anketle veri topla', 'Veriyi tablo ve grafikle görselleştir', 'Veriyi analiz et', 'Sonuçları yorumla ve sun'] },
      {
        prompt: '“5-A sınıfı en çok hangi meyveyi seviyor?” araştırmasının adımlarını sırala.',
        items: ['Seçenekleri (elma, muz, çilek, portakal) içeren anket sorusunu hazırla', 'Anketi sınıftaki her öğrenciye uygula', 'Cevapları sıklık tablosuna işle', 'Sütun grafiğini çiz', 'En çok seçilen meyveyi belirle ve sonucu açıkla'],
        hints: ['Veri toplamadan önce ne hazırlanmalı?', 'Grafik çizmek için önce verinin nerede toplanmış olması gerekir?'],
      },
    ],
  },
  {
    id: 'g5-arastirma-sorusu-mu',
    outcomes: ['MAT.5.5.1'],
    type: 'categorize',
    stage: 'problem',
    title: 'Araştırma sorusu mu?',
    instructions: 'Veri toplanarak cevaplanabilen ve cevapları kişiden kişiye değişen soruları “İstatistiksel araştırma sorusu” grubuna, diğerlerini “Değil” grubuna sürükle.',
    level: 2,
    launch: { text: '“Ali kaç yaşında?” ile “Sınıfımızdaki öğrenciler kaç yaşında?” sorularından hangisini cevaplamak için birçok kişiden veri toplamamız gerekir?' },
    reflect: 'Kendi okulunla ilgili bir istatistiksel araştırma sorusu yaz. Cevapların neden farklı farklı olacağını açıkla.',
    categories: [
      { id: 'evet', label: 'İstatistiksel araştırma sorusu', color: '#22c55e' },
      { id: 'hayir', label: 'Değil', color: '#ef4444' },
    ],
    items: [
      { content: 'Sınıfımızdaki öğrenciler en çok hangi sporu seviyor?', category: 'evet' },
      { content: 'Okulumuzdaki öğrenciler okula en çok hangi ulaşım aracıyla geliyor?', category: 'evet' },
      { content: '5-A sınıfında en çok sevilen meyve hangisi?', category: 'evet' },
      { content: 'Mahallemizdeki aileler en çok hangi atıkları geri dönüştürüyor?', category: 'evet' },
      { content: 'Ali kaç yaşında?', category: 'hayir', explain: 'Tek bir kişiye sorarak cevaplanır; cevap değişkenlik göstermez.' },
      { content: 'Türkiye’nin başkenti neresidir?', category: 'hayir', explain: 'Cevabı tek ve kesindir; veri toplamaya gerek yok.' },
      { content: 'Mehmet’in en sevdiği renk hangisi?', category: 'hayir', explain: 'Yalnız bir kişinin tercihi soruluyor.' },
      { content: 'Bir haftada kaç gün vardır?', category: 'hayir' },
    ],
  },
  {
    id: 'g5-veri-gorsellestirme',
    outcomes: ['MAT.5.5.1'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangi grafik, hangi anket?',
    instructions: 'Araştırmanın her adımı için doğru aracı ve doğru soruyu seç.',
    level: 2,
    launch: { text: 'Sınıf başkanlığı seçiminde oyların adaylara nasıl dağıldığını herkese göstereceksin. Hangi grafik bunu en iyi anlatır?' },
    reflect: 'Daire grafiğini hangi durumlarda, sütun grafiğini hangi durumlarda seçersin? Birer örnek ver.',
    questions: [
      {
        prompt: 'Bir bütünün parçalara nasıl dağıldığını (parça-bütün ilişkisini) göstermek için en uygun grafik hangisidir?',
        choices: ['Sütun grafiği', 'Daire grafiği', 'Nokta grafiği', 'Çetele tablosu'],
        answer: 1,
        feedback: ['Sütun grafiği kategorileri karşılaştırır ama bütünü tek parça olarak göstermez.', null, 'Nokta grafiği her veriyi tek tek gösterir; bütünün parçalarını değil.', 'Çetele veriyi sayarken kullanılır; bir grafik değildir.'],
      },
      {
        prompt: 'Kategorilerin sıklıklarını yan yana karşılaştırmak için en uygun grafik hangisidir?',
        choices: ['Sütun grafiği', 'Daire grafiği', 'Saat', 'Sayı doğrusu'],
        answer: 0,
        feedback: [null, 'Daire grafiği parça-bütün ilişkisini gösterir; yakın sıklıkları karşılaştırmak zor olabilir.', 'Saat zamanı gösterir, veri dağılımını değil.', 'Sayı doğrusu sayıları sıralar; kategorileri karşılaştırmaz.'],
      },
      {
        prompt: { text: 'Grafiğe göre öğrencilerin en çok kullandığı ulaşım şekli hangisidir?', visual: DAIRE_GRAFIGI },
        choices: ['Servis', 'Özel araç', 'Yürüyerek'],
        answer: 2,
        feedback: ['Servis dairenin dörtte biri. Daha büyük bir dilim var mı?', 'Özel araç dairenin dörtte biri. Daha büyük bir dilim var mı?', null],
      },
      {
        prompt: 'Araştırma sorusu: “Sınıfımız en çok hangi tür kitabı okuyor?” Hangisi uygun bir anket sorusudur?',
        choices: ['Kitap okumayı seviyor musun?', 'En çok okuduğun kitap türü hangisi? (Macera / Bilim / Masal / Şiir / Diğer)', 'Kaç yaşındasın?', 'En sevdiğin renk hangisi?'],
        answer: 1,
        feedback: ['Bu soru kitap türünü öğrenmemizi sağlamaz.', null, 'Yaş, kitap türüyle ilgili bilgi vermez.', 'Bu soru araştırma sorusuyla ilgili değil.'],
      },
      {
        prompt: 'Sıklık değeri neyi gösterir?',
        choices: ['Bir kategorinin veride kaç kez tekrarlandığını', 'Grafiğin rengini', 'Ankete katılmayanların sayısını', 'Anket sorusunun uzunluğunu'],
        answer: 0,
        feedback: [null, 'Renk yalnızca görseldir; bilgi taşımaz.', 'Sıklık, cevap verenlerden gelir.', 'Sıklık, cevapların sayısıyla ilgilidir.'],
      },
      {
        prompt: 'Anket yaparken kişisel bilgilerin gizliliğini korumak için ne yapılmalıdır?',
        choices: ['Cevaplar isimleriyle panoya asılmalı.', 'Arkadaşların cevapları herkese söylenmeli.', 'Ankette isim istenmemeli.', 'Yalnızca yakın arkadaşlara sorulmalı.'],
        answer: 2,
        feedback: ['İsimler görünürse kişilerin gizliliği korunmaz.', 'Cevaplar kişiye özeldir; sonuçlar toplu olarak paylaşılır.', null, 'Yalnız yakın arkadaşlara sormak sonucu yanlı yapar ve gizliliği de korumaz.'],
      },
    ],
  },
  {
    id: 'g5-veri-hangisi-farkli',
    outcomes: ['MAT.5.5.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Veri gösterimleri',
    instructions: 'Hangisi diğerlerinden farklı? İstediğini seç ve gerekçeni düşün. Birden çok doğru cevap var!',
    level: 2,
    launch: { text: 'Aynı veriyi tabloyla, sütunlarla, noktalarla ya da bir daireyle gösterebiliriz. Her birinin bir “süper gücü” var.' },
    reflect: 'Seçtiğin gösterimin “süper gücü” ne? Hangi araştırmada onu kullanırdın?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Sütun grafiği', 'Daire grafiği', 'Nokta grafiği', 'Sıklık tablosu'],
        answer: 0,
        reasons: [
          'Sıklıkları dikdörtgen sütunların yüksekliğiyle gösteren tek gösterim.',
          'Bütünü dilimlere ayırarak parça-bütün ilişkisini gösteren tek gösterim.',
          'Her veriyi tek tek bir noktayla gösteren tek gösterim.',
          'Grafik olmayan, sıklıkları sayılarla yazan tek gösterim.',
        ],
      },
    ],
  },

  // MAT.5.5.2
  {
    id: 'g5-yaniltici-grafik',
    outcomes: ['MAT.5.5.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Grafik doğru mu anlatıyor?',
    instructions: 'Grafikleri dikkatle incele: eksenler, birimler, toplamlar. Yanıltıcı bir şey var mı?',
    level: 2,
    launch: { text: 'Bir reklamda B markasının sütunu A’nınkinin iki katı uzunlukta. Reklamcı “B, A’nın iki katı satıyor!” diyor. Grafiğe hemen inanmalı mıyız?', visual: YANILTICI_GRAFIK },
    reflect: 'Bir grafiğin yanıltıcı olup olmadığını anlamak için önce nerelere bakarsın?',
    questions: [
      {
        prompt: { text: 'A ve B markalarının satışları. B’nin sütunu A’nınkinin 2 katı uzunlukta. B markası A’nın 2 katı mı satmış?', visual: YANILTICI_GRAFIK },
        choices: ['Evet, sütunu 2 kat uzun.', 'Grafikten hiçbir şey anlaşılmaz.', 'Hayır, A daha çok satmış.', 'Hayır; A 95, B 100 satmış. Eksen 90’dan başladığı için fark büyük görünüyor.'],
        answer: 3,
        feedback: ['Dikey eksenin nereden başladığına bak: 0’dan mı, 90’dan mı?', 'Eksendeki sayıları okuyarak her markanın satışını bulabilirsin.', 'B’nin sütunu daha uzun; eksen sayılarını oku.', null],
      },
      {
        prompt: { text: 'Bir haberde bu daire grafiği verilmiş. Dilimlerde %50, %40 ve %30 yazıyor. Grafikte nasıl bir hata var?', visual: HATALI_DAIRE },
        choices: ['Yüzdelerin toplamı %120; bir bütünün parçalarının toplamı %100 olmalı.', 'Hata yok.', 'Dilimler farklı renkte olmamalı.', 'Daire grafiğinde yüzde kullanılmaz.'],
        answer: 0,
        feedback: [null, 'Yüzdeleri topla: 50 + 40 + 30 kaç eder?', 'Renkler kategorileri ayırmaya yardım eder; sorun başka yerde.', 'Daire grafiğinde yüzde kullanılabilir; ama toplamlarına dikkat!'],
      },
      {
        prompt: { text: 'Resim grafiğinde her 🍎 simgesi 2 öğrenciyi gösteriyor. Selin: “Elmayı 4 kişi seçmiş.” diyor. Selin haklı mı?', visual: { kind: 'pictograph', data: [{ label: 'Elma', value: 8 }, { label: 'Muz', value: 4 }], icon: '🍎', unit: 2 } },
        choices: ['Hayır; 4 simge × 2 = 8 kişi seçmiş.', 'Evet; 4 simge var.', 'Hayır; 2 kişi seçmiş.'],
        answer: 0,
        feedback: [null, 'Simgeleri saydın ama her simgenin kaç öğrenciyi gösterdiğini unuttun.', 'Her simge 2 öğrenci; kaç simge var?'],
      },
      {
        prompt: {
          text: '5-A sınıfı 30, 5-B sınıfı 16 kişi. Grafikte futbolu seçenler görülüyor. Emre: “5-A’da futbol daha çok seviliyor.” Bu yorum için ne söylenebilir?',
          visual: { kind: 'bars', title: 'Futbolu seçen öğrenci sayısı', unit: 'öğrenci', data: [{ label: '5-A', value: 12 }, { label: '5-B', value: 8 }] },
        },
        choices: ['Yorum yanıltıcı; 5-B’de sınıfın yarısı (16 kişiden 8’i), 5-A’da yarısından azı (30 kişiden 12’si) futbolu seçmiş.', 'Yorum doğru, çünkü 12 > 8.', 'Yorum yanlış, çünkü 5-B daha kalabalık.'],
        answer: 0,
        feedback: [null, 'Sınıfların mevcutları farklı. Her sınıfın ne kadarının futbolu seçtiğini karşılaştır.', '5-B daha kalabalık değil; 5-A 30, 5-B 16 kişi.'],
      },
      {
        prompt: { text: 'Okulun sitesinde “Öğrencilerimizin çoğu kantini beğeniyor!” yazıyor ve yanında yalnız bu grafik var. Grafikte ne eksik?', visual: { kind: 'bars', title: 'Kantin anketi', unit: 'öğrenci', data: [{ label: 'Beğenenler', value: 40 }] } },
        choices: ['Beğenmeyenlerin ve ankete katılanların sayısı da gösterilmeli; tek sütunla “çoğu” denemez.', 'Hiçbir şey eksik değil; 40 kişi çok fazla.', 'Sütun daha renkli olmalı.'],
        answer: 0,
        feedback: [null, '40 kişi, 50 kişinin çoğu olabilir ama 500 kişinin çoğu olamaz. Toplamı bilmeden karar verebilir misin?', 'Renk bilgi taşımaz; eksik olan bir veri.'],
      },
    ],
  },
  {
    id: 'g5-kabul-mu-curut-mu',
    outcomes: ['MAT.5.5.2'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Kabul et ya da çürüt',
    instructions: '5-A sınıfındaki 30 öğrenciye en sevdiği meyve soruldu: Elma 12, Muz 8, Çilek 6, Portakal 4. Her yorumu doğru gruba sürükle.',
    level: 3,
    launch: { text: 'Bir sınıfın meyve anketinin sonuçlarına bakan öğrenciler farklı yorumlar yaptı. Hangi yorumlara veriler gerçekten destek veriyor?', visual: { kind: 'table', headers: ['Meyve', 'Sıklık'], rows: [['Elma', 12], ['Muz', 8], ['Çilek', 6], ['Portakal', 4]] } },
    reflect: '“Veri yetersiz” dediğin bir yorumu doğrulamak için hangi verileri toplaman gerekirdi?',
    categories: [
      { id: 'kabul', label: 'Kabul edilir', color: '#22c55e' },
      { id: 'curut', label: 'Çürütülür', color: '#ef4444' },
      { id: 'yetersiz', label: 'Veri yetersiz', color: '#64748b' },
    ],
    items: [
      { content: 'Elmayı seçenler, muzu seçenlerden 4 kişi fazladır.', category: 'kabul' },
      { content: 'Çileği ve portakalı seçenlerin toplamı, muzu seçenlerden fazladır.', category: 'kabul', explain: '6 + 4 = 10 ve 10 > 8.' },
      { content: 'En az tercih edilen meyve portakaldır.', category: 'kabul' },
      { content: 'Sınıfın beşte ikisi ([[2/5]]) elmayı seçmiştir.', category: 'kabul', explain: '12 kişi, 30 kişinin beşte ikisidir: 30’u 5 eş gruba ayırırsan her grup 6 kişi, 2 grup 12 kişi.' },
      { content: 'Sınıfın yarısından fazlası elmayı seçmiştir.', category: 'curut', explain: '30’un yarısı 15; 12 kişi yarıdan azdır.' },
      { content: 'Muzu seçenler, çileği seçenlerin 2 katıdır.', category: 'curut', explain: 'Çileğin 2 katı 12 olurdu; muzu seçenler 8 kişi.' },
      { content: 'Portakalı seçenler sınıfın %20’sidir.', category: 'curut', explain: '%20 olsaydı 30 kişinin 6’sı olurdu; portakalı seçen 4 kişi.' },
      { content: 'Türkiye’deki çocukların en sevdiği meyve elmadır.', category: 'yetersiz', explain: 'Veri yalnızca bir sınıftan toplandı; bütün Türkiye için genelleme yapılamaz.' },
      { content: '5-B sınıfında da en sevilen meyve elmadır.', category: 'yetersiz', explain: '5-B’ye hiç sorulmadı.' },
    ],
  },
  {
    id: 'g5-grafik-yorumlarini-tartis',
    outcomes: ['MAT.5.5.2'],
    type: 'quiz',
    stage: 'problem',
    fixedOrder: true,
    title: 'Bu yorum doğru mu?',
    instructions: 'Başkalarının verilere dayanarak yaptığı yorumları değerlendir.',
    level: 3,
    launch: { text: 'Sosyal medyada “Araştırmaya göre herkes bunu seviyor!” gibi cümleler görürüz. Bir yorumun güvenilir olup olmadığını nasıl anlarız?' },
    reflect: 'Bir araştırmanın sonucunun “yanlı” olmasına neler yol açabilir? İki örnek ver.',
    questions: [
      {
        prompt: { text: 'Fatma: “Futbolu seçenlerin sayısı, yüzmeyi seçenlerin 3 katıdır.”', visual: SPOR_GRAFIGI },
        choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'],
        answer: 0,
        feedback: [null, 'Futbol 9, yüzme 3 kişi. 3’ün 3 katı kaç?', 'Grafikte iki sporun sıklığı da var; karşılaştırabilirsin.'],
      },
      {
        prompt: { text: 'Emre: “Sınıfın yarısından fazlası futbolu seviyor.”', visual: SPOR_GRAFIGI },
        choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'],
        answer: 1,
        feedback: ['Futbolun sütunu en uzun ama sınıfın yarısı kaç kişi? Toplam 24 kişi var.', null, 'Grafikte bütün sınıfın verisi var; yarısını hesaplayabilirsin.'],
      },
      {
        prompt: { text: 'Selin: “Türkiye’deki bütün öğrencilerin en sevdiği spor futboldur.”', visual: SPOR_GRAFIGI },
        choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'],
        answer: 2,
        feedback: ['Veri yalnızca bir sınıftan toplandı.', 'Yanlış olduğunu da kanıtlayamayız; çünkü bütün Türkiye’ye sorulmadı.', null],
      },
      {
        prompt: 'Okulda en sevilen spor araştırılırken yalnızca basketbol takımındaki öğrencilere soruldu ve “En sevilen spor basketboldur.” sonucuna ulaşıldı. Bu araştırmadaki hata nedir?',
        choices: ['Anket sorusu çok kısadır.', 'Veri yalnızca basketbol takımından toplandığı için sonuç yanlıdır.', 'Grafik yanlış renkte çizilmiştir.', 'Hata yoktur, sonuç doğrudur.'],
        answer: 1,
        feedback: ['Sorunun uzunluğu sonucu değiştirmez; kime sorulduğu önemli.', null, 'Renk sonucu değiştirmez.', 'Basketbol takımındakiler basketbolu sevmeye zaten daha yatkın.'],
      },
      {
        prompt: '“Öğrencilerin %60’ı kantini beğeniyor.” sonucu açıklandı. Ankete yalnızca 5 öğrenci katılmış. Bu sonuç bütün okul için güvenilir midir?',
        choices: ['Evet, %60 yüksek bir orandır.', 'Hayır, katılımcı sayısı çok az olduğu için okulu temsil etmez.', 'Evet, 5 kişi yeterlidir.', 'Hayır, çünkü yüzde kullanılmıştır.'],
        answer: 1,
        feedback: ['Oranın yüksek olması, verinin okulu temsil ettiğini göstermez.', null, 'Yüzlerce öğrencinin olduğu bir okulda 5 kişi çok azdır.', 'Yüzde kullanmak sorun değil; sorun kaç kişiye sorulduğu.'],
      },
      {
        prompt: { text: 'Mert: “Grafiğe göre servisle gelenler ile özel araçla gelenler eşit sayıdadır.”', visual: DAIRE_GRAFIGI },
        choices: ['Doğrudur, kabul edilir.', 'Yanlıştır, çürütülür.', 'Veri bu yorum için yetersizdir.'],
        answer: 0,
        feedback: [null, 'İki dilimi karşılaştır: ikisi de dairenin dörtte biri değil mi?', 'Öğrenci sayısını bilmesek de dilimlerin eşit olduğunu görebiliriz.'],
      },
      {
        prompt: 'Bir reklamda “Diş hekimlerinin %80’i bu macunu öneriyor.” yazıyor. Küçük yazıda yalnızca 10 diş hekimine sorulduğu belirtilmiş. Ne düşünürsün?',
        choices: ['Sonuç dikkatle yorumlanmalı; 10 kişi bütün diş hekimlerini temsil etmeyebilir.', 'Kesinlikle doğrudur, çünkü reklamda yazıyor.', 'Hiçbir diş hekimi bu macunu önermez.'],
        answer: 0,
        feedback: [null, 'Reklamlar ürünü satmak ister; verinin nasıl toplandığını sorgulamalıyız.', 'Bunu da kanıtlayamayız; 10 kişiden 8’i öneriyor.'],
      },
    ],
  },

  // ── İşlemlerle Cebirsel Düşünme ────────────────────────────────────────

  // MAT.5.2.1
  {
    id: 'g5-esitligin-korunumu',
    outcomes: ['MAT.5.2.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Dengeyi koru',
    instructions: 'Terazinin iki kefesinden aynı miktarı çıkararak ya da iki kefeyi eşit paylara bölerek kutunun kaç birim olduğunu bul.',
    level: 1,
    launch: { text: 'Tahterevallinin iki ucunda eşit ağırlıklar varken iki uca da birer kişi eklenirse ne olur? Yalnız bir uca eklenirse?', visual: { kind: 'balance', left: ['📦', '1', '1', '1'], right: ['1', '1', '1', '1', '1', '1', '1'] } },
    reflect: 'Terazinin dengesini bozmadan yapabileceğin hamleler nelerdi? Bu hamleler eşitlikler için de geçerli mi?',
    tool: 'balance',
    tasks: [
      { prompt: 'Terazi dengede: bir kutu ve 8 birim, 21 birime eşit. İki kefeden de 8 birim çıkar. Kutu kaç birim?', target: { a: 1, b: 8, c: 21 }, hints: ['İki kefeden de aynı miktarı çıkarırsan denge bozulur mu?'] },
      { prompt: 'Terazi dengede: bir kutu ve 12 birim, 30 birime eşit. Kutu kaç birim?', target: { a: 1, b: 12, c: 30 } },
      { prompt: 'Terazi dengede: 3 eş kutu, 24 birime eşit. Bir kutu kaç birim?', target: { a: 3, b: 0, c: 24 }, hints: ['İki kefeyi de 3 eş paya bölersen denge korunur mu?'] },
      { prompt: 'Terazi dengede: 2 eş kutu ve 5 birim, 17 birime eşit. Bir kutu kaç birim?', target: { a: 2, b: 5, c: 17 }, hints: ['Önce iki kefeden de 5 birim çıkar.', 'Sonra iki kefeyi de 2 eş paya böl.'], explain: 'İki tarafa aynı işlemi yaptıkça eşitlik korunur.' },
    ],
  },
  {
    id: 'g5-modelle-ozellikler',
    outcomes: ['MAT.5.2.1'],
    type: 'fill',
    stage: 'model',
    title: 'Modelde özellikleri gör',
    instructions: 'Diziye, şeride ya da küplere bak; işlem yapmadan eksik sayıyı bul.',
    level: 2,
    launch: { text: 'Bir bisküvi paketinde 10 bisküvi var. 20 paket bir kutuya, 25 kutu bir koliye giriyor. Bir kolideki bisküvileri saymanın kolay bir yolu var mı?' },
    reflect: 'Diziyi iki parçaya ayırınca neden toplam değişmedi? Bu fikri hangi işlemlerde kullanabilirsin?',
    items: [
      { text: '6 × 7 = 6 × 5 + 6 × __ = 30 + __ = __', answers: ['2', '12', '42'], visual: { kind: 'array', rows: 6, cols: 7, splitCol: 5 }, hints: ['Ayırıcı çizginin sağında kaç sütun var?', 'Sağdaki parçada kaç nokta var?'] },
      { text: '8 × 6 = 5 × 6 + __ × 6 = 30 + __ = __', answers: ['3', '18', '48'], visual: { kind: 'array', rows: 8, cols: 6, splitRow: 5 }, hints: ['Ayırıcı çizginin altında kaç sıra var?'] },
      { text: '5 × 9 = 5 × 3 + 5 × __ = 15 + __ = __', answers: ['6', '30', '45'], visual: splitArea(9, 5, 3) },
      { text: '3 × 8 = 8 × __', answers: ['3'], visual: { kind: 'array', rows: 3, cols: 8 }, hints: ['Diziyi çeyrek tur döndürürsen kaç sıra, her sırada kaç nokta olur?'] },
      { text: '25 + 48 = 48 + __', answers: ['25'], visual: { kind: 'tape', parts: [{ label: '25', value: 25 }, { label: '48', value: 48 }], compare: [{ label: '48', value: 48 }, { label: '25', value: 25 }] }, hints: ['İki şeridin uzunluğu aynı mı?'] },
      { text: 'Küplerin sayısı: (2 × 3) × 4 = 2 × (3 × __) = __', answers: ['4', '24'], visual: { kind: 'cubes', heights: [[4, 4, 4], [4, 4, 4]] }, hints: ['Bir katta kaç küp var? Kaç kat var?', 'Önce bir sıranın tüm katlarını sayıp sonra sıra sayısıyla çarpabilir misin?'] },
      { text: 'Bisküviler: (20 × 10) × 25 = 20 × (10 × 25) = 20 × __ = __', answers: ['250', '5000|5.000'], hints: ['Bir kutuda kaç bisküvi var? Ya da önce 25 kutudaki paketleri düşün.'] },
    ],
  },
  {
    id: 'g5-esitligi-tamamla',
    outcomes: ['MAT.5.2.1'],
    type: 'fill',
    stage: 'sembol',
    title: 'Hesaplamadan dengele',
    instructions: 'İşlem yapmadan önce eşittir işaretinin iki yanını karşılaştır, sonra eksik sayıyı bul.',
    level: 2,
    launch: { text: 'Eşittir işareti “sonucu yaz” demek değil, “iki taraf aynı değerde” demektir. 25 + 48 = 45 + ? eşitliğini toplama yapmadan tamamlayabilir misin?' },
    reflect: 'Hangi eşitlikleri hiç hesaplama yapmadan tamamladın? Nasıl düşündün?',
    items: [
      { text: '25 + 48 = 45 + __', answers: ['28'], hints: ['45, 25’ten kaç fazla?', 'Toplam aynı kalsın diye diğer toplanan ne yapmalı?'], explain: 'Bir toplanan 20 artınca diğeri 20 azalırsa toplam değişmez: 48 − 20 = 28.' },
      { text: '36 + 17 = 40 + __', answers: ['13'], hints: ['36’dan 40’a kaç arttı?'] },
      { text: '8 × 25 = 4 × __', answers: ['50'], hints: ['8 yarıya indi. Diğer çarpan ne yapmalı?'] },
      { text: '5 × 9 = 5 × 3 + 5 × __', answers: ['6'], hints: ['9’u 3 ve kaç olarak parçaladık?'] },
      { text: '12 × 15 = 12 × 10 + 12 × __', answers: ['5'] },
      { text: '(2 × 9) × 30 = 2 × (9 × __)', answers: ['30'] },
      { text: '7 × 98 = 7 × 100 − 7 × __', answers: ['2'], hints: ['98, 100’den kaç eksik?'] },
      { text: '17 + 8 = 25 ise 17 + 8 + 6 = 25 + __', answers: ['6'], hints: ['Eşitliğin bir tarafına 6 eklendi. Diğer tarafa ne yapılmalı?'] },
    ],
  },
  {
    id: 'g5-islem-ozellikleri',
    outcomes: ['MAT.5.2.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Sayı cümlesi ve özelliği',
    instructions: 'Her sayı cümlesini gösterdiği özellikle eşleştir.',
    level: 2,
    launch: { text: 'Matematikte bazı “hileler” aslında birer özelliktir: Sayıların yerini değiştirmek, gruplamak ya da parçalamak. Hangisinin adı ne?' },
    reflect: 'Bu özelliklerden hangisi zihinden işlem yaparken işine en çok yarıyor? Bir örnek ver.',
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
    id: 'g5-sayi-cumlesi-dogru-mu',
    outcomes: ['MAT.5.2.1'],
    type: 'categorize',
    stage: 'problem',
    title: 'Sayı cümlesi doğru mu?',
    instructions: 'Hesaplamadan önce işlem özelliklerini düşün: her sayı cümlesi doğru mu, yanlış mı?',
    level: 2,
    launch: { text: 'Can, “Toplamada sayıların yeri değişebiliyorsa çıkarmada da değişir.” diyor. Bu varsayımı nasıl sınarsın?' },
    reflect: 'Yanlış dediğin bir sayı cümlesini, eşittir işaretinin bir yanını değiştirerek doğru hâle getir.',
    categories: [
      { id: 'dogru', label: 'Doğru', color: '#22c55e' },
      { id: 'yanlis', label: 'Yanlış', color: '#ef4444' },
    ],
    items: [
      { content: '25 + 48 = 48 + 25', category: 'dogru' },
      { content: '25 + 48 = 45 + 28', category: 'dogru', explain: 'Bir toplanan 20 azaldı, diğeri 20 arttı: toplam değişmedi.' },
      { content: '4 × 25 × 7 = 100 × 7', category: 'dogru' },
      { content: '6 × 14 = 6 × 10 + 6 × 4', category: 'dogru' },
      { content: '18 × 30 = 4 × 27 × 5', category: 'dogru', explain: '18 × 30 = 2 × 9 × 30 ve 4 × 27 × 5 de aynı çarpanların başka bir gruplanışı: ikisi de 540.' },
      { content: '36 − 12 = 12 − 36', category: 'yanlis', explain: 'Çıkarmada değişme özelliği yoktur: 36 − 12 = 24, ama 12’den 36 çıkarılamaz.' },
      { content: '24 ÷ 6 = 6 ÷ 24', category: 'yanlis', explain: 'Bölmede değişme özelliği yoktur.' },
      { content: '(20 − 8) − 2 = 20 − (8 − 2)', category: 'yanlis', explain: 'Sol taraf 10, sağ taraf 14. Çıkarmada birleşme özelliği yoktur.' },
      { content: '8 × 12 = 8 × 10 + 2', category: 'yanlis', explain: '2’yi de 8 ile çarpmak gerekir: 8 × 10 + 8 × 2.' },
    ],
  },

  // MAT.5.2.2
  {
    id: 'g5-resimden-ifade',
    outcomes: ['MAT.5.2.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Resimden işleme',
    instructions: 'Resmi anlatan sayı cümlesini seç. Hangi işlem önce yapılmalı, resim sana söylüyor!',
    level: 1,
    launch: { text: 'Manavda 3 kasada 4’er elma ve yanlarında 2 armut var. Toplam meyveyi bulmak için önce hangi işlemi yaparsın?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🍎', count: 4 }, { emoji: '🍎', count: 4 }, { emoji: '🍎', count: 4 }, { emoji: '🍐', count: 2 }], separator: '+' } },
    reflect: '3 × 4 + 2 ile 3 × (4 + 2) farklı resimleri anlatıyor. Her biri için bir resim tarif et.',
    questions: [
      {
        prompt: { text: 'Resimdeki toplam meyve sayısını hangi ifade gösterir?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🍎', count: 4 }, { emoji: '🍎', count: 4 }, { emoji: '🍎', count: 4 }, { emoji: '🍐', count: 2 }], separator: '+' } },
        choices: ['3 × 4 + 2', '3 × (4 + 2)', '3 + 4 × 2', '(3 + 4) × 2'],
        answer: 0,
        feedback: [null, 'Bu ifade her gruba 2 armut eklenmiş gibi okunur: 3 × 6 = 18 meyve.', 'Bu ifade 3 + 8 = 11 eder; resimde 14 meyve var.', 'Sonuç 14 çıkıyor ama ifade resmi anlatmıyor: resimde 7’şer meyveli iki grup yok.'],
      },
      {
        prompt: { text: 'Dizideki noktaların sayısını hangi ifade gösterir?', visual: { kind: 'array', rows: 4, cols: 5, splitCol: 2 } },
        choices: ['4 × (2 + 3)', '4 × 2 + 3', '4 + 2 × 3', '2 + 3 × 4'],
        answer: 0,
        feedback: [null, 'Bu ifade yalnızca soldaki parçayı 4 sıra sayıyor; sağdaki parça da 4 sıra.', 'Bu ifade 4 + 6 = 10 eder; dizide 20 nokta var.', 'Bu ifade 2 + 12 = 14 eder; soldaki parça da 4 sıra.'],
      },
      {
        prompt: { text: 'Karedeki birim kare sayısını hangi ifade gösterir?', visual: area(4, 4) },
        choices: ['4^{2}', '4 × 2', '2^{3}', '4 + 4'],
        answer: 0,
        feedback: [null, '4 × 2 = 8; karede 16 birim kare var.', '2^{3} = 2 × 2 × 2 = 8.', '4 + 4 yalnızca iki sırayı sayar.'],
      },
      {
        prompt: { text: 'Küplerin sayısını hangi ifade gösterir?', visual: { kind: 'cubes', heights: [[3, 3, 3], [3, 3, 3], [3, 3, 3]] } },
        choices: ['3^{3}', '3 × 3', '3^{2}', '3 + 3 + 3'],
        answer: 0,
        feedback: [null, '3 × 3 yalnızca bir katı sayar; kaç kat var?', '3^{2} = 9, yalnızca bir kattaki küp sayısı.', '3 + 3 + 3 = 9; yalnızca bir kattaki küpler.'],
      },
      {
        prompt: { text: 'Can tanesi 45 TL olan 3 defter ve 20 TL’lik bir kalem aldı. Ödediği tutarı hangi işlem gösterir?', visual: { kind: 'tape', parts: [{ label: '45', value: 45 }, { label: '45', value: 45 }, { label: '45', value: 45 }, { label: '20', value: 20 }], total: '?' } },
        choices: ['3 × 45 + 20', '3 × (45 + 20)', '(3 + 45) × 20', '3 + 45 × 20'],
        answer: 0,
        feedback: [null, 'Bu ifade 3 kalem alınmış gibi; Can yalnız 1 kalem aldı.', 'Bu ifade 48 tane 20 TL demek.', 'Bu ifade 3 + 900 eder; çok büyük.'],
      },
    ],
  },
  {
    id: 'g5-islem-onceligi',
    outcomes: ['MAT.5.2.2'],
    type: 'fill',
    stage: 'sembol',
    title: 'Hangi işlem önce?',
    instructions: 'Önce hangi işlemi yapacağına karar ver, sonra hesapla.',
    level: 2,
    launch: { text: 'Aynı sayı cümlesini iki arkadaş farklı sırayla hesaplayıp farklı sonuç buldu. Herkesin aynı sonucu bulması için bir anlaşma gerekiyor mu?' },
    reflect: 'Parantez, bir sayı cümlesinde ne işe yarar? Parantezi kaldırınca sonucu değişen bir örnek yaz.',
    items: [
      { text: '18 + 6 × 4 = __', answers: ['42'], hints: ['Çarpma mı önce yapılır, toplama mı?'] },
      { text: '(18 + 6) × 4 = __', answers: ['96'], hints: ['Parantez sana neyi önce yapmanı söylüyor?'] },
      { text: '48 ÷ 6 + 2 × 5 = __', answers: ['18'] },
      { text: '60 − 24 ÷ 4 × 3 = __', answers: ['42'], hints: ['Bölme ve çarpma yan yanaysa hangisinden başlarsın?', 'Soldan sağa: önce 24 ÷ 4, sonra × 3.'] },
      { text: '3^{2} + 4 × 5 = __', answers: ['29'], hints: ['3’ün karesi kaçtır?'] },
      { text: '2^{3} × (10 − 7) = __', answers: ['24'], hints: ['2’nin küpü: 2 × 2 × 2.'] },
      { text: '100 − (5^{2} + 15) ÷ 8 = __', answers: ['95'], hints: ['Önce parantezin içi; parantezin içinde de önce kare.'] },
      { text: '(7 + 5) ÷ 3 + 6^{2} = __', answers: ['40'] },
    ],
  },
  {
    id: 'g5-islem-adimlarini-sirala',
    outcomes: ['MAT.5.2.2'],
    type: 'sort',
    stage: 'sembol',
    title: 'Adım adım işlem',
    instructions: 'İşlem önceliğine göre adımları sırala.',
    level: 2,
    launch: { text: 'Bir yemek tarifinde adımların sırası değişirse yemek bozulabilir. İşlemlerde de sıra önemli mi?' },
    reflect: 'Sıraladığın adımlardan birinin yerini değiştirseydin sonuç ne olurdu? Dene ve anlat.',
    rounds: [
      { prompt: '48 ÷ (2 + 6) × 3 − 5 işleminin adımlarını sırala.', items: ['2 + 6 = 8', '48 ÷ 8 = 6', '6 × 3 = 18', '18 − 5 = 13'] },
      { prompt: '5 + 3 × 4 − 2 işleminin adımlarını sırala.', items: ['3 × 4 = 12', '5 + 12 = 17', '17 − 2 = 15'] },
      { prompt: '(15 − 3) ÷ 4 + 6 işleminin adımlarını sırala.', items: ['15 − 3 = 12', '12 ÷ 4 = 3', '3 + 6 = 9'] },
      { prompt: '2 × 4^{2} + 7 işleminin adımlarını sırala.', items: ['4^{2} = 16', '2 × 16 = 32', '32 + 7 = 39'], hints: ['Üslü ifade mi önce gelir, çarpma mı?'] },
    ],
  },
  {
    id: 'g5-islem-onceligi-problemleri',
    outcomes: ['MAT.5.2.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hikâye ve sayı cümlesi',
    instructions: 'Durumlara uygun sayı cümlesini seç ve işlem önceliğini yorumla.',
    level: 2,
    launch: { text: 'Beş arkadaş pizza ve içecek parasını eşit paylaşacak. Hesabı yanlış sırayla yaparlarsa kimse doğru parayı ödemez!' },
    reflect: '3 × 15 + 10 sayı cümlesine uyan kendi hikâyeni yaz.',
    questions: [
      {
        prompt: 'Elif 8 + 4 × 3 işleminin sonucunu 36 buldu. Elif’in hatası nedir?',
        choices: ['Toplamayı daha önce yapmalıydı.', 'Çarpmayı toplamadan önce yapmadı; doğru sonuç 20.', 'Sonuç doğrudur.', 'Çıkarma yapmalıydı.'],
        answer: 1,
        feedback: ['Elif zaten toplamayı önce yaptı: 12 × 3 = 36. Sorun da bu!', null, '8 tane elma ve 4’erli 3 grup daha düşün: toplam 36 mı?', 'Sayı cümlesinde çıkarma yok.'],
      },
      {
        prompt: '5 arkadaş 250 TL’lik pizza ve 50 TL’lik içecek parasını eşit paylaşacak. Kişi başına düşen tutar hangi işlemle bulunur?',
        choices: ['250 + 50 ÷ 5', '250 ÷ 5 + 50 × 5', '(250 + 50) ÷ 5', '250 × 5 + 50'],
        answer: 2,
        feedback: ['Bu işlemde yalnız içecek parası paylaşılıyor; pizza parasının hepsi bir kişiye kalıyor.', 'Bu işlem içecek parasını 5 katına çıkarıyor.', null, 'Paylaşırken bölme yaparız, çarpma değil.'],
      },
      {
        prompt: 'Bir otoparkta 6 sıra var, her sırada 12 araç duruyor. 15 araç çıktı. Kalan araç sayısını gösteren işlem ve sonucu hangisidir?',
        choices: ['6 × 12 − 15 = 57', '6 × (12 − 15)', '6 + 12 − 15 = 3', '6 × 12 + 15 = 87'],
        answer: 0,
        feedback: [null, 'Bu işlem her sıradan 15 araç çıkmış gibi; 12’den 15 çıkarılamaz.', 'Araç sayısı 6 + 12 değil, 6 × 12.', 'Araçlar çıktı; eklemek değil çıkarmak gerekir.'],
      },
      {
        prompt: 'Hangi işlemin sonucu en büyüktür?',
        choices: ['(6 + 4) × 5', '6 + 4 × 5', '6 × 4 + 5', '6 + 4 + 5'],
        answer: 0,
        feedback: [null, 'Burada önce 4 × 5 yapılır: 6 + 20 = 26.', '6 × 4 + 5 = 29.', '6 + 4 + 5 = 15.'],
      },
      {
        prompt: '5^{2} ifadesinin değeri kaçtır?',
        choices: ['10', '25', '52', '7'],
        answer: 1,
        feedback: ['5^{2}, 5 × 2 değil; 5 × 5 demektir.', null, '5^{2} iki rakamı yan yana yazmak değildir.', '5 + 2 değil; 5’in kendisiyle çarpımı.'],
      },
      {
        prompt: 'Hangi problem 3 × 15 + 10 işlemiyle çözülür?',
        choices: ['Tanesi 15 TL olan 3 kitap ve 10 TL’lik bir ayraç alındı. Toplam kaç TL ödendi?', '15 TL’lik bir kitap ve 10 TL’lik bir ayraçtan 3’er tane alındı. Toplam kaç TL ödendi?', '15 TL’lik kitapta 3 TL indirim yapıldı, sonra 10 TL’lik ayraç eklendi.'],
        answer: 0,
        feedback: [null, 'Bu problem 3 × (15 + 10) ile çözülür.', 'Bu problem 15 − 3 + 10 ile çözülür.'],
      },
    ],
  },
  {
    id: 'g5-islem-hangisi-farkli',
    outcomes: ['MAT.5.2.2', 'MAT.5.2.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Sayı cümleleri',
    instructions: 'Hangisi diğerlerinden farklı? Hesapla, karşılaştır ve gerekçeni düşün. Birden çok doğru cevap var!',
    level: 2,
    launch: { text: 'Dört sayı cümlesi aynı sayılardan oluşuyor ama hepsi birbirinden farklı. Farkları bulmak için sonuçlarını hesaplamak yeter mi?' },
    reflect: 'Seçtiğin sayı cümlesinin farkını bir arkadaşın hiç hesaplamadan görebilir mi? Nasıl?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['5 + 3 × 4', '(5 + 3) × 4', '5 × 3 + 4', '5 + 3 + 4'],
        answer: 0,
        reasons: [
          'Soldan sağa sırayla hesaplanırsa yanlış sonuç (32) veren tek ifade; doğrusu 17.',
          'Parantez içeren tek ifade; sonucu 30’dan büyük (32) olan tek ifade.',
          'Yazılan ilk işlemi çarpma olan tek ifade.',
          'Çarpma içermeyen tek ifade.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['25 + 48 = 48 + 25', '(2 × 9) × 30 = 2 × (9 × 30)', '7 × (10 + 3) = 7 × 10 + 7 × 3', '36 − 12 = 12 − 36'],
        answer: 0,
        reasons: [
          'Toplamada değişme özelliğini gösteren tek eşitlik.',
          'Çarpmada birleşme özelliğini gösteren tek eşitlik.',
          'Çarpmanın toplama üzerine dağılma özelliğini gösteren tek eşitlik.',
          'Yanlış olan tek eşitlik: çıkarmada değişme özelliği yoktur.',
        ],
      },
    ],
  },

  // MAT.5.2.3
  {
    id: 'g5-sekil-oruntusu',
    outcomes: ['MAT.5.2.3'],
    type: 'fill',
    stage: 'model',
    title: 'Büyüyen şekil örüntüleri',
    instructions: 'Örüntünün her adımda nasıl büyüdüğüne bak; şekilde kuralı görmeye çalış.',
    level: 1,
    launch: { text: 'Kibrit çöpleriyle yan yana kareler yapıyoruz. 100 kare yapmak için kaç çöp gerektiğini, hepsini dizmeden bulabilir miyiz?', visual: KIBRIT },
    reflect: 'Nokta örüntüsünde turuncu nokta kuraldaki hangi sayıyı gösteriyor? Mavi noktalar hangisini?',
    items: [
      { text: '1. adımda 4, 2. adımda 7, 3. adımda 10 çöp var. 4. adımda __ çöp olur.', answers: ['13'], visual: KIBRIT, hints: ['Her yeni kare için kaç çöp eklendi?'] },
      { text: 'Bu örüntüde her adımda __ çöp eklenir.', answers: ['3'], visual: KIBRIT },
      { text: '10. adımda __ çöp kullanılır.', answers: ['31'], visual: KIBRIT, hints: ['Adım sayısının 3 katını al: 1. adımda 3 × 1 = 3, ama 4 çöp var. Fark ne?', '10 adımda 3 × 10 çöp ve en baştaki fazladan çöp.'] },
      { text: 'Nokta örüntüsünde 4. adımda __ nokta olur.', answers: ['9'], visual: NOKTA_ORUNTU, hints: ['Mavi noktalar kaç sıra, kaç sütun? Turuncu nokta kaç tane?'] },
      { text: 'Nokta örüntüsünde 20. adımda __ nokta olur.', answers: ['41'], visual: NOKTA_ORUNTU, hints: ['20. adımda 2 sıra, 20 sütun mavi nokta ve 1 turuncu nokta olur.'] },
      { text: 'Nokta örüntüsünün kuralı: adım sayısının __ katının __ fazlası.', answers: ['2', '1'], visual: NOKTA_ORUNTU },
      {
        text: 'Tablodaki örüntüde 4. adımın terimi __; kural adım sayısının 4 katının __ fazlası.',
        answers: ['17', '1'],
        visual: { kind: 'table', headers: ['Adım sayısı', '1', '2', '3', '4'], rows: [['Terim', 5, 9, 13, '?']] },
        hints: ['Terimler kaçar artıyor?', '1. adımda 4 × 1 = 4, terim 5. Fark ne?'],
      },
    ],
  },
  {
    id: 'g5-oruntu-kural-eslestir',
    outcomes: ['MAT.5.2.3'],
    type: 'match',
    stage: 'sembol',
    title: 'Örüntü ve kuralı',
    instructions: 'Her örüntüyü sözle yazılmış kuralıyla eşleştir. Kuralı 1. ve 2. adımda kontrol et.',
    level: 2,
    launch: { text: 'İki örüntünün artış miktarı aynı olabilir ama kuralları farklı olabilir. 3, 5, 7, 9 ile 2, 4, 6, 8 örüntülerini düşün.' },
    reflect: 'Artış miktarı kuralın hangi kısmını, ilk terim hangi kısmını belirliyor?',
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
    id: 'g5-oruntu-kurali',
    outcomes: ['MAT.5.2.3'],
    type: 'fill',
    stage: 'sembol',
    title: 'Yakın ve uzak adımlar',
    instructions: 'Adım sayısı ile terim arasındaki ilişkiyi bul; yakın ve uzak adımlardaki terimleri hesapla.',
    level: 3,
    launch: { text: 'Bir örüntünün 5. terimini tek tek sayarak bulabiliriz. Peki 50. terimini? Kısa bir yol gerekiyor!' },
    reflect: 'Uzak bir adımın terimini bulurken “bir önceki terime ekle” kuralı neden yetersiz kaldı?',
    items: [
      { text: '4, 7, 10, 13, … örüntüsünde sabit artış miktarı __', answers: ['3'] },
      { text: '4, 7, 10, 13, … örüntüsünün 10. terimi __', answers: ['31'], hints: ['1. adımda 3 × 1 = 3, terim 4. Her adımda terim, adım sayısının 3 katından kaç fazla?'] },
      { text: '4, 7, 10, 13, … örüntüsünün 50. terimi __', answers: ['151'] },
      { text: '2, 4, 6, 8, … örüntüsünün 50. terimi __', answers: ['100'] },
      { text: 'Kuralı “adım sayısının 4 katı” olan örüntünün 25. terimi __', answers: ['100'] },
      { text: 'Kuralı “adım sayısının 5 katının 2 eksiği” olan örüntünün ilk üç terimi __, __, __', answers: ['3', '8', '13'], hints: ['1. adım için 5 × 1 − 2 kaç eder?'] },
      { text: 'Elif kumbarasına 1. gün 10 TL, sonra her gün bir önceki günden 5 TL fazla atıyor (10, 15, 20, …). 12. gün __ TL atar.', answers: ['65'], hints: ['Kural: adım sayısının 5 katının kaç fazlası?'] },
      { text: '6, 11, 16, 21, … örüntüsünde 101 sayısı __. terimdir.', answers: ['20'], hints: ['Kural: adım sayısının 5 katının 1 fazlası.', '101’den 1 çıkarırsan kalan sayı 5’in kaç katı?'] },
    ],
  },
  {
    id: 'g5-oruntu-varsayimlari',
    outcomes: ['MAT.5.2.3'],
    type: 'quiz',
    stage: 'problem',
    title: 'Varsayımı sına',
    instructions: 'Arkadaşlarının örüntü kurallarıyla ilgili varsayımlarını sına; gerekçeli cevap ver.',
    level: 3,
    launch: { text: 'Can, 4, 7, 10, 13, … örüntüsünün 50. teriminin 3 × 50 = 150 olduğunu söylüyor. Bir varsayımı sınamanın en kolay yolu nedir?' },
    reflect: 'Bir kuralın doğru olduğundan emin olmak için kaç adımda denemen gerekir? Neden?',
    questions: [
      {
        prompt: 'Can: “4, 7, 10, 13, … örüntüsünün 50. terimi 3 × 50 = 150’dir.” Can’ın varsayımı için ne söylenebilir?',
        choices: ['Yanlış; 1. adımda 3 × 1 = 3 ama terim 4. Kural “3 katının 1 fazlası”, yani 151.', 'Doğru; artış 3 olduğu için 3 × 50.', 'Yanlış; 50. terim 4 × 50 = 200.'],
        answer: 0,
        feedback: [null, 'Kuralı 1. adımda dene: 3 × 1 = 3, ama örüntünün ilk terimi 4.', 'Artış 4 değil 3; ilk terime bakmak yetmez, artışa da bakmalısın.'],
      },
      {
        prompt: 'Ece: “2, 4, 6, 8, … örüntüsünün 50. terimi 2 × 50 = 100’dür.” Ece’nin varsayımı için ne söylenebilir?',
        choices: ['Doğru; her terim, adım sayısının 2 katı.', 'Yanlış; 50 + 2 = 52.', 'Yanlış; 50. terimi bulmak için bütün terimleri tek tek yazmak gerekir.'],
        answer: 0,
        feedback: [null, '1. adımda 1 + 2 = 3 olurdu ama terim 2. Kuralı dene.', 'Kural bulduğumuzda tek tek yazmaya gerek kalmaz.'],
      },
      {
        prompt: 'Bir örüntünün kuralı “adım sayısının 3 katının 2 fazlası”. Hangi sayı bu örüntünün bir terimidir?',
        choices: ['32', '30', '31', '33'],
        answer: 0,
        feedback: [null, '30’dan 2 çıkarınca 28 kalır; 28, 3’ün katı mı?', '31 − 2 = 29; 29, 3’ün katı mı?', '33 − 2 = 31; 31, 3’ün katı mı?'],
      },
      {
        prompt: 'Elif’in kumbarasında 20 TL var. Her hafta 15 TL ekliyor. 8 hafta sonra kumbarasında kaç TL olur?',
        choices: ['140', '120', '160', '135'],
        answer: 0,
        feedback: [null, 'Başlangıçtaki 20 TL’yi unuttun mu?', 'Her hafta 20 TL değil, 15 TL ekleniyor.', 'Başlangıçta 15 TL değil, 20 TL vardı: 20 + 8 × 15.'],
      },
      {
        prompt: '1, 2, 4, 8, 16, … örüntüsü için “terim, adım sayısının 2 katıdır” kuralı geçerli mi?',
        choices: ['Hayır; artış miktarı sabit değil, bu tür kural yalnız sabit artan örüntülerde işe yarar.', 'Evet, her terim bir öncekinin 2 katı.', 'Evet, 1. adımda 2 × 1 = 2.'],
        answer: 0,
        feedback: [null, 'Her terim bir öncekinin 2 katı ama “adım sayısının 2 katı” başka bir şey: 3. adımda 6 olmalıydı, terim 4.', '1. adımda terim 1, 2 değil. 3. adımı da kontrol et.'],
      },
      {
        prompt: 'Bir şekil örüntüsünde 1. adımda 6 kare var ve her adımda 4 kare ekleniyor. Kural hangisidir?',
        choices: ['Adım sayısının 4 katının 2 fazlası', 'Adım sayısının 6 katı', 'Adım sayısının 4 katı', 'Adım sayısının 2 katının 4 fazlası'],
        answer: 0,
        feedback: [null, '2. adımda 6 × 2 = 12 olurdu; oysa 6 + 4 = 10 kare var.', '1. adımda 4 × 1 = 4 olurdu; oysa 6 kare var.', 'Artış 2 değil 4: 2. adımda 2 × 2 + 4 = 8 olurdu, oysa 10 kare var.'],
      },
    ],
  },

  // MAT.5.2.4
  {
    id: 'g5-akis-semasi-sekilleri',
    outcomes: ['MAT.5.2.4'],
    type: 'match',
    stage: 'model',
    title: 'Akış şeması şekilleri',
    instructions: 'Akış şemasındaki her şekli anlamıyla eşleştir.',
    level: 1,
    launch: { text: '“Algoritma” sözcüğü, 9. yüzyılda yaşamış matematikçi Harizmi’nin adından gelir. Bir yemek tarifi de bir algoritmadır: adımlar belli bir sırayla yapılır.' },
    reflect: 'Bir sabah rutinini (uyan, yüzünü yıka, …) akış şemasıyla çizseydin hangi şekilleri kullanırdın?',
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
    stage: 'sembol',
    title: 'Algoritmayı sırala',
    instructions: 'Algoritmanın adımlarını doğru sıraya koy.',
    level: 2,
    launch: { text: 'Gözü kapalı bir arkadaşına yönerge vererek bir kare çizdirmeye çalış. Yönergelerin sırası karışırsa ne olur?' },
    reflect: 'Alt alta toplama da bir algoritmadır. Bu algoritmanın adımlarını kendi cümlelerinle anlat.',
    rounds: [
      { prompt: 'Bir sayının 3 katının 5 fazlasını bulan algoritmayı sırala.', items: ['Başla', 'Sayıyı gir', 'Sayıyı 3 ile çarp', 'Sonuca 5 ekle', 'Sonucu yazdır', 'Bitir'] },
      { prompt: '700 gramlık paketin fiyatından 1 kilogramın fiyatını bulan algoritmayı sırala.', items: ['Başla', '700 g’ın fiyatını gir', 'Fiyatı 7’ye bölerek 100 g’ın fiyatını hesapla', 'Bulunan sayıyı 10 ile çarp', '1 kg’ın fiyatını yazdır', 'Bitir'], hints: ['700 g’ın içinde kaç tane 100 g var?', '1 kg kaç tane 100 g eder?'] },
      { prompt: '367 + 485 işlemini alt alta toplama algoritmasını sırala.', items: ['Birler: 7 + 5 = 12', '2’yi yaz, 1 onluğu onlar basamağına aktar', 'Onlar: 6 + 8 + 1 = 15', '5’i yaz, 1 yüzlüğü yüzler basamağına aktar', 'Yüzler: 3 + 4 + 1 = 8', 'Sonuç: 852'] },
    ],
  },
  {
    id: 'g5-algoritma-tablosu',
    outcomes: ['MAT.5.2.4'],
    type: 'fill',
    stage: 'sembol',
    title: 'Algoritmayı tabloya dönüştür',
    instructions: 'Algoritmanın adımlarını uygula; girdi ile çıktı arasındaki ilişkiyi bul.',
    level: 2,
    launch: { text: 'Bir “sayı makinesi” her girdiye aynı işlemleri uyguluyor. Birkaç girdi ve çıktıya bakarak makinenin ne yaptığını bulabilir misin?' },
    reflect: 'Tablodaki algoritmayı sözlü olarak nasıl ifade edersin? Bir arkadaşına söyle.',
    items: [
      { text: 'Algoritma: Sayıyı gir → 2 ile çarp → 3 ekle → yazdır. Girilen sayı 6 ise yazdırılan sayı __', answers: ['15'] },
      { text: 'Tablodaki algoritmada girdi 4 iken çıktı __', answers: ['14'], visual: { kind: 'table', headers: ['Girdi', 'Çıktı'], rows: [[1, 5], [2, 8], [3, 11], [4, '?']] }, hints: ['Girdi 1 artınca çıktı kaç artıyor?'] },
      { text: 'Bu tablodaki algoritma girdiyi __ ile çarpıp __ ekler.', answers: ['3', '2'], visual: { kind: 'table', headers: ['Girdi', 'Çıktı'], rows: [[1, 5], [2, 8], [3, 11], [4, '?']] }, hints: ['Girdi 1 iken 3 × 1 = 3. Çıktı 5 olması için ne eklenmeli?'] },
      { text: 'Algoritma: Sayıyı gir → 5’e böl → 7 ekle → yazdır. Yazdırılan sayı 15 ise girilen sayı __', answers: ['40'], hints: ['Geriye doğru çalış: son adımı geri al.', 'Önce 7 çıkar, sonra 5 ile çarp.'] },
      { text: '700 g’ı 420 TL olan ürün için algoritma 420 ÷ 7 × 10 işlemiyle 1 kg’ın fiyatını __ TL bulur.', answers: ['600'] },
      { text: 'Sayı 5’ten başlıyor. “Sayı 20’den küçükse 4 ekle ve yeniden kontrol et; değilse sayıyı yazdır.” Yazdırılan sayı __', answers: ['21'], hints: ['5, 9, 13, 17, … Her seferinde 20’den küçük mü diye kontrol et.'] },
      { text: '“23’ten 5 çıkar; kalan 5’ten küçük olana kadar tekrarla” algoritması __ kez çıkarma yapar ve __ kalır.', answers: ['4', '3'], hints: ['23 → 18 → …', 'Bu algoritma hangi bölme işlemini yapıyor?'], explain: '23 ÷ 5 işleminde bölüm 4, kalan 3’tür.' },
    ],
  },
  {
    id: 'g5-akis-semasi-oku',
    outcomes: ['MAT.5.2.4'],
    type: 'quiz',
    stage: 'problem',
    title: 'Akış şemasını oku',
    instructions: 'Akış şemasını ve algoritmayı adım adım takip et.',
    level: 2,
    launch: { text: 'Marketteki fiyat etiketleri bazen 700 gram, bazen 1 kilogram için yazılır. Hangi ürünün daha ucuz olduğunu bulan bir algoritma yazabilir miyiz?', visual: AKIS_KG },
    reflect: 'Akış şemasında bir çıktıdan girdiyi bulmak için ne yaptın? Bu, işlemler arasındaki hangi ilişkiyi kullanıyor?',
    questions: [
      {
        prompt: { text: 'Bu akış şemasına 12 girilirse ne yazdırılır?', visual: AKIS_1 },
        choices: ['40', '48', '4', '56'],
        answer: 0,
        feedback: [null, '48, yalnızca ilk işlemin sonucu. Bir adım daha var.', 'Sırayı karıştırmış olabilirsin: önce 4 ile çarp, sonra 8 çıkar.', '8 eklenmiyor, çıkarılıyor.'],
      },
      {
        prompt: { text: 'Bu akış şeması 32 yazdırdıysa girilen sayı kaçtır?', visual: AKIS_1 },
        choices: ['6', '10', '8', '160'],
        answer: 1,
        feedback: ['6 girersen 6 × 4 − 8 = 16 olur. Geriye doğru çalış.', null, '32 ÷ 4 = 8 ama son adım 8 çıkarmaktı; önce onu geri al.', 'Geriye doğru çalışırken çarpmayı bölmeyle geri alırız.'],
      },
      {
        prompt: { text: 'Bu akış şemasına 280 girilirse 1 kg’ın fiyatı kaç TL yazdırılır?', visual: AKIS_KG },
        choices: ['400', '2.800', '40', '196'],
        answer: 0,
        feedback: [null, '7’ye bölme adımını atladın.', '40 TL 100 g’ın fiyatı; 10 ile çarpmayı unutma.', 'Fiyattan çıkarma yapılmıyor; bölme ve çarpma var.'],
      },
      {
        prompt: { text: 'Aynı üründen 2 tane alana 50 TL indirim yapılıyor. Ürünün fiyatı 175 TL girilirse ne yazdırılır?', visual: AKIS_2 },
        choices: ['350', '300', '125', '400'],
        answer: 1,
        feedback: ['İndirimi uygulamayı unuttun.', null, 'Önce fiyatı 2 ile çarp, sonra indirimi çıkar.', 'İndirim eklenmez, çıkarılır.'],
      },
      {
        prompt: 'Algoritma: 1) 17’den 5 çıkar ve sayacı 1 artır. 2) Kalan 5’ten küçük olana kadar 1. adımı tekrarla. 3) Sayacı ve kalanı yazdır. Ne yazdırılır?',
        choices: ['Sayaç: 3, kalan: 2', 'Sayaç: 2, kalan: 7', 'Sayaç: 4, kalan: 0', 'Sayaç: 3, kalan: 5'],
        answer: 0,
        feedback: [null, '7, 5’ten küçük değil; tekrar etmeye devam et.', '17’den 4 kez 5 çıkarabilir misin?', '5, 5’ten küçük değil; algoritma durmaz.'],
      },
      {
        prompt: 'Önceki sorudaki tekrarlı çıkarma algoritması hangi işlemi yapar?',
        choices: ['Toplama', 'Çarpma', 'Bölme', 'Üslü ifade'],
        answer: 2,
        feedback: ['Sayı her adımda küçülüyor; toplama değil.', 'Tekrarlı toplama çarpmadır; burada tekrarlı çıkarma var.', null, 'Üslü ifadede bir sayı kendisiyle çarpılır.'],
      },
    ],
  },

  // ── Veriden Olasılığa ──────────────────────────────────────────────────

  // MAT.5.6.1
  {
    id: 'g5-spektrumda-isaretle',
    outcomes: ['MAT.5.6.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Olasılığı işaretle',
    instructions: 'Sayı doğrusu 0 (imkânsız) ile 1 (kesin) arasında. Olayın olasılığını işaretle.',
    level: 1,
    launch: { text: 'Hava durumu sunucusu “Yarın yağış olasılığı %30.” dedi. Bu olasılığı 0 ile 1 arasındaki bir çizgi üzerinde nereye koyardın?' },
    reflect: 'Bir olayın olasılığı 1’den büyük olabilir mi? Neden?',
    tool: 'numberline',
    config: { min: 0, max: 1, step: 0.1 },
    tasks: [
      { prompt: 'İmkânsız bir olayın olasılığını işaretle.', target: { value: 0 } },
      { prompt: 'Yazı-tura atıldığında yazı gelme olasılığını işaretle.', target: { value: 0.5 }, hints: ['Yazı ve tura eşit şansa sahip mi?', '0 ile 1’in tam ortası neresi?'] },
      { prompt: 'Yağış olasılığı %30 olarak açıklandı. Bu olasılığı işaretle.', target: { value: 0.3 }, hints: ['%30 = [[30/100]] = [[3/10]].'] },
      { prompt: '10 eş parçalı bir çarkın 9 parçası kırmızı. Kırmızı gelme olasılığını işaretle.', target: { value: 0.9 }, hints: ['Kırmızı parçalar çarkın ne kadarı?'], explain: 'Olasılık 1’e çok yakın: çok olası ama kesin değil.' },
    ],
  },
  {
    id: 'g5-carkta-olasilik',
    outcomes: ['MAT.5.6.1'],
    type: 'quiz',
    stage: 'model',
    fixedOrder: true,
    title: 'Çark nerede durur?',
    instructions: 'Çarka bak: kırmızı gelme olasılığı olasılık spektrumunun neresinde?',
    level: 1,
    launch: { text: 'Bir oyun çarkının ne kadarının kırmızı olduğu, kırmızı gelme şansını nasıl etkiler?', visual: { kind: 'spinner', sectors: [{ label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }, { label: '', color: '#3b82f6' }] } },
    reflect: 'Kırmızı gelme olasılığının “çok olası” olması için bir çarkı nasıl boyardın?',
    questions: [
      {
        prompt: { text: 'Kırmızı gelme olasılığı nasıldır?', visual: { kind: 'spinner', sectors: [{ label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }] } },
        choices: OLASILIK,
        answer: 4,
        feedback: ['Çarkta kırmızı var mı? Bak!', 'Çarkın ne kadarı kırmızı?', 'Kırmızı olmayan bir bölge var mı?', 'Çark başka bir renkte durabilir mi?', null],
      },
      {
        prompt: { text: 'Kırmızı gelme olasılığı nasıldır?', visual: { kind: 'spinner', sectors: [{ label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }] } },
        choices: OLASILIK,
        answer: 0,
        feedback: [null, 'Çarkta hiç kırmızı bölge var mı?', 'Çarkta hiç kırmızı bölge var mı?', 'Çarkta hiç kırmızı bölge var mı?', 'Çarkta hiç kırmızı bölge var mı?'],
      },
      {
        prompt: { text: 'Kırmızı gelme olasılığı nasıldır?', visual: { kind: 'spinner', sectors: [{ label: '', color: '#ef4444' }, { label: '', color: '#3b82f6' }, { label: '', color: '#ef4444' }, { label: '', color: '#3b82f6' }] } },
        choices: OLASILIK,
        answer: 2,
        feedback: ['Çarkta kırmızı bölgeler var.', 'Kırmızı ve mavi bölgeleri karşılaştır: biri diğerinden az mı?', null, 'Kırmızı ve mavi bölgeleri karşılaştır: biri diğerinden çok mu?', 'Çark mavide de durabilir.'],
      },
      {
        prompt: { text: 'Kırmızı gelme olasılığı nasıldır?', visual: { kind: 'spinner', sectors: [{ label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }, { label: '', color: '#ef4444' }, { label: '', color: '#3b82f6' }] } },
        choices: OLASILIK,
        answer: 3,
        feedback: ['Çarkta kırmızı bölgeler var.', 'Kırmızı bölgeler çarkın yarısından az mı, çok mu?', 'Kırmızı ve mavi bölgeler eşit mi? Say.', null, 'Bir mavi bölge var; çark orada da durabilir.'],
      },
      {
        prompt: { text: 'Kırmızı gelme olasılığı nasıldır?', visual: { kind: 'spinner', sectors: [{ label: '', color: '#ef4444' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }, { label: '', color: '#3b82f6' }] } },
        choices: OLASILIK,
        answer: 1,
        feedback: ['Bir kırmızı bölge var; çark orada durabilir.', null, '8 bölgeden yalnız 1’i kırmızı. Bu yarı yarıya mı?', 'Kırmızı bölgeler çarkın yarısından az mı, çok mu?', 'Çark mavide de durabilir.'],
      },
    ],
  },
  {
    id: 'g5-olasilik-degeri-olabilir-mi',
    outcomes: ['MAT.5.6.1'],
    type: 'categorize',
    stage: 'sembol',
    title: 'Olasılık değeri olabilir mi?',
    instructions: 'Bir olayın olasılığı 0 ile 1 arasındadır (0 ve 1 dâhil). Her sayıyı doğru gruba sürükle.',
    level: 2,
    launch: { text: 'Bir futbolcu “Bu maçı %120 kazanacağız!” diyor. Bu sözü matematiksel olarak nasıl yorumlarsın?' },
    reflect: 'Olasılığın neden 0’dan küçük ya da 1’den büyük olamayacağını kendi sözlerinle açıkla.',
    categories: [
      { id: 'olur', label: 'Olasılık değeri olabilir', color: '#22c55e' },
      { id: 'olmaz', label: 'Olasılık değeri olamaz', color: '#ef4444' },
    ],
    items: [
      { content: '0', category: 'olur', explain: '0, imkânsız bir olayın olasılığıdır.' },
      { content: '1', category: 'olur', explain: '1, kesin bir olayın olasılığıdır.' },
      { content: '[[1/2]]', category: 'olur' },
      { content: '0,75', category: 'olur' },
      { content: '%30', category: 'olur' },
      { content: '%100', category: 'olur', explain: '%100 = 1: kesin olay.' },
      { content: '1,5', category: 'olmaz', explain: '1,5 > 1. Bir olay “kesin”den daha olası olamaz.' },
      { content: '%120', category: 'olmaz', explain: '%120 > %100.' },
      { content: '[[5/4]]', category: 'olmaz', explain: '[[5/4]] bir bütünden fazladır.' },
      { content: '2', category: 'olmaz' },
    ],
  },
  {
    id: 'g5-olasilik-gosterimleri',
    outcomes: ['MAT.5.6.1'],
    type: 'match',
    stage: 'sembol',
    title: 'Olasılığın farklı gösterimleri',
    instructions: 'Her olasılığı kesir, ondalık ya da yüzde gösterimiyle eşleştir.',
    level: 2,
    launch: { text: 'Olasılığı sözcüklerle (“imkânsız”, “kesin”), kesirle, ondalık gösterimle ya da yüzdeyle söyleyebiliriz. Hepsi aynı şeyi anlatabilir.' },
    reflect: 'Bir olasılığı söylemek için hangi gösterimi tercih edersin? Neden?',
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
    id: 'g5-olasilik-spektrumu',
    outcomes: ['MAT.5.6.1'],
    type: 'quiz',
    stage: 'problem',
    fixedOrder: true,
    title: 'Olasılık spektrumu',
    instructions: 'Olayın olasılığını spektrumda nereye yerleştirirsin? Gerekçeni düşün.',
    level: 1,
    launch: { text: '“Kesin”, “muhtemelen”, “belki”, “pek sanmam”, “asla”... Günlük hayatta olasılığı sözcüklerle anlatırız. Bu sözcükleri 0 ile 1 arasına dizebilir miyiz?' },
    reflect: 'Bir olayın olasılığını “az olası” ya da “çok olası” diye belirlerken hangi bilgilerden yararlandın?',
    questions: [
      { prompt: 'Bir zar atıldığında 7 gelmesi', choices: OLASILIK, answer: 0, feedback: [null, 'Zarın yüzlerinde hangi sayılar var? 7 var mı?', 'Zarın yüzlerinde 7 yok.', 'Zarın yüzlerinde 7 yok.', 'Zarın yüzlerinde 7 yok.'] },
      { prompt: 'Yazı-tura atıldığında tura gelmesi', choices: OLASILIK, answer: 2, feedback: ['Tura gelebilir mi? Evet!', 'Paranın iki yüzü var; tura bunlardan biri.', null, 'Yazı da tura da aynı şansa sahip.', 'Yazı da gelebilir.'] },
      { prompt: 'Yarın sabah Güneş’in doğması', choices: OLASILIK, answer: 4, feedback: ['Güneş her sabah doğar.', 'Güneş her sabah doğar.', 'Güneş’in doğmama ihtimali var mı?', 'Bunu “kesin” diye söyleyebilir miyiz? Güneş hiç doğmadan kalır mı?', null] },
      { prompt: '9 kırmızı ve 1 mavi top bulunan torbadan kırmızı top çekilmesi', choices: OLASILIK, answer: 3, feedback: ['Torbada kırmızı top var.', 'Kırmızılar mavilerden az mı?', 'Kırmızılar ile maviler eşit sayıda mı?', null, 'Bir mavi top var; o da çekilebilir.'] },
      { prompt: '9 kırmızı ve 1 mavi top bulunan torbadan mavi top çekilmesi', choices: OLASILIK, answer: 1, feedback: ['Torbada bir mavi top var; çekilebilir.', null, 'Maviler ile kırmızılar eşit sayıda mı?', 'Mavi top kırmızılardan çok mu?', 'Kırmızı da çekilebilir.'] },
      { prompt: 'Bir zar atıldığında çift sayı gelmesi', choices: OLASILIK, answer: 2, feedback: ['Zarda çift sayılar var: 2, 4, 6.', 'Çift sayılar (2, 4, 6) ile tek sayılar (1, 3, 5) kaçar tane?', null, 'Çift ve tek sayılar eşit sayıda.', 'Tek sayı da gelebilir.'] },
      { prompt: 'Bir haftanın 8 gün sürmesi', choices: OLASILIK, answer: 0, feedback: [null, 'Bir hafta her zaman 7 gündür.', 'Bir hafta her zaman 7 gündür.', 'Bir hafta her zaman 7 gündür.', 'Bir hafta her zaman 7 gündür.'] },
      { prompt: 'Temmuz ayında Antalya’da havanın sıcak olması', choices: OLASILIK, answer: 3, feedback: ['Temmuzda Antalya’da hava genelde nasıldır?', 'Temmuzda Antalya’da hava genelde nasıldır?', 'Sıcak olmama ihtimali sıcak olma ihtimaliyle eşit mi?', null, 'Çok sıcak bir aydır ama serin bir gün olması imkânsız değil.'] },
    ],
  },
  {
    id: 'g5-olasilik-hangisi-farkli',
    outcomes: ['MAT.5.6.1'],
    type: 'quiz',
    stage: 'problem',
    anyCorrect: true,
    title: 'Hangisi farklı? Olasılık',
    instructions: 'Hangisi diğerlerinden farklı? İstediğini seç ve gerekçeni düşün. Birden çok doğru cevap var!',
    level: 2,
    launch: { text: 'Olasılık spektrumunda her sayının ve her olayın bir yeri var. Ama hepsi bu spektrumun üzerinde mi?' },
    reflect: 'Seçtiğin seçeneği olasılık spektrumunda nereye koyardın? Spektrumun dışında kalan bir şey var mıydı?',
    questions: [
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['0', '%50', '1', '1,5'],
        answer: 0,
        reasons: [
          'İmkânsız bir olayın olasılığını gösteren tek sayı.',
          'Yüzde ile yazılan tek seçenek; “eşit olası” durumu gösterir.',
          'Kesin bir olayın olasılığını gösteren tek sayı.',
          'Olasılık değeri olamayan tek sayı: 1’den büyük.',
        ],
      },
      {
        prompt: 'Hangisi farklı? Gerekçeni düşün.',
        choices: ['Zar atınca 7 gelmesi', 'Yazı-tura atınca yazı gelmesi', 'Zar atınca 6’dan küçük bir sayı gelmesi', 'Yarın Güneş’in doğması'],
        answer: 0,
        reasons: [
          'İmkânsız olan tek olay (olasılığı 0).',
          'Olasılığı tam yarım olan tek olay.',
          'Çok olası ama kesin olmayan tek olay.',
          'Kesin olan tek olay (olasılığı 1); zar ya da para kullanılmayan tek olay.',
        ],
      },
    ],
  },

  // MAT.5.6.2
  {
    id: 'g5-torba-deneyi',
    outcomes: ['MAT.5.6.2'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Torbadan top çek',
    instructions: 'Torbada 3 kırmızı ve 1 mavi top var. Önce tahmin et, sonra birkaç kez top çek, sonuçları incele ve soruyu cevapla.',
    level: 1,
    launch: { text: 'Ece: “Kırmızı benim şanslı rengim, kırmızı top çekeceğim!” diyor. Torbada 3 kırmızı ve 1 mavi top var. Ece’nin tahmini neye dayanmalı?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 1 }] } },
    reflect: 'Deneyden önceki tahminin ile sonuçlar uyuştu mu? Uyuşmadıysa neden olabilir?',
    tool: 'probability',
    config: { mode: 'bag', sectors: [{ label: 'Kırmızı', color: '#ef4444', weight: 3 }, { label: 'Mavi', color: '#3b82f6', weight: 1 }] },
    tasks: [
      { prompt: 'Torbadan 10 kez top çek. Kırmızı top çekme olasılığı nasıldır?', target: { question: 'Kırmızı top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'Çok olası' }, hints: ['Torbada kırmızılar mı daha çok, maviler mi?'] },
      { prompt: 'Sonuçlara yeniden bak. Mavi top çekme olasılığı nasıldır?', target: { question: 'Mavi top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'Az olası' } },
      { prompt: 'Torbada yeşil top yok. Yeşil top çekme olasılığı nasıldır?', target: { question: 'Yeşil top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'İmkânsız' } },
      { prompt: 'Çekilen topun kırmızı ya da mavi olma olasılığı nasıldır?', target: { question: 'Kırmızı ya da mavi top çekme olasılığı nasıldır?', choices: ['İmkânsız', 'Az olası', 'Eşit olası', 'Çok olası', 'Kesin'], answer: 'Kesin' }, explain: 'Torbadaki bütün toplar kırmızı ya da mavi: başka bir sonuç mümkün değil.' },
    ],
  },
  {
    id: 'g5-cark-deneyi',
    outcomes: ['MAT.5.6.2', 'MAT.5.6.1'],
    type: 'manipulative',
    stage: 'somut',
    title: 'Çarkı çevir',
    instructions: 'Çarkın yarısı mor, dörtte biri sarı, dörtte biri yeşil. Önce tahmin et, sonra çarkı birkaç kez çevir ve soruyu cevapla.',
    level: 2,
    launch: { text: 'Okul şenliğindeki çarkın yarısı mor. Çarkı 10 kez çevirirsen kaç kez mor gelmesini beklersin?', visual: { kind: 'spinner', sectors: [{ label: 'Mor', color: '#a855f7' }, { label: 'Mor', color: '#a855f7' }, { label: 'Sarı', color: '#eab308' }, { label: 'Yeşil', color: '#22c55e' }] } },
    reflect: 'Çarkı 10 kez çevirince tam 5 kez mor gelmedi diyelim. Bu, olasılığın yanlış olduğunu mu gösterir?',
    tool: 'probability',
    config: { mode: 'spinner', sectors: [{ label: 'Mor', color: '#a855f7', weight: 2 }, { label: 'Sarı', color: '#eab308', weight: 1 }, { label: 'Yeşil', color: '#22c55e', weight: 1 }] },
    tasks: [
      { prompt: 'Çarkı 10 kez çevir. Mor gelme olasılığı nasıldır?', target: { question: 'Mor gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'Eşit olası (%50)' } },
      { prompt: 'Sarı gelme olasılığı nasıldır?', target: { question: 'Sarı gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'Az olası' } },
      { prompt: 'Çarkta turuncu bölge yok. Turuncu gelme olasılığı nasıldır?', target: { question: 'Turuncu gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'İmkânsız (%0)' } },
      { prompt: 'Mor ya da sarı gelme olasılığı nasıldır?', target: { question: 'Mor ya da sarı gelme olasılığı nasıldır?', choices: ['İmkânsız (%0)', 'Az olası', 'Eşit olası (%50)', 'Çok olası', 'Kesin (%100)'], answer: 'Çok olası' }, hints: ['Mor ve sarı birlikte çarkın ne kadarını kaplıyor?'] },
    ],
  },
  {
    id: 'g5-hangi-torba',
    outcomes: ['MAT.5.6.2'],
    type: 'quiz',
    stage: 'model',
    title: 'Hangi torba?',
    instructions: 'Torbaları incele ve hangi olayın daha olası olduğuna karar ver.',
    level: 2,
    launch: { text: 'İki torbadan birini seçip kırmızı top çekmeye çalışacaksın. Hangi torbayı seçeceğine nasıl karar verirsin?' },
    reflect: 'Torbadaki kırmızı top sayısı tek başına yeterli mi, yoksa toplam top sayısına da bakmak gerekir mi? Bir örnekle açıkla.',
    questions: [
      {
        prompt: 'Hangi torbadan kırmızı top çekmek daha olasıdır?',
        choices: [
          { text: 'A torbası', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 1 }] } },
          { text: 'B torbası', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 1 }, { emoji: '🔵', count: 3 }] } },
          'İkisi de eşit olası',
        ],
        answer: 0,
        feedback: [null, 'B torbasında kırmızılar mı daha çok, maviler mi?', 'A’da 3 kırmızı 1 mavi, B’de 1 kırmızı 3 mavi var. Aynı mı?'],
      },
      {
        prompt: 'Hangi torbadan kırmızı top çekmek daha olasıdır?',
        choices: [
          { text: 'A torbası', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 2 }, { emoji: '🔵', count: 2 }] } },
          { text: 'B torbası', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 5 }, { emoji: '🔵', count: 5 }] } },
          'İkisi de eşit olası',
        ],
        answer: 2,
        feedback: ['A’da kırmızılar topların yarısı. B’de kırmızılar topların ne kadarı?', 'B’de daha çok kırmızı var ama mavi de daha çok. Kırmızılar topların ne kadarı?', null],
      },
      {
        prompt: 'Hangi torbadan kırmızı top çekmek daha olasıdır?',
        choices: [
          { text: 'A torbası', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 1 }, { emoji: '🔵', count: 3 }] } },
          { text: 'B torbası', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 1 }, { emoji: '🔵', count: 1 }] } },
          'İkisi de eşit olası',
        ],
        answer: 1,
        feedback: ['İkisinde de 1 kırmızı var ama A’da maviler çok daha fazla.', null, 'Kırmızı sayıları eşit ama mavi sayıları farklı.'],
      },
      {
        prompt: { text: 'Bu torbadan çekilen topun rengi için hangisi doğrudur?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 5 }, { emoji: '🔵', count: 1 }, { emoji: '🟢', count: 2 }] } },
        choices: ['Kırmızı çekmek en olasıdır.', 'Mavi çekmek en olasıdır.', 'Yeşil çekmek imkânsızdır.', 'Her renk eşit olasıdır.'],
        answer: 0,
        feedback: [null, 'Torbada yalnız 1 mavi var.', 'Torbada 2 yeşil top var; çekilebilir.', 'Renklerin top sayıları eşit mi?'],
      },
      {
        prompt: { text: 'Mavi top çekmenin “çok olası” olması için torbaya hangisi eklenmeli?', visual: { kind: 'emojiGroups', groups: [{ emoji: '🔴', count: 3 }, { emoji: '🔵', count: 1 }] } },
        choices: ['5 mavi top', '1 mavi top', '3 kırmızı top', 'Hiçbir şey'],
        answer: 0,
        feedback: [null, 'O zaman 2 mavi ve 3 kırmızı olur; mavi hâlâ daha az.', 'Kırmızı eklemek maviyi daha az olası yapar.', 'Şu an mavi çekmek az olası.'],
      },
    ],
  },
  {
    id: 'g5-az-mi-cok-mu-olasi',
    outcomes: ['MAT.5.6.2'],
    type: 'categorize',
    stage: 'problem',
    title: 'Az olası mı, çok olası mı?',
    instructions: 'Olayları olasılıklarına göre “Az olası” ya da “Çok olası” grubuna sürükle. Gerekçeni düşün.',
    level: 1,
    launch: { text: 'Ocakta Erzurum’a kar yağması mı, temmuzda Antalya’ya kar yağması mı daha olası? Bunu nasıl biliyoruz?' },
    reflect: 'Bir olayın az ya da çok olası olduğuna karar verirken deneyimlerinden mi, sayılardan mı yararlandın? Örnek ver.',
    categories: [
      { id: 'az', label: 'Az olası', color: '#3b82f6' },
      { id: 'cok', label: 'Çok olası', color: '#f97316' },
    ],
    items: [
      { content: '3 kırmızı, 1 mavi top bulunan torbadan kırmızı top çekmek', category: 'cok' },
      { content: '3 kırmızı, 1 mavi top bulunan torbadan mavi top çekmek', category: 'az' },
      { content: 'Ocak ayında Erzurum’a kar yağması', category: 'cok' },
      { content: 'Temmuz ayında Antalya’ya kar yağması', category: 'az', explain: 'Temmuz çok sıcak bir aydır; kar yağması çok az olasıdır.' },
      { content: 'Zar atıldığında 6 gelmesi', category: 'az', explain: '6 sonuçtan yalnız biri 6.' },
      { content: 'Zar atıldığında 6’dan küçük bir sayı gelmesi', category: 'cok', explain: '6 sonuçtan 5’i 6’dan küçük.' },
      { content: 'Yağış olasılığı %90 denilen günde yağmur yağması', category: 'cok' },
      { content: 'Yağış olasılığı %20 denilen günde yağmur yağması', category: 'az' },
      { content: 'Sekiz eş parçasının yedisi kırmızı olan çarkta kırmızı gelmesi', category: 'cok' },
      { content: '30 kişilik sınıfta kurayla seçilen öğrencinin sen olman', category: 'az' },
    ],
  },
  {
    id: 'g5-hangisi-daha-olasi',
    outcomes: ['MAT.5.6.2'],
    type: 'quiz',
    stage: 'problem',
    title: 'Hangisi daha olası?',
    instructions: 'Olayların olasılıklarını karşılaştır ve gerekçeni düşün.',
    level: 2,
    launch: { text: 'Bir oyunda zar atılıyor: 1 ya da 2 gelirse Ali, 3, 4, 5 ya da 6 gelirse Ayşe kazanıyor. Bu oyun adil mi? Oynamadan önce tahmin et!' },
    reflect: 'Adil olmayan oyunu adil hâle getirmek için kuralları nasıl değiştirirdin?',
    questions: [
      {
        prompt: 'A torbasında 3 kırmızı ve 1 mavi, B torbasında 1 kırmızı ve 3 mavi top var. Hangi torbadan kırmızı top çekmek daha olasıdır?',
        choices: ['A torbasından', 'B torbasından', 'İkisi de eşit olası'],
        answer: 0,
        feedback: [null, 'B torbasında kırmızılar azınlıkta.', 'Torbalardaki kırmızı top sayıları farklı.'],
      },
      {
        prompt: 'Bir zar atıldığında hangisi daha olasıdır?',
        choices: ['1 gelmesi', '6’dan küçük bir sayı gelmesi', '7 gelmesi'],
        answer: 1,
        feedback: ['1 gelmesi tek bir sonuçtur; 6’dan küçük 5 sonuç var.', null, '7 gelmesi imkânsızdır.'],
      },
      {
        prompt: 'Yağış olasılığı %80 olan bir gün için hangisi doğrudur?',
        choices: ['Yağmur yağması kesindir.', 'Yağmur yağması çok olasıdır.', 'Yağmur yağması az olasıdır.', 'Yağmur yağması imkânsızdır.'],
        answer: 1,
        feedback: ['Kesin olması için %100 olmalıydı.', null, '%80, %50’den fazladır.', '%80, %0’dan çok uzaktır.'],
      },
      {
        prompt: 'Ece: “Kırmızı benim şanslı rengim. 1 kırmızı ve 5 mavi top olan torbadan kırmızı çekeceğim.” Ece’nin düşüncesi için ne söylenebilir?',
        choices: ['Doğrudur; şanslı renk olasılığı artırır.', 'Kırmızı çekmek kesindir.', 'Yanlıştır; mavi toplar daha fazla olduğundan kırmızı çekmek az olasıdır.', 'Kırmızı çekmek imkânsızdır.'],
        answer: 2,
        feedback: ['Torba Ece’nin en sevdiği rengi bilmez; olasılığı toplardaki renk sayıları belirler.', 'Torbada mavi toplar da var.', null, 'Torbada 1 kırmızı top var; çekilebilir.'],
      },
      {
        prompt: 'Bir oyunda zar atılıyor. 1 ya da 2 gelirse Ali, 3, 4, 5 ya da 6 gelirse Ayşe kazanıyor. Oyun adil midir?',
        choices: ['Evet, adildir.', 'Hayır, Ali’nin kazanması daha olasıdır.', 'Hayır, Ayşe’nin kazanması daha olasıdır.'],
        answer: 2,
        feedback: ['Ali’nin 2, Ayşe’nin 4 kazanma durumu var. Eşit mi?', 'Ali kaç sonuçta kazanıyor, Ayşe kaç sonuçta?', null],
      },
      {
        prompt: '15 kız ve 10 erkek öğrenci arasından kurayla bir öğrenci seçilecek. Seçilenin kız olması için ne söylenebilir?',
        choices: ['Erkek olmasından daha olasıdır.', 'Erkek olmasından daha az olasıdır.', 'Erkek olmasıyla eşit olasıdır.', 'İmkânsızdır.'],
        answer: 0,
        feedback: [null, 'Kızlar mı daha çok, erkekler mi?', '15 ile 10 eşit değil.', 'Sınıfta kız öğrenciler var.'],
      },
      {
        prompt: 'Hangi olayın olasılığı daha azdır?',
        choices: ['Ocak ayında Erzurum’a kar yağması', 'Ağustos ayında Erzurum’a kar yağması', 'İlkbaharda İstanbul’a yağmur yağması'],
        answer: 1,
        feedback: ['Ocak, Erzurum’da çok soğuk bir aydır; kar yağması çok olasıdır.', null, 'İlkbaharda İstanbul’a sık yağmur yağar.'],
      },
    ],
  },
]

/** Tema notları: öğretmen ve veliler için “büyük fikirler” */
export const grade5Notes: ThemeNotes = {
  'geometrik-sekiller': {
    bigIdeas: [
      'Geometrik şekiller özellikleriyle tanımlanır: kenar sayısı, kenar uzunlukları, açılar ve kapalılık. Çocuklar önce görünüşe, sonra özelliklere bakar (van Hiele düzeyleri); sınıflandırma ve “her zaman / bazen / asla” tartışmaları bu geçişi destekler.',
      'Açı bir dönme miktarıdır; ölçüsü kolların uzunluğuna değil, kollar arasındaki açıklığa bağlıdır. Derece, tam açının 360 eş parçasından biridir ve açılar bu birim açının yinelenmesiyle ölçülür.',
      'Kesişen doğruların oluşturduğu açılar arasında ilişkiler vardır: ters açılar eşittir, komşu bütünler açıların toplamı 180°’dir. Üçgenin iç açılarının toplamı 180°’dir.',
      'Pergel uzunluğu taşır: kesişen iki çemberle, ölçme yapmadan eşkenar, ikizkenar ve çeşitkenar üçgen inşa edilebilir; kenarların eşitliği yarıçapların eşitliğinden gelir.',
    ],
  },
  'sayilar-ve-nicelikler-1': {
    bigIdeas: [
      'Onluk sistemde her basamak, sağındakinin 10 katıdır; her bölük (birler, binler, milyonlar, milyarlar) bir öncekinin 1.000 katıdır. Okunuş, her üç basamakta tekrar eden bir örüntüdür.',
      'Sıfır bir yer tutucudur: boş bir bölük okunmaz ama yazılırken üç sıfırla yer tutar.',
      'Problem çözmede önce ilişkiyi anlamak gerekir: şerit (bar) modeli, bilinmeyenin parça mı bütün mü olduğunu gösterir ve işlem seçimini kolaylaştırır.',
      'Hesaplamadan önce tahmin etmek ve bölmede kalanı bağlama göre yorumlamak (yukarı yuvarlamak, atmak ya da cevap olarak vermek) sonucun anlamlı olup olmadığını kontrol etmeyi sağlar.',
    ],
  },
  'geometrik-nicelikler': {
    bigIdeas: [
      'Alan, bir yüzeyi boşluk bırakmadan ve üst üste gelmeden kaplayan birim karelerin sayısıdır; dikdörtgenin alan bağıntısı (iki komşu kenarın çarpımı), birim karelerin sıra ve sütunlarla sayılmasından doğar.',
      'Çevre bir uzunluk, alan ise bir kaplama ölçüsüdür. Aynı çevreye sahip dikdörtgenlerin alanları, aynı alana sahip dikdörtgenlerin çevreleri farklı olabilir.',
      'Bir şekil parçalanıp yeniden düzenlendiğinde alanı korunur; görünüşün değişmesi alanın değiştiği anlamına gelmez.',
      'Gerçek yaşam problemlerinde önce çevre mi alan mı istendiğine karar vermek ve bir çizim yapmak, doğru işlemi seçmenin anahtarıdır.',
    ],
  },
  'sayilar-ve-nicelikler-2': {
    bigIdeas: [
      'Kesirler birer sayıdır ve sayı doğrusunda bir yerleri vardır. Bütün kesir gösterimleri birim kesrin yinelenmesinden türetilir: [[7/3]], yedi tane [[1/3]] demektir.',
      'Aynı büyüklük bileşik kesir, tam sayılı kesir, ondalık gösterim ve yüzde ile ifade edilebilir; yüzlük kart ve sayı doğrusu bu gösterimleri birbirine bağlar.',
      'Kesirler ortak payda bulmadan da karşılaştırılabilir: payları eşitse parça büyüklüğüne, paydaları eşitse parça sayısına, değilse 0, [[1/2]] ve 1 referanslarına ya da bütüne kalan parçaya bakılır.',
      'Paydanın büyümesi parçanın küçülmesi demektir; “[[1/8]] > [[1/4]] çünkü 8 > 4” en yaygın yanılgıdır.',
    ],
  },
  'istatistiksel-arastirma-sureci': {
    bigIdeas: [
      'İstatistik bir soruyla başlar: cevapları kişiden kişiye değişen ve veri toplanarak cevaplanabilen bir araştırma sorusu.',
      'Her gösterimin bir amacı vardır: sütun grafiği kategorileri karşılaştırır, daire grafiği parça-bütün ilişkisini gösterir, sıklık tablosu verileri düzenler.',
      'Veriye dayalı yorumlar sorgulanmalıdır: kimden veri toplandığı, kaç kişiye sorulduğu ve grafiğin nasıl çizildiği sonuçları yanlı ya da yanıltıcı yapabilir.',
    ],
  },
  'islemlerle-cebirsel-dusunme': {
    bigIdeas: [
      'Eşittir işareti “sonucu yaz” değil, “iki taraf aynı değerde” demektir. Eşitliğin iki tarafına aynı işlem yapıldığında eşitlik korunur.',
      'Değişme, birleşme ve dağılma özellikleri dizi ve alan modellerinde görülerek keşfedilir; zihinden işlem stratejilerinin temelidir.',
      'İşlem önceliği, herkesin bir sayı cümlesini aynı biçimde okuması için yapılmış bir anlaşmadır; bağlam (hikâye, resim) hangi işlemin önce yapılacağını anlamlı kılar.',
      'Sabit artan örüntülerde kural, adım sayısı ile terim arasındaki ilişkidir; uzak adımları bulmak için “bir öncekine ekle” yerine bu ilişkiyi sözle ifade etmek gerekir. Algoritmalar da işlemlerin adım adım ve sıralı ifadesidir.',
    ],
  },
  'veriden-olasiliga': {
    bigIdeas: [
      'Bir olayın olasılığı 0 (imkânsız) ile 1 (kesin) arasında bir sayıdır; bu spektrum kesir, ondalık gösterim ya da yüzde ile ifade edilebilir.',
      'Olasılık tahmini, şans ya da “şanslı renk” gibi inançlara değil, olası durumların sayısına ve deneyime dayanır.',
      'Deney sonuçları tahminden biraz farklı çıkabilir; az sayıda denemede bu doğaldır.',
    ],
  },
}
