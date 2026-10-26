import { Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, Lightbulb, MessageCircleQuestion, Play, RotateCcw, Sparkles } from 'lucide-react'
import { gradeInfo, grades, isGrade } from '../data/curriculum'
import type { Grade } from '../data/types'
import { gameMeta, gameMetaById, gamesForGrade, type GameId, type GameMeta } from '../games/meta'
import { games } from '../games/registry'
import type { GameResult } from '../games/kit'
import { ShareButton } from '../components/ShareButton'
import { MathText } from '../components/MathText'
import { SoundToggle, usePageTitle } from '../components/Layout'
import { celebrate, sfx } from '../lib/feedback'
import { SessionTracker } from '../lib/report'
import { TrackerProvider } from '../lib/trackerContext'
import { SendReport } from '../components/SendReport'
import NotFound from './NotFound'

const GRADE_KEY = 'ao-grade'

function storedGrade(): number {
  try {
    return Number(localStorage.getItem(GRADE_KEY))
  } catch {
    return 0
  }
}

const bestKey = (id: GameId, g: Grade) => `ao-game-${id}-${g}`
function readBest(id: GameId, g: Grade): { stars: number; score: number } | null {
  try {
    const raw = localStorage.getItem(bestKey(id, g))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function saveBest(id: GameId, g: Grade, r: GameResult) {
  try {
    const old = readBest(id, g)
    if (!old || r.score > old.score) localStorage.setItem(bestKey(id, g), JSON.stringify({ stars: Math.max(r.stars, old?.stars ?? 0), score: r.score }))
  } catch {
    /* depolama yok */
  }
}

export function GameCard({ m, grade }: { m: GameMeta; grade?: Grade }) {
  const to = `/oyun/${m.id}${grade ? `?sinif=${grade}` : ''}`
  return (
    <Link to={to} className="card group relative flex items-start gap-4 overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: m.color }} aria-hidden />
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-3xl transition group-hover:scale-110 group-hover:-rotate-6" style={{ background: `${m.color}18` }} aria-hidden>{m.emoji}</span>
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-black">{m.name}</span>
        <span className="mt-1 block text-sm font-semibold text-ink-soft">{grade && m.skills[grade] ? m.skills[grade] : m.description}</span>
        <span className="mt-2 flex flex-wrap gap-1">
          {grade ? (
            <span className="chip" style={{ background: gradeInfo[grade].soft, color: gradeInfo[grade].ink }}>{gradeInfo[grade].label}</span>
          ) : (
            <span className="chip bg-paper text-ink-soft">{m.grades.length === 1 ? m.grades[0] : `${m.grades[0]}–${m.grades[m.grades.length - 1]}`}. sınıf</span>
          )}
        </span>
      </span>
    </Link>
  )
}

export function GamesIndex() {
  usePageTitle('Oyunlar')
  const [params, setParams] = useSearchParams()
  const fromUrl = Number(params.get('sinif'))
  const [stored] = useState(storedGrade)
  const grade: Grade | null = isGrade(fromUrl) ? fromUrl : params.has('sinif') ? null : isGrade(stored) ? stored : null
  const list = grade ? gamesForGrade(grade) : gameMeta

  const choose = (g: Grade | null) => {
    const p = new URLSearchParams(params)
    p.set('sinif', g ? String(g) : 'hepsi')
    setParams(p, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl font-black sm:text-4xl">Matematik Oyunları <span aria-hidden>🎮</span></h1>
      <p className="mt-2 max-w-2xl font-semibold text-ink-soft">Köprü kur, kurabiye diz, şehir tasarla, gizemleri çöz… Her oyun seçtiğin sınıfa göre değişir; amaç hız değil, düşünmek ve farklı yollar keşfetmek.</p>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button type="button" onClick={() => choose(null)} className={`chip shrink-0 px-3 py-1.5 text-sm ${!grade ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line'}`}>Tüm oyunlar</button>
        {grades.map((g) => (
          <button key={g} type="button" onClick={() => choose(g)} aria-pressed={grade === g} className="chip shrink-0 border px-3 py-1.5 text-sm transition" style={{ background: grade === g ? gradeInfo[g].color : '#fff', color: grade === g ? '#fff' : gradeInfo[g].ink, borderColor: `${gradeInfo[g].color}55` }}>
            {gradeInfo[g].emoji} {gradeInfo[g].label}
          </button>
        ))}
      </div>
      {list.some((m) => m.nextGen) && (
        <section className="mt-6">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-black"><Sparkles size={20} className="text-amber-500" />Keşfet ve inşa et</h2>
          <p className="mb-3 text-sm font-semibold text-ink-soft">Tek doğru cevaba tıklamak yok: kur, dene, farklı yollar bul, nedenini açıkla.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.filter((m) => m.nextGen).map((m) => <GameCard key={m.id} m={m} grade={grade ?? undefined} />)}
          </div>
        </section>
      )}
      {list.some((m) => !m.nextGen) && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-black">Strateji oyunları</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.filter((m) => !m.nextGen).map((m) => <GameCard key={m.id} m={m} grade={grade ?? undefined} />)}
          </div>
        </section>
      )}
    </div>
  )
}

export function GamePage() {
  const { id = '' } = useParams()
  const m = gameMetaById[id as GameId]
  usePageTitle(m ? m.name : 'Bulunamadı')
  if (!m) return <NotFound />
  return <GameView key={m.id} m={m} />
}

type Phase = 'intro' | 'play' | 'done'

function GameView({ m }: { m: GameMeta }) {
  const [params, setParams] = useSearchParams()
  const fromUrl = Number(params.get('sinif'))
  const [stored] = useState(storedGrade)
  const grade: Grade = isGrade(fromUrl) && m.grades.includes(fromUrl) ? fromUrl : isGrade(stored) && m.grades.includes(stored) ? stored : m.grades[0]
  const info = gradeInfo[grade]
  const [phase, setPhase] = useState<Phase>('intro')
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const [best, setBest] = useState(() => readBest(m.id, grade))
  const Game = games[m.id]
  const tracker = useMemo(() => new SessionTracker(m.id, m.name, 'oyun', grade), [m.id, m.name, grade, run])

  useEffect(() => setBest(readBest(m.id, grade)), [m.id, grade, result])

  const setGrade = (g: Grade) => {
    const p = new URLSearchParams(params)
    p.set('sinif', String(g))
    setParams(p, { replace: true })
    setPhase('intro')
  }

  const finish = (r: GameResult) => {
    const old = readBest(m.id, grade)
    saveBest(m.id, grade, r)
    setResult({ ...r, summary:r.summary + (old && r.score > old.score ? ' · Yeni rekor!' : '') })
    setPhase('done')
    sfx.win()
    if (r.stars >= 2) celebrate(true)
  }

  const start = () => {
    setResult(null)
    setRun((x) => x + 1)
    setPhase('play')
  }

  const others = gamesForGrade(grade).filter((x) => x.id !== m.id).slice(0, 3)

  return (
    <div className="flex min-h-dvh flex-col" style={{ ['--grade' as string]: info.color }}>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 sm:h-16 sm:px-4">
          <Link to={`/oyunlar?sinif=${grade}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-white" aria-label="Oyunlara dön">
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-extrabold sm:text-xs" style={{ color: info.ink }}>Oyunlar · {info.label}</p>
            <h1 className="truncate text-base leading-tight font-black sm:text-lg"><span aria-hidden>{m.emoji}</span> {m.name}</h1>
          </div>
          <ShareButton title={m.name} className="max-sm:[&>span]:hidden" />
          <SoundToggle />
        </div>
      </header>

      <main className={`mx-auto flex w-full flex-1 flex-col px-3 pt-4 pb-8 sm:px-4 ${m.nextGen && phase === 'play' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {phase === 'intro' && (
          <div className="flex flex-1 flex-col items-center justify-center py-4 animate-fade-up">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-center shadow-[var(--shadow-card)] ring-1 ring-line sm:p-8">
              <span className="mx-auto grid size-20 place-items-center rounded-3xl text-5xl" style={{ background: `${m.color}18` }} aria-hidden>{m.emoji}</span>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">{m.name}</h2>
              <p className="mt-1 font-semibold text-ink-soft">{m.description}</p>
              {m.launch && (
                <div className="mx-auto mt-4 max-w-xl rounded-2xl bg-cream p-4 text-left">
                  <p className="mb-1 text-xs font-black tracking-wide text-amber-800 uppercase">🌱 Başlarken</p>
                  <p className="text-lg leading-relaxed font-extrabold text-ink"><MathText text={m.launch} /></p>
                </div>
              )}

              {m.grades.length > 1 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Sınıfını seç</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {m.grades.map((g) => (
                      <button key={g} type="button" onClick={() => setGrade(g)} aria-pressed={g === grade} className="grid size-11 place-items-center rounded-xl border-2 text-lg font-black transition" style={{ background: g === grade ? gradeInfo[g].color : '#fff', color: g === grade ? '#fff' : gradeInfo[g].ink, borderColor: g === grade ? gradeInfo[g].color : `${gradeInfo[g].color}55` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {m.skills[grade] && (
                <p className="mt-4 inline-block rounded-2xl px-4 py-2 text-sm font-extrabold" style={{ background: info.soft, color: info.ink }}>
                  {info.label}: {m.skills[grade]}
                </p>
              )}

              <ol className="mx-auto mt-5 max-w-md space-y-2 text-left">
                {m.howTo.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 font-bold">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: m.color }}>{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              {best && <p className="mt-4 text-sm font-extrabold text-amber-700">En iyi skorun: {best.score} {'⭐'.repeat(best.stars)}</p>}
              <button type="button" onClick={start} className="btn-primary mt-6 min-w-56 text-lg" autoFocus>
                <Play size={20} fill="currentColor" />Oyuna başla!
              </button>
            </div>
          </div>
        )}

        {phase === 'play' && (
          <div className="flex-1">
            <Suspense fallback={<div className="grid h-60 place-items-center"><span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" /></div>}>
              <TrackerProvider tracker={tracker}>
                <Game key={`${run}-${grade}`} grade={grade} onFinish={finish} />
              </TrackerProvider>
            </Suspense>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="flex flex-1 flex-col items-center py-6 text-center animate-fade-up">
            <div className="flex items-end gap-1.5" aria-label={`${result.stars} yıldız`}>
              {[1, 2, 3].map((s) => (
                <svg key={s} viewBox="0 0 24 24" className={`${s === 2 ? 'size-16 sm:size-20' : 'size-12 sm:size-14'} animate-pop drop-shadow`} style={{ animationDelay: `${s * 120}ms` }}>
                  <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill={s <= result.stars ? '#facc15' : '#e5e7eb'} stroke={s <= result.stars ? '#eab308' : '#d1d5db'} strokeWidth={1} strokeLinejoin="round" />
                </svg>
              ))}
            </div>
            <h2 className="mt-3 text-3xl font-black">{result.stars === 3 ? 'Muhteşem!' : result.stars === 2 ? 'Çok iyi!' : 'Güzel çaba!'}</h2>
            <p className="mt-1 text-lg font-bold text-ink-soft">{result.summary}</p>
            {!m.nextGen && <p className="mt-1 text-sm font-extrabold text-amber-700">Puan: {result.score}{best ? ` · En iyi: ${best.score}` : ''}</p>}
            {result.insight && (
              <div className="mt-6 flex w-full max-w-2xl items-start gap-2 rounded-3xl bg-brand-soft p-5 text-left ring-1 ring-brand/20">
                <Lightbulb size={20} className="mt-0.5 shrink-0 text-brand-ink" />
                <p className="font-extrabold text-ink"><MathText text={result.insight} /></p>
              </div>
            )}
            {m.reflect && (
              <div className="mt-4 w-full max-w-2xl rounded-3xl bg-white p-5 text-left ring-1 ring-line">
                <p className="mb-1 flex items-center gap-2 text-sm font-black tracking-wide text-brand-ink uppercase"><MessageCircleQuestion size={18} />Düşün ve Paylaş</p>
                <p className="text-lg font-extrabold text-ink"><MathText text={m.reflect} /></p>
              </div>
            )}
            <div className="mt-5 flex w-full justify-center">
              <SendReport tracker={tracker} reflectQ={m.reflect} compact />
            </div>
            <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <button type="button" onClick={start} className="btn-primary flex-1" autoFocus><RotateCcw size={18} />{m.nextGen ? 'Başka bir yolla dene' : 'Tekrar oyna'}</button>
              <Link to={`/oyunlar?sinif=${grade}`} className="btn-ghost flex-1"><LayoutGrid size={18} />Tüm oyunlar</Link>
            </div>
            {others.length > 0 && (
              <div className="mt-10 w-full text-left">
                <p className="mb-3 text-center text-sm font-extrabold text-ink-soft">Bunları da dene</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {others.map((o) => <GameCard key={o.id} m={o} grade={grade} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
