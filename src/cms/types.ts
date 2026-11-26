/**
 * Yönetim paneli (CMS) kayıtları: Supabase'deki public.cms_entries tablosunun satırları.
 * Koddaki içeriğin üstüne uygulanır (bkz. overlay.ts).
 */

export type CmsKind = 'activity' | 'game' | 'interaction' | 'manipulative' | 'guide' | 'link' | 'seo' | 'page'
export type CmsOrigin = 'builtin' | 'custom'
export type CmsStatus = 'published' | 'draft'

export interface CmsEntry {
  id: string
  kind: CmsKind
  /** Yerleşik öğenin kimliği ya da yeni öğenin kısa adı */
  ref: string
  origin: CmsOrigin
  status: CmsStatus
  hidden: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  grade: number | null
  updated_at: string
  /** Sadece panelde ve öğe sayfasında yüklenir */
  html?: string | null
  note?: string | null
  created_at?: string
  updated_by_email?: string | null
}

/** Panelden eklenen öğelere eklenen işaret: sayfalar bunu görünce HTML çerçevesini çizer */
export interface CustomMark {
  /** cms_entries.id */
  cmsId?: string
  custom?: boolean
}

/** Sitenin yayında okuduğu sütunlar (HTML hariç: ağır, sadece öğe sayfasında ayrıca yüklenir) */
export const PUBLIC_COLUMNS = 'id,kind,ref,origin,status,hidden,data,grade,updated_at'
