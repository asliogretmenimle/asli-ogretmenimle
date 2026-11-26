import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Eye, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Card, NextButton, Nudge, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, RulesFound, useDnd, type Ask, type ToolInfo } from '../sayilari-karsilastir/parts'
import { Now, Runner, type Done, type TaskDef } from '../virgul-nereden-geliyor/bolme'
import { CubeScene } from './KupSahnesi'
import { ViewGrid, placeOn, wrongCells } from './Izgara'
import type { Stage3D, ViewDir } from './sahne'
import { BUILD, DETECTIVE, DRAW, INSPECT, MINMAX, VIEW_COLOR, VIEW_LABEL, blank, changedViews, count, key, minMax, place, sameView, view, type Grid, type HMap, type ViewKind } from './yapi'

/**
 * 101. Küp Yapılar ve Görünümler (3B) — 7. sınıf MAT.7.4.1
 *  1. 3B yapıyı incele: döndür, önden/sağdan/üstten düz bakışa geç, görünüm kartlarını doğru yöne sürükle
 *  2. Görünümleri çiz: yapıya bakarak üç görünümü kareli kâğıda boya (2. turda düz bakış yok)
 *  3. Görünümlerden yapı kur: üç görünümü verilen yapıyı küpleri sürükleyerek kur
 *  4. Görünüm dedektifi: tek küp ekleyerek hangi görünümün değiştiğini keşfet (gizli küp)
 *  5. En az – en çok: aynı görünümlere sahip yapıları en az ve en çok küple kur
 */

const KINDS: ViewKind[] = ['on', 'sag', 'ust']

const T = {
  rotate: { icon: <span className="text-base leading-none">🖐️</span>, name: '3B sahne', text: 'Yapıyı parmağınla (farede sol tuşla) sürükleyerek çevir. İki parmakla ya da fare tekerleğiyle yakınlaş.' },
  views: { icon: <Eye size={18} className="text-blue-600" />, name: 'Bakış düğmeleri', text: '“Önden”, “Sağdan”, “Üstten” kamerayı o yöne götürür ve düz bakışa geçer: ekranda kalan resim o yönden görünümdür. “3B” ile eğik bakışa dönersin.' },
  paint: { icon: <span className="text-base leading-none">🎨</span>, name: 'Görünen yüzleri boya', text: 'Açıkken, seçtiğin yönden görünen küp yüzleri o yönün rengine boyanır. Boyalı kareler görünümün ta kendisidir.' },
  cards: { icon: <span className="text-base leading-none">🃏</span>, name: 'Görünüm kartları', text: 'Kartı tutup doğru yönün kutusuna sürükle. Yanlış kutuya bırakırsan kart geri döner.' },
  grid: { icon: <span className="text-base leading-none">✏️</span>, name: 'Kareli kâğıt', text: 'Bir kareye dokunarak boya; parmağını basılı tutup gezdirerek çok kareyi birden boyarsın. Boyalı kareye dokunursan silinir.' },
  cube: { icon: <span className="text-base leading-none">🧊</span>, name: 'Küp tepsisi', text: 'Küpü tutup yapının üstüne ya da zemindeki bir kareye sürükle. Mavi gölge küpün nereye konacağını gösterir. Bir yüze dokunarak da küp ekleyebilirsin.' },
  erase: { icon: <span className="text-base leading-none">🧽</span>, name: 'Sil / Geri al', text: '“Sil” kipinde bir kuleye dokunursan en üstteki küp kalkar. “Geri al” son adımı geri getirir.' },
} satisfies Record<string, ToolInfo>

export default function KupYapiGorunumleri({ grade, onFinish }: InteractionProps) {
  const tasks: TaskDef[] = [
    { emoji: '🔭', title: '3B yapıyı incele', goal: 'Yapıyı her yönden döndürüp incelemek; önden, sağdan ve üstten görünümlerin ne olduğunu keşfetmek.', tools: [T.rotate, T.views, T.paint, T.cards, 'answer'], render: (done, last) => <Explore onDone={done} last={last} /> },
    { emoji: '✏️', title: 'Görünümleri çiz', goal: 'Yapıya bakarak önden, sağdan ve üstten görünümlerini kareli kâğıda çizmek.', tools: [T.rotate, T.views, T.grid, 'answer'], render: (done, last) => <DrawViews onDone={done} last={last} /> },
    { emoji: '🧱', title: 'Görünümlerden yapı kur', goal: 'Üç görünümü verilen yapıyı eş küplerle kurmak.', tools: [T.cube, T.erase, T.rotate, T.views, 'answer'], render: (done, last) => <BuildFromViews onDone={done} last={last} /> },
    { emoji: '🕵️', title: 'Görünüm dedektifi', goal: 'Tek bir küp ekleyince hangi görünümün değiştiğini keşfetmek; hiçbir görünüme yansımayan küpü bulmak.', tools: [T.cube, T.rotate, T.views, 'answer'], render: (done, last) => <Detective onDone={done} last={last} /> },
    { emoji: '⚖️', title: 'En az mı, en çok mu?', goal: 'Aynı görünümlere sahip yapıyı önce en az, sonra en çok küple kurmak.', tools: [T.cube, T.erase, T.rotate, T.views, 'answer'], render: (done, last) => <MinMaxTask onDone={done} last={last} /> },
  ]
  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `Eş küplerle kurulan yapıları 3B olarak döndürdün, görünümlerini çizdin, görünümlerden yapı kurdun ve görünümlerle küp sayısı arasındaki ilişkiyi keşfettin. ${rules.length} kural buldun.`}
      insight="Bir görünüm, yapıya tek bir yönden dik bakınca görülen karelerdir. Önden görünüm her sütunun en yüksek kulesini, üstten görünüm yapının yerdeki izini gösterir. Görünümler küp sayısını her zaman tek türlü belirlemez: aynı görünümlere sahip yapıların en az ve en çok küp sayısı bulunabilir."
      note="Bu kuralları 3B yapıları döndürüp kurarak kendin keşfettin."
    />
  )
}

/* ───────────── ortak yerleşim ───────────── */

function Layout({ scene, panel }: { scene: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">{scene}</div>
      <div className="flex min-w-0 flex-col gap-3">{panel}</div>
    </div>
  )
}

function Finish({ rule, last, onNext, ask, checks }: { rule: string; last: boolean; onNext: () => void; ask?: Ask; checks: ReturnType<typeof useChecks> }) {
  const [asked, setAsked] = useState(!ask)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }, [asked])
  return (
    <div ref={ref} className="space-y-3">
      {!asked && ask && <DragAsk ask={ask} checks={checks} onOk={() => setAsked(true)} okText="Evet! 3B yapı da bunu gösteriyor." />}
      {asked && (
        <>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={onNext} />
        </>
      )}
    </div>
  )
}

function Rounds({ i, n }: { i: number; n: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Tur ${i + 1} / ${n}`}>
      {Array.from({ length: n }, (_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k < i ? 'bg-emerald-500' : k === i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
    </div>
  )
}

/* ───────────── 1. 3B yapıyı incele ───────────── */

const SLOT_NUDGE: Record<ViewKind, string> = {
  on: 'Önden bakınca sütunlar soldan sağa sıralanır ve her sütun en yüksek kulesi kadar yüksektir. “Önden” düğmesine basıp ekrandaki resimle karşılaştır.',
  sag: 'Sağdan bakarken yapının ön tarafı senin solunda kalır. “Sağdan” düğmesine bas ve kartla karşılaştır.',
  ust: 'Üstten bakınca her kule tek bir kare olur; kaç kat olduğu görünmez. “Üstten” düğmesine bas.',
  sol: '',
  arka: '',
}

function Explore({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [h] = useState(() => place(pick(INSPECT), 4, 4))
  const [stage, setStage] = useState<Stage3D | null>(null)
  const [touched, setTouched] = useState(false)
  const [seen, setSeen] = useState<Set<ViewDir>>(() => new Set())
  const [placed, setPlaced] = useState<Partial<Record<ViewKind, string>>>({})
  const [miss, setMiss] = useState<{ k: ViewKind; n: number } | null>(null)
  useEffect(() => {
    if (!stage) return
    const a = stage.onFirstTouch(() => setTouched(true))
    const b = stage.onView((s) => s.flat && s.view && setSeen((p) => new Set(p).add(s.view!)))
    return () => {
      a()
      b()
    }
  }, [stage])

  const cards = useMemo(() => {
    const real = KINDS.map((k) => ({ id: k as string, g: view(h, k) }))
    const keys = new Set(real.map((c) => key(c.g)))
    const alt = (['sol', 'arka'] as ViewKind[]).map((k) => view(h, k)).find((g) => !keys.has(key(g)))
    const extra: Grid = alt ?? view(h, 'on').map((r, i) => (i === 0 ? r.map((v, j) => (j === 0 ? !v : v)) : r))
    return shuffle([...real, { id: 'x', g: extra }])
  }, [h])

  const dnd = useDnd((item, target) => {
    const c = item.slice(5)
    const k = target.slice(5) as ViewKind
    if (placed[k]) return false
    const g = cards.find((x) => x.id === c)!.g
    if (sameView(g, view(h, k))) {
      setPlaced((p) => ({ ...p, [k]: c }))
      setMiss(null)
      return
    }
    checks.fail()
    setMiss((m) => ({ k, n: (m?.n ?? 0) + 1 }))
    return false
  })

  const step = !touched ? 0 : !seen.has('on') ? 1 : !(seen.has('sag') && seen.has('ust')) ? 2 : 3
  const allPlaced = KINDS.every((k) => placed[k])
  const rule = 'Görünüm, yapıya bir yönden dik bakınca gördüğümüz karelerdir. Arkada kalan küpler öndekilerin arkasına saklanır, ayrıca çizilmez.'
  const ask: Ask = {
    q: 'Önden düz bakınca arkadaki küplere ne oldu?',
    options: [
      { label: 'Öndeki küplerin arkasında kaldıkları için görünmediler.', ok: true },
      { label: 'Yapıdan kayboldular.', nudge: '“3B” düğmesine basıp yapıyı çevir. Arkadaki küpler hâlâ orada mı?', mis: 'Görünmeyen küpü yok saymak' },
      { label: 'Önden görünümde onlar da ayrı kareler olarak çizilir.', nudge: 'Önden bakınca bir sütundaki küpler arka arkaya dizilir. Kaç kare görüyorsun?', mis: 'Görünümde gizli küpleri ayrı kare olarak çizmek' },
    ],
  }
  return (
    <div className="space-y-4">
      <Layout
        scene={<CubeScene h={h} paintOn onStage={setStage} />}
        panel={
          <>
            {step === 0 && (
              <>
                <Now>Yapıyı parmağınla sürükleyerek çevir. Arkasında ne var?</Now>
                <button type="button" onClick={() => setTouched(true)} className="min-h-11 text-sm font-bold text-slate-300 underline underline-offset-4">Çevirdim, devam</button>
              </>
            )}
            {step === 1 && <Now>Sahnenin üstündeki <b className="text-blue-700">“Önden”</b> düğmesine bas. Ekranda kalan resim yapının <b>önden görünümü</b>dür.</Now>}
            {step === 2 && <Now>Harika! Şimdi <b className="text-orange-700">“Sağdan”</b> ve <b className="text-green-700">“Üstten”</b> de bak. Boyalı yüzlere dikkat et.</Now>}
            {step === 3 && !allPlaced && <Now>Görünüm kartlarını doğru kutulara sürükle. Bir kart fazla!</Now>}
            {step === 3 && allPlaced && <Now done>Üç görünümü de buldun!</Now>}
            <div className="flex flex-wrap gap-1.5 text-xs font-black">
              {(['on', 'sag', 'ust'] as ViewDir[]).map((v) => (
                <span key={v} className={`rounded-full px-2.5 py-1 ring-1 ${seen.has(v) ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-white text-ink-soft ring-line'}`}>{seen.has(v) ? '✓' : '○'} {VIEW_LABEL[v as ViewKind]}</span>
              ))}
            </div>
            {step === 3 && (
              <Card className="animate-fade-up">
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {KINDS.map((k) => {
                    const c = placed[k] ? cards.find((x) => x.id === placed[k]) : null
                    return (
                      <Drop key={k} dnd={dnd} id={`slot-${k}`} className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-1.5 ${c ? 'border-emerald-400 bg-emerald-50' : 'bg-slate-50'}`} style={{ borderColor: c ? undefined : VIEW_COLOR[k] }}>
                        <span className="text-xs font-black" style={{ color: VIEW_COLOR[k] }}>{VIEW_LABEL[k]}</span>
                        {c ? <ViewGrid g={c.g} kind={k} cell={18} cropped hideHint /> : <span className="text-[11px] font-bold text-ink-soft">kartı buraya</span>}
                      </Drop>
                    )
                  })}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {cards.filter((c) => !Object.values(placed).includes(c.id)).map((c) => (
                    <Drag key={c.id} dnd={dnd} item={`card-${c.id}`} label="Görünüm kartı" disabled={allPlaced} className="grid min-h-20 min-w-20 place-items-center rounded-2xl bg-white text-ink p-2 shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
                      <ViewGrid g={c.g} kind="arka" cell={16} cropped hideHint />
                    </Drag>
                  ))}
                </div>
                {miss && <div className="mt-2"><Nudge key={miss.n} question={SLOT_NUDGE[miss.k]} /></div>}
              </Card>
            )}
          </>
        }
      />
      {allPlaced && <div className="mx-auto max-w-2xl"><Finish rule={rule} last={last} ask={ask} checks={checks} onNext={() => onDone(checks.pass(), [rule])} /></div>}
    </div>
  )
}

/* ───────────── 2. Görünümleri çiz ───────────── */

const DRAW_HINT: Record<ViewKind, string> = {
  on: 'Önden görünümde her sütunu, o sütundaki EN YÜKSEK kule kadar boya. Arkadaki kuleler öndekilerle aynı sütuna düşer.',
  sag: 'Sağdan bakınca ön sıra solda, arka sıra sağda kalır. Her sıranın en yüksek kulesi kadar boya.',
  ust: 'Üstten bakınca her kule tek bir kare olur. Arka sıra yukarıda, ön sıra aşağıda.',
  sol: '',
  arka: '',
}
const emptyDraw = () => ({ on: blank(4, 4), sag: blank(4, 4), ust: blank(4, 4) }) as Record<'on' | 'sag' | 'ust', Grid>

function DrawViews({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [maps] = useState(() => shuffle(DRAW).slice(0, 2).map((m) => place(m, 4, 4)))
  const [round, setRound] = useState(0)
  const [drawn, setDrawn] = useState(emptyDraw)
  const [result, setResult] = useState<Record<string, boolean> | null>(null)
  const [fails, setFails] = useState(0)
  const [showFaint, setShowFaint] = useState(false)
  const [solved, setSolved] = useState(false)
  const [end, setEnd] = useState(false)
  const h = maps[round]
  const truth = (k: ViewKind) => view(h, k)

  const paint = (k: 'on' | 'sag' | 'ust') => (r: number, c: number, v: boolean) => {
    setResult(null)
    setDrawn((d) => ({ ...d, [k]: d[k].map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) }))
  }
  const check = () => {
    const res = Object.fromEntries(KINDS.map((k) => [k, sameView(drawn[k as 'on'], truth(k))]))
    setResult(res)
    if (KINDS.every((k) => res[k])) {
      setSolved(true)
      return
    }
    checks.fail()
    setFails((f) => f + 1)
  }
  const next = () => {
    if (round === maps.length - 1) {
      setEnd(true)
      return
    }
    setRound(round + 1)
    setDrawn(emptyDraw())
    setResult(null)
    setFails(0)
    setShowFaint(false)
    setSolved(false)
  }
  const firstBad = result ? KINDS.find((k) => !result[k]) : undefined
  const rule = 'Önden görünümde her sütun o sütundaki en yüksek kule kadardır; sağdan görünümde her sıra o sıradaki en yüksek kule kadardır; üstten görünüm yapının yerdeki izidir.'
  const ask: Ask = {
    q: 'Bir arkadaşın “Önden görünümde 5 kare var, öyleyse yapı 5 küptür.” diyor. Haklı mı?',
    options: [
      { label: 'Hayır. Arkadaki küpler önden görünmez; yapıda daha çok küp olabilir.', ok: true },
      { label: 'Evet. Görünümdeki kare sayısı küp sayısına eşittir.', nudge: 'Çizdiğin yapının önden görünümündeki kareleri say, sonra 3B yapıdaki küpleri say. Aynı mı?', mis: 'Görünümdeki kare sayısını küp sayısı sanmak' },
      { label: 'Hayır. Yapı her zaman 5’ten az küptür.', nudge: 'Önden görünümdeki her kare en az bir küpten gelir. Daha az küp olabilir mi?' },
    ],
  }
  return (
    <div className="space-y-4">
      <Rounds i={end ? maps.length : round} n={maps.length} />
      {!end && (
        <Layout
          scene={<CubeScene key={round} h={h} views={round === 0 ? ['iso', 'on', 'sag', 'ust'] : ['iso']} paintable={round === 0} />}
          panel={
            <>
              <Now done={solved}>
                {solved ? 'Üç görünümü de doğru çizdin!' : round === 0 ? 'Yapıya bak ve üç görünümü kareli kâğıda boya. İstersen düz bakış düğmelerini kullan.' : 'Bu kez düz bakış yok! Yapıyı çevirerek zihninde canlandır ve görünümleri çiz.'}
              </Now>
              <Card>
                <div className="flex flex-wrap justify-around gap-3">
                  {KINDS.map((k) => (
                    <ViewGrid
                      key={k}
                      kind={k}
                      g={drawn[k as 'on']}
                      editable={!solved}
                      onPaint={paint(k as 'on')}
                      cell={30}
                      title={VIEW_LABEL[k]}
                      status={result ? (result[k] ? 'ok' : 'bad') : null}
                      wrong={result && !result[k] ? wrongCells(drawn[k as 'on'], truth(k)) : undefined}
                      faint={showFaint && !result?.[k] ? placeOn(truth(k), 4, 4) : undefined}
                    />
                  ))}
                </div>
              </Card>
              {firstBad && <Nudge key={fails} question={DRAW_HINT[firstBad]} misconception={firstBad === 'on' ? 'Önden görünümde arkadaki kuleleri ayrı sütun saymak' : undefined} />}
              {!solved && (
                <div className="flex gap-2">
                  <button type="button" onClick={check} className="btn-primary min-h-14 flex-1 text-lg">Kontrol et</button>
                  {fails >= 2 && !showFaint && <button type="button" onClick={() => { checks.hint(); setShowFaint(true) }} className="min-h-14 rounded-2xl bg-amber-100 px-3 text-sm font-black text-amber-900 ring-1 ring-amber-300">Soluk ipucu göster</button>}
                </div>
              )}
              {solved && (
                <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{round === maps.length - 1 ? 'Devam' : 'Sonraki yapı'} <ArrowRight size={20} /></button>
              )}
            </>
          }
        />
      )}
      {end && <div className="mx-auto max-w-2xl"><Finish rule={rule} last={last} ask={ask} checks={checks} onNext={() => onDone(checks.pass(), [rule])} /></div>}
    </div>
  )
}

/* ───────────── 3. Görünümlerden yapı kur ───────────── */

function ViewCompare({ target, mine, n }: { target: HMap; mine: HMap; n: number }) {
  return (
    <Card>
      <div className="mb-2 grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1 text-xs font-black text-ink-soft">
        <span />
        <span className="text-center">Hedef</span>
        <span className="text-center">Senin yapın</span>
        {KINDS.map((k) => {
          const ok = count(mine) > 0 && sameView(view(mine, k), view(target, k))
          return (
            <div key={k} className="contents">
              <span className="text-sm" style={{ color: VIEW_COLOR[k] }}>{VIEW_LABEL[k]}</span>
              <div className="grid place-items-center rounded-xl bg-slate-50 p-1.5 ring-1 ring-line"><ViewGrid g={view(target, k)} kind={k} cell={18} cropped hideHint /></div>
              <div className={`relative grid min-h-16 place-items-center rounded-xl p-1.5 ring-2 ${ok ? 'bg-emerald-50 ring-emerald-400' : 'bg-white text-ink ring-line'}`}>
                {count(mine) ? <ViewGrid g={view(mine, k)} kind={k} cell={18} cropped hideHint /> : <span className="text-[11px]">henüz küp yok</span>}
                {ok && <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-emerald-500 text-sm text-white">✓</span>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-center text-sm font-black text-ink">Kullandığın küp: <span className="text-xl tabular-nums">{n}</span></p>
    </Card>
  )
}

function BuildFromViews({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [targets] = useState(() => [pick(BUILD.slice(0, 2)), pick(BUILD.slice(2))])
  const [round, setRound] = useState(0)
  const [h, setH] = useState(() => place([[0]], 4, 4))
  const [end, setEnd] = useState(false)
  const target = targets[round]
  const match = count(h) > 0 && KINDS.every((k) => sameView(view(h, k), view(target, k)))
  const next = () => {
    if (round === targets.length - 1) return setEnd(true)
    setRound(round + 1)
    setH(place([[0]], 4, 4))
  }
  const rule = 'Önce üstten görünümle kulelerin yere nereye konacağını, sonra önden ve sağdan görünümle kulelerin kaç kat olacağını bulurum.'
  const ask: Ask = {
    q: 'Yapıyı kurmaya hangi görünümle başlamak işini en çok kolaylaştırdı?',
    options: [
      { label: 'Üstten görünüm: kulelerin yerde nerede durduğunu gösterir.', ok: true },
      { label: 'Önden görünüm: yapının kaç küp olduğunu gösterir.', nudge: 'Önden görünüm arkadaki küpleri gösterir mi?', mis: 'Önden görünümün küp sayısını verdiğini sanmak' },
      { label: 'Hiçbiri; görünümlerle yapı kurulamaz.', nudge: 'Az önce görünümlere bakarak bir yapı kurdun!' },
    ],
  }
  return (
    <div className="space-y-4">
      <Rounds i={end ? targets.length : round} n={targets.length} />
      {!end && (
        <Layout
          scene={<CubeScene key={round} h={h} onChange={setH} color="#f59e0b" paintable={false} />}
          panel={
            <>
              <Now done={match}>{match ? 'Üç görünüm de tuttu! Yapını kurdun.' : 'Küpleri sürükleyerek görünümleri “Hedef” sütunundakilerle aynı olan bir yapı kur.'}</Now>
              <ViewCompare target={target} mine={h} n={count(h)} />
              {match && <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{round === targets.length - 1 ? 'Devam' : 'Sonraki yapı'} <ArrowRight size={20} /></button>}
            </>
          }
        />
      )}
      {end && <div className="mx-auto max-w-2xl"><Finish rule={rule} last={last} ask={ask} checks={checks} onNext={() => onDone(checks.pass(), [rule])} /></div>}
    </div>
  )
}

/* ───────────── 4. Görünüm dedektifi ───────────── */

interface Challenge { text: ReactNode; ok: (ch: ViewKind[]) => boolean; win: string }
const CHALLENGES: Challenge[] = [
  { text: <>Bir küp ekle: <b className="text-green-700">üstten</b> görünüm değişsin ama <b className="text-blue-700">önden</b> görünüm değişmesin.</>, ok: (c) => c.includes('ust') && !c.includes('on'), win: 'Yeni bir yere konan küp üstten görünümü değiştirdi; önündeki ya da arkasındaki kule daha yüksek olduğu için önden görünüm aynı kaldı.' },
  { text: <>Bir küp ekle: <b className="text-blue-700">önden</b> görünüm değişsin ama <b className="text-green-700">üstten</b> görünüm değişmesin.</>, ok: (c) => c.includes('on') && !c.includes('ust'), win: 'Küpü bir kulenin üstüne koyunca kule sütunundaki en yüksek kule oldu: önden görünüm uzadı, yerdeki iz aynı kaldı.' },
  { text: <>Öyle bir küp ekle ki <b>hiçbir görünüm</b> değişmesin!</>, ok: (c) => c.length === 0, win: 'Bu küp üç görünümde de gizli kaldı: önünde, yanında daha yüksek kuleler var ve üstten bakınca zaten dolu bir karenin üstünde.' },
]

function Detective({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const base = useMemo(() => place(DETECTIVE, 5, 5), [])
  const [ci, setCi] = useState(0)
  const [h, setH] = useState(base)
  const [msg, setMsg] = useState<{ ok: boolean; text: string; k: number } | null>(null)
  const [flash, setFlash] = useState<[number, number, number][]>([])
  const [end, setEnd] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const C = CHALLENGES[ci]
  const n0 = count(base)

  const onChange = (next: HMap) => {
    if (msg?.ok) return
    setH(next)
    if (count(next) !== n0 + 1) return
    const ch = changedViews(base, next)
    let at: [number, number, number] = [0, 0, 0]
    next.forEach((r, d) => r.forEach((v, x) => v !== base[d][x] && (at = [x, d, v - 1])))
    if (C.ok(ch)) {
      setMsg({ ok: true, text: C.win, k: Date.now() })
      return
    }
    checks.fail()
    setFlash([at])
    setMsg({ ok: false, text: ch.length ? `Bu küp ${ch.map((k) => VIEW_LABEL[k].toLowerCase()).join(' ve ')} görünümü değiştirdi. Küp geri alındı; başka bir yer dene.` : 'Hiçbir görünüm değişmedi. Bu görevde bir görünümün değişmesi gerekiyor. Başka bir yer dene.', k: Date.now() })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setFlash([])
      setH(base)
    }, 1800)
  }
  const next = () => {
    setMsg(null)
    setH(base)
    if (ci === CHALLENGES.length - 1) setEnd(true)
    else setCi(ci + 1)
  }
  const changed = changedViews(base, h)
  const rule = 'Bir küp eklemek her görünümü değiştirmez. Önden ve yandan görünüm en yüksek kulelere, üstten görünüm yerdeki ize bağlıdır; hiçbir görünüme yansımayan gizli küpler olabilir.'
  const ask: Ask = {
    q: 'Yapıya bir küp ekledin ama üç görünüm de değişmedi. Bu bize ne gösteriyor?',
    options: [
      { label: 'Görünümler, yapıdaki küp sayısını her zaman tam olarak söylemez.', ok: true },
      { label: 'O küp aslında yapıya eklenmedi.', nudge: '“3B” düğmesine basıp yapıyı çevir. Küp sayacı kaç gösteriyor?' },
      { label: 'Görünümleri yanlış çizmişiz.', nudge: 'Önden, sağdan ve üstten düz bakışa geç. Görünümler gerçekten aynı mı?', mis: 'Görünümlerin küp sayısını tek türlü belirlediğini sanmak' },
    ],
  }
  return (
    <div className="space-y-4">
      <Rounds i={end ? CHALLENGES.length : ci} n={CHALLENGES.length} />
      {!end && (
        <Layout
          scene={<CubeScene key={ci} h={h} onChange={onChange} addOnly canAdd={(nx) => count(nx) <= n0 + 1} color="#a78bfa" maxH={4} flash={flash} paintable />}
          panel={
            <>
              <Now done={msg?.ok}>{C.text}</Now>
              {msg && (
                <div key={msg.k} className={`rounded-2xl px-3 py-2 text-[15px] font-extrabold ring-2 animate-fade-up ${msg.ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-300' : 'bg-amber-50 text-amber-900 ring-amber-300'}`}>
                  {msg.ok && <Sparkles size={16} className="mr-1 inline" />}
                  {msg.text}
                </div>
              )}
              <Card>
                <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Görünümler (başlangıç → şimdi)</p>
                <div className="space-y-2">
                  {KINDS.map((k) => {
                    const ch = changed.includes(k)
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-16 text-sm font-black" style={{ color: VIEW_COLOR[k] }}>{VIEW_LABEL[k]}</span>
                        <ViewGrid g={view(base, k)} kind={k} cell={14} cropped hideHint />
                        <ArrowRight size={16} className="shrink-0 text-ink-soft" />
                        <ViewGrid g={view(h, k)} kind={k} cell={14} cropped hideHint />
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-black ${ch ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-ink-soft'}`}>{ch ? 'değişti' : 'aynı'}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-sm font-black">Küp sayısı: {n0} → <span className="tabular-nums">{count(h)}</span></p>
              </Card>
              {msg?.ok && <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{ci === CHALLENGES.length - 1 ? 'Devam' : 'Sonraki görev'} <ArrowRight size={20} /></button>}
            </>
          }
        />
      )}
      {end && <div className="mx-auto max-w-2xl"><Finish rule={rule} last={last} ask={ask} checks={checks} onNext={() => onDone(checks.pass(), [rule])} /></div>}
    </div>
  )
}

/* ───────────── 5. En az – en çok ───────────── */

function MinMaxTask({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [target] = useState(() => pick(MINMAX))
  const mm = useMemo(() => minMax(target), [target])
  const [phase, setPhase] = useState<'min' | 'max' | 'end'>('min')
  const [h, setH] = useState(() => place([[0]], 4, 4))
  const [won, setWon] = useState(false)
  const n = count(h)
  const match = n > 0 && KINDS.every((k) => sameView(view(h, k), view(target, k)))
  useEffect(() => {
    if (!match || won) return
    if ((phase === 'min' && n === mm.min) || (phase === 'max' && n === mm.max)) setWon(true)
  }, [match, n, phase, won, mm])
  const rule = 'Görünümleri aynı olan farklı yapılar olabilir. Bu yüzden görünümleri verilen bir yapı için en az ve en çok küp sayısını bulabilirim.'
  const ask: Ask = {
    q: `Bu görünümlere sahip yapılar en az ${mm.min}, en çok ${mm.max} küpten oluşuyor. Bundan ne öğreniyoruz?`,
    options: [
      { label: 'Aynı görünümlere sahip farklı yapılar olabilir.', ok: true },
      { label: 'Görünümler yapıyı her zaman tek türlü belirler.', nudge: `Az önce aynı görünümlerle hem ${mm.min} hem ${mm.max} küplük yapı kurdun. Bu iki yapı aynı mı?`, mis: 'Görünümlerin yapıyı tek türlü belirlediğini sanmak' },
      { label: 'Küp sayısı görünümlerdeki karelerin toplamıdır.', nudge: 'Üç görünümdeki kareleri topla. Bu sayı kurduğun yapılardan birinin küp sayısına eşit mi?' },
    ],
  }
  let hint: string | null = null
  if (match && !won) hint = phase === 'min' ? `Görünümler tuttu ama ${n} küp kullandın. Daha az küple de olur mu? Hiçbir görünümü değiştirmeden çıkarabileceğin bir küp ara.` : `Görünümler tuttu ve ${n} küp var. Görünümleri bozmadan daha fazla küp sığdırabilir misin? Gizli boşlukları ara.`
  return (
    <div className="space-y-4">
      <Rounds i={phase === 'min' ? 0 : phase === 'max' ? 1 : 2} n={2} />
      {phase !== 'end' && (
        <Layout
          scene={<CubeScene key={phase} h={h} onChange={(x) => !won && setH(x)} color={phase === 'min' ? '#34d399' : '#f472b6'} paintable={false} />}
          panel={
            <>
              <Now done={won}>
                {won ? (phase === 'min' ? `Evet! Bu görünümler için en az ${mm.min} küp gerekir.` : `Evet! Bu görünümlere en çok ${mm.max} küp sığar.`) : phase === 'min' ? <>Görünümleri aşağıdaki gibi olan yapıyı <b className="text-emerald-700">EN AZ</b> küple kur.</> : <>Şimdi aynı görünümleri bozmadan yapıyı <b className="text-pink-700">EN ÇOK</b> küple kur.</>}
              </Now>
              {hint && <div className="rounded-2xl bg-amber-50 px-3 py-2 text-[15px] font-extrabold text-amber-900 ring-2 ring-amber-300 animate-fade-up">{hint}</div>}
              <ViewCompare target={target} mine={h} n={n} />
              {won && (
                <button
                  type="button"
                  className="btn-primary min-h-14 w-full text-lg animate-fade-up"
                  onClick={() => {
                    setWon(false)
                    if (phase === 'min') setPhase('max')
                    else setPhase('end')
                  }}
                >
                  {phase === 'min' ? 'Şimdi en çok küple' : 'Devam'} <ArrowRight size={20} />
                </button>
              )}
            </>
          }
        />
      )}
      {phase === 'end' && <div className="mx-auto max-w-2xl"><Finish rule={rule} last={last} ask={ask} checks={checks} onNext={() => onDone(checks.pass(), [rule])} /></div>}
    </div>
  )
}
