/**
 * Öğretmen raporu — veritabanı yok.
 * Bir oturum (etkinlik ya da oyun) boyunca olaylar toplanır, bitince özet bir linke gömülür:
 *   /rapor#<sıkıştırılmış base64url>
 * Aslı Hoca linki açınca raporu görür ve kendi cihazındaki panele ekleyebilir.
 */

export interface ReportData {
  v: 1
  /** etkinlik / oyun kimliği ve başlığı */
  id: string
  title: string
  kind: 'etkinlik' | 'oyun'
  grade?: number
  /** öğrencinin adı (öğrencinin girdiği) */
  name: string
  /** başlangıç zamanı (ms) ve süre (sn) */
  at: number
  dur: number
  /** soru/tur sayısı ve ilk denemede doğru */
  total: number
  first: number
  /** toplam deneme, yanlış deneme, ipucu */
  tries: number
  wrong: number
  hints: number
  /** kullanılan stratejiler: ad → sayı */
  strategies: Record<string, number>
  /** fark edilen kavram yanılgıları (kısa metin) */
  misconceptions: string[]
  /** öğrencinin "Düşün ve Paylaş" cevabı */
  reflection?: string
  reflectQ?: string
  /** öğrencinin kendini değerlendirmesi: 0 kolay, 1 biraz düşündüm, 2 zorlandım */
  feeling?: number
  /** birden çok çözüm üretilen görevlerde bulunan farklı çözüm sayısı */
  solutions?: number
}

export class SessionTracker {
  private d: Omit<ReportData, 'name'>
  private miscSet = new Set<string>()
  constructor(id: string, title: string, kind: ReportData['kind'], grade?: number) {
    this.d = { v: 1, id, title, kind, grade, at: Date.now(), dur: 0, total: 0, first: 0, tries: 0, wrong: 0, hints: 0, strategies: {}, misconceptions: [] }
  }
  /** Bir deneme: ok doğru mu, firstTry ilk deneme mi */
  attempt(ok: boolean) {
    this.d.tries++
    if (!ok) this.d.wrong++
  }
  /** Bir soru/tur tamamlandı */
  item(solvedFirstTry: boolean) {
    this.d.total++
    if (solvedFirstTry) this.d.first++
  }
  hint() {
    this.d.hints++
  }
  strategy(name: string) {
    this.d.strategies[name] = (this.d.strategies[name] ?? 0) + 1
  }
  misconception(text: string) {
    const t = text.trim().slice(0, 140)
    if (t && !this.miscSet.has(t) && this.miscSet.size < 8) {
      this.miscSet.add(t)
      this.d.misconceptions.push(t)
    }
  }
  solutions(n: number) {
    this.d.solutions = Math.max(this.d.solutions ?? 0, n)
  }
  /** Toplu sonuç ayarla (eski motorlar için) */
  setTotals(total: number, first: number) {
    this.d.total = total
    this.d.first = first
  }
  snapshot(): Omit<ReportData, 'name'> {
    return { ...this.d, dur: Math.round((Date.now() - this.d.at) / 1000), strategies: { ...this.d.strategies }, misconceptions: [...this.d.misconceptions] }
  }
}

// ─── Kodlama: JSON → deflate → base64url ───────────────────────────────────

const toB64u = (bytes: Uint8Array) => {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64u = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await res.arrayBuffer())
}

export async function encodeReport(r: ReportData): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(r))
  if (typeof CompressionStream !== 'undefined') {
    try {
      return 'z' + toB64u(await pipe(json, new CompressionStream('deflate-raw')))
    } catch {
      /* düz kodlamaya geç */
    }
  }
  return 'j' + toB64u(json)
}

export async function decodeReport(code: string): Promise<ReportData | null> {
  try {
    const kind = code[0]
    const bytes = fromB64u(code.slice(1))
    const json = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes
    const r = JSON.parse(new TextDecoder().decode(json)) as ReportData
    return r && r.v === 1 && typeof r.id === 'string' ? r : null
  } catch {
    return null
  }
}

export const reportUrl = (code: string) => `${window.location.origin}/rapor#${code}`

// ─── Öğrenci adı ve öğretmen paneli (cihazda) ──────────────────────────────

const NAME_KEY = 'ao-student-name'
const PANEL_KEY = 'ao-teacher-reports'

export const getStudentName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
export const setStudentName = (n: string) => {
  try {
    localStorage.setItem(NAME_KEY, n)
  } catch {
    /* depolama yok */
  }
}

export interface StoredReport {
  code: string
  data: ReportData
  addedAt: number
}

export function loadPanel(): StoredReport[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PANEL_KEY) ?? '[]') as StoredReport[]
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function savePanel(list: StoredReport[]) {
  try {
    localStorage.setItem(PANEL_KEY, JSON.stringify(list.slice(-1000)))
    return true
  } catch {
    return false
  }
}

export function addToPanel(code: string, data: ReportData): 'added' | 'exists' | 'error' {
  const list = loadPanel()
  if (list.some((r) => r.code === code)) return 'exists'
  list.push({ code, data, addedAt: Date.now() })
  return savePanel(list) ? 'added' : 'error'
}

/** Metin içindeki rapor linklerini/kodlarını bulur (WhatsApp sohbetinden toplu yapıştırma) */
export function extractCodes(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/rapor#([zj][A-Za-z0-9_-]{10,})/g)) out.add(m[1])
  return [...out]
}

export const fmtDuration = (s: number) => (s < 60 ? `${s} sn` : `${Math.floor(s / 60)} dk ${s % 60 ? `${s % 60} sn` : ''}`.trim())
