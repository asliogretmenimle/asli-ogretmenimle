/** Eksen yardımcıları: okunaklı çentik aralığı ve biçimlendirme */

/** Görünür aralık ve piksel genişliğine göre "güzel" bir adım seçer (1, 2, 5 × 10^k) */
export function niceStep(span: number, pixels: number, minPx = 48): number {
  const raw = (span / Math.max(1, pixels)) * minPx
  const pow = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow
  return 10 * pow
}

/** [min, max] aralığındaki adım katları */
export function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = []
  const start = Math.ceil(min / step - 1e-9) * step
  for (let v = start, i = 0; v <= max + 1e-9 && i < 2000; v = start + ++i * step) out.push(round(v, step))
  return out
}

/** Adıma göre gereksiz ondalıkları atar */
export function round(v: number, step: number) {
  const d = decimalsFor(step)
  return Math.round(v * 10 ** d) / 10 ** d
}

export const decimalsFor = (step: number) => Math.max(0, Math.min(6, Math.ceil(-Math.log10(step) - 1e-9)))

/** Türkçe sayı yazımı, adıma uygun ondalıkla */
export function fmtTick(v: number, step: number) {
  const d = decimalsFor(step)
  const s = (Math.abs(v) < 1e-12 ? 0 : v).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })
  return s.replace('-', '−')
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Değeri en yakın adım katına yuvarlar */
export const snap = (v: number, step: number) => round(Math.round(v / step) * step, step)
