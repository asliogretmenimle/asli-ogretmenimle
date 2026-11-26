export const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function shuffleNotSame<T>(arr: readonly T[], same: (a: T[], b: readonly T[]) => boolean = (a, b) => a.every((x, i) => x === b[i])): T[] {
  if (arr.length < 2) return arr.slice()
  for (let tries = 0; tries < 20; tries++) {
    const s = shuffle(arr)
    if (!same(s, arr)) return s
  }
  const s = arr.slice()
  ;[s[0], s[1]] = [s[1], s[0]]
  return s
}

/** Birbirinden farklı n tam sayı */
export function distinctInts(n: number, min: number, max: number, exclude: number[] = []): number[] {
  const set = new Set<number>()
  const span = max - min + 1
  let guard = 0
  while (set.size < Math.min(n, span - exclude.length) && guard++ < 1000) {
    const v = randInt(min, max)
    if (!exclude.includes(v)) set.add(v)
  }
  return [...set]
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b)
