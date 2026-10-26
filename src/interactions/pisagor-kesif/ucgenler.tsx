import { useState } from 'react'
import { BookmarkPlus, ListOrdered } from 'lucide-react'
import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { SolutionList, StrategyPicker } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, GhostButton, Nudge, Prompt, Split, Stepper, angleAt, gcd, useChecks, type Pt } from '../donusum-studyosu/ortak'
import { COL, Poly, RightMark, Tag, isSquare, type Common } from './parca'

/* ───────────────────────── 3. Dik değilse? ───────────────────────── */

type Kind = 'dar' | 'dik' | 'genis'
const KIND_LABEL: Record<Kind, string> = { dar: 'Dar açılı', dik: 'Dik açılı', genis: 'Geniş açılı' }
const KIND_COLOR: Record<Kind, string> = { dar: '#0ea5e9', dik: '#16a34a', genis: '#f97316' }
const REL = [
  { id: '<', label: <MathText text="a^{2} + b^{2} < c^{2}" /> },
  { id: '=', label: <MathText text="a^{2} + b^{2} = c^{2}" /> },
  { id: '>', label: <MathText text="a^{2} + b^{2} > c^{2}" /> },
] as const

function Arc({ at, from, to, color }: { at: Pt; from: Pt; to: Pt; color: string }) {
  const P = usePlane()
  const r = 26
  const cx = P.sx(at[0]), cy = P.sy(at[1])
  const a1 = Math.atan2(P.sy(from[1]) - cy, P.sx(from[0]) - cx)
  const a2 = Math.atan2(P.sy(to[1]) - cy, P.sx(to[0]) - cx)
  let d = a2 - a1
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
  const x2 = cx + r * Math.cos(a1 + d), y2 = cy + r * Math.sin(a1 + d)
  return <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 ${d > 0 ? 1 : 0} ${x2},${y2} Z`} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2} pointerEvents="none" />
}

function Thales() {
  const P = usePlane()
  const r = 5 * P.unitPx
  return <path d={`M${P.sx(0)},${P.sy(0)} A${r},${r} 0 0 1 ${P.sx(10)},${P.sy(0)}`} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="6 6" pointerEvents="none" className="animate-fade-up" />
}

export function ObtuseTask({ footer, onSolved, sol }: Common) {
  const [phase, setPhase] = useState<'predict' | 'explore' | 'done'>('predict')
  const [guess, setGuess] = useState<string | null>(null)
  const [C, setC] = useState<Pt>([3, 6])
  const [found, setFound] = useState<Kind[]>([])
  const [pick, setPick] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const track = useTracker()
  const A: Pt = [0, 0], B: Pt = [10, 0]
  const a2 = (C[0] - 10) ** 2 + C[1] ** 2
  const b2 = C[0] ** 2 + C[1] ** 2
  const c2 = 100
  const kind: Kind = a2 + b2 === c2 ? 'dik' : a2 + b2 > c2 ? 'dar' : 'genis'
  const angC = angleAt(A, C, B)
  const sign = a2 + b2 === c2 ? '=' : a2 + b2 > c2 ? '>' : '<'

  const save = () => {
    if (found.includes(kind)) {
      setFb({ ok: false, text: `${KIND_LABEL[kind]} bir üçgeni zaten kaydettin. C noktasını başka yere taşı: C açısı ${kind === 'genis' ? '90°’den küçük' : kind === 'dar' ? '90°’den büyük' : 'değişsin'}.` })
      return
    }
    sol.add(`ob-${kind}`, `${KIND_LABEL[kind]}: ${a2} + ${b2} ${sign} ${c2}`)
    const next = [...found, kind]
    setFound(next)
    const miss = (['dar', 'dik', 'genis'] as Kind[]).filter((k) => !next.includes(k))
    setFb(miss.length ? { ok: true, text: `Kaydedildi! Şimdi ${miss.map((k) => KIND_LABEL[k].toLocaleLowerCase('tr')).join(' ve ')} bir üçgen bul.${miss.includes('dik') ? ' İpucu: dik açı için C’yi tam sayılı noktalarda dene.' : ''}` } : null)
  }
  const check = () => {
    if (pick === '<') {
      const first = chk.pass()
      onSolved(first)
      setPhase('done')
      setFb({ ok: true, text: `Evet: C açısı 90°’yi geçince karşısındaki kenar uzar, c² büyür; a² + b² < c² olur. ${guess === '<' ? 'Tahminin doğruydu!' : 'Tahminini verilerle düzelttin.'} Yeşil yarım çember: C bu çemberin üzerindeyken açı tam 90°.` })
      return
    }
    chk.fail()
    setFb(pick === '=' ? { ok: false, mis: 'Pisagor bağıntısını dik olmayan üçgenlere de uyguladı', text: 'Kaydettiğin geniş açılı üçgende a² + b² ile c²’yi karşılaştır. Eşit mi çıkmıştı?' } : { ok: false, text: 'C açısı büyüdükçe c kenarı mı uzar, yoksa a ve b mi? Tablondaki geniş açılı satıra bak.' })
  }

  return (
    <Split
      work={
        <div className="mx-auto w-full max-w-[38rem] lg:max-w-[min(38rem,calc(100dvh-12rem))]">
          <Plane initial={{ xMin: -2.5, xMax: 12.5, yMin: -1.5, yMax: 9.5 }} fixedStep={1} label="A ve B sabit, C köşesi sürüklenebilen üçgen">
            {phase === 'done' && <Thales />}
            <Poly pts={[A, B, C]} fill={KIND_COLOR[kind]} fillOpacity={0.18} stroke="#1f2340" strokeWidth={3} strokeLinejoin="round" />
            {kind === 'dik' ? <RightMark p={A} q={C} r={B} size={0.55} color="#16a34a" /> : <Arc at={C} from={A} to={B} color={KIND_COLOR[kind]} />}
            <Tag at={[(C[0] + 10) / 2 + 0.5, C[1] / 2 + 0.2]} color={COL.a}>a</Tag>
            <Tag at={[C[0] / 2 - 0.5, C[1] / 2 + 0.2]} color={COL.b}>b</Tag>
            <Tag at={[5, -0.6]} color={COL.c}>c = 10</Tag>
            <Tag at={[-0.6, -0.6]} size={13}>A</Tag>
            <Tag at={[10.6, -0.6]} size={13}>B</Tag>
            <DragPoint x={C[0]} y={C[1]} label="C" color="#7c3aed" snapStep={1} constrain={(p) => ({ x: Math.max(-2, Math.min(12, p.x)), y: Math.max(1, Math.min(8, p.y)) })} onChange={(p) => { setC([p.x, p.y]); setFb(null) }} disabled={phase !== 'explore'} />
          </Plane>
        </div>
      }
      panel={
        <>
          {phase === 'predict' ? (
            <>
              <Prompt step="Önce tahmin et">Dik üçgende a² + b² = c². Peki <b>C açısı 90°’den büyükse</b> (geniş açı) ne olur?</Prompt>
              <Choices cols={1} options={REL.map((r) => ({ id: r.id, label: r.label }))} value={guess} onPick={setGuess} />
              <CheckButton disabled={!guess} onClick={() => { track.strategy(`Tahmin (geniş açı): a² + b² ${guess} c²`); setPhase('explore') }}>Deneyerek bak</CheckButton>
            </>
          ) : (
            <>
              <Prompt step={phase === 'done' ? 'Keşfettin' : 'Keşfet'}>C köşesini sürükle. <b>Dar, dik ve geniş</b> açılı birer üçgen bul ve kaydet.</Prompt>
              <Card dark>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-slate-300">C açısı</span>
                  <span className="rounded-xl px-3 py-1 text-lg font-black text-white" style={{ background: KIND_COLOR[kind] }}>{Math.round(angC)}° · {KIND_LABEL[kind]}</span>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center tabular-nums">
                  <div className="rounded-xl bg-slate-900/70 p-2">
                    <p className="text-xs font-bold text-slate-400">a² + b²</p>
                    <p className="text-lg font-black"><span style={{ color: '#a5b4fc' }}>{a2}</span> + <span style={{ color: '#5eead4' }}>{b2}</span> = {a2 + b2}</p>
                  </div>
                  <span className="text-3xl font-black text-amber-300">{sign}</span>
                  <div className="rounded-xl bg-slate-900/70 p-2">
                    <p className="text-xs font-bold text-slate-400">c²</p>
                    <p className="text-lg font-black text-pink-300">{c2}</p>
                  </div>
                </div>
                {phase === 'explore' && <GhostButton dark className="mt-3 w-full" onClick={save}><BookmarkPlus size={18} />Bu üçgeni kaydet</GhostButton>}
              </Card>
              <SolutionList list={sol.list.filter((x) => x.key.startsWith('ob-'))} goal={3} />
              {found.length === 3 && (
                <>
                  <Card><p className="font-extrabold">Kayıtlarına bak: C açısı geniş olunca hangisi doğru?</p></Card>
                  <Choices cols={1} options={REL.map((r) => ({ id: r.id, label: r.label }))} value={pick} onPick={(p) => { setPick(p); setFb(null) }} disabled={phase === 'done'} />
                  {phase !== 'done' && <CheckButton disabled={!pick} onClick={check} />}
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

/* ───────────────────────── 4. Kenarlardan tanı ───────────────────────── */

export type TriItem = { s: [number, number, number]; kind: Kind }

function triPts([p, q, r]: [number, number, number]): Pt[] {
  const x = (q * q - p * p + r * r) / (2 * r)
  const y = Math.sqrt(Math.max(0, q * q - x * x))
  return [[0, 0], [r, 0], [x, y]]
}

export function ClassifyTask({ items, footer, onSolved }: { items: TriItem[] } & Common) {
  const [ans, setAns] = useState<(Kind | null)[]>(items.map(() => null))
  const [checked, setChecked] = useState(false)
  const [done, setDone] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const check = () => {
    setChecked(true)
    const wrong = items.findIndex((it, i) => ans[i] !== it.kind)
    if (wrong < 0) {
      const first = chk.pass()
      onSolved(first)
      setDone(true)
      setFb({ ok: true, text: 'Hepsi doğru! Çizmeden, yalnızca kenarlarla açının türünü buldun: iki kısa kenarın karelerinin toplamını en uzun kenarın karesiyle karşılaştırmak yeter.' })
      return
    }
    chk.fail()
    const [p, q, r] = items[wrong].s
    const sum = p * p + q * q
    const usedWrongSide = items[wrong].kind !== 'dik' && ans[wrong] === 'dik'
    setFb({
      ok: false,
      mis: usedWrongSide ? 'Kenarlar tam sayı diye üçgeni dik sandı' : undefined,
      text: `${wrong + 1}. üçgen: en uzun kenar ${r}. ${p}² + ${q}² = ${sum}, ${r}² = ${r * r}. Hangisi büyük? Bu, en uzun kenarın karşısındaki açı için ne söyler?`,
    })
  }
  return (
    <Split
      work={
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((it, i) => {
            const pts = triPts(it.s)
            const W = 150, k = W / it.s[2], H = Math.max(...pts.map((p) => p[1])) * k
            return (
              <div key={i} className="rounded-2xl bg-slate-900/70 p-3 ring-1 ring-slate-600">
                <p className="text-xs font-black tracking-wide text-pink-300 uppercase">{i + 1}. üçgen</p>
                <p className="mt-1 text-2xl font-black text-white tabular-nums">{it.s.join(' · ')}</p>
                <p className="text-xs font-bold text-slate-400">kenar uzunlukları (cm)</p>
                <div className="mt-2 grid gap-1.5">
                  {(['dar', 'dik', 'genis'] as Kind[]).map((kd) => (
                    <button
                      key={kd}
                      type="button"
                      disabled={done}
                      onClick={() => { setAns((a) => a.map((v, j) => (j === i ? kd : v))); setFb(null); setChecked(false) }}
                      aria-pressed={ans[i] === kd}
                      className={`min-h-12 rounded-xl px-2 text-sm font-black ring-1 transition active:scale-95 ${ans[i] === kd ? 'text-white ring-transparent' : 'bg-slate-700 text-slate-100 ring-slate-500'}`}
                      style={ans[i] === kd ? { background: KIND_COLOR[kd] } : undefined}
                    >
                      {KIND_LABEL[kd]}
                    </button>
                  ))}
                </div>
                {checked && ans[i] === it.kind && (
                  <div className="mt-2 animate-fade-up">
                    <svg viewBox={`-8 ${-H - 8} ${W + 16} ${H + 16}`} className="mx-auto w-full max-w-40" aria-hidden>
                      <polygon points={pts.map(([x, y]) => `${x * k},${-y * k}`).join(' ')} fill={KIND_COLOR[it.kind]} fillOpacity={0.3} stroke={KIND_COLOR[it.kind]} strokeWidth={2.5} />
                    </svg>
                    <p className="text-center text-sm font-bold text-slate-300 tabular-nums">{it.s[0] ** 2} + {it.s[1] ** 2} {it.kind === 'dik' ? '=' : it.kind === 'dar' ? '>' : '<'} {it.s[2] ** 2}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      }
      panel={
        <>
          <Prompt step="Çizmeden tanı">Kenar uzunlukları verilen üçgenler <b>dar, dik</b> ya da <b>geniş</b> açılı mı? Çizim yok, ölçü aleti yok — yalnızca sayılar.</Prompt>
          <Card dark><p className="text-sm font-bold text-slate-300">İpucu yerine soru: En uzun kenarın karşısındaki açı en büyük açıdır. O açı 90°’den büyük mü, küçük mü?</p></Card>
          {!done && <CheckButton disabled={ans.some((x) => !x)} onClick={check} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="dinamikucgen" />)}
          {done && footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5. Pisagor üçlüleri avı ───────────────────────── */

const GOAL = 5
function base(a: number, b: number, c: number) {
  const g = gcd(gcd(a, b), c)
  return { g, p: [a / g, b / g, c / g] }
}

export function TriplesTask({ footer, onSolved, sol }: Common) {
  const [a, setA] = useState(3)
  const [b, setB] = useState(5)
  const [c, setC] = useState(6)
  const [mine, setMine] = useState<[number, number, number][]>([])
  const [showSq, setShowSq] = useState(false)
  const [solved, setSolved] = useState(false)
  const [strategy, setStrategy] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const set = (f: (v: number) => void) => (v: number) => { f(v); setFb(null) }

  const check = () => {
    const [x, y] = [Math.min(a, b), Math.max(a, b)]
    if (x * x + y * y === c * c) {
      const { g, p } = base(x, y, c)
      const isNew = sol.add(`tr-${x}-${y}-${c}`, g > 1 ? `${x}-${y}-${c} (${p.join('-')} × ${g})` : `${x}-${y}-${c}`)
      if (!isNew) {
        setFb({ ok: false, text: `${x}-${y}-${c} üçlüsünü zaten buldun. Bir öncekinin kenarlarını 2 ya da 3 katına çıkarsan ne olur?` })
        return
      }
      chk.pass()
      const next = [...mine, [x, y, c] as [number, number, number]]
      setMine(next)
      if (next.length >= 3 && !solved) {
        setSolved(true)
        onSolved(chk.fails === 0)
        setStrategy(true)
      }
      setFb({ ok: true, text: g > 1 ? `${x}² + ${y}² = ${c}² ✓ Bu, ${p.join('-')} üçlüsünün ${g} katı: kenarları ${g} katına çıkan benzer bir dik üçgen!` : `${x}² + ${y}² = ${x * x + y * y} = ${c}² ✓ Yeni bir Pisagor üçlüsü! ${next.length < GOAL ? 'Bir tane daha bulabilir misin?' : ''}` })
      return
    }
    chk.fail()
    const s2 = x * x + y * y
    if (c === x + y) setFb({ ok: false, mis: 'Pisagor bağıntısında kenarları topladı (c = a + b sandı)', text: `c = ${x} + ${y} seçtin. Ama bağıntı kenarlar için değil, karelerin alanları için: ${x}² + ${y}² = ${s2}. ${c}² kaç?` })
    else if (isSquare(s2)) setFb({ ok: false, text: `${x}² + ${y}² = ${s2}. ${s2} bir kare sayı! Hangi sayının karesi? c’yi ona göre değiştir.` })
    else setFb({ ok: false, text: `${x}² + ${y}² = ${s2}, ama ${s2} hiçbir tam sayının karesi değil. Kare sayılar listesine bak: a ya da b’yi değiştirince toplam kare sayı olabilir mi?` })
  }

  // Bulunan üçgenler aynı dik açı köşesinden çizilir: benzer olanlar aynı doğrultuda üst üste biner
  const all = [...mine]
  const M = Math.max(10, ...all.map((t) => Math.max(t[0], t[1])), a, b)
  const W = 300, k = W / M
  return (
    <Split
      work={
        <div className="mx-auto w-full max-w-[34rem]">
          <svg viewBox={`-30 -20 ${W + 60} ${W + 50}`} className="w-full rounded-3xl bg-slate-900/60 ring-1 ring-slate-600" role="img" aria-label="Bulunan dik üçgenler aynı köşeden çizildi">
            {Array.from({ length: M + 1 }, (_, i) => (
              <g key={i} stroke="#334155" strokeWidth={1}>
                <line x1={i * k} x2={i * k} y1={0} y2={W} />
                <line y1={W - i * k} y2={W - i * k} x1={0} x2={W} />
              </g>
            ))}
            {mine.map(([x, y], i) => (
              <polygon key={i} points={`0,${W} ${y * k},${W} 0,${W - x * k}`} fill={COL.c} fillOpacity={0.12} stroke="#f472b6" strokeWidth={2} />
            ))}
            <polygon points={`0,${W} ${Math.max(a, b) * k},${W} 0,${W - Math.min(a, b) * k}`} fill="none" stroke="#fbbf24" strokeWidth={3} strokeDasharray="8 6" />
            <text x={(Math.max(a, b) * k) / 2} y={W + 22} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fbbf24">{Math.max(a, b)}</text>
            <text x={-10} y={W - (Math.min(a, b) * k) / 2 + 5} textAnchor="end" fontSize={15} fontWeight={900} fill="#fbbf24">{Math.min(a, b)}</text>
            <polyline points={`0,${W - 12} 12,${W - 12} 12,${W}`} fill="none" stroke="#e2e8f0" strokeWidth={2} />
          </svg>
          <p className="mt-2 text-center text-xs font-bold text-slate-300">Kesikli: şu anki a ve b · pembe: bulduğun dik üçgenler. Aynı doğrultudakiler benzer üçgenler!</p>
        </div>
      }
      panel={
        <>
          <Prompt step="Üçlü avı">Kenarları <b>tam sayı</b> olan dik üçgenler bul: a² + b² = c² olsun (c ≤ 30). En az 3 tane!</Prompt>
          <Card dark>
            <Stepper dark label="a" value={a} min={1} max={29} onChange={set(setA)} />
            <div className="mt-2"><Stepper dark label="b" value={b} min={1} max={29} onChange={set(setB)} /></div>
            <div className="mt-2"><Stepper dark label="c (hipotenüs)" value={c} min={2} max={30} onChange={set(setC)} /></div>
            <p className="mt-3 rounded-xl bg-slate-900/70 p-2 text-center text-lg font-black tabular-nums">
              <span style={{ color: '#a5b4fc' }}>{a * a}</span> + <span style={{ color: '#5eead4' }}>{b * b}</span> <span className="text-slate-400">ile</span> <span className="text-pink-300">{c * c}</span>
            </p>
            <GhostButton dark className="mt-2 w-full" active={showSq} onClick={() => setShowSq(!showSq)}><ListOrdered size={18} />Kare sayılar</GhostButton>
            {showSq && (
              <div className="mt-2 flex flex-wrap gap-1 animate-fade-up">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => <span key={n} className="rounded-lg bg-slate-700 px-1.5 py-0.5 text-xs font-bold text-slate-100 tabular-nums">{n}²={n * n}</span>)}
              </div>
            )}
          </Card>
          <CheckButton onClick={check}>Dik üçgen mi?</CheckButton>
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="dinamikucgen" />)}
          <SolutionList list={sol.list.filter((x) => x.key.startsWith('tr-'))} goal={GOAL} />
          {strategy && <StrategyPicker question="Üçlüleri nasıl aradın?" options={['Kare sayılar listesine baktım', 'Bildiğim üçlüyü katladım', 'Deneme-yanılma', 'Önce c’yi seçtim']} onPick={() => setStrategy(false)} />}
          {solved && footer}
        </>
      }
    />
  )
}
