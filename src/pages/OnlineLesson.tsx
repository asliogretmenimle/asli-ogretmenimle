import { Link } from 'react-router-dom'
import { ArrowRight, Blocks, ChevronDown, FlaskConical, Gamepad2, MapPin } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { gradeInfo, grades } from '../data/curriculum'
import { lessonAreas, lessonFaq, lessonHighlights, lessonIntro, lessonLevels } from '../data/onlineLesson'

const TOOLS = [
  { to: '/oyunlar', icon: Gamepad2, t: 'Matematik oyunları', d: 'Her sınıfa göre zorlaşan, düşündüren oyunlar.' },
  { to: '/etkilesimler', icon: FlaskConical, t: 'Keşif Atölyesi', d: 'Kur, dene, açıkla: etkileşimli keşif etkinlikleri.' },
  { to: '/manipulatifler', icon: Blocks, t: 'Sanal manipülatifler', d: 'Onluk bloklar, kesir şeritleri, cebir karoları ve daha fazlası.' },
]

export default function OnlineLesson() {
  usePageTitle('Online Matematik Özel Ders')
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <section className="relative overflow-hidden rounded-3xl bg-brand-soft p-5 sm:p-8">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-amber-200/50 blur-3xl" aria-hidden />
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-brand-ink">
          <MapPin size={16} />
          {lessonAreas.join(' · ')}
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl leading-tight font-black tracking-tight text-ink sm:text-4xl">
          Aslı Öğretmen ile online birebir matematik özel dersi
        </h1>
        <p className="mt-3 max-w-3xl text-base font-semibold text-ink sm:text-lg">{lessonIntro}</p>
        <div className="mt-5 flex flex-wrap gap-1.5" aria-label="Sınıflar">
          {grades.map((g) => (
            <Link key={g} to={`/sinif/${g}`} className="chip bg-white px-3 py-1 text-sm ring-1 ring-line hover:ring-brand" style={{ color: gradeInfo[g].ink }}>
              {gradeInfo[g].label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="neden">
        <h2 id="neden" className="mb-4 text-xl font-black sm:text-2xl">Birebir online ders nasıl işler?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {lessonHighlights.map((h) => (
            <div key={h.t} className="card flex items-start gap-3 p-4 sm:p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-paper text-2xl" aria-hidden>{h.e}</span>
              <div>
                <h3 className="font-black">{h.t}</h3>
                <p className="mt-0.5 text-sm font-semibold text-ink-soft">{h.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="kimler">
        <h2 id="kimler" className="mb-4 text-xl font-black sm:text-2xl">Hangi sınıflar için?</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {lessonLevels.map((l) => (
            <div key={l.t} className="rounded-3xl bg-white p-5 ring-1 ring-line">
              <h3 className="text-lg font-black">{l.t}</h3>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{l.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="araclar">
        <h2 id="araclar" className="text-xl font-black sm:text-2xl">Ders dışında da matematik</h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm font-semibold text-ink-soft">Aslı Öğretmenimle’deki tüm oyun ve etkinlikler ücretsizdir, üyelik gerekmez; telefon, tablet ve bilgisayarda çalışır.</p>
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
      </section>

      <section className="mt-10" aria-labelledby="sss">
        <h2 id="sss" className="mb-4 text-xl font-black sm:text-2xl">Sık sorulan sorular</h2>
        <div className="space-y-2">
          {lessonFaq.map((f, i) => (
            <details key={f.q} className="group card p-0" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-extrabold sm:px-5 [&::-webkit-details-marker]:hidden">
                <h3>{f.q}</h3>
                <ChevronDown size={20} className="shrink-0 text-ink-soft transition group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm font-semibold text-ink-soft sm:px-5">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link to="/" className="btn-primary">Etkinliklere göz at<ArrowRight size={18} /></Link>
      </div>
    </div>
  )
}
