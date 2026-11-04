import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Blocks, Check, ChevronDown, Clock, FlaskConical, Gamepad2, MapPin, Minus, ShieldCheck } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { gradeInfo, grades } from '../data/curriculum'
import {
  LESSON_FORM_URL, lessonAreas, lessonCompare, lessonFaq, lessonFlow, lessonHero, lessonLevels, lessonPains, lessonPersonas, lessonSteps, lessonTrust,
} from '../data/onlineLesson'

const TOOLS = [
  { to: '/oyunlar', icon: Gamepad2, t: 'Matematik oyunları', d: 'Her sınıfa göre zorlaşan, düşündüren oyunlar.' },
  { to: '/etkilesimler', icon: FlaskConical, t: 'Keşif Atölyesi', d: 'Kur, dene, açıkla: etkileşimli keşif etkinlikleri.' },
  { to: '/manipulatifler', icon: Blocks, t: 'Sanal manipülatifler', d: 'Onluk bloklar, kesir şeritleri, cebir karoları ve daha fazlası.' },
]

// Tam Google Form adresi verildiyse form sayfaya gömülür; kısa linkler gömülemez
const embedUrl = LESSON_FORM_URL.includes('docs.google.com/forms')
  ? `${LESSON_FORM_URL.split('?')[0].replace(/\/(viewform|edit)?$/, '')}/viewform?embedded=true`
  : null

function FormButton({ children = 'Ücretsiz ön kayıt bırakın', className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <a href={LESSON_FORM_URL} target="_blank" rel="noopener" className={`btn-primary shadow-[0_4px_0_var(--color-brand-dark)] ${className}`}>
      {children}
      <ArrowRight size={18} />
    </a>
  )
}

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
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
  const [persona, setPersona] = useState(0)
  const p = lessonPersonas[persona]

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-24 sm:pt-8 lg:pb-0">
      {/* Giriş */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-soft p-5 sm:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-amber-200/50 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-brand-ink">
              <MapPin size={16} />
              {lessonAreas.join(' · ')} · {lessonHero.kicker}
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-black tracking-tight text-ink sm:text-5xl">{lessonHero.title}</h1>
            <p className="mt-4 max-w-2xl text-base font-semibold text-ink sm:text-lg">{lessonHero.lead}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <FormButton className="min-h-14 px-6 text-lg" />
              <a href="#durum" className="btn-ghost">Önce bilgi almak istiyorum</a>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-sm font-bold text-brand-ink">
              <ShieldCheck size={18} className="mt-px shrink-0" />
              {lessonHero.promise}
            </p>
          </div>
          <figure className="hidden text-center md:block">
            <img src="/asli-400.webp" alt="Aslı Öğretmen" width={200} height={200} className="size-48 rounded-full object-cover ring-8 ring-white lg:size-56" />
            <figcaption className="mt-3 font-black text-ink">Aslı Öğretmen</figcaption>
            <p className="text-sm font-semibold text-ink-soft">Matematik öğretmeni</p>
          </figure>
        </div>
        <ul className="relative mt-6 flex flex-wrap gap-2">
          {lessonTrust.map((t) => (
            <li key={t} className="chip bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-line">
              <Check size={15} className="text-ok" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Sorun */}
      <Section id="tanidik" title="Bu cümleler size tanıdık geliyor mu?" desc="Bunlardan biri bile evinizde yaşanıyorsa, çocuğunuz matematikte “yeteneksiz” değildir; sadece ona uygun anlatımla henüz karşılaşmamıştır.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {lessonPains.map((t) => (
            <li key={t} className="card flex items-start gap-3 p-4 font-bold">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bad-soft text-bad" aria-hidden>!</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-2xl bg-ok-soft p-4 font-bold text-ink">
          İyi haber: bunların hepsi, doğru yöntem ve birebir ilgiyle düzelir. Birebir derste çocuk kalabalığın içinde kaybolmaz; nerede takıldığı bulunur ve tam oradan başlanır.
        </p>
      </Section>

      {/* Ziyaretçiye göre yanıt */}
      <Section id="durum" title="Size en yakın durumu seçin" desc="Her velinin aklındaki soru farklı. Size uyanı seçin, kısa ve dürüst bir yanıt alın.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div role="tablist" aria-label="Durumunuz" aria-orientation="vertical" className="flex flex-col gap-2">
            {lessonPersonas.map((x, i) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                id={`durum-${x.id}`}
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
          <div id="durum-panel" role="tabpanel" aria-labelledby={`durum-${p.id}`} key={p.id} className="card animate-fade-up scroll-mt-20 p-5 sm:p-7">
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
              <a href={p.more.href} className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                {p.more.label}
                <ChevronDown size={16} />
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Başlama süreci */}
      <Section id="nasil" title="4 adımda başlıyoruz" desc="Hiçbir şeyi bilmeniz ya da hazırlamanız gerekmiyor. İlk adım sadece bir form.">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lessonSteps.map((s, i) => (
            <li key={s.t} className="card relative p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand text-lg font-black text-white">{i + 1}</span>
              <h3 className="mt-3 font-black">{s.t}</h3>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <FormButton>1. adımı şimdi atın</FormButton>
        </div>
      </Section>

      {/* Bir ders */}
      <Section id="ders" title="Bir ders nasıl geçer?" desc="Çocuğunuz ekranı izleyen değil, ekranda düşünen, kuran ve açıklayan kişidir.">
        <ol className="grid gap-3 md:grid-cols-5">
          {lessonFlow.map((f, i) => (
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
      <Section id="karsilastir" title="Neden birebir online ders?" desc="Kurs, etüt ya da tek başına çalışmayla yan yana koyduğunuzda fark kendini gösteriyor.">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="p-3 sm:p-4"><span className="sr-only">Ölçüt</span></th>
                {lessonCompare.cols.map((c, i) => (
                  <th key={c} scope="col" className={`p-3 font-black sm:p-4 ${i === 0 ? 'bg-brand-soft text-brand-ink' : ''}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessonCompare.rows.map((r, ri) => (
                <tr key={r.t} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 font-black sm:p-4">{r.t}</th>
                  {r.v.map((v, ci) => {
                    const good = lessonCompare.good[ri].includes(ci)
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
      <Section id="kimler" title="Hangi sınıflar için?">
        <div className="grid gap-3 md:grid-cols-2">
          {lessonLevels.map((l) => (
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
      <Section id="deneyin" title="Söze değil, yönteme bakın" desc="Derslerde kullanılan yaklaşım bu sitede herkese açık. Çocuğunuzla birkaç etkinliği birlikte deneyin; üyelik yok, ücret yok.">
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
          Beğendiyseniz şunu bilin: birebir derste bu araçlar, çocuğunuzun eksiklerine göre seçilir ve öğretmen eşliğinde kullanılır.
        </p>
      </Section>

      {/* SSS */}
      <Section id="sss" title="Aklınızdaki sorular">
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
      </Section>

      {/* Kayıt */}
      <section id="kayit" className="mt-14 scroll-mt-20 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:mt-16 sm:p-10" aria-labelledby="kayit-baslik">
        <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-300">
          <Clock size={16} />
          Birebir ders saatleri sınırlıdır
        </p>
        <h2 id="kayit-baslik" className="mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-4xl">Bir dönem daha “belki düzelir” diye beklemeyin.</h2>
        <p className="mt-3 max-w-2xl font-semibold text-white/80">
          Matematikte bugün kapanmayan eksik, gelecek yılın konusunu da zorlaştırır. Formu doldurun; Aslı Öğretmen sizi arasın, çocuğunuzun ihtiyacını birlikte konuşalım. Sonrasında karar tamamen sizin.
        </p>
        <ul className="mt-5 grid gap-2 font-bold sm:grid-cols-3">
          {['1 dakikalık form', 'Ücretsiz, yükümlülüksüz', 'Size dönüş yapılır'].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check size={18} className="shrink-0 text-amber-300" />{t}</li>
          ))}
        </ul>
        <FormButton className="mt-6 min-h-14 px-6 text-lg shadow-none">Ön kayıt formunu doldur</FormButton>
        {embedUrl && (
          <iframe src={embedUrl} title="Ön kayıt formu" loading="lazy" className="mt-8 h-[900px] w-full rounded-2xl bg-white">Yükleniyor…</iframe>
        )}
      </section>

      {/* Mobilde her an görünen kayıt düğmesi */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
        <FormButton className="w-full">Ücretsiz ön kayıt bırakın</FormButton>
      </div>
    </div>
  )
}
