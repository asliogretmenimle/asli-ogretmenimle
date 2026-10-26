import { useEffect, useState } from 'react'
import { Scissors } from 'lucide-react'
import { SolutionList, StrategyPicker } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, NumPad, Nudge, Prompt, Slider, Split, Stage, fmt, parseNum, useChecks } from '../donusum-studyosu/ortak'
import { AngleArc, Board, COL, Dot, Handle, Lbl, Seg, theme, useBoard, useTween } from './board'
import { ang, apexFromAngles, cross, dirDeg, intAngles, len, polar, pt, type P } from './geo'
import type { Common, Task } from './common'

const VCOL = [COL.A, COL.B, COL.C]

/* ───────────── açıları kopar (iç açılar toplamı) ───────────── */

type Tri = { A: P; B: P; C: P }
const PREDS = [
  { id: '90', label: '90°' },
  { id: '180', label: '180°' },
  { id: '360', label: '360°' },
  { id: 'var', label: 'Üçgene göre değişir' },
] as const

export function TearTask({ dark, footer, onSolved }: { t: Extract<Task, { kind: 'tear' }> } & Common) {
  const track = useTracker()
  const chk = useChecks()
  const [tri, setTri] = useState<Tri>({ A: pt(2, 0.5), B: pt(11.5, 0.5), C: pt(5, 5.5) })
  const [pred, setPred] = useState<string | null>(null)
  const [torn, setTorn] = useState(false)
  const [done, setDone] = useState(false)
  const p = useTween(torn ? 1 : 0, 1500)
  const degs = intAngles(tri.A, tri.B, tri.C)
  const obtuse = Math.max(...degs) >= 95
  const moveV = (k: keyof Tri) => (q: P) => {
    const n = { ...tri, [k]: q }
    if (Math.abs(cross(n.A, n.B, n.C)) < 1.2) return
    setTri(n)
  }
  const revealed = torn && p > 0.999
  useEffect(() => {
    if (!revealed || done || !obtuse) return
    setDone(true)
    const first = chk.pass()
    onSolved(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, obtuse, done])
  const choose = (id: string) => {
    if (pred) return
    setPred(id)
    if (id !== '180') chk.fail()
    if (id === '360') track.misconception('Üçgenin iç açıları toplamını 360° sandı')
    if (id === 'var') track.misconception('İç açılar toplamının üçgenin biçimine göre değiştiğini düşündü')
  }
  const clampTo = (q: P) => pt(Math.max(0.3, Math.min(15.8, q.x)), Math.max(0, Math.min(6.5, q.y)))
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={600} h={430} U={36} origin={[24, 268]} dark={dark} label="Üçgenin açılarını kopar">
            <TearInner tri={tri} p={p} revealed={revealed} degs={degs} />
            {(['A', 'B', 'C'] as const).map((k, i) => (
              <Handle key={k} id={k} p={tri[k]} color={VCOL[i]} label={k} away={pt((tri.A.x + tri.B.x + tri.C.x) / 3, (tri.A.y + tri.B.y + tri.C.y) / 3)} onMove={moveV(k)} clampTo={clampTo} />
            ))}
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Önce tahmin et">Bir üçgenin üç iç açısını kâğıttan koparıp yan yana koysak ne kadarlık bir açı oluşur?</Prompt>
          <Choices options={PREDS.map((o) => ({ id: o.id, label: o.label }))} value={pred} onPick={choose} disabled={!!pred} />
          {pred && !torn && (
            <button type="button" onClick={() => setTorn(true)} className="btn-primary min-h-14 w-full text-lg animate-fade-up"><Scissors size={20} />Köşeleri kopar</button>
          )}
          {revealed && (
            <Card dark={dark} className="animate-fade-up">
              <p className="text-sm font-extrabold opacity-80">Yan yana koyunca:</p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                <span style={{ color: COL.A }}>{degs[0]}°</span> + <span style={{ color: COL.B }}>{degs[1]}°</span> + <span style={{ color: COL.C }}>{degs[2]}°</span> = 180°
              </p>
              <p className="mt-1 text-sm font-bold opacity-80">Üç parça düz bir doğru oluşturdu: doğru açı 180°.</p>
            </Card>
          )}
          {revealed && !done && (
            <Nudge question={`${pred === '180' ? 'Tahminin tuttu! ' : 'Tahminin tutmadı — parçalar düz bir doğru oluşturdu. '}Bu bir rastlantı mı? Köşeleri sürükle ve bir açısı geniş açı olan bir üçgen yap. Parçalar yine düz bir doğru oluşturuyor mu?`} tone={pred === '180' ? 'ok' : 'think'} />
          )}
          {done && <Nudge tone="ok" question={`Geniş açılı üçgende de (${Math.max(...degs)}°) üç açı yine düz bir doğru oluşturdu. Üçgenin biçimi değişse de iç açılarının toplamı hep 180°.`} />}
          {done && footer}
        </>
      }
    />
  )
}

function wedgePath(B: ReturnType<typeof useBoard>, c: P, rPx: number, start: number, sweepDeg: number) {
  const r = rPx / B.U
  const s = polar(c, r, start), e = polar(c, r, start + sweepDeg)
  return `M${B.X(c.x)},${B.Y(c.y)} L${B.X(s.x)},${B.Y(s.y)} A${rPx},${rPx} 0 0 0 ${B.X(e.x)},${B.Y(e.y)} Z`
}

function TearInner({ tri, p, revealed, degs }: { tri: Tri; p: number; revealed: boolean; degs: [number, number, number] }) {
  const B = useBoard()
  const th = theme(B.dark)
  const { A, B: Bv, C } = tri
  const O = pt((300 - 24) / 36, (268 - 392) / 36)
  const verts: [P, P, P][] = [[A, Bv, C], [Bv, C, A], [C, A, Bv]]
  const angs = verts.map(([v, q, r]) => ang(v, q, r))
  const shortest = Math.min(len(A, Bv), len(Bv, C), len(C, A)) * B.U
  const r0 = Math.max(18, Math.min(46, shortest * 0.38))
  // çizgide sıra: B (sağ), C (orta), A (sol)
  const target = [angs[1] + angs[2], 0, angs[1]]
  return (
    <g>
      <polygon points={[A, Bv, C].map((q) => `${B.X(q.x)},${B.Y(q.y)}`).join(' ')} fill={th.fill} stroke={th.stroke} strokeWidth={3} strokeLinejoin="round" pointerEvents="none" />
      {/* tahmin çizgisi */}
      <line x1={B.X(O.x) - 150} x2={B.X(O.x) + 150} y1={B.Y(O.y)} y2={B.Y(O.y)} stroke={th.soft} strokeWidth={revealed ? 4 : 2} strokeDasharray={revealed ? undefined : '6 6'} pointerEvents="none" />
      <circle cx={B.X(O.x)} cy={B.Y(O.y)} r={4} fill={th.soft} pointerEvents="none" />
      {revealed && <Lbl p={O} dy={30} color={th.ink} size={16}>doğru açı = 180°</Lbl>}
      {verts.map(([v, q, r], i) => {
        const ccw = cross(v, q, r) > 0
        const s0 = dirDeg(v, ccw ? q : r)
        let d = target[i] - s0
        d = ((d % 360) + 540) % 360 - 180
        const c = pt(v.x + (O.x - v.x) * p, v.y + (O.y - v.y) * p)
        const rr = r0 + (64 - r0) * p
        const st = s0 + d * p
        const mid = polar(c, (rr * 0.62) / B.U, st + angs[i] / 2)
        return (
          <g key={i} pointerEvents="none">
            {p > 0.02 && <path d={wedgePath(B, v, r0, s0, angs[i])} fill="none" stroke={VCOL[i]} strokeWidth={1.5} strokeDasharray="4 4" />}
            <path d={wedgePath(B, c, rr, st, angs[i])} fill={VCOL[i]} fillOpacity={p > 0.02 ? 0.85 : 0.3} stroke={VCOL[i]} strokeWidth={2} />
            {revealed && <text x={B.X(mid.x)} y={B.Y(mid.y) + 5} textAnchor="middle" fontSize={angs[i] < 25 ? 10 : 13} fontWeight={900} fill="#fff">{degs[i]}°</text>}
          </g>
        )
      })}
    </g>
  )
}

/* ───────────── iki açı ver, tepe açısını bul (çok çözüm) ───────────── */

export function TwoAnglesTask({ t: task, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'twoAngles' }> } & Common) {
  const chk = useChecks()
  const [al, setAl] = useState(70)
  const [be, setBe] = useState(60)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [solvedOnce, setSolvedOnce] = useState(false)
  const base = task.base
  const U = 40, w = 600, h = 420
  const ox = (w - base * U) / 2, oy = 380
  const C = apexFromAngles(base, al, be)
  const ga = 180 - al - be
  const mine = sol.list.filter((s) => s.key.startsWith('ta-'))
  const set = (f: (v: number) => void) => (v: number) => { f(Math.max(5, Math.min(175, Math.round(v / 5) * 5))); setFb(null) }
  const check = () => {
    if (!C) {
      chk.fail()
      setFb({ ok: false, text: `Işınlar hiç buluşmuyor! ${al}° + ${be}° = ${al + be}°. İki ışının buluşması için A ile B açılarının toplamı neden ${al + be === 180 ? '180°’den küçük olmalı (180°’de ışınlar paralel)?' : '180°’den küçük olmalı?'}`, mis: al === 90 && be === 90 ? 'Bir üçgende iki dik açı olabileceğini düşündü' : undefined })
      return
    }
    if (ga !== 90) {
      chk.fail()
      setFb({ ok: false, text: `Tepe açısı şimdi ${ga}°. ${ga > 90 ? 'Daha küçük' : 'Daha büyük'} olması için A ve B açılarını nasıl değiştirmelisin? A + B kaç olmalı?` })
      return
    }
    const key = `ta-${Math.min(al, be)}-${Math.max(al, be)}`
    const isNew = sol.add(key, `${al}° + ${be}° + 90°`)
    const count = mine.length + (isNew ? 1 : 0)
    if (count >= task.goal && !solvedOnce) {
      const first = chk.pass()
      setSolvedOnce(true)
      onSolved(first)
    }
    setFb({ ok: true, text: isNew ? (count >= task.goal ? `${count} dik üçgen! Hepsinde A + B = 90°. Neden?` : `Dik üçgen! ${al}° + ${be}° = 90°. Başka bir çift bul.`) : `Bu üçgeni (ya da ayna görüntüsünü: ${be}° + ${al}°) zaten buldun. Başka açılar dene.` })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={w} h={h} U={U} origin={[ox, oy]} dark={dark} label="İki açıdan üçgen">
            <TwoInner base={base} al={al} be={be} C={C} ga={ga} onAl={set(setAl)} onBe={set(setBe)} />
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step={`${task.goal} farklı yol bul`}>Tabandaki A ve B açılarını ayarla. Işınlar C noktasında buluşur. <b>C açısı 90°</b> olan farklı üçgenler kur.</Prompt>
          <Card dark={dark} className="space-y-1">
            <p className="text-sm font-extrabold" style={{ color: COL.A }}>A açısı</p>
            <Slider value={al} onChange={set(setAl)} min={5} max={175} step={5} format={(v) => `${v}°`} color={COL.A} label="A açısı" dark={dark} />
            <p className="text-sm font-extrabold" style={{ color: COL.B }}>B açısı</p>
            <Slider value={be} onChange={set(setBe)} min={5} max={175} step={5} format={(v) => `${v}°`} color={COL.B} label="B açısı" dark={dark} />
          </Card>
          <CheckButton onClick={check}>Bu üçgeni dene</CheckButton>
          {fb && <Nudge key={chk.tries + sol.list.length} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          <SolutionList list={mine} goal={task.goal} />
          {solvedOnce && <StrategyPicker options={['A + B = 90 olmalı diye düşündüm', 'Deneyerek buldum', 'Birini artırıp ötekini azalttım']} onPick={() => {}} />}
          {solvedOnce && footer}
        </>
      }
    />
  )
}

function TwoInner({ base, al, be, C, ga, onAl, onBe }: { base: number; al: number; be: number; C: P | null; ga: number; onAl: (v: number) => void; onBe: (v: number) => void }) {
  const B = useBoard()
  const th = theme(B.dark)
  const A = pt(0, 0), Bp = pt(base, 0)
  const far = 30
  const ra = polar(A, far, al), rb = polar(Bp, far, 180 - be)
  const hA = polar(A, 3.4, al), hB = polar(Bp, 3.4, 180 - be)
  const top = (B.Y(0) - 10) / B.U
  const inView = C && C.y < top
  return (
    <>
      {C && <polygon points={[A, Bp, C].map((q) => `${B.X(q.x)},${B.Y(q.y)}`).join(' ')} fill={th.fill} pointerEvents="none" />}
      <Seg p={A} q={C ?? ra} color={COL.A} width={3} />
      <Seg p={Bp} q={C ?? rb} color={COL.B} width={3} />
      {C && <Seg p={C} q={ra} color={COL.A} width={1.5} dash="4 6" />}
      {C && <Seg p={C} q={rb} color={COL.B} width={1.5} dash="4 6" />}
      <Seg p={A} q={Bp} color={th.ink} width={4} label={`${base} cm`} away={pt(base / 2, 2)} />
      <AngleArc at={A} p={Bp} q={ra} r={40} color={COL.A} label={`${al}°`} />
      <AngleArc at={Bp} p={rb} q={A} r={40} color={COL.B} label={`${be}°`} />
      {C && inView && <AngleArc at={C} p={A} q={Bp} r={34} color={COL.C} label={`${ga}°`} />}
      {C && inView && <Dot p={C} color={COL.C} label="C" away={pt(base / 2, 0)} />}
      {C && !inView && <Lbl p={pt(base / 2, top - 0.6)} color={COL.C}>C çok yukarıda: tepe açısı {ga}°</Lbl>}
      {!C && <Lbl p={pt(base / 2, 2.2)} color="#f59e0b">Işınlar buluşmuyor!</Lbl>}
      <Dot p={A} color={th.ink} label="A" away={pt(base / 2, 1)} />
      <Dot p={Bp} color={th.ink} label="B" away={pt(base / 2, 1)} />
      <Handle id="ha" p={hA} color={COL.A} snap={0} onMove={(q) => onAl(q.y < 0 ? (q.x > 0 ? 5 : 175) : dirDeg(A, q))} />
      <Handle id="hb" p={hB} color={COL.B} snap={0} onMove={(q) => onBe(q.y < 0 ? (q.x < base ? 5 : 175) : 180 - dirDeg(Bp, q))} />
    </>
  )
}

/* ───────────── eksik açıyı bul ───────────── */

export function ThirdTask({ t: task, dark, footer, onSolved }: { t: Extract<Task, { kind: 'third' }> } & Common) {
  const chk = useChecks()
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const check = () => {
    const v = parseNum(val)
    if (v === task.answer) {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: `Evet, ${fmt(task.answer)}${task.unit ?? '°'}. Açıları topla: ${task.angles.join('° + ')}° = 180°.` })
      return
    }
    chk.fail()
    const trap = task.traps?.find((t) => t.v === v)
    if (trap) setFb({ ok: false, text: trap.q, mis: trap.mis })
    else setFb({ ok: false, text: 'Üç iç açının toplamı kaç derece olmalı? Cevabını şekle yerleştir ve topla: 180° ediyor mu?' })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <FigTriangle angles={task.angles} labels={fb?.ok ? task.angles.map((a) => `${a}°`) as [string, string, string] : task.labels} dark={dark} />
        </Stage>
      }
      panel={
        <>
          <Prompt step="Problem"><MathText text={task.story} /></Prompt>
          {!fb?.ok && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} max={3} label={task.question} unit={task.unit ?? '°'} />
              <CheckButton onClick={check} disabled={!val} />
            </>
          )}
          {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} tool={fb.ok ? undefined : 'dinamikucgen'} />}
          {fb?.ok && footer}
        </>
      }
    />
  )
}

/** Açıları verilen üçgenin ölçekli çizimi */
export function FigTriangle({ angles, labels, dark }: { angles: [number, number, number]; labels: [string, string, string]; dark: boolean }) {
  const c0 = apexFromAngles(1, angles[0], angles[1])!
  const xs = [0, 1, c0.x], ys = [0, 0, c0.y]
  const wU = Math.max(...xs) - Math.min(...xs), hU = Math.max(...ys)
  const U = Math.min(440 / wU, 280 / hU)
  const ox = 300 - ((Math.max(...xs) + Math.min(...xs)) / 2) * U, oy = 345
  const A = pt(0, 0), Bp = pt(1, 0), C = c0
  return (
    <Board w={600} h={400} U={U} origin={[ox, oy]} dark={dark} grid={false} label="Üçgen çizimi">
      <FigInner A={A} B={Bp} C={C} labels={labels} />
    </Board>
  )
}

function FigInner({ A, B: Bp, C, labels }: { A: P; B: P; C: P; labels: [string, string, string] }) {
  const B = useBoard()
  const th = theme(B.dark)
  const cen = pt((A.x + Bp.x + C.x) / 3, (A.y + Bp.y + C.y) / 3)
  return (
    <>
      <polygon points={[A, Bp, C].map((q) => `${B.X(q.x)},${B.Y(q.y)}`).join(' ')} fill={th.fill} stroke={th.stroke} strokeWidth={3.5} strokeLinejoin="round" />
      <AngleArc at={A} p={Bp} q={C} r={44} color={COL.A} label={labels[0]} />
      <AngleArc at={Bp} p={C} q={A} r={44} color={COL.B} label={labels[1]} />
      <AngleArc at={C} p={A} q={Bp} r={38} color={COL.C} label={labels[2]} />
      <Dot p={A} color={th.ink} label="A" away={cen} />
      <Dot p={Bp} color={th.ink} label="B" away={cen} />
      <Dot p={C} color={th.ink} label="C" away={cen} />
    </>
  )
}
