import { useEffect, useRef, useState } from 'react'
import { Flag, Sparkles, Trophy } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor, useWidth } from '../../kit'
import { Scene, StrategyPicker } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { factorPairs, isSquare } from '../../../lib/numberTheory'
import { ek, gen } from '../../../lib/generators'
import { Card, Choices, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, shuffle } from '../../../interactions/donusum-studyosu/ortak'

/**
 * Gökkuşağı Çarpanları (8. sınıf — Çarpanlar ve Katlar)
 *  - Şeridin iki ucunda 1 ve n; ilk yay hazır. Öğrenci sıradaki adayı dener: bölüyorsa eşi (n ÷ d) karşı uçta
 *    belirir ve iç içe yeni bir gökkuşağı yayı çizilir; bölmüyorsa yakın katlarla düşündüren soru gelir.
 *  - Aday √n’yi geçince “Başka çarpan var mı?” sorusu: durma noktasını keşfetmek bonus kazandırır.
 *  - Tam karelerde ortadaki çarpan kendisiyle eşleşir (tek sütun) → çarpan sayısı tektir.
 *  - Son seviyelerde önce çarpan sayısı tahmin edilir.
 */

const LEVELS: { n: number; predict?: boolean }[] = [
  { n: 12 },
  { n: 18 },
  { n: 36 },
  { n: 48 },
  { n: 60 },
  { n: 100, predict: true },
  { n: 84, predict: true },
]

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
const STRATEGIES = ['Çiftlerle düşündüm (d ve n ÷ d)', 'Bölünebilme kurallarını kullandım', 'Karekökte durdum', 'Sırayla tek tek denedim']

type Gain = { pts: number; label: string; id: number }

export default function GokkusagiCarpanlar({ grade, onFinish }: GameProps) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [gain, setGain] = useState<Gain | null>(null)
  const totals = useRef({ mistakes: 0, clean: 0 })
  const level = LEVELS[idx]
  const last = idx === LEVELS.length - 1

  const add = (pts: number, label: string) => {
    setScore((s) => s + pts)
    const now = Date.now()
    // Aynı anda gelen bonuslar tek etikette toplanır
    setGain((g) => (g && now - g.id < 300 ? { pts: g.pts + pts, label: `${g.label} · ${label}`, id: g.id } : { pts, label, id: now }))
  }

  const next = (r: { mistakes: number }) => {
    totals.current.mistakes += r.mistakes
    if (r.mistakes === 0) totals.current.clean++
    if (!last) {
      setIdx(idx + 1)
      setGain(null)
      return
    }
    const { mistakes, clean } = totals.current
    onFinish({
      stars: starsFor(LEVELS.length / (LEVELS.length + mistakes * 0.5)),
      score,
      summary: `${LEVELS.length} sayının bütün çarpanlarını gökkuşağıyla buldun; ${clean} sayıyı hiç takılmadan tamamladın.`,
      insight: 'Çarpanlar çiftler hâlinde gelir: d bir çarpansa n ÷ d de çarpandır. Çiftin küçük olanı hep √n’ye kadardır; bu yüzden √n’ye kadar denemek yeter. Tam karelerde ortadaki çarpan kendisiyle eşleştiği için çarpan sayısı tektir.',
    })
  }

  return (
    <Scene grade={grade}>
      <Header
        emoji="🌈"
        kicker="Sayı"
        title={<>{level.n} sayısının gökkuşağı</>}
        idx={idx}
        total={LEVELS.length}
        dark
        right={<span className="chip bg-amber-400/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-300/40"><Trophy size={15} />{score}</span>}
      />
      <Level key={idx} n={level.n} predict={!!level.predict} last={last} askStrategy={idx === 2 || last} add={add} gain={gain} onNext={next} />
    </Scene>
  )
}

type Phase = 'predict' | 'play' | 'done'

function Level({ n, predict, last, askStrategy, add, gain, onNext }: { n: number; predict: boolean; last: boolean; askStrategy: boolean; add: (p: number, l: string) => void; gain: Gain | null; onNext: (r: { mistakes: number }) => void }) {
  const track = useTracker()
  const all = factorPairs(n)
  const root = Math.sqrt(n)
  const maxCand = Math.floor(root) + 2
  const candidates = Array.from({ length: maxCand - 1 }, (_, i) => i + 2)
  const total = all.reduce((s, [a, b]) => s + (a === b ? 1 : 2), 0)

  const [phase, setPhase] = useState<Phase>(predict ? 'predict' : 'play')
  const [guess, setGuess] = useState<number | null>(null)
  const [guessOptions] = useState(() => [total, ...shuffle([total - 2, total + 2, total % 2 ? total + 1 : total - 1, total + 4].filter((x) => x > 1)).slice(0, 3)].sort((a, b) => a - b))
  const [pairs, setPairs] = useState<[number, number][]>([[1, n]])
  const [tested, setTested] = useState<Record<number, 'pair' | 'no' | 'known'>>({})
  const [nudge, setNudge] = useState<{ q: string; mis?: string; ok?: boolean } | null>(null)
  const [stopQ, setStopQ] = useState<number | null>(null)
  const [overshoot, setOvershoot] = useState(false)
  const mistakes = useRef(0)
  const complete = pairs.length === all.length

  const miss = (q: string, mis?: string) => {
    mistakes.current++
    track.attempt(false)
    sfx.bad()
    setNudge({ q, mis })
  }

  const finish = (stoppedWell: boolean) => {
    if (stoppedWell) add(20, 'Tam yerinde durdun!')
    else add(5, 'Bütün çiftler tamam')
    if (mistakes.current === 0) add(20, 'Hatasız gökkuşağı')
    if (predict && guess === total) add(15, 'Tahminin tuttu')
    track.item(mistakes.current === 0)
    sfx.ok()
    setNudge(null)
    setStopQ(null)
    setPhase('done')
  }

  const addPair = (a: number, b: number) => {
    setPairs((ps) => [...ps, [a, b]])
    track.attempt(true)
    sfx.ok()
    add(10, a === b ? `${a} × ${a}` : `${a} × ${b}`)
  }

  const pick = (d: number) => {
    if (phase !== 'play' || tested[d]) return
    setNudge(null)
    if (d * d > n) {
      setOvershoot(true)
      if (n % d === 0) {
        const p = n / d
        if (pairs.some(([a]) => a === p)) {
          setTested((t) => ({ ...t, [d]: 'known' }))
          setNudge({ q: `${d} zaten şeritte: ${gen(p)} eşi olarak bulmuştun (${p} × ${d} = ${n}).`, ok: true })
        } else {
          setTested((t) => ({ ...t, [d]: 'pair' }))
          addPair(p, d)
        }
      } else {
        setTested((t) => ({ ...t, [d]: 'no' }))
      }
      setStopQ(d)
      return
    }
    if (n % d === 0) {
      setTested((t) => ({ ...t, [d]: 'pair' }))
      addPair(d, n / d)
      if (d * d === n) setNudge({ q: `${d} × ${d} = ${n}: ${d} kendi kendisinin eşi! Ortada tek başına duruyor.`, ok: true })
      return
    }
    setTested((t) => ({ ...t, [d]: 'no' }))
    const q = Math.floor(n / d)
    miss(`${d} × ${q} = ${d * q}, ${d} × ${q + 1} = ${d * (q + 1)}. ${n} bu ikisinin arasında kaldı; ${d}, ${ek(n, 'acc')} tam böler mi?`)
  }

  const answerStop = (more: boolean) => {
    const d = stopQ!
    if (!more && complete) return finish(false)
    if (!more) {
      setStopQ(null)
      return miss(`Bir çift kaçtı! ${Math.floor(root)} ve daha küçük adaylardan denemediğin var mı?`, 'Çarpan ararken karekökten küçük bir adayı atladı')
    }
    if (complete) {
      track.attempt(false)
      mistakes.current++
      setStopQ(null)
      return setNudge({ q: `${d} × ${d} = ${d * d}, ${ek(n, 'abl')} büyük. ${ek(d, 'abl')} büyük bir çarpan olsaydı eşi ${ek(d, 'abl')} küçük olurdu; onları zaten denedin. Hâlâ çarpan var mı?` })
    }
    setStopQ(null)
    setNudge({ q: `Doğru, eksik bir çift var. Ama ${ek(d, 'abl')} büyük adaylara gerek yok: eşleri ${ek(d, 'abl')} küçük olurdu. Küçük adaylara dön.`, ok: true })
  }

  const done = () => {
    if (complete) return finish(!overshoot)
    miss('Yaylar henüz ortada buluşmadı. Şeritteki “?” boşluğuna bak: arada denemediğin bir aday kaldı mı?', 'Bütün çarpanları bulmadan bitirdi')
  }

  const factors = [...new Set(all.flat())].sort((a, b) => a - b)

  return (
    <Split
      work={
        <Stage dark>
          <Rainbow n={n} pairs={pairs} maxPairs={all.length} closed={phase === 'done'} />
          {phase === 'done' && (
            <p className="mt-2 px-2 pb-1 text-center text-sm font-bold text-slate-300">
              {gen(n)} çarpanları: <span className="font-black text-white">{factors.join(', ')}</span> — {factors.length} çarpan{isSquare(n) ? ' (tek sayıda!)' : ''}
            </p>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Önce tahmin et">{gen(n)} kaç tane çarpanı var sence?</Prompt>
              <Choices options={guessOptions.map((g) => ({ id: g, label: `${g} çarpan` }))} value={guess} onPick={(g) => { setGuess(g); setPhase('play') }} />
            </>
          )}
          {phase === 'play' && (
            <>
              <Prompt step={`${pairs.length}. yay hazır`}>
                1 × {n} = {n}. Sıradaki çarpan adayı hangisi? Bölüyorsa eşi karşı uçta belirir.
              </Prompt>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {candidates.map((d) => {
                  const st = tested[d]
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!!st || stopQ !== null}
                      onClick={() => pick(d)}
                      className={`min-h-14 rounded-2xl text-xl font-black ring-2 transition active:scale-95 ${st === 'pair' ? 'bg-emerald-500 text-white ring-emerald-300' : st === 'no' ? 'bg-slate-700 text-slate-500 line-through ring-slate-600' : st === 'known' ? 'bg-sky-700 text-sky-100 ring-sky-500' : 'bg-slate-100 text-ink ring-white hover:bg-white'} disabled:cursor-default`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
              {stopQ !== null && (
                <Card dark className="animate-fade-up">
                  <p className="mb-2 font-extrabold">
                    {stopQ} × {stopQ} = {stopQ * stopQ}, {ek(n, 'abl')} büyük. {gen(n)} henüz bulmadığın bir çarpanı daha var mı?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <GhostButton dark onClick={() => answerStop(true)}>Evet, var</GhostButton>
                    <GhostButton dark onClick={() => answerStop(false)}>Hayır, hepsi bu</GhostButton>
                  </div>
                </Card>
              )}
              {stopQ === null && (
                <GhostButton dark onClick={done} className="w-full"><Flag size={18} />Bitti, başka çarpan yok!</GhostButton>
              )}
              {nudge && <Nudge question={nudge.q} misconception={nudge.mis} tone={nudge.ok ? 'ok' : 'think'} onClose={() => setNudge(null)} />}
            </>
          )}
          {phase === 'done' && (
            <>
              <Card dark className="animate-fade-up">
                <p className="flex items-center gap-2 font-black text-emerald-300"><Sparkles size={18} />Gökkuşağı tamam!</p>
                <p className="mt-1 text-sm font-bold text-slate-200">
                  {all.length} çift buldun: {all.map(([a, b]) => `${a}·${b}`).join(', ')}.
                  {isSquare(n) ? ` ${Math.sqrt(n)} kendi eşi olduğu için ortada tek kaldı; bu yüzden ${gen(n)} çarpan sayısı tek.` : ` Her çarpanın bir eşi var; bu yüzden ${gen(n)} çarpan sayısı çift.`}
                </p>
                {predict && guess !== null && (
                  <p className="mt-1 text-sm font-bold text-slate-300">Tahminin: {guess} · Gerçek: {total}{guess === total ? ' 🎯' : ''}</p>
                )}
              </Card>
              {askStrategy && <StrategyPicker options={STRATEGIES} onPick={() => undefined} question="Çarpanları ararken nasıl düşündün?" />}
              <NextButton last={last} onClick={() => onNext({ mistakes: mistakes.current })} />
            </>
          )}
          <GainChip gain={gain} />
          {phase !== 'predict' && pairs.length > 1 && phase !== 'done' && (
            <p className="text-sm font-bold text-slate-300">Bulunan çiftler: {[...pairs].sort((a, b) => a[0] - b[0]).map(([a, b]) => `${a} × ${b}`).join(' · ')}</p>
          )}
        </>
      }
    />
  )
}

function GainChip({ gain }: { gain: Gain | null }) {
  if (!gain) return null
  return (
    <p key={gain.id} className="self-start rounded-xl bg-amber-400/15 px-3 py-1.5 text-sm font-black text-amber-200 ring-1 ring-amber-300/40 animate-pop">
      +{gain.pts} · {gain.label}
    </p>
  )
}

/** Sayı şeridi: küçük çarpanlar solda, eşleri sağda; her çift iç içe bir yayla bağlanır */
function Rainbow({ n, pairs, maxPairs, closed }: { n: number; pairs: [number, number][]; maxPairs: number; closed: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const sorted = [...pairs].sort((a, b) => a[0] - b[0])
  const center = sorted.find(([a, b]) => a === b)?.[0]
  const smalls = sorted.filter(([a, b]) => a !== b).map(([a]) => a)
  const bigs = sorted.filter(([a, b]) => a !== b).map(([, b]) => b).sort((a, b) => a - b)
  type Item = { kind: 'n'; v: number } | { kind: 'gap'; key: string }
  const items: Item[] = [
    ...smalls.map((v) => ({ kind: 'n' as const, v })),
    ...(closed ? [] : [{ kind: 'gap' as const, key: 'g1' }]),
    ...(center !== undefined ? [{ kind: 'n' as const, v: center }] : []),
    ...(closed || center === undefined ? [] : [{ kind: 'gap' as const, key: 'g2' }]),
    ...bigs.map((v) => ({ kind: 'n' as const, v })),
  ]
  const W = Math.max(280, w)
  const pad = 8
  const step = (W - 2 * pad) / items.length
  const chipR = Math.min(24, step * 0.44)
  const hMax = Math.min(190, W * 0.34)
  const base = hMax + 26
  const H = base + chipR + 14
  const xOf = (i: number) => pad + step * (i + 0.5)
  const posOf = (v: number) => xOf(items.findIndex((it) => it.kind === 'n' && it.v === v))
  const font = Math.max(10, Math.min(18, chipR * (String(n).length > 2 ? 0.62 : 0.78)))

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${n} sayısının çarpan çiftleri gökkuşağı`}>
        {sorted.map(([a, b], k) => {
          const color = COLORS[k % COLORS.length]
          if (a === b) {
            const x = posOf(a)
            return (
              <g key={`p${a}`}>
                <line x1={x} y1={base - chipR} x2={x} y2={base - chipR - 34} stroke={color} strokeWidth={6} strokeLinecap="round" />
                <circle cx={x} cy={base - chipR - 42} r={9} fill="none" stroke={color} strokeWidth={5} />
              </g>
            )
          }
          const x1 = posOf(a), x2 = posOf(b)
          const ry = Math.max(16, (hMax * (maxPairs - k)) / maxPairs)
          return <Arc key={`p${a}`} d={`M ${x1} ${base - chipR + 2} A ${(x2 - x1) / 2} ${ry} 0 0 1 ${x2} ${base - chipR + 2}`} color={color} />
        })}
        {items.map((it, i) =>
          it.kind === 'gap' ? (
            <g key={it.key}>
              <rect x={xOf(i) - chipR} y={base - chipR} width={chipR * 2} height={chipR * 2} rx={10} fill="none" stroke="#64748b" strokeWidth={2} strokeDasharray="5 4" />
              <text x={xOf(i)} y={base} textAnchor="middle" dominantBaseline="central" fontSize={font} fontWeight={900} fill="#94a3b8">?</text>
            </g>
          ) : (
            <g key={`n${it.v}`} className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <rect x={xOf(i) - chipR} y={base - chipR} width={chipR * 2} height={chipR * 2} rx={10} fill={it.v === center ? '#fde68a' : '#f8fafc'} stroke={it.v === 1 || it.v === n ? '#fbbf24' : '#cbd5e1'} strokeWidth={2} />
              <text x={xOf(i)} y={base + 1} textAnchor="middle" dominantBaseline="central" fontSize={font} fontWeight={900} fill="#1f2340">{it.v}</text>
            </g>
          ),
        )}
      </svg>
    </div>
  )
}

function Arc({ d, color }: { d: string; color: string }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={7}
      strokeLinecap="round"
      strokeDasharray={1}
      strokeDashoffset={drawn ? 0 : 1}
      style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
    />
  )
}
