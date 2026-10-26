/**
 * Bahçe çizimleri: dört çiçek türü (renk + biçim: renk körü çocuklar için de ayırt edilebilir),
 * dört taş şekli, harf kartı, arı, kelebek ve sulama kabı.
 */

export const KINDS = [
  { name: 'kırmızı lale', color: 'kırmızı', fill: '#ef4444', dark: '#b91c1c', soft: '#fee2e2' },
  { name: 'mavi papatya', color: 'mavi', fill: '#3b82f6', dark: '#1d4ed8', soft: '#dbeafe' },
  { name: 'sarı ayçiçeği', color: 'sarı', fill: '#facc15', dark: '#a16207', soft: '#fef9c3' },
  { name: 'mor çan çiçeği', color: 'mor', fill: '#a855f7', dark: '#7e22ce', soft: '#f3e8ff' },
] as const

export const SHAPES = [
  { name: 'daire', sym: '●' },
  { name: 'kare', sym: '■' },
  { name: 'üçgen', sym: '▲' },
  { name: 'yıldız', sym: '★' },
] as const

export const LETTERS = ['A', 'B', 'C', 'D']

/** Çiçek başı (0,0 merkez, yaklaşık 64 birim çap) */
export function Bloom({ kind }: { kind: number }) {
  const k = KINDS[kind]
  switch (kind) {
    case 0: // lale
      return (
        <g>
          <path d="M-24 -6 C -26 -30, -12 -36, -8 -30 L 0 -16 L 8 -30 C 12 -36, 26 -30, 24 -6 C 22 16, -22 16, -24 -6 Z" fill={k.fill} stroke={k.dark} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M-10 -26 C -4 -40, 4 -40, 10 -26 L 6 4 L -6 4 Z" fill="#f87171" stroke={k.dark} strokeWidth={2} strokeLinejoin="round" />
          <path d="M-16 -4 C -14 6, -6 10, 0 10" stroke="#fecaca" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
        </g>
      )
    case 1: // papatya: yuvarlak taç yapraklar
      return (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <circle key={i} cx={Math.cos(a) * 17} cy={Math.sin(a) * 17} r={11} fill={k.fill} stroke={k.dark} strokeWidth={2} />
          })}
          <circle r={11} fill="#fde047" stroke="#ca8a04" strokeWidth={2} />
          <circle cx={-3} cy={-3} r={3} fill="#fef9c3" />
        </g>
      )
    case 2: // ayçiçeği: sivri yapraklar
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0 -12 L 6 -22 L 0 -34 L -6 -22 Z" fill={k.fill} stroke={k.dark} strokeWidth={1.6} strokeLinejoin="round" transform={`rotate(${i * 30})`} />
          ))}
          <circle r={14} fill="#92400e" stroke="#78350f" strokeWidth={2} />
          {[[-5, -4], [4, -6], [6, 3], [-4, 5], [0, 0]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.8} fill="#fbbf24" />)}
        </g>
      )
    default: // çan
      return (
        <g>
          <path d="M-22 14 C -22 -8, -16 -30, 0 -32 C 16 -30, 22 -8, 22 14 C 16 8, 12 18, 7 12 C 3 18, -3 18, -7 12 C -12 18, -16 8, -22 14 Z" fill={k.fill} stroke={k.dark} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M-10 -20 C -14 -6, -14 4, -12 10" stroke="#e9d5ff" strokeWidth={3} fill="none" strokeLinecap="round" />
          <circle cx={0} cy={16} r={4} fill="#fde047" stroke="#ca8a04" strokeWidth={1.5} />
        </g>
      )
  }
}

/** Saplı çiçek: (0,0) toprak noktası; yukarı doğru ~ h birim */
export function Flower({ kind, h = 96, grow, wilt, sway }: { kind: number; h?: number; grow?: boolean; wilt?: boolean; sway?: boolean }) {
  const top = -h + 30
  return (
    <g className={grow ? 'bahce-grow' : ''}>
      <g className={wilt ? 'bahce-wilt' : sway ? 'bahce-sway' : ''}>
        <path d={`M0 0 C 2 ${top / 2}, -3 ${top / 2}, 0 ${top}`} stroke="#16a34a" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d={`M0 ${top * 0.42} C 12 ${top * 0.5}, 20 ${top * 0.66}, 22 ${top * 0.78} C 10 ${top * 0.74}, 3 ${top * 0.62}, 0 ${top * 0.42} Z`} fill="#22c55e" />
        <path d={`M0 ${top * 0.25} C -12 ${top * 0.32}, -20 ${top * 0.46}, -22 ${top * 0.56} C -10 ${top * 0.52}, -3 ${top * 0.42}, 0 ${top * 0.25} Z`} fill="#4ade80" />
        <g transform={`translate(0 ${top})`}>
          <Bloom kind={kind} />
        </g>
      </g>
    </g>
  )
}

/** Patika taşı: gri taş üzerinde şekil */
export function Stone({ shape, r = 30 }: { shape: number; r?: number }) {
  const s = r * 0.5
  return (
    <g>
      <ellipse cx={0} cy={r * 0.12} rx={r * 1.05} ry={r * 0.92} fill="#78716c" />
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.86} fill="#d6d3d1" stroke="#a8a29e" strokeWidth={2} />
      <ellipse cx={-r * 0.3} cy={-r * 0.38} rx={r * 0.32} ry={r * 0.16} fill="#fff" opacity={0.5} />
      <g fill="#44403c">
        {shape === 0 && <circle r={s * 0.82} />}
        {shape === 1 && <rect x={-s * 0.75} y={-s * 0.75} width={s * 1.5} height={s * 1.5} rx={2} />}
        {shape === 2 && <path d={`M0 ${-s * 0.95} L ${s * 0.95} ${s * 0.75} L ${-s * 0.95} ${s * 0.75} Z`} strokeLinejoin="round" />}
        {shape === 3 && (
          <path
            d={Array.from({ length: 10 }, (_, i) => {
              const a = -Math.PI / 2 + (i * Math.PI) / 5
              const rr = i % 2 ? s * 0.42 : s * 0.98
              return `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`
            }).join(' ') + 'Z'}
          />
        )}
      </g>
    </g>
  )
}

/** Ahşap harf tabelası */
export function LetterTile({ letter, size = 52 }: { letter: string; size?: number }) {
  return (
    <g>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.2} fill="#fde7c5" stroke="#b45309" strokeWidth={3} />
      <text y={size * 0.2} textAnchor="middle" fontSize={size * 0.6} fontWeight={900} fill="#7c2d12">{letter}</text>
    </g>
  )
}

/** Arı Vız: arkadaş karakter */
export function Bee({ talk }: { talk?: boolean }) {
  return (
    <g className="bahce-hover">
      <ellipse cx={-6} cy={-26} rx={16} ry={11} fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={2} opacity={0.9} className="bahce-wing" />
      <ellipse cx={10} cy={-28} rx={14} ry={10} fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={2} opacity={0.9} className="bahce-wing" />
      <ellipse cx={0} cy={0} rx={30} ry={22} fill="#facc15" stroke="#1f2340" strokeWidth={3} />
      <path d="M-8 -21 C -12 -6, -12 6, -8 21 M8 -21 C 4 -6, 4 6, 8 21" stroke="#1f2340" strokeWidth={7} fill="none" />
      <path d="M30 0 L 40 3 L 30 6 Z" fill="#1f2340" />
      <circle cx={-20} cy={-4} r={13} fill="#facc15" stroke="#1f2340" strokeWidth={3} />
      <circle cx={-25} cy={-7} r={3.2} fill="#1f2340" />
      <circle cx={-16} cy={-7} r={3.2} fill="#1f2340" />
      <circle cx={-24} cy={-8} r={1} fill="#fff" />
      <circle cx={-15} cy={-8} r={1} fill="#fff" />
      <path d={talk ? 'M-26 2 Q -20 10 -14 2 Z' : 'M-25 2 Q -20 7 -15 2'} stroke="#1f2340" strokeWidth={2} fill={talk ? '#be123c' : 'none'} strokeLinecap="round" />
      <path d="M-24 -16 C -28 -26, -32 -28, -34 -30 M-16 -16 C -14 -26, -12 -28, -10 -32" stroke="#1f2340" strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx={-34} cy={-30} r={2.5} fill="#1f2340" />
      <circle cx={-10} cy={-32} r={2.5} fill="#1f2340" />
    </g>
  )
}

export function Butterfly({ c1, c2 }: { c1: string; c2: string }) {
  return (
    <g>
      <g className="bahce-flap">
        <path d="M0 0 C -18 -22, -30 -6, -18 4 C -28 12, -14 22, 0 4 Z" fill={c1} stroke="#1f2340" strokeWidth={1.4} />
        <path d="M0 0 C 18 -22, 30 -6, 18 4 C 28 12, 14 22, 0 4 Z" fill={c2} stroke="#1f2340" strokeWidth={1.4} />
      </g>
      <rect x={-1.6} y={-8} width={3.2} height={18} rx={1.6} fill="#1f2340" />
      <path d="M0 -8 C -3 -14, -6 -16, -8 -17 M0 -8 C 3 -14, 6 -16, 8 -17" stroke="#1f2340" strokeWidth={1.2} fill="none" />
    </g>
  )
}

export function WateringCan({ pouring }: { pouring?: boolean }) {
  return (
    <g className={pouring ? 'bahce-pour' : ''}>
      <path d="M-34 -10 L 30 -10 L 26 36 L -30 36 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth={3} strokeLinejoin="round" />
      <path d="M-34 -10 C -60 -14, -64 26, -30 22" stroke="#0369a1" strokeWidth={6} fill="none" />
      <path d="M28 6 L 70 -22" stroke="#0369a1" strokeWidth={9} strokeLinecap="round" />
      <ellipse cx={74} cy={-25} rx={8} ry={11} fill="#0ea5e9" stroke="#0369a1" strokeWidth={3} transform="rotate(-35 74 -25)" />
      <path d="M-20 -10 C -20 -34, 16 -34, 16 -10" stroke="#0369a1" strokeWidth={6} fill="none" />
      <rect x={-22} y={4} width={40} height={8} rx={4} fill="#7dd3fc" />
      {pouring && (
        <g fill="#38bdf8">
          {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} className="bahce-drop" style={{ animationDelay: `${i * 0.13}s` }} cx={82 + i * 4} cy={-14} rx={3} ry={5} />)}
        </g>
      )}
    </g>
  )
}

export const GARDEN_CSS = `
  .bahce-grow{animation:bahce-grow .7s cubic-bezier(.34,1.56,.64,1) both;transform-box:fill-box;transform-origin:center bottom}
  @keyframes bahce-grow{from{transform:scale(.15);opacity:.2}to{transform:scale(1);opacity:1}}
  .bahce-sway{animation:bahce-sway 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom}
  @keyframes bahce-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
  .bahce-wilt{transform:rotate(14deg);transform-box:fill-box;transform-origin:center bottom;transition:transform .4s}
  .bahce-hover{animation:bahce-hov 1.6s ease-in-out infinite}
  @keyframes bahce-hov{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .bahce-wing{animation:bahce-wing .18s linear infinite alternate;transform-box:fill-box;transform-origin:center bottom}
  @keyframes bahce-wing{to{transform:scaleY(.55)}}
  .bahce-flap{animation:bahce-flap .35s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
  @keyframes bahce-flap{to{transform:scaleX(.35)}}
  .bahce-fly1{animation:bahce-fly1 14s ease-in-out infinite}
  .bahce-fly2{animation:bahce-fly2 17s ease-in-out infinite}
  @keyframes bahce-fly1{0%{transform:translate(0,0)}25%{transform:translate(220px,-30px)}50%{transform:translate(420px,20px)}75%{transform:translate(180px,50px)}100%{transform:translate(0,0)}}
  @keyframes bahce-fly2{0%{transform:translate(0,0)}30%{transform:translate(-260px,30px)}60%{transform:translate(-420px,-20px)}100%{transform:translate(0,0)}}
  .bahce-pour{transform:rotate(28deg);transform-box:fill-box;transform-origin:center;transition:transform .4s}
  .bahce-drop{animation:bahce-drop .6s linear infinite}
  @keyframes bahce-drop{from{transform:translate(0,0);opacity:1}to{transform:translate(18px,60px);opacity:0}}
  .bahce-slot{transition:stroke .15s,fill .15s}
  [data-over] .bahce-slot{stroke:#0ea5e9;fill:rgba(14,165,233,.22)}
  .bahce-tap{cursor:pointer}
  .bahce-tap:focus-visible{outline:none}
  .bahce-tap:focus-visible .bahce-focus{stroke:#0ea5e9;stroke-width:4}
  .bahce-pulse{animation:bahce-pulse 1.2s ease-in-out infinite}
  @keyframes bahce-pulse{50%{opacity:.45}}
  @media (prefers-reduced-motion: reduce){.bahce-grow,.bahce-sway,.bahce-hover,.bahce-wing,.bahce-flap,.bahce-fly1,.bahce-fly2,.bahce-drop,.bahce-pulse{animation:none}}
`
