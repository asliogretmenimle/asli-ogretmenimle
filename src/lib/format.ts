/** Türkçe sayı yazımı: 12345 → "12.345", 0.5 → "0,5" */
export function fmt(n: number, maxDecimals = 3): string {
  return n.toLocaleString('tr-TR', { maximumFractionDigits: maxDecimals })
}

/** Binlik ayırıcı olmadan, ondalık virgüllü: 0.5 → "0,5" */
export function fmtPlain(n: number, maxDecimals = 3): string {
  const r = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals
  return String(r).replace('.', ',')
}

/** Cevap karşılaştırması için normalleştirme */
export function normalizeAnswer(raw: string): string {
  let s = raw.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, '').replace(/−/g, '-')
  // 12.345 → binlik ayırıcı
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  s = s.replace(/,/g, '.')
  if (/^-?\d*\.?\d+$/.test(s)) {
    const n = Number(s)
    if (!Number.isNaN(n)) return String(n)
  }
  return s
}

/** "0,5|0.5" gibi alternatifli bir cevapla karşılaştırır */
export function answerMatches(input: string, expected: string): boolean {
  const n = normalizeAnswer(input)
  if (!n) return false
  return expected.split('|').some((alt) => normalizeAnswer(alt) === n)
}

export function turkishSlug(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Arama için Türkçe karakterleri sadeleştirir */
export const searchKey = (s: string) => turkishSlug(s).replace(/-/g, ' ')
