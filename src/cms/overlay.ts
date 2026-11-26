/**
 * Panelde yapılan değişiklikleri koddaki içeriğe uygular.
 *
 * Oyun, etkileşim, manipülatif, rehber ve bağlantı listeleri modül düzeyinde dışa aktarılan dizilerdir
 * (gameMeta, interactionById …) ve sitenin her yerinde doğrudan kullanılır. Bu yüzden overlay bu dizileri
 * YERİNDE günceller: ilk çağrıda koddaki hâllerinin bir kopyası saklanır, her uygulamada o kopyadan
 * yeniden kurulur. Böylece aynı kayıtlar iki kez uygulanmaz ve bir değişiklik geri alınınca öğe eski hâline döner.
 *
 * Tarayıcıda (runtime.ts) ve derlemede (scripts/prerender.ts) aynı kod çalışır.
 */
import { gameMeta, gameMetaById, type GameId, type GameMeta } from '../games/meta'
import { interactionById, interactionMeta } from '../interactions/meta'
import type { InteractionCategory, InteractionMeta } from '../interactions/types'
import { toolMeta, toolMetaById, type ToolMeta } from '../manipulatives/meta'
import { guideBySlug, guides, type Guide } from '../data/guides'
import { externalLinks } from '../data/links'
import type { Activity, ExternalLink, Grade, ManipulativeTool } from '../data/types'
import { seoOverrides } from './seoOverrides'
import type { CmsEntry, CmsKind, CustomMark } from './types'

interface Base {
  games: GameMeta[]
  interactions: InteractionMeta[]
  tools: ToolMeta[]
  guides: Guide[]
  links: ExternalLink[]
}

let pristine: Base | null = null
const base = (): Base =>
  (pristine ??= {
    games: gameMeta.slice(),
    interactions: interactionMeta.slice(),
    tools: toolMeta.slice(),
    guides: guides.slice(),
    links: externalLinks.slice(),
  })

/** Koddaki (değiştirilmemiş) listeler: panel karşılaştırma ve "orijinale dön" için kullanır */
export const builtin = {
  games: () => base().games,
  interactions: () => base().interactions,
  tools: () => base().tools,
  guides: () => base().guides,
  links: () => base().links,
}

/** Yerleşik dış bağlantıların kimliği (kodda id alanı yok) */
export const builtinLinkRef = (i: number) => `link-${i + 1}`

type AnyRec = Record<string, unknown>

/** Yama: null olan alanlar silinir */
export function mergePatch<T>(orig: T, patch: AnyRec | undefined): T {
  if (!patch) return orig
  const out = { ...(orig as AnyRec), ...patch }
  for (const [k, v] of Object.entries(patch)) if (v === null) delete out[k]
  return out as T
}

const asGrades = (v: unknown): Grade[] => {
  const arr = Array.isArray(v) ? v : []
  const g = [...new Set(arr.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 8))].sort((a, b) => a - b) as Grade[]
  return g.length ? g : [1]
}
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [])

/** "3–5" biçimi (manipülatiflerde sınıf aralığı metin olarak tutulur) */
export const gradesToRange = (g: Grade[]) => (g.length ? (g[0] === g[g.length - 1] ? `${g[0]}` : `${g[0]}–${g[g.length - 1]}`) : '1–8')

const CATS: InteractionCategory[] = ['sayilar', 'kesirler', 'geometri', 'cebir-veri', 'muhakeme']
const cat = (v: unknown): InteractionCategory => (CATS.includes(v as InteractionCategory) ? (v as InteractionCategory) : 'muhakeme')

export function customGame(e: CmsEntry): GameMeta & CustomMark {
  const d = e.data
  return {
    ...d,
    id: e.ref as GameId,
    name: str(d.name, e.ref),
    description: str(d.description),
    emoji: str(d.emoji, '🎲'),
    color: str(d.color, '#d6457a'),
    grades: asGrades(d.grades),
    skills: (d.skills && typeof d.skills === 'object' ? d.skills : {}) as GameMeta['skills'],
    howTo: strArr(d.howTo),
    nextGen: true,
    ready: true,
    outcomes: strArr(d.outcomes),
    custom: true,
    cmsId: e.id,
  }
}

export function customInteraction(e: CmsEntry): InteractionMeta & CustomMark {
  const d = e.data
  return {
    ...d,
    id: e.ref,
    no: typeof d.no === 'number' ? d.no : 0,
    name: str(d.name, e.ref),
    description: str(d.description),
    emoji: str(d.emoji, '✨'),
    color: str(d.color, '#7c3aed'),
    category: cat(d.category),
    grades: asGrades(d.grades),
    ready: true,
    outcomes: strArr(d.outcomes),
    custom: true,
    cmsId: e.id,
  }
}

export function customTool(e: CmsEntry): ToolMeta & CustomMark {
  const d = e.data
  return {
    ...d,
    id: e.ref as ManipulativeTool,
    name: str(d.name, e.ref),
    description: str(d.description),
    emoji: str(d.emoji, '🧩'),
    grades: typeof d.grades === 'string' ? d.grades : gradesToRange(asGrades(d.grades)),
    category: cat(d.category),
    custom: true,
    cmsId: e.id,
  }
}

function customGuide(e: CmsEntry): Guide {
  const d = e.data
  return {
    ...d,
    slug: e.ref,
    title: str(d.title, e.ref),
    seoTitle: str(d.seoTitle, str(d.title, e.ref)),
    description: str(d.description),
    grades: asGrades(d.grades),
    outcomes: strArr(d.outcomes),
    intro: str(d.intro),
    sections: Array.isArray(d.sections) ? d.sections : [],
    faq: Array.isArray(d.faq) ? d.faq : [],
  } as Guide
}

/** Diziyi ve kimlik haritasını yerinde yeniden kurar */
function rebuild<T>(
  arr: T[],
  byId: Record<string, T> | null,
  keyOf: (x: T) => string,
  orig: T[],
  entries: CmsEntry[],
  kind: CmsKind,
  makeCustom: (e: CmsEntry) => T | null,
  customFirst = false,
) {
  const mine = entries.filter((e) => e.kind === kind)
  const patches = new Map(mine.filter((e) => e.origin === 'builtin').map((e) => [e.ref, e]))
  const out: T[] = []
  for (const item of orig) {
    const e = patches.get(keyOf(item))
    if (e?.hidden) continue
    out.push(e ? mergePatch(item, e.data) : item)
  }
  const custom: T[] = []
  for (const e of mine) {
    if (e.origin !== 'custom' || e.hidden) continue
    const c = makeCustom(e)
    if (c && !out.some((x) => keyOf(x) === keyOf(c)) && !custom.some((x) => keyOf(x) === keyOf(c))) custom.push(c)
  }
  // En yeni eklenen en üstte
  custom.reverse()
  arr.splice(0, arr.length, ...(customFirst ? [...custom, ...out] : [...out, ...custom]))
  if (byId) {
    for (const k of Object.keys(byId)) delete byId[k]
    for (const x of arr) byId[keyOf(x)] = x
  }
}

let current: CmsEntry[] = []
export const currentEntries = () => current

/**
 * Kayıtları uygular. `activities` verilirse (derleme) sınıf dizileri de yerinde güncellenir;
 * tarayıcıda etkinlikler sınıf yüklendikçe overlayActivities ile uygulanır.
 */
export function applyOverlay(entries: CmsEntry[], activities?: Record<Grade, Activity[]>) {
  const b = base()
  current = entries
  rebuild(gameMeta, gameMetaById as Record<string, GameMeta>, (m) => m.id, b.games, entries, 'game', customGame, true)
  rebuild(interactionMeta, interactionById, (m) => m.id, b.interactions, entries, 'interaction', customInteraction, true)
  rebuild(toolMeta, toolMetaById as Record<string, ToolMeta>, (m) => m.id, b.tools, entries, 'manipulative', customTool)
  rebuild(guides, guideBySlug, (g) => g.slug, b.guides, entries, 'guide', customGuide)

  // Bağlantılar: yerleşiklerin kimliği sıra numarası
  const linkPatches = new Map(entries.filter((e) => e.kind === 'link' && e.origin === 'builtin').map((e) => [e.ref, e]))
  const links: ExternalLink[] = []
  b.links.forEach((l, i) => {
    const e = linkPatches.get(builtinLinkRef(i))
    if (!e?.hidden) links.push(e ? mergePatch(l, e.data) : l)
  })
  for (const e of entries) if (e.kind === 'link' && e.origin === 'custom' && !e.hidden && e.data.url) links.push(e.data as ExternalLink)
  externalLinks.splice(0, externalLinks.length, ...links)

  seoOverrides.clear()
  for (const e of entries) if (e.kind === 'seo' && !e.hidden) seoOverrides.set(e.ref, e.data)

  if (activities) for (const g of Object.keys(activities)) {
    const grade = Number(g) as Grade
    const next = overlayActivities(grade, rawActivities(activities, grade), entries)
    activities[grade].splice(0, activities[grade].length, ...next)
  }
}

// Derlemede sınıf dizileri yerinde değiştiği için ilk hâllerini sakla
const rawByGrade = new Map<Grade, Activity[]>()
function rawActivities(all: Record<Grade, Activity[]>, g: Grade) {
  if (!rawByGrade.has(g)) rawByGrade.set(g, all[g].slice())
  return rawByGrade.get(g)!
}

export const gradeOfActivityId = (id: string): Grade | null => {
  const g = Number(/^g(\d)-/.exec(id)?.[1])
  return g >= 1 && g <= 8 ? (g as Grade) : null
}

/** Bir sınıfın etkinlik listesine kayıtları uygular (yeni dizi döndürür) */
export function overlayActivities(g: Grade, list: Activity[], entries: CmsEntry[] = current): Activity[] {
  const mine = entries.filter((e) => e.kind === 'activity' && (e.grade ?? gradeOfActivityId(e.ref)) === g)
  if (!mine.length) return list
  const patches = new Map(mine.filter((e) => e.origin === 'builtin').map((e) => [e.ref, e]))
  const out: Activity[] = []
  for (const a of list) {
    const e = patches.get(a.id)
    if (e?.hidden) continue
    // Etkinlik düzenleyicisi tüm nesneyi kaydeder: yama değil, tam değiştirme
    out.push(e ? ({ ...(e.data as Activity), id: a.id } as Activity) : a)
  }
  for (const e of mine) {
    if (e.origin !== 'custom' || e.hidden) continue
    const a = { ...(e.data as Activity), id: e.ref } as Activity & CustomMark
    a.custom = true
    a.cmsId = e.id
    if (!a.outcomes?.length || out.some((x) => x.id === a.id)) continue
    // Aynı öğrenme çıktısının son etkinliğinden sonra: öğrenme yolunda doğru yerde görünsün
    let at = -1
    out.forEach((x, i) => x.outcomes.includes(a.outcomes[0]) && (at = i))
    if (at < 0) out.push(a)
    else out.splice(at + 1, 0, a)
  }
  return out
}
