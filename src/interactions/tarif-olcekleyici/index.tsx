import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Minus, Plus, RotateCcw, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'
import { ZoomBox } from '../../interactive/ZoomBox'
import { ek } from '../../lib/generators'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, Header, NextButton, Nudge, Prompt, Split, fmt, mixed, near, pick, rng, useChecks } from '../yuzde-boyama/ortak'

/**
 * 43. Tarif Ölçekleyici (5–7)
 *  - table:  Oran tablosu ↔ çift sayı doğrusu (canlı bağlı). Sütun seç → ×2, ÷2, … ya da iki sütunu topla.
 *            Hedef kişi sayısına farklı yollarla ulaş: birim oran (1 kişi), parça parça büyütme, çarpma.
 *            “İkisine de +2” tuzağı sayı doğrusunda eğri bir çizgiyle oranın bozulduğunu gösterir.
 *  - cups:   kesirli miktarlar: ölçü bardaklarını parmakla doldur (¼ ya da ⅓ çizgileri).
 *  - recipe: tüm tarifi yeni kişi sayısına uyarla.
 *  - error:  “Her malzemeye 2 ekledim” yanılgısını değerlendir.
 */

type Col = { p: number; a: number; op?: string; from?: number[]; bad?: boolean }
type Ing = { name: string; emoji: string; amt: number; unit: string; step: number }
type Task =
  | { kind: 'table'; dish: string; emoji: string; base: { p: number; a: number }; target: number; ing: string; unit: string; goal: number }
  | { kind: 'cups'; dish: string; emoji: string; base: { p: number; a: number }; target: number; ing: string; div: 3 | 4 }
  | { kind: 'recipe'; dish: string; emoji: string; p: number; target: number; ings: Ing[] }
  | { kind: 'error'; dish: string; p: number; target: number }

const C_P = '#7c3aed', C_A = '#ea580c'

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  const kurabiye: Ing[] = [
    { name: 'un', emoji: '🌾', amt: 2, unit: 'su bardağı', step: 0.25 },
    { name: 'şeker', emoji: '🍬', amt: 0.5, unit: 'su bardağı', step: 0.25 },
    { name: 'yumurta', emoji: '🥚', amt: 2, unit: 'adet', step: 1 },
    { name: 'tereyağı', emoji: '🧈', amt: 100, unit: 'g', step: 25 },
  ]
  const krep: Ing[] = [
    { name: 'süt', emoji: '🥛', amt: 1.5, unit: 'su bardağı', step: 0.25 },
    { name: 'un', emoji: '🌾', amt: 1, unit: 'su bardağı', step: 0.25 },
    { name: 'yumurta', emoji: '🥚', amt: 2, unit: 'adet', step: 1 },
    { name: 'tuz', emoji: '🧂', amt: 0.5, unit: 'çay kaşığı', step: 0.25 },
  ]
  if (grade === 5)
    return [
      { kind: 'table', dish: 'Kurabiye', emoji: '🍪', base: { p: 4, a: 2 }, target: 8, ing: 'un', unit: 'su bardağı', goal: 2 },
      { kind: 'table', dish: 'Krep', emoji: '🥞', base: { p: 4, a: 6 }, target: 6, ing: 'yumurta', unit: 'adet', goal: 2 },
      { kind: 'cups', dish: 'Puding', emoji: '🍮', base: { p: 2, a: 0.5 }, target: 6, ing: 'şeker', div: 4 },
      { kind: 'recipe', dish: 'Kurabiye', emoji: '🍪', p: 4, target: pick([8, 2], r), ings: kurabiye },
      { kind: 'error', dish: 'Krep', p: 4, target: 6 },
      { kind: 'cups', dish: 'Sütlaç', emoji: '🥣', base: { p: 4, a: 1.5 }, target: 2, ing: 'pirinç', div: 4 },
    ]
  if (grade === 6)
    return [
      { kind: 'table', dish: 'Kurabiye', emoji: '🍪', base: { p: 4, a: 2 }, target: 6, ing: 'un', unit: 'su bardağı', goal: 2 },
      { kind: 'table', dish: 'Mercimek çorbası', emoji: '🍲', base: { p: 6, a: 2 }, target: 15, ing: 'mercimek', unit: 'su bardağı', goal: 2 },
      { kind: 'cups', dish: 'Krep', emoji: '🥞', base: { p: 4, a: 1.5 }, target: 6, ing: 'süt', div: 4 },
      { kind: 'recipe', dish: 'Krep', emoji: '🥞', p: 4, target: 6, ings: krep },
      { kind: 'error', dish: 'Krep', p: 4, target: 6 },
      { kind: 'cups', dish: 'Puding', emoji: '🍮', base: { p: 4, a: 0.5 }, target: 10, ing: 'şeker', div: 4 },
    ]
  return [
    { kind: 'table', dish: 'Mercimek çorbası', emoji: '🍲', base: { p: 6, a: 4 }, target: 15, ing: 'mercimek', unit: 'su bardağı', goal: 2 },
    { kind: 'table', dish: 'Pilav', emoji: '🍚', base: { p: 4, a: 3 }, target: 10, ing: 'pirinç', unit: 'su bardağı', goal: 2 },
    { kind: 'cups', dish: 'Kek', emoji: '🍰', base: { p: 4, a: 2 / 3 }, target: 10, ing: 'süt', div: 3 },
    { kind: 'recipe', dish: 'Krep', emoji: '🥞', p: 4, target: 10, ings: krep },
    { kind: 'error', dish: 'Kurabiye', p: 4, target: 6 },
    { kind: 'cups', dish: 'Krep', emoji: '🥞', base: { p: 4, a: 1.5 }, target: 10, ing: 'süt', div: 4 },
  ]
}

const titleOf = (t: Task) => (t.kind === 'table' ? 'Oran tablosu' : t.kind === 'cups' ? 'Ölçü bardakları' : t.kind === 'recipe' ? 'Bütün tarif' : 'Hata dedektifi')

export default function TarifOlcekleyici({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const task = tasks[idx]
  const last = idx === tasks.length - 1
  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor((f + Math.min(1, sol.list.length * 0.25)) / tasks.length),
      summary: `${tasks.length} tarifi ölçekledin ve ${sol.list.length} farklı çözüm yolu buldun.`,
      insight:
        grade === 5
          ? 'Tarifi büyütmek için her malzemeyi aynı sayıyla çarparız; yarıya indirip sonra toplamak da işe yarar. Her malzemeye aynı sayıyı eklemek tarifi bozar.'
          : grade === 6
            ? 'Oran tablosunda bir sütunu çarpabilir, bölebilir ya da iki sütunu toplayabiliriz; 1 kişilik miktarı (birim oran) bulmak her hedefe giden yolu açar.'
            : 'Birim oran (1 kişiye düşen miktar) kesirli olsa da işe yarar: 6 kişi 4 bardak ise 1 kişi [[2/3]] bardak, 15 kişi 10 bardak. Çift sayı doğrusunda eşdeğer çiftler hep aynı dikey çizgide durur.',
    })
  }
  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const c = { grade, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="🧁" kicker="Tarif" title={titleOf(task)} idx={idx} total={tasks.length} dark={grade >= 7} />
      {task.kind === 'table' && <TableTask key={idx} t={task} {...c} />}
      {task.kind === 'cups' && <CupsTask key={idx} t={task} {...c} />}
      {task.kind === 'recipe' && <RecipeTask key={idx} t={task} {...c} />}
      {task.kind === 'error' && <ErrorTask key={idx} t={task} {...c} />}
    </Scene>
  )
}

type Common = { grade: Grade; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions> }

const Amt = ({ v, className = '' }: { v: number; className?: string }) => <MathText className={className} text={mixed(v)} />

function RecipeCard({ emoji, dish, p, children }: { emoji: string; dish: string; p: number; children: ReactNode }) {
  return (
    <div className="relative rounded-2xl bg-[#fffaf0] p-3 text-ink shadow-sm ring-1 ring-amber-200 [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_27px,#f5e6c8_28px)]">
      <p className="flex items-center gap-2 text-lg font-black"><span className="text-2xl">{emoji}</span>{dish} <span className="ml-auto rounded-full bg-violet-100 px-2.5 py-0.5 text-sm text-violet-800">{p} kişilik</span></p>
      <div className="mt-1.5 text-base font-extrabold">{children}</div>
    </div>
  )
}

/* ───────────────────────── 1. oran tablosu + çift sayı doğrusu ───────────────────────── */

function pathType(cols: Col[], i: number): { key: string; label: string } {
  const seen = new Set<number>()
  let unit = false, sum = false
  const walk = (k: number) => {
    if (seen.has(k)) return
    seen.add(k)
    const c = cols[k]
    if (c.p === 1) unit = true
    if (c.op === 'Topla' || c.op === 'Çıkar') sum = true
    c.from?.forEach(walk)
  }
  walk(i)
  if (unit) return { key: 'unit', label: 'Birim oran: önce 1 kişi' }
  if (sum) return { key: 'sum', label: 'Parça parça: sütunları topladım' }
  return { key: 'mul', label: 'Çarparak / bölerek' }
}

function DoubleLine({ cols, base, target, ing, unit }: { cols: Col[]; base: { p: number; a: number }; target: number; ing: string; unit: string }) {
  const W = 520, x0 = 26, x1 = W - 22, yT = 50, yB = 132
  const maxP = Math.max(target, ...cols.map((c) => c.p)) * 1.1
  const rate = base.a / base.p
  const X = (p: number) => x0 + (p / maxP) * (x1 - x0)
  const XA = (a: number) => x0 + (a / (maxP * rate)) * (x1 - x0)
  return (
    <svg viewBox={`0 0 ${W} 176`} className="block w-full" role="img" aria-label="Çift sayı doğrusu">
      <text x={x0} y={18} fontSize={16} fontWeight={900} fill={C_P}>Kişi</text>
      <text x={x0} y={172} fontSize={16} fontWeight={900} fill={C_A}>{ing[0].toLocaleUpperCase('tr') + ing.slice(1)} ({unit})</text>
      {[yT, yB].map((y, i) => (
        <g key={i}>
          <line x1={x0} x2={x1} y1={y} y2={y} stroke="#1f2340" strokeWidth={3} />
          <path d={`M${x1} ${y - 6} L${x1 + 10} ${y} L${x1} ${y + 6}`} fill="#1f2340" />
        </g>
      ))}
      <line x1={X(target)} x2={X(target)} y1={yT - 22} y2={yT + 6} stroke={C_P} strokeWidth={2} strokeDasharray="4 4" />
      <text x={X(target)} y={yT - 26} textAnchor="middle" fontSize={12} fontWeight={900} fill={C_P}>hedef</text>
      <g>
        <line x1={X(0)} x2={X(0)} y1={yT - 9} y2={yB + 9} stroke="#1f2340" strokeWidth={2} />
        <text x={X(0)} y={yT - 13} textAnchor="middle" fontSize={17} fontWeight={900}>0</text>
        <text x={X(0)} y={yB + 26} textAnchor="middle" fontSize={17} fontWeight={900}>0</text>
      </g>
      {cols.map((c, i) => (
        <g key={i} style={{ transition: 'opacity 300ms' }}>
          <line x1={X(c.p)} x2={XA(c.a)} y1={yT} y2={yB} stroke={c.bad ? '#e11d48' : '#16a34a'} strokeWidth={c.bad ? 3 : 2} strokeDasharray={c.bad ? '0' : '6 4'} />
          <line x1={X(c.p)} x2={X(c.p)} y1={yT - 9} y2={yT + 9} stroke={C_P} strokeWidth={3} />
          <line x1={XA(c.a)} x2={XA(c.a)} y1={yB - 9} y2={yB + 9} stroke={c.bad ? '#e11d48' : C_A} strokeWidth={3} />
          <text x={X(c.p)} y={yT - 13} textAnchor="middle" fontSize={17} fontWeight={900} fill={C_P}>{fmt(c.p)}</text>
          <text x={XA(c.a)} y={yB + 26} textAnchor="middle" fontSize={17} fontWeight={900} fill={c.bad ? '#e11d48' : C_A}>{fmt(c.a)}</text>
        </g>
      ))}
    </svg>
  )
}

function TableTask({ t, footer, onSolved, sol, grade }: { t: Extract<Task, { kind: 'table' }> } & Common) {
  const start: Col[] = [{ p: t.base.p, a: t.base.a }]
  const [cols, setCols] = useState<Col[]>(start)
  const [sel, setSel] = useState<number[]>([0])
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [mine, setMine] = useState<string[]>([])
  const [found, setFound] = useState(false)
  const chk = useChecks()
  const track = useTracker()
  const one = sel.length === 1 ? cols[sel[0]] : null
  const add = (c: Col) => {
    if (cols.length >= 9) {
      setFb({ ok: false, text: 'Tablo doldu. “Baştan” ile yeni bir yol dene.' })
      return
    }
    if (cols.some((x) => near(x.p, c.p) && near(x.a, c.a))) {
      setSel([cols.findIndex((x) => near(x.p, c.p) && near(x.a, c.a))])
      return
    }
    const next = [...cols, c]
    setCols(next)
    setSel([next.length - 1])
    if (c.bad) {
      chk.fail()
      setFb({ ok: false, text: `Kişi sayısına ${c.op?.replace('+', '')} ekledin, ${t.ing} miktarına da. Sayı doğrusuna bak: yeni çift eğri bir çizgiyle bağlandı. ${t.base.p} kişiye ${mixed(t.base.a)} ${t.unit} gidiyorsa, eklediğin ${c.op?.replace('+', '')} kişiye de ${c.op?.replace('+', '')} ${t.unit} mı gider?`, mis: 'Tarifi ölçeklerken iki niceliğe aynı sayıyı ekledi (toplamsal düşünme)' })
      return
    }
    setFb(null)
    if (near(c.p, t.target)) {
      if (chainBad(next, next.length - 1)) {
        chk.fail()
        setFb({ ok: false, text: 'Bu sütun, kırmızı (bozuk) bir sütundan türedi. Oranı koruyan sütunlardan yeniden dene.' })
        return
      }
      const pt = pathType(next, next.length - 1)
      const isNew = !mine.includes(pt.key)
      if (isNew) {
        setMine((m) => [...m, pt.key])
        sol.add(`${t.dish}-${pt.key}`, pt.label)
      }
      if (!found) {
        setFound(true)
        onSolved(chk.pass())
      }
      setFb({ ok: true, text: `${t.target} kişi için ${mixed(c.a)} ${t.unit} ${t.ing}! ${isNew ? `Yolun: “${pt.label}”.` : 'Bu yolu daha önce bulmuştun.'} ${mine.length + (isNew ? 1 : 0) < t.goal ? 'Başka bir yolla da ulaşabilir misin? “Baştan” de.' : ''}` })
    }
  }
  const chainBad = (cs: Col[], i: number): boolean => !!cs[i].bad || !!cs[i].from?.some((k) => chainBad(cs, k))
  const op = (label: string, f: (c: Col) => Col | null) => {
    if (!one) return
    const r = f(one)
    if (!r) return
    add({ ...r, op: label, from: [sel[0]], bad: r.bad || one.bad })
  }
  const canDiv = (k: number) => !!one && Number.isInteger(one.p / k)
  const tapCol = (i: number) => {
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length >= 2 ? [s[1], i] : [...s, i]))
  }
  const sumOp = (minus: boolean) => {
    if (sel.length !== 2) return
    const [A, B] = sel.map((i) => cols[i])
    const c = minus ? { p: Math.abs(A.p - B.p), a: Math.abs(A.a - B.a) } : { p: A.p + B.p, a: A.a + B.a }
    if (c.p <= 0) return
    add({ ...c, op: minus ? 'Çıkar' : 'Topla', from: [...sel], bad: A.bad || B.bad })
  }
  const reset = () => {
    setCols(start)
    setSel([0])
    setFb(null)
    track.hint()
  }
  const opBtn = (label: string, on: () => void, disabled?: boolean, tone: 'mul' | 'add' | 'trap' = 'mul') => (
    <button key={label} type="button" onClick={on} disabled={disabled} className={`min-h-12 min-w-14 rounded-xl px-3 text-lg font-black ring-1 transition active:scale-95 disabled:opacity-30 ${tone === 'trap' ? 'bg-rose-50 text-rose-800 ring-rose-200' : tone === 'add' ? 'bg-sky-50 text-sky-900 ring-sky-200' : 'bg-violet-50 text-violet-900 ring-violet-200'}`}>
      {label}
    </button>
  )
  return (
    <Split
      work={
        <div className="rounded-3xl bg-white/95 p-3 text-ink shadow-sm ring-1 ring-line">
          <div className="overflow-x-auto pb-1">
            <table className="border-separate border-spacing-1.5 text-center">
              <tbody>
                <tr>
                  <th className="sticky left-0 z-10 bg-white pr-1 text-left text-sm font-black" style={{ color: C_P }}>Kişi</th>
                  {cols.map((c, i) => (
                    <td key={i} className="p-0" rowSpan={1}>
                      <button type="button" onClick={() => tapCol(i)} className={`h-14 w-16 rounded-t-xl text-xl font-black tabular-nums ring-2 transition ${sel.includes(i) ? 'bg-violet-600 text-white ring-violet-700' : c.bad ? 'bg-rose-50 text-rose-800 ring-rose-300' : near(c.p, t.target) ? 'bg-emerald-50 text-emerald-800 ring-emerald-400' : 'bg-violet-50 text-violet-900 ring-violet-200'}`} aria-pressed={sel.includes(i)} aria-label={`${c.p} kişi sütunu`}>
                        {fmt(c.p)}
                      </button>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-10 bg-white pr-1 text-left text-sm font-black" style={{ color: C_A }}>{t.ing[0].toLocaleUpperCase('tr') + t.ing.slice(1)}<span className="block text-[10px] text-ink-soft">{t.unit}</span></th>
                  {cols.map((c, i) => (
                    <td key={i} className="p-0">
                      <button type="button" onClick={() => tapCol(i)} className={`grid h-14 w-16 place-items-center rounded-b-xl text-xl font-black tabular-nums ring-2 transition ${sel.includes(i) ? 'bg-orange-500 text-white ring-orange-600' : c.bad ? 'bg-rose-50 text-rose-800 ring-rose-300' : 'bg-orange-50 text-orange-900 ring-orange-200'}`} aria-label={`${fmt(c.a)} ${t.unit}`}>
                        <Amt v={c.a} />
                      </button>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td />
                  {cols.map((c, i) => <td key={i} className="text-xs font-black text-ink-soft">{i === 0 ? 'tarif' : c.op}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-black tracking-wide text-ink-soft uppercase">{one ? `${fmt(one.p)} kişi sütunu:` : sel.length === 2 ? 'İki sütun:' : 'Bir sütun seç'}</span>
            {sel.length === 2 ? (
              <>
                {opBtn('Topla', () => sumOp(false), false, 'add')}
                {opBtn('Çıkar', () => sumOp(true), false, 'add')}
              </>
            ) : (
              <>
                {opBtn('×2', () => op('×2', (c) => ({ p: c.p * 2, a: c.a * 2 })), !one)}
                {opBtn('×3', () => op('×3', (c) => ({ p: c.p * 3, a: c.a * 3 })), !one)}
                {opBtn('×5', () => op('×5', (c) => ({ p: c.p * 5, a: c.a * 5 })), !one)}
                {opBtn('÷2', () => op('÷2', (c) => ({ p: c.p / 2, a: c.a / 2 })), !canDiv(2))}
                {opBtn('÷3', () => op('÷3', (c) => ({ p: c.p / 3, a: c.a / 3 })), !canDiv(3))}
                {grade >= 6 && one && one.p > 3 && opBtn(`÷${one.p}`, () => op(`÷${one.p}`, (c) => ({ p: 1, a: c.a / c.p })))}
                {opBtn('ikisine +2', () => op('+2', (c) => ({ p: c.p + 2, a: c.a + 2, bad: true })), !one, 'trap')}
              </>
            )}
          </div>
          <p className="mt-1 text-xs font-bold text-ink-soft">İki sütuna dokunursan onları toplayabilir ya da çıkarabilirsin.</p>
          <div className="mt-3 rounded-2xl bg-slate-50 p-1 ring-1 ring-line">
            <ZoomBox controls>
              <DoubleLine cols={cols} base={t.base} target={t.target} ing={t.ing} unit={t.unit} />
            </ZoomBox>
          </div>
        </div>
      }
      panel={
        <>
          <RecipeCard emoji={t.emoji} dish={t.dish} p={t.base.p}>
            <MathText text={mixed(t.base.a)} /> {t.unit} {t.ing}
          </RecipeCard>
          <Prompt step="Ölçekle"><b className="text-violet-700">{t.target} kişi</b> için kaç {t.unit} {t.ing} gerekir? Tabloda {t.target} kişilik sütunu oluştur.</Prompt>
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool={grade >= 7 ? 'ciftdogru' : 'orantablosu'} />)}
          <button type="button" onClick={reset} className="btn-ghost min-h-12"><RotateCcw size={18} />Baştan (başka yol)</button>
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`${t.dish}-`))} goal={t.goal} />
          {found && mine.length >= t.goal && <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-black text-amber-900 ring-1 ring-amber-200"><Sparkles size={18} />İki farklı yol, aynı cevap: oran korundukça hangi yoldan gidersen git aynı yere varırsın.</p>}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. ölçü bardakları ───────────────────────── */

function Cups({ value, onChange, div, max = 4, disabled }: { value: number; onChange: (v: number) => void; div: number; max?: number; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (cx: number, cy: number, first: boolean) => {
    const el = ref.current
    if (!el) return
    const kids = [...el.querySelectorAll<HTMLElement>('[data-cup]')]
    const i = kids.findIndex((k) => {
      const r = k.getBoundingClientRect()
      return cx >= r.left - 4 && cx <= r.right + 4
    })
    if (i < 0) return
    const r = kids[i].querySelector('svg')!.getBoundingClientRect()
    const rel = 1 - (cy - (r.top + r.height * 0.14)) / (r.height * 0.8)
    let lv = Math.ceil(Math.min(1, Math.max(0, rel)) * div - 0.15) / div
    lv = Math.max(lv, 0)
    let v = i + lv
    if (first && near(v, value) && lv > 0) v -= 1 / div
    if (!near(v, value)) onChange(Math.max(0, Math.round(v * div) / div))
  }
  const bind = useDrag(({ xy: [x, y], first, event }) => {
    if (disabled) return
    event.preventDefault()
    set(x, y, first)
  }, { filterTaps: false })
  return (
    <div ref={ref} {...bind()} className="flex touch-none justify-center gap-2 select-none sm:gap-3">
      {Array.from({ length: max }, (_, i) => {
        const f = Math.max(0, Math.min(1, value - i))
        return (
          <div key={i} data-cup className="w-[22%] max-w-28">
            <svg viewBox="0 0 100 130" className="block w-full" aria-hidden>
              <path d="M14 14 L86 14 L80 116 Q80 124 72 124 L28 124 Q20 124 20 116 Z" fill="#f8fafc" stroke="#475569" strokeWidth="4" strokeLinejoin="round" />
              <clipPath id={`cup${i}`}><path d="M16 16 L84 16 L78 115 Q78 122 72 122 L28 122 Q22 122 22 115 Z" /></clipPath>
              <rect x="0" width="100" fill="#fbbf24" clipPath={`url(#cup${i})`} style={{ y: 122 - 104 * f, height: 104 * f, transition: 'y 200ms, height 200ms' } as React.CSSProperties} />
              {Array.from({ length: div - 1 }, (_, k) => {
                const y = 122 - (104 * (k + 1)) / div
                return (
                  <g key={k}>
                    <line x1="22" x2="44" y1={y} y2={y} stroke="#334155" strokeWidth="3" />
                    <text x="48" y={y + 5} fontSize="14" fontWeight="900" fill="#334155">{k + 1}/{div}</text>
                  </g>
                )
              })}
              <text x="50" y="10" textAnchor="middle" fontSize="11" fontWeight="900" fill="#64748b">{i + 1}. bardak</text>
            </svg>
          </div>
        )
      })}
    </div>
  )
}

function CupsTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'cups' }> } & Common) {
  const [v, setV] = useState(0)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const ans = (t.base.a * t.target) / t.base.p
  const step = 1 / t.div
  const unitAmt = t.base.a / t.base.p
  const check = () => {
    if (near(v, ans, 1e-6)) {
      onSolved(chk.pass())
      setDone(true)
      setFb({ ok: true, text: `Evet! ${t.target} kişi için ${mixed(ans)} su bardağı ${t.ing}.` })
      return
    }
    chk.fail()
    if (near(v, t.base.a + (t.target - t.base.p))) setFb({ ok: false, text: `Kişi sayısı ${t.target - t.base.p > 0 ? 'arttı' : 'azaldı'} diye ${t.ing} miktarına da ${Math.abs(t.target - t.base.p)} bardak ${t.target > t.base.p ? 'ekledin' : 'çıkardın'}. Ama her kişiye 1 bardak mı düşüyor? ${t.base.p} kişiye ${mixed(t.base.a)} bardak ise ${t.base.p / 2 === Math.floor(t.base.p / 2) ? `${t.base.p / 2} kişiye ne kadar düşer?` : '1 kişiye ne kadar düşer?'}`, mis: 'Tarifi ölçeklerken kişi farkı kadar malzeme ekledi (toplamsal düşünme)' })
    else setFb({ ok: false, text: v > ans ? `Biraz fazla. ${t.target} kişi, ${t.base.p} kişinin kaç katı? Önce ${t.base.p} kişinin yarısı için ne gerektiğini bulmayı dene.` : `Biraz eksik. ${t.base.p} kişilik miktarı bardaklarda kaç kez tekrar etmen gerekir? Yarım tarif de işe yarar.` })
  }
  return (
    <Split
      work={
        <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-white p-3 shadow-sm ring-1 ring-amber-200">
          <p className="mb-2 text-center text-sm font-black text-amber-900">Bardağa dokun ya da parmağını yukarı-aşağı kaydır: doluluk çizgilere yapışır.</p>
          <Cups value={v} onChange={(x) => { setV(x); setFb(null) }} div={t.div} disabled={done} />
          <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" disabled={done} onClick={() => setV(Math.max(0, Math.round((v - step) * t.div) / t.div))} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Azalt"><Minus size={20} /></button>
            <span className="min-w-36 rounded-2xl bg-amber-400 px-4 py-2 text-center text-2xl font-black text-amber-950"><Amt v={v} /> <span className="text-sm">bardak</span></span>
            <button type="button" disabled={done} onClick={() => setV(Math.min(4, Math.round((v + step) * t.div) / t.div))} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Artır"><Plus size={20} /></button>
          </div>
          {done && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-center text-base font-extrabold ring-1 ring-line">
              <p>1 kişi → <Amt v={unitAmt} /> bardak</p>
              <p className="mt-1">{t.target} kişi → {t.target} × <Amt v={unitAmt} /> = <Amt v={ans} /> bardak</p>
            </div>
          )}
        </div>
      }
      panel={
        <>
          <RecipeCard emoji={t.emoji} dish={t.dish} p={t.base.p}><MathText text={mixed(t.base.a)} /> su bardağı {t.ing}</RecipeCard>
          <Prompt step="Doldur"><b className="text-violet-700">{t.target} kişi</b> için kaç su bardağı {t.ing} gerekir? Ölçü bardaklarını doldur.</Prompt>
          {!done && <CheckButton onClick={check} disabled={v === 0} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool={grade >= 6 ? 'orantablosu' : 'fractions'} />)}
          {done && <StrategyPicker question="Nasıl buldun?" options={['1 kişilik miktarı buldum', 'Yarım tarifi buldum, topladım', 'Kaç katı olduğunu bulup çarptım', 'Bardakları doldurarak denedim']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. bütün tarif ───────────────────────── */

function RecipeTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'recipe' }> } & Common) {
  const [vals, setVals] = useState<number[]>(t.ings.map((i) => i.amt))
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const [marks, setMarks] = useState<boolean[] | null>(null)
  const chk = useChecks()
  const k = t.target / t.p
  const goal = t.ings.map((i) => i.amt * k)
  const check = () => {
    const ok = vals.map((v, i) => near(v, goal[i]))
    setMarks(ok)
    if (ok.every(Boolean)) {
      onSolved(chk.pass())
      setDone(true)
      setFb({ ok: true, text: `Tarif ${t.target} kişilik oldu! Her malzeme ${k === 0.5 ? 'yarıya indi' : `${mixed(k)} katına çıktı`}.` })
      return
    }
    chk.fail()
    const d = t.target - t.p
    const addIdx = vals.findIndex((v, i) => !ok[i] && near(v, t.ings[i].amt + d))
    const wrong = t.ings[ok.indexOf(false)]
    if (addIdx >= 0) setFb({ ok: false, text: `${t.ings[addIdx].name[0].toLocaleUpperCase('tr') + t.ings[addIdx].name.slice(1)} miktarına ${Math.abs(d)} ${d > 0 ? 'ekledin' : 'çıkardın'}. Kişi sayısı ${Math.abs(d)} değişti diye her malzeme ${Math.abs(d)} birim mi değişir? Tarif kaç katına çıkıyor?`, mis: 'Tarifi ölçeklerken her malzemeye aynı sayıyı ekledi' })
    else setFb({ ok: false, text: `Yeşil olanlar doğru. ${wrong.name[0].toLocaleUpperCase('tr') + wrong.name.slice(1)} için: ${t.p} kişiye ${mixed(wrong.amt)} ${wrong.unit} ise ${t.target} kişiye ne kadar? ${t.target} kişi, ${ek(t.p, 'gen')} kaç katı?` })
  }
  return (
    <Split
      work={
        <div className="rounded-3xl bg-white/95 p-3 text-ink shadow-sm ring-1 ring-line">
          <div className="mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-1 text-xs font-black tracking-wide text-ink-soft uppercase">
            <span>Malzeme</span><span className="w-16 text-center">{t.p} kişi</span><span className="w-44 text-center">{t.target} kişi</span>
          </div>
          <div className="space-y-2">
            {t.ings.map((g, i) => {
              const st = marks && !done ? (marks[i] ? 'ring-emerald-400 bg-emerald-50' : 'ring-amber-300 bg-amber-50') : done ? 'ring-emerald-400 bg-emerald-50' : 'ring-line bg-white'
              return (
                <div key={g.name} className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-3 rounded-2xl p-2 ring-2 transition ${st}`}>
                  <span className="flex items-center gap-2 text-base font-black"><span className="text-2xl">{g.emoji}</span><span>{g.name}<span className="block text-[11px] font-bold text-ink-soft">{g.unit}</span></span></span>
                  <span className="w-16 text-center text-lg font-black text-ink-soft"><Amt v={g.amt} /></span>
                  <span className="flex w-44 items-center justify-between gap-1">
                    <button type="button" disabled={done} onClick={() => { setVals((v) => v.map((x, j) => (j === i ? Math.max(0, x - g.step) : x))); setMarks(null); setFb(null) }} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-30" aria-label={`${g.name} azalt`}><Minus size={18} /></button>
                    <span className="min-w-14 text-center text-xl font-black text-violet-800"><Amt v={vals[i]} /></span>
                    <button type="button" disabled={done} onClick={() => { setVals((v) => v.map((x, j) => (j === i ? x + g.step : x))); setMarks(null); setFb(null) }} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-30" aria-label={`${g.name} artır`}><Plus size={18} /></button>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      }
      panel={
        <>
          <Prompt step="Uyarla"><span className="text-2xl">{t.emoji}</span> {t.dish} tarifi <b>{t.p} kişilik</b>. {t.target > t.p ? 'Misafirler geldi' : 'Bu akşam az kişi var'}: tarifi <b className="text-violet-700">{t.target} kişilik</b> yap.</Prompt>
          <Card><p className="text-sm font-bold text-ink-soft">Önce düşün: {t.target} kişi, {t.p} kişinin kaç katı? Her satırdaki miktarı − / + ile ayarla.</p></Card>
          {!done && <CheckButton onClick={check} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="orantablosu" toolTitle="Oran tablosunda dene" />)}
          {done && <StrategyPicker question="Nasıl düşündün?" options={[k === 0.5 ? 'Hepsini yarıya böldüm' : `Hepsini ${mixed(k).replace(/\[\[|\]\]/g, '')} ile çarptım`, 'Önce yarım tarif, sonra topladım', '1 kişilik miktarı buldum', 'Her malzemeyi ayrı denedim']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. hata dedektifi ───────────────────────── */

function ErrorTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'error' }> } & Common) {
  const d = t.target - t.p
  const [verdict, setVerdict] = useState<'yes' | 'no' | null>(null)
  const [phase, setPhase] = useState<'judge' | 'fix' | 'done'>('judge')
  const [fix, setFix] = useState<number | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const milk = 1
  const right = (milk * t.target) / t.p
  const opts = [right, milk + d, milk * d, right + 0.5].filter((v, i, a) => a.findIndex((x) => near(x, v)) === i)
  const order = useMemo(() => [...opts].sort((a, b) => a - b), [])
  const judge = () => {
    if (verdict === 'no') {
      setPhase('fix')
      setFb({ ok: true, text: `Doğru, Ali yanılıyor! Bir düşün: Ali’nin yöntemiyle tarifi ${t.p - 2} kişiye küçültseydik ${t.p - 2 === 2 ? 'yumurta 2 − 2 = 0 olurdu' : 'miktarlar tuhaflaşırdı'}. Şimdi doğrusunu bul.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `Ali’nin yöntemini tersine çevir: ${t.p} kişilik tarifi 2 kişiye indirmek için her malzemeden 2 çıkarsaydık, 2 yumurta kaç yumurta olurdu? 2 kişi hiç yumurta yemez mi?`, mis: 'Tarif ölçeklemede toplamsal yöntemi doğru kabul etti' })
  }
  const checkFix = () => {
    if (fix !== null && near(fix, right)) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `Evet! ${t.p} kişi 1 su bardağı ise ${t.p / 2} kişi [[1/2]] bardak; ${t.target} kişi = ${t.p} kişi + ${t.p / 2} kişi → 1 + [[1/2]] = ${mixed(right)} bardak.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: fix !== null && near(fix, milk + d) ? 'Bu yine Ali’nin yöntemi (+2). Kişi sayısı kaç katına çıktı?' : `${t.target} kişi, ${t.p} kişiden ${t.p / 2} kişi fazla; ${t.p / 2} kişi de ${t.p} kişinin yarısı. Sütün yarısı ne kadar?`, mis: fix !== null && near(fix, milk + d) ? 'Tarifi ölçeklerken kişi farkı kadar malzeme ekledi' : undefined })
  }
  return (
    <Split
      work={
        <div className="grid gap-3 sm:grid-cols-2">
          <RecipeCard emoji="📜" dish={`${t.dish} (orijinal)`} p={t.p}>
            <ul className="space-y-1"><li>🥚 2 yumurta</li><li>🥛 1 su bardağı süt</li><li>🌾 2 su bardağı un</li></ul>
          </RecipeCard>
          <div className="relative rounded-2xl bg-white p-3 text-ink shadow-sm ring-2 ring-rose-300">
            <p className="flex items-center gap-2 text-lg font-black"><span className="text-2xl">👦</span>Ali’nin tarifi <span className="ml-auto rounded-full bg-rose-100 px-2.5 py-0.5 text-sm text-rose-800">{t.target} kişilik</span></p>
            <ul className="mt-1.5 space-y-1 text-base font-extrabold"><li>🥚 2 + {d} = {2 + d} yumurta</li><li>🥛 1 + {d} = {1 + d} su bardağı süt</li><li>🌾 2 + {d} = {2 + d} su bardağı un</li></ul>
            <p className="mt-2 rounded-xl bg-rose-50 p-2 text-sm font-bold text-rose-900">“{d} kişi daha geldi, ben de her malzemeye {d} ekledim!”</p>
          </div>
          {phase !== 'judge' && (
            <div className="rounded-2xl bg-white p-3 text-ink ring-1 ring-line sm:col-span-2">
              <p className="mb-2 text-sm font-black text-ink-soft">Süt şeridi (her kutu {t.p / 2} kişilik süt)</p>
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm font-black">
                <span>{t.p} kişi</span>
                <div className="flex gap-1">{[0, 1].map((i) => <span key={i} className="h-9 flex-1 rounded-lg bg-sky-300 ring-1 ring-sky-500" />)}<span className="flex-1" /></div>
                <span>{t.target} kişi</span>
                <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`h-9 flex-1 rounded-lg ring-1 ${phase === 'done' ? 'bg-sky-300 ring-sky-500' : 'bg-sky-100 ring-sky-300 ring-dashed'}`} />)}</div>
              </div>
              <p className="mt-2 text-xs font-bold text-ink-soft">İki kutu 1 su bardağı ise bir kutu ne kadar?</p>
            </div>
          )}
        </div>
      }
      panel={
        <>
          <Prompt step="Hata dedektifi">Ali, {t.p} kişilik {t.dish.toLocaleLowerCase('tr')} tarifini {t.target} kişiye uyarladı. <span className="mt-1 block text-teal-800">Ali’nin yöntemi doğru mu?</span></Prompt>
          {phase === 'judge' && (
            <>
              <Choices value={verdict} onPick={(v) => { setVerdict(v); setFb(null) }} options={[{ id: 'yes', label: 'Evet, doğru' }, { id: 'no', label: 'Hayır, yanlış' }]} />
              <CheckButton onClick={judge} disabled={!verdict} />
            </>
          )}
          {phase !== 'judge' && (
            <>
              <Card><p className="font-extrabold">{t.target} kişi için kaç su bardağı süt gerekir?</p></Card>
              <Choices cols={2} value={fix} disabled={phase === 'done'} onPick={(v) => { setFix(v); setFb(null) }} options={order.map((v) => ({ id: v, label: <MathText text={`${mixed(v)} su bardağı`} /> }))} />
              {phase === 'fix' && <CheckButton onClick={checkFix} disabled={fix === null} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool={grade >= 6 ? 'orantablosu' : undefined} />)}
          {phase === 'done' && <StrategyPicker question="Ali’ye nasıl açıklarsın?" options={['Kişi 1,5 katı oldu, malzemeler de 1,5 katı olmalı', 'Yarım tarifi ekledim', 'Küçültünce yumurta 0 olurdu', '1 kişilik miktarı buldum']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}
