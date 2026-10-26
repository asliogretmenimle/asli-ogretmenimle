import { useEffect, useRef, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { Stepper } from '../manipulatives/ui'
import { Hud, Toast, signed, type GameProps } from './kit'

type Pt = [number, number]
interface Shot { x: number; y: number; hit: boolean }
interface Quiz { at: number; options: Pt[] }

const key = (x: number, y: number) => `${x},${y}`
const num = (v: number) => signed(String(v))
const coord = (x: number, y: number) => `(${num(x)}, ${num(y)})`

function placeShips(lo: number, hi: number, lens: number[]): Pt[][] {
  for (let t = 0; t < 500; t++) {
    const ships: Pt[][] = []
    const taken = new Set<string>()
    for (const L of lens) {
      for (let k = 0; k < 100; k++) {
        const hor = Math.random() < 0.5
        const x = randInt(lo, hor ? hi - L + 1 : hi)
        const y = randInt(lo, hor ? hi : hi - L + 1)
        const pts = Array.from({ length: L }, (_, i) => (hor ? [x + i, y] : [x, y + i]) as Pt)
        // Gemiler birbirine değmesin (köşeden bile)
        if (pts.some(([px, py]) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => taken.has(key(px + dx, py + dy)))))) continue
        pts.forEach(([px, py]) => taken.add(key(px, py)))
        ships.push(pts)
        break
      }
    }
    if (ships.length < lens.length) continue
    // Dört bölgede gemiler farklı bölgelere dağılsın
    if (lo < 0 && new Set(ships.map(([[x, y]]) => region(x, y))).size < 3) continue
    return ships
  }
  return lens.map((L, i) => Array.from({ length: L }, (_, j) => [lo + j, lo + i * 2] as Pt))
}

function region(x: number, y: number) {
  if (x === 0 && y === 0) return 'orijinde'
  if (x === 0) return 'y ekseninin üzerinde'
  if (y === 0) return 'x ekseninin üzerinde'
  return x > 0 ? (y > 0 ? 'I. bölgede' : 'IV. bölgede') : y > 0 ? 'II. bölgede' : 'III. bölgede'
}

const heat = (d: number) => (d <= 1 ? 'Çok sıcak! 🔥' : d === 2 ? 'Sıcak ♨️' : d <= 4 ? 'Ilık 🌤️' : 'Soğuk 🧊')

export default function Battleship({ grade, onFinish }: GameProps) {
  const four = grade >= 7
  const lo = four ? -5 : 0
  const hi = four ? 5 : grade === 5 ? 6 : 8
  const lens = grade === 5 ? [3, 2, 2] : grade === 6 ? [3, 3, 2] : [3, 3, 2, 2]
  const maxShots = grade === 5 ? 18 : grade === 6 ? 22 : 26
  const [ships] = useState(() => placeShips(lo, hi, lens))
  const [shots, setShots] = useState<Shot[]>([])
  const [left, setLeft] = useState(maxShots)
  const [ax, setAx] = useState(four ? 0 : 1)
  const [ay, setAy] = useState(four ? 0 : 1)
  const [score, setScore] = useState(0)
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'bad' | 'info' } | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [over, setOver] = useState<'win' | 'out' | null>(null)
  const done = useRef(false)

  const hitSet = new Set(shots.filter((s) => s.hit).map((s) => key(s.x, s.y)))
  const isSunk = (s: Pt[]) => s.every(([x, y]) => hitSet.has(key(x, y)))
  const sunk = ships.filter(isSunk).length

  useEffect(() => {
    if (!over) return
    const t = setTimeout(() => {
      if (done.current) return
      done.current = true
      const hits = shots.filter((s) => s.hit).length
      const acc = hits / Math.max(1, shots.length)
      const bonus = over === 'win' ? left * 5 : 0
      onFinish({
        stars: over === 'win' ? (acc >= 0.45 ? 3 : 2) : sunk >= Math.ceil(ships.length / 2) ? 2 : 1,
        score: score + bonus,
        summary: `${sunk}/${ships.length} gemi batırdın: ${shots.length} atışta ${hits} isabet${bonus ? `, kalan atışlardan +${bonus} puan` : ''}.`,
        insight: four
          ? 'x negatifse nokta y ekseninin solunda, y negatifse x ekseninin altındadır. (−3, 2) noktası hangi bölgededir?'
          : 'Bir noktayı söylerken önce x’i (sağa ne kadar), sonra y’yi (yukarı ne kadar) söyledin. (2, 5) ile (5, 2) aynı nokta mı?',
      })
    }, over === 'win' ? 1600 : 2600)
    return () => clearTimeout(t)
  }, [over])

  const fire = () => {
    if (over || quiz) return
    if (shots.some((s) => s.x === ax && s.y === ay)) return setMsg({ text: `${coord(ax, ay)} noktasına zaten ateş ettin. Başka bir nokta seç.`, tone: 'info' })
    const ship = ships.find((s) => s.some(([x, y]) => x === ax && y === ay))
    const next = [...shots, { x: ax, y: ay, hit: !!ship }]
    const nextLeft = left - 1
    setShots(next)
    setLeft(nextLeft)
    const hits = new Set(next.filter((s) => s.hit).map((s) => key(s.x, s.y)))
    const alive = ships.filter((s) => !s.every(([x, y]) => hits.has(key(x, y))))
    if (ship) {
      sfx.ok()
      const sank = ship.every(([x, y]) => hits.has(key(x, y)))
      setScore(score + (sank ? 30 : 10))
      setMsg(sank ? { text: `${coord(ax, ay)} 💥 Gemi battı! (${ship.length} noktalık)`, tone: 'ok' } : { text: `${coord(ax, ay)} 💥 Vurdun! Gemi düz durur: yanındaki noktaları dene.`, tone: 'ok' })
    } else {
      sfx.bad()
      // En yakın, henüz vurulmamış gemi noktası
      const rest = alive.flat().filter(([x, y]) => !hits.has(key(x, y)))
      const near = rest.reduce((b, p) => (Math.abs(p[0] - ax) + Math.abs(p[1] - ay) < Math.abs(b[0] - ax) + Math.abs(b[1] - ay) ? p : b), rest[0])
      const d = near ? Math.abs(near[0] - ax) + Math.abs(near[1] - ay) : 9
      setMsg({ text: `${coord(ax, ay)} 💧 Iska. ${heat(d)}${four && near ? ` Yakındaki bir gemi ${region(near[0], near[1])}.` : ''}`, tone: 'bad' })
    }
    if (!alive.length) return setOver('win')
    if (!nextLeft) return setOver('out')
    // Her 4 atışta bir: işaretlenmiş bir noktanın koordinatını oku
    if (next.length % 4 === 0) {
      const at = randInt(0, next.length - 2)
      const { x, y } = next[at]
      const opts = new Map<string, Pt>([[key(x, y), [x, y]]])
      const cands: Pt[] = [[y, x], four ? [-x, y] : [x, y + 1], four ? [x, -y] : [x + 1, y], [x, y - 1], [x - 1, y]]
      for (const p of cands) if (opts.size < 3 && p[0] >= lo && p[0] <= hi && p[1] >= lo && p[1] <= hi) opts.set(key(p[0], p[1]), p)
      setQuiz({ at, options: shuffle([...opts.values()]) })
    }
  }

  const answer = ([x, y]: Pt) => {
    if (!quiz) return
    const s = shots[quiz.at]
    if (s.x === x && s.y === y) {
      sfx.ok()
      setScore(score + 5)
      setLeft(left + 1)
      setMsg({ text: 'Doğru okudun! Bonus atış kazandın 🎯', tone: 'ok' })
    } else {
      sfx.bad()
      setMsg({ text: `Doğrusu ${coord(s.x, s.y)}: önce x ekseninden ${num(s.x)}, sonra y ekseninden ${num(s.y)} okunur.`, tone: 'bad' })
    }
    setQuiz(null)
  }

  // Koordinat düzlemi
  const W = 340, padL = 26, padR = 14, padT = 14, padB = 24
  const u = (W - padL - padR) / (hi - lo)
  const H = padT + padB + (hi - lo) * u
  const X = (v: number) => padL + (v - lo) * u
  const Y = (v: number) => padT + (hi - v) * u
  const vals = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  const fs = Math.min(22, u * 0.62)
  const busy = !!over || !!quiz
  const quizShot = quiz ? shots[quiz.at] : null

  return (
    <div className="animate-fade-up">
      <Hud
        score={score}
        extra={
          <>
            <span className={`chip px-3 py-1.5 text-sm ring-1 ${left <= 3 ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-white ring-line'}`}>🎯 {left} atış</span>
            <span className="chip bg-sky-50 px-3 py-1.5 text-sm text-sky-800 ring-1 ring-sky-200">⚓ {sunk}/{ships.length} battı</span>
          </>
        }
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[440px] select-none" role="img" aria-label="Koordinat düzlemi üzerinde deniz">
        <rect x={X(lo) - (four ? 8 : 0)} y={Y(hi) - 8} width={(hi - lo) * u + (four ? 16 : 8)} height={(hi - lo) * u + (four ? 16 : 8)} rx={12} fill="#e0f2fe" />
        {vals.map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={Y(hi)} y2={Y(lo)} stroke="#bae6fd" strokeWidth={1} />
            <line y1={Y(v)} y2={Y(v)} x1={X(lo)} x2={X(hi)} stroke="#bae6fd" strokeWidth={1} />
          </g>
        ))}
        <line x1={X(lo) - (four ? 8 : 0)} x2={X(hi) + 10} y1={Y(0)} y2={Y(0)} stroke="#1f2340" strokeWidth={2} />
        <line y1={Y(lo) + (four ? 8 : 0)} y2={Y(hi) - 10} x1={X(0)} x2={X(0)} stroke="#1f2340" strokeWidth={2} />
        <path d={`M${X(hi) + 12} ${Y(0)} l-7 -4 v8 z`} fill="#1f2340" />
        <path d={`M${X(0)} ${Y(hi) - 12} l-4 7 h8 z`} fill="#1f2340" />
        <text x={X(hi) + 4} y={Y(0) - 7} fontSize={12} fontWeight={900} fill="#1d4ed8">x</text>
        <text x={X(0) + 7} y={Y(hi) - 4} fontSize={12} fontWeight={900} fill="#be123c">y</text>
        {vals.map((v) => (
          <g key={v} fontSize={10} fontWeight={800} fill="#5b6080" stroke="#e0f2fe" strokeWidth={3} paintOrder="stroke">
            {v !== 0 && <text x={X(v)} y={Y(0) + 15} textAnchor="middle">{num(v)}</text>}
            {v !== 0 && <text x={X(0) - 6} y={Y(v) + 3.5} textAnchor="end">{num(v)}</text>}
          </g>
        ))}
        <text x={X(0) - 6} y={Y(0) + 15} textAnchor="end" fontSize={10} fontWeight={800} fill="#5b6080">0</text>
        {vals.map((x) => vals.map((y) => <circle key={key(x, y)} cx={X(x)} cy={Y(y)} r={1.8} fill="#7dd3fc" />))}

        {/* Batan gemiler; oyun bitince kalanlar kesik çizgiyle */}
        {ships.map((s, i) => {
          const show = isSunk(s) || !!over
          if (!show) return null
          const [a, b] = [s[0], s[s.length - 1]]
          return <line key={i} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke={isSunk(s) ? '#475569' : '#94a3b8'} strokeWidth={u * 0.62} strokeLinecap="round" strokeDasharray={isSunk(s) ? undefined : '4 6'} opacity={isSunk(s) ? 0.85 : 0.7} className={isSunk(s) ? 'animate-pop' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        })}

        {!four && !busy && (
          <g pointerEvents="none">
            <line x1={X(ax)} x2={X(ax)} y1={Y(0)} y2={Y(ay)} stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="4 3" />
            <line x1={X(0)} x2={X(ax)} y1={Y(ay)} y2={Y(ay)} stroke="#be123c" strokeWidth={1.5} strokeDasharray="4 3" />
            <circle cx={X(ax)} cy={Y(ay)} r={u * 0.32} fill="none" stroke="#1f2340" strokeWidth={2} />
          </g>
        )}

        {shots.map((s, i) => (
          <g key={key(s.x, s.y)} className={i === shots.length - 1 ? 'animate-pop' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            {s.hit && <circle cx={X(s.x)} cy={Y(s.y)} r={u * 0.36} fill="#64748b" />}
            <text x={X(s.x)} y={Y(s.y) + 1} fontSize={fs} textAnchor="middle" dominantBaseline="central">{s.hit ? '💥' : '💧'}</text>
          </g>
        ))}

        {quizShot && (
          <g pointerEvents="none">
            <circle cx={X(quizShot.x)} cy={Y(quizShot.y)} r={u * 0.48} fill="none" stroke="#f59e0b" strokeWidth={3} className="animate-pulse" />
            <text x={X(quizShot.x) + u * 0.45} y={Y(quizShot.y) - u * 0.45} fontSize={14} fontWeight={900} fill="#b45309">?</text>
          </g>
        )}
      </svg>

      {msg && <Toast text={msg.text} tone={msg.tone} />}

      {quiz ? (
        <div className="card mt-3 p-4 text-center animate-pop">
          <p className="font-black">Turuncu halkadaki işaretin koordinatları ne?</p>
          <p className="text-sm font-bold text-ink-soft">Doğru okursan bonus atış kazanırsın.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {quiz.options.map(([x, y]) => (
              <button key={key(x, y)} type="button" onClick={() => answer([x, y])} className="min-h-12 rounded-2xl bg-white text-lg font-black ring-1 ring-line transition active:scale-95">{coord(x, y)}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-end justify-center gap-3">
            <Stepper label="x (yatay)" value={num(ax)} color="#1d4ed8" disabled={busy} onDec={() => setAx(Math.max(lo, ax - 1))} onInc={() => setAx(Math.min(hi, ax + 1))} />
            <Stepper label="y (dikey)" value={num(ay)} color="#be123c" disabled={busy} onDec={() => setAy(Math.max(lo, ay - 1))} onInc={() => setAy(Math.min(hi, ay + 1))} />
          </div>
          <button type="button" onClick={fire} disabled={busy} className="btn-primary mt-3 w-full text-lg">
            <Crosshair size={20} />Ateş! <span className="tabular-nums">{coord(ax, ay)}</span>
          </button>
        </div>
      )}
      {over === 'out' && <p className="mt-3 text-center font-extrabold text-ink-soft">Atışların bitti! Kalan gemiler kesik çizgiyle gösterildi.</p>}
      {over === 'win' && <p className="mt-3 text-center text-lg font-black text-green-700">Tüm filoyu batırdın! ⚓🎉</p>}
    </div>
  )
}
