import type { ReactNode } from 'react'
import type { ShapeName, Visual } from '../data/types'
import { fmt } from '../lib/format'

const C = {
  ink: '#1f2340',
  soft: '#8a8fb0',
  line: '#d9dbea',
  fill: '#3f8a4f',
  fillSoft: '#dcefdc',
  orange: '#f97316',
  green: '#22c55e',
  yellow: '#facc15',
  red: '#ef4444',
  blue: '#3b82f6',
}

const PALETTE = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#ef4444']

export function VisualView({ v, size = 'md' }: { v: Visual; size?: 'sm' | 'md' | 'lg' }) {
  const max = size === 'sm' ? 'max-w-[140px]' : size === 'lg' ? 'max-w-[420px]' : 'max-w-[300px]'
  return <div className={`mx-auto w-full ${max} [&_svg]:h-auto [&_svg]:w-full`}>{render(v)}</div>
}

function render(v: Visual): ReactNode {
  switch (v.kind) {
    case 'emoji':
      return <EmojiSet emoji={v.emoji} count={v.count} group={v.group} />
    case 'emojiGroups':
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {v.groups.map((g, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && v.separator && <span className="text-2xl font-black text-ink-soft">{v.separator}</span>}
              <EmojiSet emoji={g.emoji} count={g.count} />
            </div>
          ))}
        </div>
      )
    case 'tenframe':
      return <TenFrameSvg filled={v.filled} add={v.add} size={v.size ?? ((v.filled + (v.add ?? 0)) > 10 ? 20 : 10)} />
    case 'dots':
      return <DotsSvg count={v.count} arrangement={v.arrangement ?? 'dice'} color={v.color} />
    case 'array':
      return <ArraySvg rows={v.rows} cols={v.cols} emoji={v.emoji} splitCol={v.splitCol} splitRow={v.splitRow} />
    case 'tape':
      return <TapeSvg parts={v.parts} total={v.total} compare={v.compare} />
    case 'hidden':
      return <HiddenSvg shown={v.shown} emoji={v.emoji ?? '🔵'} total={v.total} />
    case 'blocks':
      return <BlocksSvg {...v} />
    case 'fraction':
      return <FractionSvg num={v.num} den={v.den} shape={v.shape ?? 'circle'} />
    case 'clock':
      return <ClockFace h={v.h} m={v.m} digital={v.digital} analog={v.analog !== false} />
    case 'money':
      return <MoneyRow items={v.items} />
    case 'shape':
      return <ShapeSvg shape={v.shape} color={v.color} label={v.label} />
    case 'angle':
      return <AngleSvg degrees={v.degrees} showMeasure={v.showMeasure} />
    case 'numberline':
      return <NumberLineSvg {...v} />
    case 'bars':
      return <BarsSvg data={v.data} title={v.title} unit={v.unit} />
    case 'pictograph':
      return <Pictograph data={v.data} icon={v.icon} unit={v.unit ?? 1} title={v.title} />
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="mx-auto min-w-[200px] border-collapse overflow-hidden rounded-xl text-sm">
            <thead>
              <tr>{v.headers.map((h, i) => <th key={i} className="border border-line bg-brand-soft px-3 py-1.5 font-extrabold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {v.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="border border-line bg-white px-3 py-1.5 text-center font-semibold">{typeof c === 'number' ? fmt(c) : c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'area':
      return <AreaSvg w={v.w} h={v.h} grid={v.showGrid !== false} labels={v.labels} />
    case 'grid':
      return <GridSvg {...v} />
    case 'coords':
      return <CoordsSvg range={v.range} points={v.points} lines={v.lines} />
    case 'pattern':
      return (
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-3xl sm:text-4xl">
          {v.items.map((it, i) =>
            it === '?' ? (
              <span key={i} className="grid size-11 place-items-center rounded-xl border-2 border-dashed border-brand text-2xl font-black text-brand sm:size-12">?</span>
            ) : (
              <span key={i}>{it}</span>
            ),
          )}
        </div>
      )
    case 'balance':
      return <BalanceSvg left={v.left} right={v.right} />
    case 'cubes':
      return <CubesSvg heights={v.heights} />
    case 'spinner':
      return <SpinnerSvg sectors={v.sectors} />
    case 'dice':
      return <DiceSvg value={v.value} />
    case 'svg':
      return <div dangerouslySetInnerHTML={{ __html: v.svg }} />
  }
}

// ───────────────────────────────────────────────────────────────────────────

/** Sayıya göre sabit, tekrarlanabilir "rastgele" dağılım */
function seeded(n: number) {
  let x = (n * 9301 + 49297) % 233280
  return () => (x = (x * 9301 + 49297) % 233280) / 233280
}

const DICE: Record<number, [number, number][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

export function DotsSvg({ count, arrangement, color = C.fill }: { count: number; arrangement: 'dice' | 'five' | 'scatter' | 'line'; color?: string }) {
  const pts: [number, number][] = []
  let W = 120, H = 120
  if (arrangement === 'dice' && count <= 6) {
    DICE[count].forEach(([x, y]) => pts.push([24 + x * 36, 24 + y * 36]))
  } else if (arrangement === 'dice' || arrangement === 'five') {
    // 5'li gruplar hâlinde iki sıra (onluk çerçeve gibi)
    const groups = Math.ceil(count / 10)
    W = 5 * 26 + 14
    H = groups * 64 + 10
    for (let i = 0; i < count; i++) {
      const g = Math.floor(i / 10), k = i % 10
      pts.push([19 + (k % 5) * 26, 20 + g * 64 + Math.floor(k / 5) * 26])
    }
  } else if (arrangement === 'line') {
    W = Math.max(60, count * 24 + 16)
    H = 40
    for (let i = 0; i < count; i++) pts.push([20 + i * 24 + (i >= 5 ? 6 : 0) * Math.floor(i / 5), 20])
    W += Math.floor(count / 5) * 6
  } else {
    const r = seeded(count + 7)
    W = H = 140
    let guard = 0
    while (pts.length < count && guard++ < 2000) {
      const p: [number, number] = [16 + r() * 108, 16 + r() * 108]
      if (pts.every(([x, y]) => (x - p[0]) ** 2 + (y - p[1]) ** 2 > 22 ** 2)) pts.push(p)
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${count} nokta`} style={{ maxHeight: 200 }}>
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={12} fill="#fff" stroke={C.line} strokeWidth={2} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill={color} />)}
    </svg>
  )
}

export function ArraySvg({ rows, cols, emoji, splitCol, splitRow }: { rows: number; cols: number; emoji?: string; splitCol?: number; splitRow?: number }) {
  const u = Math.min(28, 260 / Math.max(rows, cols))
  const gx = splitCol ? 10 : 0, gy = splitRow ? 10 : 0
  const W = cols * u + gx + 8, H = rows * u + gy + 8
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${rows} sıra, ${cols} sütun`} style={{ maxHeight: 240 }}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const x = 4 + c * u + (splitCol && c >= splitCol ? gx : 0) + u / 2
          const y = 4 + r * u + (splitRow && r >= splitRow ? gy : 0) + u / 2
          const second = (splitCol && c >= splitCol) || (splitRow && r >= splitRow)
          return emoji ? (
            <text key={`${r}-${c}`} x={x} y={y + u * 0.3} textAnchor="middle" fontSize={u * 0.8}>{emoji}</text>
          ) : (
            <circle key={`${r}-${c}`} cx={x} cy={y} r={u * 0.36} fill={second ? C.orange : C.fill} />
          )
        }),
      )}
      {splitCol ? <line x1={4 + splitCol * u + gx / 2} x2={4 + splitCol * u + gx / 2} y1={2} y2={H - 2} stroke={C.ink} strokeWidth={2} strokeDasharray="4 3" /> : null}
      {splitRow ? <line y1={4 + splitRow * u + gy / 2} y2={4 + splitRow * u + gy / 2} x1={2} x2={W - 2} stroke={C.ink} strokeWidth={2} strokeDasharray="4 3" /> : null}
    </svg>
  )
}

export function TapeSvg({ parts, total, compare }: { parts: { label: string; value: number; color?: string }[]; total?: string; compare?: { label: string; value: number }[] }) {
  const sum = Math.max(1, parts.reduce((a, p) => a + p.value, 0), compare?.reduce((a, p) => a + p.value, 0) ?? 0)
  const W = 320, L = 10, scale = (W - 2 * L) / sum
  const row = (items: { label: string; value: number; color?: string }[], y: number, base: string) => {
    let x = L
    return items.map((p, i) => {
      const w = p.value * scale
      const el = (
        <g key={i}>
          <rect x={x} y={y} width={w} height={34} rx={4} fill={p.label === '?' ? '#fff' : p.color ?? (i % 2 ? '#c7e3c9' : base)} stroke={C.ink} strokeWidth={2} strokeDasharray={p.label === '?' ? '5 3' : undefined} />
          <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize={14} fontWeight={900} fill={p.label === '?' ? C.fill : C.ink}>{p.label}</text>
        </g>
      )
      x += w
      return el
    })
  }
  const hasTotal = !!total
  const yTop = hasTotal ? 30 : 6
  const H = yTop + 34 + (compare ? 48 : 0) + 8
  const partsW = parts.reduce((a, p) => a + p.value, 0) * scale
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Şerit modeli">
      {hasTotal && (
        <g>
          <path d={`M${L} ${yTop - 4} v-8 h${partsW} v8`} fill="none" stroke={C.ink} strokeWidth={1.6} />
          <text x={L + partsW / 2} y={yTop - 16} textAnchor="middle" fontSize={14} fontWeight={900} fill={total === '?' ? C.fill : C.ink}>{total}</text>
        </g>
      )}
      {row(parts, yTop, '#a7d3ab')}
      {compare && row(compare.map((c) => ({ ...c, color: '#fde2b8' })), yTop + 48, '#fde2b8')}
    </svg>
  )
}

function HiddenSvg({ shown, emoji, total }: { shown: number; emoji: string; total?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
      <div className="flex max-w-56 flex-wrap justify-center gap-0.5 text-2xl sm:text-3xl">
        {Array.from({ length: shown }).map((_, i) => <span key={i}>{emoji}</span>)}
      </div>
      <svg viewBox="0 0 90 80" width={90} aria-label="Bardağın altında saklı nesneler">
        <path d="M14 76 L24 8 H66 L76 76 Z" fill="#f59e0b" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        <path d="M24 8 H66" stroke="#fff" strokeWidth={3} opacity={0.5} />
        <text x={45} y={52} textAnchor="middle" fontSize={30} fontWeight={900} fill="#fff">?</text>
      </svg>
      {total !== undefined && <span className="self-center rounded-xl bg-ink px-3 py-1 text-lg font-black text-white">Toplam: {total}</span>}
    </div>
  )
}

function EmojiSet({ emoji, count, group }: { emoji: string; count: number; group?: number }) {
  const items = Array.from({ length: count })
  if (group && group > 0) {
    const groups: number[] = []
    for (let i = 0; i < count; i += group) groups.push(Math.min(group, count - i))
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-wrap justify-center gap-0.5 rounded-xl bg-paper p-1.5 text-2xl ring-1 ring-line sm:text-3xl">
            {Array.from({ length: g }).map((_, j) => <span key={j}>{emoji}</span>)}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap justify-center gap-0.5 text-2xl sm:text-3xl" aria-label={`${count} tane`}>
      {items.map((_, i) => <span key={i}>{emoji}</span>)}
    </div>
  )
}

export function TenFrameSvg({ filled, size, onCell, add = 0 }: { filled: number; size: 10 | 20; onCell?: (i: number) => void; add?: number }) {
  const frames = size / 10
  const cell = 36
  const W = 5 * cell + 8
  const H = frames * (2 * cell + 8) + (frames - 1) * 10
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Onluk çerçevede ${filled} sayaç`}>
      {Array.from({ length: frames }).map((_, f) => {
        const oy = f * (2 * cell + 18)
        return (
          <g key={f} transform={`translate(4 ${oy + 4})`}>
            <rect width={5 * cell} height={2 * cell} fill="#fff" />
            {Array.from({ length: 10 }).map((_, i) => {
              const idx = f * 10 + i
              const x = (i % 5) * cell, y = Math.floor(i / 5) * cell
              return (
                <g key={i} onClick={onCell ? () => onCell(idx) : undefined} style={onCell ? { cursor: 'pointer' } : undefined}>
                  <rect x={x} y={y} width={cell} height={cell} fill="transparent" stroke={C.ink} strokeWidth={1.5} />
                  {idx < filled + add && <circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.36} fill={add ? (idx < filled ? C.red : C.blue) : idx < 10 ? C.red : C.blue} />}
                </g>
              )
            })}
            <rect width={5 * cell} height={2 * cell} fill="none" stroke={C.ink} strokeWidth={3} pointerEvents="none" />
          </g>
        )
      })}
    </svg>
  )
}

export function BlocksSvg({ thousands = 0, hundreds = 0, tens = 0, ones = 0 }: { thousands?: number; hundreds?: number; tens?: number; ones?: number }) {
  const u = 8
  const items: ReactNode[] = []
  let x = 4
  const H = 10 * u + 8
  for (let i = 0; i < thousands; i++) {
    items.push(
      <g key={`th${i}`} transform={`translate(${x} 4)`}>
        <rect x={10} y={0} width={10 * u - 10} height={10 * u - 10} fill="#c7d2fe" stroke={C.ink} />
        <rect x={0} y={10} width={10 * u - 10} height={10 * u - 10} fill="#a5b4fc" stroke={C.ink} />
        <path d={`M0 10 L10 0 M${10 * u - 10} 10 L${10 * u} 0 M${10 * u - 10} ${10 * u} L${10 * u} ${10 * u - 10}`} stroke={C.ink} />
        <text x={(10 * u - 10) / 2} y={10 * u / 2 + 10} textAnchor="middle" fontSize={14} fontWeight={800} fill={C.ink}>1000</text>
      </g>,
    )
    x += 10 * u + 6
  }
  for (let i = 0; i < hundreds; i++) {
    items.push(
      <g key={`h${i}`} transform={`translate(${x} 4)`}>
        <rect width={10 * u} height={10 * u} fill="#fdba74" stroke={C.ink} />
        {Array.from({ length: 9 }).map((_, k) => (
          <g key={k}>
            <line x1={(k + 1) * u} y1={0} x2={(k + 1) * u} y2={10 * u} stroke="#9a3412" strokeWidth={0.5} />
            <line y1={(k + 1) * u} x1={0} y2={(k + 1) * u} x2={10 * u} stroke="#9a3412" strokeWidth={0.5} />
          </g>
        ))}
      </g>,
    )
    x += 10 * u + 6
  }
  for (let i = 0; i < tens; i++) {
    items.push(
      <g key={`t${i}`} transform={`translate(${x} 4)`}>
        <rect width={u} height={10 * u} fill="#86efac" stroke={C.ink} />
        {Array.from({ length: 9 }).map((_, k) => <line key={k} y1={(k + 1) * u} x1={0} y2={(k + 1) * u} x2={u} stroke="#166534" strokeWidth={0.5} />)}
      </g>,
    )
    x += u + 4
  }
  if (ones > 0) {
    x += 2
    for (let i = 0; i < ones; i++) {
      const col = Math.floor(i / 5), row = i % 5
      items.push(<rect key={`o${i}`} x={x + col * (u + 3)} y={4 + 10 * u - (row + 1) * (u + 3) + 3} width={u} height={u} fill="#fde047" stroke={C.ink} />)
    }
    x += Math.ceil(ones / 5) * (u + 3)
  }
  const W = Math.max(x + 4, 40)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${thousands} binlik, ${hundreds} yüzlük, ${tens} onluk, ${ones} birlik`} style={{ maxHeight: 160 }}>
      {items}
    </svg>
  )
}

export function FractionSvg({ num, den, shape, highlight = C.fill }: { num: number; den: number; shape: 'circle' | 'bar' | 'rect'; highlight?: string }) {
  const wholes = Math.max(1, Math.ceil(num / den))
  const label = `${den} eş parçadan ${num} tanesi boyalı`
  if (shape === 'circle') {
    const r = 46
    return (
      <svg viewBox={`0 0 ${wholes * 104} 104`} role="img" aria-label={label}>
        {Array.from({ length: wholes }).map((_, w) => (
          <g key={w} transform={`translate(${w * 104 + 52} 52)`}>
            {den === 1 ? (
              <circle r={r} fill={num - w * den >= 1 ? highlight : '#fff'} stroke={C.ink} strokeWidth={2} />
            ) : (
              Array.from({ length: den }).map((_, i) => {
                const a0 = (i / den) * 2 * Math.PI - Math.PI / 2
                const a1 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2
                const large = a1 - a0 > Math.PI ? 1 : 0
                const d = `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`
                const on = w * den + i < num
                return <path key={i} d={d} fill={on ? highlight : '#fff'} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
              })
            )}
          </g>
        ))}
      </svg>
    )
  }
  if (shape === 'rect') {
    const cols = den % 2 === 0 && den > 4 ? den / 2 : den
    const rows = den / cols
    const cw = 96 / cols, ch = 64 / rows
    return (
      <svg viewBox={`0 0 ${wholes * 104} 72`} role="img" aria-label={label}>
        {Array.from({ length: wholes }).map((_, w) => (
          <g key={w} transform={`translate(${w * 104 + 4} 4)`}>
            {Array.from({ length: den }).map((_, i) => (
              <rect key={i} x={(i % cols) * cw} y={Math.floor(i / cols) * ch} width={cw} height={ch} fill={w * den + i < num ? highlight : '#fff'} stroke={C.ink} strokeWidth={2} />
            ))}
          </g>
        ))}
      </svg>
    )
  }
  const bw = 240
  return (
    <svg viewBox={`0 0 ${bw + 8} ${wholes * 44 + 4}`} role="img" aria-label={label}>
      {Array.from({ length: wholes }).map((_, w) => (
        <g key={w} transform={`translate(4 ${4 + w * 44})`}>
          {Array.from({ length: den }).map((_, i) => (
            <rect key={i} x={(i * bw) / den} y={0} width={bw / den} height={36} rx={2} fill={w * den + i < num ? highlight : '#fff'} stroke={C.ink} strokeWidth={2} />
          ))}
        </g>
      ))}
    </svg>
  )
}

export function ClockFace({ h, m, digital, analog = true, size = 200 }: { h: number; m: number; digital?: boolean; analog?: boolean; size?: number }) {
  const hourAngle = ((h % 12) + m / 60) * 30
  const minAngle = m * 6
  const label = `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`
  return (
    <div className="flex flex-col items-center gap-2">
      {analog && (
        <svg viewBox="0 0 200 200" width={size} role="img" aria-label={`Saat ${label}`}>
          <circle cx={100} cy={100} r={94} fill="#fff" stroke={C.ink} strokeWidth={5} />
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i * 6 * Math.PI) / 180
            const r1 = i % 5 === 0 ? 80 : 86
            return <line key={i} x1={100 + r1 * Math.sin(a)} y1={100 - r1 * Math.cos(a)} x2={100 + 90 * Math.sin(a)} y2={100 - 90 * Math.cos(a)} stroke={i % 5 === 0 ? C.ink : C.soft} strokeWidth={i % 5 === 0 ? 3 : 1} />
          })}
          {Array.from({ length: 12 }).map((_, i) => {
            const n = i + 1
            const a = (n * 30 * Math.PI) / 180
            return <text key={n} x={100 + 66 * Math.sin(a)} y={100 - 66 * Math.cos(a) + 7} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.ink}>{n}</text>
          })}
          <line x1={100} y1={100} x2={100 + 44 * Math.sin((hourAngle * Math.PI) / 180)} y2={100 - 44 * Math.cos((hourAngle * Math.PI) / 180)} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
          <line x1={100} y1={100} x2={100 + 70 * Math.sin((minAngle * Math.PI) / 180)} y2={100 - 70 * Math.cos((minAngle * Math.PI) / 180)} stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
          <circle cx={100} cy={100} r={6} fill={C.ink} />
        </svg>
      )}
      {digital && <div className="rounded-xl bg-ink px-4 py-1.5 font-mono text-3xl font-bold tracking-widest text-lime-300 tabular-nums">{label}</div>}
    </div>
  )
}

export function Money({ value, onClick, small }: { value: number; onClick?: () => void; small?: boolean }) {
  const coin = value <= 1
  const coinValues: Record<string, { label: string; fill: string; ring: string }> = {
    '0.05': { label: '5 kr', fill: '#fcd9a8', ring: '#c2410c' },
    '0.1': { label: '10 kr', fill: '#fde68a', ring: '#b45309' },
    '0.25': { label: '25 kr', fill: '#fde68a', ring: '#b45309' },
    '0.5': { label: '50 kr', fill: '#e5e7eb', ring: '#6b7280' },
    '1': { label: '1 ₺', fill: '#fde68a', ring: '#9ca3af' },
  }
  const noteColors: Record<number, string> = { 5: '#c4b5fd', 10: '#fca5a5', 20: '#86efac', 50: '#fdba74', 100: '#93c5fd', 200: '#f9a8d4' }
  const Tag = onClick ? 'button' : 'div'
  if (coin) {
    const c = coinValues[String(value)] ?? coinValues['1']
    const s = small ? 44 : 56
    return (
      <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="shrink-0 rounded-full transition active:scale-95" aria-label={c.label}>
        <svg viewBox="0 0 60 60" width={s} height={s}>
          <circle cx={30} cy={30} r={27} fill={c.fill} stroke={c.ring} strokeWidth={5} />
          <circle cx={30} cy={30} r={20} fill="none" stroke={c.ring} strokeWidth={1} strokeDasharray="2 2" />
          <text x={30} y={35} textAnchor="middle" fontSize={value < 1 ? 12 : 15} fontWeight={900} fill={C.ink}>{c.label}</text>
        </svg>
      </Tag>
    )
  }
  const w = small ? 76 : 96
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="shrink-0 rounded-lg transition active:scale-95" aria-label={`${value} lira`}>
      <svg viewBox="0 0 100 52" width={w} height={(w * 52) / 100}>
        <rect x={1} y={1} width={98} height={50} rx={6} fill={noteColors[value] ?? '#d1fae5'} stroke={C.ink} strokeWidth={1.5} />
        <rect x={6} y={6} width={88} height={40} rx={4} fill="none" stroke={C.ink} strokeOpacity={0.25} />
        <circle cx={28} cy={26} r={12} fill="#fff" fillOpacity={0.6} />
        <text x={66} y={33} textAnchor="middle" fontSize={20} fontWeight={900} fill={C.ink}>{value} ₺</text>
      </svg>
    </Tag>
  )
}

function MoneyRow({ items }: { items: number[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {items.map((v, i) => <Money key={i} value={v} small={items.length > 4} />)}
    </div>
  )
}

function polygon(n: number, r: number, cx: number, cy: number, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
}

export function ShapeSvg({ shape, color = C.fill, label }: { shape: ShapeName; color?: string; label?: string }) {
  const s = { fill: color, fillOpacity: 0.85, stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const }
  const light = { fill: color, fillOpacity: 0.55, stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const }
  const dark = { fill: color, fillOpacity: 1, stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const }
  let body: ReactNode
  switch (shape) {
    case 'triangle': body = <polygon points={polygon(3, 52, 60, 68)} {...s} />; break
    case 'right-triangle': body = <polygon points="20,100 20,20 100,100" {...s} />; break
    case 'square': body = <rect x={20} y={20} width={80} height={80} {...s} />; break
    case 'rectangle': body = <rect x={8} y={32} width={104} height={56} {...s} />; break
    case 'circle': body = <circle cx={60} cy={60} r={46} {...s} />; break
    case 'oval': body = <ellipse cx={60} cy={60} rx={52} ry={32} {...s} />; break
    case 'semicircle': body = <path d="M10 80 A50 50 0 0 1 110 80 Z" {...s} />; break
    case 'pentagon': body = <polygon points={polygon(5, 50, 60, 64)} {...s} />; break
    case 'hexagon': body = <polygon points={polygon(6, 50, 60, 60, 0)} {...s} />; break
    case 'octagon': body = <polygon points={polygon(8, 50, 60, 60, Math.PI / 8)} {...s} />; break
    case 'rhombus': body = <polygon points="60,8 104,60 60,112 16,60" {...s} />; break
    case 'trapezoid': body = <polygon points="36,30 84,30 112,92 8,92" {...s} />; break
    case 'parallelogram': body = <polygon points="34,30 114,30 86,92 6,92" {...s} />; break
    case 'star': body = <polygon points={Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 22 : 52; const a = -Math.PI / 2 + (i * Math.PI) / 5; return `${60 + r * Math.cos(a)},${62 + r * Math.sin(a)}` }).join(' ')} {...s} />; break
    case 'cube':
      body = (
        <g>
          <polygon points="20,40 76,40 76,96 20,96" {...s} />
          <polygon points="20,40 44,18 100,18 76,40" {...light} />
          <polygon points="76,40 100,18 100,74 76,96" {...dark} />
        </g>
      )
      break
    case 'cuboid':
      body = (
        <g>
          <polygon points="8,50 84,50 84,100 8,100" {...s} />
          <polygon points="8,50 32,28 108,28 84,50" {...light} />
          <polygon points="84,50 108,28 108,78 84,100" {...dark} />
        </g>
      )
      break
    case 'sphere':
      body = (
        <g>
          <circle cx={60} cy={60} r={48} {...s} />
          <ellipse cx={60} cy={60} rx={48} ry={14} fill="none" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3" />
          <circle cx={44} cy={42} r={10} fill="#fff" fillOpacity={0.5} />
        </g>
      )
      break
    case 'cylinder':
      body = (
        <g>
          <path d="M22 28 L22 92 A38 12 0 0 0 98 92 L98 28" {...s} />
          <ellipse cx={60} cy={28} rx={38} ry={12} {...light} />
        </g>
      )
      break
    case 'cone':
      body = (
        <g>
          <path d="M60 10 L22 92 A38 12 0 0 0 98 92 Z" {...s} />
          <path d="M22 92 A38 12 0 0 1 98 92" fill="none" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
      )
      break
    case 'pyramid':
      body = (
        <g>
          <polygon points="60,10 14,90 70,104" {...s} />
          <polygon points="60,10 70,104 108,84" {...dark} />
          <path d="M14 90 L52 74 L108 84 M52 74 L60 10" fill="none" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
      )
      break
    case 'triangular-prism':
      body = (
        <g>
          <polygon points="14,96 40,44 66,96" {...s} />
          <polygon points="40,44 92,24 118,76 66,96" {...light} />
          <path d="M14 96 L66 96 L118 76" fill="none" stroke={C.ink} strokeWidth={3} />
          <path d="M14 96 L66 76 L118 76 M66 76 L92 24" fill="none" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
      )
      break
  }
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label ?? shape}>
      {body}
      {label && <text x={60} y={116} textAnchor="middle" fontSize={12} fontWeight={800} fill={C.ink}>{label}</text>}
    </svg>
  )
}

export function AngleSvg({ degrees, showMeasure }: { degrees: number; showMeasure?: boolean }) {
  const cx = 110, cy = 110, r = 90
  const a = (degrees * Math.PI) / 180
  const ex = cx + r * Math.cos(-a), ey = cy + r * Math.sin(-a)
  const ar = 28
  const large = degrees > 180 ? 1 : 0
  return (
    <svg viewBox="0 0 220 130" role="img" aria-label={`${degrees} derecelik açı`}>
      {degrees === 90 ? (
        <path d={`M${cx + 18} ${cy} L${cx + 18} ${cy - 18} L${cx} ${cy - 18}`} fill="none" stroke={C.orange} strokeWidth={3} />
      ) : (
        <path d={`M${cx + ar} ${cy} A${ar} ${ar} 0 ${large} 0 ${cx + ar * Math.cos(-a)} ${cy + ar * Math.sin(-a)}`} fill={C.orange} fillOpacity={0.2} stroke={C.orange} strokeWidth={3} />
      )}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={C.ink} />
      {showMeasure && (
        <text x={cx + 44 * Math.cos(-a / 2)} y={cy + 44 * Math.sin(-a / 2) + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.orange}>{degrees}°</text>
      )}
    </svg>
  )
}

export function NumberLineSvg({ min, max, step, points = [], hidden = [], labels = true, integerLabels = false, jumps = [] }: { min: number; max: number; step: number; points?: number[]; hidden?: number[]; labels?: boolean; integerLabels?: boolean; jumps?: number[] }) {
  const n = Math.round((max - min) / step)
  const W = 340, pad = 20
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad)
  const ticks = Array.from({ length: n + 1 }, (_, i) => Math.round((min + i * step) * 1000) / 1000)
  const spacing = (W - 2 * pad) / Math.max(1, n)
  const maxLabel = Math.max(...ticks.map((t) => fmt(t).length))
  const labelEvery = Math.max(1, Math.ceil((maxLabel * 7 + 4) / spacing))
  return (
    <svg viewBox={`0 0 ${W} 86`} role="img" aria-label={`${min} ile ${max} arası sayı doğrusu`}>
      <line x1={pad - 10} y1={50} x2={W - pad + 10} y2={50} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${W - pad + 12} 50 l-8 -5 v10 z M${pad - 12} 50 l8 -5 v10 z`} fill={C.ink} />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={x(t)} y1={43} x2={x(t)} y2={57} stroke={C.ink} strokeWidth={i % labelEvery === 0 ? 2 : 1} />
          {((labels && i % labelEvery === 0) || (integerLabels && Math.abs(t - Math.round(t)) < 1e-9)) && !hidden.some((h) => Math.abs(h - t) < 1e-9) && (
            <text x={x(t)} y={76} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>{fmt(t)}</text>
          )}
        </g>
      ))}
      {hidden.map((h, i) => (
        <g key={`h${i}`}>
          <rect x={x(h) - 11} y={63} width={22} height={18} rx={4} fill="#fff" stroke={C.fill} strokeWidth={2} strokeDasharray="3 2" />
          <text x={x(h)} y={77} textAnchor="middle" fontSize={13} fontWeight={900} fill={C.fill}>?</text>
        </g>
      ))}
      {jumps.map((j, i) => {
        const from = i === 0 ? jumps[0] : jumps[i - 1]
        if (i === 0) return null
        const mid = (x(from) + x(j)) / 2
        return <path key={`j${i}`} d={`M${x(from)} 44 Q${mid} 10 ${x(j)} 44`} fill="none" stroke={C.orange} strokeWidth={2.5} markerEnd="" />
      })}
      {points.map((p, i) => <circle key={`p${i}`} cx={x(p)} cy={50} r={7} fill={C.fill} stroke="#fff" strokeWidth={2} />)}
    </svg>
  )
}

export function BarsSvg({ data, title, unit }: { data: { label: string; value: number }[]; title?: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const niceMax = max <= 10 ? Math.ceil(max) : Math.ceil(max / 5) * 5
  const stepV = niceMax <= 10 ? 1 : niceMax <= 20 ? 2 : niceMax <= 50 ? 5 : Math.ceil(niceMax / 10)
  const W = Math.max(260, data.length * 60 + 50), H = 200, left = 34, bottom = 32, top = title ? 26 : 10
  const bw = (W - left - 10) / data.length
  const y = (v: number) => H - bottom - (v / niceMax) * (H - bottom - top)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? 'Sütun grafiği'}>
      {title && <text x={W / 2} y={16} textAnchor="middle" fontSize={13} fontWeight={800} fill={C.ink}>{title}</text>}
      {Array.from({ length: Math.floor(niceMax / stepV) + 1 }).map((_, i) => {
        const v = i * stepV
        return (
          <g key={i}>
            <line x1={left} x2={W - 6} y1={y(v)} y2={y(v)} stroke={C.line} />
            <text x={left - 5} y={y(v) + 4} textAnchor="end" fontSize={10} fill={C.soft}>{v}</text>
          </g>
        )
      })}
      {data.map((d, i) => (
        <g key={i}>
          <rect x={left + i * bw + bw * 0.18} y={y(d.value)} width={bw * 0.64} height={H - bottom - y(d.value)} rx={4} fill={PALETTE[i % PALETTE.length]} />
          <text x={left + i * bw + bw / 2} y={H - bottom + 15} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>{d.label}</text>
        </g>
      ))}
      <line x1={left} x2={left} y1={top} y2={H - bottom} stroke={C.ink} strokeWidth={1.5} />
      <line x1={left} x2={W - 6} y1={H - bottom} y2={H - bottom} stroke={C.ink} strokeWidth={1.5} />
      {unit && <text x={4} y={top + 4} fontSize={9} fill={C.soft}>{unit}</text>}
    </svg>
  )
}

function Pictograph({ data, icon, unit, title }: { data: { label: string; value: number }[]; icon: string; unit: number; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-line">
      {title && <div className="bg-brand-soft px-3 py-1.5 text-center text-sm font-extrabold">{title}</div>}
      {data.map((d, i) => (
        <div key={i} className="flex items-center border-t border-line bg-white first:border-t-0">
          <div className="w-24 shrink-0 border-r border-line px-2 py-1.5 text-sm font-bold">{d.label}</div>
          <div className="flex flex-wrap gap-0.5 px-2 py-1 text-xl">
            {Array.from({ length: Math.floor(d.value / unit) }).map((_, k) => <span key={k}>{icon}</span>)}
            {d.value % unit !== 0 && <span className="inline-block overflow-hidden" style={{ width: `${((d.value % unit) / unit) * 1.25}em` }}>{icon}</span>}
          </div>
        </div>
      ))}
      {unit !== 1 && <div className="border-t border-line bg-paper px-3 py-1 text-center text-xs font-bold text-ink-soft">{icon} = {unit}</div>}
    </div>
  )
}

function AreaSvg({ w, h, grid, labels }: { w: number; h: number; grid: boolean; labels?: boolean }) {
  const u = Math.min(28, 260 / Math.max(w, h))
  const W = w * u + 50, H = h * u + 44
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${w} birime ${h} birim dikdörtgen`}>
      <g transform="translate(30 10)">
        <rect width={w * u} height={h * u} fill={C.fillSoft} stroke={C.fill} strokeWidth={3} />
        {grid && Array.from({ length: w - 1 }).map((_, i) => <line key={`v${i}`} x1={(i + 1) * u} x2={(i + 1) * u} y1={0} y2={h * u} stroke={C.fill} strokeOpacity={0.5} />)}
        {grid && Array.from({ length: h - 1 }).map((_, i) => <line key={`h${i}`} y1={(i + 1) * u} y2={(i + 1) * u} x1={0} x2={w * u} stroke={C.fill} strokeOpacity={0.5} />)}
        {labels && (
          <>
            <text x={(w * u) / 2} y={h * u + 22} textAnchor="middle" fontSize={14} fontWeight={800} fill={C.ink}>{w} birim</text>
            <text x={-8} y={(h * u) / 2 + 4} textAnchor="end" fontSize={14} fontWeight={800} fill={C.ink}>{h}</text>
          </>
        )}
      </g>
    </svg>
  )
}

export function GridSvg({ cols, rows, cells, axis, axisAt, color = C.fill, onCell, extra, cellSize }: { cols: number; rows: number; cells: string[]; axis?: 'v' | 'h'; axisAt?: number; color?: string; onCell?: (x: number, y: number) => void; extra?: { cells: string[]; color: string }; cellSize?: number }) {
  const u = cellSize ?? Math.min(30, 300 / Math.max(cols, rows))
  const set = new Set(cells)
  const ex = new Set(extra?.cells ?? [])
  const at = axisAt ?? (axis === 'h' ? rows / 2 : cols / 2)
  return (
    <svg viewBox={`0 0 ${cols * u + 4} ${rows * u + 4}`} role="img" aria-label="Kareli zemin">
      <g transform="translate(2 2)">
        {Array.from({ length: rows }).map((_, y) =>
          Array.from({ length: cols }).map((_, x) => {
            const k = `${x},${y}`
            return (
              <rect
                key={k}
                x={x * u}
                y={y * u}
                width={u}
                height={u}
                fill={set.has(k) ? color : ex.has(k) ? extra!.color : '#fff'}
                stroke={C.line}
                onClick={onCell ? () => onCell(x, y) : undefined}
                style={onCell ? { cursor: 'pointer' } : undefined}
              />
            )
          }),
        )}
        {axis === 'v' && <line x1={at * u} x2={at * u} y1={-2} y2={rows * u + 2} stroke={C.red} strokeWidth={3} strokeDasharray="6 4" />}
        {axis === 'h' && <line y1={at * u} y2={at * u} x1={-2} x2={cols * u + 2} stroke={C.red} strokeWidth={3} strokeDasharray="6 4" />}
      </g>
    </svg>
  )
}

export function CoordsSvg({ range, points = [], lines = [], onPoint, polygons = [] }: { range: number; points?: { x: number; y: number; label?: string; color?: string }[]; lines?: { m: number; b: number; color?: string }[]; onPoint?: (x: number, y: number) => void; polygons?: { pts: [number, number][]; color: string; dashed?: boolean }[] }) {
  const u = Math.min(24, 150 / range)
  const S = 2 * range * u
  const pad = 16
  const X = (x: number) => pad + (x + range) * u
  const Y = (y: number) => pad + (range - y) * u
  return (
    <svg viewBox={`0 0 ${S + 2 * pad} ${S + 2 * pad}`} role="img" aria-label="Koordinat düzlemi">
      {Array.from({ length: 2 * range + 1 }).map((_, i) => {
        const v = i - range
        return (
          <g key={i}>
            <line x1={X(v)} x2={X(v)} y1={Y(range)} y2={Y(-range)} stroke={C.line} />
            <line y1={Y(v)} y2={Y(v)} x1={X(-range)} x2={X(range)} stroke={C.line} />
            {v !== 0 && <text x={X(v)} y={Y(0) + 12} textAnchor="middle" fontSize={8} fill={C.soft}>{v}</text>}
            {v !== 0 && <text x={X(0) - 4} y={Y(v) + 3} textAnchor="end" fontSize={8} fill={C.soft}>{v}</text>}
          </g>
        )
      })}
      <line x1={X(-range) - 6} x2={X(range) + 6} y1={Y(0)} y2={Y(0)} stroke={C.ink} strokeWidth={1.8} />
      <line y1={Y(-range) + 6} y2={Y(range) - 6} x1={X(0)} x2={X(0)} stroke={C.ink} strokeWidth={1.8} />
      <text x={X(range) + 4} y={Y(0) - 4} fontSize={10} fontWeight={800} fill={C.ink}>x</text>
      <text x={X(0) + 4} y={Y(range) - 2} fontSize={10} fontWeight={800} fill={C.ink}>y</text>
      {polygons.map((pg, i) => (
        <polygon key={i} points={pg.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')} fill={pg.color} fillOpacity={0.3} stroke={pg.color} strokeWidth={2} strokeDasharray={pg.dashed ? '4 3' : undefined} />
      ))}
      {lines.map((l, i) => (
        <line key={i} x1={X(-range)} y1={Y(l.m * -range + l.b)} x2={X(range)} y2={Y(l.m * range + l.b)} stroke={l.color ?? PALETTE[i]} strokeWidth={2.5} />
      ))}
      {onPoint &&
        Array.from({ length: 2 * range + 1 }).map((_, i) =>
          Array.from({ length: 2 * range + 1 }).map((_, j) => (
            <circle key={`${i},${j}`} cx={X(i - range)} cy={Y(j - range)} r={u / 2.4} fill="transparent" onClick={() => onPoint(i - range, j - range)} style={{ cursor: 'pointer' }} />
          )),
        )}
      {points.map((p, i) => (
        <g key={i} pointerEvents="none">
          <circle cx={X(p.x)} cy={Y(p.y)} r={5} fill={p.color ?? C.red} stroke="#fff" strokeWidth={1.5} />
          {p.label && <text x={X(p.x) + 7} y={Y(p.y) - 6} fontSize={11} fontWeight={900} fill={p.color ?? C.red}>{p.label}</text>}
        </g>
      ))}
    </svg>
  )
}

export function BalanceSvg({ left, right, tilt = 0 }: { left: string[]; right: string[]; tilt?: number }) {
  const a = Math.max(-12, Math.min(12, tilt))
  const pan = (labels: string[], cx: number) => {
    const items = labels.slice(0, 8)
    const ws = items.map((l) => (/x/.test(l) ? 26 : l.length > 2 ? 30 : 20))
    const total = ws.reduce((s, w) => s + w + 2, -2)
    let x = cx - total / 2
    return items.map((label, i) => {
      const w = ws[i]
      const isX = /x/.test(label)
      const el = (
        <g key={i}>
          <rect x={x} y={-w} width={w} height={w} rx={isX ? 5 : w / 2} fill={isX ? C.fill : C.yellow} stroke={C.ink} strokeWidth={1.5} />
          <text x={x + w / 2} y={-w / 2 + 4.5} textAnchor="middle" fontSize={label.length > 2 ? 10 : 12} fontWeight={900} fill={isX ? '#fff' : C.ink}>{label}</text>
        </g>
      )
      x += w + 2
      return el
    })
  }
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label={`Terazi: ${left.join(' ')} ve ${right.join(' ')}`}>
      <polygon points="160,60 140,160 180,160" fill="#cbd5e1" stroke={C.ink} strokeWidth={2} />
      <g transform={`rotate(${a} 160 60)`}>
        <rect x={20} y={56} width={280} height={8} rx={4} fill={C.ink} />
        <g transform="translate(0 100)">
          <line x1={70} y1={-40} x2={70} y2={0} stroke={C.ink} />
          <line x1={250} y1={-40} x2={250} y2={0} stroke={C.ink} />
          <g transform={`rotate(${-a} 70 0)`}>
            <path d="M5 0 h130 l-12 12 h-106 z" fill="#94a3b8" stroke={C.ink} strokeWidth={1.5} />
            {pan(left, 70)}
          </g>
          <g transform={`rotate(${-a} 250 0)`}>
            <path d="M185 0 h130 l-12 12 h-106 z" fill="#94a3b8" stroke={C.ink} strokeWidth={1.5} />
            {pan(right, 250)}
          </g>
        </g>
      </g>
      <circle cx={160} cy={60} r={6} fill={C.red} />
    </svg>
  )
}

/** Eş küplerden yapı (izometrik çizim). heights[satır][sütun] = o hücredeki küp sayısı */
export function CubesSvg({ heights }: { heights: number[][] }) {
  const s = 22
  const iso = (x: number, y: number, z: number) => [(x - y) * s * 0.87, (x + y) * s * 0.5 - z * s]
  const faces: ReactNode[] = []
  const rows = heights.length, cols = Math.max(...heights.map((r) => r.length))
  let k = 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const hgt = heights[y]?.[x] ?? 0
      for (let z = 0; z < hgt; z++) {
        const p = (dx: number, dy: number, dz: number) => iso(x + dx, y + dy, z + dz).join(',')
        faces.push(
          <g key={k++} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round">
            <polygon points={`${p(0, 0, 1)} ${p(1, 0, 1)} ${p(1, 1, 1)} ${p(0, 1, 1)}`} fill="#c7d2fe" />
            <polygon points={`${p(0, 1, 0)} ${p(1, 1, 0)} ${p(1, 1, 1)} ${p(0, 1, 1)}`} fill="#818cf8" />
            <polygon points={`${p(1, 0, 0)} ${p(1, 1, 0)} ${p(1, 1, 1)} ${p(1, 0, 1)}`} fill="#6366f1" />
          </g>,
        )
      }
    }
  }
  const maxH = Math.max(1, ...heights.flat())
  const minX = -rows * s * 0.87 - 4, maxX = cols * s * 0.87 + 4
  const minY = -maxH * s - 4, maxY = (rows + cols) * s * 0.5 + 4
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="Küplerden yapı" style={{ maxHeight: 220 }}>
      {faces}
    </svg>
  )
}

export function SpinnerSvg({ sectors, rotation = 0 }: { sectors: { label: string; color?: string; weight?: number }[]; rotation?: number }) {
  const total = sectors.reduce((s, x) => s + (x.weight ?? 1), 0)
  let acc = 0
  const r = 90
  return (
    <svg viewBox="0 0 200 210" role="img" aria-label="Çark">
      <g transform={`translate(100 110) rotate(${rotation})`} style={{ transition: 'transform 1.6s cubic-bezier(.17,.67,.2,1)' }}>
        {sectors.map((sec, i) => {
          const w = sec.weight ?? 1
          const a0 = (acc / total) * 2 * Math.PI - Math.PI / 2
          acc += w
          const a1 = (acc / total) * 2 * Math.PI - Math.PI / 2
          const mid = (a0 + a1) / 2
          const large = a1 - a0 > Math.PI ? 1 : 0
          return (
            <g key={i}>
              <path d={sectors.length === 1 ? `M${-r} 0 A${r} ${r} 0 1 1 ${r} 0 A${r} ${r} 0 1 1 ${-r} 0` : `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`} fill={sec.color ?? PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={3} />
              <text x={r * 0.62 * Math.cos(mid)} y={r * 0.62 * Math.sin(mid) + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{sec.label}</text>
            </g>
          )
        })}
      </g>
      <polygon points="100,12 90,-2 110,-2" transform="translate(0 14)" fill={C.ink} />
      <circle cx={100} cy={110} r={8} fill="#fff" stroke={C.ink} strokeWidth={2} />
    </svg>
  )
}

export function DiceSvg({ value, size = 80 }: { value: number; size?: number }) {
  const pips: Record<number, [number, number][]> = {
    1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Zar: ${value}`}>
      <rect x={4} y={4} width={92} height={92} rx={18} fill="#fff" stroke={C.ink} strokeWidth={4} />
      {(pips[value] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill={value === 1 ? C.red : C.ink} />)}
    </svg>
  )
}
