import { useMemo, useRef, useState } from 'react'
import { Undo2 } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../data/types'
import type { InteractionProps } from '../types'
import { ek } from '../../lib/generators'
import { ZoomBox } from '../../interactive/ZoomBox'
import { StrategyPicker, SolutionList, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, NumPad, parseNum, pick, randInt, shuffle, tr, useNudge, useSession } from '../hizli-noktalar/kit'
import { CupStage, EquationBuilder, useBoxWidth, FrameBuilder, JumpLine, NumberBond, TapeModel, jumpColor, type TapeKind, type Tile } from './parts'

/**
 * 25. Eksik Parça (1–4) — Van de Walle: parça-parça-bütün, “eksik toplanan” problemleri.
 * Her görev: (1) eksik parçayı modelle → (2) sayıyı/eşitliği yaz → (3) doğrula + “Nasıl düşündün?”
 *  1. sınıf: bardak altındaki bilyeler; onluk/yirmilik çerçevede ileri sayarak modelleme, sayı bağı, 5 + ? = 8.
 *  2. sınıf: şerit modeli + boş sayı doğrusunda +10/+1 zıplamaları; eşitlik karolarıyla toplama VE çıkarma eşitliği.
 *  3. sınıf: 1000’e kadar; karşılaştırma (fark) modeli ve “? + 48 = 130” (eksik ilk parça).
 *  4. sınıf: dört basamaklı sayılar, eşit parçalı şerit (eksik çarpan: ? × 4 = 48), iki adımlı (iki parça bilinen) problem.
 */

type Kind = 'cup' | TapeKind

interface Level {
  kind: Kind
  /** bütün */
  W: number
  /** bilinen parça (equal: parça sayısı k) */
  a: number
  /** ikinci bilinen parça (three) */
  c?: number
  /** eksik parça (equal: bir parçanın değeri) */
  b: number
  frame?: 10 | 20
  /** cup: eşitlik çıkarma biçiminde (W − a = ?) */
  sub?: boolean
  names?: [string, string]
  unit?: string
  title: string
  prompt: string
}

const PEOPLE = ['Ece', 'Can', 'Ela', 'Ali', 'Zeynep', 'Mert', 'Defne', 'Emir']

function cup(W: number, a: number, frame: 10 | 20, sub = false): Level {
  return {
    kind: 'cup',
    W,
    a,
    b: W - a,
    frame,
    sub,
    title: frame === 20 ? 'Büyük bardak' : 'Bardağın altında',
    prompt: `Toplam ${W} misket var. ${ek(a, 'acc')} görüyorsun, gerisi bardağın altında. Çerçeveye mavi sayaç ekleyerek ${ek(W, 'dat')} tamamla. Bardağın altında kaç misket var?`,
  }
}

function makeLevels(grade: Grade): Level[] {
  if (grade <= 1) {
    const w1 = pick([6, 7])
    const w2 = pick([8, 9])
    const a3 = pick([6, 7])
    const a4 = pick([8, 9])
    const w4 = a4 + pick([4, 5, 6])
    const w5 = pick([12, 14, 16])
    return [cup(w1, randInt(3, w1 - 2), 10), cup(w2, 5, 10), cup(10, a3, 10, true), cup(w4, a4, 20), { ...cup(w5, w5 / 2, 20, true), title: 'İkizler mi?' }]
  }
  if (grade === 2) {
    const n = shuffle(PEOPLE)
    const a1 = randInt(23, 38), b1 = randInt(14, 29)
    const a2 = randInt(21, 27) // 40 olan bütün
    const a3 = randInt(41, 58), b3 = randInt(18, 39 - Math.max(0, a3 + 39 - 99))
    const W4 = randInt(52, 78), a4 = randInt(25, W4 - 18)
    const a5 = randInt(55, 78)
    return [
      { ...cup(15, pick([7, 8, 9]), 20), title: 'Isınma: bardak' },
      { kind: 'tape', W: a1 + b1, a: a1, b: b1, unit: 'sayfa', title: 'Kitap şeridi', prompt: `Kitap ${a1 + b1} sayfa. ${n[0]} ${ek(a1, 'acc')} okudu. Kaç sayfası kaldı? Eksik parçayı +10 ve +1 zıplamalarıyla ${ek(a1 + b1, 'dat')} kadar büyüt.` },
      { kind: 'tape', W: 40, a: a2, b: 40 - a2, unit: 'yolcu', title: 'Otobüs', prompt: `Otobüste 40 yolcu var. Bunların ${ek(a2, 'poss')} ilk durakta bindi. Kaç yolcu ikinci durakta bindi? Eksik parçayı modelle.` },
      { kind: 'compare', W: W4, a: a4, b: W4 - a4, names: [n[1], n[2]], title: 'Kaç fazla?', prompt: `${n[1]} ${W4} sayfa, ${n[2]} ${a4} sayfa okudu. ${n[1]}, ${n[2]}’dan kaç sayfa fazla okudu? Alttaki şeridi üsttekine eşitle.` },
      { kind: 'tape', W: a3 + b3, a: a3, b: b3, unit: 'TL', title: 'Kumbara', prompt: `Kumbarada ${a3 + b3} TL birikmesi gerekiyor. Şu an ${a3} TL var. Kaç lira daha atmalı?` },
      { kind: 'tape', W: 100, a: a5, b: 100 - a5, unit: 'boncuk', title: 'Yüze tamamla', prompt: `Kolye için 100 boncuk gerekiyor. ${ek(a5, 'acc')} dizdin. Kaç boncuk daha dizmelisin?` },
    ]
  }
  if (grade === 3) {
    const n = shuffle(PEOPLE)
    const W1 = pick([400, 500, 600]), b1 = randInt(115, 290)
    const W2 = randInt(11, 19) * 10 + pick([0, 5]), a2 = randInt(55, 95)
    const W3 = randInt(12, 18) * 10, a3 = randInt(35, 68)
    const a4 = randInt(410, 690), b4 = randInt(130, 290)
    const k5 = pick([3, 4]), p5 = randInt(6, 9)
    return [
      { kind: 'tape', W: W1, a: W1 - b1, b: b1, unit: 'sayfa', title: 'Kalın kitap', prompt: `${possName(n[0])} kitabı ${W1} sayfa. ${W1 - b1} sayfasını okudu. Kaç sayfa kaldı? +100, +10, +1 zıplamalarıyla modelle.` },
      { kind: 'compare', W: W2, a: a2, b: W2 - a2, names: [n[1], n[2]], title: 'Fark ne kadar?', prompt: `${n[1]} ${W2} cm, ${n[2]} ${a2} cm atladı. ${n[1]}, ${n[2]}’dan kaç cm daha uzağa atladı? Kısa şeridi uzun şeride eşitle.` },
      { kind: 'first', W: W3, a: a3, b: W3 - a3, unit: 'sayfa', title: 'İlk parça kayıp', prompt: `Sabah biraz kitap okudum, akşam ${a3} sayfa daha okudum. Toplam ${W3} sayfa ettim. Sabah kaç sayfa okudum? ? + ${a3} = ${W3}` },
      { kind: 'tape', W: a4 + b4, a: a4, b: b4, unit: 'kişi', title: 'Konser salonu', prompt: `Salon ${a4 + b4} kişilik. ${a4} kişi oturdu. Kaç koltuk boş? Eksik parçayı modelle.` },
      { kind: 'equal', W: k5 * p5, a: k5, b: p5, unit: 'kalem', title: 'Eşit parçalar', prompt: `${k5 * p5} kalem ${k5} kutuya eşit konacak. Her kutuya kaç kalem düşer? Bir parçanın büyüklüğünü ayarla.` },
      { kind: 'tape', W: 1000, a: (W1 - b1) + 300, b: 1000 - (W1 - b1) - 300, unit: 'adım', title: 'Bine tamamla', prompt: `Hedef 1000 adım! Şimdiye kadar ${tr(W1 - b1 + 300)} adım attın. Kaç adım daha atmalısın?` },
    ]
  }
  // 4. sınıf
  const n = shuffle(PEOPLE)
  const W1 = pick([3000, 4000, 5000]), b1 = randInt(1150, 2400)
  const W2 = randInt(2500, 4800), a2 = randInt(1200, 2300)
  const p3 = randInt(11, 19)
  const k4 = pick([5, 6, 8]), p4 = randInt(12, 25)
  const a5 = randInt(21, 39), c5 = randInt(18, 35)
  const W6 = pick([2500, 3000, 4000]), a6 = randInt(1150, 1890)
  return [
    { kind: 'tape', W: W1, a: W1 - b1, b: b1, unit: 'm', title: 'Koşu parkuru', prompt: `Koşu parkuru ${tr(W1)} m. ${n[0]} ${tr(W1 - b1)} m koştu. Kaç metre kaldı? Zıplamalarını sen seç.` },
    { kind: 'compare', W: W2, a: a2, b: W2 - a2, names: ['Ocak', 'Şubat'], title: 'İki ay', prompt: `Kütüphaneden ocakta ${tr(W2)}, şubatta ${tr(a2)} kitap ödünç alındı. Ocakta kaç kitap fazla alındı?` },
    { kind: 'equal', W: 4 * p3, a: 4, b: p3, unit: 'kalem', title: 'Eşit kutular', prompt: `${4 * p3} kalem 4 kutuya eşit konacak. Bir kutunun büyüklüğünü ayarla: her kutuda kaç kalem? ? × 4 = ${4 * p3}` },
    { kind: 'three', W: 100, a: a5, c: c5, b: 100 - a5 - c5, unit: 'puan', title: 'Üç tur', prompt: `Yarışma 100 puanlık. ${n[1]} 1. turda ${a5}, 2. turda ${c5} puan aldı. 3. turda kaç puan alırsa 100’e ulaşır?` },
    { kind: 'equal', W: k4 * p4, a: k4, b: p4, unit: 'TL', title: 'Ortak hediye', prompt: `${k4} arkadaş ${k4 * p4} TL’lik hediyeyi eşit paylaşacak. Kişi başı kaç TL? Bir parçayı ayarla.` },
    { kind: 'first', W: W6, a: a6, b: W6 - a6, unit: 'TL', title: 'İlk parça kayıp', prompt: `Bisiklet ${tr(W6)} TL. ${n[2]} biraz para biriktirdi, dedesi ${tr(a6)} TL ekledi ve tam yetti. ${n[2]} kaç TL biriktirmişti? ? + ${tr(a6)} = ${tr(W6)}` },
  ]
}

/** "Ece’nin" gibi özel ad tamlayanı */
function possName(name: string) {
  const v = [...name].reverse().find((c) => 'aıoueiöü'.includes(c)) ?? 'e'
  const i4 = 'aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü'
  return `${name}’${'aıoueiöü'.includes(name[name.length - 1]) ? 'n' : ''}${i4}n`
}

const STRATS_ADD = ['İleri saydım', 'Geri saydım', 'Onluğa tamamladım', 'Çıkarma yaptım', 'Bildiğim bir toplamı kullandım']
const STRATS_MUL = ['Çarpım tablosunu düşündüm', 'Bölme yaptım', 'Deneyerek yaklaştım', 'Önce 10’ar koydum']

const toolFor = (l: Level): { tool: ManipulativeTool; toolConfig?: ManipulativeConfig; toolTitle: string } =>
  l.kind === 'cup'
    ? { tool: 'tenframe', toolConfig: { frames: l.frame === 20 ? 2 : 1 }, toolTitle: 'Onluk çerçeve' }
    : l.kind === 'equal'
      ? { tool: 'base10', toolTitle: 'Onluk bloklar' }
      : { tool: 'numberline', toolConfig: { min: Math.floor(l.a / 10) * 10, max: Math.ceil(l.W / 10) * 10, step: l.W > 200 ? 10 : 1 }, toolTitle: 'Sayı doğrusu' }

export default function EksikParca({ grade, onFinish }: InteractionProps) {
  const levels = useMemo(() => makeLevels(grade), [grade])
  const S = useSession(levels.length)
  const N = useNudge()
  const [run, setRun] = useState(0)
  const eqCount = useRef(0)
  const L = levels[S.idx]

  const next = () => {
    N.clear()
    if (S.last) {
      const t = S.totals
      onFinish({
        stars: S.stars(),
        summary: `${t.done} eksik parçayı modelledin, ${t.first} görevi ilk denemede bitirdin${eqCount.current ? `, ${eqCount.current} eşitlik yazdın` : ''}.`,
        insight:
          grade <= 1
            ? 'Bütün ve bir parça biliniyorsa eksik parçayı bütüne kadar ileri sayarak bulabilirsin: 5 + ? = 8 ile 8 − 5 = ? aynı soruyu sorar.'
            : grade >= 4
              ? 'Eksik parçayı ileri sayarak ya da bütünden çıkararak bulabilirsin; eşit parçalarda ise ? × 4 = 48 ile 48 ÷ 4 = ? aynı eksik parçayı sorar.'
              : 'Eksik parçayı bütüne kadar ileri zıplayarak bulmak ile bütünden çıkarmak aynı ilişkiyi anlatır: 35 + 17 = 52 ise 52 − 35 = 17.',
      })
      return
    }
    S.next()
  }

  return (
    <TaskView
      key={`${S.idx}-${run}`}
      grade={grade}
      level={L}
      S={S}
      N={N}
      total={levels.length}
      onNext={next}
      onReset={() => {
        N.clear()
        setRun((r) => r + 1)
      }}
      onEquation={() => eqCount.current++}
    />
  )
}

type Phase = 'combine' | 'model' | 'value' | 'equation' | 'fill' | 'done'

function TaskView({ grade, level: L, S, N, total, onNext, onReset, onEquation }: { grade: Grade; level: Level; S: ReturnType<typeof useSession>; N: ReturnType<typeof useNudge>; total: number; onNext: () => void; onReset: () => void; onEquation: () => void }) {
  const big = grade <= 3
  const isTape = L.kind !== 'cup' && L.kind !== 'equal'
  const [phase, setPhase] = useState<Phase>(L.kind === 'three' ? 'combine' : 'model')
  const [added, setAdded] = useState(0) // cup
  const [jumps, setJumps] = useState<number[]>([])
  const [part, setPart] = useState(0) // equal
  const [entry, setEntry] = useState('')
  const [hintI, setHintI] = useState(0)
  const [eqReset, setEqReset] = useState(0)
  const sol = useSolutions()
  const [boxRef, boxW] = useBoxWidth<HTMLDivElement>()
  const tool = toolFor(L)
  const known = L.a + (L.c ?? 0)
  const start = L.kind === 'three' ? known : L.a
  const built = jumps.reduce((x, y) => x + y, 0)
  const nb = (q: string, misc?: string, withTool = false) => N.show(q, { misc, ...(withTool ? tool : {}) })
  const ok = (q: string) => N.show(q, { tone: 'ok' })

  /* ── model aşaması ── */
  const checkCup = () => {
    const tot = L.a + added
    if (tot === L.W) {
      S.attempt(true)
      ok(`Çerçevede ${L.W} sayaç oldu! Mavi sayaçlar bardağın altındakileri gösteriyor.`)
      setPhase('fill')
      return
    }
    S.attempt(false)
    if (tot < L.W) nb(`Toplam ${L.W} misket olmalı. Çerçevedeki sayaçları ${L.frame === 20 ? '10’luk çerçeveden başlayarak' : 'üst sıradaki 5’ten başlayarak'} say: ${L.W} oldu mu?`, undefined, true)
    else nb(`Çerçevede ${L.W}’den fazla sayaç olabilir mi? Fazla mavi sayaca dokunup çıkar.`.replace(`${L.W}’den`, ek(L.W, 'abl')), 'Bütünü aşacak kadar sayaç ekledi')
  }

  const jump = (v: number) => {
    const nextBuilt = built + v
    setJumps((j) => [...j, v])
    const target = L.kind === 'first' ? L.W - L.a : L.W - known
    if (nextBuilt === target) {
      S.attempt(true)
      ok(`Tam ${ek(L.W, 'dat')} ulaştın! Şimdi zıplamalarına bak: eksik parça kaç?`)
      setPhase(L.kind === 'three' ? 'fill' : 'value')
    } else if (nextBuilt > target) {
      nb(`Bayrağı geçtin: ${tr(start + nextBuilt)} > ${tr(L.W)}. Son zıplamayı geri al. Daha küçük bir zıplama işine yarar mı?`)
    } else N.clear()
  }
  const undo = () => {
    setJumps((j) => j.slice(0, -1))
    N.clear()
  }

  const setP = (v: number) => {
    const p = Math.max(0, Math.min(Math.ceil(L.W / L.a) + 5, v))
    setPart(p)
    if (p * L.a === L.W) {
      S.attempt(true)
      ok(`${L.a} eşit parça bütünü tam doldurdu! Her parça ${p}.`)
      setPhase('equation')
    } else N.clear()
  }

  /* ── sayı girişi ── */
  const submitValue = () => {
    const v = parseNum(entry)
    setEntry('')
    if (v === L.b) {
      S.attempt(true)
      if (phase === 'value') {
        ok(L.kind === 'compare' ? `Fark ${tr(L.b)}! Şimdi bunu eşitliklerle yaz.` : `Eksik parça ${tr(L.b)}! Şimdi bunu eşitliklerle yaz.`)
        setPhase('equation')
      } else finish()
      return
    }
    S.attempt(false)
    if (phase === 'value') {
      const merged = jumps.length
      if (v === L.W) nb(`${tr(L.W)} bütünün tamamı. Eksik parça bütünden küçük olmalı, değil mi? Turuncu zıplamaları topla.`, 'Eksik parça yerine bütünü yazdı')
      else if (v === L.W + L.a) nb(`Parça, bütünden büyük olabilir mi? Bütün ${tr(L.W)}. Yalnızca turuncu zıplamaları topla.`, 'Bütün ile parçayı topladı (anahtar kelimeye göre işlem)')
      else if (v === merged) nb('Zıplamaların sayısını değil, büyüklüklerini topla. Her yayın üstünde ne yazıyor?', 'Zıplamaların sayısını eksik parça sandı')
      else nb(`Henüz değil. Yayların üstündeki sayıları topla. ${tr(start)}’den ${tr(L.W)}’ye ne kadar zıpladın?`.replace(`${tr(start)}’den`, ek(start, 'abl')).replace(`${tr(L.W)}’ye`, ek(L.W, 'dat')), undefined, true)
    } else if (phase === 'combine') {
      nb(`${L.a} ile ${L.c} birlikte kaç eder? Önce onlukları, sonra birlikleri topla.`)
    } else if (phase === 'fill') {
      if (v === L.W) nb(`${L.W} bütünün tamamı. Bardağın altındaki parça bütünden küçük olmalı, değil mi? Mavi sayaçları say.`, 'Eksik parça yerine bütünü yazdı', L.kind === 'cup')
      else if (v === L.a + L.W) nb('Parça, bütünden büyük olabilir mi? Mavi sayaçlara bak.', 'Bütün ile parçayı topladı')
      else if (L.kind === 'cup') nb(`Kaç mavi sayaç ekledin? Onları say: ${L.a}’ten sonra ileri say.`.replace(`${L.a}’ten`, ek(L.a, 'abl')), undefined, true)
      else nb(`${tr(known)}’den ${tr(L.W)}’ye kaç zıpladın? Turuncu yayları topla.`.replace(`${tr(known)}’den`, ek(known, 'abl')).replace(`${tr(L.W)}’ye`, ek(L.W, 'dat')))
    }
  }
  const submitCombine = () => {
    const v = parseNum(entry)
    setEntry('')
    if (v === known) {
      S.attempt(true)
      ok(`${L.a} + ${L.c} = ${known}. Şimdi ${ek(known, 'abl')} ${ek(L.W, 'dat')} zıpla!`)
      setPhase('model')
    } else {
      S.attempt(false)
      nb(`${L.a} ile ${L.c} birlikte kaç eder? Önce onlukları (${Math.floor(L.a / 10) * 10} + ${Math.floor((L.c ?? 0) / 10) * 10}), sonra birlikleri topla.`, v === L.W - L.a ? 'Bütünden bir parçayı çıkardı, ikinci parçayı unuttu' : undefined)
    }
  }

  const finish = () => {
    setPhase('done')
    S.complete()
  }

  /* ── eşitlik karoları ── */
  const mul = L.kind === 'equal'
  const tiles: Tile[] = useMemo(() => {
    const nums = mul ? [L.b, L.a, L.W] : [L.a, L.b, L.W]
    return [...shuffle(nums).map((v, i) => ({ id: `n${i}`, kind: 'num' as const, v })), ...(mul ? ['×', '÷'] : ['+', '−']).map((o) => ({ id: o, kind: 'op' as const, v: o }))]
  }, [L, mul])
  const forms = useRef({ add: false, sub: false })
  const onCheck = (x: number, op: string, y: number, z: number): 'ok' | 'dup' | 'bad' => {
    const val = op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : y ? x / y : NaN
    const key = `${x}${op}${y}=${z}`
    if (val === z) {
      S.attempt(true)
      const isNew = sol.add(key, `${tr(x)} ${op} ${tr(y)} = ${tr(z)}`)
      if (!isNew) {
        nb('Bu eşitliği zaten yazdın. Sayıların yerini değiştirerek başka bir eşitlik dene.')
        return 'dup'
      }
      onEquation()
      const inverse = op === '−' || op === '÷'
      if (inverse) forms.current.sub = true
      else forms.current.add = true
      if (forms.current.add && forms.current.sub) {
        ok(mul ? 'Çarpma ve bölme aynı ilişkiyi anlatıyor!' : 'Toplama ve çıkarma aynı parça-bütün ilişkisini anlatıyor!')
        setTimeout(finish, 600)
      } else {
        ok(inverse ? `Harika! Şimdi aynı ilişkiyi bir ${mul ? 'çarpma' : 'toplama'} eşitliğiyle yaz.` : `Harika! Şimdi aynı ilişkiyi bir ${mul ? 'bölme' : 'çıkarma'} eşitliğiyle yaz.`)
      }
      return 'ok'
    }
    S.attempt(false)
    if (!mul) {
      if (op === '+' && z !== L.W) nb(`Parçaların toplamı bütünden büyük olabilir mi? ${tr(L.W)} bütün; eşittirin hangi yanında olmalı?`, 'Bütünü toplamada parça gibi kullandı (anahtar kelimeye göre işlem seçti)')
      else if (op === '−' && x !== L.W) nb(`Çıkarmada bütünden bir parçayı ayırırız. Hangi sayı bütün? Eşitliğe onunla başla.`, x < y ? 'Çıkarmada küçük sayıdan büyük sayıyı çıkarmaya çalıştı' : 'Çıkarmada bütün yerine parçadan başladı')
      else nb(`${tr(x)} ${op} ${tr(y)} kaç eder? Modeldeki parçalara bak.`)
    } else {
      if (op === '×' && z !== L.W) nb(`${L.a} eşit parçanın hepsi birlikte bütünü yapar. Bütün olan ${tr(L.W)} eşittirin hangi yanında olmalı?`, 'Çarpmada bütünü çarpan gibi kullandı')
      else if (op === '÷' && x !== L.W) nb('Bölmede bütünü eşit parçalara ayırırız. Hangi sayı bütün? Eşitliğe onunla başla.', 'Bölmede bütün yerine parçadan başladı')
      else nb(`${tr(x)} ${op} ${tr(y)} kaç eder? Şeritteki parçalara bak.`)
    }
    return 'bad'
  }

  /* ── ipuçları ── */
  const hints: Record<Phase, string[]> = {
    combine: [`Önce bilinen iki parçayı birleştir: ${L.a} + ${L.c ?? 0} kaç eder?`, 'Onlukları ve birlikleri ayrı ayrı topla.'],
    model:
      L.kind === 'cup'
        ? [`${ek(L.a, 'abl')} başlayarak ileri say: ${L.a + 1}, ${L.a + 2}, … ${ek(L.W, 'dat')} ulaşınca dur.`, L.frame === 20 ? 'Önce ilk çerçeveyi 10’a tamamla. Sonra kaç tane daha gerekir?' : 'Üst sıra 5. Alt sırada kaç sayaç olursa toplam istediğin sayı olur?']
        : L.kind === 'equal'
          ? [`Her parça 10 olsa ${L.a} parça kaç eder? ${tr(L.W)} için daha büyük mü, daha küçük mü olmalı?`, `${L.a} kere hangi sayı ${tr(L.W)} eder? Çarpım tablosunu düşün.`]
          : [`${ek(start, 'abl')} sonraki onluğa kaç adım var? Önce oraya zıpla.`, `Büyük zıplamalar işini hızlandırır: ${ek(L.W, 'dat')} yaklaşmak için +${L.W - start >= 1000 ? '1000' : L.W - start >= 100 ? '100' : '10'} dene.`],
    value: ['Yayların üstündeki sayıları topla.', `Örneğin önce büyük zıplamaları, sonra küçükleri topla.`],
    equation: [mul ? `Bütün ${tr(L.W)}. Hangi iki sayıyı çarpınca bütün olur?` : `Bütün ${tr(L.W)}. Parçalar ${tr(L.a)} ve ${tr(L.b)}. Parça + parça = bütün.`, mul ? 'Bölmede bütünden başla: bütün ÷ parça sayısı.' : 'Çıkarmada bütünden başla: bütün − bir parça = öteki parça.'],
    fill: L.kind === 'cup' ? ['Mavi sayaçları say: bardağın altındakileri onlar gösteriyor.', `${L.a} ile hangi sayı ${L.W} eder?`] : ['Turuncu zıplamaları topla.', `${tr(known)} ile hangi sayı ${tr(L.W)} eder?`],
    done: [],
  }
  const hint = () => {
    const list = hints[phase]
    if (!list.length) return
    S.hint()
    N.show(list[Math.min(hintI, list.length - 1)], hintI >= 1 ? tool : undefined)
    setHintI((i) => i + 1)
  }

  /* ── Görünüm ── */
  const jumpSizes = grade <= 2 ? [10, 1] : grade === 3 ? [100, 10, 1] : [1000, 100, 10, 1]
  const target = L.kind === 'first' ? L.W - L.a : L.W - known

  const model =
    L.kind === 'cup' ? (
      <div className="flex flex-col gap-4">
        <CupStage W={L.W} a={L.a} b={L.b} lifted={phase === 'done'} big={big} />
        <FrameBuilder a={L.a} added={added} size={L.frame ?? 10} onAdd={() => { N.clear(); setAdded((n) => Math.min((L.frame ?? 10) - L.a, n + 1)) }} onRemove={() => { N.clear(); setAdded((n) => Math.max(0, n - 1)) }} locked={phase !== 'model'} big={big} />
        {phase === 'model' && (
          <button type="button" onClick={checkCup} disabled={added === 0} className="btn-primary mx-auto min-h-14 min-w-56 text-lg">
            Toplam {L.W} oldu mu? Kontrol et
          </button>
        )}
        {phase !== 'model' && <NumberBond W={L.W} a={L.a} b={L.b} showB={phase === 'done'} />}
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        <ZoomBox controls={false}>
          <div ref={boxRef} className="rounded-2xl bg-white/80 p-2 ring-1 ring-line">
            <TapeModel width={boxW} kind={L.kind as TapeKind} W={L.W} a={L.a} c={L.c} k={L.a} built={L.kind === 'equal' ? part : built} showB={phase === 'equation' || phase === 'done'} names={L.names} unit={L.unit} />
            {isTape && phase !== 'combine' && <JumpLine width={boxW} start={start} goal={L.W} jumps={jumps} />}
          </div>
        </ZoomBox>
        {isTape && phase === 'model' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {jumpSizes.map((v) => (
              <button key={v} type="button" onClick={() => jump(v)} disabled={built > target} className={`${big ? 'min-h-16 min-w-20 text-2xl' : 'min-h-14 min-w-18 text-xl'} rounded-2xl px-4 font-black text-ink shadow-[0_4px_0_rgb(0_0_0/0.18)] ring-2 ring-ink/20 transition active:translate-y-[2px] disabled:opacity-40`} style={{ background: jumpColor(v) }}>
                +{tr(v)}
              </button>
            ))}
            <button type="button" onClick={undo} disabled={!jumps.length} className={`btn-ghost ${big ? 'min-h-16' : 'min-h-14'} px-4`} aria-label="Son zıplamayı geri al">
              <Undo2 size={20} />Geri al
            </button>
          </div>
        )}
        {L.kind === 'equal' && phase === 'model' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[-5, -1].map((d) => (
              <button key={d} type="button" onClick={() => setP(part + d)} disabled={part + d < 0} className={`btn-ghost ${big ? 'min-h-16 min-w-16' : 'min-h-14 min-w-14'} text-xl`}>{d === -1 ? '−1' : '−5'}</button>
            ))}
            <span className="grid min-h-16 min-w-28 place-items-center rounded-2xl bg-orange-100 px-3 text-center ring-2 ring-orange-300">
              <span className="text-xs font-black text-orange-800">bir parça</span>
              <span className="text-3xl leading-none font-black text-orange-900">{part}</span>
            </span>
            {[1, 5].map((d) => (
              <button key={d} type="button" onClick={() => setP(part + d)} className={`btn-ghost ${big ? 'min-h-16 min-w-16' : 'min-h-14 min-w-14'} text-xl`}>+{d}</button>
            ))}
          </div>
        )}
        {phase === 'equation' && (
          <>
            <p className="text-center text-base font-black">{mul ? 'Bir çarpma ve bir bölme eşitliği kur.' : 'Bir toplama ve bir çıkarma eşitliği kur.'}</p>
            <EquationBuilder tiles={tiles} onCheck={onCheck} big={big} resetSignal={eqReset} />
          </>
        )}
      </div>
    )

  const eqPanel = (label: string, before: string, after: string, onSubmit: () => void) => (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <p className="mb-2 text-base font-black">{label}</p>
      <p className="mb-3 flex flex-wrap items-center justify-center gap-x-2 text-center text-3xl font-black tracking-wide" aria-live="polite">
        {before.trim() && <span>{before.trim()}</span>}
        <span className="inline-grid min-h-14 min-w-20 place-items-center rounded-xl border-[3px] border-dashed border-brand bg-brand-soft px-2 text-brand-ink">{entry || '?'}</span>
        {after.trim() && <span>{after.trim()}</span>}
      </p>
      <NumPad value={entry} onChange={setEntry} onSubmit={onSubmit} big={big} maxLen={5} submitLabel="Tamam" />
    </div>
  )

  let panel = null
  if (phase === 'combine') panel = eqPanel('Önce bilinen iki parçayı birleştir.', `${L.a} + ${L.c} = `, '', submitCombine)
  else if (phase === 'value') panel = eqPanel(L.kind === 'compare' ? 'Fark kaç? Zıplamalarına bak.' : 'Eksik parça kaç? Zıplamalarına bak.', L.kind === 'compare' ? 'fark = ' : 'eksik parça = ', '', submitValue)
  else if (phase === 'fill')
    panel =
      L.kind === 'cup'
        ? eqPanel('Eşitliği tamamla.', L.sub ? `${L.W} − ${L.a} = ` : `${L.a} + `, L.sub ? '' : ` = ${L.W}`, submitValue)
        : eqPanel('Eşitliği tamamla.', `${L.a} + ${L.c} + `, ` = ${L.W}`, submitValue)

  const strategyOpts = mul ? STRATS_MUL : STRATS_ADD
  const doneBox = (
    <DoneNote
      title={L.kind === 'cup' ? `Bardağın altında ${L.b} misket varmış!` : L.kind === 'compare' ? `Fark ${tr(L.b)}!` : `Eksik parça ${tr(L.b)}!`}
      note={
        L.kind === 'cup' ? (
          <span>{L.a} + {L.b} = {L.W} &nbsp;ve&nbsp; {L.W} − {L.a} = {L.b}</span>
        ) : mul ? (
          <span>{tr(L.b)} × {L.a} = {tr(L.W)} &nbsp;ve&nbsp; {tr(L.W)} ÷ {L.a} = {tr(L.b)}</span>
        ) : L.kind === 'three' ? (
          <span>{L.a} + {L.c} + {L.b} = {L.W} &nbsp;ve&nbsp; {L.W} − {L.a} − {L.c} = {L.b}</span>
        ) : (
          <span>{tr(L.a)} + {tr(L.b)} = {tr(L.W)} &nbsp;ve&nbsp; {tr(L.W)} − {tr(L.a)} = {tr(L.b)}</span>
        )
      }
    >
      <StrategyPicker options={strategyOpts} onPick={() => undefined} />
    </DoneNote>
  )

  const phaseNote: Partial<Record<Phase, string>> = {
    combine: 'Adım 1: bilinen parçaları birleştir',
    model: L.kind === 'cup' ? 'Adım 1: eksik parçayı çerçevede modelle' : L.kind === 'equal' ? 'Adım 1: bir parçanın büyüklüğünü ayarla' : `Adım 1: ${ek(start, 'abl')} bayrağa (${tr(L.W)}) zıpla`,
    value: 'Adım 2: eksik parçayı bul',
    fill: L.kind === 'cup' ? 'Adım 2: eşitliği yaz, sonra bardağı kaldır' : 'Adım 3: eşitliği yaz',
    equation: 'Adım 3: eşitlikleri kur',
  }

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={total}
      title={L.title}
      prompt={L.prompt}
      nudge={N.nudge}
      onCloseNudge={N.clear}
      done={phase === 'done'}
      doneBox={doneBox}
      onNext={onNext}
      onHint={phase === 'done' ? undefined : hint}
      onReset={() => {
        setEqReset((r) => r + 1)
        onReset()
      }}
      panel={
        <>
          {phase !== 'done' && phaseNote[phase] && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-900 ring-1 ring-sky-200">{phaseNote[phase]}</p>}
          {panel}
          {phase === 'equation' || (phase === 'done' && sol.list.length) ? <SolutionList list={sol.list} goal={2} /> : null}
        </>
      }
    >
      <div data-ep={`${L.kind},${L.W},${L.a},${L.c ?? 0},${L.b}`}>{model}</div>
    </ActivityLayout>
  )
}
