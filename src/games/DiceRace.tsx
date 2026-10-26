import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Dices, FastForward, FlaskConical, Grid3x3, Scale } from 'lucide-react'
import type { Grade } from '../data/types'
import { randInt, shuffle } from '../lib/random'
import { fmt } from '../lib/format'
import { ek } from '../lib/generators'
import { sfx } from '../lib/feedback'
import { MathText } from '../components/MathText'
import { DiceSvg } from '../components/Visual'
import { Plane, usePlane } from '../interactive/Plane'
import { ZoomBox } from '../interactive/ZoomBox'
import { useTracker } from '../lib/trackerContext'
import { starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, useAge, useSolutions } from './kit2'

/**
 * Zar Yarışı → Olasılık araştırması (Van de Walle: önce tahmin, deney, model, açıklama)
 *  1. Tahmin: hangi at kazanır, neden?
 *  2. Bir yarış: zarları at, atlar ilerlesin.
 *  3. Simülasyon: onlarca/yüzlerce yarış; kazanma sayıları grafiği (yakınlaştırılabilir).
 *  4. Model: 6 × 6 toplam tablosunda 7 eden tüm ikilileri bul (birden çok çözüm) → neden 7?
 *  5. Açıkla: sınıfa göre (imkânsız/olabilir/kesin; daha olası; deneysel; teorik; deneysel ↔ teorik grafik).
 *  6. Adillik: yarışı adil yapmanın yolları (birden çok doğru fikir).
 */

const COLORS = ['#64748b', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#be123c']
const ways = (s: number) => (s >= 2 && s <= 12 ? 6 - Math.abs(s - 7) : 0)
const pairs = (s: number) => {
  const out: string[] = []
  for (let a = 1; a <= 6; a++) if (s - a >= 1 && s - a <= 6) out.push(`${a}+${s - a}`)
  return out.join(', ')
}

type Phase = 'predict' | 'race' | 'sim' | 'table' | 'explain' | 'fair'
const PHASES: Phase[] = ['predict', 'race', 'sim', 'table', 'explain', 'fair']
const BELIEFS = ['Şanslı sayım o', 'Ortadaki toplamlar daha sık gelir', 'Hepsinin şansı eşit', 'Büyük sayı daha güçlü']

interface Q { text: string; opts: { t: string; ok: boolean; nudge?: string; mis?: string }[]; explain: string }

function simRace(goal: number, sums: number[]): number {
  const pos = Array<number>(13).fill(0)
  for (;;) {
    const s = randInt(1, 6) + randInt(1, 6)
    sums[s]++
    if (++pos[s] >= goal) return s
  }
}

function makeQuestions(grade: Grade, sums: number[]): Q[] {
  const R = sums.reduce((a, b) => a + b, 0)
  const t7 = sums[7]
  if (grade === 4)
    return [
      { text: '“1 numaralı at kazanır.” Bu olay nasıl bir olay?', opts: [{ t: 'İmkânsız', ok: true }, { t: 'Olabilir', ok: false, nudge: 'İki zarın toplamı en az kaç olabilir? 1 + 1 = ?', mis: 'İmkânsız olayı “olabilir” sandı.' }, { t: 'Kesin', ok: false, nudge: 'Tablodaki hangi kutuda toplam 1 yazıyor?' }], explain: 'En küçük toplam 1 + 1 = 2. Toplam hiç 1 olamaz: 1 numaralı at hiç ilerleyemez. Bu olay imkânsız.' },
      { text: '“Bir atışta iki zarın toplamı 13’ten küçük olur.” Bu olay nasıl bir olay?', opts: [{ t: 'Kesin', ok: true }, { t: 'Olabilir', ok: false, nudge: 'En büyük toplam kaç? 6 + 6 = ? Bu 13’ten küçük mü?', mis: 'Kesin olayı “olabilir” sandı.' }, { t: 'İmkânsız', ok: false, nudge: 'Tablodaki toplamlardan hangileri 13’ten küçük?' }], explain: 'En büyük toplam 6 + 6 = 12. Her atışta toplam 13’ten küçük olur: bu olay kesin.' },
      { text: '“7 numaralı at kazanır.” Bu olay nasıl bir olay?', opts: [{ t: 'Olabilir', ok: true }, { t: 'Kesin', ok: false, nudge: 'Simülasyonda 7 her yarışı kazandı mı?', mis: 'En olası sonucu kesin sandı.' }, { t: 'İmkânsız', ok: false, nudge: 'Simülasyonda 7 hiç kazandı mı?' }], explain: '7 en sık kazanan at ama her zaman kazanmıyor. Bu olay olabilir.' },
    ]
  if (grade === 5)
    return [
      { text: 'Hangisinin kazanma olasılığı daha yüksek: 7 numaralı at mı, 2 numaralı at mı?', opts: [{ t: '7 numaralı at', ok: true }, { t: '2 numaralı at', ok: false, nudge: 'Tabloda kaç kutu 2 ediyor, kaç kutu 7?' }, { t: 'İkisi eşit olası', ok: false, nudge: 'Tabloda 2 eden ve 7 eden kutuları say. Sayılar eşit mi?', mis: 'Her toplamı eşit olası sandı.' }], explain: `7 toplamı ${ways(7)} farklı yolla gelir (${pairs(7)}). 2 ise yalnızca 1 yolla (1+1).` },
      { text: '6 ve 8 numaralı atları karşılaştır. Hangisi doğru?', opts: [{ t: 'İkisi eşit olası', ok: true }, { t: '8 daha olası, çünkü sayı daha büyük', ok: false, nudge: '8 eden kutuları ve 6 eden kutuları say. Hangisi daha çok?', mis: 'Büyük toplamın daha olası olduğunu düşündü.' }, { t: '6 daha olası', ok: false, nudge: 'Tabloda 6 eden ve 8 eden kutuları say.' }], explain: `6: ${pairs(6)}. 8: ${pairs(8)}. İkisi de 5 yolla gelir: eşit olası.` },
    ]
  if (grade === 6)
    return [
      { text: `Simülasyonda zarlar ${R} kez atıldı, ${t7} kez toplam 7 geldi. 7 gelmesinin deneysel olasılığı nedir?`, opts: shuffle([{ t: `[[${t7}/${R}]]`, ok: true }, { t: `[[${t7}/${R - t7}]]`, ok: false, nudge: 'Deneysel olasılıkta payda: 7 gelmeyen atışlar mı, tüm atışlar mı?', mis: 'Deneysel olasılıkta paydayı tüm deneme sayısı yerine olmayan durumlar aldı.' }, { t: '[[1/11]]', ok: false, nudge: 'Bu sayı deneyden mi geldi? 11 toplam eşit sıklıkta mı geldi?', mis: '11 toplamı eşit olası sandı.' }]), explain: `Deneysel olasılık = 7 gelme sayısı ÷ toplam atış = [[${t7}/${R}]] ≈ ${fmt(t7 / R, 2)}.` },
      { text: 'Aynı deneyi yarın tekrar yapsan 7’nin deneysel olasılığı ne olur?', opts: shuffle([{ t: 'Yakın bir değer çıkar ama tam aynı olmayabilir', ok: true }, { t: 'Tam olarak aynı çıkar', ok: false, nudge: 'İki kez 10 yarış yaptığında grafikler tıpatıp aynı mıydı?', mis: 'Deneysel sonucun her seferinde aynı çıkacağını düşündü.' }, { t: 'Tamamen farklı, tahmin edilemez', ok: false, nudge: 'Çok yarışta 7 hep ön sıralarda değil miydi? Bir düzen var mı?' }]), explain: 'Deney her seferinde biraz farklı sonuç verir; ama çok sayıda denemede sonuçlar benzer bir değere yaklaşır.' },
    ]
  if (grade === 7)
    return [
      { text: 'İki zar atıldığında toplamın 7 olma olasılığı nedir?', opts: shuffle([{ t: '[[6/36]]', ok: true }, { t: '[[1/11]]', ok: false, nudge: '11 farklı toplam var ama hepsi eş olası mı? Tablodaki 36 kutuya bak.', mis: '11 toplamı eş olası sandı.' }, { t: '[[7/36]]', ok: false, nudge: 'Tabloda kaç kutu 7 ediyor? Saydığın kutular kaç tane?' }]), explain: `36 eş olası sonucun ${ways(7)} tanesinde toplam 7: [[6/36]] = [[1/6]].` },
      { text: 'Hangi iki toplamın gelme olasılığı eşittir?', opts: shuffle([{ t: '4 ve 10', ok: true }, { t: '4 ve 8', ok: false, nudge: 'Tabloda 4 eden ve 8 eden kutuları say.' }, { t: '2 ve 7', ok: false, nudge: '2 kaç yolla, 7 kaç yolla gelir?' }]), explain: `4: ${pairs(4)}; 10: ${pairs(10)}. İkisi de [[3/36]]: eş olası olaylar. Tablo 7’ye göre simetrik.` },
    ]
  return [
    { text: `Deneyde ${R} atışta ${t7} kez 7 geldi (≈ ${fmt(t7 / R, 3)}). Teorik olasılık [[6/36]] ≈ ${fmt(6 / 36, 3)}. Atış sayısı çok artarsa ne olur?`, opts: shuffle([{ t: 'Deneysel olasılık teorik olasılığa yaklaşır', ok: true }, { t: 'Deneysel olasılık tam [[6/36]] olur', ok: false, nudge: 'Grafikte çok atışta bile çubuklar noktalara tam oturuyor mu?', mis: 'Çok denemede deneysel olasılığın teorik olasılığa tam eşit olacağını düşündü.' }, { t: 'Fark giderek büyür', ok: false, nudge: '“1000 atış daha” düğmesine bas: çubuklar noktalardan uzaklaşıyor mu, yaklaşıyor mu?', mis: 'Büyük sayılar yasasını ters yorumladı.' }]), explain: 'Deneme sayısı arttıkça deneysel olasılık teorik olasılığa yaklaşır; yine de şans yüzünden tam eşit olmak zorunda değildir.' },
    { text: 'Bir arkadaşın 12 atışta hiç 7 gelmeyince “Bu zarlar hileli!” diyor. Ne dersin?', opts: shuffle([{ t: 'Az atışta böyle olabilir; karar için çok atış gerekir', ok: true }, { t: 'Haklı, 7 en olası toplam olduğu için mutlaka gelmeliydi', ok: false, nudge: '“En olası” ile “kesin” aynı şey mi? Simülasyonda 7 her zaman kazandı mı?', mis: 'En olası sonucu kesin sonuç sandı.' }, { t: 'Haklı, deneysel ve teorik olasılık hep eşit olmalı', ok: false, nudge: 'Kısa deneylerde grafik teorik noktalara ne kadar yakındı?' }]), explain: 'Az denemede sonuçlar teoriden çok sapabilir. Hileli mi diye karar vermek için çok sayıda atışa bakmak gerekir.' },
  ]
}

const FAIR = (grade: Grade) => [
  { t: grade <= 5 ? 'Az gelen toplamların pisti daha kısa olsun (7’nin pisti en uzun)' : 'Her atın pisti, toplamın gelme yolu sayısıyla orantılı olsun (2: 1 adım, 7: 6 adım)', ok: true },
  { t: 'Tek zar atalım, 1’den 6’ya altı at yarışsın', ok: true },
  { t: 'Her atı, gelme yolları eşit olan bir eşiyle takım yapalım (2 ile 12, 3 ile 11…)', ok: false, nudge: 'Takımlar eşleşti ama 2–12 takımının yolu (1 + 1 = 2) 7’nin yoluna (6) eşit mi?' },
  { t: 'Daha çok yarış yapalım, böylece her at bir gün kazanır', ok: false, nudge: 'Daha çok yarış, 7’nin bir yarışı kazanma şansını değiştirir mi?', mis: 'Adilliği deneme sayısıyla karıştırdı.' },
  { t: 'Zarları daha hızlı atalım', ok: false, nudge: 'Zarın atılma hızı, toplamın 2 ya da 7 olma şansını değiştirir mi?' },
]

/** Kazanma sayıları (sütun grafik) */
function WinsChart({ wins, horses, bet }: { wins: number[]; horses: number[]; bet: number }) {
  const max = Math.max(1, ...horses.map((h) => wins[h]))
  const W = 360, H = 190, top = 22, bottom = 26
  const bw = (W - 8) / horses.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Kazanma sayıları: ${horses.map((h) => `${h}: ${wins[h]}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={4} x2={W - 4} y1={H - bottom - (H - top - bottom) * f} y2={H - bottom - (H - top - bottom) * f} stroke="#eef0f6" />)}
      <line x1={4} x2={W - 4} y1={H - bottom} y2={H - bottom} stroke="#1f2340" strokeWidth={1.5} />
      {horses.map((h, i) => {
        const bh = ((H - top - bottom) * wins[h]) / max
        const x = 4 + i * bw
        return (
          <g key={h}>
            <rect x={x + bw * 0.14} y={H - bottom - bh} width={bw * 0.72} height={bh} rx={3} fill={COLORS[h]} style={{ transition: 'all 300ms ease-out' }} />
            <text x={x + bw / 2} y={H - bottom - bh - 5} textAnchor="middle" fontSize={11} fontWeight={800} fill="#5b6080">{wins[h]}</text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={13} fontWeight={900} fill="#1f2340">{h}</text>
            {h === bet && <text x={x + bw / 2} y={12} textAnchor="middle" fontSize={12}>⭐</text>}
          </g>
        )
      })}
    </svg>
  )
}

/** 36 atışa ölçeklenmiş deneysel çubuklar + teorik noktalar (Plane, yakınlaştırılabilir) */
function SumBars({ sums, theory }: { sums: number[]; theory: boolean }) {
  const P = usePlane()
  const R = Math.max(1, sums.reduce((a, b) => a + b, 0))
  const w = 0.62
  const pts = Array.from({ length: 11 }, (_, i) => i + 2)
  return (
    <g>
      {pts.map((s) => {
        const v = (sums[s] / R) * 36
        return (
          <g key={s}>
            <rect x={P.sx(s - w / 2)} y={P.sy(v)} width={w * P.unitPx} height={Math.max(0, P.sy(0) - P.sy(v))} rx={3} fill={COLORS[s]} opacity={0.85} style={{ transition: 'all 300ms ease-out' }} />
            {P.unitPx > 26 && <text x={P.sx(s)} y={Math.min(P.sy(v), theory ? P.sy(ways(s)) - 6 : Infinity) - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill="#334155">{fmt(v, 1)}</text>}
          </g>
        )
      })}
      {theory && (
        <g>
          <polyline points={pts.map((s) => `${P.sx(s)},${P.sy(ways(s))}`).join(' ')} fill="none" stroke="#1f2340" strokeWidth={2} strokeDasharray="5 4" />
          {pts.map((s) => <circle key={s} cx={P.sx(s)} cy={P.sy(ways(s))} r={5} fill="#fff" stroke="#1f2340" strokeWidth={2.5} />)}
        </g>
      )}
    </g>
  )
}

export default function DiceRace({ grade, onFinish }: GameProps) {
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const sevens = useSolutions()
  const fairs = useSolutions()
  const goal = grade <= 5 ? 6 : 8
  const horses = Array.from({ length: grade === 4 ? 12 : 11 }, (_, i) => i + (grade === 4 ? 1 : 2))
  const [phase, setPhase] = useState<Phase>('predict')
  const [bet, setBet] = useState(0)
  const [belief, setBelief] = useState<string | null>(null)
  const [pos, setPos] = useState<number[]>(() => Array(13).fill(0))
  const [dice, setDice] = useState<[number, number]>([3, 4])
  const [last, setLast] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [auto, setAuto] = useState(false)
  const [winner, setWinner] = useState(0)
  const [wins, setWins] = useState<number[]>(() => Array(13).fill(0))
  const [sums, setSums] = useState<number[]>(() => Array(13).fill(0))
  const [races, setRaces] = useState(0)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [fullTable, setFullTable] = useState(false)
  const [qs, setQs] = useState<Q[]>([])
  const [qi, setQi] = useState(0)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [fairWrong, setFairWrong] = useState<number[]>([])
  const fairOpts = useRef(shuffle(FAIR(grade))).current
  const stats = useRef({ qFirst: 0, qTotal: 0, tableMiss: 0, over: false })
  const posRef = useRef(pos)
  posRef.current = pos

  const roll = () => {
    const a = randInt(1, 6), b = randInt(1, 6), s = a + b
    setDice([a, b])
    setLast(s)
    setSums((c) => c.map((v, i) => (i === s ? v + 1 : v)))
    const np = posRef.current.map((v, i) => (i === s ? v + 1 : v))
    posRef.current = np
    setPos(np)
    if (np[s] >= goal) {
      setWinner(s)
      setAuto(false)
      setWins((c) => c.map((v, i) => (i === s ? v + 1 : v)))
      setRaces((r) => r + 1)
      if (s === bet) sfx.ok()
    }
  }

  // Elle atış: zarlar kısa süre döner
  useEffect(() => {
    if (!rolling) return
    const spin = setInterval(() => setDice([randInt(1, 6), randInt(1, 6)]), 70)
    const done = setTimeout(() => {
      clearInterval(spin)
      setRolling(false)
      roll()
    }, 420)
    return () => {
      clearInterval(spin)
      clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  useEffect(() => {
    if (!auto || winner) return
    const t = setInterval(() => {
      if (!winner) roll()
    }, 160)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, winner])

  const simulate = (n: number) => {
    const w = [...wins], s = [...sums]
    for (let i = 0; i < n; i++) w[simRace(goal, s)]++
    setWins(w)
    setSums(s)
    setRaces((r) => r + n)
  }
  const throwMany = (n: number) => {
    const s = [...sums]
    for (let i = 0; i < n; i++) s[randInt(1, 6) + randInt(1, 6)]++
    setSums(s)
  }

  const go = (p: Phase) => {
    setNudge(null)
    setInfo(null)
    if (p === 'explain') {
      setQs(makeQuestions(grade, sums))
      setQi(0)
      setWrong([])
      setSolved(false)
    }
    setPhase(p)
  }

  const tapCell = (a: number, b: number) => {
    const k = `${a}+${b}`
    if (revealed.has(k)) return
    setRevealed(new Set(revealed).add(k))
    if (a + b === 7) {
      sevens.add(k, `${a} + ${b}`)
      setInfo(null)
    } else {
      stats.current.tableMiss++
      setInfo(`${a} + ${b} = ${a + b}. 7 etmesi için ${ek(a, 'gen')} yanına kaç gelmeli?`)
    }
  }

  const answer = (i: number) => {
    const q = qs[qi]
    if (solved || wrong.includes(i)) return
    const o = q.opts[i]
    track.attempt(o.ok)
    if (o.ok) {
      stats.current.qTotal++
      if (wrong.length === 0) stats.current.qFirst++
      track.item(wrong.length === 0)
      sfx.ok()
      setSolved(true)
      setNudge(null)
      return
    }
    setWrong([...wrong, i])
    setNudge({ q: o.nudge ?? 'Tabloya ve grafiğe tekrar bak.', mis: o.mis, k: Date.now() })
  }
  const nextQ = () => {
    if (qi + 1 < qs.length) {
      setQi(qi + 1)
      setWrong([])
      setSolved(false)
      setNudge(null)
      return
    }
    go('fair')
  }

  const pickFair = (i: number) => {
    const o = fairOpts[i]
    if (fairWrong.includes(i) || fairs.list.some((f) => f.key === String(i))) return
    if (o.ok) {
      fairs.add(String(i), o.t)
      setNudge(null)
      return
    }
    setFairWrong([...fairWrong, i])
    setNudge({ q: o.nudge ?? 'Bu değişiklik atların şansını eşitler mi?', mis: o.mis, k: Date.now() })
  }

  const finish = () => {
    const s = stats.current
    if (s.over) return
    s.over = true
    const q = s.qFirst / Math.max(1, qs.length)
    onFinish({
      stars: starsFor(q * 0.5 + (sevens.list.length / 6) * 0.25 + (fairs.list.length / 2) * 0.25),
      score: s.qFirst * 20 + sevens.list.length * 5 + fairs.list.length * 15 + (winner === bet ? 10 : 0),
      summary: `${races} yarış ve ${sums.reduce((a, b) => a + b, 0)} zar atışı inceledin; 7 eden ${sevens.list.length} ikiliyi buldun, ${fairs.list.length} adil yarış fikri ürettin.`,
      insight:
        grade === 4
          ? 'Toplamın 1 olması imkânsız, 13’ten küçük olması kesin, 7 olması ise olabilir. Günlük hayatta kesin, olabilir ve imkânsız olaylara örnek bulabilir misin?'
          : grade === 5
            ? '7 toplamı 6 farklı yolla gelir, 2 ise yalnızca 1 yolla. Bu yüzden ortadaki atlar daha sık kazanır.'
            : grade === 6
              ? 'Deneysel olasılık, bir olayın kaç kez olduğunun toplam deneme sayısına oranıdır. Deneme sayısı arttıkça sonuçlar daha kararlı hâle gelir.'
              : grade === 7
                ? '36 eş olası sonucun 6’sında toplam 7 olur: olasılık 6/36. 4 ile 10 gibi 7’ye eşit uzaklıktaki toplamlar eş olasıdır.'
                : 'Deneysel olasılık her zaman teorik olasılığa eşit çıkmaz ama deneme sayısı arttıkça ona yaklaşır. Az atışla karar vermek yanıltıcı olabilir.',
    })
  }

  const panel = dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'
  const totalRolls = sums.reduce((a, b) => a + b, 0)
  const showSumPlane = grade >= 6
  const theory = grade >= 7

  const track_ = (
    <div className="space-y-1">
      {horses.map((h) => {
        const p = Math.min(goal, pos[h])
        const isBet = bet === h
        const won = winner === h && phase === 'race'
        const moved = phase === 'race' && last === h && !rolling
        return (
          <button
            key={h}
            type="button"
            onClick={() => phase === 'predict' && setBet(h)}
            disabled={phase !== 'predict'}
            aria-pressed={isBet}
            aria-label={`${h} numaralı at, ${p} adım`}
            className={`flex h-11 w-full items-center gap-2 rounded-xl px-1.5 text-ink ring-1 transition disabled:cursor-default ${won ? 'bg-yellow-100 ring-2 ring-yellow-400' : isBet ? 'bg-amber-50 ring-2 ring-amber-400' : moved ? 'bg-sky-50 ring-sky-200' : 'bg-white ring-line'}`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-black text-white" style={{ background: COLORS[h] }}>{h}</span>
            <span className="relative h-full flex-1">
              <span className="absolute inset-y-2 right-0 left-0 flex" aria-hidden>
                {Array.from({ length: goal }, (_, i) => <span key={i} className="flex-1 border-r border-dashed border-line last:border-r-2 last:border-r-ink/40" />)}
              </span>
              <span className="absolute top-1/2 text-2xl leading-none transition-[left] duration-200" style={{ left: `calc(${p / goal} * (100% - 1.75rem))`, transform: 'translateY(-50%) scaleX(-1)' }} aria-hidden>🏇</span>
            </span>
            <span className="w-6 shrink-0 text-center text-lg" aria-hidden>{won ? '🏆' : isBet ? '⭐' : ''}</span>
          </button>
        )
      })}
    </div>
  )

  const sumPlane = (
    <div>
      <Plane initial={{ xMin: 0.8, xMax: 13.2, yMin: -1.2, yMax: 8 }} fixedStep={1} minSpan={3} maxSpan={20} xLabel="Toplam" yLabel="36 atışta" label="Toplamların 36 atışa göre sıklığı">
        <SumBars sums={sums} theory={theory} />
      </Plane>
      <p className={`mt-1 text-center text-xs font-bold ${soft}`}>Çubuklar: deneyde her 36 atışta ortalama kaç kez geldi{theory ? ' · Noktalar: 36 sonuçtan kaçı o toplamı verir (teorik)' : ''}. {totalRolls} atış.</p>
    </div>
  )

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={PHASES.indexOf(phase)} total={PHASES.length} />
        <span className={`chip px-3 py-1 text-sm ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}>
          {phase === 'predict' ? '1. Tahmin' : phase === 'race' ? '2. Bir yarış' : phase === 'sim' ? '3. Çok yarış' : phase === 'table' ? '4. Neden?' : phase === 'explain' ? '5. Açıkla' : '6. Adil mi?'}
        </span>
      </div>

      {(phase === 'predict' || phase === 'race') && (
        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <div>{track_}</div>
          <div className="space-y-3">
            {phase === 'predict' ? (
              <div className={`rounded-2xl p-3 ${panel}`}>
                <p className="font-black">İki zar atılır; toplam hangi atınsa o bir adım ilerler. İlk {goal} adımı atan kazanır.</p>
                <p className={`mt-1 text-sm font-bold ${soft}`}>Sence hangi at kazanır? Ata dokun.</p>
                {bet > 0 && !belief && <StrategyPicker question={`Neden ${bet} numaralı at?`} options={BELIEFS} onPick={setBelief} />}
                <button type="button" onClick={() => go('race')} disabled={!bet || !belief} className="btn-primary mt-3 w-full">{!bet ? 'Önce bir at seç' : !belief ? 'Nedenini seç' : 'Yarışı başlat'}</button>
              </div>
            ) : (
              <div className={`sticky top-16 rounded-2xl p-3 ${panel}`}>
                <div className="flex items-center justify-center gap-2">
                  <span className={rolling ? 'animate-shake' : ''}><DiceSvg value={dice[0]} size={56} /></span>
                  <span className={rolling ? 'animate-shake' : ''}><DiceSvg value={dice[1]} size={56} /></span>
                  <span className="min-w-16 text-center text-3xl font-black tabular-nums" aria-live="polite">{last && !rolling ? `= ${last}` : ''}</span>
                </div>
                {!winner ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => !rolling && !auto && setRolling(true)} disabled={rolling || auto} className="btn-primary flex-1"><Dices size={20} />Zar at</button>
                    <button type="button" onClick={() => setAuto(!auto)} className="btn-ghost flex-1"><FastForward size={18} />{auto ? 'Durdur' : 'Hızlı'}</button>
                  </div>
                ) : (
                  <div className="mt-3 text-center animate-pop">
                    <p className="text-xl font-black">{winner} numaralı at kazandı! {winner === bet ? '🏆' : '🏁'}</p>
                    <p className={`text-sm font-bold ${soft}`}>{winner === bet ? 'Tahminin tuttu! Ama bu şans mı, yoksa bir nedeni var mı?' : `Senin tahminin ${bet} idi. Tek bir yarış karar vermek için yeterli mi?`}</p>
                    <button type="button" onClick={() => go('sim')} className="btn-primary mt-3 w-full"><FlaskConical size={18} />Çok sayıda yarış yap</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'sim' && (
        <div className="space-y-3">
          <div className={`rounded-2xl p-3 ${panel}`}>
            <p className="font-black">Bilgisayar yarışları senin yerine koşturuyor. Hangi atlar daha sık kazanıyor?</p>
            <p className={`text-sm font-bold ${soft}`}>{races} yarış yapıldı. ⭐ senin tahminin.</p>
            <div className="mt-2 rounded-2xl bg-white p-2 ring-1 ring-line">
              <ZoomBox><WinsChart wins={wins} horses={horses} bet={bet} /></ZoomBox>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => simulate(10)} className="btn-ghost flex-1">+10 yarış</button>
              <button type="button" onClick={() => simulate(100)} className="btn-ghost flex-1">+100 yarış</button>
            </div>
            {races < 30 ? (
              <p className={`mt-2 text-center text-sm font-bold ${soft}`}>Karar vermeden önce en az 30 yarışa bak ({races}/30).</p>
            ) : (
              <button type="button" onClick={() => go('table')} className="btn-primary mt-3 w-full"><Grid3x3 size={18} />Neden böyle? Zar tablosunu incele</button>
            )}
          </div>
        </div>
      )}

      {phase === 'table' && (
        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <div className={`rounded-2xl p-3 ${panel}`}>
            <p className="font-black">İki zarın 36 sonucu. {fullTable ? 'Her toplam kaç kutuda var?' : '7 eden bütün ikilileri bul: kutulara dokun.'}</p>
            <div className="mt-2 overflow-x-auto">
              <table className="mx-auto border-separate border-spacing-1 text-center font-black tabular-nums">
                <thead>
                  <tr>
                    <th className={`text-xs ${soft}`}>+</th>
                    {[1, 2, 3, 4, 5, 6].map((b) => <th key={b} className="size-11 rounded-lg bg-sky-100 p-0 text-sky-900"><span className="sr-only">ikinci zar </span>{b}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((a) => (
                    <tr key={a}>
                      <th className="size-11 rounded-lg bg-rose-100 p-0 text-rose-900">{a}</th>
                      {[1, 2, 3, 4, 5, 6].map((b) => {
                        const k = `${a}+${b}`
                        const open = fullTable || revealed.has(k)
                        const is7 = a + b === 7
                        const hot = open && is7 && revealed.has(k)
                        return (
                          <td key={b} className="p-0">
                            <button type="button" onClick={() => tapCell(a, b)} disabled={fullTable} aria-label={`${a} ve ${b}${open ? `, toplam ${a + b}` : ''}`} className={`grid size-11 place-items-center rounded-lg text-base ring-1 transition active:scale-95 sm:size-12 ${hot ? 'bg-amber-400 text-white ring-amber-500 animate-pop' : fullTable ? 'text-white ring-transparent' : open ? 'bg-slate-200 text-slate-600 ring-slate-300' : 'bg-white text-slate-300 ring-line hover:bg-slate-50'}`} style={fullTable && !hot ? { background: COLORS[a + b] } : undefined}>
                              {open ? a + b : '?'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-ink"><SolutionList list={sevens.list} goal={6} /></div>
            {sevens.list.length >= 6 && !fullTable && (
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900 ring-1 ring-emerald-200 animate-pop">
                <p className="font-black">7’yi veren 6 farklı ikili var! 2’yi veren kaç tane var sence?</p>
                <button type="button" onClick={() => setFullTable(true)} className="btn-primary mt-2 w-full">Tüm tabloyu doldur</button>
              </div>
            )}
            {fullTable && (
              <div className={`rounded-2xl p-3 ${panel}`}>
                <p className="text-sm font-black">Aynı renkler çapraz çizgiler oluşturuyor. En uzun çapraz hangi toplamın?</p>
                <div className="mt-2 grid grid-cols-6 gap-1 text-center text-xs font-black">
                  {Array.from({ length: 11 }, (_, i) => i + 2).map((s) => (
                    <span key={s} className="rounded-md px-1 py-1 text-white" style={{ background: COLORS[s] }}>{s}: {ways(s)}</span>
                  ))}
                </div>
                <button type="button" onClick={() => go('explain')} className="btn-primary mt-3 w-full">Devam<ArrowRight size={18} /></button>
              </div>
            )}
            {info && !fullTable && <p className={`rounded-2xl px-3 py-2 text-sm font-extrabold ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}>{info}</p>}
          </div>
        </div>
      )}

      {phase === 'explain' && qs[qi] && (
        <div className={`grid gap-3 ${showSumPlane ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
          {showSumPlane && (
            <div className={`rounded-2xl p-3 ${panel}`}>
              {sumPlane}
              {grade >= 6 && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => throwMany(100)} className="btn-ghost flex-1">100 atış daha</button>
                  <button type="button" onClick={() => throwMany(1000)} className="btn-ghost flex-1">1000 atış daha</button>
                </div>
              )}
            </div>
          )}
          <div key={qi} className={`rounded-2xl p-4 animate-fade-up ${panel}`}>
            <p className={`text-xs font-extrabold tracking-wide uppercase ${soft}`}>Soru {qi + 1}/{qs.length}</p>
            <p className="mt-1 text-lg leading-snug font-black"><MathText text={qs[qi].text} /></p>
            <div className="mt-3 grid gap-2">
              {qs[qi].opts.map((o, i) => (
                <button key={i} type="button" onClick={() => answer(i)} disabled={solved || wrong.includes(i)} className={`min-h-12 rounded-2xl px-4 py-2 text-left text-base font-extrabold ring-2 transition active:scale-[0.98] ${solved && o.ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-400' : wrong.includes(i) ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-ink ring-line'}`}>
                  <MathText text={o.t} />
                </button>
              ))}
            </div>
            {solved && (
              <div className="mt-3 animate-fade-up">
                <p className="font-bold"><MathText text={qs[qi].explain} /></p>
                <button type="button" onClick={nextQ} className="btn-primary mt-3 w-full">{qi + 1 < qs.length ? 'Sonraki soru' : 'Yarış adil mi?'}<ArrowRight size={18} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'fair' && (
        <div className={`rounded-2xl p-4 ${panel}`}>
          <p className="flex items-center gap-2 text-lg font-black"><Scale size={20} className="text-rose-500" />Bu yarış adil mi? Her atın kazanma şansı eşit olsun diye ne değiştirebiliriz?</p>
          <p className={`text-sm font-bold ${soft}`}>İşe yarayan fikirlerin hepsini bul. Birden çok doğru fikir var!</p>
          <div className="mt-3 grid gap-2">
            {fairOpts.map((o, i) => {
              const ok = fairs.list.some((f) => f.key === String(i))
              return (
                <button key={i} type="button" onClick={() => pickFair(i)} disabled={ok || fairWrong.includes(i)} className={`min-h-12 rounded-2xl px-4 py-2 text-left text-base font-extrabold ring-2 transition active:scale-[0.98] ${ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-400' : fairWrong.includes(i) ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-ink ring-line'}`}>
                  {ok ? '✔ ' : ''}{o.t}
                </button>
              )
            })}
          </div>
          <div className="text-ink"><SolutionList list={fairs.list} goal={2} /></div>
          <button type="button" onClick={finish} disabled={fairs.list.length === 0} className="btn-primary mt-3 w-full">{fairs.list.length === 0 ? 'En az bir fikir bul' : 'Araştırmayı bitir'}</button>
        </div>
      )}

      {nudge && <Nudge key={nudge.k} question={nudge.q} misconception={nudge.mis} tool={grade >= 6 ? 'rastgeledeney' : 'probability'} toolConfig={grade >= 6 ? undefined : { mode: 'dice' }} toolTitle="Zar deneyi" onClose={() => setNudge(null)} />}
    </Scene>
  )
}
