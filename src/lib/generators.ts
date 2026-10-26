import type { FillItem, MatchPair, QuizQuestion, SortRound, Visual } from '../data/types'
import { distinctInts, gcd, lcm, pick, randInt, shuffle } from './random'
import { fmt, fmtPlain } from './format'

/**
 * Soru üreteçleri. Her üreteç bir etkinlik türü için veri üretir.
 * Etkinlikte kullanım:  generator: { id: 'arith', params: { op: '+', max: 20 }, count: 10 }
 *
 * Tüm parametreler isteğe bağlıdır; varsayılanlar yorumda yazılıdır.
 */

type P = Record<string, unknown>
const num = (p: P, k: string, d: number) => (typeof p[k] === 'number' ? (p[k] as number) : d)
const str = (p: P, k: string, d: string): string => (typeof p[k] === 'string' ? (p[k] as string) : d)
const arr = <T,>(p: P, k: string, d: T[]) => (Array.isArray(p[k]) ? (p[k] as T[]) : d)
const bool = (p: P, k: string, d: boolean) => (typeof p[k] === 'boolean' ? (p[k] as boolean) : d)

type Gen<T> = { kind: 'fill' | 'quiz' | 'match' | 'sort'; doc: string; run: (p: P, count: number) => T[] }
const fill = (doc: string, run: (p: P, count: number) => FillItem[]): Gen<FillItem> => ({ kind: 'fill', doc, run })
const quiz = (doc: string, run: (p: P, count: number) => QuizQuestion[]): Gen<QuizQuestion> => ({ kind: 'quiz', doc, run })
const match = (doc: string, run: (p: P, count: number) => MatchPair[]): Gen<MatchPair> => ({ kind: 'match', doc, run })
const sort = (doc: string, run: (p: P, count: number) => SortRound[]): Gen<SortRound> => ({ kind: 'sort', doc, run })

/** Tekrarsız n öğe üretir */
function unique<T>(count: number, make: () => T, key: (t: T) => string = (t) => JSON.stringify(t)): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  let guard = 0
  while (out.length < count && guard++ < count * 40) {
    const v = make()
    const k = key(v)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(v)
    }
  }
  return out
}

function quizFromStrings(prompt: QuizQuestion['prompt'], correct: string, wrong: string[], explain?: string): QuizQuestion {
  const list = shuffle([correct, ...wrong.filter((w) => w !== correct).slice(0, 3)])
  return { prompt, choices: list, answer: list.indexOf(correct), explain }
}

type Op = '+' | '-' | '×' | '÷'
function arithPair(op: Op, min: number, max: number, maxResult: number): [number, number, number] {
  for (let i = 0; i < 100; i++) {
    if (op === '+') {
      const a = randInt(min, max), b = randInt(min, max)
      if (a + b <= maxResult) return [a, b, a + b]
    } else if (op === '-') {
      const a = randInt(min, max), b = randInt(min, max)
      if (a >= b) return [a, b, a - b]
    } else if (op === '×') {
      const a = randInt(min, max), b = randInt(min, max)
      if (a * b <= maxResult) return [a, b, a * b]
    } else {
      const b = randInt(Math.max(1, min), max), q = randInt(min, max)
      if (b * q <= maxResult) return [b * q, b, q]
    }
  }
  return op === '÷' ? [max, 1, max] : [min, min, op === '+' ? 2 * min : op === '×' ? min * min : 0]
}

const SHAPE_EMOJIS = ['🍎', '⭐', '🐟', '🎈', '🌸', '🚗', '🐞', '🍓', '⚽', '🦋', '🧁', '🍋']

export const generators = {
  /** Dört işlem. params: op ('+','-','×','÷' veya 'mix'), min=0, max=10, maxResult=∞, missing ('result'|'a'|'b'|'any') */
  arith: fill('Dört işlem (boşluk doldurma)', (p, count) => {
    const ops = str(p, 'op', '+') === 'mix' ? (['+', '-'] as Op[]) : str(p, 'op', '+') === 'mix4' ? (['+', '-', '×', '÷'] as Op[]) : [str(p, 'op', '+') as Op]
    const min = num(p, 'min', 0), max = num(p, 'max', 10), maxResult = num(p, 'maxResult', Infinity)
    const missing = str(p, 'missing', 'result')
    return unique(count, () => {
      const op = pick(ops)
      const [a, b, r] = arithPair(op, min, max, maxResult)
      const m = missing === 'any' ? pick(['result', 'a', 'b']) : missing
      if (m === 'a') return { text: `__ ${op} ${fmt(b)} = ${fmt(r)}`, answers: [String(a)] }
      if (m === 'b') return { text: `${fmt(a)} ${op} __ = ${fmt(r)}`, answers: [String(b)] }
      return { text: `${fmt(a)} ${op} ${fmt(b)} = __`, answers: [String(r)] }
    }, (x) => x.text)
  }),

  /** İşlem → sonuç eşleştirme. params: op, min, max, maxResult */
  arithMatch: match('İşlem-sonuç eşleştirme', (p, count) => {
    const ops = str(p, 'op', '+') === 'mix' ? (['+', '-'] as Op[]) : str(p, 'op', '+') === 'mix4' ? (['+', '-', '×', '÷'] as Op[]) : [str(p, 'op', '+') as Op]
    const min = num(p, 'min', 0), max = num(p, 'max', 10), maxResult = num(p, 'maxResult', Infinity)
    const used = new Set<number>()
    return unique(count, () => {
      const op = pick(ops)
      const [a, b, r] = arithPair(op, min, max, maxResult)
      return { left: `${fmt(a)} ${op} ${fmt(b)}`, right: fmt(r), r }
    }, (x) => (used.has(x.r) ? `dup${Math.random()}` : (used.add(x.r), String(x.r))))
      .filter((x, i, all) => all.findIndex((y) => y.r === x.r) === i)
      .map(({ left, right }) => ({ left, right }))
  }),

  /** Nesne sayma (emoji görselli). params: min=1, max=10, group (gruplama) */
  countObjects: fill('Nesneleri say', (p, count) => {
    const min = num(p, 'min', 1), max = num(p, 'max', 10), group = num(p, 'group', 0)
    return unique(count, () => {
      const n = randInt(min, max)
      const e = pick(SHAPE_EMOJIS)
      return { text: 'Kaç tane? __', answers: [String(n)], visual: { kind: 'emoji', emoji: e, count: n, group: group || undefined } as Visual }
    }, (x) => x.answers[0])
  }),

  /** Onluk çerçevedeki sayı. params: min=0, max=10 (max>10 ise 20'lik çerçeve) */
  tenframe: fill('Onluk çerçeve okuma', (p, count) => {
    const min = num(p, 'min', 0), max = num(p, 'max', 10)
    return unique(count, () => {
      const n = randInt(min, max)
      return { text: 'Çerçevede kaç sayaç var? __', answers: [String(n)], visual: { kind: 'tenframe', filled: n, size: max > 10 ? 20 : 10 } as Visual }
    }, (x) => x.answers[0])
  }),

  /** Karşılaştırma (<, >, =). params: min=0, max=20, decimals=0 (ondalık basamak), negatives=false */
  compare: fill('Sayıları karşılaştır', (p, count) => {
    const min = num(p, 'min', 0), max = num(p, 'max', 20), dec = num(p, 'decimals', 0)
    return unique(count, () => {
      const f = 10 ** dec
      const a = randInt(min * f, max * f) / f
      const b = Math.random() < 0.15 ? a : randInt(min * f, max * f) / f
      const sign = a < b ? '<' : a > b ? '>' : '='
      return { text: `${fmt(a)}  __  ${fmt(b)}`, answers: [sign], choices: ['<', '=', '>'] }
    }, (x) => x.text)
  }),

  /** Ritmik sayma dizisinde eksikleri bulma. params: step=2, start (rastgele), max=100, length=6, blanks=2, down=false */
  skipCount: fill('Ritmik sayma', (p, count) => {
    const step = num(p, 'step', 2), max = num(p, 'max', 100), len = num(p, 'length', 6), blanks = num(p, 'blanks', 2), down = bool(p, 'down', false)
    const steps = arr<number>(p, 'steps', [step])
    return unique(count, () => {
      const s = pick(steps)
      const span = s * (len - 1)
      const startMax = Math.max(0, Math.floor((max - span) / s))
      const base = randInt(0, startMax) * s
      const seq = Array.from({ length: len }, (_, i) => base + i * s)
      if (down) seq.reverse()
      const idx = shuffle(seq.map((_, i) => i).slice(1)).slice(0, blanks).sort((a, b) => a - b)
      return {
        text: seq.map((v, i) => (idx.includes(i) ? '__' : fmt(v))).join(', '),
        answers: idx.map((i) => String(seq[i])),
        hint: `${ek(s, 'dist')} ${down ? 'geriye' : 'ileriye'} say.`,
      }
    }, (x) => x.text)
  }),

  /** Aritmetik örüntüde sıradaki/eksik terim. params: min=1, max=50, stepMin=1, stepMax=10, length=5, down=false */
  numberPattern: fill('Sayı örüntüsü', (p, count) => {
    const minS = num(p, 'stepMin', 1), maxS = num(p, 'stepMax', 10), len = num(p, 'length', 5), start = num(p, 'max', 50)
    const down = bool(p, 'down', false)
    return unique(count, () => {
      const s = randInt(minS, maxS) * (down ? -1 : 1)
      const a0 = down ? randInt(s * -len, start + s * -len) : randInt(num(p, 'min', 1), start)
      const seq = Array.from({ length: len + 1 }, (_, i) => a0 + i * s)
      return { text: seq.slice(0, len).map(fmt).join(', ') + ', __', answers: [String(seq[len])], hint: 'Ardışık terimler arasındaki farka bak.' }
    }, (x) => x.text)
  }),

  /** Basamak değeri. params: digits=3 */
  placeValue: fill('Basamak değeri', (p, count) => {
    const d = num(p, 'digits', 3)
    const names = ['birler', 'onlar', 'yüzler', 'binler', 'on binler', 'yüz binler', 'milyonlar', 'on milyonlar', 'yüz milyonlar']
    return unique(count, () => {
      let n = randInt(10 ** (d - 1), 10 ** d - 1)
      for (let k = 0; k < 50 && new Set(String(n)).size < Math.min(d, 10); k++) n = randInt(10 ** (d - 1), 10 ** d - 1)
      const digits = String(n).split('').reverse()
      const i = randInt(0, d - 1)
      const askDigit = Math.random() < 0.5
      if (askDigit) return { text: `${fmt(n)} sayısının ${names[i]} basamağındaki rakam __`, answers: [digits[i]] }
      return { text: `${fmt(n)} sayısında ${digits[i]} rakamının basamak değeri __`, answers: [String(Number(digits[i]) * 10 ** i)] }
    }, (x) => x.text)
  }),

  /** Çözümleme: 300 + 40 + 5 = __ veya tersi. params: digits=3, reverse=false */
  expand: fill('Sayı çözümleme', (p, count) => {
    const d = num(p, 'digits', 3), rev = bool(p, 'reverse', false)
    return unique(count, () => {
      const n = randInt(10 ** (d - 1), 10 ** d - 1)
      const parts = String(n).split('').map((c, i, a) => Number(c) * 10 ** (a.length - 1 - i)).filter((v) => v > 0)
      if (!rev) return { text: `${parts.map(fmt).join(' + ')} = __`, answers: [String(n)] }
      const k = randInt(0, parts.length - 1)
      return { text: `${fmt(n)} = ${parts.map((v, i) => (i === k ? '__' : fmt(v))).join(' + ')}`, answers: [String(parts[k])] }
    }, (x) => x.text)
  }),

  /** Onluk taban blokları ile sayı okuma. params: maxHundreds=0 (0: sadece onluk-birlik), maxThousands=0 */
  blocks: fill('Bloklarla sayı', (p, count) => {
    const H = num(p, 'maxHundreds', 0), T = num(p, 'maxThousands', 0)
    return unique(count, () => {
      const th = T ? randInt(0, T) : 0, h = H ? randInt(0, H) : 0, t = randInt(0, 9), o = randInt(0, 9)
      const v = th * 1000 + h * 100 + t * 10 + o
      return { text: 'Modeldeki sayı __', answers: [String(v)], visual: { kind: 'blocks', thousands: th, hundreds: h, tens: t, ones: o } as Visual }
    }, (x) => x.answers[0])
  }),

  /** Sayıları sıralama. params: min=0, max=100, n=5, desc=false, decimals=0 */
  sortNumbers: sort('Sayıları sırala', (p, count) => {
    const min = num(p, 'min', 0), max = num(p, 'max', 100), n = num(p, 'n', 5), desc = bool(p, 'desc', false), dec = num(p, 'decimals', 0)
    return Array.from({ length: count }, () => {
      const f = 10 ** dec
      const vals = distinctInts(n, min * f, max * f).map((v) => v / f).sort((a, b) => (desc ? b - a : a - b))
      return {
        prompt: desc ? 'Sayıları büyükten küçüğe sırala.' : 'Sayıları küçükten büyüğe sırala.',
        items: vals.map((v) => fmt(v)),
        ends: desc ? ['En büyük', 'En küçük'] : ['En küçük', 'En büyük'],
      } satisfies SortRound
    })
  }),

  /** Kesir sıralama. params: dens=[2,3,4,6,8], n=4, sameDen=false, unit=false (birim kesirler) */
  sortFractions: sort('Kesirleri sırala', (p, count) => {
    const dens = arr<number>(p, 'dens', [2, 3, 4, 6, 8]), n = num(p, 'n', 4), sameDen = bool(p, 'sameDen', false), unit = bool(p, 'unit', false)
    return Array.from({ length: count }, () => {
      const items = new Map<number, string>()
      const d0 = pick(dens)
      let guard = 0
      while (items.size < n && guard++ < 200) {
        const d = sameDen ? d0 : pick(dens)
        const nu = unit ? 1 : randInt(1, d - 1)
        const v = nu / d
        if (![...items.keys()].some((k) => Math.abs(k - v) < 1e-9)) items.set(v, `[[${nu}/${d}]]`)
      }
      const sorted = [...items.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])
      return { prompt: 'Kesirleri küçükten büyüğe sırala.', items: sorted, ends: ['En küçük', 'En büyük'] } satisfies SortRound
    })
  }),

  /** Bir çokluğun kesri: 24'ün 3/4'ü. params: dens=[2,3,4,5], maxWhole=40, reverse=false (kesri verilen bütünü bul) */
  fractionOf: fill('Bir çokluğun kesri', (p, count) => {
    const dens = arr<number>(p, 'dens', [2, 3, 4, 5]), maxW = num(p, 'maxWhole', 40), rev = bool(p, 'reverse', false), unit = bool(p, 'unit', false)
    return unique(count, () => {
      const d = pick(dens)
      const nu = unit ? 1 : randInt(1, d - 1)
      const whole = d * randInt(1, Math.max(1, Math.floor(maxW / d)))
      const part = (whole / d) * nu
      if (rev) return { text: `Bir sayının [[${nu}/${d}]] kadarı ${fmt(part)} ise sayının tamamı __`, answers: [String(whole)] }
      return { text: `${gen(whole)} [[${nu}/${d}]] kadarı __`, answers: [String(part)] }
    }, (x) => x.text)
  }),

  /** Kesir modelini okuma (quiz). params: dens=[2,3,4,5,6,8], shape='circle'|'bar'|'rect'|'mix', improper=false */
  fractionModel: quiz('Modeldeki kesir', (p, count) => {
    const dens = arr<number>(p, 'dens', [2, 3, 4, 5, 6, 8]), sh = str(p, 'shape', 'mix'), improper = bool(p, 'improper', false)
    return unique(count, () => {
      const d = pick(dens)
      const nu = improper ? randInt(1, 2 * d - 1) : randInt(1, d - 1)
      const shape = sh === 'mix' ? pick(['circle', 'bar', 'rect'] as const) : (sh as 'circle' | 'bar' | 'rect')
      const correct = `[[${nu}/${d}]]`
      const wrong = [`[[${d}/${nu}]]`, `[[${d - nu > 0 ? d - nu : nu + 1}/${d}]]`, `[[${nu}/${d + 1}]]`, `[[${nu + 1}/${d}]]`].filter((w) => w !== correct)
      return quizFromStrings({ text: 'Boyalı kısmı gösteren kesir hangisi?', visual: { kind: 'fraction', num: nu, den: d, shape } }, correct, [...new Set(wrong)])
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Paydaları eşit kesirlerle toplama/çıkarma. params: dens=[3,4,5,6,8,10], op='+'|'-'|'mix' */
  fractionAddSub: fill('Kesirlerle toplama-çıkarma', (p, count) => {
    const dens = arr<number>(p, 'dens', [3, 4, 5, 6, 8, 10]), opP = str(p, 'op', 'mix')
    return unique(count, () => {
      const d = pick(dens)
      const op = opP === 'mix' ? pick(['+', '-']) : opP
      let a = randInt(1, d - 1), b = randInt(1, d - 1)
      if (op === '+' && a + b > d) b = Math.max(1, d - a)
      if (op === '-' && b > a) [a, b] = [b, a]
      const r = op === '+' ? a + b : a - b
      return { text: `[[${a}/${d}]] ${op} [[${b}/${d}]] = __ / ${d}`, answers: [String(r)] }
    }, (x) => x.text)
  }),

  /** Denk kesir: 2/3 = __/12. params: dens=[2,3,4,5], maxMult=5 */
  equivalentFraction: fill('Denk kesirler', (p, count) => {
    const dens = arr<number>(p, 'dens', [2, 3, 4, 5]), mm = num(p, 'maxMult', 5)
    return unique(count, () => {
      const d = pick(dens), nu = randInt(1, d - 1), k = randInt(2, mm)
      if (Math.random() < 0.5) return { text: `[[${nu}/${d}]] = __ / ${d * k}`, answers: [String(nu * k)] }
      return { text: `[[${nu}/${d}]] = ${nu * k} / __`, answers: [String(d * k)] }
    }, (x) => x.text)
  }),

  /** Çarpım tablosu. params: tables=[2..10], max=10, missing='result'|'any' */
  times: fill('Çarpım tablosu', (p, count) => {
    const tables = arr<number>(p, 'tables', [2, 3, 4, 5, 6, 7, 8, 9, 10]), max = num(p, 'max', 10), missing = str(p, 'missing', 'result')
    return unique(count, () => {
      const a = pick(tables), b = randInt(1, max)
      if (missing === 'any' && Math.random() < 0.5) return { text: `${a} × __ = ${a * b}`, answers: [String(b)] }
      return { text: `${a} × ${b} = __`, answers: [String(a * b)] }
    }, (x) => x.text)
  }),

  /** Kısa yoldan çarpma/bölme: 10, 100, 1000 ile. params: ops=['×','÷'] */
  powersOfTen: fill('10, 100, 1000 ile kısa yoldan işlem', (p, count) => {
    const ops = arr<string>(p, 'ops', ['×', '÷'])
    return unique(count, () => {
      const op = pick(ops), k = pick([10, 100, 1000])
      if (op === '×') {
        const a = randInt(2, 999)
        return { text: `${fmt(a)} × ${fmt(k)} = __`, answers: [String(a * k)] }
      }
      const q = randInt(2, 99)
      return { text: `${fmt(q * k)} ÷ ${fmt(k)} = __`, answers: [String(q)] }
    }, (x) => x.text)
  }),

  /** Tahmin: işlemi yuvarlayarak en yakın sonucu seç. params: op='+'|'-'|'×', digits=2 */
  estimate: quiz('İşlem sonucunu tahmin et', (p, count) => {
    const op = str(p, 'op', '+'), d = num(p, 'digits', 2)
    return unique(count, () => {
      const lo = 10 ** (d - 1), hi = 10 ** d - 1
      const a = randInt(lo, hi), b = op === '×' ? randInt(2, 9) : randInt(lo, hi)
      const [x, y] = op === '-' && b > a ? [b, a] : [a, b]
      const exact = op === '+' ? x + y : op === '-' ? x - y : x * y
      const r = 10 ** Math.max(1, d - 1)
      const est = Math.round(exact / r) * r
      const wrong = [est + 2 * r, Math.max(0, est - 2 * r), est + 4 * r].filter((w) => w !== est)
      return quizFromStrings(`${fmt(x)} ${op} ${fmt(y)} işleminin sonucu yaklaşık kaçtır?`, fmt(est), wrong.map((w) => fmt(w)))
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Saat okuma (quiz). params: minuteStep=60 (60: tam, 30: yarım, 15: çeyrek, 5), digital=false */
  clockRead: quiz('Saat kaç?', (p, count) => {
    const step = num(p, 'minuteStep', 30), digital = bool(p, 'digital', false)
    const label = (h: number, m: number) => `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`
    return unique(count, () => {
      const h = randInt(1, 12), m = step >= 60 ? 0 : randInt(0, 60 / step - 1) * step
      const wrong = [label(h % 12 + 1, m), label(h, (m + 30) % 60), label(m === 0 ? 12 : Math.max(1, Math.round(m / 5)), h * 5 % 60)]
      return quizFromStrings({ text: 'Saat kaçı gösteriyor?', visual: { kind: 'clock', h, m, digital } }, label(h, m), [...new Set(wrong)])
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Paraları sayma. params: coins=[1,5,10,20,50,100,200], n=3, kurus=false */
  moneyTotal: fill('Paraları say', (p, count) => {
    const coins = arr<number>(p, 'coins', [1, 5, 10, 20, 50]), n = num(p, 'n', 3)
    return unique(count, () => {
      const items = Array.from({ length: randInt(2, n) }, () => pick(coins)).sort((a, b) => b - a)
      const total = Math.round(items.reduce((s, c) => s + c, 0) * 100) / 100
      return { text: 'Toplam __ TL', answers: [fmtPlain(total, 2)], visual: { kind: 'money', items } as Visual }
    }, (x) => x.answers[0])
  }),

  /** Birim dönüştürme. params: kind='length'|'mass'|'time'|'volume'|'liquid'|'area', decimals=false */
  convert: fill('Birim dönüştürme', (p, count) => {
    const kind = str(p, 'kind', 'length')
    const table: Record<string, [string, string, number][]> = {
      length: [['m', 'cm', 100], ['km', 'm', 1000], ['cm', 'mm', 10], ['m', 'mm', 1000]],
      mass: [['kg', 'g', 1000], ['t', 'kg', 1000]],
      time: [['saat', 'dakika', 60], ['dakika', 'saniye', 60], ['gün', 'saat', 24], ['hafta', 'gün', 7], ['yıl', 'ay', 12]],
      liquid: [['L', 'mL', 1000]],
      volume: [['m³', 'dm³', 1000], ['dm³', 'cm³', 1000], ['dm³', 'L', 1]],
      area: [['m²', 'dm²', 100], ['dm²', 'cm²', 100], ['m²', 'cm²', 10000], ['km²', 'm²', 1000000]],
    }
    return unique(count, () => {
      const [big, small, k] = pick(table[kind] ?? table.length)
      const a = randInt(1, kind === 'time' ? 6 : 9)
      if (Math.random() < 0.5) return { text: `${fmt(a)} ${big} = __ ${small}`, answers: [String(a * k)] }
      return { text: `${fmt(a * k)} ${small} = __ ${big}`, answers: [String(a)] }
    }, (x) => x.text)
  }),

  /** Dikdörtgenin alanı/çevresi (birim kareli görsel). params: ask='area'|'perimeter'|'mix', max=8, grid=true */
  rectangle: fill('Dikdörtgenin alanı ve çevresi', (p, count) => {
    const ask = str(p, 'ask', 'mix'), max = num(p, 'max', 8), grid = bool(p, 'grid', true)
    return unique(count, () => {
      const w = randInt(2, max), h = randInt(1, Math.min(max, 6))
      const a = ask === 'mix' ? pick(['area', 'perimeter']) : ask
      const visual: Visual = { kind: 'area', w, h, showGrid: grid, labels: !grid }
      if (a === 'area') return { text: 'Alanı __ birimkare', answers: [String(w * h)], visual }
      return { text: 'Çevre uzunluğu __ birim', answers: [String(2 * (w + h))], visual }
    }, (x) => x.text + x.answers[0])
  }),

  /** Açı türü (dar/dik/geniş/doğru). params: straight=false (doğru açı dahil mi) */
  angleType: quiz('Açı türü', (p, count) => {
    const straight = bool(p, 'straight', false)
    const opts = straight ? ['Dar açı', 'Dik açı', 'Geniş açı', 'Doğru açı'] : ['Dar açı', 'Dik açı', 'Geniş açı']
    return unique(count, () => {
      const t = pick(straight ? [0, 1, 2, 3] : [0, 1, 2, 0, 2])
      const deg = t === 0 ? randInt(15, 80) : t === 1 ? 90 : t === 2 ? randInt(100, 170) : 180
      return { prompt: { text: 'Bu açı hangi türdendir?', visual: { kind: 'angle', degrees: deg } }, choices: opts, answer: t }
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Çarpanlar/katlar. params: ask='factorCount'|'multiple'|'isFactor', max=60 */
  factors: fill('Çarpan ve katlar', (p, count) => {
    const ask = str(p, 'ask', 'mix'), max = num(p, 'max', 60)
    return unique(count, () => {
      const a = ask === 'mix' ? pick(['factorCount', 'multiple']) : ask
      if (a === 'factorCount') {
        const n = randInt(6, max)
        const c = Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0).length
        return { text: `${n} sayısının __ tane pozitif böleni (çarpanı) vardır.`, answers: [String(c)] }
      }
      const n = randInt(3, 12), k = randInt(3, 9)
      return { text: `${n} sayısının ${k}. pozitif katı __`, answers: [String(n * k)] }
    }, (x) => x.text)
  }),

  /** EBOB / EKOK. params: ask='gcd'|'lcm'|'mix', max=60 */
  gcdLcm: fill('Ortak bölen ve ortak kat', (p, count) => {
    const ask = str(p, 'ask', 'mix'), max = num(p, 'max', 60)
    return unique(count, () => {
      const a0 = ask === 'mix' ? pick(['gcd', 'lcm']) : ask
      const g = randInt(2, 8)
      const a = g * randInt(1, Math.max(2, Math.floor(max / g / 2))), b = g * randInt(1, Math.max(2, Math.floor(max / g / 2)))
      if (a === b) return { text: `${a} ve ${a + g} sayılarının en büyük ortak böleni __`, answers: [String(gcd(a, a + g))] }
      if (a0 === 'gcd') return { text: `${a} ve ${b} sayılarının en büyük ortak böleni __`, answers: [String(gcd(a, b))] }
      return { text: `${a} ve ${b} sayılarının en küçük ortak katı __`, answers: [String(lcm(a, b))] }
    }, (x) => x.text)
  }),

  /** Bölünebilme (quiz). params: divisors=[2,3,4,5,6,9,10], max=999 */
  divisibility: quiz('Bölünebilme', (p, count) => {
    const divs = arr<number>(p, 'divisors', [2, 3, 4, 5, 6, 9, 10]), max = num(p, 'max', 999)
    return unique(count, () => {
      const d = pick(divs)
      const correct = d * randInt(Math.ceil(10 / d), Math.floor(max / d))
      const wrong: number[] = []
      let guard = 0
      while (wrong.length < 3 && guard++ < 100) {
        const w = randInt(10, max)
        if (w % d !== 0 && !wrong.includes(w)) wrong.push(w)
      }
      return quizFromStrings(`Aşağıdakilerden hangisi ${d} ile kalansız bölünür?`, String(correct), wrong.map(String))
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Asal mı? (quiz). params: max=100 */
  primes: quiz('Asal sayılar', (p, count) => {
    const max = num(p, 'max', 100)
    const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0)
    const primes = Array.from({ length: max }, (_, i) => i + 1).filter(isPrime)
    const comps = Array.from({ length: max }, (_, i) => i + 1).filter((n) => n > 3 && !isPrime(n))
    return unique(count, () => {
      if (Math.random() < 0.5) {
        const c = pick(primes)
        return quizFromStrings('Aşağıdakilerden hangisi asal sayıdır?', String(c), shuffle(comps).slice(0, 3).map(String))
      }
      const c = pick(comps)
      return quizFromStrings('Aşağıdakilerden hangisi asal sayı değildir?', String(c), shuffle(primes).slice(0, 3).map(String))
    }, (q) => q.choices.join())
  }),

  /** İşlem önceliği. params: max=10, parens=true */
  orderOfOps: fill('İşlem önceliği', (p, count) => {
    const max = num(p, 'max', 10), parens = bool(p, 'parens', true)
    return unique(count, () => {
      const a = randInt(1, max), b = randInt(1, max), c = randInt(1, max)
      const forms = [
        () => ({ t: `${a} + ${b} × ${c}`, v: a + b * c }),
        () => ({ t: `${(a + b) * c} - ${b} × ${c}`, v: a * c }),
        () => ({ t: `${a * b} ÷ ${b} + ${c}`, v: a + c }),
        ...(parens ? [() => ({ t: `(${a} + ${b}) × ${c}`, v: (a + b) * c }), () => ({ t: `${c} × (${a + b} - ${b})`, v: c * a })] : []),
      ]
      const f = pick(forms)()
      return { text: `${f.t} = __`, answers: [String(f.v)] }
    }, (x) => x.text)
  }),

  /** Tam sayılarla işlem. params: ops=['+','-','×','÷'], max=12 */
  integers: fill('Tam sayılarla işlem', (p, count) => {
    const ops = arr<string>(p, 'ops', ['+', '-']), max = num(p, 'max', 12)
    const s = (n: number) => (n < 0 ? `(${n})` : `(+${n})`)
    return unique(count, () => {
      const op = pick(ops)
      const a = randInt(-max, max) || 1, b = randInt(-max, max) || -1
      if (op === '÷') return { text: `${s(a * b)} ÷ ${s(b)} = __`, answers: [String(a)] }
      const r = op === '+' ? a + b : op === '-' ? a - b : a * b
      return { text: `${s(a)} ${op} ${s(b)} = __`, answers: [String(r)] }
    }, (x) => x.text)
  }),

  /** Ondalık işlemler. params: ops=['+','-'], decimals=1, max=20 */
  decimals: fill('Ondalık gösterimlerle işlem', (p, count) => {
    const ops = arr<string>(p, 'ops', ['+', '-']), dec = num(p, 'decimals', 1), max = num(p, 'max', 20)
    const f = 10 ** dec
    return unique(count, () => {
      const op = pick(ops)
      let a = randInt(1, max * f) / f, b = randInt(1, max * f) / f
      if (op === '-' && b > a) [a, b] = [b, a]
      if (op === '×') b = randInt(2, 9)
      const r = op === '+' ? a + b : op === '-' ? a - b : a * b
      return { text: `${fmtPlain(a)} ${op} ${fmtPlain(b)} = __`, answers: [fmtPlain(r)] }
    }, (x) => x.text)
  }),

  /** Kesir ↔ ondalık ↔ yüzde eşleştirme. */
  fracDecPct: match('Kesir, ondalık ve yüzde', (_p, count) => {
    const pool: [string, string, string][] = [
      ['[[1/2]]', '0,5', '%50'], ['[[1/4]]', '0,25', '%25'], ['[[3/4]]', '0,75', '%75'], ['[[1/5]]', '0,2', '%20'],
      ['[[2/5]]', '0,4', '%40'], ['[[1/10]]', '0,1', '%10'], ['[[3/10]]', '0,3', '%30'], ['[[7/10]]', '0,7', '%70'],
      ['[[1/20]]', '0,05', '%5'], ['[[3/5]]', '0,6', '%60'], ['[[9/10]]', '0,9', '%90'], ['[[1/100]]', '0,01', '%1'],
    ]
    return shuffle(pool).slice(0, count).map(([fr, de, pc]) => (Math.random() < 0.5 ? { left: fr, right: de } : { left: fr, right: pc }))
  }),

  /** Yüzde hesaplama: 200'ün %25'i. params: max=400 */
  percent: fill('Yüzde hesaplama', (p, count) => {
    const max = num(p, 'max', 400)
    return unique(count, () => {
      const pc = pick([10, 20, 25, 50, 75, 5, 30, 40])
      const base = pick([20, 40, 60, 80, 100, 120, 200, 300, 400].filter((b) => b <= max))
      return { text: `${gen(base)} %${pc}${poss(pc)} __`, answers: [fmtPlain((base * pc) / 100)] }
    }, (x) => x.text)
  }),

  /** Üslü ifadeler. params: maxBase=10, maxExp=4, negative=false */
  exponents: fill('Üslü ifadeler', (p, count) => {
    const mb = num(p, 'maxBase', 10), me = num(p, 'maxExp', 4), neg = bool(p, 'negative', false)
    return unique(count, () => {
      const kind = pick(neg ? ['val', 'neg', 'mul'] : ['val', 'mul', 'zero'])
      const b = randInt(2, mb)
      if (kind === 'val') {
        const e = randInt(2, b > 5 ? 2 : me)
        return { text: `${b}^{${e}} = __`, answers: [String(b ** e)] }
      }
      if (kind === 'zero') return { text: `${b}^{0} = __`, answers: ['1'] }
      if (kind === 'neg') {
        const e = randInt(1, 2)
        return { text: `${b}^{-${e}} = 1 / __`, answers: [String(b ** e)] }
      }
      const e1 = randInt(2, 6), e2 = randInt(2, 6)
      return { text: `${b}^{${e1}} · ${b}^{${e2}} = ${b}^{n} ise n = __`, answers: [String(e1 + e2)] }
    }, (x) => x.text)
  }),

  /** Karekök. params: max=15 (tam kare kökleri 1..max), between=false (iki tam sayı arası) */
  sqrt: fill('Kareköklü ifadeler', (p, count) => {
    const max = num(p, 'max', 15), between = bool(p, 'between', false)
    return unique(count, () => {
      if (between && Math.random() < 0.5) {
        const k = randInt(2, max - 1)
        const n = randInt(k * k + 1, (k + 1) * (k + 1) - 1)
        return { text: `√{${n}} sayısı __ ile __ arasındadır.`, answers: [String(k), String(k + 1)] }
      }
      const k = randInt(1, max)
      return { text: `√{${k * k}} = __`, answers: [String(k)] }
    }, (x) => x.text)
  }),

  /** Denklem çöz: ax + b = c. params: maxA=5, max=20, negatives=false */
  equation: fill('Denklem çözme', (p, count) => {
    const maxA = num(p, 'maxA', 5), max = num(p, 'max', 20), neg = bool(p, 'negatives', false)
    return unique(count, () => {
      const a = randInt(1, maxA), x = neg ? randInt(-max, max) : randInt(1, max), b = randInt(neg ? -max : 0, max)
      const c = a * x + b
      const lhs = `${a === 1 ? '' : a}x${b === 0 ? '' : b > 0 ? ` + ${b}` : ` - ${-b}`}`
      return { text: `${lhs} = ${c}  →  x = __`, answers: [String(x)] }
    }, (x) => x.text)
  }),

  /** Cebirsel ifadenin değeri: 3x + 2, x = 4 için. params: max=10 */
  evaluate: fill('Cebirsel ifadenin değeri', (p, count) => {
    const max = num(p, 'max', 10)
    return unique(count, () => {
      const a = randInt(2, 9), b = randInt(1, 15), x = randInt(1, max)
      const minus = Math.random() < 0.3 && a * x > b
      return { text: `x = ${x} için ${a}x ${minus ? '-' : '+'} ${b} = __`, answers: [String(minus ? a * x - b : a * x + b)] }
    }, (x) => x.text)
  }),

  /** Doğru orantı: 3 kalem 12 TL ise 5 kalem __ TL. */
  proportion: fill('Doğru orantı', (_p, count) => {
    const ctx = [
      ['kalem', 'TL'], ['defter', 'TL'], ['kg elma', 'TL'], ['saatte', 'km yol (aynı hızla)'], ['litre benzinle', 'km yol'], ['paket', 'bisküvi'],
    ]
    return unique(count, () => {
      const [thing, unit] = pick(ctx)
      const per = randInt(2, 15), a = randInt(2, 6), b = randInt(2, 9)
      if (a === b) return { text: `${a} ${thing} ${a * per} ${unit} ise ${b + 1} ${thing} __ ${unit}`, answers: [String((b + 1) * per)] }
      return { text: `${a} ${thing} ${a * per} ${unit} ise ${b} ${thing} __ ${unit}`, answers: [String(b * per)] }
    }, (x) => x.text)
  }),

  /** Oran sadeleştirme: 12 : 18 = __ : __ */
  ratio: fill('Oran', (p, count) => {
    const max = num(p, 'max', 10)
    return unique(count, () => {
      let a = randInt(1, max), b = randInt(1, max)
      const g0 = gcd(a, b); a /= g0; b /= g0
      if (a === b) b += 1
      const k = randInt(2, 6)
      return { text: `${a * k} : ${b * k} oranının en sade hâli __ : __`, answers: [String(a), String(b)] }
    }, (x) => x.text)
  }),

  /** Çemberin uzunluğu (π = 3). params: ask='circ'|'area'|'mix' */
  circle: fill('Çember ve daire (π = 3)', (p, count) => {
    const ask = str(p, 'ask', 'circ')
    return unique(count, () => {
      const r = randInt(1, 12)
      const a = ask === 'mix' ? pick(['circ', 'area']) : ask
      const useD = Math.random() < 0.4
      if (a === 'area') return { text: `Yarıçapı ${r} cm olan dairenin alanı (π = 3) __ cm²`, answers: [String(3 * r * r)] }
      return { text: `${useD ? `Çapı ${2 * r}` : `Yarıçapı ${r}`} cm olan çemberin uzunluğu (π = 3) __ cm`, answers: [String(6 * r)] }
    }, (x) => x.text)
  }),

  /** Pisagor üçlüleri ile hipotenüs/dik kenar. */
  pythagoras: fill('Pisagor bağıntısı', (_p, count) => {
    const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [20, 21, 29]]
    return unique(count, () => {
      const [a, b, c] = pick(triples)
      if (Math.random() < 0.6) return { text: `Dik kenarları ${a} cm ve ${b} cm olan dik üçgenin hipotenüsü __ cm`, answers: [String(c)] }
      return { text: `Hipotenüsü ${c} cm, bir dik kenarı ${a} cm olan dik üçgenin diğer dik kenarı __ cm`, answers: [String(b)] }
    }, (x) => x.text)
  }),

  /** Doğrusal fonksiyonun değeri: y = 2x + 3. params: max=10 */
  linear: fill('Doğrusal fonksiyonlar', (p, count) => {
    const max = num(p, 'max', 10)
    return unique(count, () => {
      const m = randInt(-4, 5) || 2, b = randInt(-6, 8), x = randInt(-max / 2, max)
      const eq = `y = ${m === 1 ? '' : m === -1 ? '-' : m}x${b === 0 ? '' : b > 0 ? ` + ${b}` : ` - ${-b}`}`
      return { text: `${eq} doğrusunda x = ${x} iken y = __`, answers: [String(m * x + b)] }
    }, (x) => x.text)
  }),

  /** Koordinat okuma (quiz). params: range=5, quadrant1=false */
  coordRead: quiz('Noktanın koordinatları', (p, count) => {
    const range = num(p, 'range', 5), q1 = bool(p, 'quadrant1', false)
    return unique(count, () => {
      const x = randInt(q1 ? 0 : -range, range), y = randInt(q1 ? 0 : -range, range)
      const c = `(${x}, ${y})`
      const wrong = [`(${y}, ${x})`, `(${-x}, ${y})`, `(${x}, ${-y})`, `(${x + 1}, ${y})`].filter((w) => w !== c)
      return quizFromStrings({ text: 'A noktasının koordinatları nedir?', visual: { kind: 'coords', range, points: [{ x, y, label: 'A' }] } }, c, [...new Set(wrong)])
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Öteleme/yansıma sonrası koordinat. params: kinds=['translate','reflectX','reflectY'] */
  transformPoint: fill('Koordinatlarda dönüşüm', (p, count) => {
    const kinds = arr<string>(p, 'kinds', ['translate', 'reflectX', 'reflectY'])
    return unique(count, () => {
      const x = randInt(-6, 6), y = randInt(-6, 6), k = pick(kinds)
      if (k === 'translate') {
        const dx = randInt(-4, 4) || 2, dy = randInt(-4, 4) || -3
        const dirx = dx > 0 ? `${dx} birim sağa` : `${-dx} birim sola`, diry = dy > 0 ? `${dy} birim yukarı` : `${-dy} birim aşağı`
        return { text: `A(${x}, ${y}) noktası ${dirx} ve ${diry} ötelenirse A'( __ , __ )`, answers: [String(x + dx), String(y + dy)] }
      }
      if (k === 'reflectX') return { text: `A(${x}, ${y}) noktasının x eksenine göre yansıması A'( __ , __ )`, answers: [String(x), String(-y)] }
      return { text: `A(${x}, ${y}) noktasının y eksenine göre yansıması A'( __ , __ )`, answers: [String(-x), String(y)] }
    }, (x) => x.text)
  }),

  /** Aritmetik ortalama / tepe değer / açıklık / medyan. params: stats=['mean','range','mode','median'] */
  stats: fill('Merkezî eğilim ve yayılım', (p, count) => {
    const stats = arr<string>(p, 'stats', ['mean', 'range'])
    return unique(count, () => {
      const s = pick(stats)
      const n = pick([3, 4, 5])
      let vals = Array.from({ length: n }, () => randInt(2, 20))
      if (s === 'mean') {
        const mean = randInt(5, 15)
        vals = vals.map(() => randInt(mean - 4, mean + 4))
        const diff = mean * n - vals.reduce((a, b) => a + b, 0)
        vals[n - 1] += diff
        if (vals[n - 1] < 0) vals[n - 1] = mean
        const m = vals.reduce((a, b) => a + b, 0) / n
        return { text: `${vals.join(', ')} veri grubunun aritmetik ortalaması __`, answers: [fmtPlain(m, 2)] }
      }
      if (s === 'range') return { text: `${vals.join(', ')} veri grubunun açıklığı __`, answers: [String(Math.max(...vals) - Math.min(...vals))] }
      if (s === 'mode') {
        const m = vals[0]
        vals = shuffle([...vals, m])
        const freq = new Map<number, number>()
        vals.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1))
        const max = Math.max(...freq.values())
        const modes = [...freq].filter(([, c]) => c === max)
        if (modes.length > 1) return { text: `${vals.join(', ')} veri grubunun açıklığı __`, answers: [String(Math.max(...vals) - Math.min(...vals))] }
        return { text: `${vals.join(', ')} veri grubunun tepe değeri __`, answers: [String(modes[0][0])] }
      }
      const odd = vals.length % 2 === 1 ? vals : [...vals, randInt(2, 20)]
      const sorted = odd.slice().sort((a, b) => a - b)
      return { text: `${odd.join(', ')} veri grubunun ortanca değeri (medyan) __`, answers: [String(sorted[(sorted.length - 1) / 2])] }
    }, (x) => x.text)
  }),

  /** Basit olasılık (torba). params: asFraction=true */
  probability: fill('Olasılık hesaplama', (_p, count) => {
    const colors = [['kırmızı', '🔴'], ['mavi', '🔵'], ['yeşil', '🟢'], ['sarı', '🟡']]
    return unique(count, () => {
      const cs = shuffle(colors).slice(0, randInt(2, 3))
      const counts = cs.map(() => randInt(1, 6))
      const total = counts.reduce((a, b) => a + b, 0)
      const i = randInt(0, cs.length - 1)
      return {
        text: `Torbadan rastgele çekilen bir topun ${cs[i][0]} olma olasılığı __ / __`,
        answers: [String(counts[i]), String(total)],
        visual: { kind: 'emojiGroups', groups: cs.map((c, k) => ({ emoji: c[1], count: counts[k] })) } as Visual,
      }
    }, (x) => x.text)
  }),

  /** Prizma hacmi / yüzey alanı. params: ask='volume'|'surface'|'mix', max=8 */
  prism: fill('Dikdörtgenler prizması', (p, count) => {
    const ask = str(p, 'ask', 'volume'), max = num(p, 'max', 8)
    return unique(count, () => {
      const a = randInt(2, max), b = randInt(2, max), c = randInt(2, max)
      const k = ask === 'mix' ? pick(['volume', 'surface']) : ask
      if (k === 'volume') return { text: `Ayrıt uzunlukları ${a} cm, ${b} cm ve ${c} cm olan dikdörtgenler prizmasının hacmi __ cm³`, answers: [String(a * b * c)] }
      return { text: `Ayrıt uzunlukları ${a} cm, ${b} cm ve ${c} cm olan dikdörtgenler prizmasının yüzey alanı __ cm²`, answers: [String(2 * (a * b + a * c + b * c))] }
    }, (x) => x.text)
  }),

  /** Silindir (π = 3). params: ask='volume'|'surface'|'mix' */
  cylinder: fill('Dik dairesel silindir (π = 3)', (p, count) => {
    const ask = str(p, 'ask', 'mix')
    return unique(count, () => {
      const r = randInt(1, 6), h = randInt(2, 12)
      const k = ask === 'mix' ? pick(['volume', 'surface']) : ask
      if (k === 'volume') return { text: `Taban yarıçapı ${r} cm, yüksekliği ${h} cm olan silindirin hacmi (π = 3) __ cm³`, answers: [String(3 * r * r * h)] }
      return { text: `Taban yarıçapı ${r} cm, yüksekliği ${h} cm olan silindirin yüzey alanı (π = 3) __ cm²`, answers: [String(2 * 3 * r * r + 2 * 3 * r * h)] }
    }, (x) => x.text)
  }),

  // ─── Van de Walle: strateji ve sayı duyusu üreteçleri ──────────────────

  /** 10'a tamamlama stratejisi (8 + 5 = 10 + 3). params: split=false (ara adımı da sor) */
  makeTen: fill('10’a tamamla', (p, count) => {
    const split = bool(p, 'split', false)
    return unique(count, () => {
      const a = randInt(6, 9), b = randInt(11 - a, 9)
      const r = a + b
      const visual: Visual = { kind: 'tenframe', filled: a, add: b, size: 20 }
      const hints = [`${ek(a, 'acc')} 10’a tamamlamak için kaç gerekir?`, `${ek(b, 'abl')} ${10 - a} tanesini ${ek(a, 'dat')} ver. Geriye kaç kaldı?`]
      const explain = `${a} + ${b} = ${a} + ${10 - a} + ${b - (10 - a)} = 10 + ${r - 10} = ${r}`
      if (split) return { text: `${a} + ${b} = 10 + __ = __`, answers: [String(r - 10), String(r)], visual, hints, explain }
      return { text: `${a} + ${b} = __`, answers: [String(r)], visual, hints, explain }
    }, (x) => x.text)
  }),

  /** İkizler ve ikizlere yakın toplamlar. params: max=10, near=true */
  doubles: fill('İkizler ve ikizlere yakın', (p, count) => {
    const max = num(p, 'max', 10), near = bool(p, 'near', true)
    return unique(count, () => {
      const a = randInt(2, max)
      const isNear = near && Math.random() < 0.6
      const b = isNear ? a + (Math.random() < 0.5 ? 1 : -1) : a
      const visual: Visual = { kind: 'emojiGroups', groups: [{ emoji: '🔵', count: a }, { emoji: isNear ? '🟠' : '🔵', count: b }], separator: '+' }
      if (!isNear) return { text: `${a} + ${a} = __`, answers: [String(2 * a)], visual, hints: ['İkizler! Aynı sayıyı iki kez topluyoruz.', `${ek(a, 'gen')} iki katı kaçtır?`] }
      const small = Math.min(a, b)
      return {
        text: `${a} + ${b} = __`,
        answers: [String(a + b)],
        visual,
        hints: [`${small} + ${small} kaç eder?`, `Sonuca 1 ekle.`],
        explain: `${small} + ${small} = ${2 * small}, bir fazlası ${a + b}.`,
      }
    }, (x) => x.text)
  }),

  /** Çıkarmada "toplamayı düşün" (13 − 8 → 8 + ? = 13). params: maxWhole=18 */
  thinkAddition: fill('Toplamayı düşünerek çıkar', (p, count) => {
    const maxW = num(p, 'maxWhole', 18)
    return unique(count, () => {
      const b = randInt(3, 9), a = randInt(Math.max(b + 2, 11), Math.min(maxW, b + 9))
      return {
        text: `${a} − ${b} = __`,
        answers: [String(a - b)],
        visual: { kind: 'tape', parts: [{ label: String(b), value: b }, { label: '?', value: a - b }], total: String(a) } as Visual,
        hints: [`${ek(b, 'dat')} kaç eklersen ${a} olur?`, `Önce ${ek(b, 'abl')} 10’a, sonra 10’dan ${ek(a, 'dat')} kaç adım var?`],
        explain: `${b} + ${a - b} = ${a} olduğu için ${a} − ${b} = ${a - b}.`,
      }
    }, (x) => x.text)
  }),

  /** Çarpmada türetilmiş stratejiler (dizi modeliyle). params: tables=[2..9] */
  multStrategy: fill('Çarpma stratejileri', (p, count) => {
    const tables = arr<number>(p, 'tables', [2, 3, 4, 5, 6, 7, 8, 9])
    const tip: Record<number, (b: number) => [string, string]> = {
      2: (b) => [`İkizler: ${b} + ${b} kaç eder?`, `${ek(b, 'gen')} iki katı`],
      3: (b) => [`Önce 2 × ${ek(b, 'acc')} bul, sonra bir ${b} daha ekle.`, `2 × ${b} = ${2 * b}`],
      4: (b) => [`İki katının iki katı: 2 × ${b} = ${2 * b}. Bunun iki katı?`, `${2 * b} + ${2 * b}`],
      5: (b) => [`10 × ${ek(b, 'gen')} yarısı kaçtır?`, `Saat yelkovanı gibi 5’er say.`],
      6: (b) => [`5 × ${b} = ${5 * b}. Bir ${b} daha ekle.`, `${5 * b} + ${b}`],
      7: (b) => [`5 × ${b} ile 2 × ${ek(b, 'acc')} topla.`, `${5 * b} + ${2 * b}`],
      8: (b) => [`4 × ${ek(b, 'gen')} iki katı.`, `4 × ${b} = ${4 * b}`],
      9: (b) => [`10 × ${b} = ${10 * b}. Bir ${b} çıkar.`, `${10 * b} − ${b}`],
    }
    return unique(count, () => {
      const a = pick(tables), b = randInt(2, 9)
      const split = a === 6 || a === 7 ? 5 : a === 3 ? 2 : undefined
      return {
        text: `${a} × ${b} = __`,
        answers: [String(a * b)],
        visual: { kind: 'array', rows: a, cols: b, splitRow: split } as Visual,
        hints: (tip[a] ?? ((x: number) => [`${a} tane ${ek(x, 'acc')} topla.`, '']))(b).filter(Boolean),
      }
    }, (x) => x.text)
  }),

  /** Şipşak sayma (hızlı bakış). params: min=1, max=10, arrangement='mix'|'dice'|'five'|'scatter', flash=1500 */
  subitize: quiz('Hızlı bakış: kaç nokta?', (p, count) => {
    const min = num(p, 'min', 1), max = num(p, 'max', 10), ms = num(p, 'flash', 1500), arrP = str(p, 'arrangement', 'mix')
    return unique(count, () => {
      const n = randInt(min, max)
      const arrangement = (arrP === 'mix' ? pick(n <= 6 ? ['dice', 'five', 'scatter'] : ['five', 'five', 'scatter']) : arrP) as 'dice' | 'five' | 'scatter'
      const opts = shuffle([...new Set([n, n + 1, Math.max(1, n - 1), n + 2])]).slice(0, 4)
      if (!opts.includes(n)) opts[0] = n
      const list = shuffle(opts)
      return {
        prompt: { text: 'Kaç nokta gördün?', visual: { kind: 'dots', count: n, arrangement } },
        choices: list.map(String),
        answer: list.indexOf(n),
        flash: ms,
        explain: n > 5 ? `${n} = 5 + ${n - 5}. 5’li grubu görmek saymayı hızlandırır.` : undefined,
      }
    }, (q) => JSON.stringify(q.prompt) + q.choices.join())
  }),

  /** Saklı parça (parça-parça-bütün). params: min=4, max=10, emoji */
  hiddenPart: fill('Bardağın altında kaç tane?', (p, count) => {
    const min = num(p, 'min', 4), max = num(p, 'max', 10), emoji = str(p, 'emoji', '🔵')
    return unique(count, () => {
      const t = randInt(min, max), h = randInt(1, t - 1)
      return {
        text: `Toplam ${t} tane var. Bardağın altında __ tane saklı.`,
        answers: [String(h)],
        visual: { kind: 'hidden', shown: t - h, emoji, total: t } as Visual,
        hints: [`Kaç tane görüyorsun?`, `${ek(t - h, 'abl')} ${ek(t, 'dat')} kaç eksik?`],
        explain: `${t - h} + ${h} = ${t}`,
      }
    }, (x) => x.text)
  }),

  /** Esnek basamak değeri: "3 onluk 14 birlik = __", "52 = 4 onluk __ birlik". params: hundreds=false */
  placeFlex: fill('Esnek basamak değeri', (p, count) => {
    const H = bool(p, 'hundreds', false)
    return unique(count, () => {
      if (H && Math.random() < 0.5) {
        const h = randInt(2, 8), t = randInt(10, 19), o = randInt(0, 9)
        return { text: `${h} yüzlük ${t} onluk ${o} birlik = __`, answers: [String(h * 100 + t * 10 + o)], hints: ['10 onluk kaç yüzlük eder?'], visual: { kind: 'blocks', hundreds: h, tens: t, ones: o } as Visual }
      }
      const t = randInt(2, 8), o = randInt(10, 19)
      if (Math.random() < 0.5) return { text: `${t} onluk ${o} birlik = __`, answers: [String(t * 10 + o)], hints: ['10 birlik kaç onluk eder?'], visual: { kind: 'blocks', tens: t, ones: Math.min(o, 19) } as Visual }
      const n = t * 10 + o
      return { text: `${n} = ${t} onluk __ birlik`, answers: [String(o)], hints: [`${t} onluk kaç eder? ${ek(n, 'dat')} ulaşmak için kaç birlik gerekir?`], explain: `${t} onluk = ${t * 10}; ${n} − ${t * 10} = ${o}` }
    }, (x) => x.text)
  }),

  /** Kesrin 0, ½ ve 1 referanslarından hangisine yakın olduğu (activity'de fixedOrder: true kullanın). params: dens */
  benchmark: quiz('0’a mı, yarıma mı, 1’e mi yakın?', (p, count) => {
    const dens = arr<number>(p, 'dens', [5, 6, 8, 10, 12])
    return unique(count, () => {
      let nu = 1, d = 8
      for (let k = 0; k < 50; k++) {
        d = pick(dens); nu = randInt(1, d - 1)
        const v = nu / d
        const dist = [v, Math.abs(v - 0.5), 1 - v].sort((x, y) => x - y)
        if (dist[1] - dist[0] > 0.05) break
      }
      const v = nu / d
      const ds = [v, Math.abs(v - 0.5), 1 - v]
      const ans = ds.indexOf(Math.min(...ds))
      const half = d / 2
      return {
        prompt: { text: `[[${nu}/${d}]] hangisine daha yakın?`, visual: { kind: 'fraction', num: nu, den: d, shape: 'bar' } },
        choices: ['0', '[[1/2]]', '1'],
        answer: ans,
        explain: `${d} parçanın yarısı ${fmt(half)} parça eder. ${nu} parça ${nu < half ? 'yarımdan az' : nu > half ? 'yarımdan fazla' : 'tam yarım'}.`,
        feedback: [0, 1, 2].map((i) => (i === ans ? null : i === 1 ? Number.isInteger(half) ? `Yarım = [[${half}/${d}]]. ${nu} parça buna ne kadar uzak?` : `${d} parçanın yarısı ${fmt(half)} parça. ${nu} parça buna ne kadar uzak?` : i === 0 ? 'Boyalı kısım neredeyse hiç yok mu? Modele tekrar bak.' : 'Bütüne ne kadar kaldı? Boş parçaları say.')),
      }
    }, (q) => JSON.stringify(q.prompt))
  }),

  /** Sayı doğrusunda kesir (uzunluk modeli). params: dens=[2,3,4,5,6,8], improper=false */
  fractionOnLine: quiz('Sayı doğrusunda kesir', (p, count) => {
    const dens = arr<number>(p, 'dens', [2, 3, 4, 5, 6, 8]), improper = bool(p, 'improper', false)
    return unique(count, () => {
      const d = pick(dens), max = improper ? 2 : 1
      const k = randInt(1, d * max - 1)
      if (k % d === 0) return null as unknown as QuizQuestion
      const correct = `[[${k}/${d}]]`
      const wrong = [`[[${k}/${d * max === d ? d + 1 : d * max}]]`, `[[${d}/${k}]]`, `[[${k + 1}/${d}]]`, `[[${k}/${d * 2}]]`].filter((w) => w !== correct)
      const list = shuffle([correct, ...[...new Set(wrong)].slice(0, 3)])
      return {
        prompt: { text: 'Nokta hangi kesri gösteriyor?', visual: { kind: 'numberline', min: 0, max, step: 1 / d, points: [k / d], labels: false, integerLabels: true } as Visual },
        choices: list,
        answer: list.indexOf(correct),
        explain: `0 ile 1 arası ${d} eş parçaya bölünmüş. Nokta 0’dan ${k} parça ilerde: [[${k}/${d}]].`,
        feedback: list.map((c) => (c === correct ? null : c === `[[${d}/${k}]]` ? 'Pay ve paydanın yeri karışmış olabilir: payda, bütünün kaç eş parçaya bölündüğünü söyler.' : c.includes(`/${d * 2}]]`) || c.includes(`/${d + 1}]]`) ? 'Çentikleri değil, aralıkları say: 0 ile 1 arasında kaç eş parça var?' : 'Noktaya kadar kaç parça ilerlediğini tekrar say.')),
      }
    }, (q) => (q ? JSON.stringify(q.prompt) : `x${Math.random()}`)).filter(Boolean)
  }),

  /** Telafi stratejisi: 49 + 26 = 50 + __ ; 83 − 29 = 84 − __. params: hundreds=false */
  compensation: fill('Telafi stratejisi', (p, count) => {
    const H = bool(p, 'hundreds', false)
    return unique(count, () => {
      const base = H ? pick([100, 200, 300, 400, 500]) : pick([20, 30, 40, 50, 60, 70, 80, 90])
      const off = pick([1, 2])
      const a = base - off, b = randInt(H ? 21 : 12, H ? 99 : 39)
      if (Math.random() < 0.5) {
        return { text: `${a} + ${b} = ${base} + __ = __`, answers: [String(b - off), String(a + b)], hints: [`${ek(a, 'acc')} ${base} yapmak için ${ek(b, 'abl')} ${off} ödünç al.`], explain: `${a} + ${b} = (${a} + ${off}) + (${b} − ${off}) = ${base} + ${b - off}` }
      }
      const c = b + base
      return { text: `${c} − ${a} = ${c + off} − __ = __`, answers: [String(base), String(c - a)], hints: [`İki sayıya da ${off} eklersen fark değişmez.`], explain: `${c} − ${a} = (${c} + ${off}) − (${a} + ${off}) = ${c + off} − ${base}` }
    }, (x) => x.text)
  }),

  /** Çok basamaklı sayı okunuşu ↔ yazılışı eşleştirme. params: digits=7 */
  numberWords: match('Sayıların okunuşu', (p, count) => {
    const d = num(p, 'digits', 4)
    return unique(count, () => {
      const n = randInt(10 ** (d - 1), 10 ** d - 1)
      return { left: fmt(n), right: numberToWords(n) }
    }, (x) => x.left)
  }),
} satisfies Record<string, Gen<unknown>>

export type GeneratorId = keyof typeof generators

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan']

function threeDigits(n: number): string {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10
  return [h === 0 ? '' : h === 1 ? 'yüz' : ONES[h] + ' yüz', TENS[t], ONES[o]].filter(Boolean).join(' ')
}

/** 1234567 → "bir milyon iki yüz otuz dört bin beş yüz altmış yedi" */
export function numberToWords(n: number): string {
  if (n === 0) return 'sıfır'
  const groups: [number, string][] = [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']]
  const parts: string[] = []
  let rest = n
  for (const [v, name] of groups) {
    const q = Math.floor(rest / v)
    if (q > 0) {
      parts.push(q === 1 && name === 'bin' ? 'bin' : `${threeDigits(q)} ${name}`)
      rest %= v
    }
  }
  if (rest > 0) parts.push(threeDigits(rest))
  return parts.join(' ')
}

const lastVowel = (w: string) => [...w].reverse().find((c) => 'aıoueiöü'.includes(c)) ?? 'e'
const endsWithVowel = (w: string) => 'aıoueiöü'.includes(w[w.length - 1])
const hardEnd = (w: string) => 'çfhkpsşt'.includes(w[w.length - 1])
const lastWord = (n: number) => numberToWords(Math.abs(n)).split(' ').pop() ?? ''

/**
 * Sayılara Türkçe hâl eki: ek(9, 'acc') → "9’u", ek(7, 'dat') → "7’ye", ek(3, 'abl') → "3’ten", ek(20, 'gen') → "20’nin"
 * acc: belirtme (-ı), dat: yönelme (-a), abl: ayrılma (-dan), loc: bulunma (-da), gen: tamlayan (-ın), poss: iyelik (-ı, yalnız ek), dist: üleştirme (-er)
 */
export function ek(n: number, kind: 'acc' | 'dat' | 'abl' | 'loc' | 'gen' | 'poss' | 'dist', withNumber = true): string {
  const w = lastWord(n)
  const v = lastVowel(w)
  const back = 'aıou'.includes(v)
  const i4 = 'aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü'
  const a2 = back ? 'a' : 'e'
  const vowelEnd = endsWithVowel(w)
  const d = hardEnd(w) ? 't' : 'd'
  const suffix = {
    acc: (vowelEnd ? 'y' : '') + i4,
    dat: (vowelEnd ? 'y' : '') + a2,
    abl: d + a2 + 'n',
    loc: d + a2,
    gen: (vowelEnd ? 'n' : '') + i4 + 'n',
    poss: (vowelEnd ? 's' : '') + i4,
    dist: (vowelEnd ? 'ş' : '') + a2 + 'r',
  }[kind]
  return `${withNumber ? fmt(n) : ''}’${suffix}`
}

/** Tamlayan eki: 20 → "20’nin" */
export const gen = (n: number) => ek(n, 'gen')
/** İyelik eki (yalnız ek): 50 → "’si" */
export const poss = (n: number) => ek(n, 'poss', false)

export function runGenerator(id: string, params: Record<string, unknown> = {}, count = 8): unknown[] {
  const g = (generators as Record<string, Gen<unknown>>)[id]
  if (!g) throw new Error(`Bilinmeyen üreteç: ${id}`)
  return g.run(params, count)
}

export const generatorKind = (id: string) => (generators as Record<string, Gen<unknown>>)[id]?.kind
