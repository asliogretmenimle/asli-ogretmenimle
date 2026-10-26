import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Minus, Plus, Sigma } from 'lucide-react'
import { useWidth } from '../../kit'
import { FinalAnswer } from './FinalAnswer'
import type { BuildResult } from './ChipsBuilder'
import { fmtN, type Problem } from './problems'
import { Trail, useTheme } from './ui'

/**
 * Alan modeli: a × b bir dikdörtgendir. Üst ve sol kenardaki tutamaçları sürükleyerek kenarları parçala;
 * her parça dikdörtgenin çarpımı görünür (dağılma özelliği). Sonunda parçaları öğrenci toplar.
 */
const FILLS = ['#fecdd3', '#bae6fd', '#fde68a', '#bbf7d0']
const FILLS_DARK = ['#9f1239', '#075985', '#854d0e', '#166534']

export function AreaBuilder({ p, onDone }: { p: Problem; onDone: (r: BuildResult) => void }) {
  const t = useTheme()
  const [A, B] = p.terms
  const [sa, setSa] = useState(0)
  const [sb, setSb] = useState(0)
  const [final, setFinal] = useState(false)
  const [wrapRef, w] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)

  const pad = 60
  const W = Math.max(220, Math.min(620, w) - pad - 12)
  const kx = W / A
  const H = Math.max(130, Math.min(300, B * kx))
  const ky = H / B
  const proportional = Math.abs(H - B * kx) < 1

  const cols = sa ? [sa, A - sa] : [A]
  const rows = sb ? [sb, B - sb] : [B]
  const parts: { w: number; h: number; x: number; y: number }[] = []
  let yy = 0
  rows.forEach((h) => {
    let xx = 0
    cols.forEach((wd) => {
      parts.push({ w: wd, h, x: xx, y: yy })
      xx += wd
    })
    yy += h
  })

  const drag = (axis: 'x' | 'y') => (e: RPointerEvent) => {
    if (final) return
    const el = e.currentTarget as Element
    el.setPointerCapture(e.pointerId)
    const move = (cx: number, cy: number) => {
      const r = svgRef.current!.getBoundingClientRect()
      const sc = r.width / (W + pad + 8)
      if (axis === 'x') setSa(Math.max(0, Math.min(A - 1, Math.round(((cx - r.left) / sc - pad) / kx))))
      else setSb(Math.max(0, Math.min(B - 1, Math.round(((cy - r.top) / sc - pad) / ky))))
    }
    move(e.clientX, e.clientY)
    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY)
    const onUp = () => {
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp)
  }

  const products = parts.map((q) => q.w * q.h)
  const lines = [`${p.terms.map(fmtN).join(` ${p.times} `)}${sa || sb ? ` = ${sa ? `(${fmtN(sa)} + ${fmtN(A - sa)})` : fmtN(A)} ${p.times} ${sb ? `(${fmtN(sb)} + ${fmtN(B - sb)})` : fmtN(B)}` : ''}`]
  if (sa || sb) parts.forEach((q, i) => lines.push(`${fmtN(q.w)} ${p.times} ${fmtN(q.h)} = ${fmtN(products[i])}`))
  const sumExpr = sa || sb ? products.map(fmtN).join(' + ') : `${fmtN(A)} ${p.times} ${fmtN(B)}`

  const stepper = (label: string, v: number, max: number, set: (x: number) => void) => (
    <div className={`flex items-center gap-1.5 rounded-2xl p-1.5 ${t.soft}`} role="group" aria-label={label}>
      <span className={`px-2 text-xs font-black ${t.muted}`}>{label}</span>
      <button type="button" disabled={final || v <= 0} onClick={() => set(v - 1)} className={`grid size-11 place-items-center rounded-xl ${t.chip} disabled:opacity-30`} aria-label={`${label}: 1 azalt`}><Minus size={16} /></button>
      <span className="min-w-20 text-center text-lg font-black tabular-nums">{v ? `${fmtN(v)} + ${fmtN(max - v)}` : fmtN(max)}</span>
      <button type="button" disabled={final || v >= max - 1} onClick={() => set(v + 1)} className={`grid size-11 place-items-center rounded-xl ${t.chip} disabled:opacity-30`} aria-label={`${label}: 1 artır`}><Plus size={16} /></button>
      {max >= 20 && <button type="button" disabled={final || v + 10 >= max} onClick={() => set(v + 10)} className={`grid h-11 place-items-center rounded-xl px-2 text-sm font-black ${t.chip} disabled:opacity-30`} aria-label={`${label}: 10 artır`}>+10</button>}
    </div>
  )

  const fills = t.dark ? FILLS_DARK : FILLS
  return (
    <div>
      <div ref={wrapRef} className="w-full">
        <svg ref={svgRef} viewBox={`0 0 ${W + pad + 8} ${H + pad + 8}`} className="mx-auto block w-full max-w-[640px] touch-none select-none" role="img" aria-label={`${fmtN(A)} ${p.times} ${fmtN(B)} alan modeli`}>
          {parts.map((q, i) => {
            const x = pad + q.x * kx, y = pad + q.y * ky, ww = q.w * kx, hh = q.h * ky
            const fs = Math.max(12, Math.min(26, Math.min(ww / 5, hh / 2.6)))
            return (
              <g key={i}>
                <rect x={x} y={y} width={ww} height={hh} fill={fills[i % 4]} stroke={t.dark ? '#e2e8f0' : '#1f2340'} strokeWidth={2} />
                {ww > 34 && hh > 26 && (
                  <>
                    <text x={x + ww / 2} y={y + hh / 2 - (hh > 52 ? fs * 0.3 : -fs * 0.35)} textAnchor="middle" fontSize={fs * 0.75} fontWeight={800} fill={t.dark ? '#e2e8f0' : '#334155'}>{fmtN(q.w)} {p.times} {fmtN(q.h)}</text>
                    {hh > 52 && <text x={x + ww / 2} y={y + hh / 2 + fs * 0.9} textAnchor="middle" fontSize={fs} fontWeight={900} fill={t.dark ? '#fff' : '#0f172a'}>{(sa || sb) ? fmtN(q.w * q.h) : '?'}</text>}
                  </>
                )}
              </g>
            )
          })}
          {/* kenar etiketleri */}
          {cols.map((c, i) => (
            <text key={`c${i}`} x={pad + (i ? sa : 0) * kx + (c * kx) / 2} y={pad - 40} textAnchor="middle" fontSize={16} fontWeight={900} fill={t.dark ? '#a5f3fc' : '#be123c'}>{fmtN(c)}</text>
          ))}
          {rows.map((r, i) => (
            <text key={`r${i}`} x={pad - 38} y={pad + (i ? sb : 0) * ky + (r * ky) / 2 + 5} textAnchor="end" fontSize={16} fontWeight={900} fill={t.dark ? '#a5f3fc' : '#0369a1'}>{fmtN(r)}</text>
          ))}
          {/* tutamaçlar */}
          {!final && (
            <>
              <g data-handle onPointerDown={drag('x')} style={{ cursor: 'ew-resize' }} role="slider" aria-label="Üst kenarı böl" aria-valuenow={sa}>
                <rect x={pad - 6} y={pad - 36} width={W + 6} height={36} fill="transparent" />
                <line x1={pad + sa * kx} x2={pad + sa * kx} y1={pad - 8} y2={pad + H} stroke={t.accent} strokeWidth={sa ? 3 : 0} strokeDasharray="6 4" />
                <circle cx={pad + sa * kx} cy={pad - 20} r={13} fill={t.accent} stroke="#fff" strokeWidth={3} />
                <path d={`M${pad + sa * kx - 5} ${pad - 20} h10`} stroke="#fff" strokeWidth={2.5} />
              </g>
              <g data-handle onPointerDown={drag('y')} style={{ cursor: 'ns-resize' }} role="slider" aria-label="Sol kenarı böl" aria-valuenow={sb}>
                <rect x={pad - 36} y={pad - 6} width={36} height={H + 6} fill="transparent" />
                <line x1={pad - 8} x2={pad + W} y1={pad + sb * ky} y2={pad + sb * ky} stroke={t.accent} strokeWidth={sb ? 3 : 0} strokeDasharray="6 4" />
                <circle cx={pad - 20} cy={pad + sb * ky} r={13} fill={t.accent} stroke="#fff" strokeWidth={3} />
                <path d={`M${pad - 20} ${pad + sb * ky - 5} v10`} stroke="#fff" strokeWidth={2.5} />
              </g>
            </>
          )}
        </svg>
      </div>
      {!proportional && <p className={`text-center text-xs font-bold ${t.muted}`}>Dikdörtgen ölçekli çizilmedi; kenar uzunlukları sayılarla yazılı.</p>}
      {!final && (
        <>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {stepper('Üst kenar', sa, A, setSa)}
            {stepper('Sol kenar', sb, B, setSb)}
          </div>
          <p className={`mt-2 text-center text-xs font-bold ${t.muted}`}>Renkli tutamaçları sürükle: kenarları kolay çarpılan parçalara böl.</p>
          <div className="mt-3 text-center">
            <button type="button" onClick={() => setFinal(true)} className="btn-primary min-h-12">
              <Sigma size={18} />{sa || sb ? 'Parçaları topla' : 'Doğrudan hesapla'}
            </button>
          </div>
        </>
      )}
      <Trail lines={lines} className="mt-3" />
      {final && (
        <>
          <FinalAnswer p={p} expr={sumExpr} expected={p.answer} onCorrect={(firstTry) => onDone({ key: sa || sb ? 'dagilma' : p.kind === 'pow' ? 'deger' : 'dogrudan', trail: [...lines, `${sumExpr} = ${fmtN(p.answer)}`], firstTry })} />
          <div className="mt-2 text-center">
            <button type="button" onClick={() => setFinal(false)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${t.chip}`}>Parçalamaya dön</button>
          </div>
        </>
      )}
    </div>
  )
}
