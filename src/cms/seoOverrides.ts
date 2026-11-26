import type { PageSeo } from '../lib/seo'

/** Panelden yazılan sayfa başlığı / açıklaması (kind = 'seo', ref = yol) */
export interface SeoOverride {
  title?: string
  description?: string
  noindex?: boolean
}

export const seoOverrides = new Map<string, SeoOverride>()

export function withSeoOverride<T extends PageSeo | null>(s: T): T {
  if (!s) return s
  const o = seoOverrides.get(s.path)
  if (!o) return s
  return {
    ...s,
    title: o.title?.trim() || s.title,
    description: o.description?.trim() || s.description,
    noindex: o.noindex ?? s.noindex,
  }
}
