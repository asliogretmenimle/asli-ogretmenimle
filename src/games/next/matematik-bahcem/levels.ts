import type { Grade } from '../../../data/types'
import { ek } from '../../../lib/generators'

/**
 * Matematik Bahçem seviyeleri.
 *  Yineleyen örüntüler: extend (devam ettir), fix (hatayı düzelt), remake (aynı örüntü başka çiçeklerle),
 *  core (çekirdeği çitle ayır), translate (çiçek → taş), family (aynı yapıdaki örüntüler), far (uzak terimi tahmin),
 *  design (kendi örüntünü tasarla, arkadaş devam ettirsin).
 *  Büyüyen örüntüler (3. sınıf): gbuild (4. adımı kur), gtable (tablo), grule (kuralı sözle), gpredict (10. adım), gdesign.
 */

export type Kind = 'extend' | 'fix' | 'remake' | 'core' | 'translate' | 'family' | 'far' | 'design' | 'gbuild' | 'gtable' | 'grule' | 'gpredict' | 'gdesign'
export type Stage = 'Somut' | 'Model' | 'Sembol' | 'Problem'

export interface Rule {
  text: string
  f: (n: number) => number
  ok: boolean
  mis?: string
}

export interface FamCard {
  id: string
  item: 'flower' | 'stone'
  seq: number[]
  code: string
}

export interface Level {
  kind: Kind
  stage: Stage
  title: string
  prompt: string
  hints: string[]
  goal: number
  note: string
  /** yineleyen örüntünün çekirdeği (çiçek türleri) */
  core?: number[]
  /** gösterilecek toplam uzunluk */
  len?: number
  /** extend: verilen çiçek sayısı */
  given?: number
  /** fix: hatalı konumlar → yanlış tür */
  errors?: Record<number, number>
  /** tohum tepsisindeki türler */
  kinds?: number[]
  /** far: sorulan konum */
  n?: number
  cards?: FamCard[]
  grow?: { c: number; d: number }
  rules?: Rule[]
  predictN?: number
  picker?: { q: string; options: string[] }
  auto?: string
  friend?: boolean
}

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Harf yapısı (ABB) → rastgele farklı türler */
export function makeCore(code: string, avoid: number[] = []): number[] {
  const letters = [...new Set(code.split(''))]
  const pool = shuffle([0, 1, 2, 3].filter((k) => !avoid.includes(k))).concat(shuffle(avoid))
  const map = new Map(letters.map((l, i) => [l, pool[i]]))
  return code.split('').map((l) => map.get(l)!)
}

export const seqOf = (core: number[], len: number) => Array.from({ length: len }, (_, i) => core[i % core.length])

/** Bir dizinin harf yapısı: [2,0,0] → "ABB" */
export function codeOf(seq: number[]): string {
  const m = new Map<number, string>()
  return seq.map((k) => {
    if (!m.has(k)) m.set(k, 'ABCD'[m.size])
    return m.get(k)!
  }).join('')
}

/** Dizinin en kısa tekrar eden parçası (tam tekrar gerekmez; son parça yarım olabilir) */
export function period(seq: number[]): number {
  for (let p = 1; p <= seq.length; p++) if (seq.every((x, i) => i < p || x === seq[i - p])) return p
  return seq.length
}

const kindsWith = (core: number[], extra: number) => {
  const base = [...new Set(core)]
  const rest = shuffle([0, 1, 2, 3].filter((k) => !base.includes(k))).slice(0, extra)
  return [...base, ...rest].sort((a, b) => a - b)
}

/* ───────────────────────────── 1. sınıf ───────────────────────────── */

function g1Extend(code: string, given: number, holes: number, title: string, stage: Stage): Level {
  const core = makeCore(code)
  return {
    kind: 'extend',
    stage,
    title,
    prompt: 'Çiçekler bir sırayla dikilmiş. Sıradaki çiçekleri sen dik!',
    hints: ['Çiçekleri sesli söyle: kırmızı, mavi, …', 'Hangi çiçekler tekrar ediyor? O parçayı bul.', 'Son dikilen çiçeğe bak. Ondan sonra hangisi gelir?'],
    goal: 1,
    note: `Tekrar eden parça: ${code.split('').join(' ')}. Hep aynı sırayla!`,
    core,
    len: given + holes,
    given,
    kinds: kindsWith(core, 1),
    picker: { q: 'Nasıl bildin?', options: ['Sesli söyledim', 'Tekrar eden parçayı buldum', 'Başa dönüp baktım'] },
    auto: 'Çekirdeği bulma',
  }
}

function g1Fix(): Level {
  const core = makeCore('ABC')
  const len = 9
  const pos = rnd(4, 8)
  const right = core[pos % 3]
  const wrong = pick(core.filter((k) => k !== right))
  return {
    kind: 'fix',
    stage: 'Model',
    title: 'Bahçıvanın hatası',
    prompt: 'Bahçıvan bir çiçeği yanlış dikmiş. Yanlış çiçeğe dokun, sök. Yerine doğrusunu dik!',
    hints: ['İlk üç çiçeği söyle. Sonra hep aynısı gelmeli.', 'Çiçekleri üçerli grupla. Hangi grup farklı?'],
    goal: 1,
    note: 'Her üç çiçekte aynı sıra: A B C, A B C, A B C.',
    core,
    len,
    errors: { [pos]: wrong },
    kinds: [...core].sort((a, b) => a - b),
    auto: 'Çekirdeği bulma',
  }
}

function g1Remake(): Level {
  const code = pick(['ABB', 'AAB'])
  const core = makeCore(code)
  return {
    kind: 'remake',
    stage: 'Model',
    title: 'Aynı örüntü, başka çiçek',
    prompt: 'Üstteki örüntüyü alttaki tarha başka çiçeklerle yap. 2 farklı yol bul!',
    hints: ['Üstteki örüntüde kaç farklı çiçek var?', 'Kırmızı yerine bir çiçek, mavi yerine başka bir çiçek seç.', 'Aynı sırayı koru: biri, ikisi, ikisi…'],
    goal: 2,
    note: `Çiçekler değişti ama sıra aynı kaldı: ${code}!`,
    core,
    len: 6,
    kinds: [0, 1, 2, 3],
    picker: { q: 'Nasıl yaptın?', options: ['Her çiçeğe bir eş seçtim', 'Sesli söyledim', 'Harflerle düşündüm'] },
  }
}

/* ───────────────────────────── 2. sınıf ───────────────────────────── */

function g2Core(): Level {
  const code = pick(['AAB', 'ABBC', 'ABCC', 'AABC'])
  const core = makeCore(code)
  const len = code.length === 3 ? 12 : 12
  return {
    kind: 'core',
    stage: 'Model',
    title: 'Çekirdeği bul',
    prompt: 'Tekrar eden parçaya “çekirdek” diyoruz. Her çekirdeğin sonundaki çiçeğe dokun, araya çit koy!',
    hints: ['Baştan başla: ilk çiçekler sonra yeniden aynı sırayla geliyor mu?', 'Çitler arasındaki gruplar birbirinin aynısı olmalı.', 'Daha kısa bir parça da tekrar ediyor mu?'],
    goal: 1,
    note: `Çekirdek: ${code}. Bu çekirdek ${len / code.length} kez tekrar ediyor.`,
    core,
    len,
    auto: 'Çekirdeği bulma',
  }
}

function g2Fix(): Level {
  const core = makeCore('AABB')
  const len = 12
  const p1 = rnd(4, 7)
  const p2 = rnd(8, 11)
  const errors: Record<number, number> = {}
  for (const p of [p1, p2]) errors[p] = core.find((k) => k !== core[p % 4])!
  return {
    kind: 'fix',
    stage: 'Model',
    title: 'İki hata',
    prompt: 'Bu tarhta iki çiçek yanlış. Onları bul, sök ve doğrusunu dik!',
    hints: ['Çekirdek kaç çiçekten oluşuyor?', 'Çiçekleri dörderli grupla. Her grup A A B B mi?'],
    goal: 1,
    note: 'Çekirdeği bulunca hatalar hemen göze çarpar!',
    core,
    len,
    errors,
    kinds: [...new Set(core)].sort((a, b) => a - b),
    auto: 'Çekirdeği bulma',
  }
}

function g2Translate(): Level {
  const code = pick(['ABB', 'ABC', 'AAB'])
  const core = makeCore(code)
  return {
    kind: 'translate',
    stage: 'Sembol',
    title: 'Çiçekten taşa',
    prompt: 'Çiçek örüntüsünü patikaya taşlarla yaz. Şekilleri sen seç! 2 farklı yol bul.',
    hints: ['Her çiçek türüne bir şekil seç.', 'Aynı çiçeklerin altına aynı şekil gelmeli.', 'Başka şekillerle yeniden dene: yapı aynı kalmalı.'],
    goal: 2,
    note: `Çiçek de olsa taş da olsa yapı aynı: ${code}!`,
    core,
    len: core.length * 2,
    kinds: [0, 1, 2, 3],
    picker: { q: 'Nasıl çevirdin?', options: ['Her çiçeğe bir şekil eşledim', 'Harflerle düşündüm', 'Tekrar eden parçayı çevirdim'] },
    auto: 'Temsiller arası çeviri',
  }
}

function g2Family(): Level {
  const mk = (id: string, item: 'flower' | 'stone', code: string, len: number): FamCard => ({ id, item, code, seq: seqOf(makeCore(code), len) })
  const cards = shuffle([mk('a', 'flower', 'AB', 6), mk('b', 'stone', 'AB', 6), mk('c', 'stone', 'ABB', 6), mk('d', 'flower', 'ABB', 6), mk('e', 'flower', 'ABC', 6)])
  return {
    kind: 'family',
    stage: 'Sembol',
    title: 'Örüntü aileleri',
    prompt: 'Her örüntü kartını harf kodunun kutusuna koy. Çiçek ya da taş fark etmez!',
    hints: ['Kartın ilk öğesine A de. Farklı bir öğe gelince B de.', 'Bir kartı harflerle oku: A B B A B B…'],
    goal: 1,
    note: 'Görünüşleri farklı ama yapıları aynı olan örüntüler aynı ailedendir.',
    cards,
    auto: 'Temsiller arası çeviri',
  }
}

function far(grade: Grade): Level {
  const code = grade <= 2 ? pick(['ABC', 'ABB', 'AAB']) : pick(['ABCD', 'AABC', 'ABBC'])
  const core = makeCore(code)
  const L = core.length
  let n = grade <= 2 ? rnd(13, 20) : rnd(21, 30)
  if (n % L === 1 && Math.random() < 0.5) n++
  return {
    kind: 'far',
    stage: 'Problem',
    title: `${n}. çiçek`,
    prompt: `Bahçıvan bu örüntüyü ${n}. çiçeğe kadar sürdürecek. ${n}. çiçek hangisi olacak? Hepsini dikmeden tahmin et!`,
    hints: [`Çekirdekte kaç çiçek var? Her grup ${L} çiçek.`, `${ek(L, 'dist')} ${ek(L, 'dist')} say: ${L}, ${2 * L}, ${3 * L}… ${ek(n, 'dat')} en yakın hangisi?`, `${Math.floor(n / L) * L}. çiçek bir grubun sonuncusu. Sonra kaç adım var?`],
    goal: 1,
    note: `${n} = ${Math.floor(n / L)} grup × ${L} ${n % L ? `+ ${n % L}` : ''}`.trim(),
    core,
    len: L * 2,
    n,
    kinds: [...new Set(core)].sort((a, b) => a - b),
    picker: { q: 'Nasıl tahmin ettin?', options: ['Grupladım', `${ek(L, 'dist')} ritmik saydım`, 'Tek tek saydım', 'Çarpmayı düşündüm'] },
  }
}

function design(grade: Grade): Level {
  return {
    kind: 'design',
    stage: 'Problem',
    title: 'Kendi bahçem',
    prompt: grade <= 1 ? 'Kendi örüntünü dik! Tekrar eden parçayı en az 2 kez dik. Sonra arı Vız devam ettirsin.' : 'Kendi örüntünü tasarla: bir çekirdek seç, en az 2 kez tekrar et. Arı Vız devam ettirecek; doğru mu, sen kontrol et!',
    hints: ['Önce kısa bir parça seç: örneğin kırmızı, mavi, mavi.', 'Aynı parçayı bir kez daha dik.', 'Vız’ın diktiği çiçekleri tek tek kontrol et.'],
    goal: 1,
    note: 'Bir örüntüyü tekrar eden parçası belirler. O parçayı bilen herkes devam ettirebilir!',
    kinds: [0, 1, 2, 3],
    len: 12,
    picker: { q: 'Vız’ı nasıl kontrol ettin?', options: ['Çekirdeği söyledim', 'Çiçekleri tek tek karşılaştırdım', 'Harflerle okudum'] },
    auto: 'Kendi kuralını oluşturma',
  }
}

/* ───────────────────────────── 3. sınıf: büyüyen örüntüler ───────────────────────────── */

export const growF = (g: { c: number; d: number }, n: number) => g.c + g.d * n

function growPick(): { c: number; d: number } {
  return pick([{ c: 1, d: 2 }, { c: 2, d: 2 }, { c: 1, d: 3 }, { c: 2, d: 3 }, { c: 0, d: 3 }])
}

function rulesFor(g: { c: number; d: number }): Rule[] {
  const { c, d } = g
  const ok: Rule[] = [
    { text: `Her adımda ${d} çiçek eklenir.`, f: (n) => c + d * n, ok: true },
    { text: c ? `Adım sayısının ${d} katına ${c} eklenir.` : `Adım sayısının ${d} katı kadar çiçek var.`, f: (n) => c + d * n, ok: true },
    { text: c ? `Ortada ${c} ayçiçeği var; yanında adım sayısı kadar ${d}’li lale sırası var.` : `Adım sayısı kadar ${d}’li lale sırası var.`, f: (n) => c + d * n, ok: true },
  ]
  const f1 = c + d
  const bad: Rule[] = [
    { text: 'Her adımda çiçekler ikiye katlanır.', f: (n) => f1 * 2 ** (n - 1), ok: false, mis: 'Büyüyen örüntüde sabit artış yerine ikiye katladı' },
    { text: `Her adımda ${d + 1} çiçek eklenir.`, f: (n) => f1 + (d + 1) * (n - 1), ok: false, mis: 'Adımlar arasındaki farkı yanlış saydı' },
    { text: `Adım sayısına ${f1 - 1} eklenir.`, f: (n) => n + f1 - 1, ok: false, mis: 'Kuralı yalnızca ilk adıma göre kurdu' },
  ]
  return shuffle([...ok, ...bad])
}

function gBuild(g: { c: number; d: number }, friend = false): Level {
  return {
    kind: 'gbuild',
    stage: 'Somut',
    title: friend ? 'Arkadaşının büyüyen bahçesi' : 'Büyüyen tarh',
    prompt: friend ? 'Arkadaşın büyüyen bir bahçe tasarladı. 4. adımı sen dik!' : 'Bahçe her adımda büyüyor. 1, 2 ve 3. adımlara bak. 4. adımı sen dik!',
    hints: ['1. adımdan 2. adıma ne eklendi?', 'Ayçiçekleri hiç değişiyor mu? Ya lale sıraları?', `4. adımda kaç lale sırası olmalı?`],
    goal: 1,
    note: `${growF(g, 1)}, ${growF(g, 2)}, ${growF(g, 3)}, ${growF(g, 4)}: her adımda ${g.d} çiçek eklendi.`,
    grow: g,
    friend,
    auto: 'Değişeni ve değişmeyeni görme',
  }
}

function gTable(g: { c: number; d: number }): Level {
  return {
    kind: 'gtable',
    stage: 'Model',
    title: 'Adım tablosu',
    prompt: 'Tabloyu tamamla: 4. ve 5. adımda kaç çiçek var? Sonra her adımda kaç çiçek eklendiğini yaz.',
    hints: ['Tablodaki sayılar arasındaki farka bak.', `${growF(g, 3)} ile ${growF(g, 2)} arasında kaç fark var?`],
    goal: 1,
    note: `Tabloda her satırda ${g.d} artıyor: ${[1, 2, 3, 4, 5].map((n) => growF(g, n)).join(', ')}.`,
    grow: g,
    auto: 'Tabloda fark bulma',
  }
}

function gRule(g: { c: number; d: number }): Level {
  return {
    kind: 'grule',
    stage: 'Sembol',
    title: 'Kuralı söyle',
    prompt: 'Hangi cümleler bu bahçenin kuralını anlatıyor? Bir kural kartına dokun, tabloda dene. 2 doğru kural bul!',
    hints: ['Bir kuralı 1., 2. ve 3. adımda dene: hepsinde tutuyor mu?', 'Ayçiçekleri sabit, lale sıraları artıyor.', 'Bir kural yalnız ilk adımda tutuyorsa doğru kural değildir.'],
    goal: 2,
    note: 'Aynı bahçe farklı cümlelerle anlatılabilir: “her adımda ekle” ya da “adım sayısıyla hesapla”.',
    grow: g,
    rules: rulesFor(g),
  }
}

function gPredict(g: { c: number; d: number }): Level {
  return {
    kind: 'gpredict',
    stage: 'Problem',
    title: '10. adım',
    prompt: '10. adımda kaç çiçek olacak? Hepsini dikmeden tahmin et, sonra bahçede gör!',
    hints: [`10. adımda kaç lale sırası olur? Her sırada ${g.d} lale.`, `Ayçiçeklerini de unutma: ${g.c} tane.`, '5. adımın iki katı doğru olur mu? Tabloda dene.'],
    goal: 1,
    note: `10. adım: ${g.c ? `${g.c} + ` : ''}10 × ${g.d} = ${growF(g, 10)} çiçek.`,
    grow: g,
    predictN: 10,
    picker: { q: 'Nasıl buldun?', options: ['Kuralı kullandım', 'Tabloyu devam ettirdim', `${ek(g.d, 'dist')} ritmik saydım`, 'Çizerek düşündüm'] },
  }
}

function gDesign(): Level {
  return {
    kind: 'gdesign',
    stage: 'Problem',
    title: 'Kendi büyüyen bahçem',
    prompt: 'Kendi büyüyen bahçeni tasarla: ortada kaç ayçiçeği olsun, her adımda kaç lale eklensin? Vız 6. adımı tahmin edecek; sen kontrol et!',
    hints: ['Ayçiçeği sayısı hep aynı kalır.', 'Her adımda eklenen laleleri seç.', '6. adımda kaç lale sırası olur?'],
    goal: 1,
    note: 'Kuralı bilen, bahçenin istediği adımını hesaplayabilir!',
    picker: { q: 'Vız’ın tahminini nasıl kontrol ettin?', options: ['Kuralı kullandım', 'Tabloyu devam ettirdim', 'Ritmik saydım'] },
    auto: 'Kendi kuralını oluşturma',
  }
}

/* ───────────────────────────── paylaşım bağlantısı ───────────────────────────── */

/** r0112 → yineleyen çekirdek; g1-2 → büyüyen (c=1, d=2) */
export function parseShare(code: string | null): { core?: number[]; grow?: { c: number; d: number } } | null {
  if (!code) return null
  const r = /^r([0-3]{2,4})$/.exec(code)
  if (r) {
    const core = r[1].split('').map(Number)
    if (new Set(core).size >= 2 && period(core) === core.length) return { core }
  }
  const g = /^g([0-3])-([1-4])$/.exec(code)
  if (g) return { grow: { c: Number(g[1]), d: Number(g[2]) } }
  return null
}

function friendLevel(sh: { core?: number[]; grow?: { c: number; d: number } }): Level {
  if (sh.grow) return gBuild(sh.grow, true)
  const core = sh.core!
  const given = core.length * 2 + 1
  return {
    kind: 'extend',
    stage: 'Problem',
    title: 'Arkadaşının bahçesi',
    prompt: 'Bir arkadaşın sana bir örüntü gönderdi! Çekirdeği bul ve örüntüyü devam ettir.',
    hints: ['Tekrar eden parça hangisi?', 'Son çiçekten sonra çekirdekte hangisi gelir?'],
    goal: 1,
    note: `Arkadaşının çekirdeği: ${codeOf(core)}.`,
    core,
    len: given + core.length + 1,
    given,
    kinds: [0, 1, 2, 3],
    friend: true,
    auto: 'Çekirdeği bulma',
  }
}

export function buildLevels(grade: Grade, share: string | null): Level[] {
  let out: Level[]
  if (grade <= 1) {
    out = [
      g1Extend('AB', 6, 4, 'Sıradaki çiçek', 'Somut'),
      g1Extend('ABB', 7, 5, 'Bir kırmızı, iki mavi', 'Model'),
      g1Fix(),
      g1Remake(),
      g1Extend('ABC', 5, 4, 'Üç renkli tarh', 'Sembol'),
      design(1),
    ]
  } else if (grade === 2) {
    out = [g2Core(), g2Fix(), g2Translate(), g2Family(), far(2), design(2)]
  } else {
    const g = growPick()
    out = [gBuild(g), gTable(g), gRule(g), gPredict(g), far(3), gDesign()]
  }
  const sh = parseShare(share)
  if (sh) out = [friendLevel(sh), ...out]
  return out
}
