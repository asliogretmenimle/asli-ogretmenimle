import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Lightbulb, Minus, Plus, RotateCcw, Scale, Unlock } from 'lucide-react'
import type { Grade, ManipulativeTool } from '../../../data/types'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { clamp } from '../../../interactive/axis'
import { ek } from '../../../lib/generators'
import { sfx } from '../../../lib/feedback'
import { useTracker } from '../../../lib/trackerContext'
import { starsFor, useFrame, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { hitZone, useDragDrop } from './drag'
import { BOX, BlockIcon, Expr, TowerScene, sideExpr, sideW, type Block, type Pans, type Side, type Src } from './scene'

/**
 * Denge Kulesi (1–4. sınıf) — eşittir işareti bir denge ilişkisidir.
 *  1. sınıf: küplerle ve sayı bloklarıyla dengeleme (5 + 3 = ? + 2), blokları kefeler arasında paylaştırma, doğru/yanlış eşitlikler.
 *  2. sınıf: onluk-birlik blokları, eksik toplanan, telafi (47 + 26 = 50 + ?), iki basamaklı doğru/yanlış eşitlikler.
 *  3. sınıf: çarpma çuvalları: 4 × 6 = 3 × ?, 4 × 6 = ? × ?, 3 × 8 = 3 × 5 + 3 × ?, yarılama-ikiye katlama.
 *  4. sınıf: gizemli kutular (hepsi aynı ağırlıkta): iki kefeden aynı miktarı çıkararak kutuyu yalnız bırakma.
 * Farklı dengeleme yolları useSolutions ile sayılır.
 */

type T = Omit<Block, 'id'>
const U = (k: number, locked = false): T[] => Array.from({ length: k }, () => ({ kind: 'unit', v: 1, locked, init: true }))
const BT = (v: number, locked = false): T[] => [...Array.from({ length: Math.floor(v / 10) }, () => ({ kind: 'rod' as const, v: 10, locked, init: true })), ...U(v % 10, locked)]
const N = (v: number, locked = false): T => ({ kind: 'num', v, locked, init: true })
const G = (n: number, v: number, locked = false, id?: string): T & { tag?: string } => ({ kind: 'group', n, v, locked, init: true, ...(id ? { tag: id } : {}) })
const BX = (k: number): T[] => Array.from({ length: k }, () => ({ kind: 'box', v: 0, init: true }))
const nums = (...v: number[]): Src[] => v.map((x) => ({ kind: 'num', v: x }))

interface Card { L: T[]; R: T[]; misc?: string }
interface DLevel {
  mode: 'balance' | 'judge' | 'solve'
  title: string
  prompt: string
  hints: string[]
  L: T[]
  R: T[]
  tray: Src[]
  goal: number
  u?: number
  x?: number
  /** 3. sınıf: sağ kefedeki ayarlanabilir çuval grubu */
  adjust?: { count?: [number, number]; size?: [number, number] }
  cards?: Card[]
  /** "Eşittir = sonuç" yanılgısını yakala */
  relational?: boolean
  /** Bütün bloklar kefelerde olmalı (paylaştırma görevi) */
  useAll?: boolean
  note?: string
  picker?: { q: string; options: string[] }
  tool?: ManipulativeTool
}

const pick = <X,>(a: X[]) => a[Math.floor(Math.random() * a.length)]
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

function makeLevels(grade: Grade): DLevel[] {
  if (grade <= 1) {
    const [a, b] = pick([[5, 3], [6, 4], [7, 4]])
    const [p, q, r] = pick([[5, 3, 2], [4, 4, 3], [6, 2, 3]])
    const [s, t, v] = pick([[8, 4, 5], [7, 5, 6], [9, 3, 4]])
    return [
      { mode: 'balance', title: 'Küplerle denge', prompt: `Sol kefede ${a}, sağ kefede ${b} küp var. Terazi eğik! Küp ekleyerek ya da çıkararak dengele. 2 farklı yol bul.`, hints: ['Hangi taraf aşağıda? Aşağıdaki taraf daha ağırdır.', 'Hafif tarafa küp ekleyebilirsin. Ağır taraftan küp çıkarmak da işe yarar mı?'], L: U(a), R: U(b), tray: [{ kind: 'unit', v: 1 }], goal: 2, u: 28, note: 'Hafif tarafa eklemek de ağır taraftan çıkarmak da dengeyi kurar!' },
      { mode: 'balance', title: 'Eksik blok', prompt: `${p} + ${q} = ? + ${r}. Sağ kefeye sayı blokları koy ve dengele. 2 farklı yol bul!`, hints: ['Sağda zaten bir blok var. Onu da hesaba kattın mı?', `Sol kefe kaç ediyor? Sağdaki ${r} ile birlikte aynı olmalı.`], L: [N(p, true), N(q, true)], R: [N(r, true)], tray: nums(1, 2, 3, 4, 5, 6, 7, 8, 9), goal: 2, relational: true, note: `Eşittir işareti “iki taraf aynı” demek: ${p} + ${q} = ${r} + ${p + q - r}.`, tool: 'balance' },
      { mode: 'balance', title: 'Paylaştır', prompt: 'Terazi çok eğik! Yeni blok yok: blokları kefeler arasında taşıyarak dengele. 2 farklı yol bul.', hints: ['Bütün blokların toplamı kaç? Her kefeye bunun yarısı düşmeli.', 'Büyük bir bloğu karşı tarafa taşı, sonra küçüklerle ince ayar yap.'], L: [N(6), N(5), N(3)], R: [N(2), N(1), N(1)], tray: [], goal: 2, useAll: true, note: 'Aynı bloklarla farklı eşitlikler: 6 + 3 = 5 + 2 + 1 + 1.' },
      { mode: 'balance', title: 'Dikkat, tuzak!', prompt: `${s} + ${t} = ? + ${v}. Sağ kefeyi dengele.`, hints: [`Sağ kefede ${v} zaten duruyor.`, `${s} + ${t} kaç eder? Sağda ${v} varken daha ne kadar gerekir?`], L: [N(s, true), N(t, true)], R: [N(v, true)], tray: nums(1, 2, 3, 4, 5, 6, 7, 8, 9), goal: 1, relational: true, tool: 'balance' },
      { mode: 'balance', title: '10’u dengele', prompt: 'Sağ kefede 10 var. Sol kefeye bloklar koyarak dengele. 3 farklı yol bul!', hints: ['İki blokla dene: 10’u hangi iki sayı yapar?', 'Üç blokla da olur mu?'], L: [], R: [N(10, true)], tray: nums(1, 2, 3, 4, 5, 6, 7, 8, 9), goal: 3, note: '10 = 6 + 4 = 7 + 3 = 5 + 5…: 10’un pek çok adı var!' },
      {
        mode: 'judge', title: 'Doğru mu?', prompt: 'Terazi kilitli. Önce tahmin et: kilidi açınca dengede kalır mı?', hints: ['Her iki tarafın toplamını düşün.'], L: [], R: [], tray: [], goal: 3,
        cards: [
          { L: [N(3), N(4)], R: [N(4), N(3)] },
          { L: [N(5), N(2)], R: [N(6), N(2)] },
          { L: [N(7)], R: [N(5), N(2)], misc: 'Eşittir işaretinin solunda tek sayı olunca eşitliği yanlış saydı (7 = 5 + 2)' },
        ],
      },
    ]
  }
  if (grade === 2) {
    const [a, b] = pick([[23, 15], [34, 26], [42, 35]])
    const [c, d] = pick([[35, 52], [28, 45], [46, 63]])
    const [e, f, g] = pick([[28, 6, 4], [37, 5, 2], [26, 8, 4]])
    const [h, k] = pick([[47, 26], [38, 25], [49, 17]])
    const top = Math.ceil(h / 10) * 10
    return [
      { mode: 'balance', title: 'Onluk ve birlik', prompt: `Sol kefede ${a}, sağ kefede ${b} var. Onluk ve birlik ekleyerek dengele. 2 farklı yol bul! (İki kefeye de ekleyebilirsin.)`, hints: ['Sağ kefe soldan ne kadar hafif?', 'Sola bir şey eklersen sağa ne kadar daha eklemen gerekir?'], L: BT(a, true), R: BT(b, true), tray: [{ kind: 'rod', v: 10 }, { kind: 'unit', v: 1 }], goal: 2, u: 18, note: `İki tarafa aynı sayıyı eklemek aradaki farkı değiştirmez: fark hep ${a - b}.`, tool: 'base10' },
      { mode: 'balance', title: 'Eksik toplanan', prompt: `${c} + ? = ${d}. Sol kefeye onluk ve birlik ekle, dengeyi kur.`, hints: [`${c}’ten ${Math.ceil(c / 10) * 10}’a kaç birlik gerekir?`, `${Math.ceil(c / 10) * 10}’dan ${d}’ye kaç onluk ve birlik var?`], L: BT(c, true), R: BT(d, true), tray: [{ kind: 'rod', v: 10 }, { kind: 'unit', v: 1 }], goal: 1, u: 18, note: `${c} + ${d - c} = ${d}, yani ${d} − ${c} = ${d - c}: toplama ile çıkarma kardeş!`, tool: 'base10' },
      { mode: 'balance', title: 'Tuzağa düşme!', prompt: `${e} + ${f} = ? + ${g}. Sağ kefeyi dengele. 2 farklı blok seçimiyle dene!`, hints: [`Sağda ${g} zaten var.`, `${e} + ${f} toplamından ${g} çıkarsa ne kalır?`], L: [N(e, true), N(f, true)], R: [N(g, true)], tray: nums(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20), goal: 2, relational: true, tool: 'balance' },
      {
        mode: 'judge', title: 'Doğru mu, yanlış mı?', prompt: 'Terazi kilitli. Hesaplamadan önce tahmin et: kilidi açınca dengede kalır mı?', hints: ['40 + 5 ile 38 + 7: 38, 40’tan 2 eksik; 7 ise 5’ten 2 fazla.'], L: [], R: [], tray: [], goal: 3,
        cards: [
          { L: [N(40), N(5)], R: [N(38), N(7)] },
          { L: [N(25), N(10)], R: [N(30), N(6)] },
          { L: [N(17), N(9)], R: [N(20), N(6)] },
        ],
      },
      { mode: 'balance', title: 'Paylaştır', prompt: 'Yeni blok yok! Blokları kefeler arasında taşıyarak dengele. 2 farklı yol bul.', hints: ['Tüm blokların toplamı kaç? Her kefe bunun yarısı olmalı.', '20 ile 15’i aynı kefeye koymayı dene.'], L: [N(20), N(15), N(9)], R: [N(6), N(8), N(12)], tray: [], goal: 2, useAll: true },
      { mode: 'balance', title: 'Telafi', prompt: `${h} + ${k} = ${top} + ?. Hesap yapmadan dengeleyebilir misin?`, hints: [`${h}, ${top}’den kaç eksik?`, `${top} ${h}’den büyük olduğuna göre öbür sayı ${k}’den küçük olmalı.`], L: [N(h, true), N(k, true)], R: [N(top, true)], tray: nums(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20), goal: 1, picker: { q: 'Nasıl buldun?', options: [`${h}’yi ${top}’e tamamladım, ${k}’den o kadar eksilttim`, 'Önce topladım, sonra çıkardım', 'Deneyerek'] } },
    ]
  }
  if (grade === 3) {
    const [a, b, c] = pick([[4, 6, 3], [6, 4, 8], [2, 9, 3]])
    const [p, q] = pick([[3, 8], [4, 7], [6, 7]])
    const [h, k] = pick([[8, 5], [6, 5], [4, 9]])
    return [
      { mode: 'balance', title: 'Çuvallar', prompt: `Solda ${a} çuval ${ek(b, 'dist')}: ${a} × ${b}. Sağda ${c} çuval var. Her çuvalda kaç olmalı? ${a} × ${b} = ${c} × ?`, hints: ['Çuvaldaki sayıyı artır, terazi nasıl hareket ediyor?', `Sol kefe kaç ediyor? ${c}’er ${c}’er düşün.`], L: [G(a, b, true)], R: [G(c, 1, false, 'adj')], tray: [], goal: 1, adjust: { size: [1, 12] }, tool: 'balance' },
      { mode: 'balance', title: 'Aynı ağırlık, farklı çarpım', prompt: '4 × 6 = ? × ?. Sağdaki çuvalların sayısını ve her çuvaldaki sayıyı değiştir. 3 farklı yol bul!', hints: ['2 çuval olsa her birinde kaç olmalı?', 'Çuval sayısını ikiye katlarsan çuvaldaki sayıya ne olmalı?'], L: [G(4, 6, true)], R: [G(1, 1, false, 'adj')], tray: [], goal: 3, adjust: { count: [1, 10], size: [1, 12] }, note: '4 × 6 = 3 × 8 = 2 × 12 = 6 × 4: 24’ün farklı çarpım adları.' },
      { mode: 'balance', title: 'Parçala', prompt: `${p} × ${q} = ${p} × 5 + ${p} × ?. Sağdaki ikinci grubun çuvallarını ayarla.`, hints: [`${q} = 5 + ? düşün.`, `Çuval sayısı ${p}; her çuvala kaç koymalısın?`], L: [G(p, q, true)], R: [G(p, 5, true), G(p, 1, false, 'adj')], tray: [], goal: 1, adjust: { size: [1, 10] }, note: `${p} × ${q} = ${p} × 5 + ${p} × ${q - 5}: büyük çarpımı iki kolay çarpıma ayırdın.` },
      { mode: 'balance', title: 'Çarpım ve toplam', prompt: '5 × 4 = 10 + ?. Sağ kefeye sayı blokları koy. 2 farklı yol bul!', hints: ['Sol kefe kaç ediyor?', 'Tek blok yerine iki blokla da tamamlayabilirsin.'], L: [G(5, 4, true)], R: [N(10, true)], tray: nums(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), goal: 2, relational: true },
      {
        mode: 'judge', title: 'Doğru mu?', prompt: 'Terazi kilitli. Çarpımları düşün ve tahmin et: dengede kalır mı?', hints: ['3 × 8 ile 4 × 6’yı dizilim olarak düşün.'], L: [], R: [], tray: [], goal: 3,
        cards: [
          { L: [G(6, 4)], R: [G(4, 6)] },
          { L: [G(3, 8)], R: [G(4, 6)] },
          { L: [G(5, 3)], R: [N(5), N(3)], misc: 'Çarpmayı toplama gibi düşündü (5 × 3 = 5 + 3)' },
        ],
      },
      { mode: 'balance', title: 'Yarıla, katla', prompt: `${h} × ${k} = ${h / 2} × ?. Sağdaki çuvallarda kaç olmalı?`, hints: ['Çuval sayısı yarıya indi.', 'Toplam aynı kalsın diye her çuvala ne olmalı?'], L: [G(h, k, true)], R: [G(h / 2, 1, false, 'adj')], tray: [], goal: 1, adjust: { size: [1, 20] }, picker: { q: 'Nasıl düşündün?', options: ['Çuvallar yarıya indi, içindekini ikiye katladım', 'Önce sol kefeyi hesapladım', 'Deneyerek'] } },
    ]
  }
  // 4. sınıf: gizemli kutular
  const x1 = ri(3, 6), b1 = ri(2, 4)
  const x2 = ri(3, 5), b2 = ri(1, 3)
  const x3 = ri(3, 5), b3 = ri(2, 4)
  const x5 = ri(3, 6)
  const x6 = ri(3, 4)
  return [
    { mode: 'solve', title: 'Gizemli kutu', prompt: `Mor kutuların hepsi aynı ağırlıkta. Terazi dengede: ${BOX} + ${b1} = ${x1 + b1}. İki kefeden aynı şeyi çıkararak kutuyu yalnız bırak. Bir kutu kaç gelir?`, hints: ['Kutunun yanındaki küpleri kaldırırsan terazi ne yapar?', 'Dengeyi korumak için karşı kefeden de aynı sayıda küp kaldır.'], L: [...BX(1), ...U(b1)], R: BT(x1 + b1), tray: [{ kind: 'unit', v: 1 }, { kind: 'rod', v: 10 }], goal: 1, x: x1, u: 22, tool: 'balance' },
    { mode: 'solve', title: 'Üç kutu', prompt: `3 × ${BOX} + ${b2} = ${3 * x2 + b2}. Kutuyu yalnız bırak: bir kutu kaç gelir?`, hints: [`Önce iki kefeden ${b2} küp çıkar.`, '3 kutudan 2’sini kaldırırsan dengeyi korumak için ne yapmalısın? Terazi sana söyler!', 'Onluğu kaldırıp yerine birlik koyabilirsin.'], L: [...BX(3), ...U(b2)], R: BT(3 * x2 + b2), tray: [{ kind: 'unit', v: 1 }, { kind: 'rod', v: 10 }], goal: 1, x: x2, u: 22 },
    { mode: 'solve', title: 'İki tarafta kutu', prompt: `2 × ${BOX} + ${b3} = ${BOX} + ${x3 + b3}. Her iki kefede de kutu var! Bir kutu kaç gelir?`, hints: ['İki kefeden birer kutu çıkarırsan denge bozulur mu?'], L: [...BX(2), ...U(b3)], R: [...BX(1), ...BT(x3 + b3)], tray: [{ kind: 'unit', v: 1 }, { kind: 'rod', v: 10 }], goal: 1, x: x3, u: 22 },
    { mode: 'balance', title: 'Dengeyi koru', prompt: `Terazi dengede: 2 × ${BOX} + 3 = 11. Dengeyi bozmadan teraziyi değiştir: ekle, çıkar… 3 farklı yol bul!`, hints: ['İki kefeye aynı anda ne eklersen denge korunur?', 'Her iki kefeden aynı şeyi çıkarmayı dene.', 'Her iki kefeye birer kutu eklemek de olur mu?'], L: [...BX(2), ...U(3)], R: BT(11), tray: [{ kind: 'unit', v: 1 }, { kind: 'rod', v: 10 }, { kind: 'box', v: 0 }], goal: 3, x: 4, u: 22, note: 'İki kefeye aynı şeyi ekleyince ya da iki kefeden aynı şeyi çıkarınca eşitlik korunur.' },
    { mode: 'solve', title: 'Kutular karşı karşıya', prompt: `4 × ${BOX} = 2 × ${BOX} + ${2 * x5}. Bir kutu kaç gelir?`, hints: ['İki kefeden aynı sayıda kutu çıkar.', '2 kutu bir sayıya eşitse 1 kutu kaça eşittir? Terazi yardım eder.'], L: BX(4), R: [...BX(2), ...BT(2 * x5)], tray: [{ kind: 'unit', v: 1 }, { kind: 'rod', v: 10 }], goal: 1, x: x5, u: 22 },
    { mode: 'solve', title: 'Usta dengeci', prompt: `3 × ${BOX} + 4 = ${BOX} + ${2 * x6 + 4}. Kutuyu yalnız bırak!`, hints: ['Önce kutuları mı, küpleri mi azaltacaksın? İkisi de olur.', 'Her hamlede iki kefeye aynı şeyi yap.'], L: [...BX(3), ...U(4)], R: [...BX(1), ...BT(2 * x6 + 4)], tray: [{ kind: 'unit', v: 1 }, { kind: 'rod', v: 10 }], goal: 1, x: x6, u: 22, picker: { q: 'Önce ne yaptın?', options: ['Önce kutuları azalttım', 'Önce küpleri azalttım', 'Deneyerek ilerledim'] } },
  ]
}

const insightFor = (grade: Grade, ex: string | null) =>
  grade <= 1
    ? `Eşittir işareti “iki taraf aynı” demek${ex ? `: ${ex}` : ''}. Dengelemek için hafif tarafa ekleyebilir ya da ağır taraftan çıkarabilirsin.`
    : grade === 2
      ? `İki tarafa aynı sayıyı eklemek dengeyi bozmaz; bir sayı büyüyünce öbürü küçülerek telafi edebilir${ex ? `: ${ex}` : ''}.`
      : grade === 3
        ? `Farklı çarpımlar aynı ağırlıkta olabilir: 4 × 6 = 3 × 8. Bir çarpımı parçalara ayırmak dengeyi bozmaz.`
        : `İki kefeye aynı şeyi yapınca denge korunur. Böylece kutuyu yalnız bıraktın${ex ? `: ${ex}` : ''}.`

/* ───────────── Görev oynatıcı ───────────── */

interface Api {
  report: (ok: boolean) => void
  found: (key: string, label: string) => boolean
  has: (k: string) => boolean
  nudge: (q: string | null, o?: { tool?: ManipulativeTool; misc?: string; tone?: 'ok' | 'think' }) => void
  say: (t: string) => void
  strategy: (s: string) => void
  complete: () => void
  breakMove: () => void
}

let uid = 0
const withIds = (ts: T[]): Block[] => ts.map((t) => ({ ...t, id: (t as { tag?: string }).tag ?? `b${++uid}` }))
const sig = (bs: Block[]) => bs.map((b) => (b.kind === 'group' ? `g${b.n}x${b.v}` : b.kind === 'num' ? `n${b.v}` : b.kind)).sort().join(',')
const stateKey = (p: Pans) => [sig(p.L), sig(p.R)].sort().join('|')

type DItem = { src: Src } | { side: Side; id: string } | { bench: string }

function LevelPlay({ level, api, done }: { level: DLevel; api: Api; done: boolean }) {
  const u = level.u ?? 26
  const x = level.x ?? 0
  const [pans, setPans] = useState<Pans>(() => ({ L: withIds(level.L), R: withIds(level.R) }))
  const initKey = useRef('')
  const initW = useRef({ L: 0, R: 0 })
  const [bench, setBench] = useState<Block[]>([])
  const [sel, setSel] = useState<DItem | null>(null)
  const [hot, setHot] = useState<Side | null>(null)
  const [angle, setAngle] = useState(0)
  const phys = useRef({ a: 0, v: 0 })
  const zones = useRef(new Map<Side | 'tray', Element | null>())
  // tahmin görevi
  const [ci, setCi] = useState(0)
  const [guess, setGuess] = useState<boolean | null>(null)
  // çözme görevi
  const [log, setLog] = useState<string[]>([])
  const [reveal, setReveal] = useState(false)
  const wasBal = useRef(true)

  const judge = level.mode === 'judge'
  useEffect(() => {
    if (judge && level.cards) setPans({ L: withIds(level.cards[ci].L), R: withIds(level.cards[ci].R) })
  }, [ci]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    initKey.current = stateKey(pans)
    initW.current = { L: sideW(pans.L, x), R: sideW(pans.R, x) }
    const e = `${sideExpr(pans.L)} = ${sideExpr(pans.R)}`
    if (level.mode === 'solve') setLog([e])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const wL = sideW(pans.L, x), wR = sideW(pans.R, x)
  const diff = wR - wL
  const balanced = diff === 0
  const pinned = judge && guess === null
  const target = pinned ? 0 : diff === 0 ? 0 : Math.sign(diff) * Math.min(14, 3.5 + (11 * Math.abs(diff)) / Math.max(6, (wL + wR) * 0.45))

  useFrame((dt) => {
    const p = phys.current
    const acc = -55 * (p.a - target) - 7.5 * p.v
    p.v += acc * dt
    p.a += p.v * dt
    if (Math.abs(p.a - angle) > 0.02) setAngle(p.a)
  }, true)

  const Lx = sideExpr(pans.L), Rx = sideExpr(pans.R)
  const rel = balanced ? '=' : diff > 0 ? '<' : '>'

  // çözme ve koruma görevlerinde dengeli durumları günlüğe yaz
  useEffect(() => {
    if (judge) return
    const e = `${Lx} = ${Rx}`
    if (balanced) {
      if (level.mode === 'solve' || level.goal > 0) setLog((l) => (l[l.length - 1] === e ? l : [...l, e]))
      if (level.mode === 'solve' && !reveal) {
        const iso = (a: Block[], b: Block[]) => a.length === 1 && a[0].kind === 'box' && b.length > 0 && b.every((k) => k.kind !== 'box')
        if (iso(pans.L, pans.R) || iso(pans.R, pans.L)) {
          setReveal(true)
          api.report(true)
          const path = [...log.filter((l, i, arr) => arr.indexOf(l) === i), ...(log.includes(e) ? [] : [e])]
          api.found(path.join(' → '), `${BOX} = ${x}`)
          api.say(`Buldun! Bir kutu ${x} geliyor.`)
          api.nudge(`Kutuyu yalnız bıraktın: bir kutu ${x} birim geliyor. Her adımda iki kefeye aynı şeyi yaptığın için eşitlik korundu.`, { tone: 'ok' })
          api.complete()
        } else {
          const boxes = (s: Block[]) => s.filter((k) => k.kind === 'box').length
          const kb = boxes(pans.L) || boxes(pans.R)
          const only = (boxes(pans.L) && pans.L.every((k) => k.kind === 'box') && !boxes(pans.R)) || (boxes(pans.R) && pans.R.every((k) => k.kind === 'box') && !boxes(pans.L))
          if (only && kb > 1) api.nudge(`${kb} kutu = ${boxes(pans.L) ? Rx : Lx}. Kutulardan birini kaldırırsan dengeyi korumak için diğer kefeden ne kadar kaldırmalısın? Terazi sana söyleyecek!`)
        }
      }
    } else if (wasBal.current && level.mode === 'solve' && !reveal) {
      api.breakMove()
      api.say('Terazi eğildi!')
      api.nudge('Terazi eğildi! Dengeyi geri getirmek için diğer kefede ne yapmalısın?')
    }
    wasBal.current = balanced
  }, [Lx, Rx, balanced]) // eslint-disable-line react-hooks/exhaustive-deps

  const lockedSay = () => {
    api.say('Bu blok yerinde sabit. Diğer bloklarla dene!')
  }
  const srcMatch = (b: Block) => level.tray.some((s) => s.kind === b.kind && (s.kind !== 'num' || s.v === b.v))
  const change = (fn: (p: Pans) => Pans) => {
    if (reveal || (judge && guess !== null) || judge) return
    setPans((p) => fn({ L: [...p.L], R: [...p.R] }))
    api.nudge(null)
  }
  const addTo = (side: Side, s: Src) => {
    if (pans[side].length >= 24) return api.say('Kefe doldu!')
    change((p) => ((p[side] = [...p[side], { ...s, id: `b${++uid}` }]), p))
  }
  const remove = (side: Side, id: string) => {
    const b = pans[side].find((k) => k.id === id)
    if (!b) return
    if (b.locked) return lockedSay()
    if (b.id === 'adj') return api.say('Bu çuvalları aşağıdaki düğmelerle ayarla!')
    change((p) => ((p[side] = p[side].filter((k) => k.id !== id)), p))
    if (level.useAll || !srcMatch(b)) setBench((bb) => [...bb, b])
  }
  const move = (from: Side, id: string, to: Side) => {
    if (from === to) return
    const b = pans[from].find((k) => k.id === id)
    if (!b) return
    if (b.locked) return lockedSay()
    if (b.id === 'adj') return api.say('Bu çuvalları aşağıdaki düğmelerle ayarla!')
    change((p) => ((p[from] = p[from].filter((k) => k.id !== id)), (p[to] = [...p[to], b]), p))
  }
  const fromBench = (id: string, to: Side) => {
    const b = bench.find((k) => k.id === id)
    if (!b) return
    setBench((bb) => bb.filter((k) => k.id !== id))
    change((p) => ((p[to] = [...p[to], b]), p))
  }

  const dd = useDragDrop<DItem>({
    ghost: (it) => {
      const b = 'src' in it ? it.src : 'bench' in it ? bench.find((k) => k.id === it.bench) : pans[it.side].find((k) => k.id === it.id)
      return b ? <BlockIcon b={b} u={u} /> : null
    },
    onMove: (_, cx, cy) => setHot(hitZone(zones.current as Map<Side, Element | null>, cx, cy, 0) as Side | null),
    onDrop: (it, cx, cy) => {
      setHot(null)
      const m = new Map(zones.current)
      m.delete('tray')
      const z = hitZone(m, cx, cy, 0) as Side | null
      if ('src' in it) z && addTo(z, it.src)
      else if ('bench' in it) z && fromBench(it.bench, z)
      else if (z && z !== it.side) move(it.side, it.id, z)
      else if (!z) remove(it.side, it.id)
    },
    onTap: (it) => {
      if ('side' in it) {
        if (sel) panTap(it.side)
        else remove(it.side, it.id)
      }
      else setSel((s) => (s && JSON.stringify(s) === JSON.stringify(it) ? null : it))
    },
  })

  const panTap = (side: Side) => {
    if (!sel) return
    if ('src' in sel) addTo(side, sel.src)
    else if ('bench' in sel) {
      fromBench(sel.bench, side)
      setSel(null)
    }
  }

  const reset = () => {
    setPans({ L: withIds(level.L), R: withIds(level.R) })
    setBench([])
    setSel(null)
    setReveal(false)
    wasBal.current = true
    setLog(level.mode === 'solve' ? [`${sideExpr(withIds(level.L))} = ${sideExpr(withIds(level.R))}`] : [])
    api.nudge(null)
  }

  // ── Kaydet (dengeleme görevi)
  const save = () => {
    if (!balanced) {
      api.report(false)
      const heavy = diff > 0 ? 'Sağ' : 'Sol'
      let misc: string | undefined
      if (level.relational) {
        for (const s of ['L', 'R'] as Side[]) {
          const o = s === 'L' ? 'R' : 'L'
          const hasLocked = pans[s].some((b) => b.locked)
          const added = sideW(pans[s].filter((b) => !b.init), x)
          if (hasLocked && added > 0 && added === sideW(pans[o].filter((b) => b.locked), x)) {
            misc = 'Eşittir işaretini “sonucu yaz” olarak yorumladı (ör. 8 + 4 = 12 + 5)'
            api.nudge(`${s === 'R' ? 'Sağ' : 'Sol'} kefeye ${added} koydun; bu, karşı taraftaki toplam. Ama bu kefede zaten başka bir blok da vardı! Eşittir işareti “cevabı yaz” değil, “iki taraf aynı” demek. Şimdi hangi taraf ağır?`, { misc, tool: level.tool })
            api.say('Hmm, terazi hâlâ eğik…')
            return
          }
        }
      }
      api.say('Terazi hâlâ eğik…')
      api.nudge(`${heavy} kefe ağır basıyor. Ne kadar fazla? Bunu hafif tarafa ekleyerek ya da ağır taraftan çıkararak düzeltebilirsin.`, { tool: level.tool })
      return
    }
    if (!pans.L.length || !pans.R.length) {
      api.nudge('Kefelerden biri boş! İki kefede de blok olsun.')
      return
    }
    if (level.useAll && bench.length) {
      api.nudge(`Kenarda ${bench.length} blok kaldı. Bütün blokları kefelere yerleştirerek dengele.`)
      return
    }
    const key = stateKey(pans)
    if (key === initKey.current) {
      api.nudge('Terazi zaten böyle dengedeydi. Dengeyi bozmadan bir değişiklik yap: ne ekleyebilir ya da çıkarabilirsin?')
      return
    }
    if (api.has(key)) {
      api.nudge('Bu dengeyi zaten buldun. Başka bir yol dene: eklemek yerine çıkarmayı ya da iki kefeyi birden değiştirmeyi düşündün mü?')
      return
    }
    api.report(true)
    api.found(key, `${Lx} = ${Rx}`)
    const dL = wL - initW.current.L, dR = wR - initW.current.R
    if (!level.adjust) {
      if (level.useAll) api.strategy('Blokları kefeler arasında taşıma')
      else if (dL === 0 || dR === 0) api.strategy((dL || dR) > 0 ? 'Hafif tarafa ekleme' : 'Ağır taraftan çıkarma')
      else if (dL === dR) api.strategy(dL > 0 ? 'İki kefeye aynı miktar ekleme' : 'İki kefeden aynı miktar çıkarma')
      else if (dL > 0 && dR > 0) api.strategy('İki kefeye ekleme (farkı koruma)')
      else api.strategy('İki kefeyi birden değiştirme')
    }
    api.say('Dengede! Harika!')
    api.nudge(`Dengede: ${Lx} = ${Rx}. ${level.goal > 1 ? 'Başka bir yol bulabilir misin?' : ''}`, { tone: 'ok' })
  }

  // ── Tahmin (doğru/yanlış eşitlik)
  const card = level.cards?.[ci]
  const choose = (eq: boolean) => {
    if (guess !== null) return
    setGuess(eq)
    const truth = balanced
    const ok = eq === truth
    window.setTimeout(() => {
      api.report(ok)
      if (ok) {
        sfx.ok()
        api.found(`card${ci}`, `${Lx} ${truth ? '=' : '≠'} ${Rx}`)
      }
      api.say(ok ? 'Tahminin doğru!' : 'Terazi başka bir şey söylüyor…')
      api.nudge(
        ok ? (truth ? 'Dengede! İki taraf farklı yazılmış ama aynı miktar.' : 'Haklısın, dengede değil: iki taraf farklı miktarda.') : truth ? 'Terazi dengede kaldı! İki taraf farklı görünüyor ama toplamları aynı. Nasıl olabilir?' : 'Terazi eğildi. Hangi taraf ağır basıyor? Ne kadar fazla?',
        { tone: ok ? 'ok' : 'think', misc: !ok ? card?.misc : undefined },
      )
    }, 900)
  }
  const nextCard = () => {
    if (!level.cards) return
    if (ci + 1 >= level.cards.length) {
      api.complete()
      return
    }
    setGuess(null)
    setCi((i) => i + 1)
    phys.current = { a: 0, v: 0 }
    api.nudge(null)
  }

  // ── 3. sınıf: ayarlanabilir çuvallar
  const adj = pans.R.find((b) => b.id === 'adj')
  const setAdj = (n: number, v: number) => change((p) => ((p.R = p.R.map((b) => (b.id === 'adj' ? { ...b, n, v } : b))), p))

  const armed = !!sel
  const sources = level.tray

  return (
    <div>
      <ZoomBox maxScale={3} className="mt-1">
        <div className="relative">
          <TowerScene
            pans={pans}
            angle={angle}
            u={u}
            x={x}
            reveal={reveal}
            balanced={balanced && !pinned}
            pinned={pinned}
            hot={hot}
            armed={armed}
            zoneRef={(s, el) => void zones.current.set(s, el)}
            onBlockDown={(e, side, id) => {
              const b = pans[side].find((k) => k.id === id)
              if (sel && !judge && !reveal && b?.locked) {
                e.preventDefault()
                panTap(side)
                return
              }
              if (b?.locked || judge || reveal) {
                if (b?.locked) lockedSay()
                return
              }
              dd.start(e, { side, id })
            }}
            onPanTap={panTap}
            dragId={dd.dragging && 'id' in dd.dragging ? dd.dragging.id : null}
          />
        </div>
      </ZoomBox>

      {/* canlı eşitlik */}
      <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-3 text-white shadow-inner sm:gap-3" aria-live="polite">
        <Expr text={Lx} className="rounded-xl bg-white/10 px-3 py-1 text-xl font-black tabular-nums sm:text-3xl" />
        <span className={`grid size-11 shrink-0 place-items-center rounded-full text-2xl font-black sm:size-12 sm:text-3xl ${pinned ? 'bg-slate-600' : balanced ? 'bg-emerald-500' : 'bg-orange-500'}`}>{pinned ? '?' : rel}</span>
        <Expr text={Rx} className="rounded-xl bg-white/10 px-3 py-1 text-xl font-black tabular-nums sm:text-3xl" />
      </div>
      {!pinned && !judge && (
        <p className={`mt-1.5 text-center text-sm font-extrabold ${balanced ? 'text-emerald-700' : 'text-orange-700'}`}>{balanced ? 'Terazi dengede!' : diff > 0 ? 'Sağ kefe ağır basıyor.' : 'Sol kefe ağır basıyor.'}</p>
      )}

      {/* tahmin */}
      {judge && card && (
        <div className="mt-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
          <p className="mb-2 text-center text-[15px] font-black text-sky-900">
            Eşitlik {ci + 1}/{level.cards!.length}: {guess === null ? 'kilidi açınca terazi…' : <>tahminin “{guess ? 'dengede kalır' : 'bir taraf ağır basar'}” · terazi {balanced ? 'dengede kaldı' : 'eğildi'} {guess === balanced ? '✅' : '🤔'}</>}
          </p>
          {guess === null ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => choose(true)} className="min-h-14 min-w-40 rounded-2xl bg-white px-4 text-lg font-black text-emerald-800 ring-2 ring-emerald-300 active:scale-95"><Unlock size={18} className="mr-1 inline" />= Dengede kalır</button>
              <button type="button" onClick={() => choose(false)} className="min-h-14 min-w-40 rounded-2xl bg-white px-4 text-lg font-black text-orange-800 ring-2 ring-orange-300 active:scale-95"><Unlock size={18} className="mr-1 inline" />≠ Bir taraf ağır basar</button>
            </div>
          ) : (
            !done && (
              <div className="flex justify-center">
                <button type="button" onClick={nextCard} className="btn-primary min-h-14 min-w-56 text-lg">{ci + 1 >= level.cards!.length ? 'Bitir' : 'Sonraki eşitlik'}<ArrowRight size={20} /></button>
              </div>
            )
          )}
        </div>
      )}

      {/* ayarlanabilir çuvallar */}
      {adj && level.adjust && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-violet-50 p-2 ring-1 ring-violet-200">
          <span className="px-1 text-sm font-black text-violet-900">Sağdaki çuvallar:</span>
          {level.adjust.count && (
            <Stepper label="çuval" value={adj.n ?? 1} min={level.adjust.count[0]} max={level.adjust.count[1]} onChange={(n) => setAdj(n, adj.v)} />
          )}
          {level.adjust.size && <Stepper label="her çuvalda" value={adj.v} min={level.adjust.size[0]} max={level.adjust.size[1]} onChange={(v) => setAdj(adj.n ?? 1, v)} />}
        </div>
      )}

      {/* blok tepsisi */}
      {!judge && (sources.length > 0 || bench.length > 0) && (
        <div ref={(el) => void zones.current.set('tray', el)} className="mt-3 rounded-2xl bg-[linear-gradient(180deg,#fef3c7,#fde68a)] p-2.5 ring-1 ring-amber-300">
          <div className="mb-1.5 flex min-h-8 flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs font-black tracking-wide text-amber-900 uppercase">{sel ? 'Seçili blok: koymak istediğin kefeye dokun' : sources.length ? 'Blok kutusu · kefeye sürükle ya da seç, sonra kefeye dokun' : 'Kenara alınan bloklar'}</p>
            {sel && (
              <button type="button" onClick={() => setSel(null)} className="min-h-10 rounded-xl bg-white px-3 text-sm font-extrabold text-amber-900 ring-1 ring-amber-300 active:scale-95">✕ Seçimi bırak</button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sources.map((s, i) => {
              const it: DItem = { src: s }
              const on = !!sel && 'src' in sel && sel.src.kind === s.kind && sel.src.v === s.v
              return (
                <button key={i} type="button" data-handle onPointerDown={(e) => dd.start(e, it)} className={`grid min-h-14 min-w-14 cursor-grab place-items-center rounded-xl bg-white/90 p-1.5 shadow-sm ring-2 transition active:scale-95 ${on ? 'ring-amber-600 -translate-y-1 shadow-md' : 'ring-transparent'}`} style={{ touchAction: 'none' }} aria-pressed={on} aria-label={`${s.kind === 'unit' ? 'Birlik küp' : s.kind === 'rod' ? 'Onluk çubuk' : s.kind === 'box' ? 'Gizemli kutu' : `${s.v} bloğu`}`}>
                  <BlockIcon b={s} u={Math.min(u, 24)} scale={s.kind === 'rod' ? 0.55 : 1} />
                </button>
              )
            })}
            {bench.map((b) => {
              const on = !!sel && 'bench' in sel && sel.bench === b.id
              return (
                <button key={b.id} type="button" data-handle onPointerDown={(e) => dd.start(e, { bench: b.id })} className={`grid min-h-14 min-w-14 cursor-grab place-items-center rounded-xl bg-white/60 p-1.5 ring-2 ring-dashed transition animate-pop ${on ? 'ring-amber-600 -translate-y-1' : 'ring-amber-400'}`} style={{ touchAction: 'none' }} aria-pressed={on} aria-label="Kenardaki blok">
                  <BlockIcon b={b} u={Math.min(u, 24)} scale={b.kind === 'rod' ? 0.55 : 1} />
                </button>
              )
            })}
          </div>
        </div>
      )}
      {!judge && <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">{sel ? 'Seçim açıkken kefeye her dokunuş bir blok daha koyar.' : 'Kefedeki bir bloğa dokunursan kefeden çıkar; sürüklersen öbür kefeye taşınır. 🔒 bloklar sabittir.'}</p>}

      {!judge && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn-ghost min-h-14 px-4"><RotateCcw size={18} />Baştan kur</button>
          {level.mode === 'balance' && (
            <button type="button" onClick={save} className={`btn-primary min-h-14 min-w-56 text-lg ${balanced && !pinned ? 'animate-pulse' : ''}`}><Scale size={20} />Dengeyi kaydet</button>
          )}
          {level.mode === 'solve' && reveal && (
            <button type="button" onClick={reset} className="btn-primary min-h-14 px-5 text-lg"><RotateCcw size={18} />Başka yolla çöz</button>
          )}
        </div>
      )}

      {level.mode === 'solve' && log.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white/95 p-3 ring-1 ring-line">
          <p className="mb-1.5 text-sm font-black">📜 Denge günlüğü</p>
          <ol className="flex flex-wrap items-center gap-1.5">
            {log.map((l, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight size={16} className="text-ink-soft" />}
                <Expr text={l} className={`rounded-lg px-2 py-1 text-base font-black tabular-nums ${i === log.length - 1 && reveal ? 'bg-violet-600 text-white' : 'bg-slate-100'}`} />
              </li>
            ))}
          </ol>
        </div>
      )}
      {dd.ghost}
    </div>
  )
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-white px-2 py-1 ring-1 ring-violet-200">
      <button type="button" onClick={() => onChange(clamp(value - 1, min, max))} disabled={value <= min} className="grid size-12 place-items-center rounded-xl bg-violet-100 text-violet-900 active:scale-95 disabled:opacity-30" aria-label={`${label} azalt`}><Minus size={22} strokeWidth={3} /></button>
      <span className="min-w-10 text-center text-2xl font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(clamp(value + 1, min, max))} disabled={value >= max} className="grid size-12 place-items-center rounded-xl bg-violet-100 text-violet-900 active:scale-95 disabled:opacity-30" aria-label={`${label} artır`}><Plus size={22} strokeWidth={3} /></button>
      <span className="px-1 text-sm font-extrabold text-violet-900">{label}</span>
    </div>
  )
}

function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setWide(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return wide
}

/* ───────────── Oyun ───────────── */

type NudgeState = { q: string; tool?: ManipulativeTool; misc?: string; tone: 'ok' | 'think'; id: number } | null

export default function DengeKulesi({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => makeLevels(grade), [grade])
  const track = useTracker()
  const sol = useSolutions()
  const [idx, setIdx] = useState(0)
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const [completed, setCompleted] = useState(false)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [say, setSay] = useState('Merhaba! Ben Bilge Baykuş. Teraziyi birlikte dengeleyelim.')
  const [hintI, setHintI] = useState(0)
  const [playKey, setPlayKey] = useState(0)
  const stat = useRef({ fails: 0, hints: 0, breaks: 0, itemDone: false })
  const totals = useRef({ first: 0, sols: 0, example: null as string | null })
  const keys = useRef(new Set<string>())
  const nid = useRef(0)
  const wide = useWide()
  const L = levels[idx]
  const judge = L.mode === 'judge'
  const done = completed || (!judge && L.mode !== 'solve' && found.length >= L.goal)

  const api: Api = {
    report: (ok) => {
      track.attempt(ok)
      if (!ok) stat.current.fails++
    },
    has: (k) => keys.current.has(k),
    found: (key, label) => {
      if (keys.current.has(key)) return false
      keys.current.add(key)
      sol.add(key, label)
      setFound((f) => [...f, { key, label }])
      totals.current.sols++
      if (!totals.current.example && !label.startsWith(BOX)) totals.current.example = label
      if (L.mode === 'solve') totals.current.example = key.split(' → ').slice(0, 3).join(' → ') + ` → ${label}`
      return true
    },
    nudge: (q, o) => setNudge(q ? { q, tool: o?.tool, misc: o?.misc, tone: o?.tone ?? 'think', id: ++nid.current } : null),
    say: (t) => setSay(t),
    strategy: (s) => track.strategy(s),
    complete: () => setCompleted(true),
    breakMove: () => void stat.current.breaks++,
  }

  useEffect(() => {
    if (done && !stat.current.itemDone) {
      stat.current.itemDone = true
      const first = stat.current.fails === 0 && stat.current.hints === 0 && stat.current.breaks <= 2
      track.item(first)
      if (first) totals.current.first++
      if (L.mode === 'solve') track.strategy('İki kefeye aynı işlemi uygulama (eşitliği koruma)')
    }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const hint = () => {
    const h = L.hints[Math.min(hintI, L.hints.length - 1)]
    setHintI((i) => i + 1)
    stat.current.hints++
    track.hint()
    setNudge({ q: h, tone: 'think', id: ++nid.current, tool: L.tool })
  }

  const next = useCallback(() => {
    if (idx + 1 >= levels.length) {
      const n = levels.length
      const ratio = (totals.current.first + 0.5 * (n - totals.current.first)) / n
      onFinish({
        stars: starsFor(ratio),
        summary: `${totals.current.sols} denge buldun, ${totals.current.first} görevi ilk denemede bitirdin.`,
        score: totals.current.sols * 10 + totals.current.first * 20,
        insight: insightFor(grade, totals.current.example),
      })
      return
    }
    setIdx((i) => i + 1)
    setFound([])
    keys.current = new Set()
    sol.reset()
    setCompleted(false)
    setNudge(null)
    setHintI(0)
    stat.current = { fails: 0, hints: 0, breaks: 0, itemDone: false }
    setSay('Yeni bir terazi geldi!')
  }, [idx, levels.length, onFinish, grade, sol])

  const restart = () => {
    setFound([])
    keys.current = new Set()
    sol.reset()
    setCompleted(false)
    setNudge(null)
    stat.current.itemDone = false
    setPlayKey((k) => k + 1)
  }

  const nudgeView = nudge && (
    <div className="[&_p]:min-w-[11rem]">
      <Nudge key={nudge.id} question={nudge.q} tool={nudge.tool} toolTitle={nudge.tool === 'balance' ? 'Eşit kollu terazi' : undefined} misconception={nudge.misc} tone={nudge.tone} onClose={() => setNudge(null)} />
    </div>
  )

  const goalTxt = judge ? `${L.cards?.length ?? 0} eşitlik` : L.mode === 'solve' ? 'Kutuyu bul' : L.goal === 1 ? 'Dengeyi kur' : `${L.goal} farklı denge`

  return (
    <div className="grid gap-3 select-none lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-4">
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-sm font-black text-violet-800">Kule {idx + 1}/{levels.length} · {L.title}</span>
          <LevelDots current={idx} total={levels.length} />
        </div>
        <TaskCard step={idx + 1} total={levels.length}>
          <Expr text={L.prompt} />
        </TaskCard>
      </div>

      <Scene grade={grade} className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-4xl drop-shadow-sm" aria-hidden>🦉</span>
          <p className="relative rounded-2xl bg-white px-3 py-2 text-[14px] leading-snug font-extrabold text-ink shadow-sm ring-1 ring-violet-200 sm:text-[15px]" aria-live="polite">{say}</p>
          <span className="ml-auto chip shrink-0 bg-violet-100 px-3 py-1 text-sm text-violet-800">{goalTxt}</span>
        </div>
        <LevelPlay key={`${idx}-${playKey}`} level={L} api={api} done={done} />
        {!wide && nudgeView}
      </Scene>

      <aside className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
        {wide && nudgeView}
        {!judge && (
          <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-black">⚖️ Bulduğun dengeler</p>
              <span className="chip bg-violet-100 text-sm text-violet-800">{found.length} / {L.goal}</span>
            </div>
            <div className="mb-2 flex gap-1" aria-hidden>
              {Array.from({ length: L.goal }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < found.length ? 'bg-violet-500' : 'bg-line'}`} />)}
            </div>
            {found.length === 0 ? (
              <p className="text-sm font-bold text-ink-soft">Henüz denge yok. Blokları hareket ettir!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {found.map((f) => <Expr key={f.key} text={f.label} className="chip bg-violet-50 px-3 py-1 text-sm text-violet-900 ring-1 ring-violet-200 animate-pop" />)}
              </div>
            )}
          </div>
        )}
        {done ? (
          <div className="rounded-2xl bg-ok-soft p-4 ring-1 ring-green-200 animate-fade-up">
            <p className="text-lg font-black text-green-900">🎉 {judge ? `${found.length} / ${L.cards?.length} tahmin doğru!` : L.mode === 'solve' ? 'Gizem çözüldü!' : `${found.length} farklı denge buldun!`}</p>
            {L.note && <p className="mt-1 font-bold text-green-900"><Expr text={L.note} /></p>}
            {L.picker && <StrategyPicker question={L.picker.q} options={L.picker.options} onPick={() => undefined} />}
            <BigButton onClick={next} className="mt-3 w-full">{idx + 1 >= levels.length ? 'Kuleyi bitir' : 'Sonraki kule'}<ArrowRight size={20} /></BigButton>
            {!judge && <p className="mt-2 text-center text-sm font-bold text-green-800">{L.mode === 'solve' ? 'İstersen “Başka yolla çöz” ile farklı bir yol dene.' : 'İstersen başka dengeler bulmaya devam edebilirsin.'}</p>}
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={hint} className="btn-ghost min-h-12 flex-1"><Lightbulb size={18} className="text-amber-500" />İpucu</button>
            {!judge && <button type="button" onClick={restart} className="btn-ghost min-h-12 px-4" aria-label="Görevi baştan başlat"><RotateCcw size={18} />Baştan</button>}
          </div>
        )}
      </aside>
    </div>
  )
}

