import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { ArrowRight, DoorOpen, KeyRound, Plus, RotateCcw, Trophy, Undo2 } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge as KitNudge, Scene, SolutionList as KitSolutionList, StrategyPicker, TaskCard, useAge, useSolutions } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { celebrate, sfx } from '../../../lib/feedback'
import { applyBoth, applySide, evalSide, fmt, fmtEq, fmtSide, isolated, num, opKey, opLabel, r, side, subst, suggest, valueAt, zero, type Eq, type Op, type R, type Side } from './algebra'
import { makeDoors, type Door, type RuleTerm } from './doors'
import { Balance } from './Balance'
import { Tiles } from './Tiles'
import { DungeonMap } from './Map'
import { RangeLine } from './RangeLine'

/**
 * Denklem Kapıları (6–8. sınıf)
 * Labirentteki her kapı bir denklemle kilitli. İşlem kartı kapıya bırakılınca iki kefeye de uygulanır;
 * tek kefeye bırakılırsa terazi bozulur (kavram yanılgısı yakalanır). Farklı geçerli çözüm yolları sayılır.
 * Üç temsil: terazi (somut) – cebir karoları (görsel) – denklem (sembolik).
 */

type Done = { first: boolean }
type SolApi = ReturnType<typeof useSolutions>
type Zone = 'L' | 'R' | 'both'

interface Ctx {
  door: Door
  idx: number
  grade: number
  dark: boolean
  sol: SolApi
  map: ReactNode
  onDone: (d: Done) => void
}

const CSS = `
@keyframes dk-flicker { 0%,100% { opacity: .7; transform: scale(1) } 40% { opacity: 1; transform: scale(1.1) } 70% { opacity: .85; transform: scale(.95) } }
.dk-flicker { animation: dk-flicker 1.3s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
@keyframes dk-pulse { 0% { opacity: 1; transform: scale(.8) } 100% { opacity: 0; transform: scale(1.5) } }
.dk-pulse { animation: dk-pulse 1.6s ease-out infinite; transform-box: fill-box; transform-origin: center }
@keyframes dk-flame { 0%,100% { transform: scaleY(1) rotate(-2deg) } 50% { transform: scaleY(1.15) rotate(3deg) } }
.dk-flame { animation: dk-flame .9s ease-in-out infinite; transform-origin: 50% 100% }
@keyframes dk-wobble { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-1.5deg) } 75% { transform: rotate(1.5deg) } }
`

function useFresh(sol: SolApi) {
  const seen = useRef(new Set<string>())
  return useCallback(
    (k: string, lbl: string) => {
      if (seen.current.has(k) || sol.list.some((s) => s.key === k)) return false
      seen.current.add(k)
      sol.add(k, lbl)
      return true
    },
    [sol],
  )
}

function SolutionList(p: Parameters<typeof KitSolutionList>[0]) {
  return <div className="text-ink"><KitSolutionList {...p} /></div>
}

/** Dar panelde soru metni tam satır kaplasın, düğmeler alta insin */
function Nudge(p: Parameters<typeof KitNudge>[0]) {
  return (
    <div className="[&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
      <KitNudge {...p} />
    </div>
  )
}

export default function DenklemKapilari({ grade, onFinish }: GameProps) {
  const doors = useMemo(() => makeDoors(grade), [grade])
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const [idx, setIdx] = useState(0)
  const [opened, setOpened] = useState(0)
  const [results, setResults] = useState<Done[]>([])
  const [ready, setReady] = useState(false)
  const sol = useSolutions()
  const door = doors[idx]

  const onDone = useCallback((d: Done) => {
    setResults((r) => [...r, d])
    setReady(true)
    setOpened((o) => o + 1)
  }, [])

  const next = () => {
    if (idx + 1 < doors.length) {
      setIdx(idx + 1)
      setReady(false)
      return
    }
    const firsts = results.filter((r) => r.first).length
    const paths = sol.list.length
    const extra = Math.max(0, paths - doors.length)
    const ratio = Math.min(1, (firsts + extra * 0.5) / doors.length)
    const insight =
      grade <= 6
        ? 'Terazinin iki kefesine aynı işlemi yapınca denge bozulmaz; bilinmeyeni bulmak için bu yeter. Bir örüntüyü farklı görenler farklı ama eşdeğer kurallar yazar.'
        : grade === 7
          ? 'Eşitliği korumak için her işlem iki tarafa da uygulanır; bu kurala uydukça farklı sıralarla (önce çıkar ya da önce böl) aynı çözüme ulaşılır.'
          : 'Doğrusal bir bağlamda verilen y değerini yerine koyunca denklem kurulur; çözümü yerine koyarak kontrol ederiz. İki ifade, terazi dengede olduğunda eşittir.'
    onFinish({
      stars: starsFor(ratio),
      summary: `${doors.length} kapıyı açtın, ${paths} farklı çözüm yolu buldun.`,
      score: firsts * 100 + paths * 40,
      insight,
    })
  }

  return (
    <Scene grade={grade}>
      <style>{CSS}</style>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`grid size-10 place-items-center rounded-2xl shadow ${dark ? 'bg-amber-400 text-slate-900' : 'bg-amber-700 text-amber-50'}`}><DoorOpen size={22} /></span>
          <div>
            <p className={`text-[11px] font-black tracking-wide uppercase ${dark ? 'text-amber-300' : 'text-amber-800'}`}>Kapı {idx + 1} / {doors.length}</p>
            <p className={`text-lg leading-tight font-black ${dark ? 'text-white' : 'text-ink'}`}>{door.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sol.list.length > 0 && <span className={`chip px-3 py-1 text-sm ring-1 ${dark ? 'bg-amber-400/15 text-amber-200 ring-amber-400/40' : 'bg-amber-100 text-amber-900 ring-amber-200'}`}><Trophy size={14} />{sol.list.length} yol</span>}
          <LevelDots current={idx} total={doors.length} />
        </div>
      </div>
      <DoorView key={idx} door={door} idx={idx} grade={grade} dark={dark} sol={sol} onDone={onDone} map={<DungeonMap doors={doors.length} opened={opened} current={idx} dark={dark} />} />
      {ready && (
        <div className="mt-4 flex justify-center animate-fade-up">
          <BigButton onClick={next}>
            {idx + 1 < doors.length ? <>Sonraki kapıya yürü <ArrowRight size={20} /></> : <>Hazine odasına gir <Trophy size={20} /></>}
          </BigButton>
        </div>
      )}
    </Scene>
  )
}

function DoorView(c: Ctx) {
  switch (c.door.kind) {
    case 'solve':
    case 'range':
      return <SolveDoor {...c} door={c.door} />
    case 'check':
      return <CheckDoor {...c} door={c.door} />
    case 'rule':
      return <RuleDoor {...c} door={c.door} />
  }
}

/* ───────────────────────── ortak sahne ───────────────────────── */

function DoorLayout({ map, stage, below, panel }: { map: ReactNode; stage: ReactNode; below?: ReactNode; panel: ReactNode }) {
  // Dar ekranda sıra: harita, sahne, panel (kartlar sahneye yakın), karolar. Genişte: solda sahne+karolar, sağda harita+panel.
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_auto_1fr]">
      <div className="mx-auto w-full max-w-[460px] min-w-0 lg:col-start-2 lg:row-start-1 lg:max-w-none">{map}</div>
      <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">{stage}</div>
      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-2">{panel}</div>
      {below && <div className="w-full min-w-0 self-start lg:col-start-1 lg:row-start-3">{below}</div>}
    </div>
  )
}

function Torch({ side: s }: { side: 'l' | 'r' }) {
  return (
    <div className={`pointer-events-none absolute top-[34%] ${s === 'l' ? 'left-[6%]' : 'right-[6%]'} flex flex-col items-center`} aria-hidden>
      <div className="absolute -top-10 size-24 rounded-full bg-[radial-gradient(circle,rgb(253_224_71/0.45),transparent_65%)] dk-flicker" />
      <svg width="26" height="60" viewBox="0 0 26 60">
        <path className="dk-flame" d="M13 2 C20 12 22 18 13 26 C4 18 6 12 13 2 Z" fill="#fb923c" />
        <path className="dk-flame" d="M13 9 C17 15 17 19 13 24 C9 19 9 15 13 9 Z" fill="#fde047" />
        <rect x="9" y="25" width="8" height="30" rx="2" fill="#5b3a1a" />
        <rect x="6" y="25" width="14" height="5" rx="2" fill="#94a3b8" />
      </svg>
    </div>
  )
}

/** Kapı sahnesi: taş duvar, kemer, kapı kanatları; önde terazi. Bırakma bölgeleri: sol kefe / kapı (iki taraf) / sağ kefe */
function Stage({ dark, plaque, open, children, armed, hover, onZone, openLabel, fade = true }: { dark: boolean; plaque: string; open: boolean; children: ReactNode; armed?: boolean; hover?: Zone | null; onZone?: (z: Zone) => void; openLabel?: string; fade?: boolean }) {
  const wall = dark
    ? 'bg-[#141b2b] [background-image:linear-gradient(rgb(255_255_255/0.035)_2px,transparent_2px),linear-gradient(90deg,rgb(255_255_255/0.035)_2px,transparent_2px)] [background-size:56px_28px]'
    : 'bg-[#d9bd8a] [background-image:linear-gradient(rgb(120_80_30/0.18)_2px,transparent_2px),linear-gradient(90deg,rgb(120_80_30/0.14)_2px,transparent_2px)] [background-size:56px_28px]'
  const zoneCls = (z: Zone) =>
    `flex items-end justify-center rounded-2xl border-[3px] border-dashed pb-3 text-center text-xs font-black transition sm:text-sm ${hover === z ? (z === 'both' ? 'border-emerald-300 bg-emerald-400/30 text-white' : 'border-rose-300 bg-rose-500/25 text-white') : 'border-white/50 bg-black/10 text-white/90'}`
  return (
    <div className={`relative overflow-hidden rounded-[28px] shadow-[0_12px_30px_rgb(0_0_0/0.25)] ring-1 ${dark ? 'ring-slate-700' : 'ring-amber-900/20'} ${wall}`}>
      <Torch side="l" />
      <Torch side="r" />
      {/* kemer ve kapı */}
      <div className="absolute top-14 left-1/2 h-[78%] w-[54%] max-w-[330px] -translate-x-1/2" aria-hidden>
        <div className={`absolute -inset-3 rounded-t-[200px] ${dark ? 'bg-slate-600' : 'bg-[#a8834c]'} shadow-[inset_0_4px_0_rgb(255_255_255/0.15)]`} />
        <div className={`absolute inset-0 overflow-hidden rounded-t-[200px] ${open ? 'bg-[radial-gradient(circle_at_50%_60%,#fff7c2,#fbbf24_45%,#b45309)]' : 'bg-black/70'} transition-colors duration-700`} style={{ perspective: 700 }}>
          <div className="absolute inset-y-0 left-0 w-1/2 origin-left rounded-tl-[200px] border-r border-black/40 bg-[linear-gradient(90deg,#5b3417,#7a4a22_40%,#5b3417)] shadow-inner transition-transform duration-[1200ms] ease-out" style={{ transform: open ? 'rotateY(78deg)' : 'none' }}>
            <div className="absolute inset-x-0 top-[30%] h-2 bg-slate-800/70" />
            <div className="absolute inset-x-0 top-[70%] h-2 bg-slate-800/70" />
          </div>
          <div className="absolute inset-y-0 right-0 w-1/2 origin-right rounded-tr-[200px] border-l border-black/40 bg-[linear-gradient(90deg,#5b3417,#7a4a22_60%,#5b3417)] shadow-inner transition-transform duration-[1200ms] ease-out" style={{ transform: open ? 'rotateY(-78deg)' : 'none' }}>
            <div className="absolute inset-x-0 top-[30%] h-2 bg-slate-800/70" />
            <div className="absolute inset-x-0 top-[70%] h-2 bg-slate-800/70" />
            <div className="absolute top-1/2 left-1 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-amber-400 ring-2 ring-amber-900"><KeyRound size={14} className="text-amber-900" /></div>
          </div>
        </div>
      </div>
      {/* levha: sembolik denklem kapının üstünde */}
      <div className="relative z-10 flex justify-center px-3 pt-3">
        <div className={`rounded-xl px-4 py-1.5 text-center text-xl font-black shadow-lg ring-2 sm:text-2xl ${dark ? 'bg-slate-800 text-amber-300 ring-amber-500/60' : 'bg-[#f6e7c6] text-amber-950 ring-amber-800/40'}`}>
          <MathText text={plaque} />
        </div>
      </div>
      <div className={`relative z-10 mx-auto w-full max-w-[520px] px-2 pt-2 pb-1 transition-all duration-700 ${open && fade ? 'translate-y-6 opacity-0' : ''}`}>{children}</div>
      {open && openLabel && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center animate-pop">
          <span className="rounded-2xl bg-white/95 px-5 py-2 text-xl font-black text-emerald-800 shadow-xl ring-2 ring-emerald-300"><MathText text={openLabel} /></span>
        </div>
      )}
      {armed && !open && (
        <div className="absolute inset-x-2 top-16 bottom-2 z-30 grid grid-cols-[1fr_1.15fr_1fr] gap-2">
          <div data-drop="L" className={zoneCls('L')} onClick={() => onZone?.('L')}>Yalnız sol kefe</div>
          <div data-drop="both" className={zoneCls('both')} onClick={() => onZone?.('both')}>Kapıya bırak:<br />iki tarafa da</div>
          <div data-drop="R" className={zoneCls('R')} onClick={() => onZone?.('R')}>Yalnız sağ kefe</div>
        </div>
      )}
    </div>
  )
}

/** Sürüklenebilir işlem kartı (dokun-dokun alternatifi: dokun, sonra bölgeye dokun) */
function OpCard({ op, dark, selected, glow, onTap, onMove, onDrop }: { op: Op; dark: boolean; selected: boolean; glow?: boolean; onTap: () => void; onMove: (x: number, y: number) => void; onDrop: (x: number, y: number) => void }) {
  const [d, setD] = useState<[number, number] | null>(null)
  const bind = useDrag(
    ({ movement: [mx, my], xy: [px, py], last, tap }) => {
      if (tap) return onTap()
      if (last) {
        setD(null)
        onDrop(px, py)
        return
      }
      setD([mx, my])
      onMove(px, py)
    },
    { filterTaps: true },
  )
  return (
    <button
      type="button"
      {...bind()}
      style={{ transform: d ? `translate(${d[0]}px, ${d[1]}px) scale(1.12) rotate(-3deg)` : undefined, touchAction: 'none', zIndex: d ? 60 : undefined, position: 'relative' }}
      className={`min-h-14 min-w-16 cursor-grab rounded-2xl px-3 text-2xl font-black shadow-[0_4px_0_rgb(0_0_0/0.25)] ring-2 select-none ${d ? 'shadow-2xl' : 'transition'} ${selected ? 'ring-4 ring-emerald-400' : ''} ${glow ? 'animate-pulse ring-emerald-400' : ''} ${dark ? 'bg-gradient-to-b from-slate-600 to-slate-700 text-amber-200 ring-amber-400/60' : 'bg-gradient-to-b from-[#fbeccd] to-[#f1d9a6] text-amber-950 ring-amber-700/50'}`}
      aria-label={`İşlem kartı ${opLabel(op)}`}
    >
      <MathText text={opLabel(op)} />
    </button>
  )
}

/** Kart destesi ve sürükleme durumu */
function useDeck(apply: (op: Op, z: Zone) => void) {
  const [selected, setSelected] = useState<Op | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState<Zone | null>(null)
  const zoneAt = (x: number, y: number): Zone | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const z = (el as HTMLElement).dataset?.drop
      if (z) return z as Zone
    }
    return null
  }
  return {
    selected,
    armed: dragging || !!selected,
    hover,
    onZone: (z: Zone) => {
      if (selected) {
        apply(selected, z)
        setSelected(null)
      }
    },
    cardProps: (op: Op) => ({
      selected: !!selected && opKey(selected) === opKey(op),
      onTap: () => setSelected((s) => (s && opKey(s) === opKey(op) ? null : op)),
      onMove: (x: number, y: number) => {
        if (!dragging) setDragging(true)
        setSelected(null)
        setHover(zoneAt(x, y))
      },
      onDrop: (x: number, y: number) => {
        const z = zoneAt(x, y)
        setDragging(false)
        setHover(null)
        if (z) apply(op, z)
      },
    }),
    clear: () => setSelected(null),
  }
}

function CardBuilder({ dark, onAdd }: { dark: boolean; onAdd: (o: Op) => void }) {
  const [open, setOpen] = useState(false)
  const [k, setK] = useState<Op['k']>('−')
  const [v, setV] = useState(1)
  const [x, setX] = useState(false)
  const btn = (on: boolean) => `min-h-11 min-w-11 rounded-xl text-lg font-black ring-1 ${on ? 'bg-indigo-600 text-white ring-indigo-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex min-h-11 items-center gap-1.5 self-start rounded-xl px-3 text-sm font-extrabold ring-1 ${dark ? 'bg-slate-800 text-slate-200 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
        <Plus size={16} />Kendi kartını yap
      </button>
    )
  return (
    <div className={`rounded-2xl p-3 ring-1 ${dark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-line'}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {(['+', '−', '×', '÷'] as const).map((o) => <button key={o} type="button" className={btn(k === o)} onClick={() => { setK(o); if (o === '×' || o === '÷') setX(false) }}>{o}</button>)}
        <span className="mx-1" />
        <button type="button" className={btn(false)} onClick={() => setV((n) => Math.max(1, n - 1))} aria-label="Azalt">−</button>
        <span className="min-w-8 text-center text-xl font-black">{v}</span>
        <button type="button" className={btn(false)} onClick={() => setV((n) => Math.min(30, n + 1))} aria-label="Artır">+</button>
        {(k === '+' || k === '−') && <button type="button" className={btn(x)} onClick={() => setX((b) => !b)}>x</button>}
      </div>
      <button type="button" onClick={() => onAdd({ k, v: r(v), x })} className="btn-primary mt-2 min-h-11 w-full text-base">
        <MathText text={`${opLabel({ k, v: r(v), x })} kartını ekle`} />
      </button>
    </div>
  )
}

function History({ steps, current, pending, dark, v = 'x' }: { steps: { op: Op; before: Eq }[]; current: Eq; pending: boolean; dark: boolean; v?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
      <p className={`mb-1.5 text-xs font-black tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-indigo-700'}`}>Denklem</p>
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center justify-between gap-2 text-base font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>
            <MathText text={fmtEq(s.before, v)} />
            <span className={`chip px-2 py-0.5 text-sm ${dark ? 'bg-teal-400/15 text-teal-200' : 'bg-indigo-50 text-indigo-700'}`}>| <MathText text={opLabel(s.op)} /></span>
          </div>
        ))}
        <div className={`text-2xl font-black ${pending ? 'text-rose-500' : dark ? 'text-white' : 'text-ink'}`}>
          <MathText text={pending ? `${fmtSide(current.L, v)} ≠ ${fmtSide(current.R, v)}` : fmtEq(current, v)} />
        </div>
      </div>
    </div>
  )
}

const tiltOf = (L: Side, R: Side, x: number, dir = 0) => {
  const diff = valueAt(L, x) - valueAt(R, x)
  if (Math.abs(diff) < 1e-9) return dir
  return -Math.sign(diff) * Math.min(13, 5 + Math.abs(diff) * 0.8)
}

/** Çözümü yerine koyarak doğrulama cümlesi */
function checkText(e: Eq, v: R): string {
  const part = (sd: Side) => (zero(sd.a) ? fmt(sd.b) : `${subst(sd, v)} = ${fmt(evalSide(sd, v))}`)
  return `sol taraf ${part(e.L)}, sağ taraf ${part(e.R)}: eşit!`
}

function firstStrategy(op: Op, eq: Eq): string {
  if (op.x) return 'Bilinmeyenleri bir tarafta toplama'
  if (op.k === '×' && (eq.L.a.d > 1 || eq.R.a.d > 1)) return 'Önce kesirlerden kurtulma'
  if (op.k === '×' || op.k === '÷') return 'Önce bölerek sadeleştirme'
  return 'Önce sabit terimi yok etme'
}

/* ───────────────────────── Çözüm kapısı (denklem / eşitsizlik) ───────────────────────── */

function SolveDoor({ door, idx, dark, sol, map, onDone }: Ctx & { door: Extract<Door, { kind: 'solve' | 'range' }> }) {
  const track = useTracker()
  const ctx = door.kind === 'solve' ? door.context : undefined
  const [eq, setEq] = useState<Eq>(door.eq)
  const [subbed, setSubbed] = useState(!ctx)
  const [steps, setSteps] = useState<{ op: Op; before: Eq }[]>([])
  const [pending, setPending] = useState<{ op: Op; side: 'L' | 'R'; before: Eq } | null>(null)
  const [nudge, setNudge] = useState<{ q: string; m?: string; ok?: boolean } | null>(null)
  const [phase, setPhase] = useState<'solve' | 'line' | 'open'>('solve')
  const [everOpen, setEverOpen] = useState(false)
  const [oneSided, setOneSided] = useState(0)
  const [custom, setCustom] = useState<Op[]>([])
  const [lastPathNew, setLastPathNew] = useState<{ path: string; isNew: boolean; efficient: boolean } | null>(null)
  const logged = useRef(false)
  const fresh = useFresh(sol)
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}:`))
  const iso = isolated(eq)
  const exact = useMemo(() => {
    const e = door.eq
    const da = num(e.L.a) - num(e.R.a)
    return da === 0 ? 0 : (num(e.R.b) - num(e.L.b)) / da
  }, [door.eq])
  const v = 'x'

  const finish = (first: boolean) => {
    if (everOpen) return
    setEverOpen(true)
    track.attempt(true)
    track.item(first)
    onDone({ first })
  }

  const commit = (next: Eq, op: Op, before: Eq) => {
    const ns = [...steps, { op, before }]
    setEq(next)
    setSteps(ns)
    setNudge(null)
    const done = isolated(next)
    if (!done) return
    const path = ns.map((s) => opLabel(s.op)).join(' → ')
    const efficient = ns.length <= door.maxSteps
    const isNew = efficient ? fresh(`${idx}:${path}`, path) : false
    setLastPathNew({ path, isNew, efficient })
    track.strategy(firstStrategy(ns[0].op, ns[0].before))
    sfx.ok()
    if (door.kind === 'range') {
      setPhase('line')
      return
    }
    setPhase('open')
    celebrate()
    finish(oneSided === 0 && efficient)
  }

  const apply = (op: Op, z: Zone) => {
    if (phase !== 'solve') return
    if (!subbed) return setNudge({ q: `Önce bağlamdaki değeri yerleştir: y yerine ${ctx!.y} yaz.` })
    if (pending) {
      const other = pending.side === 'L' ? 'R' : 'L'
      if (z === other && opKey(op) === opKey(pending.op)) {
        setPending(null)
        commit(applyBoth(pending.before, op), op, pending.before)
        setNudge({ ok: true, q: 'Denge yeniden kuruldu! Aynı işlemi iki kefeye de uyguladın.' })
        return
      }
      sfx.bad()
      return setNudge({ q: `Terazi şu an dengede değil. Önce ${opLabel(pending.op)} kartını diğer kefeye de uygula ya da “Geri al”a bas.` })
    }
    if (z === 'both') return commit(applyBoth(eq, op), op, eq)
    const before = eq
    setEq({ ...eq, [z]: applySide(z === 'L' ? eq.L : eq.R, op) })
    setPending({ op, side: z, before })
    setOneSided((n) => n + 1)
    track.attempt(false)
    sfx.bad()
    const mult = op.k === '×' || op.k === '÷'
    const where = z === 'L' ? 'sol' : 'sağ'
    setNudge({
      q: mult
        ? `Yalnız ${where} kefedekileri ${op.k === '÷' ? 'bölersen' : 'çarparsan'} terazi dengede kalır mı? Dengeyi korumak için aynı kartı diğer kefeye de uygula.`
        : `Sadece bir tarafa ${op.k === '+' ? 'eklersen' : 'çıkarırsan'} terazi ne olur? Dengeyi korumak için aynı kartı diğer kefeye de sürükle.`,
      m: logged.current ? undefined : 'Denklemde işlemi yalnızca bir tarafa uyguladı (eşitliğin korunumu)',
    })
    logged.current = true
  }

  const deck = useDeck(apply)

  const undo = () => {
    setNudge(null)
    if (pending) {
      setEq(pending.before)
      setPending(null)
      return
    }
    const last = steps[steps.length - 1]
    if (!last) return
    setEq(last.before)
    setSteps(steps.slice(0, -1))
  }

  const again = () => {
    setEq(door.eq)
    setSteps([])
    setPending(null)
    setNudge(null)
    setPhase('solve')
    setLastPathNew(null)
  }

  const shown: Eq = !subbed && ctx ? { L: side(0, 0), R: door.eq.R, rel: '=' } : eq
  const relTilt = eq.rel === '<' || eq.rel === '≤' ? 9 : eq.rel === '>' || eq.rel === '≥' ? -9 : 0
  const tilt = !subbed ? 11 : door.kind === 'range' ? (pending ? relTilt + (pending.side === 'L' ? -5 : 5) : relTilt) : tiltOf(shown.L, shown.R, exact)
  const plaque = !subbed && ctx ? `y = ${fmtSide(door.eq.R)}` : pending ? `${fmtSide(eq.L)} ≠ ${fmtSide(eq.R)}` : fmtEq(eq)
  const cards = suggest(pending ? pending.before : eq, custom)
  const value = iso?.value

  const stage = (
    <Stage dark={dark} plaque={plaque} open={phase === 'open'} armed={deck.armed && phase === 'solve' && subbed} hover={deck.hover} onZone={deck.onZone} openLabel={phase === 'open' ? 'Kapı açıldı!' : undefined}>
      <Balance left={shown.L} right={shown.R} tilt={tilt} dark={dark} />
    </Stage>
  )

  const panel = (
    <>
      <TaskCard tone={dark ? 'dark' : 'brand'}>{door.prompt}</TaskCard>
      {ctx && !subbed && (
        <div className={`rounded-2xl p-3 ring-1 ${dark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-line'}`}>
          <p className={`mb-2 text-sm font-bold ${dark ? 'text-slate-200' : 'text-ink'}`}>{ctx.story} Bu değer, y = <MathText text={fmtSide(door.eq.R)} /> kuralında nereye yerleşir?</p>
          <button type="button" onClick={() => { setSubbed(true); sfx.ok(); track.strategy('Bağlamdaki değeri yerine koyma') }} className="btn-primary min-h-12 w-full">y yerine {ctx.y} yaz</button>
        </div>
      )}
      {subbed && <History steps={steps} current={eq} pending={!!pending} dark={dark} v={v} />}
      {subbed && phase === 'solve' && (
        <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
          <p className={`mb-2 text-xs font-black tracking-wide uppercase ${dark ? 'text-amber-300' : 'text-amber-800'}`}>İşlem kartları · kapıya sürükle ya da dokun</p>
          <div className="flex flex-wrap gap-2">
            {cards.map((op) => <OpCard key={opKey(op)} op={op} dark={dark} glow={!!pending && opKey(op) === opKey(pending.op)} {...deck.cardProps(op)} />)}
          </div>
          {deck.selected && (
            <div className="mt-3 grid grid-cols-3 gap-1.5 animate-fade-up">
              {(['L', 'both', 'R'] as Zone[]).map((z) => (
                <button key={z} type="button" onClick={() => deck.onZone(z)} className={`min-h-12 rounded-xl px-1 text-xs font-black ring-1 ${z === 'both' ? 'bg-emerald-600 text-white ring-emerald-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}>
                  {z === 'L' ? 'Yalnız sol' : z === 'R' ? 'Yalnız sağ' : 'İki tarafa'}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CardBuilder dark={dark} onAdd={(o) => setCustom((c) => [...c, o])} />
            <button type="button" onClick={undo} disabled={!pending && !steps.length} className={`ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 disabled:opacity-40 ${dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}><Undo2 size={16} />Geri al</button>
          </div>
        </div>
      )}
      {phase === 'line' && door.kind === 'range' && (
        <RangeLine
          eq={door.eq}
          solved={iso!}
          view={door.view}
          dark={dark}
          onSolved={() => {
            setPhase('open')
            celebrate()
            finish(oneSided === 0 && !!lastPathNew?.efficient)
          }}
        />
      )}
      {nudge && <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} tone={nudge.ok ? 'ok' : 'think'} tool={nudge.ok ? undefined : 'balance'} toolTitle="Terazi" onClose={() => setNudge(null)} />}
      {phase === 'open' && value && (
        <>
          <Nudge
            tone="ok"
            question={
              door.kind === 'range'
                ? `Kapı açıldı: ${fmtEq(door.eq)} eşitsizliğini sağlayan her x bu kapıyı açar.`
                : `Kontrol: x = ${fmt(value)} yerine konunca ${checkText(door.eq, value)} ${!lastPathNew?.efficient ? 'Kapı açıldı ama yol uzun sürdü; daha kısa bir yol var mı?' : door.maxSteps === 1 ? 'Tek adımda açtın!' : lastPathNew.isNew && mine.length >= 2 ? 'Yeni bir yol buldun!' : 'Başka bir sırayla da açabilir misin?'}`
            }
          />
          {door.maxSteps > 1 && <button type="button" onClick={again} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-extrabold ring-1 ${dark ? 'bg-slate-800 text-amber-200 ring-amber-400/50' : 'bg-white text-amber-900 ring-amber-300'}`}><RotateCcw size={18} />Kapıyı kapat, başka bir yolla aç</button>}
          {mine.length === 1 && <StrategyPicker options={['Önce sabit terimi götürdüm', 'Önce böldüm', 'x’leri bir tarafta topladım', 'Önce kesirden kurtuldum']} onPick={() => {}} />}
        </>
      )}
      <SolutionList list={mine} />
    </>
  )

  return <DoorLayout map={map} stage={stage} below={subbed ? <Tiles L={eq.L} R={eq.R} rel={eq.rel} dark={dark} unbalanced={!!pending} /> : null} panel={panel} />
}

/* ───────────────────────── Anahtar kapısı (yerine koyma) ───────────────────────── */

function CheckDoor({ door, dark, map, onDone }: Ctx & { door: Extract<Door, { kind: 'check' }> }) {
  const track = useTracker()
  const [probe, setProbe] = useState<number | null>(null)
  const [tried, setTried] = useState<number[]>([])
  const [open, setOpen] = useState(false)
  const [wrongDir, setWrongDir] = useState(false)
  const [nudge, setNudge] = useState<string | null>(null)
  const e = door.eq
  const f = (x: number) => valueAt(e.L, x) - valueAt(e.R, x)
  const slope = num(e.L.a) - num(e.R.a)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = (k: number) => {
    if (open) return
    // önceki denemenin eğimi yön gösteriyorsa ona uyuldu mu?
    const prev = tried[tried.length - 1]
    let wd = wrongDir
    if (prev !== undefined && Math.abs(f(prev)) > 1e-9) {
      const needBigger = (f(prev) < 0) === slope > 0
      if (needBigger ? k < prev : k > prev) wd = true
    }
    setWrongDir(wd)
    setProbe(k)
    setTried((t) => (t.includes(k) ? t : [...t, k]))
    setNudge(null)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const ok = Math.abs(f(k)) < 1e-9
      track.attempt(ok)
      if (ok) {
        setOpen(true)
        sfx.ok()
        celebrate()
        const first = !wd
        track.strategy(tried.length > 0 && !wd ? 'Terazinin eğiminden yön bulma' : 'Yerine koyarak deneme')
        track.item(first)
        onDone({ first })
      } else {
        sfx.bad()
        const lighter = f(k) < 0 ? 'sol' : 'sağ'
        setNudge(`x = ${k} iken ${lighter} kefe hafif kaldı. Anahtarı büyütmek mi, küçültmek mi ${lighter} kefeyi ağırlaştırır?`)
      }
    }, 750)
  }

  const pv = probe === null ? null : r(probe)
  const totals: [string, string] | undefined = pv ? [`= ${fmt(evalSide(e.L, pv))}`, `= ${fmt(evalSide(e.R, pv))}`] : undefined
  const tilt = probe === null ? 0 : tiltOf(e.L, e.R, probe)

  const stage = (
    <Stage dark={dark} plaque={open && probe !== null ? `x = ${probe}` : fmtEq(e)} open={open} openLabel={open ? 'Kapı açıldı!' : undefined}>
      <Balance left={e.L} right={e.R} tilt={tilt} dark={dark} xLabel={probe === null ? undefined : String(probe)} totals={totals} />
    </Stage>
  )
  const panel = (
    <>
      <TaskCard tone={dark ? 'dark' : 'brand'}>{door.prompt}</TaskCard>
      <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
        <p className={`mb-2 text-xs font-black tracking-wide uppercase ${dark ? 'text-amber-300' : 'text-amber-800'}`}>Anahtarlar · x yerine koy</p>
        <div className="grid grid-cols-3 gap-2">
          {door.keys.map((k) => {
            const was = tried.includes(k)
            const ok = Math.abs(f(k)) < 1e-9
            return (
              <button key={k} type="button" onClick={() => choose(k)} disabled={open} className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-2xl font-black ring-2 transition active:scale-95 ${was && !ok ? (dark ? 'bg-slate-700 text-slate-400 ring-slate-600' : 'bg-slate-100 text-slate-400 ring-slate-200') : dark ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-900 ring-amber-200' : 'bg-gradient-to-b from-amber-200 to-amber-400 text-amber-950 ring-amber-600'}`}>
                <KeyRound size={18} />
                {k}
              </button>
            )
          })}
        </div>
      </div>
      {pv && (
        <div className={`rounded-2xl p-3 text-lg font-black ${dark ? 'bg-slate-800/90 text-white ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
          <p className={`mb-1 text-xs tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-indigo-700'}`}>Yerine koy: x = {probe}</p>
          <p><MathText text={`Sol: ${subst(e.L, pv)} = ${fmt(evalSide(e.L, pv))}`} /></p>
          <p><MathText text={zero(e.R.a) ? `Sağ: ${fmt(e.R.b)}` : `Sağ: ${subst(e.R, pv)} = ${fmt(evalSide(e.R, pv))}`} /></p>
          <p className={Math.abs(f(probe!)) < 1e-9 ? 'text-emerald-500' : 'text-rose-500'}>{Math.abs(f(probe!)) < 1e-9 ? 'Eşit! Terazi dengede.' : 'Eşit değil.'}</p>
        </div>
      )}
      {nudge && !open && <Nudge key={nudge} question={nudge} onClose={() => setNudge(null)} />}
      {open && <StrategyPicker options={['Tek tek denedim', 'Terazinin eğimine baktım', 'Önce kafamda çözdüm']} onPick={() => {}} />}
    </>
  )
  return <DoorLayout map={map} stage={stage} below={<Tiles L={e.L} R={e.R} rel={e.rel} dark={dark} />} panel={panel} />
}

/* ───────────────────────── Kural kapısı (örüntü → ifade) ───────────────────────── */

function Figure({ kind, n, cx, cy }: { kind: 'L' | 'plus' | 'T'; n: number; cx: number; cy: number }) {
  const s = 13
  const pts: { x: number; y: number; c: string }[] = []
  if (kind === 'L') {
    pts.push({ x: 0, y: 0, c: '#f59e0b' })
    for (let k = 1; k <= n; k++) pts.push({ x: k * s, y: 0, c: '#14b8a6' })
    for (let k = 1; k <= n; k++) pts.push({ x: 0, y: -k * s, c: '#8b5cf6' })
  } else {
    pts.push({ x: 0, y: 0, c: '#f59e0b' })
    const cols = ['#14b8a6', '#8b5cf6', '#ef4444', '#3b82f6']
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy], i) => {
      for (let k = 1; k <= n; k++) pts.push({ x: dx * k * s, y: dy * k * s, c: cols[i] })
    })
  }
  const ox = kind === 'L' ? cx - (n * s) / 2 : cx
  const oy = kind === 'L' ? cy + (n * s) / 2 : cy
  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} cx={ox + p.x} cy={oy + p.y} r={5.6} fill={p.c} stroke="rgb(0 0 0 / 0.35)" strokeWidth={1} />
      ))}
    </g>
  )
}

function RuleDoor({ door, idx, dark, sol, map, onDone }: Ctx & { door: Extract<Door, { kind: 'rule' }> }) {
  const track = useTracker()
  const [expr, setExpr] = useState<number[]>([])
  const [open, setOpen] = useState(false)
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const fresh = useFresh(sol)
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}:`))
  const terms: RuleTerm[] = expr.map((i) => door.palette[i])
  const at = (n: number) => terms.reduce((s, t) => s + t.a * n + t.b, 0)
  const truth = (n: number) => door.rule.a * n + door.rule.b
  const exprText = terms.length ? terms.map((t, i) => (i > 0 && t.label.includes(' ') ? `(${t.label})` : t.label)).join(' + ') : '…'

  const check = () => {
    const bad = [1, 2, 3, 4, 5].find((n) => at(n) !== truth(n))
    const ok = bad === undefined
    track.attempt(ok)
    if (ok) {
      const k = [...terms.map((t) => t.label)].sort().join('|')
      const isNew = fresh(`${idx}:${k}`, exprText.replace(/n/g, 'n'))
      sfx.ok()
      if (!open) {
        setOpen(true)
        celebrate()
        track.strategy('Örüntüyü genelleme')
        track.item(tries === 0)
        onDone({ first: tries === 0 })
      } else if (isNew) {
        track.strategy('Örüntüyü farklı görme')
        celebrate()
      }
      setNudge(isNew ? null : { q: 'Bu kuralı zaten buldun. Deseni başka türlü görebilir misin? Renklere bak.' })
      setExpr([])
      return
    }
    setTries((t) => t + 1)
    sfx.bad()
    const sumA = terms.reduce((s, t) => s + t.a, 0), sumB = terms.reduce((s, t) => s + t.b, 0)
    if (sumA === 1 && sumB === door.rule.a)
      return setNudge({ q: `Her adımda ${door.rule.a} taş ekleniyor; bu, kuralda n’nin yanına mı yoksa sabit olarak mı yazılır? n = 10 için kuralın ${at(10)} veriyor, desende ${truth(10)} taş olur.`, m: 'Örüntüde artış miktarını katsayı yerine sabit terim olarak yazdı' })
    setNudge({ q: `n = ${bad} için kuralın ${at(bad!)} taş veriyor, ama desende ${truth(bad!)} taş var. Hangi terimi değiştirmelisin?` })
  }

  const stage = (
    <Stage dark={dark} plaque={open ? `Taş = ${door.rule.a}n + ${door.rule.b}` : 'n. adımda kaç taş?'} open={open} fade={false}>
      <svg viewBox="0 0 420 206" className="block h-auto w-full" role="img" aria-label="Taş örüntüsü">
        {[1, 2, 3].map((n, i) => (
          <g key={n}>
            <rect x={8 + i * 104} y={8} width={96} height={190} rx={14} fill={dark ? 'rgb(15 23 42 / 0.88)' : 'rgb(255 250 238 / 0.95)'} stroke={dark ? '#475569' : '#a8834c'} strokeWidth={1.5} />
            <Figure kind={door.figure} n={n} cx={56 + i * 104} cy={88} />
            <rect x={16 + i * 104} y={160} width={80} height={28} rx={8} fill={dark ? '#1e293b' : '#f1dfb8'} />
            <text x={56 + i * 104} y={179} textAnchor="middle" fontSize={14} fontWeight={900} fill={dark ? '#fde68a' : '#5b3a12'}>{n}. adım: {truth(n)}</text>
          </g>
        ))}
        <g>
          <rect x={320} y={8} width={92} height={190} rx={14} fill={dark ? 'rgb(15 23 42 / 0.6)' : 'rgb(255 250 238 / 0.6)'} stroke={dark ? '#fbbf24' : '#b45309'} strokeDasharray="6 5" strokeWidth={2} />
          <text x={366} y={100} textAnchor="middle" fontSize={44} fontWeight={900} fill={dark ? '#fbbf24' : '#b45309'}>?</text>
          <text x={366} y={179} textAnchor="middle" fontSize={14} fontWeight={900} fill={dark ? '#fde68a' : '#5b3a12'}>n. adım</text>
        </g>
      </svg>
    </Stage>
  )

  const table = (
    <div className={`overflow-x-auto rounded-2xl p-3 ${dark ? 'bg-slate-800/80 ring-1 ring-slate-600' : 'bg-[#fbf3e2] ring-1 ring-amber-200'}`}>
      <p className={`mb-2 text-xs font-black tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-amber-800'}`}>Tablo</p>
      <table className={`w-full text-center text-base font-black ${dark ? 'text-slate-100' : 'text-ink'}`}>
        <tbody>
          <tr><th className="pr-2 text-left text-sm">n</th>{[1, 2, 3, 4, 5].map((n) => <td key={n}>{n}</td>)}</tr>
          <tr><th className="pr-2 text-left text-sm">Taş</th>{[1, 2, 3, 4, 5].map((n) => <td key={n}>{n <= 3 || open ? truth(n) : '?'}</td>)}</tr>
          {terms.length > 0 && (
            <tr className={dark ? 'text-teal-300' : 'text-indigo-700'}>
              <th className="pr-2 text-left text-sm">Kuralın</th>
              {[1, 2, 3, 4, 5].map((n) => <td key={n}>{at(n)}{n <= 3 && <span className={at(n) === truth(n) ? 'text-emerald-500' : 'text-rose-500'}>{at(n) === truth(n) ? ' ✓' : ' ✗'}</span>}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  const panel = (
    <>
      <TaskCard tone={dark ? 'dark' : 'brand'}>{door.prompt}</TaskCard>
      <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
        <p className={`mb-2 text-xs font-black tracking-wide uppercase ${dark ? 'text-amber-300' : 'text-amber-800'}`}>Terim kartları · dokunarak ekle</p>
        <div className="flex flex-wrap gap-2">
          {door.palette.map((t, i) => (
            <button key={i} type="button" onClick={() => { setExpr((x) => (x.length < 6 ? [...x, i] : x)); setNudge(null) }} className={`min-h-14 min-w-14 rounded-2xl px-3 text-xl font-black shadow-[0_4px_0_rgb(0_0_0/0.2)] ring-2 active:translate-y-0.5 ${dark ? 'bg-slate-700 text-amber-200 ring-amber-400/60' : 'bg-gradient-to-b from-[#fbeccd] to-[#f1d9a6] text-amber-950 ring-amber-700/50'}`}>{t.label}</button>
          ))}
        </div>
        <p className={`mt-3 mb-1 text-xs font-black tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-indigo-700'}`}>Kuralın · terime dokunursan silinir</p>
        <div className={`flex min-h-14 flex-wrap items-center gap-1.5 rounded-xl p-2 text-xl font-black ${dark ? 'bg-slate-900/70 text-white' : 'bg-indigo-50 text-ink'}`}>
          <span>Taş =</span>
          {terms.map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>+</span>}
              <button type="button" onClick={() => setExpr((x) => x.filter((_, j) => j !== i))} className={`min-h-11 rounded-lg px-2 ring-1 ${dark ? 'bg-slate-700 ring-slate-500' : 'bg-white ring-indigo-200'}`}>{t.label}</button>
            </span>
          ))}
        </div>
        <BigButton onClick={check} disabled={!terms.length} className="mt-3 w-full"><KeyRound size={20} />{open ? 'Bu kuralı da dene' : 'Kapıyı aç'}</BigButton>
      </div>
      {nudge && <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} onClose={() => setNudge(null)} />}
      {open && mine.length === 1 && <Nudge tone="ok" question="Kapı açıldı! Renkli taşlara başka türlü bakarsan aynı sayıyı veren başka bir kural yazabilir misin?" />}
      <SolutionList list={mine} />
    </>
  )
  return <DoorLayout map={map} stage={stage} below={table} panel={panel} />
}
