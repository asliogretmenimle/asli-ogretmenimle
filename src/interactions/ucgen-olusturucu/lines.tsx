import { useMemo, useState } from 'react'
import { Card, CheckButton, Choices, Nudge, Prompt, Split, Stage, fmt, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { AngleArc, Board, COL, Handle, Seg, theme, useBoard } from './board'
import { bisectorFoot, cross, intAngles, len, mid, project, pt, type P } from './geo'
import type { Common, Task } from './common'

/**
 * 7. sınıf: üçgende yükseklik, kenarortay, açıortay (A köşesinden).
 * Çizgiler adlarıyla değil, özelliklerini gösteren işaretlerle çizilir: dik açı karesi, eş parça çentikleri, eş açı yayları.
 */

type Tri = { A: P; B: P; C: P }
type LineId = 'alt' | 'med' | 'bis'
const NAMES: Record<LineId, string> = { alt: 'Yükseklik', med: 'Kenarortay', bis: 'Açıortay' }
const LCOL = ['#f59e0b', '#22d3ee', '#a3e635']

function useTri(init: Tri) {
  const [tri, setTri] = useState<Tri>(init)
  const move = (k: keyof Tri) => (q: P) => {
    const n = { ...tri, [k]: q }
    if (Math.abs(cross(n.A, n.B, n.C)) < 1.5) return
    setTri(n)
  }
  return { tri, move }
}
const clampTo = (q: P) => pt(Math.max(0.3, Math.min(15.8, q.x)), Math.max(0.3, Math.min(10, q.y)))

function LinesInner({ tri, show, colors, marks = true, onMove, named }: { tri: Tri; show: LineId[]; colors: Record<LineId, string>; marks?: boolean; onMove: (k: keyof Tri) => (q: P) => void; named?: boolean }) {
  const Bd = useBoard()
  const th = theme(Bd.dark)
  const { A, B, C } = tri
  const H = project(A, B, C)
  const M = mid(B, C)
  const D = bisectorFoot(A, B, C)
  const cen = pt((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3)
  const outside = H.t < -0.001 || H.t > 1.001
  const ext = outside ? (H.t < 0 ? B : C) : null
  const tick = (p: P, q: P, n: number, col: string) => {
    const m = mid(p, q)
    const l = len(p, q) || 1
    const ux = (q.x - p.x) / l, uy = (q.y - p.y) / l
    const nx = -uy, ny = ux
    return Array.from({ length: n }, (_, i) => {
      const o = (i - (n - 1) / 2) * 0.16
      const c = pt(m.x + ux * o, m.y + uy * o)
      return <line key={i} x1={Bd.X(c.x + nx * 0.22)} y1={Bd.Y(c.y + ny * 0.22)} x2={Bd.X(c.x - nx * 0.22)} y2={Bd.Y(c.y - ny * 0.22)} stroke={col} strokeWidth={3} strokeLinecap="round" />
    })
  }
  const label = (id: LineId, foot: P) => named && (
    <text x={Bd.X(foot.x)} y={Bd.Y(foot.y) + 26} textAnchor="middle" fontSize={13} fontWeight={900} fill={colors[id]} stroke={th.halo} strokeWidth={4} paintOrder="stroke">{NAMES[id]}</text>
  )
  const halfA = (() => { const d = intAngles(A, B, C)[0]; return d / 2 })()
  return (
    <>
      <polygon points={[A, B, C].map((q) => `${Bd.X(q.x)},${Bd.Y(q.y)}`).join(' ')} fill={th.fill} stroke={th.stroke} strokeWidth={3} strokeLinejoin="round" pointerEvents="none" />
      {show.includes('alt') && ext && <Seg p={ext} q={H.p} color={th.soft} width={2} dash="6 6" />}
      {show.includes('bis') && (
        <g>
          <Seg p={A} q={D} color={colors.bis} width={4} />
          {marks && <AngleArc at={A} p={B} q={D} r={46} color={colors.bis} fillOpacity={0.25} label={`${fmt(halfA, 1)}°`} showRight={false} />}
          {marks && <AngleArc at={A} p={D} q={C} r={58} color={colors.bis} fillOpacity={0.12} label={`${fmt(halfA, 1)}°`} showRight={false} />}
          {label('bis', D)}
        </g>
      )}
      {show.includes('med') && (
        <g>
          <Seg p={A} q={M} color={colors.med} width={4} />
          {marks && tick(B, M, 2, colors.med)}
          {marks && tick(M, C, 2, colors.med)}
          {label('med', M)}
        </g>
      )}
      {show.includes('alt') && (
        <g>
          <Seg p={A} q={H.p} color={colors.alt} width={4} />
          {marks && <AngleArc at={H.p} p={A} q={len(H.p, C) > 0.3 ? C : B} r={22} color={colors.alt} fillOpacity={0.3} />}
          {label('alt', H.p)}
        </g>
      )}
      {(['A', 'B', 'C'] as const).map((k, i) => (
        <Handle key={k} id={k} p={tri[k]} color={[COL.A, COL.B, COL.C][i]} label={k} away={cen} onMove={onMove(k)} clampTo={clampTo} />
      ))}
    </>
  )
}

/* ───────────── hangisi hangisi? ───────────── */

export function LinesTask({ dark, footer, onSolved }: { t: Extract<Task, { kind: 'lines' }> } & Common) {
  const chk = useChecks()
  const { tri, move } = useTri({ A: pt(5, 9), B: pt(1, 1.5), C: pt(14.5, 1.5) })
  const order = useMemo(() => shuffle<LineId>(['alt', 'med', 'bis']), [])
  const colors = useMemo(() => ({ [order[0]]: LCOL[0], [order[1]]: LCOL[1], [order[2]]: LCOL[2] }) as Record<LineId, string>, [order])
  const [ans, setAns] = useState<(LineId | null)[]>([null, null, null])
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const check = () => {
    const wrong = order.findIndex((id, k) => ans[k] !== id)
    if (wrong < 0) {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: 'Hepsi doğru! Yükseklik karşı kenara dik iner, kenarortay karşı kenarı iki eş parçaya ayırır, açıortay köşedeki açıyı iki eş açıya böler.' })
      return
    }
    chk.fail()
    const id = order[wrong]
    const q: Record<LineId, string> = {
      alt: 'Bu çizginin karşı kenara değdiği yerde küçük bir kare var. Kare neyi gösterir?',
      med: 'Bu çizginin ayırdığı iki parçadaki çentiklere bak. İki parça arasında nasıl bir ilişki var?',
      bis: 'Bu çizgi A köşesindeki açıyı ikiye ayırıyor. İki parçanın ölçüleri ne söylüyor?',
    }
    setFb({ ok: false, text: `${['Turuncu', 'Turkuaz', 'Yeşil'][wrong]} çizgiye bir daha bak. ${q[id]}`, mis: ans[wrong] === 'med' && id === 'alt' ? 'Yüksekliği kenarortayla karıştırdı' : ans[wrong] === 'alt' && id === 'med' ? 'Kenarortayı yükseklikle karıştırdı' : undefined })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={600} h={420} U={36} origin={[24, 400]} dark={dark} label="Üçgende özel çizgiler">
            <LinesInner tri={tri} show={['alt', 'med', 'bis']} colors={colors} onMove={move} />
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Özelliğinden tanı">A köşesinden üç farklı çizgi çizildi. İşaretlere bak, köşeleri sürükle. Hangi çizgi hangisi?</Prompt>
          {order.map((_, k) => (
            <Card key={k} dark={dark}>
              <p className="mb-2 flex items-center gap-2 text-sm font-black"><span className="h-2 w-8 rounded-full" style={{ background: LCOL[k] }} />{['Turuncu', 'Turkuaz', 'Yeşil'][k]} çizgi</p>
              <Choices<LineId> cols={3} options={(['alt', 'med', 'bis'] as LineId[]).map((id) => ({ id, label: <span className="text-sm">{NAMES[id]}</span> }))} value={ans[k]} onPick={(id) => { setAns((a) => a.map((v, j) => (j === k ? id : v))); setFb(null) }} disabled={fb?.ok} />
            </Card>
          ))}
          {!fb?.ok && <CheckButton onClick={check} disabled={ans.some((a) => !a)} />}
          {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} tool={fb.ok ? undefined : 'dinamikucgen'} />}
          {fb?.ok && footer}
        </>
      }
    />
  )
}

/* ───────────── üç çizgiyi çakıştır ───────────── */

export function CoincideTask({ dark, footer, onSolved }: { t: Extract<Task, { kind: 'coincide' }> } & Common) {
  const chk = useChecks()
  const { tri, move } = useTri({ A: pt(4, 8.5), B: pt(2, 1.5), C: pt(13, 1.5) })
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null)
  const ab = len(tri.A, tri.B), ac = len(tri.A, tri.C)
  const colors: Record<LineId, string> = { alt: LCOL[0], med: LCOL[1], bis: LCOL[2] }
  const check = () => {
    if (Math.abs(ab - ac) < 0.05) {
      const first = chk.pass()
      onSolved(first)
      setFb({ ok: true, text: `Üç çizgi tek bir çizgi oldu! AB = AC = ${fmt(ab, 1)} cm: ikizkenar üçgende tepe köşesinden inen yükseklik, kenarortay ve açıortay çakışır.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `AB = ${fmt(ab, 1)} cm, AC = ${fmt(ac, 1)} cm. Üç çizgi birbirine yaklaşırken bu iki kenar nasıl değişiyor? A köşesini nereye koymalısın?` })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={600} h={420} U={36} origin={[24, 400]} dark={dark} label="Üç çizgiyi çakıştır">
            <LinesInner tri={tri} show={['alt', 'med', 'bis']} colors={colors} onMove={(k) => (q) => { move(k)(q); setFb(null) }} named />
            <Seg p={tri.A} q={tri.B} color="transparent" label={`${fmt(ab, 1)} cm`} away={tri.C} />
            <Seg p={tri.A} q={tri.C} color="transparent" label={`${fmt(ac, 1)} cm`} away={tri.B} />
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Keşfet">Köşeleri sürükleyerek A’dan inen <b>yükseklik</b>, <b>kenarortay</b> ve <b>açıortayı</b> tek bir çizgide birleştir.</Prompt>
          <Card dark={dark}>
            <div className="flex flex-wrap gap-2 text-sm font-extrabold">
              {(['alt', 'med', 'bis'] as LineId[]).map((id) => <span key={id} className="flex items-center gap-1.5"><span className="h-2 w-6 rounded-full" style={{ background: colors[id] }} />{NAMES[id]}</span>)}
            </div>
          </Card>
          {!fb?.ok && <CheckButton onClick={check}>Çakıştı mı?</CheckButton>}
          {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} />}
          {fb?.ok && footer}
        </>
      }
    />
  )
}

/* ───────────── yükseklik dışarıda ───────────── */

export function OutsideTask({ dark, footer, onSolved }: { t: Extract<Task, { kind: 'outside' }> } & Common) {
  const chk = useChecks()
  const { tri, move } = useTri({ A: pt(6, 8), B: pt(2, 1.5), C: pt(13, 1.5) })
  const [kind, setKind] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const H = project(tri.A, tri.B, tri.C)
  const out = H.t < -0.02 || H.t > 1.02
  const degs = intAngles(tri.A, tri.B, tri.C)
  const colors: Record<LineId, string> = { alt: LCOL[0], med: LCOL[1], bis: LCOL[2] }
  const check = () => {
    if (!out) {
      chk.fail()
      setFb({ ok: false, text: 'Yüksekliğin ayağı hâlâ BC kenarının üzerinde. B ya da C köşesindeki açı büyüdükçe ayak nereye kayıyor?' })
      return
    }
    if (kind !== 'genis') {
      chk.fail()
      setFb({ ok: false, text: `Açılara bak: ${degs.join('°, ')}°. En büyüğü 90°’den büyük mü, küçük mü?`, mis: 'Yüksekliğin dışarıda olduğu üçgenin türünü belirleyemedi' })
      return
    }
    const first = chk.pass()
    onSolved(first)
    setFb({ ok: true, text: `Doğru! ${degs[1] > 90 ? 'B' : 'C'} köşesindeki açı geniş (${Math.max(degs[1], degs[2])}°). Geniş açılı üçgende dar açılı köşeden inen yükseklik, karşı kenarın uzantısına düşer.` })
  }
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board w={600} h={420} U={36} origin={[24, 400]} dark={dark} label="Yükseklik dışarıda">
            <Seg p={pt(-2, tri.B.y + ((tri.C.y - tri.B.y) / (tri.C.x - tri.B.x || 1)) * (-2 - tri.B.x))} q={pt(18, tri.B.y + ((tri.C.y - tri.B.y) / (tri.C.x - tri.B.x || 1)) * (18 - tri.B.x))} color={theme(dark).soft} width={1} dash="3 6" />
            <LinesInner tri={tri} show={['alt']} colors={colors} onMove={(k) => (q) => { move(k)(q); setFb(null) }} named />
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Meydan okuma">Köşeleri sürükle: A’dan inen yükseklik <b>üçgenin dışına</b> düşsün. Sonra üçgenin türünü seç.</Prompt>
          <Card dark={dark}><p className="text-sm font-extrabold">Açılar: <span className="tabular-nums">A = {degs[0]}°, B = {degs[1]}°, C = {degs[2]}°</span></p></Card>
          <Choices cols={3} options={[{ id: 'dar', label: <span className="text-sm">Dar açılı</span> }, { id: 'dik', label: <span className="text-sm">Dik açılı</span> }, { id: 'genis', label: <span className="text-sm">Geniş açılı</span> }]} value={kind} onPick={(v) => { setKind(v); setFb(null) }} disabled={fb?.ok} />
          {!fb?.ok && <CheckButton onClick={check} disabled={!kind} />}
          {fb && <Nudge key={chk.tries} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.mis} />}
          {fb?.ok && footer}
        </>
      }
    />
  )
}
