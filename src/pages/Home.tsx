import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Search, X } from 'lucide-react'
import { gradeInfo, grades, isGrade, outcomeByCode, themesByGrade } from '../data/curriculum'
import { activityGrade, activityTheme, useAllActivities, useGradeActivities } from '../data/activityStore'
import type { Grade } from '../data/types'
import { ActivityCard, ThemeHeader } from '../components/Cards'
import { usePageTitle } from '../components/Layout'
import { toolMeta as toolList } from '../manipulatives/meta'
import { gameMeta, gameMetaById, gamesForGrade, type GameId } from '../games/meta'
import { interactionById } from '../interactions/meta'
import { gradePlan } from '../data/gradePlan'
import { searchKey } from '../lib/format'
import { stageMeta, typeMeta } from '../components/meta'
import { STAGE_ORDER } from '../data/activityStore'
import { inTopic, topicsByGrade } from '../data/topics'
import { TopicSection } from '../components/TopicSection'

const GRADE_KEY = 'ao-grade'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const q = params.get('ara') ?? ''
  const { grade: gradeParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fromUrl = Number(gradeParam ?? params.get('sinif'))
  const [stored] = useState(() => {
    try {
      return Number(localStorage.getItem(GRADE_KEY))
    } catch {
      return 0
    }
  })
  const grade: Grade | null = isGrade(fromUrl) ? fromUrl : isGrade(stored) ? stored : null
  const contentRef = useRef<HTMLDivElement>(null)
  usePageTitle(grade && !q ? gradeInfo[grade].label : undefined)

  useEffect(() => {
    if (!grade) return
    try {
      localStorage.setItem(GRADE_KEY, String(grade))
    } catch {
      /* depolama yok */
    }
  }, [grade])

  // Eski ?sinif=3 linkleri kalıcı adrese: /sinif/3
  useEffect(() => {
    if (!gradeParam && isGrade(fromUrl) && !q) navigate(`/sinif/${fromUrl}`, { replace: true })
  }, [gradeParam, fromUrl, q, navigate])

  // Sınıf seçilince içerik ekranın altında kaldıysa ona kaydır
  const scrollToContent = (location.state as { scrollToGrade?: boolean } | null)?.scrollToGrade
  useEffect(() => {
    if (!scrollToContent) return
    const id = requestAnimationFrame(() => {
      const top = contentRef.current?.getBoundingClientRect().top ?? 0
      if (top > window.innerHeight * 0.6) contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [scrollToContent, grade])

  const setQuery = (v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set('ara', v)
    else p.delete('ara')
    setParams(p, { replace: true })
  }

  return (
    <div>
      {/* Karşılama */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden>
          <div className="absolute -top-24 -left-20 size-72 rounded-full bg-rose-200/50 blur-3xl" />
          <div className="absolute -top-10 right-0 size-64 rounded-full bg-amber-200/50 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-12">
          <h1 className="mb-2 text-sm font-extrabold text-brand-ink sm:text-base">
            Aslı Öğretmenle {gradeParam && grade ? `${gradeInfo[grade].label.toLocaleLowerCase('tr')} matematik etkinlikleri ve oyunları` : '1–8. sınıf matematik oyunları ve etkinlikleri'}
          </h1>
          <p className="max-w-2xl text-3xl leading-tight font-black tracking-tight text-ink sm:text-5xl">
            Merhaba! <span aria-hidden>👋</span>
            <br />
            <span className="text-brand">Hangi sınıftasın?</span>
          </p>
          <p className="mt-3 max-w-xl text-base font-semibold text-ink-soft sm:text-lg">
            Oyunlar, eşleştirmeler, sürükle-bırak etkinlikleri ve sanal manipülatiflerle matematiği keşfet.
          </p>
          <label className="relative mt-6 block max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" size={20} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Konu ara: kesirler, saat, açı, örüntü…"
              className="h-14 w-full rounded-2xl bg-white pr-12 pl-12 text-base font-semibold shadow-[var(--shadow-card)] ring-1 ring-line outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand"
              aria-label="Etkinlik ara"
            />
            {q && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-paper" aria-label="Aramayı temizle">
                <X size={18} />
              </button>
            )}
          </label>
        </div>
      </section>

      {/* Sınıf seçici */}
      <section className="mx-auto max-w-6xl px-4" aria-label="Sınıflar">
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 md:grid-cols-8">
          {grades.map((g) => {
            const info = gradeInfo[g]
            const active = grade === g && !q
            return (
              <Link
                key={g}
                to={`/sinif/${g}`}
                replace
                state={{ scrollToGrade: true }}
                aria-current={active ? 'page' : undefined}
                aria-label={`${info.label} matematik`}
                className={`group relative flex aspect-[1/1.05] flex-col items-center justify-center rounded-3xl border-2 transition md:aspect-[1/1.1] lg:aspect-square ${active ? 'scale-[1.03] text-white shadow-[var(--shadow-lift)]' : 'bg-white hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]'}`}
                style={{ background: active ? info.color : undefined, borderColor: active ? info.color : `${info.color}55` }}
              >
                <span className="text-xl sm:text-2xl" aria-hidden>{info.emoji}</span>
                <span className="text-3xl leading-none font-black sm:text-4xl" style={{ color: active ? '#fff' : info.color }}>{g}</span>
                <span className={`mt-0.5 text-[11px] font-extrabold sm:text-xs ${active ? 'text-white/90' : 'text-ink-soft'}`}>SINIF</span>
              </Link>
            )
          })}
        </div>
      </section>

      <div ref={contentRef} className="scroll-mt-20">
        {q ? <SearchResults q={q} /> : grade ? <GradeContent grade={grade} /> : <Welcome />}
      </div>

      {/* Oyunlar şeridi */}
      {!q && (
        <section className="mx-auto mt-14 max-w-6xl px-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Oyunlar <span aria-hidden>🎮</span></h2>
              <p className="text-sm font-semibold text-ink-soft">{grade ? `${gradeInfo[grade].label} seviyesinde oyna.` : 'Balon patlat, robotu kodla, gizli gemileri bul!'}</p>
            </div>
            <Link to={`/oyunlar${grade ? `?sinif=${grade}` : ''}`} className="inline-flex items-center gap-1 text-sm font-extrabold text-brand hover:underline">Tümü <ArrowRight size={16} /></Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
            {(grade ? gamesForGrade(grade) : gameMeta).map((m) => (
              <Link key={m.id} to={`/oyun/${m.id}${grade ? `?sinif=${grade}` : ''}`} className="card flex w-44 shrink-0 snap-start flex-col gap-1.5 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <span className="grid size-12 place-items-center rounded-2xl text-3xl" style={{ background: `${m.color}18` }} aria-hidden>{m.emoji}</span>
                <span className="leading-tight font-extrabold">{m.name}</span>
                <span className="line-clamp-2 text-xs font-bold text-ink-soft">{(grade && m.skills[grade]) || m.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Manipülatifler şeridi */}
      {!q && (
        <section className="mx-auto mt-14 max-w-6xl px-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Sanal Manipülatifler</h2>
              <p className="text-sm font-semibold text-ink-soft">Serbestçe keşfet, dene, oluştur.</p>
            </div>
            <Link to="/manipulatifler" className="inline-flex items-center gap-1 text-sm font-extrabold text-brand hover:underline">Tümü <ArrowRight size={16} /></Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
            {toolList.map((t) => (
              <Link key={t.id} to={`/manipulatif/${t.id}`} className="card flex w-40 shrink-0 snap-start flex-col gap-1.5 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <span className="text-3xl" aria-hidden>{t.emoji}</span>
                <span className="leading-tight font-extrabold">{t.name}</span>
                <span className="text-xs font-bold text-ink-soft">{t.grades}. sınıf</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Welcome() {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4">
      <div className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        {[
          { e: '👆', t: 'Sınıfını seç', d: 'Yukarıdan kendi sınıfına dokun.' },
          { e: '🧩', t: 'Keşfet', d: 'Her konu, yaparak keşfetmekten problem çözmeye uzanan bir yolla ilerler.' },
          { e: '💬', t: 'Düşün ve paylaş', d: 'Sonunda nasıl düşündüğünü bir arkadaşına anlat.' },
        ].map((s) => (
          <div key={s.t} className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-paper text-2xl">{s.e}</span>
            <div>
              <p className="font-extrabold">{s.t}</p>
              <p className="text-sm font-semibold text-ink-soft">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-ink-soft">
        Öğretmen ya da veli misiniz? <Link to="/yaklasim" className="font-extrabold text-brand hover:underline">Etkinliklerin arkasındaki yaklaşımı okuyun →</Link>
      </p>
    </section>
  )
}

/** Sınıfa göre öne çıkan yeni nesil oyun ve keşif etkinlikleri */
function Featured({ grade }: { grade: Grade }) {
  const plan = gradePlan[grade]
  const items = plan.featured
    .map((f) => {
      if (f.kind === 'oyun') {
        const m = gameMetaById[f.id as GameId]
        return m ? { key: f.id, to: `/oyun/${m.id}?sinif=${grade}`, name: m.name, emoji: m.emoji, color: m.color, desc: m.skills[grade] ?? m.description, tag: 'Oyun' } : null
      }
      const m = interactionById[f.id]
      return m && m.ready ? { key: f.id, to: `/etkilesim/${m.id}?sinif=${grade}`, name: m.name, emoji: m.emoji, color: m.color, desc: m.skills?.[grade] ?? m.description, tag: 'Keşif' } : null
    })
    .filter(Boolean) as { key: string; to: string; name: string; emoji: string; color: string; desc: string; tag: string }[]
  return (
    <div className="mb-6 rounded-3xl bg-white p-4 ring-1 ring-line sm:p-5">
      <p className="text-xs font-black tracking-wide text-ink-soft uppercase">Bu sınıfın odağı</p>
      <p className="mt-0.5 font-extrabold text-ink">{plan.focus}</p>
      {items.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <Link key={it.key} to={it.to} className="group flex items-start gap-3 rounded-2xl p-3 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]" style={{ background: `${it.color}0d` }}>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm transition group-hover:scale-110" aria-hidden>{it.emoji}</span>
              <span className="min-w-0">
                <span className="chip mb-1 bg-white text-ink-soft">{it.tag}</span>
                <span className="block leading-tight font-black">{it.name}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs font-bold text-ink-soft">{it.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function GradeContent({ grade }: { grade: Grade }) {
  const info = gradeInfo[grade]
  const themes = themesByGrade(grade)
  /** Konu başlıklarıyla düzenlenen sınıflarda temalar yerine konular gösterilir */
  const topics = topicsByGrade[grade]
  const all = useGradeActivities(grade)
  const total = all?.length ?? 0
  const [filter, setFilter] = useState<string>('all')
  const [stage, setStage] = useState<string>('all')
  const types = useMemo(() => [...new Set((all ?? []).map((a) => a.type))], [all])

  useEffect(() => {
    setFilter('all')
    setStage('all')
  }, [grade])

  return (
    <section className="mx-auto mt-8 max-w-6xl px-4" key={grade}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl" style={{ color: info.ink }}>{info.label} Etkinlikleri</h2>
          <p className="text-sm font-semibold text-ink-soft">{topics ? `${topics.length} konu` : `${themes.length} tema`}{all ? ` · ${total} etkinlik` : ''}</p>
        </div>
      </div>

      <Featured grade={grade} />

      {/* Tema kısayolları + tür filtresi */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-line/60 bg-paper/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          <button type="button" onClick={() => { setFilter('all'); setStage('all') }} className={`chip shrink-0 px-3 py-1.5 text-sm ${filter === 'all' && stage === 'all' ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line'}`}>Hepsi</button>
          {STAGE_ORDER.map((st) => {
            const m = stageMeta[st]
            const on = stage === st
            return (
              <button key={st} type="button" onClick={() => setStage(on ? 'all' : st)} className="chip shrink-0 border px-3 py-1.5 text-sm transition" style={{ background: on ? m.color : m.bg, color: on ? '#fff' : m.color, borderColor: `${m.color}40` }}>
                <m.icon size={14} />{m.label}
              </button>
            )
          })}
          <span className="mx-1 w-px shrink-0 bg-line" />
          {types.map((t) => {
            const m = typeMeta[t]
            const on = filter === t
            return (
              <button key={t} type="button" onClick={() => setFilter(on ? 'all' : t)} className="chip shrink-0 border px-3 py-1.5 text-sm transition" style={{ background: on ? m.color : '#fff', color: on ? '#fff' : m.color, borderColor: `${m.color}55` }}>
                <m.icon size={14} />{m.label}
              </button>
            )
          })}
          <span className="mx-1 w-px shrink-0 bg-line" />
          {topics
            ? topics.map((t) => (
                <a key={t.slug} href={`#konu-${t.slug}`} className="chip shrink-0 bg-white px-3 py-1.5 text-sm text-ink-soft ring-1 ring-line hover:text-ink">{t.title}</a>
              ))
            : themes.map((t) => (
                <a key={t.slug} href={`#${t.slug}`} className="chip shrink-0 bg-white px-3 py-1.5 text-sm text-ink-soft ring-1 ring-line hover:text-ink">{t.title}</a>
              ))}
        </div>
      </div>

      {!all && <Spinner />}
      {topics ? (
        <div className={`space-y-12 ${all ? '' : 'hidden'}`}>
          {all && topics.map((t) => {
            const filtered = filter !== 'all' || stage !== 'all'
            const list = all
              .filter((a) => inTopic(t, a) && (filter === 'all' || a.type === filter) && (stage === 'all' || a.stage === stage))
              .sort((x, y) => STAGE_ORDER.indexOf(x.stage) - STAGE_ORDER.indexOf(y.stage))
            if (filtered && list.length === 0) return null
            return <TopicSection key={t.slug} topic={t} grade={grade} activities={list} onlyActivities={filtered} />
          })}
        </div>
      ) : (
      <div className={`space-y-10 ${all ? '' : 'hidden'}`}>
        {all && themes.map((t) => {
          const codes = t.outcomes.map((o) => o.code)
          const list = all.filter((a) => a.outcomes.some((c) => codes.includes(c)) && activityTheme(a)?.slug === t.slug && (filter === 'all' || a.type === filter) && (stage === 'all' || a.stage === stage))
          if ((filter !== 'all' || stage !== 'all') && list.length === 0) return null
          return (
            <div key={t.slug} id={t.slug} className="scroll-mt-36">
              <ThemeHeader theme={t} count={list.length} linkTo={`/sinif/${grade}/${t.slug}`} />
              {list.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((a) => <ActivityCard key={a.id} a={a} grade={grade} />)}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-white/60 p-4 text-center text-sm font-bold text-ink-soft ring-1 ring-line">Bu temanın etkinlikleri hazırlanıyor.</p>
              )}
            </div>
          )
        })}
      </div>
      )}
    </section>
  )
}

function Spinner() {
  return (
    <div className="grid h-40 place-items-center">
      <span className="size-9 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
    </div>
  )
}

function SearchResults({ q }: { q: string }) {
  const key = searchKey(q)
  const allActivities = useAllActivities()
  const results = useMemo(() => {
    const words = key.split(' ').filter(Boolean)
    return (allActivities ?? []).filter((a) => {
      const th = activityTheme(a)
      const ocs = a.outcomes.map((c) => outcomeByCode.get(c))
      const hay = searchKey([a.title, a.instructions, th?.title, ...ocs.map((o) => `${o?.short ?? ''} ${o?.title ?? ''}`), ...a.outcomes, typeMeta[a.type].label].join(' '))
      return words.every((w) => hay.includes(w))
    })
  }, [key, allActivities])
  const tools = toolList.filter((t) => searchKey(`${t.name} ${t.description}`).includes(key))
  const games = gameMeta.filter((m) => searchKey(`${m.name} ${m.description} ${Object.values(m.skills).join(' ')} oyun`).includes(key))

  return (
    <section className="mx-auto mt-8 max-w-6xl px-4">
      <h2 className="mb-4 text-xl font-black">“{q}” için {allActivities ? `${results.length + tools.length + games.length} sonuç` : 'aranıyor…'}</h2>
      {(tools.length > 0 || games.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {games.map((m) => (
            <Link key={m.id} to={`/oyun/${m.id}`} className="card flex items-center gap-2 px-3 py-2 font-extrabold hover:shadow-[var(--shadow-lift)]">
              <span aria-hidden>{m.emoji}</span>{m.name}<span className="chip bg-paper text-ink-soft">Oyun</span>
            </Link>
          ))}
          {tools.map((t) => (
            <Link key={t.id} to={`/manipulatif/${t.id}`} className="card flex items-center gap-2 px-3 py-2 font-extrabold hover:shadow-[var(--shadow-lift)]">
              <span aria-hidden>{t.emoji}</span>{t.name}
            </Link>
          ))}
        </div>
      )}
      {!allActivities ? <Spinner /> : results.length === 0 && tools.length === 0 && games.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 font-extrabold">Bir şey bulamadık.</p>
          <p className="text-sm font-semibold text-ink-soft">Farklı bir kelime dene: “toplama”, “kesir”, “simetri”…</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.slice(0, 120).map((a) => <ActivityCard key={a.id} a={a} grade={activityGrade(a)} showTheme />)}
        </div>
      )}
    </section>
  )
}

