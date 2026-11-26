/**
 * Stüdyo: yapay zekâ çıktısını canlı akış (SSE) olarak okur.
 *
 * Edge Function OpenAI Responses API'nin olay akışını olduğu gibi iletir. Model JSON'u şema sırasıyla yazar
 * (reply → kind → meta → html → edits → quiz); yarım JSON'u her parçada toleranslı biçimde çözerek
 * önizlemeye "canlı inşa" durumu (LiveState) veririz.
 */
import { SUPABASE_URL } from '../../cms/config'
import { sb } from '../supabase'
import type { StudioMeta } from './model'

export type LivePhase = 'connecting' | 'thinking' | 'writing' | 'done'

export interface LiveState {
  phase: LivePhase
  /** Modelin düşünme özetleri (paragraflar; boş olabilir) */
  thoughts: string[]
  /** Öğretmene yazılan cevap (yarım) */
  reply: string
  meta: Partial<StudioMeta>
  /** Yarım HTML: yazıldıkça uzar (yalnızca sona ekleme) */
  html: string
  quiz: { instructions?: string; questions?: { prompt?: string; choices?: string[]; answer?: number; explain?: string }[] } | null
  edits: { find?: string; replace?: string }[] | null
  /** Şimdiye kadar gelen çıktı karakteri */
  chars: number
}

export const emptyLive = (): LiveState => ({ phase: 'connecting', thoughts: [], reply: '', meta: {}, html: '', quiz: null, edits: null, chars: 0 })

// ---------------------------------------------------------------------------
// Yarım JSON
// ---------------------------------------------------------------------------

/** Yarım kalmış JSON'u kapatıp çözer: açık dizgiyi, diziyi ve nesneleri tamamlar. Çözülemezse null. */
export function parsePartialJson(src: string): unknown {
  let s = src.trim()
  if (!s) return null
  const stack: string[] = []
  let inStr = false
  let esc = false
  let lastSafe = 0 // son "güvenli" kesme noktası (değer bitimi)
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') {
      stack.pop()
      lastSafe = i + 1
    } else if (c === ',') lastSafe = i
  }
  if (inStr) {
    // Yarım kaçış dizisini at (\ ya da \u12)
    s = s.replace(/\\u[0-9a-fA-F]{0,3}$/, '').replace(/\\$/, '')
    s += '"'
  }
  const close = (t: string) => t + stack.slice().reverse().join('')
  const attempts = [close(s), close(s.replace(/,\s*$/, '')), close(s.replace(/,\s*"[^"]*"?\s*:?\s*$/, '')), close(s.slice(0, lastSafe).replace(/,\s*$/, ''))]
  for (const a of attempts) {
    try {
      return JSON.parse(a)
    } catch {
      /* sonraki deneme */
    }
  }
  return null
}

/** Akan metinden önizleme durumunu çıkarır */
export function liveFromText(text: string, prev: LiveState): LiveState {
  const o = parsePartialJson(text) as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return { ...prev, chars: text.length }
  const html = typeof o.html === 'string' ? o.html : prev.html
  const quiz = o.quiz && typeof o.quiz === 'object' ? (o.quiz as LiveState['quiz']) : prev.quiz
  const edits = Array.isArray(o.edits) ? (o.edits as LiveState['edits']) : prev.edits
  const writing = !!html || !!quiz?.questions?.length || !!edits?.length
  return {
    ...prev,
    phase: writing ? 'writing' : prev.phase === 'connecting' ? 'thinking' : prev.phase,
    reply: typeof o.reply === 'string' ? o.reply : prev.reply,
    meta: o.meta && typeof o.meta === 'object' ? (o.meta as Partial<StudioMeta>) : prev.meta,
    // Yalnızca sona ekleme: kısalırsa (ayrıştırma farkı) eskisini koru
    html: html.length >= prev.html.length || !html.startsWith(prev.html.slice(0, 40)) ? html : prev.html,
    quiz,
    edits,
    chars: text.length,
  }
}

// ---------------------------------------------------------------------------
// SSE okuma
// ---------------------------------------------------------------------------

export interface StreamEvent {
  type: string
  sequence_number?: number
  delta?: string
  response?: { id?: string; status?: string; error?: { message?: string } | null; incomplete_details?: { reason?: string } | null; output?: unknown[] }
  item_id?: string
  summary_index?: number
  message?: string
  code?: string
}

/** Edge Function'a POST atar ve gelen SSE olaylarını sırayla verir. Akış desteklenmiyorsa (JSON cevap) onu döndürür. */
export async function streamCall(body: Record<string, unknown>, onEvent: (e: StreamEvent) => void, signal?: AbortSignal): Promise<{ json?: Record<string, unknown> }> {
  const { data: s } = await sb.auth.getSession()
  const token = s.session?.access_token
  if (!token) throw new Error('Oturum süresi doldu, yeniden giriş yapın.')
  const r = await fetch(`${SUPABASE_URL}/functions/v1/studio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  })
  const type = r.headers.get('content-type') ?? ''
  if (!type.includes('text/event-stream')) {
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!r.ok || json.error) throw new Error(String(json.error ?? `Stüdyo hatası (${r.status})`))
    return { json }
  }
  const reader = r.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const data = block
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n')
      if (!data || data === '[DONE]') continue
      try {
        onEvent(JSON.parse(data) as StreamEvent)
      } catch {
        /* bozuk olay: atla */
      }
    }
  }
  return {}
}

/** Tamamlanmış yanıt nesnesindeki çıktı metni */
export function responseText(resp: StreamEvent['response']): string {
  let t = ''
  for (const item of (resp?.output as { type?: string; content?: { type?: string; text?: string }[] }[] | undefined) ?? []) {
    if (item.type !== 'message') continue
    for (const c of item.content ?? []) if (c.type === 'output_text') t += c.text ?? ''
  }
  return t
}
