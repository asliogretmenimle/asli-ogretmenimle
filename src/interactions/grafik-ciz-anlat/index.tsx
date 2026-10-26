import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Eye, Lightbulb, PencilLine, Plus, Trash2, Undo2, X } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Derived, Header, Layout, NextButton, Nudge, NumPad, PickBtn, isDark, num, parseNum, useSession } from '../oruntuden-kurala/ortak'
import { ARROW, GraphPlane, MiniGraph, checkSketch, groups, nearestSeg, segs, type Axes, type Kind, type Pt, type Seg } from '../grafik-hikayeleri/graf'
import { makeTasks, type CompareTask, type OpenTask, type SketchTask } from './data'

/**
 * 62. Grafik Çiz ve Anlat — durumu grafikle modelle, sonra yorumla (Van de Walle: fonksiyon = değişim).
 *  - Çiz: düzleme dokunarak nokta ekle, sürükleyerek düzelt (bağımsız y ölçeği, iki parmakla yakınlaştırma).
 *    Denetim nitel özelliklere göre: başlangıç, yükselen/düz/inen sırası, görece diklik, bükülme, (7–8) sayısal değerler.
 *  - Anlat: en dik parçaya dokun, düz parçayı yorumla, (7–8) birim zamandaki değişimi hesapla, (8) doğrusal kural.
 *  - Karşılaştır: arkadaşların çizimlerini kendi çiziminin üstüne koy; hangileri hikâyeye uyar?
 *  - Açık uçlu: aynı başlangıç ve bitişe giden farklı grafikler (useSolutions).
 */

const VIOLET = '#7c3aed'
type Done = { first: boolean; kind: 'sketch' | 'compare' | 'open' }
type NudgeS = { q: string; mis?: string; n: number; tone?: 'ok' } | null

export default function GrafikCizAnlat({ grade, onFinish }: InteractionProps) {
  const [tasks] = useState(() => makeTasks(grade))
  const S = useSession(tasks.length)
  const sol = useSolutions()
  const dark = isDark(grade)
  const [log, setLog] = useState<Done[]>([])
  const t = tasks[S.idx]
  const onDone = (d: Done) => {
    setLog((l) => [...l, d])
    S.complete(d.first)
  }
  const finish = () => {
    const sk = log.filter((d) => d.kind !== 'open').length
    onFinish({
      stars: S.stars(Math.max(0, sol.list.length - 2) * 0.5),
      summary: `${sk} durumu grafikle anlattın ve ${sol.list.length} farklı kumbara grafiği çizdin.`,
      insight:
        grade <= 6
          ? 'Bir durumu grafikle anlatırken önce başlangıcı bulur, sonra hikâyeyi parçalara ayırırız: artıyor mu, değişmiyor mu, azalıyor mu? Hızlı değişim dik, yavaş değişim yatık çizgiyle gösterilir. Aynı hikâyeye uyan farklı grafikler olabilir.'
          : grade === 7
            ? 'Grafikteki bir parçanın dikliği, birim zamandaki değişimdir: (600 − 200) ÷ 10 = dakikada 40 L. Sabit hızla değişen durumlar düz bir çizgi, hızı değişen durumlar (soğuyan çay) bükülen bir eğri verir.'
            : 'Sabit hızla değişen bir durum doğrusal fonksiyondur: y = mx + n’de m eğim (birim zamandaki değişim), n başlangıç değeridir. Soğuyan çay gibi durumlarda eğim değiştiği için grafik bir doğru değildir.',
    })
  }
  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // yeni görevde (telefonda sayfa aşağıdaysa) görevin başına dön
    const el = topRef.current
    if (S.idx > 0 && el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [S.idx])
  const footer = S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />
  return (
    <Scene grade={grade}>
      <div ref={topRef} className="scroll-mt-20" />
      <Header icon={<span className="text-xl" aria-hidden>{t.emoji}</span>} color={VIOLET} idx={S.idx} total={tasks.length} title={t.title} dark={dark} />
      {t.kind === 'sketch' && <SketchView key={S.idx} t={t} grade={grade} dark={dark} onDone={onDone} footer={footer} />}
      {t.kind === 'compare' && <CompareView key={S.idx} t={t} grade={grade} dark={dark} onDone={onDone} footer={footer} />}
      {t.kind === 'open' && <OpenView key={S.idx} t={t} dark={dark} sol={sol} onDone={onDone} footer={footer} />}
    </Scene>
  )
}

/* ───────────────────────── çizim aracı ───────────────────────── */

function useSketch(initial: Pt[] = []) {
  const [pts, setPtsRaw] = useState<Pt[]>(initial)
  const [sel, setSel] = useState<number | null>(null)
  const hist = useRef<Pt[][]>([])
  const lastPush = useRef(0)
  const setPts = (p: Pt[]) => {
    // bir sürükleme hareketi (art arda gelen değişiklikler) geçmişe tek adım olarak yazılır
    const now = Date.now()
    if (p.length !== pts.length || now - lastPush.current > 400) hist.current.push(pts)
    lastPush.current = now
    setPtsRaw(p)
  }
  const select = (i: number | null) => setSel(i)
  const undo = () => {
    const prev = hist.current.pop()
    if (prev) {
      setPtsRaw(prev)
      setSel(null)
    }
  }
  const del = () => {
    if (sel === null) return
    hist.current.push(pts)
    setPtsRaw(pts.filter((_, i) => i !== sel))
    setSel(null)
  }
  const clear = () => {
    if (!pts.length) return
    hist.current.push(pts)
    setPtsRaw([])
    setSel(null)
  }
  const load = (p: Pt[]) => {
    hist.current.push(pts)
    setPtsRaw(p)
    setSel(null)
  }
  return { pts, setPts, sel, select, undo, del, clear, load, canUndo: hist.current.length > 0 }
}

function Tools({ sk, dark }: { sk: ReturnType<typeof useSketch>; dark: boolean }) {
  const cls = `inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line'}`
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={sk.undo} disabled={!sk.canUndo} className={cls}><Undo2 size={18} />Geri al</button>
      <button type="button" onClick={sk.del} disabled={sk.sel === null} className={cls}><X size={18} />Noktayı sil</button>
      <button type="button" onClick={sk.clear} disabled={!sk.pts.length} className={cls}><Trash2 size={18} />Temizle</button>
    </div>
  )
}

function Hint({ dark }: { dark: boolean }) {
  return (
    <p className={`rounded-2xl px-3 py-2 text-center text-sm font-bold ${dark ? 'bg-slate-800/80 text-slate-200' : 'bg-white/80 text-ink-soft ring-1 ring-line'}`}>
      <Plus size={14} className="mr-1 inline" />Düzleme dokunarak nokta ekle; noktaları sürükleyerek düzelt. Noktalar zaman sırasına göre birleşir.
    </p>
  )
}

/** Çizim + denetim aşaması (çiz ve karşılaştır görevlerinde ortak) */
function useCheck(t: { spec: SketchTask['spec']; axes: Axes; model: Pt[] }, sk: ReturnType<typeof useSketch>, onOk: () => void) {
  const track = useTracker()
  const [nudge, setNudge] = useState<NudgeS>(null)
  const [fails, setFails] = useState(0)
  const [ghost, setGhost] = useState(false)
  const first = useRef(true)
  const say = (q: string, mis?: string, tone?: 'ok') => setNudge((c) => ({ q, mis, tone, n: (c?.n ?? 0) + 1 }))
  const check = () => {
    const v = checkSketch(sk.pts, t.spec, t.axes)
    track.attempt(v.ok)
    if (v.ok) {
      sfx.ok()
      setGhost(false)
      onOk()
      return
    }
    first.current = false
    setFails((f) => f + 1)
    sfx.bad()
    say(v.q ?? 'Hikâyeyi parça parça oku.', v.mis)
  }
  const showGhost = () => {
    track.hint()
    first.current = false
    setGhost((g) => !g)
  }
  return { nudge, setNudge, say, check, fails, ghost, showGhost, first }
}

function SketchPanel({ story, parts, sk, chk, dark, axes }: { story: string; parts: string[]; sk: ReturnType<typeof useSketch>; chk: ReturnType<typeof useCheck>; dark: boolean; axes: Axes }) {
  const track = useTracker()
  const [hint, setHint] = useState(false)
  const sp = sk.sel !== null ? sk.pts[sk.sel] : null
  return (
    <>
      <Card dark={dark} title="Durum"><p className="text-[16px] leading-snug font-bold">{story}</p></Card>
      <Tools sk={sk} dark={dark} />
      {axes.numbers && sp && (
        <p className={`text-center text-sm font-extrabold ${dark ? 'text-slate-200' : 'text-ink-soft'}`}>Seçili nokta: {num(sp.x)}. {axes.xLabel.match(/\((.+)\)/)?.[1] ?? ''} · {num(sp.y)} {axes.yLabel.match(/\((.+)\)/)?.[1] ?? ''}</p>
      )}
      <div className="flex gap-2">
        <BigButton onClick={chk.check} disabled={sk.pts.length < 2} className="flex-1"><Check size={20} />Kontrol et</BigButton>
        <button type="button" onClick={() => { if (!hint) track.hint(); setHint((h) => !h) }} className="grid min-h-14 min-w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 active:scale-95" aria-label="İpucu"><Lightbulb size={22} /></button>
      </div>
      {hint && (
        <Card dark={dark} title="Hikâyeyi parçalara ayır">
          <ol className="list-decimal space-y-1 pl-5 text-sm font-bold">{parts.map((p) => <li key={p}>{p}</li>)}</ol>
        </Card>
      )}
      {chk.nudge && <Nudge key={chk.nudge.n} question={chk.nudge.q} misconception={chk.nudge.mis} tone={chk.nudge.tone} tool={chk.nudge.tone ? undefined : axes.numbers ? 'egim' : 'grafiklab'} toolTitle={axes.numbers ? 'Eğim aracı' : 'Grafik laboratuvarı'} />}
      {chk.fails >= 3 && (
        <BigButton variant="ghost" onClick={chk.showGhost} className="w-full"><Eye size={18} />{chk.ghost ? 'Örnek çizimi gizle' : 'Örnek bir çizime bak'}</BigButton>
      )}
    </>
  )
}

/* ───────────────────────── Çiz ve anlat ───────────────────────── */

function SketchView({ t, grade, dark, onDone, footer }: { t: SketchTask; grade: Grade; dark: boolean; onDone: (d: Done) => void; footer: ReactNode }) {
  const track = useTracker()
  const sk = useSketch()
  const [phase, setPhase] = useState<'sketch' | 'q' | 'done'>('sketch')
  const [qi, setQi] = useState(0)
  const [hl, setHl] = useState<[number, number] | null>(null)
  const [val, setVal] = useState('')
  const [chip, setChip] = useState<number | null>(null)
  const chk = useCheck(t, sk, () => {
    setPhase('q')
    chk.say('Grafiğin durumu anlatıyor! Şimdi grafiğini yorumla.', undefined, 'ok')
    track.strategy(t.axes.numbers ? 'Sayısal değerlerle nokta yerleştirme' : 'Hikâyeyi parçalara ayırarak çizme')
  })
  const q = t.questions[qi]

  const right = (txt: string) => {
    track.attempt(true)
    sfx.ok()
    chk.say(txt, undefined, 'ok')
    setVal('')
    setChip(null)
    if (qi + 1 >= t.questions.length) {
      setPhase('done')
      track.item(chk.first.current)
      onDone({ first: chk.first.current, kind: 'sketch' })
    } else setQi(qi + 1)
  }
  const wrong = (txt: string, mis?: string) => {
    track.attempt(false)
    chk.first.current = false
    sfx.bad()
    chk.say(txt, mis)
  }

  const tap = (p: Pt) => {
    if (phase !== 'q' || q.kind !== 'tap') return
    const hit = nearestSeg(sk.pts, p, t.axes)
    if (!hit || hit.d > 0.12) return chk.say('Grafiğinin çizgisinin üzerine dokun.')
    setHl([hit.i, hit.i])
    const ss = segs(sk.pts, t.axes)
    let ok: boolean
    if (q.target === 'steepest') {
      const mx = Math.max(...ss.filter((s) => s.kind !== 'flat').map((s) => Math.abs(s.slope)))
      ok = ss[hit.i].kind !== 'flat' && Math.abs(ss[hit.i].slope) >= mx * 0.9
    } else {
      const gs = groups(sk.pts, t.axes)
      const gi = gs.findIndex((g) => hit.i >= g.from && hit.i <= g.to)
      ok = gi === q.target.phase
    }
    if (ok) right(q.ok)
    else wrong(q.wrong, q.mis)
  }

  const checkNum = () => {
    if (q.kind !== 'num') return
    const v = parseNum(val)
    if (Math.abs(v - q.answer) < 1e-6) right(q.ok)
    else wrong(q.hint, q.mis && Math.abs(v - q.mis.value) < 1e-6 ? q.mis.text : undefined)
  }
  const pickChip = (i: number) => {
    if (q.kind !== 'chips') return
    setChip(i)
    const o = q.options[i]
    if (o.ok) right(q.ok)
    else wrong(o.why ?? 'Grafiğine yeniden bak.', o.mis)
  }

  const work = (
    <div className="flex flex-col gap-2">
      <GraphPlane
        axes={t.axes}
        pts={sk.pts}
        mode={phase === 'sketch' ? 'sketch' : phase === 'q' && q.kind === 'tap' ? 'pick' : 'view'}
        onChange={phase === 'sketch' ? sk.setPts : undefined}
        sel={sk.sel}
        onSel={sk.select}
        onPick={tap}
        highlight={phase === 'q' ? hl : null}
        ghosts={chk.ghost ? [{ pts: t.model, color: '#0ea5e9', label: 'örnek' }] : undefined}
        label="Çizim düzlemi"
      />
      {phase === 'sketch' && <Hint dark={dark} />}
    </div>
  )

  const panel = (
    <>
      {phase === 'sketch' && <SketchPanel story={t.story} parts={t.parts} sk={sk} chk={chk} dark={dark} axes={t.axes} />}
      {phase !== 'sketch' && (
        <>
          <Card dark={dark} title="Durum"><p className="text-[15px] leading-snug font-bold">{t.story}</p></Card>
          {phase === 'q' && (
            <Card dark={dark} title={`Grafiğini yorumla · ${qi + 1} / ${t.questions.length}`}>
              <p className="mb-2 text-[16px] leading-snug font-extrabold">{q.prompt}</p>
              {q.kind === 'tap' && <p className={`text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>👆 Grafikteki çizgiye dokun.</p>}
              {q.kind === 'chips' && (
                <div className="flex flex-col gap-1.5">
                  {q.options.map((o, i) => <PickBtn key={i} dark={dark} on={chip === i} onClick={() => pickChip(i)} className="text-left text-[15px]">{o.text}</PickBtn>)}
                </div>
              )}
              {q.kind === 'num' && <NumPad value={val} onChange={setVal} dark={dark} unit={`${q.unit}/dk`} onEnter={checkNum} enterLabel={<><Check size={20} />Kontrol et</>} />}
            </Card>
          )}
          {chk.nudge && <Nudge key={chk.nudge.n} question={chk.nudge.q} misconception={chk.nudge.mis} tone={chk.nudge.tone} />}
          {phase === 'done' && (
            <StrategyPicker
              question="Çizerken en çok neye dikkat ettin?"
              options={['Önce başlangıç noktasını koydum', 'Hikâyeyi parçalara ayırdım', 'Hızlı kısmı daha dik çizdim', ...(grade >= 7 ? ['Sayılardan noktaları hesapladım'] : []), 'Çizip düzelterek ilerledim']}
              onPick={() => {}}
            />
          )}
          {phase === 'done' && footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── Karşılaştır ───────────────────────── */

function CompareView({ t, dark, onDone, footer }: { t: CompareTask; grade: Grade; dark: boolean; onDone: (d: Done) => void; footer: ReactNode }) {
  const track = useTracker()
  const sk = useSketch()
  const [phase, setPhase] = useState<'sketch' | 'judge' | 'done'>('sketch')
  const [judge, setJudge] = useState<(boolean | null)[]>(() => t.mates.map(() => null))
  const [locked, setLocked] = useState<boolean[]>(() => t.mates.map(() => false))
  const [view, setView] = useState<number | null>(null)
  const chk = useCheck(t, sk, () => {
    setPhase('judge')
    chk.say('Senin grafiğin hikâyeye uyuyor! Şimdi arkadaşlarının çizimlerine bak: hangileri uyuyor?', undefined, 'ok')
  })
  const COLS = ['#0ea5e9', '#f97316', '#10b981', '#db2777']

  const check = () => {
    const bad = t.mates.findIndex((m, i) => judge[i] !== m.ok)
    setLocked(t.mates.map((m, i) => locked[i] || judge[i] === m.ok))
    track.attempt(bad < 0)
    if (bad >= 0) {
      chk.first.current = false
      sfx.bad()
      setView(bad)
      setJudge((j) => j.map((v, i) => (i === bad || judge[i] !== t.mates[i].ok ? null : v)))
      const m = t.mates[bad]
      chk.say(m.q, m.ok ? 'Kendi çizimine benzemeyen grafiği yanlış sayma' : m.mis)
      return
    }
    sfx.ok()
    setPhase('done')
    chk.say('Hepsini doğru değerlendirdin! Aynı hikâyeye uyan birden çok grafik olabilir; önemli olan parçaların sırası ve anlamı.', undefined, 'ok')
    track.item(chk.first.current)
    onDone({ first: chk.first.current, kind: 'compare' })
  }

  const work = (
    <div className="flex flex-col gap-3">
      <GraphPlane
        axes={t.axes}
        pts={sk.pts}
        mode={phase === 'sketch' ? 'sketch' : 'view'}
        onChange={phase === 'sketch' ? sk.setPts : undefined}
        sel={sk.sel}
        onSel={sk.select}
        ghosts={phase === 'sketch' ? (chk.ghost ? [{ pts: t.model, color: '#0ea5e9', label: 'örnek' }] : undefined) : view !== null ? [{ pts: t.mates[view].pts, color: COLS[view], label: t.mates[view].name }] : undefined}
        label="Küvet grafiği"
      />
      {phase === 'sketch' && <Hint dark={dark} />}
      {phase !== 'sketch' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {t.mates.map((m, i) => (
            <div key={m.name} className={`rounded-2xl bg-white p-2 text-ink ring-2 transition ${view === i ? '' : 'ring-transparent'}`} style={view === i ? { boxShadow: `0 0 0 3px ${COLS[i]}` } : undefined}>
              <button type="button" onClick={() => setView(view === i ? null : i)} className="block w-full text-left" aria-label={`${m.name} adlı arkadaşın çizimini grafiğin üstünde göster`}>
                <p className="flex items-center justify-between px-1 text-sm font-black"><span style={{ color: COLS[i] }}>{m.name}</span><Eye size={16} className="text-ink-soft" /></p>
                <MiniGraph pts={m.pts} xMax={10} yMax={10} color={COLS[i]} height={110} />
              </button>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    disabled={locked[i] || phase === 'done'}
                    onClick={() => { setJudge((j) => j.map((x, k) => (k === i ? v : x))); chk.setNudge(null) }}
                    className={`min-h-12 rounded-xl text-sm font-black ring-1 transition active:scale-95 ${judge[i] === v ? (v ? 'bg-green-600 text-white ring-green-600' : 'bg-rose-500 text-white ring-rose-500') : 'bg-paper text-ink ring-line'} disabled:cursor-default`}
                    aria-pressed={judge[i] === v}
                  >
                    {v ? 'Uyar ✓' : 'Uymaz ✗'}
                  </button>
                ))}
              </div>
              {phase === 'done' && <p className="mt-1.5 px-1 text-xs leading-snug font-bold text-ink-soft">{m.why}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const panel = (
    <>
      {phase === 'sketch' && <SketchPanel story={t.story} parts={t.parts} sk={sk} chk={chk} dark={dark} axes={t.axes} />}
      {phase !== 'sketch' && (
        <>
          <Card dark={dark} title="Durum"><p className="text-[15px] leading-snug font-bold">{t.story}</p></Card>
          <Card dark={dark} title="Arkadaşlarının çizimleri">
            <p className="text-[15px] font-bold">Her çizime dokunup kendi grafiğinin üstünde gör. Hikâyeye uyuyorsa <b>Uyar</b>, uymuyorsa <b>Uymaz</b> de.</p>
          </Card>
          {phase === 'judge' && <BigButton onClick={check} disabled={judge.some((j) => j === null)} className="w-full"><Check size={20} />Kontrol et</BigButton>}
          {chk.nudge && <Nudge key={chk.nudge.n} question={chk.nudge.q} misconception={chk.nudge.mis} tone={chk.nudge.tone} />}
          {phase === 'done' && (
            <StrategyPicker question="Nasıl karar verdin?" options={['Parçaları sırayla hikâyeyle karşılaştırdım', 'Düz parçaları aradım', 'Başlangıç ve bitişe baktım', 'Dikey çizgilere dikkat ettim']} onPick={() => {}} />
          )}
          {phase === 'done' && footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── Açık uçlu: kumbara ───────────────────────── */

interface Piece { kind: Kind; slope: number; tag: 'slow' | 'fast' | null }

function pieces(ss: Seg[]): Piece[] {
  const out: Piece[] = []
  for (const s of ss) {
    const last = out[out.length - 1]
    const ratio = last ? Math.max(Math.abs(last.slope), Math.abs(s.slope)) / Math.max(1e-9, Math.min(Math.abs(last.slope), Math.abs(s.slope))) : 0
    if (last && last.kind === s.kind && (s.kind === 'flat' || ratio < 1.5)) continue
    out.push({ kind: s.kind, slope: s.slope, tag: null })
  }
  for (const k of ['up', 'down'] as const) {
    const xs = out.filter((p) => p.kind === k)
    const v = xs.map((p) => Math.abs(p.slope))
    if (xs.length >= 2 && Math.max(...v) / Math.min(...v) >= 1.5) {
      const mid = Math.sqrt(Math.max(...v) * Math.min(...v))
      xs.forEach((p) => (p.tag = Math.abs(p.slope) >= mid ? 'fast' : 'slow'))
    }
  }
  return out
}

function OpenView({ t, dark, sol, onDone, footer }: { t: OpenTask; dark: boolean; sol: ReturnType<typeof useSolutions>; onDone: (d: Done) => void; footer: ReactNode }) {
  const track = useTracker()
  const sk = useSketch()
  const [nudge, setNudge] = useState<NudgeS>(null)
  const [last, setLast] = useState<{ arrows: string; story: string } | null>(null)
  const [count, setCount] = useState(0)
  const first = useRef(true)
  const done = useRef(false)
  const a = t.axes
  const say = (q: string, mis?: string, tone?: 'ok') => setNudge((c) => ({ q, mis, tone, n: (c?.n ?? 0) + 1 }))
  const unit = a.yLabel.match(/\((.+)\)/)?.[1]

  const check = () => {
    const p = sk.pts
    const fail = (q: string, mis?: string) => {
      track.attempt(false)
      first.current = false
      sfx.bad()
      say(q, mis)
    }
    if (p.length < 2) return fail('Grafiği çizmek için en az iki nokta koy.')
    if (p[0].x !== 0 || Math.abs(p[0].y - t.start.y) > 1e-6) return fail(`Başlangıçta kumbarada ${a.numbers ? `${num(t.start.y)} ${unit}` : 'ne kadar para'} vardı? Grafiğin ilk noktası mavi halkanın üstünde mi?`, 'Başlangıç değerini hikâyeden okuyamama')
    const e = p[p.length - 1]
    if (e.x !== t.end.x || Math.abs(e.y - t.end.y) > 1e-6) return fail(`6. haftanın sonunda kumbarada ${a.numbers ? `${num(t.end.y)} ${unit}` : 'ne kadar para'} olmalı? Grafiğin son noktası sağdaki mavi halkada mı?`)
    const ps = pieces(segs(p, a))
    const arrows = ps.map((x) => (x.tag === 'fast' ? '⇗' : '') + ARROW[x.kind] + (x.tag === 'slow' ? '·' : '')).join(' ')
    const conn = (i: number) => (i === 0 ? 'Önce' : i === ps.length - 1 ? 'en sonunda' : i === 1 ? 'sonra' : 'ardından')
    const story =
      ps.length === 1 && ps[0].kind === 'up'
        ? `${t.who} her hafta aynı miktarda para biriktirdi.`
        : ps.map((x, i) => `${conn(i)} ${x.tag === 'fast' ? 'hızla ' : x.tag === 'slow' ? 'azar azar ' : ''}${t.words[x.kind]}`).join(', ').replace(/^Önce/, `Önce ${t.who}`) + '.'
    const key = ps.map((x) => x.kind + (x.tag ?? '')).join('-')
    track.attempt(true)
    const fresh = sol.add(`kumbara-${key}`, arrows)
    setLast({ arrows, story })
    if (!fresh) {
      say('Bu grafik daha önce çizdiğinle aynı biçimde. Başka bir hikâye düşün: Ada bir süre hiç para atmamış ya da bir şey satın almış olabilir mi?')
      return
    }
    sfx.ok()
    const n = count + 1
    setCount(n)
    if (ps.some((x) => x.kind === 'down')) track.strategy('Azalan parça ekleyerek farklı grafik kurma')
    if (n >= t.goal && !done.current) {
      done.current = true
      track.item(first.current)
      onDone({ first: first.current, kind: 'open' })
      say('Harika! Aynı başlangıç ve bitiş, farklı hikâyeler. İstersen bir grafik daha çiz.', undefined, 'ok')
    } else say(n < t.goal ? `Bu grafik uyuyor! Şimdi bambaşka bir hikâye anlatan ${t.goal - n} grafik daha çiz.` : 'Bir grafik daha! Kaç farklı hikâye bulabilirsin?', undefined, 'ok')
  }

  const work = (
    <div className="flex flex-col gap-2">
      <GraphPlane
        axes={a}
        pts={sk.pts}
        mode="sketch"
        onChange={sk.setPts}
        sel={sk.sel}
        onSel={sk.select}
        pins={[{ p: t.start, label: 'başlangıç' }, { p: t.end, label: '6. hafta' }]}
        label="Kumbara grafiği"
      />
      <Hint dark={dark} />
    </div>
  )

  const panel = (
    <>
      <Card dark={dark} title="Açık uçlu görev"><p className="text-[16px] leading-snug font-bold">{t.story}</p></Card>
      <Tools sk={sk} dark={dark} />
      <BigButton onClick={check} disabled={sk.pts.length < 2} className="w-full"><PencilLine size={20} />Bu grafiği ekle</BigButton>
      {last && (
        <Derived tone="info">
          <span className="block text-2xl tracking-wider">{last.arrows}</span>
          <span className="mt-1 block text-[15px] leading-snug font-bold">{last.story}</span>
        </Derived>
      )}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {count > 0 && <BigButton variant="ghost" onClick={() => { sk.clear(); setLast(null); setNudge(null) }} className="w-full"><Plus size={18} />Yeni grafik çiz</BigButton>}
      <SolutionList list={sol.list} goal={t.goal} />
      {footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}
