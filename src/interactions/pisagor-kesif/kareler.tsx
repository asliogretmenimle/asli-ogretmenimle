import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Plus, RotateCcw } from 'lucide-react'
import { DragPoint, Pinchable, Plane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, GhostButton, Nudge, Prompt, Split, Stepper, useChecks, type Pt } from '../donusum-studyosu/ortak'
import { COL, Poly, RightMark, Tag, rootText, type Common } from './parca'

/* ───────────────────────── 1. Kenarlardaki kareler ───────────────────────── */

type Row = { a: number; b: number }
const PREDICT = [
  { id: 'sum', label: 'İki küçük karenin toplamı kadar' },
  { id: 'more', label: 'İkisinin toplamından fazla' },
  { id: 'less', label: 'İkisinin toplamından az' },
] as const
const CONCLUDE = [
  { id: 'sum', label: <MathText text="c^{2} = a^{2} + b^{2}" />, sub: 'Büyük kare = iki küçük karenin toplamı' },
  { id: 'side', label: <MathText text="c = a + b" />, sub: 'Hipotenüs = iki dik kenarın toplamı' },
  { id: 'diff', label: <MathText text="c^{2} = b^{2} − a^{2}" />, sub: 'Büyük kare = farkları' },
] as const

export function SquaresTask({ footer, onSolved, sol }: Common) {
  const [phase, setPhase] = useState<'predict' | 'explore' | 'conclude' | 'done'>('predict')
  const [guess, setGuess] = useState<string | null>(null)
  const [a, setA] = useState(2)
  const [b, setB] = useState(4)
  const [decomp, setDecomp] = useState(false)
  const [seen, setSeen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [pick, setPick] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const track = useTracker()
  const pinch = useRef<{ a0: number; b0: number; f: number } | null>(null)
  const c2 = a * a + b * b
  const key = `${Math.min(a, b)}-${Math.max(a, b)}`
  const have = rows.some((r) => `${Math.min(r.a, r.b)}-${Math.max(r.a, r.b)}` === key)

  const setLegs = (na: number, nb: number) => {
    setA(Math.max(1, Math.min(6, na)))
    setB(Math.max(1, Math.min(6, nb)))
    setFb(null)
  }
  const save = () => {
    if (!seen) {
      setFb({ ok: false, text: 'Eğik karenin alanı kaç birimkare? Önce “Eğik kareyi say” ile onu çevreleyen büyük kareye bak.' })
      return
    }
    if (have) {
      setFb({ ok: false, text: 'Bu üçgen tabloda zaten var. Dik kenarlardan birini değiştir: büyük kare de değişiyor mu?' })
      return
    }
    sol.add(`sq-${key}`, `a = ${a}, b = ${b}`)
    const next = [...rows, { a, b }]
    setRows(next)
    setFb(next.length >= 3 ? null : { ok: true, text: next.length === 1 ? 'Kaydedildi! Şimdi bambaşka bir dik üçgen kur.' : 'Bir üçgen daha: tabloda bir örüntü görüyor musun?' })
  }
  const check = () => {
    if (pick === 'sum') {
      const first = chk.pass()
      onSolved(first)
      setPhase('done')
      setFb({ ok: true, text: `Evet! Her satırda a² + b² = c². ${guess === 'sum' ? 'Tahminin de buydu — artık kanıtın var.' : 'Başta farklı tahmin etmiştin; ölçümler fikrini değiştirdi. Bilim insanları da böyle çalışır!'}` })
      return
    }
    chk.fail()
    const r = rows[0]
    if (pick === 'side') setFb({ ok: false, mis: 'Pisagor bağıntısında kenarları topladı (c = a + b sandı)', text: `İlk üçgende a + b = ${r.a + r.b}. Hipotenüs gerçekten ${r.a + r.b} birim mi? Kareyi çevreleyen büyük karenin kenarı ${r.a + r.b}; eğik kare ondan küçük. Kenarlar yerine alanları karşılaştır.` })
    else setFb({ ok: false, text: `Tablodaki ilk satırda a² ile b²’yi topla: ${r.a * r.a} + ${r.b * r.b} = ? Bunu c² ile karşılaştır.` })
  }

  const A: Pt = [a, 0], B: Pt = [0, b], C: Pt = [0, 0]
  const s = a + b
  const sqA: Pt[] = [[0, 0], [a, 0], [a, -a], [0, -a]]
  const sqB: Pt[] = [[0, 0], [0, b], [-b, b], [-b, 0]]
  const sqC: Pt[] = [[a, 0], [s, a], [b, s], [0, b]]
  const corners: Pt[][] = [[[s, 0], [s, a], [a, 0]], [[s, s], [b, s], [s, a]], [[0, s], [0, b], [b, s]], [[0, 0], [a, 0], [0, b]]]

  return (
    <Split
      work={
        <div className="mx-auto w-full max-w-[36rem] lg:max-w-[min(36rem,calc(100dvh-15rem))]">
          <Plane initial={{ xMin: -7.5, xMax: 13.5, yMin: -7.5, yMax: 13.5 }} fixedStep={1} locked label="Kenarları üzerinde kareler olan dik üçgen">
            <Poly pts={sqA} fill={COL.a} fillOpacity={0.22} stroke={COL.a} strokeWidth={2.5} />
            <Poly pts={sqB} fill={COL.b} fillOpacity={0.22} stroke={COL.b} strokeWidth={2.5} />
            {decomp && (
              <g pointerEvents="none">
                <Poly pts={[[0, 0], [s, 0], [s, s], [0, s]]} fill="none" stroke="#475569" strokeWidth={2} strokeDasharray="7 5" />
                {corners.map((t, i) => <Poly key={i} pts={t} fill="#f59e0b" fillOpacity={0.28} stroke="#b45309" strokeWidth={1.5} />)}
              </g>
            )}
            <Poly pts={sqC} fill={COL.c} fillOpacity={decomp ? 0.12 : 0.22} stroke={COL.c} strokeWidth={2.5} />
            <Pinchable
              onScale={(f) => {
                if (!pinch.current) pinch.current = { a0: a, b0: b, f: 1 }
                pinch.current.f *= f
                setLegs(Math.round(pinch.current.a0 * pinch.current.f), Math.round(pinch.current.b0 * pinch.current.f))
              }}
              onEnd={() => { pinch.current = null }}
            >
              <Poly pts={[C, A, B]} fill="#fde68a" stroke="#1f2340" strokeWidth={3} strokeLinejoin="round" />
            </Pinchable>
            <RightMark p={A} q={C} r={B} />
            <Tag at={[a / 2, -a / 2]} color="#3730a3" size={a >= 2 ? 15 : 11}>a² = {a * a}</Tag>
            <Tag at={[-b / 2, b / 2]} color="#115e59" size={b >= 2 ? 15 : 11}>b² = {b * b}</Tag>
            <Tag at={[s / 2 + 0.3, s / 2 + 0.3]} color="#9d174d" size={16}>{seen ? `c² = ${c2}` : 'c² = ?'}</Tag>
            <Tag at={[Math.max(a / 2, 0.8), 0.4]} color="#1f2340" size={13}>a</Tag>
            <Tag at={[0.25, Math.min(b / 2, b - 0.6)]} color="#1f2340" size={13} anchor="start">b</Tag>
            <DragPoint x={a} y={0} color={COL.a} snapStep={1} constrain={(p) => ({ x: Math.max(1, Math.min(6, p.x)), y: 0 })} onChange={(p) => setLegs(p.x, b)} disabled={phase === 'done'} />
            <DragPoint x={0} y={b} color={COL.b} snapStep={1} constrain={(p) => ({ x: 0, y: Math.max(1, Math.min(6, p.y)) })} onChange={(p) => setLegs(a, p.y)} disabled={phase === 'done'} />
          </Plane>
          <p className="mt-2 text-center text-xs font-bold text-slate-300">Renkli noktaları sürükle · üçgende iki parmak: büyüt/küçült</p>
        </div>
      }
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Önce tahmin et">Dik üçgenin her kenarına bir kare yapıştırdık. En uzun kenardaki (hipotenüs) pembe karenin alanı, diğer iki karenin alanına göre nasıldır?</Prompt>
              <Choices cols={1} options={PREDICT.map((p) => ({ id: p.id, label: p.label }))} value={guess} onPick={(g) => setGuess(g)} />
              <CheckButton disabled={!guess} onClick={() => { track.strategy(`Tahmin: ${PREDICT.find((p) => p.id === guess)?.label}`); setPhase('explore') }}>Tahminimle keşfe başla</CheckButton>
            </>
          )}
          {phase !== 'predict' && (
            <>
              <Prompt step={phase === 'explore' ? 'Keşfet' : phase === 'conclude' ? 'Sonuç' : 'Keşfettin'}>
                {phase === 'explore' ? <>Dik kenarları değiştir, üç karenin alanını ölç. <b>3 farklı</b> dik üçgeni tabloya kaydet.</> : 'Tablona bak: hangi ilişki her satırda doğru?'}
              </Prompt>
              {phase === 'explore' && (
                <Card dark>
                  <Stepper dark label="a (yatay dik kenar)" value={a} min={1} max={6} onChange={(v) => setLegs(v, b)} />
                  <div className="mt-2"><Stepper dark label="b (dikey dik kenar)" value={b} min={1} max={6} onChange={(v) => setLegs(a, v)} /></div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <GhostButton dark active={decomp} onClick={() => { setDecomp(!decomp); setSeen(true); setFb(null) }}>{decomp ? <EyeOff size={18} /> : <Eye size={18} />}Eğik kareyi say</GhostButton>
                    <GhostButton dark onClick={save}><Plus size={18} />Tabloya ekle</GhostButton>
                  </div>
                  {decomp && (
                    <div className="mt-2 rounded-xl bg-slate-900/70 p-2 text-sm font-bold text-amber-200 animate-fade-up">
                      <p>Eğik kare = çevreleyen büyük kare − 4 sarı üçgen</p>
                      <p className="mt-1 text-base font-black text-white tabular-nums">{s} × {s} − 4 × ({a} × {b} ÷ 2) = {c2}</p>
                    </div>
                  )}
                </Card>
              )}
              <Card>
                <table className="w-full text-center text-base font-black tabular-nums">
                  <thead>
                    <tr className="text-xs text-ink-soft">
                      <th className="py-1">a</th><th>b</th><th style={{ color: COL.a }}>a²</th><th style={{ color: COL.b }}>b²</th><th style={{ color: COL.c }}>c²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-line animate-fade-up">
                        <td className="py-1.5">{r.a}</td><td>{r.b}</td><td>{r.a * r.a}</td><td>{r.b * r.b}</td><td>{r.a * r.a + r.b * r.b}</td>
                      </tr>
                    ))}
                    {rows.length < 3 && Array.from({ length: 3 - rows.length }, (_, i) => (
                      <tr key={`e${i}`} className="border-t border-line text-slate-300"><td className="py-1.5">·</td><td>·</td><td>·</td><td>·</td><td>·</td></tr>
                    ))}
                  </tbody>
                </table>
                {seen && phase === 'explore' && <p className="mt-1 text-center text-sm font-bold text-ink-soft"><MathText text={`Hipotenüs: c = ${rootText(c2)}`} /></p>}
              </Card>
              {phase === 'explore' && rows.length >= 3 && <CheckButton onClick={() => { setPhase('conclude'); setFb(null) }}>Örüntüyü söyle</CheckButton>}
              {phase === 'conclude' && (
                <>
                  <Choices cols={1} options={CONCLUDE.map((c) => ({ id: c.id, label: c.label, sub: c.sub }))} value={pick} onPick={(p) => { setPick(p); setFb(null) }} />
                  <CheckButton disabled={!pick} onClick={check} />
                </>
              )}
              {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries + fb.text} question={fb.text} misconception={fb.mis} tool="dinamikucgen" />)}
              {phase === 'done' && footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. Yeniden düzenleme kanıtı ───────────────────────── */

type Tri = [Pt, Pt, Pt]
/** Kenarı a + b olan karede 4 eş dik üçgen: 1. diziliş (ortada eğik c² kalır) → 2. diziliş (a² ve b² kalır) */
function arrangement(a: number, b: number) {
  const s = a + b
  const src: Tri[] = [[[0, 0], [a, 0], [0, b]], [[s, 0], [s, a], [a, 0]], [[s, s], [b, s], [s, a]], [[0, s], [0, b], [b, s]]]
  const dst: Tri[] = [[[a, a], [a, 0], [s, a]], [[s, 0], [s, a], [a, 0]], [[a, s], [0, s], [a, a]], [[0, a], [a, a], [0, s]]]
  return { s, src, dst }
}
const ang = (p: Pt, q: Pt) => Math.atan2(q[1] - p[1], q[0] - p[0])
/** Katı hareket: kaynak üçgeni t ∈ [0, 1] oranında hedefe döndürerek taşı */
function moved(src: Tri, dst: Tri, t: number): Tri {
  let th = ang(dst[0], dst[1]) - ang(src[0], src[1])
  while (th > Math.PI) th -= 2 * Math.PI
  while (th <= -Math.PI) th += 2 * Math.PI
  const tt = th * t
  const R: Pt = [src[0][0] + (dst[0][0] - src[0][0]) * t, src[0][1] + (dst[0][1] - src[0][1]) * t]
  const cs = Math.cos(tt), sn = Math.sin(tt)
  return src.map(([x, y]) => {
    const dx = x - src[0][0], dy = y - src[0][1]
    return [R[0] + dx * cs - dy * sn, R[1] + dx * sn + dy * cs] as Pt
  }) as Tri
}
const TRI_FILL = ['#fbbf24', '#f59e0b', '#fcd34d', '#fb923c']

const WHY = [
  { id: 'ok', label: 'Üçgenlerin dışında kalan alanlar eşit: c² = a² + b²' },
  { id: 'change', label: 'Üçgenler taşınınca alanları değişti' },
  { id: 'only', label: 'Bu yalnızca bu a ve b için doğru' },
] as const

export function ProofTask({ footer, onSolved }: Common) {
  const [a, setA] = useState(3)
  const [b, setB] = useState(4)
  const [prog, setProg] = useState([0, 1, 0, 0])
  const [pick, setPick] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const anim = useRef<number[]>([0, 0, 0, 0])
  const progRef = useRef(prog)
  progRef.current = prog
  const { s, src, dst } = arrangement(a, b)
  const allMoved = prog.every((p) => p >= 1)

  useEffect(() => () => anim.current.forEach((id) => cancelAnimationFrame(id)), [])
  const move = (i: number) => {
    if (progRef.current[i] >= 1) {
      setFb({ ok: false, text: i === 1 ? 'Bu üçgen iki dizilişte de aynı yerde duruyor. Diğer üçgenleri taşı.' : 'Bu üçgen yerine oturdu. Diğerlerini taşı.' })
      return
    }
    if (progRef.current[i] > 0) return
    setFb(null)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 650)
      const e = t < 1 ? Math.max(0.001, 1 - (1 - t) ** 3) : 1
      setProg((p) => p.map((v, j) => (j === i ? e : v)))
      if (t < 1) anim.current[i] = requestAnimationFrame(step)
    }
    anim.current[i] = requestAnimationFrame(step)
  }
  const moveAll = () => [0, 2, 3].filter((i) => progRef.current[i] === 0).forEach((i, k) => window.setTimeout(() => move(i), k * 300))
  const reset = (na = a, nb = b) => {
    anim.current.forEach((id) => cancelAnimationFrame(id))
    setA(na)
    setB(nb)
    setProg([0, 1, 0, 0])
    setFb(null)
  }
  const check = () => {
    if (pick === 'ok') {
      const first = chk.pass()
      if (!done) onSolved(first)
      setDone(true)
      setFb({ ok: true, text: 'İki büyük karenin alanı eşit ((a + b)²) ve ikisinde de aynı 4 üçgen var. Üçgenleri çıkarınca geriye kalanlar da eşit olmalı: c² = a² + b². Bu, her dik üçgen için geçerli bir kanıt!' })
      return
    }
    chk.fail()
    if (pick === 'change') setFb({ ok: false, mis: 'Taşınan ya da döndürülen parçanın alanı değişir sandı', text: 'Bir kâğıt üçgeni masada kaydırıp döndürünce alanı değişir mi? Üçgenlerin kenarları hâlâ a ve b mi?' })
    else setFb({ ok: false, mis: 'Genellemeyi tek örnekle sınırladı', text: 'a ve b’yi aşağıdan değiştir ve üçgenleri yeniden taşı. Diziliş hangi a ve b için kurulamıyor?' })
  }

  const U = 250 / s
  const W = 250
  const X2 = W + 40
  const pts = (t: Tri, ox: number) => t.map(([x, y]) => `${ox + x * U},${y * U}`).join(' ')
  const tiltSq: Pt[] = [[a, 0], [s, a], [b, s], [0, b]]

  return (
    <Split
      work={
        <div className="mx-auto w-full max-w-[40rem]">
          <svg viewBox={`-10 -34 ${W * 2 + 60} ${W + 70}`} className="w-full" role="img" aria-label="Kenarı a + b olan iki eş kare ve içlerindeki dört eş dik üçgen">
            {[0, X2].map((ox, k) => (
              <g key={k}>
                <rect x={ox} y={0} width={W} height={W} fill="#0f172a" stroke="#94a3b8" strokeWidth={2} />
                <text x={ox + W / 2} y={-12} textAnchor="middle" fontSize={15} fontWeight={900} fill="#e2e8f0">{k === 0 ? '1. diziliş' : '2. diziliş (dokun ve taşı)'}</text>
                <line x1={ox + 2} x2={ox + a * U - 3} y1={W + 9} y2={W + 9} stroke="#a5b4fc" strokeWidth={3} strokeLinecap="round" />
                <line x1={ox + a * U + 3} x2={ox + W - 2} y1={W + 9} y2={W + 9} stroke="#5eead4" strokeWidth={3} strokeLinecap="round" />
                <text x={ox + (a * U) / 2} y={W + 28} textAnchor="middle" fontSize={15} fontWeight={900} fill="#a5b4fc">a</text>
                <text x={ox + a * U + (b * U) / 2} y={W + 28} textAnchor="middle" fontSize={15} fontWeight={900} fill="#5eead4">b</text>
              </g>
            ))}
            {/* 1. diziliş */}
            <polygon points={tiltSq.map(([x, y]) => `${x * U},${y * U}`).join(' ')} fill={COL.c} fillOpacity={0.35} stroke={COL.c} strokeWidth={2.5} />
            {src.map((t, i) => <polygon key={i} points={pts(t, 0)} fill={TRI_FILL[i]} stroke="#78350f" strokeWidth={1.5} />)}
            <text x={(s / 2) * U} y={(s / 2) * U + 8} textAnchor="middle" fontSize={24} fontWeight={900} fill="#fff">c²</text>
            {/* 2. diziliş */}
            {allMoved && (
              <g className="animate-fade-up">
                <rect x={X2} y={0} width={a * U} height={a * U} fill={COL.a} fillOpacity={0.45} stroke={COL.a} strokeWidth={2.5} />
                <rect x={X2 + a * U} y={a * U} width={b * U} height={b * U} fill={COL.b} fillOpacity={0.45} stroke={COL.b} strokeWidth={2.5} />
                <text x={X2 + (a * U) / 2} y={(a * U) / 2 + 8} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fff">a²</text>
                <text x={X2 + a * U + (b * U) / 2} y={a * U + (b * U) / 2 + 8} textAnchor="middle" fontSize={24} fontWeight={900} fill="#fff">b²</text>
              </g>
            )}
            {src.map((t, i) => {
              const m = moved(t, dst[i], prog[i])
              return (
                <g key={i} role="button" tabIndex={0} aria-label={`${i + 1}. üçgeni taşı`} onClick={() => move(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && move(i)} style={{ cursor: prog[i] < 1 ? 'pointer' : 'default', outline: 'none' }}>
                  <polygon points={pts(m, X2)} fill={TRI_FILL[i]} stroke={prog[i] < 1 ? '#fff' : '#78350f'} strokeWidth={prog[i] < 1 ? 3 : 1.5} strokeLinejoin="round" />
                  {prog[i] === 0 && (() => {
                    const cx = (m[0][0] + m[1][0] + m[2][0]) / 3, cy = (m[0][1] + m[1][1] + m[2][1]) / 3
                    return <circle cx={X2 + cx * U} cy={cy * U} r={11} fill="#fff" stroke="#b45309" strokeWidth={2} className="animate-pulse" pointerEvents="none" />
                  })()}
                </g>
              )
            })}
            <text x={W + 20} y={W / 2 + 8} textAnchor="middle" fontSize={26} fontWeight={900} fill="#94a3b8">=</text>
          </svg>
        </div>
      }
      panel={
        <>
          <Prompt step="Kanıtı kur">İki eş büyük karenin içine aynı 4 dik üçgeni koyduk. Sağdaki karede üçgenlere <b>dokunarak</b> taşı. Geriye ne kalıyor?</Prompt>
          <Card dark>
            <Stepper dark label="a" value={a} min={1} max={5} onChange={(v) => reset(v, b)} />
            <div className="mt-2"><Stepper dark label="b" value={b} min={1} max={5} onChange={(v) => reset(a, v)} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <GhostButton dark onClick={moveAll} disabled={allMoved}>Hepsini taşı</GhostButton>
              <GhostButton dark onClick={() => reset()}><RotateCcw size={17} />Baştan</GhostButton>
            </div>
          </Card>
          {allMoved && (
            <>
              <Card><p className="text-base font-extrabold">Solda üçgenlerin dışında <b style={{ color: COL.c }}>c²</b>, sağda <b style={{ color: COL.a }}>a²</b> ve <b style={{ color: COL.b }}>b²</b> kaldı. Bu ne gösterir?</p></Card>
              <Choices cols={1} options={WHY.map((w) => ({ id: w.id, label: w.label }))} value={pick} onPick={(p) => { setPick(p); setFb(null) }} disabled={done} />
              {!done && <CheckButton disabled={!pick} onClick={check} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries + fb.text} question={fb.text} misconception={fb.mis} />)}
          {done && footer}
        </>
      }
    />
  )
}
