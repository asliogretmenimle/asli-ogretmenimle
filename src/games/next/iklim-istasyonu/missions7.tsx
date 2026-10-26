import { useState } from 'react'
import { Check, ClipboardCheck, RotateCcw, Save, Undo2 } from 'lucide-react'
import { ek } from '../../../lib/generators'
import { CITIES, TurkeyMap, tempColor } from './art'
import { DotPlot, LinePlot, Thermo } from './charts'
import { Ask, Chip, DataTable, EvidenceBoard, Panel, PrimaryBtn, StepBar, ToolBtn, chg, deg, ekS, f, meanOf, medianOf, pick, shuffle, sum, type Api, type Mission, type Opt } from './ui'

/**
 * 7. sınıf — tam sayılar ve sürekli veri: termometrede sıcaklık değişimi (−3 → 5), şehirler arası fark,
 * saatlik ölçümlerde değişim hızı, aykırı değer (ortalama mı ortanca mı), iki şehri ortalama/ortanca/açıklıkla
 * karşılaştırma, trendden tahmin. Koyu “gösterge paneli” görünümü.
 */

const poss = (n: number) => `${n}${ek(n, 'poss', false)}`

/* ───────────── 1. Termometrede yolculuk ───────────── */

function ThermoPath({ api, s, e }: { api: Api; s: number; e: number }) {
  const ink = api.ink
  const [stops, setStops] = useState<number[]>([s])
  const [level, setLevel] = useState(s)
  const [typed, setTyped] = useState(false)
  const [paths, setPaths] = useState<string[]>([])
  const last = stops[stops.length - 1]
  const atEnd = last === e && stops.length > 1
  const register = (st: number[]) => {
    const key = st.join('→')
    if (paths.includes(key)) return api.nudge('Bu yolu zaten buldun. Başka duraklarla dene: örneğin 0’da durmayı ya da tek seferde çıkmayı düşün.', { tone: 'ok' })
    api.found(key, `${st.map((x) => f(x)).join(' → ')}: ${st.slice(1).map((b, k) => `(${chg(b - st[k])})`).join(' + ')} = ${chg(e - s)}`)
    api.strategy(st.includes(0) && st.length > 2 ? '0’ı ara durak yapma' : st.length === 2 ? 'Tek seferde sayma' : 'Parça parça zıplama')
    const next = [...paths, key]
    setPaths(next)
    if (next.length >= 2) {
      api.say(`Farklı yollar, aynı değişim: ${chg(e - s)} °C. Yani ${f(e)} − (${f(s)}) = ${f(e - s)}.`)
      api.complete()
    } else api.say('Bir yol buldun! Şimdi aynı yolculuğu başka duraklarla göster: “Yeni yol”a dokun.')
  }
  const commit = (v: number) => {
    setLevel(v)
    if (v === last) return
    const nx = [...stops, v]
    setStops(nx)
    if (v === e && typed) register(nx)
  }
  const undo = () => {
    if (stops.length <= 1) return
    const nx = stops.slice(0, -1)
    setStops(nx)
    setLevel(nx[nx.length - 1])
  }
  const restart = () => {
    setStops([s])
    setLevel(s)
    api.clear()
  }
  const jumps = stops.slice(1).map((b, k) => b - stops[k])
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:items-start">
      <Panel ink={ink} title="🌡️ Erzurum istasyonu">
        <Thermo ink={ink} lo={-10} hi={10} level={level} stops={stops} marks={[{ v: s, color: '#2563eb', label: `07.00: ${deg(s)}` }, { v: e, color: '#ea580c', label: `12.00: ${deg(e)}` }]} onLevel={atEnd ? undefined : setLevel} onCommit={atEnd ? undefined : commit} />
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <ToolBtn ink={ink} onClick={undo} disabled={stops.length <= 1 || (atEnd && typed)} label="Son zıplamayı geri al"><Undo2 size={16} />Geri al</ToolBtn>
          {typed && <ToolBtn ink={ink} onClick={restart} active={atEnd} label="Yeni yol"><RotateCcw size={16} />Yeni yol</ToolBtn>}
        </div>
      </Panel>
      <div className="grid content-start gap-3">
        <Panel ink={ink} title="🧾 Yolculuk kaydı">
          {jumps.length === 0 ? (
            <p className="text-sm font-bold" style={{ color: ink.soft }}>Pembe tutamacı yukarı sürükle ya da termometrede bir sıcaklığa dokun. Her bırakışta bir zıplama kaydedilir.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-lg font-black tabular-nums" style={{ color: ink.text }}>
              <span>{f(s)}</span>
              {jumps.map((j, k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`rounded-lg px-2 py-0.5 text-sm text-white ${j > 0 ? 'bg-orange-600' : 'bg-blue-600'}`}>{chg(j)}</span>
                  <span>→ {f(stops[k + 1])}</span>
                </span>
              ))}
            </div>
          )}
          {paths.length > 0 && <p className="mt-2 text-xs font-bold" style={{ color: ink.soft }}>Bulunan yollar: {paths.length}</p>}
        </Panel>
        {atEnd && !typed && (
          <Panel ink={ink} className="animate-fade-up">
            <Ask
              api={api}
              q={`${ekS(s, 'abl')} ${ekS(e, 'dat')}: sıcaklık toplam kaç derece değişti? (Artışı +, düşüşü − ile düşün.)`}
              unit="°C"
              neg
              judge={(v) => {
                if (v === e - s) return true
                if (v === s - e) return { q: 'Sıcaklık arttı mı azaldı mı? Termometrede yukarı mı çıktın, aşağı mı indin?', misc: 'Artışı negatif değişim olarak yazdı' }
                if (v === e + s || v === Math.abs(e) - Math.abs(s) || v === Math.abs(s) - Math.abs(e)) return { q: `${ekS(s, 'abl')} 0’a kaç derece çıktın? 0’dan ${ekS(e, 'dat')} kaç derece? Zıplamaları topla.`, misc: 'Negatif sayının işaretini yok saydı (5 − 3 gibi)' }
                return { q: `Zıplama etiketlerini topla: ${jumps.map(chg).join(' + ')} = ?` }
              }}
              onOk={() => { setTyped(true); register(stops) }}
            />
          </Panel>
        )}
        {typed && <div><Chip ink={ink} tone="ok"><Check size={16} />Değişim: {chg(e - s)} °C</Chip></div>}
      </div>
    </div>
  )
}

/* ───────────── 2. Haritada sıcaklık farkı ───────────── */

interface MapData { temps: Record<string, number>; ids: string[]; D: number }

function MapDiff({ api, d }: { api: Api; d: MapData }) {
  const ink = api.ink
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState<string[]>([])
  const [pairs, setPairs] = useState<string[]>([])
  const er = d.temps.erzurum, an = d.temps.antalya
  const toggle = (id: string) => {
    if (step !== 1) return
    api.clear()
    setSel((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]))
  }
  const pair = sel.length === 2 ? [...sel].sort((a, b) => d.temps[a] - d.temps[b]) : null
  const pk = pair ? pair.join('-') : ''
  const pins = d.ids.map((id) => ({ id, t: d.temps[id] }))
  const thermo = step === 0 ? { a: er, b: an, la: `Erzurum ${deg(er)}`, lb: `Antalya ${deg(an)}` } : pair ? { a: d.temps[pair[0]], b: d.temps[pair[1]], la: `${CITIES[pair[0]].name} ${deg(d.temps[pair[0]])}`, lb: `${CITIES[pair[1]].name} ${deg(d.temps[pair[1]])}` } : null
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Erzurum – Antalya', `Farkı ${d.D} °C olan çiftler`]} at={step} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
        <Panel ink={ink} title="🗺️ Ocak sabahı, saat 07.00">
          <TurkeyMap ink={ink} pins={pins} sel={step === 0 ? ['erzurum', 'antalya'] : sel} onPick={step === 1 ? toggle : undefined} />
          {step === 1 && (
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-1.5">
              {d.ids.map((id) => (
                <button key={id} type="button" onClick={() => toggle(id)} aria-pressed={sel.includes(id)} className={`flex min-h-12 items-center justify-between gap-1 rounded-xl px-2.5 text-sm font-extrabold ring-1 transition active:scale-95 ${sel.includes(id) ? 'bg-cyan-500 text-slate-950 ring-cyan-300' : 'bg-slate-800 text-slate-100 ring-slate-600'}`}>
                  <span className="min-w-0 truncate">{CITIES[id].name}</span>
                  <span className="tabular-nums" style={{ color: sel.includes(id) ? undefined : tempColor(d.temps[id]) === '#6d28d9' ? '#c4b5fd' : undefined }}>{f(d.temps[id])}°</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <Panel ink={ink} title="🌡️ Karşılaştır">
          {thermo ? (
            <Thermo ink={ink} lo={-16} hi={12} level={Math.max(thermo.a, thermo.b)} labelEvery={4} marks={[{ v: thermo.a, color: '#4f46e5', label: thermo.la }, { v: thermo.b, color: '#ea580c', label: thermo.lb }]} bracket={[thermo.a, thermo.b]} height={380} />
          ) : (
            <p className="grid min-h-40 place-items-center text-center text-sm font-bold" style={{ color: ink.soft }}>Haritadan ya da listeden iki şehir seç.</p>
          )}
        </Panel>
      </div>
      {step === 0 && (
        <Panel ink={ink}>
          <Ask
            api={api}
            q="Erzurum ile Antalya arasındaki sıcaklık farkı kaç °C?"
            unit="°C"
            neg
            judge={(v) => {
              if (v === an - er) return true
              if (v === er - an) return { q: 'Fark, iki sıcaklık arasındaki uzaklıktır. Termometrede iki işaret arasında kaç derece var? Uzaklık negatif olabilir mi?' }
              if (v === Math.abs(Math.abs(an) - Math.abs(er))) return { q: `Erzurum’dan 0’a kaç derece var? 0’dan Antalya’ya kaç derece? İki parçayı birleştir.`, misc: 'Farkı bulurken negatif sayının işaretini yok saydı' }
              return { q: `${ekS(er, 'abl')} 0’a kaç derece çıkılır? Sonra 0’dan ${ekS(an, 'dat')}?` }
            }}
            onOk={() => { api.strategy('0’ı ara durak yapma'); setStep(1); api.say(`Erzurum ile Antalya arasında ${an - er} derece fark var!`) }}
          />
        </Panel>
      )}
      {step === 1 && pair && (
        <Panel ink={ink} className="animate-fade-up">
          <Ask
            key={pk}
            api={api}
            q={`${CITIES[pair[0]].name} (${deg(d.temps[pair[0]])}) ile ${CITIES[pair[1]].name} (${deg(d.temps[pair[1]])}) arasındaki fark kaç °C?`}
            unit="°C"
            judge={(v) => {
              const df = d.temps[pair[1]] - d.temps[pair[0]]
              if (v === df) return true
              const crosses = d.temps[pair[0]] < 0 && d.temps[pair[1]] > 0
              if (crosses && v === Math.abs(Math.abs(d.temps[pair[1]]) - Math.abs(d.temps[pair[0]]))) return { q: 'Bu iki sıcaklıktan biri 0’ın altında, biri üstünde. Önce 0’a kadar, sonra 0’dan öteye kaç derece var?', misc: 'Farkı bulurken negatif sayının işaretini yok saydı' }
              return { q: 'Termometrede alttaki işaretten üstteki işarete kaç derece var? 0’ı ara durak yapmayı dene.' }
            }}
            onOk={(v) => {
              if (v !== d.D) return api.nudge(`Doğru hesap! Bu çiftin farkı ${v} °C. Hedef ${d.D} °C: daha sıcak ya da daha soğuk bir şehirle dene.`, { tone: 'ok' })
              if (pairs.includes(pk)) return api.nudge('Bu çifti zaten buldun. Başka bir çift ara!', { tone: 'ok' })
              api.found(pk, `${CITIES[pair[0]].name} ↔ ${CITIES[pair[1]].name}: ${d.D} °C`)
              const nx = [...pairs, pk]
              setPairs(nx)
              if (nx.length >= 2) {
                api.say(`İki çift buldun! Farkı ${d.D} °C olan başka çiftler de var mı?`)
                api.complete()
              } else api.say(`Bir çift buldun! Farkı ${d.D} °C olan başka bir çift daha ara.`)
            }}
          />
        </Panel>
      )}
      {step === 1 && pairs.length > 0 && <p className="text-center text-sm font-extrabold" style={{ color: ink.soft }}>Bulunan çiftler: {pairs.map((p) => p.split('-').map((id) => CITIES[id].name).join(' ↔ ')).join(' · ')}</p>}
    </div>
  )
}

function makeMap(): MapData {
  const base: Record<string, number> = { kars: -14, erzurum: -12, van: -7, konya: -4, ankara: -2, diyarbakir: 1, istanbul: 4, trabzon: 6, izmir: 8, antalya: 9 }
  const ids = Object.keys(base)
  for (;;) {
    const temps: Record<string, number> = {}
    ids.forEach((id) => (temps[id] = base[id] + pick([-1, 0, 0, 1])))
    if (new Set(Object.values(temps)).size !== ids.length) continue
    const counts = new Map<number, { n: number; cross: number }>()
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = temps[ids[i]], b = temps[ids[j]]
        if ((ids[i] === 'erzurum' && ids[j] === 'antalya') || (ids[j] === 'erzurum' && ids[i] === 'antalya')) continue
        const dd = Math.abs(a - b)
        const c = counts.get(dd) ?? { n: 0, cross: 0 }
        c.n++
        if (Math.min(a, b) < 0 && Math.max(a, b) > 0) c.cross++
        counts.set(dd, c)
      }
    const ok = [...counts.entries()].filter(([dd, c]) => dd >= 6 && dd <= 16 && c.n >= 3 && c.cross >= 2).map(([dd]) => dd)
    if (ok.length) return { temps, ids, D: pick(ok) }
  }
}

/* ───────────── 3. Saatlik ölçümler: en hızlı ısınma ───────────── */

interface RateData { hours: number[]; temps: number[]; missing: number[] }

const hh = (h: number) => `${String(h).padStart(2, '0')}.00`

function Rates({ api, d }: { api: Api; d: RateData }) {
  const ink = api.ink
  const n = d.hours.length
  const [ys, setYs] = useState<(number)[]>(() => d.temps.map((t, i) => (d.missing.includes(i) ? 0 : t)))
  const [step, setStep] = useState(0)
  const [hl, setHl] = useState<number[]>([])
  const [segState, setSegState] = useState<Record<number, 'ok' | 'no'>>({})
  const ch = d.temps.slice(1).map((t, i) => t - d.temps[i])
  const dt = d.hours.slice(1).map((h, i) => h - d.hours[i])
  const rate = ch.map((c, i) => c / dt[i])
  const fast = rate.indexOf(Math.max(...rate))
  const big = ch.indexOf(Math.max(...ch))
  const check = () => {
    const wrong = d.missing.filter((i) => ys[i] !== d.temps[i])
    setHl(wrong)
    if (wrong.length) {
      api.check(false)
      const i = wrong[0]
      return api.nudge(`${hh(d.hours[i])} noktası ${deg(ys[i])} gösteriyor; tabloda ${deg(d.temps[i])}. 0 çizgisinin ${d.temps[i] < 0 ? 'altında' : 'üstünde'} kaçıncı çizgiye denk geliyor?`, { misc: d.temps[i] < 0 && ys[i] === -d.temps[i] ? 'Negatif değeri eksenin pozitif tarafına yerleştirdi' : undefined })
    }
    api.check(true)
    api.clear()
    setStep(1)
    api.say('Gün boyu sıcaklık çizgisi hazır. Ölçümler arasındaki süreler eşit mi?')
  }
  const tapSeg = (k: number) => {
    if (step !== 1) return
    if (k === fast) {
      api.check(true)
      api.clear()
      setSegState((s) => ({ ...s, [k]: 'ok' }))
      setStep(2)
      return
    }
    api.check(false)
    setSegState((s) => ({ ...s, [k]: 'no' }))
    if (ch[k] <= 0) return api.nudge(`${hh(d.hours[k])}–${hh(d.hours[k + 1])} arasında sıcaklık ${ch[k] < 0 ? 'düştü' : 'değişmedi'}. Isınmanın olduğu parçalara bak.`)
    if (k === big) return api.nudge(`Bu aralıkta sıcaklık ${chg(ch[k])} °C değişti ama kaç saatte? ${dt[k]} saatte ${ch[k]} derece ise 1 saatte kaç derece? Diğer aralıklarla karşılaştır.`, { misc: 'En büyük değişimi en hızlı değişim sandı' })
    api.nudge(`Bu aralıkta ${dt[k]} saatte ${chg(ch[k])} °C. Saatte kaç derece eder? Daha dik bir parça var mı?`)
  }
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Eksik noktalar', 'En hızlı ısınma', 'Saatte kaç °C?']} at={step} />
      <Panel ink={ink} title="📟 Kars istasyonu · bir kış günü ölçümleri">
        <DataTable ink={ink} head={['Saat', ...d.hours.map(hh)]} rows={[['°C', ...d.temps.map((t) => f(t))]]} />
      </Panel>
      <Panel ink={ink}>
        <LinePlot ink={ink} xs={d.hours} xLabels={d.hours.map(hh)} ys={ys} editable={step === 0 ? d.hours.map((_, i) => d.missing.includes(i)) : undefined} onSet={step === 0 ? (i, y) => { setYs((c) => c.map((v, k) => (k === i ? y : v))); setHl((h) => h.filter((x) => x !== i)) } : undefined} view={{ xMin: d.hours[0] - 0.8, xMax: d.hours[n - 1] + 0.8, yMin: -13, yMax: 11 }} yUnit="°C" hlPts={hl} seg={step >= 1 ? { onTap: tapSeg, state: segState } : undefined}
          extra={step >= 3 ? (P) => (
            <g pointerEvents="none">
              {ch.map((c, k) => {
                const x = (P.sx(d.hours[k]) + P.sx(d.hours[k + 1])) / 2
                const y = Math.min(P.sy(d.temps[k]), P.sy(d.temps[k + 1])) - 22
                return (
                  <g key={k} className="animate-fade-up">
                    <rect x={x - 36} y={y - 13} width={72} height={19} rx={6} fill={k === fast ? '#16a34a' : '#1e293b'} opacity={0.92} />
                    <text x={x} y={y + 1} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">{chg(c)} / {dt[k]} sa</text>
                  </g>
                )
              })}
            </g>
          ) : undefined}
        />
        {step === 0 && <div className="mt-2 flex justify-center"><PrimaryBtn onClick={check}><ClipboardCheck size={18} />Noktaları kontrol et</PrimaryBtn></div>}
        {step === 1 && <p className="mt-2 text-center text-base font-black" style={{ color: ink.text }}>Sıcaklık hangi aralıkta en hızlı arttı (saat başına en çok)? Çizginin o parçasına dokun.</p>}
      </Panel>
      {step >= 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <Ask
            api={api}
            q={`${hh(d.hours[fast])}–${hh(d.hours[fast + 1])} arasında sıcaklık saatte kaç °C arttı?`}
            unit="°C/sa"
            dec
            judge={(v) => (Math.abs(v - rate[fast]) < 1e-9 ? true : v === ch[fast] && dt[fast] > 1 ? { q: `${ch[fast]} derece toplam değişim. Bu değişim ${dt[fast]} saatte oldu: 1 saate ne kadar düşer?`, misc: 'Değişim hızını toplam değişimle karıştırdı' } : { q: `${ekS(d.temps[fast], 'abl')} ${ekS(d.temps[fast + 1], 'dat')} kaç derece? Bu kaç saatte oldu?` })}
            onOk={() => { setStep(3); api.say(`En hızlı ısınma: saatte ${f(rate[fast])} °C. En büyük değişim ise ${hh(d.hours[big])}–${hh(d.hours[big + 1])} arasındaydı!`); api.complete() }}
          />
        </Panel>
      )}
    </div>
  )
}

function makeRates(): RateData {
  const t = pick([
    { hours: [6, 8, 11, 12, 15, 18], temps: [-9, -7, -1, 2, 4, -2], missing: [1, 3, 5] },
    { hours: [7, 9, 10, 13, 14, 17], temps: [-6, -4, -1, 5, 7, 1], missing: [0, 2, 4] },
    { hours: [6, 9, 10, 12, 15, 18], temps: [-10, -8, -4, 2, 4, -1], missing: [1, 3, 5] },
  ])
  return t
}

/* ───────────── 4. Aykırı gün: ortalama mı ortanca mı? ───────────── */

const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function Outlier({ api, d }: { api: Api; d: { vals: number[] } }) {
  const ink = api.ink
  const [vals, setVals] = useState(d.vals)
  const [step, setStep] = useState(0)
  const [marker, setMarker] = useState<number | null>(null)
  const [crossed, setCrossed] = useState<number[]>([])
  const [dragged, setDragged] = useState(false)
  const mean0 = meanOf(d.vals), med0 = medianOf(d.vals)
  const outIdx = d.vals.indexOf(Math.max(...d.vals))
  const out = d.vals[outIdx]
  const colder = d.vals.filter((v) => v < mean0).length
  const checkMedian = () => {
    if (marker === null) return api.nudge('Önce mor işareti koy: sayı doğrusuna dokun ya da işareti sürükle.', { tone: 'ok' })
    if (marker === med0) {
      api.check(true)
      api.clear()
      setStep(1)
      api.say(`Ortanca ${deg(med0)}: değerlerin tam ortası.`)
      return
    }
    api.check(false)
    if (Math.abs(marker - mean0) < 0.6) return api.nudge('Bu nokta ortalamaya yakın. Ortanca için değerleri sırala: tam ortadaki değer hangisi?', { misc: 'Ortanca yerine ortalamayı buldu' })
    if (marker === d.vals[3]) return api.nudge('Perşembe tablonun ortasında ama değerler sıralı mı? Sayı doğrusunda noktaları iki uçtan birer birer ele (dokun).', { misc: 'Ortancayı sıralamadan buldu' })
    api.nudge('Noktaları iki uçtan birer birer ele (noktalara dokun). Ortada hangi nokta kalıyor?')
  }
  const [conclusions] = useState<Opt[]>(() =>
    shuffle([
      { t: 'Ortanca daha iyi gösterir: tek bir ılık gün ortalamayı yukarı çekiyor.', ok: true },
      { t: 'Ortalama daha iyi gösterir: çünkü bütün günleri hesaba katar.', ok: false, fb: `Ortalama ${deg(mean0)}. 7 günün kaçı bundan daha soğuk? Ortalama tipik bir günü gösteriyor mu?`, misc: 'Aykırı değerin ortalamayı çektiğini fark etmedi' },
      { t: 'İkisi de aynı şeyi gösterir, fark etmez.', ok: false, fb: `Ortalama ${deg(mean0)}, ortanca ${deg(med0)}. Aynı mı? Ilık günü sürükleyince ikisine ne oluyor?` },
    ]),
  )
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: `7 günün ${poss(colder)} ortalamadan (${deg(mean0)}) daha soğuk.`, ok: true, s: `${colder} gün ortalamanın altında` },
      { t: 'Ilık günü sürükleyince ortalama değişiyor, ortanca neredeyse hiç değişmiyor.', ok: true, s: 'Ortanca aykırı değerden etkilenmiyor' },
      { t: `Ortanca (${deg(med0)}) günlerin çoğuna çok yakın.`, ok: true, s: 'Ortanca çoğunluğa yakın' },
      { t: `Ortalama (${deg(mean0)}) ortancadan büyük; büyük sayı daha doğrudur.`, ok: false, fb: '“Daha büyük” olması, tipik günü daha iyi gösterdiği anlamına mı gelir?', misc: 'Büyük değeri daha doğru sandı' },
      { t: `${deg(out)} ölçülen gün bir ölçüm hatasıdır.`, ok: false, fb: 'Veride bunu gösteren bir bilgi var mı? Aykırı değer hata olmak zorunda değil; lodos gibi gerçek bir olay olabilir.', misc: 'Aykırı değeri doğrudan hata saydı' },
    ]),
  )
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Ortancayı bul', 'Ortalamayı hesapla', 'Hangisi temsil eder?']} at={step} />
      <Panel ink={ink} title="📟 Erzurum · Ocak’ta bir hafta (öğle sıcaklığı)">
        <DataTable ink={ink} head={['Gün', ...WEEK]} rows={[['°C', ...d.vals.map((v) => f(v))]]} />
      </Panel>
      <Panel ink={ink}>
        <DotPlot
          ink={ink}
          values={vals}
          view={[-13, 9]}
          unit="°C"
          marks={step >= 2 ? { mean: true, median: true } : undefined}
          dotState={step === 0 ? Object.fromEntries(crossed.map((i) => [i, 'x'])) : undefined}
          onDot={step === 0 ? (i) => setCrossed((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i])) : undefined}
          marker={step === 0 ? { v: marker, label: 'ortanca?', onChange: (v) => setMarker(Math.round(v)), step: 1 } : undefined}
          dragDot={step >= 2 ? { i: outIdx, min: -12, max: 9, onChange: (v) => { setDragged(true); setVals((c) => c.map((x, k) => (k === outIdx ? v : x))) } } : undefined}
        />
        {step === 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Chip ink={ink} tone="info">Ortanca işaretin: {marker === null ? '—' : deg(marker)}</Chip>
            {crossed.length > 0 && <ToolBtn ink={ink} onClick={() => setCrossed([])}><RotateCcw size={16} />Elemeleri sil</ToolBtn>}
            <PrimaryBtn onClick={checkMedian}><ClipboardCheck size={18} />Kontrol et</PrimaryBtn>
          </div>
        )}
        {step >= 2 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Chip ink={ink} tone="mean">Ortalama: {f(meanOf(vals), 1)} °C</Chip>
            <Chip ink={ink} tone="median">Ortanca: {f(medianOf(vals), 1)} °C</Chip>
            <ToolBtn ink={ink} onClick={() => setVals(d.vals)} label="Başa al"><RotateCcw size={16} />Başa al</ToolBtn>
          </div>
        )}
        {step >= 2 && !dragged && <p className="mt-1 text-center text-xs font-extrabold" style={{ color: ink.soft }}>Turuncu ılık günü sağa sola sürükle: ortalama ve ortanca nasıl değişiyor?</p>}
      </Panel>
      {step === 1 && (
        <Panel ink={ink} className="animate-fade-up">
          <Ask
            api={api}
            q="Bu 7 günün ortalama sıcaklığı kaç °C?"
            unit="°C"
            neg
            dec
            judge={(v) => {
              if (Math.abs(v - mean0) < 1e-9) return true
              if (Math.abs(v + mean0) < 1e-9) return { q: 'Günlerin çoğu 0’ın altında. Toplam negatif mi pozitif mi olur?', misc: 'Negatif sayıların ortalamasında işareti kaybetti' }
              if (v === sum(d.vals)) return { q: `Bu, sıcaklıkların toplamı. 7 güne eşit paylaşınca her güne ne düşer?` }
              if (v === med0) return { q: 'Bu ortanca. Ortalama için bütün değerleri topla ve gün sayısına böl.', misc: 'Ortalama ile ortancayı karıştırdı' }
              return { q: `Önce negatifleri topla, sonra ılık günü ekle. Toplamı 7’ye böl.` }
            }}
            onOk={() => { setStep(2); api.say(`Ortalama ${deg(mean0)}, ortanca ${deg(med0)}. Neden farklılar?`) }}
          />
        </Panel>
      )}
      {step >= 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <EvidenceBoard api={api} keyPrefix="aykiri" question="Bir broşür Erzurum’da “Ocak’ta tipik bir gün” sıcaklığını yazacak. Hangisi daha iyi temsil eder?" conclusions={conclusions} cards={cards} goal={2} onDone={() => { api.strategy('Ortanca ile karşılaştırma'); api.say('Aykırı bir değer varken ortanca, tipik günü daha iyi anlatır.'); api.complete() }} />
        </Panel>
      )}
    </div>
  )
}

function makeOutlier() {
  const t = pick([
    { base: [-8, -6, -7, -5, -9, -6], out: 6 },
    { base: [-10, -7, -8, -6, -9, -8], out: 6 },
    { base: [-4, -6, -5, -7, -3, -5], out: 9 },
  ])
  const vals = shuffle([...t.base, t.out])
  // ortadaki gün (Perşembe) ortanca olmasın: sıralamadan bulma yanılgısı ayırt edilebilsin
  if (vals[3] === medianOf(vals)) {
    const j = vals.findIndex((v) => v !== medianOf(vals))
    ;[vals[3], vals[j]] = [vals[j], vals[3]]
  }
  return { vals }
}

/* ───────────── 5. Kars mı Erzurum mu? ───────────── */

function Compare({ api, d }: { api: Api; d: { kars: number[]; erz: number[] } }) {
  const ink = api.ink
  const [tools, setTools] = useState<string[]>([])
  const mK = meanOf(d.kars), mE = meanOf(d.erz), mdK = medianOf(d.kars), mdE = medianOf(d.erz)
  const rK = Math.max(...d.kars) - Math.min(...d.kars), rE = Math.max(...d.erz) - Math.min(...d.erz)
  const minE = Math.min(...d.erz)
  const below = d.kars.filter((v) => v < minE).length
  const toggle = (t: string, strat: string) => {
    setTools((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))
    if (!tools.includes(t)) api.strategy(strat)
  }
  const [conclusions] = useState<Opt[]>(() =>
    shuffle([
      { t: 'Şubat’ta Kars genelde daha soğuk.', ok: true },
      { t: 'Şubat’ta Erzurum genelde daha soğuk.', ok: false, fb: `${deg(mK)} mi daha soğuk, ${deg(mE)} mi? Termometrede hangisi daha aşağıda?`, misc: 'Negatif sayıları karşılaştırırken mutlak değere baktı' },
      { t: 'İki şehir aynı derecede soğuk.', ok: false, fb: 'Ortalama ya da ortanca araçlarını aç: iki şehrin değerleri aynı yerde mi?' },
    ]),
  )
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: `Kars’ın ortalaması (${deg(mK)}), Erzurum’unkinden (${deg(mE)}) daha düşük.`, ok: true, s: 'Ortalama daha düşük' },
      { t: `Kars’ın ortancası (${deg(mdK)}), Erzurum’unkinden (${deg(mdE)}) daha düşük.`, ok: true, s: 'Ortanca daha düşük' },
      { t: `Kars’ın ${below} günü, Erzurum’un en soğuk gününden (${deg(minE)}) bile daha soğuk.`, ok: true, s: `${below} gün Erzurum’un en soğuğundan soğuk` },
      { t: `Kars’ın açıklığı (${rK}) Erzurum’unkinden (${rE}) büyük.`, ok: false, fb: 'Açıklık, sıcaklıkların ne kadar değiştiğini mi gösterir, yoksa ne kadar soğuk olduğunu mu?', misc: 'Açıklığı merkezî eğilim ölçüsü gibi kullandı' },
      { t: `Kars’ın en ılık günü (${deg(Math.max(...d.kars))}), Erzurum’un en ılık gününden (${deg(Math.max(...d.erz))}) daha ılık.`, ok: false, fb: 'Tek bir ılık gün, şehrin genel durumunu gösterir mi? Değerlerin çoğu nerede toplanmış?' },
    ]),
  )
  const view: [number, number] = [-18, 2]
  return (
    <div className="grid gap-3">
      <Panel ink={ink} title="📟 Şubat’ta 9 gün: sabah sıcaklıkları" right={
        <span className="flex flex-wrap gap-1.5">
          <ToolBtn ink={ink} active={tools.includes('mean')} onClick={() => toggle('mean', 'Ortalama ile karşılaştırma')}><span className="size-3 rounded-full" style={{ background: '#db2777' }} />Ortalama</ToolBtn>
          <ToolBtn ink={ink} active={tools.includes('median')} onClick={() => toggle('median', 'Ortanca ile karşılaştırma')}><span className="size-3 rotate-45" style={{ background: '#0d9488' }} />Ortanca</ToolBtn>
          <ToolBtn ink={ink} active={tools.includes('range')} onClick={() => toggle('range', 'Açıklığa bakma')}>↔ Açıklık</ToolBtn>
        </span>
      }>
        <div className="grid gap-2">
          <DotPlot ink={ink} values={d.kars} view={view} unit="°C" title="Kars" color="#a78bfa" marks={{ mean: tools.includes('mean'), median: tools.includes('median'), range: tools.includes('range') }} />
          <DotPlot ink={ink} values={d.erz} view={view} unit="°C" title="Erzurum" color="#38bdf8" marks={{ mean: tools.includes('mean'), median: tools.includes('median'), range: tools.includes('range') }} />
        </div>
      </Panel>
      <Panel ink={ink}>
        <EvidenceBoard api={api} keyPrefix="karsilastir" question="Şubat’ta hangi şehir daha soğuk? Önce sonucunu seç." conclusions={conclusions} cards={cards} goal={2} cardsTitle="Farklı ölçülerle 2 kanıt bul" onDone={() => { api.say('Güçlü argüman: birden çok ölçü aynı sonucu gösteriyor.'); api.complete() }} />
      </Panel>
    </div>
  )
}

function makeCompare() {
  const k = pick([-1, 0, 1])
  return {
    kars: shuffle([-16, -13, -11, -12, -10, -9, -14, -11, -3]).map((v) => v + k),
    erz: shuffle([-10, -8, -7, -6, -9, -5, -7, -4, -7]).map((v) => v + k),
  }
}

/* ───────────── 6. Temmuz tahmini ───────────── */

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem']

function Trend({ api, d }: { api: Api; d: { t: number[] } }) {
  const ink = api.ink
  const [step, setStep] = useState(0)
  const [july, setJuly] = useState(0)
  const xs = MONTHS.map((_, i) => i + 1)
  const inc = d.t.slice(1).map((v, i) => v - d.t[i])
  const [a, b] = [d.t[2], d.t[3]]
  const save = () => {
    const last = d.t[5]
    if (july > last + 7) {
      api.check(false)
      return api.nudge(`Nisan→Mayıs ${chg(inc[3])}, Mayıs→Haziran ${chg(inc[4])} °C değişti. Haziran→Temmuz artışı bunlardan çok mu büyük olur?`, { misc: 'Trendi abartarak sürdürdü' })
    }
    if (july < last) {
      api.check(false)
      return api.nudge('Ocak’tan beri ortalama sıcaklık her ay artıyor. Temmuz’da birden düşmesi olası mı?')
    }
    api.check(true)
    api.clear()
    setStep(2)
    api.say(`Temmuz tahminin: ${deg(july)}. Şimdi gerekçelendir.`)
  }
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: 'Ocak’tan Haziran’a ortalama sıcaklık her ay arttı.', ok: true, s: 'Her ay arttı' },
      { t: `Artış yavaşlıyor: ${chg(inc[2])}, ${chg(inc[3])}, ${chg(inc[4])} °C.`, ok: true, s: 'Artış yavaşlıyor' },
      { t: 'Çizgiyi son aylardaki eğimle uzatınca Temmuz noktası tahminime yakın geliyor.', ok: true, s: 'Çizgiyi uzattım' },
      { t: `Haziran ${deg(d.t[5])}; Temmuz bunun 2 katı olur.`, ok: false, fb: 'Sıcaklıklar her ay katlanarak mı artıyor, yoksa birkaç derece mi ekleniyor?', misc: 'Değişimi çarpımsal düşündü' },
      { t: `Ocak’tan Haziran’a ${d.t[5] - d.t[0]} derece arttı; Temmuz’da da o kadar artar.`, ok: false, fb: 'Bu artış 1 ayda mı oldu, 5 ayda mı?', misc: 'Toplam değişimi aylık değişim sandı' },
    ]),
  )
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Değişimi hesapla', 'Temmuz’u tahmin et', 'Gerekçelendir']} at={step} />
      <Panel ink={ink} title="📟 Erzurum · aylık ortalama sıcaklık">
        <DataTable ink={ink} head={['Ay', ...MONTHS.slice(0, 6)]} rows={[['°C', ...d.t.map((v) => f(v))]]} />
      </Panel>
      {step === 0 && (
        <Panel ink={ink}>
          <Ask
            api={api}
            q={`Mart’tan (${deg(a)}) Nisan’a (${deg(b)}) ortalama sıcaklık kaç derece değişti?`}
            unit="°C"
            neg
            judge={(v) => {
              if (v === b - a) return true
              if (v === a - b) return { q: 'Sıcaklık arttı mı azaldı mı? Artış + yönünde bir değişimdir.', misc: 'Artışı negatif yazdı' }
              if (v === b + a || v === Math.abs(Math.abs(b) - Math.abs(a))) return { q: `${ekS(a, 'abl')} 0’a kaç derece? 0’dan ${ekS(b, 'dat')} kaç derece?`, misc: 'Negatif sayının işaretini yok saydı' }
              return { q: `Termometrede ${ekS(a, 'abl')} ${ekS(b, 'dat')} kaç derece çıkılır?` }
            }}
            onOk={() => { setStep(1); api.say(`Mart’tan Nisan’a ${chg(b - a)} °C! Şimdi Temmuz’u tahmin et.`) }}
          />
        </Panel>
      )}
      {step >= 1 && (
        <Panel ink={ink} title={step === 1 ? 'Temmuz noktasını sürükle ya da yüksekliğine dokun' : 'Tahminin'} className="animate-fade-up">
          <LinePlot ink={ink} xs={xs} xLabels={MONTHS} ys={[...d.t, july]} dashLast editable={step === 1 ? xs.map((_, i) => i === 6) : undefined} onSet={step === 1 ? (_, y) => setJuly(y) : undefined} view={{ xMin: 0.4, xMax: 7.6, yMin: -14, yMax: 28 }} yUnit="°C" color="#22d3ee" />
          {step === 1 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Chip ink={ink} tone="info">Temmuz tahmini: {deg(july)}</Chip>
              <PrimaryBtn onClick={save}><Save size={18} />Tahmini kaydet</PrimaryBtn>
            </div>
          )}
        </Panel>
      )}
      {step >= 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <EvidenceBoard api={api} keyPrefix="trend" cards={cards} goal={2} cardsTitle="Tahminini destekleyen 2 kanıt seç" onDone={() => { api.strategy('Trendi sürdürme'); api.say('Trendden tahmin: değişimin hızına bakarak!'); api.complete() }} />
        </Panel>
      )}
    </div>
  )
}

function makeTrend() {
  const base = [-9, -7, -2, 6, 11, 15]
  const k = pick([-1, 0, 1])
  return { t: base.map((v, i) => v + (i < 3 ? k : 0)) }
}

/* ───────────── Görev listesi ───────────── */

export function makeG7(): Mission[] {
  const s = pick([-2, -3, -4, -5])
  const e = pick([4, 5, 6])
  const map = makeMap()
  const rates = makeRates()
  const outl = makeOutlier()
  const cmp = makeCompare()
  const tr = makeTrend()
  return [
    {
      key: 'g7-termometre',
      tool: { id: 'numberline', config: { min: -10, max: 10, step: 1 }, title: 'Sayı doğrusunda zıpla' },
      title: 'Termometrede yolculuk',
      prompt: `Erzurum’da sabah sıcaklık ${deg(s)}, öğlen ${deg(e)} oldu. Termometrede sıcaklığı zıplamalarla ${ekS(s, 'abl')} ${ekS(e, 'dat')} çıkar. Toplam değişim ne? Aynı yolculuğu başka duraklarla da göster.`,
      hints: ['Önce 0’a kadar kaç derece çıkman gerekir?', '0’dan sonra hedefe kaç derece kaldı?', 'Zıplama etiketlerini topladığında ne buluyorsun? Farklı duraklar toplamı değiştiriyor mu?'],
      goal: 2,
      picker: { q: 'Hangi yol senin için en kolaydı?', options: ['0’a kadar çıkıp sonra devam ettim', 'Tek seferde saydım', 'Birer birer saydım', `İşlemle: ${f(e)} − (${f(s)})`] },
      note: `${ekS(s, 'abl')} ${ekS(e, 'dat')}: önce 0’a ${-s}, sonra ${e} derece; toplam ${e - s}. Yani ${f(e)} − (${f(s)}) = ${e - s}.`,
      render: (api) => <ThermoPath api={api} s={s} e={e} />,
    },
    {
      key: 'g7-harita',
      tool: { id: 'numberline', config: { min: -16, max: 12, step: 1 }, title: 'Sayı doğrusunda fark' },
      title: 'Haritada sıcaklık farkı',
      prompt: `Ocak sabahı istasyonlardan gelen sıcaklıklar haritada. Önce Erzurum ile Antalya arasındaki farkı bul. Sonra sıcaklık farkı tam ${deg(map.D)} olan 2 şehir çifti keşfet.`,
      hints: ['Termometrede iki işaret arasında kaç derece var? 0’ı ara durak yap.', `0’ın altındaki bir şehir ile üstündeki bir şehir arasındaki fark: (0’a uzaklık) + (0’dan uzaklık).`, `Bir şehrin sıcaklığına ${map.D} ekle: o sıcaklıkta başka bir şehir var mı?`],
      goal: 2,
      picker: { q: 'Farkları nasıl buldun?', options: ['0’ı ara durak yaptım', 'Termometrede saydım', 'Çıkarma işlemi yaptım', 'Bir şehre farkı ekleyip aradım'] },
      note: 'İki sıcaklık arasındaki fark, termometrede aralarındaki uzaklıktır: 0’ın iki yanındaki parçalar toplanır. Örneğin −12 ile 9 arası 12 + 9 = 21 derece.',
      render: (api) => <MapDiff api={api} d={map} />,
    },
    {
      key: 'g7-hiz',
      tool: { id: 'numberline', config: { min: -12, max: 10, step: 1 }, title: 'Sayı doğrusunda değişim' },
      title: 'En hızlı ısınma',
      prompt: 'Kars istasyonu gün boyunca ölçüm yaptı ama ölçümler arasındaki süreler eşit değil. Eksik noktaları grafiğe yerleştir, sonra sıcaklığın saatte en hızlı arttığı aralığı bul.',
      hints: ['Negatif değerler 0 çizgisinin altında. Noktayı doğru tarafa taşıdın mı?', 'Her aralıkta sıcaklık kaç derece değişti ve bu kaç saat sürdü?', 'Değişimi saat sayısına böl: 1 saate kaç derece düşüyor? En dik parça hangisi?'],
      picker: { q: 'En hızlı ısınmayı nasıl buldun?', options: ['Çizginin en dik parçasına baktım', 'Her aralığın saatlik değişimini hesapladım', 'Önce en büyük değişimi aradım, sonra süreyi düşündüm'] },
      note: 'Değişim hızı = değişim ÷ geçen süre. En büyük değişim her zaman en hızlı değişim değildir; grafikte en dik parça en hızlı değişimi gösterir.',
      render: (api) => <Rates api={api} d={rates} />,
    },
    {
      key: 'g7-aykiri',
      tool: { id: 'grafiklab', title: 'Grafik Lab: ortalama ve ortanca' },
      title: 'Aykırı gün',
      prompt: 'Erzurum’da Ocak’ta bir hafta boyunca öğle sıcaklıkları ölçüldü. Bir gün lodos esti ve hava ılıdı! Ortancayı ve ortalamayı bul, sonra “tipik bir günü” hangisinin daha iyi anlattığına karar ver.',
      hints: ['Ortanca için noktaları iki uçtan birer birer ele: hangisi tek başına ortada kalıyor?', 'Ortalama için bütün sıcaklıkları topla (negatiflere dikkat!) ve 7’ye böl.', 'Ilık günü sürükle: ortalama mı daha çok oynuyor, ortanca mı?'],
      goal: 2,
      note: 'Aykırı bir değer ortalamayı kendine doğru çeker; ortanca ise sıralamanın ortasına baktığı için neredeyse hiç etkilenmez.',
      render: (api) => <Outlier api={api} d={outl} />,
    },
    {
      key: 'g7-karsilastir',
      tool: { id: 'numberline', config: { min: -18, max: 2, step: 1 }, title: 'Negatif sayıları karşılaştır' },
      title: 'Kars mı, Erzurum mu?',
      prompt: 'İki istasyon Şubat’ta 9 sabah ölçüm yaptı. Hangi şehir daha soğuk? Ortalama, ortanca ve açıklık araçlarını aç; sonucunu farklı ölçülerle kanıtla.',
      hints: ['−11 mi daha soğuk, −7 mi? Termometrede hangisi daha aşağıda?', 'Ortalama ve ortanca iki şehir için aynı yönü mü gösteriyor?', 'Açıklık neyi anlatır: soğukluğu mu, değişkenliği mi?'],
      goal: 2,
      picker: { q: 'Seni en çok hangi ölçü ikna etti?', options: ['Ortalama', 'Ortanca', 'Noktaların konumu', 'Hepsi birlikte'] },
      note: 'Ortalama ve ortanca “tipik” değeri, açıklık ise değişkenliği anlatır. Güçlü bir argüman birden çok ölçüyü birlikte kullanır.',
      render: (api) => <Compare api={api} d={cmp} />,
    },
    {
      key: 'g7-trend',
      tool: { id: 'numberline', config: { min: -10, max: 25, step: 1 }, title: 'Sayı doğrusunda değişim' },
      title: 'Temmuz tahmini',
      prompt: 'Erzurum’un Ocak–Haziran aylık ortalama sıcaklıkları elimizde. Önce bir değişimi hesapla, sonra çizgiyi sürdürerek Temmuz’u tahmin et ve tahminini gerekçelendir.',
      hints: ['Mart negatif, Nisan pozitif: 0’ı ara durak yap.', 'Son üç ayda sıcaklık her ay kaç derece arttı? Artış büyüyor mu, küçülüyor mu?', 'Haziran’dan Temmuz’a da benzer, belki biraz daha küçük bir artış olabilir mi?'],
      goal: 2,
      note: 'Trendden tahmin yaparken değişimin hızına bakarız: artış yavaşlıyorsa tahmin de bunu yansıtmalı.',
      render: (api) => <Trend api={api} d={tr} />,
    },
  ]
}

