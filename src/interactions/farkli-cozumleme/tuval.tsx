import { useEffect, useState } from 'react'
import { Drag, Drop, n, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'

/* ───────────── sayılar ───────────── */

export const TARGET = 254

/** COL[e]: 10^e birimi (renkler Basamak Laboratuvarı ile aynı) */
export const COL = [
  { name: 'Birlikler', unit: 'birlik', shape: 'küpü', color: '#ca8a04', soft: '#fef9c3' },
  { name: 'Onluklar', unit: 'onluk', shape: 'çubuğu', color: '#16a34a', soft: '#dcfce7' },
  { name: 'Yüzlükler', unit: 'yüzlük', shape: 'karesi', color: '#ea580c', soft: '#ffedd5' },
]
/** Cümle içinde küçük harfli sütun adı: “onluklar” */
export const colName = (e: number) => COL[e].name.toLocaleLowerCase('tr-TR')

/** counts[e]: e birimindeki blok sayısı ([birlik, onluk, yüzlük]) */
export type Counts = number[]
export const START: Counts = [4, 5, 2]
export const EMPTY: Counts = [0, 0, 0]
export const valueOf = (c: Counts) => c.reduce((s, x, e) => s + x * 10 ** e, 0)
export const keyOf = (c: Counts) => c.join('-')
const ES = [2, 1, 0]
/** “1 yüzlük + 15 onluk + 4 birlik” (sıfır olan birimler yazılmaz) */
export const words = (c: Counts) => ES.filter((e) => c[e] > 0).map((e) => `${n(c[e])} ${COL[e].unit}`).join(' + ') || '0'
/** “100 + 150 + 4” */
export const sumText = (c: Counts) => ES.filter((e) => c[e] > 0).map((e) => n(c[e] * 10 ** e)).join(' + ') || '0'

/**
 * Bir bloğun ya da 10’lu demetin bir sütuna bırakılması.
 * pile-e: e sütunundaki yığından kalkan tek blok; hemen sağdaki sütuna bırakılınca 10 küçük birime bozulur.
 * bundle-e: e sütunundaki 10 blok; hemen soldaki sütuna bırakılınca 1 büyük birime birleşir.
 */
export type Move = { counts: Counts; kind: 'break' | 'join'; from: number } | { msg: string; mis?: string; at: number } | null
export function tryMove(c: Counts, item: string, target: string): Move {
  if (!target.startsWith('col-')) return null
  const to = Number(target.slice(4))
  const [kind, raw] = item.split('-')
  const from = Number(raw)
  if (to === from) return null
  const x = c.slice()
  if (kind === 'pile') {
    if (to === from - 1) {
      x[from]--
      x[to] += 10
      return { counts: x, kind: 'break', from }
    }
    if (to < from) return { msg: `1 ${COL[from].unit} önce 10 ${COL[from - 1].unit} olur. Bloğu hemen sağındaki ${colName(from - 1)} sütununa bırak.`, at: to }
    return { msg: `Tek bir ${COL[from].unit} ${COL[to].unit} olamaz: 1 ${COL[from + 1].unit} için 10 ${COL[from].unit} gerekir. Sütunda 10 blok olunca çıkan kırmızı çerçeveli 10’lu demeti kullan.`, mis: 'Tek bir küçük birimi büyük birime dönüştürüyor', at: to }
  }
  if (kind === 'bundle') {
    if (to === from + 1) {
      x[from] -= 10
      x[to]++
      return { counts: x, kind: 'join', from }
    }
    if (to > from) return { msg: `10 ${COL[from].unit} = 1 ${COL[from + 1].unit}. Demeti hemen solundaki ${colName(from + 1)} sütununa taşı.`, at: to }
    return { msg: `10 ${COL[from].unit} bir araya gelince büyük bir birime dönüşür. Demeti sola, ${colName(from + 1)} sütununa taşı.`, at: to }
  }
  return null
}

/* ───────────── taban blokları ───────────── */

/** Birim kare boyu: telefonda 8 px, tablette ve bilgisayarda 10 px */
export function useUnit() {
  const q = '(min-width: 640px)'
  const [big, setBig] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setBig(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return big ? 10 : 8
}

const GRID = 'bg-[linear-gradient(#0000_86%,#fff9_86%),linear-gradient(90deg,#0000_86%,#fff9_86%)] bg-[length:10%_10%]'

export function Block({ e, size }: { e: number; size: number }) {
  if (e === 0) return <span className="block rounded-[2px] bg-yellow-400 ring-1 ring-yellow-700" style={{ width: size, height: size }} />
  if (e === 1) return <span className="block rounded-[2px] bg-green-500 bg-[linear-gradient(#0000_86%,#fff9_86%)] bg-[length:100%_10%] ring-1 ring-green-800" style={{ width: size, height: size * 10 }} />
  return <span className={`block rounded-[3px] bg-orange-400 ring-1 ring-orange-700 ${GRID}`} style={{ width: size * 10, height: size * 10 }} />
}

/** Bir sütundaki bloklar. Birlikler onarlı sıralar hâlinde: sayması kolay olsun. */
function Pile({ e, count, u }: { e: number; count: number; u: number }) {
  if (e === 0)
    return (
      <span className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(10, ${u}px)` }}>
        {Array.from({ length: count }, (_, i) => <Block key={i} e={0} size={u} />)}
      </span>
    )
  return (
    <span className={`flex flex-wrap justify-center ${e === 1 ? 'gap-[3px]' : 'gap-1.5'}`}>
      {Array.from({ length: count }, (_, i) => <Block key={i} e={e} size={u} />)}
    </span>
  )
}

/** Kırmızı çerçeveli 10’lu demet: soldaki sütuna sürüklenince birleşir */
function Bundle({ e, dnd, disabled, u }: { e: number; dnd: Dnd; disabled?: boolean; u: number }) {
  const ten = (
    <span className="flex gap-[2px]">
      {Array.from({ length: 10 }, (_, i) => <Block key={i} e={e} size={e === 0 ? u - 2 : Math.max(4, u / 2)} />)}
    </span>
  )
  return (
    <Drag
      dnd={dnd}
      item={`bundle-${e}`}
      label={`10 ${COL[e].unit}: birleştirmek için sola sürükle`}
      disabled={disabled}
      ghost={<span className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 ring-2 ring-red-400">{ten}</span>}
      className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl bg-white p-2 ring-2 ring-red-400 animate-pop"
    >
      {ten}
      <span className="text-[11px] leading-none font-black text-red-600">← 10 {COL[e].unit}: sola sürükle</span>
    </Drag>
  )
}

/**
 * Polypad tuvali gibi üç sütun: Yüzlükler · Onluklar · Birlikler.
 * Bir sütunun blok yığını tek, büyük bir tutma alanıdır (tablette parmakla rahat tutulsun): yığına dokunup
 * sürükleyince yığından 1 blok kalkar. Hemen sağdaki sütuna bırakılırsa bozulur. 10 ya da daha fazla blok olan
 * sütunda 10’lu demet çıkar (soldaki sütuna: birleştir). Her sütun bir bırakma hedefidir (col-e).
 * movable: hangi sütunların yığını sürüklenebilir (varsayılan yüzlük ve onluk; kurarken birlik de).
 */
export function Mat({ counts, dnd, wrong, locked, movable = [1, 2], bundles = true }: { counts: Counts; dnd: Dnd; wrong?: number | null; locked?: boolean; movable?: number[]; bundles?: boolean }) {
  const u = useUnit()
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `minmax(${u * 10 + 24}px, 1fr) minmax(0, 1.25fr) minmax(${u * 10 + 26}px, 1.1fr)` }}>
      {ES.map((e) => {
        const c = counts[e]
        const canMove = !locked && c > 0 && movable.includes(e)
        return (
          <Drop key={e} dnd={dnd} id={`col-${e}`} className={`flex min-h-[300px] flex-col gap-1.5 rounded-2xl p-1.5 ring-1 ring-black/10 sm:min-h-[340px] ${wrong === e ? 'animate-shake ring-4! ring-amber-400!' : ''}`} style={{ background: COL[e].soft }}>
            <div className="rounded-xl py-1.5 text-center" style={{ background: COL[e].color }}>
              <p className="text-[11px] leading-tight font-black tracking-wide text-white uppercase sm:text-sm">{COL[e].name}</p>
            </div>
            <p className="text-center leading-none">
              <span className="text-3xl font-black tabular-nums sm:text-4xl" style={{ color: COL[e].color }}>{c}</span>
              <span className="block text-[11px] font-black text-ink-soft tabular-nums sm:text-xs">{c} {COL[e].unit} = {n(c * 10 ** e)}</span>
            </p>
            {bundles && e < 2 && c >= 10 && <Bundle e={e} dnd={dnd} disabled={locked} u={u} />}
            {c > 0 &&
              (canMove ? (
                <Drag
                  dnd={dnd}
                  item={`pile-${e}`}
                  label={`${COL[e].name} yığınından 1 ${COL[e].unit}`}
                  ghost={<Block e={e} size={u + 2} />}
                  className="flex min-h-16 w-full flex-1 flex-col items-center justify-start gap-1 rounded-xl p-1.5 ring-2 ring-white/0 hover:ring-white/80"
                >
                  <Pile e={e} count={c} u={u} />
                  <span className="mt-auto pt-1 text-[10px] font-black text-ink-soft">tut ve sürükle: 1 {COL[e].unit} kalkar</span>
                </Drag>
              ) : (
                <div className="flex flex-1 justify-center p-1.5" aria-hidden><Pile e={e} count={c} u={u} /></div>
              ))}
          </Drop>
        )
      })}
    </div>
  )
}

/** Parça kutusu: her bloktan sonsuz kaynak; tuvaldeki fazla blok buraya geri sürüklenince silinir */
export function PartsBox({ dnd }: { dnd: Dnd }) {
  const u = useUnit()
  return (
    <Drop dnd={dnd} id="tray" className="rounded-2xl bg-white p-2 ring-1 ring-line">
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-ink-soft uppercase sm:text-xs">Parça kutusu · bloğu tut, sütununa sürükle · fazlasını buraya geri at</p>
      <div className="flex items-end justify-around gap-2">
        {ES.map((e) => (
          <Drag key={e} dnd={dnd} item={`src-${e}`} label={`Parça kutusundan 1 ${COL[e].unit}`} ghost={<Block e={e} size={u + 2} />} className="flex min-h-16 min-w-16 flex-col items-center justify-end gap-1 rounded-xl px-3 py-2 ring-1 ring-line">
            <Block e={e} size={u} />
            <span className="text-xs font-black" style={{ color: COL[e].color }}>1 {COL[e].unit}</span>
          </Drag>
        ))}
      </div>
    </Drop>
  )
}

/** Bir çözümlemenin küçük, sürüklenmeyen resmi */
export function MiniBlocks({ counts }: { counts: Counts }) {
  return (
    <div className="flex flex-wrap items-end gap-2" aria-hidden>
      {ES.filter((e) => counts[e] > 0).map((e) => (
        <div key={e} className={`flex flex-wrap items-end gap-[2px] ${e === 0 ? 'max-w-[74px]' : 'max-w-[160px]'}`}>
          {Array.from({ length: counts[e] }, (_, i) => <Block key={i} e={e} size={e === 0 ? 5 : 4} />)}
        </div>
      ))}
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

export const TOOL: Record<'box' | 'break' | 'join' | 'reset' | 'card' | 'sort', ToolInfo> = {
  box: { icon: <span className="grid h-5 w-6 place-items-center rounded-md bg-white text-[10px] ring-1 ring-line">📦</span>, name: 'Parça kutusu', text: 'Yüzlük, onluk ya da birlik bloğunu tutup kendi sütununa sürükle. Fazla koyduğun bloğu kutuya geri sürükle.' },
  break: { icon: <span className="size-4 rounded-[3px] bg-orange-400 ring-2 ring-orange-600" />, name: 'Blok yığını', text: 'Bir sütundaki bloklara dokunup sürükle; yığından 1 blok kalkar. Hemen sağındaki sütuna bırakınca bozulur: 1 yüzlük → 10 onluk, 1 onluk → 10 birlik.' },
  join: { icon: <span className="h-4 w-6 rounded-[3px] bg-red-100 ring-2 ring-red-400" />, name: '10’lu demet', text: 'Bir sütunda 10 ya da daha fazla blok olunca kırmızı çerçeveyle çıkar. Hemen solundaki sütuna sürükleyince 10 blok 1 büyük birime birleşir.' },
  reset: { icon: <span className="text-base leading-none">↺</span>, name: 'Baştan', text: 'Blokları yeniden 2 yüzlük + 5 onluk + 4 birlik yapar. Bulduğun çözümlemeler defterde kalır.' },
  card: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[10px] font-black ring-1 ring-line">14</span>, name: 'Sayı kartı', text: 'Bir kartı tutup çözümlemedeki boş kutuya bırak. Uymazsa geri döner ve ipucu çıkar. İstersen önce bloklarla dene.' },
  sort: { icon: <span className="text-base leading-none">🧺</span>, name: 'Çözümleme kartları ve sepetler', text: 'Her kartı hesapla. Toplamı 254 ise “254 eder”, değilse “254 etmez” sepetine bırak.' },
}
