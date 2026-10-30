/**
 * Çarpanlar ve katlar (8. sınıf, 1. ünite) içerikleri için ortak sayı kuramı yardımcıları.
 * Hepsi pozitif tam sayılar için yazılmıştır.
 */

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const lcm = (a: number, b: number) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0)
export const gcdAll = (xs: number[]) => xs.reduce((g, x) => gcd(g, x))
export const lcmAll = (xs: number[]) => xs.reduce((l, x) => lcm(l, x))
export const coprime = (a: number, b: number) => gcd(a, b) === 1

export function isPrime(n: number) {
  if (n < 2 || !Number.isInteger(n)) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

/** n’ye kadar (n dâhil) asal sayılar */
export const primesUpTo = (n: number) => Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 2).filter(isPrime)

/** Pozitif bölenler, küçükten büyüğe: 12 → [1, 2, 3, 4, 6, 12] */
export function divisors(n: number) {
  const small: number[] = []
  const big: number[] = []
  for (let d = 1; d * d <= n; d++) {
    if (n % d) continue
    small.push(d)
    if (d * d !== n) big.unshift(n / d)
  }
  return [...small, ...big]
}

/** Çarpan çiftleri (a ≤ b): 12 → [[1, 12], [2, 6], [3, 4]] */
export const factorPairs = (n: number): [number, number][] => divisors(n).filter((d) => d * d <= n).map((d) => [d, n / d])

/** Ortak bölenler: (12, 18) → [1, 2, 3, 6] */
export const commonDivisors = (a: number, b: number) => divisors(gcd(a, b))

/** Asal çarpanlar tekrarlı, küçükten büyüğe: 360 → [2, 2, 2, 3, 3, 5] */
export function primeFactors(n: number) {
  const out: number[] = []
  let m = n
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      out.push(p)
      m /= p
    }
  }
  if (m > 1) out.push(m)
  return out
}

/** Asal çarpanlar ve üsleri: 360 → [[2, 3], [3, 2], [5, 1]] */
export function factorize(n: number): [number, number][] {
  const map = new Map<number, number>()
  for (const p of primeFactors(n)) map.set(p, (map.get(p) ?? 0) + 1)
  return [...map.entries()]
}

/** En küçük asal bölen (n ≥ 2) */
export const smallestPrimeFactor = (n: number) => primeFactors(n)[0] ?? n

/** Bölen sayısı: (a+1)(b+1)… */
export const divisorCount = (n: number) => factorize(n).reduce((s, [, e]) => s * (e + 1), 1)

const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' }
/** Üst simge: 12 → ¹² */
export const sup = (n: number) => String(n).split('').map((c) => SUP[c] ?? c).join('')

/** Üslü asal çarpan yazımı: 360 → "2³ · 3² · 5" */
export const factorString = (n: number) => (n === 1 ? '1' : factorize(n).map(([p, e]) => (e > 1 ? `${p}${sup(e)}` : String(p))).join(' · '))

/** Tam kare mi? */
export const isSquare = (n: number) => Number.isInteger(Math.sqrt(n))
