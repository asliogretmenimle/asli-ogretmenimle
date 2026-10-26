import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { Eye, LayoutGrid, Shuffle, Trash2, X } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { ek } from '../../lib/generators'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Nokta Kartları — hızlı bakışla sayı algısı (subitizing) ve parça-parça-bütün.
 *  Gör ve Kur: kart birkaç saniye görünür, sonra kapanır. Öğrenci boş karta dokunarak aynı sayıda nokta koyar
 *   (noktaya dokununca silinir; “Düzenle” noktaları onluk çerçeveye dizer). “Karşılaştır” iki kartı yan yana açar
 *   ve kartın yapısını yazar (ör. 8 = 5 + 3, 10’dan 2 eksik).
 *  Birleştir: hedef sayıyı iki nokta kartıyla oluştur; parça-parça-bütün şemasında görünür, bulunan yollar listelenir.
 *  Dizilişler: zar, beşlik/onluk çerçeve, dağınık, iki renk.
 *
 * Hedef biçimleri:
 *  { count, arr?, flash? }        → gösterilen kartı (count nokta) boş karta kur. arr: 'zar'|'besli'|'daginik'|'ikirenk', flash: saniye (vars. 2)
 *  { count, compose: true }       → iki kartla count’u oluştur
 *  { count, compose: true, ways } → count’u en az `ways` farklı biçimde oluştur
 */
type Arr = 'zar' | 'besli' | 'daginik' | 'ikirenk'
type Mode = 'flash' | 'compose'
type V = { mode: Mode; count: number; arr: Arr; seed: number; built: [number, number][]; picks: number[]; found: string[] }

const ARRS: { id: Arr; label: string }[] = [
  { id: 'zar', label: 'Zar' },
  { id: 'besli', label: 'Beşlik' },
  { id: 'daginik', label: 'Dağınık' },
  { id: 'ikirenk', label: 'İki renk' },
]
const RED = '#ef4444', BLUE = '#3b82f6', INK = '#1f2340'
const DICE: Record<number, [number, number][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

type Dot = { x: number; y: number; c: string }

/** küçük grup: zar deseni (≤6) ya da 3’lü sıralar; (cx, cy) merkezli, adım s */
function cluster(k: number, cx: number, cy: number, s: number, c: string): Dot[] {
  if (k <= 6) return DICE[k].map(([i, j]) => ({ x: cx + (i - 1) * s, y: cy + (j - 1) * s, c }))
  const cols = 3, rows = Math.ceil(k / cols)
  return Array.from({ length: k }, (_, i) => ({ x: cx + ((i % cols) - 1) * s, y: cy + (Math.floor(i / cols) - (rows - 1) / 2) * s, c }))
}

/** onluk çerçeve hücreleri (kapasite 5, 10 ya da 20) */
function frameCells(k: number) {
  const cap = k <= 5 ? 5 : k <= 10 ? 10 : 20
  return frameDots(cap).map((d) => ({ x: d.x - 17, y: d.y - 17 }))
}

function frameDots(k: number, c = RED, c2 = BLUE): Dot[] {
  const cell = 34, frames = k > 10 ? 2 : 1
  const out: Dot[] = []
  for (let i = 0; i < k; i++) {
    const f = Math.floor(i / 10), j = i % 10
    const rows = k <= 5 ? 1 : 2
    const h = frames * rows * cell + (frames - 1) * 14
    const y0 = 100 - h / 2 + f * (2 * cell + 14)
    out.push({ x: 100 - 2.5 * cell + (j % 5) * cell + cell / 2, y: y0 + Math.floor(j / 5) * cell + cell / 2, c: i < 10 ? c : c2 })
  }
  return out
}

function layout(count: number, arr: Arr, seed: number): { dots: Dot[]; parts: number[] } {
  const k = Math.max(0, count)
  if (k === 0) return { dots: [], parts: [] }
  if (arr === 'besli') return { dots: frameDots(k), parts: k > 10 ? [10, k - 10] : k > 5 ? [5, k - 5] : [k] }
  if (arr === 'zar') {
    if (k <= 6) return { dots: cluster(k, 100, 100, 50, RED), parts: [k] }
    const a = Math.ceil(k / 2), b = k - a
    return { dots: [...cluster(a, 55, 100, 30, RED), ...cluster(b, 145, 100, 30, RED)], parts: [a, b] }
  }
  const r = rng(seed * 97 + k * 13)
  if (arr === 'ikirenk') {
    const a = k === 1 ? 1 : 1 + Math.floor(r() * (k - 1)), b = k - a
    return { dots: [...cluster(a, b ? 55 : 100, 100, 30, RED), ...cluster(b, 145, 100, 30, BLUE)], parts: b ? [a, b] : [a] }
  }
  const pts: Dot[] = []
  let guard = 0
  while (pts.length < k && guard++ < 5000) {
    const p = { x: 24 + r() * 152, y: 24 + r() * 152, c: RED }
    if (pts.every((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 > (k > 12 ? 30 : 38) ** 2)) pts.push(p)
  }
  return { dots: pts, parts: [k] }
}

function CardSvg({ dots, back, onTap, label, small, highlight, frame }: { dots: Dot[]; back?: boolean; onTap?: (x: number, y: number) => void; label: string; small?: boolean; highlight?: boolean; frame?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const down = (e: RPE<SVGSVGElement>) => {
    if (!onTap) return
    const b = ref.current!.getBoundingClientRect()
    onTap(((e.clientX - b.left) / b.width) * 200, ((e.clientY - b.top) / b.height) * 200)
  }
  return (
    <svg ref={ref} viewBox="0 0 200 200" className="block w-full select-none" role="img" aria-label={label} onPointerDown={down} style={{ touchAction: onTap ? 'none' : 'auto', cursor: onTap ? 'pointer' : 'default' }}>
      <defs>
        <radialGradient id="nk-red" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#fca5a5" /><stop offset="45%" stopColor={RED} /><stop offset="100%" stopColor="#b91c1c" /></radialGradient>
        <radialGradient id="nk-blue" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#93c5fd" /><stop offset="45%" stopColor={BLUE} /><stop offset="100%" stopColor="#1d4ed8" /></radialGradient>
        <pattern id="nk-back" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="#d6457a" /><rect width="8" height="16" fill="#e2659a" /></pattern>
      </defs>
      <rect x={3} y={3} width={194} height={194} rx={18} fill={back ? 'url(#nk-back)' : '#fff'} stroke={highlight ? '#d6457a' : '#d9dbea'} strokeWidth={highlight ? 5 : 3} />
      {back ? (
        <g>
          <rect x={22} y={22} width={156} height={156} rx={12} fill="none" stroke="#fff" strokeWidth={3} opacity={0.7} />
          <text x={100} y={122} textAnchor="middle" fontSize={64} fontWeight={900} fill="#fff">?</text>
        </g>
      ) : (
        <>
          {frame ? frameCells(frame).map((c, i) => <rect key={`f${i}`} x={c.x} y={c.y} width={34} height={34} fill="#fff7ed" stroke="#1f2340" strokeOpacity={0.55} strokeWidth={2} />) : null}
          {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={small ? (frame ? 14 : 21) : 13} fill={d.c === BLUE ? 'url(#nk-blue)' : 'url(#nk-red)'} stroke={INK} strokeOpacity={0.25} strokeWidth={1} />)}
        </>
      )}
    </svg>
  )
}

function structure(count: number, arr: Arr, parts: number[]): string[] {
  const out: string[] = []
  if (parts.length === 2) out.push(`${count} = ${parts[0]} + ${parts[1]}${arr === 'ikirenk' ? ' (kırmızı + mavi)' : arr === 'besli' ? (parts[0] === 10 ? ' (dolu onluk + kalan)' : ' (dolu beşlik + kalan)') : ' (iki grup)'}`)
  if (arr === 'besli' && count < 10 && count > 5) out.push(`10’dan ${10 - count} eksik`)
  if (arr === 'zar' && parts.length === 2 && parts[0] === parts[1]) out.push(`İkizler: ${parts[0]} + ${parts[0]}`)
  if (arr === 'daginik' && count > 4) out.push('Dağınık noktaları küçük gruplara ayırarak gör: ör. 3 + 3 + …')
  if (parts.length === 1 && count <= 6 && arr !== 'daginik') out.push(`Zar deseni: ${count} saymadan görülür`)
  return out
}

function useTimer() {
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  return (fn: () => void, ms: number) => { window.clearTimeout(t.current); t.current = window.setTimeout(fn, ms) }
}

type Phase = 'ready' | 'show' | 'hidden' | 'compare'

function FlashMode({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; target?: Record<string, unknown>; locked?: boolean }) {
  const secs = target && typeof target.flash === 'number' ? n(target, 'flash') : 2
  const [phase, setPhase] = useState<Phase>('ready')
  const [peeks, setPeeks] = useState(0)
  const [dur, setDur] = useState(secs)
  const later = useTimer()
  const free = !target
  const { dots, parts } = layout(value.count, value.arr, value.seed)
  const showCard = () => {
    setPeeks((k) => k + 1)
    setPhase('show')
    later(() => setPhase('hidden'), (free ? dur : secs) * 1000)
  }
  const tapBuilt = (x: number, y: number) => {
    if (locked || phase === 'compare') return
    const near = value.built.findIndex(([bx, by]) => (bx - x) ** 2 + (by - y) ** 2 < 22 ** 2)
    if (near >= 0) return onChange({ ...value, built: value.built.filter((_, i) => i !== near) })
    if (value.built.length >= 20) return
    const cx = Math.max(18, Math.min(182, x)), cy = Math.max(18, Math.min(182, y))
    onChange({ ...value, built: [...value.built, [Math.round(cx), Math.round(cy)]] })
  }
  const tidied = value.built.length > 0 && value.built.every(([x, y], i) => { const d = frameDots(value.built.length)[i]; return d.x === x && d.y === y })
  const tidy = () => onChange({ ...value, built: frameDots(value.built.length).map((d) => [d.x, d.y] as [number, number]) })
  const builtDots: Dot[] = value.built.map(([x, y], i) => ({ x, y, c: i < 10 ? RED : BLUE }))
  const newCard = () => {
    const count = 3 + Math.floor(Math.random() * 8)
    const arr = ARRS[Math.floor(Math.random() * 4)].id
    onChange({ ...value, count, arr, seed: Math.floor(Math.random() * 1e6), built: [] })
    setPhase('ready')
  }
  const visible = phase === 'show' || phase === 'compare' || !!locked
  const diff = value.built.length - value.count

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Nokta kartı</span>
          <div className="relative w-full max-w-72">
            <CardSvg dots={dots} frame={value.arr === 'besli' ? value.count : 0} back={!visible} label={visible ? `${value.count} noktalı kart` : 'Kapalı kart'} highlight={phase === 'show'} />
            {phase === 'show' && (
              <div className="absolute inset-x-4 bottom-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full bg-brand" style={{ animation: `nk-count ${(free ? dur : secs)}s linear forwards` }} />
                <style>{'@keyframes nk-count { from { width: 100% } to { width: 0% } }'}</style>
              </div>
            )}
          </div>
          <ToolButton onClick={showCard} disabled={locked || phase === 'show' || phase === 'compare'}><Eye size={16} />{peeks ? 'Bir daha göster' : 'Kartı göster'}</ToolButton>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Senin kartın</span>
          <div className="w-full max-w-72">
            <CardSvg dots={builtDots} frame={tidied ? value.built.length : 0} onTap={locked ? undefined : tapBuilt} label={`Senin kartın: ${value.built.length} nokta`} highlight={phase === 'hidden' && !value.built.length} />
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <ToolButton onClick={tidy} disabled={locked || !value.built.length}><LayoutGrid size={16} />Düzenle</ToolButton>
            <ToolButton onClick={() => onChange({ ...value, built: [] })} disabled={locked || !value.built.length}><Trash2 size={16} /><span className="sr-only">Temizle</span></ToolButton>
          </div>
        </div>
      </div>
      <p className="text-center text-sm font-bold text-ink-soft">
        {phase === 'ready' ? '“Kartı göster”e bas, iyi bak: kart kısa süre sonra kapanacak.' : phase === 'show' ? 'İyi bak! Sayma, gruplara bak.' : 'Kendi kartına dokunarak aynı sayıda nokta koy. Noktaya dokunursan silinir.'}
      </p>

      {free && (
        <div className="flex flex-wrap items-end justify-center gap-2">
          <Stepper label="Nokta" value={value.count} onDec={() => { onChange({ ...value, count: Math.max(1, value.count - 1) }); setPhase('ready') }} onInc={() => { onChange({ ...value, count: Math.min(value.arr === 'besli' ? 20 : 12, value.count + 1) }); setPhase('ready') }} />
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Diziliş</span>
            <div className="flex flex-wrap justify-center gap-1">
              {ARRS.map((a) => <ToolButton key={a.id} active={value.arr === a.id} onClick={() => { onChange({ ...value, arr: a.id, count: a.id !== 'besli' ? Math.min(12, value.count) : value.count, seed: value.seed + 1 }); setPhase('ready') }}>{a.label}</ToolButton>)}
            </div>
          </div>
        </div>
      )}
      {free && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Süre</span>
          {[1, 2, 3].map((s) => <ToolButton key={s} active={dur === s} onClick={() => setDur(s)}>{s} sn</ToolButton>)}
          <ToolButton onClick={newCard}><Shuffle size={16} />Yeni kart</ToolButton>
          <ToolButton active={phase === 'compare'} onClick={() => setPhase(phase === 'compare' ? 'hidden' : 'compare')} disabled={phase === 'ready' && !value.built.length}>Karşılaştır</ToolButton>
        </div>
      )}

      {((free && phase === 'compare') || locked) && (
        <div className="w-full max-w-xl rounded-2xl bg-ink px-4 py-3 text-center text-white">
          <div className="text-lg font-black">
            Kartta {value.count}, sende {value.built.length}
            <span className={`ml-2 rounded-lg px-2 py-0.5 text-sm ${diff === 0 ? 'bg-ok text-white' : 'bg-amber-400 text-ink'}`}>{diff === 0 ? 'Aynı!' : diff > 0 ? `${diff} fazla` : `${-diff} eksik`}</span>
          </div>
          {structure(value.count, value.arr, parts).map((t) => <div key={t} className="mt-1 text-base font-extrabold text-white/85">{t}</div>)}
          {diff === 0 && <div className="mt-1 text-sm font-bold text-amber-300">Nasıl gördün? Hangi grupları fark ettin?</div>}
        </div>
      )}
    </div>
  )
}

function PartBox({ k, label, onTap, tone }: { k?: number; label: string; onTap?: () => void; tone: string }) {
  return (
    <button type="button" onClick={onTap} disabled={k === undefined || !onTap} aria-label={label} className="relative w-full rounded-2xl p-1.5 ring-2 transition active:scale-95" style={{ background: `${tone}12`, ['--tw-ring-color' as string]: `${tone}66` }}>
      {k !== undefined ? <CardSvg dots={layout(k, 'zar', 1).dots.map((d) => ({ ...d, c: tone === BLUE ? BLUE : RED }))} label={`${k} nokta`} small /> : <div className="grid aspect-square place-items-center rounded-xl border-2 border-dashed text-sm font-extrabold" style={{ borderColor: `${tone}66`, color: tone }}>parça</div>}
      {k !== undefined && onTap && <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-white shadow ring-1 ring-line"><X size={14} /></span>}
    </button>
  )
}

function ComposeMode({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; target?: Record<string, unknown>; locked?: boolean }) {
  const free = !target
  const T = value.count
  const [a, b] = value.picks
  const both = value.picks.length === 2
  const sum = (a ?? 0) + (b ?? 0)
  const pick = (k: number) => {
    if (locked || both) return
    const picks = [...value.picks, k]
    let found = value.found
    if (picks.length === 2 && picks[0] + picks[1] === T) {
      const key = [...picks].sort((x, y) => x - y).join('+')
      if (!found.includes(key)) found = [...found, key]
    }
    onChange({ ...value, picks, found })
  }
  const unpick = (i: number) => !locked && onChange({ ...value, picks: value.picks.filter((_, j) => j !== i) })
  const deck = Array.from({ length: Math.min(10, Math.max(T, 9)) }, (_, i) => i + 1)
  const ways = Math.floor(T / 2)

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* parça-parça-bütün */}
      <div className="w-full max-w-md">
        <div className="mx-auto grid w-2/3 place-items-center rounded-2xl bg-ink py-3 text-white">
          <span className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Bütün</span>
          <span className="text-4xl font-black tabular-nums">{T}</span>
        </div>
        <svg viewBox="0 0 300 40" className="block w-full" aria-hidden><path d="M150 0 L75 40 M150 0 L225 40" stroke={INK} strokeWidth={3} strokeLinecap="round" /></svg>
        <div className="grid grid-cols-2 gap-6 px-4">
          <PartBox k={a} label={a ? `Birinci parça ${a}, geri almak için dokun` : 'Birinci parça boş'} onTap={() => unpick(0)} tone={RED} />
          <PartBox k={b} label={b ? `İkinci parça ${b}, geri almak için dokun` : 'İkinci parça boş'} onTap={() => unpick(1)} tone={BLUE} />
        </div>
      </div>
      {both && (free || locked) && (
        <div className={`rounded-2xl px-4 py-2 text-center text-xl font-black tabular-nums ${sum === T ? 'bg-ok-soft text-ok' : 'bg-amber-50 text-amber-800'}`}>
          {a} + {b} = {sum}{sum === T ? ' ✓' : sum > T ? ` · ${ek(T, 'abl')} ${sum - T} fazla` : ` · ${ek(T, 'abl')} ${T - sum} eksik`}
        </div>
      )}
      {both && !locked && <ToolButton onClick={() => onChange({ ...value, picks: [] })}>Yeni deneme</ToolButton>}
      <p className="text-center text-sm font-bold text-ink-soft">{both ? 'Parçaya dokunarak kartı geri alabilirsin.' : `İki kart seç: birlikte ${ek(T, 'acc')} yapsınlar.`}</p>
      <div className="grid w-full max-w-2xl grid-cols-5 gap-2">
        {deck.map((k) => (
          <button key={k} type="button" onClick={() => pick(k)} disabled={locked || both} aria-label={`${k} noktalı kart`} className="rounded-2xl transition active:scale-95 disabled:opacity-60">
            <CardSvg dots={layout(k, k > 5 ? 'besli' : 'zar', 1).dots} frame={k > 5 ? k : 0} label={`${k} nokta`} small />
          </button>
        ))}
      </div>
      {free && (
        <div className="flex flex-wrap items-end justify-center gap-2">
          <Stepper label="Bütün" value={T} onDec={() => onChange({ ...value, count: Math.max(2, T - 1), picks: [], found: [] })} onInc={() => onChange({ ...value, count: Math.min(10, T + 1), picks: [], found: [] })} />
        </div>
      )}
      {(free || locked || typeof target?.ways === 'number') && value.found.length > 0 && (
        <div className="w-full max-w-xl rounded-2xl bg-ink px-4 py-3 text-center text-white">
          <div className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Bulduğun yollar ({value.found.length}/{ways})</div>
          <div className="mt-1 flex flex-wrap justify-center gap-2 text-lg font-black tabular-nums">
            {value.found.map((f) => <span key={f} className="rounded-lg bg-white/10 px-2.5 py-0.5">{f.replace('+', ' + ')}</span>)}
          </div>
          <div className="mt-1 text-sm font-bold text-amber-300">{value.found.length < ways ? 'Başka bir yol bul!' : `Hepsini buldun! ${ways} + ${T - ways} ile ${T - ways} + ${ways} aynı parçalardır, yalnızca yerleri değişir.`}</div>
        </div>
      )}
    </div>
  )
}

function Component({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; config: ManipulativeConfig; target?: Record<string, unknown>; locked?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {!target && (
        <div className="flex gap-1.5 rounded-2xl bg-paper p-1 ring-1 ring-line">
          <ToolButton active={value.mode === 'flash'} onClick={() => onChange({ ...value, mode: 'flash' })}>Gör ve kur</ToolButton>
          <ToolButton active={value.mode === 'compose'} onClick={() => onChange({ ...value, mode: 'compose', picks: [], found: [] })}>İki kartla yap</ToolButton>
        </div>
      )}
      {value.mode === 'flash' ? <FlashMode key={`${value.count}-${value.arr}-${value.seed}`} value={value} onChange={onChange} target={target} locked={locked} /> : <ComposeMode value={value} onChange={onChange} target={target} locked={locked} />}
    </div>
  )
}

export const noktakartlari: ToolDef<V> = {
  id: 'noktakartlari',
  defaultConfig: {},
  initial: (_c, target) => {
    const arr = (target && typeof target.arr === 'string' && ARRS.some((a) => a.id === target.arr) ? target.arr : 'zar') as Arr
    const count = target ? n(target, 'count', 5) : 5
    return { mode: target?.compose ? 'compose' : 'flash', count, arr, seed: target ? count * 7 + 3 : 7, built: [], picks: [], found: [] }
  },
  check: (v, t) => {
    const T = n(t, 'count')
    if (t.compose) {
      if (typeof t.ways === 'number') return v.found.length >= n(t, 'ways')
      return v.picks.length === 2 && v.picks[0] + v.picks[1] === T
    }
    return v.built.length === T
  },
  Component,
}
