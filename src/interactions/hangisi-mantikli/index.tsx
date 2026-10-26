import { useMemo, useRef, useState } from 'react'
import { Check, Focus, MapPin } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { StrategyPicker, useAge } from '../../games/kit2'
import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { clamp } from '../../interactive/axis'
import { ActivityLayout, DoneNote, tr, useNudge, useSession } from '../hizli-noktalar/kit'
import type { InteractionProps } from '../types'
import { makeTasks, type Cand } from './tasks'

/**
 * 27. Hangisi Daha Mantıklı? — Van de Walle: “önce tahmin”, referans (kolay) sayılarla makul sonucu seçme.
 * Akış: (1) öğrenci kendi tahminini anlamsal yakınlaştırmalı sayı doğrusuna koyar → (2) dört arkadaşın cevabı
 * bayrak olarak doğruya yerleşir → (3) makul olanı seçer (çeldiriciler gerçek kavram yanılgılarından; her biri
 * düşündüren bir soru ve rapora yanılgı kaydı) → (4) gerekçesini seçer → (5) gerçek sonuç ve tahmin farkı görünür.
 * Yakınlaşınca çentikler incelir: 77 ile 87’yi ayırmak için yakınlaşmak gerekir.
 *  2: iki basamaklı +/− (onluğa yuvarlama), cm bağlamı · 3: üç basamaklı +/−, 2 bas. × 1 bas. · 4: 4 basamak, ×/÷ tahmini
 *  5: büyük çarpım/bölüm, kesirlerin 0–½–1 referansları · 6: ondalık × ve ÷, yüzde · 7: rasyonel sayılar, oran
 *  8: karekök ve üslü ifadeler, bilimsel gösterim, köşegen bağlamı.
 */

type Phase = 'estimate' | 'choose' | 'why' | 'reveal'

export default function HangisiMantikli({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const T = tasks[S.idx]
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const { nudge, show, clear } = useNudge()
  const [phase, setPhase] = useState<Phase>('estimate')
  const [pin, setPin] = useState<number | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const [chosen, setChosen] = useState<string | null>(null)
  const [zoom, setZoom] = useState<[number, number] | null>(null)
  const [hintI, setHintI] = useState(0)
  const totals = useRef({ close: 0, errs: [] as number[] })

  const span = T.view[1] - T.view[0]
  const base = { xMin: T.view[0], xMax: T.view[1], yMin: -1, yMax: 1 }
  const initial = zoom ? { ...base, xMin: zoom[0], xMax: zoom[1] } : base

  const choose = (c: Cand) => {
    if (phase !== 'choose' || wrong.includes(c.who)) return
    if (c.ok) {
      S.attempt(true)
      clear()
      setChosen(c.who)
      setPhase('why')
    } else {
      S.attempt(false)
      setWrong((w) => [...w, c.who])
      show(`${c.who}: “${c.short}”. ${c.q ?? 'Bu sonuç mantıklı mı? Kolay sayılarla düşün.'}`, { misc: c.misc })
    }
  }

  const reveal = () => {
    setPhase('reveal')
    S.complete()
    if (pin !== null) {
      const rel = Math.abs(pin - T.exact) / Math.max(Math.abs(T.exact), span * 0.02)
      totals.current.errs.push(rel)
      if (rel <= 0.15) totals.current.close++
    }
    zoomToExact()
  }

  /** gerçek sonuç ile tahmin etrafına yakınlaş */
  const zoomToExact = (withPin = true) => {
    const pts = [T.exact, withPin && pin !== null ? pin : T.exact]
    const lo = Math.min(...pts), hi = Math.max(...pts)
    const w = Math.max(hi - lo, Math.abs(T.exact) * 0.25, span * 0.02)
    setZoom([lo - w * 0.35, hi + w * 0.35])
  }

  const hint = () => {
    S.hint()
    show(T.hints[Math.min(hintI, T.hints.length - 1)])
    setHintI((i) => i + 1)
  }

  const next = () => {
    if (S.last) {
      const n = tasks.length
      onFinish({
        stars: S.stars(),
        summary: `${n} durumda makul sonucu seçtin; tahminlerinden ${totals.current.close} tanesi gerçek sonuca çok yakındı.`,
        insight:
          grade <= 4
            ? 'Hesaplamadan önce sayıları kolay sayılara yuvarlamak (48 + 39 ≈ 50 + 40), mantıksız sonuçları hemen yakalatır.'
            : grade <= 6
              ? 'Referans sayılar (0, ½, 1; kolay çarpımlar; %50, %25) sonucun nerede olması gerektiğini söyler: 4,9 × 3,1 ≈ 5 × 3 = 15.'
              : 'Bir sonucu kabul etmeden önce işaretini, büyüklüğünü ve birimini kolay bir tahminle karşılaştır: √{50} ≈ 7, çünkü 7^{2} = 49.',
      })
      return
    }
    setPhase('estimate')
    setPin(null)
    setWrong([])
    setChosen(null)
    setZoom(null)
    setHintI(0)
    clear()
    S.next()
  }

  const fmtPin = (v: number) => {
    const step = span / 100
    const d = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)))
    return tr(Math.round(v * 10 ** d) / 10 ** d, d)
  }

  const exactRel = pin !== null ? Math.abs(pin - T.exact) / Math.max(Math.abs(T.exact), span * 0.02) : 1
  const praise = exactRel <= 0.1 ? 'Harika bir tahmin!' : exactRel <= 0.25 ? 'İyi bir tahmin!' : 'Tahminin biraz uzaktaydı; kolay sayılarla tahmin etmek yardım eder.'

  const instr: Record<Phase, string> = {
    estimate: 'Önce tahmin et: sonuç sayı doğrusunda nerede? Doğruya dokun ya da pembe pimi sürükle.',
    choose: 'Arkadaşlarının cevapları bayraklarla yerleşti. Hangisi daha mantıklı? Bir bayrağa ya da karta dokun.',
    why: 'Doğru seçim! Neden mantıklı olduğunu açıkla.',
    reveal: 'Gerçek sonucu ve kendi tahminini karşılaştır. Yakınlaşınca fark daha iyi görünür.',
  }

  const panel = (
    <>
      {phase === 'estimate' && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="text-sm font-black text-ink-soft">Senin tahminin</p>
          <p className="mt-1 text-3xl font-black text-brand">{pin === null ? '—' : `${fmtPin(pin)}${T.unit ? ' ' + T.unit : ''}`}</p>
          <button type="button" onClick={() => setPhase('choose')} disabled={pin === null} className="btn-primary mt-3 min-h-14 w-full text-lg">
            <MapPin size={20} />
            Tahminimi koydum
          </button>
        </div>
      )}
      {phase !== 'estimate' && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black">Arkadaşlarının cevapları</p>
          <div className="grid gap-2">
            {T.cands.map((c) => {
              const isW = wrong.includes(c.who)
              const isC = chosen === c.who
              return (
                <button
                  key={c.who}
                  type="button"
                  onClick={() => choose(c)}
                  disabled={phase !== 'choose' || isW}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-3 text-left transition ${isC ? 'border-ok bg-ok-soft' : isW ? 'border-line bg-paper opacity-55' : 'border-line bg-white hover:border-brand'} disabled:cursor-default`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full text-2xl" style={{ background: `${c.color}22` }} aria-hidden>{c.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black" style={{ color: c.color }}>{c.who}</span>
                    <span className={`block text-xl font-black ${isW ? 'line-through decoration-2' : ''}`}><MathText text={c.text} /></span>
                  </span>
                  {isC && <Check className="text-ok" size={24} strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {phase === 'why' && <StrategyPicker key={S.idx} question="Neden mantıklı? Hangi kolay sayıyı düşündün?" options={T.reasons} onPick={() => reveal()} />}
    </>
  )

  const doneBox = (
    <DoneNote title={T.context ? `Makul cevap: ${T.exactText}` : 'Makul sonucu buldun!'}>
      <p className="mt-1 font-bold text-green-900"><MathText text={T.bench} /></p>
      {pin !== null && (
        <p className="mt-1 text-sm font-bold text-green-900">
          Senin tahminin {fmtPin(pin)}{T.unit ? ' ' + T.unit : ''}. {praise}
        </p>
      )}
    </DoneNote>
  )

  return (
    <ActivityLayout grade={grade} idx={S.idx} total={tasks.length} title={T.title} prompt={T.prompt} nudge={nudge} onCloseNudge={clear} done={S.done} doneBox={doneBox} onNext={next} onHint={phase === 'reveal' ? undefined : hint} panel={panel}>
      <div className="flex flex-col gap-3">
        <div className={`flex flex-wrap items-center justify-center gap-3 rounded-2xl px-4 py-3 text-center ${dark ? 'bg-slate-800/70 ring-1 ring-slate-600' : 'bg-white/90 ring-1 ring-line'}`}>
          <span className={`text-2xl font-black sm:text-3xl ${dark ? 'text-white' : 'text-ink'}`}><MathText text={T.expr} /></span>
          {!T.context && <span className={`text-2xl font-black sm:text-3xl ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>≈ ?</span>}
        </div>
        <p className={`px-1 text-sm font-extrabold sm:text-base ${dark ? 'text-slate-200' : 'text-ink-soft'}`}>{instr[phase]}</p>
        <Plane
          key={`${S.idx}-${zoom ? zoom.join(',') : 'base'}`}
          initial={initial}
          mode="x"
          minSpan={span / 2000}
          maxSpan={span * 4}
          label="Tahmin sayı doğrusu"
          onTap={phase === 'estimate' ? (p) => setPin(p.x) : undefined}
        >
          {phase !== 'estimate' && <Flags cands={T.cands} wrong={wrong} chosen={chosen} onPick={choose} active={phase === 'choose'} />}
          {phase === 'reveal' && <ExactMark v={T.exact} />}
          {pin !== null && <Pin v={pin} onChange={phase === 'estimate' ? setPin : undefined} />}
          {pin === null && phase === 'estimate' && <TapHint />}
        </Plane>
        {phase === 'reveal' && (
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setZoom(null)} className="btn-ghost min-h-12 text-sm"><Focus size={16} />Tüm cevapları gör</button>
            <button type="button" onClick={() => zoomToExact(false)} className="btn-ghost min-h-12 text-sm"><Focus size={16} />Gerçek sonuca yakınlaş</button>
          </div>
        )}
        {phase === 'reveal' && (
          <div className={`rounded-2xl p-3 text-center font-extrabold animate-fade-up ${dark ? 'bg-emerald-900/50 text-emerald-100 ring-1 ring-emerald-700' : 'bg-ok-soft text-green-900'}`}>
            Gerçek sonuç: <MathText text={T.exactText} />{T.unit && !T.exactText.includes(T.unit) ? ` ${T.unit}` : ''}
            {pin !== null && <> · Senin tahminin: {fmtPin(pin)}</>}
          </div>
        )}
      </div>
    </ActivityLayout>
  )
}

/** Tahmin pimi (sürüklenebilir) */
function Pin({ v, onChange }: { v: number; onChange?: (x: number) => void }) {
  const P = usePlane()
  const snap = P.step / 10
  return (
    <>
      <line x1={P.sx(v)} x2={P.sx(v)} y1={P.sy(0)} y2={P.height - 4} stroke="#d6457a" strokeWidth={2} strokeDasharray="3 3" pointerEvents="none" />
      <DragPoint x={v} y={0} r={13} color="#d6457a" label="Sen" disabled={!onChange} onChange={onChange ? (p) => onChange(Math.round(p.x / snap) * snap) : undefined} />
    </>
  )
}

function TapHint() {
  const P = usePlane()
  return (
    <text x={P.width / 2} y={30} textAnchor="middle" fontSize={15} fontWeight={900} fill="#d6457a" pointerEvents="none">👆 Sonuç sence nerede? Doğruya dokun.</text>
  )
}

/** Gerçek sonuç: yeşil çizgi */
function ExactMark({ v }: { v: number }) {
  const P = usePlane()
  const x = P.sx(v)
  if (x < -2 || x > P.width + 2) return null
  return (
    <g pointerEvents="none" className="animate-pop">
      <line x1={x} x2={x} y1={4} y2={P.height - 2} stroke="#16a34a" strokeWidth={3} />
      <circle cx={x} cy={P.sy(0)} r={9} fill="#16a34a" stroke="#fff" strokeWidth={3} />
    </g>
  )
}

/** Adayların bayrakları; üst üste binmesin diye iki sıraya dizilir, görünmeyenler kenarda okla gösterilir */
function Flags({ cands, wrong, chosen, onPick, active }: { cands: Cand[]; wrong: string[]; chosen: string | null; onPick: (c: Cand) => void; active: boolean }) {
  const P = usePlane()
  const y0 = P.sy(0)
  const items = cands
    .map((c) => {
      const raw = P.sx(c.v)
      const off = raw < 0 ? -1 : raw > P.width ? 1 : 0
      const label = `${off < 0 ? '◀ ' : ''}${c.who}: ${c.short}${off > 0 ? ' ▶' : ''}`
      const w = label.length * 7.4 + 18
      return { c, raw, off, label, w, x: clamp(raw, 6, P.width - 6) }
    })
    .sort((a, b) => a.x - b.x)
  const ends = [-Infinity, -Infinity]
  const placed = items.map((it) => {
    // sağ üstteki yakınlaştırma düğmelerinin altına girmesin
    const maxLeft = Math.max(2, P.width - 148 - it.w)
    const want = clamp(it.x - it.w / 2, 2, maxLeft)
    let lvl = [0, 1].find((l) => Math.max(want, ends[l] + 4) <= maxLeft) ?? -1
    let left: number
    if (lvl >= 0) left = Math.max(want, ends[lvl] + 4)
    else {
      lvl = ends[0] <= ends[1] ? 0 : 1
      left = maxLeft
    }
    ends[lvl] = left + it.w
    return { ...it, left, top: lvl === 0 ? 4 : 32 }
  })
  return (
    <g>
      {placed.map(({ c, x, off, label, w, left, top }) => {
        const isW = wrong.includes(c.who), isC = chosen === c.who
        const fill = isC ? '#16a34a' : isW ? '#cbd5e1' : c.color
        return (
          <g key={c.who} data-handle role="button" aria-label={`${c.who}: ${c.short}`} onClick={() => active && onPick(c)} style={{ cursor: active && !isW ? 'pointer' : 'default', touchAction: 'none' }} opacity={isW ? 0.7 : 1}>
            {!off && <path d={`M${clamp(x, left + 8, left + w - 8)} ${top + 24} L${x} ${y0 - 14} L${x} ${y0}`} fill="none" stroke={fill} strokeWidth={2.5} />}
            {!off && <circle cx={x} cy={y0} r={6} fill={fill} stroke="#fff" strokeWidth={2} />}
            <rect x={left - 4} y={top - 4} width={w + 8} height={32} fill="transparent" />
            <rect x={left} y={top} width={w} height={24} rx={8} fill={fill} />
            <text x={left + w / 2} y={top + 17} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff" textDecoration={isW ? 'line-through' : undefined}>{label}</text>
          </g>
        )
      })}
    </g>
  )
}
