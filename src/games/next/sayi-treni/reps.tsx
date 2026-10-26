import type { ReactNode } from 'react'
import { numberToWords } from '../../../lib/generators'

/**
 * Sayı Treni temsil kataloğu: aynı sayı farklı biçimlerde (rakam, sözcük, nokta deseni, onluk çerçeve,
 * çetele, onluk-birlik blokları, açılım, basamak tablosu). Hepsi SVG içinde verilen kutuya sığacak şekilde çizilir.
 */

export type Rep =
  | { k: 'num'; n: number }
  | { k: 'word'; n: number }
  | { k: 'dots'; n: number; style: 'five' | 'dice' | 'ten' }
  | { k: 'frame'; n: number }
  | { k: 'tally'; n: number }
  | { k: 'b10'; t: number; o: number }
  | { k: 'exp'; parts: number[] }
  | { k: 'place'; t: number; o: number }

export interface Car {
  id: string
  rep: Rep
  /** vagon rengi (palet sırası) */
  color: number
}

export const repValue = (r: Rep): number => {
  switch (r.k) {
    case 'b10':
    case 'place':
      return r.t * 10 + r.o
    case 'exp':
      return r.parts.reduce((a, b) => a + b, 0)
    default:
      return r.n
  }
}

/** Farklı çözüm anahtarı: aynı temsil türü + aynı ayrıştırma = aynı çözüm */
export const repKey = (r: Rep): string => {
  switch (r.k) {
    case 'dots':
      return `dots-${r.style}`
    case 'b10':
    case 'place':
      return `${r.k}-${r.t}-${r.o}`
    case 'exp':
      return `exp-${r.parts.join('+')}`
    default:
      return r.k
  }
}

/** Rozet etiketi (SolutionList) */
export const repLabel = (r: Rep): string => {
  switch (r.k) {
    case 'num':
      return `Rakamla ${r.n}`
    case 'word':
      return `“${numberToWords(r.n)}”`
    case 'dots':
      return r.style === 'dice' ? 'Zar noktaları' : r.style === 'ten' ? '10 ve noktalar' : '5’li noktalar'
    case 'frame':
      return 'Onluk çerçeve'
    case 'tally':
      return 'Çetele'
    case 'b10':
      return `${r.t} onluk ${r.o} birlik blok`
    case 'exp':
      return r.parts.join(' + ')
    case 'place':
      return `${r.t} onluk ${r.o} birlik`
  }
}

/** Erişilebilir ad */
export const repSpeak = (r: Rep): string => {
  switch (r.k) {
    case 'num':
      return `${r.n} rakamı`
    case 'word':
      return numberToWords(r.n)
    case 'dots':
      return 'nokta deseni'
    case 'frame':
      return 'onluk çerçeve'
    case 'tally':
      return 'çetele'
    case 'b10':
      return `${r.t} onluk ${r.o} birlik blok`
    case 'exp':
      return r.parts.join(' artı ')
    case 'place':
      return `${r.t} onluk ${r.o} birlik`
  }
}

export const INK = '#1f2340'
const RED = '#ef4444'
const RED_D = '#b91c1c'
const BLUE = '#3b82f6'
const BLUE_D = '#1d4ed8'
const ORANGE = '#f97316'
const ORANGE_D = '#c2410c'

/** Zar yüzündeki noktaların birim karedeki yerleri */
const PIPS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]],
}

function Face({ n, x, y, s, fill, fillD, die = true }: { n: number; x: number; y: number; s: number; fill: string; fillD: string; die?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {die && <rect width={s} height={s} rx={s * 0.18} fill="#fff" stroke="#cbd5e1" strokeWidth={1.5} />}
      {PIPS[n].map(([px, py], i) => (
        <circle key={i} cx={px * s} cy={py * s} r={s * 0.105} fill={fill} stroke={fillD} strokeWidth={0.8} />
      ))}
    </g>
  )
}

/** Bir temsili [0,w]×[0,h] kutusunun ortasına çizer */
export function RepG({ rep, w, h }: { rep: Rep; w: number; h: number }) {
  const cx = w / 2
  const cy = h / 2
  switch (rep.k) {
    case 'num': {
      const s = String(rep.n)
      const fs = Math.min(h * 0.86, (w * 1.55) / s.length)
      return (
        <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight={900} fill={INK} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {s}
        </text>
      )
    }
    case 'word': {
      const words = numberToWords(rep.n).split(' ')
      const lines = words.length > 1 && words.join(' ').length > 7 ? words : [words.join(' ')]
      const longest = Math.max(...lines.map((l) => l.length))
      const fs = Math.min(lines.length > 1 ? h * 0.36 : h * 0.44, (w * 1.75) / longest)
      const top = cy - ((lines.length - 1) * fs * 1.05) / 2
      return (
        <g>
          {lines.map((l, i) => (
            <text key={i} x={cx} y={top + i * fs * 1.05 + fs * 0.34} textAnchor="middle" fontSize={fs} fontWeight={800} fill="#7c2d12" fontStyle="italic">
              {l}
            </text>
          ))}
        </g>
      )
    }
    case 'exp': {
      const s = rep.parts.join(' + ')
      const fs = Math.min(h * 0.5, (w * 1.75) / s.length)
      return (
        <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#0f766e">
          {s}
        </text>
      )
    }
    case 'place': {
      const fs = Math.min(h * 0.34, w / 4.4)
      return (
        <g fontWeight={900} textAnchor="middle">
          <rect x={cx - w * 0.46} y={cy - fs * 1.2} width={w * 0.44} height={fs * 2.4} rx={6} fill="#dbeafe" />
          <rect x={cx + w * 0.02} y={cy - fs * 1.2} width={w * 0.44} height={fs * 2.4} rx={6} fill="#ffedd5" />
          <text x={cx - w * 0.24} y={cy - fs * 0.05} fontSize={fs * 1.05} fill={BLUE_D}>{rep.t}</text>
          <text x={cx - w * 0.24} y={cy + fs * 0.95} fontSize={fs * 0.62} fill={BLUE_D}>onluk</text>
          <text x={cx + w * 0.24} y={cy - fs * 0.05} fontSize={fs * 1.05} fill={ORANGE_D}>{rep.o}</text>
          <text x={cx + w * 0.24} y={cy + fs * 0.95} fontSize={fs * 0.62} fill={ORANGE_D}>birlik</text>
        </g>
      )
    }
    case 'frame': {
      const two = rep.n > 10
      const c = two ? Math.min(w / 5.4, h / 4.5) : Math.min(w / 5.4, h / 2.5)
      const fw = c * 5
      const fh = c * 2
      const gap = c * 0.32
      const totalH = two ? fh * 2 + gap : fh
      const x0 = cx - fw / 2
      const y0 = cy - totalH / 2
      return (
        <g>
          {Array.from({ length: two ? 2 : 1 }, (_, f) => {
            const fy = y0 + f * (fh + gap)
            return (
              <g key={f}>
                <rect x={x0} y={fy} width={fw} height={fh} rx={3} fill="#fff" stroke={INK} strokeWidth={2} />
                {[1, 2, 3, 4].map((i) => <line key={i} x1={x0 + i * c} y1={fy} x2={x0 + i * c} y2={fy + fh} stroke="#475569" strokeWidth={1} />)}
                <line x1={x0} y1={fy + c} x2={x0 + fw} y2={fy + c} stroke="#475569" strokeWidth={1} />
                {Array.from({ length: 10 }, (_, i) => {
                  const idx = f * 10 + i
                  if (idx >= rep.n) return null
                  return <circle key={i} cx={x0 + (i % 5) * c + c / 2} cy={fy + Math.floor(i / 5) * c + c / 2} r={c * 0.36} fill={RED} stroke={RED_D} strokeWidth={1} />
                })}
              </g>
            )
          })}
        </g>
      )
    }
    case 'dots': {
      const n = rep.n
      if (rep.style === 'dice') {
        const a = Math.min(6, Math.ceil(n / 2))
        const b = n - a
        const s = Math.min(h * 0.86, w * 0.44)
        if (b === 0) return <Face n={a} x={cx - s / 2} y={cy - s / 2} s={s} fill={RED} fillD={RED_D} />
        return (
          <g>
            <Face n={a} x={cx - s - 3} y={cy - s / 2} s={s} fill={RED} fillD={RED_D} />
            <Face n={b} x={cx + 3} y={cy - s / 2} s={s} fill={RED} fillD={RED_D} />
          </g>
        )
      }
      if (rep.style === 'ten') {
        // 10’luk iki sıra blok + kalan zar yüzü
        const rest = n - 10
        const c = Math.min(w / 8.6, h / 2.6)
        const bw = c * 5
        const s = c * 2.2
        const total = bw + (rest > 0 ? c * 0.6 + s : 0)
        const x0 = cx - total / 2
        return (
          <g>
            <rect x={x0 - 2} y={cy - c - 2} width={bw + 4} height={c * 2 + 4} rx={c * 0.4} fill="#eff6ff" stroke="#93c5fd" strokeWidth={1.2} />
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={x0 + (i % 5) * c + c / 2} cy={cy - c + Math.floor(i / 5) * c + c / 2} r={c * 0.36} fill={BLUE} stroke={BLUE_D} strokeWidth={0.8} />
            ))}
            {rest > 0 && <Face n={Math.min(6, rest)} x={x0 + bw + c * 0.6} y={cy - s / 2} s={s} fill={ORANGE} fillD={ORANGE_D} die={false} />}
          </g>
        )
      }
      // five: 5’lik zar deseni + kalan
      const s = Math.min(h * 0.9, w * 0.44)
      if (n <= 5) return <Face n={n} x={cx - s / 2} y={cy - s / 2} s={s} fill={BLUE} fillD={BLUE_D} die={false} />
      return (
        <g>
          <rect x={cx - s - 4} y={cy - s / 2} width={s} height={s} rx={s * 0.2} fill="#eff6ff" />
          <Face n={5} x={cx - s - 4} y={cy - s / 2} s={s} fill={BLUE} fillD={BLUE_D} die={false} />
          <rect x={cx + 4} y={cy - s / 2} width={s} height={s} rx={s * 0.2} fill="#fff7ed" />
          <Face n={Math.min(6, n - 5)} x={cx + 4} y={cy - s / 2} s={s} fill={ORANGE} fillD={ORANGE_D} die={false} />
        </g>
      )
    }
    case 'tally': {
      const groups = Math.ceil(rep.n / 5)
      const gw = 30
      const gap = 9
      const natW = groups * gw + (groups - 1) * gap
      const natH = 44
      const k = Math.min(1, (w * 0.94) / natW, (h * 0.86) / natH)
      return (
        <g transform={`translate(${cx - (natW * k) / 2} ${cy - (natH * k) / 2}) scale(${k})`} stroke="#7c2d12" strokeWidth={3.4} strokeLinecap="round">
          {Array.from({ length: groups }, (_, g) => {
            const cnt = Math.min(5, rep.n - g * 5)
            const gx = g * (gw + gap)
            return (
              <g key={g}>
                {Array.from({ length: Math.min(4, cnt) }, (_, i) => <line key={i} x1={gx + 3 + i * 8} y1={4} x2={gx + 3 + i * 8} y2={natH - 4} />)}
                {cnt === 5 && <line x1={gx - 2} y1={natH - 10} x2={gx + gw + 1} y2={10} stroke="#dc2626" />}
              </g>
            )
          })}
        </g>
      )
    }
    case 'b10': {
      return <B10G t={rep.t} o={rep.o} w={w} h={h} />
    }
  }
}

/** Onluk çubukları ve birlik küpleri (5’li gruplar) */
export function B10G({ t, o, w, h }: { t: number; o: number; w: number; h: number }) {
  const seg = 6.4
  const rodH = seg * 10
  const rodW = seg + 1
  const rodGap = 3
  const cs = seg
  const cg = 1.3
  const cubeCols = Math.ceil(o / 5)
  const rodsW = t ? t * rodW + (t - 1) * rodGap : 0
  const cubesW = o ? cubeCols * (cs + cg) + Math.floor((cubeCols - 1) / 2) * 3 : 0
  const natW = rodsW + (t && o ? 8 : 0) + cubesW
  const natH = rodH
  const k = Math.min(1.25, (w * 0.95) / Math.max(1, natW), (h * 0.94) / natH)
  return (
    <g transform={`translate(${w / 2 - (natW * k) / 2} ${h / 2 - (natH * k) / 2}) scale(${k})`}>
      {Array.from({ length: t }, (_, i) => (
        <g key={i} transform={`translate(${i * (rodW + rodGap)} 0)`}>
          <rect width={rodW} height={rodH} rx={1.5} fill={BLUE} stroke={BLUE_D} strokeWidth={1} />
          {Array.from({ length: 9 }, (_, j) => <line key={j} x1={0} x2={rodW} y1={(j + 1) * seg} y2={(j + 1) * seg} stroke={BLUE_D} strokeWidth={0.6} />)}
        </g>
      ))}
      {Array.from({ length: o }, (_, i) => {
        const col = Math.floor(i / 5)
        const row = i % 5
        const x = rodsW + (t ? 8 : 0) + col * (cs + cg) + Math.floor(col / 2) * 3
        const y = rodH - (row + 1) * (cs + cg)
        return <rect key={i} x={x} y={y} width={cs} height={cs} rx={1.2} fill="#60a5fa" stroke={BLUE_D} strokeWidth={0.8} />
      })}
    </g>
  )
}

/* ───────────────────────────── vagon ve lokomotif ───────────────────────────── */

export const WAG_W = 140
export const WAG_H = 122
export const LOCO_W = 206
export const BASE = 120 // tekerlek altı

export const PALETTE = [
  { body: '#14b8a6', dark: '#0f766e', light: '#5eead4' },
  { body: '#8b5cf6', dark: '#6d28d9', light: '#c4b5fd' },
  { body: '#f59e0b', dark: '#b45309', light: '#fcd34d' },
  { body: '#0ea5e9', dark: '#0369a1', light: '#7dd3fc' },
  { body: '#ec4899', dark: '#be185d', light: '#f9a8d4' },
  { body: '#22c55e', dark: '#15803d', light: '#86efac' },
]

export function Wheel({ cx, cy, r, spin }: { cx: number; cy: number; r: number; spin?: boolean }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="#1f2937" />
      <circle r={r * 0.72} fill="#94a3b8" />
      <g className={spin ? 'tren-spin' : ''}>
        {[0, 60, 120].map((a) => <rect key={a} x={-r * 0.66} y={-1.4} width={r * 1.32} height={2.8} rx={1.4} fill="#475569" transform={`rotate(${a})`} />)}
      </g>
      <circle r={r * 0.24} fill="#334155" />
    </g>
  )
}

/** Vagon gövdesi (sol üst köşe 0,0; tekerlek altı BASE) */
export function WagonBody({ color, children, spin, ghost }: { color: number; children?: ReactNode; spin?: boolean; ghost?: boolean }) {
  const p = PALETTE[color % PALETTE.length]
  if (ghost) {
    return (
      <g>
        <rect x={4} y={8} width={WAG_W - 8} height={88} rx={12} fill="rgba(255,255,255,.55)" stroke="#64748b" strokeWidth={3} strokeDasharray="10 7" className="tren-slot" />
        <Wheel cx={34} cy={106} r={14} />
        <Wheel cx={WAG_W - 34} cy={106} r={14} />
        {children}
      </g>
    )
  }
  return (
    <g>
      <rect x={10} y={94} width={WAG_W - 20} height={9} rx={3} fill="#334155" />
      <rect x={2} y={4} width={WAG_W - 4} height={12} rx={6} fill={p.dark} />
      <rect x={5} y={10} width={WAG_W - 10} height={86} rx={10} fill={p.body} />
      <rect x={5} y={82} width={WAG_W - 10} height={14} rx={6} fill={p.dark} opacity={0.55} />
      <rect x={9} y={12} width={WAG_W - 18} height={3} rx={1.5} fill={p.light} opacity={0.7} />
      <rect x={10} y={17} width={WAG_W - 20} height={68} rx={8} fill="#fff" stroke={p.dark} strokeWidth={2.5} />
      <Wheel cx={34} cy={106} r={14} spin={spin} />
      <Wheel cx={WAG_W - 34} cy={106} r={14} spin={spin} />
      {children}
    </g>
  )
}

/** Vagonun beyaz panelinin içine temsil */
export function WagonRep({ rep }: { rep: Rep }) {
  return (
    <g transform="translate(12 19)">
      <RepG rep={rep} w={WAG_W - 24} h={64} />
    </g>
  )
}

/** Depo kartlarında ve sürükleme hayaletinde kullanılan bağımsız vagon çizimi */
export function WagonSvg({ car, className = '' }: { car: Car; className?: string }) {
  return (
    <svg viewBox={`-2 0 ${WAG_W + 4} ${WAG_H}`} className={`block h-auto w-full ${className}`} aria-hidden>
      <WagonBody color={car.color}>
        <WagonRep rep={car.rep} />
      </WagonBody>
    </svg>
  )
}

/** Sevimli lokomotif: önü solda, yüz önde */
export function Loco({ plate, spin, happy, blink }: { plate: string; spin?: boolean; happy?: boolean; blink?: boolean }) {
  const pfs = plate.length > 5 ? 17 : plate.length > 3 ? 22 : plate.length > 2 ? 28 : 34
  return (
    <g>
      {/* buhar */}
      <g className={spin ? 'tren-steam-fast' : 'tren-steam'}>
        <circle cx={72} cy={-6} r={11} fill="#fff" opacity={0.9} />
        <circle cx={86} cy={-22} r={14} fill="#fff" opacity={0.75} />
        <circle cx={104} cy={-38} r={17} fill="#fff" opacity={0.55} />
      </g>
      {/* şasi */}
      <rect x={18} y={92} width={LOCO_W - 22} height={11} rx={4} fill="#334155" />
      <path d="M2 116 L26 88 L30 116 Z" fill="#facc15" stroke="#a16207" strokeWidth={2} strokeLinejoin="round" />
      {/* kazan */}
      <rect x={30} y={40} width={112} height={56} rx={24} fill="#ef4444" />
      <rect x={30} y={40} width={112} height={12} rx={6} fill="#fca5a5" opacity={0.5} />
      {[78, 110].map((x) => <rect key={x} x={x} y={40} width={7} height={56} fill="#facc15" />)}
      {/* baca ve dom */}
      <path d="M62 42 L64 14 L58 6 L88 6 L82 14 L84 42 Z" fill="#1f2937" />
      <rect x={56} y={2} width={34} height={8} rx={3} fill="#374151" />
      <path d="M100 42 C 100 26, 124 26, 124 42 Z" fill="#facc15" stroke="#a16207" strokeWidth={1.5} />
      {/* kabin */}
      <rect x={136} y={8} width={68} height={90} rx={8} fill="#2563eb" />
      <rect x={130} y={0} width={80} height={13} rx={5} fill="#1e3a8a" />
      <rect x={146} y={18} width={48} height={24} rx={6} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2} />
      {/* plaka */}
      <rect x={142} y={48} width={56} height={40} rx={7} fill="#fef3c7" stroke="#b45309" strokeWidth={2.5} />
      <text x={170} y={68 + pfs * 0.36} textAnchor="middle" fontSize={pfs} fontWeight={900} fill={INK}>{plate}</text>
      {/* tekerlekler */}
      <Wheel cx={46} cy={108} r={11} spin={spin} />
      <Wheel cx={100} cy={100} r={19} spin={spin} />
      <Wheel cx={160} cy={100} r={19} spin={spin} />
      <rect x={96} y={98} width={68} height={5} rx={2.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
      {/* yüz */}
      <g>
        <circle cx={34} cy={66} r={36} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={3} />
        <circle cx={34} cy={66} r={30} fill="#f8fafc" />
        <g className={blink ? 'tren-blink' : ''}>
          <ellipse cx={22} cy={58} rx={6.5} ry={8} fill="#fff" stroke={INK} strokeWidth={1.5} />
          <ellipse cx={46} cy={58} rx={6.5} ry={8} fill="#fff" stroke={INK} strokeWidth={1.5} />
          <circle cx={21} cy={59} r={3.8} fill={INK} />
          <circle cx={45} cy={59} r={3.8} fill={INK} />
          <circle cx={22.4} cy={57.4} r={1.3} fill="#fff" />
          <circle cx={46.4} cy={57.4} r={1.3} fill="#fff" />
        </g>
        <path d="M16 48 Q 22 44 28 47" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M40 47 Q 46 44 52 48" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cx={15} cy={74} r={5} fill="#fda4af" opacity={0.75} />
        <circle cx={53} cy={74} r={5} fill="#fda4af" opacity={0.75} />
        {happy ? (
          <path d="M22 74 Q 34 90 46 74 Z" fill="#be123c" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        ) : (
          <path d="M23 76 Q 34 85 45 76" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        )}
      </g>
    </g>
  )
}
