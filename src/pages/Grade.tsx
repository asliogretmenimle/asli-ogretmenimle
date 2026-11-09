import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Blocks, ClipboardCheck, Gamepad2, Telescope } from 'lucide-react'
import { gradeInfo, grades, isGrade, themesByGrade } from '../data/curriculum'
import { STAGE_ORDER, activityTheme, useGradeActivities } from '../data/activityStore'
import type { Activity, Grade } from '../data/types'
import { ActivityCard, ThemeHeader } from '../components/Cards'
import { usePageTitle } from '../components/Layout'
import { stageMeta, typeMeta } from '../components/meta'
import { TopicSection } from '../components/TopicSection'
import { inTopic, topicsByGrade } from '../data/topics'
import { gamesForGrade } from '../games/meta'
import { interactionMeta } from '../interactions/meta'
import { toolGrades, toolMeta } from '../manipulatives/meta'
import NotFound from './NotFound'

export const GRADE_KEY = 'ao-grade'

/** /sinif/5: bir sınıfın bütün konuları, etkinlikleri ve o sınıfa uygun oyun/etkileşim/materyal kısayolları */
export default function GradePage() {
  const { grade: param } = useParams()
  const g = Number(param)
  usePageTitle(isGrade(g) ? gradeInfo[g].label : 'Bulunamadı')
  if (!isGrade(g)) return <NotFound />
  return <GradeView key={g} grade={g} />
}

function GradeView({ grade }: { grade: Grade }) {
  const info = gradeInfo[grade]
  const themes = themesByGrade(grade)
  /** Konu başlıklarıyla düzenlenen sınıflarda temalar yerine konular gösterilir */
  const topics = topicsByGrade[grade]
  const all = useGradeActivities(grade)
  const [stage, setStage] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const types = useMemo(() => [...new Set((all ?? []).map((a) => a.type))], [all])
  const filtered = stage !== 'all' || type !== 'all'
  const pass = (a: Activity) => (stage === 'all' || a.stage === stage) && (type === 'all' || a.type === type)

  useEffect(() => {
    try {
      localStorage.setItem(GRADE_KEY, String(grade))
    } catch {
      /* depolama yok */
    }
  }, [grade])

  const shortcuts = [
    { to: `/oyunlar?sinif=${grade}`, icon: Gamepad2, label: 'Oyunlar', count: gamesForGrade(grade).length, unit: 'oyun' },
    { to: `/etkilesimler?sinif=${grade}`, icon: Telescope, label: 'Etkileşimler', count: interactionMeta.filter((m) => m.ready && m.grades.includes(grade)).length, unit: 'etkileşim' },
    { to: `/manipulatifler?sinif=${grade}`, icon: Blocks, label: 'Manipülatifler', count: toolMeta.filter((t) => toolGrades(t).includes(grade)).length, unit: 'materyal' },
    { to: `/test/${grade}`, icon: ClipboardCheck, label: 'Test Çöz', count: themes.length, unit: 'konu testi' },
  ]

  const sections = topics
    ? topics.map((t) => ({
        id: `konu-${t.slug}`,
        title: t.title,
        list: (all ?? []).filter((a) => inTopic(t, a) && pass(a)).sort((x, y) => STAGE_ORDER.indexOf(x.stage) - STAGE_ORDER.indexOf(y.stage)),
        topic: t,
        theme: undefined,
      }))
    : themes.map((t) => ({
        id: t.slug,
        title: t.title,
        list: (all ?? []).filter((a) => activityTheme(a)?.slug === t.slug && activityTheme(a)?.grade === grade && pass(a)),
        topic: undefined,
        theme: t,
      }))
  const visible = sections.filter((s) => !filtered || s.list.length > 0)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:pt-8">
      {/* Sınıf değiştirici */}
      <nav className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Sınıflar">
        {grades.map((x) => (
          <Link key={x} to={`/sinif/${x}`} replace aria-current={x === grade ? 'page' : undefined} className={`pill min-w-11 justify-center ${x === grade ? 'bg-ink text-white ring-ink hover:text-white' : ''}`}>
            <span>{x}<span className="hidden sm:inline">. sınıf</span></span>
          </Link>
        ))}
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{info.label} Matematik</h1>
        <p className="mt-2 text-base font-semibold text-ink-soft">
          {topics ? `${topics.length} konu` : `${themes.length} tema`}{all ? ` · ${all.length} etkinlik` : ''} · Maarif Modeli öğretim programına göre sıralı
        </p>
      </header>

      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper text-ink"><s.icon size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{info.label} {s.label.toLocaleLowerCase('tr')}</span>
              <span className="block text-sm font-semibold text-ink-soft">{s.count} {s.unit}</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <nav className="sticky top-24" aria-label={topics ? 'Konular' : 'Temalar'}>
            <p className="mb-2 text-xs font-bold text-ink-soft">{topics ? 'Konular' : 'Temalar'}</p>
            <ul className="space-y-0.5">
              {visible.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-soft hover:bg-white hover:text-ink">
                    <span>{s.title}</span>
                    {all && <span className="text-xs">{s.list.length}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {/* Süzgeçler */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Aşama">
              <button type="button" className="pill" aria-pressed={stage === 'all'} onClick={() => setStage('all')}>Tüm aşamalar</button>
              {STAGE_ORDER.map((st) => (
                <button key={st} type="button" className="pill" aria-pressed={stage === st} onClick={() => setStage(stage === st ? 'all' : st)} title={stageMeta[st].desc}>
                  <span className="size-2 rounded-full" style={{ background: stageMeta[st].color }} aria-hidden />
                  {stageMeta[st].label}
                </button>
              ))}
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Etkinlik türü" className="h-9 shrink-0 rounded-full bg-white px-3.5 text-sm font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand">
              <option value="all">Tüm türler</option>
              {types.map((t) => <option key={t} value={t}>{typeMeta[t].label}</option>)}
            </select>
          </div>

          {/* Mobilde konu kısayolları */}
          <div className="-mx-4 mb-8 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">
            {visible.map((s) => <a key={s.id} href={`#${s.id}`} className="pill">{s.title}</a>)}
          </div>

          {!all ? (
            <div className="grid h-40 place-items-center">
              <span className="size-9 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
              <p className="font-bold">Bu süzgeçlere uyan etkinlik yok.</p>
              <button type="button" onClick={() => { setStage('all'); setType('all') }} className="mt-3 text-sm font-bold text-brand hover:underline">Süzgeçleri temizle</button>
            </div>
          ) : (
            <div className="space-y-12">
              {visible.map((s) =>
                s.topic ? (
                  <TopicSection key={s.id} topic={s.topic} grade={grade} activities={s.list} onlyActivities={filtered} />
                ) : (
                  <section key={s.id} id={s.id} className="scroll-mt-24">
                    <ThemeHeader theme={s.theme!} count={s.list.length} linkTo={`/sinif/${grade}/${s.id}`} />
                    {s.list.length > 0 ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {s.list.map((a) => <ActivityCard key={a.id} a={a} grade={grade} />)}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-white p-4 text-center text-sm font-semibold text-ink-soft ring-1 ring-line">Bu temanın etkinlikleri hazırlanıyor.</p>
                    )}
                  </section>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
