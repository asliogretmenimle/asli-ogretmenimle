import { MathText } from '../../../components/MathText'
import { fmt, isInt, term, zero, type Rel, type Side } from './algebra'

/**
 * Görsel temsil: cebir karoları.
 *  Uzun karo = x, küçük kare = 1, 10'luk çubuk = 10. Kırmızı karolar negatiftir.
 */
function Mat({ sd, dark, label }: { sd: Side; dark: boolean; label: string }) {
  const tiles = []
  if (!zero(sd.a)) {
    const neg = sd.a.n < 0
    const abs = { n: Math.abs(sd.a.n), d: sd.a.d }
    const cls = neg ? 'bg-rose-500 ring-rose-800 text-white' : 'bg-emerald-500 ring-emerald-800 text-white'
    if (isInt(abs) && abs.n <= 8) for (let i = 0; i < abs.n; i++) tiles.push(<span key={`x${i}`} className={`grid h-11 w-5 place-items-center rounded-md text-[11px] font-black ring-1 ${cls}`}>{neg ? '−x' : 'x'}</span>)
    else tiles.push(<span key="xf" className={`grid h-11 min-w-9 place-items-center rounded-md px-1 text-[12px] font-black ring-1 ${cls}`} style={{ height: abs.n < abs.d ? 28 : 44 }}><MathText text={(neg ? '−' : '') + term(abs)} /></span>)
  }
  if (!zero(sd.b)) {
    const neg = sd.b.n < 0
    const abs = { n: Math.abs(sd.b.n), d: sd.b.d }
    const cls = neg ? 'bg-rose-400 ring-rose-700 text-white' : 'bg-amber-300 ring-amber-700 text-amber-950'
    if (isInt(abs) && abs.n <= 60) {
      const tens = Math.floor(abs.n / 10), ones = abs.n % 10
      for (let i = 0; i < tens; i++) tiles.push(<span key={`t${i}`} className={`grid h-5 w-[3.6rem] place-items-center rounded-[4px] text-[10px] font-black ring-1 ${cls} [background-image:repeating-linear-gradient(90deg,transparent_0_calc(10%-1px),rgb(0_0_0/0.18)_calc(10%-1px)_10%)]`}>{neg ? '−10' : '10'}</span>)
      for (let i = 0; i < ones; i++) tiles.push(<span key={`o${i}`} className={`size-5 rounded-[4px] ring-1 ${cls}`} />)
    } else tiles.push(<span key="c" className={`grid h-6 min-w-9 place-items-center rounded-md px-1.5 text-[12px] font-black ring-1 ${cls}`}><MathText text={(neg ? '−' : '') + fmt(abs)} /></span>)
  }
  if (!tiles.length) tiles.push(<span key="0" className="text-sm font-black opacity-50">0</span>)
  return (
    <div className={`min-h-16 flex-1 rounded-xl p-2 ${dark ? 'bg-slate-900/60 ring-1 ring-slate-600' : 'bg-white/80 ring-1 ring-amber-200'}`}>
      <p className={`mb-1 text-[10px] font-black tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-amber-800/70'}`}>{label}</p>
      <div className="flex flex-wrap items-end gap-1">{tiles}</div>
    </div>
  )
}

export function Tiles({ L, R, rel, dark, unbalanced }: { L: Side; R: Side; rel: Rel; dark: boolean; unbalanced?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/80 ring-1 ring-slate-600' : 'bg-[#fbf3e2] ring-1 ring-amber-200'}`}>
      <p className={`mb-2 text-xs font-black tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-amber-800'}`}>Cebir karoları</p>
      <div className="flex items-stretch gap-2">
        <Mat sd={L} dark={dark} label="Sol" />
        <span className={`self-center text-2xl font-black ${unbalanced ? 'text-rose-500' : dark ? 'text-amber-300' : 'text-amber-700'}`}>{unbalanced ? '≠' : rel}</span>
        <Mat sd={R} dark={dark} label="Sağ" />
      </div>
    </div>
  )
}
