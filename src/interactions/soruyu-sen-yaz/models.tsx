import { VisualView } from '../../components/Visual'
import { MathText } from '../../components/MathText'
import type { Model } from './tasks'

const INK = '#1f2340'
const PINK = '#d6457a'
const SOFT = '#fde3ec'

/** Görevdeki modeli çizer. `emoji`: 1–2. sınıf resim modelleri seçilen nesneyle çizilir. */
export function ModelView({ m, emoji, big }: { m: Model; emoji: string; big?: boolean }) {
  const em = big ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
  switch (m.k) {
    case 'join':
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Group n={m.a} emoji={emoji} cls={em} />
          <span className="text-3xl font-black text-ink-soft">+</span>
          <Group n={m.b} emoji={emoji} cls={em} />
        </div>
      )
    case 'take':
      return (
        <div className={`mx-auto flex max-w-[22rem] flex-wrap justify-center gap-1 ${em}`} aria-label={`${m.a} nesneden ${m.b} tanesi ayrılıyor`}>
          {Array.from({ length: m.a }, (_, i) => {
            const gone = i >= m.a - m.b
            return (
              <span key={i} className={`relative ${gone ? 'opacity-35' : ''}`}>
                {emoji}
                {gone && <span className="absolute inset-0 grid place-items-center text-xl font-black text-rose-600">✕</span>}
              </span>
            )
          })}
        </div>
      )
    case 'groups':
      return (
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: m.n }, (_, i) => <Group key={i} n={m.each} emoji={emoji} cls={em} />)}
        </div>
      )
    case 'vis':
      return <VisualView v={m.v} size="lg" zoom={false} />
    case 'frac':
      return <FracBar {...m} />
    case 'rect':
      return <Rect {...m} />
    case 'tri':
      return <Tri {...m} />
    case 'line':
      return <LineGraph {...m} />
    case 'dline':
      return <DoubleLine {...m} />
    case 'square':
      return (
        <div className="flex justify-center py-2">
          <div className="relative grid size-40 place-items-center rounded-md border-4 border-[#d6457a] bg-[#fde3ec] sm:size-44">
            <span className="text-lg font-black text-ink"><MathText text={m.inside} /></span>
            <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-lg font-black whitespace-nowrap text-ink"><MathText text={m.side} /></span>
            <span className="absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2 text-lg font-black whitespace-nowrap text-ink"><MathText text={m.side} /></span>
          </div>
          <span className="h-10" />
        </div>
      )
  }
}

function Group({ n, emoji, cls }: { n: number; emoji: string; cls: string }) {
  return (
    <div className={`flex max-w-[11rem] flex-wrap justify-center gap-0.5 rounded-2xl bg-paper p-2 ring-1 ring-line ${cls}`} aria-label={`${n} tane`}>
      {Array.from({ length: n }, (_, i) => <span key={i}>{emoji}</span>)}
    </div>
  )
}

function FracBar({ den, num, whole, part }: { den: number; num: number; whole: string; part: string }) {
  const W = 320, L = 10, bw = W - 2 * L, cw = bw / den
  const pw = cw * num
  return (
    <svg viewBox={`0 0 ${W} 124`} className="mx-auto block w-full max-w-[460px]" role="img" aria-label={`Bütün ${whole}; ${den} eş parçanın ${num} tanesi: ${part}`}>
      <path d={`M${L} 30 v-8 h${bw} v8`} fill="none" stroke={INK} strokeWidth={1.6} />
      <text x={W / 2} y={16} textAnchor="middle" fontSize={15} fontWeight={900} fill={whole === '?' ? PINK : INK}>{whole}</text>
      {Array.from({ length: den }, (_, i) => (
        <rect key={i} x={L + i * cw} y={36} width={cw} height={40} fill={i < num ? '#a7d3ab' : '#fff'} stroke={INK} strokeWidth={2} />
      ))}
      <path d={`M${L} 82 v8 h${pw} v-8`} fill="none" stroke={INK} strokeWidth={1.6} />
      <text x={L + pw / 2} y={110} textAnchor="middle" fontSize={15} fontWeight={900} fill={part === '?' ? PINK : INK}>{part}</text>
    </svg>
  )
}

function Rect({ w, h, grid, edge, inside, wl, hl }: { w: number; h: number; grid?: boolean; edge?: boolean; inside: string; wl: string; hl: string }) {
  const u = Math.min(30, 240 / Math.max(w, h))
  const RW = w * u, RH = h * u
  const W = RW + 70, H = RH + 52
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[420px]" role="img" aria-label={`${wl} ve ${hl} kenarlı dikdörtgen`}>
      <g transform="translate(56 10)">
        <rect width={RW} height={RH} fill={SOFT} stroke={edge ? '#f97316' : PINK} strokeWidth={edge ? 6 : 3} />
        {grid && Array.from({ length: w - 1 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * u} x2={(i + 1) * u} y1={0} y2={RH} stroke={PINK} strokeOpacity={0.45} />)}
        {grid && Array.from({ length: h - 1 }, (_, i) => <line key={`h${i}`} y1={(i + 1) * u} y2={(i + 1) * u} x1={0} x2={RW} stroke={PINK} strokeOpacity={0.45} />)}
        <rect x={RW / 2 - 66} y={RH / 2 - 15} width={132} height={30} rx={8} fill="#fff" fillOpacity={0.92} />
        <text x={RW / 2} y={RH / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={900} fill={INK}>{inside}</text>
        <text x={RW / 2} y={RH + 26} textAnchor="middle" fontSize={15} fontWeight={900} fill={INK}>{wl}</text>
        <text x={-8} y={RH / 2 + 5} textAnchor="end" fontSize={15} fontWeight={900} fill={hl === '?' ? PINK : INK}>{hl}</text>
      </g>
    </svg>
  )
}

function Tri({ a, b, c }: { a: string; b: string; c: string }) {
  // dik kenarlar: a (yatay, 6), b (dikey, 8)
  const x0 = 50, y0 = 180, sx = 26
  const ax = x0 + 6 * sx, by = y0 - 8 * 20
  return (
    <svg viewBox="0 0 260 210" className="mx-auto block w-full max-w-[300px]" role="img" aria-label={`Dik kenarları ${a} ve ${b}, hipotenüsü ${c} olan dik üçgen`}>
      <polygon points={`${x0},${y0} ${ax},${y0} ${x0},${by}`} fill={SOFT} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d={`M${x0 + 16} ${y0} v-16 h-16`} fill="none" stroke="#f97316" strokeWidth={2.5} />
      <text x={(x0 + ax) / 2} y={y0 + 22} textAnchor="middle" fontSize={17} fontWeight={900} fill={INK}>{a}</text>
      <text x={x0 - 12} y={(y0 + by) / 2 + 6} textAnchor="end" fontSize={17} fontWeight={900} fill={INK}>{b}</text>
      <text x={(ax + x0) / 2 + 20} y={(y0 + by) / 2 - 2} textAnchor="middle" fontSize={20} fontWeight={900} fill={PINK}>{c}</text>
    </svg>
  )
}

function LineGraph({ y0, x0, xl, yl }: { y0: number; x0: number; xl: string; yl: string }) {
  const L = 44, T = 14, W = 300, H = 200, PW = W - L - 16, PH = H - T - 36
  const X = (x: number) => L + (x / (x0 + 2)) * PW
  const Y = (y: number) => T + PH - (y / (y0 + 5)) * PH
  const xt = Array.from({ length: Math.floor((x0 + 2) / 2) + 1 }, (_, i) => i * 2)
  const yt = Array.from({ length: Math.floor(y0 / 10) + 1 }, (_, i) => i * 10)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[440px]" role="img" aria-label={`${y0}’dan başlayıp azalan doğru`}>
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={L} x2={L + PW} y1={Y(v)} y2={Y(v)} stroke="#e2e8f0" />
          <text x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#64748b">{v}</text>
        </g>
      ))}
      {xt.map((v) => (
        <g key={`x${v}`}>
          <line x1={X(v)} x2={X(v)} y1={T} y2={T + PH} stroke="#e2e8f0" />
          {v !== x0 && <text x={X(v)} y={T + PH + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill="#64748b">{v}</text>}
        </g>
      ))}
      <line x1={L} x2={L + PW} y1={T + PH} y2={T + PH} stroke={INK} strokeWidth={1.8} />
      <line x1={L} x2={L} y1={T} y2={T + PH} stroke={INK} strokeWidth={1.8} />
      <line x1={X(0)} y1={Y(y0)} x2={X(x0)} y2={Y(0)} stroke="#2563eb" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={X(0)} cy={Y(y0)} r={5} fill="#2563eb" />
      <circle cx={X(x0)} cy={Y(0)} r={7} fill={PINK} stroke="#fff" strokeWidth={2} />
      <rect x={X(x0) - 12} y={T + PH + 4} width={24} height={18} rx={4} fill="#fff" stroke={PINK} strokeWidth={2} strokeDasharray="3 2" />
      <text x={X(x0)} y={T + PH + 17} textAnchor="middle" fontSize={13} fontWeight={900} fill={PINK}>?</text>
      <text x={L + PW} y={H - 2} textAnchor="end" fontSize={12} fontWeight={800} fill={INK}>{xl} (x)</text>
      <text x={4} y={T - 2} fontSize={12} fontWeight={800} fill={INK}>{yl} (y)</text>
    </svg>
  )
}

function DoubleLine({ top, bot }: { top: string[]; bot: string[] }) {
  const W = 320, L = 24, R = W - 24
  const xs = top.map((t, i) => (i === 0 ? L : L + ((R - L) * Number(t)) / Number(top[top.length - 1]) * 0.92))
  return (
    <svg viewBox={`0 0 ${W} 120`} className="mx-auto block w-full max-w-[460px]" role="img" aria-label="Çift sayı doğrusu">
      <line x1={L - 8} x2={R + 8} y1={42} y2={42} stroke={INK} strokeWidth={2.5} />
      <line x1={L - 8} x2={R + 8} y1={82} y2={82} stroke={INK} strokeWidth={2.5} />
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} x2={x} y1={34} y2={50} stroke={INK} strokeWidth={2} />
          <line x1={x} x2={x} y1={74} y2={90} stroke={INK} strokeWidth={2} />
          <text x={x} y={26} textAnchor="middle" fontSize={16} fontWeight={900} fill={INK}>{top[i]}</text>
          <text x={x} y={110} textAnchor="middle" fontSize={16} fontWeight={900} fill={bot[i] === '?' ? PINK : INK}>{bot[i]}</text>
          {i > 0 && <line x1={x} x2={x} y1={50} y2={74} stroke="#94a3b8" strokeDasharray="3 3" />}
        </g>
      ))}
    </svg>
  )
}
