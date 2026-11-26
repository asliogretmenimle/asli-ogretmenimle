/**
 * Panelin veri katmanı: cms_entries / cms_revisions / studio_sessions / cms_settings.
 * Kayıtlar bir kez yüklenir, değişince tüm ekranlar yeniden çizilir.
 */
import { useSyncExternalStore } from 'react'
import { refreshCms } from '../cms/runtime'
import { SUPABASE_URL } from '../cms/config'
import type { CmsEntry, CmsKind, CmsOrigin, CmsStatus } from '../cms/types'
import { sb } from './supabase'

const COLS = 'id,kind,ref,origin,status,hidden,data,grade,note,updated_at,created_at,updated_by_email'

let entries: CmsEntry[] = []
let loaded = false
let loading: Promise<void> | null = null
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}
const sub = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function loadEntries(force = false): Promise<void> {
  if (loaded && !force) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    const { data, error } = await sb.from('cms_entries').select(COLS).order('updated_at', { ascending: false }).limit(5000)
    loading = null
    if (error) throw error
    entries = (data ?? []) as CmsEntry[]
    loaded = true
    emit()
  })()
  return loading
}

/** Tüm kayıtlar (taslaklar dahil, HTML hariç) */
export function useEntries() {
  useSyncExternalStore(sub, () => version)
  if (!loaded && !loading) loadEntries().catch((e) => console.error(e))
  return { entries, loaded }
}

export const entryKey = (kind: CmsKind, ref: string) => `${kind}:${ref}`
export function entryMap(list: CmsEntry[]) {
  return new Map(list.map((e) => [entryKey(e.kind, e.ref), e]))
}
export const findEntry = (kind: CmsKind, ref: string) => entries.find((e) => e.kind === kind && e.ref === ref)

export interface SaveInput {
  id?: string
  kind: CmsKind
  ref: string
  origin: CmsOrigin
  status?: CmsStatus
  hidden?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  html?: string | null
  grade?: number | null
  note?: string | null
}

/** Sitenin bu sekmedeki kopyasını da güncelle (önizleme bağlantıları hemen doğru açılsın) */
const syncSite = () => refreshCms().catch(() => {})

export async function saveEntry(input: SaveInput): Promise<CmsEntry> {
  const row: Record<string, unknown> = {
    kind: input.kind,
    ref: input.ref,
    origin: input.origin,
    status: input.status ?? 'published',
    hidden: input.hidden ?? false,
    data: input.data,
    grade: input.grade ?? null,
    note: input.note ?? null,
  }
  if (input.html !== undefined) row.html = input.html
  const q = input.id
    ? sb.from('cms_entries').update(row).eq('id', input.id).select(COLS).single()
    : sb.from('cms_entries').upsert(row, { onConflict: 'kind,ref' }).select(COLS).single()
  const { data, error } = await q
  if (error) throw new Error(friendly(error.message))
  const saved = data as CmsEntry
  entries = [saved, ...entries.filter((e) => e.id !== saved.id && !(e.kind === saved.kind && e.ref === saved.ref))]
  emit()
  syncSite()
  return saved
}

export async function setHidden(e: CmsEntry, hidden: boolean) {
  return saveEntry({ ...e, hidden })
}

export async function deleteEntry(id: string) {
  const { error } = await sb.from('cms_entries').delete().eq('id', id)
  if (error) throw new Error(friendly(error.message))
  entries = entries.filter((e) => e.id !== id)
  emit()
  syncSite()
}

export async function loadHtml(id: string): Promise<string> {
  const { data, error } = await sb.from('cms_entries').select('html').eq('id', id).single()
  if (error) throw new Error(friendly(error.message))
  return (data?.html as string | null) ?? ''
}

function friendly(m: string) {
  if (/duplicate key|unique/i.test(m)) return 'Bu adres (URL) zaten kullanılıyor. Farklı bir kısa ad seçin.'
  if (/row-level security|permission denied/i.test(m)) return 'Yetkiniz yok: yönetici olarak giriş yaptığınızdan emin olun.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'
  return m
}

// ---------------------------------------------------------------------------
// Geçmiş
// ---------------------------------------------------------------------------
export interface Revision {
  id: number
  entry_id: string | null
  kind: CmsKind
  ref: string
  action: string
  snapshot: (CmsEntry & { html?: string | null }) | null
  created_at: string
  created_by_email: string | null
}

export async function loadRevisions(opts: { entryId?: string; kind?: CmsKind; limit?: number } = {}): Promise<Revision[]> {
  let q = sb.from('cms_revisions').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 100)
  if (opts.entryId) q = q.eq('entry_id', opts.entryId)
  if (opts.kind) q = q.eq('kind', opts.kind)
  const { data, error } = await q
  if (error) throw new Error(friendly(error.message))
  return (data ?? []) as Revision[]
}

/** Bir geçmiş kaydını geri yükler */
export async function restoreRevision(r: Revision) {
  const s = r.snapshot
  if (!s) throw new Error('Bu kayıtta geri yüklenecek içerik yok')
  return saveEntry({ kind: s.kind, ref: s.ref, origin: s.origin, status: s.status, hidden: s.hidden, data: s.data, html: s.html ?? null, grade: s.grade, note: 'Geçmişten geri yüklendi' })
}

// ---------------------------------------------------------------------------
// Ayarlar
// ---------------------------------------------------------------------------
export interface StudioSettings {
  model?: string
  effort?: 'minimal' | 'low' | 'medium' | 'high'
  instructions?: string
  autoDeploy?: boolean
}

export async function loadSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await sb.from('cms_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(friendly(error.message))
  return (data?.value as T) ?? null
}
export async function saveSetting(key: string, value: unknown) {
  const { error } = await sb.from('cms_settings').upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new Error(friendly(error.message))
}

// ---------------------------------------------------------------------------
// Stüdyo fonksiyonu (supabase/functions/studio)
// ---------------------------------------------------------------------------
export async function studioCall<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data: s } = await sb.auth.getSession()
  const token = s.session?.access_token
  if (!token) throw new Error('Oturum süresi doldu, yeniden giriş yapın.')
  let r: Response
  try {
    r = await fetch(`${SUPABASE_URL}/functions/v1/studio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Stüdyo sunucusuna ulaşılamadı. "studio" Edge Function yüklendi mi? (Ayarlar → Bağlantı durumu)')
  }
  const out = (await r.json().catch(() => ({}))) as T & { error?: string }
  if (!r.ok || out.error) {
    if (r.status === 404) throw new Error('"studio" Edge Function bulunamadı. Kurulum adımlarına bakın (docs/yonetim-paneli.md).')
    throw new Error(out.error ?? `Stüdyo hatası (${r.status})`)
  }
  return out
}

/** Sitenin yeniden derlenmesini ister (SEO sayfaları yeni içerikle üretilsin) */
export const triggerDeploy = () => studioCall<{ ok: boolean; error?: string }>({ action: 'deploy' })
