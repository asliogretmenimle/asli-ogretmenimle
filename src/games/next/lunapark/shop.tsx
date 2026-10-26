import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { BigButton } from '../../kit2'
import { Kid, ParkSvg } from './art'
import { tl, type SpendLevel, type TicketLevel, type TicketType } from './levels'
import { Shell, useApi } from './shell'
import { NumPad, Sign, Stat } from './ui'

const short = (t: TicketType) => (t.n === 1 ? 'tek' : t.label.split(' ')[0])

function MiniStep({ value, onMinus, onPlus, big, minusOff, plusOff, label }: { value: number; onMinus: () => void; onPlus: () => void; big?: boolean; minusOff?: boolean; plusOff?: boolean; label: string }) {
  const s = big ? 'size-14' : 'size-12'
  const b = `grid ${s} shrink-0 place-items-center rounded-xl bg-white ring-1 ring-line shadow-[0_3px_0_#d9dbe8] transition active:translate-y-[2px] active:shadow-none disabled:opacity-35`
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={b} onClick={onMinus} disabled={minusOff || value <= 0} aria-label={`${label} azalt`}><Minus size={20} strokeWidth={3} /></button>
      <span className="w-8 text-center text-2xl font-black tabular-nums">{value}</span>
      <button type="button" className={b} onClick={onPlus} disabled={plusOff} aria-label={`${label} artır`}><Plus size={20} strokeWidth={3} /></button>
    </div>
  )
}

/* ───────────── Bilet gişesi ───────────── */

export function TicketTask({ level }: { level: TicketLevel }) {
  const api = useApi()
  const T = level.types
  const [counts, setCounts] = useState<number[]>(() => T.map(() => 0))
  const [found, setFound] = useState<{ key: string; cost: number }[]>([])
  const [follow, setFollow] = useState(false)
  const tickets = counts.reduce((a, c, i) => a + c * T[i].n, 0)
  const cost = counts.reduce((a, c, i) => a + c * T[i].price, 0)
  const single = T.find((t) => t.n === 1)!

  const valid = (cs: number[]) => {
    const n = cs.reduce((a, c, i) => a + c * T[i].n, 0)
    const p = cs.reduce((a, c, i) => a + c * T[i].price, 0)
    if (level.mode === 'exact') return n === level.need
    if (n < level.need || (level.budget && p > level.budget)) return false
    return cs.every((c, i) => c === 0 || n - T[i].n < level.need)
  }
  const minAll = useMemo(() => {
    let best = Infinity
    const lim = T.map((t) => Math.ceil(level.need / t.n) + 1)
    const rec = (i: number, cs: number[]) => {
      if (i === T.length) {
        if (valid(cs)) best = Math.min(best, cs.reduce((a, c, j) => a + c * T[j].price, 0))
        return
      }
      for (let c = 0; c <= lim[i]; c++) rec(i + 1, [...cs, c])
    }
    rec(0, [])
    return best
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i: number, d: number) => {
    if (api.done) return
    setCounts((cs) => cs.map((c, j) => (j === i ? Math.max(0, c + d) : c)))
  }

  const labelOf = (cs: number[]) => cs.map((c, i) => (c ? `${c > 1 ? `${c} × ` : ''}${short(T[i])}` : '')).filter(Boolean).join(' + ')

  const buy = () => {
    if (api.done) return
    if (tickets === 0) return api.nudge('Önce sağdaki + düğmeleriyle bilet ya da paket seç.')
    if (tickets < level.need) {
      api.report(false)
      return api.nudge(`${level.need - tickets} ${level.who} biletsiz kaldı! Herkese birer bilet gerekli. Bir paket ya da tek bilet eklemeyi düşün.`)
    }
    if (level.mode === 'exact' && tickets > level.need) {
      api.report(false)
      return api.nudge(`${tickets - level.need} bilet fazla oldu. Fazla bilet kalmamalı: hangi bileti ya da paketi değiştirirsin?`)
    }
    if (level.budget && cost > level.budget) {
      api.report(false)
      return api.nudge(`Toplam ${tl(cost)}; bütçe ${tl(level.budget)}. ${tl(cost - level.budget)} aşıyor. Bilet başına daha ucuza gelen paketleri düşün.`, { mis: cost - level.budget > 0 && counts[0] > 5 ? 'Paketlerin bilet başı fiyatını karşılaştırmadı' : undefined })
    }
    if (!valid(counts)) {
      api.report(false)
      return api.nudge('Bir paketi çıkarsan yine herkese bilet yetiyor! Gereksiz bilet almadan dene.')
    }
    const key = counts.join('-')
    if (found.some((f) => f.key === key)) return api.nudge('Bu yolu zaten buldun. Paketleri farklı birleştirerek başka bir yol dene!')
    api.report(true)
    api.add(key, `${labelOf(counts)} = ${tl(cost)}`)
    const list = [...found, { key, cost }]
    setFound(list)
    if (list.length >= level.goal && !follow) {
      setFollow(true)
      api.nudge(`Süper, ${list.length} farklı yol! Şimdi yolları karşılaştır ve soruyu cevapla. İstersen yeni yollar da bulabilirsin.`, { tone: 'ok' })
    } else if (!follow) api.nudge(`Yeni bir yol: ${tl(cost)}. Başka bir paket birleşimi dene!`, { tone: 'ok' })
    else api.nudge(`Yeni bir yol: ${tl(cost)}! Soruyu bir daha düşün.`, { tone: 'ok' })
    if (counts[counts.length - 1] > 0 && counts.length > 2) api.strategy('Önce büyük paketi aldım')
  }

  const answer = level.follow.kind === 'saving' ? single.price * level.need - minAll : (level.budget ?? 0) - minAll
  const submit = (n: number) => {
    if (api.done) return
    const minFound = Math.min(...found.map((f) => f.cost))
    if (n === answer) {
      api.report(true)
      if (minFound > minAll) api.nudge(null)
      return api.complete(level.follow.kind === 'saving' ? `Evet! ${level.need} × ${tl(single.price)} = ${tl(single.price * level.need)}; en ucuz yol ${tl(minAll)}. Fark ${tl(answer)}.` : `Evet! En ucuz yol ${tl(minAll)}; ${tl(level.budget ?? 0)} − ${tl(minAll)} = ${tl(answer)} artar.`)
    }
    api.report(false)
    const theirs = level.follow.kind === 'saving' ? single.price * level.need - minFound : (level.budget ?? 0) - minFound
    if (n === theirs && minFound > minAll) return api.nudge('Bulduğun en ucuz yol için hesabın doğru! Ama daha da ucuz bir yol var mı? Paketlerde bir bilet kaç TL’ye geliyor, karşılaştır.')
    if (n === minAll || n === minFound) return api.nudge('Bu, yollardan birinin fiyatı. Soru farkı soruyor: iki tutar arasında ne kadar var?', { mis: 'Fark sorusunda toplam fiyatı verdi' })
    if (level.follow.kind === 'saving') return api.nudge(`Önce hepsine tek bilet alsan kaç TL ödersin? ${level.need} × ${tl(single.price)}. Sonra en ucuz yolla karşılaştır.`)
    return api.nudge(`Bütçe ${tl(level.budget ?? 0)}. En ucuz yolun fiyatını bütçeden çıkar.`)
  }

  // Çocuklara bilet dağıt: büyük paketler önce
  const holders: { color: string; pack: number; g: number }[] = []
  const order = T.map((_, i) => i).sort((a, b) => T[b].n - T[a].n)
  let g = 0
  for (const i of order) for (let c = 0; c < counts[i]; c++) {
    for (let k = 0; k < T[i].n; k++) holders.push({ color: T[i].color, pack: T[i].n, g })
    g++
  }
  const people = level.need
  const perRow = people <= 10 ? people : Math.ceil(people / 2)
  const rows = Math.ceil(people / perRow)
  const sc = people <= 10 ? 1.7 : 1.05
  const gap = Math.min(42, 420 / perRow)
  const pos = (k: number) => {
    const r = Math.floor(k / perRow), cI = k % perRow
    const inRow = Math.min(perRow, people - r * perRow)
    return { x: 570 - ((inRow - 1) * gap) / 2 + cI * gap, y: rows === 1 ? 452 : 380 + r * 82 }
  }
  const extra = Math.max(0, holders.length - people)

  const scene = (
    <ParkSvg label="Bilet gişesi ve bilet bekleyen çocuklar" tent={false}>
      {/* gişe */}
      <g transform="translate(40 96)">
        <rect x="0" y="40" width="270" height="262" rx="14" fill="#fff7ed" stroke="#9a3412" strokeWidth="4" />
        <path d="M-12 40 h294 l-14 -40 h-266z" fill="#f43f5e" />
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${-12 + i * 42} 40 h21 l-2 -40 h-19z`} fill="#fff" opacity=".9" />)}
        <path d="M-12 40 h294 v14 q-21 14 -42 0 q-21 14 -42 0 q-21 14 -42 0 q-21 14 -42 0 q-21 14 -42 0 q-21 14 -42 0 q-21 14 -42 0z" fill="#be123c" />
        <rect x="70" y="-34" width="130" height="32" rx="8" fill="#1e293b" />
        <text x="135" y="-12" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fde047">🎟️ GİŞE</text>
        <rect x="18" y="70" width="234" height={36 + T.length * 46} rx="10" fill="#1e293b" />
        <text x="135" y="94" textAnchor="middle" fontSize="15" fontWeight="900" fill="#f0abfc">BİLET FİYATLARI</text>
        {T.map((t, i) => (
          <g key={t.id} transform={`translate(30 ${108 + i * 46})`}>
            <rect width="210" height="38" rx="8" fill={t.color} />
            <circle cx="0" cy="19" r="7" fill="#1e293b" /><circle cx="210" cy="19" r="7" fill="#1e293b" />
            <text x="14" y="25" fontSize="16" fontWeight="900" fill="#fff">{t.label}</text>
            <text x="196" y="25" textAnchor="end" fontSize="17" fontWeight="900" fill="#fff">{tl(t.price)}</text>
          </g>
        ))}
        <rect x="0" y="270" width="270" height="32" rx="6" fill="#9a3412" />
        {level.budget && <text x="135" y="292" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff">Bütçe: {tl(level.budget)}</text>}
      </g>
      {/* çocuklar ve biletleri */}
      {Array.from({ length: people }, (_, k) => {
        const p = pos(k)
        const h = holders[k]
        const top = p.y - 34 * sc
        return (
          <g key={k}>
            <Kid x={p.x} y={p.y} i={k + 3} s={sc} />
            {h ? (
              <g transform={`translate(${p.x} ${top - 8})`} className="animate-pop">
                <rect x={-9 * sc} y={-8 * sc} width={18 * sc} height={11 * sc} rx={2} fill={h.color} stroke="#fff" strokeWidth="1.5" />
                <text y={1.5 * sc} textAnchor="middle" fontSize={7 * sc} fontWeight="900" fill="#fff">{h.pack === 1 ? '1' : `${h.pack}’`}</text>
              </g>
            ) : (
              <g transform={`translate(${p.x} ${top - 8})`}>
                <circle r={7 * sc} fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
                <text y={3 * sc} textAnchor="middle" fontSize={9 * sc} fontWeight="900" fill="#94a3b8">?</text>
              </g>
            )}
            {h && (k + 1 >= people || holders[k + 1]?.g !== h.g) && (() => {
              let s0 = k
              while (s0 > 0 && holders[s0 - 1]?.g === h.g && Math.floor((s0 - 1) / perRow) === Math.floor(k / perRow)) s0--
              const a = pos(s0)
              return <rect x={a.x - gap / 2 + 3} y={p.y + 4} width={p.x - a.x + gap - 6} height={6} rx={3} fill={h.color} />
            })()}
          </g>
        )
      })}
      {extra > 0 && (
        <g transform="translate(700 300)">
          <rect x="-58" y="-20" width="116" height="34" rx="10" fill="#fff" stroke="#f59e0b" strokeWidth="2" />
          <text y="4" textAnchor="middle" fontSize="15" fontWeight="900" fill="#b45309">+{extra} fazla bilet</text>
        </g>
      )}
    </ParkSvg>
  )

  const overlay = (
    <div className="absolute top-[3%] right-[2%] flex flex-col items-end gap-1 text-[clamp(11px,1.9vw,16px)]">
      <Sign tone={tickets === level.need ? 'green' : tickets > level.need ? 'amber' : 'pink'}>🎟️ {tickets} / {level.need} bilet</Sign>
    </div>
  )

  const controls = (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl bg-white/95 p-2 ring-1 ring-line">
        {T.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-0">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[15px] leading-tight font-black"><span className="inline-block size-3 shrink-0 rounded-sm" style={{ background: t.color }} />{t.label}</p>
              <p className="text-sm font-bold text-ink-soft">{tl(t.price)}{t.n > 1 ? ` · ${t.n} bilet` : ''}</p>
            </div>
            <MiniStep label={t.label} value={counts[i]} onMinus={() => set(i, -1)} onPlus={() => set(i, 1)} big={api.big} plusOff={api.done || tickets >= level.need + 10} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white/95 p-3 text-sm font-bold tabular-nums ring-1 ring-line">
        {counts.every((c) => c === 0) && <p className="text-ink-soft">Fiş boş. Bilet ya da paket ekle.</p>}
        {T.map((t, i) => counts[i] > 0 && (
          <p key={t.id} className="flex justify-between gap-2"><span>{counts[i]} × {t.label}</span><span>{tl(counts[i] * t.price)}</span></p>
        ))}
        <p className="mt-1 flex justify-between border-t border-line pt-1 text-base font-black"><span>Toplam</span><span className={level.budget && cost > level.budget ? 'text-rose-600' : ''}>{tl(cost)}</span></p>
      </div>
      {!api.done && <BigButton onClick={buy} className="w-full"><ShoppingCart size={20} />Satın al</BigButton>}
      {found.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Bulunan yol" value={`${found.length}${follow ? '' : ` / ${level.goal}`}`} tone="green" />
          <Stat label="En ucuzun" value={tl(Math.min(...found.map((f) => f.cost)))} tone="amber" />
        </div>
      )}
      {follow && !api.done && (
        <div className="animate-fade-up">
          <p className="mb-2 text-base font-black">{level.follow.q}</p>
          <NumPad unit="TL" onSubmit={submit} big={api.big} />
        </div>
      )}
    </div>
  )
  return <Shell scene={scene} overlay={overlay} controls={controls} />
}

/* ───────────── Lunapark kartı harcama ───────────── */

export function SpendTask({ level }: { level: SpendLevel }) {
  const api = useApi()
  const I = level.items
  const [counts, setCounts] = useState<number[]>(() => I.map(() => 0))
  const [bump, setBump] = useState<{ i: number; n: number } | null>(null)
  const [plans, setPlans] = useState<string[]>([])
  const spent = counts.reduce((a, c, i) => a + c * I[i].price, 0)
  const bal = level.budget - spent
  const cheapest = Math.min(...I.map((x) => x.price))
  const seqRef = useRef<number[]>([])
  const seq = seqRef.current

  const check = (cs: number[]) => {
    const b = level.budget - cs.reduce((a, c, i) => a + c * I[i].price, 0)
    if (b === 0) {
      const key = cs.join('-')
      if (plans.includes(key)) return api.nudge('Bu planı zaten buldun! “Yeni kart” ile baştan başla ve farklı oyuncaklar seç.')
      api.report(true)
      api.add(key, cs.map((c, i) => (c ? `${c} ${I[i].emoji}` : '')).filter(Boolean).join(' + '))
      const list = [...plans, key]
      setPlans(list)
      if (list.length >= level.goal) api.complete(`Kart tam ${tl(level.budget)} harcandı. ${list.length} farklı plan buldun!`)
      else api.nudge(`Kart sıfırlandı: tam ${tl(level.budget)}! Şimdi “Yeni kart”a bas ve başka bir plan yap.`, { tone: 'ok' })
    } else if (b > 0 && b < cheapest) {
      api.nudge(`Kartta ${tl(b)} kaldı ama en ucuz oyuncak ${tl(cheapest)}. Bu para boşa gidecek! Bir bileti çıkarıp başka bir oyuncak dener misin?`, { tool: true })
    }
  }

  const ride = (i: number) => {
    if (bal === 0) return api.nudge('Kart bitti! Yeni bir plan için “Yeni kart”a bas.')
    if (I[i].price > bal) return api.nudge(`Kartta ${tl(bal)} kaldı; ${I[i].name} ${tl(I[i].price)}. Yetmiyor! Daha ucuz bir oyuncak var mı?`)
    const cs = counts.map((c, j) => (j === i ? c + 1 : c))
    seq.push(I[i].price)
    setCounts(cs)
    setBump({ i, n: Math.random() })
    check(cs)
  }
  const unride = (i: number) => {
    if (counts[i] === 0) return
    const cs = counts.map((c, j) => (j === i ? c - 1 : c))
    const k = seq.lastIndexOf(I[i].price)
    if (k >= 0) seq.splice(k, 1)
    setCounts(cs)
    api.nudge(null)
  }
  const fresh = () => {
    setCounts(I.map(() => 0))
    seq.length = 0
    api.nudge(null)
  }

  const chain = seq.length ? `${level.budget} − ${seq.join(' − ')} = ${bal}` : `${level.budget}`
  const scene = (
    <div className="relative">
      <ParkSvg label="Lunapark oyuncakları ve fiyatları" tent={false} />
      <div className="absolute inset-x-[3%] bottom-[5%] grid grid-cols-3 gap-[2.5%]">
        {I.map((it, i) => (
          <button key={it.id} type="button" onClick={() => ride(i)} className="relative flex min-h-14 flex-col items-center rounded-[1.4rem] bg-white/95 px-1 pt-2 pb-2 shadow-[0_6px_0_rgb(0_0_0/.12)] ring-4 transition active:translate-y-1 active:shadow-none" style={{ '--tw-ring-color': it.color } as CSSProperties} aria-label={`${it.name}, ${it.price} TL. Bin.`}>
            <span key={bump?.i === i ? bump.n : 0} className="text-[clamp(34px,8vw,72px)] leading-none animate-pop" aria-hidden>{it.emoji}</span>
            <span className="mt-1 text-[clamp(11px,1.9vw,17px)] leading-tight font-black text-ink">{it.name}</span>
            <span className="mt-1 rounded-full px-2.5 py-0.5 text-[clamp(13px,2.2vw,20px)] font-black text-white tabular-nums" style={{ background: it.color }}>{tl(it.price)}</span>
            {counts[i] > 0 && <span className="absolute -top-3 -right-2 grid size-9 place-items-center rounded-full bg-fuchsia-600 text-base font-black text-white ring-4 ring-white animate-pop">×{counts[i]}</span>}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute top-[6%] left-[3%] w-[44%] rounded-2xl bg-[linear-gradient(135deg,#a21caf,#db2777)] p-[2%] text-white shadow-lg ring-2 ring-white/60">
        <p className="text-[clamp(10px,1.7vw,15px)] font-black opacity-90">🎟️ LUNAPARK KARTI</p>
        <p className="text-[clamp(20px,4.4vw,42px)] leading-none font-black tabular-nums">{tl(bal)}</p>
        <p className="mt-1 h-[0.4rem] overflow-hidden rounded-full bg-white/30"><span className="block h-full rounded-full bg-yellow-300 transition-all" style={{ width: `${(bal / level.budget) * 100}%` }} /></p>
      </div>
    </div>
  )

  const controls = (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="text-xs font-black tracking-wide text-ink-soft uppercase">Karttaki para</p>
        <p className="text-lg font-black break-words tabular-nums">{chain} TL</p>
      </div>
      <div className="rounded-2xl bg-white/95 p-2 ring-1 ring-line">
        {I.map((it, i) => (
          <div key={it.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-0">
            <p className="min-w-0 text-[15px] leading-tight font-black"><span className="mr-1 text-xl">{it.emoji}</span>{it.name}<span className="block text-sm font-bold text-ink-soft">{tl(it.price)}</span></p>
            <MiniStep label={it.name} value={counts[i]} onMinus={() => unride(i)} onPlus={() => ride(i)} big={api.big} />
          </div>
        ))}
      </div>
      {spent > 0 && <button type="button" onClick={fresh} className={`btn-ghost ${api.big ? 'min-h-14' : 'min-h-12'}`}>🎟️ Yeni kart ({tl(level.budget)})</button>}
    </div>
  )
  return <Shell scene={scene} controls={controls} />
}
