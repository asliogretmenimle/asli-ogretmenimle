import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Eye, FlaskConical, Lock, PackageOpen, Shuffle, Sparkles } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Choice, NextButton, Panel, Pill, Stepper, TopBar, Work, fmtN, fracT, rint, shuffle, starsBy, useLook, useRaf, useSay, type Look } from '../veri-toplama/kit'
import { COL, DeviceView, FreqBars, FreqChart, ProbLine, RunButtons, outcomes, theory, useTrials, type Device, type Mark, type Out } from './devices'

/**
 * 65. Olasılık Simülatörü (5–8)
 *  Tahmin et → çok sayıda deneme yap (animasyonlu) → göreli sıklığın kuramsal değere yaklaşmasını izle.
 *  Görev türleri:
 *   - place:   olayları 0–1 olasılık doğrusuna yerleştir (olasılık bir sürekliliktir), sonra deneyle sına
 *   - predict: olasılık doğrusunda tahmin et, 1/10/100/1000 deneme yap, deney–kuram–tahmin karşılaştır
 *   - tack:    raptiye: kuramı olmayan olay → olasılığı ancak deneyle kestiririz
 *   - mystery: gizli torba: iadeli çekilişlerle torbanın içini kestir, sonra aç
 *   - cloud:   20 grup aynı deneyi 10/100/1000 kez yapar → örneklem büyüdükçe sonuçlar toplanır
 *   - design:  koşulu sağlayan farklı torbalar tasarla (birden çok çözüm)
 *   - approach (8): öznel / deneysel / kuramsal yaklaşım seçimi
 */

type Res = { first: boolean }
type Ev = { label: string; p: number }
type Task =
  | { kind: 'place'; title: string; device: Device; events: Ev[]; testFocus: { label: string; idx: number[] }[] }
  | { kind: 'predict'; title: string; device: Device; focus: number; focusLabel: string; complement?: boolean }
  | { kind: 'tack'; title: string }
  | { kind: 'mystery'; title: string; colors: Out[]; total: number }
  | { kind: 'cloud'; title: string; device: Device; focus: number; focusLabel: string }
  | { kind: 'design'; title: string; rule: 'likely' | 'quarter' | 'equal'; need: number }
  | { kind: 'approach'; title: string }

const RED = { label: 'Kırmızı', color: COL.red }
const BLUE = { label: 'Mavi', color: COL.blue }
const GREEN = { label: 'Yeşil', color: COL.green }

function tasksFor(grade: Grade): Task[] {
  const spinner34: Device = { kind: 'spinner', sectors: [{ ...RED, w: 3 }, { ...BLUE, w: 1 }] }
  const spinnerUneven: Device = { kind: 'spinner', sectors: [{ ...RED, w: 1 }, { ...BLUE, w: 2 }, { ...GREEN, w: 3 }] }
  const bag5: Device = { kind: 'bag', balls: [{ ...RED, w: 5 }, { ...BLUE, w: 3 }] }
  const reds = rint(2, 8)
  const mystery2: Task = { kind: 'mystery', title: 'Gizli torbada 10 bilye var. İçine bakmadan kaç tanesinin kırmızı olduğunu kestir!', colors: [{ ...RED, w: reds }, { ...BLUE, w: 10 - reds }], total: 10 }
  const r3 = rint(2, 6), b3 = rint(2, 10 - r3 - 1)
  const mystery3: Task = { kind: 'mystery', title: 'Gizli torbada 12 bilye var: kırmızı, mavi ve yeşil. Her renkten kaç tane var?', colors: [{ ...RED, w: r3 }, { ...BLUE, w: b3 }, { ...GREEN, w: 12 - r3 - b3 }], total: 12 }
  const cloudCoin: Task = { kind: 'cloud', title: '20 grup aynı anda para atıyor. Kaç atış yaparlarsa sonuçlarına güvenebiliriz?', device: { kind: 'coin' }, focus: 0, focusLabel: 'yazı' }
  const cloudDie: Task = { kind: 'cloud', title: '20 grup zar atıyor ve 6 gelme oranını buluyor. Örneklem büyüklüğü neyi değiştirir?', device: { kind: 'die' }, focus: 5, focusLabel: '6' }
  switch (grade) {
    case 5:
      return [
        { kind: 'place', title: 'Torbadan bakmadan bir bilye çekeceğiz. Olayları olasılık doğrusuna yerleştir.', device: bag5, events: [
          { label: 'Kırmızı çekmek', p: 5 / 8 }, { label: 'Mavi çekmek', p: 3 / 8 }, { label: 'Yeşil çekmek', p: 0 }, { label: 'Kırmızı ya da mavi çekmek', p: 1 },
        ], testFocus: [{ label: 'Kırmızı', idx: [0] }, { label: 'Mavi', idx: [1] }] },
        { kind: 'predict', title: 'Çarkın oku kırmızıda durur mu? Önce tahmin et, sonra çarkı çok kez çevir.', device: spinner34, focus: 0, focusLabel: 'Kırmızı' },
        cloudCoin,
        { kind: 'design', title: 'Bir torba tasarla: Kırmızı çekmek olası ama kesin olmasın, yeşil çekmek imkânsız olsun.', rule: 'likely', need: 2 },
      ]
    case 6:
      return [
        { kind: 'predict', title: 'Zarda 6 gelme olasılığı ne kadar? Tahmin et, sonra zarı yüzlerce kez at.', device: { kind: 'die' }, focus: 5, focusLabel: '6' },
        { kind: 'tack', title: 'Bir raptiye atınca ucu yukarı mı gelir, yan mı yatar? Bunu hesaplayabilir miyiz?' },
        mystery2,
        cloudCoin,
        { kind: 'design', title: 'Kırmızı çekme olasılığı [[1/4]] olan farklı torbalar tasarla.', rule: 'quarter', need: 2 },
      ]
    case 7:
      return [
        { kind: 'place', title: 'Bir zar atılıyor. Olayları olasılık doğrusuna yerleştir.', device: { kind: 'die' }, events: [
          { label: '6 gelmesi', p: 1 / 6 }, { label: '6 gelmemesi', p: 5 / 6 }, { label: 'Çift sayı gelmesi', p: 1 / 2 }, { label: '7 gelmesi', p: 0 }, { label: '1 ile 6 arası gelmesi', p: 1 },
        ], testFocus: [{ label: '6', idx: [5] }, { label: '6 değil', idx: [0, 1, 2, 3, 4] }, { label: 'Çift', idx: [1, 3, 5] }] },
        { kind: 'predict', title: 'Zarda “6 gelmesi” ile “6 gelmemesi” olaylarını aynı anda izle. Ne fark ediyorsun?', device: { kind: 'die' }, focus: 5, focusLabel: '6', complement: true },
        mystery3,
        cloudDie,
        { kind: 'design', title: 'Kırmızı, mavi ve yeşil çekmek eş olasılıklı olsun. Farklı torbalar tasarla.', rule: 'equal', need: 2 },
      ]
    default:
      return [
        { kind: 'approach', title: 'Bu olayların olasılığını hangi yaklaşımla belirlersin?' },
        { kind: 'tack', title: 'Raptiyenin ucu yukarı gelme olasılığını kuramla mı, deneyle mi bulursun?' },
        { kind: 'predict', title: 'Bu çarkta yeşil gelme olasılığını tahmin et ve deneyle sına.', device: spinnerUneven, focus: 2, focusLabel: 'Yeşil' },
        mystery3,
        cloudDie,
      ]
  }
}

const EMOJI: Record<Task['kind'], string> = { place: '📏', predict: '🎯', tack: '📌', mystery: '🎒', cloud: '☁️', design: '🛠️', approach: '🧭' }

// ───────────────────────── Yardımcılar ─────────────────────────

const theoryText = (grade: Grade, a: number, b: number) => (grade >= 6 ? fracT(a, b) : `${b}’de ${a}`)
const freqText = (k: number, n: number) => `[[${fmtN(k)}/${fmtN(n)}]] ≈ ${fmtN(n ? k / n : 0, 2)}`

function TrialStats({ look, n, k, label, theoryV, hideN }: { look: Look; n: number; k: number; label: string; theoryV?: string; hideN?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideN && <Pill look={look}>Deneme: <b className="tabular-nums">{fmtN(n)}</b></Pill>}
      <Pill look={look} tone="info">{label}: <span className="tabular-nums"><MathText text={n ? freqText(k, n) : '—'} /></span></Pill>
      {theoryV && <Pill look={look} tone="good">Kuram: <MathText text={theoryV} /></Pill>}
    </div>
  )
}

function Legend({ look, items }: { look: Look; items: { color: string; label: string; dash?: string }[] }) {
  return (
    <div className={`mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-extrabold ${look.muted}`}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <svg width="26" height="8" aria-hidden><line x1="1" x2="25" y1="4" y2="4" stroke={it.color} strokeWidth="3" strokeDasharray={it.dash} strokeLinecap="round" /></svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

// ───────────────────────── place ─────────────────────────

const zoneOk = (p: number, v: number) => {
  if (p === 0) return v <= 0.06
  if (p === 1) return v >= 0.94
  if (Math.abs(p - 0.5) < 1e-9) return Math.abs(v - 0.5) <= 0.1
  if (p < 0.5) return v > 0.03 && v < 0.5 && Math.abs(v - p) <= 0.3
  return v > 0.5 && v < 0.97 && Math.abs(v - p) <= 0.3
}

function PlaceTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'place' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const palette = ['#7c3aed', '#0891b2', '#db2777', '#ea580c', '#16a34a']
  const [vals, setVals] = useState<(number | null)[]>(t.events.map(() => null))
  const [sel, setSel] = useState<number | null>(0)
  const [ok, setOk] = useState(false)
  const misses = useRef(0)
  const tr = useTrials(t.device)
  const outs = outcomes(t.device)
  const tw = outs.reduce((s, o) => s + o.w, 0)
  const marks: Mark[] = t.events.map((_, i) => ({ id: String(i), v: vals[i], color: palette[i], label: `${i + 1}`, drag: !ok }))
  const ghosts: Mark[] = ok && tr.n > 0 ? t.testFocus.map((f, j) => ({ id: `g${j}`, v: f.idx.reduce((s, ix) => s + tr.counts[ix], 0) / tr.n, color: '#64748b', label: f.label, ghost: true })) : []

  const check = () => {
    const bad = t.events.findIndex((e, i) => !zoneOk(e.p, vals[i]!))
    const order = t.events.every((a, i) => t.events.every((b, j) => !(a.p < b.p - 1e-9) || vals[i]! <= vals[j]! + 0.02))
    const good = bad < 0 && order
    track.attempt(good)
    if (good) {
      sfx.ok()
      setOk(true)
      track.item(misses.current === 0)
      fb.say('Harika! Olasılık 0 ile 1 arasında bir sayıdır: imkânsız 0’da, kesin 1’de, ötekiler arada. Şimdi deneyle sına: çok kez çek ve gri işaretleri izle.', { tone: 'ok' })
      return
    }
    misses.current++
    const e = bad >= 0 ? t.events[bad] : null
    if (e && e.p === 0) fb.say(`“${e.label}”: Torbada/zarda bu sonuç hiç var mı? Hiç olamayacak bir olay doğrunun neresinde durmalı?`, { mis: 'İmkânsız olayı 0’a yerleştirmedi' })
    else if (e && e.p === 1) fb.say(`“${e.label}”: Bu olay her çekilişte/atışta gerçekleşir mi? Her zaman olan bir olay nerede durmalı?`, { mis: 'Kesin olayı 1’e yerleştirmedi' })
    else if (e && Math.abs(e.p - 0.5) < 1e-9) fb.say(`“${e.label}”: Bu olayın olduğu ve olmadığı sonuçları say. Hangisi daha çok? Eşitse nerede durmalı?`)
    else if (e) fb.say(`“${e.label}”: Bu olaya uyan sonuçlar mı daha çok, uymayanlar mı? Yarı yarıya noktasının hangi tarafında olmalı?`, { mis: 'Olayın olasılığını yarı yarıya noktasına göre yanlış konumlandırdı' })
    else fb.say('Daha çok sonucu olan olay doğruda daha sağda olmalı. İki olayı karşılaştır: hangisinin olma şansı daha fazla?', { mis: 'Olayları olasılıklarına göre sıralayamadı' })
  }

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid items-center gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <DeviceView d={t.device} t={tr} size={160} />
              {t.device.kind === 'bag' && <p className={`text-center text-sm font-extrabold ${look.muted}`}>{outs.map((o) => `${o.w} ${o.label.toLocaleLowerCase('tr')}`).join(', ')}</p>}
            </div>
            <div className="space-y-2">
              {t.events.map((e, i) => (
                <button key={i} type="button" disabled={ok} onClick={() => setSel(i)} className={`flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-left font-extrabold transition ${sel === i && !ok ? look.chipOn : look.chip}`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-black text-white" style={{ background: palette[i] }}>{i + 1}</span>
                  <span className="flex-1">{e.label}</span>
                  {vals[i] === null ? <span className={`text-xs ${look.muted}`}>yerleştir</span> : ok && grade >= 6 ? <MathText text={fracT(Math.round(e.p * 24), 24)} /> : <span className="text-emerald-500">●</span>}
                </button>
              ))}
            </div>
          </div>
          <div className={`mt-3 rounded-2xl p-2 ${look.soft}`}>
            <ProbLine look={look} marks={[...ghosts, ...marks]} selected={ok ? null : sel === null ? null : String(sel)} onSelect={(id) => setSel(Number(id))} onMove={(id, v) => { if (ok) return; setVals((a) => a.map((x, i) => (String(i) === id ? v : x))); setSel(Number(id)) }} numbers={grade >= 6} />
          </div>
          <p className={`mt-1 text-center text-sm font-bold ${look.muted}`}>Bir olay seç, sonra doğruda yerine dokun. İşaretleri sürükleyerek düzeltebilirsin.</p>
        </Scene>
      }
      panel={
        <Panel look={look} title={ok ? 'Deneyle sına' : 'Olasılık doğrusu'} icon="📏">
          {!ok && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>Her olay için kendine sor: Bu olay hiç olmaz mı, her zaman mı olur, yoksa arada mı?</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" disabled={vals.some((v) => v === null)} onClick={check}>Yerleşimi kontrol et</button>
            </>
          )}
          {fb.node}
          {ok && (
            <>
              <div className="mt-3"><RunButtons look={look} t={tr} sizes={[1, 10, 100, 1000]} /></div>
              <div className="mt-3 space-y-1">
                {t.testFocus.map((f, j) => {
                  const k = f.idx.reduce((s, ix) => s + tr.counts[ix], 0)
                  return <TrialStats key={f.label} look={look} n={tr.n} k={k} label={f.label} hideN={j > 0} />
                })}
              </div>
              {tr.n >= 100 && <p className={`mt-2 text-sm font-bold ${look.muted}`}>Gri işaretler senin yerleştirdiğin olayların yakınında mı? {grade >= 6 ? `Kuramsal değerler: ${t.testFocus.map((f) => `${f.label} ${fracT(f.idx.reduce((s, ix) => s + outs[ix].w, 0), tw)}`).join(', ')}.` : ''}</p>}
              <NextButton disabled={tr.n < 100} label={tr.n < 100 ? 'En az 100 deneme yap' : undefined} onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}

// ───────────────────────── predict ─────────────────────────

function PredictTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'predict' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const tr = useTrials(t.device)
  const outs = outcomes(t.device)
  const tw = outs.reduce((s, o) => s + o.w, 0)
  const th = theory(t.device, t.focus)!
  const [guess, setGuess] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [qDone, setQDone] = useState(false)
  const [wrong, setWrong] = useState<string[]>([])
  const misses = useRef(0)
  const k = tr.counts[t.focus]
  const f = tr.n ? k / tr.n : 0
  const notK = tr.n - k
  const showTheory = qDone
  const thT = theoryText(grade, outs[t.focus].w, tw)

  const marks: Mark[] = [
    ...(guess !== null ? [{ id: 'g', v: guess, color: '#f59e0b', label: 'Tahminim', drag: !locked, ghost: locked } as Mark] : []),
    ...(locked && tr.n ? [{ id: 'f', v: f, color: '#7c3aed', label: 'Deney' } as Mark] : []),
    ...(t.complement && locked && tr.n ? [{ id: 'nf', v: 1 - f, color: '#0891b2', label: '6 değil' } as Mark] : []),
    ...(showTheory ? [{ id: 't', v: th, color: '#16a34a', label: 'Kuram', ghost: true } as Mark] : []),
  ]

  const question = t.complement
    ? {
        q: 'Mor (6) ve mavi (6 değil) çizgilere bak. Her an ne doğru?',
        opts: [
          { t: 'İki göreli sıklığın toplamı her zaman 1’dir.', ok: true },
          { t: 'İki çizgi zamanla birbirine eşit olur.', ok: false, why: 'Zarda 6 olmayan kaç yüz var? İki olayın sonuç sayıları eşit mi?', mis: 'Olay ve tümleyeninin olasılıklarının eşit olacağını düşündü' },
          { t: 'Toplamları deneme sayısına göre değişir.', ok: false, why: 'Her atışta ya 6 gelir ya gelmez. Bir atış iki sayaçtan kaçını artırır? O zaman oranların toplamı ne olur?' },
        ],
      }
    : {
        q: 'Deneme sayısı arttıkça grafikte ne oldu?',
        opts: [
          { t: 'Çizgi önce çok dalgalandı, sonra bir değerin çevresine yerleşti.', ok: true },
          { t: 'İlk 10 denemede de sonuç hep aynı orandaydı.', ok: false, why: 'Grafiğin en solundaki kısmına bak (iki parmakla yakınlaştırabilirsin). Çizgi orada ne kadar inip çıkıyor?' },
          { t: `Çok deneme yapınca ${t.focusLabel.toLocaleLowerCase('tr')} daha sık gelmeye başladı.`, ok: false, why: 'Çark ya da zar önceki sonuçları hatırlar mı? Her denemede şansı değişir mi, yoksa yalnızca oranı daha iyi mi görüyoruz?', mis: 'Rastgele aracın geçmiş sonuçları hatırladığını düşündü (kumarbaz yanılgısı)' },
        ],
      }
  const opts = useMemo(() => shuffle(question.opts), [t])

  const answer = (o: (typeof question.opts)[number]) => {
    track.attempt(o.ok)
    if (o.ok) {
      sfx.ok()
      setQDone(true)
      track.item(misses.current === 0)
      const diff = Math.abs((guess ?? 0) - th)
      fb.say(`${t.complement ? 'Evet! Bir olayın olasılığı ile tümleyeninin olasılığı toplamı 1’dir: [[1/6]] + [[5/6]] = 1.' : `Evet! Çok sayıda denemede göreli sıklık kuramsal olasılığa (${thT}) yaklaşır.`} Tahminin kurama ${diff <= 0.08 ? 'çok yakındı' : diff <= 0.2 ? 'oldukça yakındı' : 'uzaktı; deney sana yeni bir şey öğretti'}.`, { tone: 'ok' })
    } else {
      misses.current++
      setWrong((w) => [...w, o.t])
      fb.say(o.why!, { mis: o.mis })
    }
  }

  const colors = t.complement ? ['#7c3aed', '#0891b2'] : ['#7c3aed']
  const focusIdx = t.complement ? [t.focus] : [t.focus]

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid items-center gap-3 sm:grid-cols-[200px_1fr]">
            <div>
              <DeviceView d={t.device} t={tr} size={180} />
              {t.device.kind === 'spinner' && !showTheory && <p className={`text-center text-xs font-bold ${look.muted}`}>Dilimlerin büyüklüğüne bak.</p>}
            </div>
            <div className="min-w-0">
              {locked ? (
                <>
                  <FreqBars look={look} outs={outs} counts={tr.counts} n={tr.n} theoryV={showTheory ? outs.map((_, i) => theory(t.device, i)) : undefined} height={110} />
                  <p className={`text-center text-xs font-bold ${look.muted}`}>Sütunlar: her sonucun göreli sıklığı{showTheory ? ' · kesikli çizgi: kuramsal olasılık' : ''}</p>
                </>
              ) : (
                <p className={`rounded-2xl p-4 text-center text-lg font-extrabold ${look.soft}`}>Önce tahmin: “{t.focusLabel}” gelme olasılığı olasılık doğrusunun neresinde?</p>
              )}
            </div>
          </div>
          <div className={`mt-3 rounded-2xl p-2 ${look.soft}`}>
            <ProbLine look={look} marks={marks} selected={locked ? null : 'g'} onMove={(id, v) => id === 'g' && !locked && setGuess(v)} numbers={grade >= 6} />
          </div>
          {locked && (
            <div className="mt-3">
              <FreqChart t={tr} focus={t.complement ? [t.focus] : focusIdx} colors={colors} theoryV={showTheory ? [th] : undefined} guess={guess} />
              {t.complement && tr.n > 0 && <ComplementOverlay look={look} k={notK} n={tr.n} />}
              <Legend look={look} items={[{ color: '#7c3aed', label: `“${t.focusLabel}” göreli sıklığı` }, { color: '#f59e0b', label: 'tahminim', dash: '2 6' }, ...(showTheory ? [{ color: '#7c3aed', label: 'kuramsal olasılık', dash: '10 7' }] : [])]} />
            </div>
          )}
        </Scene>
      }
      panel={
        <Panel look={look} title={!locked ? 'Önce tahmin et' : !qDone ? 'Deneyi yap' : 'Deney ve kuram'} icon={!locked ? '🤔' : '🧪'}>
          {!locked && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>Olasılık doğrusuna dokunarak turuncu “Tahminim” işaretini koy. Sürükleyerek düzeltebilirsin.</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" disabled={guess === null} onClick={() => { setLocked(true); track.strategy(guess !== null && Math.abs(guess - th) <= 0.1 ? 'Tahmini kurama yakın' : 'Tahmin deneyle düzeltildi') }}><Lock size={18} />Tahminimi kilitle</button>
            </>
          )}
          {locked && (
            <>
              <RunButtons look={look} t={tr} />
              <div className="mt-3 space-y-1.5">
                <TrialStats look={look} n={tr.n} k={k} label={t.focusLabel} theoryV={showTheory ? thT : undefined} />
                {t.complement && <TrialStats hideN look={look} n={tr.n} k={notK} label="6 değil" theoryV={showTheory ? fracT(5, 6) : undefined} />}
              </div>
              {tr.n < 500 && <p className={`mt-2 text-sm font-bold ${look.muted}`}>Önce birkaç tek deneme, sonra +100 ve +1000 dene. Toplam en az 500 deneme yap.</p>}
              {tr.n >= 500 && !qDone && (
                <div className="mt-3">
                  <p className="mb-2 font-black">{question.q}</p>
                  <div className="grid gap-2">{opts.map((o) => <Choice key={o.t} look={look} text={o.t} state={wrong.includes(o.t) ? 'wrong' : 'idle'} disabled={wrong.includes(o.t)} onClick={() => answer(o)} />)}</div>
                </div>
              )}
            </>
          )}
          {fb.node}
          {qDone && (
            <>
              <StrategyPicker question="Tahminini neye dayanarak yaptın?" options={['Sonuçları saydım', 'Çarkın/zarın şekline baktım', 'Sezgimle', 'Önceki deneyimle']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}

function ComplementOverlay({ look, k, n }: { look: Look; k: number; n: number }) {
  const a = n - k
  return (
    <div className={`mt-2 flex h-9 overflow-hidden rounded-xl text-sm font-black text-white ring-1 ${look.dark ? 'ring-slate-600' : 'ring-line'}`} aria-label="6 ve 6 değil oranları">
      <div className="grid place-items-center bg-violet-600 transition-[width] duration-150" style={{ width: `${(a / n) * 100}%` }}>{a / n > 0.1 ? `6: ${fmtN(a / n, 2)}` : ''}</div>
      <div className="grid flex-1 place-items-center bg-cyan-600">6 değil: {fmtN(k / n, 2)}</div>
    </div>
  )
}

// ───────────────────────── tack ─────────────────────────

function TackTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'tack' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  void t
  const track = useTracker()
  const fb = useSay()
  const d: Device = { kind: 'tack' }
  const tr = useTrials(d)
  const [phase, setPhase] = useState<'why' | 'run' | 'estimate' | 'done'>('why')
  const [wrong, setWrong] = useState<string[]>([])
  const [est, setEst] = useState<number | null>(null)
  const misses = useRef(0)
  const f = tr.n ? tr.counts[0] / tr.n : 0
  const opts = useMemo(() => shuffle([
    { t: 'İki sonuç var; o hâlde olasılık [[1/2]]’dir.', ok: false, why: 'Raptiyenin iki yüzü bir paranın iki yüzü gibi mi? Şekli iki sonuca eşit şans veriyor mu?', mis: 'İki sonuç olduğu için eş olasılıklı sandı (eş olasılık yanılgısı)' },
    { t: 'Kuramla bulamayız; çok sayıda atış yapıp göreli sıklığa bakarız.', ok: true },
    { t: 'Olasılığı hiçbir şekilde bulamayız.', ok: false, why: 'Bir olayın ne sıklıkla olduğunu nasıl öğrenebiliriz? Çok kez deneyip saysak?' },
  ]), [])

  const pick = (o: (typeof opts)[number]) => {
    track.attempt(o.ok)
    if (o.ok) {
      sfx.ok()
      fb.say('Evet! Sonuçlar eş olasılıklı değilse ve kuramsal bir model yoksa deneysel olasılık kullanırız. Hadi atalım!', { tone: 'ok' })
      setPhase('run')
    } else {
      misses.current++
      setWrong((w) => [...w, o.t])
      fb.say(o.why ?? '', { mis: o.mis })
    }
  }
  const checkEst = () => {
    if (est === null) return
    const ok = Math.abs(est - f) <= 0.06
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      track.item(misses.current === 0)
      track.strategy('Deneysel olasılık kullandı')
      setPhase('done')
      fb.say(`Evet! ${fmtN(tr.n)} atışta ${fmtN(tr.counts[0])} kez ucu yukarı geldi: ${fmtN(f, 2)}. Raptiyenin olasılığı için en iyi kestirim, çok sayıda denemedeki göreli sıklıktır.`, { tone: 'ok' })
    } else {
      misses.current++
      fb.say(`Kestirimin ${fmtN(est, 2)}. Deneyde ucu yukarı gelme oranı kaç? ${fmtN(tr.counts[0])} ÷ ${fmtN(tr.n)} işlemini düşün; işaretini oranın yanına taşı.`)
    }
  }

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid items-center gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <DeviceView d={d} t={tr} size={150} />
              <p className={`text-center text-sm font-extrabold ${look.muted}`}>{tr.last === null ? 'Raptiye' : tr.last === 0 ? 'Ucu yukarı!' : 'Yan yattı'}</p>
            </div>
            <FreqBars look={look} outs={outcomes(d)} counts={tr.counts} n={tr.n} height={110} />
          </div>
          {phase !== 'why' && (
            <div className="mt-3">
              <FreqChart t={tr} focus={[0]} colors={['#0ea5e9']} guess={est} />
              <Legend look={look} items={[{ color: '#0ea5e9', label: '“ucu yukarı” göreli sıklığı' }, { color: '#f59e0b', label: 'kestirimim', dash: '2 6' }]} />
            </div>
          )}
          {(phase === 'estimate' || phase === 'done') && (
            <div className={`mt-3 rounded-2xl p-2 ${look.soft}`}>
              <ProbLine look={look} numbers marks={[{ id: 'e', v: est, color: '#f59e0b', label: 'Kestirimim', drag: phase === 'estimate' }, ...(phase === 'done' ? [{ id: 'f', v: f, color: '#0ea5e9', label: 'Deney', ghost: true } as Mark] : [])]} selected={phase === 'estimate' ? 'e' : null} onMove={(_, v) => phase === 'estimate' && setEst(Math.round(v * 100) / 100)} />
            </div>
          )}
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'why' ? 'Kuram var mı?' : phase === 'run' ? 'Raptiyeyi at' : 'Olasılığı kestir'} icon="📌">
          {phase === 'why' && (
            <>
              <p className={`mb-2 text-[15px] font-semibold ${look.muted}`}>Raptiyenin ucu yukarı gelme olasılığını nasıl bulabiliriz?</p>
              <div className="grid gap-2">{opts.map((o) => <Choice key={o.t} look={look} text={o.t} state={wrong.includes(o.t) ? 'wrong' : 'idle'} disabled={wrong.includes(o.t)} onClick={() => pick(o)} />)}</div>
            </>
          )}
          {phase !== 'why' && (
            <>
              <RunButtons look={look} t={tr} />
              <div className="mt-2"><TrialStats look={look} n={tr.n} k={tr.counts[0]} label="Ucu yukarı" /></div>
              {phase === 'run' && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" disabled={tr.n < 300 || tr.running} onClick={() => { setPhase('estimate'); fb.clear() }}>{tr.n < 300 ? `En az 300 atış (${fmtN(tr.n)})` : 'Olasılığı kestir'}</button>}
              {phase === 'estimate' && (
                <>
                  <p className={`mt-2 text-[15px] font-semibold ${look.muted}`}>Olasılık doğrusuna dokunarak kestirimini koy: {est === null ? '—' : <b className={look.strong}>{fmtN(est, 2)}</b>}</p>
                  <button type="button" className="btn-primary mt-2 min-h-14 w-full text-lg" disabled={est === null} onClick={checkEst}>Kestirimimi kontrol et</button>
                </>
              )}
            </>
          )}
          {fb.node}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Arkadaşın 20 atış yapıp farklı bir sonuç bulsa ne dersin?" options={['Daha çok atış yapmalı', 'Onun sonucu yanlış', 'İkimizinkini birleştiririz', 'Raptiyeler farklı olabilir']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}

// ───────────────────────── mystery ─────────────────────────

function MysteryTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'mystery' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [open, setOpen] = useState(false)
  const d: Device = { kind: 'bag', balls: t.colors, hidden: !open }
  const tr = useTrials(d)
  const c = t.colors.length
  const [est, setEst] = useState<number[]>(() => t.colors.map((_, i) => (i < c - 1 ? Math.floor(t.total / c) : t.total - Math.floor(t.total / c) * (c - 1))))
  const [log, setLog] = useState<{ n: number; est: number[] }[]>([])
  const misses = useRef(0)
  const setOne = (i: number, v: number) => {
    setEst((e) => {
      const nx = [...e]
      nx[i] = v
      const rest = t.total - nx.slice(0, c - 1).reduce((s, x) => s + x, 0)
      nx[c - 1] = rest
      return nx
    })
  }
  const valid = est[c - 1] >= 0
  const save = () => {
    setLog((l) => [...l, { n: tr.n, est: [...est] }])
    fb.say(log.length === 0 ? `Kestirimin kaydedildi (${fmtN(tr.n)} çekiliş). Şimdi çok daha fazla çek: kestirimin değişecek mi?` : 'Kaydedildi. Kestirimin nasıl değişti?', { tone: 'ok' })
  }
  const openBag = () => {
    const far = t.colors.findIndex((_, i) => Math.abs(est[i] / t.total - tr.counts[i] / tr.n) > 0.12)
    if (far >= 0) {
      misses.current++
      track.attempt(false)
      const ratio = tr.counts[far] / tr.n
      fb.say(`Deneyde ${t.colors[far].label.toLocaleLowerCase('tr')} oranı ${fmtN(ratio, 2)} çıktı. ${t.total} bilyenin kaçı bu orana uyar? ${fmtN(ratio, 2)} × ${t.total} ≈ ?`, { mis: 'Kestirimini deney verisine dayandırmadı' })
      return
    }
    setOpen(true)
    setLog((l) => [...l, { n: tr.n, est: [...est] }])
    const exact = t.colors.every((col, i) => est[i] === col.w)
    const close = t.colors.every((col, i) => Math.abs(est[i] - col.w) <= 1)
    track.attempt(close)
    track.item(misses.current === 0 && close)
    track.strategy(log.length ? 'Kestirimini veriyle güncelledi' : 'Tek kestirim')
    sfx.ok()
    fb.say(
      exact
        ? `Tam isabet! Torbada ${t.colors.map((col) => `${col.w} ${col.label.toLocaleLowerCase('tr')}`).join(', ')} var. ${fmtN(tr.n)} çekiliş torbanın içini iyi gösterdi.`
        : close
          ? `Çok yakın! Gerçekte ${t.colors.map((col) => `${col.w} ${col.label.toLocaleLowerCase('tr')}`).join(', ')}. Deney kesin sonuç vermez ama çekiliş sayısı arttıkça kestirim gerçeğe yaklaşır.`
          : `Gerçekte ${t.colors.map((col) => `${col.w} ${col.label.toLocaleLowerCase('tr')}`).join(', ')}. Kestirimin verine uygundu; rastgelelik bazen bizi şaşırtır. Daha çok çekilişle ne olurdu?`,
      { tone: 'ok' },
    )
  }

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid items-center gap-3 sm:grid-cols-[190px_1fr]">
            <div>
              <DeviceView d={d} t={tr} size={170} />
              <p className={`text-center text-xs font-bold ${look.muted}`}>Çekilen bilye her seferinde torbaya geri konur.</p>
            </div>
            <div>
              <FreqBars look={look} outs={t.colors} counts={tr.counts} n={tr.n} theoryV={open ? t.colors.map((col) => col.w / t.total) : undefined} height={110} />
            </div>
          </div>
          {tr.n > 0 && (
            <div className="mt-3">
              <FreqChart t={tr} focus={t.colors.map((_, i) => i)} colors={t.colors.map((col) => col.color)} theoryV={open ? t.colors.map((col) => col.w / t.total) : undefined} />
            </div>
          )}
          {log.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {log.map((l, i) => <Pill key={i} look={look} tone={i === log.length - 1 && open ? 'good' : 'plain'}>{fmtN(l.n)} çekilişte: {l.est.map((v, j) => `${v} ${t.colors[j].label.toLocaleLowerCase('tr')}`).join(', ')}</Pill>)}
            </div>
          )}
        </Scene>
      }
      panel={
        <Panel look={look} title={open ? 'Torba açıldı!' : 'Çek ve kestir'} icon={open ? <PackageOpen size={20} /> : '🎒'}>
          {!open && (
            <>
              <RunButtons look={look} t={tr} sizes={[1, 10, 100, 500]} />
              <p className={`mt-3 mb-1 text-sm font-black ${look.muted}`}>Kestirimim ({t.total} bilye):</p>
              <div className="flex flex-wrap justify-center gap-3">
                {t.colors.slice(0, c - 1).map((col, i) => <Stepper key={col.label} look={look} label={col.label} value={est[i]} min={0} max={t.total} onChange={(v) => setOne(i, v)} compact />)}
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>{t.colors[c - 1].label}</span>
                  <span className={`grid h-12 min-w-14 place-items-center rounded-2xl px-3 text-2xl font-black ${valid ? look.strong : 'text-rose-500'}`}>{est[c - 1]}</span>
                </div>
              </div>
              {!valid && <p className="mt-1 text-center text-sm font-bold text-rose-500">Toplam {t.total} bilyeyi geçti.</p>}
              <div className="mt-3 grid gap-2">
                <button type="button" className={`btn-ghost min-h-12 ${look.ghost}`} disabled={tr.n < 10 || !valid || tr.running} onClick={save}>Kestirimimi kaydet</button>
                <button type="button" className="btn-primary min-h-14 text-lg" disabled={tr.n < 200 || !valid || tr.running} onClick={openBag}><Eye size={20} />{tr.n < 200 ? `Açmak için en az 200 çekiliş (${fmtN(tr.n)})` : 'Torbayı aç'}</button>
              </div>
            </>
          )}
          {fb.node}
          {open && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── cloud ─────────────────────────

const SIZES = [10, 100, 1000]
function CloudTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'cloud' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const outs = outcomes(t.device)
  const w = outs.map((o) => o.w)
  const tw = w.reduce((s, x) => s + x, 0)
  const p = w[t.focus] / tw
  const [rows, setRows] = useState<Record<number, number[]>>({})
  const [shown, setShown] = useState<Record<number, number>>({})
  const [phase, setPhase] = useState<'predict' | 'run' | 'q1' | 'q2' | 'done'>('predict')
  const [wrong, setWrong] = useState<string[]>([])
  const misses = useRef(0)
  const raf = useRaf()

  const runSize = (s: number) => {
    const res = Array.from({ length: 20 }, () => {
      let k = 0
      for (let i = 0; i < s; i++) if (Math.random() < p) k++
      return k / s
    })
    setRows((r) => ({ ...r, [s]: res }))
    raf((fr) => {
      setShown((sh) => ({ ...sh, [s]: Math.min(20, fr + 1) }))
      return fr < 19
    })
  }
  const pT = grade >= 6 ? fracT(w[t.focus], tw) : '[[1/2]]'

  const Q = {
    predict: {
      q: `Her grup 10 kez ${t.device.kind === 'coin' ? 'para atarsa' : 'zar atarsa'}, grupların ${t.focusLabel} oranları nasıl olur?`,
      opts: [
        { t: `Hepsi tam ${pT} bulur.`, ok: false, why: '10 atışta rastgelelik ne kadar oynayabilir? Hemen dene ve noktalara bak.', mis: 'Küçük örneklemde de sonucun kuramsal değere eşit olacağını düşündü' },
        { t: `Çoğu ${pT} çevresinde olur ama bazı gruplar çok farklı bulur.`, ok: true },
        { t: `Hiçbir grup ${pT} çevresinde bulmaz.`, ok: false, why: 'Hilesiz bir araçla deney yapıyoruz. Sonuçlar nerede toplanır sence? Dene ve gör.' },
      ],
    },
    q1: {
      q: 'Hangi örneklem büyüklüğünde grupların sonuçları birbirine en yakın?',
      opts: [
        { t: '10 deneme', ok: false, why: '10’luk satırda noktalar ne kadar geniş bir alana yayılmış? Uçtaki iki noktayı karşılaştır.', mis: 'Örneklem büyüklüğünün değişkenliğe etkisini fark etmedi' },
        { t: '100 deneme', ok: false, why: '100’lük satır 10’luktan daha toplu. Peki 1000’lik satır?' },
        { t: '1000 deneme', ok: true },
      ],
    },
    q2: {
      q: `Bir grup 10 denemede ${t.device.kind === 'coin' ? '8 yazı' : '4 kez 6'} buldu. Ne dersin?`,
      opts: [
        { t: t.device.kind === 'coin' ? 'Para kesin hileli.' : 'Zar kesin hileli.', ok: false, why: '10’luk satırda böyle uç sonuçlar bulan başka gruplar var mı? Onların aracı hileli miydi?', mis: 'Küçük örneklemden kesin yargıya vardı' },
        { t: 'Emin olamayız; daha çok deneme yapmalıyız.', ok: true },
        { t: 'Her şey şans; deney hiçbir şey söylemez.', ok: false, why: '1000’lik satıra bak. Çok sayıda deneme bize bir şey söylüyor mu?' },
      ],
    },
  }
  const cur = phase === 'predict' ? Q.predict : phase === 'q1' ? Q.q1 : phase === 'q2' ? Q.q2 : null
  const opts = useMemo(() => (cur ? shuffle(cur.opts) : []), [phase])

  const answer = (o: { t: string; ok: boolean; why?: string; mis?: string }) => {
    if (phase === 'predict') {
      track.strategy(o.ok ? 'Değişkenliği öngördü' : 'Değişkenliği öngörmedi')
      setPhase('run')
      fb.say(o.ok ? 'Bakalım haklı mısın? “20 grup × 10” ile başla.' : o.why!, o.ok ? { tone: 'ok' } : { mis: o.mis })
      return
    }
    track.attempt(o.ok)
    if (o.ok) {
      sfx.ok()
      setWrong([])
      if (phase === 'q1') {
        setPhase('q2')
        fb.say('Evet! Örneklem büyüdükçe sonuçlar kuramsal değerin çevresinde toplanır; değişkenlik azalır.', { tone: 'ok' })
      } else {
        setPhase('done')
        track.item(misses.current === 0)
        fb.say('Doğru! Küçük örneklemde uç sonuçlar şaşırtıcı derecede sık görülür. Karar vermek için büyük örneklem gerekir.', { tone: 'ok' })
      }
    } else {
      misses.current++
      setWrong((x) => [...x, o.t])
      fb.say(o.why!, { mis: o.mis })
    }
  }

  const allRun = SIZES.every((s) => rows[s] && (shown[s] ?? 0) >= 20)
  const W = 640, L = 70, R = 20, rowH = 74
  const xs = (v: number) => L + v * (W - L - R)
  const ink = look.dark ? '#e2e8f0' : '#1f2340'

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="mb-2 flex items-center justify-center gap-3">
            <DeviceView d={t.device} t={{ last: null, flick: 0 }} size={64} />
            <p className={`text-sm font-extrabold ${look.muted}`}>Her nokta bir grubun bulduğu “{t.focusLabel}” oranı</p>
          </div>
          <ZoomBox maxScale={3}>
            <svg viewBox={`0 0 ${W} ${SIZES.length * rowH + 50}`} className="block w-full" role="img" aria-label="Grupların sonuçları">
              <line x1={xs(p)} x2={xs(p)} y1={6} y2={SIZES.length * rowH + 10} stroke="#16a34a" strokeWidth={2.5} strokeDasharray="8 6" />
              <text x={xs(p)} y={SIZES.length * rowH + 44} textAnchor="middle" fontSize={15} fontWeight={900} fill="#16a34a">kuram</text>
              {SIZES.map((s, ri) => {
                const y0 = 14 + ri * rowH + rowH / 2
                const res = (rows[s] ?? []).slice(0, shown[s] ?? 0)
                const bins = new Map<number, number>()
                const vals = res.map((v) => {
                  const b = Math.round(v * 50)
                  const k = bins.get(b) ?? 0
                  bins.set(b, k + 1)
                  return { v, k }
                })
                const mn = res.length ? Math.min(...res) : 0
                const mx = res.length ? Math.max(...res) : 0
                return (
                  <g key={s}>
                    <text x={8} y={y0 + 5} fontSize={15} fontWeight={900} fill={ink}>{`× ${fmtN(s)}`}</text>
                    <line x1={xs(0)} x2={xs(1)} y1={y0 + 18} y2={y0 + 18} stroke={look.dark ? '#64748b' : '#cbd5e1'} strokeWidth={2} />
                    {res.length >= 2 && <rect x={xs(mn) - 9} y={y0 - 26} width={xs(mx) - xs(mn) + 18} height={50} rx={12} fill="#7c3aed" opacity={0.08} />}
                    {vals.map(({ v, k }, i) => <circle key={i} cx={xs(v)} cy={y0 + 9 - k * 9} r={6} fill="#7c3aed" stroke="#fff" strokeWidth={1.5} className="animate-pop" />)}
                    {res.length >= 20 && <text x={W - R} y={y0 - 16} textAnchor="end" fontSize={13} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>açıklık {fmtN(mx - mn, 2)}</text>}
                  </g>
                )
              })}
              {[0, 0.25, 0.5, 0.75, 1].map((v) => <text key={v} x={xs(v)} y={SIZES.length * rowH + 26} textAnchor="middle" fontSize={14} fontWeight={800} fill={ink}>{fmtN(v)}</text>)}
            </svg>
          </ZoomBox>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'predict' ? 'Önce tahmin et' : phase === 'run' ? '20 grubu çalıştır' : 'Ne gözlemledin?'} icon="☁️">
          {phase !== 'predict' && (
            <div className="mb-3 grid gap-2">
              {SIZES.map((s, i) => (
                <button key={s} type="button" disabled={!!rows[s] || (i > 0 && !rows[SIZES[i - 1]])} onClick={() => runSize(s)} className={`flex min-h-12 items-center justify-between rounded-2xl px-4 font-black transition active:scale-[0.98] disabled:opacity-50 ${rows[s] ? look.chipOn : look.key}`}>
                  <span><Shuffle size={16} className="mr-1 inline" />20 grup × {fmtN(s)} deneme</span>
                  {rows[s] && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
          {cur && (phase !== 'q1' || allRun) && (
            <>
              <p className="mb-2 font-black">{cur.q}</p>
              <div className="grid gap-2">{opts.map((o) => <Choice key={o.t} look={look} text={o.t} state={wrong.includes(o.t) ? 'wrong' : 'idle'} disabled={wrong.includes(o.t)} onClick={() => answer(o)} />)}</div>
            </>
          )}
          {phase === 'run' && allRun && <button type="button" className="btn-primary mt-1 min-h-14 w-full text-lg" onClick={() => { setPhase('q1'); fb.clear() }}>Sonuçları karşılaştır</button>}
          {fb.node}
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── design ─────────────────────────

function DesignTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'design' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const [n, setN] = useState([1, 1, 1])
  const tot = n[0] + n[1] + n[2]
  const balls: Out[] = [{ ...RED, w: n[0] }, { ...BLUE, w: n[1] }, { ...GREEN, w: n[2] }].filter((b) => b.w > 0)
  const d: Device = { kind: 'bag', balls: balls.length ? balls : [{ ...RED, w: 0 }] }
  const tr = useTrials(d)
  const misses = useRef(0)
  const pr = tot ? n[0] / tot : 0
  const set = (i: number, v: number) => setN((a) => a.map((x, j) => (j === i ? v : x)))

  const check = () => {
    let why: string | null = null
    let mis: string | undefined
    if (tot === 0) why = 'Torba boş! Önce bilye ekle.'
    else if (t.rule === 'likely') {
      if (n[2] > 0) why = 'Yeşil çekmek imkânsız olmalı. Torbada yeşil bilye varken yeşil çekmek imkânsız mı?'
      else if (n[0] === tot) { why = 'Torbada yalnız kırmızı varsa kırmızı çekmek olası mı, kesin mi?'; mis = 'Olası ile kesin olayı ayırt etmedi' }
      else if (n[0] <= n[1]) { why = 'Kırmızı çekmenin olası olması için kırmızılar mavilerden az mı, çok mu olmalı?'; mis = 'Olası olayı az olası olaydan ayırt edemedi' }
    } else if (t.rule === 'quarter') {
      if (n[0] * 4 !== tot) { why = `Torbada ${tot} bilyenin ${n[0]} tanesi kırmızı: ${fracT(n[0], tot, false)}. Bu [[1/4]]’e eşit mi? Her 4 bilyeden kaçı kırmızı olmalı?`; mis = n[0] === 1 && tot !== 4 ? 'Olasılığı yalnız istenen sonuç sayısına bakarak belirledi' : undefined }
    } else if (!(n[0] === n[1] && n[1] === n[2])) {
      why = 'Eş olasılıklı olmaları için her rengin çekilme şansı aynı olmalı. Her renkten kaç bilye olmalı?'
      mis = 'Eş olasılık için sonuç sayılarının eşit olması gerektiğini fark etmedi'
    } else if (tot < 6) why = 'En az 6 bilyelik bir torba tasarla.'
    track.attempt(!why)
    if (why) {
      misses.current++
      fb.say(why, { mis })
      return
    }
    const key = n.join('-')
    const fresh = sols.add(key, `${n[0]}K ${n[1]}M ${n[2]}Y`)
    if (!fresh) {
      fb.say('Bu torbayı zaten buldun. Bilye sayılarını değiştirerek başka bir torba tasarlayabilir misin?')
      return
    }
    const left = t.need - sols.list.length - 1
    fb.say(left > 0 ? `Harika bir torba! ${t.rule === 'quarter' ? `${fracT(n[0], tot, false)} = [[1/4]]. ` : ''}Başka bir torba daha tasarla.` : 'Süper! Farklı torbalar aynı olasılığı verebilir: önemli olan sayılar değil, parçanın bütüne oranı.', { tone: 'ok' })
    if (left <= 0) track.item(misses.current === 0)
  }
  const done = sols.list.length >= t.need

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid items-center gap-3 sm:grid-cols-[200px_1fr]">
            <DeviceView d={d} t={tr} size={180} />
            <div className="flex flex-wrap justify-center gap-3">
              {[RED, BLUE, GREEN].map((c, i) => (
                <div key={c.label} className={`rounded-2xl p-2 ${look.soft}`}>
                  <div className="mb-1 flex items-center justify-center gap-1.5"><span className="size-4 rounded-full" style={{ background: c.color }} /><span className="text-sm font-black">{c.label}</span></div>
                  <Stepper look={look} value={n[i]} min={0} max={9} onChange={(v) => set(i, v)} compact />
                </div>
              ))}
            </div>
          </div>
          <div className={`mt-3 rounded-2xl p-2 ${look.soft}`}>
            <ProbLine look={look} numbers={grade >= 6} marks={[{ id: 'r', v: tot ? pr : null, color: COL.red, label: 'Kırmızı' }, ...(t.rule !== 'quarter' && tot ? [{ id: 'g', v: n[2] / tot, color: COL.green, label: 'Yeşil' } as Mark] : [])]} />
          </div>
          {tot > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className={`text-sm font-black ${look.muted}`}>Bu torbayı dene:</span>
              <div className="w-64"><RunButtons look={look} t={tr} sizes={[1, 10, 100, 1000]} /></div>
              {tr.n > 0 && <Pill look={look} tone="info">Kırmızı: <MathText text={freqText(tr.counts[0] ?? 0, tr.n)} /></Pill>}
            </div>
          )}
        </Scene>
      }
      panel={
        <Panel look={look} title="Torba tasarımcısı" icon="🛠️">
          <p className={`text-[15px] font-semibold ${look.muted}`}>Bilye sayılarını değiştir. Torba koşulu sağlıyorsa kaydet. {t.need} farklı torba bul!</p>
          {!done && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={() => { check(); tr.reset() }}><Sparkles size={20} />Bu torbayı kaydet</button>}
          {fb.node}
          <SolutionList list={sols.list} goal={t.need} />
          {done && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── approach (8) ─────────────────────────

type Ap = 'öznel' | 'deneysel' | 'kuramsal'
const CARDS: { t: string; ok: Ap[]; why: string }[] = [
  { t: 'Hilesiz bir zarla 3 gelmesi', ok: ['kuramsal'], why: 'Zarın 6 yüzü eş olasılıklı mı? O hâlde deney yapmadan hesaplayabilir miyiz?' },
  { t: 'Bir raptiyenin ucu yukarı düşmesi', ok: ['deneysel'], why: 'Raptiyenin sonuçları eş olasılıklı mı? Hesaplayamıyorsak ne yapmalıyız?' },
  { t: 'Takımımızın yarınki maçı kazanması', ok: ['öznel'], why: 'Bu maç aynı koşullarda yüzlerce kez tekrarlanabilir mi? O zaman olasılığı neye dayanarak söyleriz?' },
  { t: 'Fabrikadaki bir ampulün bozuk çıkması', ok: ['deneysel'], why: 'Bozuk ampul olasılığını hesaplayan bir formül var mı, yoksa üretilen ampulleri mi incelemeliyiz?' },
  { t: '4 kırmızı, 6 mavi bilyeli torbadan kırmızı çekmek', ok: ['kuramsal'], why: 'Her bilyenin çekilme şansı eşitse, olasılığı bilyeleri sayarak bulabilir miyiz?' },
  { t: 'Yarın yağmur yağması', ok: ['deneysel', 'öznel'], why: 'Meteoroloji geçmiş yılların kayıtlarına bakar. Bu hangi yaklaşım?' },
]
const APS: { id: Ap; label: string; sub: string; color: string }[] = [
  { id: 'öznel', label: 'Öznel', sub: 'deneyim, görüş', color: '#db2777' },
  { id: 'deneysel', label: 'Deneysel', sub: 'deney, kayıtlar', color: '#0891b2' },
  { id: 'kuramsal', label: 'Kuramsal', sub: 'eş olasılıklı sonuçlar', color: '#7c3aed' },
]

function ApproachTask({ grade, look, onDone }: { grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const cards = useMemo(() => shuffle(CARDS), [])
  const [placed, setPlaced] = useState<Record<string, Ap>>({})
  const [sel, setSel] = useState<string | null>(cards[0].t)
  const misses = useRef(0)
  const firstMiss = useRef(new Set<string>())
  const drop = (a: Ap) => {
    if (!sel) return
    const c = cards.find((x) => x.t === sel)!
    const ok = c.ok.includes(a)
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      const np = { ...placed, [c.t]: a }
      setPlaced(np)
      const next = cards.find((x) => !np[x.t])
      setSel(next?.t ?? null)
      fb.say(c.ok.length > 1 ? 'Evet! Bu olay için iki yaklaşım da savunulabilir: geçmiş kayıtlar (deneysel) ya da uzman görüşü (öznel).' : 'Evet!', { tone: 'ok' })
      if (!next) track.item(misses.current === 0)
    } else {
      misses.current++
      firstMiss.current.add(c.t)
      fb.say(c.why, { mis: a === 'kuramsal' ? 'Eş olasılıklı olmayan bir durumda kuramsal olasılık kullanmaya çalıştı' : undefined })
    }
  }
  const done = cards.every((c) => placed[c.t])
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid gap-2 sm:grid-cols-3">
            {APS.map((a) => (
              <button key={a.id} type="button" onClick={() => drop(a.id)} disabled={!sel} className={`flex min-h-40 flex-col rounded-2xl p-3 text-left ring-2 transition active:scale-[0.99] ${look.dark ? 'bg-slate-900/60' : 'bg-white/80'}`} style={{ borderColor: a.color, ['--tw-ring-color' as string]: sel ? a.color : `${a.color}55` }}>
                <span className="text-lg font-black" style={{ color: a.color }}>{a.label}</span>
                <span className={`text-xs font-bold ${look.muted}`}>{a.sub}</span>
                <span className="mt-2 flex flex-col gap-1.5">
                  {cards.filter((c) => placed[c.t] === a.id).map((c) => <span key={c.t} className="rounded-xl px-2 py-1.5 text-sm font-extrabold text-white animate-pop" style={{ background: a.color }}>{c.t}</span>)}
                </span>
              </button>
            ))}
          </div>
          <p className={`mt-4 mb-2 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Olay kartları — birini seç, sonra yaklaşımına dokun</p>
          <div className="flex flex-wrap justify-center gap-2">
            {cards.filter((c) => !placed[c.t]).map((c) => (
              <button key={c.t} type="button" onClick={() => setSel(c.t)} className={`min-h-12 rounded-2xl px-3 py-2 text-[15px] font-extrabold transition ${sel === c.t ? look.chipOn : look.chip}`}>{c.t}</button>
            ))}
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title="Hangi yaklaşım?" icon={<FlaskConical size={20} />}>
          <p className={`text-[15px] font-semibold ${look.muted}`}>Sonuçlar eş olasılıklı mı? Deney yapılabilir mi? Yoksa yalnızca görüş mü bildirebiliriz?</p>
          {sel && <p className={`mt-2 rounded-xl p-2 font-black ${look.soft}`}>Seçili: {sel}</p>}
          {fb.node}
          {done && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function OlasilikSimulatoru({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const firsts = useRef(0)
  const t = tasks[i]

  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (i + 1 < tasks.length) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    onFinish({
      summary: `${tasks.length} olasılık deneyini tamamladın, binlerce deneme yaptın.`,
      insight:
        grade === 5
          ? 'Olasılık 0 (imkânsız) ile 1 (kesin) arasında bir sayıdır. Az sayıda denemede sonuçlar çok değişir; çok sayıda denemede göreli sıklık bir değerin çevresine yerleşir.'
          : grade === 6
            ? 'Deneysel olasılık = olayın gerçekleştiği deneme sayısı ÷ toplam deneme sayısı. Deneme sayısı arttıkça bu kestirim güvenilir hâle gelir.'
            : grade === 7
              ? 'Bir olay ile tümleyeninin olasılıkları toplamı 1’dir. Eş olasılıklı sonuçlarda kuramsal olasılığı sayarak buluruz; deney ise çok denemede kurama yaklaşır.'
              : 'Eş olasılıklı sonuçlarda kuramsal, tekrarlanabilen deneylerde deneysel, tekrarlanamayan olaylarda öznel olasılık kullanırız. Büyük örneklemler daha güvenilir kestirim verir.',
      stars: starsBy(firsts.current, tasks.length),
    })
  }

  let body: ReactNode
  switch (t.kind) {
    case 'place': body = <PlaceTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'predict': body = <PredictTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'tack': body = <TackTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'mystery': body = <MysteryTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'cloud': body = <CloudTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'design': body = <DesignTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'approach': body = <ApproachTask key={i} grade={grade} look={look} onDone={done} />; break
  }

  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji={EMOJI[t.kind]} />
      {body}
    </div>
  )
}

