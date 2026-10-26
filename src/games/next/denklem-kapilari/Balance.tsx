import type { ReactNode } from 'react'
import { MathText } from '../../../components/MathText'
import { fmt, isInt, term, zero, type R, type Side } from './algebra'

/**
 * Somut temsil: iki kefeli terazi.
 *  - Mor bloklar: bilinmeyen (x), altın ağırlıklar: pozitif sabitler
 *  - Kırmızı balonlar: negatif terimler (kefeyi yukarı çeker)
 *  - tilt (derece): pozitifse sağ kefe aşağıda
 */

type Item = { kind: 'x' | 'w'; label: string; size: number; neg: boolean }

function itemsOf(sd: Side, xLabel?: string): Item[] {
  const out: Item[] = []
  if (!zero(sd.a)) {
    const neg = sd.a.n < 0
    const abs: R = { n: Math.abs(sd.a.n), d: sd.a.d }
    if (isInt(abs) && abs.n <= 6) for (let i = 0; i < abs.n; i++) out.push({ kind: 'x', label: xLabel ?? 'x', size: 1, neg })
    else out.push({ kind: 'x', label: xLabel ? `${fmt(abs)}·${xLabel}` : term(abs), size: abs.d > 1 && abs.n < abs.d ? 0.6 : 1.3, neg })
  }
  if (!zero(sd.b)) {
    const neg = sd.b.n < 0
    const abs: R = { n: Math.abs(sd.b.n), d: sd.b.d }
    if (isInt(abs)) {
      const h = Math.floor(abs.n / 100), t = Math.floor((abs.n % 100) / 10), o = abs.n % 10
      if (h + t + o <= 12) {
        for (let i = 0; i < h; i++) out.push({ kind: 'w', label: '100', size: 1.35, neg })
        for (let i = 0; i < t; i++) out.push({ kind: 'w', label: '10', size: 1.15, neg })
        for (let i = 0; i < o; i++) out.push({ kind: 'w', label: '1', size: 0.72, neg })
      } else out.push({ kind: 'w', label: String(abs.n), size: 1.4, neg })
    } else out.push({ kind: 'w', label: fmt(abs), size: 1, neg })
  }
  return out
}

function Pan({ cx, items, dark }: { cx: number; items: Item[]; dark: boolean }) {
  const pos = items.filter((i) => !i.neg)
  const neg = items.filter((i) => i.neg)
  const U = 24
  // pozitifleri satırlara diz
  const rows: Item[][] = []
  let row: Item[] = []
  let w = 0
  for (const it of pos) {
    const iw = it.size * U + 3
    if (w + iw > 118 && row.length) {
      rows.push(row)
      row = []
      w = 0
    }
    row.push(it)
    w += iw
  }
  if (row.length) rows.push(row)
  const els: ReactNode[] = []
  let y = 0
  rows.forEach((rw, ri) => {
    const total = rw.reduce((s, it) => s + it.size * U + 3, -3)
    let x = cx - total / 2
    const rh = Math.max(...rw.map((it) => (it.kind === 'x' ? U * 1.1 : it.size * U * 0.8)))
    y -= rh + 2
    rw.forEach((it, i) => {
      const iw = it.size * U
      const ih = it.kind === 'x' ? U * 1.1 : iw * 0.8
      const yy = y + (rh - ih)
      els.push(
        it.kind === 'x' ? (
          <g key={`p${ri}-${i}`}>
            <rect x={x} y={yy} width={iw} height={ih} rx={5} fill="#7c3aed" stroke="#3b0764" strokeWidth={1.5} />
            <rect x={x + 3} y={yy + 3} width={iw - 6} height={4} rx={2} fill="#a78bfa" />
            <foreignObject x={x - 6} y={yy} width={iw + 12} height={ih}>
              <div className="flex h-full items-center justify-center text-[12px] leading-none font-black text-white"><MathText text={it.label} /></div>
            </foreignObject>
          </g>
        ) : (
          <g key={`p${ri}-${i}`}>
            <rect x={x} y={yy} width={iw} height={ih} rx={it.label === '1' ? ih / 2 : 4} fill="#f59e0b" stroke="#78350f" strokeWidth={1.5} />
            <rect x={x + 2} y={yy + 2} width={iw - 4} height={3} rx={1.5} fill="#fde68a" />
            <foreignObject x={x - 6} y={yy} width={iw + 12} height={ih}>
              <div className="flex h-full items-center justify-center text-[11px] leading-none font-black text-amber-950"><MathText text={it.label} /></div>
            </foreignObject>
          </g>
        ),
      )
      x += iw + 3
    })
  })
  // negatifler: kefeye bağlı balonlar
  const nb = neg.length
  neg.forEach((it, i) => {
    const bx = cx + (i - (nb - 1) / 2) * Math.min(26, 110 / Math.max(1, nb))
    const by = y - 34 - (i % 2) * 12
    const rr = it.kind === 'x' ? 15 : it.size > 1 ? 14 : 11
    els.push(
      <g key={`n${i}`}>
        <path d={`M${bx} ${by + rr} Q${bx + 4} ${(by + rr) / 2} ${cx + (i - (nb - 1) / 2) * 8} -2`} stroke={dark ? '#cbd5e1' : '#64748b'} strokeWidth={1} fill="none" />
        <ellipse cx={bx} cy={by} rx={rr} ry={rr * 1.15} fill={it.kind === 'x' ? '#be123c' : '#ef4444'} stroke="#7f1d1d" strokeWidth={1.2} />
        <ellipse cx={bx - rr * 0.35} cy={by - rr * 0.4} rx={rr * 0.25} ry={rr * 0.35} fill="#fff" opacity={0.45} />
        <foreignObject x={bx - 20} y={by - 10} width={40} height={20}>
          <div className="flex h-full items-center justify-center text-[10px] leading-none font-black text-white"><MathText text={`−${it.label}`} /></div>
        </foreignObject>
      </g>,
    )
  })
  return <g>{els}</g>
}

export function Balance({ left, right, tilt, dark, xLabel, totals }: { left: Side; right: Side; tilt: number; dark: boolean; xLabel?: string; totals?: [string, string] }) {
  const a = Math.max(-14, Math.min(14, tilt))
  const rad = (a * Math.PI) / 180
  const arm = 140
  const dyR = Math.sin(rad) * arm
  const t = 'transform 700ms cubic-bezier(.3,1.5,.5,1)'
  const metal = dark ? '#cbd5e1' : '#7c5a2e'
  const metalDark = dark ? '#64748b' : '#4a3418'
  return (
    <svg viewBox="0 0 420 262" className="block h-auto w-full" role="img" aria-label="Terazi">
      <defs>
        <linearGradient id="dkPillar" x1="0" x2="1">
          <stop offset="0" stopColor={dark ? '#475569' : '#b08850'} />
          <stop offset="0.5" stopColor={dark ? '#94a3b8' : '#e3c48d'} />
          <stop offset="1" stopColor={dark ? '#334155' : '#8a6634'} />
        </linearGradient>
      </defs>
      {/* ayak */}
      <path d="M170 252 L250 252 L236 236 L184 236 Z" fill={metalDark} />
      <rect x={203} y={84} width={14} height={154} rx={4} fill="url(#dkPillar)" />
      {/* kiriş */}
      <g style={{ transform: `rotate(${a}deg)`, transformOrigin: '210px 84px', transition: t }}>
        <rect x={62} y={79} width={296} height={10} rx={5} fill={metal} stroke={metalDark} strokeWidth={1.5} />
        <circle cx={70} cy={84} r={5} fill={metalDark} />
        <circle cx={350} cy={84} r={5} fill={metalDark} />
        <path d="M204 70 L216 70 L210 80 Z" fill="#fbbf24" />
      </g>
      <circle cx={210} cy={84} r={9} fill="#fbbf24" stroke={metalDark} strokeWidth={2} />
      {/* kefeler */}
      {[
        { cx: 70, dy: -dyR, sd: left, tot: totals?.[0] },
        { cx: 350, dy: dyR, sd: right, tot: totals?.[1] },
      ].map((p, i) => (
        <g key={i} style={{ transform: `translateY(${p.dy}px)`, transition: t }}>
          <line x1={p.cx} y1={84} x2={p.cx - 52} y2={196} stroke={metal} strokeWidth={1.5} />
          <line x1={p.cx} y1={84} x2={p.cx + 52} y2={196} stroke={metal} strokeWidth={1.5} />
          <path d={`M${p.cx - 64} 196 L${p.cx + 64} 196 Q${p.cx + 54} 214 ${p.cx} 214 Q${p.cx - 54} 214 ${p.cx - 64} 196 Z`} fill={dark ? '#94a3b8' : '#c79a55'} stroke={metalDark} strokeWidth={1.5} />
          <g transform="translate(0 196)">
            <Pan cx={p.cx} items={itemsOf(p.sd, xLabel)} dark={dark} />
          </g>
          {p.tot && (
            <foreignObject x={p.cx - 60} y={216} width={120} height={28}>
              <div className={`flex h-full items-center justify-center text-sm font-black ${dark ? 'text-amber-200' : 'text-amber-900'}`}><MathText text={p.tot} /></div>
            </foreignObject>
          )}
        </g>
      ))}
    </svg>
  )
}
