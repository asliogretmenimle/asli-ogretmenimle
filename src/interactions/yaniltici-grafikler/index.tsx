import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Newspaper, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { ek } from '../../lib/generators'
import { sfx } from '../../lib/feedback'
import { Choice, LastTask, NextButton, Panel, Pill, Stepper, TopBar, Work, fmtN, shuffle, starsBy, useLook, useSay, type Look } from '../veri-toplama/kit'
import { Brush, DataChart, Headline, Pie3D, apparentShares, type Datum, type Slice } from './charts'

/**
 * 64. Yanıltıcı Grafikler (5–8)
 *  Aynı veri, farklı hikâyeler. Öğrenci önce “reklamcı” olup grafiği yanıltıcı yapar (eksen başlangıcı, simge büyütme,
 *  eşit olmayan aralık, seçilmiş zaman aralığı, en-boy oranı, 3B daire), sonra “editör” olup düzeltir ve gerekçelendirir.
 *  Canlı “gözün gördüğü / gerçek” ölçer ve gazete manşeti her hamlede güncellenir.
 */

type Task =
  | { kind: 'axis'; title: string }
  | { kind: 'picto'; k: 2 | 3; title: string }
  | { kind: 'uneven'; title: string }
  | { kind: 'cherry'; stories: Story[]; title: string }
  | { kind: 'aspect'; title: string }
  | { kind: 'pie'; title: string }
  | { kind: 'fix'; issues: Issue[]; title: string }
type Story = 'down' | 'up' | 'flat'
type Issue = 'trunc' | 'uneven' | 'cherry'
type Res = { first: boolean }

function tasksFor(grade: Grade): Task[] {
  const axis: Task = { kind: 'axis', title: grade <= 6 ? 'Seçim afişini sen hazırlıyorsun. Ece’nin oyları çok daha fazlaymış gibi görünsün!' : 'Reklam ajansındasın: A marka pilin B’den çok daha uzun dayandığını “gösteren” bir grafik yap.' }
  const fix = (issues: Issue[]): Task => ({ kind: 'fix', issues, title: 'Editör sensin: Bu haberdeki grafik okuru yanıltıyor. Hileleri bul ve düzelt.' })
  switch (grade) {
    case 5:
      return [axis, { kind: 'picto', k: 2, title: 'Gazete bisikletli sayısının 2 katına çıktığını resimle gösterdi. Resim doğru mu anlatıyor?' }, { kind: 'uneven', title: 'Bu grafikte bir hile saklı. Önce yorumla, sonra hileyi bul!' }, fix(['trunc', 'uneven'])]
    case 6:
      return [axis, { kind: 'picto', k: 3, title: 'Bisikletli sayısı 3 katına çıktı; gazete resmi 3 kat büyüttü. Göz neyi görür?' }, { kind: 'cherry', stories: ['down'], title: 'Kafe sahibi rakibini kötülemek istiyor. Aynı veriden “düşüş” manşeti çıkar!' }, fix(['trunc', 'uneven', 'cherry'])]
    case 7:
      return [axis, { kind: 'aspect', title: 'Ekmek fiyatı 6 ayda 10 TL’den 12 TL’ye çıktı. Aynı veriyle iki zıt manşet yap!' }, { kind: 'pie', title: '3B daire grafiğini eğip döndürerek %20’lik dilimi %25’likten büyük göster!' }, { kind: 'cherry', stories: ['down', 'up'], title: 'Aynı yıllık veriden iki zıt manşet çıkar: önce “düşüş”, sonra “patlama”.' }, fix(['trunc', 'uneven', 'cherry'])]
    default:
      return [axis, { kind: 'aspect', title: 'Ekmek fiyatı 6 ayda 10 TL’den 12 TL’ye çıktı. Aynı veriyle iki zıt manşet yap!' }, { kind: 'cherry', stories: ['down', 'up', 'flat'], title: 'Tek veri, üç hikâye: aralık seçerek “düşüş”, “patlama” ve “durgunluk” manşetleri çıkar.' }, { kind: 'pie', title: '3B daire grafiğini eğip döndürerek %20’lik dilimi %25’likten büyük göster!' }, fix(['trunc', 'uneven', 'cherry'])]
  }
}
const EMOJI: Record<Task['kind'], string> = { axis: '📊', picto: '🚲', uneven: '🪜', cherry: '🍒', aspect: '📈', pie: '🥧', fix: '🛠️' }

function Ask({ look, q, opts, onRight, onWrong }: { look: Look; q: string; opts: { t: string; ok: boolean; why?: string; mis?: string }[]; onRight: () => void; onWrong: (o: { t: string; why?: string; mis?: string }) => void }) {
  const [wrong, setWrong] = useState<string[]>([])
  const list = useMemo(() => shuffle(opts), [q])
  return (
    <div className="mt-3">
      <p className="mb-2 font-black"><MathText text={q} /></p>
      <div className="grid gap-2">
        {list.map((o) => <Choice key={o.t} look={look} text={o.t} state={wrong.includes(o.t) ? 'wrong' : 'idle'} disabled={wrong.includes(o.t)} onClick={() => { if (o.ok) onRight(); else { setWrong((w) => [...w, o.t]); onWrong(o) } }} />)}
      </div>
    </div>
  )
}

function Meter({ look, seen, real, a, b, lie }: { look: Look; seen: number; real: number; a: string; b: string; lie?: boolean }) {
  const lf = real > 1 ? (seen - 1) / (real - 1) : 1
  return (
    <div className={`grid gap-2 rounded-2xl p-3 ${look.soft}`}>
      <p className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>{a} sütunu ÷ {b} sütunu</p>
      <div className="flex items-center justify-between gap-2"><span className={`text-sm font-black ${look.muted}`}>👁️ Gözün gördüğü</span><span className="text-lg font-black text-amber-500 tabular-nums">{fmtN(seen, 1)} kat</span></div>
      <div className="flex items-center justify-between gap-2"><span className={`text-sm font-black ${look.muted}`}>🔢 Gerçekte</span><span className="text-lg font-black text-emerald-500 tabular-nums">{fmtN(real, 2)} kat</span></div>
      {lie && <div className="flex items-center justify-between gap-2"><span className={`text-sm font-black ${look.muted}`}>🤥 Yalan katsayısı</span><span className={`text-lg font-black tabular-nums ${lf > 1.2 ? 'text-rose-400' : 'text-emerald-500'}`}><MathText text={`[[${fmtN(seen - 1, 2)}/${fmtN(real - 1, 2)}]] ≈ ${fmtN(lf, 1)}`} /></span></div>}
    </div>
  )
}

// ───────────────────────── axis ─────────────────────────

function AxisTask({ grade, look, onDone }: { grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const young = grade <= 6
  const data: Datum[] = young ? [{ label: 'Ece', value: 52 }, { label: 'Mert', value: 48 }] : [{ label: 'A marka', value: 26 }, { label: 'B marka', value: 24 }]
  const [y0, setY0] = useState(0)
  const [phase, setPhase] = useState<'mislead' | 'fix' | 'why' | 'done'>('mislead')
  const misses = useRef(0)
  const [a, b] = [data[0].value, data[1].value]
  const seen = (a - y0) / (b - y0)
  const real = a / b
  const yMax = young ? 55 : 27
  const set = (v: number) => {
    setY0(v)
    if (phase === 'mislead' && (a - v) / (b - v) >= 3) {
      sfx.ok()
      setPhase('fix')
      track.strategy('Eksen başlangıcını kaydırdı')
      fb.say(`Oldu! Eksen ${ek(v, 'abl')} başlayınca ${data[0].label} ${fmtN((a - v) / (b - v), 1)} kat fazla görünüyor, oysa gerçekte yalnızca ${a - b} ${young ? 'oy' : 'saat'} fark var. Şimdi editörsün: grafiği dürüst yap.`, { tone: 'ok' })
    } else if (phase === 'fix' && v === 0) {
      sfx.ok()
      setPhase('why')
      fb.clear()
    }
  }
  const head = seen >= 2.5 ? (young ? 'Ece açık ara önde!' : 'A marka pil rakibini ezdi geçti!') : seen >= 1.4 ? (young ? 'Ece önde' : 'A marka pil daha uzun dayanıyor') : young ? 'Ece ile Mert başa baş' : 'İki pil neredeyse aynı'
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <Headline text={head} tone={seen >= 2.5 ? 'hot' : 'calm'} />
          <div className={`mt-3 rounded-2xl p-2 ${look.dark ? 'bg-slate-900/60' : 'bg-white'}`}>
            <DataChart look={look} data={data} type="bar" y0={y0} yMax={yMax} height={330} onY0={phase === 'done' || phase === 'why' ? undefined : set} y0Max={b - 1} unit={young ? 'oy' : 'saat'} breakMark title={young ? 'Okul başkanlığı seçimi' : 'Pil ömrü'} />
          </div>
          <p className={`mt-1 text-center text-sm font-bold ${look.muted}`}>Turuncu eksen düğmesini yukarı-aşağı sürükle (ya da panelden değiştir).</p>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'mislead' ? 'Reklamcı ol' : phase === 'fix' ? 'Editör ol' : 'Neden?'} icon={phase === 'mislead' ? '📣' : '🧐'}>
          <Meter look={look} seen={seen} real={real} a={data[0].label} b={data[1].label} lie={!young} />
          {(phase === 'mislead' || phase === 'fix') && (
            <div className="mt-3 flex flex-col items-center">
              <Stepper look={look} label="Eksen başlangıcı" value={y0} min={0} max={b - 1} onChange={set} />
              <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>{phase === 'mislead' ? `Hedef: ${data[0].label} sütunu, ${data[1].label} sütununun en az 3 katı uzun görünsün.` : 'Hedef: sütun boyları değerlerle orantılı olsun.'}</p>
            </div>
          )}
          {fb.node}
          {phase === 'why' && (
            <Ask look={look} q="Dürüst grafik neden şimdi daha dürüst?" opts={[
              { t: 'Sütun yükseklikleri artık değerlerle orantılı.', ok: true },
              { t: 'Çünkü artık fark hiç görünmüyor.', ok: false, why: 'Fark hâlâ görünüyor mu? Sütunların ucuna bak. Dürüst grafik farkı gizlemez; farkı olduğu kadar gösterir.' },
              { t: 'Eksen 0’dan başlamayınca sayılar yanlış yazılıyordu.', ok: false, why: 'Yanıltıcı grafikteki sayılar (52, 48) yanlış mıydı? Sorun sayılarda mı, sütunların boyunda mı?', mis: 'Yanıltıcı grafikte değerlerin yanlış olduğunu sandı (sorun orantıda)' },
            ]} onRight={() => { sfx.ok(); track.attempt(true); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! Sütun grafiğinde göz uzunlukları karşılaştırır. Eksen 0’dan başlamazsa uzunluklar değerlerle orantılı olmaz.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── picto ─────────────────────────

function Bike({ x, y, s, color = '#0891b2' }: { x: number; y: number; s: number; color?: string }) {
  // basit bisiklet simgesi (s × s kutu)
  const w = s / 100
  return (
    <g transform={`translate(${x} ${y}) scale(${w})`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={24} cy={66} r={18} />
      <circle cx={78} cy={66} r={18} />
      <path d="M24 66 L42 36 L66 36 L78 66 M42 36 L54 66 L66 36 M38 28 h12 M66 36 L62 24 h10" />
    </g>
  )
}

function PictoTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'picto' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const k = t.k
  const [phase, setPhase] = useState<'look' | 'build' | 'done'>('look')
  const [cnt, setCnt] = useState<[number, number]>([1, 1])
  const misses = useRef(0)
  const unit = 44
  const v1 = 10, v2 = 10 * k
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  const grid = look.dark ? '#475569' : '#cbd5e1'
  const save = () => {
    const ok = cnt[1] === cnt[0] * k
    track.attempt(ok)
    if (!ok) {
      misses.current++
      fb.say(`2019’da ${cnt[0]} simge, 2024’te ${cnt[1]} simge var. 2024’teki değer 2019’un ${k} katı. Simge sayıları da öyle mi? 1 simge kaç bin kişi ediyor?`, { mis: 'Resim grafiğinde simge sayısını değerlerle orantılı seçmedi' })
      return
    }
    const fresh = sols.add(`${cnt[0]}-${cnt[1]}`, `1 simge = ${fmtN(v1 / cnt[0], 2)} bin`)
    if (!fresh) return fb.say('Bu tasarımı zaten buldun. Bir simge başka bir değeri gösterse?')
    const n = sols.list.length + 1
    if (n >= 2) {
      track.item(misses.current === 0)
      setPhase('done')
      fb.say('Harika! Simgeler aynı boyda kalıp sayıları değerlerle orantılı olunca göz doğru karşılaştırır. Anahtar (1 simge = ?) farklı olabilir.', { tone: 'ok' })
    } else fb.say('Dürüst bir resim grafiği! Bir simgenin başka bir değeri gösterdiği ikinci bir tasarım yap.', { tone: 'ok' })
  }
  return (
    <Work
      scene={
        <Scene grade={grade}>
          {phase === 'look' ? (
            <svg viewBox="0 0 600 300" className="block w-full" role="img" aria-label="Büyütülmüş simge">
              {Array.from({ length: k }, (_, r) => Array.from({ length: k }, (_, c) => <rect key={`${r}-${c}`} x={300 + c * unit * 1.6} y={280 - (r + 1) * unit * 1.6} width={unit * 1.6} height={unit * 1.6} fill="none" stroke={grid} strokeDasharray="4 4" />))}
              <rect x={90} y={280 - unit * 1.6} width={unit * 1.6} height={unit * 1.6} fill="none" stroke={grid} strokeDasharray="4 4" />
              <Bike x={90} y={280 - unit * 1.6} s={unit * 1.6} />
              <Bike x={300} y={280 - k * unit * 1.6} s={k * unit * 1.6} color="#db2777" />
              <text x={90 + unit * 0.8} y={296} textAnchor="middle" fontSize={16} fontWeight={900} fill={ink}>2019: 10 bin</text>
              <text x={300 + (k * unit * 1.6) / 2} y={296} textAnchor="middle" fontSize={16} fontWeight={900} fill={ink}>2024: {v2} bin</text>
            </svg>
          ) : (
            <div className="space-y-3">
              {[0, 1].map((r) => (
                <div key={r} className={`flex items-center gap-3 rounded-2xl p-2 ${look.soft}`}>
                  <span className={`w-24 shrink-0 text-center font-black ${look.strong}`}>{r ? '2024' : '2019'}<br /><span className={`text-xs ${look.muted}`}>{r ? v2 : v1} bin</span></span>
                  <svg viewBox={`0 0 ${12 * 46} 46`} className="block min-w-0 flex-1" role="img" aria-label={`${cnt[r]} simge`}>
                    {Array.from({ length: cnt[r] }, (_, i) => <Bike key={i} x={i * 46} y={2} s={42} color={r ? '#db2777' : '#0891b2'} />)}
                  </svg>
                  <Stepper look={look} value={cnt[r]} min={1} max={12} onChange={(v) => setCnt((c) => (r ? [c[0], v] : [v, c[1]]))} compact />
                </div>
              ))}
              <p className={`text-center font-black ${look.strong}`}>Anahtar: 1 🚲 = {fmtN(v1 / cnt[0], 2)} bin kişi {cnt[1] * (v1 / cnt[0]) !== v2 && <span className="text-amber-500">(2024 satırı bu anahtara uymuyor)</span>}</p>
            </div>
          )}
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'look' ? 'Göz neyi görür?' : 'Dürüst resim grafiği yap'} icon="🚲">
          {phase === 'look' && (
            <Ask look={look} q={`Büyük bisiklet küçüğün ${k} katı yüksek ve ${k} katı geniş. Kâğıtta kaç katı yer kaplıyor?`} opts={[
              { t: `${k} katı`, ok: false, why: 'Arkadaki kesikli karelere bak. Küçük bisiklet 1 kare kaplıyor. Büyük bisiklet kaç kare kaplıyor?', mis: 'Simge büyütmede uzunluk ile alan ölçeğini karıştırdı' },
              { t: `${k * k} katı`, ok: true },
              { t: `${k * k * k} katı`, ok: false, why: 'Resim düz bir kâğıtta; derinliği yok. Yalnızca en ve boy büyüdü. Kareleri say.' },
            ]} onRight={() => { sfx.ok(); track.attempt(true); setPhase('build'); fb.say(`Evet! Veri ${k} katına çıktı ama resim ${k * k} kat yer kaplıyor; göz alanı görür ve farkı abartır. Şimdi aynı boy simgelerle dürüst bir resim grafiği yap.`, { tone: 'ok' }) }} onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {phase === 'build' && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>Her satırdaki simge sayısını ayarla. Simgeler hep aynı boyda. 2 farklı dürüst tasarım bul!</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Sparkles size={20} />Bu tasarımı kaydet</button>
            </>
          )}
          {fb.node}
          <SolutionList list={sols.list} goal={phase === 'look' ? undefined : 2} />
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── uneven ─────────────────────────

const BOOKS: Datum[] = [{ label: 'Ocak', value: 8 }, { label: 'Şubat', value: 12 }, { label: 'Mart', value: 40 }, { label: 'Nisan', value: 90 }]
const UNEVEN = [0, 10, 20, 50, 100]
function UnevenTask({ grade, look, onDone }: { grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [phase, setPhase] = useState<'q1' | 'find' | 'fix' | 'q2' | 'done'>('q1')
  const [fixed, setFixed] = useState(false)
  const [first, setFirst] = useState<string | null>(null)
  const misses = useRef(0)
  const pairs = ['Ocak → Şubat', 'Şubat → Mart', 'Mart → Nisan']
  const gaps = ['0–10', '10–20', '20–50', '50–100']
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className={`rounded-2xl p-2 ${look.dark ? 'bg-slate-900/60' : 'bg-white'}`}>
            <DataChart look={look} data={BOOKS} type="bar" y0={0} yMax={100} uneven={fixed ? undefined : UNEVEN} height={340} title="Kütüphaneden ödünç alınan kitap" unit="kitap" />
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'q1' ? 'Grafiği yorumla' : phase === 'find' ? 'Hileyi bul' : phase === 'fix' ? 'Düzelt' : 'Yeniden yorumla'} icon="🪜">
          {phase === 'q1' && (
            <>
              <p className="mb-2 font-black">Grafiğe bakınca hangi iki ay arasında artış en büyük görünüyor?</p>
              <div className="grid gap-2">{pairs.map((p) => <Choice key={p} look={look} text={p} onClick={() => { setFirst(p); setPhase('find'); fb.say('Şimdi y eksenindeki sayılara dikkatle bak. Aralıklar eşit mi?') }} />)}</div>
            </>
          )}
          {phase === 'find' && (
            <>
              <p className="mb-2 font-black">Ekranda hepsi aynı boyda olan bu aralıklardan hangisi hileli?</p>
              <div className="grid grid-cols-2 gap-2">{gaps.map((g, i) => <Choice key={g} look={look} className="!text-center" text={g} onClick={() => {
                const ok = i >= 2
                track.attempt(ok)
                if (ok) { sfx.ok(); setPhase('fix'); fb.say(`Evet! 0–10 ve 10–20 aralıkları 10’ar kitap, ama ${g} aralığı ${i === 2 ? 30 : 50} kitap; ekranda ise hepsi aynı boyda. Aralıkları eşitle!`, { tone: 'ok' }) }
                else { misses.current++; fb.say(`${g} aralığı kaç kitaplık? Ekranda kapladığı yer, ötekilerle karşılaştırınca uygun mu? Bir de 20–50 aralığına bak.`, { mis: 'Eşit olmayan eksen aralıklarını fark etmedi' }) }
              }} />)}</div>
            </>
          )}
          {phase === 'fix' && <button type="button" className="btn-primary mt-1 min-h-14 w-full text-lg" onClick={() => { setFixed(true); setPhase('q2'); fb.clear() }}><Wrench size={20} />Aralıkları eşitle</button>}
          {phase === 'q2' && (
            <Ask look={look} q="Dürüst grafikte hangi iki ay arasında artış en büyük?" opts={pairs.map((p, i) => ({ t: p, ok: i === 2, why: i === 1 ? 'Şubat → Mart artışı 12’den 40’a: 28 kitap. Mart → Nisan kaç kitap?' : 'Sütunların boyları arasındaki farka bak. Hangi iki sütun arasındaki fark en büyük?' }))}
              onRight={() => { sfx.ok(); track.attempt(true); track.item(misses.current === 0); setPhase('done'); fb.say(first === pairs[1] ? 'Evet! Yanıltıcı grafikte Şubat → Mart en büyük görünüyordu; aslında Mart → Nisan artışı (50 kitap) çok daha büyük. Aralıklar eşit olmayınca karşılaştırmalar bozulur.' : 'Evet! Mart → Nisan artışı 50 kitap. Eşit olmayan aralıklar karşılaştırmayı bozar; dürüst eksende eşit aralıklar eşit miktarları gösterir.', { tone: 'ok' }) }}
              onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!) }} />
          )}
          {fb.node}
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── cherry ─────────────────────────

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const CAFE: Datum[] = [12, 14, 13, 16, 18, 17, 15, 14, 16, 22, 24, 26].map((v, i) => ({ label: MONTHS[i], value: v }))
const STORY: Record<Story, string> = { down: 'Kafeye ilgi azalıyor! Müşteriler kaçıyor', up: 'Müşteri sayısı patladı!', flat: 'Kafede hiçbir şey değişmiyor' }
function storyOf(i0: number, i1: number): Story | null {
  const d = CAFE[i1].value - CAFE[i0].value
  if (d <= -2) return 'down'
  if (d >= 8) return 'up'
  if (Math.abs(d) <= 1 && i1 - i0 >= 4) return 'flat'
  return null
}
function CherryTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'cherry' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const [w, setW] = useState<[number, number]>([0, 3])
  const [phase, setPhase] = useState<'pick' | 'truth' | 'done'>('pick')
  const misses = useRef(0)
  const win = CAFE.slice(w[0], w[1] + 1)
  const mn = Math.min(...win.map((d) => d.value)), mx = Math.max(...win.map((d) => d.value))
  const st = storyOf(w[0], w[1])
  const want = st && t.stories.includes(st)
  const save = () => {
    if (!st || !want) {
      fb.say(st ? 'Bu manşet görevde istenmiyor. Başka bir aralık dene.' : `Bu aralıkta ${win[0].value} → ${win[win.length - 1].value} bin: belirgin bir hikâye yok. Aralığın başını ve sonunu değiştir.`)
      return
    }
    const fresh = sols.add(st, STORY[st])
    if (!fresh) return fb.say('Bu manşeti zaten çıkardın. Diğer hikâye için başka bir aralık seç.')
    track.strategy('Zaman aralığını seçerek hikâye değiştirdi')
    if (sols.list.length + 1 >= t.stories.length) {
      setPhase('truth')
      setW([0, 11])
      fb.say('Tüm manşetleri aynı veriden çıkardın! Şimdi bütün yılı gösteriyoruz.', { tone: 'ok' })
    } else fb.say('Manşet hazır! Şimdi aynı veriden zıt bir manşet çıkar.', { tone: 'ok' })
  }
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <Headline text={phase === 'pick' ? (st ? STORY[st] : `${win[0].label}–${win[win.length - 1].label}: ${win[0].value} bin → ${win[win.length - 1].value} bin`) : 'Kafe yılı rekorla kapattı: 12 binden 26 bine'} tone={st === 'up' || st === 'down' ? 'hot' : 'calm'} />
          <div className={`mt-3 rounded-2xl p-2 ${look.dark ? 'bg-slate-900/60' : 'bg-white'}`}>
            <DataChart look={look} data={win} type="line" y0={Math.max(0, mn - 2)} yMax={mx + 1} height={280} title="Aylık müşteri sayısı" unit="bin kişi" />
          </div>
          <p className={`mt-3 mb-1 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Tüm yıl — turuncu pencereyi ya da kenarlarını sürükle</p>
          <div className={`rounded-2xl p-1 ${look.dark ? 'bg-slate-900/60' : 'bg-white'}`}>
            <Brush look={look} data={CAFE} i0={w[0]} i1={w[1]} onChange={(a, b) => phase === 'pick' && setW([a, b])} />
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'pick' ? 'Aralık seç, manşet çıkar' : 'Gerçek hikâye'} icon="🍒">
          {phase === 'pick' && (
            <>
              <div className="flex flex-wrap gap-2">{t.stories.map((s) => <Pill key={s} look={look} tone={sols.list.some((x) => x.key === s) ? 'good' : 'plain'}>{sols.list.some((x) => x.key === s) ? '✓' : '○'} {s === 'down' ? 'Düşüş' : s === 'up' ? 'Patlama' : 'Durgunluk'}</Pill>)}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stepper look={look} label="Başlangıç" value={w[0]} min={0} max={w[1] - 2} show={MONTHS[w[0]]} onChange={(v) => setW([v, w[1]])} compact />
                <Stepper look={look} label="Bitiş" value={w[1]} min={w[0] + 2} max={11} show={MONTHS[w[1]]} onChange={(v) => setW([w[0], v])} compact />
              </div>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Newspaper size={20} />Bu manşeti yayımla</button>
            </>
          )}
          {phase === 'truth' && (
            <Ask look={look} q="Bütün yılı görünce gerçek hikâye ne?" opts={[
              { t: 'Yazın küçük bir düşüş olsa da yıl boyunca müşteri sayısı arttı (12 bin → 26 bin).', ok: true },
              { t: 'Kafe müşteri kaybediyor.', ok: false, why: 'Ocak ile aralığı karşılaştır. Yılın tamamında müşteri azaldı mı?', mis: 'Seçilmiş bir aralıktan genel sonuç çıkardı' },
              { t: 'İki manşet de doğru, hangisini istersen seçebilirsin.', ok: false, why: 'Manşetlerdeki sayılar doğruydu ama yalnız bir parçayı gösteriyordu. Okur bütün yılı bilseydi aynı sonuca varır mıydı?' },
            ]} onRight={() => { sfx.ok(); track.attempt(true); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! Verinin bir parçasını seçip göstermek (kiraz toplama) sayılar doğru olsa bile yanıltır. Grafiğin hangi zaman aralığını gösterdiğine her zaman bak.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {fb.node}
          <SolutionList list={sols.list} goal={t.stories.length} />
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── aspect ─────────────────────────

const BREAD: Datum[] = [10, 10.4, 10.9, 11.3, 11.6, 12].map((v, i) => ({ label: MONTHS[i], value: v }))
function AspectTask({ grade, look, onDone }: { grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const [h, setH] = useState(300)
  const [y0, setY0] = useState(0)
  const [yMax, setYMax] = useState(14)
  const [phase, setPhase] = useState<'make' | 'why' | 'done'>('make')
  const misses = useRef(0)
  const plotW = 600 - 76, plotH = h - 70
  const dx = plotW * (5 / 6)
  const dy = plotH * ((12 - 10) / (yMax - y0))
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI
  const story = ang >= 35 ? 'hot' : ang <= 6 ? 'calm' : null
  const head = story === 'hot' ? 'Ekmek fiyatı uçtu! Tavan yaptı' : story === 'calm' ? 'Ekmek fiyatlarında durgunluk' : 'Ekmek fiyatı 10 TL’den 12 TL’ye çıktı'
  const save = () => {
    if (!story) return fb.say(`Çizginin eğimi şu an yaklaşık ${fmtN(ang, 0)}°. “Uçtu” için çok dik (35° ve üstü), “durgunluk” için neredeyse yatay (6° ve altı) bir görünüm gerekiyor. Yüksekliği ve ekseni değiştir.`)
    const fresh = sols.add(story, story === 'hot' ? `“Uçtu!” (${fmtN(ang, 0)}°)` : `“Durgunluk” (${fmtN(ang, 0)}°)`)
    if (!fresh) return fb.say('Bu manşeti zaten yaptın. Şimdi zıttını dene!')
    track.strategy(story === 'hot' ? 'Ekseni kırpıp grafiği uzattı' : 'Ekseni genişletip grafiği bastırdı')
    if (sols.list.length + 1 >= 2) { setPhase('why'); fb.say('İki zıt manşet, tek veri! Hiçbir sayıyı değiştirmedin.', { tone: 'ok' }) }
    else fb.say('Manşet hazır! Şimdi aynı veriyle zıt bir manşet yap.', { tone: 'ok' })
  }
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <Headline text={head} tone={story === 'hot' ? 'hot' : 'calm'} />
          <div className={`mt-3 rounded-2xl p-2 ${look.dark ? 'bg-slate-900/60' : 'bg-white'}`}>
            <DataChart look={look} data={BREAD} type="line" y0={y0} yMax={yMax} height={h} onHeight={phase === 'make' ? setH : undefined} onY0={phase === 'make' ? setY0 : undefined} y0Max={10} title="Ekmek fiyatı (TL)" unit="TL" />
          </div>
          <p className={`mt-1 text-center text-sm font-bold ${look.muted}`}>Mavi tutamaçla ya da iki parmakla grafiği uzat/bastır; turuncu düğmeyle ekseni kaydır.</p>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'make' ? 'İki zıt manşet' : 'Hangisi dürüst?'} icon="📈">
          <div className={`flex items-center justify-between rounded-2xl p-3 ${look.soft}`}><span className={`text-sm font-black ${look.muted}`}>Çizginin görünen eğimi</span><span className="text-2xl font-black text-amber-500 tabular-nums">{fmtN(ang, 0)}°</span></div>
          <div className={`mt-2 flex items-center justify-between rounded-2xl p-3 ${look.soft}`}><span className={`text-sm font-black ${look.muted}`}>Gerçek değişim</span><span className="text-lg font-black text-emerald-500"><MathText text={`10 → 12 TL (%20)`} /></span></div>
          {phase === 'make' && (
            <>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <Stepper look={look} label="Yükseklik" value={h} min={140} max={620} step={40} onChange={setH} compact />
                <Stepper look={look} label="Eksen başı" value={y0} min={0} max={10} onChange={setY0} compact />
                <Stepper look={look} label="Eksen sonu" value={yMax} min={12} max={40} step={2} onChange={setYMax} compact />
              </div>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Newspaper size={20} />Bu manşeti yayımla</button>
            </>
          )}
          {phase === 'why' && (
            <Ask look={look} q="Hangi grafik dürüst?" opts={[
              { t: 'Görünüm tek başına karar verdirmez; dürüst grafik ekseni açıkça gösterir ve gerçek değişimi (%20) yazar.', ok: true },
              { t: 'Dik görünen grafik, çünkü fiyat gerçekten arttı.', ok: false, why: 'Fiyat arttı ama “uçtu” mu? %20’lik artış dik bir çizgiyle mi, yatık bir çizgiyle mi gösterilmeli? Bunu kim belirliyor?', mis: 'Çizgi grafiğinin görünen eğimini değişimin büyüklüğü sandı' },
              { t: 'Yatık görünen grafik, çünkü sayılar küçük.', ok: false, why: '2 TL ekmek için küçük mü? Yüzde olarak kaç artış? Görüntüyü bastırınca artış ortadan kalkar mı?' },
            ]} onRight={() => { sfx.ok(); track.attempt(true); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! Çizgi grafiğinin dikliği en-boy oranına ve eksen aralığına bağlıdır. Okurken eksendeki sayılara ve gerçek değişime bak.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {fb.node}
          <SolutionList list={sols.list} goal={2} />
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── pie ─────────────────────────

const SLICES: Slice[] = [
  { label: 'Spor', share: 0.3, color: '#7c3aed' },
  { label: 'Müzik', share: 0.25, color: '#0891b2' },
  { label: 'Sanat', share: 0.25, color: '#db2777' },
  { label: 'Bilim', share: 0.2, color: '#f59e0b' },
]
function PieTask({ grade, look, onDone }: { grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [tilt, setTilt] = useState(0)
  const [rot, setRot] = useState(0)
  const [phase, setPhase] = useState<'mislead' | 'fix' | 'why' | 'done'>('mislead')
  const misses = useRef(0)
  const ap = apparentShares(SLICES, tilt, rot)
  const upd = (tl: number, r: number) => {
    setTilt(tl)
    setRot(r)
    const a = apparentShares(SLICES, tl, r)
    if (phase === 'mislead' && a[3] > a[1] + 0.01) {
      sfx.ok()
      track.strategy('Dilimi öne alıp grafiği eğdi')
      setPhase('fix')
      fb.say(`Başardın! Bilim (%20) ekranda %${fmtN(a[3] * 100, 0)}, Müzik (%25) %${fmtN(a[1] * 100, 0)} yer kaplıyor. Şimdi editör ol: grafiği yeniden dürüst yap.`, { tone: 'ok' })
    } else if (phase === 'fix' && tl === 0) {
      sfx.ok()
      setPhase('why')
      fb.clear()
    }
  }
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <p className={`mb-1 text-center font-black ${look.strong}`}>Öğrencilerin seçtiği kulüpler</p>
          <Pie3D look={look} slices={SLICES} tilt={tilt} rot={rot} onTilt={(v) => phase !== 'why' && phase !== 'done' && upd(v, rot)} onRot={(v) => phase !== 'why' && phase !== 'done' && upd(tilt, v)} />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SLICES.map((s, i) => (
              <div key={s.label} className={`rounded-2xl p-2 text-center ${look.soft}`}>
                <p className="font-black" style={{ color: s.color }}>{s.label}</p>
                <p className={`text-xs font-bold ${look.muted}`}>gerçek %{fmtN(s.share * 100)}</p>
                <p className={`text-lg font-black tabular-nums ${Math.abs(ap[i] - s.share) > 0.03 ? 'text-amber-500' : look.strong}`}>👁️ %{fmtN(ap[i] * 100, 0)}</p>
              </div>
            ))}
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'mislead' ? 'Reklamcı ol' : phase === 'fix' ? 'Editör ol' : 'Neden?'} icon="🥧">
          {(phase === 'mislead' || phase === 'fix') && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>{phase === 'mislead' ? 'Hedef: Bilim dilimi ekranda Müzik diliminden büyük görünsün. Grafiği parmağınla eğ ve döndür.' : 'Hedef: Her dilim gerçek payı kadar yer kaplasın.'}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <Stepper look={look} label="Eğim" value={tilt} min={0} max={70} step={10} show={`${tilt}°`} onChange={(v) => upd(v, rot)} compact />
                <Stepper look={look} label="Döndür" value={rot} min={-360} max={720} step={15} show={`${((rot % 360) + 360) % 360}°`} onChange={(v) => upd(tilt, ((v % 360) + 360) % 360)} compact />
              </div>
            </>
          )}
          {phase === 'why' && (
            <Ask look={look} q="3B daire grafiği neden yanıltır?" opts={[
              { t: 'Eğim arkadaki dilimleri küçültür; öndeki dilimlerin yan yüzü de görünüp onları büyütür.', ok: true },
              { t: 'Yüzdeler yanlış hesaplanmıştır.', ok: false, why: 'Yüzdeleri değiştirdin mi? Yalnızca grafiği eğip döndürdün. Peki ekranda kapladıkları yer neden değişti?', mis: 'Görsel çarpıtmayı veri hatasıyla karıştırdı' },
              { t: 'Renkler göz yanılması yapar.', ok: false, why: 'Renkler hiç değişmedi. Eğince hangi dilimlerin yan yüzü göründü?' },
            ]} onRight={() => { sfx.ok(); track.attempt(true); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! Daire grafiğinde açılar ve alanlar payları gösterir; 3B görünüm bu orantıyı bozar. Dürüst daire grafiği düzdür.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {fb.node}
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0 })} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── fix ─────────────────────────

const AYRAN: Datum[] = [{ label: 'Pzt', value: 40 }, { label: 'Sal', value: 47 }, { label: 'Çar', value: 45 }, { label: 'Per', value: 43 }, { label: 'Cum', value: 49 }]
type Tool = Issue | 'color' | '3d'
const TOOLS: { id: Tool; label: string; why?: string }[] = [
  { id: 'trunc', label: 'Ekseni 0’dan başlat' },
  { id: 'uneven', label: 'Aralıkları eşitle' },
  { id: 'cherry', label: 'Tüm günleri göster' },
  { id: 'color', label: 'Renkleri değiştir', why: 'Renkler sütunların boyunu ya da sayıları değiştirir mi? Okuru yanıltan şey renk mi?' },
  { id: '3d', label: '3B efektini kaldır', why: 'Bu grafikte 3B bir görünüm var mı? Gördüğün bir sorunu düzelt.' },
]
function FixTask({ t, grade, look, onDone }: { t: Extract<Task, { kind: 'fix' }>; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const fb = useSay()
  const [on, setOn] = useState<Tool[]>([])
  const [phase, setPhase] = useState<'fix' | 'read' | 'done'>('fix')
  const misses = useRef(0)
  const tools = TOOLS.filter((x) => grade >= 6 || x.id !== 'cherry')
  const has = (i: Issue) => t.issues.includes(i) && !on.includes(i)
  const data = has('cherry') ? AYRAN.slice(1, 4) : AYRAN
  const y0 = has('trunc') ? 42 : 0
  const uneven = has('uneven') ? [y0, 44, 45, 46, 50] : undefined
  const apply = (tool: (typeof TOOLS)[number]) => {
    if (on.includes(tool.id)) return
    const real = (t.issues as Tool[]).includes(tool.id)
    track.attempt(real)
    if (!real) {
      misses.current++
      fb.say(tool.why ?? 'Bu grafikte böyle bir sorun var mı?')
      return
    }
    sfx.ok()
    const n = [...on, tool.id]
    setOn(n)
    const left = t.issues.filter((i) => !n.includes(i)).length
    fb.say(left ? `Düzeldi! Ama hâlâ ${left} hile kaldı. Eksene, aralıklara ve gösterilen günlere bak.` : 'Grafik artık dürüst! Şimdi gerçek hikâyeyi oku.', { tone: 'ok' })
    if (!left) setPhase('read')
  }
  const head = phase === 'fix' ? (t.issues.includes('cherry') && has('cherry') ? 'Ayran satışları çöküşte!' : 'Salı günü ayran satışları uçtu!') : 'Kantinde ayran satışları istikrarlı'
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <Headline text={head} tone={phase === 'fix' ? 'hot' : 'calm'} />
          <div className={`mt-3 rounded-2xl p-2 ${look.dark ? 'bg-slate-900/60' : 'bg-white'}`}>
            <DataChart look={look} data={data} type="bar" y0={y0} yMax={50} uneven={uneven} height={320} title="Kantinde satılan ayran (şişe)" unit="şişe" />
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title={phase === 'fix' ? 'Düzeltme araçları' : 'Gerçek hikâye'} icon={<ShieldCheck size={20} />}>
          {phase === 'fix' && (
            <>
              <p className={`mb-2 text-[15px] font-semibold ${look.muted}`}>Grafikte {t.issues.length} hile var. Doğru araçları seç.</p>
              <div className="grid gap-2">
                {tools.map((x) => <Choice key={x.id} look={look} state={on.includes(x.id) ? 'right' : 'idle'} disabled={on.includes(x.id)} onClick={() => apply(x)}><span className="flex items-center gap-2">{on.includes(x.id) ? <Check size={18} /> : <Wrench size={18} />}{x.label}</span></Choice>)}
              </div>
            </>
          )}
          {phase === 'read' && (
            <Ask look={look} q="Dürüst grafik ne söylüyor?" opts={[
              { t: 'Satışlar günden güne biraz değişiyor; 40 ile 49 şişe arasında, büyük bir çöküş ya da patlama yok.', ok: true },
              { t: 'Salı günü satışlar diğer günlerin birkaç katı.', ok: false, why: 'Salı 47, Pazartesi 40 şişe. Bu kaç katı? Dürüst grafikte sütunlar ne söylüyor?', mis: 'Kırpılmış eksenle oluşan görsel farkı gerçek fark sandı' },
              { t: 'Satışlar hafta boyunca sürekli düştü.', ok: false, why: 'Pazartesi ve cuma günlerine bak. Haftanın başı ile sonu arasında satış düştü mü?' },
            ]} onRight={() => { sfx.ok(); track.attempt(true); track.item(misses.current === 0); setPhase('done'); fb.say('Evet! Grafiği okumadan önce eksenin nereden başladığına, aralıkların eşit olup olmadığına ve tüm verinin gösterilip gösterilmediğine bak.', { tone: 'ok' }) }} onWrong={(o) => { misses.current++; track.attempt(false); fb.say(o.why!, { mis: o.mis }) }} />
          )}
          {fb.node}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Bir grafiğe bakınca önce neyi kontrol edersin?" options={['Eksenin başlangıcını', 'Aralıkların eşitliğini', 'Gösterilen zaman aralığını', 'Gerçek sayıları']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0 })} />
            </>
          )}
        </Panel>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function YanilticiGrafikler({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const firsts = useRef(0)
  const t = tasks[i]
  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (i + 1 < tasks.length) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    onFinish({
      summary: `${tasks.length} grafik hilesini önce kendin yaptın, sonra düzelttin.`,
      insight:
        grade <= 6
          ? 'Aynı veri farklı hikâyeler anlatabilir. Bir grafiğe güvenmeden önce eksenin 0’dan başlayıp başlamadığına, aralıkların eşit olup olmadığına ve simgelerin boyuna bak.'
          : 'Grafik, değerleri orantılı göstermelidir: kırpılmış eksen, en-boy oranı, seçilmiş zaman aralığı ve 3B görünüm sayıları değiştirmeden algıyı çarpıtır. Yalan katsayısı 1’e yakın olmalı.',
      stars: starsBy(firsts.current, tasks.length),
    })
  }
  let body: ReactNode
  switch (t.kind) {
    case 'axis': body = <AxisTask key={i} grade={grade} look={look} onDone={done} />; break
    case 'picto': body = <PictoTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'uneven': body = <UnevenTask key={i} grade={grade} look={look} onDone={done} />; break
    case 'cherry': body = <CherryTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
    case 'aspect': body = <AspectTask key={i} grade={grade} look={look} onDone={done} />; break
    case 'pie': body = <PieTask key={i} grade={grade} look={look} onDone={done} />; break
    case 'fix': body = <FixTask key={i} t={t} grade={grade} look={look} onDone={done} />; break
  }
  return (
    <LastTask.Provider value={i === tasks.length - 1}>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji={EMOJI[t.kind]} />
      {body}
    </LastTask.Provider>
  )
}
