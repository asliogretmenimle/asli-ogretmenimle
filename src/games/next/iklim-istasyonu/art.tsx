import type { ReactNode } from 'react'
import type { Ink } from './ui'
import { f } from './ui'

/* ───────────── Hava türleri ───────────── */

export type Wx = 'gunesli' | 'bulutlu' | 'yagmurlu' | 'karli'
export const WX: Record<Wx, { label: string; color: string; dark: string; short: string }> = {
  gunesli: { label: 'Güneşli', color: '#f59e0b', dark: '#fbbf24', short: 'güneşli' },
  bulutlu: { label: 'Bulutlu', color: '#64748b', dark: '#a3b4c8', short: 'bulutlu' },
  yagmurlu: { label: 'Yağmurlu', color: '#0284c7', dark: '#38bdf8', short: 'yağmurlu' },
  karli: { label: 'Karlı', color: '#7c3aed', dark: '#a78bfa', short: 'karlı' },
}
export const wxColor = (w: Wx, dark: boolean) => (dark ? WX[w].dark : WX[w].color)

/** Hava simgesi (SVG). x,y verilirse SVG içinde konumlanır. */
export function WxIcon({ w, size = 28, x, y }: { w: Wx; size?: number; x?: number; y?: number }) {
  const inner = (
    <>
      {w === 'gunesli' && (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <line key={i} x1={20 + Math.cos(a) * 12} y1={20 + Math.sin(a) * 12} x2={20 + Math.cos(a) * 17} y2={20 + Math.sin(a) * 17} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
          })}
          <circle cx={20} cy={20} r={9} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
        </g>
      )}
      {w !== 'gunesli' && (
        <g>
          <path d="M10 25a7 7 0 0 1 2-13.6A9.5 9.5 0 0 1 30 12a6.5 6.5 0 0 1 1 13z" fill={w === 'bulutlu' ? '#cbd5e1' : w === 'karli' ? '#e0e7ff' : '#94a3b8'} stroke={w === 'bulutlu' ? '#64748b' : w === 'karli' ? '#7c3aed' : '#475569'} strokeWidth={2} strokeLinejoin="round" />
          {w === 'bulutlu' && <path d="M15 16a6 6 0 0 1 8-3" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />}
          {w === 'yagmurlu' && [12, 19, 26].map((x0, i) => <line key={i} x1={x0} y1={29} x2={x0 - 2.5} y2={36} stroke="#0284c7" strokeWidth={2.6} strokeLinecap="round" />)}
          {w === 'karli' &&
            [12, 20, 28].map((x0, i) => (
              <g key={i} transform={`translate(${x0} ${32 + (i % 2) * 2})`} stroke="#7c3aed" strokeWidth={1.8} strokeLinecap="round">
                <line x1={-3} y1={0} x2={3} y2={0} />
                <line x1={-1.5} y1={-2.6} x2={1.5} y2={2.6} />
                <line x1={1.5} y1={-2.6} x2={-1.5} y2={2.6} />
              </g>
            ))}
        </g>
      )}
    </>
  )
  if (x !== undefined && y !== undefined)
    return (
      <g transform={`translate(${x} ${y}) scale(${size / 40})`} aria-hidden>
        {inner}
      </g>
    )
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="shrink-0">
      {inner}
    </svg>
  )
}

/* ───────────── Türkiye haritası (stilize) ───────────── */

const PX = (lon: number) => (lon - 25.6) * 52.5
const PY = (lat: number) => (42.4 - lat) * 66
const poly = (pts: [number, number][]) => 'M' + pts.map(([lo, la]) => `${PX(lo).toFixed(1)} ${PY(la).toFixed(1)}`).join('L') + 'Z'

const ANATOLIA: [number, number][] = [
  [29.1, 41.22], [29.9, 41.15], [30.6, 41.12], [31.4, 41.3], [32.3, 41.72], [33.3, 41.98], [34.3, 41.98], [35.1, 42.05], [35.5, 41.7], [36.0, 41.7], [36.35, 41.3],
  [37.0, 41.2], [37.9, 41.05], [38.4, 40.92], [39.4, 41.08], [40.2, 40.95], [40.9, 41.2], [41.5, 41.5], [42.5, 41.55], [43.2, 41.25], [43.5, 40.95], [43.7, 40.5],
  [43.6, 40.15], [44.2, 40.0], [44.8, 39.7], [44.4, 39.4], [44.15, 39.0], [44.3, 38.4], [44.4, 37.85], [44.8, 37.3], [44.6, 37.15], [43.6, 37.25], [42.8, 37.35],
  [42.3, 37.15], [41.2, 37.08], [40.0, 36.85], [38.8, 36.72], [38.0, 36.85], [37.0, 36.65], [36.6, 36.82], [36.65, 36.25], [36.4, 35.85], [35.95, 35.95],
  [35.95, 36.35], [36.15, 36.62], [35.85, 36.85], [35.5, 36.6], [34.9, 36.75], [34.1, 36.3], [33.6, 36.15], [32.8, 36.05], [32.0, 36.5], [31.4, 36.8], [30.7, 36.88],
  [30.55, 36.5], [30.4, 36.25], [29.7, 36.15], [29.1, 36.4], [28.6, 36.75], [28.0, 36.6], [27.4, 36.95], [27.3, 37.4], [27.15, 37.8], [26.6, 38.2], [26.4, 38.45],
  [27.0, 38.45], [26.75, 38.75], [26.7, 39.25], [26.1, 39.5], [26.15, 39.95], [26.45, 40.25], [27.3, 40.4], [27.9, 40.38], [28.9, 40.4], [29.3, 40.72], [29.0, 40.95],
]
const THRACE: [number, number][] = [
  [26.05, 40.72], [26.2, 40.45], [26.18, 40.05], [26.4, 40.2], [26.68, 40.42], [27.5, 40.97], [27.95, 40.97], [28.25, 41.07], [28.98, 41.0], [29.05, 41.22],
  [28.7, 41.35], [28.1, 41.63], [27.97, 41.88], [28.03, 41.98], [27.4, 42.08], [26.6, 41.98], [26.35, 41.75], [26.6, 41.35], [26.32, 40.95],
]
const MAP_D = poly(ANATOLIA) + poly(THRACE)

export interface City {
  id: string
  name: string
  lon: number
  lat: number
}
export const CITIES: Record<string, City> = {
  istanbul: { id: 'istanbul', name: 'İstanbul', lon: 28.98, lat: 41.01 },
  ankara: { id: 'ankara', name: 'Ankara', lon: 32.85, lat: 39.93 },
  izmir: { id: 'izmir', name: 'İzmir', lon: 27.14, lat: 38.42 },
  antalya: { id: 'antalya', name: 'Antalya', lon: 30.71, lat: 36.89 },
  trabzon: { id: 'trabzon', name: 'Trabzon', lon: 39.72, lat: 41.0 },
  erzurum: { id: 'erzurum', name: 'Erzurum', lon: 41.27, lat: 39.9 },
  van: { id: 'van', name: 'Van', lon: 43.38, lat: 38.5 },
  diyarbakir: { id: 'diyarbakir', name: 'Diyarbakır', lon: 40.22, lat: 37.91 },
  kars: { id: 'kars', name: 'Kars', lon: 43.1, lat: 40.6 },
  rize: { id: 'rize', name: 'Rize', lon: 40.52, lat: 41.02 },
  konya: { id: 'konya', name: 'Konya', lon: 32.48, lat: 37.87 },
  samsun: { id: 'samsun', name: 'Samsun', lon: 36.33, lat: 41.29 },
  edirne: { id: 'edirne', name: 'Edirne', lon: 26.56, lat: 41.68 },
  adana: { id: 'adana', name: 'Adana', lon: 35.33, lat: 37.0 },
}

/** Sıcaklığa göre pin rengi (soğuk: mavi-mor, sıcak: turuncu-kırmızı) */
export function tempColor(t: number) {
  if (t <= -10) return '#6d28d9'
  if (t <= -5) return '#4f46e5'
  if (t < 0) return '#0284c7'
  if (t < 5) return '#0d9488'
  if (t < 10) return '#d97706'
  return '#dc2626'
}

export function TurkeyMap({ ink, pins, sel = [], hl = [], onPick, showAll = true }: { ink: Ink; pins: { id: string; t?: number; text?: string }[]; sel?: string[]; hl?: string[]; onPick?: (id: string) => void; showAll?: boolean }) {
  const dark = ink.dark
  return (
    <svg viewBox="-10 -14 1020 450" width="100%" role="img" aria-label="Türkiye haritası ve istasyonlar" className="block">
      <defs>
        <linearGradient id="ii-sea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={dark ? '#0b1a33' : '#dbeefe'} />
          <stop offset="1" stopColor={dark ? '#0a1428' : '#e8f4ff'} />
        </linearGradient>
        <linearGradient id="ii-land" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={dark ? '#1d2b45' : '#e9f5df'} />
          <stop offset="1" stopColor={dark ? '#18243a' : '#d9ecc9'} />
        </linearGradient>
      </defs>
      <rect x={-10} y={-14} width={1020} height={450} rx={26} fill="url(#ii-sea)" />
      <text x={330} y={18} fontSize={20} fontStyle="italic" fontWeight={700} fill={dark ? '#3b5277' : '#7fb0d6'}>Karadeniz</text>
      <text x={330} y={420} fontSize={20} fontStyle="italic" fontWeight={700} fill={dark ? '#3b5277' : '#7fb0d6'}>Akdeniz</text>
      <text x={-2} y={300} fontSize={18} fontStyle="italic" fontWeight={700} fill={dark ? '#3b5277' : '#7fb0d6'}>Ege</text>
      <path d={MAP_D} fill="url(#ii-land)" stroke={dark ? '#4b6a96' : '#8fbf74'} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={PX(42.9)} cy={PY(38.65)} rx={26} ry={20} fill={dark ? '#0b1a33' : '#bfe0fb'} stroke={dark ? '#4b6a96' : '#8fbf74'} strokeWidth={2} />
      <ellipse cx={PX(33.4)} cy={PY(38.75)} rx={14} ry={20} fill={dark ? '#20304b' : '#f6f2e4'} stroke={dark ? '#4b6a96' : '#c9c19e'} strokeWidth={1.5} />
      {pins.map((p) => {
        const c = CITIES[p.id]
        if (!c) return null
        const x = PX(c.lon), y = PY(c.lat)
        const on = sel.includes(p.id)
        const lit = hl.includes(p.id)
        const col = p.t !== undefined ? tempColor(p.t) : ink.accent
        const label = p.text ?? (p.t !== undefined ? `${f(p.t)}°` : '')
        const lw = Math.max(54, label.length * 18 + 16)
        const above = y > 70
        return (
          <g key={p.id} onClick={onPick ? () => onPick(p.id) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }} role={onPick ? 'button' : undefined} aria-label={`${c.name}${p.t !== undefined ? ` ${f(p.t)} derece` : ''}`} aria-pressed={onPick ? on : undefined}>
            {onPick && <circle cx={x} cy={y} r={40} fill="transparent" />}
            {(on || lit) && <circle cx={x} cy={y} r={24} fill="none" stroke={on ? (dark ? '#22d3ee' : '#0891b2') : '#f59e0b'} strokeWidth={4} className="ii-ping" />}
            <circle cx={x} cy={y} r={on ? 12 : 9} fill={col} stroke="#fff" strokeWidth={3} />
            {showAll && label && (
              <g transform={`translate(${x} ${above ? y - 52 : y + 18})`}>
                <rect x={-lw / 2} y={0} width={lw} height={36} rx={12} fill={on ? (dark ? '#22d3ee' : '#0891b2') : dark ? '#0f172a' : '#fff'} stroke={col} strokeWidth={2.5} />
                <text x={0} y={27} textAnchor="middle" fontSize={26} fontWeight={900} fill={on ? (dark ? '#0b1324' : '#fff') : col}>{label}</text>
              </g>
            )}
            <text x={x} y={above ? y + 36 : y - 16} textAnchor="middle" fontSize={22} fontWeight={800} fill={dark ? '#cbd5e1' : '#334155'} stroke={dark ? '#0b1324' : '#f4fbff'} strokeWidth={4} paintOrder="stroke">{c.name}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ───────────── İstasyon afişi ───────────── */

function Instruments({ dark }: { dark: boolean }) {
  const metal = dark ? '#64748b' : '#94a3b8'
  const glow = dark ? '#22d3ee' : '#0891b2'
  return (
    <svg viewBox="0 0 220 130" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ii-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={dark ? '#070d1c' : '#bfe6ff'} />
          <stop offset="1" stopColor={dark ? '#13213b' : '#eaf7ff'} />
        </linearGradient>
      </defs>
      <rect width={220} height={130} rx={16} fill="url(#ii-sky)" />
      {dark ? (
        <g>
          {[[20, 18], [62, 10], [104, 26], [150, 12], [196, 22], [182, 44], [40, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.2 : 1.7} fill="#e2e8f0" className="ii-twinkle" style={{ animationDelay: `${i * 0.37}s` }} />)}
          <path d="M196 20a11 11 0 1 0 8 18a9 9 0 1 1 -8 -18z" fill="#fde68a" opacity={0.9} />
        </g>
      ) : (
        <g>
          <circle cx={190} cy={26} r={13} fill="#fde047" />
          <circle cx={190} cy={26} r={19} fill="#fde047" opacity={0.25} />
          <g className="ii-drift"><path d="M28 30a8 8 0 0 1 14-6a7 7 0 0 1 12 5a5 5 0 0 1 -1 10h-24a5 5 0 0 1 -1 -9z" fill="#fff" opacity={0.95} /></g>
        </g>
      )}
      <path d="M0 104q40 -18 80 -6t80 -4t60 4v32h-220z" fill={dark ? '#0f1b2e' : '#9fd88a'} />
      <path d="M0 114q50 -10 110 -2t110 -2v20h-220z" fill={dark ? '#0b1526' : '#7cc56b'} />
      {/* rüzgâr ölçer direği */}
      <line x1={58} y1={108} x2={58} y2={34} stroke={metal} strokeWidth={3} />
      <g className="ii-spin" style={{ transformOrigin: '58px 34px' }}>
        {[0, 120, 240].map((a) => (
          <g key={a} transform={`rotate(${a} 58 34)`}>
            <line x1={58} y1={34} x2={74} y2={34} stroke={metal} strokeWidth={2} />
            <path d="M74 29a5 5 0 0 1 0 10z" fill={dark ? '#e2e8f0' : '#334155'} />
          </g>
        ))}
      </g>
      <circle cx={58} cy={34} r={3} fill={dark ? '#e2e8f0' : '#334155'} />
      {/* rüzgâr gülü */}
      <line x1={58} y1={60} x2={58} y2={52} stroke={metal} strokeWidth={2} />
      <g className="ii-vane" style={{ transformOrigin: '58px 52px' }}>
        <path d="M42 52h26l-5 -4m5 4l-5 4M42 52l-4 -5h6z" stroke={dark ? '#fbbf24' : '#dc2626'} strokeWidth={2.4} fill={dark ? '#fbbf24' : '#dc2626'} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* meteoroloji kulübesi */}
      <line x1={100} y1={108} x2={100} y2={86} stroke={metal} strokeWidth={2.5} />
      <line x1={128} y1={108} x2={128} y2={86} stroke={metal} strokeWidth={2.5} />
      <path d="M94 66h40l-4 -8h-32z" fill={dark ? '#334155' : '#e2e8f0'} stroke={dark ? '#94a3b8' : '#64748b'} strokeWidth={1.5} />
      <rect x={96} y={66} width={36} height={22} rx={2} fill={dark ? '#1e293b' : '#fff'} stroke={dark ? '#94a3b8' : '#64748b'} strokeWidth={1.5} />
      {[70, 74, 78, 82].map((y) => <line key={y} x1={99} x2={129} y1={y} y2={y + 2} stroke={dark ? '#475569' : '#cbd5e1'} strokeWidth={1.5} />)}
      <circle cx={114} cy={77} r={2.4} fill={glow} className="ii-blink" />
      {/* yağmur ölçer */}
      <rect x={148} y={84} width={14} height={24} rx={3} fill={dark ? '#0f2742' : '#e0f2fe'} stroke={dark ? '#7dd3fc' : '#0284c7'} strokeWidth={1.5} />
      <rect x={149.5} y={96} width={11} height={10.5} rx={2} fill={dark ? '#38bdf8' : '#38bdf8'} opacity={0.8} className="ii-fill" />
      <path d="M144 84h22l-4 -6h-14z" fill={dark ? '#334155' : '#cbd5e1'} stroke={dark ? '#7dd3fc' : '#0284c7'} strokeWidth={1.3} />
      {/* termometre */}
      <rect x={185} y={52} width={10} height={48} rx={5} fill={dark ? '#0b1324' : '#fff'} stroke={dark ? '#cbd5e1' : '#475569'} strokeWidth={1.6} />
      <rect x={188} y={66} width={4} height={36} rx={2} fill="#ef4444" className="ii-mercury" style={{ transformOrigin: '190px 102px' }} />
      <circle cx={190} cy={104} r={7.5} fill="#ef4444" stroke={dark ? '#cbd5e1' : '#475569'} strokeWidth={1.6} />
      {[58, 66, 74, 82, 90].map((y) => <line key={y} x1={196} x2={200} y1={y} y2={y} stroke={dark ? '#94a3b8' : '#475569'} strokeWidth={1.2} />)}
    </svg>
  )
}

export function StationBanner({ dark, say, title, sub, right }: { dark: boolean; say: string; title: string; sub: string; right?: ReactNode }) {
  return (
    <div className={`relative mb-3 grid grid-cols-[112px_minmax(0,1fr)] items-stretch gap-2.5 overflow-hidden rounded-2xl p-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3 ${dark ? 'bg-[#0a1222] ring-1 ring-cyan-900/60' : 'bg-white/80 ring-1 ring-sky-100 shadow-sm'}`}>
      <div className="h-[78px] sm:h-[100px]">
        <Instruments dark={dark} />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`text-[11px] font-black tracking-[0.18em] uppercase ${dark ? 'text-cyan-300' : 'text-cyan-700'}`}>{sub}</span>
          <span className={`text-sm font-black sm:text-base ${dark ? 'text-slate-100' : 'text-ink'}`}>{title}</span>
        </div>
        <div className={`relative min-h-11 rounded-xl px-3 py-2 text-[13.5px] leading-snug font-extrabold sm:text-[15px] ${dark ? 'bg-[#03121a] text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-sky-50 text-sky-950 ring-1 ring-sky-200'}`} style={dark ? { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', textShadow: '0 0 8px #34d39955' } : undefined} aria-live="polite">
          <span key={say} className="block animate-fade-up">{dark ? '> ' : ''}{say}</span>
        </div>
      </div>
      {right}
    </div>
  )
}

export const ART_CSS = `
@keyframes ii-spin { to { transform: rotate(360deg) } }
.ii-spin { animation: ii-spin 2.4s linear infinite; }
@keyframes ii-vane { 0%,100% { transform: rotate(-8deg) } 50% { transform: rotate(10deg) } }
.ii-vane { animation: ii-vane 5s ease-in-out infinite; }
@keyframes ii-drift { 0%,100% { transform: translateX(0) } 50% { transform: translateX(14px) } }
.ii-drift { animation: ii-drift 9s ease-in-out infinite; }
@keyframes ii-twinkle { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
.ii-twinkle { animation: ii-twinkle 2.6s ease-in-out infinite; }
@keyframes ii-blink { 0%,100% { opacity: 1 } 50% { opacity: .2 } }
.ii-blink { animation: ii-blink 1.6s ease-in-out infinite; }
@keyframes ii-mercury { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(.8) } }
.ii-mercury { animation: ii-mercury 6s ease-in-out infinite; }
@keyframes ii-ping { 0% { opacity: .9; transform: scale(.7) } 100% { opacity: 0; transform: scale(1.5) } }
.ii-ping { transform-box: fill-box; transform-origin: center; animation: ii-ping 1.4s ease-out infinite; }
@keyframes ii-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
.ii-pulse { animation: ii-pulse 1.4s ease-in-out infinite; }
@keyframes ii-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(4px) } }
.ii-bob { animation: ii-bob 1.1s ease-in-out infinite; }
/* Çizgi grafiklerinde ± düğmeleri sağ üste: alt kenardaki zaman etiketlerini örtmesin */
.ii-line-plane > div:first-child > div.absolute { top: .5rem; bottom: auto; }
/* Koyu gösterge paneli: <Plane> renklerini koyu temaya çevir (yalnız düzlemin kendi çizimleri) */
.ii-dark-plane > div:first-child { background: #0b1324 !important; box-shadow: inset 0 0 0 1px #24324a !important; }
.ii-dark-plane svg > g:not(.ii-own) line[stroke="#e3e5ef"] { stroke: #22304a; }
.ii-dark-plane svg > g:not(.ii-own) line[stroke="#f1f2f7"] { stroke: #141f35; }
.ii-dark-plane svg > g:not(.ii-own) line[stroke="#1f2340"] { stroke: #94a3b8; }
.ii-dark-plane svg > g:not(.ii-own) line[stroke="#8a8fb0"] { stroke: #64748b; }
.ii-dark-plane svg > g:not(.ii-own) text { fill: #cbd5e1; }
.ii-dark-plane > p { color: #94a3b8; }
.ii-dark-plane > div:first-child > div > button { background: #1e293b; color: #e2e8f0; box-shadow: 0 0 0 1px #475569; }
`
