import { useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { MathText } from '../../components/MathText'
import { Card, CheckButton, Choices, NumPad, Nudge, Prompt, Slider, Split, Stage, fmt, parseNum, useChecks } from '../donusum-studyosu/ortak'
import { AngleArc, Board, COL, Dot, Handle, Seg, theme, useBoard } from './board'
import { apexFromAngles, circleInter, cross, intAngles, len, polar, pt, type P } from './geo'
import type { Common, Task } from './common'

/* ───────────── büyük kenar ↔ büyük açı ───────────── */

type Tri = { A: P; B: P; C: P }
const VC = { A: COL.A, B: COL.B, C: COL.C }

export function SideAngleTask({ dark, footer, onSolved }: { t: Extract<Task, { kind: 'sideAngle' }> } & Common) {
  const chk = useChecks()
  const [tri, setTri] = useState<Tri>({ A: pt(5.5, 7), B: pt(1.5, 1.5), C: pt(12, 2.5) })
  const [pred, setPred] = useState<'A' | 'B' | 'C' | null>(null)
  const [stage, setStage] = useState<'predict' | 'move' | 'ask' | 'done'>('predict')
  const [side, setSide] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const degs = intAngles(tri.A, tri.B, tri.C)
  const sides = { a: len(tri.B, tri.C), b: len(tri.A, tri.C), c: len(tri.A, tri.B) }
  const move = (k: keyof Tri) => (q: P) => {
    if (stage === 'predict' || stage === 'done') return
    const n = { ...tri, [k]: q }
    if (Math.abs(cross(n.A, n.B, n.C)) < 1.5) return
    setTri(n)
    setFb(null)
  }
  const bigIdx = degs.indexOf(Math.max(...degs))
  const big = (['A', 'B', 'C'] as const)[bigIdx]
  const predict = (v: 'A' | 'B' | 'C') => {
    setPred(v)
    if (v === big) {
      setFb({ ok: true, text: `Evet! En uzun kenar BC (${fmt(sides.a, 1)} cm), en büyük açı onun karşısındaki A köşesinde (${degs[0]}°).` })
    } else {
      chk.fail()
      setFb({ ok: false, text: `Açılar ortaya çıktı: en büyük açı A’da (${degs[0]}°). En uzun kenar BC; A köşesi bu kenara göre nerede duruyor?`, mis: 'En büyük açının en uzun kenarın yanında olduğunu düşündü' })
    }
    setStage('move')
  }
  const sorted = (['a', 'b', 'c'] as const).map((k, i) => ({ k, v: sides[k], deg: degs[i], col: Object.values(VC)[i], name: ['BC', 'AC', 'AB'][i], vx: ['A', 'B', 'C'][i] })).sort((p, q) => q.v - p.v)
  const bOk = degs[1] > degs[0] + 1 && degs[1] > degs[2] + 1
  const ask = (v: string) => {
    setSide(v)
    if (v === 'AC') {
      const first = chk.pass()
      onSolved(first)
      setStage('done')
      setFb({ ok: true, text: 'Doğru! En büyük açı hangi köşedeyse, en uzun kenar hep onun karşısında. En küçük açı da en kısa kenarın karşısında.' })
    } else {
      chk.fail()
      setFb({ ok: false, text: 'Kenar uzunluklarını sıralayan tabloya bak. B köşesinin karşısındaki kenar hangisi?', mis: 'Açı-kenar ilişkisinde karşı kenarı bulamadı' })
    }
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={600} h={420} U={36} origin={[24, 400]} dark={dark} label="Açı ve kenar ilişkisi">
            <SAInner tri={tri} degs={degs} showAngles={stage !== 'predict'} move={move} locked={stage === 'predict' || stage === 'done'} />
          </Board>
        </Stage>
      }
      panel={
        <>
          {stage === 'predict' ? (
            <>
              <Prompt step="Önce tahmin et">Kenarlar: <b>BC = {fmt(sides.a, 1)} cm</b>, AC = {fmt(sides.b, 1)} cm, AB = {fmt(sides.c, 1)} cm. Açıları ölçmeden söyle: <b>en büyük açı hangi köşede?</b></Prompt>
              <Choices<'A' | 'B' | 'C'> cols={3} options={(['A', 'B', 'C'] as const).map((k) => ({ id: k, label: <span style={{ color: pred === k ? undefined : VC[k] }}>{k} köşesi</span> }))} value={pred} onPick={predict} />
            </>
          ) : (
            <>
              <Prompt step={stage === 'done' ? 'Keşfettin' : 'Sürükle ve gözle'}>{stage === 'move' ? <>Köşeleri sürükle: <b>en büyük açı B köşesinde</b> olsun.</> : stage === 'ask' ? <>Şimdi en büyük açı B’de. <b>En uzun kenar hangisi?</b></> : <>Açı ↔ kenar ilişkisi</>}</Prompt>
              <Card dark={dark}>
                <div className="grid grid-cols-2 gap-2 text-sm font-extrabold">
                  <p className="opacity-70">Kenarlar (uzundan kısaya)</p>
                  <p className="opacity-70">Karşısındaki açı</p>
                  {sorted.map((s) => (
                    <div key={s.k} className="contents">
                      <p className="rounded-lg px-2 py-1 text-base font-black tabular-nums" style={{ background: `${s.col}22`, color: dark ? '#fff' : s.col }}>{s.name} = {fmt(s.v, 1)} cm</p>
                      <p className="rounded-lg px-2 py-1 text-base font-black tabular-nums" style={{ background: `${s.col}22`, color: dark ? '#fff' : s.col }}>{s.vx} = {s.deg}°</p>
                    </div>
                  ))}
                </div>
              </Card>
              {stage === 'move' && bOk && <button type="button" onClick={() => { setStage('ask'); setFb(null) }} className="btn-primary min-h-14 w-full text-lg animate-fade-up">B en büyük oldu!</button>}
              {stage === 'ask' && <Choices cols={3} options={['AB', 'AC', 'BC'].map((k) => ({ id: k, label: k }))} value={side} onPick={ask} />}
            </>
          )}
          {fb && <Nudge key={`${stage}${chk.tries}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          {stage === 'done' && footer}
        </>
      }
    />
  )
}

function SAInner({ tri, degs, showAngles, move, locked }: { tri: Tri; degs: [number, number, number]; showAngles: boolean; move: (k: keyof Tri) => (q: P) => void; locked: boolean }) {
  const Bd = useBoard()
  const th = theme(Bd.dark)
  const { A, B, C } = tri
  const cen = pt((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3)
  const clampTo = (q: P) => pt(Math.max(0.3, Math.min(15.8, q.x)), Math.max(0.3, Math.min(10, q.y)))
  return (
    <>
      <polygon points={[A, B, C].map((q) => `${Bd.X(q.x)},${Bd.Y(q.y)}`).join(' ')} fill={th.fill} pointerEvents="none" />
      <Seg p={B} q={C} color={VC.A} width={5} label={`${fmt(len(B, C), 1)} cm`} away={cen} labelColor={VC.A} />
      <Seg p={A} q={C} color={VC.B} width={5} label={`${fmt(len(A, C), 1)} cm`} away={cen} labelColor={VC.B} />
      <Seg p={A} q={B} color={VC.C} width={5} label={`${fmt(len(A, B), 1)} cm`} away={cen} labelColor={VC.C} />
      {showAngles && (
        <>
          <AngleArc at={A} p={B} q={C} r={34} color={VC.A} label={`${degs[0]}°`} />
          <AngleArc at={B} p={C} q={A} r={34} color={VC.B} label={`${degs[1]}°`} />
          <AngleArc at={C} p={A} q={B} r={34} color={VC.C} label={`${degs[2]}°`} />
        </>
      )}
      {(['A', 'B', 'C'] as const).map((k) => <Handle key={k} id={k} p={tri[k]} color={VC[k]} label={k} away={cen} onMove={move(k)} clampTo={clampTo} disabled={locked} />)}
    </>
  )
}

/* ───────────── eşlik: hangi bilgiler tek bir üçgen belirler? ───────────── */

type CardId = 'KKK' | 'KAK' | 'AKA' | 'AAA' | 'KKA'
const CARDS: { id: CardId; title: string; data: string; unique: boolean; q: string; mis?: string; demo: string }[] = [
  { id: 'KKK', title: 'Kenar–Kenar–Kenar', data: 'Kenarlar 5 cm, 6 cm ve 7 cm', unique: true, q: 'Üç çubuk verildiğinde onları başka bir biçimde kapatabilir misin? Çemberlerin kesiştiği nokta kaç yerde olabilir, oradaki üçgenler farklı mı?', demo: 'İki çember iki noktada kesişir ama iki üçgen birbirinin ayna görüntüsü: eş.' },
  { id: 'KAK', title: 'Kenar–Açı–Kenar', data: '5 cm ve 7 cm, aralarındaki açı 50°', unique: true, q: 'Açı iki kenarın arasındaysa, iki kenarın uçlarını birleştiren üçüncü kenarı farklı çizebilir misin?', demo: 'Aradaki açı iki ucu sabitler: üçüncü kenar tek türlü kapanır.' },
  { id: 'AKA', title: 'Açı–Kenar–Açı', data: '40° ve 60°, aralarındaki kenar 7 cm', unique: true, q: 'Tabanın iki ucundan verilen açılarla çizilen iki ışın kaç noktada kesişir?', demo: 'İki ışın tek bir noktada kesişir: tek üçgen.' },
  { id: 'AAA', title: 'Açı–Açı–Açı', data: 'Açılar 50°, 60° ve 70°', unique: false, q: 'Aynı açılarla daha büyük ya da daha küçük bir üçgen çizebilir misin? Açılar değişir mi?', mis: 'Açıları eşit üçgenleri eş sandı (AAA)', demo: 'Aynı açılar, farklı boyutlar: üçgenler benzer ama eş değil.' },
  { id: 'KKA', title: 'Kenar–Kenar–Açı', data: '7 cm ve 5 cm; 40° açı 5 cm’lik kenarın karşısında', unique: false, q: '5 cm’lik kenarı B’nin çevresinde döndürdüğünde 40°’lik açının ışınını kaç noktada kesebilir?', mis: 'Açı arada olmayan iki kenar-bir açı bilgisinin tek üçgen belirlediğini sandı', demo: '5 cm’lik kenar ışını iki yerde keser: iki farklı üçgen!' },
]

export function CongruenceTask({ dark, footer, onSolved }: { t: Extract<Task, { kind: 'congruence' }> } & Common) {
  const chk = useChecks()
  const [ans, setAns] = useState<Record<CardId, boolean | null>>({ KKK: null, KAK: null, AKA: null, AAA: null, KKA: null })
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string; card?: CardId } | null>(null)
  const [shown, setShown] = useState<CardId | null>(null)
  const solved = fb?.ok
  const check = () => {
    const wrong = CARDS.find((c) => ans[c.id] !== c.unique)
    if (!wrong) {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: 'Harika! KKK, KAK ve AKA tek bir üçgeni sabitler (eşlik için yeter). AAA yalnız biçimi, KKA ise bazen iki farklı üçgeni verir.' })
      setShown('KKA')
      return
    }
    chk.fail()
    setShown(wrong.id)
    setFb({ ok: false, text: `${wrong.id} kartını yeniden düşün: ${wrong.q}`, mis: ans[wrong.id] && !wrong.unique ? wrong.mis : undefined, card: wrong.id })
  }
  return (
    <Split
      work={
        <div className="space-y-2">
          {CARDS.map((c) => (
            <div key={c.id} className={`rounded-2xl p-3 ring-1 ${dark ? 'bg-slate-800/90 text-slate-100 ring-slate-600' : 'bg-white ring-line'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-12 min-w-16 place-items-center rounded-xl bg-pink-600 px-2 text-lg font-black text-white">{c.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black tracking-wide uppercase opacity-70">{c.title}</p>
                  <p className="font-extrabold">{c.data}</p>
                </div>
                <div className="flex gap-1.5">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" disabled={solved} onClick={() => { setAns((a) => ({ ...a, [c.id]: v })); setFb(null) }} aria-pressed={ans[c.id] === v}
                      className={`min-h-12 rounded-xl px-3 text-sm font-black ring-1 transition active:scale-95 ${ans[c.id] === v ? 'bg-pink-600 text-white ring-pink-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}>
                      {v ? 'Tek üçgen' : 'Farklı olabilir'}
                    </button>
                  ))}
                </div>
                {(fb && (solved || shown === c.id)) && (
                  <button type="button" onClick={() => setShown(shown === c.id ? null : c.id)} className={`min-h-12 rounded-xl px-3 text-sm font-black ring-1 ${dark ? 'bg-slate-900 text-pink-200 ring-slate-500' : 'bg-pink-50 text-pink-800 ring-pink-200'}`}>{shown === c.id ? 'Gizle' : 'Dene'}</button>
                )}
              </div>
              {shown === c.id && fb && (
                <div className="mt-2 grid items-center gap-2 sm:grid-cols-[260px_1fr]">
                  <Demo id={c.id} dark={dark} />
                  <p className="text-sm font-bold">{c.demo}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      }
      panel={
        <>
          <Prompt step="Eşlik">Arkadaşına telefonda bir üçgeni tarif ediyorsun. Hangi bilgiler verilirse o <b>tam olarak aynı (eş) üçgeni</b> çizebilir? Her kart için karar ver.</Prompt>
          {!solved && <CheckButton onClick={check} disabled={Object.values(ans).some((v) => v === null)} />}
          {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} tool={fb.ok ? undefined : 'dinamikucgen'} />}
          {!solved && fb && <p className={`text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>“Dene” düğmesiyle ikinci bir üçgen kurmayı dene.</p>}
          {solved && footer}
        </>
      }
    />
  )
}

function Demo({ id, dark }: { id: CardId; dark: boolean }) {
  const th = theme(dark)
  const tris: { pts: P[]; dash?: boolean; col: string }[] = []
  if (id === 'KKK') {
    const A = pt(0, 0), B = pt(7, 0)
    const [c1, c2] = circleInter(A, 5, B, 6)
    tris.push({ pts: [A, B, c1], col: COL.A }, { pts: [A, B, c2], col: COL.B, dash: true })
  } else if (id === 'KAK') {
    const A = pt(0, 0), B = pt(7, 0), C = polar(A, 5, 50)
    tris.push({ pts: [A, B, C], col: COL.A })
  } else if (id === 'AKA') {
    const C = apexFromAngles(7, 40, 60)!
    tris.push({ pts: [pt(0, 0), pt(7, 0), C], col: COL.A })
  } else if (id === 'AAA') {
    const C = apexFromAngles(4, 50, 60)!
    tris.push({ pts: [pt(0, 0), pt(7, 0), pt(C.x * 1.75, C.y * 1.75)], col: COL.B, dash: true }, { pts: [pt(0, 0), pt(4, 0), C], col: COL.A })
  } else {
    const A = pt(0, 0), B = polar(A, 7, 40)
    const dx = Math.sqrt(25 - B.y * B.y)
    tris.push({ pts: [A, B, pt(B.x + dx, 0)], col: COL.A }, { pts: [A, B, pt(B.x - dx, 0)], col: COL.B, dash: true })
  }
  const all = tris.flatMap((t) => t.pts)
  const minX = Math.min(...all.map((p) => p.x)), maxX = Math.max(...all.map((p) => p.x))
  const minY = Math.min(...all.map((p) => p.y)), maxY = Math.max(...all.map((p) => p.y))
  const W = 260, H = 150
  const s = Math.min((W - 30) / (maxX - minX), (H - 30) / (maxY - minY))
  const X = (x: number) => 15 + (x - minX) * s + ((W - 30) - (maxX - minX) * s) / 2
  const Y = (y: number) => H - 15 - (y - minY) * s - ((H - 30) - (maxY - minY) * s) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full max-w-[260px] rounded-xl" style={{ background: th.bg }} role="img" aria-label={`${id} denemesi`}>
      {tris.map((t, i) => (
        <polygon key={i} points={t.pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} fill={t.col} fillOpacity={t.dash ? 0.08 : 0.2} stroke={t.col} strokeWidth={2.5} strokeDasharray={t.dash ? '6 5' : undefined} strokeLinejoin="round" />
      ))}
    </svg>
  )
}

/* ───────────── benzerlik: iki parmakla ölçekle ───────────── */

export function SimilarTask({ t: task, dark, footer, onSolved }: { t: Extract<Task, { kind: 'similar' }> } & Common) {
  const chk = useChecks()
  const [k, setK] = useState(1)
  const [stage, setStage] = useState<'scale' | 'ask' | 'done'>('scale')
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const pin = useRef(1)
  const target = 3 * task.k
  const setScale = (v: number) => {
    if (stage !== 'scale') return
    const c = Math.max(0.5, Math.min(3, Math.round(v * 4) / 4))
    setK(c)
    setFb(null)
  }
  useGesture(
    {
      onPinch: ({ offset: [s], first, event }) => {
        event?.preventDefault?.()
        if (first) pin.current = k / s
        setScale(pin.current * s)
      },
    },
    { target: wrap, eventOptions: { passive: false }, pinch: { scaleBounds: { min: 0.2, max: 6 } } },
  )
  const confirm = () => {
    if (k === task.k) {
      setStage('ask')
      setFb({ ok: true, text: `En kısa kenar ${fmt(target)} cm oldu. Öbür kenarları görmeden düşün: en uzun kenar kaç cm?` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `En kısa kenar şimdi ${fmt(3 * k)} cm. ${fmt(target)} cm olması için üçgeni kaç katına büyütmelisin? (3 cm → ${fmt(target)} cm)` })
  }
  const check = () => {
    const v = parseNum(val)
    const right = 5 * task.k
    if (Math.abs(v - right) < 1e-9) {
      const first = chk.pass()
      onSolved(first)
      setStage('done')
      setFb({ ok: true, text: `Evet, ${fmt(right)} cm! Bütün kenarlar aynı oranda (${fmt(task.k)} katı) büyüdü, açılar hiç değişmedi.` })
      return
    }
    chk.fail()
    if (Math.abs(v - (5 + target - 3)) < 1e-9) setFb({ ok: false, text: `Kenarlara aynı sayıyı (${fmt(target - 3)}) eklemişsin. Büyütünce kenarlar aynı sayı kadar mı artar, aynı katına mı çıkar? 3 cm kaç katına çıktı?`, mis: 'Benzer üçgenlerde kenarlara aynı sayıyı ekledi (toplamsal düşünce)' })
    else setFb({ ok: false, text: `3 cm’lik kenar ${fmt(target)} cm oldu. 5 cm’lik kenar da aynı katına çıkarsa kaç olur?` })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <div ref={wrap} style={{ touchAction: 'none' }}>
            <Board w={600} h={400} U={34} origin={[70, 370]} dark={dark} label="Benzer üçgen">
              <SimInner k={k} reveal={stage === 'done'} />
            </Board>
          </div>
          <p className={`mt-1 text-center text-xs font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Üçgenin üzerinde iki parmakla büyüt/küçült ya da kaydırıcıyı kullan.</p>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Benzerlik">Kenarları 3, 4 ve 5 cm olan üçgeni büyüt: en kısa kenarı <b>{fmt(target)} cm</b> olan benzer bir üçgen yap.</Prompt>
          <Card dark={dark}>
            <p className="mb-1 text-sm font-extrabold">Ölçek: {fmt(k)} kat</p>
            <Slider value={k} onChange={setScale} min={0.5} max={3} step={0.25} format={(v) => `×${fmt(v)}`} label="Ölçek" dark={dark} disabled={stage !== 'scale'} />
          </Card>
          {stage === 'scale' && <CheckButton onClick={confirm}>Bu boyut tamam</CheckButton>}
          {stage === 'ask' && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); setFb((f) => (f?.ok ? f : null)) }} comma max={4} label="En uzun kenar" unit="cm" />
              <CheckButton onClick={check} disabled={!val} />
            </>
          )}
          {fb && <Nudge key={`${stage}${chk.tries}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          {stage === 'done' && (
            <Card dark={dark}>
              <p className="text-sm font-extrabold opacity-80">Benzerlik oranı</p>
              <p className="text-lg font-black tabular-nums"><MathText text={`[[${fmt(3 * task.k)}/3]] = [[${fmt(4 * task.k)}/4]] = [[${fmt(5 * task.k)}/5]] = ${fmt(task.k)}`} /></p>
            </Card>
          )}
          {stage === 'done' && footer}
        </>
      }
    />
  )
}

function SimInner({ k, reveal }: { k: number; reveal: boolean }) {
  const Bd = useBoard()
  const th = theme(Bd.dark)
  const A = pt(0, 0), B = pt(4 * k, 0), C = pt(0, 3 * k)
  const A0 = pt(0, 0), B0 = pt(4, 0), C0 = pt(0, 3)
  const cen = pt((4 * k) / 3, k)
  return (
    <>
      <polygon points={[A0, B0, C0].map((q) => `${Bd.X(q.x)},${Bd.Y(q.y)}`).join(' ')} fill="none" stroke={th.soft} strokeWidth={2} strokeDasharray="6 5" pointerEvents="none" />
      <polygon points={[A, B, C].map((q) => `${Bd.X(q.x)},${Bd.Y(q.y)}`).join(' ')} fill={th.fill} stroke={th.stroke} strokeWidth={3.5} strokeLinejoin="round" />
      <Seg p={A} q={C} color={COL.A} width={5} label={`${fmt(3 * k)} cm`} away={cen} labelColor={COL.A} />
      <Seg p={A} q={B} color={COL.B} width={5} label={reveal ? `${fmt(4 * k)} cm` : '? cm'} away={cen} labelColor={COL.B} />
      <Seg p={B} q={C} color={COL.C} width={5} label={reveal ? `${fmt(5 * k)} cm` : '? cm'} away={cen} labelColor={COL.C} />
      <AngleArc at={A} p={B} q={C} r={24} color={th.soft} />
      <AngleArc at={B} p={C} q={A} r={44} color={COL.B} label="37°" />
      <AngleArc at={C} p={A} q={B} r={40} color={COL.C} label="53°" />
      <Dot p={A} color={th.ink} />
    </>
  )
}
