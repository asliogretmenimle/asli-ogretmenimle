import { useEffect, useState, type ReactNode } from 'react'

/**
 * Ada sahnesi (SVG): gökyüzü, deniz, iki ada, aralarında tahta tahta kurulan köprü ve köprüden geçen küçük kaşif.
 * Görsel bir sahnedir; ZoomBox içinde iki parmakla yakınlaştırılabilir.
 */

const W = 1000
const H = 440
const DECK_Y = 262
const X0 = 262
const X1 = 738

const PALETTES = [
  { sand: '#fde68a', sandDark: '#e9b872', grass: '#4ade80', grassDark: '#16a34a', flower: '#f472b6' },
  { sand: '#fed7aa', sandDark: '#e8a774', grass: '#86efac', grassDark: '#15803d', flower: '#facc15' },
  { sand: '#fef3c7', sandDark: '#e3b679', grass: '#34d399', grassDark: '#047857', flower: '#a78bfa' },
]

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 C 4 -40, 14 -80, 30 -118" stroke="#92400e" strokeWidth={12} fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d="M30 -118 c -8 -2, -6 0, -10 6" stroke="#78350f" strokeWidth={2} fill="none" transform={`translate(${-i * 2.6} ${i * 19}) `} opacity={0.5} />
      ))}
      <g transform="translate(30 -120)">
        <path d="M0 0 C 30 -30, 70 -20, 86 8 C 60 -6, 30 -6, 0 0Z" fill="#22c55e" />
        <path d="M0 0 C -30 -32, -70 -22, -84 6 C -58 -8, -28 -6, 0 0Z" fill="#16a34a" />
        <path d="M0 0 C 20 -44, 50 -58, 74 -48 C 46 -40, 24 -24, 0 0Z" fill="#4ade80" />
        <path d="M0 0 C -16 -46, -46 -60, -70 -50 C -44 -40, -22 -22, 0 0Z" fill="#22c55e" />
        <path d="M0 0 C 36 4, 60 30, 62 56 C 44 32, 22 14, 0 0Z" fill="#15803d" />
        <path d="M0 0 C -34 6, -56 32, -56 58 C -40 34, -20 14, 0 0Z" fill="#16a34a" />
        <circle cx={-6} cy={8} r={7} fill="#7c2d12" />
        <circle cx={7} cy={9} r={7} fill="#92400e" />
      </g>
    </g>
  )
}

function Island({ cx, pal, children }: { cx: number; pal: (typeof PALETTES)[number]; children?: ReactNode }) {
  return (
    <g>
      <ellipse cx={cx} cy={326} rx={196} ry={64} fill="#7dd3fc" opacity={0.7} />
      <ellipse cx={cx} cy={318} rx={172} ry={50} fill={pal.sandDark} />
      <path d={`M${cx - 168} 312 C ${cx - 150} 236, ${cx + 150} 236, ${cx + 168} 312 Z`} fill={pal.sand} />
      <path d={`M${cx - 130} 268 C ${cx - 96} 222, ${cx + 96} 222, ${cx + 130} 268 C ${cx + 60} 258, ${cx - 60} 258, ${cx - 130} 268Z`} fill={pal.grass} />
      <path d={`M${cx - 130} 268 C ${cx - 60} 258, ${cx + 60} 258, ${cx + 130} 268 C ${cx + 70} 276, ${cx - 70} 276, ${cx - 130} 268Z`} fill={pal.grassDark} opacity={0.5} />
      {[-90, -40, 52, 100].map((dx, i) => (
        <g key={i} transform={`translate(${cx + dx} ${248 + (i % 2) * 6})`}>
          <circle r={4} fill={pal.flower} />
          <circle r={1.6} fill="#fff7ed" />
        </g>
      ))}
      <ellipse cx={cx - 60} cy={300} rx={14} ry={6} fill="#a8a29e" />
      <ellipse cx={cx + 112} cy={296} rx={10} ry={5} fill="#a8a29e" />
      {children}
    </g>
  )
}

function Explorer({ x, y, walking }: { x: number; y: number; walking: boolean }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 2.6s cubic-bezier(.45,.05,.4,1)' }}>
      <g className={walking ? 'adalar-walk' : 'adalar-idle'}>
        <ellipse cx={0} cy={2} rx={18} ry={5} fill="#0f172a" opacity={0.18} />
        {/* bacaklar */}
        <rect x={-10} y={-26} width={8} height={26} rx={4} fill="#1e3a8a" className={walking ? 'adalar-leg-a' : ''} />
        <rect x={2} y={-26} width={8} height={26} rx={4} fill="#1e40af" className={walking ? 'adalar-leg-b' : ''} />
        {/* sırt çantası */}
        <rect x={-20} y={-54} width={12} height={22} rx={5} fill="#f59e0b" />
        {/* gövde */}
        <rect x={-14} y={-58} width={28} height={36} rx={11} fill="#f43f5e" />
        <rect x={-14} y={-40} width={28} height={6} fill="#fb7185" />
        {/* baş */}
        <circle cx={0} cy={-74} r={17} fill="#fcd9b8" />
        <path d="M-17 -76 C -16 -96, 16 -98, 17 -78 C 8 -86, -6 -86, -17 -76Z" fill="#7c2d12" />
        {/* şapka */}
        <path d="M-20 -84 C -16 -100, 16 -100, 20 -84 Z" fill="#fde047" />
        <rect x={-24} y={-86} width={48} height={5} rx={2.5} fill="#eab308" />
        <circle cx={-6} cy={-73} r={2.2} fill="#1f2340" />
        <circle cx={7} cy={-73} r={2.2} fill="#1f2340" />
        <circle cx={-10} cy={-67} r={3} fill="#fda4af" opacity={0.7} />
        <circle cx={11} cy={-67} r={3} fill="#fda4af" opacity={0.7} />
        <path d="M-4 -66 Q 1 -61 6 -66" stroke="#1f2340" strokeWidth={2} fill="none" strokeLinecap="round" />
        {/* kol */}
        <rect x={10} y={-56} width={7} height={22} rx={3.5} fill="#fcd9b8" transform="rotate(-24 13 -56)" />
      </g>
    </g>
  )
}

export interface PlankView {
  label: string
  fresh?: boolean
}

export function IslandScene({ sign, goal, planks, walking, arrived, variant, from }: {
  sign: string
  goal: number
  planks: PlankView[]
  walking: boolean
  arrived: boolean
  variant: number
  /** Sol adadaki (önceki) tabela */
  from?: string
}) {
  const [motion] = useState(() => !reducedMotion())
  const palL = PALETTES[variant % PALETTES.length]
  const palR = PALETTES[(variant + 1) % PALETTES.length]
  const seg = (X1 - X0) / goal
  const shown = planks.slice(0, goal)
  const built = shown.length
  const ex = walking || arrived ? 790 : 140
  const ey = walking || arrived ? 252 : 252
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (planks.length) setBurst((b) => b + 1)
  }, [planks.length])

  const signFont = sign.length > 7 ? 30 : sign.length > 4 ? 38 : 50

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Hedef ada: ${sign}. Köprüde ${built} / ${goal} tahta var.`}>
      <defs>
        <linearGradient id="adalar-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#f0f9ff" />
        </linearGradient>
        <linearGradient id="adalar-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.55" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="adalar-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd9a8" />
          <stop offset="1" stopColor="#d6a26a" />
        </linearGradient>
        <radialGradient id="adalar-sun">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.6" stopColor="#fde047" />
          <stop offset="1" stopColor="#fde047" stopOpacity={0} />
        </radialGradient>
      </defs>
      <style>{`
        .adalar-idle{animation:adalar-bob 2.4s ease-in-out infinite}
        .adalar-walk{animation:adalar-hop .42s ease-in-out infinite}
        .adalar-leg-a{transform-box:fill-box;transform-origin:50% 0;animation:adalar-leg .42s ease-in-out infinite}
        .adalar-leg-b{transform-box:fill-box;transform-origin:50% 0;animation:adalar-leg .42s ease-in-out infinite reverse}
        .adalar-plank{transform-box:fill-box;transform-origin:50% 0;animation:adalar-drop .55s cubic-bezier(.34,1.56,.64,1)}
        .adalar-cloud{animation:adalar-drift 38s linear infinite}
        .adalar-flag{transform-box:fill-box;transform-origin:0 50%;animation:adalar-flag 1.8s ease-in-out infinite}
        @keyframes adalar-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes adalar-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes adalar-leg{0%,100%{transform:rotate(18deg)}50%{transform:rotate(-18deg)}}
        @keyframes adalar-drop{0%{transform:translateY(-60px) rotate(-6deg);opacity:0}100%{transform:none;opacity:1}}
        @keyframes adalar-drift{from{transform:translateX(0)}to{transform:translateX(120px)}}
        @keyframes adalar-flag{0%,100%{transform:skewY(0)}50%{transform:skewY(-6deg)}}
        @media (prefers-reduced-motion: reduce){.adalar-idle,.adalar-walk,.adalar-leg-a,.adalar-leg-b,.adalar-plank,.adalar-cloud,.adalar-flag{animation:none}}
      `}</style>

      {/* gökyüzü */}
      <rect width={W} height={170} fill="url(#adalar-sky)" />
      <circle cx={890} cy={62} r={70} fill="url(#adalar-sun)" />
      <circle cx={890} cy={62} r={30} fill="#fde047" />
      <g className="adalar-cloud" opacity={0.95}>
        <g fill="#fff">
          <ellipse cx={150} cy={64} rx={46} ry={18} />
          <ellipse cx={180} cy={52} rx={30} ry={20} />
          <ellipse cx={122} cy={56} rx={24} ry={14} />
          <ellipse cx={520} cy={40} rx={38} ry={14} />
          <ellipse cx={546} cy={30} rx={24} ry={16} />
        </g>
      </g>
      {/* martı */}
      <g stroke="#334155" strokeWidth={3} fill="none" strokeLinecap="round">
        <path d="M640 96 q 9 -9 18 0 q 9 -9 18 0" />
        <path d="M700 74 q 6 -6 12 0 q 6 -6 12 0" strokeWidth={2.4} />
      </g>
      {/* ufuktaki adalar */}
      <path d="M380 170 q 30 -20 60 0Z M600 170 q 22 -14 44 0Z" fill="#7dd3fc" />

      {/* deniz */}
      <rect y={168} width={W} height={H - 168} fill="url(#adalar-sea)" />
      <g stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.35}>
        {[200, 236, 360, 400, 420].map((y, i) => (
          <path key={i} d={`M${-60 + (i * 137) % 200} ${y} q 20 -8 40 0 t 40 0 t 40 0 M${420 + (i * 91) % 160} ${y + 6} q 20 -8 40 0 t 40 0`}>
            {motion && <animateTransform attributeName="transform" type="translate" values={`0 0; ${i % 2 ? 26 : -26} 0; 0 0`} dur={`${5 + i}s`} repeatCount="indefinite" />}
          </path>
        ))}
      </g>

      {/* adalar */}
      <Island cx={130} pal={palL}>
        <Palm x={58} y={262} s={0.95} />
        {from && (
          <g transform="translate(234 214)">
            <rect x={-2} y={0} width={5} height={44} fill="#78350f" />
            <rect x={-32} y={-26} width={64} height={30} rx={7} fill="#fff7ed" stroke="#92400e" strokeWidth={3} />
            <text x={0} y={-4} textAnchor="middle" fontSize={20} fontWeight={900} fill="#92400e">{from}</text>
          </g>
        )}
      </Island>
      <Island cx={870} pal={palR}>
        <Palm x={950} y={262} s={1.05} flip />
        {/* tabela */}
        <g transform="translate(866 140)">
          <rect x={-4} y={10} width={8} height={110} rx={3} fill="#78350f" />
          <rect x={-74} y={-42} width={148} height={78} rx={16} fill="#fff" stroke="#0f766e" strokeWidth={6} />
          <text x={0} y={signFont / 3 + 0} textAnchor="middle" fontSize={signFont} fontWeight={900} fill="#0f172a" style={{ fontFamily: 'inherit' }}>{sign}</text>
          {arrived && (
            <g className="adalar-flag" transform="translate(0 -84)">
              <rect x={-2} y={0} width={4} height={42} fill="#334155" />
              <path d="M2 2 L 40 12 L 2 24Z" fill="#f43f5e" />
            </g>
          )}
        </g>
      </Island>

      {/* köprü */}
      <g>
        {/* direkler */}
        {Array.from({ length: goal + 1 }, (_, i) => {
          const x = X0 + i * seg
          const on = i <= built && (i === 0 || i <= built)
          return (
            <g key={i} opacity={on ? 1 : 0.35}>
              <rect x={x - 6} y={DECK_Y - 46} width={12} height={92} rx={4} fill="#7c2d12" />
              <circle cx={x} cy={DECK_Y - 46} r={8} fill="#9a3412" />
            </g>
          )
        })}
        {/* halatlar */}
        {Array.from({ length: built }, (_, i) => {
          const x = X0 + i * seg
          return (
            <path key={i} d={`M${x} ${DECK_Y - 42} Q ${x + seg / 2} ${DECK_Y - 18} ${x + seg} ${DECK_Y - 42}`} stroke="#a16207" strokeWidth={4} fill="none" />
          )
        })}
        {/* boş tahta yerleri */}
        {Array.from({ length: goal }, (_, i) => i >= built && (
          <g key={`e${i}`}>
            <rect x={X0 + i * seg + 8} y={DECK_Y - 4} width={seg - 16} height={40} rx={8} fill="#e0f2fe" fillOpacity={0.25} stroke="#fff" strokeWidth={3} strokeDasharray="10 8" />
            <text x={X0 + (i + 0.5) * seg} y={DECK_Y + 24} textAnchor="middle" fontSize={26} fontWeight={900} fill="#fff" opacity={0.8}>?</text>
          </g>
        ))}
        {/* kurulan tahtalar */}
        {shown.map((p, i) => {
          const x = X0 + i * seg + 3
          const w = seg - 6
          const fs = Math.min(30, (w - 12) / Math.max(4, p.label.length) * 1.9)
          return (
            <g key={`${i}-${p.label}`} className={p.fresh ? 'adalar-plank' : ''}>
              <rect x={x} y={DECK_Y - 4} width={w} height={44} rx={7} fill="url(#adalar-wood)" stroke="#92400e" strokeWidth={3} />
              <path d={`M${x + 10} ${DECK_Y + 8} h ${w * 0.3} M${x + w * 0.55} ${DECK_Y + 30} h ${w * 0.35}`} stroke="#b45309" strokeWidth={2} opacity={0.45} strokeLinecap="round" />
              <text x={x + w / 2} y={DECK_Y + 18 + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#451a03">{p.label}</text>
            </g>
          )
        })}
        {/* yansımalar */}
        {shown.map((_, i) => (
          <rect key={`r${i}`} x={X0 + i * seg + 14} y={DECK_Y + 52} width={seg - 28} height={6} rx={3} fill="#0c4a6e" opacity={0.25} />
        ))}
      </g>

      {built > 0 && motion && (
        <g key={`burst${burst}`} pointerEvents="none">
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const cx = X0 + (Math.min(built, goal) - 0.5) * seg
            const a = (k / 6) * Math.PI * 2
            return (
              <circle key={k} cx={cx} cy={DECK_Y + 16} r={5} fill="#fde047">
                <animate attributeName="cx" from={cx} to={cx + Math.cos(a) * 70} dur="0.7s" fill="freeze" />
                <animate attributeName="cy" from={DECK_Y + 16} to={DECK_Y + 16 + Math.sin(a) * 50} dur="0.7s" fill="freeze" />
                <animate attributeName="opacity" from="1" to="0" dur="0.7s" fill="freeze" />
              </circle>
            )
          })}
        </g>
      )}

      {planks.length > goal && (
        <g transform="translate(930 330)" aria-hidden>
          <rect x={-30} y={-22} width={60} height={40} rx={8} fill="#b45309" stroke="#78350f" strokeWidth={3} />
          <path d="M-30 -10 Q 0 -40 30 -10Z" fill="#d97706" stroke="#78350f" strokeWidth={3} />
          <rect x={-6} y={-14} width={12} height={14} rx={2} fill="#fde047" />
          <circle cx={30} cy={-34} r={20} fill="#fde047" stroke="#ca8a04" strokeWidth={3} />
          <text x={30} y={-27} textAnchor="middle" fontSize={20} fontWeight={900} fill="#713f12">+{planks.length - goal}</text>
        </g>
      )}
      <Explorer key={`ex${variant}`} x={ex} y={ey} walking={walking} />
    </svg>
  )
}
