import { ek } from '../../lib/generators'
import { sup } from '../../lib/numberTheory'

/**
 * Üslü Sayılar Tablosu — veri ve matematik.
 * Değerler tam (kesirli) tutulur: aⁿ = n/d. Öğrencinin yazdığı kesir ya da ondalık sayıya çevrilip karşılaştırılır.
 */

export type Val = { n: number; d: number }

export function power(b: number, e: number): Val {
  if (e >= 0) return { n: b ** e, d: 1 }
  const p = b ** -e
  return { n: p < 0 ? -1 : 1, d: Math.abs(p) }
}
export const num = (v: Val) => v.n / v.d

/** "−1/8", "0,125", "16" → sayı (geçersizse NaN) */
export function parseVal(s: string): number {
  const t = s.replace(/−/g, '-').replace(',', '.')
  if (t === '' || t === '-') return NaN
  if (t.includes('/')) {
    const [a, b] = t.split('/')
    const x = Number(a), y = Number(b)
    return b === '' || !y ? NaN : x / y
  }
  return Number(t)
}
export const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b))

const minus = (s: string) => s.replace(/-/g, '−')
export const fmtInt = (n: number) => minus(n.toLocaleString('tr-TR'))
/** Ondalık gösterim (yalnız 10’un kuvvetleri gibi sonlu olanlar için) */
export const fmtDec = (x: number) => minus(x.toLocaleString('tr-TR', { maximumFractionDigits: 8 }))

/** MathText metni: 8, −[[1/8]], 0,001 */
export function fmtVal(v: Val, decimal = false) {
  if (v.d === 1) return fmtInt(v.n)
  if (decimal) return fmtDec(num(v))
  return `${v.n < 0 ? '−' : ''}[[${Math.abs(v.n)}/${fmtInt(v.d)}]]`
}

/** Öğrencinin yazdığı metni MathText’e çevir: 1/8 → [[1/8]] */
export function inputMath(s: string) {
  const m = /^(−?)(\d+)\/(\d+)$/.exec(s)
  return m ? `${m[1]}[[${m[2]}/${m[3]}]]` : s
}

export const baseStr = (b: number) => (b < 0 ? `(−${-b})` : String(b))
export const expr = (b: number, e: number) => `${baseStr(b)}${sup(e)}`
/** Yönelme eki: 2’ye, 10’a, −2’ye */
export const dat = (b: number) => (b < 0 ? '−' : '') + ek(Math.abs(b), 'dat')
/** Tamlayan eki: 2’nin, 3’ün, −2’nin */
export const gen = (b: number) => (b < 0 ? '−' : '') + ek(Math.abs(b), 'gen')

export const key = (b: number, e: number) => `${b}:${e}`

/* ───────────── görevler ───────────── */

export interface RowSpec {
  base: number
  exps: number[]
  given: number[]
  /** Değerleri ondalık göster (10’un kuvvetleri) */
  decimal?: boolean
}

export interface Question {
  q: string
  options: { id: string; label: string }[]
  answer: string
  nudge: Record<string, string>
  misconception?: Record<string, string>
}

/** Tek sayılık (üs) cevap isteyen madde */
export interface ExpItem {
  /** MathText: "2^{2} · 2^{3}" */
  expr: string
  /** Açılım: "4 · 8 = 32" */
  expand: string
  /** Sonuç “taban^□” biçiminde yazılır */
  lhs: string
  answer: number
  hint: string
}

export interface Predict {
  q: string
  /** Tahmin edilen hücre */
  cell: string
  options: { id: string; label: string }[]
  answer: string
  /** Yanılgı içeren tahminler: hücre doğrulanınca rapora yazılır */
  misconception: Record<string, string>
}

export type Task =
  | { kind: 'table'; title: string; emoji: string; intro: string; rows: RowSpec[]; arrows: 'start' | 'first'; predict?: Predict; sci?: ExpItem[]; asks: Question[]; rules: string[]; strategy?: { q: string; options: string[] } }
  | { kind: 'exp'; title: string; emoji: string; intro: string; ref: RowSpec; groups: { items: ExpItem[]; ask: Question }[]; rules: string[] }

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export const tasks: Task[] = [
  {
    kind: 'table',
    title: '2’nin kuvvetleri: sağa doğru',
    emoji: '➡️',
    intro: 'Tablonun ilk üç kutusu dolu. Boş kutulara ne yazılmalı? Bir kutuya dokun ve değerini yaz.',
    rows: [{ base: 2, exps: range(1, 6), given: [1, 2, 3] }],
    arrows: 'first',
    asks: [
      {
        q: 'Tabloda sağa bir adım gidince sayıya ne oluyor?',
        options: [
          { id: 'carp', label: '2 ile çarpılıyor' },
          { id: 'ekle', label: '2 ekleniyor' },
          { id: 'us', label: 'Üs kadar artıyor' },
        ],
        answer: 'carp',
        nudge: {
          ekle: '2’den 4’e geçerken 2 eklendi; peki 8’den 16’ya kaç eklendi? Her adımda aynı sayı mı ekleniyor, yoksa aynı sayıyla mı çarpılıyor?',
          us: '4’ten 8’e geçerken üs 2’den 3’e çıktı ama sayı 1 artmadı. 4 ile 8 arasındaki ilişki ne?',
        },
        misconception: { ekle: 'Kuvvetlerde artışı toplama sanmak' },
      },
    ],
    rules: ['aⁿ, n tane a’nın çarpımıdır: 2⁵ = 2 · 2 · 2 · 2 · 2 = 32', 'Tabloda sağa bir adım: taban ile çarp'],
  },
  {
    kind: 'table',
    title: 'Sola doğru: 2⁰ ve negatif üsler',
    emoji: '⬅️',
    intro: 'Şimdi tabloyu sola doğru sürdür. Örüntü bozulmasın: sağa giderken 2 ile çarpıyorsak sola giderken ne yapmalıyız?',
    rows: [{ base: 2, exps: range(-3, 4), given: [1, 2, 3, 4] }],
    arrows: 'start',
    predict: {
      q: 'Doldurmadan önce tahmin et: 2⁰ kutusuna ne yazılmalı?',
      cell: key(2, 0),
      options: [
        { id: '0', label: '0' },
        { id: '1', label: '1' },
        { id: '2', label: '2' },
        { id: 'yok', label: 'Hesaplanamaz' },
      ],
      answer: '1',
      misconception: { '0': 'a⁰ = 0 sanmak', '2': 'a⁰ = a sanmak', yok: 'a⁰ değerinin tanımsız olduğunu sanmak' },
    },
    asks: [
      {
        q: '2⁻³ ile 2³ arasında nasıl bir ilişki var?',
        options: [
          { id: 'ters', label: '[[1/8]] ve 8: biri diğerinin çarpmaya göre tersi' },
          { id: 'zit', label: '−8 ve 8: zıt işaretliler' },
          { id: 'esit', label: 'İkisi eşit' },
        ],
        answer: 'ters',
        nudge: {
          zit: 'Tablodaki 2⁻³ kutusuna bak: orada negatif bir sayı mı var? 2⁻³ ile 2³’ü çarpınca kaç eder?',
          esit: 'Tablodaki iki kutuya tekrar bak: 2⁻³ birden küçük, 2³ birden büyük. Çarpımları kaç?',
        },
        misconception: { zit: 'Negatif üssü negatif sayı sanmak' },
      },
    ],
    rules: ['a⁰ = 1 (a ≠ 0): a¹’i a’ya bölünce 1 kalır', 'a^{−n} = [[1/a^{n}]]: negatif üs, sayının çarpmaya göre tersini verir'],
    strategy: { q: '2⁰ ve negatif kuvvetleri nasıl buldun?', options: ['Sağdaki komşuyu 2’ye böldüm', 'Örüntüyü sürdürdüm', 'Kuralı hatırladım', 'Önce tahmin edip sınadım'] },
  },
  {
    kind: 'table',
    title: 'Başka tabanlar: 3 ve 5',
    emoji: '🔁',
    intro: 'Aynı örüntü 3 ve 5 tabanında da işliyor mu? Boş kutuları doldur.',
    rows: [
      { base: 3, exps: range(-2, 3), given: [1, 2, 3] },
      { base: 5, exps: range(-2, 3), given: [1, 2] },
    ],
    arrows: 'start',
    asks: [
      {
        q: 'Taban hangi sayı olursa olsun (0 hariç) a⁰ kaçtır?',
        options: [
          { id: '1', label: 'Her zaman 1' },
          { id: 'a', label: 'Tabanın kendisi (a)' },
          { id: '0', label: 'Her zaman 0' },
        ],
        answer: '1',
        nudge: {
          a: 'Tabloda 3⁰ ve 5⁰ kutularına bak. 3¹ = 3’ü 3’e bölünce ne kaldı?',
          '0': 'Tabloda 3⁰ ve 5⁰ kutularına bak. Bir sayıyı kendisine bölünce kaç kalır?',
        },
        misconception: { '0': 'a⁰ = 0 sanmak', a: 'a⁰ = a sanmak' },
      },
    ],
    rules: ['Her tabanda (a ≠ 0) aynı örüntü: a⁰ = 1, a⁻¹ = [[1/a]], a⁻² = [[1/a^{2}]]'],
  },
  {
    kind: 'table',
    title: '10’un kuvvetleri ve ondalıklar',
    emoji: '🔟',
    intro: '10’un kuvvetlerini doldur. Negatif üslerde kesir de yazabilirsin, ondalık da (0,1 gibi).',
    rows: [{ base: 10, exps: range(-3, 4), given: [1, 2, 3], decimal: true }],
    arrows: 'start',
    sci: [
      { expr: '3 400 000', expand: '3,4 · 1 000 000', lhs: '3,4 · 10', answer: 6, hint: '1 000 000 tablonun hangi kutusunda? Kaç tane 10’un çarpımı?' },
      { expr: '0,07', expand: '7 · 0,01', lhs: '7 · 10', answer: -2, hint: '0,01 tablonun hangi kutusunda? Üssüne bak.' },
      { expr: '0,0005', expand: '5 · 0,0001', lhs: '5 · 10', answer: -4, hint: '0,001 = 10⁻³. Bir sola daha gidince (÷ 10) hangi kuvvet olur?' },
    ],
    asks: [
      {
        q: '10⁻ⁿ sayısının ondalık gösteriminde ne görüyorsun?',
        options: [
          { id: 'basamak', label: 'Virgülden sonra n basamak var' },
          { id: 'sifir', label: 'Virgülden sonra n tane sıfır var' },
          { id: 'negatif', label: 'Sayı negatif oluyor' },
        ],
        answer: 'basamak',
        nudge: {
          sifir: '10⁻³ = 0,001 kutusuna bak: virgülden sonra kaç sıfır, kaç basamak var?',
          negatif: '0,001 negatif bir sayı mı? Negatif üs sayıyı küçültür ama negatif yapmaz.',
        },
        misconception: { negatif: 'Negatif üssü negatif sayı sanmak' },
      },
    ],
    rules: ['10ⁿ: 1’in yanına n sıfır; 10⁻ⁿ: virgülden sonra n basamak (0,001 = 10⁻³)', 'Bilimsel gösterim: a · 10ⁿ (1 ≤ a < 10), ör. 3 400 000 = 3,4 · 10⁶'],
  },
  {
    kind: 'table',
    title: 'Negatif taban: (−2)’nin kuvvetleri',
    emoji: '➖',
    intro: 'Bu kez taban −2. Sağa her adımda −2 ile çarpıyoruz. İşaretlere dikkat!',
    rows: [{ base: -2, exps: range(0, 6), given: [1] }],
    arrows: 'start',
    asks: [
      {
        q: 'Tablodaki örüntüye göre (−2)¹⁰ pozitif mi, negatif mi?',
        options: [
          { id: 'poz', label: 'Pozitif' },
          { id: 'neg', label: 'Negatif' },
        ],
        answer: 'poz',
        nudge: { neg: 'Tabloda çift üslü kutulara bak: (−2)², (−2)⁴, (−2)⁶. İşaretleri ne? 10 tek mi, çift mi?' },
        misconception: { neg: 'Negatif tabanın çift kuvvetini negatif sanmak' },
      },
      {
        q: 'Hangisi −4’e eşittir?',
        options: [
          { id: 'parantez', label: '(−2)²' },
          { id: 'parantezsiz', label: '−2²' },
        ],
        answer: 'parantezsiz',
        nudge: { parantez: '(−2)² tabloda var: (−2) · (−2) = 4. −2² yazımında üs yalnızca 2’ye mi ait, yoksa −2’ye mi?' },
        misconception: { parantez: '(−2)² ile −2²’yi aynı sanmak' },
      },
    ],
    rules: ['Negatif tabanın çift kuvveti pozitif, tek kuvveti negatiftir', '(−2)² = (−2) · (−2) = 4 ama −2² = −(2 · 2) = −4'],
  },
  {
    kind: 'exp',
    title: 'Aynı tabanlı kuvvetleri çarp',
    emoji: '🧮',
    intro: '2’nin kuvvetleri tablosu yukarıda. Çarpımı tablodaki sayılardan bul ve sonucu 2’nin kuvveti olarak yaz.',
    ref: { base: 2, exps: range(-1, 6), given: range(-1, 6) },
    groups: [
      {
        items: [
          { expr: '2^{2} · 2^{3}', expand: '4 · 8 = 32', lhs: '2', answer: 5, hint: '32 tabloda hangi kutuda?' },
          { expr: '2^{1} · 2^{4}', expand: '2 · 16 = 32', lhs: '2', answer: 5, hint: '32 tabloda hangi kutuda?' },
          { expr: '2^{3} · 2^{3}', expand: '8 · 8 = 64', lhs: '2', answer: 6, hint: '64 tabloda hangi kutuda?' },
          { expr: '2^{−1} · 2^{3}', expand: '[[1/2]] · 8 = 4', lhs: '2', answer: 2, hint: '4 tabloda hangi kutuda?' },
        ],
        ask: {
          q: 'Bulduklarına bak: 2ᵐ · 2ⁿ = 2^{?}',
          options: [
            { id: 'top', label: 'm + n' },
            { id: 'carp', label: 'm · n' },
            { id: 'cik', label: 'm − n' },
          ],
          answer: 'top',
          nudge: {
            carp: '2² · 2³ sonucu 2⁵ çıktı. 2 · 3 = 6 mı, 2 + 3 = 5 mi?',
            cik: '2² · 2³ sonucu 2⁵ çıktı. Çarpınca sayı büyüdü; üs azalmış olabilir mi?',
          },
          misconception: { carp: 'Çarpımda üsleri çarpmak' },
        },
      },
    ],
    rules: ['Aynı tabanlı kuvvetler çarpılırken üsler toplanır: aᵐ · aⁿ = a^{m + n}'],
  },
  {
    kind: 'exp',
    title: 'Böl ve kuvvetin kuvvetini al',
    emoji: '🪜',
    intro: 'Şimdi bölmeyi ve kuvvetin kuvvetini dene. Sonucu yine 2’nin kuvveti olarak yaz.',
    ref: { base: 2, exps: range(-1, 6), given: range(-1, 6) },
    groups: [
      {
        items: [
          { expr: '2^{5} ÷ 2^{2}', expand: '32 ÷ 4 = 8', lhs: '2', answer: 3, hint: '8 tabloda hangi kutuda?' },
          { expr: '2^{6} ÷ 2^{4}', expand: '64 ÷ 16 = 4', lhs: '2', answer: 2, hint: '4 tabloda hangi kutuda?' },
          { expr: '2^{2} ÷ 2^{3}', expand: '4 ÷ 8 = [[1/2]]', lhs: '2', answer: -1, hint: '[[1/2]] tabloda hangi kutuda?' },
        ],
        ask: {
          q: 'Bulduklarına bak: 2ᵐ ÷ 2ⁿ = 2^{?}',
          options: [
            { id: 'cik', label: 'm − n' },
            { id: 'bol', label: 'm ÷ n' },
            { id: 'top', label: 'm + n' },
          ],
          answer: 'cik',
          nudge: {
            bol: '2⁶ ÷ 2⁴ sonucu 2² çıktı. 6 ÷ 4 = 2 mi?',
            top: 'Bölünce sayı küçüldü; üs büyümüş olabilir mi? 2⁵ ÷ 2² sonucu kaçıncı kuvvetti?',
          },
          misconception: { bol: 'Bölmede üsleri bölmek' },
        },
      },
      {
        items: [
          { expr: '(2^{2})^{3}', expand: '2² · 2² · 2² = 4 · 4 · 4 = 64', lhs: '2', answer: 6, hint: '64 tabloda hangi kutuda?' },
          { expr: '(2^{3})^{2}', expand: '2³ · 2³ = 8 · 8 = 64', lhs: '2', answer: 6, hint: '64 tabloda hangi kutuda?' },
        ],
        ask: {
          q: '(2ᵐ)ⁿ = 2^{?}',
          options: [
            { id: 'carp', label: 'm · n' },
            { id: 'top', label: 'm + n' },
            { id: 'us', label: 'mⁿ' },
          ],
          answer: 'carp',
          nudge: {
            top: '(2²)³ = 2⁶ çıktı. 2 + 3 = 5 mi? (2²)³’te 2² kaç kez çarpılıyor?',
            us: '(2²)³ = 2⁶ çıktı. 2³ = 8 mi, 6 mı?',
          },
          misconception: { top: 'Kuvvetin kuvvetinde üsleri toplamak' },
        },
      },
    ],
    rules: ['Aynı tabanlı kuvvetler bölünürken üsler çıkarılır: aᵐ ÷ aⁿ = a^{m − n}', 'Kuvvetin kuvvetinde üsler çarpılır: (aᵐ)ⁿ = a^{m · n}'],
  },
]

/* ───────────── yanlış cevap tanılama ───────────── */

export interface Diag {
  text: string
  misconception?: string
}

/** Bir hücreye yazılan yanlış değer için düşündüren soru */
export function diagnose(b: number, e: number, v: number, known: (e: number) => Val | null): Diag {
  const target = num(power(b, e))
  const ab = Math.abs(b)
  if (e === 0 && same(v, 0)) return { text: `${expr(b, 1)} = ${fmtInt(b)}. Tabloda bir sola gidince ${dat(b)} bölüyoruz: ${fmtInt(b)} ÷ ${fmtInt(b)} kaç eder?`, misconception: 'a⁰ = 0 sanmak' }
  if (e === 0 && same(v, b)) return { text: `${fmtInt(b)} değeri zaten ${expr(b, 1)} kutusunda. Bir sola gidince ${dat(b)} bölmeliyiz: ${fmtInt(b)} ÷ ${fmtInt(b)} = ?`, misconception: 'a⁰ = a sanmak' }
  if (e < 0 && b > 0 && same(v, -(ab ** -e))) return { text: `Negatif üs sayıyı negatif yapmaz! Sağdaki komşusunu ${dat(b)} böl: sonuç 1’den küçük ama pozitif bir sayı.`, misconception: 'Negatif üssü negatif sayı sanmak' }
  if (e > 1 && same(v, b * e)) return { text: `${expr(b, e)}, ${fmtInt(b)} · ${e} değil; ${e} tane ${gen(b)} çarpımı. Soldaki komşusunu ${fmtInt(b)} ile çarp.`, misconception: 'Üssü tabanla çarpmak (2⁴ = 8)' }
  if (b < 0 && same(v, -target)) return { text: `Sayı doğru, işaret değil. Soldaki komşusunu ${fmtInt(b)} ile çarpınca işaret ne olur? (Negatif · negatif = ?)`, misconception: 'Negatif tabanda işareti karıştırmak' }
  const right = known(e + 1)
  if (right) return { text: `Sağdaki komşusu ${expr(b, e + 1)} = ${fmtVal(right, b === 10)}. Onu ${dat(b)} bölünce ne çıkar?` }
  const left = known(e - 1)
  if (left) return { text: `Soldaki komşusu ${expr(b, e - 1)} = ${fmtVal(left, b === 10)}. Onu ${fmtInt(b)} ile çarpınca ne çıkar?` }
  return { text: 'Önce dolu bir kutunun hemen yanındaki kutuyu doldur; örüntü komşudan komşuya ilerler.' }
}
