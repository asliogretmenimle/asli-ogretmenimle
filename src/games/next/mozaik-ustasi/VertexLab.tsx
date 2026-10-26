/**
 * Köşe Laboratuvarı: düzgün çokgenleri bir noktanın çevresine yan yana dizer.
 * Açılar 360°’yi tam doldurursa çokgen(ler) o köşede boşluksuz buluşur.
 */

export const interior = (n: number) => (180 * (n - 2)) / n

export const POLY_INFO: Record<number, { name: string; fill: string; dark: string }> = {
  3: { name: 'üçgen', fill: '#18b374', dark: '#08643e' },
  4: { name: 'kare', fill: '#f08a24', dark: '#9c4a06' },
  5: { name: 'beşgen', fill: '#e2477a', dark: '#8f1946' },
  6: { name: 'altıgen', fill: '#efb20c', dark: '#9a6a00' },
  8: { name: 'sekizgen', fill: '#8b55e0', dark: '#552090' },
  12: { name: 'onikigen', fill: '#119fb4', dark: '#05666f' },
}

const L0 = 1.25

function polyAt(n: number, start: number, L = L0) {
  const pts: [number, number][] = []
  let x = 0, y = 0, dir = start
  for (let k = 0; k < n; k++) {
    pts.push([x, y])
    x += L * Math.cos((dir * Math.PI) / 180)
    y -= L * Math.sin((dir * Math.PI) / 180)
    dir += 360 / n
  }
  return pts
}

export function PolyIcon({ n, size = 40 }: { n: number; size?: number }) {
  const p = polyAt(n, 0)
  const cx = p.reduce((s, q) => s + q[0], 0) / n, cy = p.reduce((s, q) => s + q[1], 0) / n
  const r = Math.max(...p.map((q) => Math.hypot(q[0] - cx, q[1] - cy))) + 0.1
  return (
    <svg width={size} height={size} viewBox={`${cx - r} ${cy - r} ${2 * r} ${2 * r}`} aria-hidden>
      <polygon points={p.map((q) => q.join(',')).join(' ')} fill={POLY_INFO[n].fill} stroke={POLY_INFO[n].dark} strokeWidth={0.06} strokeLinejoin="round" />
    </svg>
  )
}

export function VertexLab({ ring, degrees }: { ring: number[]; degrees: boolean }) {
  const sum = ring.reduce((s, n) => s + interior(n), 0)
  // En büyük çokgen tahtaya sığsın
  const L = Math.min(L0, 2.85 * Math.sin(Math.PI / Math.max(3, ...ring)))
  let a = 0
  const shapes = ring.map((n, i) => {
    const start = a
    a += interior(n)
    return { n, start, over: a > 360 + 1e-6, i }
  })
  const full = Math.abs(sum - 360) < 1e-6
  const arc = (r: number, a0: number, a1: number) => {
    const p0 = [r * Math.cos((a0 * Math.PI) / 180), -r * Math.sin((a0 * Math.PI) / 180)]
    const p1 = [r * Math.cos((a1 * Math.PI) / 180), -r * Math.sin((a1 * Math.PI) / 180)]
    return `M0 0L${p0[0]} ${p0[1]}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${p1[0]} ${p1[1]}Z`
  }
  const lab = (r: number, mid: number) => [r * Math.cos((mid * Math.PI) / 180), -r * Math.sin((mid * Math.PI) / 180)]
  return (
    <svg viewBox="-3.1 -3.1 6.2 6.2" className="mx-auto block w-full max-w-[520px]" role="img" aria-label={`Köşede ${ring.length} çokgen, toplam ${Math.round(sum)} derece`}>
      <defs>
        <filter id="vl-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.02" dy="0.05" stdDeviation="0.04" floodColor="#3b2a1a" floodOpacity="0.3" />
        </filter>
        <style>{`.mz-pop{animation:mzPop .45s cubic-bezier(.34,1.56,.64,1) both}@keyframes mzPop{from{opacity:0}}.mz-glow{animation:mzGlow 1.6s ease-in-out infinite}@keyframes mzGlow{50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.mz-pop,.mz-glow{animation:none}}`}</style>
      </defs>
      <circle r={3} fill="#f6eddc" />
      <circle r={3} fill="none" stroke="#e2d2b4" strokeWidth={0.03} />
      {sum < 360 && ring.length > 0 && <path d={arc(1.05, sum, 360)} fill="#fff" stroke="#f59e0b" strokeWidth={0.035} strokeDasharray="0.1 0.07" />}
      {shapes.map(({ n, start, over, i }) => (
        <g key={i} className="mz-pop" filter="url(#vl-sh)">
          <polygon points={polyAt(n, start, L).map((q) => q.join(',')).join(' ')} fill={POLY_INFO[n].fill} fillOpacity={over ? 0.55 : 1} stroke={over ? '#dc2626' : POLY_INFO[n].dark} strokeWidth={over ? 0.07 : 0.045} strokeLinejoin="round" />
        </g>
      ))}
      {shapes.map(({ n, start, i }) => {
        const [x, y] = lab(0.62, start + interior(n) / 2)
        return (
          <g key={`l${i}`} pointerEvents="none">
            <path d={arc(0.36, start, Math.min(start + interior(n), start + 359.9))} fill="#fff" fillOpacity={0.55} />
            <text x={x} y={y + 0.08} textAnchor="middle" fontSize={0.24} fontWeight={900} fill="#1f2340" stroke="#fff" strokeWidth={0.06} paintOrder="stroke">{degrees ? `${Math.round(interior(n) * 10) / 10}°` : ''}</text>
          </g>
        )
      })}
      {sum < 360 && ring.length > 0 && (() => {
        const [x, y] = lab(1.35, (sum + 360) / 2)
        return <text x={x} y={y} textAnchor="middle" fontSize={0.26} fontWeight={900} fill="#b45309" stroke="#fff" strokeWidth={0.07} paintOrder="stroke">{degrees ? `boşluk ${Math.round((360 - sum) * 10) / 10}°` : 'boşluk'}</text>
      })()}
      <circle r={0.09} fill={full ? '#16a34a' : '#1f2340'} stroke="#fff" strokeWidth={0.04} />
      {full && <circle r={0.32} fill="none" stroke="#16a34a" strokeWidth={0.06} className="mz-glow" />}
    </svg>
  )
}
