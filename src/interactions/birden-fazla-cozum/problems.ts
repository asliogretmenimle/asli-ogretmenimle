import type { Grade } from '../../data/types'

/**
 * Birden Fazla Çözüm — zengin problem bankası. Üç problem yapısı:
 *  - ikili: iki niceliğin toplamı ve farkı (fark) ya da toplamı ve katı (kat)   → şerit modeli, tablo, tahmin-kontrol, denklem
 *  - bacak: iki tür nesne, sayı ve toplam değer (tavuk-tavşan, 5 TL-10 TL…)     → model (dokun-değiştir), tablo, tahmin-kontrol, “hepsi aynı olsaydı”, denklem
 *  - geri:  bilinmeyen başlangıç, işlem zinciri, sonuç                          → geriye doğru çalış, tablo, tahmin-kontrol, denklem
 */

export interface Base { id: string; g: Grade[]; emoji: string; story: string; question: string; dec?: boolean; neg?: boolean; tableStart?: number; tableStep?: number }
export interface Ikili extends Base { kind: 'ikili'; mode: 'fark' | 'kat'; a: string; b: string; unit: string; total: number; d: number }
export interface Thing { name: string; emoji: string; v: number }
export interface Bacak extends Base { kind: 'bacak'; n: number; total: number; k1: Thing; k2: Thing; what: string }
export type OpK = '+' | '−' | '×' | '÷' | '²'
export interface Op { o: OpK; n: number }
export interface Geri extends Base { kind: 'geri'; ops: Op[]; result: number }
export type Problem = Ikili | Bacak | Geri

export type LaneId = 'model' | 'tablo' | 'tahmin' | 'varsay' | 'geri' | 'denklem'

// ───────── sayı yardımcıları ─────────
export const r3 = (n: number) => Math.round(n * 1000) / 1000
export const nf = (n: number) => r3(n).toLocaleString('tr-TR', { maximumFractionDigits: 3, useGrouping: Math.abs(n) >= 10000 }).replace('-', '−')
export const par = (n: number) => (n < 0 ? `(${nf(n)})` : nf(n))

export function applyOp(x: number, op: Op): number {
  switch (op.o) {
    case '+': return r3(x + op.n)
    case '−': return r3(x - op.n)
    case '×': return r3(x * op.n)
    case '÷': return r3(x / op.n)
    case '²': return r3(x * x)
  }
}
export const run = (p: Geri, x: number) => p.ops.reduce(applyOp, x)
export const opText = (op: Op) => (op.o === '²' ? 'karesini al' : `${op.o} ${par(op.n)}`)
export const invText = (op: Op) => (op.o === '+' ? `− ${par(op.n)}` : op.o === '−' ? `+ ${par(op.n)}` : op.o === '×' ? `÷ ${par(op.n)}` : op.o === '÷' ? `× ${par(op.n)}` : 'karekök al')
export function invOp(x: number, op: Op): number {
  switch (op.o) {
    case '+': return r3(x - op.n)
    case '−': return r3(x + op.n)
    case '×': return r3(x / op.n)
    case '÷': return r3(x * op.n)
    case '²': return r3(Math.sqrt(x))
  }
}

/** ikili: [küçük/ilk (a), büyük/ikinci (b)] */
export function ikiliAns(p: Ikili): [number, number] {
  if (p.mode === 'fark') {
    const s = r3((p.total - p.d) / 2)
    return [s, r3(s + p.d)]
  }
  const s = r3(p.total / (p.d + 1))
  return [s, r3(s * p.d)]
}
/** bacak: [k2 sayısı, k1 sayısı] */
export function bacakAns(p: Bacak): [number, number] {
  const x2 = r3((p.total - p.n * p.k1.v) / (p.k2.v - p.k1.v))
  return [x2, p.n - x2]
}
export const geriAns = (p: Geri) => p.ops.reduceRight(invOp, p.result)

export function answerText(p: Problem): string {
  if (p.kind === 'ikili') {
    const [s, b] = ikiliAns(p)
    return `${p.a}: ${nf(s)}, ${p.b}: ${nf(b)} ${p.unit}`
  }
  if (p.kind === 'bacak') {
    const [x2, x1] = bacakAns(p)
    return `${nf(x2)} ${p.k2.name}, ${nf(x1)} ${p.k1.name}`
  }
  return `Başlangıç sayısı: ${nf(geriAns(p))}`
}

/** Cebirsel ifade: işlemleri x’e sırayla uygula */
export function exprOf(ops: Op[], x = 'x'): string {
  let e = x
  let atom = true
  for (const op of ops) {
    if (op.o === '²') {
      e = atom ? `${e}^{2}` : `(${e})^{2}`
      atom = true
    } else if (op.o === '×') {
      e = atom && e === x ? `${op.n < 0 ? `(${nf(op.n)})` : nf(op.n)}${x}` : `${par(op.n)}(${e})`
      atom = true
    } else if (op.o === '÷') {
      e = atom ? `${e} ÷ ${par(op.n)}` : `(${e}) ÷ ${par(op.n)}`
      atom = false
    } else {
      e = `${e} ${op.o} ${par(op.n)}`
      atom = false
    }
  }
  return e
}

// ───────── banka ─────────
const ik = (o: Omit<Ikili, 'kind'>): Ikili => ({ kind: 'ikili', ...o })
const bc = (o: Omit<Bacak, 'kind'>): Bacak => ({ kind: 'bacak', ...o })
const gr = (o: Omit<Geri, 'kind'>): Geri => ({ kind: 'geri', ...o })

export const PROBLEMS: Problem[] = [
  // ── 2. sınıf ──
  ik({ id: 'g2-bilye', g: [2], emoji: '🔵', mode: 'fark', a: 'Ali', b: 'Ece', unit: 'bilye', total: 14, d: 4, story: 'Ali ile Ece’nin toplam 14 bilyesi var. Ece’nin bilyeleri Ali’ninkinden 4 tane fazla.', question: 'Kimin kaç bilyesi var?' }),
  ik({ id: 'g2-meyve', g: [2], emoji: '🍎', mode: 'fark', a: 'Armut', b: 'Elma', unit: 'tane', total: 12, d: 2, story: 'Sepette toplam 12 elma ve armut var. Elmalar armutlardan 2 tane fazla.', question: 'Sepette kaç elma, kaç armut var?' }),
  bc({ id: 'g2-tavuk-kopek', g: [2, 3], emoji: '🐔', n: 5, total: 14, k1: { name: 'tavuk', emoji: '🐔', v: 2 }, k2: { name: 'köpek', emoji: '🐶', v: 4 }, what: 'ayak', story: 'Bahçede tavuklar ve köpekler var. Toplam 5 hayvan ve 14 ayak sayıldı.', question: 'Kaç köpek, kaç tavuk var?', tableStart: 0 }),
  gr({ id: 'g2-cikartma', g: [2], emoji: '⭐', ops: [{ o: '+', n: 8 }, { o: '−', n: 5 }], result: 15, story: 'Mert’in bir miktar çıkartması vardı. 8 çıkartma daha aldı, sonra 5 tanesini kardeşine verdi. Şimdi 15 çıkartması var.', question: 'Mert’in başta kaç çıkartması vardı?', tableStart: 5 }),
  gr({ id: 'g2-otobus', g: [2, 3], emoji: '🚌', ops: [{ o: '−', n: 6 }, { o: '+', n: 9 }], result: 20, story: 'Otobüste bir miktar yolcu vardı. Durakta 6 kişi indi, 9 kişi bindi. Şimdi otobüste 20 yolcu var.', question: 'Otobüste başta kaç yolcu vardı?', tableStart: 10 }),

  // ── 3. sınıf ──
  bc({ id: 'g3-bisiklet', g: [3, 4], emoji: '🚲', n: 8, total: 19, k1: { name: 'bisiklet', emoji: '🚲', v: 2 }, k2: { name: 'üç tekerlekli', emoji: '🛺', v: 3 }, what: 'tekerlek', story: 'Parkta bisikletler (2 tekerlekli) ve üç tekerlekli bisikletler var. Toplam 8 araç ve 19 tekerlek var.', question: 'Kaç üç tekerlekli, kaç bisiklet var?', tableStart: 0 }),
  ik({ id: 'g3-harclik', g: [3], emoji: '💰', mode: 'fark', a: 'Kardeş', b: 'Abla', unit: 'TL', total: 40, d: 8, story: 'İki kardeşin toplam 40 lirası var. Ablanın parası, kardeşinin parasından 8 lira fazla.', question: 'Kimin kaç lirası var?', tableStart: 10 }),
  ik({ id: 'g3-kalem', g: [3, 4], emoji: '✏️', mode: 'kat', a: 'Ali', b: 'Ece', unit: 'kalem', total: 24, d: 3, story: 'Ece’nin kalemleri Ali’nin kalemlerinin 3 katı. İkisinin toplam 24 kalemi var.', question: 'Kimin kaç kalemi var?' }),
  gr({ id: 'g3-sayi', g: [3, 4], emoji: '🔢', ops: [{ o: '×', n: 4 }, { o: '+', n: 6 }], result: 34, story: 'Zeynep aklından bir sayı tuttu. Sayıyı 4 ile çarpıp 6 ekledi ve 34 buldu.', question: 'Zeynep’in tuttuğu sayı kaç?' }),
  gr({ id: 'g3-yarim', g: [3], emoji: '🍪', ops: [{ o: '+', n: 15 }, { o: '÷', n: 2 }], result: 20, story: 'Kavanozdaki kurabiyelere 15 kurabiye eklendi. Sonra kurabiyeler iki tabağa eşit paylaştırıldı. Her tabakta 20 kurabiye oldu.', question: 'Kavanozda başta kaç kurabiye vardı?', tableStart: 20 }),

  // ── 4. sınıf ──
  bc({ id: 'g4-ciftlik', g: [4, 5], emoji: '🐑', n: 12, total: 34, k1: { name: 'tavuk', emoji: '🐔', v: 2 }, k2: { name: 'koyun', emoji: '🐑', v: 4 }, what: 'ayak', story: 'Bir çiftlikte tavuklar ve koyunlar var. Toplam 12 hayvan ve 34 ayak var.', question: 'Kaç koyun, kaç tavuk var?', tableStart: 0 }),
  bc({ id: 'g4-kumbara', g: [4, 5], emoji: '🪙', n: 9, total: 65, k1: { name: '5 TL', emoji: '🟤', v: 5 }, k2: { name: '10 TL', emoji: '🟡', v: 10 }, what: 'TL', story: 'Kumbarada yalnızca 5 TL ve 10 TL’lik paralar var. Toplam 9 para ve 65 TL var.', question: 'Kaç tane 10 TL, kaç tane 5 TL var?', tableStart: 0 }),
  ik({ id: 'g4-sube', g: [4], emoji: '🏫', mode: 'fark', a: 'B şubesi', b: 'A şubesi', unit: 'öğrenci', total: 56, d: 4, story: 'Bir okulun iki şubesinde toplam 56 öğrenci var. A şubesinde B şubesinden 4 öğrenci fazla.', question: 'Her şubede kaç öğrenci var?', tableStart: 20 }),
  ik({ id: 'g4-kitap', g: [4, 5], emoji: '📚', mode: 'kat', a: 'Hikâye', b: 'Roman', unit: 'kitap', total: 75, d: 4, story: 'Bir rafta romanların sayısı hikâye kitaplarının 4 katı. Rafta toplam 75 kitap var.', question: 'Kaç hikâye, kaç roman kitabı var?', tableStart: 10 }),
  gr({ id: 'g4-sayi', g: [4], emoji: '🔢', ops: [{ o: '×', n: 6 }, { o: '−', n: 15 }], result: 63, story: 'Kerem bir sayıyı 6 ile çarptı, sonuçtan 15 çıkardı ve 63 buldu.', question: 'Kerem’in sayısı kaç?', tableStart: 5 }),

  // ── 5. sınıf ──
  bc({ id: 'g5-otopark', g: [5, 6], emoji: '🚗', n: 20, total: 58, k1: { name: 'motosiklet', emoji: '🏍️', v: 2 }, k2: { name: 'otomobil', emoji: '🚗', v: 4 }, what: 'tekerlek', story: 'Bir otoparkta otomobiller ve motosikletler var. Toplam 20 araç ve 58 tekerlek var.', question: 'Kaç otomobil, kaç motosiklet var?', tableStart: 0 }),
  bc({ id: 'g5-sinema', g: [5, 6], emoji: '🎬', n: 12, total: 560, k1: { name: 'çocuk bileti', emoji: '🧒', v: 40 }, k2: { name: 'yetişkin bileti', emoji: '🧑', v: 60 }, what: 'TL', story: 'Sinemada çocuk bileti 40 TL, yetişkin bileti 60 TL. Bir grup 12 bilet aldı ve 560 TL ödedi.', question: 'Kaç yetişkin, kaç çocuk bileti alındı?', tableStart: 0 }),
  ik({ id: 'g5-iki-sayi', g: [5], emoji: '🔢', mode: 'fark', a: 'Küçük sayı', b: 'Büyük sayı', unit: '', total: 150, d: 24, story: 'İki sayının toplamı 150, farkı 24.', question: 'Bu sayılar kaç?', tableStart: 50, tableStep: 1 }),
  ik({ id: 'g5-sinif', g: [5], emoji: '👧', mode: 'kat', a: 'Erkek', b: 'Kız', unit: 'öğrenci', total: 36, d: 2, story: 'Bir sınıftaki kız öğrencilerin sayısı erkek öğrencilerin sayısının 2 katı. Sınıfta 36 öğrenci var.', question: 'Kaç kız, kaç erkek öğrenci var?', tableStart: 5 }),
  gr({ id: 'g5-sayi', g: [5], emoji: '🔢', ops: [{ o: '×', n: 3 }, { o: '+', n: 25 }], result: 160, story: 'Bir sayının 3 katının 25 fazlası 160 ediyor.', question: 'Bu sayı kaç?', tableStart: 30 }),

  // ── 6. sınıf ──
  bc({ id: 'g6-kafe', g: [6], emoji: '☕', n: 16, total: 360, k1: { name: 'çay', emoji: '🍵', v: 15 }, k2: { name: 'kahve', emoji: '☕', v: 35 }, what: 'TL', story: 'Bir kafede çay 15 TL, kahve 35 TL. Bir masa toplam 16 içecek için 360 TL ödedi.', question: 'Kaç kahve, kaç çay içildi?', tableStart: 0 }),
  ik({ id: 'g6-kumas', g: [6], emoji: '🧵', mode: 'fark', a: 'Kısa parça', b: 'Uzun parça', unit: 'm', total: 12.4, d: 2.4, dec: true, story: 'İki kumaş parçasının toplam uzunluğu 12,4 m. Uzun parça, kısa parçadan 2,4 m uzun.', question: 'Her parça kaç metre?', tableStart: 3, tableStep: 0.5 }),
  ik({ id: 'g6-surup', g: [6], emoji: '🥤', mode: 'kat', a: 'Şurup', b: 'Su', unit: 'L', total: 2.5, d: 4, dec: true, story: 'Bir içecekte suyun miktarı şurubun 4 katı. Toplam 2,5 L içecek hazırlandı.', question: 'Kaç litre şurup, kaç litre su kullanıldı?', tableStart: 0.1, tableStep: 0.1 }),
  gr({ id: 'g6-yarisi', g: [6], emoji: '🔢', ops: [{ o: '÷', n: 2 }, { o: '+', n: 7 }], result: 19, story: 'Bir sayının yarısına 7 eklenince 19 oluyor.', question: 'Bu sayı kaç?', tableStart: 16, tableStep: 2 }),
  gr({ id: 'g6-ondalik', g: [6], emoji: '🔢', ops: [{ o: '×', n: 2.5 }, { o: '−', n: 4 }], result: 21, dec: true, story: 'Bir sayının 2,5 katından 4 çıkarınca 21 elde ediliyor.', question: 'Bu sayı kaç?', tableStart: 4 }),

  // ── 7. sınıf ──
  bc({ id: 'g7-test', g: [7, 8], emoji: '📝', n: 20, total: 58, neg: true, k1: { name: 'yanlış', emoji: '❌', v: -2 }, k2: { name: 'doğru', emoji: '✅', v: 5 }, what: 'puan', story: '20 soruluk bir testte her doğru cevap +5, her yanlış cevap −2 puan. Ece bütün soruları cevapladı ve 58 puan aldı.', question: 'Ece kaç doğru, kaç yanlış yaptı?', tableStart: 8 }),
  ik({ id: 'g7-sicaklik', g: [7], emoji: '🌡️', mode: 'fark', a: 'Gece', b: 'Gündüz', unit: '°C', total: 7, d: 13, neg: true, story: 'Bir kentte gündüz sıcaklığı geceden 13 °C fazla. Gece ve gündüz sıcaklıklarının toplamı 7 °C.', question: 'Gece ve gündüz sıcaklıkları kaç °C?', tableStart: -6 }),
  ik({ id: 'g7-kat', g: [7], emoji: '🔢', mode: 'kat', a: 'Küçük sayı', b: 'Büyük sayı', unit: '', total: 84, d: 5, story: 'İki sayıdan büyüğü küçüğün 5 katı. Bu iki sayının toplamı 84.', question: 'Bu sayılar kaç?', tableStart: 10 }),
  gr({ id: 'g7-negatif', g: [7], emoji: '🔢', ops: [{ o: '−', n: 5 }, { o: '×', n: -3 }], result: 12, neg: true, story: 'Bir sayıdan 5 çıkarıp sonucu −3 ile çarpınca 12 elde ediliyor.', question: 'Bu sayı kaç?', tableStart: -3 }),
  bc({ id: 'g7-otopark', g: [7], emoji: '🚗', n: 30, total: 96, k1: { name: 'motosiklet', emoji: '🏍️', v: 2 }, k2: { name: 'otomobil', emoji: '🚗', v: 4 }, what: 'tekerlek', story: 'Bir otoparkta 30 araç var: otomobiller ve motosikletler. Toplam 96 tekerlek sayıldı.', question: 'Kaç otomobil, kaç motosiklet var?', tableStart: 10 }),
  gr({ id: 'g7-uc-kat', g: [7, 8], emoji: '🔢', ops: [{ o: '×', n: 3 }, { o: '−', n: 8 }], result: -2, neg: true, story: 'Bir tam sayının 3 katının 8 eksiği −2 ediyor.', question: 'Bu sayı kaç?', tableStart: -3 }),

  // ── 8. sınıf ──
  bc({ id: 'g8-tiyatro', g: [8], emoji: '🎭', n: 40, total: 3900, k1: { name: 'öğrenci bileti', emoji: '🎒', v: 75 }, k2: { name: 'tam bilet', emoji: '🎟️', v: 120 }, what: 'TL', story: 'Bir tiyatroda öğrenci bileti 75 TL, tam bilet 120 TL. Bir gösteri için 40 bilet satıldı ve 3 900 TL toplandı.', question: 'Kaç tam, kaç öğrenci bileti satıldı?', tableStart: 14 }),
  ik({ id: 'g8-ardisik', g: [8], emoji: '🔢', mode: 'fark', a: 'Küçük sayı', b: 'Büyük sayı', unit: '', total: 96, d: 2, story: 'Ardışık iki tek sayının toplamı 96.', question: 'Bu sayılar kaç?', tableStart: 41, tableStep: 2 }),
  ik({ id: 'g8-yatirim', g: [8], emoji: '💼', mode: 'kat', a: 'Ali', b: 'Ece', unit: 'TL', total: 7000, d: 2.5, dec: true, story: 'Ece’nin birikimi Ali’nin birikiminin 2,5 katı. İkisinin toplam birikimi 7 000 TL.', question: 'Kimin kaç lirası var?', tableStart: 1500, tableStep: 100 }),
  gr({ id: 'g8-kare', g: [8], emoji: '🟪', ops: [{ o: '²', n: 0 }, { o: '+', n: 7 }], result: 88, story: 'Pozitif bir sayının karesine 7 eklenince 88 elde ediliyor.', question: 'Bu sayı kaç?', tableStart: 5 }),
  gr({ id: 'g8-dort-kat', g: [8], emoji: '🔢', ops: [{ o: '×', n: 4 }, { o: '+', n: 9 }], result: -23, neg: true, story: 'Bir sayının 4 katının 9 fazlası −23.', question: 'Bu sayı kaç?', tableStart: -11 }),
]

/** Bu problem için uygun yollar (sınıfa göre) */
export function lanesFor(p: Problem, grade: Grade): LaneId[] {
  const eq = grade >= 6
  if (p.kind === 'ikili') return ['model', 'tablo', 'tahmin', ...(eq ? (['denklem'] as LaneId[]) : [])]
  if (p.kind === 'bacak') return ['model', 'tablo', 'tahmin', ...(grade >= 4 ? (['varsay'] as LaneId[]) : []), ...(eq ? (['denklem'] as LaneId[]) : [])]
  return ['geri', 'tablo', 'tahmin', ...(eq ? (['denklem'] as LaneId[]) : [])]
}

export function problemsFor(grade: Grade): Problem[] {
  return PROBLEMS.filter((p) => p.g.includes(grade))
}
