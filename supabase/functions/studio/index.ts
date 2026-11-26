/**
 * Stüdyo asistanı: yönetim panelinden gelen istekleri OpenAI Responses API'ye iletir.
 *
 * OpenAI anahtarı tarayıcıya hiç gitmez; bu fonksiyonun gizli ortam değişkenindedir.
 * Uzun üretimler (tam bir oyun) dakikalar sürebildiği için "background" modu kullanılır:
 *   start  → işi başlatır, kimliğini döndürür
 *   poll   → durumu sorar; bitince JSON sonucu döndürür
 *   cancel → işi durdurur
 *   status → bağlantı / ayar kontrolü (Ayarlar sayfası)
 *   deploy → Vercel'de siteyi yeniden derletir (SEO sayfaları yeni içerikle üretilsin)
 *
 * Gizli değişkenler (supabase secrets set …):
 *   OPENAI_API_KEY       zorunlu
 *   OPENAI_MODEL         isteğe bağlı (varsayılan gpt-5); panel Ayarlar'dan da değiştirilebilir
 *   VERCEL_DEPLOY_HOOK   isteğe bağlı
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from './prompt.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const OPENAI = 'https://api.openai.com/v1'
const KIND_LABEL: Record<string, string> = { game: 'oyun', interaction: 'etkileşim', manipulative: 'sanal manipülatif', test: 'test' }

interface Turn {
  role: 'user' | 'assistant'
  text: string
}
interface StartBody {
  action: 'start'
  kind: 'game' | 'interaction' | 'manipulative' | 'test'
  grade?: number | null
  outcome?: string | null
  prompt: string
  history?: Turn[]
  current?: { meta?: unknown; html?: string | null; quiz?: unknown } | null
  images?: string[]
}

async function openai(path: string, init: RequestInit = {}) {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY tanımlı değil (supabase secrets set OPENAI_API_KEY=…)')
  const r = await fetch(`${OPENAI}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await r.text()
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }
  if (!r.ok) {
    const msg = (body.error as { message?: string } | undefined)?.message ?? text.slice(0, 300)
    throw new Error(`OpenAI ${r.status}: ${msg}`)
  }
  return body
}

/** Yanıttaki metin çıktısı */
function outputText(resp: Record<string, unknown>): { text: string; refusal?: string } {
  let text = ''
  let refusal: string | undefined
  for (const item of (resp.output as Record<string, unknown>[] | undefined) ?? []) {
    if (item.type !== 'message') continue
    for (const c of (item.content as Record<string, unknown>[] | undefined) ?? []) {
      if (c.type === 'output_text') text += String(c.text ?? '')
      if (c.type === 'refusal') refusal = String(c.refusal ?? '')
    }
  }
  return { text, refusal }
}

function buildInput(b: StartBody) {
  const input: Record<string, unknown>[] = []
  // Önceki konuşma: yalnızca metinler (HTML her seferinde güncel hâliyle ayrıca verilir)
  for (const t of (b.history ?? []).slice(-14)) {
    if (!t.text?.trim()) continue
    input.push(
      t.role === 'user'
        ? { role: 'user', content: [{ type: 'input_text', text: t.text.slice(0, 4000) }] }
        : { role: 'assistant', content: [{ type: 'output_text', text: t.text.slice(0, 2000) }] },
    )
  }
  const parts: string[] = []
  parts.push(`İSTENEN TÜR: ${KIND_LABEL[b.kind] ?? b.kind} (${b.kind})`)
  if (b.grade) parts.push(`HEDEF SINIF: ${b.grade}. sınıf`)
  if (b.outcome) parts.push(`ÖĞRENME ÇIKTISI: ${b.outcome}`)
  const cur = b.current
  if (cur && (cur.html || cur.quiz)) {
    parts.push('MEVCUT ÇALIŞMA (bunun üzerinde değişiklik yap):')
    if (cur.meta) parts.push(`meta:\n${JSON.stringify(cur.meta)}`)
    if (cur.html) parts.push(`html:\n<<<HTML\n${cur.html}\nHTML>>>`)
    if (cur.quiz) parts.push(`quiz:\n${JSON.stringify(cur.quiz)}`)
  } else {
    parts.push('Henüz bir çalışma yok: sıfırdan üret.')
  }
  parts.push(`ÖĞRETMENİN İSTEĞİ:\n${b.prompt}`)
  const content: Record<string, unknown>[] = [{ type: 'input_text', text: parts.join('\n\n') }]
  for (const img of (b.images ?? []).slice(0, 4)) {
    if (typeof img === 'string' && img.startsWith('data:image/')) content.push({ type: 'input_image', image_url: img, detail: 'auto' })
  }
  input.push({ role: 'user', content })
  return input
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST bekleniyor' }, 405)

  // Yalnızca panel yöneticileri
  const auth = req.headers.get('Authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin, error: authErr } = await sb.rpc('is_cms_admin')
  if (authErr || !isAdmin) return json({ error: 'Yetkisiz: panele yönetici olarak giriş yapın.' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }

  try {
    const { data: settingRow } = await sb.from('cms_settings').select('value').eq('key', 'studio').maybeSingle()
    const settings = (settingRow?.value ?? {}) as { model?: string; effort?: string; instructions?: string }
    const model = settings.model?.trim() || Deno.env.get('OPENAI_MODEL') || 'gpt-5'

    switch (body.action) {
      case 'status':
        return json({
          ok: true,
          model,
          hasKey: !!Deno.env.get('OPENAI_API_KEY'),
          hasDeployHook: !!Deno.env.get('VERCEL_DEPLOY_HOOK'),
        })

      case 'start': {
        const b = body as unknown as StartBody
        if (!b.prompt?.trim()) return json({ error: 'İstek boş' }, 400)
        const instructions = settings.instructions?.trim() ? `${SYSTEM_PROMPT}\n\n# Öğretmenin kalıcı yönergeleri\n${settings.instructions.trim()}` : SYSTEM_PROMPT
        const effort = ['minimal', 'low', 'medium', 'high'].includes(settings.effort ?? '') ? settings.effort : 'medium'
        const resp = await openai('/responses', {
          method: 'POST',
          body: JSON.stringify({
            model,
            instructions,
            input: buildInput(b),
            background: true,
            store: true,
            reasoning: { effort },
            max_output_tokens: 100000,
            text: { format: { type: 'json_schema', name: 'studio_output', strict: true, schema: OUTPUT_SCHEMA } },
          }),
        })
        return json({ id: resp.id, status: resp.status, model })
      }

      case 'poll': {
        const id = String(body.id ?? '')
        if (!/^resp_[\w-]+$/.test(id)) return json({ error: 'Geçersiz iş kimliği' }, 400)
        const resp = await openai(`/responses/${id}`)
        const status = String(resp.status)
        if (status === 'completed') {
          const { text, refusal } = outputText(resp)
          if (refusal) return json({ status: 'failed', error: `Model isteği reddetti: ${refusal}` })
          try {
            return json({ status, result: JSON.parse(text), usage: resp.usage })
          } catch {
            return json({ status: 'failed', error: 'Modelin cevabı okunamadı (JSON bozuk). Tekrar deneyin.' })
          }
        }
        if (status === 'incomplete') {
          const reason = (resp.incomplete_details as { reason?: string } | null)?.reason
          return json({ status: 'failed', error: reason === 'max_output_tokens' ? 'Çıktı çok uzun olduğu için yarıda kesildi. İsteği daha küçük parçalara bölün.' : `Üretim tamamlanamadı (${reason ?? 'bilinmeyen neden'}).` })
        }
        if (status === 'failed' || status === 'cancelled') {
          const err = (resp.error as { message?: string } | null)?.message
          return json({ status: 'failed', error: status === 'cancelled' ? 'İptal edildi' : err ?? 'Üretim başarısız oldu' })
        }
        return json({ status })
      }

      case 'cancel': {
        const id = String(body.id ?? '')
        if (/^resp_[\w-]+$/.test(id)) await openai(`/responses/${id}/cancel`, { method: 'POST' }).catch(() => null)
        return json({ ok: true })
      }

      case 'deploy': {
        const hook = Deno.env.get('VERCEL_DEPLOY_HOOK')
        if (!hook) return json({ ok: false, error: 'VERCEL_DEPLOY_HOOK tanımlı değil' })
        const r = await fetch(hook, { method: 'POST' })
        return json({ ok: r.ok, status: r.status })
      }

      default:
        return json({ error: 'Bilinmeyen işlem' }, 400)
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
