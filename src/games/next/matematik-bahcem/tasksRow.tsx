import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Droplets, Fence, Layers, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { ek } from '../../../lib/generators'
import { SolutionList } from '../../kit2'
import { DragSource } from './drag'
import { Bloom, KINDS, SHAPES, Stone } from './flowers'
import { GardenScene, type Bed, type GCell } from './GardenScene'
import { codeOf, period, seqOf, type FamCard } from './levels'
import { Actions, colorsOf, Layout, SeedTray, ShareBox, shapesOf, type Api, type NudgeState } from './shared'

/* ───────────────────────────── ortak yardımcılar ───────────────────────────── */

const eq = (a: (number | null)[], b: (number | null)[]) => a.length === b.length && a.every((x, i) => x === b[i])
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i)
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Dar ekranda sırayı ikiye böl */
function useCols(max = 10) {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024))
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w < 560 ? Math.min(max, 6) : max
}

function usePlot(initial: (number | null)[], editable: (i: number) => boolean) {
  const [cells, setCells] = useState<(number | null)[]>(initial)
  const [sel, setSel] = useState<number | null>(null)
  const plant = (k: number, zone?: string): boolean => {
    let i = -1
    if (zone?.startsWith('cell-')) i = Number(zone.slice(5))
    else if (sel !== null) i = sel
    else i = cells.findIndex((c, j) => c === null && editable(j))
    if (i < 0 || !editable(i)) return false
    setCells(cells.map((c, j) => (j === i ? k : c)))
    setSel(null)
    return true
  }
  const tap = (i: number) => {
    if (!editable(i)) return
    if (cells[i] !== null) {
      setCells(cells.map((c, j) => (j === i ? null : c)))
      setSel(i)
    } else setSel(sel === i ? null : i)
  }
  return { cells, setCells, sel, setSel, plant, tap }
}

function useWater() {
  const [on, setOn] = useState(false)
  const t = useRef<number>()
  useEffect(() => () => window.clearTimeout(t.current), [])
  return [
    on,
    () => {
      setOn(true)
      window.clearTimeout(t.current)
      t.current = window.setTimeout(() => setOn(false), reduced() ? 200 : 1300)
    },
  ] as const
}

function SceneBox({ children }: { children: ReactNode }) {
  return (
    <div data-drop="bed">
      <ZoomBox className="overflow-hidden rounded-3xl shadow-[0_6px_24px_rgba(22,101,52,.16)] ring-1 ring-green-200">{children}</ZoomBox>
    </div>
  )
}

const cellLabel = (k: number | null, i: number, item: 'flower' | 'stone' = 'flower', edit = false) =>
  k === null ? `${i + 1}. çukur: boş${edit ? '. Seçmek için dokun' : ''}` : `${i + 1}. ${item === 'flower' ? KINDS[k].name : `${SHAPES[k].name} taşı`}${edit ? '. Sökmek için dokun' : ''}`

/* ───────────────────────────── devam ettir / düzelt / başka çiçekle ───────────────────────────── */

export function PlantTask({ api }: { api: Api }) {
  const { L, grade } = api
  const g1 = grade <= 1
  const core = L.core!
  const isExtend = L.kind === 'extend'
  const isFix = L.kind === 'fix'
  const isRemake = L.kind === 'remake'
  const seq = seqOf(core, L.len!)
  const cols = useCols(L.len! > 10 ? 6 : 10)
  const initial: (number | null)[] = isExtend ? seq.map((k, i) => (i < L.given! ? k : null)) : isFix ? seq.map((k, i) => L.errors![i] ?? k) : Array(L.len).fill(null)
  const editable = (i: number) => !api.finished && (isExtend ? i >= L.given! : true)
  const plot = usePlot(initial, editable)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [bad, setBad] = useState<Set<number>>(new Set())
  const [bloom, setBloom] = useState(false)
  const [water, pour] = useWater()
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const clearT = useRef<number>()
  useEffect(() => () => window.clearTimeout(clearT.current), [])

  const touch = () => {
    setBad(new Set())
    setNudge(null)
  }
  const plant = (k: number, zone?: string) => {
    if (api.finished) return
    if (zone === 'bed') zone = undefined
    if (!plot.plant(k, zone)) setNudge({ question: isFix ? 'Önce yanlış çiçeği sök: üstüne dokun.' : 'Bütün çukurlar dolu. Değiştirmek istediğin çiçeğe dokun.' })
    else touch()
  }

  const check = () => {
    const cells = plot.cells
    const editIdx = isExtend ? range(L.given!, L.len!) : range(0, L.len!)
    const empty = editIdx.find((i) => cells[i] === null)
    if (empty !== undefined) {
      plot.setSel(empty)
      setNudge({ question: g1 ? 'Boş çukur kaldı! Oraya da çiçek dik.' : 'Önce bütün çukurlara çiçek dik.' })
      return
    }
    pour()
    if (isRemake) {
      const target = cells as number[]
      const src = seq
      if (eq(target, src)) {
        setNudge({ question: 'Bunlar üstteki çiçeklerin aynısı! Başka çiçeklerle dene.' })
        return
      }
      if (codeOf(target) !== codeOf(src)) {
        api.miss()
        const same = new Set(target).size === new Set(src).size
        setNudge({
          question: g1 ? 'Üstte hangi çiçekler tekrar ediyor? Alttakiler de aynı sırayla tekrar etmeli.' : `Üstteki örüntünün harfleri ${codeOf(src)}. Seninki ${codeOf(target)} oldu. Hangisi farklı?`,
          misconception: same ? 'Örüntünün yapısını korumadan çevirdi' : undefined,
          tool: 'oruntubloklari',
        })
        return
      }
      const key = target.slice(0, core.length).join('')
      if (found.some((f) => f.key === key)) {
        setNudge({ question: 'Bu yolu zaten buldun. Başka çiçekler seç!' })
        return
      }
      api.ok()
      const label = colorsOf(target.slice(0, core.length))
      api.addSol(`${api.li}:${key}`, label)
      api.strat('Yapıyı koruyarak çevirme')
      const next = [...found, { key, label }]
      setFound(next)
      setBloom(true)
      if (next.length >= L.goal) {
        api.complete(L.note, next.length - L.goal)
        return
      }
      setNudge({ tone: 'ok', question: `Harika! Örüntü yine ${codeOf(src)}. ${L.goal - next.length} yol daha bul!` })
      clearT.current = window.setTimeout(() => {
        plot.setCells(Array(L.len).fill(null))
        setBloom(false)
      }, 1500)
      return
    }
    const wrong = editIdx.filter((i) => cells[i] !== seq[i])
    if (wrong.length) {
      api.miss()
      setBad(new Set(wrong))
      let mis: string | undefined
      if (isExtend) {
        const child = editIdx.map((i) => cells[i])
        const restart = editIdx.map((_, j) => core[j % core.length])
        if (!eq(restart, editIdx.map((i) => seq[i])) && eq(child, restart)) mis = 'Örüntüyü kaldığı yerden değil, çekirdeğin başından sürdürdü'
        else if (child.every((k) => k === seq[L.given! - 1])) mis = 'Son çiçeği tekrarladı (çekirdeği görmedi)'
      }
      setNudge({
        question: isFix
          ? g1
            ? 'Soru işaretli çiçeğe bak. Çiçekleri üçerli grupla: o grup diğerlerine benziyor mu?'
            : `Hâlâ kurala uymayan çiçek var. Çiçekleri ${ek(core.length, 'dist')} grupla: hangi grup farklı?`
          : g1
            ? 'Soru işaretli çiçeğe bak. Baştan sesli söyle: oraya hangisi gelir?'
            : `${wrong[0] + 1}. çiçeğe bak. Çekirdeği baştan söyleyerek oraya kadar say.`,
        misconception: mis,
        tool: 'oruntubloklari',
      })
      return
    }
    api.ok()
    setBloom(true)
    api.complete(L.note)
  }

  const cellsFor = (edit: boolean): GCell[] =>
    plot.cells.map((k, i) => {
      const e = edit && editable(i)
      return {
        kind: k,
        drop: e ? `cell-${i}` : undefined,
        selected: plot.sel === i,
        onTap: e ? () => { plot.tap(i); touch() } : undefined,
        mark: bad.has(i) ? 'bad' : undefined,
        wilt: bad.has(i),
        grow: bloom && (isExtend ? i >= L.given! : true),
        tag: g1 ? undefined : String(i + 1),
        label: cellLabel(k, i, 'flower', e),
      }
    })
  const beds: Bed[] = isRemake
    ? [
        { key: 'src', item: 'flower', title: 'Örnek', cells: seq.map((k, i) => ({ kind: k, label: cellLabel(k, i) })) },
        { key: 'dst', item: 'flower', title: 'Senin tarhın', cells: cellsFor(true) },
      ]
    : [{ key: 'bed', item: 'flower', cells: cellsFor(true), cols }]

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GardenScene beds={beds} watering={water} cols={cols} ariaLabel={`Bahçe: ${plot.cells.map((k) => (k === null ? 'boş' : KINDS[k].color)).join(', ')}`} />
        </SceneBox>
      }
      tray={
        <SeedTray
          kinds={L.kinds!}
          item="flower"
          onPick={(k) => plant(k)}
          onDrop={(k, z) => plant(k, z)}
          disabled={api.finished}
          title="Tohum paketleri"
          help={isFix ? 'Yanlış çiçeğe dokun, sök. Sonra tohum seç.' : g1 ? 'Tohumu çukura sürükle ya da dokun.' : 'Tohumu çukura sürükle ya da dokun. Çiçeğe dokunursan sökülür.'}
        />
      }
      actions={
        <Actions api={api} primary={{ label: 'Sula ve kontrol et', icon: <Droplets size={20} />, onClick: check }} nudge={nudge} onCloseNudge={() => setNudge(null)}>
          {isRemake && <SolutionList list={found} goal={L.goal} />}
        </Actions>
      }
    />
  )
}

/* ───────────────────────────── çekirdeği çitle ───────────────────────────── */

export function CoreTask({ api }: { api: Api }) {
  const { L } = api
  const core = L.core!
  const seq = seqOf(core, L.len!)
  const cols = useCols(6)
  const [fences, setFences] = useState<Set<number>>(new Set())
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [bad, setBad] = useState<Set<number>>(new Set())
  const [water, pour] = useWater()
  const [done, setDone] = useState(false)

  const toggle = (i: number) => {
    if (api.finished || i >= seq.length - 1) return
    const f = new Set(fences)
    if (f.has(i)) f.delete(i)
    else f.add(i)
    setFences(f)
    setBad(new Set())
    setNudge(null)
  }
  const check = () => {
    if (!fences.size) {
      setNudge({ question: 'Önce çit koy: ilk çekirdeğin son çiçeğine dokun.' })
      return
    }
    const groups: number[][] = []
    const starts: number[] = []
    let cur: number[] = []
    seq.forEach((k, i) => {
      if (!cur.length) starts.push(i)
      cur.push(k)
      if (fences.has(i) || i === seq.length - 1) {
        groups.push(cur)
        cur = []
      }
    })
    const diff = groups.findIndex((g) => !eq(g, groups[0]))
    if (diff >= 0) {
      api.miss()
      setBad(new Set(range(starts[diff], starts[diff] + groups[diff].length)))
      setNudge({
        question: `${diff + 1}. grup ile 1. grup aynı mı? Çiçekleri tek tek karşılaştır. Her çekirdeğin sonuna bir çit gerekir.`,
        misconception: groups[0].length < core.length ? 'Çekirdeği eksik seçti' : undefined,
        tool: 'oruntubloklari',
      })
      return
    }
    pour()
    if (groups[0].length !== core.length) {
      setNudge({ question: 'Bu gruplar da birbirinin aynısı! Ama her grubun içinde daha kısa bir parça tekrar ediyor mu?' })
      return
    }
    api.ok()
    setDone(true)
    api.complete(`${L.note} Harflerle: ${codeOf(core)}.`)
  }

  const cells: GCell[] = seq.map((k, i) => ({
    kind: k,
    tag: String(i + 1),
    onTap: api.finished ? undefined : () => toggle(i),
    mark: bad.has(i) ? 'bad' : done && fences.has(i) ? 'ok' : undefined,
    label: `${i + 1}. ${KINDS[k].name}${fences.has(i) ? ', sonrasında çit var' : ''}. Çit koymak ya da kaldırmak için dokun`,
  }))
  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GardenScene beds={[{ key: 'b', item: 'flower', cells, fences, cols }]} watering={water} cols={cols} ariaLabel={`Bahçe: ${seq.length} çiçek, ${fences.size} çit`} />
        </SceneBox>
      }
      tray={
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-[linear-gradient(180deg,#f0fdf4,#ecfccb)] p-3 ring-1 ring-green-200">
          <p className="flex items-center gap-2 text-sm font-bold text-green-900"><Fence size={18} />Bir çiçeğe dokun: ondan sonra çit dikilir. Yeniden dokunursan çit kalkar.</p>
          {done && (
            <span className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-base font-black text-green-900 ring-1 ring-green-200">
              Çekirdek: {codeOf(core).split('').join(' ')}
            </span>
          )}
        </div>
      }
      actions={
        <Actions
          api={api}
          primary={{ label: 'Çitleri kontrol et', icon: <Fence size={20} />, onClick: check }}
          secondary={
            fences.size > 0 && !api.finished ? (
              <button type="button" onClick={() => setFences(new Set())} className="inline-flex min-h-14 items-center gap-1.5 rounded-2xl bg-white px-4 text-base font-extrabold text-ink ring-1 ring-line" aria-label="Çitleri kaldır">
                <Trash2 size={18} />
              </button>
            ) : undefined
          }
          nudge={nudge}
          onCloseNudge={() => setNudge(null)}
        />
      }
    />
  )
}

/* ───────────────────────────── çiçekten taşa çeviri ───────────────────────────── */

export function TranslateTask({ api }: { api: Api }) {
  const { L } = api
  const core = L.core!
  const seq = seqOf(core, L.len!)
  const plot = usePlot(Array(L.len).fill(null), () => !api.finished)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const [water, pour] = useWater()
  const [bad, setBad] = useState(false)
  const t = useRef<number>()
  useEffect(() => () => window.clearTimeout(t.current), [])

  const place = (k: number, zone?: string) => {
    if (api.finished) return
    if (zone === 'bed') zone = undefined
    if (!plot.plant(k, zone)) setNudge({ question: 'Patika dolu. Değiştirmek istediğin taşa dokun.' })
    else {
      setNudge(null)
      setBad(false)
    }
  }
  const check = () => {
    const c = plot.cells
    const empty = c.findIndex((x) => x === null)
    if (empty >= 0) {
      plot.setSel(empty)
      setNudge({ question: 'Patikada boş yer kaldı. Her çiçeğin altına bir taş koy.' })
      return
    }
    const stones = c as number[]
    if (codeOf(stones) !== codeOf(seq)) {
      api.miss()
      setBad(true)
      setNudge({
        question: `Çiçeklerin harfleri ${codeOf(seq.slice(0, core.length))}. Taşlar da aynı yapıda mı? Aynı çiçeklerin altına aynı şekil gelmeli.`,
        misconception: new Set(stones).size !== new Set(seq).size || codeOf(stones) !== codeOf(seq) ? 'Örüntünün yapısını korumadan çevirdi' : undefined,
        tool: 'oruntubloklari',
      })
      return
    }
    const key = stones.slice(0, core.length).join('')
    if (found.some((f) => f.key === key)) {
      setNudge({ question: 'Bu çeviriyi buldun. Başka şekillerle dene!' })
      return
    }
    pour()
    api.ok()
    const label = shapesOf(stones.slice(0, core.length))
    api.addSol(`${api.li}:${key}`, label)
    api.stats.translations.push(label)
    const next = [...found, { key, label }]
    setFound(next)
    if (next.length >= L.goal) {
      api.complete(`${L.note} ${next.map((f) => f.label).join('  |  ')}`, next.length - L.goal)
      return
    }
    setNudge({ tone: 'ok', question: `Harika! ${label} … Yapı aynı: ${codeOf(seq.slice(0, core.length))}. Şimdi başka şekillerle bir daha yap!` })
    t.current = window.setTimeout(() => plot.setCells(Array(L.len).fill(null)), 1400)
  }

  const beds: Bed[] = [
    { key: 'f', item: 'flower', title: 'Çiçekler', cells: seq.map((k, i) => ({ kind: k, label: cellLabel(k, i) })) },
    {
      key: 's',
      item: 'stone',
      title: 'Taş patika',
      cells: plot.cells.map((k, i) => ({
        kind: k,
        drop: api.finished ? undefined : `cell-${i}`,
        selected: plot.sel === i,
        onTap: api.finished ? undefined : () => { plot.tap(i); setNudge(null); setBad(false) },
        mark: bad ? 'bad' : undefined,
        label: cellLabel(k, i, 'stone', true),
      })),
    },
  ]
  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GardenScene beds={beds} watering={water} ariaLabel="Çiçek örüntüsü ve taş patika" />
        </SceneBox>
      }
      tray={<SeedTray kinds={[0, 1, 2, 3]} item="stone" onPick={(k) => place(k)} onDrop={(k, z) => place(k, z)} disabled={api.finished} title="Taş sepeti" help="Taşı patikaya sürükle ya da dokun. Taşa dokunursan kalkar." />}
      actions={
        <Actions api={api} primary={{ label: 'Patikayı kontrol et', icon: <Sparkles size={20} />, onClick: check }} nudge={nudge} onCloseNudge={() => setNudge(null)}>
          <SolutionList list={found} goal={L.goal} />
        </Actions>
      }
    />
  )
}

/* ───────────────────────────── örüntü aileleri ───────────────────────────── */

function MiniRow({ card }: { card: FamCard }) {
  const n = card.seq.length
  return (
    <svg viewBox={`0 0 ${n * 40} 44`} className="block h-9 w-full sm:h-10" aria-hidden>
      {card.seq.map((k, i) => (
        <g key={i} transform={`translate(${i * 40 + 20} 22)`}>
          {card.item === 'flower' ? (
            <g transform="scale(.5)"><Bloom kind={k} /></g>
          ) : (
            <g transform="scale(.58)"><Stone shape={k} r={30} /></g>
          )}
        </g>
      ))}
    </svg>
  )
}

const BOXES = ['AB', 'ABB', 'ABC']

export function FamilyTask({ api }: { api: Api }) {
  const { L } = api
  const cards = L.cards!
  const [where, setWhere] = useState<Record<string, string | null>>(() => Object.fromEntries(cards.map((c) => [c.id, null])))
  const [sel, setSel] = useState<string | null>(null)
  const [bad, setBad] = useState<Set<string>>(new Set())
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [water, pour] = useWater()

  const put = (id: string, box: string | null) => {
    if (api.finished) return
    setWhere({ ...where, [id]: box })
    setSel(null)
    setBad(new Set())
    setNudge(null)
  }
  const check = () => {
    const free = cards.filter((c) => !where[c.id])
    if (free.length) {
      setNudge({ question: 'Her kartı bir kutuya koy. Karta dokun, sonra kutuya dokun.' })
      return
    }
    const wrong = cards.filter((c) => where[c.id] !== c.code)
    if (wrong.length) {
      api.miss()
      setBad(new Set(wrong.map((c) => c.id)))
      const w = wrong[0]
      const looks = cards.some((o) => o.id !== w.id && where[o.id] === where[w.id] && o.item === w.item && o.code !== w.code)
      setNudge({
        question: `Soru işaretli kartı harflerle oku: ilk öğeye A de, farklı bir öğe gelince B de. ${w.item === 'flower' ? 'Çiçekler' : 'Taşlar'} hangi harflerle tekrar ediyor?`,
        misconception: looks ? 'Örüntüleri yapı yerine görünüşe (çiçek/taş) göre grupladı' : undefined,
        tool: 'oruntubloklari',
      })
      return
    }
    pour()
    api.ok()
    api.complete(L.note)
  }

  const Card = ({ c }: { c: FamCard }) => (
    <DragSource
      label={`${c.item === 'flower' ? 'Çiçek' : 'Taş'} örüntü kartı`}
      onTap={() => {
        if (where[c.id]) put(c.id, null)
        else setSel(sel === c.id ? null : c.id)
      }}
      onDrop={(z) => z.startsWith('box-') && put(c.id, z.slice(4))}
      ghost={<div className="w-44 rounded-2xl bg-white p-2 shadow-lg ring-2 ring-sky-300"><MiniRow card={c} /></div>}
      className={`relative w-full rounded-2xl bg-white p-2 ring-2 transition active:scale-95 ${sel === c.id ? 'ring-sky-400 bg-sky-50' : bad.has(c.id) ? 'ring-amber-400' : 'ring-green-200'} min-h-14`}
    >
      <MiniRow card={c} />
      {bad.has(c.id) && <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-amber-500 text-sm font-black text-white ring-2 ring-white">?</span>}
    </DragSource>
  )

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GardenScene beds={[{ key: 'all', item: 'letter', cells: 'ABABBABC'.split('').map((l) => ({ kind: 'ABCD'.indexOf(l) })), fences: new Set([1, 4]), cols: 8 }]} watering={water} cols={8} ariaLabel="Örüntü aileleri: AB, ABB, ABC" />
        </SceneBox>
      }
      tray={
        <div className={`mt-3 rounded-3xl bg-[linear-gradient(180deg,#f0fdf4,#ecfccb)] p-3 ring-1 ring-green-200 sm:p-4 ${api.finished ? 'pointer-events-none opacity-70' : ''}`}>
          <p className="mb-2 text-xs font-bold text-green-900/70">Kartı kutuya sürükle. Ya da karta, sonra kutuya dokun. Kutudaki karta dokunursan geri gelir.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cards.filter((c) => !where[c.id]).map((c) => <Card key={c.id} c={c} />)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {BOXES.map((b) => (
              <div
                key={b}
                data-drop={`box-${b}`}
                role="button"
                tabIndex={0}
                aria-label={`${b} kutusu`}
                onClick={() => sel && put(sel, b)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && sel && put(sel, b)}
                className={`min-h-28 rounded-2xl border-[3px] border-dashed p-2 transition data-[over]:border-sky-400 data-[over]:bg-sky-50 ${sel ? 'border-sky-300 bg-white' : 'border-green-300 bg-white/70'}`}
              >
                <p className="mb-1.5 text-center text-xl font-black tracking-[0.3em] text-green-900">{b}</p>
                <div className="grid gap-1.5">
                  {cards.filter((c) => where[c.id] === b).map((c) => <Card key={c.id} c={c} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      }
      actions={<Actions api={api} primary={{ label: 'Aileleri kontrol et', icon: <Layers size={20} />, onClick: check }} nudge={nudge} onCloseNudge={() => setNudge(null)} />}
    />
  )
}

/* ───────────────────────────── uzak terimi tahmin et ───────────────────────────── */

export function FarTask({ api }: { api: Api }) {
  const { L } = api
  const core = L.core!
  const n = L.n!
  const P = core.length
  const shown = seqOf(core, P * 2)
  const full = seqOf(core, n)
  const cols = useCols(10)
  const [groups, setGroups] = useState(0)
  const [guess, setGuess] = useState<number | null>(null)
  const [sel, setSel] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [bad, setBad] = useState(false)
  const [water, pour] = useWater()
  const [won, setWon] = useState(false)
  const maxGroups = Math.ceil(n / P)

  const plant = (k: number) => {
    if (api.finished) return
    setGuess(k)
    setSel(false)
    setBad(false)
    setNudge(null)
  }
  const check = () => {
    if (guess === null) {
      setSel(true)
      setNudge({ question: `Tahminini ${n}. çukura dik: bir tohuma dokun.` })
      return
    }
    pour()
    if (guess !== full[n - 1]) {
      api.miss()
      setBad(true)
      const off = guess === full[n - 2] || guess === seqOf(core, n + 1)[n]
      setNudge({
        question: `${n}. çiçek kaçıncı grupta? O grubun kaçıncı çiçeği? ${ek(P, 'dist')} grupla ve say.`,
        misconception: off ? 'Konumu bir kaydırdı (sayarken bir eksik/fazla)' : undefined,
        tool: 'yuzluk',
      })
      return
    }
    api.ok()
    api.strat(groups >= 2 ? 'Gruplayarak tahmin' : reveal ? 'Tek tek devam ettirme' : 'Zihinden gruplama')
    api.stats.far.push(`${n}. çiçek: ${KINDS[guess].color}`)
    setWon(true)
    setReveal(true)
    api.complete(`${n}. çiçek ${KINDS[guess].name}! ${L.note}.`)
  }

  const beds: Bed[] = [
    {
      key: 'shown',
      item: 'flower',
      cols,
      fences: new Set(range(0, 2).map((g) => g * P + P - 1)),
      cells: shown.map((k, i) => ({ kind: k, tag: String(i + 1), label: cellLabel(k, i) })),
    },
    reveal
      ? {
          key: 'full',
          item: 'flower',
          title: `1’den ${ek(n, 'dat')} kadar`,
          cols,
          fences: new Set(range(0, maxGroups).map((g) => g * P + P - 1)),
          cells: full.map((k, i) => ({ kind: i === n - 1 ? (guess ?? k) : k, tag: String(i + 1), hot: i === n - 1, grow: won && i === n - 1, mark: i === n - 1 && won ? 'ok' : undefined, label: cellLabel(k, i) })),
        }
      : {
          key: 'target',
          item: 'flower',
          title: `${n}. çiçek`,
          cells: [{ kind: guess, tag: String(n), hot: true, selected: sel, drop: 'cell-0', mark: bad ? 'bad' : undefined, wilt: bad, onTap: api.finished ? undefined : () => (guess !== null ? setGuess(null) : setSel(!sel)), label: guess === null ? `${n}. çukur: boş` : `${n}. çukur: ${KINDS[guess].name}. Sökmek için dokun` }],
        },
  ]

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GardenScene beds={beds} watering={water} cols={cols} ariaLabel={`İlk ${P * 2} çiçek gösteriliyor. ${n}. çiçek soruluyor.`} />
        </SceneBox>
      }
      tray={
        <>
          <div className="mt-3 rounded-3xl bg-white/85 p-3 ring-1 ring-green-200 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-green-900">Gruplama şeridi: her grup {P} çiçek</p>
              <div className="flex gap-2">
                <button type="button" disabled={api.finished || groups >= maxGroups} onClick={() => setGroups(groups + 1)} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-green-600 px-3 text-sm font-extrabold text-white active:scale-95 disabled:opacity-50">
                  + 1 grup
                </button>
                {groups > 0 && !api.finished && (
                  <button type="button" onClick={() => setGroups(0)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line" aria-label="Grupları sil"><Trash2 size={17} /></button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-y-2" aria-label={`${groups} grup: ${groups * P} çiçek`}>
              {range(0, maxGroups * P).map((i) => {
                const g = Math.floor(i / P)
                const inG = g < groups
                const end = i % P === P - 1
                const isN = i === n - 1
                const beyond = i >= n
                return (
                  <div key={i} className={`relative flex h-11 w-9 flex-col items-center justify-center ${end ? 'mr-2' : ''} ${inG ? (g % 2 ? 'bg-lime-200' : 'bg-green-200') : ''} ${inG && i % P === 0 ? 'rounded-l-xl' : ''} ${inG && end ? 'rounded-r-xl' : ''} ${beyond ? 'opacity-35' : ''}`}>
                    <span className={`grid size-7 place-items-center rounded-full text-xs font-black ${isN ? 'bg-orange-500 text-white ring-2 ring-orange-700' : 'bg-white text-green-900 ring-1 ring-green-300'}`}>{i + 1}</span>
                    {inG && end && <span className="absolute -bottom-3.5 text-[11px] font-black text-green-800">{(g + 1) * P}</span>}
                  </div>
                )
              })}
            </div>
            {groups > 0 && <p className="mt-4 text-center text-sm font-extrabold text-green-900">{groups} grup × {P} = {groups * P} çiçek</p>}
          </div>
          <SeedTray kinds={L.kinds!} item="flower" onPick={plant} onDrop={(k, z) => (z === 'cell-0' || z === 'bed') && plant(k)} disabled={api.finished} title="Tahminini dik" help={`Tohumu ${n}. çukura sürükle ya da dokun.`} selected={guess} />
        </>
      }
      actions={
        <Actions
          api={api}
          primary={{ label: 'Tahminimi sula', icon: <Droplets size={20} />, onClick: check }}
          secondary={
            bad && !reveal ? (
              <button type="button" onClick={() => setReveal(true)} className="inline-flex min-h-14 items-center gap-1.5 rounded-2xl bg-white px-4 text-base font-extrabold text-green-900 ring-1 ring-green-200">Bahçede dene</button>
            ) : undefined
          }
          nudge={nudge}
          onCloseNudge={() => setNudge(null)}
        />
      }
    />
  )
}

/* ───────────────────────────── kendi örüntünü tasarla ───────────────────────────── */

type DPhase = 'build' | 'friend' | 'pick' | 'won'

export function DesignTask({ api }: { api: Api }) {
  const { L, grade } = api
  const g1 = grade <= 1
  const len = L.len!
  const cols = useCols(6)
  const [phase, setPhase] = useState<DPhase>('build')
  const plot = usePlot(Array(len).fill(null), (i) => phase === 'build' && i < len - 3)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [friend, setFriend] = useState<{ seq: number[]; wrongAt: number | null } | null>(null)
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const [core, setCore] = useState<number[] | null>(null)
  const [water, pour] = useWater()
  const [marked, setMarked] = useState<number | null>(null)
  const designs = useRef(0)

  const filled = () => {
    const c = plot.cells
    const m = c.findIndex((x) => x === null)
    return (m < 0 ? c : c.slice(0, m)) as number[]
  }
  const send = () => {
    const c = plot.cells
    const first = c.findIndex((x) => x === null)
    if (first >= 0 && c.slice(first).some((x) => x !== null)) {
      setNudge({ question: 'Çiçekler arasında boş çukur kalmasın. Soldan başlayarak sırayla dik.' })
      return
    }
    const s = filled()
    if (s.length < 4) {
      setNudge({ question: g1 ? 'En az 4 çiçek dik. Tekrar eden parçayı 2 kez dik!' : 'Örüntünün anlaşılması için çekirdeği en az iki kez dik.' })
      return
    }
    const p = period(s)
    if (p === 1) {
      setNudge({ question: 'Hepsi aynı çiçek! Bu çok kolay olur. En az iki farklı çiçek kullan.' })
      return
    }
    if (p > 4 || s.length < 2 * p) {
      setNudge({ question: g1 ? 'Hangi parça tekrar ediyor? Kısa bir parça seç ve onu bir kez daha dik.' : 'Tekrar eden bir çekirdek bulamadım. 2–4 çiçeklik bir çekirdek seç ve en az iki kez tekrar et.' })
      return
    }
    const cr = s.slice(0, p)
    if (period(cr) !== p) return
    setCore(cr)
    // arı Vız devam ettiriyor (bazen bir hata yapar)
    designs.current++
    const correct = range(s.length, s.length + 3).map((i) => cr[i % p])
    const makeWrong = designs.current === 1 ? Math.random() < 0.6 : Math.random() < 0.5
    let fs = correct
    let wrongAt: number | null = null
    if (makeWrong) {
      // tipik yanılgı: çekirdeği baştan başlatmak ya da son çiçeği tekrar etmek
      const restart = range(0, 3).map((j) => cr[j % p])
      if (!eq(restart, correct)) fs = restart
      else fs = correct.map((k, j) => (j === 1 ? cr.find((x) => x !== k)! : k))
      wrongAt = fs.findIndex((k, j) => k !== correct[j])
      if (wrongAt < 0) wrongAt = null
    }
    setFriend({ seq: fs, wrongAt })
    plot.setCells([...s, ...fs, ...Array(len - s.length - 3).fill(null)])
    setPhase('friend')
    setNudge(null)
    setMarked(null)
  }
  const judge = (says: boolean) => {
    if (!friend) return
    const ok = friend.wrongAt === null
    if (says === ok) {
      if (ok) win()
      else {
        setPhase('pick')
        setNudge({ tone: 'ok', question: 'Haklısın, Vız bir hata yaptı! Hangi çiçek yanlış? Ona dokun.' })
      }
      return
    }
    api.miss()
    setNudge({
      question: ok ? 'Vız’ın çiçeklerini çekirdekle tek tek karşılaştır. Gerçekten bir hata var mı?' : 'Çekirdeği sesli söyle ve Vız’ın çiçeklerini tek tek kontrol et. Hepsi doğru mu?',
      misconception: ok ? undefined : 'Arkadaşının hatalı devamını fark etmedi',
    })
  }
  const pickWrong = (i: number) => {
    if (phase !== 'pick' || !friend || !core) return
    const s = filled().length - 3
    const j = i - s
    if (j < 0) {
      setNudge({ question: 'Bu çiçekleri sen diktin! Vız’ın diktiği son 3 çiçeğe bak.' })
      return
    }
    setMarked(i)
    if (j === friend.wrongAt) {
      const fixed = [...plot.cells]
      fixed[i] = core[i % core.length]
      // hatadan sonrakileri de çekirdeğe göre düzelt
      for (let x = i; x < s + 3; x++) fixed[x] = core[x % core.length]
      plot.setCells(fixed)
      win()
    } else {
      api.miss()
      setNudge({ question: 'Bu çiçek çekirdeğe uyuyor. Başka bir çiçeğe bak: çekirdeği baştan söyleyerek say.' })
    }
  }
  const win = () => {
    if (!core) return
    pour()
    api.ok()
    const code = codeOf(core)
    const key = core.join('')
    const label = `${code}: ${colorsOf(core)}`
    const isNew = !found.some((f) => f.key === key)
    if (isNew) {
      api.addSol(`${api.li}:${key}`, label)
      api.stats.designs.push(code)
      setFound([...found, { key, label }])
    }
    setPhase('won')
    setNudge({ tone: 'ok', question: friend?.wrongAt === null ? `Vız doğru devam ettirdi, sen de doğru kontrol ettin! Çekirdeğin: ${code}.` : `Vız’ın hatasını buldun ve düzelttin! Çekirdeğin: ${code}.` })
    if (!api.finished) api.complete(L.note)
  }
  const again = () => {
    plot.setCells(Array(len).fill(null))
    setPhase('build')
    setFriend(null)
    setCore(null)
    setNudge(null)
    setMarked(null)
  }

  const s0 = friend ? filled().length - 3 : -1
  const cells: GCell[] = plot.cells.map((k, i) => {
    const isFriend = friend && i >= s0 && i < s0 + 3
    const e = phase === 'build' && i < len - 3
    return {
      kind: k,
      drop: e ? `cell-${i}` : undefined,
      selected: phase === 'build' && plot.sel === i,
      onTap: phase === 'build' ? (e ? () => { plot.tap(i); setNudge(null) } : undefined) : phase === 'pick' ? () => pickWrong(i) : undefined,
      tag: isFriend ? '🐝' : g1 ? undefined : String(i + 1),
      mark: marked === i ? (phase === 'won' ? 'ok' : 'bad') : undefined,
      grow: !!isFriend,
      label: cellLabel(k, i, 'flower', e),
    }
  })

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GardenScene beds={[{ key: 'd', item: 'flower', cells, cols }]} watering={water} cols={cols} bee={phase !== 'build'} beeAt={friend ? s0 + 2 : undefined} ariaLabel={`Senin bahçen: ${plot.cells.filter((x) => x !== null).length} çiçek`} />
        </SceneBox>
      }
      tray={
        phase === 'build' ? (
          <SeedTray kinds={[0, 1, 2, 3]} item="flower" onPick={(k) => { if (!plot.plant(k)) setNudge({ question: 'Son 3 çukur Vız’ın! Bir çiçeğe dokunup değiştirebilirsin.' }); else setNudge(null) }} onDrop={(k, z) => { plot.plant(k, z === 'bed' ? undefined : z); setNudge(null) }} title="Tohum paketleri" help="Soldan başla. Son 3 çukuru Vız dolduracak." />
        ) : (
          <div className="mt-3 flex items-center gap-3 rounded-3xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <span className="text-3xl" aria-hidden>🐝</span>
            <p className="text-base font-extrabold text-amber-900">
              {phase === 'friend' ? 'Vız: “Örüntünü devam ettirdim! Doğru mu?”' : phase === 'pick' ? 'Vız: “Hangi çiçeği yanlış diktim?”' : 'Vız: “Teşekkürler! Çok güzel bir bahçe.”'}
            </p>
          </div>
        )
      }
      actions={
        <Actions
          api={api}
          keep
          primary={phase === 'build' ? { label: 'Vız’a gönder', icon: <Send size={20} />, onClick: send } : undefined}
          nudge={nudge}
          onCloseNudge={() => setNudge(null)}
        >
          {phase === 'friend' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => judge(true)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 text-base font-extrabold text-white active:scale-95"><ThumbsUp size={20} />Doğru</button>
              <button type="button" onClick={() => judge(false)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 text-base font-extrabold text-white active:scale-95"><ThumbsDown size={20} />Hata var</button>
            </div>
          )}
          {phase === 'won' && core && (
            <>
              <ShareBox code={`r${core.join('')}`} grade={grade} text={`Bahçemdeki örüntüyü devam ettirebilir misin? Çekirdek: ${colorsOf(core)}`} />
              <button type="button" onClick={again} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-extrabold text-green-900 ring-1 ring-green-200">Bir örüntü daha tasarla</button>
            </>
          )}
          <SolutionList list={found} />
        </Actions>
      }
    />
  )
}

