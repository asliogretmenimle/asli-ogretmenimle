import { useRef } from 'react'
import { ClockFace } from '../components/Visual'
import { MathText } from '../components/MathText'
import { Readout, Stepper, ToolButton } from './ui'
import { n, type ToolDef } from './types'

// ─── Kesir şeritleri ───────────────────────────────────────────────────────
type F = { den: number; on: boolean[] }
const shaded = (v: F) => v.on.filter(Boolean).length

export const fractions: ToolDef<F> = {
  id: 'fractions',
  defaultConfig: { dens: [1, 2, 3, 4, 5, 6, 8, 10, 12] },
  initial: (c) => {
    const den = (c.dens ?? [1])[0]
    return { den, on: Array(den).fill(false) }
  },
  check: (v, t) => {
    const num = n(t, 'num'), den = n(t, 'den', 1)
    if (t.exact) return v.den === den && shaded(v) === num
    return Math.abs(shaded(v) / v.den - num / den) < 1e-9
  },
  Component: ({ value, onChange, config, target, locked }) => {
    const dens = config.dens ?? [1, 2, 3, 4, 5, 6, 8, 10, 12]
    const setDen = (d: number) => !locked && onChange({ den: d, on: Array(d).fill(false) })
    const toggle = (i: number) => {
      if (locked) return
      const on = value.on.slice()
      on[i] = !on[i]
      onChange({ ...value, on })
    }
    const k = shaded(value)
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className="mr-1 self-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Parça sayısı</span>
          {dens.map((d) => (
            <ToolButton key={d} onClick={() => setDen(d)} active={value.den === d} disabled={locked}>{d}</ToolButton>
          ))}
        </div>
        <div className="w-full max-w-xl">
          <div className="mb-1 rounded-lg bg-slate-700 py-2 text-center text-sm font-black text-white">1 bütün</div>
          <div className="flex h-16 overflow-hidden rounded-lg ring-2 ring-ink">
            {value.on.map((on, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className={`flex-1 border-r-2 border-ink text-sm font-black last:border-r-0 transition ${on ? 'bg-brand text-white' : 'bg-white text-ink-soft hover:bg-indigo-50'}`}
                aria-label={`${i + 1}. parça`}
                aria-pressed={on}
              >
                {value.den > 1 && value.den <= 12 && <MathText text={`[[1/${value.den}]]`} />}
              </button>
            ))}
          </div>
          {!target && (
            <div className="mt-4 space-y-1 opacity-80">
              {[2, 3, 4, 6, 8].map((d) => (
                <div key={d} className="flex h-7 overflow-hidden rounded ring-1 ring-slate-400">
                  {Array.from({ length: d }).map((_, i) => (
                    <div key={i} className="flex flex-1 items-center justify-center border-r border-slate-400 bg-slate-50 text-[10px] font-bold text-slate-500 last:border-r-0">
                      <MathText text={`[[1/${d}]]`} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <Readout>
          <span className="text-2xl"><MathText text={`[[${k}/${value.den}]]`} /></span>
          {!target && <span className="ml-3 text-base text-white/70">≈ {Math.round((k / value.den) * 100) / 100 === 0 ? '0' : (k / value.den).toLocaleString('tr-TR', { maximumFractionDigits: 3 })}</span>}
        </Readout>
      </div>
    )
  },
}

// ─── Saat ──────────────────────────────────────────────────────────────────
type T = { h: number; m: number }
export const clock: ToolDef<T> = {
  id: 'clock',
  defaultConfig: { minuteStep: 5 },
  initial: () => ({ h: 12, m: 0 }),
  check: (v, t) => v.h % 12 === n(t, 'h') % 12 && v.m === n(t, 'm'),
  Component: ({ value, onChange, config, target, locked }) => {
    const step = config.minuteStep ?? 5
    const ref = useRef<HTMLDivElement>(null)
    const drag = useRef(false)
    const addMin = (d: number) => {
      if (locked) return
      let total = (value.h % 12) * 60 + value.m + d
      total = ((total % 720) + 720) % 720
      onChange({ h: Math.floor(total / 60) || 12, m: total % 60 })
    }
    const fromPointer = (e: React.PointerEvent) => {
      if (!ref.current || locked) return
      const r = ref.current.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.width / 2)
      let ang = (Math.atan2(x, -y) * 180) / Math.PI
      if (ang < 0) ang += 360
      let m = Math.round(ang / 6 / step) * step
      if (m === 60) m = 0
      let h = value.h
      if (value.m >= 45 && m <= 15) h = (h % 12) + 1
      else if (value.m <= 15 && m >= 45) h = ((h + 10) % 12) + 1
      onChange({ h, m })
    }
    const pad = (x: number) => String(x).padStart(2, '0')
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          ref={ref}
          className="touch-none select-none"
          onPointerDown={(e) => { drag.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e) }}
          onPointerMove={(e) => drag.current && fromPointer(e)}
          onPointerUp={() => (drag.current = false)}
        >
          <ClockFace h={value.h} m={value.m} size={240} />
        </div>
        <p className="-mt-2 text-sm font-bold text-ink-soft">Yelkovanı (mavi) sürükleyerek döndür.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Stepper label="Saat" value={pad(value.h)} onDec={() => addMin(-60)} onInc={() => addMin(60)} disabled={locked} color="#ef4444" />
          <Stepper label="Dakika" value={pad(value.m)} onDec={() => addMin(-step)} onInc={() => addMin(step)} disabled={locked} color="#3b82f6" />
        </div>
        {!target && (
          <Readout>
            {pad(value.h)}.{pad(value.m)} <span className="text-white/60">ya da</span> {pad(value.h + 12 === 24 ? 0 : value.h + 12)}.{pad(value.m)}
          </Readout>
        )}
      </div>
    )
  },
}
