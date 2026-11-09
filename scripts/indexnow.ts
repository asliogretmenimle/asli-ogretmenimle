/**
 * Bing, Yandex, Seznam ve Naver'e yeni/değişen adresleri bildirir (IndexNow). Google IndexNow kullanmaz;
 * Google için Search Console'daki sitemap ve "Dizine eklenmeyi iste" yeterlidir.
 *
 *   pnpm indexnow           → son derlemede içeriği değişen adresler (scripts/sitemap-lastmod.json'da tarihi en yeni olanlar)
 *   pnpm indexnow --all     → sitemap'teki bütün adresler (ilk kurulumda bir kez)
 *
 * Canlıya alındıktan SONRA çalıştırın: arama motoru public/<anahtar>.txt dosyasını sitede doğrular.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_URL, abs } from '../src/lib/seo.ts'

const KEY = 'f3e2b9e0643ec27131148882a68dfa5a'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lastmod: Record<string, { h: string; d: string }> = JSON.parse(readFileSync(join(root, 'scripts', 'sitemap-lastmod.json'), 'utf8'))
const newest = Object.values(lastmod).map((x) => x.d).sort().at(-1)
const paths = process.argv.includes('--all') ? Object.keys(lastmod) : Object.keys(lastmod).filter((p) => lastmod[p].d === newest)
const urls = paths.map(abs)

if (!urls.length) {
  console.log('indexnow: gönderilecek adres yok')
  process.exit(0)
}

// IndexNow tek istekte en fazla 10.000 adres kabul eder
for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
  })
  console.log(`indexnow: ${urls.slice(i, i + 10000).length} adres → HTTP ${res.status} ${res.statusText}`)
}
