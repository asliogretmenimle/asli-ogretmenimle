import { useRef, useState } from 'react'
import { Crosshair, Eye, Flag, Ship } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt } from '../lib/random'
import { sfx } from '../lib/feedback'
import { Stepper } from '../manipulatives/ui'
import { Plane, usePlane } from '../interactive/Plane'
import { useTracker } from '../lib/trackerContext'
import { signed, type GameProps } from './kit'
import { Nudge, Scene, StrategyPicker, useAge } from './kit2'

/**
 * Koordinat Amirali (Van de Walle: koordinatlarla akıl yürütme, verimli arama stratejisi)
 *  - Süre ve atış sınırı yok; amaç az atışla, akıl yürüterek filoyu bulmak.
 *  - Iskada ipucu gelir: uzaklık (yatay + dikey adım), bölge, öteleme ya da (8. sınıf) yansıma.
 *  - Öteleme/yansıma ipucu bir noktayı işaret eder; çocuk koordinatı hesaplayıp oraya ateş eder.
 *    Tipik hatalar (x ile y’yi karıştırma, işaret hatası, ters öteleme) soru soran ipucuyla yakalanır.
 *  - Düzlem iki parmakla yakınlaştırılır; noktaya dokunarak ya da x/y düğmeleriyle nişan alınır.
 */

type Pt = [number, number]
interface Shot { x: number; y: number; hit: boolean }
interface Mission { target: Pt; text: string; wrong: { p: Pt; q: string; mis: string }[] }

const key = (x: number, y: number) => `${x},${y}`
const num = (v: number) => signed(String(v))
const coord = (x: number, y: number) => `(${num(x)}, ${num(y)})`
const dist = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])

function region(x: number, y: number) {
  if (x === 0 && y === 0) return 'orijinde'
  if (x === 0) return 'y ekseninin üzerinde'
  if (y === 0) return 'x ekseninin üzerinde'
  return x > 0 ? (y > 0 ? 'I. bölgede' : 'IV. bölgede') : y > 0 ? 'II. bölgede' : 'III. bölgede'
}

function placeShips(lo: number, hi: number, lens: number[], four: boolean): Pt[][] {
  for (let t = 0; t < 500; t++) {
    const ships: Pt[][] = []
    const taken = new Set<string>()
    for (const L of lens) {
      for (let k = 0; k < 100; k++) {
        const hor = Math.random() < 0.5
        const x = randInt(lo, hor ? hi - L + 1 : hi)
        const y = randInt(lo, hor ? hi : hi - L + 1)
        const pts = Array.from({ length: L }, (_, i) => (hor ? [x + i, y] : [x, y + i]) as Pt)
        if (pts.some(([px, py]) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => taken.has(key(px + dx, py + dy)))))) continue
        if (!four && pts.some(([px, py]) => px === 0 || py === 0)) continue
        pts.forEach(([px, py]) => taken.add(key(px, py)))
        ships.push(pts)
        break
      }
    }
    if (ships.length < lens.length) continue
    if (four && new Set(ships.map(([[x, y]]) => region(x, y))).size < Math.min(3, lens.length)) continue
    return ships
  }
  return lens.map((L, i) => Array.from({ length: L }, (_, j) => [lo + 1 + j, lo + 1 + i * 2] as Pt))
}

const hor = (d: number) => (d > 0 ? `${d} birim sağa` : `${-d} birim sola`)
const ver = (d: number) => (d > 0 ? `${d} birim yukarı` : `${-d} birim aşağı`)

/** Iska sonrası bir hedef noktaya götüren ipucu görevi */
function makeMission(from: Pt, target: Pt, grade: Grade): Mission {
  const [fx, fy] = from, [tx, ty] = target
  const dx = tx - fx, dy = ty - fy
  const swap: { p: Pt; q: string; mis: string } = { p: [ty, tx], q: 'Koordinatı yazarken önce hangisi gelir: sağa-sola mı, yukarı-aşağı mı? x ile y’nin yerine bak.', mis: 'x ve y koordinatlarının yerini karıştırdı.' }
  // 8. sınıf: bazen yansıma
  if (grade === 8 && Math.random() < 0.5 && (tx !== 0 || ty !== 0)) {
    const axis = tx === 0 ? 'x' : ty === 0 ? 'y' : pick(['x', 'y'] as const)
    const src: Pt = axis === 'x' ? [tx, -ty] : [-tx, ty]
    const other: Pt = axis === 'x' ? [-tx, ty] : [tx, -ty]
    return {
      target,
      text: `Bir gemi parçası, ${coord(src[0], src[1])} noktasının ${axis} eksenine göre yansımasında.`,
      wrong: [
        swap,
        { p: other, q: `${axis} eksenine göre yansımada hangi koordinat aynı kalır, hangisinin işareti değişir?`, mis: 'Eksene göre yansımada hangi koordinatın işaret değiştirdiğini karıştırdı.' },
        { p: [-tx, -ty], q: 'Yansıma tek bir eksene göre: iki koordinatın da işareti mi değişmeli?', mis: 'Eksene göre yansımayı orijine göre yansımayla karıştırdı.' },
      ],
    }
  }
  const parts = [dx ? hor(dx) : '', dy ? ver(dy) : ''].filter(Boolean)
  return {
    target,
    text: `Bir gemi parçası: son atışın ${coord(fx, fy)} noktasından ${parts.join(' ve ')} ötelersen bulunur.`,
    wrong: [
      swap,
      { p: [fx - dx, fy - dy], q: `“${parts.join(' ve ')}” derken x ve y artar mı, azalır mı? Düzlemde parmağınla yürü.`, mis: 'Ötelemede yönü ters çevirdi (sağ/sol, yukarı/aşağı).' },
      { p: [fx + dx, fy - dy], q: 'Yukarı gitmek y’yi nasıl değiştirir? Aşağı gitmek?', mis: 'Dikey ötelemede y’nin işaretini karıştırdı.' },
      { p: [fx - dx, fy + dy], q: 'Sağa gitmek x’i nasıl değiştirir? Sola gitmek?', mis: 'Yatay ötelemede x’in işaretini karıştırdı.' },
    ],
  }
}

const STRATS = ['Vurunca komşu noktaları denedim', 'Dama deseni gibi atlayarak taradım', 'Bölge bölge taradım', 'İpuçlarından koordinat hesapladım', 'Rastgele denedim']

function Sea({ lo, hi, shots, ships, sunk, aim, ring, mission, showMission, over }: { lo: number; hi: number; shots: Shot[]; ships: Pt[][]; sunk: Set<number>; aim: Pt; ring: { c: Pt; d: number } | null; mission: Mission | null; showMission: boolean; over: boolean }) {
  const P = usePlane()
  const u = P.unitPx
  const vals = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  const [ax, ay] = aim
  return (
    <g>
      <rect x={P.sx(lo - 0.5)} y={P.sy(hi + 0.5)} width={(hi - lo + 1) * u} height={(hi - lo + 1) * u} rx={u * 0.4} fill="#bae6fd" opacity={0.28} />
      {vals.map((x) => vals.map((y) => <circle key={key(x, y)} cx={P.sx(x)} cy={P.sy(y)} r={Math.max(1.5, u * 0.06)} fill="#7dd3fc" />))}
      {ring && vals.map((x) => vals.map((y) => (dist([x, y], ring.c) === ring.d ? <circle key={`r${key(x, y)}`} cx={P.sx(x)} cy={P.sy(y)} r={u * 0.18} fill="#fbbf24" opacity={0.75} /> : null)))}
      {ships.map((s, i) => {
        const show = sunk.has(i) || over
        if (!show) return null
        const [a, b] = [s[0], s[s.length - 1]]
        return <line key={i} x1={P.sx(a[0])} y1={P.sy(a[1])} x2={P.sx(b[0])} y2={P.sy(b[1])} stroke={sunk.has(i) ? '#475569' : '#94a3b8'} strokeWidth={u * 0.62} strokeLinecap="round" strokeDasharray={sunk.has(i) ? undefined : '4 6'} opacity={0.85} />
      })}
      {showMission && mission && (
        <g pointerEvents="none">
          <circle cx={P.sx(mission.target[0])} cy={P.sy(mission.target[1])} r={u * 0.45} fill="none" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 4" />
        </g>
      )}
      {shots.map((s, i) => (
        <g key={key(s.x, s.y)} pointerEvents="none" className={i === shots.length - 1 ? 'animate-pop' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {s.hit ? (
            <>
              <circle cx={P.sx(s.x)} cy={P.sy(s.y)} r={u * 0.36} fill="#f97316" />
              <path d={`M${P.sx(s.x) - u * 0.2} ${P.sy(s.y) - u * 0.2} L${P.sx(s.x) + u * 0.2} ${P.sy(s.y) + u * 0.2} M${P.sx(s.x) + u * 0.2} ${P.sy(s.y) - u * 0.2} L${P.sx(s.x) - u * 0.2} ${P.sy(s.y) + u * 0.2}`} stroke="#fff" strokeWidth={Math.max(2, u * 0.08)} strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx={P.sx(s.x)} cy={P.sy(s.y)} r={u * 0.3} fill="none" stroke="#38bdf8" strokeWidth={2} />
              <circle cx={P.sx(s.x)} cy={P.sy(s.y)} r={u * 0.13} fill="#0ea5e9" />
            </>
          )}
        </g>
      ))}
      {!over && (
        <g pointerEvents="none">
          <line x1={P.sx(ax)} x2={P.sx(ax)} y1={P.sy(0)} y2={P.sy(ay)} stroke="#1d4ed8" strokeWidth={2} strokeDasharray="5 4" />
          <line x1={P.sx(0)} x2={P.sx(ax)} y1={P.sy(ay)} y2={P.sy(ay)} stroke="#be123c" strokeWidth={2} strokeDasharray="5 4" />
          <circle cx={P.sx(ax)} cy={P.sy(ay)} r={u * 0.42} fill="none" stroke="#1f2340" strokeWidth={2.5} />
          <line x1={P.sx(ax) - u * 0.6} x2={P.sx(ax) - u * 0.25} y1={P.sy(ay)} y2={P.sy(ay)} stroke="#1f2340" strokeWidth={2} />
          <line x1={P.sx(ax) + u * 0.25} x2={P.sx(ax) + u * 0.6} y1={P.sy(ay)} y2={P.sy(ay)} stroke="#1f2340" strokeWidth={2} />
          <line y1={P.sy(ay) - u * 0.6} y2={P.sy(ay) - u * 0.25} x1={P.sx(ax)} x2={P.sx(ax)} stroke="#1f2340" strokeWidth={2} />
          <line y1={P.sy(ay) + u * 0.25} y2={P.sy(ay) + u * 0.6} x1={P.sx(ax)} x2={P.sx(ax)} stroke="#1f2340" strokeWidth={2} />
        </g>
      )}
    </g>
  )
}

export default function Battleship({ grade, onFinish }: GameProps) {
  const four = grade >= 6
  const lo = grade === 5 ? 0 : grade === 6 ? -4 : -5
  const hi = grade === 5 ? 8 : grade === 6 ? 4 : 5
  const lens = grade <= 6 ? [3, 2, 2] : grade === 7 ? [3, 3, 2] : [3, 3, 2, 2]
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const [ships] = useState(() => placeShips(lo, hi, lens, four))
  const [shots, setShots] = useState<Shot[]>([])
  const [aim, setAim] = useState<Pt>(four ? [0, 0] : [1, 1])
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'info' } | null>({ text: grade === 5 ? 'Bir noktaya dokun ya da x ve y’yi seç, sonra ateş et.' : 'Düzlemin dört bölgesinde gemiler var. Nereden başlamak akıllıca?', tone: 'info' })
  const [clue, setClue] = useState<string | null>(null)
  const [ring, setRing] = useState<{ c: Pt; d: number } | null>(null)
  const [ringReady, setRingReady] = useState<{ c: Pt; d: number } | null>(null)
  const [mission, setMission] = useState<Mission | null>(null)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [over, setOver] = useState(false)
  const [picked, setPicked] = useState(false)
  const downOnButton = useRef(false)
  const stats = useRef({ missions: 0, missionsOk: 0, followed: false, done: false, misses: 0 })

  const hitSet = new Set(shots.filter((s) => s.hit).map((s) => key(s.x, s.y)))
  const sunkSet = new Set(ships.map((s, i) => (s.every(([x, y]) => hitSet.has(key(x, y))) ? i : -1)).filter((i) => i >= 0))
  const totalCells = ships.reduce((a, s) => a + s.length, 0)

  const setAimSafe = (x: number, y: number) => {
    if (over) return
    setAim([Math.max(lo, Math.min(hi, Math.round(x))), Math.max(lo, Math.min(hi, Math.round(y)))])
  }

  const fire = () => {
    if (over) return
    const [ax, ay] = aim
    if (shots.some((s) => s.x === ax && s.y === ay)) return setMsg({ text: `${coord(ax, ay)} noktasına zaten ateş ettin. Başka bir nokta seç.`, tone: 'info' })
    const shipIdx = ships.findIndex((s) => s.some(([x, y]) => x === ax && y === ay))
    const next = [...shots, { x: ax, y: ay, hit: shipIdx >= 0 }]
    setShots(next)
    setRing(null)
    setNudge(null)
    const s = stats.current
    // Strateji çıkarımı: vuruştan sonra komşuya ateş
    const prev = shots[shots.length - 1]
    if (!s.followed && prev?.hit && dist([prev.x, prev.y], aim) === 1) {
      s.followed = true
      track.strategy('Vuruştan sonra komşu noktaları denedi')
    }
    // Görev (ipucu) değerlendirmesi
    if (mission) {
      const ok = mission.target[0] === ax && mission.target[1] === ay
      s.missions++
      track.attempt(ok)
      if (ok) {
        s.missionsOk++
        if (s.missionsOk === 1) track.strategy('İpucundan koordinat hesapladı')
      } else {
        const w = mission.wrong.find((m) => m.p[0] === ax && m.p[1] === ay)
        if (w) setNudge({ q: `${w.q} İpucu hâlâ geçerli.`, mis: w.mis, k: Date.now() })
      }
    }
    const hits = new Set(next.filter((q) => q.hit).map((q) => key(q.x, q.y)))
    const alive = ships.filter((sh) => !sh.every(([x, y]) => hits.has(key(x, y))))
    if (shipIdx >= 0) {
      sfx.ok()
      const sank = ships[shipIdx].every(([x, y]) => hits.has(key(x, y)))
      if (mission && mission.target[0] === ax && mission.target[1] === ay) setMission(null)
      setClue(null)
      setRingReady(null)
      setMsg({ text: sank ? `${coord(ax, ay)} Gemi battı! (${ships[shipIdx].length} noktalık) ⚓` : `${coord(ax, ay)} İsabet! Gemiler yatay ya da dikey durur. Sıradaki atışın nereye?`, tone: 'ok' })
      if (!alive.length) {
        setOver(true)
        setMission(null)
        setMsg({ text: `Tüm filoyu ${next.length} atışta buldun! ⚓🎉`, tone: 'ok' })
      }
      return
    }
    s.misses++
    // Görev hâlâ sürüyorsa ve yanlış yere atıldıysa ipucu kalsın
    if (mission && nudgeKeep(mission, ax, ay)) {
      setMsg({ text: `${coord(ax, ay)} Iska.`, tone: 'info' })
      return
    }
    const rest = alive.flat().filter(([x, y]) => !hits.has(key(x, y)))
    const near = rest.reduce((b, p) => (dist(p, aim) < dist(b, aim) ? p : b), rest[0])
    const d = dist(near, aim)
    const useMission = grade >= 6 ? s.misses % 2 === 0 : s.misses % 3 === 0
    if (useMission) {
      const m = makeMission(aim, near, grade)
      setMission(m)
      setClue(m.text)
      setRingReady(null)
    } else {
      setMission(null)
      setClue(`En yakın gemi parçası buraya ${d} adım uzakta (yatay + dikey adımlar)${four ? ` ve ${region(near[0], near[1])}` : ''}.`)
      setRingReady({ c: aim, d })
    }
    setMsg({ text: `${coord(ax, ay)} Iska. 💧`, tone: 'info' })
  }
  const nudgeKeep = (m: Mission, ax: number, ay: number) => m.wrong.some((w) => w.p[0] === ax && w.p[1] === ay)

  const finish = () => {
    const s = stats.current
    if (s.done) return
    s.done = true
    const ratio = shots.length / totalCells
    track.item(ratio <= 2.2)
    onFinish({
      stars: ratio <= 2.2 ? 3 : ratio <= 3.2 ? 2 : 1,
      score: Math.max(10, Math.round(200 - (shots.length - totalCells) * 6 + s.missionsOk * 15)),
      summary: `${ships.length} gemiyi ${shots.length} atışta buldun (${totalCells} gemi noktası). ${s.missions ? `İpucu görevlerinin ${s.missionsOk}/${s.missions} tanesini doğru hesapladın.` : ''}`,
      insight: four
        ? 'Bir noktayı ötelediğinde sağa-sola gitmek yalnız x’i, yukarı-aşağı gitmek yalnız y’yi değiştirir. (2, −3) noktasını 4 birim sola ötelersen hangi bölgeye geçer?'
        : 'Bir noktayı söylerken önce x’i (sağa ne kadar), sonra y’yi (yukarı ne kadar) söyledin. (2, 5) ile (5, 2) aynı nokta mı?',
    })
  }

  const panel = dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm font-extrabold">
        <span className={`chip px-3 py-1.5 ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}><Crosshair size={15} />{shots.length} atış</span>
        <span className="chip bg-sky-100 px-3 py-1.5 text-sky-800"><Ship size={15} />{sunkSet.size}/{ships.length} gemi bulundu</span>
        <span className={`chip px-3 py-1.5 ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}>Gemiler: {lens.join(', ')} noktalık</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="mx-auto w-full max-w-[560px]" onPointerDownCapture={(e) => (downOnButton.current = !!(e.target as Element).closest('button'))}>
          <Plane
            initial={{ xMin: lo - 1, xMax: hi + 1, yMin: lo - 1, yMax: hi + 1 }}
            fixedStep={1}
            minSpan={4}
            maxSpan={(hi - lo + 2) * 1.6}
            xLabel="x"
            yLabel="y"
            onTap={(p) => !downOnButton.current && setAimSafe(p.x, p.y)}
            label="Koordinat düzleminde deniz; bir noktaya dokunarak nişan al"
          >
            <Sea lo={lo} hi={hi} shots={shots} ships={ships} sunk={sunkSet} aim={aim} ring={ring} mission={mission} showMission={false} over={over} />
          </Plane>
        </div>

        <div className="space-y-3">
          {!over ? (
            <div className={`rounded-2xl p-3 ${panel}`}>
              <div className="flex items-end justify-center gap-3 text-ink">
                <Stepper label={<span className={soft}>x (yatay)</span>} value={num(aim[0])} color="#1d4ed8" onDec={() => setAimSafe(aim[0] - 1, aim[1])} onInc={() => setAimSafe(aim[0] + 1, aim[1])} />
                <Stepper label={<span className={soft}>y (dikey)</span>} value={num(aim[1])} color="#be123c" onDec={() => setAimSafe(aim[0], aim[1] - 1)} onInc={() => setAimSafe(aim[0], aim[1] + 1)} />
              </div>
              <button type="button" onClick={fire} className="btn-primary mt-3 w-full text-lg">
                <Crosshair size={20} />Ateş! <span className="tabular-nums">{coord(aim[0], aim[1])}</span>
              </button>
            </div>
          ) : (
            <div className={`rounded-2xl p-3 ${panel}`}>
              <p className="flex items-center gap-1.5 text-lg font-black text-emerald-500"><Flag size={18} />Filo bulundu!</p>
              <p className={`text-sm font-bold ${soft}`}>{shots.length} atış yaptın; gemilerin toplam {totalCells} noktası vardı. Daha az atışla bulmak için ne yapardın?</p>
              {!picked ? <StrategyPicker question="Gemileri ararken nasıl bir yol izledin?" options={STRATS} onPick={() => setPicked(true)} /> : <button type="button" onClick={finish} className="btn-primary mt-3 w-full">Bitir</button>}
            </div>
          )}

          {msg && <p className={`rounded-2xl px-4 py-2 text-center text-base font-extrabold animate-pop ${msg.tone === 'ok' ? 'bg-emerald-100 text-emerald-900' : dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`} aria-live="polite">{msg.text}</p>}

          {clue && !over && (
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200 animate-fade-up">
              <p className="text-xs font-black tracking-wide uppercase">🧭 İpucu</p>
              <p className="font-extrabold">{clue}</p>
              {mission && <p className="mt-1 text-sm font-bold">Noktanın koordinatlarını hesapla, oraya nişan al.</p>}
              {ringReady && !ring && (
                <button type="button" onClick={() => { setRing(ringReady); track.hint() }} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-amber-200"><Eye size={16} />Bu uzaklıktaki noktaları göster</button>
              )}
            </div>
          )}
        </div>
      </div>

      {nudge && <Nudge key={nudge.k} question={nudge.q} misconception={nudge.mis} tool="coordinate" toolConfig={{ size: hi }} toolTitle="Koordinat düzlemi" onClose={() => setNudge(null)} />}
    </Scene>
  )
}
