import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { Check, Eraser, Play, RotateCcw, Rocket, X } from 'lucide-react'
import type { Grade } from '../../../data/types'
import { MathText } from '../../../components/MathText'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { BigButton, SolutionList } from '../../kit2'
import { AllocBar } from './AllocBar'
import { MODS, ModuleArt, Astronaut, type Mod } from './art'
import { BaseGrid } from './BaseGrid'
import { BarBuilder, LevelChart, PropPlot, SERIES, Screen, SimChart, ThermoLine, type Series } from './charts'
import type { Ask, Mission, Plan } from './missions'
import { ColonyScene, ThermoScene } from './scene'
import { simulate, type SimResult } from './sim'
import { card, SoftButton, Stat } from './ui'
import { fmt, near, suffix } from './util'

export interface Core {
  grade: Grade
  dark: boolean
  locked: boolean
  say: (text: string, tone?: 'ok' | 'think') => void
  fail: (text: string, mis?: string) => void
  built: (text: string, asks: Ask[], extra?: { modules?: number; pop?: number }) => void
  addSolution: (key: string, label: string) => boolean
  solutions: { key: string; label: string }[]
  render: (stage: ReactNode, controls: ReactNode) => ReactElement
}

type M<K extends Mission['kind']> = Extract<Mission, { kind: K }>

const planOf = (segs: Mod[], v: number[]): Plan => Object.fromEntries(segs.map((s, i) => [s, v[i]])) as Plan

function Solutions({ core, goal }: { core: Core; goal: number }) {
  return <div className="text-ink [&>div]:mt-0"><SolutionList list={core.solutions} goal={goal} /></div>
}

// ───────────────────────── Izgara: modül yerleştirme ─────────────────────────

export function GridView({ m, core }: { m: M<'grid'>; core: Core }) {
  const [cells, setCells] = useState<(Mod | null)[]>(() => Array(m.cols * m.rows).fill(null))
  const [tool, setTool] = useState<Mod | 'sil'>(m.palette[0])
  const [est, setEst] = useState<number | null>(m.estimate ? null : -1)
  const counts = useMemo(() => {
    const c = Object.fromEntries((Object.keys(MODS) as Mod[]).map((k) => [k, 0])) as Record<Mod, number>
    for (const x of cells) if (x) c[x]++
    return c
  }, [cells])
  const filled = cells.filter(Boolean).length
  const meterVal = m.meter ? counts[m.meter.mod] * m.meter.per : 0
  const ready = est !== null

  const check = () => {
    const extra = (Object.keys(counts) as Mod[]).some((k) => counts[k] > 0 && !(k in m.targets))
    const ok = !extra && (Object.keys(m.targets) as Mod[]).every((k) => counts[k] === m.targets[k])
    if (ok) {
      const estNote = m.estimate && est !== null && est >= 0 ? (est === m.estimate.correct ? ' Tahminin de isabetliydi!' : ` Tahminin “${m.estimate.options[est]}” idi; şimdi nedenini biliyorsun.`) : ''
      core.built(m.okText + estNote, m.asks, { modules: filled })
      return
    }
    const d = m.diag(counts)
    core.fail(d?.msg ?? 'Planı tablodaki kesirlerle bir daha karşılaştır.', d?.mis)
  }

  const stage = (
    <ZoomBox maxScale={3}>
      <BaseGrid cols={m.cols} rows={m.rows} cells={cells} tool={tool} onChange={setCells} locked={core.locked || !ready} dark={core.dark} />
    </ZoomBox>
  )

  const controls = (
    <>
      {m.estimate && est === null && (
        <div className={`${card} animate-fade-up`}>
          <p className="mb-2 text-sm font-black text-amber-200">{m.estimate.q}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {m.estimate.options.map((o, i) => (
              <button key={o} type="button" onClick={() => { setEst(i); core.say('Tahminini not ettim. Şimdi panelleri yerleştir ve üretimi izle.', 'ok') }} className="min-h-12 rounded-xl bg-amber-400/15 px-3 font-extrabold text-amber-100 ring-1 ring-amber-300/40 active:scale-95">{o}</button>
            ))}
          </div>
        </div>
      )}
      {ready && (
        <>
          <div className={card}>
            <p className="mb-2 text-[11px] font-black tracking-wide text-slate-400 uppercase">Modül seç</p>
            <div className="flex flex-wrap gap-2">
              {m.palette.map((p) => (
                <button key={p} type="button" onClick={() => setTool(p)} aria-pressed={tool === p} disabled={core.locked} className={`flex min-h-14 items-center gap-2 rounded-2xl py-1 pr-3 pl-1 text-left font-extrabold ring-2 transition active:scale-95 ${tool === p ? 'bg-white/15 ring-amber-300' : 'bg-slate-800 ring-white/10'}`}>
                  <svg viewBox="0 0 100 100" className="size-11 shrink-0" aria-hidden><ModuleArt mod={p} x={0} y={0} s={100} pop={false} /></svg>
                  <span className="leading-tight">
                    <span className="block text-sm text-white">{MODS[p].name}</span>
                    <span className="block text-xs text-slate-300 tabular-nums">{counts[p]} parsel</span>
                  </span>
                </button>
              ))}
              <button type="button" onClick={() => setTool('sil')} aria-pressed={tool === 'sil'} disabled={core.locked} className={`flex min-h-14 items-center gap-2 rounded-2xl px-3 font-extrabold ring-2 transition active:scale-95 ${tool === 'sil' ? 'bg-white/15 ring-amber-300' : 'bg-slate-800 ring-white/10'}`}>
                <Eraser size={20} />Sil
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Dolu parsel" value={`${filled} / ${cells.length}`} tone="violet" />
            {m.meter ? (
              <Stat label="Üretim" value={`${fmt(meterVal)} ${m.meter.unit}`} tone={near(meterVal, m.meter.target) ? 'green' : meterVal > m.meter.target ? 'red' : 'amber'} />
            ) : (
              <Stat label="Boş parsel" value={cells.length - filled} />
            )}
          </div>
          {m.meter && (
            <div className="-mt-1 h-3 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10" aria-hidden>
              <div className={`h-full rounded-full transition-all ${meterVal > m.meter.target ? 'bg-rose-400' : 'bg-gradient-to-r from-amber-400 to-emerald-400'}`} style={{ width: `${Math.min(100, (meterVal / m.meter.target) * 100)}%` }} />
            </div>
          )}
          {!core.locked && (
            <div className="flex gap-2">
              <SoftButton onClick={() => setCells(Array(m.cols * m.rows).fill(null))}><RotateCcw size={18} />Temizle</SoftButton>
              <BigButton onClick={check} className="flex-1"><Check size={20} strokeWidth={3} />Planı kontrol et</BigButton>
            </div>
          )}
        </>
      )}
    </>
  )
  return core.render(stage, controls)
}

// ───────────────────────── Kaynak paylaştırma ─────────────────────────

export function AllocView({ m, core }: { m: M<'alloc'>; core: Core }) {
  const [v, setV] = useState<number[]>(() => m.segs.map(() => 0))
  const [marks, setMarks] = useState<(boolean | null)[]>(() => m.rules.map(() => null))
  const pool = m.units - v.reduce((a, b) => a + b, 0)
  const change = (nv: number[]) => {
    setV(nv)
    setMarks(m.rules.map(() => null))
  }
  const check = () => {
    if (pool > 0) return core.say(`Boşta ${pool} blok kaldı. Önce ${m.resource} tamamını paylaştır.`)
    const p = planOf(m.segs, v)
    const res = m.rules.map((r) => r.test(p))
    setMarks(res)
    const bad = res.findIndex((x) => !x)
    if (bad >= 0) {
      const r = m.rules[bad]
      const d = r.diag?.(p)
      return core.fail(d?.msg ?? `Bu kural tutmuyor: “${r.text}” Hangi modülün bloklarını değiştirmelisin?`, d?.mis)
    }
    const isNew = core.addSolution(v.join('-'), m.solLabel(p))
    if (!isNew) return core.say('Bu planı zaten buldun. Birkaç bloğu başka bir modüle kaydırarak farklı bir plan dene.')
    const n = core.solutions.length + 1
    if (n >= m.goal) core.built(`Harika, ${n} farklı plan! Kurallar tek bir planı zorunlu kılmıyor; bu yüzden birden çok doğru plan var.`, m.asks(p))
    else core.say('Plan kurallara uyuyor! Şimdi blokları kaydırarak farklı bir plan bul.', 'ok')
  }

  const stage = (
    <>
      <ColonyScene segs={m.segs} plan={v} units={m.units} source="enerji" dark={core.dark} />
      <div className={card}>
        <p className="mb-2 text-[11px] font-black tracking-wide text-slate-400 uppercase">{m.resource} · tutamaçları sürükle ya da −/+ kullan</p>
        <AllocBar segs={m.segs} value={v} units={m.units} label={m.label} onChange={change} locked={core.locked} onNoPool={() => core.say('Boşta blok kalmadı. Önce başka bir modülün bloğunu azalt.')} />
      </div>
    </>
  )
  const controls = (
    <>
      <div className={card}>
        <p className="mb-2 text-[11px] font-black tracking-wide text-slate-400 uppercase">Koloni kuralları</p>
        <ul className="space-y-1.5">
          {m.rules.map((r, i) => (
            <li key={r.text} className={`flex items-start gap-2 rounded-xl px-2 py-1.5 text-[15px] font-bold ${marks[i] === true ? 'bg-emerald-500/15 text-emerald-100' : marks[i] === false ? 'bg-amber-500/20 text-amber-100' : 'text-slate-100'}`}>
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${marks[i] === true ? 'bg-emerald-500' : marks[i] === false ? 'bg-amber-500' : 'bg-slate-700'}`}>
                {marks[i] === true ? <Check size={13} strokeWidth={3} /> : marks[i] === false ? <X size={13} strokeWidth={3} /> : null}
              </span>
              <MathText text={r.text} />
            </li>
          ))}
        </ul>
      </div>
      {!core.locked && <BigButton onClick={check} className="w-full"><Check size={20} strokeWidth={3} />Planı onayla</BigButton>}
      <Solutions core={core} goal={m.goal} />
    </>
  )
  return core.render(stage, controls)
}

// ───────────────────────── Simülasyon ─────────────────────────

export function SimView({ m, core }: { m: M<'sim'>; core: Core }) {
  const [v, setV] = useState<number[]>(() => m.segs.map(() => 0))
  const [run, setRun] = useState<SimResult | null>(null)
  const [shown, setShown] = useState(0)
  const [series, setSeries] = useState<Series>(m.cfg.temps ? 'inside' : 'o2')
  const [tries, setTries] = useState(0)
  const timer = useRef<number | null>(null)
  const pool = m.units - v.reduce((a, b) => a + b, 0)
  const running = run !== null && shown < run.rows.length - 1

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const finish = (r: SimResult, plan: number[]) => {
    const last = r.rows[r.rows.length - 1]
    if (r.fail) {
      setSeries(r.fail.why === 'o2low' || r.fail.why === 'o2high' ? 'o2' : r.fail.why === 'food' ? 'food' : r.fail.why === 'cold' ? 'inside' : 'pop')
      return core.say(`${r.fail.text} Grafiğe bak ve payları değiştir.`)
    }
    if (m.minPop && last.pop < m.minPop) {
      setSeries('pop')
      return core.say(`Koloni 10 sol dayandı ama nüfus ${last.pop} kişide kaldı. En az ${m.minPop} kişi olmalı: yeni kâşifler için yiyecek ve yaşam payı yetiyor mu?`)
    }
    const p = planOf(m.segs, plan)
    const lbl = m.segs.map((s, i) => `${MODS[s].emoji}${m.label(plan[i]).replace(/\[\[(\d+)\/(\d+)\]\]/, '$1/$2')}`).join(' ')
    const isNew = core.addSolution(plan.join('-'), lbl)
    if (!isNew) return core.say('Bu planı zaten denedin; koloni yine sağlıklı. Farklı bir plan bul!')
    const n = core.solutions.length + 1
    if (n >= m.goal) core.built(`Harika! ${n} farklı plan da koloniyi 10 sol boyunca yaşattı (nüfus ${last.pop}). Planları karşılaştır: hangisi daha çok kâşif barındırdı?`, m.asks(p, r), { pop: last.pop })
    else core.say(`Koloni 10 sol boyunca sağlıklı kaldı, nüfus ${last.pop} oldu! Şimdi farklı bir plan dene.`, 'ok')
  }

  const start = () => {
    if (pool > 0) return core.say(`Boşta ${pool} blok kaldı. Önce ${m.resource} tamamını paylaştır.`)
    const r = simulate(planOf(m.segs, v), m.cfg)
    const plan = [...v]
    setRun(r)
    setShown(0)
    setTries((t) => t + 1)
    if (timer.current) window.clearInterval(timer.current)
    let k = 0
    timer.current = window.setInterval(() => {
      k++
      setShown(k)
      if (k >= r.rows.length - 1) {
        window.clearInterval(timer.current!)
        timer.current = null
        finish(r, plan)
      }
    }, 260)
  }

  const rows = run ? run.rows.slice(0, shown + 1) : []
  const cur = rows[rows.length - 1]
  const failNow = run?.fail && shown >= run.rows.length - 1 ? run.fail.sol : undefined
  const perPerson = cur ? ((m.segs.includes('yasam') ? v[m.segs.indexOf('yasam')] : 0) * m.unitValue) / cur.pop : 0
  const hud = cur
    ? [
        { label: 'Sol', value: `${cur.sol} / ${m.cfg.sols}` },
        { label: 'Oksijen', value: `%${fmt(cur.o2, 1)}`, tone: (cur.o2 < 19 || cur.o2 > 23 ? 'bad' : 'ok') as 'bad' | 'ok' },
        { label: 'Yiyecek', value: `${fmt(cur.food, 1)} kg`, tone: (cur.food < 0 ? 'bad' : 'ok') as 'bad' | 'ok' },
        ...(cur.inside !== undefined ? [{ label: 'Üs içi', value: `${fmt(cur.inside, 1)} °C`, tone: (cur.inside < 15 ? 'bad' : 'ok') as 'bad' | 'ok' }] : []),
      ]
    : undefined
  const temp = m.cfg.temps && cur && cur.sol > 0 ? m.cfg.temps[cur.sol - 1] : undefined

  const stage = (
    <>
      <ColonyScene segs={m.segs} plan={v} units={m.units} source={m.unit === 'L' ? 'su' : 'enerji'} pop={cur?.pop ?? m.cfg.p0} hud={hud} alarm={failNow !== undefined} dark={core.dark} temp={temp} />
      <div className={card}>
        <p className="mb-2 text-[11px] font-black tracking-wide text-slate-400 uppercase">{m.resource} · {m.units} blok{m.unit === 'kWh' && m.units === 20 ? ' (her blok %5 = 15 kWh)' : m.units === 20 ? ' (her blok %5)' : ''}</p>
        <AllocBar segs={m.segs} value={v} units={m.units} label={m.label} onChange={(nv) => { setV(nv) }} locked={core.locked || running} onNoPool={() => core.say('Boşta blok kalmadı. Önce başka bir modülün bloğunu azalt.')} />
        {!core.locked && (
          <BigButton onClick={start} disabled={running} className="mt-3 w-full"><Play size={20} fill="currentColor" />{tries ? 'Yeniden simüle et' : '10 sol simüle et'}</BigButton>
        )}
      </div>
      <Screen title="Koloni verisi" right={cur ? <span className="text-[11px] font-black text-slate-400">{cur.pop} kişi · kişi başı {fmt(perPerson, 1)} {m.unit}</span> : undefined}>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {(Object.keys(SERIES) as Series[]).filter((s) => s !== 'inside' || m.cfg.temps).map((s) => (
            <button key={s} type="button" onClick={() => setSeries(s)} aria-pressed={series === s} className={`min-h-10 rounded-xl px-2.5 text-xs font-black ring-1 transition ${series === s ? 'bg-cyan-400 text-slate-950 ring-cyan-300' : 'bg-slate-800 text-slate-200 ring-white/10'}`}>{SERIES[s].label}</button>
          ))}
        </div>
        {run ? (
          <SimChart rows={rows} series={series} sols={m.cfg.sols} fail={failNow} />
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl bg-slate-900/80 text-center text-sm font-bold text-slate-400">
            <span><Rocket className="mx-auto mb-1 text-cyan-300" size={26} />Planını kur ve simülasyonu başlat.<br />Grafik burada çizilecek.</span>
          </div>
        )}
      </Screen>
    </>
  )
  const controls = (
    <>
      {m.cfg.temps && (
        <div className={card}>
          <p className="mb-1.5 text-[11px] font-black tracking-wide text-slate-400 uppercase">Gece dış sıcaklıkları (°C)</p>
          <div className="grid grid-cols-5 gap-1 text-center tabular-nums">
            {m.cfg.temps.map((t, i) => (
              <div key={i} className={`rounded-lg py-1 ${cur && cur.sol === i + 1 ? 'bg-sky-400/30 ring-1 ring-sky-300' : 'bg-slate-800'}`}>
                <p className="text-[10px] font-black text-slate-400">{i + 1}. sol</p>
                <p className="text-sm font-black text-sky-100">{fmt(t)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <Solutions core={core} goal={m.goal} />
    </>
  )
  return core.render(stage, controls)
}

// ───────────────────────── Kesir karşılaştırma ─────────────────────────

export function CompareView({ m, core }: { m: M<'compare'>; core: Core }) {
  const [shade, setShade] = useState(() => m.bars.map(() => 0))
  const tap = (b: number, i: number) => {
    if (core.locked) return
    setShade((s) => s.map((x, j) => (j === b ? (x === i + 1 ? i : i + 1) : x)))
  }
  const check = () => {
    const bad = m.bars.findIndex((b, i) => shade[i] !== b.num)
    if (bad < 0) return core.built('Modeller hazır! İki depo aynı uzunlukta, çünkü ikisinde de 40 L su var.', m.asks)
    const b = m.bars[bad]
    core.fail(shade[bad] === b.den - b.num ? `${b.name}: boyalı ${shade[bad]} parça, boş ${b.num} parça. [[${b.num}/${b.den}]] için kaç parçayı boyamalısın?` : `${b.name} suyun [[${b.num}/${b.den}]] kadarını veriyor. Depo ${b.den} eş parça; kaç parçayı boyamalısın?`)
  }
  const stage = (
    <ZoomBox maxScale={3}>
      <div className="space-y-5 rounded-[22px] bg-slate-950/60 p-4 ring-1 ring-white/10 sm:p-6">
        {m.bars.map((b, bi) => (
          <div key={b.name}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-lg font-black text-white"><span className="size-4 rounded-full" style={{ background: b.color }} />{b.name}</p>
              <p className="rounded-xl bg-slate-800 px-3 py-1 text-lg font-black text-white tabular-nums"><MathText text={`Seraya: [[${shade[bi]}/${b.den}]]`} /></p>
            </div>
            <div className="relative flex h-20 overflow-hidden rounded-2xl ring-2 ring-white/30" data-handle>
              {Array.from({ length: b.den }, (_, i) => (
                <button key={i} type="button" onClick={() => tap(bi, i)} aria-label={`${b.name}: ${i + 1}. parça`} className="relative h-full flex-1 border-r-2 border-slate-950/50 transition-colors last:border-r-0" style={{ background: i < shade[bi] ? `linear-gradient(180deg, ${b.color}, ${b.color}cc)` : 'linear-gradient(180deg,#0e7490,#155e75)' }}>
                  {i < shade[bi] && <span className="text-xl" aria-hidden>🌱</span>}
                  {i >= shade[bi] && <span className="absolute inset-x-0 bottom-0 h-2/3 bg-cyan-300/25" aria-hidden />}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs font-black text-slate-400"><span>0 L</span><span>{m.total} {m.unit}</span></div>
          </div>
        ))}
        <p className="text-center text-sm font-bold text-slate-300">Bir parçaya dokununca o parçaya kadar boyanır. Tekrar dokun: bir azalır.</p>
      </div>
    </ZoomBox>
  )
  const controls = !core.locked ? <BigButton onClick={check} className="w-full"><Check size={20} strokeWidth={3} />Modelleri kontrol et</BigButton> : null
  return core.render(stage, controls)
}

// ───────────────────────── Sütun grafiği ─────────────────────────

export function ChartView({ m, core }: { m: M<'chart'>; core: Core }) {
  const [vals, setVals] = useState(() => m.data.map(() => 0))
  const check = () => {
    const bad = vals.findIndex((x, i) => x !== m.data[i])
    if (bad < 0) return core.built(m.okText, m.asks)
    core.fail(`${m.names[bad]}${suffix(bad + 1, 'gen')} sütunu ${vals[bad]} ${m.unit} gösteriyor; tabloda kaç ${m.unit} yazıyor?`)
  }
  const stage = (
    <Screen title="Sera üretim grafiği">
      <BarBuilder values={vals} onChange={setVals} max={m.max} unit={m.unit} locked={core.locked} names={m.names} />
    </Screen>
  )
  const controls = (
    <>
      <div className={card}>
        <p className="mb-2 text-[11px] font-black tracking-wide text-slate-400 uppercase">Bir soldaki ürün</p>
        <table className="w-full text-center text-base font-bold tabular-nums">
          <thead><tr className="text-xs text-slate-400"><th className="py-1 text-left">Sera</th><th>Ürün</th><th>Grafikte</th></tr></thead>
          <tbody>
            {m.names.map((n, i) => (
              <tr key={n} className="border-t border-white/10">
                <td className="py-1.5 text-left">{n}</td>
                <td>{m.data[i]} {m.unit}</td>
                <td className={vals[i] === m.data[i] ? 'text-emerald-300' : 'text-slate-400'}>{vals[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!core.locked && <BigButton onClick={check} className="w-full"><Check size={20} strokeWidth={3} />Grafiği kontrol et</BigButton>}
    </>
  )
  return core.render(stage, controls)
}

// ───────────────────────── Ortalama (dengeleme) ─────────────────────────

function Seesaw({ tilt }: { tilt: number }) {
  // tilt > 0 → fazlalar ağır (sol aşağı)
  const a = Math.max(-14, Math.min(14, tilt))
  return (
    <svg viewBox="0 0 220 90" className="mx-auto block h-24 w-full max-w-[280px]" aria-hidden>
      <path d="M100 82 L120 82 L110 56 Z" fill="#94a3b8" />
      <g transform={`rotate(${-a} 110 56)`} style={{ transition: 'transform .3s' }}>
        <rect x={20} y={52} width={180} height={7} rx={3.5} fill="#e2e8f0" />
        <rect x={26} y={30} width={44} height={22} rx={6} fill="#22c55e" />
        <text x={48} y={46} textAnchor="middle" fontSize={11} fontWeight={900} fill="#052e16">FAZLA</text>
        <rect x={150} y={30} width={44} height={22} rx={6} fill="#f59e0b" opacity={0.6} stroke="#fbbf24" strokeDasharray="4 3" />
        <text x={172} y={46} textAnchor="middle" fontSize={11} fontWeight={900} fill="#451a03">EKSİK</text>
      </g>
    </svg>
  )
}

export function MeanView({ m, core }: { m: M<'mean'>; core: Core }) {
  const [line, setLine] = useState(m.start)
  const mean = m.values.reduce((a, b) => a + b, 0) / m.values.length
  const neg = m.values.every((x) => x <= 0)
  // fazla: çizgiyi sıfırdan uzağa doğru aşan kısımlar; eksik: çizgiye ulaşmayan kısımlar
  const extra = m.values.reduce((s, x) => s + Math.max(0, neg ? line - x : x - line), 0)
  const lack = m.values.reduce((s, x) => s + Math.max(0, neg ? x - line : line - x), 0)
  const check = () => {
    if (near(line, mean)) return core.built(m.okText, m.asks)
    core.fail(extra > lack ? 'Terazi “fazla” yana eğik: taşan parçalar boşluklardan büyük. Çizgiyi taşan parçalara doğru kaydırınca ne olur?' : 'Terazi “eksik” yana eğik: boşluklar taşan parçalardan büyük. Çizgiyi boşluklar küçülecek yöne kaydır.')
  }
  const stage = (
    <Screen title={neg ? 'Gece sıcaklıkları' : 'Su üretimi'} right={<span className="text-[11px] font-black text-orange-300">çizgi: {fmt(line)} {m.unit}</span>}>
      <LevelChart values={m.values} line={line} onLine={setLine} step={m.step} unit={m.unit} locked={core.locked} yRange={m.yRange} />
    </Screen>
  )
  const controls = (
    <>
      <div className={card}>
        <p className="text-[11px] font-black tracking-wide text-slate-400 uppercase">Denge terazisi</p>
        <Seesaw tilt={(extra - lack) * 2.2} />
        <p className="text-center text-sm font-bold text-slate-300">{near(extra, lack) ? 'Terazi dengede!' : extra > lack ? 'Taşan parçalar ağır basıyor.' : 'Boşluklar ağır basıyor.'}</p>
      </div>
      <div className={card}>
        <p className="mb-1 text-[11px] font-black tracking-wide text-slate-400 uppercase">Ölçümler</p>
        <p className="flex flex-wrap gap-1.5 text-sm font-black tabular-nums">{m.values.map((x, i) => <span key={i} className="rounded-lg bg-slate-800 px-2 py-1">{i + 1}. sol: {fmt(x)} {m.unit}</span>)}</p>
      </div>
      {!core.locked && <BigButton onClick={check} className="w-full"><Check size={20} strokeWidth={3} />Dengeledim</BigButton>}
    </>
  )
  return core.render(stage, controls)
}

// ───────────────────────── Kişi başına su (oran) ─────────────────────────

function ShareCard({ c, x, onX, locked, step }: { c: { name: string; color: string; people: number; water: number }; x: number; onX: (v: number) => void; locked: boolean; step: number }) {
  const used = c.people * x
  const left = c.water - used
  const level = Math.max(0, left / c.water)
  return (
    <div className="rounded-[22px] bg-slate-950/60 p-3 ring-1 ring-white/10">
      <p className="mb-2 flex items-center gap-2 text-lg font-black text-white"><span className="size-4 rounded-full" style={{ background: c.color }} />{c.name}</p>
      <div className="flex items-end gap-3">
        <svg viewBox="0 0 70 120" className="h-32 w-16 shrink-0" aria-label={`Depo: ${c.water} L`}>
          <rect x={5} y={5} width={60} height={110} rx={12} fill="#0f172a" stroke="#67e8f9" strokeWidth={3} />
          <rect x={9} y={9 + 102 * (1 - level)} width={52} height={102 * level} rx={9} fill="#22d3ee" opacity={0.85} style={{ transition: 'all .25s' }} />
          <text x={35} y={22} textAnchor="middle" fontSize={12} fontWeight={900} fill="#ecfeff">{c.water} L</text>
        </svg>
        <div className="grid flex-1 grid-cols-4 gap-1">
          {Array.from({ length: c.people }, (_, i) => (
            <svg key={i} viewBox="-12 -20 24 36" className="h-11 w-full" aria-hidden>
              <Astronaut x={-3} y={4} s={1} i={i} />
              <rect x={5} y={-2} width={7} height={10} rx={1.5} fill="#0f172a" stroke="#67e8f9" strokeWidth={1} />
              <rect x={6} y={-1 + 8 * (1 - Math.min(1, x / 4))} width={5} height={8 * Math.min(1, x / 4)} fill="#22d3ee" />
            </svg>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={locked || x <= 0} onClick={() => onX(Math.max(0, x - step))} className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-2xl font-black text-white active:scale-95 disabled:opacity-30" aria-label="Payı azalt">−</button>
        <div className="flex-1 text-center">
          <p className="text-[11px] font-black text-slate-400 uppercase">Kişi başına</p>
          <p className="text-2xl font-black text-white tabular-nums">{fmt(x)} L</p>
        </div>
        <button type="button" disabled={locked || x >= 4} onClick={() => onX(Math.min(4, x + step))} className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-2xl font-black text-white active:scale-95 disabled:opacity-30" aria-label="Payı artır">+</button>
      </div>
      <input type="range" min={0} max={4} step={step} value={x} disabled={locked} onChange={(e) => onX(Number(e.target.value))} className="mt-2 h-10 w-full accent-cyan-400" aria-label={`${c.name} kişi başına su`} />
      <p className={`mt-1 rounded-xl px-3 py-1.5 text-center text-sm font-black tabular-nums ${near(left, 0) ? 'bg-emerald-500/20 text-emerald-200' : left < 0 ? 'bg-rose-500/20 text-rose-200' : 'bg-slate-800 text-slate-200'}`}>
        {c.people} kişi × {fmt(x)} L = {fmt(used)} L · {left < -1e-9 ? `${fmt(-left)} L eksik!` : `kalan ${fmt(left)} L`}
      </p>
    </div>
  )
}

export function ShareView({ m, core }: { m: M<'share'>; core: Core }) {
  const [xs, setXs] = useState(() => m.colonies.map(() => 1))
  const check = () => {
    const bad = m.colonies.findIndex((c, i) => !near(c.people * xs[i], c.water))
    if (bad < 0) return core.built('İki depo da tam boşaldı: paylaşım adil! Kişi başına pay, su ÷ kişi sayısıdır.', m.asks)
    const c = m.colonies[bad]
    const left = c.water - c.people * xs[bad]
    core.fail(left > 0 ? `${c.name}de ${fmt(left)} L su arttı. Herkese biraz daha verebilir misin?` : `${c.name}de su yetmedi: ${fmt(-left)} L eksik. Kişi başına payı azalt.`)
  }
  const stage = <div className="grid gap-3 sm:grid-cols-2">{m.colonies.map((c, i) => <ShareCard key={c.name} c={c} x={xs[i]} step={m.step} locked={core.locked} onX={(x) => setXs((s) => s.map((y, j) => (j === i ? x : y)))} />)}</div>
  const controls = !core.locked ? <BigButton onClick={check} className="w-full"><Check size={20} strokeWidth={3} />Paylaşımları kontrol et</BigButton> : null
  return core.render(stage, controls)
}

// ───────────────────────── Sıcaklık doğrusu ─────────────────────────

export function ThermoView({ m, core }: { m: M<'thermo'>; core: Core }) {
  const [vals, setVals] = useState<Record<string, number | null>>(() => Object.fromEntries(m.marks.map((k) => [k.id, null])))
  const [sel, setSel] = useState(m.marks[0].id)
  const [shown, setShownB] = useState(false)
  const set = (id: string, x: number) => !core.locked && setVals((v) => ({ ...v, [id]: Math.max(-95, Math.min(35, x)) }))
  const check = () => {
    const miss = m.marks.find((k) => vals[k.id] !== k.target)
    if (!miss) {
      setShownB(true)
      return core.built('İki nokta da yerinde. Sıfır, iki sıcaklığın arasında kalıyor: biri sıfırın altında, biri üstünde.', m.asks)
    }
    const v = vals[miss.id]
    core.fail(v === null ? `${miss.desc} noktasını henüz koymadın: “${miss.label}” düğmesini seç ve doğruya dokun.` : v === -miss.target ? `${miss.label} noktası ${fmt(v)}’de. ${fmt(miss.target)} sıfırın hangi yanında?` : `${miss.label} noktası şu an ${fmt(v)} °C’de. ${fmt(miss.target)} °C nerede? İki parmakla yakınlaştır: çentikler sıklaşır.`, v === -miss.target ? 'Negatif sayıyı pozitif tarafa yerleştirdi' : undefined)
  }
  const stage = (
    <>
      <ThermoScene out={vals[m.marks[0].id]} ins={vals[m.marks[1].id]} />
      <Screen title="Sıcaklık doğrusu (°C)">
        <ThermoLine marks={m.marks.map((k) => ({ id: k.id, v: vals[k.id], color: k.color, label: k.label }))} onTap={(x) => set(sel, x)} onDrag={set} show={shown} />
      </Screen>
    </>
  )
  const controls = (
    <>
      <div className={card}>
        <p className="mb-2 text-[11px] font-black tracking-wide text-slate-400 uppercase">Yerleştirilecek nokta</p>
        <div className="grid grid-cols-2 gap-2">
          {m.marks.map((k) => (
            <button key={k.id} type="button" disabled={core.locked} onClick={() => setSel(k.id)} aria-pressed={sel === k.id} className={`min-h-14 rounded-2xl px-3 text-left font-black ring-2 transition active:scale-95 ${sel === k.id ? 'bg-white/15 ring-amber-300' : 'bg-slate-800 ring-white/10'}`}>
              <span className="flex items-center gap-2 text-sm text-white"><span className="size-3.5 shrink-0 rounded-full" style={{ background: k.color }} />{k.desc}</span>
              <span className="block text-xl text-white tabular-nums">{fmt(k.target)} °C</span>
              <span className="block text-xs text-slate-400 tabular-nums">{vals[k.id] === null ? 'henüz yerleşmedi' : `doğruda: ${fmt(vals[k.id]!)}`}</span>
            </button>
          ))}
        </div>
      </div>
      {!core.locked && <BigButton onClick={check} className="w-full"><Check size={20} strokeWidth={3} />Noktaları kontrol et</BigButton>}
    </>
  )
  return core.render(stage, controls)
}

// ───────────────────────── Orantı grafiği ─────────────────────────

export function PropView({ m, core }: { m: M<'prop'>; core: Core }) {
  const [plotted, setPlotted] = useState<string[]>([])
  const total = m.sets.reduce((s, x) => s + x.pts.length, 0)
  const tap = (p: { x: number; y: number }) => {
    if (core.locked) return
    let hit: string | null = null
    m.sets.forEach((s, si) => s.pts.forEach(([x, y]) => {
      if (!plotted.includes(`${si}:${x}`) && Math.abs(p.x - x) <= 0.4 && Math.abs(p.y - y) <= 6) hit = `${si}:${x}`
    }))
    if (!hit) {
      const sx = Math.round(p.x), sy = Math.round(p.y / 5) * 5
      return core.say(`(${sx}, ${sy}) civarına dokundun; tabloda böyle bir ölçüm yok. x alan, y oksijen: tablodan bir satır seç ve o noktaya dokun. İki parmakla yakınlaştırabilirsin.`)
    }
    const next = [...plotted, hit as string]
    setPlotted(next)
    if (next.length === total) core.built('Bütün ölçümler grafikte! Her seranın noktaları bir doğru üzerinde. Doğrular y eksenini nerede kesiyor?', m.asks)
  }
  const stage = (
    <Screen title="Sera deneyi: alan – oksijen">
      <PropPlot sets={m.sets} plotted={plotted} onTap={tap} done={core.locked} />
    </Screen>
  )
  const controls = (
    <div className="grid grid-cols-2 gap-2">
      {m.sets.map((s, si) => (
        <div key={s.name} className={card}>
          <p className="mb-1 text-sm font-black" style={{ color: s.color === '#7c3aed' ? '#c4b5fd' : '#86efac' }}>{s.name}</p>
          <table className="w-full text-center text-sm font-bold tabular-nums">
            <thead><tr className="text-[10px] text-slate-400"><th>m²</th><th>L</th><th /></tr></thead>
            <tbody>
              {s.pts.map(([x, y]) => (
                <tr key={x} className="border-t border-white/10">
                  <td className="py-1">{x}</td>
                  <td>{y}</td>
                  <td>{plotted.includes(`${si}:${x}`) ? <Check size={15} className="mx-auto text-emerald-300" strokeWidth={3} /> : <span className="text-slate-600">·</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
  return core.render(stage, controls)
}
