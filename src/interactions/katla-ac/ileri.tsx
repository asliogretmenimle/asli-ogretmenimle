import { useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useDrag } from '@use-gesture/react'
import { Minus, Plus, Undo2 } from 'lucide-react'
import { StrategyPicker } from '../../games/kit2'
import { sfx } from '../../lib/feedback'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, GhostButton, Nudge, Prompt, Split, Stage, dist, fmt, pick, toPoints, useChecks, type Pt } from '../donusum-studyosu/ortak'
import { centroid, clipHalf, foldMatrix, foot, lineAt, lineInPoly, lineThrough, orient, reflect, reflectPoly, translatePoly, type Line } from './geom'
import { PaperSvg, svgPoint, useTween } from './Paper'
import type { Common } from './tasks'

/**
 * 7–8. sınıf: aydınger (yarı saydam) kâğıtla yansıma, açıortay ve orta dikme.
 * Kâğıt 160 × 110 birim (10 birim = 1 cm).
 */

const W = 160, H = 110
const PAPER: Pt[] = [[0, 0], [W, 0], [W, H], [0, H]]
const FRONT = '#f8fafc', BACK = '#dbeafe'
const RED = '#e11d48', BLUE = '#2563eb', INK = '#7c3aed'
const cm = (u: number) => `${fmt(u / 10, 1)} cm`
const dir = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)]
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k]
const clampP = (p: Pt): Pt => [Math.max(3, Math.min(W - 3, p[0])), Math.max(3, Math.min(H - 3, p[1]))]

function Grid() {
  const xs = Array.from({ length: W / 10 - 1 }, (_, i) => (i + 1) * 10)
  const ys = Array.from({ length: H / 10 - 1 }, (_, i) => (i + 1) * 10)
  return (
    <g stroke="#cbd5e1" strokeWidth={0.3}>
      {xs.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={0} y2={H} />)}
      {ys.map((y) => <line key={`y${y}`} y1={y} y2={y} x1={0} x2={W} />)}
    </g>
  )
}

/** Doğru boyunca katlanan aydınger kâğıt; mürekkep (ink) her iki parçada da çizilir */
function Sheet({ line, c, ink, under }: { line: Line; c: number; ink: ReactNode; under?: ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const st = clipHalf(PAPER, line, -1), fl = clipHalf(PAPER, line, 1)
  return (
    <g>
      <defs>
        <clipPath id={`s${id}`}><polygon points={toPoints(st)} /></clipPath>
        <clipPath id={`f${id}`}><polygon points={toPoints(fl)} /></clipPath>
      </defs>
      <rect x={1.5} y={2} width={W} height={H} fill="#000" opacity={0.25} />
      {st.length > 2 && <polygon points={toPoints(st)} fill={FRONT} />}
      <g clipPath={`url(#s${id})`}><Grid />{under}{ink}</g>
      {fl.length > 2 && (
        <g transform={foldMatrix(line, c)}>
          <polygon points={toPoints(fl)} fill={c > 0 ? FRONT : BACK} fillOpacity={c > 0 ? 1 : 0.78} stroke="#94a3b8" strokeWidth={0.5} />
          <g clipPath={`url(#f${id})`} opacity={c > 0 ? 1 : 0.55}><Grid />{ink}</g>
        </g>
      )}
    </g>
  )
}

function FoldLine({ line, solid }: { line: Line; solid?: boolean }) {
  const s = lineInPoly(line, PAPER)
  if (!s) return null
  return <line x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke={solid ? '#0f172a' : '#db2777'} strokeWidth={solid ? 0.9 : 1.3} strokeDasharray={solid ? '3 2' : '5 3'} pointerEvents="none" />
}

function Handle({ p, onDrag, svgRef, color = '#db2777', label }: { p: Pt; onDrag: (q: Pt) => void; svgRef: RefObject<SVGSVGElement | null>; color?: string; label?: string }) {
  const bind = useDrag(({ xy: [x, y], event }) => {
    event.stopPropagation()
    onDrag(svgPoint(svgRef.current, x, y))
  })
  return (
    <g {...bind()} data-handle style={{ touchAction: 'none', cursor: 'grab' }}>
      <circle cx={p[0]} cy={p[1]} r={8.5} fill="transparent" />
      <circle cx={p[0]} cy={p[1]} r={4.2} fill={color} stroke="#fff" strokeWidth={1.3} />
      {label && <text x={p[0]} y={p[1] - 7} textAnchor="middle" fontSize={6} fontWeight={900} fill={color}>{label}</text>}
    </g>
  )
}

const Dot = ({ p, color, label, dx = 4, dy = -4 }: { p: Pt; color: string; label?: string; dx?: number; dy?: number }) => (
  <g pointerEvents="none">
    <circle cx={p[0]} cy={p[1]} r={2.4} fill={color} stroke="#fff" strokeWidth={0.8} />
    {label && <text x={p[0] + dx} y={p[1] + dy} fontSize={7} fontWeight={900} fill={color}>{label}</text>}
  </g>
)

/** Dik açı işareti (köşe p, iki yön) */
function RightMark({ p, u, v, s = 4 }: { p: Pt; u: Pt; v: Pt; s?: number }) {
  const a = add(p, u, s), b = add(add(p, u, s), v, s), c = add(p, v, s)
  return <polyline points={toPoints([a, b, c])} fill="none" stroke="#0f172a" strokeWidth={0.6} pointerEvents="none" />
}

/* ───────────────────────── Yansıma tahmini ───────────────────────── */

type MirrorKind = 'dogru' | 'kaydir' | 'dondur' | 'dikey'
const FLAG: Pt[] = [[0, 10], [0, -14], [17, -9], [3, -3], [3, 10]]

export function MirrorTask({ t, dark, footer, onSolved }: { t: { kind: 'mirror'; ang: number } } & Common) {
  const track = useTracker()
  const tw = useTween(1)
  const C: Pt = [W / 2, H / 2]
  const setup = useMemo(() => {
    const base = lineAt(C, t.ang)
    const n: Pt = [-base.d[1], base.d[0]]
    const Q = add(add(C, n, 24), base.d, 8)
    const shape = FLAG.map((p) => add(Q, p))
    const line = orient(base, centroid(shape))
    const img = reflectPoly(line, shape)
    const cen = centroid(shape), F = foot(line, cen), rc = reflect(line, cen)
    const vert = Math.abs(t.ang - 90) < 20
    const cands: { kind: MirrorKind; poly: Pt[] }[] = [
      { kind: 'dogru', poly: img },
      { kind: 'kaydir', poly: translatePoly(shape, [rc[0] - cen[0], rc[1] - cen[1]]) },
      { kind: 'dondur', poly: shape.map((q) => [2 * F[0] - q[0], 2 * F[1] - q[1]] as Pt) },
      { kind: 'dikey', poly: vert ? shape.map((q) => [q[0], 2 * F[1] - q[1]] as Pt) : shape.map((q) => [2 * F[0] - q[0], q[1]] as Pt) },
    ]
    return { line, shape, img, cands: cands.sort(() => Math.random() - 0.5) }
  }, [t.ang])
  const [choice, setChoice] = useState<number | null>(null)
  const [phase, setPhase] = useState<'predict' | 'fold' | 'result' | 'ask' | 'done'>('predict')
  const [printed, setPrinted] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [q, setQ] = useState<string | null>(null)
  const first = useRef(true)

  const go = () => {
    if (choice === null) return
    setPhase('fold')
    tw.run(1, -1, () => {
      setPrinted(true)
      sfx.ok()
      window.setTimeout(() => tw.run(-1, 1, () => {
        const k = setup.cands[choice].kind
        const ok = k === 'dogru'
        first.current = ok
        track.attempt(ok)
        const msg: Record<MirrorKind, { q: string; m: string }> = {
          dogru: { q: '', m: '' },
          kaydir: { q: 'Bayrağın ucu hangi yöne bakıyordu, baskıda hangi yöne bakıyor? Katlayınca şekil kayar mı, yoksa ters mi döner?', m: 'Yansımayı öteleme gibi düşündü (şeklin yönünü çevirmedi)' },
          dondur: { q: 'Baskıyı seçtiğin şekille karşılaştır: şekil yarım tur mu döndü, yoksa kat çizgisine göre aynalandı mı?', m: 'Yansımayı döndürme ile karıştırdı' },
          dikey: { q: 'Kat çizgisi eğikti. Ayna da eğik olunca görüntü nereye düşer? Her köşeyi kat çizgisine dik olarak karşıya taşı.', m: 'Eğik katlama çizgisini dikey/yatay ayna gibi düşündü' },
        }
        setFb(ok ? { ok: true, text: 'Tahminin doğru! Baskı, bayrağın kat çizgisine göre ayna görüntüsü (yansıması).' } : { ok: false, text: msg[k].q, m: msg[k].m })
        setPhase('ask')
      }), 350)
    })
  }
  const answer = (id: string) => {
    setQ(id)
    if (id === 'dik') {
      setPhase('done')
      setFb({ ok: true, text: 'Evet: kat çizgisi, her noktayı görüntüsüne bağlayan doğru parçasına diktir ve onu iki eş parçaya böler. Kat çizgisi bu doğru parçalarının orta dikmesidir.' })
      onSolved(first.current)
    } else {
      track.attempt(false)
      setFb({ ok: false, text: 'Mor kesikli doğru parçalarına bak: kat çizgisini kestikleri yerde açı kaç derece? Kat çizgisinin iki yanındaki parçalar eşit mi?', m: 'Yansımada nokta ile görüntüsünü birleştiren doğru parçasının simetri eksenine dik olduğunu görmedi' })
    }
  }

  const ink = (
    <g>
      <polygon points={toPoints(setup.shape)} fill={RED} fillOpacity={0.85} stroke={RED} strokeWidth={0.6} strokeLinejoin="round" />
    </g>
  )
  const under = printed ? <polygon points={toPoints(setup.img)} fill={INK} fillOpacity={0.55} stroke={INK} strokeWidth={0.6} /> : null
  const showLinks = phase === 'ask' || phase === 'done'
  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox={`-6 -6 ${W + 12} ${H + 12}`} label="Aydınger kâğıt ve eğik kat çizgisi">
            <Sheet line={setup.line} c={tw.c} ink={ink} under={under} />
            {tw.c > 0.98 && <FoldLine line={setup.line} />}
            {showLinks && setup.shape.map((p, i) => {
              const r = setup.img[setup.img.length - 1 - i]
              const m = foot(setup.line, p)
              const u: Pt = [(p[0] - m[0]) / (dist(p, m) || 1), (p[1] - m[1]) / (dist(p, m) || 1)]
              return (
                <g key={i} pointerEvents="none">
                  <line x1={p[0]} y1={p[1]} x2={r[0]} y2={r[1]} stroke={INK} strokeWidth={0.7} strokeDasharray="2 1.5" />
                  {i === 1 && <RightMark p={m} u={u} v={setup.line.d} s={3.5} />}
                </g>
              )
            })}
          </PaperSvg>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Mürekkep baskısı">Kırmızı bayrak ıslak mürekkeple çizildi. Kâğıdı pembe <b>eğik çizgiden</b> katlayıp bastırırsan karşı tarafta hangi baskı oluşur?</Prompt>
          <div className="grid grid-cols-2 gap-2">
            {setup.cands.map((cd, i) => {
              const showOk = phase !== 'predict' && phase !== 'fold' && cd.kind === 'dogru'
              return (
                <button key={i} type="button" disabled={phase !== 'predict'} onClick={() => setChoice(i)} aria-pressed={choice === i}
                  className={`rounded-2xl bg-white p-1.5 ring-2 transition active:scale-[0.97] ${showOk ? 'ring-4 ring-ok' : choice === i ? 'ring-4 ring-pink-600' : 'ring-line hover:ring-pink-300'}`}>
                  <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className="block h-auto w-full" aria-hidden>
                    <rect width={W} height={H} fill={FRONT} stroke="#94a3b8" strokeWidth={0.8} />
                    <FoldLine line={setup.line} />
                    <polygon points={toPoints(setup.shape)} fill={RED} fillOpacity={0.8} />
                    <polygon points={toPoints(cd.poly)} fill={INK} fillOpacity={0.6} />
                  </svg>
                  <span className="block text-xs font-black text-ink-soft">{String.fromCharCode(65 + i)}{showOk ? ' ✓' : ''}</span>
                </button>
              )
            })}
          </div>
          {phase === 'predict' && <CheckButton onClick={go} disabled={choice === null}>Katla ve bastır</CheckButton>}
          {fb && <Nudge key={`${phase}-${q}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.ok ? undefined : fb.m} tool={fb.ok ? undefined : 'donusum'} />}
          {(phase === 'ask' || phase === 'done') && (
            <>
              <Prompt step="İncele">Her köşeyi baskıdaki görüntüsüne bağlayan <b className="text-violet-700">mor doğru parçaları</b> kat çizgisine göre nasıl?</Prompt>
              <Choices<string> cols={1} value={q} disabled={phase === 'done'} onPick={answer} options={[
                { id: 'dik', label: 'Kat çizgisine dik ve onun tarafından ortadan bölünüyor' },
                { id: 'par', label: 'Kat çizgisine paralel' },
                { id: 'esit', label: 'Hepsinin uzunluğu aynı' },
              ]} />
            </>
          )}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── Orta dikme: A’yı B’nin üstüne katla ───────────────────────── */

const DIRS: Pt[] = [[24, 12], [22, -14], [28, 8], [-16, -20], [26, -4]]

export function PerpTask({ dark, footer, onSolved }: { t: { kind: 'perp' } } & Common) {
  const chk = useChecks()
  const tw = useTween(1)
  const svgRef = useRef<SVGSVGElement>(null)
  const { A, B, M } = useMemo(() => {
    const v = pick(DIRS)
    const M: Pt = [W / 2 + pick([-8, 0, 8]), H / 2 + pick([-6, 0, 6])]
    return { A: add(M, v, -1), B: add(M, v), M }
  }, [])
  const [P1, setP1] = useState<Pt>([W * 0.32, 12])
  const [P2, setP2] = useState<Pt>([W * 0.4, H - 12])
  const [phase, setPhase] = useState<'adjust' | 'folding' | 'miss' | 'explore' | 'done'>('adjust')
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [s, setS] = useState(26)
  const [q, setQ] = useState<string | null>(null)
  const line = orient(lineThrough(P1, P2), A)
  const ok = dist(P1, P2) > 8
  const A2 = reflect(line, A)

  const fold = () => {
    if (!ok) return
    setFb(null)
    setPhase('folding')
    tw.run(1, -1, () => {
      const d = dist(reflect(line, A), B)
      if (d <= 5) {
        sfx.ok()
        // kat izini tam orta dikmeye yerleştir
        const u: Pt = [-(B[1] - A[1]), B[0] - A[0]]
        const L = Math.hypot(u[0], u[1])
        setP1(add(M, [u[0] / L, u[1] / L], -40))
        setP2(add(M, [u[0] / L, u[1] / L], 40))
        setFb({ ok: true, text: 'A ile B çakıştı! Kâğıdı açalım ve kat izini inceleyelim.' })
        window.setTimeout(() => tw.run(-1, 1, () => setPhase('explore')), 450)
      } else {
        chk.fail()
        setFb({ ok: false, text: `A noktası B’nin üstüne gelmedi (aralarında ${cm(d)} var). Kat çizgisi A ile B’nin tam ortasından mı geçiyor? AB’ye göre nasıl durmalı?` })
        setPhase('miss')
      }
    })
  }
  const unfold = () => tw.run(-1, 1, () => { setPhase('adjust') })
  const tap = (p: Pt) => {
    if (phase !== 'adjust') return
    const c = clampP(p)
    if (dist(c, P1) < dist(c, P2)) setP1(c)
    else setP2(c)
    setFb(null)
  }
  const crease = lineThrough(P1, P2)
  const ud: Pt = crease.d
  const R = add(M, ud, s)
  const dragR = (p: Pt) => {
    const t = (p[0] - M[0]) * ud[0] + (p[1] - M[1]) * ud[1]
    const seg = lineInPoly(crease, PAPER)
    if (!seg) return
    const ts = seg.map((e) => (e[0] - M[0]) * ud[0] + (e[1] - M[1]) * ud[1])
    setS(Math.max(Math.min(...ts) + 4, Math.min(Math.max(...ts) - 4, t)))
  }
  const answer = (id: string) => {
    setQ(id)
    if (id === 'esit') {
      setPhase('done')
      setFb({ ok: true, text: 'Evet! Kat izi AB’nin orta dikmesidir: AB’ye diktir, AB’yi ortadan böler ve üzerindeki her nokta A ile B’ye eşit uzaklıktadır.' })
      onSolved(chk.pass())
    } else {
      chk.fail()
      setFb({ ok: false, text: 'R noktasını kat izi boyunca uçlara kadar sürükle ve iki uzunluğu izle. Hiç farklı oluyorlar mı?', m: 'Orta dikme üzerindeki noktaların uç noktalara eşit uzaklıkta olduğunu fark etmedi' })
    }
  }

  const ink = (
    <g>
      <Dot p={A} color={RED} label="A" />
      <Dot p={B} color={BLUE} label="B" />
    </g>
  )
  const explore = phase === 'explore' || phase === 'done'
  const uAB: Pt = [(B[0] - A[0]) / dist(A, B), (B[1] - A[1]) / dist(A, B)]
  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox={`-6 -6 ${W + 12} ${H + 12}`} label="A ve B noktalı aydınger kâğıt" svgRef={svgRef} onTap={tap}>
            <Sheet line={line} c={tw.c} ink={ink} />
            {phase === 'miss' && <g pointerEvents="none"><circle cx={A2[0]} cy={A2[1]} r={3.2} fill="none" stroke={RED} strokeWidth={0.9} /><text x={A2[0] + 4} y={A2[1] + 7} fontSize={6} fontWeight={900} fill={RED}>A′</text></g>}
            {(phase === 'adjust') && (
              <>
                <FoldLine line={line} />
                <Handle p={P1} svgRef={svgRef} onDrag={(p) => { setP1(clampP(p)); setFb(null) }} />
                <Handle p={P2} svgRef={svgRef} onDrag={(p) => { setP2(clampP(p)); setFb(null) }} />
              </>
            )}
            {explore && (
              <g>
                <FoldLine line={crease} solid />
                <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke="#64748b" strokeWidth={0.6} />
                <RightMark p={M} u={uAB} v={ud} s={3.5} />
                <line x1={R[0]} y1={R[1]} x2={A[0]} y2={A[1]} stroke={RED} strokeWidth={0.9} />
                <line x1={R[0]} y1={R[1]} x2={B[0]} y2={B[1]} stroke={BLUE} strokeWidth={0.9} />
                <Handle p={R} svgRef={svgRef} onDrag={dragR} color="#0f172a" label="R" />
              </g>
            )}
          </PaperSvg>
          {explore && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-center font-black">
              <span className="rounded-xl bg-rose-100 px-2 py-1.5 text-rose-800">RA = {cm(dist(R, A))}</span>
              <span className="rounded-xl bg-blue-100 px-2 py-1.5 text-blue-800">RB = {cm(dist(R, B))}</span>
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {!explore && <Prompt step="Orta dikme">Kâğıdı öyle katla ki <b className="text-rose-600">A</b> noktası tam <b className="text-blue-600">B</b> noktasının üstüne gelsin.</Prompt>}
          {phase === 'adjust' && <Card dark={dark}><p className="text-sm font-bold">Pembe tutamaçları sürükleyerek kat çizgisini yerleştir (ya da kâğıda dokun: en yakın tutamaç oraya gelir).</p></Card>}
          {phase === 'adjust' && <CheckButton onClick={fold} disabled={!ok}>Katla</CheckButton>}
          {phase === 'miss' && <GhostButton onClick={unfold} dark={dark} className="w-full"><Undo2 size={18} />Kâğıdı aç, düzelt</GhostButton>}
          {explore && (
            <>
              <Prompt step="İncele">Kat izi üzerindeki <b>R</b> noktasını sürükle. RA ve RB uzunlukları için ne söyleyebilirsin?</Prompt>
              <Choices<string> cols={1} value={q} disabled={phase === 'done'} onPick={answer} options={[
                { id: 'esit', label: 'R nerede olursa olsun RA = RB' },
                { id: 'orta', label: 'Yalnız R tam ortadayken eşit' },
                { id: 'yakin', label: 'R, A’ya yaklaştıkça eşit olur' },
              ]} />
            </>
          )}
          {fb && <Nudge key={`${phase}-${chk.tries}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.ok ? undefined : fb.m} />}
          {phase === 'done' && <StrategyPicker question="Kat çizgisini nasıl buldun?" options={['A ile B’nin ortasından geçirdim', 'AB’ye dik tuttum', 'Deneyerek yaklaştım']} onPick={() => undefined} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── Açıortay: bir kolu ötekinin üstüne katla ───────────────────────── */

export function AngleTask({ dark, footer, onSolved }: { t: { kind: 'angle' } } & Common) {
  const chk = useChecks()
  const tw = useTween(1)
  const svgRef = useRef<SVGSVGElement>(null)
  const { O, a1, a2 } = useMemo(() => {
    const a1 = pick([8, 12, 16, 20])
    return { O: [26, 96] as Pt, a1, a2: a1 + pick([56, 64, 72, 84, 96]) }
  }, [])
  const [phi, setPhi] = useState(Math.round(a1 + (a2 - a1) * 0.22))
  const [phase, setPhase] = useState<'adjust' | 'folding' | 'miss' | 'explore' | 'done'>('adjust')
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [s, setS] = useState(70)
  const [q, setQ] = useState<string | null>(null)
  const r1 = add(O, dir(a1), 40)
  const line = orient(lineAt(O, phi), r1)
  const half = (a2 - a1) / 2

  const fold = () => {
    setFb(null)
    setPhase('folding')
    tw.run(1, -1, () => {
      const img = 2 * phi - a1
      const diff = img - a2
      if (Math.abs(diff) <= 1) {
        sfx.ok()
        setPhi((a1 + a2) / 2)
        setFb({ ok: true, text: 'Kollar tam üst üste geldi! Kâğıdı açıp kat izine bakalım.' })
        window.setTimeout(() => tw.run(-1, 1, () => setPhase('explore')), 450)
      } else {
        chk.fail()
        setFb({ ok: false, text: `Kırmızı kol, mavi kolun ${Math.abs(diff)}° ${diff > 0 ? 'ötesine geçti' : 'gerisinde kaldı'}. Kat çizgisini hangi yöne ve kaç derece çevirmelisin? (İpucu: kat çizgisini 1° çevirince kol kaç derece kayar?)` })
        setPhase('miss')
      }
    })
  }
  const setFrom = (p: Pt) => {
    const a = Math.round((Math.atan2(-(p[1] - O[1]), p[0] - O[0]) * 180) / Math.PI)
    setPhi(Math.max(1, Math.min(150, a)))
    setFb(null)
  }
  const bis = lineAt(O, (a1 + a2) / 2)
  const P = add(O, dir((a1 + a2) / 2), s)
  const F1 = foot(lineAt(O, a1), P), F2 = foot(lineAt(O, a2), P)
  const dragP = (p: Pt) => setS(Math.max(20, Math.min(110, (p[0] - O[0]) * bis.d[0] + (p[1] - O[1]) * bis.d[1])))
  const arc = (from: number, to: number, r: number) => {
    const a = add(O, dir(from), r), b = add(O, dir(to), r)
    return `M ${a[0]} ${a[1]} A ${r} ${r} 0 0 0 ${b[0]} ${b[1]}`
  }
  const lab = (deg: number, r: number) => add(O, dir(deg), r)
  const answer = (id: string) => {
    setQ(id)
    if (id === 'esit') {
      setPhase('done')
      setFb({ ok: true, text: `Evet! Kat izi açıyı iki eş açıya (${fmt(half)}° + ${fmt(half)}°) böler: bu açıortaydır. Açıortay üzerindeki her nokta iki kola eşit uzaklıktadır.` })
      onSolved(chk.pass())
    } else {
      chk.fail()
      setFb({ ok: false, text: 'P noktasını kat izi boyunca sürükle ve iki uzaklığı izle. Hiç farklı oluyorlar mı?', m: 'Açıortay üzerindeki noktaların kollara eşit uzaklıkta olduğunu fark etmedi' })
    }
  }

  const ink = (
    <g>
      <line x1={O[0]} y1={O[1]} x2={add(O, dir(a1), 200)[0]} y2={add(O, dir(a1), 200)[1]} stroke={RED} strokeWidth={1.4} strokeLinecap="round" />
      <line x1={O[0]} y1={O[1]} x2={add(O, dir(a2), 200)[0]} y2={add(O, dir(a2), 200)[1]} stroke={BLUE} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={O[0]} cy={O[1]} r={1.8} fill="#0f172a" />
      <text x={O[0] - 7} y={O[1] + 7} fontSize={7} fontWeight={900} fill="#0f172a">O</text>
    </g>
  )
  const explore = phase === 'explore' || phase === 'done'
  const handle = add(O, dir(phi), 84)
  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox={`-6 -6 ${W + 12} ${H + 12}`} label="Açılı aydınger kâğıt" svgRef={svgRef} onTap={(p) => phase === 'adjust' && setFrom(p)}>
            <Sheet line={line} c={tw.c} ink={ink} />
            {!explore && <path d={arc(a1, a2, 16)} fill="none" stroke="#475569" strokeWidth={0.7} pointerEvents="none" />}
            {!explore && <text x={lab((a1 + a2) / 2, 21)[0]} y={lab((a1 + a2) / 2, 21)[1]} fontSize={6} fontWeight={900} fill="#475569" textAnchor="middle" pointerEvents="none">{a2 - a1}°</text>}
            {phase === 'adjust' && (
              <>
                <FoldLine line={line} />
                <Handle p={handle} svgRef={svgRef} onDrag={setFrom} />
              </>
            )}
            {explore && (
              <g>
                <FoldLine line={bis} solid />
                <path d={arc(a1, (a1 + a2) / 2, 18)} fill="none" stroke={RED} strokeWidth={0.9} />
                <path d={arc((a1 + a2) / 2, a2, 22)} fill="none" stroke={BLUE} strokeWidth={0.9} />
                <text x={lab(a1 + half / 2, 27)[0]} y={lab(a1 + half / 2, 27)[1] + 2} fontSize={6} fontWeight={900} fill={RED} textAnchor="middle">{fmt(half)}°</text>
                <text x={lab(a2 - half / 2, 31)[0]} y={lab(a2 - half / 2, 31)[1] + 2} fontSize={6} fontWeight={900} fill={BLUE} textAnchor="middle">{fmt(half)}°</text>
                <line x1={P[0]} y1={P[1]} x2={F1[0]} y2={F1[1]} stroke={RED} strokeWidth={0.8} strokeDasharray="2 1.5" />
                <line x1={P[0]} y1={P[1]} x2={F2[0]} y2={F2[1]} stroke={BLUE} strokeWidth={0.8} strokeDasharray="2 1.5" />
                <RightMark p={F1} u={dir(a1 + 180)} v={[(P[0] - F1[0]) / (dist(P, F1) || 1), (P[1] - F1[1]) / (dist(P, F1) || 1)]} s={3} />
                <RightMark p={F2} u={dir(a2 + 180)} v={[(P[0] - F2[0]) / (dist(P, F2) || 1), (P[1] - F2[1]) / (dist(P, F2) || 1)]} s={3} />
                <Handle p={P} svgRef={svgRef} onDrag={dragP} color="#0f172a" label="P" />
              </g>
            )}
          </PaperSvg>
          {explore && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-center font-black">
              <span className="rounded-xl bg-rose-100 px-2 py-1.5 text-rose-800">Kırmızı kola: {cm(dist(P, F1))}</span>
              <span className="rounded-xl bg-blue-100 px-2 py-1.5 text-blue-800">Mavi kola: {cm(dist(P, F2))}</span>
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {!explore && <Prompt step="Açıortay">Kâğıdı O köşesinden geçen bir çizgiden öyle katla ki <b className="text-rose-600">kırmızı kol</b> tam <b className="text-blue-600">mavi kolun</b> üstüne gelsin.</Prompt>}
          {phase === 'adjust' && (
            <Card dark={dark}>
              <p className="mb-2 text-sm font-bold">Pembe tutamacı sürükle ya da düğmelerle çevir.</p>
              <div className="flex items-center gap-2">
                <GhostButton onClick={() => setPhi((x) => Math.max(1, x - 5))} dark={dark} className="flex-1"><Minus size={16} />5°</GhostButton>
                <GhostButton onClick={() => setPhi((x) => Math.max(1, x - 1))} dark={dark} className="flex-1"><Minus size={16} />1°</GhostButton>
                <GhostButton onClick={() => setPhi((x) => Math.min(150, x + 1))} dark={dark} className="flex-1"><Plus size={16} />1°</GhostButton>
                <GhostButton onClick={() => setPhi((x) => Math.min(150, x + 5))} dark={dark} className="flex-1"><Plus size={16} />5°</GhostButton>
              </div>
            </Card>
          )}
          {phase === 'adjust' && <CheckButton onClick={fold}>Katla</CheckButton>}
          {phase === 'miss' && <GhostButton onClick={() => tw.run(-1, 1, () => setPhase('adjust'))} dark={dark} className="w-full"><Undo2 size={18} />Kâğıdı aç, düzelt</GhostButton>}
          {explore && (
            <>
              <Prompt step="İncele">Kat izi üzerindeki <b>P</b> noktasını sürükle. P’nin iki kola uzaklıkları için ne söylersin?</Prompt>
              <Choices<string> cols={1} value={q} disabled={phase === 'done'} onPick={answer} options={[
                { id: 'esit', label: 'P nerede olursa olsun eşit' },
                { id: 'kose', label: 'P köşeye yaklaşınca eşit olur' },
                { id: 'hic', label: 'Hiçbir zaman eşit değil' },
              ]} />
            </>
          )}
          {fb && <Nudge key={`${phase}-${chk.tries}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.ok ? undefined : fb.m} />}
          {phase === 'done' && <StrategyPicker question="Kat çizgisini nasıl yerleştirdin?" options={['Açının yarısını hesapladım', 'Göz kararı, sonra düzelttim', 'Kolların arasını ortaladım']} onPick={() => undefined} />}
          {footer}
        </>
      }
    />
  )
}

