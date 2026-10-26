import { useMemo, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { ChevronDown, ChevronUp, MoveVertical, Target } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { SolutionList, StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, NumPad, parseNum, pick, randInt, tr, useNudge, useSession } from '../hizli-noktalar/kit'

/**
 * 29. Sayı Piramitleri — her taş, altındaki iki taşın toplamı (ileride çarpımı).
 *  - fill: boş taşlara dokun → sayı tuşları. Yukarı çıkarken topla, aşağı inerken ters işlem.
 *  - open: alt taşlar kaydırılabilir (yukarı-aşağı sürükle ya da ▲▼); piramit canlı hesaplanır,
 *          hedef tepeye ulaşan farklı tabanlar toplanır. Sonunda her taban taşının tepeye kaç kez ulaştığı gösterilir.
 *  - unknown: yalnız tepe ve köşeler belli; ortadaki taban taşı "tahmin et – dene – düzelt" ile bulunur (a + 2x + c).
 */

type Op = '+' | '×'
type Key = string

interface Task {
  kind: 'fill' | 'open' | 'unknown'
  op: Op
  base: number[]
  given?: Key[]
  target?: number
  goal?: number
  range?: [number, number]
  step?: number
  unknown?: number
  decimal?: boolean
  title: string
  prompt: string
  hints: string[]
  note?: string
  picker?: { q: string; options: string[] }
}

const r2 = (x: number) => Math.round(x * 1000) / 1000
const calc = (a: number, b: number, op: Op) => (op === '+' ? r2(a + b) : r2(a * b))
const K = (k: number, i: number): Key => `${k}-${i}`

function build(base: number[], op: Op): number[][] {
  const L = [base]
  while (L[L.length - 1].length > 1) {
    const p = L[L.length - 1]
    L.push(p.slice(0, -1).map((v, i) => calc(v, p[i + 1], op)))
  }
  return L
}

/** Verilen taşlardan adım adım (iki bilinen → üçüncü) tamamlanabiliyor mu? */
function solvable(n: number, given: Set<Key>) {
  const known = new Set(given)
  const has = (k: number, i: number) => known.has(K(k, i))
  let changed = true
  while (changed) {
    changed = false
    for (let k = 0; k < n; k++)
      for (let i = 0; i < n - k; i++) {
        if (has(k, i)) continue
        const up = k > 0 && has(k - 1, i) && has(k - 1, i + 1)
        const left = k < n - 1 && i > 0 && has(k + 1, i - 1) && has(k, i - 1)
        const right = k < n - 1 && i < n - 1 - k && has(k + 1, i) && has(k, i + 1)
        if (up || left || right) {
          known.add(K(k, i))
          changed = true
        }
      }
  }
  return known.size === (n * (n + 1)) / 2
}

/** Tepesi `maxTop`u geçmeyen rastgele taban */
function base(n: number, lo: number, hi: number, maxTop: number, op: Op = '+', mult = 1): number[] {
  for (let t = 0; t < 400; t++) {
    const b = Array.from({ length: n }, () => randInt(lo, hi) * mult)
    const top = build(b, op)[n - 1][0]
    if (top <= maxTop && new Set(b).size >= Math.min(n, 2)) return b
  }
  return Array.from({ length: n }, () => lo * mult)
}

const allBase = (n: number) => Array.from({ length: n }, (_, i) => K(0, i))
const SUM_RULE = 'Kural: her taş, altındaki iki taşın toplamı.'
const PROD_RULE = 'Yeni kural: her taş, altındaki iki taşın çarpımı!'

function makeTasks(grade: Grade): Task[] {
  // Adım adım çözülemeyen bir "fill" görevi olursa tabanı tamamen ver
  return rawTasks(grade).map((t) => (t.kind === 'fill' && !solvable(t.base.length, new Set(t.given ?? [])) ? { ...t, given: allBase(t.base.length) } : t))
}

function rawTasks(grade: Grade): Task[] {
  const openPick: Task['picker'] = { q: 'Tepeyi hedefe nasıl getirdin?', options: ['Deneyerek', 'Ortadaki taşı değiştirdim', 'Kenar taşlarını değiştirdim', 'Bir yolu ters çevirdim'] }
  const twice: Task['picker'] = { q: 'Ortadaki taş 1 artınca tepe neden 2 artıyor?', options: ['İki taşa birden katılıyor', 'Tepeye iki yoldan ulaşıyor', 'Emin değilim, deneyeceğim'] }
  if (grade === 2) {
    const t20 = pick([16, 20, 24])
    return [
      { kind: 'fill', op: '+', base: base(3, 2, 12, 60), given: allBase(3), title: 'İlk piramit', prompt: `${SUM_RULE} Boş taşlara dokun ve piramidi tamamla.`, hints: ['En alttaki iki komşu taşı topla: sonuç tam üstlerindeki taşa yazılır.', 'Ortadaki sıra bitince tepeye geç.'] },
      { kind: 'fill', op: '+', base: base(3, 3, 15, 70), given: [K(0, 1), K(0, 2), K(1, 0)], title: 'Aşağıda bir boşluk', prompt: 'Bu kez alt sırada bir taş eksik! Hangi taştan başlarsan işin kolaylaşır?', hints: ['Altındaki iki taşı bildiğin bir boş taş var mı?', 'Sol alttaki taş için: üstündeki taş ve yanındaki taş belli. Hangi sayı yanındakiyle toplanınca üsttekini verir?'], picker: { q: 'Alttaki eksik taşı nasıl buldun?', options: ['Üsttekinden yanındakini çıkardım', 'Yanındakinden ileri saydım', 'Deneyerek'] } },
      { kind: 'fill', op: '+', base: base(3, 2, 15, 70), given: [K(2, 0), K(1, 0), K(0, 0)], title: 'Tepeden aşağı', prompt: 'Tepeden aşağı in! Tepe ve sol kenar belli. Eksik taşları bul.', hints: ['Tepedeki sayı, ortadaki iki taşın toplamı. Biri belli, diğeri kaç olmalı?', 'Aşağı inerken “hangi sayıyla toplanınca?” diye sor.'] },
      { kind: 'open', op: '+', base: [1, 1, 1], target: t20, goal: 3, range: [0, 12], step: 1, title: 'Tepesi ' + t20, prompt: `Tepesi ${t20} olan piramitler kur! Alt taşları yukarı-aşağı kaydır ya da oklara dokun. 3 farklı yol bul.`, hints: ['Önce bir alt taşı değiştir ve tepeye ne olduğunu izle.', 'Ortadaki taş 1 artınca tepe kaç artıyor? Kenardaki taş 1 artınca?'], picker: openPick },
      { kind: 'fill', op: '+', base: base(3, 1, 4, 100, '+', 10), given: allBase(3), title: 'Onluk piramit', prompt: 'Onluklarla bir piramit! Taşları zihinden toplayabilir misin?', hints: ['30 + 20: 3 onluk ve 2 onluk kaç onluk eder?'], note: 'Onlukları toplamak, birlikleri toplamak gibi: 3 + 2 = 5, 30 + 20 = 50.' },
      { kind: 'fill', op: '+', base: base(4, 1, 6, 70), given: allBase(4), title: 'Dört katlı', prompt: 'Dört katlı bir piramit! Tepeye kadar tamamla.', hints: ['Her sırada bir taş azalır. Alttan başla.'] },
    ]
  }
  if (grade === 3) {
    return [
      { kind: 'fill', op: '+', base: base(4, 2, 15, 160), given: allBase(4), title: 'Dört katlı', prompt: `${SUM_RULE} Dört katlı piramidi tepeye kadar tamamla.`, hints: ['Alttan başla: komşu iki taşı topla.'] },
      { kind: 'fill', op: '+', base: base(3, 5, 30, 600, '+', 10), given: [K(0, 0), K(0, 2), K(1, 1)], title: 'Yüzlükler', prompt: 'Büyük sayılar ve bir eksik taban taşı. Hangi taştan başlamalısın?', hints: ['Sağdaki ortadaki taş ve altındaki bir taş belli. Diğeri kaç olmalı?', 'Üstteki sayıdan yanındakini çıkar ya da yanındakinden ileri say.'], picker: { q: 'Eksik taşı nasıl buldun?', options: ['Çıkarma yaptım', 'Yanındakinden ileri saydım', 'Onluklarla düşündüm'] } },
      { kind: 'fill', op: '+', base: base(4, 3, 20, 200), given: [K(0, 0), K(0, 1), K(0, 3), K(1, 2)], title: 'Ortada boşluk', prompt: 'Alt sıranın ortasında bir taş kayıp. Piramidi tamamla.', hints: ['Sağ alttaki üst taş ve yanındaki taban taşı belli.', 'Kayıp taşı bulunca yukarı çıkmak kolay.'] },
      { kind: 'open', op: '+', base: [2, 2, 2], target: 40, goal: 3, range: [0, 25], step: 1, title: 'Tepesi 40', prompt: 'Tepesi 40 olan 3 farklı piramit kur. Alt taşları kaydır ya da oklara dokun.', hints: ['Ortadaki taşı 1 artır: tepe kaç arttı?', 'Bulduğun bir piramidin tabanını ters çevir: tepe yine 40 mı?'], picker: twice },
      { kind: 'fill', op: '+', base: base(4, 2, 20, 220), given: [K(3, 0), K(2, 0), K(1, 0), K(0, 0)], title: 'Tepeden aşağı', prompt: 'Tepeden aşağı in! Sol kenar ve tepe belli. Tüm piramidi bul.', hints: ['Tepedeki sayı, altındaki iki taşın toplamı. Biri belli.', 'Aşağı inerken çıkarma ya da “ileri sayma” işine yarar.'] },
      { kind: 'open', op: '+', base: [1, 1, 1, 1], target: 30, goal: 2, range: [0, 10], step: 1, title: 'En güçlü taş', prompt: 'Dört katlı piramidin tepesi 30 olsun. 2 farklı yol bul. Hangi alt taş tepeyi en çok değiştiriyor?', hints: ['Her alt taşı tek tek 1 artır ve tepeyi izle.', 'Ortadaki iki taş, kenardakilerden daha güçlü mü?'] },
    ]
  }
  if (grade === 4) {
    const pb = base(3, 2, 5, 400, '×')
    const pb2 = base(3, 2, 4, 300, '×')
    return [
      { kind: 'fill', op: '+', base: base(4, 10, 60, 600), given: [K(3, 0), K(2, 0), K(1, 0), K(0, 0)], title: 'Tepeden aşağı', prompt: `${SUM_RULE} Tepe ve sol kenar belli. Aşağı inerek tüm piramidi bul.`, hints: ['Tepe, altındaki iki taşın toplamı. Bilinmeyeni bulmak için hangi işlemi kullanırsın?'], picker: { q: 'Aşağı inerken ne yaptın?', options: ['Çıkarma yaptım', 'Eksik toplananı düşündüm', 'Tahmin edip kontrol ettim'] } },
      { kind: 'fill', op: '×', base: pb, given: allBase(3), title: 'Çarpım piramidi', prompt: `${PROD_RULE} Piramidi tamamla.`, hints: ['Alttaki iki komşuyu çarp.', 'Tepeyi bulmak için ortadaki iki sayıyı çarp.'] },
      { kind: 'fill', op: '×', base: pb2, given: [K(2, 0), K(1, 0), K(0, 0)], title: 'Çarpımda aşağı in', prompt: 'Çarpım piramidinde tepeden aşağı in! Eksik taşları bul.', hints: ['Hangi sayıyla çarpınca üstteki sayıyı verir?', 'Çarpmanın tersi bölmedir.'], picker: { q: 'Aşağı inerken ne yaptın?', options: ['Böldüm', 'Eksik çarpanı düşündüm', 'Çarpım tablosunu kullandım'] } },
      { kind: 'open', op: '+', base: [10, 10, 10], target: 100, goal: 3, range: [0, 60], step: 5, title: 'Tepesi 100', prompt: 'Tepesi 100 olan 3 farklı piramit kur. Taşlar 5’er 5’er değişiyor.', hints: ['Ortadaki taş 5 artınca tepe kaç artıyor?', 'Kenardaki bir taşı 10 artırırsan diğer kenarı ne yapmalısın?'], picker: twice },
      { kind: 'fill', op: '+', base: base(4, 1, 9, 9999, '+', 100), given: [K(0, 0), K(0, 1), K(0, 3), K(1, 2)], title: 'Yüzlüklerle', prompt: 'Yüzlüklerle dört katlı piramit. Kayıp taban taşını bul, sonra tepeye çık.', hints: ['Yüzlükleri onluk gibi düşün: 7 yüzlük − 3 yüzlük = 4 yüzlük.'] },
    ]
  }
  if (grade === 5) {
    return [
      { kind: 'fill', op: '+', base: base(4, 5, 50, 900, '+', 5), given: [K(0, 0), K(0, 1), K(0, 3), K(1, 2)], title: 'Kayıp taş', prompt: `${SUM_RULE} Kayıp taban taşını bul ve piramidi tamamla.`, hints: ['Hangi boş taşın iki komşusu belli?'] },
      { kind: 'open', op: '+', base: [5, 5, 5], target: 60, goal: 3, range: [0, 40], step: 1, title: 'Tepesi 60', prompt: 'Tepesi 60 olan 3 farklı piramit kur. Her taban taşı tepeye kaç kez katılıyor?', hints: ['Ortadaki taşı 1 artır, tepe kaç arttı?', 'Tepe = sol + 2 × orta + sağ olabilir mi? Dene.'], picker: twice },
      { kind: 'open', op: '+', base: [2, 2, 2, 2], target: 80, goal: 2, range: [0, 20], step: 1, title: 'Dört katlı hedef', prompt: 'Dört katlı piramidin tepesi 80 olsun. 2 yol bul. Bu kez ortadaki taşlar kaç kez sayılıyor?', hints: ['Her taban taşını tek tek 1 artır ve tepedeki değişimi yaz.', 'Kenar taşları 1 kez, ortadakiler … kez?'] },
      { kind: 'fill', op: '×', base: base(3, 2, 6, 900, '×'), given: [K(2, 0), K(1, 1), K(0, 2)], title: 'Çarpım piramidi', prompt: `${PROD_RULE} Tepe ve sağ kenar belli. Eksikleri bul.`, hints: ['Tepe, ortadaki iki taşın çarpımı. Biri belli.', 'Aşağı inerken bölmeyi kullan.'] },
      { kind: 'open', op: '×', base: [1, 1, 1], target: 36, goal: 3, range: [1, 9], step: 1, title: 'Çarpım hedefi', prompt: 'Çarpım piramidinin tepesi 36 olsun. 3 farklı taban bul!', hints: ['Tepe = sol × orta × orta × sağ olabilir mi?', 'Ortaya 1 koyarsan tepe neye eşit olur?'] },
    ]
  }
  // 6. sınıf
  const [ua, ux, uc] = [randInt(4, 15), randInt(3, 12), randInt(4, 15)]
  const ps = pick([[2, 3, 5], [3, 2, 7], [2, 4, 3]])
  return [
    { kind: 'fill', op: '+', base: base(4, 12, 80, 900), given: [K(3, 0), K(2, 1), K(1, 2), K(0, 3)], title: 'Sağ kenar', prompt: `${SUM_RULE} Yalnız sağ kenar belli. Tüm piramidi bulabilir misin?`, hints: ['Sağ kenarda bilmediğin sıradaki taş için: üstteki ve yanındaki belli mi?', 'Aşağı inerken toplananı bul: üstteki − yandaki.'] },
    { kind: 'unknown', op: '+', base: [ua, ux, uc], unknown: 1, target: build([ua, ux, uc], '+')[2][0], title: 'Gizli orta taş', prompt: `Yalnız köşeler ve tepe belli. Ortadaki taban taşı kaç olmalı? Bir sayı dene, piramit kendini hesaplasın.`, hints: ['Bir sayı dene ve tepenin hedeften ne kadar uzak olduğuna bak.', 'Ortadaki taş 1 artınca tepe kaç artıyor? Bu, farkı kapatmana yardım eder.'], picker: { q: 'Gizli taşı nasıl buldun?', options: ['Tahmin et – dene – düzelt', 'Farkı 2’ye böldüm', 'Tepeden köşeleri çıkarıp 2’ye böldüm'] }, note: `Tepe = sol + 2 × orta + sağ: ${ua} + 2 × ${ux} + ${uc} = ${ua + 2 * ux + uc}.` },
    { kind: 'fill', op: '+', decimal: true, base: pick([[1.5, 2.25, 0.75], [2.5, 1.25, 3.5], [0.75, 1.5, 2.4]]), given: [K(0, 0), K(0, 2), K(1, 1)], title: 'Ondalık piramit', prompt: 'Ondalık sayılarla bir piramit. Kayıp taban taşını bul ve tamamla.', hints: ['Ondalık sayıları basamak basamak düşün: birler, onda birler, yüzde birler.', '3,75 − 2,25: önce 3 − 2, sonra 0,75 − 0,25.'] },
    { kind: 'unknown', op: '×', base: ps, unknown: 1, target: build(ps, '×')[2][0], title: 'Gizli çarpan', prompt: `${PROD_RULE} Köşeler ve tepe belli. Ortadaki taban taşı kaç?`, hints: ['Bir sayı dene ve tepeyi hedefle karşılaştır.', 'Tepe = sol × orta × orta × sağ. Köşelerin çarpımını tepeden ayırırsan geriye ne kalır?'], note: `Tepe = ${ps[0]} × ${ps[1]} × ${ps[1]} × ${ps[2]}: ortadaki taş iki kez çarpılıyor.` },
    { kind: 'open', op: '+', base: [5, 5, 5, 5], target: 100, goal: 2, range: [0, 40], step: 1, title: 'Dört katlı hedef', prompt: 'Tepesi 100 olan dört katlı 2 piramit kur. Her taban taşı tepeye kaç kez katılıyor?', hints: ['Her taban taşını 1 artırıp tepedeki değişimi izle: 1, 3, 3, 1?'], picker: { q: 'Tepeyi nasıl hesaplarsın?', options: ['a + 3b + 3c + d', 'Her sırayı tek tek toplarım', 'Deneyerek'] } },
  ]
}

/** Binom katsayısı: taban taşının tepeye kaç yoldan ulaştığı */
const ways = (n: number, i: number) => {
  let r = 1
  for (let j = 1; j <= i; j++) r = (r * (n - j)) / j
  return Math.round(r)
}

export default function SayiPiramitleri({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const N = useNudge()
  const track = useTracker()
  const sol = useSolutions()
  const T = tasks[Math.min(S.idx, tasks.length - 1)]
  const n = T.base.length
  const age = useAge(grade)
  const mini = age.tier === 'mini'
  const solution = useMemo(() => build(T.base, T.op), [T])

  const [known, setKnown] = useState<Set<Key>>(() => initialKnown(tasks[0]))
  const [mine, setMine] = useState<Set<Key>>(new Set())
  const [sel, setSel] = useState<Key | null>(() => (tasks[0].kind === 'unknown' ? K(0, tasks[0].unknown!) : null))
  const [input, setInput] = useState('')
  const [openBase, setOpenBase] = useState<number[]>(tasks[0].base)
  const [found, setFound] = useState<string[]>([])
  const [guess, setGuess] = useState<number | null>(null)
  const [hintI, setHintI] = useState(0)
  const [pulse, setPulse] = useState<Key | null>(null)
  const totals = useRef({ entries: 0, found: 0, back: 0 })
  const foundKeys = useRef(new Set<string>())
  const tries = useRef(0)

  function initialKnown(t: Task) {
    if (t.kind === 'fill') return new Set(t.given ?? [])
    if (t.kind === 'unknown') {
      const nn = t.base.length
      const s = new Set<Key>([K(nn - 1, 0)])
      t.base.forEach((_, i) => i !== t.unknown && s.add(K(0, i)))
      return s
    }
    return new Set<Key>()
  }

  const resetTask = (t: Task) => {
    setKnown(initialKnown(t))
    setMine(new Set())
    setSel(t.kind === 'unknown' ? K(0, t.unknown!) : null)
    setInput('')
    setOpenBase(t.base)
    setFound([])
    foundKeys.current = new Set()
    setGuess(null)
    setHintI(0)
    tries.current = 0
    N.clear()
    sol.reset()
  }

  const fmtV = (v: number) => tr(v, 3)
  const isKnown = (k: number, i: number) => known.has(K(k, i))

  /* ───────── fill: giriş kontrolü ───────── */
  function explain(k: number, i: number, v: number) {
    const op = T.op
    const word = op === '+' ? 'toplamları' : 'çarpımları'
    if (k > 0 && isKnown(k - 1, i) && isKnown(k - 1, i + 1)) {
      const A = solution[k - 1][i], B = solution[k - 1][i + 1]
      let misc: string | undefined
      if (op === '+' && (v === r2(A * B) || v === r2(Math.abs(A - B)))) misc = 'Piramitte toplama yerine başka işlem yaptı'
      if (op === '×' && v === r2(A + B)) misc = 'Çarpım piramidinde toplama yaptı'
      N.show(`Bu taşın altında ${fmtV(A)} ve ${fmtV(B)} var. ${word[0].toUpperCase() + word.slice(1)} kaç?`, { misc, tool: op === '+' && A + B <= 20 ? 'tenframe' : undefined, toolConfig: { frames: 2 } })
      return
    }
    const opts: [number, number][] = []
    if (k < n - 1 && i > 0 && isKnown(k + 1, i - 1) && isKnown(k, i - 1)) opts.push([solution[k + 1][i - 1], solution[k][i - 1]])
    if (k < n - 1 && i < n - 1 - k && isKnown(k + 1, i) && isKnown(k, i + 1)) opts.push([solution[k + 1][i], solution[k][i + 1]])
    if (opts.length) {
      const [P, Sb] = opts[0]
      let misc: string | undefined
      if (op === '+' && v === r2(P + Sb)) misc = 'Piramitte aşağı inerken de topladı (ters işlemi kullanmadı)'
      if (op === '×' && v === r2(P * Sb)) misc = 'Çarpım piramidinde aşağı inerken de çarptı (bölmeyi kullanmadı)'
      if (op === '+' && v > P) misc = misc ?? 'Alttaki taşın üstteki toplamdan büyük olabileceğini düşündü'
      N.show(op === '+' ? `Üstteki taş ${fmtV(P)}, yanındaki ${fmtV(Sb)}. Hangi sayı ${fmtV(Sb)} ile toplanınca ${fmtV(P)} eder?` : `Üstteki taş ${fmtV(P)}, yanındaki ${fmtV(Sb)}. ${fmtV(Sb)} hangi sayıyla çarpılınca ${fmtV(P)} eder?`, { misc })
      return
    }
    N.show('Bu taşı bulmak için önce hangi komşusunu bilmen gerekir? Altındaki iki taşı ya da üstündeki ve yanındaki taşı bildiğin başka bir boş taştan başla.')
  }

  function submit() {
    if (!sel || !input) return
    const [k, i] = sel.split('-').map(Number)
    const v = parseNum(input)
    if (T.kind === 'unknown') {
      const b = T.base.slice()
      b[T.unknown!] = v
      const top = build(b, T.op)[n - 1][0]
      setGuess(v)
      setInput('')
      tries.current++
      if (Math.abs(top - T.target!) < 1e-9) {
        S.attempt(true)
        N.show(`Tepe tam ${fmtV(T.target!)} oldu!`, { tone: 'ok' })
        setKnown(new Set(Array.from({ length: n }, (_, kk) => Array.from({ length: n - kk }, (_, ii) => K(kk, ii))).flat()))
        setMine(new Set([sel]))
        setSel(null)
        S.complete()
      } else {
        S.attempt(false)
        const diff = T.target! - top
        const q =
          T.op === '+'
            ? tries.current >= 2
              ? `Orta taş ${fmtV(v)} iken tepe ${fmtV(top)}; hedefe ${fmtV(Math.abs(diff))} ${diff > 0 ? 'eksik' : 'fazla'}. Orta taş 1 artınca tepe 2 artıyor. Fark kaç adımda kapanır?`
              : `Orta taş ${fmtV(v)} iken tepe ${fmtV(top)} oldu. Hedef ${fmtV(T.target!)}. Orta taşı ${diff > 0 ? 'büyütmek' : 'küçültmek'} mi gerek? 1 değiştirince tepe ne kadar değişiyor?`
            : `Orta taş ${fmtV(v)} iken tepe ${fmtV(top)} oldu, hedef ${fmtV(T.target!)}. Köşelerin çarpımı ${fmtV(T.base[0] * T.base[2])}. Hedefi bununla bölersen, ortadaki taşın kendisiyle çarpımı ne olmalı?`
        N.show(q)
      }
      return
    }
    const ok = Math.abs(v - solution[k][i]) < 1e-9
    S.attempt(ok)
    totals.current.entries++
    if (ok) {
      sfx.ok()
      const nk = new Set(known)
      nk.add(sel)
      setKnown(nk)
      setMine((m) => new Set(m).add(sel))
      setPulse(sel)
      // aşağı inerek bulunan taş → strateji
      const fromBelow = k > 0 && isKnown(k - 1, i) && isKnown(k - 1, i + 1)
      if (!fromBelow) {
        totals.current.back++
        if (totals.current.back === 1) track.strategy(T.op === '+' ? 'Aşağı inerken ters işlem (çıkarma)' : 'Aşağı inerken ters işlem (bölme)')
      }
      N.clear()
      setInput('')
      // sonraki boş taşı öner
      const next = nextBlank(nk)
      setSel(next)
      if (!next) S.complete()
    } else {
      explain(k, i, v)
      setInput('')
    }
  }

  function nextBlank(nk: Set<Key>): Key | null {
    for (let k = 0; k < n; k++) for (let i = 0; i < n - k; i++) if (!nk.has(K(k, i))) {
      const has = (a: number, b: number) => nk.has(K(a, b))
      if ((k > 0 && has(k - 1, i) && has(k - 1, i + 1)) || (k < n - 1 && i > 0 && has(k + 1, i - 1) && has(k, i - 1)) || (k < n - 1 && i < n - 1 - k && has(k + 1, i) && has(k, i + 1))) return K(k, i)
    }
    for (let k = 0; k < n; k++) for (let i = 0; i < n - k; i++) if (!nk.has(K(k, i))) return K(k, i)
    return null
  }

  /* ───────── open: kaydırılabilir taban ───────── */
  const openLevels = useMemo(() => build(openBase, T.op), [openBase, T.op])
  const openTop = openLevels[n - 1][0]
  function checkOpen(b: number[]) {
    if (T.kind !== 'open' || S.done) return
    const top = build(b, T.op)[n - 1][0]
    if (top !== T.target) return
    const key = b.join('|')
    if (foundKeys.current.has(key)) {
      N.show('Bu piramidi zaten buldun. Başka bir taban dener misin? Taşları ters sırayla dizmek de yeni bir yol!', { tone: 'think' })
      return
    }
    foundKeys.current.add(key)
    S.attempt(true)
    sol.add(key, b.map(fmtV).join(' | '))
    totals.current.found++
    const nf = [...found, key]
    setFound(nf)
    if (nf.length >= (T.goal ?? 3)) {
      N.clear()
      S.complete()
    } else N.show(`Tepe ${fmtV(T.target!)}! ${nf.length}. yol bulundu. Başka bir taban dene.`, { tone: 'ok' })
  }
  const setBaseAt = (i: number, v: number, check: boolean) => {
    const [lo, hi] = T.range ?? [0, 20]
    const nb = openBase.slice()
    nb[i] = Math.max(lo, Math.min(hi, v))
    if (nb[i] === openBase[i]) return
    setOpenBase(nb)
    if (check) checkOpen(nb)
  }
  const dragBase = useRef<number[]>([])
  const bindScrub = useDrag(
    ({ args: [i], first, last, movement: [, my], event }) => {
      event?.preventDefault?.()
      if (T.kind !== 'open' || S.done) return
      if (first) dragBase.current = openBase.slice()
      const step = T.step ?? 1
      const v = dragBase.current[i as number] + Math.round(-my / 22) * step
      const [lo, hi] = T.range ?? [0, 20]
      const nb = dragBase.current.slice()
      nb[i as number] = Math.max(lo, Math.min(hi, v))
      setOpenBase(nb)
      if (last) checkOpen(nb)
    },
    { eventOptions: { passive: false }, filterTaps: true },
  )

  /* ───────── görev akışı ───────── */
  const hint = () => {
    S.hint()
    N.show(T.hints[Math.min(hintI, T.hints.length - 1)])
    setHintI((h) => h + 1)
  }
  const next = () => {
    if (S.last) {
      onFinish({
        stars: S.stars(),
        summary: `${tasks.length} piramit tamamladın${totals.current.found ? `, ${totals.current.found} farklı taban buldun` : ''}. ${S.totals.first} görevi ilk denemede bitirdin.`,
        insight: insightFor(grade),
      })
      return
    }
    const t = tasks[S.idx + 1]
    S.next()
    resetTask(t)
  }

  /* ───────── çizim ───────── */
  const levelsShown = T.kind === 'open' ? openLevels : solution
  const unknownTask = T.kind === 'unknown'
  const guessLevels = unknownTask && guess !== null ? build(T.base.map((v, i) => (i === T.unknown ? guess : v)), T.op) : null

  const brickH = mini ? 'min-h-16' : 'min-h-14'
  const fontCls = (txt: string) => (txt.length > 5 ? 'text-base sm:text-lg' : txt.length > 3 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl')
  const solidCls = mini
    ? 'bg-[linear-gradient(180deg,#f08a5d,#d9603b)] text-white shadow-[inset_0_2px_0_rgb(255_255_255/.35),0_3px_0_#a8432a]'
    : 'bg-[linear-gradient(180deg,#5b7cfa,#4058d6)] text-white shadow-[inset_0_2px_0_rgb(255_255_255/.3),0_3px_0_#2f3fa3]'

  const rows = []
  for (let k = n - 1; k >= 0; k--) {
    const cells = []
    for (let i = 0; i < n - k; i++) {
      const key = K(k, i)
      const isSel = sel === key
      const isMine = mine.has(key)
      const open = T.kind === 'open'
      let content: string
      let cls: string
      let clickable = false
      if (open) {
        content = fmtV(levelsShown[k][i])
        const hitTop = k === n - 1 && openTop === T.target
        cls = k === 0 ? `${solidCls} ring-2 ring-white/60` : hitTop ? 'bg-emerald-500 text-white shadow-[0_3px_0_#047857]' : mini ? 'bg-orange-100 text-orange-900 ring-2 ring-orange-300' : 'bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
      } else if (unknownTask && key === K(0, T.unknown!)) {
        clickable = !S.done
        content = isSel && input ? input : guess !== null ? fmtV(guess) : '?'
        cls = S.done ? 'bg-emerald-500 text-white shadow-[0_3px_0_#047857]' : `bg-amber-100 text-amber-900 border-2 border-dashed border-amber-500 ${isSel ? 'ring-4 ring-brand/60' : ''}`
      } else if (known.has(key) && !(unknownTask && !S.done && k > 0 && k < n - 1)) {
        content = fmtV(levelsShown[k][i])
        cls = isMine ? `bg-emerald-500 text-white shadow-[0_3px_0_#047857] ${pulse === key ? 'animate-pop' : ''}` : solidCls
      } else if (unknownTask) {
        content = guessLevels ? fmtV(guessLevels[k][i]) : '?'
        cls = guessLevels ? 'bg-white/80 text-ink-soft italic ring-2 ring-line' : 'bg-white/70 text-ink-soft ring-2 ring-dashed ring-line'
      } else {
        clickable = !S.done
        content = isSel ? input || '?' : '?'
        cls = `bg-white/90 text-brand border-2 border-dashed ${mini ? 'border-orange-400' : 'border-indigo-400'} ${isSel ? 'ring-4 ring-brand/50 bg-brand-soft' : ''}`
      }
      const scrub = open && k === 0 && !S.done
      cells.push(
        <div key={key} className="px-[3px]" style={{ width: `${100 / (n - k)}%` }} data-brick={key}>
          {scrub ? (
            <div
              {...bindScrub(i)}
              data-handle
              role="slider"
              aria-label={`Alt taş ${i + 1}`}
              aria-valuenow={openBase[i]}
              style={{ touchAction: 'none' }}
              className={`relative grid ${brickH} cursor-ns-resize place-items-center rounded-xl font-black ${cls} ${fontCls(content)}`}
            >
              {content}
              <MoveVertical size={14} className="absolute top-1 right-1 opacity-70" />
            </div>
          ) : (
            <button
              type="button"
              disabled={!clickable}
              onClick={() => {
                setSel(key)
                setInput('')
              }}
              aria-label={content === '?' ? 'Boş taş' : `Taş ${content}`}
              className={`grid w-full ${brickH} place-items-center rounded-xl font-black tabular-nums transition disabled:cursor-default ${cls} ${fontCls(content)}`}
            >
              {content}
            </button>
          )}
        </div>,
      )
    }
    rows.push(
      <div key={k} className="flex justify-center" style={{ width: `${((n - k) / n) * 100}%`, margin: '0 auto' }}>
        {cells}
      </div>,
    )
  }

  const showMult = T.kind === 'open' && S.done
  const ruleBadge = (
    <div className={`mb-3 flex flex-wrap items-center justify-center gap-2 text-sm font-extrabold ${mini ? 'text-orange-900' : 'text-indigo-900'}`}>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ${mini ? 'bg-orange-50 ring-orange-200' : 'bg-indigo-50 ring-indigo-200'}`}>
        <MiniRule op={T.op} />
        {T.op === '+' ? 'Üstteki = alttakilerin toplamı' : 'Üstteki = alttakilerin çarpımı'}
      </span>
      {(T.kind === 'open' || T.kind === 'unknown') && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-900 ring-1 ring-emerald-200">
          <Target size={15} />Hedef tepe: {fmtV(T.target!)}
        </span>
      )}
    </div>
  )

  const scene = (
    <div className="mx-auto w-full max-w-[560px] py-1">
      {ruleBadge}
      <div className={`rounded-2xl p-2 sm:p-3 ${mini ? 'bg-[#fbe7d3]' : 'bg-white/60'}`}>
        <div className="flex flex-col gap-1.5" data-pyramid={T.op} data-kind={T.kind} data-target={T.target}>{rows}</div>
        {T.kind === 'open' && !S.done && (
          <div className="mt-2 flex">
            {openBase.map((v, i) => (
              <div key={i} className="flex gap-1 px-[3px]" style={{ width: `${100 / n}%` }}>
                <button type="button" onClick={() => setBaseAt(i, v - (T.step ?? 1), true)} className={`grid flex-1 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 ${mini ? 'min-h-14' : 'min-h-12'}`} aria-label={`Alt taş ${i + 1} azalt`}><ChevronDown size={22} /></button>
                <button type="button" onClick={() => setBaseAt(i, v + (T.step ?? 1), true)} className={`grid flex-1 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 ${mini ? 'min-h-14' : 'min-h-12'}`} aria-label={`Alt taş ${i + 1} artır`}><ChevronUp size={22} /></button>
              </div>
            ))}
          </div>
        )}
        {showMult && (
          <div className="mt-2 flex">
            {openBase.map((_, i) => (
              <div key={i} className="px-[3px] text-center" style={{ width: `${100 / n}%` }}>
                <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-sm font-black text-amber-900 ring-1 ring-amber-300 animate-pop">{ways(n, i)} kez</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {T.kind === 'open' && (
        <p className={`mt-3 text-center text-lg font-black ${openTop === T.target ? 'text-emerald-700' : 'text-ink'}`}>
          Tepe: {fmtV(openTop)} {openTop === T.target ? '✓' : openTop < T.target! ? `(hedefe ${fmtV(r2(T.target! - openTop))} var)` : `(hedefi ${fmtV(r2(openTop - T.target!))} geçti)`}
        </p>
      )}
      {unknownTask && guessLevels && !S.done && (
        <p className="mt-3 text-center text-lg font-black text-ink">
          Senin piramidinin tepesi: {fmtV(guessLevels[n - 1][0])} <span className="text-ink-soft">· hedef {fmtV(T.target!)}</span>
        </p>
      )}
    </div>
  )

  const showPad = !S.done && (T.kind === 'fill' || T.kind === 'unknown') && sel
  const panel = (
    <>
      {showPad && (
        <div className={`mx-auto w-full max-w-md rounded-2xl p-3 lg:max-w-none ${age.panelClass}`}>
          <p className="mb-2 text-center text-sm font-black text-ink-soft">{unknownTask ? 'Ortadaki taş için bir sayı dene' : 'Seçili taşa sayı yaz'}</p>
          <div className="mb-2 grid min-h-12 place-items-center rounded-xl bg-paper text-2xl font-black tabular-nums ring-1 ring-line">{input || '…'}</div>
          <NumPad value={input} onChange={setInput} onSubmit={submit} big={mini} decimal={T.decimal} maxLen={T.decimal ? 5 : 5} submitLabel={unknownTask ? 'Dene' : 'Yaz'} />
        </div>
      )}
      {!S.done && T.kind === 'fill' && !sel && <p className="rounded-2xl bg-white/90 p-3 text-center font-bold text-ink-soft ring-1 ring-line">Bir boş taşa dokun.</p>}
      {T.kind === 'open' && <SolutionList list={sol.list} goal={T.goal} />}
    </>
  )

  const doneBox = (
    <DoneNote
      title={T.kind === 'open' ? `${found.length} farklı piramit buldun!` : 'Piramit tamam!'}
      note={
        T.kind === 'open'
          ? `Taban taşları tepeye ${openBase.map((_, i) => ways(n, i)).join(', ')} kez katılıyor. ${n === 3 ? 'Ortadaki taş iki taşa birden katıldığı için iki kez sayılır.' : 'Ortadaki taşlar tepeye üç yoldan ulaşır.'}`
          : T.note
      }
    >
      {T.picker && <StrategyPicker key={S.idx} question={T.picker.q} options={T.picker.options} onPick={() => undefined} />}
    </DoneNote>
  )

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title={T.title}
      prompt={T.prompt}
      panel={panel}
      nudge={N.nudge}
      onCloseNudge={N.clear}
      done={S.done}
      doneBox={doneBox}
      onNext={next}
      nextLabel={S.last ? 'Bitir' : 'Sonraki piramit'}
      onHint={hint}
      onReset={T.kind === 'open' ? () => setOpenBase(T.base) : undefined}
    >
      {scene}
    </ActivityLayout>
  )
}

function MiniRule({ op }: { op: Op }) {
  return (
    <svg viewBox="0 0 54 34" width={40} height={26} aria-hidden>
      <rect x={14} y={1} width={26} height={14} rx={3} fill="currentColor" opacity={0.85} />
      <rect x={1} y={19} width={25} height={14} rx={3} fill="currentColor" opacity={0.45} />
      <rect x={28} y={19} width={25} height={14} rx={3} fill="currentColor" opacity={0.45} />
      <text x={27} y={12} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">{op}</text>
    </svg>
  )
}

function insightFor(grade: Grade) {
  if (grade === 2) return 'Yukarı çıkarken toplarsın; aşağı inerken “hangi sayıyla toplanınca?” diye sorarsın: toplama ile çıkarma birbirinin tersidir.'
  if (grade === 3) return 'Toplama ve çıkarma birbirini geri alır: 30 = 12 + 18 ise 30 − 12 = 18. Ortadaki taban taşı tepeye iki kez katılır.'
  if (grade === 4) return 'Toplamanın tersi çıkarma, çarpmanın tersi bölme. Üç katlı piramitte tepe = sol + 2 × orta + sağ.'
  if (grade === 5) return 'Taban taşları tepeye farklı sayıda yoldan ulaşır: 3 katlıda 1, 2, 1; 4 katlıda 1, 3, 3, 1 kez.'
  return 'Bilinmeyeni bulmak için ilişkiyi yaz: tepe = a + 2x + c ise x = (tepe − a − c) ÷ 2. Çarpım piramidinde ise x iki kez çarpan olur.'
}
