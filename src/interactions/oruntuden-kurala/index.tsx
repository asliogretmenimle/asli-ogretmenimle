import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Delete, Eraser, Eye, Ghost, Plus, Shapes, Sparkles, TableProperties } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Card, Derived, Header, Layout, NextButton, Nudge, NumPad, PickBtn, isDark, parseNum, useSession } from './ortak'
import { BuildCanvas, FigureSvg, NEW, Strip, TONES } from './Figure'
import { PATTERNS, bounds, sameShape, valueAt, type Pattern, type PatternId } from './patterns'
import { linText, linear, show, structureKey, type Tok } from './expr'

/**
 * 58. Örüntüden Kurala — büyüyen şekil örüntüleri (Van de Walle: örüntüden genellemeye)
 *  - Kur: şekil 1–3’e bakıp şekil 4’ü parça parça kendin yap (büyüme turuncu renklenir).
 *  - Uzak şekil: şekil 10/20/25’te kaç parça olur? (tablo, yinelemeli ↔ açık düşünme)
 *  - Kural: sözel makine (4), □’lı ifade (5), n’li ifade (6–8); tablo canlı denetler.
 *  - Görme biçimleri: aynı şekli farklı gruplamak denk ifadeler verir → useSolutions.
 *  - Ters soru (6–8): “61 kibritlik şekil kaçıncı?” → denklem; 8. sınıf: noktalar bir doğru (eğim = artış).
 */

const VIOLET = '#7c3aed'

type TaskKind = 'build' | 'far' | 'rule' | 'seeings' | 'inverse' | 'graph'
interface Task { kind: TaskKind; p: PatternId; N?: number; goal?: number; T?: number; maybe?: number }

function makeTasks(g: Grade): Task[] {
  if (g <= 4) return [{ kind: 'build', p: 'lkaro' }, { kind: 'far', p: 'lkaro', N: 10 }, { kind: 'rule', p: 'lkaro' }, { kind: 'build', p: 'kule' }, { kind: 'far', p: 'kule', N: 10 }]
  if (g === 5) return [{ kind: 'build', p: 'kibrit' }, { kind: 'far', p: 'kibrit', N: 10 }, { kind: 'rule', p: 'kibrit' }, { kind: 'seeings', p: 'arti', goal: 2 }, { kind: 'far', p: 'arti', N: 15 }]
  if (g === 6) return [{ kind: 'build', p: 'kibrit' }, { kind: 'rule', p: 'kibrit' }, { kind: 'seeings', p: 'kibrit', goal: 3 }, { kind: 'far', p: 'arti', N: 20 }, { kind: 'inverse', p: 'kibrit', T: 61 }]
  if (g === 7) return [{ kind: 'seeings', p: 'kibrit', goal: 3 }, { kind: 'build', p: 'cit' }, { kind: 'far', p: 'cit', N: 25 }, { kind: 'rule', p: 'cit' }, { kind: 'inverse', p: 'cit', T: 52, maybe: 50 }]
  return [{ kind: 'build', p: 'cit' }, { kind: 'seeings', p: 'cit', goal: 2 }, { kind: 'graph', p: 'cit' }, { kind: 'rule', p: 'arti' }, { kind: 'inverse', p: 'arti', T: 81, maybe: 62 }]
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)

function titleOf(t: Task, p: Pattern) {
  switch (t.kind) {
    case 'build': return 'Şekil 4’ü sen kur'
    case 'far': return `Şekil ${ek(t.N!, 'loc')} kaç ${p.unit} var?`
    case 'rule': return 'Kuralı bul'
    case 'seeings': return 'Sen nasıl görüyorsun?'
    case 'inverse': return `${t.T} ${p.unit} hangi şekilde?`
    case 'graph': return 'Örüntünün grafiği'
  }
}

/** "1 + 3n" gibi metni belirteçlere çevir */
const tokenize = (s: string): Tok[] => [...s.replace(/\s+/g, '')].map((c) => (c === '-' ? '−' : c))

export default function OruntudenKurala({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const sol = useSolutions()
  const dark = isDark(grade)
  const t = tasks[S.idx]
  const p = PATTERNS[t.p]

  const finish = () => {
    const n = sol.list.length
    const insight =
      grade <= 4
        ? 'Bir şekil örüntüsünde her adımda aynı miktar eklenir. Bu artışı ve başlangıcı bilirsen uzaktaki bir şekli kurmadan bulabilirsin: şekil numarasının 2 katının 1 fazlası gibi.'
        : grade === 5
          ? 'Örüntünün kuralı, şekil numarası ile parça sayısı arasındaki ilişkidir (□ × 3 + 1 gibi). Aynı şekli farklı gruplayınca farklı görünen ama hep aynı sonucu veren kurallar yazılabilir.'
          : grade === 6
            ? 'Bir şekli farklı görmek farklı cebirsel ifadeler verir: 1 + 3n, 4 + 3(n − 1) ve 2n + (n + 1) her n için aynı sayıyı verir; bunlar denk ifadelerdir.'
            : grade === 7
              ? 'Denk ifadeler sadeleştirilince aynı biçime iner: 3n + 2(n + 1) = 5n + 2. Kuraldan denklem kurarak “kaçıncı şekil?” sorusunu çözebilir, bazı sayıların hiçbir şekle ait olamayacağını gösterebiliriz.'
              : 'Doğrusal bir örüntünün noktaları bir doğru üzerindedir: her adımdaki artış doğrunun eğimini, şekil 0’daki değer y eksenini kestiği yeri verir (y = 5x + 2).'
    onFinish({
      stars: S.stars(n >= 3 ? 1 : 0),
      summary: `${tasks.length} görevi tamamladın${n ? `; aynı örüntü için ${n} farklı ifade buldun` : ''}.`,
      insight,
    })
  }

  const footer = S.done ? <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} /> : null
  const common: Common = { t, p, grade, dark, box: grade <= 5, onDone: S.complete, footer, sol }

  return (
    <Scene grade={grade}>
      <Header icon={<Shapes size={24} />} color={VIOLET} idx={S.idx} total={tasks.length} title={titleOf(t, p)} dark={dark} />
      {t.kind === 'build' && <BuildTask key={S.idx} {...common} />}
      {t.kind === 'far' && <FarTask key={S.idx} {...common} />}
      {t.kind === 'rule' && (grade <= 4 ? <MachineRule key={S.idx} {...common} /> : <RuleTask key={S.idx} {...common} />)}
      {t.kind === 'seeings' && <SeeingsTask key={S.idx} {...common} />}
      {t.kind === 'inverse' && <InverseTask key={S.idx} {...common} />}
      {t.kind === 'graph' && <GraphTask key={S.idx} {...common} />}
    </Scene>
  )
}

type Common = { t: Task; p: Pattern; grade: Grade; dark: boolean; box: boolean; onDone: (first: boolean) => void; footer: ReactNode; sol: ReturnType<typeof useSolutions> }

/* ───────────────────────── ortak küçük parçalar ───────────────────────── */

/** Görev kartı (koyu sahneye uyumlu) */
function Prompt({ children, dark, kicker }: { children: ReactNode; dark: boolean; kicker?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 ring-1 ring-violet-400/40' : 'bg-white/95 ring-1 ring-violet-200'}`}>
      {kicker && <p className={`text-[11px] font-black tracking-wide uppercase ${dark ? 'text-violet-300' : 'text-violet-700'}`}>{kicker}</p>}
      <p className={`mt-0.5 text-[17px] leading-snug font-extrabold ${dark ? 'text-white' : 'text-ink'}`}>{typeof children === 'string' ? <MathText text={children} /> : children}</p>
    </div>
  )
}

function GrowthToggle({ on, set, dark }: { on: boolean; set: (v: boolean) => void; dark: boolean }) {
  return (
    <button type="button" onClick={() => set(!on)} aria-pressed={on} className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-extrabold transition active:scale-95 ${on ? 'bg-orange-500 text-white shadow-[0_3px_0_#c2410c]' : dark ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-600' : 'bg-white text-ink ring-1 ring-line'}`}>
      <Eye size={18} />Büyümeyi {on ? 'gizle' : 'göster'}
      <span className="size-3 rounded-full ring-2 ring-white" style={{ background: NEW }} aria-hidden />
    </button>
  )
}

/** Yatay değer tablosu: şekil no → parça sayısı (+ isteğe bağlı kural satırı) */
function ValueTable({ p, ns, dark, extra, mine, mineLabel = 'Kuralın', diffs }: { p: Pattern; ns: number[]; dark: boolean; extra?: { n: ReactNode; v: ReactNode }; mine?: (n: number) => number | null; mineLabel?: string; diffs?: boolean }) {
  const cell = `min-w-11 px-2 py-1.5 text-center tabular-nums ${dark ? 'border-slate-600' : 'border-line'} border`
  const head = `${cell} text-left text-xs font-black whitespace-nowrap ${dark ? 'bg-slate-700 text-slate-200' : 'bg-violet-50 text-violet-900'}`
  return (
    <div className="max-w-full overflow-x-auto">
      <table className={`mx-auto border-collapse overflow-hidden rounded-xl text-base font-black ${dark ? 'bg-slate-900 text-white' : 'bg-white text-ink'}`} data-testid="value-table">
        <tbody>
          <tr>
            <th className={head}>Şekil</th>
            {ns.map((n) => <td key={n} className={cell}>{n}</td>)}
            {extra && <td className={`${cell} ${dark ? 'bg-violet-900/50' : 'bg-violet-50'}`}>{extra.n}</td>}
          </tr>
          <tr>
            <th className={head}>{cap(p.unit)} sayısı</th>
            {ns.map((n) => <td key={n} className={cell}>{valueAt(p, n)}</td>)}
            {extra && <td className={`${cell} ${dark ? 'bg-violet-900/50 text-violet-200' : 'bg-violet-50 text-violet-700'}`}>{extra.v}</td>}
          </tr>
          {diffs && (
            <tr>
              <th className={head}>Artış</th>
              {ns.map((n, i) => <td key={n} className={`${cell} text-sm text-orange-500`}>{i === 0 ? '' : `+${valueAt(p, n) - valueAt(p, ns[i - 1])}`}</td>)}
              {extra && <td className={cell} />}
            </tr>
          )}
          {mine && (
            <tr>
              <th className={head}>{mineLabel}</th>
              {ns.map((n) => {
                const v = mine(n)
                const ok = v !== null && Math.abs(v - valueAt(p, n)) < 1e-9
                return (
                  <td key={n} className={`${cell} ${v === null ? 'opacity-40' : ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {v === null ? '…' : <span className="inline-flex items-center gap-0.5">{String(v).replace('-', '−')}<span className="text-xs">{ok ? '✓' : '✗'}</span></span>}
                  </td>
                )
              })}
              {extra && <td className={cell} />}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

type NudgeState = { q: string; mis?: string; n: number; tone?: 'ok' }
function useNudge() {
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const say = (q: string, mis?: string, tone?: 'ok') => setNudge((c) => ({ q, mis, tone, n: (c?.n ?? 0) + 1 }))
  return { nudge, say, clear: () => setNudge(null) }
}

/** Tek seferlik item kaydı */
function useOnce() {
  const first = useRef(true)
  const done = useRef(false)
  return { first, done }
}

/* ───────────────────────── 1. Şekli kur ───────────────────────── */

function BuildTask({ p, grade, dark, onDone, footer }: Common) {
  const track = useTracker()
  const target = useMemo(() => p.fig(4), [p])
  const region = useMemo(() => {
    const b = bounds(target)
    return { x0: b.x0 - 1, y0: b.y0 - 1, x1: b.x1 + 1, y1: b.y1 + 1 }
  }, [target])
  const [keys, setKeys] = useState<string[]>([])
  const [copied, setCopied] = useState<Set<string> | null>(null)
  const [growth, setGrowth] = useState(false)
  const [ghost, setGhost] = useState(false)
  const [tries, setTries] = useState(0)
  const [solved, setSolved] = useState(false)
  const N = useNudge()
  const o = useOnce()

  const change = (k: string[]) => {
    if (solved) return
    setKeys(k)
    N.clear()
  }
  const copy3 = () => {
    const f3 = p.fig(3)
    setKeys(f3)
    setCopied(new Set(f3))
    N.clear()
  }

  const check = () => {
    const ok = sameShape(keys, target)
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setSolved(true)
      N.clear()
      if (!o.done.current) {
        o.done.current = true
        track.item(o.first.current)
        if (copied) track.strategy('Önceki şekle yeni parçayı ekleme (hamleden)')
        onDone(o.first.current)
      }
      return
    }
    o.first.current = false
    sfx.bad()
    setTries((x) => x + 1)
    const want = target.length
    const f3 = valueAt(p, 3)
    if (!keys.length) return N.say('Henüz bir şey koymadın. Şekil 3’ü kopyalayıp üzerine ekleyerek başlayabilirsin.')
    if (keys.length === want) return N.say(`${keys.length} ${p.unit}, sayı doğru! Peki şeklin, örüntünün büyüme biçimine uyuyor mu? “Büyümeyi göster”e bas: yeni parçalar hep nereye ekleniyor?`)
    setGrowth(true)
    if (keys.length === f3) return N.say(`Bu şekil, şekil 3 ile aynı sayıda: ${f3} ${p.unit}. Şekil 3’ten 4’e geçerken ne eklenmeli? Turuncu parçalara bak.`, undefined)
    if (keys.length === 2 * valueAt(p, 2)) return N.say(`Şekil 2’yi iki kez mi koydun? Şekil 4, şekil 2’nin iki katı mı olur? Şekil 2’den 3’e kaç ${p.unit} eklendiğine bak.`, 'Şekil 4’ü şekil 2’nin iki katı sanma (orantısal düşünme)')
    N.say(`Şeklinde ${keys.length} ${p.unit} var. Her şekilde kaç ${p.unit} ekleniyor? Şekil 3’te ${f3} ${p.unit} vardı; şekil 4’te kaç olmalı?`)
  }

  const showGhost = () => {
    track.hint()
    o.first.current = false
    setGhost(true)
  }

  const mark = copied ? (k: string) => (copied.has(k) ? undefined : NEW) : undefined
  const addedCount = copied ? keys.filter((k) => !copied.has(k)).length : 0
  const howTo = p.kind === 'stick' ? 'İki noktanın arasına dokun: kibrit çöpü konur. Parmağını kaydırarak art arda koyabilirsin; tekrar dokununca kalkar.' : p.kind === 'tile' ? 'Karelere dokun ya da parmağını sürükleyerek karo döşe; tekrar dokununca kalkar.' : 'Noktalara dokun ya da parmağını sürükle; tekrar dokununca kalkar.'

  const work = (
    <div className="flex flex-col gap-3">
      <Strip p={p} upto={3} growth={growth} dark={dark} u={p.kind === 'tile' ? 18 : 26} extra={
        <figure className={`grid place-items-center self-stretch rounded-2xl border-2 border-dashed px-4 ${dark ? 'border-violet-400/60 text-violet-300' : 'border-violet-300 text-violet-500'}`}>
          <span className="text-3xl font-black">?</span>
          <figcaption className="text-xs font-black">Şekil 4</figcaption>
        </figure>
      } />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <GrowthToggle on={growth} set={setGrowth} dark={dark} />
      </div>
      <BuildCanvas kind={p.kind} region={region} keys={keys} onChange={change} mark={mark} dark={dark} ghost={ghost && !solved ? target : undefined} />
      <p className={`text-center text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{howTo}</p>
    </div>
  )

  const panel = (
    <>
      <Prompt dark={dark} kicker={p.name}>Şekil 1, 2 ve 3’ün nasıl büyüdüğüne bak. Şekil 4’ü yapım alanına sen kur.</Prompt>
      <Card dark={dark}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-extrabold">Şeklinde</span>
          <span className="text-3xl font-black tabular-nums" data-testid="count">{keys.length} <span className="text-base font-extrabold">{p.unit}</span></span>
        </div>
        {copied && <p className="mt-1 text-sm font-bold" style={{ color: NEW }}>Şekil 3’e eklediğin: {addedCount} {p.unit}</p>}
        {!solved && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <PickBtn onClick={copy3} dark={dark} className="px-2 text-sm whitespace-nowrap" color={VIOLET}><span className="inline-flex items-center gap-1.5"><Copy size={16} />Şekil 3’ü kopyala</span></PickBtn>
            <PickBtn onClick={() => { setKeys([]); setCopied(null); N.clear() }} dark={dark} className="text-sm" color={VIOLET}><span className="inline-flex items-center gap-1.5"><Eraser size={16} />Temizle</span></PickBtn>
          </div>
        )}
      </Card>
      {!solved && (
        <div className="flex gap-2">
          <BigButton onClick={check} disabled={!keys.length} className="flex-1"><Check size={20} />Kontrol et</BigButton>
          {tries >= 2 && !ghost && <button type="button" onClick={showGhost} className={`grid min-h-14 min-w-14 place-items-center rounded-2xl ring-1 active:scale-95 ${dark ? 'bg-slate-800 text-slate-200 ring-slate-600' : 'bg-white text-ink-soft ring-line'}`} aria-label="Şeklin silik hâlini göster"><Ghost size={22} /></button>}
        </div>
      )}
      {N.nudge && <Nudge key={N.nudge.n} question={N.nudge.q} misconception={N.nudge.mis} />}
      {solved && (
        <>
          <Derived>
            Şekil 4: {target.length} {p.unit}. {p.grow}
          </Derived>
          <ValueTable p={p} ns={[1, 2, 3, 4]} dark={dark} diffs />
          <StrategyPicker question="Şekil 4’ü nasıl kurdun?" options={['Şekil 3’ü kopyalayıp yeni parçayı ekledim', 'Baştan parça parça kurdum', 'Şekli gruplara ayırarak kurdum', 'Sayıyı önce hesapladım']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── 2. Uzak şekil ───────────────────────── */

function FarTask({ t, p, grade, dark, onDone, footer }: Common) {
  const track = useTracker()
  const N = t.N ?? 10
  const want = valueAt(p, N)
  const [val, setVal] = useState('')
  const [rows, setRows] = useState(4)
  const [growth, setGrowth] = useState(true)
  const [solved, setSolved] = useState(false)
  const nd = useNudge()
  const o = useOnce()
  const f = (n: number) => valueAt(p, n)

  const extend = () => {
    if (rows === 4) track.hint()
    o.first.current = false
    setRows((r) => Math.min(grade <= 5 ? 8 : 6, r + 1))
  }

  const check = () => {
    const v = parseNum(val)
    const ok = v === want
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setSolved(true)
      nd.clear()
      if (!o.done.current) {
        o.done.current = true
        track.item(o.first.current)
        onDone(o.first.current)
      }
      return
    }
    o.first.current = false
    sfx.bad()
    if (v === p.A * N) return nd.say(`${N} kez ${p.A} ${p.unit}: ${p.A * N}. Peki şekil 1’de kaç ${p.unit} var: ${p.A} mü, ${f(1)} mi? Fazladan ${p.unit}lar nereden geliyor?`, 'Sabit kısmı unutma (yalnızca artış × şekil no)')
    if (v === f(1) * N) return nd.say(`Şekil 1’de ${f(1)} ${p.unit} var; şekil 2’de ${f(1) * 2} mi var? Şekiller kopyalanarak mı büyüyor, yoksa her adımda ${p.A} mi ekleniyor?`, 'Orantısal düşünme: şekil 1’in katı sanma')
    if (N % 2 === 0 && v === 2 * f(N / 2)) return nd.say(`Şekil ${N / 2}’nin iki katını aldın mı? İki şekil ${N / 2} yan yana konunca ortak parçalar iki kez sayılmış olmaz mı? Tabloda şekil 2 ile şekil 4’e bak: 4, 2’nin iki katı mı?`, 'Orantısal düşünme: şekil N/2’nin iki katını alma')
    if (N % 4 === 0 && v === f(4) * (N / 4)) return nd.say(`Şekil 4’ün ${N / 4} katını aldın. Tablo şekil 4’ten 8’e iki katına çıkıyor mu? Her adımda ne kadar artıyor?`, 'Orantısal düşünme: şekil 4’ün katını alma')
    if (v === f(N - 1) || v === f(N + 1)) return nd.say(`Çok yakın! Şekil ${v === f(N - 1) ? N - 1 : N + 1}’in sayısını bulmuş olabilir misin? Şekil 1’den şekil ${N}’a kaç adım var?`, 'Yinelemeli saymada adım sayısını şaşırma')
    nd.say(`Şekil 1’de ${f(1)} ${p.unit} var ve her şekilde ${p.A} ${p.unit} ekleniyor. Şekil ${ek(N, 'dat')} gelene kadar kaç kez ${p.A} eklenir?`)
  }

  const ns = Array.from({ length: rows }, (_, i) => i + 1)
  const work = (
    <div className="flex flex-col gap-3">
      <Strip p={p} upto={4} growth={growth} dark={dark} u={p.id === 'arti' ? 12 : p.kind === 'tile' ? 15 : 20} />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <GrowthToggle on={growth} set={setGrowth} dark={dark} />
        {!solved && rows < (grade <= 5 ? 8 : 6) && <PickBtn onClick={extend} dark={dark} className="text-sm"><span className="inline-flex items-center gap-1.5"><TableProperties size={16} />Tabloyu uzat</span></PickBtn>}
      </div>
      <ValueTable p={p} ns={ns} dark={dark} diffs extra={{ n: <>…&nbsp;{N}</>, v: solved ? want : '?' }} />
      {solved && (
        <Derived className="text-center">
          <MathText text={`${f(1)} + ${N - 1} × ${p.A} = ${want}`} />
          {grade >= 5 && <span className="mt-1 block text-base font-extrabold opacity-80">ya da {N} × {p.A} + {p.B} = {want}</span>}
        </Derived>
      )}
    </div>
  )
  const panel = (
    <>
      <Prompt dark={dark} kicker={p.name}>{`Şekil ${ek(N, 'acc')} kurmadan bul: şekil ${ek(N, 'loc')} kaç ${p.unit} olur?`}</Prompt>
      {!solved && (
        <Card dark={dark}>
          <NumPad value={val} onChange={(v) => { setVal(v); nd.clear() }} dark={dark} label={`Şekil ${N}:`} unit={p.unit} onEnter={check} enterLabel={<><Check size={20} />Kontrol et</>} />
        </Card>
      )}
      {nd.nudge && <Nudge key={nd.nudge.n} question={nd.nudge.q} misconception={nd.nudge.mis} />}
      {solved && (
        <>
          <Derived>Şekil {N}: {want} {p.unit}.</Derived>
          <StrategyPicker question="Nasıl buldun?" options={['Tabloyu sürdürdüm (her seferinde +' + p.A + ')', 'Şekil ' + N + '’u kafamda kurdum', `Kural buldum (×${p.A}, +${p.B})`, 'Şekil 1’den sonra kaç kez eklendiğini saydım']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── 3a. Kural makinesi (4. sınıf) ───────────────────────── */

function MachineRule({ p, dark, onDone, footer }: Common) {
  const track = useTracker()
  const [k, setK] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const nd = useNudge()
  const o = useOnce()
  const mine = (n: number) => (k === null ? null : k * n + (b ?? 0))

  const check = () => {
    const ok = k === p.A && (b ?? 0) === p.B
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setSolved(true)
      nd.clear()
      if (!o.done.current) {
        o.done.current = true
        track.item(o.first.current)
        onDone(o.first.current)
      }
      return
    }
    o.first.current = false
    sfx.bad()
    if (k === p.A) return nd.say(`Çarpma doğru: her şekilde ${p.A} ${p.unit} ekleniyor. Şekil 1 için makinen ${mine(1)} veriyor; şekilde kaç ${p.unit} var? Eksik ya da fazla olan nerede?`)
    if (k === p.A + p.B) return nd.say(`Şekil 1 için doğru çalışıyor ama şekil 2 için? Her şekilde kaç ${p.unit} ekleniyor? Çarpılacak sayı bu artış olabilir mi?`, 'Kuralı yalnızca ilk şekle göre kurma')
    nd.say(`Tabloda ✗ olan sütuna bak. Her şekilde kaç ${p.unit} ekleniyor? Makine şekil numarasını o kadarla çarpsın.`)
  }

  const work = (
    <div className="flex flex-col gap-3">
      <Strip p={p} upto={4} growth dark={dark} u={p.kind === 'tile' ? 15 : 20} />
      <ValueTable p={p} ns={[1, 2, 3, 4, 5]} dark={dark} diffs mine={mine} mineLabel="Makinen" />
      <div className={`flex flex-wrap items-center justify-center gap-2 rounded-2xl p-3 text-lg font-black ${dark ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-line'}`} data-testid="machine">
        <span className="rounded-xl bg-violet-100 px-3 py-2 text-violet-900">Şekil no</span>
        <span>→</span>
        <span className="rounded-xl bg-orange-100 px-3 py-2 text-orange-900">× {k ?? '?'}</span>
        <span>→</span>
        <span className="rounded-xl bg-sky-100 px-3 py-2 text-sky-900">+ {b ?? '?'}</span>
        <span>→</span>
        <span className="rounded-xl bg-emerald-100 px-3 py-2 text-emerald-900">{cap(p.unit)} sayısı</span>
      </div>
    </div>
  )
  const panel = (
    <>
      <Prompt dark={dark} kicker="Kural makinesi">Makineyi ayarla: şekil numarasını hangi sayıyla çarpıp kaç eklemeli ki her şekil için doğru sayıyı versin?</Prompt>
      {!solved && (
        <>
          <Card dark={dark} title="Şekil numarasını çarp">
            <div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5].map((x) => <PickBtn key={x} on={k === x} onClick={() => { setK(x); nd.clear() }} dark={dark} className="text-lg">× {x}</PickBtn>)}</div>
          </Card>
          <Card dark={dark} title="Sonra ekle">
            <div className="flex flex-wrap gap-1.5">{[0, 1, 2, 3, 4, 5].map((x) => <PickBtn key={x} on={b === x} onClick={() => { setB(x); nd.clear() }} dark={dark} className="text-lg">+ {x}</PickBtn>)}</div>
          </Card>
          <BigButton onClick={check} disabled={k === null} className="w-full"><Check size={20} />Kontrol et</BigButton>
        </>
      )}
      {nd.nudge && <Nudge key={nd.nudge.n} question={nd.nudge.q} misconception={nd.nudge.mis} />}
      {solved && (
        <>
          <Derived>Kural: şekil numarasının {p.A} katının {p.B} fazlası.<span className="mt-1 block text-base">Şekil no × {p.A} + {p.B}</span></Derived>
          <Card dark={dark}><p className="text-[15px] font-bold">Çarptığın {p.A}, her şekilde eklenen {p.unit} sayısı. Peki eklediğin {p.B} şekilde nerede duruyor?</p></Card>
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── ifade tuş takımı ───────────────────────── */

function ExprPad({ toks, setToks, box, dark }: { toks: Tok[]; setToks: (t: Tok[]) => void; box: boolean; dark: boolean }) {
  const push = (t: Tok) => setToks([...toks, t].slice(0, 18))
  const key = `grid min-h-12 place-items-center rounded-xl text-xl font-black ring-1 transition active:scale-95 ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line'}`
  const op = `grid min-h-12 place-items-center rounded-xl text-xl font-black ring-1 transition active:scale-95 ${dark ? 'bg-slate-600 text-violet-100 ring-slate-400' : 'bg-violet-50 text-violet-900 ring-violet-200'}`
  return (
    <div>
      <div className={`mb-2 flex min-h-14 items-center justify-center rounded-2xl px-3 text-center text-2xl font-black ring-2 ${dark ? 'bg-slate-900 text-white ring-violet-400/60' : 'bg-white text-ink ring-violet-200'}`} data-testid="expr" aria-live="polite">
        {toks.length ? show(toks, box) : <span className="opacity-30">kural</span>}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        <button type="button" onClick={() => push('n')} className={`${op} col-span-2 !bg-violet-600 !text-white !ring-violet-700`} aria-label={box ? 'Şekil numarası kutusu' : 'n'}>{box ? '□' : 'n'}</button>
        {(['+', '−', '×', '('] as const).map((t) => <button key={t} type="button" onClick={() => push(t)} className={op}>{t}</button>)}
        {['1', '2', '3', '4', '5', ')'].map((t) => <button key={t} type="button" onClick={() => push(t)} className={t === ')' ? op : key}>{t}</button>)}
        {['6', '7', '8', '9', '0'].map((t) => <button key={t} type="button" onClick={() => push(t)} className={key}>{t}</button>)}
        <button type="button" onClick={() => setToks(toks.slice(0, -1))} className={key} aria-label="Sil"><Delete size={20} /></button>
      </div>
      {toks.length > 0 && <button type="button" onClick={() => setToks([])} className={`mt-1.5 min-h-11 w-full rounded-xl text-sm font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Hepsini sil</button>}
    </div>
  )
}

/** Yanlış kurala yanılgı odaklı soru */
function ruleNudge(p: Pattern, a: number, b: number, box: boolean): { q: string; mis?: string } {
  const v = box ? '□' : 'n'
  const f1 = valueAt(p, 1)
  if (a === 1 && b === p.A) return { q: `${v} + ${p.A} kuralı şekil 1 için ${1 + p.A}, şekil 2 için ${2 + p.A} verir. Şekiller arasındaki artış 1 mi? “Her adımda ${p.A} ekle” fikrini şekil numarasıyla nasıl yazarsın?`, mis: 'Yinelemeli artışı kural sanma (n + artış)' }
  if (a === p.A && b === 0) return { q: `Kuralın şekil 1 için ${p.A} veriyor, ama şekil 1’de ${f1} ${p.unit} var. Her şekilde fazladan duran ${p.B} ${p.unit} nerede?`, mis: 'Sabit terimi unutma (yalnızca artış × n)' }
  if (a === f1 && b === 0) return { q: `Kuralın şekil 2 için ${2 * f1} diyor. Şekil 2’de gerçekten ${2 * f1} ${p.unit} var mı? Ortak kullanılan parçaları düşün.`, mis: 'Orantısal düşünme: şekil 1’in katı sanma' }
  if (a === p.A) return { q: `Her adımdaki artışı doğru yakaladın (${p.A}). Şekil 1 için kuralın kaç veriyor, şekilde kaç ${p.unit} var? Sabit sayıyı düzelt.` }
  return { q: `Tablodaki ✗ işaretli sütunlara bak. Şekiller arasında her seferinde kaç ${p.unit} artıyor? Kuralında ${v}’nin önündeki sayı bu artışla ilgili mi?` }
}

/* ───────────────────────── 3b. Kural ifadesi (5–8) ───────────────────────── */

function RuleTask({ p, grade, dark, box, onDone, footer, sol }: Common) {
  const track = useTracker()
  const [toks, setToks] = useState<Tok[]>([])
  const [solved, setSolved] = useState(false)
  const nd = useNudge()
  const o = useOnce()
  const lin = linear(toks)
  const mine = (n: number) => (lin && !lin.quad ? lin.a * n + lin.b : null)

  const check = () => {
    if (!lin) return nd.say('Kuralın henüz tamamlanmamış görünüyor. Her işaretin iki yanında bir sayı ya da şekil numarası var mı? Açtığın parantezi kapattın mı?')
    const ok = !lin.quad && lin.a === p.A && lin.b === p.B
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setSolved(true)
      nd.clear()
      sol.add(`${p.id}:${structureKey(toks)}`, show(toks, box))
      if (!o.done.current) {
        o.done.current = true
        track.item(o.first.current)
        onDone(o.first.current)
      }
      return
    }
    o.first.current = false
    sfx.bad()
    const r = ruleNudge(p, lin.a, lin.b, box)
    nd.say(r.q, r.mis)
  }

  const shown = show(toks, box)
  const simple = linText(p.A, p.B, box)
  const work = (
    <div className="flex flex-col gap-3">
      <Strip p={p} upto={4} growth dark={dark} u={p.id === 'arti' ? 12 : 20} />
      <ValueTable p={p} ns={[1, 2, 3, 4, 5]} dark={dark} diffs mine={mine} />
      {solved && (
        <Derived className="text-center">
          {grade >= 6 ? `Şekil n’de ${shown}${shown.replace(/\s/g, '') !== simple.replace(/\s/g, '') ? ` = ${simple}` : ''} ${p.unit}` : `Şekil □’de ${shown} ${p.unit}`}
        </Derived>
      )}
    </div>
  )
  const panel = (
    <>
      <Prompt dark={dark} kicker={p.name}>{box ? `Şekil numarası □ olsun. Herhangi bir şekildeki ${p.unit} sayısını □ ile yaz.` : `Şekil numarası n olsun. Şekil n’deki ${p.unit} sayısını veren kuralı yaz.`}</Prompt>
      {!solved && (
        <Card dark={dark}>
          <ExprPad toks={toks} setToks={(x) => { setToks(x); nd.clear() }} box={box} dark={dark} />
          <BigButton onClick={check} disabled={!toks.length} className="mt-2 w-full"><Check size={20} />Kontrol et</BigButton>
        </Card>
      )}
      {nd.nudge && <Nudge key={nd.nudge.n} question={nd.nudge.q} misconception={nd.nudge.mis} tool={grade >= 6 ? 'algebra' : undefined} toolTitle="Cebir karoları" />}
      {solved && (
        <>
          <Card dark={dark}><p className="text-[15px] font-bold">Kuralındaki {p.A}, her şekilde eklenen {p.unit} sayısı; {p.B} ise hiç değişmeyen kısım. Şekil 0 olsaydı kaç {p.unit} olurdu?</p></Card>
          <StrategyPicker question="Kuralı nasıl buldun?" options={['Şekli gruplara ayırdım', 'Tablodaki artışa baktım', 'Şekil 1’den geriye düşündüm', 'Deneyip tabloyla kontrol ettim']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── 4. Görme biçimleri ───────────────────────── */

function SeeingsTask({ t, p, grade, dark, box, onDone, footer, sol }: Common) {
  const track = useTracker()
  const goal = t.goal ?? 2
  const [lensId, setLensId] = useState<string | null>(null)
  const [fn, setFn] = useState(4)
  const [toks, setToks] = useState<Tok[]>([])
  const nd = useNudge()
  const o = useOnce()
  const lens = p.lenses.find((l) => l.id === lensId) ?? null
  const mine = sol.list.filter((s) => s.key.startsWith(`${p.id}:`))
  const lensKeys = useMemo(() => new Map(p.lenses.map((l) => [l.id, structureKey(tokenize(l.expr))])), [p])
  const foundLens = new Set(p.lenses.filter((l) => mine.some((s) => s.key === `${p.id}:${lensKeys.get(l.id)}`)).map((l) => l.id))
  const reached = mine.length >= goal

  const keys = p.fig(fn)
  const groups = lens ? lens.groups(fn) : []
  const colorMap = new Map<string, string>()
  const twice = new Set<string>()
  groups.forEach((g) => g.keys.forEach((k) => {
    if (g.twice) twice.add(k)
    else colorMap.set(k, TONES[g.tone])
  }))
  // iki kez sayılanlar kendi rengini korusun
  const lin = linear(toks)

  const add = () => {
    if (!lin) return nd.say('İfaden henüz tamamlanmamış görünüyor. Parantezleri ve işaretleri kontrol et.')
    const ok = !lin.quad && lin.a === p.A && lin.b === p.B
    track.attempt(ok)
    if (!ok) {
      o.first.current = false
      sfx.bad()
      const r = ruleNudge(p, lin.a, lin.b, box)
      return nd.say(lens ? `Renkli gruplara bak: ${lens.say} Her grup kaç parça ve kaç tane var? ${r.q}` : r.q, r.mis)
    }
    const key = `${p.id}:${structureKey(toks)}`
    const isNew = sol.add(key, show(toks, box))
    if (!isNew) return nd.say('Bu ifadeyi zaten buldun. Şekli başka nasıl gruplayabilirsin? Aşağıdaki bakışlardan birini dene.', undefined, 'ok')
    sfx.ok()
    const simple = linText(p.A, p.B, box)
    const shown = show(toks, box)
    const same = shown.replace(/\s/g, '') === simple.replace(/\s/g, '')
    const count = mine.length + 1
    const msg = grade >= 7 && !same ? `Yeni bir bakış! ${shown} = ${simple}. Sadeleştirince aynı kurala iniyor.` : `Yeni bir bakış: ${shown}. ${count < goal ? `${goal - count} tane daha bul!` : 'Harika, istersen başka bakış da bul.'}`
    nd.say(msg, undefined, 'ok')
    setToks([])
    if (count >= goal && !o.done.current) {
      o.done.current = true
      track.item(o.first.current)
      track.strategy('Aynı örüntüyü farklı biçimlerde görme')
      onDone(o.first.current)
    }
  }

  const work = (
    <div className="flex flex-col gap-3">
      <div className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${dark ? 'bg-slate-900/70 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line'}`}>
        <FigureSvg keys={keys} kind={p.kind} u={Math.min(64, 480 / (bounds(p.fig(5)).x1 - bounds(p.fig(5)).x0 + 1))} dark={dark} colorOf={(k) => colorMap.get(k)} twice={twice} maxW title={`Şekil ${fn}`} />
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className={`text-xs font-black uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Şekil</span>
          {[2, 3, 4, 5].map((n) => <PickBtn key={n} on={fn === n} onClick={() => setFn(n)} dark={dark} className="text-base" label={`Şekil ${ek(n, 'acc')} göster`}>{n}</PickBtn>)}
        </div>
      </div>
      <Card dark={dark} title="Başka gözlerle bak">
        <div className="flex flex-wrap gap-1.5">
          {p.lenses.map((l, i) => (
            <PickBtn key={l.id} on={lensId === l.id} onClick={() => { setLensId(lensId === l.id ? null : l.id); }} dark={dark} className="text-sm" label={`${i + 1}. bakış`}>
              <span className="inline-flex items-center gap-1">{i + 1}. bakış{foundLens.has(l.id) && <span className="text-emerald-400">✓</span>}</span>
            </PickBtn>
          ))}
        </div>
        <p className={`mt-2 min-h-10 text-[15px] font-bold ${dark ? 'text-slate-200' : 'text-ink'}`}>
          {lens ? <>{lens.say}{foundLens.has(lens.id) && <span className="ml-1 font-black text-emerald-500">→ {show(tokenize(lens.expr), box)}</span>}</> : 'Bir bakış seç: şekil renkli gruplara ayrılsın. Ya da kendi gruplamanı düşün.'}
        </p>
      </Card>
    </div>
  )
  const panel = (
    <>
      <Prompt dark={dark} kicker={`${p.name} · en az ${goal} ifade`}>{`Aynı şekli farklı biçimlerde görebilirsin. Her görme biçimi için şekil ${box ? '□' : 'n'}’deki ${p.unit} sayısını yaz.`}</Prompt>
      <Card dark={dark}>
        <ExprPad toks={toks} setToks={(x) => { setToks(x); nd.clear() }} box={box} dark={dark} />
        <BigButton onClick={add} disabled={!toks.length} className="mt-2 w-full"><Plus size={20} />Bu bakışı ekle</BigButton>
      </Card>
      {nd.nudge && <Nudge key={nd.nudge.n} question={nd.nudge.q} misconception={nd.nudge.mis} tone={nd.nudge.tone} />}
      <SolutionList list={mine} goal={goal} />
      {reached && (
        <>
          {grade >= 6 && <Card dark={dark}><p className="text-[15px] font-bold">Bu ifadelerin hepsi her şekil için aynı sayıyı veriyor. Bunlara <b>denk ifadeler</b> denir. Hangisi şekle bakınca en kolay görünüyor?</p></Card>}
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── 5. Ters soru ───────────────────────── */

function InverseTask({ t, p, grade, dark, onDone, footer }: Common) {
  const track = useTracker()
  const T = t.T ?? 61
  const m = (T - p.B) / p.A
  const [val, setVal] = useState('')
  const [stage, setStage] = useState<'ask' | 'maybe' | 'done'>('ask')
  const [maybeAns, setMaybeAns] = useState<boolean | null>(null)
  const nd = useNudge()
  const o = useOnce()
  const f = (n: number) => valueAt(p, n)

  const finishTask = () => {
    setStage('done')
    if (!o.done.current) {
      o.done.current = true
      track.item(o.first.current)
      onDone(o.first.current)
    }
  }

  const check = () => {
    const v = parseNum(val)
    const ok = v === m
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      nd.clear()
      if (t.maybe) setStage('maybe')
      else finishTask()
      return
    }
    o.first.current = false
    sfx.bad()
    if (Number.isInteger(v) && v > 0 && v < 200) {
      const fv = f(v)
      const mis = Math.abs(v - T / p.A) < 1 ? 'Sabit terimi hesaba katmadan bölme' : v === T - p.B ? 'Sabit terimi çıkarıp bölmeyi unutma' : undefined
      return nd.say(`Şekil ${ek(v, 'loc')} kaç ${p.unit} var? Kuralla bulalım: ${p.A} × ${v} + ${p.B} = ${fv}. ${fv > T ? `${T}’den fazla; daha küçük bir şekil dene.` : `${T}’e ulaşmadı; daha büyük bir şekil dene.`}`, mis)
    }
    nd.say(`Şekil numarası bir sayma sayısıdır. ${p.B} ${p.unit} hep sabit; geri kalan ${T - p.B} ${p.unit} kaç tane ${p.A}’lık gruptan oluşur?`)
  }

  const answerMaybe = (yes: boolean) => {
    setMaybeAns(yes)
    const ok = !yes
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      nd.clear()
      finishTask()
    } else {
      o.first.current = false
      sfx.bad()
      const lo = Math.floor(((t.maybe ?? 0) - p.B) / p.A)
      nd.say(`Hangi şekil olurdu? Şekil ${ek(lo, 'loc')} ${f(lo)}, şekil ${ek(lo + 1, 'loc')} ${f(lo + 1)} ${p.unit} var. ${t.maybe} bu ikisinin arasında kalıyor mu?`, 'Her sayının örüntüde bir şekle karşılık geldiğini sanma')
    }
  }

  const work = (
    <div className="flex flex-col gap-3">
      <Strip p={p} upto={3} growth dark={dark} u={p.id === 'arti' ? 14 : 22} />
      <ValueTable p={p} ns={[1, 2, 3, 4]} dark={dark} diffs extra={{ n: stage === 'ask' ? '?' : m, v: T }} />
      {stage !== 'ask' && (
        <Derived className="text-center">
          {grade >= 7 ? (
            <span className="flex flex-col gap-0.5">
              <span>{linText(p.A, p.B)} = {T}</span>
              <span>{p.A}n = {T - p.B}</span>
              <span>n = {m}</span>
            </span>
          ) : (
            <>Şekil {m}: {p.A} × {m} + {p.B} = {T}</>
          )}
        </Derived>
      )}
      {stage === 'done' && t.maybe && (
        <Derived tone="info" className="text-center">
          <span className="flex flex-col gap-0.5">
            <span>{linText(p.A, p.B)} = {t.maybe}</span>
            <span>{p.A}n = {t.maybe - p.B}</span>
            <span className="text-base">{t.maybe - p.B}, {ek(p.A, 'dat')} tam bölünmüyor; şekil numarası tam sayı olmalı.</span>
          </span>
        </Derived>
      )}
    </div>
  )
  const panel = (
    <>
      <Prompt dark={dark} kicker={p.name}>{`Bir arkadaşın bu örüntüden bir şekil kurmuş ve tam ${T} ${p.unit} kullanmış. Bu kaçıncı şekil?`}</Prompt>
      {stage === 'ask' && (
        <Card dark={dark}>
          <NumPad value={val} onChange={(v) => { setVal(v); nd.clear() }} dark={dark} label="Şekil" maxLen={3} onEnter={check} enterLabel={<><Check size={20} />Kontrol et</>} />
        </Card>
      )}
      {stage === 'maybe' && (
        <Card dark={dark}>
          <p className="text-[17px] font-extrabold">{`Peki tam ${t.maybe} ${p.unit} ile bu örüntünün bir şekli kurulabilir mi?`}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <PickBtn on={maybeAns === true} onClick={() => answerMaybe(true)} dark={dark}>Evet</PickBtn>
            <PickBtn on={maybeAns === false} onClick={() => answerMaybe(false)} dark={dark}>Hayır</PickBtn>
          </div>
        </Card>
      )}
      {nd.nudge && <Nudge key={nd.nudge.n} question={nd.nudge.q} misconception={nd.nudge.mis} tool={grade >= 6 ? 'balance' : undefined} toolTitle="Eşit kollu terazi" />}
      {stage === 'done' && (
        <>
          <StrategyPicker question="Nasıl buldun?" options={['Denklem kurup çözdüm', 'Sabit kısmı çıkarıp böldüm', 'Tahmin edip kuralla denedim', 'Tabloyu sürdürdüm']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── 6. Grafik (8. sınıf) ───────────────────────── */

function LineLayer({ p, show: on }: { p: Pattern; show: boolean }) {
  const P = usePlane()
  if (!on) return null
  const x0 = P.view.xMin, x1 = P.view.xMax
  return (
    <g>
      <line x1={P.sx(x0)} y1={P.sy(p.A * x0 + p.B)} x2={P.sx(x1)} y2={P.sy(p.A * x1 + p.B)} stroke="#7c3aed" strokeWidth={3} strokeDasharray="8 6" opacity={0.8} />
      <circle cx={P.sx(0)} cy={P.sy(p.B)} r={8} fill="#f59e0b" stroke="#fff" strokeWidth={3} />
      {/* artış basamakları */}
      {[1, 2, 3].map((n) => (
        <path key={n} d={`M${P.sx(n)} ${P.sy(valueAt(p, n))} H${P.sx(n + 1)} V${P.sy(valueAt(p, n + 1))}`} fill="none" stroke={NEW} strokeWidth={2.5} />
      ))}
      <text x={P.sx(2) + 6} y={(P.sy(valueAt(p, 2)) + P.sy(valueAt(p, 3))) / 2 + 4} fontSize={13} fontWeight={900} fill={NEW}>+{p.A}</text>
    </g>
  )
}

function GraphTask({ p, dark, onDone, footer }: Common) {
  const track = useTracker()
  const [pts, setPts] = useState<Record<number, number>>({})
  const [stage, setStage] = useState<'plot' | 'cut' | 'eq' | 'done'>('plot')
  const [val, setVal] = useState('')
  const [eqPick, setEqPick] = useState<string | null>(null)
  const nd = useNudge()
  const o = useOnce()
  const yMax = valueAt(p, 6) + 4

  const place = (x: number, y: number) => {
    if (stage !== 'plot') return
    const n = Math.round(x)
    if (n < 1 || n > 6) return
    setPts((c) => ({ ...c, [n]: Math.max(0, Math.round(y)) }))
    nd.clear()
  }
  const checkPts = () => {
    const ok = [1, 2, 3, 4].every((n) => pts[n] === valueAt(p, n))
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      nd.clear()
      setStage('cut')
      return
    }
    o.first.current = false
    sfx.bad()
    const missing = [1, 2, 3, 4].filter((n) => pts[n] === undefined)
    if (missing.length) return nd.say(`Şekil ${missing.join(', ')} için henüz nokta yok. Yatay eksende şekil numarasını bul, tablodaki sayı kadar yukarı çık ve dokun.`)
    const wrong = [1, 2, 3, 4].find((n) => pts[n] !== valueAt(p, n))!
    if (pts[wrong] === wrong * p.A) return nd.say(`Şekil ${wrong} noktası ${pts[wrong]} yüksekliğinde. Tabloda şekil ${wrong} için kaç ${p.unit} yazıyor?`)
    nd.say(`Şekil ${wrong} noktası ${pts[wrong]} yüksekliğinde. Tabloya göre kaç olmalı? Noktayı yukarı ya da aşağı sürükleyebilirsin.`)
  }
  const checkCut = () => {
    const v = parseNum(val)
    const ok = v === p.B
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      nd.clear()
      setStage('eq')
      return
    }
    o.first.current = false
    sfx.bad()
    if (v === p.A) return nd.say(`${p.A}, her adımdaki artış (turuncu basamaklar). Şekil 1’den bir adım geri gidersen ${valueAt(p, 1)} − ${p.A} kaç olur?`, 'Eğim ile y eksenini kesim noktasını karıştırma')
    nd.say(`Doğruyu sola, şekil 0’a kadar uzat. Şekil 1’de ${valueAt(p, 1)} ${p.unit} var; bir adım geri gidince ${p.A} ${p.unit} eksilir. Turuncu noktaya bak.`)
  }
  const eqs = useMemo(() => {
    const c = [`y = ${p.A}x + ${p.B}`, `y = ${p.B}x + ${p.A}`, `y = ${p.A + p.B}x`, `y = ${p.A}x`]
    return c.sort()
  }, [p])
  const pickEq = (e: string) => {
    setEqPick(e)
    const ok = e === `y = ${p.A}x + ${p.B}`
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      nd.clear()
      setStage('done')
      if (!o.done.current) {
        o.done.current = true
        track.item(o.first.current)
        onDone(o.first.current)
      }
      return
    }
    o.first.current = false
    sfx.bad()
    if (e === `y = ${p.A + p.B}x`) return nd.say(`${p.A + p.B} şekil 1’deki ${p.unit} sayısı. Bu denklem şekil 2 için ${2 * (p.A + p.B)} verir; tabloda şekil 2’de kaç var?`, 'Orantısal düşünme: şekil 1’in katı sanma')
    if (e === `y = ${p.A}x`) return nd.say(`Bu doğru başlangıç noktasından (0, 0) geçerdi. Bizim doğrumuz y eksenini nerede kesiyor?`)
    nd.say(`x her 1 arttığında y kaç artıyor? Bu sayı x’in önüne mi gelir, sona mı?`, 'Eğim ile sabit terimi karıştırma')
  }

  const work = (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white p-2 text-ink">
        <Plane initial={{ xMin: -0.8, xMax: 7, yMin: -3, yMax: yMax }} equalUnits={false} aspect={0.8} xLabel="şekil no (x)" yLabel={`${p.unit} (y)`} onTap={(q) => place(q.x, q.y)} label="Şekil numarası – parça sayısı grafiği">
          <LineLayer p={p} show={stage !== 'plot'} />
          {Object.entries(pts).map(([n, y]) => (
            <DragPoint key={n} x={Number(n)} y={y} color={y === valueAt(p, Number(n)) && stage !== 'plot' ? '#16a34a' : '#7c3aed'} snapStep={1} label={`Ş${n}`} disabled={stage !== 'plot'} constrain={(q) => ({ x: Number(n), y: Math.max(0, Math.min(yMax, q.y)) })} onChange={(q) => setPts((c) => ({ ...c, [n]: q.y }))} />
          ))}
        </Plane>
      </div>
      <ValueTable p={p} ns={[1, 2, 3, 4]} dark={dark} diffs extra={stage === 'eq' || stage === 'done' ? { n: 0, v: p.B } : undefined} />
    </div>
  )
  const panel = (
    <>
      <Prompt dark={dark} kicker={p.name}>{stage === 'plot' ? 'Tablodaki her şekli bir nokta olarak işaretle: x şekil numarası, y parça sayısı. Grafiğe dokun; noktayı sürükleyerek düzelt.' : stage === 'cut' ? 'Noktalar bir doğru üzerinde! Doğruyu sola uzat: şekil 0 olsaydı kaç parça olurdu? Doğru y eksenini nerede kesiyor?' : stage === 'eq' ? 'Bu doğrunun denklemi hangisi?' : 'Örüntü bir doğrusal fonksiyon!'}</Prompt>
      {stage === 'plot' && (
        <>
          <Card dark={dark}>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={`chip px-3 py-1.5 text-sm ${pts[n] === undefined ? (dark ? 'bg-slate-700 text-slate-300' : 'bg-paper text-ink-soft') : dark ? 'bg-violet-500/30 text-violet-100' : 'bg-violet-100 text-violet-900'}`}>({n}, {pts[n] ?? '?'})</span>
              ))}
            </div>
          </Card>
          <BigButton onClick={checkPts} disabled={Object.keys(pts).length < 4} className="w-full"><Check size={20} />Noktaları kontrol et</BigButton>
        </>
      )}
      {stage === 'cut' && (
        <Card dark={dark}>
          <NumPad value={val} onChange={(v) => { setVal(v); nd.clear() }} dark={dark} label="Şekil 0:" unit={p.unit} onEnter={checkCut} enterLabel={<><Check size={20} />Kontrol et</>} />
        </Card>
      )}
      {(stage === 'eq' || stage === 'done') && (
        <Card dark={dark}>
          <div className="grid grid-cols-2 gap-2">
            {eqs.map((e) => <PickBtn key={e} on={eqPick === e} onClick={() => stage === 'eq' && pickEq(e)} dark={dark} className="text-base">{e}</PickBtn>)}
          </div>
        </Card>
      )}
      {nd.nudge && <Nudge key={nd.nudge.n} question={nd.nudge.q} misconception={nd.nudge.mis} tool="egim" toolTitle="Eğim aracı" />}
      {stage === 'done' && (
        <>
          <Derived>
            <span className="flex items-center gap-1.5"><Sparkles size={18} />y = {p.A}x + {p.B}</span>
            <span className="mt-1 block text-base font-extrabold">Eğim {p.A}: her şekilde eklenen {p.A} {p.unit}. Kesim {p.B}: hiç değişmeyen {p.B} {p.unit}{p.id === 'cit' ? ' (en soldaki iki dikey çöp)' : ''}.</span>
          </Derived>
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

