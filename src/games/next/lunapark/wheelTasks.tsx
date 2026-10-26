import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { BigButton } from '../../kit2'
import { ek } from '../../../lib/generators'
import { FerrisWheel, ParkSvg, Queue, useWheelAngle } from './art'
import { num, tl, type LoadLevel, type WheelLevel } from './levels'
import { Shell, useApi } from './shell'
import { Chips, NumPad, Sign, Stat, Stepper } from './ui'

/** board kişiyi c kabine (s koltuk) sırayla dağıtır */
const distribute = (board: number, c: number, s: number) => Array.from({ length: c }, (_, i) => Math.max(0, Math.min(s, board - i * s)))

/* ───────────── Dolap tasarımı ───────────── */

export function WheelTask({ level }: { level: WheelLevel }) {
  const api = useApi()
  const [c, setC] = useState(level.start[0])
  const [s, setS] = useState(level.start[1])
  const [running, setRunning] = useState(false)
  const [queue, setQueue] = useState(level.need)
  const [filled, setFilled] = useState<number[]>([])
  const [turn, setTurn] = useState(0)
  const [served, setServed] = useState(0)
  const [designs, setDesigns] = useState<{ c: number; s: number }[]>([])
  const [phase, setPhase] = useState<'design' | 'pick'>('design')
  const [picked, setPicked] = useState<string | null>(null)
  const wheel = useWheelAngle(running ? 0 : 7, 300)
  const per = c * s
  const perFig = level.need > 84 ? 10 : 1
  const multiTurn = level.turns > 1

  const reset = () => {
    setQueue(level.need)
    setFilled([])
    setTurn(0)
    setServed(0)
  }
  const change = (nc: number, ns: number) => {
    if (running) return
    setC(nc)
    setS(ns)
    reset()
  }

  const finish = (left: number, cc: number, ss: number) => {
    setRunning(false)
    const p = cc * ss
    const total = p * level.turns
    if (total === level.need) {
      const key = `${cc}x${ss}`
      if (api.has(key)) {
        api.nudge(`Bu dolabı (${cc} kabin × ${ss} koltuk) zaten buldun! Koltuk sayısını değiştirip kabin sayısını yeniden ayarla.`)
        return
      }
      api.report(true)
      api.add(key, `${cc} × ${ss}`)
      const list = [...designs, { c: cc, s: ss }]
      setDesigns(list)
      if (designs.some((d) => (d.s === ss * 2 && d.c * 2 === cc) || (d.s * 2 === ss && d.c === cc * 2))) api.strategy('Koltuk sayısını ikiye katlayıp kabini yarıladım')
      const msg = multiTurn
        ? `Harika! Her turda ${cc} × ${ss} = ${p} kişi. ${level.turns} turda ${level.turns} × ${p} = ${num(total)} kişi: herkes bindi, hiç koltuk boş kalmadı.`
        : `Harika! ${cc} kabin × ${ss} koltuk = ${p} kişi. Dolap tam doldu!`
      if (list.length >= level.goal) {
        if (level.cost) {
          setPhase('pick')
          api.nudge(`${msg} Şimdi maliyetleri düşün: kabin başı ${tl(level.cost.cabin)}, koltuk başı ${tl(level.cost.seat)}. Bulduğun tasarımlardan hangisi en ucuz? Aşağıdan seç.`, { tone: 'ok' })
        } else api.complete(msg)
      } else api.nudge(`${msg} Şimdi kabin ya da koltuk sayısını değiştirerek başka bir dolap bul!`, { tone: 'ok' })
      return
    }
    api.report(false)
    if (multiTurn && p === level.need) {
      api.nudge(`İlk turda ${num(p)} kişinin hepsi bindi, sonraki ${level.turns - 1} turda kabinler boş döndü! Dolap ${level.turns} tur dönüyor: ${num(level.need)} kişiyi ${level.turns} tura eşit paylaştırırsan bir turda kaç kişi biner?`, { mis: 'Tur sayısını hesaba katmadı (toplamı bir tura sığdırdı)', tool: true })
    } else if (left > 0) {
      api.nudge(`${multiTurn ? `${level.turns} tur bitti ama` : 'Tur bitti ama'} sırada ${num(left)} kişi kaldı. Her turda daha çok kişi binmeli. ${multiTurn ? 'Bir turda kaç kişi binmeli?' : `Toplam ${num(level.need)} kişi için kaç kabin?`}`, { tool: true })
    } else {
      api.nudge(`Herkes bindi ama ${multiTurn ? 'son turlarda' : 'dolapta'} ${num(total - level.need)} koltuk boş döndü. Boş koltuk kalmamalı: kabin ya da koltuk sayısını azalt.`, { tool: true })
    }
  }

  const run = () => {
    if (running || phase !== 'design') return
    api.nudge(null)
    setRunning(true)
    let q = level.need
    let t = 0
    let sv = 0
    const cc = c, ss = s, p = cc * ss
    const doTurn = () => {
      t++
      const board = Math.min(q, p)
      q -= board
      sv += board
      setTurn(t)
      setFilled(distribute(board, cc, ss))
      setQueue(q)
      setServed(sv)
      wheel.spin(360, { speed: level.turns > 4 ? 620 : 380, done: () => (t < level.turns ? doTurn() : finish(q, cc, ss)) })
    }
    doTurn()
  }

  const pick = (d: { c: number; s: number }) => {
    if (!level.cost || api.done) return
    const cost = (x: { c: number; s: number }) => x.c * level.cost!.cabin + x.c * x.s * level.cost!.seat
    const min = Math.min(...designs.map(cost))
    setPicked(`${d.c}x${d.s}`)
    if (cost(d) === min) {
      api.report(true)
      api.complete(`${d.c} × ${tl(level.cost.cabin)} + ${d.c * d.s} × ${tl(level.cost.seat)} = ${tl(cost(d))}. En az kabin, en düşük maliyet!`)
    } else {
      api.report(false)
      api.nudge(`Bu tasarım: ${d.c} kabin × ${tl(level.cost.cabin)} = ${tl(d.c * level.cost.cabin)}, üstüne ${d.c * d.s} koltuk × ${tl(level.cost.seat)}. Diğer tasarımların maliyetini de hesapla. Koltuk sayıları aynıysa farkı ne yaratır?`, { mis: d.s < Math.max(...designs.map((x) => x.s)) ? 'Daha az koltuklu kabinin daha ucuz olacağını sandı' : undefined })
    }
  }

  const addition = c <= 8 ? `${Array.from({ length: c }, () => s).join(' + ')} = ${per}` : `${c} tane ${s} = ${per}`
  const overlay = (
    <div className="absolute top-[8%] right-[2%] flex max-w-[48%] flex-col items-end gap-1.5 text-[clamp(11px,2vw,17px)]">
      {!multiTurn ? (
        <>
          <Sign>{addition}</Sign>
          <Sign tone="dark">{c} kabin × {s} koltuk = {per} kişi</Sign>
        </>
      ) : (
        <>
          <Sign>Bir turda: {c} × {s} = {per} kişi</Sign>
          {turn > 0 && <Sign tone="dark">{level.turnWord === 'saat' ? `${turn}. tur (${turn * 10}. dakika)` : `${turn}. tur`} · Binen: {num(served)}</Sign>}
        </>
      )}
    </div>
  )

  const scene = (
    <ParkSvg label={`Dönme dolap: ${c} kabin, her kabinde ${s} koltuk`}>
      <FerrisWheel cabins={c} seats={s} rot={wheel.rot} filled={filled} />
      <Queue count={queue} perFig={perFig} />
    </ParkSvg>
  )

  const runLabel = multiTurn ? (level.turnWord === 'saat' ? '1 saati başlat' : 'Turları başlat') : 'Dolabı çalıştır'
  const controls = (
    <div className="flex flex-col gap-2">
      {phase === 'design' && (
        <>
          <Stepper label="Kabin sayısı" value={c} min={2} max={level.maxCabins} onChange={(v) => change(v, s)} big={api.big} />
          <Chips label="Bir kabindeki koltuk" options={level.seatOpts} value={s} onChange={(v) => change(c, v)} big={api.big} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Bir turda" value={`${per} kişi`} tone="pink" />
            <Stat label={multiTurn ? (level.turnWord === 'saat' ? 'Saatte tur' : 'Tur sayısı') : 'Sırada'} value={multiTurn ? `${level.turns} tur` : `${level.need} kişi`} tone="blue" />
          </div>
          <BigButton onClick={run} disabled={running} className="w-full"><Play size={20} />{running ? 'Dolap dönüyor…' : runLabel}</BigButton>
        </>
      )}
      {phase === 'pick' && level.cost && (
        <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
          <p className="mb-2 text-base font-black text-sky-950">Hangi tasarım en ucuz? (Kabin {tl(level.cost.cabin)}, koltuk {tl(level.cost.seat)})</p>
          <div className="grid grid-cols-2 gap-2">
            {designs.map((d) => {
              const k = `${d.c}x${d.s}`
              const on = picked === k
              return (
                <button key={k} type="button" onClick={() => pick(d)} className={`min-h-16 rounded-2xl p-2 text-left ring-1 transition active:scale-[0.97] ${on && api.done ? 'bg-emerald-50 ring-2 ring-emerald-500' : on ? 'bg-amber-50 ring-2 ring-amber-400' : 'bg-white ring-sky-200'}`}>
                  <span className="block text-lg font-black">🎡 {d.c} × {d.s}</span>
                  <span className="block text-xs font-bold text-ink-soft">{d.c} kabin, {d.c * d.s} koltuk</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
  return <Shell scene={scene} overlay={overlay} controls={controls} />
}

/* ───────────── Kabinlere bindirme (bölme) ───────────── */

export function LoadTask({ level }: { level: LoadLevel }) {
  const api = useApi()
  const N = level.seats <= 6 ? 12 : 10
  const step = 360 / N
  const wheel = useWheelAngle(0, 300)
  const [remaining, setRemaining] = useState(level.people)
  const [loaded, setLoaded] = useState(0)
  const [filled, setFilled] = useState<number[]>(() => Array(N).fill(0))
  const [ladder, setLadder] = useState<{ k: number; ppl: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [est, setEst] = useState<number | null>(level.estimate ? null : -1)
  const used = useRef(new Set<number>())
  const perFig = level.people > 84 ? 10 : 1
  const rem = level.people % level.seats
  const fullCab = Math.floor(level.people / level.seats)
  const needCab = Math.ceil(level.people / level.seats)
  const answer = level.ask === 'full' ? fullCab : level.costPer ? needCab * level.costPer : needCab

  useEffect(() => {
    wheel.set(90)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = (k: number) => {
    if (busy || api.done) return
    if (remaining === 0) return api.nudge('Sırada kimse kalmadı! Şimdi soruyu cevapla.')
    const left = Math.ceil(remaining / level.seats)
    if (k > left) return api.nudge(`Sırada ${num(remaining)} kişi var. ${k} kabin ${num(k * level.seats)} kişi taşır: o kadar kişi yok! Daha küçük bir grup seç.`)
    api.nudge(null)
    used.current.add(k)
    setBusy(true)
    let r = remaining
    let l = loaded
    let ppl = 0
    let i = 0
    const f = [...filled]
    const tick = () => {
      const p = Math.min(level.seats, r)
      r -= p
      ppl += p
      f[l % N] = p
      l++
      i++
      setFilled([...f])
      setRemaining(r)
      setLoaded(l)
      wheel.spin(step, { speed: k > 1 ? step / 0.13 : step / 0.35, done: () => {
        if (i < k) tick()
        else {
          setLadder((ld) => [...ld, { k, ppl }])
          setBusy(false)
        }
      } })
    }
    tick()
  }

  const restart = () => {
    if (busy) return
    setRemaining(level.people)
    setLoaded(0)
    setFilled(Array(N).fill(0))
    setLadder([])
    used.current = new Set()
  }

  const submit = (n: number) => {
    if (api.done) return
    if (n === answer) {
      api.report(true)
      api.strategy(ladder.length === 0 ? 'Zihinden bölme' : [...used.current].some((x) => x > 1) ? 'Gruplarla doldurma (10’ar, 5’er kabin)' : 'Tek tek kabin doldurma')
      const estTxt = level.estimate && est !== null && est >= 0 ? (est === level.estimate.correct ? ' Tahminin de çok iyiydi!' : ` Tahminin “${level.estimate.options[est]}” idi; şimdi bu büyüklüğü daha iyi kestirebilirsin.`) : ''
      const text = level.ask === 'full'
        ? `Evet! ${fullCab} kabin tam dolu kalkar: ${fullCab} × ${level.seats} = ${num(fullCab * level.seats)}. ${rem} kişi sonraki turu bekler.`
        : level.costPer
          ? `Evet! ${num(level.people)} kişi için ${needCab} kabin gerekir (${fullCab} dolu kabin + ${rem} kişilik kabin). ${needCab} × ${tl(level.costPer)} = ${tl(answer)}.`
          : rem
            ? `Evet! ${fullCab} kabin ${num(fullCab * level.seats)} kişi taşır; kalan ${rem} kişi için bir kabin daha: ${needCab} kabin.`
            : `Evet! ${needCab} × ${level.seats} = ${level.people}. ${needCab} kabin doldu.`
      api.complete(text + estTxt)
      return
    }
    api.report(false)
    const S = level.seats
    if (level.costPer) {
      if (rem && n === fullCab * level.costPer) return api.nudge(`${fullCab} kabin kiraladın. Ama ${num(fullCab * S)} kişi biner; geriye ${rem} kişi kalır. O kişi ne olacak?`, { mis: 'Kalanlı bölmede kalanı yok saydı' })
      if (n === level.people * level.costPer) return api.nudge('Ücret kişi başına değil, kabin başına ödeniyor. Önce kaç kabin gerektiğini bul.', { mis: 'Birimi karıştırdı (kişi başı / kabin başı)' })
      if (n === needCab || n === fullCab) return api.nudge(`${n}, kabin sayısı. Soru toplam ücreti soruyor: her kabin ${tl(level.costPer)}.`)
      return api.nudge(`Adım adım: ${num(level.people)} kişi 8’erli kabinlere kaç kabin eder? Sonra kabin sayısını ${tl(level.costPer)} ile çarp.`)
    }
    if (level.ask === 'needed' && rem && n === fullCab) return api.nudge(`${fullCab} kabin ${num(fullCab * S)} kişi taşır. Sırada ${rem} kişi kaldı. Onlar da binmeli! Ne gerekir?`, { mis: 'Kalanlı bölmede kalanı yok saydı (kaç kabin gerekir)' })
    if (level.ask === 'full' && n === needCab) return api.nudge(`Son kabinde yalnızca ${rem} kişi var. Kural: kabin ancak ${S} kişi dolunca kalkıyor. O kabin kalkar mı?`, { mis: 'Kalanı bir kabin daha saydı (dolu kabin sorusunda)' })
    if (n === rem) return api.nudge(`${rem}, kabinlere sığmayan kalan kişi sayısı. Soru kabin sayısını soruyor.`)
    if (n === level.people * S) return api.nudge('Kişi sayısını koltuk sayısıyla çarptın. Ama kişileri kabinlere ayırıyoruz: kaç tane grup oluşur?', { mis: 'Bölme yerine çarpma yaptı' })
    return api.nudge(`${n} kabin ${num(n * S)} kişi taşır. Sırada ${num(level.people)} kişi var. ${n * S < level.people ? 'Yetiyor mu?' : 'Fazla mı?'}`)
  }

  const recent = ladder.slice(-4)
  const overlay = (
    <div className="absolute top-[8%] right-[2%] flex max-w-[50%] flex-col items-end gap-1 text-[clamp(11px,1.9vw,16px)]">
      {level.chunks.length === 1 ? (
        <>
          {loaded > 0 && <Sign>{loaded <= 10 ? Array.from({ length: loaded }, (_, i) => Math.min(level.seats, level.people - i * level.seats)).join(' + ') : `${loaded} kabin`} = {level.people - remaining}</Sign>}
          <Sign tone="dark">Dolan kabin: {loaded}</Sign>
        </>
      ) : (
        <>
          {ladder.length > recent.length && <Sign tone="pink">…</Sign>}
          {recent.map((l, i) => <Sign key={ladder.length - recent.length + i}>{l.k} kabin → {num(l.ppl)} kişi</Sign>)}
          <Sign tone="dark">Toplam: {loaded} kabin → {num(level.people - remaining)} kişi</Sign>
        </>
      )}
    </div>
  )

  const scene = (
    <ParkSvg label={`Dönme dolap, her kabinde ${level.seats} koltuk; sırada ${remaining} kişi`}>
      <FerrisWheel cabins={N} seats={level.seats} rot={wheel.rot} filled={filled} glowBottom={!busy && remaining > 0} />
      <Queue count={remaining} perFig={perFig} />
    </ParkSvg>
  )

  const controls = (
    <div className="flex flex-col gap-2">
      {est === null && level.estimate && (
        <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <p className="mb-2 text-sm font-black text-amber-950">Önce tahmin et: kaç kabin gerekir?</p>
          <div className="grid grid-cols-3 gap-2">
            {level.estimate.options.map((o, i) => (
              <button key={o} type="button" onClick={() => { setEst(i); api.nudge('Şimdi kabinleri doldurarak ya da hesaplayarak bul!', { tone: 'ok' }) }} className="min-h-12 rounded-xl bg-white px-1 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200 active:scale-95">{o}</button>
            ))}
          </div>
        </div>
      )}
      {est !== null && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Dolan kabin" value={loaded} tone="pink" />
            <Stat label="Sırada" value={`${num(remaining)} kişi`} tone="blue" />
          </div>
          {!api.done && (
            <div className={`grid gap-2 ${level.chunks.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {level.chunks.map((k) => (
                <button key={k} type="button" disabled={busy} onClick={() => load(k)} className={`${api.big ? 'min-h-16 text-xl' : 'min-h-14 text-lg'} rounded-2xl bg-fuchsia-600 px-2 font-black text-white shadow-[0_4px_0_#86198f] transition active:translate-y-[2px] active:shadow-none disabled:opacity-50`}>
                  {level.chunks.length === 1 ? `🚡 Kabin doldur (${ek(level.seats, 'dist')})` : `+${k} kabin`}
                </button>
              ))}
            </div>
          )}
          {loaded > 0 && !api.done && <button type="button" onClick={restart} disabled={busy} className="btn-ghost min-h-12 text-sm">Kabinleri boşalt, yeniden dene</button>}
          {!api.done && (
            <div>
              <p className="mb-2 text-base font-black">{level.question}</p>
              <NumPad unit={level.costPer ? 'TL' : 'kabin'} onSubmit={submit} big={api.big} />
            </div>
          )}
        </>
      )}
    </div>
  )
  return <Shell scene={scene} overlay={overlay} controls={controls} />
}
