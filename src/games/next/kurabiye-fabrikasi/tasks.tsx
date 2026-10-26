import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import { Minus, MoveDiagonal2, Plus, RotateCw, Scissors, Send, Truck, Undo2 } from 'lucide-react'
import type { Grade, ManipulativeTool } from '../../../data/types'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { clamp } from '../../../interactive/axis'
import { ek } from '../../../lib/generators'
import { useWidth } from '../../kit'
import { Cookie, hitZone, useDragDrop, type CookieTone } from './parts'

/* ───────────── Görevlerin ana oyunla konuştuğu arayüz ───────────── */

export interface Extra {
  rows?: number
  cols?: number
  split?: { dir: 'r' | 'c'; k: number }
}

export interface TaskApi {
  grade: Grade
  /** Kontrol denemesi (öğretmen raporu) */
  report: (ok: boolean) => void
  /** Yeni çözüm mü? true → kaydedildi */
  found: (key: string, label: string, extra?: Extra) => boolean
  has: (key: string) => boolean
  nudge: (q: string | null, o?: { tool?: ManipulativeTool; misc?: string; tone?: 'ok' | 'think' }) => void
  say: (t: string, mood?: 'idle' | 'happy' | 'think') => void
  strategy: (s: string) => void
  /** Kendi tamamlanma koşulu olan görevler için */
  complete: () => void
  done: boolean
}

/** 10 → “10’luk”, 5 → “5’lik” */
const lik = (n: number) => `${n}’l${ek(n, 'acc', false).slice(-1)}k`

const plusChain = (v: number, k: number) => (k <= 6 ? Array(k).fill(v).join(' + ') : `${v} + ${v} + … + ${v} (${k} tane)`)

/** Görsel model alanı: iki parmakla yakınlaştırılabilir */
function Stage({ children }: { children: ReactNode }) {
  return (
    <ZoomBox maxScale={3} className="mt-3">
      <div className="rounded-2xl bg-[linear-gradient(180deg,#fffaf3,#fdf0e1)] p-2 pb-11 ring-1 ring-orange-100 sm:p-3 sm:pb-11">{children}</div>
    </ZoomBox>
  )
}

function Stepper({ label, value, onDec, onInc, decDisabled, incDisabled }: { label: ReactNode; value: ReactNode; onDec: () => void; onInc: () => void; decDisabled?: boolean; incDisabled?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-white px-2 py-1.5 ring-1 ring-line">
      <span className="px-1 text-sm font-extrabold text-ink-soft">{label}</span>
      <button type="button" onClick={onDec} disabled={decDisabled} className="grid size-12 place-items-center rounded-xl bg-amber-100 text-amber-900 active:scale-95 disabled:opacity-30" aria-label={`${typeof label === 'string' ? label : ''} azalt`}><Minus size={22} strokeWidth={3} /></button>
      <span className="min-w-9 text-center text-2xl font-black tabular-nums">{value}</span>
      <button type="button" onClick={onInc} disabled={incDisabled} className="grid size-12 place-items-center rounded-xl bg-amber-100 text-amber-900 active:scale-95 disabled:opacity-30" aria-label={`${typeof label === 'string' ? label : ''} artır`}><Plus size={22} strokeWidth={3} /></button>
    </div>
  )
}

function Readout({ lines, big }: { lines: ReactNode[]; big?: ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl bg-[#3b2414] px-4 py-3 text-center text-amber-50 shadow-inner">
      {lines.map((l, i) => <p key={i} className="text-[15px] font-bold text-amber-100/90 sm:text-base">{l}</p>)}
      {big && <p className="mt-0.5 text-2xl font-black tracking-wide tabular-nums sm:text-3xl">{big}</p>}
    </div>
  )
}

function useMaxH() {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight))
  useEffect(() => {
    const f = () => setH(window.innerHeight)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return clamp(h - 420, 260, 560)
}

/* ═════════════ 1) Tepsi dizilimi (satır × sütun) ═════════════ */

export interface ArrayLevel {
  kind: 'array'
  n: number
  max: number
  /** Kutu boyu sabit (bölme: kaç kutu?) */
  fixedCols?: number
  start?: [number, number]
}

export function ArrayTask({ level, api }: { level: ArrayLevel; api: TaskApi }) {
  const { grade } = api
  const [wrapRef, w] = useWidth<HTMLDivElement>()
  const maxH = useMaxH()
  const [dims, setDims] = useState<[number, number]>(level.start ?? [2, level.fixedCols ?? 2])
  const [rows, cols] = dims
  const [baked, setBaked] = useState(false)
  const [spin, setSpin] = useState(false)
  const lastRot = useRef(false)
  const prev = useRef<[number, number] | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const M = level.max
  const LM = 40, RM = 50, TM = 34
  const cell = Math.floor(clamp(Math.min((w - LM - RM - 8) / M, maxH / M), 22, 60))
  const total = rows * cols
  const fixed = level.fixedCols

  const resize = (r: number, c: number) => {
    const nr = clamp(r, 1, M), nc = fixed ?? clamp(c, 1, M)
    if (nr === rows && nc === cols) return
    setDims([nr, nc])
    setBaked(false)
    lastRot.current = false
    api.nudge(null)
  }

  const rotate = () => {
    if (spin || fixed) return
    setSpin(true)
    setBaked(false)
    window.setTimeout(() => {
      setDims(([r, c]) => [c, r])
      setSpin(false)
      lastRot.current = true
    }, 520)
  }

  // Tepsi köşesini sürükle
  const onHandleDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const id = e.pointerId
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id || !gridRef.current) return
      const r = gridRef.current.getBoundingClientRect()
      const cp = r.width / M
      resize(Math.round((ev.clientY - r.top) / cp), Math.round((ev.clientX - r.left) / cp))
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  // güncel boyutlarla çalışsın diye resize'ı ref'te tut
  const resizeRef = useRef(resize)
  resizeRef.current = resize

  // İki parmakla döndür
  const rotAcc = useRef({ a0: 0, done: false })
  useGesture(
    {
      onPinch: ({ offset: [, a], first, event }) => {
        event?.stopPropagation?.()
        event?.preventDefault?.()
        if (first) rotAcc.current = { a0: a, done: false }
        if (!rotAcc.current.done && Math.abs(a - rotAcc.current.a0) > 35) {
          rotAcc.current.done = true
          rotate()
        }
      },
    },
    { target: trayRef, eventOptions: { passive: false } },
  )

  const ship = () => {
    if (total !== level.n) {
      api.report(false)
      const diff = total - level.n
      api.say(diff > 0 ? 'Tepsi taşıyor!' : 'Tepside boş yer kaldı…', 'think')
      api.nudge(
        diff > 0
          ? `Tepside ${total} kurabiye var, sipariş ${level.n}. ${diff} fazla! Her sırada yine aynı sayıda kurabiye kalacak şekilde nasıl küçültebilirsin?`
          : `Tepside ${total} kurabiye var, sipariş ${level.n}. ${-diff} eksik. Bir sıra ya da bir sütun eklesen ne olur?`,
        { tool: grade === 1 ? 'tenframe' : 'dizilim' },
      )
      return
    }
    const key = `${rows}x${cols}`
    if (api.has(key)) {
      api.say('Bu düzen zaten gönderildi.', 'think')
      api.nudge(`${rows} sıra ${ek(cols, 'dist')} düzenini zaten gönderdin. Sıra sayısını değiştirirsen her sırada kaç kurabiye olmalı?`)
      return
    }
    api.report(true)
    const label = fixed ? (grade >= 3 ? `${level.n} ÷ ${cols} = ${rows}` : `${rows} kutu, ${ek(cols, 'dist')}`) : grade === 1 ? `${rows} tane ${cols}` : `${rows} × ${cols}`
    api.found(key, label, { rows, cols })
    setBaked(true)
    const p = prev.current
    if (lastRot.current) api.strategy('Tepsiyi döndürme (değişme özelliği)')
    else if (p && ((p[0] * 2 === rows && p[1] === cols * 2) || (p[0] === rows * 2 && p[1] * 2 === cols))) api.strategy('Yarılama ve ikiye katlama')
    prev.current = [rows, cols]
    const rotTwin = api.has(`${cols}x${rows}`) && rows !== cols
    api.say(rotTwin ? `${cols} × ${rows} ile ${rows} × ${cols} aynı sayıda kurabiye!` : 'Fırına gitti! Bir düzen daha?', 'happy')
    api.nudge(
      rotTwin
        ? `${rows} × ${cols} tepsi, ${cols} × ${rows} tepsinin döndürülmüşü. Kurabiye sayısı değişti mi? Neden?`
        : fixed
          ? `${level.n} kurabiyede ${rows} tane ${cols} var: ${rows} kutu doldu.`
          : 'Harika düzen! Aynı kurabiyeleri başka nasıl dizebilirsin?',
      { tone: 'ok' },
    )
  }

  const tone: CookieTone = baked ? 'baked' : 'raw'
  const cs = Math.round(cell * 0.86)

  return (
    <div ref={wrapRef}>
      <Stage>
        <div className="mb-1 flex flex-wrap items-center justify-center gap-2 text-sm font-black">
          <span className="chip bg-orange-500 px-3 py-1 text-sm text-white">Sipariş: {level.n} kurabiye</span>
          <span className={`chip px-3 py-1 text-sm transition-colors ${total === level.n ? 'bg-ok text-white' : 'bg-white text-ink ring-1 ring-line'}`}>Tepside: {total}</span>
        </div>
        <div className="relative mx-auto select-none" style={{ width: LM + M * cell + RM, height: TM + M * cell + 14 }}>
          {/* boş ızgara */}
          <div
            ref={gridRef}
            className="absolute rounded-xl"
            style={{ left: LM, top: TM, width: M * cell, height: M * cell, backgroundImage: 'radial-gradient(circle, #e8c9a0 2.2px, transparent 2.6px)', backgroundSize: `${cell}px ${cell}px`, backgroundColor: '#fff7ec' }}
          />
          {/* üst ve sol ölçüler */}
          {!spin && (
            <>
              <div className="absolute flex items-center justify-center text-sm font-black text-orange-700" style={{ left: LM, top: 4, width: cols * cell, height: 24 }}>
                <span className="absolute inset-x-1 top-1/2 h-0.5 bg-orange-300" />
                <span className="relative rounded-full bg-white px-2 ring-1 ring-orange-200">{cols * cell < 110 ? cols : grade === 1 ? `her sırada ${cols}` : `${cols} sütun`}</span>
              </div>
              <div className="absolute flex items-center justify-center" style={{ left: 2, top: TM, width: LM - 6, height: rows * cell }}>
                <span className="absolute inset-y-1 left-1/2 w-0.5 bg-orange-300" />
                <span className="relative rounded-full bg-white px-1.5 text-sm font-black text-orange-700 ring-1 ring-orange-200">{rows}</span>
              </div>
            </>
          )}
          {/* tepsi */}
          <div
            ref={trayRef}
            data-handle
            className="absolute rounded-xl bg-[linear-gradient(145deg,#f1f5f9,#cbd5e1)] shadow-[0_6px_14px_rgb(15_23_42/.25),inset_0_0_0_3px_#94a3b8]"
            style={{
              left: LM - 4,
              top: TM - 4,
              width: cols * cell + 8,
              height: rows * cell + 8,
              touchAction: 'none',
              transformOrigin: '0 0',
              transform: spin ? `translateX(${rows * cell + 8}px) rotate(90deg)` : 'none',
              transition: spin ? 'transform 500ms cubic-bezier(.5,0,.3,1)' : 'width 120ms, height 120ms',
            }}
          >
            <div className="grid p-1" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px` }}>
              {Array.from({ length: total }, (_, i) => {
                const r = Math.floor(i / cols), c = i % cols
                return (
                  <div key={`${r}-${c}`} className="grid place-items-center animate-pop">
                    <Cookie size={cs} tone={tone} seed={r * 3 + c} className="transition-[filter] duration-500" />
                  </div>
                )
              })}
            </div>
          </div>
          {/* sıra sonları: ritmik sayma */}
          {!spin &&
            Array.from({ length: rows }, (_, r) => (
              <span key={r} className="absolute grid h-7 min-w-8 -translate-y-1/2 place-items-center rounded-full bg-amber-400 px-1.5 text-sm font-black text-amber-950 shadow-sm" style={{ left: LM + cols * cell + 10, top: TM + r * cell + cell / 2 }}>
                {(r + 1) * cols}
              </span>
            ))}
          {/* köşe tutamacı */}
          {!spin && (
            <button
              type="button"
              data-handle
              onPointerDown={onHandleDown}
              className="absolute z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 cursor-grab sm:size-14 place-items-center rounded-full bg-orange-500 text-white shadow-lg ring-4 ring-white active:scale-95 active:cursor-grabbing"
              style={{ left: LM + cols * cell, top: TM + rows * cell, touchAction: 'none' }}
              aria-label="Tepsiyi büyüt ya da küçült (sürükle)"
            >
              <MoveDiagonal2 size={24} strokeWidth={3} />
            </button>
          )}
        </div>
      </Stage>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Stepper label={fixed ? 'Kutu' : 'Sıra'} value={rows} onDec={() => resizeRef.current(rows - 1, cols)} onInc={() => resizeRef.current(rows + 1, cols)} decDisabled={rows <= 1} incDisabled={rows >= M} />
        {!fixed && <Stepper label="Her sırada" value={cols} onDec={() => resizeRef.current(rows, cols - 1)} onInc={() => resizeRef.current(rows, cols + 1)} decDisabled={cols <= 1} incDisabled={cols >= M} />}
        {!fixed && (
          <button type="button" onClick={rotate} disabled={spin} className="btn-ghost min-h-14 px-4"><RotateCw size={20} />Döndür</button>
        )}
      </div>
      <Readout
        lines={
          fixed
            ? [`${rows} kutu, her kutuda ${cols} kurabiye`, `${plusChain(cols, rows)} = ${total}`]
            : [`${rows} sıra, her sırada ${cols} kurabiye`, `${plusChain(cols, rows)} = ${total}`]
        }
        big={fixed ? (grade >= 3 ? `${rows} × ${cols} = ${total}  →  ${total} ÷ ${cols} = ${rows}` : `${ek(total, 'loc')} ${rows} tane ${cols} var`) : grade === 1 ? `${rows} tane ${cols} = ${total}` : `${rows} × ${cols} = ${total}`}
      />
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={ship} className="btn-primary min-h-14 min-w-60 text-lg"><Send size={20} />{fixed ? 'Kutuları gönder' : 'Fırına gönder'}</button>
      </div>
    </div>
  )
}

/* ═════════════ 2) Döndürme: 3 × 5 ile 5 × 3 ═════════════ */

export interface RotateLevel {
  kind: 'rotate'
  r: number
  c: number
}

export function RotateTask({ level, api }: { level: RotateLevel; api: TaskApi }) {
  const [wrapRef, w] = useWidth<HTMLDivElement>()
  const [dims, setDims] = useState<[number, number]>([level.r, level.c])
  const [spin, setSpin] = useState(false)
  const [guess, setGuess] = useState<string | null>(null)
  const [turns, setTurns] = useState(0)
  const trayRef = useRef<HTMLDivElement>(null)
  const [rows, cols] = dims
  const M = Math.max(level.r, level.c)
  const cell = Math.floor(clamp((w - 40) / (M + 1), 26, 56))
  const total = rows * cols

  const rotate = () => {
    if (spin || !guess) return
    setSpin(true)
    window.setTimeout(() => {
      setDims(([r, c]) => [c, r])
      setSpin(false)
      setTurns((t) => t + 1)
    }, 520)
  }
  const rotAcc = useRef({ a0: 0, done: false })
  useGesture(
    {
      onPinch: ({ offset: [, a], first, event }) => {
        event?.stopPropagation?.()
        event?.preventDefault?.()
        if (first) rotAcc.current = { a0: a, done: false }
        if (!rotAcc.current.done && Math.abs(a - rotAcc.current.a0) > 35) {
          rotAcc.current.done = true
          rotate()
        }
      },
    },
    { target: trayRef, eventOptions: { passive: false } },
  )

  useEffect(() => {
    if (turns === 1) {
      const ok = guess === 'same'
      api.report(ok)
      api.found('swap', `${level.r} × ${level.c} = ${level.c} × ${level.r}`, { rows: level.c, cols: level.r })
      api.strategy('Tepsiyi döndürme (değişme özelliği)')
      api.say(`${level.r} × ${level.c} = ${level.c} × ${level.r}`, 'happy')
      api.nudge(
        ok
          ? `Tahminin doğruydu! Tepsiyi döndürünce sıralar sütun oldu ama kurabiyeler aynı: ${level.r} × ${level.c} = ${level.c} × ${level.r} = ${total}. Bu her tepsi için doğru mu sence?`
          : `Kurabiyelerden hiçbiri eklenmedi ya da alınmadı; yalnızca tepsi döndü. ${level.r} sıra ${ek(level.c, 'dist')} ile ${level.c} sıra ${ek(level.r, 'dist')} aynı sayıda: ${total}.`,
        { tone: ok ? 'ok' : 'think', misc: ok ? undefined : 'Döndürülen dizilimin kurabiye sayısının değiştiğini düşündü (değişme özelliği)' },
      )
      api.complete()
    }
  }, [turns]) // eslint-disable-line react-hooks/exhaustive-deps

  const choices: [string, string][] = [['more', 'Artar'], ['less', 'Azalır'], ['same', 'Aynı kalır']]
  return (
    <div ref={wrapRef}>
      <div className="mt-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
        <p className="mb-2 text-center text-[15px] font-black text-sky-900">Önce tahmin et: tepsiyi döndürürsek kurabiye sayısı…</p>
        <div className="flex flex-wrap justify-center gap-2">
          {choices.map(([k, t]) => (
            <button key={k} type="button" disabled={!!guess} onClick={() => { setGuess(k); api.say('Şimdi tepsiyi döndür ve gör!', 'think') }} className={`min-h-14 min-w-28 rounded-2xl px-4 text-lg font-black ring-2 transition ${guess === k ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-sky-900 ring-sky-200'} disabled:cursor-default`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <Stage>
        <div className="relative mx-auto grid place-items-center" style={{ height: M * cell + 24 }}>
          <div
            ref={trayRef}
            data-handle
            className="rounded-xl bg-[linear-gradient(145deg,#f1f5f9,#cbd5e1)] p-1 shadow-[0_6px_14px_rgb(15_23_42/.25),inset_0_0_0_3px_#94a3b8]"
            style={{ touchAction: 'none', transform: spin ? 'rotate(90deg)' : 'none', transition: spin ? 'transform 500ms cubic-bezier(.5,0,.3,1)' : 'none' }}
          >
            <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px` }}>
              {Array.from({ length: total }, (_, i) => (
                <div key={i} className="grid place-items-center"><Cookie size={Math.round(cell * 0.86)} tone={(turns % 2 ? cols - 1 - (i % cols) : Math.floor(i / cols)) % 2 ? 'pink' : 'baked'} seed={i} /></div>
              ))}
            </div>
          </div>
        </div>
      </Stage>
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={rotate} disabled={!guess || spin} className="btn-primary min-h-14 min-w-60 text-lg"><RotateCw size={20} />Tepsiyi döndür</button>
      </div>
      {guess && <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">İpucu: tepsinin üstünde iki parmağını çevirerek de döndürebilirsin.</p>}
      <Readout lines={[`${rows} sıra, her sırada ${cols} kurabiye`, turns > 0 ? `${level.r} × ${level.c} = ${level.c} × ${level.r}` : 'Döndürünce ne olacak?']} big={`${rows} × ${cols} = ${turns > 0 || !guess ? total : '?'}`} />
    </div>
  )
}

/* ═════════════ 3) Tabaklara eşit dağıtma (eşit gruplar / paylaştırma) ═════════════ */

export interface GroupsLevel {
  kind: 'groups'
  n: number
  plates?: number
  maxPlates: number
}

type GItem = { from: 'belt' } | { from: number }

export function GroupsTask({ level, api }: { level: GroupsLevel; api: TaskApi }) {
  const { grade } = api
  const [plates, setPlates] = useState<number[]>(() => Array(level.plates ?? 2).fill(0))
  const [hot, setHot] = useState<number | 'belt' | null>(null)
  const dealt = useRef(0)
  const zones = useRef(new Map<number | 'belt', Element | null>())
  const used = plates.reduce((a, b) => a + b, 0)
  const belt = level.n - used
  const next = useRef(0)
  const fixed = level.plates !== undefined
  const [wrapRef, w] = useWidth<HTMLDivElement>()

  const change = (fn: (p: number[]) => number[]) => {
    setPlates((p) => fn([...p]))
    api.nudge(null)
  }
  const add = (i: number) => belt > 0 && change((p) => ((p[i] += 1), p))
  const back = (i: number) => change((p) => (p[i] > 0 ? ((p[i] -= 1), p) : p))
  const move = (from: GItem, to: number | 'belt') => {
    if (from.from === 'belt') {
      if (to !== 'belt') add(to)
    } else if (to === 'belt') back(from.from)
    else if (to !== from.from) change((p) => (p[from.from as number] > 0 ? ((p[from.from as number] -= 1), (p[to] += 1), p) : p))
  }
  const deal = () => {
    if (belt <= 0) return
    dealt.current++
    change((p) => {
      let left = belt
      for (let i = 0; i < p.length && left > 0; i++, left--) p[i] += 1
      return p
    })
  }
  const dealOne = () => {
    if (belt <= 0) return
    dealt.current++
    const i = next.current % plates.length
    next.current++
    add(i)
  }
  const setCount = (k: number) => {
    k = clamp(k, 1, level.maxPlates)
    change((p) => (k < p.length ? p.slice(0, k) : [...p, ...Array(k - p.length).fill(0)]))
    next.current = 0
  }

  const dd = useDragDrop<GItem>({
    ghost: () => <Cookie size={40} tone="baked" />,
    onMove: (_, x, y) => setHot(hitZone(zones.current, x, y)),
    onDrop: (it, x, y) => {
      setHot(null)
      const z = hitZone(zones.current, x, y)
      if (z !== null) move(it, z)
    },
    onTap: (it) => (it.from === 'belt' ? dealOne() : back(it.from)),
  })

  const equal = plates.every((v) => v === plates[0])
  const per = plates[0]
  const k = plates.length

  const pack = () => {
    if (belt > 0) {
      api.say('Bantta kurabiye kaldı!', 'think')
      api.nudge(`Bantta hâlâ ${belt} kurabiye var. Hepsi tabaklara dağıtılınca paketleyebiliriz.`)
      return
    }
    if (!equal) {
      api.report(false)
      api.say('Bu tabaklar adil değil…', 'think')
      const mx = Math.max(...plates), mn = Math.min(...plates)
      api.nudge(`Her tabakta aynı sayıda kurabiye var mı? En kalabalık tabakta ${mx}, en azında ${mn} kurabiye var. Kurabiyeleri tabaklar arasında taşıyarak eşitle.`, {
        tool: grade === 1 ? 'tenframe' : 'dizilim',
      })
      return
    }
    const key = `${k}x${per}`
    if (api.has(key)) {
      api.nudge(`${k} tabakta ${ek(per, 'dist')} dağıtmayı zaten buldun. Tabak sayısını değiştirince her tabağa kaç düşer?`)
      return
    }
    api.report(true)
    const label = fixed && grade >= 3 ? `${level.n} ÷ ${k} = ${per}` : grade === 1 ? `${k} tane ${per}` : `${k} × ${per}`
    api.found(key, label, { rows: k, cols: per })
    api.strategy(dealt.current > 0 ? 'Birer birer dağıtma (paylaştırma)' : 'Eşit gruplar oluşturma')
    api.say(`${k} tabak, her tabakta ${per}!`, 'happy')
    api.nudge(fixed ? `${level.n} kurabiye ${k} tabağa eşit paylaşınca her tabağa ${per} düştü.` : 'Adil paylaşım! Başka kaç tabağa eşit dağıtabilirsin?', { tone: 'ok' })
  }

  const perRow = Math.min(k, w < 520 ? 3 : 6)
  const plateSize = Math.floor(clamp((w - 40) / perRow - 12, 92, k <= 3 ? 150 : k <= 4 ? 132 : 116))
  const mxOn = Math.max(...plates)
  const ckSize = mxOn <= 4 && plateSize >= 116 ? 38 : mxOn <= 9 ? 28 : 22

  return (
    <div ref={wrapRef}>
      <Stage>
        {/* bant */}
        <div
          ref={(el) => void zones.current.set('belt', el)}
          className={`relative rounded-2xl bg-[repeating-linear-gradient(90deg,#475569_0_18px,#526075_18px_36px)] px-3 pt-3 pb-5 shadow-inner transition ${hot === 'belt' ? 'ring-4 ring-amber-300' : ''}`}
        >
          <p className="mb-1.5 text-xs font-black tracking-wide text-slate-200 uppercase">Bant · {belt} kurabiye</p>
          <div className="flex min-h-12 flex-wrap gap-1.5">
            {Array.from({ length: belt }, (_, i) => (
              <button key={i} type="button" data-handle onPointerDown={(e) => dd.start(e, { from: 'belt' })} className="cursor-grab rounded-full active:scale-95" style={{ touchAction: 'none' }} aria-label="Kurabiye: sürükle ya da dokun">
                <Cookie size={w < 520 ? 38 : 44} tone="baked" seed={i} />
              </button>
            ))}
            {belt === 0 && <span className="self-center text-sm font-bold text-slate-300">Bant boş!</span>}
          </div>
          <div className="absolute inset-x-3 bottom-1.5 flex justify-between" aria-hidden>{Array.from({ length: 9 }, (_, i) => <span key={i} className="size-2.5 rounded-full bg-slate-800" />)}</div>
        </div>
        {/* tabaklar */}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {plates.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                ref={(el) => void zones.current.set(i, el)}
                role="button"
                tabIndex={0}
                data-handle
                onClick={() => add(i)}
                onKeyDown={(e) => e.key === 'Enter' && add(i)}
                className={`relative grid cursor-pointer place-items-center rounded-full bg-[radial-gradient(circle,#ffffff_55%,#e2e8f0_56%,#f8fafc_72%,#cbd5e1_100%)] shadow-[0_6px_12px_rgb(15_23_42/.15)] transition ${hot === i ? 'scale-105 ring-4 ring-amber-300' : ''}`}
                style={{ width: plateSize, height: plateSize }}
                aria-label={`${i + 1}. tabak: ${v} kurabiye. Dokununca banttan bir kurabiye eklenir.`}
              >
                <div className="flex max-w-[72%] flex-wrap content-center justify-center gap-0.5">
                  {Array.from({ length: v }, (_, j) => (
                    <span key={j} data-handle onPointerDown={(e) => { e.stopPropagation(); dd.start(e, { from: i }) }} onClick={(e) => e.stopPropagation()} className="animate-pop cursor-grab" style={{ touchAction: 'none' }}>
                      <Cookie size={ckSize} tone="baked" seed={j + i} />
                    </span>
                  ))}
                </div>
              </div>
              <span className={`chip px-3 py-0.5 text-base font-black ${belt === 0 && equal ? 'bg-ok text-white' : 'bg-white text-ink ring-1 ring-line'}`}>{v}</span>
            </div>
          ))}
        </div>
      </Stage>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {!fixed && <Stepper label="Tabak" value={k} onDec={() => setCount(k - 1)} onInc={() => setCount(k + 1)} decDisabled={k <= 1} incDisabled={k >= level.maxPlates} />}
        <button type="button" onClick={deal} disabled={belt === 0} className="btn-ghost min-h-14 px-4">Her tabağa birer</button>
        <button type="button" onClick={() => change((p) => p.map(() => 0))} disabled={used === 0} className="btn-ghost min-h-14 px-4"><Undo2 size={18} />Banda geri al</button>
      </div>
      <Readout
        lines={[used ? `${plates.join(' + ')} = ${used}` : 'Kurabiyeleri tabaklara sürükle ya da tabağa dokun.', belt === 0 && equal ? `${k} tabak, her tabakta ${per} kurabiye` : !used ? 'Her tabakta aynı sayıda kurabiye olmalı.' : equal ? 'Şimdilik tabaklar eşit…' : 'Tabaklar henüz eşit değil.']}
        big={belt === 0 && equal ? (grade === 1 ? `${k} tane ${per} = ${level.n}` : fixed && grade >= 3 ? `${level.n} ÷ ${k} = ${per}` : `${k} × ${per} = ${level.n}`) : undefined}
      />
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={pack} className="btn-primary min-h-14 min-w-60 text-lg"><Send size={20} />Paketle</button>
      </div>
      {dd.ghost}
    </div>
  )
}

/* ═════════════ 4) Kamyon: 2’li, 5’li, 10’lu kutularla ritmik sayma ═════════════ */

export interface TruckLevel {
  kind: 'truck'
  n: number
  boxes: number[]
}

function BoxArt({ v, small }: { v: number; small?: boolean }) {
  const per = v === 10 ? 5 : v
  const rowsN = v === 10 ? 2 : 1
  const cs = small ? 15 : 19
  return (
    <span className="inline-flex flex-col gap-0.5 rounded-lg border-2 border-[#b98a4e] bg-[linear-gradient(180deg,#f2d3a2,#e3b877)] p-1 shadow-sm">
      {Array.from({ length: rowsN }, (_, r) => (
        <span key={r} className="flex gap-0.5">
          {Array.from({ length: per }, (_, c) => <Cookie key={c} size={cs} tone="baked" seed={r + c} />)}
        </span>
      ))}
    </span>
  )
}

export function TruckTask({ level, api }: { level: TruckLevel; api: TaskApi }) {
  const { grade } = api
  const [load, setLoad] = useState<number[]>([])
  const [hot, setHot] = useState(false)
  const bedRef = useRef<HTMLDivElement>(null)
  const total = load.reduce((a, b) => a + b, 0)
  const zones = useMemo(() => new Map<'bed', Element | null>(), [])

  const put = (v: number) => {
    if (load.length >= 14) return
    setLoad((l) => [...l, v])
    api.nudge(null)
  }
  const dd = useDragDrop<number>({
    ghost: (v) => <BoxArt v={v} />,
    onMove: (_, x, y) => {
      zones.set('bed', bedRef.current)
      setHot(hitZone(zones, x, y) === 'bed')
    },
    onDrop: (v, x, y) => {
      setHot(false)
      zones.set('bed', bedRef.current)
      if (hitZone(zones, x, y) === 'bed') put(v)
    },
    onTap: put,
  })

  const go = () => {
    if (total !== level.n) {
      api.report(false)
      api.say(total > level.n ? 'Kamyon fazla dolu!' : 'Kamyonda yer var!', 'think')
      api.nudge(
        total > level.n
          ? `Kamyonda ${total} kurabiye var, sipariş ${level.n}. Sayma şeridinde ${level.n}’i geçtin. Hangi kutuyu indirebilir ya da daha küçüğüyle değiştirebilirsin?`
          : `Kamyonda ${total} kurabiye var. ${level.n}’e ulaşmak için daha kaç kurabiye gerekiyor? Sayma şeridine bak.`,
        { tool: 'numberline' },
      )
      return
    }
    const sorted = [...load].sort((a, b) => b - a)
    const key = sorted.join(',')
    if (api.has(key)) {
      api.nudge('Bu kutu karışımını zaten gönderdin. Farklı kutular kullanarak dene!')
      return
    }
    api.report(true)
    const uni = sorted.every((v) => v === sorted[0])
    const label = uni && grade >= 2 ? `${sorted.length} × ${sorted[0]}` : uni && sorted.length > 1 ? `${sorted.length} tane ${sorted[0]}` : sorted.join(' + ')
    api.found(key, label)
    api.strategy(uni ? `${ek(sorted[0], 'dist')} ritmik sayma` : sorted[0] === 10 ? 'Önce 10’lar, sonra kalan' : 'Farklı gruplarla sayma')
    api.say('Kamyon yola çıktı! 🚚', 'happy')
    api.nudge(uni ? `${load.map((_, i) => (i + 1) * sorted[0]).join(', ')} diye ${ek(sorted[0], 'dist')} saydın!` : 'Teslim edildi! Başka kutularla aynı siparişi hazırlayabilir misin?', { tone: 'ok' })
    setLoad([])
  }

  // sayma şeridi (sayı doğrusu) çizimi
  const maxV = Math.max(level.n, total, 10)
  const W = 640, H = 92, pad = 30
  const sx = (v: number) => pad + (v / maxV) * (W - 2 * pad)
  const lblStep = maxV <= 20 ? 2 : maxV <= 50 ? 5 : 10
  let acc = 0
  const jumps = load.map((v) => {
    const a = acc
    acc += v
    return [a, acc, v] as const
  })

  return (
    <div>
      <Stage>
        {/* kutu rafı */}
        <div className="flex flex-wrap items-end justify-center gap-3">
          {level.boxes.map((v) => (
            <button key={v} type="button" data-handle onPointerDown={(e) => dd.start(e, v)} className="flex cursor-grab flex-col items-center gap-1 rounded-2xl bg-white/80 p-2 ring-1 ring-orange-200 active:scale-95" style={{ touchAction: 'none' }} aria-label={`${lik(v)} kutu: kamyona sürükle ya da dokun`}>
              <BoxArt v={v} />
              <span className="text-sm font-black text-amber-900">{v} kurabiye</span>
            </button>
          ))}
        </div>
        {/* kamyon */}
        <div className="mt-4 flex items-end gap-0">
          <div ref={bedRef} className={`relative min-h-28 flex-1 rounded-l-2xl rounded-tr-md border-4 border-b-8 border-sky-700 bg-sky-50 p-2 transition ${hot ? 'bg-amber-50 ring-4 ring-amber-300' : ''}`}>
            {load.length === 0 && <p className="grid h-20 place-items-center text-center text-sm font-bold text-sky-800/70">Kutuları kamyona sürükle ya da kutuya dokun</p>}
            <div className="flex flex-wrap items-end gap-1.5">
              {load.map((v, i) => (
                <button key={i} type="button" data-handle onClick={() => { setLoad((l) => l.filter((_, j) => j !== i)); api.nudge(null) }} className="animate-pop" aria-label={`${lik(v)} kutuyu indir`}>
                  <BoxArt v={v} small />
                </button>
              ))}
            </div>
            <div className="absolute -bottom-7 left-6 size-11 rounded-full border-[6px] border-slate-700 bg-slate-300" />
            <div className="absolute -bottom-7 left-20 size-11 rounded-full border-[6px] border-slate-700 bg-slate-300" />
          </div>
          <div className="relative h-24 w-24 shrink-0 rounded-tr-[36px] rounded-br-lg border-4 border-sky-700 bg-sky-500">
            <div className="absolute top-2 right-2 left-3 h-9 rounded-tr-[26px] rounded-l-md bg-sky-100" />
            <Truck className="absolute bottom-2 left-2 text-white" size={26} />
            <div className="absolute right-3 -bottom-7 size-11 rounded-full border-[6px] border-slate-700 bg-slate-300" />
          </div>
        </div>
        {/* sayma şeridi */}
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-10 w-full" role="img" aria-label={`Sayma şeridi: ${total}`}>
          <line x1={pad} x2={W - pad} y1={64} y2={64} stroke="#7c4a1e" strokeWidth={3} strokeLinecap="round" />
          {Array.from({ length: maxV + 1 }, (_, v) => (
            <g key={v}>
              <line x1={sx(v)} x2={sx(v)} y1={v % lblStep ? 60 : 56} y2={v % lblStep ? 68 : 72} stroke="#7c4a1e" strokeWidth={v % lblStep ? 1 : 2} />
              {v % lblStep === 0 && <text x={sx(v)} y={88} textAnchor="middle" fontSize={13} fontWeight={800} fill="#5b3417">{v}</text>}
            </g>
          ))}
          <g transform={`translate(${sx(level.n)} 64)`}>
            <line y1={0} y2={-56} stroke="#ea580c" strokeWidth={2.5} />
            <path d="M0 -56 L22 -49 L0 -42 Z" fill="#ea580c" />
            <text x={-4} y={-46} textAnchor="end" fontSize={13} fontWeight={900} fill="#ea580c">Hedef</text>
          </g>
          {jumps.map(([a, b, v], i) => {
            const x1 = sx(a), x2 = sx(b), h = Math.min(40, 14 + (x2 - x1) * 0.25)
            return (
              <g key={i}>
                <path d={`M${x1} 62 Q${(x1 + x2) / 2} ${62 - h * 2} ${x2} 62`} fill="none" stroke={b > level.n ? '#e11d48' : '#16a34a'} strokeWidth={2.5} />
                <text x={(x1 + x2) / 2} y={62 - h - 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#166534">+{v}</text>
                <circle cx={x2} cy={64} r={5} fill={b > level.n ? '#e11d48' : '#16a34a'} />
              </g>
            )
          })}
        </svg>
      </Stage>
      <Readout lines={[load.length ? `${load.join(' + ')} = ${total}` : 'Kamyon boş', load.length ? `Sayalım: ${jumps.map((j) => j[1]).join(', ')}` : `Sipariş: ${level.n} kurabiye`]} big={`${total} / ${level.n}`} />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setLoad([])} disabled={!load.length} className="btn-ghost min-h-14 px-4"><Undo2 size={18} />Boşalt</button>
        <button type="button" onClick={go} disabled={!load.length} className="btn-primary min-h-14 min-w-56 text-lg"><Truck size={20} />Yola çıkar</button>
      </div>
      {dd.ghost}
    </div>
  )
}

/* ═════════════ 5) Tepsiyi kes: dağılma özelliği ═════════════ */

export interface SplitLevel {
  kind: 'split'
  r: number
  c: number
}

export function SplitTask({ level, api }: { level: SplitLevel; api: TaskApi }) {
  const [wrapRef, w] = useWidth<HTMLDivElement>()
  const maxH = useMaxH()
  const [cut, setCut] = useState<{ dir: 'r' | 'c'; k: number } | null>(null)
  const { r, c } = level
  const RAIL = 46, GAP = 14
  const LBL = w < 520 ? 78 : 120
  const cell = Math.floor(clamp(Math.min((w - RAIL - GAP - LBL - 24) / c, (maxH - 30) / r), 22, 56))
  const gridRef = useRef<HTMLDivElement>(null)
  const gwRef = useRef(1)

  const railDown = (dir: 'r' | 'c') => (e: React.PointerEvent) => {
    e.preventDefault()
    const id = e.pointerId
    const set = (cx: number, cy: number) => {
      const g = gridRef.current?.getBoundingClientRect()
      if (!g) return
      const n = dir === 'r' ? r : c
      const scale = g.width / gwRef.current
      const pos = (dir === 'r' ? cy - g.top : cx - g.left) / scale
      const k = clamp(Math.round(pos / cell), 1, n - 1)
      setCut({ dir, k })
      api.nudge(null)
    }
    set(e.clientX, e.clientY)
    const move = (ev: PointerEvent) => ev.pointerId === id && set(ev.clientX, ev.clientY)
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const parts = cut ? (cut.dir === 'r' ? [[cut.k, c], [r - cut.k, c]] : [[r, cut.k], [r, c - cut.k]]) : [[r, c]]
  const expr = cut ? `${parts[0][0]} × ${parts[0][1]} + ${parts[1][0]} × ${parts[1][1]}` : `${r} × ${c}`
  const sums = cut ? `${parts[0][0] * parts[0][1]} + ${parts[1][0] * parts[1][1]}` : ''

  const save = () => {
    if (!cut) {
      api.nudge('Önce bıçağı tepsinin solundaki ya da üstündeki raya sürükle. Hangi parçaları kolayca sayabilirsin?')
      return
    }
    const n = cut.dir === 'r' ? r : c
    const key = `${cut.dir}${Math.min(cut.k, n - cut.k)}`
    if (api.has(key)) {
      api.nudge('Bu kesimi zaten denedin. Başka bir yerden kesersen hangi kolay çarpımlar çıkar?')
      return
    }
    api.report(true)
    api.found(key, `${expr}`, { rows: r, cols: c, split: cut })
    const a = cut.k, b = n - cut.k
    if (a === b) api.strategy('Yarılama (iki eş parça)')
    else if (a === 5 || b === 5) api.strategy('5’lere ayırma')
    else if (a === 2 || b === 2) api.strategy('İkiye katlama')
    else if (a === 1 || b === 1) api.strategy('Bir sıra ekle/çıkar')
    else api.strategy('Bilinen bir çarpıma ayırma')
    api.say(`${r} × ${c} = ${expr}`, 'happy')
    api.nudge(`Kesince kurabiye kaybolmadı: ${r} × ${c} = ${expr} = ${sums} = ${r * c}. Başka nereden kesebilirsin?`, { tone: 'ok' })
  }

  const gw = c * cell + (cut?.dir === 'c' ? GAP : 0)
  const gh = r * cell + (cut?.dir === 'r' ? GAP : 0)
  gwRef.current = gw

  return (
    <div ref={wrapRef}>
      <Stage>
        <div className="relative mx-auto select-none" style={{ width: RAIL + gw + LBL, height: RAIL + gh + 10 }}>
          {/* üst ray: sütundan kes */}
          <div data-handle onPointerDown={railDown('c')} className="absolute cursor-pointer rounded-xl bg-orange-100 ring-1 ring-orange-200" style={{ left: RAIL, top: 0, width: gw, height: RAIL - 8, touchAction: 'none' }} aria-label="Sütunlar arasından kes" role="slider" aria-valuenow={cut?.dir === 'c' ? cut.k : 0} tabIndex={0}>
            {Array.from({ length: c - 1 }, (_, i) => <span key={i} className="absolute top-2 bottom-2 w-0.5 bg-orange-300" style={{ left: (i + 1) * cell + (cut?.dir === 'c' && i + 1 > cut.k ? GAP : 0) - 1 }} />)}
            {cut?.dir === 'c' && <span className="absolute top-0 grid size-[38px] -translate-x-1/2 place-items-center rounded-full bg-orange-500 text-white shadow" style={{ left: cut.k * cell + GAP / 2 }}><Scissors size={20} className="rotate-90" /></span>}
          </div>
          {/* sol ray: sıradan kes */}
          <div data-handle onPointerDown={railDown('r')} className="absolute cursor-pointer rounded-xl bg-orange-100 ring-1 ring-orange-200" style={{ left: 0, top: RAIL, width: RAIL - 8, height: gh, touchAction: 'none' }} aria-label="Sıralar arasından kes" role="slider" aria-valuenow={cut?.dir === 'r' ? cut.k : 0} tabIndex={0}>
            {Array.from({ length: r - 1 }, (_, i) => <span key={i} className="absolute right-2 left-2 h-0.5 bg-orange-300" style={{ top: (i + 1) * cell + (cut?.dir === 'r' && i + 1 > cut.k ? GAP : 0) - 1 }} />)}
            {cut?.dir === 'r' && <span className="absolute left-0 grid size-[38px] -translate-y-1/2 place-items-center rounded-full bg-orange-500 text-white shadow" style={{ top: cut.k * cell + GAP / 2 }}><Scissors size={20} /></span>}
            {!cut && <span className="absolute top-1/2 left-1/2 grid size-[38px] -translate-1/2 place-items-center rounded-full bg-orange-500 text-white shadow animate-pulse"><Scissors size={20} /></span>}
          </div>
          {/* tepsi */}
          <div ref={gridRef} className="absolute" style={{ left: RAIL, top: RAIL, width: gw, height: gh }}>
            {Array.from({ length: r * c }, (_, i) => {
              const rr = Math.floor(i / c), cc = i % c
              const second = cut ? (cut.dir === 'r' ? rr >= cut.k : cc >= cut.k) : false
              const x = cc * cell + (cut?.dir === 'c' && second ? GAP : 0)
              const y = rr * cell + (cut?.dir === 'r' && second ? GAP : 0)
              return (
                <span key={i} className="absolute grid place-items-center transition-all duration-300" style={{ left: x, top: y, width: cell, height: cell }}>
                  <Cookie size={Math.round(cell * 0.86)} tone={second ? 'choc' : 'baked'} seed={i} />
                </span>
              )
            })}
          </div>
          {/* parça etiketleri */}
          {cut ? (
            parts.map(([pr, pc], i) => {
              const top = cut.dir === 'r' ? (i === 0 ? 0 : cut.k * cell + GAP) + (pr * cell) / 2 : gh / 2 + (i === 0 ? -22 : 22)
              return (
                <span key={i} className={`absolute -translate-y-1/2 rounded-xl px-1.5 py-1 text-xs font-black whitespace-nowrap shadow sm:px-2 sm:text-sm ${i === 0 ? 'bg-amber-400 text-amber-950' : 'bg-[#5e341a] text-amber-50'}`} style={{ left: RAIL + gw + 8, top: RAIL + top }}>
                  {pr} × {pc} = {pr * pc}
                </span>
              )
            })
          ) : (
            <span className="absolute -translate-y-1/2 rounded-xl bg-white px-2 py-1 text-sm font-black whitespace-nowrap ring-1 ring-line" style={{ left: RAIL + gw + 8, top: RAIL + gh / 2 }}>{r} × {c} = ?</span>
          )}
        </div>
      </Stage>
      <Readout lines={[cut ? 'Kesilmiş tepsi iki kolay tepsiye dönüştü.' : 'Bıçağı raya sürükle: tepsiyi iki parçaya kes.', cut ? `${expr} = ${sums}` : `${r} sıra, her sırada ${c} kurabiye`]} big={cut ? `${r} × ${c} = ${r * c}` : `${r} × ${c} = ?`} />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setCut(null)} disabled={!cut} className="btn-ghost min-h-14 px-4"><Undo2 size={18} />Birleştir</button>
        <button type="button" onClick={save} className="btn-primary min-h-14 min-w-56 text-lg"><Scissors size={20} />Bu kesimi gönder</button>
      </div>
    </div>
  )
}
