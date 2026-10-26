import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DragPoint, Pinchable, Plane, usePlane } from '../../interactive/Plane'
import { ToolButton } from '../ui'
import type { ToolDef } from '../types'

/**
 * Dinamik Üçgen
 *  - Üçgen modu: A, B, C köşelerini sürükle (ızgaraya yapış açılıp kapatılabilir). Üçgenin içinde tek parmak: taşı,
 *    iki parmak: büyüt/küçült ve döndür (açılar değişmez!).
 *    Canlı: açı yayları ve ölçüleri, kenar uzunlukları, açılar toplamı (açıları “kopar” → düz bir doğru üzerinde 180°),
 *    sınıflandırma, en uzun kenar ↔ en büyük açı vurgusu, kenarlar üzerine kareler (Pisagor) ve alanları.
 *  - Kenar modu (üçgen eşitsizliği): üç kenar uzunluğunu kaydırıcılarla seç; iki kısa kenarın toplamı en uzun
 *    kenardan büyük değilse üçgen kapanmaz, boşluk gösterilir.
 *
 * Görev hedefi (target), hepsi isteğe bağlı ve birlikte kullanılabilir:
 *   { type?: Tür | Tür[] }        Tür: 'dar' | 'dik' | 'genis' | 'eskenar' | 'ikizkenar' | 'cesitkenar'
 *                                  (Türkçe yazımlar da kabul: 'geniş', 'eşkenar', 'çeşitkenar')
 *   { sides?: [a, b, c] }          köşeleri sürükleyerek bu kenar uzunluklarında üçgen kur (sıra önemsiz, ±0,05)
 *   { angles?: [α, β, γ] }         bu açılarda üçgen kur (sıra önemsiz, ±1°)
 *   { angleSum?: number }          “Üç açının toplamı kaç derece?” — öğrenci yanıtı (value.answer) bu sayıya eşit olmalı
 *   Görev modunda sınıflandırma, açılar toplamı ve Pisagor karşılaştırması gizlenir; ölçümler görünür kalır.
 */

type Pt = { x: number; y: number }
type V = {
  A: Pt
  B: Pt
  C: Pt
  snap: boolean
  mode: 'ucgen' | 'kenar'
  sides: [number, number, number]
  show: { pyth: boolean; big: boolean; torn: boolean }
  answer: number | null
}

const COL = { A: '#d6457a', B: '#0284c7', C: '#7c3aed' }
const BIG = '#f59e0b'
const SMALL = '#059669'
const r2 = (v: number) => Math.round(v * 100) / 100
const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y)
const fmt = (v: number, d = 1) => (Object.is(Math.round(v * 10 ** d) / 10 ** d, -0) ? 0 : Math.round(v * 10 ** d) / 10 ** d).toLocaleString('tr-TR', { maximumFractionDigits: d })
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-6

function measure(v: Pick<V, 'A' | 'B' | 'C'>) {
  const { A, B, C } = v
  const a = dist(B, C), b = dist(C, A), c = dist(A, B)
  const ang = (P: Pt, Q: Pt, R: Pt) => {
    const u = { x: Q.x - P.x, y: Q.y - P.y }, w = { x: R.x - P.x, y: R.y - P.y }
    const l = Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y)
    if (l < 1e-9) return 0
    return (Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / l))) * 180) / Math.PI
  }
  const raw = [ang(A, B, C), ang(B, C, A), ang(C, A, B)]
  // en büyük kalan yöntemiyle tam sayıya yuvarla: toplam her zaman 180 görünür
  const fl = raw.map(Math.floor)
  let rest = 180 - fl.reduce((s, x) => s + x, 0)
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((p, q) => q[0] - p[0])
  const deg = fl.slice()
  for (const [, i] of order) if (rest-- > 0) deg[i]++
  const area2 = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y))
  return { a, b, c, raw, deg, degenerate: area2 < 1e-6 || Math.min(a, b, c) < 1e-6 }
}

function classify(m: ReturnType<typeof measure>) {
  const s = [m.a, m.b, m.c].sort((p, q) => p - q)
  const eq = (p: number, q: number) => Math.abs(p - q) <= 0.015 * Math.max(p, q) + 1e-9
  const maxA = Math.max(...m.raw)
  const byAngle = Math.abs(maxA - 90) < 0.6 ? 'dik' : maxA > 90 ? 'genis' : 'dar'
  const bySide = eq(s[0], s[2]) ? 'eskenar' : eq(s[0], s[1]) || eq(s[1], s[2]) ? 'ikizkenar' : 'cesitkenar'
  return { byAngle, bySide } as const
}
const NAMES: Record<string, string> = { dar: 'Dar açılı', dik: 'Dik açılı', genis: 'Geniş açılı', eskenar: 'Eşkenar', ikizkenar: 'İkizkenar', cesitkenar: 'Çeşitkenar' }
const norm = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/\s*açılı$/, '')

/* ───────────────────────────── çizim yardımcıları ───────────────────────────── */
function Pill({ x, y, text, color, bg = '#fff' }: { x: number; y: number; text: string; color: string; bg?: string }) {
  const w = text.length * 7.6 + 12
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11} fill={bg} stroke={color} strokeWidth={1.5} />
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={900} fill={color}>{text}</text>
    </g>
  )
}

/** Açı dilimi (matematik açılarıyla, ekran koordinatında) */
const wedgePath = (cx: number, cy: number, R: number, s: number, sweep: number) => {
  const p0 = [cx + R * Math.cos(s), cy - R * Math.sin(s)], p1 = [cx + R * Math.cos(s + sweep), cy - R * Math.sin(s + sweep)]
  return `M${cx} ${cy}L${p0[0]} ${p0[1]}A${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 0 ${p1[0]} ${p1[1]}Z`
}

/* ───────────────────────────── Üçgen sahnesi ───────────────────────────── */
function TriangleScene({ value, onChange, locked, task }: { value: V; onChange: (v: V) => void; locked?: boolean; task: boolean }) {
  const P = usePlane()
  const { A, B, C } = value
  const m = measure(value)
  const pts = { A, B, C }
  const names = ['A', 'B', 'C'] as const
  const sn = (p: Pt) => (value.snap ? { x: Math.round(p.x), y: Math.round(p.y) } : { x: r2(p.x), y: r2(p.y) })

  // tek parmak taşıma: ızgaraya yapışırken küçük adımları biriktir
  const raw = useRef<{ key: string; pts: Record<'A' | 'B' | 'C', Pt> } | null>(null)
  const curKey = JSON.stringify([A, B, C])
  const transform = (fn: (p: Pt) => Pt, snapIt: boolean) => {
    if (locked) return
    if (!raw.current || raw.current.key !== curKey) raw.current = { key: curKey, pts: { A, B, C } }
    const nr = { A: fn(raw.current.pts.A), B: fn(raw.current.pts.B), C: fn(raw.current.pts.C) }
    const out = snapIt && value.snap ? { A: sn(nr.A), B: sn(nr.B), C: sn(nr.C) } : { A: { x: r2(nr.A.x), y: r2(nr.A.y) }, B: { x: r2(nr.B.x), y: r2(nr.B.y) }, C: { x: r2(nr.C.x), y: r2(nr.C.y) } }
    const nv = { ...value, ...out }
    raw.current = { key: JSON.stringify([out.A, out.B, out.C]), pts: nr }
    onChange(nv)
  }
  const G = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 }
  const onMove = (dx: number, dy: number) => transform((p) => ({ x: p.x + dx, y: p.y + dy }), true)
  const onScale = (f: number) => {
    if (Math.min(m.a, m.b, m.c) * f < 0.4 && f < 1) return
    transform((p) => ({ x: G.x + (p.x - G.x) * f, y: G.y + (p.y - G.y) * f }), false)
  }
  const onRotate = (deg: number) => {
    const t = (-deg * Math.PI) / 180
    transform((p) => ({ x: G.x + (p.x - G.x) * Math.cos(t) - (p.y - G.y) * Math.sin(t), y: G.y + (p.x - G.x) * Math.sin(t) + (p.y - G.y) * Math.cos(t) }), false)
  }

  // kenarlar: a = BC (A’nın karşısı), b = CA, c = AB
  const sides = [
    { name: 'a', p: B, q: C, opp: A, len: m.a, col: COL.A },
    { name: 'b', p: C, q: A, opp: B, len: m.b, col: COL.B },
    { name: 'c', p: A, q: B, opp: C, len: m.c, col: COL.C },
  ]
  const lens = [m.a, m.b, m.c]
  const iMax = lens.indexOf(Math.max(...lens)), iMin = lens.indexOf(Math.min(...lens))
  const uniqMax = lens.filter((l) => Math.abs(l - lens[iMax]) < 1e-6).length === 1
  const uniqMin = lens.filter((l) => Math.abs(l - lens[iMin]) < 1e-6).length === 1
  const hi = (i: number) => (!value.show.big || m.degenerate ? null : i === iMax && uniqMax ? BIG : i === iMin && uniqMin ? SMALL : null)

  // köşe açılarının matematik yönleri
  const wedges = names.map((k, i) => {
    const V0 = pts[k], U = pts[names[(i + 1) % 3]], W = pts[names[(i + 2) % 3]]
    const t1 = Math.atan2(U.y - V0.y, U.x - V0.x), t2 = Math.atan2(W.y - V0.y, W.x - V0.x)
    const d = (((t2 - t1) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const start = d <= Math.PI ? t1 : t2
    const sweep = (m.raw[i] * Math.PI) / 180
    return { k, V: V0, start, sweep }
  })

  // açı koparma animasyonu
  const [t, setT] = useState(value.show.torn ? 1 : 0)
  useEffect(() => {
    const goal = value.show.torn ? 1 : 0
    let raf = 0
    const t0 = performance.now(), from = t
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 900)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      setT(from + (goal - from) * e)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.show.torn])
  const minY = Math.min(A.y, B.y, C.y)
  const R = Math.max(22, Math.min(40, Math.min(m.a, m.b, m.c) * P.unitPx * 0.32))
  const RT = 50
  const T = { x: P.sx(G.x), y: Math.min(P.height - 34, P.sy(minY) + RT + 42) }

  const poly = `${P.sx(A.x)},${P.sy(A.y)} ${P.sx(B.x)},${P.sy(B.y)} ${P.sx(C.x)},${P.sy(C.y)}`

  return (
    <g>
      {/* Pisagor kareleri */}
      {value.show.pyth && !m.degenerate && sides.map((s) => {
        const L = s.len
        const ux = (s.q.x - s.p.x) / L, uy = (s.q.y - s.p.y) / L
        let nx = -uy, ny = ux
        const mid = { x: (s.p.x + s.q.x) / 2, y: (s.p.y + s.q.y) / 2 }
        if ((s.opp.x - mid.x) * nx + (s.opp.y - mid.y) * ny > 0) { nx = -nx; ny = -ny }
        const q2 = { x: s.q.x + nx * L, y: s.q.y + ny * L }, p2 = { x: s.p.x + nx * L, y: s.p.y + ny * L }
        const c = { x: mid.x + (nx * L) / 2, y: mid.y + (ny * L) / 2 }
        const area = L * L
        const col = hi(sides.indexOf(s)) ?? s.col
        return (
          <g key={s.name} pointerEvents="none">
            <polygon points={[s.p, s.q, q2, p2].map((p) => `${P.sx(p.x)},${P.sy(p.y)}`).join(' ')} fill={col} fillOpacity={0.13} stroke={col} strokeWidth={2} strokeDasharray="6 4" />
            <text x={P.sx(c.x)} y={P.sy(c.y) - 2} textAnchor="middle" fontSize={15} fontWeight={900} fill={col}>{s.name}² = {isInt(area) ? Math.round(area) : fmt(area)}</text>
            <text x={P.sx(c.x)} y={P.sy(c.y) + 15} textAnchor="middle" fontSize={11} fontWeight={800} fill={col} opacity={0.8}>birim kare</text>
          </g>
        )
      })}

      {/* üçgen gövdesi: tek parmak taşı, iki parmak ölçekle/döndür */}
      <Pinchable onMove={locked ? undefined : onMove} onScale={locked ? undefined : onScale} onRotate={locked ? undefined : onRotate}>
        <polygon points={poly} fill="#d6457a" fillOpacity={0.1} stroke="transparent" strokeWidth={30} strokeLinejoin="round" />
      </Pinchable>

      {/* açı dilimleri (yerinde) */}
      {wedges.map((w, i) => {
        const cx = P.sx(w.V.x), cy = P.sy(w.V.y)
        const col = hi(i) ?? COL[w.k]
        const right = Math.abs(m.raw[i] - 90) < 0.6
        const mid = w.start + w.sweep / 2
        const lr = R + 17
        if (m.degenerate) return null
        return (
          <g key={w.k} pointerEvents="none" opacity={t > 0 ? 0.35 : 1}>
            {right && !task ? (
              <path d={`M${cx + 16 * Math.cos(w.start)} ${cy - 16 * Math.sin(w.start)} l${16 * Math.cos(w.start + Math.PI / 2)} ${-16 * Math.sin(w.start + Math.PI / 2)} l${-16 * Math.cos(w.start)} ${16 * Math.sin(w.start)}`} fill="none" stroke={col} strokeWidth={2.5} />
            ) : (
              <path d={wedgePath(cx, cy, R, w.start, w.sweep)} fill={col} fillOpacity={t > 0 ? 0.08 : 0.22} stroke={col} strokeWidth={2} strokeDasharray={t > 0 ? '4 3' : undefined} />
            )}
            {t === 0 && <text x={cx + lr * Math.cos(mid)} y={cy - lr * Math.sin(mid) + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill={col} paintOrder="stroke" stroke="#fff" strokeWidth={4}>{m.deg[i]}°</text>}
          </g>
        )
      })}

      {/* kenarlar */}
      {sides.map((s, i) => {
        const col = hi(i)
        return <line key={s.name} x1={P.sx(s.p.x)} y1={P.sy(s.p.y)} x2={P.sx(s.q.x)} y2={P.sy(s.q.y)} stroke={col ?? '#1f2340'} strokeWidth={col ? 6 : 3.5} strokeLinecap="round" pointerEvents="none" />
      })}
      {sides.map((s, i) => {
        const mid = { x: (P.sx(s.p.x) + P.sx(s.q.x)) / 2, y: (P.sy(s.p.y) + P.sy(s.q.y)) / 2 }
        const o = { x: P.sx(s.opp.x) - mid.x, y: P.sy(s.opp.y) - mid.y }
        const ol = Math.hypot(o.x, o.y) || 1
        const L2 = s.len * s.len
        const txt = `${s.name} = ${isInt(s.len) ? Math.round(s.len) : (isInt(L2) && value.snap ? '√' + Math.round(L2) + ' ≈ ' : '') + fmt(s.len)}`
        const half = Math.abs(o.x / ol) * (txt.length * 3.8 + 6) + Math.abs(o.y / ol) * 11
        const off = -(half + 6)
        return <Pill key={s.name} x={mid.x + (o.x / ol) * off} y={mid.y + (o.y / ol) * off} text={txt} color={hi(i) ?? s.col} />
      })}

      {/* koparılan açılar: düz bir doğru üzerinde */}
      {t > 0 && !m.degenerate && (
        <g pointerEvents="none">
          <line x1={T.x - RT * 1.9} x2={T.x + RT * 1.9} y1={T.y} y2={T.y} stroke="#1f2340" strokeWidth={2.5} strokeDasharray="7 5" opacity={t} />
          {wedges.map((w, i) => {
            const targetStart = i === 0 ? 0 : i === 1 ? (m.raw[0] * Math.PI) / 180 : ((m.raw[0] + m.raw[1]) * Math.PI) / 180
            let rot = targetStart - w.start
            rot = Math.atan2(Math.sin(rot), Math.cos(rot))
            const cx = P.sx(w.V.x) + (T.x - P.sx(w.V.x)) * t, cy = P.sy(w.V.y) + (T.y - P.sy(w.V.y)) * t
            const s = w.start + rot * t
            const col = hi(i) ?? COL[w.k]
            const mid = s + w.sweep / 2
            return (
              <g key={w.k}>
                <path d={wedgePath(cx, cy, R + (RT - R) * t, s, w.sweep)} fill={col} fillOpacity={0.55} stroke="#fff" strokeWidth={2} />
                {t > 0.95 && w.sweep > 0.22 && <text x={cx + RT * 0.66 * Math.cos(mid)} y={cy - RT * 0.66 * Math.sin(mid) + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">{m.deg[i]}°</text>}
              </g>
            )
          })}
          {t > 0.95 && !task && <Pill x={T.x} y={T.y + 22} text={`${m.deg[0]}° + ${m.deg[1]}° + ${m.deg[2]}° = 180°`} color="#1f2340" bg="#fffbeb" />}
        </g>
      )}

      {names.map((k) => (
        <DragPoint key={k} x={pts[k].x} y={pts[k].y} label={k} color={COL[k]} r={12} disabled={locked} onChange={(p) => onChange({ ...value, [k]: sn(p) })} />
      ))}
    </g>
  )
}

/* ───────────────────────────── Kenar (eşitsizlik) sahnesi ───────────────────────────── */
function InequalityScene({ sides }: { sides: [number, number, number] }) {
  const P = usePlane()
  const [a, b, c] = sides // a = BC, b = CA, c = AB
  const A = { x: -c / 2, y: 0 }, B = { x: c / 2, y: 0 }
  const x = (b * b - a * a + c * c) / (2 * c)
  const h2 = b * b - x * x
  const closes = h2 > 1e-9
  const flat = Math.abs(h2) <= 1e-9
  const Cp = closes || flat ? { x: A.x + x, y: Math.sqrt(Math.max(0, h2)) } : null
  const px = (p: Pt) => [P.sx(p.x), P.sy(p.y)] as const
  // kapanmıyorsa kollar taban doğrultusunda yatar
  let armA: Pt, armB: Pt
  if (Cp) { armA = Cp; armB = Cp }
  else if (a + b < c) { armA = { x: A.x + b, y: 0 }; armB = { x: B.x - a, y: 0 } }
  else if (b >= a + c) { armA = { x: A.x + b, y: 0 }; armB = { x: B.x + a, y: 0 } }
  else { armA = { x: A.x - b, y: 0 }; armB = { x: B.x - a, y: 0 } }
  const gap = Cp ? 0 : Math.abs(armA.x - armB.x)
  const lift = Cp ? 0 : 0.35
  return (
    <g pointerEvents="none">
      <circle cx={P.sx(A.x)} cy={P.sy(0)} r={b * P.unitPx} fill="none" stroke={COL.B} strokeWidth={1.5} strokeDasharray="5 6" opacity={0.6} />
      <circle cx={P.sx(B.x)} cy={P.sy(0)} r={a * P.unitPx} fill="none" stroke={COL.A} strokeWidth={1.5} strokeDasharray="5 6" opacity={0.6} />
      {Cp && closes && <polygon points={[A, B, Cp].map((p) => px(p).join(',')).join(' ')} fill="#16a34a" fillOpacity={0.12} />}
      <line x1={px(A)[0]} y1={px(A)[1]} x2={px(B)[0]} y2={px(B)[1]} stroke={COL.C} strokeWidth={7} strokeLinecap="round" />
      <line x1={px(A)[0]} y1={px(A)[1] - (lift ? 9 : 0)} x2={px(armA)[0]} y2={px(armA)[1] - (lift ? 9 : 0)} stroke={COL.B} strokeWidth={7} strokeLinecap="round" />
      <line x1={px(B)[0]} y1={px(B)[1] - (lift ? 18 : 0)} x2={px(armB)[0]} y2={px(armB)[1] - (lift ? 18 : 0)} stroke={COL.A} strokeWidth={7} strokeLinecap="round" />
      {!Cp && (
        <g>
          <path d={`M${px(armA)[0]} ${px(A)[1] - 28}v-8H${px(armB)[0]}v8`} stroke="#e11d48" strokeWidth={2.5} fill="none" />
          <text x={(px(armA)[0] + px(armB)[0]) / 2} y={px(A)[1] - 44} textAnchor="middle" fontSize={15} fontWeight={900} fill="#e11d48" paintOrder="stroke" stroke="#fff" strokeWidth={4}>boşluk {fmt(gap)}</text>
        </g>
      )}
      {Cp && <circle cx={px(Cp)[0]} cy={px(Cp)[1]} r={8} fill={flat ? '#e11d48' : '#16a34a'} stroke="#fff" strokeWidth={3} />}
      <circle cx={px(A)[0]} cy={px(A)[1]} r={8} fill={COL.A} stroke="#fff" strokeWidth={3} />
      <circle cx={px(B)[0]} cy={px(B)[1]} r={8} fill={COL.B} stroke="#fff" strokeWidth={3} />
      <text x={px(A)[0] - 12} y={px(A)[1] + 22} textAnchor="end" fontSize={14} fontWeight={900} fill={COL.A}>A</text>
      <text x={px(B)[0] + 12} y={px(B)[1] + 22} fontSize={14} fontWeight={900} fill={COL.B}>B</text>
      {Cp && <text x={px(Cp)[0] + 12} y={px(Cp)[1] - 10} fontSize={14} fontWeight={900} fill={COL.C}>C</text>}
      <Pill x={(px(A)[0] + px(B)[0]) / 2} y={px(A)[1] + 24} text={`c = ${fmt(c)}`} color={COL.C} />
      {Cp && <Pill x={(px(A)[0] + px(Cp)[0]) / 2 - 22} y={(px(A)[1] + px(Cp)[1]) / 2} text={`b = ${fmt(b)}`} color={COL.B} />}
      {Cp && <Pill x={(px(B)[0] + px(Cp)[0]) / 2 + 22} y={(px(B)[1] + px(Cp)[1]) / 2} text={`a = ${fmt(a)}`} color={COL.A} />}
    </g>
  )
}

/* ───────────────────────────── Kaydırıcı ───────────────────────────── */
function Slider({ label, value, min, max, step, color, onChange, disabled }: { label: ReactNode; value: number; min: number; max: number; step: number; color: string; onChange: (v: number) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (cx: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const f = Math.max(0, Math.min(1, (cx - r.left - 22) / (r.width - 44)))
    const v = Math.round((min + f * (max - min)) / step) * step
    if (v !== value) onChange(v)
  }
  const f = (value - min) / (max - min)
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-lg font-black" style={{ color }}>{label}</span>
      <div
        ref={ref}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        className="relative h-12 flex-1 cursor-pointer"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX) }}
        onPointerMove={(e) => !disabled && e.currentTarget.hasPointerCapture(e.pointerId) && set(e.clientX)}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') onChange(Math.min(max, value + step)); if (e.key === 'ArrowLeft') onChange(Math.max(min, value - step)) }}
      >
        <div className="absolute inset-x-[22px] top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-line" />
        <div className="absolute top-1/2 left-[22px] h-2.5 -translate-y-1/2 rounded-full" style={{ width: `calc((100% - 44px) * ${f})`, background: color }} />
        <div className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-black text-white shadow-md ring-4 ring-white" style={{ left: `calc(22px + (100% - 44px) * ${f})`, background: color }}>{fmt(value)}</div>
      </div>
    </div>
  )
}


/** Dar ekran (telefon) mı? */
function useNarrow(q = '(max-width: 640px)') {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [q])
  return m
}

/* ───────────────────────────── Araç ───────────────────────────── */
function Chip({ on, children, color = '#d6457a' }: { on: boolean; children: ReactNode; color?: string }) {
  return (
    <span className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm font-extrabold ring-1 transition ${on ? 'text-white shadow' : 'bg-white text-ink-soft/60 ring-line'}`} style={on ? { background: color, boxShadow: `0 0 0 1px ${color}` } : undefined}>
      {children}
    </span>
  )
}

const INIT: V = {
  A: { x: -2, y: -1 },
  B: { x: 3, y: -1 },
  C: { x: 0, y: 2 },
  snap: true,
  mode: 'ucgen',
  sides: [4, 5, 7],
  show: { pyth: false, big: false, torn: false },
  answer: null,
}

export const dinamikucgen: ToolDef<V> = {
  id: 'dinamikucgen',
  defaultConfig: {},
  initial: (_c, t) => (t ? { ...INIT, A: { x: -3, y: -2 }, B: { x: 3, y: -2 }, C: { x: -1, y: 2 }, answer: typeof t.angleSum === 'number' ? 90 : null } : INIT),
  check: (v, t) => {
    const m = measure(v)
    if (typeof t.angleSum === 'number') return v.answer === t.angleSum
    if (m.degenerate) return false
    if (t.type) {
      const want = (Array.isArray(t.type) ? t.type : [t.type]).map((x) => norm(String(x)))
      const c = classify(m)
      for (const w of want) {
        if (w === 'ikizkenar' ? c.bySide === 'cesitkenar' : w !== c.byAngle && w !== c.bySide) return false
      }
    }
    if (Array.isArray(t.sides)) {
      const want = (t.sides as number[]).slice().sort((p, q) => p - q), have = [m.a, m.b, m.c].sort((p, q) => p - q)
      if (want.some((w, i) => Math.abs(w - have[i]) > 0.05)) return false
    }
    if (Array.isArray(t.angles)) {
      const want = (t.angles as number[]).slice().sort((p, q) => p - q), have = m.raw.slice().sort((p, q) => p - q)
      if (want.some((w, i) => Math.abs(w - have[i]) > 1)) return false
    }
    return true
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const narrow = useNarrow()
    const m = measure(value)
    const cls = classify(m)
    const show = (k: keyof V['show']) => onChange({ ...value, show: { ...value.show, [k]: !value.show[k] } })
    const kenar = value.mode === 'kenar'
    const [sa, sb, sc] = value.sides
    const ineq = [
      { l: `a + b > c`, x: sa + sb, y: sc, s: `${fmt(sa)} + ${fmt(sb)}`, t: fmt(sc) },
      { l: `b + c > a`, x: sb + sc, y: sa, s: `${fmt(sb)} + ${fmt(sc)}`, t: fmt(sa) },
      { l: `a + c > b`, x: sa + sc, y: sb, s: `${fmt(sa)} + ${fmt(sc)}`, t: fmt(sb) },
    ]
    const ok = ineq.every((q) => q.x > q.y + 1e-9)
    const flat = !ok && ineq.every((q) => q.x >= q.y - 1e-9)
    const setSide = (i: number, x: number) => { const s = value.sides.slice() as V['sides']; s[i] = x; onChange({ ...value, sides: s }) }

    // Pisagor karşılaştırması
    const sq = [m.a * m.a, m.b * m.b, m.c * m.c]
    const iMax = sq.indexOf(Math.max(...sq))
    const others = [0, 1, 2].filter((i) => i !== iMax)
    const sumO = sq[others[0]] + sq[others[1]]
    const nm = ['a', 'b', 'c']
    const nice = (x: number) => (value.snap && isInt(x) ? String(Math.round(x)) : fmt(x))
    const rel = Math.abs(sumO - sq[iMax]) < 0.02 * sq[iMax] && cls.byAngle === 'dik' ? '=' : sumO > sq[iMax] ? '>' : '<'

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
        <div className="flex flex-col gap-3">
          {!task && (
            <div className="flex flex-wrap justify-center gap-1.5">
              <ToolButton active={!kenar} onClick={() => onChange({ ...value, mode: 'ucgen' })}>🔺 Köşeleri sürükle</ToolButton>
              <ToolButton active={kenar} onClick={() => onChange({ ...value, mode: 'kenar', sides: kenar ? value.sides : ([Math.max(1, Math.round(m.a * 2) / 2), Math.max(1, Math.round(m.b * 2) / 2), Math.max(1, Math.round(m.c * 2) / 2)] as V['sides']) })}>📏 Üçgen eşitsizliği</ToolButton>
            </div>
          )}
          {kenar ? (
            <Plane key={`kenar${narrow}`} initial={narrow ? { xMin: -7, xMax: 7, yMin: -3, yMax: 9 } : { xMin: -9, xMax: 9, yMin: -3, yMax: 9 }} aspect={narrow ? 0.85 : 0.7} label="Üçgen eşitsizliği" locked={locked}>
              <InequalityScene sides={value.sides} />
            </Plane>
          ) : (
            <Plane key={`ucgen${narrow}`} initial={narrow ? { xMin: -5.5, xMax: 5.5, yMin: -5, yMax: 5.5 } : { xMin: -8, xMax: 8, yMin: -6, yMax: 6.5 }} aspect={narrow ? 0.95 : 0.78} label="Dinamik üçgen" xLabel="x" yLabel="y" locked={locked}>
              <TriangleScene value={value} onChange={onChange} locked={locked} task={task} />
            </Plane>
          )}
          {kenar ? (
            <div className="flex flex-col gap-1 rounded-2xl bg-white p-3 ring-1 ring-line">
              <Slider label="a" value={sa} min={0.5} max={12} step={0.5} color={COL.A} onChange={(x) => setSide(0, x)} disabled={locked} />
              <Slider label="b" value={sb} min={0.5} max={12} step={0.5} color={COL.B} onChange={(x) => setSide(1, x)} disabled={locked} />
              <Slider label="c" value={sc} min={0.5} max={12} step={0.5} color={COL.C} onChange={(x) => setSide(2, x)} disabled={locked} />
            </div>
          ) : (
            <>
              <p className="text-center text-sm font-bold text-ink-soft">Köşeleri sürükle. Üçgenin içinde iki parmakla büyüt, küçült ya da döndür.</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                <ToolButton active={value.snap} onClick={() => onChange({ ...value, snap: !value.snap })}>{value.snap ? '🧲 Izgaraya yapış: açık' : '🧲 Izgaraya yapış: kapalı'}</ToolButton>
                <ToolButton active={value.show.torn} onClick={() => show('torn')} disabled={m.degenerate}>✂️ Açıları kopar</ToolButton>
                <ToolButton active={value.show.big} onClick={() => show('big')}>↔️ Kenar–açı ilişkisi</ToolButton>
                <ToolButton active={value.show.pyth} onClick={() => show('pyth')}>⬛ Kenarlara kare</ToolButton>
              </div>
            </>
          )}
        </div>

        <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {kenar ? (
            <>
              <div className={`rounded-2xl p-3 text-center font-black ring-1 sm:col-span-2 lg:col-span-1 ${ok ? 'bg-ok-soft text-green-800 ring-green-300' : 'bg-bad-soft text-rose-800 ring-rose-200'}`}>
                {ok ? 'Üçgen kapandı! ✓' : flat ? 'Kollar ancak düz bir çizgi olarak birleşti: üçgen “yassılaştı”.' : 'Üçgen kapanmıyor: kollar birbirine yetişemiyor.'}
              </div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line sm:col-span-2 lg:col-span-1">
                <p className="mb-2 text-sm font-black">Her iki kenarın toplamı üçüncüden büyük mü?</p>
                <ul className="flex flex-col gap-1.5">
                  {ineq.map((q) => {
                    const good = q.x > q.y + 1e-9
                    return (
                      <li key={q.l} className={`flex items-center justify-between rounded-xl px-3 py-1.5 font-black tabular-nums ${good ? 'bg-ok-soft text-green-800' : 'bg-bad-soft text-rose-800'}`}>
                        <span>{q.s} {good ? '>' : q.x === q.y ? '=' : '<'} {q.t}</span>
                        <span>{good ? '✓' : '✗'}</span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-xs font-bold text-ink-soft">İki kısa kenarın toplamı en uzun kenardan büyük olmalı. Eşitse kollar düz yatar; küçükse aralarında boşluk kalır.</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                <p className="mb-1.5 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Açılar</p>
                <div className="flex justify-around text-2xl font-black tabular-nums">
                  {(['A', 'B', 'C'] as const).map((k, i) => <span key={k} style={{ color: COL[k] }}>{k}: {m.deg[i]}°</span>)}
                </div>
                {!task && !m.degenerate && (
                  <p className="mt-2 rounded-xl bg-amber-50 py-1.5 text-center font-black text-amber-900 tabular-nums">{m.deg[0]}° + {m.deg[1]}° + {m.deg[2]}° = 180°</p>
                )}
                <p className="mb-1.5 mt-3 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Kenarlar</p>
                <div className="flex justify-around text-lg font-black tabular-nums">
                  <span style={{ color: COL.A }}>a = {fmt(m.a)}</span>
                  <span style={{ color: COL.B }}>b = {fmt(m.b)}</span>
                  <span style={{ color: COL.C }}>c = {fmt(m.c)}</span>
                </div>
              </div>
              {!task && (
                <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-line">
                  {m.degenerate ? (
                    <p className="font-black text-rose-700">Köşeler aynı doğru üzerinde: üçgen oluşmadı.</p>
                  ) : (
                    <>
                      <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Açılarına göre</span>
                      <div className="flex flex-wrap gap-1.5">{(['dar', 'dik', 'genis'] as const).map((k) => <Chip key={k} on={cls.byAngle === k}>{NAMES[k]}</Chip>)}</div>
                      <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Kenarlarına göre</span>
                      <div className="flex flex-wrap gap-1.5">{(['cesitkenar', 'ikizkenar', 'eskenar'] as const).map((k) => <Chip key={k} on={cls.bySide === k || (k === 'ikizkenar' && cls.bySide === 'eskenar')} color="#1f2340">{NAMES[k]}</Chip>)}</div>
                    </>
                  )}
                </div>
              )}
              {!task && value.show.big && !m.degenerate && (
                <div className="self-start rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950 ring-1 ring-amber-200">
                  <span className="font-black" style={{ color: BIG }}>En uzun kenarın</span> karşısında <span className="font-black" style={{ color: BIG }}>en büyük açı</span>, <span className="font-black" style={{ color: SMALL }}>en kısa kenarın</span> karşısında <span className="font-black" style={{ color: SMALL }}>en küçük açı</span> var. Bir köşeyi uzaklaştır: hangisi büyüyor?
                </div>
              )}
              {!task && value.show.pyth && !m.degenerate && (
                <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                  <p className="text-sm font-black">Küçük iki karenin toplamı, büyük kareyle karşılaştır:</p>
                  <p className="mt-1 text-center text-xl font-black tabular-nums">
                    {nm[others[0]]}² + {nm[others[1]]}² {rel} {nm[iMax]}²
                  </p>
                  <p className="text-center font-black text-ink-soft tabular-nums">{nice(sq[others[0]])} + {nice(sq[others[1]])} = {nice(sumO)} {rel} {nice(sq[iMax])}</p>
                  <p className="mt-1 text-xs font-bold text-ink-soft">
                    {rel === '=' ? 'Eşit! Bu bir dik üçgen (Pisagor bağıntısı).' : rel === '>' ? 'Toplam daha büyük → en büyük açı 90°’den küçük (dar açılı).' : 'Toplam daha küçük → en büyük açı 90°’den büyük (geniş açılı).'}
                  </p>
                </div>
              )}
              {task && typeof target?.angleSum === 'number' && (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-brand-soft p-3">
                  <p className="text-center font-black text-brand-ink">Üç açının toplamı kaç derece?</p>
                  <div className="flex items-center gap-1">
                    {[-10, -1].map((d) => <ToolButton key={d} disabled={locked} onClick={() => onChange({ ...value, answer: Math.max(0, (value.answer ?? 0) + d) })}>{d}</ToolButton>)}
                    <span className="min-w-20 text-center text-3xl font-black text-brand tabular-nums">{value.answer ?? 0}°</span>
                    {[1, 10].map((d) => <ToolButton key={d} disabled={locked} onClick={() => onChange({ ...value, answer: Math.min(720, (value.answer ?? 0) + d) })}>+{d}</ToolButton>)}
                  </div>
                  <p className="text-center text-xs font-bold text-ink-soft">İpucu: “Açıları kopar” ile açıları yan yana koy. Üçgeni değiştir: toplam değişiyor mu?</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    )
  },
}
