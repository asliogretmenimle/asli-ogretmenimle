import type { ReactNode } from 'react'
import { ek } from '../../lib/generators'

/**
 * İşlem ailesinin modelleri: eşitlik kurulunca model tepki verir.
 *  - AddModel: parça–parça–bütün şeridi (küçük sayılarda içinde sayaçlar). Toplamada parçalar
 *    yan yana gelir (yer değiştirince şerit de yer değiştirir); çıkarmada çıkarılan parça soluklaşır.
 *  - MulModel: dizilim. a × b → her sıra bir grup; b × a → her sütun bir grup; bölmede gruplar numaralanır.
 */

export const COL_A = '#f97316'
export const COL_B = '#3b82f6'
export const COL_W = '#16a34a'

/** Model görünümü: son kurulan doğru eşitlikten türetilir */
export type View =
  | { kind: 'join'; first: number; second: number }
  | { kind: 'take'; removed: number; left: number }
  | { kind: 'groups'; size: number; count: number; div: boolean }
  | null

const lab = (n: number, unknown?: number) => (unknown !== undefined && n === unknown ? '?' : String(n))

export function AddModel({ a, b, c, view, unknown }: { a: number; b: number; c: number; view: View; unknown?: number }) {
  const W = 360, L = 10, inner = W - 2 * L
  const u = inner / c
  const small = c <= 20
  // parçaların kimliği: A (a) ve B (b); a = b ise sıra ile
  let order: ['A' | 'B', 'A' | 'B'] = ['A', 'B']
  let removed: 'A' | 'B' | null = null
  if (view?.kind === 'join') order = view.first === a ? ['A', 'B'] : ['B', 'A']
  if (view?.kind === 'take') {
    const remA = view.removed === a && !(a === b)
    removed = a === b ? 'B' : remA ? 'A' : 'B'
    order = removed === 'A' ? ['B', 'A'] : ['A', 'B']
  }
  const val = { A: a, B: b }
  const col = { A: COL_A, B: COL_B }
  const xOf = (id: 'A' | 'B') => (order[0] === id ? L : L + val[order[0]] * u)
  const caption =
    view?.kind === 'join'
      ? `${lab(view.first, unknown)} ile ${lab(view.second, unknown)} birleşince ${lab(c, unknown)} olur.`
      : view?.kind === 'take'
        ? unknown !== undefined && [c, view.removed].includes(unknown)
          ? `Bütünden bir parçayı çıkarınca diğer parça kalır.`
          : `${ek(c, 'abl')} ${view.removed} çıkınca ${lab(view.left, unknown)} kalır.`
        : `Bütün: ${lab(c, unknown)} · Parçalar: ${lab(a, unknown)} ve ${lab(b, unknown)}`
  const parts: ReactNode[] = (['A', 'B'] as const).map((id) => {
    const w = val[id] * u
    const isRem = removed === id
    const dots = small
      ? Array.from({ length: val[id] }, (_, i) => <circle key={i} cx={(i + 0.5) * u} cy={84} r={Math.min(9, u * 0.34)} fill="#fff" opacity={0.9} />)
      : null
    return (
      <g key={id} style={{ transform: `translateX(${xOf(id)}px)`, transition: 'transform 450ms cubic-bezier(.34,1.3,.64,1), opacity 300ms' }} opacity={isRem ? 0.35 : 1}>
        <rect x={0} y={64} width={w} height={40} rx={8} fill={col[id]} stroke="#1f2340" strokeWidth={2} />
        {dots}
        {isRem && <path d={`M4 68 L${w - 4} 100 M4 100 L${w - 4} 68`} stroke="#1f2340" strokeWidth={3} strokeLinecap="round" />}
        <text x={w / 2} y={small ? 126 : 91} textAnchor="middle" fontSize={small ? 18 : 20} fontWeight={900} fill={small ? col[id] : '#fff'}>
          {isRem ? `−${lab(val[id], unknown)}` : lab(val[id], unknown)}
        </text>
      </g>
    )
  })
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} 136`} className="block h-auto w-full" role="img" aria-label={caption}>
        <rect x={L} y={8} width={inner} height={40} rx={8} fill={view?.kind === 'join' ? '#dcfce7' : '#f0fdf4'} stroke={COL_W} strokeWidth={3} style={{ transition: 'fill 300ms' }} />
        <text x={W / 2} y={35} textAnchor="middle" fontSize={20} fontWeight={900} fill={COL_W}>{lab(c, unknown)}</text>
        <path d={`M${L} 54 v6 M${W - L} 54 v6`} stroke={COL_W} strokeWidth={2} />
        {parts}
      </svg>
      <figcaption className="mt-1 text-center text-sm font-extrabold text-ink-soft">{caption}</figcaption>
    </figure>
  )
}

export function MulModel({ a, b, c, view, unknown }: { a: number; b: number; c: number; view: View; unknown?: number }) {
  // a sıra × b sütun
  const cell = Math.min(40, 300 / Math.max(a, b))
  const pad = 26
  const W = b * cell + pad * 2, H = a * cell + pad * 2
  const g = view?.kind === 'groups' ? view : null
  // grup boyu b ise her sıra bir grup, a ise her sütun bir grup (a = b ise çarpmada sıra, bölmede sütun)
  const byRow = g ? (a === b ? !g.div : g.size === b) : null
  const groupCount = byRow === null ? 0 : byRow ? a : b
  const caption = !g
    ? `${a} sıra, her sırada ${b} tane: ${lab(c, unknown)}`
    : g.div
      ? unknown !== undefined
        ? `Eşit gruplara bak: her grupta ${lab(g.size, unknown)}, ${lab(g.count, unknown)} grup.`
        : `${ek(c, 'gen')} içinde ${g.count} tane ${g.size} var.`
      : g.count <= 6 && unknown === undefined
        ? `${g.count} tane ${g.size}: ${Array(g.count).fill(g.size).join(' + ')} = ${c}`
        : `${lab(g.count, unknown)} tane ${lab(g.size, unknown)} = ${lab(c, unknown)}`
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full" style={{ maxWidth: Math.max(220, W * 1.25), maxHeight: 300 }} role="img" aria-label={caption}>
        {Array.from({ length: groupCount }, (_, i) => {
          const x = byRow ? pad - 4 : pad + i * cell + 2
          const y = byRow ? pad + i * cell + 2 : pad - 4
          const w = byRow ? b * cell + 8 : cell - 4
          const h = byRow ? cell - 4 : a * cell + 8
          return (
            <g key={`${byRow}-${i}`} className="animate-pop">
              <rect x={x} y={y} width={w} height={h} rx={cell * 0.4} fill={i % 2 ? '#e0edff' : '#ffedd5'} stroke={i % 2 ? COL_B : COL_A} strokeWidth={2.5} />
              {g?.div && (
                <text x={byRow ? 12 : x + w / 2} y={byRow ? y + h / 2 + 5 : 16} textAnchor="middle" fontSize={13} fontWeight={900} fill="#1f2340">{i + 1}</text>
              )}
            </g>
          )
        })}
        {Array.from({ length: a }, (_, r) =>
          Array.from({ length: b }, (_, k) => (
            <circle key={`${r}-${k}`} cx={pad + k * cell + cell / 2} cy={pad + r * cell + cell / 2} r={cell * 0.32} fill={byRow === null ? '#d6457a' : byRow ? (r % 2 ? COL_B : COL_A) : k % 2 ? COL_B : COL_A} stroke="#fff" strokeWidth={1.5} />
          )),
        )}
      </svg>
      <figcaption className="mt-1 text-center text-sm font-extrabold text-ink-soft">{caption}</figcaption>
    </figure>
  )
}

/** Aile üçgeni: bütün tepede, parçalar altta */
export function FactTriangle({ a, b, c, ops, unknown, labels }: { a: number; b: number; c: number; ops: string; unknown?: number; labels?: [string, string, string] }) {
  const L = labels ?? [lab(a, unknown), lab(b, unknown), lab(c, unknown)]
  return (
    <svg viewBox="0 0 150 128" className="block h-auto w-full max-w-[150px]" role="img" aria-label={`İşlem ailesi: ${L.join(', ')}`}>
      <path d="M75 10 L140 118 L10 118 Z" fill="#fffbeb" stroke="#f59e0b" strokeWidth={4} strokeLinejoin="round" />
      <circle cx={75} cy={34} r={22} fill="#fff" stroke={COL_W} strokeWidth={3} />
      <text x={75} y={41} textAnchor="middle" fontSize={L[2].length > 3 ? 13 : 18} fontWeight={900} fill={COL_W}>{L[2]}</text>
      <circle cx={34} cy={100} r={22} fill="#fff" stroke={COL_A} strokeWidth={3} />
      <text x={34} y={107} textAnchor="middle" fontSize={L[0].length > 3 ? 13 : 18} fontWeight={900} fill={COL_A}>{L[0]}</text>
      <circle cx={116} cy={100} r={22} fill="#fff" stroke={COL_B} strokeWidth={3} />
      <text x={116} y={107} textAnchor="middle" fontSize={L[1].length > 3 ? 13 : 18} fontWeight={900} fill={COL_B}>{L[1]}</text>
      <text x={75} y={88} textAnchor="middle" fontSize={17} fontWeight={900} fill="#92400e">{ops}</text>
    </svg>
  )
}
