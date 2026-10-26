/** Kesir Takımadaları — küçük rasyonel sayı yardımcıları */

export type Fmt = 'frac' | 'mixed' | 'dec'
/** Bir sayı ve nasıl yazılacağı */
export interface Num {
  n: number
  d: number
  fmt?: Fmt
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const val = (q: { n: number; d: number }) => q.n / q.d
export const eq = (a: number, b: number) => Math.abs(a - b) < 1e-7

/** Türkçe ondalık yazım: 0,35 */
export const dec = (v: number, max = 3) => v.toLocaleString('tr-TR', { maximumFractionDigits: max })

/** MathText biçiminde etiket */
export function label(q: Num): string {
  const fmt = q.fmt ?? 'frac'
  if (fmt === 'dec') return dec(q.n / q.d)
  if (fmt === 'mixed' && q.n >= q.d) {
    const w = Math.floor(q.n / q.d)
    const r = q.n - w * q.d
    return r ? `[[${w} ${r}/${q.d}]]` : `${w}`
  }
  return `[[${q.n}/${q.d}]]`
}

/** Sadeleştirilmiş kesir anahtarı (aynı nokta mı?) */
export function key(v: number, maxDen = 1000): string {
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d)
    if (Math.abs(n / d - v) < 1e-9) return `${n}/${d}`
  }
  return v.toFixed(6)
}

/** Payda D'lik bölmede x noktasının adı (çentik üzerindeyse) */
export function nameAt(x: number, D: number): { k: number; D: number } | null {
  if (!D) return null
  const k = Math.round(x * D)
  return Math.abs(k / D - x) < 1e-7 ? { k, D } : null
}

/** Tek bir çentik adını yazar: ondalık modda 0,35; yoksa [[k/D]] */
export function tickLabel(k: number, D: number, decimal: boolean): string {
  if (decimal) return dec(k / D)
  return `[[${k}/${D}]]`
}

/**
 * Yakınlaştırmaya göre görünür bölme: seçilen payda d; başlangıç görünümüne göre
 * her 2× yakınlaştırmada parçalar ikiye (ondalık modda her 10× yakınlaştırmada ona) bölünür.
 * zoom = şimdiki birim pikseli / başlangıçtaki birim pikseli
 */
export function visibleDen(d: number, unitPx: number, decimal: boolean, zoom: number): number {
  if (!d) return 0
  const mult = decimal ? 10 : 2
  let k = Math.max(0, Math.floor(Math.log(Math.max(zoom, 1e-6)) / Math.log(mult) + 0.12))
  let D = d * mult ** k
  while (k > 0 && unitPx / D < 12) {
    k--
    D /= mult
  }
  if (unitPx / D < 10) return 0
  return Math.min(D, decimal ? 1000 : 256)
}
