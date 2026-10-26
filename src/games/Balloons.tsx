import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, CheckCheck, Search, Sparkles, Star } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { ek } from '../lib/generators'
import { useTracker } from '../lib/trackerContext'
import { starsFor, useWidth, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from './kit2'

/**
 * Balon Sınıflandırıcı (Van de Walle):
 *  - Balonlar gökyüzünde yavaşça süzülür; süre, can, kaçan balon yok.
 *  - Çocuk balonları kurala göre sepetlere ayırır, gizli kuralı örnek ve karşı örneklerle keşfeder,
 *    bir grubu anlatan birden çok kural bulur, işlem sonuçlarını hesaplamadan tahmin eder.
 *  - Yanlışta “Henüz değil”: hatanın kaynağını düşündüren soru (Nudge) ve gerekirse model.
 */

interface Ask { q: string; mis?: string; tool?: ManipulativeTool; cfg?: ManipulativeConfig }
interface Item { id: number; v: number; label: string; kind: 'num' | 'expr' | 'dots'; ask?: (placed: number) => Ask }
interface Rule { id: string; text: string; short: string; test: (v: number) => boolean; ask: (it: Item, fits: boolean) => Ask }
type Kind = 'sort' | 'grid' | 'guess' | 'create' | 'estimate'
interface Task {
  kind: Kind
  items: Item[]
  baskets: string[]
  truth: (it: Item) => number
  ask: (it: Item, placed: number) => Ask
  /** Başta sepete konmuş (kilitli) balonlar */
  pre: number[]
  rule?: Rule
  cards?: Rule[]
  anchor?: number
  doneNote?: string
}
type Phase = 'sort' | 'choose' | 'closest' | 'done'

// ───────────────────────── yardımcılar ─────────────────────────

let uid = 0
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const isPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}
const digitSum = (n: number) => String(Math.abs(n)).split('').reduce((s, d) => s + Number(d), 0)
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)
const r10 = (n: number) => Math.round(n / 10) * 10
const r100 = (n: number) => Math.round(n / 100) * 100

const numItem = (v: number): Item => ({ id: uid++, v, label: fmt(v), kind: 'num' })
const dotItem = (v: number): Item => ({ id: uid++, v, label: `${v} nokta`, kind: 'dots' })
const exprItem = (label: string, v: number, ask?: (placed: number) => Ask): Item => ({ id: uid++, v, label, kind: 'expr', ask })

/** Aralıktan koşula uyan, daha önce kullanılmamış n sayı */
function pickVals(min: number, max: number, test: (v: number) => boolean, n: number, used: Set<number>): number[] {
  const out = shuffle(range(min, max).filter((v) => test(v) && !used.has(v))).slice(0, n)
  out.forEach((v) => used.add(v))
  return out
}

// ───────────────────────── kurallar ─────────────────────────

const gt = (n: number, max: number): Rule => ({
  id: `gt${n}`, text: `${ek(n, 'abl')} büyük sayılar`, short: `${ek(n, 'abl')} büyük`, test: (v) => v > n,
  ask: (it) => ({ q: `${it.v} sayı doğrusunda ${ek(n, 'gen')} sağında mı, solunda mı? Büyük sayılar hangi yanda durur?`, tool: 'numberline', cfg: { min: 0, max, step: 1 } }),
})
const lt = (n: number, max: number): Rule => ({
  id: `lt${n}`, text: `${ek(n, 'abl')} küçük sayılar`, short: `${ek(n, 'abl')} küçük`, test: (v) => v < n,
  ask: (it) => ({ q: `${it.v} sayı doğrusunda ${ek(n, 'gen')} solunda mı, sağında mı? Küçük sayılar hangi yanda durur?`, tool: 'numberline', cfg: { min: 0, max, step: 1 } }),
})

const tensDigit = (v: number) => Math.floor(v / 10) % 10
/** Tek/çift kararında onlar basamağına bakma yanılgısı */
const parityMis = (v: number, actualEven: boolean) =>
  v >= 10 && tensDigit(v) % 2 === (actualEven ? 1 : 0) ? 'Tek/çift kararını onlar basamağına bakarak verdi' : actualEven ? 'Çift bir sayıyı tek sandı' : 'Tek bir sayıyı çift sandı'
const pairAsk = (it: Item, actualEven: boolean): Ask => ({
  q: `${it.v} tane kurabiyeyi ikişerli gruplasan eşi olmayan bir kurabiye kalır mı? Birler basamağı ne söylüyor?`,
  mis: parityMis(it.v, actualEven),
  tool: it.v <= 20 ? 'tenframe' : 'yuzluk',
  cfg: it.v <= 20 ? { frames: 2 } : undefined,
})
const even: Rule = { id: 'even', text: 'Çift sayılar', short: 'çift', test: (v) => v % 2 === 0, ask: (it, fits) => pairAsk(it, fits) }
const odd: Rule = { id: 'odd', text: 'Tek sayılar', short: 'tek', test: (v) => v % 2 === 1, ask: (it, fits) => pairAsk(it, !fits) }

const mult = (k: number, text = `${ek(k, 'gen')} katları`, short = `${ek(k, 'gen')} katı`): Rule => ({
  id: `m${k}`, text, short, test: (v) => v > 0 && v % k === 0,
  ask: (it, fits) => ({
    q: `${ek(k, 'dist')} sayarken ${it.v} sayısına uğrar mısın? ${k}, ${2 * k}, ${3 * k}… diye saymayı dene.`,
    mis: !fits && it.v % 10 === k % 10 ? 'Katı olup olmadığına yalnız birler basamağına bakarak karar verdi' : undefined,
    tool: 'yuzluk',
  }),
})

const div = (k: number): Rule => ({
  id: `d${k}`, text: `${ek(k, 'dat')} tam bölünen sayılar`, short: `${ek(k, 'dat')} bölünür`, test: (v) => v % k === 0,
  ask: (it, fits) => {
    const v = it.v
    if (k === 3 || k === 9)
      return {
        q: `${ek(v, 'gen')} rakamlarını topla: kaç oldu? O toplam ${ek(k, 'dat')} bölünür mü?`,
        mis: !fits && (v % 10) % 3 === 0 && v % 10 !== 0 ? 'Bölünebilmeye birler basamağına bakarak karar verdi' : k === 9 && !fits && v % 3 === 0 ? '3’e bölünen her sayının 9’a da bölüneceğini sandı' : undefined,
        tool: 'carpanagaci',
      }
    if (k === 5 || k === 10 || k === 2) return { q: `${ek(v, 'gen')} birler basamağı kaç? ${ek(k, 'dat')} bölünen sayıların birler basamağı nasıl olur?` }
    if (k === 4) return { q: `${v} = ${v - (v % 100)} + ${v % 100} diye düşün: yüzlükler hep 4’e bölünür. Son iki basamak ${v % 100} 4’e bölünür mü?`, tool: 'carpanagaci' }
    return { q: `${v} hem 2’ye hem 3’e bölünür mü? İkisini de ayrı ayrı sına.`, tool: 'carpanagaci' }
  },
})
const ds9: Rule = {
  id: 'ds9', text: 'Rakamları toplamı 9’un katı olan sayılar', short: 'rakamları toplamı 9’un katı', test: (v) => digitSum(v) % 9 === 0,
  ask: (it) => ({ q: `${ek(it.v, 'gen')} rakamlarını topla. Toplam 9, 18, 27… gibi 9’un bir katı mı?` }),
}
const primeAsk = (it: Item, fits: boolean): Ask =>
  fits
    ? { q: `${ek(it.v, 'acc')} 1’den ve kendisinden başka hangi sayıya tam bölebilirsin? Bir tane bulabildin mi?`, mis: it.v === 2 ? '2’nin asal olduğunu fark etmedi (çift sayılar asal olmaz sandı)' : undefined, tool: 'carpanagaci' }
    : { q: `${ek(it.v, 'acc')} 2, 3, 5 ya da 7’ye bölmeyi dene. Tam bölen bir sayı var mı? Kaç böleni oldu?`, mis: it.v === 1 ? '1’i asal saydı' : it.v % 2 ? 'Tek sayıların hepsini asal sandı' : undefined, tool: 'carpanagaci' }
const prime: Rule = { id: 'prime', text: 'Asal sayılar', short: 'asal', test: isPrime, ask: primeAsk }
const twoDiv: Rule = { id: 'twodiv', text: 'Tam iki böleni olan sayılar', short: 'tam iki böleni var', test: isPrime, ask: primeAsk }
const composite: Rule = { id: 'comp', text: 'Bileşik (asal olmayan) sayılar', short: 'bileşik', test: (v) => v > 1 && !isPrime(v), ask: (it, fits) => primeAsk(it, !fits) }

const tens = (d: number): Rule => ({
  id: `t${d}`, text: `Onlar basamağı ${d} olan sayılar`, short: `onlar basamağı ${d}`, test: (v) => v >= 10 && v < 100 && tensDigit(v) === d,
  ask: (it, fits) => ({ q: `${it.v} kaç onluk ve kaç birlikten oluşur? Onlukları say.`, mis: !fits && it.v % 10 === d ? 'Onlar ve birler basamağını karıştırdı' : undefined, tool: 'base10' }),
})
const round500: Rule = {
  id: 'r500', text: 'Yüzlüğe yuvarlanınca 500 olan sayılar', short: 'yüzlüğe yuvarlanınca 500', test: (v) => r100(v) === 500,
  ask: (it) => {
    const lo = Math.floor(it.v / 100) * 100
    return { q: `${it.v}, ${lo} ile ${lo + 100} arasında. Ortası ${lo + 50}. ${it.v} hangisine daha yakın?`, tool: 'numberline', cfg: { min: lo, max: lo + 100, step: 10 } }
  },
}
const dots5: Rule = {
  id: 'dots5', text: '5’ten çok noktası olanlar', short: '5’ten çok', test: (v) => v > 5,
  ask: () => ({ q: 'Noktalara bak: üstteki 5’lik sıra doldu mu? Alttaki sırada hiç nokta var mı?', tool: 'tenframe', cfg: { frames: 1 } }),
}
const sum10: Rule = {
  id: 'sum10', text: 'Toplamı 10 olan işlemler', short: 'toplamı 10', test: (v) => v === 10,
  ask: (it) => ({ q: `${it.label}: önce ilk sayı kadar nokta koy, sonra ikinciyi ekle. 10’luk çerçeve tam doldu mu, taştı mı, boş kaldı mı?`, tool: 'tenframe', cfg: { frames: 2 } }),
}
const product = (t: number): Rule => ({
  id: `p${t}`, text: `Sonucu ${t} olan çarpmalar`, short: `sonucu ${t}`, test: (v) => v === t,
  ask: (it) => ({ q: `${it.label}: kaç sıra, her sırada kaç nokta? Dizilimi kurup say ya da tekrarlı topla.`, tool: 'dizilim' }),
})

// ───────────────────────── görev üreticileri ─────────────────────────

const YES_NO = ['Kurala uyanlar', 'Uymayanlar']

function sortTask(rule: Rule, items: Item[], doneNote?: string): Task {
  return { kind: 'sort', items: shuffle(items), baskets: YES_NO, rule, pre: [], truth: (it) => (rule.test(it.v) ? 0 : 1), ask: (it) => rule.ask(it, rule.test(it.v)), doneNote }
}

/** Kurala uyan/uymayan 4+4 sayı; bait* ile kavram yanılgısını yoklayan “tuzak” sayılar */
function numSort(rule: Rule, min: number, max: number, baitPos?: (v: number) => boolean, baitNeg?: (v: number) => boolean, doneNote?: string): Task {
  const used = new Set<number>()
  const pos = baitPos ? pickVals(min, max, (v) => rule.test(v) && baitPos(v), 1, used) : []
  pos.push(...pickVals(min, max, rule.test, 4 - pos.length, used))
  const neg = baitNeg ? pickVals(min, max, (v) => !rule.test(v) && baitNeg(v), 2, used) : []
  neg.push(...pickVals(min, max, (v) => !rule.test(v), 4 - neg.length, used))
  return sortTask(rule, [...pos, ...neg].map(numItem), doneNote)
}

function gridTask(A: Rule, B: Rule, min: number, max: number, doneNote?: string): Task {
  const cls = (v: number) => (A.test(v) ? (B.test(v) ? 0 : 1) : B.test(v) ? 2 : 3)
  const used = new Set<number>()
  const vals: number[] = []
  for (let c = 0; c < 4; c++) vals.push(...pickVals(min, max, (v) => cls(v) === c, 2, used))
  while (vals.length < 8) vals.push(...pickVals(min, max, () => true, 1, used))
  return {
    kind: 'grid',
    items: shuffle(vals.map(numItem)),
    baskets: [`${cap(A.short)} ve ${B.short}`, `${cap(A.short)}, ${B.short} değil`, `${cap(B.short)}, ${A.short} değil`, `Ne ${A.short} ne ${B.short}`],
    pre: [],
    truth: (it) => cls(it.v),
    ask: (it, placed) => {
      const a = cls(it.v)
      const inA = a < 2, inB = a === 0 || a === 2
      const pA = placed < 2
      return pA !== inA ? A.ask(it, inA) : B.ask(it, inB)
    },
    doneNote,
  }
}

function guessTask(pool: Rule[], A: Rule, min: number, max: number): Task {
  const vals = range(min, max)
  const eq = pool.filter((r) => r.id !== A.id && vals.every((v) => r.test(v) === A.test(v)))
  const others = pool.filter((r) => r.id !== A.id && !eq.includes(r))
  for (let t = 0; t < 800; t++) {
    const ds = shuffle(others).slice(0, 3)
    const used = new Set<number>()
    // Örnekler hem gizli kurala hem de bir çeldiriciye uyar: kuralı bulmak için yeni balonlarla sınamak gerekir
    const ex = [...pickVals(min, max, (v) => A.test(v) && ds[0].test(v), 2, used), ...pickVals(min, max, (v) => !A.test(v) && !ds[0].test(v), 1, used)]
    if (ex.length < 3) continue
    const fresh = [...pickVals(min, max, A.test, 2, used), ...pickVals(min, max, (v) => !A.test(v), 2, used), ...pickVals(min, max, () => true, 1, used)]
    const all = [...ex, ...fresh]
    if (t < 700 && ds.some((r) => all.every((v) => r.test(v) === A.test(v)))) continue
    const exItems = ex.map(numItem)
    return {
      kind: 'guess',
      items: [...exItems, ...shuffle(fresh).map(numItem)],
      baskets: ['Kurala uyar', 'Uymaz'],
      pre: exItems.map((i) => i.id),
      rule: A,
      cards: shuffle([A, ...ds, ...eq.slice(0, 1)]),
      truth: (it) => (A.test(it.v) ? 0 : 1),
      ask: (it) => ({ q: `${it.label} için ne düşündün?` }),
    }
  }
  return numSort(A, min, max)
}

function createTask(cards: Rule[], A: Rule, failAll: Rule[], min: number, max: number, groupTest: (v: number) => boolean = () => true): Task {
  const used = new Set<number>()
  const group = pickVals(min, max, (v) => A.test(v) && groupTest(v), 4, used)
  const rest = pickVals(min, max, (v) => !A.test(v) && failAll.every((r) => !r.test(v)), 4, used)
  const inGroup = new Set(group)
  const items = shuffle([...group, ...rest].map(numItem))
  return {
    kind: 'create',
    items,
    baskets: ['Grup', 'Diğerleri'],
    pre: items.map((i) => i.id),
    cards: shuffle(cards),
    truth: (it) => (inGroup.has(it.v) ? 0 : 1),
    ask: (it) => ({ q: `${it.label} için ne düşündün?` }),
  }
}

function estimateTask(anchor: number, gen: () => Item | null): Task {
  const items: Item[] = []
  const dists = new Set<number>()
  let lo = 0, hi = 0
  for (let t = 0; t < 5000 && items.length < 6; t++) {
    const it = gen()
    if (!it) continue
    const d = Math.abs(it.v - anchor)
    if (d === 0 || dists.has(d) || items.some((x) => x.label === it.label)) continue
    if (it.v < anchor ? lo >= 3 : hi >= 3) continue
    if (it.v < anchor) lo++
    else hi++
    dists.add(d)
    items.push(it)
  }
  return {
    kind: 'estimate',
    items,
    anchor,
    baskets: [`${ek(anchor, 'abl')} az`, `${ek(anchor, 'abl')} çok`],
    pre: [],
    truth: (it) => (it.v < anchor ? 0 : 1),
    ask: (it, placed) => it.ask?.(placed) ?? { q: `${it.label} yaklaşık kaç eder?` },
  }
}

const sideQ = (anchor: number, word = 'sonuç') => `Gerçek ${word} ${ek(anchor, 'abl')} az mı, çok mu?`

function est50(): Item | null {
  if (Math.random() < 0.67) {
    const a = randInt(12, 39), b = randInt(12, 39)
    if (a % 10 === 0 || b % 10 === 0 || a + b < 36 || a + b > 64) return null
    return exprItem(`${a} + ${b}`, a + b, () => ({ q: `${a} + ${b} ≈ ${r10(a)} + ${r10(b)} = ${r10(a) + r10(b)}. Yuvarlarken sayıları büyüttün mü, küçülttün mü? ${sideQ(50, 'toplam')}`, tool: 'numberline', cfg: { min: 0, max: 100, step: 10 } }))
  }
  const a = randInt(55, 95), b = randInt(12, 45)
  if (a % 10 === 0 || b % 10 === 0 || a - b < 36 || a - b > 64) return null
  return exprItem(`${a} − ${b}`, a - b, () => ({ q: `${a} − ${b} ≈ ${r10(a)} − ${r10(b)} = ${r10(a) - r10(b)}. Hangi sayıyı büyüttün, hangisini küçülttün? ${sideQ(50, 'fark')}`, tool: 'numberline', cfg: { min: 0, max: 100, step: 10 } }))
}
function est500(): Item | null {
  if (Math.random() < 0.6) {
    const a = randInt(110, 390), b = randInt(110, 390)
    if (a + b < 420 || a + b > 580 || a % 100 === 0 || b % 100 === 0) return null
    return exprItem(`${a} + ${b}`, a + b, () => ({ q: `${a} + ${b} ≈ ${r100(a)} + ${r100(b)} = ${r100(a) + r100(b)}. Yuvarlarken ne kadar ekledin ya da çıkardın? ${sideQ(500, 'toplam')}`, tool: 'numberline', cfg: { min: 0, max: 1000, step: 100 } }))
  }
  const a = randInt(41, 99), b = randInt(5, 9)
  if (a * b < 420 || a * b > 580 || a % 10 === 0) return null
  return exprItem(`${a} × ${b}`, a * b, () => ({ q: `${a} × ${b} ≈ ${r10(a)} × ${b} = ${r10(a) * b}. ${ek(a, 'acc')} büyüttün mü, küçülttün mü? Bu, ${b} kez tekrarlanınca ne olur? ${sideQ(500)}`, tool: 'dizilim' }))
}
function est100(): Item | null {
  if (Math.random() < 0.7) {
    const a = randInt(5, 60), b = randInt(3, 12), c = randInt(3, 12)
    const v = a + b * c, alt = (a + b) * c
    if (v < 70 || v > 130) return null
    const altSide = alt < 100 ? 0 : 1
    const side = v < 100 ? 0 : 1
    if (Math.random() < 0.8 && altSide === side) return null
    return exprItem(`${a} + ${b} × ${c}`, v, (placed) =>
      placed === altSide && altSide !== side
        ? { q: `${a} + ${b} × ${c}: önce hangi işlem yapılır? Toplamayı önce yaparsan başka bir sonuç çıkar. Çarpmayı önce düşünürsen sonuç 100’e göre nerede?`, mis: 'İşlem önceliğini gözetmeden soldan sağa işlem yaptı' }
        : { q: `${a} + ${b} × ${c}: önce ${b} × ${c} yapılır. Bu çarpım yaklaşık kaç? Sonra ${a} eklersen ${sideQ(100)}` })
  }
  const a = randInt(6, 12), b = randInt(8, 12), c = randInt(4, 30)
  const v = a * b - c
  if (v < 70 || v > 130) return null
  return exprItem(`${a} × ${b} − ${c}`, v, () => ({ q: `${a} × ${b} yaklaşık kaç? Ondan ${c} çıkarınca 100’den az mı kalır, çok mu?` }))
}
function est1000(): Item | null {
  const a = randInt(21, 49), b = randInt(21, 49)
  const v = a * b
  if (v < 780 || v > 1220 || Math.abs(v - 1000) < 8 || a % 10 === 0 || b % 10 === 0) return null
  return exprItem(`${a} × ${b}`, v, () => ({ q: `${a} × ${b} ≈ ${r10(a)} × ${r10(b)} = ${fmt(r10(a) * r10(b))}. İki sayıyı da aynı yöne mi yuvarladın, yoksa biri büyüyüp biri mi küçüldü? ${sideQ(1000)}` }))
}

function dotsSort(): Task {
  const pos = shuffle(range(6, 10)).slice(0, 4)
  const neg = shuffle(range(1, 5)).slice(0, 4)
  return sortTask(dots5, [...pos, ...neg].map(dotItem), '5’lik sırayı dolduranlar ve taşanlar 5’ten çok! Saymadan nasıl anladın?')
}
function sum10Sort(): Task {
  const seen = new Set<string>()
  const items: Item[] = []
  while (items.length < 8) {
    const want = items.length < 4
    const s = want ? 10 : pick([8, 9, 11, 12])
    const a = randInt(Math.max(1, s - 9), Math.min(9, s - 1))
    const label = `${a} + ${s - a}`
    if (seen.has(label)) continue
    seen.add(label)
    items.push(exprItem(label, s))
  }
  return sortTask(sum10, items, '10’u yapan çiftler: 1 + 9, 2 + 8, 3 + 7… Bir sayı büyüyünce diğeri ne oluyor?')
}
function product24(): Task {
  const pos = shuffle(['3 × 8', '4 × 6', '2 × 12', '6 × 4', '8 × 3', '12 × 2']).slice(0, 4).map((l) => exprItem(l, 24))
  const neg = shuffle([['5 × 5', 25], ['3 × 7', 21], ['4 × 7', 28], ['5 × 4', 20], ['3 × 9', 27], ['6 × 3', 18]] as [string, number][]).slice(0, 4).map(([l, v]) => exprItem(l, v))
  return sortTask(product(24), [...pos, ...neg], '24’ü farklı dizilimlerle yapabildin: 3 × 8, 4 × 6… 8 × 3 ile 3 × 8 neden aynı?')
}

function buildTasks(g: Grade): Task[] {
  uid = 0
  switch (g) {
    case 1: {
      const pool = [gt(10, 20), lt(10, 20), lt(5, 20), gt(15, 20)]
      const [a1, a2] = shuffle([pool[0], pool[2], pool[3]])
      return [dotsSort(), numSort(gt(10, 20), 1, 20, undefined, (v) => v === 10, '10, 10’dan büyük değil; tam sınırda! Sınırdaki sayılar hep dikkat ister.'), guessTask(pool, a1, 1, 20), sum10Sort(), guessTask(pool, a2, 1, 20)]
    }
    case 2: {
      const c5 = mult(5, '5’er sayarken söylenen sayılar', '5’er sayarken söylenir')
      const c10 = mult(10, '10’ar sayarken söylenen sayılar', '10’ar sayarken söylenir')
      const pool = [even, odd, c5, c10, gt(50, 100), lt(30, 100)]
      const [a1, a2] = shuffle([even, c5, gt(50, 100), c10])
      const d = randInt(2, 8)
      return [
        numSort(even, 10, 60, (v) => tensDigit(v) % 2 === 1, (v) => tensDigit(v) % 2 === 0, 'Tek mi çift mi olduğunu birler basamağı söyler: 34 çift, 43 tek.'),
        guessTask(pool, a1, 1, 99),
        numSort(tens(d), 10, 99, undefined, (v) => v % 10 === d),
        createTask(pool, c10, [even, c5], 10, 99),
        guessTask(pool, a2, 1, 99),
      ]
    }
    case 3: {
      const pool = [mult(3), mult(4), mult(5), even, odd, gt(30, 60)]
      return [
        numSort(mult(3), 1, 40, undefined, (v) => v % 10 === 3),
        guessTask(pool, pick([mult(4), mult(5), mult(3)]), 1, 60),
        createTask(pool, mult(4), [even], 1, 60),
        estimateTask(50, est50),
        product24(),
      ]
    }
    case 4: {
      const both = { ...mult(6), id: 'both23', text: 'Hem 2’nin hem 3’ün katları', short: 'hem 2’nin hem 3’ün katı' }
      const pool = [mult(6), both, mult(3), mult(4), mult(8), even, odd, gt(50, 100)]
      return [
        gridTask(even, mult(3), 1, 40, 'Hem çift hem 3’ün katı olanlara bak: 6, 12, 18… Bunlar hangi sayının katları?'),
        guessTask(pool, pick([mult(6), mult(4), mult(8)]), 1, 100),
        createTask([mult(6), both, mult(3), even, mult(4), odd], mult(6), [mult(3), even], 1, 100),
        estimateTask(500, est500),
        numSort(round500, 300, 700, undefined, (v) => (v >= 430 && v < 450) || (v >= 550 && v < 570), 'Yuvarlarken ortadaki sayıya (450, 550) bakmak işe yarar!'),
      ]
    }
    case 5: {
      const pool = [div(3), div(9), div(5), div(10), even, ds9]
      return [
        numSort(div(3), 100, 999, undefined, (v) => [3, 6, 9].includes(v % 10)),
        guessTask(pool, pick([div(9), div(5), div(3)]), 100, 999),
        createTask(pool, div(9), [div(3)], 100, 999),
        estimateTask(100, est100),
        gridTask(even, div(5), 10, 200, 'Hem çift hem 5’e bölünenlerin birler basamağı hep 0. Neden başka bir rakam olamaz?'),
      ]
    }
    default: {
      const pool = [prime, composite, odd, even, div(4), div(6), twoDiv]
      return [
        numSort(prime, 1, 60, (v) => v === 2, (v) => v === 1 || (v % 2 === 1 && !isPrime(v))),
        gridTask(prime, even, 2, 40, 'Hem asal hem çift olan tek sayı 2! Neden başka çift asal sayı yok?'),
        guessTask(pool, pick([div(4), div(6), prime]), 2, 100),
        createTask([prime, twoDiv, odd, composite, div(4), even], prime, [odd], 3, 60, (v) => v % 2 === 1),
        estimateTask(1000, est1000),
      ]
    }
  }
}

// ───────────────────────── görseller ─────────────────────────

const COLORS = ['#e11d48', '#ea580c', '#d97706', '#16a34a', '#2563eb', '#9333ea', '#db2777', '#0d9488']
const BASKET_TONES = ['#16a34a', '#64748b', '#2563eb', '#9333ea']
const BALLOON_PATH = 'M40 4C19 4 6 20 6 39c0 22 18 38 30 43l-3 6h14l-3-6c12-5 30-21 30-43C74 20 61 4 40 4z'

function TenFrame({ n, x, y, cell, light }: { n: number; x: number; y: number; cell: number; light?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={cell * 5} height={cell * 2} rx={3} fill={light ? '#ffffffee' : '#fff'} stroke="#1f2340" strokeOpacity={0.5} strokeWidth={1} />
      {[1, 2, 3, 4].map((i) => <line key={i} x1={i * cell} x2={i * cell} y1={0} y2={cell * 2} stroke="#1f2340" strokeOpacity={0.3} strokeWidth={0.8} />)}
      <line x1={0} x2={cell * 5} y1={cell} y2={cell} stroke="#1f2340" strokeOpacity={0.3} strokeWidth={0.8} />
      {Array.from({ length: n }, (_, i) => <circle key={i} cx={(i % 5) * cell + cell / 2} cy={Math.floor(i / 5) * cell + cell / 2} r={cell * 0.34} fill="#1f2340" />)}
    </g>
  )
}

function BalloonArt({ it, color, w }: { it: Item; color: string; w: number }) {
  const vw = it.kind === 'expr' ? 112 : 80
  const len = it.label.length
  const fs = it.kind === 'expr' ? (len <= 7 ? 20 : len <= 9 ? 17.5 : len <= 11 ? 15.5 : 14) : len <= 2 ? 27 : len <= 3 ? 23 : 19
  return (
    <svg viewBox={`0 0 ${vw} 116`} width={w} height={(w * 116) / vw} className="block drop-shadow-md" aria-hidden>
      <g transform={`scale(${vw / 80} 1)`}>
        <path d={BALLOON_PATH} fill={color} />
        <ellipse cx={26} cy={24} rx={7} ry={11} fill="#fff" opacity={0.35} transform="rotate(-20 26 24)" />
      </g>
      <path d={`M${vw / 2} 88c-4 6 4 10 0 16c-3 5 2 7 0 11`} stroke="#64748b" strokeWidth={1.5} fill="none" />
      {it.kind === 'dots' ? (
        <TenFrame n={it.v} x={15} y={27} cell={10} light />
      ) : (
        <text x={vw / 2} y={48} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#fff" stroke="#00000055" strokeWidth={3} paintOrder="stroke">{it.label}</text>
      )}
    </svg>
  )
}

function BasketArt({ tone }: { tone: string }) {
  return (
    <svg viewBox="0 0 200 34" preserveAspectRatio="none" className="block h-8 w-full" aria-hidden>
      <path d="M6 4 H194 L180 32 H20 Z" fill="#d6a15b" />
      {Array.from({ length: 13 }, (_, i) => <line key={i} x1={14 + i * 14.4} x2={22 + i * 12.8} y1={6} y2={31} stroke="#9a6a2c" strokeWidth={2} />)}
      <line x1={12} x2={188} y1={18} y2={18} stroke="#9a6a2c" strokeWidth={2} />
      <rect x={2} y={1} width={196} height={7} rx={3.5} fill={tone} opacity={0.9} />
    </svg>
  )
}

const CSS = `
@keyframes bal-bob { 0%,100% { transform: translateY(0) rotate(-2deg) } 50% { transform: translateY(-9px) rotate(2deg) } }
@keyframes bal-cloud { from { transform: translateX(-24px) } to { transform: translateX(24px) } }
@keyframes bal-glow { 0%,100% { box-shadow: 0 0 0 3px #fbbf24 } 50% { box-shadow: 0 0 0 7px #fbbf2477 } }
`

const KIND_CHIP: Record<Kind, string> = { sort: '🧺 Sınıflandır', grid: '🧺 İki kural', guess: '🔍 Gizli kural', create: '✏️ Kural bul', estimate: '🤔 Tahmin et' }
const PICK: Partial<Record<Kind, { q: string; o: string[] }>> = {
  guess: { q: 'Kuralı nasıl buldun?', o: ['Örneklere baktım', 'Karşı örnek aradım', 'Ortak özellik buldum', 'Tahmin edip sınadım'] },
  create: { q: 'Kuralları nasıl buldun?', o: ['Grubun ortak özelliğine baktım', 'Diğerlerinde olmayanı aradım', 'Bir kuralı deneyip sınadım'] },
  estimate: { q: 'Nasıl tahmin ettin?', o: ['Yuvarladım', 'Bileşenleri karşılaştırdım', 'Tam hesapladım'] },
}

const INSIGHT: Record<number, string> = {
  1: 'Bir kurala karar verirken her balonu sınadın: 5’lik sırayı taşıyor mu, 10’dan büyük mü? Örnekler, gizli kuralın ipuçlarıdır.',
  2: 'Tek mi çift mi olduğunu birler basamağı söyler; aynı balon grubunu “10’ar sayarken söylenir” ya da “çift” gibi farklı kurallarla da anlatabilirsin.',
  3: 'Gizli kuralı örnekler ve karşı örneklerle buldun; bir grubu anlatan birden çok kural olabilir (4’ün katları hep çifttir).',
  4: '6’nın katları aynı zamanda hem 2’nin hem 3’ün katıdır: aynı grubu farklı kurallar anlatabilir. Tahminde yuvarlamak hesaplamadan önce yön gösterir.',
  5: '9’a bölünen sayıların rakamları toplamı da 9’un katıdır; işlem önceliğini düşünmek tahmini bile değiştirir.',
  6: 'Bir kuralı bir karşı örnek çürütür: 9 tek ama asal değil, 2 çift ama asal. Kuralları her zaman tüm örneklerle sına.',
}

// ───────────────────────── oyun ─────────────────────────

interface NudgeState { q: string; mis?: string; tool?: ManipulativeTool; cfg?: ManipulativeConfig; tone: 'think' | 'ok'; k: number }

const initPlace = (t: Task) => Object.fromEntries(t.items.map((it) => [it.id, t.pre.includes(it.id) ? t.truth(it) : null])) as Record<number, number | null>
const initPhase = (t: Task): Phase => (t.kind === 'create' ? 'choose' : 'sort')
const consistent = (t: Task, r: Rule) => t.items.every((it) => r.test(it.v) === (t.truth(it) === 0))

export default function Balloons({ grade, onFinish }: GameProps) {
  const [tasks] = useState(() => buildTasks(grade))
  const [ti, setTi] = useState(0)
  const task = tasks[ti]
  const [place, setPlace] = useState(() => initPlace(tasks[0]))
  const [phase, setPhase] = useState<Phase>(() => initPhase(tasks[0]))
  const [sel, setSel] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  const [surprise, setSurprise] = useState<number[]>([])
  const [tried, setTried] = useState<string[]>([])
  const [found, setFound] = useState<string[]>([])
  const [closest, setClosest] = useState<number | null>(null)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const firstTry = useRef(true)
  const stats = useRef({ first: 0, extra: 0, score: 0, rules: 0, over: false })
  const nk = useRef(0)
  const track = useTracker()
  const sol = useSolutions()
  const [skyRef, skyW] = useWidth<HTMLDivElement>()
  const big = grade <= 3

  const say = (n: Omit<NudgeState, 'k'>) => setNudge({ ...n, k: ++nk.current })
  const isLocked = (id: number) => task.pre.includes(id) || (task.kind === 'guess' && place[id] != null)
  const colorOf = (it: Item) => COLORS[(it.id * 5) % COLORS.length]
  const sky = task.items.filter((it) => place[it.id] == null)
  const skySlots = task.items.filter((it) => !task.pre.includes(it.id))
  const valid = task.cards ? task.cards.filter((r) => consistent(task, r)) : []
  const goal = task.kind === 'create' ? Math.min(2, valid.length) : 1
  const best = task.anchor !== undefined ? task.items.reduce((b, it) => (Math.abs(it.v - task.anchor!) < Math.abs(b.v - task.anchor!) ? it : b), task.items[0]) : null

  // ── etkileşimler ──
  const tapSky = (id: number) => {
    if (phase !== 'sort') return
    setSel(sel === id ? null : id)
  }
  const tapSkyBg = () => {
    if (phase !== 'sort' || sel === null || place[sel] == null || isLocked(sel)) return
    setPlace({ ...place, [sel]: null })
    setSel(null)
  }
  const tapMini = (id: number) => {
    if (phase === 'closest') return pickClosest(id)
    if (phase !== 'sort') return
    // Başka bir balon seçiliyken sepetteki balona dokunmak = o sepete bırakmak
    if (sel !== null && sel !== id && place[id] != null) return tapBasket(place[id]!)
    if (isLocked(id)) return
    setSel(sel === id ? null : id)
  }
  const tapBasket = (b: number) => {
    if (phase !== 'sort' || sel === null) return
    const it = task.items.find((x) => x.id === sel)!
    setSel(null)
    if (task.kind === 'guess') {
      const t = task.truth(it)
      const ok = b === t
      track.attempt(ok)
      const next = { ...place, [it.id]: t }
      setPlace(next)
      if (ok) {
        sfx.ok()
        setNudge(null)
      } else {
        setSurprise([...surprise, it.id])
        say({ q: `Sürpriz! ${it.label} “${task.baskets[t]}” sepetine gitti. Bu yeni ipucu gizli kural hakkında ne söylüyor?`, tone: 'think' })
      }
      if (task.items.every((x) => next[x.id] != null)) setPhase('choose')
      return
    }
    setPlace({ ...place, [it.id]: b })
    setWrong(wrong.filter((x) => x !== it.id))
  }

  const check = () => {
    const bad = task.items.filter((it) => !task.pre.includes(it.id) && place[it.id] !== task.truth(it))
    track.attempt(bad.length === 0)
    if (!bad.length) {
      sfx.ok()
      setWrong([])
      if (task.kind === 'estimate') {
        setPhase('closest')
        say({ q: 'Hepsi doğru sepette! Hâlâ hesaplama yok: sence hangisi en yakın?', tone: 'ok' })
      } else {
        setPhase('done')
        say({ q: task.doneNote ?? 'Harika! Her balonu kurala göre tek tek sınadın.', tone: 'ok' })
      }
      return
    }
    firstTry.current = false
    setWrong(bad.map((b) => b.id))
    const it = bad[0]
    const a = task.ask(it, place[it.id]!)
    say({ q: `Henüz değil: ${bad.length} balon parlıyor. ${a.q}`, mis: a.mis, tool: a.tool, cfg: a.cfg, tone: 'think' })
  }

  const pickCard = (r: Rule) => {
    if (phase !== 'choose' || tried.includes(r.id) || found.includes(r.id)) return
    const ok = consistent(task, r)
    track.attempt(ok)
    if (task.kind === 'guess') {
      if (ok) {
        sfx.ok()
        setFound([r.id])
        setPhase('done')
        stats.current.rules++
        say({ q: `Evet! Gizli kural: “${r.text}”. Sepetlerdeki bütün balonlar bu kurala uyuyor.`, tone: 'ok' })
        return
      }
      firstTry.current = false
      setTried([...tried, r.id])
      const c = task.items.find((it) => r.test(it.v) !== (task.truth(it) === 0))!
      say({ q: `“${r.text}” kuralına göre ${c.label} “${task.baskets[r.test(c.v) ? 0 : 1]}” sepetinde olmalıydı. Öyle mi? Başka bir kuralı sına.`, mis: 'Kuralı tüm örneklerle sınamadan seçti', tone: 'think' })
      return
    }
    // Kural bul: birden çok doğru kural
    if (ok) {
      if (!sol.list.some((s) => s.key === r.id)) sol.add(r.id, cap(r.short))
      const nf = [...found, r.id]
      setFound(nf)
      stats.current.rules++
      if (nf.length >= goal) {
        setPhase('done')
        const [a, b] = nf.map((id) => task.cards!.find((c) => c.id === id)!.short)
        say({ q: nf.length > 1 ? `İki farklı kural aynı grubu anlatıyor: “${a}” ve “${b}”. Sence neden ikisi de aynı balonları seçiyor?` : `Doğru: “${r.text}”!`, tone: 'ok' })
      } else say({ q: `Doğru: “${r.text}”! Şimdi başka bir kural bul: aynı grubu farklı bir özellikle anlatabilir misin?`, tone: 'ok' })
      return
    }
    if (!found.length) firstTry.current = false
    setTried([...tried, r.id])
    const out = task.items.find((it) => task.truth(it) === 0 && !r.test(it.v))
    const extra = task.items.find((it) => task.truth(it) === 1 && r.test(it.v))
    say({
      q: out ? `${out.label} grupta ama “${r.short}” kuralına uymuyor. Kural gruptaki her balona uymalı.` : `“${r.short}” kuralına ${extra!.label} de uyuyor ama o grupta değil. Kural yalnızca gruptakileri seçmeli.`,
      mis: 'Kuralı grubun tamamıyla sınamadan seçti',
      tone: 'think',
    })
  }

  const pickClosest = (id: number) => {
    if (!best || task.anchor === undefined) return
    const it = task.items.find((x) => x.id === id)!
    const ok = id === best.id
    track.attempt(ok)
    setClosest(id)
    setPhase('done')
    const d = (x: Item) => fmt(Math.abs(x.v - task.anchor!))
    if (ok) {
      sfx.ok()
      stats.current.score += 3
      say({ q: `Evet! ${it.label} = ${fmt(it.v)}, ${ek(task.anchor, 'dat')} yalnızca ${d(it)} uzak. Hesaplamadan nasıl anladın?`, tone: 'ok' })
    } else say({ q: `En yakını ${best.label} = ${fmt(best.v)} (${d(best)} uzak). Seçtiğin ${it.label} = ${fmt(it.v)} (${d(it)} uzak). Hangi ipucu seni yanılttı?`, tone: 'think' })
  }

  const next = () => {
    const s = stats.current
    if (s.over) return
    track.item(firstTry.current)
    if (firstTry.current) s.first++
    s.score += firstTry.current ? 10 : 6
    if (task.kind === 'create' && found.length > 1) {
      s.extra += found.length - 1
      s.score += (found.length - 1) * 5
    }
    if (ti + 1 >= tasks.length) {
      s.over = true
      onFinish({
        stars: starsFor((s.first + 0.5 * s.extra) / tasks.length),
        score: s.score,
        summary: `${tasks.length} görevi tamamladın${s.first ? `, ${s.first} tanesini ilk denemede çözdün` : ''}${s.rules ? `; ${s.rules} kural buldun` : ''}.`,
        insight: INSIGHT[grade] ?? INSIGHT[6],
      })
      return
    }
    const nt = tasks[ti + 1]
    setTi(ti + 1)
    setPlace(initPlace(nt))
    setPhase(initPhase(nt))
    setSel(null)
    setWrong([])
    setSurprise([])
    setTried([])
    setFound([])
    setClosest(null)
    setNudge(null)
    sol.reset()
    firstTry.current = true
  }

  // ── gökyüzü yerleşimi ──
  const hasExpr = task.items.some((i) => i.kind === 'expr')
  const hasDots = task.items.some((i) => i.kind === 'dots')
  const bw = hasExpr ? (big ? 108 : 104) : hasDots ? 88 : big ? 78 : 70
  const bh = (bw * 116) / (hasExpr ? 112 : 80)
  const W = Math.max(280, skyW)
  const maxCols = Math.max(2, Math.floor((W - 12) / (bw + 10)))
  const cols = Math.max(1, Math.ceil(skySlots.length / Math.ceil(skySlots.length / maxCols)))
  const cellW = (W - 12) / cols
  const rows = Math.ceil(skySlots.length / cols)
  const rowH = bh + 14
  const skyH = sky.length ? rows * rowH + 40 : 104
  const showSky = phase === 'sort' && task.kind !== 'create'

  const text: ReactNode = (() => {
    const r = task.rule
    if (task.kind === 'sort') return <>Kural: <span className="text-brand">“{r!.text}”</span>. Her balonu doğru sepete koy, sonra kontrol et.</>
    if (task.kind === 'grid') return <>İki kural birden: her balon hangi sepete gider? Bir balon iki kurala da uyabilir.</>
    if (task.kind === 'guess') return phase === 'sort' ? <>Gizli bir kuralım var! Örneklere bak, yeni balonların hangi sepete gideceğini tahmin et.</> : <>Şimdi kuralı bul: hangi kural sepetlerdeki <b>bütün</b> balonlara uyuyor?</>
    if (task.kind === 'create') return <>★ Gruptaki balonları diğerlerinden ayıran bir kural seç. Birden çok kural olabilir!</>
    return phase === 'sort'
      ? <>Hesaplamadan önce tahmin et: hangi işlemlerin sonucu {ek(task.anchor!, 'abl')} az, hangilerininki çok?</>
      : <>Yine hesaplamadan: hangisinin sonucu {ek(task.anchor!, 'dat')} en yakın? Bir balona dokun.</>
  })()

  const allPlaced = task.items.every((it) => place[it.id] != null)
  const picker = PICK[task.kind]

  return (
    <Scene grade={grade} className="animate-fade-up">
      <style>{CSS}</style>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={ti} total={tasks.length} />
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-white px-3 py-1 text-sm ring-1 ring-line">{KIND_CHIP[task.kind]}</span>
          {stats.current.rules > 0 && <span className="chip bg-amber-50 px-3 py-1 text-sm text-amber-800 ring-1 ring-amber-200"><Search size={14} />{stats.current.rules} kural</span>}
        </div>
      </div>

      <TaskCard step={ti + 1} total={tasks.length}>{text}</TaskCard>

      {/* Gökyüzü */}
      <div
        ref={skyRef}
        onClick={tapSkyBg}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-50 ring-1 ring-sky-200 transition-[height] duration-300 select-none ${showSky ? '' : 'hidden'}`}
        style={{ height: skyH }}
      >
        <div className="pointer-events-none absolute top-3 right-4 size-12 rounded-full bg-amber-200 shadow-[0_0_30px_10px_#fde68a]" aria-hidden />
        <div className="pointer-events-none absolute top-5 left-[8%] h-7 w-24 rounded-full bg-white/80" style={{ animation: 'bal-cloud 9s ease-in-out infinite alternate' }} aria-hidden />
        <div className="pointer-events-none absolute top-[45%] right-[18%] h-6 w-20 rounded-full bg-white/70" style={{ animation: 'bal-cloud 12s ease-in-out infinite alternate-reverse' }} aria-hidden />
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full" viewBox="0 0 400 32" preserveAspectRatio="none" aria-hidden>
          <path d="M0 22 Q60 6 120 20 T240 18 T400 16 V32 H0 Z" fill="#86efac" />
          <path d="M0 28 Q80 16 170 26 T400 24 V32 H0 Z" fill="#4ade80" />
        </svg>
        {!sky.length && <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center text-base font-extrabold text-sky-900">Bütün balonlar sepette. {task.kind === 'guess' ? '' : 'Kontrol etmeye hazır mısın?'}</p>}
        {sky.map((it) => {
          const slot = skySlots.findIndex((s) => s.id === it.id)
          const col = slot % cols, row = Math.floor(slot / cols)
          const jit = ((it.id * 37) % 11) - 5
          const left = 6 + col * cellW + (cellW - bw) / 2 + Math.max(-8, Math.min(8, jit))
          const top = 10 + row * rowH + (col % 2 ? 8 : 0)
          const on = sel === it.id
          return (
            <button
              key={it.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                tapSky(it.id)
              }}
              aria-pressed={on}
              aria-label={`Balon ${it.label}${on ? ', seçili' : ''}`}
              className="absolute touch-manipulation animate-pop focus-visible:outline-none"
              style={{ left, top, transform: on ? 'translateY(-6px) scale(1.1)' : undefined, transition: 'transform 180ms', zIndex: on ? 5 : 1 }}
            >
              <span className="block" style={{ animation: `bal-bob ${3 + (it.id % 4) * 0.4}s ease-in-out ${(it.id % 5) * -0.7}s infinite` }}>
                {on && <span className="absolute inset-x-1 top-0 aspect-square rounded-full bg-amber-300/70 blur-md" aria-hidden />}
                <span className="relative block"><BalloonArt it={it} color={colorOf(it)} w={bw} /></span>
              </span>
            </button>
          )
        })}
      </div>
      {showSky && (
        <p className="mt-1.5 text-center text-sm font-bold text-ink-soft" aria-live="polite">
          {sel !== null ? 'Şimdi bir sepete dokun.' : sky.length ? 'Bir balona dokun, sonra sepete dokun.' : task.kind === 'guess' ? '' : 'Bir balonu değiştirmek için sepetteki balona dokun.'}
        </p>
      )}

      {/* Sepetler */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
        {task.baskets.map((label, b) => {
          const canDrop = phase === 'sort' && sel !== null && place[sel] !== b
          const inside = task.items.filter((it) => place[it.id] === b)
          const tone = task.kind === 'create' && b === 0 ? '#d97706' : task.kind === 'estimate' ? (b === 0 ? '#0891b2' : '#e11d48') : BASKET_TONES[b]
          const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              tapBasket(b)
            }
          }
          return (
            <div
              key={b}
              role="button"
              tabIndex={canDrop ? 0 : -1}
              aria-label={`${label} sepeti${canDrop ? ', buraya koy' : ''}`}
              onClick={() => tapBasket(b)}
              onKeyDown={onKey}
              className={`relative flex min-h-40 flex-col overflow-hidden rounded-3xl bg-white/85 px-2 pt-2 ring-2 transition ${canDrop ? 'cursor-pointer bg-amber-50 shadow-[0_0_0_5px_#fbbf2440] ring-amber-400' : 'ring-transparent'}`}
              style={{ boxShadow: canDrop ? undefined : `inset 0 0 0 2px ${tone}33` }}
            >
              <p className="mx-auto flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-center text-sm leading-tight font-black text-white sm:text-base" style={{ background: tone }}>
                {task.kind === 'create' && b === 0 && <Star size={15} fill="currentColor" />}
                {label}
              </p>
              <div className="flex flex-1 flex-wrap content-start justify-center gap-1.5 py-2.5">
                {inside.map((it) => {
                  const locked = task.pre.includes(it.id)
                  const on = sel === it.id
                  const isWrong = wrong.includes(it.id)
                  const isSurprise = surprise.includes(it.id)
                  const picked = closest === it.id
                  const showVal = phase === 'done' && task.kind === 'estimate'
                  const clickable = (phase === 'sort' && (!isLocked(it.id) || sel !== null)) || phase === 'closest'
                  return (
                    <span key={it.id} className="relative flex flex-col items-center animate-pop">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          tapMini(it.id)
                        }}
                        disabled={!clickable}
                        aria-label={`${it.label}${locked ? ', örnek' : ''}${isWrong ? ', tekrar düşün' : ''}`}
                        aria-pressed={on || picked}
                        className={`relative flex items-center justify-center rounded-full px-3 font-black text-white tabular-nums shadow-[0_3px_0_rgb(0_0_0/0.15)] transition disabled:cursor-default ${big ? 'min-h-14 min-w-14 text-lg' : 'min-h-12 min-w-12 text-base'} ${on ? '-translate-y-1 ring-4 ring-amber-300' : ''} ${picked ? 'ring-4 ring-sky-400' : ''} ${locked && task.kind === 'guess' ? 'outline-2 outline-offset-2 outline-white outline-dashed' : ''} ${phase === 'closest' ? 'hover:-translate-y-0.5' : ''}`}
                        style={{ background: colorOf(it), animation: isWrong ? 'bal-glow 1.2s ease-in-out infinite' : undefined }}
                      >
                        {it.kind === 'dots' ? (
                          <svg viewBox="0 0 52 22" width={56} height={24} aria-hidden><TenFrame n={it.v} x={1} y={1} cell={10} /></svg>
                        ) : (
                          it.label
                        )}
                      </button>
                      {locked && task.kind === 'guess' && <span className="mt-0.5 text-[11px] font-extrabold text-ink-soft">örnek</span>}
                      {isSurprise && <span className="absolute -top-1.5 -right-1 grid size-5 place-items-center rounded-full bg-amber-400 text-xs font-black text-white ring-2 ring-white" aria-hidden>!</span>}
                      {showVal && <span className={`mt-0.5 text-xs font-black ${best?.id === it.id ? 'text-ok' : 'text-ink-soft'}`}>= {fmt(it.v)}</span>}
                    </span>
                  )
                })}
                {!inside.length && <span className="self-center text-sm font-bold text-ink-soft/70">{canDrop ? 'Buraya koy' : 'Boş'}</span>}
              </div>
              <BasketArt tone={tone} />
            </div>
          )
        })}
      </div>

      {/* Kural kartları */}
      {task.cards && (phase === 'choose' || phase === 'done') && (
        <div className="mt-4">
          <p className="mb-2 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Kural kartları</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {task.cards.map((r) => {
              const isFound = found.includes(r.id)
              const isTried = tried.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickCard(r)}
                  disabled={phase !== 'choose' || isFound || isTried}
                  className={`flex min-h-14 items-center gap-2 rounded-2xl px-4 py-2 text-left text-base font-extrabold ring-2 transition active:scale-[0.98] ${isFound ? 'bg-ok-soft text-green-900 ring-green-400' : isTried ? 'bg-slate-50 text-slate-400 ring-slate-200' : 'bg-white text-ink ring-line hover:ring-amber-300'} disabled:cursor-default`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-xl text-sm ${isFound ? 'bg-ok text-white' : isTried ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>{isFound ? <CheckCheck size={16} /> : isTried ? '?' : <Search size={15} />}</span>
                  <span className="min-w-0 flex-1">{r.text}{isTried && <span className="block text-xs font-bold">Bir karşı örnek var</span>}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {task.kind === 'create' && <SolutionList list={sol.list} goal={goal} />}

      {nudge && (
        <Nudge key={nudge.k} question={nudge.q} misconception={nudge.mis} tool={nudge.tool} toolConfig={nudge.cfg} tone={nudge.tone} onClose={nudge.tone === 'think' && !nudge.tool ? () => setNudge(null) : undefined} />
      )}

      {phase === 'done' && picker && <StrategyPicker key={ti} question={picker.q} options={picker.o} onPick={() => {}} />}

      {/* Kontroller */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {phase === 'sort' && task.kind !== 'guess' && (
          <button type="button" onClick={check} disabled={!allPlaced} className="btn-primary min-h-14 min-w-56 text-lg">
            <CheckCheck size={20} />Kontrol et
          </button>
        )}
        {phase === 'sort' && task.kind !== 'guess' && !allPlaced && <p className="w-full text-center text-xs font-bold text-ink-soft">Gökyüzünde {sky.length} balon var; hepsini yerleştirince kontrol edebilirsin.</p>}
        {(phase === 'done' || (task.kind === 'create' && found.length > 0)) && (
          <button type="button" onClick={next} className="btn-primary min-h-14 min-w-56 text-lg" autoFocus>
            {phase !== 'done' && <Sparkles size={18} />}
            {ti + 1 >= tasks.length ? 'Bitir' : phase === 'done' ? 'Sonraki görev' : 'Devam et'}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </Scene>
  )
}
