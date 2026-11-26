import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MessageCircleQuestion, Play, Sprout } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { stageMeta } from '../components/meta'
import { STAGE_ORDER } from '../data/activityStore'
import { usePageContent } from '../cms/pageContent'
import { approachPage } from '../cms/pages/yaklasim'

/** Etkinlik adımlarının simge ve renkleri (metinler panelden, sırayla) */
const STEP_STYLES = [
  { icon: Sprout, c: '#a16207', bg: '#fef3c7' },
  { icon: Play, c: '#d6457a', bg: '#fde8ef' },
  { icon: MessageCircleQuestion, c: '#7e22ce', bg: '#f3e8ff' },
]

type Card = { e?: string; t?: string; d?: string }

/** Panelden gelen metin: boşsa varsayılan, {n} → değer */
const fill = (t: unknown, fallback: string, vars: Record<string, string | number> = {}) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), typeof t === 'string' && t.trim() ? t : fallback)
const cards = (v: unknown, fallback: Card[]): Card[] => (Array.isArray(v) && v.length ? (v as Card[]).filter((x) => x && typeof x === 'object' && (x.t || x.d)) : fallback)
const items = (v: unknown, fallback: string[]): string[] => (Array.isArray(v) && v.length ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : fallback)

/** *yıldız arası* → italik */
function Emph({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

export default function Approach() {
  usePageTitle('Yaklaşımımız')
  const c = usePageContent(approachPage)
  const d = approachPage.defaults
  const steps = cards(c.steps, d.steps)
  const principles = cards(c.principles, d.principles)
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <p className="chip bg-cream px-3 py-1 text-sm text-amber-800">{fill(c.kicker, d.kicker)}</p>
      <h1 className="mt-3 text-3xl leading-tight font-black sm:text-4xl">{fill(c.title, d.title)}</h1>
      <p className="mt-3 max-w-3xl text-lg font-semibold text-ink-soft">
        <Emph text={fill(c.intro, d.intro)} />
      </p>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black">{fill(c.stepsHeading, d.stepsHeading)}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => {
            const st = STEP_STYLES[i % STEP_STYLES.length]
            return (
              <div key={i} className="card p-5">
                <span className="grid size-11 place-items-center rounded-2xl" style={{ background: st.bg, color: st.c }}><st.icon size={22} /></span>
                <p className="mt-3 text-lg font-black">{s.t}</p>
                <p className="mt-1 text-sm font-semibold text-ink-soft">{s.d}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black">{fill(c.pathHeading, d.pathHeading)}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {STAGE_ORDER.map((st, i) => {
            const m = stageMeta[st]
            return (
              <div key={st} className="relative rounded-3xl p-5" style={{ background: m.bg }}>
                <span className="text-sm font-black" style={{ color: m.color }}>{fill(c.stepLabel, d.stepLabel, { n: i + 1 })}</span>
                <p className="mt-1 flex items-center gap-2 text-lg font-black" style={{ color: m.color }}><m.icon size={20} />{m.label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{m.desc}</p>
                {i < 3 && <ChevronRight className="absolute top-1/2 -right-3 hidden -translate-y-1/2 text-ink-soft sm:block" />}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-soft">{fill(c.pathNote, d.pathNote)}</p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black">{fill(c.principlesHeading, d.principlesHeading)}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {principles.map((p, i) => (
            <div key={i} className="card flex items-start gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper text-2xl" aria-hidden>{p.e}</span>
              <div>
                <p className="font-black">{p.t}</p>
                <p className="text-sm font-semibold text-ink-soft">{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-lg font-black">{fill(c.parentsHeading, d.parentsHeading)}</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
            {items(c.parentTips, d.parentTips).map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-lg font-black">{fill(c.teachersHeading, d.teachersHeading)}</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
            {items(c.teacherTips, d.teacherTips).map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link to="/" className="btn-primary">{fill(c.ctaLabel, d.ctaLabel)}</Link>
      </div>
    </div>
  )
}
