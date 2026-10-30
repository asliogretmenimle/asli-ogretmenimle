import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Coins, RotateCcw, ShoppingCart, Wallet } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { useSolutions, SolutionList } from '../../kit2'
import { Card, Nudge, Prompt, Split, Stage } from '../../../interactions/donusum-studyosu/ortak'
import { approx, coinColor, speak, exchange, isSade, pairs, priceText, rad, type Coin, type Option, type Product, type Step } from './model'

export interface StepProps {
  /** Yanlış deneme (rapor + puan) */
  onFail: (mis?: string) => void
  /** Görev çözüldü */
  onSolved: () => void
  footer: ReactNode
}

type Note = { text: string; tone: 'think' | 'ok'; mis?: string } | null

function NoteView({ note, onClose }: { note: Note; onClose: () => void }) {
  if (!note) return null
  return <Nudge key={note.text} question={note.text} tone={note.tone} misconception={note.mis} onClose={note.tone === 'think' ? onClose : undefined} />
}

/* ───────────── jeton ───────────── */

export function CoinView({ coin, onClick, size = 'md', disabled }: { coin: Coin; onClick?: () => void; size?: 'md' | 'lg'; disabled?: boolean }) {
  const col = coinColor(coin.r)
  const sade = isSade(coin.r)
  const dim = size === 'lg' ? 'size-24 text-2xl' : 'size-16 text-lg'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`relative grid ${dim} shrink-0 place-items-center rounded-full font-black shadow-[0_3px_0_rgba(0,0,0,.35)] transition active:scale-95 disabled:cursor-default animate-pop`}
      style={{ background: col.bg, color: col.ink, boxShadow: `inset 0 0 0 3px ${col.ring}55, 0 3px 0 rgba(0,0,0,.35)` }}
      aria-label={`${coin.r === 1 ? `${coin.c} lira` : `${coin.c === 1 ? '' : `${coin.c} çarpı `}kök ${coin.r} lira`}${sade ? '' : ', bozdurulmalı'}`}
    >
      <MathText text={rad(coin.c, coin.r)} />
      {!sade && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-1.5 text-[10px] leading-4 font-black text-amber-950">bozdur</span>}
    </button>
  )
}

/* ───────────── ödeme ───────────── */

const famSum = (coins: Coin[]) => {
  const m: Record<number, number> = {}
  for (const c of coins) m[c.r] = (m[c.r] ?? 0) + c.c
  return m
}
const famLabel = (r: number) => (r === 1 ? 'Lira' : `√${r} cinsi`)

export function PayStep({ step, onFail, onSolved, footer }: StepProps & { step: Extract<Step, { kind: 'pay' }> }) {
  const init = useMemo(() => step.wallet.map(([c, r], i) => ({ id: `w${i}`, c, r })), [step])
  const [wallet, setWallet] = useState<Coin[]>(init)
  const [tray, setTray] = useState<Coin[]>([])
  const [buro, setBuro] = useState<Coin | null>(null)
  const [note, setNote] = useState<Note>(null)
  const [done, setDone] = useState(false)
  const uid = useRef(0)
  const sol = useSolutions()
  const ways = step.ways ?? 1
  const price = step.items.reduce<Record<number, number>>((m, it) => {
    for (const [r, c] of Object.entries(it.price)) m[Number(r)] = (m[Number(r)] ?? 0) + c
    return m
  }, {})
  const sums = famSum(tray)
  const fams = [...new Set([...Object.keys(price), ...Object.keys(sums)].map(Number))].sort((a, b) => a - b)

  const tapWallet = (coin: Coin) => {
    if (done) return
    setNote(null)
    if (isSade(coin.r)) {
      setWallet((w) => w.filter((x) => x.id !== coin.id))
      setTray((t) => [...t, coin])
    } else setBuro(coin)
  }
  const tapTray = (coin: Coin) => {
    if (done) return
    setTray((t) => t.filter((x) => x.id !== coin.id))
    setWallet((w) => [...w, coin])
  }
  const reset = () => {
    setWallet((w) => [...w, ...tray])
    setTray([])
    setNote(null)
  }

  const pickPair = (coin: Coin, p: [number, number]) => {
    const res = exchange(coin, p)
    const [a, b] = p
    if (!res) {
      onFail('Kök içini tam kare olmayan çarpanlara ayırarak sadeleştirmeye çalıştı')
      setNote({
        tone: 'think',
        text: b === 1
          ? `√${a} · √1 yazınca dışarı yalnızca √1 = 1 çıkar; para değişmez. ${coin.r} sayısını bölen 1’den büyük bir tam kare (4, 9, 16, 25, 36…) var mı?`
          : `${a} de ${b} de tam kare değil; kökün dışına tam sayı çıkmaz. ${coin.r} sayısını bölen bir tam kare (4, 9, 16, 25, 36…) ara.`,
      })
      return
    }
    const nc: Coin = { id: `x${uid.current++}`, c: res.c, r: res.r }
    setWallet((w) => w.map((x) => (x.id === coin.id ? nc : x)))
    setBuro(null)
    const before = `${rad(coin.c, coin.r).replace(/[{}]/g, '')}`
    const after = rad(nc.c, nc.r).replace(/[{}]/g, '')
    const check = `Kontrol: ${before} ≈ ${approx(coin.c * Math.sqrt(coin.r))} ve ${after} ≈ ${approx(nc.c * Math.sqrt(nc.r))}`
    setNote(isSade(nc.r)
      ? { tone: 'ok', text: `Bozduruldu: ${before} = ${after}. ${check}.` }
      : { tone: 'ok', text: `Bozduruldu: ${before} = ${after}. Ama ${after} hâlâ sadeleşebilir; bir kez daha bozdurabilirsin.` })
  }

  const pay = () => {
    if (done || !tray.length) return
    const foreign = Object.keys(sums).map(Number).filter((r) => !(r in price))
    if (foreign.length) {
      const fr = foreign[0]
      const want = Object.keys(price).map(Number)[0]
      onFail(fr !== 1 && want !== 1 ? `Farklı kök cinsindeki paraları aynı tutar saydı (√${fr} ile √${want})` : 'Tam sayı ile kareköklü parayı aynı cins saydı')
      setNote({ tone: 'think', text: `Tepside ${famLabel(fr)} para var ama fiyatta bu cins yok. ${fr === 1 || want === 1 ? 'Lira ile kökü' : `√${fr} ile √${want}`} birbirine eklenebilir mi? Lira ile doları toplayıp “lira” diyebilir misin?` })
      return
    }
    for (const r of Object.keys(price).map(Number)) {
      const have = sums[r] ?? 0, need = price[r]
      if (have !== need) {
        onFail()
        const unit = r === 1 ? '' : `√${r}`
        setNote({ tone: 'think', text: have < need
          ? `${famLabel(r)}: tepside ${have || 0}${unit} var, ${need}${unit} gerekiyor. Eksik ${need - have}${unit}. Hangi paralar bunu tamamlar?`
          : `${famLabel(r)}: tepside ${have}${unit} var, ${need}${unit} yeterdi; ${have - need}${unit} fazla verdin. Hangi parayı geri alırsın?` })
        return
      }
    }
    const key = tray.map((c) => `${c.c}r${c.r}`).sort().join('+')
    const label = tray.map((c) => rad(c.c, c.r)).join(' + ')
    if (ways > 1) {
      if (!sol.add(key, label)) {
        setNote({ tone: 'think', text: 'Bu yolu zaten buldun. Aynı tutarı farklı paralarla öde!' })
        return
      }
      if (sol.list.length + 1 < ways) {
        setNote({ tone: 'ok', text: `Tam tutar: ${label} = ${priceText(price)}. Şimdi aynı tutarı başka paralarla öde.` })
        setWallet(init)
        setTray([])
        return
      }
    }
    setDone(true)
    setNote({ tone: 'ok', text: `Ödendi! ${label === priceText(price) ? `Tam ${label} lira.` : `${label} = ${priceText(price)}.`} Kasa çınladı 🔔` })
    onSolved()
  }

  const work = (
    <Stage dark>
      <div className="rounded-2xl bg-[linear-gradient(180deg,#3b2a1a,#2a1d12)] p-3 ring-1 ring-amber-900/60">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-wide text-amber-200 uppercase"><ShoppingCart size={15} />Raf</p>
        <div className="flex flex-wrap justify-center gap-3">
          {step.items.map((it) => (
            <div key={it.name} className="w-36 rounded-2xl bg-amber-50 p-3 text-center text-ink shadow-[0_4px_0_#78350f]">
              <span className="text-5xl" aria-hidden>{it.emoji}</span>
              <p className="mt-1 font-black">{it.name}</p>
              <p className="mt-1 inline-block rounded-lg bg-rose-600 px-2.5 py-1 text-lg font-black text-white"><MathText text={priceText(it.price)} /> ₺</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-slate-800 p-3 ring-1 ring-slate-600">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-black tracking-wide text-emerald-300 uppercase"><Coins size={15} />Kasa tepsisi</p>
          {tray.length > 0 && !done && <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-700 px-3 text-sm font-extrabold text-slate-100 ring-1 ring-slate-500"><RotateCcw size={15} />Geri al</button>}
        </div>
        <div className="flex min-h-20 flex-wrap items-center gap-2.5 rounded-xl bg-slate-900/60 p-2.5">
          {tray.length ? tray.map((c) => <CoinView key={c.id} coin={c} onClick={done ? undefined : () => tapTray(c)} />) : <p className="w-full text-center text-sm font-bold text-slate-400">Cüzdandan sade bir paraya dokun; buraya gelir.</p>}
        </div>
        <div className="mt-2.5 grid gap-1.5">
          {fams.map((r) => {
            const have = sums[r] ?? 0, need = price[r] ?? 0
            const ok = have === need && need > 0
            return (
              <div key={r} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-extrabold ${ok ? 'bg-emerald-900/60 text-emerald-200' : need ? 'bg-slate-700/70 text-slate-200' : 'bg-amber-900/50 text-amber-200'}`}>
                <span>{famLabel(r)}</span>
                <span className="text-base">
                  <MathText text={have ? rad(have, r) : '0'} /> <span className="text-slate-400">/</span> <MathText text={need ? rad(need, r) : 'fiyatta yok'} />
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Stage>
  )

  const panel = (
    <>
      <Prompt step="Alışveriş"><MathText text={step.prompt} /></Prompt>
      <Card dark>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-wide text-amber-300 uppercase"><Wallet size={15} />Cüzdan</p>
        <div className="flex flex-wrap gap-2.5 pb-2">
          {wallet.length ? wallet.map((c) => <CoinView key={c.id} coin={c} onClick={done ? undefined : () => tapWallet(c)} />) : <p className="text-sm font-bold text-slate-400">Cüzdan boş.</p>}
        </div>
      </Card>
      {buro && (
        <Card className="animate-fade-up">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-black tracking-wide text-violet-700 uppercase"><ArrowLeftRight size={15} />Bozdurma Bürosu</p>
          <div className="flex items-center gap-3">
            <CoinView coin={buro} />
            <p className="text-sm font-bold text-ink-soft">Kök içini hangi çarpımla yazarsan bir tam kare dışarı çıkar?</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {pairs(buro.r).map((p) => (
              <button key={p.join('x')} type="button" onClick={() => pickPair(buro, p)} aria-label={`kök ${p[0]} çarpı ${p[1]}`} className="min-h-12 rounded-xl bg-violet-50 px-2 text-lg font-black text-violet-900 ring-1 ring-violet-200 active:scale-95">
                <MathText text={`${buro.c === 1 ? '' : buro.c}√{${p[0]} · ${p[1]}}`} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setBuro(null)} className="mt-2 min-h-11 w-full rounded-xl text-sm font-extrabold text-ink-soft ring-1 ring-line">Vazgeç</button>
        </Card>
      )}
      <NoteView note={note} onClose={() => setNote(null)} />
      {ways > 1 && <SolutionList list={sol.list} goal={ways} />}
      {!done && <button type="button" onClick={pay} disabled={!tray.length} className="btn-primary min-h-14 w-full text-lg"><Coins size={20} />Öde</button>}
      {footer}
    </>
  )
  return <Split work={work} panel={panel} />
}

/* ───────────── seçmeli soru ───────────── */

export function ChoiceStep({ step, onFail, onSolved, footer }: StepProps & { step: Extract<Step, { kind: 'choice' }> }) {
  const [picked, setPicked] = useState<Option | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const done = !!picked?.ok
  const pick = (o: Option) => {
    if (done || wrong.includes(o.label)) return
    setPicked(o)
    if (o.ok) onSolved()
    else {
      setWrong((w) => [...w, o.label])
      onFail(o.mis)
    }
  }
  const work = (
    <Stage dark className="grid min-h-56 place-items-center p-6 text-center">
      <div>
        <span className="text-7xl" aria-hidden>{step.emoji}</span>
        <p className="mx-auto mt-3 max-w-md text-xl leading-snug font-black text-white"><MathText text={step.prompt} /></p>
      </div>
    </Stage>
  )
  const panel = (
    <>
      <Prompt step="Kasa sorusu">Doğru tutarı seç.</Prompt>
      <div className="grid grid-cols-2 gap-2">
        {step.options.map((o) => {
          const isWrong = wrong.includes(o.label)
          const isOk = done && picked?.label === o.label
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => pick(o)}
              disabled={done || isWrong}
              aria-label={speak(o.label)}
              className={`min-h-16 rounded-2xl px-3 text-2xl font-black ring-2 transition active:scale-[0.97] ${isOk ? 'bg-emerald-500 text-white ring-emerald-600' : isWrong ? 'bg-slate-700 text-slate-400 ring-slate-600 line-through' : 'bg-white text-ink ring-line hover:bg-amber-50'}`}
            >
              <MathText text={o.label} />
            </button>
          )
        })}
      </div>
      {picked && !picked.ok && picked.nudge && <Nudge key={picked.label} question={picked.nudge} />}
      {done && <Nudge question={step.explain} tone="ok" />}
      {footer}
    </>
  )
  return <Split work={work} panel={panel} />
}

/* ───────────── fiyat karşılaştırma ───────────── */

export function CompareStep({ step, onFail, onSolved, footer }: StepProps & { step: Extract<Step, { kind: 'compare' }> }) {
  const [inside, setInside] = useState<Record<string, boolean>>({})
  const [asking, setAsking] = useState<Product | null>(null)
  const [note, setNote] = useState<Note>(null)
  const [done, setDone] = useState<string | null>(null)
  const val = (p: Product) => p.c * p.c * p.r
  const cheapest = step.products.reduce((a, b) => (val(b) < val(a) ? b : a))

  const optionsFor = (p: Product) => [...new Set([p.c * p.c * p.r, p.c * p.r, p.c * p.c + p.r, p.c + p.r])].sort((a, b) => a - b)
  const pickInside = (p: Product, v: number) => {
    if (v === val(p)) {
      setInside((m) => ({ ...m, [p.name]: true }))
      setAsking(null)
      setNote({ tone: 'ok', text: `${p.c}√${p.r} = √(${p.c}² · ${p.r}) = √${val(p)}` })
    } else {
      onFail(v === p.c * p.r ? 'Katsayıyı kök içine alırken karesini almadı' : undefined)
      setNote({ tone: 'think', text: `${p.c} sayısını kök içine yazmak için onu bir karekök olarak düşün: ${p.c} = √${p.c * p.c}. Öyleyse ${p.c}√${p.r} = √(${p.c * p.c} · ${p.r}) = ?` })
    }
  }
  const buy = (p: Product) => {
    if (done) return
    if (p.name === cheapest.name) {
      setDone(p.name)
      setNote({ tone: 'ok', text: `En ucuz ürün ${p.name}: ${step.products.map((q) => `√${val(q)}`).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(' < ')}` })
      onSolved()
      return
    }
    onFail('Kareköklü sayıları karşılaştırırken yalnızca katsayıya ya da kök içine baktı')
    const big = p.c > cheapest.c ? 'katsayısı' : 'kök içi'
    setNote({ tone: 'think', text: `${p.name} etiketinin ${big} büyük ama bu yeterli mi? İki etiketi de tek bir kök olarak yaz ve kök içlerini karşılaştır: √${val(p)} mü küçük, yoksa başka bir ürün mü?` })
  }
  const work = (
    <Stage dark>
      <div className="grid grid-cols-1 gap-3 rounded-2xl bg-[linear-gradient(180deg,#3b2a1a,#2a1d12)] p-3 sm:grid-cols-3">
        {step.products.map((p) => (
          <div key={p.name} className={`rounded-2xl bg-amber-50 p-3 text-center text-ink shadow-[0_4px_0_#78350f] ${done === p.name ? 'ring-4 ring-emerald-400' : ''}`}>
            <span className="text-5xl" aria-hidden>{p.emoji}</span>
            <p className="mt-1 font-black">{p.name}</p>
            <p className="mt-1 inline-block rounded-lg bg-rose-600 px-2.5 py-1 text-xl font-black text-white">
              <MathText text={rad(p.c, p.r)} /> ₺{inside[p.name] && <> = <MathText text={`√{${val(p)}}`} /></>}
            </p>
            <div className="mt-2 grid gap-1.5">
              {!inside[p.name] && <button type="button" onClick={() => { setAsking(p); setNote(null) }} disabled={!!done} className="min-h-11 rounded-xl bg-violet-100 text-sm font-extrabold text-violet-900 ring-1 ring-violet-200">Kök içine al</button>}
              <button type="button" onClick={() => buy(p)} disabled={!!done} className="min-h-11 rounded-xl bg-emerald-600 text-sm font-extrabold text-white disabled:opacity-50">Bunu al</button>
            </div>
          </div>
        ))}
      </div>
    </Stage>
  )
  const panel = (
    <>
      <Prompt step="Karşılaştır">{step.prompt}</Prompt>
      {asking && (
        <Card className="animate-fade-up">
          <p className="mb-2 text-sm font-black text-violet-800"><MathText text={`${rad(asking.c, asking.r)} = √{?}`} /></p>
          <div className="grid grid-cols-2 gap-2">
            {optionsFor(asking).map((v) => (
              <button key={v} type="button" onClick={() => pickInside(asking, v)} aria-label={`kök ${v}`} className="min-h-12 rounded-xl bg-violet-50 text-xl font-black text-violet-900 ring-1 ring-violet-200 active:scale-95"><MathText text={`√{${v}}`} /></button>
            ))}
          </div>
        </Card>
      )}
      <NoteView note={note} onClose={() => setNote(null)} />
      {footer}
    </>
  )
  return <Split work={work} panel={panel} />
}
