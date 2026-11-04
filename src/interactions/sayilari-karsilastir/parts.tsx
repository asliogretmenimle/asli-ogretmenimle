import { Fragment, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, ChevronDown, Hand, HelpCircle, Search, Sparkles } from 'lucide-react'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Nudge, fmt, type useChecks } from '../donusum-studyosu/ortak'

/* ───────────── basamaklar ───────────── */

/** PLACE[e]: 10^e basamağı (renkler Basamak Laboratuvarı ile aynı) */
export const PLACE = [
  { name: 'Birler', unit: 'birlik', color: '#ca8a04', soft: '#fef9c3' },
  { name: 'Onlar', unit: 'onluk', color: '#16a34a', soft: '#dcfce7' },
  { name: 'Yüzler', unit: 'yüzlük', color: '#ea580c', soft: '#ffedd5' },
  { name: 'Binler', unit: 'binlik', color: '#db2777', soft: '#fce7f3' },
  { name: 'On binler', unit: 'on binlik', color: '#9333ea', soft: '#f3e8ff' },
]

export const n = (v: number) => fmt(v, 0)
/** e basamağındaki rakam; sayının o basamağı yoksa null */
export const digitAt = (v: number, e: number) => {
  const s = String(v)
  return e < s.length ? Number(s[s.length - 1 - e]) : null
}
export const cellsOf = (v: number, cols: number) => Array.from({ length: cols }, (_, e) => digitAt(v, e)?.toString() ?? null)
/** Soldan ilk farklı basamak (yoksa −1) */
export function firstDiff(a: number, b: number, cols: number) {
  for (let e = cols - 1; e >= 0; e--) if (digitAt(a, e) !== digitAt(b, e)) return e
  return -1
}
/** Her basamaktaki blok sayısı (counts[e]) */
export const countsOf = (v: number) => Array.from({ length: 5 }, (_, e) => digitAt(v, e) ?? 0)

/* ───────────── sürükle-bırak (Polypad gibi) ───────────── */

/**
 * Bir görevin sürükle-bırak durumu. Sürükleyip bırakmak ya da önce öğeye, sonra hedefe dokunmak
 * aynı handle(öğe, hedef) çağrısına varır (akıllı tahtada ve klavyede de çalışsın diye).
 * handle false dönerse bırakma reddedilir: kart uçarak yerine döner ve sallanır.
 */
export function useDnd(handle: (item: string, target: string) => boolean | void) {
  const [held, setHeld] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  return {
    held,
    over,
    dragging,
    setOver,
    setDragging,
    /** true: bırakma kabul edildi */
    drop(item: string, target: string | null) {
      setHeld(null)
      setOver(null)
      setDragging(null)
      return target ? handle(item, target) !== false : false
    },
    tap: (item: string) => setHeld((h) => (h === item ? null : item)),
    hit(target: string) {
      if (!held) return
      setHeld(null)
      handle(held, target)
    },
  }
}
export type Dnd = ReturnType<typeof useDnd>

/** İmlecin altındaki ilk bırakma hedefi (sürüklenen kopya pointer-events: none olduğundan görülmez) */
function dropAt(x: number, y: number) {
  for (const el of document.elementsFromPoint(x, y)) {
    const v = (el as HTMLElement).dataset?.drop
    if (v) return v
  }
  return null
}

type Ghost = { x: number; y: number; dx: number; dy: number; w: number; h: number; phase: 'drag' | 'drop' | 'back' }

/**
 * Polypad’deki gibi: kart tutulunca yerinden kalkar (gölgeli, biraz büyümüş kopya parmağı izler),
 * asıl yerinde soluk bir iz kalır. Doğru hedefe bırakılınca kopya yerine oturur; yanlışsa uçarak geri döner.
 */
export function Drag({ dnd, item, label, className = '', children, disabled }: { dnd: Dnd; item: string; label: string; className?: string; children: ReactNode; disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  const start = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null)
  const draggedAt = useRef(0)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [shake, setShake] = useState(false)
  const held = dnd.held === item

  const end = (ev: ReactPointerEvent) => {
    const s = start.current
    start.current = null
    if (!s?.moved) return
    draggedAt.current = Date.now()
    const ok = dnd.drop(item, dropAt(ev.clientX, ev.clientY))
    if (ok) {
      setGhost((g) => g && { ...g, phase: 'drop' })
      window.setTimeout(() => setGhost(null), 200)
      return
    }
    const r = ref.current?.getBoundingClientRect()
    setGhost((g) => (g && r ? { ...g, phase: 'back', x: r.left + g.dx, y: r.top + g.dy } : null))
    window.setTimeout(() => {
      setGhost(null)
      setShake(true)
      window.setTimeout(() => setShake(false), 450)
    }, 280)
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-pressed={held}
        onPointerDown={(ev) => {
          if (disabled || ev.button > 0) return
          start.current = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, moved: false }
          ev.currentTarget.setPointerCapture(ev.pointerId)
        }}
        onPointerMove={(ev) => {
          const s = start.current
          if (!s || s.id !== ev.pointerId) return
          if (!s.moved) {
            if (Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < 6) return
            s.moved = true
            const r = ev.currentTarget.getBoundingClientRect()
            setGhost({ x: ev.clientX, y: ev.clientY, dx: s.x - r.left, dy: s.y - r.top, w: r.width, h: r.height, phase: 'drag' })
            dnd.setDragging(item)
          } else setGhost((g) => g && { ...g, x: ev.clientX, y: ev.clientY })
          const o = dropAt(ev.clientX, ev.clientY)
          if (o !== dnd.over) dnd.setOver(o)
        }}
        onPointerUp={end}
        onPointerCancel={() => {
          start.current = null
          setGhost(null)
          dnd.setDragging(null)
          dnd.setOver(null)
        }}
        onClick={(ev) => {
          ev.stopPropagation()
          if (!disabled && Date.now() - draggedAt.current > 350) dnd.tap(item)
        }}
        className={`touch-none select-none [&_*]:touch-none ${ghost ? 'opacity-30 outline-2 outline-offset-2 outline-dashed outline-slate-400' : 'cursor-grab hover:-translate-y-0.5 hover:shadow-lg'} ${held ? 'ring-4 ring-sky-500' : ''} ${shake ? 'animate-shake' : ''} ${className}`}
      >
        {children}
      </button>
      {ghost &&
        createPortal(
          <div
            aria-hidden
            className={`pointer-events-none fixed z-[1000] cursor-grabbing ${className}`}
            style={{
              left: ghost.x - ghost.dx,
              top: ghost.y - ghost.dy,
              width: ghost.w,
              height: ghost.h,
              transform: ghost.phase === 'drag' ? 'scale(1.08) rotate(-2deg)' : ghost.phase === 'drop' ? 'scale(0.7)' : 'none',
              opacity: ghost.phase === 'drop' ? 0 : 1,
              boxShadow: ghost.phase === 'drag' ? '0 18px 32px -10px rgb(15 23 42 / 0.45)' : 'none',
              transition: ghost.phase === 'drag' ? 'transform 120ms, box-shadow 120ms' : 'left 260ms ease-out, top 260ms ease-out, transform 200ms, opacity 200ms',
            }}
          >
            {children}
          </div>,
          document.body,
        )}
      {held &&
        createPortal(
          <div className="fixed inset-x-3 bottom-3 z-[999] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-xl animate-fade-up" role="status">
            <Hand size={18} className="shrink-0" />
            <span><b>{label}</b> elinde. Şimdi bırakmak istediğin yere dokun. Vazgeçmek için karta yeniden dokun.</span>
          </div>,
          document.body,
        )}
    </>
  )
}

/** Bırakma hedefi: sürükleme başlayınca kesikli çizgiyle belirir, kart üstüne gelince koyu maviye döner */
export function Drop({ dnd, id, className = '', style, children }: { dnd: Dnd; id: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const active = !!(dnd.dragging || dnd.held)
  const hot = dnd.over === id ? 'ring-4 ring-sky-500 bg-sky-100/70 scale-[1.03]' : active ? 'outline-2 outline-offset-2 outline-dashed outline-sky-400' : ''
  return (
    <div data-drop={id} onClick={() => dnd.hit(id)} className={`transition ${className} ${hot}`} style={style}>
      {children}
    </div>
  )
}

/* ───────────── nasıl kullanılır? ───────────── */

export type Tool = 'unit' | 'bundle' | 'crown' | 'digit' | 'blocks' | 'lens' | 'marks' | 'cmp' | 'answer' | 'basket'

const TOOLS: Record<Tool, { icon: ReactNode; name: string; text: string }> = {
  unit: { icon: <span className="size-4 rounded-[3px] bg-yellow-400 ring-2 ring-yellow-600" />, name: 'Birlik küpü', text: 'Değeri 1 birlik. Altlıkta hangi basamağa ait olduğunu düşünüp o sütuna bırak.' },
  bundle: { icon: <span className="h-4 w-6 rounded-[3px] bg-red-100 ring-2 ring-red-400" />, name: '10’lu demet', text: 'Bir sütunda 10 blok birikince kırmızı çerçeveyle çıkar. Bir büyük birime dönüşmesi için doğru sütuna sürükle.' },
  crown: { icon: <span className="text-lg leading-none">👑</span>, name: 'Taç', text: 'Daha büyük olduğunu düşündüğün sayının üstüne bırak.' },
  digit: { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">7</span>, name: 'Rakam kartı', text: 'Basamak tablosunda boş bir kutuya bırak. Her rakam kendi basamağına gider.' },
  blocks: { icon: <span className="h-4 w-6 rounded-[3px] bg-pink-300 ring-2 ring-pink-500" />, name: 'Blok yığını', text: 'Bir sayının bütün blokları. Aynı renkli kulenin üstüne bırak, kule dolsun.' },
  lens: { icon: <Search size={16} strokeWidth={3} className="text-sky-600" />, name: 'Büyüteç', text: 'Bir basamak sütununun üstüne bırak; o basamaktaki iki rakamı birlikte büyütür.' },
  marks: { icon: <span className="text-base leading-none font-black">= ≠</span>, name: 'Aynı / farklı kartları', text: 'İki rakamın arasındaki “?” yuvasına bırak: aynıysa =, farklıysa ≠.' },
  cmp: { icon: <span className="text-base leading-none font-black">&lt; &gt;</span>, name: 'Küçüktür / büyüktür', text: 'İki sayının arasındaki “?” yuvasına bırak. Ağız büyük sayıya açılır.' },
  answer: { icon: <span className="text-base leading-none">⠿</span>, name: 'Cevap kartları', text: 'Sorunun altındaki kartlardan birini tutup “Cevap kartını buraya sürükle” kutusuna bırak.' },
  basket: { icon: <span className="text-base leading-none">🧺</span>, name: 'Olur / Olmaz sepetleri', text: 'Denediğin rakam kartını uyuyorsa “Olur”, uymuyorsa “Olmaz” sepetine bırak.' },
}

/** El, kartı tutup kesikli kutuya taşır (sonsuz döngü) */
function DragDemo() {
  return (
    <div className="relative h-20 w-44 shrink-0 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-line" aria-hidden>
      <style>{'@keyframes ppCard{0%,15%{transform:translate(0,0) scale(1)}25%{transform:translate(0,-4px) scale(1.08) rotate(-3deg)}65%{transform:translate(92px,-4px) scale(1.08) rotate(-3deg)}75%,100%{transform:translate(92px,0) scale(1)}}@keyframes ppHand{0%{transform:translate(18px,26px)}15%,25%{transform:translate(4px,12px)}65%{transform:translate(96px,12px)}75%{transform:translate(96px,12px);opacity:1}90%,100%{transform:translate(120px,34px);opacity:0}}@keyframes ppBox{0%,55%{border-color:#94a3b8;background:transparent}62%,78%{border-color:#0284c7;background:#e0f2fe}88%,100%{border-color:#10b981;background:#ecfdf5}}'}</style>
      <span className="absolute top-5 right-4 size-11 rounded-xl border-2 border-dashed" style={{ animation: 'ppBox 3.2s ease-in-out infinite' }} />
      <span className="absolute top-5 left-4 grid size-11 place-items-center rounded-xl bg-white text-xl font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line" style={{ animation: 'ppCard 3.2s ease-in-out infinite' }}>7</span>
      <span className="absolute top-0 left-0 text-2xl" style={{ animation: 'ppHand 3.2s ease-in-out infinite' }}>👆</span>
    </div>
  )
}

/** Hiç kullanmamış biri için: sürükle-bırak nasıl yapılır, bu görevin amacı ne, hangi araç ne işe yarar */
export function HowTo({ goal, tools, open, onToggle }: { goal: string; tools: Tool[]; open: boolean; onToggle: () => void }) {
  return (
    <div className="mb-3 rounded-2xl bg-white/95 text-ink ring-1 ring-sky-200">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-3 text-left">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"><HelpCircle size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black tracking-wide text-sky-700 uppercase">Bu görevde amaç</span>
          <span className="block text-sm leading-snug font-extrabold">{goal}</span>
        </span>
        <span className="shrink-0 text-xs font-black text-sky-700">{open ? 'Gizle' : 'Nasıl kullanılır?'}</span>
        <ChevronDown size={18} className={`shrink-0 text-sky-700 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-sky-100 p-3 animate-fade-up md:grid-cols-[auto_1fr_1fr]">
          <DragDemo />
          <ol className="space-y-1.5 text-sm font-bold">
            <li><b className="text-sky-700">1. Tut:</b> Kartı ya da bloğu parmağınla (farede sol tuşla) basılı tut; kart yerinden kalkar.</li>
            <li><b className="text-sky-700">2. Taşı:</b> Basılı tutarak sürükle. Bırakabileceğin yerler <span className="rounded px-1 outline-2 outline-dashed outline-sky-400">kesikli çizgiyle</span> belirir, üstüne gelince koyu maviye döner.</li>
            <li><b className="text-sky-700">3. Bırak:</b> Parmağını kaldır. Doğruysa kart yerine oturur; değilse geri döner ve sarı kutuda bir ipucu sorusu çıkar.</li>
            <li><b className="text-sky-700">Sürükleyemiyor musun?</b> Önce karta dokun, sonra gideceği yere dokun.</li>
          </ol>
          <ul className="space-y-1.5">
            {tools.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm font-bold">
                <span className="mt-0.5 grid min-w-7 place-items-center">{TOOLS[t].icon}</span>
                <span><b>{TOOLS[t].name}:</b> {TOOLS[t].text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Büyük, kalın bir sürüklenebilir kart (işaret, rakam, büyüteç, taç…) */
export const TOKEN = 'grid min-h-14 min-w-14 place-items-center rounded-2xl bg-white px-3 text-2xl font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line'

export function LensToken({ dnd }: { dnd: Dnd }) {
  return (
    <Drag dnd={dnd} item="lens" label="Büyüteç" className="grid size-16 place-items-center rounded-full bg-sky-500 text-white shadow-[0_4px_0_#0369a1] ring-4 ring-white">
      <Search size={32} strokeWidth={3} />
    </Drag>
  )
}

export function Tray({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-wide text-ink-soft uppercase"><Hand size={14} />{title}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

/* ───────────── basamak tablosu ───────────── */

export type Mark = 'same' | 'diff'
/**
 * cells[e]: o basamaktaki rakam. null: basamak yok (“boş”), '': doldurulacak yuva.
 * edit: değiştirilebilen basamaklar kesikli çerçeveli.
 */
export interface Row { label: string; color: string; cells: (string | null)[]; edit?: number[] }

export function PlaceTable({ rows, marks = {}, lens, wrong, dnd, colDrop, cellDrop, markDrop, rowDrop, crown }: {
  rows: Row[]
  marks?: Partial<Record<number, Mark>>
  lens?: number | null
  wrong?: number | null
  dnd?: Dnd
  /** Bütün sütun tek hedef (büyüteç) */
  colDrop?: (e: number) => string | undefined
  /** Tek hücre hedefi (rakam kartı) */
  cellDrop?: (ri: number, e: number) => string | undefined
  /** İki satır arasındaki = / ≠ yuvası */
  markDrop?: (e: number) => string | undefined
  /** Satır etiketi hedefi (taç) */
  rowDrop?: (ri: number) => string | undefined
  crown?: number | null
}) {
  const cols = rows[0].cells.length
  const es = Array.from({ length: cols }, (_, i) => cols - 1 - i)
  const wrap = (id: string | undefined, className: string, children: ReactNode, style?: CSSProperties, key?: number) =>
    id && dnd ? <Drop key={key} dnd={dnd} id={id} className={className} style={style}>{children}</Drop> : <div key={key} className={className} style={style}>{children}</div>
  return (
    <div className="grid items-center gap-x-1.5 gap-y-1" style={{ gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))` }}>
      <span />
      {es.map((e) =>
        wrap(colDrop?.(e), 'flex min-h-11 flex-col items-center justify-end rounded-lg text-center', (
          <>
            {lens === e && <Search size={22} strokeWidth={3} className="mb-0.5 text-sky-600 animate-pop" aria-label="Büyüteç" />}
            <p className="text-[10px] leading-tight font-black uppercase sm:text-xs" style={{ color: PLACE[e].color }}>{PLACE[e].name}</p>
          </>
        ), undefined, e),
      )}
      {rows.map((r, ri) => (
        <Fragment key={ri}>
          {ri > 0 && (
            <>
              <span />
              {es.map((e) => {
                const id = marks[e] ? undefined : markDrop?.(e)
                if (id && dnd) return <Drop key={e} dnd={dnd} id={id} className="mx-auto grid h-10 w-12 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 text-sm font-black text-sky-500">?</Drop>
                return <span key={e} className={`h-5 text-center text-lg leading-5 font-black ${marks[e] === 'diff' ? 'text-pink-600' : 'text-slate-400'}`}>{marks[e] === 'same' ? '=' : marks[e] === 'diff' ? '≠' : ''}</span>
              })}
            </>
          )}
          {wrap(rowDrop?.(ri), 'rounded-xl px-1 py-2 text-sm font-black whitespace-nowrap', (
            <>
              {crown === ri && <span className="mr-0.5 animate-pop" aria-label="Daha büyük">👑</span>}
              {r.label}
            </>
          ), { color: r.color })}
          {es.map((e) => {
            const d = r.cells[e]
            const over = !!d && d.length > 1
            const state = lens === e ? 'ring-4 ring-sky-500 scale-105 z-10' : marks[e] === 'diff' ? 'ring-4 ring-pink-500' : wrong === e ? 'ring-4 ring-amber-400 animate-shake' : 'ring-1 ring-black/10'
            const cls = `relative grid h-14 place-items-center rounded-xl font-black tabular-nums transition sm:h-16 ${state} ${marks[e] === 'same' ? 'opacity-40' : ''} ${r.edit?.includes(e) ? 'outline-2 outline-offset-2 outline-sky-400 outline-dashed' : ''} ${d === null || d === '' ? 'border-2 border-dashed border-slate-300 bg-white/60' : ''} ${over ? 'animate-pulse bg-red-100! text-red-600!' : ''}`
            return wrap(
              cellDrop?.(ri, e) ?? colDrop?.(e),
              cls,
              d === null ? <span className="text-[11px] font-bold text-slate-400">boş</span> : d === '' ? null : <span className={over ? 'text-2xl' : 'text-3xl sm:text-4xl'}>{d}</span>,
              d === null || d === '' ? undefined : { background: PLACE[e].soft, color: PLACE[e].color },
              e,
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

/* ───────────── onluk taban blokları ───────────── */

const GRID = 'bg-[linear-gradient(#0000_86%,#fff8_86%),linear-gradient(90deg,#0000_86%,#fff8_86%)] bg-[length:10%_10%]'

function Block({ e, sm }: { e: number; sm?: boolean }) {
  if (e === 0) return <span className="size-1.5 rounded-[1px] bg-yellow-400 ring-1 ring-yellow-600" />
  if (e === 1) return <span className={`${sm ? 'h-6 w-1' : 'h-10 w-1.5'} rounded-[1px] bg-green-500 bg-[linear-gradient(#0000_86%,#fff8_86%)] bg-[length:100%_10%] ring-1 ring-green-700`} />
  if (e === 2) return <span className={`${sm ? 'size-6' : 'size-10'} rounded-[2px] bg-orange-400 ring-1 ring-orange-600 ${GRID}`} />
  if (e === 3) return <span className={`${sm ? 'mt-0.5 mr-0.5 size-6 shadow-[3px_-3px_0_#be185d]' : 'mt-1 mr-1 size-10 shadow-[4px_-4px_0_#be185d]'} rounded-[2px] bg-pink-400 ring-1 ring-pink-700 ${GRID}`} />
  // on binlik: 10 binlik küp üst üste
  return (
    <span className={`${sm ? 'mt-0.5 mr-0.5 h-[60px] w-6 shadow-[3px_-3px_0_#6b21a8]' : 'mt-1 mr-1 h-[100px] w-10 shadow-[4px_-4px_0_#6b21a8]'} flex flex-col-reverse overflow-hidden rounded-[2px] bg-purple-500 ring-1 ring-purple-800`}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} className="flex-1 border-t border-white/50" />)}
    </span>
  )
}

export function Pile({ e, count, sm }: { e: number; count: number; sm?: boolean }) {
  return (
    <div className={`flex flex-wrap items-end justify-center gap-0.5 ${e === 0 ? 'w-[52px]' : ''}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => <Block key={i} e={e} sm={sm} />)}
    </div>
  )
}

/** Her basamağın blokları ayrı grupta */
export function BlockRow({ counts, label, color }: { counts: number[]; label?: string; color?: string }) {
  const es = counts.map((_, e) => e).reverse().filter((e) => counts[e] > 0)
  return (
    <div className="rounded-2xl bg-white/80 p-2 text-left ring-1 ring-line">
      {label && <p className="mb-1 text-sm font-black" style={{ color }}>{label}</p>}
      <div className="flex flex-wrap items-end gap-3">
        {es.map((e) => (
          <div key={e} className="flex flex-col items-center gap-1 p-1">
            <div className={e === 1 ? 'max-w-[90px]' : e === 0 ? '' : 'max-w-[240px]'}><Pile e={e} count={counts[e]} /></div>
            <span className="text-[11px] font-black whitespace-nowrap" style={{ color: PLACE[e].color }}>{counts[e]} {PLACE[e].unit}</span>
          </div>
        ))}
        {!es.length && <span className="text-sm font-bold text-ink-soft">Blok yok</span>}
      </div>
    </div>
  )
}

/**
 * Basamak sütunlarına bölünmüş blok altlığı: her sütun bir bırakma hedefi (mat-e).
 * 10’a ulaşan sütunun blokları tek bir “10’lu demet” olarak sürüklenir.
 */
export function BlockMat({ counts, dnd, wrong }: { counts: number[]; dnd: Dnd; wrong?: number | null }) {
  const top = Math.max(...counts.map((c, e) => (c ? e : 0)))
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {[4, 3, 2, 1, 0].map((e) => {
        const c = counts[e]
        return (
          <Drop key={e} dnd={dnd} id={`mat-${e}`} className={`flex min-h-[250px] flex-col items-center gap-1 rounded-2xl p-1.5 ring-1 ring-black/10 ${wrong === e ? 'animate-shake ring-4! ring-amber-400!' : ''}`} style={{ background: PLACE[e].soft }}>
            <p className="text-center text-[10px] leading-tight font-black uppercase sm:text-xs" style={{ color: PLACE[e].color }}>{PLACE[e].name}</p>
            <p className={`text-3xl font-black tabular-nums sm:text-4xl ${c >= 10 ? 'animate-pulse text-red-600' : ''}`} style={c >= 10 ? undefined : { color: e <= top ? PLACE[e].color : '#cbd5e1' }}>{e <= top ? c : '–'}</p>
            {c >= 10 ? (
              <Drag dnd={dnd} item="bundle" label={`10 ${PLACE[e].unit}: sürükle`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-1.5 ring-2 ring-red-400 animate-pop">
                <Pile e={e} count={10} sm />
                <span className="text-[10px] font-black text-red-600">10 {PLACE[e].unit}</span>
              </Drag>
            ) : (
              <Pile e={e} count={c} sm />
            )}
          </Drop>
        )
      })}
    </div>
  )
}

/* ───────────── on binlik kuleler ───────────── */

/**
 * Sayının bloklarını 10.000’lik kulelere doldurur: her kule 10 kat, her kat 1 binlik.
 * Yarım kalan kat, binliğin ne kadarının dolduğunu gösterir. value yoksa boş kule çerçevesi.
 */
export function Towers({ value, label, color, scale }: { value: number | null; label: string; color: string; scale: number }) {
  const v = value ?? 0
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-lg font-black tabular-nums" style={{ color }}>{label}</p>
      <div className="flex items-end gap-2">
        {Array.from({ length: scale }, (_, t) => {
          const full = value !== null && v >= (t + 1) * 10000
          return (
            <div key={t} className="flex flex-col items-center gap-1">
              <div className={`flex h-[150px] w-14 flex-col-reverse rounded-lg p-0.5 ring-2 ${full ? 'bg-purple-100 ring-purple-600' : value === null ? 'bg-white/60 ring-slate-300' : 'bg-white ring-slate-300'}`}>
                {Array.from({ length: 10 }, (_, k) => {
                  const f = Math.max(0, Math.min(1, (v - t * 10000 - k * 1000) / 1000))
                  return (
                    <div key={k} className="relative h-[14.5px] overflow-hidden border-t border-white">
                      <div className="h-full transition-[width] duration-700" style={{ width: `${f * 100}%`, background: full ? '#9333ea' : '#f472b6', transitionDelay: `${(t * 10 + k) * 60}ms` }} />
                    </div>
                  )
                })}
              </div>
              <span className={`text-[11px] font-black ${full ? 'text-purple-700' : 'text-slate-500'}`}>{value === null ? 'Kule' : full ? 'Dolu: 1 on binlik' : v > t * 10000 ? 'Dolmadı' : 'Boş'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── büyüteçli sayı doğrusu ───────────── */

/** Üstte 40.000–50.000, altta büyüteçle açılan 45.000–46.000 aralığı */
export function ZoomLine({ a, b, band, colors }: { a: number; b: number; band: [number, number]; colors: [string, string] }) {
  const W = 600
  const top = (v: number) => 20 + ((v - 40000) / 10000) * 560
  const X = (v: number) => 20 + ((v - 45000) / 1000) * 560
  const ticks = Array.from({ length: 11 }, (_, i) => 45000 + i * 100)
  return (
    <svg viewBox={`0 0 ${W} 200`} className="w-full" role="img" aria-label={`Sayı doğrusu: ${n(a)} ve ${n(b)}`}>
      <line x1={20} x2={580} y1={22} y2={22} stroke="#94a3b8" strokeWidth={3} />
      {[40000, 45000, 50000].map((v) => (
        <g key={v}>
          <line x1={top(v)} x2={top(v)} y1={15} y2={29} stroke="#64748b" strokeWidth={2} />
          <text x={top(v) + (v === 45000 ? -6 : 0)} y={44} textAnchor={v === 45000 ? 'end' : 'middle'} fontSize={12} fontWeight={800} fill="#64748b">{n(v)}</text>
        </g>
      ))}
      <rect x={top(45000)} y={12} width={top(46000) - top(45000)} height={20} rx={4} fill="#0ea5e922" stroke="#0284c7" strokeWidth={2} />
      <path d={`M${top(45000)} 32 L20 95 M${top(46000)} 32 L580 95`} stroke="#0284c7" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
      <rect x={14} y={95} width={572} height={2} fill="#0284c7" opacity={0.4} />
      <rect x={X(band[0])} y={112} width={X(band[1]) - X(band[0])} height={26} rx={6} fill="#ffedd5" stroke="#ea580c" strokeDasharray="4 3" />
      <line x1={20} x2={580} y1={125} y2={125} stroke="#334155" strokeWidth={3} />
      {ticks.map((v, i) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={117} y2={133} stroke="#334155" strokeWidth={i % 5 === 0 ? 3 : 1.5} />
          <text x={X(v)} y={152} textAnchor="middle" fontSize={11} fontWeight={i % 5 === 0 ? 900 : 700} fill="#475569">{i % 5 === 0 ? n(v) : `.${String(v).slice(2, 3)}00`}</text>
        </g>
      ))}
      {[{ v: a, c: colors[0], y: 102 }, { v: b, c: colors[1], y: 180 }].map((m, i) => (
        <g key={i} style={{ transition: 'transform 0.4s' }} transform={`translate(${X(m.v)} 0)`}>
          <circle cx={0} cy={125} r={8} fill={m.c} stroke="#fff" strokeWidth={2.5} />
          <rect x={-34} y={m.y - 15} width={68} height={22} rx={7} fill={m.c} />
          <text x={0} y={m.y} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{n(m.v)}</text>
        </g>
      ))}
    </svg>
  )
}

/* ───────────── sürüklemeli soru kartı ───────────── */

export interface Opt { label: string; ok?: boolean; nudge?: string; mis?: string }
export interface Ask { q: string; options: Opt[] }
type Checks = ReturnType<typeof useChecks>

/** Cevap kartı “Cevabın” yuvasına sürüklenir; yanlış kart geri döner ve düşündüren bir soru çıkar */
export function DragAsk({ ask, checks, onOk, okText = 'Evet! Model de bunu gösteriyor.' }: { ask: Ask; checks: Checks; onOk: (i: number) => void; okText?: string }) {
  const track = useTracker()
  const [placed, setPlaced] = useState<number | null>(null)
  const [miss, setMiss] = useState<{ i: number; k: number } | null>(null)
  const dnd = useDnd((item, target) => {
    if (target !== 'ans' || placed !== null) return false
    const i = Number(item.slice(4))
    if (ask.options[i].ok) {
      track.attempt(true)
      sfx.ok()
      setPlaced(i)
      setMiss(null)
      window.setTimeout(() => onOk(i), 700)
      return
    }
    checks.fail()
    setMiss((m) => ({ i, k: (m?.k ?? 0) + 1 }))
    return false
  })
  const o = miss ? ask.options[miss.i] : null
  return (
    <Card>
      <p className="mb-2 flex items-start gap-2 font-extrabold"><BookOpen size={18} className="mt-0.5 shrink-0 text-pink-600" />{ask.q}</p>
      <Drop dnd={dnd} id="ans" className={`mb-2 grid min-h-16 place-items-center rounded-2xl border-2 border-dashed px-3 py-2 text-center ${placed !== null ? 'border-emerald-400 bg-emerald-50' : 'border-sky-400 bg-sky-50'}`}>
        {placed !== null ? <span className="text-base font-black text-emerald-800 animate-pop">{ask.options[placed].label}</span> : <span className="text-sm font-black text-sky-600">Cevap kartını buraya sürükle</span>}
      </Drop>
      <div className="grid gap-2">
        {ask.options.map((x, i) =>
          i === placed ? null : (
            <Drag key={i} dnd={dnd} item={`opt-${i}`} label={x.label} disabled={placed !== null} className={`min-h-14 w-full rounded-2xl bg-white px-3 py-2 text-left text-base font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line ${miss?.i === i ? 'animate-shake' : ''}`}>
              <span className="mr-2 text-slate-400" aria-hidden>⠿</span>{x.label}
            </Drag>
          ),
        )}
      </div>
      {o && <div className="mt-2"><Nudge key={miss!.k} question={o.nudge ?? 'Modele tekrar bak.'} misconception={o.mis} /></div>}
      {placed !== null && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-pop">{okText}</p>}
    </Card>
  )
}

export function RulesFound({ rules }: { rules: string[] }) {
  return (
    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-950 ring-2 ring-emerald-400 animate-fade-up">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black tracking-wide uppercase"><Sparkles size={15} />Keşfettiğin kural</p>
      <ul className="space-y-1">
        {rules.map((r) => <li key={r} className="flex gap-2 text-[15px] font-extrabold"><span aria-hidden>✓</span>{r}</li>)}
      </ul>
    </div>
  )
}
