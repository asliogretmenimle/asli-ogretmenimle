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
 * Tek dosyadır: Supabase panelinde Edge Functions → Deploy a new function → Via Editor ile
 * adı "studio" olarak yapıştırılabilir (ayarlarda "Verify JWT" kapalı olmalı; yetkiyi fonksiyon kendisi denetler).
 *
 * Gizli değişkenler (Edge Functions → Secrets ya da supabase secrets set …):
 *   OPENAI_API_KEY       panelden (Ayarlar → OpenAI anahtarı) girilmediyse gerekli
 *   OPENAI_MODEL         isteğe bağlı (varsayılan gpt-5); panel Ayarlar'dan da değiştirilebilir
 *   VERCEL_DEPLOY_HOOK   isteğe bağlı
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Asistanın sistem yönergesi ve çıktı şeması
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Sen "Aslı Öğretmenimle" sitesinin Stüdyo asistanısın: kıdemli bir matematik eğitimi tasarımcısı, oyun tasarımcısı ve front-end geliştiricisin.
Site, Türkiye'deki 1–8. sınıf öğrencileri için Türkiye Yüzyılı Maarif Modeli matematik programına uygun ücretsiz oyunlar, etkileşimler, sanal manipülatifler ve testler sunar.
Bir öğretmen senden içerik ister; sen onu üretir, öğretmenin geri bildirimiyle düzeltirsin. Öğretmenle her zaman Türkçe, sıcak ve kısa konuş.

# Pedagojik ilkeler (John A. Van de Walle)
- Her içerik tek bir büyük matematiksel fikre hizmet eder. Ezber değil anlam: öğrenci yaparak keşfeder, örüntü görür, açıklar.
- Akış: Başlarken (kısa gerçek yaşam durumu/problem) → Keşfet (öğrencinin elleriyle yaptığı kısım) → Düşün ve Paylaş (tek, açık uçlu soru).
- Somut → model → sembol sırası: önce nesneler/modeller (bloklar, sayı doğrusu, kesir şeritleri, diziler), sonra sembol.
- Geri bildirim açıklayıcıdır ve kavram yanılgısını hedefler ("Paydaları topladın; parçalar aynı büyüklükte mi?"), asla cezalandırıcı değildir. Yanlışta kademeli ipucu ver, cevabı hemen söyleme.
- Dil sınıf düzeyine uygundur: 1–2. sınıfta çok kısa cümleler ve görseller, 7–8. sınıfta matematiksel terimler (LGS'ye uygun).
- Zorluk AO.grade ile (seçilen sınıfa göre) ayarlanır: sayı aralıkları, işlem türleri, tur sayısı, ipucu yoğunluğu.
- Matematiksel doğruluk kritik: her cevabı, her üretilen soruyu iki kez kontrol et. Türkçe ondalık ayırıcı virgüldür (3,5).

# İçerik türleri
## game (oyun)
Site, oyunun adını, açıklamasını, "Başlarken" metnini, "Nasıl oynanır" adımlarını ve sınıf seçimini oyunun ÜSTÜNDEKİ kendi ekranında zaten gösterir. Bu yüzden HTML doğrudan oyunla başlar (en fazla tek satırlık hedef). Turlar/seviyeler, puan, ilerleme göstergesi, anlık görsel geri bildirim olsun. 6–10 turda ya da hedefe ulaşınca bitir ve MUTLAKA AO.finish({ stars: 1|2|3, summary: "…", score: sayı, insight: "Ne öğrendik? tek cümle" }) çağır.
## interaction (etkileşim / keşif)
Tek bir fikri derinlemesine keşfettiren, manipüle et → gözlemle → açıkla döngüsü. Kaydırıcılar, sürüklenebilir nesneler, canlı değişen modeller. Görev kartları ile 3–5 küçük adım. Sonda "Bitirdim" düğmesi AO.finish({ stars, summary, insight }) çağırır.
## manipulative (sanal manipülatif)
Serbest kullanılan dijital materyal (akıllı tahtada öğretmen ve öğrenci kullanır). Sürükle-bırak, döndür, böl, renklendir; araç çubuğu, "Sıfırla", gerekirse ayarlar (ör. payda seçimi). Puan/bitiş yok, AO.finish çağırma.
## test
html = null. "quiz" alanını doldur: 8–12 çoktan seçmeli soru, 4 seçenek (gerekirse 2–3), "answer" doğru seçeneğin 0'dan başlayan indeksi. Çeldiriciler gerçek kavram yanılgılarından gelsin; her soruya kısa "explain" (neden doğru) yaz. Sorular kendi başına anlaşılır olsun ("önceki soru" deme).
Metinlerde gösterim: [[3/4]] kesir, [[1 2/3]] tam sayılı kesir, x^{2} üs, √{16} karekök.

# Teknik kurallar (HTML üreten türler)
- TEK bir HTML belgesi: tüm CSS <style>, tüm JS <script> içinde. Derleme adımı yok, modül import yok.
- Harici istek yapma. Zorunluysa yalnızca https://cdn.jsdelivr.net veya https://cdnjs.cloudflare.com üzerinden sabit sürümlü kütüphane. Görseller SVG, canvas veya emoji ile çizilir; dış görsel/ses dosyası yok.
- Sayfa, yüksekliği sabit (yaklaşık 560–880 px) bir iframe içinde ve sandbox'ta çalışır: html, body { height: 100% } kullan, düzen bu alana sığsın, gerekirse iç bölüm kaydırılsın. 100vh'ye güvenme. localStorage, alert/confirm/prompt, window.open, form submit KULLANMA.
- Site köprüsü hazırdır: window.AO.grade (1–8), window.AO.kind, window.AO.finish(...), window.AO.sound('ok'|'bad'|'win'|'tap').
- Dokunmatik + fare: Pointer Events (pointerdown/move/up, setPointerCapture), sürüklenen öğelerde touch-action:none. Dokunma hedefleri en az 44 px. 320 px telefondan akıllı tahtaya kadar duyarlı (CSS grid/flex, clamp()).
- Erişilebilirlik: düğmelerde metin ya da aria-label, yeterli kontrast, renk tek ipucu olmasın.
- Konsolda hata olmamalı; tüm değişkenleri tanımla; animasyonlar requestAnimationFrame ile. Kod okunaklı, yorumlar Türkçe ve kısa.
- Tasarım dili (sitenin görünümü): yazı tipi 'Nunito'; renkler — mürekkep #1e2433, ikincil metin #5d6475, çizgi #e6e8ee, zemin #f7f8fa, marka pembe #d6457a (koyu #a92f5c, açık #fdeef3), krem #fff7ef, doğru #16a34a / #dcfce7, yanlış #e11d48 / #ffe4e6. Beyaz kartlar, 16–24 px köşe yarıçapı, ince çerçeve (1px #e6e8ee), yumuşak gölge, kalın (700–800) ve büyük yazılar, canlı ama sakin renkler. Çocuklara uygun, şık ve profesyonel.

# Düzenleme
- "MEVCUT ÇALIŞMA" verildiyse öğretmenin istemediği hiçbir şeyi bozma; davranışı, metinleri ve tasarımı koru.
- Küçük/yerel değişikliklerde "edits" kullan: her biri mevcut HTML'den BİREBİR kopyalanmış, belgede tek kez geçen bir "find" parçası ve yerine gelecek "replace". Bu durumda "html" = null.
- Büyük değişikliklerde veya ilk üretimde tüm belgeyi "html" alanında ver ("edits" = null).
- Öğretmen sadece soru sorduysa ya da belirsiz bir istek varsa: html = null, edits = null, quiz = null; "reply" içinde kısa cevap ver veya en fazla 2 netleştirici soru sor. Yine de makul bir varsayımla hemen üretmek çoğu zaman daha iyidir.
- Öğretmen bir hata mesajı iletirse nedenini bul ve düzelt.

# Çıktı
Yalnızca şemaya uyan JSON döndür.
- reply: öğretmene Türkçe, 2–4 cümle: ne yaptın, nasıl denenir, bir geliştirme önerisi.
- kind: üretilen içeriğin türü.
- meta: başlık (kısa, çekici), slug (küçük harf, Türkçe karaktersiz, tireli; ör. "kesir-pizzacisi"), tek cümlelik açıklama, emoji, renk (hex), uygun sınıflar, nasıl oynanır/kullanılır adımları (3–4), Başlarken metni, Düşün ve Paylaş sorusu, öğretmen için büyük fikir, kategori, biliniyorsa öğrenme çıktısı kodları (MAT.sınıf.tema.sıra), her sınıfta ne çalışıldığı. Mevcut meta verildiyse öğretmen istemedikçe başlık ve slug'ı değiştirme.`

const nullable = <T extends Record<string, unknown>>(schema: T) => ({ anyOf: [schema, { type: 'null' }] })

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'kind', 'meta', 'html', 'edits', 'quiz'],
  properties: {
    reply: { type: 'string' },
    kind: { type: 'string', enum: ['game', 'interaction', 'manipulative', 'test'] },
    meta: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'slug', 'description', 'emoji', 'color', 'grades', 'howTo', 'launch', 'reflect', 'bigIdea', 'category', 'outcomes', 'skills'],
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        emoji: { type: 'string' },
        color: { type: 'string' },
        grades: { type: 'array', items: { type: 'integer' } },
        howTo: { type: 'array', items: { type: 'string' } },
        launch: { type: 'string' },
        reflect: { type: 'string' },
        bigIdea: { type: 'string' },
        category: { type: 'string', enum: ['sayilar', 'kesirler', 'geometri', 'cebir-veri', 'muhakeme'] },
        outcomes: { type: 'array', items: { type: 'string' } },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['grade', 'text'],
            properties: { grade: { type: 'integer' }, text: { type: 'string' } },
          },
        },
      },
    },
    html: { type: ['string', 'null'] },
    edits: nullable({
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['find', 'replace'],
        properties: { find: { type: 'string' }, replace: { type: 'string' } },
      },
    }),
    quiz: nullable({
      type: 'object',
      additionalProperties: false,
      required: ['instructions', 'stage', 'level', 'questions'],
      properties: {
        instructions: { type: 'string' },
        stage: { type: 'string', enum: ['somut', 'model', 'sembol', 'problem'] },
        level: { type: 'integer' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['prompt', 'choices', 'answer', 'explain'],
            properties: {
              prompt: { type: 'string' },
              choices: { type: 'array', items: { type: 'string' } },
              answer: { type: 'integer' },
              explain: { type: 'string' },
            },
          },
        },
      },
    }),
  },
} as const

// ---------------------------------------------------------------------------

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const OPENAI = 'https://api.openai.com/v1'

/** Yeni anahtar sistemi (sb_publishable_ / sb_secret_) ya da eski JWT anahtarları */
function projectKey(kind: 'public' | 'secret') {
  const legacy = Deno.env.get(kind === 'public' ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    const dict = JSON.parse(Deno.env.get(kind === 'public' ? 'SUPABASE_PUBLISHABLE_KEYS' : 'SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    return dict.default ?? Object.values(dict)[0] ?? ''
  } catch {
    return ''
  }
}
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

/** Sunucu yetkili istemci (gizli tablolar, kullanıcı oluşturma) */
function serviceClient() {
  const service = projectKey('secret')
  if (!service) throw new Error('Sunucu anahtarı bulunamadı (SUPABASE_SECRET_KEYS).')
  return createClient(Deno.env.get('SUPABASE_URL')!, service, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** OpenAI anahtarı: önce panelden kaydedilen (cms_secrets), yoksa Edge Function secret'ı */
let keyCache: { key: string; source: 'panel' | 'env' } | null | undefined
async function openaiKey() {
  if (keyCache !== undefined) return keyCache
  try {
    const { data } = await serviceClient().from('cms_secrets').select('value').eq('key', 'openai_api_key').maybeSingle()
    if (data?.value) return (keyCache = { key: String(data.value), source: 'panel' })
  } catch {
    /* tablo yoksa ortam değişkenine düş */
  }
  const env = Deno.env.get('OPENAI_API_KEY')
  return (keyCache = env ? { key: env, source: 'env' } : null)
}
const hint = (k: string) => `${k.slice(0, 3)}…${k.slice(-4)}`

async function openai(path: string, init: RequestInit = {}, keyOverride?: string) {
  const key = keyOverride ?? (await openaiKey())?.key
  if (!key) throw new Error('OpenAI anahtarı tanımlı değil. Panelde Ayarlar → OpenAI anahtarı bölümünden ekleyin.')
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
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, projectKey('public'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: isAdmin, error: authErr } = await sb.rpc('is_cms_admin')
  if (authErr || !isAdmin) return json({ error: 'Yetkisiz: panele yönetici olarak giriş yapın.' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }

  keyCache = undefined
  try {
    const { data: settingRow } = await sb.from('cms_settings').select('value').eq('key', 'studio').maybeSingle()
    const settings = (settingRow?.value ?? {}) as { model?: string; effort?: string; instructions?: string }
    const model = settings.model?.trim() || Deno.env.get('OPENAI_MODEL') || 'gpt-5'

    switch (body.action) {
      case 'status': {
        const k = await openaiKey()
        return json({
          ok: true,
          model,
          hasKey: !!k,
          keySource: k?.source ?? null,
          keyHint: k ? hint(k.key) : null,
          hasDeployHook: !!Deno.env.get('VERCEL_DEPLOY_HOOK'),
        })
      }

      case 'start': {
        const b = body as unknown as StartBody
        if (!b.prompt?.trim()) return json({ error: 'İstek boş' }, 400)
        const instructions = settings.instructions?.trim() ? `${SYSTEM_PROMPT}\n\n# Öğretmenin kalıcı yönergeleri\n${settings.instructions.trim()}` : SYSTEM_PROMPT
        const effort = ['minimal', 'low', 'medium', 'high'].includes(settings.effort ?? '') ? settings.effort : 'medium'
        // Düşünme (reasoning) yalnızca gpt-5 / o-serisi modellerde var; diğerlerinde parametre hata verir
        const reasoning = /^(gpt-5|o\d)/i.test(model)
        const resp = await openai('/responses', {
          method: 'POST',
          body: JSON.stringify({
            model,
            instructions,
            input: buildInput(b),
            background: true,
            store: true,
            ...(reasoning ? { reasoning: { effort } } : {}),
            max_output_tokens: reasoning ? 100000 : 32000,
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

      case 'set_openai_key': {
        // Yalnızca panel sahibi. Anahtar hiçbir rolün okuyamadığı cms_secrets tablosunda durur.
        const { data: owner } = await sb.rpc('is_cms_owner')
        if (!owner) return json({ error: 'OpenAI anahtarını yalnızca panel sahibi değiştirebilir.' }, 403)
        const key = String(body.key ?? '').trim()
        const svc = serviceClient()
        const { data: who } = await sb.auth.getUser()
        if (!key) {
          const { error } = await svc.from('cms_secrets').delete().eq('key', 'openai_api_key')
          if (error) return json({ error: error.message }, 500)
          return json({ ok: true, removed: true })
        }
        if (!/^sk-[\w-]{20,}$/.test(key)) return json({ error: 'Bu bir OpenAI API anahtarına benzemiyor (sk- ile başlamalı).' }, 400)
        // Kaydetmeden önce dene
        try {
          await openai('/models?limit=1', {}, key)
        } catch (e) {
          return json({ error: `Anahtar doğrulanamadı: ${(e as Error).message}` }, 400)
        }
        const { error } = await svc.from('cms_secrets').upsert({ key: 'openai_api_key', value: key, updated_at: new Date().toISOString(), updated_by_email: who.user?.email ?? null })
        if (error) return json({ error: /relation|does not exist/i.test(error.message) ? 'cms_secrets tablosu yok: supabase/migrations/20261126140000_cms_v2.sql dosyasını çalıştırın.' : error.message }, 500)
        return json({ ok: true, hint: hint(key) })
      }

      case 'test_openai': {
        const k = await openaiKey()
        if (!k) return json({ ok: false, error: 'Anahtar tanımlı değil' })
        try {
          await openai('/models?limit=1')
          return json({ ok: true, source: k.source })
        } catch (e) {
          return json({ ok: false, error: (e as Error).message })
        }
      }

      case 'create_admin': {
        // Yalnızca panel sahibi: e-posta + şifreyle yönetici hesabı oluşturur (ya da var olanı yönetici yapar)
        const { data: owner } = await sb.rpc('is_cms_owner')
        if (!owner) return json({ error: 'Yönetici eklemek için “Sahip” yetkisi gerekir.' }, 403)
        const email = String(body.email ?? '').trim().toLowerCase()
        const password = String(body.password ?? '')
        const role = body.role === 'owner' ? 'owner' : 'editor'
        if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Geçerli bir e-posta girin.' }, 400)
        const admin = serviceClient()
        let userId: string | undefined
        let existed = false
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
        if (created.data.user) userId = created.data.user.id
        else if (/already|registered|exists/i.test(created.error?.message ?? '')) {
          existed = true
          for (let page = 1; page <= 20 && !userId; page++) {
            const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
            userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id
            if (!data.users.length) break
          }
        } else {
          const m = created.error?.message ?? 'Hesap oluşturulamadı'
          return json({ error: /password/i.test(m) ? 'Şifre en az 6 karakter olmalı.' : m }, 400)
        }
        if (!userId) return json({ error: 'Kullanıcı bulunamadı.' }, 404)
        const { error: insErr } = await admin.from('cms_admins').upsert({ user_id: userId, email, role })
        if (insErr) return json({ error: insErr.message }, 500)
        return json({ ok: true, existed })
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
