import { useEffect, useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { SolutionList, StrategyPicker } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, NumPad, Nudge, Prompt, Slider, Split, Stage, Stepper, fmt, parseNum, useChecks } from '../donusum-studyosu/ortak'
import { AngleArc, Board, COL, Dot, Handle, Lbl, Seg, cm, theme, useBoard, useTween } from './board'
import { circleInter, closes, dirDeg, len, polar, pt, toDeg, type P } from './geo'
import type { Common, SelectItem, Task } from './common'

const STK = { base: '#db2777', left: '#0284c7', right: '#16a34a' }

/* ───────────── çubuk deneyi tahtası ───────────── */

/** Taban (en uzun) çubuk yatay; diğer iki çubuk uçlarında dik durur ve birbirine doğru indirilir. */
function SticksBoard({ l, r, c, t, dark, circles }: { l: number; r: number; c: number; t: number; dark: boolean; circles?: boolean }) {
  const U = 34, w = 520, h = 410
  const ox = (w - c * U) / 2, oy = 372
  return (
    <Board w={w} h={h} U={U} origin={[ox, oy]} dark={dark} label="Çubuk deneyi">
      <SticksInner l={l} r={r} c={c} t={t} circles={circles} />
    </Board>
  )
}

function SticksInner({ l, r, c, t, circles }: { l: number; r: number; c: number; t: number; circles?: boolean }) {
  const B = useBoard()
  const th = theme(B.dark)
  const A = pt(0, 0), Bp = pt(c, 0)
  const ok = closes(l, r, c)
  const C = ok ? circleInter(A, l, Bp, r)[0] : null
  const fA = C ? dirDeg(A, C) : 0, fB = C ? dirDeg(Bp, C) : 180
  const thA = 90 + (fA - 90) * t, thB = 90 + (fB - 90) * t
  const tipA = polar(A, l, thA), tipB = polar(Bp, r, thB)
  const done = t > 0.999
  const arc = (ctr: P, rad: number, from: number, to: number, sweep: 0 | 1) => {
    const s = polar(ctr, rad, from), e = polar(ctr, rad, to)
    return `M${B.X(s.x)},${B.Y(s.y)} A${rad * B.U},${rad * B.U} 0 0 ${sweep} ${B.X(e.x)},${B.Y(e.y)}`
  }
  const stick = (p: P, q: P, col: string, lab: string, side: 1 | -1) => {
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
    const d = len(p, q) || 1
    const nx = (-(q.y - p.y) / d) * side, ny = ((q.x - p.x) / d) * side
    return (
      <g>
        <line x1={B.X(p.x)} y1={B.Y(p.y)} x2={B.X(q.x)} y2={B.Y(q.y)} stroke={col} strokeWidth={11} strokeLinecap="round" />
        <line x1={B.X(p.x)} y1={B.Y(p.y)} x2={B.X(q.x)} y2={B.Y(q.y)} stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
        <text x={B.X(m.x + nx * 0.7)} y={B.Y(m.y + ny * 0.7) + 5} textAnchor="middle" fontSize={16} fontWeight={900} fill={col} stroke={th.halo} strokeWidth={4} paintOrder="stroke">{lab}</text>
      </g>
    )
  }
  return (
    <g pointerEvents="none">
      {circles && done && (
        <>
          <circle cx={B.X(0)} cy={B.Y(0)} r={l * B.U} fill="none" stroke={STK.left} strokeOpacity={0.35} strokeDasharray="6 6" strokeWidth={2} />
          <circle cx={B.X(c)} cy={B.Y(0)} r={r * B.U} fill="none" stroke={STK.right} strokeOpacity={0.35} strokeDasharray="6 6" strokeWidth={2} />
        </>
      )}
      {t > 0.01 && <path d={arc(A, l, 90, thA, 1)} fill="none" stroke={STK.left} strokeOpacity={0.55} strokeDasharray="4 5" strokeWidth={2.5} />}
      {t > 0.01 && <path d={arc(Bp, r, 90, thB, 0)} fill="none" stroke={STK.right} strokeOpacity={0.55} strokeDasharray="4 5" strokeWidth={2.5} />}
      {done && C && <polygon points={[A, Bp, C].map((p) => `${B.X(p.x)},${B.Y(p.y)}`).join(' ')} fill={th.fill} />}
      {stick(A, Bp, STK.base, cm(c, 1), -1)}
      {stick(A, tipA, STK.left, cm(l, 1), 1)}
      {stick(Bp, tipB, STK.right, cm(r, 1), -1)}
      <circle cx={B.X(0)} cy={B.Y(0)} r={7} fill={th.halo} stroke={th.ink} strokeWidth={3} />
      <circle cx={B.X(c)} cy={B.Y(0)} r={7} fill={th.halo} stroke={th.ink} strokeWidth={3} />
      {done && C && <circle cx={B.X(C.x)} cy={B.Y(C.y)} r={9} fill="#facc15" stroke={th.halo} strokeWidth={3} />}
      {done && !ok && l + r < c - 1e-9 && (
        <g>
          <line x1={B.X(l)} x2={B.X(c - r)} y1={B.Y(0) + 22} y2={B.Y(0) + 22} stroke="#f59e0b" strokeWidth={3} />
          <line x1={B.X(l)} x2={B.X(l)} y1={B.Y(0) + 14} y2={B.Y(0) + 30} stroke="#f59e0b" strokeWidth={3} />
          <line x1={B.X(c - r)} x2={B.X(c - r)} y1={B.Y(0) + 14} y2={B.Y(0) + 30} stroke="#f59e0b" strokeWidth={3} />
          <Lbl p={pt((l + c - r) / 2, 0)} dy={-30} color="#d97706">boşluk {cm(c - l - r)}</Lbl>
        </g>
      )}
      {done && !ok && Math.abs(l + r - c) < 1e-9 && <Lbl p={pt(l, 0)} dy={-30} color="#d97706">Uçlar tabanda buluştu: düz çizgi!</Lbl>}
    </g>
  )
}

/** En uzunu taban yapar: [sol, sağ, taban] */
const arrange = (s: [number, number, number]): [number, number, number] => {
  const z = [...s].sort((a, b) => a - b)
  return [z[0], z[1], z[2]]
}

/* ───────────── 5. sınıf: kapanır mı? ───────────── */

const RULES = [
  { id: 'gt', label: 'İki kısa çubuğun toplamı en uzun çubuktan büyükse' },
  { id: 'ge', label: 'İki kısa çubuğun toplamı en uzun çubuğa eşit ya da ondan büyükse' },
  { id: 'diff', label: 'Üç çubuk da birbirinden farklı uzunluktaysa' },
  { id: 'short', label: 'En uzun çubuk 8 cm’den kısaysa' },
] as const

export function SticksTask({ t: task, dark, footer, onSolved }: { t: Extract<Task, { kind: 'sticks' }> } & Common) {
  const track = useTracker()
  const chk = useChecks()
  const [i, setI] = useState(0)
  const [pred, setPred] = useState<'yes' | 'no' | null>(null)
  const [hits, setHits] = useState<boolean[]>([])
  const [rule, setRule] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const round = task.rounds[Math.min(i, task.rounds.length - 1)]
  const [l, r, c] = arrange(round)
  const t = useTween(pred ? 1 : 0, 1400, true)
  const done = pred !== null && t > 0.999
  const ok = closes(l, r, c)
  const allDone = i >= task.rounds.length
  const predict = (p: 'yes' | 'no') => {
    if (pred) return
    setPred(p)
    const right = (p === 'yes') === ok
    track.attempt(right)
    setHits((h) => [...h, right])
  }
  const nextRound = () => {
    setPred(null)
    setI(i + 1)
  }
  const checkRule = () => {
    if (rule === 'gt') {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: 'Evet! İki kısa çubuk birlikte en uzun çubuktan daha uzun olmalı. Toplam eşit olursa uçlar tabanda buluşur ve üçgen “yassılaşır”.' })
      return
    }
    chk.fail()
    if (rule === 'ge') setFb({ ok: false, text: 'Toplamın en uzun çubuğa eşit olduğu denemeye geri dön: uçlar buluştu ama bir üçgen oluştu mu, yoksa düz bir çizgi mi?', mis: 'Toplam eşitken de üçgen kapanır sandı' })
    else if (rule === 'diff') setFb({ ok: false, text: 'Eşit çubuklarla da üçgen kurulur mu? 5, 5, 5 cm’lik çubukları düşün. Asıl önemli olan, kısa çubukların en uzuna yetip yetmemesi değil mi?' })
    else setFb({ ok: false, text: '2, 3 ve 7 cm’lik çubuklarda en uzun çubuk 8 cm’den kısa. Kapanır mı? Kısa çubukları en uzunla karşılaştır.' })
  }
  const [x, y, z] = round
  return (
    <Split
      work={
        <Stage dark={dark}>
          <SticksBoard l={l} r={r} c={c} t={t} dark={dark} circles />
          <div className="mt-2 flex flex-wrap justify-center gap-2 px-1 pb-1">
            {task.rounds.map((_, k) => (
              <span key={k} className={`chip px-3 py-1 text-sm ${k < hits.length ? (hits[k] ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800') : k === i ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-500'}`}>
                Deneme {k + 1}{k < hits.length ? (hits[k] ? ' · tahmin tuttu' : ' · sürpriz!') : ''}
              </span>
            ))}
          </div>
        </Stage>
      }
      panel={
        <>
          {!allDone ? (
            <>
              <Prompt step={`Deneme ${i + 1} / ${task.rounds.length}`}>
                Çubuklar: <b className="text-sky-700">{x} cm</b>, <b className="text-emerald-700">{y} cm</b>, <b className="text-pink-700">{z} cm</b>. En uzun çubuk tabanda; diğer ikisini birbirine doğru indireceğiz. <b>Üçgen kapanır mı?</b>
              </Prompt>
              <Choices<'yes' | 'no'> options={[{ id: 'yes', label: 'Kapanır', sub: 'uçlar havada buluşur' }, { id: 'no', label: 'Kapanmaz', sub: 'uçlar buluşamaz' }]} value={pred} onPick={predict} disabled={!!pred} />
              {pred && !done && <Card dark={dark}><p className="flex items-center gap-2 font-extrabold"><Play size={18} />Çubuklar iniyor… uçların çizdiği yaylara dikkat et.</p></Card>}
              {done && (
                <Nudge
                  tone={(pred === 'yes') === ok ? 'ok' : 'think'}
                  question={
                    ok
                      ? `Kapandı! ${l} + ${r} = ${l + r}, bu da ${c} cm’den büyük.${(pred === 'yes') === ok ? ' Tahminin tuttu.' : ' Tahminin tutmadı — neden kapandı sence?'}`
                      : l + r === c
                        ? `${l} + ${r} = ${c}: uçlar tam tabanda buluştu ama araya yer kalmadı; üçgen değil, düz bir çizgi oldu.`
                        : `Kapanmadı: ${l} + ${r} = ${l + r}, en uzun çubuk ${c} cm. Arada ${fmt(c - l - r)} cm boşluk kaldı.`
                  }
                />
              )}
              {done && <button type="button" onClick={nextRound} className="btn-primary min-h-14 w-full text-lg">{i + 1 < task.rounds.length ? 'Sonraki deneme' : 'Kuralı bul'}</button>}
            </>
          ) : (
            <>
              <Prompt step="Kuralı bul">Üç denemeye bak. Üç çubuk <b>ne zaman</b> üçgen oluşturur?</Prompt>
              <Choices options={RULES.map((q) => ({ id: q.id, label: <span className="text-sm leading-snug">{q.label}</span> }))} value={rule} onPick={(v) => { setRule(v); setFb(null) }} cols={1} disabled={fb?.ok} />
              {!fb?.ok && <CheckButton onClick={checkRule} disabled={!rule} />}
              {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} tool={fb.ok ? undefined : 'dinamikucgen'} />}
              {fb?.ok && footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────── 5. sınıf: üçgen kuran çubuklar (çok çözüm) ───────────── */

export function BuildTask({ t: task, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'build' }> } & Common) {
  const L = task.longest
  const chk = useChecks()
  const [a, setA] = useState(2)
  const [b, setB] = useState(3)
  const [run, setRun] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [solvedOnce, setSolvedOnce] = useState(false)
  const t = useTween(run ? 1 : 0, 1300, true)
  const mine = sol.list.filter((s) => s.key.startsWith(`b${L}-`))
  const [l, r] = [Math.min(a, b), Math.max(a, b)]
  useEffect(() => {
    if (!run || t < 0.999) return
    if (closes(l, r, L)) {
      const isNew = sol.add(`b${L}-${l}-${r}`, `${l}, ${r}, ${L} cm`)
      const count = mine.length + (isNew ? 1 : 0)
      if (isNew && count >= task.goal && !solvedOnce) {
        const first = chk.pass()
        setSolvedOnce(true)
        onSolved(first)
      }
      setFb({ ok: true, text: isNew ? (count >= task.goal ? `Harika, ${count} farklı üçgen! Hepsinde kısa çubukların toplamı ${L}’den büyük mü? Bir tane daha bulabilir misin?` : `Kapandı: ${l} + ${r} = ${l + r} > ${L}. Başka bir çift bul!`) : 'Bu çifti zaten buldun. Hiç denemediğin bir çift seç.' })
    } else {
      chk.fail()
      setFb({ ok: false, text: l + r === L ? `${l} + ${r} = ${L}: uçlar tabanda buluştu, düz çizgi oldu. Çubuklardan birini biraz uzatırsan ne olur?` : `${l} + ${r} = ${l + r}, bu ${L} cm’ye yetiyor mu? Kısa çubukların toplamı en az kaç olmalı?`, mis: l + r === L ? 'Toplam eşitken de üçgen kapanır sandı' : undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, t >= 0.999])
  const change = (fn: () => void) => {
    fn()
    setRun(false)
    setFb(null)
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <SticksBoard l={l} r={r} c={L} t={t} dark={dark} />
        </Stage>
      }
      panel={
        <>
          <Prompt step={`${task.goal} farklı yol bul`}>Tabandaki çubuk <b className="text-pink-700">{L} cm</b>. Ona eklediğin iki çubukla üçgen kapansın. En uzun çubuk taban olarak kalsın (en çok {L} cm).</Prompt>
          <Card dark={dark} className="space-y-2">
            <Stepper label="Mavi çubuk" value={a} onChange={(v) => change(() => setA(v))} min={1} max={L} unit=" cm" dark={dark} />
            <Stepper label="Yeşil çubuk" value={b} onChange={(v) => change(() => setB(v))} min={1} max={L} unit=" cm" dark={dark} />
          </Card>
          <button type="button" onClick={() => { setFb(null); setRun(true) }} disabled={run} className="btn-primary min-h-14 w-full text-lg"><Play size={20} />Çubukları indir</button>
          {fb && <Nudge key={chk.tries + sol.list.length} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          <SolutionList list={mine} goal={task.goal} />
          {solvedOnce && <StrategyPicker question="Çiftleri nasıl buldun?" options={['Deneyerek', `Toplamın ${L}’den büyük olmasına baktım`, 'Birini uzatıp ötekini kısalttım']} onPick={() => {}} />}
          {solvedOnce && footer}
        </>
      }
    />
  )
}

/* ───────────── 5. sınıf: pergelle üçgen (çemberler) ───────────── */

export function CirclesTask({ t: task, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'circles' }> } & Common) {
  const base = task.base
  const chk = useChecks()
  const [r1, setR1] = useState(3)
  const [r2, setR2] = useState(4)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [solvedOnce, setSolvedOnce] = useState(false)
  const U = 28, w = 600, h = 400
  const ox = (w - base * U) / 2, oy = 300
  const A = pt(0, 0), B = pt(base, 0)
  const C = circleInter(A, r1, B, r2)[0] ?? null
  const valid = !!C && closes(r1, r2, base)
  const mine = sol.list.filter((s) => s.key.startsWith('iso-'))
  const setR = (which: 1 | 2, v: number) => {
    const c = Math.max(1, Math.min(8, Math.round(v)))
    if (which === 1) setR1(c)
    else setR2(c)
    setFb(null)
  }
  const check = () => {
    if (!valid) {
      chk.fail()
      setFb({ ok: false, text: r1 + r2 <= base ? `Çemberler kesişmiyor ya da yalnız tabanda değiyor: ${r1} + ${r2} = ${r1 + r2}, taban ${base} cm. Yarıçapları nasıl değiştirmelisin?` : 'Çemberler tabanın üstünde kesişmiyor. Bir çember ötekinin içinde mi kaldı?' })
      return
    }
    if (task.mode === 'eskenar') {
      if (r1 === base && r2 === base) {
        const first = chk.pass()
        onSolved(first)
        setSolvedOnce(true)
        setFb({ ok: true, text: `Eşkenar üçgen! İki çemberin de yarıçapı taban kadar (${base} cm), bu yüzden C noktası hem A’ya hem B’ye ${base} cm uzaklıkta.` })
        return
      }
      chk.fail()
      setFb({ ok: false, text: r1 === r2 ? `AC = BC = ${r1} cm: iki kenar eşit oldu. Üçüncü kenar AB ${base} cm. Üç kenarın da eşit olması için yarıçaplar kaç olmalı?` : 'Çember üzerindeki her nokta merkeze aynı uzaklıktadır. C noktası A’ya ve B’ye ne kadar uzak olmalı?', mis: r1 === r2 ? 'İkizkenarı eşkenarla karıştırdı' : undefined })
      return
    }
    const iso = r1 === r2 || r1 === base || r2 === base
    const eq = r1 === base && r2 === base
    if (!iso || eq) {
      chk.fail()
      setFb({ ok: false, text: eq ? 'Bu eşkenar üçgen: üç kenarı da eşit. İkizkenar ama eşkenar olmayan bir üçgen bulabilir misin? Yalnız iki kenar eşit olsun.' : `Kenarlar ${base}, ${r1}, ${r2} cm: hiçbiri eşit değil. Hangi iki kenarı eşit yapabilirsin?` })
      return
    }
    const key = [base, r1, r2].sort((p, q) => p - q).join('-')
    const isNew = sol.add(`iso-${key}`, `${key.replace(/-/g, ', ')} cm`)
    const count = mine.length + (isNew ? 1 : 0)
    if (count >= task.goal && !solvedOnce) {
      const first = chk.pass()
      onSolved(first)
      setSolvedOnce(true)
    }
    setFb({ ok: true, text: isNew ? (r1 === r2 ? `İkizkenar: AC = BC = ${r1} cm. C noktası iki çemberde de aynı uzaklıkta.` : `İkizkenar: ${r1 === base ? 'AC' : 'BC'} = AB = ${base} cm. Eşit kenarlar tabanda olmak zorunda değil!`) + (count < task.goal ? ' Başka bir tane bul.' : '') : 'Bunu zaten buldun. Başka yarıçaplar dene.' })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={w} h={h} U={U} origin={[ox, oy]} dark={dark} label="Pergelle üçgen">
            <CirclesInner A={A} B={B} C={C} r1={r1} r2={r2} base={base} setR={setR} />
          </Board>
          <p className={`mt-1 text-center text-xs font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Pergel uçlarını (çember üzerindeki noktaları) sürükle ya da yandaki düğmeleri kullan.</p>
        </Stage>
      }
      panel={
        <>
          <Prompt step={task.mode === 'eskenar' ? 'Pergelle kur' : `${task.goal} farklı yol bul`}>
            {task.mode === 'eskenar' ? <>A ve B merkezli iki çember çiz. Kesiştikleri C noktası ile <b>eşkenar üçgen</b> oluştur.</> : <>Aynı tabanla <b>ikizkenar</b> (ama eşkenar olmayan) üçgenler oluştur.</>}
          </Prompt>
          <Card dark={dark} className="space-y-2">
            <Stepper label="A merkezli çember (AC)" value={r1} onChange={(v) => setR(1, v)} min={1} max={8} unit=" cm" dark={dark} />
            <Stepper label="B merkezli çember (BC)" value={r2} onChange={(v) => setR(2, v)} min={1} max={8} unit=" cm" dark={dark} />
            <p className={`text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Taban AB = {base} cm</p>
          </Card>
          {!(task.mode === 'eskenar' && solvedOnce) && <CheckButton onClick={check} />}
          {fb && <Nudge key={chk.tries + sol.list.length} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          {task.mode === 'ikizkenar' && <SolutionList list={mine} goal={task.goal} />}
          {solvedOnce && footer}
        </>
      }
    />
  )
}

function CirclesInner({ A, B, C, r1, r2, base, setR }: { A: P; B: P; C: P | null; r1: number; r2: number; base: number; setR: (w: 1 | 2, v: number) => void }) {
  const Bd = useBoard()
  const th = theme(Bd.dark)
  const hA = polar(A, r1, 150), hB = polar(B, r2, 30)
  const centroid = C ? pt((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3) : pt(base / 2, 1)
  return (
    <>
      <circle cx={Bd.X(0)} cy={Bd.Y(0)} r={r1 * Bd.U} fill={COL.A} fillOpacity={0.05} stroke={COL.A} strokeWidth={2} strokeDasharray="7 6" pointerEvents="none" />
      <circle cx={Bd.X(base)} cy={Bd.Y(0)} r={r2 * Bd.U} fill={COL.B} fillOpacity={0.05} stroke={COL.B} strokeWidth={2} strokeDasharray="7 6" pointerEvents="none" />
      {C && <polygon points={[A, B, C].map((p) => `${Bd.X(p.x)},${Bd.Y(p.y)}`).join(' ')} fill={th.fill} stroke={th.stroke} strokeWidth={3} strokeLinejoin="round" pointerEvents="none" />}
      <Seg p={A} q={B} color={th.ink} width={4} label={`${base} cm`} away={C ?? pt(base / 2, 1)} />
      <Seg p={A} q={hA} color={COL.A} width={2} dash="3 4" />
      <Seg p={B} q={hB} color={COL.B} width={2} dash="3 4" />
      {C && <Seg p={A} q={C} color={COL.A} width={4} label={`${r1} cm`} away={centroid} labelColor={COL.A} />}
      {C && <Seg p={B} q={C} color={COL.B} width={4} label={`${r2} cm`} away={centroid} labelColor={COL.B} />}
      <Dot p={A} color={th.ink} label="A" away={pt(base / 2, -1)} />
      <Dot p={B} color={th.ink} label="B" away={pt(base / 2, -1)} />
      {C && <Dot p={C} color="#7c3aed" label="C" away={centroid} />}
      <Handle id="rA" p={hA} color={COL.A} snap={0} onMove={(q) => setR(1, len(q, A))} />
      <Handle id="rB" p={hB} color={COL.B} snap={0} onMove={(q) => setR(2, len(q, B))} />
    </>
  )
}

/* ───────────── seçme görevi (hangileri kurulur?) ───────────── */

export function SelectTask({ t: task, dark, footer, onSolved }: { t: Extract<Task, { kind: 'select' }> } & Common) {
  const chk = useChecks()
  const [on, setOn] = useState<boolean[]>(() => task.items.map(() => false))
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const solved = fb?.ok
  const check = () => {
    const wrong = task.items.findIndex((it, k) => it.ok !== on[k])
    if (wrong < 0) {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: 'Hepsi doğru! Her kartın altında nedenini görebilirsin.' })
      return
    }
    chk.fail()
    const it = task.items[wrong]
    setFb({ ok: false, text: `“${it.label.replace(/\[\[|\]\]/g, '')}” kartına bir daha bak. ${it.why}`, mis: on[wrong] && !it.ok ? it.mis : undefined })
  }
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Prompt step={task.title}>{task.prompt}</Prompt>
      <div className="grid gap-2 sm:grid-cols-2">
        {task.items.map((it, k) => (
          <button
            key={k}
            type="button"
            disabled={solved}
            onClick={() => { setOn((o) => o.map((v, j) => (j === k ? !v : v))); setFb(null) }}
            aria-pressed={on[k]}
            className={`min-h-16 rounded-2xl px-4 py-3 text-left ring-2 transition active:scale-[0.98] ${on[k] ? 'bg-pink-600 text-white ring-pink-700 shadow-[0_3px_0_#9d174d]' : dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`}
          >
            <span className="flex items-center justify-between gap-2 text-xl font-black tabular-nums"><MathText text={it.label} /><span className={`text-xs font-extrabold ${on[k] ? 'text-pink-100' : dark ? 'text-slate-400' : 'text-ink-soft'}`}>{on[k] ? task.okLabel : 'dokun'}</span></span>
            {solved && <span className={`mt-1 block text-sm font-bold ${on[k] ? 'text-pink-50' : dark ? 'text-slate-300' : 'text-ink-soft'}`}>{it.ok ? '✓ ' : '✗ '}<MathText text={it.why} /></span>}
          </button>
        ))}
      </div>
      {!solved && <CheckButton onClick={check} />}
      {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} tool={fb.ok ? undefined : 'dinamikucgen'} />}
      {solved && footer}
    </div>
  )
}

export function sideItems(triples: [number, number, number][]): SelectItem[] {
  return triples.map((tr) => {
    const [x, y, z] = [...tr].sort((p, q) => p - q)
    const ok = x + y > z + 1e-9
    const s = (v: number) => fmt(v)
    return {
      label: tr.map(s).join(' · '),
      ok,
      why: ok ? `${s(x)} + ${s(y)} = ${s(x + y)} > ${s(z)}` : Math.abs(x + y - z) < 1e-9 ? `${s(x)} + ${s(y)} = ${s(z)}: uçlar tabanda buluşur, düz çizgi olur.` : `${s(x)} + ${s(y)} = ${s(x + y)} < ${s(z)}: kısa kenarlar en uzuna yetmez.`,
      mis: Math.abs(x + y - z) < 1e-9 ? 'Toplam eşitken de üçgen kurulur sandı' : 'Kenar toplamını en uzun kenarla karşılaştırmadı',
    }
  })
}

/* ───────────── 8. sınıf: üçüncü kenar hangi aralıkta? ───────────── */

export function RangeTask({ t: task, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'range' }> } & Common) {
  const { a, b } = task
  const lo = Math.abs(a - b), hi = a + b
  const answer = 2 * Math.min(a, b) - 1
  const chk = useChecks()
  const [theta, setTheta] = useState(60)
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [visited, setVisited] = useState({ lo: false, hi: false })
  const U = Math.min(40, 540 / (a + b))
  const w = 600, h = Math.round(a * U + 70)
  const ox = 30 + a * U, oy = h - 34
  const C = pt(0, 0), A = pt(b, 0)
  const Bv = polar(C, a, theta)
  const c = len(A, Bv)
  const degenerate = theta < 0.01 || theta > 179.99
  const mine = sol.list.filter((s) => s.key.startsWith('rng-'))
  const found = useMemo(() => new Set(mine.map((s) => Number(s.key.split('-')[1]))), [mine])
  const lastAdded = useRef<number | null>(null)
  const thetaFor = (n: number) => toDeg(Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - n * n) / (2 * a * b)))))
  const setFromTheta = (d: number) => {
    let th = Math.max(0, Math.min(180, d))
    if (th < 2.5) th = 0
    if (th > 177.5) th = 180
    const cc = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos((th * Math.PI) / 180))
    const n = Math.round(cc)
    if (Math.abs(cc - n) < 0.14 && th > 0 && th < 180) th = thetaFor(n)
    setTheta(th)
  }
  useEffect(() => {
    if (theta === 0) setVisited((v) => (v.lo ? v : { ...v, lo: true }))
    if (theta === 180) setVisited((v) => (v.hi ? v : { ...v, hi: true }))
    const n = Math.round(c)
    if (!degenerate && Math.abs(c - n) < 1e-6 && n > lo && n < hi && lastAdded.current !== n) {
      lastAdded.current = n
      sol.add(`rng-${n}`, `${n} cm`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theta])
  const check = () => {
    const v = parseNum(val)
    if (v === answer) {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: `Evet! ${lo} < üçüncü kenar < ${hi}. Arada ${lo + 1}’den ${hi - 1}’e kadar ${answer} tam sayı var. Uçlarda (${lo} ve ${hi}) çubuklar düz bir çizgi olur.` })
      return
    }
    chk.fail()
    if (v === answer + 2) setFb({ ok: false, text: `Kolu en sona kadar açtığında (ya da kapattığında) bir üçgen kaldı mı? ${lo} ve ${hi} cm’de ne oluyor?`, mis: 'Üçgen eşitsizliğinde eşitlik durumunu dahil etti' })
    else if (v === answer + 1) setFb({ ok: false, text: `Uç değerlerden biri hâlâ sayılmış olabilir mi? ${lo} cm’de ve ${hi} cm’de üçgen var mı?`, mis: 'Üçgen eşitsizliğinde uç değerlerden birini dahil etti' })
    else setFb({ ok: false, text: `Kolu çevirerek en kısa ve en uzun üçüncü kenarı bul. Bu iki uç arasındaki tam sayıları sayabilir misin?` })
  }
  const nlMax = hi + 2
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={w} h={h} U={U} origin={[ox, oy]} dark={dark} label="Menteşeli iki çubuk">
            <RangeInner C={C} A={A} Bv={Bv} a={a} b={b} c={c} degenerate={degenerate} onTheta={setFromTheta} />
          </Board>
          <NumberStrip max={nlMax} lo={lo} hi={hi} cur={c} found={found} showEnds={visited.lo || visited.hi || !!fb?.ok} dark={dark} />
        </Stage>
      }
      panel={
        <>
          <Prompt step="Önce düşün, sonra çevir">Bir üçgenin iki kenarı <b>{a} cm</b> ve <b>{b} cm</b>. Üçüncü kenar kaç santimetre olabilir? Mor ucu çevirerek bütün <b>tam sayı</b> değerlerini bul.</Prompt>
          <Card dark={dark}>
            <p className="mb-1 text-sm font-extrabold">Kolu çevir</p>
            <Slider value={Math.round(theta)} onChange={(d) => setFromTheta(d)} min={0} max={180} step={1} format={(v) => `${v}°`} label="Menteşe açısı" dark={dark} />
            <p className="mt-1 text-lg font-black tabular-nums">Üçüncü kenar ≈ {fmt(c, 2)} cm {degenerate && <span className="text-amber-500">· üçgen değil!</span>}</p>
          </Card>
          <SolutionList list={[...mine].sort((p, q) => Number(p.key.split('-')[1]) - Number(q.key.split('-')[1]))} />
          {mine.length >= 3 && !fb?.ok && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} max={2} label="Kaç farklı tam sayı değeri?" />
              <CheckButton onClick={check} disabled={!val} />
            </>
          )}
          {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          {fb?.ok && <StrategyPicker options={['Kolu çevirip saydım', `|${a} − ${b}| < x < ${a} + ${b} kuralını kullandım`, 'Önce uçları buldum']} onPick={() => {}} />}
          {fb?.ok && footer}
        </>
      }
    />
  )
}

function RangeInner({ C, A, Bv, a, b, c, degenerate, onTheta }: { C: P; A: P; Bv: P; a: number; b: number; c: number; degenerate: boolean; onTheta: (d: number) => void }) {
  const Bd = useBoard()
  const th = theme(Bd.dark)
  const cen = pt((C.x + A.x + Bv.x) / 3, (C.y + A.y + Bv.y) / 3)
  const arcP = (r: number, from: number, to: number) => {
    const s = polar(C, r, from), e = polar(C, r, to)
    return `M${Bd.X(s.x)},${Bd.Y(s.y)} A${r * Bd.U},${r * Bd.U} 0 0 0 ${Bd.X(e.x)},${Bd.Y(e.y)}`
  }
  return (
    <>
      <path d={arcP(a, 0, 180)} fill="none" stroke={COL.C} strokeOpacity={0.3} strokeDasharray="5 6" strokeWidth={2} pointerEvents="none" />
      {!degenerate && <polygon points={[C, A, Bv].map((p) => `${Bd.X(p.x)},${Bd.Y(p.y)}`).join(' ')} fill={th.fill} pointerEvents="none" />}
      <Seg p={A} q={Bv} color="#f59e0b" width={4} dash="9 6" label={`${fmt(c, 2)} cm`} away={C} labelColor="#f59e0b" />
      <Seg p={C} q={A} color={COL.B} width={10} label={`${b} cm`} away={pt(b / 2, 1)} />
      <Seg p={C} q={Bv} color={COL.C} width={10} label={`${a} cm`} away={cen} />
      {!degenerate && <AngleArc at={C} p={A} q={Bv} r={26} color={th.soft} fillOpacity={0.12} showRight={false} />}
      <circle cx={Bd.X(0)} cy={Bd.Y(0)} r={8} fill={th.halo} stroke={th.ink} strokeWidth={3} pointerEvents="none" />
      <Handle id="hinge" p={Bv} color={COL.C} snap={0} onMove={(q) => onTheta(q.y < 0 ? (q.x >= 0 ? 0 : 180) : dirDeg(C, q))} />
    </>
  )
}

function NumberStrip({ max, lo, hi, cur, found, showEnds, dark }: { max: number; lo: number; hi: number; cur: number; found: Set<number>; showEnds: boolean; dark: boolean }) {
  const w = 600, pad = 24
  const X = (v: number) => pad + (v / max) * (w - 2 * pad)
  const th = theme(dark)
  return (
    <svg viewBox={`0 0 ${w} 70`} className="mt-1 block h-auto w-full" role="img" aria-label="Üçüncü kenar sayı doğrusu">
      <line x1={pad} x2={w - pad} y1={34} y2={34} stroke={th.soft} strokeWidth={3} />
      {Array.from({ length: max + 1 }, (_, i) => (
        <g key={i}>
          <line x1={X(i)} x2={X(i)} y1={28} y2={40} stroke={th.soft} strokeWidth={2} />
          <text x={X(i)} y={60} textAnchor="middle" fontSize={13} fontWeight={800} fill={th.ink}>{i}</text>
          {found.has(i) && <circle cx={X(i)} cy={34} r={8} fill="#16a34a" stroke={th.halo} strokeWidth={2} />}
        </g>
      ))}
      {showEnds && (
        <>
          <line x1={X(lo)} x2={X(hi)} y1={34} y2={34} stroke="#16a34a" strokeOpacity={0.45} strokeWidth={7} />
          <circle cx={X(lo)} cy={34} r={8} fill={th.bg} stroke="#f59e0b" strokeWidth={3} />
          <circle cx={X(hi)} cy={34} r={8} fill={th.bg} stroke="#f59e0b" strokeWidth={3} />
        </>
      )}
      <path d={`M${X(cur)},20 l-7,-10 h14 z`} fill="#f59e0b" />
    </svg>
  )
}

