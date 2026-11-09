import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Hand } from 'lucide-react'
import { sfx } from '../../lib/feedback'
import { Card, NextButton, Nudge, rng, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, Drop, TOKEN, Tray, useDnd, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'

/**
 * Sepetlere Grupla (94) ve Kalan Ne Anlatıyor? (96) için ortak parçalar:
 * dağınık nesne masası, dolunca kapanan sepetler/kutular/arabalar, “kalan” kutusu, avuç seçici,
 * sayı kartlı cümle (Fill), sepetlere ayırma (SortBins), bölme defteri, kural defteri ve
 * farkli-cozumleme’deki dar ekran yardımcıları (useSay, Reveal, Sticky).
 */

/* ───────────── nesneler ve kaplar ───────────── */

export interface Skin { key: string; emoji: string | string[]; one: string; acc: string }
export const SKIN = {
  elma: { key: 'elma', emoji: '🍎', one: 'elma', acc: 'elmayı' },
  yumurta: { key: 'yumurta', emoji: '🥚', one: 'yumurta', acc: 'yumurtayı' },
  top: { key: 'top', emoji: '⚽', one: 'top', acc: 'topu' },
  ogrenci: { key: 'ogrenci', emoji: ['🧒', '👧', '👦', '🧑'], one: 'öğrenci', acc: 'öğrenciyi' },
  bilye: { key: 'bilye', emoji: ['🔴', '🟡', '🟢', '🔵', '🟣'], one: 'bilye', acc: 'bilyeyi' },
  kurabiye: { key: 'kurabiye', emoji: '🍪', one: 'kurabiye', acc: 'kurabiyeyi' },
} satisfies Record<string, Skin>
export const emojiOf = (s: Skin, id: number) => (Array.isArray(s.emoji) ? s.emoji[id % s.emoji.length] : s.emoji)

export interface Box { name: string; loc: string; dat: string; emoji: string; bg: string; ring: string; lid: string; text: string }
export const BOX = {
  sepet: { name: 'sepet', loc: 'sepette', dat: 'sepete', emoji: '🧺', bg: '#fef3c7', ring: '#d97706', lid: '#92400e', text: '#78350f' },
  kutu: { name: 'kutu', loc: 'kutuda', dat: 'kutuya', emoji: '📦', bg: '#ffedd5', ring: '#ea580c', lid: '#9a3412', text: '#7c2d12' },
  araba: { name: 'araba', loc: 'arabada', dat: 'arabaya', emoji: '🚗', bg: '#e0f2fe', ring: '#0284c7', lid: '#075985', text: '#0c4a6e' },
} satisfies Record<string, Box>

/** “4’erli”, “3’erli”, “5’erli” */
export const erli = (d: number) => `${d}’${({ 2: 'şerli', 3: 'erli', 4: 'erli', 5: 'erli', 6: 'şarlı' } as Record<number, string>)[d] ?? 'erli'}`
/** “4’lük”, “5’lik” */
export const luk = (d: number) => `${d}’${({ 3: 'lük', 4: 'lük', 5: 'lik', 6: 'lık' } as Record<number, string>)[d] ?? 'lük'}`
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)

/** lo..hi arasında, d’ye tam bölünen (exact) ya da bölünmeyen bir sayı */
export function pickN(d: number, lo: number, hi: number, exact = false, r: () => number = Math.random) {
  const c: number[] = []
  for (let x = lo; x <= hi; x++) if ((x % d === 0) === exact) c.push(x)
  return c[Math.floor(r() * c.length)]
}

/* ───────────── gruplama durumu ───────────── */

export type Verdict = { ok: true; closed?: boolean; note?: string } | { ok: false; msg: string; mis?: string }

interface GroupState { loose: number[]; boxes: number[][]; kalan: number[] }

/**
 * n nesne, size’lık kaplar. Bir kap size nesne alınca kapanır, masada nesne varsa yeni boş kap çıkar.
 * kalanZone: “Kalan” kutusu var; masadakiler bir kabı dolduramayacak kadar azalınca oraya sürüklenir.
 * full0: başta dolu gelen kap sayısı (bir arkadaşın yarım kalmış işi).
 */
export function useGroup({ n, size, seed, full0 = 0, kalanZone = true }: { n: number; size: number; seed: number; full0?: number; kalanZone?: boolean }) {
  const [st, setSt] = useState<GroupState>(() => {
    let id = 0
    const boxes: number[][] = []
    for (let b = 0; b < full0; b++) boxes.push(Array.from({ length: size }, () => id++))
    boxes.push([])
    return { loose: Array.from({ length: n - id }, (_, i) => id + i), boxes, kalan: [] }
  })
  const [hand, setHand] = useState(1)

  /** Masadaki dağınık yerleşim: boş hücreler araya serpilir, her nesne biraz dönük durur */
  const cells = useMemo(() => {
    const r = rng(seed)
    const ids: (number | null)[] = [...st.loose, ...Array.from({ length: Math.ceil(st.loose.length * 0.22) }, () => null)]
    return shuffle(ids, r).map((id) => ({ id, rot: Math.round((r() - 0.5) * 30), dx: Math.round((r() - 0.5) * 8), dy: Math.round((r() - 0.5) * 8) }))
    // yerleşim yalnızca açılışta hesaplanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  const last = st.boxes[st.boxes.length - 1]
  const openLen = last && last.length < size ? last.length : 0
  const q = st.boxes.filter((b) => b.length === size).length
  const partial = st.loose.length === 0 && !!last && last.length > 0 && last.length < size
  const finished = st.loose.length === 0 && !partial

  /** Kalan kaplara sığmayanları “kalan”a taşır, sondaki boş kabı kaldırır */
  const tidy = (s: GroupState): GroupState => {
    if (s.loose.length > 0) return s
    const boxes = s.boxes.slice()
    let kalan = s.kalan
    while (boxes.length && boxes[boxes.length - 1].length < size) {
      const b = boxes.pop()!
      if (b.length && kalanZone) kalan = [...kalan, ...b]
      else if (b.length) {
        boxes.push(b)
        break
      }
    }
    return { ...s, boxes, kalan }
  }

  const take = (id: number) => [id, ...st.loose.filter((x) => x !== id)].slice(0, Math.min(hand, st.loose.length))

  function move(item: string, target: string, sk: Skin, bx: Box): Verdict | null {
    if (!item.startsWith('obj-')) return null
    const id = Number(item.slice(4))
    if (!st.loose.includes(id)) return null
    const t = take(id)
    if (target.startsWith('box-')) {
      const i = Number(target.slice(4))
      const b = st.boxes[i]
      if (!b) return null
      if (b.length >= size) return { ok: false, msg: `Bu ${bx.name} ${size} ${sk.one} alınca doldu ve kapandı. Yeni boş ${bx.dat} koy.` }
      if (b.length + t.length > size) {
        const room = size - b.length
        return { ok: false, msg: b.length ? `Bu ${bx.loc} ${b.length} ${sk.one} var; ${bx.name} ${size} tane alıyor. ${t.length} ${sk.one} daha sığmaz. Kaç tane daha sığar? Avucunu ${room} yap.` : `Bu ${bx.name} ${size} ${sk.one} alıyor; ${t.length} tane sığmaz.` }
      }
      const nb = [...b, ...t]
      const loose = st.loose.filter((x) => !t.includes(x))
      const boxes = st.boxes.map((x, k) => (k === i ? nb : x))
      const closed = nb.length === size
      if (closed && loose.length > 0) boxes.push([])
      const before = { loose, boxes, kalan: st.kalan }
      const next = tidy(before)
      setSt(next)
      if (closed) sfx.ok()
      const moved = next.kalan.length - st.kalan.length
      return { ok: true, closed, note: moved > 0 ? `${cap(bx.name)} dolmadı: içindeki ${moved} ${sk.one} “Kalan” kutusuna geçti.` : undefined }
    }
    if (target === 'kalan' && kalanZone) {
      if (st.loose.length + openLen >= size)
        return {
          ok: false,
          msg: `Masada ${st.loose.length} ${sk.one} var${openLen ? `, ${bx.loc} ${openLen} tane daha` : ''}: bir ${bx.name} daha dolar! Kalan, hiçbir ${bx.dat} sığmayanlardır. Önce ${bx.dat} koy.`,
          mis: st.loose.length >= size ? 'Bir grup daha oluşturabilecekken nesneleri kalana ayırıyor' : undefined,
        }
      const next = tidy({ loose: st.loose.filter((x) => !t.includes(x)), boxes: st.boxes, kalan: [...st.kalan, ...t] })
      setSt(next)
      return { ok: true }
    }
    return null
  }

  return {
    ...st,
    size,
    hand,
    setHand,
    cells,
    q,
    r: st.kalan.length,
    partial,
    finished,
    move,
    /** Dolmayan son kabın nesnelerini “kalan”a taşır */
    flushPartial() {
      setSt((s) => {
        const b = s.boxes[s.boxes.length - 1]
        if (!b || b.length === 0 || b.length >= size) return s
        return { ...s, boxes: s.boxes.slice(0, -1), kalan: [...s.kalan, ...b] }
      })
    },
    /** Kalanları yeni bir (dolmamış) kaba bindirir: “bir araba daha” */
    packKalan() {
      setSt((s) => (s.kalan.length ? { ...s, boxes: [...s.boxes, s.kalan], kalan: [] } : s))
    },
  }
}
export type Group = ReturnType<typeof useGroup>

/* ───────────── görünüm ───────────── */

export function HandPicker({ value, max, onChange, disabled, unit }: { value: number; max: number; onChange: (v: number) => void; disabled?: boolean; unit: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white px-2 py-1.5 ring-1 ring-line">
      <span className="flex items-center gap-1 pr-1 text-xs font-black text-ink-soft"><Hand size={15} />Bir seferde al:</span>
      {Array.from({ length: max }, (_, i) => i + 1).map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          aria-pressed={value === k}
          aria-label={`Bir seferde ${k} ${unit}`}
          onClick={() => onChange(k)}
          className={`grid size-12 place-items-center rounded-xl text-xl font-black ring-2 transition active:scale-95 disabled:opacity-40 ${value === k ? 'bg-pink-600 text-white ring-pink-700 shadow-[0_3px_0_#9d174d]' : 'bg-white text-ink ring-line hover:bg-pink-50'}`}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

/** Parmağı izleyen avuç: k nesne */
export function HandGhost({ emojis }: { emojis: string[] }) {
  return (
    <span className="grid gap-0.5 rounded-2xl bg-white/85 p-1 text-[30px] leading-none ring-2 ring-sky-400" style={{ gridTemplateColumns: `repeat(${Math.min(3, emojis.length)}, auto)` }}>
      {emojis.map((e, i) => <span key={i}>{e}</span>)}
    </span>
  )
}

/** Dağınık nesne masası: her nesne tek tek tutulur; avuç kadarı birlikte gider */
export function Table({ g, dnd, skin, locked, label = 'Masa' }: { g: Group; dnd: Dnd; skin: Skin; locked?: boolean; label?: string }) {
  if (g.loose.length === 0) return null
  const set = new Set(g.loose)
  return (
    <div className="rounded-2xl bg-[#fbf3df] p-2 ring-1 ring-amber-200">
      <p className="mb-1 px-1 text-[11px] font-black tracking-wide text-amber-800 uppercase">{label} · {g.loose.length} {skin.one}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(50px,1fr))] gap-1">
        {g.cells.map((c, i) => (
          <div key={i} className="grid h-14 place-items-center">
            {c.id !== null && set.has(c.id) && (
              <span style={{ transform: `translate(${c.dx}px, ${c.dy}px) rotate(${c.rot}deg)` }}>
                <Drag
                  dnd={dnd}
                  item={`obj-${c.id}`}
                  label={g.hand > 1 ? `${Math.min(g.hand, g.loose.length)} ${skin.one}` : `1 ${skin.one}`}
                  disabled={locked}
                  ghost={<HandGhost emojis={[c.id, ...g.loose.filter((x) => x !== c.id)].slice(0, Math.min(g.hand, g.loose.length)).map((x) => emojiOf(skin, x))} />}
                  className="grid size-12 place-items-center rounded-2xl text-[32px] leading-none"
                >
                  {emojiOf(skin, c.id)}
                </Drag>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Bir kap: size yuvası; dolunca kapağı kapanır */
export function BoxView({ items, size, i, box, skin, dnd, state, hot }: { items: number[]; size: number; i: number; box: Box; skin: Skin; dnd?: Dnd; state: 'open' | 'full' | 'partial' | 'extra'; hot?: boolean }) {
  const cols = size === 4 ? 2 : size === 2 ? 2 : 3
  const body = (
    <>
      {state === 'full' && <span className="absolute inset-x-2 -top-1.5 h-3 rounded-full animate-pop" style={{ background: box.lid }} aria-hidden />}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
        {Array.from({ length: size }, (_, k) => (
          <span key={k} className={`grid size-7 place-items-center rounded-lg text-[22px] leading-none ${items[k] === undefined ? (state === 'partial' ? 'border-2 border-dashed border-amber-500 text-xs font-black text-amber-600' : 'bg-white/70') : 'animate-pop'}`}>
            {items[k] !== undefined ? emojiOf(skin, items[k]) : state === 'partial' ? '?' : ''}
          </span>
        ))}
      </div>
      <span className="text-[11px] leading-tight font-black whitespace-nowrap" style={{ color: box.text }}>
        {state === 'full' ? `✓ ${i + 1}. ${box.name}` : state === 'partial' ? `${items.length} / ${size}: dolmadı` : state === 'extra' ? `+1 ${box.name} · ${items.length}/${size}` : `${i + 1}. ${box.name} · ${items.length}/${size}`}
      </span>
    </>
  )
  const cls = `relative flex flex-col items-center gap-1 rounded-2xl border-2 px-1.5 pt-2.5 pb-1.5 ${state === 'open' ? 'border-dashed' : ''} ${state === 'partial' ? 'animate-pulse' : ''} ${state === 'extra' ? 'animate-pop ring-4 ring-emerald-400' : ''} ${hot ? 'animate-shake ring-4 ring-amber-400' : ''}`
  const style = { background: box.bg, borderColor: state === 'full' ? box.lid : box.ring }
  return dnd ? <Drop dnd={dnd} id={`box-${i}`} className={cls} style={style}>{body}</Drop> : <div className={cls} style={style}>{body}</div>
}

/** “Kalan” kutusu: hiçbir kaba sığmayanlar */
export function KalanZone({ items, skin, dnd, label = 'Kalan', sub, hot }: { items: number[]; skin: Skin; dnd?: Dnd; label?: string; sub?: string; hot?: boolean }) {
  const body = (
    <>
      <p className="text-xs font-black tracking-wide text-rose-800 uppercase">{label}: {items.length}</p>
      {sub && <p className="text-[11px] font-bold text-rose-700">{sub}</p>}
      <div className="mt-1 flex min-h-9 flex-wrap justify-center gap-1 text-[26px] leading-none">
        {items.map((id) => <span key={id} className="animate-pop">{emojiOf(skin, id)}</span>)}
      </div>
    </>
  )
  const cls = `min-h-24 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-2 text-center ${hot ? 'animate-shake ring-4 ring-amber-400' : ''}`
  return dnd ? <Drop dnd={dnd} id="kalan" className={cls}>{body}</Drop> : <div className={cls}>{body}</div>
}

/** Masa + avuç + kaplar + kalan kutusu (bir gruplama tuvali) */
export function GroupView({ g, dnd, skin, box, showKalan, kalanSub, kalanLabel, locked, wrong, packed }: { g: Group; dnd: Dnd; skin: Skin; box: Box; showKalan?: boolean; kalanSub?: string; kalanLabel?: string; locked?: boolean; wrong?: string | null; /** son kap, kalanlar için eklenen fazladan kap */ packed?: boolean }) {
  const lastIdx = g.boxes.length - 1
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-black">
        <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-amber-900">Masada: {g.loose.length}</span>
        <span className="rounded-xl px-2.5 py-1" style={{ background: box.bg, color: box.text }}>{box.emoji} Dolu {box.name}: {g.q}</span>
        {showKalan && <span className="rounded-xl bg-rose-100 px-2.5 py-1 text-rose-900">Kalan: {g.r}</span>}
        {!locked && g.loose.length > 0 && <div className="ml-auto"><HandPicker value={g.hand} max={g.size} onChange={g.setHand} unit={skin.one} /></div>}
      </div>
      <Table g={g} dnd={dnd} skin={skin} locked={locked} />
      <div className="flex flex-wrap items-start gap-2 pt-1">
        {g.boxes.map((b, i) => (
          <BoxView key={i} i={i} items={b} size={g.size} box={box} skin={skin} dnd={dnd} hot={wrong === `box-${i}`} state={b.length === g.size ? 'full' : packed && i === lastIdx ? 'extra' : g.partial && i === lastIdx ? 'partial' : 'open'} />
        ))}
      </div>
      {showKalan && <KalanZone items={g.kalan} skin={skin} dnd={dnd} label={kalanLabel} sub={kalanSub ?? `hiçbir ${box.dat} sığmayanları buraya sürükle`} hot={wrong === 'kalan'} />}
    </div>
  )
}

/** Sürüklenmeyen özet resim: q dolu kap + r kalan */
export function StaticGroups({ q, r, size, skin, box }: { q: number; r: number; size: number; skin: Skin; box: Box }) {
  let id = 0
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-2 pt-1">
        {Array.from({ length: q }, (_, i) => <BoxView key={i} i={i} items={Array.from({ length: size }, () => id++)} size={size} box={box} skin={skin} state="full" />)}
      </div>
      {r > 0 && <KalanZone items={Array.from({ length: r }, () => id++)} skin={skin} />}
    </div>
  )
}

/* ───────────── dar ekran yardımcıları (farkli-cozumleme ile aynı) ───────────── */

export function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

type Say = { q: string; mis?: string; k: number; ok?: boolean } | null

/** Görev içi düşündüren soru. nudge deneme sayacına yazar; tell yalnızca yol gösterir. Dar ekranda tuvalde, genişte panelde. */
export function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<Say>(null)
  const [wrong, setWrong] = useState<string | null>(null)
  const show = (q: string, opts: { mis?: string; at?: string }) => {
    setWrong(opts.at ?? null)
    setSay((s) => ({ q, mis: opts.mis, k: (s?.k ?? 0) + 1 }))
    return false as const
  }
  return {
    clear() {
      setSay(null)
      setWrong(null)
    },
    wrong,
    nudge(q: string, opts: { mis?: string; at?: string } = {}) {
      checks.fail()
      return show(q, opts)
    },
    tell: (q: string, opts: { mis?: string; at?: string } = {}) => show(q, opts),
    ok(q: string) {
      setWrong(null)
      setSay((s) => ({ q, k: (s?.k ?? 0) + 1, ok: true }))
    },
    view: (spot: 'work' | 'panel') => (say && (spot === 'panel') === wide ? <Nudge key={say.k} question={say.q} misconception={say.mis} tone={say.ok ? 'ok' : 'think'} /> : null),
  }
}
export type SayApi = ReturnType<typeof useSay>

export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.innerWidth >= 1024) return
    const id = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.top < 70 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: r.height > window.innerHeight - 90 ? 'start' : 'center' })
    }, 250)
    return () => window.clearTimeout(id)
  }, [])
  return <div ref={ref} className="flex flex-col gap-3 scroll-mt-20">{children}</div>
}

export function Sticky({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-2 z-20 rounded-2xl shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] lg:static lg:shadow-none">{children}</div>
}

/* ───────────── defterler ───────────── */

export function Ledger({ title = 'Bölme defterim', lines, empty }: { title?: string; lines: ReactNode[]; empty?: string }) {
  return (
    <Card>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><BookOpen size={14} />{title}</p>
      {lines.length ? (
        <ol className="space-y-1">
          {lines.map((l, i) => <li key={i} className="rounded-lg bg-amber-50 px-2 py-1.5 text-[15px] font-extrabold tabular-nums ring-1 ring-amber-200 animate-fade-up">{l}</li>)}
        </ol>
      ) : (
        <p className="text-sm font-bold text-ink-soft">{empty ?? 'Henüz boş.'}</p>
      )}
    </Card>
  )
}

export function EndView({ rules, onFinish, note }: { rules: string[]; onFinish: () => void; note: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-amber-50 p-5 text-ink shadow-[0_6px_0_#d9770633] ring-2 ring-amber-300">
        <p className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900"><BookOpen size={20} />Kural defterim</p>
        <ol className="space-y-2">
          {rules.map((r, i) => (
            <li key={r} className="flex gap-3 rounded-xl bg-white p-3 text-base font-extrabold ring-1 ring-amber-200 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500 text-sm font-black text-white">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-bold text-amber-900">{note}</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}

/* ───────────── sayı kartlı cümle ───────────── */

export interface Slot { id: string; ok?: (v: number, filled: Record<string, number>) => boolean; hint?: string; mis?: (v: number) => string | undefined }
export type Part = string | Slot

/**
 * Bir cümledeki “?” yuvalarına sayı kartı sürüklenir. Kartlar tükenmez (aynı sayı iki kez gerekebilir).
 * predict: tahmin; her kart kabul edilir, sayaca yazılmaz.
 */
export function Fill({ parts, cards, checks, onDone, predict, title = 'Sayı kartları', step }: { parts: Part[]; cards: number[]; checks: ReturnType<typeof useChecks>; onDone: (v: Record<string, number>) => void; predict?: boolean; title?: string; step?: string }) {
  const [filled, setFilled] = useState<Record<string, number>>({})
  const [miss, setMiss] = useState<{ q: string; mis?: string; k: number; at: string } | null>(null)
  const slots = parts.filter((p): p is Slot => typeof p !== 'string')
  const done = slots.every((p) => filled[p.id] !== undefined)
  const dnd = useDnd((item, target) => {
    if (!target.startsWith('slot-') || done) return false
    const id = target.slice(5)
    const sl = slots.find((p) => p.id === id)
    if (!sl || filled[id] !== undefined) return false
    const v = Number(item.slice(4))
    if (!predict && sl.ok && !sl.ok(v, filled)) {
      checks.fail()
      setMiss((m) => ({ q: sl.hint ?? 'Resme tekrar bak.', mis: sl.mis?.(v), k: (m?.k ?? 0) + 1, at: id }))
      return false
    }
    setMiss(null)
    sfx.ok()
    const f = { ...filled, [id]: v }
    setFilled(f)
    if (slots.every((p) => f[p.id] !== undefined)) window.setTimeout(() => onDone(f), 500)
  })
  return (
    <div className="flex flex-col gap-2">
      <Card>
        {step && <p className="mb-1 text-[11px] font-black tracking-wide text-pink-700 uppercase">{step}</p>}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-lg leading-snug font-black">
          {parts.map((p, i) =>
            typeof p === 'string' ? (
              <span key={i}>{p}</span>
            ) : filled[p.id] !== undefined ? (
              <span key={i} className={`grid h-12 min-w-12 place-items-center rounded-xl px-2 text-2xl text-white animate-pop ${predict ? 'bg-sky-500' : 'bg-emerald-500'}`}>{filled[p.id]}</span>
            ) : (
              <Drop key={i} dnd={dnd} id={`slot-${p.id}`} className={`grid h-12 min-w-14 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 px-2 text-base text-sky-500 ${miss?.at === p.id ? 'animate-shake ring-4 ring-amber-400' : ''}`}>?</Drop>
            ),
          )}
        </div>
        {miss && <div className="mt-2"><Nudge key={miss.k} question={miss.q} misconception={miss.mis} /></div>}
      </Card>
      {!done && (
        <Sticky>
          <Tray title={title}>
            {cards.map((v) => <Drag key={v} dnd={dnd} item={`num-${v}`} label={`${v} kartı`} className={TOKEN}>{v}</Drag>)}
          </Tray>
        </Sticky>
      )}
    </div>
  )
}

/* ───────────── sepetlere ayırma ───────────── */

export interface SortItem { label: ReactNode; text: string; bin: string; why?: (to: string) => { q: string; mis?: string } }
export interface Bin { id: string; title: ReactNode; tone: string }

/** Kartları sepetlere ayırma: yanlış sepette kart geri döner, düşündüren soru çıkar (sayaca yazılır) */
export function SortBins({ items, bins, s, onDone, cols = 2, trayTitle = 'Kartlar', deck }: { items: SortItem[]; bins: Bin[]; s: SayApi; onDone: () => void; cols?: 2 | 4; trayTitle?: string; /** tepside yalnızca sıradaki kart (narrow: yalnızca telefonda) */ deck?: boolean | 'narrow' }) {
  const [where, setWhere] = useState<Record<number, string>>({})
  const complete = Object.keys(where).length === items.length
  const dnd = useDnd((item, target) => {
    if (!target.startsWith('bin-')) return false
    const b = target.slice(4)
    const i = Number(item.slice(3))
    const it = items[i]
    if (it.bin !== b) {
      const w = it.why?.(b) ?? { q: 'Bir daha düşün: bu kart hangi sepete uyar?' }
      return s.nudge(w.q, { mis: w.mis, at: target })
    }
    s.clear()
    sfx.ok()
    const nw = { ...where, [i]: b }
    setWhere(nw)
    if (Object.keys(nw).length === items.length) window.setTimeout(onDone, 400)
  })
  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${cols === 4 ? 'grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'}`}>
        {bins.map((b) => (
          <Drop key={b.id} dnd={dnd} id={`bin-${b.id}`} className={`min-h-28 rounded-2xl border-2 border-dashed p-2 ${b.tone} ${s.wrong === `bin-${b.id}` ? 'animate-shake ring-4 ring-amber-400' : ''}`}>
            <p className="mb-1.5 text-center text-sm leading-tight font-black">{b.title}</p>
            <ul className="space-y-1">
              {items.map((it, i) => (where[i] === b.id ? <li key={i} className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-ink ring-1 ring-black/5 animate-pop">{it.label}</li> : null))}
            </ul>
          </Drop>
        ))}
      </div>
      {s.view('work')}
      {!complete && (
        <Sticky>
          <Tray title={deck ? `${trayTitle} · ${items.length - Object.keys(where).length} kart kaldı` : trayTitle}>
            {items.map((it, i) => (where[i] || (deck === true && i !== items.findIndex((_, k) => !where[k])) ? null : (
              <Drag key={i} dnd={dnd} item={`it-${i}`} label={it.text} className={`${deck === 'narrow' && i !== items.findIndex((_, k) => !where[k]) ? 'max-sm:hidden' : ''} min-h-14 max-w-full rounded-2xl bg-white px-3 py-2 text-left text-[15px] leading-snug font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line`}>
                <span className="mr-1.5 text-slate-400" aria-hidden>⠿</span>{it.label}
              </Drag>
            )))}
          </Tray>
        </Sticky>
      )}
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

export const TOOLS = (sk: Skin, bx: Box, size: number | string = 4) => ({
  obj: { icon: <span className="text-lg leading-none">{emojiOf(sk, 0)}</span>, name: cap(sk.one), text: `Masadaki bir ${sk.one} tut ve bir ${bx.dat} sürükle. Avucunda kaç tane varsa o kadarı birlikte gider.` } as ToolInfo,
  hand: { icon: <Hand size={16} className="text-pink-600" />, name: 'Bir seferde al', text: `Tek tek mi, ikişer mi, ${size}’er mi taşımak istersin? Sayıya dokun; parmağın o kadar ${sk.one} taşır.` } as ToolInfo,
  box: { icon: <span className="text-lg leading-none">{bx.emoji}</span>, name: cap(bx.name), text: `Her ${bx.name} ${size} ${sk.one} alır. Dolunca kapağı kapanır ve yeni boş ${bx.name} çıkar. Sığmayan ${sk.one} geri döner.` } as ToolInfo,
  kalan: { icon: <span className="h-4 w-6 rounded-[4px] border-2 border-dashed border-rose-400 bg-rose-50" />, name: 'Kalan kutusu', text: `Hiçbir ${bx.dat} sığmayan, ${bx.dat} dolduramayan ${sk.one} buraya sürüklenir.` } as ToolInfo,
})
export const CARD_TOOL: ToolInfo = { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[10px] font-black ring-1 ring-line">3</span>, name: 'Sayı kartı', text: 'Kartı tutup cümledeki “?” kutusuna bırak. Uymazsa geri döner ve bir ipucu sorusu çıkar.' }
export const GUESS_TOOL: ToolInfo = { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-sky-500 px-0.5 text-[10px] font-black text-white">?</span>, name: 'Tahmin kartı', text: 'Denemeden önce bir sayı kartını “Tahminim” kutusuna bırak. Tahmin yanlış olabilir; sonra deneyip karşılaştıracaksın.' }
export const SORT_TOOL = (what: string): ToolInfo => ({ icon: <span className="text-base leading-none">🧺</span>, name: 'Kartlar ve sepetler', text: `Her kartı oku ve ${what}. Yanlış sepete bıraktığın kart geri döner.` })
