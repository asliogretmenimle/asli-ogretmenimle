import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { guideBands, guideBySlug, guides, type Guide } from '../data/guides'
import { activityGrade, loadGrade } from '../data/activityStore'
import { gradeInfo, isGrade } from '../data/curriculum'
import type { Activity } from '../data/types'
import { gameMetaById } from '../games/meta'
import { toolMetaById } from '../manipulatives/meta'
import { interactionById } from '../interactions/meta'
import { GUIDES_PATH, gameKw, interactionKw, outcomeKw, toolKw } from '../lib/seo'
import NotFound from './NotFound'

const range = (g: number[]) => (g.length === 1 ? `${g[0]}` : `${g[0]}–${g[g.length - 1]}`)

export function GuidesIndex() {
  usePageTitle('Konu Anlatımları')
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <p className="chip bg-cream px-3 py-1 text-sm text-amber-800">Öğrenciler, veliler ve öğretmenler için</p>
      <h1 className="mt-3 text-3xl leading-tight font-black sm:text-4xl">Matematik Konu Anlatımları</h1>
      <p className="mt-3 max-w-3xl text-lg font-semibold text-ink-soft">
        En çok merak edilen matematik sorularına kısa ve örnekli cevaplar. Her rehberin sonunda konuyu deneyerek pekiştirebileceğin etkinlikler, oyunlar ve sanal manipülatifler var.
      </p>
      {guideBands.map((band) => {
        const list = band.guides()
        return list.length ? (
          <section key={band.title} className="mt-10">
            <h2 className="text-xl font-black">{band.title}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {list.map((g) => (
                <li key={g.slug}>
                  <Link to={`${GUIDES_PATH}/${g.slug}`} className="card flex h-full items-start gap-3 p-4 transition hover:-translate-y-0.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink"><BookOpen size={20} /></span>
                    <span>
                      <span className="block font-black text-ink">{g.title}</span>
                      <span className="mt-1 block text-sm font-semibold text-ink-soft">{range(g.grades)}. sınıf</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      })}
    </div>
  )
}

/** Rehbere bağlı öğrenme çıktılarının etkinlikleri (yalnızca ilgili sınıfların verisi indirilir) */
function useGuideActivities(g: Guide): Activity[] {
  const [list, setList] = useState<Activity[]>([])
  useEffect(() => {
    let alive = true
    const gs = [...new Set(g.outcomes.map((c) => Number(c.split('.')[1])))].filter(isGrade)
    Promise.all(gs.map(loadGrade)).then(
      (all) => alive && setList(all.flat().filter((a) => g.outcomes.includes(a.outcomes[0]))),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [g])
  return list
}

export function GuidePage() {
  const { slug = '' } = useParams()
  const g = guideBySlug[slug]
  usePageTitle(g ? g.title : 'Bulunamadı')
  const acts = useGuideActivities(g ?? guides[0])
  if (!g) return <NotFound />
  const i = guides.indexOf(g)
  const prev = guides[i - 1]
  const next = guides[i + 1]
  const games = (g.games ?? []).map((id) => gameMetaById[id]).filter(Boolean)
  const tools = (g.tools ?? []).map((id) => toolMetaById[id]).filter(Boolean)
  const inter = (g.interactions ?? []).map((id) => interactionById[id]).filter((m) => m?.ready)

  return (
    <article className="mx-auto max-w-3xl px-4 pt-6">
      <nav className="mb-5 text-sm font-extrabold text-ink-soft" aria-label="Konum">
        <Link to={GUIDES_PATH} className="inline-flex min-h-10 items-center gap-1 hover:text-ink"><ChevronLeft size={18} /> Konu Anlatımları</Link>
      </nav>
      <p className="chip bg-cream px-3 py-1 text-sm text-amber-800">{range(g.grades)}. sınıf matematik</p>
      <h1 className="mt-3 text-3xl leading-tight font-black sm:text-4xl">{g.title}</h1>
      <p className="mt-4 rounded-3xl bg-brand-soft/60 p-5 text-lg font-bold text-ink">{g.intro}</p>

      {g.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="text-xl font-black sm:text-2xl">{s.h}</h2>
          {s.p.map((t) => <p key={t} className="mt-2 font-semibold leading-relaxed text-ink-soft">{t}</p>)}
          {s.list && (
            <ul className="mt-3 space-y-1.5">
              {s.list.map((t) => (
                <li key={t} className="flex items-start gap-2 rounded-2xl bg-white p-3 font-bold text-ink ring-1 ring-line">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />{t}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {(acts.length > 0 || inter.length > 0) && (
        <section className="mt-10">
          <h2 className="text-xl font-black sm:text-2xl">Deneyerek öğren: etkinlikler</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {inter.map((m) => (
              <li key={m.id}><Link to={`/etkilesim/${m.id}`} className="card block p-3 font-extrabold text-ink hover:text-brand">{m.emoji} {interactionKw(m)}</Link></li>
            ))}
            {acts.slice(0, 12).map((a) => (
              <li key={a.id}>
                <Link to={`/etkinlik/${a.id}`} className="card block p-3 hover:text-brand">
                  <span className="block font-extrabold text-ink">{a.title}</span>
                  <span className="text-xs font-bold text-ink-soft">{gradeInfo[activityGrade(a)].label} · {outcomeKw(a.outcomes[0])}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(games.length > 0 || tools.length > 0) && (
        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          {games.length > 0 && (
            <div>
              <h2 className="text-lg font-black">Oyunlar</h2>
              <ul className="mt-2 space-y-1.5">
                {games.map((m) => <li key={m.id}><Link to={`/oyun/${m.id}`} className="font-extrabold text-brand hover:underline">{m.emoji} {m.name}</Link> <span className="text-sm font-semibold text-ink-soft">– {gameKw(m)}</span></li>)}
              </ul>
            </div>
          )}
          {tools.length > 0 && (
            <div>
              <h2 className="text-lg font-black">Sanal manipülatifler</h2>
              <ul className="mt-2 space-y-1.5">
                {tools.map((t) => <li key={t.id}><Link to={`/manipulatif/${t.id}`} className="font-extrabold text-brand hover:underline">{t.emoji} {toolKw(t)}</Link></li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-black sm:text-2xl">Sık sorulan sorular</h2>
        <div className="mt-3 space-y-2">
          {g.faq.map((f) => (
            <details key={f.q} className="card p-4" open>
              <summary className="cursor-pointer font-black text-ink">{f.q}</summary>
              <p className="mt-2 font-semibold text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <nav className="mt-10 flex flex-wrap justify-between gap-3 text-sm font-extrabold">
        {prev ? <Link to={`${GUIDES_PATH}/${prev.slug}`} className="inline-flex items-center gap-1 text-brand hover:underline"><ChevronLeft size={16} />{prev.title}</Link> : <span />}
        {next && <Link to={`${GUIDES_PATH}/${next.slug}`} className="inline-flex items-center gap-1 text-right text-brand hover:underline">{next.title}<ChevronRight size={16} /></Link>}
      </nav>
    </article>
  )
}
