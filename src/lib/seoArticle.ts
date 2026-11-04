/**
 * Önceden üretilmiş sayfa bilgisi (scripts/prerender.ts → <section id="seo-article">).
 *
 * createRoot #root içeriğini sildiği için bu bölüm React çizilmeden önce DOM'dan ayrılır ve
 * Layout'taki <SeoArticleSlot /> tarafından yeniden yerleştirilir. Böylece Google'ın işlediği
 * (JavaScript çalıştırılmış) sayfada da örnek sorular, açıklamalar ve iç bağlantılar görünür kalır.
 * Bölüm yalnızca ilk açılan adrese aittir; uygulama içinde başka sayfaya geçince gösterilmez.
 */
let node: HTMLElement | null = null
let path = ''

const clean = (p: string) => decodeURIComponent(p).replace(/\/+$/, '') || '/'

export function captureSeoArticle() {
  node = document.getElementById('seo-article')
  node?.remove()
  path = clean(location.pathname)
}

export const seoArticleFor = (pathname: string) => (node && clean(pathname) === path ? node : null)
