import type { Grade, Visual } from '../../data/types'
import { ek } from '../../lib/generators'
import { shuffle } from '../hizli-noktalar/kit'

/**
 * Soruyu Sen Yaz — görev bankası.
 * Her görev bir model (resim, şerit, dizi, tablo, grafik, terazi…) ve dört cümle yuvası sunar:
 *   Kim? · Ne? · Ne oldu? (olay: işlem yapısını taşır) · Soru
 * Olaylar (Ev) ve sorular (Qn) metin üreten fonksiyonlardır; ekler kişi/nesne kartlarında hazır yazılıdır.
 * Denetim:
 *   1) nums: olaydaki sayılar modeldekilerle aynı yerde mi?
 *   2) rel:  olay (ve soru) modeldeki ilişkiyi mi anlatıyor?
 *   3) ok:   soru, modeldeki “?” işaretini mi soruyor (çözülebilir mi)?
 * Aynı modele uyan farklı yapılar (ekleme, karşılaştırma, parça-bütün…) ayrı çözüm sayılır.
 */

export interface Who { id: string; n: string; gen: string; abl: string; dat: string }
export interface Obj {
  id: string
  label: string
  emoji: string
  sg: string
  pl: string
  /** iyelik: elması */
  poss: string
  /** belirtme: elmayı */
  acc: string
  /** çoğul belirtme: elmaları */
  placc: string
  /** çoğul ilgi: elmaların */
  plg: string
  /** çoğul iyelik + ilgi: elmalarının */
  plpg: string
  adj: [string, string]
  x: Record<string, string>
}
export interface Ctx { a: Who; b: Who; o: Obj }
export type Txt = (c: Ctx) => string
export type M = string | Txt
export interface Fail { m: M; mis?: string }
export interface QBad extends Fail { k: 'rel' | 'known' | 'none' }
export interface Ev { id: string; s: string; t: Txt; nums?: Fail; rel?: Fail; ok?: Record<string, number>; bad?: Record<string, QBad> }
export interface Qn { id: string; t: Txt; short: string; u?: Txt; only?: string[] }

export type Model =
  | { k: 'join'; a: number; b: number }
  | { k: 'take'; a: number; b: number }
  | { k: 'groups'; n: number; each: number }
  | { k: 'vis'; v: Visual }
  | { k: 'frac'; den: number; num: number; whole: string; part: string }
  | { k: 'rect'; w: number; h: number; grid?: boolean; edge?: boolean; inside: string; wl: string; hl: string }
  | { k: 'tri'; a: string; b: string; c: string }
  | { k: 'line'; y0: number; x0: number; xl: string; yl: string }
  | { k: 'dline'; top: string[]; bot: string[] }
  | { k: 'square'; side: string; inside: string }

export interface Task {
  title: string
  eq: string
  model: (o: Obj | null) => Model
  who: Who[]
  what: Obj[]
  whatLabel?: string
  events: Ev[]
  qs: Qn[]
  pad?: { decimal?: boolean; negative?: boolean }
  hints?: string[]
  solveHint?: string
}

// ───────────────────────── kişiler ve nesneler ─────────────────────────

const w = (n: string, gen: string, abl: string, dat: string): Who => ({ id: n, n, gen, abl, dat })
const NAMES: Who[] = [
  w('Ela', 'Ela’nın', 'Ela’dan', 'Ela’ya'),
  w('Can', 'Can’ın', 'Can’dan', 'Can’a'),
  w('Defne', 'Defne’nin', 'Defne’den', 'Defne’ye'),
  w('Mert', 'Mert’in', 'Mert’ten', 'Mert’e'),
  w('Zeynep', 'Zeynep’in', 'Zeynep’ten', 'Zeynep’e'),
  w('Ömer', 'Ömer’in', 'Ömer’den', 'Ömer’e'),
  w('Elif', 'Elif’in', 'Elif’ten', 'Elif’e'),
  w('Arda', 'Arda’nın', 'Arda’dan', 'Arda’ya'),
]
const people = () => shuffle(NAMES).slice(0, 3)

const backVowel = (s: string) => {
  const v = [...s].reverse().find((ch) => 'aeıioöuü'.includes(ch)) ?? 'e'
  return 'aıou'.includes(v)
}
function obj(id: string, emoji: string, sg: string, poss: string, acc: string, adj: [string, string] = ['büyük', 'küçük'], x: Record<string, string> = {}, label = sg): Obj {
  const back = backVowel(sg)
  const pl = sg + (back ? 'lar' : 'ler')
  return { id, label, emoji, sg, pl, poss, acc, placc: pl + (back ? 'ı' : 'i'), plg: pl + (back ? 'ın' : 'in'), plpg: pl + (back ? 'ının' : 'inin'), adj, x }
}
const COUNT: Obj[] = [
  obj('elma', '🍎', 'elma', 'elması', 'elmayı', ['kırmızı', 'yeşil']),
  obj('bilye', '🔵', 'bilye', 'bilyesi', 'bilyeyi', ['mavi', 'sarı']),
  obj('kalem', '✏️', 'kalem', 'kalemi', 'kalemi', ['kırmızı', 'mavi']),
  obj('cikartma', '⭐', 'çıkartma', 'çıkartması', 'çıkartmayı', ['yıldızlı', 'kalpli']),
  obj('ceviz', '🌰', 'ceviz', 'cevizi', 'cevizi', ['büyük', 'küçük']),
  obj('kurabiye', '🍪', 'kurabiye', 'kurabiyesi', 'kurabiyeyi', ['çikolatalı', 'sade']),
  obj('balon', '🎈', 'balon', 'balonu', 'balonu', ['kırmızı', 'mavi']),
  obj('cilek', '🍓', 'çilek', 'çileği', 'çileği', ['büyük', 'küçük']),
  obj('kart', '🃏', 'kart', 'kartı', 'kartı', ['kırmızı', 'mavi']),
  obj('yumurta', '🥚', 'yumurta', 'yumurtası', 'yumurtayı', ['beyaz', 'kahverengi']),
]
const things = (n = 3) => shuffle(COUNT).slice(0, n)

const PLACES: Obj[] = [
  obj('bahce', '🌳', 'bahçe', 'bahçesi', 'bahçeyi', ['büyük', 'küçük'], { u: 'm', fence: 'çit', verb: 'çekecek', past: 'çekti', cover: 'çim' }),
  obj('oda', '🛋️', 'oda', 'odası', 'odayı', ['büyük', 'küçük'], { u: 'm', fence: 'süpürgelik', verb: 'döşeyecek', past: 'döşedi', cover: 'halı' }),
  obj('pano', '📌', 'pano', 'panosu', 'panoyu', ['büyük', 'küçük'], { u: 'dm', fence: 'şerit', verb: 'yapıştıracak', past: 'yapıştırdı', cover: 'renkli kâğıt' }),
]

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)
/** Kesir sözcüğünün iyelik eki (pay okunuşuna göre): 3/4 → “’ü”, 2/5 → “’si” */
const FRAC_POSS: Record<number, [string, string]> = { 1: ['i', 'ini'], 2: ['si', 'sini'], 3: ['ü', 'ünü'], 4: ['ü', 'ünü'], 5: ['i', 'ini'], 6: ['sı', 'sını'], 7: ['si', 'sini'], 8: ['i', 'ini'], 9: ['u', 'unu'] }
const fr = (n: number, d: number, acc = false) => `[[${n}/${d}]]’${FRAC_POSS[n][acc ? 1 : 0]}`
const dec = (n: number) => String(n).replace('.', ',')

// ───────────────────────── geri bildirim kalıpları ─────────────────────────

export const KNOWN = 'Bu sayıyı hikâyende zaten söyledin. İyi bir soru, modelde “?” ile gösterilen bilinmeyeni sorar.'
export const NONE = 'Bu soruyu hikâyedeki bilgilerle cevaplayabilir misin? Soru, hikâyede anlatılan olayla ilgili ve hesaplanabilir olmalı.'
const MIS_NONE = 'Hikâyedeki bilgilerle cevaplanamayan bir soru seçti'
const rel = (m: M, mis?: string): QBad => ({ k: 'rel', m, mis })
const known = (m: M = KNOWN): QBad => ({ k: 'known', m })
const none = (m: M = NONE, mis = MIS_NONE): QBad => ({ k: 'none', m, mis })
const irr = (t: Txt, short: string): Qn => ({ id: 'irr', t, short })
const age: Qn = irr((c) => `${c.a.n} kaç yaşında?`, 'Yaşı kaç?')
const MIS_KEY = 'Soru ile olayın yapısını uyumsuz kurdu (artan bir duruma “kaç kaldı?” gibi)'
const per = (o: Obj, map: Record<string, string>) => map[o.id] ?? Object.values(map)[0]

const HINTS = [
  'Modeldeki sayılara bak: hangileri biliniyor, hangisi “?” ile gösterilmiş?',
  'Modelde ne oluyor: parçalar birleşiyor mu, bir bütünden ayrılıyor mu, iki miktar karşılaştırılıyor mu?',
  'Sorun, modeldeki “?” işaretini mi soruyor? Cevabını hikâyede zaten söylediysen başka bir soru seç.',
]

const tape = (parts: (string | number)[], total?: string, values?: number[]): Model => ({ k: 'vis', v: { kind: 'tape', parts: parts.map((p, i) => ({ label: String(p), value: values?.[i] ?? (typeof p === 'number' ? p : 1) })), total } })

// ───────────────────────── toplama-çıkarma yapıları ─────────────────────────

function joinResult(a: number, b: number, pic: boolean): Task {
  const s = a + b
  return {
    title: pic ? 'Resim modeli' : 'Şerit modeli',
    eq: `${a} + ${b} = ?`,
    model: () => (pic ? { k: 'join', a, b } : tape([a, b], '?')),
    who: people(),
    what: things(),
    events: [
      { id: 'join', s: 'Ekleme', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${b} ${c.o.sg} daha aldı.`, ok: { total: s }, bad: { left: rel((c) => `Hikâyende ${c.o.sg} sayısı arttı mı, azaldı mı? “Kaç kaldı?” sorusu hangi olaya uyar?`, MIS_KEY), got: known() } },
      { id: 'pw', s: 'Parça-bütün', t: (c) => `${c.a.gen} ${a} ${c.o.adj[0]}, ${b} ${c.o.adj[1]} ${c.o.poss} var.`, ok: { total: s }, bad: { left: rel('Hikâyende bir şey verildi ya da yendi mi? Modelde iki parça birleşiyor.', MIS_KEY) } },
      { id: 'cmp', s: 'Karşılaştırma', t: (c) => `${c.a.gen} ${a} ${c.o.poss} var. ${c.b.gen} ${c.a.abl} ${b} fazla ${c.o.poss} var.`, ok: { bHas: s }, bad: { total: rel((c) => `“Toplam” sorusu ${c.a.n} ile ${c.b.n}’nin hepsini birlikte sorar. Modelde “?” hangi miktarı gösteriyor?`, 'Karşılaştırma durumunda bütünü (iki kişinin toplamını) sordu') } },
      { id: 'sep', s: 'Ayırma', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${b} tanesini ${c.b.dat} verdi.`, rel: { m: 'Modelde iki parça birleşip bir bütün oluyor (+). Bu hikâyede sayı artıyor mu, azalıyor mu?', mis: 'Modeldeki birleştirme (toplama) ilişkisini ayırma olayıyla anlattı' } },
      { id: 'num', s: 'Ekleme', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${b + 3} ${c.o.sg} daha aldı.`, nums: { m: `Hikâyedeki ${b + 3} sayısı modelde var mı? Modeldeki iki parça hangi sayılar?`, mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?', u: (c) => c.o.sg },
      { id: 'bHas', t: (c) => `${c.b.gen} kaç ${c.o.poss} var?`, short: 'Öbürünün kaçı var?', u: (c) => c.o.sg },
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?' },
      { id: 'got', t: (c) => `Kaç ${c.o.sg} daha aldı?`, short: 'Kaç aldı?' },
      age,
    ],
  }
}

function separateResult(a: number, b: number, pic: boolean): Task {
  const d = a - b
  return {
    title: pic ? 'Resim modeli' : 'Şerit modeli',
    eq: `${a} − ${b} = ?`,
    model: () => (pic ? { k: 'take', a, b } : tape([b, '?'], String(a), [b, d])),
    who: people(),
    what: things(),
    events: [
      { id: 'sep', s: 'Ayırma', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${b} tanesini ${c.b.dat} verdi.`, ok: { left: d }, bad: { total: known() } },
      { id: 'cmp', s: 'Karşılaştırma', t: (c) => `${c.a.gen} ${a}, ${c.b.gen} ${b} ${c.o.poss} var.`, ok: { more: d, less: d }, bad: { total: rel('“Toplam” iki miktarı birleştirir. Model iki miktarın toplamını mı, farkını mı gösteriyor?', 'Karşılaştırma durumunu toplama ile karıştırdı'), left: none((c) => `Hikâyede kimse ${c.o.sg} vermedi ya da yemedi. İki kişiyi karşılaştıran bir soru seçebilir misin?`) } },
      { id: 'pw', s: 'Parça-bütün', t: (c) => `${c.a.gen} ${a} ${c.o.poss} var. Bunların ${b} tanesi ${c.o.adj[0]}, gerisi ${c.o.adj[1]}.`, ok: { adj1: d }, bad: { total: known() } },
      { id: 'join', s: 'Ekleme', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${b} ${c.o.sg} daha aldı.`, rel: { m: 'Modelde bir bütünden bir parça ayrılıyor (−). Bu hikâyede sayı azalıyor mu, artıyor mu?', mis: 'Modeldeki ayırma (çıkarma) ilişkisini ekleme olayıyla anlattı' } },
      { id: 'num', s: 'Ayırma', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${b + 2} tanesini ${c.b.dat} verdi.`, nums: { m: `Modelde ayrılan parça kaç? Hikâyedeki ${b + 2} modelde var mı?`, mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?', u: (c) => c.o.sg },
      { id: 'more', t: (c) => `${c.a.gen} ${c.b.abl} kaç fazla ${c.o.poss} var?`, short: 'Kaç fazla?', u: (c) => c.o.sg },
      { id: 'less', t: (c) => `${c.b.gen} ${c.a.abl} kaç eksik ${c.o.poss} var?`, short: 'Kaç eksik?', u: (c) => c.o.sg },
      { id: 'adj1', t: (c) => `Kaç tanesi ${c.o.adj[1]}?`, short: 'Kaç tanesi diğer renk/tür?', u: (c) => c.o.sg },
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?' },
      age,
    ],
  }
}

function changeUnknown(a: number, c0: number): Task {
  const d = c0 - a
  return {
    title: 'Şerit modeli',
    eq: `${a} + ? = ${c0}`,
    model: () => tape([a, '?'], String(c0), [a, d]),
    who: people(),
    what: things(),
    events: [
      { id: 'join', s: 'Ekleme', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. Biraz daha ${c.o.sg} aldı ve ${c.o.plg} sayısı ${c0} oldu.`, ok: { got: d }, bad: { total: known(), left: rel('Hikâyende sayı arttı mı, azaldı mı? “Kaç kaldı?” azalan durumlar için sorulur.', MIS_KEY) } },
      { id: 'cmp', s: 'Karşılaştırma', t: (c) => `${c.a.gen} ${a}, ${c.b.gen} ${c0} ${c.o.poss} var.`, ok: { bMore: d }, bad: { total: rel('“Toplam” iki miktarı birleştirir. Modelde “?” iki miktar arasındaki farkı mı gösteriyor, toplamı mı?', 'Karşılaştırma durumunu toplama ile karıştırdı') } },
      { id: 'pw', s: 'Parça-bütün', t: (c) => `${c.a.gen} ${c0} ${c.o.poss} var. Bunların ${a} tanesi ${c.o.adj[0]}, gerisi ${c.o.adj[1]}.`, ok: { adj1: d }, bad: { total: known() } },
      { id: 'sep', s: 'Ayırma', t: (c) => `${c.a.gen} ${c0} ${c.o.poss} vardı. ${a} tanesini ${c.b.dat} verdi.`, ok: { left: d }, bad: { total: known() } },
      { id: 'num', s: 'Ekleme', t: (c) => `${c.a.gen} ${a} ${c.o.poss} vardı. ${c0} ${c.o.sg} daha aldı.`, nums: { m: `Modelde ${c0} bütünün (hepsinin) sayısı. Hikâyende ${c0} eklenen parça mı oldu?`, mis: 'Bütünü parça olarak kullandı' } },
    ],
    qs: [
      { id: 'got', t: (c) => `Kaç ${c.o.sg} aldı?`, short: 'Kaç aldı?', u: (c) => c.o.sg },
      { id: 'bMore', t: (c) => `${c.b.gen} ${c.a.abl} kaç fazla ${c.o.poss} var?`, short: 'Kaç fazla?', u: (c) => c.o.sg },
      { id: 'adj1', t: (c) => `Kaç tanesi ${c.o.adj[1]}?`, short: 'Kaç tanesi diğer tür?', u: (c) => c.o.sg },
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?', u: (c) => c.o.sg },
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?' },
      age,
    ],
  }
}

// ───────────────────────── çarpma-bölme yapıları ─────────────────────────

function equalGroups(n: number, k: number, kind: 'pic' | 'array'): Task {
  const p = n * k
  return {
    title: kind === 'pic' ? 'Eş gruplar' : 'Dizi modeli',
    eq: `${n} × ${k} = ?`,
    model: () => (kind === 'pic' ? { k: 'groups', n, each: k } : { k: 'vis', v: { kind: 'array', rows: n, cols: k } }),
    who: people(),
    what: things(),
    events: [
      { id: 'grp', s: 'Eş gruplar', t: (c) => `${c.a.n} ${n} kutuya ${ek(k, 'dist')} ${c.o.sg} koydu.`, ok: { total: p }, bad: { each: known() } },
      { id: 'arr', s: 'Dizi', t: (c) => `${c.a.n} ${c.o.placc} ${n} sıra hâlinde, her sırada ${k} tane olacak biçimde dizdi.`, ok: { total: p }, bad: { each: none('Hikâyende kutu yok; sıralar var. Modeldeki “?” neyi soruyor?') } },
      { id: 'rep', s: 'Tekrarlı toplama', t: (c) => `${c.a.n} ${n} gün boyunca her gün ${k} ${c.o.sg} biriktirdi.`, ok: { total: p } },
      { id: 'add', s: 'Ekleme', t: (c) => `${c.a.gen} ${n} ${c.o.poss} vardı. ${k} ${c.o.sg} daha aldı.`, rel: { m: `Modelde ${n} tane eş grup var ve her grupta ${k} tane. Hikâyende eş gruplar var mı?`, mis: 'Eş grupları (çarpma) toplama olarak modelledi' } },
      { id: 'num', s: 'Eş gruplar', t: (c) => `${c.a.n} ${n} kutuya ${ek(k + 1, 'dist')} ${c.o.sg} koydu.`, nums: { m: `Modelde her grupta kaç tane var? Hikâyedeki ${k + 1} modelde var mı?`, mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?', u: (c) => c.o.sg },
      { id: 'each', t: (c) => `Her kutuda kaç ${c.o.sg} var?`, short: 'Her kutuda kaç?' },
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?' },
      age,
    ],
  }
}

function sharing(t: number, n: number): Task {
  const q = t / n
  return {
    title: 'Bölme modeli',
    eq: `${t} ÷ ${n} = ?`,
    model: () => tape(Array.from({ length: n }, () => '?'), String(t)),
    who: people(),
    what: things(),
    events: [
      { id: 'part', s: 'Paylaştırma', t: (c) => `${c.a.n} ${t} ${c.o.acc} ${n} arkadaşına eşit olarak paylaştırdı.`, ok: { each: q }, bad: { total: known(), bags: none('Hikâyende poşet yok; arkadaşlar var. Her arkadaşa ne düştüğünü sorabilir misin?') } },
      { id: 'quot', s: 'Gruplama', t: (c) => `${c.a.n} ${t} ${c.o.acc} poşetlere ${ek(n, 'dist')} koydu.`, ok: { bags: q }, bad: { total: known(), each: known((c) => `Her poşette kaç ${c.o.sg} olduğunu hikâyede söyledin. Bilinmeyen ne?`) } },
      { id: 'sep', s: 'Ayırma', t: (c) => `${c.a.gen} ${t} ${c.o.poss} vardı. ${n} tanesini ${c.b.dat} verdi.`, rel: { m: `Modelde ${t}, ${n} eş parçaya bölünmüş. Hikâyende eş parçalar var mı, yoksa yalnızca ${n} tane mi çıkarıldı?`, mis: 'Bölmeyi (eşit paylaştırma) çıkarma olarak modelledi' } },
      { id: 'num', s: 'Paylaştırma', t: (c) => `${c.a.n} ${t} ${c.o.acc} ${n + 1} arkadaşına eşit olarak paylaştırdı.`, nums: { m: `Modelde bütün kaç eş parçaya bölünmüş? Hikâyedeki ${n + 1} modelde var mı?`, mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'each', t: (c) => `Her arkadaşa kaç ${c.o.sg} düştü?`, short: 'Her birine kaç?', u: (c) => c.o.sg },
      { id: 'bags', t: () => 'Kaç poşet doldu?', short: 'Kaç poşet?', u: () => 'poşet' },
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?' },
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?' },
      age,
    ],
  }
}

function twoStep(n: number, k: number, e: number): Task {
  const total = n * k + e
  return {
    title: 'İki adımlı şerit',
    eq: `${n} × ${k} + ${e} = ?`,
    model: () => tape([...Array.from({ length: n }, () => k), e], '?', [...Array.from({ length: n }, () => k), e]),
    who: people(),
    what: things(),
    events: [
      { id: 'pack', s: 'Paketler ve fazlası', t: (c) => `${c.a.n} her birinde ${k} ${c.o.sg} olan ${n} paket aldı. Evde de ${e} ${c.o.poss} vardı.`, ok: { total }, bad: { pack: known() } },
      { id: 'days', s: 'Biriktirme ve ekleme', t: (c) => `${c.a.n} ${n} gün boyunca her gün ${k} ${c.o.sg} biriktirdi. Sonra ${c.b.n} ona ${e} ${c.o.sg} daha verdi.`, ok: { total } },
      { id: 'give', s: 'Paketler ve verme', t: (c) => `${c.a.n} her birinde ${k} ${c.o.sg} olan ${n} paket aldı. Sonra ${e} tanesini ${c.b.dat} verdi.`, rel: { m: `Modelin sonunda ${e} ekleniyor mu, çıkarılıyor mu?`, mis: 'İki adımlı modelde ikinci işlemi ters kurdu' } },
      { id: 'num', s: 'Paketler ve fazlası', t: (c) => `${c.a.n} her birinde ${e} ${c.o.sg} olan ${n} paket aldı. Evde de ${k} ${c.o.poss} vardı.`, nums: { m: `Modelde ${n} eş parçanın her biri kaç? Tek başına duran parça kaç?`, mis: 'Sayıları modeldeki yerlerine yerleştirmedi' } },
    ],
    qs: [
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} oldu?`, short: 'Toplam kaç?', u: (c) => c.o.sg },
      { id: 'pack', t: (c) => `Bir pakette kaç ${c.o.sg} var?`, short: 'Pakette kaç?' },
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?', u: (c) => c.o.sg },
      age,
    ],
  }
}

function multCompare(a: number, k: number): Task {
  const p = a * k
  return {
    title: 'Kat karşılaştırma',
    eq: `${a} × ${k} = ?`,
    model: () => ({ k: 'vis', v: { kind: 'tape', parts: Array.from({ length: k }, () => ({ label: String(a), value: a })), total: '?', compare: [{ label: String(a), value: a }] } }),
    who: people(),
    what: things(),
    events: [
      { id: 'times', s: 'Kat karşılaştırma', t: (c) => `${c.a.gen} ${a} ${c.o.poss} var. ${c.b.gen} ${c.a.gen} ${k} katı kadar ${c.o.poss} var.`, ok: { bHas: p }, bad: { more: rel((c) => `Bu soru farkı soruyor. Modeldeki “?” ise ${c.b.gen} ${c.o.plg} tamamını gösteriyor.`), total: rel('“Toplam” iki kişinin hepsini birlikte sorar. Modeldeki “?” hangi şeridin uzunluğu?') } },
      { id: 'grp', s: 'Eş gruplar', t: (c) => `${c.a.n} ${k} kutuya ${ek(a, 'dist')} ${c.o.sg} koydu.`, ok: { total: p } },
      { id: 'diff', s: 'Fark', t: (c) => `${c.a.gen} ${a} ${c.o.poss} var. ${c.b.gen} ${c.a.abl} ${k} fazla ${c.o.poss} var.`, rel: { m: `“${k} fazla” ile “${k} katı” aynı mı? Modeldeki alt şerit, üsttekinin kaç tanesinden oluşuyor?`, mis: 'Kat karşılaştırmayı fark olarak yorumladı' } },
      { id: 'num', s: 'Kat karşılaştırma', t: (c) => `${c.a.gen} ${a} ${c.o.poss} var. ${c.b.gen} ${c.a.gen} ${k + 1} katı kadar ${c.o.poss} var.`, nums: { m: `Modelde kaç eş şerit parçası var? Hikâyedeki ${k + 1} modelle uyuşuyor mu?`, mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'bHas', t: (c) => `${c.b.gen} kaç ${c.o.poss} var?`, short: 'Öbürünün kaçı var?', u: (c) => c.o.sg },
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?', u: (c) => c.o.sg },
      { id: 'more', t: (c) => `${c.b.gen} ${c.a.abl} kaç fazla ${c.o.poss} var?`, short: 'Kaç fazla?' },
      age,
    ],
  }
}

function multInverse(k: number, p: number): Task {
  const a = p / k
  return {
    title: 'Kat karşılaştırma',
    eq: `? × ${k} = ${p}`,
    model: () => ({ k: 'vis', v: { kind: 'tape', parts: Array.from({ length: k }, () => ({ label: '?', value: 1 })), total: String(p), compare: [{ label: '?', value: 1 }] } }),
    who: people(),
    what: things(),
    events: [
      { id: 'times', s: 'Kat karşılaştırma', t: (c) => `${c.b.gen} ${p} ${c.o.poss} var ve bu, ${c.a.gen} ${k} katı kadar.`, ok: { aHas: a }, bad: { bHas: known() } },
      { id: 'part', s: 'Paylaştırma', t: (c) => `${c.a.n} ${p} ${c.o.acc} ${k} arkadaşına eşit olarak paylaştırdı.`, ok: { each: a } },
      { id: 'swap', s: 'Kat karşılaştırma', t: (c) => `${c.a.gen} ${p} ${c.o.poss} var. ${c.b.gen} ${c.a.gen} ${k} katı kadar ${c.o.poss} var.`, rel: { m: `Modelde ${p}, uzun şeridin (${k} katı olanın) tamamı. Hikâyende ${p} kimin? Kimin miktarı ${k} katı?`, mis: 'Kat karşılaştırmada büyük ve küçük miktarı karıştırdı' } },
      { id: 'diff', s: 'Fark', t: (c) => `${c.b.gen} ${p} ${c.o.poss} var; bu, ${c.a.abl} ${k} fazla.`, rel: { m: `“${k} fazla” ile “${k} katı” aynı mı? Uzun şerit, kısa şeritten kaç tane içeriyor?`, mis: 'Kat karşılaştırmayı fark olarak yorumladı' } },
    ],
    qs: [
      { id: 'aHas', t: (c) => `${c.a.gen} kaç ${c.o.poss} var?`, short: 'Küçük miktar kaç?', u: (c) => c.o.sg },
      { id: 'each', t: (c) => `Her arkadaşa kaç ${c.o.sg} düştü?`, short: 'Her birine kaç?', u: (c) => c.o.sg },
      { id: 'bHas', t: (c) => `${c.b.gen} kaç ${c.o.poss} var?`, short: 'Büyük miktar kaç?' },
      age,
    ],
  }
}

// ───────────────────────── ölçme ─────────────────────────

const rectCtx = (c: Ctx) => ({ u: c.o.x.u, poss: c.o.poss })
function perimeter(wd: number, h: number): Task {
  const P = 2 * (wd + h)
  return {
    title: 'Çevre modeli',
    eq: `${wd} + ${h} + ${wd} + ${h} = ?`,
    model: (o) => ({ k: 'rect', w: wd, h, edge: true, inside: 'Çevre = ?', wl: `${wd} ${o?.x.u ?? 'birim'}`, hl: `${h} ${o?.x.u ?? 'birim'}` }),
    who: people(),
    what: shuffle(PLACES),
    events: [
      { id: 'fence', s: 'Kenarları sarma', t: (c) => `${c.a.gen} ${c.o.poss} ${wd} ${rectCtx(c).u} uzunluğunda, ${h} ${rectCtx(c).u} genişliğinde bir dikdörtgen. ${c.a.n} dört kenarı boyunca ${c.o.x.fence} ${c.o.x.verb}.`, ok: { fence: P }, bad: { cover: rel('Model içini dolduran kareleri mi, kenarların uzunluğunu mu gösteriyor?', 'Çevre ile alanı karıştırdı') } },
      { id: 'walk', s: 'Tur atma', t: (c) => `${c.a.gen} ${c.o.poss} ${wd} ${rectCtx(c).u} uzunluğunda, ${h} ${rectCtx(c).u} genişliğinde bir dikdörtgen. Bir karınca kenarları boyunca tam bir tur attı.`, ok: { walk: P }, bad: { cover: rel('Karınca içeriyi mi dolaştı, kenarları mı? Model hangisini gösteriyor?', 'Çevre ile alanı karıştırdı') } },
      { id: 'cover', s: 'Kaplama', t: (c) => `${c.a.gen} ${c.o.poss} ${wd} ${rectCtx(c).u} uzunluğunda, ${h} ${rectCtx(c).u} genişliğinde bir dikdörtgen. ${c.a.n} içini tamamen ${c.o.x.cover} ile kaplayacak.`, rel: { m: 'Modelde kalın çizilen ne: dikdörtgenin içi mi, kenarları mı? Kaplamak alan mı, çevre mi ister?', mis: 'Çevre ile alanı karıştırdı' } },
      { id: 'num', s: 'Kenarları sarma', t: (c) => `${c.a.gen} ${c.o.poss} her kenarı ${wd} ${rectCtx(c).u} olan bir kare. ${c.a.n} dört kenarı boyunca ${c.o.x.fence} ${c.o.x.verb}.`, nums: { m: `Modeldeki şekil kare mi? Kısa kenarlar kaç ${'birim'}?`, mis: 'Modeldeki ölçüleri hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'fence', t: (c) => `Kaç ${c.o.x.u} ${c.o.x.fence} gerekir?`, short: 'Kenarlara ne kadar?', u: (c) => c.o.x.u },
      { id: 'walk', t: (c) => `Karınca kaç ${c.o.x.u} yürüdü?`, short: 'Kaç birim yürüdü?', u: (c) => c.o.x.u },
      { id: 'cover', t: (c) => `Kaç ${c.o.x.u}² ${c.o.x.cover} gerekir?`, short: 'İçine ne kadar?' },
      age,
    ],
    hints: ['Model dikdörtgenin içini mi, kenarlarını mı vurguluyor?', 'Çevre, kenarlar boyunca bir tur atınca alınan yoldur.', HINTS[2]],
  }
}

function area(wd: number, h: number): Task {
  const A = wd * h
  return {
    title: 'Alan modeli',
    eq: `${wd} × ${h} = ?`,
    model: (o) => ({ k: 'rect', w: wd, h, grid: true, inside: 'Alan = ?', wl: `${wd} ${o?.x.u ?? 'birim'}`, hl: `${h} ${o?.x.u ?? 'birim'}` }),
    who: people(),
    what: shuffle(PLACES),
    events: [
      { id: 'cover', s: 'Kaplama', t: (c) => `${c.a.gen} ${c.o.poss} ${wd} ${c.o.x.u} uzunluğunda, ${h} ${c.o.x.u} genişliğinde bir dikdörtgen. ${c.a.n} içini tamamen ${c.o.x.cover} ile kaplayacak.`, ok: { cover: A }, bad: { fence: rel('Model kenarları mı, içini dolduran birim kareleri mi gösteriyor?', 'Alan ile çevreyi karıştırdı') } },
      { id: 'units', s: 'Birim kareler', t: (c) => `${c.a.n} ${c.o.acc} 1 ${c.o.x.u}²’lik eş karelere ayırdı: ${wd} sütun ve ${h} sıra oluştu.`, ok: { squares: A } },
      { id: 'fence', s: 'Kenarları sarma', t: (c) => `${c.a.gen} ${c.o.poss} ${wd} ${c.o.x.u} uzunluğunda, ${h} ${c.o.x.u} genişliğinde bir dikdörtgen. ${c.a.n} dört kenarı boyunca ${c.o.x.fence} ${c.o.x.verb}.`, rel: { m: 'Modelde birim kareler sayılıyor. Kenarlar boyunca döşemek alan mı, çevre mi ister?', mis: 'Alan ile çevreyi karıştırdı' } },
      { id: 'num', s: 'Kaplama', t: (c) => `${c.a.gen} ${c.o.poss} ${wd} ${c.o.x.u} uzunluğunda, ${wd} ${c.o.x.u} genişliğinde. ${c.a.n} içini tamamen ${c.o.x.cover} ile kaplayacak.`, nums: { m: 'Modeldeki dikdörtgenin kısa kenarı kaç birim?', mis: 'Modeldeki ölçüleri hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'cover', t: (c) => `Kaç ${c.o.x.u}² ${c.o.x.cover} gerekir?`, short: 'İçine ne kadar?', u: (c) => `${c.o.x.u}²` },
      { id: 'squares', t: () => 'Kaç kare oluştu?', short: 'Kaç kare?', u: () => 'kare' },
      { id: 'fence', t: (c) => `Kaç ${c.o.x.u} ${c.o.x.fence} gerekir?`, short: 'Kenarlara ne kadar?' },
      age,
    ],
  }
}

function perimeterInverse(P: number, wd: number): Task {
  const h = P / 2 - wd
  return {
    title: 'Çevreden kenara',
    eq: `${wd} + ? + ${wd} + ? = ${P}`,
    model: (o) => ({ k: 'rect', w: wd, h, edge: true, inside: `Çevre = ${P} ${o?.x.u ?? 'birim'}`, wl: `${wd} ${o?.x.u ?? 'birim'}`, hl: '?' }),
    who: people(),
    what: shuffle(PLACES),
    events: [
      { id: 'fence', s: 'Kenarları sarma', t: (c) => `${c.a.n} dikdörtgen biçimindeki ${c.o.acc} dört kenarı boyunca ${P} ${c.o.x.u} ${c.o.x.fence} ${c.o.x.past}. Uzun kenarı ${wd} ${c.o.x.u}.`, ok: { short: h }, bad: { area: rel('Güzel bir soru, ama iki adım ister. Modeldeki “?” işareti neyi gösteriyor?') } },
      { id: 'walk', s: 'Tur atma', t: (c) => `Bir karınca, ${c.a.gen} dikdörtgen biçimindeki ${c.o.poss} kenarları boyunca bir tur atınca ${P} ${c.o.x.u} yürüdü. Uzun kenar ${wd} ${c.o.x.u}.`, ok: { short: h }, bad: { area: rel('Güzel bir soru, ama iki adım ister. Modeldeki “?” işareti neyi gösteriyor?') } },
      { id: 'area', s: 'Kaplama', t: (c) => `${c.a.gen} dikdörtgen biçimindeki ${c.o.poss} ${P} ${c.o.x.u}²’lik bir alan kaplıyor. Uzun kenarı ${wd} ${c.o.x.u}.`, rel: { m: `Modelde ${P} çevre mi, alan mı? Kenarlar boyunca mı ölçülüyor?`, mis: 'Çevre ile alanı karıştırdı' } },
      { id: 'num', s: 'Kenarları sarma', t: (c) => `${c.a.n} dikdörtgen biçimindeki ${c.o.acc} dört kenarı boyunca ${P + 4} ${c.o.x.u} ${c.o.x.fence} ${c.o.x.past}. Uzun kenarı ${wd} ${c.o.x.u}.`, nums: { m: `Modelde çevre kaç? Hikâyedeki ${P + 4} modelde var mı?`, mis: 'Modeldeki ölçüleri hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'short', t: (c) => `Kısa kenarı kaç ${c.o.x.u}?`, short: 'Kısa kenar kaç?', u: (c) => c.o.x.u },
      { id: 'area', t: (c) => `Alanı kaç ${c.o.x.u}²?`, short: 'Alanı kaç?' },
      { id: 'per', t: (c) => `Çevresi kaç ${c.o.x.u}?`, short: 'Çevresi kaç?' },
      age,
    ],
  }
}

// ───────────────────────── veri ve iki adımlı tablolar ─────────────────────────

function barsCompare(lo: number, hi: number): Task {
  const d = hi - lo
  const kinds: Obj[] = [
    obj('kitap', '📚', 'kitap', 'kitabı', 'kitabı', ['masal', 'bilim'], { v: 'okundu', title: 'okunan kitap sayısı' }),
    obj('fidan', '🌱', 'fidan', 'fidanı', 'fidanı', ['büyük', 'küçük'], { v: 'dikildi', title: 'dikilen fidan sayısı' }),
    obj('ziyaretci', '🧑‍🤝‍🧑', 'ziyaretçi', 'ziyaretçisi', 'ziyaretçiyi', ['büyük', 'küçük'], { v: 'geldi', title: 'gelen ziyaretçi sayısı' }),
  ]
  return {
    title: 'Sütun grafiği',
    eq: `${hi} − ${lo} = ?`,
    model: (o) => ({ k: 'vis', v: { kind: 'bars', title: o ? `Günlere göre ${o.x.title}` : 'Günlere göre sayılar', data: [{ label: 'Pzt', value: 45 }, { label: 'Salı', value: lo }, { label: 'Çarş', value: hi }, { label: 'Perş', value: 50 }] } }),
    who: people(),
    what: shuffle(kinds),
    whatLabel: 'Ne?',
    events: [
      { id: 'cmp', s: 'Grafikte karşılaştırma', t: (c) => `${c.a.n} okul panosundaki grafiği inceledi: Salı günü ${lo} ${c.o.sg} ${c.o.x.v}, Çarşamba günü ${hi} ${c.o.sg} ${c.o.x.v}.`, ok: { more: d, less: d }, bad: { times: rel(`Model ${hi} − ${lo} = ? diyor. Bu soru farkı mı, katı mı soruyor?`, 'Fark ile kat karşılaştırmasını karıştırdı'), total: rel('“Toplam” iki günü birleştirir. Model iki günü toplamıyor; karşılaştırıyor.', 'Karşılaştırma durumunu toplama ile karıştırdı') } },
      { id: 'chg', s: 'Değişim', t: (c) => `${c.a.n} grafiğe baktı: Salı günü ${lo} ${c.o.sg} ${c.o.x.v}. Çarşamba günü bu sayı arttı ve ${hi} oldu.`, ok: { incr: d, more: d }, bad: { times: rel(`Model ${hi} − ${lo} = ? diyor. Bu soru farkı mı, katı mı soruyor?`, 'Fark ile kat karşılaştırmasını karıştırdı') } },
      { id: 'pw', s: 'Parça-bütün', t: (c) => `${c.a.n} grafiğe baktı: Çarşamba günü ${hi} ${c.o.sg} ${c.o.x.v}. Bunların ${lo} tanesi sabah ${c.o.x.v}.`, rel: { m: `Grafikte ${lo}, Salı gününün sayısı; Çarşamba’nın bir parçası değil. Hikâyen grafiği doğru anlatıyor mu?`, mis: 'Grafikteki değerleri yanlış kategorilerle ilişkilendirdi' } },
      { id: 'num', s: 'Grafikte karşılaştırma', t: (c) => `${c.a.n} grafiği inceledi: Pazartesi günü 45 ${c.o.sg} ${c.o.x.v}, Çarşamba günü ${hi} ${c.o.sg} ${c.o.x.v}.`, nums: { m: `Model ${hi} − ${lo} = ? diyor. Grafikte ${lo} hangi günün sayısı?`, mis: 'Grafikten yanlış değeri okudu' } },
    ],
    qs: [
      { id: 'more', t: (c) => `Çarşamba günü, Salı gününden kaç fazla ${c.o.sg} ${c.o.x.v}?`, short: 'Kaç fazla?', u: (c) => c.o.sg },
      { id: 'less', t: (c) => `Salı günü, Çarşamba gününden kaç eksik ${c.o.sg} ${c.o.x.v}?`, short: 'Kaç eksik?', u: (c) => c.o.sg },
      { id: 'incr', t: () => 'Sayı kaç arttı?', short: 'Kaç arttı?' },
      { id: 'times', t: () => 'Çarşamba günkü sayı, Salı günkünün kaç katı?', short: 'Kaç katı?' },
      { id: 'total', t: (c) => `İki günde toplam kaç ${c.o.sg} ${c.o.x.v}?`, short: 'Toplam kaç?' },
      irr(() => 'Grafiği kim çizdi?', 'Grafiği kim çizdi?'),
    ],
    hints: ['Grafikte Salı ve Çarşamba sütunlarını bul. Model hangi iki sayıyı kullanıyor?', `Model ${hi} − ${lo}: iki gün karşılaştırılıyor mu, birleştiriliyor mu?`, HINTS[2]],
  }
}

interface Shop { id: string; label: string; emoji: string; from: string; i1: string; i2: string }
function shopTwoStep(n1: number, p1: number, n2: number, p2: number, shops: Shop[], title: string): Task {
  const total = n1 * p1 + n2 * p2
  const what = shops.map((s) => obj(s.id, s.emoji, s.label, s.label, s.label, ['büyük', 'küçük'], { from: s.from, i1: s.i1, i2: s.i2 }))
  return {
    title,
    eq: `${n1} × ${p1} + ${n2} × ${p2} = ?`,
    model: (o) => ({ k: 'vis', v: { kind: 'table', headers: ['Ürün', 'Birim fiyatı'], rows: [[o ? cap(o.x.i1) : 'Ürün 1', `${p1} TL`], [o ? cap(o.x.i2) : 'Ürün 2', `${p2} TL`]] } }),
    who: people(),
    what: shuffle(what),
    whatLabel: 'Nereden?',
    events: [
      { id: 'buy', s: 'Alışveriş', t: (c) => `${c.a.n} ${c.o.x.from} ${n1} ${c.o.x.i1} ve ${n2} ${c.o.x.i2} aldı.`, ok: { pay: total }, bad: { change: none('Hikâyede kasaya ne kadar para verildiği yazıyor mu?') } },
      { id: 'two', s: 'İki kişinin alışverişi', t: (c) => `${c.a.n} ${c.o.x.from} ${n1} ${c.o.x.i1}, ${c.b.n} ise ${n2} ${c.o.x.i2} aldı.`, ok: { both: total }, bad: { pay: none('Hikâyede iki kişi alışveriş yaptı. Soruyu ikisini birlikte kapsayacak biçimde sorabilir misin?'), change: none('Hikâyede kasaya ne kadar para verildiği yazıyor mu?') } },
      { id: 'ret', s: 'Alma ve iade', t: (c) => `${c.a.n} ${c.o.x.from} ${n1} ${c.o.x.i1} aldı, sonra ${n2} ${c.o.x.i2} iade etti.`, rel: { m: `Modelde iki tutar toplanıyor (+). İade etmek tutarı artırır mı, azaltır mı?`, mis: 'İki adımlı modelde toplama yerine çıkarma kurdu' } },
      { id: 'num', s: 'Alışveriş', t: (c) => `${c.a.n} ${c.o.x.from} ${n2} ${c.o.x.i1} ve ${n1} ${c.o.x.i2} aldı.`, nums: { m: `Tabloda hangi ürün ${p1} TL? Modelde ${p1} TL’lik üründen kaç tane var?`, mis: 'Adetleri yanlış ürünlerle eşleştirdi' } },
    ],
    qs: [
      { id: 'pay', t: () => 'Toplam kaç TL ödedi?', short: 'Kaç TL ödedi?', u: () => 'TL' },
      { id: 'both', t: () => 'İkisi birlikte kaç TL ödedi?', short: 'İkisi kaç TL ödedi?', u: () => 'TL' },
      { id: 'change', t: () => 'Para üstü kaç TL?', short: 'Para üstü?' },
      irr(() => 'Dükkân saat kaçta kapanıyor?', 'Kapanış saati?'),
    ],
    hints: ['Tablodaki fiyatlara ve modeldeki adetlere bak: kaç tane, kaç liralık ürün?', 'Model iki tutarı topluyor. Hikâyende iki ürün birlikte alınıyor mu?', HINTS[2]],
  }
}

// ───────────────────────── kesirler ─────────────────────────

function fractionOf(t: number, n: number, d: number): Task {
  const ans = (t * n) / d
  return {
    title: 'Bir çokluğun kesri',
    eq: `${ek(t, 'gen')} ${fr(n, d)} = ?`,
    model: () => ({ k: 'frac', den: d, num: n, whole: String(t), part: '?' }),
    who: people(),
    what: things(),
    events: [
      { id: 'give', s: 'Kesir kadarını verme', t: (c) => `${c.a.gen} ${t} ${c.o.poss} vardı. Bunların ${fr(n, d, true)} ${c.o.plg.length ? c.b.dat : ''} verdi.`, ok: { given: ans }, bad: { left: rel(`Modelde “?” hangi parçada: verilen ${fr(n, d)} mi, kalan parça mı?`, 'Kesrin gösterdiği parça ile kalan parçayı karıştırdı'), total: known() } },
      { id: 'pw', s: 'Parça-bütün', t: (c) => `${c.a.gen} ${t} ${c.o.poss} var. Bunların ${fr(n, d)} ${c.o.adj[0]}, gerisi ${c.o.adj[1]}.`, ok: { adj0: ans }, bad: { adj1: rel(`Modelde boyalı parça (${fr(n, d)}) mı soruluyor, boyasız parça mı?`, 'Kesrin gösterdiği parça ile kalan parçayı karıştırdı'), total: known() } },
      { id: 'count', s: 'Tane olarak verme', t: (c) => `${c.a.gen} ${t} ${c.o.poss} vardı. ${n} tanesini ${c.b.dat} verdi.`, rel: { m: `Model “${fr(n, d)}” diyor. ${n} tane ile ${t} tanenin ${fr(n, d)} aynı mı?`, mis: 'Kesri doğal sayı (tane) gibi kullandı' } },
      { id: 'num', s: 'Kesir kadarını verme', t: (c) => `${c.a.gen} ${t} ${c.o.poss} vardı. Bunların ${fr(1, d, true)} ${c.b.dat} verdi.`, nums: { m: `Modelde ${d} eş parçanın kaç tanesi boyalı?`, mis: 'Kesrin payını modelden yanlış okudu' } },
    ],
    qs: [
      { id: 'given', t: (c) => `${c.b.dat} kaç ${c.o.sg} verdi?`, short: 'Kaç tane verdi?', u: (c) => c.o.sg },
      { id: 'adj0', t: (c) => `Kaç tanesi ${c.o.adj[0]}?`, short: 'Boyalı parça kaç?', u: (c) => c.o.sg },
      { id: 'left', t: (c) => `Kaç ${c.o.sg} kaldı?`, short: 'Kaç kaldı?' },
      { id: 'adj1', t: (c) => `Kaç tanesi ${c.o.adj[1]}?`, short: 'Diğer parça kaç?' },
      { id: 'total', t: (c) => `Toplam kaç ${c.o.sg} var?`, short: 'Toplam kaç?' },
      age,
    ],
    hints: [`Model ${t} tanenin ${d} eş parçaya bölündüğünü gösteriyor. Boyalı kaç parça var?`, 'Boyalı parça mı soruluyor, boyasız parça mı?', HINTS[2]],
  }
}

function fractionWhole(part: number, n: number, d: number): Task {
  const whole = (part * d) / n
  return {
    title: 'Parçadan bütüne',
    eq: `? × ${`[[${n}/${d}]]`} = ${part}`,
    model: () => ({ k: 'frac', den: d, num: n, whole: '?', part: String(part) }),
    who: people(),
    what: things(),
    events: [
      { id: 'pw', s: 'Parça-bütün', t: (c) => `${c.a.gen} ${c.o.plpg} ${fr(n, d)} ${c.o.adj[0]}. ${c.a.gen} ${part} ${c.o.adj[0]} ${c.o.poss} var.`, ok: { all: whole }, bad: { adj1: rel('Güzel bir soru, ama modeldeki “?” bütünü (hepsini) gösteriyor.') } },
      { id: 'use', s: 'Kesir kadarını kullanma', t: (c) => `${c.a.n} kutudaki ${c.o.plg} ${fr(n, d, true)} kullandı. Kullandığı ${c.o.sg} sayısı ${part}.`, ok: { start: whole } },
      { id: 'swap', s: 'Kesir kadarını verme', t: (c) => `${c.a.gen} ${part} ${c.o.poss} var. Bunların ${fr(n, d, true)} ${c.b.dat} verdi.`, rel: { m: `Modelde ${part}, bütünün mü yoksa ${fr(n, d)} parçanın mı sayısı?`, mis: 'Parça ile bütünü karıştırdı' } },
      { id: 'num', s: 'Parça-bütün', t: (c) => `${c.a.gen} ${c.o.plpg} ${fr(n, d)} ${c.o.adj[0]}. ${c.a.gen} toplam ${part} ${c.o.poss} var.`, nums: { m: `Modelde ${part} hangi parçanın üstünde yazıyor: bütünün mü, boyalı ${d} parçadan ${n} tanesinin mi?`, mis: 'Parça ile bütünü karıştırdı' } },
    ],
    qs: [
      { id: 'all', t: (c) => `${c.a.gen} toplam kaç ${c.o.poss} var?`, short: 'Hepsi kaç?', u: (c) => c.o.sg },
      { id: 'start', t: (c) => `Kutuda başta kaç ${c.o.sg} vardı?`, short: 'Başta kaç vardı?', u: (c) => c.o.sg },
      { id: 'adj1', t: (c) => `Kaç tanesi ${c.o.adj[1]}?`, short: 'Diğer parça kaç?' },
      age,
    ],
    hints: ['Model bir parçanın kaç tane olduğunu söylüyor. Hangi parça?', `${d} eş parçanın ${n} tanesi ${part} ise bir parça kaç eder?`, 'Sorun bütünü (hepsini) mi soruyor?'],
  }
}

// ───────────────────────── 6. sınıf ─────────────────────────

function percent(): Task {
  const t = 800, p = 25, ans = 200
  const items = [obj('ayakkabi', '👟', 'ayakkabı', 'ayakkabısı', 'ayakkabıyı'), obj('kulaklik', '🎧', 'kulaklık', 'kulaklığı', 'kulaklığı'), obj('kaykay', '🛹', 'kaykay', 'kaykayı', 'kaykayı')]
  return {
    title: 'Yüzde modeli',
    eq: `${ek(t, 'gen')} %${p}’i = ?`,
    model: () => ({ k: 'vis', v: { kind: 'tape', parts: [{ label: '%25 → ?', value: 1 }, { label: '%25', value: 1, color: '#e2e8f0' }, { label: '%25', value: 1, color: '#e2e8f0' }, { label: '%25', value: 1, color: '#e2e8f0' }], total: `${t} TL` } }),
    who: people(),
    what: shuffle(items),
    events: [
      { id: 'disc', s: 'İndirim', t: (c) => `${c.a.n} ${t} TL’lik bir ${c.o.sg} beğendi. Mağazada bu ${c.o.sg} için %${p} indirim var.`, ok: { disc: ans }, bad: { newp: rel('Modelde “?” hangi parçada: indirim (%25) mi, kalan fiyat (%75) mi?', 'Yüzde parçası ile kalan kısmı karıştırdı') } },
      { id: 'raise', s: 'Zam', t: (c) => `${cap(c.o.sg)} ${t} TL’ye satılıyordu. ${c.a.n} almadan önce fiyatına %${p} zam geldi.`, ok: { raise: ans }, bad: { raisedP: rel('Modelde “?” yalnızca %25’lik parçayı gösteriyor. Zamlı fiyat bu parça mı?', 'Yüzde parçası ile yeni toplamı karıştırdı') } },
      { id: 'tl', s: 'TL indirimi', t: (c) => `${c.a.n} ${t} TL’lik bir ${c.o.sg} beğendi. Mağaza ${p} TL indirim yaptı.`, rel: { m: `${p} TL ile %${p} aynı mı? %${p}, ${ek(t, 'gen')} kaçta kaçı?`, mis: 'Yüzdeyi TL miktarı gibi kullandı' } },
      { id: 'num', s: 'İndirim', t: (c) => `${c.a.n} ${t} TL’lik bir ${c.o.sg} beğendi. Mağazada %20 indirim var.`, nums: { m: 'Modelde şerit kaç eş parçaya bölünmüş? Bir parça yüzde kaç eder?', mis: 'Modeldeki yüzdeyi hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'disc', t: () => 'İndirim kaç TL?', short: 'İndirim kaç TL?', u: () => 'TL' },
      { id: 'newp', t: () => 'İndirimli fiyat kaç TL?', short: 'İndirimli fiyat?' },
      { id: 'raise', t: () => 'Zam kaç TL?', short: 'Zam kaç TL?', u: () => 'TL' },
      { id: 'raisedP', t: () => 'Zamlı fiyat kaç TL?', short: 'Zamlı fiyat?' },
      irr(() => 'Mağaza saat kaçta kapanıyor?', 'Kapanış saati?'),
    ],
  }
}

function decimalTimes(): Task {
  const ans = 38.25
  const U = [
    obj('ip', '🧵', 'ip', 'ipi', 'ipi', ['uzun', 'kısa'], { u: 'm' }, 'ip (m)'),
    obj('un', '🌾', 'un', 'unu', 'unu', ['büyük', 'küçük'], { u: 'kg' }, 'un (kg)'),
    obj('bilet', '🎟️', 'bilet', 'bileti', 'bileti', ['büyük', 'küçük'], { u: 'TL' }, 'bilet (TL)'),
  ]
  return {
    title: 'Ondalık gösterimle çarpma',
    eq: '3 × 12,75 = ?',
    model: () => tape(['12,75', '12,75', '12,75'], '?', [1, 1, 1]),
    who: people(),
    what: shuffle(U),
    events: [
      { id: 'grp', s: 'Eş gruplar', t: (c) => per(c.o, { ip: `${c.a.n} her biri 12,75 m olan 3 ipi uç uca ekledi.`, un: `${c.a.n} her biri 12,75 kg olan 3 çuval un taşıdı.`, bilet: `${c.a.n} tanesi 12,75 TL olan 3 otobüs bileti aldı.` }), ok: { tot: ans }, bad: { bHas: none() } },
      { id: 'times', s: 'Kat karşılaştırma', t: (c) => per(c.o, { ip: `${c.a.gen} ipi 12,75 m. ${c.b.gen} ipi bunun 3 katı uzunlukta.`, un: `${c.a.gen} çuvalı 12,75 kg. ${c.b.gen} taşıdığı kutu bunun 3 katı ağırlıkta.`, bilet: `${c.a.gen} kumbarasında 12,75 TL var. ${c.b.gen} kumbarasında bunun 3 katı para var.` }), ok: { bHas: ans }, bad: { tot: rel('“Toplam” ikisini birlikte sorar. Modeldeki “?” üç eş parçanın toplamı: kimin miktarı bu?') } },
      { id: 'add', s: 'Ekleme', t: (c) => per(c.o, { ip: `${c.a.gen} 12,75 m’lik ipine 3 m’lik bir ip daha ekledi.`, un: `${c.a.n} 12,75 kg’lık çuvala 3 kg daha un koydu.`, bilet: `${c.a.n} 12,75 TL’lik bir bilet aldı ve 3 TL daha harcadı.` }), rel: { m: 'Modelde 12,75’ten 3 tane var. Hikâyende 12,75’e 3 mü ekleniyor, yoksa 12,75’ten 3 tane mi var?', mis: 'Çarpma (eş gruplar) yerine toplama kurdu' } },
      { id: 'num', s: 'Eş gruplar', t: (c) => per(c.o, { ip: `${c.a.n} her biri 1,275 m olan 3 ipi uç uca ekledi.`, un: `${c.a.n} her biri 1,275 kg olan 3 çuval un taşıdı.`, bilet: `${c.a.n} tanesi 1,275 TL olan 3 otobüs bileti aldı.` }), nums: { m: 'Modeldeki her parça kaç? 1,275 ile 12,75 aynı mı? Virgülün yerine bak.', mis: 'Ondalık gösterimde basamak değerini karıştırdı' } },
    ],
    qs: [
      { id: 'tot', t: (c) => per(c.o, { ip: 'İpin toplam uzunluğu kaç m oldu?', un: 'Toplam kaç kg un taşıdı?', bilet: 'Toplam kaç TL ödedi?' }), short: 'Toplam ne kadar?', u: (c) => c.o.x.u },
      { id: 'bHas', t: (c) => per(c.o, { ip: `${c.b.gen} ipi kaç m?`, un: `${c.b.gen} taşıdığı kutu kaç kg?`, bilet: `${c.b.gen} kumbarasında kaç TL var?` }), short: 'Öbürü ne kadar?', u: (c) => c.o.x.u },
      irr((c) => `${c.a.n} bunu hangi gün yaptı?`, 'Hangi gün?'),
    ],
    pad: { decimal: true },
  }
}

function ratioTable(): Task {
  const R = [
    obj('kek', '🧁', 'kek', 'keki', 'keki', ['büyük', 'küçük'], { i1: 'un', i2: 'şeker', u: 'bardak' }, 'kek'),
    obj('limonata', '🍋', 'limonata', 'limonatası', 'limonatayı', ['büyük', 'küçük'], { i1: 'su', i2: 'limon suyu', u: 'bardak' }, 'limonata'),
    obj('boya', '🎨', 'boya', 'boyası', 'boyayı', ['büyük', 'küçük'], { i1: 'beyaz boya', i2: 'mavi boya', u: 'kutu' }, 'açık mavi boya'),
  ]
  return {
    title: 'Oran tablosu',
    eq: '2 : 1 = 6 : ?',
    model: (o) => ({ k: 'vis', v: { kind: 'table', headers: [o ? `${cap(o.x.i1)} (${o.x.u})` : 'Birinci', o ? `${cap(o.x.i2)} (${o.x.u})` : 'İkinci'], rows: [[2, 1], [4, 2], [6, '?']] } }),
    who: people(),
    what: shuffle(R),
    events: [
      { id: 'ratio', s: 'Oran', t: (c) => `${c.a.n} ${c.o.label} hazırlarken her 2 ${c.o.x.u} ${c.o.x.i1} için 1 ${c.o.x.u} ${c.o.x.i2} kullanıyor. Bu kez 6 ${c.o.x.u} ${c.o.x.i1} kullanacak.`, ok: { need: 3 }, bad: { total: rel('Bu soru iki malzemenin toplamını soruyor. Tablodaki “?” hangi sütunda?'), i1: known() } },
      { id: 'scale', s: 'Ölçekleme', t: (c) => `${c.a.gen} tarifinde 2 ${c.o.x.u} ${c.o.x.i1} ve 1 ${c.o.x.u} ${c.o.x.i2} var. ${c.a.n} tarifi büyütüp 6 ${c.o.x.u} ${c.o.x.i1} kullanacak.`, ok: { need: 3 }, bad: { total: rel('Bu soru iki malzemenin toplamını soruyor. Tablodaki “?” hangi sütunda?'), i1: known() } },
      { id: 'add', s: 'Fark', t: (c) => `${c.a.n} ${c.o.label} hazırlarken ${c.o.x.i2} miktarını hep ${c.o.x.i1} miktarından 1 ${c.o.x.u} az koyuyor. Bu kez 6 ${c.o.x.u} ${c.o.x.i1} kullanacak.`, rel: { m: 'Tabloda ilişki “1 eksik” mi, “yarısı” mı? 4’e karşılık gelen sayıya bak.', mis: 'Oranı toplamsal (fark) ilişki olarak yorumladı' } },
      { id: 'num', s: 'Oran', t: (c) => `${c.a.n} ${c.o.label} hazırlarken her 1 ${c.o.x.u} ${c.o.x.i1} için 2 ${c.o.x.u} ${c.o.x.i2} kullanıyor. Bu kez 6 ${c.o.x.u} ${c.o.x.i1} kullanacak.`, nums: { m: 'Tabloda hangi sayı birinci malzemeye, hangisi ikinciye ait?', mis: 'Oranın terimlerinin sırasını karıştırdı' } },
    ],
    qs: [
      { id: 'need', t: (c) => `Kaç ${c.o.x.u} ${c.o.x.i2} gerekir?`, short: 'İkinci malzeme ne kadar?', u: (c) => c.o.x.u },
      { id: 'i1', t: (c) => `Kaç ${c.o.x.u} ${c.o.x.i1} kullanacak?`, short: 'Birinci malzeme ne kadar?' },
      { id: 'total', t: (c) => `Toplam kaç ${c.o.x.u} malzeme kullanacak?`, short: 'Toplam ne kadar?' },
      irr((c) => `${cap(c.o.label)} kaç dakikada hazırlanır?`, 'Kaç dakika?'),
    ],
    hints: ['Tabloda soldaki sayı ile sağdaki sayı arasında nasıl bir ilişki var?', '2’den 6’ya nasıl gidilir? Aynı şeyi sağ sütuna uygula.', HINTS[2]],
  }
}

function equationAdd(): Task {
  const C = [
    obj('para', '🪙', 'para', 'parası', 'parayı', ['büyük', 'küçük'], { u: 'TL', cont: 'kumbarasında', loc: 'kumbarada', mat: 'para', add: 'attı', take: 'harcadı', part: 'TL’sini' }, 'para (TL)'),
    obj('su', '💧', 'su', 'suyu', 'suyu', ['büyük', 'küçük'], { u: 'L', cont: 'sürahisinde', loc: 'sürahide', mat: 'su', add: 'ekledi', take: 'içti', part: 'L’sini' }, 'su (L)'),
    obj('kum', '🪣', 'kum', 'kumu', 'kumu', ['büyük', 'küçük'], { u: 'kg', cont: 'kovasında', loc: 'kovada', mat: 'kum', add: 'ekledi', take: 'boşalttı', part: 'kg’ını' }, 'kum (kg)'),
  ]
  const x = 8.5
  return {
    title: 'Denklem (terazi)',
    eq: 'x + 3,5 = 12',
    model: () => ({ k: 'vis', v: { kind: 'balance', left: ['x', '3,5'], right: ['12'], tilt: 0 } }),
    who: people(),
    what: shuffle(C),
    events: [
      { id: 'join', s: 'Başlangıç bilinmiyor', t: (c) => `${c.a.gen} ${c.o.x.cont} bir miktar ${c.o.x.mat} vardı. ${c.a.n} 3,5 ${c.o.x.u} daha ${c.o.x.add}; ${c.o.x.loc} 12 ${c.o.x.u} ${c.o.x.mat} oldu.`, ok: { start: x }, bad: { end: known() } },
      { id: 'cmp', s: 'Karşılaştırma', t: (c) => `${c.b.gen} ${c.o.x.cont} 12 ${c.o.x.u} ${c.o.x.mat} var. Bu, ${c.a.gen} ${c.o.x.cont}kinden 3,5 ${c.o.x.u} fazla.`, ok: { a: x }, bad: { end: none('Hikâyede bir şey eklenmedi ya da çıkarılmadı. İki kişiyi karşılaştıran bir soru seç.') } },
      { id: 'sep', s: 'Ayırma', t: (c) => `${c.a.gen} ${c.o.x.cont} 12 ${c.o.x.u} ${c.o.x.mat} vardı. ${c.a.n} bunun 3,5 ${c.o.x.part} ${c.o.x.take}.`, ok: { left: x }, bad: { end: known() } },
      { id: 'res', s: 'Ekleme', t: (c) => `${c.a.gen} ${c.o.x.cont} 12 ${c.o.x.u} ${c.o.x.mat} vardı. ${c.a.n} 3,5 ${c.o.x.u} daha ${c.o.x.add}.`, rel: { m: 'Terazide 12 sağ kefede: x ile 3,5’in birlikte dengelediği miktar. Hikâyende 12 başlangıç mı, sonuç mu?', mis: 'Bilinmeyenin yerini (başlangıç) gözden kaçırdı' } },
      { id: 'num', s: 'Başlangıç bilinmiyor', t: (c) => `${c.a.gen} ${c.o.x.cont} bir miktar ${c.o.x.mat} vardı. ${c.a.n} 12 ${c.o.x.u} daha ${c.o.x.add}; ${c.o.x.loc} 3,5 ${c.o.x.u} ${c.o.x.mat} oldu.`, nums: { m: 'Terazide 3,5 hangi kefede, 12 hangi kefede? Eklenen miktar hangisi, sonuç hangisi?', mis: 'Değişim ile sonucu karıştırdı' } },
    ],
    qs: [
      { id: 'start', t: (c) => `${c.a.gen} ${c.o.x.cont} başta kaç ${c.o.x.u} ${c.o.x.mat} vardı?`, short: 'Başta ne kadar?', u: (c) => c.o.x.u },
      { id: 'a', t: (c) => `${c.a.gen} ${c.o.x.cont} kaç ${c.o.x.u} ${c.o.x.mat} var?`, short: 'Az olan ne kadar?', u: (c) => c.o.x.u },
      { id: 'left', t: (c) => `Geriye kaç ${c.o.x.u} ${c.o.x.mat} kaldı?`, short: 'Ne kadar kaldı?', u: (c) => c.o.x.u },
      { id: 'end', t: (c) => `Son durumda kaç ${c.o.x.u} ${c.o.x.mat} var?`, short: 'Son durumda ne kadar?' },
      age,
    ],
    hints: ['Terazinin sol kefesinde x ve 3,5 var, sağda 12. Hikâyende hangi miktar bilinmiyor?', 'x + 3,5 = 12 ise 12’den 3,5 çıkarınca ne olur? Bu da bir hikâye olabilir mi?', HINTS[2]],
    pad: { decimal: true },
  }
}

function ebob(): Task {
  const G = [
    obj('gul', '🌹', 'gül', 'gülü', 'gülü', ['kırmızı', 'beyaz'], { grp: 'buket', grpPl: 'buketler', grpLoc: 'bukette' }),
    obj('kalem', '✏️', 'kalem', 'kalemi', 'kalemi', ['kırmızı', 'mavi'], { grp: 'paket', grpPl: 'paketler', grpLoc: 'pakette' }),
    obj('kurabiye', '🍪', 'kurabiye', 'kurabiyesi', 'kurabiyeyi', ['çikolatalı', 'sade'], { grp: 'tabak', grpPl: 'tabaklar', grpLoc: 'tabakta' }),
  ]
  return {
    title: 'Ortak bölen',
    eq: 'EBOB(12, 18) = ?',
    model: () => ({ k: 'vis', v: { kind: 'tape', parts: Array.from({ length: 12 }, () => ({ label: '', value: 1 })), compare: Array.from({ length: 18 }, () => ({ label: '', value: 1 })) } }),
    who: people(),
    what: shuffle(G),
    events: [
      { id: 'grp', s: 'Eş gruplar', t: (c) => `${c.a.n} 12 ${c.o.adj[0]} ve 18 ${c.o.adj[1]} ${c.o.sg} ile birbirinin aynısı olan ${c.o.x.grpPl} hazırlayacak. Hiç ${c.o.sg} artmayacak.`, ok: { max: 6 }, bad: { each: rel('Güzel bir soru, ama bir sonraki adım. Modeldeki “?” en büyük ortak böleni soruyor.') } },
      { id: 'cut', s: 'Eşit parçalara kesme', t: (c) => `${c.a.n} 12 m ve 18 m uzunluğundaki iki kurdeleyi, hiç artmayacak biçimde, hepsi aynı uzunlukta parçalara kesecek.`, ok: { len: 6 } },
      { id: 'ekok', s: 'Ortak kat', t: (c) => `Bir otobüs 12 dakikada bir, diğeri 18 dakikada bir duraktan kalkıyor. ${c.a.n} ikisinin aynı anda kalktığını gördü.`, rel: { m: 'Bu durum ortak bölen mi, ortak kat mı ister? Birlikte kalkmaları için geçen süre 12’nin ve 18’in katı olmalı.', mis: 'EBOB ile EKOK durumlarını karıştırdı' } },
      { id: 'num', s: 'Eş gruplar', t: (c) => `${c.a.n} 12 ${c.o.adj[0]} ve 16 ${c.o.adj[1]} ${c.o.sg} ile birbirinin aynısı olan ${c.o.x.grpPl} hazırlayacak. Hiç ${c.o.sg} artmayacak.`, nums: { m: 'Modeldeki iki şerit kaç birim? Hikâyedeki 16 modelde var mı?', mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'max', t: (c) => `En çok kaç ${c.o.x.grp} hazırlayabilir?`, short: 'En çok kaç grup?', u: (c) => c.o.x.grp },
      { id: 'len', t: () => 'Parçalar en çok kaç metre olabilir?', short: 'En uzun parça?', u: () => 'm' },
      { id: 'each', t: (c) => `Her ${c.o.x.grpLoc} kaç ${c.o.adj[0]} ${c.o.sg} olur?`, short: 'Grupta kaç tane?' },
      { id: 'together', t: () => 'En az kaç dakika sonra yine birlikte kalkarlar?', short: 'Ne zaman birlikte?' },
      age,
    ],
    hints: ['Modelde 12 ve 18 birimlik iki şerit var. İkisini de artmadan eş parçalara bölen en büyük sayı hangisi?', '“En çok kaç grup” ve “en uzun parça” ortak böleni; “en az kaç dakika sonra birlikte” ortak katı sorar.', HINTS[2]],
  }
}

// ───────────────────────── 7. sınıf ─────────────────────────

function integersAdd(): Task {
  const T = [obj('sicaklik', '🌡️', 'sıcaklık', 'sıcaklığı', 'sıcaklığı', ['büyük', 'küçük'], { u: '°C' }, 'sıcaklık (°C)'), obj('yukseklik', '⛰️', 'yükseklik', 'yüksekliği', 'yüksekliği', ['büyük', 'küçük'], { u: 'm' }, 'yükseklik (m)')]
  return {
    title: 'Tam sayılar',
    eq: '−6 + 9 = ?',
    model: () => ({ k: 'vis', v: { kind: 'numberline', min: -8, max: 5, step: 1, points: [-6], hidden: [3], jumps: [-6, 3] } }),
    who: people(),
    what: shuffle(T),
    events: [
      { id: 'up', s: 'Değişim', t: (c) => per(c.o, { sicaklik: `${c.a.n} sabah termometrede −6 °C gördü. Öğlene kadar hava 9 °C ısındı.`, yukseklik: `${c.a.n} deniz seviyesinin 6 m altındaki (−6 m) bir mağara girişindeydi. Oradan 9 m yukarı tırmandı.` }), ok: { end: 3 }, bad: { chg: known() } },
      { id: 'cmp', s: 'Karşılaştırma', t: (c) => per(c.o, { sicaklik: `${c.a.n} Kars’ta yaşıyor; bugün orada hava −6 °C. ${c.b.n} İzmir’de; İzmir, Kars’tan 9 °C daha sıcak.`, yukseklik: `${c.a.n} deniz seviyesinin 6 m altında (−6 m) bekliyor. ${c.b.n} ise ondan 9 m daha yukarıda.` }), ok: { other: 3 } },
      { id: 'down', s: 'Ters yönde değişim', t: (c) => per(c.o, { sicaklik: `${c.a.n} sabah termometrede −6 °C gördü. Akşama kadar hava 9 °C soğudu.`, yukseklik: `${c.a.n} deniz seviyesinin 6 m altındaydı (−6 m). Oradan 9 m daha aşağı indi.` }), rel: { m: 'Sayı doğrusunda ok hangi yöne gidiyor: sağa (artış) mı, sola (azalış) mı?', mis: 'Artış ile azalışı işaretle ilişkilendiremedi' } },
      { id: 'num', s: 'Değişim', t: (c) => per(c.o, { sicaklik: `${c.a.n} sabah termometrede 6 °C gördü. Öğlene kadar hava 9 °C ısındı.`, yukseklik: `${c.a.n} deniz seviyesinin 6 m üstündeydi. Oradan 9 m yukarı tırmandı.` }), nums: { m: 'Modelde başlangıç noktası 0’ın solunda mı, sağında mı? İşaretine dikkat et.', mis: 'Negatif sayıyı pozitif gibi kullandı' } },
    ],
    qs: [
      { id: 'end', t: (c) => per(c.o, { sicaklik: 'Öğlen hava sıcaklığı kaç °C oldu?', yukseklik: 'Şimdi deniz seviyesine göre kaç metrede?' }), short: 'Son değer?', u: (c) => c.o.x.u },
      { id: 'other', t: (c) => per(c.o, { sicaklik: 'İzmir’de hava kaç °C?', yukseklik: `${c.b.n} deniz seviyesine göre kaç metrede?` }), short: 'Öbürünün değeri?', u: (c) => c.o.x.u },
      { id: 'chg', t: (c) => per(c.o, { sicaklik: 'Sıcaklık kaç derece değişti?', yukseklik: 'Kaç metre tırmandı?' }), short: 'Ne kadar değişti?' },
      irr((c) => `${c.a.n} hangi mevsimde ölçüm yaptı?`, 'Hangi mevsim?'),
    ],
    pad: { negative: true },
    hints: ['Sayı doğrusunda başlangıç −6. Ok hangi yöne, kaç birim gidiyor?', 'Sağa gitmek artış (ısınma, yükselme), sola gitmek azalış demek.', HINTS[2]],
  }
}

function proportion(): Task {
  const P = [obj('kiraz', '🍒', 'kiraz', 'kirazı', 'kirazı'), obj('findik', '🌰', 'fındık', 'fındığı', 'fındığı'), obj('peynir', '🧀', 'peynir', 'peyniri', 'peyniri')]
  return {
    title: 'Doğru orantı',
    eq: '3 : 450 = 5 : ?',
    model: () => ({ k: 'dline', top: ['0', '3', '5'], bot: ['0', '450', '?'] }),
    who: people(),
    what: shuffle(P),
    events: [
      { id: 'buy', s: 'Alışveriş', t: (c) => `${c.a.n} 3 kg ${c.o.sg} için 450 TL ödedi. ${c.b.n} aynı yerden 5 kg ${c.o.sg} alacak.`, ok: { pay: 750 }, bad: { unit: rel('Bu iyi bir ara adım, ama modeldeki “?” 5’e karşılık gelen değeri soruyor.') } },
      { id: 'speed', s: 'Sabit hız', t: (c) => `${c.a.gen} ailesi sabit hızla giden bir trenle 3 saatte 450 km yol aldı.`, ok: { km: 750 } },
      { id: 'inv', s: 'Ters orantı', t: (c) => `3 işçi bir duvarı 450 dakikada örüyor. ${c.a.n} aynı duvarı 5 işçiyle ördürecek.`, rel: { m: 'İşçi sayısı artınca süre artar mı, azalır mı? Modelde iki nicelik birlikte mi artıyor?', mis: 'Ters orantılı durumu doğru orantılı gibi modelledi' } },
      { id: 'num', s: 'Alışveriş', t: (c) => `${c.a.n} 3 kg ${c.o.sg} için 540 TL ödedi. ${c.b.n} aynı yerden 5 kg ${c.o.sg} alacak.`, nums: { m: 'Çift sayı doğrusunda 3’ün altında hangi sayı yazıyor?', mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'pay', t: (c) => `${c.b.n} kaç TL ödeyecek?`, short: '5 kg kaç TL?', u: () => 'TL' },
      { id: 'km', t: () => 'Aynı hızla 5 saatte kaç km yol alırlar?', short: '5 saatte kaç km?', u: () => 'km' },
      { id: 'unit', t: (c) => `1 kg ${c.o.sg} kaç TL?`, short: '1 kg kaç TL?' },
      { id: 'workers', t: () => '5 işçi duvarı kaç dakikada örer?', short: '5 işçi kaç dakika?' },
      irr(() => 'Hangi ayda alışveriş yapıldı?', 'Hangi ay?'),
    ],
    hints: ['Çift sayı doğrusunda üstteki ve alttaki sayılar birlikte artıyor. 3 → 450 ise 1 → ?', 'İki nicelik aynı oranda artıyorsa doğru orantılıdır. Hikâyende öyle mi?', HINTS[2]],
  }
}

function equation3x(): Task {
  const B = [obj('defter', '📓', 'defter', 'defteri', 'defteri'), obj('kitap', '📚', 'kitap', 'kitabı', 'kitabı'), obj('top', '⚽', 'top', 'topu', 'topu')]
  return {
    title: 'Denklem (terazi)',
    eq: '3x + 50 = 200',
    model: () => ({ k: 'vis', v: { kind: 'balance', left: ['x', 'x', 'x', '50'], right: ['200'], tilt: 0 } }),
    who: people(),
    what: shuffle(B),
    events: [
      { id: 'shop', s: 'Alışveriş', t: (c) => `${c.a.n} 3 eş ${c.o.sg} ve 50 TL’lik bir çanta aldı; toplam 200 TL ödedi.`, ok: { price: 50 }, bad: { total: known() } },
      { id: 'riddle', s: 'Sayı bilmecesi', t: (c) => `${c.a.n}: “Aklımdan bir sayı tuttum. Onu 3 ile çarpıp 50 ekledim ve 200 buldum.”`, ok: { secret: 50 } },
      { id: 'save', s: 'Biriktirme', t: (c) => `${c.a.gen} 50 TL’si vardı. 3 hafta boyunca her hafta eşit miktarda para biriktirdi ve 200 TL’si oldu.`, ok: { weekly: 50 } },
      { id: 'minus', s: 'İndirimli alışveriş', t: (c) => `${c.a.n} 3 eş ${c.o.sg} aldı; kasada 50 TL indirim yapıldı ve 200 TL ödedi.`, rel: { m: 'Terazinin sol kefesinde 50 ekleniyor mu, çıkarılıyor mu?', mis: 'İşlemin yönünü (ekleme/çıkarma) modelle eşleştirmedi' } },
      { id: 'num', s: 'Alışveriş', t: (c) => `${c.a.n} 50 eş ${c.o.sg} ve 3 TL’lik bir çanta aldı; toplam 200 TL ödedi.`, nums: { m: 'Terazide kaç tane x var? Hangisi x’in katsayısı, hangisi sabit terim?', mis: 'Katsayı ile sabit terimi karıştırdı' } },
    ],
    qs: [
      { id: 'price', t: (c) => `Bir ${c.o.sg} kaç TL?`, short: 'Biri kaç TL?', u: () => 'TL' },
      { id: 'secret', t: () => 'Tutulan sayı kaç?', short: 'Tutulan sayı?' },
      { id: 'weekly', t: () => 'Her hafta kaç TL biriktirdi?', short: 'Haftada kaç TL?', u: () => 'TL' },
      { id: 'total', t: () => 'Toplam kaç TL ödedi?', short: 'Toplam kaç TL?' },
      age,
    ],
    hints: ['Terazide 3 tane x ve 50 var; karşısında 200. Hikâyende neyin 3 tanesi var?', 'Aynı denklem bir alışverişi, bir sayı bilmecesini ya da biriktirmeyi anlatabilir.', HINTS[2]],
  }
}

function rationalTimes(): Task {
  const D = [obj('dalgic', '🤿', 'dalgıç', 'dalgıcı', 'dalgıcı', ['büyük', 'küçük'], { u: 'm' }, 'dalış (m)'), obj('deney', '🧪', 'deney', 'deneyi', 'deneyi', ['büyük', 'küçük'], { u: '°C' }, 'sıcaklık (°C)')]
  return {
    title: 'Rasyonel sayılarla çarpma',
    eq: '4 × (−2,5) = ?',
    model: () => ({ k: 'vis', v: { kind: 'numberline', min: -12, max: 1, step: 1, points: [0], hidden: [-10], jumps: [0, -2.5, -5, -7.5, -10] } }),
    who: people(),
    what: shuffle(D),
    events: [
      { id: 'rep', s: 'Tekrarlı değişim', t: (c) => per(c.o, { dalgic: `${c.a.n} deniz yüzeyinden (0 m) dalışa başladı ve 4 dakika boyunca her dakika 2,5 m aşağı indi.`, deney: `${c.a.n} 0 °C’deki bir sıvıyı soğuttu; sıvı 4 saat boyunca her saat 2,5 °C soğudu.` }), ok: { pos: -10, chg: -10 } },
      { id: 'debt', s: 'Borç', t: (c) => `${c.a.n} 4 arkadaşının her birinden 2,5 TL borç aldı. Borcu negatif sayıyla gösteriyoruz.`, ok: { debt: -10 } },
      { id: 'up', s: 'Ters yönde değişim', t: (c) => per(c.o, { dalgic: `${c.a.n} 10 m derinlikten başlayıp 4 dakika boyunca her dakika 2,5 m yukarı çıktı.`, deney: `${c.a.n} bir sıvıyı ısıttı; sıvı 4 saat boyunca her saat 2,5 °C ısındı.` }), rel: { m: 'Sayı doğrusundaki sıçramalar hangi yöne gidiyor? −2,5 ile çarpmak artış mı, azalış mı?', mis: 'Negatif çarpanın anlamını (azalma) gözden kaçırdı' } },
      { id: 'num', s: 'Tekrarlı değişim', t: (c) => per(c.o, { dalgic: `${c.a.n} deniz yüzeyinden dalışa başladı ve 5 dakika boyunca her dakika 2,5 m aşağı indi.`, deney: `${c.a.n} 0 °C’deki bir sıvıyı 5 saat boyunca her saat 2,5 °C soğuttu.` }), nums: { m: 'Sayı doğrusunda kaç sıçrama var?', mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'pos', t: (c) => per(c.o, { dalgic: '4 dakika sonra kaç metrede (işaretiyle)?', deney: 'Deneyin sonunda sıvının sıcaklığı kaç °C?' }), short: 'Son konum/değer?', u: (c) => c.o.x.u },
      { id: 'chg', t: (c) => per(c.o, { dalgic: 'Konumu toplam kaç metre değişti (işaretiyle)?', deney: 'Sıcaklık toplam kaç derece değişti (işaretiyle)?' }), short: 'Toplam değişim?', u: (c) => c.o.x.u },
      { id: 'debt', t: (c) => `${c.a.gen} borcu kaç TL (negatif sayıyla)?`, short: 'Borç kaç TL?', u: () => 'TL' },
      irr((c) => `${c.a.n} kaç yaşında?`, 'Yaşı kaç?'),
    ],
    pad: { decimal: true, negative: true },
  }
}

function fracDiv(): Task {
  const L = [obj('sut', '🥛', 'süt', 'sütü', 'sütü'), obj('su', '💧', 'su', 'suyu', 'suyu'), obj('meyvesuyu', '🧃', 'meyve suyu', 'meyve suyu', 'meyve suyunu')]
  return {
    title: 'Kesirlerle bölme',
    eq: '[[3/4]] ÷ [[1/8]] = ?',
    model: () => ({ k: 'frac', den: 8, num: 6, whole: '1', part: '3/4' }),
    who: people(),
    what: shuffle(L),
    events: [
      { id: 'cups', s: 'Kaç tane sığar?', t: (c) => `${c.a.n} [[3/4]] L ${c.o.sg} ile [[1/8]] L’lik bardakları doldurdu.`, ok: { cups: 6 } },
      { id: 'cut', s: 'Eşit parçalara kesme', t: (c) => `${c.a.n} [[3/4]] m uzunluğundaki bir kurdeleyi [[1/8]] m’lik parçalara kesti.`, ok: { pieces: 6 } },
      { id: 'of', s: 'Kesir kadarı', t: (c) => `${c.a.n}, [[3/4]] L ${c.o.sg} vardı; ${c.a.n} bunun ${fr(1, 8, true)} içti.`, rel: { m: `Model “[[3/4]]’ün içinde kaç tane [[1/8]] var?” diye soruyor. ${fr(1, 8, true)} içmek bu soru mu?`, mis: 'Bölmeyi “… kadarı” (çarpma) ile karıştırdı' } },
      { id: 'num', s: 'Kaç tane sığar?', t: (c) => `${c.a.n} [[3/8]] L ${c.o.sg} ile [[1/8]] L’lik bardakları doldurdu.`, nums: { m: 'Modelde boyalı kısım bütünün kaçta kaçı? [[3/8]] mi, [[3/4]] mü?', mis: 'Modeldeki kesri hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'cups', t: () => 'Kaç bardak doldu?', short: 'Kaç bardak?', u: () => 'bardak' },
      { id: 'pieces', t: () => 'Kaç parça elde etti?', short: 'Kaç parça?', u: () => 'parça' },
      { id: 'drank', t: (c) => `Kaç L ${c.o.sg} içti?`, short: 'Ne kadar içti?' },
      irr((c) => `${c.a.n} bunu saat kaçta yaptı?`, 'Saat kaçta?'),
    ],
  }
}

// ───────────────────────── 8. sınıf ─────────────────────────

function linearTable(): Task {
  const F = [
    obj('fidan', '🌱', 'fidan', 'fidanı', 'fidanı', ['büyük', 'küçük'], { hx: 'Hafta (x)', hy: 'Boy, cm (y)' }),
    obj('havuz', '🏊', 'havuz', 'havuzu', 'havuzu', ['büyük', 'küçük'], { hx: 'Dakika (x)', hy: 'Su, cm (y)' }),
    obj('kule', '🧱', 'kule', 'kulesi', 'kuleyi', ['büyük', 'küçük'], { hx: 'Adım (x)', hy: 'Blok (y)' }),
  ]
  return {
    title: 'Doğrusal ilişki (tablo)',
    eq: 'y = 2x + 3',
    model: (o) => ({ k: 'vis', v: { kind: 'table', headers: [o ? o.x.hx : 'x', o ? o.x.hy : 'y'], rows: [[0, 3], [1, 5], [2, 7], [3, 9], ['…', '…'], [10, '?']] } }),
    who: people(),
    what: shuffle(F),
    events: [
      { id: 'lin', s: 'Başlangıç ve sabit artış', t: (c) => per(c.o, { fidan: `${c.a.n} 3 cm boyunda bir fidan dikti. Fidan her hafta 2 cm uzuyor.`, havuz: `${c.a.n} havuzu doldurmaya başladığında havuzda 3 cm su vardı. Su her dakika 2 cm yükseliyor.`, kule: `${c.a.n} 3 blokla bir kule kurdu ve her adımda 2 blok ekliyor.` }), ok: { y10: 23 }, bad: { rate: known() } },
      { id: 'pat', s: 'Şekil örüntüsü', t: (c) => `${c.a.n} çubuklarla bir örüntü yapıyor: 1. adımda 5, 2. adımda 7, 3. adımda 9 çubuk var.`, ok: { p10: 23 } },
      { id: 'swap', s: 'Başlangıç ve sabit artış', t: (c) => per(c.o, { fidan: `${c.a.n} 2 cm boyunda bir fidan dikti. Fidan her hafta 3 cm uzuyor.`, havuz: `Havuzda 2 cm su vardı. Su her dakika 3 cm yükseliyor.`, kule: `${c.a.n} 2 blokla bir kule kurdu ve her adımda 3 blok ekliyor.` }), rel: { m: 'Tabloda x = 0 iken y kaç? Her adımda y kaç artıyor? Hangisi başlangıç, hangisi değişim oranı?', mis: 'Değişim oranı ile başlangıç değerini karıştırdı' } },
      { id: 'exp', s: 'Katlanarak artış', t: (c) => per(c.o, { fidan: `${c.a.n} 3 cm boyunda bir fidan dikti. Fidanın boyu her hafta 2 katına çıkıyor.`, havuz: `Havuzda 3 cm su vardı. Su yüksekliği her dakika 2 katına çıkıyor.`, kule: `${c.a.n} 3 blokla bir kule kurdu ve her adımda blok sayısını 2 katına çıkarıyor.` }), rel: { m: 'Tabloda y her adımda 2 katına mı çıkıyor, yoksa 2 mi artıyor? 3, 5, 7, 9…', mis: 'Doğrusal artışı katlanarak artışla karıştırdı' } },
    ],
    qs: [
      { id: 'y10', t: (c) => per(c.o, { fidan: '10 hafta sonra fidanın boyu kaç cm olur?', havuz: '10 dakika sonra suyun yüksekliği kaç cm olur?', kule: '10 adım sonra kulede kaç blok olur?' }), short: 'x = 10 iken y?', u: (c) => per(c.o, { fidan: 'cm', havuz: 'cm', kule: 'blok' }) },
      { id: 'p10', t: () => '10. adımda kaç çubuk olur?', short: '10. adım?', u: () => 'çubuk' },
      { id: 'rate', t: (c) => per(c.o, { fidan: 'Fidan her hafta kaç cm uzuyor?', havuz: 'Su her dakika kaç cm yükseliyor?', kule: 'Her adımda kaç blok ekleniyor?' }), short: 'Değişim oranı?' },
      age,
    ],
    hints: ['Tabloda x = 0 iken y = 3: başlangıç. x her 1 arttığında y kaç artıyor?', 'Örüntüde 1. adım 5 ise 0. adım kaç olurdu?', HINTS[2]],
  }
}

function lineGraph(): Task {
  const D = [
    obj('depo', '🛢️', 'depo', 'deposu', 'depoyu', ['büyük', 'küçük'], { xl: 'dakika', yl: 'L' }),
    obj('mum', '🕯️', 'mum', 'mumu', 'mumu', ['büyük', 'küçük'], { xl: 'saat', yl: 'cm' }),
    obj('harclik', '💰', 'harçlık', 'harçlığı', 'harçlığı', ['büyük', 'küçük'], { xl: 'hafta', yl: 'TL' }),
  ]
  return {
    title: 'Doğrusal ilişki (grafik)',
    eq: '50 − 5x = 0 → x = ?',
    model: (o) => ({ k: 'line', y0: 50, x0: 10, xl: o ? o.x.xl : 'x', yl: o ? o.x.yl : 'y' }),
    who: people(),
    what: shuffle(D),
    events: [
      { id: 'dec', s: 'Sabit azalma', t: (c) => per(c.o, { depo: `${c.a.n} 50 L su olan deponun musluğunu açtı. Depodan her dakika 5 L su akıyor.`, mum: `${c.a.n} 50 cm boyundaki bir mumu yaktı. Mum her saat 5 cm kısalıyor.`, harclik: `${c.a.gen} 50 TL harçlığı var. Her hafta 5 TL harcıyor.` }), ok: { zero: 10 }, bad: { after2: rel('Güzel bir soru, grafikten de okunur. Ama modeldeki “?” grafiğin yatay ekseni kestiği yeri soruyor.') } },
      { id: 'grp', s: 'Gruplama', t: (c) => `${c.a.n} 50 L suyu 5’er litrelik bidonlara doldurdu.`, ok: { bidon: 10 } },
      { id: 'inc', s: 'Sabit artış', t: (c) => per(c.o, { depo: `${c.a.n} 50 L su olan depoya her dakika 5 L su ekliyor.`, mum: `${c.a.n} 50 cm’lik bir mum yaptı ve her saat üzerine 5 cm daha ekledi.`, harclik: `${c.a.gen} 50 TL harçlığı var. Her hafta 5 TL daha biriktiriyor.` }), rel: { m: 'Grafikteki doğru aşağı mı iniyor, yukarı mı çıkıyor?', mis: 'Azalan doğrusal ilişkiyi artan olarak yorumladı' } },
      { id: 'num', s: 'Sabit azalma', t: (c) => per(c.o, { depo: `${c.a.n} 50 L su olan deponun musluğunu açtı. Depodan her dakika 10 L su akıyor.`, mum: `${c.a.n} 50 cm boyundaki bir mumu yaktı. Mum her saat 10 cm kısalıyor.`, harclik: `${c.a.gen} 50 TL harçlığı var. Her hafta 10 TL harcıyor.` }), nums: { m: 'Grafikte doğru her birimde kaç azalıyor? 0’dan 2’ye giderken y ne kadar değişiyor?', mis: 'Grafikten değişim oranını yanlış okudu' } },
    ],
    qs: [
      { id: 'zero', t: (c) => per(c.o, { depo: 'Depo kaç dakikada boşalır?', mum: 'Mum kaç saatte tamamen erir?', harclik: 'Harçlığı kaç haftada biter?' }), short: 'Ne zaman sıfır olur?', u: (c) => c.o.x.xl },
      { id: 'bidon', t: () => 'Kaç bidon doldu?', short: 'Kaç bidon?', u: () => 'bidon' },
      { id: 'after2', t: (c) => per(c.o, { depo: '2 dakika sonra depoda kaç L su kalır?', mum: '2 saat sonra mumun boyu kaç cm olur?', harclik: '2 hafta sonra kaç TL’si kalır?' }), short: '2 birim sonra?' },
      age,
    ],
    hints: ['Grafik 50’den başlıyor ve iniyor. Her birimde ne kadar azalıyor?', 'Doğru yatay ekseni nerede kesiyor? O nokta neyi anlatır?', HINTS[2]],
  }
}

function pythagoras(): Task {
  const C = [obj('merdiven', '🪜', 'merdiven', 'merdiveni', 'merdiveni', ['büyük', 'küçük'], { u: 'm' }), obj('yuruyus', '🥾', 'yürüyüş', 'yürüyüşü', 'yürüyüşü', ['büyük', 'küçük'], { u: 'km' }), obj('ekran', '📺', 'ekran', 'ekranı', 'ekranı', ['büyük', 'küçük'], { u: 'dm' })]
  return {
    title: 'Pisagor bağıntısı',
    eq: '6^{2} + 8^{2} = ?^{2}',
    model: () => ({ k: 'tri', a: '6', b: '8', c: '?' }),
    who: people(),
    what: shuffle(C),
    events: [
      { id: 'right', s: 'Dik üçgen', t: (c) => per(c.o, { merdiven: `${c.a.n} 8 m yüksekliğe ulaşan bir merdiveni duvara dayadı; merdivenin alt ucu duvardan 6 m uzakta.`, yuruyus: `${c.a.n} evinden önce 6 km doğuya, sonra 8 km kuzeye yürüdü.`, ekran: `${c.a.gen} televizyonunun ekranı 8 dm eninde, 6 dm boyunda bir dikdörtgen.` }), ok: { hyp: 10 }, bad: { sum: rel('Toplam yürünen yol, kuş uçuşu uzaklık değildir. Model “?” ile hangi kenarı soruyor?', 'Hipotenüsü dik kenarların toplamı sandı') } },
      { id: 'coord', s: 'Koordinat düzlemi', t: (c) => `${c.a.n} koordinat düzleminde (0, 0) ve (6, 8) noktalarını işaretledi.`, ok: { dist: 10 } },
      { id: 'line', s: 'Aynı doğrultu', t: (c) => `${c.a.n} evinden önce 6 km doğuya, sonra 8 km daha doğuya yürüdü.`, rel: { m: 'Bu yolculukta dik açı oluşuyor mu? Modeldeki üçgenin köşesindeki kareye bak.', mis: 'Dik üçgen oluşmayan durumda Pisagor bağıntısını kullandı' } },
      { id: 'num', s: 'Dik üçgen', t: (c) => `${c.a.n} 10 m’lik bir merdiveni, alt ucu duvardan 6 m uzakta olacak biçimde duvara dayadı.`, nums: { m: 'Modelde “?” hangi kenarda: dik açının karşısında mı? Hikâyende 10 hangi kenar?', mis: 'Hipotenüs ile dik kenarı karıştırdı' } },
    ],
    qs: [
      { id: 'hyp', t: (c) => per(c.o, { merdiven: 'Merdiven kaç m uzunluğunda?', yuruyus: 'Evine kuş uçuşu kaç km uzakta?', ekran: 'Ekranın köşegeni kaç dm?' }), short: 'En uzun kenar?', u: (c) => c.o.x.u },
      { id: 'dist', t: () => 'İki nokta arasındaki uzaklık kaç birim?', short: 'İki nokta arası?', u: () => 'birim' },
      { id: 'sum', t: () => 'Toplam kaç km yürüdü?', short: 'Toplam yol?', only: ['yuruyus'] },
      age,
    ],
    hints: ['Modeldeki üçgenin dik açısı nerede? “?” dik açının karşısındaki kenar mı?', 'Dik kenarlar 6 ve 8. Hikâyende bu iki uzunluk dik açıyla birleşiyor mu?', HINTS[2]],
  }
}

function powers(): Task {
  const S = [obj('karo', '🟧', 'karo', 'karosu', 'karoyu'), obj('pano', '📌', 'pano', 'panosu', 'panoyu'), obj('kagit', '📄', 'kâğıt', 'kâğıdı', 'kâğıdı')]
  return {
    title: 'Üslü ifadeler',
    eq: '2^{3} × 2^{3} = ?',
    model: () => ({ k: 'square', side: '2^{3} cm', inside: 'Alan = ?' }),
    who: people(),
    what: shuffle(S),
    events: [
      { id: 'sq', s: 'Karenin alanı', t: (c) => `${c.a.n} bir kenarı 2^{3} cm olan kare biçiminde bir ${c.o.sg} kesti.`, ok: { area: 64 }, bad: { per: rel('Çevre kenarları toplar: 4 × 2^{3}. Model iki kenarı çarpıyor.', 'Alan ile çevreyi karıştırdı') } },
      { id: 'bact', s: 'Katlanarak artma', t: (c) => `Bir bakteri her saat 2 katına çıkıyor. ${c.a.n} 3 saat sonunda 2^{3} bakteri saydı; bakteriler 3 saat daha her saat 2 katına çıktı.`, ok: { bact: 64 } },
      { id: 'board', s: 'Dizi', t: (c) => `${c.a.n} 2^{3} sıra ve her sırada 2^{3} kare olan bir satranç tahtasına baktı.`, ok: { squares: 64 } },
      { id: 'sum', s: 'Toplama', t: (c) => `${c.a.gen} kabında 2^{3} bakteri vardı; kaba 2^{3} bakteri daha eklendi.`, rel: { m: 'Modelde 2^{3} ile 2^{3} çarpılıyor mu, toplanıyor mu?', mis: 'Üslü ifadelerde çarpma ile toplamayı karıştırdı' } },
      { id: 'num', s: 'Karenin alanı', t: (c) => `${c.a.n} bir kenarı 2^{6} cm olan kare biçiminde bir ${c.o.sg} kesti.`, nums: { m: 'Modeldeki karenin bir kenarı kaç cm?', mis: 'Modeldeki sayıları hikâyeye doğru aktarmadı' } },
    ],
    qs: [
      { id: 'area', t: (c) => `${cap(c.o.sg)} alanı kaç cm²?`, short: 'Alanı kaç?', u: () => 'cm²' },
      { id: 'bact', t: () => 'Sonunda kaç bakteri oldu?', short: 'Kaç bakteri?', u: () => 'bakteri' },
      { id: 'squares', t: () => 'Tahtada kaç küçük kare var?', short: 'Kaç kare?', u: () => 'kare' },
      { id: 'per', t: () => 'Çevresi kaç cm?', short: 'Çevresi kaç?' },
      age,
    ],
  }
}

function sqrtPerim(): Task {
  return {
    title: 'Kareköklü ifadeler',
    eq: '4 × √{49} = ?',
    model: (o) => ({ k: 'square', side: '?', inside: `Alan = 49 ${o?.x.u ?? 'birim'}²` }),
    who: people(),
    what: shuffle(PLACES),
    events: [
      { id: 'fence', s: 'Kenarları sarma', t: (c) => `${c.a.gen} kare biçimindeki ${c.o.poss} 49 ${c.o.x.u}²’lik bir alan kaplıyor. ${c.a.n} dört kenarı boyunca ${c.o.x.fence} ${c.o.x.verb}.`, ok: { fence: 28 }, bad: { side: rel('Bir kenarı bulmak güzel bir ara adım; ama modeldeki “?” 4 × √{49}, yani dört kenarın hepsi.'), area: known() } },
      { id: 'tiles', s: 'Birim kareler', t: (c) => `${c.a.n} her biri 1 ${c.o.x.u}² olan 49 eş kare karoyla kare biçiminde bir zemin döşedi.`, ok: { edge: 28 }, bad: { side: rel('Bir kenarı bulmak güzel bir ara adım; ama modeldeki “?” 4 × √{49}, yani dört kenarın hepsi.') } },
      { id: 'num', s: 'Kenarları sarma', t: (c) => `${c.a.gen} kare biçimindeki ${c.o.poss} bir kenarı 49 ${c.o.x.u}. ${c.a.n} dört kenarı boyunca ${c.o.x.fence} ${c.o.x.verb}.`, nums: { m: 'Modelde 49 kenar uzunluğu mu, alan mı?', mis: 'Alan ile kenar uzunluğunu karıştırdı' } },
      { id: 'div', s: 'Bölme', t: (c) => `${c.a.n} 49 ${c.o.x.u} uzunluğundaki bir teli 4 eşit parçaya böldü.`, rel: { m: 'Model 49’u 4’e mi bölüyor, yoksa √{49}’u 4 ile mi çarpıyor?', mis: 'Karekök ile bölmeyi karıştırdı' } },
    ],
    qs: [
      { id: 'fence', t: (c) => `Kaç ${c.o.x.u} ${c.o.x.fence} gerekir?`, short: 'Kenarlara ne kadar?', u: (c) => c.o.x.u },
      { id: 'edge', t: (c) => `Zeminin çevresi kaç ${c.o.x.u}?`, short: 'Çevresi kaç?', u: (c) => c.o.x.u },
      { id: 'side', t: (c) => `Bir kenarı kaç ${c.o.x.u}?`, short: 'Bir kenarı?' },
      { id: 'area', t: (c) => `Alanı kaç ${c.o.x.u}²?`, short: 'Alanı?' },
      age,
    ],
  }
}

// ───────────────────────── sınıflara göre oturum ─────────────────────────

const KIRTASIYE: Shop[] = [
  { id: 'kirtasiye', label: 'kırtasiye', emoji: '✏️', from: 'kırtasiyeden', i1: 'defter', i2: 'kalem' },
  { id: 'pastane', label: 'pastane', emoji: '🥐', from: 'pastaneden', i1: 'pasta dilimi', i2: 'simit' },
  { id: 'kafe', label: 'kafe', emoji: '☕', from: 'kafeden', i1: 'tost', i2: 'ayran' },
]
const BILET: Shop[] = [
  { id: 'sinema', label: 'sinema', emoji: '🎬', from: 'sinemadan', i1: 'yetişkin bileti', i2: 'çocuk bileti' },
  { id: 'muze', label: 'müze', emoji: '🏛️', from: 'müzeden', i1: 'yetişkin bileti', i2: 'öğrenci bileti' },
  { id: 'tiyatro', label: 'tiyatro', emoji: '🎭', from: 'tiyatro gişesinden', i1: 'yetişkin bileti', i2: 'çocuk bileti' },
]

export function tasksFor(grade: Grade): Task[] {
  switch (grade) {
    case 1:
    case 2:
      return [joinResult(9, 6, true), separateResult(14, 5, true), changeUnknown(8, 15), equalGroups(4, 3, 'pic'), separateResult(52, 18, false)]
    case 3:
      return [changeUnknown(175, 240), equalGroups(6, 4, 'array'), sharing(24, 4), twoStep(3, 8, 5), perimeter(7, 3)]
    case 4:
      return [barsCompare(30, 60), multCompare(15, 4), shopTwoStep(3, 45, 2, 18, KIRTASIYE, 'İki adımlı tablo'), multInverse(4, 60), sharing(156, 6)]
    case 5:
      return [fractionOf(24, 3, 4), area(8, 5), fractionWhole(12, 2, 5), perimeterInverse(26, 8), shopTwoStep(2, 120, 3, 75, BILET, 'Bilet tablosu')]
    case 6:
      return [percent(), decimalTimes(), ratioTable(), equationAdd(), ebob()]
    case 7:
      return [integersAdd(), proportion(), equation3x(), rationalTimes(), fracDiv()]
    default:
      return [linearTable(), lineGraph(), pythagoras(), powers(), sqrtPerim()]
  }
}

export const DEFAULT_HINTS = HINTS
export { dec }
