import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { Readout, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Kesir Sayı Doğrusu — anlamsal yakınlaştırma:
 *  - İki parmakla yakınlaştır: çentikler 1 → 0,5 → 0,1 → 0,01 olarak incelir (ondalık yakınlaştırıcı).
 *  - "Payda" seçilirse 0–1 arası o kadar eş parçaya bölünür ve çentikler kesir olarak etiketlenir.
 *  - Noktayı sürükle: konumu kesir ve ondalık olarak okunur.
 */
type V = { x: number; den: number }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

function FractionTicks({ den }: { den: number }) {
  const P = usePlane()
  if (!den) return null
  const y0 = P.sy(0)
  const from = Math.floor(P.view.xMin), to = Math.ceil(P.view.xMax)
  const px = P.unitPx / den
  if (px < 6) return null
  const out = []
  for (let w = from; w <= to; w++)
    for (let k = 1; k < den; k++) {
      const v = w + k / den
      if (v < P.view.xMin || v > P.view.xMax) continue
      const nu = w * den + k
      out.push(
        <g key={`${w}-${k}`}>
          <line x1={P.sx(v)} x2={P.sx(v)} y1={y0 - 14} y2={y0 + 14} stroke="#d6457a" strokeWidth={2} />
          {px > 26 && (
            <foreignObject x={P.sx(v) - 20} y={y0 - 58} width={40} height={40}>
              <div className="flex h-full items-center justify-center text-[15px] font-black text-[#be185d]"><MathText text={`[[${nu}/${den}]]`} /></div>
            </foreignObject>
          )}
        </g>,
      )
    }
  return <g>{out}</g>
}

export const kesirdogrusu: ToolDef<V> = {
  id: 'kesirdogrusu',
  defaultConfig: { min: 0, max: 2, dens: [2, 3, 4, 5, 6, 8, 10] },
  initial: () => ({ x: 0.5, den: 4 }),
  /** hedef: { value } (±0.01) */
  check: (v, t) => Math.abs(v.x - n(t, 'value')) <= 0.01,
  Component: ({ value, onChange, config, target, locked }) => {
    const dens = config.dens ?? [2, 3, 4, 5, 6, 8, 10]
    const snapTo = (x: number) => {
      if (value.den) {
        const s = Math.round(x * value.den) / value.den
        if (Math.abs(s - x) < 0.5 / value.den) return s
      }
      return Math.round(x * 100) / 100
    }
    const nu = Math.round(value.x * (value.den || 1))
    const onDen = value.den && Math.abs(nu / value.den - value.x) < 1e-9
    const g = onDen ? gcd(nu, value.den) || 1 : 1
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className="self-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Eş parça</span>
          <ToolButton active={!value.den} onClick={() => !locked && onChange({ ...value, den: 0 })}>Yok</ToolButton>
          {dens.map((d) => <ToolButton key={d} active={value.den === d} onClick={() => !locked && onChange({ ...value, den: d })}>{d}</ToolButton>)}
        </div>
        <div className="w-full max-w-3xl">
          <Plane mode="x" initial={{ xMin: (config.min ?? 0) - 0.25, xMax: (config.max ?? 2) + 0.25, yMin: -1, yMax: 1 }} minSpan={0.02} maxSpan={60} label="Kesir sayı doğrusu">
            <FractionTicks den={value.den} />
            <DragPoint x={value.x} y={0} r={13} disabled={locked} onChange={(p) => onChange({ ...value, x: snapTo(p.x) })} />
          </Plane>
        </div>
        <p className="text-center text-sm font-bold text-ink-soft">Noktayı sürükle. İki parmakla yakınlaştırınca onda birler ve yüzde birler belirir.</p>
        {(!target || locked) && (
          <Readout>
            {onDen && value.den ? <span className="mr-3 inline-block align-middle text-2xl"><MathText text={`[[${nu}/${value.den}]]`} />{g > 1 && <span className="ml-2 text-base text-white/70">= <MathText text={`[[${nu / g}/${value.den / g}]]`} /></span>}</span> : null}
            <span className="text-white/80">≈ {value.x.toLocaleString('tr-TR', { maximumFractionDigits: 3 })}</span>
          </Readout>
        )}
      </div>
    )
  },
}
