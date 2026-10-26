import { useReducer, useRef, useState } from 'react'
import { Crosshair, SkipForward } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { Hud, starsFor, useFrame, type GameProps } from './kit'

type Kind = 'dar' | 'dik' | 'geniş'
interface Target { a: number; d: number; color: string }
interface Result { hit: boolean; err: number; pts: number; text: string; kindText?: string; kindOk?: boolean }

const SHOTS = 8
const W = 340, H = 212, CX = 170, CY = 190, R = 150
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
const KINDS: { k: Kind; label: string; why: string }[] = [
  { k: 'dar', label: 'Dar', why: '90°’den küçük' },
  { k: 'dik', label: 'Dik', why: 'tam 90°' },
  { k: 'geniş', label: 'Geniş', why: '90°’den büyük, 180°’den küçük' },
]
const kindOf = (a: number): Kind => (a < 90 ? 'dar' : a === 90 ? 'dik' : 'geniş')
const rad = (a: number) => (a * Math.PI) / 180
const px = (a: number, r: number) => CX + r * Math.cos(rad(a))
const py = (a: number, r: number) => CY - r * Math.sin(rad(a))

function makeTargets(grade: Grade): Target[] {
  let angles: number[]
  if (grade === 4) {
    angles = shuffle([90, ...shuffle([15, 30, 45, 60, 75, 105, 120, 135, 150, 165]).slice(0, SHOTS - 1)])
  } else {
    angles = []
    while (angles.length < SHOTS) {
      const a = grade <= 6 ? randInt(2, 34) * 5 : randInt(5, 175)
      const prev = angles[angles.length - 1]
      if (prev !== undefined && Math.abs(a - prev) < 20) continue
      angles.push(a)
    }
  }
  return angles.map((a) => ({ a, d: 0.55 + Math.random() * 0.35, color: pick(COLORS) }))
}

/** İletki: 0° sağda, 180° solda */
function Protractor({ fine }: { fine: boolean }) {
  return (
    <g pointerEvents="none" className="animate-fade-up">
      <path d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill="#fef9c3" fillOpacity={0.55} stroke="#ca8a04" strokeWidth={1.5} />
      {Array.from({ length: fine ? 181 : 37 }, (_, i) => {
        const d = fine ? i : i * 5
        const len = d % 10 === 0 ? 11 : d % 5 === 0 ? 7 : 4
        return <line key={d} x1={px(d, R)} y1={py(d, R)} x2={px(d, R - len)} y2={py(d, R - len)} stroke="#a16207" strokeWidth={d % 10 === 0 ? 1.3 : 0.7} />
      })}
      {Array.from({ length: 7 }, (_, i) => i * 30).map((d) => (
        <text key={d} x={px(d, R - 20)} y={py(d, R - 20) + 3} textAnchor="middle" fontSize={9} fontWeight={800} fill="#713f12">{d}</text>
      ))}
    </g>
  )
}

export default function AngleCannon({ grade, onFinish }: GameProps) {
  const tol = grade === 4 ? 10 : grade <= 6 ? 7 : 5
  const deltas = grade === 4 ? [-15, 15] : grade <= 6 ? [-10, -5, 5, 10] : [-10, -1, 1, 10]
  const [targets] = useState(() => makeTargets(grade))
  const [round, setRound] = useState(0)
  const [ang, setAng] = useState(90)
  const [kind, setKind] = useState<Kind | null>(null)
  const [phase, setPhase] = useState<'aim' | 'fly' | 'show'>('aim')
  const [score, setScore] = useState(0)
  const [res, setRes] = useState<Result | null>(null)
  const fly = useRef({ t: 0 })
  const stats = useRef({ hits: 0, errSum: 0, kinds: 0, over: false })
  const [, render] = useReducer((x: number) => x + 1, 0)
  const tg = targets[round]
  const maxScore = SHOTS * (grade === 4 ? 13 : 10)

  const land = () => {
    const err = Math.abs(ang - tg.a)
    const hit = err <= tol
    let pts = hit ? 10 - Math.round((err * 5) / tol) : 0
    const r: Result = {
      hit,
      err,
      pts,
      text: hit
        ? err === 0 ? `Tam isabet! Balon ${tg.a}°’deydi. 🎯` : `Vurdun! Balon ${tg.a}°’deydi, sen ${ang}° seçtin (fark ${err}°).`
        : `Iska! Balon ${tg.a}°’deydi, sen ${ang}° seçtin: ${err}° ${ang > tg.a ? 'fazla' : 'az'}.`,
    }
    if (grade === 4) {
      const real = KINDS.find((k) => k.k === kindOf(tg.a))!
      r.kindOk = kind === real.k
      r.kindText = r.kindOk ? `${tg.a}° ${real.label.toLocaleLowerCase('tr-TR')} açı, doğru bildin! +3` : `${tg.a}° ${real.label.toLocaleLowerCase('tr-TR')} açıdır: ${real.why}.`
      if (r.kindOk) {
        pts += 3
        stats.current.kinds++
      }
      r.pts = pts
    }
    if (hit) stats.current.hits++
    stats.current.errSum += err
    if (hit) sfx.ok()
    else sfx.bad()
    setRes(r)
    setScore((s) => s + pts)
    setPhase('show')
  }

  useFrame((dt) => {
    const f = fly.current
    if (f.t >= 1) return
    f.t = Math.min(1, f.t + dt / 0.75)
    if (f.t >= 1) land()
    render()
  }, phase === 'fly')

  const fire = () => {
    if (phase !== 'aim' || (grade === 4 && !kind)) return
    fly.current.t = 0
    setPhase('fly')
  }

  const next = () => {
    if (round + 1 >= SHOTS) {
      const s = stats.current
      if (s.over) return
      s.over = true
      onFinish({
        stars: starsFor(score / maxScore),
        score,
        summary: `${s.hits}/${SHOTS} balonu vurdun, ortalama fark ${fmt(s.errSum / SHOTS, 1)}°${grade === 4 ? `, ${s.kinds} açı türünü doğru bildin` : ''}.`,
        insight: grade === 4
          ? 'Dik açı (90°) iyi bir ölçü çubuğu: balon ondan alçaktaysa dar, ötesindeyse geniş açı. Tahmin ederken 90°’yi kullandın mı?'
          : 'İyi tahmin için önce 90°, 45° ve 135° gibi bilinen açılarla karşılaştır. Hangi açıları tahmin etmek daha zordu, neden?',
      })
      return
    }
    setRound(round + 1)
    setAng(90)
    setKind(null)
    setRes(null)
    setPhase('aim')
  }

  // Top ve balon konumu
  const tx = px(tg.a, tg.d * R), ty = py(tg.a, tg.d * R)
  const reach = fly.current.t * R * 1.15
  const popped = phase !== 'aim' && Math.abs(ang - tg.a) <= tol && (phase === 'show' || reach >= tg.d * R)
  const lo = Math.min(ang, tg.a), hiA = Math.max(ang, tg.a)

  return (
    <div className="animate-fade-up">
      <Hud round={round + 1} rounds={SHOTS} score={score} />
      <div className="mb-3 rounded-2xl bg-ink px-4 py-2.5 text-center text-white">
        <p className="text-lg font-black">Balon kaç derecede?</p>
        <p className="text-sm font-bold text-white/75">Açı, sağdaki 0° çizgisinden ölçülür. ±{tol}° içinde vurursun.</p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[520px] overflow-hidden rounded-3xl ring-1 ring-sky-200 select-none" role="img" aria-label="Top ve hedef balon">
        <defs>
          <linearGradient id="ac-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bae6fd" />
            <stop offset="1" stopColor="#f0f9ff" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#ac-sky)" />
        <rect y={CY} width={W} height={H - CY} fill="#86efac" />
        <line x1={CX} y1={CY} x2={W - 6} y2={CY} stroke="#1f2340" strokeWidth={2} strokeDasharray="6 4" />
        <text x={W - 8} y={CY - 6} textAnchor="end" fontSize={11} fontWeight={900} fill="#1f2340">0°</text>
        <text x={8} y={CY - 6} fontSize={11} fontWeight={900} fill="#1f2340">180°</text>

        {phase === 'show' && <Protractor fine={grade >= 7} />}

        {phase === 'show' && (
          <g pointerEvents="none">
            <path d={`M${px(0, 30)} ${py(0, 30)} A30 30 0 0 0 ${px(tg.a, 30)} ${py(tg.a, 30)}`} fill="none" stroke="#dc2626" strokeWidth={3} opacity={0.6} />
            {lo !== hiA && <path d={`M${px(lo, 62)} ${py(lo, 62)} A62 62 0 0 0 ${px(hiA, 62)} ${py(hiA, 62)}`} fill="none" stroke="#f97316" strokeWidth={6} strokeLinecap="round" />}
            <line x1={CX} y1={CY} x2={px(tg.a, R + 4)} y2={py(tg.a, R + 4)} stroke="#dc2626" strokeWidth={2.5} strokeDasharray="6 4" />
            <line x1={CX} y1={CY} x2={px(ang, R + 4)} y2={py(ang, R + 4)} stroke="#2563eb" strokeWidth={2.5} />
            <text x={px(tg.a, R + 13)} y={py(tg.a, R + 13) + 4} textAnchor="middle" fontSize={12} fontWeight={900} fill="#dc2626" stroke="#fff" strokeWidth={3} paintOrder="stroke">{tg.a}°</text>
            <text x={px(ang, R * 0.42)} y={py(ang, R * 0.42) + 4} textAnchor="middle" fontSize={12} fontWeight={900} fill="#2563eb" stroke="#fff" strokeWidth={3} paintOrder="stroke">{ang}°</text>
          </g>
        )}

        {popped ? (
          <text x={tx} y={ty} fontSize={30} textAnchor="middle" dominantBaseline="central" className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>💥</text>
        ) : (
          <g transform={`translate(${tx - 16} ${ty - 16}) scale(0.4)`}>
            <path d="M40 88c-4 6 4 10 0 16" stroke="#64748b" strokeWidth={3} fill="none" />
            <path d="M40 4C19 4 6 20 6 39c0 22 18 38 30 43l-3 6h14l-3-6c12-5 30-21 30-43C74 20 61 4 40 4z" fill={tg.color} />
            <ellipse cx={26} cy={24} rx={7} ry={11} fill="#fff" opacity={0.35} transform="rotate(-20 26 24)" />
          </g>
        )}

        {phase === 'fly' && reach < R * 1.15 && <circle cx={px(ang, reach)} cy={py(ang, reach)} r={5.5} fill="#1f2340" />}

        {/* Top: nişan alırken namlu gizli, yalnızca sayı seçilir */}
        {phase !== 'aim' && (
          <g transform={`rotate(${-ang} ${CX} ${CY})`}>
            <rect x={CX} y={CY - 6} width={34} height={12} rx={4} fill="#334155" />
          </g>
        )}
        <path d={`M${CX - 20} ${CY} A20 20 0 0 1 ${CX + 20} ${CY} Z`} fill="#475569" />
        <circle cx={CX} cy={CY} r={4} fill="#f8fafc" />
        {phase === 'aim' && <text x={CX} y={CY - 7} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">?</text>}
      </svg>

      {phase === 'show' && res ? (
        <div className={`card mt-3 p-4 text-center ${res.hit ? 'animate-pop' : 'animate-shake'}`}>
          <p className={`text-lg font-black ${res.hit ? 'text-green-700' : 'text-orange-700'}`}>{res.text}</p>
          {res.kindText && <p className={`mt-1 text-sm font-extrabold ${res.kindOk ? 'text-green-700' : 'text-orange-700'}`}>{res.kindText}</p>}
          <p className="mt-1 text-sm font-bold text-ink-soft">{res.pts > 0 ? `+${res.pts} puan` : 'Bu atıştan puan yok.'} <span className="text-red-600">Kırmızı</span>: balon, <span className="text-blue-600">mavi</span>: senin atışın.</p>
          <button type="button" onClick={next} className="btn-primary mt-3 w-full">{round + 1 >= SHOTS ? 'Sonuçları gör' : 'Sonraki atış'}<SkipForward size={18} /></button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Topun açısı</p>
          <p className="text-center text-4xl font-black text-amber-700 tabular-nums" aria-live="polite">{ang}°</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            {deltas.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAng(Math.min(180, Math.max(0, ang + d)))}
                disabled={phase !== 'aim' || (d < 0 ? ang === 0 : ang === 180)}
                className="min-h-12 min-w-16 rounded-2xl bg-white px-2 text-base font-black ring-1 ring-line transition active:scale-95 disabled:opacity-40"
                aria-label={`${Math.abs(d)} derece ${d < 0 ? 'azalt' : 'artır'}`}
              >
                {d < 0 ? '−' : '+'}{Math.abs(d)}°
              </button>
            ))}
          </div>
          {grade === 4 && (
            <div className="mt-3">
              <p className="text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Balonun açısı nasıl bir açı?</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {KINDS.map((k) => (
                  <button key={k.k} type="button" onClick={() => setKind(k.k)} disabled={phase !== 'aim'} aria-pressed={kind === k.k} className={`min-h-12 rounded-2xl text-base font-black ring-1 transition active:scale-95 ${kind === k.k ? 'bg-amber-500 text-white ring-amber-500' : 'bg-white text-ink ring-line'}`}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={fire} disabled={phase !== 'aim' || (grade === 4 && !kind)} className="btn-primary mt-3 w-full text-lg">
            <Crosshair size={20} />{grade === 4 && !kind ? 'Önce açı türünü seç' : 'Ateş!'}
          </button>
        </div>
      )}
    </div>
  )
}
