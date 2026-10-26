import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Blocks, Check, Lightbulb, RotateCcw, Search, ThumbsUp } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, StrategyPicker, useAge, useSolutions, type AgeTier } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { ToolSheet } from '../../ToolSheet'
import { duelBank, huntBank, type Duel, type Hunt, type Op } from './cases'
import { BlankLines, BugSvg, CaughtFx, ColumnOp, FixLine, HA_STYLE, HAND, Keypad, LensSvg, Notebook, Stamp, StepRow, fmtNum, type RowState } from './parts'

/**
 * Hata Avcısı — kurgusal öğrencilerin çözümlerindeki hatayı bul, nedenini açıkla, düzelt.
 * Akış (her vaka): 1) hatalı adıma dokun ya da “Hata yok!” 2) neden kartı seç 3) düzelt (tuş takımı / doğru yazımları seç / işlem sırasını kur).
 * Doğru çözümlerde: “Nasıl emin oldun?” — birden çok geçerli kanıt. Son tur: “Kim haklı?” (iki farklı yol).
 */

type Item = { kind: 'hunt'; h: Hunt } | { kind: 'duel'; d: Duel }
type Result = { first: boolean; kind: 'error' | 'clean' | 'duel'; ways: number; revealed: boolean }

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function buildSession(grade: Grade): Item[] {
  const bank = huntBank[grade]
  const errs = shuffle(bank.filter((h) => h.bug)).slice(0, 4)
  const clean = shuffle(bank.filter((h) => !h.bug))[0]
  const list: Hunt[] = [...errs]
  if (clean) list.splice(1 + Math.floor(Math.random() * list.length), 0, clean)
  const duel = shuffle(duelBank[grade])[0]
  return [...list.map((h) => ({ kind: 'hunt' as const, h })), { kind: 'duel' as const, d: duel }]
}

const INSIGHT: Record<number, string> = {
  2: 'Bir onluk 10 birliktir: eldeyi taşımak ve onluk bozmak bu yüzden gerekir. Ters işlem ve tahmin, hatayı yakalamanın iki güçlü yolu.',
  3: 'Basamak değeri her şeyin anahtarı: 10 onluk 1 yüzlük eder, sıfır da boş basamağın yerini tutar. Tahminle kontrol etmek hatayı hemen gösterir.',
  4: 'Sıfırlar da basamak değeri taşır; birim kesirlerde payda büyüdükçe parçalar küçülür. “Sonuç makul mü?” sorusu hataları yakalar.',
  5: 'İşlem önceliği ifadenin anlamından gelir; çevre sınırın uzunluğu, alan içi dolduran birim karelerdir.',
  6: 'Ondalık ve yüzdelerde aynı birimle karşılaştırmak (0,3 = 0,30) ve sonucun bağlama uyup uymadığını sormak hataları ortaya çıkarır.',
  7: 'Eşitlik bir teraziye benzer: iki tarafa aynı işlem yapılır. Orantıda fark değil oran korunur; işaret kuralları örüntülerden gelir.',
  8: 'Üs ve kök toplamaya dağılmaz; örnek bir sayıyla sınamak ya da modele (alan, üçgen) bakmak bu yanılgıları hemen gösterir.',
}

export default function HataAvcisi({ grade, onFinish }: GameProps) {
  const age = useAge(grade)
  const [items] = useState(() => buildSession(grade))
  const [idx, setIdx] = useState(0)
  const results = useRef<Result[]>([])
  const [caught, setCaught] = useState(0)
  const lens = grade >= 5

  const next = (r: Result) => {
    results.current.push(r)
    if (idx + 1 < items.length) {
      setIdx(idx + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const rs = results.current
    const first = rs.filter((x) => x.first).length
    const errs = rs.filter((x) => x.kind === 'error')
    const extra = rs.reduce((s, x) => s + Math.max(0, x.ways - 1), 0)
    const score = rs.reduce((s, x) => s + (x.first ? 10 : x.revealed ? 3 : 6), 0) + extra * 3
    const clean = rs.some((x) => x.kind === 'clean')
    onFinish({
      stars: starsFor(first / rs.length),
      score,
      summary: `${errs.length} hatayı yakalayıp düzelttin${clean ? ', doğru bir çözümü kanıtladın' : ''} ve “Kim haklı?” turunu çözdün.${extra ? ` ${extra} ek doğru yol buldun!` : ''}`,
      insight: INSIGHT[grade] ?? INSIGHT[8],
    })
  }

  const item = items[idx]
  return (
    <Scene grade={grade}>
      <style>{HA_STYLE}</style>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <LevelDots current={idx} total={items.length} />
          <span className={`text-sm font-black ${age.tier === 'atolye' ? 'text-slate-300' : 'text-ink-soft'}`}>{item.kind === 'duel' ? 'Kim haklı?' : `Vaka ${idx + 1} / ${items.length - 1}`}</span>
        </div>
        <span className={`chip gap-1.5 px-3 py-1 text-sm ${age.tier === 'atolye' ? 'bg-slate-800 text-amber-200 ring-1 ring-slate-600' : 'bg-white text-rose-700 ring-1 ring-rose-200'}`} aria-label={`${caught} hata yakalandı`}>
          {lens ? <LensSvg size={22} /> : <BugSvg size={22} />}
          {caught} yakalandı
        </span>
      </div>
      {item.kind === 'hunt' ? (
        <HuntCase key={item.h.id} c={item.h} grade={grade} tier={age.tier} lens={lens} askStrategy={idx % 2 === 0} onDone={next} onCatch={() => setCaught((n) => n + 1)} />
      ) : (
        <DuelCase key={item.d.id} d={item.d} tier={age.tier} lens={lens} onDone={next} />
      )}
    </Scene>
  )
}

/* ───────────────────────── yardımcı arayüz ───────────────────────── */

function Panel({ dark, title, icon, children, panelRef }: { dark: boolean; title: string; icon?: ReactNode; children: ReactNode; panelRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={panelRef} className={`scroll-mt-24 rounded-3xl p-4 shadow-[var(--shadow-card)] ${dark ? 'bg-slate-800/90 text-slate-100 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
      <p className={`mb-3 flex items-center gap-2 text-lg leading-snug font-black ${dark ? 'text-white' : 'text-ink'}`}>{icon}{title}</p>
      {children}
    </div>
  )
}

function Card({ text, state, onClick, dark, big }: { text: string; state: 'idle' | 'ok' | 'wrong' | 'glow'; onClick: () => void; dark: boolean; big?: boolean }) {
  const base = dark ? 'bg-slate-700/60 text-slate-100 ring-slate-500 hover:bg-slate-700' : 'bg-white text-ink ring-line hover:bg-sky-50'
  const cls = state === 'ok' ? (dark ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400' : 'bg-emerald-50 text-emerald-900 ring-emerald-400') : state === 'wrong' ? (dark ? 'bg-amber-500/10 text-amber-200/80 ring-amber-400/60' : 'bg-amber-50 text-amber-900/70 ring-amber-300') : base
  return (
    <button type="button" onClick={onClick} disabled={state === 'ok' || state === 'wrong'} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left font-bold ring-2 transition active:scale-[0.99] disabled:cursor-default ${big ? 'min-h-16 text-[17px]' : 'min-h-14 text-[15px] sm:text-base'} ${cls} ${state === 'glow' ? 'ha-glow' : ''}`}>
      <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm ${state === 'ok' ? 'bg-emerald-500 text-white' : state === 'wrong' ? 'bg-amber-300 text-white' : dark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>{state === 'ok' ? <Check size={16} strokeWidth={3} /> : state === 'wrong' ? '?' : '•'}</span>
      <span className="min-w-0 flex-1 leading-snug"><MathText text={text} /></span>
    </button>
  )
}

const VOW = 'aeıioöuü'
/** Ada tamlayan eki: Ece’nin, Can’ın, Bora’nın */
function genName(n: string) {
  const v = [...n.toLocaleLowerCase('tr')].reverse().find((ch) => VOW.includes(ch)) ?? 'e'
  const h = 'aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü'
  return `${n}’${VOW.includes(n.slice(-1).toLocaleLowerCase('tr')) ? 'n' : ''}${h}n`
}

/** “Modelle dene”: uygun manipülatifi alttan açılan panelde gösterir (dar panelde Nudge metnini sıkıştırmamak için ayrı düğme) */
function ModelButton({ tool, config, dark }: { tool: ManipulativeTool; config?: ManipulativeConfig; dark: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold ring-1 animate-fade-up ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line hover:bg-paper'}`}>
        <Blocks size={18} />Modelle dene
      </button>
      {open && <ToolSheet tool={tool} config={config} onClose={() => setOpen(false)} />}
    </>
  )
}

const KEYS = (g: Grade) => [...(g >= 6 ? [','] : []), ...(g >= 7 ? ['−'] : [])]
const parseNum = (s: string) => {
  const t = s.replace('−', '-').replace(',', '.')
  if (!t || t === '-' || t.endsWith('.')) return NaN
  return Number(t)
}

function Sol({ dark, ...p }: { dark: boolean } & Parameters<typeof SolutionList>[0]) {
  return <div className={dark ? 'text-ink' : ''}><SolutionList {...p} /></div>
}

/* ───────────────────────── İşlem sırası kurucu ───────────────────────── */

const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b)

function truthOf(nums: number[], ops: Op[]) {
  const v = [...nums], o = [...ops]
  for (const pass of [['×', '÷'], ['+', '−']]) {
    for (let i = 0; i < o.length; ) {
      if (pass.includes(o[i])) {
        v.splice(i, 2, apply(v[i], o[i], v[i + 1]))
        o.splice(i, 1)
      } else i++
    }
  }
  return v[0]
}

function runOrder(nums: number[], ops: Op[], order: number[]) {
  const v = [...nums], ids = ops.map((_, i) => i)
  for (const id of order) {
    const p = ids.indexOf(id)
    v.splice(p, 2, apply(v[p], ops[id], v[p + 1]))
    ids.splice(p, 1)
  }
  return v[0]
}

function perms(n: number): number[][] {
  if (n === 0) return [[]]
  const out: number[][] = []
  const rec = (cur: number[], rest: number[]) => {
    if (!rest.length) return void out.push(cur)
    rest.forEach((x, i) => rec([...cur, x], [...rest.slice(0, i), ...rest.slice(i + 1)]))
  }
  rec([], Array.from({ length: n }, (_, i) => i))
  return out
}

function OrderFix({ nums, ops, dark, onValid, onWrong, found, more }: { nums: number[]; ops: Op[]; dark: boolean; onValid: (key: string, label: string, expr: string) => void; onWrong: (v: number) => void; found: string[]; more: boolean }) {
  const [vals, setVals] = useState(nums)
  const [ids, setIds] = useState(ops.map((_, i) => i))
  const [seq, setSeq] = useState<number[]>([])
  const [lines, setLines] = useState<string[]>([])
  const [bad, setBad] = useState(false)
  const truth = useMemo(() => truthOf(nums, ops), [nums, ops])
  const expr = nums.map((n, i) => `${fmtNum(n)}${i < ops.length ? ` ${ops[i]} ` : ''}`).join('')

  const reset = () => {
    setVals(nums)
    setIds(ops.map((_, i) => i))
    setSeq([])
    setLines([])
    setBad(false)
  }

  const tap = (p: number) => {
    if (bad) return
    const id = ids[p]
    const r = apply(vals[p], ops[id], vals[p + 1])
    const nv = [...vals]
    nv.splice(p, 2, r)
    const nid = ids.filter((_, i) => i !== p)
    const ns = [...seq, id]
    const line = `${fmtNum(vals[p])} ${ops[id]} ${fmtNum(vals[p + 1])} = ${fmtNum(r)}`
    const nl = [...lines, line]
    setVals(nv)
    setIds(nid)
    setSeq(ns)
    setLines(nl)
    if (!nid.length) {
      if (Math.abs(r - truth) < 1e-9) {
        onValid(ns.join(','), nl.map((l) => l.split(' = ')[0]).join(' → '), `${expr} = ${fmtNum(r)}`)
      } else {
        setBad(true)
        onWrong(r)
      }
    }
  }

  const tokenCls = `grid min-h-14 min-w-12 place-items-center rounded-2xl px-2 text-2xl font-black ${dark ? 'bg-slate-900/50 text-white' : 'bg-sky-50 text-blue-900'}`
  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-1.5" style={{ fontFamily: HAND }}>
        {vals.map((v, i) => (
          <div key={`${i}-${v}-${ids.length}`} className="flex items-center gap-1.5">
            <span className={`${tokenCls} animate-pop`}>{fmtNum(v)}</span>
            {i < ids.length && (
              <button type="button" onClick={() => tap(i)} disabled={bad} className="grid size-14 place-items-center rounded-full bg-amber-400 text-2xl font-black text-white shadow-[0_4px_0_#d97706] transition active:translate-y-0.5 active:shadow-[0_2px_0_#d97706] disabled:opacity-50" aria-label={`${ops[ids[i]]} işlemini yap`}>
                {ops[ids[i]]}
              </button>
            )}
          </div>
        ))}
      </div>
      {lines.length > 0 && (
        <ol className={`mt-3 space-y-1 rounded-2xl p-3 text-lg ${dark ? 'bg-slate-900/40' : 'bg-white ring-1 ring-sky-100'}`} style={{ fontFamily: HAND }}>
          {lines.map((l, i) => <li key={i} className={`animate-fade-up ${dark ? 'text-sky-200' : 'text-blue-900'}`}><span className="mr-2 text-sm opacity-60">{i + 1}.</span>{l}</li>)}
        </ol>
      )}
      {(bad || (more && seq.length === ops.length && found.includes(seq.join(',')))) && (
        <button type="button" onClick={reset} className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold ring-1 ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line'}`}>
          <RotateCcw size={17} />{bad ? 'Yeniden dene' : 'Başka bir sırayla dene'}
        </button>
      )}
    </div>
  )
}

/* ───────────────────────── Hata vakası ───────────────────────── */

type Phase = 'find' | 'why' | 'fix' | 'verify' | 'done'

function HuntCase({ c, grade, tier, lens, askStrategy, onDone, onCatch }: { c: Hunt; grade: Grade; tier: AgeTier; lens: boolean; askStrategy: boolean; onDone: (r: Result) => void; onCatch: () => void }) {
  const track = useTracker()
  const sols = useSolutions()
  const dark = tier === 'atolye'
  const [phase, setPhase] = useState<Phase>('find')
  const [sel, setSel] = useState<number | null>(null)
  const [caughtLine, setCaughtLine] = useState<number | null>(null)
  const [nudge, setNudge] = useState<{ q: string; k: number; tone?: 'ok' } | null>(null)
  const [findWrong, setFindWrong] = useState(0)
  const [whyWrong, setWhyWrong] = useState<number[]>([])
  const [fixWrong, setFixWrong] = useState(0)
  const [picked, setPicked] = useState<number[]>([]) // pick/verify: doğru seçilenler
  const [pickBad, setPickBad] = useState<number[]>([])
  const [input, setInput] = useState('')
  const [fixed, setFixed] = useState<string | null>(null)
  const [fixedNum, setFixedNum] = useState<number | undefined>(undefined)
  const [revealed, setRevealed] = useState(false)
  const [cleanOk, setCleanOk] = useState(false)
  const wrong = useRef(0)
  const logged = useRef(new Set<string>())
  const panelRef = useRef<HTMLDivElement>(null)
  const whyOrder = useMemo(() => shuffle(c.why.map((_, i) => i)), [c])
  const verifyOrder = useMemo(() => shuffle((c.verify?.opts ?? []).map((_, i) => i)), [c])
  const pickOrder = useMemo(() => (c.fix?.kind === 'pick' ? shuffle(c.fix.opts.map((_, i) => i)) : []), [c])
  const orderValidCount = useMemo(() => (c.fix?.kind === 'order' ? perms(c.fix.ops.length).filter((p) => c.fix?.kind === 'order' && Math.abs(runOrder(c.fix.nums, c.fix.ops, p) - truthOf(c.fix.nums, c.fix.ops)) < 1e-9).length : 0), [c])

  const say = (q: string, tone?: 'ok') => setNudge((n) => ({ q, k: (n?.k ?? 0) + 1, tone }))
  const miss = () => {
    wrong.current++
    track.attempt(false)
    sfx.bad()
  }
  const hit = () => {
    track.attempt(true)
    sfx.ok()
  }
  const logOnce = (t?: string) => {
    if (!t || logged.current.has(t)) return
    logged.current.add(t)
    track.misconception(t)
  }

  useEffect(() => {
    if (phase !== 'find' && window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [phase])

  const finish = () => {
    track.item(wrong.current === 0)
    setPhase('done')
    setNudge(null)
  }

  /* 1) bulma */
  const confirmLine = (i: number) => {
    if (c.bug?.includes(i)) {
      hit()
      onCatch()
      setCaughtLine(i)
      setSel(null)
      setNudge(null)
      setPhase('why')
      return
    }
    miss()
    setSel(null)
    setFindWrong((n) => n + 1)
    if (!c.bug) {
      logOnce(c.trap)
      say('Bu adımı bir daha hesapla: gerçekten hatalı mı? Bir de tahminle ya da ters işlemle kontrol et.')
    } else say(`Bu adım doğru görünüyor. ${c.hint}`)
  }
  const noError = () => {
    if (!c.bug) {
      hit()
      setCleanOk(true)
      setNudge(null)
      setPhase('verify')
      return
    }
    miss()
    setFindWrong((n) => n + 1)
    logOnce(c.mis)
    say(`Emin misin? Her adımı tek tek kontrol et. ${c.hint}`)
  }

  /* 2) neden */
  const pickWhy = (i: number) => {
    if (i === 0) {
      hit()
      setNudge(null)
      if (c.fix) setPhase('fix')
      else finish()
      return
    }
    miss()
    setWhyWrong((w) => [...w, i])
    logOnce(c.why[i].mis)
    say(c.why[i].q ?? 'Bu adımı tekrar oku. Öğrenci tam olarak neyi yanlış düşünmüş olabilir?')
  }

  /* 3) düzeltme */
  const checkNum = () => {
    if (c.fix?.kind !== 'num') return
    const v = parseNum(input)
    if (Number.isNaN(v)) return
    if (Math.abs(v - c.fix.ans) < 1e-9) {
      hit()
      sols.add(`${c.id}:${c.fix.ans}`, c.fix.tpl.replace('{?}', fmtNum(c.fix.ans)))
      setFixed(c.fix.tpl.replace('{?}', fmtNum(c.fix.ans)))
      setFixedNum(c.fix.ans)
      finish()
      return
    }
    miss()
    const n = fixWrong + 1
    setFixWrong(n)
    setInput('')
    if (n >= 3) {
      setRevealed(true)
      track.hint()
      setFixed(c.fix.tpl.replace('{?}', fmtNum(c.fix.ans)))
      setFixedNum(c.fix.ans)
      finish()
      return
    }
    say(n === 1 ? `${fmtNum(v)} olamaz. Sonucu tahminle kontrol et: makul bir sayı mı? ${c.hint}` : `Henüz değil. Adım adım yeniden yap: ${c.lesson.split('.')[0]}.`)
  }
  const pickFix = (i: number) => {
    if (c.fix?.kind !== 'pick') return
    if (c.fix.ok.includes(i)) {
      const firstOk = picked.length === 0
      setPicked((p) => [...p, i])
      sols.add(`${c.id}:${i}`, c.fix.opts[i])
      if (firstOk) {
        hit()
        setFixed(c.fix.result ?? c.fix.opts[i])
      }
      const left = c.fix.ok.length - picked.length - 1
      say(left > 0 ? `Doğru! Başka bir doğru yazım daha var (${left} tane). Bulabilir misin?` : 'Harika, bütün doğru yazımları buldun!', 'ok')
      return
    }
    miss()
    setPickBad((b) => [...b, i])
    say('Bu yazım hatayı sürdürüyor. İki tarafın değerini ayrı ayrı hesapla; eşit mi?')
  }
  const orderValid = (key: string, label: string, expr: string) => {
    const firstOk = !fixed
    if (sols.list.some((x) => x.key === `${c.id}:${key}`)) return say('Bu sırayı zaten buldun. Sonucu değiştirmeyen başka bir sıra var mı?', 'ok')
    sols.add(`${c.id}:${key}`, label)
    if (firstOk) {
      hit()
      setFixed(expr)
    }
    const left = orderValidCount - sols.list.length - 1
    say(left > 0 ? 'Doğru sıra! Sonucu değiştirmeyen başka bir sıra da var. Bulabilir misin?' : 'Doğru sıra! İşlemleri öncelik kuralına göre yaptın.', 'ok')
  }
  const orderWrong = (v: number) => {
    miss()
    setFixWrong((n) => n + 1)
    logOnce(c.why[1]?.mis)
    say(`Bu sırayla ${fmtNum(v)} çıktı. Hangi işlem önce yapılmalıydı? İşlemin anlamını düşün.`)
  }

  /* doğru çözümde kanıt */
  const pickVerify = (i: number) => {
    const v = c.verify!
    if (v.ok.includes(i)) {
      const firstOk = picked.length === 0
      setPicked((p) => [...p, i])
      sols.add(`${c.id}:v${i}`, v.opts[i].t)
      if (firstOk) hit()
      const left = v.ok.length - picked.length - 1
      say(left > 0 ? 'Güzel kanıt! Bir başka kanıt yolu daha var. Bulabilir misin?' : 'İki farklı yoldan kanıtladın!', 'ok')
      return
    }
    miss()
    setPickBad((b) => [...b, i])
    logOnce(v.opts[i].mis)
    say(v.opts[i].q ?? 'Bu kanıt çözümü gerçekten doğruluyor mu?')
  }

  const rowState = (i: number): RowState => {
    if (caughtLine === i) return fixed ? 'fixed' : 'caught'
    if (sel === i) return 'selected'
    return 'idle'
  }
  const hl = (sel ?? caughtLine) !== null ? (c.stepCol?.[(sel ?? caughtLine)!] ?? null) : null
  const canTap = phase === 'find'

  /* ── panel içeriği ── */
  let panel: ReactNode
  if (phase === 'find') {
    panel = (
      <Panel dark={dark} title={`${c.whoGen} çözümünde hata var mı?`} icon={<Search size={20} className="shrink-0 text-amber-500" />} panelRef={panelRef}>
        <p className={`mb-3 text-[15px] font-semibold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Her adımı kontrol et. Hatalı adıma dokun; bütün adımlar doğruysa “Hata yok!” de.</p>
        <div className="grid gap-2">
          <button type="button" disabled={sel === null} onClick={() => sel !== null && confirmLine(sel)} className="btn-primary min-h-14 text-lg">
            {lens ? <Search size={20} /> : <span aria-hidden>🐞</span>}
            {sel === null ? 'Önce bir adıma dokun' : `${sel + 1}. adımda hata var!`}
          </button>
          <button type="button" onClick={noError} className={`btn min-h-14 text-lg ring-2 ${dark ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/60' : 'bg-emerald-50 text-emerald-800 ring-emerald-300'}`}>
            <ThumbsUp size={20} />Hata yok!
          </button>
          {findWrong >= 1 && c.bug && (
            <button type="button" onClick={() => { track.hint(); say(c.hint) }} className={`btn min-h-12 ${dark ? 'bg-slate-700 text-white' : 'btn-ghost'}`}><Lightbulb size={18} />İpucu</button>
          )}
        </div>
      </Panel>
    )
  } else if (phase === 'why') {
    panel = (
      <Panel dark={dark} title={`Neden yanlış? ${c.who} ne düşünmüş olabilir?`} icon={<Lightbulb size={20} className="shrink-0 text-amber-500" />} panelRef={panelRef}>
        <div className="grid gap-2">
          {whyOrder.map((i) => (
            <Card key={i} text={c.why[i].t} dark={dark} state={whyWrong.includes(i) ? 'wrong' : whyWrong.length >= 2 && i === 0 ? 'glow' : 'idle'} onClick={() => pickWhy(i)} />
          ))}
        </div>
      </Panel>
    )
  } else if (phase === 'fix' && c.fix) {
    const f = c.fix
    panel = (
      <Panel dark={dark} title={f.kind === 'order' ? 'Düzelt: işlemleri doğru sırayla yap' : f.kind === 'pick' ? 'Düzelt' : 'Düzelt: doğrusunu yaz'} icon={<span aria-hidden>✏️</span>} panelRef={panelRef}>
        {f.kind === 'num' && (
          <div className="grid gap-3">
            <FixLine tpl={f.tpl} value={input} dark={dark} />
            <Keypad value={input} onChange={setInput} keys={KEYS(grade)} dark={dark} big={tier === 'mini'} />
            <button type="button" onClick={checkNum} disabled={Number.isNaN(parseNum(input))} className="btn-primary min-h-14 text-lg"><Check size={20} />Kontrol et</button>
          </div>
        )}
        {f.kind === 'pick' && (
          <div className="grid gap-2">
            <p className={`text-[15px] font-semibold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}><MathText text={f.prompt} /></p>
            {pickOrder.map((i) => (
              <Card key={i} big text={f.opts[i]} dark={dark} state={picked.includes(i) ? 'ok' : pickBad.includes(i) ? 'wrong' : 'idle'} onClick={() => pickFix(i)} />
            ))}
            {picked.length > 0 && <BigButton onClick={finish} className="mt-1 w-full">Devam<ArrowRight size={20} /></BigButton>}
          </div>
        )}
        {f.kind === 'order' && (
          <div className="grid gap-3">
            <p className={`text-[15px] font-semibold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Önce yapılacak işlemin düğmesine dokun. İki sayı birleşir ve yeni ifade oluşur.</p>
            <OrderFix nums={f.nums} ops={f.ops} dark={dark} onValid={orderValid} onWrong={orderWrong} found={sols.list.map((s) => s.key.split(':')[1])} more={orderValidCount > sols.list.length} />
            {fixed && <BigButton onClick={finish} className="w-full">Devam<ArrowRight size={20} /></BigButton>}
          </div>
        )}
        <Sol dark={dark} list={sols.list} goal={f.kind === 'pick' ? f.ok.length : f.kind === 'order' ? orderValidCount : undefined} />
      </Panel>
    )
  } else if (phase === 'verify' && c.verify) {
    panel = (
      <Panel dark={dark} title="Çözüm doğru! Nasıl emin olabiliriz?" icon={<ThumbsUp size={20} className="shrink-0 text-emerald-500" />} panelRef={panelRef}>
        <p className={`mb-2 text-[15px] font-semibold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Sonucu doğrulayan kanıtları seç. Birden çok kanıt olabilir!</p>
        <div className="grid gap-2">
          {verifyOrder.map((i) => (
            <Card key={i} text={c.verify!.opts[i].t} dark={dark} state={picked.includes(i) ? 'ok' : pickBad.includes(i) ? 'wrong' : 'idle'} onClick={() => pickVerify(i)} />
          ))}
          {picked.length > 0 && <BigButton onClick={finish} className="mt-1 w-full">Devam<ArrowRight size={20} /></BigButton>}
        </div>
        <Sol dark={dark} list={sols.list} goal={c.verify.ok.length} />
      </Panel>
    )
  } else {
    panel = (
      <Panel dark={dark} title={c.bug ? (revealed ? 'Birlikte düzelttik' : 'Hata yakalandı ve düzeltildi!') : 'Doğru çözüm kanıtlandı!'} icon={c.bug ? (lens ? <LensSvg size={26} /> : <BugSvg size={26} />) : <ThumbsUp size={20} className="text-emerald-500" />} panelRef={panelRef}>
        <div className={`rounded-2xl p-3 text-[15px] leading-relaxed font-bold sm:text-base ${dark ? 'bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-400/40' : 'bg-emerald-50 text-emerald-900'}`}>
          <MathText text={c.lesson} />
        </div>
        {askStrategy && <StrategyPicker question={c.bug ? 'Hatayı nasıl yakaladın?' : 'Çözümü nasıl kontrol ettin?'} options={['Adım adım kontrol ettim', 'Tahminle sınadım', 'Ters işlemle kontrol ettim', 'Modelle/çizimle düşündüm']} onPick={() => {}} />}
        <Sol dark={dark} list={sols.list} />
        <BigButton onClick={() => onDone({ first: wrong.current === 0, kind: c.bug ? 'error' : 'clean', ways: sols.list.length, revealed })} className="mt-3 w-full">
          Sonraki vaka<ArrowRight size={20} />
        </BigButton>
      </Panel>
    )
  }

  const pulseLine = phase === 'find' && c.bug && findWrong >= 3 ? c.bug[0] : null
  const fxKind = lens ? 'lens' : 'bug'
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <div>
        <Notebook
          tier={tier}
          owner={c.whoGen}
          face={c.face}
          problem={c.problem}
          stamp={cleanOk ? <Stamp tone="ok">✓ Doğru çözüm</Stamp> : phase === 'done' && c.bug ? <Stamp tone="ok">✓ Düzeltildi</Stamp> : null}
        >
          {c.col && <ColumnOp col={c.col} hl={hl} fixed={fixedNum} />}
          {c.steps.map((s, i) => (
            <StepRow
              key={i}
              n={i + 1}
              text={s}
              tier={tier}
              state={rowState(i)}
              pulse={pulseLine === i}
              onTap={canTap ? () => setSel(sel === i ? null : i) : undefined}
              fixText={caughtLine === i ? fixed ?? undefined : undefined}
              fx={caughtLine === i && phase !== 'done' && !fixed ? <CaughtFx kind={fxKind} /> : undefined}
              action={sel === i && canTap ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); confirmLine(i) }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-500 px-3 text-sm font-black text-white shadow-[0_3px_0_#be123c] animate-pop active:translate-y-0.5">
                  {lens ? <Search size={16} /> : <span aria-hidden>🐞</span>}Hata burada!
                </button>
              ) : undefined}
            />
          ))}
          <BlankLines tier={tier} count={c.col ? 1 : 2} />
        </Notebook>
        {phase === 'find' && (
          <p className={`mt-2 text-center text-sm font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Bir satıra dokununca seçilir; yeniden dokununca seçim kalkar.</p>
        )}
      </div>
      <div className="lg:sticky lg:top-20">
        {panel}
        {nudge && <Nudge key={nudge.k} question={nudge.q} tone={nudge.tone} onClose={() => setNudge(null)} />}
        {nudge && !nudge.tone && c.tool && <ModelButton tool={c.tool} config={c.toolConfig} dark={dark} />}
      </div>
    </div>
  )
}

/* ───────────────────────── Kim haklı? ───────────────────────── */

type DPhase = 'verdict' | 'reason' | 'common' | 'done'

function DuelCase({ d, tier, lens, onDone }: { d: Duel; tier: AgeTier; lens: boolean; onDone: (r: Result) => void }) {
  const track = useTracker()
  const sols = useSolutions()
  const dark = tier === 'atolye'
  const [phase, setPhase] = useState<DPhase>('verdict')
  const [badVerdict, setBadVerdict] = useState<string[]>([])
  const [badReason, setBadReason] = useState<number[]>([])
  const [badCommon, setBadCommon] = useState<number[]>([])
  const [nudge, setNudge] = useState<{ q: string; k: number; tone?: 'ok' } | null>(null)
  const wrong = useRef(0)
  const logged = useRef(new Set<string>())
  const panelRef = useRef<HTMLDivElement>(null)
  const reasonOrder = useMemo(() => shuffle(d.reasons.map((_, i) => i)), [d])
  const commonOrder = useMemo(() => shuffle((d.common?.opts ?? []).map((_, i) => i)), [d])

  const say = (q: string, tone?: 'ok') => setNudge((n) => ({ q, k: (n?.k ?? 0) + 1, tone }))
  const miss = () => {
    wrong.current++
    track.attempt(false)
    sfx.bad()
  }
  const logOnce = (t?: string) => {
    if (!t || logged.current.has(t)) return
    logged.current.add(t)
    track.misconception(t)
  }
  useEffect(() => {
    if (phase !== 'verdict' && window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [phase])

  const finish = () => {
    track.item(wrong.current === 0)
    setPhase('done')
  }

  const verdicts: { key: string; label: string }[] = [
    { key: 'a', label: `Yalnızca ${d.a.who} haklı` },
    { key: 'b', label: `Yalnızca ${d.b.who} haklı` },
    { key: 'both', label: 'İkisi de haklı' },
    { key: 'none', label: 'İkisi de haksız' },
  ]
  const pickVerdict = (k: string) => {
    if (k === d.verdict) {
      track.attempt(true)
      sfx.ok()
      setNudge(null)
      setPhase('reason')
      return
    }
    miss()
    setBadVerdict((b) => [...b, k])
    say(d.nudge)
  }
  const pickReason = (i: number) => {
    if (d.ok.includes(i)) {
      track.attempt(true)
      sfx.ok()
      setNudge(null)
      if (d.verdict === 'both' && d.common) {
        sols.add(`${d.id}:a`, d.a.method)
        sols.add(`${d.id}:b`, d.b.method)
        setPhase('common')
      } else finish()
      return
    }
    miss()
    setBadReason((b) => [...b, i])
    logOnce(d.reasons[i].mis)
    say(d.reasons[i].q ?? d.nudge)
  }
  const pickCommon = (i: number) => {
    if (i === d.common!.ok) {
      track.attempt(true)
      sfx.ok()
      setNudge(null)
      finish()
      return
    }
    miss()
    setBadCommon((b) => [...b, i])
    say('İki çözümün adımlarına yeniden bak. İkisinin de dayandığı fikir ne?')
  }

  const decided = phase !== 'verdict'
  const pageStamp = (side: 'a' | 'b') => {
    if (!decided) return null
    const right = d.verdict === 'both' || d.verdict === side
    return <Stamp bottom tone={right ? 'ok' : 'bad'}>{right ? '✓ Doğru yol' : '✗ Hatalı'}</Stamp>
  }

  let panel: ReactNode
  if (phase === 'verdict') {
    panel = (
      <Panel dark={dark} title="Kim haklı?" icon={<span aria-hidden>⚖️</span>} panelRef={panelRef}>
        <p className={`mb-3 text-[15px] font-semibold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{d.a.who} ile {d.b.who} aynı soruyu farklı yollarla çözdü. İki çözümü de adım adım incele.</p>
        <div className="grid gap-2">
          {verdicts.map((v) => <Card key={v.key} big text={v.label} dark={dark} state={badVerdict.includes(v.key) ? 'wrong' : 'idle'} onClick={() => pickVerdict(v.key)} />)}
        </div>
      </Panel>
    )
  } else if (phase === 'reason') {
    panel = (
      <Panel dark={dark} title="Neden? Gerekçeni seç." icon={<Lightbulb size={20} className="shrink-0 text-amber-500" />} panelRef={panelRef}>
        <div className="grid gap-2">
          {reasonOrder.map((i) => <Card key={i} text={d.reasons[i].t} dark={dark} state={badReason.includes(i) ? 'wrong' : 'idle'} onClick={() => pickReason(i)} />)}
        </div>
      </Panel>
    )
  } else if (phase === 'common' && d.common) {
    panel = (
      <Panel dark={dark} title="İki farklı yol, aynı sonuç! Ortak fikir ne?" icon={<span aria-hidden>🤝</span>} panelRef={panelRef}>
        <div className="grid gap-2">
          {commonOrder.map((i) => <Card key={i} text={d.common!.opts[i]} dark={dark} state={badCommon.includes(i) ? 'wrong' : 'idle'} onClick={() => pickCommon(i)} />)}
        </div>
        <Sol dark={dark} list={sols.list} />
      </Panel>
    )
  } else {
    panel = (
      <Panel dark={dark} title="Vaka kapandı!" icon={lens ? <LensSvg size={26} /> : <BugSvg size={26} />} panelRef={panelRef}>
        <div className={`rounded-2xl p-3 text-[15px] leading-relaxed font-bold sm:text-base ${dark ? 'bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-400/40' : 'bg-emerald-50 text-emerald-900'}`}>
          <MathText text={d.lesson} />
        </div>
        <StrategyPicker question="Bu soruyu sen hangi yolla çözerdin?" options={[d.a.method, d.b.method, 'Başka bir yolla']} onPick={() => {}} />
        <Sol dark={dark} list={sols.list} />
        <BigButton onClick={() => onDone({ first: wrong.current === 0, kind: 'duel', ways: sols.list.length, revealed: false })} className="mt-3 w-full">
          Oyunu bitir<ArrowRight size={20} />
        </BigButton>
      </Panel>
    )
  }

  const page = (side: 'a' | 'b') => {
    const s = d[side]
    return (
      <Notebook tier={tier} owner={genName(s.who)} face={s.face} stamp={pageStamp(side)} compact>
        <p className="mb-1 pl-12 text-[11px] font-black tracking-wide text-slate-400 uppercase">{s.method}</p>
        {s.steps.map((t, i) => <StepRow key={i} n={i + 1} text={t} tier={tier} state="idle" compact />)}
        <BlankLines tier={tier} count={1} compact />
      </Notebook>
    )
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <div>
        <div className={`mb-3 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-black ${dark ? 'bg-slate-800 text-white ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'}`}>
          <span aria-hidden className="text-xl">⚖️</span>
          <span><MathText text={d.problem} /></span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {page('a')}
          {page('b')}
        </div>
      </div>
      <div className="lg:sticky lg:top-20">
        {panel}
        {nudge && <Nudge key={nudge.k} question={nudge.q} tone={nudge.tone} onClose={() => setNudge(null)} />}
      </div>
    </div>
  )
}
