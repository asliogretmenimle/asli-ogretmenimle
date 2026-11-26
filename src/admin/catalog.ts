/**
 * Panelin içerik modeli: koddaki öğeler + panel kayıtları tek listede.
 * Her öğenin durumu: orijinal / düzenlendi / gizli / yeni (panelden) / taslak.
 */
import { builtin, builtinLinkRef, customGame, customInteraction, customTool, gradeOfActivityId, mergePatch } from '../cms/overlay'
import type { CmsEntry, CmsKind } from '../cms/types'
import type { GameMeta } from '../games/meta'
import type { InteractionMeta } from '../interactions/types'
import type { ToolMeta } from '../manipulatives/meta'
import { toolGrades } from '../manipulatives/meta'
import type { Guide } from '../data/guides'
import type { Activity, ExternalLink, Grade } from '../data/types'
import { outcomeByCode } from '../data/curriculum'
import type { Tone } from './ui'

export type ItemState = 'original' | 'edited' | 'hidden' | 'custom' | 'draft'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AdminItem<T = any> {
  kind: CmsKind
  ref: string
  title: string
  desc: string
  emoji: string
  grades: Grade[]
  state: ItemState
  entry?: CmsEntry
  /** Koddaki hâli (yeni öğelerde yok) */
  original?: T
  /** Panel değişiklikleri uygulanmış hâli */
  value: T
  /** Sitedeki adresi */
  href: string
  /** Ek bilgi (tür, kategori …) */
  meta?: string
}

export const stateInfo: Record<ItemState, { label: string; tone: Tone }> = {
  original: { label: 'Orijinal', tone: 'gray' },
  edited: { label: 'Düzenlendi', tone: 'blue' },
  hidden: { label: 'Gizli', tone: 'red' },
  custom: { label: 'Yeni', tone: 'violet' },
  draft: { label: 'Taslak', tone: 'amber' },
}

export const kindInfo: Record<CmsKind, { label: string; plural: string; prefix: string; emoji: string }> = {
  game: { label: 'Oyun', plural: 'Oyunlar', prefix: '/oyun/', emoji: '🎮' },
  interaction: { label: 'Etkileşim', plural: 'Etkileşimler', prefix: '/etkilesim/', emoji: '✨' },
  manipulative: { label: 'Manipülatif', plural: 'Manipülatifler', prefix: '/manipulatif/', emoji: '🧩' },
  activity: { label: 'Etkinlik', plural: 'Etkinlikler', prefix: '/etkinlik/', emoji: '📝' },
  guide: { label: 'Konu anlatımı', plural: 'Konu anlatımları', prefix: '/rehber/', emoji: '📖' },
  link: { label: 'Bağlantı', plural: 'Bağlantılar', prefix: '', emoji: '🔗' },
  seo: { label: 'Sayfa başlığı', plural: 'Sayfa başlıkları', prefix: '', emoji: '🔎' },
  page: { label: 'Sayfa', plural: 'Sayfalar', prefix: '', emoji: '📄' },
}

function stateOf(e: CmsEntry | undefined, custom: boolean): ItemState {
  if (!e) return 'original'
  if (e.hidden) return 'hidden'
  if (e.status === 'draft') return 'draft'
  return custom ? 'custom' : 'edited'
}

function build<T>(
  kind: CmsKind,
  originals: T[],
  entries: CmsEntry[],
  keyOf: (x: T) => string,
  makeCustom: (e: CmsEntry) => T,
  view: (x: T) => Omit<AdminItem<T>, 'kind' | 'ref' | 'state' | 'entry' | 'original' | 'value'>,
): AdminItem<T>[] {
  const mine = entries.filter((e) => e.kind === kind)
  const byRef = new Map(mine.map((e) => [e.ref, e]))
  const out: AdminItem<T>[] = []
  for (const e of mine) {
    if (e.origin !== 'custom') continue
    const value = makeCustom(e)
    out.push({ kind, ref: e.ref, state: stateOf(e, true), entry: e, value, ...view(value) })
  }
  for (const o of originals) {
    const ref = keyOf(o)
    const e = byRef.get(ref)
    const value = e && e.origin === 'builtin' ? mergePatch(o, e.data) : o
    out.push({ kind, ref, state: e?.origin === 'builtin' ? stateOf(e, false) : 'original', entry: e?.origin === 'builtin' ? e : undefined, original: o, value, ...view(value) })
  }
  return out
}

export const gameItems = (entries: CmsEntry[]) =>
  build<GameMeta>('game', builtin.games(), entries, (m) => m.id, customGame, (m) => ({
    title: m.name,
    desc: m.description,
    emoji: m.emoji,
    grades: m.grades,
    href: `/oyun/${m.id}`,
    meta: m.nextGen ? 'Yeni nesil oyun' : 'Klasik oyun',
  }))

export const interactionItems = (entries: CmsEntry[]) =>
  build<InteractionMeta>('interaction', builtin.interactions(), entries, (m) => m.id, customInteraction, (m) => ({
    title: m.name,
    desc: m.description,
    emoji: m.emoji,
    grades: m.grades,
    href: `/etkilesim/${m.id}`,
    meta: m.ready ? undefined : 'Yakında',
  }))

export const toolItems = (entries: CmsEntry[]) =>
  build<ToolMeta>('manipulative', builtin.tools(), entries, (m) => m.id, customTool, (m) => ({
    title: m.name,
    desc: m.description,
    emoji: m.emoji,
    grades: toolGrades(m),
    href: `/manipulatif/${m.id}`,
  }))

const asGuide = (e: CmsEntry) => ({ ...(e.data as Guide), slug: e.ref }) as Guide
export const guideItems = (entries: CmsEntry[]) =>
  build<Guide>('guide', builtin.guides(), entries, (g) => g.slug, asGuide, (g) => ({
    title: g.title,
    desc: g.description,
    emoji: '📖',
    grades: g.grades ?? [],
    href: `/rehber/${g.slug}`,
  }))

export interface LinkRow extends ExternalLink {
  ref: string
}
export const linkItems = (entries: CmsEntry[]) =>
  build<LinkRow>(
    'link',
    builtin.links().map((l, i) => ({ ...l, ref: builtinLinkRef(i) })),
    entries,
    (l) => l.ref,
    (e) => ({ ...(e.data as ExternalLink), ref: e.ref }),
    (l) => ({ title: l.title, desc: l.url, emoji: '🔗', grades: [], href: l.url, meta: l.target }),
  )

export const activityTypeLabel: Record<Activity['type'], string> = {
  quiz: 'Test',
  fill: 'Boşluk doldurma',
  match: 'Eşleştirme',
  sort: 'Sıralama',
  categorize: 'Gruplama',
  manipulative: 'Manipülatif görevi',
}

/** Bir sınıfın etkinlikleri (rawList: koddaki hâli) */
export function activityItems(g: Grade, rawList: Activity[], entries: CmsEntry[]) {
  const mine = entries.filter((e) => e.kind === 'activity' && (e.grade ?? gradeOfActivityId(e.ref)) === g)
  return build<Activity>(
    'activity',
    rawList,
    mine,
    (a) => a.id,
    (e) => ({ ...(e.data as Activity), id: e.ref }),
    (a) => ({
      title: a.title,
      desc: a.instructions,
      emoji: a.type === 'quiz' ? '✅' : a.type === 'manipulative' ? '🧩' : a.type === 'match' ? '🔗' : a.type === 'sort' ? '↕️' : a.type === 'categorize' ? '🗂️' : '✏️',
      grades: [g],
      href: `/etkinlik/${a.id}`,
      meta: activityTypeLabel[a.type],
    }),
  ).map((it) => {
    // Etkinlik düzenlemesi yama değil tam değiştirmedir
    if (it.entry && it.entry.origin === 'builtin') it.value = { ...(it.entry.data as Activity), id: it.ref }
    return it
  })
}

export const themeOfActivity = (a: Activity) => outcomeByCode.get(a.outcomes?.[0] ?? '')?.theme

/** Yeni öğe kısa adı: hem koddaki hem paneldeki öğelerle çakışmasın */
export function refTaken(kind: CmsKind, ref: string, entries: CmsEntry[], exceptId?: string) {
  if (entries.some((e) => e.kind === kind && e.ref === ref && e.id !== exceptId)) return true
  const lists: Partial<Record<CmsKind, string[]>> = {
    game: builtin.games().map((m) => m.id),
    interaction: builtin.interactions().map((m) => m.id),
    manipulative: builtin.tools().map((m) => m.id),
    guide: builtin.guides().map((g) => g.slug),
  }
  return (lists[kind] ?? []).includes(ref)
}

/** Yama: yalnızca orijinalden farklı alanlar (silinen alanlar null) */
export function diffPatch(orig: Record<string, unknown>, next: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(orig), ...Object.keys(next)])
  for (const k of keys) {
    const a = orig[k]
    const b = next[k]
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    patch[k] = b === undefined || b === '' ? (a === undefined ? undefined : null) : b
  }
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k]
  return patch
}
