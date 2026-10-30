import { divisors, gcd } from '../../../lib/numberTheory'
import { ek } from '../../../lib/generators'

/** Sahne çizimleri: Asal Bekçi, kale kapısı ve sihirli çarpan çemberi (hepsi SVG) */

export type Mood = 'neutral' | 'happy' | 'stern' | 'think'
export type GateState = 'idle' | 'approach' | 'open' | 'closed'

const GLOW: Record<GateState, string> = { idle: '#fbbf24', approach: '#fbbf24', open: '#22c55e', closed: '#ef4444' }

export function Guard({ mood }: { mood: Mood }) {
  return (
    <g aria-hidden>
      <ellipse cx="78" cy="238" rx="44" ry="6" fill="#000" opacity="0.35" />
      {/* mızrak */}
      <line x1="128" y1="58" x2="128" y2="236" stroke="#a16207" strokeWidth="5" strokeLinecap="round" />
      <path d="M128 34 L136 60 L120 60 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      {/* bacaklar */}
      <rect x="58" y="192" width="15" height="42" rx="5" fill="#1e3a8a" />
      <rect x="82" y="192" width="15" height="42" rx="5" fill="#1e3a8a" />
      <rect x="54" y="228" width="22" height="9" rx="4" fill="#111827" />
      <rect x="80" y="228" width="22" height="9" rx="4" fill="#111827" />
      {/* gövde */}
      <rect x="46" y="122" width="64" height="80" rx="20" fill="#dc2626" />
      <rect x="46" y="170" width="64" height="9" fill="#f8fafc" />
      <rect x="72" y="170" width="12" height="9" rx="2" fill="#fbbf24" />
      {[136, 150, 192].map((y) => <circle key={y} cx="78" cy={y} r="3" fill="#fbbf24" />)}
      {/* kollar */}
      <rect x="34" y="128" width="16" height="50" rx="8" fill="#b91c1c" />
      <rect x="106" y="126" width="16" height="40" rx="8" fill="#b91c1c" transform="rotate(-28 114 130)" />
      <circle cx="42" cy="180" r="7" fill="#fcd9b6" />
      <circle cx="127" cy="150" r="7" fill="#fcd9b6" />
      {/* baş */}
      <circle cx="78" cy="100" r="26" fill="#fcd9b6" />
      <circle cx="62" cy="108" r="5" fill="#fb7185" opacity="0.5" />
      <circle cx="94" cy="108" r="5" fill="#fb7185" opacity="0.5" />
      {/* göz ve kaşlar */}
      {mood === 'happy' ? (
        <>
          <path d="M64 98 q5 -6 10 0" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M82 98 q5 -6 10 0" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="69" cy="98" r="3.4" fill="#1f2937" />
          <circle cx="87" cy="98" r="3.4" fill="#1f2937" />
          {mood === 'stern' && (
            <>
              <path d="M62 88 L74 92" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
              <path d="M94 88 L82 92" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
          {mood === 'think' && <path d="M82 89 L94 87" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />}
        </>
      )}
      {/* bıyık ve ağız */}
      <path d="M66 110 q6 -5 12 0 q6 -5 12 0" stroke="#78350f" strokeWidth="4" fill="none" strokeLinecap="round" />
      {mood === 'happy' && <path d="M70 116 q8 8 16 0" stroke="#7f1d1d" strokeWidth="3" fill="#fecaca" strokeLinecap="round" />}
      {mood === 'stern' && <path d="M71 119 q7 -4 14 0" stroke="#7f1d1d" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {(mood === 'neutral' || mood === 'think') && <path d="M72 117 q6 3 12 0" stroke="#7f1d1d" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {/* kalpak */}
      <path d="M50 92 C46 40, 110 40, 106 92 Z" fill="#111827" />
      <path d="M54 92 q24 8 48 0" stroke="#fbbf24" strokeWidth="3" fill="none" />
      <circle cx="100" cy="62" r="5" fill="#dc2626" />
    </g>
  )
}

/** Kale kapısı: hedef sayı tabelada; kapı açılırken kanatlar menteşeden döner */
export function GateArt({ T, state, n, enterKey }: { T: number; state: GateState; n: number | null; enterKey: number }) {
  const glow = GLOW[state]
  const open = state === 'open'
  const door = { transition: 'transform 0.5s ease', transformBox: 'view-box' as const }
  return (
    <g>
      {/* duvar */}
      <rect x="170" y="34" width="240" height="204" rx="6" fill="#475569" />
      {[60, 90, 120, 150, 180, 210].map((y, i) => (
        <g key={y} stroke="#334155" strokeWidth="2">
          <line x1="170" y1={y} x2="410" y2={y} />
          {[0, 1, 2, 3].map((k) => <line key={k} x1={184 + k * 60 + (i % 2) * 30} y1={y - 30} x2={184 + k * 60 + (i % 2) * 30} y2={y} />)}
        </g>
      ))}
      {[176, 216, 256, 296, 336, 376].map((x) => <rect key={x} x={x} y="20" width="26" height="18" rx="2" fill="#475569" />)}
      {/* kapı boşluğu ve ışık */}
      <g className={state === 'closed' ? 'animate-shake' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M215 238 V128 A75 75 0 0 1 365 128 V238 Z" fill="#0f172a" />
        <path d="M215 238 V128 A75 75 0 0 1 365 128 V238 Z" fill={glow} opacity={state === 'idle' ? 0.08 : open ? 0.55 : 0.4} style={{ transition: 'opacity 0.4s, fill 0.3s', filter: `drop-shadow(0 0 14px ${glow})` }} />
        {open && <text x="290" y="170" textAnchor="middle" fontSize="40" aria-hidden>🏰</text>}
        {/* kanatlar */}
        <g style={{ ...door, transformOrigin: '215px 150px', transform: open ? 'scaleX(0.1)' : 'none' }}>
          <path d="M215 238 V128 A75 75 0 0 1 290 53 V238 Z" fill="#92400e" stroke="#78350f" strokeWidth="3" />
          {[235, 255, 275].map((x) => <line key={x} x1={x} y1={x === 235 ? 85 : 62} x2={x} y2="236" stroke="#78350f" strokeWidth="2" />)}
          <circle cx="280" cy="160" r="4" fill="#fbbf24" />
        </g>
        <g style={{ ...door, transformOrigin: '365px 150px', transform: open ? 'scaleX(0.1)' : 'none' }}>
          <path d="M290 53 A75 75 0 0 1 365 128 V238 H290 Z" fill="#92400e" stroke="#78350f" strokeWidth="3" />
          {[305, 325, 345].map((x) => <line key={x} x1={x} y1={x === 345 ? 85 : 62} x2={x} y2="236" stroke="#78350f" strokeWidth="2" />)}
          <circle cx="300" cy="160" r="4" fill="#fbbf24" />
        </g>
        {state === 'closed' && (
          <g stroke="#7f1d1d" strokeWidth="6" strokeLinecap="round" opacity="0.9">
            <line x1="245" y1="70" x2="245" y2="236" />
            <line x1="290" y1="56" x2="290" y2="236" />
            <line x1="335" y1="70" x2="335" y2="236" />
          </g>
        )}
      </g>
      {/* meşaleler */}
      {[190, 390].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="96" width="8" height="26" rx="2" fill="#78350f" />
          <circle cx={x} cy="88" r="10" fill={glow} style={{ transition: 'fill 0.3s', filter: `drop-shadow(0 0 8px ${glow})` }} />
        </g>
      ))}
      {/* hedef sayı tabelası */}
      <rect x="248" y="4" width="84" height="40" rx="10" fill="#fbbf24" stroke="#b45309" strokeWidth="3" />
      <text x="290" y="26" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="900" fill="#1f2937">{T}</text>
      {/* kapıya gelen sayı */}
      {n !== null && (
        <g key={enterKey} className={open ? 'ab-enter' : state === 'closed' ? 'ab-bounce' : 'ab-approach'} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx="290" cy="206" r="24" fill="#f8fafc" stroke={glow} strokeWidth="4" />
          <text x="290" y="207" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="900" fill="#1f2937">{n}</text>
        </g>
      )}
    </g>
  )
}

/** Animasyonlar (yalnızca bu oyunda) */
export const sceneCss = `
@keyframes ab-approach { from { transform: translateY(40px) scale(0.6); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes ab-enter { 0% { transform: none; opacity: 1 } 100% { transform: translateY(-70px) scale(0.3); opacity: 0 } }
@keyframes ab-bounce { 0% { transform: none } 30% { transform: translateY(-12px) } 100% { transform: translateY(36px); opacity: 0.25 } }
.ab-approach { animation: ab-approach 0.4s ease-out both }
.ab-enter { animation: ab-enter 0.8s 0.25s ease-in both }
.ab-bounce { animation: ab-bounce 0.9s 0.2s ease-in both }
@keyframes ab-glow { 0%, 100% { filter: drop-shadow(0 0 4px #fde047) } 50% { filter: drop-shadow(0 0 12px #fde047) } }
.ab-glow { animation: ab-glow 1.4s ease-in-out infinite }
@keyframes ab-spin { to { transform: rotate(360deg) } }
.ab-spin { animation: ab-spin 18s linear infinite; transform-box: fill-box; transform-origin: center }
`

/**
 * Sihirli çarpan çemberi: hedefin çarpanları sol yayda, sayının çarpanları sağ yayda.
 * Ortak çarpanlar parlar ve çemberin içinden birbirine bağlanır.
 */
export function FactorCircle({ T, n }: { T: number; n: number }) {
  const L = divisors(T), R = divisors(n)
  const common = L.filter((d) => R.includes(d))
  const g = gcd(T, n)
  const ok = g === 1
  const cx = 180, cy = 160, rad = 112
  const pos = (i: number, k: number, side: -1 | 1) => {
    const t = ((i + 0.5) / k) * Math.PI
    return [cx + side * rad * Math.sin(t), cy - rad * Math.cos(t)] as const
  }
  const chipR = Math.min(16, Math.max(11, 130 / Math.max(L.length, R.length)))
  const chip = (d: number, x: number, y: number, side: string) => {
    const shared = common.includes(d)
    const hot = shared && d !== 1
    return (
      <g key={side + d} className={hot ? 'ab-glow' : ''}>
        <circle cx={x} cy={y} r={chipR} fill={hot ? '#fde047' : shared ? '#e2e8f0' : '#1e293b'} stroke={hot ? '#facc15' : '#64748b'} strokeWidth={hot ? 3 : 1.5} />
        <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={chipR > 13 ? 13 : 11} fontWeight="900" fill={shared ? '#1f2937' : '#e2e8f0'}>{d}</text>
      </g>
    )
  }
  return (
    <figure className="mx-auto w-full max-w-[380px] animate-fade-up" aria-label={`${ek(T, 'gen')} ve ${ek(n, 'gen')} çarpanları`}>
      <svg viewBox="0 0 360 300" className="w-full">
        <circle cx={cx} cy={cy} r={rad + 22} fill="none" stroke={ok ? '#22c55e' : '#a855f7'} strokeWidth="3" strokeDasharray="4 10" className="ab-spin" opacity="0.8" />
        <circle cx={cx} cy={cy} r={rad} fill="#0b1224" stroke={ok ? '#16a34a' : '#7c3aed'} strokeWidth="2" opacity="0.9" />
        <text x="24" y="20" fontSize="14" fontWeight="900" fill="#c4b5fd">{ek(T, 'gen')} çarpanları</text>
        <text x="336" y="20" textAnchor="end" fontSize="14" fontWeight="900" fill="#c4b5fd">{ek(n, 'gen')} çarpanları</text>
        {common.map((d) => {
          const [x1, y1] = pos(L.indexOf(d), L.length, -1)
          const [x2, y2] = pos(R.indexOf(d), R.length, 1)
          return <line key={'l' + d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={d === 1 ? '#64748b' : '#fde047'} strokeWidth={d === 1 ? 1.5 : 3} strokeDasharray={d === 1 ? '4 4' : undefined} opacity={d === 1 ? 0.7 : 0.9} />
        })}
        <rect x={cx - 62} y={cy - 26} width="124" height="52" rx="14" fill={ok ? '#14532d' : '#4c1d95'} stroke={ok ? '#22c55e' : '#a855f7'} strokeWidth="2" />
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="800" fill="#e2e8f0">Ortak: {common.join(', ')}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="900" fill={ok ? '#86efac' : '#fde047'}>EBOB = {g}</text>
        {L.map((d, i) => { const [x, y] = pos(i, L.length, -1); return chip(d, x, y, 'L') })}
        {R.map((d, i) => { const [x, y] = pos(i, R.length, 1); return chip(d, x, y, 'R') })}
      </svg>
    </figure>
  )
}
