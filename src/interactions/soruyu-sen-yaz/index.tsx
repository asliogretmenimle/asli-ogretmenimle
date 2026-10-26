import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, GripVertical, PencilLine, Plus, RotateCcw } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { SolutionList, StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { ActivityLayout, DoneNote, NumPad, hitZone, parseNum, tr, useNudge, useSession, useTileDrag } from '../hizli-noktalar/kit'
import type { InteractionProps } from '../types'
import { ModelView } from './models'
import { DEFAULT_HINTS, NONE, tasksFor, type Ctx, type Ev, type Fail, type M, type QBad, type Qn, type Task } from './tasks'

/**
 * 72. Soruyu Sen Yaz — problem kurma (Van de Walle: öğrenci problemi kendisi yazar).
 * Bir model (resim, şerit, dizi, tablo, grafik, terazi, sayı doğrusu…) verilir. Öğrenci dört yuvayı
 * kart bankasından doldurur: Kim? · Ne? · Ne oldu? · Soru. Kart dokunarak ya da sürüklenerek yerleşir.
 * Hikâye canlı olarak paragraf hâlinde yazılır; üç ışık sürekli denetler:
 *   1) Sayılar modelle uyumlu mu?  2) Olay ve soru modeldeki ilişkiyi gösteriyor mu?  3) Soru bilinmeyeni mi soruyor?
 * Uyumsuzlukta düşündüren bir soru (Nudge) çıkar ve yanılgı rapora yazılır. Üç ışık yeşilse öğrenci kendi
 * problemini çözer. Aynı modele uyan farklı yapılar (ekleme, karşılaştırma, parça-bütün, kat, oran…) ayrı
 * çözüm sayılır; hedef görev başına iki farklı problem.
 */

type SlotK = 'who' | 'what' | 'ev' | 'q'
type Sel = Partial<Record<SlotK, string>>
type Light = 'wait' | 'ok' | 'bad'
type Item = { k: SlotK; id: string; text: string }

const ORDER: SlotK[] = ['who', 'what', 'ev', 'q']
const GOAL = 2
const MIS_NONE = 'Hikâyedeki bilgilerle cevaplanamayan bir soru seçti'
const LIGHTS = ['Sayılar modelle uyumlu mu?', 'Olay ve soru, modeldeki ilişkiyi mi gösteriyor?', 'Soru çözülebilir mi, bilinmeyeni mi soruyor?']
const STRATS = ['Önce modeldeki sayılara baktım', 'Önce “?” işaretinin yerini düşündüm', 'Bildiğim bir durumu hayal ettim', 'Kartları deneyip ışıklara baktım']

const res = (m: M, c: Ctx) => (typeof m === 'function' ? m(c) : m)

function evaluate(ev: Ev | undefined, q: Qn | undefined) {
  const qb: QBad | null = ev && q && !ev.nums && !ev.rel && ev.ok?.[q.id] === undefined ? (ev.bad?.[q.id] ?? { k: 'none', m: NONE, mis: MIS_NONE }) : null
  const l1: Light = !ev ? 'wait' : ev.nums ? 'bad' : 'ok'
  const l2: Light = !ev ? 'wait' : ev.rel || qb?.k === 'rel' ? 'bad' : 'ok'
  const l3: Light = !ev || !q || ev.nums || ev.rel || qb?.k === 'rel' ? 'wait' : qb ? 'bad' : 'ok'
  const fail: Fail | null = ev?.nums ?? ev?.rel ?? qb ?? null
  const ans = ev && q ? ev.ok?.[q.id] : undefined
  return { lights: [l1, l2, l3] as Light[], fail, ans }
}

export default function SoruyuSenYaz({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const S = useSession(tasks.length)
  const T: Task = tasks[S.idx]
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const big = age.big
  const track = useTracker()
  const { nudge, show, clear } = useNudge()
  const sols = useSolutions()
  const [sel, setSel] = useState<Sel>({})
  const [slot, setSlot] = useState<SlotK>('who')
  const [phase, setPhase] = useState<'compose' | 'solve' | 'solved'>('compose')
  const [val, setVal] = useState('')
  const [hintI, setHintI] = useState(0)
  const written = useRef(0)
  const frameRef = useRef<HTMLDivElement>(null)

  const ctxOf = (s: Sel): Ctx | null => {
    const ai = T.who.findIndex((w) => w.id === s.who)
    const o = T.what.find((x) => x.id === s.what)
    if (ai < 0 || !o) return null
    return { a: T.who[ai], b: T.who[(ai + 1) % T.who.length], o }
  }
  const ctx = ctxOf(sel)
  const ev = T.events.find((e) => e.id === sel.ev)
  const visQs = T.qs.filter((q) => !q.only || (ctx && q.only.includes(ctx.o.id)))
  const q = visQs.find((x) => x.id === sel.q)
  const E = evaluate(ev, q)
  const full = !!(ctx && ev && q)
  const ready = full && E.lights.every((l) => l === 'ok') && E.ans !== undefined
  const solKey = ev && q ? `${ev.s}|${q.id}` : ''
  const already = ready && sols.list.some((s) => s.key === solKey)

  const labels: Record<SlotK, string> = { who: 'Kim?', what: T.whatLabel ?? 'Ne?', ev: 'Ne oldu?', q: 'Soru' }

  const place = (k: SlotK, id: string) => {
    const next: Sel = { ...sel, [k]: id }
    // nesne değişince ona özgü soru görünmez olabilir
    if (k === 'what' && next.q) {
      const qq = T.qs.find((x) => x.id === next.q)
      if (qq?.only && !qq.only.includes(id)) delete next.q
    }
    setSel(next)
    if (phase !== 'compose') {
      setPhase('compose')
      setVal('')
    }
    setSlot(ORDER.find((s) => !next[s]) ?? k)
    const c = ctxOf(next)
    const e = T.events.find((x) => x.id === next.ev)
    const qq = T.qs.find((x) => x.id === next.q)
    const r = evaluate(e, qq)
    const isFull = !!(c && e && qq)
    if (isFull) S.attempt(!r.fail)
    if (r.fail && c && (k === 'ev' || k === 'q' || isFull)) {
      show(res(r.fail.m, c), { misc: r.fail.mis })
    } else if (isFull && !r.fail) {
      const dup = sols.list.some((s) => s.key === `${e!.s}|${qq!.id}`)
      show(dup ? 'Bu problemi zaten yazıp çözdün. Farklı bir olay ya da farklı bir soru seçersen yeni bir problem olur. Yine de istersen çözebilirsin.' : 'Üç ışık da yeşil! Problemin modele uyuyor. Şimdi kendi problemini çöz.', { tone: 'ok' })
    } else if (k === 'ev' || k === 'q' || nudge?.tone === 'ok') clear()
  }

  const drag = useTileDrag<Item>({
    onDrop: (it, x, y) => {
      if (hitZone(new Map([['f', frameRef.current]]), x, y, 24)) place(it.k, it.id)
    },
    onTap: (it) => place(it.k, it.id),
    ghost: (it) => <div className="max-w-xs rounded-2xl bg-white px-3 py-2 text-base font-extrabold text-ink ring-2 ring-brand"><MathText text={it.text} /></div>,
  })

  const unit = ctx && q?.u ? q.u(ctx) : ''

  const submit = () => {
    if (E.ans === undefined || !ev || !q) return
    const v = parseNum(val)
    if (Math.abs(v - E.ans) < 1e-6) {
      S.attempt(true)
      const isNew = sols.add(solKey, `${ev.s} · ${q.short}`)
      if (isNew) track.strategy(`Problem yapısı: ${ev.s}`)
      const count = sols.list.length + (isNew ? 1 : 0)
      if (!S.done) S.complete()
      setPhase('solved')
      show(`Doğru! Cevap: ${tr(E.ans)}${unit ? ' ' + unit : ''}. ${isNew ? (count >= GOAL ? 'Bu modele farklı problemler yazdın, harika!' : 'Aynı modele başka bir problem de yazabilir misin?') : ''}`, { tone: 'ok' })
    } else {
      S.attempt(false)
      setVal('')
      show(T.solveHint ?? 'Henüz değil. Kendi hikâyeni modelle karşılaştır: “?” hangi parçada? Hangi işlem onu bulur?')
    }
  }

  const another = () => {
    setSel((s) => ({ who: s.who, what: s.what }))
    setPhase('compose')
    setVal('')
    setSlot('ev')
    show('Farklı bir olay ya da farklı bir soru seç. İstersen kişiyi ve nesneyi de değiştir.', { tone: 'ok' })
  }

  const hint = () => {
    const hs = T.hints ?? DEFAULT_HINTS
    S.hint()
    show(hs[Math.min(hintI, hs.length - 1)])
    setHintI((i) => i + 1)
  }

  const next = () => {
    written.current += sols.list.length
    if (S.last) {
      const n = tasks.length
      const total = written.current
      const r = total / (n * GOAL)
      onFinish({
        stars: r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1,
        summary: `${n} modele toplam ${total} farklı problem yazdın ve çözdün.`,
        insight:
          grade <= 3
            ? 'Aynı model birçok hikâye anlatabilir: 8 + ? = 15 hem “kaç tane daha aldı?”, hem “kaç fazla?”, hem de “15’ten 8’ini verince kaç kaldı?” sorusunun modelidir.'
            : grade <= 6
              ? 'İyi bir problemde sayılar modeldeki yerlerinde durur, olay modeldeki ilişkiyi (birleştirme, karşılaştırma, kat, oran) anlatır ve soru tam olarak bilinmeyeni sorar.'
              : 'Bir denklem, tablo ya da grafik tek bir duruma bağlı değildir: aynı matematiksel yapı bir alışverişi, bir sayı bilmecesini ya da bir büyüme sürecini modelleyebilir.',
      })
      return
    }
    sols.reset()
    setSel({})
    setSlot('who')
    setPhase('compose')
    setVal('')
    setHintI(0)
    clear()
    S.next()
  }

  // ───────── görünüm parçaları ─────────

  const ph = (t: string) => `⟦${t}⟧`
  const storyText = (() => {
    const head = ev && ctx ? ev.t(ctx) : `${ctx?.a.n ?? sel.who ?? ph(labels.who)} · ${ctx ? `${ctx.o.emoji} ${ctx.o.label}` : sel.what ? T.what.find((o) => o.id === sel.what)?.label : ph(labels.what)} · ${ph('Ne oldu?')}`
    return `${head} ${q && ctx ? q.t(ctx) : ph('Soru?')}`
  })()

  const card = dark ? 'bg-slate-800/80 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'
  const emoji = ctx?.o.emoji ?? T.what[0].emoji

  const scene = (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white p-3 text-ink ring-1 ring-line">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black tracking-wide text-ink-soft uppercase">Model · {T.title}</span>
          <span className={`rounded-xl bg-paper px-3 py-1 font-black ring-1 ring-line ${big ? 'text-2xl' : 'text-xl'}`}><MathText text={T.eq} /></span>
        </div>
        <ModelView m={T.model(ctx?.o ?? null)} emoji={emoji} big={big} />
      </div>

      <div ref={frameRef} className={`rounded-2xl p-3 ${card} ${drag.dragging ? 'ring-4 ring-brand/60' : ''}`}>
        <p className={`mb-2 flex items-center gap-1.5 text-sm font-black ${dark ? 'text-cyan-200' : 'text-brand-ink'}`}><PencilLine size={16} />Senin problemin</p>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDER.map((k) => {
            const filled = !!sel[k]
            const val = k === 'who' ? ctx?.a.n ?? T.who.find((w) => w.id === sel.who)?.n : k === 'what' ? T.what.find((o) => o.id === sel.what)?.label : k === 'ev' ? ev?.s : q?.short
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSlot(k)}
                aria-pressed={slot === k}
                className={`flex ${big ? 'min-h-14' : 'min-h-12'} flex-col items-start justify-center rounded-xl border-2 px-2.5 py-1 text-left transition ${slot === k ? 'border-brand' : filled ? (dark ? 'border-slate-500' : 'border-line') : 'border-dashed ' + (dark ? 'border-slate-500' : 'border-slate-300')} ${filled ? (dark ? 'bg-slate-700' : 'bg-paper') : ''}`}
              >
                <span className={`text-[11px] font-black uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{labels[k]}</span>
                <span className={`line-clamp-1 font-extrabold ${big ? 'text-base' : 'text-sm'}`}>{filled ? val : '—'}</span>
              </button>
            )
          })}
        </div>
        <p className={`leading-relaxed font-bold ${big ? 'text-2xl' : 'text-lg sm:text-xl'}`} aria-live="polite"><Story text={storyText} dark={dark} /></p>
      </div>

      <div className={`grid gap-1.5 rounded-2xl p-3 ${card}`} aria-label="Problem denetimi">
        {LIGHTS.map((l, i) => <LightRow key={l} label={l} state={E.lights[i]} dark={dark} />)}
      </div>
    </div>
  )

  const bankItems: Item[] =
    slot === 'who'
      ? T.who.map((w) => ({ k: 'who', id: w.id, text: w.n }))
      : slot === 'what'
        ? T.what.map((o) => ({ k: 'what', id: o.id, text: `${o.emoji} ${o.label}` }))
        : slot === 'ev'
          ? ctx ? T.events.map((e) => ({ k: 'ev', id: e.id, text: e.t(ctx) })) : []
          : ctx ? visQs.map((x) => ({ k: 'q', id: x.id, text: x.t(ctx) })) : []

  const bank = (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <div className="mb-3 grid grid-cols-4 gap-1.5" role="tablist">
        {ORDER.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={slot === k} onClick={() => setSlot(k)} className={`relative ${big ? 'min-h-14' : 'min-h-12'} rounded-xl px-1 text-sm font-black transition ${slot === k ? 'bg-brand text-white' : 'bg-paper text-ink ring-1 ring-line'}`}>
            {labels[k]}
            {sel[k] && <Check size={14} strokeWidth={3} className={`absolute top-1 right-1 ${slot === k ? 'text-white' : 'text-ok'}`} />}
          </button>
        ))}
      </div>
      {(slot === 'ev' || slot === 'q') && !ctx ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          Önce <b>Kim?</b> ve <b>{labels.what}</b> kartlarını seç; sonra olay ve soru kartları senin seçtiklerinle yazılacak.
          <div className="mt-2 flex gap-2">
            {!sel.who && <button type="button" className="btn-ghost min-h-12 text-sm" onClick={() => setSlot('who')}>Kim?</button>}
            {!sel.what && <button type="button" className="btn-ghost min-h-12 text-sm" onClick={() => setSlot('what')}>{labels.what}</button>}
          </div>
        </div>
      ) : slot === 'who' || slot === 'what' ? (
        <div className={`grid gap-2 ${slot === 'who' ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-1'}`}>
          {bankItems.map((it) => (
            <button key={it.id} type="button" {...drag.bind(it)} data-handle style={{ touchAction: 'none' }} className={`${big ? 'min-h-14 text-lg' : 'min-h-12 text-base'} cursor-grab rounded-2xl px-3 font-extrabold transition ${sel[it.k] === it.id ? 'bg-brand text-white' : 'bg-white text-ink ring-2 ring-line shadow-[0_3px_0_var(--color-line)] hover:ring-brand'}`}>
              {it.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-xs font-bold text-ink-soft">Karta dokun ya da tutamaktan tutup hikâyene sürükle.</p>
          {bankItems.map((it) => {
            const on = sel[it.k] === it.id
            return (
              <div key={it.id} className={`flex items-stretch overflow-hidden rounded-2xl transition ${on ? 'bg-brand-soft ring-2 ring-brand' : 'bg-white ring-2 ring-line'}`}>
                <span {...drag.bind(it)} data-handle style={{ touchAction: 'none' }} className="grid w-11 shrink-0 cursor-grab place-items-center bg-paper text-ink-soft" aria-label="Sürükle">
                  <GripVertical size={20} />
                </span>
                <button type="button" onClick={() => place(it.k, it.id)} className={`min-h-14 flex-1 px-3 py-2 text-left font-bold text-ink ${big ? 'text-lg' : 'text-[15px]'}`} aria-pressed={on}>
                  <MathText text={it.text} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const solveBox = (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <p className="text-sm font-black text-ink">Şimdi kendi problemini çöz!</p>
      <p className="mt-1 text-sm font-semibold text-ink-soft"><MathText text={q && ctx ? q.t(ctx) : ''} /></p>
      <div className="my-2 flex min-h-14 items-center justify-center rounded-xl bg-paper text-3xl font-black text-brand ring-1 ring-line" aria-live="polite">
        {val || '—'}{val && unit ? <span className="ml-2 text-lg text-ink-soft">{unit}</span> : null}
      </div>
      <NumPad value={val} onChange={setVal} onSubmit={submit} big={big} decimal={T.pad?.decimal} negative={T.pad?.negative} maxLen={6} submitLabel="Kontrol" />
      <button type="button" onClick={() => { setPhase('compose'); clear() }} className="btn-ghost mt-2 min-h-12 w-full text-sm"><RotateCcw size={16} />Hikâyeyi değiştir</button>
    </div>
  )

  const panel: ReactNode = (
    <>
      {phase === 'compose' && ready && (
        <button type="button" onClick={() => { setPhase('solve'); setVal('') }} className="btn-primary min-h-14 w-full text-lg animate-pop">
          <Check size={20} strokeWidth={3} />
          {already ? 'Yine de çöz' : 'Problemimi çözeceğim'}
        </button>
      )}
      {phase === 'solve' ? solveBox : phase === 'compose' ? bank : null}
      {phase === 'solved' && (
        <button type="button" onClick={another} className="btn-primary min-h-14 w-full text-lg">
          <Plus size={20} strokeWidth={3} />
          Başka bir problem yaz
        </button>
      )}
      <SolutionList list={sols.list} goal={GOAL} />
    </>
  )

  const doneBox = (
    <DoneNote title="Problemini yazdın ve çözdün!" note={sols.list.length >= GOAL ? 'Aynı modele farklı problemler yazdın. İstersen bir tane daha dene!' : 'Aynı modele farklı bir olay ya da soruyla başka bir problem de yazabilir misin?'}>
      {(S.idx === 0 || S.idx === 3) && <StrategyPicker key={S.idx} question="Problemini kurarken neye dikkat ettin?" options={STRATS} onPick={() => {}} />}
    </DoneNote>
  )

  return (
    <>
      <ActivityLayout
        grade={grade}
        idx={S.idx}
        total={tasks.length}
        title={T.title}
        prompt={big ? 'Resme ya da modele uyan bir problem yaz: Kim? Ne? Ne oldu? Soru? Sonra kendin çöz.' : 'Modele uyan bir problem yaz: kartlarla Kim?, Ne?, Ne oldu? ve Soru yuvalarını doldur. Üç ışık yeşil olunca kendi problemini çöz.'}
        nudge={nudge}
        onCloseNudge={clear}
        done={S.done}
        doneBox={doneBox}
        onNext={next}
        onHint={hint}
        panel={panel}
      >
        {scene}
      </ActivityLayout>
      {drag.ghost}
    </>
  )
}

function Story({ text, dark }: { text: string; dark: boolean }) {
  const parts = text.split(/(⟦[^⟧]*⟧)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('⟦') ? (
          <span key={i} className={`mx-0.5 inline-block rounded-lg border-2 border-dashed px-2 align-middle text-[0.8em] font-black ${dark ? 'border-slate-500 text-slate-400' : 'border-slate-300 text-slate-400'}`}>{p.slice(1, -1)}</span>
        ) : (
          <MathText key={i} text={p} />
        ),
      )}
    </>
  )
}

function LightRow({ label, state, dark }: { label: string; state: Light; dark: boolean }) {
  const dot = state === 'ok' ? 'bg-ok text-white' : state === 'bad' ? 'bg-amber-400 text-white' : dark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-400'
  return (
    <div className="flex items-center gap-2.5">
      <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-black transition ${dot}`} aria-hidden>{state === 'ok' ? '✓' : state === 'bad' ? '!' : '·'}</span>
      <span className={`text-sm font-extrabold sm:text-[15px] ${state === 'bad' ? (dark ? 'text-amber-300' : 'text-amber-800') : dark ? 'text-slate-200' : 'text-ink'}`}>{label}</span>
      <span className="sr-only">{state === 'ok' ? 'evet' : state === 'bad' ? 'henüz değil' : 'bekliyor'}</span>
    </div>
  )
}
