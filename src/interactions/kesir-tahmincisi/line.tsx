import { useEffect, useRef } from 'react'
import { useGesture } from '@use-gesture/react'
import { usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { dec, fr } from '../kesir-duvari/ortak'

/** Doğrunun matematik çizgisinin piksel konumu (Plane mode="x" ile aynı) */
const baseY = (P: ReturnType<typeof usePlane>) => P.sy(0)

/**
 * Seçilen eş parça sayısına ve yakınlaştırmaya göre etkin bölme:
 * 10 seçilirse yakınlaştırdıkça her onda bir ona bölünür (yüzde birler, binde birler).
 */
export function effectiveD(den: number, unitPx: number) {
  if (!den) return 0
  if (den === 10) {
    let D = 10
    while (D < 1000 && unitPx / (D * 10) >= 9) D *= 10
    return D
  }
  return den
}

/** Etkin bölmeyi üst bileşene bildirir */
export function DReporter({ den, onD }: { den: number; onD: (D: number) => void }) {
  const P = usePlane()
  const D = effectiveD(den, P.unitPx)
  useEffect(() => onD(D), [D, onD])
  return null
}

/** 0’dan max’a doğru: kalın çizgi, tam sayı çentikleri ve (bölündüyse) eş parça çentikleri */
export function Line({ max, D, grade, tenthLabels }: { max: number; D: number; grade: number; tenthLabels: boolean }) {
  const P = usePlane()
  const y0 = baseY(P)
  const { xMin, xMax } = P.view
  const out = []
  // eş parça çentikleri
  if (D && P.unitPx / D >= 5) {
    const a = Math.max(0, Math.ceil(xMin * D)), b = Math.min(max * D, Math.floor(xMax * D))
    for (let k = a; k <= b; k++) {
      if (k % D === 0) continue
      const x = k / D
      const tenth = D >= 100 && k % (D / 10) === 0
      const hund = D === 1000 && k % 10 === 0
      const h = tenth ? 15 : hund ? 11 : D >= 100 ? 7 : 13
      out.push(<line key={`t${k}`} x1={P.sx(x)} x2={P.sx(x)} y1={y0 - h} y2={y0 + h} stroke={tenth ? '#0f766e' : '#14b8a6'} strokeWidth={tenth ? 2.2 : hund ? 1.6 : D >= 100 ? 1 : 2.2} />)
      // ondalık bölmede onda birleri (çok yakında yüzde birleri) yaz
      if (tenthLabels && grade >= 5 && ((tenth && P.unitPx / 10 >= 34) || (hund && P.unitPx / 100 >= 40))) {
        out.push(<text key={`l${k}`} x={P.sx(x)} y={y0 - 22} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0f766e">{dec(x)}</text>)
      } else if (tenthLabels && grade < 5 && tenth && P.unitPx / 10 >= 40) {
        out.push(
          <foreignObject key={`l${k}`} x={P.sx(x) - 18} y={y0 - 56} width={36} height={36}>
            <div className="flex h-full items-center justify-center text-[12px] font-black text-teal-800"><MathText text={fr(Math.round(x * 10) % 10 || 10, 10)} /></div>
          </foreignObject>,
        )
      }
    }
  }
  const ints = []
  for (let w = Math.max(0, Math.ceil(xMin)); w <= Math.min(max, Math.floor(xMax)); w++) {
    ints.push(
      <g key={`i${w}`}>
        <line x1={P.sx(w)} x2={P.sx(w)} y1={y0 - 20} y2={y0 + 20} stroke="#1f2340" strokeWidth={3} strokeLinecap="round" />
        <text x={P.sx(w)} y={y0 - 26} textAnchor="middle" fontSize={20} fontWeight={900} fill="#1f2340">{w}</text>
      </g>,
    )
  }
  return (
    <g>
      <line x1={P.sx(-1)} x2={P.sx(max + 1)} y1={y0} y2={y0} stroke="#cbd5e1" strokeWidth={3} strokeDasharray="6 7" />
      <line x1={P.sx(0)} x2={P.sx(max)} y1={y0} y2={y0} stroke="#1f2340" strokeWidth={4} strokeLinecap="round" />
      {out}
      {ints}
    </g>
  )
}

/** İpucu: referans noktaları ½, 1½ … (kesikli) */
export function Benchmarks({ max, skip }: { max: number; skip?: number }) {
  const P = usePlane()
  const y0 = baseY(P)
  const xs: number[] = []
  for (let w = 0; w < max; w++) if (skip === undefined || Math.abs(w + 0.5 - skip) > 0.08) xs.push(w + 0.5)
  return (
    <g pointerEvents="none">
      {xs.map((x) => (
        <g key={x}>
          <line x1={P.sx(x)} x2={P.sx(x)} y1={y0 - 18} y2={y0 + 8} stroke="#f59e0b" strokeWidth={3} strokeDasharray="4 3" />
          <text x={P.sx(x)} y={y0 - 24} textAnchor="middle" fontSize={16} fontWeight={900} fill="#b45309">{x < 1 ? '½' : `${Math.floor(x)}½`}</text>
        </g>
      ))}
    </g>
  )
}

/** Açık görevde aralık bandı */
export function Band({ lo, hi, loText, hiText, labels = true }: { lo: number; hi: number; loText: string; hiText: string; labels?: boolean }) {
  const P = usePlane()
  const y0 = baseY(P)
  return (
    <g pointerEvents="none">
      <rect x={P.sx(lo)} y={y0 - 12} width={Math.max(0, P.sx(hi) - P.sx(lo))} height={24} rx={6} fill="#fde68a" opacity={0.7} />
      {[{ x: lo, t: loText }, { x: hi, t: hiText }].filter((e) => labels && !Number.isInteger(e.x)).map((e) => (
        <foreignObject key={e.x} x={P.sx(e.x) - 24} y={y0 - 70} width={48} height={42}>
          <div className="flex h-full items-center justify-center text-[15px] font-black text-amber-800"><MathText text={e.t} /></div>
        </foreignObject>
      ))}
    </g>
  )
}

/** Bulunan noktalar (açık görev) */
export function Found({ xs }: { xs: number[] }) {
  const P = usePlane()
  const y0 = baseY(P)
  return (
    <g pointerEvents="none">
      {xs.map((x) => <circle key={x} cx={P.sx(x)} cy={y0} r={7} fill="#16a34a" stroke="#fff" strokeWidth={2.5} />)}
    </g>
  )
}

/** Hedef halkaları: gerçek noktanın çevresinde 0,05 – 0,12 – 0,25 birimlik bantlar */
export const RINGS = [0.05, 0.12, 0.25]
export function Target({ x, text }: { x: number; text: string }) {
  const P = usePlane()
  const y0 = baseY(P)
  const cols = ['#fde047', '#fdba74', '#fecaca']
  return (
    <g pointerEvents="none" className="animate-pop">
      {[...RINGS].reverse().map((r, i) => (
        <ellipse key={r} cx={P.sx(x)} cy={y0} rx={Math.max(10, r * P.unitPx)} ry={26 - i * 6} fill={cols[2 - i]} opacity={0.55} stroke="#fff" strokeWidth={1.5} />
      ))}
      <line x1={P.sx(x)} x2={P.sx(x)} y1={y0 - 24} y2={y0 + 6} stroke="#15803d" strokeWidth={4} strokeLinecap="round" />
      <circle cx={P.sx(x)} cy={y0} r={6} fill="#15803d" stroke="#fff" strokeWidth={2} />
      <foreignObject x={P.sx(x) - 34} y={y0 - 76} width={68} height={48}>
        <div className="flex h-full items-center justify-center">
          <span className="rounded-lg bg-green-700 px-1.5 text-[16px] font-black text-white shadow"><MathText text={text} /></span>
        </div>
      </foreignObject>
    </g>
  )
}

/** Dart: ucu doğruya değen, alttan sürüklenen işaretçi. onMove verilmezse hayalet (tahmin izi). */
export function Dart({ x, color, onMove, tag }: { x: number; color: string; onMove?: (x: number) => void; tag?: string }) {
  const P = usePlane()
  const ref = useRef<SVGGElement>(null)
  useGesture(
    {
      onDrag: ({ xy: [cx, cy], event }) => {
        event.stopPropagation()
        if (onMove) onMove(P.fromClient(cx, cy).x)
      },
    },
    { target: ref, eventOptions: { passive: false }, enabled: !!onMove },
  )
  const px = P.sx(x)
  const y0 = baseY(P)
  const live = !!onMove
  return (
    <g ref={ref} {...(live ? { 'data-handle': true } : {})} style={{ touchAction: 'none', cursor: live ? 'grab' : 'default' }} pointerEvents={live ? undefined : 'none'} opacity={live ? 1 : 0.55} data-testid={live ? 'dart' : undefined}>
      {live && <rect x={px - 28} y={y0 - 6} width={56} height={P.height - y0 + 6} fill="transparent" />}
      <line x1={px} x2={px} y1={y0 + 10} y2={y0 + 46} stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeDasharray={live ? undefined : '5 4'} />
      <path d={`M${px} ${y0 + 1} l-8 14 h16 z`} fill={color} />
      <path d={`M${px} ${y0 + 40} l-11 16 h7 l4 -6 l4 6 h7 z`} fill={color} opacity={0.9} />
      {tag && (
        <text x={px + 13} y={y0 + 36} fontSize={12} fontWeight={900} fill={color}>{tag}</text>
      )}
    </g>
  )
}
