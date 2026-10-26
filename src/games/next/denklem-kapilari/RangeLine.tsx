import { useState } from 'react'
import { DragPoint, Plane, usePlane } from '../../../interactive/Plane'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { Nudge } from '../../kit2'
import { ek } from '../../../lib/generators'
import { evalSide, fmt, fmtEq, isInt, num, r, subst, type Eq, type R, type Rel } from './algebra'

/**
 * Eşitsizlik kapısı, 2. aşama: çözüm kümesini sayı doğrusunda göster.
 * Uç noktayı sürükle, dahil/dahil değil ve yönü seç. Doğruya dokunarak bir anahtarı (x değerini) dene.
 */
function Ray({ x, closed, dir, probe }: { x: number; closed: boolean; dir: 1 | -1 | 0; probe: { x: number; ok: boolean } | null }) {
  const P = usePlane()
  const y = P.sy(0)
  const x0 = P.sx(x)
  const x1 = dir > 0 ? P.width + 10 : -10
  return (
    <g pointerEvents="none">
      {dir !== 0 && <line x1={x0} x2={x1} y1={y - 16} y2={y - 16} stroke="#10b981" strokeWidth={7} strokeLinecap="round" />}
      {dir !== 0 && <path d={dir > 0 ? `M${P.width - 4} ${y - 16} l-12 -8 v16 z` : `M4 ${y - 16} l12 -8 v16 z`} fill="#10b981" />}
      <circle cx={x0} cy={y - 16} r={9} fill={closed ? '#10b981' : '#fff'} stroke="#10b981" strokeWidth={3.5} />
      {probe && (
        <g>
          <line x1={P.sx(probe.x)} x2={P.sx(probe.x)} y1={y - 44} y2={y + 2} stroke={probe.ok ? '#10b981' : '#f43f5e'} strokeWidth={2} strokeDasharray="4 3" />
          <text x={P.sx(probe.x)} y={y - 50} textAnchor="middle" fontSize={18}>{probe.ok ? '🔓' : '🔒'}</text>
        </g>
      )}
    </g>
  )
}

const holds = (rel: Rel, a: number, b: number) => (rel === '<' ? a < b : rel === '>' ? a > b : rel === '≤' ? a <= b : rel === '≥' ? a >= b : a === b)

export function RangeLine({ eq, solved, view, dark, onSolved }: { eq: Eq; solved: { value: R; rel: Rel }; view: [number, number]; dark: boolean; onSolved: () => void }) {
  const track = useTracker()
  const [x, setX] = useState(0)
  const [closed, setClosed] = useState<boolean | null>(null)
  const [dir, setDir] = useState<1 | -1 | 0>(0)
  const [probe, setProbe] = useState<{ x: number; ok: boolean } | null>(null)
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const [done, setDone] = useState(false)
  const end = num(solved.value)
  const wantClosed = solved.rel === '≤' || solved.rel === '≥'
  const wantDir: 1 | -1 = solved.rel === '>' || solved.rel === '≥' ? 1 : -1

  const test = (v: number) => {
    const rv = r(Math.round(v))
    const ok = holds(eq.rel, num(evalSide(eq.L, rv)), num(evalSide(eq.R, rv)))
    setProbe({ x: Math.round(v), ok })
  }

  const check = () => {
    const ok = Math.abs(x - end) < 1e-9 && closed === wantClosed && dir === wantDir
    track.attempt(ok)
    if (ok) {
      setDone(true)
      sfx.ok()
      onSolved()
      return
    }
    sfx.bad()
    const e = fmt(solved.value)
    const L = fmtEq(eq)
    const sfx2 = (k: 'acc' | 'abl') => (isInt(solved.value) ? ek(num(solved.value), k, false) : k === 'acc' ? '’i' : '’ten')
    if (Math.abs(x - end) > 1e-9) return setNudge({ q: `Uç nokta, x’i yalnız bıraktığında bulduğun sayı olmalı: x ${solved.rel} ${e}. Noktayı oraya taşı.` })
    if (closed !== wantClosed)
      return setNudge({
        q: wantClosed ? `x = ${e} kapıyı açar mı? ${L} eşitsizliğinde ${e}${sfx2('acc')} yerine koy: sağlıyorsa nokta dolu olmalı.` : `x = ${e} kapıyı açar mı? ${L} eşitsizliğinde yerine koy: eşit çıkıyorsa “küçüktür/büyüktür” sağlanır mı? Doğruya dokunarak dene.`,
        m: wantClosed ? undefined : 'Kesin eşitsizlikte sınır değerini çözüme dahil etti',
      })
    setNudge({ q: `x ${solved.rel} ${e}: ${e}${sfx2('abl')} küçük sayılar mı, büyük sayılar mı kapıyı açar? Doğruya dokunup bir anahtar dene.`, m: 'Eşitsizliğin çözüm kümesini ters yönde gösterdi' })
  }

  const tg = (on: boolean) => `min-h-12 flex-1 rounded-xl px-2 text-sm font-black ring-1 transition ${on ? 'bg-emerald-600 text-white ring-emerald-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`

  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'} animate-fade-up`}>
      <p className={`mb-1 text-xs font-black tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-indigo-700'}`}>Kapıyı açan sayılar</p>
      <p className={`mb-2 text-base font-bold ${dark ? 'text-slate-200' : 'text-ink'}`}>
        <MathText text={`x ${solved.rel} ${fmt(solved.value)}`} /> buldun. Şimdi bu sayıları doğruda göster. Bir sayıya dokunarak anahtarı dene.
      </p>
      <Plane mode="x" initial={{ xMin: view[0], xMax: view[1], yMin: -1, yMax: 1 }} fixedStep={1} minSpan={4} maxSpan={40} onTap={(p) => test(p.x)} label="Eşitsizlik sayı doğrusu">
        <Ray x={x} closed={!!closed} dir={dir} probe={probe} />
        <DragPoint x={x} y={0} r={12} color="#4f46e5" disabled={done} onChange={(p) => setX(Math.round(p.x))} />
      </Plane>
      {probe && (
        <p className={`mt-1 text-sm font-black ${probe.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
          <MathText text={`x = ${probe.x}: ${subst(eq.L, r(probe.x))} = ${fmt(evalSide(eq.L, r(probe.x)))} ${eq.rel} ${fmt(evalSide(eq.R, r(probe.x)))} → ${probe.ok ? 'sağlanıyor, kapı açılır' : 'sağlanmıyor'}`} />
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button type="button" className={tg(closed === true)} onClick={() => setClosed(true)} disabled={done}>● Dahil</button>
        <button type="button" className={tg(closed === false)} onClick={() => setClosed(false)} disabled={done}>○ Dahil değil</button>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className={tg(dir === -1)} onClick={() => setDir(-1)} disabled={done}>← Küçükler</button>
        <button type="button" className={tg(dir === 1)} onClick={() => setDir(1)} disabled={done}>Büyükler →</button>
      </div>
      {!done && <button type="button" onClick={check} disabled={closed === null || dir === 0} className="btn-primary mt-3 min-h-12 w-full">{closed === null || dir === 0 ? 'Uç noktayı ve yönü seç' : 'Aralığı kilide göster'}</button>}
      {nudge && !done && (
        <div className="[&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
          <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} onClose={() => setNudge(null)} />
        </div>
      )}
    </div>
  )
}
