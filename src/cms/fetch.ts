import { SUPABASE_ANON_KEY, SUPABASE_URL, cmsEnabled } from './config'
import { PUBLIC_COLUMNS, type CmsEntry } from './types'

const headers = () => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` })

async function get<T>(path: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(), signal: ctrl.signal })
    if (!r.ok) throw new Error(`CMS ${r.status}: ${await r.text().catch(() => '')}`)
    return (await r.json()) as T
  } finally {
    clearTimeout(t)
  }
}

/** Yayındaki tüm kayıtlar (HTML hariç). Supabase bağlı değilse boş liste. */
export async function fetchPublishedEntries(timeoutMs = 6000): Promise<CmsEntry[]> {
  if (!cmsEnabled) return []
  return get<CmsEntry[]>(`cms_entries?select=${PUBLIC_COLUMNS}&status=eq.published&order=updated_at.asc&limit=5000`, timeoutMs)
}

const htmlCache = new Map<string, Promise<string>>()

/** Stüdyo'da üretilmiş öğenin HTML'i (öğe sayfası açılınca) */
export function fetchEntryHtml(id: string): Promise<string> {
  let p = htmlCache.get(id)
  if (!p) {
    p = get<{ html: string | null }[]>(`cms_entries?select=html&id=eq.${encodeURIComponent(id)}`, 15000).then((rows) => rows[0]?.html ?? '')
    p.catch(() => htmlCache.delete(id))
    htmlCache.set(id, p)
  }
  return p
}
