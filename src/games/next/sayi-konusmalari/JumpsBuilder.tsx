import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Undo2 } from 'lucide-react'
import { DragPoint, Plane, usePlane } from '../../../interactive/Plane'
import { FinalAnswer } from './FinalAnswer'
import type { BuildResult } from './ChipsBuilder'
import { fmtN, fmtSum, isInt, r6, same, type Problem, type StratKey } from './problems'
import { Trail, useTheme } from './ui'

/**
 * Açık sayı doğrusu: başlangıç noktasından zıplamalarla hedefe git.
 *  - Zıplama düğmeleri (+10, +1, −1 …) ya da son noktayı sürükleyerek özel uzunlukta zıplama.
 *  - Çıkarmada iki yol: büyük sayıdan geri zıpla ya da küçük sayıdan büyüğe ileri zıpla (aradaki fark).
 *  - İki parmakla yakınlaştırınca çentikler incelir (ondalıklarda 0,1 → 0,01).
 */

type Mode = 'fwd' | 'back' | 'diff'

function Arcs({ start, jumps, dark }: { start: number; jumps: number[]; dark: boolean }) {
  const P = usePlane()
  const y0 = P.sy(0)
  let x = start
  return (
    <g>
      {jumps.map((j, i) => {
        const x0 = x
        x = r6(x + j)
        const a = P.sx(x0), b = P.sx(x)
        const h = Math.min(58, 14 + Math.abs(b - a) * 0.32)
        const col = j > 0 ? '#16a34a' : '#e11d48'
        return (
          <g key={i}>
            <path d={`M${a} ${y0 - 4} Q ${(a + b) / 2} ${y0 - 2 * h} ${b} ${y0 - 4}`} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" />
            <path d={`M${b} ${y0 - 4} l ${j > 0 ? -9 : 9} -6 M${b} ${y0 - 4} l ${j > 0 ? -2 : 2} -10`} stroke={col} strokeWidth={3} strokeLinecap="round" />
            <rect x={(a + b) / 2 - 26} y={y0 - h - 22} width={52} height={22} rx={11} fill={dark ? '#0f172a' : '#fff'} stroke={col} strokeWidth={2} />
            <text x={(a + b) / 2} y={y0 - h - 6} textAnchor="middle" fontSize={14} fontWeight={900} fill={col}>{j > 0 ? '+' : '−'}{fmtN(Math.abs(j))}</text>
            <circle cx={b} cy={y0} r={5} fill={col} />
          </g>
        )
      })}
      <circle cx={P.sx(start)} cy={y0} r={8} fill="#1f2340" />
    </g>
  )
}

function classify(mode: Mode, start: number, jumps: number[]): StratKey {
  if (mode === 'diff') return 'fark'
  const dir = Math.sign(jumps.reduce((a, b) => a + b, 0))
  if (jumps.some((j) => Math.sign(j) !== dir)) return 'telafi'
  const first = r6(start + jumps[0])
  const round = (v: number) => (isInt(start) && isInt(v) ? v % 10 === 0 : isInt(v))
  if (jumps.length >= 2 && !round(start) && round(first)) return same(first, 0) ? 'sifir' : 'tamamla'
  return 'zipla'
}

export function JumpsBuilder({ p, onDone }: { p: Problem; onDone: (r: BuildResult) => void }) {
  const t = useTheme()
  const [a, y] = p.terms
  const isSub = p.kind === 'sub'
  const b = isSub ? -y : y
  const [mode, setMode] = useState<Mode | null>(null)
  const [jumps, setJumps] = useState<number[]>([])
  const [dir, setDir] = useState<1 | -1>(1)
  const [fromB, setFromB] = useState(false)
  /** Son zıplama düğmeyle mi yapıldı? Öyleyse sürükleme yeni bir zıplama başlatır. */
  const [lastBtn, setLastBtn] = useState(false)

  const start = mode === 'diff' ? b : fromB ? y : a
  const target = mode === 'diff' ? a : p.answer
  const pos = r6(start + jumps.reduce((s, j) => s + j, 0))
  const done = mode !== null && same(pos, target)

  const sizes = useMemo(() => {
    const total = Math.abs(target - start) || 1
    // 10’un kuvvetleri (adım birimden başlayarak) her zaman; yer kalırsa 5’li ara boylar
    const tens: number[] = []
    for (let s = p.step; s <= total * 1.3 + 1e-9 && tens.length < 5; s = r6(s * 10)) tens.push(s)
    const fives = tens.map((s) => r6(s * 5)).filter((f) => f <= total * 1.3 + 1e-9).reverse()
    const out = [...tens]
    for (const f of fives) if (out.length < 6) out.push(f)
    return out.sort((x, y) => x - y)
  }, [p.step, start, target])

  const view = useMemo(() => {
    const lo = Math.min(start, target), hi = Math.max(start, target)
    const pad = Math.max((hi - lo) * 0.18, p.step * 4, isInt(p.step) ? 2 : 0.2)
    return { xMin: lo - pad, xMax: hi + pad, yMin: -1, yMax: 1 }
  }, [start, target, p.step])

  const choose = (m: Mode, fb = false) => {
    setMode(m)
    setFromB(fb)
    setJumps([])
    setDir(m === 'back' || (fb ? a : y) < 0 ? -1 : 1)
  }

  if (!mode) {
    const opts: { m: Mode; fb?: boolean; title: string; sub: string }[] = isSub
      ? [
          { m: 'back', title: `${fmtN(a)} noktasından geri zıpla`, sub: `${fmtN(b)} kadar geri git, nereye varırsın?` },
          { m: 'diff', title: `${fmtN(b)} noktasından ${fmtN(a)} noktasına ileri zıpla`, sub: 'Aradaki farkı bul (toplamayı düşün).' },
        ]
      : [
          { m: 'fwd', title: `${fmtN(a)} noktasından başla`, sub: `${fmtN(Math.abs(y))} kadar ${y < 0 ? 'geri' : 'ileri'} zıpla.` },
          { m: 'fwd', fb: true, title: `${fmtN(y)} noktasından başla`, sub: `${fmtN(Math.abs(a))} kadar ${a < 0 ? 'geri' : 'ileri'} zıpla.` },
        ]
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o, i) => (
          <button key={i} type="button" onClick={() => choose(o.m, o.fb)} className={`min-h-20 rounded-2xl p-4 text-left transition active:scale-[.98] ${t.chip}`}>
            <span className="block text-lg font-black">{o.title}</span>
            <span className={`block text-sm font-bold ${t.muted}`}>{o.sub}</span>
          </button>
        ))}
      </div>
    )
  }

  const trail = [jumps.length ? [start, ...jumps.map((_, i) => r6(start + jumps.slice(0, i + 1).reduce((s, j) => s + j, 0)))].map(fmtN).join(' → ') : fmtN(start)]
  if (jumps.length) trail.push(jumps.map((j, i) => (i === 0 ? `${j < 0 ? '−' : '+'}${fmtN(Math.abs(j))}` : `${j < 0 ? '−' : '+'} ${fmtN(Math.abs(j))}`)).join(' '))

  const dragTo = (x: number) => {
    if (done) return
    const nx = r6(Math.round(x / p.step) * p.step)
    if (!jumps.length || lastBtn) {
      if (!same(nx, pos)) {
        setJumps([...jumps, r6(nx - pos)])
        setLastBtn(false)
      }
      return
    }
    const prev = r6(pos - jumps[jumps.length - 1])
    const nj = r6(nx - prev)
    setJumps(same(nj, 0) ? jumps.slice(0, -1) : [...jumps.slice(0, -1), nj])
  }

  return (
    <div>
      <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-extrabold ${t.muted}`}>
        <span>Başlangıç: <b className={t.strong}>{fmtN(start)}</b> · {mode === 'diff' ? <>Hedef: <b className={t.strong}>{fmtN(target)}</b></> : <>Zıplaman gereken: <b className={t.strong}>{fmtN(Math.abs(target - start))}</b></>}</span>
        <button type="button" onClick={() => setMode(null)} className={`min-h-10 rounded-xl px-3 ${t.chip}`}>Başlangıcı değiştir</button>
      </div>
      <Plane key={`${mode}-${fromB}`} mode="x" initial={view} minSpan={p.step * 8} maxSpan={Math.max(40, (view.xMax - view.xMin) * 4)} label="Açık sayı doğrusu">
        <Arcs start={start} jumps={jumps} dark={t.dark} />
        {mode === 'diff' && <TargetFlag x={target} />}
        <DragPoint x={pos} y={0} r={13} color={done ? '#16a34a' : '#d6457a'} disabled={done} onChange={(q) => dragTo(q.x)} />
      </Plane>

      {!done && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <div className={`flex overflow-hidden rounded-2xl ${t.soft}`} role="group" aria-label="Yön">
            <button type="button" onClick={() => setDir(-1)} aria-pressed={dir === -1} className={`grid min-h-12 min-w-12 place-items-center px-3 font-black ${dir === -1 ? 'bg-rose-500 text-white' : ''}`} aria-label="Geri zıpla"><ArrowLeft size={20} /></button>
            <button type="button" onClick={() => setDir(1)} aria-pressed={dir === 1} className={`grid min-h-12 min-w-12 place-items-center px-3 font-black ${dir === 1 ? 'bg-emerald-500 text-white' : ''}`} aria-label="İleri zıpla"><ArrowRight size={20} /></button>
          </div>
          {sizes.map((s) => (
            <button key={s} type="button" onClick={() => { setJumps([...jumps, r6(dir * s)]); setLastBtn(true) }} className={`min-h-12 min-w-16 rounded-2xl px-3 text-lg font-black transition active:scale-95 ${dir > 0 ? (t.dark ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400' : 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200') : t.dark ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400' : 'bg-rose-50 text-rose-800 ring-2 ring-rose-200'}`} aria-label={`${dir > 0 ? 'İleri' : 'Geri'} ${fmtN(s)} zıpla`}>
              {dir > 0 ? '+' : '−'}{fmtN(s)}
            </button>
          ))}
          {jumps.length > 0 && (
            <button type="button" onClick={() => { setJumps(jumps.slice(0, -1)); setLastBtn(true) }} className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-3 font-extrabold ${t.chip}`}><Undo2 size={18} />Geri al</button>
          )}
        </div>
      )}
      {!done && <p className={`mt-2 text-center text-xs font-bold ${t.muted}`}>Zıplama düğmelerine dokun ya da pembe noktayı sürükleyerek kendi zıplamanı yap. {mode === 'diff' ? 'Bayrağa ulaş!' : ''}</p>}
      {!done && jumps.length > 0 && (mode === 'diff' ? pos > target : (target - start) * (pos - target) > 0) && (
        <p className={`mt-1 text-center text-sm font-extrabold ${t.dark ? 'text-amber-300' : 'text-amber-700'}`}>Hedefi geçtin! Geri zıplayarak düzeltebilirsin — bu da bir strateji.</p>
      )}

      <Trail lines={trail} className="mt-3" />
      {done && (
        <FinalAnswer
          p={p}
          expr={mode === 'diff' ? fmtSum(jumps) : p.text}
          expected={p.answer}
          onCorrect={(firstTry) => onDone({ key: classify(mode, start, jumps), trail: [...trail, `${mode === 'diff' ? fmtSum(jumps) : p.text} = ${fmtN(p.answer)}`], firstTry })}
        />
      )}
    </div>
  )
}

function TargetFlag({ x }: { x: number }) {
  const P = usePlane()
  const px = P.sx(x), y0 = P.sy(0)
  return (
    <g aria-hidden>
      <line x1={px} x2={px} y1={y0} y2={y0 - 46} stroke="#334155" strokeWidth={3} />
      <path d={`M${px} ${y0 - 46} l 22 7 l -22 7 z`} fill="#f59e0b" />
    </g>
  )
}
