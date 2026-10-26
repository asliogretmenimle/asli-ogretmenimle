import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Delete, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { DragPoint, Pinchable, Plane, usePlane } from '../../interactive/Plane'
import { clamp } from '../../interactive/axis'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Choice, LastTask, NextButton, Panel, Stepper, TopBar, Work, fmtN, shuffle, starsBy, useLook, useSay, type Look } from '../veri-toplama/kit'

/**
 * 67. Doğrusal İlişki Atölyesi (8)
 *  Tablo ↔ grafik ↔ denklem: birini değiştir, ötekiler güncellensin.
 *   - build:   taksi ücreti tablosunu doldur → noktalar grafikte belirir → m ve b ile doğruyu noktalardan geçir
 *   - fit:     iki faturadan doğruyu sürükleyerek kur, denklem hareketten türesin; sabit ücret ve artış hızı
 *   - change:  km ücreti / açılış ücreti değişince doğru nasıl değişir? Tahmin et, iki parmakla döndür/kaydır
 *   - compare: iki tarife — imleçle tara, tabloda bak ya da denklem kur: ne zaman eşitlenir?
 *   - linear:  hangi tablolar doğrusal? (eşit x adımlarında eşit y artışı)
 *   - many:    aynı noktadan geçen farklı tarifeler (birden çok çözüm)
 */

type Res = { first: boolean }
type Task = { kind: 'build' | 'fit' | 'change' | 'compare' | 'linear' | 'many'; title: string; emoji: string }
const TASKS: Task[] = [
  { kind: 'build', emoji: '🚕', title: 'Taksi: açılış ücreti 20 TL, her kilometre 8 TL. Tabloyu doldur, grafiği ve denklemi oluştur.' },
  { kind: 'fit', emoji: '📱', title: 'Bir telefon tarifesinde 2 ayın faturası 150 TL, 5 ayın faturası 300 TL. Doğruyu kur, tarifeyi çöz.' },
  { kind: 'change', emoji: '🔄', title: 'Taksi şirketi ücretleri değiştiriyor. Doğru nasıl değişir? Önce tahmin et, sonra dene.' },
  { kind: 'compare', emoji: '🏁', title: 'A tarifesi: 60 TL + ayda 10 TL. B tarifesi: 20 TL + ayda 18 TL. B, A’ya ne zaman yetişir?' },
  { kind: 'linear', emoji: '🔎', title: 'Bu tablolardan hangileri doğrusal bir ilişki gösteriyor?' },
  { kind: 'many', emoji: '🎨', title: '4. ayda faturası 60 TL olan farklı tarifeler tasarla. Hepsi aynı noktadan geçsin!' },
]

const eq = (m: number, b: number, x = 'x') => {
  const mt = m === 0 ? '' : m === 1 ? x : `${fmtN(m)}${x}`
  if (!mt) return `y = ${fmtN(b)}`
  return `y = ${mt}${b === 0 ? '' : b > 0 ? ` + ${fmtN(b)}` : ` − ${fmtN(-b)}`}`
}

// ───────────────────────── Grafik parçaları ─────────────────────────

function Graph({ xMax, yMax, children, onTap, xLabel = 'x', yLabel = 'y' }: { xMax: number; yMax: number; children: ReactNode; onTap?: (p: { x: number; y: number }) => void; xLabel?: string; yLabel?: string }) {
  return (
    <Plane initial={{ xMin: -xMax * 0.08, xMax: xMax * 1.04, yMin: -yMax * 0.07, yMax: yMax * 1.05 }} equalUnits={false} aspect={0.66} xLabel={xLabel} yLabel={yLabel} onTap={onTap} minSpan={2} maxSpan={xMax * 6} label="Doğrusal ilişki grafiği">
      {children}
    </Plane>
  )
}

function LineG({ m, b, color = '#7c3aed', dash, w = 4, label }: { m: number; b: number; color?: string; dash?: string; w?: number; label?: string }) {
  const P = usePlane()
  const x0 = Math.max(0, P.view.xMin), x1 = P.view.xMax
  const lx = clamp((P.view.yMax * 0.92 - b) / (m || 1e-9), x0 + 0.3, x1 - 0.3)
  return (
    <g>
      <line x1={P.sx(x0)} y1={P.sy(m * x0 + b)} x2={P.sx(x1)} y2={P.sy(m * x1 + b)} stroke={color} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" />
      {label && <text x={P.sx(Math.min(lx, x1 - 0.6)) + 8} y={P.sy(m * Math.min(lx, x1 - 0.6) + b) + 4} fontSize={14} fontWeight={900} fill={color} style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 4 }}>{label}</text>}
    </g>
  )
}

function Dot({ x, y, color = '#db2777', label, star, r = 7 }: { x: number; y: number; color?: string; label?: string; star?: boolean; r?: number }) {
  const P = usePlane()
  const cx = P.sx(x), cy = P.sy(y)
  return (
    <g className="animate-pop">
      {star ? <path d={`M${cx} ${cy - 11} L${cx + 3.5} ${cy - 3.5} L${cx + 11} ${cy - 3} L${cx + 5} ${cy + 2.5} L${cx + 7} ${cy + 10} L${cx} ${cy + 6} L${cx - 7} ${cy + 10} L${cx - 5} ${cy + 2.5} L${cx - 11} ${cy - 3} L${cx - 3.5} ${cy - 3.5} Z`} fill={color} stroke="#fff" strokeWidth={2} /> : <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={2.5} />}
      {label && <text x={cx + 10} y={cy - 10} fontSize={13} fontWeight={900} fill={color} style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 4 }}>{label}</text>}
    </g>
  )
}

/** Doğru üzerinde iki parmak: döndür (eğim), tek parmak: yukarı-aşağı kaydır (b). Pivot verilirse o noktanın çevresinde döner. */
function RotLine({ m, b, onChange, mStep = 1, bStep = 1, pivotX = 0, color = '#7c3aed', mRange = [-30, 60], bRange = [-200, 1000], noMove }: { m: number; b: number; onChange: (m: number, b: number) => void; mStep?: number; bStep?: number; pivotX?: number; color?: string; mRange?: [number, number]; bRange?: [number, number]; noMove?: boolean }) {
  const P = usePlane()
  const pxX = P.width / (P.view.xMax - P.view.xMin)
  const pxY = P.height / (P.view.yMax - P.view.yMin)
  const acc = useRef({ ang: 0, dy: 0, m, b })
  const x0 = Math.max(0, P.view.xMin), x1 = P.view.xMax
  const rotate = (deg: number) => {
    const a = acc.current
    if (a.m !== m || a.b !== b) Object.assign(a, { m, b, ang: Math.atan((m * pxY) / pxX), dy: 0 })
    a.ang = clamp(a.ang - (deg * Math.PI) / 180, -1.5, 1.5)
    const nm = clamp(Math.round(((Math.tan(a.ang) * pxX) / pxY) / mStep) * mStep, mRange[0], mRange[1])
    if (nm !== m) {
      const yp = m * pivotX + b
      const nb = Math.round((yp - nm * pivotX) * 1000) / 1000
      a.m = nm
      a.b = nb
      onChange(nm, nb)
    }
  }
  const move = (_dx: number, dyU: number) => {
    if (noMove) return
    const a = acc.current
    if (a.m !== m || a.b !== b) Object.assign(a, { m, b, ang: Math.atan((m * pxY) / pxX), dy: 0 })
    a.dy += (dyU * P.unitPx) / pxY
    const steps = Math.trunc(a.dy / bStep)
    if (steps) {
      a.dy -= steps * bStep
      const nb = clamp(b + steps * bStep, bRange[0], bRange[1])
      a.b = nb
      onChange(m, nb)
    }
  }
  return (
    <Pinchable onRotate={rotate} onMove={move}>
      <line x1={P.sx(x0)} y1={P.sy(m * x0 + b)} x2={P.sx(x1)} y2={P.sy(m * x1 + b)} stroke="transparent" strokeWidth={46} />
      <line x1={P.sx(x0)} y1={P.sy(m * x0 + b)} x2={P.sx(x1)} y2={P.sy(m * x1 + b)} stroke={color} strokeWidth={5} strokeLinecap="round" />
    </Pinchable>
  )
}

/** Denklem kartı: renkli m ve b */
function Equation({ look, m, b, mText = 'eğim (m)', bText = 'başlangıç (b)', hideM, hideB, xName = 'x' }: { look: Look; m: number | null; b: number | null; mText?: string; bText?: string; hideM?: boolean; hideB?: boolean; xName?: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${look.soft}`}>
      <p className={`text-3xl font-black tabular-nums ${look.strong}`}>
        y = <span className="text-violet-400">{hideM || m === null ? '□' : fmtN(m)}</span>·{xName} + <span className="text-amber-400">{hideB || b === null ? '□' : fmtN(b)}</span>
      </p>
      <p className={`mt-1 text-xs font-bold ${look.muted}`}><span className="text-violet-400">■</span> {mText} · <span className="text-amber-400">■</span> {bText}</p>
    </div>
  )
}

function NumPad({ look, value, onChange, onOk }: { look: Look; value: string; onChange: (v: string) => void; onOk: () => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map((k, i) => (k ? (
        <button key={i} type="button" onClick={() => onChange(k === '⌫' ? value.slice(0, -1) : (value + k).slice(0, 4))} className={`h-12 rounded-xl text-xl font-black active:scale-95 ${look.key}`} aria-label={k === '⌫' ? 'Sil' : k}>{k === '⌫' ? <Delete className="mx-auto" size={20} /> : k}</button>
      ) : <span key={i} />))}
      <button type="button" onClick={onOk} disabled={!value} className="btn-primary col-span-3 h-12 text-base"><Check size={18} />Yaz</button>
    </div>
  )
}

// ───────────────────────── build ─────────────────────────

const TAXI = { m: 8, b: 20 }
const BX = [0, 1, 2, 3, 5]
function BuildTask({ look, onDone }: { look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [ys, setYs] = useState<(number | null)[]>(BX.map(() => null))
  const [sel, setSel] = useState(0)
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState<'table' | 'shape' | 'eq' | 'done'>('table')
  const [m, setM] = useState(1)
  const [b, setB] = useState(0)
  const misses = useRef(0)
  const target = (x: number) => TAXI.m * x + TAXI.b
  const write = () => {
    const v = Number(typed)
    const x = BX[sel]
    setTyped('')
    track.attempt(v === target(x))
    if (v !== target(x)) {
      misses.current++
      const mis = v === TAXI.m * x ? 'Açılış ücretini (başlangıç değerini) eklemedi' : v === (TAXI.m + TAXI.b) * x ? 'Açılış ücretini her kilometrede yeniden ekledi' : undefined
      fb.say(x === 0 ? 'Taksiye bindin ama hiç yol gitmedin. Taksimetre kaç TL gösterir?' : mis === 'Açılış ücretini (başlangıç değerini) eklemedi' ? `${x} km için ${x} × 8 = ${8 * x} TL yol ücreti tuttu. Taksiye binerken ödenen açılış ücreti nerede?` : mis ? 'Açılış ücreti her kilometrede mi ödenir, yalnız binerken bir kez mi?' : `${x} km: açılış ücreti + ${x} tane 8 TL. Kaç eder?`, { mis })
      return
    }
    sfx.ok()
    fb.clear()
    const ny = ys.map((y, i) => (i === sel ? v : y))
    setYs(ny)
    const nx = ny.findIndex((y) => y === null)
    if (nx >= 0) setSel(nx)
    else { setPhase('shape'); fb.say('Tablo tamam! Grafikteki noktalara bak.', { tone: 'ok' }) }
  }
  const setLine = (nm: number, nb: number) => {
    setM(nm)
    setB(nb)
    if (phase === 'eq' && nm === TAXI.m && nb === TAXI.b) {
      sfx.ok()
      track.attempt(true)
      track.item(misses.current === 0)
      setPhase('done')
      fb.say('Doğru tüm noktalardan geçiyor: y = 8x + 20. Eğim (8) her kilometrede artan ücret, 20 ise doğrunun y eksenini kestiği yer: açılış ücreti!', { tone: 'ok' })
    }
  }
  return (
    <Work
      scene={
        <Scene grade={8}>
          <div className="grid gap-3 md:grid-cols-[170px_1fr]">
            <table className={`h-fit w-full overflow-hidden rounded-2xl text-center text-lg font-black tabular-nums ring-1 ${look.dark ? 'ring-slate-600' : 'ring-line'}`}>
              <thead><tr className={look.dark ? 'bg-slate-700' : 'bg-violet-50'}><th className="py-2">km (x)</th><th>TL (y)</th></tr></thead>
              <tbody>
                {BX.map((x, i) => (
                  <tr key={x} className={`border-t ${look.dark ? 'border-slate-700' : 'border-line'}`}>
                    <td className="py-1.5">{x}</td>
                    <td className="p-1">
                      <button type="button" disabled={phase !== 'table' || ys[i] !== null} onClick={() => { setSel(i); setTyped('') }} className={`h-11 w-full rounded-xl font-black ${ys[i] !== null ? 'text-emerald-400' : sel === i ? 'bg-amber-400 text-slate-900' : look.key}`}>{ys[i] ?? (sel === i ? typed || '?' : '?')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="min-w-0">
              <Graph xMax={10} yMax={110} xLabel="km" yLabel="TL">
                {(phase === 'eq' || phase === 'done') && <RotLine m={m} b={b} onChange={setLine} />}
                {ys.map((y, i) => y !== null && <Dot key={i} x={BX[i]} y={y} label={phase === 'table' ? `(${BX[i]}, ${y})` : undefined} />)}
              </Graph>
            </div>
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'table' ? 'Tabloyu doldur' : phase === 'shape' ? 'Ne görüyorsun?' : 'Denklemi kur'} icon="🚕">
          {phase === 'table' && (
            <>
              <p className={`mb-2 text-[15px] font-semibold ${look.muted}`}><b className={look.strong}>{BX[sel]} km</b> yolculuk kaç TL tutar?</p>
              <NumPad look={look} value={typed} onChange={setTyped} onOk={write} />
            </>
          )}
          {phase === 'shape' && (
            <Ask look={look} q="Noktalar nasıl bir yol izliyor?" opts={[
              { t: 'Hepsi aynı doğru üzerinde: her km’de 8 TL artıyor.', ok: true },
              { t: 'Gittikçe dikleşen bir eğri üzerinde.', ok: false, why: 'Ardışık km’ler arasında ücret ne kadar artıyor? 0→1, 1→2, 2→3… Artış değişiyor mu?' },
              { t: 'Belli bir düzen yok.', ok: false, why: 'Tablodaki TL değerleri her km’de kaçar artıyor?' },
            ]} onRight={() => { sfx.ok(); setPhase('eq'); fb.say('Evet! Şimdi doğruyu çiz: m ve b’yi değiştir ya da doğruyu iki parmakla döndür, tek parmakla yukarı-aşağı kaydır.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; fb.say(o.why!) }} />
          )}
          {(phase === 'eq' || phase === 'done') && (
            <>
              <Equation look={look} m={m} b={b} mText="km başına ücret" bText="açılış ücreti" />
              {phase === 'eq' && (
                <div className="mt-3 flex justify-center gap-3">
                  <Stepper look={look} label="m" value={m} min={0} max={20} onChange={(v) => setLine(v, b)} compact />
                  <Stepper look={look} label="b" value={b} min={0} max={60} step={5} onChange={(v) => setLine(m, v)} compact />
                </div>
              )}
            </>
          )}
          {fb.node}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Denklemi kurarken önce neyi buldun?" options={['Tablodaki artışı (eğim)', 'x = 0’daki değeri (b)', 'Doğruyu noktalara oturttum', 'Bağlamdan (açılış ücreti, km ücreti)']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}

function Ask({ look, q, opts, onRight, onWrong }: { look: Look; q: string; opts: { t: string; ok: boolean; why?: string; mis?: string }[]; onRight: () => void; onWrong: (o: { t: string; why?: string; mis?: string }) => void }) {
  const [wrong, setWrong] = useState<string[]>([])
  const list = useMemo(() => shuffle(opts), [q])
  const track = useTracker()
  return (
    <div className="mt-2">
      <p className="mb-2 font-black"><MathText text={q} /></p>
      <div className="grid gap-2">
        {list.map((o) => <Choice key={o.t} look={look} text={o.t} state={wrong.includes(o.t) ? 'wrong' : 'idle'} disabled={wrong.includes(o.t)} onClick={() => { track.attempt(o.ok); if (o.ok) onRight(); else { setWrong((w) => [...w, o.t]); onWrong(o) } }} />)}
      </div>
    </div>
  )
}

// ───────────────────────── fit ─────────────────────────

function FitTask({ look, onDone }: { look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [pA, setPA] = useState({ x: 1, y: 60 })
  const [pB, setPB] = useState({ x: 6, y: 120 })
  const [phase, setPhase] = useState<'fit' | 'b' | 'm' | 'done'>('fit')
  const misses = useRef(0)
  const dx = pB.x - pA.x
  const m = dx ? (pB.y - pA.y) / dx : null
  const b = m !== null ? pA.y - m * pA.x : null
  const on = (x: number, y: number) => m !== null && b !== null && Math.abs(m * x + b - y) < 1e-6
  const fits = on(2, 150) && on(5, 300)
  const snap = (p: { x: number; y: number }) => ({ x: clamp(Math.round(p.x), 0, 8), y: clamp(Math.round(p.y / 10) * 10, 0, 500) })
  const upd = (which: 'a' | 'b', p: { x: number; y: number }) => {
    const s = snap(p)
    if (which === 'a') setPA(s)
    else setPB(s)
  }
  useEffect(() => {
    if (phase !== 'fit' || !fits) return
    sfx.ok()
    track.strategy('Doğruyu iki veri noktasına oturttu')
    setPhase('b')
    fb.say('Doğru iki faturadan da geçiyor! Denklem, sen sürükledikçe kendini yazdı. Şimdi tarifeyi çöz.', { tone: 'ok' })
  }, [fits, phase, fb, track])
  const rows = [0, 1, 2, 3, 4, 5, 6]
  return (
    <Work
      scene={
        <Scene grade={8}>
          <Graph xMax={8} yMax={480} xLabel="ay" yLabel="TL">
            {m !== null && b !== null && <LineG m={m} b={b} color={fits ? '#16a34a' : '#7c3aed'} />}
            <Dot x={2} y={150} star color="#f59e0b" label="2 ay: 150 TL" />
            <Dot x={5} y={300} star color="#f59e0b" label="5 ay: 300 TL" />
            {phase === 'fit' ? (
              <>
                <DragPoint x={pA.x} y={pA.y} label="P" color="#db2777" onChange={(p) => upd('a', p)} />
                <DragPoint x={pB.x} y={pB.y} label="Q" color="#db2777" onChange={(p) => upd('b', p)} />
              </>
            ) : (
              phase !== 'b' && b !== null && <Dot x={0} y={b} color="#f59e0b" label={`b = ${fmtN(b)}`} />
            )}
          </Graph>
          <div className="mt-3 overflow-x-auto">
            <table className={`w-full text-center font-black tabular-nums ${look.strong}`}>
              <tbody>
                <tr className={look.dark ? 'bg-slate-700' : 'bg-violet-50'}><th className="px-2 py-1.5 text-left text-xs">ay (x)</th>{rows.map((x) => <td key={x}>{x}</td>)}</tr>
                <tr><th className="px-2 py-1.5 text-left text-xs">TL (y)</th>{rows.map((x) => <td key={x} className={x === 2 || x === 5 ? 'text-amber-400' : ''}>{m !== null && b !== null ? fmtN(m * x + b, 1) : '—'}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'fit' ? 'Doğruyu kur' : 'Tarifeyi çöz'} icon="📱">
          <div className={`rounded-2xl p-3 text-center text-2xl font-black ${look.soft} ${look.strong}`}><MathText text={m !== null && b !== null ? eq(Math.round(m * 100) / 100, Math.round(b * 100) / 100) : 'dikey doğru'} /></div>
          {phase === 'fit' && <p className={`mt-2 text-[15px] font-semibold ${look.muted}`}>Pembe P ve Q noktalarını sürükle: doğru iki yıldızdan (faturalardan) da geçsin. Tablo ve denklem kendiliğinden değişir.</p>}
          {phase === 'b' && (
            <Ask look={look} q="Tarifenin sabit (başlangıç) ücreti kaç TL?" opts={[
              { t: '50 TL', ok: true },
              { t: '75 TL', ok: false, why: '150 ÷ 2 = 75, ayda 75 TL demek olurdu; o zaman 5 ayda kaç TL ederdi? 300 mü?', mis: 'Doğrusal (başlangıçlı) ilişkiyi orantılı ilişki gibi düşündü (y ÷ x)' },
              { t: '0 TL', ok: false, why: 'Doğru y eksenini nerede kesiyor? Tabloda 0. ayın değeri ne?' },
            ]} onRight={() => { sfx.ok(); setPhase('m'); fb.say('Evet! 0. aydaki değer, doğrunun y eksenini kestiği nokta: b = 50.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {phase === 'm' && (
            <Ask look={look} q="Fatura her ay kaç TL artıyor?" opts={[
              { t: '50 TL', ok: true },
              { t: '75 TL', ok: false, why: '2. aydan 5. aya fatura ne kadar arttı? Bu artış kaç aya yayıldı?', mis: 'Değişim oranı yerine y ÷ x oranını kullandı' },
              { t: '60 TL', ok: false, why: '300 ÷ 5 = 60 sabit ücreti de içeriyor. 2. aydan 5. aya artışa bak: (300 − 150) ÷ (5 − 2) = ?', mis: 'Değişim oranı yerine y ÷ x oranını kullandı' },
            ]} onRight={() => { sfx.ok(); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! (300 − 150) ÷ (5 − 2) = 50. Eğim: her ay 50 TL artış. Denklem: y = 50x + 50.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {fb.node}
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── change ─────────────────────────

const ROUNDS = [
  { say: 'Şirket km ücretini 8 TL’den 12 TL’ye çıkardı; açılış ücreti hâlâ 20 TL.', m: 12, b: 20, opts: [
    { t: 'Doğru daha dik olur ama yine 20’den başlar.', ok: true },
    { t: 'Doğru yukarı kayar, dikliği aynı kalır.', ok: false, why: 'Hangi sayı değişti: her km’de eklenen mi, başlangıçta ödenen mi? Doğrunun dikliğini hangisi belirler?', mis: 'Eğim ile y-kesişimini karıştırdı' },
    { t: 'Doğru daha yatık olur.', ok: false, why: 'Km ücreti artınca her km’de ücret daha hızlı mı, daha yavaş mı artar?' },
  ] },
  { say: 'Km ücreti yine 8 TL oldu ama açılış ücreti 20 TL’den 35 TL’ye çıktı.', m: 8, b: 35, opts: [
    { t: 'Doğru 15 TL yukarı kayar, ilk doğruya paralel kalır.', ok: true },
    { t: 'Doğru daha dik olur.', ok: false, why: 'Km başına ücret değişti mi? Her km’de artış aynıysa diklik değişir mi?', mis: 'Eğim ile y-kesişimini karıştırdı' },
    { t: 'Doğru aynı kalır, yalnız sayılar değişir.', ok: false, why: '0 km’de taksimetre şimdi kaç TL gösteriyor? Grafikte bu nokta nerede?' },
  ] },
]
function ChangeTask({ look, onDone }: { look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [r, setR] = useState(0)
  const [phase, setPhase] = useState<'predict' | 'try' | 'ok'>('predict')
  const [m, setM] = useState(8)
  const [b, setB] = useState(20)
  const misses = useRef(0)
  const R = ROUNDS[r]
  const setLine = (nm: number, nb: number) => {
    setM(nm)
    setB(nb)
    if (phase === 'try' && nm === R.m && nb === R.b) {
      sfx.ok()
      track.attempt(true)
      setPhase('ok')
      fb.say(r === 0 ? 'Eğim 8’den 12’ye çıktı: doğru dikleşti, y eksenini yine 20’de kesiyor.' : 'b 20’den 35’e çıktı: doğru 15 birim yukarı kaydı, eğim aynı olduğu için iki doğru paralel.', { tone: 'ok' })
    }
  }
  return (
    <Work
      scene={
        <Scene grade={8}>
          <Graph xMax={10} yMax={160} xLabel="km" yLabel="TL">
            <LineG m={8} b={20} color="#94a3b8" dash="8 6" w={3} label="eski: y = 8x + 20" />
            {r === 1 && <LineG m={12} b={20} color="#cbd5e1" dash="3 6" w={2} />}
            {phase !== 'predict' && <RotLine m={m} b={b} onChange={setLine} bStep={5} />}
          </Graph>
          <p className={`mt-1 text-center text-sm font-bold ${look.muted}`}>Doğrunun üstünde iki parmakla döndür (eğim), tek parmakla yukarı-aşağı kaydır (b).</p>
        </Scene>
      }
      panel={
        <Panel look={look} title={`${r + 1}. değişiklik`} icon="🔄">
          <p className={`text-[15px] font-semibold ${look.strong}`}>{R.say}</p>
          {phase === 'predict' && <Ask key={r} look={look} q="Tahminin: doğru nasıl değişir?" opts={R.opts} onRight={() => { sfx.ok(); setPhase('try'); fb.say('Şimdi grafikte dene: yeni tarifenin doğrusunu oluştur.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; setPhase('try'); fb.say(`${o.why} Grafikte deneyerek gör.`, { mis: o.mis }) }} />}
          {phase !== 'predict' && (
            <>
              <div className="mt-2"><Equation look={look} m={m} b={b} mText="km başına ücret" bText="açılış ücreti" /></div>
              {phase === 'try' && (
                <div className="mt-3 flex justify-center gap-3">
                  <Stepper look={look} label="m" value={m} min={0} max={20} onChange={(v) => setLine(v, b)} compact />
                  <Stepper look={look} label="b" value={b} min={0} max={60} step={5} onChange={(v) => setLine(m, v)} compact />
                </div>
              )}
            </>
          )}
          {fb.node}
          {phase === 'ok' && (r === 0 ? <NextButton label="Sonraki değişiklik" onClick={() => { setR(1); setPhase('predict'); fb.clear() }} /> : <NextButton onClick={() => { track.item(misses.current === 0); onDone({ first: misses.current === 0 }) }} />)}
        </Panel>
      }
    />
  )
}

// ───────────────────────── compare ─────────────────────────

const PA = { m: 10, b: 60 }, PB = { m: 18, b: 20 }
function CompareTask({ look, onDone }: { look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [x, setX] = useState(1)
  const [phase, setPhase] = useState<'find' | 'after' | 'done'>('find')
  const misses = useRef(0)
  const a = PA.m * x + PA.b, bb = PB.m * x + PB.b
  const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  const claim = () => {
    const ok = x === 5
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setPhase('after')
      fb.say('Evet! 5. ayda ikisi de 110 TL: 60 + 10·5 = 20 + 18·5. Grafikte doğrular burada kesişiyor.', { tone: 'ok' })
    } else {
      misses.current++
      fb.say(`${ek(x, 'loc')} A ${fmtN(a)} TL, B ${fmtN(bb)} TL. Fark ${fmtN(Math.abs(a - bb))} TL. Her ay fark kaç TL kapanıyor? ${bb < a ? 'Daha ileri' : 'Daha geri'} git.`)
    }
  }
  return (
    <Work
      scene={
        <Scene grade={8}>
          <Graph xMax={8} yMax={200} xLabel="ay" yLabel="TL" onTap={(p) => setX(clamp(Math.round(p.x), 0, 8))}>
            <LineG m={PA.m} b={PA.b} color="#0891b2" label="A" />
            <LineG m={PB.m} b={PB.b} color="#db2777" label="B" />
            <CursorG x={x} a={a} b={bb} />
            <DragPoint x={x} y={0} color="#f59e0b" label={`${x}. ay`} onChange={(p) => setX(clamp(Math.round(p.x), 0, 8))} constrain={(p) => ({ x: p.x, y: 0 })} />
          </Graph>
          <div className="mt-3 overflow-x-auto">
            <table className={`w-full text-center font-black tabular-nums ${look.strong}`}>
              <tbody>
                <tr className={look.dark ? 'bg-slate-700' : 'bg-violet-50'}><th className="px-2 py-1 text-left text-xs">ay</th>{rows.map((r) => <td key={r}><button type="button" onClick={() => setX(r)} className={`h-10 w-full min-w-9 rounded-lg ${r === x ? 'bg-amber-400 text-slate-900' : ''}`}>{r}</button></td>)}</tr>
                <tr><th className="px-2 py-1 text-left text-xs text-cyan-500">A</th>{rows.map((r) => <td key={r} className={r === x ? 'text-amber-400' : ''}>{PA.m * r + PA.b}</td>)}</tr>
                <tr><th className="px-2 py-1 text-left text-xs text-pink-500">B</th>{rows.map((r) => <td key={r} className={r === x ? 'text-amber-400' : ''}>{PB.m * r + PB.b}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'find' ? 'Ne zaman eşitler?' : 'Sonra ne olur?'} icon="🏁">
          <div className={`grid gap-1 rounded-2xl p-3 text-lg font-black ${look.soft}`}>
            <span className="text-cyan-500"><MathText text={`A: y = 10x + 60 → ${a}`} /></span>
            <span className="text-pink-500"><MathText text={`B: y = 18x + 20 → ${bb}`} /></span>
          </div>
          {phase === 'find' && (
            <>
              <p className={`mt-2 text-[15px] font-semibold ${look.muted}`}>Turuncu imleci sürükle, grafiğe ya da tablodaki aya dokun. İki tarife hangi ayda eşit?</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={claim}><Check size={20} />{x}. ayda eşitler</button>
            </>
          )}
          {phase === 'after' && (
            <Ask look={look} q="Bir yıllık sözleşme yapacak biri hangi tarifeyi seçmeli?" opts={[
              { t: 'A: 5. aydan sonra B daha pahalı, çünkü B her ay daha çok artıyor.', ok: true },
              { t: 'B: başlangıç ücreti daha düşük.', ok: false, why: '12. ayda iki tarife kaç TL tutar? Başlangıç mı, aylık artış mı daha etkili oluyor?', mis: 'Uzun dönemde eğimin, başlangıç değerinden daha belirleyici olduğunu fark etmedi' },
              { t: 'Fark etmez, 5. ayda eşitler.', ok: false, why: 'Eşitlik yalnız 5. ayda. 6. aydan sonra grafiğe bak: hangi doğru üstte?' },
            ]} onRight={() => { sfx.ok(); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! Kesişimden sonra eğimi büyük olan doğru (B) üstte kalır.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {fb.node}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Eşit oldukları ayı nasıl buldun?" options={['Tabloya bakarak', 'Grafikte kesişimden', 'Farkın her ay 8 TL kapandığını düşünerek', 'Denklem kurarak: 10x + 60 = 18x + 20']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}
function CursorG({ x, a, b }: { x: number; a: number; b: number }) {
  const P = usePlane()
  return (
    <g>
      <line x1={P.sx(x)} x2={P.sx(x)} y1={P.sy(0)} y2={P.sy(Math.max(a, b))} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
      <circle cx={P.sx(x)} cy={P.sy(a)} r={7} fill="#0891b2" stroke="#fff" strokeWidth={2} />
      <circle cx={P.sx(x)} cy={P.sy(b)} r={7} fill="#db2777" stroke="#fff" strokeWidth={2} />
    </g>
  )
}

// ───────────────────────── linear ─────────────────────────

const TABLES = [
  { xs: [0, 1, 2, 3], ys: [5, 8, 11, 14], lin: true, why: 'x her seferinde 1 artarken y her seferinde 3 artıyor: sabit değişim.' },
  { xs: [1, 2, 3, 4], ys: [2, 4, 8, 16], lin: false, why: 'y’ler 2, 4, 8 artıyor; artış sabit değil (her seferinde ikiye katlanıyor).' },
  { xs: [0, 2, 4, 6], ys: [3, 4, 5, 6], lin: true, why: 'x 2’şer artarken y 1’er artıyor: her x adımında aynı artış, yani doğrusal (eğim [[1/2]]).', mis: 'x değerlerinin artış miktarını hesaba katmadan doğrusallığa karar verdi' },
  { xs: [1, 2, 3, 4], ys: [1, 4, 9, 16], lin: false, why: 'y’ler 3, 5, 7 artıyor; artış sabit değil, noktalar bir eğri üzerinde.' },
]
function MiniPlot({ t, look }: { t: (typeof TABLES)[number]; look: Look }) {
  const W = 160, H = 110, mx = 7, my = Math.max(...t.ys) * 1.1
  const sx = (x: number) => 14 + (x / mx) * (W - 22), sy = (y: number) => H - 12 - (y / my) * (H - 22)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-label="Noktalar">
      <line x1={14} x2={W - 4} y1={H - 12} y2={H - 12} stroke={look.dark ? '#64748b' : '#94a3b8'} strokeWidth={1.5} />
      <line x1={14} x2={14} y1={6} y2={H - 12} stroke={look.dark ? '#64748b' : '#94a3b8'} strokeWidth={1.5} />
      {t.xs.map((x, i) => <circle key={i} cx={sx(x)} cy={sy(t.ys[i])} r={5} fill="#7c3aed" stroke="#fff" strokeWidth={1.5} />)}
    </svg>
  )
}
function LinearTask({ look, onDone }: { look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [ans, setAns] = useState<Record<number, boolean>>({})
  const [shown, setShown] = useState<Record<number, boolean>>({})
  const [wrong, setWrong] = useState<string[]>([])
  const misses = useRef(0)
  const pick = (i: number, lin: boolean) => {
    const t = TABLES[i]
    const ok = t.lin === lin
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      const na = { ...ans, [i]: lin }
      setAns(na)
      setShown((s) => ({ ...s, [i]: true }))
      fb.say(t.why, { tone: 'ok' })
      if (Object.keys(na).length === TABLES.length) track.item(misses.current === 0)
    } else {
      misses.current++
      setWrong((w) => [...w, `${i}${lin}`])
      fb.say(lin ? 'Ardışık y değerleri arasındaki farkları hesapla. Hep aynı mı?' : 'x değerleri kaçar artıyor? Aynı x adımında y hep aynı miktar artıyor mu? Noktaları grafikte göster ve bak.', { mis: (t as { mis?: string }).mis })
    }
  }
  const done = Object.keys(ans).length === TABLES.length
  return (
    <Work
      scene={
        <Scene grade={8}>
          <div className="grid gap-3 sm:grid-cols-2">
            {TABLES.map((t, i) => (
              <div key={i} className={`rounded-2xl p-3 ${look.soft}`}>
                <table className={`w-full text-center font-black tabular-nums ${look.strong}`}>
                  <tbody>
                    <tr className={look.dark ? 'bg-slate-700' : 'bg-violet-50'}><th className="w-8 text-xs">x</th>{t.xs.map((x) => <td key={x} className="py-1">{x}</td>)}</tr>
                    <tr><th className="text-xs">y</th>{t.ys.map((y, k) => <td key={k} className="py-1">{y}</td>)}</tr>
                  </tbody>
                </table>
                {shown[i] ? <MiniPlot t={t} look={look} /> : <button type="button" onClick={() => setShown((s) => ({ ...s, [i]: true }))} className={`mt-2 min-h-11 w-full rounded-xl text-sm font-extrabold ${look.key}`}>Noktaları grafikte göster</button>}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[true, false].map((l) => <Choice key={String(l)} look={look} className="!text-center !text-sm" text={l ? 'Doğrusal' : 'Doğrusal değil'} state={ans[i] === l ? 'right' : wrong.includes(`${i}${l}`) ? 'wrong' : ans[i] !== undefined ? 'dim' : 'idle'} disabled={ans[i] !== undefined || wrong.includes(`${i}${l}`)} onClick={() => pick(i, l)} />)}
                </div>
              </div>
            ))}
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title="Doğrusal mı?" icon="🔎">
          <p className={`text-[15px] font-semibold ${look.muted}`}>Her tablo için karar ver. Tablodaki artışlara ya da grafikteki noktalara bakabilirsin.</p>
          {fb.node}
          {done && (
            <>
              <StrategyPicker question="Neye bakarak karar verdin?" options={['y’deki artışlara', 'x ve y artışlarının oranına', 'Grafikteki noktalara', 'Hepsine']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}

// ───────────────────────── many ─────────────────────────

const PALETTE = ['#7c3aed', '#0891b2', '#db2777', '#16a34a', '#ea580c', '#0d9488']
function ManyTask({ look, onDone }: { look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const [m, setM] = useState(5)
  const [b, setB] = useState(40)
  const [saved, setSaved] = useState<{ m: number; b: number }[]>([])
  const misses = useRef(0)
  const need = 3
  const through = m * 4 + b === 60
  const save = () => {
    track.attempt(through)
    if (!through) {
      misses.current++
      fb.say(`Bu tarifede 4. ay: ${fmtN(m)} · 4 + ${fmtN(b)} = ${fmtN(m * 4 + b)} TL. 60 TL olması için m büyürse b ne olmalı?`, { mis: 'Bir noktadan geçen doğrunun m ve b değerlerini ilişkilendirmedi' })
      return
    }
    if (b < 0) return fb.say('Başlangıç ücreti eksi olabilir mi? Gerçek bir tarife düşün.')
    const fresh = sols.add(`${m}/${b}`, eq(m, b))
    if (!fresh) return fb.say('Bu tarifeyi zaten tasarladın. Doğruyu döndürerek başka bir tarife bul.')
    setSaved((s) => [...s, { m, b }])
    const n = sols.list.length + 1
    if (n === need) track.item(misses.current === 0)
    fb.say(n >= need ? 'Harika! Bir noktadan sonsuz doğru geçer. Eğim büyüdükçe başlangıç ücreti küçülüyor: m · 4 + b = 60.' : `Güzel bir tarife: ${eq(m, b)}. Bir tane daha!`, { tone: 'ok' })
  }
  return (
    <Work
      scene={
        <Scene grade={8}>
          <Graph xMax={8} yMax={120} xLabel="ay" yLabel="TL">
            {saved.map((s, i) => <LineG key={i} m={s.m} b={s.b} color={PALETTE[(i + 1) % PALETTE.length]} w={2.5} dash="2 0" />)}
            <RotLine m={m} b={b} pivotX={through ? 4 : 0} noMove={false} onChange={(nm, nb) => { setM(nm); setB(Math.round(nb)) }} mRange={[0, 15]} bRange={[0, 120]} bStep={5} />
            <Dot x={4} y={60} star color="#f59e0b" label="(4, 60)" />
            <Dot x={0} y={b} color="#f59e0b" r={5} />
          </Graph>
          <p className={`mt-1 text-center text-sm font-bold ${look.muted}`}>Doğru (4, 60)’tan geçerken iki parmakla döndürürsen o noktanın çevresinde döner.</p>
        </Scene>
      }
      panel={
        <Panel look={look} title="Tarife tasarımcısı" icon="🎨">
          <Equation look={look} m={m} b={b} mText="aylık ücret" bText="başlangıç ücreti" />
          <p className={`mt-2 text-center font-black ${through ? 'text-emerald-500' : 'text-amber-500'}`}><MathText text={`4. ay: ${fmtN(m)} · 4 + ${fmtN(b)} = ${fmtN(4 * m + b)} TL`} /></p>
          <div className="mt-2 flex justify-center gap-3">
            <Stepper look={look} label="m" value={m} min={0} max={15} onChange={setM} compact />
            <Stepper look={look} label="b" value={b} min={0} max={120} step={4} onChange={setB} compact />
          </div>
          {sols.list.length < need && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Sparkles size={20} />Tarifeyi kaydet</button>}
          {fb.node}
          <SolutionList list={sols.list} goal={need} />
          {sols.list.length >= need && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function DogrusalIliski({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const [i, setI] = useState(0)
  const firsts = useRef(0)
  const t = TASKS[i]
  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (i + 1 < TASKS.length) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    onFinish({
      summary: `${TASKS.length} görevde tablo, grafik ve denklemi birbirine bağladın.`,
      insight: 'Doğrusal ilişkide x her adımda aynı miktar artınca y de hep aynı miktar artar. Bu sabit artış eğimdir (m): grafikte doğrunun dikliği, denklemde x’in katsayısı. b ise x = 0 iken değerdir: doğrunun y eksenini kestiği nokta. İki doğrunun kesişimi, iki durumun eşit olduğu andır.',
      stars: starsBy(firsts.current, TASKS.length),
    })
  }
  let body: ReactNode
  switch (t.kind) {
    case 'build': body = <BuildTask key={i} look={look} onDone={done} />; break
    case 'fit': body = <FitTask key={i} look={look} onDone={done} />; break
    case 'change': body = <ChangeTask key={i} look={look} onDone={done} />; break
    case 'compare': body = <CompareTask key={i} look={look} onDone={done} />; break
    case 'linear': body = <LinearTask key={i} look={look} onDone={done} />; break
    case 'many': body = <ManyTask key={i} look={look} onDone={done} />; break
  }
  return (
    <LastTask.Provider value={i === TASKS.length - 1}>
      <TopBar look={look} step={i} total={TASKS.length} title={t.title} emoji={t.emoji} />
      {body}
    </LastTask.Provider>
  )
}

