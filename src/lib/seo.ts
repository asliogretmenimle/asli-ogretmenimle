/**
 * Arama motoru bilgileri (başlık, açıklama, canonical, yapılandırılmış veri).
 * Tarayıcıda usePageTitle (components/Layout.tsx), derlemede scripts/prerender.ts aynı fonksiyonları kullanır.
 */
import type { Activity, ActivityType, Grade, Stage, Theme } from '../data/types'
import { withSeoOverride } from '../cms/seoOverrides'
import { findTheme, gradeInfo, grades, isGrade, outcomeByCode, themesByGrade } from '../data/curriculum'
import { topicsByGrade } from '../data/topics'
import { gameMeta, gameMetaById, type GameId, type GameMeta } from '../games/meta'
import { toolMeta, toolMetaById, type ToolMeta } from '../manipulatives/meta'
import { interactionById, interactionMeta } from '../interactions/meta'
import type { InteractionMeta } from '../interactions/types'
import type { ManipulativeTool } from '../data/types'
import { getPageContent } from '../cms/pageContent'
import { lessonPage } from '../cms/pages/onlineOzelDers'
import { gameKeyword, interactionKeyword, outcomeKeyword, themeKeyword, toolKeyword } from '../data/seoKeywords'
import { guideBySlug, guides, guidesUpdated, type Guide } from '../data/guides'
import { gradeContent } from '../data/gradeContent'
import { TEST_PATH, testPath } from '../data/tests'

export const SITE_URL = 'https://www.asliogretmenimle.com'
export const SITE_NAME = 'Aslı Öğretmenimle'
export const SITE_ALT_NAMES = ['Aslı Öğretmen', 'Aslı Öğretmenle', 'Aslı Öğretmenim', 'Aslı Hoca']
export const OG_IMAGE = `${SITE_URL}/og-image.png`
export const ONLINE_LESSON_PATH = '/online-ozel-ders'
export const BOARD_PATH = '/tuval'
export const TIMES_PATH = '/carpim-tablosu'

/** Eğitim-öğretim yılı: Eylül'den itibaren yeni yıl ("2026-2027"). Rakip test sayfaları başlıkta yıl kullanıyor */
export function schoolYear(d = new Date()) {
  const y = d.getFullYear()
  return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export interface PageSeo {
  title: string
  description: string
  /** Canonical yol, ör. "/oyun/balon" */
  path: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>[]
}

export const typeLabel: Record<ActivityType, string> = {
  match: 'Eşleştirme',
  fill: 'Boşluk Doldurma',
  sort: 'Sürükle-Sırala',
  categorize: 'Sürükle-Grupla',
  quiz: 'Test',
  manipulative: 'Manipülatif',
}

export const stageLabel: Record<Stage, string> = {
  somut: 'Yap ve Keşfet',
  model: 'Resimle Düşün',
  sembol: 'Sembolle Çöz',
  problem: 'Problem ve Gerekçe',
}

const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' }

/** MathText gösterimini düz metne çevirir: [[3/4]] → 3/4, x^{2} → x², √{16} → √16 */
export function plain(text: string): string {
  return text
    .replace(/\[\[\s*(?:(-?\d+)\s+)?([^\]/]+)\/([^\]]+)\]\]/g, (_, w, n, d) => `${w ? `${w} ` : ''}${n}/${d}`)
    .replace(/\^\{([^{}]*)\}/g, (_, e: string) => ([...e].every((c) => c in SUP) ? [...e].map((c) => SUP[c]).join('') : `^(${e})`))
    .replace(/√\{([^{}]*)\}/g, (_, e: string) => (/^[\w.]+$/.test(e) ? `√${e}` : `√(${e})`))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Açıklamayı ~158 karakterde kelime sınırından keser */
export function clip(text: string, max = 158): string {
  const t = plain(text)
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,;:·–-]+$/, '')}…`
}

/** Marka yalnızca sığıyorsa eklenir: Google ~60 karakterden sonrasını keser, konu kelimesi önde kalmalı */
const withBrand = (t: string) => (t.length + SITE_NAME.length + 3 <= 65 ? `${t} | ${SITE_NAME}` : t)

/** Bing 70 karakterden uzun <title>'ları uyarır (Google da kısaltır) */
export const MAX_TITLE = 70
/**
 * Adaylardan sırayla ilk sığanı döndürür. İlk aday her zaman en açıklayıcısıdır, bu yüzden
 * zaten kısa olan başlıklar hiç değişmez. Hiçbiri sığmazsa sonuncusu kelime sınırında kesilir.
 */
export function fitTitle(...candidates: string[]): string {
  const list = [...new Set(candidates.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean))]
  const hit = list.find((c) => c.length <= MAX_TITLE)
  if (hit) return hit
  const last = list[list.length - 1]
  return last.slice(0, last.lastIndexOf(' ', MAX_TITLE)).replace(/[\s,;:–-]+$/, '')
}
/** "Şerit modeli: bir bütün, iki parça" → "Şerit modeli"; "Hangisi farklı? (Kesirler)" → "Hangisi farklı?" */
const firstClause = (t: string) => {
  const m = /^(.{6,}?)(?:[:–—(]|(?<=\?)\s)/.exec(t)
  return m ? m[1].trim() : t
}
const noEtkinlik = (kw: string) => kw.replace(/ Etkinliği$/, '')
const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/[^0-9a-zçğıöşüâî]/g, '')
/** a, b'yi (ya da b, a'yı) içeriyor mu? Başlıkta aynı ifadeyi iki kez yazmamak için */
const overlaps = (a: string, b: string) => norm(a).includes(norm(b)) || norm(b).includes(norm(a))
const lower = (s: string) => s.toLocaleLowerCase('tr')
const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)
export const abs = (path: string) => `${SITE_URL}${path === '/' ? '' : path}` || SITE_URL
const gradeRange = (g: Grade[]) => (g.length === 1 ? `${g[0]}` : `${g[0]}–${g[g.length - 1]}`)
const ageRange = (g: Grade[]) => `${Math.min(...g) + 5}-${Math.max(...g) + 6}`

const ORG_ID = `${SITE_URL}/#organization`
const SITE_ID = `${SITE_URL}/#website`
const TEACHER_ID = `${SITE_URL}/#asli-ogretmen`

const orgRef = { '@id': ORG_ID }

const areaServed = [
  { '@type': 'City', name: 'Antakya', containedInPlace: { '@type': 'AdministrativeArea', name: 'Hatay' } },
  { '@type': 'City', name: 'Samandağ', containedInPlace: { '@type': 'AdministrativeArea', name: 'Hatay' } },
  { '@type': 'AdministrativeArea', name: 'Hatay', containedInPlace: { '@type': 'Country', name: 'Türkiye' } },
]

const teacher = {
  '@type': 'Person',
  '@id': TEACHER_ID,
  name: 'Aslı Öğretmen',
  alternateName: ['Aslı Hoca', 'Aslı Öğretmenim'],
  knowsAbout: ['Matematik', 'İlkokul matematiği', 'Ortaokul matematiği', 'Maarif Modeli'],
  url: abs(ONLINE_LESSON_PATH),
  worksFor: orgRef,
}

const siteGraph = [
  {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: SITE_ALT_NAMES,
    inLanguage: 'tr-TR',
    publisher: orgRef,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?ara={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@type': 'EducationalOrganization',
    '@id': ORG_ID,
    name: SITE_NAME,
    alternateName: SITE_ALT_NAMES,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-512.png`,
    image: OG_IMAGE,
    description: 'Aslı Öğretmen’in 1–8. sınıf matematik oyunları, etkinlikleri ve sanal manipülatifleri; Hatay, Antakya ve Samandağ’da online birebir matematik özel dersi.',
    areaServed,
    address: { '@type': 'PostalAddress', addressLocality: 'Antakya', addressRegion: 'Hatay', addressCountry: 'TR' },
    knowsLanguage: 'tr',
    founder: { '@id': TEACHER_ID },
  },
  teacher,
]

function graph(...nodes: Record<string, unknown>[]) {
  return [{ '@context': 'https://schema.org', '@graph': nodes }]
}

function breadcrumb(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Ana sayfa', path: '/' }, ...items].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  }
}

function learningResource(o: { path: string; name: string; description: string; type: string; grades: Grade[]; teaches?: string[]; outcomes?: string[] }) {
  return {
    '@type': 'LearningResource',
    '@id': `${abs(o.path)}#resource`,
    url: abs(o.path),
    name: o.name,
    description: o.description,
    inLanguage: 'tr-TR',
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    learningResourceType: o.type,
    educationalLevel: o.grades.map((g) => gradeInfo[g].label),
    typicalAgeRange: ageRange(o.grades),
    about: { '@type': 'Thing', name: 'Matematik' },
    ...(o.teaches?.length ? { teaches: o.teaches } : {}),
    ...(o.outcomes?.length
      ? {
          educationalAlignment: o.outcomes.map((c) => ({
            '@type': 'AlignmentObject',
            alignmentType: 'teaches',
            educationalFramework: 'Türkiye Yüzyılı Maarif Modeli Matematik Öğretim Programı',
            targetName: c,
            targetDescription: outcomeByCode.get(c)?.title,
          })),
        }
      : {}),
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    provider: orgRef,
    image: OG_IMAGE,
  }
}

// ---------------------------------------------------------------------------
// Aranan konu adları (data/seoKeywords.ts)
// ---------------------------------------------------------------------------

/** Öğrenme çıktısının aranan konu adı: "Kesirleri Karşılaştırma" */
export const outcomeKw = (code?: string) => (code ? outcomeKeyword[code] ?? outcomeByCode.get(code)?.short ?? '' : '')
/** Temanın aranan konu adı: "Kesirler" (müfredat adı "Sayılar ve Nicelikler (2)" yerine) */
export const themeKw = (t: Theme) => themeKeyword[`${t.grade}/${t.slug}`] ?? t.topics.slice(0, 3).join(', ')
/** Tema sayfasının H1'i: "5. Sınıf Kesirler" */
export const themeHeading = (t: Theme) => `${gradeInfo[t.grade].label} ${themeKw(t)}`
export const gameKw = (m: GameMeta) => gameKeyword[m.id] ?? 'Matematik Oyunu'
export const toolKw = (t: ToolMeta) => toolKeyword[t.id]?.keyword ?? t.name
export const interactionKw = (m: InteractionMeta) => interactionKeyword[m.id] ?? m.name

/** Etkinliğin konu başlığı: "5. Sınıf Kesirleri Karşılaştırma: Karşılaştırma stratejileri" */
export function activityHeading(a: Activity, g: Grade) {
  const label = gradeInfo[g].label
  const t = plain(a.title)
  const kw = outcomeKw(a.outcomes[0])
  if (!kw || overlaps(t, kw)) return `${label} ${upperFirst(t)}`
  return `${label} ${kw}: ${t}`
}

export function gameHeading(m: GameMeta) {
  const kw = gameKw(m)
  return overlaps(m.name, kw) ? `${m.name} – ${gradeRange(m.grades)}. Sınıf Matematik Oyunu` : `${kw}: ${m.name} (${gradeRange(m.grades)}. Sınıf)`
}

/** Etkinliğin <title>'ı: H1 (activityHeading) uzunsa kısa adaylara iner */
export function activityTitle(a: Activity, g: Grade) {
  const label = gradeInfo[g].label
  const t = plain(a.title)
  const kw = outcomeKw(a.outcomes[0])
  const full = activityHeading(a, g)
  if (!kw || overlaps(t, kw)) return fitTitle(full, `${label} ${upperFirst(firstClause(t))}`)
  // Anahtar kelime başlıkta kalmalı: sınıf adı düşebilir, konu adı düşmez
  return fitTitle(full, `${label} ${kw}: ${firstClause(t)}`, `${kw}: ${t}`, `${kw}: ${firstClause(t)}`, `${label} ${kw} – ${typeLabel[a.type]} Etkinliği`, `${label} ${kw}`)
}

export function interactionTitle(m: InteractionMeta) {
  const kw = interactionKw(m)
  const r = `(${gradeRange(m.grades)}. Sınıf)`
  // Ad zaten konu adını içeriyorsa ("Zihinden Toplama ve Çıkarma Stratejileri") ikisini art arda yazma
  if (overlaps(m.name, noEtkinlik(kw))) return fitTitle(interactionHeading(m), `${m.name} ${r}`, m.name)
  return fitTitle(interactionHeading(m), `${noEtkinlik(kw)}: ${m.name} ${r}`, `${kw}: ${m.name}`, `${noEtkinlik(kw)}: ${m.name}`, `${m.name} ${r}`, `${kw} ${r}`)
}

export function interactionHeading(m: InteractionMeta) {
  const kw = interactionKw(m)
  return overlaps(m.name, kw) ? `${kw} (${gradeRange(m.grades)}. Sınıf)` : `${kw}: ${m.name} (${gradeRange(m.grades)}. Sınıf)`
}

export function toolHeading(t: ToolMeta) {
  const kw = toolKw(t)
  return /^online/i.test(kw) ? `${kw} – Ücretsiz Sanal Manipülatif` : `${kw} – Ücretsiz Online Matematik Aracı`
}

// ---------------------------------------------------------------------------
// Sayfalar
// ---------------------------------------------------------------------------

export function homeSeo(): PageSeo {
  return {
    title: `Matematik Oyunları ve Etkinlikleri 1–8. Sınıf | ${SITE_NAME}`,
    description: 'Aslı Öğretmen’in ücretsiz 1–8. sınıf matematik oyunları, 800’den fazla interaktif etkinlik, konu anlatımları ve sanal manipülatifler. Maarif Modeli’ne uygun, üyeliksiz.',
    path: '/',
    jsonLd: graph(...siteGraph),
  }
}

/** Sınıfın konu adları (ünite sırasıyla) */
export const gradeTopicNames = (g: Grade) => [...new Set(topicsByGrade[g]?.map((t) => t.title) ?? themesByGrade(g).map(themeKw))]

/** Sınıf sayfasının sık sorulan soruları: konu listesi sorusu veriden, diğerleri data/gradeContent.ts'ten */
export function gradeFaq(g: Grade) {
  const label = gradeInfo[g].label
  const names = gradeTopicNames(g)
  return [
    {
      q: `${label} matematik konuları nelerdir?`,
      a: `${label} matematik konuları (Maarif Modeli öğretim programına göre): ${names.join(', ')}. Sitede her konu için ücretsiz etkinlik, oyun ve sanal manipülatif bulunur.`,
    },
    ...gradeContent[g].faq,
  ]
}

export function gradeSeo(g: Grade): PageSeo {
  const info = gradeInfo[g]
  const themes = themesByGrade(g)
  const path = `/sinif/${g}`
  const faq = gradeFaq(g)
  return {
    // "6. sınıf matematik" ve "6. sınıf matematik konuları" aramalarının ikisini de karşılar
    title: g === 8 ? `8. Sınıf Matematik Konuları ve Etkinlikleri (LGS)` : withBrand(`${info.label} Matematik Konuları, Etkinlikleri ve Oyunları`),
    description: clip(`${info.label} matematik konuları: ${gradeTopicNames(g).join(', ')}. Ücretsiz etkinlik, oyun ve konu anlatımları.`),
    path,
    jsonLd: graph(
      { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      {
        '@type': 'CollectionPage',
        '@id': `${abs(path)}#page`,
        url: abs(path),
        name: `${info.label} Matematik Etkinlikleri`,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: themes.map((t) => ({ '@type': 'WebPage', name: themeHeading(t), url: abs(`/sinif/${g}/${t.slug}`) })),
      },
      breadcrumb([{ name: info.label, path }]),
    ),
  }
}

export function themeSeo(t: Theme): PageSeo {
  const info = gradeInfo[t.grade]
  const path = `/sinif/${t.grade}/${t.slug}`
  return {
    title: withBrand(fitTitle(`${themeHeading(t)} Etkinlikleri`, themeHeading(t))),
    description: clip(`${themeHeading(t)} etkinlikleri ve oyunları: ${t.outcomes.map((o) => lower(outcomeKw(o.code))).join(', ')}. Ücretsiz, interaktif, Maarif Modeli’ne uygun.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        '@id': `${abs(path)}#page`,
        url: abs(path),
        name: themeHeading(t),
        alternateName: `${t.title} (${info.label})`,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        about: t.topics.map((name) => ({ '@type': 'Thing', name })),
      },
      breadcrumb([
        { name: info.label, path: `/sinif/${t.grade}` },
        { name: themeKw(t), path },
      ]),
    ),
  }
}

export function activitySeo(a: Activity, g: Grade): PageSeo {
  const info = gradeInfo[g]
  const oc = outcomeByCode.get(a.outcomes[0])
  const theme = oc?.theme
  const path = `/etkinlik/${a.id}`
  const title = plain(a.title)
  const kw = outcomeKw(a.outcomes[0])
  const description = clip(`${info.label} ${kw ? lower(kw) : 'matematik'} etkinliği (${lower(typeLabel[a.type])}): ${/[.!?…]$/.test(title) ? title : `${title}.`} ${plain(a.instructions)} Ücretsiz ve online; telefonda, tablette ve akıllı tahtada çalışır.`)
  return {
    title: withBrand(activityTitle(a, g)),
    description,
    path,
    jsonLd: graph(
      learningResource({
        path,
        name: title,
        description,
        type: `${typeLabel[a.type]} etkinliği`,
        grades: [g],
        teaches: a.outcomes.map((c) => outcomeByCode.get(c)?.short).filter((x): x is string => !!x),
        outcomes: a.outcomes,
      }),
      breadcrumb([
        { name: info.label, path: `/sinif/${g}` },
        ...(theme ? [{ name: themeKw(theme), path: `/sinif/${g}/${theme.slug}` }] : []),
        { name: title, path },
      ]),
    ),
  }
}

export function gamesIndexSeo(): PageSeo {
  const path = '/oyunlar'
  return {
    title: withBrand('Matematik Oyunları 1–8. Sınıf (Ücretsiz)'),
    description: clip(`Ücretsiz, eğitici online matematik oyunları: ${[...new Set(gameMeta.map((m) => lower(gameKw(m))))].slice(0, 9).join(', ')} ve daha fazlası. Her oyun seçilen sınıfa göre zorlaşır.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        url: abs(path),
        name: 'Matematik Oyunları',
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: gameMeta.map((m) => ({ '@type': 'LearningResource', name: m.name, url: abs(`/oyun/${m.id}`) })),
      },
      breadcrumb([{ name: 'Oyunlar', path }]),
    ),
  }
}

export function gameSeo(m: GameMeta): PageSeo {
  const path = `/oyun/${m.id}`
  const range = gradeRange(m.grades)
  const description = clip(`${m.name}: ${range}. sınıflar için ücretsiz online ${lower(gameKw(m))}. ${plain(m.description)} Telefon, tablet ve bilgisayarda üyeliksiz oynanır.`)
  return {
    title: withBrand(fitTitle(gameHeading(m), `${m.name} – ${gameKw(m)}`, m.name)),
    description,
    path,
    jsonLd: graph(
      learningResource({
        path,
        name: m.name,
        description,
        type: 'Eğitsel oyun',
        grades: m.grades,
        teaches: Object.values(m.skills).filter((x): x is string => !!x),
        outcomes: m.outcomes,
      }),
      breadcrumb([
        { name: 'Oyunlar', path: '/oyunlar' },
        { name: m.name, path },
      ]),
    ),
  }
}

export function toolsIndexSeo(): PageSeo {
  const path = '/manipulatifler'
  return {
    title: withBrand('Sanal Manipülatifler – Online Matematik Araçları'),
    description: clip(`Ücretsiz sanal matematik manipülatifleri: ${toolMeta.slice(0, 9).map((t) => lower(toolKw(t).replace(/^Online /, ''))).join(', ')} ve daha fazlası. Akıllı tahtada ve tablette kullanın.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        url: abs(path),
        name: 'Sanal Manipülatifler',
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: toolMeta.map((t) => ({ '@type': 'LearningResource', name: t.name, url: abs(`/manipulatif/${t.id}`) })),
      },
      breadcrumb([{ name: 'Manipülatifler', path }]),
    ),
  }
}

export function toolSeo(t: ToolMeta): PageSeo {
  const path = `/manipulatif/${t.id}`
  const aliases = toolKeyword[t.id]?.aliases ?? []
  const description = clip(`${toolKw(t)}${aliases.length ? ` (${aliases.slice(0, 2).join(', ')})` : ''}: ${plain(t.description)} ${t.grades}. sınıf için ücretsiz; akıllı tahtada, tablette ve telefonda çalışır.`)
  const gs = t.grades.split(/[–-]/).map(Number).filter(isGrade)
  const span = gs.length === 2 ? grades.filter((g) => g >= gs[0] && g <= gs[1]) : gs
  return {
    title: withBrand(fitTitle(toolHeading(t), toolKw(t))),
    description,
    path,
    jsonLd: graph(
      learningResource({ path, name: t.name, description, type: 'Sanal manipülatif', grades: span.length ? span : [...grades] }),
      breadcrumb([
        { name: 'Manipülatifler', path: '/manipulatifler' },
        { name: t.name, path },
      ]),
    ),
  }
}

export const readyInteractions = () => interactionMeta.filter((m) => m.ready)

export function interactionsIndexSeo(): PageSeo {
  const path = '/etkilesimler'
  const list = readyInteractions()
  return {
    title: withBrand('Keşif Atölyesi – Etkileşimli Matematik Etkinlikleri'),
    description: clip(`Keşfet, inşa et, açıkla: ${list.slice(0, 8).map((m) => m.name).join(', ')} gibi etkileşimli matematik etkinlikleri. 1–8. sınıf, ücretsiz.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        url: abs(path),
        name: 'Keşif Atölyesi',
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: list.map((m) => ({ '@type': 'LearningResource', name: m.name, url: abs(`/etkilesim/${m.id}`) })),
      },
      breadcrumb([{ name: 'Keşif Atölyesi', path }]),
    ),
  }
}

export function interactionSeo(m: InteractionMeta): PageSeo {
  const path = `/etkilesim/${m.id}`
  const range = gradeRange(m.grades)
  const description = clip(`${interactionKw(m)}: ${plain(m.description)} ${range}. sınıf için ücretsiz, interaktif matematik etkinliği; akıllı tahtada ve tablette çalışır.`)
  return {
    title: withBrand(interactionTitle(m)),
    description,
    path,
    jsonLd: graph(
      learningResource({
        path,
        name: m.name,
        description,
        type: 'Etkileşimli etkinlik',
        grades: m.grades,
        teaches: Object.values(m.skills ?? {}).filter((x): x is string => !!x),
        outcomes: m.outcomes,
      }),
      breadcrumb([
        { name: 'Keşif Atölyesi', path: '/etkilesimler' },
        { name: m.name, path },
      ]),
    ),
  }
}

export const GUIDES_PATH = '/rehber'

export function guidesIndexSeo(): PageSeo {
  const path = GUIDES_PATH
  return {
    title: withBrand('Matematik Konu Anlatımı – Örnekli Rehberler'),
    description: clip(`Kısa ve örnekli matematik konu anlatımları: ${guides.slice(0, 6).map((g) => lower(g.seoTitle.split('?')[0])).join(', ')} ve daha fazlası. Her rehberde interaktif etkinlikler.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        url: abs(path),
        name: 'Matematik Konu Anlatımları',
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: guides.map((g) => ({ '@type': 'Article', headline: g.title, url: abs(`${GUIDES_PATH}/${g.slug}`) })),
      },
      breadcrumb([{ name: 'Konu Anlatımları', path }]),
    ),
  }
}

export function guideSeo(g: Guide): PageSeo {
  const path = `${GUIDES_PATH}/${g.slug}`
  return {
    title: withBrand(g.seoTitle),
    description: clip(g.description),
    path,
    jsonLd: graph(
      {
        '@type': 'Article',
        '@id': `${abs(path)}#article`,
        url: abs(path),
        mainEntityOfPage: abs(path),
        headline: g.title,
        description: g.description,
        inLanguage: 'tr-TR',
        isAccessibleForFree: true,
        dateModified: guidesUpdated,
        author: { '@id': TEACHER_ID },
        publisher: orgRef,
        image: OG_IMAGE,
        educationalLevel: g.grades.map((x) => gradeInfo[x].label),
        about: g.outcomes.map((c) => ({ '@type': 'Thing', name: outcomeKw(c) })),
      },
      { '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      teacher,
      breadcrumb([
        { name: 'Konu Anlatımları', path: GUIDES_PATH },
        { name: g.title, path },
      ]),
    ),
  }
}

// ---------------------------------------------------------------------------
// Test Çöz (/test, /test/7, /test/7/<tema>)
// ---------------------------------------------------------------------------

const faqLd = (faq: { q: string; a: string }[]) => ({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })

/** Test sayfalarının sık sorulan soruları; g verilirse o sınıfa özgü */
export function testFaq(g?: Grade) {
  if (!g) {
    return [
      { q: 'Matematik testleri cevaplı mı?', a: 'Evet. Her soruyu işaretlediğinde doğru ya da yanlış olduğunu hemen görürsün; yanlış cevapta kısa bir açıklama, ikinci yanlıştan sonra doğru cevap gösterilir. Test sonunda kaç soruyu ilk denemede çözdüğün yazılır.' },
      { q: 'Kaç soruluk test çözebilirim?', a: '10 ya da 20 soruluk test seçebilirsin. Sorular her açılışta konular arasından karışık seçilir; aynı testi tekrar çözdüğünde farklı sorularla karşılaşırsın.' },
      { q: 'Testler Maarif Modeli’ne uygun mu?', a: 'Sorular, Türkiye Yüzyılı Maarif Modeli matematik öğretim programının öğrenme çıktılarına göre hazırlanan etkinliklerden gelir; test konuları programdaki temalarla aynıdır.' },
      { q: 'Matematik testleri ücretsiz mi?', a: 'Evet. Bütün testler ücretsizdir, üyelik gerektirmez; telefon, tablet, bilgisayar ve akıllı tahtada çözülür. Öğretmenler test linkini öğrencilerine gönderebilir.' },
    ]
  }
  const label = gradeInfo[g].label
  const names = themesByGrade(g).map(themeKw)
  return [
    { q: `${label} matematik testinde hangi konular var?`, a: `${label} matematik testleri şu konuları kapsar: ${names.join(', ')}. Her konu için ayrı test çözebilir ya da bütün konulardan karışık test oluşturabilirsin.` },
    { q: `${label} matematik testleri cevaplı mı?`, a: 'Evet. Cevabını işaretlediğin anda doğru ya da yanlış olduğunu görürsün; yanlışta kısa bir açıklama gösterilir. Test sonunda puanın ve konuya dönüp çalışabileceğin etkinlikler listelenir.' },
    g === 8
      ? { q: '8. sınıf matematik testleri LGS’ye hazırlık için uygun mu?', a: '8. sınıf testleri LGS matematik konularını (üslü ve kareköklü ifadeler, doğrusal denklemler, eğim, üçgenler, Pisagor, dönüşüm geometrisi, olasılık, veri analizi) kapsar. Sorular konuyu kavramaya ve eksikleri görmeye yöneliktir; deneme sınavlarının yerine değil, onlara hazırlık için kullanılmalıdır.' }
      : { q: `${label} matematik testi kaç soru?`, a: '10 ya da 20 soruluk test seçebilirsin. Sorular her açılışta konular arasından dengeli ve karışık seçildiği için test her seferinde farklıdır.' },
  ]
}

const testResource = (path: string, name: string, description: string, grades: Grade[], teaches?: string[]) => ({
  ...learningResource({ path, name, description, type: 'Test', grades, teaches }),
  '@type': 'Quiz',
  eduQuestionType: 'Multiple choice',
})

export function testsIndexSeo(): PageSeo {
  const path = TEST_PATH
  const description = clip('Ücretsiz online matematik testleri: 1–8. sınıf her konu için cevaplı ve açıklamalı çoktan seçmeli sorular. Her açılışta karışık 10 ya da 20 soru; üyeliksiz, telefonda ve akıllı tahtada çözülür.')
  return {
    title: withBrand('Matematik Test Çöz: 1–8. Sınıf Online Testler'),
    description,
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        '@id': `${abs(path)}#page`,
        url: abs(path),
        name: 'Matematik Test Çöz',
        description,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: grades.map((g) => ({ '@type': 'Quiz', name: `${gradeInfo[g].label} Matematik Testi`, url: abs(testPath(g)) })),
      },
      faqLd(testFaq()),
      breadcrumb([{ name: 'Test Çöz', path }]),
    ),
  }
}

export function gradeTestSeo(g: Grade): PageSeo {
  const info = gradeInfo[g]
  const path = testPath(g)
  const description = clip(`Maarif Modeli’ne uygun ${lower(info.label)} matematik testleri: ${themesByGrade(g).map((t) => lower(themeKw(t))).join(', ')}. Konu konu ya da karışık, cevaplı; ücretsiz.`)
  return {
    // "7. sınıf matematik test çöz", "7. sınıf matematik testleri", "7. sınıf matematik testi"
    title: `${info.label} Matematik Testleri Çöz (${schoolYear()}, Cevaplı)`,
    description,
    path,
    jsonLd: graph(
      testResource(path, `${info.label} Matematik Testi`, description, [g], themesByGrade(g).map(themeKw)),
      faqLd(testFaq(g)),
      breadcrumb([
        { name: 'Test Çöz', path: TEST_PATH },
        { name: `${info.label} Matematik Testi`, path },
      ]),
    ),
  }
}

export const themeTestHeading = (t: Theme) => `${themeHeading(t)} Testi`

export function themeTestSeo(t: Theme): PageSeo {
  const info = gradeInfo[t.grade]
  const path = testPath(t.grade, t.slug)
  const description = clip(`${themeTestHeading(t)}: ${t.outcomes.map((o) => lower(outcomeKw(o.code))).join(', ')}. Cevaplı, açıklamalı online test; sorular her açılışta karışır. Ücretsiz.`)
  return {
    title: withBrand(fitTitle(`${themeTestHeading(t)} (Cevaplı)`, themeTestHeading(t), `${themeKw(t)} Testi (${t.grade}. Sınıf)`)),
    description,
    path,
    jsonLd: graph(
      testResource(path, themeTestHeading(t), description, [t.grade], t.outcomes.map((o) => outcomeKw(o.code))),
      breadcrumb([
        { name: 'Test Çöz', path: TEST_PATH },
        { name: `${info.label} Matematik Testi`, path: testPath(t.grade) },
        { name: themeKw(t), path },
      ]),
    ),
  }
}

// ---------------------------------------------------------------------------
// Çarpım tablosu (/carpim-tablosu): "çarpım tablosu", "çarpım tablosu 10'a kadar", "7'ler çarpım tablosu"
// ---------------------------------------------------------------------------

/** 1'ler, 2'ler … 6'lar … 10'lar */
export const timesFamily = (n: number) => `${n}’${[6, 9, 10].includes(n) ? 'lar' : 'ler'}`

export const timesFaq = [
  { q: 'Çarpım tablosu kaça kadar öğrenilir?', a: 'İlkokulda 10’a kadar çarpım tablosu (1 × 1’den 10 × 10’a kadar 100 çarpım) öğrenilir. Değişme özelliği sayesinde (3 × 8 = 8 × 3) bunların yalnızca 55’i birbirinden farklıdır.' },
  { q: 'Çarpım tablosu kaçıncı sınıfta öğretilir?', a: 'Çarpmanın anlamı, eşit gruplar ve 2’ler, 5’ler, 10’lar 2. sınıfta başlar; 10’a kadar çarpım tablosunun tamamı 3. sınıfta zihinden çarpma ve bölme ile pekiştirilir. 4. sınıf ve sonrasında çok basamaklı çarpmanın temelidir.' },
  { q: 'Çarpım tablosunda en zor çarpımlar hangileri?', a: '6 × 7 = 42, 6 × 8 = 48, 7 × 7 = 49, 7 × 8 = 56 ve 8 × 8 = 64 en sık karıştırılanlardır. 7 × 8 için 5 × 8 = 40’a 2 × 8 = 16 eklemek (56) gibi bilinen bir çarpımdan yola çıkmak işe yarar.' },
  { q: 'Çarpım tablosu nasıl kolay ezberlenir?', a: 'Önce 1’ler, 2’ler, 5’ler ve 10’lar; sonra ikiye katlama ile 4’ler ve 8’ler; en son bilinen bir çarpımdan ekleyerek ya da çıkararak 6’lar, 7’ler ve 9’lar. Her gün 5–10 dakikalık kısa alıştırma, uzun ezber saatlerinden daha etkilidir.' },
]

export function timesSeo(): PageSeo {
  const path = TIMES_PATH
  const description = 'Çarpım tablosu 1–10: tablonun tamamı, 2’lerden 10’lara her sayının çarpımları ve cevaplı çarpım tablosu alıştırması. Ezberleme yolları ve çarpma oyunları; ücretsiz.'
  return {
    title: withBrand('Çarpım Tablosu 1–10: Tablo, Alıştırma ve Oyun'),
    description,
    path,
    jsonLd: graph(
      learningResource({ path, name: 'Çarpım Tablosu', description, type: 'Etkileşimli tablo ve alıştırma', grades: [2, 3, 4], teaches: ['Çarpım tablosu', 'Zihinden çarpma'], outcomes: ['MAT.2.2.4', 'MAT.3.2.3', 'MAT.3.2.4'] }),
      faqLd(timesFaq),
      breadcrumb([{ name: 'Çarpım Tablosu', path }]),
    ),
  }
}

export function approachSeo(): PageSeo {
  const path = '/yaklasim'
  return {
    title: withBrand('Yaklaşımımız – Matematiği Anlayarak Öğrenmek'),
    description: 'Aslı Öğretmenimle’deki tüm oyun ve etkinlikler Van de Walle’ün gelişimsel yaklaşımına ve Maarif Modeli öğrenme çıktılarına göre hazırlandı. Veli ve öğretmenler için öneriler.',
    path,
    jsonLd: graph(
      { '@type': 'AboutPage', url: abs(path), name: 'Yaklaşımımız', inLanguage: 'tr-TR', isPartOf: { '@id': SITE_ID } },
      breadcrumb([{ name: 'Yaklaşımımız', path }]),
    ),
  }
}

export function onlineLessonSeo(): PageSeo {
  const path = ONLINE_LESSON_PATH
  return {
    title: 'Online Matematik Özel Ders – Hatay, Antakya, Samandağ | Aslı Öğretmen',
    description: 'Aslı Öğretmen ile internet üzerinden birebir ya da 3–4 kişilik grup online matematik özel dersi. Hatay’da Antakya ve Samandağ’daki 1–8. sınıf öğrencileri için, Maarif Modeli’ne uygun.',
    path,
    jsonLd: graph(
      ...siteGraph,
      {
        '@type': 'Service',
        '@id': `${abs(path)}#service`,
        url: abs(path),
        name: 'Online Birebir ve Grup Matematik Özel Ders',
        serviceType: 'Online matematik özel ders',
        description: String(getPageContent(lessonPage).intro || ''),
        provider: { '@id': TEACHER_ID },
        areaServed,
        availableChannel: { '@type': 'ServiceChannel', name: 'Online görüntülü ders', serviceUrl: abs(path) },
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: '1–8. sınıf öğrencileri' },
        inLanguage: 'tr-TR',
      },
      {
        '@type': 'FAQPage',
        mainEntity: (getPageContent(lessonPage).faq as { q: string; a: string }[]).filter((f) => f?.q && f?.a).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      breadcrumb([{ name: 'Online Özel Ders', path }]),
    ),
  }
}

export function boardSeo(): PageSeo {
  const path = BOARD_PATH
  const description = clip('Ücretsiz online matematik tuvali: örüntü blokları, tangram, onluk taban blokları, kesir şeritleri, cebir karoları, terazi, zar, saat, geometri araçları ve 80’den fazla sanal manipülatif tek ekranda. Tablette ve akıllı tahtada çalışır.')
  return {
    title: withBrand('Matematik Tuvali – Sanal Manipülatif Tahtası'),
    description,
    path,
    jsonLd: graph(
      learningResource({ path, name: 'Matematik Tuvali', description, type: 'Sanal manipülatif', grades: [...grades] }),
      breadcrumb([
        { name: 'Manipülatifler', path: '/manipulatifler' },
        { name: 'Matematik Tuvali', path },
      ]),
    ),
  }
}

export const privateSeo = (title: string, path: string): PageSeo => ({
  title: withBrand(title),
  description: homeSeo().description,
  path,
  noindex: true,
})

export const notFoundSeo = (path: string): PageSeo => privateSeo('Sayfa bulunamadı', path)

/** Bir yolun SEO bilgisi; bilinmeyen yollar için null */
/** Sayfanın SEO bilgisi; panelden yazılmış başlık/açıklama varsa onunla */
export const seoForPath = (pathname: string, findActivity: (id: string) => Activity | undefined): PageSeo | null => withSeoOverride(baseSeoForPath(pathname, findActivity))

export function baseSeoForPath(pathname: string, findActivity: (id: string) => Activity | undefined): PageSeo | null {
  const p = pathname.replace(/\/+$/, '') || '/'
  const seg = p.split('/').filter(Boolean).map(decodeURIComponent)
  if (p === '/') return homeSeo()
  const [a, b, c] = seg
  if (a === 'sinif' && isGrade(Number(b))) {
    const g = Number(b) as Grade
    if (seg.length === 2) return gradeSeo(g)
    const t = seg.length === 3 ? findTheme(g, c) : undefined
    return t ? themeSeo(t) : null
  }
  if (a === TEST_PATH.slice(1) && isGrade(Number(b))) {
    const g = Number(b) as Grade
    if (seg.length === 2) return gradeTestSeo(g)
    const t = seg.length === 3 ? findTheme(g, c) : undefined
    return t ? themeTestSeo(t) : null
  }
  if (seg.length === 1) {
    if (a === 'oyunlar') return gamesIndexSeo()
    if (a === 'manipulatifler') return toolsIndexSeo()
    if (a === 'etkilesimler') return interactionsIndexSeo()
    if (a === 'yaklasim') return approachSeo()
    if (a === GUIDES_PATH.slice(1)) return guidesIndexSeo()
    if (a === ONLINE_LESSON_PATH.slice(1)) return onlineLessonSeo()
    if (a === BOARD_PATH.slice(1)) return boardSeo()
    if (a === TEST_PATH.slice(1)) return testsIndexSeo()
    if (a === TIMES_PATH.slice(1)) return timesSeo()
    if (a === 'rapor') return privateSeo('Öğrenci raporu', p)
    return null
  }
  if (seg.length !== 2) return null
  if (a === 'etkinlik') {
    const act = findActivity(b)
    const g = Number(/^g(\d)-/.exec(b)?.[1])
    return act && isGrade(g) ? activitySeo(act, g) : null
  }
  if (a === 'oyun') {
    const m = gameMetaById[b as GameId]
    return m ? gameSeo(m) : null
  }
  if (a === 'manipulatif') {
    const t = toolMetaById[b as ManipulativeTool]
    return t ? toolSeo(t) : null
  }
  if (a === GUIDES_PATH.slice(1)) {
    const gd = guideBySlug[b]
    return gd ? guideSeo(gd) : null
  }
  if (a === 'etkilesim') {
    const m = interactionById[b]
    return m?.ready ? interactionSeo(m) : null
  }
  return null
}
