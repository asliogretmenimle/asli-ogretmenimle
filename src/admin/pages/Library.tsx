import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCode2, Plus, Sparkles } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import type { CmsKind } from '../../cms/types'
import type { Grade } from '../../data/types'
import { useEntries } from '../api'
import { gameItems, guideItems, interactionItems, kindInfo, toolItems, type AdminItem } from '../catalog'
import { ItemList } from '../components/ItemList'
import { PageHead, Segmented } from '../ui'

export function itemsOf(kind: CmsKind, entries: Parameters<typeof gameItems>[0]): AdminItem[] {
  switch (kind) {
    case 'game':
      return gameItems(entries) as unknown as AdminItem[]
    case 'interaction':
      return interactionItems(entries) as unknown as AdminItem[]
    case 'manipulative':
      return toolItems(entries) as unknown as AdminItem[]
    case 'guide':
      return guideItems(entries) as unknown as AdminItem[]
    default:
      return []
  }
}

const DESC: Partial<Record<CmsKind, string>> = {
  game: 'Sitedeki tüm oyunlar. Adını, açıklamasını, sınıflarını ve tanıtım metinlerini düzenleyin; gizleyin ya da Stüdyo ile yeni oyun üretin.',
  interaction: 'Keşif Atölyesi etkileşimleri. Tanıtım metinlerini düzenleyin, sınıflarını değiştirin ya da yenisini üretin.',
  manipulative: 'Sanal manipülatifler. Ad, açıklama ve sınıf aralığını düzenleyin ya da Stüdyo ile yeni bir dijital materyal üretin.',
  guide: 'Konu anlatımı sayfaları (/rehber). Metinleri, soru-cevapları ve bağlantıları düzenleyin ya da yeni bir rehber yazın.',
}

export function Library({ kind }: { kind: CmsKind }) {
  const { entries, loaded } = useEntries()
  const [grade, setGrade] = useState<'all' | `${Grade}`>('all')
  const all = itemsOf(kind, entries)
  const items = grade === 'all' ? all : all.filter((it) => it.grades.includes(Number(grade) as Grade))
  const info = kindInfo[kind]
  const studio = kind === 'game' || kind === 'interaction' || kind === 'manipulative'

  return (
    <div>
      <PageHead
        title={info.plural}
        desc={DESC[kind]}
        actions={
          <>
            {studio && (
              <Link to={`${ADMIN_PATH}/yeni/${kind}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-bold ring-1 ring-line hover:bg-paper">
                <FileCode2 size={16} />
                HTML ile ekle
              </Link>
            )}
            {studio ? (
              <Link to={`${ADMIN_PATH}/studyo?tur=${kind}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-bold text-white shadow-sm hover:bg-ink/90">
                <Sparkles size={16} />
                Stüdyo ile oluştur
              </Link>
            ) : (
              <Link to={`${ADMIN_PATH}/yeni/${kind}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-bold text-white shadow-sm hover:bg-ink/90">
                <Plus size={16} />
                Yeni {info.label.toLocaleLowerCase('tr')}
              </Link>
            )}
          </>
        }
      />
      {!loaded ? (
        <div className="h-60 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
      ) : (
        <ItemList
          items={items}
          toolbar={
            <Segmented
              size="sm"
              value={grade}
              onChange={setGrade}
              options={[{ value: 'all', label: 'Tüm sınıflar' }, ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((g) => ({ value: `${g}` as const, label: `${g}` }))]}
            />
          }
        />
      )}
    </div>
  )
}
