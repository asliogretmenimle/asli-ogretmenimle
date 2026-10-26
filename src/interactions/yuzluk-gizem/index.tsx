import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, Delete, Play } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { useTracker } from '../../lib/trackerContext'
import { ek } from '../../lib/generators'
import { sfx } from '../../lib/feedback'
import { ZoomBox } from '../../interactive/ZoomBox'
import { SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, NumPad, parseNum, randInt, useNudge, useSession, useTileDrag } from '../hizli-noktalar/kit'

/**
 * 24. Yüzlük Tablo Gizemi — yüzlük tablonun yapısı: sağa bir adım +1, aşağı bir adım +10.
 *  - hidden: tablodaki bazı sayılar uğur böcekleriyle kapalı; komşulardan (±1, ±10) bul.
 *  - piece: tablodan kopmuş bir yapboz parçası; bir sayıdan diğerlerini bul, sonra parçayı yerine taşı.
 *  - arrow: ok kodu (→ +1, ↓ +10 …) — önce varış sayısını tahmin et, sonra uğur böceği yürür.
 *  - path: A’dan B’ye ok kodu kur; farklı yollar toplanır (hepsi aynı toplamı verir).
 */

type Dir = 'R' | 'L' | 'D' | 'U' | 'DR' | 'DL'
const DIRS: Record<Dir, { dr: number; dc: number; d: number; s: string; Icon: typeof ArrowRight; name: string }> = {
  R: { dr: 0, dc: 1, d: 1, s: '→', Icon: ArrowRight, name: 'sağa' },
  L: { dr: 0, dc: -1, d: -1, s: '←', Icon: ArrowLeft, name: 'sola' },
  D: { dr: 1, dc: 0, d: 10, s: '↓', Icon: ArrowDown, name: 'aşağı' },
  U: { dr: -1, dc: 0, d: -10, s: '↑', Icon: ArrowUp, name: 'yukarı' },
  DR: { dr: 1, dc: 1, d: 11, s: '↘', Icon: ArrowDownRight, name: 'sağ aşağı' },
  DL: { dr: 1, dc: -1, d: 9, s: '↙', Icon: ArrowDownLeft, name: 'sol aşağı' },
}

interface Base {
  start: number
  rows: number
  title: string
  prompt: string
  hints: string[]
  note?: string
  picker?: { q: string; options: string[] }
}
type Task =
  | (Base & { kind: 'hidden'; covered: number[] })
  | (Base & { kind: 'piece'; anchor: number; cells: [number, number][]; place: boolean })
  | (Base & { kind: 'arrow'; from: number; code: Dir[]; landmarksOnly?: boolean })
  | (Base & { kind: 'path'; from: number; to: number; goal: number; dirs: Dir[] })

const posOf = (start: number, v: number) => ({ r: Math.floor((v - start) / 10), c: (((v - start) % 10) + 10) % 10 })
const inWin = (start: number, rows: number, v: number) => v >= start && v < start + rows * 10

/** Birbirine değmeyen (ya da `chain` ise bazen değen) rastgele kapalı kareler */
function cover(start: number, rows: number, count: number, chain = false, must: number[] = []): number[] {
  const out = new Set(must)
  let guard = 0
  while (out.size < count && guard++ < 500) {
    const v = start + randInt(0, rows * 10 - 1)
    if (out.has(v)) continue
    const touching = [...out].some((o) => Math.abs(o - v) === 1 || Math.abs(o - v) === 10)
    if (touching && (!chain || Math.random() < 0.5)) continue
    out.add(v)
  }
  return [...out].sort((a, b) => a - b)
}

const sum = (code: Dir[]) => code.reduce((s, d) => s + DIRS[d].d, 0)
const codeStr = (code: Dir[]) => code.map((d) => DIRS[d].s).join(' ')

const CROSS: [number, number][] = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
const ELL: [number, number][] = [[0, 0], [-1, 0], [1, 0], [1, 1], [1, 2]]
const TEE: [number, number][] = [[0, 0], [0, -1], [0, 1], [1, 0], [2, 0], [-1, 0]]
const EKS: [number, number][] = [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]

const hiddenPick = { q: 'Saklı sayıları nasıl buldun?', options: ['Üstündeki/altındakinden 10 ekledim ya da çıkardım', 'Yanındakinden 1 ekledim ya da çıkardım', 'Sütunda birler aynı kalıyor', 'Baştan saydım'] }
const arrowPick = { q: 'Varış sayısını nasıl buldun?', options: ['Her ↓ için 10 ekledim', 'Önce onlukları, sonra birlikleri ekledim', 'Tabloda adım adım yürüdüm', 'Saydım'] }

function makeTasks(grade: Grade): Task[] {
  if (grade === 1) {
    const c = randInt(2, 8)
    const mid = 10 + randInt(2, 8)
    const lv = 10 * randInt(1, 2) + randInt(2, 7)
    const af = randInt(2, 8)
    return [
      { kind: 'hidden', start: 1, rows: 3, covered: cover(1, 3, 4), title: 'Uğur böcekleri', prompt: 'Uğur böcekleri bazı sayıların üstüne kondu! Altlarında hangi sayı var? Baştan saymadan, komşularına bakarak bul.', hints: ['Uğur böceğinin solundaki sayıya bak. Bir sağa gidince sayı kaç artar?', 'Sağındaki sayıdan bir önceki sayı hangisi?'], picker: { q: 'Nasıl buldun?', options: ['Solundakinden 1 sonrası', 'Sağındakinden 1 öncesi', 'Baştan saydım'] } },
      { kind: 'hidden', start: 1, rows: 3, covered: [c + 10, c + 20, c + 21].filter((v) => v <= 30), title: 'Sütun gizemi', prompt: `Bu kez uğur böcekleri bir sütuna dizildi. ${ek(c, 'gen')} altındaki sayılar hangileri? Aşağı inince ne değişiyor?`, hints: [`${c} ile altındaki sayının birler basamağı aynı mı?`, `${ek(c, 'dat')} 10 eklersen hangi sayı olur?`], note: 'Aynı sütunda aşağı inince birler aynı kalır, sayı 10 artar!', picker: { q: 'Aynı sütundaki sayılarda ne fark ettin?', options: ['Birler basamağı aynı', 'Aşağı inince 10 artıyor', 'Yan yana saydım'] } },
      { kind: 'piece', start: 1, rows: 3, anchor: mid, cells: CROSS, place: true, title: 'Kopan parça', prompt: `Tablodan bir parça koptu! Ortadaki sayı ${mid}. Boş karelere sayıları yaz, sonra parçayı tablodaki yerine taşı.`, hints: ['Sağdaki kare 1 fazla, soldaki 1 eksik.', 'Üstteki kare 10 eksik, alttaki 10 fazla.'] },
      { kind: 'hidden', start: 1, rows: 4, covered: cover(1, 4, 6, true), title: 'Kalabalık tablo', prompt: 'Uğur böcekleri çoğaldı! Bazıları yan yana. Önce hangisini bulmak kolay?', hints: ['Komşusu görünen bir uğur böceğinden başla.', 'Bulduğun sayı, yanındakini bulmana yardım eder.'], picker: hiddenPick },
      { kind: 'arrow', start: 1, rows: 3, from: af, code: ['D', 'R'], title: 'Uğur böceği yürüyor', prompt: `Uğur böceği ${ek(af, 'loc')}. 1 kare aşağı, sonra 1 kare sağa gidecek. Nereye varır? Önce tahmin et!`, hints: ['Aşağı inince sayı 10 artar.', 'Sağa gidince 1 artar.'] },
      { kind: 'piece', start: 1, rows: 4, anchor: lv, cells: ELL, place: false, title: 'L parçası', prompt: `Bu parçada yalnız ${lv} belli. Diğer sayıları bul!`, hints: ['Üstündeki kare 10 eksik, altındaki 10 fazla.', 'Altındakinin sağı 1 fazla.'] },
    ]
  }
  if (grade === 2) {
    const ws = 1 + 10 * randInt(1, 5)
    const mid = 10 * randInt(2, 7) + randInt(2, 8)
    const af = 10 * randInt(0, 4) + randInt(1, 5)
    const tv = 10 * randInt(2, 5) + randInt(2, 8)
    const pa = 10 * randInt(0, 4) + randInt(1, 6)
    return [
      { kind: 'hidden', start: ws, rows: 4, covered: cover(ws, 4, 6), title: 'Saklı sayılar', prompt: `Yüzlük tablonun bir parçası: ${ek(ws, 'abl')} başlıyor. Uğur böceklerinin altındaki sayıları bul.`, hints: ['Üstündeki sayıya bak: bir alt satıra inince kaç artar?', 'Solundaki sayıya bak: bir sağa gidince kaç artar?'], picker: hiddenPick },
      { kind: 'piece', start: 1, rows: 10, anchor: mid, cells: CROSS, place: true, title: 'Yapboz parçası', prompt: `Yüzlük tablodan bir parça koptu. Ortası ${mid}. Boşları doldur, sonra parçayı tablodaki yerine taşı.`, hints: ['Üst ve alt kareler 10 fark eder.', `${mid} hangi satırda? Onlar basamağına bak.`] },
      { kind: 'arrow', start: 1, rows: 10, from: af, code: ['D', 'D', 'R', 'R', 'R'], title: 'Ok kodu', prompt: `Uğur böceği ${ek(af, 'abl')} başlıyor ve ok kodunu izleyecek. Nereye varır? Önce tahmin et, sonra uğur böceği yürüyüp kontrol etsin.`, hints: ['Her ↓ kaç ekler?', 'İki ↓ ve üç →: önce onlukları, sonra birlikleri ekle.'], picker: arrowPick },
      { kind: 'piece', start: 1, rows: 10, anchor: tv, cells: TEE, place: false, title: 'T parçası', prompt: `T şeklinde bir parça! Yalnız ${tv} belli. Hepsini bul.`, hints: ['En alttaki kare, üstündekinden 10 fazla.', 'Yandakiler 1 fark eder.'] },
      { kind: 'path', start: 1, rows: 10, from: pa, to: pa + 32, goal: 2, dirs: ['R', 'L', 'D', 'U'], title: 'Yol bul', prompt: `Uğur böceğini ${ek(pa, 'abl')} ${ek(pa + 32, 'dat')} götüren bir ok kodu yaz. 2 farklı yol bul!`, hints: [`${pa + 32} ile ${pa} arasında kaç onluk fark var?`, 'Okların sırasını değiştirirsen yine aynı yere varır mısın?'], note: 'Okların sırası değişse de ↓ ve → sayısı aynı kaldıkça varış yeri değişmez.' },
      { kind: 'hidden', start: 1, rows: 10, covered: cover(1, 10, 10, true), title: 'Bozuk tablo', prompt: 'Koca tabloya bir sürü uğur böceği kondu! Hepsinin altındaki sayıyı bul.', hints: ['Satırın ilk sayısı neyle bitiyor? Satır boyunca birler 1, 2, 3… diye gider.', 'Bir sütunda aşağı inince onlar basamağı 1 artar.'], picker: hiddenPick },
    ]
  }
  // 3. sınıf: 100’den büyük pencereler
  const h = randInt(1, 8) * 100
  const ws = h + 10 * randInt(1, 5) + 1
  const pm = h + 10 * randInt(1, 3) + randInt(2, 8)
  const pStart = h + 1
  const af = h + 10 * randInt(0, 1) + randInt(1, 6)
  const ps = h + 1
  const pa = ps + 10 * randInt(0, 1) + randInt(0, 5)
  const bs = h + 70 + 1
  const uf = h + 10 * randInt(2, 3) + randInt(3, 8)
  return [
    { kind: 'hidden', start: ws, rows: 4, covered: cover(ws, 4, 6), title: 'Büyük tablo', prompt: `Bu tablo ${ek(ws, 'abl')} başlıyor. Uğur böceklerinin altındaki sayıları bul.`, hints: ['Yüzlükler değişmiyor; onlar ve birlere bak.', 'Aşağı bir adım 10, sağa bir adım 1 ekler.'], picker: hiddenPick },
    { kind: 'piece', start: pStart, rows: 5, anchor: pm, cells: EKS, place: true, title: 'Çapraz parça', prompt: `Çapraz bir parça! Ortası ${pm}. Köşelerdeki sayıları bul, sonra parçayı tablodaki yerine taşı.`, hints: ['Sağ alt köşe: 1 aşağı ve 1 sağa. Kaç eklenir?', 'Sol alt köşe: 1 aşağı (+10) ve 1 sola (−1).'] },
    { kind: 'arrow', start: h + 1, rows: 5, from: af, code: ['D', 'D', 'R'], landmarksOnly: true, title: 'Gizli tabloda yürü', prompt: `Tablo neredeyse boş! Uğur böceği ${ek(af, 'abl')} başlıyor. ↓ ↓ → kodunu izlerse nereye varır?`, hints: ['İki ↓ = 2 onluk.', `${af} + 21 işlemi gibi düşün.`], picker: arrowPick },
    { kind: 'path', start: ps, rows: 5, from: pa, to: pa + 33, goal: 3, dirs: ['R', 'L', 'D', 'U', 'DR'], title: 'Üç yol', prompt: `Uğur böceğini ${ek(pa, 'abl')} ${ek(pa + 33, 'dat')} götür. 3 farklı ok kodu bul! ↘ oku da var.`, hints: ['↘ bir adımda kaç ekler? (1 aşağı + 1 sağa)', '33 = 3 onluk + 3 birlik. Başka nasıl parçalanır?'], note: 'Farklı yollar, 33’ü farklı parçalamak demek: 10 + 10 + 10 + 1 + 1 + 1 ya da 11 + 11 + 11.' },
    { kind: 'hidden', start: bs, rows: 4, covered: [h + 100, h + 101, ...cover(bs, 4, 3).filter((v) => ![h + 100, h + 101, h + 99, h + 90, h + 102, h + 111, h + 91].includes(v))], title: 'Yüzlük sınırı', prompt: `Bu tablo ${h}’leri ve ${h + 100}’leri içeriyor. Sınırdaki saklı sayıları bul!`, hints: [`${ek(h + 99, 'abl')} sonra hangi sayı gelir?`, `${ek(h + 100, 'gen')} altındaki sayı 10 fazladır.`] },
    { kind: 'arrow', start: h + 1, rows: 5, from: uf, code: ['U', 'U', 'L'], landmarksOnly: true, title: 'Geri git', prompt: `Bu kez yukarı ve sola! ${ek(uf, 'abl')} başlayan uğur böceği ↑ ↑ ← kodunu izlerse nereye varır?`, hints: ['Her ↑ 10 eksiltir.', '← 1 eksiltir.'], picker: arrowPick },
  ]
}

export default function YuzlukGizem({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const N = useNudge()
  const track = useTracker()
  const sol = useSolutions()
  const T = tasks[Math.min(S.idx, tasks.length - 1)]
  const big = grade <= 3

  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [sel, setSel] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'fill' | 'place' | 'placed'>('fill')
  const [hintI, setHintI] = useState(0)
  const [trail, setTrail] = useState<number[]>([])
  const [walking, setWalking] = useState(false)
  const [code, setCode] = useState<Dir[]>([])
  const [paths, setPaths] = useState<string[]>([])
  const [eq, setEq] = useState<string | null>(null)
  const [pulse, setPulse] = useState<number | null>(null)
  const fails = useRef(0)
  const totals = useRef({ found: 0, paths: 0 })
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // görev değişince
  const resetTask = (t: Task) => {
    setRevealed(new Set())
    setSel(t.kind === 'arrow' ? t.from : null)
    setInput('')
    setPhase('fill')
    setHintI(0)
    setTrail([])
    setWalking(false)
    setCode([])
    setPaths([])
    setEq(null)
    fails.current = 0
    timers.current.forEach(clearTimeout)
    timers.current = []
    N.clear()
    sol.reset()
  }
  useEffect(() => {
    if (tasks[0].kind === 'arrow') setSel(tasks[0].from)
  }, [tasks])

  /* ───────── ortak: sayı ilişkisi açıklaması ───────── */
  const moveText = (dr: number, dc: number) => {
    const p: string[] = []
    if (dr) p.push(`${Math.abs(dr)} ${dr > 0 ? 'aşağı' : 'yukarı'}`)
    if (dc) p.push(`${Math.abs(dc)} ${dc > 0 ? 'sağa' : 'sola'}`)
    return p.join(' ve ')
  }
  /** Bilinen bir komşudan hedefe giden ilişkiyle soru sor */
  function nudgeFrom(target: number, ans: number, knownList: number[], start: number) {
    const tp = posOf(start, target)
    const near = knownList
      .map((k) => ({ k, p: posOf(start, k) }))
      .map((o) => ({ ...o, dr: tp.r - o.p.r, dc: tp.c - o.p.c }))
      .filter((o) => Math.abs(o.dr) <= 1 && Math.abs(o.dc) <= 1 && (o.dr || o.dc))
      .sort((a, b) => Math.abs(a.dr) + Math.abs(a.dc) - (Math.abs(b.dr) + Math.abs(b.dc)) || Math.abs(b.dr) - Math.abs(a.dr))
    let misc: string | undefined
    const tv = String(target), av = String(ans)
    if (tv.length === 2 && av.length === 2 && av === [...tv].reverse().join('') && tv[0] !== tv[1]) misc = 'Onlar ve birler basamağını ters yazdı'
    if (!near.length) {
      N.show('Bu karenin komşuları da saklı. Önce komşusu görünen bir kareden başlamaya ne dersin?', { misc })
      return
    }
    const o = near[0]
    if (o.dr !== 0 && o.dc === 0 && ans === o.k + Math.sign(o.dr)) misc = 'Satır-sütun karışıklığı: alt/üst satıra geçerken 1 ekledi/çıkardı'
    if (o.dr === 0 && o.dc !== 0 && ans === o.k + 10 * Math.sign(o.dc)) misc = 'Satır-sütun karışıklığı: yan kareye geçerken 10 ekledi/çıkardı'
    const where =
      o.dr === -1 && !o.dc ? 'Altındaki sayı' : o.dr === 1 && !o.dc ? 'Üstündeki sayı' : o.dc === 1 && !o.dr ? 'Solundaki sayı' : o.dc === -1 && !o.dr ? 'Sağındaki sayı' : 'Çaprazındaki sayı'
    const q =
      o.dr && !o.dc
        ? `${where} ${o.k}. Bir ${o.dr > 0 ? 'alt' : 'üst'} satıra ${o.dr > 0 ? 'inince' : 'çıkınca'} sayı nasıl değişir?`
        : !o.dr && o.dc
          ? `${where} ${o.k}. Bir ${o.dc > 0 ? 'sağa' : 'sola'} gidince sayı nasıl değişir?`
          : `${where} ${o.k}. Ondan ${moveText(o.dr, o.dc)} gidiyorsun: ${o.dr > 0 ? 'aşağı bir adım kaç ekler' : 'yukarı bir adım kaç çıkarır'}, ${o.dc > 0 ? 'sağa bir adım kaç ekler' : 'sola bir adım kaç çıkarır'}?`
    N.show(q, { misc, tool: 'yuzluk', toolTitle: 'Yüzlük tablo' })
  }

  /* ───────── hidden ───────── */
  const coveredSet = useMemo(() => new Set(T.kind === 'hidden' ? T.covered : []), [T])
  const visibleKnown = (v: number) => inWin(T.start, T.rows, v) && (!coveredSet.has(v) || revealed.has(v))

  /* ───────── piece ───────── */
  const pieceVals = T.kind === 'piece' ? T.cells.map(([dr, dc]) => T.anchor + dr * 10 + dc) : []
  const pieceKnown = (v: number) => (T.kind === 'piece' ? v === T.anchor || revealed.has(v) : false)

  function submitNumber() {
    if (sel === null || !input) return
    const ans = parseNum(input)
    setInput('')
    if (T.kind === 'arrow') return submitArrow(ans)
    const ok = ans === sel
    S.attempt(ok)
    if (ok) {
      sfx.ok()
      totals.current.found++
      const nr = new Set(revealed).add(sel)
      setRevealed(nr)
      setPulse(sel)
      N.clear()
      const remaining = T.kind === 'hidden' ? T.covered.filter((v) => !nr.has(v)) : pieceVals.filter((v) => v !== (T as { anchor: number }).anchor && !nr.has(v))
      if (!remaining.length) {
        setSel(null)
        if (T.kind === 'piece') {
          if (T.place) {
            setPhase('place')
            N.show('Parça tamam! Şimdi onu tablodaki yerine sürükle (ya da tablodaki doğru kareye dokun).', { tone: 'ok' })
          } else {
            setPhase('placed')
            S.complete()
          }
        } else S.complete()
      } else {
        // komşusu bilinen bir sonraki kareyi öner
        setSel(null)
      }
    } else {
      fails.current++
      const known = T.kind === 'hidden' ? Array.from({ length: T.rows * 10 }, (_, i) => T.start + i).filter(visibleKnown) : pieceVals.filter(pieceKnown)
      nudgeFrom(sel, ans, known, T.start)
    }
  }

  /* ───────── piece: yerleştirme ───────── */
  const drag = useTileDrag<number>({
    onDrop: (_, x, y) => {
      const el = document.elementFromPoint(x, y)?.closest('[data-cell]')
      if (el) tryPlace(Number(el.getAttribute('data-cell')))
    },
    onTap: () => N.show('Parçayı parmağınla tablonun üstüne sürükle ya da tablodaki doğru kareye dokun.'),
    ghost: () => <PieceView task={T as Extract<Task, { kind: 'piece' }>} known={() => true} sel={null} big={big} centered />,
  })
  function tryPlace(v: number) {
    if (T.kind !== 'piece' || phase !== 'place') return
    const ok = v === T.anchor
    S.attempt(ok)
    if (ok) {
      setPhase('placed')
      N.clear()
      S.complete()
      return
    }
    const a = posOf(T.start, T.anchor), b = posOf(T.start, v)
    let misc: string | undefined
    const av = String(T.anchor), bv = String(v)
    if (av.length === 2 && bv === [...av].reverse().join('')) misc = 'Tabloda yer bulurken onlar ve birler basamağını karıştırdı'
    if (a.r === b.r) N.show(`Doğru satırdasın! ${T.anchor} sayısının birler basamağı ${T.anchor % 10}. Bu satırda hangi kare onunla aynı birlere sahip?`, { misc })
    else if (a.c === b.c) N.show(`Sütun doğru! Şimdi satırı bul: dokunduğun kare ${v}. ${T.anchor} ondan ${Math.abs(T.anchor - v) / 10} onluk ${T.anchor > v ? 'fazla' : 'eksik'}.`, { misc })
    else N.show(`Parçanın ortası ${T.anchor}. Bu sayı hangi satırda olmalı? Satırların ilk sayılarına bak.`, { misc })
  }

  /* ───────── arrow / path: yürüyüş ───────── */
  function walk(from: number, c: Dir[], after: (end: number, offChart: boolean) => void) {
    setWalking(true)
    const seq = [from]
    let off = false
    let v = from
    for (const d of c) {
      const p = posOf(T.start, v)
      const nr = p.r + DIRS[d].dr, nc = p.c + DIRS[d].dc
      // tabloda yatay hareket satırı aşarsa bir sonraki satıra sarılır (sayı +1/−1 olarak devam eder)
      v = v + DIRS[d].d
      if (!inWin(T.start, T.rows, v) || ((d === 'DR' || d === 'DL') && (nc < 0 || nc > 9)) || nr < 0) {
        off = true
        break
      }
      seq.push(v)
    }
    setTrail([from])
    seq.slice(1).forEach((s, i) => {
      timers.current.push(window.setTimeout(() => setTrail((t) => [...t, s]), 380 * (i + 1)))
    })
    timers.current.push(
      window.setTimeout(() => {
        setWalking(false)
        after(seq[seq.length - 1], off)
      }, 380 * seq.length + 120),
    )
  }
  const eqFor = (from: number, c: Dir[]) => {
    const d = sum(c)
    return `${from} ${d >= 0 ? '+' : '−'} ${Math.abs(d)} = ${from + d}`
  }

  function submitArrow(ans: number) {
    if (T.kind !== 'arrow') return
    const end = T.from + sum(T.code)
    const ok = ans === end
    S.attempt(ok)
    if (ok) {
      N.show(`Tahminin ${ans}. Hadi uğur böceğini yürütüp kontrol edelim!`, { tone: 'ok' })
      walk(T.from, T.code, () => {
        setEq(eqFor(T.from, T.code))
        setRevealed(new Set([end]))
        N.clear()
        S.complete()
      })
      return
    }
    fails.current++
    let misc: string | undefined
    if (ans === T.from + T.code.length * Math.sign(sum(T.code))) misc = 'Ok kodunda her oku 1 saydı (aşağı/yukarı = 10’u kullanmadı)'
    const downs = T.code.filter((d) => d === 'D' || d === 'U').length
    const q =
      misc
        ? `Her oku 1 saymış olabilir misin? ${T.code.includes('D') ? '↓' : '↑'} oku bir satır ${T.code.includes('D') ? 'aşağı' : 'yukarı'} götürür. Bir satır kaç sayı demek?`
        : Math.abs(ans - end) % 10 === 0
          ? `Birler doğru görünüyor! ${downs} tane ${T.code.includes('D') ? '↓' : '↑'} var. Her biri kaç onluk ${T.code.includes('D') ? 'ekler' : 'çıkarır'}?`
          : `Önce ${T.code.includes('D') ? '↓' : '↑'} oklarını düşün: ${T.from} sayısından ${downs} satır ${T.code.includes('D') ? 'aşağısı' : 'yukarısı'} kaç? Sonra ${T.code.includes('R') ? '→' : '←'} okları.`
    N.show(q, { misc })
    if (fails.current >= 2) {
      S.hint()
      N.show(`${q} İstersen uğur böceği yolu gösterecek; varış sayısını yine sen yaz.`, { misc })
      walk(T.from, T.code, () => undefined)
    }
  }

  function runPath() {
    if (T.kind !== 'path' || !code.length || walking) return
    const c = code.slice()
    walk(T.from, c, (end, off) => {
      if (off) {
        S.attempt(false)
        N.show('Uğur böceği tablonun dışına çıktı! Okları tablonun içinde kalacak şekilde dene.')
        return
      }
      if (end !== T.to) {
        S.attempt(false)
        const diff = T.to - end
        N.show(`Uğur böceği ${ek(end, 'dat')} vardı. ${T.to} için ${Math.abs(diff)} ${diff > 0 ? 'fazlası' : 'azı'} gerek. Hangi okları değiştirirsin?`)
        return
      }
      const key = c.join(',')
      if (paths.includes(key)) {
        N.show('Bu yolu zaten buldun! Okların sırasını değiştirerek ya da başka oklarla yeni bir yol dene.')
        return
      }
      S.attempt(true)
      sol.add(key, codeStr(c))
      totals.current.paths++
      const np = [...paths, key]
      setPaths(np)
      setEq(eqFor(T.from, c))
      if (c.some((d) => d === 'DR')) track.strategy('Çapraz ok (↘ = +11) kullandı')
      if (np.length >= T.goal) {
        N.clear()
        S.complete()
      } else {
        N.show(`Vardın! ${eqFor(T.from, c)}. Şimdi farklı bir ok kodu dene.`, { tone: 'ok' })
        setCode([])
      }
    })
  }

  /* ───────── akış ───────── */
  const hint = () => {
    S.hint()
    N.show(T.hints[Math.min(hintI, T.hints.length - 1)], { tool: 'yuzluk', toolTitle: 'Yüzlük tablo' })
    setHintI((h) => h + 1)
  }
  const next = () => {
    if (S.last) {
      onFinish({
        stars: S.stars(),
        summary: `${totals.current.found} gizli sayı buldun${totals.current.paths ? `, ${totals.current.paths} farklı ok yolu kurdun` : ''}. ${S.totals.first} görevi ilk denemede bitirdin.`,
        insight:
          grade === 1
            ? 'Yüzlük tabloda sağa bir adım 1 ekler. Aynı sütunda bir aşağı inince birler aynı kalır, sayı 10 artar.'
            : grade === 2
              ? 'Sağa bir adım +1, aşağı bir adım +10. Bu yüzden ↓ ↓ → → → yolu, 23 eklemek demektir; okların sırası sonucu değiştirmez.'
              : 'Tablo 100’den sonra da aynı kuralla devam eder: ↓ +10, → +1, ↘ +11, ↙ +9. Zihinden toplarken sayıyı onluk ve birliklere ayırmak, tabloda yürümek gibidir.',
      })
      return
    }
    const t = tasks[S.idx + 1]
    S.next()
    resetTask(t)
  }

  /* ───────── çizim ───────── */
  const tokenAt = trail.length ? trail[trail.length - 1] : T.kind === 'arrow' || T.kind === 'path' ? T.from : null
  const piecePlaced = T.kind === 'piece' && phase === 'placed'
  const landmark = (v: number) => {
    const c = posOf(T.start, v).c
    return c === 0 || c === 9
  }

  const cell = (v: number) => {
    const base = `relative grid place-items-center rounded-lg font-black tabular-nums transition ${big ? 'h-11 sm:h-14 text-[13px] sm:text-lg' : 'h-10 sm:h-12 text-[13px] sm:text-base'}`
    let content: ReactNode = v
    let cls = 'bg-white text-ink ring-1 ring-line'
    let onClick: (() => void) | undefined
    let label = String(v)
    if (T.kind === 'hidden' && coveredSet.has(v) && !revealed.has(v)) {
      const isSel = sel === v
      content = isSel ? input || '?' : <Ladybug />
      cls = isSel ? 'bg-brand-soft text-brand ring-4 ring-brand/60' : 'bg-red-50 ring-2 ring-red-200 hover:bg-red-100'
      onClick = S.done ? undefined : () => { setSel(v); setInput('') }
      label = 'Saklı sayı'
    } else if (T.kind === 'hidden' && revealed.has(v)) {
      cls = `bg-emerald-100 text-emerald-900 ring-2 ring-emerald-300 ${pulse === v ? 'animate-pop' : ''}`
    } else if (T.kind === 'piece') {
      const inPiece = pieceVals.includes(v)
      if (piecePlaced && inPiece) cls = `bg-sky-200 text-sky-900 ring-2 ring-sky-400 animate-pop`
      else if (!piecePlaced) {
        content = landmark(v) ? v : ''
        cls = landmark(v) ? 'bg-white text-ink ring-1 ring-line' : 'bg-white/60 ring-1 ring-line/70'
        label = landmark(v) ? String(v) : 'Tablo karesi'
        if (phase === 'place') onClick = () => tryPlace(v)
      }
    } else if (T.kind === 'arrow' || T.kind === 'path') {
      const lmOnly = T.kind === 'arrow' && T.landmarksOnly && !S.done
      const show = !lmOnly || landmark(v) || v === T.from
      const isEnd = T.kind === 'path' && v === T.to
      content = show || trail.includes(v) ? v : ''
      if (lmOnly && !show && !trail.includes(v)) cls = 'bg-white/60 ring-1 ring-line/70'
      if (v === T.from) cls = 'bg-sky-100 text-sky-900 ring-2 ring-sky-400'
      if (isEnd) cls = 'bg-amber-100 text-amber-900 ring-2 ring-amber-400'
      if (trail.includes(v) && v !== T.from) cls = 'bg-amber-200 text-amber-900 ring-2 ring-amber-400'
    }
    const tok = tokenAt === v && (T.kind === 'arrow' || T.kind === 'path')
    const inner = (
      <>
        {tok ? <span className="absolute inset-0 grid place-items-center text-xl sm:text-3xl drop-shadow animate-pop" key={trail.length}>🐞</span> : null}
        <span className={tok ? 'opacity-0' : ''}>{content}</span>
      </>
    )
    return onClick ? (
      <button key={v} type="button" data-cell={v} onClick={onClick} aria-label={label} className={`${base} ${cls} active:scale-95`}>
        {inner}
      </button>
    ) : (
      <div key={v} data-cell={v} aria-label={label} className={`${base} ${cls}`}>
        {inner}
      </div>
    )
  }

  const chart = (
    <ZoomBox controls={false} maxScale={3}>
      <div className="grid grid-cols-10 gap-1 rounded-2xl bg-white/70 p-1.5 ring-1 ring-line sm:gap-1.5 sm:p-2">
        {Array.from({ length: T.rows * 10 }, (_, i) => cell(T.start + i))}
      </div>
    </ZoomBox>
  )

  const pieceBox = T.kind === 'piece' && phase !== 'placed' && (
    <div className="mb-3 flex flex-col items-center gap-2">
      {phase === 'place' ? (
        <div {...drag.bind(0)} data-handle style={{ touchAction: 'none' }} className={`cursor-grab rounded-2xl p-2 ring-2 ring-sky-300 ${drag.dragging !== null ? 'opacity-30' : 'bg-sky-50 animate-pop'}`} role="button" aria-label="Parçayı sürükle">
          <PieceView task={T} known={() => true} sel={null} big={big} />
        </div>
      ) : (
        <div className="rounded-2xl bg-sky-50 p-2 ring-2 ring-sky-200">
          <PieceView task={T} known={pieceKnown} sel={sel} input={input} big={big} onPick={(v) => { setSel(v); setInput('') }} />
        </div>
      )}
      {phase === 'place' && <p className="text-sm font-extrabold text-sky-800">Parçayı tutup tabloya sürükle ✋</p>}
    </div>
  )

  const arrowBar = (T.kind === 'arrow' || T.kind === 'path') && (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-xl bg-sky-100 px-3 py-1.5 text-lg font-black text-sky-900 ring-1 ring-sky-300">{T.from}</span>
      {(T.kind === 'arrow' ? T.code : code).map((d, i) => {
        const I = DIRS[d].Icon
        return <span key={i} className="grid size-11 place-items-center rounded-xl bg-white text-ink ring-2 ring-amber-300 sm:size-12"><I size={24} strokeWidth={3} /></span>
      })}
      {T.kind === 'path' && !code.length && <span className="font-bold text-ink-soft">… okları ekle</span>}
      <span className="text-lg font-black text-ink-soft">→</span>
      <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-lg font-black text-amber-900 ring-1 ring-amber-300">{T.kind === 'path' ? T.to : S.done ? T.from + sum(T.code) : '?'}</span>
    </div>
  )

  const scene = (
    <div>
      {T.kind === 'arrow' || T.kind === 'path' ? <Legend dirs={T.kind === 'path' ? T.dirs : (Array.from(new Set(T.code)) as Dir[])} reveal={T.kind === 'path' || S.done} /> : null}
      {arrowBar}
      {pieceBox}
      {!(T.kind === 'piece' && phase === 'fill') && chart}
      {eq && <p className="mt-3 text-center text-2xl font-black text-emerald-800 animate-pop">{eq}</p>}
    </div>
  )

  const needPad = !S.done && sel !== null && (T.kind === 'hidden' || (T.kind === 'piece' && phase === 'fill') || (T.kind === 'arrow' && !walking))
  const panel = (
    <>
      {needPad && (
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white/90 p-3 ring-1 ring-line lg:max-w-none">
          <p className="mb-2 text-center text-sm font-black text-ink-soft">{T.kind === 'arrow' ? 'Uğur böceği nereye varır?' : 'Saklı sayı kaç?'}</p>
          <div className="mb-2 grid min-h-12 place-items-center rounded-xl bg-paper text-2xl font-black tabular-nums ring-1 ring-line">{input || '…'}</div>
          <NumPad value={input} onChange={setInput} onSubmit={submitNumber} big={big} maxLen={3} submitLabel={T.kind === 'arrow' ? 'Tahmin' : 'Yaz'} />
        </div>
      )}
      {!S.done && sel === null && (T.kind === 'hidden' || (T.kind === 'piece' && phase === 'fill')) && (
        <p className="rounded-2xl bg-white/90 p-3 text-center font-bold text-ink-soft ring-1 ring-line">{T.kind === 'hidden' ? 'Bir uğur böceğine dokun 🐞' : 'Parçadaki boş bir kareye dokun.'}</p>
      )}
      {T.kind === 'path' && !S.done && (
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white/90 p-3 ring-1 ring-line lg:max-w-none">
          <p className="mb-2 text-center text-sm font-black text-ink-soft">Ok kodunu kur</p>
          <div className="grid grid-cols-3 gap-2">
            {T.dirs.map((d) => {
              const I = DIRS[d].Icon
              return (
                <button key={d} type="button" disabled={walking || code.length >= 9} onClick={() => setCode((c) => [...c, d])} className="grid min-h-14 place-items-center rounded-2xl bg-white text-ink shadow-[0_3px_0_var(--color-line)] ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label={`${DIRS[d].name} ok`}>
                  <I size={28} strokeWidth={3} />
                </button>
              )
            })}
            <button type="button" disabled={walking || !code.length} onClick={() => setCode((c) => c.slice(0, -1))} className="grid min-h-14 place-items-center rounded-2xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label="Son oku sil"><Delete size={24} /></button>
          </div>
          <button type="button" onClick={runPath} disabled={walking || !code.length} className="btn-primary mt-2 min-h-14 w-full text-lg"><Play size={20} fill="currentColor" />Yürüt</button>
        </div>
      )}
      {T.kind === 'path' && <SolutionList list={sol.list} goal={T.goal} />}
    </>
  )

  const doneBox = (
    <DoneNote
      title={T.kind === 'path' ? `${paths.length} farklı yol buldun!` : T.kind === 'piece' ? 'Parça yerine oturdu!' : T.kind === 'arrow' ? 'Uğur böceği vardı!' : 'Tüm saklı sayılar bulundu!'}
      note={T.kind === 'arrow' ? `${codeStr(T.code)} kodu ${eqFor(T.from, T.code)} işlemi gibi.` : T.note}
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
      onHint={hint}
      onReset={T.kind === 'path' ? () => setCode([]) : undefined}
    >
      {scene}
      {drag.ghost}
    </ActivityLayout>
  )
}

function Ladybug() {
  return (
    <svg viewBox="0 0 40 40" className="size-7 sm:size-9" aria-hidden>
      <circle cx={20} cy={10} r={6} fill="#1f2340" />
      <ellipse cx={20} cy={23} rx={14} ry={13} fill="#ef4444" stroke="#1f2340" strokeWidth={2} />
      <line x1={20} y1={11} x2={20} y2={36} stroke="#1f2340" strokeWidth={2} />
      <circle cx={13} cy={20} r={2.6} fill="#1f2340" />
      <circle cx={27} cy={20} r={2.6} fill="#1f2340" />
      <circle cx={14} cy={29} r={2.2} fill="#1f2340" />
      <circle cx={26} cy={29} r={2.2} fill="#1f2340" />
      <text x={20} y={27} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">?</text>
    </svg>
  )
}

function Legend({ dirs, reveal }: { dirs: Dir[]; reveal: boolean }) {
  return (
    <div className="mb-2 flex flex-wrap justify-center gap-1.5">
      {dirs.map((d) => {
        const I = DIRS[d].Icon
        return (
          <span key={d} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm font-extrabold text-ink ring-1 ring-line">
            <I size={16} strokeWidth={3} />
            {DIRS[d].name}
            {reveal && d !== 'R' && d !== 'L' && d !== 'D' && d !== 'U' ? ` (${DIRS[d].d > 0 ? '+' : ''}${DIRS[d].d})` : ''}
          </span>
        )
      })}
    </div>
  )
}

function PieceView({ task, known, sel, input, big, onPick, centered }: { task: Extract<Task, { kind: 'piece' }>; known: (v: number) => boolean; sel: number | null; input?: string; big: boolean; onPick?: (v: number) => void; centered?: boolean }) {
  const rs = task.cells.map(([r]) => r), cs = task.cells.map(([, c]) => c)
  let r0 = Math.min(...rs), r1 = Math.max(...rs), c0 = Math.min(...cs), c1 = Math.max(...cs)
  if (centered) {
    const R = Math.max(-r0, r1), C = Math.max(-c0, c1)
    r0 = -R; r1 = R; c0 = -C; c1 = C
  }
  const W = c1 - c0 + 1
  const sz = big ? 'size-14 sm:size-16 text-xl' : 'size-12 sm:size-14 text-lg'
  const out: ReactNode[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const inP = task.cells.some(([a, b]) => a === r && b === c)
      const v = task.anchor + r * 10 + c
      if (!inP) {
        out.push(<span key={`${r},${c}`} className={sz} />)
        continue
      }
      const isK = known(v)
      if (isK) out.push(<span key={`${r},${c}`} className={`${sz} grid place-items-center rounded-xl font-black tabular-nums ${r === 0 && c === 0 ? 'bg-sky-500 text-white' : 'bg-white text-sky-900 ring-2 ring-sky-300'}`}>{v}</span>)
      else
        out.push(
          <button key={`${r},${c}`} type="button" onClick={() => onPick?.(v)} aria-label="Boş kare" className={`${sz} grid place-items-center rounded-xl border-2 border-dashed font-black tabular-nums transition active:scale-95 ${sel === v ? 'border-brand bg-brand-soft text-brand ring-4 ring-brand/40' : 'border-sky-400 bg-white/80 text-sky-400'}`}>
            {sel === v ? input || '?' : '?'}
          </button>,
        )
    }
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${W}, auto)` }}>
      {out}
    </div>
  )
}

