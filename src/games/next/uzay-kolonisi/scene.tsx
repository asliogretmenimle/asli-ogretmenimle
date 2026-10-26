import { Astronaut, MarsSky, MODS, ModuleArt, type Mod } from './art'
import { fmt } from './util'

/**
 * Koloni sahnesi: soldaki kaynaktan (güneş tarlası ya da su deposu) modüllere akan enerji/su hatları.
 * Hat kalınlığı ve modülün altındaki pil göstergesi modülün payıyla orantılıdır. Kâşifler nüfusu gösterir.
 */
export function ColonyScene({ segs, plan, units, source, pop, hud, alarm, dark, temp }: { segs: Mod[]; plan: number[]; units: number; source: 'enerji' | 'su'; pop?: number; hud?: { label: string; value: string; tone?: 'ok' | 'bad' }[]; alarm?: boolean; dark?: boolean; temp?: number }) {
  const W = 640, H = 270
  const ground = 196
  const n = segs.length
  const x0 = 150
  const gap = (W - x0 - 20) / n
  const srcX = 70, srcY = ground - 20
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-[22px] ring-1 ring-white/10" role="img" aria-label="Koloni sahnesi">
      <MarsSky w={W} h={ground + 30} dark={dark} />
      <rect y={ground + 10} width={W} height={H - ground - 10} fill={dark ? '#7c2d12' : '#c2410c'} />
      <rect y={ground + 10} width={W} height={6} fill="#000" opacity={0.15} />
      {/* kaynak */}
      {source === 'enerji' ? (
        <g>
          <ModuleArt mod="gunes" x={srcX - 52} y={srcY - 70} s={64} pop={false} />
          <ModuleArt mod="gunes" x={srcX - 6} y={srcY - 62} s={58} pop={false} />
          <circle cx={srcX + 6} cy={srcY + 6} r={14} fill="#facc15" className="uk-pulse" />
          <text x={srcX + 6} y={srcY + 11} textAnchor="middle" fontSize={14} fontWeight={900} fill="#713f12">⚡</text>
        </g>
      ) : (
        <g>
          <rect x={srcX - 36} y={srcY - 64} width={72} height={78} rx={14} fill="#0e7490" stroke="#67e8f9" strokeWidth={3} />
          <rect x={srcX - 28} y={srcY - 34} width={56} height={40} rx={8} fill="#22d3ee" opacity={0.85} />
          <text x={srcX} y={srcY - 42} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ecfeff">SU</text>
        </g>
      )}
      {/* ana hat: kaynaktan modüllere */}
      <rect x={srcX} y={ground + 16} width={x0 + gap * (n - 0.5) - srcX + 6} height={10} rx={5} fill="#1e293b" stroke="#475569" />
      <line x1={srcX + 4} x2={x0 + gap * (n - 0.5)} y1={ground + 21} y2={ground + 21} stroke={source === 'enerji' ? '#facc15' : '#22d3ee'} strokeWidth={4} strokeDasharray="8 7" strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.9s" repeatCount="indefinite" />
      </line>
      {segs.map((m, i) => {
        const mx = x0 + gap * (i + 0.5)
        const share = plan[i] / units
        const col = MODS[m].color
        const my = ground - 4
        return (
          <g key={m}>
            <rect x={mx - 3 - share * 9} y={my + 6} width={6 + share * 18} height={ground + 22 - my - 6} rx={3} fill="#1e293b" stroke="#475569" />
            {share > 0 && (
              <line x1={mx} x2={mx} y1={ground + 20} y2={my + 8} stroke={col} strokeWidth={3 + share * 14} strokeDasharray="5 4">
                <animate attributeName="stroke-dashoffset" from="0" to="18" dur="0.7s" repeatCount="indefinite" />
              </line>
            )}
            <g opacity={share > 0 ? 1 : 0.4}>
              <ModuleArt key={`${m}-${share > 0}`} mod={m} x={mx - 42} y={my - 78} s={84} />
            </g>
            {/* pil göstergesi */}
            <rect x={mx - 30} y={ground + 34} width={60} height={13} rx={6.5} fill="#0f172a" stroke="#fff" strokeOpacity={0.3} />
            <rect x={mx - 28} y={ground + 36} width={56 * share} height={9} rx={4.5} fill={col} />
            <text x={mx} y={ground + 64} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{MODS[m].short}</text>
          </g>
        )
      })}
      {/* kâşifler */}
      {pop !== undefined &&
        Array.from({ length: pop }, (_, i) => (
          <Astronaut key={i} x={x0 - 20 + ((i * 43) % (W - x0)) + (i % 2) * 7} y={ground + 2 - (i % 3) * 4} s={1.1} i={i} />
        ))}
      {/* gösterge paneli */}
      {hud && (
        <g>
          {hud.map((h, i) => (
            <g key={h.label} transform={`translate(${12 + i * 112} 10)`}>
              <rect width={104} height={42} rx={10} fill="#020617" opacity={0.72} stroke={h.tone === 'bad' ? '#f43f5e' : h.tone === 'ok' ? '#34d399' : '#38bdf8'} strokeOpacity={0.6} />
              <text x={10} y={16} fontSize={10} fontWeight={900} fill="#94a3b8">{h.label.toLocaleUpperCase('tr-TR')}</text>
              <text x={10} y={34} fontSize={16} fontWeight={900} fill={h.tone === 'bad' ? '#fda4af' : '#fff'}>{h.value}</text>
            </g>
          ))}
        </g>
      )}
      {temp !== undefined && (
        <g transform={`translate(${W - 92} 10)`}>
          <rect width={80} height={36} rx={10} fill="#020617" opacity={0.72} stroke="#60a5fa" strokeOpacity={0.6} />
          <text x={40} y={14} textAnchor="middle" fontSize={9} fontWeight={900} fill="#94a3b8">DIŞARISI</text>
          <text x={40} y={30} textAnchor="middle" fontSize={15} fontWeight={900} fill="#bfdbfe">{fmt(temp)} °C</text>
        </g>
      )}
      {alarm && <rect width={W} height={H} fill="#f43f5e" className="uk-alarm" pointerEvents="none" />}
    </svg>
  )
}

/** Gece sahnesi: dışarıdaki ve kubbe içindeki termometreler (−90 … 30 °C) */
export function ThermoScene({ out, ins }: { out: number | null; ins: number | null }) {
  const W = 640, H = 230
  const ground = 182
  const tY = (v: number) => 40 + ((30 - v) / 120) * 130 // 30 °C → 40, −90 °C → 170
  const Thermo = ({ x, v, color, label }: { x: number; v: number | null; color: string; label: string }) => (
    <g>
      <rect x={x - 9} y={34} width={18} height={142} rx={9} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
      <circle cx={x} cy={184} r={15} fill={v === null ? '#cbd5e1' : color} stroke="#94a3b8" strokeWidth={2} />
      {v !== null && <rect x={x - 4.5} y={tY(v)} width={9} height={184 - tY(v)} rx={4.5} fill={color} style={{ transition: 'all .3s' }} />}
      {[30, 0, -30, -60, -90].map((t) => (
        <g key={t}>
          <line x1={x + 9} x2={x + (t === 0 ? 20 : 15)} y1={tY(t)} y2={tY(t)} stroke={t === 0 ? '#f8fafc' : '#94a3b8'} strokeWidth={t === 0 ? 2.5 : 1.5} />
          <text x={x + 23} y={tY(t) + 4} fontSize={10} fontWeight={900} fill={t === 0 ? '#fff' : '#94a3b8'}>{fmt(t)}</text>
        </g>
      ))}
      <rect x={x - 46} y={4} width={92} height={24} rx={12} fill="#020617" opacity={0.8} stroke={color} />
      <text x={x} y={21} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{label}: {v === null ? '?' : `${fmt(v)} °C`}</text>
    </g>
  )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-[22px] ring-1 ring-white/10" role="img" aria-label="Gece sahnesi ve termometreler">
      <MarsSky w={W} h={ground + 20} dark />
      <rect y={ground} width={W} height={H - ground} fill="#431407" />
      <defs>
        <radialGradient id="uk-warm" cx="0.5" cy="0.8" r="0.7">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
      </defs>
      {/* kubbe kesiti */}
      <path d={`M300 ${ground} A130 120 0 0 1 560 ${ground} Z`} fill="url(#uk-warm)" opacity={0.85} stroke="#e2e8f0" strokeWidth={5} />
      <path d={`M320 ${ground} A110 100 0 0 1 540 ${ground}`} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={2} />
      <ModuleArt mod="isitma" x={330} y={ground - 70} s={70} pop={false} />
      <Astronaut x={520} y={ground - 12} s={1.6} i={1} />
      {/* soğuk rüzgâr */}
      {[60, 95, 130].map((y, i) => <path key={y} d={`M${150 + i * 20} ${y} q 30 -12 60 0 t 60 0`} fill="none" stroke="#bfdbfe" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" className="uk-pulse" />)}
      <Thermo x={70} v={out} color="#3b82f6" label="Dış" />
      <Thermo x={455} v={ins} color="#f97316" label="İç" />
    </svg>
  )
}
