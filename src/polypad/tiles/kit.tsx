/**
 * Parça tanımlarının ortak yardımcıları.
 *
 * Parça yazarken kurallar:
 * - render() yerel koordinatta çizer; 0,0 parçanın merkezidir (döndürme bu noktanın etrafında olur).
 * - bounds() aynı koordinatta sınır kutusunu verir; seçim çerçevesi ve dışa aktarma bunu kullanır.
 * - Parçanın içindeki dokunulabilir öğelere data-act="ad" (ve gerekirse data-v="değer") verin;
 *   dokunulunca onTap(t, api, { act, v, local }) çağrılır. data-act'siz yere dokunmak yalnızca parça zaten seçiliyse onTap'i çağırır.
 * - Sürüklenebilir iç kontroller (saat ibresi, kaydırıcı düğmesi…) için handles() + onHandle() kullanın.
 * - Durum her zaman t.p içinde tutulur; api.updateP(t.id, {...}, true) ile değiştirilir (true: geri alınabilir adım).
 * - Animasyon için CSS geçişleri kullanın (ör. style={{ transition: 'transform .8s' }}); setInterval gerekiyorsa
 *   render içinde küçük bir React bileşeni döndürün ve ctx.thumb iken animasyonu kapatın.
 */
import type { ReactNode } from 'react'
import type { ActionDef, Box, PadApi, Props, Pt, Tile, TileDef } from '../types'
import { boundsOf, centerPts, round, shade, toWorld } from '../geom'

export { C, PALETTE, STROKE } from '../colors'
export { UNIT, SIDE } from '../geom'

/** Dolgu rengine göre kenar rengi */
export const edge = (fill: string) => shade(fill, -0.28)

/** Yazı tipi ayarları (tuvalde ve dışa aktarmada aynı görünsün) */
export const FONT = "'Nunito Variable', ui-rounded, system-ui, sans-serif"

export function Label({ x = 0, y = 0, size = 16, color = '#242436', weight = 700, children, anchor = 'middle', ...rest }: { x?: number; y?: number; size?: number; color?: string; weight?: number; anchor?: 'start' | 'middle' | 'end'; children: ReactNode } & Record<string, unknown>) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={color} textAnchor={anchor} dominantBaseline="central" fontFamily={FONT} style={{ pointerEvents: 'none', userSelect: 'none' }} {...rest}>
      {children}
    </text>
  )
}

/** Küçük satır içi simge (eylem çubuğu için) */
export const Icon = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export const ICONS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6',
  angle: 'M4 20h16M4 20L16 6M10 20a6 6 0 0 0-1.8-4.3',
  ruler: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  split: 'M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4',
  merge: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM14 4h4v16h-4z',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  grid: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  label: 'M4 7V4h16v3M9 20h6M12 4v16',
  flipH: 'M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z',
  rotate: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  shuffle: 'M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
  cube: 'M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8',
  hash: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
  arrowL: 'M19 12H5M11 6l-6 6 6 6',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  check: 'M4 12l5 5L20 6',
  table: 'M3 4h18v16H3zM3 10h18M3 15h18M10 4v16',
  chart: 'M4 20V10M10 20V4M16 20v-7M2 20h20',
  fraction: 'M6 4v6M4 6l2-2M14 20h4l-4-4a2 2 0 1 1 3-2M19 4L5 20',
  percent: 'M19 5L5 19M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  decimal: 'M5 18h.01M10 6a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V9a3 3 0 0 1 3-3zM18 6a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V9a3 3 0 0 1 3-3z',
  net: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
} as const

export const action = (id: string, label: string, icon: keyof typeof ICONS, run: ActionDef['run'], active?: boolean): ActionDef => ({
  id,
  label,
  icon: <Icon d={ICONS[icon]} />,
  run,
  active,
})

/** Bir p alanını açıp kapatan eylem */
export const toggle = (t: Tile, key: string, label: string, icon: keyof typeof ICONS) =>
  action(`toggle-${key}`, label, icon, (tile, api) => api.updateP(tile.id, (p) => ({ [key]: !p[key] }), true), !!t.p[key])

/** Sayıyı api.prompt ile soran yardımcı */
export async function askNumber(api: PadApi, label: string, value: number, min = -Infinity, max = Infinity): Promise<number | null> {
  const s = await api.prompt(label, String(value).replace('.', ','))
  if (s == null) return null
  const n = Number(s.replace(',', '.').trim())
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

export const rectBox = (w: number, h: number): Box => ({ x: -w / 2, y: -h / 2, w, h })

export const ptsBox = (pts: Pt[]): Box => boundsOf(pts)

/**
 * Yerel noktalar değişince (ör. serbest çokgen köşesi sürüklendi) parçayı yeniden merkezler:
 * noktalar 0,0 etrafına taşınır, parça konumu dünya koordinatında aynı yerde kalacak şekilde kaydırılır.
 */
export function recenter(t: Tile, pts: Pt[]): { x: number; y: number; pts: Pt[] } {
  const b = boundsOf(pts)
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const w = toWorld(t, c)
  return { x: w.x, y: w.y, pts: centerPts(pts).map((p) => ({ x: round(p.x, 2), y: round(p.y, 2) })) }
}

/** Basit tanım kurucu: zorunlu olmayan alanlar için makul varsayılanlar */
export function def(d: TileDef): TileDef {
  return d
}

/** Kaynak özelliklerini sayıya çeviren küçük yardımcı */
export const num = (p: Props, key: string, fallback: number) => (typeof p[key] === 'number' ? (p[key] as number) : Number(p[key] ?? fallback) || fallback)

/** Rastgele tamsayı [a, b] */
export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
