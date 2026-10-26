import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Lightbulb, PenLine, RotateCcw } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Derived, Header, Layout, NextButton, Nudge, NumPad, PickBtn, isDark, num, parseNum, useSession } from '../oruntuden-kurala/ortak'
import { CHIPS, CTX, chipKind, chipSpeed, ctxAxes, makeTasks, type Chip, type Ctx, type EditTask, type MatchTask, type WriteTask } from './data'
import { GraphPlane, MiniGraph, checkSketch, nearestSeg, segs, snapPt, speedOf, type Pt } from './graf'

/**
 * 61. Grafik Hikâyeleri — hikâye ↔ grafik çevirisi (Van de Walle: fonksiyon = değişim)
 *  - Eşleştir: hikâye kartlarını grafiklere sürükle (ya da dokun-dokun). Çeldiriciler gerçek yanılgılardan:
 *    grafiği resim gibi okuma, düz parçayı hareket sanma, dönüşü uzaklaşma sanma, değerleri/hızı okuyamama.
 *  - Düzenle: bağımsız y ölçekli düzlemde grafiğin köşelerini sürükleyerek yeni bir hikâyeye uydur.
 *  - Yaz: verilen grafiğin her parçası için cümle seç; aynı grafiğe farklı bağlamlarda hikâyeler yaz (useSolutions).
 */

const VIOLET = '#7c3aed'
const LETTERS = ['A', 'B', 'C', 'D']
const LCOL = ['#7c3aed', '#0284c7', '#d97706', '#db2777']

type Done = { first: boolean; kind: 'match' | 'write' | 'edit' }

export default function GrafikHikayeleri({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
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
    const c = (k: Done['kind']) => log.filter((d) => d.kind === k).length
    const parts = [c('match') && `${c('match')} eşleştirme turu`, c('edit') && `${c('edit')} grafik düzenleme`, sol.list.length && `${sol.list.length} farklı hikâye`].filter(Boolean)
    onFinish({
      stars: S.stars(Math.min(1, Math.max(0, sol.list.length - c('write')) * 0.5)),
      summary: `${parts.join(', ')} tamamladın.`,
      insight:
        grade <= 6
          ? 'Bir zaman grafiği bir hikâye anlatır: yükselen parça artışı, düz parça değişmeyen durumu, inen parça azalmayı gösterir. Ne kadar dikse değişim o kadar hızlıdır. Grafik bir resim değildir; y ekseninde ne olduğuna bakmak gerekir.'
          : grade === 7
            ? 'Grafikteki her parçanın dikliği bir hızı (birim zamandaki değişimi) gösterir: 10 dakikada 500 m, dakikada 50 m demektir. Aynı grafik, eksenlerin anlamı değişince farklı hikâyeler anlatabilir.'
            : 'Sabit hızla değişen bir durum doğrusal bir grafik verir: y = mx + n’de m her dakikadaki değişim (eğim), n başlangıç değeridir. Eğim değişince grafik kırılır ve yeni bir kural başlar.',
    })
  }

  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // yeni görevde (telefonda sayfa aşağıdaysa) görevin başına dön
    const el = topRef.current
    if (S.idx > 0 && el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [S.idx])
  const footer = S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />
  const icon = t.kind === 'match' ? <BookOpen size={22} /> : t.kind === 'write' ? <PenLine size={22} /> : <span className="text-xl" aria-hidden>📈</span>

  return (
    <Scene grade={grade}>
      <div ref={topRef} className="scroll-mt-20" />
      <Header icon={icon} color={VIOLET} idx={S.idx} total={tasks.length} title={t.title} dark={dark} />
      {t.kind === 'match' && <MatchView key={S.idx} t={t} grade={grade} dark={dark} onDone={onDone} footer={footer} />}
      {t.kind === 'write' && <WriteView key={S.idx} t={t} idx={S.idx} dark={dark} sol={sol} onDone={onDone} footer={footer} />}
      {t.kind === 'edit' && <EditView key={S.idx} t={t} dark={dark} onDone={onDone} footer={footer} />}
    </Scene>
  )
}

/* ───────────────────────── Eşleştir ───────────────────────── */

function StoryCard({ letter, color, text, picked, placed, locked, onTap, onDrop, dark }: { letter: string; color: string; text: string; picked: boolean; placed: boolean; locked: boolean; onTap: () => void; onDrop: (graph: string) => void; dark: boolean }) {
  const [off, setOff] = useState<{ x: number; y: number } | null>(null)
  const bind = useDrag(
    ({ down, movement: [mx, my], xy: [x, y], tap, last }) => {
      if (tap || locked) return
      setOff(down ? { x: mx, y: my } : null)
      if (last) {
        const el = document.elementsFromPoint(x, y).map((e) => e.closest('[data-graph]')).find(Boolean)
        const id = el?.getAttribute('data-graph')
        if (id) onDrop(id)
      }
    },
    { filterTaps: true },
  )
  return (
    <button
      type="button"
      {...bind()}
      onClick={() => !locked && onTap()}
      data-story={letter}
      className={`relative flex min-h-14 w-full items-start gap-2.5 rounded-2xl p-3 text-left text-[15px] leading-snug font-bold transition ${off ? 'z-40 scale-[1.03] shadow-2xl' : ''} ${locked ? 'opacity-70' : ''} ${dark ? 'bg-slate-800 text-slate-100' : 'bg-white text-ink'}`}
      style={{ touchAction: 'none', transform: off ? `translate(${off.x}px, ${off.y}px)` : undefined, boxShadow: picked ? `0 0 0 3px ${color}` : placed ? `inset 0 0 0 2px ${color}66` : dark ? 'inset 0 0 0 1px #475569' : 'inset 0 0 0 1px #e7e8f2' }}
      aria-pressed={picked}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg text-base font-black text-white" style={{ background: color }}>{locked ? <Check size={18} strokeWidth={3} /> : letter}</span>
      <span className="flex-1 self-center">{text}</span>
    </button>
  )
}

function MatchView({ t, grade, dark, onDone, footer }: { t: MatchTask; grade: Grade; dark: boolean; onDone: (d: Done) => void; footer: ReactNode }) {
  const track = useTracker()
  const [assign, setAssign] = useState<Record<string, string | null>>({})
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<string | null>(null)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; n: number; tone?: 'ok' } | null>(null)
  const [solved, setSolved] = useState(false)
  const first = useRef(true)
  const sIdx = (id: string) => t.stories.findIndex((s) => s.id === id)

  const place = (sid: string, gid: string) => {
    if (locked.has(sid) || solved) return
    setAssign((a) => {
      const n: Record<string, string | null> = { ...a }
      for (const k of Object.keys(n)) if (n[k] === gid && !locked.has(k)) n[k] = null
      n[sid] = gid
      return n
    })
    setPicked(null)
    setNudge(null)
  }
  const tapGraph = (gid: string) => {
    if (solved) return
    if (picked) return place(picked, gid)
    const sid = Object.keys(assign).find((k) => assign[k] === gid && !locked.has(k))
    if (sid) setAssign((a) => ({ ...a, [sid]: null }))
  }
  const allPlaced = t.stories.every((s) => assign[s.id])

  const check = () => {
    const wrong = t.stories.filter((s) => t.graphs.find((g) => g.id === assign[s.id])?.story !== s.id)
    const nl = new Set(locked)
    t.stories.forEach((s) => !wrong.includes(s) && nl.add(s.id))
    setLocked(nl)
    track.attempt(wrong.length === 0)
    if (!wrong.length) {
      sfx.ok()
      setSolved(true)
      setNudge({ q: 'Hepsi doğru! Her hikâyenin parçalarını grafikte gösterebilir misin?', n: (nudge?.n ?? 0) + 1, tone: 'ok' })
      track.item(first.current)
      onDone({ first: first.current, kind: 'match' })
      return
    }
    first.current = false
    sfx.bad()
    const w = wrong[0]
    const g = t.graphs.find((x) => x.id === assign[w.id])
    const why = g?.why?.[w.id]
    setNudge({ q: `${LETTERS[sIdx(w.id)]} kartı: ${why?.q ?? 'Hikâyeyi parça parça oku. Her parça grafikte nasıl görünmeli?'}`, mis: why?.mis, n: (nudge?.n ?? 0) + 1 })
    setAssign((a) => {
      const n = { ...a }
      wrong.forEach((s) => (n[s.id] = null))
      return n
    })
  }

  const work = (
    <div className={`grid gap-3 ${t.graphs.length > 3 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {t.graphs.map((g, gi) => {
        const sid = Object.keys(assign).find((k) => assign[k] === g.id)
        const si = sid ? sIdx(sid) : -1
        const ok = sid && locked.has(sid)
        return (
          <button
            key={g.id}
            type="button"
            data-graph={g.id}
            onClick={() => tapGraph(g.id)}
            className={`rounded-2xl bg-white p-2 text-left ring-2 transition ${picked ? 'ring-violet-400 hover:ring-violet-600' : ok ? 'ring-green-500' : 'ring-transparent'}`}
            aria-label={`Grafik ${gi + 1}`}
          >
            <MiniGraph pts={g.pts} xMax={t.xMax} yMax={t.yMax} yLabel={t.yTicks ? undefined : t.yLabel} xTicks={t.xTicks} yTicks={t.yTicks} height={grade >= 7 ? 190 : 170} />
            <div className="mt-1 flex min-h-9 items-center justify-between gap-2 px-1">
              <span className="text-xs font-black text-ink-soft">Grafik {gi + 1}{t.xUnit ? ` · ${t.xUnit}, m` : ''}</span>
              {sid ? (
                <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-black text-white" style={{ background: LCOL[si] }}>{ok && <Check size={14} strokeWidth={3} />}{LETTERS[si]}</span>
              ) : (
                <span className="rounded-lg border-2 border-dashed border-line px-2 py-0.5 text-xs font-bold text-ink-soft">boş</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )

  const panel = (
    <>
      <Card dark={dark}><p className="text-[15px] font-bold">{t.prompt}</p></Card>
      <div className="flex flex-col gap-2">
        {t.stories.map((s, i) => (
          <StoryCard key={s.id} letter={LETTERS[i]} color={LCOL[i]} text={s.text} picked={picked === s.id} placed={!!assign[s.id]} locked={locked.has(s.id)} dark={dark} onTap={() => setPicked((p) => (p === s.id ? null : s.id))} onDrop={(gid) => place(s.id, gid)} />
        ))}
      </div>
      {!solved && <BigButton onClick={check} disabled={!allPlaced} className="w-full"><Check size={20} />Kontrol et</BigButton>}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {solved && <StrategyPicker question="Nasıl eşleştirdin?" options={['Düz parçaları aradım', 'Başlangıca ve bitişe baktım', 'Parçaların dikliğini karşılaştırdım', ...(grade >= 7 ? ['Noktaların değerlerini okudum'] : []), 'Hikâyeyi parça parça okudum']} onPick={() => {}} />}
      {footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── Hikâye yaz ───────────────────────── */

const CONN = ['Önce', 'Sonra', 'Ardından', 'Daha sonra', 'En sonunda']

function sentences(ctx: Ctx, picks: (Chip | null)[]) {
  const c = CTX[ctx]
  return picks.map((p, i) => {
    const conn = i === picks.length - 1 && picks.length > 1 ? CONN[4] : CONN[Math.min(i, 3)]
    const who = ctx === 'su' ? c.who.toLocaleLowerCase('tr-TR') : c.who
    return p ? `${conn} ${who} ${c.chips[p]}.` : `${conn} …`
  })
}

function WriteView({ t, idx, dark, sol, onDone, footer }: { t: WriteTask; idx: number; dark: boolean; sol: ReturnType<typeof useSolutions>; onDone: (d: Done) => void; footer: ReactNode }) {
  const track = useTracker()
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [used, setUsed] = useState<Ctx[]>([])
  const n = t.pts.length - 1
  const [picks, setPicks] = useState<(Chip | null)[]>(() => Array(n).fill(null))
  const [cur, setCur] = useState(0)
  const [marks, setMarks] = useState<{ i: number; tone: 'ok' | 'bad' }[]>([])
  const [phase, setPhase] = useState<'ctx' | 'pick' | 'rate' | 'done'>('ctx')
  const [nudge, setNudge] = useState<{ q: string; mis?: string; n: number; tone?: 'ok' } | null>(null)
  const [rate, setRate] = useState('')
  const first = useRef(true)
  const reported = useRef(false)

  const axes = ctxAxes(ctx, t.numbers)
  const s = t.numbers && ctx ? CTX[ctx].scale : 1
  const pts: Pt[] = t.pts.map((p) => ({ x: p.x, y: p.y * s }))
  const all = segs(t.pts)
  const say = (q: string, mis?: string, tone?: 'ok') => setNudge((c) => ({ q, mis, tone, n: (c?.n ?? 0) + 1 }))

  const chooseCtx = (c: Ctx) => {
    setCtx(c)
    setPicks(Array(n).fill(null))
    setCur(0)
    setMarks([])
    setNudge(null)
    setRate('')
    setPhase('pick')
  }

  const pick = (c: Chip) => {
    const np = picks.slice()
    np[cur] = c
    setPicks(np)
    setMarks((m) => m.filter((x) => x.i !== cur))
    setNudge(null)
    const nx = np.findIndex((p, i) => p === null && i > cur)
    const any = np.findIndex((p) => p === null)
    setCur(nx >= 0 ? nx : any >= 0 ? any : cur)
  }

  const tapGraph = (p: Pt) => {
    if (phase !== 'pick') return
    const hit = nearestSeg(pts, p, axes)
    if (hit && hit.d < 0.12) setCur(hit.i)
  }

  const finishStory = () => {
    if (!reported.current) {
      reported.current = true
      track.item(first.current)
      onDone({ first: first.current, kind: 'write' })
    }
    setPhase('done')
  }

  const check = () => {
    if (!ctx) return
    const res = all.map((sg, i) => {
      const p = picks[i]!
      const sp = speedOf(all, sg)
      return { i, kindOk: chipKind(p) === sg.kind, speedOk: !sp || chipSpeed(p) === sp, sg, sp }
    })
    setMarks(res.map((r) => ({ i: r.i, tone: r.kindOk && r.speedOk ? 'ok' : 'bad' })))
    const bad = res.find((r) => !r.kindOk || !r.speedOk)
    track.attempt(!bad)
    if (bad) {
      first.current = false
      sfx.bad()
      setCur(bad.i)
      const k = bad.i + 1
      const y = CTX[ctx].yLabel.toLocaleLowerCase('tr-TR')
      if (!bad.kindOk) {
        const p = picks[bad.i]!
        if (bad.sg.kind === 'flat') say(`${k}. parça düz. Düz bir çizgide ${y} değişiyor mu?`, chipKind(p) !== 'flat' ? 'Düz parçayı değişim (hareket) olarak yorumlama' : undefined)
        else if (chipKind(p) === 'flat') say(`${k}. parça düz mü? Çizgi bu parçada ${bad.sg.kind === 'up' ? 'yükseliyor' : 'iniyor'}; ${y} ne oluyor?`)
        else say(`${k}. parçada çizgi yukarı mı çıkıyor, aşağı mı iniyor? Buna göre ${y} artıyor mu, azalıyor mu?`, ctx === 'uzaklik' ? 'Evden uzaklaşma ile eve dönmeyi karıştırma' : 'Artış ile azalışı karıştırma')
      } else {
        const other = all.find((o) => o.kind === bad.sg.kind && o.i !== bad.i)
        say(`${k}. parçayı ${other ? `${other.i + 1}. parçayla` : 'diğer parçalarla'} karşılaştır: hangisi daha dik? Daha dik çizgi daha hızlı mı, daha yavaş mı değişim demek?`, 'Çizginin dikliğini değişim hızıyla ilişkilendirememe')
      }
      return
    }
    sfx.ok()
    const fresh = sol.add(`${idx}-${ctx}`, `${CTX[ctx].emoji} ${CTX[ctx].name}`)
    setUsed((u) => (u.includes(ctx) ? u : [...u, ctx]))
    if (used.length >= 1 && fresh) track.strategy('Aynı grafiğe farklı bağlamlarda hikâye yazma')
    if (t.rateSeg !== undefined && t.numbers && !reported.current) {
      setPhase('rate')
      say('Hikâyen grafiğe uyuyor! Şimdi bir parçanın hızını grafikten oku.', undefined, 'ok')
    } else {
      say(used.length === 0 ? 'Hikâyen grafiğe uyuyor! Aynı grafik başka bir şeyi de anlatabilir mi?' : 'Aynı grafik, bambaşka bir hikâye! Eksenin anlamı değişti, biçim aynı kaldı.', undefined, 'ok')
      finishStory()
    }
  }

  const rs = t.rateSeg ?? 0
  const rateAns = ctx ? Math.abs(all[rs]?.slope ?? 0) * CTX[ctx].scale : 0
  const checkRate = () => {
    if (!ctx) return
    const v = parseNum(rate)
    const ok = Math.abs(v - rateAns) < 1e-6
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      track.strategy('Grafikten birim zamandaki değişimi okuma')
      say(`Evet: ${rs + 1}. parçada ${CTX[ctx].rateWord.replace('kaç ', `${num(rateAns)} `)} değişiyor. Daha dik parçada bu sayı daha mı büyük olur?`, undefined, 'ok')
      finishStory()
    } else {
      first.current = false
      sfx.bad()
      const a = pts[rs], b = pts[rs + 1]
      say(`${rs + 1}. parçanın başında ve sonunda değerleri oku: ${num(b.x - a.x)} ${CTX[ctx].xUnit}da ${y0(Math.abs(b.y - a.y))} ${CTX[ctx].yUnit} değişiyor. 1 ${CTX[ctx].xUnit}da ne kadar?`, v === Math.abs(b.y - a.y) ? 'Toplam değişimi birim zamandaki değişim (hız) sanma' : undefined)
    }
  }

  const story = ctx ? sentences(ctx, picks) : []
  const left = (Object.keys(CTX) as Ctx[]).filter((c) => !used.includes(c))

  const work = (
    <div className="flex flex-col gap-2">
      <GraphPlane key={`${ctx}`} axes={axes} pts={pts} mode="pick" onPick={tapGraph} highlight={phase === 'pick' ? [cur, cur] : null} segLabels marks={marks} label="Hikâyesi yazılacak grafik" />
      <p className={`rounded-2xl px-3 py-2 text-center text-sm font-bold ${dark ? 'bg-slate-800/80 text-slate-200' : 'bg-white/80 text-ink-soft ring-1 ring-line'}`}>
        {phase === 'ctx' ? 'Önce bu grafiğin neyi anlatabileceğini seç.' : 'Grafiğin bir parçasına dokunarak onu seç, sonra o parça için bir cümle seç.'}
      </p>
    </div>
  )

  const panel = (
    <>
      {phase === 'ctx' && (
        <Card dark={dark} title={used.length ? 'Başka bir bağlam seç' : 'Bu grafik neyi anlatıyor olabilir?'}>
          <div className="flex flex-col gap-2">
            {left.map((c) => (
              <PickBtn key={c} dark={dark} onClick={() => chooseCtx(c)} className="flex items-center gap-2 text-left text-base">
                <span className="text-2xl" aria-hidden>{CTX[c].emoji}</span>
                <span><span className="block">{CTX[c].name}</span><span className="block text-xs font-bold opacity-70">y ekseni: {CTX[c].yLabel.toLocaleLowerCase('tr-TR')}</span></span>
              </PickBtn>
            ))}
          </div>
        </Card>
      )}
      {phase !== 'ctx' && ctx && (
        <Card dark={dark} title={<span className="flex items-center gap-1.5"><span aria-hidden>{CTX[ctx].emoji}</span>{CTX[ctx].name}</span>}>
          <ol className="flex flex-col gap-1">
            {story.map((txt, i) => {
              const m = marks.find((x) => x.i === i)
              return (
                <li key={i}>
                  <button type="button" onClick={() => phase === 'pick' && setCur(i)} className={`flex min-h-11 w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[15px] font-bold transition ${phase === 'pick' && cur === i ? (dark ? 'bg-amber-400/20 ring-2 ring-amber-400' : 'bg-amber-50 ring-2 ring-amber-400') : ''}`}>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-black text-white ${m ? (m.tone === 'ok' ? 'bg-green-600' : 'bg-rose-500') : 'bg-violet-600'}`}>{i + 1}</span>
                    <span className={picks[i] ? '' : 'opacity-50'}>{txt}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
      {phase === 'pick' && ctx && (
        <Card dark={dark} title={`${cur + 1}. parça için bir cümle seç`}>
          <div className="flex flex-col gap-1.5">
            {CHIPS.map((c) => (
              <PickBtn key={c} dark={dark} on={picks[cur] === c} onClick={() => pick(c)} className="text-left text-[15px]">{CTX[ctx].chips[c]}</PickBtn>
            ))}
          </div>
        </Card>
      )}
      {phase === 'pick' && <BigButton onClick={check} disabled={picks.some((p) => !p)} className="w-full"><Check size={20} />Hikâyeyi kontrol et</BigButton>}
      {phase === 'rate' && ctx && (
        <Card dark={dark} title="Hızı oku">
          <p className="mb-2 text-[15px] font-bold">{rs + 1}. parçada {CTX[ctx].rateWord} değişiyor?</p>
          <NumPad value={rate} onChange={setRate} dark={dark} unit={`${CTX[ctx].yUnit}/${CTX[ctx].xUnit}`} onEnter={checkRate} enterLabel={<><Check size={20} />Kontrol et</>} />
        </Card>
      )}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} tool={nudge.tone ? undefined : 'grafiklab'} toolTitle="Grafik laboratuvarı" />}
      {phase === 'done' && left.length > 0 && (
        <BigButton variant="ghost" onClick={() => { setPhase('ctx'); setCtx(null); setMarks([]); setNudge(null) }} className="w-full"><RotateCcw size={18} />Başka bir hikâye yaz</BigButton>
      )}
      <SolutionList list={sol.list.filter((x) => x.key.startsWith(`${idx}-`))} />
      {phase === 'done' && footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}

const y0 = (v: number) => num(v)

/* ───────────────────────── Grafiği düzenle ───────────────────────── */

function EditView({ t, dark, onDone, footer }: { t: EditTask; dark: boolean; onDone: (d: Done) => void; footer: ReactNode }) {
  const track = useTracker()
  const [pts, setPts] = useState<Pt[]>(t.start)
  const [sel, setSel] = useState<number | null>(null)
  const [phase, setPhase] = useState<'edit' | 'follow' | 'done'>('edit')
  const [nudge, setNudge] = useState<{ q: string; mis?: string; n: number; tone?: 'ok' } | null>(null)
  const [hint, setHint] = useState(false)
  const [val, setVal] = useState('')
  const [chip, setChip] = useState<number | null>(null)
  const first = useRef(true)
  const a = t.axes
  const say = (q: string, mis?: string, tone?: 'ok') => setNudge((c) => ({ q, mis, tone, n: (c?.n ?? 0) + 1 }))

  const change = (p: Pt[]) => {
    setPts(p)
    setNudge(null)
  }
  const step = (dx: number, dy: number) => {
    if (sel === null) return
    const q = snapPt({ x: pts[sel].x + dx * a.xStep, y: pts[sel].y + dy * a.yStep }, a)
    const prev = pts[sel - 1], next = pts[sel + 1]
    if ((prev && q.x <= prev.x) || (next && q.x >= next.x)) return
    const o = pts.slice()
    o[sel] = q
    change(o)
  }

  const complete = () => {
    track.item(first.current)
    onDone({ first: first.current, kind: 'edit' })
    setPhase('done')
  }

  const check = () => {
    const v = checkSketch(pts, t.spec, a)
    track.attempt(v.ok)
    if (!v.ok) {
      first.current = false
      sfx.bad()
      say(v.q ?? 'Hikâyeyi parça parça oku.', v.mis)
      return
    }
    sfx.ok()
    if (t.follow) {
      setPhase('follow')
      say('Grafik hikâyeye uyuyor! Şimdi grafiği kullan.', undefined, 'ok')
    } else {
      say('Grafik hikâyeye uyuyor! Her parçanın hikâyede neye karşılık geldiğini bir arkadaşına göster.', undefined, 'ok')
      complete()
    }
  }

  const checkFollow = () => {
    const f = t.follow!
    if (f.kind === 'num') {
      const ok = Math.abs(parseNum(val) - f.answer) < 1e-6
      track.attempt(ok)
      if (ok) {
        sfx.ok()
        say(`Evet, ${num(f.answer)} ${f.unit}. Bu, o parçanın dikliğini (eğimini) anlatan sayı.`, undefined, 'ok')
        complete()
      } else {
        first.current = false
        sfx.bad()
        say(f.hint)
      }
    }
  }
  const pickChip = (i: number) => {
    const f = t.follow
    if (!f || f.kind !== 'chips') return
    setChip(i)
    const o = f.options[i]
    track.attempt(o.ok)
    if (o.ok) {
      sfx.ok()
      track.strategy('Başlangıç değeri ve birim zamandaki değişimle kural yazma')
      say('Evet! 200 başlangıçtaki su, 40 her dakika eklenen su: grafiğin eğimi.', undefined, 'ok')
      complete()
    } else {
      first.current = false
      sfx.bad()
      say(o.why ?? 'Kuralı x = 0 ve x = 10 için dene.', o.text === 'y = 200x + 40' ? 'Eğim ile başlangıç değerini karıştırma' : undefined)
    }
  }

  const sp = sel !== null ? pts[sel] : null
  const work = (
    <div className="flex flex-col gap-2">
      <GraphPlane axes={a} pts={pts} onChange={phase === 'edit' ? change : undefined} mode={phase === 'edit' ? 'edit' : 'view'} sel={sel} onSel={setSel} label="Düzenlenecek grafik" />
      <p className={`rounded-2xl px-3 py-2 text-center text-sm font-bold ${dark ? 'bg-slate-800/80 text-slate-200' : 'bg-white/80 text-ink-soft ring-1 ring-line'}`}>Mor noktaları sürükle: grafik hikâyeyi anlatsın. Bir noktayı seçip oklarla da taşıyabilirsin.</p>
    </div>
  )
  const arrow = (dx: number, dy: number, icon: ReactNode, lbl: string) => (
    <button type="button" onClick={() => step(dx, dy)} disabled={sel === null} className={`grid size-12 place-items-center rounded-xl ring-1 active:scale-95 disabled:opacity-35 ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white ring-line'}`} aria-label={lbl}>{icon}</button>
  )

  const panel = (
    <>
      <Card dark={dark} title="Hikâye"><p className="text-[16px] leading-snug font-bold"><MathText text={t.story} /></p></Card>
      {phase === 'edit' && (
        <>
          <Card dark={dark} title="Seçili nokta">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-sm font-extrabold">{sp ? (a.numbers ? `${num(sp.x)}. dakika · ${num(sp.y)} ${a.yLabel.match(/\((.+)\)/)?.[1] ?? ''}` : `${sel! + 1}. nokta`) : 'Bir noktayı sürükle ya da seç.'}</span>
              {arrow(-1, 0, <ArrowLeft size={20} />, 'Sola')}
              {arrow(0, 1, <ArrowUp size={20} />, 'Yukarı')}
              {arrow(0, -1, <ArrowDown size={20} />, 'Aşağı')}
              {arrow(1, 0, <ArrowRight size={20} />, 'Sağa')}
            </div>
          </Card>
          <div className="flex gap-2">
            <BigButton onClick={check} className="flex-1"><Check size={20} />Kontrol et</BigButton>
            <button type="button" onClick={() => { setHint(true); track.hint(); first.current = false }} className="grid min-h-14 min-w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 active:scale-95" aria-label="İpucu"><Lightbulb size={22} /></button>
          </div>
          {hint && (
            <Card dark={dark} title="Hikâyeyi parçalara ayır">
              <ol className="list-decimal space-y-1 pl-5 text-sm font-bold">
                {t.spec.phases.map((p, i) => <li key={i}>{p.kind === 'up' ? 'artıyor ↗' : p.kind === 'flat' ? 'değişmiyor →' : 'azalıyor ↘'}</li>)}
              </ol>
            </Card>
          )}
        </>
      )}
      {phase === 'follow' && t.follow?.kind === 'num' && (
        <Card dark={dark} title="Grafikten oku">
          <p className="mb-2 text-[15px] font-bold">{t.follow.q}</p>
          <NumPad value={val} onChange={setVal} dark={dark} unit={t.follow.unit} onEnter={checkFollow} enterLabel={<><Check size={20} />Kontrol et</>} />
        </Card>
      )}
      {phase === 'follow' && t.follow?.kind === 'chips' && (
        <Card dark={dark} title="Kuralı bul">
          <p className="mb-2 text-[15px] font-bold">{t.follow.q}</p>
          <div className="grid grid-cols-2 gap-2">
            {t.follow.options.map((o, i) => <PickBtn key={i} dark={dark} on={chip === i} onClick={() => pickChip(i)} className="text-lg">{o.text}</PickBtn>)}
          </div>
        </Card>
      )}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} tool={nudge.tone ? undefined : a.numbers ? 'egim' : 'grafiklab'} toolTitle={a.numbers ? 'Eğim aracı' : 'Grafik laboratuvarı'} />}
      {phase === 'done' && <Derived>Grafik hikâyeyi anlatıyor!</Derived>}
      {phase === 'done' && footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}
