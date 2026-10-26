import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Eraser, Flag, Lightbulb, Link2, Megaphone, Scissors } from 'lucide-react'
import type { ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { celebrate, sfx } from '../../../lib/feedback'
import { ek, numberToWords } from '../../../lib/generators'
import { useTracker } from '../../../lib/trackerContext'
import { starsFor, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { DragSource } from './drag'
import { buildLevels, rev, valueOf, type Level } from './levels'
import { RailScene, type TrainItem } from './RailScene'
import { repKey, repLabel, repSpeak, WagonSvg, type Car, type Rep } from './reps'

/**
 * Sayı Treni (1–2. sınıf) — sayı temsilleri, sıralama, karşılaştırma, basamak değeri.
 *  1. sınıf: 20’ye kadar; onluk çerçeve, 5’li nokta desenleri, çetele, sözcük; 5 ve 10 çapaları;
 *            koşullu tren (… büyük, … küçük), bir fazlası / geri sayım, sıra sayılarıyla dizme.
 *  2. sınıf: 100’e kadar; onluk-birlik yükleme (esnek ayrıştırma), açılım (40 + 7 = 30 + 17),
 *            onar / beşer ritmik sayma, ±1 ve ±10 komşular, bilet kuralı, basamak değeriyle sıralama.
 * Her farklı temsil / sayı / ayrıştırma useSolutions ile ayrı çözüm sayılır.
 */

type NudgeState = { question: string; tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; misconception?: string; tone?: 'think' | 'ok' }
type Phase = 'arrive' | 'play' | 'wait' | 'depart' | 'done'

const NUDGE_WRAP = '[&>div:has(>div>button+button)>p]:basis-[calc(100%-3rem)] [&>div>div]:ml-auto'
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const KIND_NAME: Record<Rep['k'], string> = {
  num: 'rakam',
  word: 'sözcük',
  dots: 'nokta deseni',
  frame: 'onluk çerçeve',
  tally: 'çetele',
  b10: 'onluk-birlik blokları',
  exp: 'açılım',
  place: 'basamak tablosu',
}

let loadUid = 0

/** Çocuk dilindeki seçimleri öğretmen raporundaki strateji adlarına eşler */
const PICK_MAP: Record<string, string> = {
  'Bakınca gördüm': 'Şipşak görme (saymadan)',
  '5’ten devam ettim': '5 ve 10 çapası',
  'Boş karelere baktım': '5 ve 10 çapası',
  '5 ve 10’a göre baktım': '5 ve 10 çapası',
  'Sayı doğrusunu düşündüm': 'Sayı doğrusunu düşünme',
  'Önce onluklara baktım': 'Basamak değerine göre karşılaştırma',
  'Önce 10’dan küçükleri seçtim': '5 ve 10 çapası',
  'Onlukları 10’ar saydım': 'Onar ritmik sayma',
  'Onluk ve birlikleri ayırdım': 'Onluk ve birliklere ayırma',
  'Onar saydım': 'Onar ritmik sayma',
  'Onlar basamağı 1 arttı': 'Onar ritmik sayma',
  'Bir onluk ekledim': 'Onluk ve birliklere ayırma',
}

export default function SayiTreni({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => buildLevels(grade), [grade])
  const track = useTracker()
  const sol = useSolutions()
  const g1 = grade <= 1

  const [li, setLi] = useState(0)
  const L: Level = levels[li]
  const [train, setTrain] = useState<Car[]>([])
  const [slots, setSlots] = useState<(Car | null)[]>(() => (levels[0].slots ?? []).map(() => null))
  const [sel, setSel] = useState<number | null>(null)
  const [flag, setFlag] = useState<Set<string>>(new Set())
  const [good, setGood] = useState<Set<string>>(new Set())
  const [fresh, setFresh] = useState<string | null>(null)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [hint, setHint] = useState(-1)
  const [miss, setMiss] = useState(false)
  const [phase, setPhase] = useState<Phase>('arrive')
  const [pos, setPos] = useState<'right' | 'home' | 'left'>('right')
  const [anim, setAnim] = useState(false)
  const [b, setB] = useState({ t: 0, o: 0 })
  const [found, setFound] = useState<{ key: string; label: string }[]>([])

  const stats = useRef({ items: 0, first: 0, ways: 0, bonus: 0, kinds: new Set<string>(), loads: [] as string[], strategies: new Set<string>() })
  const levelStrats = useRef(new Set<string>())
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  /* ───────── tren gelişi ───────── */
  useEffect(() => {
    setAnim(false)
    setPos('right')
    setPhase('arrive')
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setAnim(true)
        setPos('home')
      })
    })
    const t = window.setTimeout(() => setPhase((p) => (p === 'arrive' ? 'play' : p)), reduced() ? 30 : 2300)
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      window.clearTimeout(t)
    }
  }, [li])

  const active = phase === 'arrive' || phase === 'play'
  const isSlotLevel = L.kind === 'missing' || L.kind === 'order'
  const used = new Set([...train.map((c) => c.id), ...slots.filter(Boolean).map((c) => c!.id)])
  const yard = L.yard.filter((c) => !used.has(c.id))
  const maxCars = L.goal + 2

  const tool = (): Pick<NudgeState, 'tool' | 'toolConfig'> => {
    if (L.kind === 'missing' && !g1) return { tool: 'yuzluk' }
    if (L.kind === 'order' || L.kind === 'range') return g1 ? { tool: 'numberline', toolConfig: { min: 0, max: 20, step: 1 } } : { tool: 'yuzluk' }
    return g1 ? { tool: 'tenframe', toolConfig: { frames: 2 } } : { tool: 'base10' }
  }

  const strat = (name: string) => {
    if (levelStrats.current.has(name)) return
    levelStrats.current.add(name)
    stats.current.strategies.add(name)
    track.strategy(name)
  }

  const clearMarks = () => {
    setFlag(new Set())
    setNudge(null)
  }

  const flashFresh = (id: string) => {
    setFresh(id)
    later(() => setFresh((f) => (f === id ? null : f)), 600)
  }

  /* ───────── vagon yerleştirme ───────── */
  const place = (c: Car, zone?: string | null) => {
    if (!active) return
    setHint(-1)
    if (!isSlotLevel) {
      if (train.length >= maxCars) {
        setNudge({ question: g1 ? 'Tren doldu! Bir vagona dokun, çıkar.' : 'Tren doldu! Fazla vagonlara dokunup çıkarabilirsin.' })
        return
      }
      setTrain([...train, c])
      setGood(new Set())
      clearMarks()
      flashFresh(c.id)
      return
    }
    const slotDefs = L.slots!
    let i = -1
    if (zone?.startsWith('slot-')) i = Number(zone.slice(5))
    else if (sel !== null) i = sel
    else i = slotDefs.findIndex((s, j) => !s.fixed && !slots[j])
    if (i < 0 || slotDefs[i]?.fixed) {
      if (i < 0) setNudge({ question: 'Bütün yuvalar dolu. Değiştirmek istediğin vagona dokun.' })
      return
    }
    setSlots(slots.map((x, j) => (j === i ? c : x)))
    setSel(null)
    setGood(new Set())
    clearMarks()
    flashFresh(c.id)
  }

  const unplaceTrain = (c: Car) => {
    if (!active || L.kind === 'load') return
    setTrain(train.filter((x) => x.id !== c.id))
    setGood(new Set())
    clearMarks()
  }

  const tapSlot = (i: number) => {
    if (!active) return
    if (slots[i]) {
      setSlots(slots.map((x, j) => (j === i ? null : x)))
      setSel(i)
      setGood(new Set())
      clearMarks()
    } else setSel(sel === i ? null : i)
  }

  /* ───────── tamamlama ───────── */
  const complete = () => {
    track.item(!miss)
    stats.current.items++
    if (!miss) stats.current.first++
    if (L.auto) strat(L.auto)
    sfx.win()
    celebrate(false)
    setPhase('wait')
    later(() => {
      setAnim(true)
      setPos('left')
      setPhase('depart')
    }, reduced() ? 300 : 1100)
    later(() => setPhase('done'), reduced() ? 400 : 3500)
  }

  /* ───────── geri bildirim soruları ───────── */
  const coupleNudge = (c: Car): NudgeState => {
    const T = L.target!
    const v = valueOf(c)
    const r = c.rep
    const t = Math.floor(T / 10)
    const o = T % 10
    switch (r.k) {
      case 'num':
        return v === rev(T) && T >= 10
          ? {
              question: g1 ? `${v} ile ${T} aynı mı? Hangisi 1 onluk ve ${o} birlik?` : `${v} ile ${T} aynı mı? ${T} sayısında kaç onluk var?`,
              misconception: `Basamakları ters okudu (${T} ↔ ${v})`,
              ...tool(),
            }
          : { question: `Bu vagonda ${v} yazıyor. Lokomotif ${T} istiyor. İkisi aynı mı?`, ...tool() }
      case 'exp':
        return r.parts.every((p) => p < 10) && T >= 10
          ? {
              question: `${r.parts.join(' + ')} kaç eder? ${T} sayısındaki ${r.parts[0]}, ${r.parts[0]} birlik mi, ${r.parts[0]} onluk mu?`,
              misconception: `Basamak değerini göz ardı etti (${T} sayısını ${r.parts.join(' + ')} sandı)`,
              ...tool(),
            }
          : { question: `${r.parts.join(' + ')} kaç eder? Onlukları ve birlikleri ayrı ayrı topla.`, ...tool() }
      case 'frame':
        return { question: `Bu çerçevede kaç sayaç var? ${v > 10 || T > 10 ? 'Dolu bir çerçeve 10 eder. ' : ''}Boş karelere bak: 10’dan kaç eksik?`, tool: 'tenframe', toolConfig: { frames: v > 10 ? 2 : 1 } }
      case 'dots':
        return { question: r.style === 'ten' ? 'Mavi noktalar 10 tane. Turuncu noktalarla birlikte kaç oldu?' : 'Noktaları gruplara ayır: 5 ve kalan. Kaç tane oldu?', tool: 'noktakartlari' }
      case 'tally':
        return { question: 'Çetelede her demet 5 çizgi. 5, 10… diye say. Kaç çizgi var?' }
      case 'b10':
        return r.t === t && r.o !== o
          ? { question: `Onluklar doğru! Şimdi birlikleri tek tek say. ${T} için kaç birlik gerekir?`, tool: 'base10' }
          : { question: 'Onlukları 10, 20, 30… diye say, sonra birlikleri ekle. Kaç oldu?', tool: 'base10' }
      case 'place':
        return r.t === o && r.o === t
          ? { question: `${r.t} onluk ${r.o} birlik kaç eder? ${T} sayısında kaç onluk var?`, misconception: `Onluk ve birlikleri yer değiştirdi (${T} için ${r.t} onluk ${r.o} birlik)`, tool: 'base10' }
          : { question: `${r.t} onluk ${r.o} birlik kaç eder? Lokomotif ${T} istiyor.`, tool: 'base10' }
      case 'word':
        return { question: `“${numberToWords(v)}” sözcüğünü sesli oku. ${T} ile aynı mı?`, ...(v === rev(T) ? { misconception: `Basamakları ters okudu (${T} ↔ ${v})` } : {}) }
    }
  }

  const rangeNudge = (c: Car): NudgeState => {
    const [lo, hi] = L.range!
    const v = valueOf(c)
    const mis = 'Sınır sayısını da aldı (“… büyük” derken sayının kendisini)'
    if (v === lo) return { question: `Bu vagonda ${lo} var. ${lo}, ${ek(lo, 'abl')} büyük mü, yoksa ona eşit mi?`, misconception: mis, ...tool() }
    if (v === hi) return { question: `Bu vagonda ${hi} var. ${hi}, ${ek(hi, 'abl')} küçük mü, yoksa ona eşit mi?`, misconception: mis, ...tool() }
    if (v < lo) return { question: `Bu vagonda kaç var? O sayı ${ek(lo, 'abl')} büyük mü?`, ...tool() }
    if (!g1 && rev(v) > lo && rev(v) < hi) return { question: `Bu vagonda kaç onluk var? ${ek(hi, 'abl')} küçük mü?`, misconception: `Basamakları ters okudu (${v} ↔ ${rev(v)})`, ...tool() }
    return { question: `Bu vagonda kaç var? O sayı ${ek(hi, 'abl')} küçük mü?`, ...tool() }
  }

  const valAt = (i: number) => {
    const s = L.slots![i]
    if (!s) return null
    if (s.fixed) return valueOf(s.fixed)
    return slots[i] ? valueOf(slots[i]!) : null
  }

  const missingNudge = (i: number): NudgeState => {
    const s = L.slots![i]
    const v = valueOf(slots[i]!)
    const a = s.answer!
    const step = L.step!
    const prev = valAt(i - 1)
    if (step === 0) {
      const ten = s.tag!.startsWith('10')
      const up = s.tag!.endsWith('fazlası')
      const c = valAt(2) ?? 0
      const acc = s.tag!.replace('fazlası', 'fazlasını').replace('eksiği', 'eksiğini')
      if (ten && Math.abs(v - c) === 1)
        return { question: `“${s.tag}” için ortadaki sayıya bir onluk ${up ? 'ekle' : 'çıkar'}. Birlikler değişir mi?`, misconception: 'Bir fazlası ile 10 fazlasını karıştırdı', tool: 'base10' }
      if (!ten && Math.abs(v - c) === 10)
        return { question: `“${s.tag}” için ortadaki sayıya bir birlik ${up ? 'ekle' : 'çıkar'}. Onluklar değişir mi?`, misconception: 'Bir fazlası ile 10 fazlasını karıştırdı', tool: 'base10' }
      return { question: `Önce ortadaki blokları oku: kaç onluk, kaç birlik? Sonra onun ${acc} düşün.`, tool: 'base10' }
    }
    const answers = L.slots!.map((x) => x.answer).filter((x): x is number => x !== undefined)
    if (rev(v) !== v && answers.includes(rev(v))) return { question: `${v} ile ${rev(v)} aynı mı? Rakamların yerine bak: kaç onluk var?`, misconception: `Basamakları ters okudu (${rev(v)} ↔ ${v})`, ...tool() }
    if (step === -1) {
      if (prev !== null && v === prev + 1) return { question: `Tren geriye sayıyor: sayılar küçülüyor. ${ek(prev, 'abl')} bir eksiği kaç?`, misconception: 'Geriye saymada yönü karıştırdı', ...tool() }
      return { question: prev !== null ? `${ek(prev, 'abl')} geriye bir adım say. Hangi sayıya gelirsin?` : 'Sağdaki vagona bak. Onun bir fazlası kaç?', tool: 'numberline', toolConfig: { min: 0, max: 20, step: 1 } }
    }
    if (step === 1) return { question: 'Soldaki vagonda kaç yolcu var? Bir yolcu daha binerse kaç olur?', tool: 'tenframe', toolConfig: { frames: 1 } }
    if (step === 10) {
      if (Math.abs(v - a) === 1 || (prev !== null && v === prev + 1))
        return { question: 'Yan yana vagonlara bak: her adımda onluklar mı değişiyor, birlikler mi?', misconception: 'Onar sayma yerine birer saydı', tool: 'yuzluk' }
      return { question: 'İki vagon arasında kaç onluk fark var? Bir önceki vagona bir onluk ekle.', tool: 'yuzluk' }
    }
    // beşer / ikişer
    if (prev !== null && v === prev + 1) return { question: `${valAt(0)}, ${valAt(1)}… İki vagon arasında kaç adım var? Bu tren birer mi sayıyor?`, misconception: 'Ritmik sayma yerine birer saydı', tool: 'yuzluk' }
    return { question: `İki vagon arasında kaç adım var? Her vagonda ${step} eklenirse sıradaki kaç olur?`, tool: 'yuzluk' }
  }

  /* ───────── kontrol ───────── */
  const onWhistle = () => {
    if (!active) return
    setHint(-1)
    if (L.kind === 'couple' || L.kind === 'range') {
      if (!train.length) {
        setNudge({ question: g1 ? 'Önce trene vagon bağla! Bir vagona dokun.' : 'Önce depodan trene vagon bağla.' })
        return
      }
      const ok = (c: Car) => (L.kind === 'couple' ? valueOf(c) === L.target : valueOf(c) > L.range![0] && valueOf(c) < L.range![1])
      const wrong = train.filter((c) => !ok(c))
      if (wrong.length) {
        track.attempt(false)
        setMiss(true)
        sfx.bad()
        setFlag(new Set(wrong.map((c) => c.id)))
        setGood(new Set(train.filter(ok).map((c) => c.id)))
        const n = wrong.length > 1 ? (g1 ? ` (${wrong.length} vagon düşündürüyor.)` : ` (${wrong.length} vagona yeniden bak.)`) : ''
        const nd = L.kind === 'couple' ? coupleNudge(wrong[0]) : rangeNudge(wrong[0])
        setNudge({ ...nd, question: nd.question + n })
        return
      }
      track.attempt(true)
      setGood(new Set(train.map((c) => c.id)))
      const byKey = new Map<string, Car>()
      train.forEach((c) => {
        const k = L.kind === 'couple' ? repKey(c.rep) : String(valueOf(c))
        if (!byKey.has(k)) byKey.set(k, c)
      })
      const fresh: { key: string; label: string }[] = []
      byKey.forEach((c, k) => {
        const label = L.kind === 'couple' ? repLabel(c.rep) : String(valueOf(c))
        if (!found.some((f) => f.key === k)) {
          fresh.push({ key: k, label })
          sol.add(`${li}:${k}`, label)
          stats.current.ways++
          if (L.kind === 'couple') stats.current.kinds.add(KIND_NAME[c.rep.k])
        }
      })
      const all = [...found, ...fresh]
      setFound(all)
      const dup = train.length > byKey.size
      const count = byKey.size
      if (count >= L.goal) {
        stats.current.bonus += count - L.goal
        setNudge({ tone: 'ok', question: `${L.note} Tren yola çıkıyor!` })
        complete()
        return
      }
      sfx.ok()
      const left = L.goal - count
      const unit = L.kind === 'couple' ? 'vagon' : 'sayı'
      setNudge({
        tone: dup ? 'think' : 'ok',
        question: dup
          ? `İki vagonda aynı sayı var! Trene ${left} farklı ${unit} daha lazım.`
          : g1
            ? `Harika! ${count} ${unit} tamam. ${left} tane daha bul!`
            : `Harika! ${count} farklı ${unit}. ${left} tane daha bul!`,
      })
      return
    }
    if (isSlotLevel) {
      const defs = L.slots!
      const empty = defs.findIndex((s, i) => !s.fixed && !slots[i])
      if (empty >= 0) {
        setSel(empty)
        setNudge({ question: g1 ? 'Boş vagon kaldı! Onu da doldur.' : 'Önce boş yuvaları doldur. Mavi çerçeveli yuvaya bir vagon koy.' })
        return
      }
      if (L.kind === 'missing') {
        const wrong = defs.map((s, i) => (!s.fixed && valueOf(slots[i]!) !== s.answer ? i : -1)).filter((i) => i >= 0)
        if (wrong.length) {
          track.attempt(false)
          setMiss(true)
          sfx.bad()
          setFlag(new Set(wrong.map((i) => slots[i]!.id)))
          setGood(new Set(defs.map((s, i) => (!s.fixed && !wrong.includes(i) ? slots[i]!.id : '')).filter(Boolean)))
          setNudge(missingNudge(wrong[0]))
          return
        }
      } else {
        const v = slots.map((c) => valueOf(c!))
        const i = v.findIndex((x, j) => j < v.length - 1 && x > v[j + 1])
        if (i >= 0) {
          track.attempt(false)
          setMiss(true)
          sfx.bad()
          setFlag(new Set([slots[i]!.id, slots[i + 1]!.id]))
          const a = v[i]
          const bb = v[i + 1]
          const byOnes = !g1 && Math.floor(a / 10) > Math.floor(bb / 10) && a % 10 < bb % 10
          setNudge({
            question: g1
              ? `${i + 1}. ve ${i + 2}. vagona bak. Hangisinde daha çok var? Küçük olan önce gelir.`
              : `${i + 1}. ve ${i + 2}. vagonu karşılaştır. Önce onluklara bak: hangisinde daha çok onluk var?`,
            misconception: byOnes ? 'Sayıları birler basamağına göre karşılaştırdı' : undefined,
            ...tool(),
          })
          return
        }
      }
      track.attempt(true)
      setGood(new Set(slots.filter(Boolean).map((c) => c!.id)))
      setNudge({ tone: 'ok', question: `${L.note} Tren yola çıkıyor!` })
      complete()
    }
  }

  /* ───────── 2. sınıf: vagon yükleme ───────── */
  const total = b.t * 10 + b.o
  const addRod = () => {
    if (!active) return
    if (b.t >= 9) return setNudge({ question: 'Vagona en çok 9 onluk sığar.' })
    setB({ ...b, t: b.t + 1 })
    setNudge(null)
  }
  const addCube = () => {
    if (!active) return
    if (b.o >= 30) return setNudge({ question: 'Vagonda yer kalmadı! 10 birliği bir onluğa çevirebilirsin.' })
    setB({ ...b, o: b.o + 1 })
    setNudge(null)
  }
  const breakRod = () => {
    if (!active || b.t === 0) return setNudge({ question: 'Bozmak için vagonda bir onluk olmalı.' })
    if (b.o + 10 > 30) return setNudge({ question: 'Vagonda çok birlik var. Önce birkaç birliği çıkar.' })
    setB({ t: b.t - 1, o: b.o + 10 })
    setNudge({ tone: 'ok', question: 'Bir onluk 10 birlik oldu. Vagondaki sayı değişti mi?' })
  }
  const groupTen = () => {
    if (!active || b.o < 10) return
    setB({ t: b.t + 1, o: b.o - 10 })
    setNudge(null)
  }
  const onLoad = () => {
    if (!active) return
    setHint(-1)
    const T = L.target!
    if (total === 0) return setNudge({ question: 'Vagon boş! Onluk ya da birlik sürükle veya dokun.' })
    if (total !== T) {
      track.attempt(false)
      setMiss(true)
      sfx.bad()
      setNudge({
        question: `Vagonda ${b.t} onluk ${b.o} birlik var. Onlukları 10, 20… diye sayıp birlikleri ekle: ${T} oldu mu? ${total < T ? 'Biraz eksik kaldı.' : 'Biraz fazla oldu.'}`,
        misconception: b.t === T % 10 && b.o === Math.floor(T / 10) ? `Onluk ve birlikleri yer değiştirdi (${T} için ${b.t} onluk ${b.o} birlik)` : undefined,
        tool: 'base10',
      })
      return
    }
    track.attempt(true)
    const key = `${b.t}-${b.o}`
    if (found.some((f) => f.key === key)) {
      setNudge({ question: `${b.t} onluk ${b.o} birlik trende zaten var. Bir onluğu bozarsan ne olur?` })
      return
    }
    const label = `${b.t} onluk ${b.o} birlik`
    sol.add(`${li}:${key}`, label)
    stats.current.ways++
    stats.current.loads.push(b.t === 0 ? `${b.o} birlik` : b.o === 0 ? `${b.t} onluk` : `${b.t * 10} + ${b.o}`)
    stats.current.kinds.add(KIND_NAME.b10)
    strat(b.t < Math.floor(T / 10) ? 'Esnek basamak değeri (onluğu bozma)' : 'Onluk ve birliklere ayırma')
    const c: Car = { id: `ld${++loadUid}`, rep: { k: 'b10', t: b.t, o: b.o }, color: (train.length * 2 + 1) % 6 }
    const nt = [...train, c]
    setTrain(nt)
    flashFresh(c.id)
    const all = [...found, { key, label }]
    setFound(all)
    if (all.length >= L.goal) {
      setNudge({ tone: 'ok', question: `${L.note} Tren yola çıkıyor!` })
      complete()
    } else {
      setNudge({ tone: 'ok', question: `${b.t} onluk ${b.o} birlik = ${T}. Vagon bağlandı! ${L.goal - all.length} farklı yol daha bul.` })
    }
  }

  /* ───────── seviye geçişi ───────── */
  const nextLevel = () => {
    if (li + 1 >= levels.length) return finish()
    const nl = levels[li + 1]
    setLi(li + 1)
    setTrain([])
    setSlots((nl.slots ?? []).map(() => null))
    setSel(null)
    setFlag(new Set())
    setGood(new Set())
    setNudge(null)
    setHint(-1)
    setMiss(false)
    setB({ t: 0, o: 0 })
    setFound([])
    levelStrats.current = new Set()
  }

  const finish = () => {
    const s = stats.current
    const ratio = s.items ? s.first / s.items : 1
    let stars = starsFor(ratio)
    if (s.bonus >= 2 && stars < 3) stars = (stars + 1) as 1 | 2 | 3
    const kinds = [...s.kinds]
    const kindsTxt = kinds.join(', ')
    onFinish({
      stars,
      score: s.ways * 10 + s.first * 5 + s.bonus * 5,
      summary: `${levels.length} treni yola çıkardın ve ${s.ways} farklı vagon buldun.`,
      insight: g1
        ? `Bir sayıyı ${kinds.length} farklı biçimde tanıdın${kindsTxt ? ` (${kindsTxt})` : ''}. 5 ve 10 çapaları sayıyı saymadan görmeyi sağlar; her sayının bir fazlası ve bir eksiği vardır.`
        : `${s.loads.length ? `Aynı sayıyı ${s.loads.join(', ')} diye farklı yollarla yükledin. ` : ''}Bir onluğu bozmak sayıyı değiştirmez; 10 fazlasında onlar basamağı bir artar, birlikler aynı kalır.`,
    })
  }

  /* ───────── tren görünümü ───────── */
  const items: TrainItem[] = useMemo(() => {
    if (isSlotLevel) {
      return L.slots!.map((s, i) => {
        if (s.fixed) return { key: `f${i}`, car: s.fixed, tag: s.tag, fixed: true, label: `${i + 1}. vagon: ${repSpeak(s.fixed.rep)}` }
        const c = slots[i]
        return c
          ? { key: `s${i}`, car: c, tag: s.tag, flagged: flag.has(c.id), good: good.has(c.id), fresh: fresh === c.id, drop: `slot-${i}`, onTap: active ? () => tapSlot(i) : undefined, label: `${s.tag ?? `${i + 1}.`} yuva: ${repSpeak(c.rep)}. Çıkarmak için dokun.` }
          : { key: `s${i}`, tag: s.tag, drop: `slot-${i}`, selected: sel === i, onTap: active ? () => tapSlot(i) : undefined, label: `${s.tag ?? `${i + 1}.`} boş yuva` }
      })
    }
    const out: TrainItem[] = train.map((c, i) => ({
      key: c.id,
      car: c,
      flagged: flag.has(c.id),
      good: good.has(c.id),
      fresh: fresh === c.id,
      onTap: active && L.kind !== 'load' ? () => unplaceTrain(c) : undefined,
      label: `${i + 1}. vagon: ${repSpeak(c.rep)}${L.kind !== 'load' ? '. Çıkarmak için dokun.' : ''}`,
    }))
    if (active && L.kind !== 'load' && train.length < L.goal) out.push({ key: 'plus', plus: true, drop: 'train', label: 'Bağlama yeri' })
    if (L.kind === 'load' && phase !== 'depart' && phase !== 'done' && train.length < L.goal) out.push({ key: 'plus', plus: true })
    return out
  }, [L, slots, train, flag, good, fresh, sel, active, phase])

  const moving = phase === 'arrive' || phase === 'depart'
  const happy = phase === 'wait' || phase === 'depart' || phase === 'done'
  const doneSolutions = found
  const showSolutions = (L.kind === 'couple' || L.kind === 'range' || L.kind === 'load') && doneSolutions.length > 0

  const hintBtn = (
    <button
      type="button"
      onClick={() => {
        const n = Math.min(hint + 1, L.hints.length - 1)
        if (n !== hint) track.hint()
        setHint(n)
      }}
      className="inline-flex min-h-14 items-center gap-1.5 rounded-2xl bg-amber-50 px-4 text-base font-extrabold text-amber-900 ring-1 ring-amber-200"
    >
      <Lightbulb size={18} />İpucu
    </button>
  )

  return (
    <Scene grade={grade} className="!p-2 sm:!p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start" data-kind={L.kind} data-target={L.target} data-range={L.range?.join(',')} data-answers={L.slots?.map((s) => s.answer ?? '').join(',')}>
        <header className="lg:col-start-2 lg:row-start-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <LevelDots current={li} total={levels.length} />
            <span className="flex items-center gap-1.5">
              <span className="chip bg-orange-100 px-2.5 py-1 text-xs text-orange-800 ring-1 ring-orange-200">{L.stage}</span>
              <span className="chip bg-white px-2.5 py-1 text-xs text-ink ring-1 ring-line">İstasyon {li + 1}/{levels.length}</span>
            </span>
          </div>
          <TaskCard step={li + 1} total={levels.length}>
            <span className="block text-xs font-black tracking-wide text-orange-700 uppercase">{L.title}</span>
            <span className="mt-0.5 block">{L.prompt}</span>
          </TaskCard>
        </header>

        <section className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <div data-drop="train">
            <ZoomBox className="overflow-hidden rounded-3xl shadow-[0_6px_24px_rgba(194,65,12,.16)] ring-1 ring-orange-200">
              <RailScene items={items} plate={L.plate} board={L.board} pos={pos} anim={anim} moving={moving} happy={happy} variant={li} />
            </ZoomBox>
          </div>

          {L.kind === 'load' ? (
            <LoadBay t={b.t} o={b.o} active={active} onRod={addRod} onCube={addCube} onBreak={breakRod} onGroup={groupTen} onRemoveRod={() => setB({ ...b, t: Math.max(0, b.t - 1) })} onRemoveCube={() => setB({ ...b, o: Math.max(0, b.o - 1) })} onClear={() => setB({ t: 0, o: 0 })} />
          ) : (
            <div className={`mt-3 rounded-3xl bg-[linear-gradient(180deg,#fff7ed,#fef3c7)] p-3 ring-1 ring-orange-200 sm:p-4 ${active ? '' : 'pointer-events-none opacity-60'}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-black text-orange-900"><Link2 size={16} />Vagon deposu</p>
                <p className="text-xs font-bold text-orange-900/70">
                  {isSlotLevel ? (g1 ? 'Vagonu boş yere sürükle ya da dokun.' : 'Vagonu boş yuvaya sürükle. Ya da önce yuvaya, sonra vagona dokun.') : g1 ? 'Vagonu trene sürükle ya da dokun.' : 'Vagonu trene sürükle ya da dokun. Trendeki vagona dokunursan geri gelir.'}
                </p>
              </div>
              {yard.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                  {yard.map((c) => (
                    <DragSource
                      key={c.id}
                      value={valueOf(c)}
                      label={`Vagon: ${repSpeak(c.rep)}`}
                      onTap={() => place(c)}
                      onDrop={(z) => place(c, z)}
                      ghost={<div className="w-36"><WagonSvg car={c} /></div>}
                      className="group min-h-16 rounded-2xl bg-white/80 p-1.5 shadow-[0_3px_0_rgba(194,65,12,.18)] ring-1 ring-orange-200 transition hover:-translate-y-0.5 hover:bg-white active:scale-95"
                    >
                      <WagonSvg car={c} />
                    </DragSource>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm font-bold text-orange-900/70">{active ? 'Depo boş. Trendeki vagonlara dokunursan geri gelir.' : 'Bütün vagonlar trende!'}</p>
              )}
            </div>
          )}
        </section>

        <aside className="lg:col-start-2 lg:row-start-2">
          {phase !== 'done' && phase !== 'depart' && (
            <div className="flex flex-wrap gap-2">
              {L.kind === 'load' ? (
                <BigButton onClick={onLoad} className="flex-1" disabled={phase === 'wait'}>
                  <Link2 size={20} />Vagonu bağla
                </BigButton>
              ) : (
                <BigButton onClick={onWhistle} className="flex-1" disabled={phase === 'wait'}>
                  <Megaphone size={20} />Düdüğü çal!
                </BigButton>
              )}
              {phase !== 'wait' && hintBtn}
            </div>
          )}
          <div className={NUDGE_WRAP}>
            {hint >= 0 && <Nudge key={`h${hint}`} question={L.hints[hint]} {...tool()} onClose={() => setHint(-1)} />}
            {nudge && <Nudge key={nudge.question} {...nudge} onClose={() => setNudge(null)} />}
          </div>

          {showSolutions && <SolutionList list={doneSolutions} goal={L.goal} />}

          {(phase === 'depart' || phase === 'done') && (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200 animate-fade-up">
              <p className="mb-2 text-base font-black text-emerald-900">{phase === 'depart' ? 'Tren tünele giriyor… Çuf çuf!' : li + 1 >= levels.length ? 'Bütün trenler yola çıktı!' : 'Tren yola çıktı!'}</p>
              {L.picker && phase === 'done' && <StrategyPicker key={li} question={L.picker.q} options={L.picker.options} onPick={(s) => { stats.current.strategies.add(s); if (PICK_MAP[s]) strat(PICK_MAP[s]) }} />}
              <BigButton onClick={nextLevel} className="mt-3 w-full" disabled={phase === 'depart'}>
                {li + 1 >= levels.length ? <><Flag size={20} />Bitir</> : <>Sonraki istasyon<ArrowRight size={20} /></>}
              </BigButton>
            </div>
          )}
        </aside>
      </div>
    </Scene>
  )
}

/* ───────────────────────────── yükleme alanı (2. sınıf) ───────────────────────────── */

function RodView({ small }: { small?: boolean }) {
  return (
    <span className={`grid grid-rows-10 gap-px rounded-[4px] bg-blue-700 p-px shadow-[0_2px_0_rgba(0,0,0,.15)] ${small ? 'h-[70px] w-[12px]' : 'h-[clamp(100px,16vw,140px)] w-[clamp(14px,2.2vw,18px)]'}`}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} className="rounded-[2px] bg-[linear-gradient(145deg,#60a5fa,#3b82f6)]" />)}
    </span>
  )
}
function CubeView({ small }: { small?: boolean }) {
  return <span className={`block rounded-[3px] bg-[linear-gradient(145deg,#93c5fd,#3b82f6)] ring-1 ring-blue-700 ${small ? 'size-[12px]' : 'size-[clamp(12px,2vw,16px)]'}`} />
}

function LoadBay({ t, o, active, onRod, onCube, onBreak, onGroup, onRemoveRod, onRemoveCube, onClear }: {
  t: number
  o: number
  active: boolean
  onRod: () => void
  onCube: () => void
  onBreak: () => void
  onGroup: () => void
  onRemoveRod: () => void
  onRemoveCube: () => void
  onClear: () => void
}) {
  const groups = Array.from({ length: Math.ceil(o / 5) }, (_, g) => Math.min(5, o - g * 5))
  return (
    <div className={`mt-3 rounded-3xl bg-[linear-gradient(180deg,#fff7ed,#fef3c7)] p-3 ring-1 ring-orange-200 sm:p-4 ${active ? '' : 'pointer-events-none opacity-60'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex gap-2 sm:flex-col">
          <DragSource label="Onluk ekle" onTap={onRod} onDrop={(z) => z === 'load' && onRod()} ghost={<RodView />} className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 font-black text-blue-800 shadow-[0_3px_0_rgba(29,78,216,.2)] ring-1 ring-blue-200 active:scale-95">
            <RodView small />
            <span className="text-left text-sm leading-tight">Onluk<br /><span className="text-xs font-bold text-ink-soft">sürükle / dokun</span></span>
          </DragSource>
          <DragSource label="Birlik ekle" onTap={onCube} onDrop={(z) => z === 'load' && onCube()} ghost={<CubeView />} className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 font-black text-blue-800 shadow-[0_3px_0_rgba(29,78,216,.2)] ring-1 ring-blue-200 active:scale-95">
            <CubeView small />
            <span className="text-left text-sm leading-tight">Birlik<br /><span className="text-xs font-bold text-ink-soft">sürükle / dokun</span></span>
          </DragSource>
        </div>

        <div data-drop="load" className="relative flex-1 rounded-[26px] bg-teal-500 p-2.5 shadow-[inset_0_-8px_0_rgba(15,118,110,.6),0_6px_14px_rgba(15,118,110,.25)] ring-4 ring-teal-700/40 transition data-[over]:ring-sky-400">
          <span className="absolute -top-3 left-5 rounded-full bg-teal-800 px-3 py-0.5 text-xs font-black text-teal-50 shadow">Yük vagonu</span>
          <div className="flex min-h-[clamp(120px,19vw,160px)] flex-wrap items-end gap-2 rounded-2xl bg-white p-3 ring-2 ring-teal-700/60">
            {t === 0 && o === 0 && <p className="m-auto text-center text-sm font-bold text-ink-soft">Onluk ve birlikleri buraya sürükle.</p>}
            {Array.from({ length: t }, (_, i) => (
              <button key={`r${i}`} type="button" data-handle onClick={onRemoveRod} aria-label="Onluğu çıkar" className="rounded-md p-0.5 transition hover:bg-rose-50 active:scale-95">
                <RodView />
              </button>
            ))}
            {o > 0 && (
              <div className="flex flex-wrap items-end gap-1.5">
                {groups.map((g, gi) => (
                  <div key={gi} className="flex flex-col-reverse gap-[3px]">
                    {Array.from({ length: g }, (_, i) => (
                      <button key={i} type="button" data-handle onClick={onRemoveCube} aria-label="Birliği çıkar" className="grid min-h-[22px] min-w-[22px] place-items-center rounded-md transition hover:bg-rose-50 active:scale-90">
                        <CubeView />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="rounded-xl bg-white/95 px-3 py-1 text-base font-black text-teal-900 tabular-nums" aria-live="polite">
              {t} onluk · {o} birlik
            </span>
            <span className="flex gap-6 pr-6" aria-hidden>
              <span className="size-7 rounded-full bg-slate-800 ring-4 ring-slate-400" />
              <span className="size-7 rounded-full bg-slate-800 ring-4 ring-slate-400" />
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onBreak} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[15px] font-extrabold whitespace-nowrap text-blue-900 sm:px-4 sm:text-base ring-1 ring-blue-200 active:scale-95 disabled:opacity-50" disabled={t === 0}>
          <Scissors size={18} />Bir onluğu boz
        </button>
        <button type="button" onClick={onGroup} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[15px] font-extrabold whitespace-nowrap text-blue-900 sm:px-4 sm:text-base ring-1 ring-blue-200 active:scale-95 disabled:opacity-50" disabled={o < 10}>
          <Link2 size={18} />10 birlik → onluk
        </button>
        <button type="button" onClick={onClear} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-base font-extrabold text-ink ring-1 ring-line active:scale-95">
          <Eraser size={18} />Boşalt
        </button>
      </div>
      <p className="mt-2 text-center text-xs font-bold text-ink-soft">Vagondaki bir parçaya dokunursan çıkar.</p>
    </div>
  )
}
