import { ZoomBox } from '../../../interactive/ZoomBox'

/**
 * Labirent haritası: 7 oda, 6 kapı. Açılan kapılar ışıldar, kâşif bir sonraki odaya yürür.
 * <ZoomBox> içinde: iki parmakla yakınlaştırılabilir.
 */
const ROOMS = [
  { x: 70, y: 70 },
  { x: 240, y: 70 },
  { x: 410, y: 70 },
  { x: 570, y: 70 },
  { x: 570, y: 220 },
  { x: 390, y: 220 },
  { x: 200, y: 220 },
]

export function DungeonMap({ doors, opened, current, dark }: { doors: number; opened: number; current: number; dark: boolean }) {
  const rooms = ROOMS.slice(0, doors + 1)
  const me = rooms[Math.min(opened, rooms.length - 1)]
  const c = dark
    ? { bg: '#0b1120', corridor: '#1e293b', room: '#273449', roomEdge: '#475569', floor: '#2f3e57', door: '#7c4a1e', gold: '#fbbf24', text: '#e2e8f0' }
    : { bg: '#d8bc86', corridor: '#b8925a', room: '#f1dfb8', roomEdge: '#a07a43', floor: '#ead3a3', door: '#7c4a1e', gold: '#b45309', text: '#5b3a12' }
  return (
    <ZoomBox maxScale={3} className="rounded-2xl">
      <svg viewBox="0 0 640 300" className="block h-auto w-full" role="img" aria-label={`Labirent haritası: ${opened} kapı açıldı`}>
        <defs>
          <pattern id={`dkFloor${dark ? 'd' : 'l'}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill={c.room} />
            <path d="M0 0 H16 M0 8 H16 M8 0 V8 M0 8 V16" stroke={c.floor} strokeWidth="1.2" />
          </pattern>
          <radialGradient id="dkTorch">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="640" height="300" fill={c.bg} />
        {dark && Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 137) % 640} cy={(i * 71) % 300} r={1} fill="#334155" />)}
        {/* koridorlar */}
        {rooms.slice(1).map((r, i) => {
          const a = rooms[i]
          return <line key={i} x1={a.x} y1={a.y} x2={r.x} y2={r.y} stroke={i < opened ? (dark ? '#3b4f6e' : '#caa46a') : c.corridor} strokeWidth={26} strokeLinecap="round" />
        })}
        {/* odalar */}
        {rooms.map((r, i) => (
          <g key={i}>
            <rect x={r.x - 52} y={r.y - 40} width={104} height={80} rx={10} fill={`url(#dkFloor${dark ? 'd' : 'l'})`} stroke={c.roomEdge} strokeWidth={3} opacity={i <= opened ? 1 : 0.55} />
            {i <= opened && <circle cx={r.x - 40} cy={r.y - 28} r={16} fill="url(#dkTorch)" className="dk-flicker" />}
            {i === rooms.length - 1 && (
              <g transform={`translate(${r.x + 22} ${r.y + 6})`}>
                <rect x={-14} y={-8} width={28} height={18} rx={3} fill="#a16207" stroke="#451a03" strokeWidth={1.5} />
                <path d="M-14 -8 Q0 -20 14 -8 Z" fill="#ca8a04" stroke="#451a03" strokeWidth={1.5} />
                <rect x={-3} y={-4} width={6} height={7} fill={c.gold} />
                {opened >= doors && <circle r={26} fill="url(#dkTorch)" className="dk-flicker" />}
              </g>
            )}
          </g>
        ))}
        {/* kapılar */}
        {rooms.slice(1).map((r, i) => {
          const a = rooms[i]
          const mx = (a.x + r.x) / 2, my = (a.y + r.y) / 2
          const vertical = Math.abs(a.x - r.x) < 1
          const open = i < opened
          const cur = i === current && !open
          return (
            <g key={i} transform={`translate(${mx} ${my}) rotate(${vertical ? 90 : 0})`}>
              {cur && <circle r={24} fill="none" stroke={c.gold} strokeWidth={3} className="dk-pulse" />}
              {open ? (
                <>
                  <rect x={-5} y={-16} width={10} height={32} fill="#fde68a" opacity={0.85} />
                  <rect x={-9} y={-18} width={4} height={36} fill={c.door} />
                </>
              ) : (
                <>
                  <rect x={-8} y={-17} width={16} height={34} rx={3} fill={c.door} stroke="#3b1d08" strokeWidth={1.5} />
                  <circle r={4} fill={c.gold} />
                </>
              )}
              <g transform={`rotate(${vertical ? -90 : 0})`}>
                <text y={vertical ? 4 : -24} x={vertical ? 26 : 0} textAnchor="middle" fontSize={12} fontWeight={900} fill={c.text}>{i + 1}</text>
              </g>
            </g>
          )
        })}
        {/* kâşif */}
        <g style={{ transform: `translate(${me.x}px, ${me.y}px)`, transition: 'transform 1.2s cubic-bezier(.45,.05,.3,1)' }}>
          <circle r={22} fill="url(#dkTorch)" className="dk-flicker" />
          <circle r={11} fill="#4f46e5" stroke="#fff" strokeWidth={3} />
          <path d="M-4 -2 L0 -8 L4 -2 Z" fill="#fff" />
          <circle cx={0} cy={2} r={2.5} fill="#fff" />
        </g>
      </svg>
    </ZoomBox>
  )
}
