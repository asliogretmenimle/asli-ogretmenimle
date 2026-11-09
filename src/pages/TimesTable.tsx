import { Suspense, lazy, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Gamepad2, Play, Printer, RotateCcw } from 'lucide-react'
import type { QuizActivity, QuizQuestion } from '../data/types'
import { usePageTitle } from '../components/Layout'
import { ShareButton } from '../components/ShareButton'
import { GUIDES_PATH, timesFamily } from '../lib/seo'
import { pick, randInt, shuffle } from '../lib/random'
import { celebrate, sfx } from '../lib/feedback'

const Quiz = lazy(() => import('../engine/Quiz'))
const N = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** Bilinen bir çarpımdan yola çıkan kısa strateji: ezber yerine ilişki */
function strategy(x: number, y: number): string {
  const r = x * y
  if (x === 10 || y === 10) return `${x} × ${y} = ${r}: 10 ile çarpınca sayının sonuna 0 eklenir.`
  const other = (k: number) => (x === k ? y : x)
  if (x === 9 || y === 9) return `${x} × ${y} = ${r}: önce 10 × ${other(9)} = ${10 * other(9)}, sonra bir grup çıkar: ${10 * other(9)} − ${other(9)} = ${r}.`
  if (x === 5 || y === 5) return `${x} × ${y} = ${r}: 10 × ${other(5)} = ${10 * other(5)} ve bunun yarısı ${r}.`
  if (x === 2 || y === 2) return `${x} × ${y} = ${r}: iki katı demek, ${other(2)} + ${other(2)} = ${r}.`
  if (x === 4 || y === 4) return `${x} × ${y} = ${r}: 2 × ${other(4)} = ${2 * other(4)}, iki katına çıkar: ${2 * other(4)} + ${2 * other(4)} = ${r}.`
  if (x === 3 || y === 3) return `${x} × ${y} = ${r}: 2 × ${other(3)} = ${2 * other(3)}, bir grup daha ekle: ${2 * other(3)} + ${other(3)} = ${r}.`
  // 6, 7, 8: 5'lerden yola çık
  return `${x} × ${y} = ${r}: 5 × ${y} = ${5 * y}, üstüne ${x - 5} × ${y} = ${(x - 5) * y} ekle: ${5 * y} + ${(x - 5) * y} = ${r}.`
}

/** Çarpım tablosu soruları; çeldiriciler tipik hatalardan: bir grup fazla/eksik, toplama yapmak, onluk kayması */
function makeQuestions(tables: number[], count: number): QuizQuestion[] {
  const seen = new Set<string>()
  const out: QuizQuestion[] = []
  for (let guard = 0; out.length < count && guard < 500; guard++) {
    const a = pick(tables)
    const b = randInt(2, 10)
    const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a]
    if (seen.has(`${x}×${y}`)) continue
    seen.add(`${x}×${y}`)
    const r = x * y
    const wrong: [number, string][] = shuffle<[number, string]>([
      [x * (y + 1), `Bu ${x} × ${y + 1}: bir grup fazla saydın.`],
      [x * (y - 1), `Bu ${x} × ${y - 1}: bir grup eksik saydın.`],
      [(x + 1) * y, `Bu ${x + 1} × ${y}: bir grup fazla saydın.`],
      [(x - 1) * y, `Bu ${x - 1} × ${y}: bir grup eksik saydın.`],
      [x + y, `Bu ${x} + ${y}: topladın. Çarpma “${x} tane ${y}” demek.`],      [r + 10, 'Onlukları bir daha say.'],
    ])
    const ds: [number, string][] = []
    for (const w of wrong) if (w[0] > 0 && w[0] !== r && !ds.some((d) => d[0] === w[0]) && ds.length < 3) ds.push(w)
    out.push({
      prompt: `${x} × ${y} = ?`,
      choices: [String(r), ...ds.map((d) => String(d[0]))],
      answer: 0,
      feedback: [null, ...ds.map((d) => d[1])],
      explain: strategy(x, y),
    })
  }
  return out
}

export default function TimesTable() {
  usePageTitle()
  const [sel, setSel] = useState<{ a: number; b: number } | null>({ a: 7, b: 8 })
  const [hidden, setHidden] = useState(false)
  const [shown, setShown] = useState<Set<string>>(new Set())
  const [family, setFamily] = useState(7)
  const [tables, setTables] = useState<number[]>([6, 7, 8, 9])
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null)

  const activity = useMemo<QuizActivity | null>(
    () =>
      run === 0
        ? null
        : {
            id: 'carpim-tablosu',
            type: 'quiz',
            outcomes: [],
            title: 'Çarpım tablosu alıştırması',
            instructions: 'Doğru sonucu seç.',
            stage: 'sembol',
            launch: { text: '' },
            reflect: '',
            questions: makeQuestions(tables.length ? tables : N.slice(1), 10),
          },
    [run, tables],
  )

  const tap = (a: number, b: number) => {
    setSel({ a, b })
    setFamily(a)
    if (hidden) setShown((s) => new Set(s).add(`${a}×${b}`))
  }
  const toggleTable = (n: number) => setTables((t) => (t.includes(n) ? t.filter((x) => x !== n) : [...t, n].sort((x, y) => x - y)))
  const start = () => {
    setResult(null)
    setRun((r) => r + 1)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <div className="mb-5 flex items-center justify-between gap-2 print:hidden">
        <p className="chip bg-cream px-3 py-1 text-sm text-amber-800">2–4. sınıf matematik</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="btn-ghost min-h-10 px-3 text-sm"><Printer size={16} />Yazdır</button>
          <ShareButton title="Çarpım Tablosu" />
        </div>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Çarpım Tablosu (1–10)</h1>
        <p className="mt-2 max-w-2xl font-semibold text-ink-soft print:hidden">
          Bir kutuya dokun: satırı ve sütunu birlikte görürsün. Kendini sınamak için sonuçları gizle, sonra aşağıdaki alıştırmayı çöz.
        </p>
      </header>

      <section aria-label="Çarpım tablosu" className="rounded-3xl bg-white p-3 ring-1 ring-line sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <p className="text-2xl font-black text-ink" aria-live="polite">
            {sel ? <>{sel.a} × {sel.b} = <span className="text-brand">{hidden && !shown.has(`${sel.a}×${sel.b}`) ? '?' : sel.a * sel.b}</span></> : 'Bir kutu seç'}
          </p>
          <button type="button" onClick={() => { setHidden((h) => !h); setShown(new Set()) }} className="btn-ghost min-h-10 px-3 text-sm" aria-pressed={hidden}>
            {hidden ? <><Eye size={16} />Sonuçları göster</> : <><EyeOff size={16} />Sonuçları gizle</>}
          </button>
        </div>
        <table className="w-full table-fixed border-separate border-spacing-0.5 text-center text-sm font-extrabold tabular-nums sm:border-spacing-1 sm:text-base">
          <caption className="sr-only">1’den 10’a kadar çarpım tablosu</caption>
          <thead>
            <tr>
              <th className="rounded-lg bg-ink py-1.5 text-white sm:py-2" aria-label="Çarpım">×</th>
              {N.map((b) => (
                <th key={b} scope="col" className={`rounded-lg py-1.5 sm:py-2 ${sel?.b === b ? 'bg-brand text-white' : 'bg-paper text-ink'}`}>{b}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {N.map((a) => (
              <tr key={a}>
                <th scope="row" className={`rounded-lg py-1.5 sm:py-2 ${sel?.a === a ? 'bg-brand text-white' : 'bg-paper text-ink'}`}>{a}</th>
                {N.map((b) => {
                  const on = sel?.a === a && sel?.b === b
                  const line = sel && (sel.a === a || sel.b === b) && (b <= sel.b && a <= sel.a)
                  const masked = hidden && !shown.has(`${a}×${b}`)
                  return (
                    <td key={b} className="p-0">
                      <button
                        type="button"
                        onClick={() => tap(a, b)}
                        aria-label={`${a} çarpı ${b}${masked ? '' : ` eşittir ${a * b}`}`}
                        className={`h-8 w-full rounded-lg transition sm:h-10 ${on ? 'bg-brand text-white shadow' : line ? 'bg-brand-soft text-ink' : a === b ? 'bg-cream text-ink' : 'text-ink hover:bg-paper'}`}
                      >
                        {masked ? <span className="text-ink-soft/40">·</span> : a * b}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 print:hidden" aria-labelledby="aile">
        <h2 id="aile" className="text-xl font-black sm:text-2xl">{timesFamily(family)} çarpım tablosu</h2>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Sayı seç">
          {N.map((n) => (
            <button key={n} type="button" className="pill min-w-11 justify-center" aria-pressed={family === n} onClick={() => setFamily(n)}>{n}</button>
          ))}
        </div>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {N.map((b) => (
            <li key={b} className="rounded-2xl bg-white p-3 text-center text-lg font-extrabold tabular-nums ring-1 ring-line">
              {family} × {b} = <span className="text-brand">{family * b}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-7 print:hidden" aria-labelledby="alistirma">
        <h2 id="alistirma" className="text-xl font-black sm:text-2xl">Çarpım tablosu alıştırması</h2>
        {!activity ? (
          <>
            <p className="mt-1 font-semibold text-ink-soft">Çalışmak istediğin sayıları seç; 10 soruluk alıştırma bu sayılardan gelir. Yanlışta hangi hatayı yaptığını ve kısa yolu görürsün.</p>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Alıştırma sayıları">
              {N.slice(1).map((n) => (
                <button key={n} type="button" className="pill min-w-11 justify-center" aria-pressed={tables.includes(n)} onClick={() => toggleTable(n)}>{timesFamily(n)}</button>
              ))}
            </div>
            <button type="button" onClick={start} className="btn-primary mt-5 min-w-56 text-lg"><Play size={20} fill="currentColor" />Alıştırmaya başla</button>
          </>
        ) : result ? (
          <div className="mt-4 text-center animate-fade-up">
            <p className="text-5xl font-black text-brand">{result.correct}<span className="text-2xl text-ink-soft"> / {result.total}</span></p>
            <p className="mt-2 font-bold text-ink-soft">{result.correct >= 9 ? 'Muhteşem! Bu sayılar artık senin.' : result.correct >= 6 ? 'Çok iyi! Zorlandıklarını bir kez daha dene.' : 'Güzel çaba! Tablodan zorlandığın satıra bak, sonra tekrar dene.'}</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <button type="button" onClick={start} className="btn-primary"><RotateCcw size={18} />Yeni sorular</button>
              <button type="button" onClick={() => { setRun(0); setResult(null) }} className="btn-ghost">Sayıları değiştir</button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Suspense fallback={<div className="h-40" />}>
              <Quiz
                key={run}
                activity={activity}
                onProgress={() => {}}
                onFinish={(correct, total) => {
                  setResult({ correct, total })
                  sfx.win()
                  if (correct / Math.max(1, total) >= 0.6) celebrate(true)
                }}
              />
            </Suspense>
          </div>
        )}
      </section>

      <nav className="mt-8 grid gap-3 sm:grid-cols-3 print:hidden" aria-label="İlgili sayfalar">
        <Link to={`${GUIDES_PATH}/carpim-tablosu`} className="card flex items-center gap-3 p-4 transition hover:shadow-[var(--shadow-lift)]"><BookOpen size={22} className="text-brand" /><span className="font-extrabold">Çarpım tablosu nasıl ezberlenir?</span></Link>
        <Link to="/oyun/kurabiye-fabrikasi" className="card flex items-center gap-3 p-4 transition hover:shadow-[var(--shadow-lift)]"><Gamepad2 size={22} className="text-brand" /><span className="font-extrabold">Çarpma oyunu: Kurabiye Fabrikası</span></Link>
        <Link to="/manipulatif/dizilim" className="card flex items-center gap-3 p-4 transition hover:shadow-[var(--shadow-lift)]"><span aria-hidden className="text-xl">▦</span><span className="font-extrabold">Çarpma dizilim tahtası</span></Link>
      </nav>
    </div>
  )
}
