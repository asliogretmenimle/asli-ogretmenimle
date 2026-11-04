import { useMemo } from 'react'
import { gradeInfo, grades, outcomeByCode, themes } from '../data/curriculum'
import { activityGrade, activityTheme, useAllActivities } from '../data/activityStore'
import { guides } from '../data/guides'
import { gameMeta } from '../games/meta'
import { interactionMeta } from '../interactions/meta'
import { toolMeta } from '../manipulatives/meta'
import { typeMeta } from '../components/meta'
import { GUIDES_PATH } from './seo'
import { searchKey } from './format'

export interface SearchHit {
  key: string
  to: string
  title: string
  sub: string
  emoji?: string
  /** Emoji yoksa kartta gösterilen kısa işaret (ör. sınıf numarası) */
  badge?: string
}

export interface SearchGroup {
  label: string
  hits: SearchHit[]
  /** Gösterilenden fazla sonuç varsa toplam */
  total: number
}

const range = (g: number[]) => (g.length === 1 ? `${g[0]}` : `${g[0]}–${g[g.length - 1]}`)

/** Sitedeki her şeyde arar; etkinlik verisi yalnızca bir arama yapılınca indirilir */
export function useSiteSearch(q: string, limit = 6): { groups: SearchGroup[]; loading: boolean } {
  const key = searchKey(q).trim()
  const all = useAllActivities(key.length > 0)
  return useMemo(() => {
    if (!key) return { groups: [], loading: false }
    const words = key.split(' ').filter(Boolean)
    const match = (text: string) => {
      const hay = searchKey(text)
      return words.every((w) => hay.includes(w))
    }
    const group = (label: string, hits: SearchHit[], max = limit): SearchGroup => ({ label, hits: hits.slice(0, max), total: hits.length })

    const gradeHits = grades
      .filter((g) => match(`${g} ${g}. sınıf ${gradeInfo[g].label} ${gradeInfo[g].level}`))
      .map((g) => ({ key: `g${g}`, to: `/sinif/${g}`, title: `${gradeInfo[g].label} Matematik`, sub: 'Tüm konular ve etkinlikler', badge: String(g) }))
    const themeHits = themes
      .filter((t) => match(`${t.title} ${t.topics.join(' ')} ${t.grade}. sınıf`))
      .map((t) => {
        // Tema adları sınıflar arasında tekrar eder ("Sayılar ve Nicelikler (2)"): başlıkta aranan alt konuyu göster
        const hit = t.topics.filter((tp) => words.some((w) => searchKey(tp).includes(w)))
        return { key: `t${t.grade}-${t.slug}`, to: `/sinif/${t.grade}/${t.slug}`, title: hit.length ? hit.join(', ') : t.title, sub: `${t.grade}. Sınıf · ${t.title}`, badge: String(t.grade) }
      })
    const toolHits = toolMeta
      .filter((t) => match(`${t.name} ${t.description} manipülatif materyal`))
      .map((t) => ({ key: t.id, to: `/manipulatif/${t.id}`, title: t.name, sub: `Manipülatif · ${t.grades}. sınıf`, emoji: t.emoji }))
    const gameHits = gameMeta
      .filter((m) => match(`${m.name} ${m.description} ${Object.values(m.skills).join(' ')} oyun`))
      .map((m) => ({ key: m.id, to: `/oyun/${m.id}`, title: m.name, sub: `Oyun · ${range(m.grades)}. sınıf`, emoji: m.emoji }))
    const interHits = interactionMeta
      .filter((m) => m.ready && match(`${m.name} ${m.description} ${Object.values(m.skills ?? {}).join(' ')} etkileşim keşif`))
      .map((m) => ({ key: m.id, to: `/etkilesim/${m.id}`, title: m.name, sub: `Etkileşim · ${range(m.grades)}. sınıf`, emoji: m.emoji }))
    const guideHits = guides
      .filter((g) => match(`${g.title} ${g.intro} konu anlatımı`))
      .map((g) => ({ key: g.slug, to: `${GUIDES_PATH}/${g.slug}`, title: g.title, sub: `Konu anlatımı · ${range(g.grades)}. sınıf`, emoji: '📖' }))
    const actHits = (all ?? [])
      .filter((a) => {
        const ocs = a.outcomes.map((c) => outcomeByCode.get(c))
        return match([a.title, a.instructions, activityTheme(a)?.title, ...ocs.map((o) => `${o?.short ?? ''} ${o?.title ?? ''}`), ...a.outcomes, typeMeta[a.type].label].join(' '))
      })
      .map((a) => ({ key: a.id, to: `/etkinlik/${a.id}`, title: a.title, sub: `${activityGrade(a)}. Sınıf · ${outcomeByCode.get(a.outcomes[0])?.short ?? ''}`, badge: String(activityGrade(a)) }))

    const groups = [
      group('Sınıflar', gradeHits),
      group('Konular', themeHits),
      group('Manipülatifler', toolHits),
      group('Oyunlar', gameHits),
      group('Etkileşimler', interHits),
      group('Konu anlatımları', guideHits),
      group('Etkinlikler', actHits, limit * 2),
    ].filter((g) => g.total > 0)
    return { groups, loading: !all }
  }, [key, all, limit])
}
