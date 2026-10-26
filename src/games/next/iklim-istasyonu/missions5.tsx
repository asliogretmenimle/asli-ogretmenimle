import { useState } from 'react'
import { Check, ClipboardCheck } from 'lucide-react'
import { ek } from '../../../lib/generators'
import { WX, WxIcon, wxColor, type Wx } from './art'
import { BarChart } from './charts'
import { Ask, Chip, EvidenceBoard, Panel, PrimaryBtn, Sorter, StepBar, f, pick, rint, shuffle, type Api, type Mission, type Opt } from './ui'

/**
 * 5. sınıf — kategorik veri (hava türleri, mevsim anketi).
 * Takvimden grafiğe, ölçek seçimi, iki şehri karşılaştırma, veriye dayalı tahmin, yorum ayıklama,
 * ipuçlarından grafik kurma (birden çok doğru grafik). Negatif sayı yok.
 */

const poss = (n: number) => `${n}${ek(n, 'poss', false)}`

/* ───────────── Ortak parçalar ───────────── */

function TallyMarks({ n, color }: { n: number; color: string }) {
  const groups = Math.floor(n / 5), rest = n % 5
  const W = groups * 28 + rest * 7 + 6
  return (
    <svg width={Math.max(W, 12)} height={24} aria-label={`${n} çetele işareti`}>
      {Array.from({ length: groups }, (_, g) => (
        <g key={g} transform={`translate(${g * 28 + 3} 3)`}>
          {[0, 1, 2, 3].map((k) => <line key={k} x1={k * 5} x2={k * 5} y1={0} y2={18} stroke={color} strokeWidth={2.2} strokeLinecap="round" />)}
          <line x1={-2} x2={18} y1={15} y2={3} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      ))}
      {Array.from({ length: rest }, (_, k) => <line key={k} x1={groups * 28 + 3 + k * 7} x2={groups * 28 + 3 + k * 7} y1={3} y2={21} stroke={color} strokeWidth={2.2} strokeLinecap="round" className="animate-pop" />)}
    </svg>
  )
}

function DayCell({ day, w, counted, onTap, small, dark }: { day: number; w: Wx; counted?: boolean; onTap?: () => void; small?: boolean; dark: boolean }) {
  const cls = `relative flex flex-col items-center justify-center rounded-xl ring-1 transition ${small ? 'h-11 min-w-0' : 'h-14 min-w-12 active:scale-95'} ${dark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-sky-100'} ${counted ? 'opacity-40' : ''}`
  const body = (
    <>
      <span className={`absolute top-0.5 left-1.5 text-[10px] font-black ${dark ? 'text-slate-400' : 'text-slate-400'}`}>{day}</span>
      <WxIcon w={w} size={small ? 24 : 30} />
      {counted && <Check size={16} strokeWidth={3} className="absolute top-0.5 right-0.5 text-emerald-600" />}
    </>
  )
  return onTap ? (
    <button type="button" onClick={onTap} disabled={counted} className={cls} aria-label={`${day}. gün ${WX[w].label}${counted ? ', sayıldı' : ''}`}>{body}</button>
  ) : (
    <div className={cls} aria-label={`${day}. gün ${WX[w].label}`}>{body}</div>
  )
}

/* ───────────── 1. Günlükten grafiğe ───────────── */

interface CalData { city: string; month: string; cats: Wx[]; days: Wx[] }

function CalendarBuild({ api, d }: { api: Api; d: CalData }) {
  const ink = api.ink
  const [counted, setCounted] = useState<boolean[]>(() => d.days.map(() => false))
  const [vals, setVals] = useState(() => d.cats.map(() => 0))
  const [hl, setHl] = useState<number[]>([])
  const [ok, setOk] = useState(false)
  const truth = d.cats.map((c) => d.days.filter((x) => x === c).length)
  const tallies = d.cats.map((c) => d.days.filter((x, i) => x === c && counted[i]).length)
  const allCounted = counted.every(Boolean)
  const max = Math.max(8, Math.max(...truth) + 2)
  const check = () => {
    const wrong = d.cats.map((_, i) => i).filter((i) => vals[i] !== truth[i])
    setHl(wrong)
    if (!wrong.length) {
      api.check(true)
      api.clear()
      setOk(true)
      api.strategy(allCounted ? 'Çetele ile sayma' : 'Doğrudan sayma')
      api.say(`${d.city} günlüğü grafiğe döküldü! En uzun sütun: ${WX[d.cats[truth.indexOf(Math.max(...truth))]].short} günler.`)
      api.complete()
      return
    }
    api.check(false)
    const i = wrong[0]
    const c = WX[d.cats[i]]
    api.nudge(
      allCounted
        ? `${c.label} sütunu ${vals[i]} gösteriyor. Çetelede ${c.short} satırında kaç işaret var? Beşli demetleri say.`
        : `${c.label} sütunu ${vals[i]} gösteriyor. Takvimde kaç ${c.short} gün var? Saydığın günlere dokunursan çeteleye işaretlenir.`,
      { misc: allCounted ? 'Çetele sayısını sütun yüksekliğine aktaramadı' : undefined },
    )
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Panel ink={ink} title={`📅 ${d.city} · ${d.month} günlüğü`} right={<span className="text-xs font-bold" style={{ color: ink.soft }}>Günlere dokun, çeteleye işle</span>}>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {d.days.map((w, i) => (
              <DayCell key={i} day={i + 1} w={w} dark={ink.dark} counted={counted[i]} onTap={() => setCounted((c) => c.map((x, k) => (k === i ? true : x)))} />
            ))}
          </div>
        </Panel>
        <Panel ink={ink} title="✏️ Çetele tablosu">
          <div className="grid gap-1">
            {d.cats.map((c, i) => (
              <div key={c} className={`flex min-h-11 items-center gap-2 rounded-xl px-2 ${i % 2 ? '' : ink.dark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                <WxIcon w={c} size={26} />
                <span className="w-20 text-sm font-extrabold" style={{ color: ink.text }}>{WX[c].label}</span>
                <TallyMarks n={tallies[i]} color={wxColor(c, ink.dark)} />
              </div>
            ))}
          </div>
          {allCounted && <p className="mt-2 text-center text-xs font-black text-emerald-600">Bütün günler çeteleye işlendi.</p>}
        </Panel>
      </div>
      <Panel ink={ink} title="📊 Sütun grafiğini çiz">
        <BarChart ink={ink} cats={d.cats.map((c) => ({ label: WX[c].label, wx: c }))} series={[{ values: vals }]} max={max} step={1} labelStep={2} unit="gün" hl={hl} edit={ok ? undefined : { snap: 1, onChange: (i, v) => { setVals((cur) => cur.map((x, k) => (k === i ? v : x))); setHl((h) => h.filter((x) => x !== i)) } }} />
        {!ok && <div className="mt-2 flex justify-center"><PrimaryBtn onClick={check}><ClipboardCheck size={18} />Grafiği kontrol et</PrimaryBtn></div>}
      </Panel>
    </div>
  )
}

function makeCal(): CalData {
  const v = pick([
    { city: 'Erzurum', month: 'Mart', r: [[4, 6], [3, 5], [1, 3], [3, 5]] },
    { city: 'Kars', month: 'Mart', r: [[3, 5], [4, 6], [1, 2], [3, 5]] },
    { city: 'Ankara', month: 'Şubat', r: [[5, 7], [3, 5], [2, 4], [2, 3]] },
  ])
  const cats: Wx[] = ['gunesli', 'bulutlu', 'yagmurlu', 'karli']
  const counts = v.r.map(([a, b]) => rint(a, b))
  const days = shuffle(cats.flatMap((c, i) => Array.from({ length: counts[i] }, () => c)))
  return { city: v.city, month: v.month, cats, days }
}

/* ───────────── 2. Ölçek seç ───────────── */

const SEASONS = [
  { label: 'İlkbahar', color: '#16a34a' },
  { label: 'Yaz', color: '#f59e0b' },
  { label: 'Sonbahar', color: '#ea580c' },
  { label: 'Kış', color: '#3b82f6' },
]
const SCALES = [1, 2, 3, 4, 5, 6, 10]

function ScaleBuild({ api, values }: { api: Api; values: number[] }) {
  const ink = api.ink
  const [s, setS] = useState<number | null>(null)
  const [vals, setVals] = useState(() => values.map(() => 0))
  const [hl, setHl] = useState<number[]>([])
  const [got, setGot] = useState<number[]>([])
  const max = Math.max(...values)
  const choose = (k: number) => {
    setS(k)
    setVals(values.map(() => 0))
    setHl([])
    api.clear()
  }
  const check = () => {
    if (s === null) return
    if (max > 10 * s) {
      api.check(false)
      api.nudge(`En kalabalık mevsimi ${max} öğrenci seçti ama kâğıdın tepesi ${10 * s} öğrenci. Her kare daha çok öğrenciyi gösterse ne olur?`, { misc: 'Ölçeği en büyük veriye göre seçmedi' })
      return
    }
    const half = s / 2
    const bad = values.findIndex((v) => Math.abs(v / half - Math.round(v / half)) > 1e-9)
    if (bad >= 0) {
      api.check(false)
      api.nudge(`Her kare ${s} öğrenciyse ${values[bad]} öğrenci kaç kare eder? Sütunun tepesi bir çizgiye ya da iki çizginin tam ortasına denk geliyor mu? Bütün sayıları rahatça gösteren bir ölçek dene.`, { misc: 'Ölçek bazı değerleri tam göstermiyor' })
      return
    }
    const wrong = values.map((_, i) => i).filter((i) => Math.abs(vals[i] - values[i]) > 1e-9)
    setHl(wrong)
    if (wrong.length) {
      api.check(false)
      const i = wrong[0]
      api.nudge(`${SEASONS[i].label} sütunu ${f(vals[i])} gösteriyor; tabloda ${values[i]}. Her kare ${s} öğrenciyse ${values[i]} öğrenci kaç kare olmalı?`)
      return
    }
    api.check(true)
    const fresh = api.found(`olcek-${s}`, `1 kare = ${s} öğrenci`)
    if (!fresh) return api.nudge('Bu ölçeği zaten buldun. Başka bir ölçek seç!', { tone: 'ok' })
    const n = got.length + 1
    setGot((g) => [...g, s])
    api.strategy(s * 10 >= max && s * 10 - max < s * 3 ? 'En büyük değeri kâğıda sığdırma' : 'Bütün değerleri bölen ölçek arama')
    if (n >= 2) {
      api.clear()
      api.say('İki farklı ölçek, aynı veri! Sütunların birbirine göre boyları hiç değişmedi.')
      api.complete()
    } else {
      api.say('Harika ölçek! Aynı veriyi başka bir ölçekle de çizebilir misin?')
      api.nudge('Güzel! Şimdi başka bir ölçek seç ve aynı veriyi yeniden çiz.', { tone: 'ok' })
    }
  }
  return (
    <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        <Panel ink={ink} title="🗒️ Anket: En sevdiğin mevsim">
          <table className="w-full text-[15px] font-extrabold tabular-nums" style={{ color: ink.text }}>
            <tbody>
              {SEASONS.map((m, i) => (
                <tr key={m.label} className={i % 2 ? '' : ink.dark ? 'bg-white/[0.04]' : 'bg-slate-50'}>
                  <td className="py-1.5 pl-2"><span className="mr-1.5 inline-block size-3 rounded-full align-middle" style={{ background: m.color }} />{m.label}</td>
                  <td className="py-1.5 pr-2 text-right">{values[i]}</td>
                </tr>
              ))}
              <tr><td className="py-1.5 pl-2 text-xs font-black opacity-70">Toplam</td><td className="py-1.5 pr-2 text-right text-xs font-black opacity-70">{values.reduce((a, b) => a + b, 0)} öğrenci</td></tr>
            </tbody>
          </table>
        </Panel>
        <Panel ink={ink} title="📏 Ölçek: 1 kare kaç öğrenci?">
          <div className="grid grid-cols-4 gap-1.5">
            {SCALES.map((k) => (
              <button key={k} type="button" onClick={() => choose(k)} aria-pressed={s === k} className={`relative min-h-12 rounded-xl text-lg font-black ring-1 transition active:scale-95 ${s === k ? (ink.dark ? 'bg-cyan-500 text-slate-950 ring-cyan-400' : 'bg-cyan-600 text-white ring-cyan-600') : ink.dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
                {k}
                {got.includes(k) && <Check size={14} strokeWidth={3} className="absolute top-1 right-1 text-emerald-500" />}
              </button>
            ))}
          </div>
          {s !== null && <p className="mt-2 text-center text-xs font-extrabold" style={{ color: ink.soft }}>Kâğıtta 10 kare var: tepesi {10} × {s} = {10 * s} öğrenci</p>}
        </Panel>
      </div>
      <Panel ink={ink} title={s === null ? '📊 Önce bir ölçek seç' : `📊 1 kare = ${s} öğrenci`}>
        {s === null ? (
          <div className="grid min-h-60 place-items-center rounded-xl text-center text-sm font-extrabold" style={{ color: ink.soft, background: ink.dark ? '#0f1a30' : '#f8fbff' }}>
            <p>Grafik kâğıdında yalnızca 10 kare var.<br />Soldan bir ölçek seç.</p>
          </div>
        ) : (
          <>
            <BarChart key={s} ink={ink} cats={SEASONS.map((m) => ({ label: m.label, color: m.color }))} series={[{ values: vals }]} max={10 * s} step={s} labelStep={s} unit="öğrenci" hl={hl} edit={{ snap: s === 1 ? 1 : s / 2, onChange: (i, v) => { setVals((cur) => cur.map((x, k) => (k === i ? v : x))); setHl((h) => h.filter((x) => x !== i)) } }} />
            <div className="mt-2 flex justify-center"><PrimaryBtn onClick={check}><ClipboardCheck size={18} />Grafiği kontrol et</PrimaryBtn></div>
          </>
        )}
      </Panel>
    </div>
  )
}

/* ───────────── 3. İki şehir, bir fark ───────────── */

interface TwoData { cats: Wx[]; trabzon: number[]; izmir: number[] }

function TwoCities({ api, d }: { api: Api; d: TwoData }) {
  const ink = api.ink
  const [step, setStep] = useState(0)
  const [tried, setTried] = useState<number[]>([])
  const yi = d.cats.indexOf('yagmurlu')
  const T = d.trabzon[yi], I = d.izmir[yi]
  const diffs = d.cats.map((_, i) => Math.abs(d.trabzon[i] - d.izmir[i]))
  const closest = diffs.indexOf(Math.min(...diffs))
  const pickCat = (i: number) => {
    if (step !== 1) return
    if (i === closest) {
      api.check(true)
      api.clear()
      setStep(2)
      api.say(`${WX[d.cats[i]].label} günlerde iki şehrin sütunları neredeyse aynı boyda: fark yalnızca ${diffs[i]}.`)
      api.complete()
    } else {
      api.check(false)
      setTried((t) => [...t, i])
      api.nudge(`${WX[d.cats[i]].label} sütunlarının arasında ${diffs[i]} günlük fark var. Boyları birbirine daha yakın olan iki sütun var mı? Bir sütuna dokunup çizgiyi diğerine taşı.`)
    }
  }
  return (
    <div className="grid gap-3">
      <StepBar ink={ink} steps={['Farkı bul', 'Karşılaştır']} at={step} />
      <Panel ink={ink} title="📊 Kasım ayı: 30 günün havası">
        <BarChart ink={ink} cats={d.cats.map((c) => ({ label: WX[c].label, wx: c }))} series={[{ name: 'Trabzon', color: ink.dark ? '#34d399' : '#059669', values: d.trabzon }, { name: 'İzmir', color: ink.dark ? '#fb923c' : '#ea580c', values: d.izmir }]} max={20} step={1} labelStep={2} unit="gün" refTap />
      </Panel>
      {step === 0 && (
        <Panel ink={ink}>
          <Ask
            api={api}
            q="Trabzon’da İzmir’e göre kaç gün daha fazla yağmur yağdı?"
            unit="gün"
            judge={(v) => {
              if (v === T - I) return true
              if (v === T + I) return { q: 'İki sayıyı topladın mı? “Kaç gün fazla” sorusu iki sütunun arasındaki farkı soruyor. İzmir’in yağmurlu sütununa dokun: kesikli çizgiden Trabzon’un sütun tepesine kaç kare var?', misc: 'Karşılaştırmada farkı değil toplamı aldı' }
              if (v === T || v === I) return { q: 'Bu, şehirlerden birinin yağmurlu gün sayısı. İki sütun arasındaki farkı nasıl görebilirsin? Kısa sütuna dokunup çizginin üstünde kalan parçayı say.' }
              return { q: `Trabzon’un yağmurlu sütunu ${T}, İzmir’inki ${I}. Kısa sütunun tepesinden uzun sütunun tepesine kaç gün var?` }
            }}
            onOk={() => {
              api.say(`Doğru: Trabzon’da ${T - I} gün daha fazla yağmur yağdı.`)
              setStep(1)
            }}
          />
        </Panel>
      )}
      {step >= 1 && (
        <Panel ink={ink} className="animate-fade-up">
          <p className="mb-2 text-base font-black sm:text-lg" style={{ color: ink.text }}>Hangi hava türünde iki şehrin gün sayıları birbirine en yakın?</p>
          <div className="grid grid-cols-3 gap-2">
            {d.cats.map((c, i) => (
              <button key={c} type="button" disabled={step > 1 || tried.includes(i)} onClick={() => pickCat(i)} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-sm font-extrabold ring-1 transition active:scale-95 ${step > 1 && i === closest ? 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500' : tried.includes(i) ? 'opacity-40 ' + (ink.dark ? 'bg-slate-800 ring-slate-700 text-slate-400' : 'bg-slate-50 ring-slate-200') : ink.dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
                <WxIcon w={c} size={30} />{WX[c].label}
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

function makeTwo(): TwoData {
  const cats: Wx[] = ['gunesli', 'bulutlu', 'yagmurlu']
  for (;;) {
    const ty = rint(12, 16), tb = rint(8, 10)
    const iy = rint(4, 7), ib = tb + pick([-1, 1, 2])
    const tg = 30 - ty - tb, ig = 30 - iy - ib
    const trabzon = [tg, tb, ty], izmir = [ig, ib, iy]
    const diffs = cats.map((_, i) => Math.abs(trabzon[i] - izmir[i]))
    const m = Math.min(...diffs)
    if (diffs.filter((x) => x === m).length === 1 && diffs.indexOf(m) === 1 && ig <= 20) return { cats, trabzon, izmir }
  }
}

/* ───────────── 4. Yarın nasıl olacak? ───────────── */

interface PredData { days: Wx[]; g: number; b: number; y: number }

function Predict({ api, d }: { api: Api; d: PredData }) {
  const ink = api.ink
  const [conclusions] = useState<Opt[]>(() =>
    shuffle([
      { t: 'Yarın kesinlikle güneşli olacak.', ok: false, fb: 'Temmuz’da hiç bulutlu ya da yağmurlu gün olmamış mı? Veriye bakınca “kesin” diyebilir miyiz?', misc: 'Olası olanı kesin sandı' },
      { t: 'Yarın güneşli olma olasılığı yüksek.', ok: true },
      { t: 'Yarın büyük olasılıkla yağmur yağacak.', ok: false, fb: 'Yağmurlu sütun ne kadar uzun? Temmuz’da kaç gün yağmur yağmış?' },
      { t: 'Veriler yarın hakkında hiçbir ipucu vermez.', ok: false, fb: '31 günün çoğunda hava nasıldı? Bu, yarın için bir ipucu olamaz mı?', misc: 'Veriden tahmin yapılamayacağını düşündü' },
    ]),
  )
  const [cards] = useState<Opt[]>(() =>
    shuffle([
      { t: `31 günün ${poss(d.g)} güneşliydi.`, ok: true, s: `${d.g}/31 gün güneşli` },
      { t: 'Grafikte en uzun sütun, güneşli günlerin sütunu.', ok: true, s: 'En uzun sütun' },
      { t: 'Ayın son 7 gününün hepsi güneşliydi.', ok: true, s: 'Son 7 gün güneşli' },
      { t: 'Temmuz’da hiç karlı gün olmadı.', ok: false, fb: 'Bu doğru, ama yarının güneşli olacağını mı gösteriyor? Karlı olmasa da bulutlu ya da yağmurlu olabilirdi.' },
      { t: 'Ben güneşli havayı çok severim.', ok: false, fb: 'Bu bir görüş mü, yoksa veriden çıkan bir bilgi mi?', misc: 'Kişisel görüşü kanıt sandı' },
      { t: `Temmuz’da ${d.b} gün bulutluydu.`, ok: false, fb: 'Bu bilgi tek başına güneşli tahminini destekliyor mu? Diğer günlerle karşılaştırmadan ne söyleyebiliriz?' },
    ]),
  )
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel ink={ink} title="📅 Antalya · Temmuz (31 gün)">
          <div className="grid grid-cols-7 gap-1">
            {d.days.map((w, i) => <DayCell key={i} day={i + 1} w={w} small dark={ink.dark} />)}
          </div>
        </Panel>
        <Panel ink={ink} title="📊 Temmuz özeti">
          <BarChart ink={ink} cats={(['gunesli', 'bulutlu', 'yagmurlu'] as Wx[]).map((c) => ({ label: WX[c].label, wx: c }))} series={[{ values: [d.g, d.b, d.y] }]} max={32} step={2} labelStep={4} unit="gün" />
        </Panel>
      </div>
      <Panel ink={ink}>
        <EvidenceBoard api={api} keyPrefix="tahmin" question="1 Ağustos için hava tahminin ne?" conclusions={conclusions} cards={cards} goal={2} cardsTitle="Tahminini destekleyen 2 kanıt kartı seç" onDone={() => { api.say('Tahminin verilerle gerekçelendirildi!'); api.complete() }} />
      </Panel>
    </div>
  )
}

function makePred(): PredData {
  const y = rint(0, 1)
  const g = rint(26, 28)
  const b = 31 - g - y
  const early = shuffle([...Array(g - 7).fill('gunesli'), ...Array(b).fill('bulutlu'), ...Array(y).fill('yagmurlu')] as Wx[])
  return { days: [...early, ...Array(7).fill('gunesli')] as Wx[], g, b, y }
}

/* ───────────── 5. Yorum avcısı ───────────── */

function Claims({ api, d }: { api: Api; d: { g: number; b: number; y: number; k: number } }) {
  const ink = api.ink
  const cats: Wx[] = ['gunesli', 'bulutlu', 'yagmurlu', 'karli']
  const [items] = useState(() =>
    shuffle([
      { t: 'Mart’ta en çok görülen hava güneşliydi.', bin: 0, fb: 'Hangi sütun en uzun? Güneşli sütunu diğerleriyle karşılaştır.' },
      { t: `Yağmurlu günler, karlı günlerden ${d.y - d.k} fazla.`, bin: 0, fb: `Yağmurlu sütun ${d.y}, karlı sütun ${d.k}. Aradaki fark kaç?` },
      { t: 'Bulutlu günler, güneşli günlerden fazla.', bin: 1, fb: 'Bulutlu ve güneşli sütunları yan yana düşün: hangisi daha uzun?' },
      { t: 'Ayın yarısından fazlası güneşliydi.', bin: 1, fb: `31 günün yarısı kaç gün eder? Güneşli gün ${d.g}: yarıdan fazla mı?`, misc: '“En çok” ile “yarıdan fazla”yı karıştırdı' },
      { t: 'Karlı günlerde okullar tatil edildi.', bin: 2, fb: 'Grafikte okullarla ilgili bir bilgi var mı? Grafik bunu doğrulayabilir ya da yalanlayabilir mi?', misc: 'Grafikte olmayan bilgiyi grafikle değerlendirdi' },
      { t: 'Nisan’da da en çok güneşli gün olacak.', bin: 2, fb: 'Grafik hangi ayın verisini gösteriyor? Nisan hakkında kesin bir şey söyleyebilir mi?' },
    ]),
  )
  return (
    <div className="grid gap-3">
      <Panel ink={ink} title="📊 Ankara · Mart (31 gün)">
        <BarChart ink={ink} cats={cats.map((c) => ({ label: WX[c].label, wx: c }))} series={[{ values: [d.g, d.b, d.y, d.k] }]} max={16} step={1} labelStep={2} unit="gün" />
      </Panel>
      <Panel ink={ink} title="🗣️ Stajyerlerin yorumları">
        <Sorter
          api={api}
          items={items}
          bins={[
            { label: 'Grafik destekliyor', icon: '✔️', tone: 'ok' },
            { label: 'Grafik desteklemiyor', icon: '✖️', tone: 'no' },
            { label: 'Grafikten bilemeyiz', icon: '❔', tone: 'q' },
          ]}
          onDone={() => { api.say('Bütün yorumlar ayıklandı! Bazı soruların cevabı grafikte yoktur.'); api.complete() }}
        />
      </Panel>
    </div>
  )
}

function makeClaims() {
  for (;;) {
    const g = rint(11, 13), b = rint(8, 10), y = rint(5, 7)
    const k = 31 - g - b - y
    if (k >= 2 && k < y && b < g) return { g, b, y, k }
  }
}

/* ───────────── 6. Kayıp günlük: ipuçlarından grafik ───────────── */

const CLUE_CATS: Wx[] = ['gunesli', 'bulutlu', 'yagmurlu']

function LostLog({ api, total }: { api: Api; total: number }) {
  const ink = api.ink
  const [vals, setVals] = useState([0, 0, 0])
  const [found, setFound] = useState<string[]>([])
  const [hl, setHl] = useState<number[]>([])
  const [g, b, y] = vals
  const s = g + b + y
  const clues = [
    { t: `Kayıt ${total} gün sürdü; hiç karlı gün olmadı.`, ok: s === total },
    { t: 'En çok güneşli gün oldu.', ok: g > b && g > y },
    { t: 'Yağmurlu günler, bulutlu günlerin yarısı kadar.', ok: b > 0 && y * 2 === b },
    { t: 'Her hava türünden (karlı hariç) en az 1 gün var.', ok: g > 0 && b > 0 && y > 0 },
  ]
  const save = () => {
    if (s !== total) {
      api.check(false)
      setHl([])
      return api.nudge(`Sütunların toplamı ${s} gün. Kayıt kaç gün sürmüştü? Hangi sütunu değiştirirsen öteki ipuçları bozulmaz?`)
    }
    if (!(g > 0 && b > 0 && y > 0)) {
      api.check(false)
      setHl(vals.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0))
      return api.nudge('Her hava türünden en az 1 gün olmalı. Boş kalan sütun var mı?')
    }
    if (y * 2 !== b) {
      api.check(false)
      setHl([1, 2])
      return api.nudge(b % 2 ? `Bulutlu ${b} gün. ${b} günün yarısı tam bir gün sayısı olur mu? Bulutlu gün sayısı nasıl bir sayı olmalı?` : `Bulutlu ${b} gün ise yağmurlu kaç gün olmalı? “Yarısı kadar” ne demek?`, { misc: b % 2 ? undefined : '“Yarısı kadar” ilişkisini kuramadı' })
    }
    if (!(g > b && g > y)) {
      api.check(false)
      setHl([0])
      return api.nudge('Güneşli sütun en uzun sütun mu? Bulutlu günleri azaltırsan güneşli günlere ne olur?')
    }
    setHl([])
    api.check(true)
    const key = `${g}-${b}-${y}`
    const fresh = api.found(key, `Güneşli ${g}, bulutlu ${b}, yağmurlu ${y}`)
    if (!fresh) return api.nudge('Bu grafiği zaten buldun. İpuçlarına uyan başka bir grafik var mı?', { tone: 'ok' })
    const n = found.length + 1
    setFound((x) => [...x, key])
    if (n >= 2) {
      api.clear()
      api.say('Birden çok grafik bütün ipuçlarına uyuyor! Bilgi eksikse tek bir doğru cevap olmayabilir.')
      api.complete()
    } else {
      api.say('Bu grafik bütün ipuçlarına uyuyor! Başka bir grafik de uyabilir mi?')
      api.nudge('Harika! İpuçlarına uyan başka bir grafik daha bulabilir misin? Bulutlu gün sayısını değiştirmeyi dene.', { tone: 'ok' })
    }
  }
  return (
    <div className="grid gap-3 md:grid-cols-[250px_minmax(0,1fr)]">
      <Panel ink={ink} title="🔎 Günlükten kalan ipuçları">
        <ul className="grid gap-1.5">
          {clues.map((c, i) => (
            <li key={i} className={`flex items-start gap-2 rounded-xl px-2.5 py-2 text-[14px] leading-snug font-extrabold ring-1 ${c.ok ? (ink.dark ? 'bg-emerald-500/10 text-emerald-100 ring-emerald-500/40' : 'bg-emerald-50 text-emerald-900 ring-emerald-200') : ink.dark ? 'bg-slate-800 text-slate-200 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-black ${c.ok ? 'bg-emerald-500 text-white' : ink.dark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>{c.ok ? <Check size={12} strokeWidth={3.5} /> : i + 1}</span>
              {c.t}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <Chip ink={ink} tone={s === total ? 'ok' : 'plain'}>Toplam: {s} gün</Chip>
        </div>
      </Panel>
      <Panel ink={ink} title="📊 Kayıp grafiği yeniden çiz">
        <BarChart ink={ink} cats={CLUE_CATS.map((c) => ({ label: WX[c].label, wx: c }))} series={[{ values: vals }]} max={total} step={1} labelStep={2} unit="gün" hl={hl} edit={{ snap: 1, onChange: (i, v) => { setVals((cur) => cur.map((x, k) => (k === i ? v : x))); setHl([]) } }} />
        <div className="mt-2 flex justify-center"><PrimaryBtn onClick={save}><ClipboardCheck size={18} />Grafiği kaydet</PrimaryBtn></div>
      </Panel>
    </div>
  )
}

/* ───────────── Görev listesi ───────────── */

export function makeG5(): Mission[] {
  const cal = makeCal()
  const seasonVals = shuffle([6, 12, 18, 24])
  const two = makeTwo()
  const pred = makePred()
  const cl = makeClaims()
  const total = 20
  return [
    {
      key: 'g5-takvim',
      tool: { id: 'grafiklab', title: 'Grafik Çizim Laboratuvarı' },
      title: 'Günlükten grafiğe',
      prompt: `${cal.city} istasyonu ${cal.month} ayının ilk ${cal.days.length} gününün havasını kaydetti. Karışık günlüğü düzenle: günleri çeteleye işle, sonra sütun grafiğini çiz.`,
      hints: ['Takvimde kaç tane güneşli gün var? Saydığın günlere dokunursan çetele tablosuna işaretlenir.', 'Çetelede her çizgi bir gündür. Beşli demetleri saymak işini kolaylaştırır.', 'Sütunun tepesi hangi çizgiye ulaşıyor? Soldaki sayıyı oku ve çeteleyle karşılaştır.'],
      note: 'Karışık takvim, düzenli grafik oldu: en uzun sütun, en sık görülen havayı bir bakışta gösteriyor.',
      render: (api) => <CalendarBuild api={api} d={cal} />,
    },
    {
      key: 'g5-olcek',
      tool: { id: 'grafiklab', title: 'Grafik Çizim Laboratuvarı' },
      title: 'Ölçek seç',
      prompt: '60 öğrenciye en sevdiği mevsim soruldu. Grafik kâğıdında yalnızca 10 kare var! Bir ölçek seç (1 kare kaç öğrenci?) ve grafiği çiz. Aynı veriyi 2 farklı ölçekle çizebilir misin?',
      hints: ['En kalabalık mevsimi kaç öğrenci seçti? 10 kare buna yetmeli.', 'Her kare 2 öğrenci olsa 10 kare kaç öğrenci eder? Yeterli mi?', 'Tablodaki bütün sayılar hangi sayılarla tam bölünüyor? Böyle bir ölçek sütunların tepesini çizgilere denk getirir.'],
      goal: 2,
      picker: { q: 'Ölçeği nasıl seçtin?', options: ['En büyük değeri kâğıda sığdırdım', 'Bütün değerleri bölen bir sayı aradım', 'Deneyerek buldum'] },
      note: 'Aynı veri farklı ölçeklerle çizilebilir. Ölçek değişince sütunların sayısal etiketleri değişir ama birbirlerine göre boyları değişmez.',
      render: (api) => <ScaleBuild api={api} values={seasonVals} />,
    },
    {
      key: 'g5-iki-sehir',
      tool: { id: 'numberline', config: { min: 0, max: 20, step: 1 }, title: 'Sayı doğrusunda fark' },
      title: 'İki şehir, bir fark',
      prompt: 'Kasım ayında Trabzon ve İzmir istasyonları her günün havasını kaydetti. Grafiği incele: bir sütuna dokununca tepesinden karşılaştırma çizgisi çekilir.',
      hints: ['İki yağmurlu sütundan hangisi daha uzun?', 'Kısa sütuna dokun. Kesikli çizginin üstünde, uzun sütundan kaç kare kalıyor?', 'Küçük sayıdan büyük sayıya ileri sayabilir ya da büyükten küçüğü çıkarabilirsin.'],
      picker: { q: 'Farkı nasıl buldun?', options: ['Kesikli çizgiyle kareleri saydım', 'Büyükten küçüğü çıkardım', 'Küçükten büyüğe ileri saydım'] },
      note: '“Kaç fazla?” sorusu iki miktar arasındaki farkı sorar. Grafikte bu fark, iki sütunun tepeleri arasındaki boşluktur.',
      render: (api) => <TwoCities api={api} d={two} />,
    },
    {
      key: 'g5-tahmin',
      tool: { id: 'grafiklab', title: 'Grafik Çizim Laboratuvarı' },
      title: 'Yarın nasıl olacak?',
      prompt: 'Antalya istasyonu Temmuz ayının her gününü kaydetti. Yarın (1 Ağustos) hava nasıl olur? Tahminini seç, sonra en az 2 kanıtla destekle.',
      hints: ['31 günün kaçı güneşliydi? Bu, ayın çoğu mu?', '“Kesin” ile “olası” arasında ne fark var? Temmuz’da hiç farklı hava olmuş mu?', 'Bir kanıt, verilerden çıkan bir bilgi olmalı. Hangi kartlar takvime ya da grafiğe dayanıyor?'],
      goal: 2,
      note: 'Veri bize neyin daha olası olduğunu söyler, kesin olanı değil. İyi bir tahmin verilerle gerekçelendirilir.',
      render: (api) => <Predict api={api} d={pred} />,
    },
    {
      key: 'g5-yorum',
      tool: { id: 'grafiklab', title: 'Grafik Çizim Laboratuvarı' },
      title: 'Yorum avcısı',
      prompt: 'Stajyerler Ankara’nın Mart grafiğine bakıp yorumlar yazdı. Her yorumu doğru kutuya yerleştir: Grafik destekliyor mu, desteklemiyor mu, yoksa grafikten bilemez miyiz?',
      hints: ['Yorumdaki sayıları grafikteki sütunlarla karşılaştır.', 'Grafikte yalnızca hava türleri ve gün sayıları var. Yorum başka bir şeyden mi söz ediyor?', '“Ayın yarısı” kaç gün eder? 31’i ikiye bölmeyi düşün.'],
      note: 'Bir grafik yalnızca gösterdiği veri hakkında bilgi verir. Grafikte olmayan bir şey için “bilemeyiz” demek de veriyle düşünmektir.',
      render: (api) => <Claims api={api} d={cl} />,
    },
    {
      key: 'g5-kayip',
      tool: { id: 'grafiklab', title: 'Grafik Çizim Laboratuvarı' },
      title: 'Kayıp günlük',
      prompt: `İstasyonun bir günlüğü kayboldu, yalnızca ipuçları kaldı! İpuçlarının hepsine uyan bir sütun grafiği çiz. Bütün ipuçlarına uyan 2 farklı grafik bulabilir misin?`,
      hints: ['Önce bulutlu ve yağmurlu sütunları birlikte düşün: bulutlu 4 olsaydı yağmurlu kaç olurdu?', `Bulutlu ve yağmurlu günleri belirleyince ${total} günden geriye kaç gün kalır? Bunlar hangi havaya aittir?`, 'Güneşli sütun hâlâ en uzun mu? Bulutlu günleri artırıp azaltarak başka bir grafik dene.'],
      goal: 2,
      picker: { q: 'Nasıl başladın?', options: ['Önce bulutlu ile yağmurluyu eşleştirdim', 'Toplamdan geriye çalıştım', 'Deneyerek düzelttim'] },
      note: 'Birden çok grafik bütün ipuçlarına uydu: bilgi eksik olduğunda tek bir doğru cevap olmayabilir. Her ipucu, olası grafikleri biraz daha azaltır.',
      render: (api) => <LostLog api={api} total={total} />,
    },
  ]
}
