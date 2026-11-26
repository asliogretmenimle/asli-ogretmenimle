/** Tüm değişikliklerin geçmişi: kim, ne zaman, neyi değiştirdi; tek tıkla geri yükle */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import type { CmsKind } from '../../cms/types'
import { loadRevisions, restoreRevision, type Revision } from '../api'
import { kindInfo } from '../catalog'
import { ACTION } from '../editors/MetaEditor'
import { Badge, Button, Empty, PageHead, Segmented, timeAgo, useConfirm, useToast } from '../ui'

type Filter = 'all' | CmsKind

export function HistoryPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(60)
  const [revs, setRevs] = useState<Revision[] | null>(null)
  const [tick, setTick] = useState(0)
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    setRevs(null)
    loadRevisions({ kind: filter === 'all' ? undefined : filter, limit }).then(setRevs, (e) => {
      toast((e as Error).message, 'error')
      setRevs([])
    })
  }, [filter, limit, tick, toast])

  const restore = async (r: Revision) => {
    if (!(await confirm({ title: 'Bu sürüm geri yüklensin mi?', desc: 'İçerik bu kayıttaki hâline döner. Mevcut hâl de geçmişte saklanır.', confirm: 'Geri yükle' }))) return
    try {
      await restoreRevision(r)
      toast('Geri yüklendi')
      setTick((x) => x + 1)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const name = (r: Revision) => String(r.snapshot?.data?.name ?? r.snapshot?.data?.title ?? r.ref)
  const href = (r: Revision) => (r.kind === 'link' ? `${ADMIN_PATH}/baglantilar` : r.kind === 'seo' ? `${ADMIN_PATH}/seo` : `${ADMIN_PATH}/duzenle/${r.kind}/${encodeURIComponent(r.ref)}`)

  return (
    <div>
      <PageHead title="Değişiklik geçmişi" desc="Panelde yapılan her kayıt, gizleme ve silme burada saklanır. Yanlışlıkla yapılan bir değişikliği geri yükleyebilirsiniz." />
      <div className="mb-4 overflow-x-auto">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tümü' },
            { value: 'activity', label: 'Etkinlik' },
            { value: 'game', label: 'Oyun' },
            { value: 'interaction', label: 'Etkileşim' },
            { value: 'manipulative', label: 'Manipülatif' },
            { value: 'guide', label: 'Rehber' },
            { value: 'link', label: 'Bağlantı' },
            { value: 'seo', label: 'SEO' },
          ]}
        />
      </div>
      {!revs ? (
        <div className="h-60 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
      ) : !revs.length ? (
        <Empty title="Henüz değişiklik yok" />
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            {revs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="text-xl" aria-hidden>
                  {kindInfo[r.kind]?.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <Link to={href(r)} className="truncate font-extrabold hover:text-brand-ink">
                      {name(r)}
                    </Link>
                    <Badge tone={r.action === 'hide' || r.action === 'delete' ? 'red' : r.action === 'create' ? 'violet' : r.action === 'draft' ? 'amber' : 'blue'}>{ACTION[r.action] ?? r.action}</Badge>
                    {r.snapshot?.origin === 'builtin' && <span className="text-xs font-bold text-ink-soft">koddaki içerik</span>}
                  </p>
                  <p className="text-xs font-semibold text-ink-soft">
                    {kindInfo[r.kind]?.label} · {r.created_by_email ?? '—'} · {new Date(r.created_at).toLocaleString('tr-TR')} ({timeAgo(r.created_at)})
                  </p>
                </div>
                {r.snapshot && (
                  <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => restore(r)}>
                    {r.action === 'delete' ? 'Geri getir' : 'Bu hâle dön'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {revs.length >= limit && (
            <div className="mt-4 text-center">
              <Button onClick={() => setLimit((l) => l + 60)}>Daha fazla göster</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
