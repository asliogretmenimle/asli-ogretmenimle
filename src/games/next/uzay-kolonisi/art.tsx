import { useMemo, type ReactElement } from 'react'

/** Modül türleri: hem ızgaradaki yapılar hem kaynak paylaşımı segmentleri */
export type Mod = 'sera' | 'yasam' | 'gunes' | 'su' | 'oksijen' | 'lab' | 'isitma'

export const MODS: Record<Mod, { name: string; short: string; color: string; soft: string; emoji: string }> = {
  sera: { name: 'Sera', short: 'Sera', color: '#22c55e', soft: '#14532d', emoji: '🌱' },
  yasam: { name: 'Yaşam modülü', short: 'Yaşam', color: '#a78bfa', soft: '#3b0764', emoji: '🏠' },
  gunes: { name: 'Güneş paneli', short: 'Güneş', color: '#3b82f6', soft: '#172554', emoji: '☀️' },
  su: { name: 'Su çıkarıcı', short: 'Su', color: '#22d3ee', soft: '#164e63', emoji: '💧' },
  oksijen: { name: 'Oksijen üreteci', short: 'Oksijen', color: '#38bdf8', soft: '#0c4a6e', emoji: '🫧' },
  lab: { name: 'Laboratuvar', short: 'Lab', color: '#f472b6', soft: '#500724', emoji: '🔬' },
  isitma: { name: 'Isıtma', short: 'Isıtma', color: '#fb923c', soft: '#431407', emoji: '🔥' },
}

export const CSS = `
@keyframes uk-twinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
.uk-tw { animation: uk-twinkle var(--d,3s) ease-in-out infinite; animation-delay: var(--dl,0s) }
@keyframes uk-drift { from { transform: translateX(0) } to { transform: translateX(-40px) } }
.uk-drift { animation: uk-drift 40s linear infinite alternate }
@keyframes uk-pop { 0% { transform: scale(.2); opacity: 0 } 70% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
.uk-pop { animation: uk-pop .35s cubic-bezier(.34,1.56,.64,1) both; transform-box: fill-box; transform-origin: center bottom }
@keyframes uk-walk { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
.uk-walk { animation: uk-walk .8s ease-in-out infinite; transform-box: fill-box }
@keyframes uk-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
.uk-pulse { animation: uk-pulse 1.6s ease-in-out infinite }
@keyframes uk-alarm { 0%,100% { opacity: 0 } 50% { opacity: .35 } }
.uk-alarm { animation: uk-alarm 1s ease-in-out 3 }
@keyframes uk-meteor { 0% { transform: translate(0,0); opacity: 0 } 5% { opacity: 1 } 20% { transform: translate(-260px,140px); opacity: 0 } 100% { opacity: 0; transform: translate(-260px,140px) } }
.uk-meteor { animation: uk-meteor 9s linear infinite }
@media (prefers-reduced-motion: reduce) { .uk-tw, .uk-drift, .uk-walk, .uk-pulse, .uk-meteor { animation: none } }
`

const rnd = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/** Sahnenin arkasındaki hareketli yıldız alanı */
export function Starfield({ dense = 70 }: { dense?: number }) {
  const stars = useMemo(() => Array.from({ length: dense }, (_, i) => ({ x: rnd(i) * 100, y: rnd(i + 99) * 100, r: rnd(i + 7) * 1.3 + 0.3, d: 2 + rnd(i + 3) * 4, dl: rnd(i + 5) * 4 })), [dense])
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.18} fill="#fff" className="uk-tw" style={{ ['--d' as string]: `${s.d}s`, ['--dl' as string]: `${s.dl}s` }} />
      ))}
    </svg>
  )
}

/** Mars ufku: tepeler, uzak gezegen ve yıldızlar (SVG içinde) */
export function MarsSky({ w, h, dark }: { w: number; h: number; dark?: boolean }) {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: rnd(i + 11) * w, y: rnd(i + 37) * h * 0.85, r: rnd(i + 3) * 1.4 + 0.4, d: 2 + rnd(i) * 3 })), [w, h])
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="uk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark ? '#020617' : '#1e1b4b'} />
          <stop offset="0.75" stopColor={dark ? '#1c1917' : '#4c1d3d'} />
          <stop offset="1" stopColor={dark ? '#7c2d12' : '#c2410c'} />
        </linearGradient>
        <radialGradient id="uk-planet" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.6" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#7c2d12" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="url(#uk-sky)" />
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className="uk-tw" style={{ ['--d' as string]: `${s.d}s` }} />)}
      <g className="uk-meteor"><line x1={w * 0.9} y1={h * 0.08} x2={w * 0.9 + 26} y2={h * 0.08 - 14} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} /></g>
      <circle cx={w * 0.84} cy={h * 0.28} r={Math.min(w, h) * 0.09} fill="url(#uk-planet)" opacity={0.9} />
      <circle cx={w * 0.84 - Math.min(w, h) * 0.03} cy={h * 0.28 - Math.min(w, h) * 0.02} r={Math.min(w, h) * 0.015} fill="#92400e" opacity={0.5} />
      <path d={`M0 ${h * 0.82} Q ${w * 0.12} ${h * 0.6} ${w * 0.25} ${h * 0.74} T ${w * 0.5} ${h * 0.7} T ${w * 0.78} ${h * 0.66} T ${w} ${h * 0.74} V ${h} H 0 Z`} fill={dark ? '#431407' : '#9a3412'} opacity={0.85} />
      <path d={`M0 ${h * 0.9} Q ${w * 0.2} ${h * 0.78} ${w * 0.4} ${h * 0.86} T ${w * 0.75} ${h * 0.84} T ${w} ${h * 0.88} V ${h} H 0 Z`} fill={dark ? '#7c2d12' : '#c2410c'} />
    </g>
  )
}

/**
 * Bir modülün çizimi; (x, y) kutunun sol üst köşesi, s kenar uzunluğu.
 */
export function ModuleArt({ mod, x, y, s, pop = true }: { mod: Mod; x: number; y: number; s: number; pop?: boolean }) {
  const k = s / 100
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <g className={pop ? 'uk-pop' : undefined}>{ART[mod]}</g>
    </g>
  )
}

const shadow = <ellipse cx={50} cy={86} rx={40} ry={8} fill="rgb(0 0 0 / .35)" />

const ART: Record<Mod, ReactElement> = {
  sera: (
    <g>
      {shadow}
      <rect x={12} y={74} width={76} height={12} rx={4} fill="#475569" />
      <path d="M16 76 A34 40 0 0 1 84 76 Z" fill="#86efac" fillOpacity={0.45} stroke="#bbf7d0" strokeWidth={2.5} />
      <path d="M50 36 V76 M30 44 Q40 60 36 76 M70 44 Q60 60 64 76 M18 64 H82" stroke="#dcfce7" strokeOpacity={0.7} strokeWidth={1.5} fill="none" />
      <circle cx={34} cy={68} r={7} fill="#16a34a" />
      <circle cx={50} cy={64} r={9} fill="#22c55e" />
      <circle cx={66} cy={68} r={7} fill="#15803d" />
      <path d="M26 46 Q32 40 40 40" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  ),
  yasam: (
    <g>
      {shadow}
      <rect x={14} y={42} width={72} height={42} rx={10} fill="#e2e8f0" />
      <path d="M14 52 A36 26 0 0 1 86 52 Z" fill="#f8fafc" />
      <rect x={14} y={66} width={72} height={7} fill="#a78bfa" />
      {[28, 50, 72].map((cx) => <circle key={cx} cx={cx} cy={55} r={6} fill="#fde047" stroke="#64748b" strokeWidth={2} className="uk-pulse" />)}
      <rect x={44} y={72} width={12} height={12} rx={2} fill="#64748b" />
    </g>
  ),
  gunes: (
    <g>
      {shadow}
      <path d="M40 84 L46 60 M60 84 L54 60" stroke="#94a3b8" strokeWidth={4} />
      <path d="M8 58 L30 22 L92 22 L70 58 Z" fill="#1d4ed8" stroke="#bfdbfe" strokeWidth={2.5} />
      <path d="M15 46 L77 46 M22 34 L84 34 M30 22 L8 58 M51 22 L29 58 M71 22 L49 58" stroke="#93c5fd" strokeWidth={1.5} />
      <path d="M34 26 L46 26 L40 36 Z" fill="#fff" opacity={0.5} />
    </g>
  ),
  su: (
    <g>
      {shadow}
      <path d="M30 84 L44 20 L56 20 L70 84" stroke="#94a3b8" strokeWidth={4} fill="none" />
      <path d="M36 60 H64 M40 42 H60" stroke="#94a3b8" strokeWidth={3} />
      <rect x={18} y={60} width={30} height={24} rx={6} fill="#0891b2" />
      <path d="M72 52 C72 52 84 66 84 72 A12 12 0 0 1 60 72 C60 66 72 52 72 52 Z" fill="#67e8f9" />
      <circle cx={50} cy={18} r={5} fill="#f43f5e" className="uk-pulse" />
    </g>
  ),
  oksijen: (
    <g>
      {shadow}
      <rect x={30} y={18} width={40} height={68} rx={20} fill="#0ea5e9" />
      <rect x={36} y={24} width={8} height={54} rx={4} fill="#fff" opacity={0.35} />
      <text x={50} y={60} textAnchor="middle" fontSize={20} fontWeight={900} fill="#fff">O₂</text>
      <circle cx={78} cy={30} r={5} fill="#bae6fd" className="uk-pulse" />
      <circle cx={84} cy={18} r={3} fill="#bae6fd" className="uk-pulse" />
    </g>
  ),
  lab: (
    <g>
      {shadow}
      <rect x={16} y={52} width={68} height={32} rx={8} fill="#cbd5e1" />
      <path d="M16 56 A34 24 0 0 1 84 56 Z" fill="#f9a8d4" />
      <path d="M62 30 L74 14" stroke="#64748b" strokeWidth={3} />
      <path d="M64 14 A14 14 0 0 0 86 22 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth={2} />
      <rect x={28} y={64} width={14} height={10} rx={2} fill="#38bdf8" />
      <rect x={58} y={64} width={14} height={10} rx={2} fill="#38bdf8" />
    </g>
  ),
  isitma: (
    <g>
      {shadow}
      <circle cx={50} cy={56} r={30} fill="#fb923c" opacity={0.25} className="uk-pulse" />
      <rect x={28} y={34} width={44} height={50} rx={8} fill="#78350f" />
      <rect x={34} y={42} width={32} height={30} rx={4} fill="#f97316" />
      <path d="M40 66 Q44 54 50 50 Q56 56 60 66" fill="#fde047" />
    </g>
  ),
}

/** Küçük kâşif figürü */
export function Astronaut({ x, y, s = 1, i = 0 }: { x: number; y: number; s?: number; i?: number }) {
  const suits = ['#f8fafc', '#fde68a', '#bae6fd', '#fbcfe8']
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="uk-walk" style={{ animationDelay: `${(i % 5) * 0.15}s` }}>
        <rect x={-5} y={-4} width={10} height={12} rx={4} fill={suits[i % 4]} />
        <circle cx={0} cy={-9} r={6} fill={suits[i % 4]} />
        <rect x={-4} y={-12} width={8} height={5} rx={2.5} fill="#0f172a" />
        <rect x={-4} y={7} width={3} height={5} rx={1} fill="#64748b" />
        <rect x={1} y={7} width={3} height={5} rx={1} fill="#64748b" />
      </g>
    </g>
  )
}
