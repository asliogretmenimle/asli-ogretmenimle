import { ek } from '../../../lib/generators'

type Kind = 'acc' | 'dat' | 'abl' | 'loc' | 'gen' | 'poss' | 'dist'

/** Türkçe sayı yazımı: 2.5 → "2,5", −63 → "−63" */
export const fmt = (v: number, max = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: max }).replace('-', '−')

/** Yalnız ek (ondalık ve negatif sayılar dâhil): 2,5 → "’e", −63 → "’e", 7,5 → "’e", 0,25 → "’e" */
export function suffix(v: number, kind: Kind): string {
  const s = fmt(Math.abs(v))
  const [whole, frac] = s.split(',')
  const n = frac ? Number(frac) : Number(whole.replace(/\./g, ''))
  return ek(n, kind, false)
}

/** Sayı + ek: ekD(2.5, 'dat') → "2,5’e" */
export const ekD = (v: number, kind: Kind) => fmt(v) + suffix(v, kind)

/** İki sayı neredeyse eşit mi? */
export const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
