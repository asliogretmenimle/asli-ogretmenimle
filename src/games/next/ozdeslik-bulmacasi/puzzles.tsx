import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Lightbulb, RotateCw, Scissors, Undo2 } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { useWidth } from '../../kit'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { Card, CheckButton, Choices, GhostButton, Nudge, Prompt, Split, Stage, useChecks } from '../../../interactions/donusum-studyosu/ortak'
import { TileShape } from './Board'
import { IdentityCard, type Identity, type Solved } from './levels'
import { AB, bbox, isRectangle, lenStr, overlap, toLen, type Rect } from './shapes'

/**
 * Kesip taşıma bulmacaları (harfli uzunluklar, a = 4,1 · b = 1,55 birim çizilir):
 *  - CutLevel:  a² karesinden b² kesilir; L şeklinin bir parçası döndürülüp taşınarak (a + b)(a − b) dikdörtgeni kurulur.
 *  - SubtractLevel: a² karesinden iki “− ab” şeridi çıkarılır, iki kez çıkarılan b² köşesi geri eklenir → (a − b)².
 */

type Common = { onSolved: (r: Solved) => void; footer: ReactNode; solved: boolean; identity: Identity }

const A = AB[0].value, B = AB[1].value, D = A - B
const BLUE = '#3b82f6', SKY = '#60a5fa', RED = '#ef4444', GREEN = '#10b981', AMBER = '#f59e0b'

function useFit(vbW: number, vbH: number) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const maxH = typeof window === 'undefined' ? 460 : Math.max(260, Math.min(520, window.innerHeight * 0.5))
  return [ref, Math.min(width / vbW, maxH / vbH)] as const
}

/** Kenar etiketi (SVG) */
function EdgeText({ x, y, text, color = '#e2e8f0', size = 0.42, rotate }: { x: number; y: number; text: string; color?: string; size?: number; rotate?: boolean }) {
  return <text x={x} y={y} fontSize={size} fontWeight={900} fill={color} textAnchor="middle" dominantBaseline="central" transform={rotate ? `rotate(-90 ${x} ${y})` : undefined} pointerEvents="none">{text}</text>
}

/* ───────────── iki kare farkı: kes ve taşı ───────────── */

type P2 = { x: number; y: number; rot: boolean }
const p2Rect = (p: P2): Rect => ({ x: p.x, y: p.y, w: p.rot ? B : D, h: p.rot ? D : B })
const P1: Rect = { x: 0, y: 0, w: A, h: D }
const SNAP = (() => {
  const v: number[] = []
  for (let k = -1; k <= 2; k++) for (let j = -2; j <= 2; j++) v.push(k * A + j * B)
  return v
})()

export function CutLevel({ onSolved, footer, solved, identity }: Common) {
  const checks = useChecks()
  const track = useTracker()
  const [phase, setPhase] = useState<'cut' | 'move' | 'sides'>('cut')
  const [p2, setP2] = useState<P2>({ x: 0, y: D, rot: false })
  const [drag, setDrag] = useState<P2 | null>(null)
  const off = useRef<[number, number]>([0, 0])
  const [moves, setMoves] = useState(0)
  const [nudge, setNudge] = useState<{ text: string; n: number } | null>(null)
  const [wPick, setW] = useState<string | null>(null)
  const [hPick, setH] = useState<string | null>(null)
  const [miss, setMiss] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)
  const vb = { x: -B - 0.9, y: -0.95, w: A + 2 * B + 1.8, h: A + 1.55 }
  const [wrap, ppu] = useFit(vb.w, vb.h)

  const toU = (cx: number, cy: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect()
    return [vb.x + ((cx - r.left) / r.width) * vb.w, vb.y + ((cy - r.top) / r.height) * vb.h]
  }
  const snap = (p: P2): P2 => {
    const r = p2Rect(p)
    const s = (v: number) => SNAP.reduce((b, c) => (Math.abs(c - v) < Math.abs(b - v) ? c : b), Infinity)
    const sx = s(p.x), sy = s(p.y)
    const x = Math.abs(sx - p.x) < 0.5 ? sx : p.x
    const y = Math.abs(sy - p.y) < 0.5 ? sy : p.y
    return { ...p, x: Math.min(A + B + 0.2 - r.w, Math.max(-B - 0.2, x)), y: Math.min(A - r.h, Math.max(0, y)) }
  }
  const place = (np: P2) => {
    setP2(np)
    setMoves((m) => m + 1)
    if (overlap(P1, p2Rect(np))) {
      setNudge((n) => ({ text: 'Parçalar üst üste binerse alan değişir! Parçayı boş bir yere sürükle.', n: (n?.n ?? 0) + 1 }))
      return
    }
    setNudge(null)
    if (isRectangle([P1, p2Rect(np)])) {
      sfx.ok()
      setPhase('sides')
    }
  }
  const rotate = () => {
    if (phase !== 'move') return
    const r = p2Rect(p2)
    const np = snap({ rot: !p2.rot, x: r.x + r.w / 2 - r.h / 2, y: r.y + r.h / 2 - r.w / 2 })
    place(np)
  }

  const bind = useDrag(({ first, last, tap, xy: [cx, cy], event }) => {
    event?.stopPropagation?.()
    if (phase !== 'move') return
    if (tap) return rotate()
    const u = toU(cx, cy)
    if (first) off.current = [u[0] - p2.x, u[1] - p2.y]
    const np = snap({ ...p2, x: u[0] - off.current[0], y: u[1] - off.current[1] })
    if (last) {
      setDrag(null)
      place(np)
    } else setDrag(np)
  }, { filterTaps: true })

  const cur = drag ?? p2
  const r2 = p2Rect(cur)
  const box = bbox([P1, p2Rect(p2)])
  const wAns = lenStr(toLen(box.w, AB) ?? [0, 0], AB), hAns = lenStr(toLen(box.h, AB) ?? [0, 0], AB)
  const checkSides = () => {
    if (wPick === wAns && hPick === hAns) return onSolved({ first: checks.pass(), moves })
    checks.fail()
    setMiss((m) => m + 1)
  }

  return (
    <Split
      work={
        <Stage dark className="p-2 sm:p-3">
          <div ref={wrap} className="flex justify-center">
            <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={vb.w * ppu} height={vb.h * ppu} className="touch-none select-none" style={{ touchAction: 'none' }} role="img" aria-label="Kesip taşıma bulmacası">
              {phase === 'cut' ? (
                <>
                  <TileShape rect={{ x: 0, y: 0, w: A, h: A }} color={BLUE} label="" />
                  <rect x={D} y={D} width={B} height={B} fill={AMBER} stroke="#fff" strokeWidth={0.06} strokeDasharray="0.2 0.12" />
                  <EdgeText x={D + B / 2} y={D + B / 2} text="b²" size={0.55} color="#fff" />
                  <EdgeText x={A / 2} y={A / 2 - 0.4} text="a²" size={0.9} color="#fff" />
                  <EdgeText x={A / 2} y={-0.45} text="a" color="#93c5fd" />
                  <EdgeText x={-0.45} y={A / 2} text="a" color="#93c5fd" />
                  <EdgeText x={D + B / 2} y={A + 0.4} text="b" color="#fcd34d" />
                  <EdgeText x={A + 0.4} y={D + B / 2} text="b" color="#fcd34d" />
                </>
              ) : (
                <>
                  {phase === 'move' && (
                    <>
                      <rect x={D} y={D} width={B} height={B} fill="none" stroke="#64748b" strokeWidth={0.05} strokeDasharray="0.15 0.12" />
                      <EdgeText x={D + B / 2} y={D + B / 2} text="kesildi" size={0.3} color="#64748b" />
                    </>
                  )}
                  <TileShape rect={P1} color={BLUE} label="" />
                  <EdgeText x={A / 2} y={-0.45} text="a" color="#93c5fd" />
                  <EdgeText x={-0.45} y={D / 2} text="a − b" rotate color="#93c5fd" />
                  <g {...bind()} style={{ cursor: phase === 'move' ? 'grab' : 'default', touchAction: 'none' }}>
                    <TileShape rect={r2} color={SKY} label="" selected={!!drag} />
                    {overlap(P1, r2) && <rect x={r2.x} y={r2.y} width={r2.w} height={r2.h} rx={0.08} fill="#ef444433" stroke="#f87171" strokeWidth={0.08} strokeDasharray="0.2 0.12" />}
                    <EdgeText x={r2.x + r2.w / 2} y={r2.y + r2.h - 0.32} text={lenStr(cur.rot ? [0, 1] : [1, -1], AB)} size={0.36} color="#0f172a" />
                    <EdgeText x={r2.x + 0.32} y={r2.y + r2.h / 2} text={lenStr(cur.rot ? [1, -1] : [0, 1], AB)} size={0.36} rotate color="#0f172a" />
                  </g>
                  {phase === 'sides' && (
                    <rect x={box.x - 0.08} y={box.y - 0.08} width={box.w + 0.16} height={box.h + 0.16} rx={0.1} fill="none" stroke="#34d399" strokeWidth={0.08} className="animate-pulse" />
                  )}
                  {solved && (
                    <>
                      <EdgeText x={box.x + box.w / 2} y={box.y + box.h + 0.45} text={wAns} color="#34d399" size={0.5} />
                      <EdgeText x={box.x + box.w + 0.45} y={box.y + box.h / 2} text={hAns} color="#34d399" size={0.5} rotate />
                    </>
                  )}
                </>
              )}
            </svg>
          </div>
        </Stage>
      }
      panel={
        <>
          {phase === 'cut' && (
            <>
              <Prompt step="1. adım: kes">Kenarı a olan karenin köşesinden kenarı b olan kareyi kesip atalım. Geriye kalan şeklin alanı ne olur?</Prompt>
              <CheckButton onClick={() => { setPhase('move'); track.strategy('Kesip taşıdım') }}><Scissors size={20} />b²’yi kes</CheckButton>
            </>
          )}
          {phase !== 'cut' && (
            <Card dark>
              <p className="text-sm font-bold text-slate-300">Kalan alan</p>
              <p className="text-2xl font-black text-white"><MathText text="a^{2} − b^{2}" /></p>
            </Card>
          )}
          {phase === 'move' && (
            <>
              <Prompt step="2. adım: taşı">Açık mavi parçayı sürükleyip döndürerek (dokun) bu L şeklini <b>tek bir dikdörtgene</b> dönüştür. Parça kesilmez, üst üste binmez: alan aynı kalır.</Prompt>
              <div className="flex gap-2">
                <GhostButton dark onClick={rotate} className="flex-1"><RotateCw size={18} />Döndür</GhostButton>
                <GhostButton dark onClick={() => { setP2({ x: 0, y: D, rot: false }); setNudge(null) }} className="flex-1"><Undo2 size={18} />Başa al</GhostButton>
                <GhostButton dark onClick={() => { checks.hint(); setNudge((n) => ({ text: 'Açık mavi parçanın bir kenarı a − b. Koyu mavi parçanın da a − b uzunluğunda bir kenarı var: sol kenarı! Parçayı döndürüp bu kenarları aynı hizaya getirmeyi dene.', n: (n?.n ?? 0) + 1 })) }} className="flex-1"><Lightbulb size={18} />İpucu</GhostButton>
              </div>
            </>
          )}
          {nudge && !solved && <Nudge key={nudge.n} question={nudge.text} />}
          {phase === 'sides' && !solved && (
            <Card dark>
              <p className="mb-2 font-extrabold text-white">Bir dikdörtgen oldu! Kenarlarını oku:</p>
              <p className="mb-1 text-xs font-black tracking-wide text-slate-300 uppercase">Yatay kenar</p>
              <Choices options={['a', 'a + b', 'a − b', '2a'].map((o) => ({ id: o, label: o }))} value={wPick} onPick={setW} />
              <p className="mt-3 mb-1 text-xs font-black tracking-wide text-slate-300 uppercase">Dikey kenar</p>
              <Choices options={['b', 'a', 'a − b', 'a + b'].map((o) => ({ id: o, label: o }))} value={hPick} onPick={setH} />
              <div className="mt-3"><CheckButton onClick={checkSides} disabled={!wPick || !hPick}>Kenarları kontrol et</CheckButton></div>
              {miss > 0 && <div className="mt-2"><Nudge key={miss} question="Yatay kenarda koyu parçanın a uzunluğu ile döndürdüğün parçanın kısa kenarı yan yana. Dikey kenar, koyu parçanın sol kenarı kadar." /></div>}
            </Card>
          )}
          {solved && (
            <>
              <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-200">Alan değişmedi, yalnızca biçim değişti:</p>
              <IdentityCard id={identity} big />
              {footer}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────── (a − b)²: çıkar ve geri ekle ───────────── */

type SubKind = 'v' | 'h' | 'b2'
type SubItem = { id: number; k: SubKind; x: number; y: number }
const subRect = (it: { k: SubKind; x: number; y: number }): Rect => ({ x: it.x, y: it.y, w: it.k === 'h' ? A : B, h: it.k === 'v' ? A : B })
let subId = 1

export function SubtractLevel({ onSolved, footer, solved, identity }: Common) {
  const checks = useChecks()
  const track = useTracker()
  const [guess, setGuess] = useState<string | null>(null)
  const [items, setItems] = useState<SubItem[]>([])
  const [moves, setMoves] = useState(0)
  const [drag, setDrag] = useState<{ k: SubKind; cx: number; cy: number; snap: { x: number; y: number } | null } | null>(null)
  const dragRef = useRef(drag)
  const [nudge, setNudge] = useState<{ text: string; misconception?: string; n: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const vb = { x: -1, y: -1, w: A + 2, h: A + 2 }
  const [wrap, ppu] = useFit(vb.w, vb.h)
  const strips = items.filter((i) => i.k !== 'b2')
  const plus = items.find((i) => i.k === 'b2')

  const setD = (d: typeof drag) => {
    dragRef.current = d
    setDrag(d)
  }
  const toU = (cx: number, cy: number): [number, number] | null => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null
    return [vb.x + ((cx - r.left) / r.width) * vb.w, vb.y + ((cy - r.top) / r.height) * vb.h]
  }
  /** Bırakılan yere en yakın geçerli konum (şeritler kenara, b² köşelerden birine) */
  const snapAt = (k: SubKind, u: [number, number] | null) => {
    if (!u) return null
    const [ux, uy] = u
    if (ux < -0.6 || uy < -0.6 || ux > A + 0.6 || uy > A + 0.6) return null
    const near = (v: number) => (Math.abs(v - B / 2) < Math.abs(v - (D + B / 2)) ? 0 : D)
    if (k === 'v') return { x: near(ux), y: 0 }
    if (k === 'h') return { x: 0, y: near(uy) }
    return { x: near(ux), y: near(uy) }
  }
  const drop = (k: SubKind, s: { x: number; y: number } | null) => {
    if (!s) return
    if (k === 'b2' ? !!plus : strips.length >= 2) return
    if (items.some((i) => i.k === k && i.x === s.x && i.y === s.y)) {
      sfx.bad()
      return setNudge((n) => ({ text: 'Orada zaten aynı parça var. Bir şeridi iki kez çıkarmak doğru olur mu?', n: (n?.n ?? 0) + 1 }))
    }
    setItems([...items, { id: subId++, k, ...s }])
    setMoves((m) => m + 1)
    setNudge(null)
    sfx.ok()
  }

  /** Dokun-dokun: şeridi boş kenara, b²’yi şeritlerin kesiştiği köşeye koy */
  const tapPlace = (k: SubKind) => {
    const v = strips.find((x) => x.k === 'v'), h = strips.find((x) => x.k === 'h')
    if (k === 'v') return drop(k, { x: items.some((i) => i.k === 'v' && i.x === D) ? 0 : D, y: 0 })
    if (k === 'h') return drop(k, { x: 0, y: items.some((i) => i.k === 'h' && i.y === D) ? 0 : D })
    drop(k, { x: v ? v.x : D, y: h ? h.y : D })
  }
  const bin = (k: SubKind) => {
    const left = k === 'b2' ? (plus ? 0 : 1) : 2 - strips.length
    return { left, disabled: left <= 0 || !guess || solved }
  }

  const check = () => {
    const v = strips.filter((s) => s.k === 'v'), h = strips.filter((s) => s.k === 'h')
    const fail = (text: string, misconception?: string) => {
      checks.fail()
      setNudge((n) => ({ text, misconception, n: (n?.n ?? 0) + 1 }))
    }
    if (strips.length < 2) return fail('Kalan parçanın bir kare olması için kenarının her iki yönde de a − b olması gerekir. Hem bir yandan hem de alttan ya da üstten b genişliğinde birer şerit çıkar.')
    if (v.length !== 1 || h.length !== 1) return fail('İki şerit aynı yönde! Kalan parça bir kare mi? Biri dikey, biri yatay olmalı.')
    const corner = { x: v[0].x, y: h[0].y }
    if (!plus) return fail('Koyu renkli köşeye bak: b × b’lik bu kare iki şeridin ikisinde de var, yani iki kez çıkarıldı. Bir kez çıkarılması gerekiyordu. Ne yapmalısın?', 'İki şeridin kesişimini (b²) hesaba katmamak')
    if (plus.x !== corner.x || plus.y !== corner.y) return fail('+b² karesini iki kez çıkarılan (en koyu) köşeye koymalısın.')
    onSolved({ first: checks.pass(), moves })
  }

  const rest = strips.length === 2 && plus ? { x: strips.find((s) => s.k === 'v')!.x === 0 ? B : 0, y: strips.find((s) => s.k === 'h')!.y === 0 ? B : 0 } : null
  const exprTxt = `a^{2}${strips.map(() => ' − ab').join('')}${plus ? ' + b^{2}' : ''}`

  return (
    <Split
      work={
        <Stage dark className="p-2 sm:p-3">
          <div ref={wrap} className="flex justify-center">
            <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={vb.w * ppu} height={vb.h * ppu} className="touch-none select-none" style={{ touchAction: 'none' }} role="img" aria-label="a kare bulmacası">
              <TileShape rect={{ x: 0, y: 0, w: A, h: A }} color={BLUE} label="" />
              <EdgeText x={A / 2} y={-0.45} text="a" color="#93c5fd" />
              <EdgeText x={-0.45} y={A / 2} text="a" color="#93c5fd" />
              {!items.length && <EdgeText x={A / 2} y={A / 2} text="a²" size={0.9} color="#fff" />}
              {strips.map((s) => {
                const r = subRect(s)
                return (
                  <g key={s.id} onClick={() => !solved && (setItems(items.filter((i) => i.id !== s.id)), setNudge(null))} style={{ cursor: solved ? 'default' : 'pointer' }}>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={RED} fillOpacity={0.45} stroke="#fecaca" strokeWidth={0.05} />
                    <EdgeText x={r.x + r.w / 2} y={r.y + r.h / 2} text="− ab" size={0.42} color="#fff" rotate={s.k === 'v'} />
                  </g>
                )
              })}
              {plus && (
                <g onClick={() => !solved && (setItems(items.filter((i) => i.id !== plus.id)), setNudge(null))} style={{ cursor: solved ? 'default' : 'pointer' }}>
                  <rect x={plus.x + 0.08} y={plus.y + 0.08} width={B - 0.16} height={B - 0.16} rx={0.08} fill={GREEN} fillOpacity={0.85} stroke="#fff" strokeWidth={0.06} strokeDasharray="0.18 0.1" />
                  <EdgeText x={plus.x + B / 2} y={plus.y + B / 2} text="+ b²" size={0.42} color="#fff" />
                </g>
              )}
              {solved && rest && (
                <g className="animate-pop">
                  <rect x={rest.x} y={rest.y} width={D} height={D} fill="#a78bfa" fillOpacity={0.55} stroke="#ede9fe" strokeWidth={0.08} />
                  <EdgeText x={rest.x + D / 2} y={rest.y + D / 2} text="(a − b)²" size={0.55} color="#fff" />
                </g>
              )}
              {drag?.snap && <rect x={drag.snap.x} y={drag.snap.y} width={subRect({ k: drag.k, ...drag.snap }).w} height={subRect({ k: drag.k, ...drag.snap }).h} fill="#ffffff22" stroke="#fff" strokeWidth={0.06} strokeDasharray="0.2 0.12" pointerEvents="none" />}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-center gap-3 rounded-2xl bg-slate-800/80 p-2 ring-1 ring-slate-600">
            {(['v', 'h', 'b2'] as SubKind[]).map((k) => (
              <SubBin key={k} k={k} ppu={ppu} {...bin(k)}
                onTap={() => tapPlace(k)}
                onMove={(cx, cy) => setD({ k, cx, cy, snap: snapAt(k, toU(cx, cy)) })}
                onEnd={() => { const d = dragRef.current; setD(null); if (d) drop(d.k, d.snap) }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-center text-xs font-bold text-slate-400">Parçayı kareye sürükle ya da dokun. Kaldırmak için kare üstündeki parçaya dokun.</p>
          {drag && !drag.snap && <div className="pointer-events-none fixed z-50 rounded-md opacity-70" style={{ left: drag.cx - 20, top: drag.cy - 20, width: 40, height: 40, background: drag.k === 'b2' ? GREEN : RED }} />}
        </Stage>
      }
      panel={
        <>
          <Prompt step="Alan modelinde çıkarma">Kenarı a olan kareden, kenarı <b>a − b</b> olan bir kare elde etmek istiyoruz. Kareden hangi parçaları çıkarmalı, neyi geri eklemeliyiz?</Prompt>
          {!guess && (
            <Card dark>
              <p className="mb-2 font-extrabold text-white"><MathText text="Önce tahmin et: (a − b)^{2} = a^{2} − b^{2} mi?" /></p>
              <Choices cols={1} options={[{ id: 'evet', label: 'Evet, öyle' }, { id: 'hayir', label: 'Hayır, başka terimler de var' }]} value={guess} onPick={(id) => { setGuess(id); track.strategy(`Tahmin: ${id === 'evet' ? '(a − b)² = a² − b²' : 'başka terimler de var'}`); if (id === 'evet') track.misconception('(a − b)² = a² − b² sanmak') }} />
            </Card>
          )}
          {guess && (
            <Card dark>
              <p className="text-sm font-bold text-slate-300">Kalan alan</p>
              <p className="text-2xl font-black text-white"><MathText text={exprTxt} /></p>
              {strips.length === 2 && plus && <p className="mt-1 text-sm font-bold text-slate-300"><MathText text="= a^{2} − 2ab + b^{2}" /></p>}
            </Card>
          )}
          {guess && !solved && items.length > 0 && <CheckButton onClick={check}>Kalan parça (a − b)² mi?</CheckButton>}
          {nudge && !solved && <Nudge key={nudge.n} question={nudge.text} misconception={nudge.misconception} />}
          {solved && (
            <>
              <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-200">İki şerit çıkarıldı, iki kez çıkarılan köşe geri eklendi:</p>
              <IdentityCard id={identity} big />
              {guess === 'evet' && <p className="rounded-xl bg-slate-700/70 px-3 py-2 text-sm font-bold text-slate-100"><MathText text="Tahminin a^{2} − b^{2} idi. Kareden yalnızca b^{2} çıkmıyor: iki ab şeridi çıkıyor, iki kez çıkarılan b^{2} köşesi bir kez geri ekleniyor. Fark: 2b^{2} − 2ab." /></p>}
              {footer}
            </>
          )}
        </>
      }
    />
  )
}

function SubBin({ k, ppu, left, disabled, onTap, onMove, onEnd }: { k: SubKind; ppu: number; left: number; disabled: boolean; onTap: () => void; onMove: (cx: number, cy: number) => void; onEnd: () => void }) {
  const bind = useDrag(({ last, tap, xy: [cx, cy] }) => {
    if (disabled) return
    if (tap) return onTap()
    if (last) onEnd()
    else onMove(cx, cy)
  }, { filterTaps: true })
  const s = Math.min(ppu * 0.55, 24)
  const w = k === 'h' ? A * s : B * s, h = k === 'v' ? A * s : B * s
  return (
    <button type="button" {...bind()} disabled={disabled} aria-label={k === 'b2' ? 'artı b kare' : k === 'v' ? 'eksi ab dikey şerit' : 'eksi ab yatay şerit'}
      className="relative grid min-h-12 min-w-12 touch-none place-items-center rounded-xl p-1.5 hover:bg-slate-700 disabled:opacity-30" style={{ touchAction: 'none' }}>
      <span className="grid place-items-center rounded-md text-xs font-black text-white" style={{ width: w, height: h, background: k === 'b2' ? GREEN : RED }}>{k === 'b2' ? '+b²' : '−ab'}</span>
      <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-white text-xs font-black text-ink ring-1 ring-slate-300">{left}</span>
    </button>
  )
}
