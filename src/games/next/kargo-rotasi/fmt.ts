import { ek } from '../../../lib/generators'

/** Türkçe sayı yazımı: 4860 → "4.860", 2.4 → "2,4" */
export const nf = (n: number, maxDec = 3) => {
  const s = (Math.abs(n) < 1e-12 ? 0 : n).toLocaleString('tr-TR', { maximumFractionDigits: maxDec })
  return s.replace('-', '−')
}

type Kind = 'acc' | 'dat' | 'abl' | 'loc' | 'gen' | 'poss' | 'dist'

/**
 * Ondalık sayılarda da doğru ek: 2,4 → "2,4’ü" (dört), 0,75 → "0,75’i" (yetmiş beş).
 * Tam sayılarda ek() ile aynı.
 */
export function ekD(n: number, kind: Kind): string {
  if (Number.isInteger(n)) return ek(n, kind)
  const s = nf(n)
  const frac = s.split(',')[1] ?? '0'
  return s + ek(Number(frac), kind, false)
}

/** Uzunluk metni (metre girdi) — sınıfa göre birim */
export function fmtLen(m: number, grade: number): string {
  if (grade <= 3) return `${nf(m)} m`
  if (grade === 4) {
    if (m < 1000) return `${nf(m)} m`
    const km = Math.floor(m / 1000), r = m % 1000
    return r ? `${km} km ${r} m` : `${km} km`
  }
  return `${nf(m / 1000)} km`
}

/** Kütle metni (gram girdi) */
export function fmtMass(g: number, style: 'kgg' | 'dec' | 'kg' | 'g'): string {
  if (style === 'g') return `${nf(g)} g`
  if (style === 'kg') return `${nf(g / 1000)} kg`
  if (style === 'dec') return g < 1000 ? `${nf(g)} g` : `${nf(g / 1000)} kg`
  const kg = Math.floor(g / 1000), r = g % 1000
  if (!kg) return `${r} g`
  return r ? `${kg} kg ${r} g` : `${kg} kg`
}

export const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
