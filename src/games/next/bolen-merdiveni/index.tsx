import { useRef, useState } from 'react'
import { Pickaxe, Sparkles, Star, Trophy } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { Scene, StrategyPicker } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { factorPairs, factorize, gcd, isPrime, lcm, primeFactors } from '../../../lib/numberTheory'
import { ek, gen } from '../../../lib/generators'
import { Card, CheckButton, Choices, Header, NextButton, NumPad, Nudge, Prompt, Split, Stage, parseNum, shuffle } from '../../../interactions/donusum-studyosu/ortak'

/**
 * Asal Bölen Merdiveni (8. sınıf — Çarpanlar ve Katlar)
 * Asal bölen algoritması (bölme tablosu) bir maden inişi olarak oyunlaştırılır:
 *  - Sol sütunda sayı/bölümler, dikey çizginin sağında seçilen asal bölenler. Bölen asal sayı seçilince bölüm
 *    bir alt basamağa iner ve madenci bir basamak iner; bölmeyen asal seçilince bölünebilme kuralını hatırlatan soru gelir.
 *  - Puan: her doğru basamak +10, en küçük asal bölenle inmek +5 bonus. 1’e inince üslü yazımı seç (+20).
 *  - Son iki seviyede iki sayı aynı tabloda bölünür; ikisini birden bölen basamaklar ⭐ ile işaretlenir.
 *    Öğrenci EBOB’u (işaretli bölenlerin çarpımı) ve EKOK’u (bütün bölenlerin çarpımı) kendisi hesaplar.
 */

const LEVELS: number[][] = [[60], [72], [126], [150], [231], [24, 36], [40, 60]]
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19]
const STRATEGIES = ['En küçük asal bölenden başladım', 'Bölünebilme kurallarını kullandım', 'Önce büyük bir asal denedim', 'Ortak bölenleri işaretledim']
const ROW = 56

type Row = { vals: number[]; p?: number; both?: boolean }
type Gain = { pts: number; label: string; id: number }
type Phase = 'climb' | 'form' | 'ebob' | 'ekok' | 'done'

const digitSum = (v: number) => String(v).split('').reduce((s, c) => s + Number(c), 0)
const tex = (n: number) => factorize(n).map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join(' · ')

/** Bölmeyen bir asal için bölünebilme kuralını hatırlatan soru */
function ruleHint(v: number, p: number) {
  if (p === 2) return `${v} çift mi? Son rakamı ${v % 10}; 2’ye bölünebilmek için son rakam çift olmalı.`
  if (p === 3) return `${gen(v)} rakamları toplamı ${digitSum(v)}. Bu toplam 3’ün katı mı?`
  if (p === 5) return `${gen(v)} son rakamı ${v % 10}. 5’e bölünebilmek için son rakam 0 ya da 5 olmalı.`
  const q = Math.floor(v / p)
  return `${p} × ${q} = ${p * q}, ${p} × ${q + 1} = ${p * (q + 1)}. ${v} arada kaldı; ${p}, ${ek(v, 'acc')} tam böler mi?`
}

/** Üslü yazım seçenekleri: doğru + yaygın hatalar */
function formOptions(n: number) {
  const right = tex(n)
  const fs = factorize(n)
  const set = new Set<string>([right])
  if (fs.some(([, e]) => e > 1)) set.add(fs.map(([p]) => `${p}`).join(' · '))
  set.add(fs.map(([p, e], i) => (i === 0 ? `${p}^{${e + 1}}` : e > 1 ? `${p}^{${e}}` : `${p}`)).join(' · '))
  const nonPrime = factorPairs(n).find(([a, b]) => a > 1 && (!isPrime(a) || !isPrime(b)))
  if (nonPrime) set.add(`${nonPrime[0]} · ${nonPrime[1]}`)
  if (set.size < 4) set.add(fs.map(([p, e]) => `${p}^{${e + 1}}`).join(' · '))
  return { right, options: shuffle([...set].slice(0, 4)) }
}

export default function BolenMerdiveni({ grade, onFinish }: GameProps) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [gain, setGain] = useState<Gain | null>(null)
  const totals = useRef({ mistakes: 0, smallest: 0, steps: 0 })
  const last = idx === LEVELS.length - 1
  const nums = LEVELS[idx]

  const add = (pts: number, label: string) => {
    setScore((s) => s + pts)
    const now = Date.now()
    // Aynı anda gelen bonuslar tek etikette toplanır
    setGain((g) => (g && now - g.id < 300 ? { pts: g.pts + pts, label: `${g.label} · ${label}`, id: g.id } : { pts, label, id: now }))
  }
  const next = (r: { mistakes: number; smallest: number; steps: number }) => {
    totals.current.mistakes += r.mistakes
    totals.current.smallest += r.smallest
    totals.current.steps += r.steps
    if (!last) {
      setIdx(idx + 1)
      setGain(null)
      return
    }
    const t = totals.current
    onFinish({
      stars: starsFor(LEVELS.length / (LEVELS.length + t.mistakes * 0.4)),
      score,
      summary: `${LEVELS.length} merdivenden 1’e indin: ${t.steps} basamağın ${t.smallest} tanesinde en küçük asal böleni seçtin.`,
      insight: 'Asal bölen algoritmasında sağ sütundaki asal bölenlerin çarpımı sayının kendisidir; bu, sayının asal çarpanlarına ayrılmış hâlidir. İki sayı aynı tabloda bölününce ikisini birden bölen asalların çarpımı EBOB’u, bütün bölenlerin çarpımı EKOK’u verir.',
    })
  }

  return (
    <Scene grade={grade}>
      <Header
        emoji="🪜"
        kicker="Merdiven"
        title={nums.length === 1 ? <>{nums[0]} merdiveni</> : <>{nums[0]} ve {nums[1]} ortak merdiveni</>}
        idx={idx}
        total={LEVELS.length}
        dark
        right={<span className="chip bg-amber-400/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-300/40"><Trophy size={15} />{score}</span>}
      />
      <Level key={idx} nums={nums} last={last} askStrategy={idx === 0 || last} add={add} gain={gain} onNext={next} />
    </Scene>
  )
}

function Level({ nums, last, askStrategy, add, gain, onNext }: { nums: number[]; last: boolean; askStrategy: boolean; add: (p: number, l: string) => void; gain: Gain | null; onNext: (r: { mistakes: number; smallest: number; steps: number }) => void }) {
  const track = useTracker()
  const two = nums.length === 2
  const [rows, setRows] = useState<Row[]>([{ vals: nums }])
  const [phase, setPhase] = useState<Phase>('climb')
  const [nudge, setNudge] = useState<{ q: string; mis?: string; ok?: boolean } | null>(null)
  const [form] = useState(() => formOptions(nums[0]))
  const [picked, setPicked] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const mistakes = useRef(0)
  const smallest = useRef(0)
  const tries = useRef(0)
  const cur = rows[rows.length - 1].vals
  const done = (vals: number[]) => vals.every((v) => v === 1)
  const divs = rows.filter((r) => r.p).map((r) => r.p!)
  const bothDivs = rows.filter((r) => r.both).map((r) => r.p!)

  const miss = (q: string, mis?: string) => {
    mistakes.current++
    tries.current++
    track.attempt(false)
    sfx.bad()
    setNudge({ q, mis })
  }

  const pick = (p: number) => {
    if (phase !== 'climb') return
    const hits = cur.map((v) => v > 1 && v % p === 0)
    if (!hits.some(Boolean)) {
      const v = cur.find((x) => x > 1)!
      return miss(two ? `${p}, ${cur.filter((x) => x > 1).join(' ve ')} sayılarından hiçbirini bölmüyor. ${ruleHint(v, p)}` : ruleHint(v, p))
    }
    const small = Math.min(...cur.filter((v) => v > 1).map((v) => primeFactors(v)[0]))
    const nextVals = cur.map((v, i) => (hits[i] ? v / p : v))
    const both = two && hits.every(Boolean)
    setRows((rs) => [...rs.slice(0, -1), { ...rs[rs.length - 1], p, both }, { vals: nextVals }])
    track.attempt(true)
    sfx.ok()
    setNudge(null)
    if (p === small) {
      smallest.current++
      add(15, `÷ ${p} · en küçük asal bölen`)
    } else {
      add(10, `÷ ${p}`)
      setNudge({ q: `Olur, ${p} de böler! Ama ${small} daha küçük bir asal bölendi; en küçükten başlamak hiçbir böleni kaçırmamayı kolaylaştırır.`, ok: true })
    }
    if (done(nextVals)) {
      setPhase(two ? 'ebob' : 'form')
      setInput('')
    }
  }

  const checkForm = (id: string) => {
    setPicked(id)
    if (id === form.right) {
      track.attempt(true)
      track.item(mistakes.current === 0)
      sfx.ok()
      add(20, 'Üslü yazım')
      setNudge(null)
      return setPhase('done')
    }
    const bad = id.split(' · ').map((s) => Number(s.split('^')[0]))
    if (bad.some((b) => !isPrime(b))) return miss(`${id.replace(/\^\{(\d+)\}/g, '^$1')} çarpımı ${nums[0]} ediyor ama içinde asal olmayan çarpan var. Sağ sütunda hangi sayılar duruyor?`, 'Asal olmayan çarpanlarla yazdı')
    miss('Sağ sütundaki her asal sayının kaç kez yazıldığını say: üs, o asalın kaç kez çarpıldığını gösterir.', 'Üssü yanlış saydı')
  }

  const checkNum = () => {
    const v = parseNum(input)
    const [a, b] = nums
    if (phase === 'ebob') {
      if (v === gcd(a, b)) {
        track.attempt(true)
        sfx.ok()
        add(20, 'EBOB')
        setNudge(null)
        setInput('')
        return setPhase('ekok')
      }
      return miss(v === lcm(a, b) ? 'Bu, iki sayının da katı olan en küçük sayı. Biz ikisini birden BÖLEN en büyük sayıyı arıyoruz: yalnızca ⭐ işaretli basamakların bölenlerini çarp.' : 'İki sayıyı birden bölen basamaklar ⭐ ile işaretli. Yalnızca onların bölenlerini çarp.', v === lcm(a, b) ? 'EBOB ile EKOK’u karıştırdı' : undefined)
    }
    if (v === lcm(a, b)) {
      track.attempt(true)
      track.item(mistakes.current === 0)
      sfx.ok()
      add(20, 'EKOK')
      setNudge(null)
      return setPhase('done')
    }
    miss(v === gcd(a, b) ? 'Bu EBOB’du. EKOK, iki sayının da katı olan en küçük sayı: sağ sütundaki BÜTÜN bölenleri çarp.' : 'Sağ sütundaki bütün asal bölenleri çarp: her iki sayının da bütün asal çarpanları orada.', v === gcd(a, b) ? 'EKOK yerine EBOB buldu' : undefined)
  }

  return (
    <Split
      work={
        <Stage dark className="p-3">
          <Ladder rows={rows} two={two} finished={phase !== 'climb'} />
          <p className="mt-2 text-center text-sm font-bold text-slate-300">
            Sağ sütun: {divs.length ? divs.join(' · ') : '…'}
            {phase !== 'climb' && !two && <> = <span className="font-black text-white">{nums[0]}</span></>}
          </p>
        </Stage>
      }
      panel={
        <>
          {phase === 'climb' && (
            <>
              <Prompt step="Sıradaki basamak">
                {two ? <>Basamakta {cur.join(' ve ')} var. En az birini bölen bir asal sayı seç; bölünmeyen sayı aynen aşağı iner.</> : <>Basamakta {cur[0]} var. Onu tam bölen bir asal sayı seç ve bir basamak in.</>}
              </Prompt>
              <div className="grid grid-cols-4 gap-2">
                {PRIMES.map((p) => (
                  <button key={p} type="button" onClick={() => pick(p)} className="min-h-14 rounded-2xl bg-slate-100 text-xl font-black text-ink ring-2 ring-white transition hover:bg-white active:scale-95">
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
          {phase === 'form' && (
            <>
              <Prompt step="Zemine indin!">Sağ sütundaki asal bölenlerin çarpımı {nums[0]}. {ek(nums[0], 'acc')} asal çarpanlarıyla üslü yazan seçeneği bul.</Prompt>
              <Choices options={form.options.map((o) => ({ id: o, label: <MathText text={o} /> }))} value={picked} onPick={checkForm} />
            </>
          )}
          {(phase === 'ebob' || phase === 'ekok') && (
            <>
              <Prompt step={phase === 'ebob' ? 'EBOB' : 'EKOK'}>
                {phase === 'ebob' ? <>{nums[0]} ve {nums[1]} sayılarını <b>birlikte bölen en büyük</b> sayı kaç? Merdivene bak.</> : <>{nums[0]} ve {nums[1]} sayılarının <b>ortak katlarının en küçüğü</b> kaç? Merdivene bak.</>}
              </Prompt>
              <NumPad value={input} onChange={setInput} max={4} label={phase === 'ebob' ? 'EBOB' : 'EKOK'} />
              <CheckButton onClick={checkNum} disabled={!input} />
            </>
          )}
          {phase === 'done' && (
            <>
              <Card dark className="animate-fade-up">
                <p className="flex items-center gap-2 font-black text-emerald-300"><Sparkles size={18} />Merdiven tamam!</p>
                {two ? (
                  <p className="mt-1 text-sm font-bold text-slate-200">
                    EBOB({nums[0]}, {nums[1]}) = {bothDivs.join(' · ')} = {gcd(nums[0], nums[1])} — yalnızca ⭐ basamaklar. EKOK({nums[0]}, {nums[1]}) = {divs.join(' · ')} = {lcm(nums[0], nums[1])} — bütün basamaklar.
                    {' '}Bak: {gcd(nums[0], nums[1])} × {lcm(nums[0], nums[1])} = {nums[0] * nums[1]} = {nums[0]} × {nums[1]}.
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-bold text-slate-200">{nums[0]} = <MathText text={form.right} />. Hangi sırayla bölersen böl, sağ sütunda hep aynı asallar çıkar.</p>
                )}
              </Card>
              {askStrategy && <StrategyPicker options={STRATEGIES} onPick={() => undefined} question="Merdivenden inerken nasıl düşündün?" />}
              <NextButton last={last} onClick={() => onNext({ mistakes: mistakes.current, smallest: smallest.current, steps: divs.length })} />
            </>
          )}
          {nudge && <Nudge question={nudge.q} misconception={nudge.mis} tone={nudge.ok ? 'ok' : 'think'} onClose={() => setNudge(null)} />}
          {gain && (
            <p key={gain.id} className="self-start rounded-xl bg-amber-400/15 px-3 py-1.5 text-sm font-black text-amber-200 ring-1 ring-amber-300/40 animate-pop">
              +{gain.pts} · {gain.label}
            </p>
          )}
        </>
      }
    />
  )
}

/** Bölme tablosu: her satır bir maden basamağı; madenci etkin basamakta durur */
function Ladder({ rows, two, finished }: { rows: Row[]; two: boolean; finished: boolean }) {
  const active = rows.length - 1
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-black tracking-wide text-amber-200/80 uppercase"><Pickaxe size={14} />Maden girişi</div>
      <div className="relative pl-12">
        {/* merdiven */}
        <div className="absolute top-0 bottom-0 left-2 w-7 rounded-md" aria-hidden>
          <div className="absolute inset-y-0 left-0 w-1 rounded bg-amber-700" />
          <div className="absolute inset-y-0 right-0 w-1 rounded bg-amber-700" />
          {rows.map((_, i) => <div key={i} className="absolute right-0 left-0 h-1 rounded bg-amber-600" style={{ top: i * ROW + ROW / 2 }} />)}
        </div>
        <div className="absolute left-1 z-10 grid size-10 place-items-center text-3xl transition-[top] duration-500 ease-out" style={{ top: active * ROW + ROW / 2 - 20 }} aria-hidden>
          {finished ? '🙌' : '🧗'}
        </div>
        {rows.map((r, i) => {
          const isActive = i === active && !finished
          return (
            <div key={i} className={`flex items-stretch animate-fade-up ${isActive ? 'rounded-xl bg-pink-500/15 ring-2 ring-pink-400/60' : ''}`} style={{ height: ROW }}>
              <div className="flex flex-1 items-center justify-end gap-4 pr-4">
                {r.vals.map((v, j) => {
                  const moved = i > 0 && rows[i - 1].vals[j] === v && v !== 1 && rows[i - 1].p !== undefined
                  return (
                    <span key={j} className={`min-w-14 text-right text-2xl font-black tabular-nums ${v === 1 ? 'text-emerald-300' : moved ? 'text-slate-400' : 'text-white'}`}>
                      {v}
                    </span>
                  )
                })}
              </div>
              <div className="flex w-20 items-center gap-1.5 border-l-4 border-amber-300/80 pl-3">
                {r.p ? (
                  <span className="text-2xl font-black text-amber-300 animate-pop">{r.p}</span>
                ) : (
                  !finished && <span className="grid size-10 place-items-center rounded-lg border-2 border-dashed border-slate-500 text-lg font-black text-slate-500">?</span>
                )}
                {two && r.both && <Star size={18} className="fill-amber-300 text-amber-300 animate-pop" aria-label="ikisini de böler" />}
              </div>
            </div>
          )
        })}
        {finished && <div className="mt-1 rounded-lg bg-amber-900/40 py-1 text-center text-xs font-black text-amber-200">🏁 Zemine ulaştın</div>}
      </div>
    </div>
  )
}
