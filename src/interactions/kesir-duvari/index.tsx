import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from '@use-gesture/react'
import { BrickWall, ChevronLeft, ChevronRight, Eraser, RotateCcw, Undo2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, SolutionList, StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { ek } from '../../lib/generators'
import { sfx } from '../../lib/feedback'
import { Card, Derived, Header, Layout, NextButton, Nudge, PickBtn, dec, fr, gcd, useFresh, useSession } from './ortak'
import { makeTasks, type CoverTask, type Frac, type OrderTask, type RulerTask, type Task } from './tasks'

/**
 * 36. Kesir Duvarı (3–6)
 * Öğrenci kesir çubuklarını duvardaki boş sıraya sürükleyip (ya da dokunup) hedef uzunluğu tam örter.
 * Her farklı örtü duvara yeni bir sıra olarak eklenir; sıralar aynı çizgide biter → denklik görünür olur.
 * Cetvel görevinde dikey çizgi kaydırılarak birçok sıranın buluştuğu yerler (denk kesirler) bulunur.
 */

const UNIT = 27720 // 1..12 ve 15’in ortak katı: tüm çubuklar tam sayı birimle toplanır
const COLORS: Record<number, string> = { 1: '#475569', 2: '#e11d48', 3: '#f97316', 4: '#eab308', 5: '#16a34a', 6: '#0d9488', 8: '#2563eb', 10: '#7c3aed', 12: '#db2777', 15: '#65a30d' }
const DARK_TEXT = new Set([4])
const colorOf = (d: number) => COLORS[d] ?? '#64748b'
const units = (d: number) => UNIT / d
const valOf = (x: Frac) => (x.n * UNIT) / x.d
const reduce = (n: number, d: number): Frac => {
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}
/** Kesirden sonra gelen ek okunuşun son sözcüğüne (paya) göre: [[1/2]]’yi değil “ikide bir” → ’i */
const after = (x: Frac, kind: 'acc' | 'dat' | 'abl' | 'loc') => (x.d === 1 ? ek(x.n, kind) : `${fr(x.n, x.d)}${ek(x.n, kind, false)}`)
const fname = (x: Frac) => (x.d === 1 ? String(x.n) : fr(x.n, x.d))

/** Basit **kalın** desteği + MathText */
function Rich({ text }: { text: string }) {
  const parts = text.split('**')
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <b key={i} className="text-teal-800"><MathText text={p} /></b> : <MathText key={i} text={p} />))}
    </>
  )
}

/** Kesir çubuğu (kiremit görünümlü) */
function Bar({ d, w, h, label = true, grade, className = '', style, outline }: { d: number; w: number; h: number; label?: boolean; grade: number; className?: string; style?: React.CSSProperties; outline?: boolean }) {
  const c = colorOf(d)
  const txt = DARK_TEXT.has(d) ? '#422006' : '#fff'
  const showDec = grade >= 6 && d === 10
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-black ${className}`}
      style={{
        width: w,
        height: h,
        background: `linear-gradient(180deg, ${c}, ${c}dd)`,
        color: txt,
        boxShadow: outline ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : `inset 0 -4px 0 rgba(0,0,0,.18), inset 0 2px 0 rgba(255,255,255,.35)`,
        ...style,
      }}
    >
      {label && w >= 30 && (
        <span className="pointer-events-none text-[15px] leading-none">
          {d === 1 ? '1' : <MathText text={fr(1, d)} />}
          {showDec && w >= 58 && <span className="ml-1 text-[11px] opacity-85">0,1</span>}
        </span>
      )}
    </div>
  )
}

function useWidthOf<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(240, el.clientWidth)))
    ro.observe(el)
    setW(Math.max(240, el.clientWidth))
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/* ───────────────────────── ana bileşen ───────────────────────── */

export default function KesirDuvari({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const sol = useSolutions()
  const task = tasks[S.idx]
  const age = useAge(grade)

  const finish = () => {
    const n = sol.list.length
    const insight =
      grade <= 3
        ? 'Aynı uzunluğu farklı parçalarla örtebiliriz: [[1/2]] = [[2/4]] = [[4/8]]. Bütün ne kadar çok parçaya bölünürse her parça o kadar küçük olur.'
        : grade === 4
          ? 'Denk kesirler duvarda aynı çizgide biter: [[1/2]] = [[2/4]] = [[3/6]]. Parçalar küçüldükçe aynı uzunluk için daha çok parça gerekir.'
          : grade === 5
            ? 'Bir uzunluğun birçok adı vardır; farklı büyüklükteki çubuklar da birlikte aynı uzunluğu örtebilir: [[5/6]] = [[1/2]] + [[1/3]].'
            : 'Bir kesir birim kesirlerin toplamı olarak birçok biçimde yazılabilir: 1 = [[1/2]] + [[1/3]] + [[1/6]]. Denk kesirler aynı noktada biter; [[2/5]] = [[4/10]] = 0,4.'
    onFinish({ summary: `${tasks.length} görevi tamamladın, duvarda ${n} farklı örtü ve denklik keşfettin.`, insight, stars: S.stars(Math.min(1.5, n * 0.1)) })
  }

  return (
    <Scene grade={grade}>
      <Header
        icon={<BrickWall size={22} />}
        color="#0d9488"
        idx={S.idx}
        total={tasks.length}
        title={task.title}
        extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">🧱 {sol.list.length} keşif</span> : undefined}
      />
      {task.kind === 'cover' && <CoverView key={S.idx} task={task} grade={grade} big={age.big} sol={sol} onDone={S.complete} footer={S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />} />}
      {task.kind === 'ruler' && <RulerView key={S.idx} task={task} grade={grade} big={age.big} sol={sol} onDone={S.complete} footer={S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />} />}
      {task.kind === 'order' && <OrderView key={S.idx} task={task} grade={grade} big={age.big} onDone={S.complete} footer={S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />} />}
    </Scene>
  )
}

interface ViewProps<T extends Task> {
  task: T
  grade: number
  big: boolean
  onDone: (first: boolean) => void
  footer: ReactNode
}

/* ───────────────────────── 1) örtme ───────────────────────── */

type Msg = { q: string; tone?: 'think' | 'ok'; mis?: string; tool?: boolean } | null

function groupLabel(dens: number[]) {
  const counts = new Map<number, number>()
  for (const d of dens) counts.set(d, (counts.get(d) ?? 0) + 1)
  const ds = [...counts.keys()].sort((a, b) => a - b)
  return ds.map((d) => fr(counts.get(d)!, d)).join(' + ')
}

function CoverView({ task, grade, big, sol, onDone, footer }: ViewProps<CoverTask> & { sol: ReturnType<typeof useSolutions> }) {
  const track = useTracker()
  const fresh = useFresh(sol)
  const [wallRef, W] = useWidthOf<HTMLDivElement>()
  const rowRef = useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = useState<number[]>([])
  const [found, setFound] = useState<{ dens: number[]; label: string }[]>([])
  const [msg, setMsg] = useState<Msg>(null)
  const [last, setLast] = useState<string | null>(null)
  const [pred, setPred] = useState<number | null>(null)
  const [complete, setComplete] = useState(false)
  const [hadOverflow, setHadOverflow] = useState(false)
  const [stratDone, setStratDone] = useState(false)
  const H = big ? 52 : 44
  const target = valOf(task.target)
  const sum = placed.reduce((s, d) => s + units(d), 0)
  const px = (u: number) => (u / UNIT) * W
  const mixedCount = found.filter((f) => new Set(f.dens).size > 1).length
  const goalMet = found.length >= task.goal && (!task.needMixed || mixedCount > 0)
  const waitingPredict = !!task.predict && pred === null

  // Görev tamam mı?
  useEffect(() => {
    if (goalMet && !complete) {
      setComplete(true)
      track.item(!hadOverflow)
      if (!task.strategy) onDone(!hadOverflow)
    }
  }, [goalMet, complete, hadOverflow, task.strategy, onDone, track])

  const commit = (dens: number[]) => {
    const kinds = new Set(dens).size
    const sorted = [...dens].sort((a, b) => a - b)
    const key = sorted.join('-')
    const label = `${fname(task.target)} = ${groupLabel(sorted)}`
    if (task.minKinds && kinds < task.minKinds) {
      setMsg({ q: `Tam örttün, harika! Ama bu sırada ${kinds} farklı büyüklük var. **En az ${task.minKinds}** farklı büyüklük kullanabilir misin? Büyük bir çubukla başlayıp kalan boşluğa bak.` })
      track.attempt(false)
      return
    }
    if (task.maxPieces && dens.length > task.maxPieces) {
      setMsg({ q: `Tam örttün, ama ${dens.length} çubukla. Yalnızca ${task.maxPieces} çubukla da örtülebilir mi? İlk çubuğu büyük seç ve kalan boşluğun adını düşün.` })
      track.attempt(false)
      return
    }
    if (found.some((f) => f.dens.join('-') === key)) {
      setMsg({ q: 'Bu örtüyü zaten buldun! Başka hangi çubuklar aynı uzunluğu örter?' })
      setPlaced([])
      return
    }
    track.attempt(true)
    fresh(`${task.target.n}/${task.target.d}:${key}`, label)
    setFound((f) => [...f, { dens: dens.slice(), label }])
    setLast(label)
    sfx.ok()
    setPlaced([])
    // Tahmin varsa geri bildirim
    if (task.predict && pred !== null && kinds === 1 && dens[0] === task.predict.d) {
      const real = dens.length
      setMsg(
        real === pred
          ? { q: `Tahminin doğruydu: ${real} tane ${fr(1, task.predict.d)} gerekti.`, tone: 'ok' }
          : { q: `Tahminin ${pred} idi, ${real} tane ${fr(1, task.predict.d)} yetti. Parçanın büyüklüğü sayıyı nasıl etkiliyor?`, tone: 'ok' },
      )
      return
    }
    const need = task.goal - found.length - 1
    const needMix = task.needMixed && mixedCount === 0 && kinds === 1
    setMsg(
      need > 0
        ? { q: `Yeni bir yol! ${need} yol daha bul.`, tone: 'ok' }
        : needMix
          ? { q: 'Şimdi farklı büyüklükteki çubukları **birlikte** kullanarak örtmeyi dene.', tone: 'ok' }
          : null,
    )
  }

  const place = (d: number) => {
    if (waitingPredict) {
      setMsg({ q: 'Önce tahminini seç, sonra çubuklarla dene!' })
      return
    }
    if (sum >= target && sum > 0) {
      setMsg({ q: sum > target ? 'Sıra zaten taşıyor. Son çubuğu geri al (ya da üstüne dokun) ve daha küçük bir çubuk dene.' : 'Bu sıra tam dolu!' })
      return
    }
    if (!task.mixed && placed.length && placed[0] !== d) {
      setMsg({ q: `Bu görevde bir sıra **aynı büyüklükte** çubuklardan oluşur. Sırada ${fr(1, placed[0])}’ler var. ${fr(1, d)} denemek için önce sırayı temizle.` })
      return
    }
    const next = [...placed, d]
    const ns = sum + units(d)
    setPlaced(next)
    if (ns === target) {
      setTimeout(() => commit(next), 380)
      setMsg(null)
    } else if (ns > target) {
      setHadOverflow(true)
      track.attempt(false)
      const kinds = new Set(next).size
      if (kinds === 1) {
        const k = next.length
        setMsg({
          q:
            k === 1
              ? `Tek bir ${fr(1, d)} bile ${after(task.target, 'acc')} geçiyor! Bu çubuk hedeften büyük. Daha küçük çubuk hangisi?`
              : `${k - 1} tane ${fr(1, d)} eksik kalıyor, ${k} tane taşıyor. ${fr(1, d)}’lerle ${fname(task.target)} tam örtülebilir mi? Neden?`,
        })
      } else setMsg({ q: 'Son çubuk çizgiyi geçti. Kalan boşluk ne kadardı? O boşluğa tam uyan bir çubuk var mı?' })
    } else setMsg(null)
  }

  const removeAt = (i: number) => {
    setPlaced((p) => p.filter((_, j) => j !== i))
    setMsg(null)
  }

  const isOver = (x: number, y: number) => {
    const r = rowRef.current?.getBoundingClientRect()
    if (!r) return false
    return x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 50 && y <= r.bottom + 50
  }

  const targetPx = px(target)
  const strategyOpts = ['Parçaları ikiye böldüm', 'Payda iki katı olunca pay da iki katı', 'Duvarda çizgilere baktım', 'Deneyip gördüm']

  const work = (
    <div className="rounded-3xl bg-[#fdf6ee] p-3 ring-1 ring-amber-200/70 sm:p-4" style={{ backgroundImage: 'linear-gradient(90deg, rgba(180,120,60,.06) 1px, transparent 1px), linear-gradient(rgba(180,120,60,.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      <div ref={wallRef} className="relative w-full">
        {/* hedef çizgisi */}
        <div className="pointer-events-none absolute top-0 bottom-0 z-10 border-l-[3px] border-dashed border-rose-500" style={{ left: targetPx - 1.5 }} aria-hidden />
        <p className="mb-1 text-xs font-black tracking-wide text-amber-900/70 uppercase">1 bütün</p>
        <Bar d={1} w={W} h={H} grade={grade} />
        {task.target.d !== 1 && (
          <>
            <p className="mt-3 mb-1 text-xs font-black tracking-wide text-amber-900/70 uppercase">Hedef</p>
            <div className="flex">
              {Array.from({ length: task.target.n }, (_, i) => (
                <Bar key={i} d={task.target.d} w={px(units(task.target.d)) - 2} h={H} grade={grade} style={{ marginRight: 2, filter: 'saturate(.35) brightness(1.15)' }} />
              ))}
            </div>
          </>
        )}
        <p className="mt-3 mb-1 text-xs font-black tracking-wide text-teal-800 uppercase">Senin sıran — {fname(task.target)} uzunluğunu tam ört</p>
        <div ref={rowRef} data-testid="build-row" className="relative rounded-xl" style={{ height: H + 8, width: W }}>
          <div className="absolute inset-y-0 left-0 rounded-xl border-[3px] border-dashed border-teal-500/80 bg-teal-50/80" style={{ width: targetPx }} />
          <div className="absolute inset-y-0 rounded-r-xl bg-slate-200/40" style={{ left: targetPx, right: 0 }} />
          {sum > target && <div className="absolute inset-y-0 rounded-r-lg bg-[repeating-linear-gradient(45deg,#fecdd3_0,#fecdd3_6px,#fff1f2_6px,#fff1f2_12px)]" style={{ left: targetPx, width: Math.min(W - targetPx, px(sum - target)) }} />}
          <div className="absolute inset-y-1 left-0 flex">
            {placed.map((d, i) => (
              <button key={i} type="button" onClick={() => removeAt(i)} aria-label={`${i + 1}. çubuğu kaldır`} className="animate-pop" style={{ marginRight: 0 }}>
                <Bar d={d} w={Math.max(4, px(units(d)) - 1.5)} h={H} grade={grade} style={{ marginRight: 1.5 }} />
              </button>
            ))}
          </div>
          {!placed.length && <span className="pointer-events-none absolute inset-0 flex items-center pl-3 text-sm font-extrabold text-teal-700/70">Çubukları buraya sürükle ya da dokun</span>}
        </div>
        {/* duvar: bulunan örtüler */}
        {found.length > 0 && (
          <>
            <p className="mt-3 mb-1 text-xs font-black tracking-wide text-amber-900/70 uppercase">Duvarın</p>
            <div className="space-y-1">
              {found.map((f, i) => (
                <div key={i} className="flex items-center animate-fade-up">
                  {f.dens.map((d, j) => (
                    <Bar key={j} d={d} w={Math.max(4, px(units(d)) - 1.5)} h={big ? 38 : 32} grade={grade} style={{ marginRight: 1.5 }} />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* çubuk kutusu */}
      <div className="mt-4 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
        <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Çubuk kutusu — sürükle ya da dokun</p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          {task.tray.map((d) => (
            <TrayBar key={d} d={d} w={px(units(d))} h={H} grade={grade} onPlace={() => place(d)} isOver={isOver} />
          ))}
        </div>
      </div>
    </div>
  )

  const panel = (
    <>
      <Card>
        <p className="text-base leading-snug font-extrabold sm:text-lg"><Rich text={task.prompt} /></p>
        <p className="mt-2 text-sm font-bold text-ink-soft">
          Bulunan: <b className="text-teal-700">{Math.min(found.length, task.goal)} / {task.goal}</b>
          {task.needMixed && <span className="ml-2">· karışık: {mixedCount > 0 ? '✓' : '—'}</span>}
        </p>
      </Card>
      {task.predict && (
        <Card title="Önce tahmin et">
          <p className="mb-2 font-extrabold">
            <MathText text={`${after(task.target, 'acc')} örtmek için kaç tane ${fr(1, task.predict.d)} gerekir?`} />
          </p>
          <div className="flex flex-wrap gap-2">
            {task.predict.choices.map((c) => (
              <PickBtn key={c} on={pred === c} disabled={pred !== null} onClick={() => { setPred(c); track.strategy(`Tahmin: ${c} parça`); setMsg({ q: 'Şimdi çubuklarla dene ve tahminini kontrol et!', tone: 'ok' }) }}>{c}</PickBtn>
            ))}
          </div>
        </Card>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setPlaced((p) => p.slice(0, -1)); setMsg(null) }} disabled={!placed.length} className="btn-ghost min-h-12 flex-1"><Undo2 size={18} />Geri al</button>
        <button type="button" onClick={() => { setPlaced([]); setMsg(null) }} disabled={!placed.length} className="btn-ghost min-h-12 flex-1"><Eraser size={18} />Temizle</button>
      </div>
      {last && <Derived>{last}</Derived>}
      {sum > 0 && sum !== target && (
        <p className="text-center text-sm font-bold text-ink-soft">
          Sırada: <MathText text={groupLabel(placed)} /> {sum < target ? '— henüz eksik' : '— taşıyor'}
        </p>
      )}
      {msg && <Nudge key={msg.q} question={msg.q.replace(/\*\*/g, '')} tone={msg.tone} misconception={msg.mis} tool={msg.tone === 'ok' ? undefined : 'fractions'} toolConfig={{ dens: [1, 2, 3, 4, 6, 8, 12] }} onClose={() => setMsg(null)} />}
      <SolutionList list={found.map((f, i) => ({ key: String(i), label: f.label }))} goal={task.goal} />
      {complete && task.strategy && !stratDone && (
        <StrategyPicker question="Hangi çubukların işe yarayacağını nasıl buldun?" options={strategyOpts} onPick={() => { setStratDone(true); onDone(!hadOverflow) }} />
      )}
      {complete && <Derived tone="info">{task.target.d === 1 ? 'Bütün duvarı ördün!' : `Hepsi aynı çizgide bitiyor: aynı uzunluğun farklı adları.`}</Derived>}
      {footer}
    </>
  )

  return <Layout work={work} panel={panel} />
}

/** Kutudaki çubuk: sürükle-bırak (use-gesture) ya da dokun-yerleştir */
function TrayBar({ d, w, h, grade, onPlace, isOver }: { d: number; w: number; h: number; grade: number; onPlace: () => void; isOver: (x: number, y: number) => boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  const dragged = useRef(false)
  const [ghost, setGhost] = useState<{ x: number; y: number; ox: number; oy: number; over: boolean } | null>(null)
  const bind = useDrag(
    ({ xy: [x, y], initial: [ix, iy], first, last, movement: [mx, my], memo }) => {
      if (first) {
        const r = ref.current!.getBoundingClientRect()
        memo = { ox: ix - r.left, oy: iy - r.top }
        dragged.current = false
      }
      if (Math.hypot(mx, my) > 6) dragged.current = true
      if (last) {
        setGhost(null)
        if (dragged.current && isOver(x, y)) onPlace()
        return memo
      }
      if (dragged.current) setGhost({ x, y, ox: memo.ox, oy: memo.oy, over: isOver(x, y) })
      return memo
    },
    { filterTaps: true },
  )
  return (
    <>
      <button
        ref={ref}
        type="button"
        {...bind()}
        data-handle
        data-testid={`tray-${d}`}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false
            return
          }
          onPlace()
        }}
        aria-label={`1/${d} çubuğu`}
        className="flex min-h-12 min-w-12 cursor-grab touch-none items-center justify-start rounded-xl p-1 transition hover:bg-teal-50 active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <Bar d={d} w={Math.max(26, w - 2)} h={h} grade={grade} label />
      </button>
      {ghost &&
        createPortal(
          <div className="pointer-events-none fixed z-[60]" style={{ left: ghost.x - ghost.ox, top: ghost.y - ghost.oy, transform: 'rotate(-2deg) scale(1.04)', filter: 'drop-shadow(0 10px 14px rgba(0,0,0,.25))' }}>
            <Bar d={d} w={Math.max(26, w - 2)} h={h} grade={grade} outline={ghost.over} />
          </div>,
          document.body,
        )}
    </>
  )
}

/* ───────────────────────── 2) duvar cetveli ───────────────────────── */

function RulerView({ task, grade, big, sol, onDone, footer }: ViewProps<RulerTask> & { sol: ReturnType<typeof useSolutions> }) {
  const track = useTracker()
  const fresh = useFresh(sol)
  const [wallRef, W] = useWidthOf<HTMLDivElement>()
  const [pos, setPos] = useState(1 / 24) // hiçbir çizgide olmayan başlangıç
  const [found, setFound] = useState<{ key: string; label: string; x: number }[]>([])
  const [msg, setMsg] = useState<Msg>(null)
  const [complete, setComplete] = useState(false)
  const [stratDone, setStratDone] = useState(false)
  const H = big ? 40 : 34
  const LABEL = 40

  const stops = useMemo(() => {
    const s = new Map<number, Frac>()
    for (const d of task.rows) for (let k = 1; k < d; k++) {
      const r = reduce(k, d)
      s.set(Math.round((r.n / r.d) * UNIT), r)
    }
    return [...s.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r)
  }, [task.rows])

  const aligned = (p: number) => task.rows.filter((d) => Math.abs(p * d - Math.round(p * d)) < 1e-6 && Math.round(p * d) > 0 && Math.round(p * d) < d)
  const rowsHere = aligned(pos)

  const snapTo = (p: number) => {
    let best = p
    let bd = 12 / W
    for (const s of stops) {
      const v = s.n / s.d
      if (Math.abs(v - p) < bd) {
        bd = Math.abs(v - p)
        best = v
      }
    }
    return Math.min(0.995, Math.max(0.005, best))
  }

  const evaluate = (p: number) => {
    const rows = aligned(p)
    if (rows.length < 2) {
      setMsg(null)
      return
    }
    const r = reduce(Math.round(p * rows[0]), rows[0])
    const names = rows.map((d) => fr(Math.round(p * d), d))
    const key = `${r.n}/${r.d}`
    if (rows.length < task.minRows) {
      setMsg({ q: `Burada ${rows.length} sıranın çizgisi buluşuyor: ${names.join(' = ')}. En az ${task.minRows} sıranın buluştuğu bir yer var mı?` })
      return
    }
    if (found.some((f) => f.key === key)) {
      setMsg({ q: 'Bu yeri zaten buldun. Cetveli başka bir yere kaydır!' })
      return
    }
    const decName = grade >= 6 && [2, 4, 5, 10].some((d) => (r.d === d)) ? ` = ${dec(r.n / r.d)}` : ''
    const label = names.join(' = ') + decName
    track.attempt(true)
    fresh(`ruler:${key}`, label)
    const nf = [...found, { key, label, x: p }]
    setFound(nf)
    sfx.ok()
    setMsg({ q: nf.length < task.goal ? `${rows.length} sıra aynı çizgide! ${task.goal - nf.length} yer daha bul.` : 'Hepsini buldun!', tone: 'ok' })
    if (nf.length >= task.goal && !complete) {
      setComplete(true)
      track.item(true)
    }
  }

  const bind = useDrag(
    ({ xy: [x], last, event }) => {
      event.stopPropagation()
      const r = wallRef.current?.getBoundingClientRect()
      if (!r) return
      const p = Math.min(0.995, Math.max(0.005, (x - r.left) / r.width))
      const s = snapTo(p)
      setPos(s)
      if (last) evaluate(s)
    },
    { filterTaps: false },
  )

  const tapWall = (e: React.MouseEvent) => {
    const r = wallRef.current?.getBoundingClientRect()
    if (!r) return
    const s = snapTo((e.clientX - r.left) / r.width)
    setPos(s)
    evaluate(s)
  }

  const step = (dir: 1 | -1) => {
    const vals = stops.map((s) => s.n / s.d)
    const nxt = dir > 0 ? vals.find((v) => v > pos + 1e-9) : [...vals].reverse().find((v) => v < pos - 1e-9)
    if (nxt !== undefined) {
      setPos(nxt)
      evaluate(nxt)
    }
  }

  const work = (
    <div className="rounded-3xl bg-[#fdf6ee] p-3 ring-1 ring-amber-200/70 sm:p-4">
      <div className="flex">
        <div className="shrink-0" style={{ width: LABEL }} />
        <div ref={wallRef} className="relative min-w-0 flex-1">
          <Bar d={1} w={W} h={H} grade={grade} />
        </div>
      </div>
      <div className="relative mt-1">
        {task.rows.map((d) => {
          const on = rowsHere.includes(d)
          return (
            <div key={d} className="mb-1 flex items-center">
              <span className={`shrink-0 text-center text-sm font-black transition ${on ? 'text-rose-600' : 'text-ink-soft'}`} style={{ width: LABEL }}>{on ? '✓' : ''}</span>
              <div className="flex min-w-0 flex-1 cursor-pointer" onClick={tapWall} data-testid={`row-${d}`}>
                {Array.from({ length: d }, (_, i) => (
                  <Bar key={i} d={d} w={W / d - 1.5} h={H} grade={grade} style={{ marginRight: 1.5, opacity: on ? 1 : 0.55, transition: 'opacity .2s' }} />
                ))}
              </div>
            </div>
          )
        })}
        {/* cetvel */}
        <div className="pointer-events-none absolute top-[-8px] bottom-[-8px] z-10" style={{ left: LABEL + pos * W }}>
          <div className="absolute top-0 bottom-0 -ml-[2px] w-[4px] rounded bg-rose-500 shadow-[0_0_0_2px_rgba(255,255,255,.8)]" />
        </div>
        {found.map((f) => (
          <div key={f.key} className="pointer-events-none absolute top-0 bottom-0 -ml-px w-[2px] bg-emerald-500/60" style={{ left: LABEL + f.x * W }} />
        ))}
      </div>
      <div className="relative mt-2 h-14">
        <div
          {...bind()}
          data-handle
          data-testid="ruler-handle"
          role="slider"
          aria-label="Cetvel"
          aria-valuenow={Math.round(pos * 1000) / 10}
          className="absolute top-0 grid size-14 -translate-x-1/2 cursor-grab touch-none place-items-center rounded-2xl bg-rose-500 text-white shadow-[0_4px_0_#9f1239] active:cursor-grabbing"
          style={{ left: LABEL + pos * W, touchAction: 'none' }}
        >
          <span className="text-xl font-black">⇔</span>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-center gap-2">
        <button type="button" onClick={() => step(-1)} className="btn-ghost min-h-12 px-3" aria-label="Önceki çizgi"><ChevronLeft size={20} /></button>
        <span className="min-w-40 text-center text-lg font-black text-ink">
          {rowsHere.length ? <MathText text={rowsHere.map((d) => fr(Math.round(pos * d), d)).join(' = ')} /> : <span className="text-sm text-ink-soft">Cetvel bir çizgide değil</span>}
        </span>
        <button type="button" onClick={() => step(1)} className="btn-ghost min-h-12 px-3" aria-label="Sonraki çizgi"><ChevronRight size={20} /></button>
      </div>
    </div>
  )

  const panel = (
    <>
      <Card>
        <p className="text-base leading-snug font-extrabold sm:text-lg"><Rich text={task.prompt} /></p>
        <p className="mt-2 text-sm font-bold text-ink-soft">Bulunan yerler: <b className="text-teal-700">{Math.min(found.length, task.goal)} / {task.goal}</b></p>
        <p className="mt-1 text-xs font-bold text-ink-soft">Kırmızı tutamağı sürükle, sıralara dokun ya da ◀ ▶ ile çizgiden çizgiye atla.</p>
      </Card>
      {msg && <Nudge key={msg.q} question={msg.q} tone={msg.tone} onClose={() => setMsg(null)} />}
      <SolutionList list={found.map((f) => ({ key: f.key, label: f.label }))} goal={task.goal} />
      {complete && !stratDone && (
        <StrategyPicker
          question="Buluşma yerlerini nasıl buldun?"
          options={['Önce yarıma baktım', 'Parçaları ikiye böldüm', 'Sıraları karşılaştırdım', 'Cetveli gezdirdim']}
          onPick={() => { setStratDone(true); onDone(true) }}
        />
      )}
      {complete && <Derived tone="info">Aynı çizgide biten sıralar aynı uzunluktadır: bunlar <b>denk kesirlerdir</b>.</Derived>}
      {footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── 3) sırala ve kanıtla ───────────────────────── */

function OrderView({ task, grade, big, onDone, footer }: ViewProps<OrderTask>) {
  const track = useTracker()
  const [wallRef, W] = useWidthOf<HTMLDivElement>()
  const [chosen, setChosen] = useState<number[]>([])
  const [shown, setShown] = useState(false)
  const [tries, setTries] = useState(0)
  const [msg, setMsg] = useState<Msg>(null)
  const [ok, setOk] = useState(false)
  const H = big ? 46 : 40
  const items = task.items
  const allChosen = chosen.length === items.length
  const v = (i: number) => items[i].n / items[i].d
  const badPair = (() => {
    for (let i = 0; i + 1 < chosen.length; i++) if (v(chosen[i]) < v(chosen[i + 1]) - 1e-9) return i
    return -1
  })()

  const check = () => {
    setShown(true)
    setTries((t) => t + 1)
    if (badPair < 0) {
      setOk(true)
      track.attempt(true)
      track.item(tries === 0)
      sfx.ok()
      setMsg({ q: 'Duvar senin sıranı doğruladı: her çubuk bir öncekinden kısa ya da ona eşit.', tone: 'ok' })
      return
    }
    track.attempt(false)
    const a = items[chosen[badPair]], b = items[chosen[badPair + 1]]
    const unit = a.n === 1 && b.n === 1
    setMsg({
      q: unit
        ? `${fname(a)} çubuğu ${after(b, 'abl')} kısa çıktı. Bütün ${a.d} parçaya bölününce mi, ${b.d} parçaya bölününce mi parçalar daha büyük olur?`
        : `${fname(a)} ile ${fname(b)} yer değiştirmeli gibi görünüyor. Hangisi [[1/2]]’ye ya da 1’e daha yakın?`,
      mis: unit && a.d > b.d ? 'Paydası büyük birim kesir daha büyüktür' : !unit ? 'Kesirleri yalnızca paya ya da paydaya bakarak sıraladı' : undefined,
      tool: true,
    })
  }

  const reset = () => {
    setChosen([])
    setShown(false)
    setMsg(null)
  }

  const work = (
    <div className="rounded-3xl bg-[#fdf6ee] p-3 ring-1 ring-amber-200/70 sm:p-4">
      <p className="mb-2 text-xs font-black tracking-wide text-amber-900/70 uppercase">Kartlar — en büyükten başlayarak dokun</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => {
          const at = chosen.indexOf(i)
          return (
            <button
              key={i}
              type="button"
              data-testid={`card-${it.n}-${it.d}`}
              disabled={at >= 0 || shown}
              onClick={() => setChosen((c) => [...c, i])}
              className={`relative grid min-h-16 min-w-20 place-items-center rounded-2xl px-4 text-3xl font-black ring-2 transition active:scale-95 ${at >= 0 ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-ink shadow-[0_4px_0_#e2e8f0] ring-slate-200 hover:ring-teal-400'}`}
            >
              <MathText text={fname(it)} />
              {at >= 0 && <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-teal-600 text-sm text-white">{at + 1}</span>}
            </button>
          )
        })}
      </div>
      <div ref={wallRef} className="mt-4 w-full">
        <p className="mb-1 text-xs font-black tracking-wide text-amber-900/70 uppercase">Senin sıran {shown ? '— duvarda' : ''}</p>
        <Bar d={1} w={W} h={H} grade={grade} />
        <div className="mt-1 space-y-1">
          {chosen.map((i, k) => {
            const it = items[i]
            const bad = shown && (k === badPair || k === badPair + 1)
            return (
              <div key={k} className="flex items-center gap-2 animate-fade-up">
                {shown ? (
                  <div className={`flex rounded-lg ${bad ? 'ring-4 ring-amber-400 ring-offset-1' : ''}`}>
                    {Array.from({ length: it.n }, (_, j) => (
                      <Bar key={j} d={it.d} w={W / it.d - 1.5} h={H} grade={grade} style={{ marginRight: 1.5 }} />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[40px] items-center rounded-lg bg-white px-3 text-xl font-black ring-1 ring-line">
                    <span className="mr-2 text-sm text-ink-soft">{k + 1}.</span>
                    <MathText text={fname(it)} />
                  </div>
                )}
              </div>
            )
          })}
          {!chosen.length && <p className="py-3 text-sm font-bold text-ink-soft">Henüz kart seçmedin.</p>}
        </div>
      </div>
    </div>
  )

  const panel = (
    <>
      <Card>
        <p className="text-base leading-snug font-extrabold sm:text-lg"><Rich text={task.prompt} /></p>
      </Card>
      <div className="flex gap-2">
        <button type="button" onClick={reset} disabled={!chosen.length || ok} className="btn-ghost min-h-12 flex-1"><RotateCcw size={18} />Yeniden sırala</button>
        <button type="button" data-testid="order-check" onClick={check} disabled={!allChosen || shown} className="btn-primary min-h-12 flex-1"><BrickWall size={18} />Duvarda göster</button>
      </div>
      {ok && <Derived><MathText text={chosen.map((i) => fname(items[i])).join(' > ')} /></Derived>}
      {msg && <Nudge key={msg.q} question={msg.q} tone={msg.tone} misconception={msg.mis} tool={msg.tool ? 'fractions' : undefined} toolConfig={{ dens: [1, 2, 3, 4, 5, 6, 8, 10, 12] }} onClose={ok ? undefined : reset} />}
      {shown && !ok && <p className="text-center text-sm font-bold text-ink-soft">Kapat (✕) ya da “Yeniden sırala” ile tekrar dene.</p>}
      {ok && <ReasonPicker grade={grade} onPick={() => onDone(tries <= 1)} />}
      {footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}

function ReasonPicker({ grade, onPick }: { grade: number; onPick: () => void }) {
  const [done, setDone] = useState(false)
  if (done) return null
  const opts = grade <= 4 ? ['Parça sayısı çoksa parça küçük', 'Kafamda çubukları çizdim', 'Tahmin ettim'] : ['[[1/2]] ile karşılaştırdım', '1’e kalan parçaya baktım', 'Ortak parçaya çevirdim', 'Tahmin ettim']
  return <StrategyPicker question="Sıralarken nasıl düşündün?" options={opts.map((o) => o.replace('[[1/2]]', '½'))} onPick={() => { setDone(true); onPick() }} />
}
