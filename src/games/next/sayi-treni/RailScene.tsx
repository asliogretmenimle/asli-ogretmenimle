import { useState } from 'react'
import { BASE, LOCO_W, Loco, WAG_W, WagonBody, WagonRep, type Car } from './reps'

/**
 * Demiryolu sahnesi (SVG): gökyüzü, tepeler, istasyon binası, kural tabelası, ray ve tünel.
 * Tren solda tünele doğru bakar; vagonlar lokomotifin arkasına (sağa) bağlanır.
 * Tamamlanınca tren tünele girer, yeni seviyede sağdan gelir.
 */

export const SW = 1000
export const SH = 390
const RAIL_Y = 330
const TRAIN_X = 128
const GAP = 10

export interface TrainItem {
  key: string
  car?: Car
  /** vagonun üstündeki etiket (“1.”, “10 fazlası”) */
  tag?: string
  /** boş yuva: data-drop adı */
  drop?: string
  selected?: boolean
  flagged?: boolean
  good?: boolean
  fresh?: boolean
  fixed?: boolean
  /** “+” bağlama yeri */
  plus?: boolean
  onTap?: () => void
  label?: string
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Cloud({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  return (
    <g className="tren-cloud" style={{ animationDuration: `${d}s` }}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={0.92}>
        <ellipse cx={0} cy={0} rx={38} ry={18} />
        <ellipse cx={28} cy={-10} rx={30} ry={22} />
        <ellipse cx={60} cy={2} rx={34} ry={16} />
      </g>
    </g>
  )
}

function Tree({ x, y, s = 1, c = '#22c55e' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-4} y={-18} width={8} height={22} rx={3} fill="#92400e" />
      <circle cx={0} cy={-34} r={22} fill={c} />
      <circle cx={-12} cy={-24} r={14} fill={c} />
      <circle cx={13} cy={-25} r={15} fill={c} />
      <circle cx={-6} cy={-42} r={9} fill="#fff" opacity={0.18} />
    </g>
  )
}

function Station({ board }: { board?: string[] }) {
  return (
    <g>
      {/* bina */}
      <g transform="translate(690 132)">
        <rect x={0} y={40} width={250} height={140} rx={6} fill="#fde7c5" stroke="#d6a26a" strokeWidth={3} />
        <path d="M-18 46 L125 -8 L268 46 Z" fill="#dc2626" stroke="#991b1b" strokeWidth={3} strokeLinejoin="round" />
        <path d="M10 46 L125 3 L240 46" fill="none" stroke="#fca5a5" strokeWidth={3} opacity={0.6} />
        <circle cx={125} cy={22} r={15} fill="#fff" stroke="#991b1b" strokeWidth={3} />
        <path d="M125 22 L125 13 M125 22 L132 25" stroke="#1f2340" strokeWidth={2.4} strokeLinecap="round" />
        <rect x={34} y={56} width={182} height={28} rx={8} fill="#1e3a8a" />
        <text x={125} y={76} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fef3c7" letterSpacing={1.5}>SAYI İSTASYONU</text>
        {[20, 182].map((x) => (
          <g key={x}>
            <rect x={x} y={96} width={48} height={44} rx={6} fill="#bae6fd" stroke="#92400e" strokeWidth={3} />
            <path d={`M${x + 24} 96 V140 M${x} 118 H${x + 48}`} stroke="#92400e" strokeWidth={2} />
          </g>
        ))}
        <rect x={100} y={96} width={50} height={84} rx={6} fill="#92400e" />
        <circle cx={140} cy={140} r={3} fill="#fde68a" />
      </g>
      {/* kural tabelası */}
      {board && (
        <g transform="translate(500 58)">
          <rect x={58} y={70} width={8} height={170} fill="#64748b" />
          <rect x={0} y={0} width={124} height={78} rx={12} fill="#065f46" stroke="#fbbf24" strokeWidth={4} />
          {board.map((l, i) => (
            <text key={i} x={62} y={board.length === 1 ? 46 : 32 + i * 26} textAnchor="middle" fontSize={Math.max(...board.map((x) => x.length)) > 11 ? 16 : 19} fontWeight={900} fill="#ecfdf5">
              {l}
            </text>
          ))}
        </g>
      )}
    </g>
  )
}

export function RailScene({ items, plate, board, pos, anim, moving, happy, variant }: {
  items: TrainItem[]
  plate: string
  board?: string[]
  pos: 'right' | 'home' | 'left'
  anim: boolean
  moving: boolean
  happy: boolean
  variant: number
}) {
  const [motion] = useState(() => !reduced())
  const n = items.length
  const total = LOCO_W + GAP + n * (WAG_W + GAP)
  const s = Math.min(1.28, (SW - TRAIN_X - 22) / total)
  const dx = pos === 'right' ? SW + 40 - TRAIN_X : pos === 'left' ? -(total * s + TRAIN_X + 40) : 0
  const sky = ['#bae6fd', '#c7d2fe', '#fed7aa'][variant % 3]
  const ariaTrain = items.map((it, i) => (it.car ? it.label ?? `${i + 1}. vagon` : it.plus ? '' : `${i + 1}. boş yuva`)).filter(Boolean).join(', ')

  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} className="block h-auto w-full select-none" role="img" aria-label={`Lokomotif: ${plate}. Tren: ${ariaTrain || 'vagon yok'}.`}>
      <defs>
        <linearGradient id="tren-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky} />
          <stop offset="1" stopColor="#f0f9ff" />
        </linearGradient>
        <linearGradient id="tren-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="tren-mount" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8a29e" />
          <stop offset="1" stopColor="#78716c" />
        </linearGradient>
        <clipPath id="tren-clip">
          <rect x={118} y={0} width={SW} height={SH} />
          <path d={`M36 ${RAIL_Y + 30} L36 238 C 36 196, 118 196, 118 238 L118 ${RAIL_Y + 30} Z`} />
        </clipPath>
      </defs>
      <style>{`
        .tren-cloud{animation:tren-drift linear infinite alternate}
        @keyframes tren-drift{from{transform:translateX(-30px)}to{transform:translateX(40px)}}
        .tren-spin{animation:tren-rot .5s linear infinite;transform-box:fill-box;transform-origin:center}
        @keyframes tren-rot{to{transform:rotate(-360deg)}}
        .tren-steam{animation:tren-puff 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:left bottom}
        .tren-steam-fast{animation:tren-puff .7s ease-in-out infinite;transform-box:fill-box;transform-origin:left bottom}
        @keyframes tren-puff{0%,100%{transform:translateY(0) scale(1);opacity:.9}50%{transform:translateY(-6px) scale(1.08);opacity:.6}}
        .tren-blink{animation:tren-blk 4s infinite;transform-box:fill-box;transform-origin:center}
        @keyframes tren-blk{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
        .tren-wobble{animation:tren-wob .5s ease-in-out 2;transform-box:fill-box;transform-origin:center bottom}
        @keyframes tren-wob{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
        .tren-fresh{animation:tren-in .45s cubic-bezier(.34,1.56,.64,1)}
        @keyframes tren-in{from{transform:translateX(26px);opacity:.3}to{transform:none;opacity:1}}
        .tren-slot{transition:stroke .15s,fill .15s}
        [data-over] .tren-slot{stroke:#0ea5e9;fill:rgba(14,165,233,.18)}
        .tren-bob{animation:tren-bob .35s ease-in-out infinite alternate}
        @keyframes tren-bob{to{transform:translateY(-2px)}}
        .tren-tap{cursor:pointer}
        .tren-tap:focus{outline:none}
        .tren-tap:focus-visible .tren-focus{stroke:#0ea5e9;stroke-width:5}
        @media (prefers-reduced-motion: reduce){.tren-cloud,.tren-spin,.tren-steam,.tren-steam-fast,.tren-blink,.tren-wobble,.tren-fresh,.tren-bob{animation:none}}
      `}</style>

      {/* gökyüzü */}
      <rect width={SW} height={SH} fill="url(#tren-sky)" />
      <g transform="translate(880 64)">
        <circle r={38} fill="#fde047" opacity={0.35} />
        <circle r={28} fill="#facc15" />
      </g>
      <Cloud x={230} y={60} s={1} d={9} />
      <Cloud x={520} y={40} s={0.8} d={12} />
      <Cloud x={760} y={92} s={0.6} d={10} />

      {/* uzak tepeler */}
      <path d="M0 250 C 120 170, 230 200, 330 220 C 430 160, 560 170, 660 225 C 760 180, 880 170, 1000 220 L1000 330 L0 330 Z" fill="#bbf7d0" />
      <path d="M0 280 C 160 220, 300 250, 420 262 C 560 230, 700 250, 820 266 C 900 250, 960 252, 1000 258 L1000 330 L0 330 Z" fill="url(#tren-hill)" />
      <Tree x={300} y={262} s={0.9} />
      <Tree x={345} y={268} s={0.7} c="#16a34a" />
      <Tree x={470} y={262} s={0.8} c="#15803d" />
      <Tree x={975} y={262} s={0.85} c="#16a34a" />

      <Station board={board} />

      {/* peron */}
      <rect x={150} y={294} width={SW - 150} height={16} fill="#d6d3d1" />
      <rect x={150} y={292} width={SW - 150} height={4} fill="#facc15" />
      {/* tünelin dağı (arka) ve karanlık ağız */}
      <path d="M-30 390 L-30 120 C 10 70, 90 80, 130 150 C 160 200, 170 280, 186 390 Z" fill="url(#tren-mount)" />
      <path d="M-30 150 C 0 110, 60 100, 96 128 C 70 120, 30 130, -30 170 Z" fill="#f8fafc" opacity={0.9} />
      <path d={`M36 ${RAIL_Y + 6} L36 238 C 36 196, 118 196, 118 238 L118 ${RAIL_Y + 6} Z`} fill="#0f172a" />

      {/* ray */}
      <rect x={0} y={RAIL_Y - 2} width={SW} height={30} fill="#a8a29e" />
      {Array.from({ length: 34 }, (_, i) => (
        <rect key={i} x={i * 30 + 4} y={RAIL_Y + 2} width={18} height={14} rx={2} fill="#78350f" opacity={0.85} />
      ))}
      <rect x={0} y={RAIL_Y} width={SW} height={5} rx={2} fill="#64748b" />
      <rect x={0} y={RAIL_Y + 12} width={SW} height={4} rx={2} fill="#94a3b8" opacity={0.7} />

      {/* tren */}
      <g clipPath="url(#tren-clip)">
        <g style={{ transform: `translateX(${dx}px)`, transition: anim && motion ? 'transform 2.3s cubic-bezier(.45,.05,.35,1)' : 'none' }}>
          <g transform={`translate(${TRAIN_X} ${RAIL_Y}) scale(${s}) translate(0 ${-BASE})`}>
            <g className={moving && motion ? 'tren-bob' : ''}>
              <Loco plate={plate} spin={moving} happy={happy} blink />
            </g>
            {items.map((it, i) => {
              const x = LOCO_W + GAP + i * (WAG_W + GAP)
              const tappable = !!it.onTap
              return (
                <g key={it.key} transform={`translate(${x} 0)`}>
                  {/* bağlantı */}
                  {!it.plus && <rect x={-GAP - 4} y={92} width={GAP + 10} height={6} rx={3} fill="#475569" />}
                  <g
                    data-drop={it.drop}
                    data-handle={tappable ? '' : undefined}
                    role={tappable ? 'button' : undefined}
                    tabIndex={tappable ? 0 : undefined}
                    aria-label={it.label}
                    className={`${tappable ? 'tren-tap' : ''}`}
                    onClick={it.onTap}
                    onKeyDown={(e) => {
                      if (tappable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        it.onTap!()
                      }
                    }}
                  >
                    <rect x={-4} y={-30} width={WAG_W + 8} height={BASE + 34} fill="transparent" />
                    <g className={`${it.flagged ? 'tren-wobble' : ''} ${it.fresh ? 'tren-fresh' : ''}`}>
                      {it.car ? (
                        <WagonBody color={it.car.color} spin={moving}>
                          <WagonRep rep={it.car.rep} />
                        </WagonBody>
                      ) : (
                        <WagonBody color={0} ghost>
                          <text x={WAG_W / 2} y={66} textAnchor="middle" fontSize={it.plus ? 46 : 50} fontWeight={900} fill={it.selected ? '#0284c7' : '#64748b'}>
                            {it.plus ? '+' : '?'}
                          </text>
                        </WagonBody>
                      )}
                      {it.selected && <rect x={0} y={4} width={WAG_W} height={96} rx={14} fill="none" stroke="#0ea5e9" strokeWidth={5} />}
                      <rect className="tren-focus" x={0} y={4} width={WAG_W} height={96} rx={14} fill="none" stroke="transparent" strokeWidth={0} />
                    </g>
                    {it.tag && (
                      <g transform={`translate(${WAG_W / 2} -19)`}>
                        <rect x={-Math.min(WAG_W / 2 + 4, Math.max(28, it.tag.length * 8.6 + 6))} y={-17} width={Math.min(WAG_W + 8, Math.max(56, it.tag.length * 17.2 + 12))} height={34} rx={17} fill={it.fixed ? '#1e3a8a' : '#fff'} stroke="#1e3a8a" strokeWidth={2.5} />
                        <text y={7} textAnchor="middle" fontSize={20} fontWeight={900} fill={it.fixed ? '#fff' : '#1e3a8a'}>{it.tag}</text>
                      </g>
                    )}
                    {it.flagged && (
                      <g transform={`translate(${WAG_W - 14} 8)`}>
                        <circle r={17} fill="#f59e0b" stroke="#fff" strokeWidth={3} />
                        <text y={7} textAnchor="middle" fontSize={21} fontWeight={900} fill="#fff">?</text>
                      </g>
                    )}
                    {it.good && (
                      <g transform={`translate(${WAG_W - 14} 8)`}>
                        <circle r={15} fill="#22c55e" stroke="#fff" strokeWidth={3} />
                        <path d="M-6 0 L-2 5 L7 -5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </g>
                    )}
                  </g>
                </g>
              )
            })}
          </g>
        </g>
      </g>

      {/* tünel taş çerçevesi (trenin önünde) */}
      <path d={`M24 ${RAIL_Y + 6} L24 236 C 24 182, 130 182, 130 236 L130 ${RAIL_Y + 6}`} fill="none" stroke="#57534e" strokeWidth={16} strokeLinejoin="round" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = Math.PI - (i * Math.PI) / 6
        const cx = 77 + Math.cos(a) * 53
        const cy = 236 - Math.sin(a) * 46
        return <rect key={i} x={cx - 7} y={cy - 7} width={14} height={14} rx={3} fill="#a8a29e" stroke="#57534e" strokeWidth={2} transform={`rotate(${(-a * 180) / Math.PI + 90} ${cx} ${cy})`} />
      })}

      {/* ön çimen */}
      <path d={`M0 ${SH} L0 ${RAIL_Y + 26} C 200 ${RAIL_Y + 20}, 400 ${RAIL_Y + 30}, 600 ${RAIL_Y + 24} C 800 ${RAIL_Y + 18}, 900 ${RAIL_Y + 28}, ${SW} ${RAIL_Y + 22} L${SW} ${SH} Z`} fill="#4ade80" />
      {[210, 380, 455, 640, 700, 860, 930].map((x, i) => (
        <g key={x} transform={`translate(${x} ${RAIL_Y + 42 + (i % 3) * 5})`}>
          <circle r={5} fill={['#f472b6', '#facc15', '#fb7185', '#a78bfa'][i % 4]} />
          <circle r={2} fill="#fff7ed" />
        </g>
      ))}
    </svg>
  )
}
