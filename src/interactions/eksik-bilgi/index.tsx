import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, CircleHelp, ClipboardCheck, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { BigButton, StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, NumPad, hitZone, parseNum, shuffle, tr, useNudge, useSession, useTileDrag } from '../hizli-noktalar/kit'
import type { InteractionProps } from '../types'
import { makeTasks } from './tasks'

/**
 * 71. Eksik Bilgiyi Bul — Van de Walle: problemi anlamak, gerekli bilgiyi seçmek, “bu sayı neden burada?” sorusu.
 * Akış (her problem):
 *  1) Ayır: bilgi kartlarını “Gerekli / Gereksiz” kutularına sürükle (ya da kartı seç → kutuya dokun). Kontrol edince
 *     yanlış kartlar tepsiye döner ve düşündüren bir soru gelir (gereksiz sayıyı gerekli sanma yanılgısı rapora yazılır).
 *  2) Eksik mi?: gerekli kartlar soruyu cevaplamaya yetiyor mu? Eksik bilgiyi aday çipler arasından seç ya da “Eksik bilgi yok”.
 *  3) Değer ver: eksik bilgi için gerçek hayatta makul bir değer seç (aralık dışıysa “Bu mümkün mü?” sorusu).
 *  4) Çöz: kendi değerinle problemi çöz; istersen başka bir değerle yeniden dene (farklı değerler useSolutions ile sayılır).
 *  3: +, −, × (para, nesneler) · 4: çok adımlı dört işlem, uzunluk, süre · 5: bir çokluğun kesri, alan-çevre, büyük sayılar
 *  6: ondalık, yüzde, oran, ortalama · 7: tam sayılar, rasyonel sayılar, orantı, denklem · 8: üslü ifadeler, Pisagor, doğrusal ilişki.
 */

type Zone = 'tray' | 'need' | 'extra'
type Phase = 'sort' | 'missing' | 'value' | 'solve' | 'done'
interface Card { id: string; text: string; need: boolean }

const NONE = '__none__'
const STRATS = ['Soruyu tekrar okudum', 'Her bilgi cevabı değiştirir mi diye sordum', 'İşlemi yazıp kullandığım sayılara baktım', 'Birimlere baktım']
const hasDigit = (s: string) => /\d/.test(s)
const near = (a: number, b: number, round?: boolean) => Math.abs(a - b) < (round ? 0.0051 : 1e-6) || (round && Math.abs(a - Math.round(b * 100) / 100) < 1e-6)

export default function EksikBilgi({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const P = tasks[S.idx]
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const big = age.big
  const { nudge, show, clear } = useNudge()
  const sol = useSolutions()

  const cards = useMemo<Card[]>(() => shuffle([...P.need.map((t, i) => ({ id: `n${i}`, text: t, need: true })), ...P.extra.map((t, i) => ({ id: `e${i}`, text: t, need: false }))]), [P])
  const options = useMemo(() => shuffle([...(P.miss ? [P.miss.label] : []), ...P.decoys]), [P])

  const [phase, setPhase] = useState<Phase>('sort')
  const [place, setPlace] = useState<Record<string, Zone>>({})
  const [locked, setLocked] = useState<string[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [wrongMiss, setWrongMiss] = useState<string[]>([])
  const [val, setVal] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [fails, setFails] = useState(0)
  const [hintI, setHintI] = useState(0)
  const totals = useRef({ missing: 0, extraSpotted: 0 })

  const zones = useRef(new Map<Zone, HTMLElement | null>())
  const zoneOf = (id: string): Zone => place[id] ?? 'tray'

  const move = (id: string, z: Zone) => {
    if (phase !== 'sort' || locked.includes(id)) return
    setPlace((p) => ({ ...p, [id]: z }))
    setSel(null)
  }
  const drag = useTileDrag<string>({
    onDrop: (id, x, y) => {
      const z = hitZone(zones.current, x, y)
      if (z) move(id, z)
    },
    onTap: (id) => {
      if (phase !== 'sort' || locked.includes(id)) return
      setSel((s) => (s === id ? null : id))
    },
    ghost: (id) => {
      const c = cards.find((k) => k.id === id)
      return c ? <CardFace text={c.text} dark={dark} big={big} state="lift" /> : null
    },
  })
  const tapZone = (z: Zone) => sel && move(sel, z)

  const placed = cards.filter((c) => zoneOf(c.id) !== 'tray').length
  const ansNow = (v: number | null) => P.ans(v ?? 0)

  // ── 1) Ayırma kontrolü
  const checkSort = () => {
    const wrong = cards.filter((c) => (zoneOf(c.id) === 'need') !== c.need)
    if (!wrong.length) {
      S.attempt(true)
      setLocked(cards.map((c) => c.id))
      totals.current.extraSpotted += P.extra.length
      setPhase('missing')
      show('Bilgileri doğru ayırdın! Şimdi düşün: gerekli kartlar soruyu cevaplamaya yetiyor mu?', { tone: 'ok' })
      return
    }
    S.attempt(false)
    setLocked(cards.filter((c) => !wrong.includes(c)).map((c) => c.id))
    setPlace((p) => {
      const q = { ...p }
      wrong.forEach((c) => (q[c.id] = 'tray'))
      return q
    })
    const w = wrong.find((c) => !c.need) ?? wrong[0]
    const pre = wrong.length > 1 ? `${wrong.length} kart tepsiye geri döndü. ` : 'Bir kart tepsiye geri döndü. '
    if (w.need) show(`${pre}“${w.text}” Bu bilgi olmadan sorunun cevabını bulabilir misin?`, { misc: 'Çözüm için gerekli bir bilgiyi gereksiz saydı' })
    else show(`${pre}“${w.text}” Bu bilgi değişseydi sorunun cevabı da değişir miydi?`, { misc: hasDigit(w.text) ? 'Problemdeki tüm sayıları kullanmak gerektiğini düşündü' : 'Soruyla ilgisiz bilgiyi gerekli saydı' })
  }

  // ── 2) Eksik bilgi seçimi
  const pickMiss = (opt: string) => {
    if (phase !== 'missing' || wrongMiss.includes(opt)) return
    const right = P.miss ? opt === P.miss.label : opt === NONE
    if (right) {
      S.attempt(true)
      if (P.miss) {
        totals.current.missing++
        setPhase('value')
        show(`Evet! “${P.miss.label}” bilinmeden soru cevaplanamaz. Gerçek hayatta bu ne kadar olabilir? Makul bir değer seç.`, { tone: 'ok' })
      } else {
        setPhase('solve')
        show('Doğru, gerekli bilgilerin hepsi var. Gereksizleri bir kenara bırakıp problemi çöz!', { tone: 'ok' })
      }
      return
    }
    S.attempt(false)
    setWrongMiss((w) => [...w, opt])
    if (opt === NONE) show('Gerekli kartlardaki sayılarla işlemi yazmayı dene. Sorunun cevabını bulabiliyor musun, yoksa bir sayı “?” olarak mı kalıyor?', { misc: 'Problemde gerekli bir bilginin eksik olduğunu fark etmedi' })
    else if (P.miss) show(`“${opt}” bilinseydi soruyu cevaplayabilir miydin? Soruda tam olarak ne isteniyor, tekrar oku.`)
    else show(`“${opt}” olmadan da soruyu çözebilir misin? Gerekli kartlarla işlemi yazmayı dene.`, { misc: 'Gerekli bilgiler tamamken eksik bilgi aradı' })
  }

  // ── 3) Makul değer
  const submitValue = () => {
    const m = P.miss!
    const v = parseNum(input)
    if (!Number.isFinite(v)) return
    if (v < m.min) return show(m.tooLow)
    if (v > m.max) return show(m.tooHigh)
    if (m.ok && !m.ok(v)) return show(m.okMsg ?? 'Bu değerle hesap kolay çıkmıyor. Başka bir değer seçer misin?')
    clear()
    setVal(v)
    setInput('')
    setFails(0)
    setPhase('solve')
  }

  // ── 4) Çöz
  const submitAnswer = () => {
    const a = parseNum(input)
    if (!Number.isFinite(a)) return
    const exact = ansNow(val)
    if (near(a, exact, P.round)) {
      clear()
      setInput('')
      if (!S.done) {
        S.attempt(true)
        S.complete()
      }
      if (P.miss && val !== null) sol.add(`${S.idx}|${val}`, `${tr(val, 2)} ${P.miss.unit} → ${tr(exact, 2)} ${P.unit}`)
      setPhase('done')
      return
    }
    S.attempt(false)
    const f = fails + 1
    setFails(f)
    if (f === 1) show(P.hint)
    else show(`Adım adım hesapla: ${P.expr(val ?? 0)} = ? ${P.round ? 'Gerekirse yüzde birlere yuvarla.' : ''}`)
  }

  const hint = () => {
    S.hint()
    setHintI((i) => i + 1)
    if (phase === 'sort') show(hintI % 2 === 0 ? `Önce soruyu oku: “${P.q}” Her kart için kendine sor: Bu bilgi cevabı değiştirir mi?` : 'Sorudaki birime bak. Cevap hangi birimle verilecek? O birimle ilgili kartlar işine yarar.')
    else if (phase === 'missing') show('Gerekli kartlardaki sayılarla işlemi yazmayı dene. Bir yerde “?” kalıyor mu?')
    else if (phase === 'value') show(`Gerçek hayatı düşün: ${P.miss?.label.toLocaleLowerCase('tr-TR')} genelde ne kadar olur? ${P.miss ? `${tr(P.miss.min)} ile ${tr(P.miss.max)} arası makul olabilir.` : ''}`)
    else show(P.hint)
  }

  const retry = () => {
    setPhase('value')
    setInput('')
    setFails(0)
    show('Başka bir değer seç. Cevap nasıl değişecek, önce tahmin et!')
  }

  const next = () => {
    if (S.last) {
      const n = tasks.length
      const tried = sol.list.length
      onFinish({
        stars: S.stars(),
        summary: `${n} problemde gerekli, gereksiz ve eksik bilgiyi ayırdın; ${totals.current.missing} probleme kendi makul değerini koydun${tried > totals.current.missing ? ` ve toplam ${tried} farklı değer denedin` : ''}.`,
        insight:
          grade <= 4
            ? 'Bir problemdeki her sayı kullanılmaz: önce “Ne soruluyor?” diye sorarsın, sonra yalnız cevabı değiştiren bilgileri seçersin. Bir bilgi eksikse, gerçek hayata uygun bir değerle tamamlayabilirsin.'
            : grade <= 6
              ? 'Bir bilginin gerekli olup olmadığını anlamanın yolu: “Bu değişseydi cevap değişir miydi?” diye sormak. Eksik bilgiye makul bir değer verince cevap da o değere bağlı olur.'
              : 'Problem çözmek, modeli kurmakla başlar: hangi nicelikler ilişkide (gerekli), hangileri gürültü (gereksiz), hangisi bilinmiyor (eksik)? Eksik niceliği bir değişken gibi düşünürsen, cevap onun bir fonksiyonu olur.',
      })
      return
    }
    setPhase('sort')
    setPlace({})
    setLocked([])
    setSel(null)
    setWrongMiss([])
    setVal(null)
    setInput('')
    setFails(0)
    setHintI(0)
    clear()
    S.next()
  }

  const prompts: Record<Phase, string> = {
    sort: big ? 'Hangi bilgiler soruyu cevaplamak için gerekli? Kartları kutulara taşı: sürükle ya da karta dokunup kutuya dokun.' : 'Hangi bilgiler soruyu cevaplamak için gerekli, hangileri gereksiz? Kartları sürükle ya da kartı seçip kutuya dokun.',
    missing: 'Gerekli kartlar soruyu cevaplamaya yetiyor mu? Eksik bir bilgi var mı?',
    value: `Eksik bilgi: “${P.miss?.label ?? ''}”. Gerçek hayatta makul olacak bir değer seç.`,
    solve: val !== null ? 'Kendi değerinle problem tamamlandı. Şimdi çöz!' : 'Gerekli bilgiler tamam. Şimdi problemi çöz!',
    done: 'Problemi çözdün!',
  }

  const tile = `rounded-2xl ${dark ? 'bg-slate-800/80 ring-1 ring-slate-600' : 'bg-white/90 ring-1 ring-line'}`
  const zoneCards = (z: Zone) => cards.filter((c) => zoneOf(c.id) === z)

  const renderCard = (c: Card) => {
    const lockedC = locked.includes(c.id)
    const st = lockedC ? (c.need ? 'okNeed' : 'okExtra') : sel === c.id ? 'sel' : drag.dragging === c.id ? 'ghost' : 'idle'
    if (lockedC || phase !== 'sort')
      return (
        <div key={c.id} className="animate-pop">
          <CardFace text={c.text} dark={dark} big={big} state={st} />
        </div>
      )
    return (
      <button key={c.id} type="button" {...drag.bind(c.id)} onClick={(e) => e.stopPropagation()} data-handle style={{ touchAction: 'none' }} className="block w-full cursor-grab text-left" aria-pressed={sel === c.id} aria-label={`Bilgi kartı: ${c.text}`}>
        <CardFace text={c.text} dark={dark} big={big} state={st} />
      </button>
    )
  }

  const missingCard =
    P.miss && (phase === 'value' || phase === 'solve' || phase === 'done') ? (
      val !== null && phase !== 'value' ? (
        <div className="animate-pop"><CardFace text={P.miss.card.replace('#', tr(val, 2))} dark={dark} big={big} state="mine" tag="Senin değerin" /></div>
      ) : (
        <div className="animate-pop"><CardFace text={`? ${P.miss.label}`} dark={dark} big={big} state="missing" tag="Eksik bilgi" /></div>
      )
    ) : null

  const scene = (
    <div className="flex flex-col gap-3">
      {/* Hikâye + soru */}
      <div className={`${tile} flex items-start gap-3 p-3 sm:p-4`}>
        <span className={`grid shrink-0 place-items-center rounded-2xl ${big ? 'size-16 text-5xl' : 'size-14 text-4xl'} ${dark ? 'bg-slate-700' : 'bg-amber-50'}`} aria-hidden>{P.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className={`font-bold ${big ? 'text-lg' : 'text-base'} ${dark ? 'text-slate-200' : 'text-ink-soft'}`}><MathText text={P.story} /></p>
          <p className={`mt-1 font-black ${big ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} ${dark ? 'text-cyan-200' : 'text-brand-ink'}`}>
            <CircleHelp size={big ? 22 : 20} className="mr-1 inline -translate-y-0.5" aria-hidden />
            <MathText text={P.q} />
          </p>
        </div>
      </div>

      {/* Tepsi */}
      {phase === 'sort' && (
        <div ref={(el) => void zones.current.set('tray', el)} onClick={() => tapZone('tray')} className={`rounded-2xl border-2 border-dashed p-2.5 ${dark ? 'border-slate-600 bg-slate-900/40' : 'border-line bg-paper/70'}`}>
          <p className={`mb-2 px-1 text-xs font-black tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Bilgi kartları {zoneCards('tray').length ? `(${zoneCards('tray').length})` : ''}</p>
          {zoneCards('tray').length ? (
            <div className="grid gap-2 sm:grid-cols-2">{zoneCards('tray').map(renderCard)}</div>
          ) : (
            <p className={`px-1 pb-1 text-sm font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Tüm kartlar yerleşti. Kontrol etmeye hazır mısın?</p>
          )}
        </div>
      )}

      {/* Kutular */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <DropZone
          zref={(el) => void zones.current.set('need', el)}
          onTap={() => tapZone('need')}
          active={!!sel}
          dark={dark}
          kind="need"
          title="Gerekli"
          icon={<ClipboardCheck size={18} />}
        >
          {zoneCards('need').map(renderCard)}
          {missingCard}
        </DropZone>
        <DropZone zref={(el) => void zones.current.set('extra', el)} onTap={() => tapZone('extra')} active={!!sel} dark={dark} kind="extra" title="Gereksiz" icon={<Trash2 size={18} />}>
          {zoneCards('extra').map(renderCard)}
        </DropZone>
      </div>
      {drag.ghost}
    </div>
  )

  const numBox = (label: ReactNode, unit: string, onSubmit: () => void, opts: { decimal?: boolean; negative?: boolean; maxLen: number }) => (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <p className="text-sm font-black text-ink-soft">{label}</p>
      <p className="my-2 flex min-h-12 items-baseline justify-center gap-2 rounded-xl bg-paper px-3 py-1 text-3xl font-black text-brand tabular-nums">
        {input || <span className="text-ink-soft/50">?</span>}
        <span className="text-lg text-ink-soft">{unit}</span>
      </p>
      <NumPad value={input} onChange={setInput} onSubmit={onSubmit} big={big} decimal={opts.decimal} negative={opts.negative} maxLen={opts.maxLen} submitLabel="Tamam" />
    </div>
  )

  const panel = (
    <>
      {phase === 'sort' && (
        <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
          <p className="text-sm font-black text-ink-soft">Yerleşen kartlar: {placed} / {cards.length}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(placed / cards.length) * 100}%` }} /></div>
          {sel && <p className="mt-2 text-sm font-bold text-brand-ink">Kart seçildi. Şimdi “Gerekli” ya da “Gereksiz” kutusuna dokun.</p>}
          <BigButton onClick={checkSort} disabled={placed < cards.length} className="mt-3 w-full"><Check size={20} />Kontrol et</BigButton>
        </div>
      )}
      {phase === 'missing' && (
        <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black text-ink-soft">Soruyu cevaplamak için başka bir bilgiye ihtiyaç var mı?</p>
          <div className="grid gap-2">
            {[...options, NONE].map((o) => {
              const w = wrongMiss.includes(o)
              return (
                <button key={o} type="button" onClick={() => pickMiss(o)} disabled={w} className={`flex ${big ? 'min-h-14 text-lg' : 'min-h-12 text-base'} items-center gap-2 rounded-2xl border-2 px-3 text-left font-extrabold transition ${w ? 'border-line bg-paper text-ink-soft line-through opacity-60' : o === NONE ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-500' : 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400'}`}>
                  <span aria-hidden>{o === NONE ? '✅' : '❓'}</span>
                  {o === NONE ? 'Eksik bilgi yok, hepsi var' : `Eksik: ${o}`}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {phase === 'value' && P.miss && numBox(<>“{P.miss.label}” sence ne kadar?</>, P.miss.unit, submitValue, { decimal: P.miss.decimal, maxLen: 5 })}
      {phase === 'solve' && numBox('Cevabın', P.unit, submitAnswer, { decimal: P.decimal || P.round, negative: P.negative, maxLen: 9 })}
    </>
  )

  const exact = ansNow(val)
  const doneBox = (
    <DoneNote title={`Cevap: ${tr(exact, 2)} ${P.unit}`}>
      <p className="mt-1 font-bold text-green-900">
        <MathText text={`${P.expr(val ?? 0)} ${P.round && Math.abs(exact - Math.round(exact)) > 1e-9 ? '≈' : '='} ${tr(exact, 2)}`} />
      </p>
      {P.miss && val !== null && (
        <p className="mt-1 text-sm font-bold text-green-900">Bu cevap senin seçtiğin değere ({tr(val, 2)} {P.miss.unit}) göre. Değer değişince cevap nasıl değişir?</p>
      )}
      {P.miss && phase === 'done' && (
        <button type="button" onClick={retry} className="btn-ghost mt-2 min-h-12 w-full text-sm"><RefreshCw size={16} />Başka bir değerle dene</button>
      )}
      {!P.miss && <p className="mt-1 text-sm font-bold text-green-900">Gereksiz {P.extra.length} bilgiyi kullanmadan çözdün.</p>}
      {(S.idx === 1 || S.idx === tasks.length - 1) && <StrategyPicker key={S.idx} question="Gereksiz bilgiyi nasıl ayırdın?" options={STRATS} onPick={() => undefined} />}
    </DoneNote>
  )

  const myVals = sol.list.filter((s) => s.key.startsWith(`${S.idx}|`))

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title={P.title}
      prompt={prompts[phase]}
      nudge={nudge}
      onCloseNudge={clear}
      done={S.done}
      doneBox={doneBox}
      onNext={next}
      onHint={phase === 'done' ? undefined : hint}
      panel={panel}
      footer={
        myVals.length > 0 ? (
          <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Sparkles size={16} className="text-amber-500" />Denediğin değerler: {myVals.length}</p>
            <div className="flex flex-wrap gap-1.5">{myVals.map((s) => <span key={s.key} className="chip bg-emerald-50 px-3 py-1 text-sm text-emerald-800 animate-pop">{s.label}</span>)}</div>
          </div>
        ) : undefined
      }
    >
      {scene}
    </ActivityLayout>
  )
}

type CardState = 'idle' | 'sel' | 'ghost' | 'lift' | 'okNeed' | 'okExtra' | 'missing' | 'mine'

function CardFace({ text, dark, big, state, tag }: { text: string; dark: boolean; big: boolean; state: CardState; tag?: string }) {
  const base = `flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left font-extrabold leading-snug transition ${big ? 'min-h-16 text-lg' : 'min-h-14 text-base'}`
  const cls: Record<CardState, string> = {
    idle: dark ? 'bg-slate-700 text-white ring-2 ring-slate-500' : 'bg-white text-ink ring-2 ring-line shadow-[0_3px_0_#e7e8f2]',
    sel: 'bg-amber-300 text-amber-950 ring-4 ring-amber-200 scale-[1.02]',
    ghost: 'opacity-35 ' + (dark ? 'bg-slate-700 text-white ring-2 ring-slate-500' : 'bg-white text-ink ring-2 ring-line'),
    lift: (dark ? 'bg-slate-600 text-white ring-2 ring-cyan-400' : 'bg-white text-ink ring-2 ring-brand') + ' max-w-[300px]',
    okNeed: dark ? 'bg-emerald-900/60 text-emerald-50 ring-2 ring-emerald-500' : 'bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300',
    okExtra: dark ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-600 line-through decoration-slate-500' : 'bg-slate-50 text-ink-soft ring-1 ring-line line-through decoration-slate-300',
    missing: dark ? 'border-2 border-dashed border-amber-400 bg-amber-500/10 text-amber-200' : 'border-2 border-dashed border-amber-400 bg-amber-50 text-amber-900',
    mine: dark ? 'bg-amber-400/20 text-amber-100 ring-2 ring-amber-400' : 'bg-amber-100 text-amber-950 ring-2 ring-amber-400',
  }
  return (
    <span className={`${base} ${cls[state]}`}>
      <span className="min-w-0 flex-1">
        {tag && <span className={`mb-0.5 block text-[11px] font-black tracking-wide uppercase ${dark ? 'text-amber-300' : 'text-amber-700'}`}>{tag}</span>}
        <MathText text={text} />
      </span>
      {state === 'okNeed' && <Check size={18} strokeWidth={3} className="shrink-0 text-emerald-500" />}
    </span>
  )
}

function DropZone({ zref, onTap, active, dark, kind, title, icon, children }: { zref: (el: HTMLElement | null) => void; onTap: () => void; active: boolean; dark: boolean; kind: 'need' | 'extra'; title: string; icon: ReactNode; children: ReactNode }) {
  const need = kind === 'need'
  const skin = need
    ? dark ? 'bg-emerald-950/40 ring-emerald-700 text-emerald-200' : 'bg-emerald-50/80 ring-emerald-300 text-emerald-800'
    : dark ? 'bg-slate-900/50 ring-slate-600 text-slate-300' : 'bg-slate-100/80 ring-slate-300 text-slate-600'
  return (
    <div
      ref={zref}
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap()}
      aria-label={`${title} kutusu`}
      className={`flex min-h-40 flex-col gap-2 rounded-2xl p-2 ring-2 transition sm:p-2.5 ${skin} ${active ? 'ring-4 ring-amber-300' : ''}`}
    >
      <p className="flex items-center gap-1.5 px-1 text-sm font-black tracking-wide uppercase">{icon}{title}</p>
      {children}
    </div>
  )
}
