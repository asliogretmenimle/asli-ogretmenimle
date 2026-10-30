/**
 * Arama motorları için statik sayfalar:  pnpm build  (vite build'den sonra otomatik çalışır)
 *
 * Her etkinlik, oyun, tema, manipülatif ve keşif sayfası için dist/ içine ayrı bir .html yazar.
 * Dosyada sayfaya özel <title>, açıklama, canonical, Open Graph, JSON-LD ve sayfanın okunabilir
 * içeriği bulunur; React yüklenince #root içeriğini kendi arayüzüyle değiştirir.
 * Ayrıca sitemap.xml ve 404.html üretir. (vercel.json: cleanUrls → /oyun/balon ⇒ oyun/balon.html)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gradeInfo, grades, outcomeByCode, themesByGrade } from '../src/data/curriculum.ts'
import { activitiesByGrade, notesByGrade } from '../src/data/activities/index.ts'
import type { Activity, Grade, Theme } from '../src/data/types.ts'
import { gameMeta, gamesForGrade, type GameMeta } from '../src/games/meta.ts'
import { toolMeta, type ToolMeta } from '../src/manipulatives/meta.ts'
import { inTopic, topicsByGrade } from '../src/data/topics.ts'
import type { InteractionMeta } from '../src/interactions/types.ts'
import { categoryInfo } from '../src/interactions/types.ts'
import { lessonAreas, lessonFaq, lessonHighlights, lessonIntro, lessonLevels } from '../src/data/onlineLesson.ts'
import {
  ONLINE_LESSON_PATH, SITE_NAME, abs, activitySeo, approachSeo, gameSeo, gamesIndexSeo, gradeSeo, homeSeo,
  interactionSeo, interactionsIndexSeo, notFoundSeo, onlineLessonSeo, plain, privateSeo, readyInteractions,
  stageLabel, themeSeo, toolSeo, toolsIndexSeo, typeLabel, type PageSeo,
} from '../src/lib/seo.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = process.argv[2] ?? join(root, 'dist')
const template = readFileSync(join(dist, 'index.html'), 'utf8')
if (!template.includes('<!--seo-->') || !template.includes('<!--app-html-->')) {
  throw new Error('dist/index.html içinde <!--seo--> / <!--app-html--> işaretleri yok (index.html değişmiş olabilir).')
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const txt = (s: string) => esc(plain(s))
const link = (href: string, label: string, cls = 'font-extrabold text-brand hover:underline') => `<a href="${esc(href)}" class="${cls}">${esc(label)}</a>`
const list = (items: string[], cls = 'mt-2 grid gap-1.5 sm:grid-cols-2') => (items.length ? `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '')
const h2 = (s: string) => `<h2 class="mt-8 mb-2 text-xl font-black">${esc(s)}</h2>`
const p = (s: string, cls = 'mt-2 font-semibold text-ink-soft') => `<p class="${cls}">${s}</p>`
const range = (g: Grade[]) => (g.length === 1 ? `${g[0]}` : `${g[0]}–${g[g.length - 1]}`)

function crumbs(items: { name: string; path?: string }[]) {
  const all = [{ name: 'Ana sayfa', path: '/' }, ...items]
  return `<nav aria-label="Konum" class="mb-4 text-sm font-bold text-ink-soft"><ol class="flex flex-wrap gap-1">${all
    .map((c, i) => `<li>${c.path && i < all.length - 1 ? link(c.path, c.name, 'hover:text-ink hover:underline') : esc(c.name)}${i < all.length - 1 ? ' ›' : ''}</li>`)
    .join('')}</ol></nav>`
}

const NAV = [
  ['/oyunlar', 'Oyunlar'],
  ['/etkilesimler', 'Keşif Atölyesi'],
  ['/manipulatifler', 'Manipülatifler'],
  ['/yaklasim', 'Yaklaşımımız'],
  [ONLINE_LESSON_PATH, 'Online Ders'],
] as const

function shell(main: string) {
  const header = `<header class="border-b border-line/70 bg-paper"><div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"><a href="/" class="flex items-center gap-2 font-black text-ink"><img src="/logo-96.png" alt="" width="40" height="40" class="size-10" />Aslı Öğretmenimle</a><nav aria-label="Ana menü" class="flex flex-wrap gap-x-3 gap-y-1 text-sm font-extrabold">${NAV.map(([h, l]) => link(h, l, 'text-ink hover:text-brand')).join('')}</nav></div></header>`
  const footer = `<footer class="mt-12 border-t border-line bg-white/60"><div class="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft"><p><strong class="text-ink">Aslı Öğretmenimle</strong> · Aslı Öğretmen’in 1–8. sınıf matematik oyunları, etkinlikleri ve sanal manipülatifleri. ${link(ONLINE_LESSON_PATH, 'Online birebir matematik özel ders')}: ${lessonAreas.join(', ')}.</p>${list(
    grades.map((g) => link(`/sinif/${g}`, `${gradeInfo[g].label} Matematik`, 'font-bold hover:text-brand')),
    'mt-3 flex flex-wrap gap-x-4 gap-y-1',
  )}</div></footer>`
  return `${header}<main class="mx-auto max-w-6xl px-4 pt-6">${main}</main>${footer}`
}

function headHtml(s: PageSeo) {
  const url = abs(s.path)
  const ld = s.jsonLd?.length && !s.noindex ? `\n    <script type="application/ld+json" data-seo>${JSON.stringify(s.jsonLd.length === 1 ? s.jsonLd[0] : s.jsonLd).replace(/</g, '\\u003c')}</script>` : ''
  return `<title>${esc(s.title)}</title>
    <meta name="description" content="${esc(s.description)}" />
    <meta name="robots" content="${s.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${esc(s.title)}" />
    <meta property="og:description" content="${esc(s.description)}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:title" content="${esc(s.title)}" />
    <meta name="twitter:description" content="${esc(s.description)}" />${ld}`
}

const pages: { seo: PageSeo; body: string; file?: string }[] = []
const add = (seo: PageSeo, main: string) => pages.push({ seo, body: shell(main) })

// ---------------------------------------------------------------------------
// İçerik
// ---------------------------------------------------------------------------

const allActivities = grades.flatMap((g) => activitiesByGrade[g].map((a) => ({ a, g })))
const themeOf = (a: Activity) => outcomeByCode.get(a.outcomes[0])?.theme
const activityLink = (a: Activity) => link(`/etkinlik/${a.id}`, plain(a.title))
const gameLink = (m: GameMeta) => `${link(`/oyun/${m.id}`, m.name)} <span class="text-ink-soft">– ${txt(m.description)}</span>`
const toolLink = (t: ToolMeta) => `${link(`/manipulatif/${t.id}`, t.name)} <span class="text-ink-soft">– ${txt(t.description)}</span>`
const interactionLink = (m: InteractionMeta) => `${link(`/etkilesim/${m.id}`, m.name)} <span class="text-ink-soft">– ${txt(m.description)}</span>`
const themeActivities = (t: Theme) => activitiesByGrade[t.grade].filter((a) => themeOf(a)?.slug === t.slug)
const interactions = readyInteractions()

// Ana sayfa
add(
  homeSeo(),
  `<h1 class="text-3xl font-black sm:text-4xl">Aslı Öğretmenle 1–8. sınıf matematik oyunları ve etkinlikleri</h1>
  ${p('Aslı Öğretmenimle; 1. sınıftan 8. sınıfa kadar Türkiye Yüzyılı Maarif Modeli matematik öğretim programına uygun eşleştirme, boşluk doldurma, sürükle-bırak, test etkinlikleri, matematik oyunları ve sanal manipülatifler sunar. Tüm etkinlikler ücretsizdir; telefon, tablet ve bilgisayarda çalışır.')}
  ${p(`Aslı Öğretmen, Hatay’da ${lessonAreas.slice(0, 2).join(' ve ')}’daki öğrencilere ${link(ONLINE_LESSON_PATH, 'online birebir matematik özel dersi')} de veriyor.`)}
  ${grades
    .map((g) => `${h2(`${gradeInfo[g].label} Matematik`)}${p(link(`/sinif/${g}`, `${gradeInfo[g].label} matematik etkinlikleri ve oyunları`))}${list(themesByGrade(g).map((t) => link(`/sinif/${g}/${t.slug}`, t.title)))}`)
    .join('')}
  ${h2('Matematik Oyunları')}${list(gameMeta.map(gameLink))}
  ${h2('Keşif Atölyesi')}${list(interactions.map(interactionLink))}
  ${h2('Sanal Manipülatifler')}${list(toolMeta.map(toolLink))}`,
)

// Sınıflar ve temalar
for (const g of grades) {
  const info = gradeInfo[g]
  const themes = themesByGrade(g)
  add(
    gradeSeo(g),
    `${crumbs([{ name: info.label }])}
    <h1 class="text-3xl font-black sm:text-4xl">${esc(info.label)} Matematik Etkinlikleri ve Oyunları</h1>
    ${p(`${esc(info.label)} matematik konuları için ${activitiesByGrade[g].length} ücretsiz etkinlik: ${(topicsByGrade[g] ?? themes).map((t) => esc(t.title)).join(', ')}. Her konu, somut materyalle keşfetmekten problem çözmeye uzanan bir öğrenme yoluyla ilerler.`)}
    ${topicsByGrade[g]
      ? topicsByGrade[g]!
          .map((t) => {
            const acts = activitiesByGrade[g].filter((a) => inTopic(t, a))
            const disc = t.interactions.map((id) => interactions.find((m) => m.id === id)).filter((m): m is InteractionMeta => !!m)
            const tools = toolMeta.filter((m) => t.tools.includes(m.id))
            const games = gameMeta.filter((m) => t.games.includes(m.id))
            return `${h2(`${t.unit}. Ünite · ${t.title}`)}${p(esc(t.summary))}${list([...disc.map(interactionLink), ...acts.map(activityLink)])}${tools.length ? p(`<strong>Materyaller:</strong> ${tools.map((m) => link(`/manipulatif/${m.id}`, m.name)).join(', ')}`) : ''}${games.length ? p(`<strong>Oyunlar:</strong> ${games.map((m) => link(`/oyun/${m.id}`, m.name)).join(', ')}`) : ''}`
          })
          .join('')
      : themes
          .map((t) => `${h2(t.title)}${p(`${link(`/sinif/${g}/${t.slug}`, `${t.title} etkinlikleri`)} · ${t.topics.map(esc).join(', ')}`)}${list(themeActivities(t).map(activityLink))}`)
          .join('')}
    ${h2(`${info.label} Matematik Oyunları`)}${list(gamesForGrade(g).map((m) => `${link(`/oyun/${m.id}`, m.name)} <span class="text-ink-soft">– ${txt(m.skills[g] ?? m.description)}</span>`))}`,
  )

  themes.forEach((t, i) => {
    const notes = notesByGrade[g][t.slug]?.bigIdeas ?? []
    const acts = themeActivities(t)
    const prev = themes[i - 1]
    const next = themes[i + 1]
    add(
      themeSeo(t),
      `${crumbs([{ name: info.label, path: `/sinif/${g}` }, { name: t.title }])}
      <p class="text-sm font-extrabold text-ink-soft">${esc(info.label)} · ${i + 1}. tema</p>
      <h1 class="text-3xl font-black sm:text-4xl">${esc(t.title)}</h1>
      ${p(`Konular: ${t.topics.map(esc).join(', ')}.`)}
      ${notes.length ? `${h2('Büyük Fikirler')}${list(notes.map(txt), 'mt-2 list-disc space-y-1 pl-5 font-semibold')}` : ''}
      ${t.outcomes
        .map((o) => {
          const own = acts.filter((a) => a.outcomes.includes(o.code))
          return `${h2(o.short)}${p(`<span class="font-mono text-xs">${esc(o.code)}</span> ${esc(o.title)}`)}${list(own.map((a) => `${activityLink(a)} <span class="text-ink-soft">(${esc(typeLabel[a.type])}${a.stage ? `, ${esc(stageLabel[a.stage])}` : ''})</span>`))}`
        })
        .join('')}
      <nav class="mt-10 flex flex-wrap justify-between gap-3">${prev ? link(`/sinif/${g}/${prev.slug}`, `← ${prev.title}`) : '<span></span>'}${next ? link(`/sinif/${g}/${next.slug}`, `${next.title} →`) : ''}</nav>`,
    )
  })
}

// Etkinlikler
for (const { a, g } of allActivities) {
  const info = gradeInfo[g]
  const theme = themeOf(a)
  const siblings = theme ? themeActivities(theme).filter((x) => x.id !== a.id && x.outcomes[0] === a.outcomes[0]) : []
  add(
    activitySeo(a, g),
    `${crumbs([{ name: info.label, path: `/sinif/${g}` }, ...(theme ? [{ name: theme.title, path: `/sinif/${g}/${theme.slug}` }] : []), { name: plain(a.title) }])}
    <p class="text-sm font-extrabold text-ink-soft">${esc(info.label)} matematik · ${esc(typeLabel[a.type])} etkinliği${a.stage ? ` · ${esc(stageLabel[a.stage])}` : ''}</p>
    <h1 class="text-3xl font-black sm:text-4xl">${txt(a.title)}</h1>
    ${p(txt(a.instructions), 'mt-3 text-lg font-bold')}
    ${a.launch?.text ? `${h2('Başlarken')}${p(txt(a.launch.text))}` : ''}
    ${h2('Öğrenme çıktıları')}${list(a.outcomes.map((c) => `<span class="font-mono text-xs font-bold">${esc(c)}</span> ${esc(outcomeByCode.get(c)?.title ?? '')}`), 'mt-2 space-y-1 font-semibold')}
    ${a.reflect ? `${h2('Düşün ve Paylaş')}${p(txt(a.reflect))}` : ''}
    ${siblings.length ? `${h2('Aynı konuda diğer etkinlikler')}${list(siblings.map(activityLink))}` : ''}
    ${theme ? p(link(`/sinif/${g}/${theme.slug}`, `${theme.title} (${info.label}) tüm etkinlikleri →`), 'mt-8') : ''}`,
  )
}

// Oyunlar
add(
  gamesIndexSeo(),
  `${crumbs([{ name: 'Oyunlar' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Matematik Oyunları</h1>
  ${p('Köprü kur, kurabiye diz, şehir tasarla, gizemleri çöz… Her oyun seçtiğin sınıfa göre değişir; amaç hız değil, düşünmek ve farklı yollar keşfetmek.')}
  ${grades.map((g) => `${h2(`${gradeInfo[g].label} matematik oyunları`)}${list(gamesForGrade(g).map((m) => link(`/oyun/${m.id}`, m.name)))}`).join('')}`,
)
for (const m of gameMeta) {
  const skills = m.grades.filter((g) => m.skills[g])
  const others = gameMeta.filter((o) => o.id !== m.id && o.grades.some((g) => m.grades.includes(g))).slice(0, 6)
  add(
    gameSeo(m),
    `${crumbs([{ name: 'Oyunlar', path: '/oyunlar' }, { name: m.name }])}
    <p class="text-sm font-extrabold text-ink-soft">${range(m.grades)}. sınıf matematik oyunu</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(m.name)}</h1>
    ${p(txt(m.description), 'mt-3 text-lg font-bold')}
    ${m.launch ? `${h2('Başlarken')}${p(txt(m.launch))}` : ''}
    ${m.howTo.length ? `${h2('Nasıl oynanır?')}<ol class="mt-2 list-decimal space-y-1 pl-5 font-semibold">${m.howTo.map((s) => `<li>${txt(s)}</li>`).join('')}</ol>` : ''}
    ${skills.length ? `${h2('Sınıflara göre')}${list(skills.map((g) => `<strong>${esc(gradeInfo[g].label)}:</strong> ${txt(m.skills[g]!)}`), 'mt-2 space-y-1 font-semibold')}` : ''}
    ${m.bigIdea ? `${h2('Büyük fikir')}${p(txt(m.bigIdea))}` : ''}
    ${m.reflect ? `${h2('Düşün ve Paylaş')}${p(txt(m.reflect))}` : ''}
    ${others.length ? `${h2('Bunları da dene')}${list(others.map(gameLink))}` : ''}`,
  )
}

// Keşif Atölyesi
add(
  interactionsIndexSeo(),
  `${crumbs([{ name: 'Keşif Atölyesi' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Keşif Atölyesi</h1>
  ${p('Kur, dene, açıkla: tek doğru cevaba tıklamak yerine matematiksel fikirleri keşfettiren etkileşimli etkinlikler.')}
  ${Object.entries(categoryInfo)
    .map(([k, c]) => {
      const items = interactions.filter((m) => m.category === k)
      return items.length ? `${h2(c.label)}${list(items.map(interactionLink))}` : ''
    })
    .join('')}`,
)
for (const m of interactions) {
  const skills = m.grades.filter((g) => m.skills?.[g])
  const others = interactions.filter((o) => o.id !== m.id && o.category === m.category).slice(0, 6)
  add(
    interactionSeo(m),
    `${crumbs([{ name: 'Keşif Atölyesi', path: '/etkilesimler' }, { name: m.name }])}
    <p class="text-sm font-extrabold text-ink-soft">${range(m.grades)}. sınıf · ${esc(categoryInfo[m.category].label)}</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(m.name)}</h1>
    ${p(txt(m.description), 'mt-3 text-lg font-bold')}
    ${m.launch ? `${h2('Başlarken')}${p(txt(m.launch))}` : ''}
    ${skills.length ? `${h2('Sınıflara göre')}${list(skills.map((g) => `<strong>${esc(gradeInfo[g].label)}:</strong> ${txt(m.skills![g]!)}`), 'mt-2 space-y-1 font-semibold')}` : ''}
    ${m.bigIdea ? `${h2('Büyük fikir')}${p(txt(m.bigIdea))}` : ''}
    ${m.reflect ? `${h2('Düşün ve Paylaş')}${p(txt(m.reflect))}` : ''}
    ${others.length ? `${h2('Benzer keşifler')}${list(others.map(interactionLink))}` : ''}`,
  )
}

// Manipülatifler
add(
  toolsIndexSeo(),
  `${crumbs([{ name: 'Manipülatifler' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Sanal Manipülatifler</h1>
  ${p('Somut matematik materyallerinin dijital hâlleri. Serbestçe keşfet; öğretmenin de derste akıllı tahtada kullanabilir.')}
  ${list(toolMeta.map((t) => `${toolLink(t)} <span class="text-ink-soft">(${esc(t.grades)}. sınıf)</span>`), 'mt-4 space-y-2')}`,
)
for (const t of toolMeta) {
  const tasks = allActivities.filter(({ a }) => a.type === 'manipulative' && a.tool === t.id)
  add(
    toolSeo(t),
    `${crumbs([{ name: 'Manipülatifler', path: '/manipulatifler' }, { name: t.name }])}
    <p class="text-sm font-extrabold text-ink-soft">Sanal manipülatif · ${esc(t.grades)}. sınıf</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(t.name)}</h1>
    ${p(txt(t.description), 'mt-3 text-lg font-bold')}
    ${tasks.length ? `${h2('Bu manipülatifle görevler')}${list(tasks.map(({ a, g }) => `${activityLink(a)} <span class="text-ink-soft">(${esc(gradeInfo[g].label)})</span>`))}` : ''}
    ${h2('Diğer manipülatifler')}${list(toolMeta.filter((o) => o.id !== t.id).map((o) => link(`/manipulatif/${o.id}`, o.name)))}`,
  )
}

// Yaklaşımımız
add(
  approachSeo(),
  `${crumbs([{ name: 'Yaklaşımımız' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Matematiği anlayarak öğrenmek</h1>
  ${p('Sitedeki tüm oyun ve etkinlikler, John A. Van de Walle’ün gelişimsel ve problem çözme odaklı matematik öğretimi yaklaşımına göre tasarlandı ve Türkiye Yüzyılı Maarif Modeli öğretim programının öğrenme çıktılarıyla eşleştirildi.')}
  ${h2('Her etkinlik üç adımdan oluşur')}${list(['<strong>Başlarken:</strong> günlük hayattan kısa bir durum ya da merak uyandıran bir soru.', '<strong>Keşfet:</strong> oyun, model ve manipülatiflerle düşünme; kademeli ipuçları.', '<strong>Düşün ve Paylaş:</strong> “Nasıl düşündün? Başka bir yolu var mı?”'], 'mt-2 space-y-1 font-semibold')}
  ${h2('Öğrenme yolu: somuttan soyuta')}${list(Object.values(stageLabel).map(esc), 'mt-2 list-decimal space-y-1 pl-5 font-semibold')}`,
)

// Online özel ders
add(
  onlineLessonSeo(),
  `${crumbs([{ name: 'Online Özel Ders' }])}
  <p class="text-sm font-extrabold text-brand-ink">${lessonAreas.map(esc).join(' · ')}</p>
  <h1 class="text-3xl font-black sm:text-4xl">Aslı Öğretmen ile online birebir matematik özel dersi</h1>
  ${p(esc(lessonIntro), 'mt-3 text-lg font-semibold')}
  ${h2('Birebir online ders nasıl işler?')}${list(lessonHighlights.map((h) => `<strong>${esc(h.t)}:</strong> ${esc(h.d)}`), 'mt-2 space-y-1 font-semibold')}
  ${h2('Hangi sınıflar için?')}${list(lessonLevels.map((l) => `<strong>${esc(l.t)}:</strong> ${esc(l.d)}`), 'mt-2 space-y-1 font-semibold')}
  ${p(grades.map((g) => link(`/sinif/${g}`, `${gradeInfo[g].label} matematik`)).join(' · '))}
  ${h2('Sık sorulan sorular')}${lessonFaq.map((f) => `<h3 class="mt-4 font-black">${esc(f.q)}</h3>${p(esc(f.a), 'mt-1 font-semibold text-ink-soft')}`).join('')}`,
)

// İndekslenmeyen uygulama sayfası
add(privateSeo('Öğrenci raporu', '/rapor'), '')

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

const render = (seo: PageSeo, body: string) =>
  template.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, headHtml(seo)).replace('<!--app-html-->', body)

const seen = new Set<string>()
for (const { seo, body } of pages) {
  if (seen.has(seo.path)) throw new Error(`Aynı yol iki kez üretildi: ${seo.path}`)
  seen.add(seo.path)
  const file = seo.path === '/' ? join(dist, 'index.html') : join(dist, `${seo.path}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, render(seo, body))
}

// Bilinmeyen yollar: gerçek 404 durum kodu, uygulama "bulunamadı" sayfasını çizer
writeFileSync(join(dist, '404.html'), render(notFoundSeo('/404'), ''))

const today = new Date().toISOString().slice(0, 10)
const prio = (path: string) => (path === '/' ? '1.0' : path === ONLINE_LESSON_PATH || /^\/sinif\/\d$/.test(path) ? '0.9' : /^\/(sinif|oyunlar|etkilesimler|manipulatifler)/.test(path) ? '0.8' : '0.6')
const urls = pages.filter((x) => !x.seo.noindex).map((x) => x.seo.path)
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(abs(u))}</loc><lastmod>${today}</lastmod><priority>${prio(u)}</priority></url>`).join('\n')}
</urlset>
`,
)

console.log(`prerender: ${pages.length} sayfa, sitemap'te ${urls.length} adres (${SITE_NAME})`)
