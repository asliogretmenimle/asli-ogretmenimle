import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Flag, Save } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor, useWidth } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { factorPairs } from '../../lib/numberTheory'
import { Card, CheckButton, Choices, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, Stepper, useChecks } from '../donusum-studyosu/ortak'

/**
 * 79. Aynı Alan, Farklı Dikdörtgen (8. sınıf, Çarpanlar ve Katlar)
 * Kareli zeminde köşe tutamağı sürüklenerek (ya da en/boy ayarlayıcılarıyla) dikdörtgen kurulur; alan canlı sayılır.
 * Alanı hedefe eşit her dikdörtgen galeriye kaydedilir (a × b ile b × a aynı dikdörtgendir).
 * Galeri kenar uzunluklarına göre sıralanınca sayının çarpan listesi ortaya çıkar.
 *  all:     alanı n olan bütün dikdörtgenleri bul, “Hepsini buldum” de (eksikse ipucu)
 *  minPer:  alanı 48 m² olan bahçeler arasında çevresi en kısa olanı bul
 */

type Task = { n: number; title: string; kind: 'all' | 'minPer'; strategy?: boolean; unit?: string }

const TASKS: Task[] = [
  { n: 12, title: '12 kareyle dikdörtgenler', kind: 'all' },
  { n: 24, title: '24 kareyle dikdörtgenler', kind: 'all', strategy: true },
  { n: 36, title: '36 kareyle dikdörtgenler', kind: 'all' },
  { n: 17, title: '17 kareyle dikdörtgenler', kind: 'all' },
  { n: 30, title: '30 kareyle dikdörtgenler', kind: 'all', strategy: true },
  { n: 48, title: 'En kısa çitli bahçe', kind: 'minPer', unit: 'm' },
]

const doneText: Record<number, string> = {
  12: '12’nin çarpan çiftleri 1 × 12, 2 × 6 ve 3 × 4. Dikdörtgenlerin kenarları 12’nin bütün çarpanlarını verdi: 1, 2, 3, 4, 6, 12.',
  24: '4 dikdörtgen, 8 çarpan. 4’ten sonra yeni bir kenar denemek gerekmedi: 6 × 4, zaten bulduğun 4 × 6’nın döndürülmüşü.',
  36: '6 × 6 bir kare! Tam karelerin dikdörtgenlerinden biri karedir; 6’nın eşi yine 6 olduğu için 36’nın çarpan sayısı tek (9).',
  17: '17 kareyle yalnızca 1 × 17’lik bir şerit kurulabilir: 17’nin 1 ve kendisinden başka çarpanı yok. 17 asal sayıdır.',
  30: '30 = 1 × 30 = 2 × 15 = 3 × 10 = 5 × 6. Dört dikdörtgen, sekiz çarpan.',
}

export default function DikdortgenAlanlari({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const task = TASKS[idx]
  const last = idx === TASKS.length - 1

  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor(f / TASKS.length),
      summary: `${sol.list.length} farklı dikdörtgen kurdun ve ${TASKS.length} sayının çarpanlarını alan modeliyle buldun.`,
      insight: 'Alanı n birim kare olan, kenarları tam sayı bir dikdörtgenin kenarları n’nin bir çarpan çiftidir. Bütün dikdörtgenler bütün çarpanları verir: asal sayılar yalnızca 1 × n şeridiyle, tam kareler ayrıca bir kareyle kurulur. Alan aynıyken kenarlar birbirine yaklaştıkça çevre kısalır.',
    })
  }
  const footer = solved ? <NextButton last={last} onClick={next} /> : null

  return (
    <Scene grade={grade}>
      <Header emoji="🟫" kicker="Görev" title={task.title} idx={idx} total={TASKS.length} dark />
      <TaskView key={idx} task={task} intro={idx === 0} footer={footer} onSolved={onSolved} onNew={(k, l) => sol.add(`${task.n}:${k}`, l)} />
    </Scene>
  )
}

type Rect = [number, number]
type Fb = { ok: boolean; text: string; mis?: string } | null

function TaskView({ task, intro, footer, onSolved, onNew }: { task: Task; intro: boolean; footer: ReactNode; onSolved: (first: boolean) => void; onNew: (key: string, label: string) => void }) {
  const { n } = task
  const unit = task.unit
  const [w, setW] = useState(1)
  const [h, setH] = useState(1)
  const [saved, setSaved] = useState<Rect[]>([])
  const [fb, setFb] = useState<Fb>(null)
  const [phase, setPhase] = useState<'build' | 'pick' | 'done'>('build')
  const [pick, setPick] = useState<string | null>(null)
  const chk = useChecks()
  const pairs = factorPairs(n)
  const area = w * h
  const per = (r: Rect) => 2 * (r[0] + r[1])
  const sorted = [...saved].sort((a, b) => Math.min(...a) - Math.min(...b))
  const factors = [...new Set(saved.flat())].sort((a, b) => a - b)

  const resize = (nw: number, nh: number) => {
    if (phase === 'done') return
    setW(nw)
    setH(nh)
    if (fb && !fb.ok) setFb(null)
  }

  const save = () => {
    if (area !== n) return
    const lo = Math.min(w, h), hi = Math.max(w, h)
    const same = saved.find((r) => Math.min(...r) === lo && Math.max(...r) === hi)
    if (same) {
      setFb(same[0] === w && same[1] === h
        ? { ok: false, text: `${w} × ${h} dikdörtgenini zaten kaydettin. Kenarı farklı bir dikdörtgen kurabilir misin?` }
        : { ok: false, text: `Bu, kaydettiğin ${same[0]} × ${same[1]} dikdörtgeninin döndürülmüş hâli: aynı dikdörtgen! Kenarları yine aynı çarpan çifti (${lo} ve ${hi}). Yeni bir kenar uzunluğu dene.` })
      return
    }
    sfx.ok()
    onNew(`${lo}x${hi}`, `${lo} × ${hi}`)
    const next = [...saved, [w, h] as Rect]
    setSaved(next)
    const left = pairs.length - next.length
    setFb({ ok: true, text: task.kind === 'minPer' ? `${w} × ${h} = ${n} m². Çevresi ${per([w, h])} m.` : lo === hi ? `${w} × ${h} = ${n}. Bu bir kare!` : `${w} × ${h} = ${n}. ${lo} ve ${hi}, ${ek(n, 'gen')} çarpanları.${left === 0 ? '' : ' Başka bir dikdörtgen var mı?'}` })
  }

  const claim = () => {
    const missing = pairs.filter(([a, b]) => !saved.some((r) => Math.min(...r) === a && Math.max(...r) === b))
    if (missing.length) {
      chk.fail()
      const [a] = missing[0]
      setFb({ ok: false, text: a === 1 ? `En uzun ve en ince dikdörtgeni denedin mi? Kenarlarından biri 1 birim olabilir mi?` : `Kenarı ${a} birim olan bir dikdörtgen olabilir mi? ${n} ÷ ${a} kaç eder?`, mis: missing.length === pairs.length - saved.length && saved.length <= 1 ? 'Çarpan çiftlerinin hepsini aramadan bitirdi' : undefined })
      return
    }
    onSolved(chk.pass())
    setPhase('done')
    setFb({ ok: true, text: doneText[n] ?? `${ek(n, 'gen')} bütün çarpan çiftlerini buldun.` })
  }

  const choose = () => {
    if (!pick) return
    const r = saved.find((s) => `${s[0]}x${s[1]}` === pick)!
    const best = Math.min(...pairs.map(([a, b]) => 2 * (a + b)))
    const bestSaved = Math.min(...saved.map(per))
    if (per(r) === best) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `${r[0]} × ${r[1]}: çit ${per(r)} m ile en kısası! 1 × 48’lik bahçe için ${2 * 49} m çit gerekirdi. Alan aynıyken kenarlar birbirine yaklaştıkça (kareye yaklaştıkça) çevre kısalır. 48 tam kare olmadığından kare bahçe yapılamaz; en yakını 6 × 8.` })
      return
    }
    chk.fail()
    if (per(r) > bestSaved) setFb({ ok: false, text: `${r[0]} × ${r[1]} bahçesinin çevresi ${per(r)} m. Galerideki çevreleri karşılaştır: daha kısa olanı var mı?` })
    else setFb({ ok: false, mis: 'En kısa çevreyi yalnızca denediği dikdörtgenler arasında aradı', text: `Kaydettiklerin arasında en kısası bu, ama ${n} m²’lik başka bahçeler de var. Kenarları birbirine daha yakın bir dikdörtgen kurabilir misin? Kenarı ${pairs[pairs.length - 1][0]} m olanı dene.` })
  }

  return (
    <Split
      work={
        <>
          <Stage dark>
            <Grid n={n} w={w} h={h} locked={phase === 'done'} onResize={resize} />
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pb-2 text-center">
              <p className="text-xl font-black text-white tabular-nums">{w} × {h} = <span className={area === n ? 'text-emerald-300' : area > n ? 'text-orange-300' : 'text-sky-300'}>{area}</span>{unit ? ` ${unit}²` : ' birim kare'}</p>
              <p className="text-sm font-extrabold text-slate-300">{area === n ? 'Tam hedef!' : area > n ? `${area - n} kare fazla` : `${n - area} kare eksik`} · hedef {n}</p>
            </div>
          </Stage>
          {saved.length > 0 && <Gallery list={sorted} factors={task.kind === 'all' ? factors : null} unit={unit} />}
        </>
      }
      panel={
        <>
          <Prompt step={task.kind === 'minPer' ? 'Problem' : `Alan: ${n} birim kare`}>
            {task.kind === 'minPer'
              ? <>Alanı <b>48 m²</b> olan, kenarları tam metre dikdörtgen bir bahçenin çevresine çit çekilecek. Çiti <b>en kısa</b> olan bahçe hangisi? Farklı bahçeler kurup kaydet, sonra seç.</>
              : intro
                ? <><b>{n} kare fayansla</b> dikdörtgen bir zemin döşe; fayans kesmek yok. Köşedeki tutamağı sürükle ya da en ve boyu ayarla. Kenarları farklı <b>bütün</b> dikdörtgenleri bul.</>
                : <>{n} birim karelik, kenarları farklı bütün dikdörtgenleri kur ve kaydet.</>}
          </Prompt>
          {phase === 'build' && (
            <Card dark>
              <div className="space-y-2">
                <Stepper dark label="En" value={w} min={1} max={n} onChange={(v) => resize(v, h)} unit={unit} />
                <Stepper dark label="Boy" value={h} min={1} max={n} onChange={(v) => resize(w, v)} unit={unit} />
              </div>
            </Card>
          )}
          {phase === 'build' && (
            <>
              <CheckButton onClick={save} disabled={area !== n}><Save size={20} />{area === n ? 'Dikdörtgeni kaydet' : `Alan ${n} olmalı`}</CheckButton>
              {task.kind === 'all' && saved.length > 0 && <GhostButton dark onClick={claim}><Flag size={18} />Hepsini buldum</GhostButton>}
              {task.kind === 'minPer' && saved.length >= 3 && <GhostButton dark onClick={() => { setPhase('pick'); setFb(null) }}><Flag size={18} />En kısa çitliyi seçeceğim</GhostButton>}
            </>
          )}
          {phase === 'pick' && (
            <>
              <Card dark><p className="font-extrabold">Hangi bahçenin çiti en kısa?</p></Card>
              <Choices options={sorted.map((r) => ({ id: `${r[0]}x${r[1]}`, label: `${r[0]} m × ${r[1]} m` }))} value={pick} onPick={(v) => { setPick(v); setFb(null) }} />
              <CheckButton onClick={choose} disabled={!pick} />
              <GhostButton dark onClick={() => { setPhase('build'); setFb(null) }}>Başka bahçe kur</GhostButton>
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries + fb.text} question={fb.text} misconception={fb.mis} tool="alancevre" />)}
          {phase === 'done' && task.strategy && <StrategyPicker question="Bütün dikdörtgenleri bulduğundan nasıl emin oldun?" options={['Kenarı 1, 2, 3… diye sırayla denedim', 'Kenarlar birbirine yaklaşınca durdum', 'Çarpan çiftlerini düşündüm']} onPick={() => undefined} />}
          {phase === 'done' && footer}
        </>
      }
    />
  )
}

/* ───────────────────────── Kareli zemin ───────────────────────── */

function Grid({ n, w, h, locked, onResize }: { n: number; w: number; h: number; locked: boolean; onResize: (w: number, h: number) => void }) {
  const [box, width] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const cols = Math.min(Math.max(w + 2, 8), n + 1)
  const rows = Math.min(Math.max(h + 2, 6), n + 1)
  const pad = 14
  const cell = Math.max(6, Math.min(46, (width - 2 * pad) / cols, 420 / rows))
  const W = cols * cell + 2 * pad, H = rows * cell + 2 * pad

  const bind = useDrag(({ xy: [x, y], event }) => {
    if (locked) return
    event.preventDefault()
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return
    const k = r.width / W
    const c = Math.ceil((x - r.left - pad * k) / (cell * k))
    const rr = Math.ceil((y - r.top - pad * k) / (cell * k))
    const nw = Math.min(n, Math.max(1, c)), nh = Math.min(n, Math.max(1, rr))
    if (nw !== w || nh !== h) onResize(nw, nh)
  }, { filterTaps: false })

  const cells: ReactNode[] = []
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      cells.push(<rect key={`${i}-${j}`} x={pad + i * cell + 1} y={pad + j * cell + 1} width={cell - 2} height={cell - 2} rx={Math.min(4, cell / 6)} fill={k < n ? '#60a5fa' : '#fb923c'} opacity={k < n ? 0.95 : 0.85} />)
    }
  const hx = pad + w * cell, hy = pad + h * cell
  return (
    <div ref={box} className="w-full">
      <svg ref={svgRef} {...bind()} viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-full touch-none select-none" style={{ maxHeight: 460, touchAction: 'none' }} role="img" aria-label={`${w} × ${h} dikdörtgen`}>
        {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={pad + i * cell} x2={pad + i * cell} y1={pad} y2={pad + rows * cell} stroke="#334155" strokeWidth={1} />)}
        {Array.from({ length: rows + 1 }, (_, j) => <line key={`h${j}`} y1={pad + j * cell} y2={pad + j * cell} x1={pad} x2={pad + cols * cell} stroke="#334155" strokeWidth={1} />)}
        {cells}
        <rect x={pad} y={pad} width={w * cell} height={h * cell} fill="none" stroke="#e0f2fe" strokeWidth={3} rx={3} />
        {!locked && (
          <g data-handle>
            <circle cx={hx} cy={hy} r={Math.max(14, Math.min(20, cell * 0.55))} fill="#ec4899" stroke="#fff" strokeWidth={3} />
            <path d={`M${hx - 6} ${hy - 6}L${hx + 6} ${hy + 6}M${hx + 6} ${hy}V${hy + 6}H${hx}M${hx - 6} ${hy}V${hy - 6}H${hx}`} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </div>
  )
}

/* ───────────────────────── Galeri ───────────────────────── */

function Gallery({ list, factors, unit }: { list: Rect[]; factors: number[] | null; unit?: string }) {
  return (
    <div className="mt-3 rounded-2xl bg-slate-800/90 p-3 ring-1 ring-slate-600">
      <p className="mb-2 text-xs font-black tracking-wide text-pink-300 uppercase">Kaydettiğin dikdörtgenler ({list.length})</p>
      <div className="flex flex-wrap gap-2">
        {list.map(([a, b]) => {
          const lo = Math.min(a, b), hi = Math.max(a, b)
          const s = Math.min(6, 60 / hi)
          return (
            <div key={`${a}x${b}`} className="flex min-w-20 flex-col items-center gap-1 rounded-xl bg-slate-900/70 p-2 ring-1 ring-slate-600 animate-pop">
              <svg width={hi * s + 2} height={lo * s + 2} aria-hidden>
                <rect x={1} y={1} width={hi * s} height={lo * s} fill={lo === hi ? '#fbbf24' : '#60a5fa'} rx={1.5} />
              </svg>
              <span className="text-sm font-black text-white">{lo} × {hi}</span>
              {unit && <span className="text-xs font-bold text-slate-300">Çevre {2 * (a + b)} {unit}</span>}
            </div>
          )
        })}
      </div>
      {factors && (
        <div className="mt-3 border-t border-slate-700 pt-2">
          <p className="mb-1.5 text-xs font-black tracking-wide text-slate-300 uppercase">Kenar uzunlukları → çarpanlar</p>
          <div className="flex flex-wrap gap-1.5">
            {factors.map((f) => <span key={f} className="grid h-9 min-w-9 place-items-center rounded-lg bg-white px-2 text-base font-black text-ink">{f}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
