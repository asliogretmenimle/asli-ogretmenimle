import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Play, RotateCw, Trash2 } from 'lucide-react'
import { BigButton } from '../../kit2'
import { useFrame } from '../../kit'
import { ARRIVALS, CELL_M, RIDES, num, tl, type LayoutLevel, type RideId } from './levels'
import { Shell, useApi } from './shell'
import { NumPad, Sign, Stat } from './ui'

interface Placed { id: RideId; x: number; y: number; r: boolean }
interface Rect { x: number; y: number; w: number; h: number }
interface SimResult { revenue: number; served: number; maxWait: number; hours: { wait: number[]; revenue: number }[] }
interface Design { key: string; ids: RideId[]; placed: Placed[]; res: SimResult; area: number; cost: number }

const C = 56
const M = 26
const dimsOf = (p: Placed) => {
  const s = RIDES[p.id]
  return p.r ? { w: s.h, h: s.w } : { w: s.w, h: s.h }
}
const rectOf = (p: Placed): Rect => ({ x: p.x, y: p.y, ...dimsOf(p) })
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const areaM = (id: RideId) => RIDES[id].w * CELL_M * RIDES[id].h * CELL_M

/** Bir günlük basit simülasyon: her saat gelen ziyaretçiler oyuncaklara isteklerine göre dağılır, kapasiteyi aşanlar kuyrukta bekler. */
export function simulate(ids: RideId[]): SimResult {
  const rides = ids.map((id) => RIDES[id])
  const W = rides.reduce((a, r) => a + r.weight, 0)
  const q = rides.map(() => 0)
  let revenue = 0, served = 0, maxWait = 0
  const hours: SimResult['hours'] = []
  for (const A of ARRIVALS) {
    rides.forEach((r, i) => {
      q[i] += (A * r.weight) / W
      const s = Math.min(q[i], r.cap)
      q[i] -= s
      served += s
      revenue += s * r.price
      maxWait = Math.max(maxWait, (q[i] / r.cap) * 60)
    })
    hours.push({ wait: q.map((x, i) => Math.round((x / rides[i].cap) * 60)), revenue: Math.round(revenue / 10) * 10 })
  }
  return { revenue: Math.round(revenue / 10) * 10, served: Math.round(served), maxWait: Math.round(maxWait), hours }
}

export function LayoutTask({ level }: { level: LayoutLevel }) {
  const api = useApi()
  const [placed, setPlaced] = useState<Placed[]>([])
  const [sel, setSel] = useState<RideId | null>(null)
  const [phase, setPhase] = useState<'work' | 'area' | 'sim'>('work')
  const [areaKnown, setAreaKnown] = useState(!level.askArea)
  const [designs, setDesigns] = useState<Design[]>([])
  const [simT, setSimT] = useState(0)
  const sim = useRef<{ ids: RideId[]; res: SimResult; key: string; area: number; cost: number; placed: Placed[] } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: RideId; ox: number; oy: number; moved: boolean; sx: number; sy: number } | null>(null)
  const VW = level.cols * C + 2 * M, VH = level.rows * C + 2 * M

  const top = useMemo(() => (level.survey && level.mustTop ? [...level.survey].sort((a, b) => b.votes - a.votes).slice(0, level.mustTop).map((s) => s.id) : []), [level])
  const blocks: Rect[] = level.obstacles.map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h }))
  const bad = (p: Placed, list = placed) => {
    const r = rectOf(p)
    if (r.x < 0 || r.y < 0 || r.x + r.w > level.cols || r.y + r.h > level.rows) return true
    return blocks.some((b) => overlap(r, b)) || list.some((o) => o.id !== p.id && overlap(r, rectOf(o)))
  }
  const cost = placed.reduce((a, p) => a + RIDES[p.id].cost, 0)
  const area = placed.reduce((a, p) => a + areaM(p.id), 0)
  const anyBad = placed.some((p) => bad(p))

  const findSpot = (id: RideId): Placed | null => {
    for (const r of [false, true]) {
      const d = dimsOf({ id, x: 0, y: 0, r })
      for (let y = 0; y + d.h <= level.rows; y++) for (let x = 0; x + d.w <= level.cols; x++) {
        const p = { id, x, y, r }
        if (!bad(p)) return p
      }
    }
    return null
  }
  const addRide = (id: RideId) => {
    if (phase !== 'work') return
    if (placed.some((p) => p.id === id)) return setSel(id)
    const p = findSpot(id)
    if (!p) return api.nudge(`Haritada ${RIDES[id].name.toLocaleLowerCase('tr')} için boş yer kalmadı. Oyuncakları sürükleyip yer aç ya da birini kaldır.`)
    setPlaced((l) => [...l, p])
    setSel(id)
    api.nudge(null)
  }
  const remove = (id: RideId) => {
    setPlaced((l) => l.filter((p) => p.id !== id))
    setSel(null)
  }
  const rotate = (id: RideId) => {
    setPlaced((l) => l.map((p) => {
      if (p.id !== id) return p
      const n = { ...p, r: !p.r }
      const d = dimsOf(n)
      n.x = Math.min(n.x, level.cols - d.w)
      n.y = Math.min(n.y, level.rows - d.h)
      return n
    }))
  }

  const pt = (e: { clientX: number; clientY: number }) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: (p.x - M) / C, y: (p.y - M) / C }
  }
  const down = (p: Placed) => (e: RPointerEvent) => {
    if (phase !== 'work') return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    const q = pt(e)
    drag.current = { id: p.id, ox: q.x - p.x, oy: q.y - p.y, moved: false, sx: e.clientX, sy: e.clientY }
  }
  const move = (e: RPointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
    d.moved = true
    const q = pt(e)
    setPlaced((l) => l.map((p) => {
      if (p.id !== d.id) return p
      const dm = dimsOf(p)
      return { ...p, x: Math.max(0, Math.min(level.cols - dm.w, Math.round(q.x - d.ox))), y: Math.max(0, Math.min(level.rows - dm.h, Math.round(q.y - d.oy))) }
    }))
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) setSel((s) => (s === d.id ? null : d.id))
    else if (d) setSel(d.id)
  }

  const startSim = (ids: RideId[], key: string) => {
    sim.current = { ids, key, res: simulate(ids), area, cost, placed }
    setSimT(0)
    setPhase('sim')
    setSel(null)
    api.nudge(null)
  }
  useFrame((dt) => {
    setSimT((t) => {
      const n = t + Math.max(0, dt) * 1.45
      if (n >= ARRIVALS.length) {
        setTimeout(finishSim, 0)
        return ARRIVALS.length
      }
      return n
    })
  }, phase === 'sim')

  const finishSim = () => {
    const s = sim.current
    if (!s) return
    sim.current = null
    setPhase('work')
    const d: Design = { key: s.key, ids: s.ids, placed: s.placed, res: s.res, area: s.area, cost: s.cost }
    api.report(true)
    api.add(s.key, `${s.ids.map((id) => RIDES[id].emoji).join('')} ${tl(s.res.revenue)}`)
    const list = [...designs, d]
    setDesigns(list)
    const msg = `Park ${list.length} kapandı: ${num(s.res.served)} kişi bindi, gelir ${tl(s.res.revenue)}, en uzun bekleme ${s.res.maxWait} dk.`
    if (list.length >= level.goal) {
      api.strategy('Simülasyonla karşılaştırdım')
      const best = [...list].sort((a, b) => b.res.revenue - a.res.revenue)[0]
      const shortQ = [...list].sort((a, b) => a.res.maxWait - b.res.maxWait)[0]
      api.complete(`${msg} En çok geliri ${best.ids.map((id) => RIDES[id].emoji).join('')} parkı getirdi; en kısa kuyruk ${shortQ.ids.map((id) => RIDES[id].emoji).join('')} parkında. Bir tasarım her konuda en iyi olmayabilir!`)
    } else api.nudge(`${msg} Şimdi farklı oyuncaklarla ikinci bir park tasarla ve sonuçları karşılaştır!`, { tone: 'ok' })
  }

  const afterArea = (ids: RideId[], key: string) => {
    if (area > level.areaMax) {
      api.report(false)
      return api.nudge(`Toplam alan ${num(area)} m², sınır ${num(level.areaMax)} m²: ${num(area - level.areaMax)} m² fazla. Hangi oyuncağı daha küçük biriyle değiştirebilirsin?`)
    }
    startSim(ids, key)
  }

  const open = () => {
    if (phase !== 'work') return
    if (placed.length < level.minRides) return api.nudge(`En az ${level.minRides} oyuncak yerleştirmelisin. Şu an ${placed.length} oyuncak var.`)
    if (anyBad) return api.nudge('Kırmızı çizgili oyuncak başka bir yapının, gölün ya da girişin üstünde. Onu boş bir yere sürükle.')
    const ids = placed.map((p) => p.id).sort()
    if (top.length && top.some((t) => !ids.includes(t))) {
      api.report(false)
      return api.nudge('Anket grafiğine bak: en çok istenen 2 oyuncak parkında mı? En uzun iki sütun hangileri?', { mis: 'Veriye dayalı karar vermedi (anketi kullanmadı)' })
    }
    if (cost > level.budget) {
      api.report(false)
      return api.nudge(`Kurulum ${tl(cost)}, bütçe ${tl(level.budget)}: ${tl(cost - level.budget)} fazla. Hangi oyuncağı daha ucuz biriyle değiştirebilirsin?`)
    }
    const key = ids.join('+')
    if (designs.some((d) => d.key === key)) return api.nudge('Bu oyuncaklarla zaten bir park kurdun. Karşılaştırmak için farklı bir oyuncak seçimi dene!')
    if (!areaKnown) {
      setPhase('area')
      return api.nudge('Parkı açmadan önce bir kontrol: oyuncakların kapladığı toplam alan kaç m²? Sınırı aşıyor mu?', { tone: 'ok' })
    }
    afterArea(ids, key)
  }

  const submitArea = (n: number) => {
    const ids = placed.map((p) => p.id).sort()
    if (n === area) {
      api.report(true)
      api.strategy('Önce alanı hesapladım')
      setAreaKnown(true)
      setPhase('work')
      api.nudge(`Evet! ${placed.map((p) => `${RIDES[p.id].w * CELL_M} × ${RIDES[p.id].h * CELL_M}`).join(' + ')} = ${num(area)} m².`, { tone: 'ok' })
      setTimeout(() => afterArea(ids, ids.join('+')), 900)
      return
    }
    api.report(false)
    const cells = placed.reduce((a, p) => a + RIDES[p.id].w * RIDES[p.id].h, 0)
    const sideSum = placed.reduce((a, p) => a + (RIDES[p.id].w + RIDES[p.id].h) * CELL_M, 0)
    if (n === cells) return api.nudge(`${n}, kare sayısı. Ama her kare 5 m × 5 m = 25 m². Oyuncakların kenarlarını metreyle düşün.`, { mis: 'Kare sayısını m² sandı' })
    if (n === sideSum * 2) return api.nudge('Bu çevre uzunluklarının toplamı. Alan, içini kaplayan birim karelerdir: kenar × kenar.', { mis: 'Alan yerine çevre hesapladı' })
    if (n === sideSum) return api.nudge('Kenarları topladın. Bir dikdörtgenin alanı için kenarlar çarpılır: 20 m × 20 m = 400 m².', { mis: 'Alan için kenarları topladı' })
    api.nudge(`Her oyuncağın alanını ayrı bul, sonra topla: ${placed.map((p) => `${RIDES[p.id].name} ${RIDES[p.id].w * CELL_M} m × ${RIDES[p.id].h * CELL_M} m`).join(', ')}.`)
  }

  /* ── sahne ── */
  const hour = Math.max(0, Math.min(ARRIVALS.length - 1, Math.floor(simT)))
  const simIds = sim.current?.ids
  const gate = level.obstacles.find((o) => o.kind === 'giris')
  const gx = gate ? M + (gate.x + gate.w / 2) * C : M, gy = gate ? M + (gate.y + gate.h / 2) * C : VH - M
  const scene = (
    <svg ref={svg} viewBox={`0 0 ${VW} ${VH}`} className="block h-auto w-full select-none" style={{ touchAction: 'none' }} role="img" aria-label="Lunapark arsası haritası" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <defs>
        <pattern id="lp-grass" width={C * 2} height={C * 2} patternUnits="userSpaceOnUse" x={M} y={M}>
          <rect width={C * 2} height={C * 2} fill="#bbf7d0" />
          <rect width={C} height={C} fill="#a7f3d0" />
          <rect x={C} y={C} width={C} height={C} fill="#a7f3d0" />
        </pattern>
        <pattern id="lp-bad" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="rgb(244 63 94 / .25)" /><line x1="0" y1="0" x2="0" y2="12" stroke="#e11d48" strokeWidth="4" /></pattern>
        <linearGradient id="lp-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#0ea5e9" /></linearGradient>
      </defs>
      <rect width={VW} height={VH} fill="#fef3c7" />
      <rect x={M} y={M} width={level.cols * C} height={level.rows * C} fill="url(#lp-grass)" />
      {Array.from({ length: level.cols + 1 }, (_, i) => <line key={`v${i}`} x1={M + i * C} x2={M + i * C} y1={M} y2={M + level.rows * C} stroke="#fff" strokeOpacity=".7" />)}
      {Array.from({ length: level.rows + 1 }, (_, i) => <line key={`h${i}`} y1={M + i * C} y2={M + i * C} x1={M} x2={M + level.cols * C} stroke="#fff" strokeOpacity=".7" />)}
      <rect x={M} y={M} width={level.cols * C} height={level.rows * C} fill="none" stroke="#a16207" strokeWidth="5" strokeDasharray="2 10" strokeLinecap="round" />
      <text x={M + (level.cols * C) / 2} y={17} textAnchor="middle" fontSize="15" fontWeight="900" fill="#92400e">← {level.cols * CELL_M} m →</text>
      <text x={13} y={M + (level.rows * C) / 2} textAnchor="middle" fontSize="15" fontWeight="900" fill="#92400e" transform={`rotate(-90 13 ${M + (level.rows * C) / 2})`}>← {level.rows * CELL_M} m →</text>
      {/* 1 kare göstergesi */}
      <g transform={`translate(${VW - M - 118} 4)`}>
        <rect width="18" height="18" fill="#a7f3d0" stroke="#15803d" />
        <text x="24" y="14" fontSize="13" fontWeight="900" fill="#166534">1 kare = 5 m × 5 m</text>
      </g>
      {level.obstacles.map((o, i) => o.kind === 'gol' ? (
        <g key={i}>
          <rect x={M + o.x * C + 4} y={M + o.y * C + 4} width={o.w * C - 8} height={o.h * C - 8} rx={40} fill="url(#lp-lake)" stroke="#0369a1" strokeWidth="3" />
          {[0, 1, 2].map((k) => <path key={k} d={`M${M + o.x * C + 30 + k * 50} ${M + o.y * C + 50 + k * 30} q10 -8 20 0 t20 0`} fill="none" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />)}
          <text x={M + (o.x + o.w / 2) * C} y={M + (o.y + o.h / 2) * C + 10} textAnchor="middle" fontSize="30">🦆</text>
          <text x={M + (o.x + o.w / 2) * C} y={M + (o.y + o.h) * C - 14} textAnchor="middle" fontSize="14" fontWeight="900" fill="#0c4a6e">{o.label}</text>
        </g>
      ) : (
        <g key={i}>
          <rect x={M + o.x * C + 3} y={M + o.y * C + 3} width={o.w * C - 6} height={o.h * C - 6} rx={10} fill="#c026d3" />
          <text x={M + (o.x + o.w / 2) * C} y={M + (o.y + o.h / 2) * C + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">🎪 {o.label}</text>
        </g>
      ))}
      {placed.map((p) => {
        const s = RIDES[p.id]
        const r = rectOf(p)
        const x = M + r.x * C, y = M + r.y * C, w = r.w * C, h = r.h * C
        const isBad = bad(p)
        const on = sel === p.id
        const si = simIds ? simIds.indexOf(p.id) : -1
        const wait = si >= 0 && sim.current ? sim.current.res.hours[hour].wait[si] : null
        return (
          <g key={p.id} data-handle onPointerDown={down(p)} style={{ cursor: phase === 'work' ? 'grab' : 'default' }}>
            <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={14} fill={s.color} fillOpacity=".9" stroke={on ? '#111827' : '#fff'} strokeWidth={on ? 5 : 3} />
            <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} rx={10} fill="#fff" fillOpacity=".35" />
            {isBad && <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={14} fill="url(#lp-bad)" stroke="#e11d48" strokeWidth="3" />}
            <text x={x + w / 2} y={y + h / 2 + Math.min(w, h) * 0.12} textAnchor="middle" fontSize={Math.min(w, h) * 0.42} pointerEvents="none">{s.emoji}</text>
            <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize={w < 130 ? 12 : 14} fontWeight="900" fill="#1e293b" pointerEvents="none">{w < 130 && s.name.length > 12 ? s.name.split(' ')[0] : s.name}</text>
            <text x={x + w / 2} y={y + h - 11} textAnchor="middle" fontSize="12" fontWeight="900" fill="#1e293b" pointerEvents="none">{r.w * CELL_M} m × {r.h * CELL_M} m</text>
            {wait !== null && (
              <g transform={`translate(${x + w / 2} ${y + h - 50})`} pointerEvents="none">
                <rect x={-40} y={-2} width={80} height={28} rx={14} fill={wait > 20 ? '#e11d48' : wait > 5 ? '#f59e0b' : '#16a34a'} stroke="#fff" strokeWidth="2" />
                <text x={0} y={17} textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">⏳ {wait} dk</text>
              </g>
            )}
          </g>
        )
      })}
      {phase === 'sim' && simIds && Array.from({ length: 28 }, (_, j) => {
        const id = simIds[j % simIds.length]
        const p = placed.find((q) => q.id === id)
        if (!p) return null
        const r = rectOf(p)
        const tx = M + (r.x + r.w / 2) * C, ty = M + (r.y + r.h) * C - 6
        const f = (simT * 1.6 + j / 28) % 1
        return <circle key={j} cx={gx + (tx - gx) * f} cy={gy + (ty - gy) * f} r={5} fill={['#f43f5e', '#3b82f6', '#f59e0b', '#a855f7', '#10b981'][j % 5]} stroke="#fff" strokeWidth="1.5" pointerEvents="none" />
      })}
    </svg>
  )

  const curRev = sim.current ? (() => {
    const hs = sim.current.res.hours
    const h0 = Math.floor(simT)
    const prev = h0 > 0 ? hs[Math.min(h0, hs.length) - 1].revenue : 0
    const nxt = hs[Math.min(h0, hs.length - 1)].revenue
    return Math.round((prev + (nxt - prev) * (simT - h0)) / 10) * 10
  })() : 0
  const overlay = phase === 'sim' ? (
    <div className="absolute bottom-[7%] left-[22%] flex flex-col items-start gap-1 text-[clamp(12px,2vw,18px)]">
      <Sign tone="dark">🕐 {10 + hour}.00 · Gelen: {num(ARRIVALS[hour])} kişi</Sign>
      <Sign tone="green">💰 {tl(curRev)}</Sign>
    </div>
  ) : null

  /* ── panel ── */
  const selP = placed.find((p) => p.id === sel)
  const controls = (
    <div className="flex flex-col gap-2">
      {level.survey && (
        <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
          <p className="mb-1.5 text-sm font-black">📊 Anket: “Hangi oyuncağı isterdin?” ({level.survey.reduce((a, s) => a + s.votes, 0)} kişi)</p>
          {level.survey.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-0.5">
              <span className="w-7 text-lg" aria-hidden>{RIDES[s.id].emoji}</span>
              <span className="h-5 rounded-md" style={{ width: `${(s.votes / 50) * 70}%`, background: RIDES[s.id].color }} />
              <span className="text-sm font-black tabular-nums">{s.votes}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Stat wide label="Kurulum / bütçe" value={<span className={`text-lg ${cost > level.budget ? 'text-rose-600' : ''}`}>{tl(cost)} / {tl(level.budget)}</span>} tone={cost > level.budget ? 'red' : 'amber'} />
        <Stat label="Oyuncak alanı" value={<span className={`text-base ${areaKnown && area > level.areaMax ? 'text-rose-600' : ''}`}>{areaKnown ? num(area) : '?'} / {num(level.areaMax)} m²</span>} tone={areaKnown && area > level.areaMax ? 'red' : 'green'} />
        <Stat label="Oyuncak" value={<span className="text-base">{placed.length} (en az {level.minRides})</span>} tone="pink" />
      </div>
      {phase === 'area' && (
        <div className="animate-fade-up">
          <p className="mb-2 text-base font-black">Oyuncakların kapladığı toplam alan kaç m²?</p>
          <NumPad unit="m²" onSubmit={submitArea} />
        </div>
      )}
      {phase === 'work' && (
        <>
          {selP && (
            <div className="flex items-center gap-2 rounded-2xl bg-fuchsia-50 p-2 ring-1 ring-fuchsia-200">
              <span className="min-w-0 flex-1 truncate pl-1 text-sm font-black text-fuchsia-950">{RIDES[selP.id].emoji} {RIDES[selP.id].name}</span>
              <button type="button" onClick={() => rotate(selP.id)} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-white px-3 text-sm font-extrabold ring-1 ring-line active:scale-95"><RotateCw size={17} />Döndür</button>
              <button type="button" onClick={() => remove(selP.id)} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-white px-3 text-sm font-extrabold text-rose-700 ring-1 ring-line active:scale-95"><Trash2 size={17} />Kaldır</button>
            </div>
          )}
          <div className="rounded-2xl bg-white/95 p-1.5 ring-1 ring-line">
            {level.rides.map((id) => {
              const s = RIDES[id]
              const on = placed.some((p) => p.id === id)
              return (
                <button key={id} type="button" onClick={() => addRide(id)} className={`flex min-h-14 w-full items-center gap-2 rounded-xl px-2 py-1 text-left transition active:scale-[0.98] ${on ? 'bg-fuchsia-50' : 'hover:bg-paper'}`}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${s.color}55` }} aria-hidden>{s.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-tight font-black">{s.name}</span>
                    <span className="block text-xs font-bold text-ink-soft">{s.w * CELL_M} m × {s.h * CELL_M} m · {tl(s.cost)}</span>
                    <span className="block text-xs font-bold text-ink-soft">Saatte {s.cap} kişi · bilet {tl(s.price)}</span>
                  </span>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${on ? 'bg-fuchsia-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{on ? 'Parkta' : '+ Ekle'}</span>
                </button>
              )
            })}
          </div>
          <BigButton onClick={open} className="w-full"><Play size={20} />Parkı aç, günü başlat</BigButton>
          <p className="-mt-1 text-center text-xs font-bold text-ink-soft">Oyuncağa dokun: seç · sürükle: taşı · iki parmak: yakınlaştır</p>
        </>
      )}
      {phase === 'sim' && <div className="rounded-2xl bg-slate-900 p-3 text-center font-black text-white">🎢 Gün geçiyor… saat {10 + hour}.00</div>}
      {designs.length > 0 && (
        <div className="rounded-2xl bg-white/95 p-2 ring-1 ring-line">
          <p className="mb-1 px-1 text-sm font-black">Günlerin karşılaştırması</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-left text-[11px] text-ink-soft uppercase"><th className="px-1">Park</th><th className="px-1">Gelir</th><th className="px-1">Bekleme</th><th className="px-1">Kurulum</th></tr></thead>
              <tbody>
                {designs.map((d, i) => (
                  <tr key={d.key} className="border-t border-line font-bold">
                    <td className="px-1 py-1 whitespace-nowrap">{i + 1}. {d.ids.map((id) => RIDES[id].emoji).join('')}</td>
                    <td className="px-1 whitespace-nowrap">{num(d.res.revenue)} TL</td>
                    <td className="px-1 whitespace-nowrap">{d.res.maxWait} dk</td>
                    <td className="px-1 whitespace-nowrap">{(d.cost / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} milyon</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
  return <Shell scene={scene} overlay={overlay} controls={controls} />
}
