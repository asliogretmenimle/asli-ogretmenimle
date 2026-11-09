import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check, RotateCcw } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, TOKEN, Tray, n, useDnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { PEOPLE, PieceToken, Pie, Plates, SliceArt, TOOL, countOrdered, fresh, keyOf, left, listText, listUnordered, move, sortDesc, useFlash, type St } from './pasta'

/**
 * 95. 12 Dilim Pasta, 5 Kişi (3–4. sınıf)
 * Kullanıcının sorusu: “12 dilim pastayı 5 kişi kaç farklı şekilde yiyebilir?” Bu açık uçlu soru, çocuğun
 * önce ne saydığına karar vermesini (kimin aldığı önemli mi?), sonra eşit paylaşmayı, artanı kesirle
 * paylaşmayı ve düzenli saymayı keşfettiği beş göreve dönüşür. Baştan sona sürükle-bırak (Polypad gibi:
 * dilim kalkar, parmağı izler, tabağa oturur ya da geri uçar); her görevin üstünde amaç ve “Nasıl kullanılır?” kartı vardır.
 *  1. Keşif: 12 dilimi 5 tabağa istediğin gibi dağıt; her dağıtım deftere yazılır. Kimin aldığı fark eder mi?
 *     Gerçek sayılar (kodla hesaplanır): kimin aldığı önemliyse 1.820, herkes en az 1 alırsa 330; yalnızca sayılar 47.
 *  2. Adil paylaşım: herkes eşit alsın. 2’şer dilim, 2 dilim artar; 3’er olmaz çünkü 5 × 3 = 15 > 12
 *  3. Artan 2 dilim: kesme tahtasında her dilim 5 eşit parçaya kesilir, parçalar dağıtılır (beşte bir; 4. sınıfta 2 tam 2/5)
 *  4. Düzenli sayma: 5 dilim, 2 kişi kaç yol? (6) Tablo kendiliğinden sıralanır; n dilim, 2 kişi → n + 1 yol
 *  5. Kurallı dağıtım: herkes en az 1, en çok 4 dilim alırsa yalnızca 6 farklı dağıtım var; hepsini bul
 *  Tablet için: pastanın her dilimi kendi şekliyle tutulur (clip-path), tabaktaki dilimler tek büyük tutma alanıdır;
 *  sürüklerken ekran kenarında sayfa kayar; dar ekranda ipucu tuvalin içinde, yeni soru görünür alana kaydırılır.
 *  Son: kural defteri
 */

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null

/** Gerçek sayılar: kodla hesaplanır (12 dilim, 5 kişi) */
const ALL_ORDERED = countOrdered(12, 5) // 1.820
const ALL_POSITIVE = countOrdered(12, 5, 1) // 330
const ALL_UNORDERED = listUnordered(12, 5).length // 47
const LIMITED = listUnordered(12, 5, 1, 4) // 6 dağıtım
const LIMITED_ORDERED = countOrdered(12, 5, 1, 4) // 155

const TOOLS_COUNT: ToolInfo = { icon: <span className="text-lg leading-none">📋</span>, name: 'Düzenli tablo', text: 'Pasta bitince dağıtım tabloya yazılır. Tablo, Ali’nin dilim sayısına göre kendiliğinden sıralanır.' }
const TOOLS_LIST: ToolInfo = { icon: <span className="text-lg leading-none">📝</span>, name: 'Dağıtım listesi', text: 'Kurallara uyan her yeni dağıtım, büyükten küçüğe yazılarak listeye eklenir.' }

const TASKS: { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '🎂', title: 'Pastayı dağıt', goal: '12 dilimi 5 arkadaşa farklı biçimlerde dağıtmak ve “kimin aldığı fark eder mi?” sorusunu düşünmek.', tools: [TOOL.slice, TOOL.plate, TOOL.ledger, TOOL.reset, 'answer'] },
  { emoji: '⚖️', title: 'Herkes eşit alsın', goal: 'Dilimleri herkes eşit alacak biçimde dağıtmak; neden 3’er olmadığını ve kaç dilim arttığını bulmak.', tools: [TOOL.slice, TOOL.plate, TOOL.reset, 'answer'] },
  { emoji: '🔪', title: 'Artan dilimler', goal: 'Artan 2 dilimi de eşit paylaşmak için her dilimi 5 eşit parçaya kesip dağıtmak ve parçaya ad vermek.', tools: [TOOL.knife, TOOL.piece, 'answer'] },
  { emoji: '📋', title: 'Düzenli say', goal: 'Daha küçük bir soruyla başlamak: 5 dilimi 2 kişi kaç yolla paylaşır? Düzenli bir tabloyla hiçbir yolu kaçırmamak.', tools: [TOOL.slice, TOOL.plate, TOOLS_COUNT, TOOL.card, 'answer'] },
  { emoji: '📝', title: 'Kurallı dağıtım', goal: 'Herkes en az 1, en çok 4 dilim alırsa mümkün olan bütün dağıtımları bulmak.', tools: [TOOL.slice, TOOL.plate, TOOLS_LIST, TOOL.reset, 'answer'] },
]

export default function PastaPaylasimi({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  /** İlk görevde açık gelir; sonra başlıktaki “?” ile açılır */
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
  }
  const finish = () =>
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde 12 dilim pastayı 5 arkadaşa dağıttın: eşit paylaştın, artanı kestin, düzenli saydın; ${rules.length} kuralı kendin buldun.`,
      insight: `“Kaç farklı yol?” sorusunda önce neyi saydığımıza karar veririz. Kimin aldığı önemliyse 12 dilimin 5 kişiye ${n(ALL_ORDERED)} dağıtımı var; yalnızca sayılara bakarsak ${ALL_UNORDERED}. Eşit paylaşınca herkes 2 dilim alır, 2 dilim artar (12 = 5 × 2 + 2). Çok fazla yol olduğunda küçük bir durumla başlayıp düzenli sayarız: n dilim, 2 kişi → n + 1 yol.`,
    })

  const props = { onDone: done, last, grade }
  return (
    <Scene grade={grade} className="select-none [-webkit-touch-callout:none]">
      <Header
        emoji={end ? '📒' : t.emoji}
        kicker={end ? 'Tamamlandı' : 'Görev'}
        title={end ? 'Kural defterin' : t.title}
        idx={Math.min(idx, TASKS.length - 1)}
        total={TASKS.length}
        right={end ? null : (
          <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
        )}
      />
      {!end && <HowTo goal={t.goal} tools={t.tools} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? (
        <EndView rules={rules} onFinish={finish} />
      ) : idx === 0 ? (
        <ExploreTask key={idx} {...props} />
      ) : idx === 1 ? (
        <FairTask key={idx} {...props} />
      ) : idx === 2 ? (
        <LeftoverTask key={idx} {...props} />
      ) : idx === 3 ? (
        <CountTask key={idx} {...props} />
      ) : (
        <LimitTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; grade: number }

/** Panel tuvalin yanında mı (lg ve üstü)? Değilse ipucu, parmağın olduğu tuvalin içinde gösterilir. */
function useWide() {
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

/** Görev içi düşündüren soru. nudge deneme sayacına yazar; tell yalnızca yol gösterir (keşifte serbest deneme cezalanmaz). */
function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<Say>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const show = (q: string, opts: { mis?: string; at?: number }) => {
    setWrong(opts.at ?? null)
    setSay((s) => ({ q, mis: opts.mis, k: (s?.k ?? 0) + 1 }))
    /** sürükle-bırakta bırakmayı reddeder: dilim yerine geri uçar */
    return false as const
  }
  return {
    clear() {
      setSay(null)
      setWrong(null)
    },
    wrong,
    nudge(q: string, opts: { mis?: string; at?: number } = {}) {
      checks.fail()
      return show(q, opts)
    },
    tell: (q: string, opts: { mis?: string; at?: number } = {}) => show(q, opts),
    /** Geniş ekranda panelde, dar ekranda tuvalde: tek bir yerde gösterilir (yanılgı raporuna bir kez yazılsın) */
    view: (spot: 'work' | 'panel') => (say && (spot === 'panel') === wide ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}

/** Dar ekranda yeni çıkan soru ya da düğme görünür alanda değilse kendiliğinden oraya kaydırılır. */
function Reveal({ children }: { children: ReactNode }) {
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

/** Kart tepsisi dar ekranda ekranın altına yapışır: hedefe kaydırırken kartlar elinin altında kalır */
function Sticky({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-2 z-20 rounded-2xl shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] lg:static lg:shadow-none">{children}</div>
}

function ResetButton({ onClick, disabled, children = 'Dilimleri pastaya geri koy' }: { onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-3 text-sm font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line hover:bg-slate-50 disabled:opacity-40">
      <RotateCcw size={16} /> {children}
    </button>
  )
}

/** Tuvalin altındaki tek satırlık durum: pastada kaç dilim kaldı, son ne oldu */
function Status({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-white/90 px-3 py-2 text-center text-sm font-extrabold text-ink-soft ring-1 ring-line">{children}</p>
}

/** Dağıtımın kişilerle yazılışı: Ali 3 · Ece 2 · … */
function WhoChips({ a }: { a: number[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {a.map((c, i) => (
        <span key={i} className="rounded-md bg-white px-1.5 py-0.5 text-xs font-black tabular-nums ring-1 ring-black/5" style={{ color: PEOPLE[i].color }}>{PEOPLE[i].name} {c}</span>
      ))}
    </span>
  )
}

/* ───────────── 1. Keşif: pastayı dağıt ───────────── */

function Ledger({ log, flash }: { log: number[][]; flash: string | null }) {
  const [mode, setMode] = useState<'who' | 'nums'>('who')
  const groups = new Map<string, number>()
  for (const x of log) {
    const k = keyOf(sortDesc(x))
    groups.set(k, (groups.get(k) ?? 0) + 1)
  }
  return (
    <Card>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><BookOpen size={14} />Dağıtım defteri</p>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <GhostButton active={mode === 'who'} onClick={() => setMode('who')}>Kim kaç aldı? · {log.length}</GhostButton>
        <GhostButton active={mode === 'nums'} onClick={() => setMode('nums')}>Yalnızca sayılar · {groups.size}</GhostButton>
      </div>
      {log.length === 0 ? (
        <p className="text-sm font-bold text-ink-soft">Pasta bitince dağıtım buraya kendiliğinden yazılır.</p>
      ) : mode === 'who' ? (
        <ol className="max-h-60 space-y-1 overflow-y-auto pr-1">
          {[...log].reverse().map((x) => (
            <li key={keyOf(x)} className={`rounded-lg bg-amber-50 px-2 py-1 ring-1 ring-amber-200 animate-fade-up ${flash === keyOf(x) ? 'animate-pop ring-2 ring-amber-500' : ''}`}><WhoChips a={x} /></li>
          ))}
        </ol>
      ) : (
        <>
          <p className="mb-1 text-xs font-bold text-ink-soft">Kimin aldığına bakmadan, büyükten küçüğe:</p>
          <ol className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {[...groups].reverse().map(([k, c]) => (
              <li key={k} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-1 text-base font-black tabular-nums ring-1 ring-amber-200">
                {k.split('-').join(', ')}
                {c > 1 && <span className="rounded-full bg-amber-200 px-2 text-[11px] text-amber-900">{c} kez yazıldı</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  )
}

function ExploreTask({ onDone, last, grade }: TaskProps) {
  const goal = grade >= 4 ? 5 : 4
  const checks = useChecks()
  const s = useSay(checks)
  const [st, setSt] = useState<St>(() => fresh(5))
  const [log, setLog] = useState<number[][]>([])
  const [phase, setPhase] = useState<'play' | 'ask1' | 'ask2' | 'done'>('play')
  const [flash, setFlash] = useFlash<string>()
  const [hit, setHit] = useFlash<number>()
  const kinds = new Set(log.map((x) => keyOf(sortDesc(x))))
  const rules = [
    'Saymadan önce neyi saydığımıza karar veririz: kimin aldığı önemliyse “Ali 3, Ece 2” ile “Ali 2, Ece 3” iki ayrı yoldur; yalnızca sayılara bakarsak ikisi de 3, 2’dir.',
    `12 dilimi 5 kişiye dağıtmanın çok fazla yolu var (kimin aldığı önemliyse ${n(ALL_ORDERED)}). Hepsini tek tek denemek yerine düzenli sayarız.`,
  ]

  const dnd = useDnd((item, target) => {
    if (phase !== 'play') return false
    const m = move(st, item, target)
    if (!m || 'full' in m) return false
    s.clear()
    setSt(m.st)
    if (m.to >= 0) setHit(m.to)
    if (left(m.st) > 0) return
    const a = m.st.plates
    const k = keyOf(a)
    if (log.some((x) => keyOf(x) === k)) {
      s.tell('Bu dağıtım defterde zaten var. Bir tabaktan bir dilimi başka bir tabağa taşı: yeni bir dağıtım olur.')
      return
    }
    const u = keyOf(sortDesc(a))
    const next = [...log, a]
    setLog(next)
    setFlash(k)
    sfx.ok()
    if (kinds.has(u)) s.tell(`Kim kaç aldı değişti ama sayılar aynı: ${listText(sortDesc(a))}. Bu yeni bir dağıtım mı? Defterdeki iki görünüme de bak.`)
    if (new Set(next.map((x) => keyOf(sortDesc(x)))).size >= goal) window.setTimeout(() => setPhase('ask1'), 900)
  })

  const L = left(st)
  const latest = log[log.length - 1]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <Pie st={st} dnd={dnd} locked={phase !== 'play'} label={`Pastada ${L} dilim`} />
          <Plates st={st} dnd={dnd} wrong={s.wrong} locked={phase !== 'play'} flash={hit} />
          {s.view('work')}
          <Status>
            {L > 0 ? <>Pastada <b className="text-ink">{L}</b> dilim kaldı. Hepsi dağıtılınca deftere yazılır.</> : latest ? <>Deftere yazıldı: <b className="text-ink">{latest.join(' · ')}</b> · Farklı sayılar: <b className="text-ink">{kinds.size} / {goal}</b></> : null}
          </Status>
          <div className="flex justify-end">
            <ResetButton onClick={() => { s.clear(); setSt(fresh(5)) }} disabled={phase !== 'play' || L === 12} />
          </div>
        </Stage>
      }
      panel={
        <>
          {phase === 'play' && (
            <Prompt step={`Farklı dağıtım ${Math.min(kinds.size, goal)} / ${goal}`}>
              {log.length === 0
                ? <>12 dilimi 5 arkadaşa <b>istediğin gibi</b> dağıt. Pastadan bir dilimi tutup bir tabağa sürükle. Herkes aynı sayıda almak zorunda değil; biri hiç almayabilir de!</>
                : <>Yeni dağıtımlar bul: bir tabaktaki dilimlere dokunup başka bir tabağa sürükle. Sayıları farklı <b>{goal}</b> dağıtım bul.</>}
            </Prompt>
          )}
          {s.view('panel')}
          <Ledger log={log} flash={flash} />
          {phase === 'ask1' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('ask2')}
                okText="Evet! Saymadan önce neyi saydığımıza karar vermeliyiz."
                ask={{
                  q: 'Ali 3, Ece 2 dilim alıyor. Sonra Ali 2, Ece 3 dilim alıyor (diğerleri aynı). Bu iki dağıtım farklı mı?',
                  options: [
                    { label: 'Kimin aldığına bakarsak farklı; yalnızca sayılara bakarsak aynı', ok: true },
                    { label: 'Hep aynıdır: sayılar yine 3 ve 2', nudge: 'Ali’ye sor: 3 dilim yemek ile 2 dilim yemek Ali için aynı mı? Defterde “Kim kaç aldı?” görünümüne bak.' },
                    { label: 'Hep farklıdır: Ali’nin dilimi değişti', nudge: 'Defterde “Yalnızca sayılar” görünümüne bak. Kimin aldığına bakmazsak 3, 3, 2, 2, 2 ile 3, 3, 2, 2, 2 farklı mı?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {(phase === 'ask2' || phase === 'done') && (
            <Reveal>
              <Card className="bg-sky-50! ring-sky-300!">
                <p className="mb-1.5 text-[11px] font-black tracking-wide text-sky-800 uppercase">Kaç yol var? Bilgisayarla saydık</p>
                <ul className="space-y-1 text-[15px] font-extrabold">
                  <li>Kimin aldığı önemliyse: <b className="text-xl text-sky-800 tabular-nums">{n(ALL_ORDERED)}</b> yol</li>
                  <li>Herkes en az 1 dilim alırsa: <b className="text-xl text-sky-800 tabular-nums">{n(ALL_POSITIVE)}</b> yol</li>
                  <li>Yalnızca sayılara bakarsak: <b className="text-xl text-sky-800 tabular-nums">{ALL_UNORDERED}</b> yol</li>
                </ul>
                <p className="mt-1.5 text-sm font-bold text-ink-soft">Sen {log.length} tane buldun. Hepsini tek tek denemek günler sürerdi!</p>
              </Card>
              {phase === 'ask2' && (
                <DragAsk
                  checks={checks}
                  onOk={() => setPhase('done')}
                  okText="Evet! Sonraki görevlerde küçük durumlarla başlayıp düzenli sayacağız."
                  ask={{
                    q: 'Bu kadar çok yolu, hiçbirini kaçırmadan nasıl sayabiliriz?',
                    options: [
                      { label: 'Düzenli sayarak: bir sıraya göre yazar, önce küçük durumlara bakarız', ok: true },
                      { label: 'Rastgele denemeye devam ederek', nudge: 'Rastgele denerken aynı dağıtımı ikinci kez bulduğun oldu mu? Birini kaçırıp kaçırmadığını nasıl anlarsın?' },
                      { label: 'Sayamayız, çok fazla', nudge: 'Çok fazla olunca da sayabiliriz, yeter ki düzenli olalım. Önce daha küçük bir soru düşün: 5 dilimi 2 kişi kaç yolla paylaşır?' },
                    ],
                  }}
                />
              )}
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 2. Adil paylaşım ───────────── */

function FairTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [st, setSt] = useState<St>(() => fresh(5))
  const [phase, setPhase] = useState<'deal' | 'ask1' | 'ask2' | 'done'>('deal')
  const [hit, setHit] = useFlash<number>()
  const rules = ['12 dilimi 5 kişiye eşit paylaştırınca herkes 2 dilim alır, 2 dilim artar: 12\u00a0=\u00a05\u00a0×\u00a02\u00a0+\u00a02. Herkes 3’er alamaz, çünkü 5\u00a0×\u00a03\u00a0=\u00a015, 12’den fazla.']

  const dnd = useDnd((item, target) => {
    if (phase !== 'deal') return false
    const m = move(st, item, target)
    if (!m || 'full' in m) return false
    s.clear()
    setSt(m.st)
    if (m.to >= 0) setHit(m.to)
    const p = m.st.plates
    const L = left(m.st)
    const max = Math.max(...p)
    const eq = p.every((x) => x === p[0])
    const lacking = p.filter((x) => x < max).length
    if (eq && p[0] > 0 && L < p.length) {
      sfx.ok()
      window.setTimeout(() => setPhase('ask1'), 800)
    } else if (eq && p[0] > 0) s.tell(`Herkes ${p[0]} dilim aldı: eşit! Pastada ${L} dilim var. Herkese bir tur daha dağıtabilir misin?`)
    else if (lacking > L) s.tell(`Herkesin ${max} dilimi olsun diye ${lacking} dilim daha gerekir ama pastada ${L} dilim var. Herkes eşit alsın diye başka ne yapabilirsin? Dilimleri tabaktan pastaya da geri koyabilirsin.`)
  })

  const L = left(st)
  const p = st.plates
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <Pie st={st} dnd={dnd} locked={phase !== 'deal'} label={`Pastada ${L} dilim`} />
          <Plates st={st} dnd={dnd} wrong={s.wrong} locked={phase !== 'deal'} flash={hit} />
          {s.view('work')}
          <Status>Tabaklarda: <b className="text-ink">{p.join(' · ')}</b> · Pastada: <b className="text-ink">{L}</b></Status>
          {phase === 'deal' && <div className="flex justify-end"><ResetButton onClick={() => { s.clear(); setSt(fresh(5)) }} disabled={L === 12} /></div>}
        </Stage>
      }
      panel={
        <>
          <Prompt step={phase === 'deal' ? 'Eşit paylaş' : 'Herkes eşit!'}>
            {phase === 'deal'
              ? <>Bu kez <b>herkes eşit</b> alsın ve her biri <b>olabildiğince çok</b> dilim alsın. Dilimleri tek tek tabaklara sürükle. Pastada dilim artabilir!</>
              : <>Herkes <b>2</b> dilim aldı, pastada <b>2</b> dilim arttı.</>}
          </Prompt>
          {s.view('panel')}
          {phase === 'ask1' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('ask2')}
                okText="Evet! 5 kişiye 3’er dilim için 15 dilim gerekirdi; bizde 12 var."
                ask={{
                  q: 'Neden herkes 3’er dilim alamıyor?',
                  options: [
                    { label: '3’er alsalar 5 × 3 = 15 dilim gerekir; 12’den fazla', ok: true },
                    { label: 'Çünkü 12 tek sayı değil', nudge: 'Herkes 2’şer alınca 5 × 2 = 10 dilim gitti. Herkes 3’er alsaydı kaç dilim gerekirdi?' },
                    { label: 'Alabilirler: 3’er alırlar, 3 dilim artar', nudge: 'Dene: 5 tabağa 3’er dilim kaç dilim eder? Pastada o kadar dilim var mıydı?', mis: 'Paylaştırmada gereken dilim sayısını ve artanı karıştırıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'ask2' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={grade >= 4 ? 'Doğru! 12 = 5 × 2 + 2: herkes 2 dilim, 2 dilim artar.' : 'Doğru! 5 kişi × 2 dilim = 10 dilim, artan 2 dilimle 12.'}
                ask={grade >= 4 ? {
                  q: 'Bu paylaşımı hangi bölme anlatır?',
                  options: [
                    { label: '12 ÷ 5 = 2, kalan 2', ok: true },
                    { label: '12 ÷ 5 = 2', nudge: '5 × 2 kaç eder? Pastada kalan 2 dilim bu bölmenin neresinde?', mis: 'Bölmede kalanı yok sayıyor' },
                    { label: '12 ÷ 5 = 3, kalan 3', nudge: '5 × 3 kaç eder? 12’den büyük mü küçük mü?' },
                  ],
                } : {
                  q: 'Bu paylaşımı hangisi doğru anlatır?',
                  options: [
                    { label: '12 = 5 × 2 + 2', ok: true },
                    { label: '12 = 5 × 2', nudge: '5 × 2 kaç eder? Pastada kalan 2 dilim nereye gitti?', mis: 'Paylaştırmada artanı yok sayıyor' },
                    { label: '12 = 2 × 2 + 5', nudge: '2 × 2 + 5 kaç eder? Kaç kişiye kaçar dilim verdin?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 3. Artan dilimler ───────────── */

/** Kesme tahtası: dilim bırakılınca 5 eşit parçaya kesilir, parçalar sürüklenebilir (q-j) */
function Board({ dnd, cutting, board, active, finished }: { dnd: ReturnType<typeof useDnd>; cutting: boolean; board: number; active: boolean; finished: boolean }) {
  return (
    <Drop dnd={dnd} id="knife" className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-4 border-amber-700/40 bg-[repeating-linear-gradient(90deg,#f8d9a8_0,#f8d9a8_18px,#f3cf98_18px,#f3cf98_36px)] p-2 sm:p-3">
      <p className="text-xs font-black tracking-wide text-amber-900 uppercase">🔪 Kesme tahtası</p>
      {cutting ? (
        <svg viewBox="0 0 100 100" width={110} height={110} aria-hidden>
          <style>{'@keyframes pcCut{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}'}</style>
          <SliceArt cx={50} cy={94} r={88} a0={-15} a1={15} k={2} />
          {[1, 2, 3, 4].map((c) => {
            const a = ((-15 + c * 6) * Math.PI) / 180
            return <line key={c} x1={50} y1={94} x2={50 + 88 * Math.sin(a)} y2={94 - 88 * Math.cos(a)} stroke="#334155" strokeWidth={2} strokeDasharray="100" style={{ animation: `pcCut 0.5s ${c * 0.12}s ease-out both` }} />
          })}
        </svg>
      ) : board > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: board }, (_, j) => (
            <Drag key={j} dnd={dnd} item={`q-${j}`} label="Beşte bir dilim" ghost={<PieceToken size={72} />} className="grid min-h-16 min-w-14 place-items-center rounded-2xl bg-white/90 p-1 shadow-[0_3px_0_#d6a76a] ring-2 ring-amber-600/40">
              <PieceToken size={56} />
            </Drag>
          ))}
        </div>
      ) : (
        <p className={`max-w-[15rem] text-center text-sm font-black text-amber-900 ${active ? '' : 'opacity-60'}`}>{finished ? 'Bütün parçalar dağıtıldı.' : active ? 'Artan bir dilimi buraya sürükle: 5 eşit parçaya keselim.' : 'Önce ne yapacağımıza karar verelim.'}</p>
      )}
    </Drop>
  )
}

function LeftoverTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [st, setSt] = useState<St>(() => ({ pie: Array.from({ length: 12 }, (_, k) => k < 2), home: 12, plates: [2, 2, 2, 2, 2] }))
  const [pieces, setPieces] = useState([0, 0, 0, 0, 0])
  const [cuts, setCuts] = useState(0)
  const [board, setBoard] = useState(0)
  const [cutting, setCutting] = useState(false)
  const [phase, setPhase] = useState<'ask' | 'cut' | 'q1' | 'q2' | 'done'>('ask')
  const [hit, setHit] = useFlash<number>()
  const g4 = grade >= 4
  const rules = [g4
    ? 'Artanı da eşit paylaşmak için her dilimi 5 eşit parçaya keseriz. Her parça bir dilimin beşte biridir (1/5); herkes 2 tam 2/5 dilim alır.'
    : 'Artanı da eşit paylaşmak için her dilimi 5 eşit parçaya keseriz. Her parça bir dilimin beşte biridir; herkes 2 dilim ve 2 tane beşte bir dilim alır.']

  const dnd = useDnd((item, target) => {
    if (phase !== 'cut') return false
    if (item.startsWith('s-')) {
      if (target.startsWith('to-')) return s.tell('Bu dilimi bir kişiye verirsek ötekiler ne der? Herkes eşit alsın diye önce kesme tahtasında 5 eşit parçaya kes.', { at: Number(target.slice(3)) })
      if (target !== 'knife') return false
      if (cutting || board > 0) return s.tell('Önce tahtadaki parçaları tabaklara dağıt, sonra öteki dilimi kes.')
      const k = Number(item.slice(2))
      const pie = st.pie.slice()
      pie[k] = false
      s.clear()
      setSt({ ...st, pie })
      setCuts(cuts + 1)
      setCutting(true)
      window.setTimeout(() => {
        setCutting(false)
        setBoard(5)
      }, 1100)
      return
    }
    if (item.startsWith('q-') && target.startsWith('to-')) {
      const i = Number(target.slice(3))
      if (pieces[i] >= cuts) return s.tell(`${PEOPLE[i].name} bu dilimden parçasını aldı. Parçayı henüz almayan birine ver.`, { at: i })
      s.clear()
      const next = pieces.slice()
      next[i]++
      setPieces(next)
      setHit(i)
      setBoard(board - 1)
      if (board - 1 === 0 && cuts === 2) {
        sfx.ok()
        window.setTimeout(() => setPhase('q1'), 800)
      }
      return
    }
    return false
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="mx-auto w-full max-w-[240px]"><Pie st={st} dnd={dnd} locked={phase !== 'cut'} label={`Artan: ${left(st)} dilim`} /></div>
            <Board dnd={dnd} cutting={cutting} board={board} active={phase === 'cut'} finished={phase !== 'ask' && phase !== 'cut'} />
          </div>
          <Plates st={st} dnd={dnd} wrong={s.wrong} locked pieces={pieces} flash={hit} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Prompt step={phase === 'ask' ? 'Artan 2 dilim' : phase === 'cut' ? `Kesilen dilim ${cuts} / 2` : 'Herkesin tabağı'}>
            {phase === 'ask' && <>Herkes 2’şer dilim aldı, pastada <b>2 dilim</b> arttı. Kimse küsmesin: artan dilimleri de herkes eşit paylaşsın.</>}
            {phase === 'cut' && <>Artan bir dilimi <b>kesme tahtasına</b> sürükle. 5 eşit parçaya kesilince her parçayı bir tabağa sürükle: herkese birer parça!</>}
            {(phase === 'q1' || phase === 'q2' || phase === 'done') && <>Her tabakta 2 dilim ve 2 küçük parça var. Pastadan hiçbir şey artmadı.</>}
          </Prompt>
          {s.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('cut')}
                okText="Evet! İstersek saklayabiliriz de; ama herkes eşit yesin istiyorsak her dilimi kişi sayısı kadar, 5 eşit parçaya keseriz."
                ask={{
                  q: 'Artan 2 dilimi herkes eşit paylaşsın. Ne yapabiliriz?',
                  options: [
                    { label: 'Her dilimi 5 eşit parçaya keseriz, herkes birer parça alır', ok: true },
                    { label: 'Artan 2 dilimi Ali ile Ece’ye veririz', nudge: 'O zaman Ali ile Ece 3’er, ötekiler 2’şer dilim alır. Herkes eşit mi?', mis: 'Eşit paylaşmada artanı bazı kişilere veriyor' },
                    { label: 'Her dilimi 2 eşit parçaya keseriz', nudge: '2 dilimin her biri 2 parçaya kesilirse kaç parça olur? 5 kişiye birer tane yeter mi?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'q1' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('q2')}
                okText={g4 ? 'Evet! Bir dilim 5 eşit parçaya kesildi: her parça 1/5 dilim.' : 'Evet! Bir dilim 5 eşit parçaya kesildi: her parça beşte bir dilim.'}
                ask={{
                  q: 'Bir küçük parça, bir dilimin ne kadarı?',
                  options: [
                    { label: g4 ? 'Beşte biri (1/5)' : 'Beşte biri', ok: true },
                    { label: 'Yarısı', nudge: 'Dilim kaç eşit parçaya kesildi? Yarısı olsaydı dilim kaç parçaya kesilirdi?' },
                    { label: g4 ? 'Onda biri (1/10): toplam 10 parça var' : 'Onda biri: toplam 10 parça var', nudge: 'Her parça tek bir dilimden kesildi. O tek dilim kaç eşit parçaya bölündü?', mis: 'Birim kesri bütünün parça sayısıyla değil, toplam parça sayısıyla adlandırıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'q2' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={g4 ? 'Harika! Her kişi 2 tam 2/5 dilim yedi. 5 kişi × 2 tam 2/5 = 12 dilim.' : 'Harika! Her kişi 2 dilim ve 2 tane beşte bir dilim yedi.'}
                ask={g4 ? {
                  q: 'Her kişi ne kadar pasta yedi?',
                  options: [
                    { label: '2 tam 2/5 dilim', ok: true },
                    { label: '2 tam 2/10 dilim', nudge: 'Bir dilim kaç eşit parçaya kesildi: 5 mi, 10 mu? Her kişi bir dilimin kaç beşte birini aldı?', mis: 'Kesrin paydasını toplam parça sayısı olarak alıyor' },
                    { label: '4 dilim: 2 dilim + 2 parça', nudge: 'Küçük bir parça ile bir dilim aynı büyüklükte mi? Tabağa bak.', mis: 'Farklı büyüklükteki parçaları aynı birim gibi sayıyor' },
                  ],
                } : {
                  q: 'Her kişi ne kadar pasta yedi?',
                  options: [
                    { label: '2 dilim ve 2 tane beşte bir dilim', ok: true },
                    { label: '4 dilim: 2 dilim + 2 parça', nudge: 'Küçük bir parça ile bir dilim aynı büyüklükte mi? Tabağa bak.', mis: 'Farklı büyüklükteki parçaları aynı birim gibi sayıyor' },
                    { label: '2 dilim ve yarım dilim', nudge: 'Bir dilimin 5 parçasından 2’si mi aldı, yarısını mı? 2 parça, 5 parçanın yarısı mı?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 4. Düzenli say: 5 dilim, 2 kişi ───────────── */

function CountTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [st, setSt] = useState<St>(() => fresh(2, 5))
  const [found, setFound] = useState<number[]>([])
  const [phase, setPhase] = useState<'play' | 'ask' | 'ask12' | 'pattern' | 'done'>('play')
  const [flash, setFlash] = useFlash<number>()
  const [hit, setHit] = useFlash<number>()
  const rules = ['n dilimi 2 kişiye paylaştırmanın n + 1 yolu var: Ali 0, 1, 2, … n dilim alabilir, Ece kalanı alır. Düzenli sayınca hiçbir yolu kaçırmayız; sıfırı da unutmayız!']

  /** Örüntü tablosu: her açılışta farklı iki dilim sayısı */
  const pat = useMemo(() => {
    const a = pick(grade >= 4 ? [6, 7, 8, 9] : [2, 3, 4])
    const b = pick(grade >= 4 ? [15, 18, 20, 24, 30] : [7, 8, 9, 10])
    return { a, b, cards: shuffle([a + 1, b + 1, a, b, b + 2]) }
  }, [grade])
  const [filled, setFilled] = useState<Record<number, number>>({})

  const dnd = useDnd((item, target) => {
    if (phase === 'pattern') {
      if (!target.startsWith('gap-')) return false
      const row = Number(target.slice(4))
      const v = pat.cards[Number(item.slice(5))]
      if (filled[row] !== undefined) return false
      if (v !== row + 1) {
        const mis = v === row ? 'Sıfırı (hiç almamayı) saymayı unutuyor' : undefined
        return s.nudge(`${row} dilimde Ali en az 0, en çok ${row} dilim alabilir. 0’dan başlayarak say: 0, 1, 2, … Kaç sayı var?`, { mis, at: row })
      }
      s.clear()
      sfx.ok()
      const f = { ...filled, [row]: v }
      setFilled(f)
      if (Object.keys(f).length === 2) window.setTimeout(() => setPhase('done'), 600)
      return
    }
    if (phase !== 'play') return false
    const m = move(st, item, target)
    if (!m || 'full' in m) return false
    s.clear()
    setSt(m.st)
    if (m.to >= 0) setHit(m.to)
    if (left(m.st) > 0) return
    const a = m.st.plates[0]
    if (found.includes(a)) {
      s.tell('Bu yol tabloda zaten var. Bir dilimi bir tabaktan ötekine taşı: yeni bir yol olur.')
      return
    }
    const f = [...found, a]
    setFound(f)
    setFlash(a)
    sfx.ok()
    if (f.length === 6) window.setTimeout(() => setPhase('ask'), 800)
  })

  const rows = [...found].sort((x, y) => x - y)
  const table = (
    <Card>
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-emerald-700 uppercase">📋 Düzenli tablo · {found.length} yol</p>
      <div className="grid grid-cols-2 gap-1 text-center">
        <p className="rounded-lg py-1 text-sm font-black text-white" style={{ background: PEOPLE[0].color }}>{PEOPLE[0].emoji} Ali</p>
        <p className="rounded-lg py-1 text-sm font-black text-white" style={{ background: PEOPLE[1].color }}>{PEOPLE[1].emoji} Ece</p>
        {rows.map((a) => (
          <div key={a} className={`contents`}>
            <p className={`rounded-lg bg-blue-50 py-1 text-xl font-black tabular-nums text-blue-800 ring-1 ring-blue-200 ${flash === a ? 'animate-pop ring-2 ring-blue-500' : ''}`}>{a}</p>
            <p className={`rounded-lg bg-pink-50 py-1 text-xl font-black tabular-nums text-pink-800 ring-1 ring-pink-200 ${flash === a ? 'animate-pop ring-2 ring-pink-500' : ''}`}>{5 - a}</p>
          </div>
        ))}
      </div>
      {!found.length && <p className="mt-1 text-sm font-bold text-ink-soft">Pasta bitince yol buraya yazılır.</p>}
    </Card>
  )

  if (phase === 'pattern' || phase === 'done') {
    const lines: { d: number; y: number | null }[] = [{ d: 5, y: 6 }, { d: pat.a, y: filled[pat.a] ?? null }, { d: 12, y: 13 }, { d: pat.b, y: filled[pat.b] ?? null }].sort((x, y) => x.d - y.d)
    const used = Object.values(filled)
    return (
      <Split
        work={
          <Stage className="space-y-3 p-3 sm:p-4">
            <p className="text-center text-base font-black text-ink">2 kişi bir pastayı paylaşıyor</p>
            <div className="mx-auto grid max-w-md grid-cols-2 gap-1.5 text-center">
              <p className="rounded-xl bg-amber-500 py-1.5 text-sm font-black text-white">🍰 Dilim sayısı</p>
              <p className="rounded-xl bg-emerald-600 py-1.5 text-sm font-black text-white">Kaç yol?</p>
              {lines.map((r) => (
                <div key={r.d} className="contents">
                  <p className={`grid h-16 place-items-center rounded-xl bg-amber-50 text-3xl font-black tabular-nums text-amber-800 ring-1 ring-amber-200 ${s.wrong === r.d ? 'animate-shake ring-4 ring-amber-400' : ''}`}>{r.d}</p>
                  {r.y !== null ? (
                    <p className="grid h-16 place-items-center rounded-xl bg-emerald-50 text-3xl font-black tabular-nums text-emerald-800 ring-1 ring-emerald-300 animate-pop">{r.y}</p>
                  ) : (
                    <Drop dnd={dnd} id={`gap-${r.d}`} className="grid h-16 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 text-xl font-black text-sky-500">?</Drop>
                  )}
                </div>
              ))}
            </div>
            {s.view('work')}
            {phase === 'pattern' && (
              <Sticky>
                <Tray title="Sayı kartları">
                  {pat.cards.map((v, i) => (used.includes(v) ? null : <Drag key={i} dnd={dnd} item={`card-${i}`} label={`${v} kartı`} className={TOKEN}>{v}</Drag>))}
                </Tray>
              </Sticky>
            )}
          </Stage>
        }
        panel={
          <>
            <Prompt step="Örüntü">Tabloda bir örüntü var. Doğru sayı kartını tutup <b>?</b> kutusuna sürükle. Dilim sayısı ile yol sayısı arasında nasıl bir ilişki var?</Prompt>
            {s.view('panel')}
            {phase === 'done' && (
              <Reveal>
                <RulesFound rules={rules} />
                <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
              </Reveal>
            )}
          </>
        }
      />
    )
  }

  const L = left(st)
  const missingEnds = found.length >= 3 && (!found.includes(0) || !found.includes(5))
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="mx-auto w-full max-w-[260px]"><Pie st={st} dnd={dnd} locked={phase !== 'play'} label={`Pastada ${L} dilim`} /></div>
          <Plates st={st} dnd={dnd} wrong={s.wrong} locked={phase !== 'play'} flash={hit} />
          {s.view('work')}
          <div className="lg:hidden">{table}</div>
          {phase === 'play' && <div className="flex justify-end"><ResetButton onClick={() => { s.clear(); setSt(fresh(2, 5)) }} disabled={L === 5} /></div>}
        </Stage>
      }
      panel={
        <>
          {phase === 'play' && (
            <Prompt step={`Küçük bir soru · ${found.length} yol`}>
              Pastadan <b>5 dilim</b> kaldı; Ali ile Ece paylaşacak. <b>Kaç farklı yolla</b> paylaşabilirler? Kimin aldığı önemli. Dilimleri dağıt; pasta bitince yol tabloya yazılır. Sonra bir dilimi tabaktan tabağa taşı.
              {missingEnds && <span className="mt-1 block text-base text-emerald-800">Tabloya bak: sıra Ali’nin dilim sayısına göre. Ali’nin alabileceği en az ve en çok dilim kaç?</span>}
            </Prompt>
          )}
          {s.view('panel')}
          <div className="hidden lg:block">{table}</div>
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('ask12')}
                okText="Evet! Ali 0, 1, 2, 3, 4 ya da 5 dilim alır; Ece kalanı alır. 6 yol."
                ask={{
                  q: 'Tablo Ali’nin dilim sayısına göre sıralı. Başka bir yol var mı?',
                  options: [
                    { label: 'Yok: Ali 0’dan 5’e kadar alabilir, Ece kalanı alır; 6 yol', ok: true },
                    { label: 'Var: Ali 6 dilim alabilir', nudge: 'Pastada kaç dilim vardı? Ali 6 dilim alabilir mi?' },
                    { label: 'Var: biri yarım dilim alabilir', nudge: 'Bu görevde dilimleri kesmiyoruz. Bütün dilimlerle başka bir yol var mı?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'ask12' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('pattern')}
                okText="Harika! Ali 0’dan 12’ye kadar alabilir: 0, 1, 2, … 12 tam 13 sayı."
                ask={{
                  q: 'Şimdi bütün pasta, 12 dilim. Ali ile Ece kaç farklı yolla paylaşır?',
                  options: [
                    { label: '13 yol: Ali 0’dan 12’ye kadar alabilir', ok: true },
                    { label: '12 yol: 12 dilim var', nudge: 'Ali hiç almazsa da bir yol mu? 5 dilimde Ali 0, 1, 2, 3, 4, 5 alabiliyordu: kaç sayı?', mis: 'Sıfırı (hiç almamayı) saymayı unutuyor' },
                    { label: '24 yol: 12 × 2', nudge: '5 dilimde 5 × 2 = 10 yol mu bulmuştun? Tabloya bak: 5 dilimde kaç yol vardı?' },
                  ],
                }}
              />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 5. Kurallı dağıtım ───────────── */

function LimitTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [st, setSt] = useState<St>(() => fresh(5))
  const [found, setFound] = useState<string[]>([])
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const [flash, setFlash] = useFlash<string>()
  const [hit, setHit] = useFlash<number>()
  const total = LIMITED.length
  const rules = [`Kurallar eklenince yollar azalır ve hepsi listelenebilir: herkes 1 ile 4 dilim arasında alırsa yalnızca ${total} farklı dağıtım var. En büyük sayıdan başlayıp düzenli yazınca hiçbirini kaçırmayız.`]

  const dnd = useDnd((item, target) => {
    if (phase !== 'play') return false
    const m = move(st, item, target, 4)
    if (!m) return false
    if ('full' in m) return s.tell(`Kimse 4’ten fazla alamaz: ${PEOPLE[m.full].gen} tabağında 4 dilim var.`, { at: m.full })
    s.clear()
    setSt(m.st)
    if (m.to >= 0) setHit(m.to)
    if (left(m.st) > 0) return
    const empty = m.st.plates.findIndex((x) => x === 0)
    if (empty >= 0) {
      s.tell(`${PEOPLE[empty].gen} tabağı boş. Herkes en az 1 dilim almalı: bir tabaktan ona bir dilim taşı.`, { at: empty })
      return
    }
    const k = keyOf(sortDesc(m.st.plates))
    if (found.includes(k)) {
      s.tell(`${listText(sortDesc(m.st.plates))} listede zaten var: yalnızca kimin aldığı değişti. Sayıları farklı bir dağıtım ara.`)
      return
    }
    const f = [...found, k]
    setFound(f)
    setFlash(k)
    sfx.ok()
    if (f.length === total) window.setTimeout(() => setPhase('ask'), 900)
  })

  const groups = [4, 3].map((top) => ({ top, list: LIMITED.filter((x) => x[0] === top) }))
  const L = left(st)
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <Pie st={st} dnd={dnd} locked={phase !== 'play'} label={`Pastada ${L} dilim`} />
          <Plates st={st} dnd={dnd} wrong={s.wrong} locked={phase !== 'play'} cap={4} flash={hit} />
          {s.view('work')}
          <Status>
            Bulunan: <b className="text-ink">{found.length} / {total}</b>
            {found.length > 0 && <> · Son bulduğun: <b className="text-ink">{found[found.length - 1].split('-').join(', ')}</b></>}
          </Status>
          {phase === 'play' && <div className="flex justify-end"><ResetButton onClick={() => { s.clear(); setSt(fresh(5)) }} disabled={L === 12} /></div>}
        </Stage>
      }
      panel={
        <>
          {phase === 'play' && (
            <Prompt step={`Bulunan ${found.length} / ${total}`}>
              Yeni kurallar: <b>herkes en az 1</b>, <b>en çok 4</b> dilim alacak. Kimin aldığına bakmıyoruz, yalnızca sayılara. Bu kurallarla tam <b>{total}</b> farklı dağıtım var. Hepsini bul!
            </Prompt>
          )}
          {s.view('panel')}
          <Card>
            <p className="mb-1.5 text-[11px] font-black tracking-wide text-violet-700 uppercase">📝 Dağıtım listesi · büyükten küçüğe</p>
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.top}>
                  <p className="mb-1 text-xs font-black text-ink-soft">En çok alan {g.top} dilim alırsa:</p>
                  <ul className="space-y-1">
                    {g.list.map((x) => {
                      const k = keyOf(x)
                      const ok = found.includes(k)
                      return (
                        <li key={k} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ring-1 transition ${ok ? 'bg-emerald-50 ring-emerald-400' : 'bg-white ring-line'} ${flash === k ? 'animate-pop ring-4' : ''}`}>
                          <span className={`grid size-6 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{ok ? <Check size={15} strokeWidth={3} /> : '?'}</span>
                          <span className="text-lg font-black tracking-wide tabular-nums">{ok ? listText(x) : `${x[0]}, ?, ?, ?, ?`}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={`Evet! En çok alan 2 dilim alırsa en fazla 10 dilim dağıtılır. Kimin aldığı önemli olsaydı bu ${total} dağıtım ${LIMITED_ORDERED} yol ederdi.`}
                ask={{
                  q: 'Listede en çok alanın 3 ya da 4 dilim aldığı dağıtımlar var. Neden en çok alan kişi yalnızca 2 dilim alamaz?',
                  options: [
                    { label: 'Herkes en çok 2 alırsa 5 × 2 = 10 dilim eder; 12’ye yetmez', ok: true },
                    { label: 'Alabilir: 2, 2, 2, 2, 2', nudge: 'Topla: 2 + 2 + 2 + 2 + 2 kaç eder? Pastada kaç dilim vardı?' },
                    { label: 'Çünkü 2 çift sayı', nudge: 'Eşit paylaşım görevini hatırla: herkes 2’şer alınca kaç dilim artmıştı?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── kural defteri ───────────── */

function EndView({ rules, onFinish }: { rules: string[]; onFinish: () => void }) {
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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları ezberlemedin: hepsini pastayı paylaştırarak kendin buldun.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}
