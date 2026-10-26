import { useEffect, useReducer, useRef, useState } from 'react'
import { Dices, FastForward, Pause } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { MathText } from '../components/MathText'
import { DiceSvg } from '../components/Visual'
import { Hud, type GameProps } from './kit'

const RACES = 3
const COLORS = ['#64748b', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#be123c']

/** İki zarla toplamı s yapan sıralı ikililer */
const ways = (s: number) => (s >= 2 && s <= 12 ? 6 - Math.abs(s - 7) : 0)
const pairs = (s: number) => {
  const out: string[] = []
  for (let a = 1; a <= 6; a++) if (s - a >= 1 && s - a <= 6) out.push(`${a}+${s - a}`)
  return out.join(', ')
}

interface Question { text: string; options: { label: string; ok: boolean }[]; explain: string; grid?: number; chart?: boolean }

const opts = (right: string, wrong: string[]) => shuffle([{ label: right, ok: true }, ...[...new Set(wrong)].filter((w) => w !== right).map((label) => ({ label, ok: false }))])

function theoryQuestion(): Question {
  const s = pick([4, 5, 6, 7, 8, 9, 10])
  const w = ways(s)
  return {
    text: `İki zar atıldığında toplamın ${s} olma olasılığı nedir?`,
    options: opts(`[[${w}/36]]`, ['[[1/11]]', ...shuffle([`[[${w}/11]]`, `[[${w + 1}/36]]`, '[[1/36]]']).slice(0, 2)]),
    explain: `İki zarda 6 × 6 = 36 eş olası sonuç var. Toplamı ${s} olanlar: ${pairs(s)}. Bu ${w} sonuç demek, yani olasılık [[${w}/36]]. 2’den 12’ye 11 toplam var ama bunlar eş olası değil!`,
    grid: s,
  }
}

function makeQuestions(grade: Grade, all: number[]): Question[] {
  const R = all.reduce((a, b) => a + b, 0)
  const t7 = all[7]
  if (grade === 4)
    return [
      {
        text: 'Hangi atın kazanması imkânsız?',
        options: opts('1 numaralı at', ['2 numaralı at', '7 numaralı at', '12 numaralı at']),
        explain: 'İki zarın toplamı en az 1 + 1 = 2 olur. Toplam hiçbir zaman 1 olamaz; bu yüzden 1 numaralı atın kazanması imkânsız. 2 ve 12 zor ama olabilir!',
      },
      {
        text: 'İki zar atıldığında toplamın 13’ten küçük olması nasıl bir olay?',
        options: opts('Kesin', ['Olabilir', 'İmkânsız']),
        explain: 'En büyük toplam 6 + 6 = 12’dir. Her atışta toplam 13’ten küçük olur: bu olay kesin.',
      },
    ]
  if (grade === 5) {
    const [x, y] = pick([[7, 2], [7, 12], [6, 3], [8, 11], [7, 3], [6, 12]])
    const s = pick([3, 4, 5, 6])
    return [
      {
        text: `${x} numaralı at mı, ${y} numaralı at mı kazanmaya daha yakın?`,
        options: opts(`${x} numaralı at`, [`${y} numaralı at`, 'İkisi eşit olası']),
        explain: `${x} toplamı ${ways(x)} farklı şekilde gelir (${pairs(x)}). ${y} ise yalnızca ${ways(y)} şekilde gelir (${pairs(y)}). Bu yüzden ${x} daha olası.`,
        grid: x,
      },
      {
        text: `${s} ve ${14 - s} numaralı atları karşılaştır. Hangisi doğru?`,
        options: opts('İkisi eşit olası', [`${s} daha olası`, `${14 - s} daha olası`]),
        explain: `${s} toplamı ${pairs(s)} ile, ${14 - s} toplamı ${pairs(14 - s)} ile gelir. İkisi de ${ways(s)} farklı şekilde: eşit olası!`,
        grid: s,
      },
    ]
  }
  if (grade === 6) {
    const top = [...Array(11)].map((_, i) => i + 2).sort((a, b) => all[b] - all[a])
    const m = top[0]
    const others = shuffle(top.filter((h) => all[h] < all[m])).slice(0, 3)
    return [
      {
        text: `Tüm yarışlarda zarlar ${R} kez atıldı ve ${t7} kez toplam 7 geldi. 7 gelmesinin deneysel olasılığı nedir?`,
        options: opts(`[[${t7}/${R}]]`, [`[[${t7}/${R - t7}]]`, '[[1/11]]', `[[1/${R}]]`]),
        explain: `Deneysel olasılık = olayın kaç kez olduğu ÷ toplam deneme sayısı = [[${t7}/${R}]]. Bu, yaklaşık ${fmt(t7 / R, 2)} eder.`,
        chart: true,
      },
      {
        text: 'Bu deneyde en sık gelen toplam hangisiydi?',
        options: shuffle([{ label: `${m}`, ok: true }, ...others.map((o) => ({ label: `${o}`, ok: false }))]),
        explain: `Grafikteki en uzun sütun ${m} (${all[m]} kez). Ortadaki toplamlar daha çok farklı şekilde oluştuğu için daha sık gelir.`,
        chart: true,
      },
    ]
  }
  const s = pick([2, 3, 4, 5, 6])
  const neq: string[] = []
  for (let a = 2; a <= 12; a++) for (let b = a + 1; b <= 12; b++) if (ways(a) !== ways(b) && b !== 14 - a) neq.push(`${a} ve ${b}`)
  if (grade === 7)
    return [
      theoryQuestion(),
      {
        text: 'Hangi iki toplamın gelme olasılığı eşittir?',
        options: opts(`${s} ve ${14 - s}`, shuffle(neq).slice(0, 2)),
        explain: `${s} toplamı ${pairs(s)} ile, ${14 - s} toplamı ${pairs(14 - s)} ile gelir. İkisinin de olasılığı [[${ways(s)}/36]]: eş olası olaylar.`,
        grid: s,
      },
    ]
  return [
    theoryQuestion(),
    {
      text: `Bu oyunda ${R} atışın ${t7} tanesinde toplam 7 geldi: deneysel olasılık [[${t7}/${R}]] ≈ ${fmt(t7 / R, 2)}. Teorik olasılık ise [[6/36]] ≈ ${fmt(6 / 36, 2)}. Zarları 10.000 kez atsaydık ne olurdu?`,
      options: opts('Deneysel olasılık teorik olasılığa çok yaklaşırdı', ['Deneysel olasılık tam olarak [[6/36]] olurdu', 'Deneysel olasılık teorik olasılıktan uzaklaşırdı']),
      explain: 'Deneme sayısı arttıkça deneysel olasılık teorik olasılığa yaklaşır; ama şans her zaman vardır, tam olarak eşit olmak zorunda değildir.',
      chart: true,
    },
  ]
}

const insightFor = (grade: Grade) =>
  grade === 4
    ? 'Toplamın 1 olması imkânsız, 13’ten küçük olması kesin; 7 olması ise olabilir. Günlük hayatta kesin, olabilir ve imkânsız olaylara örnek bulabilir misin?'
    : grade === 5
      ? '7 toplamı 6 farklı şekilde gelir, 2 ise yalnızca 1 şekilde (1+1). Bu yüzden ortadaki atlar daha sık kazanır. Bahsini buna göre mi seçtin?'
      : grade === 6
        ? 'Deneysel olasılık, bir olayın kaç kez olduğunun toplam deneme sayısına oranıdır. Daha çok atış yapsaydık sonuçlar nasıl değişirdi?'
        : grade === 7
          ? '36 eş olası sonucun 6’sında toplam 7 olur: olasılık 6/36. 2 numaralı at ise yalnızca 1/36 olasılıkla ilerler. Hangi toplamlar eş olasıdır?'
          : 'Deneysel olasılık her zaman teorik olasılığa eşit çıkmaz ama deneme sayısı arttıkça ona yaklaşır. Az atışla karar vermek neden yanıltıcı olabilir?'

/** Gelen toplamların küçük sütun grafiği */
function Tally({ data, horses }: { data: number[]; horses: number[] }) {
  const max = Math.max(1, ...horses.map((h) => data[h]))
  const W = 330, H = 150, top = 16, bottom = 22
  const bw = (W - 8) / horses.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Toplamların grafiği: ${horses.map((h) => `${h}: ${data[h]}`).join(', ')}`}>
      <line x1={4} x2={W - 4} y1={H - bottom} y2={H - bottom} stroke="#1f2340" strokeWidth={1.5} />
      {horses.map((h, i) => {
        const bh = ((H - top - bottom) * data[h]) / max
        const x = 4 + i * bw
        return (
          <g key={h}>
            <rect x={x + bw * 0.14} y={H - bottom - bh} width={bw * 0.72} height={bh} rx={3} fill={COLORS[h]} />
            <text x={x + bw / 2} y={H - bottom - bh - 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#5b6080">{data[h]}</text>
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={12} fontWeight={900} fill="#1f2340">{h}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** 6 × 6 sonuç tablosu; toplamı s olan kutular boyanır */
function OutcomeGrid({ s }: { s: number }) {
  return (
    <table className="mx-auto mt-3 border-separate border-spacing-0.5 text-center text-sm font-extrabold tabular-nums" aria-label={`İki zarın 36 sonucu; toplamı ${s} olanlar boyalı`}>
      <thead>
        <tr>
          <th className="size-8 text-xs text-ink-soft">+</th>
          {[1, 2, 3, 4, 5, 6].map((b) => <th key={b} className="size-8 rounded-md bg-slate-200">{b}</th>)}
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4, 5, 6].map((a) => (
          <tr key={a}>
            <th className="size-8 rounded-md bg-slate-200">{a}</th>
            {[1, 2, 3, 4, 5, 6].map((b) => (
              <td key={b} className={`size-8 rounded-md ${a + b === s ? 'bg-amber-400 text-white' : 'bg-white text-ink-soft ring-1 ring-line'}`}>{a + b}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type Phase = 'bet' | 'race' | 'end' | 'debrief'

export default function DiceRace({ grade, onFinish }: GameProps) {
  const goal = grade <= 5 ? 6 : 8
  const horses = Array.from({ length: grade === 4 ? 12 : 11 }, (_, i) => i + (grade === 4 ? 1 : 2))
  const sim = useRef({
    pos: Array<number>(13).fill(0),
    all: Array<number>(13).fill(0),
    dice: [3, 4] as [number, number],
    last: 0,
    rolls: 0,
    bet: 0,
    winner: 0,
    raceNo: 0,
    betWins: 0,
    phase: 'bet' as Phase,
    history: [] as { winner: number; bet: number }[],
  })
  const [, render] = useReducer((x: number) => x + 1, 0)
  const [auto, setAuto] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [hint, setHint] = useState('')
  const [qs, setQs] = useState<Question[]>([])
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const finished = useRef(false)

  const roll = () => {
    const s = sim.current
    if (s.phase === 'bet' && s.bet) s.phase = 'race'
    if (s.phase !== 'race') return
    const a = randInt(1, 6), b = randInt(1, 6), sum = a + b
    s.dice = [a, b]
    s.last = sum
    s.rolls++
    s.all[sum]++
    s.pos[sum]++
    if (s.pos[sum] >= goal) {
      s.winner = sum
      s.phase = 'end'
      s.history.push({ winner: sum, bet: s.bet })
      if (sum === s.bet) {
        s.betWins++
        sfx.ok()
      } else sfx.bad()
      setAuto(false)
    }
    render()
  }

  // Elle atış: zarlar kısa bir süre döner, sonra gerçek atış
  useEffect(() => {
    if (!rolling) return
    const spin = setInterval(() => {
      sim.current.dice = [randInt(1, 6), randInt(1, 6)]
      render()
    }, 70)
    const done = setTimeout(() => {
      clearInterval(spin)
      setRolling(false)
      roll()
    }, 420)
    return () => {
      clearInterval(spin)
      clearTimeout(done)
    }
  }, [rolling])

  useEffect(() => {
    if (!auto) return
    const t = setInterval(roll, 200)
    return () => clearInterval(t)
  }, [auto])

  const s = sim.current

  const choose = (h: number) => {
    if (s.phase !== 'bet') return
    s.bet = h
    setHint('')
    render()
  }

  const tapRoll = () => {
    if (s.phase === 'bet' && !s.bet) return setHint('Önce kazanacağını düşündüğün ata dokun!')
    if (!rolling && !auto) setRolling(true)
  }

  const tapAuto = () => {
    if (s.phase === 'bet' && !s.bet) return setHint('Önce kazanacağını düşündüğün ata dokun!')
    setAuto(!auto)
  }

  const nextRace = () => {
    if (s.raceNo + 1 >= RACES) {
      s.phase = 'debrief'
      setQs(makeQuestions(grade, s.all))
      render()
      return
    }
    s.raceNo++
    s.pos = Array<number>(13).fill(0)
    s.bet = 0
    s.winner = 0
    s.last = 0
    s.phase = 'bet'
    render()
  }

  const answer = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (qs[qi].options[i].ok) {
      sfx.ok()
      setCorrect(correct + 1)
    } else sfx.bad()
  }

  const nextQuestion = () => {
    if (qi + 1 < qs.length) {
      setQi(qi + 1)
      setPicked(null)
      return
    }
    if (finished.current) return
    finished.current = true
    onFinish({
      stars: correct === qs.length ? (s.betWins >= 1 ? 3 : 2) : correct > 0 ? 2 : 1,
      score: s.betWins * 10 + correct * 15,
      summary: `${RACES} yarışın ${s.betWins} tanesinde bahsin kazandı; ${qs.length} sorunun ${correct} tanesini bildin.`,
      insight: insightFor(grade),
    })
  }

  const score = s.betWins * 10 + correct * 15
  const totalRolls = s.all.reduce((a, b) => a + b, 0)

  if (s.phase === 'debrief' && qs.length) {
    const q = qs[qi]
    const chosen = picked !== null ? q.options[picked] : null
    return (
      <div className="animate-fade-up">
        <Hud score={score} extra={<span className="chip bg-white px-3 py-1.5 text-sm ring-1 ring-line">Soru {qi + 1}/{qs.length}</span>} />
        <div key={qi} className="card mx-auto max-w-xl p-4 animate-pop sm:p-5">
          <p className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Sonuçları inceleyelim</p>
          <p className="mt-1 text-lg leading-snug font-black"><MathText text={q.text} /></p>
          {q.chart && (
            <div className="mt-3 rounded-2xl bg-paper p-2">
              <p className="text-center text-xs font-extrabold text-ink-soft">Tüm yarışlarda gelen toplamlar ({totalRolls} atış)</p>
              <Tally data={s.all} horses={horses} />
            </div>
          )}
          <div className="mt-4 grid gap-2">
            {q.options.map((o, i) => {
              const state = picked === null ? '' : o.ok ? 'bg-ok-soft ring-ok text-green-800' : i === picked ? 'bg-orange-50 ring-orange-300 text-orange-800 animate-shake' : 'opacity-50'
              return (
                <button key={i} type="button" onClick={() => answer(i)} disabled={picked !== null} className={`min-h-12 rounded-2xl bg-white px-4 py-2 text-left text-base font-extrabold ring-2 ring-line transition active:scale-[0.98] ${state}`}>
                  <MathText text={o.label} />
                </button>
              )
            })}
          </div>
          {chosen && (
            <div className="mt-4 animate-fade-up">
              <p className={`text-lg font-black ${chosen.ok ? 'text-ok' : 'text-orange-700'}`}>{chosen.ok ? 'Doğru! +15' : 'Tam değil.'}</p>
              <p className="mt-1 font-bold text-ink"><MathText text={q.explain} /></p>
              {q.grid && <OutcomeGrid s={q.grid} />}
              <button type="button" onClick={nextQuestion} className="btn-primary mt-4 w-full" autoFocus>{qi + 1 < qs.length ? 'Sonraki soru' : 'Bitir'}</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const racing = s.phase === 'race' || s.phase === 'bet'

  return (
    <div className="animate-fade-up">
      <Hud round={s.raceNo + 1} rounds={RACES} score={score} extra={<span className="chip bg-white px-3 py-1.5 text-sm ring-1 ring-line"><Dices size={15} />{s.rolls}</span>} />

      <div className="sticky top-14 z-10 -mx-1 mb-2 rounded-2xl bg-paper/95 px-1 py-2 backdrop-blur sm:top-16">
        <div className="flex items-center justify-center gap-2">
          <span className={rolling ? 'animate-shake' : ''}><DiceSvg value={s.dice[0]} size={52} /></span>
          <span className={rolling ? 'animate-shake' : ''}><DiceSvg value={s.dice[1]} size={52} /></span>
          <span className="min-w-16 text-center text-2xl font-black tabular-nums" aria-live="polite">{s.last && !rolling ? `= ${s.last}` : ''}</span>
        </div>
        {racing && (
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" onClick={tapRoll} disabled={rolling || auto} className="btn-primary min-w-32"><Dices size={20} />Zar at</button>
            <button type="button" onClick={tapAuto} className="btn-ghost min-w-32">{auto ? <><Pause size={18} />Durdur</> : <><FastForward size={18} />Otomatik</>}</button>
          </div>
        )}
        <p className="mt-1.5 text-center text-sm font-bold text-ink-soft">
          {hint || (s.phase === 'bet' ? (s.bet ? `Bahsin: ${s.bet} numaralı at. Zarları at!` : 'Kazanacağını düşündüğün ata dokun.') : s.phase === 'race' ? `İlk ${goal} adımı atan at kazanır. Bahsin: ${s.bet}` : '')}
        </p>
      </div>

      {s.phase === 'end' && (
        <div className="card mb-3 p-4 text-center animate-pop">
          <p className="text-3xl" aria-hidden>{s.winner === s.bet ? '🏆' : '🏁'}</p>
          <p className="text-xl font-black">{s.winner} numaralı at kazandı!</p>
          <p className={`font-extrabold ${s.winner === s.bet ? 'text-ok' : 'text-ink-soft'}`}>{s.winner === s.bet ? 'Bahsin tuttu! +10' : `Senin atın ${s.bet} numaraydı.`}</p>
          <div className="mt-3 rounded-2xl bg-paper p-2">
            <p className="text-center text-xs font-extrabold text-ink-soft">Şimdiye kadar gelen toplamlar ({totalRolls} atış)</p>
            <Tally data={s.all} horses={horses} />
          </div>
          <p className="mt-2 text-sm font-bold text-ink">
            {s.raceNo === 0 ? 'Hangi toplamlar daha sık geldi? İstersen sonraki yarışta başka bir ata bahis yap.' : s.raceNo === 1 ? 'Grafikte en uzun sütunlar nerede: ortada mı, uçlarda mı? Neden olabilir?' : 'Şimdi sonuçları birlikte inceleyelim!'}
          </p>
          <button type="button" onClick={nextRace} className="btn-primary mt-3 min-w-48" autoFocus>{s.raceNo + 1 >= RACES ? 'Sonuçları incele' : 'Sonraki yarış'}</button>
        </div>
      )}

      <div className="space-y-1">
        {horses.map((h) => {
          const p = Math.min(goal, s.pos[h])
          const isBet = s.bet === h
          const won = s.phase === 'end' && s.winner === h
          const moved = s.phase === 'race' && s.last === h && !rolling
          return (
            <button
              key={h}
              type="button"
              onClick={() => choose(h)}
              disabled={s.phase !== 'bet'}
              aria-pressed={isBet}
              aria-label={`${h} numaralı at, ${p} adım`}
              className={`flex h-11 w-full items-center gap-2 rounded-xl px-1.5 ring-1 transition disabled:cursor-default ${won ? 'bg-ok-soft ring-ok' : isBet ? 'bg-amber-50 ring-amber-400' : moved ? 'bg-sky-50 ring-sky-200' : 'bg-white ring-line'}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-black text-white" style={{ background: COLORS[h] }}>{h}</span>
              <span className="relative h-full flex-1">
                <span className="absolute inset-y-2 right-0 left-0 flex" aria-hidden>
                  {Array.from({ length: goal }, (_, i) => <span key={i} className="flex-1 border-r border-dashed border-line last:border-r-2 last:border-r-ink/40" />)}
                </span>
                <span className="absolute top-1/2 text-2xl leading-none transition-[left] duration-200" style={{ left: `calc(${p / goal} * (100% - 1.75rem))`, transform: 'translateY(-50%) scaleX(-1)' }} aria-hidden>🏇</span>
              </span>
              <span className="w-6 shrink-0 text-center text-lg" aria-hidden>{won ? '🏆' : isBet ? '💰' : ''}</span>
            </button>
          )
        })}
      </div>

      {s.history.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {s.history.map((r, i) => (
            <span key={i} className={`chip px-3 py-1 text-sm ring-1 ${r.winner === r.bet ? 'bg-ok-soft text-green-800 ring-green-200' : 'bg-white ring-line'}`}>
              {i + 1}. yarış: {r.winner} kazandı {r.winner === r.bet ? '✓' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
