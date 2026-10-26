import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ListChecks, Scale, Sparkles } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { DiceSvg } from '../../components/Visual'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Choice, LastTask, NextButton, Panel, Pill, Stepper, TopBar, Work, drawIndex, fmtN, shuffle, starsBy, useLook, useSay, type Look } from '../veri-toplama/kit'
import { Spinner, useTrials, type Out } from '../olasilik-simulatoru/devices'

/**
 * 66. Rastgele mi, Adil mi? (5–8)
 *  Her oyun: kuralı oku → adil mi tahmin et → çok tur oyna (deney) → tüm sonuçları listele/tabloya dök (açıkla)
 *  → (bazı oyunlarda) kuralı değiştirerek oyunu adil yap. Farklı adil tasarımlar useSolutions ile sayılır.
 *  Görünümler: kutucuklar (iki para, tek zar), çark (ağırlıklı dilimler), 6×6 zar tablosu (toplam/çarpım), 3×3 taş-kâğıt-makas.
 */

const A = { name: 'Ayşe', color: '#db2777', soft: '#fce7f3' }
const C = { name: 'Can', color: '#0891b2', soft: '#cffafe' }
const PL = [A, C]
type Own = 0 | 1 | null

interface Cell { label: string; w: number; cls: number }
interface Game {
  id: string
  title: string
  rule: string
  view: 'coins' | 'die' | 'spinner' | 'dice' | 'rps'
  cells: Cell[]
  classes: string[]
  /** kurala göre her sınıfın sahibi */
  owner: (0 | 1)[]
  redesign?: 'classes' | 'points'
  need?: number
  /** “kaç farklı sonuç var?” sorusu (iki para) */
  countQ?: boolean
  why: string
  tool?: 'probability' | 'rastgeledeney'
}

const COINS: Game = {
  id: 'coins', title: 'İki para atılıyor. İkisi aynı gelirse Ayşe, farklı gelirse Can kazanıyor.', rule: 'İki para aynı (YY ya da TT) → Ayşe · Farklı → Can', view: 'coins',
  cells: ['YY', 'YT', 'TY', 'TT'].map((l, i) => ({ label: l, w: 1, cls: i })), classes: ['YY', 'YT', 'TY', 'TT'], owner: [0, 1, 1, 0], countQ: true,
  why: 'İki paranın 4 eş olasılıklı sonucu var: YY, YT, TY, TT. İkisi Ayşe’nin, ikisi Can’ın. Oyun adil!', tool: 'rastgeledeney',
}
const DIE: Game = {
  id: 'die', title: 'Bir zar atılıyor. 1 ya da 2 gelirse Ayşe, 3, 4, 5 ya da 6 gelirse Can kazanıyor.', rule: '1, 2 → Ayşe · 3, 4, 5, 6 → Can', view: 'die',
  cells: [1, 2, 3, 4, 5, 6].map((k, i) => ({ label: String(k), w: 1, cls: i })), classes: ['1', '2', '3', '4', '5', '6'], owner: [0, 0, 1, 1, 1, 1], redesign: 'classes', need: 2,
  why: 'Zarın 6 eş olasılıklı sonucundan 2’si Ayşe’nin, 4’ü Can’ın. Can’ın kazanma şansı iki kat!',
}
const SPIN_COLS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']
const SPIN: Game = {
  id: 'spin', title: 'Çark çevriliyor. Çift sayı gelirse Ayşe, tek sayı gelirse Can kazanıyor.', rule: 'Çift (2, 4) → Ayşe · Tek (1, 3, 5) → Can', view: 'spinner',
  cells: [3, 1, 1, 2, 1].map((w, i) => ({ label: String(i + 1), w, cls: i })), classes: ['1', '2', '3', '4', '5'], owner: [1, 0, 1, 0, 1], redesign: 'classes', need: 2,
  why: 'Dilimler eşit değil! Çarkın 8 eş parçasından 3’ü çift sayılarda (Ayşe), 5’i tek sayılarda (Can).',
}
const sumCells = (f: (a: number, b: number) => number) => Array.from({ length: 36 }, (_, k) => ({ a: Math.floor(k / 6) + 1, b: (k % 6) + 1 })).map(({ a, b }) => ({ label: `${a}-${b}`, w: 1, cls: f(a, b) }))
const SUM_ODD: Game = {
  id: 'sumodd', title: 'İki zar atılıp toplam alınıyor. Toplam tek ise Ayşe, çift ise Can kazanıyor.', rule: 'Toplam tek → Ayşe · Toplam çift → Can', view: 'dice',
  cells: sumCells((a, b) => a + b - 2), classes: Array.from({ length: 11 }, (_, i) => String(i + 2)), owner: Array.from({ length: 11 }, (_, i) => ((i + 2) % 2 ? 0 : 1)) as (0 | 1)[],
  why: '36 eş olasılıklı sonucun 18’inde toplam tek, 18’inde çift. Oyun adil!',
}
const SUM_RANGE: Game = {
  id: 'sumrange', title: 'İki zar atılıp toplam alınıyor. Toplam 2–6 ise Ayşe, 7–12 ise Can kazanıyor.', rule: 'Toplam 2, 3, 4, 5, 6 → Ayşe · 7, 8, 9, 10, 11, 12 → Can', view: 'dice',
  cells: sumCells((a, b) => a + b - 2), classes: Array.from({ length: 11 }, (_, i) => String(i + 2)), owner: Array.from({ length: 11 }, (_, i) => (i + 2 <= 6 ? 0 : 1)) as (0 | 1)[], redesign: 'classes', need: 3,
  why: 'Toplamlar eş olasılıklı değil! Tabloda Ayşe’nin 15, Can’ın 21 hücresi var. 7 toplamı tek başına 6 hücre!',
}
const PRODUCT: Game = {
  id: 'product', title: 'İki zar atılıp çarpım alınıyor. Çarpım çift ise Ayşe, tek ise Can kazanıyor.', rule: 'Çarpım çift → Ayşe · Çarpım tek → Can', view: 'dice',
  cells: sumCells((a, b) => ((a * b) % 2 ? 1 : 0)), classes: ['Çarpım çift', 'Çarpım tek'], owner: [0, 1],
  why: 'Çarpımın tek olması için iki zarın da tek gelmesi gerekir: 3 × 3 = 9 hücre. Kalan 27 hücrede çarpım çift. Ayşe çok avantajlı!',
}
const HANDS = ['✊', '✋', '✌️']
const HAND_N = ['Taş', 'Kâğıt', 'Makas']
const RPS: Game = {
  id: 'rps', title: 'Taş-kâğıt-makas! Berabere biterse Ayşe, biri kazanırsa Can 1 puan alıyor.', rule: 'Berabere → Ayşe 1 puan · Kazanan var → Can 1 puan', view: 'rps',
  cells: Array.from({ length: 9 }, (_, k) => ({ label: `${HAND_N[Math.floor(k / 3)]}-${HAND_N[k % 3]}`, w: 1, cls: Math.floor(k / 3) === k % 3 ? 0 : 1 })), classes: ['Berabere', 'Kazanan var'], owner: [0, 1], redesign: 'points', need: 2,
  why: '9 eş olasılıklı sonucun 3’ü berabere, 6’sında bir kazanan var. Can iki kat sık puan alıyor.',
}

type Task = { kind: 'game'; g: Game } | { kind: 'compare' }

function tasksFor(grade: Grade): Task[] {
  const G = (g: Game): Task => ({ kind: 'game', g })
  switch (grade) {
    case 5: return [G(COINS), { kind: 'compare' }, G(DIE), G(SPIN)]
    case 6: return [G(COINS), G(DIE), G(SUM_ODD), G(SPIN)]
    case 7: return [G(COINS), G(SUM_ODD), G(SUM_RANGE), G(PRODUCT)]
    default: return [G(SUM_ODD), G(PRODUCT), G(SUM_RANGE), G(RPS)]
  }
}

const weightOf = (g: Game, own: Own[], who: 0 | 1) => g.cells.reduce((s, c) => s + (own[c.cls] === who ? c.w : 0), 0)
const totalW = (g: Game) => g.cells.reduce((s, c) => s + c.w, 0)

// ───────────────────────── Sonuç görselleri ─────────────────────────

function Coin2({ s }: { s: string }) {
  return (
    <span className="inline-flex gap-1">
      {s.split('').map((ch, i) => (
        <span key={i} className="grid size-9 place-items-center rounded-full text-base font-black text-amber-900 ring-2 ring-amber-700/60" style={{ background: i === 0 ? 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b)' : 'radial-gradient(circle at 35% 30%, #e5e7eb, #9ca3af)' }}>{ch}</span>
      ))}
    </span>
  )
}

/** Son turun görüntüsü */
function LastRound({ g, last, flick, look }: { g: Game; last: number | null; flick: number; look: Look }) {
  if (g.view === 'spinner') {
    const sec: Out[] = g.cells.map((c, i) => ({ label: c.label, color: SPIN_COLS[i], w: c.w }))
    return <Spinner sectors={sec} last={last} flick={flick} size={170} />
  }
  if (last === null) return <p className={`grid h-28 place-items-center text-center text-sm font-bold ${look.muted}`}>Oynamak için aşağıdaki düğmelere dokun.</p>
  const c = g.cells[last]
  return (
    <div key={flick} className="grid h-28 place-items-center animate-pop">
      {g.view === 'coins' && <Coin2 s={c.label} />}
      {g.view === 'die' && <DiceSvg value={Number(c.label)} size={84} />}
      {g.view === 'dice' && (
        <span className="flex items-center gap-2">
          <DiceSvg value={Number(c.label[0])} size={70} />
          <DiceSvg value={Number(c.label[2])} size={70} />
          <span className={`ml-1 text-xl font-black ${look.strong}`}>{g.id === 'product' ? `= ${Number(c.label[0]) * Number(c.label[2])}` : `= ${Number(c.label[0]) + Number(c.label[2])}`}</span>
        </span>
      )}
      {g.view === 'rps' && <span className="text-5xl">{HANDS[HAND_N.indexOf(c.label.split('-')[0])]} <span className={`text-2xl font-black ${look.muted}`}>vs</span> {HANDS[HAND_N.indexOf(c.label.split('-')[1])]}</span>}
    </div>
  )
}

/** Ayşe – Can yarış çubuğu */
function Race({ look, a, c, unit = 'tur' }: { look: Look; a: number; c: number; unit?: string }) {
  const t = a + c
  return (
    <div>
      <div className={`flex h-12 overflow-hidden rounded-2xl ring-1 ${look.dark ? 'ring-slate-600 bg-slate-700' : 'ring-line bg-slate-100'}`}>
        <div className="grid place-items-center text-sm font-black text-white transition-[width] duration-150" style={{ width: t ? `${(a / t) * 100}%` : '50%', background: A.color, opacity: t ? 1 : 0.35 }}>{t && a / t > 0.12 ? `${A.name} %${fmtN((a / t) * 100, 0)}` : ''}</div>
        <div className="grid flex-1 place-items-center text-sm font-black text-white" style={{ background: C.color, opacity: t ? 1 : 0.35 }}>{t && c / t > 0.12 ? `${C.name} %${fmtN((c / t) * 100, 0)}` : ''}</div>
      </div>
      <div className="relative mx-auto -mt-12 h-12 w-0.5 bg-white/90" aria-hidden />
      <div className={`mt-1 flex justify-between text-sm font-extrabold ${look.muted}`}>
        <span style={{ color: A.color }}>{A.name}: {fmtN(a)} {unit}</span>
        <span style={{ color: C.color }}>{C.name}: {fmtN(c)} {unit}</span>
      </div>
    </div>
  )
}

/** Sınıf etiketine dokunarak sahip ata: boş → Ayşe → Can → Ayşe … */
function OwnerChip({ label, own, onTap, disabled, count, look, bad }: { label: ReactNode; own: Own; onTap: () => void; disabled?: boolean; count?: number; look: Look; bad?: boolean }) {
  const p = own === null ? null : PL[own]
  return (
    <button type="button" onClick={onTap} disabled={disabled} className={`relative flex min-h-12 min-w-12 flex-col items-center justify-center rounded-2xl px-2.5 py-1 font-black transition active:scale-95 ${p ? 'text-white' : look.chip} ${bad ? 'ring-4 ring-amber-400' : ''}`} style={p ? { background: p.color } : undefined}>
      <span className="text-base leading-tight">{label}</span>
      <span className="text-[10px] leading-tight opacity-90">{p ? p.name : 'kimin?'}{count !== undefined ? ` · ${count}` : ''}</span>
    </button>
  )
}

/** Sonuç modeli: kutucuklar, çark, 6×6 ya da 3×3 tablo */
function Model({ g, own, look, onTap, bad, editable }: { g: Game; own: Own[]; look: Look; onTap: (cls: number) => void; bad: number[]; editable: boolean }) {
  const ownColor = (cls: number) => (own[cls] === null ? (look.dark ? '#334155' : '#f1f5f9') : PL[own[cls]!].color)
  if (g.view === 'coins' || g.view === 'die') {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {g.cells.map((c) => (
          <OwnerChip key={c.cls} look={look} own={own[c.cls]} bad={bad.includes(c.cls)} disabled={!editable} onTap={() => onTap(c.cls)} label={g.view === 'coins' ? <Coin2 s={c.label} /> : <DiceSvg value={Number(c.label)} size={46} />} />
        ))}
      </div>
    )
  }
  if (g.view === 'spinner') {
    const sec: Out[] = g.cells.map((c, i) => ({ label: c.label, color: SPIN_COLS[i], w: c.w }))
    return (
      <div className="grid items-center gap-3 sm:grid-cols-[220px_1fr]">
        <div className="relative">
          <Spinner sectors={sec} last={null} flick={0} size={210} onSector={editable ? onTap : undefined} owners={own.map((o, i) => (o === null ? g.cells[i].label : `${g.cells[i].label}·${PL[o].name[0]}`))} />
        </div>
        <div>
          <div className="flex flex-wrap justify-center gap-2">
            {g.cells.map((c) => (
              <OwnerChip key={c.cls} look={look} own={own[c.cls]} bad={bad.includes(c.cls)} disabled={!editable} onTap={() => onTap(c.cls)} label={<span className="flex items-center gap-1"><span className="size-3.5 rounded-full" style={{ background: SPIN_COLS[c.cls] }} />{c.label}</span>} />
            ))}
          </div>
          <p className={`mt-2 text-center text-xs font-bold ${look.muted}`}>Çark 8 eş parçaya bölünmüş gibi düşün: dilimler kaç parça?</p>
          <svg viewBox="0 0 320 30" className="mt-1 w-full" aria-label="Çarkın 8 eş parçası">
            {g.cells.flatMap((c) => Array.from({ length: c.w }, () => c)).map((c, k) => <rect key={k} x={2 + k * 39.5} y={2} width={37} height={26} rx={6} fill={ownColor(c.cls)} stroke={SPIN_COLS[c.cls]} strokeWidth={3} />)}
          </svg>
        </div>
      </div>
    )
  }
  if (g.view === 'rps') {
    return (
      <div className="mx-auto max-w-sm">
        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-center">
          <span className={`text-[10px] font-black ${look.muted}`}>Ayşe ↓ · Can →</span>
          {HANDS.map((h) => <span key={h} className="text-2xl">{h}</span>)}
          {HANDS.map((h, i) => (
            <FragmentRow key={h} h={h}>
              {HANDS.map((h2, j) => {
                const c = g.cells[i * 3 + j]
                return <button key={h2} type="button" disabled={!editable} onClick={() => onTap(c.cls)} className="grid aspect-square place-items-center rounded-xl text-xl font-black text-white transition active:scale-95" style={{ background: ownColor(c.cls), color: own[c.cls] === null ? (look.dark ? '#cbd5e1' : '#1f2340') : '#fff', outline: bad.includes(c.cls) ? '3px solid #fbbf24' : undefined }}>{i === j ? '=' : '★'}</button>
              })}
            </FragmentRow>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {g.classes.map((cl, k) => <OwnerChip key={cl} look={look} own={own[k]} bad={bad.includes(k)} disabled={!editable} onTap={() => onTap(k)} label={cl} count={g.cells.filter((c) => c.cls === k).length} />)}
        </div>
      </div>
    )
  }
  // 6×6 zar tablosu
  const prod = g.id === 'product'
  return (
    <div>
      <div className="mx-auto grid max-w-md grid-cols-7 gap-1 text-center">
        <span className={`grid place-items-center text-xs font-black ${look.muted}`}>{prod ? '×' : '+'}</span>
        {[1, 2, 3, 4, 5, 6].map((b) => <span key={b} className="grid place-items-center"><DiceSvg value={b} size={26} /></span>)}
        {[1, 2, 3, 4, 5, 6].map((a) => (
          <FragmentRow key={a} h={<DiceSvg value={a} size={26} />}>
            {[1, 2, 3, 4, 5, 6].map((b) => {
              const c = g.cells[(a - 1) * 6 + (b - 1)]
              const o = own[c.cls]
              return (
                <button key={b} type="button" disabled={!editable} onClick={() => onTap(c.cls)} className="grid aspect-square min-h-9 place-items-center rounded-lg text-sm font-black tabular-nums transition active:scale-95 sm:text-base" style={{ background: o === null ? (look.dark ? '#334155' : '#fff') : PL[o].color, color: o === null ? (look.dark ? '#e2e8f0' : '#1f2340') : '#fff', boxShadow: bad.includes(c.cls) ? 'inset 0 0 0 3px #fbbf24' : look.dark ? 'inset 0 0 0 1px #475569' : 'inset 0 0 0 1px #e7e8f2' }}>
                  {prod ? a * b : a + b}
                </button>
              )
            })}
          </FragmentRow>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {g.classes.map((cl, k) => <OwnerChip key={cl} look={look} own={own[k]} bad={bad.includes(k)} disabled={!editable} onTap={() => onTap(k)} label={cl} count={g.cells.filter((c) => c.cls === k).length} />)}
      </div>
    </div>
  )
}
function FragmentRow({ h, children }: { h: ReactNode; children: ReactNode }) {
  return <><span className="grid place-items-center text-2xl">{h}</span>{children}</>
}

// ───────────────────────── Oyun görevi ─────────────────────────

type Phase = 'predict' | 'play' | 'count' | 'assign' | 'verdict' | 'redesign' | 'done'
const VERDICTS = [
  { id: 'fair', t: 'Adil' },
  { id: 'A', t: 'Ayşe’nin lehine' },
  { id: 'C', t: 'Can’ın lehine' },
] as const
type Verdict = (typeof VERDICTS)[number]['id']

function GameTask({ g, grade, look, onDone }: { g: Game; grade: Grade; look: Look; onDone: (first: boolean, designs: number) => void }) {
  const track = useTracker()
  const fb = useSay()
  const sols = useSolutions()
  const [phase, setPhase] = useState<Phase>('predict')
  const [pred, setPred] = useState<Verdict | null>(null)
  const [own, setOwn] = useState<Own[]>(() => g.classes.map(() => null))
  const [bad, setBad] = useState<number[]>([])
  const [wrongV, setWrongV] = useState<string[]>([])
  const [pts, setPts] = useState<[number, number]>([1, 1])
  const misses = useRef(0)
  const tr = useTrials({ kind: 'spinner', sectors: g.cells.map((c) => ({ label: c.label, color: '#000', w: c.w })) }, () => drawIndex(g.cells.map((c) => c.w)))
  // tur sayaçları
  let a = 0, c = 0
  g.cells.forEach((cell, i) => (g.owner[cell.cls] === 0 ? (a += tr.counts[i]) : (c += tr.counts[i])))
  const tw = totalW(g)
  const wa = weightOf(g, g.owner, 0)
  const truth: Verdict = wa * 2 === tw ? 'fair' : wa * 2 > tw ? 'A' : 'C'
  const editable = phase === 'assign' || (phase === 'redesign' && g.redesign === 'classes')

  const tap = (cls: number) => {
    if (!editable) return
    setBad((b) => b.filter((x) => x !== cls))
    setOwn((o) => o.map((x, i) => (i === cls ? (x === 0 ? 1 : 0) : x)))
  }

  const checkAssign = () => {
    const wrong = g.classes.map((_, i) => i).filter((i) => own[i] !== g.owner[i])
    track.attempt(!wrong.length)
    if (wrong.length) {
      misses.current++
      setBad(wrong)
      const empty = wrong.filter((i) => own[i] === null)
      fb.say(empty.length ? `Henüz kimseye verilmemiş sonuçlar var (sarı çerçeveli). Kurala göre “${g.classes[empty[0]]}” kimin?` : `Sarı çerçeveli sonuçlara tekrar bak. Kural: ${g.rule}. “${g.classes[wrong[0]]}” bu kurala göre kimin?`)
      return
    }
    sfx.ok()
    setBad([])
    fb.say(`Tüm sonuçları dağıttın: ${A.name} ${g.view === 'spinner' ? `${wa}/8 parça` : `${wa} sonuç`}, ${C.name} ${g.view === 'spinner' ? `${tw - wa}/8 parça` : `${tw - wa} sonuç`}. Şimdi karar ver: oyun adil mi?`, { tone: 'ok' })
    setPhase('verdict')
  }

  const verdict = (v: Verdict) => {
    const ok = v === truth
    track.attempt(ok)
    if (!ok) {
      misses.current++
      setWrongV((w) => [...w, v])
      fb.say(v === 'fair' ? `${A.name}’nin ve ${C.name}’ın kazandığı sonuçları say. Sayılar eşit mi? Her sonuç eş olasılıklı mı?` : `${A.name}: ${wa}, ${C.name}: ${tw - wa}. Kimin kazanma olasılığı daha büyük?`, { mis: v === 'fair' && g.view === 'spinner' ? 'Dilim sayısına bakıp dilim büyüklüğünü göz ardı etti' : undefined })
      return
    }
    sfx.ok()
    const predOk = pred === truth
    if (!predOk && g.id === 'coins') track.misconception('İki parada “aynı”, “farklı” sonuçlarının eş olasılıklı olmadığını (YT ve TY’yi ayrı saymak gerektiğini) fark etmedi')
    if (!predOk && g.id === 'sumrange') track.misconception('İki zarın toplamlarını eş olasılıklı sandı')
    if (!predOk && g.id === 'spin') track.misconception('Çarkta dilim sayısını dilim büyüklüğüyle karıştırdı')
    fb.say(`${g.why} ${predOk ? 'Tahminin de doğruydu!' : 'Tahminin farklıydı; liste/tablo bize nedenini gösterdi.'}${tr.n >= 100 ? ` Deneyde ${A.name}’nin kazandığı turların oranı %${fmtN((a / tr.n) * 100, 0)} oldu.` : ''}`, { tone: 'ok' })
    if (g.redesign && truth !== 'fair') {
      setPhase('redesign')
      if (g.redesign === 'points') setPts([1, 1])
    } else {
      track.item(misses.current === 0)
      setPhase('done')
    }
  }

  const saveDesign = () => {
    if (g.redesign === 'points') {
      const tie = g.cells.filter((cc) => cc.cls === 0).length
      const win = tw - tie
      const fair = tie * pts[0] === win * pts[1]
      track.attempt(fair)
      if (!fair) {
        misses.current++
        fb.say(`9 turda ortalama ${tie} kez berabere, ${win} kez kazanan olur. ${A.name} ${tie} × ${pts[0]} = ${tie * pts[0]} puan, ${C.name} ${win} × ${pts[1]} = ${win * pts[1]} puan bekler. Eşit olması için puanlar nasıl olmalı?`, { mis: 'Adilliği beklenen puanla ilişkilendirmedi' })
        return
      }
      const fresh = sols.add(`${pts[0]}-${pts[1]}`, `Berabere ${pts[0]} puan, kazanan ${pts[1]} puan`)
      if (!fresh) return fb.say('Bu puanlamayı zaten buldun. Başka bir adil puanlama var mı?')
      const n = sols.list.length + 1
      fb.say(n >= (g.need ?? 1) ? 'Süper! Sonuçlar eşit sayıda olmasa da puanlar dengelenirse oyun adil olur: beklenen puanlar eşit.' : `Adil! ${A.name} ve ${C.name} 9 turda ortalama eşit puan alır. Başka bir adil puanlama bul.`, { tone: 'ok' })
      if (n >= (g.need ?? 1)) { track.item(misses.current === 0); setPhase('done') }
      return
    }
    if (own.some((x) => x === null)) {
      fb.say('Her sonuç birine ait olmalı. Boş kalan sonuçları da dağıt.')
      return
    }
    const wa2 = weightOf(g, own, 0)
    const fair = wa2 * 2 === tw
    track.attempt(fair)
    if (!fair) {
      misses.current++
      fb.say(`${A.name}: ${wa2}, ${C.name}: ${tw - wa2}${g.view === 'spinner' ? ' parça' : ' sonuç'}. Adil olması için ikisinin de kaçar ${g.view === 'spinner' ? 'parçası' : 'sonucu'} olmalı? Hangi sonucu el değiştirebilirsin?`, { mis: g.view === 'dice' && Math.abs(own.filter((x) => x === 0).length * 2 - g.classes.length) <= 1 ? 'Toplam sayısını eşit bölmeyi yeterli sandı (toplamların eş olasılıklı olmadığını göz ardı etti)' : undefined })
      return
    }
    const key = own.join('')
    const mirror = own.map((x) => (x === 0 ? 1 : 0)).join('')
    const label = `${A.name}: ${g.classes.filter((_, i) => own[i] === 0).join(', ')}`
    if (sols.list.some((s) => s.key === mirror)) return fb.say('Bu, önceki tasarımın oyuncuları yer değiştirmiş hâli. Gerçekten farklı bir tasarım bulabilir misin?')
    const fresh = sols.add(key, label)
    if (!fresh) return fb.say('Bu tasarımı zaten buldun. Başka bir adil kural var mı?')
    const n = sols.list.length + 1
    fb.say(n >= (g.need ?? 1) ? 'Harika! Aynı oyunu birçok farklı biçimde adil yapabiliriz. Önemli olan sonuç sayısı değil, kazanma olasılıklarının eşit olması.' : `Adil bir kural! ${A.name} ve ${C.name}’ın ${g.view === 'spinner' ? 'parça' : 'sonuç'} sayısı eşit. Başka bir adil kural bul (${n}/${g.need}).`, { tone: 'ok' })
    if (n >= (g.need ?? 1)) { track.item(misses.current === 0); setPhase('done') }
  }

  const countOpts = useMemo(() => shuffle([
    { t: '3 sonuç: iki yazı, iki tura, bir yazı bir tura', ok: false },
    { t: '4 sonuç: YY, YT, TY, TT', ok: true },
    { t: '2 sonuç: aynı ya da farklı', ok: false },
  ]), [])

  const modelVisible = phase === 'assign' || phase === 'verdict' || phase === 'redesign' || phase === 'done'
  const ra = weightOf(g, own, 0)

  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className={`mb-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2 text-center font-extrabold ${look.soft}`}>
            <Scale size={18} className={look.muted} /><span className={look.strong}><MathText text={g.rule} /></span>
          </div>
          {!modelVisible ? (
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_1fr]">
              <LastRound g={g} last={tr.last} flick={tr.flick} look={look} />
              <div className="space-y-2">
                <Race look={look} a={a} c={c} />
                <Pill look={look}>Oynanan tur: <b className="tabular-nums">{fmtN(tr.n)}</b></Pill>
              </div>
            </div>
          ) : (
            <>
              <Model g={g} own={own} look={look} onTap={tap} bad={bad} editable={editable} />
              {(phase === 'verdict' || ((phase === 'redesign' || phase === 'done') && g.redesign !== 'points')) && (
                <div className="mx-auto mt-3 max-w-md"><Race look={look} unit={g.view === 'spinner' ? 'parça' : 'sonuç'} a={ra} c={tw - ra} />{g.view !== 'spinner' && <p className={`text-center text-xs font-bold ${look.muted}`}>Sonuç sayıları ({fmtN(tw)} eş olasılıklı sonuç)</p>}</div>
              )}
              {g.redesign === 'points' && phase !== 'assign' && phase !== 'verdict' && (
                <div className="mx-auto mt-3 max-w-md">
                  <Race look={look} unit="puan" a={3 * pts[0]} c={6 * pts[1]} />
                  <p className={`text-center text-xs font-bold ${look.muted}`}>9 turda beklenen puan</p>
                </div>
              )}
            </>
          )}
        </Scene>
      }
      panel={
        <Panel look={look} title={{ predict: 'Önce tahmin et', play: 'Oyna ve gözle', count: 'Tüm sonuçları listele', assign: 'Sonuçları dağıt', verdict: 'Karar ver', redesign: g.redesign === 'points' ? 'Puanları değiştir' : 'Oyunu adil yap', done: 'Adil mi? Çözüldü!' }[phase]} icon={phase === 'redesign' ? '🛠️' : '⚖️'}>
          {phase === 'predict' && (
            <>
              <p className={`mb-2 text-[15px] font-semibold ${look.muted}`}>Kurala bak. Sence bu oyun adil mi?</p>
              <div className="grid gap-2">
                {VERDICTS.map((v) => <Choice key={v.id} look={look} text={v.t} onClick={() => { setPred(v.id); track.strategy(`Tahmin: ${v.t}`); setPhase('play'); fb.say('Şimdi oyunu çok kez oyna ve tahminini sına.') }} />)}
              </div>
            </>
          )}
          {phase === 'play' && (
            <>
              <Pill look={look} tone="info">Tahminin: {VERDICTS.find((v) => v.id === pred)?.t}</Pill>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {[1, 10, 100, 1000].map((k) => <button key={k} type="button" disabled={tr.running} onClick={() => tr.run(k)} className={`${look.h} rounded-2xl text-base font-black tabular-nums active:scale-95 disabled:opacity-40 ${look.key}`}>+{fmtN(k)}</button>)}
              </div>
              <p className={`mt-2 text-sm font-bold ${look.muted}`}>Birkaç tur tek tek, sonra yüzlerce tur oyna. Deney kesin kanıt mı?</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" disabled={tr.n < 100 || tr.running} onClick={() => { fb.clear(); setPhase(g.countQ ? 'count' : 'assign') }}><ListChecks size={20} />{tr.n < 100 ? `En az 100 tur oyna (${fmtN(tr.n)})` : 'Tüm sonuçları incele'}</button>
            </>
          )}
          {phase === 'count' && (
            <>
              <p className="mb-2 font-black">İki para atınca kaç farklı sonuç olabilir?</p>
              <div className="grid gap-2">
                {countOpts.map((o) => <Choice key={o.t} look={look} text={o.t} state={wrongV.includes(o.t) ? 'wrong' : 'idle'} disabled={wrongV.includes(o.t)} onClick={() => {
                  track.attempt(o.ok)
                  if (o.ok) { sfx.ok(); setWrongV([]); setPhase('assign'); fb.say('Evet! Paraları farklı renkte düşün: altın para Y, gümüş para T ile altın para T, gümüş para Y farklı sonuçlardır. Şimdi her sonucu kazanana ver.', { tone: 'ok' }) }
                  else { misses.current++; setWrongV((w) => [...w, o.t]); fb.say('Paralardan biri altın, biri gümüş olsun. “Altın yazı, gümüş tura” ile “altın tura, gümüş yazı” aynı sonuç mu?', { mis: 'İki parada YT ve TY sonuçlarını tek sonuç saydı', tool: g.tool }) }
                }} />)}
              </div>
            </>
          )}
          {phase === 'assign' && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>{g.view === 'dice' || g.view === 'rps' ? 'Alttaki etiketlere dokunarak her sonucu kurala göre Ayşe’ye ya da Can’a ver. Tablo boyanacak.' : 'Her sonuca dokunarak onu kurala göre Ayşe’ye ya da Can’a ver.'}</p>
              <div className="mt-2 flex gap-2"><Pill look={look}><span className="size-3 rounded-full" style={{ background: A.color }} />{A.name}</Pill><Pill look={look}><span className="size-3 rounded-full" style={{ background: C.color }} />{C.name}</Pill></div>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={checkAssign}><Check size={20} />Dağıtımı kontrol et</button>
            </>
          )}
          {phase === 'verdict' && (
            <div className="grid gap-2">
              {VERDICTS.map((v) => <Choice key={v.id} look={look} text={v.t} state={wrongV.includes(v.id) ? 'wrong' : 'idle'} disabled={wrongV.includes(v.id)} onClick={() => verdict(v.id)} />)}
            </div>
          )}
          {phase === 'redesign' && g.redesign === 'classes' && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>Sonuçlara dokunarak sahiplerini değiştir. İkisinin şansı eşit olunca kaydet. {g.need} farklı adil kural bul!</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={saveDesign}><Sparkles size={20} />Bu kural adil mi? Kaydet</button>
            </>
          )}
          {phase === 'redesign' && g.redesign === 'points' && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>Sonuçları değiştiremezsin ama puanları değiştirebilirsin! Oyunu adil yapan puanlamalar bul.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-4">
                <Stepper look={look} label="Berabere → Ayşe" value={pts[0]} min={1} max={6} onChange={(v) => setPts([v, pts[1]])} />
                <Stepper look={look} label="Kazanan → Can" value={pts[1]} min={1} max={6} onChange={(v) => setPts([pts[0], v])} />
              </div>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={saveDesign}><Sparkles size={20} />Bu puanlama adil mi?</button>
            </>
          )}
          {fb.node}
          {g.redesign && <SolutionList list={sols.list} goal={g.need} />}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Adil olup olmadığına en çok ne ile karar verdin?" options={['Deney sonuçlarıyla', 'Tüm sonuçları listeleyerek', 'Tabloyu sayarak', 'Sezgimle']} onPick={() => {}} />
              <NextButton onClick={() => onDone(misses.current === 0, sols.list.length)} />
            </>
          )}
        </Panel>
      }
    />
  )
}

// ───────────────────────── Hangisi adil? (5) ─────────────────────────

const R = '#ef4444', B = '#3b82f6', Gr = '#22c55e', Y = '#eab308'
const SPINNERS: { sec: Out[]; rule: string; fair: boolean; why: string; mis?: string }[] = [
  { sec: [{ label: 'K', color: R, w: 1 }, { label: 'M', color: B, w: 1 }], rule: 'Kırmızı → Ayşe · Mavi → Can', fair: true, why: 'Çarkın yarısı kırmızı, yarısı mavi.' },
  { sec: [{ label: 'K', color: R, w: 1 }, { label: 'M', color: B, w: 1 }, { label: 'Y', color: Gr, w: 1 }], rule: 'Kırmızı → Ayşe · Mavi ya da yeşil → Can', fair: false, why: 'Kırmızı çarkın üçte biri; Can’ın payı iki kat büyük.' },
  { sec: [{ label: 'K', color: R, w: 1 }, { label: 'M', color: B, w: 1 }, { label: 'K', color: R, w: 1 }, { label: 'M', color: B, w: 1 }], rule: 'Kırmızı → Ayşe · Mavi → Can', fair: true, why: 'Dilimler dağınık ama kırmızının toplamı da mavinin toplamı da çarkın yarısı.' },
  { sec: [{ label: 'K', color: R, w: 1 }, { label: 'S', color: Y, w: 1 }, { label: 'Y', color: Gr, w: 2 }], rule: 'Kırmızı ya da sarı → Ayşe · Yeşil → Can', fair: true, why: 'Ayşe’nin iki küçük dilimi, Can’ın büyük diliminin tam yarısı kadar: ikisi de çarkın yarısı!', mis: 'Çarkta dilim sayısını dilim büyüklüğüyle karıştırdı' },
]

function CompareTask({ grade, look, onDone }: { grade: Grade; look: Look; onDone: (first: boolean, designs: number) => void }) {
  const track = useTracker()
  const fb = useSay()
  const order = useMemo(() => shuffle(SPINNERS.map((_, i) => i)), [])
  const [ans, setAns] = useState<Record<number, boolean>>({})
  const [wrong, setWrong] = useState<string[]>([])
  const misses = useRef(0)
  const pick = (i: number, fair: boolean) => {
    const s = SPINNERS[i]
    const ok = s.fair === fair
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      const na = { ...ans, [i]: fair }
      setAns(na)
      fb.say(`${fair ? 'Adil' : 'Adil değil'}: ${s.why}`, { tone: 'ok' })
      if (Object.keys(na).length === SPINNERS.length) track.item(misses.current === 0)
    } else {
      misses.current++
      setWrong((w) => [...w, `${i}${fair}`])
      fb.say(fair ? 'Ayşe’nin renkleri çarkın ne kadarını kaplıyor? Can’ınkiler? Yarım çark ile karşılaştır.' : 'Dilimleri saymak yerine büyüklüklerine bak. Ayşe’nin renklerini birleştirsen çarkın yarısı eder mi?', { mis: s.mis, tool: 'rastgeledeney' })
    }
  }
  const done = Object.keys(ans).length === SPINNERS.length
  return (
    <Work
      scene={
        <Scene grade={grade}>
          <div className="grid gap-3 sm:grid-cols-2">
            {order.map((i) => {
              const s = SPINNERS[i]
              const a = ans[i]
              return (
                <div key={i} className={`rounded-2xl p-3 ${look.soft}`}>
                  <Spinner sectors={s.sec} last={null} flick={0} size={150} />
                  <p className={`mt-1 text-center text-sm font-extrabold ${look.strong}`}>{s.rule}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[true, false].map((f) => (
                      <Choice key={String(f)} look={look} className="!text-center" text={f ? 'Adil' : 'Adil değil'} state={a === f ? 'right' : wrong.includes(`${i}${f}`) ? 'wrong' : a !== undefined ? 'dim' : 'idle'} disabled={a !== undefined || wrong.includes(`${i}${f}`)} onClick={() => pick(i, f)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Scene>
      }
      panel={
        <Panel look={look} title="Hangi çarklar adil?" icon="🎡">
          <p className={`text-[15px] font-semibold ${look.muted}`}>Her çark için karar ver. İpucu: dilimleri saymak mı, alanlarına bakmak mı?</p>
          {fb.node}
          {done && <NextButton onClick={() => onDone(misses.current === 0, 0)} />}
        </Panel>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function AdilMi({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const firsts = useRef(0)
  const designs = useRef(0)
  const t = tasks[i]
  const done = (first: boolean, d: number) => {
    if (first) firsts.current++
    designs.current += d
    if (i + 1 < tasks.length) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    onFinish({
      summary: `${tasks.length} oyunu inceledin${designs.current ? `, ${designs.current} farklı adil kural tasarladın` : ''}.`,
      insight:
        grade <= 6
          ? 'Bir oyun, oyuncuların kazanma olasılıkları eşitse adildir. Deney ipucu verir; kesin karar için tüm eş olasılıklı sonuçları listeleyip sayarız.'
          : 'Adillik için eş olasılıklı sonuçları (ör. 36 zar çifti) sayarız; toplamlar ya da renkler eş olasılıklı olmayabilir. Haksız bir oyunu sonuçları yeniden dağıtarak ya da puanları dengeleyerek adil yapabiliriz.',
      stars: starsBy(firsts.current, tasks.length),
    })
  }
  const title = t.kind === 'compare' ? 'Bu çarklarla oynanan oyunlardan hangileri adil?' : t.g.title
  return (
    <LastTask.Provider value={i === tasks.length - 1}>
      <TopBar look={look} step={i} total={tasks.length} title={title} emoji={t.kind === 'compare' ? '🎡' : '⚖️'} />
      {t.kind === 'compare' ? <CompareTask key={i} grade={grade} look={look} onDone={done} /> : <GameTask key={`${i}-${t.g.id}`} g={t.g} grade={grade} look={look} onDone={done} />}
    </LastTask.Provider>
  )
}

