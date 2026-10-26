import { useState } from 'react'
import { ArrowRight, Check, ClipboardCheck, RotateCcw, Save, Scissors } from 'lucide-react'
import { ek } from '../../../lib/generators'
import { AxisBars, DotPlot, LinePlot, Towers } from './charts'
import { Ask, Chip, DataTable, EvidenceBoard, Panel, PrimaryBtn, StepBar, ToolBtn, ekS, f, pick, shuffle, sum, useOnce, type Api, type Mission, type Opt } from './ui'

/**
 * 6. sınıf — nicel (kesikli) veri: ortalama = eşit paylaşım, aynı ortalamalı farklı veri kümeleri,
 * çizgi grafiği, açıklık, yanıltıcı eksen, veriye dayalı tahmin. Yalnızca pozitif değerler (yağış mm, yaz sıcaklıkları).
 */

const poss = (n: number) => `${n}${ek(n, 'poss', false)}`
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/* ───────────── 1. Yağmur kuleleri: ortalama = eşit paylaşım ───────────── */

interface FairData { city: string; labels: string[]; values: number[] }

function FairShare({ api, d }: { api: Api; d: FairData }) {
  const ink = api.ink
  const n = d.values.length
  const total = sum(d.values)
  const mean = total / n
  const whole = Math.floor(total / n)
  const rem = total - whole * n
  const [vals, setVals] = useState(d.values)
  const [split, setSplit] = useState(false)
  const [got, setGot] = useState<string[]>([])
  const [calc, setCalc] = useState(0)
  const nearlyLevel = rem > 0 && vals.every((v) => v === whole || v === whole + 1)
  const leveled = rem === 0 ? vals.every((v) => v === whole) : split
  const addPath = (key: string, label: string, strat: string) => {
    if (got.includes(key)) return
    api.found(key, label)
    api.strategy(strat)
    const next = [...got, key]
    setGot(next)
    if (next.length >= 2) {
      api.say('İki yol da aynı sonucu verdi: ortalama, toplamın eşit paylaşılmasıdır!')
      api.complete()
    } else {
      api.say(key === 'dengele' ? `Kuleler dengelendi: her güne ${f(mean)} mm düştü. Şimdi aynı sonucu hesapla da bul!` : `Hesap tamam: ${f(mean)} mm. Şimdi kuleleri dengeleyerek de göster!`)
    }
  }
  useOnce(leveled, () => addPath('dengele', `Dengeledim: her gün ${f(mean)} mm`, 'Dengeleme (eşit paylaşım)'))
  const move = (from: number, to: number) => {
    if (leveled) return
    setVals((v) => (v[from] < 1 ? v : v.map((x, k) => (k === from ? x - 1 : k === to ? x + 1 : x))))
  }
  return (
    <div className="grid gap-3">
      <Panel ink={ink} title={`🌧️ ${d.city} · ${n} günlük yağış`} right={<Chip ink={ink}>Toplam: {sum(vals)} mm</Chip>}>
        <Towers ink={ink} labels={d.labels} values={vals} max={Math.max(...d.values) + 2} mode={leveled ? 'view' : 'move'} onMove={move} meanLine={leveled ? mean : undefined} />
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {nearlyLevel && !split && (
            <PrimaryBtn onClick={() => { setSplit(true); setVals(vals.map(() => mean)) }} className="animate-pop"><Scissors size={18} />Artan {rem} mm’yi {n} güne paylaştır</PrimaryBtn>
          )}
          {!leveled && <ToolBtn ink={ink} onClick={() => setVals(d.values)} label="Kuleleri başa al"><RotateCcw size={16} />Başa al</ToolBtn>}
          {leveled && <Chip ink={ink} tone="ok"><Check size={16} />Her gün {f(mean)} mm</Chip>}
        </div>
        {nearlyLevel && !split && <p className="mt-1 text-center text-xs font-extrabold" style={{ color: ink.soft }}>Kuleler neredeyse eşit! Fazla kalan blokları bütün günlere eşit bölebilir misin?</p>}
      </Panel>
      <Panel ink={ink} title="🧮 Hesapla: topla ve paylaştır">
        {calc === 0 && (
          <Ask
            api={api}
            q={`${n} günde toplam kaç mm yağmur yağdı?`}
            unit="mm"
            judge={(v) => (v === total ? true : { q: 'Her günün yağışını topla. Tüplerdeki bütün blokları saymak da aynı sonucu verir mi?' })}
            onOk={() => setCalc(1)}
          />
        )}
        {calc === 1 && (
          <Ask
            api={api}
            q={`${total} mm yağmuru ${n} güne eşit paylaştırırsan her güne kaç mm düşer?`}
            unit="mm"
            dec
            judge={(v) => {
              if (Math.abs(v - mean) < 1e-9) return true
              if (v === total) return { q: `Bu, toplam yağış. Bu toplam ${n} güne eşit paylaşılırsa her güne ne kadar düşer?` }
              if (rem && v === whole) return { q: `${total} mm’yi ${n} güne paylaştırınca artan ${rem} mm ne olacak? Onu da günlere paylaştırabilir misin?`, misc: 'Bölmede kalanı yok saydı' }
              if (v === Math.max(...d.values) || v === Math.min(...d.values)) return { q: 'Bu, günlerden birinin yağışı. Ortalama, bütün günleri eşitlediğimizde her güne düşen miktardır. Kuleleri dengelemeyi dene.', misc: 'Ortalamayı tek bir değer sandı' }
              return { q: `${total} ÷ ${n} işlemini düşün. Kuleleri dengelersen her tüpte ne kadar olur?` }
            }}
            onOk={() => { setCalc(2); addPath('topla', `Topla ve böl: ${total} ÷ ${n} = ${f(mean)}`, 'Toplayıp bölme') }}
          />
        )}
        {calc === 2 && <p className="text-center text-base font-black" style={{ color: ink.text }}>{total} ÷ {n} = {f(mean)} mm ✓</p>}
      </Panel>
    </div>
  )
}

function makeFair(): FairData {
  const half = Math.random() < 0.5
  if (half) {
    const m = pick([4, 5])
    const del = shuffle(pick([[3, -2, 2, -1], [4, -3, 1, 0], [2, 1, -3, 2]]))
    return { city: 'Rize', labels: DAYS.slice(0, 4), values: del.map((x) => m + x) }
  }
  const m = pick([4, 5, 6])
  const del = shuffle(pick([[3, -2, 1, -3, 1], [4, -1, -2, 1, -2], [2, -3, 3, 0, -2]]))
  return { city: pick(['Rize', 'Trabzon']), labels: DAYS.slice(0, 5), values: del.map((x) => m + x) }
}

/* ───────────── 2. Aynı ortalama, farklı haftalar ───────────── */

function SameMean({ api, M }: { api: Api; M: number }) {
  const ink = api.ink
  const n = 5
  const [vals, setVals] = useState(() => Array(n).fill(M) as number[])
  const [keys, setKeys] = useState<string[]>([])
  const ex = sum(vals.map((v) => Math.max(0, v - M)))
  const de = sum(vals.map((v) => Math.max(0, M - v)))
  const save = () => {
    const s = sum(vals)
    if (vals.every((v) => v === M)) return api.nudge(`Bu, örnekteki hafta: her gün ${M} mm. Günleri farklı olan ama ortalaması yine ${M} mm olan bir hafta tasarla.`, { tone: 'ok' })
    if (s !== n * M) {
      api.check(false)
      return api.nudge(`Çizginin üstündeki fazlalık ${ex} mm, altındaki eksik ${de} mm. Ortalamanın ${M} mm olması için bu ikisi nasıl olmalı?`, { misc: 'Ortalamada fazlalıkların eksikleri dengelediğini fark etmedi' })
    }
    const key = [...vals].sort((a, b) => a - b).join(',')
    if (keys.includes(key)) return api.nudge('Bu sayıları zaten kullandın (sırası farklı olsa da). Başka değerler dene!', { tone: 'ok' })
    api.check(true)
    api.clear()
    const range = Math.max(...vals) - Math.min(...vals)
    api.found(key, `${vals.join(', ')} · açıklık ${range}`)
    const next = [...keys, key]
    setKeys(next)
    if (next.length >= 3) {
      api.say('Üç farklı hafta, aynı ortalama! Açıklıkları ise farklı.')
      api.complete()
    } else api.say(`Kaydedildi! Toplam ${n * M} mm, ortalama ${M} mm. Bir hafta daha tasarla.`)
  }
  return (
    <div className="grid gap-3">
      <Panel ink={ink} title={`🧪 Tasarım masası: ortalama ${M} mm olsun`} right={<span className="flex flex-wrap gap-1.5"><Chip ink={ink} tone="warn">Fazlalık: {ex} mm</Chip><Chip ink={ink} tone="mean">Eksik: {de} mm</Chip></span>}>
        <Towers ink={ink} labels={DAYS.slice(0, n)} values={vals} max={10} mode="set" onSet={(i, v) => setVals((c) => c.map((x, k) => (k === i ? v : x)))} meanLine={M} showExcess />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Chip ink={ink} tone={sum(vals) === n * M ? 'ok' : 'plain'}>Toplam: {sum(vals)} mm</Chip>
          <PrimaryBtn onClick={save}><Save size={18} />Haftayı kaydet</PrimaryBtn>
          <ToolBtn ink={ink} onClick={() => setVals(Array(n).fill(M))} label="Başa al"><RotateCcw size={16} /></ToolBtn>
        </div>
      </Panel>
    </div>
  )
}

/* ───────────── 3. Haftalık sıcaklık çizgisi ───────────── */

function LineBuild({ api, d }: { api: Api; d: { city: string; temps: number[] } }) {
  const ink = api.ink
  const n = d.temps.length
  const xs = d.temps.map((_, i) => i + 1)
  const [ys, setYs] = useState<number[]>(() => d.temps.map(() => 20))
  const [step, setStep] = useState(0)
  const [hl, setHl] = useState<number[]>([])
  const [segState, setSegState] = useState<Record<number, 'ok' | 'no'>>({})
  const ups = d.temps.slice(1).map((t, i) => t - d.temps[i])
  const best = ups.indexOf(Math.max(...ups))
  const check = () => {
    const wrong = ys.map((y, i) => (y !== d.temps[i] ? i : -1)).filter((i) => i >= 0)
    setHl(wrong)
    if (wrong.length) {
      api.check(false)
      const i = wrong[0]
      return api.nudge(`${DAYS[i]} noktası ${ys[i]} °C’de duruyor; tabloda ${d.temps[i]} °C. Noktayı yukarı mı aşağı mı taşımalısın?`)
    }
    api.check(true)
    api.clear()
    setStep(1)
    api.say('Çizgi grafik hazır! Çizginin dik çıktığı yerler hızlı ısınmayı gösterir.')
  }
  const tapSeg = (k: number) => {
    if (step !== 1) return
    const u = ups[k]
    if (k === best) {
      api.check(true)
      api.clear()
      setSegState((s) => ({ ...s, [k]: 'ok' }))
      setStep(2)
      return
    }
    api.check(false)
    setSegState((s) => ({ ...s, [k]: 'no' }))
    api.nudge(u < 0 ? `${DAYS[k]}–${DAYS[k + 1]} arasında çizgi aşağı iniyor: sıcaklık ${-u} derece düştü. Yukarı çıkan parçalara bak.` : u === 0 ? 'Bu parça düz: sıcaklık değişmemiş. Yukarı çıkan parçalara bak.' : `Bu aralıkta ${u} derece arttı. Daha dik çıkan bir parça var mı?`)
  }
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Grafiği çiz', 'En büyük artış', 'Kaç derece?']} at={step} />
      <Panel ink={ink} title={`🌡️ ${d.city} · Temmuz’da bir hafta (en yüksek sıcaklık)`}>
        <DataTable ink={ink} head={['Gün', ...DAYS.slice(0, n)]} rows={[['°C', ...d.temps.map(String)]]} />
      </Panel>
      <Panel ink={ink}>
        <LinePlot ink={ink} xs={xs} xLabels={DAYS.slice(0, n)} ys={ys} editable={step === 0 ? xs.map(() => true) : undefined} onSet={step === 0 ? (i, y) => { setYs((c) => c.map((v, k) => (k === i ? y : v))); setHl((h) => h.filter((x) => x !== i)) } : undefined} view={{ xMin: 0.4, xMax: n + 0.6, yMin: 14, yMax: 40 }} yUnit="°C" hlPts={hl} seg={step >= 1 ? { onTap: tapSeg, state: segState } : undefined} />
        {step === 0 && <div className="mt-2 flex justify-center"><PrimaryBtn onClick={check}><ClipboardCheck size={18} />Grafiği kontrol et</PrimaryBtn></div>}
        {step === 1 && <p className="mt-2 text-center text-base font-black" style={{ color: ink.text }}>Sıcaklık en çok hangi iki gün arasında arttı? Çizginin o parçasına dokun.</p>}
      </Panel>
      {step === 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <Ask
            api={api}
            q={`${DAYS[best]} ile ${DAYS[best + 1]} arasında sıcaklık kaç derece arttı?`}
            unit="°C"
            judge={(v) => (v === ups[best] ? true : v === d.temps[best + 1] ? { q: `Bu, ${DAYS[best + 1]} gününün sıcaklığı. Artış, iki sıcaklık arasındaki farktır: ${d.temps[best]} °C’den ${d.temps[best + 1]} °C’ye kaç derece çıkılır?`, misc: 'Değişim yerine son değeri yazdı' } : { q: `${d.temps[best]} °C’den ${d.temps[best + 1]} °C’ye çıkmak için kaç derece gerekir? İleri say ya da çıkar.` })}
            onOk={() => { api.say(`En büyük artış: ${DAYS[best]}–${DAYS[best + 1]} arası, ${ups[best]} °C.`); api.complete() }}
          />
        </Panel>
      )}
    </div>
  )
}

function makeWeek(): number[] {
  for (;;) {
    const t: number[] = [pick([25, 26, 27, 28])]
    for (let i = 1; i < 7; i++) t.push(Math.max(22, Math.min(36, t[i - 1] + pick([-3, -2, 2, 3, 1, 5, 4, -1]))))
    const ups = t.slice(1).map((x, i) => x - t[i])
    const m = Math.max(...ups)
    if (m >= 4 && ups.filter((u) => u === m).length === 1 && ups.some((u) => u < 0)) return t
  }
}

/* ───────────── 4. Hangi şehir daha değişken? (açıklık) ───────────── */

interface SpreadData { izmir: number[]; konya: number[]; base: number }

function SpreadCities({ api, d }: { api: Api; d: SpreadData }) {
  const ink = api.ink
  const [tapI, setTapI] = useState<number[]>([])
  const [tapK, setTapK] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const ext = (a: number[], taps: number[]) => {
    const mn = Math.min(...a), mx = Math.max(...a)
    const vs = taps.map((i) => a[i])
    return vs.includes(mn) && vs.includes(mx)
  }
  const okI = ext(d.izmir, tapI), okK = ext(d.konya, tapK)
  useOnce(okI && okK, () => { setStep(1); api.say('İki şehrin uç değerleri işaretlendi. Şimdi açıklığı hesapla.') })
  const tap = (city: 'i' | 'k', i: number) => {
    const a = city === 'i' ? d.izmir : d.konya
    const v = a[i]
    if (v !== Math.min(...a) && v !== Math.max(...a)) return setNote(`${f(v)} °C en uçtaki nokta mı? Sayı doğrusunda daha solda ya da daha sağda nokta var mı?`)
    setNote(null)
    if (city === 'i') setTapI((t) => (t.includes(i) ? t : [...t, i]))
    else setTapK((t) => (t.includes(i) ? t : [...t, i]))
  }
  const rI = Math.max(...d.izmir) - Math.min(...d.izmir)
  const rK = Math.max(...d.konya) - Math.min(...d.konya)
  const [conclusions] = useState<Opt[]>(() =>
    shuffle([
      { t: 'Konya’da sıcaklık günden güne daha çok değişiyor.', ok: true },
      { t: 'İzmir’de sıcaklık günden güne daha çok değişiyor.', ok: false, fb: 'İzmir’in noktaları birbirine yakın mı, uzak mı? Açıklığı kaç?' },
      { t: 'Ortalamaları aynı olduğu için sıcaklıklar da aynı şekilde değişiyor.', ok: false, fb: 'Ortalamalar aynı ama noktaların dağılışına bak: aynı mı?', misc: 'Aynı ortalamayı aynı dağılım sandı' },
    ]),
  )
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: `Konya’nın açıklığı ${rK} °C, İzmir’inki yalnızca ${rI} °C.`, ok: true, s: `Açıklık: ${rK} ve ${rI}` },
      { t: 'İzmir’in noktaları üst üste yığılmış, Konya’nınkiler yayılmış.', ok: true, s: 'Noktaların dağılışı' },
      { t: `İzmir’de her gün ${Math.min(...d.izmir)} ile ${Math.max(...d.izmir)} °C arasında kaldı.`, ok: true, s: 'İzmir dar aralıkta' },
      { t: `İki şehrin ortalaması da ${d.base} °C.`, ok: false, fb: 'Ortalamalar aynı. Bu, sıcaklığın ne kadar değiştiğini gösterir mi?', misc: 'Değişkenliği ortalamayla açıklamaya çalıştı' },
      { t: `Konya’nın en yüksek sıcaklığı ${Math.max(...d.konya)} °C.`, ok: false, fb: 'Tek bir değer değişkenliği gösterir mi? En düşük değere de bakmak gerekmez mi?', misc: 'Değişkenliği tek uç değerle değerlendirdi' },
    ]),
  )
  const view: [number, number] = [d.base - 9, d.base + 9]
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Uçları işaretle', 'Açıklık', 'Karar ver']} at={step} />
      <Panel ink={ink} title="📍 Nisan’da 7 gün: en yüksek sıcaklıklar">
        <div className="grid gap-2">
          <DotPlot ink={ink} values={d.izmir} view={view} unit="°C" title="İzmir" color={ink.dark ? '#fb923c' : '#ea580c'} onDot={step === 0 ? (i) => tap('i', i) : undefined} dotState={Object.fromEntries(tapI.map((i) => [i, 'sel']))} marks={{ range: okI }} rangeLabel={step >= 2} />
          <DotPlot ink={ink} values={d.konya} view={view} unit="°C" title="Konya" color={ink.dark ? '#a78bfa' : '#7c3aed'} onDot={step === 0 ? (i) => tap('k', i) : undefined} dotState={Object.fromEntries(tapK.map((i) => [i, 'sel']))} marks={{ range: okK }} rangeLabel={step >= 2} />
        </div>
        {step === 0 && <p className="mt-1 text-center text-sm font-extrabold" style={{ color: ink.text }}>{note ?? 'Her şehrin en düşük ve en yüksek sıcaklığına dokun.'}</p>}
      </Panel>
      {step === 1 && (
        <Panel ink={ink} className="animate-fade-up">
          <Ask
            api={api}
            q="Konya’nın açıklığı (en yüksek − en düşük) kaç °C?"
            unit="°C"
            judge={(v) => (v === rK ? true : v === Math.max(...d.konya) ? { q: 'Bu, en yüksek değer. Açıklık, en yüksek ile en düşük değer arasındaki uzaklıktır.', misc: 'Açıklığı en büyük değer sandı' } : { q: `Konya’nın en düşük sıcaklığı ${Math.min(...d.konya)}, en yüksek sıcaklığı ${Math.max(...d.konya)} °C. Aralarında kaç derece var?` })}
            onOk={() => { setStep(2); api.say(`Konya’nın açıklığı ${rK} °C, İzmir’in açıklığı ${rI} °C.`) }}
          />
        </Panel>
      )}
      {step >= 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <EvidenceBoard api={api} keyPrefix="aciklik" question="Hangi sonuç verilerle destekleniyor?" conclusions={conclusions} cards={cards} goal={2} onDone={() => { api.say('Ortalama aynı, açıklık farklı: iki şehrin havası çok farklı!'); api.complete() }} />
        </Panel>
      )}
    </div>
  )
}

function makeSpread(): SpreadData {
  const base = pick([21, 22, 23])
  const izmir = shuffle([-1, 0, 0, 1, -1, 1, 0]).map((x) => base + x)
  const konya = shuffle(pick([[-6, 4, -2, 5, -3, 1, 1], [-5, 6, -3, 2, -4, 3, 1], [-4, 5, -6, 3, 2, -1, 1]])).map((x) => base + x)
  return { izmir, konya, base }
}

/* ───────────── 5. Haber grafiği: yanıltıcı eksen ───────────── */

function AxisNews({ api, d }: { api: Api; d: { a: number; b: number; lo0: number } }) {
  const ink = api.ink
  const [lo, setLo] = useState(d.lo0)
  const [step, setStep] = useState(0)
  const diff = d.b - d.a
  useOnce(lo === 0, () => { api.check(true); api.strategy('Eksen başlangıcını denetleme'); setStep(1); api.say('Eksen artık 0’dan başlıyor. Sütunlara yeniden bak!') })
  const [conclusions] = useState<Opt[]>(() =>
    shuffle([
      { t: 'Haber abartılı: yağış biraz arttı ama 3 katına çıkmadı.', ok: true },
      { t: 'Haber doğru: Şubat sütunu 3 kat uzun.', ok: false, fb: 'Eksen 0’dan başlayınca Şubat sütunu hâlâ 3 kat uzun mu?', misc: 'Eksen başlangıcına bakmadan sütun boylarını karşılaştırdı' },
      { t: 'Şubat’ta yağış azaldı.', ok: false, fb: 'Şubat’ın sütunu Ocak’ınkinden kısa mı? Değerleri karşılaştır.' },
    ]),
  )
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: `İki ay arasındaki fark yalnızca ${diff} mm.`, ok: true, s: `Fark ${diff} mm` },
      { t: `${d.a} mm’nin 3 katı ${3 * d.a} mm olurdu; Şubat’ta ${d.b} mm yağdı.`, ok: true, s: `3 katı ${3 * d.a} olurdu` },
      { t: 'Eksen 0’dan başlayınca iki sütunun boyu birbirine çok yakın.', ok: true, s: 'Dürüst eksen' },
      { t: `Haberdeki grafiğin ekseni ${ekS(d.lo0, 'abl')} başlıyordu.`, ok: true, s: `Eksen ${ekS(d.lo0, 'abl')} başlıyordu` },
      { t: 'Şubat bir kış ayıdır.', ok: false, fb: 'Bu bilgi haberdeki “3 katı” iddiasını sınıyor mu?' },
    ]),
  )
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Ekseni düzelt', 'Farkı bul', 'Haberi değerlendir']} at={step} />
      <div className={`rounded-2xl p-3 ${ink.dark ? 'bg-rose-500/10 ring-1 ring-rose-500/30' : 'bg-rose-50 ring-1 ring-rose-200'}`}>
        <p className="text-[11px] font-black tracking-[0.2em] text-rose-600 uppercase">Son dakika · Van</p>
        <p className="text-lg leading-snug font-black sm:text-xl" style={{ color: ink.text }}>“Van’da yağış patladı: Şubat’ta yağış Ocak’ın 3 katına çıktı!”</p>
      </div>
      <Panel ink={ink} title="📺 Haberdeki grafik: aylık yağış">
        <AxisBars ink={ink} data={[{ label: 'Ocak', value: d.a }, { label: 'Şubat', value: d.b }]} lo={lo} setLo={setLo} lo0={d.lo0} unit="mm" onFixed={step > 0} />
        {step === 0 && <p className="mt-1 text-center text-sm font-extrabold" style={{ color: ink.text }}>Dikey eksen kaçtan başlıyor? Pembe tutamacı aşağı sürükle ya da “Ekseni aşağı çek”e dokun.</p>}
      </Panel>
      {step === 1 && (
        <Panel ink={ink} className="animate-fade-up">
          <Ask api={api} q="Şubat’ta Ocak’a göre kaç mm daha fazla yağış oldu?" unit="mm" judge={(v) => (v === diff ? true : v === d.b ? { q: 'Bu, Şubat’taki yağış. Ocak’tan ne kadar fazla olduğunu bulmak için iki değeri karşılaştır.' } : { q: `Ocak ${d.a} mm, Şubat ${d.b} mm. ${ekS(d.a, 'abl')} ${ekS(d.b, 'dat')} kaç mm var?` })} onOk={() => setStep(2)} />
        </Panel>
      )}
      {step >= 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <EvidenceBoard api={api} keyPrefix="eksen" question="Haber hakkında ne düşünüyorsun?" conclusions={conclusions} cards={cards} goal={2} onDone={() => { api.say('Yanıltıcı grafik yakalandı! Eksenin nereden başladığına her zaman bak.'); api.complete() }} />
        </Panel>
      )}
    </div>
  )
}

function makeAxis() {
  const a = pick([34, 36, 38, 40])
  const diff = pick([4, 6])
  return { a, b: a + diff, lo0: a - diff / 2 }
}

/* ───────────── 6. 1 Haziran tahmini: 10 yıllık veri ───────────── */

const YEARS = Array.from({ length: 10 }, (_, i) => 2016 + i)

function Forecast({ api, d }: { api: Api; d: { base: number; temps: number[] } }) {
  const ink = api.ink
  const [shown, setShown] = useState<'dot' | 'line' | null>(null)
  const [valid, setValid] = useState<string[]>([])
  const [step, setStep] = useState(0)
  const [pred, setPred] = useState<number | null>(null)
  const mn = Math.min(...d.temps), mx = Math.max(...d.temps)
  const mean = sum(d.temps) / d.temps.length
  const inMid = d.temps.filter((t) => Math.abs(t - d.base) <= 1).length
  const choose = (k: 'dot' | 'line' | 'pie') => {
    if (k === 'pie') {
      api.check(false)
      return api.nudge('Daire grafiği bir bütünün parçalarını gösterir. On yılın sıcaklıklarını toplayıp bir bütün yapmak anlamlı mı? Sıcaklıkları göstermeye hangi grafik uygun?', { misc: 'Sıcaklık verisi için daire grafiği seçti' })
    }
    api.clear()
    setShown(k)
    if (!valid.includes(k)) {
      api.check(true)
      api.found(`gosterim-${k}`, k === 'dot' ? 'Nokta grafiği: dağılım' : 'Çizgi grafiği: yıllara göre değişim')
      api.strategy(k === 'dot' ? 'Nokta grafiğiyle dağılıma bakma' : 'Çizgi grafiğiyle zamana göre değişime bakma')
      setValid((v) => [...v, k])
      api.say(k === 'dot' ? 'Nokta grafiği: hangi sıcaklıklar sık görülmüş, hemen görülüyor.' : 'Çizgi grafiği: yıllar içinde sıcaklık nasıl değişmiş, hemen görülüyor.')
    }
  }
  const savePred = () => {
    if (pred === null) return api.nudge('Önce sayı doğrusuna dokunarak ya da mor işareti sürükleyerek bir tahmin koy.', { tone: 'ok' })
    if (pred < mn || pred > mx) {
      api.check(false)
      return api.nudge(pred > mx ? `Son 10 yılda 1 Haziran’da hiç ${f(pred)} °C kadar sıcak olmuş mu? En yüksek değer kaçtı?` : `Son 10 yılda hiç ${f(pred)} °C kadar serin olmuş mu? En düşük değer kaçtı?`, { misc: 'Tahmini verinin aralığı dışında yaptı' })
    }
    api.check(true)
    api.clear()
    setStep(2)
    api.say(`Tahminin: ${f(pred)} °C. Şimdi bu tahmini verilerle gerekçelendir.`)
  }
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: `Son 10 yılın ortalaması ${f(mean, 1)} °C.`, ok: true, s: `Ortalama ${f(mean, 1)} °C` },
      { t: `10 yılın ${poss(inMid)} ${d.base - 1} ile ${d.base + 1} °C arasında.`, ok: true, s: 'Değerlerin çoğu bir aralıkta' },
      { t: `En düşük ${mn}, en yüksek ${mx} °C oldu; tahminim bu aralıkta.`, ok: true, s: `Aralık ${mn}–${mx} °C` },
      { t: `Geçen yıl ${d.temps[9]} °C idi; bu yıl da kesinlikle aynısı olur.`, ok: false, fb: 'Tek bir yıla bakmak yeterli mi? “Kesinlikle” diyebilir miyiz?', misc: 'Tek bir değere dayanarak kesin tahmin yaptı' },
      { t: 'Her yıl bir öncekinden daha sıcak oluyor.', ok: false, fb: 'Çizgi grafiğe bak: sıcaklık her yıl artıyor mu, yoksa inip çıkıyor mu?' },
    ]),
  )
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Gösterim seç', 'Tahmin et', 'Gerekçelendir']} at={step} />
      <Panel ink={ink} title="🗓️ Ankara · 1 Haziran öğle sıcaklığı (son 10 yıl)">
        <DataTable ink={ink} head={['Yıl', ...YEARS.map((y) => `’${String(y).slice(2)}`)]} rows={[['°C', ...d.temps.map(String)]]} />
      </Panel>
      {step === 0 && (
        <Panel ink={ink} title="Bu veriyi hangi grafikle gösterirsin?">
          <div className="grid grid-cols-3 gap-2">
            {([['dot', '⚬⚬⚬', 'Nokta grafiği'], ['line', '📈', 'Çizgi grafiği'], ['pie', '🥧', 'Daire grafiği']] as const).map(([k, ic, l]) => (
              <button key={k} type="button" onClick={() => choose(k)} aria-pressed={shown === k} className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-extrabold ring-1 transition active:scale-95 ${shown === k ? (ink.dark ? 'bg-cyan-500/20 text-cyan-100 ring-2 ring-cyan-400' : 'bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500') : ink.dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
                <span className="text-xl" aria-hidden>{ic}</span>{l}
                {valid.includes(k) && <Check size={14} strokeWidth={3} className="absolute top-1.5 right-1.5 text-emerald-500" />}
              </button>
            ))}
          </div>
          {shown && (
            <div className="mt-3 animate-fade-up">
              {shown === 'dot' ? (
                <DotPlot ink={ink} values={d.temps} view={[d.base - 7, d.base + 7]} unit="°C" />
              ) : (
                <LinePlot ink={ink} xs={YEARS.map((_, i) => i + 1)} xLabels={YEARS.map((y) => `’${String(y).slice(2)}`)} ys={d.temps} view={{ xMin: 0.4, xMax: 10.6, yMin: d.base - 8, yMax: d.base + 6 }} yUnit="°C" aspect={0.5} />
              )}
            </div>
          )}
          {valid.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {valid.length < 2 && <p className="w-full text-center text-sm font-extrabold" style={{ color: ink.soft }}>Bu veri için uygun başka bir gösterim var mı? İstersen dene.</p>}
              <PrimaryBtn onClick={() => { setStep(1); api.clear() }}>Tahmine geç<ArrowRight size={18} /></PrimaryBtn>
            </div>
          )}
        </Panel>
      )}
      {step >= 1 && (
        <Panel ink={ink} title="🔮 Bu yıl 1 Haziran’da öğle sıcaklığı kaç °C olur?" className="animate-fade-up">
          <DotPlot ink={ink} values={d.temps} view={[d.base - 7, d.base + 7]} unit="°C" marker={step === 1 ? { v: pred, label: 'tahmin', onChange: (v) => setPred(v), step: 0.5 } : { v: pred, label: 'tahmin', onChange: () => undefined }} />
          {step === 1 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Chip ink={ink} tone="info">Tahminin: {pred === null ? '—' : `${f(pred)} °C`}</Chip>
              <PrimaryBtn onClick={savePred}><Save size={18} />Tahminimi kaydet</PrimaryBtn>
            </div>
          )}
        </Panel>
      )}
      {step >= 2 && (
        <Panel ink={ink} className="animate-fade-up">
          <EvidenceBoard api={api} keyPrefix="haziran" cards={cards} goal={2} cardsTitle="Tahminini destekleyen 2 kanıt kartı seç" onDone={() => { api.say('Tahminin tek bir yıla değil, bütün verilere dayanıyor. Harika!'); api.complete() }} />
        </Panel>
      )}
    </div>
  )
}

function makeForecast() {
  const base = pick([24, 25, 26])
  return { base, temps: shuffle([-3, -1, 0, 1, 2, 0, 1, -2, 3, -1]).map((x) => base + x) }
}

/* ───────────── Görev listesi ───────────── */

export function makeG6(): Mission[] {
  const fair = makeFair()
  const M = pick([4, 5])
  const week = { city: pick(['Konya', 'Ankara']), temps: makeWeek() }
  const spread = makeSpread()
  const ax = makeAxis()
  const fc = makeForecast()
  const n = fair.values.length
  return [
    {
      key: 'g6-kule',
      title: 'Yağmur kuleleri',
      prompt: `${fair.city} istasyonu ${n} gün boyunca yağışı ölçtü. Bu günlerde ortalama kaç mm yağmur yağdı? İki yolla bul: kuleleri dengeleyerek ve hesaplayarak.`,
      hints: ['En uzun tüpten en kısa tüpe bir blok taşı. Toplam yağış değişti mi?', 'Bütün tüpler aynı boyda olunca her tüpte kaç blok var?', `Toplam yağışı ${n} güne eşit paylaştırmak hangi işlemle yazılır?`],
      goal: 2,
      note: 'Dengeleme ve “topla, böl” aynı fikrin iki yüzü: ortalama, toplamın eşit paylaşılmasıdır.',
      render: (api) => <FairShare api={api} d={fair} />,
    },
    {
      key: 'g6-ayni-ortalama',
      title: 'Aynı ortalama, farklı haftalar',
      prompt: `Örnek haftada her gün ${M} mm yağmur yağdı; ortalama ${M} mm. Ortalaması yine ${M} mm olan ama günleri birbirinden farklı 3 hafta tasarla.`,
      hints: [`Bir günden 1 mm alıp başka bir güne verirsen toplam değişir mi?`, 'Çizginin üstünde kalan fazlalık ile altındaki eksik eşit mi?', `5 günün toplamı kaç mm olmalı ki ortalama ${M} olsun?`],
      goal: 3,
      picker: { q: 'Yeni haftaları nasıl tasarladın?', options: ['Bir günden alıp başka güne verdim', 'Önce toplamı hesapladım', 'Çizginin üstüyle altını eşitledim'] },
      note: 'Ortalamaları aynı olan haftaların açıklıkları farklı olabilir: ortalama, verinin ne kadar yayıldığını söylemez.',
      render: (api) => <SameMean api={api} M={M} />,
    },
    {
      key: 'g6-cizgi',
      title: 'Haftalık sıcaklık çizgisi',
      prompt: `${week.city} istasyonunun bir haftalık en yüksek sıcaklıklarını çizgi grafiğe dök. Pembe noktaları sürükle ya da yüksekliğe dokun; sonra sıcaklığın en çok arttığı günleri bul.`,
      hints: ['Tablodaki ilk değer kaç? Pazartesi noktasını o çizgiye taşı.', 'Çizginin hangi parçası en dik yukarı çıkıyor?', 'Ardışık iki günün sıcaklıkları arasındaki farkı hesapla: en büyük artış hangisi?'],
      picker: { q: 'En büyük artışı nasıl buldun?', options: ['En dik çıkan parçaya baktım', 'Her iki gün arasındaki farkı hesapladım'] },
      note: 'Çizgi grafikte dik çıkan parça hızlı artışı, aşağı inen parça düşüşü gösterir.',
      render: (api) => <LineBuild api={api} d={week} />,
    },
    {
      key: 'g6-aciklik',
      title: 'Hangi şehir daha değişken?',
      prompt: 'İzmir ve Konya’nın Nisan’daki 7 günlük en yüksek sıcaklıkları nokta grafiklerinde. İki şehrin ortalaması aynı. Peki havaları aynı mı? Uç değerleri bul, açıklığı hesapla ve kanıtla.',
      hints: ['Her şehrin en solda ve en sağda kalan noktası hangisi?', 'Açıklık = en yüksek değer − en düşük değer.', 'Noktalar bir yerde toplanmışsa sıcaklık az mı değişiyor, çok mu?'],
      goal: 2,
      note: 'Ortalama aynı olsa bile açıklık, verinin ne kadar yayıldığını gösterir. İzmir’in havası daha tutarlı, Konya’nınki daha değişken.',
      render: (api) => <SpreadCities api={api} d={spread} />,
    },
    {
      key: 'g6-eksen',
      title: 'Haber grafiği',
      prompt: 'Bir haber sitesi Van’ın yağış grafiğini paylaştı ve yağışın 3 katına çıktığını iddia etti. Grafiği incele: eksen nereden başlıyor? Dürüst hâle getir ve haberi değerlendir.',
      hints: ['Dikey eksendeki en küçük sayı kaç? Sütunlar 0’dan mı başlıyor?', 'Ekseni 0’a indirince sütunların boyları nasıl değişti?', `${ax.a} mm’nin 3 katı kaç mm eder? Şubat’ta bu kadar yağmış mı?`],
      goal: 2,
      note: 'Eksen 0’dan başlamayınca küçük farklar dev gibi görünür. Grafiğe bakmadan önce eksenin nereden başladığını kontrol et.',
      render: (api) => <AxisNews api={api} d={ax} />,
    },
    {
      key: 'g6-tahmin',
      title: '1 Haziran tahmini',
      prompt: 'Bu yıl 1 Haziran’da Ankara’da öğle sıcaklığı kaç °C olur? Önce son 10 yılın verisini uygun bir grafikle göster, sonra tahminini yap ve gerekçelendir.',
      hints: ['Sıcaklıkları toplayıp bir bütün yapmak anlamlı mı? Hangi grafikler tek tek değerleri gösterir?', 'Noktaların en çok toplandığı yer neresi?', 'Ortalama ve en düşük–en yüksek değerler tahmini nasıl destekler?'],
      goal: 2,
      note: 'İyi bir tahmin tek bir yıla değil, verinin tamamına dayanır: ortalama, aralık ve noktaların toplandığı yer.',
      render: (api) => <Forecast api={api} d={fc} />,
    },
  ]
}
