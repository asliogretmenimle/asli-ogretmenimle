import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Blocks, Check, ChevronDown, Clock, FlaskConical, Gamepad2, MapPin, Minus, ShieldCheck } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { gradeInfo, grades } from '../data/curriculum'
import { lessonAreas } from '../data/onlineLesson'
import { usePageContent } from '../cms/pageContent'
import { lessonPage } from '../cms/pages/onlineOzelDers'
import { LessonRequestForm } from '../components/LessonRequestForm'

const TOOLS = [
  { to: '/oyunlar', icon: Gamepad2, t: 'Matematik oyunları', d: 'Her sınıfa göre zorlaşan, düşündüren oyunlar.' },
  { to: '/etkilesimler', icon: FlaskConical, t: 'Keşif Atölyesi', d: 'Kur, dene, açıkla: etkileşimli keşif etkinlikleri.' },
  { to: '/manipulatifler', icon: Blocks, t: 'Sanal manipülatifler', d: 'Onluk bloklar, kesir şeritleri, cebir karoları ve daha fazlası.' },
]

/** Sayfadaki başvuru formuna kaydırır */
function FormButton({ children = 'Ücretsiz ön kayıt bırakın', className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <a
      href="#kayit"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('kayit')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        history.replaceState(null, '', '#kayit')
      }}
      className={`btn-primary shadow-[0_4px_0_var(--color-brand-dark)] ${className}`}
    >
      {children}
      <ArrowRight size={18} />
    </a>
  )
}

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-20 sm:mt-16" aria-labelledby={`${id}-baslik`}>
      <h2 id={`${id}-baslik`} className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {desc && <p className="mt-2 max-w-3xl font-semibold text-ink-soft">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function OnlineLesson() {
  usePageTitle('Online Matematik Özel Ders')
  const c = usePageContent(lessonPage)
  const [persona, setPersona] = useState(0)
  const p = c.personas[Math.min(persona, c.personas.length - 1)]
  // Form görünürken mobildeki alt düğme gizlensin
  const [formVisible, setFormVisible] = useState(false)
  useEffect(() => {
    const el = document.getElementById('kayit')
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-24 sm:pt-8 lg:pb-0">
      {/* Giriş */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-soft p-5 sm:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-amber-200/50 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-brand-ink">
              <MapPin size={16} />
              {lessonAreas.join(' · ')} · {c.heroKicker}
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-black tracking-tight text-ink sm:text-5xl">{c.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-base font-semibold text-ink sm:text-lg">{c.heroLead}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <FormButton className="min-h-14 px-6 text-lg">{c.heroCta}</FormButton>
              <a href="#durum" className="btn-ghost">{c.heroSecondary}</a>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-sm font-bold text-brand-ink">
              <ShieldCheck size={18} className="mt-px shrink-0" />
              {c.heroPromise}
            </p>
          </div>
          <figure className="hidden text-center md:block">
            <img src="/asli-400.webp" alt="Aslı Öğretmen" width={200} height={200} className="size-48 rounded-full object-cover ring-8 ring-white lg:size-56" />
            <figcaption className="mt-3 font-black text-ink">Aslı Öğretmen</figcaption>
            <p className="text-sm font-semibold text-ink-soft">Matematik öğretmeni</p>
          </figure>
        </div>
        <ul className="relative mt-6 flex flex-wrap gap-2">
          {c.trust.map((t) => (
            <li key={t} className="chip bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-line">
              <Check size={15} className="text-ok" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Sorun */}
      <Section id="tanidik" title={c.painsTitle} desc={c.painsDesc}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {c.pains.map((t) => (
            <li key={t} className="card flex items-start gap-3 p-4 font-bold">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bad-soft text-bad" aria-hidden>!</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-2xl bg-ok-soft p-4 font-bold text-ink">
          {c.painsGood}
        </p>
      </Section>

      {/* Ziyaretçiye göre yanıt */}
      <Section id="durum" title={c.personasTitle} desc={c.personasDesc}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div role="tablist" aria-label="Durumunuz" aria-orientation="vertical" className="flex flex-col gap-2">
            {c.personas.map((x, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                id={`durum-${i}`}
                aria-selected={i === persona}
                aria-controls="durum-panel"
                onClick={() => {
                  setPersona(i)
                  // Dar ekranda yanıt düğmelerin altında kalır: görünür olsun
                  if (window.innerWidth < 1024) document.getElementById('durum-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left font-bold text-ink-soft ring-1 ring-line transition hover:text-ink aria-selected:bg-ink aria-selected:text-white aria-selected:ring-ink"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper text-sm text-ink">{i + 1}</span>
                {x.label}
              </button>
            ))}
          </div>
          {p && <div id="durum-panel" role="tabpanel" aria-labelledby={`durum-${persona}`} key={persona} className="card animate-fade-up scroll-mt-20 p-5 sm:p-7">
            <h3 className="text-xl font-black sm:text-2xl">{p.title}</h3>
            <p className="mt-3 font-semibold text-ink-soft">{p.body}</p>
            <ul className="mt-4 space-y-2">
              {p.points.map((t) => (
                <li key={t} className="flex items-center gap-2 font-bold">
                  <Check size={18} className="shrink-0 text-ok" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <FormButton>{p.cta}</FormButton>
              {p.moreLabel && (
                <a href={p.moreHref || '#sss'} className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                  {p.moreLabel}
                  <ChevronDown size={16} />
                </a>
              )}
            </div>
          </div>}
        </div>
      </Section>

      {/* Ders seçenekleri */}
      <Section id="secenekler" title={c.formatsTitle} desc={c.formatsDesc}>
        <div className="grid gap-3 md:grid-cols-2">
          {c.formats.map((f) => (
            <div key={f.t} className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl" aria-hidden>{f.e}</span>
                <h3 className="text-xl font-black">{f.t}</h3>
                <span className="chip ml-auto bg-ink px-3 py-1 text-sm text-white">{f.tag}</span>
              </div>
              <p className="mt-3 font-semibold text-ink-soft">{f.d}</p>
              <ul className="mt-4 space-y-2">
                {f.points.map((t) => (
                  <li key={t} className="flex items-center gap-2 font-bold">
                    <Check size={18} className="shrink-0 text-ok" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-paper p-3 text-sm font-semibold text-ink"><strong>Kimler için:</strong> {f.who}</p>
              <FormButton className="mt-5 self-start">{f.t} için ön kayıt</FormButton>
            </div>
          ))}
        </div>
      </Section>

      {/* Başlama süreci */}
      <Section id="nasil" title={c.stepsTitle} desc={c.stepsDesc}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((s, i) => (
            <li key={s.t} className="card relative p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand text-lg font-black text-white">{i + 1}</span>
              <h3 className="mt-3 font-black">{s.t}</h3>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <FormButton>{c.stepsCta}</FormButton>
        </div>
      </Section>

      {/* Bir ders */}
      <Section id="ders" title={c.flowTitle} desc={c.flowDesc}>
        <ol className="grid gap-3 md:grid-cols-5">
          {c.flow.map((f, i) => (
            <li key={f.t} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <span className="text-3xl" aria-hidden>{f.e}</span>
              <h3 className="mt-2 font-black">
                <span className="text-ink-soft">{i + 1}.</span> {f.t}
              </h3>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{f.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Karşılaştırma */}
      <Section id="karsilastir" title={c.compareTitle} desc={c.compareDesc}>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="p-3 sm:p-4"><span className="sr-only">Ölçüt</span></th>
                {(c.compare.cols ?? []).map((col, i) => (
                  <th key={col} scope="col" className={`p-3 font-black sm:p-4 ${i === 0 ? 'bg-brand-soft text-brand-ink' : ''}`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(c.compare.rows ?? []).map((r, ri) => (
                <tr key={r.t} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 font-black sm:p-4">{r.t}</th>
                  {r.v.map((v, ci) => {
                    const good = !!c.compare.good?.[ri]?.includes(ci)
                    return (
                      <td key={ci} className={`p-3 font-semibold sm:p-4 ${ci === 0 ? 'bg-brand-soft/60 text-ink' : 'text-ink-soft'}`}>
                        <span className="flex items-start gap-1.5">
                          {good ? <Check size={16} className="mt-0.5 shrink-0 text-ok" /> : <Minus size={16} className="mt-0.5 shrink-0 text-ink-soft/60" />}
                          {v}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Sınıflar */}
      <Section id="kimler" title={c.levelsTitle}>
        <div className="grid gap-3 md:grid-cols-2">
          {c.levels.map((l) => (
            <div key={l.t} className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
              <h3 className="text-lg font-black">{l.t}</h3>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{l.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Sınıflar">
          {grades.map((g) => (
            <Link key={g} to={`/sinif/${g}`} className="chip bg-white px-3 py-1 text-sm ring-1 ring-line hover:ring-brand" style={{ color: gradeInfo[g].ink }}>
              {gradeInfo[g].label}
            </Link>
          ))}
        </div>
      </Section>

      {/* Kanıt: ücretsiz araçlar */}
      <Section id="deneyin" title={c.toolsTitle} desc={c.toolsDesc}>
        <div className="grid gap-3 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to} className="card group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><t.icon size={22} /></span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-black">{t.t}<ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" /></span>
                <span className="mt-0.5 block text-sm font-semibold text-ink-soft">{t.d}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 font-semibold text-ink-soft">
          {c.toolsNote}
        </p>
      </Section>

      {/* SSS */}
      <Section id="sss" title={c.faqTitle}>
        <div className="space-y-2">
          {c.faq.map((f, i) => (
            <details key={f.q} className="group card p-0" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-extrabold sm:px-5 [&::-webkit-details-marker]:hidden">
                <h3>{f.q}</h3>
                <ChevronDown size={20} className="shrink-0 text-ink-soft transition group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm font-semibold text-ink-soft sm:px-5">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Kayıt */}
      <section id="kayit" className="mt-14 scroll-mt-20 overflow-hidden rounded-3xl bg-ink p-4 text-white sm:mt-16 sm:p-10" aria-labelledby="kayit-baslik">
        <div className="px-1 pt-2 sm:px-0 sm:pt-0">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-300">
            <Clock size={16} />
            {c.signupKicker}
          </p>
          <h2 id="kayit-baslik" className="mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-4xl">{c.signupTitle}</h2>
          <p className="mt-3 max-w-2xl font-semibold text-white/80">{c.signupLead}</p>
          <ul className="mt-5 grid gap-2 font-bold sm:grid-cols-3">
            {c.signupBullets.map((t) => (
              <li key={t} className="flex items-center gap-2"><Check size={18} className="shrink-0 text-amber-300" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="mt-6 sm:mt-8">
          <LessonRequestForm t={c} dark />
        </div>
      </section>

      {/* Mobilde her an görünen kayıt düğmesi */}
      <div className={`fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 p-3 backdrop-blur transition-transform lg:hidden ${formVisible ? 'translate-y-full' : ''}`} aria-hidden={formVisible}>
        <FormButton className="w-full">{c.stickyCta}</FormButton>
      </div>
    </div>
  )
}
