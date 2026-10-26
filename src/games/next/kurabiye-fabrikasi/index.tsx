import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Lightbulb, RotateCcw } from 'lucide-react'
import type { Grade, ManipulativeTool } from '../../../data/types'
import { ek } from '../../../lib/generators'
import { useTracker } from '../../../lib/trackerContext'
import { starsFor, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { CookieDefs, FactoryBanner, OrderShelf } from './parts'
import { ArrayTask, GroupsTask, RotateTask, SplitTask, TruckTask, type ArrayLevel, type Extra, type GroupsLevel, type RotateLevel, type SplitLevel, type TaskApi, type TruckLevel } from './tasks'

/**
 * Kurabiye Fabrikası (1–3. sınıf) — Van de Walle: eşit gruplar → dizilim → çarpma/bölme anlamı.
 *  1. sınıf: tabaklara eşit dağıtma, 2’li/5’li/10’lu kutularla ritmik sayma, küçük tepsiler (sembol: 4 + 4 + 4, “3 tane 4”).
 *  2. sınıf: dizilimden × sembolü, tepsiyi döndürme (değişme özelliği), gruplama olarak bölme, tek sıralık sayılar (7).
 *  3. sınıf: 10 × 10’a kadar dizilimler, tepsiyi kesme (dağılma özelliği), eksik çarpan olarak bölme, paylaştırma.
 * Her farklı düzen = yeni sipariş (useSolutions).
 */

type Task = ArrayLevel | GroupsLevel | TruckLevel | RotateLevel | SplitLevel

interface Level {
  task: Task
  goal: number
  title: string
  prompt: string
  hints: string[]
  /** Görev bitince şefin notu */
  note?: string
  picker?: { q: string; options: string[] }
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
/** 4 → “4’erli”, 6 → “6’şarlı” */
const erli = (n: number) => { const d = ek(n, 'dist'); return d + (d.endsWith('ar') ? 'lı' : 'li') }

function makeLevels(grade: Grade): Level[] {
  if (grade <= 1) {
    const n1 = pick([6, 8, 10])
    const n6 = pick([8, 10])
    return [
      {
        task: { kind: 'groups', n: n1, plates: 2, maxPlates: 2 },
        goal: 1,
        title: 'İki arkadaşa paylaştır',
        prompt: `Şef ${n1} kurabiye pişirdi. Kurabiyeleri 2 tabağa eşit paylaştır. Her tabakta kaç kurabiye olur?`,
        hints: ['Kurabiyeleri tabaklara sırayla birer birer koymayı dene.', 'İki tabaktaki kurabiyeler aynı sayıda mı? Say ve karşılaştır.'],
        note: `${n1 / 2} + ${n1 / 2} = ${n1}: iki eşit parça, ikizler!`,
      },
      {
        task: { kind: 'groups', n: 12, maxPlates: 6 },
        goal: 3,
        title: 'Kaç tabağa?',
        prompt: '12 kurabiyeyi tabaklara eşit dağıt. Tabak sayısını sen seç! Kaç farklı yol bulabilirsin?',
        hints: ['Önce 2 tabakla dene. Sonra tabak sayısını değiştir.', '3 tabak olsa her tabağa kaç kurabiye düşer? “Her tabağa birer” düğmesiyle dağıtabilirsin.', '4 tabak ve 6 tabağı da dene.'],
        note: 'Tabak sayısı artınca her tabaktaki kurabiye azaldı!',
      },
      {
        task: { kind: 'truck', n: 10, boxes: [2] },
        goal: 1,
        title: 'İkişer ikişer',
        prompt: 'Kutularda 2’şer kurabiye var. 10 kurabiyelik siparişi kamyona yükle. Yüklerken ikişer say: 2, 4, …',
        hints: ['Her kutu sayma şeridinde 2 adım zıplar.', '2, 4, 6, 8, … Kaçıncı kutuda 10’a ulaşırsın?'],
        note: '2, 4, 6, 8, 10: ikişer sayınca 5 kutu yetti!',
      },
      {
        task: { kind: 'truck', n: 20, boxes: [2, 5, 10] },
        goal: 3,
        title: 'Karışık kutular',
        prompt: '20 kurabiyelik büyük sipariş! 2’li, 5’li ve 10’lu kutularla hazırla. Farklı kutularla 3 yol bul.',
        hints: ['10’luk kutular en hızlısı: kaç tane 10 eder 20?', 'Yalnız 5’lik kutularla dene: 5, 10, 15, …', '10’luk ve 5’lik kutuları karıştırabilirsin.'],
        note: 'Aynı 20 kurabiye: 10 + 10, 5 + 5 + 5 + 5, 10 + 5 + 5…',
      },
      {
        task: { kind: 'array', n: 6, max: 6 },
        goal: 3,
        title: 'Tepsiye diz',
        prompt: 'Turuncu köşeyi sürükleyerek tepsiyi büyüt ya da küçült. 6 kurabiyeyi her sırada aynı sayıda olacak şekilde diz. 3 farklı tepsi bul!',
        hints: ['Tek uzun sıra da bir tepsidir!', '2 sıra yaparsan her sırada kaç kurabiye olmalı?', 'Tepsiyi döndür düğmesi yeni bir düzen verir mi?'],
        note: '2 tane 3 ile 3 tane 2 aynı sayıda: 6!',
      },
      {
        task: { kind: 'array', n: n6, max: 10 },
        goal: 3,
        title: 'Büyük tepsi',
        prompt: `${n6} kurabiyelik sipariş geldi. Tepsiyi ${n6} kurabiye alacak şekilde ayarla. 3 farklı düzen bul!`,
        hints: ['Sıra sonlarındaki sarı sayılar ritmik saymayı gösterir.', `Her sırada 2 kurabiye olsa kaç sıra gerekir? İkişer say.`, 'Bulduğun bir tepsiyi döndürmeyi dene.'],
        note: 'Aynı kurabiyeler, farklı tepsiler!',
      },
    ]
  }
  if (grade === 2) {
    const rot = pick<[number, number]>([[3, 5], [2, 6], [4, 3]])
    const nT = pick([30, 40])
    const box = pick([3, 4])
    const nB = box * pick([5, 6])
    return [
      {
        task: { kind: 'groups', n: 12, maxPlates: 6 },
        goal: 3,
        title: 'Eşit gruplar',
        prompt: '12 kurabiyeyi tabaklara eşit dağıt. Kaç tabak kullanacağına sen karar ver. 3 farklı yol bul!',
        hints: ['Tabaklar eşit olunca altta bir çarpma cümlesi belirir.', '3 tabak dene: her tabakta kaç kurabiye var?', '4 + 4 + 4 ile 3 × 4 aynı şeyi mi anlatıyor?'],
        note: '3 tabakta 4’er kurabiye: 4 + 4 + 4 = 3 × 4 = 12.',
      },
      {
        task: { kind: 'array', n: 12, max: 12 },
        goal: 4,
        title: 'Tepsi tasarımcısı',
        prompt: 'Tepsinin köşesini sürükle. 12 kurabiyeyi sıra sıra dizmenin 4 farklı yolunu bul!',
        hints: ['2 sıra yap: her sırada kaç kurabiye olmalı ki 12 olsun?', '3 × 4’ü bulduysan tepsiyi döndür!', '12’yi eşit sıralara bölmeyi düşün: 2, 3, 4, 6…'],
        picker: { q: 'Yeni tepsileri nasıl buldun?', options: ['Tepsiyi döndürdüm', 'Sıraları ikiye böldüm', 'Ritmik saydım', 'Deneyerek'] },
      },
      {
        task: { kind: 'rotate', r: rot[0], c: rot[1] },
        goal: 1,
        title: 'Tepsiyi döndür',
        prompt: `Bu tepside ${rot[0]} sıra, her sırada ${rot[1]} kurabiye var. Tepsiyi döndürürsek kurabiye sayısı değişir mi?`,
        hints: ['Döndürünce kurabiye eklenir mi, eksilir mi?', 'Sıralar sütun, sütunlar sıra olur.'],
        note: `${rot[0]} × ${rot[1]} = ${rot[1]} × ${rot[0]}: çarpımda sayıların yeri değişse de sonuç aynı.`,
      },
      {
        task: { kind: 'truck', n: nT, boxes: [5, 10] },
        goal: 3,
        title: 'Beşer, onar',
        prompt: `${nT} kurabiyelik sipariş! 5’li ve 10’lu kutularla 3 farklı şekilde hazırla.`,
        hints: ['Yalnız 10’luklarla: 10, 20, 30, …', 'Bir 10’luk kutu yerine kaç tane 5’lik koyabilirsin?', '5’er say: 5, 10, 15, 20, …'],
        note: 'Bir 10’luk kutu = iki 5’lik kutu!',
      },
      {
        task: { kind: 'array', n: nB, max: 10, fixedCols: box, start: [1, box] },
        goal: 1,
        title: 'Kaç kutu?',
        prompt: `${nB} kurabiyeyi ${erli(box)} kutulara koyacağız. Her sıra bir kutu. Kaç kutu gerekir?`,
        hints: [`Kutu ekle ve ${ek(box, 'dist')} say.`, `${nB}’e ulaşınca dur: kaç kutu oldu?`],
        note: `${nB} içinde kaç tane ${box} var? Bölme, “kaç tane var?” sorusudur.`,
      },
      {
        task: { kind: 'array', n: 7, max: 8 },
        goal: 2,
        title: 'İnatçı yedi',
        prompt: '7 kurabiyelik garip bir sipariş! 7 kurabiyeyi dikdörtgen tepsiye eşit sıralarla kaç farklı şekilde dizebilirsin?',
        hints: ['2 sıra dene: her sırada eşit kurabiye olur mu?', '3 sıra olursa? Tek sıra da bir yoldur.'],
        note: '7 yalnızca tek sıra (1 × 7) ya da tek sütun (7 × 1) olabiliyor! 6 ya da 8 kurabiyede durum ne?',
      },
    ]
  }
  const nA = pick([24])
  const sp = pick<[number, number]>([[6, 7], [6, 8]])
  const sp2 = pick<[number, number]>([[8, 6], [7, 8], [9, 4]])
  const dc = pick([6, 7, 8])
  const dk = pick([5, 6, 7])
  const sh = pick([3, 4])
  const shN = sh * pick([5, 6, 7])
  return [
    {
      task: { kind: 'array', n: nA, max: 10 },
      goal: 4,
      title: 'Tepsi tasarımcısı',
      prompt: `${nA} kurabiyeyi en çok 10 sıra ve 10 sütunluk tepsiye diz. 4 farklı tepsi bul!`,
      hints: ['3 sıra yap: her sırada kaç kurabiye olmalı?', 'Bulduğun bir tepsiyi döndür.', '4 × 6’yı bulduysan 2 sıraya ne olur? Satırları ikiye bölüp yan yana koymayı düşün.'],
      picker: { q: 'Yeni tepsileri nasıl buldun?', options: ['Tepsiyi döndürdüm', 'Yarıladım ve ikiye katladım', 'Çarpım tablosunu düşündüm', 'Deneyerek'] },
    },
    {
      task: { kind: 'array', n: 36, max: 10 },
      goal: 3,
      title: 'Kare tepsi',
      prompt: '36 kurabiyelik dev sipariş! En çok 10 × 10’luk tepsiyle 3 farklı düzen bul. Sıra ve sütun sayısı eşit olabilir mi?',
      hints: ['4 sıra: her sırada kaç?', '6 sıra yaparsan her sırada da 6 olur mu?'],
      note: '6 × 6: sıra ve sütun sayısı eşit, tepsi kare! Döndürünce yeni bir tepsi çıkmaz.',
    },
    {
      task: { kind: 'split', r: sp[0], c: sp[1] },
      goal: 2,
      title: 'Tepsiyi kes',
      prompt: `${sp[0]} × ${sp[1]} tepsiyi saymak zor mu? Bıçakla iki kolay tepsiye kes! 2 farklı kesim bul.`,
      hints: ['5’ler kolaydır: 5 sıra ile kalanı ayırmayı dene.', 'Tepsiyi tam ortadan kesersen iki eş parça olur mu?'],
      picker: { q: 'Hangi kesim işini en çok kolaylaştırdı?', options: ['5’lere ayırmak', 'Tam ortadan ikiye bölmek', 'Bir sırayı ayırmak', 'Bildiğim bir çarpımı ayırmak'] },
    },
    {
      task: { kind: 'split', r: sp2[0], c: sp2[1] },
      goal: 2,
      title: 'Kes ve topla',
      prompt: `Şimdi ${sp2[0]} × ${sp2[1]}! Bu kez hem sıralardan hem sütunlardan kesmeyi dene. 2 farklı kesim bul.`,
      hints: ['Üstteki raydan keserek sütunları ayırabilirsin.', `${sp2[0]} sırayı 5 ve ${sp2[0] - 5} diye ayırsan?`],
      note: 'Hangi yerden kesersen kes, kurabiyelerin toplamı değişmedi!',
    },
    {
      task: { kind: 'array', n: dc * dk, max: 10, fixedCols: dc, start: [1, dc] },
      goal: 1,
      title: 'Eksik çarpan',
      prompt: `${dc * dk} kurabiye ${erli(dc)} kutulara konacak. Her sıra bir kutu. ? × ${dc} = ${dc * dk}. Kaç kutu gerekir?`,
      hints: [`${ek(dc, 'dist')} say ve ${dc * dk}’de dur.`, `5 kutu olsa kaç kurabiye eder? Sonra bir kutu daha ekle.`],
      note: `? × ${dc} = ${dc * dk} ise ${dc * dk} ÷ ${dc} = ${dk}. Bölme, eksik çarpanı bulmaktır.`,
    },
    {
      task: { kind: 'groups', n: shN, plates: sh, maxPlates: sh },
      goal: 1,
      title: 'Adil paylaşım',
      prompt: `${shN} kurabiyeyi ${sh} çocuğa eşit paylaştır. Her çocuğa kaç kurabiye düşer?`,
      hints: ['Birer birer dağıtmak paylaşmanın bir yoludur.', `Her tabağa önce 5’er koysan kaç kurabiye kalır?`],
      note: `${shN} ÷ ${sh} = ${shN / sh}: paylaştırma da bir bölmedir.`,
    },
  ]
}

const insightFor = (grade: Grade, ex: string | null) =>
  grade <= 1
    ? `Eşit gruplar kurunca toplamı ritmik sayarak bulabilirsin: 4 + 4 + 4 = 12, yani 3 tane 4.${ex ? ` Senin bir düzenin: ${ex}.` : ''}`
    : grade === 2
      ? `Dizilimde sıra sayısı × her sıradaki sayı, toplamı verir. Tepsiyi döndürmek sayıyı değiştirmez: 3 × 4 = 4 × 3.${ex ? ` Senin bir düzenin: ${ex}.` : ''}`
      : 'Zor bir çarpımı kolay parçalara kesebilirsin: 6 × 7 = 5 × 7 + 1 × 7. Bölme ise eksik çarpanı bulmaktır: ? × 7 = 42.'

/** lg (≥ 1024 px) yerleşimi: geri bildirim sağ panelde, değilse modelin hemen altında */
function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setWide(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return wide
}

type NudgeState = { q: string; tool?: ManipulativeTool; misc?: string; tone: 'ok' | 'think'; id: number } | null

export default function KurabiyeFabrikasi({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => makeLevels(grade), [grade])
  const track = useTracker()
  const sol = useSolutions()
  const [idx, setIdx] = useState(0)
  const [orders, setOrders] = useState<{ key: string; label: string; rows?: number; cols?: number; split?: Extra['split'] }[]>([])
  const [completed, setCompleted] = useState(false)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [say, setSay] = useState<{ t: string; mood: 'idle' | 'happy' | 'think' }>({ t: 'Fabrikaya hoş geldin! Siparişleri birlikte hazırlayalım.', mood: 'idle' })
  const [hintI, setHintI] = useState(0)
  const stat = useRef({ fails: 0, hints: 0, itemDone: false })
  const totals = useRef({ first: 0, orders: 0, example: null as string | null })
  const nid = useRef(0)
  const L = levels[idx]
  const done = completed || orders.length >= L.goal

  const keys = useRef(new Set<string>())
  const api: TaskApi = {
    grade,
    done,
    report: (ok) => {
      track.attempt(ok)
      if (!ok) stat.current.fails++
    },
    has: (k) => keys.current.has(k),
    found: (key, label, extra) => {
      if (keys.current.has(key)) return false
      keys.current.add(key)
      sol.add(key, label)
      setOrders((o) => [...o, { key, label, ...extra }])
      totals.current.orders++
      if (!totals.current.example && extra?.rows && !extra.split) totals.current.example = label
      return true
    },
    nudge: (q, o) => setNudge(q ? { q, tool: o?.tool, misc: o?.misc, tone: o?.tone ?? 'think', id: ++nid.current } : null),
    say: (t, mood = 'idle') => setSay({ t, mood }),
    strategy: (s) => track.strategy(s),
    complete: () => setCompleted(true),
  }

  // görev bitince tek seferlik öğe kaydı
  useEffect(() => {
    if (done && !stat.current.itemDone) {
      stat.current.itemDone = true
      const first = stat.current.fails === 0 && stat.current.hints === 0
      track.item(first)
      if (first) totals.current.first++
      setSay({ t: L.goal > 1 ? `${orders.length} farklı sipariş! Muhteşem!` : 'Sipariş tamam!', mood: 'happy' })
    }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const hint = () => {
    const h = L.hints[Math.min(hintI, L.hints.length - 1)]
    setHintI((i) => i + 1)
    stat.current.hints++
    track.hint()
    setNudge({ q: h, tone: 'think', id: ++nid.current })
    setSay({ t: 'Bir ipucu verdim!', mood: 'think' })
  }

  const next = useCallback(() => {
    if (idx + 1 >= levels.length) {
      const n = levels.length
      const ratio = (totals.current.first + 0.5 * (n - totals.current.first)) / n
      onFinish({
        stars: starsFor(ratio),
        summary: `${totals.current.orders} sipariş gönderdin, ${totals.current.first} görevi ilk denemede bitirdin.`,
        score: totals.current.orders * 10 + totals.current.first * 20,
        insight: insightFor(grade, totals.current.example),
      })
      return
    }
    setIdx((i) => i + 1)
    setOrders([])
    keys.current = new Set()
    sol.reset()
    setCompleted(false)
    setNudge(null)
    setHintI(0)
    stat.current = { fails: 0, hints: 0, itemDone: false }
    setSay({ t: 'Yeni sipariş geldi!', mood: 'idle' })
  }, [idx, levels.length, onFinish, grade, sol])

  const restart = () => {
    setOrders([])
    keys.current = new Set()
    sol.reset()
    setCompleted(false)
    setNudge(null)
    stat.current.itemDone = false
    setTaskKey((k) => k + 1)
  }
  const [taskKey, setTaskKey] = useState(0)

  const wide = useWide()
  const nudgeView = nudge && (
    <div className="[&_p]:min-w-[11rem]">
      <Nudge key={nudge.id} question={nudge.q} tool={nudge.tool} toolTitle={nudge.tool === 'dizilim' ? 'Dizilim tahtası' : undefined} misconception={nudge.misc} tone={nudge.tone} onClose={() => setNudge(null)} />
    </div>
  )
  const t = L.task
  const task =
    t.kind === 'array' ? <ArrayTask level={t} api={api} /> : t.kind === 'groups' ? <GroupsTask level={t} api={api} /> : t.kind === 'truck' ? <TruckTask level={t} api={api} /> : t.kind === 'rotate' ? <RotateTask level={t} api={api} /> : <SplitTask level={t} api={api} />

  return (
    <div className="grid gap-3 select-none lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-4">
      <CookieDefs />
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-sm font-black text-amber-800">Sipariş {idx + 1}/{levels.length} · {L.title}</span>
          <LevelDots current={idx} total={levels.length} />
        </div>
        <TaskCard step={idx + 1} total={levels.length}>{L.prompt}</TaskCard>
      </div>

      <Scene grade={grade} className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <FactoryBanner say={say.t} mood={say.mood} />
        <div key={`${idx}-${taskKey}`}>{task}</div>
        {!wide && nudgeView}
      </Scene>

      <aside className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
        {wide && nudgeView}
        {L.task.kind !== 'rotate' && <OrderShelf orders={orders} goal={L.goal} />}
        {done ? (
          <div className="rounded-2xl bg-ok-soft p-4 ring-1 ring-green-200 animate-fade-up">
            <p className="text-lg font-black text-green-900">🎉 {L.goal > 1 ? `${orders.length} farklı yol buldun!` : 'Sipariş teslim edildi!'}</p>
            {L.note && <p className="mt-1 font-bold text-green-900">{L.note}</p>}
            {L.picker && <StrategyPicker question={L.picker.q} options={L.picker.options} onPick={() => undefined} />}
            <BigButton onClick={next} className="mt-3 w-full">{idx + 1 >= levels.length ? 'Fabrikayı kapat' : 'Sonraki sipariş'}<ArrowRight size={20} /></BigButton>
            {L.task.kind !== 'rotate' && (
              <p className="mt-2 text-center text-sm font-bold text-green-800">İstersen başka düzenler bulmaya devam edebilirsin.</p>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={hint} className="btn-ghost min-h-12 flex-1"><Lightbulb size={18} className="text-amber-500" />İpucu</button>
            <button type="button" onClick={restart} className="btn-ghost min-h-12 px-4" aria-label="Görevi baştan başlat"><RotateCcw size={18} />Baştan</button>
          </div>
        )}
      </aside>
    </div>
  )
}
