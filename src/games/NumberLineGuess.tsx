import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { Grade } from '../data/types'
import { gcd, pick, randInt } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { MathText } from '../components/MathText'
import { Hud, signed, useWidth, type GameProps } from './kit'

interface Item {
  /** MathText gösterimi: "37", "[[3/4]]", "√{50}" */
  label: string
  value: number
  /** Gerçek yerin altında yazılacak kısa değer */
  caption: string
  /** Gerçek yeri açıklayan kısa düşünme ipucu (MathText) */
  hint: string
  /** Gösterilecek referans çentik aralığı */
  step: number
}

interface Cfg {
  min: number
  max: number
  gen: () => Item
  labelSteps: number[]
  labelFmt?: (v: number) => string
  ends?: [string, string]
  /** Fark yazılırken kaç ondalık */
  dec: number
  insight: string
}

const ROUNDS = 8
const H = 142
const LINE_Y = 84
const M = 30

const approx = (v: number, d = 2) => (Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-9 ? '' : '≈ ') + signed(fmt(v, d))

const intItem = (max: number, step: number, tick: number, midSuffix: string) => (): Item => {
  const edge = Math.max(1, Math.round(max * 0.03))
  const v = randInt(edge, max - edge)
  const mid = max / 2
  const a = Math.floor(v / step) * step
  const side = v === mid ? 'tam ortada' : `ortadaki ${fmt(mid)}${midSuffix} ${v < mid ? 'solunda' : 'sağında'}`
  const between = v % step ? `; ${fmt(a)} ile ${fmt(a + step)} arasında` : ''
  return { label: fmt(v), value: v, caption: fmt(v), hint: `${fmt(v)}, ${side}${between}.`, step: tick }
}

function fraction01(): Item {
  let d = 2, n = 1
  do {
    d = pick([2, 3, 4, 5, 6, 8, 10])
    n = randInt(1, d - 1)
  } while (gcd(n, d) !== 1)
  const f = `[[${n}/${d}]]`
  const hint = 2 * n === d
    ? `${f} tam ortadadır.`
    : 2 * n < d
      ? `Pay, paydanın yarısından küçük: ${f}, [[1/2]]’den küçük; sol yarıda.`
      : `Pay, paydanın yarısından büyük: ${f}, [[1/2]]’den büyük${d - n === 1 ? `; 1’e yalnızca [[1/${d}]] var.` : '; sağ yarıda.'}`
  return { label: f, value: n / d, caption: approx(n / d), hint: `${hint} 1 bütünü ${d} eş parçaya böl, ${n} parça say.`, step: 1 / d }
}

function fraction02(): Item {
  let d = 2, n = 1
  do {
    d = pick([2, 3, 4, 5, 6, 8])
    n = randInt(1, 2 * d - 1)
  } while (n === d || gcd(n, d) !== 1)
  const base = { value: n / d, caption: approx(n / d), step: 1 / d }
  if (n < d) return { ...base, label: `[[${n}/${d}]]`, hint: `[[${n}/${d}]], 1’den küçük: 0 ile 1 arasında. 0 ile 1 arasını ${d} eş parçaya böl.` }
  const mixed = `[[1 ${n - d}/${d}]]`
  return Math.random() < 0.5
    ? { ...base, label: mixed, hint: `${mixed}: 1 bütün ve [[${n - d}/${d}]]. 1’in sağında, 1 ile 2 arasında.` }
    : { ...base, label: `[[${n}/${d}]]`, hint: `Pay paydadan büyük, yani 1’den büyük: [[${n}/${d}]] = ${mixed}.` }
}

function decimalPercent(): Item {
  const kind = pick(['tenth', 'hundredth', 'percent'] as const)
  if (kind === 'tenth') {
    const t = randInt(1, 9)
    return { label: fmt(t / 10), value: t / 10, caption: fmt(t / 10), hint: `${fmt(t / 10)} = [[${t}/10]]: 1 bütünü 10 eş parçaya böl, ${t} parça say.`, step: 0.1 }
  }
  if (kind === 'hundredth') {
    let h = 5
    do h = randInt(5, 95)
    while (h % 10 === 0)
    const a = Math.floor(h / 10)
    return { label: fmt(h / 100, 2), value: h / 100, caption: fmt(h / 100, 2), hint: `${fmt(h / 100, 2)} = [[${h}/100]]; ${fmt(a / 10)} ile ${fmt((a + 1) / 10)} arasında.`, step: 0.1 }
  }
  const p = randInt(1, 19) * 5
  return { label: `%${p}`, value: p / 100, caption: fmt(p / 100, 2), hint: `%${p} = [[${p}/100]] = ${fmt(p / 100, 2)}. 1 bütün, %100 demektir.`, step: 0.1 }
}

function rational(): Item {
  const neg = Math.random() < 0.7
  const kind = pick(['int', 'half', 'frac'] as const)
  let v = 0
  let label = ''
  let extra = ''
  if (kind === 'int') {
    v = randInt(1, 9) * (neg ? -1 : 1)
    label = signed(String(v))
  } else if (kind === 'half') {
    v = (randInt(0, 9) * 2 + 1) / 2 * (neg ? -1 : 1)
    label = signed(fmt(v))
  } else {
    const d = pick([2, 4])
    const n = randInt(0, d === 2 ? 9 : 19) * 2 + 1
    v = (n / d) * (neg ? -1 : 1)
    label = `${neg ? '−' : ''}[[${n}/${d}]]`
    extra = ` = ${signed(fmt(v, 2))}`
  }
  const side = `0’ın ${v < 0 ? 'solunda' : 'sağında'}`
  const rest = Number.isInteger(v)
    ? `0’a uzaklığı ${Math.abs(v)}.`
    : `${signed(String(Math.floor(v)))} ile ${signed(String(Math.ceil(v)))} arasında.`
  return { label, value: v, caption: signed(fmt(v, 2)), hint: `${label}${extra}: ${side}; ${rest}`, step: 1 }
}

let sqrtPerfectUsed = false
function squareRoot(): Item {
  let n = 2
  if (!sqrtPerfectUsed && Math.random() < 0.15) {
    sqrtPerfectUsed = true
    n = pick([4, 9, 16, 25, 36, 49, 64, 81])
  } else {
    do n = randInt(2, 99)
    while (Number.isInteger(Math.sqrt(n)))
  }
  const r = Math.sqrt(n)
  const a = Math.floor(r)
  const hint = a * a === n
    ? `${a} × ${a} = ${n}, yani √{${n}} = ${a}.`
    : `${a} × ${a} = ${a * a} ve ${a + 1} × ${a + 1} = ${(a + 1) ** 2}. √{${n}}, ${a} ile ${a + 1} arasında; en yakın tam sayı ${Math.round(r)}.`
  return { label: `√{${n}}`, value: r, caption: approx(r), hint, step: 1 }
}

const CFG: Record<Grade, Cfg> = {
  1: { min: 0, max: 20, gen: intItem(20, 5, 1, '’un'), labelSteps: [5], dec: 0, insight: 'Ortadaki 10’u ve 5’leri aklında işaretleyince tahminlerin keskinleşir. En çok hangi sayılarda zorlandın?' },
  2: { min: 0, max: 100, gen: intItem(100, 10, 10, '’nin'), labelSteps: [10, 20], dec: 0, insight: 'Önce ortadaki 50’yi, sonra onlukları düşününce sayının yerini daha kolay buldun. Ortayı bulmak neden bu kadar işe yarıyor?' },
  3: { min: 0, max: 1000, gen: intItem(1000, 100, 100, '’ün'), labelSteps: [100, 200], dec: 0, insight: '500’ü ve yüzlükleri referans alınca büyük sayıları da yerleştirebiliyorsun. 250 ile 750 nerede olurdu?' },
  4: { min: 0, max: 1, gen: fraction01, labelSteps: [0.5], labelFmt: () => '1/2', dec: 2, insight: 'Kesri yarımla karşılaştırmak (pay, paydanın yarısından büyük mü?) yerini bulmanın en hızlı yolu. Paydası büyüyen kesirlerin parçaları neden küçülüyor?' },
  5: { min: 0, max: 2, gen: fraction02, labelSteps: [1], dec: 2, insight: 'Önce kesrin 1’den büyük mü küçük mü olduğuna bakmak işini kolaylaştırdı. Tam sayılı kesirle bileşik kesir aynı noktayı gösterebilir mi?' },
  6: { min: 0, max: 1, gen: decimalPercent, labelSteps: [0.1, 0.5], ends: ['%0', '%100'], dec: 2, insight: 'Ondalık gösterim, kesir ve yüzde aynı sayının farklı yazılışlarıdır: %50 = 0,5 = yarım. Sence %25 ile 0,3 hangisi daha büyük?' },
  7: { min: -10, max: 10, gen: rational, labelSteps: [1, 2, 5], dec: 2, insight: 'Negatif sayılar 0’ın solundadır ve 0’dan uzaklaştıkça küçülür: −7, −2’den küçüktür. −3,5 hangi iki tam sayının arasında?' },
  8: { min: 0, max: 10, gen: squareRoot, labelSteps: [1, 2], dec: 2, insight: 'Kareköklü bir sayının yerini bulmak için en yakın tam karelere baktın: √50, 49 ile 64 arasında olduğundan 7 ile 8 arasındadır.' },
}

function makeItems(cfg: Cfg): Item[] {
  sqrtPerfectUsed = false
  const out: Item[] = []
  const span = cfg.max - cfg.min
  for (let i = 0; out.length < ROUNDS && i < 600; i++) {
    const it = cfg.gen()
    const gap = i < 300 ? 0.04 : 0.005
    if (out.some((o) => Math.abs(o.value - it.value) < span * gap || o.label === it.label)) continue
    out.push(it)
  }
  while (out.length < ROUNDS) out.push(cfg.gen())
  return out
}

export default function NumberLineGuess({ grade, onFinish }: GameProps) {
  const cfg = CFG[grade]
  const [items] = useState(() => makeItems(cfg))
  const [round, setRound] = useState(0)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [points, setPoints] = useState<number[]>([])
  const dragging = useRef(false)
  const finished = useRef(false)
  const [box, W] = useWidth<HTMLDivElement>()
  const item = items[round]
  const span = cfg.max - cfg.min
  const inner = W - 2 * M
  const X = (v: number) => M + ((v - cfg.min) / span) * inner
  const score = points.reduce((a, b) => a + b, 0)
  const pts = revealed ? points[points.length - 1] : 0

  const valueAt = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    return cfg.min + Math.min(1, Math.max(0, (px - M) / inner)) * span
  }

  const commit = (v: number) => {
    if (revealed) return
    const err = Math.abs(v - item.value) / span
    const p = err <= 0.01 ? 100 : Math.max(0, Math.round(100 - err * 400))
    setGuess(v)
    setRevealed(true)
    setPoints([...points, p])
    if (p >= 50) sfx.ok()
    else sfx.bad()
  }

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (revealed) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    setGuess(valueAt(e))
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging.current && !revealed) setGuess(valueAt(e))
  }
  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    dragging.current = false
    commit(valueAt(e))
  }
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (revealed) return
    const g = guess ?? cfg.min + span / 2
    const d = (span / 100) * (e.shiftKey ? 10 : 1)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setGuess(Math.max(cfg.min, g - d))
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setGuess(Math.min(cfg.max, g + d))
    else if ((e.key === 'Enter' || e.key === ' ') && guess !== null) commit(guess)
    else return
    e.preventDefault()
  }

  const next = () => {
    if (round + 1 >= ROUNDS) {
      if (finished.current) return
      finished.current = true
      const close = points.filter((p) => p >= 70).length
      const avg = score / ROUNDS
      onFinish({
        stars: avg >= 80 ? 3 : avg >= 55 ? 2 : 1,
        score,
        summary: `${ROUNDS} sayının ${close} tanesini çok yakın tahmin ettin (ortalama ${Math.round(avg)} puan).`,
        insight: cfg.insight,
      })
      return
    }
    setRound(round + 1)
    setGuess(null)
    setRevealed(false)
  }

  // Açıldıktan sonra gösterilen referans çentikleri
  const refTicks: number[] = []
  if (revealed) for (let v = cfg.min; v <= cfg.max + 1e-9; v += item.step) refTicks.push(Math.round(v * 1e6) / 1e6)
  const labelStep = cfg.labelSteps.find((st) => (st / span) * inner >= 30) ?? cfg.labelSteps[cfg.labelSteps.length - 1]
  const refLabels: number[] = []
  if (revealed) for (let k = Math.ceil(cfg.min / labelStep); k * labelStep < cfg.max - 1e-9; k++) if (k * labelStep > cfg.min + 1e-9) refLabels.push(Math.round(k * labelStep * 1e6) / 1e6)

  const gx = guess !== null ? X(guess) : 0
  const vx = X(item.value)
  const diff = guess !== null ? Math.abs(guess - item.value) : 0
  const verdict = pts >= 90 ? 'Tam isabet! 🎯' : pts >= 70 ? 'Çok yakın! 👏' : pts >= 40 ? 'Fena değil!' : 'Biraz uzak kaldı.'
  const capX = Math.min(W - 34, Math.max(34, vx))

  return (
    <div className="animate-fade-up">
      <Hud round={round + 1} rounds={ROUNDS} score={score} />

      <div className="mb-3 rounded-2xl bg-ink px-4 py-3 text-center text-white">
        <span className="text-xs font-extrabold tracking-wide text-white/70 uppercase">Bu sayı nerede?</span>
        <p key={round} className="text-4xl font-black animate-pop sm:text-5xl"><MathText text={item.label} /></p>
      </div>

      <div ref={box} className="card overflow-hidden select-none">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className={`block touch-none ${revealed ? '' : 'cursor-crosshair'}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => (dragging.current = false)}
          onKeyDown={key}
          tabIndex={revealed ? -1 : 0}
          role="slider"
          aria-label="Sayı doğrusu. Dokun ya da ok tuşlarıyla işareti taşı, Enter ile onayla."
          aria-valuemin={cfg.min}
          aria-valuemax={cfg.max}
          aria-valuenow={guess ?? undefined}
          aria-valuetext={guess !== null ? fmt(guess, cfg.dec) : 'işaret yok'}
        >
          <rect width={W} height={H} fill="transparent" />
          <line x1={X(cfg.min)} y1={LINE_Y} x2={X(cfg.max)} y2={LINE_Y} stroke="#1f2340" strokeWidth={3} strokeLinecap="round" />
          {refTicks.map((v) => (
            <line key={v} x1={X(v)} y1={LINE_Y - 6} x2={X(v)} y2={LINE_Y + 6} stroke="#8a8fb0" strokeWidth={1.2} className="animate-fade-up" />
          ))}
          {refLabels.map((v) => (
            <text key={`l${v}`} x={X(v)} y={LINE_Y + 22} textAnchor="middle" fontSize={11} fontWeight={800} fill="#8a8fb0">{cfg.labelFmt ? cfg.labelFmt(v) : signed(fmt(v, 2))}</text>
          ))}
          {[cfg.min, cfg.max].map((v, i) => (
            <g key={v}>
              <line x1={X(v)} y1={LINE_Y - 12} x2={X(v)} y2={LINE_Y + 12} stroke="#1f2340" strokeWidth={3} strokeLinecap="round" />
              <text x={X(v)} y={LINE_Y + 36} textAnchor="middle" fontSize={18} fontWeight={900} fill="#1f2340">{signed(String(v))}</text>
              {cfg.ends && <text x={X(v)} y={LINE_Y + 52} textAnchor="middle" fontSize={12} fontWeight={800} fill="#5b6080">{cfg.ends[i]}</text>}
            </g>
          ))}
          {revealed && guess !== null && (
            <rect x={Math.min(gx, vx)} y={LINE_Y - 4} width={Math.max(2, Math.abs(gx - vx))} height={8} rx={4} fill="#f97316" fillOpacity={0.45} />
          )}
          {guess !== null && (
            <g transform={`translate(${gx} ${LINE_Y})`} className="pointer-events-none">
              <line y1={-16} y2={0} stroke="#ea580c" strokeWidth={3} />
              <path d="M0 -14 C-10 -24 -11 -30 -11 -34 a11 11 0 0 1 22 0 c0 4 -1 10 -11 20z" fill="#f97316" stroke="#fff" strokeWidth={2} />
              <circle cy={-34} r={4} fill="#fff" />
            </g>
          )}
          {revealed && (
            <g style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }} className="animate-pop pointer-events-none">
              <line x1={vx} y1={LINE_Y - 50} x2={vx} y2={LINE_Y} stroke="#16a34a" strokeWidth={3} />
              <path d={`M${vx} ${LINE_Y - 50} l16 6 l-16 6 z`} fill="#22c55e" />
              <circle cx={vx} cy={LINE_Y} r={5} fill="#16a34a" stroke="#fff" strokeWidth={2} />
              <text x={capX} y={18} textAnchor="middle" fontSize={15} fontWeight={900} fill="#15803d" stroke="#fff" strokeWidth={4} paintOrder="stroke">{item.caption}</text>
            </g>
          )}
        </svg>
      </div>

      {!revealed && (
        <div className="mt-3 text-center">
          <p className="text-sm font-bold text-ink-soft">Sayı doğrusunda yerine dokun. Sürükleyip bırakarak da işaretleyebilirsin.</p>
          {guess !== null && !dragging.current && (
            <button type="button" onClick={() => commit(guess)} className="btn-primary mt-3"><Check size={18} />Buraya karar verdim</button>
          )}
        </div>
      )}

      {revealed && (
        <div className={`mt-4 rounded-3xl p-4 text-center ring-1 animate-pop ${pts >= 70 ? 'bg-ok-soft ring-green-200' : pts >= 40 ? 'bg-amber-50 ring-amber-200' : 'bg-orange-50 ring-orange-200'}`} aria-live="polite">
          <p className="text-xl font-black">{verdict} <span className="text-amber-700">+{pts}</span></p>
          <p className="mt-1 font-bold text-ink">
            Gerçek yeri: <MathText text={item.label} className="font-black" />
            {item.caption !== item.label && <> {item.caption.startsWith('≈') ? '' : '= '}{item.caption}</>}
            {' · '}Fark: {cfg.dec ? fmt(diff, cfg.dec) : `yaklaşık ${fmt(Math.round(diff))}`}
          </p>
          <p className="mt-2 text-sm font-bold text-ink-soft"><MathText text={item.hint} /></p>
          <button type="button" onClick={next} className="btn-primary mt-3 w-full max-w-xs" autoFocus>
            {round + 1 >= ROUNDS ? 'Bitir' : 'Sonraki sayı'}<ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
