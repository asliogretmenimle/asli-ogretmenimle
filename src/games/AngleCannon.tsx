import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Crosshair, RotateCcw, RotateCw, Ruler } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { Plane, Pinchable, usePlane } from '../interactive/Plane'
import { useTracker } from '../lib/trackerContext'
import { starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, StrategyPicker, useAge } from './kit2'

/**
 * Açı Topçusu (Van de Walle: ölçmeden önce tahmin, referans açılar, ölçme aracını anlamlı kullanma)
 *  1. Tahmin: balon çizgisinin yerle yaptığı açıyı referanslarla (90°, 45°, 180°) karşılaştırıp tahmin et.
 *  2. Ölç: iletkiyi sürükle/döndür (iki parmak), merkezini topun dibine, 0° çizgisini yere hizala; açıyı oku.
 *  3. Ateş et: ölçtüğün açıyla. Iskada soru soran ipucu (yanlış sıra okuma, hizalama…). Can yok, süre yok.
 */

type Kind = 'dar' | 'dik' | 'geniş'
interface Target { a: number; d: number; color: string }
type Phase = 'estimate' | 'measure' | 'fly' | 'result'

const ROUNDS = 6
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
const KINDS: { k: Kind; label: string; why: string }[] = [
  { k: 'dar', label: 'Dar', why: '90°’den küçük' },
  { k: 'dik', label: 'Dik', why: 'tam 90°' },
  { k: 'geniş', label: 'Geniş', why: '90°’den büyük' },
]
const kindOf = (a: number): Kind => (a < 90 ? 'dar' : a === 90 ? 'dik' : 'geniş')
const rad = (a: number) => (a * Math.PI) / 180
const PR = 5 // iletki yarıçapı (birim)
const STRATS = ['90° (dik açı) ile karşılaştırdım', '45° (dik açının yarısı) ile karşılaştırdım', '180° (doğru açı) ile karşılaştırdım', '30° / 60° gibi bildiğim açılar', 'Göz kararı']

function makeTargets(grade: Grade): Target[] {
  let angles: number[]
  if (grade === 4) angles = shuffle([90, ...shuffle([20, 30, 45, 60, 70, 110, 120, 135, 150, 160]).slice(0, ROUNDS - 1)])
  else {
    angles = []
    while (angles.length < ROUNDS) {
      const a = grade <= 6 ? randInt(2, 34) * 5 : randInt(8, 172)
      if (angles.some((p) => Math.abs(p - a) < 18) || a === 90) continue
      angles.push(a)
    }
  }
  return angles.map((a) => ({ a, d: 5.6 + Math.random() * 2.6, color: pick(COLORS) }))
}

/** Gökyüzü, zemin, top, balon, nişan çizgisi */
function Field({ tg, phase, shotAng, t, popped, bench }: { tg: Target; phase: Phase; shotAng: number | null; t: number; popped: boolean; bench: boolean }) {
  const P = usePlane()
  const X = (a: number, r: number) => P.sx(r * Math.cos(rad(a)))
  const Y = (a: number, r: number) => P.sy(r * Math.sin(rad(a)))
  const u = P.unitPx
  const bx = X(tg.a, tg.d), by = Y(tg.a, tg.d)
  const showBarrel = phase !== 'estimate' && shotAng !== null
  return (
    <g>
      <defs>
        <linearGradient id="ac-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#f0f9ff" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={P.width} height={P.sy(0)} fill="url(#ac-sky)" />
      <rect x={0} y={P.sy(0)} width={P.width} height={Math.max(0, P.height - P.sy(0))} fill="#86efac" />
      <line x1={P.sx(-30)} x2={P.sx(30)} y1={P.sy(0)} y2={P.sy(0)} stroke="#15803d" strokeWidth={2} />
      {/* 0° kolu: yer */}
      <line x1={P.sx(0)} y1={P.sy(0)} x2={P.sx(9.6)} y2={P.sy(0)} stroke="#1f2340" strokeWidth={3} strokeLinecap="round" />
      {/* Balon kolu */}
      <line x1={P.sx(0)} y1={P.sy(0)} x2={X(tg.a, 11.5)} y2={Y(tg.a, 11.5)} stroke="#dc2626" strokeWidth={2.5} strokeDasharray="7 5" />
      <path d={`M${X(0, 1.4)} ${Y(0, 1.4)} A${1.4 * u} ${1.4 * u} 0 0 0 ${X(tg.a, 1.4)} ${Y(tg.a, 1.4)}`} fill="none" stroke="#dc2626" strokeWidth={3} />
      {bench && [45, 90, 135].map((b) => (
        <g key={b} pointerEvents="none">
          <line x1={P.sx(0)} y1={P.sy(0)} x2={X(b, 8.4)} y2={Y(b, 8.4)} stroke="#7c3aed" strokeWidth={1.8} strokeDasharray="2 5" />
          <text x={X(b, 8.9)} y={Y(b, 8.9)} textAnchor="middle" fontSize={13} fontWeight={900} fill="#6d28d9" stroke="#fff" strokeWidth={3} paintOrder="stroke">{b}°</text>
        </g>
      ))}
      {popped ? (
        <text x={bx} y={by} fontSize={u * 1.6} textAnchor="middle" dominantBaseline="central" className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>💥</text>
      ) : (
        <g transform={`translate(${bx - u * 0.8} ${by - u * 0.85}) scale(${(u * 1.6) / 80})`} pointerEvents="none">
          <path d="M40 88c-4 6 4 10 0 16" stroke="#64748b" strokeWidth={3} fill="none" />
          <path d="M40 4C19 4 6 20 6 39c0 22 18 38 30 43l-3 6h14l-3-6c12-5 30-21 30-43C74 20 61 4 40 4z" fill={tg.color} />
          <ellipse cx={26} cy={24} rx={7} ry={11} fill="#fff" opacity={0.35} transform="rotate(-20 26 24)" />
        </g>
      )}
      {phase === 'fly' && shotAng !== null && <circle cx={X(shotAng, t * 12)} cy={Y(shotAng, t * 12)} r={u * 0.28} fill="#1f2340" />}
      {showBarrel && (
        <g transform={`rotate(${-(shotAng ?? 90)} ${P.sx(0)} ${P.sy(0)})`}>
          <rect x={P.sx(0)} y={P.sy(0) - u * 0.3} width={u * 1.9} height={u * 0.6} rx={u * 0.2} fill="#334155" />
        </g>
      )}
      <path d={`M${P.sx(-1)} ${P.sy(0)} A${u} ${u} 0 0 1 ${P.sx(1)} ${P.sy(0)} Z`} fill="#475569" />
      <circle cx={P.sx(0)} cy={P.sy(0)} r={4} fill="#f8fafc" />
      {phase === 'estimate' && <text x={P.sx(0)} y={P.sy(0) - u * 0.32} textAnchor="middle" fontSize={u * 0.55} fontWeight={900} fill="#fff">?</text>}
      <text x={P.sx(9.7)} y={P.sy(0) - 8} textAnchor="end" fontSize={13} fontWeight={900} fill="#1f2340">0°</text>
    </g>
  )
}

/** İki sıralı iletki: dış sıra sağdan sola 0→180, iç sıra 180→0 */
function Protractor({ cx, cy, rot, fine, onMove, onRotate }: { cx: number; cy: number; rot: number; fine: boolean; onMove: (dx: number, dy: number) => void; onRotate: (d: number) => void }) {
  const P = usePlane()
  const R = PR * P.unitPx
  const px = (d: number, r: number) => r * Math.cos(rad(d))
  const py = (d: number, r: number) => -r * Math.sin(rad(d))
  const ticks = Array.from({ length: fine ? 181 : 37 }, (_, i) => (fine ? i : i * 5))
  const fs = Math.max(8, Math.min(13, R * 0.065))
  return (
    <Pinchable onMove={onMove} onRotate={onRotate}>
      <g transform={`translate(${P.sx(cx)} ${P.sy(cy)}) rotate(${-rot})`}>
        <path d={`M${-R} 0 A${R} ${R} 0 0 1 ${R} 0 Z`} fill="#fef9c3" fillOpacity={0.72} stroke="#ca8a04" strokeWidth={1.6} />
        <path d={`M${-R * 0.55} 0 A${R * 0.55} ${R * 0.55} 0 0 1 ${R * 0.55} 0`} fill="none" stroke="#eab308" strokeWidth={1} />
        {ticks.map((d) => {
          const len = d % 10 === 0 ? R * 0.09 : d % 5 === 0 ? R * 0.06 : R * 0.035
          return <line key={d} x1={px(d, R)} y1={py(d, R)} x2={px(d, R - len)} y2={py(d, R - len)} stroke="#a16207" strokeWidth={d % 10 === 0 ? 1.4 : 0.7} />
        })}
        {Array.from({ length: 19 }, (_, i) => i * 10).map((d) => (
          <g key={d} fontWeight={800} textAnchor="middle">
            <text x={px(d, R * 0.83)} y={py(d, R * 0.83) + fs * 0.35} fontSize={fs} fill="#713f12">{d}</text>
            <text x={px(d, R * 0.68)} y={py(d, R * 0.68) + fs * 0.35} fontSize={fs * 0.82} fill="#b45309">{180 - d}</text>
          </g>
        ))}
        <line x1={-R} x2={R} y1={0} y2={0} stroke="#a16207" strokeWidth={1.6} />
        <line x1={0} x2={0} y1={0} y2={-R * 0.12} stroke="#a16207" strokeWidth={1.4} />
        <circle r={5} fill="#fff" stroke="#a16207" strokeWidth={2} />
      </g>
    </Pinchable>
  )
}

export default function AngleCannon({ grade, onFinish }: GameProps) {
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const tol = grade >= 7 ? 2 : 3
  const fine = grade >= 6
  const [targets] = useState(() => makeTargets(grade))
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('estimate')
  const [kind, setKind] = useState<Kind | null>(null)
  const [est, setEst] = useState(90)
  const [meas, setMeas] = useState(90)
  const [bench, setBench] = useState(false)
  const [pro, setPro] = useState({ x: -4.6, y: 1.4, rot: 18 })
  const [t, setT] = useState(0)
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [picked, setPicked] = useState(false)
  const [kindMsg, setKindMsg] = useState<string | null>(null)
  const stats = useRef({ estErr: [] as number[], firstHit: 0, kinds: 0, benchUsed: false, over: false })
  const tg = targets[round]
  const aligned = Math.hypot(pro.x, pro.y) < 1e-6 && Math.abs(pro.rot) < 1e-6
  const hit = phase === 'result' || (phase === 'fly' && t >= tg.d / 12)
  const popped = hit && Math.abs(meas - tg.a) <= tol

  // Uçuş animasyonu
  useEffect(() => {
    if (phase !== 'fly') return
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      const k = Math.min(1, (now - t0) / 800)
      setT(k)
      if (k < 1) raf = requestAnimationFrame(loop)
      else land()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const snap = (p: { x: number; y: number; rot: number }) => {
    const n = { ...p }
    if (Math.hypot(n.x, n.y) < 0.55) {
      n.x = 0
      n.y = 0
    }
    if (Math.abs(n.rot) < 4) n.rot = 0
    return n
  }
  const moveP = (dx: number, dy: number) => setPro((c) => snap({ ...c, x: c.x + dx, y: c.y + dy }))
  const rotP = (d: number) => setPro((c) => snap({ ...c, rot: ((c.rot - d + 540) % 360) - 180 }))
  const nudgeRot = (d: number) => setPro((c) => snap({ ...c, rot: Math.round(c.rot + d) }))

  const commitEstimate = () => {
    if (grade === 4) {
      const real = kindOf(tg.a)
      if (kind !== real) {
        track.attempt(false)
        setKindMsg(null)
        setNudge({ q: kind === null ? 'Önce açının türünü seç.' : 'Balon çizgisini dik açıyla (90°) karşılaştır: dik açıdan daha mı az açılmış, daha mı çok? Köşesine bir kitabın köşesini koyduğunu düşün.', mis: kind ? 'Açıyı dik açıyla karşılaştırarak sınıflamada zorlandı.' : undefined, k: Date.now() })
        return
      }
      stats.current.kinds++
      setKindMsg(`Evet, ${KINDS.find((k) => k.k === real)!.label.toLocaleLowerCase('tr-TR')} açı: ${KINDS.find((k) => k.k === real)!.why}.`)
    }
    stats.current.estErr.push(Math.abs(est - tg.a))
    setNudge(null)
    setMeas(est)
    setPhase('measure')
  }

  const fire = () => {
    if (phase !== 'measure') return
    setT(0)
    setNudge(null)
    setPhase('fly')
  }

  const land = () => {
    const ok = Math.abs(meas - tg.a) <= tol
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      if (tries === 0) stats.current.firstHit++
      track.item(tries === 0)
      setPhase('result')
      return
    }
    setTries((n) => n + 1)
    let q: string
    let mis: string | undefined
    if (Math.abs(meas - (180 - tg.a)) <= tol && Math.abs(tg.a - 90) > 8) {
      q = 'İletkinin iki sıra sayısı var. Ölçmeye başladığın kol (yer) hangi sıradaki 0°’dan geçiyor? O sıradan oku.'
      mis = 'İletkide yanlış sırayı okudu (180° − açı).'
    } else if (!aligned) {
      q = 'İletkinin merkezi topun tam dibinde mi? Düz kenarı (0° çizgisi) yerle çakışıyor mu? Hizalamadan okunan açı yanıltır.'
      mis = 'Ölçerken iletkiyi köşeye ve kola hizalamadı.'
    } else {
      q = `Top ${meas > tg.a ? 'balonun üstünden' : 'balonun altından'} geçti. Kırmızı kesikli çizgi iletkide hangi iki büyük çentik arasında? Küçük çentikleri say.`
    }
    setNudge({ q, mis, k: Date.now() })
    setPhase('measure')
  }

  const next = () => {
    if (round + 1 >= ROUNDS) {
      const s = stats.current
      if (s.over) return
      s.over = true
      const avg = s.estErr.reduce((a, b) => a + b, 0) / Math.max(1, s.estErr.length)
      onFinish({
        stars: starsFor((s.firstHit / ROUNDS) * 0.6 + Math.max(0, 1 - avg / 30) * 0.4),
        score: s.firstHit * 15 + Math.max(0, Math.round(100 - avg * 3)),
        summary: `Tahminlerin gerçek açıdan ortalama ${Math.round(avg)}° uzaktaydı; ${ROUNDS} balonun ${s.firstHit} tanesini ilk ölçümünle vurdun${grade === 4 ? `, ${s.kinds} açı türünü doğru bildin` : ''}.`,
        insight: grade === 4
          ? 'Dik açı (90°) iyi bir ölçü çubuğu: balon çizgisi ondan alçaktaysa dar, ötesindeyse geniş açı. Tahmin ederken 90°’yi kullandın mı?'
          : 'İyi tahmin için önce 90°, 45° ve 180° gibi bilinen açılarla karşılaştır; sonra iletkinin hangi sırasını okuyacağına 0°’ın hangi kolda olduğuna bakarak karar ver.',
      })
      return
    }
    setRound(round + 1)
    setPhase('estimate')
    setKind(null)
    setKindMsg(null)
    setEst(90)
    setMeas(90)
    setBench(false)
    setPro({ x: -4.6, y: 1.4, rot: pick([-25, 15, 30]) })
    setTries(0)
    setNudge(null)
    setPicked(false)
  }

  const panel = dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'
  const deltas = grade === 4 ? [-10, -5, 5, 10] : [-10, -5, -1, 1, 5, 10]
  const err = stats.current.estErr[round] ?? 0
  const steps = ['Tahmin et', 'İletkiyle ölç', 'Karşılaştır']
  const si = phase === 'estimate' ? 0 : phase === 'result' ? 2 : 1

  const dial = (value: number, set: (v: number) => void, color: string, label: string) => (
    <div>
      <p className={`text-center text-xs font-extrabold tracking-wide uppercase ${soft}`}>{label}</p>
      <p className="text-center text-4xl font-black tabular-nums" style={{ color }} aria-live="polite">{value}°</p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        {deltas.map((d) => (
          <button key={d} type="button" onClick={() => set(Math.min(180, Math.max(0, value + d)))} disabled={d < 0 ? value === 0 : value === 180} className="min-h-12 min-w-14 rounded-xl bg-white px-2 text-base font-black text-ink ring-1 ring-line transition active:scale-95 disabled:opacity-40" aria-label={`${Math.abs(d)} derece ${d < 0 ? 'azalt' : 'artır'}`}>
            {d < 0 ? '−' : '+'}{Math.abs(d)}°
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={round} total={ROUNDS} />
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <span key={s} className={`chip px-2.5 py-1 text-xs ${i === si ? 'bg-amber-600 text-white' : i < si ? 'bg-amber-100 text-amber-800' : dark ? 'bg-slate-700 text-slate-300' : 'bg-white text-ink-soft ring-1 ring-line'}`}>{i + 1}. {s}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div>
          <Plane initial={{ xMin: -10, xMax: 10, yMin: -2.6, yMax: 9.6 }} grid={false} axes={false} minSpan={4} maxSpan={30} label="Top, balon ve iletki">
            <Field tg={tg} phase={phase} shotAng={phase === 'estimate' ? null : meas} t={t} popped={popped} bench={bench && phase === 'estimate'} />
            {phase !== 'estimate' && <Protractor cx={pro.x} cy={pro.y} rot={pro.rot} fine={fine} onMove={moveP} onRotate={rotP} />}
          </Plane>
        </div>

        <div className="space-y-3">
          {phase === 'estimate' && (
            <div className={`rounded-2xl p-3 ${panel}`}>
              <p className="text-base font-black">Kırmızı kesikli çizgi yerle kaç derecelik açı yapıyor?</p>
              <p className={`text-sm font-bold ${soft}`}>Önce ölçmeden tahmin et. Bildiğin açılarla karşılaştır.</p>
              {grade === 4 && (
                <div className="mt-2">
                  <p className={`text-xs font-extrabold tracking-wide uppercase ${soft}`}>Dik açıyla karşılaştır: bu açı…</p>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {KINDS.map((k) => (
                      <button key={k.k} type="button" onClick={() => setKind(k.k)} aria-pressed={kind === k.k} className={`min-h-12 rounded-xl text-base font-black ring-1 transition active:scale-95 ${kind === k.k ? 'bg-amber-500 text-white ring-amber-500' : 'bg-white text-ink ring-line'}`}>{k.label}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3">{dial(est, setEst, '#b45309', 'Tahminim')}</div>
              <button type="button" onClick={() => { setBench(!bench); if (!stats.current.benchUsed) { stats.current.benchUsed = true; track.strategy('Referans açıları (45°, 90°, 135°) kullandı') } }} aria-pressed={bench} className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 ${bench ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-ink ring-line'}`}>
                {bench ? 'Referans çizgilerini gizle' : '45°, 90°, 135° referans çizgilerini göster'}
              </button>
              <button type="button" onClick={commitEstimate} className="btn-primary mt-3 w-full text-lg">Tahminim bu</button>
            </div>
          )}

          {(phase === 'measure' || phase === 'fly') && (
            <div className={`rounded-2xl p-3 ${panel}`}>
              {kindMsg && <p className="mb-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-800">{kindMsg}</p>}
              <p className="flex items-center gap-1.5 text-base font-black"><Ruler size={18} className="text-amber-500" />Şimdi iletkiyle ölç</p>
              <p className={`text-sm font-bold ${soft}`}>İletkiyi sürükle; merkezini topun dibine, düz kenarını yere yerleştir. İki parmakla döndürebilirsin.</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button type="button" onClick={() => nudgeRot(5)} className="grid size-12 place-items-center rounded-xl bg-white text-ink ring-1 ring-line active:scale-95" aria-label="İletkiyi sola döndür"><RotateCcw size={20} /></button>
                <span className={`min-w-28 rounded-xl px-2 py-1 text-center text-sm font-black ${aligned ? 'bg-emerald-100 text-emerald-800' : dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-ink-soft'}`}>{aligned ? 'Hizalandı ✓' : 'Hizalı değil'}</span>
                <button type="button" onClick={() => nudgeRot(-5)} className="grid size-12 place-items-center rounded-xl bg-white text-ink ring-1 ring-line active:scale-95" aria-label="İletkiyi sağa döndür"><RotateCw size={20} /></button>
              </div>
              <div className="mt-3">{dial(meas, setMeas, '#2563eb', 'Ölçtüğüm açı')}</div>
              <button type="button" onClick={fire} disabled={phase === 'fly'} className="btn-primary mt-3 w-full text-lg"><Crosshair size={20} />Ateş! {meas}°</button>
            </div>
          )}

          {phase === 'result' && (
            <div className={`rounded-2xl p-3 animate-pop ${panel}`}>
              <p className="text-lg font-black text-emerald-500">Balon patladı! 🎯</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className={`rounded-xl p-2 ${dark ? 'bg-slate-700' : 'bg-amber-50'}`}><p className="text-xs font-extrabold opacity-70">Tahminin</p><p className="text-xl font-black text-amber-600">{stats.current.estErr.length > round ? est : '–'}°</p></div>
                <div className={`rounded-xl p-2 ${dark ? 'bg-slate-700' : 'bg-sky-50'}`}><p className="text-xs font-extrabold opacity-70">Ölçümün</p><p className="text-xl font-black text-sky-600">{meas}°</p></div>
                <div className={`rounded-xl p-2 ${dark ? 'bg-slate-700' : 'bg-rose-50'}`}><p className="text-xs font-extrabold opacity-70">Gerçek</p><p className="text-xl font-black text-rose-600">{tg.a}°</p></div>
              </div>
              <p className={`mt-2 text-sm font-bold ${soft}`}>{err <= 5 ? 'Tahminin neredeyse tam! Referans açıları iyi kullanıyorsun.' : err <= 15 ? `Tahminin ${err}° uzaktaydı; oldukça yakın.` : `Tahminin ${err}° uzaktaydı. Bir dahaki sefere önce 90° ile karşılaştır: daha mı açık, daha mı kapalı?`}</p>
              {round % 2 === 0 && !picked && <StrategyPicker question="Tahmin ederken hangi açıyı referans aldın?" options={STRATS} onPick={() => setPicked(true)} />}
              <button type="button" onClick={next} className="btn-primary mt-3 w-full">{round + 1 >= ROUNDS ? 'Sonuçları gör' : 'Sonraki balon'}<ArrowRight size={18} /></button>
            </div>
          )}
        </div>
      </div>

      {nudge && <Nudge key={nudge.k} question={nudge.q} misconception={nudge.mis} tool="angle" toolTitle="Açı ölçer" onClose={() => setNudge(null)} />}
    </Scene>
  )
}
