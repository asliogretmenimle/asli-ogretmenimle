import { useEffect, useRef, useState } from 'react'
import { Lightbulb, Rocket } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor, useFrame } from '../../kit'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { MathText } from '../../../components/MathText'
import { Card, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, Stepper } from '../../../interactions/donusum-studyosu/ortak'
import { levels, type Level, type Opt } from './levels'
import { Track, exitX, fracLabel, gcdI, type Ramp, type Trace } from './Track'

/**
 * Eğim Parkuru (8. sınıf, doğrusal denklemler)
 * Öğrenci rampanın dikliğini (yatay ve dikey değişim) ayarlar; kaykaycı rampanın doğrusu boyunca kayar ve yıldızı toplamaya çalışır.
 * Rampa gönderilmeden yalnızca rampa parçası ve eğim üçgeni görünür; her deneme düzlemde bir iz (grafik) bırakır,
 * böylece farklı eğimlerin grafikleri yan yana karşılaştırılır. Her seviyeden önce eğim tahmin edilir.
 * Puan: seviye başına 100 − 20 × ıska (en az 40) + doğru tahmin için 20.
 */

const fmt = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Math.round(v * 100) / 100).toLocaleString('tr-TR').replace('-', '−')
/** MathText biçiminde eğim: −[[1/2]] */
const mMath = (rise: number, run: number) => {
  const g = gcdI(Math.abs(rise), Math.abs(run)) || 1
  const a = Math.abs(rise / g), b = run / g
  const s = rise < 0 ? '−' : ''
  return b === 1 ? `${s}${a}` : `${s}[[${a}/${b}]]`
}
const eqMath = (r: Ramp) => {
  if (r.rise === 0) return `y = ${r.n}`
  const m = mMath(r.rise, r.run)
  const mx = m === '1' ? 'x' : m === '−1' ? '−x' : `${m}x`
  return `y = ${mx}${r.n ? ` + ${r.n}` : ''}`
}
const STRATEGY_AT = new Set([1, 5, 7])
const STRATEGIES = ['Hedefin koordinatlarını böldüm (y ÷ x)', 'Eğim üçgenini kullandım', 'Deneyip düzelttim', 'Başlangıç yüksekliğini çıkardım']

export default function EgimParkuru({ grade, onFinish }: GameProps) {
  const [li, setLi] = useState(0)
  const [score, setScore] = useState(0)
  const firsts = useRef(0)
  const level = levels[li]
  const last = li === levels.length - 1

  const next = (pts: number, first: boolean) => {
    const total = score + pts
    if (first) firsts.current++
    if (!last) {
      setScore(total)
      setLi(li + 1)
      return
    }
    onFinish({
      stars: starsFor(firsts.current / levels.length),
      score: total,
      summary: `${levels.length} parkuru tamamladın ve ${total} puan topladın.`,
      insight: 'Eğim, yatayda ilerlerken dikeyde ne kadar değiştiğimizi gösterir: m = dikey değişim ÷ yatay değişim. Eğim büyüdükçe doğru dikleşir, negatif eğimde aşağı iner, 0 eğimde yatay olur, dikey doğrunun eğimi tanımsızdır. y = mx + n doğrusunda n başlangıç yüksekliğidir; eğimleri eşit doğrular paraleldir.',
    })
  }

  return (
    <Scene grade={grade}>
      <Header emoji={level.emoji} kicker="Parkur" title={level.title} idx={li} total={levels.length} dark right={<span className="chip bg-amber-400/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-400/40">🏅 {score}</span>} />
      <LevelView key={li} level={level} idx={li} last={last} onNext={next} />
    </Scene>
  )
}

type Note = { text: string; tone: 'think' | 'ok'; mis?: string } | null
type Anim = { r: Ramp; xEnd: number; t: number; hits: boolean[] }

function LevelView({ level, idx, last, onNext }: { level: Level; idx: number; last: boolean; onNext: (pts: number, first: boolean) => void }) {
  const track = useTracker()
  const sol = useSolutions()
  const [ramp, setRamp] = useState<Ramp>({ ...level.init, n: level.n })
  const [guess, setGuess] = useState<string | null>(null)
  const [traces, setTraces] = useState<Trace[]>([])
  const [anim, setAnim] = useState<Anim | null>(null)
  const [gotFinal, setGotFinal] = useState<boolean[]>(level.stars.map(() => false))
  const [note, setNote] = useState<Note>(null)
  const [solved, setSolved] = useState(false)
  const [afterOk, setAfterOk] = useState(!level.after)
  const [afterWrong, setAfterWrong] = useState<Opt | null>(null)
  const fails = useRef(0)
  const pts = useRef(0)

  const needGuess = !!level.guess && guess === null
  const editable = !anim && !solved && !needGuess
  const dur = anim ? 0.5 + anim.xEnd * 0.17 : 1

  useFrame((dt) => setAnim((a) => (a ? { ...a, t: Math.min(1, a.t + dt / dur) } : a)), !!anim && anim.t < 1)

  const skX = anim ? anim.xEnd * anim.t : 0
  const skater = anim ? { x: skX, y: anim.r.n + (anim.r.rise / anim.r.run) * skX } : null
  const got = anim ? level.stars.map(([x], i) => anim.hits[i] && skX >= x - 1e-6) : gotFinal

  useEffect(() => {
    if (!anim || anim.t < 1) return
    finish(anim)
  }, [anim])

  const launch = () => {
    if (!editable) return
    if (ramp.run === 0) {
      setNote({ tone: 'think', text: 'Yatay değişim 0: rampa duvar gibi dikey! Eğim = dikey değişim ÷ 0 olurdu; 0’a bölme yapılamaz, bu yüzden dikey doğrunun eğimi tanımsızdır. Kaykaycı ileri gidemez; rampayı biraz ileri uzat.' })
      return
    }
    const r = { ...ramp }
    const hits = level.stars.map(([x, y]) => r.rise * x + r.n * r.run === y * r.run)
    setNote(null)
    setAnim({ r, xEnd: exitX(r), t: 0, hits })
  }

  const finish = (a: Anim) => {
    const all = a.hits.every(Boolean)
    setTraces((t) => [...t, { ...a.r, hit: all }])
    setGotFinal(a.hits)
    setAnim(null)
    if (all) {
      if (level.solutions) {
        const key = `${fracLabel(a.r.rise, a.r.run)}|${a.r.n}`
        if (!sol.add(key, eqMath(a.r))) {
          setNote({ tone: 'think', text: 'Bu rampayı zaten kurdun. Başlangıç yüksekliğini değiştir: yıldıza ulaşmak için eğim nasıl değişmeli?' })
          return
        }
        if (sol.list.length + 1 < level.solutions) {
          setNote({ tone: 'ok', text: `Yıldıza ulaştın: ${eqMath(a.r)}. ${level.solutions - sol.list.length - 1} farklı rampa daha kur!` })
          setGotFinal(level.stars.map(() => false))
          return
        }
      } else sfx.ok()
      complete(a.r)
      return
    }
    fail(a)
  }

  const complete = (r: Ramp) => {
    track.attempt(true)
    track.item(fails.current === 0)
    const guessOk = level.guess ? guess === level.guess.answer : false
    pts.current = Math.max(40, 100 - 20 * fails.current) + (guessOk ? 20 : 0)
    setSolved(true)
    const gTxt = level.guess ? (guessOk ? ' Tahminin de doğruydu: +20 puan!' : ` Tahminin ${guess} idi; doğru eğim ${level.guess.answer}.`) : ''
    setNote({ tone: 'ok', text: `Yıldız toplandı! Rampanın eğimi ${mMath(r.rise, r.run)}, denklemi ${eqMath(r)}.${gTxt}` })
  }

  const fail = (a: Anim) => {
    fails.current++
    track.attempt(false)
    sfx.bad()
    const r = a.r
    const m = r.rise / r.run
    const i = a.hits.findIndex((h) => !h)
    const [tx, ty] = level.stars[i]
    const yAt = m * tx + r.n
    const diff = yAt - ty
    const need = (ty - r.n) / tx
    let mis: string | undefined
    let extra = ''
    if (r.rise !== 0 && r.rise !== r.run && Math.abs(r.run / r.rise - need) < 1e-9) {
      mis = 'Eğimi yatay değişim ÷ dikey değişim olarak aldı'
      extra = ' Eğimde hangisi pay, hangisi payda: ileri gidiş mi, yükseliş mi?'
    } else if (need < 0 && m > 0) {
      mis = 'Aşağı inen doğrunun eğimini pozitif aldı'
      extra = ' Yıldız rampanın başlangıcından daha alçakta; ilerledikçe alçalan bir rampanın eğimi nasıl bir sayı olur?'
    } else if (r.n !== 0 && Math.abs(m - ty / tx) < 1e-9) {
      mis = 'Eğimi hesaplarken başlangıç yüksekliğini (n) hesaba katmadı'
      extra = ` Rampa 0’dan değil ${r.n} yüksekliğinden başlıyor; yıldıza kadar gerçekte kaç birim yükselmesi gerekiyor?`
    }
    const where = diff > 0 ? `${fmt(diff)} birim üstünden` : `${fmt(-diff)} birim altından`
    const dir = diff > 0 ? 'azaltmalı' : 'artırmalı'
    setNote({ tone: 'think', mis, text: `x = ${tx} olduğunda kaykaycı y = ${fmt(yAt)} yüksekliğindeydi; yıldız y = ${ty}. Yıldızın ${where} geçti. Eğimi ${dir} mısın?${extra}` })
  }

  const hint = () => {
    track.hint()
    const [tx, ty] = level.stars[0]
    const s = level.stars[1]
    setNote({
      tone: 'think',
      text: s
        ? `İki yıldız arasında yatayda ${s[0] - tx} birim, dikeyde ${s[1] - ty} birim değişim var. Eğim = dikey ÷ yatay. Sonra ilk yıldızdan x = 0’a geri yürü: n ne olur?`
        : level.nFree
          ? `Bir başlangıç yüksekliği seç (ör. n = 3). Yıldıza kadar yatayda ${tx}, dikeyde ${ty} − n birim var. Eğim = dikey ÷ yatay.`
          : `Rampanın başından yıldıza: yatayda ${tx} birim, dikeyde ${ty} − ${ramp.n} = ${ty - ramp.n} birim. Eğim = dikey değişim ÷ yatay değişim.`,
    })
  }

  const setN = (n: number) => {
    const top = Math.max(-1, Math.min(10, n + ramp.rise))
    setRamp({ ...ramp, n, rise: top - n })
    setNote(null)
  }
  const change = (r: Ramp) => {
    setRamp(r)
    setNote(null)
  }

  const done = solved && afterOk
  const work = (
    <Stage dark>
      <Track ramp={ramp} stars={level.stars} got={got} traces={traces} ghost={level.ghost} skater={skater} editable={editable} nFree={level.nFree} onChange={change} />
      <p className="mt-1 text-center text-xs font-bold text-slate-400">Pembe ucu sürükle{level.nFree ? ', başlangıç noktasını yukarı-aşağı kaydır' : ''} ya da sağdaki düğmeleri kullan.</p>
    </Stage>
  )

  const panel = (
    <>
      <Prompt step="Görev"><MathText text={level.prompt} /></Prompt>
      {level.guess && (
        <Card dark>
          <p className="mb-2 text-xs font-black tracking-wide text-amber-300 uppercase">Önce tahmin et: eğim kaç olmalı?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {level.guess.options.map((o) => (
              <button key={o} type="button" disabled={guess !== null} onClick={() => setGuess(o)} aria-pressed={guess === o} className={`min-h-12 rounded-xl text-lg font-black ring-1 transition active:scale-95 ${guess === o ? 'bg-amber-400 text-amber-950 ring-amber-500' : 'bg-slate-700 text-white ring-slate-500'} disabled:cursor-default`}>
                <MathText text={o} />
              </button>
            ))}
          </div>
          {guess !== null && !solved && <p className="mt-2 text-sm font-bold text-slate-300">Tahminin kaydedildi. Şimdi rampayı kur ve dene!</p>}
        </Card>
      )}
      <Card dark className={needGuess ? 'opacity-50' : ''}>
        <div className="grid gap-2">
          {level.nFree && <Stepper label="Başlangıç yüksekliği (n)" value={ramp.n} min={0} max={10} onChange={(v) => editable && setN(v)} dark />}
          <Stepper label="İleri (yatay değişim)" value={ramp.run} min={0} max={8} onChange={(v) => editable && change({ ...ramp, run: v })} dark />
          <Stepper label={ramp.rise >= 0 ? 'Yukarı (dikey değişim)' : 'Aşağı (dikey değişim)'} value={ramp.rise} min={-1 - ramp.n} max={10 - ramp.n} onChange={(v) => editable && change({ ...ramp, rise: v })} dark />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/70 p-3 text-center">
          <div>
            <p className="text-[11px] font-black tracking-wide text-sky-300 uppercase">Eğim</p>
            <p className="text-2xl font-black text-white">{ramp.run === 0 ? <span className="text-base">tanımsız</span> : <MathText text={mMath(ramp.rise, ramp.run)} />}</p>
            {ramp.run > 0 && <p className="text-xs font-bold text-slate-400">{ramp.rise} ÷ {ramp.run}</p>}
          </div>
          <div>
            <p className="text-[11px] font-black tracking-wide text-pink-300 uppercase">Doğru</p>
            <p className="text-lg font-black text-white">{ramp.run === 0 ? 'x = 0' : <MathText text={eqMath(ramp)} />}</p>
          </div>
        </div>
      </Card>
      {note && <Nudge key={note.text} question={note.text} tone={note.tone} misconception={note.mis} onClose={note.tone === 'think' ? () => setNote(null) : undefined} />}
      {level.solutions && <SolutionList list={sol.list} goal={level.solutions} />}
      {!solved && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={launch} disabled={!editable} className="btn-primary min-h-14 text-lg"><Rocket size={20} />Gönder</button>
          <GhostButton onClick={hint} disabled={!editable} dark className="min-h-14 px-4"><Lightbulb size={18} />İpucu</GhostButton>
        </div>
      )}
      {solved && level.after && !afterOk && (
        <Card className="animate-fade-up">
          <p className="mb-2 font-black text-ink"><MathText text={level.after.q} /></p>
          <div className="grid gap-2">
            {level.after.options.map((o) => (
              <button key={o.label} type="button" onClick={() => {
                if (o.ok) {
                  setAfterOk(true)
                  setAfterWrong(null)
                  sfx.ok()
                } else {
                  setAfterWrong(o)
                  track.attempt(false)
                }
              }} className="min-h-12 rounded-xl bg-white px-3 text-left font-extrabold text-ink ring-1 ring-line hover:bg-sky-50">{o.label}</button>
            ))}
          </div>
          {afterWrong?.nudge && <Nudge key={afterWrong.label} question={afterWrong.nudge} />}
        </Card>
      )}
      {done && (
        <div className="flex flex-col gap-3 animate-fade-up">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-950 ring-1 ring-emerald-200">
            <p className="text-xs font-black tracking-wide text-emerald-700 uppercase">Ne keşfettik?</p>
            <p className="mt-1 text-[15px] font-bold"><MathText text={level.insight} /></p>
          </div>
          {STRATEGY_AT.has(idx) && <StrategyPicker options={STRATEGIES} onPick={() => undefined} />}
          <NextButton last={last} onClick={() => onNext(pts.current, fails.current === 0)} />
        </div>
      )}
    </>
  )
  return <Split work={work} panel={panel} />
}

