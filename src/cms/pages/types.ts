/**
 * Panelden düzenlenebilen sayfa içerikleri.
 *
 * Her sayfa (ana sayfa, Oyunlar, Yaklaşımımız …) metinlerini bir "PageDef" içinde varsayılan değerleriyle tanımlar.
 * Sayfa bileşeni bu metinleri usePageContent(def) ile okur; panel aynı tanımdan düzenleme formunu üretir
 * ve yalnızca değişen alanları (kind = 'page', ref = def.id) kaydeder.
 *
 * Tanım dosyaları React içermez (panel hepsini birlikte yükler).
 */

export interface SubField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'list'
  placeholder?: string
}

export type PageField =
  | { key: string; label: string; type: 'text' | 'textarea'; help?: string; max?: number; placeholder?: string }
  /** Metin listesi (maddeler, sık arananlar …) */
  | { key: string; label: string; type: 'list'; help?: string; add?: string; multiline?: boolean }
  /** Nesne listesi (adımlar, SSS, kartlar …) */
  | { key: string; label: string; type: 'objlist'; help?: string; add?: string; fields: SubField[]; itemLabel?: string }
  | { key: string; label: string; type: 'select'; help?: string; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'toggle'; help?: string }
  /** Görsel kartlarla seçim (ana sayfa düzeni gibi) */
  | { key: string; label: string; type: 'variant'; help?: string; options: { value: string; label: string; desc: string; /** küçük şema: satırlar */ sketch?: string[] }[] }
  /** Bölümlerin sırası ve görünürlüğü: değer { id, visible }[] */
  | { key: string; label: string; type: 'sections'; help?: string; options: { id: string; label: string; desc?: string }[] }
  | { key: string; label: string; type: 'json'; help?: string }
  /** Sitedeki içeriklerden seçim (arayıp ekle, sırala) */
  | { key: string; label: string; type: 'ids'; help?: string; source: 'game' | 'interaction' | 'manipulative' | 'guide' }

export interface PageGroup {
  title: string
  desc?: string
  fields: PageField[]
}

export interface PageDef<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Kayıt kimliği: cms_entries.ref */
  id: string
  /** Panelde görünen ad */
  label: string
  /** Sitedeki adresi (önizleme bunu açar) */
  path: string
  desc: string
  emoji: string
  defaults: T
  groups: PageGroup[]
}

export interface SectionToggle {
  id: string
  visible: boolean
}

export const definePage = <T extends Record<string, unknown>>(d: PageDef<T>) => d
