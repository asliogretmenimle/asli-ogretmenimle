import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn } from 'lucide-react'
import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { clamp } from '../../interactive/axis'
import { decStr, nm, unitName, type G } from './model'

/**
 * Yakınlaştırılabilir 0–1 sayı doğrusu (değerler binde bir cinsinden tamsayı).
 * Görünür en küçük çentik: 0,1 → 0,01 → 0,001 (6. sınıf). Nokta o çentiğe yapışır.
 * 4. sınıfta etiketler ondalık kesir ([[6/10]], [[45/100]]).
 * Dokun-dokun alternatifleri: doğruya dokun, ◀ ▶ ile bir çentik kaydır, "Mercek" düğmeleriyle aralığa yakınlaş.
 */

const LEVELS = [100, 10, 1] // binde bir cinsinden çentik aralıkları

function Content({ x, setX, g, maxDec, showValue, color, onFinest }: { x: number; setX: (n: number) => void; g: G; maxDec: 2 | 3; showValue: boolean; color: string; onFinest: (u: number) => void }) {
  const P = usePlane()
  const y0 = P.sy(0)
  const px = (u: number) => (P.unitPx * u) / 1000
  const levels = LEVELS.filter((u) => (maxDec === 3 || u >= 10) && px(u) >= 7)
  const finest = levels[levels.length - 1] ?? 100
  useEffect(() => onFinest(finest), [finest, onFinest])

  const lo = Math.max(0, Math.ceil(P.view.xMin * 1000)), hi = Math.min(1000, Math.floor(P.view.xMax * 1000))
  const ticks: ReactElement[] = []
  const labels: ReactElement[] = []
  const labelMin: Record<number, number> = { 100: 26, 10: 42, 1: 48 }
  levels.forEach((u, li) => {
    const start = Math.ceil(lo / u) * u
    const h = u === 100 ? 13 : u === 10 ? 9 : 6
    const showLbl = px(u) >= labelMin[u]
    for (let n = start; n <= hi; n += u) {
      if (li > 0 && n % LEVELS[LEVELS.indexOf(u) - 1] === 0) continue
      const X = P.sx(n / 1000)
      const end = n === 0 || n === 1000
      ticks.push(<line key={`t${u}-${n}`} x1={X} x2={X} y1={y0 - (end ? 20 : h)} y2={y0 + (end ? 20 : h)} stroke={u === 100 || end ? '#0f172a' : u === 10 ? '#475569' : '#94a3b8'} strokeWidth={end ? 3.5 : u === 100 ? 2.4 : u === 10 ? 1.6 : 1.1} />)
      if (showLbl && !end) {
        const w = Math.min(px(u) - 2, 46)
        const fs = u === 100 ? 14 : 12
        labels.push(
          g === 4 ? (
            <foreignObject key={`l${n}`} x={X - w / 2} y={y0 + 14} width={w} height={44}>
              <div className={`flex h-full items-center justify-center font-black ${u === 100 ? 'text-slate-900' : 'text-slate-500'}`} style={{ fontSize: fs }}><MathText text={nm(n, 4)} /></div>
            </foreignObject>
          ) : (
            <text key={`l${n}`} x={X} y={y0 + 34} textAnchor="middle" fontSize={fs} fontWeight={800} fill={u === 100 ? '#0f172a' : '#64748b'}>{decStr(n)}</text>
          ),
        )
      }
    }
  })
  const x0 = P.sx(Math.max(P.view.xMin, -1)), x1 = P.sx(Math.min(P.view.xMax, 2))
  return (
    <g>
      <line x1={x0} x2={x1} y1={y0} y2={y0} stroke="#cbd5e1" strokeWidth={3} strokeDasharray="6 6" />
      <line x1={P.sx(Math.max(0, P.view.xMin))} x2={P.sx(Math.min(1, P.view.xMax))} y1={y0} y2={y0} stroke="#0f172a" strokeWidth={3.5} />
      {ticks}
      {labels}
      {[0, 1].map((v) => P.view.xMin <= v && v <= P.view.xMax && (
        <text key={`e${v}`} x={P.sx(v)} y={y0 + 42} textAnchor="middle" fontSize={20} fontWeight={900} fill="#0f172a">{v}</text>
      ))}
      {showValue && (
        <foreignObject x={P.sx(x / 1000) - 50} y={y0 - 68} width={100} height={40}>
          <div className="flex h-full items-center justify-center">
            <span className="rounded-lg px-2 py-0.5 text-[15px] font-black text-white shadow" style={{ background: color }}><MathText text={nm(x, g)} /></span>
          </div>
        </foreignObject>
      )}
      <DragPoint x={x / 1000} y={0} r={13} color={color} onChange={(p) => setX(clamp(Math.round((p.x * 1000) / finest) * finest, 0, 1000))} />
    </g>
  )
}

export function ZoomLine({ x, setX, g, maxDec, showValue = false, color = '#d6457a' }: { x: number; setX: (n: number) => void; g: G; maxDec: 2 | 3; showValue?: boolean; color?: string }) {
  const [finest, setFinest] = useState(100)
  const finRef = useRef(100)
  finRef.current = finest
  const [focus, setFocus] = useState<{ a: number; b: number; k: number }>({ a: -0.06, b: 1.06, k: 0 })
  const lens = (u: number) => {
    const base = Math.min(Math.floor(x / u) * u, 1000 - u)
    const pad = u * 0.08
    setFocus((f) => ({ a: (base - pad) / 1000, b: (base + u + pad) / 1000, k: f.k + 1 }))
  }
  const step = (d: number) => setX(clamp(Math.round(x / finest) * finest + d * finest, 0, 1000))
  return (
    <div className="flex flex-col gap-2" data-testid="zoomline">
      <Plane
        key={focus.k}
        mode="x"
        initial={{ xMin: focus.a, xMax: focus.b, yMin: -1, yMax: 1 }}
        axes={false}
        grid={false}
        labels={false}
        minSpan={maxDec === 3 ? 0.006 : 0.04}
        maxSpan={2.4}
        onTap={(p) => setX(clamp(Math.round((p.x * 1000) / finRef.current) * finRef.current, 0, 1000))}
        label="Yakınlaştırılabilir sayı doğrusu"
      >
        <Content x={x} setX={setX} g={g} maxDec={maxDec} showValue={showValue} color={color} onFinest={setFinest} />
      </Plane>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" onClick={() => step(-1)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Bir çentik sola" data-testid="step-left"><ChevronLeft size={22} /></button>
        <span className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">En küçük çentik: {unitName(finest === 100 ? 1 : finest === 10 ? 2 : 3)}</span>
        <button type="button" onClick={() => step(1)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Bir çentik sağa" data-testid="step-right"><ChevronRight size={22} /></button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" onClick={() => lens(100)} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-black ring-1 ring-line active:scale-95" data-testid="lens-tenth"><ZoomIn size={18} />Noktanın onda birini büyüt</button>
        {maxDec === 3 && <button type="button" onClick={() => lens(10)} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-black ring-1 ring-line active:scale-95" data-testid="lens-hundredth"><ZoomIn size={18} />Yüzde birini büyüt</button>}
        <button type="button" onClick={() => setFocus((f) => ({ a: -0.06, b: 1.06, k: f.k + 1 }))} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-black ring-1 ring-line active:scale-95"><Maximize2 size={16} />0–1 tümü</button>
      </div>
    </div>
  )
}
