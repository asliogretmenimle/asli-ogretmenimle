import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Flag, Hammer, Lightbulb } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, TaskCard, useSolutions } from '../../kit2'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { useTracker } from '../../../lib/trackerContext'
import { celebrate, sfx } from '../../../lib/feedback'
import { ek } from '../../../lib/generators'
import type { ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { IslandScene } from './IslandScene'
import { Base10Raft, b10Parts, ClearButton, CORAL, EquationRow, FrameRaft, PlankBank, StepperPlank, TEAL, type B10, type Token } from './builders'
import { buildLevels, keyOf, strategiesOf, type Level } from './levels'

/**
 * Sayı Adaları (1–2. sınıf) — parça-parça-bütün.
 * Hedef adaya köprü kurmak için hedef sayı farklı yollarla oluşturulur: her yeni ayrıştırma köprüye bir tahta ekler.
 * Somut (küpler, onluk çerçeve / onluk-birlik) → görsel (noktalı tahtalar) → sembolik (eşitlik, kayıp parça) → açık uçlu.
 */

type NudgeState = { question: string; tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; misconception?: string; tone?: 'think' | 'ok' }
type Found = { label: string; key: string; parts: number[]; fresh?: boolean }
type Phase = 'build' | 'walk' | 'arrived'

/** Dar panelde Nudge metni düğmelerin yanında ezilmesin: metin satırı tam genişlik, düğmeler alt satıra */
const NUDGE_WRAP = '[&>div:has(>div>button+button)>p]:basis-[calc(100%-3rem)] [&>div>div]:ml-auto'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const evalRight = (right: string, v: number) => sum(right.replace('?', String(v)).split('+').map((s) => Number(s.trim())))

function instruction(L: Level, si: number, grade: number) {
  const T = L.target
  switch (L.kind) {
    case 'blocks':
      return grade <= 1
        ? `${T} adasına köprü kur! Mercan ve deniz küplerini sala koy; iki renk birlikte ${T} etsin. ${L.goal} farklı yol bul.`
        : `${T} adasına köprü kur! Onluk ve birlikleri iki renge ayır; ikisi birlikte ${T} etsin. ${L.goal} farklı yol bul.`
    case 'planks':
      return `Köprüye iki tahta koy: birlikte ${T} etsinler. ${L.goal} farklı yol bul.`
    case 'equal':
      return `Köprü dengede durmalı: eşittir işaretinin iki yanı aynı değerde olsun. Kayıp tahta kaç? (${si + 1}/${L.goal})`
    case 'missing':
      return `Bütün: ${L.tasks![si].left}. Bir parça hazır. Kayıp tahtayı bul! (${si + 1}/${L.goal})`
    case 'open':
      return `${T} sayısını kaç farklı yolla oluşturabilirsin? İki ya da üç tahta kullan. En az ${L.goal} yol bul, sonra istersen devam et!`
  }
}

function hintFor(L: Level, si: number, grade: number) {
  switch (L.kind) {
    case 'blocks':
      return grade <= 1 ? 'Bir mercan küpü deniz küpüne çevirsen toplam değişir mi? Önce bir çerçeveyi tam 10 yapmayı dene.' : 'Onluk sayısını değiştir: bir onluğu öbür renge versen toplam değişir mi? Birlikleri de bölüştürebilirsin.'
    case 'planks':
    case 'open':
      return 'Bir tahtayı 1 büyütürsen öbürünü ne yapmalısın ki toplam aynı kalsın? 5 ve 10 iyi başlangıçlardır.'
    case 'equal':
      return 'Köprüyü bir terazi gibi düşün: iki kefe aynı ağırlıkta olmalı. Sol taraftan sağ tarafa ne verildi, ne kaldı?'
    case 'missing': {
      const t = L.tasks![si]
      const known = Number(t.right.replace('?', '').replace('+', '').trim())
      const next = Math.ceil((known + 1) / 10) * 10
      return `${ek(known, 'abl')} ${ek(Number(t.left), 'dat')} zıplamayı düşün. Önce ${ek(next, 'dat')} kaç adım var?`
    }
  }
}

export default function SayiAdalari({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => buildLevels(grade), [grade])
  const track = useTracker()
  const sol = useSolutions()
  const g1 = grade <= 1

  const [li, setLi] = useState(0)
  const L = levels[li]
  const [si, setSi] = useState(0)
  const [found, setFound] = useState<Found[]>([])
  const [phase, setPhase] = useState<Phase>('build')
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [missLevel, setMissLevel] = useState(false)
  const [missSub, setMissSub] = useState(false)

  const [fr, setFr] = useState({ r: 0, b: 0 })
  const [b10, setB10] = useState<B10>({ rt: 0, ru: 0, bt: 0, bu: 0 })
  const nSlots = L.kind === 'equal' || L.kind === 'missing' ? 1 : (L.maxParts ?? 2)
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(nSlots).fill(null))
  const [steps, setSteps] = useState<number[]>(() => Array(nSlots).fill(0))

  const stats = useRef({ items: 0, first: 0, ways: 0, bonus: 0, openLabels: [] as string[], strategies: new Set<string>(), commutSeen: false })
  const levelStrats = useRef(new Set<string>())
  const walkTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(walkTimer.current), [])

  const tool: Pick<NudgeState, 'tool' | 'toolConfig'> = g1 ? { tool: 'tenframe', toolConfig: { frames: 2 } } : { tool: 'base10' }
  const task = L.tasks?.[si]
  const T = L.kind === 'missing' ? Number(task!.left) : L.target
  const sign = task ? task.sign : String(L.target)

  const resetBuilders = (n = nSlots) => {
    setFr({ r: 0, b: 0 })
    setB10({ rt: 0, ru: 0, bt: 0, bu: 0 })
    setSlots(Array(n).fill(null))
    setSteps(Array(n).fill(0))
  }

  const strat = (name: string) => {
    if (levelStrats.current.has(name)) return
    levelStrats.current.add(name)
    stats.current.strategies.add(name)
    track.strategy(name)
  }

  const complete = (miss: boolean) => {
    if (L.kind !== 'equal' && L.kind !== 'missing') {
      track.item(!miss)
      stats.current.items++
      if (!miss) stats.current.first++
    }
    sfx.win()
    celebrate(false)
    setPhase('walk')
    walkTimer.current = window.setTimeout(() => setPhase('arrived'), 2700)
  }

  /* ───────── çoklu çözüm denetimi (bloklar, tahtalar, açık uçlu) ───────── */
  const checkWays = (raw: number[], ordered: number[]) => {
    const p = raw.filter((x) => x > 0)
    if (p.length < 2) {
      setNudge({ question: L.kind === 'blocks' ? 'Köprü iki parçadan oluşsun: iki rengi de kullan. Hangi renkten kaç tane olsun?' : 'En az iki tahta gerekiyor. Sayıyı parçalara ayır!' })
      return
    }
    const s = sum(p)
    if (s !== T) {
      track.attempt(false)
      setMissLevel(true)
      const short = s < T
      if (L.kind === 'blocks') {
        const what = g1 ? 'küp' : 'blok'
        setNudge({
          question: short
            ? `Salda ${s} ${what} var; ada ise ${T}. Adaya ulaşmak için kaç ${what} daha gerekir? ${g1 ? 'Boş karelere bak.' : 'Önce onluklara bak.'}`
            : `Salda ${s} ${what} var; ada ise ${T}. Köprü adayı geçti! Hangi renkten ${what} çıkarırsın?`,
          ...tool,
        })
      } else {
        setNudge({ question: `Tahtalarını topla: ${T} ediyor mu? Köprü biraz ${short ? 'kısa' : 'uzun'} kaldı. Hangi tahtayı ${short ? 'büyütürsün' : 'küçültürsün'}?`, ...tool })
      }
      return
    }
    track.attempt(true)
    const key = keyOf(p)
    const label = ordered.filter((x) => x > 0).join(' + ')
    const old = found.find((f) => f.key === key)
    if (old) {
      if (old.label !== label && !stats.current.commutSeen) {
        stats.current.commutSeen = true
        strat('Değişme özelliği')
      }
      setNudge({
        tone: 'think',
        question: old.label !== label
          ? `${old.label} ile ${label} aynı parçalar, sadece yer değiştirdiler; toplam yine ${T}! Bambaşka parçalar bulabilir misin?`
          : `Bu köprüyü zaten kurdun: ${label}. Bir parçayı 1 büyütüp öbürünü 1 küçültsen ne olur?`,
      })
      return
    }
    let shown = label
    if (L.kind === 'blocks' && g1 && p.length === 2 && p.every((x) => x < 10) && s > 10) shown = `${label} = 10 + ${s - 10}`
    const isNew = sol.add(`${li}:${key}`, shown)
    void isNew
    strategiesOf(p, grade).forEach(strat)
    // örüntü: bir parça 1 artarken öteki 1 azaldı
    const prev = found[found.length - 1]
    let msg = ''
    if (prev && prev.parts.length === 2 && ordered.length >= 2 && p.length === 2) {
      const [a, b] = prev.parts
      const [c, d] = ordered.filter((x) => x > 0)
      if (Math.abs(a - c) === Math.abs(b - d) && a - c === d - b && a !== c) {
        msg = `Bir parça ${Math.abs(a - c)} ${a > c ? 'azaldı' : 'arttı'}, öteki ${Math.abs(a - c)} ${a > c ? 'arttı' : 'azaldı'}: toplam yine ${T}!`
        strat('Bir artır, bir azalt (telafi)')
      }
    }
    const next: Found[] = [...found.map((f) => ({ ...f, fresh: false })), { label: shown, key, parts: ordered.filter((x) => x > 0), fresh: true }]
    setFound(next)
    stats.current.ways++
    if (L.kind === 'open') stats.current.openLabels.push(shown)
    if (next.length > L.goal) stats.current.bonus++
    const left = L.goal - next.length
    setNudge({ tone: 'ok', question: `${msg ? msg + ' ' : ''}Yeni tahta: ${shown}.${left > 0 ? ` ${left} tahta daha!` : next.length === L.goal ? ' Köprü tamam!' : ' Harika, bir yol daha!'}` })
    if (next.length === L.goal) complete(missLevel)
    if (L.kind === 'planks' || L.kind === 'open') resetBuilders()
  }

  /* ───────── tek cevaplı alt görevler (eşitlik, kayıp parça) ───────── */
  const checkSub = (v: number | null) => {
    const t = task!
    if (v === null || v === undefined || (L.input === 'stepper' && v === 0 && t.answer !== 0)) {
      setNudge({ question: 'Önce “?” yerine bir tahta koy.' })
      return
    }
    if (v === t.answer) {
      track.attempt(true)
      track.item(!missSub)
      stats.current.items++
      if (!missSub) stats.current.first++
      strat(t.strategy)
      const label = t.right.replace('?', String(v))
      const next: Found[] = [...found.map((f) => ({ ...f, fresh: false })), { label, key: String(si), parts: [v], fresh: true }]
      setFound(next)
      sfx.ok()
      setMissSub(false)
      if (si + 1 >= L.goal) {
        setNudge({ tone: 'ok', question: `${t.left} = ${label}. Köprü tamam!` })
        complete(false)
      } else {
        setNudge({ tone: 'ok', question: `Evet! ${t.left} = ${label}. Sıradaki köprü…` })
        setSi(si + 1)
        resetBuilders(1)
      }
      return
    }
    track.attempt(false)
    setMissSub(true)
    sfx.bad()
    const rv = evalRight(t.right, v)
    if (L.kind === 'equal') {
      const lv = evalRight(t.left, 0)
      setNudge(
        v === t.trap
          ? { question: `Eşittir işareti “iki taraf aynı değerde” demek. ${t.right.replace('?', String(v))}, ${t.left} ile aynı mı?`, misconception: `Eşittir işaretini “sonucu yaz” olarak yorumladı (${t.left} = ${t.right.replace('?', String(v))})`, ...tool }
          : { question: `Sol taraf ${t.left}, sağ taraf ${t.right.replace('?', String(v))}. Köprü dengede mi? Sağ taraf biraz ${rv < lv ? 'hafif' : 'ağır'} kaldı.`, ...tool },
      )
    } else {
      const known = Number(t.right.replace('?', '').replace('+', '').trim())
      setNudge(
        v === t.trap
          ? { question: `Bütün ${t.left}, parçalardan biri ${known}. Öbür parça bütünden büyük olabilir mi?`, misconception: 'Eksik parçayı bulmak yerine verilen sayıları topladı', ...tool }
          : { question: `${known} + ${v} adaya ulaşıyor mu? ${rv < Number(t.left) ? 'Biraz kısa kaldı.' : 'Biraz uzun oldu.'} ${ek(known, 'abl')} ${ek(Number(t.left), 'dat')} kaç adım var?`, ...tool },
      )
    }
  }

  const onCheck = () => {
    setHintOpen(false)
    if (L.kind === 'blocks') {
      if (L.model === 'frame') checkWays([fr.r, fr.b], [fr.r, fr.b])
      else checkWays(b10Parts(b10), b10Parts(b10))
    } else if (L.kind === 'planks' || L.kind === 'open') {
      const vals = L.input === 'stepper' ? steps : slots.map((x) => x ?? 0)
      checkWays(vals, vals)
    } else {
      checkSub(L.input === 'stepper' ? steps[0] : slots[0])
    }
  }

  const nextLevel = () => {
    window.clearTimeout(walkTimer.current)
    if (li + 1 >= levels.length) return finish()
    const nl = levels[li + 1]
    const n = nl.kind === 'equal' || nl.kind === 'missing' ? 1 : (nl.maxParts ?? 2)
    setLi(li + 1)
    setSi(0)
    setFound([])
    setPhase('build')
    setNudge(null)
    setHintOpen(false)
    setMissLevel(false)
    setMissSub(false)
    levelStrats.current = new Set()
    resetBuilders(n)
  }

  const finish = () => {
    const s = stats.current
    const ratio = s.items ? s.first / s.items : 1
    let stars = starsFor(ratio)
    if (s.bonus >= 2 && stars < 3) stars = (stars + 1) as 1 | 2 | 3
    const openT = levels[levels.length - 1].target
    const ex = s.openLabels.slice(0, 3).join(', ')
    onFinish({
      stars,
      score: s.ways * 10 + s.first * 5 + s.bonus * 5,
      summary: `${levels.length} adaya köprü kurdun ve ${s.ways} farklı ayrıştırma buldun.`,
      insight: s.openLabels.length
        ? `${openT} sayısını ${s.openLabels.length} farklı yolla oluşturdun (${ex}${s.openLabels.length > 3 ? '…' : ''}). Bir sayı pek çok farklı parçaya ayrılabilir; 5 ve 10 gibi çapalar parçaları görmeyi kolaylaştırır.`
        : 'Bir sayı pek çok farklı parçaya ayrılabilir; 5 ve 10 gibi çapalar parçaları görmeyi kolaylaştırır.',
    })
  }

  /* ───────── tahta yuvaları ───────── */
  const fillFirst = (v: number) => {
    const i = slots.findIndex((x) => x === null)
    const k = i === -1 ? slots.length - 1 : i
    setSlots(slots.map((x, j) => (j === k ? v : x)))
    setNudge(null)
  }
  const tokens: Token[] = useMemo(() => {
    if (L.kind === 'equal' || L.kind === 'missing') {
      const t = L.tasks![si]
      const [a, b] = t.right.split('?')
      const out: Token[] = [t.left, '=']
      if (a.trim()) out.push(a.trim())
      out.push({ slot: 0 })
      if (b.trim()) out.push(b.trim())
      return out
    }
    const out: Token[] = []
    for (let i = 0; i < nSlots; i++) {
      if (i) out.push('+')
      out.push({ slot: i })
    }
    out.push('=', String(L.target))
    return out
  }, [L, si, nSlots])

  const building = phase === 'build' || L.kind === 'open'
  const sideTotal = (s: 'r' | 'b') => (L.model === 'frame' ? (s === 'r' ? fr.r : fr.b) : b10Parts(b10)[s === 'r' ? 0 : 1])
  const fullMsg = () => setNudge({ question: g1 ? 'Sal doldu! Biraz küp çıkarıp yeniden dene.' : 'Sal en fazla 100 taşıyabilir. Biraz blok çıkar.' })

  return (
    <Scene grade={grade} className="!p-2 sm:!p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        {/* görev */}
        <header className="lg:col-start-2 lg:row-start-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <LevelDots current={li} total={levels.length} />
            <span className="flex items-center gap-1.5">
              <span className="chip bg-sky-100 px-2.5 py-1 text-xs text-sky-800 ring-1 ring-sky-200">{L.stage}</span>
              <span className="chip bg-white px-2.5 py-1 text-xs text-ink ring-1 ring-line">Ada {li + 1}/{levels.length}</span>
            </span>
          </div>
          <TaskCard step={li + 1} total={levels.length}>
            <span className="block text-xs font-black tracking-wide text-sky-700 uppercase">{L.title}</span>
            <span className="mt-0.5 block">{instruction(L, si, grade)}</span>
          </TaskCard>
        </header>

        {/* sahne + yapım alanı */}
        <section className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <ZoomBox className="overflow-hidden rounded-3xl shadow-[0_6px_24px_rgba(3,105,161,.18)] ring-1 ring-sky-200">
            <IslandScene sign={sign} goal={L.goal} planks={found} walking={phase === 'walk'} arrived={phase === 'arrived'} variant={li} from={li === 0 ? 'Başla' : levels[li - 1].tasks ? '✓' : String(levels[li - 1].target)} />
          </ZoomBox>

          <div className={`mt-3 rounded-3xl bg-white/75 p-3 ring-1 ring-line backdrop-blur sm:p-4 ${building ? '' : 'pointer-events-none opacity-60'}`} aria-disabled={!building}>
            {L.kind === 'blocks' && (
              <>
                <p className="mb-3 flex flex-wrap items-center justify-center gap-2 text-3xl font-black tabular-nums sm:text-4xl" aria-live="polite">
                  <span className="min-w-12 rounded-2xl px-3 text-center text-white" style={{ background: CORAL.fill }}>{sideTotal('r')}</span>
                  <span className="text-slate-500">+</span>
                  <span className="min-w-12 rounded-2xl px-3 text-center text-white" style={{ background: TEAL.fill }}>{sideTotal('b')}</span>
                  <span className="text-slate-500">=</span>
                  <span className="flex items-center gap-1 rounded-2xl border-[3px] border-dashed border-sky-400 bg-sky-50 px-3 text-sky-700" aria-label={`Hedef ada ${T}`}><Flag size={22} />{T}</span>
                </p>
                {L.model === 'frame' ? (
                  <FrameRaft red={fr.r} blue={fr.b} cap={L.target > 10 ? 20 : 10} rods={L.rods} onChange={(r, b) => { setFr({ r, b }); setNudge(null) }} onFull={fullMsg} />
                ) : (
                  <Base10Raft v={b10} onChange={(v) => { setB10(v); setNudge(null) }} onFull={fullMsg} />
                )}
                <p className="mt-2 text-center text-xs font-bold text-ink-soft">Küpleri sala sürükle ya da dokun. Saldaki bir parçaya dokunursan geri alırsın.</p>
              </>
            )}

            {L.kind !== 'blocks' && (
              <>
                <EquationRow
                  tokens={tokens}
                  slots={slots}
                  dots={L.dots}
                  onClear={(i) => setSlots(slots.map((x, j) => (j === i ? null : x)))}
                  renderSlot={L.input === 'stepper' ? (i) => <StepperPlank value={steps[i]} label={`${i + 1}. tahta`} max={100} onChange={(v) => { setSteps(steps.map((x, j) => (j === i ? v : x))); setNudge(null) }} /> : undefined}
                />
                {L.input === 'bank' && (
                  <PlankBank bank={L.bank!} dots={L.dots} onPick={fillFirst} onDropTo={(i, v) => { setSlots(slots.map((x, j) => (j === i ? v : x))); setNudge(null) }} />
                )}
                {L.kind === 'open' && <p className="mt-2 text-center text-xs font-bold text-ink-soft">Üçüncü tahta isteğe bağlı: boş bırakabilirsin.</p>}
              </>
            )}
          </div>
        </section>

        {/* eylemler ve geri bildirim */}
        <aside className="lg:col-start-2 lg:row-start-2">
          <div className="flex flex-wrap gap-2">
            {building && (
              <BigButton onClick={onCheck} className="flex-1">
                <Hammer size={20} />Köprüye ekle
              </BigButton>
            )}
            {building && (L.kind === 'blocks' || L.input === 'bank' || L.input === 'stepper') && <ClearButton onClick={() => { resetBuilders(); setNudge(null) }} />}
            {building && (
              <button
                type="button"
                onClick={() => {
                  if (!hintOpen) track.hint()
                  setHintOpen(!hintOpen)
                }}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-amber-50 px-4 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200"
                aria-expanded={hintOpen}
              >
                <Lightbulb size={16} />İpucu
              </button>
            )}
          </div>
          <div className={NUDGE_WRAP}>
            {hintOpen && <Nudge question={hintFor(L, si, grade)} {...tool} onClose={() => setHintOpen(false)} />}
            {nudge && <Nudge key={nudge.question} {...nudge} onClose={() => setNudge(null)} />}
          </div>

          {(L.kind === 'blocks' || L.kind === 'planks' || L.kind === 'open') && (
            <SolutionList list={found.map((f) => ({ key: f.key, label: f.label }))} goal={L.goal} />
          )}

          {phase !== 'build' && (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200 animate-fade-up">
              <p className="mb-2 text-base font-black text-emerald-900">
                {phase === 'walk' ? 'Kaşif köprüden geçiyor…' : li + 1 >= levels.length ? 'Son adaya ulaştın!' : `${sign} adasına ulaştın!`}
              </p>
              {L.kind === 'open' && phase === 'arrived' && <p className="mb-2 text-sm font-bold text-emerald-800">İstersen yeni yollar bulmaya devam et; her yeni yol bir hazine!</p>}
              <BigButton onClick={nextLevel} className="w-full" disabled={phase === 'walk'}>
                {li + 1 >= levels.length ? <><Flag size={20} />Bitir</> : <>Sonraki ada<ArrowRight size={20} /></>}
              </BigButton>
            </div>
          )}
        </aside>
      </div>
    </Scene>
  )
}
