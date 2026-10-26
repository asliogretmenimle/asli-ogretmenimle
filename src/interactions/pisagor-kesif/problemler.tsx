import { useState } from 'react'
import { Triangle } from 'lucide-react'
import { DragPoint, Plane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { ek } from '../../lib/generators'
import { Card, CheckButton, Choices, GhostButton, NumPad, Nudge, Prompt, Split, fmt, near, parseNum, useChecks, type Pt } from '../donusum-studyosu/ortak'
import { COL, Poly, RightMark, Tag, rootText, type Common } from './parca'

/* ───────────────────────── 6. Eksik kenar (merdiven / bahçe yolu) ───────────────────────── */

export type Missing =
  | { mode: 'ladder'; L: number; d: number }
  | { mode: 'diag'; w: number; h: number }

const ok1 = (x: number, ans: number) => Math.abs(x - ans) <= 0.06

export function MissingTask({ p, footer, onSolved }: { p: Missing } & Common) {
  const sq = p.mode === 'ladder' ? p.L * p.L - p.d * p.d : p.w * p.w + p.h * p.h
  const ans = Math.sqrt(sq)
  const lo = Math.floor(ans)
  const [phase, setPhase] = useState<'est' | 'calc' | 'done'>('est')
  const [iv, setIv] = useState<number | null>(null)
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const opts = [lo - 1, lo, lo + 1].filter((n) => n >= 1)

  const checkEst = () => {
    if (iv === lo) {
      setPhase('calc')
      setFb({ ok: true, text: `Evet: ${lo}² = ${lo * lo} < ${sq} < ${(lo + 1) ** 2} = ${lo + 1}². Şimdi daha yakından hesapla.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `Önce “?” kenarının karesini bul: ${p.mode === 'ladder' ? `${p.L}² − ${p.d}²` : `${p.w}² + ${p.h}²`} = ? Sonra bu sayı ${iv}² = ${(iv ?? 0) ** 2} ile ${(iv ?? 0) + 1}² = ${((iv ?? 0) + 1) ** 2} arasında mı?` })
  }
  const checkCalc = () => {
    const x = parseNum(val)
    if (Number.isNaN(x)) return
    if (ok1(x, ans)) {
      const first = chk.pass()
      onSolved(first)
      setPhase('done')
      setFb({ ok: true, text: p.mode === 'ladder' ? `h² + ${p.d}² = ${p.L}² → h² = ${sq} → h = ${rootText(sq)} m. Merdiven duvara yaklaşık ${fmt(ans, 1)} m yükseklikte dayanır.` : `?² = ${p.w}² + ${p.h}² = ${sq} → ? = ${rootText(sq)} m. Çapraz yol, kenarlardan dolaşmaktan (${p.w + p.h} m) kısa!` })
      return
    }
    chk.fail()
    const [m, n] = p.mode === 'ladder' ? [p.L, p.d] : [p.w, p.h]
    if (p.mode === 'diag' && near(x, m + n)) setFb({ ok: false, mis: 'Pisagor bağıntısında kenarları topladı (c = a + b sandı)', text: `${m} + ${n} = ${m + n} kenarlardan dolaşmanın uzunluğu. Çapraz yol bundan kısa olmalı, değil mi? Kenarların karelerini topla.` })
    else if (near(x, sq)) setFb({ ok: false, mis: 'Pisagor bağıntısında karekök almayı unuttu', text: `${sq} kenarın karesi, yani karenin alanı. Kenarın kendisi hangi sayının karesi ${sq} ediyor?` })
    else if (near(x, Math.sqrt(2 * m + 2 * n), 0.06) || near(x, 2 * m + 2 * n)) setFb({ ok: false, mis: 'Kare almak yerine 2 ile çarptı', text: `${m}² ile 2 · ${m} aynı mı? ${m}² = ${m} · ${m} = ${m * m}.` })
    else if (p.mode === 'ladder' && ok1(x, Math.sqrt(p.L * p.L + p.d * p.d))) setFb({ ok: false, mis: 'Dik kenarı bulurken hipotenüsü yanlış seçti', text: `Bu üçgende en uzun kenar (hipotenüs) hangisi: merdiven mi, yükseklik mi? Yükseklik merdivenden uzun olabilir mi?` })
    else if (p.mode === 'ladder' && near(x, p.L - p.d)) setFb({ ok: false, mis: 'Pisagor bağıntısında kenarları çıkardı', text: `${p.L} − ${p.d} = ${p.L - p.d}. Bağıntı kenarlar için değil, kareler için: ${p.L}² − ${p.d}² kaç?` })
    else if (Math.floor(x) !== lo) setFb({ ok: false, text: `Tahminin ${lo} ile ${lo + 1} arasındaydı; ${val} bu aralıkta mı? Yeniden hesapla.` })
    else setFb({ ok: false, text: `Yaklaştın! ${fmt(x, 2)}² = ${fmt(x * x, 2)}. ${ek(sq, 'dat')} daha yakın bir ondalık sayı dene (virgülden sonra bir basamak yeter).` })
  }

  const scene = p.mode === 'ladder' ? <Ladder L={p.L} d={p.d} reveal={phase === 'done' ? fmt(ans, 1) : null} /> : <Garden w={p.w} h={p.h} reveal={phase === 'done' ? fmt(ans, 1) : null} />
  return (
    <Split
      work={<div className="mx-auto w-full max-w-[34rem]">{scene}</div>}
      panel={
        <>
          <Prompt step={p.mode === 'ladder' ? 'Merdiven' : 'Bahçe yolu'}>
            {p.mode === 'ladder'
              ? <>{p.L} m’lik bir merdiven, ucu duvardan {p.d} m uzakta olacak şekilde duvara dayandı. Merdiven duvara <b>hangi yükseklikte</b> değiyor?</>
              : <>{p.w} m × {p.h} m’lik dikdörtgen bir bahçede bir köşeden karşı köşeye <b>çapraz yol</b> yapılacak. Yol kaç metre?</>}
          </Prompt>
          {phase === 'est' && (
            <>
              <Card dark><p className="font-extrabold">Önce tahmin: “?” hangi iki tam sayı arasında?</p></Card>
              <Choices cols={3} options={opts.map((n) => ({ id: n, label: `${n} ile ${n + 1}` }))} value={iv} onPick={(v) => { setIv(v); setFb(null) }} />
              <CheckButton disabled={iv === null} onClick={checkEst}>Tahminimi kontrol et</CheckButton>
            </>
          )}
          {phase !== 'est' && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); if (phase !== 'done') setFb(null) }} comma max={5} unit="m" label="? =" disabled={phase === 'done'} />
              {phase === 'calc' && <CheckButton disabled={!val} onClick={checkCalc} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="dinamikucgen" />)}
          {phase === 'done' && footer}
        </>
      }
    />
  )
}

function Ladder({ L, d, reveal }: { L: number; d: number; reveal: string | null }) {
  const h = Math.sqrt(L * L - d * d)
  const k = 300 / L
  const wallX = 330, groundY = 340
  const fx = wallX - d * k, ty = groundY - h * k
  return (
    <svg viewBox="0 0 400 380" className="w-full rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 ring-1 ring-slate-600" role="img" aria-label="Duvara dayalı merdiven">
      <rect x={wallX} y={20} width={50} height={groundY - 20} fill="#7c2d12" />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1={wallX} x2={wallX + 50} y1={groundY - i * 36} y2={groundY - i * 36} stroke="#9a3412" strokeWidth={2} />)}
      <rect x={0} y={groundY} width={400} height={40} fill="#14532d" />
      <line x1={fx} y1={groundY} x2={wallX} y2={ty} stroke="#fbbf24" strokeWidth={8} strokeLinecap="round" />
      {Array.from({ length: 7 }, (_, i) => {
        const t = (i + 1) / 8
        return <circle key={i} cx={fx + (wallX - fx) * t} cy={groundY + (ty - groundY) * t} r={4} fill="#b45309" />
      })}
      <polyline points={`${wallX - 16},${groundY} ${wallX - 16},${groundY - 16} ${wallX},${groundY - 16}`} fill="none" stroke="#e2e8f0" strokeWidth={2} />
      <line x1={fx} x2={wallX} y1={groundY + 18} y2={groundY + 18} stroke="#e2e8f0" strokeWidth={2} />
      <text x={(fx + wallX) / 2} y={groundY + 34} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fff">{d} m</text>
      <text x={(fx + wallX) / 2 - 22} y={(groundY + ty) / 2} textAnchor="end" fontSize={20} fontWeight={900} fill="#fbbf24">{L} m</text>
      <line x1={wallX - 8} x2={wallX - 8} y1={ty} y2={groundY} stroke={COL.c} strokeWidth={3} strokeDasharray="6 5" />
      <text x={wallX - 16} y={(ty + groundY) / 2 + 8} textAnchor="end" fontSize={22} fontWeight={900} fill="#f9a8d4">{reveal ? `≈ ${reveal} m` : '?'}</text>
    </svg>
  )
}

function Garden({ w, h, reveal }: { w: number; h: number; reveal: string | null }) {
  const k = Math.min(320 / w, 240 / h)
  const W = w * k, H = h * k, x0 = (400 - W) / 2, y0 = 30
  return (
    <svg viewBox={`0 0 400 ${H + 90}`} className="w-full rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 ring-1 ring-slate-600" role="img" aria-label="Dikdörtgen bahçe ve çapraz yol">
      <rect x={x0} y={y0} width={W} height={H} fill="#166534" stroke="#86efac" strokeWidth={3} rx={4} />
      {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={x0 + ((i * 53) % W)} cy={y0 + ((i * 37) % H)} r={3} fill="#4ade80" opacity={0.5} />)}
      <line x1={x0} y1={y0 + H} x2={x0 + W} y2={y0} stroke="#e7d3a7" strokeWidth={12} strokeLinecap="round" />
      <line x1={x0} y1={y0 + H} x2={x0 + W} y2={y0} stroke={COL.c} strokeWidth={3} strokeDasharray="7 6" />
      <text x={x0 + W / 2} y={y0 + H + 28} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fff">{w} m</text>
      <text x={x0 + W + 10} y={y0 + H / 2 + 6} fontSize={17} fontWeight={900} fill="#fff">{h} m</text>
      <text x={x0 + W / 2 - 10} y={y0 + H / 2 - 14} textAnchor="end" fontSize={22} fontWeight={900} fill="#f9a8d4" stroke="#0f172a" strokeWidth={4} paintOrder="stroke">{reveal ? `≈ ${reveal} m` : '?'}</text>
    </svg>
  )
}

/* ───────────────────────── 7. Koordinat düzleminde uzaklık ───────────────────────── */

export function DistanceTask({ P, Q, footer, onSolved }: { P: Pt; Q: Pt } & Common) {
  const [R, setR] = useState<Pt>([6, -3])
  const [val, setVal] = useState('')
  const [done, setDone] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const dx = Math.abs(Q[0] - P[0]), dy = Math.abs(Q[1] - P[1])
  const d2 = dx * dx + dy * dy
  const ans = Math.sqrt(d2)
  const formed = (R[0] === Q[0] && R[1] === P[1]) || (R[0] === P[0] && R[1] === Q[1])
  const [h1, v1]: [Pt, Pt] = R[1] === P[1] ? [P, Q] : [Q, P] // yatay kenar R ile h1 arasında
  const lbl = (p: Pt, n: string) => `${n}(${fmt(p[0])}, ${fmt(p[1])})`

  const place = () => { setR([Q[0], P[1]]); setFb(null) }
  const check = () => {
    const x = parseNum(val)
    if (Number.isNaN(x)) return
    if (near(x, ans, 0.06)) {
      const first = chk.pass()
      onSolved(first)
      setDone(true)
      setFb({ ok: true, text: `|AB|² = ${dx}² + ${dy}² = ${d2} → |AB| = ${rootText(d2)} birim. İki nokta arasındaki uzaklık, yatay ve dikey farklarla kurulan dik üçgenin hipotenüsüdür.` })
      return
    }
    chk.fail()
    if (near(x, dx + dy)) setFb({ ok: false, mis: 'Pisagor bağıntısında kenarları topladı (c = a + b sandı)', text: `${dx} + ${dy} = ${dx + dy}: bu, ızgara çizgileri boyunca yürüyünce alınan yol. Kuş uçuşu (düz) yol daha kısa değil mi?` })
    else if (near(x, d2)) setFb({ ok: false, mis: 'Pisagor bağıntısında karekök almayı unuttu', text: `${d2}, AB kenarı üzerine kurulan karenin alanı. AB’nin kendisi kaç?` })
    else if (!formed) setFb({ ok: false, text: 'Mor köşeyi sürükleyerek kenarları ızgara çizgileri üzerinde olan bir dik üçgen kur. Dik kenarlar kaç birim?' })
    else setFb({ ok: false, text: `Dik kenarlar ${dx} ve ${dy} birim. Hipotenüsün karesi kaç eder?` })
  }

  return (
    <Split
      work={
        <div className="mx-auto w-full max-w-[36rem] lg:max-w-[min(36rem,calc(100dvh-13rem))]">
          <Plane initial={{ xMin: -7, xMax: 9, yMin: -6, yMax: 11 }} fixedStep={1} label="A ve B noktaları ile sürüklenebilir dik açı köşesi" xLabel="x" yLabel="y">
            <Poly pts={[P, Q]} fill="none" stroke={COL.c} strokeWidth={4} />
            {formed && (
              <g className="animate-fade-up">
                <Poly pts={[P, Q, R]} fill="#fbbf24" fillOpacity={0.2} stroke="#d97706" strokeWidth={2.5} strokeDasharray="7 5" />
                <RightMark p={h1} q={R} r={v1} />
                <Tag at={[(h1[0] + R[0]) / 2, R[1] + (v1[1] > R[1] ? -0.6 : 0.6)]} color="#b45309">{dx} birim</Tag>
                <Tag at={[R[0] + (h1[0] > R[0] ? -0.5 : 0.5), (v1[1] + R[1]) / 2]} color="#b45309" anchor={h1[0] > R[0] ? 'end' : 'start'}>{dy} birim</Tag>
              </g>
            )}
            {!formed && <Poly pts={[P, R, Q]} fill="none" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 5" />}
            <Tag at={[P[0] - 0.45, P[1] + 0.1]} color={COL.c} size={14} anchor="end">{lbl(P, 'A')}</Tag>
            <Tag at={[Q[0], Q[1] + 0.8]} color={COL.c} size={14}>{lbl(Q, 'B')}</Tag>
            <DragPoint x={P[0]} y={P[1]} color={COL.c} r={8} disabled />
            <DragPoint x={Q[0]} y={Q[1]} color={COL.c} r={8} disabled />
            <DragPoint x={R[0]} y={R[1]} color="#7c3aed" snapStep={1} onChange={(p) => { setR([p.x, p.y]); setFb(null) }} disabled={done} />
          </Plane>
        </div>
      }
      panel={
        <>
          <Prompt step="Kuş uçuşu uzaklık">Bir haritada A ve B noktaları arasındaki <b>düz uzaklık</b> kaç birim? Mor köşeyi sürükleyerek bir dik üçgen kur.</Prompt>
          <GhostButton dark onClick={place} disabled={done || formed}><Triangle size={18} />Dik üçgeni çiz</GhostButton>
          {formed && <Card dark><p className="font-bold"><MathText text={`Dik kenarlar: ${dx} ve ${dy} birim. |AB|^{2} = ?`} /></p></Card>}
          <NumPad value={val} onChange={(v) => { setVal(v); if (!done) setFb(null) }} comma max={5} unit="birim" label="|AB| =" disabled={done} />
          {!done && <CheckButton disabled={!val} onClick={check} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="dinamikucgen" />)}
          {done && footer}
        </>
      }
    />
  )
}
