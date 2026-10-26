import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Check, ClipboardList, FastForward, Minus, Plus } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Scene, SolutionList, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { clamp } from '../../interactive/axis'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Choice, LastTask, NextButton, Panel, Pill, Stepper, TopBar, Work, fmtN, shuffle, starsBy, useLook, useRaf, useSay, type Look } from './kit'
import { DISPLAY_NAME, FACES, NAMES, invFor, type DisplayId, type Inv, type Q } from './data'

/**
 * 63. Veri Toplama Stüdyosu (1–8)
 *  Araştırma döngüsü: Soru → Topla → Düzenle → Göster → Yorumla.
 *   1–2: kategorik veri, çetele/nesneler, nesne/resim grafiği (1 simge = 1)
 *   3–5: kategorik veri, çetele → sıklık tablosu → resim (1 simge = 2) ya da ölçekli sütun grafiği
 *   6:   sayılarak elde edilen nicel veri (kardeş sayısı) → nokta grafiği; tepe değer, ortanca, açıklık, ortalama
 *   7–8: sürekli nicel veri → örneklem seçimi, eşit aralıklarla gruplama (birden çok geçerli genişlik) → histogram
 */

const STEPS = [
  { id: 'soru', label: 'Soru', emoji: '❓' },
  { id: 'topla', label: 'Topla', emoji: '🗳️' },
  { id: 'duzenle', label: 'Düzenle', emoji: '🗂️' },
  { id: 'goster', label: 'Göster', emoji: '📊' },
  { id: 'yorumla', label: 'Yorumla', emoji: '💡' },
] as const

const tally = (n: number) => n

/** Çetele: 5’erli gruplar (dört dik + bir çapraz) */
function Tally({ n, color, look }: { n: number; color: string; look: Look }) {
  const groups = Math.floor(n / 5), rest = n % 5
  const gw = 34
  const w = Math.max(20, groups * gw + rest * 7 + 6)
  return (
    <svg viewBox={`0 0 ${w} 30`} height={30} width={w} aria-label={`${n} çetele işareti`}>
      {Array.from({ length: groups }, (_, g) => (
        <g key={g} stroke={color} strokeWidth={3} strokeLinecap="round">
          {[0, 1, 2, 3].map((k) => <line key={k} x1={g * gw + 3 + k * 7} x2={g * gw + 3 + k * 7} y1={4} y2={26} />)}
          <line x1={g * gw} x2={g * gw + 27} y1={22} y2={8} stroke={look.dark ? '#e2e8f0' : '#1f2340'} />
        </g>
      ))}
      {Array.from({ length: rest }, (_, k) => <line key={k} x1={groups * gw + 3 + k * 7} x2={groups * gw + 3 + k * 7} y1={4} y2={26} stroke={color} strokeWidth={3} strokeLinecap="round" />)}
    </svg>
  )
}

const catLabel = (inv: Inv, i: number) => (inv.kind === 'disc' ? `${inv.cats[i].label} ${inv.unit}` : inv.cats[i].label)
const answerText = (inv: Inv, v: number) => (inv.kind === 'cat' ? inv.cats[v].emoji : inv.kind === 'disc' ? `${v}` : `${v} ${inv.unit === 'dakika' ? 'dk' : 'sa'}`)

// ───────────────────────── 1. Soru ─────────────────────────

function SoruStep({ inv, grade, look, onDone }: { inv: Inv; grade: Grade; look: Look; onDone: (first: boolean) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [phase, setPhase] = useState<'q' | 'sample' | 'ok'>('q')
  const [wrong, setWrong] = useState<string[]>([])
  const misses = useRef(0)
  const qs = useMemo(() => shuffle(inv.questions), [inv])
  const ss = useMemo(() => (inv.sample ? shuffle(inv.sample.opts) : []), [inv])
  const pick = (o: Q) => {
    track.attempt(o.ok)
    if (!o.ok) {
      misses.current++
      setWrong((w) => [...w, o.t])
      fb.say(o.why!, { mis: o.mis })
      return
    }
    sfx.ok()
    setWrong([])
    if (phase === 'q' && inv.sample) {
      setPhase('sample')
      fb.say(grade >= 6 ? 'Evet! Bu soru farklı cevaplar bekliyor (değişkenlik) ve veriyle cevaplanabilir.' : 'Evet! Bu soruyu herkese sorabilir, cevapları toplayabiliriz.', { tone: 'ok' })
    } else {
      setPhase('ok')
      track.item(misses.current === 0)
      fb.say(phase === 'sample' ? 'Evet! Örneklem, karar vereceğimiz grubu temsil etmeli; herkesin seçilme şansı eşit olmalı.' : grade <= 2 ? 'Evet! Bu soruyu bütün arkadaşlarımıza sorabiliriz.' : 'Evet! İyi bir araştırma sorusu herkese sorulabilir ve farklı cevaplar bekler.', { tone: 'ok' })
    }
  }
  const list = phase === 'sample' ? ss : qs
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="text-center">
            <p className="text-6xl" aria-hidden>{inv.emoji}</p>
            <p className={`mt-2 text-xl font-black ${look.strong}`}>Araştırma konusu: {inv.topic}</p>
            <p className={`mt-1 font-semibold ${look.muted}`}>{phase === 'sample' ? inv.sample!.q : grade <= 2 ? 'Hangi soruyu sorarsak sınıfımızı tanırız?' : 'Hangisi veri toplayarak cevaplanabilecek iyi bir araştırma sorusu?'}</p>
          </div>
          <div className="mx-auto mt-4 grid max-w-xl gap-2">
            {list.map((o) => <Choice key={o.t} look={look} text={`“${o.t}”`} state={phase === 'ok' && o.ok ? 'right' : wrong.includes(o.t) ? 'wrong' : 'idle'} disabled={phase === 'ok' || wrong.includes(o.t)} onClick={() => pick(o)} />)}
          </div>
          <Cycle look={look} at={0} />
        </Scene>
      }
      panel={
        <Panel look={look} title="Araştırmacı ol" icon="🔍">
          <p className={`text-[15px] font-semibold ${look.muted}`}>{grade <= 2 ? 'İyi bir soru, herkese sorabileceğimiz ve farklı cevaplar alabileceğimiz bir sorudur.' : 'Kendine sor: Bu soruyu kime soracağız? Cevaplar kişiden kişiye değişir mi? Soru bir cevaba yönlendiriyor mu?'}</p>
          {fb.node}
          {phase === 'ok' && <NextButton onClick={() => onDone(misses.current === 0)} label="Veri toplamaya başla" />}
        </Panel>
      }
    />
  )
}

/** Araştırma döngüsü göstergesi */
function Cycle({ look, at }: { look: Look; at: number }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
      {STEPS.map((s, i) => (
        <span key={s.id} className="flex items-center gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${i === at ? (look.dark ? 'bg-cyan-400 text-slate-900' : 'bg-violet-600 text-white') : i < at ? (look.dark ? 'bg-emerald-500/25 text-emerald-200' : 'bg-emerald-50 text-emerald-700') : look.dark ? 'bg-slate-700 text-slate-300' : 'bg-white text-ink-soft ring-1 ring-line'}`}>{s.emoji} {s.label}</span>
          {i < STEPS.length - 1 && <span className={look.muted}>→</span>}
        </span>
      ))}
    </div>
  )
}

// ───────────────────────── 2. Topla ─────────────────────────

function ToplaStep({ inv, grade, look, onDone }: { inv: Inv; grade: Grade; look: Look; onDone: (first: boolean) => void }) {
  const track = useTracker()
  const fb = useSay()
  const N = inv.answers.length
  const [rec, setRec] = useState<boolean[]>(() => Array(N).fill(false))
  const [cur, setCur] = useState<number | null>(null)
  const [fast, setFast] = useState(false)
  const misses = useRef(0)
  const raf = useRaf()
  const nRec = rec.filter(Boolean).length
  const counts = inv.cats.map((_, ci) => inv.answers.filter((a, i) => rec[i] && (inv.kind === 'disc' ? a === Number(inv.cats[ci].label) : a === ci)).length)
  const catOf = (i: number) => (inv.kind === 'disc' ? inv.cats.findIndex((c) => Number(c.label) === inv.answers[i]) : inv.answers[i])
  const done = nRec === N
  const big = look.big

  const record = (i: number) => {
    setRec((r) => r.map((x, j) => (j === i ? true : x)))
    setCur(null)
  }
  const tapStudent = (i: number) => {
    if (rec[i] || fast) return
    if (inv.kind === 'cont') {
      sfx.ok()
      setCur(i)
      record(i)
      return
    }
    setCur(i)
    fb.clear()
  }
  const tapCat = (ci: number) => {
    if (cur === null) {
      fb.say(grade <= 2 ? 'Önce bir arkadaşına dokun ve cevabını dinle!' : 'Önce bir öğrenciye dokunup cevabını öğren, sonra çeteleye işle.')
      return
    }
    const ok = catOf(cur) === ci
    track.attempt(ok)
    if (!ok) {
      misses.current++
      fb.say(`${NAMES[cur]} ne dedi? Konuşma balonuna tekrar bak.`)
      return
    }
    sfx.ok()
    record(cur)
  }
  const fastAll = () => {
    setFast(true)
    setCur(null)
    track.strategy('Kalan verileri hızlı kaydetti')
    raf((f) => {
      if (f % 3) return true
      let more = false
      setRec((r) => {
        const k = r.findIndex((x) => !x)
        if (k < 0) return r
        more = r.filter((x) => !x).length > 1
        return r.map((x, j) => (j === k ? true : x))
      })
      return more || f < 3
    })
  }
  const cols = N <= 12 ? 'grid-cols-4 sm:grid-cols-6' : N <= 16 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-5 sm:grid-cols-8'
  const raw = inv.answers.filter((_, i) => rec[i])
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <p className={`mb-2 text-center text-sm font-black tracking-wide uppercase ${look.muted}`}>Sınıf · {N} öğrenci · sorulan: {nRec}</p>
          <div className={`grid gap-1.5 ${cols}`}>
            {inv.answers.map((a, i) => (
              <button key={i} type="button" onClick={() => tapStudent(i)} disabled={rec[i]} className={`relative flex ${big ? 'min-h-[76px]' : 'min-h-16'} flex-col items-center justify-end rounded-2xl pt-5 pb-1 transition active:scale-95 ${rec[i] ? (look.dark ? 'bg-slate-900/40 opacity-60' : 'bg-white/50 opacity-60') : cur === i ? (look.dark ? 'bg-cyan-500/25 ring-2 ring-cyan-300' : 'bg-violet-100 ring-2 ring-violet-500') : look.dark ? 'bg-slate-700/80' : 'bg-white ring-1 ring-line'}`} aria-label={`${NAMES[i]}${rec[i] ? ' (kaydedildi)' : ''}`}>
                {(cur === i || rec[i]) && (
                  <span className={`absolute -top-1 left-1/2 -translate-x-1/2 rounded-xl px-1.5 text-base leading-7 font-black whitespace-nowrap shadow ${cur === i ? 'animate-pop' : ''} ${look.dark ? 'bg-white text-slate-900' : 'bg-amber-100 text-ink ring-1 ring-amber-300'}`}>{answerText(inv, a)}</span>
                )}
                <span className="text-2xl leading-none" aria-hidden>{FACES[i % FACES.length]}</span>
                <span className={`max-w-full truncate px-0.5 text-[11px] font-extrabold ${look.strong}`}>{NAMES[i]}</span>
                {rec[i] && <span className="absolute top-1 right-1 text-[10px] text-emerald-500">✔</span>}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {inv.kind === 'cont' ? (
              <div className={`rounded-2xl p-3 ${look.soft}`}>
                <p className={`mb-1 text-xs font-black tracking-wide uppercase ${look.muted}`}>Ham veri listesi ({inv.unit})</p>
                <p className={`min-h-8 font-mono text-lg font-black tabular-nums ${look.strong}`}>{raw.length ? raw.join(', ') : '—'}</p>
              </div>
            ) : (
              <div className={`grid gap-1.5 rounded-2xl p-2 ${look.soft}`}>
                {inv.cats.map((c, ci) => (
                  <button key={c.id} type="button" onClick={() => tapCat(ci)} disabled={done} className={`flex ${big ? 'min-h-14' : 'min-h-12'} items-center gap-3 rounded-xl px-3 text-left transition active:scale-[0.99] ${look.dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white ring-1 ring-line hover:bg-violet-50'}`}>
                    <span className={`flex w-28 shrink-0 items-center gap-1.5 font-black sm:w-36 ${look.strong}`}><span className="text-2xl" aria-hidden>{inv.kind === 'cat' ? c.emoji : '👪'}</span>{catLabel(inv, ci)}</span>
                    {grade <= 1 ? (
                      <span className="flex flex-wrap gap-0.5 text-2xl" aria-label={`${counts[ci]} tane`}>{Array.from({ length: counts[ci] }, (_, k) => <span key={k} className="animate-pop">{c.emoji}</span>)}</span>
                    ) : (
                      <Tally n={tally(counts[ci])} color={c.color} look={look} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title="Veri topla" icon="🗳️">
          <p className={`text-[15px] font-semibold ${look.muted}`}>
            {inv.kind === 'cont' ? 'Her öğrenciye dokun: cevabı ham veri listesine yazılır.' : grade <= 2 ? 'Bir arkadaşına dokun, cevabını gör. Sonra aşağıda o cevabın satırına dokun.' : 'Bir öğrenciye dokun, cevabını gör, sonra çetele tablosunda doğru satıra işaret koy.'}
          </p>
          <div className="mt-2"><Pill look={look} tone="info">Kaydedilen: {nRec} / {N}</Pill></div>
          {!done && nRec >= Math.min(6, N - 1) && !fast && <button type="button" className={`btn-ghost mt-3 min-h-12 w-full ${look.ghost}`} onClick={fastAll}><FastForward size={18} />Kalanları hızlı kaydet</button>}
          {fb.node}
          {done && <NextButton onClick={() => { track.item(misses.current === 0); onDone(misses.current === 0) }} label="Verileri düzenle" />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── 3. Düzenle ─────────────────────────

export function binCounts(values: number[], edges: number[]) {
  return edges.slice(0, -1).map((a, i) => values.filter((v) => v >= a && (v < edges[i + 1] || (i === edges.length - 2 && v <= edges[i + 1]))).length)
}

function DuzenleStep({ inv, grade, look, onDone }: { inv: Inv; grade: Grade; look: Look; onDone: (first: boolean, freq: number[], edges?: number[]) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const truth = inv.kind === 'cont' ? [] : inv.cats.map((c, ci) => inv.answers.filter((a) => (inv.kind === 'disc' ? a === Number(c.label) : a === ci)).length)
  const [vals, setVals] = useState<number[]>(() => truth.map(() => 0))
  const [bad, setBad] = useState<number[]>([])
  const [ok, setOk] = useState(false)
  const [binId, setBinId] = useState<string | null>(null)
  const misses = useRef(0)

  if (inv.kind === 'cont') {
    const bins = inv.bins!
    const sel = bins.find((b) => b.id === binId)
    const fr = sel ? binCounts(inv.answers, sel.edges) : []
    const choose = (id: string) => {
      setBinId(id)
      const b = bins.find((x) => x.id === id)!
      track.attempt(b.ok)
      if (!b.ok) {
        misses.current++
        fb.say(b.why!, { mis: b.mis })
        return
      }
      const fresh = sols.add(b.id, `${b.label} aralık`)
      if (fresh) fb.say(sols.list.length + 1 >= 2 ? 'İki farklı eşit aralıklı gruplama buldun! İkisi de geçerli: dar aralık ayrıntıyı, geniş aralık genel şekli gösterir. Hangisiyle devam etmek istersin?' : 'Geçerli bir gruplama! Eşit genişlikte ve tüm verileri kapsıyor. Başka bir geçerli aralık genişliği bul.', { tone: 'ok' })
    }
    const found = sols.list.length >= 2
    const mx = Math.max(1, ...fr)
    return (
      <Work
        scene={
          <Scene grade={grade}>
            <div className={`rounded-2xl p-3 ${look.soft}`}>
              <p className={`mb-1 text-xs font-black tracking-wide uppercase ${look.muted}`}>Ham veri ({inv.unit}) — sıralı</p>
              <p className={`font-mono text-base font-black tabular-nums ${look.strong}`}>{[...inv.answers].sort((a, b) => a - b).join(', ')}</p>
            </div>
            {sel && (
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <table className={`h-fit w-full overflow-hidden rounded-2xl text-center font-black tabular-nums ring-1 ${look.dark ? 'ring-slate-600' : 'ring-line'}`}>
                  <thead><tr className={look.dark ? 'bg-slate-700' : 'bg-violet-50'}><th className="py-1.5">Aralık ({inv.unit})</th><th>Sıklık</th></tr></thead>
                  <tbody>{fr.map((f, i) => <tr key={i} className={`border-t ${look.dark ? 'border-slate-700' : 'border-line'}`}><td className="py-1">{sel.edges[i]}–{sel.edges[i + 1]}</td><td>{f}</td></tr>)}</tbody>
                </table>
                <svg viewBox="0 0 300 180" className="block w-full" aria-label="Önizleme histogramı">
                  {fr.map((f, i) => {
                    const lo = sel.edges[0], hi = sel.edges[sel.edges.length - 1]
                    const x0 = 10 + ((sel.edges[i] - lo) / (hi - lo)) * 280, x1 = 10 + ((sel.edges[i + 1] - lo) / (hi - lo)) * 280
                    const h = (f / mx) * 140
                    return <rect key={i} x={x0} y={160 - h} width={x1 - x0} height={h} fill={sel.ok ? '#7c3aed' : '#f59e0b'} stroke="#fff" strokeWidth={1.5} />
                  })}
                  <line x1={10} x2={290} y1={160} y2={160} stroke={look.dark ? '#e2e8f0' : '#1f2340'} strokeWidth={2} />
                  <text x={150} y={176} textAnchor="middle" fontSize={11} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>önizleme</text>
                </svg>
              </div>
            )}
          </Scene>
        }
        panel={
          <Panel look={look} title="Verileri grupla" icon="🗂️">
            <p className={`text-[15px] font-semibold ${look.muted}`}>{inv.answers.length} farklı değer var. Onları aralıklara ayıralım. Hangi aralık genişliği uygun? İki geçerli seçenek bul.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {bins.map((b) => <Choice key={b.id} look={look} className="!text-center" state={sols.list.some((s) => s.key === b.id) ? 'right' : binId === b.id ? 'on' : 'idle'} onClick={() => choose(b.id)}>{b.label}</Choice>)}
            </div>
            {fb.node}
            <SolutionList list={sols.list} goal={2} />
            {found && sel?.ok && <NextButton label={`${sel.label} aralıkla devam et`} onClick={() => { track.item(misses.current === 0); onDone(misses.current === 0, fr, sel.edges) }} />}
          </Panel>
        }
      />
    )
  }

  const check = () => {
    const wrong = truth.map((t, i) => (vals[i] !== t ? i : -1)).filter((i) => i >= 0)
    track.attempt(!wrong.length)
    if (wrong.length) {
      misses.current++
      setBad(wrong)
      const i = wrong[0]
      fb.say(grade <= 1 ? `${catLabel(inv, i)} satırındaki nesneleri tek tek say. Kaç tane?` : `${catLabel(inv, i)} satırındaki çetele işaretlerini say. Çapraz çizgili her grup 5 demek: 5’er 5’er, sonra teker teker say.`, { mis: Math.abs(vals[i] - truth[i]) === 1 ? undefined : grade >= 2 ? 'Çeteledeki 5’li grupları saymakta zorlandı' : undefined })
      return
    }
    sfx.ok()
    setOk(true)
    setBad([])
    track.item(misses.current === 0)
    fb.say(`Sıklık tablosu hazır! Toplam ${truth.reduce((s, x) => s + x, 0)} öğrenci: sınıftaki herkes sayılmış.`, { tone: 'ok' })
  }
  const total = vals.reduce((s, x) => s + x, 0)
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className={`overflow-hidden rounded-2xl ring-1 ${look.dark ? 'ring-slate-600' : 'ring-line'}`}>
            <div className={`grid grid-cols-[1.2fr_1.4fr_auto] items-center gap-2 px-3 py-2 text-xs font-black tracking-wide uppercase ${look.dark ? 'bg-slate-700 text-slate-200' : 'bg-violet-50 text-violet-900'}`}>
              <span>{inv.kind === 'disc' ? 'Kardeş sayısı' : 'Cevap'}</span><span>{grade <= 1 ? 'Nesneler' : 'Çetele'}</span><span className="w-[150px] text-center">Sıklık</span>
            </div>
            {inv.cats.map((c, i) => (
              <div key={c.id} className={`grid grid-cols-[1.2fr_1.4fr_auto] items-center gap-2 border-t px-3 py-1.5 ${look.dark ? 'border-slate-700 bg-slate-900/40' : 'border-line bg-white'} ${bad.includes(i) ? 'outline-3 outline-amber-400 -outline-offset-2' : ''}`}>
                <span className={`flex items-center gap-1.5 font-black ${look.strong}`}><span className="text-xl" aria-hidden>{inv.kind === 'cat' ? c.emoji : ''}</span>{catLabel(inv, i)}</span>
                {grade <= 1 ? <span className="text-xl leading-tight">{Array.from({ length: truth[i] }, () => c.emoji).join('')}</span> : <Tally n={truth[i]} color={c.color} look={look} />}
                <div className="w-[150px]"><Stepper look={look} value={vals[i]} min={0} max={30} onChange={(v) => { setVals((a) => a.map((x, j) => (j === i ? v : x))); setBad((b) => b.filter((x) => x !== i)) }} compact /></div>
              </div>
            ))}
            {grade >= 2 && (
              <div className={`grid grid-cols-[1.2fr_1.4fr_auto] items-center gap-2 border-t px-3 py-2 font-black ${look.dark ? 'border-slate-600 bg-slate-800' : 'border-line bg-paper'}`}>
                <span className={look.strong}>Toplam</span><span /><span className={`w-[150px] text-center text-2xl tabular-nums ${look.strong}`}>{total}</span>
              </div>
            )}
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={grade <= 1 ? 'Say ve yaz' : 'Sıklık tablosu'} icon="🗂️">
          <p className={`text-[15px] font-semibold ${look.muted}`}>{grade <= 1 ? 'Her satırda kaç tane var? Say ve sayıyı yaz.' : 'Çeteleyi sayıya çevir. 5’li grupları kullanarak hızlı say.'}</p>
          {!ok && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={check}><Check size={20} />Tabloyu kontrol et</button>}
          {fb.node}
          {ok && <NextButton label="Grafiğe dök" onClick={() => onDone(misses.current === 0, vals)} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── 4. Göster ─────────────────────────

function Thumb({ id, look }: { id: DisplayId; look: Look }) {
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  const c = ['#7c3aed', '#0891b2', '#db2777', '#f59e0b']
  return (
    <svg viewBox="0 0 80 54" className="h-12 w-20 shrink-0" aria-hidden>
      {id === 'bar' && [16, 30, 22, 38].map((h, i) => <rect key={i} x={8 + i * 17} y={48 - h} width={11} height={h} rx={2} fill={c[i]} />)}
      {id === 'hist' && [12, 26, 38, 20].map((h, i) => <rect key={i} x={8 + i * 16} y={48 - h} width={16} height={h} fill={c[0]} stroke="#fff" />)}
      {id === 'line' && <polyline points="8,40 26,30 44,34 62,14 76,18" fill="none" stroke={c[1]} strokeWidth={3} />}
      {id === 'dot' && [[1, 2], [2, 4], [3, 3], [4, 1]].flatMap(([x, n]) => Array.from({ length: n }, (_, k) => <circle key={`${x}-${k}`} cx={8 + x * 14} cy={44 - k * 9} r={4} fill={c[2]} />))}
      {id === 'pie' && <g><circle cx={40} cy={27} r={22} fill={c[0]} /><path d="M40 27 L40 5 A22 22 0 0 1 61 33 Z" fill={c[1]} /><path d="M40 27 L61 33 A22 22 0 0 1 30 47 Z" fill={c[3]} /></g>}
      {(id === 'picto' || id === 'object') && [3, 2, 4].map((n, r) => Array.from({ length: n }, (_, k) => <text key={`${r}-${k}`} x={10 + r * 24} y={48 - k * 12} fontSize={11}>{id === 'object' ? '🍎' : '🙂'}</text>))}
      {(id === 'bar' || id === 'hist' || id === 'line' || id === 'dot') && <line x1={4} x2={78} y1={48} y2={48} stroke={ink} strokeWidth={2} />}
    </svg>
  )
}

/** Sütun / histogram kurucu: sütun tepesini sürükle ya da ± düğmeleri */
function BarBuilder({ look, labels, colors, vals, onChange, scale, maxV, adjacent, unit }: { look: Look; labels: string[]; colors: string[]; vals: number[]; onChange: (i: number, v: number) => void; scale: number; maxV: number; adjacent?: boolean; unit?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const n = labels.length
  const W = 600, H = 300, L = 46, R = 12, T = 14, B = 44
  const pw = W - L - R, ph = H - T - B
  const top = Math.ceil(maxV / scale) * scale + scale
  const ys = (v: number) => T + ph * (1 - v / top)
  const bw = pw / n
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  const valAt = (cy: number) => {
    const r = svg.current!.getBoundingClientRect()
    const py = ((cy - r.top) / r.height) * H
    return clamp(Math.round(((1 - (py - T) / ph) * top)), 0, top)
  }
  const bind = useDrag(({ args: [i], xy: [, cy], event }) => {
    event.stopPropagation()
    onChange(i as number, valAt(cy))
  }, { eventOptions: { passive: false } })
  const ticksV = Array.from({ length: Math.floor(top / scale) + 1 }, (_, k) => k * scale)
  return (
    <div>
      <div style={{ touchAction: 'none' }} className="select-none">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Grafik kurucu">
          {ticksV.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={ys(t)} y2={ys(t)} stroke={look.dark ? '#334155' : '#eceef5'} strokeWidth={1.5} />
              <text x={L - 8} y={ys(t) + 5} textAnchor="end" fontSize={14} fontWeight={800} fill={ink}>{t}</text>
            </g>
          ))}
          {labels.map((lb, i) => {
            const x = L + bw * i + (adjacent ? 0 : bw * 0.18)
            const w = adjacent ? bw : bw * 0.64
            return (
              <g key={i} {...bind(i)} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }}>
                <rect x={L + bw * i} y={T} width={bw} height={ph} fill="transparent" />
                <rect x={x} y={ys(vals[i])} width={w} height={ph + T - ys(vals[i])} fill={colors[i % colors.length]} stroke={adjacent ? '#fff' : 'none'} strokeWidth={2} rx={adjacent ? 0 : 5} style={{ transition: 'y 0.08s, height 0.08s' }} />
                <rect x={x + w / 2 - 18} y={ys(vals[i]) - 9} width={36} height={12} rx={6} fill={look.dark ? '#e2e8f0' : '#1f2340'} opacity={0.85} />
                <text x={L + bw * i + bw / 2} y={H - B + 20} textAnchor="middle" fontSize={labels.length > 6 ? 12 : 14} fontWeight={800} fill={ink}>{lb}</text>
              </g>
            )
          })}
          <line x1={L} x2={L} y1={T} y2={T + ph} stroke={ink} strokeWidth={2.5} />
          <line x1={L} x2={W - R} y1={T + ph} y2={T + ph} stroke={ink} strokeWidth={2.5} />
          {unit && <text x={W - R} y={H - 6} textAnchor="end" fontSize={12} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>{unit}</text>}
        </svg>
      </div>
      <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, paddingLeft: `${(L / W) * 100}%`, paddingRight: `${(R / W) * 100}%` }}>
        {labels.map((lb, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button type="button" aria-label={`${lb} artır`} onClick={() => onChange(i, Math.min(top, vals[i] + 1))} className={`grid h-11 w-full max-w-12 place-items-center rounded-xl ${look.key}`}><Plus size={18} /></button>
            <button type="button" aria-label={`${lb} azalt`} onClick={() => onChange(i, Math.max(0, vals[i] - 1))} className={`grid h-11 w-full max-w-12 place-items-center rounded-xl ${look.key}`}><Minus size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Resim/nesne grafiği kurucu (key: 1 simge = key öğrenci) */
function PictoBuilder({ look, inv, vals, onChange, big }: { look: Look; inv: Inv; vals: number[]; onChange: (i: number, v: number) => void; big: boolean }) {
  const key = inv.key
  return (
    <div className="grid gap-2">
      {inv.cats.map((c, i) => {
        const full = Math.floor(vals[i] / key), half = vals[i] % key
        return (
          <div key={c.id} className={`flex items-center gap-2 rounded-2xl p-2 ${look.dark ? 'bg-slate-900/50' : 'bg-white ring-1 ring-line'}`}>
            <span className={`flex w-24 shrink-0 items-center gap-1 text-sm font-black sm:w-28 ${look.strong}`}><span className="text-xl" aria-hidden>{c.emoji}</span>{c.label}</span>
            <span className={`flex min-h-10 flex-1 flex-wrap items-center gap-0.5 ${big ? 'text-3xl' : 'text-2xl'}`}>
              {Array.from({ length: full }, (_, k) => <span key={k} className="animate-pop" aria-hidden>{inv.kind === 'cat' && key === 1 ? c.emoji : '🙂'}</span>)}
              {half > 0 && <span className="inline-block w-[0.55em] overflow-hidden animate-pop" aria-label="yarım simge">🙂</span>}
            </span>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => onChange(i, Math.max(0, vals[i] - (half ? half : key)))} className={`grid ${big ? 'size-14' : 'size-12'} place-items-center rounded-xl ${look.key}`} aria-label={`${c.label} simge çıkar`}><Minus size={20} /></button>
              {key > 1 && <button type="button" onClick={() => onChange(i, vals[i] + 1)} disabled={half > 0} className={`grid h-12 place-items-center rounded-xl px-2 text-sm font-black disabled:opacity-30 ${look.key}`} aria-label={`${c.label} yarım simge ekle`}>+½</button>}
              <button type="button" onClick={() => onChange(i, vals[i] - half + key)} className={`grid ${big ? 'size-14' : 'size-12'} place-items-center rounded-xl ${look.key}`} aria-label={`${c.label} simge ekle`}><Plus size={20} /></button>
            </div>
          </div>
        )
      })}
      {key > 1 && <p className={`text-center font-black ${look.strong}`}>Anahtar: 🙂 = {key} öğrenci · yarım simge = 1 öğrenci</p>}
    </div>
  )
}

/** Nokta grafiği kurucu */
function DotBuilder({ look, inv, vals, onChange }: { look: Look; inv: Inv; vals: number[]; onChange: (i: number, v: number) => void }) {
  const W = 600, H = 300, L = 30, B = 46
  const n = inv.cats.length
  const cw = (W - 2 * L) / n
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Nokta grafiği">
        <line x1={L} x2={W - L} y1={H - B} y2={H - B} stroke={ink} strokeWidth={2.5} />
        {inv.cats.map((c, i) => (
          <g key={c.id} onClick={() => onChange(i, Math.min(14, vals[i] + 1))} style={{ cursor: 'pointer' }}>
            <rect x={L + i * cw} y={0} width={cw} height={H - B} fill="transparent" />
            {Array.from({ length: vals[i] }, (_, k) => <circle key={k} cx={L + i * cw + cw / 2} cy={H - B - 12 - k * 18} r={8} fill="#db2777" stroke="#fff" strokeWidth={2} />)}
            <line x1={L + i * cw + cw / 2} x2={L + i * cw + cw / 2} y1={H - B - 5} y2={H - B + 5} stroke={ink} strokeWidth={2} />
            <text x={L + i * cw + cw / 2} y={H - B + 24} textAnchor="middle" fontSize={16} fontWeight={900} fill={ink}>{c.label}</text>
          </g>
        ))}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={13} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>kardeş sayısı</text>
      </svg>
      <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, paddingLeft: `${(L / W) * 100}%`, paddingRight: `${(L / W) * 100}%` }}>
        {inv.cats.map((c, i) => (
          <div key={c.id} className="flex justify-center gap-1">
            <button type="button" aria-label={`${c.label} nokta çıkar`} onClick={() => onChange(i, Math.max(0, vals[i] - 1))} className={`grid size-11 place-items-center rounded-xl ${look.key}`}><Minus size={18} /></button>
            <button type="button" aria-label={`${c.label} nokta ekle`} onClick={() => onChange(i, Math.min(14, vals[i] + 1))} className={`grid size-11 place-items-center rounded-xl ${look.key}`}><Plus size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function GosterStep({ inv, grade, look, freq, edges, onDone }: { inv: Inv; grade: Grade; look: Look; freq: number[]; edges?: number[]; onDone: (first: boolean, display: DisplayId) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [disp, setDisp] = useState<DisplayId | null>(null)
  const [wrong, setWrong] = useState<DisplayId[]>([])
  const [vals, setVals] = useState<number[]>(() => freq.map(() => 0))
  const [ok, setOk] = useState(false)
  const misses = useRef(0)
  const opts = useMemo(() => shuffle(inv.displays), [inv])
  const choose = (d: (typeof inv.displays)[number]) => {
    track.attempt(d.ok)
    if (!d.ok) {
      misses.current++
      setWrong((w) => [...w, d.id])
      fb.say(d.why!, { mis: d.mis })
      return
    }
    sfx.ok()
    setDisp(d.id)
    track.strategy(`Gösterim: ${DISPLAY_NAME[d.id]}`)
    fb.say(d.id === 'hist' ? 'Evet! Sürekli veriyi eşit aralıklarla gösteren, sütunları bitişik grafik: histogram. Şimdi sütunları sıklık tablosuna göre yükselt.' : `Güzel seçim: ${DISPLAY_NAME[d.id]}. Şimdi tablondaki sayılara göre oluştur.`, { tone: 'ok' })
  }
  const set = (i: number, v: number) => setVals((a) => a.map((x, j) => (j === i ? v : x)))
  const check = () => {
    const w = freq.findIndex((f, i) => vals[i] !== f)
    track.attempt(w < 0)
    if (w >= 0) {
      misses.current++
      const lbl = inv.kind === 'cont' ? `${edges![w]}–${edges![w + 1]} aralığı` : catLabel(inv, w)
      const scaleMis = disp === 'bar' && inv.scale > 1 && vals[w] * inv.scale === freq[w]
      const keyMis = (disp === 'picto') && inv.key > 1 && Math.floor(vals[w] / inv.key) === freq[w]
      fb.say(
        keyMis ? `${lbl}: tabloda ${freq[w]} öğrenci var. Bir simge ${inv.key} öğrenciyi gösteriyorsa kaç simge gerekir?` : scaleMis ? `${lbl}: eksendeki çizgiler ${inv.scale}’şer ${inv.scale}’şer artıyor. Sütunun ucu hangi sayının hizasında olmalı?` : `${lbl} kaç olmalı? Sıklık tablona bak.`,
        { mis: keyMis ? 'Resim grafiği anahtarını kullanmadı' : scaleMis ? 'Ölçekli eksende çentik sayısını değer sandı' : undefined },
      )
      return
    }
    sfx.ok()
    setOk(true)
    track.item(misses.current === 0)
    fb.say('Grafik hazır ve tabloyla birebir aynı! Şimdi verinin ne anlattığını yorumlayalım.', { tone: 'ok' })
  }
  const labels = inv.kind === 'cont' ? edges!.slice(0, -1).map((a, i) => `${a}–${edges![i + 1]}`) : inv.cats.map((c) => (inv.kind === 'disc' ? c.label : c.label))
  const colors = inv.kind === 'cont' ? ['#7c3aed'] : inv.cats.map((c) => c.color)
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {inv.kind === 'cont'
              ? <Pill look={look}>Sıklıklar: {freq.join(' · ')}</Pill>
              : inv.cats.map((c, i) => <Pill key={c.id} look={look}>{inv.kind === 'cat' && <span aria-hidden>{c.emoji}</span>}{catLabel(inv, i)}: <b>{freq[i]}</b></Pill>)}
          </div>
          {!disp && <p className={`py-16 text-center text-lg font-black ${look.muted}`}>Önce sağdan uygun gösterimi seç.</p>}
          {disp && (
            <ZoomBox maxScale={2.5} controls={false}>
              {(disp === 'picto' || disp === 'object') && <PictoBuilder look={look} inv={inv} vals={vals} onChange={set} big={look.big} />}
              {disp === 'bar' && <BarBuilder look={look} labels={labels} colors={colors} vals={vals} onChange={set} scale={inv.scale} maxV={Math.max(...freq)} unit={inv.kind === 'disc' ? 'kardeş sayısı' : undefined} />}
              {disp === 'dot' && <DotBuilder look={look} inv={inv} vals={vals} onChange={set} />}
              {disp === 'hist' && <BarBuilder look={look} labels={labels} colors={colors} vals={vals} onChange={set} scale={inv.scale} maxV={Math.max(...freq)} adjacent unit={inv.unit} />}
            </ZoomBox>
          )}
          {disp && <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>{disp === 'bar' || disp === 'hist' ? 'Sütunun içinde parmağını yukarı-aşağı kaydır ya da ± düğmelerini kullan.' : disp === 'dot' ? 'Bir sayının üstüne dokununca nokta eklenir.' : 'Her satıra simge ekle ya da çıkar.'}</p>}
        </Scene>
      }
      panel={
        <Panel look={look} title={disp ? `${DISPLAY_NAME[disp]} oluştur` : 'Hangi grafik?'} icon="📊">
          {!disp && (
            <div className="grid gap-2">
              {opts.map((d) => (
                <Choice key={d.id} look={look} state={wrong.includes(d.id) ? 'wrong' : 'idle'} disabled={wrong.includes(d.id)} onClick={() => choose(d)}>
                  <span className="flex items-center gap-3"><Thumb id={d.id} look={look} />{DISPLAY_NAME[d.id]}</span>
                </Choice>
              ))}
            </div>
          )}
          {disp && !ok && <button type="button" className="btn-primary mt-1 min-h-14 w-full text-lg" onClick={check}><Check size={20} />Grafiği kontrol et</button>}
          {fb.node}
          {ok && <NextButton label="Yorumla" onClick={() => onDone(misses.current === 0, disp!)} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── 5. Yorumla ─────────────────────────

interface St { t: string; ok: boolean; why?: string; mis?: string }

function statements(inv: Inv, grade: Grade, freq: number[], edges?: number[]): St[] {
  const N = inv.answers.length
  const out: St[] = []
  const gen = 'Biz yalnız kendi sınıfımıza sorduk. Bu sonucu herkese genelleyebilir miyiz?'
  if (inv.kind === 'cont') {
    const u = inv.unit!
    const mx = Math.max(...freq)
    const modal = freq.filter((f) => f === mx).length === 1 ? freq.indexOf(mx) : -1
    const sorted = [...inv.answers].sort((a, b) => a - b)
    const range = sorted[N - 1] - sorted[0]
    if (modal >= 0) out.push({ t: `En çok öğrenci ${edges![modal]}–${edges![modal + 1]} ${u} aralığında.`, ok: true })
    out.push({ t: `En büyük ve en küçük değer arasındaki fark (açıklık) ${range} ${u}.`, ok: true })
    const cut = edges!.find((e) => sorted.filter((v) => v < e).length > N / 2)!
    out.push({ t: `Öğrencilerin yarısından fazlası için bu süre ${ek(cut, 'abl')} az.`, ok: true })
    const lim = u === 'dakika' ? 30 : 25
    const over = sorted.filter((v) => v > lim).length
    out.push({ t: `Hiçbir öğrencinin süresi ${ek(lim, 'abl')} fazla değil.`, ok: over === 0, why: `Histogramın en sağındaki sütunlara bak. ${ek(lim, 'abl')} fazla süre bildiren öğrenci var mı?` })
    out.push(u === 'dakika'
      ? { t: 'Okula uzun sürede gelen öğrencilerin dersleri daha kötüdür.', ok: false, why: 'Topladığımız veride ders başarısı ile ilgili bir bilgi var mı? Veri bu sonucu destekliyor mu?', mis: 'Veride olmayan bir ilişki (neden-sonuç) çıkardı' }
      : { t: 'Ekran süresi arttıkça öğrencilerin uykusu azalır.', ok: false, why: 'Uyku süresini ölçtük mü? Verimiz bu sonucu destekliyor mu?', mis: 'Veride olmayan bir ilişki (neden-sonuç) çıkardı' })
    out.push({ t: u === 'dakika' ? 'Türkiye’deki bütün öğrenciler okula 20 dakikadan kısa sürede gelir.' : 'Bu sonuç Türkiye’deki bütün gençler için de geçerlidir.', ok: false, why: u === 'dakika' ? gen : 'Örneklemimiz yalnız bizim okulumuzdan. Başka şehirlerdeki gençleri temsil eder mi?', mis: 'Örneklemden aşırı genelleme yaptı' })
    return out
  }
  if (inv.kind === 'disc') {
    const vals = inv.cats.map((c) => Number(c.label))
    const data = inv.answers
    const sorted = [...data].sort((a, b) => a - b)
    const mean = data.reduce((s, x) => s + x, 0) / N
    const med = N % 2 ? sorted[(N - 1) / 2] : (sorted[N / 2 - 1] + sorted[N / 2]) / 2
    const mode = vals[freq.indexOf(Math.max(...freq))]
    const range = sorted[N - 1] - sorted[0]
    const atLeast1 = data.filter((x) => x >= 1).length
    out.push({ t: `En çok görülen kardeş sayısı (tepe değer) ${mode}.`, ok: true })
    out.push({ t: `Ortanca ${fmtN(med, 1)}: öğrencilerin yarısının kardeş sayısı bu değer ya da daha az.`, ok: true })
    out.push({ t: `Ortalama kardeş sayısı yaklaşık ${fmtN(mean, 1)}.`, ok: true })
    out.push({ t: `Öğrencilerin yarısından fazlasının en az 1 kardeşi var.`, ok: atLeast1 > N / 2, why: 'Kaç öğrencinin kardeş sayısı 1 ya da daha fazla? Toplam öğrenci sayısının yarısı kaç?' })
    out.push({ t: `Açıklık ${inv.cats.length}, çünkü ${inv.cats.length} farklı cevap var.`, ok: range === inv.cats.length, why: 'Açıklık, en büyük değer ile en küçük değer arasındaki farktır. En büyük ve en küçük kardeş sayısı kaç?', mis: 'Açıklığı farklı değer sayısıyla karıştırdı' })
    if (Math.abs(mean - mode) > 0.05) out.push({ t: `Ortalama ${mode}, çünkü en çok ${mode} cevabı verildi.`, ok: false, why: 'En çok verilen cevabın adı ne? Ortalamayı bulmak için tüm kardeş sayılarını ne yapmalıyız?', mis: 'Ortalama ile tepe değeri karıştırdı' })
    out.push({ t: 'Türkiye’deki çocukların çoğunun 1 kardeşi vardır.', ok: false, why: gen, mis: 'Küçük bir örneklemden aşırı genelleme yaptı' })
    return out
  }
  // kategorik
  const L = (i: number) => inv.cats[i].label
  const mxV = Math.max(...freq), mnV = Math.min(...freq)
  const mx = freq.indexOf(mxV)
  const minUnique = freq.filter((f) => f === mnV).length === 1
  const mn = freq.indexOf(mnV)
  const second = freq.map((f, i) => ({ f, i })).filter((x) => x.i !== mx).sort((a, b) => b.f - a.f)[0].i
  const other = freq.map((_, i) => i).filter((i) => i !== mx)[0]
  const half = freq.map((_, i) => i).find((i) => i !== mx && freq[i] * 2 !== freq[mx]) ?? second
  if (grade <= 2) {
    out.push({ t: `En çok “${L(mx)}” denmiş.`, ok: true })
    if (minUnique) out.push({ t: `En az “${L(mn)}” denmiş.`, ok: true })
    out.push({ t: `“${L(mx)}” diyenler, “${L(second)}” diyenlerden ${freq[mx] - freq[second]} kişi fazla.`, ok: true })
    out.push({ t: `En çok “${L(other === mx ? second : (freq[other] === mxV ? second : other))}” denmiş.`, ok: false, why: 'Hangi satırda en çok nesne var? Sayıları karşılaştır.' })
    out.push({ t: `Herkes “${L(mx)}” demiş.`, ok: false, why: 'Başka cevap veren arkadaşların da var mı? Tabloya bak.' })
    return out
  }
  out.push({ t: `En çok “${L(mx)}” cevabı verildi.`, ok: true })
  if (minUnique) out.push({ t: `En az “${L(mn)}” cevabı verildi.`, ok: true })
  out.push({ t: `“${L(mx)}” diyenler, “${L(second)}” diyenlerden ${freq[mx] - freq[second]} kişi fazla.`, ok: true })
  out.push({ t: `Toplam ${N} öğrenciye sorduk.`, ok: true })
  out.push({ t: `“${L(mx)}” diyenler, “${L(half)}” diyenlerin iki katı.`, ok: freq[mx] === 2 * freq[half], why: `“${L(mx)}” ${freq[mx]} kişi, “${L(half)}” ${freq[half]} kişi. ${freq[half]}’in iki katı kaç eder?` })
  out.push({ t: `Türkiye’deki bütün çocukların en sevdiği cevap “${L(mx)}”.`, ok: false, why: gen, mis: 'Küçük bir örneklemden aşırı genelleme yaptı' })
  if (grade >= 4) out.push({ t: `Sınıfın yarısından fazlası “${L(mx)}” dedi.`, ok: freq[mx] > N / 2, why: `${N} öğrencinin yarısı kaç? “${L(mx)}” diyen kaç kişi?`, mis: 'En çok seçileni çoğunluk (yarıdan fazla) sandı' })
  return out
}

function YorumlaStep({ inv, grade, look, freq, edges, onDone }: { inv: Inv; grade: Grade; look: Look; freq: number[]; edges?: number[]; onDone: (first: boolean, found: number) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const sts = useMemo(() => shuffle(statements(inv, grade, freq, edges)), [inv, grade, freq, edges])
  const [wrong, setWrong] = useState<string[]>([])
  const misses = useRef(0)
  const need = grade <= 2 ? 2 : 3
  const pick = (s: St) => {
    track.attempt(s.ok)
    if (!s.ok) {
      misses.current++
      setWrong((w) => [...w, s.t])
      fb.say(s.why!, { mis: s.mis })
      return
    }
    const fresh = sols.add(s.t, s.t.length > 40 ? `${s.t.slice(0, 38)}…` : s.t)
    if (!fresh) return
    const n = sols.list.length + 1
    if (n === need) track.item(misses.current === 0)
    fb.say(n >= need ? 'Harika! Verimiz bu sonuçları destekliyor. Bir araştırma döngüsünü baştan sona tamamladın.' : 'Evet, veri bunu destekliyor! Başka bir sonuç daha bul.', { tone: 'ok' })
  }
  const done = sols.list.length >= need
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <p className={`mb-3 text-center text-lg font-black ${look.strong}`}>{inv.emoji} {inv.topic}</p>
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {inv.kind === 'cont'
              ? freq.map((f, i) => <Pill key={i} look={look}>{edges![i]}–{edges![i + 1]}: <b>{f}</b></Pill>)
              : inv.cats.map((c, i) => <Pill key={c.id} look={look}>{inv.kind === 'cat' && <span aria-hidden>{c.emoji}</span>}{catLabel(inv, i)}: <b>{freq[i]}</b></Pill>)}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sts.map((s) => {
              const got = sols.list.some((x) => x.key === s.t)
              return <Choice key={s.t} look={look} text={s.t} state={got ? 'right' : wrong.includes(s.t) ? 'wrong' : 'idle'} disabled={got || wrong.includes(s.t) || done} onClick={() => pick(s)} />
            })}
          </div>
          <Cycle look={look} at={4} />
        </Scene>
      }
      panel={
        <Panel look={look} title="Veri ne söylüyor?" icon={<ClipboardList size={20} />}>
          <p className={`text-[15px] font-semibold ${look.muted}`}>Verimizin desteklediği {need} sonuç bul. Dikkat: bazı cümleler veriden çıkarılamaz!</p>
          {fb.node}
          <SolutionList list={sols.list} goal={need} />
          {done && <NextButton onClick={() => onDone(misses.current === 0, sols.list.length)} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function VeriToplama({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const inv = useMemo(() => invFor(grade), [grade])
  const [i, setI] = useState(0)
  const [freq, setFreq] = useState<number[]>([])
  const [edges, setEdges] = useState<number[] | undefined>()
  const [disp, setDisp] = useState<DisplayId | null>(null)
  const firsts = useRef(0)
  const next = (first: boolean) => {
    if (first) firsts.current++
    setI((x) => x + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const finish = (first: boolean, found: number) => {
    if (first) firsts.current++
    onFinish({
      summary: `“${inv.topic}” araştırmasında ${inv.answers.length} öğrenciden veri topladın, ${disp ? DISPLAY_NAME[disp].toLocaleLowerCase('tr') : 'grafik'} oluşturdun ve ${found} sonuç çıkardın.`,
      insight:
        grade <= 2
          ? 'Bir soru sorup herkesin cevabını topladık, sayıp grafiğe döktük. Grafiğe bakınca en çok ve en az seçileni hemen görebiliriz.'
          : grade <= 5
            ? 'İyi bir araştırma sorusu herkese sorulabilir ve farklı cevaplar bekler. Çeteleyle toplanan veri tabloya, tablo da uygun bir grafiğe dönüşür; sonuç çıkarırken yalnız soru sorduğumuz grubu konuşabiliriz.'
            : grade === 6
              ? 'Sayısal veride tepe değer, ortanca, ortalama ve açıklık verinin farklı yönlerini anlatır. Nokta grafiği dağılımın şeklini gösterir.'
              : 'Sürekli veriyi eşit genişlikte aralıklarla gruplayıp histogramla gösteririz; farklı aralık genişlikleri farklı ayrıntılar gösterir. Sonuçlar ancak örneklemin temsil ettiği gruba genellenebilir.',
      stars: starsBy(firsts.current, STEPS.length),
    })
  }
  const st = STEPS[i]
  let body: ReactNode
  if (st.id === 'soru') body = <SoruStep inv={inv} grade={grade} look={look} onDone={next} />
  else if (st.id === 'topla') body = <ToplaStep inv={inv} grade={grade} look={look} onDone={next} />
  else if (st.id === 'duzenle') body = <DuzenleStep inv={inv} grade={grade} look={look} onDone={(f, fr, ed) => { setFreq(fr); setEdges(ed); next(f) }} />
  else if (st.id === 'goster') body = <GosterStep inv={inv} grade={grade} look={look} freq={freq} edges={edges} onDone={(f, d) => { setDisp(d); next(f) }} />
  else body = <YorumlaStep inv={inv} grade={grade} look={look} freq={freq} edges={edges} onDone={finish} />
  const titles: Record<(typeof STEPS)[number]['id'], string> = {
    soru: 'Bir araştırma sorusu seç',
    topla: grade <= 2 ? 'Arkadaşlarına sor ve cevapları kaydet' : 'Sınıfa sor, cevapları kaydet',
    duzenle: inv.kind === 'cont' ? 'Verileri eşit aralıklarla grupla' : 'Verileri sıklık tablosuna dök',
    goster: 'Uygun grafiği seç ve oluştur',
    yorumla: 'Veri ne söylüyor? Sonuç çıkar',
  }
  return (
    <LastTask.Provider value={i === STEPS.length - 1}>
      <TopBar look={look} step={i} total={STEPS.length} title={titles[st.id]} emoji={st.emoji} kicker={`${inv.emoji} ${inv.topic}`} />
      <div key={i}>{body}</div>
    </LastTask.Provider>
  )
}
