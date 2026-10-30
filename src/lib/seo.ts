/**
 * Arama motoru bilgileri (başlık, açıklama, canonical, yapılandırılmış veri).
 * Tarayıcıda usePageTitle (components/Layout.tsx), derlemede scripts/prerender.ts aynı fonksiyonları kullanır.
 */
import type { Activity, ActivityType, Grade, Stage, Theme } from '../data/types'
import { findTheme, gradeInfo, grades, isGrade, outcomeByCode, themesByGrade } from '../data/curriculum'
import { topicsByGrade } from '../data/topics'
import { gameMeta, gameMetaById, type GameId, type GameMeta } from '../games/meta'
import { toolMeta, toolMetaById, type ToolMeta } from '../manipulatives/meta'
import { interactionById, interactionMeta } from '../interactions/meta'
import type { InteractionMeta } from '../interactions/types'
import type { ManipulativeTool } from '../data/types'
import { lessonFaq, lessonIntro } from '../data/onlineLesson'

export const SITE_URL = 'https://www.asliogretmenimle.com'
export const SITE_NAME = 'Aslı Öğretmenimle'
export const SITE_ALT_NAMES = ['Aslı Öğretmen', 'Aslı Öğretmenle', 'Aslı Öğretmenim', 'Aslı Hoca']
export const OG_IMAGE = `${SITE_URL}/og-image.png`
export const ONLINE_LESSON_PATH = '/online-ozel-ders'

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

const withBrand = (t: string) => `${t} | ${SITE_NAME}`
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
// Sayfalar
// ---------------------------------------------------------------------------

export function homeSeo(): PageSeo {
  return {
    title: `${SITE_NAME} | Aslı Öğretmen ile Matematik Oyunları ve Etkinlikleri`,
    description: 'Aslı Öğretmen’in 1–8. sınıf matematik oyunları, eşleştirme, boşluk doldurma ve sürükle-bırak etkinlikleri, sanal manipülatifler. Hatay’da online birebir özel ders.',
    path: '/',
    jsonLd: graph(...siteGraph),
  }
}

export function gradeSeo(g: Grade): PageSeo {
  const info = gradeInfo[g]
  const themes = themesByGrade(g)
  const path = `/sinif/${g}`
  return {
    title: withBrand(`${info.label} Matematik Etkinlikleri ve Oyunları`),
    description: clip(`${info.label} matematik konuları için ücretsiz etkinlik ve oyunlar: ${(topicsByGrade[g] ?? themes).map((t) => t.title).join(', ')}. Maarif Modeli’ne uygun, Aslı Öğretmen’den.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        '@id': `${abs(path)}#page`,
        url: abs(path),
        name: `${info.label} Matematik Etkinlikleri`,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        hasPart: themes.map((t) => ({ '@type': 'WebPage', name: t.title, url: abs(`/sinif/${g}/${t.slug}`) })),
      },
      breadcrumb([{ name: info.label, path }]),
    ),
  }
}

export function themeSeo(t: Theme): PageSeo {
  const info = gradeInfo[t.grade]
  const path = `/sinif/${t.grade}/${t.slug}`
  return {
    title: withBrand(`${t.title} – ${info.label} Matematik`),
    description: clip(`${info.label} matematik, ${t.title}: ${t.topics.join(', ')}. ${t.outcomes.map((o) => o.short).join(', ')} için etkinlik ve oyunlar.`),
    path,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        '@id': `${abs(path)}#page`,
        url: abs(path),
        name: `${t.title} (${info.label})`,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': SITE_ID },
        about: t.topics.map((name) => ({ '@type': 'Thing', name })),
      },
      breadcrumb([
        { name: info.label, path: `/sinif/${t.grade}` },
        { name: t.title, path },
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
  const description = clip(`${info.label} matematik ${typeLabel[a.type].toLowerCase()} etkinliği: ${title}. ${plain(a.instructions)}${oc ? ` Konu: ${oc.short}.` : ''}`)
  return {
    title: withBrand(`${title} – ${info.label} ${typeLabel[a.type]} Etkinliği`),
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
        ...(theme ? [{ name: theme.title, path: `/sinif/${g}/${theme.slug}` }] : []),
        { name: title, path },
      ]),
    ),
  }
}

export function gamesIndexSeo(): PageSeo {
  const path = '/oyunlar'
  return {
    title: withBrand('Matematik Oyunları (1–8. Sınıf)'),
    description: clip(`Ücretsiz, eğitici matematik oyunları: ${gameMeta.slice(0, 8).map((m) => m.name).join(', ')} ve daha fazlası. Her oyun seçilen sınıfa göre zorlaşır.`),
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
  const description = clip(`${m.name}: ${plain(m.description)} ${range}. sınıflar için ücretsiz matematik oyunu; telefon, tablet ve bilgisayarda oynanır.`)
  return {
    title: withBrand(`${m.name} – ${range}. Sınıf Matematik Oyunu`),
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
    title: withBrand('Sanal Manipülatifler – Dijital Matematik Materyalleri'),
    description: clip(`Ücretsiz sanal matematik manipülatifleri: ${toolMeta.slice(0, 8).map((t) => t.name).join(', ')} ve daha fazlası. Derste akıllı tahtada, evde tablette kullanın.`),
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
  const description = clip(`${t.name} (sanal manipülatif): ${plain(t.description)} ${t.grades}. sınıf matematik için ücretsiz, etkileşimli dijital materyal.`)
  const gs = t.grades.split(/[–-]/).map(Number).filter(isGrade)
  const span = gs.length === 2 ? grades.filter((g) => g >= gs[0] && g <= gs[1]) : gs
  return {
    title: withBrand(`${t.name} – Sanal Manipülatif (${t.grades}. Sınıf)`),
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
  const description = clip(`${m.name}: ${plain(m.description)} ${range}. sınıf için ücretsiz, etkileşimli matematik etkinliği.`)
  return {
    title: withBrand(`${m.name} – ${range}. Sınıf Etkileşimli Matematik`),
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
    description: 'Aslı Öğretmen ile internet üzerinden birebir online matematik özel dersi. Hatay’da Antakya ve Samandağ’daki 1–8. sınıf öğrencileri için, Maarif Modeli’ne uygun.',
    path,
    jsonLd: graph(
      ...siteGraph,
      {
        '@type': 'Service',
        '@id': `${abs(path)}#service`,
        url: abs(path),
        name: 'Online Birebir Matematik Özel Ders',
        serviceType: 'Online matematik özel ders',
        description: lessonIntro,
        provider: { '@id': TEACHER_ID },
        areaServed,
        availableChannel: { '@type': 'ServiceChannel', name: 'Online görüntülü ders', serviceUrl: abs(path) },
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: '1–8. sınıf öğrencileri' },
        inLanguage: 'tr-TR',
      },
      {
        '@type': 'FAQPage',
        mainEntity: lessonFaq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      breadcrumb([{ name: 'Online Özel Ders', path }]),
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
export function seoForPath(pathname: string, findActivity: (id: string) => Activity | undefined): PageSeo | null {
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
  if (seg.length === 1) {
    if (a === 'oyunlar') return gamesIndexSeo()
    if (a === 'manipulatifler') return toolsIndexSeo()
    if (a === 'etkilesimler') return interactionsIndexSeo()
    if (a === 'yaklasim') return approachSeo()
    if (a === ONLINE_LESSON_PATH.slice(1)) return onlineLessonSeo()
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
  if (a === 'etkilesim') {
    const m = interactionById[b]
    return m?.ready ? interactionSeo(m) : null
  }
  return null
}
