import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import type { Grade } from '../../data/types'
import { Scene } from '../../games/kit2'
import { Header, NextButton, Nudge, useChecks } from '../donusum-studyosu/ortak'
import { Drag, Drop, HowTo, type Dnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'

/**
 * 90 Çarpmaya Giriş ve 91 Bölmeye Giriş için ortak parçalar: görev akışı (Workshop), dar ekranda tuvalde
 * görünen ipucu (useSay), yeni soruyu görünür alana kaydırma (Reveal), yapışkan tepsi (Sticky), kural defteri,
 * nesne yığını (Heap), tabak/poşet/çocuk kabı (Plate), tabak yığını (PlateStack), sayı yuvası (Slot).
 */

export type Done = (first: boolean, rules: string[]) => void
export interface TaskProps { onDone: Done; last: boolean }
export interface TaskDef { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }

/* ───────────── görev akışı ───────────── */

export function Workshop({ grade, tasks, render, onEnd, endNote }: { grade: Grade; tasks: TaskDef[]; render: (idx: number, p: TaskProps) => ReactNode; onEnd: (firsts: boolean[], rules: string[]) => void; endNote: string }) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  /** İlk görevde açık gelir; sonra başlıktaki “?” ile açılır */
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= tasks.length
  const t = tasks[Math.min(idx, tasks.length - 1)]
  const onDone: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <Scene grade={grade} className="select-none [-webkit-touch-callout:none]">
      <Header
        emoji={end ? '📒' : t.emoji}
        kicker={end ? 'Tamamlandı' : 'Görev'}
        title={end ? 'Kural defterin' : t.title}
        idx={Math.min(idx, tasks.length - 1)}
        total={tasks.length}
        right={end ? null : (
          <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
        )}
      />
      {!end && <HowTo goal={t.goal} tools={t.tools} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? <EndView rules={rules} note={endNote} onFinish={() => onEnd(firsts.current, rules)} /> : <div key={idx}>{render(idx, { onDone, last: idx === tasks.length - 1 })}</div>}
    </Scene>
  )
}

function EndView({ rules, note, onFinish }: { rules: string[]; note: string; onFinish: () => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-amber-50 p-5 text-ink shadow-[0_6px_0_#d9770633] ring-2 ring-amber-300">
        <p className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900"><BookOpen size={20} />Kural defterim</p>
        <ol className="space-y-2">
          {rules.map((r, i) => (
            <li key={r} className="flex gap-3 rounded-xl bg-white p-3 text-base font-extrabold ring-1 ring-amber-200 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500 text-sm font-black text-white">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-bold text-amber-900">{note}</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}

/* ───────────── ipucu ve yerleşim ───────────── */

/** Panel tuvalin yanında mı (lg ve üstü)? Değilse ipucu, parmağın olduğu tuvalin içinde gösterilir. */
export function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

type Say = { q: string; mis?: string; k: number } | null

/** Görev içi düşündüren soru. nudge deneme sayacına yazar; tell yalnızca yol gösterir (keşifte serbest deneme cezalanmaz). */
export function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<Say>(null)
  const [wrong, setWrong] = useState<number | string | null>(null)
  const show = (q: string, opts: { mis?: string; at?: number | string }) => {
    setWrong(opts.at ?? null)
    setSay((s) => ({ q, mis: opts.mis, k: (s?.k ?? 0) + 1 }))
    /** sürükle-bırakta bırakmayı reddeder: kart yerine geri uçar */
    return false as const
  }
  return {
    clear() {
      setSay(null)
      setWrong(null)
    },
    wrong,
    nudge(q: string, opts: { mis?: string; at?: number | string } = {}) {
      checks.fail()
      return show(q, opts)
    },
    tell: (q: string, opts: { mis?: string; at?: number | string } = {}) => show(q, opts),
    /** Geniş ekranda panelde, dar ekranda tuvalde: tek bir yerde gösterilir (yanılgı raporuna bir kez yazılsın) */
    view: (spot: 'work' | 'panel') => (say && (spot === 'panel') === wide ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}

/** Dar ekranda yeni çıkan soru ya da düğme görünür alanda değilse kendiliğinden oraya kaydırılır. */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.innerWidth >= 1024) return
    const id = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.top < 70 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: r.height > window.innerHeight - 90 ? 'start' : 'center' })
    }, 250)
    return () => window.clearTimeout(id)
  }, [])
  return <div ref={ref} className="flex flex-col gap-3 scroll-mt-20">{children}</div>
}

/** Kart tepsisi dar ekranda ekranın altına yapışır */
export function Sticky({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-2 z-20 rounded-2xl shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] lg:static lg:shadow-none">{children}</div>
}

/* ───────────── nesneler ───────────── */

/** Nesneleri 5’li sıralar hâlinde dizer (saymak kolay olsun) */
export function Items({ emoji, count, size = 'md' }: { emoji: string; count: number; size?: 'sm' | 'md' | 'lg' }) {
  const cell = size === 'sm' ? 0.95 : size === 'lg' ? 1.9 : 1.4
  return (
    <span className="grid justify-center gap-0.5 leading-none" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(count, 5))}, ${cell}rem)`, fontSize: `${cell * 0.86}rem` }} aria-hidden>
      {Array.from({ length: count }, (_, i) => <span key={i} className="grid place-items-center animate-pop">{emoji}</span>)}
    </span>
  )
}

/**
 * Nesne yığını: bütün yığın tek, büyük bir tutma alanıdır; tutunca yığından `per` nesne kalkar ve parmağı izler.
 * Yığın aynı zamanda bir bırakma hedefidir (id): kaptaki fazla nesne buraya geri sürüklenir.
 * count verilmezse tükenmeyen bir sepettir.
 */
export function Heap({ dnd, emoji, name, count, per = 1, id = 'heap', item = 'heap', wrong, extra }: { dnd: Dnd; emoji: string; name: string; count?: number; per?: number; id?: string; item?: string; wrong?: boolean; extra?: ReactNode }) {
  const empty = count === 0
  return (
    <Drop dnd={dnd} id={id} className={`flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-amber-50 p-2 ring-1 ring-amber-200 ${wrong ? 'animate-shake ring-4! ring-amber-400!' : ''}`}>
      <p className="flex items-center justify-between gap-2 text-[11px] font-black tracking-wide text-amber-800 uppercase sm:text-xs">
        <span>{count === undefined ? `${name} sepeti` : `${name}: ${count} tane kaldı`}</span>
        {extra}
      </p>
      {empty ? (
        <p className="grid min-h-16 place-items-center text-sm font-black text-amber-700">Hepsi dağıtıldı</p>
      ) : (
        <Drag
          dnd={dnd}
          item={item}
          label={`${name} yığınından ${per} tane`}
          ghost={<span className="flex text-4xl leading-none">{Array.from({ length: Math.min(per, count ?? per) }, (_, i) => <span key={i}>{emoji}</span>)}</span>}
          className="flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl bg-white/70 p-1.5 ring-2 ring-white/0 hover:ring-amber-300"
        >
          {count === undefined ? (
            <span className="text-3xl leading-none tracking-tighter" aria-hidden>{emoji.repeat(5)}</span>
          ) : (
            <span className="flex max-w-full flex-wrap justify-center gap-0.5 text-xl leading-none" aria-hidden>
              {Array.from({ length: count }, (_, i) => <span key={i}>{emoji}</span>)}
            </span>
          )}
          <span className="text-[11px] font-black text-amber-800">tut ve sürükle: {per === 1 ? '1 tane' : `${per} tane`} kalkar</span>
        </Drag>
      )}
    </Drop>
  )
}

export type Kind = 'plate' | 'bag' | 'kid'
const KIND: Record<Kind, { box: string; full: string }> = {
  plate: { box: 'rounded-[2rem] bg-white ring-4 ring-amber-100 shadow-[inset_0_0_0_6px_#fff,inset_0_0_0_8px_#fde68a]', full: 'ring-emerald-300' },
  bag: { box: 'rounded-t-xl rounded-b-[1.75rem] bg-orange-50 ring-2 ring-orange-300', full: 'bg-emerald-50 ring-emerald-500' },
  kid: { box: 'rounded-3xl bg-sky-50 ring-2 ring-sky-200', full: 'ring-emerald-400' },
}

/**
 * Bir kap (tabak, poşet, çocuk): bırakma hedefidir. İçindeki nesneler tek bir tutma alanıdır (grab):
 * sürükleyince bir nesne kalkar, başka bir kaba ya da yığına taşınır. Boş kap (remove) tabak yığınına geri sürüklenebilir.
 */
export function Plate({ dnd, id, count, emoji, title, kind = 'plate', wrong, grab, grabGhost, grabLabel = 'Kaptan 1 nesne al', remove, full, cap, hot, badge = true, icon = kind === 'bag' ? '🛍️' : '🍽️' }: {
  dnd: Dnd; id: string; count: number; emoji: string; title: ReactNode; kind?: Kind; wrong?: boolean; grab?: string; grabGhost?: ReactNode; grabLabel?: string; remove?: string; full?: boolean; cap?: number; hot?: boolean; badge?: boolean; icon?: string
}) {
  const k = KIND[kind]
  const body = <Items emoji={emoji} count={count} />
  return (
    <Drop dnd={dnd} id={id} className={`relative flex w-[8.75rem] flex-col items-center gap-1 px-2 pt-2 pb-2.5 sm:w-36 ${k.box} ${full ? k.full : ''} ${hot ? 'ring-4! ring-sky-400!' : ''} ${wrong ? 'animate-shake ring-4! ring-amber-400!' : ''}`}>
      <p className="max-w-full truncate text-center text-xs font-black text-ink-soft">{title}</p>
      <div className="grid min-h-[5.25rem] w-full place-items-center">
        {count > 0 && grab ? (
          <Drag dnd={dnd} item={grab} label={grabLabel} ghost={grabGhost ?? <span className="text-4xl leading-none">{emoji}</span>} className="grid min-h-16 w-full place-items-center rounded-2xl p-1">{body}</Drag>
        ) : count > 0 ? (
          <div className="grid min-h-16 place-items-center p-1">{body}</div>
        ) : remove ? (
          <Drag dnd={dnd} item={remove} label="Boş kabı yığına geri sürükle" ghost={<span className="text-4xl leading-none">{icon}</span>} className="grid min-h-16 w-full place-items-center rounded-2xl px-1 text-[11px] leading-tight font-black text-slate-400">
            boş<br />(geri sürükleyip kaldırabilirsin)
          </Drag>
        ) : (
          <span className="text-xs font-black text-slate-300">boş</span>
        )}
      </div>
      {badge && (
        <span className={`absolute -right-1.5 -bottom-1.5 inline-flex h-9 min-w-9 items-baseline justify-center rounded-full px-2 pt-1 text-lg leading-7 font-black whitespace-nowrap tabular-nums text-white shadow ${full ? 'bg-emerald-500' : 'bg-slate-700'}`}>
          {count}{cap !== undefined && <span className="text-xs opacity-80">/{cap}</span>}
        </span>
      )}
    </Drop>
  )
}

/** Tabak (ya da poşet) yığını: tut ve masaya sürükle, yeni bir kap gelir; boş kabı buraya geri sürükle */
export function PlateStack({ dnd, kind = 'plate', name, id = 'stack', item = 'newplate', disabled, icon = kind === 'bag' ? '🛍️' : '🍽️' }: { dnd: Dnd; kind?: Kind; name: string; id?: string; item?: string; disabled?: boolean; icon?: string }) {
  return (
    <Drop dnd={dnd} id={id} className="flex w-28 shrink-0 flex-col gap-1 rounded-2xl bg-slate-50 p-2 ring-1 ring-line sm:w-32">
      <p className="text-center text-[11px] font-black tracking-wide text-ink-soft uppercase">{name} yığını</p>
      <Drag dnd={dnd} item={item} disabled={disabled} label={`Yeni ${name.toLocaleLowerCase('tr-TR')}`} ghost={<span className="text-5xl leading-none">{icon}</span>} className="flex min-h-16 w-full flex-col items-center justify-center rounded-xl bg-white p-1 ring-1 ring-line disabled:opacity-40">
        <span className="text-3xl leading-none" aria-hidden>{icon}</span>
        <span className="text-[10px] font-black text-ink-soft">tut ve masaya sürükle</span>
      </Drag>
    </Drop>
  )
}

/* ───────────── kaplar arası hareket ───────────── */

/**
 * Kap içerikleri (gs[i]) üzerinde tek bir sürükle-bırak hareketi. Öğeler:
 * heap → p-i (yığından ekle), pi-i → p-j | heap (kaptan taşı), newplate → table | p-i (yeni kap), plate-i → stack (boş kabı kaldır).
 * Geçersiz hareket null döner. heap sınırlıysa left (kalan) ve per (bir seferde kaç) dikkate alınır.
 */
export function groupMove(gs: number[], item: string, target: string, o: { left?: number; per?: number; max?: number; cap?: number } = {}): { gs: number[]; left?: number } | { msg: string; at?: number | string } | null {
  const per = o.per ?? 1
  const cap = o.cap ?? 12
  const to = target.startsWith('p-') ? Number(target.slice(2)) : null
  const x = gs.slice()
  if (item === 'heap') {
    if (target === 'table') return { msg: 'Masaya değil, bir kabın tam üstüne bırak.', at: 'table' }
    if (to === null) return null
    const room = cap - x[to]
    if (room <= 0) return { msg: `Bu kap dolu: içinde ${x[to]} tane var. Başka bir kaba koy.`, at: to }
    const k = Math.min(per, o.left ?? per, room)
    x[to] += k
    return { gs: x, left: o.left === undefined ? undefined : o.left - k }
  }
  if (item.startsWith('pi-')) {
    const from = Number(item.slice(3))
    if (target === 'heap') {
      x[from]--
      return { gs: x, left: o.left === undefined ? undefined : o.left + 1 }
    }
    if (to === null || to === from) return null
    if (x[to] + 1 > cap) return { msg: `Bu kapta zaten ${x[to]} tane var.`, at: to }
    x[from]--
    x[to]++
    return { gs: x, left: o.left }
  }
  if (item === 'newplate') {
    if (target !== 'table' && to === null) return null
    if (x.length >= (o.max ?? 8)) return { msg: `Masada yer kalmadı: ${x.length} kap var. Gerçekten bu kadar çok kap gerekiyor mu?`, at: 'table' }
    x.push(0)
    return { gs: x, left: o.left }
  }
  if (item.startsWith('plate-')) {
    if (target !== 'stack') return null
    x.splice(Number(item.slice(6)), 1)
    return { gs: x, left: o.left }
  }
  return null
}

/** Masa: kapların durduğu bırakma alanı (yeni kap buraya bırakılır) */
export function Table({ dnd, children, wrong, label }: { dnd: Dnd; children: ReactNode; wrong?: boolean; label?: string }) {
  return (
    <Drop dnd={dnd} id="table" className={`min-h-44 rounded-3xl bg-[linear-gradient(180deg,#fef3c7,#fde68a)] p-3 ring-1 ring-amber-300 ${wrong ? 'animate-shake ring-4! ring-amber-400!' : ''}`}>
      {label && <p className="mb-2 text-[11px] font-black tracking-wide text-amber-900 uppercase">{label}</p>}
      <div className="flex flex-wrap items-start justify-center gap-3">{children}</div>
    </Drop>
  )
}

/* ───────────── sayı yuvası ───────────── */

export function Slot({ dnd, id, value, wrong }: { dnd: Dnd; id: string; value?: number | null; wrong?: boolean }) {
  if (value !== undefined && value !== null) return <span className="grid h-14 min-w-14 place-items-center rounded-2xl bg-emerald-500 px-2 text-3xl font-black text-white tabular-nums animate-pop">{value}</span>
  return <Drop dnd={dnd} id={id} className={`grid h-14 min-w-14 place-items-center rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 px-2 text-xl font-black text-sky-500 ${wrong ? 'animate-shake border-amber-500!' : ''}`}>?</Drop>
}

/* ───────────── Türkçe yardımcıları ───────────── */

/** “4’er”, “6’şar” gibi üleştirme eki */
export function er(v: number) {
  const s: Record<number, string> = { 0: 'ar', 1: 'er', 2: 'şer', 3: 'er', 4: 'er', 5: 'er', 6: 'şar', 7: 'şer', 8: 'er', 9: 'ar' }
  const last = v % 10
  if (v >= 10 && last === 0) return `${v}’${({ 1: 'ar', 2: 'şer', 3: 'ar', 4: 'ar', 5: 'şer', 6: 'ar', 7: 'er', 8: 'er', 9: 'ar' } as Record<number, string>)[Math.floor(v / 10) % 10] ?? 'ar'}`
  return `${v}’${s[last]}`
}


/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

const ic = (t: string) => <span className="text-base leading-none">{t}</span>
export const GTOOL: Record<'heap' | 'stack' | 'plate' | 'bags' | 'bag' | 'num' | 'kid', ToolInfo> = {
  heap: { icon: ic('🧺'), name: 'Sepet', text: 'Sepete dokunup sürükle: bir nesne kalkar ve parmağını izler. Bir kabın üstüne bırak. Fazlasını kaptan sepete geri sürükleyebilirsin.' },
  stack: { icon: ic('🍽️'), name: 'Tabak yığını', text: 'Tut ve masaya sürükle: yeni bir tabak gelir. Boş bir tabağı yığına geri sürükleyince kalkar.' },
  plate: { icon: <span className="size-5 rounded-full bg-white ring-4 ring-amber-200" />, name: 'Tabak', text: 'İçindeki nesnelere dokunup sürükle: bir tanesi başka bir tabağa ya da sepete taşınır. Köşedeki sayı tabakta kaç tane olduğunu söyler.' },
  bags: { icon: ic('🛍️'), name: 'Poşet yığını', text: 'Tut ve masaya sürükle: yeni, boş bir poşet gelir. Boş poşeti yığına geri sürükleyince kalkar.' },
  bag: { icon: <span className="h-5 w-4 rounded-b-lg rounded-t-sm bg-orange-50 ring-2 ring-orange-300" />, name: 'Poşet', text: 'Poşete nesne sürükle. Poşet dolunca yeşile döner ve kapanır.' },
  kid: { icon: ic('🧒'), name: 'Çocuklar', text: 'Her çocuğun önündeki kaba nesne bırakılır. Bir çocuktan ötekine taşımak için nesnelerine dokunup sürükle.' },
  num: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[11px] font-black ring-1 ring-line">4</span>, name: 'Sayı kartları', text: 'Bir sayı kartını tutup cümledeki “?” kutusuna sürükle. Kartlar tükenmez, aynı sayıyı iki kez kullanabilirsin.' },
}

/** “4 + 4 + 4” */
export const rep = (v: number, times: number) => Array.from({ length: times }, () => v).join(' + ')

/** Sayının belirtme hâli: “4’ü”, “6’yı”, “10’u” */
export function acc(v: number) {
  const u: Record<number, string> = { 0: 'ı', 1: 'i', 2: 'yi', 3: 'ü', 4: 'ü', 5: 'i', 6: 'yı', 7: 'yi', 8: 'i', 9: 'u' }
  const t: Record<number, string> = { 1: 'u', 2: 'yi', 3: 'u', 4: 'ı', 5: 'yi', 6: 'ı', 7: 'i', 8: 'i', 9: 'u' }
  return `${v}’${v % 10 === 0 && v > 0 ? t[Math.floor(v / 10) % 10] : u[v % 10]}`
}
