import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Lightbulb, Minus, Plus, RotateCcw, Rows3, Save } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { ek } from '../../lib/generators'
import { Card, CheckButton, Choices, GhostButton, Header, NextButton, Nudge, NumPad, Prompt, Split, Stage, Stepper, fmt, parseNum, useChecks } from '../donusum-studyosu/ortak'
import { BuildBoard, Iso, ViewBoard, Views, boxMap, emptyMap, frontView, hiddenCount, rotateMap, sideView, topView, trim1, trimTop, volume, type HMap } from './iso'

/**
 * 56. Hacim İnşaatı (5–8)
 * Hacim = kaç birim küp. Öğrenci izometrik tahtada küplere dokunarak yapı kurar, katmanları ayırarak saklı küpleri sayar,
 * tabanı sıra sıra doldurup kat ekleyerek sayma işini çarpmaya dönüştürür (V = a · b · c, taban alanı × yükseklik).
 * Görevler:
 *  - build:   aynı hacimde farklı biçimde iki yapı (5–6)
 *  - compare: iki yapı — hangisinin hacmi büyük? Önce tahmin, sonra kat kat say (saklı küpler yanılgısı)
 *  - layers:  cam kutunun tabanını doldur, kat ekle; sembol hareketten türer; “n kat olsaydı?”
 *  - boxes:   aynı sayıda küple farklı kutular (çoklu çözüm)
 *  - surface: aynı hacim, farklı yüzey alanı — en az ambalaj (7–8)
 *  - missing: hacim ve taban verildi, kaç kat / yükseklik? (6–8)
 *  - views:   önden/sağdan/üstten görünüme uyan yapılar, en az–en çok küp (7)
 *  - prism:   L tabanlı prizma ve silindir: taban alanı × yükseklik (8)
 *  - scale:   bütün boyutlar 2 katına çıkınca hacim kaç katına çıkar? (8)
 */

type Task =
  | { kind: 'build'; vol: number }
  | { kind: 'compare'; a: HMap; b: HMap }
  | { kind: 'layers'; w: number; d: number; h: number; ask?: number }
  | { kind: 'boxes'; vol: number; goal: number }
  | { kind: 'surface'; vol: number }
  | { kind: 'missing'; w: number; d: number; vol: number }
  | { kind: 'views'; target: HMap }
  | { kind: 'prism'; base: string[]; h: number }
  | { kind: 'scale'; w: number; d: number; h: number }

const rowMap = (heights: number[]): HMap => [heights]

function makeTasks(grade: Grade): Task[] {
  const r = Math.random
  if (grade === 5)
    return [
      { kind: 'build', vol: 8 },
      { kind: 'compare', a: boxMap(3, 2, 2), b: rowMap([3, 3, 2, 2, 1]) },
      { kind: 'layers', w: 3, d: 2, h: 3 },
      { kind: 'boxes', vol: 12, goal: 3 },
      { kind: 'layers', w: 4, d: 3, h: 2, ask: 5 },
    ]
  if (grade === 6)
    return [
      { kind: 'compare', a: boxMap(3, 3, 2), b: rowMap([4, 4, 3, 3, 2]) },
      { kind: 'layers', w: 4, d: 3, h: 3, ask: r() < 0.5 ? 6 : 8 },
      { kind: 'boxes', vol: 24, goal: 3 },
      { kind: 'missing', w: 3, d: 4, vol: 36 },
      { kind: 'build', vol: 10 },
    ]
  if (grade === 7)
    return [
      { kind: 'compare', a: boxMap(4, 3, 2), b: rowMap([5, 4, 4, 4, 3]) },
      { kind: 'layers', w: 5, d: 3, h: 4, ask: 10 },
      { kind: 'views', target: [[1, 1, 2], [2, 1, 1]] },
      { kind: 'surface', vol: 12 },
      { kind: 'missing', w: 3, d: 4, vol: 60 },
    ]
  return [
    { kind: 'layers', w: 4, d: 3, h: 5, ask: 12 },
    { kind: 'prism', base: ['###', '##.', '##.'], h: 4 },
    { kind: 'surface', vol: 24 },
    { kind: 'missing', w: 3, d: 5, vol: 90 },
    { kind: 'scale', w: 2, d: 2, h: 1 },
  ]
}

const titles: Record<Task['kind'], string> = {
  build: 'Aynı hacim, farklı yapı',
  compare: 'Hangisi daha büyük?',
  layers: 'Kat kat doldur',
  boxes: 'Kaç farklı kutu?',
  surface: 'En az ambalaj',
  missing: 'Kaç kat?',
  views: 'Görünümlerden yapı',
  prism: 'Taban alanı × yükseklik',
  scale: 'Boyutlar iki katına çıkarsa',
}

export default function HacimInsaati({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const dark = grade >= 7
  const task = tasks[idx]
  const last = idx === tasks.length - 1

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
    const ways = sol.list.length
    onFinish({
      stars: starsFor((f + Math.min(1, ways * 0.2)) / tasks.length),
      summary: `${tasks.length} hacim görevini küplerle kurarak çözdün${ways > 1 ? `; ${ways} farklı yapı ya da kutu buldun` : ''}.`,
      insight:
        grade === 5
          ? 'Hacim, bir yapıda kaç birim küp olduğudur. Saklı küpleri unutmamak için kat kat sayarız: her kat aynıysa tek bir katı sayıp kat sayısı kadar toplarız.'
          : grade === 6
            ? 'Tabanı sıra sıra (sıra × sütun) sayıp kat sayısıyla çarpmak, küpleri tek tek saymaktan hızlıdır. Aynı sayıda küple birbirinden çok farklı kutular kurulabilir.'
            : grade === 7
              ? 'Kutunun hacmi taban katındaki küp sayısı (a · b) ile kat sayısının (c) çarpımıdır: V = a · b · c. Hacimleri aynı kutuların yüzey alanı farklı olabilir; küpe en çok benzeyen kutu en az ambalaj ister.'
              : 'Her dik prizmada (taban dikdörtgen olmasa bile) ve silindirde hacim = taban alanı × yükseklik. Bütün boyutlar 2 katına çıkınca hacim 2 · 2 · 2 = 8 katına çıkar.',
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const common = { grade, dark, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="🏗️" title={titles[task.kind]} idx={idx} total={tasks.length} dark={dark} />
      <TaskView key={idx} task={task} {...common} />
    </Scene>
  )
}

type Common = { grade: Grade; dark: boolean; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions> }

function TaskView({ task, ...c }: { task: Task } & Common) {
  switch (task.kind) {
    case 'build': return <BuildTask t={task} {...c} />
    case 'compare': return <CompareTask t={task} {...c} />
    case 'layers': return <LayersTask t={task} {...c} />
    case 'boxes': return <BoxesTask t={task} {...c} />
    case 'surface': return <SurfaceTask t={task} {...c} />
    case 'missing': return <MissingTask t={task} {...c} />
    case 'views': return <ViewsTask t={task} {...c} />
    case 'prism': return <PrismTask t={task} {...c} />
    case 'scale': return <ScaleTask t={task} {...c} />
  }
}

/* ───────────────────────── ortak parçalar ───────────────────────── */

const unitOf = (grade: Grade) => (grade >= 7 ? 'cm³' : 'küp')

/** Panelde canlı okuma */
function Readout({ dark, title, children }: { dark: boolean; title: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl px-3 py-2.5 ${dark ? 'bg-slate-950/70 text-white ring-1 ring-sky-400/40' : 'bg-sky-700 text-white'}`}>
      <p className={`text-[11px] font-black tracking-wide uppercase ${dark ? 'text-sky-300' : 'text-sky-100'}`}>{title}</p>
      <div className="mt-0.5 text-xl leading-snug font-black tabular-nums">{children}</div>
    </div>
  )
}

function HintButton({ onClick, dark }: { onClick: () => void; dark: boolean }) {
  return <GhostButton dark={dark} onClick={onClick}><Lightbulb size={18} />İpucu</GhostButton>
}

/** Dönüşte aynı kalan kanonik biçim (yeri ve dönüşü önemsiz) */
function canonical(h: HMap) {
  const outs: string[] = []
  for (let k = 0; k < 4; k++) {
    const m = rotateMap(h, k).h
    const rows = m.filter((r) => r.some((v) => v > 0))
    if (!rows.length) return ''
    let s = 99, e = 0
    rows.forEach((r) => r.forEach((v, i) => { if (v) { s = Math.min(s, i); e = Math.max(e, i + 1) } }))
    outs.push(rows.map((r) => r.slice(s, e).join('')).join('/'))
  }
  return outs.sort()[0]
}

/* ───────────────────────── 1. aynı hacim, farklı yapı ───────────────────────── */

function BuildTask({ t, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'build' }> } & Common) {
  const [h, setH] = useState<HMap>(() => emptyMap(4, 4))
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null)
  const [mine, setMine] = useState<string[]>([])
  const chk = useChecks()
  const v = volume(h)
  const check = () => {
    if (v !== t.vol) {
      chk.fail()
      setFb({ ok: false, text: `Yapında ${v} küp var. ${t.vol} küp olması için ${v > t.vol ? `${v - t.vol} küp çıkarmalı` : `${t.vol - v} küp eklemeli`} misin? Saklı küpleri saydın mı?` })
      return
    }
    const key = canonical(h)
    if (mine.includes(key)) {
      setFb({ ok: false, text: 'Bu yapıyı zaten kurdun (döndürünce aynısı). Küpleri farklı yerleştirerek bambaşka bir yapı kurabilir misin?' })
      return
    }
    const n = [...mine, key]
    setMine(n)
    sol.add(`build-${t.vol}-${key}`, `${t.vol} küplük yapı ${n.length}`)
    if (n.length === 2) onSolved(chk.pass())
    else chk.pass()
    setFb({ ok: true, text: n.length === 1 ? `Evet, ${t.vol} birim küp! Şimdi küpleri yeniden düzenle: biçimi farklı ama hacmi yine ${t.vol} birim küp olan bir yapı kur.` : 'İki yapının biçimi farklı ama ikisi de aynı sayıda birim küpten oluşuyor: hacimleri eşit!' })
  }
  return (
    <Split
      work={<Stage dark={dark}><BuildBoard h={h} onChange={(n) => { setH(n); setFb(null) }} maxH={4} dark={dark} /></Stage>}
      panel={
        <>
          <Prompt step="Kur">Hacmi <b className="text-pink-700">{t.vol} birim küp</b> olan bir yapı kur. Sonra aynı hacimde <b>bambaşka görünen</b> ikinci bir yapı kur.</Prompt>
          <Card dark={dark}>
            <p className="text-sm font-bold opacity-80">Zemine dokununca küp konur, küpe dokununca üstüne eklenir. <b>Çıkar</b> ile en üstteki küpü alırsın. Küpleri kendin say; kontrol edince söyleyeceğim.</p>
          </Card>
          <CheckButton onClick={check} disabled={v === 0} />
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} tool="izometrik" />)}
          {mine.length === 1 && fb?.ok && <GhostButton dark={dark} onClick={() => { setH(emptyMap(4, 4)); setFb(null) }}><RotateCcw size={18} />Yeni yapıya başla</GhostButton>}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`build-${t.vol}-`))} goal={2} />
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. karşılaştır ───────────────────────── */

function CompareTask({ t, grade, dark, footer, onSolved }: { t: Extract<Task, { kind: 'compare' }> } & Common) {
  const [guess, setGuess] = useState<'A' | 'B' | '=' | null>(null)
  const [phase, setPhase] = useState<'predict' | 'count' | 'done'>('predict')
  const [field, setField] = useState<'A' | 'B'>('A')
  const [vals, setVals] = useState<{ A: string; B: string }>({ A: '', B: '' })
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const [hint, setHint] = useState(false)
  const chk = useChecks()
  const VA = volume(t.a), VB = volume(t.b)
  const visA = VA - hiddenCount(t.a), visB = VB - hiddenCount(t.b)
  const truth = VA > VB ? 'A' : VB > VA ? 'B' : '='
  const unit = unitOf(grade)
  const maxH = Math.max(...t.a.flat(), ...t.b.flat())
  const span = Math.max(t.a.length, t.a[0].length, t.b.length, t.b[0].length)
  const check = () => {
    const a = parseNum(vals.A), b = parseNum(vals.B)
    if (a === VA && b === VB) {
      onSolved(chk.pass())
      setPhase('done')
      setFb(null)
      return
    }
    chk.fail()
    const wrong = a !== VA ? 'A' : 'B'
    const val = wrong === 'A' ? a : b
    const vis = wrong === 'A' ? visA : visB
    if (val === vis && vis !== (wrong === 'A' ? VA : VB)) setFb({ text: `${wrong} yapısında yalnızca gördüğün küpleri saymış olabilir misin? Arkada ve altta saklanan küpler var mı? “Katmanları ayır” ile her katı ayrı say.`, mis: 'Hacmi bulurken yalnızca görünen küpleri saydı (saklı küpleri unuttu)' })
    else setFb({ text: `${wrong} yapısını yeniden say. Katmanları ayırınca her katta kaç küp var? Katları toplayınca ne buluyorsun?` })
    setField(wrong)
  }
  const board = (name: 'A' | 'B', h: HMap) => (
    <Stage dark={dark}>
      <p className={`mb-1 text-center text-lg font-black ${dark ? 'text-white' : 'text-ink'}`}>{name} yapısı{phase === 'done' && <span className="ml-2 rounded-full bg-pink-600 px-2.5 py-0.5 text-sm text-white">{name === 'A' ? VA : VB} {unit}</span>}</p>
      <ViewBoard h={h} dark={dark} maxH={maxH} maxHeight={300} span={span} />
    </Stage>
  )
  return (
    <Split
      work={<div className="grid grid-cols-2 gap-2 sm:gap-3">{board('A', t.a)}{board('B', t.b)}</div>}
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Önce tahmin et">Saymadan bak: <b>hangi yapının hacmi daha büyük?</b> Yani hangisinde daha çok birim küp var?</Prompt>
              <Choices options={[{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: '=', label: 'Eşit' }]} value={guess} onPick={(g) => setGuess(g)} cols={3} />
              <CheckButton disabled={!guess} onClick={() => setPhase('count')}>Tahminimi kaydet</CheckButton>
            </>
          )}
          {phase === 'count' && (
            <>
              <Prompt step="Say ve kanıtla">Şimdi her yapıdaki küpleri say. Yapıyı döndürebilir, <b>katmanlarını ayırabilirsin</b>.</Prompt>
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B'] as const).map((n) => (
                  <button key={n} type="button" onClick={() => setField(n)} className={`min-h-14 rounded-2xl px-3 text-left font-black ring-2 ${field === n ? 'bg-pink-600 text-white ring-pink-700' : 'bg-white text-ink ring-line'}`}>
                    <span className="block text-xs opacity-80">{n} yapısı</span>
                    <span className="text-2xl tabular-nums">{vals[n] || '?'}</span> <span className="text-sm">{unit}</span>
                  </button>
                ))}
              </div>
              <NumPad value={vals[field]} onChange={(s) => { setVals({ ...vals, [field]: s }); setFb(null) }} max={3} label={`${field}:`} unit={unit} />
              <div className="flex gap-2">
                <CheckButton onClick={check} disabled={!vals.A || !vals.B} />
                {!hint && <HintButton dark={dark} onClick={() => { setHint(true); chk.hint() }} />}
              </div>
              {hint && <Nudge question="Bir yapıyı kat kat düşün: en alttaki katta kaç küp var? Üstteki küplerin altı boş olabilir mi?" />}
              {fb && <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="izometrik" />}
            </>
          )}
          {phase === 'done' && (
            <>
              <Readout dark={dark} title="Sonuç">A: {VA} {unit} · B: {VB} {unit}</Readout>
              <Nudge tone="ok" question={guess === truth ? `Tahminin doğruydu! ${truth === '=' ? 'Hacimler eşit.' : `${truth} yapısının hacmi daha büyük.`}` : `Gözümüz yanılabilir: A’da yalnızca ${visA} küp görünüyor ama ${VA - visA} küp arkada saklı. Asıl sonuç: ${truth === '=' ? 'hacimler eşit' : `${truth} yapısının hacmi daha büyük`}.`} />
              <StrategyPicker options={['Katman katman saydım', 'Teker teker saydım', 'Sıra × sütun × kat']} onPick={() => {}} />
              {footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. kat kat doldur ───────────────────────── */

function LayersTask({ t, grade, dark, footer, onSolved }: { t: Extract<Task, { kind: 'layers' }> } & Common) {
  const [phase, setPhase] = useState<'estimate' | 'base' | 'stack' | 'ask' | 'done'>('estimate')
  const [est, setEst] = useState('')
  const [h, setH] = useState<HMap>(() => emptyMap(t.w, t.d))
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const unit = unitOf(grade)
  const B = t.w * t.d
  const base = h.flat().filter((v) => v > 0).length
  const floors = Math.min(...h.flat())
  const rowsFull = h.filter((r) => r.every((v) => v > 0)).length

  const tapCell = (j: number, i: number) => {
    if (phase !== 'base' || h[j][i] > 0) return
    const n = h.map((r) => [...r])
    n[j][i] = 1
    setH(n)
    if (n.flat().every((v) => v > 0)) setPhase('stack')
  }
  const fillRow = () => {
    const j = h.findIndex((r) => r.some((v) => v === 0))
    if (j < 0) return
    const n = h.map((r, k) => (k === j ? r.map(() => 1) : [...r]))
    setH(n)
    if (n.flat().every((v) => v > 0)) setPhase('stack')
  }
  const addFloor = () => {
    if (floors >= t.h) return
    const n = h.map((r) => r.map((v) => v + 1))
    setH(n)
    if (floors + 1 === t.h) {
      if (!t.ask) {
        onSolved(chk.pass())
        setPhase('done')
      } else setPhase('ask')
    }
  }
  const sym = (k: number) => {
    if (k === 1 && grade <= 6) return `1 kat: ${B} küp`
    if (grade === 5) return `${Array(k).fill(B).join(' + ')} = ${B * k}`
    if (grade === 6) return `${k} kat × ${B} = ${B * k}`
    if (grade === 7) return `V = ${t.w} · ${t.d} · ${k} = ${B * k} cm³`
    return `V = (taban alanı) × yükseklik = ${B} · ${k} = ${B * k} cm³`
  }
  const check = () => {
    const a = parseNum(ans)
    const want = B * (t.ask ?? 0)
    if (a === want) {
      onSolved(chk.pass())
      setPhase('done')
      setFb(null)
      return
    }
    chk.fail()
    if (a === t.w + t.d + (t.ask ?? 0)) setFb({ text: `Boyutları toplamışsın gibi görünüyor. Her katta kaç küp var? ${t.ask} tane böyle kat olunca kaç küp eder?`, mis: 'Hacim için boyutları topladı' })
    else if (a === B + (t.ask ?? 0)) setFb({ text: `Bir katta ${B} küp var. ${t.ask} kat, ${B} küpe ${t.ask} küp eklemek mi, yoksa ${B} küplük katı ${t.ask} kez koymak mı?`, mis: 'Kat sayısını taban küp sayısına ekledi' })
    else setFb({ text: `Her kat ${B} küp. Kutu ${t.h} kat iken ${B * t.h} küp oldu. Kat sayısı ${t.ask} olunca ne olur?` })
  }
  const estN = parseNum(est)
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Iso h={h} glass={{ w: t.w, d: t.d, h: t.h }} onTap={tapCell} dark={dark} maxH={t.h} explode={false} maxHeight={400} />
          {(phase === 'base') && (
            <div className="mt-2 flex justify-center"><GhostButton dark={dark} onClick={fillRow}><Rows3 size={18} />Bir sıra doldur</GhostButton></div>
          )}
          {(phase === 'stack') && (
            <div className="mt-2 flex justify-center"><button type="button" onClick={addFloor} className="btn-primary min-h-14 px-6 text-lg"><Plus size={20} />Kat ekle</button></div>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'estimate' && (
            <>
              <Prompt step="Önce tahmin et">Cam kutunun içi birim küplerle tamamen doldurulacak. <b>Kutuya kaç küp sığar?</b> Saymadan tahmin et.</Prompt>
              <NumPad value={est} onChange={setEst} max={3} unit="küp" label="Tahminim" />
              <CheckButton disabled={!est} onClick={() => setPhase('base')}>Tahminimi kaydet</CheckButton>
            </>
          )}
          {phase !== 'estimate' && (
            <Prompt step={phase === 'base' ? 'Tabanı doldur' : phase === 'stack' ? 'Katları ekle' : phase === 'ask' ? 'Genelle' : 'Kutu doldu'}>
              {phase === 'base' && <>Önce kutunun <b>tabanını</b> doldur: zemindeki karelere dokun ya da sıra sıra doldur.</>}
              {phase === 'stack' && <>Taban hazır! Şimdi <b>kat ekleyerek</b> kutuyu doldur.</>}
              {phase === 'ask' && <>Aynı tabanla kutu <b>{t.ask} kat</b> yüksekliğinde olsaydı kaç küp gerekirdi?</>}
              {phase === 'done' && <>Kutu tam {fmt(B * t.h)} birim küple doldu.</>}
            </Prompt>
          )}
          {phase !== 'estimate' && (
            <Readout dark={dark} title={phase === 'base' ? 'Taban' : 'Kutudaki küpler'}>
              {phase === 'base' ? (
                <>{base} / ? küp{rowsFull > 0 && <span className="block text-sm opacity-90">{rowsFull} sıra × {t.w} = {rowsFull * t.w}</span>}</>
              ) : (
                <>
                  <span className="block text-base opacity-90">Taban: {t.d} sıra × {t.w} = {B} küp</span>
                  <span className="block">{floors > 0 ? sym(floors) : '—'}</span>
                </>
              )}
            </Readout>
          )}
          {phase === 'ask' && (
            <>
              <NumPad value={ans} onChange={(s) => { setAns(s); setFb(null) }} max={4} unit={unit} />
              <CheckButton onClick={check} disabled={!ans} />
              {fb && <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="izometrik" />}
            </>
          )}
          {(phase === 'ask' || phase === 'done') && Number.isFinite(estN) && (
            <Card dark={dark}><p className="text-sm font-bold">Tahminin {fmt(estN)} idi; kutuda {B * t.h} küp var. {Math.abs(estN - B * t.h) <= B * t.h * 0.15 ? 'Çok yakın bir tahmin!' : estN < B * t.h ? 'İçerideki saklı küpler tahmini küçültmüş olabilir mi?' : 'Kutu göründüğünden küçükmüş.'}</p></Card>
          )}
          {phase === 'done' && (
            <>
              <Nudge tone="ok" question={t.ask ? `Evet! ${sym(t.ask)}. Her kat aynı olduğu için tek bir katı sayıp kat sayısıyla çarpmak yetiyor.` : `Her katta ${B} küp, ${t.h} kat var: ${sym(t.h)}.`} />
              <StrategyPicker options={['Katman katman saydım', 'Teker teker saydım', grade >= 7 ? 'Taban × yükseklik' : 'Sıra × sütun × kat']} onPick={() => {}} />
              {footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────────────────── kutu kurucu (boxes, surface, scale) ───────────────────────── */

function BoxBuilder({ w, d, h, setW, setD, setH, dark, max = 12 }: { w: number; d: number; h: number; setW: (v: number) => void; setD: (v: number) => void; setH: (v: number) => void; dark: boolean; max?: number }) {
  return (
    <Card dark={dark} className="flex flex-col gap-1.5">
      <Stepper label="En" value={w} onChange={setW} min={1} max={max} dark={dark} />
      <Stepper label="Boy" value={d} onChange={setD} min={1} max={max} dark={dark} />
      <Stepper label="Yükseklik" value={h} onChange={setH} min={1} max={max} dark={dark} />
    </Card>
  )
}

function BoxView({ w, d, h, dark }: { w: number; d: number; h: number; dark: boolean }) {
  const [rot, setRot] = useState(0)
  return (
    <Stage dark={dark} className="lg:sticky lg:top-20">
      <Iso h={boxMap(w, d, h)} rot={rot} onRotate={(k) => setRot((r) => (r + k + 4) % 4)} dark={dark} maxH={Math.max(4, h)} front={false} layerLabels={false} maxHeight={420} />
      <p className={`mt-1 text-center text-sm font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>En {w} · Boy {d} · Yükseklik {h}</p>
    </Stage>
  )
}

const dimsKey = (a: number[]) => [...a].sort((x, y) => x - y).join('×')
const surf = (a: number, b: number, c: number) => 2 * (a * b + b * c + a * c)
function allBoxes(vol: number, max = 12) {
  const out: number[][] = []
  for (let a = 1; a <= max; a++) for (let b = a; b <= max; b++) for (let c = b; c <= max; c++) if (a * b * c === vol) out.push([a, b, c])
  return out
}

/* ───────────────────────── 4. kaç farklı kutu? ───────────────────────── */

function BoxesTask({ t, grade, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'boxes' }> } & Common) {
  const [w, setW] = useState(2), [d, setD] = useState(2), [h, setH] = useState(1)
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null)
  const [found, setFound] = useState<string[]>([])
  const chk = useChecks()
  const p = w * d * h
  const total = allBoxes(t.vol).length
  const set = (f: (v: number) => void) => (v: number) => { f(v); setFb(null) }
  const save = () => {
    if (p !== t.vol) {
      chk.fail()
      setFb({ ok: false, text: `Bu kutuda ${p} küp var; ${t.vol} küpün hepsini kullanmalısın. ${p > t.vol ? 'Hangi boyutu küçültürsen' : 'Hangi boyutu büyütürsen'} ${t.vol} küpe ulaşırsın?` })
      return
    }
    const key = dimsKey([w, d, h])
    if (found.includes(key)) {
      setFb({ ok: false, text: `Bu kutuyu zaten buldun! ${w} × ${d} × ${h} ile ${key.replaceAll('×', ' × ')} aynı kutu, yalnızca döndürülmüş. Bambaşka bir kutu dener misin?` })
      return
    }
    const n = [...found, key]
    setFound(n)
    sol.add(`box-${t.vol}-${key}`, `${key.replaceAll('×', ' × ')}`)
    if (n.length === t.goal) onSolved(chk.pass())
    else chk.pass()
    setFb({ ok: true, text: n.length >= total ? `Harika! ${t.vol} küple kurulabilen ${total} kutunun hepsini buldun.` : n.length >= t.goal ? `${n.length} farklı kutu! Daha fazlası da var — hepsini bulabilir misin?` : `Güzel kutu! ${t.vol} küple başka hangi kutuları kurabilirsin?` })
  }
  return (
    <Split
      work={<BoxView w={w} d={d} h={h} dark={dark} />}
      panel={
        <>
          <Prompt step="Kutu tasarla">{t.vol} küp şekerin <b>hepsini</b> dikdörtgenler prizması biçiminde bir kutuya diz. En az <b>{t.goal} farklı kutu</b> bul.</Prompt>
          <BoxBuilder w={w} d={d} h={h} setW={set(setW)} setD={set(setD)} setH={set(setH)} dark={dark} />
          <Readout dark={dark} title="Kutudaki küp">{grade >= 6 ? `${w} × ${d} × ${h} = ${p}` : `${p} küp`} {p === t.vol ? '✓' : `(hedef ${t.vol})`}</Readout>
          <button type="button" onClick={save} className="btn-primary min-h-14 w-full text-lg"><Save size={20} />Bu kutuyu kaydet</button>
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} tool="izometrik" />)}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`box-${t.vol}-`))} goal={t.goal} />
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5. en az ambalaj ───────────────────────── */

function SurfaceTask({ t, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'surface' }> } & Common) {
  const [guess, setGuess] = useState<'yes' | 'no' | null>(null)
  const [phase, setPhase] = useState<'predict' | 'build' | 'pick' | 'done'>('predict')
  const [w, setW] = useState(1), [d, setD] = useState(1), [h, setH] = useState(t.vol > 12 ? 2 : 1)
  const [found, setFound] = useState<number[][]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const p = w * d * h
  const all = allBoxes(t.vol)
  const minS = Math.min(...all.map(([a, b, c]) => surf(a, b, c)))
  const set = (f: (v: number) => void) => (v: number) => { f(v); setFb(null) }
  const save = () => {
    if (p !== t.vol) {
      setFb({ ok: false, text: `Bu kutunun hacmi ${p} cm³. Hacmi ${t.vol} cm³ olmalı: hangi boyutu değiştirirsin?` })
      return
    }
    const key = dimsKey([w, d, h])
    if (found.some((f) => dimsKey(f) === key)) {
      setFb({ ok: false, text: 'Bu kutu listede var (döndürülmüş hâli de aynı kutu). Başka bir kutu dene.' })
      return
    }
    setFound([...found, [w, d, h]])
    sol.add(`surf-${t.vol}-${key}`, `${key.replaceAll('×', ' × ')}: ${surf(w, d, h)} cm²`)
    setFb(null)
  }
  const pick = () => {
    const f = found.find((x) => dimsKey(x) === sel)
    if (!f) return
    const S = surf(f[0], f[1], f[2])
    const minFound = Math.min(...found.map(([a, b, c]) => surf(a, b, c)))
    if (S === minS) {
      onSolved(chk.pass())
      setPhase('done')
      setFb(null)
      return
    }
    chk.fail()
    if (S !== minFound) setFb({ ok: false, text: `Listendeki yüzey alanlarını karşılaştır: ${S} cm² en küçüğü mü?` })
    else setFb({ ok: false, text: 'Bulduğun kutular içinde en az kâğıt bu. Ama kenarları birbirine daha yakın, daha “küpe benzeyen” bir kutu yapılabilir mi? Onu da kurup listeye ekle.', mis: guess === 'yes' ? 'Hacmi aynı cisimlerin yüzey alanlarının da aynı olduğunu düşündü' : undefined })
  }
  const S = surf(w, d, h)
  return (
    <Split
      work={<BoxView w={w} d={d} h={h} dark={dark} />}
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Önce düşün">Hacmi {t.vol} cm³ olan farklı kutular yapılacak. Hacimleri aynı olan kutuların <b>yüzey alanları da</b> (ambalaj kâğıdı) aynı mı olur?</Prompt>
              <Choices options={[{ id: 'yes', label: 'Evet, aynı olur' }, { id: 'no', label: 'Hayır, değişebilir' }]} value={guess} onPick={setGuess} />
              <CheckButton disabled={!guess} onClick={() => setPhase('build')}>Kutuları kurup bakalım</CheckButton>
            </>
          )}
          {phase !== 'predict' && (
            <>
              <Prompt step={phase === 'done' ? 'Bulundu' : 'Kur ve karşılaştır'}>Hacmi <b>{t.vol} cm³</b> olan en az <b>3 kutu</b> kur. Sonra <b>en az ambalaj kâğıdı</b> gerektireni seç.</Prompt>
              {phase !== 'done' && (
                <>
                  <BoxBuilder w={w} d={d} h={h} setW={set(setW)} setD={set(setD)} setH={set(setH)} dark={dark} />
                  <Readout dark={dark} title="Bu kutu">
                    <span className="block">V = {w} · {d} · {h} = {p} cm³ {p === t.vol ? '✓' : ''}</span>
                    <span className="block text-base opacity-90">Yüzey: 2·({w}·{d}) + 2·({d}·{h}) + 2·({w}·{h}) = {S} cm²</span>
                  </Readout>
                  <GhostButton dark={dark} onClick={save}><Save size={18} />Listeye ekle</GhostButton>
                </>
              )}
              {found.length > 0 && (
                <Card dark={dark}>
                  <p className="mb-1.5 text-xs font-black tracking-wide uppercase opacity-70">Kutularım {found.length >= 3 && phase !== 'done' ? '· en az kâğıdı seç' : ''}</p>
                  <div className="flex flex-col gap-1.5">
                    {[...found].sort((x, y) => surf(x[0], x[1], x[2]) - surf(y[0], y[1], y[2])).map((f) => {
                      const k = dimsKey(f)
                      const active = sel === k
                      return (
                        <button key={k} type="button" disabled={found.length < 3 || phase === 'done'} onClick={() => { setSel(k); setFb(null) }} className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-left font-black ring-1 ${active ? 'bg-pink-600 text-white ring-pink-700' : dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line'}`}>
                          <span>{k.replaceAll('×', ' × ')}</span>
                          <span className="tabular-nums">{surf(f[0], f[1], f[2])} cm²</span>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              )}
              {phase === 'build' && found.length >= 3 && <CheckButton disabled={!sel} onClick={pick}>Seçimimi kontrol et</CheckButton>}
              {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="izometrik" />)}
              {phase === 'done' && (
                <>
                  <Nudge tone="ok" question={`Evet! Hepsinin hacmi ${t.vol} cm³ ama yüzey alanları farklı. Kenarları birbirine en yakın kutu (küpe en çok benzeyen) en az kâğıdı, ${minS} cm², istiyor. ${guess === 'yes' ? 'Başta aynı olur demiştin; şimdi ne düşünüyorsun?' : 'Tahminin doğruydu.'}`} />
                  {footer}
                </>
              )}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────────────────── 6. kaç kat? (eksik boyut) ───────────────────────── */

function MissingTask({ t, grade, dark, footer, onSolved }: { t: Extract<Task, { kind: 'missing' }> } & Common) {
  const B = t.w * t.d
  const H = t.vol / B
  const [k, setK] = useState(1)
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const unit = grade >= 7 ? 'cm' : 'kat'
  const check = () => {
    const a = parseNum(ans)
    if (a === H) {
      onSolved(chk.pass())
      setDone(true)
      setFb(null)
      return
    }
    chk.fail()
    if (a === t.vol - B) setFb({ text: `${t.vol} − ${B} işlemi kaç küp kaldığını söyler, kaç kat olduğunu değil. Her katta ${B} küp varsa ${t.vol} küp kaç kat eder?`, mis: 'Eksik boyutu bulurken çıkarma yaptı' })
    else if (a * B > t.vol) setFb({ text: `${fmt(a)} kat olsaydı ${fmt(a * B)} küp olurdu — ${t.vol} küpten fazla. Kat ekleyerek ya da bölerek dene.` })
    else setFb({ text: `${fmt(a)} kat olsaydı ${fmt(a * B)} küp olurdu. ${t.vol} küpe ulaşmak için kaç kat gerekir?` })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Iso h={boxMap(t.w, t.d, k)} dark={dark} maxH={H + 2} explode={false} maxHeight={420} />
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <GhostButton dark={dark} disabled={k <= 1} onClick={() => setK(k - 1)}><Minus size={18} />Kat çıkar</GhostButton>
            <span className={`min-w-24 text-center text-lg font-black ${dark ? 'text-white' : 'text-ink'}`}>{k} kat</span>
            <GhostButton dark={dark} disabled={k >= H + 2} onClick={() => setK(k + 1)}><Plus size={18} />Kat ekle</GhostButton>
          </div>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Problem">
            {grade >= 8 ? <>Bir akvaryumun taban alanı <b>{B} cm²</b>, hacmi <b>{t.vol} cm³</b>. Yüksekliği kaç cm?</> : grade === 7 ? <>Tabanı {t.w} cm × {t.d} cm olan bir kutunun hacmi <b>{t.vol} cm³</b>. Kutunun yüksekliği kaç cm?</> : <>Tabanı {t.d} sıra × {t.w} küp olan bir kutuya <b>{t.vol} küp</b> dizildi. Kutu kaç kat?</>}
          </Prompt>
          <Readout dark={dark} title="Şu an">{k} kat × {B} = {k * B} {grade >= 7 ? 'cm³' : 'küp'} {k * B === t.vol ? '✓' : k * B > t.vol ? '(fazla)' : ''}</Readout>
          {!done && (
            <>
              <NumPad value={ans} onChange={(s) => { setAns(s); setFb(null) }} max={3} unit={unit} label={grade >= 7 ? 'Yükseklik' : 'Kat'} />
              <CheckButton onClick={check} disabled={!ans} />
              {fb && <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="izometrik" />}
            </>
          )}
          {done && (
            <>
              <Nudge tone="ok" question={grade >= 7 ? `Evet: ${t.vol} ÷ ${B} = ${H}. Hacim = taban × yükseklik olduğundan yükseklik = hacim ÷ taban.` : `Evet: ${H} kat × ${B} = ${t.vol}. Bölme de aynı soruyu sorar: ${t.vol} ÷ ${B} = ${H}.`} />
              <StrategyPicker options={['Kat kat ekledim', `Böldüm (${t.vol} ÷ ${B})`, 'Çarpımı tahmin edip denedim']} onPick={() => {}} />
              {footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────────────────── 7. görünümlerden yapı ───────────────────────── */

function ViewsTask({ t, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'views' }> } & Common) {
  const [h, setH] = useState<HMap>(() => emptyMap(4, 3))
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null)
  const [vols, setVols] = useState<number[]>([])
  const chk = useChecks()
  const F = frontView(t.target), S = sideView(t.target), T = topView(t.target)
  // en az ve en çok küp
  const maxV = t.target.reduce((s, r, j) => s + r.reduce((q, _, i) => q + Math.min(F[i], S[t.target.length - 1 - j]), 0), 0)
  const check = () => {
    const ok = trim1(frontView(h)) === trim1(F) && trim1(sideView(h)) === trim1(S) && trimTop(topView(h)) === trimTop(T)
    if (!ok) {
      chk.fail()
      const which = trim1(frontView(h)) !== trim1(F) ? 'önden' : trim1(sideView(h)) !== trim1(S) ? 'sağdan' : 'üstten'
      setFb({ ok: false, text: `Yapın ${which} bakınca hedefle aynı görünmüyor. ${which === 'üstten' ? 'Üstten bakınca hangi kareler dolu olmalı?' : 'Her sütunun en yüksek küpü kaç katta olmalı?'} Yapıyı ÖN etiketi önüne gelecek biçimde düşün.` })
      return
    }
    const v = volume(h)
    if (vols.includes(v)) {
      setFb({ ok: false, text: `Görünümler tuttu, ama ${v} küplük bir yapıyı zaten bulmuştun. Küp sayısı farklı olan bir yapı daha kurabilir misin? Bir küpü saklı bir yere ekle ya da çıkar.` })
      return
    }
    const n = [...vols, v]
    setVols(n)
    sol.add(`views-${v}`, `${v} küplük yapı`)
    if (n.length === 1) onSolved(chk.pass())
    const lo = Math.min(...n), hi = Math.max(...n)
    setFb({ ok: true, text: n.length === 1 ? `Görünümler tuttu! Yapında ${v} küp var. Aynı üç görünümü veren ama küp sayısı farklı bir yapı da kurulabilir mi?` : `Yine tuttu: ${v} küp! Aynı görünümler farklı hacimler verebiliyor. Şimdiye kadar en az ${lo}, en çok ${hi} küp.${hi === maxV ? ' En çok küplü yapıyı buldun.' : ''}` })
  }
  return (
    <Split
      work={<Stage dark={dark}><BuildBoard h={h} onChange={(n) => { setH(n); setFb(null) }} maxH={3} dark={dark} explodable /></Stage>}
      panel={
        <>
          <Prompt step="Görünümlerden kur">Önden, sağdan ve üstten bakınca aşağıdaki gibi görünen bir yapı kur.</Prompt>
          <Views front={F} side={S} top={T} dark={dark} />
          <CheckButton onClick={check} disabled={volume(h) === 0} />
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} tool="izometrik" />)}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith('views-'))} />
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 8. L tabanlı prizma ve silindir ───────────────────────── */

function Cylinder({ layers, dark }: { layers: number; dark: boolean }) {
  const rx = 60, ry = 18, lh = 16
  return (
    <svg viewBox={`-70 -${layers * lh + 30} 140 ${layers * lh + 60}`} className="mx-auto block w-40" aria-label="Kat kat silindir">
      {Array.from({ length: layers }).map((_, k) => (
        <g key={k}>
          <path d={`M ${-rx} ${-k * lh} v ${-lh} a ${rx} ${ry} 0 0 0 ${2 * rx} 0 v ${lh} a ${rx} ${ry} 0 0 1 ${-2 * rx} 0 z`} fill={k % 2 ? '#38bdf8' : '#0ea5e9'} stroke={dark ? '#0f172a' : '#1f2340'} strokeWidth={1.2} />
          <ellipse cx={0} cy={-(k + 1) * lh} rx={rx} ry={ry} fill="#bae6fd" stroke={dark ? '#0f172a' : '#1f2340'} strokeWidth={1.2} />
        </g>
      ))}
      <text x={0} y={-layers * lh + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#0c4a6e">20 cm²</text>
    </svg>
  )
}

function PrismTask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'prism' }> } & Common) {
  const map: HMap = t.base.map((r) => [...r].map((c) => (c === '#' ? t.h : 0)))
  const baseA = t.base.join('').split('').filter((c) => c === '#').length
  const V = baseA * t.h
  const [phase, setPhase] = useState<'prism' | 'cyl' | 'done'>('prism')
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const chk2 = useChecks()
  const box = t.base.length * t.base[0].length * t.h
  const check = () => {
    const a = parseNum(ans)
    if (phase === 'prism') {
      if (a === V) {
        chk.pass()
        setPhase('cyl')
        setAns('')
        setFb(null)
        return
      }
      chk.fail()
      if (a === box) setFb({ text: `${box}, tabanı tam bir ${t.base[0].length} × ${t.base.length} dikdörtgen olsaydı doğru olurdu. Bu prizmanın tabanında gerçekten kaç kare var?`, mis: 'Dikdörtgen olmayan tabanı dikdörtgen gibi hesapladı' })
      else setFb({ text: `Katmanlarını ayır: her kat aynı mı? Bir katta kaç küp var, kaç kat var?` })
      return
    }
    if (a === 120) {
      onSolved(chk.pass() && chk2.pass())
      setPhase('done')
      setFb(null)
      return
    }
    chk2.fail()
    setFb({ text: 'Silindiri de 1 cm kalınlığında eş “dilimler” (katlar) gibi düşün. Bir dilimin hacmi taban alanı kadar: 20 cm³. Kaç dilim var?' })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          {phase === 'prism' ? <ViewBoard h={map} dark={dark} maxH={t.h} maxHeight={400} /> : (
            <div className="grid items-end gap-3 sm:grid-cols-2">
              <Iso h={map} dark={dark} maxH={t.h} explode maxHeight={300} front={false} />
              <div><Cylinder layers={6} dark={dark} /><p className={`text-center text-sm font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Taban 20 cm², yükseklik 6 cm</p></div>
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'prism' && <Prompt step="Prizma">Bu prizmanın tabanı dikdörtgen değil, <b>L biçiminde</b>. Yüksekliği {t.h} cm. <b>Hacmi kaç cm³?</b></Prompt>}
          {phase !== 'prism' && <Readout dark={dark} title="Prizma">Taban alanı {baseA} cm² × yükseklik {t.h} cm = {V} cm³</Readout>}
          {phase === 'cyl' && <Prompt step="Benzetme: silindir">Bir silindirin taban alanı <b>20 cm²</b>, yüksekliği <b>6 cm</b>. Hacmi kaç cm³ olur?</Prompt>}
          {phase !== 'done' && (
            <>
              <NumPad value={ans} onChange={(s) => { setAns(s); setFb(null) }} max={4} unit="cm³" />
              <CheckButton onClick={check} disabled={!ans} />
              {fb && <Nudge key={`${phase}-${chk.tries}-${chk2.tries}`} question={fb.text} misconception={fb.mis} tool="izometrik" />}
            </>
          )}
          {phase === 'done' && (
            <>
              <Nudge tone="ok" question="Evet: 20 · 6 = 120 cm³. Taban hangi biçimde olursa olsun, eş katlar üst üste geliyorsa hacim = taban alanı × yükseklik." />
              <StrategyPicker options={['Katman katman saydım', 'Taban × yükseklik', 'Büyük kutudan eksiği çıkardım']} onPick={() => {}} />
              {footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────────────────── 9. boyutlar iki katına çıkarsa ───────────────────────── */

function ScaleTask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'scale' }> } & Common) {
  const V0 = t.w * t.d * t.h
  const target = dimsKey([2 * t.w, 2 * t.d, 2 * t.h])
  const [guess, setGuess] = useState<number | null>(null)
  const [phase, setPhase] = useState<'predict' | 'build' | 'answer' | 'done'>('predict')
  const [w, setW] = useState(t.w), [d, setD] = useState(t.d), [h, setH] = useState(t.h)
  const [ans, setAns] = useState<number | null>(null)
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const built = dimsKey([w, d, h]) === target
  const V = w * d * h
  const answer = () => {
    if (ans === 8) {
      onSolved(chk.pass())
      setPhase('done')
      setFb(null)
      return
    }
    chk.fail()
    setFb({ text: `Yeni kutuda ${V} küp, eskisinde ${V0} küp var. ${V}, ${ek(V0, 'gen')} kaç katı? Eski kutudan yeni kutuya kaç tane sığar?` })
  }
  return (
    <Split
      work={
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Stage dark={dark}>
            <p className={`text-center text-sm font-black ${dark ? 'text-slate-200' : 'text-ink'}`}>İlk kutu: {t.w} × {t.d} × {t.h} = {V0} cm³</p>
            <Iso h={boxMap(t.w, t.d, t.h)} dark={dark} maxH={2} span={4} front={false} layerLabels={false} maxHeight={220} mono="#94a3b8" />
          </Stage>
          {phase === 'predict' ? (
            <Stage dark={dark} className="grid place-items-center"><p className={`p-6 text-center text-lg font-black ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Önce tahmin et, sonra yeni kutuyu kur.</p></Stage>
          ) : (
            <BoxView w={w} d={d} h={h} dark={dark} />
          )}
        </div>
      }
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Önce tahmin et">İlk kutunun <b>eni, boyu ve yüksekliği</b> 2 katına çıkarılırsa hacmi kaç katına çıkar?</Prompt>
              <Choices options={[2, 4, 6, 8].map((k) => ({ id: k, label: `${k} katına` }))} value={guess} onPick={setGuess} />
              <CheckButton disabled={!guess} onClick={() => setPhase('build')}>Tahminimi kaydet</CheckButton>
            </>
          )}
          {phase !== 'predict' && (
            <>
              <Prompt step={phase === 'build' ? 'Kur' : 'Karşılaştır'}>{phase === 'build' ? <>Bütün boyutları 2 katına çıkarılmış yeni kutuyu kur.</> : <>Yeni kutunun hacmi ilk kutununkinin kaç katı?</>}</Prompt>
              {phase === 'build' && <BoxBuilder w={w} d={d} h={h} setW={setW} setD={setD} setH={setH} dark={dark} />}
              <Readout dark={dark} title="Yeni kutu">V = {w} · {d} · {h} = {V} cm³ {built ? '✓' : ''}</Readout>
              {phase === 'build' && <CheckButton disabled={!built} onClick={() => setPhase('answer')}>Kutu hazır</CheckButton>}
              {phase === 'build' && !built && V > V0 && <p className={`text-center text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>İpucu: {t.w}, {t.d} ve {t.h} sayılarının her birinin 2 katı ne?</p>}
              {phase === 'answer' && (
                <>
                  <Choices options={[2, 4, 6, 8].map((k) => ({ id: k, label: `${k} katı` }))} value={ans} onPick={(k) => { setAns(k); setFb(null) }} />
                  <CheckButton disabled={!ans} onClick={answer} />
                  {fb && <Nudge key={chk.tries} question={fb.text} misconception={guess === 2 ? 'Bütün boyutlar 2 katına çıkınca hacmin de 2 katına çıkacağını düşündü' : undefined} tool="izometrik" />}
                </>
              )}
              {phase === 'done' && (
                <>
                  <Nudge tone="ok" question={`Evet: ${V} = 8 · ${V0}. En 2 kat → 2, boy 2 kat → 2 · 2 = 4, yükseklik 2 kat → 2 · 2 · 2 = 8 kat. ${guess === 8 ? 'Tahminin de doğruydu!' : `Tahminin ${guess} katıydı; hangi boyutu hesaba katmamıştın?`}`} />
                  {footer}
                </>
              )}
            </>
          )}
        </>
      }
    />
  )
}

