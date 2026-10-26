import { useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Eraser } from 'lucide-react'
import type { Grade } from '../../data/types'
import { ek } from '../../lib/generators'
import { useTracker } from '../../lib/trackerContext'
import { StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, NumPad, hitZone, parseNum, pick, useNudge, useSession, useTileDrag } from '../hizli-noktalar/kit'
import type { InteractionProps } from '../types'
import { AddModel, COL_A, COL_B, COL_W, FactTriangle, MulModel, type View } from './model'

/**
 * 26. İşlem Ailesi — Van de Walle: parça–parça–bütün ilişkisi toplama ile çıkarmayı (çarpma ile bölmeyi) bir aile yapar.
 * Öğrenci sayı ve işlem kartlarını sürükleyerek (ya da dokunarak) eşitlik çerçevesine yerleştirir; her yeni doğru
 * eşitlik ailenin bir üyesidir (useSolutions). Model, kurulan eşitliğe tepki verir: toplamada parçalar birleşir,
 * çıkarmada bir parça bütünden ayrılır; dizilimde çarpma sıraları, ters çarpma sütunları gruplar.
 *  2. sınıf: 20’ye kadar aileler (sayaçlı şerit), ikizler ailesi, 100’e kadar aile, eksik parça, küçük ×/÷ ailesi (dizilim).
 *  3. sınıf: iki basamaklı +/− ailesi, ×/÷ aileleri (dizilim), ikiz çarpım, eksik bütün (? ÷ 6 = 7), “=” başta eşitlikler.
 *  4. sınıf: büyük ×/÷ aileleri, eksik sayılar (? − 27 = 45, 8 × ? = 96), dört karttan birden fazla aile bulma.
 */

type Kind = 'add' | 'mul'
type Op = '+' | '−' | '×' | '÷'

type Task =
  | { type: 'family'; kind: Kind; a: number; b: number; c: number; goal: number; title: string; prompt: string; hints: string[]; note: string; rel?: boolean }
  | { type: 'missing'; kind: Kind; a: number; b: number; c: number; unknown: number; shown: string; title: string; prompt: string; hints: string[]; note: string }
  | { type: 'open'; kind: Kind; nums: number[]; title: string; prompt: string; hints: string[]; note: string }

const OPS: Record<Kind, Op[]> = { add: ['+', '−'], mul: ['×', '÷'] }
const apply = (op: Op, x: number, y: number) => (op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : y === 0 ? NaN : x / y)

const addHints = (a: number, b: number, c: number) => [
  'Modelde bütün hangisi, parçalar hangileri?',
  `Parçaların yerini değiştirince bütün değişir mi? ${a} + ${b} ile ${b} + ${a} eşitliklerini düşün.`,
  `Bütünden (${c}) bir parçayı çıkarırsan geriye hangi parça kalır?`,
]
const mulHints = (a: number, b: number, c: number) => [
  `Dizide kaç sıra var? Her sırada kaç tane?`,
  `Diziye yan yatmış gibi bak: ${b} sütun, her sütunda ${a} tane. Bu da bir çarpma!`,
  `${c} tane noktayı ${a} eşit sıraya paylaştırırsan her sırada kaç tane olur?`,
]

function makeTasks(grade: Grade): Task[] {
  if (grade <= 2) {
    const s = pick([[8, 5], [7, 6], [9, 4], [6, 8]] as const)
    const d = pick([6, 7, 8])
    const big = pick([[34, 25], [42, 36], [27, 51], [45, 32]] as const)
    const m = pick([[3, 2], [2, 4], [3, 4]] as const)
    const ms = pick([[8, 7], [9, 6], [7, 5]] as const)
    return [
      { type: 'family', kind: 'add', a: s[0], b: s[1], c: s[0] + s[1], goal: 4, title: 'Bir ailenin üyeleri', prompt: `${s[0]}, ${s[1]} ve ${s[0] + s[1]} bir aile! Kartları çerçeveye sürükle ya da dokun. Bu üç sayıyla kaç farklı eşitlik kurabilirsin?`, hints: addHints(s[0], s[1], s[0] + s[1]), note: 'Toplama ile çıkarma aynı ailedendir: bütün ve iki parça.' },
      { type: 'family', kind: 'add', a: d, b: d, c: 2 * d, goal: 2, title: 'İkizler ailesi', prompt: `${d}, ${d} ve ${2 * d}. İkizler ailesinde kaç eşitlik var? Hepsini bul!`, hints: ['İki parça aynı. Yerlerini değiştirirsen yeni bir eşitlik çıkar mı?', `${ek(2 * d, 'abl')} ${d} çıkarınca kaç kalır?`], note: `İki parça aynı (${d} ve ${d}) olduğu için yer değiştirmek yeni bir eşitlik vermiyor. Bu ailede yalnızca 2 eşitlik var!` },
      { type: 'family', kind: 'add', a: big[0], b: big[1], c: big[0] + big[1], goal: 4, title: 'Büyük aile', prompt: `${big[0]} + ${big[1]} = ${big[0] + big[1]}. Bu eşitliğin bütün ailesini kur!`, hints: addHints(big[0], big[1], big[0] + big[1]), note: 'Sayılar büyüdü ama aile kuralı aynı: iki toplama, iki çıkarma.' },
      { type: 'missing', kind: 'add', a: ms[0], b: ms[1], c: ms[0] + ms[1], unknown: ms[1], shown: `${ms[0]} + ? = ${ms[0] + ms[1]}`, title: 'Saklı parça', prompt: `${ms[0]} + ? = ${ms[0] + ms[1]}. Aynı aileden, ? tek başına kalacak bir eşitlik kur. Sonra ? sayısını bul!`, hints: ['? bütün mü, parça mı? Şeride bak.', `Bütünden (${ms[0] + ms[1]}) bildiğin parçayı (${ms[0]}) çıkarırsan ne kalır?`], note: 'Eksik parçayı bulmak için toplamayı çıkarmaya çevirdin. Aile bunu sağlıyor!' },
      { type: 'family', kind: 'mul', a: m[0], b: m[1], c: m[0] * m[1], goal: 4, title: 'Çarpma ailesi', prompt: `${m[0]} sıra, her sırada ${m[1]} elma: ${m[0] * m[1]} elma. ${m[0]}, ${m[1]} ve ${m[0] * m[1]} ile × ve ÷ kartlarını kullanarak eşitlikler kur.`, hints: mulHints(m[0], m[1], m[0] * m[1]), note: `${m[0]} tane ${m[1]} ile ${m[1]} tane ${m[0]} aynı dizi! Bölme de aynı ailede.` },
    ]
  }
  if (grade === 3) {
    const big = pick([[36, 47], [58, 25], [64, 29], [45, 38]] as const)
    const m1 = pick([[3, 4], [4, 5], [3, 6]] as const)
    const m2 = pick([[6, 7], [7, 8], [6, 9]] as const)
    const sq = pick([4, 5, 6])
    const mm = pick([[6, 7], [5, 8], [4, 9]] as const)
    const r = pick([[250, 175], [320, 180], [145, 255]] as const)
    return [
      { type: 'family', kind: 'add', a: big[0], b: big[1], c: big[0] + big[1], goal: 4, title: 'Toplama ailesi', prompt: `${big[0]}, ${big[1]} ve ${big[0] + big[1]}. Bu ailenin dört eşitliğini kur.`, hints: addHints(big[0], big[1], big[0] + big[1]), note: 'İki toplama, iki çıkarma: hepsi aynı parça–bütün ilişkisini anlatıyor.' },
      { type: 'family', kind: 'mul', a: m1[0], b: m1[1], c: m1[0] * m1[1], goal: 4, title: 'Dizideki aile', prompt: `Dizide ${m1[0]} sıra, her sırada ${m1[1]} nokta var. ${m1[0]}, ${m1[1]} ve ${m1[0] * m1[1]} ile çarpma ve bölme ailesini kur.`, hints: mulHints(m1[0], m1[1], m1[0] * m1[1]), note: 'Sıralara bakınca çarpma, sütunlara bakınca ters çarpma; gruplara ayırınca bölme!' },
      { type: 'family', kind: 'mul', a: sq, b: sq, c: sq * sq, goal: 2, title: 'Kare dizi', prompt: `${sq}, ${sq} ve ${sq * sq}. Bu ailede kaç eşitlik var? Hepsini bul.`, hints: ['Dizi kare! Sıra ve sütun sayısı aynı.', `${ek(sq * sq, 'acc')} ${ek(sq, 'dat')} bölünce kaç olur?`], note: `Sıra ve sütun sayısı eşit olduğu için ${sq} × ${sq} döndürülünce yine ${sq} × ${sq}. Bu ailede yalnızca 2 eşitlik var.` },
      { type: 'family', kind: 'mul', a: m2[0], b: m2[1], c: m2[0] * m2[1], goal: 4, rel: true, title: 'Eşittir başta', prompt: `${m2[0]}, ${m2[1]} ve ${m2[0] * m2[1]} ailesini kur. “=” düğmesiyle eşittiri başa da alabilirsin: ${m2[0] * m2[1]} = ${m2[0]} × ${m2[1]} de doğru bir eşitlik!`, hints: mulHints(m2[0], m2[1], m2[0] * m2[1]), note: 'Eşittir işareti “sonuç geliyor” demek değil; iki yanın aynı değerde olduğunu söyler.' },
      { type: 'missing', kind: 'mul', a: mm[0], b: mm[1], c: mm[0] * mm[1], unknown: mm[0] * mm[1], shown: `? ÷ ${mm[0]} = ${mm[1]}`, title: 'Saklı bütün', prompt: `? ÷ ${mm[0]} = ${mm[1]}. Aynı aileden, ? tek başına kalacak bir eşitlik kur ve ? sayısını bul.`, hints: ['? bütün mü, parça mı? Diziye bak.', `${mm[1]} grup, her grupta ${mm[0]} tane: toplam kaç?`], note: 'Bölmedeki bilinmeyeni, aynı ailedeki çarpmayla buldun.' },
      { type: 'family', kind: 'add', a: r[0], b: r[1], c: r[0] + r[1], goal: 4, rel: true, title: 'Yüzlüklerle aile', prompt: `${r[0]}, ${r[1]} ve ${r[0] + r[1]}. Aileyi kur; istersen “=” işaretini başa al.`, hints: addHints(r[0], r[1], r[0] + r[1]), note: 'Aile ilişkisi sayılar büyüyünce de değişmiyor.' },
    ]
  }
  const m1 = pick([[7, 8], [6, 9], [8, 9]] as const)
  const big = pick([[348, 652], [275, 725], [1250, 750]] as const)
  const sq = pick([7, 8, 9])
  const mm = pick([[8, 12], [6, 15], [7, 13]] as const)
  const open = pick([
    { kind: 'mul' as Kind, nums: [3, 4, 12, 36] },
    { kind: 'mul' as Kind, nums: [2, 5, 10, 50] },
    { kind: 'add' as Kind, nums: [4, 7, 11, 18] },
  ])
  return [
    { type: 'family', kind: 'mul', a: m1[0], b: m1[1], c: m1[0] * m1[1], goal: 4, rel: true, title: 'Çarpma ailesi', prompt: `${m1[0]}, ${m1[1]} ve ${m1[0] * m1[1]}. Çarpma–bölme ailesini kur.`, hints: mulHints(m1[0], m1[1], m1[0] * m1[1]), note: 'Bir çarpma bildiğinde iki bölmeyi de bilirsin.' },
    { type: 'missing', kind: 'add', a: 27, b: 45, c: 72, unknown: 72, shown: '? − 27 = 45', title: 'Saklı bütün', prompt: '? − 27 = 45. Aynı aileden, ? tek başına kalacak bir eşitlik kur ve ? sayısını bul.', hints: ['? bütün mü, parça mı? 27 ve 45 parça mı?', 'Parçaları birleştirirsen bütünü bulursun.'], note: 'Çıkarmadaki bilinmeyeni toplamayla buldun: 27 + 45 = 72.' },
    { type: 'family', kind: 'add', a: big[0], b: big[1], c: big[0] + big[1], goal: 4, title: 'Bine tamamla', prompt: `${big[0]}, ${big[1]} ve ${big[0] + big[1]}. Bu ailenin dört eşitliğini kur.`, hints: addHints(big[0], big[1], big[0] + big[1]), note: 'Bütün ve parçalar: büyük sayılarda da aynı aile.' },
    { type: 'missing', kind: 'mul', a: mm[0], b: mm[1], c: mm[0] * mm[1], unknown: mm[1], shown: `${mm[0]} × ? = ${mm[0] * mm[1]}`, title: 'Eksik çarpan', prompt: `${mm[0]} × ? = ${mm[0] * mm[1]}. Aynı aileden, ? tek başına kalacak bir eşitlik kur ve ? sayısını bul.`, hints: ['Bilinmeyen bir çarpan. Bütün hangi sayı?', `${ek(mm[0] * mm[1], 'acc')} ${ek(mm[0], 'dat')} bölersen ne bulursun?`], note: 'Eksik çarpanı bölmeyle buldun: bölme, çarpmanın ailesidir.' },
    { type: 'family', kind: 'mul', a: sq, b: sq, c: sq * sq, goal: 2, title: 'Kare dizi', prompt: `${sq}, ${sq} ve ${sq * sq}. Bu ailede kaç eşitlik var?`, hints: ['Dizi kare! Döndürünce değişen bir şey var mı?'], note: `Kare sayılar ailesinde yalnızca 2 eşitlik var: ${sq} × ${sq} = ${sq * sq} ve ${sq * sq} ÷ ${sq} = ${sq}.` },
    { type: 'open', kind: open.kind, nums: open.nums, title: 'Kaç aile var?', prompt: `${open.nums.join(', ')}. Bu kartlarla birden fazla aile kurulabilir! En az iki farklı aileden 4 eşitlik bul.`, hints: open.kind === 'mul' ? ['İki kartı çarp: sonuç kartlarda var mı?', 'Her ailede bir bütün (en büyük sayı) ve iki parça vardır.'] : ['İki kartı topla: sonuç kartlarda var mı?', 'Her ailede bir bütün ve iki parça vardır.'], note: 'Bir sayı birden fazla ailenin üyesi olabilir: bir ailede parça, başka bir ailede bütün!' },
  ]
}

type Slot = 'x' | 'op' | 'y' | 'z'
type Frame = { x: string | null; op: Op | null; y: string | null; z: string | null }
type Tile = { kind: 'num'; v: string } | { kind: 'op'; v: Op }
const EMPTY: Frame = { x: null, op: null, y: null, z: null }

/** Kavram yanılgısı odaklı soru */
function diagnose(op: Op, X: number, Y: number, Z: number, s: (n: number) => string): { q: string; misc?: string } {
  const whole = Math.max(X, Y, Z)
  const sx = s(X), sy = s(Y), sz = s(Z)
  const named = sx !== '?' && sy !== '?' && sz !== '?'
  if (!named) return { q: `Bu eşitlik doğru olabilir mi? ? yerine bütün mü, parça mı gelmeli? Modeldeki şeride ya da diziye bak.` }
  if (op === '+') {
    if (Z !== whole) return { q: `${sx} ile ${sy} birleşince ${sz} olabilir mi? Toplam, parçalardan küçük olur mu? Bütün hangi sayı?`, misc: 'Toplamada sonucu (bütünü) yanlış yere yazdı' }
    return { q: `${sx} + ${sy} gerçekten ${sz} eder mi? Modeldeki parçalara bak.` }
  }
  if (op === '−') {
    if (X < Y) return { q: `${ek(X, 'abl')} ${ek(Y, 'acc')} çıkarabilir miyiz? Çıkarmada bütünden başlarız: bütün hangi sayı?`, misc: 'Çıkarmada küçük sayıdan büyük sayıyı çıkardı (sırayı önemsiz sandı)' }
    if (Z === whole) return { q: `${ek(X, 'abl')} ${Y} çıkınca kalan, ${ek(X, 'abl')} büyük olabilir mi? Bütünü (${whole}) en başa koymayı dene.`, misc: 'Çıkarmada bütünü sonuç yerine yazdı' }
    return { q: `${sx} − ${sy} kaç eder? Modelde bütünden bir parçayı çıkarmayı düşün.` }
  }
  if (op === '×') {
    if (Z !== whole) return { q: `${sx} tane ${sy} kaç eder? Çarpımın sonucu en büyük sayı olmalı mı?`, misc: 'Çarpmada sonucu yanlış yere yazdı' }
    return { q: `${sx} tane ${sy} gerçekten ${sz} eder mi? Dizideki sıraları say.` }
  }
  if (X < Y) return { q: `${ek(X, 'acc')} ${ek(Y, 'dat')} eşit paylaştırabilir miyiz? Bölmede bütün (${whole}) başta olur.`, misc: 'Bölmede küçük sayıyı büyük sayıya böldü' }
  if (Z === whole) return { q: `${ek(X, 'acc')} ${Y} eşit gruba ayırınca her grupta ${ek(X, 'abl')} fazla olabilir mi? Bütünü başa koy.`, misc: 'Bölmede bütünü sonuç yerine yazdı' }
  return { q: `${ek(X, 'gen')} içinde kaç tane ${Y} var? Dizideki grupları say.` }
}

export default function IslemAilesi({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const T = tasks[S.idx]
  const track = useTracker()
  const sol = useSolutions()
  const { nudge, show, clear } = useNudge()
  const age = useAge(grade)
  const big = age.big
  const [frame, setFrame] = useState<Frame>(EMPTY)
  const [rel, setRel] = useState(false)
  const [view, setView] = useState<View>(null)
  const [facts, setFacts] = useState<string[]>([])
  const [famsFound, setFamsFound] = useState<Record<string, number>>({})
  const [openFam, setOpenFam] = useState<[number, number, number] | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [phase, setPhase] = useState<'build' | 'solve' | 'solved'>('build')
  const [answer, setAnswer] = useState('')
  const [hintI, setHintI] = useState(0)
  const totals = useRef({ eqs: 0, example: '' })
  const zones = useRef(new Map<Slot, HTMLElement | null>())
  const busy = useRef(false)
  /** useSolutions.add dönüşü toplu güncellemede güvenilir değil; anahtarları burada da tut */
  const keys = useRef(new Set<string>())

  const ops = OPS[T.kind]
  const nums = T.type === 'open' ? T.nums.map(String) : T.type === 'missing' ? [T.a, T.b, T.c].filter((n) => n !== T.unknown).map(String).concat('?') : [...new Set([T.a, T.b, T.c])].sort((p, q) => p - q).map(String)
  const unknown = T.type === 'missing' && phase !== 'solved' ? T.unknown : undefined
  const val = (s: string) => (s === '?' && T.type === 'missing' ? T.unknown : Number(s))
  const goalFacts = T.type === 'family' ? T.goal : T.type === 'open' ? 4 : 1
  const famCount = Object.keys(famsFound).length
  const relOn = grade >= 3 && (T.type === 'family' ? !!T.rel : T.type === 'open')

  const resetTask = () => {
    setFrame(EMPTY)
    setRel(false)
    setView(null)
    setFacts([])
    setFamsFound({})
    setOpenFam(null)
    setFlash(null)
    setPhase('build')
    setAnswer('')
    setHintI(0)
    keys.current = new Set()
    sol.reset()
    clear()
  }

  const eqText = (f: Frame, r: boolean) => (r ? `${f.z} = ${f.x} ${f.op} ${f.y}` : `${f.x} ${f.op} ${f.y} = ${f.z}`)

  const evaluate = (f: Frame) => {
    if (!f.x || !f.y || !f.z || !f.op) return
    const X = val(f.x), Y = val(f.y), Z = val(f.z)
    const ok = Math.abs(apply(f.op, X, Y) - Z) < 1e-9
    const triple = [X, Y, Z].sort((p, q) => p - q)
    const fam = T.type === 'open' ? null : [T.a, T.b, T.c].sort((p, q) => p - q)
    const inFam = !fam || triple.every((v, i) => v === fam[i])
    if (fam && !inFam && new Set([X, Y, Z]).size < 3 && new Set(fam).size === 3) {
      S.attempt(false)
      show(`Bu ailede üç farklı sayı var: ${nums.join(', ')}. Her kartı bir kez kullanmayı dene.`, { misc: 'Aynı sayıyı iki kez kullandı' })
      return
    }
    if (!ok || !inFam) {
      S.attempt(false)
      const d = diagnose(f.op, X, Y, Z, (n) => (f.x === '?' && n === X) || (f.y === '?' && n === Y) || (f.z === '?' && n === Z) ? '?' : String(n))
      show(d.q, { misc: d.misc, tool: T.kind === 'mul' ? 'dizilim' : T.kind === 'add' && T.type !== 'open' && Math.max(...triple) <= 20 ? 'tenframe' : undefined, toolTitle: T.kind === 'mul' ? 'Dizilim tahtası' : 'Onluk çerçeve', toolConfig: T.kind === 'add' ? { frames: 2 } : undefined })
      return
    }
    const v: View = f.op === '+' ? { kind: 'join', first: X, second: Y } : f.op === '−' ? { kind: 'take', removed: Y, left: Z } : f.op === '×' ? { kind: 'groups', size: Y, count: X, div: false } : { kind: 'groups', size: Y, count: Z, div: true }
    if (T.type === 'missing') {
      if (f.z !== '?') {
        show('Bu eşitlik doğru ve aynı aileden! Ama ? hâlâ işlemin içinde. ? eşittirin öbür yanında tek başına kalsın: bilinen iki sayıyla hangi işlemi yapmalısın?')
        setView(v)
        return
      }
      S.attempt(true)
      clear()
      setView(v)
      setPhase('solve')
      track.strategy(f.op === '+' || f.op === '×' ? 'Bütünü parçalardan buldu' : 'Bütünden parçayı çıkararak/bölerek buldu')
      return
    }
    const factKey = `${f.x}${f.op}${f.y}=${f.z}`
    const key = (rel ? 'r:' : '') + factKey
    const isNewFact = !facts.includes(factKey)
    const isNew = !keys.current.has(key)
    keys.current.add(key)
    sol.add(key, eqText(f, rel))
    setView(v)
    if (T.type === 'open') setOpenFam([triple[0], triple[1], triple[2]])
    if (!isNew) {
      show(rel || !isNewFact ? 'Bu eşitliği zaten buldun! Sayıların yerini değiştirmeyi ya da diğer işlemi dene.' : 'Bunu zaten buldun!', { tone: 'ok' })
      return
    }
    S.attempt(true)
    totals.current.eqs++
    if (!totals.current.example) totals.current.example = eqText(f, rel)
    clear()
    if (rel) track.strategy('Eşittiri başa aldı (ilişkisel eşitlik)')
    const nextFacts = isNewFact ? [...facts, factKey] : facts
    setFacts(nextFacts)
    const fk = triple.join('-')
    const nextFams = { ...famsFound, [fk]: (famsFound[fk] ?? 0) + 1 }
    setFamsFound(nextFams)
    setFlash(isNewFact ? (rel ? 'Eşittir başta: yine doğru!' : 'Yeni bir aile üyesi!') : 'Eşittir başta: aynı eşitliğin yeni yazılışı!')
    busy.current = true
    window.setTimeout(() => {
      busy.current = false
      setFrame(EMPTY)
      setFlash(null)
    }, 900)
    const famsOk = T.type !== 'open' || Object.keys(nextFams).length >= 2
    if (nextFacts.length >= goalFacts && famsOk) S.complete()
  }

  const put = (slot: Slot, t: Tile) => {
    if (busy.current || phase !== 'build') return
    if ((slot === 'op') !== (t.kind === 'op')) return
    const nf = { ...frame, [slot]: t.v } as Frame
    setFrame(nf)
    evaluate(nf)
  }
  const order: Slot[] = rel ? ['z', 'x', 'op', 'y'] : ['x', 'op', 'y', 'z']
  const tapTile = (t: Tile) => {
    if (t.kind === 'op') return put('op', t)
    const empty = order.find((s) => s !== 'op' && !frame[s])
    if (empty) put(empty, t)
  }
  const clearSlot = (s: Slot) => {
    if (busy.current || phase !== 'build') return
    setFrame((f) => ({ ...f, [s]: null }))
  }
  const dnd = useTileDrag<Tile>({
    onDrop: (t, x, y) => {
      const z = hitZone(zones.current, x, y)
      if (z) put(z, t)
    },
    onTap: tapTile,
    ghost: (t) => <TileFace t={t} big={big} />,
  })

  const hint = () => {
    const hs = T.hints
    S.hint()
    show(hs[Math.min(hintI, hs.length - 1)])
    setHintI((i) => i + 1)
  }

  const submitAnswer = () => {
    if (T.type !== 'missing') return
    const n = parseNum(answer)
    if (n === T.unknown) {
      S.attempt(true)
      setPhase('solved')
      clear()
      totals.current.eqs++
      sol.add('missing', `? = ${T.unknown}`)
      S.complete()
    } else {
      S.attempt(false)
      const f = frame
      const near = Math.abs(n - T.unknown) === 1 || Math.abs(n - T.unknown) === 10
      show(near ? `Çok yaklaştın! ${f.x} ${f.op} ${f.y} işlemini bir daha dene: ${T.kind === 'add' ? 'önce onlukları, sonra birlikleri düşün.' : 'bildiğin bir çarpımdan başla.'}` : `${f.x} ${f.op} ${f.y} kaç eder? Modele bak: ${T.kind === 'add' ? 'parçalar birleşince ne olur?' : 'gruplar ne kadar?'}`, { misc: near ? undefined : 'Eksik sayıyı bulurken işlemi hatalı yaptı' })
      setAnswer('')
    }
  }

  const next = () => {
    if (S.last) {
      const ex = totals.current.example
      onFinish({
        stars: S.stars(),
        summary: `${totals.current.eqs} eşitlik kurdun, ${S.totals.first} görevi ilk denemede bitirdin.`,
        insight:
          grade <= 2
            ? `Üç sayı bir aile olabilir: iki parça ve bir bütün. Parçaları birleştirince toplama, bütünden bir parçayı çıkarınca çıkarma olur.${ex ? ` Senin bir eşitliğin: ${ex}.` : ''}`
            : grade === 3
              ? 'Bir çarpmayı bilen, aynı ailedeki bölmeyi de bilir: 6 × 7 = 42 ise 42 ÷ 7 = 6. Eşittir işareti iki yanın aynı değerde olduğunu söyler.'
              : 'İşlem ailesi bilinmeyeni bulmanın anahtarıdır: ? − 27 = 45 ise 27 + 45 = ?. Bir sayı birden fazla ailenin üyesi olabilir.',
      })
      return
    }
    resetTask()
    S.next()
  }

  // model üçlüsü
  const fam: [number, number, number] | null = T.type === 'open' ? openFam : [T.a, T.b, T.c]
  const [mA, mB, mC] = fam ?? [0, 0, 0]
  const model = !fam ? (
    <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-line bg-white/70 p-4 text-center font-extrabold text-ink-soft">
      Bir eşitlik kurunca o ailenin modeli burada belirecek.
    </div>
  ) : T.kind === 'add' ? (
    <AddModel a={mA} b={mB} c={mC} view={view} unknown={unknown} />
  ) : (
    <MulModel a={mA} b={mB} c={mC} view={view} unknown={unknown} />
  )

  const slotBox = (s: Slot) => {
    const v = frame[s]
    const isOp = s === 'op'
    const color = !v || isOp ? undefined : T.type === 'open' ? '#1f2340' : v === '?' ? '#7c3aed' : val(v) === Math.max(T.a, T.b, T.c) ? COL_W : val(v) === T.a ? COL_A : COL_B
    return (
      <button
        key={s}
        type="button"
        ref={(el) => {
          zones.current.set(s, el)
        }}
        onClick={() => v && clearSlot(s)}
        aria-label={v ? `${v}, kaldırmak için dokun` : isOp ? 'İşlem kutusu' : 'Sayı kutusu'}
        className={`grid shrink-0 place-items-center rounded-2xl border-[3px] font-black transition ${big ? 'h-16 text-3xl' : 'h-14 text-2xl'} ${isOp ? (big ? 'w-14' : 'w-12') : big ? 'min-w-[4.5rem] px-2' : 'min-w-16 px-2'} ${v ? 'border-solid bg-white shadow-[0_3px_0_var(--color-line)] animate-pop' : 'border-dashed border-slate-300 bg-white/60'} ${dnd.dragging && (dnd.dragging.kind === 'op') === isOp ? 'border-brand bg-brand-soft' : ''}`}
        style={{ color, borderColor: v && !isOp ? color : undefined }}
      >
        {v === '?' && phase === 'solved' && T.type === 'missing' ? T.unknown : v ?? ''}
      </button>
    )
  }
  const eqSign = <span key="eq" className={`font-black text-ink ${big ? 'text-3xl' : 'text-2xl'}`}>=</span>
  const frameRow = rel ? [slotBox('z'), eqSign, slotBox('x'), slotBox('op'), slotBox('y')] : [slotBox('x'), slotBox('op'), slotBox('y'), eqSign, slotBox('z')]

  const strategyOpts = T.kind === 'add' ? ['Parçaların yerini değiştirdim', 'Bütünden bir parçayı çıkardım', 'Modele baktım', 'Toplamayı düşünerek çıkardım'] : ['Sıraları ve sütunları düşündüm', 'Çarpmayı düşünerek böldüm', 'Dizide grupları saydım', 'Çarpanların yerini değiştirdim']

  const panel = (
    <>
      {T.type !== 'missing' && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black">🏠 Aile evi: {facts.length}{T.type === 'family' ? ` / ${T.goal}` : ''} eşitlik</p>
          <div className="grid grid-cols-2 gap-1.5">
            {sol.list.map((e) => (
              <span key={e.key} className="rounded-xl bg-emerald-50 px-2 py-2 text-center text-base font-black text-emerald-800 ring-1 ring-emerald-200 animate-pop">{e.label}</span>
            ))}
            {T.type === 'family' && Array.from({ length: Math.max(0, T.goal - sol.list.length) }, (_, i) => (
              <span key={`e${i}`} className="rounded-xl border-2 border-dashed border-line px-2 py-2 text-center text-base font-black text-slate-300">?</span>
            ))}
          </div>
        </div>
      )}
      {T.type === 'open' && famCount > 0 && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="mb-1 text-sm font-black">Bulduğun aileler: {famCount}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(famsFound).map(([k, n]) => (
              <span key={k} className="chip bg-amber-50 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">{`{${k.split('-').join(', ')}}`} · {n}</span>
            ))}
          </div>
        </div>
      )}
      {T.type === 'missing' && phase === 'solve' && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line animate-fade-up">
          <p className="mb-2 text-center text-lg font-black">
            {frame.x} {frame.op} {frame.y} = <span className="inline-block min-w-12 rounded-xl bg-violet-100 px-2 text-violet-800">{answer || '?'}</span>
          </p>
          <NumPad value={answer} onChange={setAnswer} onSubmit={submitAnswer} big={big} maxLen={4} />
        </div>
      )}
    </>
  )

  const doneBox = (
    <DoneNote title={T.type === 'missing' ? `? = ${T.unknown}` : T.type === 'open' ? `${famCount} farklı aile buldun!` : `${facts.length} eşitlik: aile tamam!`} note={T.note}>
      {T.type === 'missing' && (
        <div className="mt-2">
          <p className="text-sm font-black text-green-900">Ailenin tamamı:</p>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {(T.kind === 'add'
              ? [`${T.a} + ${T.b} = ${T.c}`, `${T.b} + ${T.a} = ${T.c}`, `${T.c} − ${T.a} = ${T.b}`, `${T.c} − ${T.b} = ${T.a}`]
              : [`${T.a} × ${T.b} = ${T.c}`, `${T.b} × ${T.a} = ${T.c}`, `${T.c} ÷ ${T.a} = ${T.b}`, `${T.c} ÷ ${T.b} = ${T.a}`]
            ).map((e) => (
              <span key={e} className="rounded-xl bg-white/80 px-2 py-1.5 text-center font-black text-emerald-800 ring-1 ring-emerald-200">{e}</span>
            ))}
          </div>
        </div>
      )}
      <StrategyPicker key={S.idx} question="Yeni eşitlikleri nasıl buldun?" options={strategyOpts} onPick={() => undefined} />
      {T.type !== 'missing' && <p className="mt-2 text-center text-sm font-bold text-green-800">İstersen başka eşitlikler kurmaya devam edebilirsin.</p>}
    </DoneNote>
  )

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title={T.title}
      prompt={T.prompt}
      nudge={nudge}
      onCloseNudge={clear}
      done={S.done}
      doneBox={doneBox}
      onNext={next}
      onHint={hint}
      onReset={() => {
        setFrame(EMPTY)
        clear()
      }}
      panel={panel}
    >
      {dnd.ghost}
      <div className="flex flex-col gap-4">
        {/* aile üçgeni + model */}
        <div className="grid items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className="hidden justify-center sm:flex">
            {fam ? <FactTriangle a={mA} b={mB} c={mC} ops={ops.join(' ')} unknown={unknown} /> : <FactTriangle a={0} b={0} c={0} ops={ops.join(' ')} labels={['?', '?', '?']} />}
          </div>
          <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-line">
            {T.type === 'missing' && (
              <p className="mb-2 text-center">
                <span className="inline-block rounded-xl bg-violet-100 px-4 py-1 text-2xl font-black text-violet-900 ring-2 ring-violet-300">{phase === 'solved' ? T.shown.replace('?', String(T.unknown)) : T.shown}</span>
              </p>
            )}
            {model}
          </div>
        </div>

        {/* eşitlik çerçevesi */}
        <div className={`relative rounded-3xl p-3 ring-2 sm:p-4 ${flash ? 'bg-ok-soft ring-green-300' : 'bg-white/90 ring-amber-200'}`}>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">{frameRow}</div>
          <div className="mt-2 flex min-h-8 flex-wrap items-center justify-center gap-2 text-sm font-extrabold">
            {flash ? (
              <span className="text-green-800">✓ {flash}</span>
            ) : phase === 'solve' ? (
              <span className="text-violet-800">Harika! Şimdi ? sayısını bul.</span>
            ) : (
              <span className="text-ink-soft">Kartları kutulara sürükle ya da kartlara dokun. Kutudaki karta dokununca geri çıkar.</span>
            )}
          </div>
          {(relOn || frame.x || frame.y || frame.z || frame.op) && phase === 'build' && (
            <div className="mt-1 flex justify-center gap-2">
              {relOn && (
                <button type="button" onClick={() => !busy.current && setRel((r) => !r)} className="btn-ghost min-h-12 px-3 text-sm" aria-pressed={rel}>
                  <ArrowLeftRight size={16} />
                  {rel ? '“=” sona' : '“=” başa'}
                </button>
              )}
              {(frame.x || frame.y || frame.z || frame.op) && (
                <button type="button" onClick={() => !busy.current && setFrame(EMPTY)} className="btn-ghost min-h-12 px-3 text-sm">
                  <Eraser size={16} />
                  Temizle
                </button>
              )}
            </div>
          )}
        </div>

        {/* kartlar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" aria-label="Kartlar">
          {nums.map((n) => {
            const t: Tile = { kind: 'num', v: n }
            return (
              <button key={n} type="button" {...dnd.bind(t)} data-handle style={{ touchAction: 'none' }} onKeyDown={(e) => e.key === 'Enter' && tapTile(t)} className="cursor-grab active:cursor-grabbing" aria-label={`Sayı kartı ${n}`} disabled={phase !== 'build'}>
                <TileFace t={t} big={big} color={T.type === 'open' ? '#1f2340' : n === '?' ? '#7c3aed' : val(n) === Math.max(T.a, T.b, T.c) ? COL_W : val(n) === T.a ? COL_A : COL_B} dim={phase !== 'build'} />
              </button>
            )
          })}
          <span className="mx-1 h-10 w-px bg-line" aria-hidden />
          {ops.map((o) => {
            const t: Tile = { kind: 'op', v: o }
            return (
              <button key={o} type="button" {...dnd.bind(t)} data-handle style={{ touchAction: 'none' }} onKeyDown={(e) => e.key === 'Enter' && tapTile(t)} className="cursor-grab active:cursor-grabbing" aria-label={`İşlem kartı ${o}`} disabled={phase !== 'build'}>
                <TileFace t={t} big={big} dim={phase !== 'build'} />
              </button>
            )
          })}
        </div>
      </div>
    </ActivityLayout>
  )
}

function TileFace({ t, big, color, dim }: { t: Tile; big: boolean; color?: string; dim?: boolean }) {
  const isOp = t.kind === 'op'
  return (
    <span
      className={`grid place-items-center rounded-2xl border-[3px] bg-white font-black shadow-[0_4px_0_rgb(0_0_0/0.12)] select-none ${big ? 'h-16 text-3xl' : 'h-14 text-2xl'} ${isOp ? (big ? 'w-16 bg-amber-50' : 'w-14 bg-amber-50') : big ? 'min-w-[4.5rem] px-3' : 'min-w-16 px-3'} ${dim ? 'opacity-40' : ''}`}
      style={{ color: isOp ? '#92400e' : color, borderColor: isOp ? '#f59e0b' : color ?? '#1f2340' }}
    >
      {t.v}
    </span>
  )
}
