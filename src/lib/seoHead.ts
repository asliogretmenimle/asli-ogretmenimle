/** Tarayıcıda <head> güncelleme (bkz. seo.ts) */
import { abs, type PageSeo } from './seo'

function upsert(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  set(el)
}

function meta(attr: 'name' | 'property', key: string, content: string) {
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const m = document.createElement('meta')
      m.setAttribute(attr, key)
      return m
    },
    (el) => el.setAttribute('content', content),
  )
}

export function applySeo(s: PageSeo) {
  const url = abs(s.path)
  document.title = s.title
  meta('name', 'description', s.description)
  meta('name', 'robots', s.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
  meta('property', 'og:title', s.title)
  meta('property', 'og:description', s.description)
  meta('property', 'og:url', url)
  meta('name', 'twitter:title', s.title)
  meta('name', 'twitter:description', s.description)
  upsert(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement('link')
      l.rel = 'canonical'
      return l
    },
    (el) => el.setAttribute('href', url),
  )
  document.head.querySelector('script[data-seo]')?.remove()
  if (s.jsonLd?.length && !s.noindex) {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.seo = ''
    el.textContent = JSON.stringify(s.jsonLd.length === 1 ? s.jsonLd[0] : s.jsonLd)
    document.head.appendChild(el)
  }
}
