import { useRef, useState, type PointerEvent as RPointerEvent, type ReactElement } from 'react'
import { Minus, Plus, SearchCheck } from 'lucide-react'
import { BigButton } from '../../kit2'
import { num, type BarsLevel, type PeakLevel } from './levels'
import { Shell, useApi } from './shell'
import { NumPad } from './ui'

const W = 800, H = 480

/** İstemci koordinatını SVG koordinatına çevirir (ZoomBox ölçeği dahil) */
function toSvg(svg: SVGSVGElement, x: number, y: number) {
  const m = svg.getScreenCTM()
  if (!m) return { x: 0, y: 0 }
  const p = new DOMPoint(x, y).matrixTransform(m.inverse())
  return { x: p.x, y: p.y }
}

/** Çetele çizgileri: 5’li demetler */
function Tally({ n, x, y, color }: { n: number; x: number; y: number; color: string }) {
  const groups = Math.floor(n / 5), rest = n % 5
  const out: ReactElement[] = []
  let cx = x
  for (let g = 0; g < groups; g++) {
    for (let k = 0; k < 4; k++) out.push(<line key={`g${g}${k}`} x1={cx + k * 7} x2={cx + k * 7} y1={y} y2={y + 26} stroke={color} strokeWidth="3" strokeLinecap="round" />)
    out.push(<line key={`d${g}`} x1={cx - 4} x2={cx + 25} y1={y + 22} y2={y + 4} stroke={color} strokeWidth="3" strokeLinecap="round" />)
    cx += 38
  }
  for (let k = 0; k < rest; k++) out.push(<line key={`r${k}`} x1={cx + k * 7} x2={cx + k * 7} y1={y} y2={y + 26} stroke={color} strokeWidth="3" strokeLinecap="round" />)
  return <g>{out}</g>
}

/* ───────────── 3. sınıf: çeteleden sütun grafiği ───────────── */

export function BarsTask({ level }: { level: BarsLevel }) {
  const api = useApi()
  const D = level.data
  const [vals, setVals] = useState<number[]>(() => D.map(() => 0))
  const [phase, setPhase] = useState<'build' | 'ask'>('build')
  const svg = useRef<SVGSVGElement>(null)
  const L = 70, R = 785, T = 30, B = 330
  const unit = (B - T) / level.max
  const slot = (R - L) / D.length
  const bw = Math.min(96, slot * 0.55)

  const setAt = (i: number, clientY: number, clientX: number) => {
    if (phase !== 'build' || !svg.current) return
    const p = toSvg(svg.current, clientX, clientY)
    const v = Math.max(0, Math.min(level.max, Math.round((B - p.y) / unit)))
    setVals((vs) => vs.map((x, j) => (j === i ? v : x)))
  }
  const onDown = (i: number) => (e: RPointerEvent) => {
    if (phase !== 'build') return
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    setAt(i, e.clientY, e.clientX)
  }
  const onMove = (i: number) => (e: RPointerEvent) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    if (!(e.currentTarget as Element).hasPointerCapture?.(e.pointerId)) return
    setAt(i, e.clientY, e.clientX)
  }
  const bump = (i: number, d: number) => phase === 'build' && setVals((vs) => vs.map((x, j) => (j === i ? Math.max(0, Math.min(level.max, x + d)) : x)))

  const check = () => {
    const bad = D.findIndex((d, i) => vals[i] !== d.value)
    if (bad < 0) {
      api.report(true)
      setPhase('ask')
      api.nudge('Grafik çetelelerle aynı! Şimdi grafiğe bakarak soruyu cevapla.', { tone: 'ok' })
      return
    }
    api.report(false)
    const d = D[bad]
    const groups = Math.floor(d.value / 5)
    if (vals[bad] === groups + (d.value % 5)) return api.nudge(`${d.name} çetelesinde her demet 1 değil, 5 çocuk demek. Demetleri 5’er say: 5, 10, …`, { mis: 'Çetele demetini 1 saydı', tool: true })
    if (vals[bad] === 0) return api.nudge(`${d.name} sütunu henüz yok. Çeteleyi say ve sütunu o sayıya kadar uzat.`)
    api.nudge(`${d.name} sütununu bir daha kontrol et. Çetelede kaç çocuk var? Sütunun tepesi soldaki hangi sayıya denk geliyor?`, { tool: true })
  }
  const submit = (n: number) => {
    if (n === level.question.answer) {
      api.report(true)
      api.strategy('Sütun boylarını karşılaştırdım')
      return api.complete(`Evet! Fark ${n}. Grafikte iki sütunun boyu arasındaki fark, bir sütunun ötekinden kaç fazla olduğunu gösterir.`)
    }
    api.report(false)
    const d = level.question.diagnose(n)
    api.nudge(d.msg, { mis: d.mis, tool: true })
  }

  const scene = (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full bg-[linear-gradient(180deg,#fdf4ff,#fff)] select-none" style={{ touchAction: 'none' }} role="img" aria-label="Ziyaretçi sütun grafiği ve çeteleler">
      <text x={L} y={20} fontSize="15" fontWeight="900" fill="#86198f">Oyuncaklara binen çocuk sayısı</text>
      {Array.from({ length: level.max + 1 }, (_, v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={B - v * unit} y2={B - v * unit} stroke={v % 5 === 0 ? '#e9d5ff' : '#f3e8ff'} strokeWidth={v % 5 === 0 ? 2 : 1} />
          {(v % (level.max > 12 ? 1 : 1) === 0) && <text x={L - 10} y={B - v * unit + 5} textAnchor="end" fontSize={v % 5 === 0 ? 15 : 12} fontWeight={v % 5 === 0 ? 900 : 700} fill="#6b21a8">{v}</text>}
        </g>
      ))}
      <line x1={L} x2={L} y1={T - 6} y2={B} stroke="#6b21a8" strokeWidth="2.5" />
      <line x1={L} x2={R} y1={B} y2={B} stroke="#6b21a8" strokeWidth="2.5" />
      {D.map((d, i) => {
        const cx = L + slot * (i + 0.5)
        const h = vals[i] * unit
        return (
          <g key={d.name}>
            <rect x={cx - slot / 2 + 4} y={T - 10} width={slot - 8} height={B - T + 14} fill="transparent" data-handle style={{ cursor: phase === 'build' ? 'ns-resize' : 'default' }} onPointerDown={onDown(i)} onPointerMove={onMove(i)} />
            <rect x={cx - bw / 2} y={B - h} width={bw} height={h} rx={6} fill={d.color} stroke="#fff" strokeWidth="2" pointerEvents="none" className="transition-all duration-100" />
            {phase === 'build' && (
              <g pointerEvents="none" transform={`translate(${cx} ${B - h})`}>
                <rect x={-bw / 2 - 4} y={-9} width={bw + 8} height={14} rx={7} fill="#1e293b" opacity=".85" />
                <path d="M-8 -2 h16 M-8 2 h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            {vals[i] > 0 && <text x={cx} y={B - h - 16} textAnchor="middle" fontSize="18" fontWeight="900" fill="#1e293b" pointerEvents="none">{vals[i]}</text>}
            <text x={cx} y={B + 30} textAnchor="middle" fontSize="26" pointerEvents="none">{d.emoji}</text>
            <text x={cx} y={B + 52} textAnchor="middle" fontSize="14" fontWeight="900" fill="#334155" pointerEvents="none">{d.name}</text>
            <rect x={cx - slot / 2 + 10} y={B + 62} width={slot - 20} height={66} rx={10} fill="#fff" stroke="#e9d5ff" strokeWidth="2" pointerEvents="none" />
            <text x={cx - slot / 2 + 18} y={B + 78} fontSize="11" fontWeight="900" fill="#a21caf" pointerEvents="none">ÇETELE</text>
            <g pointerEvents="none"><Tally n={d.value} x={cx - slot / 2 + 22} y={B + 88} color="#334155" /></g>
          </g>
        )
      })}
    </svg>
  )

  const controls = (
    <div className="flex flex-col gap-2">
      {phase === 'build' && (
        <>
          <div className="rounded-2xl bg-white/95 p-2 ring-1 ring-line">
            {D.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-0">
                <span className="min-w-0 text-[15px] leading-tight font-black"><span className="mr-1 text-2xl" aria-hidden>{d.emoji}</span>{d.name}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => bump(i, -1)} disabled={vals[i] <= 0} className="grid size-14 place-items-center rounded-xl bg-white ring-1 ring-line shadow-[0_3px_0_#d9dbe8] active:translate-y-[2px] active:shadow-none disabled:opacity-35" aria-label={`${d.name} azalt`}><Minus size={22} strokeWidth={3} /></button>
                  <span className="w-8 text-center text-2xl font-black tabular-nums">{vals[i]}</span>
                  <button type="button" onClick={() => bump(i, 1)} disabled={vals[i] >= level.max} className="grid size-14 place-items-center rounded-xl bg-white ring-1 ring-line shadow-[0_3px_0_#d9dbe8] active:translate-y-[2px] active:shadow-none disabled:opacity-35" aria-label={`${d.name} artır`}><Plus size={22} strokeWidth={3} /></button>
                </div>
              </div>
            ))}
          </div>
          <BigButton onClick={check} className="w-full"><SearchCheck size={20} />Grafiği kontrol et</BigButton>
        </>
      )}
      {phase === 'ask' && !api.done && (
        <div className="animate-fade-up">
          <p className="mb-2 text-base font-black">{level.question.q}</p>
          <NumPad unit="çocuk" onSubmit={submit} big={api.big} />
        </div>
      )}
    </div>
  )
  return <Shell scene={scene} controls={controls} />
}

/* ───────────── 4–5. sınıf: kapasite çizgisi ───────────── */

export function PeakTask({ level }: { level: PeakLevel }) {
  const api = useApi()
  const G = level.groups
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<'select' | 'ask'>('select')
  const L = 70, R = 785, T = 64, B = 410
  const unit = (B - T) / level.max
  const slot = (R - L) / level.labels.length
  const bw = Math.min(56, (slot * 0.78) / G.length)
  const step = level.max <= 360 ? 60 : 60
  const over = new Set<string>()
  G.forEach((g, gi) => g.values.forEach((v, i) => v > level.cap && over.add(`${gi}-${i}`)))

  const toggle = (k: string) => {
    if (phase !== 'select') return
    setSel((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }
  const check = () => {
    if (sel.size === 0) return api.nudge('Kuyruk oluşan saatlerin sütunlarına dokun. Hangi sütunlar kırmızı çizginin üstüne çıkıyor?')
    const wrong = [...sel].filter((k) => !over.has(k))
    const missing = [...over].filter((k) => !sel.has(k))
    if (!wrong.length && !missing.length) {
      api.report(true)
      api.strategy('Kapasite çizgisiyle karşılaştırdım')
      setPhase('ask')
      return api.nudge(`Evet! Bu ${over.size} saatte gelen kişi, dolabın taşıyabileceğinden fazla. Şimdi soruyu cevapla.`, { tone: 'ok' })
    }
    api.report(false)
    if (wrong.length) {
      const [gi, i] = wrong[0].split('-').map(Number)
      const v = G[gi].values[i]
      return api.nudge(`${G.length > 1 ? `${G[gi].name} ` : ''}${level.labels[i]}${level.labels[i].includes('.') ? '' : '.00'} sütunu ${num(v)} kişi; kapasite ${num(level.cap)}. Bu saatte herkes binebilir mi?`, { mis: v === level.cap ? undefined : 'Kapasitenin altındaki saati kuyruklu sandı' })
    }
    api.nudge(`${missing.length} saati daha kaçırdın. ${G.length > 1 ? 'İki günün sütunlarına da' : 'Bütün sütunlara'} bak: tepesi çizginin üstünde olan var mı?`, { tool: true })
  }
  const submit = (n: number) => {
    if (n === level.question.answer) {
      api.report(true)
      return api.complete(`Evet, ${num(n)} ${level.question.unit}!`)
    }
    api.report(false)
    const d = level.question.diagnose(n)
    api.nudge(d.msg, { mis: d.mis, tool: true })
  }

  const ticks = Array.from({ length: Math.floor(level.max / step) + 1 }, (_, k) => k * step)
  const capY = B - level.cap * unit
  const scene = (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full bg-[linear-gradient(180deg,#f5f3ff,#fff)] select-none" style={{ touchAction: 'none' }} role="img" aria-label="Saatlere göre ziyaretçi grafiği ve dolap kapasitesi">
      <text x={L} y={24} fontSize="16" fontWeight="900" fill="#4c1d95">Saat saat dönme dolaba gelen ziyaretçi</text>
      {G.map((g, gi) => (
        <g key={g.name} transform={`translate(${L + gi * 140} 36)`}>
          <rect width="16" height="16" rx="4" fill={g.color} />
          <text x="22" y="13" fontSize="14" fontWeight="800" fill="#334155">{g.name}</text>
        </g>
      ))}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={B - v * unit} y2={B - v * unit} stroke="#ede9fe" strokeWidth="1.5" />
          <text x={L - 10} y={B - v * unit + 5} textAnchor="end" fontSize="13" fontWeight="800" fill="#5b21b6">{v}</text>
        </g>
      ))}
      <line x1={L} x2={L} y1={T - 6} y2={B} stroke="#5b21b6" strokeWidth="2.5" />
      <line x1={L} x2={R} y1={B} y2={B} stroke="#5b21b6" strokeWidth="2.5" />
      {level.labels.map((lb, i) => {
        const cx = L + slot * (i + 0.5)
        return (
          <g key={lb}>
            {G.map((g, gi) => {
              const k = `${gi}-${i}`
              const v = g.values[i]
              const x = cx - (bw * G.length) / 2 + gi * bw
              const on = sel.has(k)
              return (
                <g key={k} data-handle onClick={() => toggle(k)} style={{ cursor: phase === 'select' ? 'pointer' : 'default' }}>
                  <rect x={x} y={T} width={bw} height={B - T} fill="transparent" />
                  <rect x={x + 2} y={B - v * unit} width={bw - 4} height={v * unit} rx={5} fill={g.color} stroke={on ? '#111827' : '#fff'} strokeWidth={on ? 4 : 1.5} />
                  {v > level.cap && phase === 'ask' && <rect x={x + 2} y={B - v * unit} width={bw - 4} height={(v - level.cap) * unit} rx={5} fill="url(#lp-hatch)" />}
                  <text x={x + bw / 2} y={B - v * unit - 7} textAnchor="middle" fontSize={bw < 34 ? 11 : 13} fontWeight="900" fill="#1e293b">{v}</text>
                  {on && <text x={x + bw / 2} y={B - v * unit - 24} textAnchor="middle" fontSize="18">⚠️</text>}
                </g>
              )
            })}
            <text x={cx} y={B + 22} textAnchor="middle" fontSize="15" fontWeight="900" fill="#334155">{lb}{lb.includes('.') ? '' : '.00'}</text>
          </g>
        )
      })}
      <defs>
        <pattern id="lp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="rgb(255 255 255 / .25)" /><line x1="0" y1="0" x2="0" y2="8" stroke="#fff" strokeWidth="3" /></pattern>
      </defs>
      <line x1={L} x2={R} y1={capY} y2={capY} stroke="#e11d48" strokeWidth="3.5" strokeDasharray="12 7" pointerEvents="none" />
      <g transform={`translate(${R} ${capY - 34})`} pointerEvents="none">
        <rect x={-232} y={0} width={232} height={26} rx={8} fill="#e11d48" />
        <text x={-116} y={18} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">🎡 Kapasite: saatte {num(level.cap)} kişi</text>
      </g>
    </svg>
  )

  const controls = (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl bg-white/95 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line">{level.capLabel}</div>
      {phase === 'select' && (
        <>
          <div className="rounded-2xl bg-white/95 px-3 py-2 ring-1 ring-line">
            <p className="text-xs font-black tracking-wide text-ink-soft uppercase">Seçtiğin saatler</p>
            <p className="min-h-7 text-lg font-black">{sel.size ? [...sel].sort().map((k) => { const [gi, i] = k.split('-').map(Number); return `${G.length > 1 ? `${G[gi].name.slice(0, 3)} ` : ''}${level.labels[i]}${level.labels[i].includes('.') ? '' : '.00'}` }).join(' · ') : '—'}</p>
          </div>
          <BigButton onClick={check} className="w-full"><SearchCheck size={20} />Kontrol et</BigButton>
        </>
      )}
      {phase === 'ask' && !api.done && (
        <div className="animate-fade-up">
          <p className="mb-2 text-base font-black">{level.question.q}</p>
          <NumPad unit={level.question.unit} onSubmit={submit} />
        </div>
      )}
    </div>
  )
  return <Shell scene={scene} controls={controls} />
}
