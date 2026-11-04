/**
 * Arama motorları için statik sayfalar:  pnpm build  (vite build'den sonra otomatik çalışır)
 *
 * Her etkinlik, oyun, tema, manipülatif, keşif ve rehber sayfası için dist/ içine ayrı bir .html yazar.
 * Dosyada sayfaya özel <title>, açıklama, canonical, Open Graph, JSON-LD ve sayfanın okunabilir
 * içeriği bulunur.
 *
 * Sayfa gövdesi iki parçadır:
 *  - <main>: React yüklenince kendi arayüzüyle değiştirilir (JavaScript'siz okuyucular için).
 *  - <section id="seo-article">: örnek sorular, açıklamalar ve iç bağlantılar. React çizilmeden önce
 *    ayrılır ve sayfanın altına geri konur (lib/seoArticle.ts), böylece Google'ın işlediği sayfada da kalır.
 *
 * Ayrıca sitemap.xml, 404.html ve docs/seo-envanter.csv (her adresin başlık/açıklama/H1/kelime sayısı) üretir.
 * (vercel.json: cleanUrls → /oyun/balon ⇒ oyun/balon.html)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gradeInfo, grades, outcomeByCode, themes as allThemes, themesByGrade } from '../src/data/curriculum.ts'
import { activitiesByGrade, notesByGrade } from '../src/data/activities/index.ts'
import type { Activity, Content, FillItem, Grade, MatchPair, QuizQuestion, SortRound, Theme } from '../src/data/types.ts'
import { gameMeta, gamesForGrade, type GameMeta } from '../src/games/meta.ts'
import { toolMeta, type ToolMeta } from '../src/manipulatives/meta.ts'
import { inTopic, topicsByGrade } from '../src/data/topics.ts'
import type { InteractionMeta } from '../src/interactions/types.ts'
import { categoryInfo } from '../src/interactions/types.ts'
import { lessonAreas, lessonFaq, lessonFlow, lessonHero, lessonHighlights, lessonIntro, lessonLevels, lessonPains, lessonPersonas, lessonSteps } from '../src/data/onlineLesson.ts'
import { guides, guidesForOutcome, type Guide } from '../src/data/guides.ts'
import { gameKeyword, interactionKeyword, outcomeKeyword, themeKeyword, toolKeyword } from '../src/data/seoKeywords.ts'
import { generatorKind, runGenerator } from '../src/lib/generators.ts'
import {
  BOARD_PATH, GUIDES_PATH, ONLINE_LESSON_PATH, SITE_NAME, abs, boardSeo, activityHeading, activitySeo, approachSeo, gameHeading, gameKw, gameSeo,
  gamesIndexSeo, gradeSeo, guideSeo, guidesIndexSeo, homeSeo, interactionHeading, interactionKw, interactionSeo,
  interactionsIndexSeo, notFoundSeo, onlineLessonSeo, outcomeKw, plain, privateSeo, readyInteractions, stageLabel,
  themeHeading, themeKw, themeSeo, toolHeading, toolKw, toolSeo, toolsIndexSeo, typeLabel, type PageSeo,
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
const lower = (s: string) => s.toLocaleLowerCase('tr')
const uniq = <T,>(a: T[]) => [...new Set(a)]

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
  [GUIDES_PATH, 'Konu Anlatımı'],
  ['/yaklasim', 'Yaklaşımımız'],
  [ONLINE_LESSON_PATH, 'Online Ders'],
] as const

function shell(main: string, article: string) {
  const header = `<header class="border-b border-line/70 bg-paper"><div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"><a href="/" class="flex items-center gap-2 font-black text-ink"><img src="/logo-96.png" alt="" width="40" height="40" class="size-10" />Aslı Öğretmenimle</a><nav aria-label="Ana menü" class="flex flex-wrap gap-x-3 gap-y-1 text-sm font-extrabold">${NAV.map(([h, l]) => link(h, l, 'text-ink hover:text-brand')).join('')}</nav></div></header>`
  const footer = `<footer class="mt-12 border-t border-line bg-white/60"><div class="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft"><p><strong class="text-ink">Aslı Öğretmenimle</strong> · Aslı Öğretmen’in 1–8. sınıf matematik oyunları, etkinlikleri ve sanal manipülatifleri. ${link(ONLINE_LESSON_PATH, 'Online birebir matematik özel ders')}: ${lessonAreas.join(', ')}.</p>${list(
    grades.map((g) => link(`/sinif/${g}`, `${gradeInfo[g].label} Matematik`, 'font-bold hover:text-brand')),
    'mt-3 flex flex-wrap gap-x-4 gap-y-1',
  )}</div></footer>`
  const art = article ? `<section id="seo-article" class="mx-auto mt-10 max-w-6xl border-t border-line px-4 pt-6 pb-10">${article}</section>` : ''
  return `${header}<main class="mx-auto max-w-6xl px-4 pt-6">${main}</main>${art}${footer}`
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

interface Page { seo: PageSeo; body: string; kind: string; h1: string; keyword: string }
const pages: Page[] = []
const h1Of = (html: string) => plain(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
const add = (kind: string, seo: PageSeo, main: string, article = '', keyword = '') => pages.push({ seo, body: shell(main, article), kind, h1: h1Of(main), keyword })

// ---------------------------------------------------------------------------
// İçerik yardımcıları
// ---------------------------------------------------------------------------

const allActivities = grades.flatMap((g) => activitiesByGrade[g].map((a) => ({ a, g })))
const themeOf = (a: Activity) => outcomeByCode.get(a.outcomes[0])?.theme
const activityLink = (a: Activity) => link(`/etkinlik/${a.id}`, plain(a.title))
const gameLink = (m: GameMeta) => `${link(`/oyun/${m.id}`, m.name)} <span class="text-ink-soft">– ${esc(gameKw(m))}</span>`
const toolLink = (t: ToolMeta) => `${link(`/manipulatif/${t.id}`, toolKw(t))} <span class="text-ink-soft">– ${txt(t.description)}</span>`
const interactionLink = (m: InteractionMeta) => `${link(`/etkilesim/${m.id}`, interactionKw(m))} <span class="text-ink-soft">– ${txt(m.description)}</span>`
const guideLink = (g: Guide) => link(`${GUIDES_PATH}/${g.slug}`, g.title)
const themeLink = (t: Theme) => link(`/sinif/${t.grade}/${t.slug}`, `${themeHeading(t)} etkinlikleri`)
const themeActivities = (t: Theme) => activitiesByGrade[t.grade].filter((a) => themeOf(a)?.slug === t.slug)
const interactions = readyInteractions()
const themeByOutcome = (code: string) => outcomeByCode.get(code)?.theme
const gamesFor = (codes: string[]) => gameMeta.filter((m) => m.outcomes?.some((c) => codes.includes(c)))
const interactionsFor = (codes: string[]) => interactions.filter((m) => m.outcomes?.some((c) => codes.includes(c)))
const guidesFor = (codes: string[]) => guides.filter((g) => g.outcomes.some((c) => codes.includes(c)))
const toolsInActivities = (acts: Activity[]) => toolMeta.filter((t) => acts.some((a) => a.type === 'manipulative' && a.tool === t.id))
const themesFor = (codes: string[]) => uniq(codes.map(themeByOutcome).filter((t): t is Theme => !!t))

const section = (title: string, items: string[], cls?: string) => (items.length ? `${h2(title)}${list(items, cls)}` : '')

// ---------------------------------------------------------------------------
// Etkinliklerden örnek sorular (aynı derlemede hep aynı sorular çıksın diye üreteçler sabit tohumla çalışır)
// ---------------------------------------------------------------------------

function seeded<T>(seed: string, fn: () => T): T {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const orig = Math.random
  Math.random = () => {
    h = (h + 0x6d2b79f5) | 0
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  try {
    return fn()
  } finally {
    Math.random = orig
  }
}

const ctext = (c: Content | undefined) => (c === undefined ? '' : typeof c === 'string' ? c : c.text ?? '')
const answer = (s: string, a: string) => `<details class="mt-1"><summary class="cursor-pointer text-sm font-extrabold text-brand">${esc(s)}</summary><p class="mt-1 text-sm font-semibold text-ink">${a}</p></details>`

/** Etkinliğin soruları; üreteçli etkinliklerde üreteç sabit tohumla çalıştırılır */
function itemsOf(a: Activity): { kind: string; items: unknown[]; generated: boolean } {
  if ('generator' in a && a.generator) {
    const gen = a.generator
    try {
      const items = seeded(a.id, () => runGenerator(gen.id, gen.params ?? {}, 6))
      return { kind: generatorKind(gen.id) ?? a.type, items, generated: true }
    } catch {
      return { kind: a.type, items: [], generated: true }
    }
  }
  const items = a.type === 'quiz' ? a.questions : a.type === 'fill' ? a.items : a.type === 'match' ? a.pairs : a.type === 'sort' ? a.rounds : a.type === 'manipulative' ? a.tasks : []
  return { kind: a.type, items: items ?? [], generated: false }
}

function samples(a: Activity): string {
  if (a.type === 'categorize') {
    const rows = a.categories
      .map((c) => {
        const its = a.items.filter((i) => i.category === c.id).map((i) => plain(ctext(i.content))).filter(Boolean)
        return its.length ? `<strong>${txt(c.label)}:</strong> ${esc(its.slice(0, 6).join(', '))}` : ''
      })
      .filter(Boolean)
    return rows.length ? `${h2('Etkinlikteki gruplar ve örnekler')}${list(rows, 'mt-2 space-y-1 font-semibold')}` : ''
  }
  const { kind, items, generated } = itemsOf(a)
  const anyCorrect = a.type === 'quiz' && a.anyCorrect
  const out: string[] = []
  for (const it of items) {
    if (out.length >= 6) break
    if (kind === 'quiz') {
      const q = it as QuizQuestion
      const prompt = plain(ctext(q.prompt))
      const choices = (q.choices ?? []).map((c) => plain(ctext(c)))
      if (!prompt || choices.some((c) => !c)) continue
      const ans = anyCorrect
        ? (q.reasons ?? []).length ? answer('Olası gerekçeler', esc(q.reasons!.map(plain).join(' · '))) : ''
        : answer('Cevap ve açıklama', `${esc(choices[q.answer] ?? '')}${q.explain ? ` — ${txt(q.explain)}` : ''}`)
      out.push(`<p class="font-bold text-ink">${esc(prompt)}</p><p class="text-sm font-semibold text-ink-soft">Seçenekler: ${esc(choices.join(' · '))}</p>${ans}`)
    } else if (kind === 'fill') {
      const f = it as FillItem
      const t = plain(f.text ?? '').replace(/__/g, '…')
      if (!t || t === '…') continue
      out.push(`<p class="font-bold text-ink">${esc(t)}</p>${answer('Cevap', `${esc(f.answers.map((x) => x.split('|')[0]).join(', '))}${f.explain ? ` — ${txt(f.explain)}` : ''}`)}`)
    } else if (kind === 'match') {
      const m = it as MatchPair
      const l = plain(ctext(m.left)), r = plain(ctext(m.right))
      if (l && r) out.push(`<p class="font-bold text-ink">${esc(l)} ↔ ${esc(r)}</p>`)
    } else if (kind === 'sort') {
      const s = it as SortRound
      const its = (s.items ?? []).map((c) => plain(ctext(c)))
      if (!s.prompt || its.some((x) => !x)) continue
      out.push(`<p class="font-bold text-ink">${txt(s.prompt)}</p>${answer('Doğru sıra', `${s.ends ? `${esc(s.ends[0])} → ${esc(s.ends[1])}: ` : ''}${esc(its.join(', '))}`)}`)
    } else if (kind === 'manipulative') {
      const t = it as { prompt?: string; explain?: string }
      if (t.prompt) out.push(`<p class="font-bold text-ink">${txt(t.prompt)}</p>${t.explain ? p(txt(t.explain), 'text-sm font-semibold text-ink-soft') : ''}`)
    }
  }
  if (!out.length) return ''
  const title = a.type === 'manipulative' ? 'Etkinlikteki görevler' : a.type === 'match' ? 'Etkinlikteki eşleştirmelerden örnekler' : 'Etkinlikteki sorulardan örnekler'
  return `${h2(title)}${generated ? p('Sorular her açılışta yeniden üretilir; aşağıdakiler örnektir.', 'mt-1 text-sm font-semibold text-ink-soft') : ''}<ol class="mt-2 list-decimal space-y-3 pl-5">${out.map((o) => `<li>${o}</li>`).join('')}</ol>`
}

// ---------------------------------------------------------------------------
// Ana sayfa
// ---------------------------------------------------------------------------

add(
  'ana-sayfa',
  homeSeo(),
  `<h1 class="text-3xl font-black sm:text-4xl">Aslı Öğretmenle 1–8. sınıf matematik oyunları ve etkinlikleri</h1>
  ${p(`Aslı Öğretmenimle; 1. sınıftan 8. sınıfa kadar Türkiye Yüzyılı Maarif Modeli matematik öğretim programına uygun ${allActivities.length} interaktif etkinlik, ${gameMeta.length} matematik oyunu, ${toolMeta.length} sanal manipülatif ve konu anlatımları sunar. Tüm etkinlikler ücretsizdir; telefon, tablet, bilgisayar ve akıllı tahtada çalışır.`)}
  ${p(`Aslı Öğretmen, Hatay’da ${lessonAreas.slice(0, 2).join(' ve ')}’daki öğrencilere ${link(ONLINE_LESSON_PATH, 'online birebir matematik özel dersi')} de veriyor.`)}
  ${grades
    .map((g) => `${h2(`${gradeInfo[g].label} Matematik`)}${p(link(`/sinif/${g}`, `${gradeInfo[g].label} matematik etkinlikleri ve oyunları`))}${list(themesByGrade(g).map(themeLink))}`)
    .join('')}
  ${h2('Matematik Oyunları')}${list(gameMeta.map(gameLink))}
  ${h2('Keşif Atölyesi')}${list(interactions.map(interactionLink))}
  ${h2('Sanal Manipülatifler')}${list(toolMeta.map(toolLink))}`,
  `${h2('Matematik konu anlatımları')}${p('En çok merak edilen sorulara kısa, örnekli cevaplar; her rehberde konuyu deneyerek pekiştirebileceğin etkinlikler var.')}${list(guides.map(guideLink))}
  ${h2('Sınıflara göre matematik konuları')}${grades.map((g) => `<h3 class="mt-4 font-black">${link(`/sinif/${g}`, `${gradeInfo[g].label} matematik`, 'hover:text-brand')}</h3>${list(themesByGrade(g).map(themeLink), 'mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm')}`).join('')}
  ${h2('Ücretsiz online matematik araçları')}${list(toolMeta.map((t) => link(`/manipulatif/${t.id}`, toolKw(t))), 'mt-2 flex flex-wrap gap-x-4 gap-y-1')}`,
)

// ---------------------------------------------------------------------------
// Sınıflar ve temalar
// ---------------------------------------------------------------------------

for (const g of grades) {
  const info = gradeInfo[g]
  const themes = themesByGrade(g)
  const codes = themes.flatMap((t) => t.outcomes.map((o) => o.code))
  add(
    'sinif',
    gradeSeo(g),
    `${crumbs([{ name: info.label }])}
    <h1 class="text-3xl font-black sm:text-4xl">${esc(info.label)} Matematik Etkinlikleri ve Oyunları</h1>
    ${p(`${esc(info.label)} matematik konuları için ${activitiesByGrade[g].length} ücretsiz etkinlik: ${(topicsByGrade[g]?.map((t) => t.title) ?? themes.map(themeKw)).map(esc).join(', ')}. Her konu, somut materyalle keşfetmekten problem çözmeye uzanan bir öğrenme yoluyla ilerler.`)}
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
          .map((t) => `${h2(themeHeading(t))}${p(`${themeLink(t)} · ${t.topics.map(esc).join(', ')}`)}${list(themeActivities(t).map(activityLink))}`)
          .join('')}
    ${h2(`${info.label} Matematik Oyunları`)}${list(gamesForGrade(g).map((m) => `${link(`/oyun/${m.id}`, m.name)} <span class="text-ink-soft">– ${txt(m.skills[g] ?? m.description)}</span>`))}`,
    `${h2(`${info.label} matematik konuları`)}${p(`${esc(info.label)} matematik dersinde işlenen konular ve her konu için interaktif etkinlik, oyun ve sanal manipülatifler:`)}
    ${list(themes.map((t) => `${themeLink(t)} <span class="text-ink-soft">– ${esc(t.outcomes.map((o) => outcomeKw(o.code)).join(', '))}</span>`), 'mt-2 space-y-1.5 font-semibold')}
    ${section(`${info.label} konu anlatımları`, guides.filter((x) => x.grades.includes(g)).map(guideLink))}
    ${section(`${info.label} matematik oyunları`, gamesForGrade(g).map((m) => `${link(`/oyun/${m.id}`, gameHeading(m))} <span class="text-ink-soft">– ${txt(m.skills[g] ?? m.description)}</span>`), 'mt-2 space-y-1.5 font-semibold')}
    ${section(`${info.label} için keşif etkinlikleri`, interactionsFor(codes).map(interactionLink))}`,
    `${info.label} matematik`,
  )

  themes.forEach((t, i) => {
    const notes = notesByGrade[g][t.slug]?.bigIdeas ?? []
    const acts = themeActivities(t)
    const codesT = t.outcomes.map((o) => o.code)
    const prev = themes[i - 1]
    const next = themes[i + 1]
    add(
      'tema',
      themeSeo(t),
      `${crumbs([{ name: info.label, path: `/sinif/${g}` }, { name: themeKw(t) }])}
      <p class="text-sm font-extrabold text-ink-soft">${esc(info.label)} · ${i + 1}. tema · ${esc(t.title)}</p>
      <h1 class="text-3xl font-black sm:text-4xl">${esc(themeHeading(t))}</h1>
      ${p(`Konular: ${t.topics.map(esc).join(', ')}.`)}
      ${notes.length ? `${h2('Büyük Fikirler')}${list(notes.map(txt), 'mt-2 list-disc space-y-1 pl-5 font-semibold')}` : ''}
      ${t.outcomes
        .map((o) => {
          const own = acts.filter((a) => a.outcomes.includes(o.code))
          return `${h2(`${info.label} ${outcomeKw(o.code)}`)}${p(`<span class="font-mono text-xs">${esc(o.code)}</span> ${esc(o.title)}`)}${list(own.map((a) => `${activityLink(a)} <span class="text-ink-soft">(${esc(typeLabel[a.type])}${a.stage ? `, ${esc(stageLabel[a.stage])}` : ''})</span>`))}`
        })
        .join('')}`,
      `${h2(`${themeHeading(t)}: bu konuda neler var?`)}
      ${p(`${esc(themeHeading(t))} konusunda ${acts.length} ücretsiz interaktif etkinlik bulunur: ${esc(t.outcomes.map((o) => lower(outcomeKw(o.code))).join(', '))}. Etkinlikler Maarif Modeli öğrenme çıktılarına göre somuttan soyuta sıralanmıştır; önce sanal materyalle keşfedilir, sonra model, sembol ve problem adımlarına geçilir.`)}
      ${section('Konu anlatımı', guidesFor(codesT).map(guideLink))}
      ${section('Bu konuyla ilgili oyunlar', gamesFor(codesT).map(gameLink))}
      ${section('Keşif Atölyesi', interactionsFor(codesT).map(interactionLink))}
      ${section('Sanal manipülatifler', toolsInActivities(acts).map(toolLink))}
      <nav class="mt-10 flex flex-wrap justify-between gap-3">${prev ? link(`/sinif/${g}/${prev.slug}`, `← ${themeHeading(prev)}`) : '<span></span>'}${next ? link(`/sinif/${g}/${next.slug}`, `${themeHeading(next)} →`) : ''}</nav>`,
      themeHeading(t),
    )
  })
}

// ---------------------------------------------------------------------------
// Etkinlikler
// ---------------------------------------------------------------------------

for (const { a, g } of allActivities) {
  const info = gradeInfo[g]
  const theme = themeOf(a)
  const kw = outcomeKw(a.outcomes[0])
  const heading = activityHeading(a, g)
  const siblings = theme ? themeActivities(theme).filter((x) => x.id !== a.id && x.outcomes[0] === a.outcomes[0]) : []
  const tool = a.type === 'manipulative' ? toolMeta.find((t) => t.id === a.tool) : undefined
  const path = [{ name: info.label, path: `/sinif/${g}` }, ...(theme ? [{ name: themeKw(theme), path: `/sinif/${g}/${theme.slug}` }] : []), { name: plain(a.title) }]
  add(
    'etkinlik',
    activitySeo(a, g),
    `${crumbs(path)}
    <p class="text-sm font-extrabold text-ink-soft">${esc(info.label)} matematik · ${esc(typeLabel[a.type])} etkinliği${a.stage ? ` · ${esc(stageLabel[a.stage])}` : ''}</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(heading)}</h1>
    ${p(txt(a.instructions), 'mt-3 text-lg font-bold')}`,
    `${crumbs(path)}
    ${h2(`Etkinlik hakkında: ${heading}`)}
    ${p(`Bu ${esc(lower(typeLabel[a.type]))} etkinliği ${esc(info.label.toLocaleLowerCase('tr'))} matematik dersindeki <strong>${esc(lower(kw || 'matematik'))}</strong> konusunu ${a.stage ? `“${esc(stageLabel[a.stage])}” adımında ` : ''}çalıştırır. ${txt(a.instructions)} Ücretsizdir, üyelik gerektirmez; telefonda, tablette ve akıllı tahtada oynanır.`)}
    ${a.launch?.text ? `${h2('Başlarken')}${p(txt(a.launch.text))}` : ''}
    ${samples(a)}
    ${h2('Öğrenme çıktıları')}${list(a.outcomes.map((c) => `<span class="font-mono text-xs font-bold">${esc(c)}</span> ${esc(outcomeKw(c))}: ${esc(outcomeByCode.get(c)?.title ?? '')}`), 'mt-2 space-y-1 font-semibold')}
    ${a.reflect ? `${h2('Düşün ve Paylaş')}${p(txt(a.reflect))}` : ''}
    ${section('Konu anlatımı', a.outcomes.flatMap(guidesForOutcome).filter((x, i, all) => all.indexOf(x) === i).map(guideLink))}
    ${tool ? section('Bu etkinlikteki sanal manipülatif', [toolLink(tool)]) : ''}
    ${section(`Aynı konuda diğer etkinlikler (${kw || 'matematik'})`, siblings.map(activityLink))}
    ${section('İlgili oyunlar', gamesFor(a.outcomes).slice(0, 6).map(gameLink))}
    ${section('İlgili keşif etkinlikleri', interactionsFor(a.outcomes).slice(0, 6).map(interactionLink))}
    ${theme ? p(`${themeLink(theme)} · ${link(`/sinif/${g}`, `${info.label} matematik`)}`, 'mt-8 font-semibold') : ''}`,
    kw,
  )
}

// ---------------------------------------------------------------------------
// Oyunlar
// ---------------------------------------------------------------------------

add(
  'oyunlar',
  gamesIndexSeo(),
  `${crumbs([{ name: 'Oyunlar' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Matematik Oyunları</h1>
  ${p('Köprü kur, kurabiye diz, şehir tasarla, gizemleri çöz… Her oyun seçtiğin sınıfa göre değişir; amaç hız değil, düşünmek ve farklı yollar keşfetmek.')}
  ${grades.map((g) => `${h2(`${gradeInfo[g].label} matematik oyunları`)}${list(gamesForGrade(g).map((m) => link(`/oyun/${m.id}`, m.name)))}`).join('')}`,
  `${h2('Ücretsiz online matematik oyunları')}${p('Bütün oyunlar ücretsizdir, üyelik gerektirmez ve telefon, tablet, bilgisayar ya da akıllı tahtada oynanır. Oyunlar konulara göre:')}
  ${list(gameMeta.map((m) => `${link(`/oyun/${m.id}`, gameHeading(m))} <span class="text-ink-soft">– ${txt(m.description)}</span>`), 'mt-2 space-y-1.5 font-semibold')}
  ${grades.map((g) => `<h3 class="mt-4 font-black">${esc(gradeInfo[g].label)} matematik oyunları</h3>${list(gamesForGrade(g).map((m) => link(`/oyun/${m.id}`, gameKw(m))), 'mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm')}`).join('')}`,
  'matematik oyunları',
)
for (const m of gameMeta) {
  const skills = m.grades.filter((g) => m.skills[g])
  const codes = m.outcomes ?? []
  const others = gameMeta.filter((o) => o.id !== m.id && o.grades.some((g) => m.grades.includes(g))).slice(0, 6)
  const gds = uniq([...guidesFor(codes), ...guides.filter((x) => x.games?.includes(m.id))])
  add(
    'oyun',
    gameSeo(m),
    `${crumbs([{ name: 'Oyunlar', path: '/oyunlar' }, { name: m.name }])}
    <p class="text-sm font-extrabold text-ink-soft">${range(m.grades)}. sınıf matematik oyunu</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(gameHeading(m))}</h1>
    ${p(txt(m.description), 'mt-3 text-lg font-bold')}`,
    `${crumbs([{ name: 'Oyunlar', path: '/oyunlar' }, { name: m.name }])}
    ${h2(`${m.name}: ${gameKw(m)} hakkında`)}
    ${p(`${esc(m.name)}, ${range(m.grades)}. sınıflar için ücretsiz bir online ${esc(lower(gameKw(m)))}. ${txt(m.description)} Oyun seçilen sınıfa göre zorlaşır; telefon, tablet ve bilgisayarda üyeliksiz oynanır.`)}
    ${m.launch ? `${h2('Başlarken')}${p(txt(m.launch))}` : ''}
    ${m.howTo.length ? `${h2('Nasıl oynanır?')}<ol class="mt-2 list-decimal space-y-1 pl-5 font-semibold">${m.howTo.map((s) => `<li>${txt(s)}</li>`).join('')}</ol>` : ''}
    ${skills.length ? `${h2('Sınıflara göre neler çalışılır?')}${list(skills.map((g) => `<strong>${esc(gradeInfo[g].label)}:</strong> ${txt(m.skills[g]!)}`), 'mt-2 space-y-1 font-semibold')}` : ''}
    ${m.bigIdea ? `${h2('Öğretmenler için büyük fikir')}${p(txt(m.bigIdea))}` : ''}
    ${m.reflect ? `${h2('Düşün ve Paylaş')}${p(txt(m.reflect))}` : ''}
    ${section('Konu anlatımı', gds.map(guideLink))}
    ${section('Bu oyunla ilgili konular', themesFor(codes).map(themeLink))}
    ${section('Bunları da dene', others.map(gameLink))}`,
    gameKw(m),
  )
}

// ---------------------------------------------------------------------------
// Keşif Atölyesi
// ---------------------------------------------------------------------------

add(
  'etkilesimler',
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
  `${h2('İnteraktif matematik etkinlikleri')}${list(interactions.map((m) => link(`/etkilesim/${m.id}`, interactionHeading(m))), 'mt-2 grid gap-1.5 sm:grid-cols-2 font-semibold')}`,
  'interaktif matematik etkinlikleri',
)
for (const m of interactions) {
  const skills = m.grades.filter((g) => m.skills?.[g])
  const codes = m.outcomes ?? []
  const others = interactions.filter((o) => o.id !== m.id && o.category === m.category).slice(0, 6)
  const gds = uniq([...guidesFor(codes), ...guides.filter((x) => x.interactions?.includes(m.id))])
  add(
    'etkilesim',
    interactionSeo(m),
    `${crumbs([{ name: 'Keşif Atölyesi', path: '/etkilesimler' }, { name: m.name }])}
    <p class="text-sm font-extrabold text-ink-soft">${range(m.grades)}. sınıf · ${esc(categoryInfo[m.category].label)}</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(interactionHeading(m))}</h1>
    ${p(txt(m.description), 'mt-3 text-lg font-bold')}`,
    `${crumbs([{ name: 'Keşif Atölyesi', path: '/etkilesimler' }, { name: m.name }])}
    ${h2(`${interactionKw(m)} hakkında`)}
    ${p(`${esc(m.name)}, ${range(m.grades)}. sınıflar için ücretsiz, interaktif bir matematik etkinliğidir. ${txt(m.description)} Derste akıllı tahtada, evde tablette kullanılabilir.`)}
    ${m.launch ? `${h2('Başlarken')}${p(txt(m.launch))}` : ''}
    ${skills.length ? `${h2('Sınıflara göre neler çalışılır?')}${list(skills.map((g) => `<strong>${esc(gradeInfo[g].label)}:</strong> ${txt(m.skills![g]!)}`), 'mt-2 space-y-1 font-semibold')}` : ''}
    ${m.bigIdea ? `${h2('Öğretmenler için büyük fikir')}${p(txt(m.bigIdea))}` : ''}
    ${m.reflect ? `${h2('Düşün ve Paylaş')}${p(txt(m.reflect))}` : ''}
    ${section('Konu anlatımı', gds.map(guideLink))}
    ${section('İlgili konular', themesFor(codes).map(themeLink))}
    ${section('Benzer keşifler', others.map(interactionLink))}`,
    interactionKw(m),
  )
}

// ---------------------------------------------------------------------------
// Manipülatifler
// ---------------------------------------------------------------------------

add(
  'manipulatifler',
  toolsIndexSeo(),
  `${crumbs([{ name: 'Manipülatifler' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Sanal Manipülatifler</h1>
  ${p('Somut matematik materyallerinin dijital hâlleri. Serbestçe keşfet; öğretmenin de derste akıllı tahtada kullanabilir.')}
  ${list(toolMeta.map((t) => `${toolLink(t)} <span class="text-ink-soft">(${esc(t.grades)}. sınıf)</span>`), 'mt-4 space-y-2')}`,
  `${h2('Ücretsiz online matematik araçları')}${p('Kurulum ve üyelik gerektirmeyen sanal manipülatifler; öğretmenler akıllı tahtada, öğrenciler tablette ve telefonda kullanabilir.')}
  ${list(toolMeta.map((t) => `${link(`/manipulatif/${t.id}`, toolKw(t))} <span class="text-ink-soft">– ${esc((toolKeyword[t.id]?.aliases ?? []).join(', '))}</span>`), 'mt-2 space-y-1.5 font-semibold')}`,
  'sanal manipülatifler',
)
for (const t of toolMeta) {
  const tasks = allActivities.filter(({ a }) => a.type === 'manipulative' && a.tool === t.id)
  const codes = uniq(tasks.flatMap(({ a }) => a.outcomes))
  const aliases = toolKeyword[t.id]?.aliases ?? []
  const gds = uniq([...guides.filter((x) => x.tools?.includes(t.id)), ...guidesFor(codes)])
  add(
    'manipulatif',
    toolSeo(t),
    `${crumbs([{ name: 'Manipülatifler', path: '/manipulatifler' }, { name: t.name }])}
    <p class="text-sm font-extrabold text-ink-soft">Sanal manipülatif · ${esc(t.grades)}. sınıf</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(toolHeading(t))}</h1>
    ${p(txt(t.description), 'mt-3 text-lg font-bold')}`,
    `${crumbs([{ name: 'Manipülatifler', path: '/manipulatifler' }, { name: t.name }])}
    ${h2(`${toolKw(t)} nedir, nasıl kullanılır?`)}
    ${p(`${esc(t.name)}, ${esc(t.grades)}. sınıf matematik dersleri için ücretsiz, interaktif bir sanal manipülatiftir${aliases.length ? ` (${esc(aliases.join(', '))})` : ''}. ${txt(t.description)}`)}
    ${p('Kurulum ya da üyelik gerekmez. Öğretmenler akıllı tahtada sınıfla birlikte, öğrenciler evde tablet veya telefonda kullanabilir. Önce serbestçe keşfetmek, sonra aşağıdaki görevlerle belirli bir hedefe çalışmak en verimli yoldur.')}
    ${tasks.length ? `${h2(`${toolKw(t)} ile görevler`)}${list(tasks.map(({ a, g }) => `${activityLink(a)} <span class="text-ink-soft">(${esc(gradeInfo[g].label)} · ${esc(outcomeKw(a.outcomes[0]))})</span>`))}` : ''}
    ${section('Konu anlatımı', gds.map(guideLink))}
    ${section('İlgili konular', themesFor(codes).map(themeLink))}
    ${h2('Diğer sanal manipülatifler')}${list(toolMeta.filter((o) => o.id !== t.id).map((o) => link(`/manipulatif/${o.id}`, toolKw(o))))}`,
    toolKw(t),
  )
}

// ---------------------------------------------------------------------------
// Konu anlatımları (React aynı içeriği kendisi çizer; ayrı bir seo-article gerekmez)
// ---------------------------------------------------------------------------

add(
  'rehberler',
  guidesIndexSeo(),
  `${crumbs([{ name: 'Konu Anlatımları' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Matematik Konu Anlatımları</h1>
  ${p('En çok merak edilen matematik sorularına kısa ve örnekli cevaplar. Her rehberin sonunda konuyu deneyerek pekiştirebileceğin etkinlikler, oyunlar ve sanal manipülatifler var.')}
  ${list(guides.map((g) => `${guideLink(g)} <span class="text-ink-soft">(${range(g.grades)}. sınıf)</span>`), 'mt-4 space-y-2')}`,
  '',
  'matematik konu anlatımı',
)
for (const g of guides) {
  const acts = allActivities.filter(({ a }) => g.outcomes.includes(a.outcomes[0])).slice(0, 12)
  const games = gameMeta.filter((m) => g.games?.includes(m.id))
  const tools = toolMeta.filter((t) => g.tools?.includes(t.id))
  const inter = interactions.filter((m) => g.interactions?.includes(m.id))
  const i = guides.indexOf(g)
  add(
    'rehber',
    guideSeo(g),
    `${crumbs([{ name: 'Konu Anlatımları', path: GUIDES_PATH }, { name: g.title }])}
    <p class="text-sm font-extrabold text-ink-soft">${range(g.grades)}. sınıf matematik</p>
    <h1 class="text-3xl font-black sm:text-4xl">${esc(g.title)}</h1>
    ${p(esc(g.intro), 'mt-4 text-lg font-bold text-ink')}
    ${g.sections.map((s) => `${h2(s.h)}${s.p.map((x) => p(esc(x))).join('')}${s.list ? list(s.list.map(esc), 'mt-2 list-disc space-y-1 pl-5 font-semibold') : ''}`).join('')}
    ${section('Deneyerek öğren: etkinlikler', [...inter.map(interactionLink), ...acts.map(({ a, g: gr }) => `${activityLink(a)} <span class="text-ink-soft">(${esc(gradeInfo[gr].label)})</span>`)])}
    ${section('Oyunlar', games.map(gameLink))}
    ${section('Sanal manipülatifler', tools.map(toolLink))}
    ${h2('Sık sorulan sorular')}${g.faq.map((f) => `<h3 class="mt-4 font-black">${esc(f.q)}</h3>${p(esc(f.a), 'mt-1 font-semibold text-ink-soft')}`).join('')}
    ${section('İlgili konular', themesFor(g.outcomes).map(themeLink))}
    <nav class="mt-10 flex flex-wrap justify-between gap-3">${guides[i - 1] ? link(`${GUIDES_PATH}/${guides[i - 1].slug}`, `← ${guides[i - 1].title}`) : '<span></span>'}${guides[i + 1] ? link(`${GUIDES_PATH}/${guides[i + 1].slug}`, `${guides[i + 1].title} →`) : ''}</nav>`,
    '',
    g.seoTitle,
  )
}

// ---------------------------------------------------------------------------
// Yaklaşımımız, online ders
// ---------------------------------------------------------------------------

add(
  'sayfa',
  approachSeo(),
  `${crumbs([{ name: 'Yaklaşımımız' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Matematiği anlayarak öğrenmek</h1>
  ${p('Sitedeki tüm oyun ve etkinlikler, John A. Van de Walle’ün gelişimsel ve problem çözme odaklı matematik öğretimi yaklaşımına göre tasarlandı ve Türkiye Yüzyılı Maarif Modeli öğretim programının öğrenme çıktılarıyla eşleştirildi.')}
  ${h2('Her etkinlik üç adımdan oluşur')}${list(['<strong>Başlarken:</strong> günlük hayattan kısa bir durum ya da merak uyandıran bir soru.', '<strong>Keşfet:</strong> oyun, model ve manipülatiflerle düşünme; kademeli ipuçları.', '<strong>Düşün ve Paylaş:</strong> “Nasıl düşündün? Başka bir yolu var mı?”'], 'mt-2 space-y-1 font-semibold')}
  ${h2('Öğrenme yolu: somuttan soyuta')}${list(Object.values(stageLabel).map(esc), 'mt-2 list-decimal space-y-1 pl-5 font-semibold')}`,
)

add(
  'sayfa',
  onlineLessonSeo(),
  `${crumbs([{ name: 'Online Özel Ders' }])}
  <p class="text-sm font-extrabold text-brand-ink">${lessonAreas.map(esc).join(' · ')}</p>
  <h1 class="text-3xl font-black sm:text-4xl">Aslı Öğretmen ile online birebir matematik özel dersi</h1>
  ${p(esc(lessonHero.title), 'mt-3 text-lg font-bold')}
  ${p(esc(lessonIntro), 'mt-3 text-lg font-semibold')}
  ${p(esc(lessonHero.lead))}
  ${h2('Bu cümleler size tanıdık geliyor mu?')}${list(lessonPains.map(esc), 'mt-2 space-y-1 font-semibold')}
  ${lessonPersonas.map((x) => `<h3 class="mt-4 font-black">${esc(x.label)}</h3>${p(`<strong>${esc(x.title)}</strong> ${esc(x.body)}`, 'mt-1 font-semibold text-ink-soft')}`).join('')}
  ${h2('4 adımda başlıyoruz')}${list(lessonSteps.map((s) => `<strong>${esc(s.t)}:</strong> ${esc(s.d)}`), 'mt-2 list-decimal space-y-1 pl-5 font-semibold')}
  ${h2('Bir ders nasıl geçer?')}${list(lessonFlow.map((f) => `<strong>${esc(f.t)}:</strong> ${esc(f.d)}`), 'mt-2 list-decimal space-y-1 pl-5 font-semibold')}
  ${h2('Birebir online ders nasıl işler?')}${list(lessonHighlights.map((h) => `<strong>${esc(h.t)}:</strong> ${esc(h.d)}`), 'mt-2 space-y-1 font-semibold')}
  ${h2('Hangi sınıflar için?')}${list(lessonLevels.map((l) => `<strong>${esc(l.t)}:</strong> ${esc(l.d)}`), 'mt-2 space-y-1 font-semibold')}
  ${p(grades.map((g) => link(`/sinif/${g}`, `${gradeInfo[g].label} matematik`)).join(' · '))}
  ${h2('Sık sorulan sorular')}${lessonFaq.map((f) => `<h3 class="mt-4 font-black">${esc(f.q)}</h3>${p(esc(f.a), 'mt-1 font-semibold text-ink-soft')}`).join('')}`,
)

add(
  'manipulatif',
  boardSeo(),
  `${crumbs([{ name: 'Manipülatifler', path: '/manipulatifler' }, { name: 'Matematik Tuvali' }])}
  <h1 class="text-3xl font-black sm:text-4xl">Matematik Tuvali</h1>
  ${p('Sınırsız bir tuvalde 80’den fazla sanal manipülatif: parçaları kenar çubuğundan sürükleyin, döndürün, renklendirin; kalemle çizin, geometrik çizimler yapın, metin ve denklem ekleyin.', 'mt-3 text-lg font-bold')}`,
  `${h2('Tuvalde neler var?')}${list(
    [
      '<strong>Geometri:</strong> örüntü blokları, çokgenler, poliominolar, tangram, Penrose ve Einstein karoları, beşgen döşemeleri, 3B cisimler, cetvel, iletki, gönye ve pergel.',
      '<strong>Sayılar:</strong> onluk taban blokları, sayı çubukları, onluk çerçeve, sayı kartları, sayı doğrusu, asal çarpan daireleri, yüzlük tablo, abaküs ve patlayan noktalar.',
      '<strong>Kesirler ve cebir:</strong> kesir şeritleri ve daireleri, cebir karoları, terazi, fonksiyon makinesi, koordinat düzlemi ve değişken kaydırıcıları.',
      '<strong>Olasılık ve veri:</strong> zar, para, çark, rastgele sayı, grafikler, kutu grafiği ve oyun kâğıtları.',
      '<strong>Uygulamalar:</strong> klavye ve müzik, mantık devreleri, satranç, paralar, saatler ve domino taşları.',
    ],
    'mt-2 space-y-1 font-semibold',
  )}
  ${p(`${link('/manipulatifler', 'Diğer sanal manipülatifler')} · ${link(BOARD_PATH, 'Matematik Tuvalini aç')}`)}`,
  'matematik tuvali',
)

// İndekslenmeyen uygulama sayfası
add('gizli', privateSeo('Öğrenci raporu', '/rapor'), '')

// ---------------------------------------------------------------------------
// Denetim: eksik anahtar kelimeler, yinelenen başlıklar
// ---------------------------------------------------------------------------

const missing = [
  ...[...outcomeByCode.keys()].filter((c) => !outcomeKeyword[c]).map((c) => `çıktı ${c}`),
  ...allThemes.filter((t) => !themeKeyword[`${t.grade}/${t.slug}`]).map((t) => `tema ${t.grade}/${t.slug}`),
  ...gameMeta.filter((m) => !gameKeyword[m.id]).map((m) => `oyun ${m.id}`),
  ...toolMeta.filter((t) => !toolKeyword[t.id]).map((t) => `manipülatif ${t.id}`),
  ...interactions.filter((m) => !interactionKeyword[m.id]).map((m) => `etkileşim ${m.id}`),
]
if (missing.length) console.warn(`prerender: src/data/seoKeywords.ts içinde anahtar kelimesi olmayanlar (${missing.length}): ${missing.join(', ')}`)

const indexed = pages.filter((x) => !x.seo.noindex)
const byTitle = new Map<string, string[]>()
for (const x of indexed) byTitle.set(x.seo.title, [...(byTitle.get(x.seo.title) ?? []), x.seo.path])
const dups = [...byTitle].filter(([, ps]) => ps.length > 1)
if (dups.length) console.warn(`prerender: ${dups.length} başlık birden fazla sayfada kullanılıyor:\n${dups.map(([t, ps]) => `  "${t}": ${ps.join(', ')}`).join('\n')}`)

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
const prio = (path: string) => (path === '/' ? '1.0' : path === ONLINE_LESSON_PATH || /^\/sinif\/\d$/.test(path) ? '0.9' : /^\/(sinif|oyunlar|etkilesimler|manipulatifler|rehber)/.test(path) ? '0.8' : '0.6')
const urls = indexed.map((x) => x.seo.path)
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(abs(u))}</loc><lastmod>${today}</lastmod><priority>${prio(u)}</priority></url>`).join('\n')}
</urlset>
`,
)

// SEO envanteri: her adresin hedef kelimesi, başlığı, açıklaması, H1'i ve kelime sayısı
const csv = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`
const words = (html: string) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
writeFileSync(
  join(root, 'docs', 'seo-envanter.csv'),
  `\uFEFF${['adres', 'tür', 'hedef kelime', 'title', 'title uzunluğu', 'description', 'description uzunluğu', 'H1', 'kelime sayısı'].map(csv).join(',')}\n${indexed
    .map((x) => [abs(x.seo.path), x.kind, x.keyword, x.seo.title, x.seo.title.length, x.seo.description, x.seo.description.length, x.h1, words(x.body)].map(csv).join(','))
    .join('\n')}\n`,
)

console.log(`prerender: ${pages.length} sayfa, sitemap'te ${urls.length} adres, ${guides.length} rehber (${SITE_NAME})`)
