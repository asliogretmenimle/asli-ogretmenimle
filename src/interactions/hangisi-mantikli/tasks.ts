import type { Grade } from '../../data/types'
import { ek } from '../../lib/generators'
import { pick, randInt, shuffle, tr } from '../hizli-noktalar/kit'

/**
 * Görev verisi. Her görevde bir doğru (makul) aday ve gerçek kavram yanılgılarından türeyen çeldiriciler vardır.
 * Çeldiricinin `q` sorusu Nudge olarak gösterilir, `misc` öğretmen raporuna yazılır.
 */

export interface Cand {
  who: string
  emoji: string
  color: string
  v: number
  /** Kartta (MathText) */
  text: string
  /** Sayı doğrusundaki bayrakta (düz yazı) */
  short: string
  ok?: boolean
  q?: string
  misc?: string
}

export interface MTask {
  title: string
  prompt: string
  /** Büyük gösterim (MathText) */
  expr: string
  exact: number
  exactText: string
  view: [number, number]
  cands: Cand[]
  reasons: string[]
  hints: string[]
  /** Açıklama: referans → gerçek */
  bench: string
  unit?: string
  context?: boolean
}

const PEOPLE = [
  { who: 'Ali', emoji: '🧒', color: '#f97316' },
  { who: 'Ece', emoji: '👧', color: '#3b82f6' },
  { who: 'Can', emoji: '👦', color: '#a855f7' },
  { who: 'Deniz', emoji: '🧑', color: '#0d9488' },
]

type Raw = { v: number; text?: string; short?: string; ok?: boolean; q?: string; misc?: string }

/** Adayları karıştırıp kişilere dağıtır; aynı değerli çeldiricileri atar */
function people(raw: Raw[], unit = ''): Cand[] {
  const seen = new Set<number>()
  const uniq = raw.filter((r) => (seen.has(r.v) ? false : (seen.add(r.v), true)))
  const ppl = shuffle(PEOPLE)
  return shuffle(uniq).map((r, i) => ({ ...ppl[i], v: r.v, text: r.text ?? `${tr(r.v)}${unit ? ' ' + unit : ''}`, short: r.short ?? `${tr(r.v)}`, ok: r.ok, q: r.q, misc: r.misc }))
}

const view = (vals: number[], padFrac = 0.08): [number, number] => {
  const lo = Math.min(0, ...vals), hi = Math.max(...vals)
  const span = hi - lo || 1
  return [lo - span * padFrac, hi + span * padFrac]
}

const r10 = (n: number) => Math.round(n / 10) * 10
const r100 = (n: number) => Math.round(n / 100) * 100

// ───────────────────────── 2–4. sınıf üreteçleri ─────────────────────────

function addTask(digits: 2 | 3 | 4, title: string, context?: string): MTask {
  let a = 0, b = 0
  for (let i = 0; i < 200; i++) {
    if (digits === 2) {
      a = randInt(2, 5) * 10 + randInt(5, 9)
      b = randInt(2, 4) * 10 + randInt(5, 9)
      if (a + b < 100) break
    } else if (digits === 3) {
      a = randInt(2, 4) * 100 + randInt(5, 9) * 10 + randInt(5, 9)
      b = randInt(1, 3) * 100 + randInt(4, 9) * 10 + randInt(5, 9)
      if (a + b < 1000) break
    } else {
      a = randInt(1, 4) * 1000 + randInt(4, 9) * 100 + randInt(5, 9) * 10 + randInt(2, 9)
      b = randInt(1, 3) * 1000 + randInt(3, 9) * 100 + randInt(3, 9) * 10 + randInt(5, 9)
      if (a + b < 10000) break
    }
  }
  const exact = a + b
  const da = String(a).split('').map(Number), db = String(b).split('').map(Number)
  const concat = Number(da.map((d, i) => d + db[i]).join(''))
  const noCarry = Number(da.map((d, i) => (d + db[i]) % 10).join(''))
  const R = digits === 4 ? r100 : r10
  const ra = R(a), rb = R(b)
  const raw: Raw[] = [
    { v: exact, ok: true },
    { v: concat, q: `${ek(a, 'dat')} ${b} eklenince sonuç bu kadar büyüyebilir mi? ${tr(ra)} + ${tr(rb)} kaç eder? Her basamağın toplamını yan yana yazınca ne oluyor?`, misc: 'Basamak toplamlarını yan yana yazdı (eldeyi basamağa katmadı)' },
    { v: Math.abs(a - b), q: `İki sayıyı birleştirince sonuç, sayıların ikisinden de küçük olabilir mi? Bu hangi işlemin sonucu olabilir?`, misc: 'Toplama yerine çıkarma yaptı' },
    { v: noCarry, q: `${tr(a)} neredeyse ${tr(ra)}, ${tr(b)} neredeyse ${tr(rb)}. Toplam ${tr(ra + rb)}’ye yakın olmalı. ${tr(noCarry)} çok mu uzak? Eldeye ne oldu?`, misc: 'Eldeyi unuttu' },
  ]
  // 3+ basamakta basamak toplamlarını yan yana yazmak çok büyük (ör. 51.213) ve öğretici değil: çıkar
  if (digits >= 3) raw.splice(1, 1)
  if (digits >= 3) raw.push({ v: a + Math.floor(b / 10), q: `${tr(b)} sayısının basamakları ${tr(a)} ile hizalı mı? Birler birlerin, onlar onların altında olmalı. ${tr(ra)} + ${tr(rb)} yaklaşık kaç?`, misc: 'Basamakları hizalamadan topladı' })
  const cands = people(shuffle(raw.slice(1)).slice(0, 3).concat(raw[0]))
  return {
    title,
    prompt: context ?? `Dört arkadaş ${tr(a)} + ${tr(b)} işlemini yaptı. Hesaplamadan önce tahmin et: sonuç sayı doğrusunda nerede olur?`,
    expr: `${tr(a)} + ${tr(b)}`,
    exact,
    exactText: tr(exact),
    view: view(cands.map((c) => c.v)),
    cands,
    reasons: [`${tr(ra)} + ${tr(rb)} = ${tr(ra + rb)}; sonuç buna yakın`, 'Önce büyük basamakları topladım', `Toplam, ${tr(Math.max(a, b))}’den büyük ama çok uzak değil`, 'Sadece tahmin ettim'],
    hints: [`${tr(a)} sayısına en yakın “kolay” sayı hangisi? ${tr(b)} için?`, `${tr(ra)} + ${tr(rb)} kaç eder? Hangi aday buna yakın?`],
    bench: `${tr(ra)} + ${tr(rb)} = ${tr(ra + rb)} → gerçek sonuç ${tr(exact)}`,
  }
}

function subTask(digits: 2 | 3 | 4, title: string): MTask {
  let a = 0, b = 0
  if (digits === 2) {
    a = randInt(6, 9) * 10 + randInt(0, 4)
    b = randInt(1, 4) * 10 + randInt(5, 9)
  } else if (digits === 3) {
    a = randInt(5, 9) * 100 + randInt(0, 2) * 10 + randInt(0, 3)
    b = randInt(1, 4) * 100 + randInt(4, 9) * 10 + randInt(5, 9)
  } else {
    a = randInt(5, 8) * 1000 + randInt(0, 1) * 10 + randInt(0, 3)
    b = randInt(1, 3) * 1000 + randInt(4, 9) * 100 + randInt(4, 9) * 10 + randInt(5, 9)
  }
  const exact = a - b
  const sa = String(a), sb = String(b).padStart(sa.length, '0')
  const smallBig = Number(sa.split('').map((d, i) => Math.abs(Number(d) - Number(sb[i]))).join(''))
  const R = digits === 4 ? r100 : r10
  const ra = R(a), rb = R(b)
  const raw: Raw[] = [
    { v: exact, ok: true },
    { v: smallBig, q: `${tr(ra)} − ${tr(rb)} yaklaşık kaç? ${tr(smallBig)} buna yakın mı? Birler basamağında ${sa[sa.length - 1]}’ten ${sb[sb.length - 1]}’i çıkarabilir misin?`, misc: 'Her basamakta küçük rakamı büyükten çıkardı' },
    { v: a + b, q: `${ek(a, 'abl')} bir şey çıkarınca sonuç ${ek(a, 'abl')} büyük olabilir mi?`, misc: 'Çıkarma yerine toplama yaptı' },
  ]
  if (digits >= 3) raw.push({ v: a - b - (digits === 3 ? 100 : 1000), q: `Onluk bozarken komşu basamaktan iki kez mi aldın? ${tr(ra)} − ${tr(rb)} kaç eder?`, misc: 'Onluk/yüzlük bozarken basamak değerini iki kez azalttı' })
  const cands = people(raw)
  return {
    title,
    prompt: `${tr(a)} − ${tr(b)} işlemine dört farklı cevap geldi. Önce kendi tahminini sayı doğrusuna koy.`,
    expr: `${tr(a)} − ${tr(b)}`,
    exact,
    exactText: tr(exact),
    view: view(cands.map((c) => c.v)),
    cands,
    reasons: [`${tr(ra)} − ${tr(rb)} = ${tr(ra - rb)}; sonuç buna yakın`, `${tr(b)} ile ${tr(a)} arasını ileri sayarak düşündüm`, `Sonuç ${ek(a, 'abl')} küçük olmalı`, 'Sadece tahmin ettim'],
    hints: [`${tr(a)} ve ${tr(b)} sayılarını kolay sayılara yuvarla.`, `${tr(ra)} − ${tr(rb)} kaç eder?`],
    bench: `${tr(ra)} − ${tr(rb)} = ${tr(ra - rb)} → gerçek sonuç ${tr(exact)}`,
  }
}

function mulTask(kind: '2x1' | '2x2' | '3x2', title: string, ctx?: (a: number, b: number) => string): MTask {
  let a = 0, b = 0
  if (kind === '2x1') {
    a = randInt(2, 4) * 10 + randInt(3, 8)
    b = randInt(4, 8)
  } else if (kind === '2x2') {
    a = randInt(3, 6) * 10 + pick([8, 9, 1, 2])
    b = pick([19, 21, 29, 31, 18, 22])
  } else {
    a = randInt(21, 38)
    b = pick([197, 198, 199, 201, 202, 203])
  }
  const exact = a * b
  const raw: Raw[] = [{ v: exact, ok: true }]
  let bench = ''
  if (kind === '2x1') {
    const t = Math.floor(a / 10) * 10, o = a % 10
    raw.push({ v: t * b + o, q: `${a} içinde ${t} ve ${o} var. ${b} tane ${ek(o, 'acc')} de çarptın mı? ${r10(a)} × ${b} yaklaşık kaç?`, misc: 'Yalnız onlukları çarptı, birlikleri çarpmayı unuttu' })
    raw.push({ v: Number(`${(t / 10) * b}${o * b}`), q: `${r10(a)} × ${b} kaç eder? Bu aday ondan çok mu büyük? Kısmi çarpımları yan yana yazmak doğru mu?`, misc: 'Kısmi çarpımları toplamadan yan yana yazdı' })
    raw.push({ v: a + b, q: `${b} tane ${a} kaç eder? Bu sonuç ${a} + ${b} olabilir mi?`, misc: 'Çarpma yerine toplama yaptı' })
    bench = `${r10(a)} × ${b} = ${r10(a) * b} → gerçek sonuç ${exact}`
  } else {
    const bt = Math.floor(b / 10), bo = b % 10
    const ra = kind === '3x2' ? Math.round(a / 10) * 10 : r10(a), rb = kind === '3x2' ? r100(b) : r10(b)
    raw.push({ v: a * bo + a * bt, q: `${b} içindeki ${bt} aslında ${bt * 10}. ${tr(a)} × ${bt * 10} kaç eder? ${tr(ra)} × ${tr(rb)} yaklaşık kaç?`, misc: 'İkinci kısmi çarpımı bir basamak kaydırmadı (onlar basamağını birlik gibi çarptı)' })
    raw.push({ v: exact * 10, q: `${tr(ra)} × ${tr(rb)} = ${tr(ra * rb)}. Bu aday ondan kaç kat büyük?`, misc: 'Sonucu 10 kat büyük yazdı' })
    raw.push({ v: a + b, q: `${tr(a)} tane ${tr(b)} kaç eder? Bu sonuç bir toplama olabilir mi?`, misc: 'Çarpma yerine toplama yaptı' })
    bench = `${tr(ra)} × ${tr(rb)} = ${tr(ra * rb)} → gerçek sonuç ${tr(exact)}`
  }
  const cands = people(raw)
  const ra = r10(a)
  return {
    title,
    prompt: ctx ? ctx(a, b) : `${tr(a)} × ${tr(b)} işlemine gelen cevaplardan hangisi mantıklı? Önce kendi tahminini sayı doğrusuna koy.`,
    expr: `${tr(a)} × ${tr(b)}`,
    exact,
    exactText: tr(exact),
    view: view(cands.map((c) => c.v)),
    cands,
    reasons: [bench.split(' →')[0] + '; sonuç buna yakın', 'Basamak sayısına baktım', `${tr(a)} sayısı ${tr(ra)}’dan ${a < ra ? 'küçük' : 'büyük'}, sonuç da biraz ${a < ra ? 'az' : 'fazla'}`, 'Sadece tahmin ettim'],
    hints: ['Çarpanları kolay sayılara yuvarla.', bench.split(' →')[0].replace(/=.*/, '') + 'kaç eder?'],
    bench,
  }
}

function divTask(title: string, big?: boolean): MTask {
  const d = big ? pick([12, 24, 15]) : randInt(3, 8)
  const q = big ? pick([302, 203, 405]) : pick([203, 305, 408, 106, 207])
  const n = d * q
  const zeroLost = Number(String(q).replace('0', ''))
  const nb = Math.round(n / (d * 100)) * d * 100
  const raw: Raw[] = [
    { v: q, ok: true },
    { v: zeroLost, q: `${zeroLost} × ${d} kaç eder? ${tr(n)} sayısına ulaşır mı? Bölümde bir basamak eksik olabilir mi?`, misc: 'Bölümde 0’ı yazmayı unuttu' },
    { v: q * 10, q: `${tr(q * 10)} × ${d} kaç eder? ${tr(n)} ile karşılaştır.`, misc: 'Bölümü 10 kat büyük buldu' },
  ]
  if (!big) raw.push({ v: n - d, q: `${ek(n, 'acc')} ${ek(d, 'dat')} bölünce sonuç bu kadar büyük kalır mı? Bu hangi işlemin sonucu?`, misc: 'Bölme yerine çıkarma yaptı' })
  const cands = people(raw)
  return {
    title,
    prompt: `${tr(n)} ÷ ${d} işlemine gelen cevaplardan hangisi mantıklı? Önce tahmin et.`,
    expr: `${tr(n)} ÷ ${d}`,
    exact: q,
    exactText: tr(q),
    view: view(cands.map((c) => c.v)),
    cands,
    reasons: [`${tr(nb)} ÷ ${d} = ${tr(nb / d)}; sonuç buna yakın`, `Sonucu ${ek(d, 'acc')} çarpıp kontrol ettim`, 'Bölümün basamak sayısını düşündüm', 'Sadece tahmin ettim'],
    hints: [`${tr(n)} sayısına yakın, ${ek(d, 'dat')} kolay bölünen bir sayı bul.`, `${tr(nb)} ÷ ${d} kaç eder?`],
    bench: `${tr(nb)} ÷ ${d} = ${tr(nb / d)} → gerçek sonuç ${tr(q)}`,
  }
}

/** Bağlam: ölçünün makul olup olmadığı */
function ctxTask(o: { title: string; prompt: string; unit: string; ok: number; wrong: { v: number; q: string; misc: string }[]; reasons: string[]; bench: string; hint: string }): MTask {
  const cands = people([{ v: o.ok, ok: true }, ...o.wrong], o.unit)
  return {
    title: o.title,
    prompt: o.prompt,
    expr: o.title,
    exact: o.ok,
    exactText: `${tr(o.ok)} ${o.unit}`,
    view: view(cands.map((c) => c.v)),
    cands,
    reasons: o.reasons,
    hints: [o.hint],
    bench: o.bench,
    unit: o.unit,
    context: true,
  }
}

/** Elle yazılmış görev */
function hand(o: Omit<MTask, 'cands' | 'view'> & { raw: Raw[]; view?: [number, number] }): MTask {
  const cands = people(o.raw, o.unit)
  return { ...o, cands, view: o.view ?? view(cands.map((c) => c.v)) }
}

export function makeTasks(grade: Grade): MTask[] {
  if (grade <= 2)
    return [
      addTask(2, 'İki basamaklı toplama'),
      subTask(2, 'Çıkarmada tahmin'),
      ctxTask({ title: 'Kalemin boyu', prompt: 'Yeni bir kurşun kalemin boyu kaç santimetre olabilir? Önce kendi tahminini koy.', unit: 'cm', ok: 18, wrong: [{ v: 150, q: '150 cm senin boyuna yakın! Bir kalem senin kadar uzun olabilir mi?', misc: 'Uzunluk birimlerinin büyüklüğünü kestiremedi' }, { v: 2, q: '2 cm yaklaşık bir parmağının genişliği kadar. Kalem bu kadar kısa mı?', misc: 'Uzunluk birimlerinin büyüklüğünü kestiremedi' }], reasons: ['Bir karışım yaklaşık 15 cm', 'Cetvelim 30 cm, kalem ondan kısa', '1 metre 100 cm; kalem 1 metreden çok kısa'], bench: 'Yeni bir kurşun kalem yaklaşık 18–19 cm’dir: bir karıştan biraz uzun.', hint: 'Cetvelin 30 cm. Kalem cetvelden uzun mu, kısa mı?' }),
      addTask(2, 'Yüze yakın mı?'),
      subTask(2, 'Geriye doğru'),
    ]
  if (grade === 3)
    return [
      addTask(3, 'Üç basamaklı toplama'),
      subTask(3, 'Sıfırlı çıkarma'),
      mulTask('2x1', 'Çarpmada tahmin'),
      ctxTask({ title: 'Kapının yüksekliği', prompt: 'Sınıfının kapısı kaç santimetre yüksekliğinde olabilir?', unit: 'cm', ok: 210, wrong: [{ v: 21, q: '21 cm bir cetvelden bile kısa! Kapıdan nasıl geçerdik?', misc: 'Uzunluk birimlerinin büyüklüğünü kestiremedi' }, { v: 2100, q: '2.100 cm = 21 metre. Bu, 7 katlı bir bina kadar! Kapı bu kadar yüksek mi?', misc: 'Metre ile santimetre ilişkisini karıştırdı' }], reasons: ['Kapı benim boyumdan (yaklaşık 130 cm) daha yüksek', '1 metre 100 cm; kapı 2 metre kadar', 'Öğretmenim kapıdan rahat geçiyor'], bench: 'Bir kapı yaklaşık 2 metre, yani 200–210 cm yüksekliğindedir.', hint: 'Senin boyun yaklaşık kaç cm? Kapı senden ne kadar uzun?' }),
      mulTask('2x1', 'Kutulardaki kalemler', (a, b) => `Bir kutuda ${a} kalem var. ${b} kutuda kaç kalem olur? Dört arkadaşın cevabından hangisi mantıklı?`),
    ]
  if (grade === 4)
    return [
      addTask(4, 'Dört basamaklı toplama'),
      mulTask('2x2', 'İki basamaklı çarpma'),
      divTask('Bölümde sıfır'),
      ctxTask({ title: 'Bir öğrencinin boyu', prompt: '4. sınıftaki bir öğrencinin boyu kaç santimetre olabilir?', unit: 'cm', ok: 140, wrong: [{ v: 14, q: '14 cm yaklaşık bir karış. Bir öğrenci bu kadar kısa olabilir mi?', misc: 'Uzunluk birimlerinin büyüklüğünü kestiremedi' }, { v: 1400, q: '1.400 cm = 14 metre! Bu bir ağaç kadar. Öğrenci bu kadar uzun olabilir mi?', misc: 'Metre ile santimetre dönüşümünü karıştırdı' }], reasons: ['Boyum 1 metreden biraz fazla: 100 cm’den fazla', 'Kapıdan (yaklaşık 200 cm) kısayım', 'Sınıfta ölçtük, 130–150 cm arası'], bench: '4. sınıf öğrencileri genellikle 130–150 cm boyundadır: 1 metre 40 cm kadar.', hint: '1 metre kaç cm? Sen 1 metreden uzun musun?' }),
      subTask(4, 'Sıfırlı büyük çıkarma'),
    ]
  if (grade === 5) {
    const [n1, d1] = pick([[11, 12], [9, 10], [13, 14]] as const)
    const [n2, d2] = pick([[7, 3], [9, 4], [11, 5]] as const)
    return [
      mulTask('3x2', 'Büyük çarpım'),
      hand({ title: 'Kesir nerede?', prompt: `[[${n1}/${d1}]] sayı doğrusunda nerede olur? Arkadaşların farklı düşündü.`, expr: `[[${n1}/${d1}]]`, exact: n1 / d1, exactText: `[[${n1}/${d1}]] ≈ ${tr(n1 / d1, 2)}`, raw: [{ v: n1 / d1, text: '1’e çok yakın', short: '1’e yakın', ok: true }, { v: n1, text: `${n1}’e yakın`, short: `${n1} civarı`, q: `[[${n1}/${d1}]], ${d1} eş parçadan ${n1} tanesi. Bütünün tamamı bile değil! ${n1} kadar büyük olabilir mi?`, misc: 'Kesrin değerini pay kadar sandı' }, { v: 0.5, text: '[[1/2]] civarı', short: '½ civarı', q: `[[1/2]], parçaların yarısı demek. ${d1} parçanın yarısı kaç? ${n1} ondan çok mu fazla?`, misc: 'Payı paydanın yarısıyla karşılaştırmadı' }], reasons: [`[[${n1}/${d1}]] bir bütünden yalnızca [[1/${d1}]] eksik`, `Pay, paydaya çok yakın`, `[[1/2]]’den büyük, 1’den küçük`], hints: [`Bir bütün kaç tane [[1/${d1}]] eder? [[${n1}/${d1}]] bütüne ne kadar yakın?`], bench: `1 bütün = [[${d1}/${d1}]]; [[${n1}/${d1}]] ondan yalnızca [[1/${d1}]] eksik.`, view: [-0.5, n1 + 1] }),
      hand({ title: 'Bileşik kesir', prompt: `[[${n2}/${d2}]] hangi sayıya yakın? Önce tahminini sayı doğrusuna koy.`, expr: `[[${n2}/${d2}]]`, exact: n2 / d2, exactText: `[[${n2}/${d2}]] ≈ ${tr(n2 / d2, 2)}`, raw: [{ v: n2 / d2, text: `${Math.floor(n2 / d2)}’den biraz fazla`, short: `${Math.floor(n2 / d2)}’den biraz fazla`, ok: true }, { v: n2, text: `${n2}’ye yakın`, short: `${n2} civarı`, q: `[[${n2}/${d2}]] kaç tane bütün eder? ${d2} parça bir bütün yapıyorsa ${n2} parça kaç bütün yapar?`, misc: 'Kesrin değerini pay kadar sandı' }, { v: d2 / n2 / 1.5, text: '[[1/2]]’den küçük', short: '½’den küçük', q: `Pay paydadan büyük olunca kesir 1’den küçük olabilir mi? [[${d2}/${d2}]] kaç eder?`, misc: 'Her kesrin 1’den küçük olduğunu düşündü' }], reasons: [`[[${Math.floor(n2 / d2) * d2}/${d2}]] = ${Math.floor(n2 / d2)}; [[${n2}/${d2}]] biraz daha fazla`, 'Pay, paydadan büyük: 1’den büyük', `${d2} parça bir bütün yapıyor, ${n2} parçayı gruplara ayırdım`], hints: [`[[${d2}/${d2}]] = 1. [[${n2}/${d2}]] içinde kaç bütün var?`], bench: `[[${n2}/${d2}]] = ${Math.floor(n2 / d2)} tam [[${n2 % d2}/${d2}]] ≈ ${tr(n2 / d2, 2)}`, view: [-0.5, n2 + 1] }),
      divTask('Bölümde sıfır', true),
      ctxTask({ title: 'Türkiye’nin nüfusu', prompt: 'Türkiye’nin nüfusu yaklaşık kaç milyon kişidir? Sayı doğrusunda birim “milyon”.', unit: 'milyon', ok: 85, wrong: [{ v: 0.85, q: '0,85 milyon = 850 bin. Bu, büyük bir ilçenin nüfusu kadar. Bütün ülke bu kadar olabilir mi?', misc: 'Büyük sayıların basamaklarını karıştırdı' }, { v: 8500, q: '8.500 milyon = 8,5 milyar. Bu, dünyanın tüm nüfusundan bile fazla! Mümkün mü?', misc: 'Büyük sayıların basamaklarını karıştırdı' }], reasons: ['İstanbul’da yaklaşık 15 milyon kişi yaşıyor; ülke birkaç katı', 'Dünya nüfusu 8 milyar; Türkiye onun küçük bir parçası', 'Haberlerde duydum'], bench: 'Türkiye’nin nüfusu yaklaşık 85 milyondur (85.000.000).', hint: 'İstanbul’un nüfusu yaklaşık 15 milyon. Ülkenin nüfusu bundan kaç kat fazla olabilir?' }),
    ]
  }
  if (grade === 6) {
    const [a, b] = pick([[4.9, 3.1], [5.1, 2.9], [7.8, 2.1]] as const)
    const [n, dv] = pick([[12, 0.5], [18, 0.5], [9, 0.25]] as const)
    const [base, pc] = pick([[240, 25], [360, 25], [80, 75]] as const)
    const ex = Math.round(a * b * 100) / 100
    const ra = Math.round(a), rb = Math.round(b)
    return [
      hand({ title: 'Ondalık çarpma', prompt: `${tr(a)} × ${tr(b)} işlemine dört cevap geldi. Virgülün yerini tahminle bulabilir misin?`, expr: `${tr(a)} × ${tr(b)}`, exact: ex, exactText: tr(ex), raw: [{ v: ex, ok: true }, { v: ex / 10, q: `${ra} × ${rb} = ${ra * rb}. Sonuç ${ra * rb}’e yakın olmalı. ${tr(ex / 10)} çok mu küçük? Virgül nerede olmalı?`, misc: 'Ondalık virgülü yanlış yere koydu' }, { v: ex * 10, q: `${ra} × ${rb} = ${ra * rb}. ${tr(ex * 10)} bunun kaç katı?`, misc: 'Ondalık virgülü yanlış yere koydu' }, { v: Math.round((a + b) * 10) / 10, q: `${tr(a)} tane ${tr(b)} kaç eder? Bu sonuç bir toplama mı?`, misc: 'Çarpma yerine toplama yaptı' }], reasons: [`${ra} × ${rb} = ${ra * rb}; sonuç buna yakın`, 'Virgülden sonraki basamak sayılarını saydım', 'Çarpanlardan biri 3’ten büyük, sonuç 10’dan büyük'], hints: ['Çarpanları en yakın doğal sayılara yuvarla.', `${ra} × ${rb} kaç eder?`], bench: `${ra} × ${rb} = ${ra * rb} → gerçek sonuç ${tr(ex)}` }),
      hand({ title: 'Kesirli sayıya bölme', prompt: `${n} ÷ ${tr(dv)} işleminin sonucu ${ek(n, 'abl')} büyük mü küçük mü? Önce tahmin et.`, expr: `${n} ÷ ${tr(dv)}`, exact: n / dv, exactText: tr(n / dv), raw: [{ v: n / dv, ok: true }, { v: n * dv, q: `${n} içinde kaç tane ${tr(dv)} var? Her bütünde ${1 / dv} tane ${tr(dv)} varsa ${n} bütünde kaç tane olur?`, misc: 'Bölmenin her zaman küçülttüğünü düşündü (çarptı)' }, { v: n / dv / 10, q: `${n} içinde ${tr(dv)} kaç kez var? ${tr(n / dv / 10)} kez mi? Virgülü kontrol et.`, misc: 'Ondalık virgülü yanlış yere koydu' }, { v: n - dv, q: `Bu, ${ek(n, 'abl')} ${tr(dv)} çıkarmak olmadı mı? Bölme “kaç tane var?” diye sorar.`, misc: 'Bölme yerine çıkarma yaptı' }], reasons: [`${n} içinde kaç tane ${tr(dv)} var diye düşündüm`, `Her bütünde ${1 / dv} tane ${tr(dv)} var`, '1’den küçük bir sayıya bölünce sonuç büyür'], hints: [`Bir bütünün içinde kaç tane ${tr(dv)} var?`], bench: `1 içinde ${1 / dv} tane ${tr(dv)} var → ${n} içinde ${n} × ${1 / dv} = ${tr(n / dv)}` }),
      hand({ title: 'Yüzde tahmini', prompt: `${ek(base, 'gen')} %${pc}’i kaçtır? Arkadaşların farklı sonuçlar buldu.`, expr: `${ek(base, 'gen')} %${pc}’i`, exact: (base * pc) / 100, exactText: tr((base * pc) / 100), raw: [{ v: (base * pc) / 100, ok: true }, { v: base - pc, q: `%${pc}, ${ek(base, 'abl')} ${pc} çıkarmak mı demek? %${pc} = [[${pc}/100]]. ${ek(base, 'gen')} [[${pc === 25 ? '1/4' : '3/4'}]]’ü kaç?`, misc: 'Yüzdeyi çıkarılacak sayı sandı' }, { v: base * pc, q: `Bir sayının bir parçası, sayının kendisinden büyük olabilir mi? %${pc} yüzde kaç parça demek?`, misc: 'Yüzde işaretini yok sayıp çarptı' }, { v: Math.round((base / pc) * 10) / 10, q: `${tr(base / pc)}, ${ek(base, 'gen')} %${pc}’i için çok küçük değil mi? %${pc} = [[${pc === 25 ? '1/4' : '3/4'}]].`, misc: 'Yüzdeyi bölen olarak kullandı' }], reasons: [`%${pc} = [[${pc === 25 ? '1/4' : '3/4'}]]; ${ek(base, 'gen')} ${pc === 25 ? 'dörtte biri' : 'dörtte üçü'}`, `%50 yarısı, %${pc} ${pc === 25 ? 'yarının yarısı' : 'yarıdan fazla'}`, '%10’dan başlayıp katladım'], hints: [`%50 bir sayının yarısıdır. %${pc} yarıdan az mı, çok mu?`], bench: `%${pc} = [[${pc === 25 ? '1/4' : '3/4'}]] → ${ek(base, 'gen')} ${pc === 25 ? 'dörtte biri' : 'dörtte üçü'} ${tr((base * pc) / 100)}` }),
      hand({ title: 'Küçük çarpanlar', prompt: '0,8 × 0,6 işleminin sonucu çarpanlardan büyük mü küçük mü? Önce tahmin et.', expr: '0,8 × 0,6', exact: 0.48, exactText: '0,48', raw: [{ v: 0.48, ok: true }, { v: 4.8, q: '1’den küçük iki sayının çarpımı 1’den büyük olabilir mi? 0,8’in 0,6’sı ne demek?', misc: 'Ondalık basamak sayısını yanlış saydı' }, { v: 1.4, q: '0,8 × 0,6, “0,8’in 0,6’sı” demek. Bu 0,8’den büyük olabilir mi?', misc: 'Çarpma yerine toplama yaptı' }, { v: 0.048, q: '0,8’in yarısı 0,4. 0,6 yarıdan biraz fazla; sonuç 0,4’e yakın olmalı. 0,048 çok mu küçük?', misc: 'Ondalık basamak sayısını yanlış saydı' }], reasons: ['İki çarpan da 1’den küçük, çarpım ikisinden de küçük', '0,8 × 0,5 = 0,4; sonuç biraz daha fazla', '8 × 6 = 48, iki ondalık basamak'], hints: ['0,8’in yarısı kaç? 0,6 yarıdan az mı, fazla mı?'], bench: '0,8 × 0,5 = 0,4 → gerçek sonuç 0,48', view: [-0.3, 5.2] }),
      ctxTask({ title: 'Sınıfın uzunluğu', prompt: 'Sınıfının bir duvardan karşı duvara uzunluğu kaç metre olabilir?', unit: 'm', ok: 8.5, wrong: [{ v: 85, q: '85 m neredeyse bir futbol sahası kadar! Sınıf bu kadar uzun mu?', misc: 'Ondalık gösterimde basamak değerini karıştırdı' }, { v: 0.85, q: '0,85 m bir masadan bile kısa. Bütün sınıf bu kadar olabilir mi?', misc: 'Ondalık gösterimde basamak değerini karıştırdı' }], reasons: ['Bir adımım yaklaşık 0,5 m; sınıf 15–20 adım', 'Sınıfta yan yana 4 sıra var, her biri 2 m kadar', 'Kapı 2 m; sınıf birkaç kapı boyu'], bench: 'Bir sınıf genellikle 7–9 m uzunluğundadır.', hint: 'Bir adımın yaklaşık 0,5 m. Sınıfı kaç adımda geçersin?' }),
    ]
  }
  if (grade === 7) {
    const [x, y] = pick([[-2.8, 5.1], [-3.6, 7.2], [-6.4, 2.9]] as const)
    const ex = Math.round((x + y) * 10) / 10
    return [
      hand({ title: 'İşaretli toplama', prompt: `${tr(x)} + ${tr(y)} işleminin sonucu pozitif mi negatif mi? Önce sayı doğrusunda tahmin et.`, expr: `(${tr(x)}) + ${tr(y)}`, exact: ex, exactText: tr(ex), raw: [{ v: ex, ok: true }, { v: -Math.round((Math.abs(x) + y) * 10) / 10, q: `${tr(y)} pozitif. ${tr(x)}’ten sağa doğru ${tr(y)} birim gidersen nereye varırsın?`, misc: 'İşaretleri karıştırdı (iki sayıyı da negatif aldı)' }, { v: Math.round((Math.abs(x) + y) * 10) / 10, q: `${tr(x)} negatif bir sayı. Negatif işaretini yok sayabilir miyiz? Sayı doğrusunda ${tr(x)}’ten başla.`, misc: 'Negatif işaretini yok saydı' }, { v: -ex, q: `Mutlak değeri büyük olan hangisi: ${tr(x)} mi ${tr(y)} mi? Sonucun işareti onunla aynı olmalı mı?`, misc: 'Sonucun işaretini yanlış belirledi' }], reasons: ['Mutlak değeri büyük olan sayının işaretini aldım', `Sayı doğrusunda ${tr(x)}’ten sağa ${tr(y)} birim gittim`, `${Math.round(y)} − ${Math.round(-x)} = ${Math.round(y) - Math.round(-x)}’e yakın`], hints: [`${tr(x)}’ten başla ve ${tr(y)} birim sağa git.`], bench: `${Math.round(y)} − ${Math.round(-x)} = ${Math.round(y) - Math.round(-x)} → gerçek sonuç ${tr(ex)}`, view: [-12, 12] }),
      hand({ title: 'Negatif çarpı kesir', prompt: '(−6) × 0,25 işleminin sonucu nerede olur? Önce tahmin et.', expr: '(−6) × 0,25', exact: -1.5, exactText: '−1,5', raw: [{ v: -1.5, ok: true }, { v: 1.5, q: 'Negatif bir sayıyı pozitif bir sayıyla çarpınca sonucun işareti ne olur?', misc: 'Çarpmada işaret kuralını karıştırdı' }, { v: -24, q: '0,25 ile çarpmak dörtte birini almak demek. −24, −6’dan büyük mü küçük mü? Mantıklı mı?', misc: '0,25 ile çarpmayı 0,25’e bölmeyle karıştırdı' }, { v: -6.25, q: '× işaretini + gibi mi kullandın? −6’nın dörtte biri kaçtır?', misc: 'Çarpma yerine toplama yaptı' }], reasons: ['0,25 = [[1/4]]; −6’nın dörtte biri', 'Negatif × pozitif = negatif, büyüklüğü 6’dan küçük', '6 × 0,25 = 1,5 ve işaret negatif'], hints: ['0,25 hangi kesre eşit?', '−6’nın dörtte biri kaçtır?'], bench: '0,25 = [[1/4]] → −6’nın dörtte biri −1,5', view: [-26, 4] }),
      hand({ title: 'Oran ile tahmin', prompt: '3 kg elma 87 TL. 5 kg elma kaç TL olur? Önce mantıklı bir aralık düşün.', expr: '3 kg → 87 TL · 5 kg → ?', exact: 145, exactText: '145 TL', unit: 'TL', raw: [{ v: 145, ok: true }, { v: 89, q: '2 kg daha fazla elma alınca yalnızca 2 TL mi artar? 1 kg elma yaklaşık kaç TL?', misc: 'Orantıyı toplamayla kurdu (sabit fark)' }, { v: 435, q: '5 kg için 435 TL ise 1 kg kaç TL olur? 3 kg 87 TL ile karşılaştır.', misc: '5 ile çarpıp 3’e bölmeyi unuttu' }, { v: 52.2, q: 'Daha çok elma daha az para mı tutar? 5 kg, 3 kg’dan fazla.', misc: 'Oranı ters kurdu' }], reasons: ['1 kg yaklaşık 30 TL, 5 kg yaklaşık 150 TL', '5 kg, 3 kg’ın 1,5 katından biraz fazla', 'Önce 1 kg’ın fiyatını buldum: 29 TL'], hints: ['1 kg elma yaklaşık kaç TL?'], bench: '1 kg = 87 ÷ 3 = 29 TL → 5 kg = 145 TL' }),
      hand({ title: 'Negatif kesirler', prompt: '−[[3/4]] − [[2/3]] işleminin sonucu sayı doğrusunda nerede? Önce tahmin et.', expr: '−[[3/4]] − [[2/3]]', exact: -17 / 12, exactText: '−[[17/12]] ≈ −1,42', raw: [{ v: -17 / 12, text: '−[[17/12]]', short: '−17/12', ok: true }, { v: -5 / 7, text: '−[[5/7]]', short: '−5/7', q: 'İkisi de neredeyse −1’e yakın iki sayı. Toplamları −1’den küçük olmalı mı? Payları ve paydaları ayrı ayrı toplamak olur mu?', misc: 'Payları ve paydaları ayrı ayrı topladı' }, { v: -1 / 12, text: '−[[1/12]]', short: '−1/12', q: '− [[2/3]] çıkarmak, sayı doğrusunda hangi yöne gitmek demek? −[[3/4]]’ten sola mı sağa mı?', misc: 'Çıkarılan sayının işaretini karıştırdı' }, { v: 17 / 12, text: '[[17/12]]', short: '17/12', q: 'İki negatif yönlü hareket sonunda pozitife varabilir mi?', misc: 'Negatif işaretini kaybetti' }], reasons: ['−[[3/4]] ≈ −0,75 ve [[2/3]] ≈ 0,67; toplam yaklaşık −1,4', 'Sola doğru iki adım gittim', 'İki sayı da yaklaşık 1; sonuç yaklaşık −1,5'], hints: ['[[3/4]] ve [[2/3]] yaklaşık kaç? İkisi de 1’e yakın mı?'], bench: '−0,75 − 0,67 ≈ −1,42 → −[[17/12]]', view: [-2.2, 2.2] }),
      ctxTask({ title: 'Dondurucunun sıcaklığı', prompt: 'Evdeki derin dondurucunun içi kaç °C olabilir?', unit: '°C', ok: -18, wrong: [{ v: 18, q: '18 °C ılık bir oda sıcaklığı. Dondurma bu sıcaklıkta donmuş kalır mı?', misc: 'Negatif sayıların anlamını karıştırdı' }, { v: -180, q: '−180 °C, en soğuk kutup gecelerinden bile kat kat soğuk! Bir ev dondurucusu bunu yapabilir mi?', misc: 'Ölçeği kestiremedi' }], reasons: ['Su 0 °C’ta donar; dondurucu bundan soğuk', 'Kışın dışarısı −5 °C olur, dondurucu daha soğuk', 'Dondurucu etiketinde −18 yazıyor'], bench: 'Derin dondurucular yaklaşık −18 °C’tadır.', hint: 'Su kaç °C’ta donar? Dondurucu ondan soğuk mu, sıcak mı?' }),
    ]
  }
  // 8. sınıf
  const sq = pick([50, 60, 80] as const)
  const sq2 = pick([200, 300, 500] as const)
  const lo = Math.floor(Math.sqrt(sq))
  const lo2 = Math.floor(Math.sqrt(sq2))
  return [
    hand({ title: 'Karekök tahmini', prompt: `√{${sq}} yaklaşık kaçtır? Önce sen tahmin et, sonra arkadaşlarının cevaplarına bak.`, expr: `√{${sq}}`, exact: Math.sqrt(sq), exactText: `√{${sq}} ≈ ${tr(Math.sqrt(sq), 2)}`, raw: [{ v: Math.round(Math.sqrt(sq) * 100) / 100, ok: true }, { v: sq / 2, q: `Karekök, “hangi sayının karesi ${sq}?” diye sorar. ${sq / 2}^{2} kaç eder?`, misc: 'Karekökü ikiye bölmekle karıştırdı' }, { v: sq * sq, q: `Bu sayı ${ek(sq, 'gen')} karesi. Karekök, sayıyı büyütür mü küçültür mü?`, misc: 'Karekök yerine kare aldı' }], reasons: [`${lo}^{2} = ${lo * lo} ve ${lo + 1}^{2} = ${(lo + 1) ** 2}; arada`, `${lo * lo}’e daha yakın, sonuç ${lo}’ye yakın`, 'Hesap makinesi olmadan kareleri düşündüm'], hints: [`Karesi ${sq}’e en yakın tam sayılar hangileri?`], bench: `${lo}^{2} = ${lo * lo} < ${sq} < ${(lo + 1) ** 2} = ${lo + 1}^{2} → √{${sq}} ≈ ${tr(Math.sqrt(sq), 2)}`, view: [-50, sq * sq + 200] }),
    hand({ title: 'Üslü ifade', prompt: '2^{10} kaç eder? Önce tahminini sayı doğrusuna koy.', expr: '2^{10}', exact: 1024, exactText: '1.024', raw: [{ v: 1024, ok: true }, { v: 20, q: '2^{10}, 2 × 10 mu demek, yoksa 10 tane 2’nin çarpımı mı?', misc: 'Üssü çarpan sandı' }, { v: 100, q: 'Bu 10^{2}. Taban ile üs yer değiştirince sonuç aynı kalır mı? 2^{3} ile 3^{2}’yi karşılaştır.', misc: 'Taban ile üssü yer değiştirdi' }, { v: 512, q: '2’yi kaç kez çarptın? 2^{9} = 512. Bir kez daha ikiye katla.', misc: 'Üssü bir eksik çarptı' }], reasons: ['2^{5} = 32; 32 × 32 yaklaşık 1.000', 'Her adımda ikiye katladım: 2, 4, 8, … , 1.024', '2^{10} ≈ 10^{3} olduğunu biliyorum'], hints: ['2^{5} kaç eder? 2^{10} = 2^{5} × 2^{5}.'], bench: '2^{5} = 32 → 32 × 32 = 1.024 ≈ 1.000' }),
    hand({ title: 'Büyük karekök', prompt: `√{${sq2}} yaklaşık kaçtır? Önce sen tahmin et.`, expr: `√{${sq2}}`, exact: Math.sqrt(sq2), exactText: `√{${sq2}} ≈ ${tr(Math.sqrt(sq2), 2)}`, raw: [{ v: Math.round(Math.sqrt(sq2) * 100) / 100, ok: true }, { v: sq2 / 2, q: `${sq2 / 2}^{2} kaç eder? ${sq2} ile karşılaştır.`, misc: 'Karekökü ikiye bölmekle karıştırdı' }, { v: Math.round(Math.sqrt(sq2 * 10) * 100) / 100, q: `${Math.round(Math.sqrt(sq2 * 10))}^{2} kaç eder? ${sq2} mü, ${sq2 * 10} mu?`, misc: 'Basamak sayısını yanlış eşledi' }, { v: Math.round(Math.sqrt(sq2 / 100) * 100) / 100, q: `Sıfırları yok sayabilir miyiz? ${tr(Math.sqrt(sq2 / 100), 2)}^{2} kaç eder?`, misc: 'Sıfırları yok sayarak karekök aldı' }], reasons: [`${lo2}^{2} = ${lo2 * lo2} ve ${lo2 + 1}^{2} = ${(lo2 + 1) ** 2}; arada`, 'Karekök, sayının basamak sayısını yarıya indirir', 'Bildiğim karelerden tahmin ettim'], hints: [`10^{2} = 100 ve 20^{2} = 400. √{${sq2}} hangi aralıkta?`], bench: `${lo2}^{2} = ${lo2 * lo2} < ${sq2} < ${(lo2 + 1) ** 2} → √{${sq2}} ≈ ${tr(Math.sqrt(sq2), 2)}` }),
    hand({ title: 'Bilimsel gösterim', prompt: '(4 · 10^{−4}) · (5 · 10^{3}) işleminin sonucu hangisi? Önce tahmin et.', expr: '(4 · 10^{−4}) · (5 · 10^{3})', exact: 2, exactText: '2', raw: [{ v: 2, ok: true }, { v: 20, q: '4 × 5 = 20 ve 10^{−4} · 10^{3} = 10^{?}. 20’yi bununla çarptın mı?', misc: '10’un kuvvetini işleme katmadı' }, { v: 0.02, q: '10^{−4} · 10^{3}: üsleri topla. −4 + 3 kaç eder?', misc: 'Üsleri toplarken işareti karıştırdı' }, { v: 0.2, q: '20 × 10^{−1} kaç eder? Virgülü kaç basamak kaydırman gerek?', misc: 'Ondalık basamak sayısını yanlış saydı' }], reasons: ['4 × 5 = 20 ve 10^{−1}: 20 × 0,1 = 2', 'Üsleri topladım: −4 + 3 = −1', '0,0004 × 5.000 düşündüm'], hints: ['Önce sayıları, sonra 10’un kuvvetlerini çarp.'], bench: '20 · 10^{−1} = 2', view: [-1, 22] }),
    hand({ title: 'Bahçenin köşegeni', prompt: 'Kenarı 30 m olan kare bir bahçenin bir köşesinden karşı köşesine yürüyen biri yaklaşık kaç metre yürür?', expr: 'Kare bahçe, kenar 30 m', exact: 30 * Math.SQRT2, exactText: '30√{2} ≈ 42,4 m', unit: 'm', context: true, raw: [{ v: 42.4, ok: true }, { v: 60, q: 'Köşegen boyunca yürümek, iki kenarı dolaşmaktan kısa mı uzun mu?', misc: 'Köşegeni iki kenarın toplamı sandı' }, { v: 900, q: '900, bahçenin alanı (m²). Yürüme mesafesi bir uzunluk mu, alan mı?', misc: 'Alan ile uzunluğu karıştırdı' }, { v: 30, q: 'Köşegen bir dik üçgenin hipotenüsü. Hipotenüs, dik kenarlardan kısa olabilir mi?', misc: 'Köşegeni kenara eşit sandı' }], reasons: ['Köşegen 30 ile 60 arasında olmalı', '30^{2} + 30^{2} = 1.800 ve √{1.800} ≈ 42', 'Kare köşegeni kenarın yaklaşık 1,4 katı'], hints: ['Köşegen, kenarlarla bir dik üçgen oluşturur. Hipotenüs dik kenarlardan uzun, toplamlarından kısadır.'], bench: '30^{2} + 30^{2} = 1.800 → √{1.800} ≈ 42,4 m' }),
  ]
}
