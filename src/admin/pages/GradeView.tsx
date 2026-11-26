/** Bir sınıfın tüm içeriği: etkinlikler, testler, oyunlar, etkileşimler, manipülatifler */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ExternalLink, MinusCircle, Plus, PlusCircle, Sparkles } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import type { CmsKind } from '../../cms/types'
import { gradeInfo, isGrade, themesByGrade } from '../../data/curriculum'
import { loadGradeRaw } from '../../data/activityStore'
import type { Activity, Grade, QuizActivity } from '../../data/types'
import { useEntries } from '../api'
import { activityItems, kindInfo, themeOfActivity, type AdminItem } from '../catalog'
import { ItemList, useItemActions } from '../components/ItemList'
import { itemsOf } from './Library'
import { Badge, Button, Callout, Empty, Modal, PageHead, Tabs, cx, inputCls } from '../ui'

type Tab = 'etkinlikler' | 'testler' | 'oyunlar' | 'etkilesimler' | 'manipulatifler'
const TAB_KIND: Record<Exclude<Tab, 'etkinlikler' | 'testler'>, CmsKind> = { oyunlar: 'game', etkilesimler: 'interaction', manipulatifler: 'manipulative' }

const linkBtn = 'inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition'

export function GradeView() {
  const { grade: gp } = useParams()
  const g = Number(gp)
  if (!isGrade(g)) return <Empty title="Geçersiz sınıf" />
  return <GradeInner key={g} g={g} />
}

function GradeInner({ g }: { g: Grade }) {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('sekme') as Tab) || 'etkinlikler'
  const setTab = (t: Tab) => setParams({ sekme: t }, { replace: true })
  const { entries } = useEntries()
  const [raw, setRaw] = useState<Activity[] | null>(null)
  useEffect(() => {
    loadGradeRaw(g).then(setRaw)
  }, [g])

  const info = gradeInfo[g]
  const acts = useMemo(() => (raw ? activityItems(g, raw, entries) : []), [raw, entries, g])
  const tests = acts.filter((it) => (it.value as Activity).type === 'quiz')
  const byKind = (k: CmsKind) => itemsOf(k, entries).filter((it) => it.grades.includes(g))
  const games = byKind('game')
  const inters = byKind('interaction')
  const tools = byKind('manipulative')

  const themeOrder = useMemo(() => new Map(themesByGrade(g).map((t, i) => [t.title, i])), [g])
  const groupByTheme = (it: AdminItem) => themeOfActivity(it.value as Activity)?.title ?? 'Diğer'
  const sortByTheme = (list: AdminItem[]) => list.slice().sort((a, b) => (themeOrder.get(groupByTheme(a)) ?? 99) - (themeOrder.get(groupByTheme(b)) ?? 99))

  return (
    <div>
      <PageHead
        crumbs="Sınıflar"
        title={
          <span className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl text-xl font-black text-white" style={{ background: info.color }}>
              {g}
            </span>
            {info.label}
          </span>
        }
        desc={`${themesByGrade(g).length} tema · ${acts.length} etkinlik · ${games.length} oyun · ${inters.length} etkileşim · ${tools.length} manipülatif`}
        actions={
          <a href={`/sinif/${g}`} target="_blank" rel="noreferrer" className={cx(linkBtn, 'bg-white ring-1 ring-line hover:bg-paper')}>
            <ExternalLink size={16} />
            Sitede gör
          </a>
        }
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'etkinlikler', label: 'Etkinlikler', count: acts.length },
          { value: 'testler', label: 'Testler', count: tests.length },
          { value: 'oyunlar', label: 'Oyunlar', count: games.length },
          { value: 'etkilesimler', label: 'Etkileşimler', count: inters.length },
          { value: 'manipulatifler', label: 'Manipülatifler', count: tools.length },
        ]}
      />

      {(tab === 'etkinlikler' || tab === 'testler') && !raw && <div className="h-60 animate-pulse rounded-2xl bg-white ring-1 ring-line" />}

      {tab === 'etkinlikler' && raw && (
        <ItemList
          items={sortByTheme(acts)}
          group={groupByTheme}
          showGrades={false}
          toolbar={
            <Link to={`${ADMIN_PATH}/yeni/activity?sinif=${g}`} className={cx(linkBtn, 'bg-ink text-white hover:bg-ink/90')}>
              <Plus size={16} />
              Yeni etkinlik
            </Link>
          }
        />
      )}

      {tab === 'testler' && raw && (
        <div className="space-y-4">
          <TestSummary g={g} items={tests} />
          <ItemList
            items={sortByTheme(tests)}
            group={groupByTheme}
            showGrades={false}
            toolbar={
              <>
                <Link to={`${ADMIN_PATH}/studyo?tur=test&sinif=${g}`} className={cx(linkBtn, 'bg-white ring-1 ring-line hover:bg-paper')}>
                  <Sparkles size={16} />
                  AI ile test üret
                </Link>
                <Link to={`${ADMIN_PATH}/yeni/activity?sinif=${g}&tip=quiz`} className={cx(linkBtn, 'bg-ink text-white hover:bg-ink/90')}>
                  <Plus size={16} />
                  Yeni test
                </Link>
              </>
            }
          />
        </div>
      )}

      {tab in TAB_KIND && <KindTab g={g} kind={TAB_KIND[tab as keyof typeof TAB_KIND]} items={tab === 'oyunlar' ? games : tab === 'etkilesimler' ? inters : tools} />}
    </div>
  )
}

/** Her temada kaç test sorusu var (Test Çöz sayfası temada en az 5 soru ister) */
function TestSummary({ g, items }: { g: Grade; items: AdminItem[] }) {
  const counts = new Map<string, number>()
  for (const it of items) {
    if (it.state === 'hidden' || it.state === 'draft') continue
    const a = it.value as QuizActivity
    if (a.anyCorrect || !a.questions?.length) continue
    const t = themeOfActivity(a)?.slug
    if (t) counts.set(t, (counts.get(t) ?? 0) + a.questions.filter((q) => !q.flash).length)
  }
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="mb-3 text-sm font-black">Test Çöz sayfasındaki soru havuzu</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {themesByGrade(g).map((t) => {
          const n = counts.get(t.slug) ?? 0
          return (
            <a key={t.slug} href={`/test/${g}/${t.slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-sm font-bold hover:ring-1 hover:ring-line">
              <span className="min-w-0 truncate">{t.title}</span>
              <Badge tone={n >= 5 ? 'green' : n ? 'amber' : 'gray'}>{n} soru</Badge>
            </a>
          )
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-soft">Bir temanın testi sitede görünmesi için en az 5 soru gerekir. Çoktan seçmeli etkinliklerin soruları teste otomatik eklenir.</p>
    </div>
  )
}

function KindTab({ g, kind, items }: { g: Grade; kind: CmsKind; items: AdminItem[] }) {
  const [adding, setAdding] = useState(false)
  const a = useItemActions()
  const info = kindInfo[kind]
  const canRegrade = kind === 'game' || kind === 'interaction'
  return (
    <>
      {kind === 'manipulative' && (
        <div className="mb-3">
          <Callout tone="blue">Manipülatiflerin sınıf aralığını (ör. 2–6) düzenleme ekranından değiştirebilirsiniz.</Callout>
        </div>
      )}
      <ItemList
        items={items}
        emptyText={`Bu sınıfta henüz ${info.label.toLocaleLowerCase('tr')} yok.`}
        extraActions={
          canRegrade
            ? (it) => [
                {
                  label: 'Bu sınıftan çıkar',
                  icon: <MinusCircle size={15} />,
                  onClick: () => a.setGrades(it, it.grades.filter((x) => x !== g)),
                },
              ]
            : undefined
        }
        toolbar={
          <>
            {canRegrade && (
              <Button icon={<PlusCircle size={16} />} onClick={() => setAdding(true)}>
                Mevcut {info.label.toLocaleLowerCase('tr')} ekle
              </Button>
            )}
            <Link to={`${ADMIN_PATH}/studyo?tur=${kind}&sinif=${g}`} className={cx(linkBtn, 'bg-ink text-white hover:bg-ink/90')}>
              <Sparkles size={16} />
              Stüdyo ile üret
            </Link>
          </>
        }
      />
      {canRegrade && <AddExisting open={adding} onClose={() => setAdding(false)} g={g} kind={kind} />}
    </>
  )
}

/** Başka sınıflardaki oyun/etkileşimi bu sınıfa da ekle */
function AddExisting({ open, onClose, g, kind }: { open: boolean; onClose: () => void; g: Grade; kind: CmsKind }) {
  const { entries } = useEntries()
  const a = useItemActions()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const key = (s: string) => s.toLocaleLowerCase('tr')
  const list = itemsOf(kind, entries).filter((it) => !it.grades.includes(g) && it.state !== 'hidden' && (!q || key(`${it.title} ${it.desc}`).includes(key(q))))
  return (
    <Modal open={open} onClose={onClose} title={`${g}. sınıfa ${kindInfo[kind].label.toLocaleLowerCase('tr')} ekle`} desc="Seçtiğiniz içerik bu sınıfın listelerinde ve sınıf seçiminde görünür." size="lg">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className={cx(inputCls, 'mb-3')} autoFocus />
      {!list.length ? (
        <Empty title="Eklenecek içerik yok" />
      ) : (
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {list.map((it) => (
            <li key={it.ref} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xl" aria-hidden>
                {it.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{it.title}</span>
                <span className="block text-xs font-bold text-ink-soft">{it.grades.join(', ')}. sınıflar</span>
              </span>
              <Button
                size="sm"
                variant="soft"
                loading={busy === it.ref}
                icon={<Plus size={14} />}
                onClick={async () => {
                  setBusy(it.ref)
                  await a.setGrades(it, [...it.grades, g].sort((x, y) => x - y))
                  setBusy(null)
                }}
              >
                Ekle
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
